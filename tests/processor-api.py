import sys,os,tempfile
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'processor/tools'))
from fastapi.testclient import TestClient
from server import app
from pypdf import PdfReader
import io
client=TestClient(app)
origin={'origin':'http://localhost:3000'}
assert len(client.get('/health').json()['tools'])==13
with open('/tmp/formatblink-fixtures/sample.pdf','rb') as f:
 r=client.post('/api/tools/pdf-to-word',headers=origin,files={'file':('sample.pdf',f,'application/pdf')})
 assert r.status_code==200,(r.status_code,r.text)
 assert r.headers['content-type'].startswith('application/vnd.openxmlformats')
assert not list(Path('/tmp').glob('format-blink-*')),'Temporary files leaked'
for endpoint,file,settings,status in [('unknown','sample.pdf','{}',404),('pdf-to-word','sample.png','{}',400),('protect-pdf','sample.pdf','[]',400),('unlock-pdf','locked.pdf','{"password":"wrong"}',422)]:
 with open('/tmp/formatblink-fixtures/'+('sample.pdf' if file=='sample.png' else file),'rb') as f:
  r=client.post('/api/tools/'+endpoint,headers=origin,files={'file':(file,f)},data={'settings':settings});assert r.status_code==status,(endpoint,r.status_code,r.text)
r=client.post('/api/tools/pdf-to-word',headers={'origin':'https://not-allowed.example'},files={'file':('sample.pdf',b'fake')});assert r.status_code==403
print('API PASS: real upload/download, MIME, cleanup, wrong password, settings validation, format validation, unknown tool, origin restriction')
