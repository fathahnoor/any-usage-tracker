'use strict';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = new Intl.NumberFormat('id-ID');
const compact = new Intl.NumberFormat('en-US', {notation:'compact', maximumFractionDigits:2});
const usd = v => Number(v).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
const time = v => v ? new Date(v).toLocaleString('id-ID', {timeZone:'Asia/Jakarta', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Belum diperiksa';
const quotaColor = p => p <= 25 ? 'var(--red)' : p <= 50 ? 'var(--amber)' : 'var(--cyan)';
const sourceUrls = {openrouter:'https://openrouter.ai/activity', telkomsel:'https://www.telkomsel.com/user/simpati', tri:'https://bimatri.ioh.co.id/#/account/package'};
const externalIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 3h6v6M17 3l-8 8M8 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"/></svg>';
let state = null;
const signatures = {};
function remaining(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (!s) return 'Menunggu reset';
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return (d ? d + ' hari ' : '') + h + 'j ' + m + 'm lagi';
}
function gauge(w, label) {
  if (!w) return '<div class="quota-window">Jendela belum tersedia</div>';
  const left = Math.max(0, Math.min(100, 100 - w.usedPercent));
  return `<div class="quota-window" style="--gauge:${quotaColor(left)}">
    <div class="gauge" role="img" aria-label="${esc(label)}: sisa ${left} persen"><svg viewBox="0 0 150 150" aria-hidden="true"><circle class="outer" cx="75" cy="75" r="69"/><circle class="track" cx="75" cy="75" r="58"/><circle class="progress" cx="75" cy="75" r="58" stroke-dasharray="${left / 100 * 364.425} 364.425"/></svg><div class="gauge-value"><strong>${left}<small>%</small></strong><span>TERSISA</span></div></div>
    <div class="window-info"><div class="window-title">${esc(label)}</div><div class="quota-detail">${esc(w.usedPercent)}% terpakai</div><div class="reset-time"><span>RESET WIB</span>${esc(time(w.resetsAt * 1000))}</div><div class="reset-countdown" data-reset="${Number(w.resetsAt)}">${remaining(w.resetsAt - Date.now() / 1000)}</div></div></div>`;
}
function renderCodex(d) {
  const rl = d.data.rateLimits || {}, credits = d.data.rateLimitResetCredits;
  return `<div class="quota-gauges">${gauge(rl.primary,'Jendela 5 jam')}${gauge(rl.secondary,'Mingguan')}</div><div class="account-line"><span class="account-email">${esc(d.account.email || 'Akun Codex aktif')}</span><span class="account-extra">${esc((rl.planType || d.account.planType || 'Codex').toUpperCase())}${credits ? ' / ' + Number(credits.availableCount || 0) + ' reset credit' : ''}</span></div>`;
}
function dateLabel(value) {
  return new Date(value).toLocaleDateString('id-ID', {timeZone:'Asia/Jakarta', day:'numeric', month:'short', year:'numeric'});
}
function renderRouter(d) {
  return `<div class="spend-content"><div><div class="spend-label">Total spend / USD</div><div class="spend-value"><span class="currency">$</span>${usd(d.totalSpend)}</div><div class="spend-period">${esc(dateLabel(d.range.start))} - ${esc(dateLabel(d.range.end))}</div></div><div class="spend-stat"><strong title="${fmt.format(d.totalTokens)} token">${compact.format(d.totalTokens)}</strong><small>TOTAL TOKEN</small></div><div class="spend-stat"><strong title="${fmt.format(d.totalRequests)} request">${compact.format(d.totalRequests)}</strong><small>REQUEST</small></div></div>`;
}
function packageHtml(p) {
  const a = p.allowances?.[0];
  const percent = a && a.total > 0 && a.unit.toLowerCase() === a.totalUnit.toLowerCase() ? Math.max(0, Math.min(100, a.remaining / a.total * 100)) : null;
  const soon = /^1\s*hari$/i.test(p.expiry);
  return `<div class="package" style="--quota-color:${percent === null ? 'var(--cyan)' : quotaColor(percent)}"><div class="package-title"><strong>${esc(p.name)}</strong><span class="expiry ${soon ? 'soon' : ''}" title="Masa berlaku menurut operator saat diperiksa">${soon ? 'Sisa ' : 'Hingga '}${esc(p.expiry || 'belum tercantum')}</span></div>${a ? `<div class="package-values"><strong class="remaining">${esc(a.remaining)} <small>${esc(a.unit)}</small></strong><span class="package-total">/ ${esc(a.total)} ${esc(a.totalUnit)} total</span></div>${percent !== null ? `<div class="quota-bar" role="meter" aria-label="Sisa ${esc(p.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent.toFixed(2)}"><span style="width:${percent}%"></span></div>` : ''}` : '<p class="package-note">Kuota belum terbaca</p>'}${p.allowances?.slice(1).map(x => `<div class="allowance-extra">${esc(x.remaining)} / ${esc(x.total)} ${esc(x.unit)} tersisa</div>`).join('') || ''}</div>`;
}
function renderCarrier(d) {
  const quota = d.summary ? `${d.summary.remaining} ${d.summary.unit}` : d.summaryText;
  return `<div class="carrier-top"><div><div class="phone-number">${esc(d.phone || 'Nomor belum terbaca')}</div><div class="balance"><small>Rp</small>${fmt.format(d.balance)}</div></div>${quota ? `<div class="carrier-total"><strong>${esc(quota)}</strong><span>Sisa internet</span></div>` : ''}</div>${d.activeUntil ? `<div class="active-until">Nomor aktif hingga ${esc(d.activeUntil)}</div>` : ''}<div class="package-list">${d.packages.map(packageHtml).join('')}${d.packageNote ? `<p class="package-note">${esc(d.packageNote)}</p>` : ''}</div>`;
}
function detailUrl(key, data) {
  return key === 'openrouter' && data?.range ? sourceUrls.openrouter + '?' + new URLSearchParams({from:data.range.start, to:data.range.end, date_preset:'past_1_year'}) : sourceUrls[key];
}
function updateSource(key, s) {
  const badge = $(key + '-status');
  badge.className = 'badge ' + (s.refreshing ? 'sync' : s.stale ? (s.data ? 'stale' : 'error') : 'live');
  badge.textContent = s.refreshing ? 'SYNC' : s.stale ? (s.data ? 'DATA LAMA' : 'OFFLINE') : 'TERSINKRON';
  document.querySelector(`[data-refresh="${key}"]`).disabled = s.refreshing;
  const signature = JSON.stringify([s.fetchedAt, s.error]);
  if (signatures[key] !== signature) {
    signatures[key] = signature;
    const target = $(key + '-content');
    if (s.data) {
      target.className = '';
      target.innerHTML = key === 'codex' ? renderCodex(s.data) : key === 'openrouter' ? renderRouter(s.data) : renderCarrier(s.data);
    } else {
      target.className = s.error ? 'error-content' : 'loading-content';
      target.textContent = s.error ? 'Belum tersedia. ' + s.error : 'Membaca data sumber...';
    }
  }
  const foot = $(key + '-foot');
  foot.innerHTML = `<span>${s.fetchedAt ? 'Diperiksa ' + esc(time(s.fetchedAt)) + ' WIB' : 'Belum tersinkron'}</span>${sourceUrls[key] ? `<a class="detail-button" href="${esc(detailUrl(key, s.data))}" target="_blank" rel="noopener noreferrer" aria-label="Lihat detail ${key === 'tri' ? 'Tri' : key === 'telkomsel' ? 'Telkomsel' : 'OpenRouter'} di situs sumber">Detail ${externalIcon}</a>` : '<span>CLI RESMI</span>'}`;
  const old = foot.parentElement.querySelector('.error-banner');
  if (old) old.remove();
  if (s.data && (s.error || s.stale)) {
    const error = document.createElement('div');
    error.className = 'error-banner';
    error.textContent = s.error || 'Data lama. Sinkronkan untuk angka terbaru.';
    foot.before(error);
  }
}
function updateState(next) {
  state = next;
  $('connection-error').hidden = true;
  for (const [key, source] of Object.entries(state.sources)) updateSource(key, source);
  const sources = Object.values(state.sources);
  const busy = sources.some(s => s.refreshing), ok = sources.filter(s => s.data && !s.stale).length;
  $('system-state').className = ok === 4 ? 'ok' : 'warn';
  $('system-state').textContent = busy ? 'Sinkronisasi berjalan' : ok === 4 ? 'Semua sumber tersinkron' : ok + ' / 4 sumber tersinkron';
  $('refresh-all').disabled = busy;
}
async function poll() {
  try {
    const r = await fetch('/api/state');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    updateState(await r.json());
  } catch {
    $('connection-error').hidden = false;
    $('connection-error').textContent = 'Server terputus. Jalankan Buka-Usage-Tracker.cmd.';
    $('system-state').className = 'warn';
    $('system-state').textContent = 'Server terputus';
    for (const key of ['codex','openrouter','telkomsel','tri']) {
      const badge = $(key + '-status');
      badge.className = 'badge stale';
      badge.textContent = 'DATA LAMA';
    }
    $('refresh-all').disabled = false;
  } finally {
    setTimeout(poll, state && Object.values(state.sources).some(s => s.refreshing) ? 2000 : 15000);
  }
}
async function refresh(key) {
  const button = key ? document.querySelector(`[data-refresh="${key}"]`) : $('refresh-all');
  button.disabled = true;
  try {
    const r = await fetch('/api/refresh' + (key ? '?source=' + encodeURIComponent(key) : ''), {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const result = await fetch('/api/state');
    if (!result.ok) throw new Error('HTTP ' + result.status);
    updateState(await result.json());
  } catch {
    $('connection-error').hidden = false;
    $('connection-error').textContent = 'Sinkronisasi gagal. Periksa server lokal.';
    button.disabled = false;
  }
}
for (const b of document.querySelectorAll('[data-refresh]')) b.addEventListener('click', () => refresh(b.dataset.refresh));
$('refresh-all').addEventListener('click', () => refresh());
function tick() {
  $('clock').textContent = new Date().toLocaleTimeString('en-GB', {timeZone:'Asia/Jakarta'}) + ' WIB';
  for (const el of document.querySelectorAll('[data-reset]')) el.textContent = remaining(Number(el.dataset.reset) - Date.now() / 1000);
}
tick();
setInterval(tick, 1000);
poll();
