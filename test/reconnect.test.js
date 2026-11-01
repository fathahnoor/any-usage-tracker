'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {importSessions}=require('../tools/import-browser-sessions');
const {Sources}=require('../lib/sources');
const {Store}=require('../lib/store');
const {createServer}=require('../server');

for(const [provider,url] of Object.entries({telkomsel:'https://www.telkomsel.com/user/simpati',tri:'https://bimatri.ioh.co.id/',openrouter:'https://openrouter.ai/activity'})){
 test('imports and validates only '+provider+' without exposing credentials',async()=>{
  const saved={};let validated=false;
  const neo={run:async code=>{
   if(code.includes('pages.list'))return [{pageId:9,url}];
   if(code.includes('Network.getCookies'))return {cookies:[{name:'fixture',value:'private-fixture'}]};
   assert.ok(code.includes('evaluateInPage'));
   return {value:provider==='tri'?{'b-X-IMI-TOKEN':'fixture'}:{deviceId:'fixture-device',sessionId:'fixture-id',sessionToken:'private-fixture'}};
  }};
  const result=await importSessions({providers:[provider],neo,vault:{set:async(p,s)=>{assert.ok(validated);saved[p]=s;}},validateSession:async(p,s)=>{assert.equal(p,provider);validated=true;return {...s,verified:true};}});
  assert.equal(saved[provider].verified,true);
  assert.deepEqual(Object.keys(saved),[provider]);
  assert.equal(JSON.stringify(result).includes('private-fixture'),false);
  assert.equal(result[provider].ok,true);
 });
}
test('failed validation preserves the previous session',async()=>{
 let writes=0;
 const neo={run:async code=>code.includes('pages.list')?[{pageId:1,url:'https://www.telkomsel.com/user/simpati'}]:code.includes('getCookies')?{cookies:[{}]}:{value:{deviceId:'fixture'}}};
 const result=await importSessions({providers:['telkomsel'],neo,vault:{set:async()=>writes++},validateSession:async()=>{throw Error('private-fixture');}});
 assert.equal(writes,0);assert.equal(result.telkomsel.ok,false);
 assert.equal(JSON.stringify(result).includes('private-fixture'),false);
});
test('unknown providers are rejected before the browser is accessed',async()=>{
 await assert.rejects(importSessions({providers:['__proto__'],neo:{run:async()=>{throw Error('Browser must not be accessed');}}}),/Unknown provider/);
});
test('missing login tabs do not change the saved session',async()=>{
 const result=await importSessions({providers:['tri'],neo:{run:async()=>[]},vault:{set:async()=>assert.fail('Must not save')}});
 assert.equal(result.tri.ok,false);assert.match(result.tri.reason,/BrowserOS neo/);
});
test('reconnect uses the live vault and verifies Tri before committing it',async()=>{
 let session={token:'old'},writes=0;
 const vault={get:async()=>session,set:async(p,s)=>{session=s;writes++;}};
 const storage=Object.fromEntries(Object.entries({'b-X-IMI-TOKEN':'new-token','b-FINGERPRINT':'device'}).map(([k,v])=>[k,Buffer.from(v).toString('base64')]));
 const sources=new Sources({vault,fetchImpl:async()=>new Response(JSON.stringify({status:'0',data:{prepaidinfo:{balance:42},packdata:{packageslist:[]}}})),importer:opts=>importSessions({...opts,neo:{run:async code=>code.includes('pages.list')?[{pageId:1,url:'https://bimatri.ioh.co.id/'}]:{value:storage}}})});
 const data=await sources.reconnect('tri');
 assert.equal(data.balance,42);assert.equal(writes,1);assert.deepEqual(session.storage,storage);
});
test('reconnect waits for an old refresh and deduplicates clicks',async()=>{
 let finish;let connects=0;
 const sources={telkomsel:()=>new Promise(r=>finish=r),reconnect:async()=>{connects++;return {balance:99};}};
 const store=new Store(sources,fs.mkdtempSync(path.join(os.tmpdir(),'nexus-reconnect-')));
 const old=store.refresh('telkomsel',true);
 const a=store.reconnect('telkomsel'),b=store.reconnect('telkomsel');
 assert.equal(connects,0);finish({balance:1});await Promise.all([old,a,b]);
 assert.equal(connects,1);assert.equal(store.state.telkomsel.data.balance,99);assert.equal(store.state.telkomsel.error,null);
 sources.reconnect=async()=>{throw Error('Login belum selesai');};
 await store.reconnect('telkomsel');
 assert.equal(store.state.telkomsel.data.balance,99);assert.equal(store.snapshot().sources.telkomsel.stale,true);
});
test('a refresh starting alongside reconnect reads the newly connected data',async()=>{
 let finish;let normalReads=0;
 const store=new Store({tri:async()=>{normalReads++;return {balance:1};},reconnect:()=>new Promise(r=>finish=r)},fs.mkdtempSync(path.join(os.tmpdir(),'nexus-reconnect-race-')));
 const connect=store.reconnect('tri'),refresh=store.refresh('tri',true);
 finish({balance:99});await Promise.all([connect,refresh]);
 assert.equal(normalReads,0);assert.equal(store.state.tri.data.balance,99);
});
test('HTTP reconnect rejects foreign origins and invalid providers, and returns no session data',async t=>{
 let calls=0;let failure=false;
 const server=createServer({reconnect:async()=>{calls++;return {error:failure?'Login belum selesai':null,data:{token:'private-fixture'}};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 const url='http://127.0.0.1:'+server.address().port+'/api/reconnect?source=';
 const post=(provider,origin)=>new Promise((resolve,reject)=>{
  const req=http.request(url+provider,{method:'POST',headers:{Host:'127.0.0.1:8792','Content-Type':'application/json',...(origin?{Origin:origin}:{})}},res=>{
   let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(body)}));
  });req.on('error',reject);req.end('{}');
 });
 assert.equal((await post('tri','https://foreign.example')).status,403);
 assert.equal((await post('codex')).status,400);
 const response=await post('telkomsel');assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});assert.equal(calls,1);
 failure=true;const failed=await post('tri');assert.equal(failed.status,409);assert.deepEqual(await failed.json(),{ok:false,error:'Login belum selesai'});
});
