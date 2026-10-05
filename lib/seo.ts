import type {Metadata} from 'next';
import type {Config} from './config';
import {pageData,pagePaths} from './pages';
import {SITE} from './site';
const excluded = new Set(['/admin','/account','/login','/signup','/about','/contact','/cookies','/privacy','/terms','/advertising','/events','/sitemap']);
export function siteOrigin(value:string){
  try { const u=new URL(value); if(!['http:','https:'].includes(u.protocol))throw Error();
    if(u.hostname==='format-blink.vercel.app')return SITE.defaultUrl;
    return u.origin;
  } catch {return SITE.defaultUrl;}
}
export const indexablePaths=()=>pagePaths().filter(p=>!excluded.has(p));
export function pageMetadata(path:string,c:Config):Metadata{
  const page=pageData(path,c),origin=siteOrigin(c.siteUrl);
  const title=path==='/'?c.siteTitle:page.title+' | Format Blink';
  const description=page.description||c.description;
  const url=origin+path;
  return {title,description,metadataBase:new URL(origin),alternates:{canonical:url},
    robots:['/admin','/account','/login','/signup'].includes(path)?{index:false,follow:false}:undefined,
    openGraph:{title,description,url,siteName:'Format Blink',type:'website',images:[{url:origin+'/brand-icon.webp',alt:'Format Blink'}]},
    twitter:{card:'summary',title,description,images:[origin+'/brand-icon.webp']},
    verification:{google:c.verificationToken||undefined}};
}
export function structuredData(path:string,c:Config){
  const origin=siteOrigin(c.siteUrl),page=pageData(path,c);
  const graph:object[]=[{'@type':'WebSite','@id':origin+'/#website',name:'Format Blink',url:origin+'/'},
    {'@type':'Organization','@id':origin+'/#organization',name:'Format Blink',url:origin+'/',logo:origin+'/icon-192.png'}];
  if(path!=='/'){
    const parts=path.split('/').filter(Boolean);
    graph.push({'@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'Home',item:origin+'/'},...parts.map((_,i)=>{
      const p='/'+parts.slice(0,i+1).join('/');return {'@type':'ListItem',position:i+2,name:pageData(p,c).title,item:origin+p};
    })]});
  }
  graph.push({'@type':'WebPage',name:path==='/'?c.siteTitle:page.title,url:origin+path,isPartOf:{'@id':origin+'/#website'}});
  return JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c');
}
