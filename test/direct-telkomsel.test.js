const {test}=require('node:test');const assert=require('node:assert/strict');
const {readTelkomsel,normalizeTelkomsel}=require('../lib/direct-telkomsel');
const profile={identifier:'08120000000',serviceType:'SIMPATI',balance:50000,gracedate:'2027-10-29'};
const bonuses={activeBonuses:{internet:{remaining:'4.79 GB',total:'32 GB'}},dataUpdated:'2026-10-31T10:00:00+07:00'};
const offers={tabs:[{label:'Domestik',list:[{packageName:'HOT PROMO',remaining:'4.79 GB',total:'32 GB',expiryDate:'2026-11-12',remainingDays:12}]},{label:'Roaming',list:null}]};
const session={deviceId:'fixture-device',cookies:[{name:'session',value:'fixture-session',domain:'www.telkomsel.com',path:'/',secure:true}]};
function response(status,data,code='WCUS01001',cookies=[]){return {status,ok:status>=200&&status<300,headers:{getSetCookie:()=>cookies},json:async()=>({code,data})};}
test('Telkomsel JSON sesuai profil, ringkasan dan paket, tanpa DOM',()=>{
 const d=normalizeTelkomsel(profile,bonuses,offers);
 assert.equal(d.balance,50000);assert.equal(d.summary.remaining,4.79);assert.equal(d.packages[0].remaining,4.79);assert.equal(d.packages[0].expiry,'12 Nov 2026');assert.equal(d.packages.length,1);
 assert.deepEqual(normalizeTelkomsel(profile,bonuses,{tabs:[{label:'Domestik',list:null}]}).packages,[]);
 assert.throws(()=>normalizeTelkomsel({...profile,balance:null},bonuses,offers),/tidak valid/);
});
test('Telkomsel mengirim device-id dan cookie, memperbarui sesi 401 lalu mencoba kembali',async()=>{
 const calls=[],saved=[];let first=true;
 const fetchImpl=async(url,opts)=>{calls.push({url,opts});if(url.endsWith('/profile')){if(first){first=false;return response(401,null,'WAUB02008');}return response(200,profile);}if(url.endsWith('/refresh'))return response(200,{expired:3600},'WAUS01001',['session=fixture-new; Path=/; Secure; HttpOnly']);return response(200,url.includes('active-bonuses')?bonuses:offers);};
 const d=await readTelkomsel(session,{fetchImpl,saveSession:async s=>saved.push(s)});
 assert.equal(d.packages.length,1);assert.equal(calls[0].opts.headers['device-id'],'fixture-device');assert.match(calls[0].opts.headers.Cookie,/session=fixture-session/);
 const retry=calls.find((c,i)=>i>1&&c.url.endsWith('/profile'));assert.match(retry.opts.headers.Cookie,/session=fixture-new/);assert.equal(calls.find(c=>c.url.endsWith('/refresh')).opts.body,'{}');assert.equal(saved.at(-1).cookies.find(c=>c.name==='session').value,'fixture-new');
});
test('Telkomsel tidak mengubah sesi berakhir menjadi kuota nol',async()=>{
 await assert.rejects(readTelkomsel(session,{fetchImpl:async url=>response(401,null,url.endsWith('/refresh')?'WAUB02009':'WAUB02008')}),/berakhir/);
});
