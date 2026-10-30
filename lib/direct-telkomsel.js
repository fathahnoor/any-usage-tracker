'use strict';
const {CookieJar,requestJson}=require('./http-session');
const BASE='https://www.telkomsel.com';
const URL=BASE+'/user/simpati';
function finite(value,label){const n=Number(value);if(value===null||value===undefined||value===''||!Number.isFinite(n)||n<0)throw new Error('Data Telkomsel tidak valid: '+label);return n;}
function quantity(value){
 const m=String(value??'').trim().match(/^(\d+(?:[.,]\d+)?)\s*(GB|MB|KB|TB|Menit|min|SMS)$/i);
 if(!m)throw new Error('Format kuota Telkomsel belum didukung');
 return {value:Number(m[1].replace(',','.')),unit:m[2]};
}
function displayDate(value){
 if(!value)return null;
 const s=String(value),d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(s)?s+'T12:00:00+07:00':s);
 if(!Number.isFinite(d.getTime()))throw new Error('Tanggal Telkomsel tidak valid');
 return d.toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric'});
}
function normalizeTelkomsel(profile,bonuses,offers){
 if(!profile||!profile.identifier||!profile.serviceType||!bonuses?.activeBonuses||!Array.isArray(offers?.tabs))throw new Error('Respons Telkomsel tidak lengkap');
 const packages=[];
 for(const tab of offers.tabs){
  if(tab.list===null||tab.list===undefined)continue;
  if(!Array.isArray(tab.list))throw new Error('Daftar paket Telkomsel tidak valid');
  for(const p of tab.list){
   if(!p.packageName)throw new Error('Nama paket Telkomsel tidak tersedia');
   const allowances=[];
   if(p.remaining&&p.total){const left=quantity(p.remaining),total=quantity(p.total);allowances.push({remaining:left.value,total:total.value,unit:left.unit,totalUnit:total.unit});}
   packages.push({name:p.packageName,type:tab.label||null,expiry:displayDate(p.expiryDate)||'',allowances,...(allowances[0]||{})});
  }
 }
 const internet=bonuses.activeBonuses.internet;
 let summary=null;
 if(internet){
  const parseBonus=v=>/^\d+(?:[.,]\d+)?$/.test(String(v))?{value:finite(String(v).replace(',','.'),'internet'),unit:'GB'}:quantity(v);
  const left=parseBonus(internet.remaining),total=parseBonus(internet.total);
  summary={remaining:left.value,total:total.value,unit:left.unit,totalUnit:total.unit};
 }
 return {balance:finite(profile.balance,'balance'),phone:String(profile.identifier),activeUntil:displayDate(profile.gracedate),summary,packages,packageNote:packages.length?null:'Tidak ada paket aktif.',sourceUpdated:bonuses.dataUpdated||null,url:URL};
}
async function readTelkomsel(session,{fetchImpl=fetch,saveSession=async()=>{}}={}){
 if(!session?.deviceId||!Array.isArray(session.cookies)||!session.cookies.length)throw new Error('Sesi Telkomsel belum terhubung. Hubungkan akun pada dashboard.');
 const jar=new CookieJar(session.cookies);
 const headers=(url,method)=>{const h={'Accept':'application/json, text/plain, */*','Accept-Language':'ID','device-id':session.deviceId,'Cookie':jar.header(url),'Referer':URL,'Sec-Fetch-Dest':'empty','Sec-Fetch-Mode':'cors','Sec-Fetch-Site':'same-origin'};if(session.userAgent)h['User-Agent']=session.userAgent;if(method==='POST')h.Origin=BASE;const csrf=jar.toJSON().find(c=>c.name==='XSRF-TOKEN');if(csrf&&method!=='GET')h['X-XSRF-TOKEN']=decodeURIComponent(csrf.value);return h;};
 async function call(route,method='GET'){
  const url=BASE+route;
  const result=await requestJson(url,{method,headers:{...headers(url,method),...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:'{}'}:{}),redirect:'error'},fetchImpl);
  jar.absorb(url,result.response);
  return result;
 }
 async function refresh(){
  const {response,json}=await call('/api/auth/v1/session/refresh','POST');
  if(response.status!==200||json.code!=='WAUS01001')throw new Error('Sesi Telkomsel berakhir. Hubungkan ulang akun.');
  const ttl=Number(json.data?.expired)||86400;
  session={...session,cookies:jar.toJSON(),expiresAt:Date.now()+Math.max(60,ttl)*1000};
  await saveSession(session);
 }
 async function read(route){
  let result=await call(route);
  if(result.response.status===401){await refresh();result=await call(route);}
  if(!result.response.ok||result.json.code!=='WCUS01001')throw new Error('API Telkomsel gagal ('+result.response.status+', '+String(result.json.code||'unknown')+')');
  return result.json.data;
 }
 const profile=await read('/api/customer/v1/profile');
 const bonuses=await read('/api/customer/v1/active-bonuses?serviceType='+encodeURIComponent(profile.serviceType));
 const offers=await read('/api/customer/v1/active-offers');
 await saveSession({...session,cookies:jar.toJSON()});
 return normalizeTelkomsel(profile,bonuses,offers);
}
module.exports={readTelkomsel,normalizeTelkomsel};
