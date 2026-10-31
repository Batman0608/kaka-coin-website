/* =========================================================================
 *  BẢN ĐỒ HÀNH HƯƠNG — bản đồ Việt Nam (gồm QĐ. Hoàng Sa, QĐ. Trường Sa),
 *  10 chùa chia 3 miền; bấm chùa → mô hình 3D, ảnh thật, thông tin, sự tích;
 *  có thể đổi chùa / kể sự tích ngay trên màn hình phát.
 * ========================================================================= */
import { mount } from './temple3d.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
const ch = new BroadcastChannel('chua-binh-an');
const send = (cmd, args) => ch.postMessage({ type: 'cmd', cmd, args: args || {} });

const TEMPLES = CBA.temples.filter(t => !t.home);
const REG = CBA.regions;
const COLOR = { bac: '#e5533a', trung: '#f0a23a', nam: '#3aa6e5' };

/* ---------- phép chiếu ---------- */
const LON0 = 101.8, LON1 = 117.8, LAT0 = 7.2, LAT1 = 23.7, K = 40, CX = Math.cos(16 * Math.PI / 180);
const W = (LON1 - LON0) * CX * K, H = (LAT1 - LAT0) * K;
const px = (lon) => (lon - LON0) * CX * K, py = (lat) => (LAT1 - lat) * K;

const svg = $('map');
svg.setAttribute('viewBox', `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`);
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

// đất liền + đảo
CBA.VN_SHAPE.forEach(ring => {
  const d = ring.map(([lon, lat], i) => (i ? 'L' : 'M') + px(lon).toFixed(1) + ' ' + py(lat).toFixed(1)).join('') + 'Z';
  svg.append(sv('path', { d, class: 'land' }));
});
// Hoàng Sa & Trường Sa của Việt Nam
const HS = [[111.6, 16.5], [111.75, 16.45], [112.2, 16.85], [112.35, 16.95], [111.2, 15.78], [112.0, 16.25], [111.9, 16.55], [112.5, 16.67], [112.7, 16.0]];
const TS = [[114.36, 10.38], [114.0, 11.05], [114.29, 11.43], [115.0, 10.0], [113.85, 8.65], [114.9, 9.0], [112.2, 9.5], [113.3, 10.8], [114.5, 9.6], [115.5, 10.2], [111.92, 8.65], [114.1, 7.9]];
HS.forEach(([a, b]) => svg.append(sv('circle', { cx: px(a), cy: py(b), r: 2.2, class: 'isl' })));
TS.forEach(([a, b]) => svg.append(sv('circle', { cx: px(a), cy: py(b), r: 2.2, class: 'isl' })));
const label = (x, y, text, cls) => { const t = sv('text', { x, y, class: cls }); t.textContent = text; svg.append(t); return t; };
label(px(110.6), py(17.5), 'QĐ. Hoàng Sa', 'lbl'); label(px(110.4), py(17.12), '(Việt Nam)', 'lbl sov');
label(px(112.3), py(12.1), 'QĐ. Trường Sa', 'lbl'); label(px(112.4), py(11.72), '(Việt Nam)', 'lbl sov');
label(px(110.6), py(13.8), 'B i ể n   Đ ô n g', 'sea');
label(px(104.3), py(8.0), 'VIỆT NAM', 'lbl');

// tuyến hành hương Bắc → Nam
const route = TEMPLES.slice().sort((a, b) => b.lat - a.lat);
svg.append(sv('path', { class: 'route', d: route.map((t, i) => (i ? 'L' : 'M') + px(t.lon) + ' ' + py(t.lat)).join('') }));

