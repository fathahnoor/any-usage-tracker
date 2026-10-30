'use strict';
// Capture a separately rendered, masked page. No unredacted image is saved.
const fs=require('node:fs');const path=require('node:path');
const {Neo}=require('../lib/neo');
async function capture(){
 const neo=new Neo();let pageId;
 try{
  const pages=await neo.run('return await browser.pages.list();');
  const dashboard=pages.find(p=>p.url.startsWith('http://127.0.0.1:8792/'));
  if(!dashboard)throw new Error('Dashboard tab not found');
  await neo.tool('browser_target',{action:'set_window',windowId:dashboard.windowId,strict:true});
  pageId=await neo.run("const p=await browser.open('http://127.0.0.1:8792/');return p.id;");
  await neo.run(`const p=browser.page(${pageId});await p.cdp('Emulation.setDeviceMetricsOverride',JSON.stringify({width:755,height:1067,deviceScaleFactor:1,mobile:false}));const ready=await p.waitForText('Semua sumber tersinkron',{timeout:20000});if(!ready.matched)throw new Error('Dashboard not ready');return true;`);
  const safe=await neo.run(`return await browser.page(${pageId}).evaluate(async()=>{const original=window.fetch;const response=await original('/api/state');const state=await response.json();state.sources.codex.data.account.email='a***@example.com';for(const key of ['telkomsel','tri'])state.sources[key].data.phone='08•• •••• ••••';for(const s of Object.values(state.sources))s.fetchedAt+=1;window.fetch=async function(input,...args){if(String(input)==='/api/state')return new Response(JSON.stringify(state),{status:200,headers:{'Content-Type':'application/json'}});return original.call(this,input,...args);};window.updateState(state);document.querySelector('.account-email').textContent='a***@example.com';document.querySelectorAll('.phone-number').forEach(e=>e.textContent='08•• •••• ••••');return {emailMasked:document.querySelector('.account-email').textContent==='a***@example.com',phonesMasked:[...document.querySelectorAll('.phone-number')].every(e=>e.textContent==='08•• •••• ••••')};});`);
  const check=Neo.value(safe);if(!check.emailMasked||!check.phonesMasked)throw new Error('Masking check failed');
  const assets=Neo.value(await neo.run(`return await browser.page(${pageId}).evaluate(async()=>{const images=[...document.querySelectorAll('.service-icon img')];await Promise.all(images.map(img=>img.decode()));return {logos:images.length,loaded:images.every(img=>img.naturalWidth>0),noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth,noVerticalOverflow:document.documentElement.scrollHeight<=innerHeight};});`));
  if(assets.logos!==4||!assets.loaded||!assets.noHorizontalOverflow||!assets.noVerticalOverflow)throw new Error('Public screenshot layout or assets invalid');
  const result=await neo.rpc('tools/call',{name:'screenshot',arguments:{page:pageId,format:'png',fullPage:true,...(neo.logicalSession?{session:neo.logicalSession}:{})}});
  const img=result.content?.find(c=>c.type==='image');if(!img?.data)throw new Error('Screenshot image not returned');
  const file=path.join(__dirname,'..','docs','images','dashboard-redacted.png');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.from(img.data,'base64'));
  console.log(JSON.stringify({saved:'docs/images/dashboard-redacted.png',emailMasked:true,phonesMasked:true}));
 }finally{if(pageId)try{await neo.run(`const p=browser.page(${pageId});await p.cdp('Emulation.clearDeviceMetricsOverride','{}');await p.close();return true;`);}catch{}}
}
capture().catch(()=>{console.error('Public screenshot capture failed; no account data logged');process.exitCode=1;});
