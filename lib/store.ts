import {defaultConfig,mergeConfig,type Config} from './config';
import {rest} from './supabase';

function withClipProcessor(config:Config):Config{
  const endpoint=process.env.CLIP_STUDIO_PROCESSOR_URL?.trim();
  if(config.processorUrl||!endpoint)return config;
  try{
    const u=new URL(endpoint);
    if(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))){
      return {...config,processorUrl:u.href.replace(/\/$/,'')};
    }
  }catch{}
  return config;
}

export async function getConfig():Promise<Config>{
  try{
    const r=await rest('settings?id=eq.site&select=value&limit=1');
    if(r.ok){
      const rows:any[]=await r.json();
      if(rows[0]?.value)return withClipProcessor(mergeConfig(rows[0].value));
    }
  }catch(error){
    console.error('Format Blink settings database is unavailable; using defaults.',error);
  }

  const envValue=process.env.FORMAT_BLINK_CONFIG_JSON;
  if(envValue){
    try{return withClipProcessor(mergeConfig(JSON.parse(envValue)))}catch{}
  }

  return withClipProcessor(structuredClone(defaultConfig));
}

export async function saveConfig(value:Config,token:string){
  const r=await rest(
    'settings?id=eq.site',
    {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({value,updated_at:new Date().toISOString()})},
    token
  );
  if(!r.ok)throw new Error('Could not save settings to Supabase.');
}
