import {defaultConfig,mergeConfig,type Config} from './config';

type PreparedStatement={
  bind:(...values:any[])=>PreparedStatement;
  first:<T=Record<string,unknown>>()=>Promise<T|null>;
  all:<T=Record<string,unknown>>()=>Promise<{results:T[]}>;
  run:()=>Promise<any>;
};

type DatabaseLike={
  prepare:(sql:string)=>PreparedStatement;
  batch:(statements:PreparedStatement[])=>Promise<any>;
};

function runtimeDatabase():DatabaseLike|null{
  const g=globalThis as any;
  const db=g.__FORMAT_BLINK_DB__||g.DB;
  return db&&typeof db.prepare==='function'?db:null;
}

export function database():DatabaseLike{
  const db=runtimeDatabase();
  if(!db)throw new Error('Persistent account/settings database is not configured on this deployment.');
  return db;
}

function withClipProcessor(config:Config):Config{
  const endpoint=process.env.CLIP_STUDIO_PROCESSOR_URL?.trim();
  if(config.processorUrl||!endpoint)return config;
  try{
    const url=new URL(endpoint);
    if(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))){
      return {...config,processorUrl:url.href.replace(/\/$/,'')};
    }
  }catch{ /* Keep the connection visibly unavailable for invalid endpoints. */ }
  return config;
}

export async function getConfig():Promise<Config>{
  const db=runtimeDatabase();
  if(db){
    try{
      const row=await db.prepare('SELECT value FROM settings WHERE id = ?').bind('site').first<{value:string}>();
      if(row?.value)return withClipProcessor(mergeConfig(JSON.parse(row.value)));
    }catch(error){
      console.error('Format Blink settings database is unavailable; using default settings.',error);
    }
  }

  const envValue=process.env.FORMAT_BLINK_CONFIG_JSON;
  if(envValue){
    try{return withClipProcessor(mergeConfig(JSON.parse(envValue)));}
    catch(error){console.error('FORMAT_BLINK_CONFIG_JSON is invalid; using default settings.',error);}
  }

  return withClipProcessor(structuredClone(defaultConfig));
}

export async function saveConfig(value:Config){
  const db=runtimeDatabase();
  if(!db)throw new Error('Persistent settings storage is not configured on this Vercel deployment.');
  await db.prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('site',JSON.stringify(value)).run();
}

export async function record(userId:string|null,name:string,detail:string){
  const db=runtimeDatabase();
  if(!db)return;
  await db.prepare('INSERT INTO activity(id,user_id,name,detail,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),userId,name,detail.slice(0,200),new Date().toISOString()).run();
}
