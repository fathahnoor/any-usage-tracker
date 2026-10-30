'use strict';
const {createHash, randomInt} = require('node:crypto');
const BASE = 'https://bimaplus-api.ioh.co.id/api/v2';
const PAGE = 'https://bimatri.ioh.co.id/#/account/package';
const sha = value => createHash('sha512').update(value).digest('hex');
const odd = value => [...String(value)].filter((_, i) => i % 2 === 0).join('');
const clean = value => String(value ?? '').replace(/[\u2010-\u2015]/g, '-').trim();

// The official PWA stores UTF-8 strings as base64, including its JSON strings.
function sessionFromStorage(storage) {
  const get = key => storage[`b-${key}`] ? Buffer.from(storage[`b-${key}`], 'base64').toString('utf8') : '';
  return {token:get('X-IMI-TOKEN'), deviceId:get('FINGERPRINT'), phone:get('MSISDN'),
    childMsisdn:get('MSISDNCHILD'), language:get('LANG') || 'ID', firebaseInstallationId:get('FIREBASE_INSTALLATION_ID')};
}

function createUid(now = new Date()) {
  const date = new Date(now.getTime() + 7 * 3600000);
  const pad = (n, length = 2) => String(n).padStart(length, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}${pad(date.getUTCMilliseconds(),3)}${randomInt(100,1000)}`;
}

function rc4Hex(text, key = '123') {
  const state = Array.from({length:256}, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + state[i] + key.charCodeAt(i % key.length)) % 256;
    [state[i],state[j]] = [state[j],state[i]];
  }
  let i = 0; j = 0;
  return [...text].map(char => {
    i = (i + 1) % 256; j = (j + state[i]) % 256;
    [state[i],state[j]] = [state[j],state[i]];
    return (char.charCodeAt(0) ^ state[(state[i]+state[j])%256]).toString(16).padStart(2,'0');
  }).join('');
}

function buildTriHeaders(session, body = {}, uid = createUid()) {
  if (!session?.token || !session?.deviceId) throw new Error('Sesi Tri belum dihubungkan.');
  const token = session.token, version = '5.2.0', os = 'BROWSER';
  const childNumber = String(session.childMsisdn || '').replace(/^\+/, '').replace(/^(?:62|0)/, '');
  const child = session.childLineHeader || (childNumber ? rc4Hex(`62${childNumber}`) : '');
  const headers = {
    Authorization:'642d1cc69d90666962726e', 'Content-Type':'application/json',
    'X-IMI-App-OS':os, 'X-IMI-APPVERSION':version, 'X-IMI-CHANNEL':'PORTAL',
    'X-IMI-LANGUAGE':session.language || 'ID',
    'x-imi-oauth':sha(`REQBODY=${JSON.stringify(body)}&SALT=${odd(token)}`),
    'X-IMI-HASH':sha(`${child || 'parent'}$${os}$${version}$${token}&SALT=${odd(uid)}`),
    'X-IMI-TOKENID':token, 'X-IMI-VERSION':version, 'X-DEVICEID':session.deviceId,
    'X-DEVICENAME':'Windows PC (Windows)', 'X-IMI-SERVICEKEY':'FPi7ZP3Jy8Uv3KBd4QeG',
    'X-IMI-UID':uid, 'X-FAIID':session.firebaseInstallationId || ''
  };
  if (child) headers['X-IMI-CHILD-LINENO'] = child;
  return headers;
}

function number(value) {
  const parsed = Number(value);
  return value !== null && value !== '' && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function expiry(value) {
  const text = clean(value), match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return text;
  const [,day,month,year] = match;
  const date = new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth()+1 !== Number(month)) return text;
  return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(date);
}

function parseTriDashboard(response, session = {}) {
  const data = response?.data;
  if (String(response?.status) !== '0' || !data || number(data.prepaidinfo?.balance) === null)
    throw new Error('Data pulsa Tri tidak tersedia.');
  const rawPackages = data.packdata?.packageslist;
  if (!Array.isArray(rawPackages)) throw new Error('Rincian paket Tri tidak tersedia.');
  const packages = rawPackages.map(pack => {
    const groups = new Map();
    for (const quota of pack.Quotas || []) {
      const type = String(quota.benefitType || '').toUpperCase();
      const rawUnit = String(quota.quotaUnit || '').toUpperCase();
      let unit = rawUnit, factor = 1;
      if (type === 'DATA') {
        const factors = {KB:1/1048576, MB:1/1024, GB:1, TB:1024};
        if (!(rawUnit in factors)) continue;
        factor = factors[rawUnit]; unit = 'GB';
      } else if (type === 'VOICE') unit = 'Menit';
      else if (type === 'SMS') unit = 'SMS';
      else continue;
      const remaining = number(quota.remainingQuota), total = number(quota.initialQuota);
      if (remaining === null || total === null) continue;
      const key = `${type}:${unit}`, entry = groups.get(key) || {remaining:0,total:0,unit,totalUnit:unit};
      entry.remaining += remaining * factor; entry.total += total * factor; groups.set(key, entry);
    }
    const priorities = {GB:0,Menit:1,SMS:2};
    const allowances = [...groups.values()].sort((a,b)=>priorities[a.unit]-priorities[b.unit]).map(item => ({...item,
      remaining:Number(item.remaining.toFixed(2)), total:Number(item.total.toFixed(2))}));
    return {name:clean(pack.PackageName || pack.ServiceDescription || pack.packageName || 'Paket Tri'),
      expiry:expiry(pack.EndDate), allowances, ...(allowances[0] || {})};
  });
  const quotaKB = number(data.summary?.data?.remainingquota);
  return {balance:number(data.prepaidinfo.balance), phone:session.childMsisdn || session.phone || null,
    activeUntil:clean(data.prepaidinfo.cardactiveuntil) || null,
    summaryText:quotaKB === null ? null : `${Number((quotaKB/1048576).toFixed(2))} GB`,
    packages, url:PAGE};
}

class DirectTri {
  constructor({getSession, fetchImpl = globalThis.fetch, timeoutMs = 25000} = {}) {
    this.getSession = getSession; this.fetch = fetchImpl; this.timeoutMs = timeoutMs;
  }
  async read() {
    const session = await this.getSession?.();
    const body = {}, headers = buildTriHeaders(session, body);
    let response;
    try {
      response = await this.fetch(`${BASE}/dashboard/get/v4`, {method:'POST',headers,
        body:JSON.stringify(body),signal:AbortSignal.timeout(this.timeoutMs)});
    } catch { throw new Error('Tidak dapat menghubungi API Tri.'); }
    if (response.status === 401 || response.status === 403) throw new Error('Sesi Tri kedaluwarsa. Hubungkan ulang akun.');
    if (!response.ok) throw new Error(`API Tri tidak tersedia (HTTP ${response.status}).`);
    const text = await response.text();
    const signature = response.headers?.get('Oauth');
    if (signature && signature.toUpperCase() !== sha(`REQBODY=${text}&SALT=${odd(headers['X-IMI-UID'])}`).toUpperCase())
      throw new Error('Verifikasi respons Tri gagal.');
    let result;
    try { result = JSON.parse(text); } catch { throw new Error('Respons API Tri tidak valid.'); }
    if (['401','403','10002'].includes(String(result.code))) throw new Error('Sesi Tri kedaluwarsa. Hubungkan ulang akun.');
    return parseTriDashboard(result, session);
  }
}
module.exports = {DirectTri, buildTriHeaders, parseTriDashboard, sessionFromStorage, rc4Hex};
