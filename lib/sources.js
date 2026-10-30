'use strict';
const {SessionVault}=require('./session-vault');
const {readRateLimits,accountInfo}=require('./codex');
const {readOpenRouterDirect}=require('./direct-openrouter');
const {readTelkomsel}=require('./direct-telkomsel');
const {DirectTri,sessionFromStorage}=require('./direct-tri');
class Sources {
 constructor({vault=new SessionVault(),fetchImpl=globalThis.fetch}={}) {
  this.vault=vault;this.fetch=fetchImpl;
 }
 async codex(){const data=await readRateLimits();const account=accountInfo();return {data,account:{email:account.email,planType:account.planType}};}
 async session(provider){const session=await this.vault.get(provider);if(!session)throw new Error('Sesi '+provider+' belum dihubungkan. Jalankan migrasi sesi satu kali.');return session;}
 save(provider){return session=>this.vault.set(provider,{...session,updatedAt:Date.now()});}
 async openrouter(){return readOpenRouterDirect({session:await this.session('openrouter'),fetchImpl:this.fetch,saveSession:this.save('openrouter')});}
 async telkomsel(){return readTelkomsel(await this.session('telkomsel'),{fetchImpl:this.fetch,saveSession:this.save('telkomsel')});}
 async tri(){const session=await this.session('tri');return new DirectTri({getSession:async()=>session.storage?sessionFromStorage(session.storage):session,fetchImpl:this.fetch}).read();}
}
module.exports={Sources};
