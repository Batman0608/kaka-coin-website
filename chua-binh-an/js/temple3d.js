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
const LEAF = () => mat('leaf', 0x3f7a3a, { flatShading: true }), LEAF2 = () => mat('leaf2', 0x2f5f2f, { flatShading: true }), LEAF3 = () => mat('leaf3', 0x5a9a42, { flatShading: true });
const GRASS = () => mat('grass', 0x5f8a45), DARK = () => mat('dark', 0x1a0f0a), WATER = () => mat('water', 0x3c7f9a, { roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.88 });

function mesh(geo, m, x = 0, y = 0, z = 0, shadow = true) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z);
  o.castShadow = shadow; o.receiveShadow = true; return o;
}
/* ĐÁ LÁT: nền, thềm, bậc, bệ bằng đá (STONE) được lát đá xám cũ theo kích thước thật — mỗi phiến ~50 cm, không bị kéo giãn */
let _stoneTex = null;
function stoneTex() {
  if (_stoneTex) return _stoneTex;
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#56534c'; k.fillRect(0, 0, 512, 512);
  const tw = 128;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) {
    const x = i * tw + (r % 2 ? tw / 2 : 0), y = r * tw, v = Math.random(), b0 = 150 + v * 30 | 0;
    for (const ox of [0, -512]) {
      const X = x + ox; k.fillStyle = `rgb(${b0 + 4},${b0 + 1},${b0 - 6})`; k.fillRect(X + 3, y + 3, tw - 6, tw - 6);
      for (let n = 0; n < 4; n++) { const gx = X + Math.random() * tw, gy = y + Math.random() * tw, g2 = k.createRadialGradient(gx, gy, 0, gx, gy, 18 + Math.random() * 40); g2.addColorStop(0, `rgba(70,64,52,${0.1 + Math.random() * 0.14})`); g2.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = g2; k.fillRect(X + 3, y + 3, tw - 6, tw - 6); }
      for (let n = 0; n < 60; n++) { k.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.1})`; k.fillRect(X + 4 + Math.random() * (tw - 8), y + 4 + Math.random() * (tw - 8), 2, 2); }
      if (Math.random() < 0.25) { k.strokeStyle = 'rgba(50,46,40,.5)'; k.lineWidth = 1.2; k.beginPath(); let px = X + 12 + Math.random() * (tw - 24), py = y + 4; k.moveTo(px, py); for (let s2 = 0; s2 < 5; s2++) { px += (Math.random() - 0.5) * 20; py += tw / 5; k.lineTo(px, Math.min(py, y + tw - 4)); } k.stroke(); }
      k.fillStyle = 'rgba(255,255,255,.06)'; k.fillRect(X + 3, y + 3, tw - 6, 3);
    }
  }
  for (let n = 0; n < 40; n++) { const onV = Math.random() < 0.5, q = Math.random() * 512, p2 = (Math.random() * 4 | 0) * tw; k.fillStyle = `rgba(78,108,56,${0.3 + Math.random() * 0.3})`; if (onV) k.fillRect(p2 - 2 + (Math.random() < 0.5 ? tw / 2 : 0), q, 4, 5 + Math.random() * 12); else k.fillRect(q, p2 - 2, 5 + Math.random() * 12, 4); }
  _stoneTex = new THREE.CanvasTexture(c); _stoneTex.colorSpace = THREE.SRGBColorSpace; _stoneTex.wrapS = _stoneTex.wrapT = THREE.RepeatWrapping; _stoneTex.anisotropy = 4;
  return _stoneTex;
}
const STONE_TILE = () => mat('stoneTile', 0xffffff, { map: stoneTex(), roughness: 0.92 });
function uvMeters(geo, dims) {   // nhân UV mỗi mặt theo kích thước thật (2 m / 1 lần lặp ảnh)
  const uv = geo.attributes.uv, per = uv.count / dims.length;
  for (let f = 0; f < dims.length; f++) for (let i = 0; i < per; i++) { const j = f * per + i; uv.setXY(j, uv.getX(j) * dims[f][0] / 2, uv.getY(j) * dims[f][1] / 2); }
  uv.needsUpdate = true; return geo;
}
const box = (w, h, d, m, x, y, z) => {
  if (m && m === M.stone && Math.max(w, d) >= 1.2) {
    const ge = uvMeters(new THREE.BoxGeometry(w, h, d), [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]);
    return mesh(ge, STONE_TILE(), x, y, z);
  }
  return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
};
function stonePlane(w, d) { return mesh(uvMeters(new THREE.PlaneGeometry(w, d), [[w, d]]), STONE_TILE(), 0, 0, 0, false); }
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
const PHOTO = { quanamdung: ['assets/buddha/quanam-dung.webp', 561 / 880, '#fff3d6'], quanam: ['assets/buddha/quanam.webp', 462 / 539, '#ffe9a8'], duocsu: ['assets/buddha/duocsu.webp', 442 / 700, '#8fc3ff'], thichca: ['assets/buddha/thichca.webp', 725 / 860, '#ffd36b'], adida: ['assets/buddha/adida.webp', 576 / 700, '#ff9f6b'], dilac: ['assets/buddha/dilac.webp', 617 / 700, '#ffe9a8'] };
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
const MURAL_OF = { thichca: 'bodhi', tamthe: 'bodhi', adida: 'pureland', duocsu: 'lapis', dilac: 'maitreya', quanam: 'guanyin' };
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
  // câu đối hai bên (hoành phi do altarPanel vẽ để không chồng lên tượng)
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
  const pal = { bodhi: ['#6a1e0c', '#aa4418', '#e6a848'], pureland: ['#12495c', '#2a8a96', '#7ad0cc'], lapis: ['#13307e', '#2f5ec8', '#6a9aec'], maitreya: ['#6a3a0c', '#c47e1e', '#f4cc5c'], guanyin: ['#114a3c', '#249a74', '#6ad0a6'],
    river: ['#244a6a', '#5a86a4', '#aed0de'], mountain: ['#2a4a66', '#577a98', '#aecbdd'], khmer: ['#6a2610', '#c25e1c', '#f4a848'], lotuspond: ['#13524a', '#22a68c', '#6cdabc'], cave: ['#2a1a10', '#574026', '#9a7850'], sea: ['#124270', '#2f82c0', '#78c8ea'], relief: ['#52300f', '#a2651e', '#e0a644'] }[kind] || ['#6a1e0c', '#aa4418', '#e6a848'];
  const bg = k.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, pal[0]); bg.addColorStop(0.55, pal[1]); bg.addColorStop(1, pal[2]); k.fillStyle = bg; k.fillRect(0, 0, W, H);
  const gold = (a = 1) => `rgba(240,196,92,${a})`;
  // hào quang lớn sau đầu tượng
  const cx = W / 2, cy = H * 0.36;
  const halo = k.createRadialGradient(cx, cy, 0, cx, cy, W * 0.4); halo.addColorStop(0, 'rgba(255,246,210,.92)'); halo.addColorStop(0.3, 'rgba(255,220,130,.4)'); halo.addColorStop(0.65, 'rgba(255,200,100,.08)'); halo.addColorStop(1, 'rgba(255,200,100,0)');
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
  } else if (kind === 'river') {
    // Thiên Mụ bên sông Hương: tháp Phước Duyên, núi Ngự mờ, liễu rủ, mặt sông
    for (let i = 0; i < 3; i++) { k.fillStyle = `rgba(40,70,100,${0.5 - i * 0.12})`; k.beginPath(); k.moveTo(0, H * (0.6 - i * 0.04)); for (let x = 0; x <= W; x += W / 6) k.lineTo(x, H * (0.52 - i * 0.04) + Math.sin(x * 0.01 + i) * H * 0.04); k.lineTo(W, H * 0.7); k.lineTo(0, H * 0.7); k.fill(); }   // núi mờ
    const tx = W * 0.5, ty = H * 0.62; k.fillStyle = gold(0.9);
    for (let s = 0; s < 7; s++) { const w2 = W * (0.1 - s * 0.009), yy = ty - s * H * 0.055; k.fillRect(tx - w2 / 2, yy - H * 0.05, w2, H * 0.05); k.beginPath(); k.moveTo(tx - w2 * 0.7, yy - H * 0.05); k.lineTo(tx, yy - H * 0.08); k.lineTo(tx + w2 * 0.7, yy - H * 0.05); k.fill(); }   // tháp Phước Duyên 7 tầng
    k.fillStyle = 'rgba(120,180,210,.4)'; k.fillRect(0, H * 0.7, W, H * 0.3);
    k.strokeStyle = 'rgba(200,230,245,.5)'; k.lineWidth = 2; for (let r = 0; r < 5; r++) { k.beginPath(); for (let x = 0; x <= W; x += 8) k.lineTo(x, H * (0.74 + r * 0.05) + Math.sin(x * 0.05 + r) * 4); k.stroke(); }
    k.strokeStyle = 'rgba(120,180,90,.8)'; k.lineWidth = 2; [W * 0.08, W * 0.92].forEach(bx => { for (let i = 0; i < 9; i++) { k.beginPath(); k.moveTo(bx, H * 0.1); k.quadraticCurveTo(bx + (bx < W / 2 ? 20 : -20), H * 0.4, bx + (bx < W / 2 ? 14 : -14) + i * 2, H * 0.62); k.stroke(); } });   // liễu rủ
  } else if (kind === 'mountain') {
    // Yên Tử non thiêng: dãy núi trùng điệp vươn cao, biển mây, chùa Đồng trên đỉnh, thông hai bên
    const ridges = [[0.5, 0.11, 0.9], [0.42, 0.13, 0.78], [0.34, 0.1, 0.66], [0.24, 0.08, 0.5]];   // [baseY, biên độ, đậm]
    ridges.forEach(([by, amp, dk], i) => { k.fillStyle = `rgba(${44 + i * 16},${74 + i * 18},${104 + i * 20},${dk})`; k.beginPath(); k.moveTo(0, H); k.lineTo(0, H * by); for (let x = 0; x <= W; x += W / 10) { const peak = H * (by - amp) - Math.max(0, amp * H * 0.7 * Math.cos((x / W - (0.3 + i * 0.12)) * 6)); k.lineTo(x, H * by + Math.sin(x * 0.014 + i * 2) * amp * H * 0.5 + (peak - H * by) * Math.max(0, 1 - Math.abs(x / W - (0.28 + i * 0.14)) * 3)); } k.lineTo(W, H); k.fill(); });
    const px2 = W * 0.26, py2 = H * 0.17; k.fillStyle = gold(0.95); k.fillRect(px2 - W * 0.03, py2, W * 0.06, H * 0.035); k.beginPath(); k.moveTo(px2 - W * 0.045, py2); k.lineTo(px2, py2 - H * 0.03); k.lineTo(px2 + W * 0.045, py2); k.fill();   // chùa Đồng trên đỉnh
    for (let i = 0; i < 7; i++) cloud(W * (0.05 + i * 0.15), H * (0.5 + (i % 3) * 0.08), W * 0.14, 0.45);   // biển mây
    k.lineCap = 'round'; [W * 0.08, W * 0.92, W * 0.16].forEach((px, n) => { const py = H * (0.42 + n * 0.04); k.strokeStyle = 'rgba(30,55,30,.85)'; k.lineWidth = 4; k.beginPath(); k.moveTo(px, py + H * 0.18); k.lineTo(px, py - H * 0.12); k.stroke(); k.fillStyle = 'rgba(40,95,52,.9)'; for (let t = 0; t < 5; t++) { k.beginPath(); k.ellipse(px, py - H * 0.1 + t * H * 0.05, W * (0.07 - t * 0.01), H * 0.03, 0, 0, 7); k.fill(); } });   // thông cổ thụ
  } else if (kind === 'khmer') {
    // Chùa Dơi (Khmer): tháp nhọn nhiều tầng, hoa văn vàng, màu đỏ cam rực
    const spire = (x, s) => { k.fillStyle = gold(0.92); for (let t = 0; t < 6; t++) { const w2 = s * (1 - t * 0.14), yy = H * 0.6 - t * s * 0.42; k.beginPath(); k.moveTo(x - w2 / 2, yy); k.lineTo(x, yy - s * 0.4); k.lineTo(x + w2 / 2, yy); k.fill(); } k.beginPath(); k.moveTo(x, H * 0.6 - 6 * s * 0.42); k.lineTo(x - s * 0.06, H * 0.6 - 6 * s * 0.42 - s * 0.5); k.lineTo(x + s * 0.06, H * 0.6 - 6 * s * 0.42 - s * 0.5); k.fill(); };
    spire(W * 0.5, W * 0.16); spire(W * 0.22, W * 0.1); spire(W * 0.78, W * 0.1);
    k.strokeStyle = gold(0.6); k.lineWidth = 2; for (let i = 0; i < 20; i++) { const a = i / 20 * 6.28; k.beginPath(); k.arc(W / 2, H * 0.36, W * (0.3 + 0.02 * Math.sin(i)), a, a + 0.18); k.stroke(); }
    for (let i = 0; i < 8; i++) lotus(W * (0.08 + i * 0.12), H * 0.9, W * 0.055, '#ffb84d');
  } else if (kind === 'lotuspond') {
    // Chùa Một Cột: ao sen, lá sen tròn, hoa sen nở, cột đá
    k.fillStyle = 'rgba(30,120,110,.4)'; k.fillRect(0, H * 0.6, W, H * 0.4);
    k.strokeStyle = 'rgba(180,240,220,.4)'; k.lineWidth = 2; for (let r = 0; r < 4; r++) { k.beginPath(); for (let x = 0; x <= W; x += 8) k.lineTo(x, H * (0.66 + r * 0.07) + Math.sin(x * 0.05 + r) * 4); k.stroke(); }
    k.fillStyle = 'rgba(40,140,80,.75)'; for (let i = 0; i < 7; i++) { k.beginPath(); k.ellipse(W * (0.1 + i * 0.13), H * (0.78 + (i % 2) * 0.07), W * 0.07, H * 0.025, 0, 0, 7); k.fill(); }   // lá sen
    for (let i = 0; i < 6; i++) lotus(W * (0.14 + i * 0.145), H * (0.74 + (i % 2) * 0.08), W * 0.07);
    k.fillStyle = 'rgba(120,120,130,.8)'; k.fillRect(W * 0.47, H * 0.55, W * 0.06, H * 0.35);   // cột đá
  } else if (kind === 'cave') {
    // Chùa Hương (động Hương Tích): vòm hang, nhũ đá rủ, ánh sáng từ cửa động
    k.fillStyle = 'rgba(10,6,4,.6)'; k.beginPath(); k.moveTo(0, 0); k.lineTo(W, 0); k.lineTo(W, H); k.lineTo(0, H); k.fill();
    const hole = k.createRadialGradient(W / 2, H * 0.34, 0, W / 2, H * 0.34, W * 0.42); hole.addColorStop(0, 'rgba(255,230,160,.5)'); hole.addColorStop(1, 'rgba(255,220,140,0)'); k.fillStyle = hole; k.fillRect(0, 0, W, H);
    k.fillStyle = 'rgba(40,26,16,.95)'; for (let i = 0; i < 14; i++) { const x = W * (0.03 + i * 0.07), w2 = W * (0.03 + Math.random() * 0.03), h2 = H * (0.1 + Math.random() * 0.22); k.beginPath(); k.moveTo(x - w2 / 2, 0); k.lineTo(x + w2 / 2, 0); k.lineTo(x, h2); k.fill(); }   // nhũ đá trên
    k.fillStyle = 'rgba(30,20,12,.9)'; for (let i = 0; i < 8; i++) { const x = W * (0.06 + i * 0.12), w2 = W * 0.04, h2 = H * (0.08 + Math.random() * 0.14); k.beginPath(); k.moveTo(x - w2 / 2, H); k.lineTo(x + w2 / 2, H); k.lineTo(x, H - h2); k.fill(); }   // măng đá dưới
  } else if (kind === 'sea') {
    // Linh Ứng Bãi Bụt (Đà Nẵng) nhìn ra biển: chân trời, sóng biển, hải đảo, hải âu
    k.fillStyle = 'rgba(40,120,170,.5)'; k.fillRect(0, H * 0.5, W, H * 0.5);
    k.fillStyle = 'rgba(255,214,120,.5)'; k.beginPath(); k.arc(W / 2, H * 0.36, W * 0.2, 0, 7); k.fill();   // vầng dương trên biển
    k.fillStyle = 'rgba(30,90,70,.7)'; [[W * 0.14, W * 0.07], [W * 0.86, W * 0.05]].forEach(([x, s]) => { k.beginPath(); k.ellipse(x, H * 0.52, s, H * 0.03, 0, Math.PI, 0); k.fill(); });   // đảo
    k.strokeStyle = 'rgba(220,245,255,.6)'; k.lineWidth = 2.5; for (let r = 0; r < 7; r++) { k.beginPath(); for (let x = 0; x <= W; x += 8) k.lineTo(x, H * (0.56 + r * 0.06) + Math.sin(x * 0.045 + r) * 5); k.stroke(); }
    k.strokeStyle = 'rgba(255,255,255,.7)'; k.lineWidth = 2; for (let i = 0; i < 4; i++) { const gx = W * (0.2 + i * 0.2), gy = H * (0.2 + (i % 2) * 0.06); k.beginPath(); k.moveTo(gx - 8, gy); k.quadraticCurveTo(gx, gy - 6, gx + 8, gy); k.stroke(); }   // hải âu
  } else if (kind === 'relief') {
    // Tam Chúc: phù điêu đồng Tam Thế & tích Phật trên vách, sắc đồng ấm
    k.strokeStyle = gold(0.5); k.lineWidth = 1.5;
    for (let gx = 0; gx < W; gx += W * 0.1) for (let gy = 0; gy < H; gy += H * 0.1) { k.strokeRect(gx, gy, W * 0.1, H * 0.1); }   // ô phù điêu
    k.fillStyle = gold(0.3); for (let i = 0; i < 40; i++) { const x = (i % 8) * W * 0.12 + W * 0.06, y = Math.floor(i / 8) * H * 0.18 + H * 0.12; k.beginPath(); for (let j = 0; j < 7; j++) { const a = j / 7 * 6.28; k.lineTo(x + Math.cos(a) * W * 0.02, y - H * 0.03 + Math.sin(a) * H * 0.02); } k.fill(); k.fillStyle = gold(0.45); k.fillRect(x - W * 0.012, y - H * 0.03, W * 0.024, H * 0.05); k.fillStyle = gold(0.3); }   // dãy Phật tọa thiền nhỏ (tượng vách)
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
// [src, tỉ lệ, kiểu, cutRemoveBg] — cutRemoveBg=true là ảnh đã tách nền (hiện nền tranh riêng phía sau)
const BUDDHA_IMG = {
  tamthe:  ['assets/buddha/tamthe.webp', 1280 / 853, 'three', false],
  thichca: ['assets/buddha/thichca.webp', 725 / 860, 'one', true],
  adida:   ['assets/buddha/adida.webp', 576 / 700, 'one', true],
  duocsu:  ['assets/buddha/duocsu.webp', 442 / 700, 'one', true],
  dilac:   ['assets/buddha/dilac.webp', 617 / 700, 'one', true],
  quanam:  ['assets/buddha/quanam.webp', 462 / 539, 'one', true]
};
const ALTAR_LABEL = { tamthe: 'ĐẠI HÙNG BẢO ĐIỆN', thichca: 'ĐẠI HÙNG BẢO ĐIỆN', adida: 'CỰC LẠC BẢO ĐIỆN', duocsu: 'DƯỢC SƯ BẢO ĐIỆN', dilac: 'ĐẠI HÙNG BẢO ĐIỆN', quanam: 'QUAN ÂM BẢO ĐIỆN' };
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
  const z = -d / 2 + 0.9, zb = -d / 2 + 0.2;
  const key = (INTERIOR && INTERIOR.altar) || (set === 'nam' ? 'thichca' : 'tamthe');
  const [src, asp, kind, cut] = BUDDHA_IMG[key] || BUDDHA_IMG.thichca; const single = kind === 'one';
  const nc = (o) => { o.traverse(x => { x.userData.noCollide = true; x.castShadow = false; }); g.add(o); return o; };
  const gold = mat('shrGold', 0xcf9a34, { metalness: 0.65, roughness: 0.35 }), red = mat('shrRed', 0x6e1008), dark = mat('shrDark', 0x1c0a04);
  // 1) vách chạm vàng phủ kín tường sau
  const tex = carvedWallTex().clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(2, w / 3), Math.max(2, h / 2.4));
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.5, h - 0.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3 }));
  wall.position.set(0, base + (h - 0.2) / 2, zb + 0.02); nc(wall);
  // kích thước bức Phật — chừa chỗ hoành phi phía trên, không chồng lên tượng
  const boardH = Math.min(0.5, h * 0.1);
  let ph = Math.min(h - 1.78 - boardH, single ? 3.0 : 3.2), pw = ph * asp; if (pw > w - 2.2) { pw = w - 2.2; ph = pw / asp; }
  const cy = base + 1.0 + ph / 2, zf = zb + 0.06;
  // 2) khám lớn hơn tượng → bức tranh nền (cây bồ đề, núi, biển, ao sen…) hiện rõ quanh & trên đầu tượng
  const bgKind = (INTERIOR && INTERIOR.bg) || MURAL_OF[key] || 'bodhi';
  const bigNiche = asp < 1.2;   // ảnh chân dung (tượng đơn, Quan Âm) → khám rộng lộ cảnh nền; tranh ngang Tam Thế giữ khung sát
  const nw = bigNiche ? Math.min(w - 1.6, pw + 2.3) : pw + 0.42, nh = bigNiche ? Math.min(h - boardH - 1.4, ph + 1.8) : ph + 0.42;
  nc(box(nw + 0.2, nh + 0.2, 0.1, dark, 0, cy, zf - 0.02));   // tấm nền tối ngay sau bức tranh
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(nw, nh), new THREE.MeshBasicMaterial({ map: muralTex(bgKind, 512, Math.round(512 * nh / nw)), toneMapped: false }));
  mural.position.set(0, cy, zf + 0.06); nc(mural);   // rõ hẳn trước vách chạm vàng
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(pw * 1.15, ph * 1.2), addMat(glowTex('#ffdf95'), 0.5)); glow.position.set(0, cy + ph * 0.08, zf + 0.1); nc(glow);
  // 3) bức Phật đặt sâu trong khám
  const btex = texLoader.load(src); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 4;
  // ảnh đã tách nền → vẽ trong suốt để lộ bức tranh nền phía sau; ảnh có nền sẵn → vẽ đặc
  const imgMat = cut ? new THREE.MeshBasicMaterial({ map: btex, transparent: true, alphaTest: 0.04, depthWrite: false, toneMapped: false })
                     : new THREE.MeshBasicMaterial({ map: btex, toneMapped: false });
  const img = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), imgMat); img.position.set(0, cy, zf + 0.14); nc(img);
  if (!cut) frameRect(g, 0, cy, zf + 0.17, pw + 0.14, ph + 0.14, 0.09, 0.2, gold);   // ảnh có nền → khung vàng sát quanh ảnh (như tranh treo trên vách cảnh)
  // 4) khung nổi nhiều lớp (tạo chiều sâu 3D) bao quanh khám: vàng trong → đỏ ngoài, nhô dần ra
  frameRect(g, 0, cy, zf + 0.18, nw + 0.3, nh + 0.3, 0.14, 0.28, gold);
  frameRect(g, 0, cy, zf + 0.42, nw + 0.62, nh + 0.62, 0.22, 0.4, red);
  let topY = cy + nh / 2 + 0.25;
  if (single) {
    // 5) hai cột rồng vàng hai bên khám
    [-1, 1].forEach(sx => { const x = sx * (nw / 2 + 0.55); nc(cyl(0.16, 0.18, nh + 0.9, 12, gold, x, cy, zf + 0.5)); nc(cyl(0.22, 0.22, 0.18, 12, red, x, cy + nh / 2 + 0.5, zf + 0.5)); nc(cyl(0.22, 0.22, 0.18, 12, red, x, cy - nh / 2 - 0.4, zf + 0.5)); });
    // 6) bửu cái (tán che) phía trên khám
    topY = cy + nh / 2 + 0.34;
    nc(box(nw + 1.1, 0.18, 0.6, red, 0, topY, zf + 0.5));
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.02, nw * 0.5, 0.3, 4), gold); canopy.rotation.y = Math.PI / 4; canopy.position.set(0, topY + 0.2, zf + 0.42); nc(canopy);
    for (let i = 0; i < 7; i++) { const ts = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), gold); ts.position.set(-nw * 0.5 + i * (nw / 6), topY - 0.11, zf + 0.72); nc(ts); }
    topY += 0.38;
  }
  // hoành phi tên điện — đặt hẳn phía trên bửu cái, nhô ra trước để không bị che
  const label = (INTERIOR && ALTAR_LABEL[INTERIOR.altar]) || 'ĐẠI HÙNG BẢO ĐIỆN', bw2 = Math.min(w * 0.46, 6.2);
  const bhh = bw2 * 174 / 1024, boardY = Math.min(base + h - 0.05 - bhh / 2, topY + 0.28 + bhh / 2);
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(bw2, bhh), new THREE.MeshBasicMaterial({ map: boardTex(label, false, 1024, 174), toneMapped: false })); hm.position.set(0, boardY, zf + 0.55); nc(hm);
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
/* hành lang La Hán: dãy cột gỗ có mái, nền đá, tượng La Hán ngồi (trang trí, không chắn lối giữa) */
function laHanCorridor(g, x, z0, z1) {
  const n = Math.round((z1 - z0) / 2.0), red = mat('corrRed', 0x8a2a16), wood = mat('corrWood', 0x5a3418), stone = STONE(), roofM = mat('corrRoof', 0x4a2a18);
  const grp = new THREE.Group(); grp.position.set(x, 0, 0);
  grp.add(box(2.2, 0.3, z1 - z0 + 1, stone, 0, 0.15, (z0 + z1) / 2));      // nền đá
  grp.add(box(0.5, 1.0, z1 - z0 + 1, red, x > 0 ? 0.85 : -0.85, 0.5, (z0 + z1) / 2));   // tường lửng phía ngoài
  for (let i = 0; i <= n; i++) { const z = z0 + i * (z1 - z0) / n;
    grp.add(cyl(0.14, 0.16, 2.6, 8, wood, 0, 1.6, z));                     // cột
    if (i < n) { const bz = z + (z1 - z0) / n / 2; const fig = seatedBuddha(0.5, mat('arhat', 0x8f8a7c)); fig.position.set(x > 0 ? 0.5 : -0.5, 0.3, bz); grp.add(fig); }   // tượng La Hán đá
  }
  const L = z1 - z0 + 1.2, cz = (z0 + z1) / 2;
  // mái dốc hai phía (hai tấm nghiêng) + nóc
  [-1, 1].forEach(sx => { const slab = box(1.5, 0.12, L, roofM, sx * 0.62, 3.05, cz); slab.rotation.z = -sx * 0.5; grp.add(slab); });
  grp.add(box(0.3, 0.16, L, mat('corrRidge', 0x3a2212), 0, 3.42, cz));   // nóc
  grp.traverse(o => { o.userData.noCollide = true; });   // trang trí, không chặn đường
  g.add(grp);
}
/* phong cách riêng từng chùa (theo kiến trúc thật, giản lược): màu tường, mái, cột · linh vật canh hai bên bậc */
const STYLES = {
  'binh-an': { wall: 0xe9dcc0, roof: 0x4a2c22, col: 0x9c2a1a, guard: 'sutu', gm: 0xcfc6b6 },
  'bai-dinh': { wall: 0xd8cfbd, roof: 0x5a4a3a, col: 0x6b4423, guard: 'rong', gm: 0xbdb3a0 },
  'tam-chuc': { wall: 0x9a8f86, roof: 0x3a3a3a, col: 0x7a5a3a, guard: 'hophap', gm: 0x8a7f74 },
  'mot-cot': { wall: 0xe6c56a, roof: 0x4a2c22, col: 0x9c2a1a, guard: 'nghe', gm: 0xc9c0ae },
  'chua-ha': { wall: 0xe6c56a, roof: 0x5a3020, col: 0x9c2a1a, guard: 'nghe', gm: 0xd8cfc0 },
  'huong': { wall: 0xd9cdb5, roof: 0x4a3a2a, col: 0x7a3a1a, guard: 'lan', gm: 0xa9a294 },
  'yen-tu': { wall: 0xcfc3a8, roof: 0x3f3a33, col: 0x6b4423, guard: 'hophap', gm: 0x9a6a2a, metal: true },
  'thien-mu': { wall: 0xe8d6a8, roof: 0x6a5a3a, col: 0x8a2a1a, guard: 'lan', gm: 0xc9b98a },
  'linh-ung': { roof: 0x2f5a7a, col: 0xa8321e, guard: 'rong', gm: 0xeeeae0 },
  'long-son': { wall: 0xf2ead8, roof: 0x9a3a1e, col: 0xa83a20, guard: 'sutu', gm: 0xf2efe6 },
  'vinh-nghiem': { wall: 0xd8d4cc, roof: 0x2e2e2e, col: 0x5a3a22, guard: 'sutu', gm: 0x8a8378, metal: true },
  'giac-lam': { wall: 0xdccaa0, roof: 0x5a3a2a, col: 0x4a2a14, guard: 'voi', gm: 0xb8b0a0 },
  'doi': { guard: 'naga', gm: 0xf0d080 },
};
let STYLE = null;
/* cánh cửa gỗ kiểu bức bàn: khung đỏ sẫm, ô song trên, bản gỗ dưới, đinh vàng */
function doorLeaf(wd, ht) {
  const g = new THREE.Group(), wood = mat('doorWood', 0x6a1a0e), dark = mat('doorDark', 0x3a0c06);
  g.add(box(wd, ht, 0.08, wood, 0, ht / 2, 0));
  g.add(box(wd * 0.78, ht * 0.38, 0.1, dark, 0, ht * 0.74, 0));
  for (let k = -2; k <= 2; k++) g.add(box(0.04, ht * 0.38, 0.12, wood, k * wd * 0.15, ht * 0.74, 0));
  for (let k = 0; k < 3; k++) g.add(box(wd * 0.78, 0.04, 0.12, wood, 0, ht * (0.62 + k * 0.12), 0));
  g.add(box(wd * 0.7, ht * 0.3, 0.1, mat('doorPanel', 0x7e2414), 0, ht * 0.3, 0));
  g.add(box(wd * 0.9, 0.06, 0.12, GOLD(), 0, ht * 0.52, 0));
  g.traverse(o => { o.userData.noCollide = true; o.castShadow = false; });
  return g;
}
/* ---------------- linh vật / hộ pháp canh hai bên bậc chánh điện ---------------- */
function guardian(kind, side, m) {
  const g = new THREE.Group(), S = STYLE || {};
  m = m || mat('guard' + (S.gm || 0xcfc6b6), S.gm || 0xcfc6b6, S.metal ? { metalness: 0.6, roughness: 0.4 } : { roughness: 0.85 });
  const ped = (w, h, d) => g.add(box(w, h, d, STONE(), 0, h / 2, 0));
  const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1, mm = m) => { const o = mesh(new THREE.SphereGeometry(r, 12, 10), mm, x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; };
  const leg = (x, z, y0, len, r = 0.09) => g.add(cyl(r, r * 1.1, len, 8, m, x, y0 + len / 2, z));
  const face = side < 0 ? 1 : -1;   // linh vật hơi quay vào lối đi giữa
  if (kind === 'sutu' || kind === 'nghe') {   // sư tử đá / nghê (chó thần Việt) ngồi trên bệ
    ped(1.0, 0.7, 1.3); const y = 0.7, nghe = kind === 'nghe';
    sph(0.42, 0, y + 0.42, -0.12, 0.9, 1, 1.15);                                   // thân
    sph(0.34, 0, y + 0.95, 0.12, 1, 1.15, 0.9);                                    // ngực
    const head = sph(nghe ? 0.27 : 0.3, 0, y + 1.38, 0.28); head.scale.set(1, 0.95, nghe ? 1.15 : 1);
    if (!nghe) { const mane = mesh(new THREE.TorusGeometry(0.3, 0.12, 8, 16), m, 0, y + 1.32, 0.2); g.add(mane); }
    else { [-1, 1].forEach(s => { const e = mesh(new THREE.ConeGeometry(0.08, 0.26, 6), m, s * 0.17, y + 1.62, 0.22); e.rotation.z = -s * 0.4; g.add(e); }); const tl = mesh(new THREE.TorusGeometry(0.2, 0.06, 6, 12, Math.PI * 1.4), m, 0, y + 0.8, -0.55); tl.rotation.y = Math.PI / 2; g.add(tl); }
    sph(0.12, 0, y + 1.3, 0.55, 1.3, 0.8, 0.8);                                    // mõm
    [-1, 1].forEach(s => { sph(0.05, s * 0.11, y + 1.45, 0.53, 1, 1, 1, mat('eyeDark', 0x2a1a10)); leg(s * 0.2, 0.3, y, 0.62, 0.1); sph(0.13, s * 0.2, y + 0.06, 0.38, 1, 0.6, 1.3); });
    if (!nghe) sph(0.15, side * -0.25, y + 0.08, 0.62, 1, 1, 1, mat('guardBall', 0xd9a83a, { metalness: 0.6, roughness: 0.35 }));   // quả cầu dưới chân
    g.rotation.y = face * 0.35;
  } else if (kind === 'lan') {   // kỳ lân: có sừng, vảy xanh vàng
    ped(1.0, 0.7, 1.4); const y = 0.7, sc = mat('lanScale', 0x4f8a5a, { roughness: 0.6 });
    sph(0.42, 0, y + 0.45, -0.1, 0.9, 1, 1.2, sc); sph(0.32, 0, y + 0.98, 0.15, 1, 1.15, 0.9, sc);
    sph(0.28, 0, y + 1.4, 0.3, 1, 0.95, 1.1);
    const horn = mesh(new THREE.ConeGeometry(0.06, 0.38, 8), GOLD(), 0, y + 1.75, 0.3); horn.rotation.x = -0.3; g.add(horn);
    const mane = mesh(new THREE.ConeGeometry(0.28, 0.6, 8), mat('lanMane', 0xd9a83a), 0, y + 1.3, 0.0); mane.rotation.x = -1.9; g.add(mane);
    [-1, 1].forEach(s => { leg(s * 0.2, 0.3, y, 0.62); leg(s * 0.2, -0.4, y, 0.4); sph(0.05, s * 0.11, y + 1.47, 0.55, 1, 1, 1, mat('eyeDark', 0x2a1a10)); });
    g.rotation.y = face * 0.35;
  } else if (kind === 'voi') {   // voi chầu
    ped(1.3, 0.5, 2.0); const y = 0.5, gm = mat('voiGrey', 0x8a8580, { roughness: 0.9 });
    sph(0.62, 0, y + 1.05, -0.15, 0.85, 0.75, 1.25, gm);
    const hd = sph(0.42, 0, y + 1.35, 0.72, 1, 1, 0.9, gm);
    const tr = mesh(new THREE.TorusGeometry(0.36, 0.09, 8, 14, Math.PI * 0.9), gm, 0, y + 0.85, 1.05); tr.rotation.y = Math.PI / 2; g.add(tr);
    [-1, 1].forEach(s => { const ear = box(0.06, 0.62, 0.5, gm, s * 0.42, y + 1.38, 0.55); ear.rotation.y = s * 0.5; g.add(ear);
      const tk = mesh(new THREE.ConeGeometry(0.05, 0.5, 8), WHITE(), s * 0.18, y + 0.98, 1.08); tk.rotation.x = 2.1; g.add(tk);
      [0.35, -0.6].forEach(z => leg(s * 0.3, z, y, 0.75, 0.16)); });
    g.add(box(0.95, 0.12, 0.95, mat('voiCloth', 0xb3261e), 0, y + 1.66, -0.15)); g.add(box(1.0, 0.04, 1.0, GOLD(), 0, y + 1.74, -0.15));
    g.rotation.y = face * 0.25;
  } else if (kind === 'hophap') {   // hộ pháp: Khuyến Thiện (mặt hiền) · Trừng Ác (mặt đỏ)
    ped(1.1, 0.5, 1.1); const y = 0.5, ac = side < 0;
    const armor = S.metal ? mat('hpBronze', 0x9a6a2a, { metalness: 0.75, roughness: 0.35 }) : mat(ac ? 'hpArmA' : 'hpArmB', ac ? 0x2f6a8a : 0x8a2a1a, { roughness: 0.6 });
    const skin = S.metal ? armor : mat(ac ? 'hpSkinA' : 'hpSkinB', ac ? 0xf0d0b0 : 0xc0392b);
    [-1, 1].forEach(s => g.add(cyl(0.13, 0.15, 0.95, 8, armor, s * 0.17, y + 0.48, 0)));
    g.add(cyl(0.36, 0.3, 0.95, 10, armor, 0, y + 1.42, 0));                         // giáp thân
    g.add(cyl(0.42, 0.36, 0.22, 10, GOLD(), 0, y + 1.0, 0));                         // đai
    [-1, 1].forEach(s => { const sh = sph(0.18, s * 0.42, y + 1.82, 0, 1.3, 0.8, 1, GOLD()); const arm = cyl(0.09, 0.1, 0.8, 8, armor, s * 0.48, y + 1.45, 0.08); arm.rotation.x = -0.25; g.add(arm); });
    sph(0.24, 0, y + 2.2, 0.02, 1, 1.1, 1, skin);
    const hel = mesh(new THREE.ConeGeometry(0.28, 0.42, 10), GOLD(), 0, y + 2.52, 0); g.add(hel);
    const wpX = side * -0.5; g.add(cyl(0.035, 0.035, 2.7, 6, WOOD(), wpX * -1, y + 1.35, 0.25));   // giáo / chùy
    const tip = mesh(new THREE.ConeGeometry(0.09, 0.4, 6), GOLD(), wpX * -1, y + 2.85, 0.25); g.add(tip);
    g.rotation.y = face * 0.3;
  } else if (kind === 'rong' || kind === 'naga') {   // rồng đá / rắn thần Naga uốn dọc lan can bậc, đầu ngóc ở chân bậc
    const naga = kind === 'naga', rm = naga ? mat('nagaGold', 0xe0b040, { metalness: 0.5, roughness: 0.4 }) : m;
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(Math.sin(t * Math.PI * 3) * 0.12, 1.05 - t * 0.6 + Math.sin(t * Math.PI * 4) * 0.08, -2.6 + t * 2.7)); }
    const body = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.14, 8), rm, 0, 0, 0); g.add(body);
    g.add(box(0.5, 0.45, 3.2, STONE(), 0, 0.225, -1.2));                            // lan can đá đỡ thân
    if (naga) { for (let k = -2; k <= 2; k++) { const hd = mesh(new THREE.SphereGeometry(0.15, 10, 8), rm, k * 0.2, 1.05 + (2 - Math.abs(k)) * 0.12, 0.25); hd.scale.set(0.8, 1, 1.4); g.add(hd); }
      const hood = mesh(new THREE.CircleGeometry(0.62, 16, 0, Math.PI), rm, 0, 0.75, 0.12); hood.material = rm; g.add(hood); }
    else { const hd = sph(0.22, 0, 0.62, 0.22, 1, 0.9, 1.4, rm); const jaw = mesh(new THREE.ConeGeometry(0.12, 0.3, 6), rm, 0, 0.54, 0.5); jaw.rotation.x = Math.PI / 2; g.add(jaw);
      [-1, 1].forEach(s => { const hn = mesh(new THREE.ConeGeometry(0.04, 0.3, 6), GOLD(), s * 0.1, 0.86, 0.12); hn.rotation.x = -0.7; g.add(hn); });
      const pearl = sph(0.1, 0, 0.62, 0.72, 1, 1, 1, mat('pearl', 0xfff2c0, { emissive: 0xffc860, emissiveIntensity: 0.4 })); }
  }
  g.traverse(o => { if (o.isMesh && o.geometry.type !== 'BoxGeometry') o.userData.noCollide = true; });
  g.scale.setScalar(kind === 'rong' || kind === 'naga' ? 1.15 : 1.35);
  return g;
}
/* trang trí hai bên tường chánh điện: bệ thờ La Hán, đèn sen, phướn treo, câu đối trên cột */
const CAU_DOI = ['Phật pháp vô biên', 'Từ bi hỷ xả', 'Tâm an vạn sự an', 'Nam mô A Di Đà Phật', 'Phước huệ song tu', 'Hoa khai kiến Phật', 'Quay đầu là bờ', 'Tùy duyên an lạc'];
function hallSideDecor(g, w, d, base, h, az, colM) {
  const nc = (o) => { o.traverse(x => { x.userData.noCollide = true; x.castShadow = false; }); g.add(o); return o; };
  const lac = mat('lahanGold', 0xc8932e, { metalness: 0.6, roughness: 0.38 }), lac2 = mat('lahanBronze', 0x8a5a24, { metalness: 0.7, roughness: 0.4 });
  const robe = mat('lahanRobe', 0xb5651d, { metalness: 0.45, roughness: 0.45 });
  const z0 = az + 3.4, z1 = d / 2 - 2.6; if (z1 - z0 < 3) return;
  [-1, 1].forEach(s => {
    const x = s * (w / 2 - 0.85);
    // bệ thờ dài sơn son, viền vàng
    g.add(box(1.1, 0.85, z1 - z0, mat('altar', 0x7a1a0e), x, base + 0.425, (z0 + z1) / 2));
    nc(box(1.2, 0.06, z1 - z0 + 0.1, GOLD(), x, base + 0.88, (z0 + z1) / 2));
    // tượng La Hán ngồi, xoay vào lối giữa
    const n = Math.max(3, Math.floor((z1 - z0) / 1.7));
    for (let i = 0; i < n; i++) {
      const z = z0 + (i + 0.5) * (z1 - z0) / n, f = new THREE.Group(); f.position.set(x, base + 0.91, z); f.rotation.y = -s * Math.PI / 2;
      const m = i % 2 ? lac2 : lac;
      f.add(mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.2, 14), robe, 0, 0.1, 0));                 // đùi xếp bằng
      f.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.55, 12), robe, 0, 0.45, -0.04));             // thân áo cà sa
      f.add(mesh(new THREE.SphereGeometry(0.17, 14, 10), m, 0, 0.86, -0.02));                         // đầu
      const pose = (i * 3 + (s > 0 ? 1 : 0)) % 4;   // mỗi vị một tư thế tay
      if (pose === 0) f.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), m, 0, 0.32, 0.22));          // chắp tay
      else if (pose === 1) { const a = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), robe, 0.2, 0.62, 0.08); a.rotation.z = -0.9; f.add(a); f.add(mesh(new THREE.SphereGeometry(0.06, 6, 5), m, 0.34, 0.8, 0.1)); }   // giơ tay
      else if (pose === 2) f.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), GOLD(), 0, 0.3, 0.26)); // ôm bát
      else { const t = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), WOOD(), -0.22, 0.5, 0.12); t.rotation.z = 0.15; f.add(t); }   // cầm tích trượng
      f.add(mesh(new THREE.TorusGeometry(0.22, 0.015, 6, 20), GOLD(), 0, 0.9, -0.16));              // hào quang
      nc(f);
      if (i < n - 1) { const lz = z + (z1 - z0) / n / 2; nc(cyl(0.05, 0.07, 0.16, 8, GOLD(), x + s * 0.2, base + 0.99, lz));
        nc(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('lotusLamp', 0xffb0c8, { emissive: 0xff6a8a, emissiveIntensity: 0.9 }), x + s * 0.2, base + 1.1, lz, false)); }
    }
    // phướn treo từ trần (vàng, đỏ, xanh xen kẽ)
    const cols = [0xe0a92a, 0xb3261e, 0x2f6a8a, 0xe0a92a];
    for (let z = -d / 2 + 4.6, k = 0; z < d / 2 - 2; z += 4.2, k++) {
      const len = Math.min(2.6, h * 0.42), bx = s * (w / 2 - 2.0), ph = new THREE.Group(); ph.position.set(bx, base + h - 0.4, z);
      ph.add(box(0.06, 0.06, 0.9, GOLD(), 0, 0, 0));
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, len), mat('phuon' + cols[k % 4], cols[k % 4], { side: THREE.DoubleSide, emissive: cols[k % 4], emissiveIntensity: 0.12 })); cl.rotation.y = Math.PI / 2; cl.position.y = -len / 2 - 0.05; ph.add(cl);
      [0.3, 0.6].forEach(f => ph.add(box(0.03, 0.04, 0.72, GOLD(), 0, -len * f, 0)));
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.4, 3), mat('phuon' + cols[k % 4], cols[k % 4], { side: THREE.DoubleSide })); tail.rotation.z = Math.PI; tail.scale.z = 0.05; tail.rotation.y = Math.PI / 2; tail.position.y = -len - 0.2; ph.add(tail);
      nc(ph);
    }
    // câu đối son son thếp vàng trên mặt cột trong điện, quay vào lối giữa
    let k = s > 0 ? 0 : 4;
    for (let z = -d / 2 + 3; z < d / 2 - 2; z += 4.2) {
      if (z < az + 1) continue;
      const bd = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 2.3), new THREE.MeshStandardMaterial({ map: boardTex(CAU_DOI[k++ % CAU_DOI.length], true, 96, 520), roughness: 0.6 }));
      bd.position.set(s * (w * 0.36 - 0.27), base + h * 0.5, z); bd.rotation.y = -s * Math.PI / 2; nc(bd);
    }
    // đèn chầu bằng đồng đứng hai bên lối vào
    const lz = d / 2 - 1.8, lx = s * (w * 0.2 - 0.6);
    const dl = new THREE.Group(); dl.position.set(lx, base, lz);
    dl.add(cyl(0.32, 0.4, 0.15, 12, BRONZE(), 0, 0.075, 0)); dl.add(cyl(0.06, 0.08, 1.5, 8, BRONZE(), 0, 0.85, 0)); dl.add(cyl(0.26, 0.16, 0.2, 12, BRONZE(), 0, 1.65, 0));
    dl.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), mat('flame', 0xffd36b, { emissive: 0xffa020, emissiveIntensity: 2 }), 0, 1.82, 0, false));
    g.add(dl);
  });
}
function hall({ w = 10, d = 6, h = 3.2, tiers = 2, wall = null, roofColor = null, base = 0.8 } = {}) {
  const g = new THREE.Group(), S = STYLE || {}, main = !!(INTERIOR && w >= 9);
  if (main) { w = Math.max(w * 1.45, 15) * 1.25; d = Math.max(d * 1.8, 13) * 1.6; h = Math.max(h, 5.2) * 1.1; }   // chánh điện: diện tích gấp đôi bản trước
  if (roofColor == null && S.roof) roofColor = S.roof;
  if (!wall && S.wall && main) wall = mat('sw' + S.wall, S.wall);
  const colM = S.col ? mat('sc' + S.col, S.col, { roughness: 0.7 }) : RED();
  g.add(box(w + 1.6, base, d + 1.6, STONE(), 0, base / 2, 0));
  if (main) {   // chánh điện vào được: tường sau + 2 bên, mặt trước có cửa bức bàn mở
    const wm = wall || WALL();
    g.add(box(w, h, 0.3, wm, 0, base + h / 2, -d / 2 + 0.15));
    [-1, 1].forEach(sx => g.add(box(0.3, h, d, wm, sx * (w / 2 - 0.15), base + h / 2, 0)));
    g.add(woodFloor(w - 0.6, d - 0.3, 0, base + 0.03, 0.1));   // sàn gỗ lim
    const nc = (o) => { o.traverse(x => { x.userData.noCollide = true; x.castShadow = false; }); g.add(o); return o; };
    const fill = new THREE.PointLight(0xffd6a0, 1.5, Math.max(w, d) * 1.4, 1.2); fill.position.set(0, base + h - 1.0, 0.15 * d); g.add(fill);
    const fill2 = new THREE.PointLight(0xffd6a0, 0.9, Math.max(w, d), 1.3); fill2.position.set(0, base + h - 1.2, d * 0.32); g.add(fill2);
    const wood = mat('ceil', 0x3a1a0c), beamM = mat('ceilBeam', 0x241008);
    nc(box(w - 0.3, 0.08, d + 0.4, wood, 0, base + h + 0.02, 0.1));
    for (let z = -d / 2 + 1.6; z < d / 2; z += 2.6) nc(box(w - 0.4, 0.32, 0.28, beamM, 0, base + h - 0.18, z));
    [-1, 1].forEach(sx => nc(box(0.26, 0.3, d, beamM, sx * w * 0.28, base + h - 0.48, 0)));
    // hàng cột gỗ trong điện (đỡ mái), lùi sát hai bên để không che bàn thờ
    [-1, 1].forEach(sx => { for (let z = -d / 2 + 3; z < d / 2 - 2; z += 4.2) { const c = cyl(0.24, 0.26, h, 12, colM, sx * w * 0.36, base + h / 2, z); g.add(c); } });
    const lampM = mat('paperLamp', 0xffd9a0, { emissive: 0xffb050, emissiveIntensity: 1.1 });
    [[-0.28, -0.15], [0.28, -0.15], [-0.28, 0.15], [0.28, 0.15], [-0.28, 0.38], [0.28, 0.38]].forEach(([fx, fz]) => {
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
    hallSideDecor(g, w, d, base, h, az, colM);
    const lu = new THREE.Group(); lu.position.set(0, base, az + 2.6); lu.userData.burner = true; g.add(lu);
    lu.add(cyl(0.75, 0.85, 0.35, 16, STONE(), 0, 0.17, 0));
    lu.add(cyl(0.55, 0.42, 0.75, 20, BRONZE(), 0, 0.72, 0));
    lu.add(cyl(0.68, 0.55, 0.12, 20, BRONZE(), 0, 1.12, 0));
    [-1, 1].forEach(sx => { const ear = mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 16), BRONZE(), sx * 0.66, 1.15, 0); ear.rotation.y = Math.PI / 2; lu.add(ear); });
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; lu.add(cyl(0.06, 0.09, 0.4, 8, BRONZE(), Math.cos(a) * 0.38, 0.4, Math.sin(a) * 0.38)); }
    lu.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20), mat('ash', 0x9a8f80), 0, 1.15, 0));
    for (let k = 0; k < 9; k++) { const st = cyl(0.012, 0.012, 0.45, 5, mat('stick', 0xb3261e), (Math.random() - 0.5) * 0.5, 1.38, (Math.random() - 0.5) * 0.4); st.rotation.z = (Math.random() - 0.5) * 0.25; lu.add(st); }
    const offerSlots = []; for (let k = 0; k < 9; k++) { const o = k === 0 ? 0 : Math.ceil(k / 2) * (k % 2 ? -1 : 1) * 0.42; offerSlots.push(new THREE.Vector3(o, base + 0.96, az + 0.42 + (k % 3 === 0 ? 0 : 0.06))); }
    const cushions = [];
    const cols = Math.min(9, Math.max(3, Math.floor((w - 4) / 1.6))), rows = Math.min(8, Math.max(2, Math.floor((d - 2.6) / 1.4)));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 1.6, z = az + 6.6 + r * 1.4;   // hàng đệm đầu lùi xa bàn thờ ~5 m
      if (Math.abs(x) < 1.6 && z < az + 7) continue;
      if (z > d / 2 - 2.2) continue;
      const cu = box(0.75, 0.1, 0.75, mat('cush', 0xa3231a), x, base + 0.11, z); cu.userData.cushion = true; g.add(cu);
      { const cg = box(0.5, 0.02, 0.5, mat('cushg', 0xe0a93a), x, base + 0.17, z); cg.userData.cushion = true; g.add(cg); }
      cushions.push(new THREE.Vector3(x, base + 0.16, z));
    }
    g.userData.mainHall = { w, d, base, altar: new THREE.Vector3(0, base, az + 1.2), cushions, offerSlots, burner: new THREE.Vector3(0, base, az + 2.6), roofs: [], front: [] };
    HALLS.push(g);
    const F = g.userData.mainHall.front;
    // ===== mặt tiền: tường trước với cửa chính lớn (4 cánh bức bàn mở) + 2 cửa bên =====
    const fz = d / 2 - 0.15, dh = Math.min(h * 0.78, 4.4), cw = w * 0.2 - 0.4;
    const seg = (x0, x1, y0, y1) => { if (x1 - x0 < 0.05 || y1 - y0 < 0.05) return; const b = box(x1 - x0, y1 - y0, 0.3, wm, (x0 + x1) / 2, base + (y0 + y1) / 2, fz); b.userData.camSkip = true; g.add(b); F.push(b); };
    const trim = (x0, x1, y) => { const t = box(x1 - x0, 0.14, 0.36, GOLD(), (x0 + x1) / 2, base + y, fz); t.userData.noCollide = true; t.userData.camSkip = true; g.add(t); F.push(t); };
    seg(-cw, cw, dh, h); trim(-cw, cw, dh);
    [-1, 1].forEach(s => {
      const a = w * 0.2 + 0.4, bE = w / 2 - 0.3, c = (a + bE) / 2, sw = Math.min(1.25, (bE - a) / 2 - 0.4), sdh = Math.min(dh * 0.82, 3.4);
      const M = (x0, x1, y0, y1) => s > 0 ? seg(x0, x1, y0, y1) : seg(-x1, -x0, y0, y1);
      M(cw, c - sw, 0, h); M(c - sw, c + sw, sdh, h); M(c + sw, bE, 0, h);
      s > 0 ? trim(c - sw, c + sw, sdh) : trim(-c - sw, -c + sw, sdh);
      // cánh cửa mở vào trong (đứng vuông góc tường)
      const leafC = cw / 2 - 0.05;
      [0, 1].forEach(k => { const lf = doorLeaf(leafC, dh - 0.05); lf.position.set(s * (cw - 0.08 - k * 0.12), base, fz - 0.2 - leafC / 2); lf.rotation.y = Math.PI / 2; lf.children.forEach(o => o.position.x -= 0); lf.position.z = fz - 0.18 - leafC / 2; g.add(lf); F.push(lf); });
      const sl = doorLeaf(sw - 0.05, sdh - 0.05); sl.position.set(s * (c + sw - 0.08), base, fz - 0.18 - sw / 2); sl.rotation.y = Math.PI / 2; g.add(sl); F.push(sl);
      const sl2 = doorLeaf(sw - 0.05, sdh - 0.05); sl2.position.set(s * (c - sw + 0.08), base, fz - 0.18 - sw / 2); sl2.rotation.y = Math.PI / 2; g.add(sl2); F.push(sl2);
    });
    // đèn lồng đỏ dưới hiên
    [-1, 1].forEach(sx => { const l = mesh(new THREE.SphereGeometry(0.32, 12, 10), mat('lantern', 0xd9332a, { emissive: 0xff4020, emissiveIntensity: 0.6 }), sx * w * 0.2, base + h - 0.8, d / 2 + 0.6, false); l.scale.y = 1.2; g.add(l); F.push(l); });
    F.push(beam);
    // linh vật / hộ pháp canh hai bên bậc
    if (S.guard) [-1, 1].forEach(sx => { const gd = guardian(S.guard, sx); const along = S.guard === 'rong' || S.guard === 'naga';
      gd.position.set(sx * (w * 0.2 + (along ? 0.3 : 1.4)), 0, d / 2 + (along ? 3.0 : 2.3)); g.add(gd); });
  } else g.add(box(w, h, d, wall || WALL(), 0, base + h / 2, 0));
  // cột hiên: chỉ 4 cột (2 góc + 2 cột hai bên cửa chính) — thoáng, rõ lối vào
  const xs = w >= 6 ? [-w / 2, -w * 0.2, w * 0.2, w / 2] : [-w / 2, w / 2];
  xs.forEach(x => {
    const pil = cyl(0.22, 0.25, h, 12, colM, x, base + h / 2, d / 2 + 0.55); g.add(pil);
    const plin = cyl(0.36, 0.4, 0.22, 12, STONE(), x, base + 0.11, d / 2 + 0.55); g.add(plin);
    if (g.userData.mainHall) { [pil, plin].forEach(o => { o.userData.camSkip = true; g.userData.mainHall.front.push(o); }); }
  });
  if (!main) {   // điện nhỏ: cửa gỗ hai cánh đóng + hai ô cửa sổ song
    const dw = Math.min(w * 0.18, 1.2), dhh = h * 0.7;
    [-1, 1].forEach(s => { const lf = doorLeaf(dw, dhh); lf.position.set(s * dw / 2, base, d / 2 + 0.06); g.add(lf); });
    g.add(box(dw * 2 + 0.3, 0.14, 0.16, GOLD(), 0, base + dhh + 0.07, d / 2 + 0.08));
    if (w >= 6) [-1, 1].forEach(s => { const wx = s * w * 0.35; g.add(box(w * 0.14, h * 0.32, 0.08, mat('winBg', 0x1c0d06), wx, base + h * 0.55, d / 2 + 0.05));
      for (let k = -2; k <= 2; k++) g.add(box(0.05, h * 0.32, 0.1, RED(), wx + k * w * 0.026, base + h * 0.55, d / 2 + 0.07)); });
  }
  const r1 = roof(w + 2.2, d + 2.4, h * 0.75, roofColor); r1.position.y = base + h; g.add(r1);
  const roofs = [r1];
  if (tiers > 1) {
    const band = box(w * 0.6, h * 0.45, d * 0.6, wall || WALL(), 0, base + h + h * 0.75 * 0.5 + h * 0.2, 0); band.userData.noCollide = true; g.add(band);
    const r2 = roof(w * 0.75 + 1.4, d * 0.75 + 1.4, h * 0.65, roofColor); r2.position.y = base + h + h * 0.62; g.add(r2);
    roofs.push(band, r2);
  }
  if (g.userData.mainHall) {
    g.userData.mainHall.roofs = roofs;
    g.userData.mainHall.h = h;
    g.userData.mainHall.plaqueAt = { x: 0, y: base + h - 0.05, z: d / 2 + 1.3, w: Math.min(w * 0.36, 6.5), h: Math.min(1.1, Math.max(0.8, w * 0.07)) };
  }
  // bậc thềm (rộng bằng cửa chính)
  const sw = main ? w * 0.4 : w * 0.3;
  g.userData.hallSteps = { z: d / 2 + 2.95, base, w: sw };
  for (let i = 0; i < 4; i++) g.add(box(sw, (i + 1) * base / 4, 0.4, STONE(), 0, (i + 1) * base / 8, d / 2 + 0.8 + 1.6 - i * 0.4));
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
  const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.tree = h;
  g.add(cyl(h * 0.05, h * 0.08, h * 0.5, 8, WOOD(), 0, h * 0.25, 0));
  if (kind === 'pine') { for (let i = 0; i < 3; i++) g.add(mesh(new THREE.ConeGeometry(h * (0.32 - i * 0.07), h * 0.38, 8), LEAF2(), 0, h * (0.5 + i * 0.2), 0)); }
  else {   // tán tròn xum xuê: vài cành chĩa lên, 8 chùm lá to nhỏ, ba sắc lá
    [[-1, 0.5], [1, -0.4], [0.3, 1]].forEach(([bx, bz]) => { const b = cyl(h * 0.025, h * 0.04, h * 0.32, 6, WOOD(), bx * h * 0.07, h * 0.56, bz * h * 0.07); b.rotation.set(bz * 0.5, 0, -bx * 0.5); b.userData.noCollide = true; g.add(b); });
    const shades = [m, m === LEAF() ? LEAF2() : LEAF(), LEAF3()];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.random() * 0.5, rr = i === 7 ? 0 : h * (0.16 + Math.random() * 0.1), sz = h * (i === 7 ? 0.3 : 0.2 + Math.random() * 0.07);
      const s = mesh(new THREE.IcosahedronGeometry(sz, 1), shades[i === 7 ? 0 : (i + (Math.random() * 3 | 0)) % 3], Math.cos(a) * rr, h * (i === 7 ? 0.86 : 0.66 + Math.random() * 0.16), Math.sin(a) * rr); s.scale.y = 0.82; g.add(s); } }
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
  m.userData.mountain = true;
  return m;
}
/* sàn gỗ lim trong chánh điện: ván dài, vân gỗ, mạch ván */
let _wood = null;
function woodTex() {
  if (_wood) return _wood;
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const k = c.getContext('2d');
  const bw = 64;   // 8 tấm ván / 2 m
  for (let i = 0; i < 512 / bw; i++) {
    let y = -Math.random() * 300;
    while (y < 512) { const len = 220 + Math.random() * 260, v = Math.random();
      const R = 112 + v * 34 | 0, G = 62 + v * 20 | 0, B = 32 + v * 12 | 0;
      k.fillStyle = `rgb(${R},${G},${B})`; k.fillRect(i * bw, y, bw, len);
      for (let n = 0; n < 9; n++) { k.strokeStyle = `rgba(${40 + v * 20 | 0},${18},${8},${0.18 + Math.random() * 0.2})`; k.lineWidth = 1 + Math.random() * 1.5; k.beginPath(); const gx = i * bw + 4 + Math.random() * (bw - 8); k.moveTo(gx, y); k.bezierCurveTo(gx + (Math.random() - 0.5) * 10, y + len * 0.3, gx + (Math.random() - 0.5) * 10, y + len * 0.7, gx + (Math.random() - 0.5) * 6, y + len); k.stroke(); }
      if (Math.random() < 0.35) { k.fillStyle = 'rgba(50,22,8,.35)'; k.beginPath(); k.ellipse(i * bw + bw / 2 + (Math.random() - 0.5) * 30, y + len * Math.random(), 4, 9, 0, 0, 7); k.fill(); }   // mắt gỗ
      k.fillStyle = 'rgba(255,220,180,.07)'; k.fillRect(i * bw + 2, y, 3, len);
      k.fillStyle = 'rgba(25,10,4,.85)'; k.fillRect(i * bw, y + len - 2, bw, 2);   // mạch đầu ván
      y += len; }
    k.fillStyle = 'rgba(25,10,4,.9)'; k.fillRect(i * bw, 0, 2, 512);   // mạch dọc
  }
  _wood = new THREE.CanvasTexture(c); _wood.colorSpace = THREE.SRGBColorSpace; _wood.wrapS = _wood.wrapT = THREE.RepeatWrapping; _wood.anisotropy = 4;
  return _wood;
}
function woodFloor(w, d, x, y, z) {
  const t = woodTex().clone(); t.needsUpdate = true; t.repeat.set(w / 2, d / 2);
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.05 }));
  o.position.set(x, y, z); o.receiveShadow = true; o.userData.floor = true; return o;
}
function water(w, d, x = 0, z = 0) { const o = mesh(new THREE.PlaneGeometry(w, d, 1, 1), WATER(), x, 0.05, z, false); o.rotation.x = -Math.PI / 2; return o; }
/* bến thuyền: cầu tàu gỗ từ bờ ra nước + quầy bán vé có mái (đi lại được trên cầu tàu) */
function dockKit(g, { x, z0, z1, booth }) {
  const plank = mat('pierWood', 0x8a6a42, { roughness: 0.85 }), post = mat('pierPost', 0x5a3a22), w = 3.2, len = Math.abs(z1 - z0), zc = (z0 + z1) / 2, dir = Math.sign(z1 - z0);
  g.add(box(w, 0.35, len, plank, x, 0.175, zc));
  for (let k = 0; k <= len; k += 1.6) [-1, 1].forEach(s => { const p = box(0.22, 1.4, 0.22, post, x + s * (w / 2 - 0.1), 0.0, z0 + dir * k); p.userData.noCollide = true; g.add(p); });
  for (let k = 0.4; k < len; k += 0.5) { const l = box(w - 0.05, 0.02, 0.06, mat('pierLine', 0x6a4a2a), x, 0.36, z0 + dir * k); l.userData.noCollide = true; g.add(l); }
  [-1, 1].forEach(s => { const r = box(0.08, 0.08, len * 0.7, mat('pierRope', 0xc9a65a), x + s * (w / 2 - 0.1), 0.9, z0 + dir * len * 0.35); r.userData.noCollide = true; g.add(r);
    for (let k = 0; k <= len * 0.7; k += 1.6) { const q = box(0.12, 0.6, 0.12, post, x + s * (w / 2 - 0.1), 0.65, z0 + dir * k); q.userData.noCollide = true; g.add(q); } });
  if (booth) { const [bx, bz, rot] = booth, k = new THREE.Group(); k.position.set(bx, 0, bz); k.rotation.y = rot || 0; g.add(k);
    k.add(box(2.6, 1.05, 1.0, mat('boothWood', 0x7a3a1a), 0, 0.525, 0.4)); k.add(box(2.8, 0.08, 1.2, GOLD(), 0, 1.09, 0.4));
    [[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.9], [1.3, 0.9]].forEach(([px, pz]) => k.add(cyl(0.08, 0.08, 2.6, 8, RED(), px, 1.3, pz)));
    const rf = roof(3.4, 2.2, 0.9, 0x6a2a14); rf.position.set(0, 2.6, 0.2); rf.traverse(o => { o.userData.noCollide = true; }); k.add(rf);
    const sg = plaque('BẾN THUYỀN', 'Vé tham quan 30 hoa sen', 2.6, 0.62); sg.position.set(0, 2.25, 1.02); sg.traverse(o => { o.userData.noCollide = true; }); k.add(sg);
    [-1.1, 1.1].forEach(px => { const l = mesh(new THREE.SphereGeometry(0.2, 10, 8), mat('lantern', 0xd9332a, { emissive: 0xff4020, emissiveIntensity: 0.6 }), px, 2.0, 1.0, false); l.scale.y = 1.25; l.userData.noCollide = true; k.add(l); }); }
}
/* hai bờ sông dài: đồi thấp, rặng tre, cây — để đi thuyền xa vẫn có cảnh */
function riverBanks(g, zNear, zFar, half, skip = 45, seed = 1, o = {}) {
  let r = seed * 9301; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const mtOff = o.mtOff ?? 18, farSkip = o.farSkip || 0;
  for (let x = -half; x <= half; x += 7) {
    if (Math.abs(x) < skip) { /* gần chùa: chỉ trồng bên kia sông */ }
    else { const t = tree(4 + rnd() * 3, rnd() > 0.5 ? LEAF() : LEAF2(), x + rnd() * 3, zNear - 3 - rnd() * 5); g.add(t); }
    const tx = x + rnd() * 3, tz = zFar + 3 + rnd() * 6, ts = 4 + rnd() * 3.5, tl = rnd() > 0.4;
    if (Math.abs(tx) >= farSkip) g.add(tree(ts, tl ? LEAF() : LEAF2(), tx, tz));
    if (rnd() > 0.72) { const mr = 8 + rnd() * 8, mh = 6 + rnd() * 10, mx = x + rnd() * 6, mz = zFar + mtOff + rnd() * 12; if (Math.abs(mx) >= farSkip || mtOff > 40) g.add(mountain(mr, mh, 0x4f7a3f, (x | 0) + seed, mx, mz)); }
  }
  // hàng rào lan can đá dọc hai bờ sông (chừa lối xuống bến)
  riverFence(g, zNear - 0.45, half, o.gapsNear || []);
  riverFence(g, zFar + 0.45, half, o.gapsFar || []);
}
/* lan can đá dọc bờ: trụ + 2 thanh ngang + gờ chân; một bức chắn vô hình mỗi đoạn để không đi xuống nước */
function riverFence(g, z, half, gaps) {
  const rail = mat('lakeRail', 0xd8cdb4), segs = []; let x0 = -half;
  gaps.slice().sort((a, b) => a[0] - b[0]).forEach(([a, b]) => { if (a > x0) segs.push([x0, a]); x0 = Math.max(x0, b); }); if (half > x0) segs.push([x0, half]);
  const posts = []; segs.forEach(([a, b]) => { const n = Math.max(1, Math.round((b - a) / 2.4)); for (let k = 0; k <= n; k++) posts.push(a + (b - a) * k / n); });
  const geoP = new THREE.BoxGeometry(0.3, 1.1, 0.3), geoC = new THREE.BoxGeometry(0.4, 0.14, 0.4);
  const ip = new THREE.InstancedMesh(geoP, rail, posts.length), ic = new THREE.InstancedMesh(geoC, rail, posts.length), m4 = new THREE.Matrix4();
  posts.forEach((x, i) => { m4.makeTranslation(x, 0.55, z); ip.setMatrixAt(i, m4); m4.makeTranslation(x, 1.17, z); ic.setMatrixAt(i, m4); });
  [ip, ic].forEach(im => { im.castShadow = true; im.userData.noCollide = true; im.frustumCulled = false; g.add(im); });
  segs.forEach(([a, b]) => { const L = b - a, cx = (a + b) / 2;
    [[0.13, 0.18, 0.98], [0.1, 0.14, 0.5]].forEach(([h, d, y]) => { const r = box(L, h, d, rail, cx, y, z); r.userData.noCollide = true; g.add(r); });
    const base = box(L, 0.16, 0.46, STONE(), cx, 0.08, z); base.userData.noCollide = true; g.add(base);
    const wall = box(L, 1.4, 0.35, rail, cx, 0.7, z); wall.visible = false; g.add(wall); });
}
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
  // đèn lồng treo đầu thuyền (sáng khi trời tối)
  const pole = cyl(0.03, 0.03, 1.4, 6, WOOD(), 1.7, 0.95, 0); pole.userData.noCollide = true; g.add(pole);
  const lan = mesh(new THREE.SphereGeometry(0.17, 10, 8), mat('lantern', 0xd9332a, { emissive: 0xff4020, emissiveIntensity: 0.6 }), 1.7, 1.5, 0, false); lan.scale.y = 1.25; lan.userData.noCollide = true; lan.userData.nightLamp = true; g.add(lan);
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
function courtyard(g, w, d, z = 4) { const o = stonePlane(w, d); o.position.set(0, 0.02, z); o.rotation.x = -Math.PI / 2; o.userData.court = true; g.add(o); }
function burner(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.burner = true; g.add(cyl(0.6, 0.45, 0.7, 12, BRONZE(), 0, 0.75, 0)); g.add(cyl(0.12, 0.12, 0.4, 8, BRONZE(), 0, 0.2, 0)); g.add(cyl(0.7, 0.6, 0.1, 12, BRONZE(), 0, 1.1, 0)); return g; }

/* ---------------- cảnh của từng chùa ---------------- */
const SCENES = {
  hall(g) {
    ground(g); courtyard(g, 18, 10, 5);
    { const h = hall({ w: 10, d: 6 }); g.add(h); const hd = h.userData.mainHall ? h.userData.mainHall.d : 6; g.add(burner(0, hd / 2 + 6)); }
    [-15.5, 15.5].forEach(x => g.add(tree(6, LEAF(), x, 9)));   // cây sân trước, ngoài chánh điện (điện rộng ±7,5)
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
    const hw = h.userData.mainHall ? h.userData.mainHall.w : 16, back = hz - hd / 2 - 1.4, base = box(Math.max(26, hw + 2.4), 3, 5 - back, STONE(), 0, 1.5, (5 + back) / 2); g.add(base);
    h.position.set(0, 3, hz); g.add(h);
    const st = stairs(6, 10, 0.3, 0.6); st.position.set(0, 0, 10.7); g.add(st);   // bậc trên cùng (3,0 m) chạm đúng mép nền
    const bell = hall({ w: 4, d: 4, h: 2.6, tiers: 2 }); bell.position.set(-19, 0, 6); g.add(bell);
    // Bảo Tháp 13 tầng cao lớn bên phải
    const tw = tower({ tiers: 13, sides: 4, r: 3, th: 1.9, taper: 0.52, wall: mat('btwall', 0xcdbda0), roofColor: 0x5a3a24 }); tw.position.set(20, 0, -4); tw.scale.setScalar(1.25); g.add(tw);
    // Hành lang La Hán hai bên lối lên (dãy cột có mái, tượng La Hán ngồi)
    laHanCorridor(g, -13, 3, 16.5); laHanCorridor(g, 13, 3, 16.5);   // nằm trọn trong tường, dừng trước cổng
    courtyard(g, 22, 12, 14); g.add(burner(0, 16));
    [-24, 24, -22, 24].forEach((x, i) => g.add(tree(5.5, LEAF(), x, 16 + (i % 2) * 4)));
    return { cam: [28, 17, 36], target: [0, 6, -2] };
  },
  tamchuc(g) {
    ground(g, 760, 0x5a8248);
    // hồ Tam Chúc phía trước (tiền Lục Nhạc), thuyền, sen
    g.add(water(560, 46, 0, 61));   // hồ Tam Chúc mở rộng — đi thuyền tham quan quanh các đảo đá
    riverBanks(g, 37, 84, 270, 40, 7, { gapsNear: [[-85, 85]] });
    [[-30, 52, 3.2], [24, 60, 2.6], [-8, 66, 2.2], [34, 50, 2.2], [-40, 58, 2.6], [12, 70, 2]].forEach(([x, z, r]) => g.add(mountain(r, r * 1.4, 0x4a6a40, (x | 0) + 3, x, z)));
    { const rail = mat('lakeRail', 0xd8cdb4), zr = 37.4;   // lan can đá dọc bờ hồ: không đi xuống nước
      for (let x = -84; x <= 84; x += 2.4) { if (Math.abs(x) < 2.2) continue; g.add(box(0.32, 1.15, 0.32, rail, x, 0.575, zr)); g.add(box(0.42, 0.14, 0.42, rail, x, 1.22, zr)); }
      [-1, 1].forEach(s => { const cx = s * 43.3; g.add(box(81.4, 0.14, 0.2, rail, cx, 1.02, zr)); g.add(box(81.4, 0.1, 0.16, rail, cx, 0.5, zr)); g.add(box(81.4, 0.18, 0.5, STONE(), cx, 0.09, zr)); }); }   // chừa lối xuống bến thuyền
    dockKit(g, { x: 0, z0: 37.2, z1: 43, booth: [7.5, 34.0, 0] });
    g.add(boat(-12, 46, 0.15)); g.add(boat(9, 49, -0.2)); lotusPads(g, 18, 80, 10, 0, 48);
    // núi Thất Tinh (hậu Thất Tinh) phía sau + Chùa Ngọc granit đỏ trên sườn
    g.add(mountain(24, 32, 0x3f6a35, 2, 0, -92)); g.add(mountain(18, 22, 0x4a7a3a, 6, -40, -86)); g.add(mountain(18, 20, 0x56803f, 8, 40, -88));
    const ngoc = tower({ tiers: 5, sides: 4, r: 1.7, th: 1.6, taper: 0.5, wall: mat('ngocwall', 0x9c3a2a), roofColor: 0x7a241a }); ngoc.position.set(0, 13, -76); ngoc.scale.setScalar(0.95); g.add(ngoc);
    g.add(cyl(5, 6.5, 1.3, 20, STONE(), 0, 12.3, -76)); g.add(mountain(14, 12.3, 0x4a7a3a, 5, 0, -76, 6));
    // tượng Di Lặc đồng trên đồi bên phải (có đài sen, hào quang)
    { const ds = 3.0, top = 6, dx = 31, dz = 10;   // đồi đỉnh bằng, bệ đá, tượng ngồi vững trên đỉnh, hào quang sau đầu
      g.add(mountain(12, top, 0x5f8a45, 4, dx, dz, 5));
      g.add(cyl(3.6, 4.0, 0.8, 24, STONE(), dx, top + 0.4, dz));
      const dl = maitreya(ds, BRONZE()); dl.position.set(dx, top + 0.8, dz); dl.rotation.y = -0.8; g.add(dl);
      const hal = new THREE.Mesh(new THREE.TorusGeometry(ds * 0.55, 0.1, 10, 36), GOLD()); hal.position.set(dx + Math.sin(-0.8) * -ds * 0.4, top + 0.8 + ds * 1.9, dz - Math.cos(-0.8) * ds * 0.4); hal.rotation.y = -0.8; hal.userData.noCollide = true; g.add(hal); }

    /* === TỔ HỢP CÁC CẤP: đi từ hồ lên, qua các điện cấp thấp (cổng đóng, chỉ vào sân) === */
    const terr = (w, zc, dep, y) => { if (y > 0.05) g.add(box(w, y, dep, STONE(), 0, y / 2, zc)); };   // nền cấp cao, mặt trên đúng y
    const flank = (z0, z1, dh, yBase) => { const n = Math.max(5, Math.round((z0 - z1) / 0.5)); [-6.5, 6.5].forEach(sx => { const st = stairs(3.4, n, dh / n, (z0 - z1) / n); st.position.set(sx, yBase || 0, z0); g.add(st); }); };
    const closedHall = (zc, y, w, d, hh, label) => {   // điện cấp: đóng cửa, chỉ đứng ngoài nhìn
      const e = hall({ w, d, h: hh, tiers: 2 }); e.position.set(0, y, zc); g.add(e);
      const fz = zc + d / 2 + 0.85;   // mặt trước (hiên)
      [-1, 1].forEach(sx => { const dr = box(w * 0.26, hh * 0.72, 0.16, mat('tcDoor', 0x5a0f06), sx * w * 0.16, y + 0.4 + hh * 0.36, fz); g.add(dr);
        [0.3, 0.6].forEach(f => { const stud = cyl(0.05, 0.05, 0.18, 6, GOLD(), sx * w * 0.16, y + 0.4 + hh * f, fz + 0.02); stud.userData.noCollide = true; g.add(stud); }); });
      g.add(box(0.14, hh * 0.78, 0.2, GOLD(), 0, y + 0.4 + hh * 0.39, fz));   // thanh giữa hai cánh (khóa)
      const sg = plaque(label, '', Math.min(w * 0.5, 3.2), 0.42); sg.position.set(0, y + 0.4 + hh * 0.86, fz + 0.03); sg.traverse(o => { o.userData.noCollide = true; }); g.add(sg);
    };
    // ba điện cách xa nhau gấp đôi trước đây để không che khuất nhau: Quan Âm → (24 m) → Pháp Chủ → (sân 14 m) → Tam Thế
    const zQ = 20, zP = -4, z2f = zQ - 2.5 - 4, z3f = zP - 2.5 - 6;
    // Cấp 1 (y0): sân trước + Điện Quan Âm (đóng)
    courtyard(g, 24, 12, 25); g.add(burner(0, 29));
    closedHall(zQ, 0, 8, 5, 3, 'ĐIỆN QUAN ÂM');
    flank(z2f + 5.5, z2f, 2.3, 0);                         // bậc hai bên lên cấp 2
    // Cấp 2 (y2.3): nền rộng + Điện Pháp Chủ (đóng), sân trước điện thoáng
    terr(30, (z2f + z3f) / 2, z2f - z3f, 2.3);
    closedHall(zP, 2.3, 8.5, 5, 3.2, 'ĐIỆN PHÁP CHỦ');
    { const c2 = stonePlane(18, z2f - zP - 4); c2.position.set(0, 2.32, (z2f + zP + 4) / 2); c2.rotation.x = -Math.PI / 2; c2.userData.court = true; g.add(c2); const bz = burner(0, (z2f + zP) / 2 + 2); bz.position.y = 2.3; g.add(bz); }   // (trước đây lỡ nâng cả cảnh lên 2,3 m → người chơi như đi dưới đất)
    flank(z3f + 5.5, z3f, 2.1, 2.3);                       // bậc hai bên lên cấp 3 (y2.3 -> y4.4)
    // Cấp 3 (y4.4): CHÁNH ĐIỆN TAM THẾ — vào lễ bình thường, có sân rộng phía trước
    const h = hall({ w: 16, d: 8, h: 4.6, tiers: 3 }); const thd = h.userData.mainHall ? h.userData.mainHall.d : 8, thw = h.userData.mainHall ? h.userData.mainHall.w : 16, hzc = z3f - 0.6 - thd / 2 - 3.4 - 8;
    terr(Math.max(32, thw + 4), (z3f + hzc - thd / 2 - 1.6) / 2, z3f - (hzc - thd / 2 - 1.6), 4.4);
    h.position.set(0, 4.4, hzc); g.add(h);
    // vườn Cột Kinh hai bên lối giữa (cấp 1)
    for (let i = 0; i < 5; i++) { const z = 30.5 - i * 2.4; [-9.5, 9.5].forEach(x => { g.add(cyl(0.34, 0.4, 4.4 + (i % 2) * 0.6, 10, STONE(), x, 2.2, z)); g.add(cyl(0.5, 0.42, 0.3, 10, mat('ckcap', 0x8a6a3a), x, 4.5, z)); }); }
    // hành lang La Hán hai bên chạy dọc tổ hợp
    laHanCorridor(g, -13.5, 15, 34); laHanCorridor(g, 13.5, 15, 34);
    [-24, 24, -22, 24].forEach((x, i) => g.add(tree(6, LEAF(), x, 34 + (i % 2) * 5)));
    return { cam: [40, 34, 56], target: [0, 8, -16] };
  },
  huong(g) {
    ground(g, 760, 0x4f7a3f);
    // dãy núi Hương Sơn phía sau
    g.add(mountain(40, 48, 0x6a7a5a, 2, 0, -100)); g.add(mountain(30, 34, 0x5a6a4a, 4, -50, -84)); g.add(mountain(30, 32, 0x5f7050, 6, 50, -86));
    // NÚI ĐẶT CHÙA: đỉnh bằng (cao 16 m, mặt trên bán kính 24 m), chánh điện dựng trên đỉnh
    const TOP = 16, MZ = -52, RT = 24, RB = 31, mt = mountain(RB, TOP, 0x66765a, 11, 0, MZ, RT); g.add(mt);
    const SW = 4.2, RISE = 0.25, RUN = 0.5, N = TOP / RISE, LAND = 2.4, zTop = MZ + RT;   // bậc đá: 64 bậc, 2 chiếu nghỉ
    const flights = [[0, 22], [22, 43], [43, N]], zAt = []; let z = zTop;   // tính từ đỉnh xuống chân
    // khoét rãnh trên sườn núi dưới chân bậc (tránh đá nhô lên che bậc)
    { const P = mt.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const lx = P.getX(i), lz = P.getZ(i), wy = P.getY(i) + TOP / 2; if (Math.abs(lx) > SW / 2 + 1.6 || lz < RT - 1) continue; const d = lz - RT, sy = TOP - Math.max(0, d) * (RISE / RUN) * 0.86; if (wy > sy - 0.6) P.setY(i, sy - 0.6 - TOP / 2); } P.needsUpdate = true; mt.geometry.computeVertexNormals(); }
    const stoneStep = STONE(), wallM = mat('stairWall', 0x8f877a), railM = mat('lakeRail', 0xd8cdb4), redM = RED(), roofM = mat('galRoof', 0x5a3a2a);
    const steps = new THREE.Group(); g.add(steps);
    // dựng từ trên xuống: mỗi bậc là khối đá đặc từ mặt đất lên (bậc liền khối, đi lên được)
    const segs = [];
    flights.forEach(([i0, i1], fi) => {
      const zStart = z;
      for (let i = i0; i < i1; i++) { const top = TOP - i * RISE; steps.add(box(SW, top, RUN, stoneStep, 0, top / 2, z + RUN / 2)); z += RUN; }
      segs.push({ z0: zStart, z1: z, y0: TOP - i0 * RISE, y1: TOP - i1 * RISE });
      if (fi < flights.length - 1) { const top = TOP - i1 * RISE; steps.add(box(SW, top, LAND, stoneStep, 0, top / 2, z + LAND / 2)); segs.push({ z0: z, z1: z + LAND, y0: top, y1: top, land: true }); z += LAND; }
    });
    const zFoot = z;   // chân bậc
    // lan can đá + hành lang có mái hai bên bậc; tường chắn vô hình để không bước ra khỏi bậc
    segs.forEach(sg => {
      const L = sg.z1 - sg.z0, zc = (sg.z0 + sg.z1) / 2, yc = (sg.y0 + sg.y1) / 2, ang = Math.atan2(sg.y0 - sg.y1, L);
      [-1, 1].forEach(sx => {
        const x = sx * (SW / 2 + 0.15);
        const rl = box(0.26, 0.14, Math.hypot(L, sg.y0 - sg.y1), railM, x, yc + 1.0, zc); rl.rotation.x = ang; rl.userData.noCollide = true; g.add(rl);
        const bs = box(0.3, 0.5, Math.hypot(L, sg.y0 - sg.y1), wallM, x, yc + 0.25, zc); bs.rotation.x = ang; bs.userData.noCollide = true; g.add(bs);
        const wall = box(0.4, Math.max(sg.y0, sg.y1) + 3.2, L, wallM, sx * (SW / 2 + 0.25), (Math.max(sg.y0, sg.y1) + 3.2) / 2, zc); wall.visible = false; g.add(wall);
        // hành lang: cột đỏ + mái ngói chạy dọc theo dốc
        const gx = sx * (SW / 2 + 1.25);
        const n = Math.max(1, Math.round(L / 3.2));
        for (let k = 0; k <= n; k++) { const zz = sg.z0 + L * k / n, yy = sg.y0 + (sg.y1 - sg.y0) * k / n; const c = cyl(0.13, 0.15, 2.7, 8, redM, gx, yy + 1.35, zz); c.userData.noCollide = true; g.add(c); const c2 = cyl(0.11, 0.13, 2.7, 8, redM, x, yy + 1.35, zz); c2.userData.noCollide = true; g.add(c2); }
        const rg = new THREE.Group(); rg.userData.gate = true; g.add(rg);
        const rf = box(2.0, 0.14, Math.hypot(L, sg.y0 - sg.y1) + 0.3, roofM, sx * (SW / 2 + 0.7), yc + 2.8, zc); rf.rotation.x = ang; rf.rotation.z = sx * 0.22; rf.userData.noCollide = true; rg.add(rf);
        const ridge = box(0.18, 0.18, Math.hypot(L, sg.y0 - sg.y1) + 0.3, mat('galRidge', 0x7a2a14), sx * (SW / 2 + 0.2), yc + 2.98, zc); ridge.rotation.x = ang; ridge.userData.noCollide = true; rg.add(ridge);
      });
    });
    // trụ đá + đèn lồng ở chân bậc
    [-1, 1].forEach(sx => { g.add(box(0.7, 2.2, 0.7, wallM, sx * (SW / 2 + 0.6), 1.1, zFoot + 0.6)); const l = mesh(new THREE.SphereGeometry(0.3, 10, 8), mat('lantern', 0xd9332a, { emissive: 0xff4020, emissiveIntensity: 0.6 }), sx * (SW / 2 + 0.6), 2.55, zFoot + 0.6, false); l.userData.noCollide = true; g.add(l); });
    // mặt bằng đỉnh núi: lát đá, lan can vòng quanh mép (chừa lối bậc)
    { const slab = cyl(RT - 0.4, RT - 0.4, 0.12, 48, STONE(), 0, TOP + 0.06, MZ); slab.userData.noCollide = true; g.add(slab);
      const NS = 56, R = RT - 0.6, gap = Math.asin((SW / 2 + 0.6) / R);
      for (let k = 0; k < NS; k++) { const a0 = k / NS * Math.PI * 2, a1 = (k + 1) / NS * Math.PI * 2, am = (a0 + a1) / 2;
        if (Math.abs(((am - Math.PI / 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < gap + 0.02) continue;   // phía trước (+z): lối lên bậc
        const x = Math.cos(am) * R, zz = MZ + Math.sin(am) * R, len = 2 * R * Math.sin(Math.PI / NS) + 0.05;
        const seg = new THREE.Group(); seg.position.set(x, TOP, zz); seg.rotation.y = -am + Math.PI / 2; g.add(seg);
        const r1 = box(len, 0.12, 0.2, railM, 0, 1.0, 0); r1.userData.noCollide = true; seg.add(r1);
        const r2 = box(len, 0.45, 0.28, wallM, 0, 0.22, 0); r2.userData.noCollide = true; seg.add(r2);
        const po = box(0.28, 1.15, 0.28, railM, len / 2, 0.57, 0); po.userData.noCollide = true; seg.add(po);
        const w = box(1.1, 3.5, 1.1, wallM, x, TOP + 1.75, zz); w.visible = false; g.add(w); }
    }
    // CHÁNH ĐIỆN trên đỉnh núi (thờ Quan Âm), sân rộng phía trước
    const h = hall({ w: 16, d: 8, h: 4.6, tiers: 2 }); const hd = h.userData.mainHall ? h.userData.mainHall.d : 8;
    h.position.set(0, TOP, MZ - 6); g.add(h);
    { const bu = burner(0, zTop - 5.5); bu.position.y = TOP; g.add(bu); }
    [-1, 1].forEach(sx => { const t = tree(4.5, LEAF2(), sx * 12, zTop - 6, 'pine'); t.position.y = TOP; g.add(t); });
    // thông mọc trên sườn núi hai bên bậc
    for (let i = 0; i < 16; i++) { const a = Math.PI / 2 + (i % 2 ? 1 : -1) * (0.45 + (i >> 1) * 0.28), rr = RT + 2 + (i % 3) * 1.6, x = Math.cos(a) * rr, zz = MZ + Math.sin(a) * rr; const yy = TOP * Math.max(0, (RB - rr) / (RB - RT)); const t = tree(3.6, LEAF2(), x, zz, 'pine'); t.position.y = yy * 0.92; g.add(t); }
    // (cổng tam quan dùng cổng của khuôn viên — không dựng thêm cổng riêng)
    g.add(water(760, 11, 0, 19.5)); g.add(boat(-6, 18, 0.3)); lotusPads(g, 20, 60, 6, 0, 19);   // suối Yến kéo dài
    [-176, 176].forEach(x => { const b = mesh(new THREE.CircleGeometry(9, 28), WATER(), x, 0.05, 19.5, false); b.rotation.x = -Math.PI / 2; g.add(b); });   // vũng rộng hai đầu để thuyền quay đầu
    riverBanks(g, 14, 25, 330, 40, 5, { mtOff: 70, farSkip: 60, gapsNear: [[-5, 5]], gapsFar: [[-3.5, 3.5], [10.1, 13.9]] });
    dockKit(g, { x: 12, z0: 27.5, z1: 22.6, booth: [16.5, 29.5, Math.PI] });
    [-14, 14, -20, 20].forEach((x, i) => g.add(tree(4.5, LEAF(), x, 9 + (i % 2) * 2)));
    return { cam: [34, 30, 46], target: [0, 9, -24] };
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
    ground(g, 760, 0x5a8a45); g.add(water(760, 26, 0, 26.5));   // sông Hương kéo dài, đi thuyền rồng tham quan
    riverBanks(g, 13.5, 39.5, 330, 45, 3, { gapsNear: [[6.1, 9.9]] });
    dockKit(g, { x: 8, z0: 11.2, z1: 16.9, booth: [3.2, 9.9, 0] });
    { // cầu sắt nhiều nhịp vòm (gợi cầu Trường Tiền) — thuyền đi qua dưới gầm
      const bm = mat('bridgeSteel', 0xd8dce0, { metalness: 0.5, roughness: 0.4 }), bx = 120, z0 = 11, z1 = 42, n = 6, sp = (z1 - z0) / n;
      g.add(box(7, 0.4, z1 - z0, mat('bridgeDeck', 0x6a6a6a), bx, 6.2, (z0 + z1) / 2));
      for (let i = 0; i < n; i++) { const zc = z0 + sp * (i + 0.5);
        [-3.2, 3.2].forEach(ox => { const arc = mesh(new THREE.TorusGeometry(sp / 2, 0.12, 6, 20, Math.PI), bm, bx + ox, 6.4, zc); arc.rotation.y = Math.PI / 2; g.add(arc); });
        if (i) g.add(cyl(0.7, 0.9, 6.2, 10, STONE(), bx, 3.1, z0 + sp * i)); }
    }
    const tw = tower({ tiers: 7, sides: 8, r: 2.6, th: 2.2, taper: 0.42, wall: mat('tmwall', 0xd9b89a), roofColor: 0x5a4a3a }); tw.position.set(0, 1.6, 2); g.add(tw);
    // chánh điện sau tháp: lùi đủ xa để cửa điện không bị tháp chắn; đồi kéo dài đỡ trọn điện
    const h = hall({ w: 9, d: 5, h: 3, tiers: 2 }); const hd = h.userData.mainHall ? h.userData.mainHall.d : 5, hz = -1.9 - (hd / 2 + 2.9) - 6;   // lùi điện xa tháp Phước Duyên
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
    g.add(box(60, 1, 38, mat('cliff', 0x8a8a7a), -6, 0.5, -3));
    const s = standingGuanyin(24); s.position.set(0, 1, 8); s.rotation.y = 0; g.add(s);
    const h = hall({ w: 12, d: 7, h: 3.6, tiers: 2, wall: YWALL(), roofColor: 0x2f5a7a }); h.position.set(-20, 1, -8); g.add(h);
    [10, 16, 20, 14].forEach((x, i) => g.add(tree(5, LEAF(), x, -4 - (i % 2) * 6)));   // cây ngoài chánh điện (điện rộng tới x≈-21)
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
    const h = hall({ w: 16, d: 9, h: 4, tiers: 2, roofColor: 0x5a2a1a }); h.position.set(-6, 0, -7); g.add(h);
    const tw = tower({ tiers: 7, sides: 4, r: 2.2, th: 2, taper: 0.4, wall: mat('vnwall', 0xe8e0d0), roofColor: 0x3a3a3a }); tw.position.set(17, 0, -2); g.add(tw);
    g.add(burner(-6, 14));
    [-24, -20, 22].forEach(x => g.add(tree(5, LEAF(), x, 12)));
    return { cam: [24, 13, 30], target: [2, 6, 0] };
  },
  giaclam(g) {
    ground(g, 140, 0x5f8a45); courtyard(g, 30, 12, 8);
    const h = hall({ w: 13, d: 8, h: 3.2, tiers: 1, roofColor: 0x5a3a2a }); h.position.set(-6, 0, -6); g.add(h);
    const tw = tower({ tiers: 7, sides: 6, r: 2, th: 2, taper: 0.45, wall: mat('glwall', 0xeadbbf), roofColor: 0x4a3a2a }); tw.position.set(14, 0, 4); g.add(tw);
    const bodhi = tree(10, mat('bodhi', 0x3a7a32, { flatShading: true }), -22, 12); g.add(bodhi);
    g.add(burner(-6, 14));
    return { cam: [20, 12, 28], target: [0, 5, 0] };
  },
  khmer(g) {
    ground(g, 140, 0x5f8a45); courtyard(g, 24, 12, 8);
    const hg = new THREE.Group(); g.add(hg);
    const KW = INTERIOR ? 18.4 : 13, KD = INTERIOR ? 10.6 : 7.5, zc = INTERIOR ? -3.2 : -2, fe = zc + (KD + 2.5) / 2;   // chánh điện Khmer: diện tích gấp đôi
    const kb = mat('kbase', 0xe8d8a8), km = mat('kwall', 0xf0d080);
    hg.add(box(KW + 3, 2, KD + 2.5, kb, 0, 1, zc));
    if (INTERIOR) {
      hg.add(box(KW, 3.8, 0.3, km, 0, 3.9, zc - KD / 2 + 0.15)); [-1, 1].forEach(sx => hg.add(box(0.3, 3.8, KD, km, sx * (KW / 2 - 0.15), 3.9, zc)));
      const sub = new THREE.Group(); sub.position.set(0, 0, zc); hg.add(sub); sub.add(woodFloor(KW - 0.6, KD - 0.3, 0, 2.03, 0));
      const az = altarFigures(sub, KW, KD, 2, 'nam', 3.8);
      const cushions = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) { const x = (c - 3) * 1.6, z = az + 4.0 + r * 1.35; const cu = box(0.75, 0.1, 0.75, mat('cush', 0xa3231a), x, 2.11, z); cu.userData.cushion = true; sub.add(cu); cushions.push(new THREE.Vector3(x, 2.16, z)); }
      const front = [];
      // tường trước có cửa chính & hai cửa sổ — ẩn khi đứng trong điện
      const fz = KD / 2 - 0.15, cw = 2.6, dh = 3.0;
      [[-KW / 2 + 0.15, -cw], [cw, KW / 2 - 0.15]].forEach(([x0, x1]) => { const b = box(x1 - x0, 3.8, 0.3, km, (x0 + x1) / 2, 3.9, fz); b.userData.camSkip = true; sub.add(b); front.push(b); });
      { const b = box(cw * 2, 3.8 - dh, 0.3, km, 0, 2 + dh + (3.8 - dh) / 2, fz); b.userData.camSkip = true; sub.add(b); front.push(b); }
      [-1, 1].forEach(sx => { const lf = doorLeaf(cw - 0.1, dh - 0.05); lf.position.set(sx * (cw - 0.1), 2, fz - 0.2 - (cw - 0.1) / 2); lf.rotation.y = Math.PI / 2; sub.add(lf); front.push(lf); });
      sub.userData.mainHall = { w: KW, d: KD, base: 2, altar: new THREE.Vector3(0, 2, az + 1.2), cushions, front }; HALLS.push(sub);
      for (let i = 0; i < 7; i++) hg.add(box(5.2, 0.3 * (i + 1), 0.45, kb, 0, 0.15 * (i + 1), fe + 2.4 - i * 0.45));
      if (STYLE && STYLE.guard) [-1, 1].forEach(sx => { const gd = guardian(STYLE.guard, sx); gd.position.set(sx * 2.9, 0, fe + 2.9); hg.add(gd); });
    } else hg.add(box(KW, 3.6, KD, km, 0, 3.8, zc));
    [-KW / 2, -KW * 0.2, KW * 0.2, KW / 2].forEach(x => hg.add(cyl(0.24, 0.26, 3.8, 10, mat('kcol', 0xf6e7b0), x, 3.9, fe - 0.6)));
    const gable = (w, h, d, y, z, color) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(0, h); sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2); const m = mesh(geo, mat('kr' + color, color), 0, y, z); m.rotation.y = Math.PI / 2; hg.add(m);
      [-1, 1].forEach(s => { const n = mesh(new THREE.ConeGeometry(0.25, 1.6, 6), GOLD(), 0, y + 0.3, z + s * d / 2); n.rotation.x = s * 0.9; hg.add(n); }); return m; };
    gable(KD + 2.2, 4.4, KW + 2.4, 5.8, zc, 0xc8501a); gable(KD, 3.8, KW - 1.6, 7.9, zc, 0xd8661f); gable(KD - 2.4, 3.2, KW - 5.6, 9.8, zc, 0xc8501a);
    hg.add(cyl(0.05, 0.3, 2.4, 8, GOLD(), 0, 13.6, zc));
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
  NO_GROUND = true; INTERIOR = opts.interior ? { set: opts.set || 'hoanh', altar: opts.altar, bg: opts.bg } : null; STYLE = opts.style ? STYLES[opts.style] || null : null; HALLS.length = 0; ANIM.length = 0; BOARDS.length = 0;
  try { return (SCENES[model] || SCENES.hall)(g); } finally { NO_GROUND = false; INTERIOR = null; STYLE = null; }
}
export function interiorHall(opts, set, altar, bg, style) { INTERIOR = { set, altar, bg }; STYLE = style ? STYLES[style] || null : null; try { return hall(opts); } finally { INTERIOR = null; STYLE = null; } }
export { stonePlane, STONE_TILE, uvMeters, guardian, STYLES, THREE, mat, mesh, box, cyl, roof, hall, tower, stairs, lotusBase, seatedBuddha, standingGuanyin, maitreya, tree, mountain, water, lotusPads, clouds, burner,
  RED, DRED, WALL, YWALL, ROOF, STONE, GOLD, WHITE, BRONZE, WOOD, LEAF, LEAF2, GRASS, DARK, WATER };
