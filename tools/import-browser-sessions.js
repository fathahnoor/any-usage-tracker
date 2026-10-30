'use strict';
// One-time, user-authorized local migration. Never print session values.
const {Neo}=require('../lib/neo');
const {SessionVault}=require('../lib/session-vault');
const PROFILES={
 openrouter:{host:'openrouter.ai',urls:['https://openrouter.ai/','https://clerk.openrouter.ai/']},
 telkomsel:{host:'www.telkomsel.com',urls:['https://www.telkomsel.com/']},
 tri:{host:'bimatri.ioh.co.id',urls:['https://bimatri.ioh.co.id/']},
};
function unwrap(value){return Neo.value(value);}
async function importSessions({probe=false,providers=Object.keys(PROFILES)}={}){
 const neo=new Neo(),vault=new SessionVault();
 const pages=await neo.run('return await browser.pages.list();');
 const results={};
 for(const provider of providers){
  const profile=PROFILES[provider];
  if(!profile)throw new Error('Unknown provider');
  const page=pages.filter(p=>{try{return new URL(p.url).hostname===profile.host&&(provider!=='openrouter'||new URL(p.url).pathname.startsWith('/activity'));}catch{return false;}}).sort((a,b)=>b.pageId-a.pageId)[0];
  if(!page){results[provider]={ok:false,reason:'Halaman login sumber tidak tersedia untuk migrasi pertama'};continue;}
  try{
   if(probe){
    const shape=await neo.run(`const p=browser.page(${page.pageId});const r=await p.cdp('Network.getCookies',JSON.stringify({urls:${JSON.stringify(profile.urls)}}));return {keys:Object.keys(r),cookieCount:r.cookies?.length,cookieNames:r.cookies?.map(c=>c.name)};`);
    results[provider]={ok:true,shape};continue;
   }
   let session;
   if(provider==='tri'){
    const storage=unwrap(await neo.run(`return await browser.page(${page.pageId}).evaluate(()=>Object.fromEntries(['b-X-IMI-TOKEN','b-FINGERPRINT','b-MSISDN','b-MSISDNCHILD','b-LANG','b-FIREBASE_INSTALLATION_ID'].map(k=>[k,localStorage.getItem(k)])));`));
    // Raw selected values are retained encrypted. The provider adapter decodes them.
    session={storage};
   }else{
    const cookieResult=await neo.run(`return await browser.page(${page.pageId}).cdp('Network.getCookies',JSON.stringify({urls:${JSON.stringify(profile.urls)}}));`);
    const cookies=cookieResult.cookies;
    if(!Array.isArray(cookies)||!cookies.length)throw new Error('Cookie migration unavailable');
    if(provider==='openrouter'){
     const account=unwrap(await neo.run(`return await browser.page(${page.pageId}).evaluate(async()=>({sessionId:window.Clerk?.session?.id,sessionToken:await window.Clerk?.session?.getToken({skipCache:true}),organizationId:window.Clerk?.session?.lastActiveOrganizationId||null,userAgent:navigator.userAgent}));`));
     if(!account.sessionId||!account.sessionToken)throw new Error('Session unavailable');
     session={...account,cookies};
    }else{
     const account=unwrap(await neo.run(`return await browser.page(${page.pageId}).evaluate(()=>({deviceId:localStorage.getItem('deviceId'),userAgent:navigator.userAgent}));`));
     if(!account.deviceId)throw new Error('Device session unavailable');
     session={...account,cookies};
    }
   }
   session.updatedAt=Date.now();
   await vault.set(provider,session);
   results[provider]={ok:true,encrypted:true};
  }catch{results[provider]={ok:false,reason:'Migrasi sesi belum berhasil; nilai credential tidak dicatat'};}
 }
 return results;
}
if(require.main===module)importSessions({probe:process.argv.includes('--probe')}).then(result=>{console.log(JSON.stringify(result));if(Object.values(result).some(s=>!s.ok))process.exitCode=1;}).catch(()=>{console.error('Migrasi sesi gagal; nilai credential tidak dicatat');process.exitCode=1;});
module.exports={importSessions};
