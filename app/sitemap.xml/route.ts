import {getConfig} from '@/lib/store';
import {indexablePaths,siteOrigin} from '@/lib/seo';
export const revalidate=3600;
export async function GET(){
  const c=await getConfig(),origin=siteOrigin(c.siteUrl);
  const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
  const urls=[...new Set(indexablePaths().map(p=>origin+p))];
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(url=>'<url><loc>'+escape(url)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'}});
}
