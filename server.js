"use strict";
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {Sources}=require('./lib/sources');
const {Store}=require('./lib/store');
const port=Number(process.env.USAGE_TRACKER_PORT||8792);
function createServer(store){return http.createServer((req,res)=>{
 const allowedHosts=new Set(['127.0.0.1:'+port,'localhost:'+port]);
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
 const send=(status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(type.startsWith('application/json')?JSON.stringify(body):body);};
 if(!allowedHosts.has(req.headers.host))return send(403,{error:'Host ditolak'});
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 if(req.method==='GET'&&url.pathname==='/api/state')return send(200,store.snapshot());
 if(req.method==='POST'&&url.pathname==='/api/refresh'){
  const origin=req.headers.origin;
  if((origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin))||!req.headers['content-type']?.startsWith('application/json'))return send(403,{error:'Permintaan ditolak'});
  const key=url.searchParams.get('source');
  if(key&&!Object.hasOwn(store.state,key))return send(400,{error:'Sumber tidak dikenal'});
  if(key)store.refresh(key,true);else store.refreshAll(true);
  return send(202,{ok:true});
 }
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/favicon.svg':'favicon.svg'};
 if(req.method==='GET'&&Object.hasOwn(files,url.pathname)){
  const name=files[url.pathname];const type=name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/html';
  return send(200,fs.readFileSync(path.join(__dirname,'public',name)),type+'; charset=utf-8');
 }
 return send(404,{error:'Tidak ditemukan'});
});}
if(require.main===module){
 const store=new Store(new Sources(),path.join(__dirname,'data'));
 const server=createServer(store);
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port '+port+' sudah dipakai. Buka http://127.0.0.1:'+port+'/':e.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>{console.log('Any Usage Tracker: http://127.0.0.1:'+port+'/');store.refreshAll();const timer=setInterval(()=>store.refreshAll(),15000);timer.unref();});
}
module.exports={createServer};
