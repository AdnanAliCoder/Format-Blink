import {pageMetadata,structuredData} from '@/lib/seo';
import Site from '@/components/site';
import {getConfig} from '@/lib/store';
import {pageData,pagePaths} from '@/lib/pages';
import {hubs,tools,toolPath} from '@/lib/catalog';
import {notFound,permanentRedirect} from 'next/navigation';
export const revalidate=300;
export function generateStaticParams(){return pagePaths().filter(p=>p!=='/').map(p=>({path:p.slice(1).split('/')}))}
export async function generateMetadata({params}:{params:Promise<{path:string[]}>}){const {path}=await params;return pageMetadata('/'+path.join('/'),await getConfig())}
export default async function Page({params}:{params:Promise<{path:string[]}>}){const {path}=await params;const url='/'+path.join('/');if(url.startsWith('/tools/')){const slug=path.at(-1)||'';const tool=tools.find(t=>t.slug===slug);if(tool)permanentRedirect(toolPath(tool));}if(!pagePaths().includes(url)&&!['/admin','/account'].includes(url)&&!hubs[url+'/'])notFound();return <Site path={url} config={await getConfig()}/>}
