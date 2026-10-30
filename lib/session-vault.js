'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const PROVIDERS=new Set(['openrouter','telkomsel','tri']);
function windowsCrypto(mode,input){
 return new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'..','tools','session-crypto.ps1'),'-Mode',mode],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  let output='';let settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve(value);};
  const timer=setTimeout(()=>{child.kill();finish(new Error('Penyimpanan sesi Windows timeout'));},15000);
  child.on('error',()=>finish(new Error('Penyimpanan sesi Windows tidak tersedia')));
  child.stdout.on('data',b=>{output+=b;});
  child.stderr.on('data',()=>{});
  child.on('close',code=>{if(code!==0)return finish(new Error('Sesi tidak dapat dibuka oleh akun Windows ini'));try{finish(null,Buffer.from(output.trim(),'base64'));}catch{finish(new Error('Format sesi Windows tidak valid'));}});
  child.stdin.on('error',()=>{});child.stdin.end(Buffer.from(input).toString('base64'));
 });
}
class SessionVault {
 constructor({file=path.join(__dirname,'..','data','sessions.dpapi'),crypto=windowsCrypto}={}){this.file=file;this.crypto=crypto;this.sessions=null;this.queue=Promise.resolve();}
 async load(){if(this.sessions)return this.sessions;try{const encrypted=fs.readFileSync(this.file);const plain=await this.crypto('unprotect',encrypted);this.sessions=JSON.parse(plain.toString('utf8'));}catch(e){if(e.code==='ENOENT')this.sessions={};else throw new Error('Sesi terenkripsi belum dapat dibuka. Hubungkan ulang akun.');}return this.sessions;}
 async get(provider){this.validate(provider);return (await this.load())[provider]||null;}
 async set(provider,data){this.validate(provider);const work=this.queue.then(async()=>{const sessions=await this.load();sessions[provider]=data;const bytes=await this.crypto('protect',Buffer.from(JSON.stringify(sessions)));fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file+'.tmp',bytes);fs.renameSync(this.file+'.tmp',this.file);});this.queue=work.catch(()=>{});return work;}
 async status(){const sessions=await this.load();return Object.fromEntries([...PROVIDERS].map(p=>[p,{connected:!!sessions[p],updatedAt:sessions[p]?.updatedAt||null}]));}
 validate(provider){if(!PROVIDERS.has(provider))throw new Error('Sumber sesi tidak dikenal');}
}
module.exports={SessionVault,windowsCrypto};
