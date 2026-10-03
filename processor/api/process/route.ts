import { NextRequest,NextResponse } from "next/server";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { run } from "@/lib/process";
import { getSettings } from "@/lib/settings";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function OPTIONS(){return new NextResponse(null,{status:204,headers:corsHeaders})}
export async function POST(req:NextRequest){
  if(!req.body)return NextResponse.json({error:"No video body received"},{status:400,headers:corsHeaders});
  const settings=await getSettings();
  const length=Number(req.headers.get("content-length")||0);
  const limitBytes=Math.max(5,Number(settings.uploadLimit)||200)*1024*1024;
  if(length&&length>limitBytes)return NextResponse.json({error:`Video exceeds the current ${settings.uploadLimit} MB upload limit. Change it from Owner Panel → Site.`},{status:413,headers:corsHeaders});
  const jobId=crypto.randomUUID();
  const root=path.join("/tmp","cliprefit",jobId);
  await fsp.mkdir(root,{recursive:true});
  const rawName=req.nextUrl.searchParams.get("name")||"source.mp4";
  const ext=(path.extname(rawName)||".mp4").replace(/[^.a-zA-Z0-9]/g,"")||".mp4";
  const source=path.join(root,`source${ext}`);
  const audio=path.join(root,"audio.wav");
  try{
    const nodeStream=Readable.fromWeb(req.body as any);
    await pipeline(nodeStream,fs.createWriteStream(source));
    await run("ffmpeg",["-y","-i",source,"-vn","-ac","1","-ar","16000","-c:a","pcm_s16le",audio]);
    const py=process.env.PYTHON_BIN||"python3";
    const {stdout}=await run(py,[path.join(process.cwd(),"python","transcribe.py"),audio],{env:{...process.env}});
    const transcript=JSON.parse(stdout);
    if(transcript.error)throw new Error(transcript.error);
    const meta={jobId,source,originalName:rawName,transcript,createdAt:new Date().toISOString()};
    await fsp.writeFile(path.join(root,"job.json"),JSON.stringify(meta),"utf8");
    await fsp.unlink(audio).catch(()=>{});
    return NextResponse.json({jobId,transcript},{headers:corsHeaders});
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Processing failed"},{status:500,headers:corsHeaders});
  }
}
