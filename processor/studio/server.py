"""Dedicated long-video worker. Run one process; media never crosses Vercel."""
import asyncio
import ipaddress
import json
import math
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

ROOT = Path(os.environ.get('MEDIA_ROOT', '/tmp/format-blink-studio'))
ROOT.mkdir(parents=True, exist_ok=True)
MAX_BYTES = int(os.environ.get('MAX_UPLOAD_GB', '8')) * 1024**3
MAX_SECONDS = int(os.environ.get('MAX_VIDEO_HOURS', '3')) * 3600
TTL = int(os.environ.get('MEDIA_TTL_HOURS', '6')) * 3600
ORIGINS = [x.strip() for x in os.environ.get(
    'ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,https://formatblink.vercel.app,https://formatblink.com,https://www.formatblink.com'
).split(',') if x.strip()]
LOCAL_MODE = os.environ.get('FORMAT_BLINK_LOCAL', '0') == '1'
POOL = ThreadPoolExecutor(max_workers=1)
JOBS = {}
BUSY = set()

def run(args, timeout=14400):
    p = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    if p.returncode:
        raise ValueError('Media engine failed: ' + p.stderr[-500:])
    return p.stdout

def job_path(job_id):
    if not re.fullmatch(r'[a-f0-9]{32}', job_id):
        raise HTTPException(400, 'Invalid job ID.')
    path = ROOT / job_id
    if not path.is_dir():
        raise HTTPException(404, 'Video expired. Please add it again.')
    return path

def metadata(job_id):
    path = job_path(job_id)
    try:
        return json.loads((path / 'meta.json').read_text())
    except FileNotFoundError:
        raise HTTPException(409, 'Video is not ready.')

def public_url(url):
    p = urlparse(url)
    if p.scheme != 'https' or not p.hostname or p.username or p.password or p.port not in (None, 443):
        raise ValueError('Use a public HTTPS video URL.')
    addresses = socket.getaddrinfo(p.hostname, 443)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError('Private network URLs are not allowed.')
    return p

def youtube_id(url):
    p = urlparse(url)
    return p.hostname in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be')

def download(url, path):
    public_url(url)
    if youtube_id(url):
        # Public, single video only; no cookies, playlists or authentication bypass.
        run([sys.executable, '-m', 'yt_dlp', '--no-playlist', '--max-filesize', str(MAX_BYTES),
             '--match-filter', f'!is_live & duration <= {MAX_SECONDS}', '-f', 'bv*[height<=1080]+ba/b[height<=1080]',
             '--merge-output-format', 'mp4', '--remux-video', 'mp4', '-o', str(path), url], timeout=3600)
    else:
        with httpx.Client(timeout=60, follow_redirects=False, trust_env=False) as client:
            for _ in range(6):
                public_url(url)
                with client.stream('GET', url) as response:
                    if response.is_redirect:
                        url = str(response.url.join(response.headers['location']))
                        continue
                    response.raise_for_status()
                    total = 0
                    with path.open('wb') as out:
                        for chunk in response.iter_bytes(1024 * 1024):
                            total += len(chunk)
                            if total > MAX_BYTES:
                                raise ValueError('Video exceeds the configured upload limit.')
                            out.write(chunk)
                    return
            raise ValueError('Too many URL redirects.')

def probe(path):
    info = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)], 60))
    video = next((s for s in info['streams'] if s['codec_type'] == 'video'), None)
    duration = float(info['format'].get('duration', 0))
    if not video or not 0 < duration <= MAX_SECONDS:
        raise ValueError(f'Add a video with a duration up to {MAX_SECONDS // 3600} hours.')
    if path.stat().st_size > MAX_BYTES:
        raise ValueError('Video exceeds the configured upload limit.')
    return {'duration': duration, 'width': video['width'], 'height': video['height'],
            'mp4Container': 'mp4' in info['format'].get('format_name', '').split(','),
            'hasAudio': any(s['codec_type'] == 'audio' for s in info['streams']),
            'browserCompatible': video.get('codec_name') == 'h264' and video.get('pix_fmt') == 'yuv420p' and all(s.get('codec_name') == 'aac' for s in info['streams'] if s['codec_type'] == 'audio')}

def prepare(job_id, url=None):
    root = job_path(job_id)
    source = root / 'source.mp4'
    if url:
        download(url, source)
    info = probe(source)
    # Normalize remote media to a seekable browser-compatible source once.
    normalized = root / 'preview.mp4'
    codecs = ['-c', 'copy'] if info['browserCompatible'] else ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac']
    if info['browserCompatible'] and info['mp4Container']:
        source.replace(normalized)
    else:
        run(['ffmpeg', '-nostdin', '-y', '-i', str(source), '-map', '0:v:0', '-map', '0:a:0?', *codecs, '-movflags', '+faststart', str(normalized)])
    (root / 'meta.json').write_text(json.dumps(info))
    source.unlink(missing_ok=True)
    return {'jobId': job_id, 'sourceUrl': f'/api/source/{job_id}', **info}

