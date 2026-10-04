import {SITE} from './site';
export const slotNames=['HOME_TOP','HOME_MID','HOME_BOTTOM','CATEGORY_TOP','CATEGORY_MID','TOOL_TOP','TOOL_MID','TOOL_BOTTOM','DESKTOP_LEFT','DESKTOP_RIGHT','FOOTER_AD'] as const;
export type AdSlot={enabled:boolean;mode:'preview'|'adsense'|'sponsor';slotId:string;sponsorName:string;sponsorImage:string;sponsorUrl:string};
export type PageEdit={title:string;description:string;content:string};
export type HeroVisual={mainImage:string;satellites:string[]};
export type Config={siteUrl:string;siteTitle:string;description:string;email:string;heroTitle:string;heroSubtitle:string;announcement:string;footerDescription:string;footerNote:string;adClient:string;analyticsEnabled:boolean;measurementId:string;verificationFileName:string;verificationFileContent:string;verificationToken:string;processorUrl:string;toolsProcessorUrl:string;uploadLimit:number;authVisualImage:string;heroVisuals:Record<string,HeroVisual>;socials:{name:string;url:string;enabled:boolean}[];ads:Record<string,AdSlot>;pages:Record<string,PageEdit>;events:{id:string;title:string;date:string;description:string;enabled:boolean}[];pinnedTools:string[]};
const defaultHeroVisuals:Record<string,HeroVisual>={
  file:{mainImage:'/pdf-tools-hero.webp',satellites:['scissors','image','layers','rotate','hash','type']},
  image:{mainImage:'/image-tools-hero.webp',satellites:['rotate','resize','file','settings','crop','code']},
  video:{mainImage:'/video-tools-hero.webp',satellites:['scissors','crop','music','layers','settings','image']},
  clip:{mainImage:'/clip-tools-hero.webp',satellites:['scissors','type','music','image','crop','hash']}
};
export const defaultConfig:Config={siteUrl:SITE.defaultUrl,siteTitle:SITE.siteTitle,description:SITE.description,email:SITE.defaultEmail,heroTitle:'Every format. One place.',heroSubtitle:'Convert, organize and create with simple tools for PDFs, images, videos and clips.',announcement:'',footerDescription:'Make more of your files. All the tools you need for PDFs, images, videos and clips, together in one place.',footerNote:'',adClient:'',analyticsEnabled:false,measurementId:'',verificationFileName:'',verificationFileContent:'',verificationToken:'',processorUrl:'',toolsProcessorUrl:'',uploadLimit:100,authVisualImage:'/image-tools-hero.webp',heroVisuals:defaultHeroVisuals,socials:['Facebook','Instagram','YouTube','TikTok','X','WhatsApp','LinkedIn'].map(name=>({name,url:'',enabled:false})),ads:Object.fromEntries(slotNames.map(s=>[s,{enabled:false,mode:'preview',slotId:'',sponsorName:'',sponsorImage:'',sponsorUrl:''}])),pages:{},events:[],pinnedTools:['merge-pdf','split-pdf','pdf-to-jpg','jpg-to-pdf','jpg-to-png','png-to-jpg','compress-image','resize-image','mov-to-mp4','mp4-to-mp3','trim-video','compress-video','extract-audio']};
export function mergeConfig(raw:Partial<Config>):Config{
  const heroVisuals:Record<string,HeroVisual>={};
  for(const [key,value] of Object.entries(defaultHeroVisuals)){
    const incoming=raw.heroVisuals?.[key];
    heroVisuals[key]={...value,...incoming,satellites:incoming?.satellites?.length?incoming.satellites:value.satellites};
  }
  return {...defaultConfig,...raw,heroVisuals,ads:{...defaultConfig.ads,...raw.ads},pages:raw.pages||{},socials:raw.socials||defaultConfig.socials,events:raw.events||[],pinnedTools:Array.isArray(raw.pinnedTools)?raw.pinnedTools:defaultConfig.pinnedTools}
}
