"use client";
import { useMemo,useRef,useState } from "react";
const AdSlot=({name}:{name:string})=>null;

type Word={start:number;end:number;word:string};
type Seg={id:number;start:number;end:number;text:string;words:Word[]};
type Transcript={language:string;language_probability:number;segments:Seg[]};
type Clip={id:string;title:string;segmentIds:number[];start:number;end:number;renderedUrl?:string};

const format=(s:number)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(Math.floor(s%60)).padStart(2,"0")}`;
const cleanServerText=(raw:string)=>{
  try{
    return new DOMParser().parseFromString(raw,"text/html").body.textContent?.replace(/\s+/g," ").trim()||raw.slice(0,500);
  }catch{
    return raw.slice(0,500);
  }
};

export default function ClipStudio({processorBase=""}:{processorBase?:string}){
  const input=useRef<HTMLInputElement>(null);
  const [drag,setDrag]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [sourceUrl,setSourceUrl]=useState("");
  const [remoteUrl,setRemoteUrl]=useState("");
  const [linkValue,setLinkValue]=useState("");
  const [linkLoading,setLinkLoading]=useState(false);
  const [jobId,setJobId]=useState("");
  const [transcript,setTranscript]=useState<Transcript|null>(null);
  const [selected,setSelected]=useState<Set<number>>(new Set());
  const [clips,setClips]=useState<Clip[]>([]);
  const [activeClip,setActiveClip]=useState("");
  const [status,setStatus]=useState("");
  const [progress,setProgress]=useState(0);
  const [error,setError]=useState("");
  const [aspect,setAspect]=useState("source");
  const [captions,setCaptions]=useState(true);
  const [fontSize,setFontSize]=useState(52);
  const [textColor,setTextColor]=useState("#ffffff");
  const [background,setBackground]=useState(true);
  const [backgroundColor,setBackgroundColor]=useState("#000000");
  const [position,setPosition]=useState("bottom");
  const [overlayText,setOverlayText]=useState("");
  const [overlayColor,setOverlayColor]=useState("#ffffff");
  const [overlaySize,setOverlaySize]=useState(46);
  const [rendering,setRendering]=useState(false);


  const active=useMemo(()=>clips.find(c=>c.id===activeClip)||null,[clips,activeClip]);
  const step=active?3:transcript?2:1;

  function resetWork(){
    setError("");
    setStatus("");
    setProgress(0);
    setTranscript(null);
    setClips([]);
    setSelected(new Set());
    setActiveClip("");
    setJobId("");
  }

  function choose(f:File|null){
    if(!f)return;
    if(sourceUrl.startsWith("blob:"))URL.revokeObjectURL(sourceUrl);
    resetWork();
    setFile(f);
    setRemoteUrl("");
    setLinkValue("");
    setSourceUrl(URL.createObjectURL(f));
  }

  function attachVideoLink(){
    const value=linkValue.trim();
    if(!value)return;
    try{
      const parsed=new URL(value);
      if(!["http:","https:"].includes(parsed.protocol))throw new Error();
    }catch{
      setError("Paste a valid http:// or https:// video link.");
      return;
    }
    if(sourceUrl.startsWith("blob:"))URL.revokeObjectURL(sourceUrl);
    resetWork();
    setFile(null);
    setRemoteUrl(value);
    setSourceUrl(value);
    setStatus("Video link attached. Preview it below, then create the transcript.");
  }

  function uploadFile(inputFile:File){
    setError("");
    setStatus("Uploading video…");
    setProgress(1);

    const xhr=new XMLHttpRequest();
    const processUrl=`${processorBase}/api/process?name=${encodeURIComponent(inputFile.name)}`;
    xhr.open("POST",processUrl);
    xhr.setRequestHeader("Content-Type",inputFile.type||"application/octet-stream");

    xhr.upload.onprogress=e=>{
      if(e.lengthComputable)setProgress(Math.max(1,Math.round((e.loaded/e.total)*35)));
    };
    xhr.upload.onload=()=>{
      setProgress(40);
      setStatus("Extracting audio and transcribing… This can take time for long videos.");
    };
    xhr.onerror=()=>{
      setError("Upload failed. Check the deployment function logs and network connection.");
      setStatus("");
    };
    xhr.onload=()=>{
      try{
        const raw=xhr.responseText||"";
        const type=xhr.getResponseHeader("content-type")||"";
        if(!type.includes("application/json")){
          throw new Error(`Server returned HTTP ${xhr.status}. ${cleanServerText(raw).slice(0,300)||"Check the server logs."}`);
        }
        const d=JSON.parse(raw||"{}");
        if(xhr.status<200||xhr.status>=300)throw new Error(d.error||`Processing failed (HTTP ${xhr.status})`);
        if(!d.jobId||!d.transcript?.segments)throw new Error("Server returned an incomplete transcript response.");
        setJobId(d.jobId);
        setTranscript(d.transcript);
        setProgress(100);
        setStatus("Transcript ready");
      }catch(e:any){
        setError(e?.message||"Processing failed");
        setStatus("");
      }
    };
    xhr.send(inputFile);
  }

  async function processVideo(){
    if(!file&&!remoteUrl)return;
    if(!processorBase){setError("Transcription is not connected yet. Connect a processing server in Admin → Integrations to enable transcription and rendering for uploaded files or video links.");return;}
    if(file){uploadFile(file);return;}

    setError("");
    setLinkLoading(true);
    setStatus("Loading video from link…");
    setProgress(5);
    try{
      const response=await fetch(remoteUrl,{mode:"cors"});
      if(!response.ok)throw new Error(`Video link returned HTTP ${response.status}`);
      const blob=await response.blob();
      if(!blob.size)throw new Error("The video link returned an empty file.");
      const pathname=new URL(remoteUrl).pathname;
      const guessedName=decodeURIComponent(pathname.split("/").filter(Boolean).pop()||"linked-video.mp4");
      const linkedFile=new File([blob],guessedName.includes(".")?guessedName:"linked-video.mp4",{type:blob.type||"video/mp4"});
      setFile(linkedFile);
      setStatus("Video link loaded. Uploading to the processor…");
      uploadFile(linkedFile);
    }catch(browserError:any){
      setStatus("The browser could not download this link directly. Asking the processor to fetch it…");
      setProgress(12);
      try{
        const r=await fetch(`${processorBase}/api/process`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceUrl:remoteUrl})});
        const raw=await r.text();
        const type=r.headers.get("content-type")||"";
        if(!type.includes("application/json"))throw new Error(`Server returned HTTP ${r.status}. ${cleanServerText(raw).slice(0,300)||browserError?.message||"Check the server logs."}`);
        const d=JSON.parse(raw||"{}");
        if(!r.ok)throw new Error(d.error||`Processing failed (HTTP ${r.status})`);
        if(!d.jobId||!d.transcript?.segments)throw new Error("Server returned an incomplete transcript response.");
        setJobId(d.jobId);
        setTranscript(d.transcript);
        setProgress(100);
        setStatus("Transcript ready");
      }catch(e:any){
        setError(e?.message||browserError?.message||"Processing the video link failed. Use a direct public video URL or upload the video file.");
        setStatus("");
      }
    }finally{setLinkLoading(false)}
  }

  function toggle(id:number){
    setSelected(prev=>{
      const n=new Set(prev);
      n.has(id)?n.delete(id):n.add(id);
      return n;
    });
  }

  function addClip(){
    if(!transcript||!selected.size)return;
    const segs=transcript.segments.filter(s=>selected.has(s.id)).sort((a,b)=>a.start-b.start);
    if(!segs.length)return;
    const clip:Clip={
      id:crypto.randomUUID(),
      title:`Clip ${clips.length+1}`,
      segmentIds:segs.map(s=>s.id),
      start:segs[0].start,
      end:segs[segs.length-1].end
    };
    setClips(prev=>[...prev,clip]);
    setSelected(new Set());
  }

  function removeClip(id:string){
    setClips(prev=>prev.filter(c=>c.id!==id));
    if(activeClip===id)setActiveClip("");
  }

  function updateActive(patch:Partial<Clip>){
    setClips(prev=>prev.map(c=>c.id===activeClip?{...c,...patch}:c));
  }

  async function render(){
    if(!active||!jobId)return;
    if(active.end<=active.start){
      setError("Clip end time must be greater than start time.");
      return;
    }
    setRendering(true);
    setError("");
    setStatus("Rendering final clip…");
    try{
      const r=await fetch(`${processorBase}/api/render`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          jobId,start:active.start,end:active.end,aspect,captions,
          captionStyle:{fontSize,textColor,background,backgroundColor,position},
          overlayText,overlayColor,overlaySize
        })
      });
      const type=r.headers.get("content-type")||"";
      if(!type.includes("application/json")){
        const raw=await r.text();
        throw new Error(`Render server returned HTTP ${r.status}. ${cleanServerText(raw).slice(0,300)||"Check the server logs."}`);
      }
      const d:any=await r.json();
      if(!r.ok)throw new Error(d.error||"Render failed");
      if(!d.url)throw new Error("Render completed without a download URL.");
      const finalUrl=d.url?.startsWith("http")?d.url:`${processorBase}${d.url}`;
      updateActive({renderedUrl:finalUrl});
      setStatus("Clip ready");
    }catch(e:any){
      setError(e?.message||"Render failed");
      setStatus("");
    }finally{
      setRendering(false);
    }
  }

  return <div className="clip-workspace workspace"><div className="container"><div className="workspace-grid">
    <aside><div className="panel sidebar">
      {["Upload & transcribe","Select & group clips","Edit, caption & export"].map((x,i)=><div className={`step ${step===i+1?"active":""}`} key={x}><span className="step-num">{i+1}</span><div><strong>{x}</strong><br/><small>{i===0?"Long source video":i===1?"Mark Clip 1, Clip 2…":"Mobile crop + captions"}</small></div></div>)}
      <AdSlot name="sidebar"/>
    </div></aside>

    <section className="panel studio">
      {!transcript&&<div>
        <div className="toolbar"><div><h2 style={{margin:0}}>Add your long video</h2><p style={{color:"#667085",marginBottom:0}}>Upload a video file or paste a direct public video link, then create clips from its transcript.</p></div></div>
        <div className={`upload-zone ${drag?"drag":""}`} style={{marginTop:18}} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(e.dataTransfer.files?.[0]||null)}}>
          <div style={{fontSize:44}}>🎬</div><h2>{file?file.name:"Drop your video here"}</h2><p style={{color:"#667085"}}>{file?`${(file.size/1024/1024).toFixed(1)} MB`:"MP4, MOV, MKV, WEBM and other FFmpeg-readable formats"}</p><button className="btn btn-light" type="button">Choose video</button><input ref={input} type="file" accept="video/*,.mkv,.avi,.m4v" hidden onChange={e=>choose(e.target.files?.[0]||null)}/>
        </div>
        <div className="source-divider"><span>OR</span></div>
        <div className="video-link-box"><div><strong>Paste a video link</strong><p>Use a direct public video URL that your connected processor can download.</p></div><div className="video-link-row"><input type="url" value={linkValue} onChange={e=>setLinkValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();attachVideoLink()}}} placeholder="https://example.com/video.mp4" aria-label="Video link"/><button className="btn btn-light" type="button" onClick={attachVideoLink}>Attach link</button></div></div>
        {sourceUrl&&<div className="video-frame" style={{marginTop:16,minHeight:260}}><video src={sourceUrl} controls/></div>}
        {(file||remoteUrl)&&<div className="source-ready-row" style={{marginTop:16}}><span>{remoteUrl?"Video link ready":"Uploaded file ready"}</span><button className="btn btn-primary" disabled={linkLoading} onClick={processVideo}>{linkLoading?"Loading link…":remoteUrl?"Create transcript from link":"Upload & create transcript"}</button></div>}
        {status&&<div style={{marginTop:16}}><div className="progress"><span style={{width:`${progress}%`}}/></div><p style={{color:"#667085"}}>{status}</p></div>}
        {error&&<div className="notice" style={{color:"#b42318",marginTop:12}}>{error}</div>}
      </div>}

      {transcript&&!active&&<div>
        <div className="toolbar"><div><h2 style={{margin:0}}>Select conversations</h2><p style={{color:"#667085",margin:"5px 0 0"}}>Language: <strong>{transcript.language?.toUpperCase()}</strong> • Select related paragraphs, then save them as one clip.</p></div><button className="btn btn-primary" disabled={!selected.size} onClick={addClip}>Save selection as Clip {clips.length+1}</button></div>
        <div className="notice" style={{marginTop:14}}>Speech is split into readable timestamped paragraph blocks. Select the paragraphs that should belong to one clip.</div>
        <div className="transcript-list">{transcript.segments.map(seg=><label key={seg.id} className={`segment ${selected.has(seg.id)?"selected":""}`}><input type="checkbox" checked={selected.has(seg.id)} onChange={()=>toggle(seg.id)}/><span className="time">{format(seg.start)}–{format(seg.end)}</span><span style={{lineHeight:1.55}}>{seg.text}</span></label>)}</div>
        {clips.length>0&&<div style={{marginTop:22}}><div className="toolbar"><h3 style={{margin:0}}>Saved clips</h3><small style={{color:"#667085"}}>{clips.length} clip(s)</small></div><div className="cards" style={{gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",marginTop:12}}>{clips.map(c=><article className="card" key={c.id}><h3>{c.title}</h3><p>{format(c.start)} – {format(c.end)} • {(c.end-c.start).toFixed(1)} sec</p><div style={{display:"flex",gap:8,marginTop:14}}><button className="btn btn-primary" onClick={()=>setActiveClip(c.id)}>Edit clip</button><button className="btn btn-danger" onClick={()=>removeClip(c.id)}>Delete</button></div></article>)}</div></div>}
      </div>}

      {active&&<div>
        <div className="toolbar"><div><h2 style={{margin:0}}>{active.title}</h2><p style={{color:"#667085",margin:"5px 0 0"}}>{format(active.start)} – {format(active.end)} • {(active.end-active.start).toFixed(1)} sec</p></div><button className="btn btn-light" onClick={()=>setActiveClip("")}>← Back to transcript</button></div>
        <div className="editor-grid" style={{marginTop:16}}>
          <div><div className="video-frame"><video src={active.renderedUrl||sourceUrl} controls/></div>{active.renderedUrl&&<a className="btn btn-primary" style={{width:"100%",marginTop:12}} href={active.renderedUrl}>Download final MP4</a>}</div>
          <div className="panel controls">
            <label>Clip title</label><input value={active.title} onChange={e=>updateActive({title:e.target.value})}/>
            <div className="row2"><div><label>Start seconds</label><input type="number" min="0" step=".01" value={active.start} onChange={e=>updateActive({start:Number(e.target.value)})}/></div><div><label>End seconds</label><input type="number" min="0" step=".01" value={active.end} onChange={e=>updateActive({end:Number(e.target.value)})}/></div></div>
            <label>Video format</label><select value={aspect} onChange={e=>setAspect(e.target.value)}><option value="source">Keep original</option><option value="16:9">16:9 Landscape</option><option value="9:16">9:16 Mobile / Shorts</option><option value="1:1">1:1 Square</option><option value="4:5">4:5 Portrait</option></select>
            <label style={{display:"flex",gap:8,alignItems:"center"}}><input style={{width:"auto"}} type="checkbox" checked={captions} onChange={e=>setCaptions(e.target.checked)}/> Show timed captions</label>
            {captions&&<><div className="row2"><div><label>Caption size</label><input type="number" min="20" max="96" value={fontSize} onChange={e=>setFontSize(Number(e.target.value))}/></div><div><label>Caption position</label><select value={position} onChange={e=>setPosition(e.target.value)}><option value="bottom">Bottom</option><option value="center">Center</option><option value="top">Top</option></select></div></div>
            <div className="row2"><div><label>Text color</label><input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></div><div><label>Background color</label><input type="color" value={backgroundColor} onChange={e=>setBackgroundColor(e.target.value)}/></div></div>
            <label style={{display:"flex",gap:8,alignItems:"center"}}><input style={{width:"auto"}} type="checkbox" checked={background} onChange={e=>setBackground(e.target.checked)}/> Caption background box</label></>}
            <label>Extra overlay text</label><textarea rows={3} value={overlayText} onChange={e=>setOverlayText(e.target.value)} placeholder="Add a title, hook or note on the clip"/>
            <div className="row2"><div><label>Overlay color</label><input type="color" value={overlayColor} onChange={e=>setOverlayColor(e.target.value)}/></div><div><label>Overlay size</label><input type="number" min="20" max="100" value={overlaySize} onChange={e=>setOverlaySize(Number(e.target.value))}/></div></div>
            <button className="btn btn-primary" style={{width:"100%",marginTop:16}} disabled={rendering} onClick={render}>{rendering?"Rendering…":"Render final clip"}</button>
            {status&&<div className="notice ok" style={{marginTop:12}}>{status}</div>}
            {error&&<div className="notice" style={{marginTop:12,color:"#b42318"}}>{error}</div>}
          </div>
        </div>
      </div>}
    </section>
  </div></div></div>
}
