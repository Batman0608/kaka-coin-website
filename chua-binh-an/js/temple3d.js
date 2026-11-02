/* =========================================================================
 *  MÔ HÌNH 3D CÁC CHÙA (Three.js) — dựng bằng code theo đặc điểm kiến trúc
 *  thật của từng chùa: mái cong đao, cột đỏ, tháp nhiều tầng, tượng lớn,
 *  hồ sen, núi, sông, biển... Đây là mô hình minh họa, không phải bản sao
 *  đo đạc chính xác.  Dùng:  const v = mount(element, 'mot-cot'); v.dispose();
 * ========================================================================= */
import * as THREE from '../vendor/three/three.module.min.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

/* ---------------- vật liệu ---------------- */
const M = {};
function mat(key, color, o = {}) {
  if (!M[key]) M[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0 }, o));
  return M[key];
}
const RED = () => mat('red', 0x9c2a1a), DRED = () => mat('dred', 0x5a160c), WALL = () => mat('wall', 0xe9dcc0);
const YWALL = () => mat('ywall', 0xe6c56a), ROOF = () => mat('roof', 0x4a2c22, { roughness: 0.9 }), STONE = () => mat('stone', 0xb9b2a4);
const GOLD = () => mat('gold', 0xd9a83a, { metalness: 0.75, roughness: 0.3 }), WHITE = () => mat('white', 0xf3f0e8, { roughness: 0.55 });
const BRONZE = () => mat('bronze', 0x9a6a2a, { metalness: 0.8, roughness: 0.35 }), WOOD = () => mat('wood', 0x5a3a22);
const LEAF = () => mat('leaf', 0x3f7a3a, { flatShading: true }), LEAF2 = () => mat('leaf2', 0x2f5f2f, { flatShading: true });
const GRASS = () => mat('grass', 0x5f8a45), DARK = () => mat('dark', 0x1a0f0a), WATER = () => mat('water', 0x3c7f9a, { roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.88 });

function mesh(geo, m, x = 0, y = 0, z = 0, shadow = true) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z);
  o.castShadow = shadow; o.receiveShadow = true; return o;
}
const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
const cyl = (rt, rb, h, seg, m, x, y, z) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);