// ghim chùa
const pins = {};
TEMPLES.forEach((t, i) => {
  const g = sv('g', { class: 'pin', tabindex: 0, role: 'button', 'aria-label': t.name });
  const off = { 'giac-lam': [-7, 5], 'vinh-nghiem': [5, -4] }[t.id] || [0, 0];
  const x = 0, y = 0; g.dataset.x = px(t.lon) + off[0]; g.dataset.y = py(t.lat) + off[1];
  const right = !['bai-dinh', 'huong', 'giac-lam', 'doi', 'mot-cot'].includes(t.id);
  const dy = { 'mot-cot': -9, 'yen-tu': -4, 'huong': 1, 'bai-dinh': 10 }[t.id] || 0;
  g.append(sv('circle', { class: 'ring', cx: x, cy: y, r: 11 }));
  g.append(sv('circle', { class: 'o', cx: x, cy: y, r: 8, fill: COLOR[t.region] }));
  const ic = sv('text', { class: 'ic', x, y: y + 0.5 }); ic.textContent = '卍'; ic.setAttribute('fill', '#fff'); g.append(ic);
  const nm = sv('text', { class: 'nm', x: right ? x + 12 : x - 12, y: y + 3.5 + dy, 'text-anchor': right ? 'start' : 'end' }); nm.textContent = t.name.replace(/ \(.*\)/, ''); g.append(nm);
  g.addEventListener('click', () => select(t.id));
  g.addEventListener('keydown', (e) => { if (e.key === 'Enter') select(t.id); });
  svg.append(g); pins[t.id] = g;
});
// ghim giữ nguyên kích thước khi phóng to bản đồ
function placePins(f) { Object.values(pins).forEach(g => g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${f})`)); }
placePins(1);

/* ---------- lọc theo miền ---------- */
let region = 'all';
const chips = $('regionChips');
[['all', 'Tất cả'], ['bac', REG.bac], ['trung', REG.trung], ['nam', REG.nam]].forEach(([k, n]) => {
  const c = TEMPLES.filter(t => k === 'all' || t.region === k).length;
  const b = el('button', k === 'all' ? 'on' : '', `${n} · ${c}`); b.onclick = () => { region = k; [...chips.children].forEach(x => x.classList.toggle('on', x === b)); filter(); };
  chips.append(b);
});
const VB = { all: [0, 0, W, H] };
function zoomTo(list) {
  if (!list) { animVB([0, 0, W, H]); return; }
  const xs = list.map(t => px(t.lon)), ys = list.map(t => py(t.lat));
  const pad = 70, x0 = Math.min(...xs) - pad * 1.6, x1 = Math.max(...xs) + pad * 1.6, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const w = Math.max(x1 - x0, 220), h = Math.max(y1 - y0, 220);
  animVB([x0 - (w - (x1 - x0)) / 2, y0 - (h - (y1 - y0)) / 2, w, h]);
}
let vb = [0, 0, W, H];
function animVB(to) {
  const from = vb.slice(), t0 = performance.now();
  const stepA = (now) => { const k = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - k, 3); vb = from.map((v, i) => v + (to[i] - v) * e); svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); placePins(Math.max(0.35, vb[2] / W)); if (k < 1) requestAnimationFrame(stepA); };
  requestAnimationFrame(stepA);
}
function filter() {
  zoomTo(region === 'all' ? null : TEMPLES.filter(t => t.region === region));
  TEMPLES.forEach(t => pins[t.id].classList.toggle('dim', region !== 'all' && t.region !== region));
  const first = TEMPLES.find(t => region === 'all' || t.region === region);
  if (first && (region !== 'all' && curT().region !== region)) select(first.id);
}

/* ---------- bảng thông tin + 3D ---------- */
let cur = TEMPLES[0].id, viewer = null, view = '3d';
const curT = () => TEMPLES.find(t => t.id === cur);
function select(id) {
  cur = id; const t = curT();
  Object.entries(pins).forEach(([k, g]) => g.classList.toggle('sel', k === id));
  $('tName').textContent = t.name;
  $('tMeta').innerHTML = '';
  const rg = el('span', 'rg', REG[t.region]); rg.style.background = COLOR[t.region]; $('tMeta').append(rg, document.createTextNode(t.place + (t.year ? ` · dựng năm ${t.year}` : '')));
  $('tIntro').textContent = t.intro;
  const ul = $('tFacts'); ul.innerHTML = ''; (t.facts || []).forEach(f => ul.append(el('li', '', f)));
  const lg = t.legend || CBA.stories.find(s => s.id === t.legendStory);
  $('legendTitle').textContent = '📜 Sự tích: ' + (lg ? lg.title : '—');
  const lt = $('legendText'); lt.innerHTML = ''; if (lg) { lg.scenes.forEach(s => lt.append(el('p', '', s))); lt.append(el('p', '', '🪷 ' + lg.moral)); }
  // ảnh thật
  const ph = $('photo'), box = $('viewPhoto'); box.classList.remove('empty');
  ph.onerror = () => box.classList.add('empty'); ph.src = `assets/temples/${t.id}.jpg`;
  const cr = (window.TEMPLE_PHOTO_CREDITS || {})[t.id];
  $('photoCredit').innerHTML = cr ? `Ảnh: ${cr.artist || ''} · <a href="${cr.page}" target="_blank" rel="noopener">${cr.lic}</a>` : '';
  show3d();
}
function show3d() {
  if (viewer) { viewer.dispose(); viewer = null; }
  if (view === '3d') viewer = mount($('view3d'), cur);
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  view = b.dataset.v; document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('view3d').classList.toggle('hidden', view !== '3d'); $('viewPhoto').classList.toggle('hidden', view !== 'photo'); show3d();
});
const step = (d) => { const list = TEMPLES.filter(t => region === 'all' || t.region === region); const i = list.findIndex(t => t.id === cur); select(list[(i + d + list.length) % list.length].id); };
$('prev').onclick = () => step(-1); $('next').onclick = () => step(1);
$('goLive').onclick = () => send('temple', { id: cur });
$('tellLive').onclick = () => { const t = curT(); send('storyStart', { id: t.legendStory || 'chua_' + t.id }); };

/* ---------- trạng thái màn hình phát ---------- */
let lastState = 0, liveTemple = null;
ch.onmessage = (e) => {
  const m = e.data; if (m.type !== 'state') return;
  lastState = Date.now();
  if (m.temple && m.temple.id !== liveTemple) {
    liveTemple = m.temple.id;
    Object.entries(pins).forEach(([k, g]) => g.classList.toggle('live', k === liveTemple));
  }
};
setInterval(() => {
  const on = Date.now() - lastState < 4000, t = CBA.temples.find(x => x.id === liveTemple);
  $('liveInfo').innerHTML = on ? `Đang phát: <b>${t ? t.name : '—'}</b>` : 'Màn hình phát: chưa mở';
}, 1000);

const q = new URLSearchParams(location.search).get('t');
select(q && TEMPLES.some(t => t.id === q) ? q : TEMPLES[0].id);
