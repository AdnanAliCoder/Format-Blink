import Site from '@/components/site';
import {getConfig} from '@/lib/store';
import {pageData,pagePaths} from '@/lib/pages';
import {hubs,tools,toolPath} from '@/lib/catalog';
import {notFound,permanentRedirect} from 'next/navigation';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{path:string[]}>}){const {path}=await params;const url='/'+path.join('/');const c=await getConfig(),p=pageData(url,c);return {title:p.title+' | Format Blink',description:p.description,alternates:{canonical:c.siteUrl+url},robots:['/admin','/login','/signup','/account'].includes(url)?{index:false,follow:false}:undefined,verification:{google:c.verificationToken||undefined}}}
export default async function Page({params}:{params:Promise<{path:string[]}>}){const {path}=await params;const url='/'+path.join('/');if(url.startsWith('/tools/')){const slug=path.at(-1)||'';const tool=tools.find(t=>t.slug===slug);if(tool)permanentRedirect(toolPath(tool));}if(!pagePaths().includes(url)&&!['/admin','/account'].includes(url)&&!hubs[url+'/'])notFound();return <Site path={url} config={await getConfig()}/>}
