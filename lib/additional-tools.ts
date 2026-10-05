import type { Tool } from './catalog';
const img = '.jpg,.jpeg,.png,.webp,.avif,.bmp,.gif';
const vid = '.mp4,.webm,.mov,.mkv,.avi,.m4v';
function tool(category: Tool['category'], slug: string, name: string, accept: string, output: string, description: string, extra: Partial<Tool> = {}): Tool {
  return {category, slug, name, accept, output, description, icon: category === 'file' ? 'file' : category, group: category === 'file' ? 'PDF utilities' : category === 'image' ? 'Edit images' : 'Edit video', ...extra};
}
const remote = {processing: 'server' as const};
export const additionalTools: Tool[] = [
  tool('file','compress-pdf','Compress PDF','.pdf','pdf','Reduce scanned PDF size with adjustable image quality.',{note:'Creates image-only pages. Searchable text, links, forms and signatures are flattened. Already compact files may not shrink.'}),
  tool('file','pdf-editor','PDF Editor','.pdf','pdf','Add text, highlights and rectangles to selected PDF pages.',{note:'Adds annotations over the page; does not rewrite existing text. Use Redact PDF to remove sensitive content.'}),
  tool('file','pdf-to-word','PDF to Word','.pdf','docx','Convert PDF pages, images and tables into a Word document.',{...remote,note:'Choose editable layout or preserve appearance. Complex editable layouts can need adjustments; appearance mode keeps pages as images.'}),
  tool('file','word-to-pdf','Word to PDF','.doc,.docx,.odt','pdf','Render Word documents as PDF.',remote),
  tool('file','ocr-pdf','OCR PDF','.pdf','pdf','Recognize scanned text and create a searchable PDF.',remote),
  tool('file','pdf-to-excel','PDF to Excel','.pdf','xlsx','Extract detected PDF tables into Excel worksheets.',{...remote,note:'Works with text-based tables. Scans need OCR first; review extracted rows and columns.'}),
  tool('file','excel-to-pdf','Excel to PDF','.xls,.xlsx,.ods','pdf','Render spreadsheet print areas as PDF.',remote),
  tool('file','pdf-to-powerpoint','PDF to PowerPoint','.pdf','pptx','Create one slide per PDF page.',{...remote,note:'Pages become slide images, preserving appearance. Text within images is not editable.'}),
  tool('file','powerpoint-to-pdf','PowerPoint to PDF','.ppt,.pptx,.odp','pdf','Render presentation slides as PDF.',remote),
  tool('file','sign-pdf','Sign PDF / eSign PDF','.pdf','pdf','Place a typed signature on selected pages.',{note:'A visible typed signature, not a certificate-based digital signature. Existing digital signatures may become invalid.'}),
  tool('file','protect-pdf','Protect PDF','.pdf','pdf','Encrypt a PDF with an opening password.',remote),
  tool('file','unlock-pdf','Unlock PDF','.pdf','pdf','Remove PDF encryption using the correct password.',{...remote,note:'Requires the existing password. Only unlock documents you have permission to use.'}),
  tool('file','crop-pdf','Crop PDF','.pdf','pdf','Set a visible crop rectangle on selected pages.',{note:'Cropping hides content outside the rectangle; it does not erase it. Use Redact PDF for sensitive content.'}),
  tool('file','redact-pdf','Redact PDF','.pdf','pdf','Permanently remove a rectangular area from selected pages.',{note:'Creates flattened image-only pages after masking. Text, attachments, forms and metadata are not copied to the new document. Review every page before sharing.'}),
  tool('file','fill-pdf-form','Fill PDF Form','.pdf','pdf','Fill existing PDF text fields, checkboxes and choices.',{note:'Supports AcroForm fields, not XFA forms. Fields are filled by name; field discovery appears after upload.'}),
  tool('file','html-to-pdf','HTML to PDF','.html,.htm','pdf','Render an uploaded HTML document as PDF.',{...remote,note:'Self-contained HTML only. Scripts, external URLs and local file references are not loaded.'}),
  tool('file','heic-to-pdf','HEIC to PDF','.heic,.heif','pdf','Combine HEIC photos into a PDF on your device.',{multiple:true}),
  tool('image','background-remover','Background Remover',img,'png','Remove an image background and export transparent PNG.',remote),
  tool('image','image-upscaler','Image Upscaler / Enhance Image',img,'png','Enlarge images 2× or 4× with high-quality resampling.',{note:'Resampling enlarges pixels; it does not reconstruct missing detail or use a generative AI model.'}),
  tool('image','image-to-text','Image to Text / OCR',img,'txt','Recognize text in an image and download it.',remote),
  tool('image','watermark-image','Watermark Image',img,'png','Add a translucent text watermark to your image.'),
  tool('image','svg-to-jpg','SVG to JPG','.svg','jpg','Rasterize a self-contained SVG on a white background.',{group:'Convert images'}),
  tool('image','gif-compressor','GIF Compressor','.gif','gif','Reduce animated GIF dimensions, frame rate and palette.',{note:'Keeps animation; output may be larger for an already optimized GIF.'}),
  tool('image','add-text-to-image','Add Text to Image',img,'png','Place custom text and choose its size and colour.'),
  tool('image','blur-image','Blur Image',img,'png','Apply an adjustable blur to the full image.'),
  tool('video','merge-video','Merge Video',vid,'mp4','Join videos in order with a consistent frame size.',{multiple:true,note:'Clips are normalized to the selected size at 30 fps. Audio is preserved; silent clips receive a silent soundtrack.'}),
  tool('video','crop-video','Crop Video',vid,'mp4','Crop video using a position and dimensions.'),
  tool('video','video-speed-changer','Video Speed Changer',vid,'mp4','Speed up or slow down video and its audio.'),
  tool('video','rotate-video','Rotate Video',vid,'mp4','Rotate video 90, 180 or 270 degrees.'),
  tool('video','reverse-video','Reverse Video',vid,'mp4','Reverse video and audio playback.',{note:'Short clips only. Reversing buffers decoded frames in memory.'}),
  tool('video','add-subtitles-to-video','Add Subtitles to Video',vid,'mkv','Attach an SRT subtitle track to a video.',{note:'Exports MKV with a selectable subtitle track. Captions are not burned into the picture.'}),
  tool('video','video-to-text','Video to Text / Transcription',vid,'txt','Transcribe spoken audio into timestamped text.',remote),
  tool('video','add-audio-to-video','Add Audio to Video',vid,'mp4','Replace a video soundtrack with an uploaded audio file.',{note:'Short audio is padded with silence; long audio is trimmed to video length.'}),
  tool('video','loop-video','Loop Video',vid,'mp4','Repeat a video and its audio a chosen number of times.'),
  tool('video','change-video-aspect-ratio','Change Video Aspect Ratio',vid,'mp4','Fit video into a new frame with padding.'),
  tool('video','video-to-9-16','Video to 9:16',vid,'mp4','Fit landscape video into a vertical 9:16 frame.'),
  ...['mov','avi','mkv'].map(ext=>tool('video',`mp4-to-${ext}`,`MP4 to ${ext.toUpperCase()}`,'.mp4',ext,`Convert an MP4 into a ${ext.toUpperCase()} container.`,{group:'Convert video'})),
];
