import { NextRequest,NextResponse } from "next/server";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { run } from "@/lib/process";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
export const runtime="nodejs";export const dynamic="force-dynamic";

function assColor(hex:string,alpha="00"){
  const h=(hex||"#ffffff").replace("#","").padEnd(6,"f").slice(0,6);
  return `&H${alpha}${h.slice(4,6)}${h.slice(2,4)}${h.slice(0,2)}`;
}
function t(sec:number){const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=(sec%60).toFixed(2).padStart(5,"0");return `${h}:${String(m).padStart(2,"0")}:${s}`}
function clean(s:string){return (s||"").replace(/[{}]/g,"").replace(/\n/g," ").trim()}
function makeAss(transcript:any,start:number,end:number,style:any){
  const pos=style.position==="top"?8:style.position==="center"?5:2;
  const size=Math.max(20,Math.min(96,Number(style.fontSize)||52));
  const bg=style.background===false?assColor("#000000","FF"):assColor(style.backgroundColor||"#000000","70");
  const primary=assColor(style.textColor||"#ffffff","00");
  const header=`[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Arial,${size},${primary},${primary},&H00000000,${bg},-1,0,0,0,100,100,0,0,${style.background===false?1:3},${style.background===false?3:1},0,${pos},45,45,90,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
`;
  const lines:string[]=[];
  for(const seg of transcript.segments||[]){
    if(seg.end<start||seg.start>end)continue;
    const words=(seg.words||[]).filter((w:any)=>w.end>=start&&w.start<=end);
    if(words.length){
      for(let i=0;i<words.length;i+=6){
        const chunk=words.slice(i,i+6);
        const a=Math.max(0,chunk[0].start-start),b=Math.max(a+.08,Math.min(end,chunk[chunk.length-1].end)-start);
        lines.push(`Dialogue: 0,${t(a)},${t(b)},Default,,0,0,0,,${clean(chunk.map((w:any)=>w.word).join(" "))}`);
      }
    }else{
      const a=Math.max(0,seg.start-start),b=Math.max(a+.08,Math.min(end,seg.end)-start);
      lines.push(`Dialogue: 0,${t(a)},${t(b)},Default,,0,0,0,,${clean(seg.text)}`);
    }
  }
  return header+lines.join("\n")+"\n";
}
function escDrawtext(s:string){return (s||"").replace(/\\/g,"\\\\").replace(/:/g,"\\:").replace(/'/g,"\\'").replace(/%/g,"\\%")}

export async function OPTIONS(){return new NextResponse(null,{status:204,headers:corsHeaders})}
export async function POST(req:NextRequest){
  const body=await req.json();
  const {jobId}=body;if(!/^[a-f0-9-]+$/i.test(jobId||""))return NextResponse.json({error:"Invalid job"},{status:400,headers:corsHeaders});
  const start=Number(body.start),end=Number(body.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return NextResponse.json({error:"Invalid clip range"},{status:400,headers:corsHeaders});
  const root=path.join("/tmp","cliprefit",jobId);
  try{
    const meta=JSON.parse(await fsp.readFile(path.join(root,"job.json"),"utf8"));
    const outputId=crypto.randomUUID(),out=path.join(root,`${outputId}.mp4`);
    const filters:string[]=[];
    const aspect=body.aspect||"source";
    if(aspect==="9:16")filters.push("crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=1080:1920");
    if(aspect==="16:9")filters.push("crop='min(iw,ih*16/9)':'min(ih,iw*9/16)',scale=1920:1080");
    if(aspect==="1:1")filters.push("crop='min(iw,ih)':'min(iw,ih)',scale=1080:1080");
    if(aspect==="4:5")filters.push("crop='min(iw,ih*4/5)':'min(ih,iw*5/4)',scale=1080:1350");
    if(body.captions!==false){
      const ass=path.join(root,`${outputId}.ass`);
      await fsp.writeFile(ass,makeAss(meta.transcript,start,end,body.captionStyle||{}),"utf8");
      filters.push(`subtitles='${ass.replace(/'/g,"\\'")}'`);
    }
    const overlay=clean(body.overlayText||"");
    if(overlay){
      const color=(body.overlayColor||"#ffffff").replace("#","");
      filters.push(`drawtext=text='${escDrawtext(overlay)}':fontcolor=0x${color}:fontsize=${Math.max(20,Math.min(100,Number(body.overlaySize)||46))}:x=(w-text_w)/2:y=h*0.08:box=1:boxcolor=black@0.45:boxborderw=18`);
    }
    const args=["-y","-ss",String(start),"-i",meta.source,"-t",String(end-start)];
    if(filters.length)args.push("-vf",filters.join(","));
    args.push("-c:v","libx264","-preset","veryfast","-crf","20","-c:a","aac","-movflags","+faststart",out);
    await run("ffmpeg",args);
    return NextResponse.json({ok:true,url:`/api/download?jobId=${jobId}&file=${outputId}.mp4`},{headers:corsHeaders});
  }catch(e:any){return NextResponse.json({error:e?.message||"Render failed"},{status:500,headers:corsHeaders})}
}
