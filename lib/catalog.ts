import {additionalTools} from './additional-tools';
import {SITE} from './site';
export type Category='file'|'image'|'video';
export type Tool={slug:string;name:string;description:string;category:Category;icon:string;accept:string;output:string;group:string;multiple?:boolean;popular?:boolean;note?:string;processing?:'server'};
const t=(category:Category,slug:string,name:string,description:string,icon:string,accept:string,output:string,group:string,extra:Partial<Tool>={}):Tool=>({category,slug,name,description,icon,accept,output,group,...extra});
const img='.jpg,.jpeg,.png,.webp,.avif,.bmp,.gif',vid='.mp4,.webm,.mov,.mkv,.avi,.m4v';
const ALL_TOOLS:Tool[]=[
t('file','merge-pdf','Merge PDF','Bring multiple PDFs together in one neatly ordered file.','combine','.pdf','pdf','Organize PDF',{multiple:true,popular:true}),
t('file','split-pdf','Split PDF','Save each page of a PDF as its own document.','split','.pdf','zip','Organize PDF',{popular:true}),
t('file','pdf-to-jpg','PDF to JPG','Turn every PDF page into a high-quality JPG image.','image','.pdf','jpg','Convert from PDF',{popular:true}),
t('file','pdf-to-png','PDF to PNG','Export PDF pages as crisp, lossless PNG images.','image','.pdf','png','Convert from PDF'),
t('file','jpg-to-pdf','JPG to PDF','Make a shareable PDF from your JPG photographs.','file','.jpg,.jpeg','pdf','Convert to PDF',{multiple:true,popular:true}),
t('file','images-to-pdf','Images to PDF','Arrange JPG, PNG and WebP images into a single PDF.','file',img,'pdf','Convert to PDF',{multiple:true}),
t('file','rotate-pdf','Rotate PDF','Correct sideways or upside-down pages in your PDF.','rotate','.pdf','pdf','Organize PDF'),
t('file','reorder-pdf-pages','Reorder PDF pages','Put PDF pages in exactly the order you need.','layers','.pdf','pdf','Organize PDF'),
t('file','extract-pdf-pages','Extract PDF pages','Keep a selection of pages in a new PDF document.','copy','.pdf','pdf','Organize PDF'),
t('file','delete-pdf-pages','Delete PDF pages','Remove unwanted pages while keeping the rest intact.','trash','.pdf','pdf','Organize PDF'),
t('file','add-page-numbers-to-pdf','Add page numbers','Add clear page numbers to the bottom of your PDF.','hash','.pdf','pdf','PDF utilities'),
t('file','watermark-pdf','Watermark PDF','Add a text watermark to every page of a PDF.','type','.pdf','pdf','PDF utilities'),
...(['jpg:png','png:jpg','jpg:webp','png:webp','webp:jpg','webp:png','heic:jpg','heic:png','avif:jpg','avif:png','svg:png','png:ico']).map(pair=>{const[a,b]=pair.split(':');return t('image',`${a}-to-${b}`,`${a.toUpperCase()} to ${b.toUpperCase()}`,`Convert ${a.toUpperCase()} images to ${b.toUpperCase()} directly in your browser.`,'image',a==='jpg'?'.jpg,.jpeg':a==='heic'?'.heic,.heif':'.'+a,b,'Convert images',{popular:['jpg:png','png:jpg'].includes(pair),note:a==='heic'?'HEIC photos are decoded on your device. Some newer HDR or multi-image HEIC files may not be supported.':a==='avif'?'Your browser must support AVIF decoding. HDR images are exported as standard SDR images.':a==='svg'?'Use a self-contained SVG. External fonts, linked images and scripts are not imported.':undefined});}),
...['image','jpg','png','webp'].map(a=>t('image','compress-'+a,a==='image'?'Compress image':`Compress ${a.toUpperCase()}`,a==='png'?'Reduce PNG colours to make smaller files, preserving transparency.':'Balance image quality and file size for faster sharing.','compress',a==='image'?img:a==='jpg'?'.jpg,.jpeg':'.'+a,a==='image'?'jpg':a,'Optimize images',{popular:a==='image',note:a==='png'?'PNG compression reduces the colour palette. Review the result; images with many colours may change slightly.':'Already optimized files may not become smaller.'})),
...['image','jpg','png'].map(a=>t('image','resize-'+a,a==='image'?'Resize image':`Resize ${a.toUpperCase()}`,'Set exact pixel dimensions without changing the original file.','resize',a==='image'?img:a==='jpg'?'.jpg,.jpeg':'.'+a,a==='png'?'png':'jpg','Edit images',{popular:a==='image'})),
t('image','crop-image','Crop image','Crop an image using precise position and size controls.','crop',img,'png','Edit images'),
t('image','rotate-image','Rotate image','Turn images 90, 180 or 270 degrees.','rotate',img,'png','Edit images'),
t('image','flip-image','Flip image','Mirror an image horizontally or vertically.','flip',img,'png','Edit images'),
t('image','image-to-base64','Image to Base64','Turn an image into a data URL for a webpage or stylesheet.','code',img,'txt','Developer tools'),
t('image','base64-to-image','Base64 to image','Decode a JPG, PNG, GIF or WebP data URL into an image file.','code','','png','Developer tools'),
t('image','remove-image-metadata','Remove image metadata','Re-encode an image without its original EXIF information.','shield',img,'png','Optimize images',{note:'Re-encoding also removes embedded colour profiles and animation. The output is a still PNG image.'}),
t('image','image-dimensions','Image dimensions','Read image width, height, aspect ratio and file size.','scan',img,'txt','Developer tools'),
t('image','favicon-generator','Favicon generator','Create 16, 32, 48 and 180 pixel icons in one ZIP file.','sparkles',img,'zip','Developer tools'),
...['mov:mp4','mkv:mp4','avi:mp4','webm:mp4','mp4:webm','mp4:mp3','mp4:gif','gif:mp4'].map(pair=>{const[a,b]=pair.split(':');return t('video',`${a}-to-${b}`,`${a.toUpperCase()} to ${b.toUpperCase()}`,`Convert ${a.toUpperCase()} files to ${b.toUpperCase()} without uploading your video.`,'video','.'+a,b,b==='mp3'?'Video to audio':'Convert video',{popular:['mov:mp4','mp4:mp3'].includes(pair),note:b==='gif'?'GIF has no sound. Short clips work best; output is up to 480 pixels wide at 10 frames per second.':undefined});}),
t('video','trim-video','Trim video','Keep the part you want using start and end times.','scissors',vid,'mp4','Edit video',{popular:true}),
t('video','compress-video','Compress video','Reduce video size with a choice of compression levels.','compress',vid,'mp4','Optimize video',{popular:true}),
t('video','mute-video','Mute video','Remove the audio track from a video.','mute',vid,'mp4','Edit video'),
t('video','extract-audio','Extract audio','Save the soundtrack from a video as an MP3 file.','music',vid,'mp3','Video to audio',{popular:true}),
t('video','resize-video','Resize video','Choose a new width and keep the video proportions.','resize',vid,'mp4','Optimize video'),
t('video','change-video-resolution','Change video resolution','Export your video at 360p, 480p, 720p or 1080p.','scan',vid,'mp4','Optimize video'),
t('video','extract-video-frames','Extract video frames','Save still frames from a video as a ZIP of JPG images.','image',vid,'zip','Edit video')];
export const tools=[...ALL_TOOLS,...additionalTools];
const toolSection:Record<Category,string>={file:'pdf',image:'image',video:'video'};
export const toolPath=(tool:Tool)=>`/${toolSection[tool.category]}/${tool.slug}`;
export const toolFromPath=(path:string)=>tools.find(t=>toolPath(t)===path.replace(/\/$/,''));
export const categoryInfo={file:{name:'PDF tools',short:'PDF',description:'Merge, split, organize and convert PDF documents in your browser.',icon:'file',tag:'DOCUMENTS, REFITTED'},image:{name:'Image tools',short:'Image',description:'Convert, compress, resize and edit images directly in your browser.',icon:'image',tag:'PIXELS, REFITTED'},video:{name:'Video & audio tools',short:'Video',description:'Convert, trim, compress and extract audio from short videos on your device.',icon:'video',tag:'MEDIA, REFITTED'}}[SITE.category];
export const hubs:Record<string,{title:string;description:string;filter:(t:Tool)=>boolean}>={};
const add=(slug:string,title:string,description:string,filter:(t:Tool)=>boolean)=>hubs[`/collections/${slug}/`]={title,description,filter};
if(true){
 add('organize-pdf','Organize PDF','Merge, split, reorder, extract and remove PDF pages.',t=>t.group==='Organize PDF');
 add('convert-pdf','Convert PDF','Move between PDF documents and common image formats.',t=>t.category==='file'&&t.group.includes('Convert'));
 add('pdf-utilities','PDF utilities','Add page numbers, watermarks and other finishing touches.',t=>t.group==='PDF utilities');
}
if(true){
 add('convert-images','Image converters','Convert between JPG, PNG, WebP, HEIC, AVIF and other formats.',t=>t.group==='Convert images');
 add('compress-images','Image compression','Reduce file sizes for faster sharing and web delivery.',t=>t.group==='Optimize images');
 add('edit-images','Resize & edit images','Resize, crop, rotate and flip images without uploading them.',t=>t.group==='Edit images');
 add('developer-tools','Image developer tools','Dimensions, Base64, favicons and metadata tools.',t=>t.group==='Developer tools');
}
if(true){
 add('convert-video','Video converters','Convert common video containers for easier playback and sharing.',t=>t.group==='Convert video');
 add('edit-video','Video editing','Trim, mute and extract frames from short videos.',t=>t.group==='Edit video');
 add('optimize-video','Video optimization','Compress and resize video output for practical sharing.',t=>t.group==='Optimize video');
 add('video-to-audio','Video to audio','Extract MP3 audio from compatible video files.',t=>t.group==='Video to audio');
}
const ALL_FORMATS:Record<string,{name:string;description:string;best:string;limit:string;mime:string}>={
pdf:{name:'PDF',description:'Portable Document Format preserves document layout across devices.',best:'Documents, forms, print-ready layouts and multi-page collections.',limit:'PDF preserves layout; rebuilding editable source content is not always reliable.',mime:'application/pdf'},
jpg:{name:'JPG / JPEG',description:'JPEG is a lossy image format designed for photographs.',best:'Photos, email attachments and images without transparency.',limit:'Repeated saving adds compression and JPG has no transparency.',mime:'image/jpeg'},
png:{name:'PNG',description:'PNG uses lossless compression and supports transparent pixels.',best:'Screenshots, logos, diagrams and interface assets.',limit:'Photographs are often larger than JPG or WebP.',mime:'image/png'},
webp:{name:'WebP',description:'WebP supports efficient lossy and lossless web images.',best:'Modern web images, including transparent graphics.',limit:'Some older applications may not accept WebP.',mime:'image/webp'},
heic:{name:'HEIC',description:'HEIC is commonly used for efficient photos from Apple devices.',best:'Original phone photos and compact storage.',limit:'Some HDR and newer profiles may not decode in every browser.',mime:'image/heic'},
avif:{name:'AVIF',description:'AVIF is a modern image format with efficient compression.',best:'Web photography for compatible browsers.',limit:'Browser support and HDR handling can vary.',mime:'image/avif'},
svg:{name:'SVG',description:'SVG stores scalable vector artwork as XML.',best:'Icons, logos and diagrams.',limit:'Raster conversion creates a fixed-size image.',mime:'image/svg+xml'},
ico:{name:'ICO',description:'ICO is an icon container often used for favicons.',best:'Browser and desktop icons.',limit:'Simple square artwork works best at tiny sizes.',mime:'image/x-icon'},
gif:{name:'GIF',description:'GIF supports simple animation with a limited colour palette.',best:'Short silent loops and simple graphics.',limit:'GIF has no sound and a limited palette.',mime:'image/gif'},
mp4:{name:'MP4',description:'MP4 is a widely supported multimedia container.',best:'Sharing video across browsers, phones and players.',limit:'Compatibility still depends on the codecs inside the file.',mime:'video/mp4'},
webm:{name:'WebM',description:'WebM is an open media container common on the web.',best:'Browser-first video workflows.',limit:'Some editing applications still prefer MP4.',mime:'video/webm'},
mov:{name:'MOV',description:'MOV is a QuickTime container commonly used by Apple devices and editors.',best:'Camera originals and editing workflows.',limit:'Large or demanding codecs can exceed browser memory.',mime:'video/quicktime'},
mkv:{name:'MKV',description:'Matroska can contain multiple video, audio and subtitle tracks.',best:'Flexible media storage.',limit:'These tools focus on the primary video/audio tracks.',mime:'video/x-matroska'},
avi:{name:'AVI',description:'AVI is an older media container used in legacy workflows.',best:'Older recordings that need a modern output.',limit:'Some legacy codecs cannot be decoded by the browser engine.',mime:'video/x-msvideo'},
mp3:{name:'MP3',description:'MP3 is a widely supported lossy audio format.',best:'Spoken recordings and extracted soundtracks.',limit:'A higher bitrate cannot restore missing source detail.',mime:'audio/mpeg'}
};
export const formats=ALL_FORMATS;
const ALL_GUIDES=[
 ['how-to-merge-pdf-files','How to merge PDF files','merge-pdf','Put several documents into one clean PDF.'],['how-to-split-a-pdf','How to split a PDF','split-pdf','Save individual pages from one PDF.'],['how-to-convert-images-to-pdf','How to convert images to PDF','images-to-pdf','Turn pictures into a shareable document.'],
 ['how-to-convert-jpg-to-png','How to convert JPG to PNG','jpg-to-png','Choose a lossless format for editing.'],['how-to-convert-png-to-webp','How to convert PNG to WebP','png-to-webp','Prepare lighter images for the web.'],['how-to-convert-heic-to-jpg','How to convert HEIC to JPG','heic-to-jpg','Use phone photos in more applications.'],['how-to-reduce-image-file-size','How to reduce image file size','compress-image','Balance file size and visible detail.'],['how-to-resize-an-image','How to resize an image','resize-image','Choose the exact dimensions you need.'],
 ['how-to-convert-mov-to-mp4','How to convert MOV to MP4','mov-to-mp4','Make a QuickTime clip easier to share.'],['how-to-convert-webm-to-mp4','How to convert WebM to MP4','webm-to-mp4','Prepare browser video for more players.'],['how-to-compress-video','How to compress a video','compress-video','Reduce size for practical sharing.'],['how-to-extract-audio-from-video','How to extract audio from video','extract-audio','Save the soundtrack as an MP3.']
] as const;
export const guides=ALL_GUIDES.filter(g=>tools.some(t=>t.slug===g[2]));
export const helpTopics=[['how-processing-works','How browser processing works'],['privacy-and-local-processing','Privacy & local processing'],['supported-formats','Supported formats'],['file-size-and-performance','File size & performance'],['browser-compatibility','Browser compatibility'],['conversion-errors','Fix a conversion error'],['download-problems','Fix a download problem']] as const;
export const legalTitles:Record<string,string>={about:`About ${SITE.brand}`,contact:'Contact',privacy:'Privacy policy',terms:'Terms of use',cookies:'Cookie policy',advertising:'Advertising',faq:'Frequently asked questions'};
export function allPaths(){return ['/', '/tools/','/popular-tools/','/formats/','/guides/','/help/','/sitemap/',...tools.map(toolPath),...Object.keys(hubs),...Object.keys(formats).map(s=>`/formats/${s}/`),...guides.map(g=>`/guides/${g[0]}/`),...helpTopics.map(h=>`/help/${h[0]}/`),...Object.keys(legalTitles).map(s=>`/${s}/`)];}
