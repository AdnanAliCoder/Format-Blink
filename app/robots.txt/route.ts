import {getConfig} from '@/lib/store';
export async function GET(){const c=await getConfig();return new Response('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /api/\nSitemap: '+c.siteUrl+'/sitemap.xml\n',{headers:{'Content-Type':'text/plain'}})}
