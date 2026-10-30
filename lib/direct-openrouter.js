'use strict';
const {CookieJar,requestJson}=require('./http-session');
const {yearRange,normalizeOpenRouter}=require('./data');
const ORIGIN='https://openrouter.ai';
const ANALYTICS=ORIGIN+'/api/frontend/v1/private/analytics-query';
const CLERK='https://clerk.openrouter.ai';
function tokenExpiresAt(token){
 try{return Number(JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8')).exp)||0;}catch{return 0;}
}
function syncSessionCookies(session,jar,jwt){
 const names=new Set(['__session']);
 const cookies=jar.toJSON().map(cookie=>{
  if(cookie.domain.replace(/^\./,'')==='openrouter.ai'&&/^__session(?:_|$)/.test(cookie.name)){
   names.delete(cookie.name);return {...cookie,value:jwt,expires:-1};
  }
  return cookie;
 });
 for(const name of names)cookies.push({name,value:jwt,domain:'.openrouter.ai',path:'/',secure:true,expires:-1});
 session.sessionToken=jwt;session.cookies=cookies;
 return new CookieJar(cookies);
}
function baseHeaders(session,url,jar){
 return {Accept:'application/json',Origin:ORIGIN,Referer:ORIGIN+'/',Cookie:jar.header(url),...(session.userAgent?{'User-Agent':session.userAgent}:{})};
}
async function renewOpenRouterSession({session,fetchImpl=fetch,saveSession=async()=>{}}){
 if(!session?.sessionId||!session?.sessionToken||!Array.isArray(session.cookies))throw new Error('Sesi OpenRouter belum tersambung. Hubungkan akun dari dashboard.');
 let jar=new CookieJar(session.cookies);
 const url=new URL(CLERK+'/v1/client/sessions/'+encodeURIComponent(session.sessionId)+'/tokens');
 url.searchParams.set('debug','skip_cache');url.searchParams.set('__clerk_api_version','2026-08-20');url.searchParams.set('_clerk_js_version','6.41.0');
 const body=new URLSearchParams({organization_id:session.organizationId||'',tab_state:'hidden',token:session.sessionToken,force_origin:'true'});
 const {response,json}=await requestJson(url.toString(),{method:'POST',headers:{...baseHeaders(session,url,jar),'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()},fetchImpl);
 jar.absorb(url,response);
 if(!response.ok||typeof json?.jwt!=='string'||!tokenExpiresAt(json.jwt))throw new Error('Sesi OpenRouter perlu dihubungkan ulang (HTTP '+response.status+').');
 jar=syncSessionCookies(session,jar,json.jwt);
 await saveSession({...session,cookies:jar.toJSON()});
 return jar;
}
async function readOpenRouterDirect({session,fetchImpl=fetch,saveSession=async()=>{},now=new Date()}){
 if(!session?.sessionId||!session?.sessionToken||!Array.isArray(session.cookies))throw new Error('Sesi OpenRouter belum tersambung. Hubungkan akun dari dashboard.');
 session={...session,cookies:session.cookies.map(cookie=>({...cookie}))};
 let jar=new CookieJar(session.cookies);
 const instant=now instanceof Date?now:new Date(now);
 if(tokenExpiresAt(session.sessionToken)<=instant.getTime()/1000+10)jar=await renewOpenRouterSession({session,fetchImpl,saveSession});
 else jar=syncSessionCookies(session,jar,session.sessionToken);
 const range=yearRange(instant);
 const query={metrics:['total_usage','request_count','tokens_total','tokens_prompt','tokens_completion'],dimensions:['model'],granularity:'day',timezone:'Asia/Jakarta',time_range:range,order_by:{field:'date',direction:'asc'},includeEnrichment:true};
 const send=()=>requestJson(ANALYTICS,{method:'POST',headers:{...baseHeaders(session,ANALYTICS,jar),'Content-Type':'application/json'},body:JSON.stringify(query)},fetchImpl);
 let result=await send();jar.absorb(ANALYTICS,result.response);
 if(result.response.status===401){jar=await renewOpenRouterSession({session,fetchImpl,saveSession});result=await send();jar.absorb(ANALYTICS,result.response);}
 if(!result.response.ok)throw new Error('Pembacaan API OpenRouter gagal (HTTP '+result.response.status+').');
 const data=normalizeOpenRouter(result.json?.data,range);
 await saveSession({...session,cookies:jar.toJSON()});
 return {...data,url:ORIGIN+'/activity?'+new URLSearchParams({from:range.start,to:range.end,date_preset:'past_1_year'}),source:'OpenRouter analytics API (direct HTTP)'};
}
module.exports={readOpenRouterDirect,renewOpenRouterSession,tokenExpiresAt};
