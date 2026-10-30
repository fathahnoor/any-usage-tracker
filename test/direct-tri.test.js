'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {DirectTri, buildTriHeaders, parseTriDashboard, sessionFromStorage, rc4Hex} = require('../lib/direct-tri');
const fixture = () => ({status:'0',data:{prepaidinfo:{balance:'25000',cardactiveuntil:'31 December 2026'},
  summary:{data:{remainingquota:5*1048576}},packdata:{packageslist:[{PackageName:'Happy Test',EndDate:'01.11.2026',
    Quotas:[{benefitType:'DATA',quotaUnit:'MB',initialQuota:10240,remainingQuota:5120},
      {benefitType:'VOICE',quotaUnit:'MIN',initialQuota:20,remainingQuota:12}]}]}}});
test('decodes official PWA storage without mixing parent and child lines', () => {
  const encoded = Object.fromEntries(Object.entries({'b-X-IMI-TOKEN':'synthetic-token','b-FINGERPRINT':'synthetic-device','b-MSISDN':'08990000000'}).map(([key,value])=>[key,Buffer.from(value).toString('base64')]));
  const session = sessionFromStorage(encoded);
  assert.equal(session.token,'synthetic-token'); assert.equal(session.phone,'08990000000');
  assert.equal(session.language,'ID'); assert.equal(session.childMsisdn,'');
});
test('reproduces the official SHA512 body and parent header signatures', () => {
  const session = {token:'0123456789',deviceId:'synthetic-device'};
  const headers = buildTriHeaders(session,{},'123456');
  const hash = str => createHash('sha512').update(str).digest('hex');
  assert.equal(headers['x-imi-oauth'],hash('REQBODY={}&SALT=02468'));
  assert.equal(headers['X-IMI-HASH'],hash('parent$BROWSER$5.2.0$0123456789&SALT=135'));
  assert.equal(headers['X-IMI-TOKENID'],session.token);
  assert.equal(rc4Hex('Plaintext','Key'),'bbf316e8d940af0ad3');
  const child = buildTriHeaders({...session,childMsisdn:'08990000001'}, {}, '123456');
  assert.equal(child['X-IMI-CHILD-LINENO'],rc4Hex('628990000001'));
  assert.equal(child['X-IMI-HASH'],hash(`${child['X-IMI-CHILD-LINENO']}$BROWSER$5.2.0$0123456789&SALT=135`));
});
test('normalizes real response schema, MB amounts, voice and KB summary', () => {
  const response = fixture();
  response.data.packdata.packageslist[0].Quotas.reverse();
  const result = parseTriDashboard(response,{phone:'08990000000'});
  assert.equal(result.balance,25000); assert.equal(result.summaryText,'5 GB');
  assert.equal(result.packages[0].remaining,5); assert.equal(result.packages[0].total,10);
  assert.equal(result.packages[0].unit,'GB');
  assert.equal(result.packages[0].expiry,'01 Nov 2026');
  assert.deepEqual(result.packages[0].allowances[1],{remaining:12,total:20,unit:'Menit',totalUnit:'Menit'});
  assert.equal(result.phone,'08990000000');
});
test('reads by direct POST and verifies optional response signature', async () => {
  let request;
  const client = new DirectTri({getSession:()=>({token:'synthetic-token',deviceId:'synthetic-device'}),
    fetchImpl:async(url,options)=>{request={url,options};return new Response(JSON.stringify(fixture()));}});
  assert.equal((await client.read()).balance,25000);
  assert.equal(request.url,'https://bimaplus-api.ioh.co.id/api/v2/dashboard/get/v4');
  assert.equal(request.options.method,'POST'); assert.equal(request.options.body,'{}');
  const invalid = new DirectTri({getSession:()=>({token:'synthetic-token',deviceId:'synthetic-device'}),fetchImpl:async()=>new Response(JSON.stringify(fixture()),{headers:{Oauth:'invalid'}})});
  await assert.rejects(invalid.read(),/Verifikasi/);
});
test('does not leak provider response or credentials in expiry and invalid data errors', async () => {
  const client = new DirectTri({getSession:()=>({token:'synthetic-token',deviceId:'synthetic-device'}),
    fetchImpl:async()=>new Response(JSON.stringify({code:'401',message:'sensitive-response'}))});
  await assert.rejects(client.read(),error=>/kedaluwarsa/.test(error.message)&&!error.message.includes('sensitive'));
  assert.throws(()=>parseTriDashboard({status:'0',data:{}}),/Data pulsa/);
  const empty=fixture();empty.data.packdata.packageslist=[];
  assert.deepEqual(parseTriDashboard(empty).packages,[]);
});