/* ---------------- kiến trúc ---------------- */
/* mái cong kiểu Việt: mái chóp 4 mặt + 4 đầu đao cong vút + bờ nóc */
function roof(w, d, h, color = null, gold = true) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.22, 0.7071, 1, 4, 1); geo.rotateY(Math.PI / 4);
  const r = mesh(geo, color ? mat('roof' + color, color, { roughness: 0.9 }) : ROOF()); r.scale.set(w, h, d); r.position.y = h / 2; g.add(r);
  const ridge = box(w * 0.34, h * 0.12, d * 0.12, gold ? GOLD() : DRED(), 0, h * 1.02, 0); g.add(ridge);
  const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  corners.forEach(([sx, sz]) => {
    const c = mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.035, h * 0.75, 6), gold ? GOLD() : DRED());
    c.position.set(sx * w * 0.5, h * 0.18, sz * d * 0.5);
    c.rotation.z = -sx * 0.9; c.rotation.x = sz * 0.9; g.add(c);
  });
  [-1, 1].forEach(sx => { const c = mesh(new THREE.ConeGeometry(h * 0.08, h * 0.5, 6), GOLD()); c.position.set(sx * w * 0.17, h * 1.15, 0); c.rotation.z = -sx * 0.5; g.add(c); });
  g.traverse(o => { o.userData.noCollide = true; });   // mái không chặn đường đi
  return g;
}
/* điện thờ: nền đá, cột đỏ, tường, 1–2 tầng mái */
let INTERIOR = null;   // game 3D: { set: 'hoanh'|'thu'|'nam' } → chánh điện mở cửa, có bàn thờ & đệm
export const HALLS = [];
export const ANIM = [];   // hàm cập nhật hiệu ứng mỗi khung hình (game gọi)
/* ảnh tượng thật (đã tách nền) + màu hào quang */
const PHOTO = { duocsu: ['assets/buddha/duocsu.webp', 442 / 700, '#8fc3ff'], thichca: ['assets/buddha/thichca.webp', 725 / 860, '#ffd36b'], adida: ['assets/buddha/adida.webp', 576 / 700, '#ff9f6b'], dilac: ['assets/buddha/dilac.webp', 617 / 700, '#ffe9a8'] };
const texLoader = new THREE.TextureLoader();
function glowTex(color, kind = 'glow') {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  if (kind === 'rays') {
    g.translate(128, 128);
    for (let i = 0; i < 28; i++) { g.rotate(Math.PI * 2 / 28); const gr = g.createLinearGradient(0, 0, 0, -128); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = gr; g.globalAlpha = i % 2 ? 0.35 : 0.6; g.beginPath(); g.moveTo(-3, 0); g.lineTo(-9, -128); g.lineTo(9, -128); g.lineTo(3, 0); g.fill(); }
  } else {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,250,225,1)'); gr.addColorStop(0.35, color); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const addMat = (map, op = 1) => new THREE.MeshBasicMaterial({ map, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
function photoBuddha(g, key, x, y, z, h) {
  const [src, asp, col] = PHOTO[key]; const w = h * asp;
  // hào quang phía sau: vầng sáng + tia xoay + vòng sáng sau đầu
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.2, h * 1.7), addMat(glowTex(col), 0.75)); glow.position.set(x, y + h * 0.55, z - 0.08); glow.userData.noCollide = true; g.add(glow);
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(h * 1.9, h * 1.9), addMat(glowTex(col, 'rays'), 0.5)); rays.position.set(x, y + h * 0.78, z - 0.06); rays.userData.noCollide = true; g.add(rays);
  const ring = new THREE.Mesh(new THREE.RingGeometry(h * 0.16, h * 0.18, 48), new THREE.MeshBasicMaterial({ color: 0xffe7a0, transparent: true, opacity: 0.85, toneMapped: false })); ring.position.set(x, y + h * 0.82, z - 0.04); ring.userData.noCollide = true; g.add(ring);
  const tex = texLoader.load(src); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const img = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, toneMapped: false })); img.position.set(x, y + h / 2, z); img.userData.noCollide = true; g.add(img);
  const ph = Math.random() * 6;
  ANIM.push((t) => { rays.rotation.z = t * 0.12 + ph; const k = 0.85 + 0.15 * Math.sin(t * 1.3 + ph); glow.material.opacity = 0.65 * k; rays.material.opacity = 0.42 * k; glow.scale.setScalar(0.96 + 0.06 * k); });
}
/* hình cánh sen (canvas) cho hạt rơi — tránh hiện thành ô vuông */
let _petal = null;
export function PETAL_TEX() {
  if (_petal) return _petal;
  const c = document.createElement('canvas'); c.width = c.height = 64; const k = c.getContext('2d');
  k.translate(32, 32); k.rotate(0.5);
  const gr = k.createRadialGradient(-4, -6, 2, 0, 0, 26); gr.addColorStop(0, '#fff0f4'); gr.addColorStop(0.5, '#ffb3c6'); gr.addColorStop(1, '#f07898');
  k.fillStyle = gr; k.beginPath(); k.moveTo(0, -26); k.quadraticCurveTo(18, -6, 0, 26); k.quadraticCurveTo(-18, -6, 0, -26); k.fill();
  k.strokeStyle = 'rgba(230,110,140,.6)'; k.lineWidth = 1.5; k.beginPath(); k.moveTo(0, -20); k.lineTo(0, 20); k.stroke();
  _petal = new THREE.CanvasTexture(c); _petal.colorSpace = THREE.SRGBColorSpace; return _petal;
}
function altarFx(g, x0, x1, y, z) {   // cánh sen rơi & đốm sáng trước bàn thờ
  const N = 60, pos = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) { pos[i * 3] = x0 + Math.random() * (x1 - x0); pos[i * 3 + 1] = y + Math.random() * 3; pos[i * 3 + 2] = z + Math.random() * 1.5; vel.push(0.15 + Math.random() * 0.25); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const petals = new THREE.Points(geo, new THREE.PointsMaterial({ map: PETAL_TEX(), size: 0.16, transparent: true, alphaTest: 0.25, depthWrite: false })); g.add(petals);
  const M = 40, mp = new Float32Array(M * 3); for (let i = 0; i < M; i++) { mp[i * 3] = x0 + Math.random() * (x1 - x0); mp[i * 3 + 1] = y + Math.random() * 3; mp[i * 3 + 2] = z - 0.3 + Math.random() * 0.6; }
  const mgeo = new THREE.BufferGeometry(); mgeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mgeo, new THREE.PointsMaterial({ color: 0xffe08a, size: 0.06, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(motes);
  let last = 0;
  ANIM.push((t) => {
    const dt = Math.min(0.05, t - last); last = t;
    for (let i = 0; i < N; i++) { pos[i * 3 + 1] -= vel[i] * dt; pos[i * 3] += Math.sin(t + i) * dt * 0.15; if (pos[i * 3 + 1] < y - 0.6) pos[i * 3 + 1] = y + 3; }
    for (let i = 0; i < M; i++) { mp[i * 3 + 1] += dt * 0.25; if (mp[i * 3 + 1] > y + 3.2) mp[i * 3 + 1] = y; }
    geo.attributes.position.needsUpdate = true; mgeo.attributes.position.needsUpdate = true;
    motes.material.opacity = 0.6 + 0.3 * Math.sin(t * 2);
  });
}
/* Bảng Vàng trên tường (canvas, cập nhật bởi game) */
export const BOARDS = [];
function goldBoard(g, x, y, z, ry, title) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 340;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.73), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.position.set(x, y, z); m.rotation.y = ry; m.userData.noCollide = true; g.add(m);
  const fr = box(1.42, 1.85, 0.06, GOLD(), x, y, z - 0.04 * Math.cos(ry)); fr.rotation.y = ry; fr.userData.noCollide = true; g.add(fr);
  BOARDS.push({ c, tex, title, draw(rows) {
    const k = c.getContext('2d'); k.fillStyle = '#3a0d05'; k.fillRect(0, 0, 256, 340); k.strokeStyle = '#e9b949'; k.lineWidth = 6; k.strokeRect(8, 8, 240, 324);
    k.fillStyle = '#ffd36b'; k.font = '900 22px Georgia, serif'; k.textAlign = 'center'; k.fillText(title, 128, 44); k.font = '12px sans-serif'; k.fillStyle = '#e8c99a'; k.fillText('Tinh tấn trong chùa', 128, 64);
    k.textAlign = 'left'; rows.slice(0, 7).forEach(([n, v], i) => { const yy = 96 + i * 34; k.fillStyle = i < 3 ? ['#ffd36b', '#e6e6f0', '#f0b07a'][i] : '#c9a888'; k.beginPath(); k.arc(30, yy - 6, 9, 0, 7); k.fill(); k.fillStyle = '#3a0d05'; k.font = '800 11px sans-serif'; k.fillText(String(i + 1), 26.5, yy - 2); k.fillStyle = '#fff1c2'; k.font = '700 15px sans-serif'; k.fillText(n.slice(0, 14), 46, yy); k.fillStyle = '#ffd36b'; k.textAlign = 'right'; k.fillText(String(v), 236, yy); k.textAlign = 'left'; });
    tex.needsUpdate = true;
  } });
}
/* ---------------- tranh vách sau tượng: mỗi vị Phật một bức riêng ---------------- */
const MURAL_OF = { thichca: 'bodhi', adida: 'pureland', duocsu: 'lapis', dilac: 'maitreya' };
function backdrop(g, keys, w, d, base, h, panelMode) {
  const bw = Math.min(w * 0.4, 5.5), bh = bw * 0.17;   // hoành phi
  const zb = -d / 2 + 0.31, y0 = base + 0.95, top = base + h - 0.3 - bh - 0.12, ph = Math.max(1.4, top - y0);
  const nc = (o) => { o.traverse(x => { x.userData.noCollide = true; x.castShadow = false; }); g.add(o); return o; };
  const pw = keys.length === 1 ? Math.min(w * 0.42, 6) : w * 0.25 - 0.18;
  if (!panelMode) keys.forEach(([k, xi]) => {
    const x = xi * w * 0.25, kind = MURAL_OF[k] || 'bodhi';
    nc(box(pw + 0.16, ph + 0.16, 0.04, GOLD(), x, y0 + ph / 2, zb - 0.01));                 // khung vàng
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: muralTex(kind, 512, Math.round(512 * ph / pw)), toneMapped: false }));
    m.position.set(x, y0 + ph / 2, zb + 0.02); nc(m);
  });
  // hoành phi trên cao & đôi câu đối hai bên
  const hp = boardTex('ĐẠI HÙNG BẢO ĐIỆN', false, 1024, 174);
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: hp, toneMapped: false }));
  hm.position.set(0, y0 + ph + 0.12 + bh / 2, zb + 0.03); nc(hm);
  const cw = 0.5, chh = Math.min(ph, 2.8);
  [['PHẬT QUANG PHỔ CHIẾU', -1], ['PHÁP LUÂN THƯỜNG CHUYỂN', 1]].forEach(([t, sx]) => {
    const x = sx * (keys.length === 1 ? pw / 2 + 0.6 : w * 0.25 * 1.5 + 0.05); if (Math.abs(x) > w / 2 - 0.5) return;
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(cw, chh), new THREE.MeshBasicMaterial({ map: boardTex(t, true, 160, Math.round(160 * chh / cw)), toneMapped: false }));
    cm.position.set(x, y0 + chh / 2 + 0.1, zb + 0.03); nc(cm);
  });
}
function boardTex(text, vertical, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const k = c.getContext('2d');
  const gr = k.createLinearGradient(0, 0, vertical ? W : 0, vertical ? 0 : H); gr.addColorStop(0, '#5a0a06'); gr.addColorStop(0.5, '#8e1a0e'); gr.addColorStop(1, '#5a0a06');
  k.fillStyle = gr; k.fillRect(0, 0, W, H);
  const b = Math.min(W, H) * 0.08; k.strokeStyle = '#e9b949'; k.lineWidth = b; k.strokeRect(b / 2, b / 2, W - b, H - b);
  k.lineWidth = 2; k.strokeRect(b * 1.5, b * 1.5, W - b * 3, H - b * 3);
  k.fillStyle = '#ffd36b'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.shadowColor = 'rgba(0,0,0,.5)'; k.shadowBlur = 4;
  const serif = "Georgia, 'Times New Roman', serif";
  if (!vertical) { let fs = H * 0.5; k.font = `900 ${fs}px ${serif}`; while (k.measureText(text).width > W * 0.84) { fs -= 2; k.font = `900 ${fs}px ${serif}`; } k.fillText(text, W / 2, H / 2 + 2); }
  else { const words = text.split(' '), step = (H - b * 4) / words.length; let fs = Math.min(W * 0.36, step * 0.42); k.font = `900 ${fs}px ${serif}`; words.forEach((wd, i) => { let f = fs; while (k.measureText(wd).width > W * 0.8 && f > 10) { f -= 1; k.font = `900 ${f}px ${serif}`; } k.fillText(wd, W / 2, b * 2 + step * (i + 0.5)); k.font = `900 ${fs}px ${serif}`; }); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/* tranh vẽ tay bằng canvas: bodhi (cây Bồ Đề) · pureland (Tây Phương Tịnh Độ) · lapis (Dược Sư lưu ly) · maitreya (Di Lặc) · guanyin (Quan Âm) */
function muralTex(kind, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const k = c.getContext('2d');
  let seed = kind.length * 977 + W; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pal = { bodhi: ['#3a0805', '#7a1a0e', '#a8321a'], pureland: ['#06202c', '#0f4a5c', '#2a8a8a'], lapis: ['#06123a', '#16307a', '#2a56b8'], maitreya: ['#3a1e04', '#8a5210', '#c98a1c'], guanyin: ['#062a24', '#0f5a4a', '#3a9a7a'] }[kind];
  const bg = k.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, pal[0]); bg.addColorStop(0.55, pal[1]); bg.addColorStop(1, pal[2]); k.fillStyle = bg; k.fillRect(0, 0, W, H);
  const gold = (a = 1) => `rgba(240,196,92,${a})`;
  // hào quang lớn sau đầu tượng
  const cx = W / 2, cy = H * 0.36;
  const halo = k.createRadialGradient(cx, cy, 0, cx, cy, W * 0.48); halo.addColorStop(0, 'rgba(255,230,160,.55)'); halo.addColorStop(0.5, 'rgba(255,200,100,.18)'); halo.addColorStop(1, 'rgba(255,200,100,0)');
  k.fillStyle = halo; k.fillRect(0, 0, W, H);
  k.strokeStyle = gold(0.35); k.lineWidth = 2; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; k.beginPath(); k.moveTo(cx + Math.cos(a) * W * 0.18, cy + Math.sin(a) * W * 0.18); k.lineTo(cx + Math.cos(a) * W * 0.46, cy + Math.sin(a) * W * 0.46); k.stroke(); }
  const cloud = (x, y, s, a = 0.8) => { k.strokeStyle = gold(a); k.fillStyle = gold(a * 0.18); k.lineWidth = Math.max(2, s * 0.08);
    k.beginPath(); k.arc(x, y, s * 0.5, Math.PI, 0); k.arc(x + s * 0.55, y, s * 0.35, Math.PI, 0); k.arc(x - s * 0.5, y + s * 0.05, s * 0.3, Math.PI, 0); k.closePath(); k.fill(); k.stroke();
    k.beginPath(); k.arc(x, y - s * 0.12, s * 0.22, Math.PI * 0.2, Math.PI * 1.7); k.stroke(); };
  const lotus = (x, y, s, col = '#f2a0b8') => { for (let i = -3; i <= 3; i++) { k.save(); k.translate(x, y); k.rotate(i * 0.32); k.fillStyle = i % 2 ? col : '#ffd0dc'; k.beginPath(); k.ellipse(0, -s * 0.5, s * 0.18, s * 0.5, 0, 0, 7); k.fill(); k.restore(); } k.fillStyle = gold(1); k.beginPath(); k.ellipse(x, y, s * 0.5, s * 0.12, 0, 0, 7); k.fill(); };
  if (kind === 'bodhi') {
    // thân & cành cây Bồ Đề
    k.strokeStyle = '#5a3414'; k.lineCap = 'round';
    const branch = (x, y, a, len, wd, n) => { if (n === 0 || len < 8) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; k.lineWidth = wd; k.beginPath(); k.moveTo(x, y); k.lineTo(x2, y2); k.stroke(); branch(x2, y2, a - 0.45 - rnd() * 0.2, len * 0.72, wd * 0.68, n - 1); branch(x2, y2, a + 0.45 + rnd() * 0.2, len * 0.72, wd * 0.68, n - 1); };
    branch(W * 0.5, H, -Math.PI / 2, H * 0.3, W * 0.06, 6);
    for (let i = 0; i < 260; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * W * 0.5, x = cx + Math.cos(a) * r, y = H * 0.33 + Math.sin(a) * r * 0.75; k.save(); k.translate(x, y); k.rotate(rnd() * 6.28); k.fillStyle = rnd() < 0.55 ? 'rgba(232,186,80,.9)' : 'rgba(90,140,60,.85)'; k.beginPath(); k.moveTo(0, -10); k.bezierCurveTo(9, -10, 9, 4, 0, 13); k.bezierCurveTo(-9, 4, -9, -10, 0, -10); k.fill(); k.restore(); }
  } else if (kind === 'pureland') {
    // lầu gác Tây Phương trên mây, ao thất bảo sen nở
    [[W * 0.2, H * 0.14], [W * 0.8, H * 0.12]].forEach(([x, y]) => { k.fillStyle = gold(0.9); k.fillRect(x - W * 0.08, y, W * 0.16, H * 0.05); k.beginPath(); k.moveTo(x - W * 0.12, y + 2); k.lineTo(x, y - H * 0.05); k.lineTo(x + W * 0.12, y + 2); k.fill(); cloud(x, y + H * 0.08, W * 0.14, 0.7); });
    k.fillStyle = 'rgba(120,220,220,.25)'; for (let i = 0; i < 6; i++) k.fillRect(0, H * (0.72 + i * 0.045), W, 3);
    for (let i = 0; i < 9; i++) lotus(W * (0.08 + i * 0.105), H * (0.8 + (i % 2) * 0.06), W * 0.07);
  } else if (kind === 'lapis') {
    // Dược Sư Lưu Ly Quang: nền lưu ly, mặt trời mặt trăng, mây lành
    k.fillStyle = 'rgba(255,214,107,.9)'; k.beginPath(); k.arc(W * 0.16, H * 0.12, W * 0.07, 0, 7); k.fill();
    k.fillStyle = 'rgba(230,240,255,.9)'; k.beginPath(); k.arc(W * 0.84, H * 0.12, W * 0.07, 0, 7); k.fill(); k.fillStyle = pal[0]; k.beginPath(); k.arc(W * 0.87, H * 0.11, W * 0.06, 0, 7); k.fill();
    for (let i = 0; i < 70; i++) { k.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.6})`; k.fillRect(rnd() * W, rnd() * H * 0.6, 2, 2); }
  } else if (kind === 'maitreya') {
    for (let i = 0; i < 18; i++) { const x = rnd() * W, y = H * 0.55 + rnd() * H * 0.4; k.fillStyle = 'rgba(255,170,190,.9)'; for (let j = 0; j < 5; j++) { const a = j / 5 * 6.28; k.beginPath(); k.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 6, 0, 7); k.fill(); } k.fillStyle = gold(1); k.beginPath(); k.arc(x, y, 4, 0, 7); k.fill(); }
  } else if (kind === 'guanyin') {
    // bình cam lồ, cành dương liễu, sóng biển
    k.strokeStyle = 'rgba(200,240,220,.5)'; k.lineWidth = 3; for (let r = 0; r < 4; r++) { k.beginPath(); for (let x = 0; x <= W; x += 8) k.lineTo(x, H * (0.82 + r * 0.05) + Math.sin(x * 0.05 + r) * 6); k.stroke(); }
    k.strokeStyle = 'rgba(160,220,120,.9)'; k.lineWidth = 2; for (let i = 0; i < 7; i++) { k.beginPath(); k.moveTo(W * 0.82, H * 0.2); k.quadraticCurveTo(W * (0.7 + i * 0.03), H * 0.35, W * (0.66 + i * 0.04), H * (0.48 + i * 0.02)); k.stroke(); }
  }
  // mây lành viền dưới & góc trên, khung hoa văn vàng
  for (let i = 0; i < 5; i++) cloud(W * (0.1 + i * 0.2), H * 0.97, W * 0.12, 0.55);
  cloud(W * 0.12, H * 0.3, W * 0.1, 0.45); cloud(W * 0.88, H * 0.34, W * 0.1, 0.45);
  const b = W * 0.035; k.strokeStyle = gold(1); k.lineWidth = b; k.strokeRect(b / 2, b / 2, W - b, H - b); k.lineWidth = 2; k.strokeRect(b * 1.8, b * 1.8, W - b * 3.6, H - b * 3.6);
  [[b * 2.6, b * 2.6], [W - b * 2.6, b * 2.6], [b * 2.6, H - b * 2.6], [W - b * 2.6, H - b * 2.6]].forEach(([x, y]) => { k.fillStyle = gold(1); for (let i = 0; i < 8; i++) { k.save(); k.translate(x, y); k.rotate(i * Math.PI / 4); k.beginPath(); k.ellipse(0, b * 0.5, b * 0.18, b * 0.45, 0, 0, 7); k.fill(); k.restore(); } });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/* khám thờ 3D: vách chạm vàng phủ tường sau + khung khám lõm + bửu cái + cột rồng,
   bức tranh Phật đặt sâu trong khám nên nhìn như tượng trong điện thật (không phẳng như tranh). */
const BUDDHA_IMG = { three: ['assets/buddha/tamthe.webp', 1280 / 853], one: ['assets/buddha/phat1.webp', 460 / 900] };
let _carved = null;
function carvedWallTex() {
  if (_carved) return _carved;
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const k = c.getContext('2d');
  const g = k.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#7a4a18'); g.addColorStop(0.5, '#9c6a22'); g.addColorStop(1, '#6e3e14'); k.fillStyle = g; k.fillRect(0, 0, 512, 512);
  // ô đứng sơn son
  for (let i = 0; i < 4; i++) { k.fillStyle = i % 2 ? 'rgba(120,24,12,.5)' : 'rgba(150,40,18,.35)'; k.fillRect(i * 128 + 10, 0, 108, 512); }
  // hoa văn chạm vàng: huy chương hoa sen + mây
  k.strokeStyle = 'rgba(240,206,120,.85)'; k.lineWidth = 3;
  for (let r = 0; r < 512; r += 128) for (let cx = 64; cx < 512; cx += 128) {
    k.save(); k.translate(cx, r + 64);
    for (let p = 0; p < 10; p++) { k.rotate(Math.PI / 5); k.beginPath(); k.ellipse(0, 22, 7, 20, 0, 0, 7); k.stroke(); }
    k.fillStyle = 'rgba(240,206,120,.9)'; k.beginPath(); k.arc(0, 0, 9, 0, 7); k.fill();
    k.strokeStyle = 'rgba(240,206,120,.5)'; k.beginPath(); k.arc(0, 0, 40, 0, 7); k.stroke(); k.strokeStyle = 'rgba(240,206,120,.85)';
    k.restore();
  }
  // đường chỉ vàng dọc
  k.strokeStyle = 'rgba(255,220,140,.6)'; k.lineWidth = 2; for (let x = 0; x <= 512; x += 128) { k.beginPath(); k.moveTo(x, 0); k.lineTo(x, 512); k.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (_carved = t);
}
function frameRect(g, cx, cy, z, w, h, t, depth, m) {   // khung chữ nhật nổi (4 thanh) tạo chiều sâu
  g.add(box(w, t, depth, m, cx, cy + h / 2, z)); g.add(box(w, t, depth, m, cx, cy - h / 2, z));
  g.add(box(t, h + t, depth, m, cx - w / 2, cy, z)); g.add(box(t, h + t, depth, m, cx + w / 2, cy, z));
}
function altarPanel(g, w, d, base, h, set) {
  const z = -d / 2 + 0.9, zb = -d / 2 + 0.2, single = set === 'nam';
  const [src, asp] = single ? BUDDHA_IMG.one : BUDDHA_IMG.three;
  const nc = (o) => { o.traverse(x => { x.userData.noCollide = true; x.castShadow = false; }); g.add(o); return o; };
  const gold = mat('shrGold', 0xcf9a34, { metalness: 0.65, roughness: 0.35 }), red = mat('shrRed', 0x6e1008), dark = mat('shrDark', 0x1c0a04);
  // 1) vách chạm vàng phủ kín tường sau
  const tex = carvedWallTex().clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(2, w / 3), Math.max(2, h / 2.4));
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.5, h - 0.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3 }));
  wall.position.set(0, base + (h - 0.2) / 2, zb + 0.02); nc(wall);
  // kích thước bức Phật
  let ph = Math.min(h - 1.0, single ? 2.9 : 3.1), pw = ph * asp; if (pw > w - 2.0) { pw = w - 2.0; ph = pw / asp; }
  const cy = base + 1.0 + ph / 2, zf = zb + 0.06;
  // 2) hốc khám lõm (nền tối) + hào quang
  nc(box(pw + 0.5, ph + 0.5, 0.1, dark, 0, cy, zf - 0.02));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(pw * 1.2, ph * 1.3), addMat(glowTex('#ffdf95'), 0.75)); glow.position.set(0, cy, zf + 0.02); nc(glow);
  // 3) bức Phật đặt sâu trong khám
  const btex = texLoader.load(src); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 4;
  const img = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: btex, toneMapped: false })); img.position.set(0, cy, zf + 0.06); nc(img);
  // 4) khung nổi nhiều lớp (tạo chiều sâu 3D): vàng trong → đỏ ngoài, nhô dần ra
  frameRect(g, 0, cy, zf + 0.18, pw + 0.3, ph + 0.3, 0.14, 0.28, gold);
  frameRect(g, 0, cy, zf + 0.42, pw + 0.62, ph + 0.62, 0.22, 0.4, red);
  // 5) hai cột rồng vàng hai bên khám
  [-1, 1].forEach(sx => { const x = sx * (pw / 2 + 0.55); nc(cyl(0.16, 0.18, ph + 0.9, 12, gold, x, cy, zf + 0.5)); nc(cyl(0.22, 0.22, 0.18, 12, red, x, cy + ph / 2 + 0.5, zf + 0.5)); nc(cyl(0.22, 0.22, 0.18, 12, red, x, cy - ph / 2 - 0.4, zf + 0.5)); });
  // 6) bửu cái (tán che) phía trên khám
  const topY = cy + ph / 2 + 0.55;
  nc(box(pw + 1.3, 0.22, 0.7, red, 0, topY, zf + 0.5));
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.02, pw * 0.62, 0.45, 4), gold); canopy.rotation.y = Math.PI / 4; canopy.position.set(0, topY + 0.34, zf + 0.45); nc(canopy);
  for (let i = 0; i < 7; i++) { const ts = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), gold); ts.position.set(-pw * 0.55 + i * (pw * 1.1 / 6), topY - 0.14, zf + 0.72); nc(ts); }   // tua vàng rủ
  // 7) đài sen 3D + bàn thờ thấp trước bức Phật
  const lb = lotusBase(0.9, gold); lb.position.set(0, base + 0.2, z - 0.1); nc(lb);
  // 8) đèn hắt làm nổi khám
  const pl = new THREE.PointLight(0xffe0a0, 1.5, w * 1.3, 1.5); pl.position.set(0, cy + 0.3, z + 1.2); g.add(pl);
  ANIM.push((t) => { glow.material.opacity = 0.6 + 0.14 * Math.sin(t * 1.1); glow.scale.setScalar(0.98 + 0.03 * Math.sin(t * 1.1)); });
}
function altarFigures(g, w, d, base, set, h = 4.6) {
  const z = -d / 2 + 0.9;
  g.add(box(w * 0.7, 0.9, 1.1, mat('altar', 0x7a1a0e), 0, base + 0.45, z));
  g.add(box(w * 0.72, 0.08, 1.2, GOLD(), 0, base + 0.92, z));
  if (INTERIOR && INTERIOR.photos !== false) {   // ảnh tượng thật thay mô hình
    const keys = set === 'nam' ? [['thichca', 0, 2.1]] : set === 'thu' ? [['adida', -1, 1.6], ['thichca', 0, 2.0], ['dilac', 1, 1.6]] : [['duocsu', -1, 1.6], ['thichca', 0, 2.0], ['adida', 1, 1.6]];
    altarPanel(g, w, d, base, h, set);
    backdrop(g, keys, w, d, base, h, true);
    altarFx(g, -w * 0.35, w * 0.35, base + 0.9, z + 0.4);
    goldBoard(g, -w / 2 + 0.35, base + 1.9, z + 1.6, Math.PI / 2, 'Bảng Vàng');
    goldBoard(g, w / 2 - 0.35, base + 1.9, z + 1.6, -Math.PI / 2, 'Bia Công Đức');
  }
  const figs = (INTERIOR && INTERIOR.photos !== false) ? [] : set === 'nam' ? [['thich', 0, 1]] : set === 'thu' ? [['adida', -1, 0.75], ['thich', 0, 0.95], ['dilac', 1, 0.75]] : [['duoc', -1, 0.75], ['thich', 0, 0.95], ['adida', 1, 0.75]];
  figs.forEach(([k, xi, sc]) => {
    const f = k === 'dilac' ? maitreya(sc, GOLD()) : seatedBuddha(sc, GOLD());
    f.position.set(xi * w * 0.22, base + 0.96, z - 0.05); g.add(f);
    const halo = mesh(new THREE.TorusGeometry(sc * 0.42, sc * 0.03, 8, 32), GOLD(), xi * w * 0.22, base + 0.96 + sc * 2, z - 0.35); g.add(halo);
  });
  [-1, 1].forEach(sx => { const c = cyl(0.05, 0.05, 0.35, 8, mat('candle', 0xc0392b), sx * w * 0.32, base + 1.13, z + 0.35); g.add(c);
    const fl = mesh(new THREE.ConeGeometry(0.04, 0.12, 8), mat('flame', 0xffd36b, { emissive: 0xffa020, emissiveIntensity: 2 }), sx * w * 0.32, base + 1.36, z + 0.35, false); g.add(fl); });
  const lamp = new THREE.PointLight(0xffc070, 1.6, w * 1.6, 1.5); lamp.position.set(0, base + 2.4, z + 1.5); g.add(lamp);
  return z;
}
function hall({ w = 10, d = 6, h = 3.2, tiers = 2, wall = null, roofColor = null, base = 0.8 } = {}) {
  const g = new THREE.Group();
  if (INTERIOR && w >= 9) { w = Math.max(w * 1.45, 15); d = Math.max(d * 1.8, 13); h = Math.max(h, 4.6); }   // chánh điện rộng, cao để nhìn bao quát
  g.add(box(w + 1.6, base, d + 1.6, STONE(), 0, base / 2, 0));
  if (INTERIOR && w >= 9) {   // chánh điện vào được: tường sau + 2 bên, mặt trước mở
    const wm = wall || WALL();
    g.add(box(w, h, 0.3, wm, 0, base + h / 2, -d / 2 + 0.15));
    [-1, 1].forEach(sx => g.add(box(0.3, h, d, wm, sx * (w / 2 - 0.15), base + h / 2, 0)));
    const fl = box(w - 0.6, 0.06, d - 0.3, mat('floor', 0x6a3a1e), 0, base + 0.03, 0.1); fl.userData.floor = true; g.add(fl);
    // trần gỗ có xà ngang, đèn lồng treo, cửa sổ chấn song hai bên (nhìn từ trong điện)
    const nc = (o) => { o.traverse(x => { x.userData.noCollide = true; x.castShadow = false; }); g.add(o); return o; };
    const fill = new THREE.PointLight(0xffd6a0, 1.3, Math.max(w, d) * 1.4, 1.2); fill.position.set(0, base + h - 1.0, 0.15 * d); g.add(fill);
    const wood = mat('ceil', 0x3a1a0c), beamM = mat('ceilBeam', 0x241008);
    nc(box(w - 0.3, 0.08, d + 0.4, wood, 0, base + h + 0.02, 0.1));
    for (let z = -d / 2 + 1.6; z < d / 2; z += 2.4) nc(box(w - 0.4, 0.32, 0.28, beamM, 0, base + h - 0.18, z));
    [-1, 1].forEach(sx => nc(box(0.26, 0.3, d, beamM, sx * w * 0.28, base + h - 0.48, 0)));
    const lampM = mat('paperLamp', 0xffd9a0, { emissive: 0xffb050, emissiveIntensity: 1.1 });
    [[-0.28, -0.1], [0.28, -0.1], [-0.28, 0.3], [0.28, 0.3]].forEach(([fx, fz]) => {
      const x = fx * w, z = fz * d, y = base + h - 1.3;
      nc(cyl(0.01, 0.01, 1.1, 4, beamM, x, y + 0.75, z));
      nc(cyl(0.22, 0.22, 0.42, 14, lampM, x, y, z));
      nc(cyl(0.24, 0.24, 0.04, 14, GOLD(), x, y + 0.22, z)); nc(cyl(0.24, 0.24, 0.04, 14, GOLD(), x, y - 0.22, z));
    });
    [-1, 1].forEach(sx => { for (let z = -d / 2 + 2.4; z < d / 2 - 1.5; z += 3.2) {
      const win = new THREE.Group(); win.position.set(sx * (w / 2 - 0.32), base + h * 0.52, z);
      win.add(box(0.06, 1.5, 1.3, mat('winBg', 0x1c0d06), 0, 0, 0));
      for (let k = -2; k <= 2; k++) win.add(box(0.08, 1.5, 0.06, RED(), 0, 0, k * 0.26));
      win.add(box(0.1, 0.08, 1.4, RED(), 0, 0.75, 0)); win.add(box(0.1, 0.08, 1.4, RED(), 0, -0.75, 0));
      nc(win);
    } });
    const beam = box(w, 0.4, 0.3, DRED(), 0, base + h - 0.2, d / 2 - 0.15); beam.userData.camSkip = true; g.add(beam);   // xà ngang trước
    const az = altarFigures(g, w, d, base, INTERIOR.set, h);
    // lư hương đồng lớn giữa điện, ngay trước Tam Thế Phật
    const lu = new THREE.Group(); lu.position.set(0, base, az + 2.6); lu.userData.burner = true; g.add(lu);
    lu.add(cyl(0.75, 0.85, 0.35, 16, STONE(), 0, 0.17, 0));
    lu.add(cyl(0.55, 0.42, 0.75, 20, BRONZE(), 0, 0.72, 0));
    lu.add(cyl(0.68, 0.55, 0.12, 20, BRONZE(), 0, 1.12, 0));
    [-1, 1].forEach(sx => { const ear = mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 16), BRONZE(), sx * 0.66, 1.15, 0); ear.rotation.y = Math.PI / 2; lu.add(ear); });
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; lu.add(cyl(0.06, 0.09, 0.4, 8, BRONZE(), Math.cos(a) * 0.38, 0.4, Math.sin(a) * 0.38)); }
    lu.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20), mat('ash', 0x9a8f80), 0, 1.15, 0));
    for (let k = 0; k < 9; k++) { const st = cyl(0.012, 0.012, 0.45, 5, mat('stick', 0xb3261e), (Math.random() - 0.5) * 0.5, 1.38, (Math.random() - 0.5) * 0.4); st.rotation.z = (Math.random() - 0.5) * 0.25; lu.add(st); }
    const offerSlots = []; for (let k = 0; k < 9; k++) { const o = k === 0 ? 0 : Math.ceil(k / 2) * (k % 2 ? -1 : 1) * 0.42; offerSlots.push(new THREE.Vector3(o, base + 0.96, az + 0.42 + (k % 3 === 0 ? 0 : 0.06))); }   // lễ vật dồn vào chính giữa, trước Phật Thích Ca
    const cushions = [];
    const cols = Math.max(3, Math.floor((w - 2) / 1.5)), rows = Math.max(2, Math.floor((d - 2.6) / 1.3));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 1.5, z = az + 4.2 + r * 1.3;
      if (Math.abs(x) < 1.6 && z < az + 4.6) continue;   // chừa lối trước lư hương
      if (z > d / 2 - 0.6) continue;
      const cu = box(0.75, 0.1, 0.75, mat('cush', 0xa3231a), x, base + 0.11, z); cu.userData.cushion = true; g.add(cu);
      g.add(box(0.5, 0.02, 0.5, mat('cushg', 0xe0a93a), x, base + 0.17, z));
      cushions.push(new THREE.Vector3(x, base + 0.16, z));
    }
    g.userData.mainHall = { w, d, base, altar: new THREE.Vector3(0, base, az + 1.2), cushions, offerSlots, burner: new THREE.Vector3(0, base, az + 2.6), roofs: [], front: [] };
    HALLS.push(g);
    // đèn lồng đỏ dưới hiên
    [-1, 1].forEach(sx => { const l = mesh(new THREE.SphereGeometry(0.28, 12, 10), mat('lantern', 0xd9332a, { emissive: 0xff4020, emissiveIntensity: 0.6 }), sx * w * 0.3, base + h - 0.7, d / 2 + 0.6, false); l.scale.y = 1.2; g.add(l); g.userData.mainHall.front.push(l); });
    g.userData.mainHall.front.push(beam);
  } else g.add(box(w, h, d, wall || WALL(), 0, base + h / 2, 0));
  const n = Math.max(4, Math.round(w / 1.8));
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + (w / n) * i;
    const pil = cyl(0.18, 0.2, h, 10, RED(), x, base + h / 2, d / 2 + 0.55); g.add(pil);
    if (g.userData.mainHall) { pil.userData.camSkip = true; g.userData.mainHall.front.push(pil); }   // ẩn cột hiên khi ở trong điện
  }
  if (!(INTERIOR && w >= 9)) {
    g.add(box(w * 0.22, h * 0.7, 0.1, DRED(), 0, base + h * 0.35, d / 2 + 0.05));
    [-1, 1].forEach(s => g.add(box(w * 0.12, h * 0.55, 0.1, DRED(), s * w * 0.3, base + h * 0.4, d / 2 + 0.05)));
  }
  const r1 = roof(w + 2.2, d + 2.4, h * 0.75, roofColor); r1.position.y = base + h; g.add(r1);
  const roofs = [r1];
  if (tiers > 1) {
    const band = box(w * 0.6, h * 0.45, d * 0.6, wall || WALL(), 0, base + h + h * 0.75 * 0.5 + h * 0.2, 0); band.userData.noCollide = true; g.add(band);
    const r2 = roof(w * 0.75 + 1.4, d * 0.75 + 1.4, h * 0.65, roofColor); r2.position.y = base + h + h * 0.62; g.add(r2);
    roofs.push(band, r2);
  }
  if (g.userData.mainHall) {
    g.userData.mainHall.roofs = roofs;   // ẩn mái khi người chơi ở trong điện
    g.userData.mainHall.h = h;
    // chỗ treo bảng tên chùa: mặt trước gác mái (2 tầng) hoặc dưới hiên (1 tầng)
    g.userData.mainHall.plaqueAt = { x: 0, y: base + h - 0.05, z: d / 2 + 1.3, w: Math.min(w * 0.42, 6.5), h: Math.min(1.1, Math.max(0.8, w * 0.07)) };   // treo ở mép mái hiên trước, giữa hai cột
  }
  // bậc thềm
  g.userData.hallSteps = { z: d / 2 + 2.95, base, w: w * 0.3 };
  for (let i = 0; i < 4; i++) g.add(box(w * 0.3, (i + 1) * base / 4, 0.4, STONE(), 0, (i + 1) * base / 8, d / 2 + 0.8 + 1.6 - i * 0.4));
  return g;
}
/* tháp nhiều tầng: sides 4 = vuông, 6 = lục giác, 8 = bát giác */
function tower({ tiers = 7, sides = 8, r = 2.2, th = 2, taper = 0.45, wall = null, roofColor = null } = {}) {
  const g = new THREE.Group(); let y = 0;
  g.add(cyl(r * 1.3, r * 1.4, 0.6, sides, STONE(), 0, 0.3, 0)); y = 0.6;
  for (let i = 0; i < tiers; i++) {
    const k = 1 - taper * i / tiers, rr = r * k, hh = th * (1 - 0.25 * i / tiers);
    const body = cyl(rr * 0.82, rr * 0.86, hh, sides, wall || WALL(), 0, y + hh / 2, 0); body.rotation.y = Math.PI / sides; g.add(body);
    // ô cửa
    for (let s = 0; s < sides; s += sides > 4 ? 2 : 1) {
      const a = (s / sides) * Math.PI * 2 + Math.PI / sides;
      const wnd = box(rr * 0.35, hh * 0.45, 0.08, DARK(), Math.sin(a) * rr * 0.8, y + hh * 0.5, Math.cos(a) * rr * 0.8); wnd.rotation.y = a; g.add(wnd);
    }
    const eave = cyl(rr * 0.75, rr * 1.18, hh * 0.28, sides, roofColor ? mat('troof' + roofColor, roofColor) : ROOF(), 0, y + hh + hh * 0.14, 0); eave.rotation.y = Math.PI / sides; g.add(eave);
    y += hh * 1.28;
  }
  g.add(cyl(0.05, r * 0.35, 1.4, 8, GOLD(), 0, y + 0.7, 0));
  g.add(mesh(new THREE.SphereGeometry(r * 0.12, 12, 8), GOLD(), 0, y + 1.5, 0));
  g.userData.height = y + 1.6;
  return g;
}
function stairs(w, n, rise, run, m = STONE()) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) g.add(box(w, rise, run, m, 0, rise / 2 + i * rise, -i * run));
  g.userData.stairs = { n, rise, run, w };   // để kiểm tra bậc nối liền nền trên
  return g;
}
function lotusBase(r, m = WHITE()) {
  const g = new THREE.Group();
  g.add(cyl(r * 0.85, r, r * 0.35, 24, m, 0, r * 0.17, 0));
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    const p = mesh(new THREE.SphereGeometry(r * 0.28, 10, 8), m); p.scale.set(0.6, 1.1, 0.35);
    p.position.set(Math.cos(a) * r * 0.82, r * 0.42, Math.sin(a) * r * 0.82); p.rotation.y = -a; p.rotation.x = 0.35; g.add(p);
  }
  g.add(cyl(r * 0.8, r * 0.8, r * 0.12, 24, m, 0, r * 0.62, 0));
  return g;
}
/* tượng Phật ngồi kiết già */
function seatedBuddha(s, m = WHITE()) {
  const g = new THREE.Group();
  const base = lotusBase(s * 0.75, m); g.add(base);
  const y0 = s * 0.55;
  const legs = mesh(new THREE.SphereGeometry(s * 0.72, 28, 16), m, 0, y0 + s * 0.14, s * 0.05); legs.scale.set(1, 0.3, 0.6); g.add(legs);
  [-1, 1].forEach(x => { const k = mesh(new THREE.SphereGeometry(s * 0.2, 14, 10), m, x * s * 0.48, y0 + s * 0.18, s * 0.2); k.scale.set(1.2, 0.7, 1); g.add(k); });
  const prof = [[0.44, 0], [0.46, 0.15], [0.44, 0.35], [0.4, 0.55], [0.38, 0.72], [0.4, 0.82], [0.3, 0.92], [0.12, 0.98], [0, 1]];
  g.add(mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * s, y * s)), 28), m, 0, y0 + s * 0.2, -s * 0.05));
  [-1, 1].forEach(x => { const a = mesh(new THREE.CapsuleGeometry(s * 0.1, s * 0.45, 6, 10), m, x * s * 0.42, y0 + s * 0.65, s * 0.05); a.rotation.z = x * 0.25; a.rotation.x = 0.35; g.add(a); });
  const hands = mesh(new THREE.SphereGeometry(s * 0.17, 12, 8), m, 0, y0 + s * 0.36, s * 0.3); hands.scale.set(1.4, 0.45, 0.8); g.add(hands);
  g.add(cyl(s * 0.11, s * 0.13, s * 0.14, 14, m, 0, y0 + s * 1.24, -s * 0.05));
  const head = mesh(new THREE.SphereGeometry(s * 0.27, 24, 18), m, 0, y0 + s * 1.5, -s * 0.03); head.scale.set(0.9, 1.08, 0.95); g.add(head);
  g.add(mesh(new THREE.SphereGeometry(s * 0.13, 14, 10), m, 0, y0 + s * 1.8, -s * 0.05));
  [-1, 1].forEach(x => { const e = mesh(new THREE.SphereGeometry(s * 0.06, 8, 6), m, x * s * 0.25, y0 + s * 1.42, -s * 0.03); e.scale.set(0.5, 1.8, 0.6); g.add(e); });
  return g;
}
/* tượng Quán Âm đứng */
function standingGuanyin(h, m = WHITE()) {
  const g = new THREE.Group();
  const base = lotusBase(h * 0.13, m); g.add(base);
  const y0 = h * 0.09;
  const prof = [[0.14, 0], [0.12, 0.08], [0.1, 0.3], [0.095, 0.5], [0.105, 0.62], [0.11, 0.7], [0.085, 0.76], [0.04, 0.8], [0, 0.81]];
  g.add(mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * h, y * h)), 28), m, 0, y0, 0));
  const head = mesh(new THREE.SphereGeometry(h * 0.05, 18, 14), m, 0, y0 + h * 0.85, 0); head.scale.set(0.9, 1.15, 0.95); g.add(head);
  g.add(mesh(new THREE.ConeGeometry(h * 0.05, h * 0.09, 14), m, 0, y0 + h * 0.93, -h * 0.005));
  const halo = mesh(new THREE.TorusGeometry(h * 0.075, h * 0.006, 8, 40), GOLD(), 0, y0 + h * 0.86, -h * 0.05); g.add(halo);
  const vase = cyl(h * 0.008, h * 0.018, h * 0.06, 10, m, h * 0.06, y0 + h * 0.6, h * 0.07); g.add(vase);
  return g;
}
/* Phật Di Lặc: bụng tròn, cười hoan hỷ, đầu tròn, tai dài, túi vải bên cạnh */
function maitreya(s, m = GOLD()) {
  const g = new THREE.Group();
  const base = lotusBase(s * 0.85, m); g.add(base);
  const y0 = s * 0.6;
  const legs = mesh(new THREE.SphereGeometry(s * 0.75, 28, 16), m, 0, y0 + s * 0.14, s * 0.05); legs.scale.set(1.05, 0.32, 0.62); g.add(legs);
  const knee = mesh(new THREE.SphereGeometry(s * 0.22, 14, 10), m, s * 0.42, y0 + s * 0.42, s * 0.25); knee.scale.set(1, 1.3, 1); g.add(knee);   // gối phải dựng
  const body = mesh(new THREE.SphereGeometry(s * 0.5, 28, 20), m, 0, y0 + s * 0.65, -s * 0.05); body.scale.set(1.05, 1.05, 0.9); g.add(body);
  const belly = mesh(new THREE.SphereGeometry(s * 0.4, 28, 20), m, 0, y0 + s * 0.55, s * 0.18); g.add(belly);   // bụng to
  g.add(mesh(new THREE.SphereGeometry(s * 0.04, 10, 8), mat('navel', 0x7a5214), 0, y0 + s * 0.58, s * 0.57));
  const robe = mesh(new THREE.TorusGeometry(s * 0.47, s * 0.07, 10, 30, Math.PI * 1.2), m, 0, y0 + s * 0.68, -s * 0.02); robe.rotation.set(Math.PI / 2, 0, Math.PI * 0.9); g.add(robe);
  [-1, 1].forEach(x => { const a = mesh(new THREE.CapsuleGeometry(s * 0.12, s * 0.38, 6, 10), m, x * s * 0.52, y0 + s * 0.7, s * 0.1); a.rotation.z = x * 0.6; g.add(a); });
  g.add(mesh(new THREE.SphereGeometry(s * 0.1, 10, 8), m, s * 0.72, y0 + s * 0.5, s * 0.25));   // tay cầm chuỗi
  const head = mesh(new THREE.SphereGeometry(s * 0.3, 26, 20), m, 0, y0 + s * 1.3, 0); g.add(head);
  [-1, 1].forEach(x => { const e = mesh(new THREE.SphereGeometry(s * 0.07, 8, 6), m, x * s * 0.3, y0 + s * 1.22, 0); e.scale.set(0.5, 1.9, 0.7); g.add(e); });
  const smile = mesh(new THREE.TorusGeometry(s * 0.12, s * 0.025, 8, 20, Math.PI), mat('smile', 0x6a3a10), 0, y0 + s * 1.2, s * 0.27); smile.rotation.z = Math.PI; g.add(smile);
  [-1, 1].forEach(x => { const ey = mesh(new THREE.TorusGeometry(s * 0.045, s * 0.015, 6, 12, Math.PI), mat('smile', 0x6a3a10), x * s * 0.11, y0 + s * 1.35, s * 0.26); g.add(ey); });
  const sack = mesh(new THREE.SphereGeometry(s * 0.32, 18, 14), mat('sack', 0xcdb38a), -s * 0.72, y0 + s * 0.05, s * 0.05); sack.scale.set(1, 0.85, 1); g.add(sack);
  return g;
}
function tree(h, m = LEAF(), x = 0, z = 0, kind = 'round') {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(cyl(h * 0.05, h * 0.08, h * 0.5, 8, WOOD(), 0, h * 0.25, 0));
  if (kind === 'pine') { for (let i = 0; i < 3; i++) g.add(mesh(new THREE.ConeGeometry(h * (0.32 - i * 0.07), h * 0.38, 8), LEAF2(), 0, h * (0.5 + i * 0.2), 0)); }
  else { for (let i = 0; i < 4; i++) { const s = mesh(new THREE.IcosahedronGeometry(h * (0.28 - i * 0.03), 0), m, (Math.random() - 0.5) * h * 0.35, h * (0.62 + i * 0.1), (Math.random() - 0.5) * h * 0.35); g.add(s); } }
  return g;
}
function mountain(r, h, color = 0x4f7a3f, seed = 1, x = 0, z = 0, top = 0) {
  const geo = top ? new THREE.CylinderGeometry(top, r, h, 28, 8) : new THREE.ConeGeometry(r, h, 28, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); if (y > h / 2 - 0.01) continue;
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const n = 1 + 0.18 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 7 + seed * 2) + 0.06 * Math.sin(y * 0.5 + seed);
    p.setX(i, p.getX(i) * n); p.setZ(i, p.getZ(i) * n);
  }
  geo.computeVertexNormals();
  const m = mesh(geo, mat('mt' + color, color, { flatShading: true }), x, h / 2, z);
  if (top) m.userData.mesa = { r, h, top };   // đỉnh bằng phẳng để dựng chùa
  return m;
}
function water(w, d, x = 0, z = 0) { const o = mesh(new THREE.PlaneGeometry(w, d, 1, 1), WATER(), x, 0.05, z, false); o.rotation.x = -Math.PI / 2; return o; }
function lotusPads(g, n, w, d, cx = 0, cz = 0) {
  for (let i = 0; i < n; i++) {
    const pad = mesh(new THREE.CircleGeometry(0.35 + Math.random() * 0.25, 14), mat('pad', 0x3f8a3a), cx + (Math.random() - 0.5) * w, 0.08, cz + (Math.random() - 0.5) * d, false);
    pad.rotation.x = -Math.PI / 2; g.add(pad);
    if (Math.random() < 0.4) g.add(mesh(new THREE.ConeGeometry(0.12, 0.3, 6), mat('lotusf', 0xff9fb8), pad.position.x, 0.25, pad.position.z));
  }
}
function boat(x, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0.1, z); g.rotation.y = rot;
  g.add(box(4, 0.35, 1, WOOD(), 0, 0.15, 0));
  [-1, 1].forEach(s => { const t = box(0.8, 0.3, 0.9, WOOD(), s * 2.2, 0.3, 0); t.rotation.z = s * 0.4; g.add(t); });
  const cover = mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 10, 1, true, 0, Math.PI), mat('mat', 0x8a7a50)); cover.rotation.z = Math.PI / 2; cover.position.y = 0.3; g.add(cover);
  return g;
}
function clouds(g, n, r, y) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group(); const a = i / n * Math.PI * 2;
    for (let k = 0; k < 4; k++) c.add(mesh(new THREE.SphereGeometry(1.2 + Math.random(), 10, 8), mat('cloud', 0xffffff, { transparent: true, opacity: 0.75 }), k * 1.4 - 2, Math.random() * 0.5, Math.random(), false));
    c.position.set(Math.cos(a) * r, y + Math.random() * 2, Math.sin(a) * r); c.userData.a = a; g.add(c); list.push(c);
  }
  return (t) => list.forEach(c => { const a = c.userData.a + t * 0.03; c.position.x = Math.cos(a) * r; c.position.z = Math.sin(a) * r; });
}
function bats(g, n, center, r) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const b = mesh(new THREE.ConeGeometry(0.18, 0.5, 3), mat('bat', 0x1a1410), 0, 0, 0, false); b.rotation.z = Math.PI / 2;
    b.userData = { a: Math.random() * 6.28, r: r * (0.5 + Math.random() * 0.6), y: center.y + Math.random() * 6, s: 0.3 + Math.random() * 0.5 };
    g.add(b); list.push(b);
  }
  return (t) => list.forEach(b => { const u = b.userData, a = u.a + t * u.s; b.position.set(center.x + Math.cos(a) * u.r, u.y + Math.sin(t * 3 + u.a) * 0.4, center.z + Math.sin(a) * u.r); b.rotation.y = -a; b.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(t * 12 + u.a)); });
}
let NO_GROUND = false;
function ground(g, size = 120, color = null) { if (NO_GROUND) return; const o = mesh(new THREE.PlaneGeometry(size, size), color ? mat('gr' + color, color) : GRASS(), 0, 0, 0, false); o.rotation.x = -Math.PI / 2; g.add(o); }
function courtyard(g, w, d, z = 4) { const o = mesh(new THREE.PlaneGeometry(w, d), mat('court', 0xc9b48a), 0, 0.02, z, false); o.rotation.x = -Math.PI / 2; o.userData.court = true; g.add(o); }
function burner(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.burner = true; g.add(cyl(0.6, 0.45, 0.7, 12, BRONZE(), 0, 0.75, 0)); g.add(cyl(0.12, 0.12, 0.4, 8, BRONZE(), 0, 0.2, 0)); g.add(cyl(0.7, 0.6, 0.1, 12, BRONZE(), 0, 1.1, 0)); return g; }

/* ---------------- cảnh của từng chùa ---------------- */
const SCENES = {
  hall(g) {
    ground(g); courtyard(g, 18, 10, 5);
    g.add(hall({ w: 10, d: 6 })); g.add(burner(0, 12));
    [-8, 8].forEach(x => g.add(tree(6, LEAF(), x, 3)));
    return { cam: [14, 9, 18], target: [0, 3, 0] };
  },
  motcot(g) {
    ground(g, 120, 0x6a8a4a);
    [[0, 7.3, 15, 0.8], [0, -7.3, 15, 0.8], [7.3, 0, 0.8, 15], [-7.3, 0, 0.8, 15]].forEach(([x, z, w, d]) => g.add(box(w, 0.7, d, STONE(), x, 0.35, z)));
    const pond = water(14, 14); pond.position.y = 0.3; g.add(pond); lotusPads(g, 26, 12, 12); g.children.forEach(o => { if (o.geometry && o.geometry.type === 'CircleGeometry') o.position.y = 0.34; });
    g.add(cyl(0.55, 0.65, 4.2, 16, STONE(), 0, 2.1, 0));             // cột đá
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => { const b = box(0.15, 2, 0.15, WOOD(), sx * 0.9, 3.6, sz * 0.9); b.rotation.z = -sx * 0.5; b.rotation.x = sz * 0.5; g.add(b); });
    g.add(box(3.4, 0.25, 3.4, WOOD(), 0, 4.3, 0));                    // sàn đài sen
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => g.add(cyl(0.1, 0.1, 2, 8, RED(), sx * 1.4, 5.4, sz * 1.4)));
    // khám thờ Quan Âm mở về phía bậc lên (thay khối tường kín), lư hương đặt trước khám để thắp hương
    const mcw = mat('mcwall', 0xb3401f);
    g.add(box(2.4, 1.75, 0.16, mcw, 0, 5.3, -1.12));                                  // vách sau
    [-1, 1].forEach(sx => g.add(box(0.16, 1.75, 1.0, mcw, sx * 1.12, 5.3, -0.7)));   // hai vách bên (nửa sau)
    const mback = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.6), new THREE.MeshBasicMaterial({ map: muralTex('guanyin', 420, 320), toneMapped: false })); mback.position.set(0, 5.28, -1.03); mback.userData.noCollide = true; g.add(mback);
    g.add(box(1.3, 0.55, 0.5, mat('altar', 0x7a1a0e), 0, 4.7, -0.78)); g.add(box(1.36, 0.05, 0.56, GOLD(), 0, 4.99, -0.78));
    const qa = standingGuanyin(1.15, GOLD()); qa.position.set(0, 5.01, -0.82); qa.traverse(o => { o.userData.noCollide = true; }); g.add(qa);
    [-0.5, 0.5].forEach(x => { g.add(cyl(0.03, 0.03, 0.22, 8, mat('candle', 0xc0392b), x, 5.12, -0.62)); g.add(mesh(new THREE.ConeGeometry(0.025, 0.08, 8), mat('flame', 0xffd36b, { emissive: 0xffa020, emissiveIntensity: 2 }), x, 5.27, -0.62, false)); });
    const mcl = new THREE.PointLight(0xffc070, 1.2, 6, 1.6); mcl.position.set(0, 5.8, 0.2); g.add(mcl);
    const lu = burner(0, 0.75); lu.scale.setScalar(0.55); lu.position.y = 4.425; g.add(lu);
    const r = roof(4.6, 4.6, 1.5); r.position.y = 6.4; g.add(r);
    const st = stairs(1.6, 12, 0.3, 0.5); st.position.set(0, 0.5, 1.95 + 11 * 0.5); g.add(st);   // bậc cuối chạm mép sàn đài sen
    [-10, 10, -9, 9].forEach((x, i) => g.add(tree(5, mat('frangi', 0x4d7a3a, { flatShading: true }), x, i < 2 ? -6 : 7)));
    return { cam: [13, 9, 16], target: [0, 4, 0] };
  },
  baidinh(g) {
    ground(g, 160, 0x5f7a45);
    g.add(mountain(16, 28, 0x3f6a35, 1, -4, -44)); g.add(mountain(18, 20, 0x4a7a3a, 3, 26, -48)); g.add(mountain(16, 16, 0x56803f, 5, -34, -40));   // núi lùi ra sau, không đâm vào chánh điện
    // nền cao đủ sâu cho chánh điện (bản vào được rộng hơn) + bậc thềm của điện
    const h = hall({ w: 16, d: 8, h: 4.2, tiers: 2 });
    const hd = h.userData.mainHall ? h.userData.mainHall.d : 8, hz = 5 - (hd / 2 + 2.6) - 1.4;   // chừa khoảng sân trước điện, bậc của điện không chạm mép nền
    const back = hz - hd / 2 - 1.4, base = box(26, 3, 5 - back, STONE(), 0, 1.5, (5 + back) / 2); g.add(base);
    h.position.set(0, 3, hz); g.add(h);
    const st = stairs(6, 10, 0.3, 0.6); st.position.set(0, 0, 10.7); g.add(st);   // bậc trên cùng (3,0 m) chạm đúng mép nền
    const bell = hall({ w: 4, d: 4, h: 2.6, tiers: 2 }); bell.position.set(-14, 0, 6); g.add(bell);
    const tw = tower({ tiers: 13, sides: 4, r: 2.4, th: 1.5, taper: 0.5 }); tw.position.set(16, 0, -6); g.add(tw);
    courtyard(g, 30, 10, 12); g.add(burner(0, 14));
    [-20, -10, 10, 22].forEach((x, i) => g.add(tree(5.5, LEAF(), x, 14 + (i % 2) * 3)));
    return { cam: [26, 16, 34], target: [0, 6, -2] };
  },
  tamchuc(g) {
    ground(g, 240, 0x5a8248);
    // hồ Tam Chúc phía trước, có đảo đá & thuyền
    g.add(water(150, 34, 0, 52));
    [[-28, 48, 3.2], [22, 56, 2.6], [-8, 60, 2.2]].forEach(([x, z, r]) => g.add(mountain(r, r * 1.4, 0x4a6a40, (x | 0) + 3, x, z)));
    g.add(boat(-10, 44, 0.15)); g.add(boat(8, 47, -0.2)); lotusPads(g, 16, 70, 10, 0, 46);
    // núi Thất Tinh phía sau + Chùa Ngọc (granit đỏ) trên sườn
    g.add(mountain(22, 30, 0x3f6a35, 2, 0, -46)); g.add(mountain(16, 20, 0x4a7a3a, 6, -30, -44)); g.add(mountain(16, 18, 0x56803f, 8, 30, -46));
    const ngoc = tower({ tiers: 5, sides: 4, r: 1.7, th: 1.6, taper: 0.5, wall: mat('ngocwall', 0x9c3a2a), roofColor: 0x7a241a }); ngoc.position.set(0, 12.5, -34); ngoc.scale.setScalar(0.9); g.add(ngoc);
    g.add(cyl(5, 6.5, 1.2, 20, STONE(), 0, 12, -34));
    // tượng Di Lặc đồng lớn trên đồi bên phải
    g.add(mountain(10, 9, 0x5f8a45, 4, 30, 10)); const dl = maitreya(3.4, BRONZE()); dl.position.set(30, 9, 10); g.add(dl);
    // chánh điện Tam Thế trên nền cao (mô hình như Bái Đính cho chắc chắn)
    const h = hall({ w: 16, d: 8, h: 4.4, tiers: 3 });
    const hd = h.userData.mainHall ? h.userData.mainHall.d : 8, hz = 5 - (hd / 2 + 2.6) - 1.4;
    const back = hz - hd / 2 - 1.4; g.add(box(28, 3.4, 5 - back, STONE(), 0, 1.7, (5 + back) / 2));
    h.position.set(0, 3.4, hz); g.add(h);
    const st = stairs(6.5, 11, 0.31, 0.6); st.position.set(0, 0, 11.3); g.add(st);
    // điện Pháp Chủ & Quan Âm (nhỏ hơn) đặt hai bên, chừa lối giữa lên chánh điện
    [[-13, 'Pháp Chủ'], [13, 'Quan Âm']].forEach(([x], i) => { const e = hall({ w: 6.5, d: 4.2, h: i ? 2.6 : 3, tiers: i ? 1 : 2 }); e.position.set(x, 0, 14 + i * 2); g.add(e); });
    // vườn Cột Kinh: hai hàng cột đá cao hai bên lối giữa
    for (let i = 0; i < 8; i++) { const z = 24 - i * 2.2; [-6.5, 6.5].forEach(x => { g.add(cyl(0.34, 0.4, 4.2 + (i % 2) * 0.6, 10, STONE(), x, 2.1, z)); g.add(cyl(0.5, 0.42, 0.3, 10, mat('ckcap', 0x8a6a3a), x, 4.3, z)); }); }
    courtyard(g, 24, 14, 22); g.add(burner(0, 28));
    [-22, 22, -20, 22].forEach((x, i) => g.add(tree(6, LEAF(), x, 30 + (i % 2) * 5)));
    return { cam: [30, 20, 40], target: [0, 7, -4] };
  },
  huong(g) {
    ground(g, 160, 0x4f7a3f);
    const m1 = mountain(18, 30, 0x6a7a5a, 2, 0, -14); g.add(m1); g.add(mountain(14, 22, 0x5a6a4a, 4, -26, -18)); g.add(mountain(13, 20, 0x5f7050, 6, 26, -20));
    const cave = mesh(new THREE.CircleGeometry(3.4, 24, 0, Math.PI), DARK(), 0, 8.4, 0.2, false); cave.scale.set(1, 1.3, 1); cave.rotation.x = -0.35; g.add(cave);
    g.add(box(8, 0.6, 3, STONE(), 0, 8.1, 1.2));
    const st = stairs(2.4, 26, 0.31, 0.3); st.position.set(0, 0, 10.5); g.add(st);
    // tam quan
    const gate = new THREE.Group(); gate.position.set(0, 0, 12.5);
    [-2.6, 0, 2.6].forEach((x, i) => { if (i === 1) { [-1, 1].forEach(sx => gate.add(box(0.4, 3.2, 0.8, WALL(), sx * 1.0, 1.6, 0))); gate.add(box(2.4, 0.6, 0.8, WALL(), 0, 2.9, 0)); } else gate.add(box(1.8, 2.6, 0.8, WALL(), x, 1.3, 0)); const r = roof(i === 1 ? 3.2 : 2.4, 1.6, 0.9); r.position.set(x, i === 1 ? 3.2 : 2.6, 0); gate.add(r); });
    g.add(gate);
    g.add(water(80, 9, 0, 19)); g.add(boat(-6, 18, 0.3)); g.add(boat(6, 20, -0.2)); lotusPads(g, 20, 60, 6, 0, 19);
    [-9, 9, -14, 14].forEach((x, i) => g.add(tree(4.5, LEAF(), x, 9 + (i % 2) * 2)));
    return { cam: [10, 13, 40], target: [0, 7, 2] };
  },
  yentu(g) {
    ground(g, 200, 0x3f6a35);
    g.add(mountain(30, 33, 0x35602f, 1, 0, 0, 6.5)); g.add(mountain(22, 24, 0x3f6a35, 7, -26, -14)); g.add(mountain(20, 22, 0x45703a, 9, 24, -18));   // đỉnh núi bằng để đặt chùa Đồng
    const t = hall({ w: 5, d: 4, h: 2.4, tiers: 2, wall: BRONZE(), roofColor: 0x8a5a24, base: 0.5 }); t.position.set(0, 33, -0.6); g.add(t);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, rr = 14 + (i % 3) * 5, y = 34 - rr * 1.05; const tr = tree(3.5, LEAF2(), Math.cos(a) * rr, Math.sin(a) * rr, 'pine'); tr.position.y = Math.max(0, y * 0.95); g.add(tr); }
    const upd = clouds(g, 10, 22, 20);
    return { cam: [30, 38, 34], target: [0, 30, 0], update: upd };
  },
  thienmu(g) {
    ground(g, 160, 0x5a8a45); g.add(water(160, 22, 0, 24.5));
    const tw = tower({ tiers: 7, sides: 8, r: 2.6, th: 2.2, taper: 0.42, wall: mat('tmwall', 0xd9b89a), roofColor: 0x5a4a3a }); tw.position.set(0, 1.6, 2); g.add(tw);
    // chánh điện sau tháp: lùi đủ xa để cửa điện không bị tháp chắn; đồi kéo dài đỡ trọn điện
    const h = hall({ w: 9, d: 5, h: 3, tiers: 2 }); const hd = h.userData.mainHall ? h.userData.mainHall.d : 5, hz = -1.9 - (hd / 2 + 2.9);
    h.position.set(0, 1.6, hz); g.add(h);
    const back = Math.min(-13, hz - hd / 2 - 2);
    g.add(box(30, 1.6, 8 - back, mat('hill', 0x6a8a4a), 0, 0.8, (8 + back) / 2));   // mép đồi ra gần sông, chừa sân trước tháp
    [-6.5, 6.5].forEach(x => { const p = hall({ w: 2.6, d: 2.6, h: 2, tiers: 1 }); p.position.set(x, 1.6, 0.2); g.add(p); });
    const st = stairs(5, 6, 0.27, 0.5); st.position.set(0, 0, 8.25 + 5 * 0.5); g.add(st);   // bậc cuối áp sát mép đồi
    [-12, 12, -10, 11].forEach((x, i) => g.add(tree(5, LEAF(), x, i < 2 ? -6 : 6)));
    g.add(boat(-10, 22, 0.1));
    return { cam: [22, 14, 30], target: [0, 8, 0] };
  },
  linhung(g) {
    ground(g, 200, 0x55804a); g.add(water(260, 120, 0, 85));
    g.add(box(40, 1, 30, mat('cliff', 0x8a8a7a), 0, 0.5, 0));
    const s = standingGuanyin(24); s.position.set(0, 1, 8); s.rotation.y = 0; g.add(s);
    const h = hall({ w: 12, d: 7, h: 3.6, tiers: 2, wall: YWALL(), roofColor: 0x2f5a7a }); h.position.set(-12, 1, -6); g.add(h);
    [10, 16, -20, 20].forEach((x, i) => g.add(tree(5, LEAF(), x, -4 - (i % 2) * 4)));
    g.add(mountain(26, 24, 0x3f6a35, 2, 16, -50));
    return { cam: [-22, 16, 38], target: [0, 11, 4] };
  },
  longson(g) {
    ground(g, 160, 0x5f8a45);
    const hill = mountain(20, 14, 0x5f8a45, 4, 0, -6); hill.scale.y = 1; g.add(hill);
    g.add(cyl(6, 7.5, 1.2, 24, STONE(), 0, 12.8, -6));
    const b = seatedBuddha(7.5); b.position.set(0, 13.4, -6); g.add(b);
    const st = stairs(2.4, 30, 0.42, 0.42); st.position.set(0, 0, 1.6 + 0.21 + 29 * 0.42); g.add(st);   // bậc trên cùng chạm mép bệ tượng
    const h = hall({ w: 10, d: 6, h: 3, tiers: 2 }); h.position.set(-27, 0, 15); g.add(h);   // đặt xa sườn đồi để đồi không xuyên vào điện
    [10, 14, -40].forEach(x => g.add(tree(5, LEAF(), x, 9)));
    return { cam: [20, 20, 30], target: [0, 17, -5] };
  },
  vinhnghiem(g) {
    ground(g, 140, 0x8a8a7a); courtyard(g, 34, 14, 9);
    const h = hall({ w: 16, d: 9, h: 4, tiers: 2, roofColor: 0x5a2a1a }); h.position.set(-3, 0, -3); g.add(h);
    const tw = tower({ tiers: 7, sides: 4, r: 2.2, th: 2, taper: 0.4, wall: mat('vnwall', 0xe8e0d0), roofColor: 0x3a3a3a }); tw.position.set(13, 0, -2); g.add(tw);
    g.add(burner(-3, 12));
    [-16, -12, 18].forEach(x => g.add(tree(5, LEAF(), x, 10)));
    return { cam: [24, 13, 30], target: [2, 6, 0] };
  },
  giaclam(g) {
    ground(g, 140, 0x5f8a45); courtyard(g, 30, 12, 8);
    const h = hall({ w: 13, d: 8, h: 3.2, tiers: 1, roofColor: 0x5a3a2a }); h.position.set(-3, 0, -2); g.add(h);
    const tw = tower({ tiers: 7, sides: 6, r: 2, th: 2, taper: 0.45, wall: mat('glwall', 0xeadbbf), roofColor: 0x4a3a2a }); tw.position.set(12, 0, 2); g.add(tw);
    const bodhi = tree(10, mat('bodhi', 0x3a7a32, { flatShading: true }), -14, 8); g.add(bodhi);
    g.add(burner(-3, 12));
    return { cam: [20, 12, 28], target: [0, 5, 0] };
  },
  khmer(g) {
    ground(g, 140, 0x5f8a45); courtyard(g, 24, 12, 8);
    const hg = new THREE.Group(); g.add(hg);
    hg.add(box(16, 2, 10, mat('kbase', 0xe8d8a8), 0, 1, -2));
    if (INTERIOR) {
      const km = mat('kwall', 0xf0d080);
      hg.add(box(13, 3.6, 0.3, km, 0, 3.8, -5.6)); [-1, 1].forEach(sx => hg.add(box(0.3, 3.6, 7.5, km, sx * 6.35, 3.8, -2)));
      const sub = new THREE.Group(); sub.position.set(0, 0, -2); hg.add(sub);
      const az = altarFigures(sub, 13, 7.5, 2, 'nam', 3.6);
      const cushions = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { const x = (c - 2.5) * 1.6, z = az + 2.3 + r * 1.3; const cu = box(0.75, 0.1, 0.75, mat('cush', 0xa3231a), x, 2.11, z); cu.userData.cushion = true; sub.add(cu); cushions.push(new THREE.Vector3(x, 2.16, z)); }
      sub.userData.mainHall = { w: 13, d: 7.5, base: 2, altar: new THREE.Vector3(0, 2, az + 1.2), cushions }; HALLS.push(sub);
      for (let i = 0; i < 7; i++) hg.add(box(4, 0.3 * (i + 1), 0.45, mat('kbase', 0xe8d8a8), 0, 0.15 * (i + 1), 5.2 - i * 0.45 + 0.2));
    } else hg.add(box(13, 3.6, 7.5, mat('kwall', 0xf0d080), 0, 3.8, -2));
    for (let i = 0; i < 7; i++) hg.add(cyl(0.2, 0.22, 3.6, 10, mat('kcol', 0xf6e7b0), -6 + i * 2, 3.8, 2));
    const gable = (w, h, d, y, z, color) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(0, h); sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2); const m = mesh(geo, mat('kr' + color, color), 0, y, z); m.rotation.y = Math.PI / 2; hg.add(m);
      [-1, 1].forEach(s => { const n = mesh(new THREE.ConeGeometry(0.25, 1.6, 6), GOLD(), 0, y + 0.3, z + s * d / 2); n.rotation.x = s * 0.9; hg.add(n); }); return m; };
    gable(9, 4.2, 15, 5.6, -2, 0xc8501a); gable(7, 3.6, 11, 7.6, -2, 0xd8661f); gable(5, 3, 7, 9.4, -2, 0xc8501a);
    hg.add(cyl(0.05, 0.3, 2.4, 8, GOLD(), 0, 13.2, -2));
    const stupa = new THREE.Group(); stupa.position.set(11, 0, 6); stupa.add(cyl(1.5, 1.8, 1.6, 12, WHITE(), 0, 0.8, 0)); stupa.add(mesh(new THREE.SphereGeometry(1.4, 16, 12), WHITE(), 0, 2.4, 0)); stupa.add(cyl(0.05, 0.6, 3, 10, GOLD(), 0, 4.4, 0)); g.add(stupa);
    [[-14, -8], [-12, 6], [14, -6], [16, 2], [-16, 0]].forEach(([x, z]) => g.add(tree(11, LEAF(), x, z)));
    const upd = bats(g, 40, new THREE.Vector3(0, 12, -2), 16);
    return { cam: [22, 12, 26], target: [0, 6, -2], update: upd };
  }
};

/* ---------------- mount ---------------- */
export function mount(el, templeId, opts = {}) {
  const t = (window.CBA && CBA.temples || []).find(x => x.id === templeId);
  const model = (t && t.model) || 'hall';
  const W = () => el.clientWidth || 400, H = () => el.clientHeight || 300;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: !!opts.preserve });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.innerHTML = ''; el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const sky = model === 'yentu' ? 0xcfe0ea : model === 'khmer' ? 0xbfe0f0 : 0xf3d9a8;
  scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(sky, 60, 180);
  scene.add(new THREE.HemisphereLight(0xfff4dd, 0x5a4a3a, 0.9));
  const sun = new THREE.DirectionalLight(0xffe2b0, 1.6); sun.position.set(30, 50, 25); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
  scene.add(sun);
  const g = new THREE.Group(); scene.add(g);
  const a0 = ANIM.length, b0 = BOARDS.length;
  const conf = (SCENES[model] || SCENES.hall)(g);
  const myAnim = ANIM.splice(a0); BOARDS.splice(b0);   // hoạt cảnh riêng của khung xem, không lẫn vào game
  const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 500);
  camera.position.set(...conf.cam);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...conf.target); controls.enableDamping = true; controls.autoRotate = opts.autoRotate !== false; controls.autoRotateSpeed = 0.7;
  controls.maxPolarAngle = Math.PI * 0.48; controls.minDistance = 6; controls.maxDistance = 90; controls.enablePan = false;
  controls.enabled = opts.interactive !== false;
  controls.update();
  let raf = 0, alive = true; const clock = new THREE.Clock();
  const loop = () => { if (!alive) return; const tt = clock.getElapsedTime(); if (conf.update) conf.update(tt); myAnim.forEach(f => f(tt)); controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
  loop();
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); });
  ro.observe(el);
  return {
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.remove();
    }
  };
}

window.CBA = window.CBA || {};
CBA.Temple3D = { mount };

/* dùng lại cho game 3D (js/g3d) */
/* Bảng tên chùa (hoành phi): nền son đỏ, viền vàng, chữ vàng */
export function plaque(title, sub = '', W = 5, H = 1) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * H / W);
  const k = c.getContext('2d'), cw = c.width, ch = c.height;
  const gr = k.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#8c1a10'); gr.addColorStop(0.5, '#6e1009'); gr.addColorStop(1, '#4a0a05');
  k.fillStyle = gr; k.fillRect(0, 0, cw, ch);
  const b = Math.max(10, ch * 0.07); k.strokeStyle = '#e9b949'; k.lineWidth = b; k.strokeRect(b / 2, b / 2, cw - b, ch - b);
  k.strokeStyle = 'rgba(255,214,120,.55)'; k.lineWidth = 3; k.strokeRect(b * 1.6, b * 1.6, cw - b * 3.2, ch - b * 3.2);
  [[b * 2.4, b * 2.4], [cw - b * 2.4, b * 2.4], [b * 2.4, ch - b * 2.4], [cw - b * 2.4, ch - b * 2.4]].forEach(([x, y]) => { k.fillStyle = '#e9b949'; k.beginPath(); k.arc(x, y, b * 0.45, 0, 7); k.fill(); });
  k.textAlign = 'center'; k.textBaseline = 'middle';
  let fs = ch * (sub ? 0.4 : 0.52); k.font = `900 ${fs}px Georgia, 'Times New Roman', serif`;
  while (k.measureText(title).width > cw * 0.84 && fs > 12) { fs -= 2; k.font = `900 ${fs}px Georgia, 'Times New Roman', serif`; }
  k.shadowColor = 'rgba(0,0,0,.6)'; k.shadowBlur = 6; k.shadowOffsetY = 3;
  const tg = k.createLinearGradient(0, ch * 0.2, 0, ch * 0.7); tg.addColorStop(0, '#fff2b8'); tg.addColorStop(0.5, '#ffd36b'); tg.addColorStop(1, '#d99a2b');
  k.fillStyle = tg; k.fillText(title, cw / 2, sub ? ch * 0.43 : ch * 0.53);
  if (sub) { k.shadowBlur = 3; k.font = `700 ${ch * 0.16}px Georgia, serif`; k.fillStyle = '#f3d79a'; k.fillText(sub, cw / 2, ch * 0.77); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const g = new THREE.Group();
  const back = box(W + 0.12, H + 0.12, 0.08, GOLD(), 0, 0, -0.05); back.userData.noCollide = true; g.add(back);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.userData.noCollide = true; g.add(m);
  g.traverse(o => { o.userData.noCollide = true; });
  return g;
}
export function buildLandmark(g, model, opts = {}) {
  NO_GROUND = true; INTERIOR = opts.interior ? { set: opts.set || 'hoanh' } : null; HALLS.length = 0; ANIM.length = 0; BOARDS.length = 0;
  try { return (SCENES[model] || SCENES.hall)(g); } finally { NO_GROUND = false; INTERIOR = null; }
}
export function interiorHall(opts, set) { INTERIOR = { set }; try { return hall(opts); } finally { INTERIOR = null; } }
export { THREE, mat, mesh, box, cyl, roof, hall, tower, stairs, lotusBase, seatedBuddha, standingGuanyin, maitreya, tree, mountain, water, lotusPads, clouds, burner,
  RED, DRED, WALL, YWALL, ROOF, STONE, GOLD, WHITE, BRONZE, WOOD, LEAF, LEAF2, GRASS, DARK, WATER };
