"""Run from repository root after processor-smoke.py. Requires FFmpeg and pillow-heif."""
from pathlib import Path
import subprocess
from PIL import Image
import pillow_heif
root=Path('/tmp/formatblink-fixtures');root.mkdir(exist_ok=True)
def ff(*args):subprocess.run(['ffmpeg','-hide_banner','-loglevel','error',*args,'-y'],check=True)
ff('-f','lavfi','-i','testsrc2=size=320x240:rate=10','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',str(root/'sample.mp4'))
ff('-i',str(root/'sample.mp4'),'-an',str(root/'silent.mp4'))
ff('-i',str(root/'sample.mp4'),'-vn',str(root/'audio.mp3'))
ff('-i',str(root/'sample.mp4'),'-vf','scale=120:-1',str(root/'sample.gif'))
(root/'sample.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect width="100" height="80" fill="red"/></svg>')
(root/'captions.srt').write_text('1\n00:00:00,000 --> 00:00:01,500\nFormatBlink caption\n')
pillow_heif.register_heif_opener();Image.open(root/'text.png').save(root/'sample.heic')
subprocess.run(['node','--input-type=module','-e',"import {PDFDocument} from 'pdf-lib';import fs from 'fs';const doc=await PDFDocument.create();doc.addPage([400,500]);doc.getForm().createTextField('Full Name').addToPage(doc.getPage(0),{x:50,y:400,width:200,height:30});fs.writeFileSync('/tmp/formatblink-fixtures/form.pdf',await doc.save());"],check=True)
print('Media fixtures ready. For speech.mp4, use a short spoken-video fixture.')
