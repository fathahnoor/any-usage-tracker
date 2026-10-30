'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const exec=promisify(execFile);
const TITLE='NEXUS Background Sync';
class BackgroundBrowser {
 constructor(neo,options={}) {
  this.neo=neo;
  this.file=options.file||path.join(__dirname,'..','..','data','browser-window.json');
  this.minimize=options.minimize||(()=>exec('powershell.exe',['-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'Minimize-SyncWindow.ps1')],{windowsHide:true,timeout:15000}));
  try{this.windowId=JSON.parse(fs.readFileSync(this.file,'utf8')).windowId;}catch{this.windowId=null;}
 }
 async ensure() {
  const inventory=await this.neo.run("return await browser.windows({action:'list'});");
  const exists=inventory.windows?.some(w=>w.windowId===this.windowId);
  let created=false;
  if(!exists){
   const result=await this.neo.run("return await browser.windows({action:'create'});");
   this.windowId=result.window?.windowId;
   if(!this.windowId)throw new Error('Jendela sinkronisasi tidak dapat dibuat');
   created=true;
  }
  await this.neo.tool('browser_target',{action:'set_window',windowId:this.windowId,strict:true});
  await this.neo.run(`const pages=await browser.pages.list();const marker=pages.find(p=>p.title===${JSON.stringify(TITLE)}||p.url==='about:blank'||p.url==='chrome://newtab/');if(!marker)throw new Error('Tab penanda jendela sinkronisasi tidak ditemukan');await browser.page(marker.pageId).evaluate(()=>{document.title=${JSON.stringify(TITLE)};document.body.textContent='NEXUS: jendela sinkronisasi latar belakang. Biarkan diminimalkan selama pemantauan aktif.';});return true;`);
  await this.minimize();
  if(created){fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file,JSON.stringify({windowId:this.windowId}));}
  return this.windowId;
 }
}
module.exports={BackgroundBrowser};
