/* =========================================================================
 *  CHÙA BÌNH AN 3D — game chơi trên điện thoại & máy tính
 *  Tạo nhân vật → chọn chùa → đi lại trong khuôn viên chùa 3D, vào chánh điện,
 *  ngồi đệm, lạy Phật, lần hạt, tụng kinh, thiền, dâng lễ, thả đèn nguyện,
 *  khám phá địa danh, nghe sư trụ trì kể sự tích, nhận ấn hành hương.
 * ========================================================================= */
import { THREE, ANIM, BOARDS, PETAL_TEX } from '../temple3d.js';
import { Avatar } from './avatar.js';
import { buildWorld, smoke, LAYOUT } from './world.js';

const C = CBA.config, A = CBA.Audio;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fmt = (n) => Math.round(n || 0).toLocaleString('vi-VN');
const store = { get(k, d) { try { const v = localStorage.getItem('cba3d_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('cba3d_' + k, JSON.stringify(v)); } catch (e) {} } };
const TEMPLES = CBA.temples;
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---------------- hồ sơ người chơi ---------------- */
const P = Object.assign({ name: '', look: null, beads: 0, merit: 0, lay: 0, rounds: 0, medMin: 0, stories: [], quiz: 0, temples: {}, streak: 0, lastDay: '', days: 0, mala: 0, temple: 'binh-an' }, store.get('profile', {}));
let saveT = null; const save = () => { if (saveT) return; saveT = setTimeout(() => { saveT = null; store.set('profile', P); }, 800); };
const S = Object.assign({ npc: true, autoMo: true, amb: true, low: false }, store.get('settings', {}));
const saveS = () => store.set('settings', S);
const levelOf = (b) => { let i = 0; C.levels.forEach((l, k) => { if (b >= l.at) i = k; }); return i; };
const tp = (id) => (P.temples[id] = P.temples[id] || { pois: [], lay: 0, legend: false, stamp: false });
function addBeads(n, why) {
  const lv0 = levelOf(P.beads); P.beads += n; save(); hud();
  if (levelOf(P.beads) > lv0) { const L = C.levels[levelOf(P.beads)]; banner('🪷 Thăng cấp', `Cấp ${levelOf(P.beads) + 1} · ${L.name}`); A.smallBell(); }
}
function checkIn() {
  const d = new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000), key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  if (P.lastDay === key) return;
  const y = new Date(d.getTime() - 86400000), yk = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  P.streak = P.lastDay === yk ? P.streak + 1 : 1; P.days++; P.lastDay = key; save();
  if (P.days > 1) setTimeout(() => toast(`🔥 Lên chùa ngày thứ ${P.streak} liên tiếp · +${Math.min(21, P.streak * 3)} hạt`), 2500), addBeads(Math.min(21, P.streak * 3));
}

/* ---------------- giao diện chung ---------------- */
function toast(t) { const box = $('toasts'); const e = el('div', 'toast', t); box.append(e); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => e.remove(), 4200); }
function banner(k, t, sub = '') { const b = $('banner'); b.innerHTML = ''; b.append(el('small', '', k), el('b', '', t)); if (sub) b.append(el('span', '', sub)); b.classList.add('on'); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), 5200); }
let closeHook = null;
function modal(title, build, opts = {}) {
  const v = $('veil'); v.innerHTML = ''; v.hidden = false; paused = true;
  const box = el('div', 'modal' + (opts.wide ? ' wide' : '')); v.append(box);
  const head = el('div', 'mhead'); head.append(el('h2', '', title));
  if (!opts.noClose) { const x = el('button', 'x', '✕'); x.setAttribute('aria-label', 'Đóng'); x.onclick = closeModal; head.append(x); }
  box.append(head); build(box);
  v.onclick = (e) => { if (e.target === v && !opts.noClose) closeModal(); };
  return box;
}
function closeModal() { $('veil').hidden = true; $('veil').innerHTML = ''; paused = false; if (closeHook) { const f = closeHook; closeHook = null; f(); } }
let paused = false;

/* ---------------- 3D ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: !S.low, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(S.low ? 1 : 1.75, devicePixelRatio || 1));
renderer.shadowMap.enabled = !S.low; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const hemi = new THREE.HemisphereLight(0xfff4dd, 0x5a4a3a, 0.95); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b0, 1.5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 }); scene.add(sun); scene.add(sun.target);

let W = null, temple = null, smokes = [];
const me = { av: null, pos: new THREE.Vector3(), y: 0, yaw: 0, seated: null, busy: null, label: null };
const cam = { yaw: 0, pitch: 0.38, dist: 6.5 };   // yaw 0: camera ở phía +z sau lưng, nhìn về -z (phía chùa)
const npcs = []; let abbot = null;

function disposeWorld() {
  if (!W) return;
  scene.remove(W.root); W.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  smokes.forEach(s => s.dispose && s.dispose()); smokes = [];
  [...npcs, abbot].forEach(n => n && n.label && n.label.remove()); npcs.length = 0; abbot = null;
  [...scene.children].forEach(o => { if (o.isSprite || (o.userData && o.userData.tmp)) scene.remove(o); });
}
function loadTemple(id) {
  disposeWorld();
  temple = TEMPLES.find(t => t.id === id) || TEMPLES[0]; P.temple = temple.id; save();
  const sky = temple.model === 'yentu' ? 0xcfe0ea : temple.model === 'khmer' ? 0xbfe0f0 : 0xf0d6a8;
  scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(sky, 50, 190);
  W = buildWorld(scene, temple);
  const L = W.layout;
  // người chơi
  if (!me.av) { me.av = new Avatar({ look: P.look, seed: hash(P.name) }); me.label = label(P.name, 'me'); }
  scene.add(me.av.root);
  me.pos.set(L.spawn[0], 0, L.spawn[1]); me.y = W.col.heightAt(me.pos.x, me.pos.z, 50) ?? 0; me.seated = null; me.av.setPose('idle');
  me.yaw = Math.PI; cam.yaw = 0;
  // khói hương
  smokes = W.burners.map(b => { const f = smoke(scene, b); return { update: f }; });
  // sư trụ trì
  const ab = new Avatar({ look: { g: 'nam', hair: 'troc' }, seed: 7, monk: true }); ab.root.position.set(L.abbot[0], W.col.heightAt(L.abbot[0], L.abbot[1], 50) ?? 0, L.abbot[1]); scene.add(ab.root);
  abbot = { av: ab, label: label(C.storyteller.replace('Sư Ông', 'Sư trụ trì') || 'Sư trụ trì', 'abbot') }; abbot.av.root.userData.tmp = true;
  // Phật tử khác (mô phỏng, không phát âm thanh)
  if (S.npc) spawnNpcs();
  // âm thanh của chùa
  A.setTone(temple.tone); A.setTempleTrack(temple);
  A.ambience.stop();   // không phát tụng kinh nền
  $('tName').textContent = temple.name; $('tPlace').textContent = temple.place;
  banner('🏯 ' + (CBA.regions[temple.region] || 'Hành hương'), temple.name, temple.intro);
  objective(); drawMiniBase(); hud();
}

/* ---------------- nhãn tên trên đầu ---------------- */
function label(text, cls = '') { const e = el('div', 'nlabel ' + cls, text); $('labels').append(e); return e; }
const v3 = new THREE.Vector3();
function placeLabel(lbl, pos, h) {
  v3.set(pos.x, pos.y + h, pos.z).project(camera);
  const on = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
  lbl.style.display = on ? '' : 'none';
  if (on) lbl.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px, ${(-v3.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
}

/* ---------------- Phật tử khác ---------------- */
function spawnNpcs() {
  const names = CBA.simData.names;
  for (let i = 0; i < 6; i++) {
    const h = hash('npc' + i + temple.id);
    const av = new Avatar({ look: { g: h % 2 ? 'nu' : 'nam', hair: ['bui', 'dai', 'ngan', 'troc'][(h >>> 3) % 4], robe: ['lam', 'nau', 'xam', 'trang'][(h >>> 5) % 4] }, seed: h });
    const L = W.layout, x = L.spawn[0] + (Math.random() - 0.5) * 10, z = L.spawn[1] - 4 - Math.random() * 6;
    av.root.position.set(x, W.col.heightAt(x, z, 50) ?? 0, z); scene.add(av.root); av.root.userData.tmp = true;
    npcs.push({ av, label: label(names[(h >>> 7) % names.length], 'npc'), target: null, wait: Math.random() * 4, sit: null });
  }
}
function npcThink(n, dt) {
  const p = n.av.root.position;
  if (n.sit) { n.wait -= dt; if (Math.random() < dt * 0.15) n.av.bow(); if (n.wait <= 0) { n.sit.taken = false; n.sit = null; n.av.setPose('idle'); } return false; }
  if (!n.target) {
    n.wait -= dt; if (n.wait > 0) return false;
    const hall = W.halls[0];
    if (hall && Math.random() < 0.45) { const free = hall.cushions.filter(c => !c.taken && !(me.seated === c)); if (free.length) { const c = free[(Math.random() * free.length) | 0]; c.taken = true; n.target = c.clone(); n.goSit = c; } }
    if (!n.target) { const L = W.layout; n.target = new THREE.Vector3(L.spawn[0] + (Math.random() - 0.5) * 22, 0, L.spawn[1] - Math.random() * 18); }
  }
  const dx = n.target.x - p.x, dz = n.target.z - p.z, d = Math.hypot(dx, dz);
  if (d < 0.25) {
    if (n.goSit) { n.sit = n.goSit; n.goSit = null; n.av.root.rotation.y = W.halls[0] ? Math.atan2(W.halls[0].altar.x - p.x, W.halls[0].altar.z - p.z) : 0; n.av.setPose('kneel'); n.wait = 20 + Math.random() * 30; }
    n.target = null; n.wait = 2 + Math.random() * 5; return false;
  }
  const sp = 1.3 * dt, nx = p.x + dx / d * sp, nz = p.z + dz / d * sp, h = W.col.heightAt(nx, nz, p.y);
  if (h == null) { if (n.goSit) { n.goSit.taken = false; n.goSit = null; } n.target = null; n.wait = 1; return false; }
  p.set(nx, p.y + (h - p.y) * Math.min(1, dt * 10), nz); n.av.root.rotation.y = Math.atan2(dx, dz); n.av.speed = 0.6; return true;
}

/* ---------------- điều khiển ---------------- */
const keys = {};
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  keys[e.code] = true;
  if (!$('veil').hidden) { if (e.key === 'Escape') closeModal(); return; }
  if (e.code === 'KeyE' || e.code === 'Enter') $('ctx').click();
  if (e.code === 'KeyB') doBow();
  if (e.code === 'KeyT') malaOn ? closeMala() : openMala();
  if (e.code === 'KeyM') openTemplePicker();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
// cần điều khiển ảo
const joy = { id: null, x: 0, y: 0, cx: 0, cy: 0 };
const jbase = $('joy'), jknob = $('joyKnob');
function joyStart(e) { const t = e.changedTouches ? e.changedTouches[0] : e; joy.id = t.identifier ?? 'm'; const r = jbase.getBoundingClientRect(); joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2; joyMove(e); e.preventDefault(); }
function joyMove(e) {
  if (joy.id == null) return; const t = e.changedTouches ? [...e.changedTouches].find(x => x.identifier === joy.id) : e; if (!t) return;
  let dx = t.clientX - joy.cx, dy = t.clientY - joy.cy; const d = Math.hypot(dx, dy), R = 46; if (d > R) { dx *= R / d; dy *= R / d; }
  joy.x = dx / R; joy.y = dy / R; jknob.style.transform = `translate(${dx}px, ${dy}px)`; e.preventDefault();
}
function joyEnd(e) { const t = e.changedTouches ? [...e.changedTouches].find(x => x.identifier === joy.id) : e; if (e.changedTouches && !t) return; joy.id = null; joy.x = joy.y = 0; jknob.style.transform = ''; }
jbase.addEventListener('touchstart', joyStart, { passive: false }); addEventListener('touchmove', joyMove, { passive: false }); addEventListener('touchend', joyEnd); addEventListener('touchcancel', joyEnd);
jbase.addEventListener('mousedown', joyStart); addEventListener('mousemove', (e) => { if (joy.id === 'm') joyMove(e); }); addEventListener('mouseup', (e) => { if (joy.id === 'm') joyEnd(e); });
// kéo để xoay camera, cuộn / chụm để phóng to
const view = renderer.domElement; let drag = null, pinch = null;
view.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; drag = { x: e.clientX, y: e.clientY }; view.setPointerCapture(e.pointerId); });
view.addEventListener('pointermove', (e) => { if (!drag) return; cam.yaw -= (e.clientX - drag.x) * 0.006; cam.pitch = Math.max(0.05, Math.min(1.25, cam.pitch + (e.clientY - drag.y) * 0.004)); drag = { x: e.clientX, y: e.clientY }; });
view.addEventListener('pointerup', () => { drag = null; });
view.addEventListener('wheel', (e) => { cam.dist = Math.max(2.5, Math.min(16, cam.dist * (1 + Math.sign(e.deltaY) * 0.1))); e.preventDefault(); }, { passive: false });
view.addEventListener('touchstart', (e) => {
  const ts = [...e.changedTouches].filter(t => t.identifier !== joy.id);
  if (e.touches.length >= 2) { const [a, b] = e.touches; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), dist: cam.dist }; drag = null; }
  else if (ts.length) drag = { x: ts[0].clientX, y: ts[0].clientY, id: ts[0].identifier };
}, { passive: true });
view.addEventListener('touchmove', (e) => {
  if (pinch && e.touches.length >= 2) { const [a, b] = e.touches; cam.dist = Math.max(2.5, Math.min(16, pinch.dist * pinch.d / Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY))); return; }
  if (!drag) return; const t = [...e.touches].find(x => x.identifier === drag.id); if (!t) return;
  cam.yaw -= (t.clientX - drag.x) * 0.008; cam.pitch = Math.max(0.05, Math.min(1.25, cam.pitch + (t.clientY - drag.y) * 0.005)); drag.x = t.clientX; drag.y = t.clientY;
}, { passive: true });
view.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; if (drag && ![...e.touches].some(t => t.identifier === drag.id)) drag = null; });

