const {test}=require('node:test');
const assert=require('node:assert/strict');
const {yearRange,parseTelkomsel,parseTri,normalizeOpenRouter}=require('../lib/data');
test('rentang setahun mengikuti batas hari WIB dan tahun kabisat',()=>{
  assert.deepEqual(yearRange(new Date('2026-10-30T13:00:00Z')),{start:'2025-10-29T17:00:00.000Z',end:'2026-10-30T16:59:59.999Z'});
  assert.equal(yearRange(new Date('2024-02-29T18:00:00Z')).start,'2023-02-28T17:00:00.000Z');
});
test('pulsa Indonesia, kuota dan paket Telkomsel tidak tercampur rekomendasi',()=>{
 const d=parseTelkomsel('0812 2493 458\nSIMPATI\nAktif hingga 29 Okt 2027\nPulsa\nRp57.682\nSisa Internet\n4.91 GB/32 GB\nRekomendasi Untukmu\n60GB Rp140.000','HOT PROMO\nSisa\n4.91 GB\n/32 GB\nHingga 12 Nov 2026\nSisa 13 hari');
 assert.equal(d.balance,57682);assert.equal(d.packages[0].name,'HOT PROMO');assert.equal(d.packages[0].remaining,4.91);assert.equal(d.packages[0].total,32);
 assert.throws(()=>parseTelkomsel('Login',''));
 assert.throws(()=>parseTelkomsel('SIMPATI\nRekomendasi Untukmu\nRp100.000',''));
});
test('Tri mempertahankan batas kuota berbeda dan kuota telepon',()=>{
 const d=parseTri('08998700122\nRp53.165 Pulsa\n27.7GB Kuota',[{name:'Harian',text:'Berakhir pada 1 hari\nKuota\n14.60 GB /15 GB\nvoice\n100 Menit /100 Menit'}]);
 assert.equal(d.balance,53165);assert.equal(d.packages[0].allowances.length,2);assert.equal(d.packages[0].remaining,14.6);
 assert.equal(parseTri('Atur kuota dan masa aktif #SEENAKAKU\n08998700122\nRp53.165 Pulsa',[{name:'Paket',text:'1 GB /1 GB'}]).activeUntil,null);
});
test('OpenRouter menghitung seluruh model termasuk biaya nol, menolak data terpotong',()=>{
 const raw={data:[{date__day:'2026-10-29',model:'a',total_usage:'0.25',tokens_total:'30',tokens_prompt:'20',tokens_completion:'10',request_count:'2'},{date__day:'2026-10-29',model:'b',total_usage:0,tokens_total:'5',tokens_prompt:'4',tokens_completion:'1',request_count:'1'}],metadata:{truncated:false},labels:{model:{a:'Model A'}}};
 const d=normalizeOpenRouter(raw,{start:'2025-10-29T17:00:00.000Z',end:'2026-10-30T16:59:59.999Z'});
 assert.equal(d.totalSpend,.25);assert.equal(d.totalTokens,35);assert.equal(d.rows.length,2);assert.equal(d.rows[0].label,'Model A');
 assert.throws(()=>normalizeOpenRouter({...raw,metadata:{truncated:true}},{}),/terpotong/);
 assert.throws(()=>normalizeOpenRouter({...raw,data:[{...raw.data[0],tokens_total:'oops'}]},{}));
});
