import {getConfig} from '@/lib/store';
import {siteOrigin} from '@/lib/seo';
export const dynamic='force-dynamic';
export async function GET(){const c=await getConfig();return new Response('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /api/\nSitemap: '+siteOrigin(c.siteUrl)+'/sitemap.xml\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}})}
