// Run after generating /tmp/formatblink-fixtures and starting the production server.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();
 const fixture=process.env.FIXTURE_DIR||'/tmp/formatblink-fixtures';
 const output=process.env.RESULT_DIR||'/tmp/formatblink-results';fs.mkdirSync(output,{recursive:true});
 const cases=[
 ['compress-pdf','sample.pdf'],['pdf-editor','sample.pdf',{'Text':'Added text','Top (PDF points)':'80'}],
 ['sign-pdf','sample.pdf',{'Signature name':'Adnan Ali','Top (PDF points)':'80'}],['crop-pdf','sample.pdf'],['redact-pdf','sample.pdf'],['fill-pdf-form','form.pdf',{'Field values (JSON)':'{"Full Name":"Adnan Ali"}'}],['heic-to-pdf','sample.heic'],
 ['image-upscaler','text.png'],['watermark-image','text.png',{'Text':'TEST'}],['svg-to-jpg','sample.svg'],['gif-compressor','sample.gif'],['add-text-to-image','text.png',{'Text':'TEST'}],['blur-image','text.png'],
 ['merge-video',['sample.mp4','silent.mp4']],['crop-video','sample.mp4'],['video-speed-changer','sample.mp4'],['rotate-video','sample.mp4'],['reverse-video','sample.mp4'],['add-subtitles-to-video','sample.mp4',{},'captions.srt'],['add-audio-to-video','sample.mp4',{},'audio.mp3'],['loop-video','sample.mp4'],['change-video-aspect-ratio','sample.mp4'],['video-to-9-16','sample.mp4'],['mp4-to-mov','sample.mp4'],['mp4-to-avi','sample.mp4'],['mp4-to-mkv','sample.mp4']];
 const results={};
 for(const[slug,file,fields,aux] of cases.filter(c=>!process.env.ONLY_TOOLS||process.env.ONLY_TOOLS.split(',').includes(c[0]))){
  const errors=[];const errorHandler=e=>errors.push(e.message);page.on('pageerror',errorHandler);
  try{
   const response=await page.goto(`http://127.0.0.1:3000/tools/${slug}`,{waitUntil:'networkidle'});if(response.status()!==200)throw Error('Route status '+response.status());
   await page.locator('#file-input').setInputFiles((Array.isArray(file)?file:[file]).map(f=>fixture+'/'+f));
   await page.getByRole('group',{name:'Output settings'}).waitFor();
   const consent=page.getByRole('button',{name:'Essential only',exact:true});if(await consent.count())await consent.click();
   // Image decoding updates default dimensions asynchronously.
   if(['image-upscaler','watermark-image','add-text-to-image','blur-image','gif-compressor'].includes(slug))await page.locator('.input-preview img').waitFor();
   for(const[label,value]of Object.entries(fields||{}))await page.getByLabel(label,{exact:true}).fill(value);
   if(aux)await page.getByLabel(slug==='add-audio-to-video'?'Soundtrack file':'SRT subtitle file',{exact:true}).setInputFiles(fixture+'/'+aux);
   if(slug==='pdf-editor')await page.waitForFunction(()=>document.querySelector('canvas[aria-label="PDF page preview"]')?.width===400);
   if(slug==='pdf-editor')await page.screenshot({path:output+'/pdf-editor-desktop.png',fullPage:true});
   await page.getByRole('button',{name:/^Process file/}).click();
   await page.waitForFunction(()=>document.querySelector('.result-panel')||document.querySelector('.inline-error'),{},{timeout:120000});
   if(await page.locator('.inline-error').count())throw Error(await page.locator('.inline-error').innerText());
   const link=page.locator('.result-file a[download]');
   const [download]=await Promise.all([page.waitForEvent('download'),link.click()]);
   await download.saveAs(output+'/'+slug+'.'+download.suggestedFilename().split('.').pop());
   if(errors.length)throw Error(errors.join('; '));
   results[slug]='PASS';
  }catch(e){results[slug]='FAIL '+e.message;}
  page.off('pageerror',errorHandler);console.log(slug+': '+results[slug]);
 }
 // Processor pages clearly block unavailable uploads.
 await page.goto('http://127.0.0.1:3000/tools/pdf-to-word');
 await page.locator('#file-input').setInputFiles(fixture+'/sample.pdf');
 results['missing-processor-blocked']=await page.getByRole('button',{name:/^Process file/}).isDisabled()?'PASS':'FAIL';
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3000/tools/pdf-editor');await page.locator('#file-input').setInputFiles(fixture+'/sample.pdf');await page.getByLabel('Text',{exact:true}).fill('Mobile text');await page.waitForFunction(()=>document.querySelector('canvas[aria-label="PDF page preview"]')?.width===400);await page.screenshot({path:output+'/pdf-editor-mobile.png',fullPage:true});
 results['mobile-no-overflow']=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)?'PASS':'FAIL';
 fs.writeFileSync(output+'/browser-results.json',JSON.stringify(results,null,2));await browser.close();
 if(Object.values(results).some(x=>x.startsWith('FAIL')))process.exitCode=1;
})();
