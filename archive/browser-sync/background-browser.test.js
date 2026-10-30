const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {BackgroundBrowser}=require('./background-browser');
test('sinkronisasi dipin ke jendela khusus sebelum membaca halaman dan memakai ulang jendela',async()=>{
 const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'nexus-window-')),'window.json');
 const calls=[];let windows=[];let minimized=0;
 const neo={tool:async(name,args)=>{calls.push([name,args]);return {};},run:async code=>{calls.push(['run',code]);if(code.includes("action:'list'"))return {windows};if(code.includes("action:'create'")){windows=[{windowId:77}];return {window:{windowId:77}};}return true;}};
 const b=new BackgroundBrowser(neo,{file,minimize:async()=>{minimized++;}});
 assert.equal(await b.ensure(),77);assert.equal(await b.ensure(),77);
 assert.equal(calls.filter(([name,args])=>name==='run'&&args.includes("action:'create'")).length,1);
 assert.equal(calls.findIndex(([name])=>name==='browser_target')<calls.findIndex(([name,args])=>name==='run'&&args.includes('document.title')),true);
 assert.deepEqual(calls.find(([name])=>name==='browser_target')[1],{action:'set_window',windowId:77,strict:true});
 assert.equal(minimized,2);assert.equal(JSON.parse(fs.readFileSync(file)).windowId,77);
 const restarted=new BackgroundBrowser(neo,{file,minimize:async()=>{}});assert.equal(await restarted.ensure(),77);
});
test('gagal membuat jendela khusus menghentikan pembacaan tanpa fallback ke jendela utama',async()=>{
 let ran=false;const neo={tool:async()=>{},run:async code=>{if(code.includes("action:'list'"))return {windows:[]};if(code.includes("action:'create'"))return {};ran=true;}};
 const b=new BackgroundBrowser(neo,{file:path.join(os.tmpdir(),'nexus-missing-'+Date.now()+'.json'),minimize:async()=>{}});
 await assert.rejects(b.ensure(),/tidak dapat dibuat/);assert.equal(ran,false);
});
