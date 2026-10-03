import { NextRequest,NextResponse } from "next/server";
import fsp from "node:fs/promises";
import path from "node:path";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
export const runtime="nodejs";
export async function OPTIONS(){return new NextResponse(null,{status:204,headers:corsHeaders})}
export async function GET(req:NextRequest){
  const jobId=req.nextUrl.searchParams.get("jobId")||"",file=req.nextUrl.searchParams.get("file")||"";
  if(!/^[a-f0-9-]+$/i.test(jobId)||!/^[a-f0-9-]+\.mp4$/i.test(file))return NextResponse.json({error:"Invalid file"},{status:400,headers:corsHeaders});
  try{
    const data=await fsp.readFile(path.join("/tmp","cliprefit",jobId,file));
    return new NextResponse(data,{headers:{"Content-Type":"video/mp4","Content-Disposition":'attachment; filename="cliprefit-clip.mp4"',...corsHeaders}});
  }catch{return NextResponse.json({error:"File not found"},{status:404,headers:corsHeaders})}
}
