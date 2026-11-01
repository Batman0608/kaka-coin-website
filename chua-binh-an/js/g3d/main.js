/* =========================================================================
 *  CHÙA BÌNH AN 3D — game chơi trên điện thoại & máy tính
 *  Tạo nhân vật → chọn chùa → đi lại trong khuôn viên chùa 3D, vào chánh điện,
 *  ngồi đệm, lạy Phật, lần hạt, tụng kinh, thiền, dâng lễ, thả đèn nguyện,
 *  khám phá địa danh, nghe sư trụ trì kể sự tích, nhận ấn hành hương.
 * ========================================================================= */
import { THREE, ANIM, BOARDS, PETAL_TEX, mount } from '../temple3d.js';
import { Avatar } from './avatar.js';
import { initShop, badgeOf } from './shop.js';
import { buildWorld, smoke, LAYOUT } from './world.js';
import { bootAccount, initAccount } from './account.js';
import { initNet } from './net.js';

await bootAccount();   // máy đã đăng nhập → lấy tiến trình mới nhất từ tài khoản trước khi đọc dữ liệu

const C = CBA.config, A = CBA.Audio;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fmt = (n) => Math.round(n || 0).toLocaleString('vi-VN');
const store = { get(k, d) { try { const v = localStorage.getItem('cba3d_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { if (window.__cbaLock) return; try { localStorage.setItem('cba3d_' + k, JSON.stringify(v)); } catch (e) {} } };
const TEMPLES = CBA.temples;
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---------------- hồ sơ người chơi ---------------- */
const P = Object.assign({ name: '', look: null, beads: 0, merit: 0, lay: 0, rounds: 0, medMin: 0, stories: [], quiz: 0, temples: {}, streak: 0, lastDay: '', days: 0, mala: 0, temple: 'binh-an' }, store.get('profile', {}));
let saveT = null; const save = () => { if (saveT) return; saveT = setTimeout(() => { saveT = null; store.set('profile', P); }, 800); };
const S = Object.assign({ npc: true, autoMo: true, amb: true, low: false }, store.get('settings', {}));
const saveS = () => store.set('settings', S);
const levelOf = (b) => { let i = 0; C.levels.forEach((l, k) => { if (b >= l.at) i = k; }); return i; };
const tp = (id) => (P.temples[id] = P.temples[id] || { pois: [], lay: 0, legend: false, stamp: false });
const lunarMult = () => { try { return (CBA.Lunar && CBA.Lunar.today().mult) || 1; } catch (e) { return 1; } };
let feastShown = '';
function addBeads(n, why) {
  const mult = lunarMult(); if (mult > 1) n = Math.round(n * mult);   // ngày Rằm, Mùng Một, vía Phật: nhân hạt
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

let meritLbl = null;
function disposeWorld() {
  if (!W) return;
  scene.remove(W.root); W.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  smokes.forEach(s => s.dispose && s.dispose()); smokes = [];
  [...npcs, abbot].forEach(n => n && n.label && n.label.remove()); npcs.length = 0; abbot = null;
  if (meritLbl) { meritLbl.remove(); meritLbl = null; }
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
  if (!me.av) { me.av = new Avatar({ look: P.look, seed: hash(P.name) }); me.label = label(P.name + (badgeOf(P) ? ' ' + badgeOf(P) : ''), 'me'); }
  scene.add(me.av.root);
  // mỗi người xuất hiện lệch một chút quanh điểm vào chùa, để người chơi thật không đứng chồng lên nhau
  me.pos.set(L.spawn[0], 0, L.spawn[1]);
  for (let k = 0; k < 8; k++) { const x = L.spawn[0] + (Math.random() - 0.5) * 5, z = L.spawn[1] + (Math.random() - 0.5) * 3, h = W.col.heightAt(x, z, 50); if (h != null && Math.abs(h - (W.col.heightAt(L.spawn[0], L.spawn[1], 50) ?? 0)) < 0.3) { me.pos.set(x, 0, z); break; } }
  me.y = W.col.heightAt(me.pos.x, me.pos.z, 50) ?? 0; me.seated = null; me.av.setPose('idle');
  me.yaw = Math.PI; cam.yaw = 0;
  // khói hương
  smokes = W.burners.map(b => { const f = smoke(scene, b); return { update: f }; });
  // sư trụ trì
  const ab = new Avatar({ look: { g: 'nam', hair: 'troc' }, seed: 7, monk: true }); ab.root.position.set(L.abbot[0], W.col.heightAt(L.abbot[0], L.abbot[1], 50) ?? 0, L.abbot[1]); scene.add(ab.root);
  abbot = { av: ab, label: label(C.storyteller.replace('Sư Ông', 'Sư trụ trì') || 'Sư trụ trì', 'abbot') }; abbot.av.root.userData.tmp = true;
  if (W.merit) meritLbl = label('💝 Hòm công đức', 'merit');
  // Phật tử khác (mô phỏng, không phát âm thanh)
  if (S.npc) spawnNpcs();
  if (typeof NET !== 'undefined') NET.join(temple.id);   // nhiều người chơi thật (nếu có máy chủ)
  // âm thanh của chùa
  A.setTone(temple.tone); A.setTempleTrack(temple);
  A.ambience.stop();   // không phát tụng kinh nền
  $('tName').textContent = temple.name; $('tPlace').textContent = temple.place;
  banner('🏯 ' + (CBA.regions[temple.region] || 'Hành hương'), temple.name, temple.intro);
  objective(); drawMiniBase(); hud();
  try { const f = CBA.Lunar && CBA.Lunar.today(); if (f && f.feast && f.mult > 1 && feastShown !== f.feast.name) { feastShown = f.feast.name; setTimeout(() => banner('🪷 ' + f.feast.name, 'Hôm nay lên chùa được nhân phúc', `Công đức và hạt ×${f.mult}`), 2000); } } catch (e) {}
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
    npcs.push({ av, label: label((() => { let k = (h >>> 7) % names.length; while (npcs.some(n => n.label.textContent === names[k]) && npcs.length < names.length) k = (k + 1) % names.length; return names[k]; })(), 'npc'), target: null, wait: Math.random() * 4, sit: null });
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
  if (W.merit && near(W.merit, 1.7)) return { label: '💝 Hòm công đức', fn: () => SHOP.openDonate(temple) };
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
function sitOn(c, hall, quiet) {
  me.seated = c; c.taken = true; me.pos.set(c.x, 0, c.z); me.y = c.y; me.yaw = Math.atan2(hall.altar.x - c.x, hall.altar.z - c.z); me.av.setPose('kneel'); cam.yaw = me.yaw + Math.PI;
  if (!quiet) { toast('Bạn đã ngồi trên đệm trước Tam Thế Phật'); setTimeout(() => me.av.bow(), 400); }
}
/* quay mặt vào Phật, lưng ra ngoài · camera đứng sau lưng */
function faceAltar(h) { h = h || W.halls[0]; if (!h) return; me.yaw = Math.atan2(h.altar.x - me.pos.x, h.altar.z - me.pos.z); cam.yaw = me.yaw + Math.PI; }
/* tự đi về đệm trống gần nhất trong chánh điện rồi làm việc tiếp theo */
function goSit(then) {
  const h = W.halls[0]; if (!h) return then && then();
  if (me.seated) { faceAltar(h); return then && then(); }
  const pref = h.cushions[P.seat ?? -1];
  const pick = () => (pref && !pref.taken ? pref : h.cushions.filter(x => !x.taken).sort((a, b) => a.distanceTo(me.pos) - b.distanceTo(me.pos))[0]);
  const sit = (c) => { P.seat = h.cushions.indexOf(c); sitOn(c, h, true); setTimeout(() => then && then(), 450); };
  if (insideHall(h)) {
    const c = pick(); if (!c) { faceAltar(h); return then && then(); }
    c.taken = true;   // giữ chỗ trong lúc đi tới
    walkTo([new THREE.Vector3(c.x, 0, c.z)], () => { c.taken = false; sit(c); });
  } else {
    toast('🛕 Vào chánh điện, về đệm ngồi lạy Phật');
    fade(() => { const c = pick(); if (c) sit(c); else { me.pos.set(h.altar.x, 0, h.altar.z + 4); me.y = h.altar.y; faceAltar(h); then && then(); } });
  }
}
function standUp() { if (me.seated) me.seated.taken = false; me.seated = null; me.av.setPose('idle'); }
function nearAltar() { return W.halls.some(h => near(h.altar, 7)); }

/* ---------------- hành động ---------------- */
let lastBow = 0;
function doBow() {
  if (Date.now() - lastBow < 2300) return;
  if (auto) return;
  if (!me.seated && W.halls[0]) { lastBow = Date.now(); return goSit(() => { lastBow = 0; doBow(); }); }   // về đệm trước rồi mới lạy
  lastBow = Date.now();
  if (me.seated) faceAltar();
  me.av.bow(); A.mo(0.8); P.lay++; addBeads(3); NET.act('bow');
  if (S.voiceBow !== false) A.say('Nam mô A Di Đà Phật', { force: true, rate: 0.82, pitch: 0.85 });
  setTimeout(() => A.mo(0.6), 1100);
  if (nearAltar() || W.halls.some(h => insideHall(h))) { const t = tp(temple.id); t.lay++; if (t.lay <= 3) toast(`🙏 Lễ Phật tại chánh điện ${t.lay}/3`); objective(); }   // ngồi đệm nào trong điện cũng được tính
  if (P.lay % 108 === 0) banner('🙏 Lạy Phật', `Tròn ${fmt(P.lay)} lạy`);
  if (!me.seated && nearAltar()) setTimeout(() => { if (!me.seated) me.av.setPose('idle'); }, 2400);
  save();
}
let lastIncense = 0;
function offerIncense(bur) {
  if (Date.now() - lastIncense < 60000) { toast(`Nén hương vẫn đang cháy · đợi ${Math.ceil((60000 - (Date.now() - lastIncense)) / 1000)} giây`); return; }
  lastIncense = Date.now();
  me.yaw = Math.atan2(bur.x - me.pos.x, bur.z - me.pos.z); cam.yaw = me.yaw + Math.PI; me.av.setPose('incense'); A.mo(1);
  if (S.voiceBow !== false) setTimeout(() => A.say('Nam mô A Di Đà Phật', { force: true, rate: 0.82, pitch: 0.85 }), 900);
  setTimeout(() => { me.av.bow(); }, 600); NET.act('incense');
  setTimeout(() => { me.av.setPose('idle'); smokeBoost = 4; P.merit += 10; addBeads(10); toast('🕯️ Đã thắp nén hương · +10 công đức'); }, 2800);
}
let smokeBoost = 0;
function ringBell() { if (Date.now() - (ringBell.t || 0) < 20000) return toast('Tiếng chuông còn đang ngân…'); ringBell.t = Date.now(); A.bigBell(); me.av.bow(); NET.act('bell'); addBeads(9); toast('🔔 Một hồi chuông vang xa · nguyện chúng sanh thức tỉnh'); }
function ferry() {
  const F = W.layout.ferry; fade(() => { me.pos.set(F.to[0], 0, F.to[1]); me.y = W.col.heightAt(me.pos.x, me.pos.z, 50) ?? 0; toast('⛵ Thuyền đã cập bến · đi qua cổng tam quan, leo bậc đá lên động'); });
}
function fade(fn) { const f = $('fade'); f.classList.add('on'); setTimeout(() => { fn(); f.classList.remove('on'); }, 700); }

/* Tràng hạt: chuỗi hạt gỗ hiện ngay trên màn chơi, nhân vật tự về đệm ngồi */
let malaOn = false, malaAnim = 0;
const _lp = new THREE.Vector3();
function inHallBox(h, pos, y) {   // trong lòng chánh điện (tọa độ riêng của điện)
  if (!h) return false; _lp.set(pos.x, y, pos.z); h.group.worldToLocal(_lp);
  return Math.abs(_lp.x) < (h.w || 12) / 2 + 0.3 && _lp.z > -(h.d || 10) / 2 - 0.3 && _lp.z < (h.d || 10) / 2 + 1.2 && Math.abs(y - h.altar.y) < 1.5;
}
function insideHall(h) { return inHallBox(h, me.pos, me.y); }
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
  if (P.mala % 108 === 0) { P.rounds++; addBeads(54); A.smallBell(); banner('📿 Tràng hạt', `Viên mãn chuỗi thứ ${P.rounds}`, '+54 hạt'); ticker(`📿 ${P.name} vừa tròn một chuỗi 108 hạt`); NET.act('mala'); }
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
/* các bài tụng: chữ kinh hiện cuộn, câu đang tụng sáng lên */
const CHANTS = [
  { key: 'niemADiDa', name: 'Niệm Phật', sub: 'Niệm hồng danh A Di Đà Phật & chư Bồ Tát', bpm: 60, loop: true },
  { key: 'batNha', name: 'Bát Nhã Tâm Kinh', sub: 'Bản Hán Việt · ngài Huyền Trang dịch', bpm: 66 },
  { key: 'vangSanh', name: 'Chú Vãng Sanh', sub: 'Bạt nhất thiết nghiệp chướng căn bản đắc sanh Tịnh Độ đà-ra-ni', bpm: 62, repeat: 3 },
  { key: 'tamTheNiem', name: 'Tam Thế Phật', sub: 'Niệm hồng danh chư Phật ba đời', bpm: 60 },
  { key: 'hoiHuong', name: 'Kệ Hồi Hướng', sub: 'Hồi hướng công đức đến khắp chúng sanh', bpm: 56 }
];
let chantRun = 0, moTimer = null, ch = null;   // ch = { c, lines, idx, beats, taps }
function chantLinesOf(c) { let L = (CBA.texts[c.key] || []).slice(); if (c.repeat) { const one = L; L = []; for (let k = 0; k < c.repeat; k++) L.push(...one); } return L; }
function openChant() {
  if (chanting) return;
  A.ensure();
  const start = () => { const pref = CHANTS.findIndex(c => c.key === S.chantKey); startChant(pref >= 0 ? pref : 0); };
  if (W.halls[0]) goSit(start); else start();
}
function renderChantTabs() {
  const t = $('chantTabs'); t.innerHTML = '';
  CHANTS.forEach((c, i) => { const b = el('button', ch && ch.c === c ? 'on' : '', c.name); b.onclick = () => { if (!ch || ch.c !== c) startChant(i); }; t.append(b); });
}
function startChant(i) {
  const c = CHANTS[i]; S.chantKey = c.key; saveS(); NET.act('chant', c.n || c.title || '');
  chantRun++; clearInterval(moTimer); A.stopVoice(); A.stop && A.stop();
  chanting = true; document.body.classList.add('focus'); $('chant').hidden = false; A.ambience.duck(true);
  ch = { c, lines: chantLinesOf(c), idx: 0, beats: 0, taps: ch ? ch.taps : 0 };
  renderChantTabs(); $('chantSub').textContent = c.sub;
  const box = $('chantLines'); box.innerHTML = ''; ch.lines.forEach(l => box.append(el('p', '', l)));
  $('optVoice').checked = S.chantVoice !== false; $('optAuto').checked = !!S.autoMo; $('optTempo').value = S.tempo || c.bpm;
  me.av.setPose(me.seated ? 'kneel' : 'idle'); faceAltar();
  showChantLine(); restartMo(); runVoice(chantRun);
}
function showChantLine() {
  const ps = $('chantLines').children, k = ch.idx, hgt = ps[0] ? ps[0].offsetHeight || 39 : 39, win = $('chantLines').parentElement.offsetHeight || 196;
  for (let j = 0; j < ps.length; j++) ps[j].className = j === k ? 'cur' : Math.abs(j - k) === 1 ? 'near' : '';
  $('chantLines').style.transform = `translateY(${win / 2 - hgt / 2 - k * hgt}px)`;
  $('cNum').textContent = k + 1; $('cTot').textContent = '/ ' + ch.lines.length; $('cMerit').textContent = `+${ch.taps} công đức`;
}
function nextChantLine() {
  if (!ch) return; addBeads(2);
  if (ch.idx < ch.lines.length - 1) { ch.idx++; ch.beats = 0; showChantLine(); return true; }
  // viên mãn một biến
  A.smallBell(); addBeads(27); banner('🪵 Tụng kinh', 'Viên mãn: ' + ch.c.name, '+27 hạt');
  ch.idx = 0; ch.beats = 0; showChantLine(); return true;   // tụng tiếp biến sau
}
/* giọng đọc: đọc xong câu mới sang câu kế tiếp */
async function runVoice(run) {
  if (!$('optVoice').checked) return;
  while (run === chantRun && ch && $('optVoice').checked) {
    await A.say(ch.lines[ch.idx], { force: true, rate: 0.8, pitch: 0.85 });
    if (run !== chantRun || !$('optVoice').checked) return;
    await new Promise(r => setTimeout(r, 380));
    if (run !== chantRun) return;
    nextChantLine();
  }
}
/* không có giọng đọc: mỗi câu = 4 tiếng mõ (tự động hoặc tự gõ) */
function chantBeat(manual) {
  if (!ch) return;
  A.mo(manual ? 1 : 0.7); paintMo(1);
  if (manual) { ch.taps++; P.merit += 1; addBeads(1); $('cMerit').textContent = `+${ch.taps} công đức`; }
  if (!$('optVoice').checked && ++ch.beats >= 4) nextChantLine();
}
function restartMo() { clearInterval(moTimer); if ($('optAuto').checked) moTimer = setInterval(() => chantBeat(false), 60000 / (+$('optTempo').value || 60)); }
function stopChant() { chantRun++; clearInterval(moTimer); A.stopVoice(); chanting = false; ch = null; $('chant').hidden = true; document.body.classList.remove('focus'); A.ambience.duck(false); save(); }
$('chantClose').onclick = stopChant;
$('optVoice').onchange = () => { S.chantVoice = $('optVoice').checked; saveS(); if (S.chantVoice) { chantRun++; ch.beats = 0; runVoice(chantRun); } else { chantRun++; A.stopVoice(); } };
$('optAuto').onchange = () => { S.autoMo = $('optAuto').checked; saveS(); A.set({ autoMo: S.autoMo }); restartMo(); };
$('optTempo').oninput = () => { S.tempo = +$('optTempo').value; saveS(); restartMo(); };
let lastMoTap = 0;
$('moBtn').onclick = () => {
  if (Date.now() - lastMoTap < 280) return; lastMoTap = Date.now();
  chantBeat(true); const b = $('moBtn'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
};
addEventListener('keydown', (e) => { if (!chanting) return; if (e.code === 'Space') { e.preventDefault(); $('moBtn').click(); } if (e.key === 'Escape') stopChant(); });
/* vẽ mõ gỗ (cá gỗ) + dùi gõ */
const moCtx = $('moCv').getContext('2d'); let moHit = 0;
function paintMo(hit) {
  if (hit) moHit = 1;
  const k = moCtx, Wc = 220, Hc = 150; k.clearRect(0, 0, Wc, Hc);
  const cx = 104, cy = 92;
  // gối lót
  k.fillStyle = '#8c1a10'; k.beginPath(); k.ellipse(cx, cy + 40, 86, 14, 0, 0, 7); k.fill(); k.fillStyle = '#e9b949'; k.beginPath(); k.ellipse(cx, cy + 36, 80, 10, 0, 0, 7); k.fill();
  // thân mõ
  const g = k.createRadialGradient(cx - 26, cy - 30, 6, cx, cy, 82); g.addColorStop(0, '#e59a5a'); g.addColorStop(0.45, '#b4602a'); g.addColorStop(1, '#5e2a0e');
  k.fillStyle = g; k.beginPath(); k.ellipse(cx, cy, 78, 46, 0, 0, 7); k.fill();
  k.strokeStyle = 'rgba(60,20,4,.6)'; k.lineWidth = 2; k.stroke();
  // miệng mõ (khe) + hoa văn
  k.fillStyle = '#2a0e04'; k.beginPath(); k.ellipse(cx, cy + 10, 60, 6, 0, 0, Math.PI); k.fill();
  k.strokeStyle = 'rgba(255,220,160,.35)'; k.lineWidth = 2; k.beginPath(); k.arc(cx, cy - 6, 30, Math.PI * 1.1, Math.PI * 1.9); k.stroke();
  k.fillStyle = 'rgba(255,255,255,.25)'; k.beginPath(); k.ellipse(cx - 30, cy - 26, 20, 8, -0.4, 0, 7); k.fill();
  // dùi gõ
  const a = -0.55 + moHit * 0.45; k.save(); k.translate(190, 30); k.rotate(a);
  k.strokeStyle = '#7a4a1c'; k.lineWidth = 6; k.lineCap = 'round'; k.beginPath(); k.moveTo(0, 0); k.lineTo(-62, 30); k.stroke();
  const gb = k.createRadialGradient(-66, 30, 2, -66, 32, 14); gb.addColorStop(0, '#f2c27a'); gb.addColorStop(1, '#8a4a1c'); k.fillStyle = gb; k.beginPath(); k.arc(-66, 32, 13, 0, 7); k.fill();
  k.restore();
  if (moHit > 0) { k.strokeStyle = `rgba(255,220,140,${moHit * 0.8})`; k.lineWidth = 3; k.beginPath(); k.ellipse(cx, cy, 78 + (1 - moHit) * 30, 46 + (1 - moHit) * 18, 0, 0, 7); k.stroke(); moHit = Math.max(0, moHit - 0.12); requestAnimationFrame(() => paintMo(0)); }
}
paintMo(0);

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
function openOffer(tab = 'free') {
  const cds = store.get('cd', {});
  modal('Dâng lễ', (b) => {
    // thanh hoa sen: số dư · quà hằng ngày · nạp
    const bar = el('div', 'shopbar');
    bar.append(el('b', 'lotus', `🪷 ${fmt(P.lotus || 0)} hoa sen`));
    const gift = el('button', 'btn sm' + (SHOP.dailyReady() ? ' gold' : ''), SHOP.dailyReady() ? '🎁 Nhận quà hôm nay' : '🎁 Đã nhận quà');
    gift.onclick = () => { SHOP.claimDaily(); closeModal(); openOffer(tab); };
    const top = el('button', 'btn sm', '➕ Nạp hoa sen'); top.onclick = () => { closeModal(); SHOP.openTopup(); };
    bar.append(gift, top); b.append(bar);
    const tabs = el('div', 'tabs'), list = el('div', 'list');
    [['free', '🙏 Lễ vật thường'], ['shop', '🏪 Cửa hàng'], ['merit', '💝 Hòm công đức']].forEach(([k, n]) => { const x = el('button', k === tab ? 'on' : '', n); x.onclick = () => { closeModal(); if (k === 'merit') return SHOP.openDonate(temple); openOffer(k); }; tabs.append(x); });
    b.append(tabs, list);
    if (tab === 'free') {
      OFFERS.forEach(o => {
        const left = Math.max(0, Math.ceil(((cds[o.id] || 0) - Date.now()) / 1000));
        const r = el('button', 'item' + (left ? ' wait' : '')); r.disabled = !!left;
        r.append(el('b', '', `${o.icon} ${o.n}`), el('small', '', left ? `Đợi ${Math.ceil(left / 60)} phút` : `Miễn phí · +${o.m} công đức · cầm lên tay, đặt trên bàn thờ`));
        r.onclick = () => { cds[o.id] = Date.now() + o.cd * 1000; store.set('cd', cds); closeModal(); carryOffering(o); };
        list.append(r);
      });
      b.append(el('p', 'note', 'Thắp hương: đến lư hương lớn giữa chánh điện và bấm "Thắp hương". Lễ vật thường miễn phí, dâng lại sau ít phút.'));
    } else {
      SHOP.items.forEach(it => {
        const can = (P.lotus || 0) >= it.price;
        const r = el('button', 'item shopitem' + (can ? '' : ' wait'));
        r.append(el('b', '', `${it.icon} ${it.n}`), el('small', '', `+${it.m} công đức`), el('em', 'price', `🪷 ${it.price}`));
        r.onclick = () => {
          if (!SHOP.spend(it.price)) { toast(`Cần ${it.price} hoa sen · nhận quà hằng ngày hoặc nạp thêm`); return; }
          closeModal(); carryOffering({ id: it.mesh, icon: it.icon, n: it.n, m: it.m });
          ticker(`${it.icon} ${P.name} vừa thỉnh ${it.n.toLowerCase()} dâng Tam Thế Phật`);
        };
        list.append(r);
      });
      b.append(el('p', 'note', `Hoa sen có được từ quà hằng ngày hoặc nạp (10.000đ = ${Math.round(10000 / ((CBA.shop || {}).vndPerLotus || 50))} hoa sen). Mã nhân vật: ${P.id}`));
    }
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
      me.yaw = Math.atan2(slot.x - me.pos.x, slot.z - me.pos.z); cam.yaw = me.yaw + Math.PI;
      // đặt lễ vật lên bàn thờ
      const wp = item.getWorldPosition(new THREE.Vector3()); me.av.root.remove(item); item.position.copy(wp); item.rotation.y = me.yaw; item.userData.tmp = true; scene.add(item); carrying = null;
      const from = wp.clone(), t0 = performance.now();
      const fly = () => { const k = Math.min(1, (performance.now() - t0) / 700); item.position.lerpVectors(from, slot, k); item.position.y += Math.sin(k * Math.PI) * 0.25; if (k < 1) requestAnimationFrame(fly); };
      fly();
      me.av.setPose('idle'); setTimeout(() => { me.av.bow(); A.smallBell(); if (S.voiceBow !== false) A.say('Nam mô A Di Đà Phật', { force: true, rate: 0.82, pitch: 0.85 }); }, 600);
      P.merit += o.m; addBeads(o.m); toast(`${o.icon} Đã dâng ${o.n.toLowerCase()} · +${o.m} công đức`); ticker(`${o.icon} ${P.name} vừa dâng ${o.n.toLowerCase()} lên Tam Thế Phật`); NET.act('offer', o.n.toLowerCase());
    });
  };
  const inside = insideHall(h);
  if (inside) go(); else fade(() => { const c = h.cushions[h.cushions.length - 1] || h.altar; me.pos.set(c.x, 0, c.z + 0.8); me.y = c.y || h.altar.y; go(); });
}

/* Đèn nguyện */
const lanterns = [];
function openWish() {
  modal('Thả đèn nguyện', (b) => {
    const ta = el('textarea'); ta.id = 'wish'; ta.rows = 3; ta.maxLength = 80; ta.placeholder = 'VD: Nguyện cho mẹ con mau khỏe, gia đình bình an';
    const err = el('p', 'note warn'); err.hidden = true;
    const go = el('button', 'btn gold', '🏮 Thả đèn');
    go.onclick = () => {
      const t = ta.value.trim().replace(/\s+/g, ' ');
      if (!t) { err.hidden = false; err.textContent = 'Hãy viết một lời nguyện trước khi thả đèn.'; return ta.focus(); }
      closeModal(); releaseLantern(t);
    };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go.click(); } };
    b.append(ta, err, go); setTimeout(() => ta.focus(), 50);
  });
}
/* đèn lồng giấy: thân đỏ cam phát sáng, viền vàng, tua đỏ, quầng sáng */
function lanternMesh() {
  const g = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xff6a10, emissiveIntensity: 1.8, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), paper); body.scale.set(1, 1.25, 1); g.add(body);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe9b949, metalness: 0.6, roughness: 0.35, emissive: 0x6a4000, emissiveIntensity: 0.4 });
  [0.3, -0.3].forEach(y => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14), gold); r.position.y = y; g.add(r); });
  for (let k = 0; k < 6; k++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.006, 4, 24, Math.PI), gold); rib.rotation.set(0, k / 6 * Math.PI, Math.PI / 2); rib.scale.y = 1.25; g.add(rib); }
  const tas = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0xc0261a, emissive: 0x600000 })); tas.position.y = -0.45; tas.rotation.x = Math.PI; g.add(tas);
  const c = document.createElement('canvas'); c.width = c.height = 64; const k = c.getContext('2d'); const gr = k.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,190,90,.9)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); k.fillStyle = gr; k.fillRect(0, 0, 64, 64);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(1.6, 1.6, 1); g.add(glow);
  g.add(new THREE.PointLight(0xffa040, 1.4, 7));
  return g;
}
function releaseLantern(text) {
  const g = lanternMesh(); g.userData.tmp = true;
  const h = W.halls[0], inHall = h && insideHall(h);
  // trong chánh điện: đèn bay lên trước Tam Thế Phật
  if (inHall) faceAltar(h);
  me.av.setPose('incense'); setTimeout(() => me.av.setPose(me.seated ? 'kneel' : 'idle'), 1600);
  const fwd = new THREE.Vector3(Math.sin(me.yaw), 0, Math.cos(me.yaw));
  g.position.set(me.pos.x + fwd.x * 0.45, me.y + 1.1, me.pos.z + fwd.z * 0.45); scene.add(g);
  const lbl = label('🏮 ' + text, 'wishlbl'); lbl.title = text;
  const tgt = inHall ? h.altar.clone().lerp(me.pos, 0.35) : null;
  lanterns.push({ g, t: 0, lbl, tgt, seed: Math.random() * 6, ceil: inHall ? h.ceilY : 0 });
  P.merit += 5; addBeads(5); toast('🏮 Đèn nguyện đã bay lên · +5 công đức'); A.khanh();
  ticker(`🏮 ${P.name} vừa thả đèn nguyện: “${text}”`); NET.act('lantern');
  if (S.voiceBow !== false) setTimeout(() => A.say('Nam mô A Di Đà Phật', { force: true, rate: 0.82, pitch: 0.85 }), 700);
  save();
}
function lanternStep(dt) {
  for (const l of lanterns) {
    l.t += dt; const g = l.g;
    const cap = l.ceil ? l.ceil - 0.9 : Infinity; g.position.y = Math.min(cap, g.position.y + dt * (l.t < 2 ? 0.35 : 0.7)) + (g.position.y >= cap ? Math.sin(l.t * 1.6) * 0.002 : 0);
    if (l.tgt && l.t < 8) { g.position.x += (l.tgt.x - g.position.x) * dt * 0.25; g.position.z += (l.tgt.z - g.position.z) * dt * 0.25; }
    g.position.x += Math.sin(l.t * 0.9 + l.seed) * dt * 0.25; g.rotation.y += dt * 0.4; g.rotation.z = Math.sin(l.t * 1.3 + l.seed) * 0.08;
    if (l.lbl) {
      const life = l.ceil ? 24 : 14;
      if (l.t > life) { l.lbl.remove(); l.lbl = null; }
      else { placeLabel(l.lbl, g.position, -0.55); l.lbl.style.opacity = String(Math.min(1, l.t * 2, (life - l.t) / 2)); l.lbl.style.transform += ' translate(0, 100%)'; }
    }
  }
  while (lanterns.length && lanterns[0].t > (lanterns[0].ceil ? 26 : 30)) { const l = lanterns.shift(); scene.remove(l.g); if (l.lbl) l.lbl.remove(); }
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
  if (!st) { abbot.av.bow(); tell(CBA.stories[(Math.random() * CBA.stories.length) | 0], true); return; }   // chùa không có sự tích riêng: nghe sư kể một truyện cũng tính
  abbot.av.bow(); tell(st, true);
}
function tell(st, isLegend = false) {
  const pages = st.scenes.concat(['🪷 ' + st.moral]); let i = 0;
  const box = $('story'); box.hidden = false; A.ambience.duck(true);
  $('sTitle').textContent = st.title; $('sSeries').textContent = isLegend ? `📜 Sự tích ${temple.name}` : '📖 Sư trụ trì kể chuyện';
  const show = () => { if (isLegend && i === pages.length - 1 && !tp(temple.id).legend) { tp(temple.id).legend = true; save(); objective(); }   // nghe tới trang cuối là hoàn thành
    $('sText').textContent = pages[i]; $('sPage').textContent = `${i + 1}/${pages.length}`; $('sOpts').innerHTML = ''; $('sNext').hidden = false; $('sNext').textContent = i < pages.length - 1 ? 'Trang sau ›' : 'Câu đố ›'; A.speak(pages[i], 'story'); };
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
      if (isLegend && !tp(temple.id).legend) { tp(temple.id).legend = true; objective(); }
      $('sText').textContent = ok ? '🎉 Chính xác! +27 hạt' : `Đáp án đúng: ${'ABC'[q.answer]}. ${q.options[q.answer]}`;
      save(); hud();
    }; o.append(b); });
  };
  show();
}

