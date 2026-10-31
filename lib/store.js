"use strict";
const fs=require('node:fs');
const path=require('node:path');
const TTL={codex:60000,openrouter:300000,telkomsel:300000,tri:300000};
class Store {
 constructor(sources,dir){this.sources=sources;this.dir=dir;this.state={};this.pending={};fs.mkdirSync(dir,{recursive:true});for(const key of Object.keys(TTL)){try{this.state[key]=JSON.parse(fs.readFileSync(path.join(dir,key+'.json'),'utf8'));}catch{this.state[key]={data:null,fetchedAt:null,error:null};}}try{this.codexHistory=JSON.parse(fs.readFileSync(path.join(dir,'codex-history.json'),'utf8'));if(!Array.isArray(this.codexHistory))throw new Error('Invalid history');}catch{this.codexHistory=[];}}
 snapshot(){const now=Date.now();return {now,codexHistory:this.codexHistory,sources:Object.fromEntries(Object.entries(this.state).map(([key,s])=>[key,{...s,refreshing:!!this.pending[key],stale:!!s.error||!s.fetchedAt||now-s.fetchedAt>TTL[key]*2,refreshInterval:TTL[key]}]))};}
 recordCodex(data,at){
  const email=data?.account?.email,rl=data?.data?.rateLimits;
  if(!data?.historyAccountVerified||typeof email!=='string'||!email.trim()||!rl)return;
  const window=w=>w&&Number.isFinite(w.usedPercent)&&w.usedPercent>=0&&w.usedPercent<=100?{remaining:100-w.usedPercent,resetsAt:Number.isFinite(w.resetsAt)?w.resetsAt:null}:null;
  const primary=window(rl.primary),secondary=window(rl.secondary);if(!primary&&!secondary)return;
  const entry={account:email.trim(),observedAt:at,primary,secondary};
  const previous=[...this.codexHistory].reverse().find(x=>x.account.toLowerCase()===entry.account.toLowerCase());
  if(previous&&JSON.stringify([previous.primary,previous.secondary])===JSON.stringify([primary,secondary]))return;
  const next=[...this.codexHistory,entry],file=path.join(this.dir,'codex-history.json');
  fs.writeFileSync(file+'.tmp',JSON.stringify(next));fs.renameSync(file+'.tmp',file);this.codexHistory=next;
 }
 refresh(key,force=false){
  if(!Object.hasOwn(TTL,key))return Promise.reject(new Error('Sumber tidak dikenal'));
  if(this.pending[key])return this.pending[key];
  const current=this.state[key];
  if(!force&&current.attemptedAt&&Date.now()-current.attemptedAt<TTL[key])return Promise.resolve(current);
  const work=(async()=>{current.attemptedAt=Date.now();try{const data=await this.sources[key]();const fetchedAt=Date.now();this.state[key]={data,fetchedAt,attemptedAt:current.attemptedAt,error:null};if(key==='codex')try{if(!data.historyAccountVerified||!data.account?.email)this.state[key].historyError='Identitas akun belum terverifikasi, riwayat tidak dicatat.';else this.recordCodex(data,fetchedAt);}catch(e){this.state[key].historyError='Riwayat gagal disimpan: '+e.message;}}catch(e){this.state[key]={...current,error:String(e.message||e).slice(0,500)};}const file=path.join(this.dir,key+'.json');try{fs.writeFileSync(file+'.tmp',JSON.stringify(this.state[key]));fs.renameSync(file+'.tmp',file);}catch(e){this.state[key].error='Cache gagal disimpan: '+e.message;}return this.state[key];})();
  this.pending[key]=work;work.finally(()=>delete this.pending[key]);return work;
 }
 refreshAll(force=false){return Promise.all(Object.keys(TTL).map(k=>this.refresh(k,force)));}
}
module.exports={Store,TTL};
