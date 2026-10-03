import { NextRequest,NextResponse } from "next/server";
import fsp from "node:fs/promises";
import path from "node:path";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
export const runtime="nodejs";
export async function OPTIONS(){return new NextResponse(null,{status:204,headers:corsHeaders})}
export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get("jobId")||"";
  if(!/^[a-f0-9-]+$/i.test(id))return NextResponse.json({error:"Invalid job"},{status:400,headers:corsHeaders});
  try{
    const meta=JSON.parse(await fsp.readFile(path.join("/tmp","cliprefit",id,"job.json"),"utf8"));
    const data=await fsp.readFile(meta.source);
    return new NextResponse(data,{headers:{"Content-Type":"video/mp4","Content-Disposition":`inline; filename="${meta.originalName}"`}});
  }catch{return NextResponse.json({error:"Source not found"},{status:404,headers:corsHeaders})}
}
