const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export type Profile={id:string;email:string;name:string;role:'admin'|'member';status:'active'|'suspended';created_at:string;last_login:string|null};

function configured(){if(!url||!key)throw new Error('Supabase is not configured on this deployment.')}
function bearer(request:Request){const h=request.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7):''}

export async function rest(path:string,init:RequestInit={},token=''){
  configured();
  const headers=new Headers(init.headers||{});
  headers.set('apikey',key);
  headers.set('Authorization','Bearer '+(token||key));
  if(init.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  return fetch(url+'/rest/v1/'+path,{...init,headers,cache:'no-store'});
}

export async function authContext(request:Request):Promise<{token:string;profile:Profile}|null>{
  const token=bearer(request);
  if(!token)return null;
  configured();
  const u=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},cache:'no-store'});
  if(!u.ok)return null;
  const user:any=await u.json();
  const p=await rest('profiles?id=eq.'+encodeURIComponent(user.id)+'&select=id,email,name,role,status,created_at,last_login&limit=1',{},token);
  if(!p.ok)return null;
  const rows:any[]=await p.json();
  const profile=rows[0] as Profile|undefined;
  if(!profile||profile.status!=='active')return null;
  return {token,profile};
}

export async function touchLogin(ctx:{token:string;profile:Profile}){
  await rest(
    'profiles?id=eq.'+encodeURIComponent(ctx.profile.id),
    {method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({last_login:new Date().toISOString()})},
    ctx.token
  );
}

export async function insertActivity(token:string,userId:string|null,name:string,detail:string){
  const r=await rest(
    'activity',
    {method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:userId,name,detail:detail.slice(0,200)})},
    token
  );
  if(!r.ok)console.error('Activity insert failed',await r.text());
}

export async function listAdminData(token:string){
  const [u,a]=await Promise.all([
    rest('profiles?select=id,email,name,role,status,created_at,last_login&order=created_at.desc&limit=500',{},token),
    rest('activity?select=id,user_id,name,detail,created_at&order=created_at.desc&limit=500',{},token),
  ]);
  if(!u.ok||!a.ok)throw new Error('Could not load admin data.');
  return {users:await u.json(),activity:await a.json()};
}