/* ---------------- Sổ hành hương (mục tiêu mỗi chùa) ---------------- */
const STEPS = ['Vào chánh điện lạy Phật 3 lạy', 'Khám phá các địa danh trong chùa', 'Gặp sư trụ trì nghe sự tích chùa'];
function objective() {
  if (!temple || !W) return;
  const t = tp(temple.id), L = W.layout, total = L.pois.length, seen = t.pois.length;
  const done = [t.lay >= 3, seen >= total, !!t.legend], step = t.stamp ? 4 : done.indexOf(false) + 1 || 4;
  let text;
  if (t.stamp) text = `✅ Đã nhận Ấn ${temple.name} · chọn chùa khác trên bản đồ`;
  else if (!done[0]) text = `1/3 · Vào chánh điện lạy Phật (${t.lay}/3 lạy)`;
  else if (!done[1]) text = `2/3 · Khám phá địa danh (${seen}/${total})`;
  else if (!done[2]) text = '3/3 · Gặp sư trụ trì nghe sự tích chùa';
  // báo hoàn thành từng bước (mỗi bước báo một lần)
  if (!t.done) t.done = done.slice();   // dữ liệu cũ: ghi nhận những bước đã xong, không báo lại
  done.forEach((ok, k) => { if (ok && !t.done[k]) { t.done[k] = true; save(); if (!(done.every(Boolean) && !t.stamp)) { A.smallBell(); banner('✅ Hoàn thành nhiệm vụ', `${k + 1}/3 · ${STEPS[k]}`, step <= 3 ? `Tiếp theo: ${STEPS[step - 1]}` : ''); } } });
  if (!t.stamp && done.every(Boolean)) { t.stamp = true; save(); text = `✅ Đã nhận Ấn ${temple.name}`; A.bigBell(); banner('📜 Hoàn thành hành hương · nhận Ấn', temple.name, `Đã đủ ${Object.values(P.temples).filter(x => x.stamp).length}/${TEMPLES.length} ấn · +108 hạt`); addBeads(108); petalShower('hall'); }
  $('obj').textContent = text;
}
/* bảng nhiệm vụ: bấm vào dòng nhiệm vụ để xem chi tiết */
function openQuests() {
  if (!temple || !W) return;
  const t = tp(temple.id), L = W.layout;
  modal(`📜 Nhiệm vụ · ${temple.name}`, (b) => {
    const st = [[t.lay >= 3, STEPS[0], `${Math.min(3, t.lay)}/3 lạy · ngồi đệm trong chánh điện rồi bấm "Lạy Phật"`], [t.pois.length >= L.pois.length, STEPS[1], `${t.pois.length}/${L.pois.length} địa danh`], [!!t.legend, STEPS[2], 'Đến gần sư trụ trì, bấm "Nghe sự tích chùa", nghe tới trang cuối']];
    const ul = el('div', 'quests');
    st.forEach(([ok, n, sub], k) => { const r = el('div', 'quest' + (ok ? ' ok' : '')); r.append(el('b', '', ok ? '✅' : `${k + 1}`), el('span', '', n), el('small', '', sub)); ul.append(r); });
    b.append(ul, el('h3', '', '📍 Địa danh'));
    const pl = el('div', 'quests');
    L.pois.forEach(p => { const ok = t.pois.includes(p[0]); const r = el('div', 'quest' + (ok ? ' ok' : '')); r.append(el('b', '', ok ? '✅' : '○'), el('span', '', p[0]), el('small', '', ok ? 'đã đến' : 'xem chấm vàng trên bản đồ nhỏ')); pl.append(r); });
    b.append(pl, el('p', 'note', t.stamp ? `🎉 Đã nhận Ấn ${temple.name}.` : 'Hoàn thành cả 3 bước để nhận Ấn hành hương của chùa (+108 hạt).'));
  });
}
$('obj').style.cursor = 'pointer'; $('obj').title = 'Xem nhiệm vụ'; $('obj').onclick = openQuests;
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
  const bd = badgeOf(P); $('pName').textContent = P.name + (bd ? ' ' + bd : ''); if (me.label) me.label.textContent = P.name + (bd ? ' ' + bd : ''); $('pLv').textContent = `Cấp ${lv + 1} · ${L[lv].name}`;
  $('pBar').style.width = (nxt ? Math.min(100, (P.beads - L[lv].at) / (nxt.at - L[lv].at) * 100) : 100) + '%';
  $('pBeads').textContent = fmt(P.beads) + ' hạt'; $('pLotus').textContent = '🪷 ' + fmt(P.lotus || 0); $('pInit').textContent = P.name.trim().split(' ').pop()[0] || '🙏';
}
/* ---------------- lịch âm trên cùng ---------------- */
function drawLunar() {
  const el0 = $('lunar'); if (!el0 || !CBA.Lunar) return;
  const f = CBA.Lunar.full();
  el0.innerHTML = '';
  const cal = el('span', '', '📅');
  const main = el('b', '', `${f.day}/${f.month}${f.leap ? ' nhuận' : ''} ÂL`);
  const gio = el('span', '', `· giờ ${f.hour.name}`);
  el0.append(cal, main, gio);
  if (f.feast) { const fe = el('span', 'feast', '· ' + f.feast.name + (f.mult > 1 ? ` ×${f.mult}` : '')); el0.append(fe); }
}
drawLunar(); setInterval(drawLunar, 30000);
$('lunar').onclick = () => {
  const f = CBA.Lunar.full();
  modal('📅 Lịch âm hôm nay', (b) => {
    const rows = [['Dương lịch', new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })],
      ['Âm lịch', `${f.day}/${f.month}${f.leap ? ' (nhuận)' : ''}`], ['Ngày', f.dayCanChi], ['Tháng', f.monthCanChi], ['Năm', f.yearCanChi],
      ['Giờ hiện tại', `${f.hour.name} (${f.hour.range})`]];
    const ul = el('ul', 'stats'); rows.forEach(([k, v]) => { const li = el('li'); li.append(el('span', '', k), el('b', '', v)); ul.append(li); }); b.append(ul);
    if (f.feast) b.append(el('p', 'note', `🪷 Hôm nay là ${f.feast.name}${f.mult > 1 ? ` · công đức và hạt ×${f.mult}` : ''}. Lên chùa lễ Phật hôm nay được nhiều phúc lành.`));
    else b.append(el('p', 'note', 'Ngày Rằm (15) và Mùng Một (1) âm lịch, cùng các ngày vía Phật, lên chùa sẽ được nhân điểm công đức.'));
  });
};
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
        card.onclick = () => templeDetail(b, t, TEMPLES.filter(x => r === 'all' ? true : x.region === r), first);
        list.append(card);
      });
    };
    regs.forEach(([k, n], i) => { const x = el('button', i ? '' : 'on', n); x.onclick = () => { [...tabs.children].forEach(y => y.classList.toggle('on', y === x)); paint(k); }; tabs.append(x); });
    const big = el('a', 'btn', '🗺 Bản đồ Việt Nam & mô hình 3D'); big.href = 'map.html'; big.target = '_blank'; big.rel = 'noopener';
    b.append(tabs, list, el('p', 'note', `Ấn hành hương: ${Object.values(P.temples).filter(x => x.stamp).length}/${TEMPLES.length} · Mỗi chùa: lễ Phật, khám phá địa danh, nghe sự tích.`), big);
    paint('all');
  }, { wide: true, noClose: first });
}

