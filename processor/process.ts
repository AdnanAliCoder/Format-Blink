import { spawn } from "node:child_process";
export function run(cmd:string,args:string[],opts:any={}):Promise<{stdout:string,stderr:string}>{
  return new Promise((resolve,reject)=>{
    const p=spawn(cmd,args,{...opts});
    let stdout="",stderr="";
    p.stdout?.on("data",d=>stdout+=d.toString());
    p.stderr?.on("data",d=>stderr+=d.toString());
    p.on("error",reject);
    p.on("close",code=>code===0?resolve({stdout,stderr}):reject(new Error(stderr||`${cmd} exited with ${code}`)));
  })
}
