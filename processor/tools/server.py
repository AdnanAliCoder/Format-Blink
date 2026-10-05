"""Run separately from Vercel: uvicorn server:app --host 0.0.0.0 --port 8080."""
import asyncio
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from convert import EXTENSIONS

class TemporaryFileResponse(FileResponse):
    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            shutil.rmtree(Path(self.path).parent, ignore_errors=True)

app = FastAPI()
ORIGINS = [s.strip() for s in os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,https://formatblink.vercel.app,https://formatblink.com,https://www.formatblink.com').split(',') if s.strip()]
LOCAL_MODE = os.environ.get('FORMAT_BLINK_LOCAL', '0') == '1'
MAX_BYTES = 100 * 1024 * 1024
active_jobs = 0
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=['POST', 'GET'], allow_headers=['Content-Type'])

class UploadGuard:
    def __init__(self, app): self.app = app
    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] != 'POST':
            return await self.app(scope, receive, send)
        headers = dict(scope['headers'])
        origin = headers.get(b'origin', b'').decode()
        allowed = origin in ORIGINS
        if LOCAL_MODE and origin.startswith('https://') and ('formatblink' in origin.lower() or origin.endswith('.vercel.app')):
            allowed = True
        if not allowed:
            return await JSONResponse({'detail':'This origin is not allowed.'}, status_code=403)(scope, receive, send)
        count = 0
        async def limited_receive():
            nonlocal count
            message = await receive()
            count += len(message.get('body', b''))
            if count > MAX_BYTES + 1024 * 1024:
                raise HTTPException(413, 'Upload exceeds 100 MB.')
            return message
        await self.app(scope, limited_receive, send)
app.add_middleware(UploadGuard)

@app.get('/health')
def health(): return {'ok': True, 'version': '2026-10-05.4', 'capabilities': ['pdf-word-auto-ocr-v3','pdf-excel-auto-ocr-v2','pdf-powerpoint-editable-v2','html-layout-v1'], 'mode': 'local' if LOCAL_MODE else 'server', 'tools': sorted(EXTENSIONS)}

@app.post('/api/tools/{slug}')
async def process(slug: str, file: UploadFile = File(...), settings: str = Form('{}')):
    global active_jobs
    if slug not in EXTENSIONS:
        raise HTTPException(404, 'Unknown tool.')
    if active_jobs >= 2:
        raise HTTPException(429, 'Processor busy. Please retry shortly.')
    suffix = Path(file.filename or '').suffix.lower()
    if suffix not in EXTENSIONS[slug][0]:
        raise HTTPException(400, 'Unsupported file format.')
    if len(settings) > 4096:
        raise HTTPException(400, 'Settings are too large.')
    try:
        values = json.loads(settings)
        if not isinstance(values, dict): raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(400, 'Invalid settings.')
    active_jobs += 1
    directory = Path(tempfile.mkdtemp(prefix='format-blink-'))
    keep = False
    worker = None
    try:
        source = directory / ('input' + suffix)
        size = 0
        with source.open('wb') as handle:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_BYTES: raise HTTPException(413, 'Upload exceeds 100 MB.')
                handle.write(chunk)
        if not size: raise HTTPException(400, 'Empty files are not supported.')
        # One subprocess per job bounds runtime and releases native-engine memory afterwards.
        worker = await asyncio.create_subprocess_exec(sys.executable, str(Path(__file__).with_name('convert.py')), slug, str(source), stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, start_new_session=(os.name != 'nt'))
        try:
            stdout, stderr = await asyncio.wait_for(worker.communicate(json.dumps(values).encode()), timeout=600)
        except asyncio.TimeoutError:
            raise HTTPException(504, 'Processing exceeded 10 minutes. Try a smaller file.')
        if worker.returncode:
            # Engine errors may include filesystem details; use known validation errors only.
            message = stderr.decode(errors='replace').strip().splitlines()[-1:] or ['Processing failed.']
            detail = message[0] if not any(x in message[0] for x in ['/', '\\', 'Traceback']) else 'The file could not be processed. Check its format and settings.'
            raise HTTPException(422, detail[:300])
        ext = EXTENSIONS[slug][1]
        result = directory / ('result.' + ext)
        if not result.exists(): raise HTTPException(500, 'Processor did not produce a result.')
        mime = {'pdf':'application/pdf','docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','png':'image/png','txt':'text/plain'}[ext]
        keep = True
        return TemporaryFileResponse(result, media_type=mime, filename=f'{slug}.{ext}')
    finally:
        if worker:
            import signal
            try:
                if os.name == 'nt':
                    if worker.returncode is None: worker.kill()
                else: os.killpg(worker.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            await worker.wait()
        active_jobs -= 1
        await file.close()
        if not keep: shutil.rmtree(directory, ignore_errors=True)
