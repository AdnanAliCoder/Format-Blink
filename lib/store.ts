import {defaultConfig,mergeConfig,type Config} from './config';
import {rest} from './supabase';

function validProcessor(value:string|undefined){
  const endpoint=value?.trim();if(!endpoint)return '';
  try{const u=new URL(endpoint);if(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))return u.href.replace(/\/$/,'');}catch{}
  return '';
}
function withProcessors(config:Config):Config{
  const clip=config.processorUrl||validProcessor(process.env.CLIP_STUDIO_PROCESSOR_URL);
  const tools=config.toolsProcessorUrl||validProcessor(process.env.FORMAT_BLINK_TOOLS_PROCESSOR_URL)||validProcessor(process.env.TOOLS_PROCESSOR_URL);
  return clip===config.processorUrl&&tools===config.toolsProcessorUrl?config:{...config,processorUrl:clip,toolsProcessorUrl:tools};
}

export async function getConfig():Promise<Config>{
  try{
    const r=await rest('settings?id=eq.site&select=value&limit=1');
    if(r.ok){
      const rows:any[]=await r.json();
      if(rows[0]?.value)return withProcessors(mergeConfig(rows[0].value));
    }
  }catch(error){
    console.error('Format Blink settings database is unavailable; using defaults.',error);
  }

  const envValue=process.env.FORMAT_BLINK_CONFIG_JSON;
  if(envValue){
    try{return withProcessors(mergeConfig(JSON.parse(envValue)))}catch{}
  }

  return withProcessors(structuredClone(defaultConfig));
}

export async function saveConfig(value:Config,token:string){
  const r=await rest(
    'settings?id=eq.site',
    {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({value,updated_at:new Date().toISOString()})},
    token
  );
  if(!r.ok)throw new Error('Could not save settings to Supabase.');
}
