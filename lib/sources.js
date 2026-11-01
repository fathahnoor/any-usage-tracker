'use strict';
const {SessionVault}=require('./session-vault');
const {readRateLimits,accountInfo}=require('./codex');
const {readOpenRouterDirect}=require('./direct-openrouter');
const {readTelkomsel}=require('./direct-telkomsel');
const {DirectTri,sessionFromStorage}=require('./direct-tri');
const {importSessions}=require('../tools/import-browser-sessions');
class Sources {
 constructor({vault=new SessionVault(),fetchImpl=globalThis.fetch,importer=importSessions}={}) {
  this.vault=vault;this.fetch=fetchImpl;this.importer=importer;
 }
 async reconnect(provider){
  if(!['openrouter','telkomsel','tri'].includes(provider))throw new Error('Sumber sesi tidak dikenal');
  let data;
  let result;
  try{
   result=await this.importer({providers:[provider],vault:this.vault,validateSession:async(key,session)=>{
    let candidate=session;
    const client=new Sources({fetchImpl:this.fetch,vault:{get:async()=>candidate,set:async(p,s)=>{candidate=s;}}});
    data=await client[key]();
    return candidate;
   }});
  }catch{throw new Error('BrowserOS neo belum dapat dihubungi. Buka BrowserOS neo dan aktifkan koneksi MCP, lalu coba lagi.');}
  if(!result[provider]?.ok)throw new Error(result[provider]?.reason||'Sesi belum dapat dihubungkan. Coba login ulang.');
  return data;
 }
 async codex(){const before=accountInfo();const data=await readRateLimits();const account=accountInfo();const sameAccount=before.accountId&&before.accountId===account.accountId&&before.accountId===data.accountId&&before.email===account.email;return {data,account:{email:account.email,planType:account.planType},historyAccountVerified:!!sameAccount};}
 async session(provider){const session=await this.vault.get(provider);if(!session)throw new Error('Sesi '+provider+' belum dihubungkan. Klik Hubungkan ulang pada kartu akun.');return session;}
 save(provider){return session=>this.vault.set(provider,{...session,updatedAt:Date.now()});}
 async openrouter(){return readOpenRouterDirect({session:await this.session('openrouter'),fetchImpl:this.fetch,saveSession:this.save('openrouter')});}
 async telkomsel(){return readTelkomsel(await this.session('telkomsel'),{fetchImpl:this.fetch,saveSession:this.save('telkomsel')});}
 async tri(){const session=await this.session('tri');return new DirectTri({getSession:async()=>session.storage?sessionFromStorage(session.storage):session,fetchImpl:this.fetch}).read();}
}
module.exports={Sources};
