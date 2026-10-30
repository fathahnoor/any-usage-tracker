"use strict";
function yearRange(now=new Date()) {
  const date=new Date(now.getTime()+7*3600000);
  const y=date.getUTCFullYear(),m=date.getUTCMonth(),d=date.getUTCDate();
  const lastDay=new Date(Date.UTC(y-1,m+1,0)).getUTCDate();
  return {start:new Date(Date.UTC(y-1,m,Math.min(d,lastDay))-7*3600000).toISOString(),end:new Date(Date.UTC(y,m,d+1)-7*3600000-1).toISOString()};
}
const clean=s=>String(s||'').replace(/[\u2010-\u2015]/g,'-').trim();
const balance=text=>{const m=text.match(/Rp\s*([\d.]+(?:,\d+)?)/i);return m?Number(m[1].replace(/\./g,'').replace(',','.')):null;};
function allowances(text) {
 const out=[];const re=/(\d+(?:[.,]\d+)?)\s*(GB|MB|KB|TB|Menit|min|SMS)\s*\/\s*(\d+(?:[.,]\d+)?)\s*(GB|MB|KB|TB|Menit|min|SMS)/gi;
 for(const m of text.matchAll(re)) out.push({remaining:Number(m[1].replace(',','.')),unit:m[2],total:Number(m[3].replace(',','.')),totalUnit:m[4]});
 return out;
}
function parseTelkomsel(home,domestic,roaming='') {
 home=clean(home);const accountText=home.split('Rekomendasi')[0];const accountBalance=balance(accountText);
 if(!/SIMPATI|Aktif hingga/i.test(accountText)||!/Pulsa/i.test(accountText)||accountBalance===null) throw new Error('Telkomsel belum terbaca. Periksa login di BrowserOS neo.');
 const packages=[];
 for(const [type,text] of [['Domestik',domestic],['Roaming',roaming]]) {
  const re=/([^\n]+)\nSisa\s*\n?([\s\S]*?)Hingga\s+([^\n]+)/gi;
  for(const m of clean(text).matchAll(re)) {
   const list=allowances(m[2]);if(list.length)packages.push({name:clean(m[1]),type,expiry:clean(m[3]),allowances:list,...list[0]});
  }
 }
 const summary=allowances(home.match(/Sisa Internet([\s\S]*?)(?:Sisa Aplikasi|Rekomendasi)/i)?.[1]||'')[0]||null;
 return {balance:accountBalance,phone:home.match(/0\d{2,3}[\d ]{7,14}/)?.[0]?.trim()||null,activeUntil:home.match(/Aktif hingga\s+([^\n]+)/i)?.[1]||null,summary,packages,packageNote:packages.length?null:/Belum Memiliki Paket Aktif/i.test(domestic)?'Tidak ada paket domestik aktif.':'Rincian paket belum tersedia dari halaman operator.',sourceUpdated:home.match(/Data diperbarui pada\s+([^\n]+)/i)?.[1]||null};
}
function parseTri(home,cards) {
 home=clean(home); if(balance(home)===null||!/Pulsa/.test(home))throw new Error('Tri belum terbaca. Periksa login bima+ di BrowserOS neo.');
 const packages=cards.filter(x=>!/(Tambahkan|tidak memiliki)/i.test(x.name)).map(c=>{const list=allowances(c.text);return {name:clean(c.name),expiry:clean(c.text.match(/Berakhir pada\s*([^\n]+)/i)?.[1]||''),allowances:list,...(list[0]||{})};});
 if(!packages.length)throw new Error('Rincian paket Tri belum terbaca.');
 return {balance:balance(home),phone:home.match(/0\d{9,13}/)?.[0]||null,activeUntil:home.match(/(?:Masa aktif|Aktif hingga)\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i)?.[1]||null,summaryText:home.match(/([\d.,]+\s*GB)\s*Kuota/i)?.[1]||null,packages};
}
function normalizeOpenRouter(raw,range) {
 if(!Array.isArray(raw?.data))throw new Error('Data harian OpenRouter tidak tersedia');
 if(raw.metadata?.truncated)throw new Error('Data OpenRouter terpotong, total tidak ditampilkan');
 const number=v=>{if(v===undefined||v===null||!Number.isFinite(Number(v))||Number(v)<0)throw new Error('Nilai OpenRouter tidak valid');return Number(v);};
 const rows=raw.data.map(r=>({date:clean(r.date__day),model:clean(r.model||'unknown'),label:clean(raw.labels?.model?.[r.model]||r.model||'Unknown'),spend:number(r.total_usage),tokens:number(r.tokens_total),input:number(r.tokens_prompt),output:number(r.tokens_completion),requests:number(r.request_count)}));
 if(rows.some(r=>!/^\d{4}-\d{2}-\d{2}$/.test(r.date)))throw new Error('Tanggal OpenRouter tidak valid');
 return {range,timezone:'Asia/Jakarta',totalSpend:rows.reduce((n,r)=>n+r.spend,0),totalTokens:rows.reduce((n,r)=>n+r.tokens,0),totalRequests:rows.reduce((n,r)=>n+r.requests,0),rows};
}
module.exports={yearRange,parseTelkomsel,parseTri,normalizeOpenRouter};