/* ---------------- tương tác theo ngữ cảnh ---------------- */
let ctxAction = null;
const near = (p, r) => Math.hypot(me.pos.x - p.x, me.pos.z - p.z) < r && Math.abs(me.y - (p.y || 0)) < 2.5;
function findContext() {
  if (me.seated) return { label: '🧍 Đứng dậy', fn: standUp };
  const hall = W.halls.find(h => near(h.altar, 7));
  if (hall) { const c = hall.cushions.filter(c => !c.taken).sort((a, b) => a.distanceTo(me.pos) - b.distanceTo(me.pos))[0]; if (c && near(c, 1.4)) return { label: '🧘 Ngồi lên đệm', fn: () => sitOn(c, hall) }; }
  if (abbot && near(abbot.av.root.position, 2.6)) return { label: '📜 Nghe sự tích chùa', fn: legend };
  const bur = W.burners.find(b => near(b, 2.6)); if (bur) return { label: '🕯️ Thắp hương', fn: () => offerIncense(bur) };
  for (const p of W.layout.pois) if (p[5] && near({ x: p[1], z: p[2], y: me.y }, p[3])) {
    if (p[5] === 'ferry') return { label: '⛵ Lên thuyền', fn: ferry };
    if (p[5] === 'bell') return { label: '🔔 Thỉnh chuông', fn: ringBell };
  }
  if (hall) return { label: '🙏 Lạy Phật', fn: doBow };
  return null;
}
$('ctx').onclick = () => { if (ctxAction) ctxAction.fn(); };
function sitOn(c, hall) {
  me.seated = c; c.taken = true; me.pos.set(c.x, 0, c.z); me.y = c.y; me.yaw = Math.atan2(hall.altar.x - c.x, hall.altar.z - c.z); me.av.setPose('kneel'); cam.yaw = me.yaw + Math.PI;
  toast('Bạn đã ngồi trên đệm trước Tam Thế Phật'); setTimeout(() => me.av.bow(), 400);
}
function standUp() { if (me.seated) me.seated.taken = false; me.seated = null; me.av.setPose('idle'); }
function nearAltar() { return W.halls.some(h => near(h.altar, 7)); }

/* ---------------- hành động ---------------- */
let lastBow = 0;
function doBow() {
  if (Date.now() - lastBow < 2300) return; lastBow = Date.now();
  if (!me.seated && nearAltar()) me.av.setPose('kneel');
  me.av.bow(); A.mo(0.8); P.lay++; addBeads(3);
  if (S.voiceBow !== false) A.say('Nam mô A Di Đà Phật', { force: true, rate: 0.82, pitch: 0.85 });
  setTimeout(() => A.mo(0.6), 1100);
  if (nearAltar()) { const t = tp(temple.id); t.lay++; if (t.lay === 3) { toast('✅ Đã lễ Phật tại chánh điện'); objective(); } }
  if (P.lay % 108 === 0) banner('🙏 Lạy Phật', `Tròn ${fmt(P.lay)} lạy`);
  if (!me.seated && nearAltar()) setTimeout(() => { if (!me.seated) me.av.setPose('idle'); }, 2400);
  save();
}
let lastIncense = 0;
function offerIncense(bur) {
  if (Date.now() - lastIncense < 60000) { toast(`Nén hương vẫn đang cháy · đợi ${Math.ceil((60000 - (Date.now() - lastIncense)) / 1000)} giây`); return; }
  lastIncense = Date.now();
  me.yaw = Math.atan2(bur.x - me.pos.x, bur.z - me.pos.z); me.av.setPose('incense'); A.mo(1);
  if (S.voiceBow !== false) setTimeout(() => A.say('Nam mô A Di Đà Phật', { force: true, rate: 0.82, pitch: 0.85 }), 900);
  setTimeout(() => { me.av.bow(); }, 600);
  setTimeout(() => { me.av.setPose('idle'); smokeBoost = 4; P.merit += 10; addBeads(10); toast('🕯️ Đã thắp nén hương · +10 công đức'); }, 2800);
}
let smokeBoost = 0;
function ringBell() { if (Date.now() - (ringBell.t || 0) < 20000) return toast('Tiếng chuông còn đang ngân…'); ringBell.t = Date.now(); A.bigBell(); me.av.bow(); addBeads(9); toast('🔔 Một hồi chuông vang xa · nguyện chúng sanh thức tỉnh'); }
function ferry() {
  const F = W.layout.ferry; fade(() => { me.pos.set(F.to[0], 0, F.to[1]); me.y = W.col.heightAt(me.pos.x, me.pos.z, 50) ?? 0; toast('⛵ Thuyền đã cập bến · đi qua cổng tam quan, leo bậc đá lên động'); });
}
function fade(fn) { const f = $('fade'); f.classList.add('on'); setTimeout(() => { fn(); f.classList.remove('on'); }, 700); }