/* thẻ thông tin chùa: khung cảnh 3D xoay được + giới thiệu + vào chùa */
let tdView = null;
function templeDetail(b, t, list, first) {
  if (tdView) { tdView.dispose(); tdView = null; }
  [...b.children].forEach((c, i) => { if (i) c.remove(); });   // giữ thanh tiêu đề
  const st = P.temples[t.id] || {}, L = LAYOUT[t.id] || LAYOUT['binh-an'];
  const wrap = el('div', 'tdetail');
  const v3d = el('div', 'td3d'); const hint = el('small', 'td3dhint', '👆 Kéo để xoay · cuộn / chụm để phóng to'); v3d.append(hint);
  const nav = el('div', 'tdnav');
  const back = el('button', 'rb', '←'); back.title = 'Danh sách chùa';
  const i = list.indexOf(t), prev = el('button', 'rb', '‹'), next = el('button', 'rb', '›');
  prev.onclick = () => templeDetail(b, list[(i - 1 + list.length) % list.length], list, first);
  next.onclick = () => templeDetail(b, list[(i + 1) % list.length], list, first);
  back.onclick = () => { if (tdView) { tdView.dispose(); tdView = null; } closeHook = null; closeModal(); openTemplePicker(first); };
  nav.append(back, el('h3', '', t.name), prev, next);
  const chips = el('div', 'tdchips');
  chips.append(el('span', 'on', `● ${2 + ((t.id.length * 37) % 40)} đang tu tập`), el('span', st.stamp ? 'ok' : '', st.stamp ? '📜 Đã có ấn' : P.temples[t.id] ? '✓ Đã viếng' : 'Chưa viếng'));
  const place = el('p', 'tdplace', `📍 ${t.place}${t.year ? ' · dựng năm ' + t.year : ''} · ${CBA.regions[t.region] || 'Chùa nhà'}`);
  const intro = el('p', 'tdintro', t.intro || '');
  const prog = el('div', 'tdprog'); const n = (st.pois || []).length, tot = L.pois.length;
  prog.append(el('b', '', st.stamp ? '📜 Ấn hành hương đã nhận' : '📜 Ấn hành hương'), el('div', 'bar', ''), el('small', '', `Địa danh đã khám phá ${n}/${tot} · lễ Phật ${Math.min(3, st.lay || 0)}/3 · nghe sự tích ${st.legend ? '✓' : '✗'}`));
  prog.children[1].append(el('i')); prog.children[1].firstChild.style.width = `${Math.round(((Math.min(n, tot) / Math.max(1, tot)) * 0.6 + (Math.min(3, st.lay || 0) / 3) * 0.2 + (st.legend ? 0.2 : 0)) * 100)}%`;
  const pois = el('div', 'tdpois'); L.pois.forEach(pp => pois.append(el('span', (st.pois || []).includes(pp[0]) ? 'ok' : '', pp[0])));
  const row = el('div', 'row');
  const go = el('button', 'btn gold', temple && temple.id === t.id ? '🙏 Về chánh điện' : '🙏 Vào chùa');
  go.onclick = () => { if (tdView) { tdView.dispose(); tdView = null; } closeModal(); if (temple && temple.id === t.id) { const h = W.halls[0]; if (h) fade(() => { me.pos.set(h.altar.x, 0, h.altar.z + 4); me.y = h.altar.y; faceAltar(h); }); } else fade(() => loadTemple(t.id)); };
  row.append(go);
  if (t.legend) { const lg = el('button', 'btn', '📖 Sự tích chùa'); lg.onclick = () => { if (tdView) { tdView.dispose(); tdView = null; } closeModal(); const sx = CBA.stories.find(x => x.id === 'chua_' + t.id); if (sx) tell(sx, true); }; row.append(lg); }
  wrap.append(v3d, nav, chips, place, intro, prog, pois, row); b.append(wrap);
  b.classList.add('hasdetail');
  closeHook = () => { if (tdView) { tdView.dispose(); tdView = null; } };
  requestAnimationFrame(() => { try { tdView = mount(v3d, t.id, { autoRotate: true }); v3d.append(hint); } catch (e) { v3d.style.backgroundImage = `url(assets/temples/${t.id}.jpg)`; } });
}

