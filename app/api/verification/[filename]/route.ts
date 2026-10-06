import {getConfig} from '@/lib/store';
export const revalidate=3600;
export async function GET(_:Request,{params}:{params:Promise<{filename:string}>}){const {filename}=await params;const c=await getConfig();if(filename!==c.verificationFileName||!c.verificationFileContent)return new Response('Not found',{status:404});return new Response(c.verificationFileContent,{headers:{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'}})}