/* Tràng hạt: chuỗi hạt gỗ hiện ngay trên màn chơi, nhân vật tự về đệm ngồi */
let malaOn = false, malaAnim = 0;
function insideHall(h) { return h && Math.hypot(me.pos.x - h.altar.x, me.pos.z - h.altar.z) < Math.max(8, (h.d || 12) * 0.75) && Math.abs(me.y - h.altar.y) < 1.5; }
function openMala() {
  if (malaOn) return;
  const h = W.halls[0];
  if (!h) return toast('Chùa này chưa có chánh điện để ngồi lần hạt');
  // chỉ lần hạt khi đã vào chánh điện và ngồi trên đệm
  const seatAndOpen = () => {
    if (!me.seated) {
      const pref = h.cushions[P.seat ?? -1];
      const c = pref && !pref.taken ? pref : h.cushions.filter(x => !x.taken).sort((a, b) => a.distanceTo(me.pos) - b.distanceTo(me.pos))[0];
      if (!c) return toast('Các đệm đều đã có người ngồi, đợi một chút nhé');
      P.seat = h.cushions.indexOf(c); sitOn(c, h);
    }
    malaOn = true; document.body.classList.add('focus'); $('malaUI').hidden = false; cam.distBak = cam.dist; cam.dist = 3;
    paintMala();
  };
  if (insideHall(h)) seatAndOpen(); else { toast('🛕 Vào chánh điện, ngồi lên đệm để lần tràng hạt'); fade(seatAndOpen); }
}
function closeMala() { malaOn = false; document.body.classList.remove('focus'); $('malaUI').hidden = true; if (cam.distBak) cam.dist = cam.distBak; }
$('malaBack').onclick = (e) => { e.stopPropagation(); closeMala(); };
let lastBead = 0;
function tickBead() {
  if (Date.now() - lastBead < 170) return; lastBead = Date.now();
  P.mala++; A.mo(0.75); addBeads(1); malaAnim = 1;
  if (P.mala % 108 === 0) { P.rounds++; addBeads(54); A.smallBell(); banner('📿 Tràng hạt', `Viên mãn chuỗi thứ ${P.rounds}`, '+54 hạt'); ticker(`📿 ${P.name} vừa tròn một chuỗi 108 hạt`); }
  if (P.mala % 108 === 1) A.say('Nam mô A Di Đà Phật', { force: true, rate: 0.82, pitch: 0.85 });
}
{
  const cv = $('malaCv'); let y0 = null;
  cv.addEventListener('pointerdown', (e) => { y0 = e.clientY; tickBead(); });
  cv.addEventListener('pointermove', (e) => { if (y0 != null && e.clientY - y0 > 45) { y0 = e.clientY; tickBead(); } });
  addEventListener('pointerup', () => { y0 = null; });
  addEventListener('keydown', (e) => { if (!malaOn) return; if (e.code === 'Space' || e.key === 'ArrowDown') { e.preventDefault(); tickBead(); } if (e.key === 'Escape') closeMala(); });
}
function paintMala() {
  if (!malaOn) return;
  const cv = $('malaCv'), dpr = Math.min(2, devicePixelRatio || 1), Wd = innerWidth, Ht = innerHeight;
  if (cv.width !== Wd * dpr) { cv.width = Wd * dpr; cv.height = Ht * dpr; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, Wd, Ht);
  const cx = Wd / 2, cy = Ht * 0.66, rx = Math.min(110, Wd * 0.22), ry = Math.min(Ht * 0.27, 260), N = 26, r = Math.min(26, rx * 0.26);
  malaAnim = Math.max(0, malaAnim - 0.12);
  const ph = (P.mala % N) + (1 - malaAnim);
  const beads = [];
  for (let i = 0; i < N; i++) { const a = ((i + ph) / N) * Math.PI * 2; beads.push({ x: cx + Math.sin(a) * rx, y: cy - Math.cos(a) * ry, z: Math.cos(a), i }); }
  beads.sort((a, b) => a.z - b.z);
  beads.forEach(b => {
    const rr = r * (0.92 + 0.08 * b.z);
    const gr = g.createRadialGradient(b.x - rr * 0.35, b.y - rr * 0.4, rr * 0.1, b.x, b.y, rr);
    gr.addColorStop(0, '#fff3d6'); gr.addColorStop(0.45, '#e9c48c'); gr.addColorStop(1, '#a8743e');
    g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, rr, 0, 7); g.fill();
    g.strokeStyle = 'rgba(120,70,30,.35)'; g.lineWidth = 1.2; for (let k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(b.x, b.y + k * rr * 0.32, rr * 0.85, rr * 0.18, 0, 0, Math.PI); g.stroke(); }   // vân gỗ
  });
  // hạt chủ (đầu chuỗi) và tua
  const gx = cx, gy = cy + ry + r * 1.4; g.fillStyle = '#b8743a'; g.beginPath(); g.arc(gx, gy, r * 1.15, 0, 7); g.fill();
  g.strokeStyle = '#a3231a'; g.lineWidth = 3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(gx, gy + r); g.lineTo(gx + k * 5, gy + r * 3.2); g.stroke(); }
  const k = P.mala % 108;
  $('mNum').textContent = k; $('mSub').textContent = `${['Vòng thứ nhất', 'Vòng thứ hai', 'Vòng thứ ba'][Math.floor(P.mala / 108)] || `Vòng thứ ${Math.floor(P.mala / 108) + 1}`} · tổng ${P.rounds} chuỗi`;
  requestAnimationFrame(paintMala);
}