/* ---------------- hồ sơ ---------------- */
function openProfile() {
  modal('Hồ sơ tu tập', (b) => {
    const lv = levelOf(P.beads);
    const rows = [['Mã nhân vật', P.id || '—'], ['Hoa sen', '🪷 ' + fmt(P.lotus || 0)], ['Cấp', `${lv + 1} · ${C.levels[lv].name}`], ['Hạt', fmt(P.beads)], ['Công đức', fmt(P.merit)], ['Số lạy', fmt(P.lay)], ['Chuỗi tràng hạt', fmt(P.rounds)], ['Phút thiền', fmt(P.medMin)], ['Chuỗi ngày', P.streak + ' ngày'], ['Truyện đã nghe', `${P.stories.length}/${CBA.stories.length}`], ['Câu đố đúng', fmt(P.quiz)]];
    const ul = el('ul', 'stats'); rows.forEach(([k, v]) => { const li = el('li'); li.append(el('span', '', k), el('b', '', v)); ul.append(li); }); b.append(ul);
    b.append(SHOP.certList());
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
    b.append(el('h3', '', '🗣 Giọng đọc'));
    // 4 giọng tự nhiên thu sẵn (đọc truyện, tụng kinh, niệm Phật) + giọng có sẵn của máy
    const vl = el('div', 'vlist'), cur = A.voicePack();
    const SAMPLE = 'A Di Đà Phật. Chào mừng quý Phật tử về thăm chùa.';
    A.voicePacks().forEach(v => {
      const r = el('label', 'vopt' + (v.id === cur ? ' on' : '')), rb = el('input'); rb.type = 'radio'; rb.name = 'vpack'; rb.checked = v.id === cur;
      const play = el('button', 'btn sm', '▶ Nghe');
      const pick = async () => { await A.setVoicePack(v.id); [...vl.children].forEach(x => x.classList.toggle('on', x === r)); };
      rb.onchange = pick;
      play.onclick = async (e) => { e.preventDefault(); await pick(); rb.checked = true; A.unlock && A.unlock(); A.set({ storyTtsOn: true }); A.say(SAMPLE, { force: true }); };
      r.append(rb, el('span', '', v.id === 'may' ? '📱 ' + v.name : '🎙 ' + v.name), play); vl.append(r);
    });
    b.append(vl, el('p', 'note', 'Các giọng 🎙 là giọng đọc tự nhiên thu sẵn, nghe giống nhau trên mọi máy (điện thoại, máy tính). Chọn "Giọng có sẵn của máy" nếu muốn dùng giọng của thiết bị.'));
    const vs = A.voices();
    if (vs.length > 1 && cur === 'may') {
      const sel = el('select'); sel.id = 'voice'; vs.forEach(n => { const o = el('option', '', n); o.value = n; sel.append(o); }); sel.value = A.voiceName();
      sel.onchange = () => A.setVoice(sel.value); b.append(el('small', 'note', 'Giọng của máy:'), sel);
    }
    const tst = el('button', 'btn gold', '🔊 Kiểm tra âm thanh'), res = el('p', 'note');
    tst.onclick = () => {
      A.unlock(); A.set({ sfxOn: true }); A.mo(1); setTimeout(() => A.mo(0.8), 900); setTimeout(() => A.smallBell(), 1800);
      setTimeout(() => A.say('Nam mô A Di Đà Phật', { force: true, rate: 0.82, pitch: 0.85 }), 2600);
      setTimeout(() => { const ok = A.unlocked(); res.className = 'note' + (ok ? '' : ' warn'); res.textContent = ok ? `✅ Âm thanh đang bật · giọng đọc: ${A.voiceName() || 'máy chưa có giọng tiếng Việt'}. Nếu vẫn không nghe: kiểm tra loa, âm lượng máy và tab trình duyệt có bị tắt tiếng (biểu tượng loa trên tab).` : '⚠️ Trình duyệt đang chặn âm thanh. Bấm vào màn hình game một lần rồi thử lại; trên iPhone hãy gạt nút im lặng (bên hông máy) sang bật chuông.'; }, 600);
    };
    b.append(tst, res);
    ACC.section(b);
    b.append(el('h3', '', '🪷 Hoa sen & nạp'));
    { const r = el('div', 'row'); const t1 = el('button', 'btn', '➕ Nạp hoa sen'); t1.onclick = () => { closeModal(); SHOP.openTopup(); };
      const t2 = el('button', 'btn', SHOP.isAdmin ? '🛡 Bảng duyệt nạp' : '🛡 Đăng nhập quản trị'); t2.onclick = () => { closeModal(); SHOP.openAdmin(); };
      r.append(t1, t2); b.append(el('p', 'note', `Mã nhân vật: ${P.id} · Số dư: 🪷 ${fmt(P.lotus || 0)} · Chế độ: ${SHOP.mode === 'firebase' ? 'Firebase' : 'thử (chưa cấu hình Firebase)'}`), r); }
    if (!isStandalone()) { b.append(el('h3', '', '📲 Cài game về máy')); const ib = el('button', 'btn', '📲 Cài game'); ib.onclick = () => { closeModal(); installApp(); }; b.append(el('p', 'note', 'Đưa Chùa Bình An ra màn hình chính điện thoại (hoặc máy tính) để mở nhanh, toàn màn hình như ứng dụng.'), ib); }
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
    // thông tin liên hệ & bản quyền
    b.append(el('h3', '', '📞 Thông tin liên hệ'));
    const contact = (CBA.shop && CBA.shop.contact) || {};
    const phone = contact.phone || '0938.225.268';
    const cr = el('div', 'contact');
    const tel = el('a', 'btn gold', '📞 Gọi / Zalo: ' + phone); tel.href = 'tel:' + phone.replace(/[^0-9]/g, '');
    cr.append(tel);
    if (contact.zalo) { const z = el('a', 'btn', '💬 Zalo'); z.href = contact.zalo; z.target = '_blank'; cr.append(z); }
    if (contact.facebook) { const f = el('a', 'btn', 'Facebook'); f.href = contact.facebook; f.target = '_blank'; cr.append(f); }
    b.append(cr);
    if (contact.note) b.append(el('p', 'note', contact.note));
    b.append(el('p', 'note', `Phiên bản 2026.11.01 · Nếu chưa thấy cập nhật mới, kéo xuống làm mới trang (hoặc xóa dữ liệu trang một lần).`));
    b.append(el('p', 'note', `© ${new Date().getFullYear()} Chùa Bình An · Hành hương 3D. Trò chơi mô phỏng với mục đích giới thiệu văn hóa Phật giáo Việt Nam. Mọi hình ảnh, âm thanh, mã nguồn thuộc bản quyền của nhóm phát triển; vui lòng không sao chép khi chưa được phép.`));
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
      if (me.av) { me.av.setLook(look); me.label.textContent = n + (badgeOf(P) ? ' ' + badgeOf(P) : ''); }
      closeModal(); hud();
      if (first) { A.ensure(); checkIn(); openTemplePicker(true); }
    };
    f.append(err, go);
    if (first) { const li = el('button', 'btn ghost', '🔑 Đã có tài khoản? Đăng nhập'); li.onclick = () => { if (pvR) pvR.dispose(); ACC.openAccount('login'); closeHook = () => setTimeout(() => { if (!P.name) characterForm(true); }, 0); }; f.append(li); }
    f.append(el('p', 'note', ACC.user ? `Tiến trình lưu vào tài khoản ${ACC.user.user}.` : 'Tiến trình tạm lưu trên trình duyệt này · chơi 15 phút sẽ được mời tạo tài khoản để lưu lại.')); box.append(f);
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
/* cửa hàng hoa sen & nạp */
const SHOP = initShop({ P, save, modal, closeModal, el, $, toast, banner, A, fmt, onCert: (r, t) => { hud(); NET.act('cert', t.icon); NET.profile(); ticker(`${t.icon} ${P.name} vừa nhận chứng nhận ${t.title} tại ${r.templeName || temple.name}`); petalShower(); } });
/* tài khoản người chơi */
const ACC = initAccount({ P, modal, closeModal, el, $, toast, banner, A, flush: () => { store.set('profile', P); saveS(); } });
window.__acc = ACC;
/* nhiều người chơi thật qua máy chủ (server/server.js), tự chia kênh khi đông */
const NET = initNet({ P, me, scene, Avatar, label, placeLabel, toast, ticker, A, hash, badgeOf,
  onPeers: (k) => { while (npcs.length > Math.max(0, 6 - k)) { const n = npcs.pop(); scene.remove(n.av.root); n.label.remove(); if (n.sit) n.sit.taken = false; if (n.goSit) n.goSit.taken = false; } },   // người thật vào thì bớt Phật tử mô phỏng
  remoteLantern: (pos) => { const g = lanternMesh(); g.userData.tmp = true; g.position.set(pos.x, pos.y + 1.1, pos.z); scene.add(g); const h = W && W.halls.find(x => inHallBox(x, pos, pos.y)); lanterns.push({ g, t: 0, lbl: null, tgt: null, seed: Math.random() * 6, ceil: h ? h.ceilY : 0 }); } });
window.__net = NET;
NET.onChange(() => { if (W) $('online').textContent = NET.online ? `👥 ${NET.count} người chơi thật · Kênh ${NET.ch}` : `${1 + npcs.length} đang tu tập`; });
function openChannels() {
  if (!NET.enabled) return modal('📡 Kênh chùa', (b) => b.append(el('p', 'note', 'Game đang chơi một mình (chưa nối máy chủ). Những Phật tử khác bạn thấy là mô phỏng. Khi chủ chùa chạy máy chủ (server/server.js), mọi người sẽ gặp nhau thật trong chùa, mỗi kênh tối đa vài chục người.')));
  if (!NET.online) return toast('📡 Đang kết nối máy chủ…');
  NET.listChannels();
  modal(`📡 Kênh · ${temple.name}`, (b) => {
    const box = el('div', 'chlist');
    const paint = () => {
      box.innerHTML = '';
      NET.chs.forEach(c => {
        const full = c.n >= NET.cap, it = el('button', 'chan' + (c.ch === NET.ch ? ' on' : '') + (full ? ' full' : ''));
        const bar = el('span', 'cbar'); const fill = el('i'); fill.style.width = Math.min(100, c.n / NET.cap * 100) + '%'; bar.append(fill);
        it.append(el('b', '', `Kênh ${c.ch}`), bar, el('small', '', c.ch === NET.ch ? `${c.n}/${NET.cap} · bạn đang ở đây` : full ? `${c.n}/${NET.cap} · đầy` : `${c.n}/${NET.cap} người`));
        it.disabled = full && c.ch !== NET.ch; it.onclick = () => { if (c.ch !== NET.ch) { NET.switchChannel(c.ch); closeModal(); } };
        box.append(it);
      });
    };
    paint(); const off = () => paint(); NET.onChange(off);
    const who = el('p', 'note', '🟢 Cùng kênh với bạn: ' + ([P.name, ...NET.peers().map(p => p.name)].join(', ')) + (npcs.length ? ` · thêm ${npcs.length} Phật tử mô phỏng (nhãn xám)` : ''));
    const nw = el('button', 'btn', '➕ Mở kênh mới (vắng hơn)'); nw.onclick = () => { NET.newChannel(); closeModal(); };
    b.append(who, el('p', 'note', `Mỗi kênh tối đa ${NET.cap} người để game mượt. Kênh đầy, máy chủ tự đưa người mới sang kênh khác hoặc mở kênh mới.`), box, nw);
  });
}
$('online').parentElement.style.cursor = 'pointer'; $('online').parentElement.onclick = openChannels;
/* cài game về điện thoại (PWA) */
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const UA = navigator.userAgent, isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = isIOS || /Android|Mobile/i.test(UA) || matchMedia('(pointer: coarse)').matches;
const inAppBrowser = /FBAN|FBAV|FB_IAB|Zalo|Instagram|TikTok|musical_ly|Line\/|Messenger/i.test(UA);
let inFrame = false; try { inFrame = window.top !== window; } catch (e) { inFrame = true; }
function refreshInstall() { $('bInstall').hidden = isStandalone() || !(window.__bip || isMobile); }
addEventListener('cba-installable', refreshInstall);
addEventListener('appinstalled', () => { window.__bip = null; refreshInstall(); toast('📲 Đã cài Chùa Bình An · mở game từ màn hình chính'); });
refreshInstall();
async function installApp() {
  if (window.__bip) { const e = window.__bip; e.prompt(); try { const r = await e.userChoice; if (r.outcome === 'accepted') { window.__bip = null; refreshInstall(); } } catch (x) {} return; }
  modal('📲 Cài game về điện thoại', (b) => {
    b.append(el('p', 'note', 'Cài xong, game có biểu tượng riêng trên màn hình chính, mở toàn màn hình như ứng dụng, không cần vào cửa hàng ứng dụng.'));
    const step = (t) => el('li', '', t), ol = el('ol', 'isteps');
    if (inFrame) b.append(el('p', 'note warn', 'Bạn đang xem game trong khung xem trước nên không cài trực tiếp được. Hãy mở trang game riêng (địa chỉ web của game) bằng Safari hoặc Chrome rồi bấm "Cài game".'));
    if (inAppBrowser) { b.append(el('p', 'note warn', 'Bạn đang mở game trong trình duyệt của Zalo / Facebook / TikTok — trình duyệt này không cài được. Bấm ⋯ ở góc màn hình → "Mở bằng trình duyệt" (Safari hoặc Chrome) rồi làm theo hướng dẫn.')); }
    if (isIOS) { b.append(el('h3', '', '🍎 iPhone / iPad')); ol.append(step('Mở game bằng Safari.'), step('Bấm nút Chia sẻ (ô vuông có mũi tên ⬆️) ở thanh dưới.'), step('Kéo xuống, chọn "Thêm vào MH chính" (Add to Home Screen).'), step('Bấm "Thêm" — biểu tượng Chùa Bình An xuất hiện trên màn hình chính.')); }
    else { b.append(el('h3', '', '🤖 Android')); ol.append(step('Mở game bằng Chrome.'), step('Bấm nút ⋮ ở góc trên bên phải.'), step('Chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".'), step('Bấm "Cài đặt" — mở game từ biểu tượng Chùa Bình An.')); }
    b.append(ol);
    if (!ACC.user) b.append(el('p', 'note', '💡 Nên tạo tài khoản (Cài đặt → 👤 Tài khoản) để tiến trình trên trình duyệt và trên ứng dụng đã cài là một.'));
  });
}
$('bInstall').onclick = installApp;
setTimeout(() => { if (isMobile && !isStandalone() && !store.get('installAsk', 0) && P.name) { store.set('installAsk', 1); toast('📲 Mẹo: bấm "Cài game" ở cột bên phải để đưa Chùa Bình An ra màn hình chính'); } }, 120000);
SHOP.onChange(hud);
$('bAdmin').onclick = () => SHOP.openAdmin();
setTimeout(() => { if (P.name && SHOP.dailyReady()) toast('🎁 Có quà hằng ngày: vào "Dâng lễ" để nhận hoa sen'); }, 6000);
[['🙏', 'Lạy Phật', doBow], ['📿', 'Tràng hạt', openMala], ['🪵', 'Tụng kinh', openChant], ['🧘', 'Thiền', openMeditate], ['🪔', 'Dâng lễ', openOffer], ['🔔', 'Thỉnh chuông', ringBell]]
  .forEach(([i, t, fn]) => { const b = el('button', 'act'); b.append(el('span', 'ic', i), el('span', 'lb', t)); b.onclick = () => { A.ensure(); fn(); }; $('acts').append(b); });
$('miniBtn').onclick = () => openTemplePicker(); $('setBtn').onclick = openSettings; $('pChip').onclick = openProfile;
$('tName').onclick = () => openTemplePicker(); $('bPass').onclick = openProfile; $('bProf').onclick = openProfile; $('bStory').onclick = openStories; $('bWish').onclick = openWish;
/* menu chức năng gọn trên điện thoại: nút ☰ mở/đóng bảng icon bên phải */
(() => {
  const mb = $('menuBtn'), side = document.querySelector('.side');
  if (!mb || !side) return;
  const close = () => { side.classList.remove('open'); mb.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); };
  const toggle = () => { const open = !side.classList.contains('open'); side.classList.toggle('open', open); mb.classList.toggle('open', open); mb.setAttribute('aria-expanded', String(open)); mb.textContent = open ? '✕' : '☰'; };
  mb.onclick = (e) => { e.stopPropagation(); toggle(); };
  side.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { if (document.body.classList.contains('touch')) close(); }));
  document.addEventListener('pointerdown', (e) => { if (document.body.classList.contains('touch') && side.classList.contains('open') && !side.contains(e.target) && e.target !== mb) close(); });
})();
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
function updGo() { const h = W && W.halls[0]; const inHall = h && Math.hypot(me.pos.x - h.altar.x, me.pos.z - h.altar.z) < 7; const sm = document.body.classList.contains('touch'); $('goBtn').textContent = inHall ? (sm ? '🌳 Ra sân' : '🌳 Ra sân ngắm cảnh') : (sm ? '🛕 Vào điện' : '🛕 Vào chánh điện'); }
setInterval(() => { if (W) { updGo(); $('online').textContent = NET.online ? `👥 ${NET.count} người chơi thật · Kênh ${NET.ch}` : `${1 + npcs.length} đang tu tập`; } }, 1000);
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
  const rows = [[P.name, P.beads], ...NET.peers().map(p => [p.name, p.beads]), ...npcs.map(n => [n.label.textContent, n.beads || (n.beads = 200 + (Math.random() * 3000 | 0))])].sort((a, b) => b[1] - a[1]).map(([n, v]) => [n, fmt(v)]);
  const meritRows = [[P.name, P.merit], ...NET.peers().map(p => [p.name, p.merit]), ...npcs.map(n => [n.label.textContent, (n.merit = n.merit || (Math.random() * 400 | 0))])].sort((a, b) => b[1] - a[1]);
  BOARDS.forEach((b, i) => b.draw(i === 0 ? rows : meritRows.map(([n, v]) => [n, fmt(v)])));
  checkRanks(meritRows); drawRank(meritRows);
}, 3000);
/* bảng xếp hạng công đức góc trái */
let rankPrev = [];
function drawRank(rows) {
  const ol = $('rankList'); ol.innerHTML = '';
  const show = rows.slice(0, 5); const mine = rows.findIndex(r => r[0] === P.name);
  if (mine >= 5) show.push(rows[mine]);
  show.forEach(([n, v]) => {
    const k = rows.findIndex(r => r[0] === n), li = el('li', n === P.name ? 'me' : '');
    li.append(el('b', '', String(k + 1)), el('span', '', n === P.name && badgeOf(P) ? `${n} ${badgeOf(P)}` : n), el('em', '', fmt(v)));
    const was = rankPrev.indexOf(n); if (rankPrev.length && (was === -1 || was > k) && k < 5) li.classList.add('up');
    ol.append(li);
  });
  rankPrev = rows.map(r => r[0]);
}
$('rankHead').onclick = () => { $('rank').classList.toggle('min'); S.rankMin = $('rank').classList.contains('min'); saveS(); };
if (S.rankMin ?? innerWidth < 640) $('rank').classList.add('min');

