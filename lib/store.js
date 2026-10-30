"use strict";
const fs=require('node:fs');
const path=require('node:path');
const TTL={codex:60000,openrouter:300000,telkomsel:300000,tri:300000};
class Store {
 constructor(sources,dir){this.sources=sources;this.dir=dir;this.state={};this.pending={};fs.mkdirSync(dir,{recursive:true});for(const key of Object.keys(TTL)){try{this.state[key]=JSON.parse(fs.readFileSync(path.join(dir,key+'.json'),'utf8'));}catch{this.state[key]={data:null,fetchedAt:null,error:null};}}}
 snapshot(){const now=Date.now();return {now,sources:Object.fromEntries(Object.entries(this.state).map(([key,s])=>[key,{...s,refreshing:!!this.pending[key],stale:!!s.error||!s.fetchedAt||now-s.fetchedAt>TTL[key]*2,refreshInterval:TTL[key]}]))};}
 refresh(key,force=false){
  if(!Object.hasOwn(TTL,key))return Promise.reject(new Error('Sumber tidak dikenal'));
  if(this.pending[key])return this.pending[key];
  const current=this.state[key];
  if(!force&&current.attemptedAt&&Date.now()-current.attemptedAt<TTL[key])return Promise.resolve(current);
  const work=(async()=>{current.attemptedAt=Date.now();try{const data=await this.sources[key]();this.state[key]={data,fetchedAt:Date.now(),attemptedAt:current.attemptedAt,error:null};}catch(e){this.state[key]={...current,error:String(e.message||e).slice(0,500)};}const file=path.join(this.dir,key+'.json');try{fs.writeFileSync(file+'.tmp',JSON.stringify(this.state[key]));fs.renameSync(file+'.tmp',file);}catch(e){this.state[key].error='Cache gagal disimpan: '+e.message;}return this.state[key];})();
  this.pending[key]=work;work.finally(()=>delete this.pending[key]);return work;
 }
 refreshAll(force=false){return Promise.all(Object.keys(TTL).map(k=>this.refresh(k,force)));}
}
module.exports={Store,TTL};