def transcribe(job_id, profile='fast'):
    root = job_path(job_id)
    meta = metadata(job_id)
    if not meta['hasAudio']:
        raise ValueError('This video has no audio. Use manual time ranges to create clips.')
    cached = root / f'transcript-{profile}.json'
    if cached.exists():
        transcript = json.loads(cached.read_text(encoding='utf-8'))
        (root/'transcript.json').write_text(json.dumps(transcript), encoding='utf-8')
        return {'jobId': job_id, 'transcript': transcript, 'sourceUrl': f'/api/source/{job_id}', **meta}
    progress_file = root / 'progress.json'
    progress_file.write_text(json.dumps({'stage':'Extracting audio', 'progress':2}))
    audio = root / 'audio.wav'
    try:
        run(['ffmpeg', '-nostdin', '-y', '-i', str(root / 'preview.mp4'), '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', str(audio)], timeout=300)
        script = Path(__file__).with_name('transcribe.py')
        if not script.exists(): script = Path(__file__).parents[1] / 'python/transcribe.py'
        # Short videos cannot silently spend four hours loading/transcribing.
        timeout = max(300, min(7200, int(meta['duration'] * 4 + 180)))
        try:
            transcript = json.loads(run([sys.executable, str(script), str(audio), str(progress_file), profile], timeout=timeout))
        except subprocess.TimeoutExpired as error:
            raise ValueError('Transcription timed out. Check the first-run model download/internet connection or use Fast mode. Manual clip selection is still available.') from error
        cached.write_text(json.dumps(transcript), encoding='utf-8')
        (root / 'transcript.json').write_text(json.dumps(transcript))
        return {'jobId': job_id, 'transcript': transcript, 'sourceUrl': f'/api/source/{job_id}', **meta}
    finally:
        audio.unlink(missing_ok=True)

def ranges(body, duration):
    items = body.get('ranges') or [{'start': body.get('start'), 'end': body.get('end')}]
    if not isinstance(items, list) or not 1 <= len(items) <= 500:
        raise ValueError('Select between 1 and 500 video sections.')
    result = []
    for item in items:
        a, b = float(item['start']), float(item['end'])
        if not math.isfinite(a) or not math.isfinite(b) or not 0 <= a < b <= duration + .05:
            raise ValueError('Clip times must lie within the source video.')
        result.append({'start': a, 'end': min(b, duration)})
    return result

def color(value):
    if not re.fullmatch(r'#[0-9a-fA-F]{6}', str(value)):
        raise ValueError('Invalid color.')
    return value[1:]

def ass_time(s):
    cs = round(s * 100)
    return f'{cs//360000}:{cs//6000%60:02}:{cs//100%60:02}.{cs%100:02}'

def subtitles(root, sections, style, width, height, output):
    transcript = json.loads((root / 'transcript.json').read_text())
    rgb = color(style.get('textColor', '#ffffff'))
    primary = '&H00' + rgb[4:6] + rgb[2:4] + rgb[:2]
    bg = color(style.get('backgroundColor', '#000000'))
    back = '&H70' + bg[4:6] + bg[2:4] + bg[:2]
    size = max(20, min(96, int(style.get('fontSize', 52))))
    pos = {'top': 8, 'center': 5, 'bottom': 2}.get(style.get('position'), 2)
    border = 3 if style.get('background', True) else 1
    text = f'''[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,DejaVu Sans,{size},{primary},{primary},&H00000000,{back},-1,0,0,0,100,100,0,0,{border},2,0,{pos},40,40,60,1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
'''
    offset = 0
    for section in sections:
        a, b = section['start'], section['end']
        for seg in transcript['segments']:
            words = seg.get('words') or []
            chunks = [words[i:i+6] for i in range(0, len(words), 6)] if words else [[{'start': seg['start'], 'end': seg['end'], 'word': seg['text']}]]
            for chunk in chunks:
                selected = [w for w in chunk if w['end'] > a and w['start'] < b]
                if not selected: continue
                start, end = max(a, selected[0]['start']), min(b, selected[-1]['end'])
                clean = ' '.join(w['word'] for w in selected).replace('\\', '').replace('{', '').replace('}', '').replace('\n', ' ')
                text += f'Dialogue: 0,{ass_time(offset+start-a)},{ass_time(offset+end-a)},Default,,0,0,0,,{clean}\n'
        offset += b-a
    output.write_text(text, encoding='utf-8')

