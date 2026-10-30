'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readOpenRouterDirect}=require('../lib/direct-openrouter');
const token=exp=>'header.'+Buffer.from(JSON.stringify({exp,iat:exp-60})).toString('base64url')+'.signature';
const now=new Date('2026-10-31T01:00:00Z');
const expired=()=>({sessionId:'sess_fixture',sessionToken:token(now.getTime()/1000-5),cookies:[{name:'__client',value:'client-fixture',domain:'.clerk.openrouter.ai',path:'/',secure:true},{name:'__session',value:'old-fixture',domain:'.openrouter.ai',path:'/',secure:true},{name:'__session_suffix',value:'old-fixture',domain:'.openrouter.ai',path:'/',secure:true}]});
const analytics={data:{data:[{date__day:'2026-10-30',model:'fixture/model',total_usage:'1.25',tokens_total:'100',tokens_prompt:'90',tokens_completion:'10',request_count:'2'}],metadata:{truncated:false}}};
test('OpenRouter renews Clerk JWT and queries complete annual account analytics without browser',async()=>{
 const session=expired(),calls=[];let saved;
 const jwt=token(now.getTime()/1000+60);
 const fetchImpl=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(calls.length===1?{object:'token',jwt}:analytics),{status:200,headers:{'Content-Type':'application/json'}});};
 const data=await readOpenRouterDirect({session,fetchImpl,now,saveSession:async value=>{saved=value;}});
 assert.equal(data.totalSpend,1.25);assert.equal(data.totalTokens,100);
 assert.equal(calls.length,2);assert.equal(new URL(calls[0].url).hostname,'clerk.openrouter.ai');
 assert.equal(new URL(calls[0].url).pathname,'/v1/client/sessions/sess_fixture/tokens');
 assert.equal(calls[0].options.headers.Origin,'https://openrouter.ai');
 assert.match(calls[0].options.headers.Cookie,/__client=client-fixture/);
 const form=new URLSearchParams(calls[0].options.body);assert.equal(form.get('tab_state'),'hidden');assert.equal(form.get('force_origin'),'true');assert.equal(form.get('token'),session.sessionToken);
 assert.equal(new URL(calls[1].url).pathname,'/api/frontend/v1/private/analytics-query');
 assert.match(calls[1].options.headers.Cookie,new RegExp('__session='+jwt.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 const q=JSON.parse(calls[1].options.body);assert.deepEqual(q.time_range,{start:'2025-10-30T17:00:00.000Z',end:'2026-10-31T16:59:59.999Z'});assert.equal(q.timezone,'Asia/Jakarta');assert.equal(q.topN,undefined);
 assert.equal(saved.sessionToken,jwt);assert.equal(saved.cookies.find(c=>c.name==='__session_suffix').value,jwt);
});
test('OpenRouter rejects signed-out renewal without falling back to lifetime credits',async()=>{
 const calls=[];
 await assert.rejects(readOpenRouterDirect({session:expired(),now,fetchImpl:async(url)=>{calls.push(url);return new Response(JSON.stringify({errors:[{code:'session_not_found'}]}),{status:401});}}),/Sesi OpenRouter/);
 assert.equal(calls.length,1);assert.equal(calls.some(url=>url.includes('/credits')),false);
});
test('OpenRouter uses a valid migrated token and rejects truncated annual result',async()=>{
 const session=expired();session.sessionToken=token(now.getTime()/1000+60);
 await assert.rejects(readOpenRouterDirect({session,now,fetchImpl:async()=>new Response(JSON.stringify({data:{...analytics.data,metadata:{truncated:true}}}),{status:200})}),/terpotong/);
});
