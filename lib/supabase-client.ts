'use client';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const storageKey='format-blink-supabase-session';

type Session={access_token:string;refresh_token?:string;expires_in?:number;expires_at?:number;user?:any};

function ready(){if(!url||!key)throw new Error('Supabase is not configured on this deployment.');}
export function getSession():Session|null{
  if(typeof window==='undefined')return null;
  try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch{return null}
}
export function setSession(s:Session|null){
  if(typeof window==='undefined')return;
  if(s)localStorage.setItem(storageKey,JSON.stringify(s));else localStorage.removeItem(storageKey);
}
async function auth(path:string,body:any){
  ready();
  const r=await fetch(url+path,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d:any=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.msg||d.error_description||d.message||'Authentication failed.');
  return d;
}
export async function signIn(email:string,password:string){
  const d=await auth('/auth/v1/token?grant_type=password',{email,password});
  setSession(d);
  return d;
}
export async function signUp(email:string,password:string,name:string){
  const d=await auth('/auth/v1/signup',{email,password,data:{name}});
  if(d.access_token)setSession(d);
  return d;
}
async function refresh(){
  const s=getSession();
  if(!s?.refresh_token)return null;
  try{
    const d=await auth('/auth/v1/token?grant_type=refresh_token',{refresh_token:s.refresh_token});
    setSession(d);
    return d;
  }catch{
    setSession(null);
    return null;
  }
}
export async function apiFetch(input:RequestInfo|URL,init:RequestInit={},retry=true){
  let s=getSession();
  const headers=new Headers(init.headers||{});
  if(s?.access_token)headers.set('Authorization','Bearer '+s.access_token);
  let r=await fetch(input,{...init,headers});
  if(r.status===401&&retry&&s?.refresh_token){
    s=await refresh();
    if(s?.access_token){
      headers.set('Authorization','Bearer '+s.access_token);
      r=await fetch(input,{...init,headers});
    }
  }
  return r;
}
export async function signOut(){
  const s=getSession();
  if(s?.access_token&&url&&key){
    await fetch(url+'/auth/v1/logout',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+s.access_token}}).catch(()=>{});
  }
  setSession(null);
}
