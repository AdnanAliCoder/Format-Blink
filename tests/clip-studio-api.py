"""Real FFmpeg integration: upload → ranged preview → noncontiguous export → delete."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
from fastapi.testclient import TestClient

with tempfile.TemporaryDirectory() as tmp:
    os.environ['MEDIA_ROOT'] = tmp + '/jobs'
    spec = importlib.util.spec_from_file_location('studio', Path(__file__).parents[1]/'processor/studio/server.py')
    studio = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(studio)
    sample = Path(tmp)/'sample.mp4'
    subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=320x180:rate=15:duration=6','-f','lavfi','-i','sine=frequency=440:duration=6','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',str(sample)],check=True)
    headers={'origin':'http://localhost:3000'}
    with TestClient(studio.app) as client:
        def finish(task):
            for _ in range(200):
                result=client.get('/api/jobs/'+task['taskId']).json()
                if result['status']=='failed': raise AssertionError(result)
                if result['status']=='ready': return result
                time.sleep(.1)
            raise AssertionError('Job timed out')
        assert client.post('/api/import',content=b'video').status_code==403
        res=client.post('/api/import',content=sample.read_bytes(),headers={**headers,'content-type':'video/mp4'})
        assert res.status_code==200,res.text
        imported=finish(res.json());job=imported['jobId']
        partial=client.get(imported['sourceUrl'],headers={'range':'bytes=0-99'})
        assert partial.status_code==206 and len(partial.content)==100
        root=Path(tmp)/'jobs'/job
        assert (root/'preview.mp4').read_bytes() == sample.read_bytes(), 'Compatible MP4 should not be rewritten'
        assert client.post('/api/process',json={'jobId':job,'profile':'invalid'},headers=headers).status_code==400
        cached={'profile':'fast','language':'en','segments':[{'id':1,'start':0,'end':1,'text':'Cached transcript'}]}
        (root/'transcript-fast.json').write_text(json.dumps(cached))
        transcript=finish(client.post('/api/process',json={'jobId':job,'profile':'fast'},headers=headers).json())
        assert transcript['transcript']==cached
        assert not (root/'audio.wav').exists(), 'Cached transcript must skip extraction and inference'

        (root/'transcript.json').write_text(json.dumps({'segments':[{'id':1,'start':0,'end':1,'text':'first selected'},{'id':2,'start':1,'end':4,'text':'EXCLUDED MIDDLE'},{'id':3,'start':4,'end':6,'text':'last selected'}]}))
        body={'jobId':job,'ranges':[{'start':0,'end':1},{'start':4,'end':6}],'aspect':'1:1','cropX':0,'cropY':1,'captions':True,'overlayText':"100%: user's title",'shape':'outline','shapeColor':'#00ff00','mute':True}
        result=finish(client.post('/api/render',json=body,headers=headers).json())
        download=client.get(result['url']);assert download.status_code==200
        output=Path(tmp)/'result.mp4';output.write_bytes(download.content)
        info=studio.probe(output)
        assert abs(info['duration']-3)<.2,info
        assert info['width']==info['height']==1080 and not info['hasAudio'],info
        ass=Path(tmp)/'test.ass'
        studio.subtitles(root,body['ranges'],{},1080,1080,ass)
        assert 'EXCLUDED' not in ass.read_text()
        assert '0:00:01.00,0:00:03.00' in ass.read_text()
        assert client.post('/api/render',json={**body,'ranges':[{'start':-1,'end':3}]},headers=headers).status_code==400
        try: studio.public_url('https://127.0.0.1/video.mp4');raise AssertionError('private URL accepted')
        except ValueError: pass
        assert client.delete('/api/source/'+job,headers=headers).status_code==200
        assert client.get(imported['sourceUrl']).status_code==404
        assert studio.youtube_id('https://youtu.be/abc') and not studio.youtube_id('https://youtube.com.evil.example/abc')
        print('PASS: streamed import, asynchronous jobs, range seeking, gap removal, captions retimed, square crop, escaped text, shapes, mute, download, validation, deletion')