def filter_path(path):
    return str(path.resolve()).replace('\\', '/').replace(':', r'\:').replace("'", r"'\\''")

def render(job_id, body):
    root = job_path(job_id)
    meta = metadata(job_id)
    sections = ranges(body, meta['duration'])
    render_id = uuid4().hex
    work = root / render_id
    work.mkdir()
    formats = {'9:16': (1080, 1920), '16:9': (1920, 1080), '1:1': (1080, 1080), '4:5': (1080, 1350)}
    width, height = formats.get(body.get('aspect'), (meta['width']//2*2, meta['height']//2*2))
    x, y = max(0, min(1, float(body.get('cropX', .5)))), max(0, min(1, float(body.get('cropY', .5))))
    filters = [f"crop='min(iw,ih*{width}/{height})':'min(ih,iw*{height}/{width})':(iw-ow)*{x}:(ih-oh)*{y}", f'scale={width}:{height}', 'setsar=1']
    out = root / f'{render_id}.mp4'
    try:
        for i, section in enumerate(sections):
            part_filters = list(filters)
            if body.get('captions', True) and (root/'transcript.json').exists():
                ass = work / f'captions{i}.ass'
                subtitles(root, [section], body.get('captionStyle', {}), width, height, ass)
                part_filters.append(f"subtitles='{filter_path(ass)}'")
            shape = body.get('shape', 'none')
            if shape in ('box', 'bar', 'outline'):
                fill = 'fill' if shape != 'outline' else '8'
                part_filters.append(f"drawbox=x=iw*0.1:y=ih*0.08:w=iw*0.8:h=ih*{.12 if shape=='bar' else .25}:color=0x{color(body.get('shapeColor','#000000'))}@0.6:t={fill}")
            overlay = str(body.get('overlayText', ''))[:1000]
            if overlay:
                textfile = work/'overlay.txt'
                textfile.write_text(overlay, encoding='utf-8')
                size = max(20, min(100, int(body.get('overlaySize', 46))))
                part_filters.append(f"drawtext=textfile='{filter_path(textfile)}':expansion=none:fontcolor=0x{color(body.get('overlayColor','#ffffff'))}:fontsize={size}:x=(w-text_w)/2:y=h*0.1")
            args = ['ffmpeg', '-nostdin', '-y', '-ss', str(section['start']), '-i', str(root/'preview.mp4'), '-t', str(section['end']-section['start']), '-map', '0:v:0', '-map', '0:a:0?', '-vf', ','.join(part_filters), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p']
            args += ['-an'] if body.get('mute') else ['-c:a', 'aac', '-ar', '48000']
            args += [str(work/f'part{i}.mp4')]
            run(args, timeout=max(180, min(7200, int((section['end']-section['start'])*10))))
        listing = work / 'parts.txt'
        listing.write_text(''.join(f"file 'part{i}.mp4'\n" for i in range(len(sections))))
        # Crop, captions, shapes and text are rendered together, once per section.
        run(['ffmpeg', '-nostdin', '-y', '-f', 'concat', '-safe', '0', '-i', str(listing), '-c', 'copy', '-movflags', '+faststart', str(out)], timeout=300)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return {'url': f'/api/download/{job_id}/{render_id}.mp4', 'duration': sum(s['end']-s['start'] for s in sections)}

def enqueue(job_id, operation, *args):
    if len(BUSY) >= 3:
        raise HTTPException(429, 'Processor busy. Retry after the current jobs finish.')
    task_id = uuid4().hex
    BUSY.add(job_id)
    JOBS[task_id] = {'status': 'queued', 'jobId': job_id, 'created': time.time(), 'operation': operation.__name__}
    def work():
        JOBS[task_id]['status'] = 'processing'
        try:
            (ROOT/job_id/'progress.json').unlink(missing_ok=True)
            result = operation(job_id, *args)
            JOBS[task_id].update(status='ready', **result)
        except Exception as error:
            JOBS[task_id].update(status='failed', error=str(error)[:600])
        finally:
            BUSY.discard(job_id)
            path = ROOT/job_id
            if path.exists(): os.utime(path, None)
    POOL.submit(work)
    return {'taskId': task_id, 'jobId': job_id, 'status': 'queued'}

async def cleanup():
    while True:
        for path in ROOT.iterdir():
            if path.is_dir() and path.name not in BUSY and time.time()-path.stat().st_mtime > TTL:
                shutil.rmtree(path, ignore_errors=True)
        for key in list(JOBS):
            if time.time()-JOBS[key]['created'] > TTL and JOBS[key]['status'] in ('ready','failed'): JOBS.pop(key, None)
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app):
    cleaner = asyncio.create_task(cleanup())
    yield
    cleaner.cancel()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=['GET','POST','DELETE'], allow_headers=['Content-Type','Range'], expose_headers=['Content-Range','Accept-Ranges','Content-Length'])

def origin_allowed(origin):
    if not origin:
        return False
    if origin in ORIGINS:
        return True
    if LOCAL_MODE:
        try:
            p = urlparse(origin)
            host = (p.hostname or '').lower()
            return p.scheme == 'https' and (
                host in ('formatblink.com', 'www.formatblink.com', 'formatblink.vercel.app')
                or (host.endswith('.vercel.app') and 'formatblink' in host)
            )
        except Exception:
            return False
    return False

@app.middleware('http')
async def origin_guard(request, call_next):
    if request.method in ('POST','DELETE') and not origin_allowed(request.headers.get('origin')):
        return JSONResponse({'detail': 'Origin is not allowed.'}, status_code=403)
    response = await call_next(request)
    if request.method == 'OPTIONS' and origin_allowed(request.headers.get('origin')) and request.headers.get('access-control-request-private-network') == 'true':
        response.headers['Access-Control-Allow-Private-Network'] = 'true'
    return response

@app.get('/health')
def health(): return {'ok': bool(shutil.which('ffmpeg') and shutil.which('ffprobe')), 'version': '2026-10-06', 'dependencies': {'ffmpeg':bool(shutil.which('ffmpeg')),'ffprobe':bool(shutil.which('ffprobe'))}, 'mode': 'local' if LOCAL_MODE else 'server', 'maxUploadBytes': MAX_BYTES, 'maxDuration': MAX_SECONDS}

@app.post('/api/import')
async def import_video(request: Request):
    if len(BUSY) >= 3: raise HTTPException(429, 'Processor busy. Retry shortly.')
    job_id = uuid4().hex
    path = ROOT/job_id
    path.mkdir()
    BUSY.add(job_id)
    try:
        url = None
        if 'application/json' in request.headers.get('content-type',''):
            data = await request.body()
            if len(data)>8192: raise HTTPException(413,'Link request too large.')
            url = json.loads(data).get('sourceUrl','')
            if not url: raise HTTPException(400, 'Video URL required.')
            public_url(url)
        else:
            size = 0
            with (path/'source.mp4').open('wb') as out:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size>MAX_BYTES: raise HTTPException(413, 'Video exceeds upload limit.')
                    out.write(chunk)
            if not size: raise HTTPException(400, 'Empty video.')
        BUSY.discard(job_id)
        return enqueue(job_id, prepare, url)
    except Exception:
        BUSY.discard(job_id)
        shutil.rmtree(path, ignore_errors=True)
        raise

@app.post('/api/process')
async def process(request: Request):
    body = await request.json()
    job_id = body.get('jobId','')
    metadata(job_id)
    if job_id in BUSY: raise HTTPException(409,'This video is already processing.')
    profile = body.get('profile', 'fast')
    if profile not in ('fast', 'accurate'): raise HTTPException(400, 'Invalid transcript mode.')
    return enqueue(job_id, transcribe, profile)

@app.post('/api/render')
async def render_video(request: Request):
    body = await request.json()
    job_id = body.get('jobId','')
    meta = metadata(job_id)
    if job_id in BUSY: raise HTTPException(409,'This video is already processing.')
    try: ranges(body, meta['duration'])
    except (ValueError,TypeError,KeyError): raise HTTPException(400,'Invalid clip times.')
    return enqueue(job_id, render, body)

@app.get('/api/jobs/{task_id}')
def job(task_id: str):
    if task_id not in JOBS: raise HTTPException(404,'Task expired or processor restarted. Add the video again.')
    result = dict(JOBS[task_id])
    result['elapsed'] = round(time.time() - result['created'])
    if result['status'] == 'processing' and result.get('operation') == 'transcribe':
        try:
            result.update(json.loads((ROOT/result['jobId']/'progress.json').read_text()))
        except (OSError, ValueError): pass
    return result

@app.get('/api/source/{job_id}')
def source(job_id: str):
    root = job_path(job_id)
    return FileResponse(root/'preview.mp4', media_type='video/mp4')

@app.get('/api/download/{job_id}/{filename}')
def output(job_id: str, filename: str):
    root = job_path(job_id)
    if not re.fullmatch(r'[a-f0-9]{32}\.mp4', filename) or not (root/filename).is_file():
        raise HTTPException(404,'Clip not found.')
    return FileResponse(root/filename, media_type='video/mp4', filename='format-blink-clip.mp4')

@app.delete('/api/source/{job_id}')
def delete(job_id: str):
    root = job_path(job_id)
    if job_id in BUSY: raise HTTPException(409,'Wait for processing to finish before deleting.')
    shutil.rmtree(root)
    return {'ok': True}
