'use strict';
// No browser/MCP import here. This verifies the production direct HTTP path.
const {SessionVault}=require('../lib/session-vault');
const {readOpenRouterDirect}=require('../lib/direct-openrouter');
const {readTelkomsel}=require('../lib/direct-telkomsel');
const {DirectTri,sessionFromStorage}=require('../lib/direct-tri');
async function verify(){
 const vault=new SessionVault(),results={};
 for(const key of ['openrouter','telkomsel','tri']){
  const trace=[];
  const fetchImpl=async(url,options)=>{const response=await fetch(url,options);const u=new URL(url);trace.push({host:u.hostname,path:u.pathname.replace(/\/sessions\/[^/]+\//,'/sessions/[redacted]/'),status:response.status});return response;};
  try{
   const session=await vault.get(key);
   const saveSession=s=>vault.set(key,{...s,updatedAt:Date.now()});
   const data=key==='openrouter'?await readOpenRouterDirect({session,fetchImpl,saveSession}):key==='telkomsel'?await readTelkomsel(session,{fetchImpl,saveSession}):await new DirectTri({getSession:async()=>session?.storage?sessionFromStorage(session.storage):session,fetchImpl}).read();
   results[key]={ok:true,spend:data.totalSpend,tokens:data.totalTokens,requests:data.totalRequests,balance:data.balance,summary:data.summary||data.summaryText,packages:data.packages?.map(p=>({name:p.name,remaining:p.remaining,unit:p.unit,total:p.total,expiry:p.expiry})),trace};
  }catch(e){results[key]={ok:false,error:e.message,trace};}
 }
 return results;
}
if(require.main===module)verify().then(results=>{console.log(JSON.stringify(results));if(Object.values(results).some(r=>!r.ok))process.exitCode=1;}).catch(()=>{console.error('Verifikasi API gagal tanpa mencatat credential');process.exitCode=1;});
module.exports={verify};