/* camera không xuyên tường: tia từ người chơi tới camera cắt hộp va chạm nào gần nhất (0..1) */
let camInHall = false;
function rayBoxes(a, b) {
  let best = 1; const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  for (const bx of W.col.boxes) {
    if (bx.top < a.y - 0.6 || bx.top - bx.bottom < 1.2 || (camInHall && bx.camSkip)) continue;
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
const showers = [];
/* mưa hoa: kind 'big' (mặc định, cả chùa) · 'hall' (nhẹ, trong chánh điện) · 'dragon' (rất nhiều cánh sen rơi đồng loạt) */
function petalShower(kind = 'big') {
  if (!W) return;
  if (kind === 'big' && showers.some(s => s.kind === 'big')) return;
  const hall = W.halls.find(h => insideHall(h));
  const ceil = hall ? hall.ceilY - 0.25 : Infinity;
  const conf = { big: { N: 420, R: 26, H0: 6, HR: 10, size: 0.28, life: 22, loop: 14 }, hall: { N: 90, R: 9, H0: 1.6, HR: 2.6, size: 0.17, life: 11, loop: 0 }, dragon: { N: 900, R: 18, H0: 2.5, HR: 5, size: 0.3, life: 13, loop: 0 } }[kind];
  const N = conf.N, pos = new Float32Array(N * 3), vel = [], sway = [];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = me.pos.x + (Math.random() - 0.5) * conf.R;
    pos[i * 3 + 1] = Math.min(ceil - Math.random() * 0.4, me.y + conf.H0 + Math.random() * conf.HR);
    pos[i * 3 + 2] = me.pos.z + (Math.random() - 0.5) * conf.R;
    vel.push(kind === 'dragon' ? 0.55 + Math.random() * 0.35 : 0.45 + Math.random() * 0.8); sway.push(0.2 + Math.random() * 0.6);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mt = new THREE.PointsMaterial({ map: PETAL_TEX(), size: conf.size, transparent: true, alphaTest: 0.25, depthWrite: false, opacity: 1 });
  const pts = new THREE.Points(geo, mt); pts.userData.tmp = true; scene.add(pts);
  showers.push({ kind, pts, pos, vel, sway, t: 0, y0: me.y, conf });
  if (kind === 'big') { A.khanh(); ticker('🌸 Mưa hoa sen rơi khắp chùa · nguyện cho tất cả được an lạc'); }
  if (kind === 'hall') ticker('🌸 Cánh hoa nhẹ rơi trong chánh điện');
}
function showerStep(dt) {
  for (let k = showers.length - 1; k >= 0; k--) {
    const sh = showers[k], { pos, vel, sway, conf } = sh; sh.t += dt;
    for (let i = 0; i < vel.length; i++) {
      pos[i * 3 + 1] -= vel[i] * dt; pos[i * 3] += Math.sin(sh.t * 1.3 + i) * dt * sway[i]; pos[i * 3 + 2] += Math.cos(sh.t * 0.9 + i * 0.7) * dt * sway[i] * 0.6;
      if (pos[i * 3 + 1] < sh.y0) { if (conf.loop && sh.t < conf.loop) pos[i * 3 + 1] += conf.loop; else pos[i * 3 + 1] = sh.y0 + 0.02; }   // cánh rơi xuống nằm lại trên sàn
    }
    sh.pts.geometry.attributes.position.needsUpdate = true;
    if (sh.t > conf.life - 2) sh.pts.material.opacity = Math.max(0, (conf.life - sh.t) / 2);
    if (sh.t > conf.life) { scene.remove(sh.pts); sh.pts.geometry.dispose(); sh.pts.material.dispose(); showers.splice(k, 1); }
  }
}
setInterval(() => { if (W && !paused) petalShower(); }, 5 * 60000);
setTimeout(() => { if (W) petalShower(); }, 40000);
// trong chánh điện: cứ 3 phút có một đợt hoa rơi nhẹ
setInterval(() => { if (W && !paused && W.halls.some(h => insideHall(h))) petalShower('hall'); }, 3 * 60000);

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
  // 3 kiểu bay ngẫu nhiên nối nhau: lượn sóng · vòng tròn · số 8 · xoắn ốc · chữ S
  const kinds = ['wave', 'circle', 'eight', 'spiral', 'zig'].sort(() => Math.random() - 0.5).slice(0, 3);
  dragon = { t: 0, sx, sy, hist: [], who, kinds, sparks: [], dir: Math.random() < 0.5 ? 1 : -1 };
  setTimeout(() => petalShower('dragon'), 900);   // rồng bay lên · cánh sen rơi đồng loạt
  A.bigBell(); A.khanh(0.6);
  banner('🐉 Bảng Công Đức', `${name} lên hạng ${rank}`, 'Chuỗi hạt hóa rồng bay lên chúc mừng');
  ticker(`🐉 ${name} vừa lên hạng ${rank} Bảng Công Đức`);
}
/* quỹ đạo bay theo kiểu, u = thời gian trong kiểu */
function dragonPath(kind, u, W2, H2, dir) {
  const cx = W2 * 0.5, cy = H2 * 0.4, ax = W2 * 0.36, ay = H2 * 0.2;
  switch (kind) {
    case 'circle': { const a = u * 2.1 * dir; return [cx + Math.cos(a) * ax * 0.75, cy + Math.sin(a) * ay * 1.25]; }
    case 'eight': { const a = u * 1.7; return [cx + Math.sin(a * dir) * ax, cy + Math.sin(a * 2) * ay]; }
    case 'spiral': { const a = u * 2.6 * dir, r = 0.25 + 0.75 * Math.abs(Math.sin(u * 0.55)); return [cx + Math.cos(a) * ax * r, cy + Math.sin(a) * ay * 1.2 * r]; }
    case 'zig': { const k = u * 0.55, x = ((k % 2) < 1 ? k % 1 : 2 - k % 2); return [W2 * 0.1 + x * W2 * 0.8, cy + Math.sin(u * 3.2) * ay * 1.1]; }
    default: { const a = u * 0.95; return [cx + Math.sin(a * dir) * ax, cy + Math.sin(a * 2.1) * ay * 0.8 + Math.cos(a * 0.7) * 30]; }
  }
}
function drawBead(x, y, r, kind) {
  const gr = fg.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  if (kind === 'gold') { gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.4, '#ffd76a'); gr.addColorStop(1, '#a8700f'); }
  else if (kind === 'jade') { gr.addColorStop(0, '#e9fff0'); gr.addColorStop(0.45, '#6fcf97'); gr.addColorStop(1, '#1f6b45'); }
  else { gr.addColorStop(0, '#f6dcb4'); gr.addColorStop(0.35, '#b77a42'); gr.addColorStop(0.8, '#7a4520'); gr.addColorStop(1, '#4e2810'); }
  fg.fillStyle = gr; fg.beginPath(); fg.arc(x, y, r, 0, 7); fg.fill();
  fg.fillStyle = 'rgba(255,255,255,.55)'; fg.beginPath(); fg.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.16, -0.6, 0, 7); fg.fill();
}
function drawDragonHead(R, t) {
  // bờm lửa
  for (let i = 0; i < 6; i++) {
    const s = i % 2 ? 1 : -1, w = Math.sin(t * 6 + i) * R * 0.25;
    fg.fillStyle = i < 2 ? '#e8452c' : i < 4 ? '#f07a2a' : '#ffb347';
    fg.beginPath(); fg.moveTo(-R * 0.2, s * R * 0.3); fg.quadraticCurveTo(-R * (1.4 + i * 0.25), s * R * (1.2 + i * 0.12) + w, -R * (2.2 + i * 0.3), s * R * (0.5 + i * 0.1) + w); fg.quadraticCurveTo(-R * 1.0, s * R * 0.5, -R * 0.2, s * R * 0.3); fg.fill();
  }
  // sừng
  fg.strokeStyle = '#f8e3a3'; fg.lineWidth = Math.max(2, R * 0.18); fg.lineCap = 'round';
  [-1, 1].forEach(s => { fg.beginPath(); fg.moveTo(R * 0.1, s * R * 0.75); fg.quadraticCurveTo(-R * 0.9, s * R * 1.6, -R * 2.1, s * R * 1.9); fg.stroke();
    fg.beginPath(); fg.moveTo(-R * 1.0, s * R * 1.45); fg.lineTo(-R * 0.9, s * R * 2.15); fg.stroke(); });
  // đầu
  const hg = fg.createLinearGradient(0, -R, 0, R); hg.addColorStop(0, '#ffe58a'); hg.addColorStop(0.55, '#f0b632'); hg.addColorStop(1, '#b8780e');
  fg.fillStyle = hg; fg.strokeStyle = '#7a4a08'; fg.lineWidth = Math.max(1.5, R * 0.08);
  fg.beginPath(); fg.moveTo(-R * 0.6, -R * 0.85); fg.bezierCurveTo(R * 0.2, -R * 1.25, R * 0.9, -R * 1.0, R * 1.3, -R * 0.6);
  fg.quadraticCurveTo(R * 2.1, -R * 0.62, R * 2.7, -R * 0.3); fg.quadraticCurveTo(R * 3.05, 0, R * 2.65, R * 0.22);
  fg.lineTo(R * 1.5, R * 0.3); fg.lineTo(R * 2.45, R * 0.55); fg.quadraticCurveTo(R * 1.8, R * 1.0, R * 0.5, R * 0.95); fg.quadraticCurveTo(-R * 0.4, R * 1.0, -R * 0.6, R * 0.6); fg.closePath(); fg.fill(); fg.stroke();
  // vảy chấm
  fg.fillStyle = 'rgba(160,90,10,.45)'; for (let i = 0; i < 4; i++) { fg.beginPath(); fg.arc(-R * 0.2 + i * R * 0.35, R * 0.15 + (i % 2) * R * 0.2, R * 0.1, 0, 7); fg.fill(); }
  // răng
  fg.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { fg.beginPath(); fg.moveTo(R * (1.75 + i * 0.25), R * 0.32); fg.lineTo(R * (1.85 + i * 0.25), R * 0.5); fg.lineTo(R * (1.95 + i * 0.25), R * 0.34); fg.fill(); }
  // mắt + mày
  fg.fillStyle = '#fff'; fg.beginPath(); fg.ellipse(R * 0.85, -R * 0.45, R * 0.3, R * 0.22, 0.15, 0, 7); fg.fill();
  fg.fillStyle = '#c0261a'; fg.beginPath(); fg.arc(R * 0.92, -R * 0.45, R * 0.15, 0, 7); fg.fill();
  fg.fillStyle = '#111'; fg.beginPath(); fg.arc(R * 0.95, -R * 0.45, R * 0.07, 0, 7); fg.fill();
  fg.strokeStyle = '#7a4a08'; fg.lineWidth = Math.max(2, R * 0.12); fg.beginPath(); fg.moveTo(R * 0.45, -R * 0.78); fg.quadraticCurveTo(R * 0.95, -R * 0.95, R * 1.35, -R * 0.68); fg.stroke();
  fg.fillStyle = '#7a4a08'; fg.beginPath(); fg.arc(R * 2.5, -R * 0.25, R * 0.07, 0, 7); fg.fill();   // lỗ mũi
  // râu rồng bay
  fg.strokeStyle = '#fff3c4'; fg.lineWidth = Math.max(1.5, R * 0.09);
  [-1, 1].forEach(s => { fg.beginPath(); fg.moveTo(R * 2.4, s * R * 0.2); fg.bezierCurveTo(R * 3.4, s * R * 0.9, R * 2.2, s * R * (2.0 + Math.sin(t * 5) * 0.4), R * 0.4, s * R * (2.3 + Math.cos(t * 4) * 0.4)); fg.stroke(); });
}
function dragonStep(dt) {
  fg.clearRect(0, 0, innerWidth, innerHeight);
  if (!dragon) return; const d = dragon; d.t += dt;
  const W2 = innerWidth, H2 = innerHeight, T = 10, R = Math.max(10, Math.min(W2, H2) * 0.024);
  // 1 giây đầu: chuỗi hạt bay lên từ người; sau đó lượn theo 3 kiểu, chuyển kiểu mượt
  let hx, hy;
  if (d.t < 1) { const k = d.t, e = k * k * (3 - 2 * k), [tx, ty] = dragonPath(d.kinds[0], 0, W2, H2, d.dir); hx = d.sx + (tx - d.sx) * e; hy = d.sy + (ty - d.sy) * e - Math.sin(k * Math.PI) * 90; }
  else {
    const seg = 3, u = d.t - 1, i = Math.min(d.kinds.length - 1, Math.floor(u / seg)), lu = u - i * seg;
    let [x, y] = dragonPath(d.kinds[i], lu, W2, H2, d.dir);
    if (i > 0 && lu < 0.8) { const [px, py] = dragonPath(d.kinds[i - 1], lu + seg, W2, H2, d.dir), k = lu / 0.8, e = k * k * (3 - 2 * k); x = px + (x - px) * e; y = py + (y - py) * e; }
    if (d.t > T - 1.2) { const k = (d.t - (T - 1.2)) / 1.2; y -= k * k * H2 * 0.7; }   // cuối cùng bay vút lên trời
    hx = x; hy = y;
  }
  d.hist.unshift([hx, hy]); if (d.hist.length > 900) d.hist.pop();
  // xếp hạt đều theo chiều dài đường bay
  const N = 54, gap = R * 1.75, beads = []; let acc = 0, need = gap * 0.9;
  for (let i = 1; i < d.hist.length && beads.length < N; i++) {
    const [x0, y0] = d.hist[i - 1], [x1, y1] = d.hist[i], L = Math.hypot(x1 - x0, y1 - y0); if (!L) continue;
    while (acc + L >= need && beads.length < N) { const k = (need - acc) / L; beads.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]); need += gap; }
    acc += L;
  }
  const alpha = Math.max(0, Math.min(1, d.t * 3, (T - d.t) / 0.6));
  fg.save(); fg.globalAlpha = alpha;
  // hào quang + tia lấp lánh
  if (Math.random() < 0.8) d.sparks.push({ x: hx + (Math.random() - 0.5) * R * 2, y: hy + (Math.random() - 0.5) * R * 2, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, l: 1 });
  d.sparks = d.sparks.filter(s => (s.l -= dt * 0.9) > 0);
  d.sparks.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; fg.fillStyle = `rgba(255,226,140,${s.l})`; fg.beginPath(); fg.arc(s.x, s.y, 1.5 + s.l * 2, 0, 7); fg.fill(); });
  // dây xâu hạt
  if (beads.length > 1) { fg.strokeStyle = 'rgba(200,40,30,.9)'; fg.lineWidth = Math.max(1.5, R * 0.14); fg.beginPath(); fg.moveTo(hx, hy); beads.forEach(([x, y]) => fg.lineTo(x, y)); fg.stroke(); }
  // hạt: gỗ, cứ 9 hạt một hạt vàng, hạt thứ 27 ngọc bích
  fg.shadowColor = 'rgba(255,200,90,.85)'; fg.shadowBlur = 12;
  for (let i = beads.length - 1; i >= 0; i--) {
    const [x, y] = beads[i], wob = 1 + Math.sin(d.t * 8 - i * 0.5) * 0.05, r = R * (1 - i / N * 0.4) * wob;
    drawBead(x, y, r, (i + 1) % 27 === 0 ? 'jade' : (i + 1) % 9 === 0 ? 'gold' : 'wood');
  }
  // đuôi: hạt mẫu lớn + tua đỏ
  const tl = beads[beads.length - 1];
  if (tl && beads.length > 4) {
    const pv = beads[beads.length - 3], ta = Math.atan2(tl[1] - pv[1], tl[0] - pv[0]);
    fg.save(); fg.translate(tl[0], tl[1]); fg.rotate(ta);
    drawBead(R * 0.9, 0, R * 0.95, 'gold');
    fg.shadowBlur = 0; fg.strokeStyle = '#c0261a'; fg.lineWidth = Math.max(1, R * 0.08);
    for (let k = -4; k <= 4; k++) { fg.beginPath(); fg.moveTo(R * 1.7, k * R * 0.05); fg.quadraticCurveTo(R * 2.8, k * R * 0.18 + Math.sin(d.t * 7 + k) * R * 0.3, R * 3.6, k * R * 0.3 + Math.sin(d.t * 6 + k) * R * 0.5); fg.stroke(); }
    fg.restore();
  }
  // đầu rồng + ngọc
  const h1 = d.hist[4] || d.hist[0], a = Math.atan2(hy - h1[1], hx - h1[0]);
  fg.save(); fg.translate(hx, hy); fg.rotate(a); if (Math.cos(a) < 0) fg.scale(1, -1);
  fg.shadowColor = 'rgba(255,200,90,.9)'; fg.shadowBlur = 22; drawDragonHead(R * 1.15, d.t); fg.restore();
  const px = hx + Math.cos(a) * R * 5.2, py = hy + Math.sin(a) * R * 5.2 + Math.sin(d.t * 4) * R * 0.4;
  const pg = fg.createRadialGradient(px, py, 0, px, py, R * 1.6); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.35, '#fff1b0'); pg.addColorStop(1, 'rgba(255,220,120,0)');
  fg.fillStyle = pg; fg.beginPath(); fg.arc(px, py, R * 1.6, 0, 7); fg.fill();
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
    const autoMoving = !manual && autoStep(dt), moving = manual; me.moving = moving || autoMoving;
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
    const hallIn = W.halls.find(h => inHallBox(h, me.pos, me.y));
    W.halls.forEach(h => { h.front.forEach(r => { r.visible = h !== hallIn; }); });   // giữ mái; chỉ ẩn cột hiên & bảng tên khi ở trong điện
    camInHall = !!hallIn;
    const inHall = !!hallIn;
    // trong điện: camera ở tầm mắt, dưới trần gỗ, nhìn thấy Tam Thế Phật, trần, đèn treo và người chơi
    const dist = malaOn ? 3.2 : inHall ? Math.max(4.2, Math.min(cam.dist + 1.2, 8)) : cam.dist, pitch = malaOn ? 0.42 : inHall ? Math.min(0.42, Math.max(cam.pitch, 0.16)) : cam.pitch;
    let cp = new THREE.Vector3(tgt.x + Math.sin(cam.yaw) * Math.cos(pitch) * dist, tgt.y + Math.sin(pitch) * dist, tgt.z + Math.cos(cam.yaw) * Math.cos(pitch) * dist);
    const hit = rayBoxes(tgt, cp); if (hit < 1) cp = tgt.clone().lerp(cp, Math.max(0.15, hit - 0.08));
    if (inHall && hallIn.ceilY) cp.y = Math.min(cp.y, hallIn.ceilY - 0.75);
    camera.position.lerp(cp, Math.min(1, dt * 8)); camera.lookAt(tgt);
    sun.position.set(me.pos.x + 25, 45, me.pos.z + 20); sun.target.position.copy(tgt);
    // NPC, sư trụ trì, nhãn
    npcs.forEach(n => { const mv = npcThink(n, dt); n.av.update(dt, mv); placeLabel(n.label, n.av.root.position, n.av.height + 0.15); });
    NET.step(dt);
    if (abbot) { abbot.av.update(dt, false); abbot.av.root.rotation.y = Math.atan2(me.pos.x - abbot.av.root.position.x, me.pos.z - abbot.av.root.position.z); placeLabel(abbot.label, abbot.av.root.position, abbot.av.height + 0.15); }
    placeLabel(me.label, me.av.root.position, me.av.height + 0.15);
    if (meritLbl) { placeLabel(meritLbl, W.merit, 1.6); if (W.merit.distanceTo(me.av.root.position) > 12) meritLbl.style.display = 'none'; }
    ANIM.forEach(f => f(t));
    smokes.forEach(s => s.update(dt, smokeBoost)); smokeBoost = Math.max(0, smokeBoost - dt);
    lanternStep(dt);
    // ngữ cảnh, địa danh, âm thanh theo khoảng cách
    if ((t * 10 | 0) % 3 === 0) {
      ctxAction = findContext(); const cb = $('ctx'); cb.hidden = !ctxAction; if (ctxAction) cb.textContent = ctxAction.label;
      checkPois();

    }
    drawMini();
  }
  if (window.__freeCam) { const f = window.__freeCam; camera.position.set(f[0], f[1], f[2]); camera.lookAt(f[3], f[4], f[5]); }   // chỉ dùng khi kiểm thử
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

