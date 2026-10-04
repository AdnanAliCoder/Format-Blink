import {authContext,insertActivity,listAdminData,rest,touchLogin} from '@/lib/supabase';
import {getConfig,saveConfig} from '@/lib/store';
import {mergeConfig,slotNames} from '@/lib/config';
import {pagePaths} from '@/lib/pages';

const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function sameOrigin(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin}

export async function GET(request:Request){
  try{
    const ctx=await authContext(request);
    if(new URL(request.url).searchParams.get('view')==='admin'){
      if(!ctx||ctx.profile.role!=='admin')return json({error:'Administrator sign-in required.'},403);
      const data=await listAdminData(ctx.token);
      return json({user:ctx.profile,config:await getConfig(),users:data.users,activity:data.activity});
    }
    return json({user:ctx?.profile||null});
  }catch(e){
    console.error(e);
    return json({error:'The account service is temporarily unavailable. Please try again.'},503);
  }
}

export async function POST(request:Request){
  try{
    if(!sameOrigin(request))return json({error:'Invalid request origin.'},403);
    if(Number(request.headers.get('content-length')||0)>1500000)return json({error:'This request is too large.'},413);
    const b:any=await request.json();

    if(b.action==='logout')return json({ok:true});

    const ctx=await authContext(request);
    if(!ctx)return json({error:'Please sign in.'},401);

    if(b.action==='login-seen'){
      await touchLogin(ctx);
      await insertActivity(ctx.token,ctx.profile.id,'Login',ctx.profile.email);
      return json({user:ctx.profile});
    }

    if(b.action==='activity'){
      if(!pagePaths().includes(String(b.path)))return json({error:'Unknown page.'},400);
      await insertActivity(ctx.token,ctx.profile.id,'Tool completed',String(b.path));
      return json({ok:true});
    }

    if(ctx.profile.role!=='admin')return json({error:'Administrator access required.'},403);

    if(b.action==='save'){
      const c=mergeConfig(b.config||{});
      const safeUrl=(v:string)=>{
        if(!v)return '';
        const u=new URL(v);
        if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw new Error('Use an HTTPS URL.');
        return u.href.replace(/\/$/,'');
      };
      c.siteUrl=safeUrl(c.siteUrl);
      c.processorUrl=safeUrl(c.processorUrl);
      c.toolsProcessorUrl=safeUrl(c.toolsProcessorUrl);
      if(!c.siteUrl)throw new Error('Enter the website URL.');
      if(c.adClient&&!/^ca-pub-\d{16}$/.test(c.adClient))throw new Error('AdSense publisher ID must be ca-pub- followed by 16 digits.');
      if(c.measurementId&&!/^G-[A-Z0-9]+$/.test(c.measurementId))throw new Error('Analytics ID must start with G-.');
      if(c.analyticsEnabled&&!c.measurementId)throw new Error('Add an Analytics ID first.');
      c.socials=c.socials.map(s=>({...s,url:safeUrl(s.url)}));
      c.uploadLimit=Math.min(200,Math.max(5,Number(c.uploadLimit)||100));
      for(const k of slotNames){
        const a=c.ads[k];
        a.sponsorUrl=safeUrl(a.sponsorUrl);
        a.sponsorImage=safeUrl(a.sponsorImage);
      }
      if(JSON.stringify(c).length>1200000)throw new Error('Settings are too large.');
      await saveConfig(c,ctx.token);
      await insertActivity(ctx.token,ctx.profile.id,'Settings saved','Website settings updated');
      return json({ok:true,config:c});
    }

    if(b.action==='user-status'){
      if(b.id===ctx.profile.id)throw new Error('You cannot suspend your own administrator account.');
      if(!['active','suspended'].includes(b.status))throw new Error('Invalid status.');
      const r=await rest(
        'profiles?id=eq.'+encodeURIComponent(String(b.id)),
        {method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:b.status})},
        ctx.token
      );
      if(!r.ok)throw new Error('Could not update account.');
      await insertActivity(ctx.token,ctx.profile.id,'Account updated',String(b.id));
      return json({ok:true});
    }

    if(b.action==='user-delete'){
      if(b.id===ctx.profile.id)throw new Error('You cannot delete your own administrator profile.');
      const r=await rest(
        'profiles?id=eq.'+encodeURIComponent(String(b.id)),
        {method:'DELETE',headers:{Prefer:'return=minimal'}},
        ctx.token
      );
      if(!r.ok)throw new Error('Could not delete account profile.');
      await insertActivity(ctx.token,ctx.profile.id,'Account deleted',String(b.id));
      return json({ok:true});
    }

    return json({error:'Unknown action.'},400);
  }catch(e){
    console.error(e);
    return json({error:e instanceof Error?e.message:'The request could not be completed.'},400);
  }
}
