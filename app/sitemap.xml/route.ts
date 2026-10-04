import {getConfig} from '@/lib/store';
import {tools,toolPath} from '@/lib/catalog';
export async function GET(){const c=await getConfig();const urls=['/','/pdf','/image','/video','/clips','/clips/studio',...tools.map(toolPath)];const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(p=>'<url><loc>'+escape(c.siteUrl+p)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml'}})}
