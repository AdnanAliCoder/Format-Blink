"""Validate actual downloaded files after browser-tools.cjs."""
import json, os, subprocess
from pathlib import Path
from pypdf import PdfReader
from PIL import Image, ImageChops
root=Path(os.environ.get('RESULT_DIR','/tmp/formatblink-results'))
def pdf(slug):return PdfReader(root/(slug+'.pdf'))
assert len(pdf('compress-pdf').pages)==2
assert 'SECRET 123' in (pdf('compress-pdf').pages[0].extract_text() or '')
assert 'Added text' in pdf('pdf-editor').pages[0].extract_text()
assert 'Adnan Ali' in pdf('sign-pdf').pages[0].extract_text()
assert float(pdf('crop-pdf').pages[0].cropbox.width)==300
assert pdf('fill-pdf-form').get_fields()['Full Name']['/V']=='Adnan Ali'
assert len(pdf('heic-to-pdf').pages)==1
redacted=pdf('redact-pdf');assert len(redacted.pages)==2
assert all(not page.extract_text().strip() for page in redacted.pages)
assert '/EmbeddedFiles' not in str(redacted.trailer['/Root'])
assert Image.open(root/'image-upscaler.png').size==(2000,600)
assert Image.open(root/'svg-to-jpg.jpg').size==(100,80)
assert Image.open(root/'gif-compressor.gif').n_frames>1
src=Image.open('/tmp/formatblink-fixtures/text.png').convert('RGB')
for slug in ['watermark-image','add-text-to-image','blur-image']:
 assert ImageChops.difference(src,Image.open(root/(slug+'.png')).convert('RGB')).getbbox()
for f in root.iterdir():
 if f.suffix not in {'.mp4','.mov','.mkv','.avi'}:continue
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(f)]))
 video=next(s for s in info['streams'] if s['codec_type']=='video');duration=float(info['format']['duration'])
 if f.stem=='crop-video':assert (video['width'],video['height'])==(300,150)
 if f.stem=='rotate-video':assert (video['width'],video['height'])==(240,320)
 if f.stem=='video-to-9-16':assert abs(video['width']/video['height']-9/16)<.004
 if f.stem=='change-video-aspect-ratio':assert abs(video['width']/video['height']-16/9)<.004
 if f.stem in {'merge-video','loop-video'}:assert 3.8<duration<4.5
 if f.stem=='video-speed-changer':assert 1.1<duration<1.7
 if f.stem=='add-subtitles-to-video':assert any(s['codec_type']=='subtitle' for s in info['streams'])
 assert any(s['codec_type']=='audio' for s in info['streams']),f.name
 subprocess.run(['ffmpeg','-v','error','-i',str(f),'-f','null','-'],check=True,capture_output=True)
print('PASS: PDF content/forms/page counts, flattened redaction, image dimensions/changes, animation, video geometry/duration/audio/subtitles and full media decoding')