window.__B3 = THREE.Box3; window.__T = THREE; window.__game = { THREE_V: THREE.Vector3, me, get W() { return W; }, P, cam, loadTemple, launchDragon: (n, r) => launchDragon(n, r), petalShower: (k) => petalShower(k) };   // hỗ trợ kiểm thử
/* ---------------- bắt đầu ---------------- */
$('loading').remove();
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
function welcome() {
  modal('A Di Đà Phật!', (b) => {
    b.append(el('p', 'big', `Chào ${P.name} trở lại chùa.`), el('p', 'note', `Cấp ${levelOf(P.beads) + 1} · ${C.levels[levelOf(P.beads)].name} · ${fmt(P.beads)} hạt`));
    const row = el('div', 'row');
    const go = el('button', 'btn gold', '🙏 Vào chùa'); go.onclick = () => { A.ensure(); checkIn(); closeModal(); fade(() => loadTemple(P.temple)); };
    const pick = el('button', 'btn', '🗺 Chọn chùa khác'); pick.onclick = () => { A.ensure(); checkIn(); openTemplePicker(true); };
    const ch = el('button', 'btn', 'Đổi nhân vật'); ch.onclick = () => characterForm(false);
    row.append(go, pick, ch); b.append(row);
    if (ACC.user) b.append(el('p', 'note', `👤 Tài khoản: ${ACC.user.user} · tiến trình được lưu tự động`));
    else { const ar = el('div', 'row'), li = el('button', 'btn ghost', '🔑 Đăng nhập tài khoản'); li.onclick = () => { ACC.openAccount('login'); closeHook = () => setTimeout(welcome, 0); }; ar.append(li); b.append(el('p', 'note warn', '⚠️ Chưa đăng nhập: dữ liệu chỉ lưu tạm trên trình duyệt này.'), ar); }
  }, { noClose: true });
}
if (P.name) welcome(); else characterForm(true);
hud();
loop();
