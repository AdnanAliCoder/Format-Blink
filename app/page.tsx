import Site from '@/components/site';
import {getConfig} from '@/lib/store';
import {pageData} from '@/lib/pages';
export const dynamic='force-dynamic';
export async function generateMetadata(){const c=await getConfig(),p=pageData('/',c);return {title:c.siteTitle,description:c.pages['/']?.description||c.description,alternates:{canonical:c.siteUrl+'/'},verification:{google:c.verificationToken||undefined}}}
export default async function Home(){return <Site path="/" config={await getConfig()}/>}
