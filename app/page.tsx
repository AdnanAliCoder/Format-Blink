import Site from '@/components/site';
import {getConfig} from '@/lib/store';
import {pageMetadata,structuredData} from '@/lib/seo';
export const dynamic='force-dynamic';
export async function generateMetadata(){return pageMetadata('/',await getConfig())}
export default async function Home(){const c=await getConfig();return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:structuredData('/',c)}}/><Site path="/" config={c}/></>}