/* Tụng kinh */
let chanting = false;
function openChant() {
  modal('Tụng kinh', (b) => {
    const list = el('div', 'list');
    CBA.playlist.map((t, i) => ({ t, i })).filter(x => x.t.text || x.t.type === 'file').forEach(({ t, i }) => {
      const r = el('button', 'item'); r.append(el('b', '', t.title), el('small', '', t.temple ? 'Bài niệm riêng của chùa' : t.type === 'file' ? 'Bài thu âm' : 'Chữ kinh chạy theo nhịp mõ'));
      r.onclick = () => { closeModal(); startChant(i); }; list.append(r);
    });
    b.append(list, el('p', 'note', 'Mõ tự động gõ theo nhịp. Muốn tự gõ: bấm nút "Gõ mõ" — mõ tự động sẽ tắt để chỉ còn tiếng mõ của bạn.'));
  });
}
let chantRun = 0, moTimer = null;
async function startChant(i) {
  A.ensure(); chanting = true; A.ambience.duck(true); $('chant').hidden = false;
  const tr = CBA.playlist[i], lines = tr.text ? (CBA.texts[tr.text] || []) : [];
  if (tr.type === 'file' || !lines.length) { A.set({ autoMo: S.autoMo }); A.play(i); return; }   // bản thu âm: phát nguyên bài
  A.stop(); const run = ++chantRun;
  $('chantTitle').textContent = '🪵 Đang tụng: ' + tr.title;
  clearInterval(moTimer); if (S.autoMo) moTimer = setInterval(() => A.mo(0.7), 1100);   // mõ chậm, đều ~55 nhịp/phút
  for (let k = 0; k < lines.length && run === chantRun; k++) {
    $('chantLine').textContent = lines[k]; $('chantNext').textContent = lines[k + 1] || '';
    await A.say(lines[k], { force: true, rate: 0.8, pitch: 0.85 });
    addBeads(2);
    await new Promise(r => setTimeout(r, 450));
  }
  if (run === chantRun) { clearInterval(moTimer); A.smallBell(); addBeads(27); banner('🪵 Tụng kinh', 'Viên mãn: ' + tr.title, '+27 hạt'); stopChant(); }
}
function stopChant() { chantRun++; clearInterval(moTimer); A.stopVoice(); chanting = false; $('chant').hidden = true; A.ambience.duck(false); }
let lastMoTap = 0;
$('moBtn').onclick = () => {
  if (S.autoMo) { S.autoMo = false; saveS(); A.set({ autoMo: false }); clearInterval(moTimer); toast('Đã tắt mõ tự động · bạn tự gõ theo nhịp'); }
  if (Date.now() - lastMoTap < 450) return; lastMoTap = Date.now();   // giữ nhịp chậm, không dồn tiếng
  A.mo(1); addBeads(1); const b = $('moBtn'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
};
$('chantStop').onclick = () => { stopChant(); A.play(0); };
A.onChange(() => { const s = A.state(); $('chantTitle').textContent = s.title; $('chantLine').textContent = s.line || ''; $('chantNext').textContent = s.nextLine || ''; });

/* Thiền */
function openMeditate() {
  modal('Thiền định', (b) => {
    b.append(el('p', 'note', 'Ngồi thẳng lưng, thả lỏng vai, theo dõi hơi thở. Mỗi phút ngồi +9 hạt.'));
    const row = el('div', 'row'); [[5, '5 phút'], [10, '10 phút'], [20, '20 phút'], [0, 'Tự do']].forEach(([m, t]) => { const x = el('button', 'btn', t); x.onclick = () => { closeModal(); meditate(m); }; row.append(x); }); b.append(row);
  });
}
function meditate(min) {
  me.av.setPose('lotus'); A.ambience.duck(true); A.smallBell();
  const ov = $('med'); ov.hidden = false; const t0 = Date.now(); let paid = 0;
  const iv = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000), ph = s % 10;
    $('medLabel').textContent = ph < 4 ? 'Hít vào…' : 'Thở ra…'; $('breath').classList.toggle('in', ph < 4);
    $('medTime').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` + (min ? ` / ${String(min).padStart(2, '0')}:00` : '');
    const full = Math.floor(s / 60); if (full > paid) { paid = full; P.medMin++; addBeads(9); }
    if (min && s >= min * 60) end(true);
  }, 500);
  const end = (done) => { clearInterval(iv); ov.hidden = true; A.smallBell(); A.ambience.duck(false); me.av.setPose(me.seated ? 'kneel' : 'idle'); if (paid) banner('🧘 Thiền định', done ? `Viên mãn ${min} phút` : `Đã ngồi ${paid} phút`, `+${paid * 9} hạt`); };
  $('medStop').onclick = () => end(false);
}

/* Dâng lễ */
const OFFERS = [
  { id: 'nen', icon: '🕯', n: 'Đôi nến đỏ', m: 20, cd: 120 },
  { id: 'qua', icon: '🍑', n: 'Mâm ngũ quả', m: 30, cd: 180 },
  { id: 'sen', icon: '🌸', n: 'Bình hoa sen', m: 50, cd: 300 },
  { id: 'tra', icon: '🍵', n: 'Chén trà dâng Phật', m: 15, cd: 90 }
];
function openOffer() {
  const cds = store.get('cd', {});
  modal('Dâng lễ', (b) => {
    const list = el('div', 'list');
    OFFERS.forEach(o => {
      const left = Math.max(0, Math.ceil(((cds[o.id] || 0) - Date.now()) / 1000));
      const r = el('button', 'item' + (left ? ' wait' : '')); r.disabled = !!left;
      r.append(el('b', '', `${o.icon} ${o.n}`), el('small', '', left ? `Đợi ${Math.ceil(left / 60)} phút` : `+${o.m} công đức · cầm lên tay, đặt trên bàn thờ`));
      r.onclick = () => { cds[o.id] = Date.now() + o.cd * 1000; store.set('cd', cds); closeModal(); carryOffering(o); };
      list.append(r);
    });
    b.append(list, el('p', 'note', 'Thắp hương: đến lư hương lớn giữa chánh điện và bấm "Thắp hương". Lễ vật trong game miễn phí — quý ở tấm lòng.'));
  });
}
/* mô hình lễ vật */
function offeringMesh(id) {
  const g = new THREE.Group(), M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o));
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  if (id === 'qua') {
    add(new THREE.CylinderGeometry(0.2, 0.14, 0.05, 20), M(0xd9a83a, { metalness: 0.7, roughness: 0.3 }), 0, 0.025);
    [[0xff8c1a, 0, 0.1, 0], [0xe63b2e, 0.09, 0.09, 0.03], [0xffd23f, -0.09, 0.09, 0.03], [0x8bc34a, 0.04, 0.09, -0.09], [0xff6f61, -0.05, 0.17, -0.02]].forEach(([c, x, y, z]) => add(new THREE.SphereGeometry(0.065, 12, 10), M(c), x, y, z));
  } else if (id === 'sen') {
    add(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 14), M(0x3f8a7a, { roughness: 0.3 }), 0, 0.11);
    [[-0.05, 0.36], [0.05, 0.4], [0, 0.46]].forEach(([x, y]) => { add(new THREE.CylinderGeometry(0.006, 0.006, y - 0.18, 5), M(0x3f7a3a), x, (y + 0.18) / 2); add(new THREE.ConeGeometry(0.05, 0.12, 8), M(0xff9fb8), x, y); });
  } else if (id === 'tra') {
    add(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 18), M(0x8a5a2a), 0, 0.01);
    add(new THREE.CylinderGeometry(0.05, 0.035, 0.06, 14), M(0xf0ece0, { roughness: 0.3 }), 0.05, 0.05);
    add(new THREE.SphereGeometry(0.07, 14, 10), M(0xf0ece0, { roughness: 0.3 }), -0.06, 0.08).scale.y = 0.8;
  } else {
    [-0.07, 0.07].forEach(x => { add(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 10), M(0xc0392b), x, 0.13); add(new THREE.ConeGeometry(0.02, 0.06, 8), new THREE.MeshBasicMaterial({ color: 0xffd36b }), x, 0.3); });
  }
  return g;
}
let carrying = null, slotIdx = 0;
function dropCarry() { if (carrying) { me.av.root.remove(carrying); carrying = null; } me.av.setPose('idle'); }
function carryOffering(o) {
  const h = W.halls[0]; if (!h) return toast('Chùa này chưa có bàn thờ để dâng lễ');
  const go = () => {
    const item = offeringMesh(o.id); item.position.set(0, 0.86, 0.32); me.av.root.add(item); carrying = item; me.av.setPose('carry');
    toast(`${o.icon} Cầm ${o.n.toLowerCase()} lên chánh điện`);
    const slots = h.offerSlots.length ? h.offerSlots : [h.altar.clone()];
    const slot = slots[slotIdx++ % slots.length];
    const fwd = h.burner ? h.burner.clone().sub(slot).setY(0).normalize() : new THREE.Vector3(0, 0, 1);
    const side = new THREE.Vector3(fwd.z, 0, -fwd.x).multiplyScalar(Math.sign(slot.clone().sub(h.burner || slot).dot(new THREE.Vector3(fwd.z, 0, -fwd.x))) || 1);
    const stand = slot.clone().add(fwd.clone().multiplyScalar(0.7)); stand.y = 0;
    const pts = [];
    if (h.burner) { const pass = h.burner.clone().add(side.clone().multiplyScalar(1.6)).add(fwd.clone().multiplyScalar(0.8)); pts.push(pass); pts.push(h.burner.clone().add(side.clone().multiplyScalar(1.6)).sub(fwd.clone().multiplyScalar(0.9))); }
    pts.push(stand);
    walkTo(pts, () => {
      me.yaw = Math.atan2(slot.x - me.pos.x, slot.z - me.pos.z);
      // đặt lễ vật lên bàn thờ
      const wp = item.getWorldPosition(new THREE.Vector3()); me.av.root.remove(item); item.position.copy(wp); item.rotation.y = me.yaw; item.userData.tmp = true; scene.add(item); carrying = null;
      const from = wp.clone(), t0 = performance.now();
      const fly = () => { const k = Math.min(1, (performance.now() - t0) / 700); item.position.lerpVectors(from, slot, k); item.position.y += Math.sin(k * Math.PI) * 0.25; if (k < 1) requestAnimationFrame(fly); };
      fly();
      me.av.setPose('idle'); setTimeout(() => { me.av.bow(); A.smallBell(); if (S.voiceBow !== false) A.say('Nam mô A Di Đà Phật', { force: true, rate: 0.82, pitch: 0.85 }); }, 600);
      P.merit += o.m; addBeads(o.m); toast(`${o.icon} Đã dâng ${o.n.toLowerCase()} · +${o.m} công đức`); ticker(`${o.icon} ${P.name} vừa dâng ${o.n.toLowerCase()} lên Tam Thế Phật`);
    });
  };
  const inside = Math.hypot(me.pos.x - h.altar.x, me.pos.z - h.altar.z) < Math.max(8, (h.d || 12) * 0.75);
  if (inside) go(); else fade(() => { const c = h.cushions[h.cushions.length - 1] || h.altar; me.pos.set(c.x, 0, c.z + 0.8); me.y = c.y || h.altar.y; go(); });
}

/* Đèn nguyện */
const lanterns = [];
function openWish() {
  modal('Thả đèn nguyện', (b) => {
    const ta = el('textarea'); ta.id = 'wish'; ta.rows = 3; ta.maxLength = 80; ta.placeholder = 'VD: Nguyện cho mẹ con mau khỏe, gia đình bình an';
    const go = el('button', 'btn gold', '🏮 Thả đèn');
    go.onclick = () => { const t = ta.value.trim(); if (t.length < 4) return ta.focus(); closeModal(); releaseLantern(t); };
    b.append(ta, go);
  });
}
function releaseLantern(text) {
  const g = new THREE.Group(); g.userData.tmp = true;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.4, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xff9a3a, emissive: 0xff7a1a, emissiveIntensity: 1.6, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
  g.add(body); const lt = new THREE.PointLight(0xffa040, 1.2, 6); g.add(lt);
  g.position.set(me.pos.x, me.y + 1.6, me.pos.z); scene.add(g); lanterns.push({ g, t: 0 });
  P.merit += 5; addBeads(5); toast('🏮 Đèn nguyện đã bay lên: “' + text + '”'); A.khanh();
}

/* Nghe truyện / sự tích */
function openStories() {
  modal('Sư trụ trì kể chuyện', (b) => {
    CBA.storySeries.forEach(se => {
      const st = CBA.stories.filter(x => x.series === se.id); if (!st.length) return;
      const det = el('details'); det.append(el('summary', '', `${se.icon} ${se.name} · ${st.filter(x => P.stories.includes(x.id)).length}/${st.length}`));
      st.forEach(x => { const r = el('button', 'item sm'); r.append(el('b', '', (P.stories.includes(x.id) ? '✓ ' : '') + x.title)); r.onclick = () => { closeModal(); tell(x); }; det.append(r); });
      b.append(det);
    });
  }, { wide: true });
}
function legend() {
  const id = temple.legendStory || (temple.legend ? 'chua_' + temple.id : null);
  const st = CBA.stories.find(s => s.id === id);
  if (!st) { tell(CBA.stories[(Math.random() * CBA.stories.length) | 0]); return; }
  abbot.av.bow(); tell(st, true);
}
function tell(st, isLegend = false) {
  const pages = st.scenes.concat(['🪷 ' + st.moral]); let i = 0;
  const box = $('story'); box.hidden = false; A.ambience.duck(true);
  $('sTitle').textContent = st.title; $('sSeries').textContent = isLegend ? `📜 Sự tích ${temple.name}` : '📖 Sư trụ trì kể chuyện';
  const show = () => { $('sText').textContent = pages[i]; $('sPage').textContent = `${i + 1}/${pages.length}`; $('sOpts').innerHTML = ''; $('sNext').hidden = false; $('sNext').textContent = i < pages.length - 1 ? 'Trang sau ›' : 'Câu đố ›'; A.speak(pages[i], 'story'); };
  $('sNext').onclick = () => { i++; if (i < pages.length) show(); else quiz(); };
  $('sClose').onclick = () => { box.hidden = true; A.speak('', 'cancel'); A.ambience.duck(false); };
  const quiz = () => {
    const q = st.quiz; $('sText').textContent = '❓ ' + q.q; $('sNext').hidden = true; $('sPage').textContent = 'Đố vui'; A.speak('Câu đố. ' + q.q, 'story');
    const o = $('sOpts'); o.innerHTML = '';
    q.options.forEach((t, k) => { const b = el('button', 'opt'); b.append(el('b', '', 'ABC'[k]), document.createTextNode(' ' + t)); b.onclick = () => {
      [...o.children].forEach((x, j) => { x.disabled = true; x.classList.add(j === q.answer ? 'right' : 'wrong'); });
      const ok = k === q.answer;
      if (!P.stories.includes(st.id)) { P.stories.push(st.id); addBeads(9); }
      if (ok) { P.quiz++; addBeads(27); A.smallBell(); }
      if (isLegend) { tp(temple.id).legend = true; objective(); }
      $('sText').textContent = ok ? '🎉 Chính xác! +27 hạt' : `Đáp án đúng: ${'ABC'[q.answer]}. ${q.options[q.answer]}`;
      save(); hud();
    }; o.append(b); });
  };
  show();
}

/* ---------------- Sổ hành hương (mục tiêu mỗi chùa) ---------------- */
function objective() {
  if (!temple) return;
  const t = tp(temple.id), L = W.layout, total = L.pois.length, seen = t.pois.length;
  let text;
  if (t.stamp) text = `✅ Đã nhận Ấn ${temple.name} · chọn chùa khác trên bản đồ`;
  else if (t.lay < 3) text = `1/3 · Vào chánh điện lạy Phật (${t.lay}/3 lạy)`;
  else if (seen < total) text = `2/3 · Khám phá địa danh (${seen}/${total})`;
  else if (!t.legend) text = '3/3 · Gặp sư trụ trì nghe sự tích chùa';
  else { t.stamp = true; save(); text = `✅ Đã nhận Ấn ${temple.name}`; A.bigBell(); banner('📜 Ấn hành hương', temple.name, `Đã đủ ${Object.values(P.temples).filter(x => x.stamp).length}/${TEMPLES.length} ấn · +108 hạt`); addBeads(108); }
  $('obj').textContent = text;
}
function checkPois() {
  const t = tp(temple.id);
  W.layout.pois.forEach((p) => {
    if (t.pois.includes(p[0])) return;
    if (Math.hypot(me.pos.x - p[1], me.pos.z - p[2]) < p[3]) {
      t.pois.push(p[0]); save(); addBeads(18); A.khanh();
      banner('📍 Khám phá địa danh', p[0], p[4]); objective(); drawMiniBase();
    }
  });
}

/* ---------------- Phật Quang: mỗi 10 phút, 50% may mắn ---------------- */
let pqNext = Date.now() + C.phatQuang.everyMin * 60000;
function phatQuang() {
  pqNext = Date.now() + C.phatQuang.everyMin * 60000;
  const h = W.halls[0]; const lucky = Math.random() < C.phatQuang.chance;
  if (!lucky) { toast('☀️ Phật Quang vừa tỏa khắp chùa · lần sau sẽ đến lượt bạn'); return; }
  const from = h ? h.altar.clone().add(new THREE.Vector3(0, 2.4, 0)) : me.pos.clone().add(new THREE.Vector3(0, 12, 0));
  const to = new THREE.Vector3(me.pos.x, me.y + 1.7, me.pos.z), len = from.distanceTo(to);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.35, len, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.copy(from).lerp(to, 0.5); beam.lookAt(to); beam.rotateX(Math.PI / 2); beam.userData.tmp = true; scene.add(beam);
  const ring = new THREE.PointLight(0xffe0a0, 3, 6); ring.position.copy(to); ring.userData.tmp = true; scene.add(ring);
  setTimeout(() => { scene.remove(beam); scene.remove(ring); }, 6000);
  A.khanh(); A.bigBell(0.8); addBeads(C.phatQuang.bonus); banner('☀️ Phật Quang phổ chiếu', 'Hào quang chiếu đến bạn', `+${C.phatQuang.bonus} hạt · mỗi 10 phút có 50% may mắn`);
}

/* ---------------- HUD ---------------- */
function hud() {
  if (!P.name) return;
  const lv = levelOf(P.beads), L = C.levels, nxt = L[lv + 1];
  $('pName').textContent = P.name; $('pLv').textContent = `Cấp ${lv + 1} · ${L[lv].name}`;
  $('pBar').style.width = (nxt ? Math.min(100, (P.beads - L[lv].at) / (nxt.at - L[lv].at) * 100) : 100) + '%';
  $('pBeads').textContent = fmt(P.beads) + ' hạt'; $('pInit').textContent = P.name.trim().split(' ').pop()[0] || '🙏';
}
setInterval(() => { const l = Math.max(0, pqNext - Date.now()); $('pq').textContent = `☀️ ${Math.floor(l / 60000)}:${String(Math.floor(l / 1000) % 60).padStart(2, '0')}`; if (l <= 0 && W) phatQuang(); }, 1000);

/* ---------------- bản đồ nhỏ ---------------- */
const mini = $('mini'), mctx = mini.getContext('2d'); let miniBase = null;
function drawMiniBase() {
  const c = document.createElement('canvas'); c.width = c.height = 220; const g = c.getContext('2d');
  g.fillStyle = '#4a6a3a'; g.fillRect(0, 0, 220, 220);
  const k = 220 / 90, o = 110, toM = (x, z) => [o + (x - me.pos.x * 0) * k, o + z * k];
  g.fillStyle = '#7a8a6a'; W.col.cones.forEach(cn => { const [x, y] = toM(cn.x, cn.z); g.beginPath(); g.arc(x, y, cn.r * k, 0, 7); g.fill(); });
  g.fillStyle = '#3c7f9a'; W.col.waters.forEach(w => { const [x, y] = toM(w.min.x, w.min.z); g.fillRect(x, y, (w.max.x - w.min.x) * k, (w.max.z - w.min.z) * k); });
  g.fillStyle = '#c9b48a'; W.col.boxes.forEach(b => { if (b.top < 0.4) return; const [x, y] = toM(b.x0, b.z0); g.fillRect(x, y, (b.x1 - b.x0) * k, (b.z1 - b.z0) * k); });
  const t = tp(temple.id);
  W.layout.pois.forEach(p => { const [x, y] = toM(p[1], p[2]); g.fillStyle = t.pois.includes(p[0]) ? '#ffd36b' : '#ffffff'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.strokeStyle = '#3a1a0a'; g.lineWidth = 1.5; g.stroke(); });
  miniBase = { c, k, o };
}
function drawMini() {
  if (!miniBase) return; const { c, k, o } = miniBase, S2 = mini.width;
  mctx.save(); mctx.clearRect(0, 0, S2, S2); mctx.beginPath(); mctx.arc(S2 / 2, S2 / 2, S2 / 2, 0, 7); mctx.clip();
  const px = o + me.pos.x * k, pz = o + me.pos.z * k, z = 1.6;
  mctx.translate(S2 / 2, S2 / 2); mctx.scale(z * S2 / 220, z * S2 / 220); mctx.drawImage(c, -px, -pz);
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.translate(S2 / 2, S2 / 2); mctx.rotate(-me.yaw + Math.PI);
  mctx.fillStyle = '#ff4a2a'; mctx.beginPath(); mctx.moveTo(0, -9); mctx.lineTo(6, 6); mctx.lineTo(-6, 6); mctx.fill(); mctx.restore();
}

/* ---------------- chọn chùa ---------------- */
function openTemplePicker(first = false) {
  modal(first ? 'Chọn chùa để viếng' : 'Bản đồ hành hương', (b) => {
    const tabs = el('div', 'tabs'), list = el('div', 'tlist');
    const regs = [['all', 'Tất cả'], ['bac', 'Miền Bắc'], ['trung', 'Miền Trung'], ['nam', 'Miền Nam']];
    const paint = (r) => {
      list.innerHTML = '';
      TEMPLES.filter(t => r === 'all' ? true : t.region === r).forEach(t => {
        const st = P.temples[t.id] || {};
        const card = el('button', 'tcard' + (temple && temple.id === t.id ? ' cur' : ''));
        const im = el('div', 'timg'); im.style.backgroundImage = `url(assets/temples/${t.id}.jpg)`; im.append(el('span', '', t.home ? '🏠' : '卍'));
        card.append(im, el('b', '', t.name), el('small', '', `${CBA.regions[t.region] || 'Chùa nhà'} · ${t.place}`), el('em', st.stamp ? 'ok' : '', st.stamp ? '📜 Đã có ấn' : `Địa danh ${(st.pois || []).length}/${(LAYOUT[t.id] || LAYOUT['binh-an']).pois.length}`));
        card.onclick = () => { closeModal(); fade(() => loadTemple(t.id)); };
        list.append(card);
      });
    };
    regs.forEach(([k, n], i) => { const x = el('button', i ? '' : 'on', n); x.onclick = () => { [...tabs.children].forEach(y => y.classList.toggle('on', y === x)); paint(k); }; tabs.append(x); });
    const big = el('a', 'btn', '🗺 Bản đồ Việt Nam & mô hình 3D'); big.href = 'map.html'; big.target = '_blank'; big.rel = 'noopener';
    b.append(tabs, list, el('p', 'note', `Ấn hành hương: ${Object.values(P.temples).filter(x => x.stamp).length}/${TEMPLES.length} · Mỗi chùa: lễ Phật, khám phá địa danh, nghe sự tích.`), big);
    paint('all');
  }, { wide: true, noClose: first });
}

/* ---------------- hồ sơ ---------------- */
function openProfile() {
  modal('Hồ sơ tu tập', (b) => {
    const lv = levelOf(P.beads);
    const rows = [['Cấp', `${lv + 1} · ${C.levels[lv].name}`], ['Hạt', fmt(P.beads)], ['Công đức', fmt(P.merit)], ['Số lạy', fmt(P.lay)], ['Chuỗi tràng hạt', fmt(P.rounds)], ['Phút thiền', fmt(P.medMin)], ['Chuỗi ngày', P.streak + ' ngày'], ['Truyện đã nghe', `${P.stories.length}/${CBA.stories.length}`], ['Câu đố đúng', fmt(P.quiz)]];
    const ul = el('ul', 'stats'); rows.forEach(([k, v]) => { const li = el('li'); li.append(el('span', '', k), el('b', '', v)); ul.append(li); }); b.append(ul);
    b.append(el('h3', '', '📜 Ấn hành hương'));
    const g = el('div', 'stamps'); TEMPLES.filter(t => !t.home).forEach(t => { const s = el('div', 'stamp' + ((P.temples[t.id] || {}).stamp ? ' on' : ''), t.name.replace('Chùa ', '')); g.append(s); }); b.append(g);
  });
}

/* ---------------- cài đặt (có kết nối TikTok LIVE) ---------------- */
function openSettings() {
  modal('Cài đặt', (b) => {
    const st = A.state();
    const tg = (label, on, fn) => { const r = el('label', 'tg'); const c = el('input'); c.type = 'checkbox'; c.checked = on; c.onchange = () => fn(c.checked); r.append(c, document.createTextNode(' ' + label)); return r; };
    b.append(el('h3', '', '🔊 Âm thanh'),
      tg('Nhạc nền / tụng kinh', st.musicOn, v => A.set({ musicOn: v })),
      tg('Tiếng mõ, chuông của bạn', st.sfxOn, v => A.set({ sfxOn: v })),
      tg('Chuông chùa tự vang mỗi phút', S.amb, v => { S.amb = v; saveS(); }),
      tg('Mõ tự động khi tụng kinh', S.autoMo, v => { S.autoMo = v; saveS(); A.set({ autoMo: v }); }),
      tg('Giọng đọc truyện', st.storyTtsOn, v => A.set({ storyTtsOn: v })),
      tg('Niệm "Nam mô A Di Đà Phật" khi lạy', S.voiceBow !== false, v => { S.voiceBow = v; saveS(); }));
    b.append(el('h3', '', '🗣 Giọng đọc tiếng Việt'));
    const vs = A.voices();
    if (vs.length) {
      const sel = el('select'); sel.id = 'voice'; vs.forEach(n => { const o = el('option', '', n); o.value = n; sel.append(o); }); sel.value = A.voiceName();
      sel.onchange = () => A.setVoice(sel.value);
      const t = el('button', 'btn', '▶ Nghe thử'); t.onclick = () => { A.set({ storyTtsOn: true }); A.speak('A Di Đà Phật. Chào mừng quý Phật tử về thăm chùa.', 'story'); };
      b.append(sel, t, el('p', 'note', 'Giọng nam tự nhiên giọng Bắc: "NamMinh" (trình duyệt Microsoft Edge) hoặc "Microsoft An" (Windows). iPhone chỉ có giọng nữ — để có giọng nam tự nhiên trên mọi máy, tạo file giọng đọc bằng tao-giong-doc.bat (xem README).'));
    } else b.append(el('p', 'note warn', 'Máy chưa có giọng đọc tiếng Việt nên game không đọc truyện (để tránh giọng tiếng Anh). Cách thêm: Windows → Cài đặt → Thời gian & ngôn ngữ → Thêm Tiếng Việt kèm giọng nói; hoặc mở game bằng trình duyệt Microsoft Edge (có sẵn giọng HoaiMy giọng Bắc). Android: Cài đặt → Chuyển văn bản thành giọng nói → Tiếng Việt.'));
    b.append(el('h3', '', '🎮 Trò chơi'),
      tg('Phật tử khác trong chùa (mô phỏng, không phát tiếng mõ)', S.npc, v => { S.npc = v; saveS(); toast('Áp dụng khi đổi chùa'); }),
      tg('Đồ họa nhẹ (máy yếu) — áp dụng khi tải lại', S.low, v => { S.low = v; saveS(); }));
    const row = el('div', 'row'); const ch = el('button', 'btn', 'Đổi nhân vật'); ch.onclick = () => characterForm(false); row.append(ch); b.append(row);
    b.append(el('h3', '', '📡 Phát trực tiếp TikTok LIVE'),
      el('p', 'note', 'Chế độ livestream: màn hình dọc 9:16 cho TikTok LIVE Studio / OBS, người xem tham gia bằng comment, tim, quà qua TikFinity. Cần chạy game trên máy tính bằng start.bat.'));
    const lr = el('div', 'row');
    const a1 = el('a', 'btn gold', 'Bảng điều khiển livestream'); a1.href = 'index.html'; a1.target = '_blank';
    const a2 = el('a', 'btn', 'Màn hình phát 9:16'); a2.href = 'live.html'; a2.target = '_blank';
    lr.append(a1, a2); b.append(lr);
  }, { wide: true });
}

/* ---------------- tạo nhân vật ---------------- */
function characterForm(first) {
  const look = Object.assign({ g: 'nu', hair: 'bui', robe: 'lam' }, P.look);
  modal(first ? 'Tạo nhân vật lên chùa' : 'Đổi nhân vật', (box) => {
    const f = el('div', 'form');
    const pv = el('div', 'pv'); f.append(pv);
    let pvR = null; const preview = () => { pvR = pvR || previewRenderer(pv); pvR.set(look); };
    const name = el('input'); name.id = 'pname'; name.maxLength = 24; name.placeholder = 'Pháp danh / tên hiển thị'; name.value = P.name || '';
    const choice = (key, opts) => { const row = el('div', 'choice'); opts.forEach(([v, t, sw]) => { const b = el('button', look[key] === v ? 'on' : '', t); if (sw) { const i = el('i'); i.style.background = sw; b.prepend(i); } b.onclick = () => { look[key] = v; [...row.children].forEach(x => x.classList.toggle('on', x === b)); preview(); }; row.append(b); }); return row; };
    f.append(el('label', '', 'Pháp danh'), name, el('label', '', 'Giới tính'), choice('g', [['nam', 'Nam'], ['nu', 'Nữ']]),
      el('label', '', 'Kiểu tóc'), choice('hair', [['bui', 'Búi'], ['dai', 'Dài'], ['ngan', 'Ngắn'], ['troc', 'Cạo']]),
      el('label', '', 'Áo'), choice('robe', [['lam', 'Áo tràng lam', '#7f93b6'], ['nau', 'Áo nâu', '#9c6b45'], ['xam', 'Áo xám', '#8d8f98'], ['trang', 'Áo trắng', '#e6e6ee']]));
    const err = el('div', 'err'), go = el('button', 'btn gold', first ? '🙏 Tiếp tục' : 'Lưu');
    go.onclick = () => {
      const n = name.value.trim().replace(/\s+/g, ' '); if (n.length < 2) { err.textContent = 'Nhập pháp danh (ít nhất 2 ký tự).'; return name.focus(); }
      P.name = n; P.look = Object.assign({}, look); save(); if (pvR) pvR.dispose();
      if (me.av) { me.av.setLook(look); me.label.textContent = n; }
      closeModal(); hud();
      if (first) { A.ensure(); checkIn(); openTemplePicker(true); }
    };
    f.append(err, go, el('p', 'note', 'Tiến trình tu tập lưu trên trình duyệt này.')); box.append(f);
    setTimeout(preview, 30);
  }, { noClose: first });
}
function previewRenderer(host) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.setSize(140, 180); host.append(r.domElement);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x664422, 1.2)); const dl = new THREE.DirectionalLight(0xffffff, 1); dl.position.set(2, 3, 4); sc.add(dl);
  const cm = new THREE.PerspectiveCamera(35, 140 / 180, 0.1, 20); cm.position.set(0, 1.1, 4.2); cm.lookAt(0, 0.95, 0);
  let av = null, alive = true; const t0 = performance.now();
  const loop = () => { if (!alive) return; if (av) { av.root.rotation.y = Math.sin((performance.now() - t0) / 1400) * 0.8; av.update(0.016, false); } r.render(sc, cm); requestAnimationFrame(loop); }; loop();
  return { set(look) { if (av) sc.remove(av.root); av = new Avatar({ look, seed: 3 }); sc.add(av.root); }, dispose() { alive = false; r.dispose(); } };
}

/* ---------------- thanh hành động ---------------- */
[['🙏', 'Lạy Phật', doBow], ['📿', 'Tràng hạt', openMala], ['🪵', 'Tụng kinh', openChant], ['🧘', 'Thiền', openMeditate], ['🪔', 'Dâng lễ', openOffer], ['🔔', 'Thỉnh chuông', ringBell]]
  .forEach(([i, t, fn]) => { const b = el('button', 'act'); b.append(el('span', 'ic', i), el('span', 'lb', t)); b.onclick = () => { A.ensure(); fn(); }; $('acts').append(b); });
$('miniBtn').onclick = () => openTemplePicker(); $('setBtn').onclick = openSettings; $('pChip').onclick = openProfile;
$('tName').onclick = () => openTemplePicker(); $('bPass').onclick = openProfile; $('bProf').onclick = openProfile; $('bStory').onclick = openStories; $('bWish').onclick = openWish;
$('zIn').onclick = () => { cam.dist = Math.max(2.5, cam.dist * 0.8); }; $('zOut').onclick = () => { cam.dist = Math.min(16, cam.dist * 1.25); };
$('goBtn').onclick = () => {   // ra sân ngắm cảnh ↔ vào chánh điện
  const h = W.halls[0]; if (!h) return;
  const inHall = Math.hypot(me.pos.x - h.altar.x, me.pos.z - h.altar.z) < 7;
  standUp();
  fade(() => {
    if (inHall) { const L = W.layout; me.pos.set(L.spawn[0], 0, L.spawn[1]); me.y = W.col.heightAt(me.pos.x, me.pos.z, 50) ?? 0; me.yaw = Math.PI; cam.yaw = 0; }
    else { const c = h.cushions[h.cushions.length - 1]; me.pos.set(c.x, 0, c.z + 0.9); me.y = c.y; me.yaw = Math.atan2(h.altar.x - c.x, h.altar.z - c.z); cam.yaw = me.yaw + Math.PI; }
    updGo();
  });
};
function updGo() { const h = W && W.halls[0]; const inHall = h && Math.hypot(me.pos.x - h.altar.x, me.pos.z - h.altar.z) < 7; $('goBtn').textContent = inHall ? '🌳 Ra sân ngắm cảnh' : '🛕 Vào chánh điện'; }
setInterval(() => { if (W) { updGo(); $('online').textContent = `${1 + npcs.length} đang tu tập`; } }, 1000);
/* dòng tin chạy */
function ticker(t) { const e = $('tickerText'); e.textContent = t; e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; }
setInterval(() => {
  if (!W || !npcs.length) return; const n = npcs[(Math.random() * npcs.length) | 0], nm = n.label.textContent;
  n.beads = (n.beads || 200 + (Math.random() * 3000 | 0)) + 108; if (Math.random() < 0.35) n.merit = (n.merit || 0) + 30 + (Math.random() * 60 | 0);
  ticker(['📿 ' + nm + ' vừa tròn một chuỗi 108 hạt', '🕯️ ' + nm + ' vừa thắp nén hương', '🙏 ' + nm + ' vừa lạy Phật tại chánh điện', '🏮 ' + nm + ' vừa thả đèn nguyện'][(Math.random() * 4) | 0]);
}, 24000);
/* bảng vàng trong chánh điện */
setInterval(() => {
  if (!BOARDS.length) return;
  const rows = [[P.name, P.beads], ...npcs.map(n => [n.label.textContent, n.beads || (n.beads = 200 + (Math.random() * 3000 | 0))])].sort((a, b) => b[1] - a[1]).map(([n, v]) => [n, fmt(v)]);
  const meritRows = [[P.name, P.merit], ...npcs.map(n => [n.label.textContent, (n.merit = n.merit || (Math.random() * 400 | 0))])].sort((a, b) => b[1] - a[1]);
  BOARDS.forEach((b, i) => b.draw(i === 0 ? rows : meritRows.map(([n, v]) => [n, fmt(v)])));
  checkRanks(meritRows);
}, 3000);

/* camera không xuyên tường: tia từ người chơi tới camera cắt hộp va chạm nào gần nhất (0..1) */
function rayBoxes(a, b) {
  let best = 1; const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  for (const bx of W.col.boxes) {
    if (bx.top < a.y - 0.6 || bx.top - bx.bottom < 1.2) continue;
    let t0 = 0, t1 = 1;
    for (const [o, d, lo, hi] of [[a.x, dx, bx.x0, bx.x1], [a.y, dy, bx.bottom, bx.top], [a.z, dz, bx.z0, bx.z1]]) {
      if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { t0 = 2; break; } continue; }
      let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) break;
    }
    if (t0 <= t1 && t0 > 0.02 && t0 < best) best = t0;
  }
  return best;
}
/* chuông chùa tự vang mỗi phút (bấm "Thỉnh chuông" thì vang ngay) */
setInterval(() => { if (W && S.amb && !paused) { A.bigBell(); } }, 60000);

/* ---------------- tự đi tới đích (dâng lễ, về chỗ) ---------------- */
let auto = null;   // { pts: [Vector3...], done, stuck }
function walkTo(pts, done) { standUp(); auto = { pts: pts.map(p => p.clone()), done, stuck: 0 }; }
function autoStep(dt) {
  if (!auto) return false;
  const tgt = auto.pts[0]; const dx = tgt.x - me.pos.x, dz = tgt.z - me.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.18) { auto.pts.shift(); if (!auto.pts.length) { const f = auto.done; auto = null; if (f) f(); } return false; }
  const sp = Math.min(d, 2.6 * dt), nx = me.pos.x + dx / d * sp, nz = me.pos.z + dz / d * sp, h = W.col.heightAt(nx, nz, me.y);
  if (h == null) { auto.stuck += dt; if (auto.stuck > 0.6) { me.pos.x = nx; me.pos.z = nz; } } else { me.pos.x = nx; me.pos.z = nz; auto.stuck = 0; }
  let dy = Math.atan2(dx, dz) - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * Math.min(1, dt * 10); me.av.speed = 0.7;
  return true;
}

/* ---------------- mưa hoa mỗi 5 phút ---------------- */
let shower = null;
function petalShower() {
  if (!W || shower) return;
  const N = 420, pos = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) { pos[i * 3] = me.pos.x + (Math.random() - 0.5) * 26; pos[i * 3 + 1] = me.y + 6 + Math.random() * 10; pos[i * 3 + 2] = me.pos.z + (Math.random() - 0.5) * 26; vel.push(0.6 + Math.random() * 0.9); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: PETAL_TEX(), size: 0.28, transparent: true, alphaTest: 0.25, depthWrite: false })); pts.userData.tmp = true; scene.add(pts);
  shower = { pts, pos, vel, t: 0, y0: me.y }; A.khanh(); ticker('🌸 Mưa hoa sen rơi khắp chùa · nguyện cho tất cả được an lạc');
}
function showerStep(dt) {
  if (!shower) return; shower.t += dt; const { pos, vel } = shower;
  for (let i = 0; i < vel.length; i++) { pos[i * 3 + 1] -= vel[i] * dt; pos[i * 3] += Math.sin(shower.t * 1.3 + i) * dt * 0.4; if (pos[i * 3 + 1] < shower.y0 && shower.t < 14) pos[i * 3 + 1] += 14; }
  shower.pts.geometry.attributes.position.needsUpdate = true;
  if (shower.t > 22) { scene.remove(shower.pts); shower = null; }
}
setInterval(() => { if (W && !paused) petalShower(); }, 5 * 60000);
setTimeout(() => { if (W) petalShower(); }, 40000);

/* ---------------- rồng chuỗi hạt khi có người lên hạng Bảng Công Đức ---------------- */
const fx = $('fx2d'), fg = fx.getContext('2d'); let dragon = null, lastRanks = null, lastDragon = 0;
function sizeFx() { const r = Math.min(2, devicePixelRatio || 1); fx.width = innerWidth * r; fx.height = innerHeight * r; fg.setTransform(r, 0, 0, r, 0, 0); }
addEventListener('resize', sizeFx); sizeFx();
function checkRanks(rows) {
  const names = rows.map(r => r[0]);
  if (lastRanks && Date.now() - lastDragon > 45000) {
    for (let k = 0; k < Math.min(3, names.length); k++) {
      const n = names[k], before = lastRanks.indexOf(n);
      if (before === -1 || before > k) { lastDragon = Date.now(); launchDragon(n, k + 1); break; }
    }
  }
  lastRanks = names;
}
function launchDragon(name, rank) {
  const who = name === P.name ? me.av : (npcs.find(n => n.label.textContent === name) || {}).av;
  let sx = innerWidth / 2, sy = innerHeight * 0.6;
  if (who) { v3.copy(who.root.position); v3.y += who.height - 0.4; v3.project(camera); sx = (v3.x * 0.5 + 0.5) * innerWidth; sy = (-v3.y * 0.5 + 0.5) * innerHeight; who.necklace.visible = false; }
  dragon = { t: 0, sx, sy, hist: [], who };
  A.bigBell(); A.khanh(0.6);
  banner('🐉 Bảng Công Đức', `${name} lên hạng ${rank}`, 'Chuỗi hạt hóa rồng bay lên chúc mừng');
  ticker(`🐉 ${name} vừa lên hạng ${rank} Bảng Công Đức`);
}
function dragonStep(dt) {
  fg.clearRect(0, 0, innerWidth, innerHeight);
  if (!dragon) return; const d = dragon; d.t += dt;
  const W2 = innerWidth, H2 = innerHeight, T = 10;
  // đầu rồng: 1 giây đầu bay lên từ người, sau đó lượn sóng khắp màn hình
  let hx, hy;
  if (d.t < 1) { const k = d.t; hx = d.sx + (W2 * 0.5 - d.sx) * k; hy = d.sy + (H2 * 0.3 - d.sy) * k - Math.sin(k * Math.PI) * 80; }
  else { const th = (d.t - 1) * 0.9; hx = W2 * 0.5 + Math.sin(th) * W2 * 0.38; hy = H2 * 0.36 + Math.sin(th * 2.1) * H2 * 0.16 + Math.cos(th * 0.7) * 30; }
  d.hist.unshift([hx, hy]); if (d.hist.length > 300) d.hist.pop();
  const fade = Math.min(1, (T - d.t) / 1.2), N = 34, R = Math.max(9, Math.min(W2, H2) * 0.022);
  fg.save(); fg.globalAlpha = Math.max(0, fade);
  for (let i = N - 1; i >= 0; i--) {
    const p = d.hist[Math.min(d.hist.length - 1, i * 4)]; if (!p) continue;
    const r = R * (1 - i / N * 0.55);
    const gr = fg.createRadialGradient(p[0] - r * 0.35, p[1] - r * 0.4, r * 0.1, p[0], p[1], r);
    gr.addColorStop(0, '#fff6d6'); gr.addColorStop(0.45, i % 6 === 0 ? '#ffd36b' : '#e9c48c'); gr.addColorStop(1, i % 6 === 0 ? '#b87a14' : '#9c6a36');
    fg.shadowColor = 'rgba(255,210,100,.9)'; fg.shadowBlur = 14; fg.fillStyle = gr; fg.beginPath(); fg.arc(p[0], p[1], r, 0, 7); fg.fill();
  }
  // đầu rồng
  const h0 = d.hist[0], h1 = d.hist[3] || h0, a = Math.atan2(h0[1] - h1[1], h0[0] - h1[0]);
  fg.translate(h0[0], h0[1]); fg.rotate(a); fg.shadowBlur = 24;
  fg.fillStyle = '#f3c047'; fg.beginPath(); fg.ellipse(R * 0.6, 0, R * 1.7, R * 1.1, 0, 0, 7); fg.fill();
  fg.beginPath(); fg.moveTo(R * 1.6, -R * 0.5); fg.lineTo(R * 3, -R * 0.25); fg.lineTo(R * 3, R * 0.35); fg.lineTo(R * 1.6, R * 0.6); fg.fill();
  fg.strokeStyle = '#ffe9a0'; fg.lineWidth = 3; fg.lineCap = 'round';
  fg.beginPath(); fg.moveTo(0, -R * 0.8); fg.quadraticCurveTo(-R * 1.4, -R * 2.6, -R * 2.4, -R * 2.1); fg.stroke();
  fg.beginPath(); fg.moveTo(0, R * 0.8); fg.quadraticCurveTo(-R * 1.4, R * 2.6, -R * 2.4, R * 2.1); fg.stroke();
  fg.strokeStyle = '#fff6d0'; fg.lineWidth = 2;
  fg.beginPath(); fg.moveTo(R * 2.8, -R * 0.1); fg.quadraticCurveTo(R * 4, -R * 1.8, R * 5.2, -R * 0.8); fg.stroke();
  fg.beginPath(); fg.moveTo(R * 2.8, R * 0.2); fg.quadraticCurveTo(R * 4, R * 1.8, R * 5.2, R * 1.0); fg.stroke();
  fg.shadowBlur = 0; fg.fillStyle = '#b3261e'; fg.beginPath(); fg.arc(R * 1.2, -R * 0.45, R * 0.22, 0, 7); fg.fill(); fg.beginPath(); fg.arc(R * 1.2, R * 0.45, R * 0.22, 0, 7); fg.fill();
  fg.rotate(-a); const pg = fg.createRadialGradient(Math.cos(a) * R * 6, Math.sin(a) * R * 6, 0, Math.cos(a) * R * 6, Math.sin(a) * R * 6, R * 1.4);
  pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, 'rgba(255,230,150,0)'); fg.fillStyle = pg; fg.beginPath(); fg.arc(Math.cos(a) * R * 6, Math.sin(a) * R * 6, R * 1.4, 0, 7); fg.fill();   // ngọc
  fg.restore();
  if (d.t > T) { if (d.who) d.who.necklace.visible = true; dragon = null; fg.clearRect(0, 0, W2, H2); }
}

/* ---------------- vòng lặp ---------------- */
const clock = new THREE.Clock(); const fwd = new THREE.Vector3();
function loop() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  if (W && me.av) {
    // di chuyển
    let ix = 0, iz = 0;
    if (!paused) { if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1; ix += joy.x; iz += joy.y; }
    const mag = Math.min(1, Math.hypot(ix, iz)), manual = mag > 0.12 && $('med').hidden;
    if (manual && auto) { auto = null; if (me.av.target === 'carry') { dropCarry(); } }
    if (malaOn && !me.seated) closeMala();
    const autoMoving = !manual && autoStep(dt), moving = manual;
    if (moving && me.seated) standUp();
    if (moving && ['kneel', 'lotus', 'incense'].includes(me.av.target)) me.av.setPose('idle');
    if (moving) {
      // hướng đi theo camera: tiến = từ camera nhìn tới nhân vật
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
      const mx = fx * -iz + rx * ix, mz = fz * -iz + rz * ix, a = Math.atan2(mx, mz), sp = (keys.ShiftLeft ? 5.5 : 3.4) * mag * dt;
      const nx = me.pos.x + Math.sin(a) * sp, nz = me.pos.z + Math.cos(a) * sp;
      let h = W.col.heightAt(nx, nz, me.y);
      if (h != null) { me.pos.x = nx; me.pos.z = nz; }
      else { const hx = W.col.heightAt(nx, me.pos.z, me.y), hz = W.col.heightAt(me.pos.x, nz, me.y); if (hx != null) { me.pos.x = nx; h = hx; } else if (hz != null) { me.pos.z = nz; h = hz; } }
      let dy = a - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * Math.min(1, dt * 12);
      me.av.speed = mag * (keys.ShiftLeft ? 1.5 : 1);
    }
    if (!me.seated) { const g = W.col.heightAt(me.pos.x, me.pos.z, me.y + 0.01) ?? me.y; me.y += (g - me.y) * Math.min(1, dt * (g < me.y ? 6 : 14)); }
    me.av.root.position.set(me.pos.x, me.y, me.pos.z); me.av.root.rotation.y = me.yaw; me.av.update(dt, moving || autoMoving);
    showerStep(dt); dragonStep(dt);
    // camera
    const tgt = new THREE.Vector3(me.pos.x, me.y + 1.05, me.pos.z);
    // trong chánh điện: camera thấp & gần để không bị mái che
    const hallIn = W.halls.find(h => Math.hypot(me.pos.x - h.altar.x, me.pos.z - h.altar.z) < Math.max(8, (h.d || 12) * 0.75) && Math.abs(me.y - h.altar.y) < 1.5);
    W.halls.forEach(h => h.roofs.forEach(r => { r.visible = h !== hallIn; }));   // ở trong điện: ẩn mái để nhìn bao quát
    const inHall = !!hallIn;
    const dist = malaOn ? 3.2 : inHall ? Math.max(6.5, Math.min(cam.dist + 3, 11)) : cam.dist, pitch = malaOn ? 0.42 : inHall ? Math.max(cam.pitch, 0.62) : cam.pitch;
    let cp = new THREE.Vector3(tgt.x + Math.sin(cam.yaw) * Math.cos(pitch) * dist, tgt.y + Math.sin(pitch) * dist, tgt.z + Math.cos(cam.yaw) * Math.cos(pitch) * dist);
    const hit = rayBoxes(tgt, cp); if (hit < 1) cp = tgt.clone().lerp(cp, Math.max(0.15, hit - 0.08));
    camera.position.lerp(cp, Math.min(1, dt * 8)); camera.lookAt(tgt);
    sun.position.set(me.pos.x + 25, 45, me.pos.z + 20); sun.target.position.copy(tgt);
    // NPC, sư trụ trì, nhãn
    npcs.forEach(n => { const mv = npcThink(n, dt); n.av.update(dt, mv); placeLabel(n.label, n.av.root.position, n.av.height + 0.15); });
    if (abbot) { abbot.av.update(dt, false); abbot.av.root.rotation.y = Math.atan2(me.pos.x - abbot.av.root.position.x, me.pos.z - abbot.av.root.position.z); placeLabel(abbot.label, abbot.av.root.position, abbot.av.height + 0.15); }
    placeLabel(me.label, me.av.root.position, me.av.height + 0.15);
    ANIM.forEach(f => f(t));
    smokes.forEach(s => s.update(dt, smokeBoost)); smokeBoost = Math.max(0, smokeBoost - dt);
    lanterns.forEach(l => { l.t += dt; l.g.position.y += dt * 1.1; l.g.position.x += Math.sin(l.t) * dt * 0.3; }); while (lanterns.length && lanterns[0].t > 30) scene.remove(lanterns.shift().g);
    // ngữ cảnh, địa danh, âm thanh theo khoảng cách
    if ((t * 10 | 0) % 3 === 0) {
      ctxAction = findContext(); const cb = $('ctx'); cb.hidden = !ctxAction; if (ctxAction) cb.textContent = ctxAction.label;
      checkPois();

    }
    drawMini();
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

window.__game = { me, get W() { return W; }, P, cam, loadTemple, launchDragon: (n, r) => launchDragon(n, r), petalShower: () => petalShower() };   // hỗ trợ kiểm thử
/* ---------------- bắt đầu ---------------- */
$('loading').remove();
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
if (P.name) {
  modal('A Di Đà Phật!', (b) => {
    b.append(el('p', 'big', `Chào ${P.name} trở lại chùa.`), el('p', 'note', `Cấp ${levelOf(P.beads) + 1} · ${C.levels[levelOf(P.beads)].name} · ${fmt(P.beads)} hạt`));
    const row = el('div', 'row');
    const go = el('button', 'btn gold', '🙏 Vào chùa'); go.onclick = () => { A.ensure(); checkIn(); closeModal(); fade(() => loadTemple(P.temple)); };
    const pick = el('button', 'btn', '🗺 Chọn chùa khác'); pick.onclick = () => { A.ensure(); checkIn(); openTemplePicker(true); };
    const ch = el('button', 'btn', 'Đổi nhân vật'); ch.onclick = () => characterForm(false);
    row.append(go, pick, ch); b.append(row);
  }, { noClose: true });
} else characterForm(true);
hud();
loop();
