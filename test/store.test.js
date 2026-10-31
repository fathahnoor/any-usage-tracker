const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {Store}=require('../lib/store');
test('gagal refresh mempertahankan data terakhir dan bertahan setelah restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'usage-cache-'));let fail=false;
 const source={codex:async()=>{if(fail)throw new Error('offline');return {left:42}}};
 const s=new Store(source,dir);await s.refresh('codex',true);const at=s.state.codex.fetchedAt;fail=true;await s.refresh('codex',true);
 assert.equal(s.state.codex.data.left,42);assert.equal(s.state.codex.fetchedAt,at);assert.equal(s.snapshot().sources.codex.stale,true);
 const after=new Store(source,dir);assert.equal(after.state.codex.data.left,42);assert.equal(after.state.codex.error,'offline');
});
test('refresh serentak sumber yang sama memakai satu proses',async()=>{
 let calls=0;let done;const s=new Store({codex:()=>{calls++;return new Promise(r=>done=r)}},fs.mkdtempSync(path.join(os.tmpdir(),'usage-dedup-')));
 const a=s.refresh('codex',true),b=s.refresh('codex',true);assert.equal(calls,1);done({left:90});await Promise.all([a,b]);assert.equal(s.state.codex.data.left,90);
 await assert.rejects(s.refresh('__proto__',true));
});

test('riwayat Codex mencatat perubahan per akun dan bertahan setelah restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'usage-history-'));let email='rpla1@example.com',used=10,reset=100,verified=true,fail=false;
 const source={codex:async()=>{if(fail)throw new Error('offline');return {historyAccountVerified:verified,account:{email},data:{rateLimits:{primary:{usedPercent:used,resetsAt:reset},secondary:{usedPercent:20,resetsAt:200}}}}}};
 const s=new Store(source,dir);await s.refresh('codex',true);await s.refresh('codex',true);assert.equal(s.codexHistory.length,1);
 used=15;await s.refresh('codex',true);email='rpla2@example.com';await s.refresh('codex',true);email='rpla1@example.com';await s.refresh('codex',true);assert.equal(s.codexHistory.length,3);
 reset=101;await s.refresh('codex',true);verified=false;used=30;await s.refresh('codex',true);fail=true;await s.refresh('codex',true);
 const after=new Store(source,dir);assert.equal(after.snapshot().codexHistory.length,4);assert.equal(after.codexHistory[1].primary.remaining,85);assert.equal(after.codexHistory[3].primary.resetsAt,101);
});
