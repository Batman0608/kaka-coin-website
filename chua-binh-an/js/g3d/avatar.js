/* =========================================================================
 *  NHÂN VẬT CHIBI 3D (bản chi tiết): đầu to hơi dẹt, mắt to có mi & đốm sáng,
 *  tóc có mái lọn + vệt bóng, áo tràng cổ giao lĩnh dài tới bắp chân, tay áo loe
 *  có lót, bàn tay chắp rõ ngón cái, tràng hạt ôm sát ngực, thắt lưng nơ vàng,
 *  quần ống rộng, dép quai. Tô kiểu hoạt hình (toon) + viền nét (tùy chọn).
 *  Khớp: hông → đùi → gối → bàn chân; vai → khuỷu → bàn tay; thân trên gập để lạy.
 *  Tư thế: idle (chắp tay) · walk · kneel · bow · lotus (thiền) · incense · carry
 * ========================================================================= */
import { THREE } from '../temple3d.js';
/* điện thoại: giảm số đoạn của hình cầu/trụ/vòng trên nhân vật (màn hình nhỏ nhìn gần như không khác, nhẹ hơn ~2,5 lần) */
const SEGK = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 0.55 : 1;
const sg = (n) => Math.max(5, Math.round(n * SEGK));
let _auraTex = null;
function auraTex() {
  if (_auraTex) return _auraTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, 'rgba(255,230,150,0.6)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _auraTex = new THREE.CanvasTexture(c); _auraTex.colorSpace = THREE.SRGBColorSpace; return _auraTex;
}

const _kasayaTex = {};
function kasayaTex(kind = 'su') {   // cà sa: ô ruộng (điền y) đỏ tươi, đường ghép vàng kim · 'tru' (trụ trì) đỏ thẫm, viền vàng đậm hơn
  if (_kasayaTex[kind]) return _kasayaTex[kind];
  const C = kind === 'tru' ? ['#a3121a', 'rgba(196,30,36,.6)', 'rgba(120,8,14,.45)', '#f5c84a', 3] : ['#d0261e', 'rgba(232,58,40,.6)', 'rgba(170,22,18,.4)', '#f2c14e', 2];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = C[0]; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? C[1] : C[2]; g.fillRect(i * 25.6 + 2, j * 32 + 2, 21.6, 28); }
  g.strokeStyle = C[3]; g.lineWidth = C[4]; for (let x = 0; x <= 128; x += 25.6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  for (let y = 0; y <= 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return (_kasayaTex[kind] = t);
}

// ---- vân vải dệt (xám, nhân với màu áo) ----
let _fab = null;
function fabricTex() {
  if (_fab) return _fab;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) { g.fillStyle = `rgba(0,0,0,${0.035 + (y % 4 ? 0.02 : 0)})`; g.fillRect(0, y, 128, 1); }
  for (let x = 0; x < 128; x += 2) { g.fillStyle = 'rgba(0,0,0,0.03)'; g.fillRect(x, 0, 1, 128); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 1); }
  _fab = new THREE.CanvasTexture(c); _fab.colorSpace = THREE.SRGBColorSpace; _fab.wrapS = _fab.wrapT = THREE.RepeatWrapping; _fab.repeat.set(6, 3); return _fab;
}
// ---- áo tràng thêu hoa văn (bán trong cửa hàng): màu nền + hoạ tiết thêu chỉ ----
const PATTERNS = {
  sen:   { c: 0xf1d7dd, m: '#d9608a', m2: '#6aa060', motif: 'sen',  n: 'Áo tràng lụa thêu sen hồng' },
  may:   { c: 0x5b77c4, m: '#e8eefc', m2: '#a8b8e8', motif: 'may',  n: 'Áo tràng lam thêu mây trắng' },
  truc:  { c: 0x8c5a34, m: '#d8c27a', m2: '#a8924a', motif: 'truc', n: 'Áo nâu thêu trúc vàng' },
  mai:   { c: 0x2f8a78, m: '#fff1a8', m2: '#f4b030', motif: 'mai',  n: 'Áo ngọc thêu hoa mai' },
  cuc:   { c: 0x6a3f8e, m: '#f5d36a', m2: '#e89a30', motif: 'cuc',  n: 'Áo tím Huế thêu hoa cúc' },
  gam:   { c: 0x9c1c18, m: '#f2c14e', m2: '#c8902a', motif: 'gam',  n: 'Áo gấm đỏ hoa văn chữ Vạn' },
  bachlien: { c: 0xf6f4ee, m: '#e7c25a', m2: '#9ac0d8', motif: 'sen', n: 'Áo trắng bạch liên viền vàng' },
  rong:  { c: 0xe8b22e, m: '#fff3c0', m2: '#b27812', motif: 'rong', n: 'Áo gấm vàng kim thêu rồng mây' },
};
const _pat = {};
function patternTex(id) {
  if (_pat[id]) return _pat[id]; const P = PATTERNS[id];
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#' + P.c.toString(16).padStart(6, '0'); g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + (y % 4 ? 0.02 : 0)})`; g.fillRect(0, y, 256, 1); }   // vân dệt
  const at = (x, y, f) => { for (const dx of [0, 256, -256]) for (const dy of [0, 256, -256]) { g.save(); g.translate(x + dx, y + dy); f(); g.restore(); } };   // vẽ lặp liền mép
  g.lineCap = 'round'; g.lineJoin = 'round';
  const spots = [[64, 64], [192, 64], [0, 128], [128, 128], [64, 192], [192, 192], [0, 0], [128, 0]];
  spots.forEach(([x, y], i) => at(x, y, () => { g.rotate((i % 3 - 1) * 0.3);
    if (P.motif === 'sen') { g.fillStyle = P.m2; g.beginPath(); g.ellipse(0, 10, 16, 5, 0, 0, 7); g.fill(); g.fillStyle = P.m; for (let k = -2; k <= 2; k++) { g.save(); g.rotate(k * 0.42); g.beginPath(); g.ellipse(0, -6, 5, 12, 0, 0, 7); g.fill(); g.restore(); } }
    else if (P.motif === 'may') { g.strokeStyle = P.m; g.lineWidth = 3; g.beginPath(); g.arc(-8, 0, 7, Math.PI, 0); g.arc(5, 0, 9, Math.PI, 0); g.arc(17, 2, 5, Math.PI, 0.3); g.stroke(); g.strokeStyle = P.m2; g.lineWidth = 2; g.beginPath(); g.arc(-8, 0, 3, Math.PI, 0); g.arc(5, 0, 4, Math.PI, 0); g.stroke(); }
    else if (P.motif === 'truc') { g.strokeStyle = P.m; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 22); g.lineTo(0, -22); g.stroke(); g.strokeStyle = P.m2; [-8, 8].forEach(y2 => { g.beginPath(); g.moveTo(-3, y2); g.lineTo(3, y2); g.stroke(); });
      g.fillStyle = P.m; [[-1, -14], [1, -2], [-1, 10]].forEach(([s2, y2]) => { g.save(); g.translate(0, y2); g.rotate(s2 * 0.9); g.beginPath(); g.ellipse(9, 0, 9, 2.5, 0, 0, 7); g.fill(); g.restore(); }); }
    else if (P.motif === 'mai' || P.motif === 'cuc') { const np = P.motif === 'mai' ? 5 : 12, r = P.motif === 'mai' ? 6 : 8; g.fillStyle = P.m; for (let k = 0; k < np; k++) { g.save(); g.rotate(k / np * Math.PI * 2); g.beginPath(); g.ellipse(0, -r, P.motif === 'mai' ? 5 : 2.5, r * 0.75, 0, 0, 7); g.fill(); g.restore(); } g.fillStyle = P.m2; g.beginPath(); g.arc(0, 0, 3.5, 0, 7); g.fill(); }
    else if (P.motif === 'gam') { g.strokeStyle = P.m; g.lineWidth = 3; g.strokeRect(-14, -14, 28, 28); g.beginPath(); g.moveTo(0, -10); g.lineTo(0, 10); g.moveTo(-10, 0); g.lineTo(10, 0); g.moveTo(0, -10); g.lineTo(6, -10); g.moveTo(10, 0); g.lineTo(10, 6); g.moveTo(0, 10); g.lineTo(-6, 10); g.moveTo(-10, 0); g.lineTo(-10, -6); g.stroke(); }   // chữ Vạn trong khung
    else if (P.motif === 'rong') { g.strokeStyle = P.m; g.lineWidth = 3.5; g.beginPath(); for (let k = 0; k <= 24; k++) { const x2 = -24 + k * 2, y2 = Math.sin(k * 0.6) * 7; k ? g.lineTo(x2, y2) : g.moveTo(x2, y2); } g.stroke(); g.fillStyle = P.m2; g.beginPath(); g.arc(24, Math.sin(14.4) * 7, 4.5, 0, 7); g.fill(); g.strokeStyle = P.m2; g.lineWidth = 2; g.beginPath(); g.arc(-6, 12, 6, Math.PI, 0); g.stroke(); }
  }));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.5); t.anisotropy = 4; return (_pat[id] = t);
}
// ---- vân sợi tóc: các sợi chạy từ đỉnh đầu xuống, có dải bóng ----
let _hairT = null;
function hairTex() {
  if (_hairT) return _hairT;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 90; i++) { const x = Math.random() * 256, w = 1 + Math.random() * 2.5; g.fillStyle = `rgba(0,0,0,${0.12 + Math.random() * 0.2})`; g.fillRect(x, 0, w, 128); }
  for (let i = 0; i < 40; i++) { const x = Math.random() * 256; g.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.25})`; g.fillRect(x, 24 + Math.random() * 10, 1.5, 22 + Math.random() * 16); }
  _hairT = new THREE.CanvasTexture(c); _hairT.colorSpace = THREE.SRGBColorSpace; _hairT.wrapS = THREE.RepeatWrapping; _hairT.repeat.set(3, 1); return _hairT;
}
// ---- mặt anime vẽ tay: mắt nhiều lớp, mi cong, mày, mũi, miệng, má hồng ----
const _faces = new Map();
const IRIS = [['#3a1a0c', '#b0703a'], ['#2a1a10', '#8a5a34'], ['#2b1408', '#c2803c'], ['#1c1210', '#5e3a22']];
function faceTex(nu, bald, seed = 1) {
  const key = (nu ? 'n' : 'm') + (bald ? 'b' : '') + (seed % 4);
  if (_faces.has(key)) return _faces.get(key);
  const W = 1024, H = 711, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const P = (yaw, pitch) => [(yaw + 0.9) / 1.8 * W, (Math.PI / 2 + pitch - 1.0) / 1.25 * H];
  const [ic0, ic1] = IRIS[seed % 4];
  // má hồng + nét gạch chéo
  [-1, 1].forEach(sx => { const [x, y] = P(sx * 0.6, 0.3); const gr = g.createRadialGradient(x, y, 4, x, y, 78); gr.addColorStop(0, 'rgba(255,120,120,.55)'); gr.addColorStop(1, 'rgba(255,120,120,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 82, 50, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(230,90,90,.55)'; g.lineWidth = 4; g.lineCap = 'round'; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 22 - 8, y + 10); g.lineTo(x + k * 22 + 8, y - 10); g.stroke(); } });
  [-1, 1].forEach(sx => {
    const [x, y] = P(sx * 0.37, 0.09), rx = 104, ry = 134;
    // lòng trắng
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y + 4, rx * 1.02, ry * 0.98, 0, 0, 7); g.fill();
    // mống mắt: chuyển màu đậm trên → sáng dưới, viền sẫm
    g.save(); g.beginPath(); g.ellipse(x, y + 4, rx * 1.02, ry * 0.98, 0, 0, 7); g.clip();
    const gi = g.createLinearGradient(0, y - ry, 0, y + ry); gi.addColorStop(0, ic0); gi.addColorStop(0.55, ic0); gi.addColorStop(1, ic1);
    g.fillStyle = gi; g.beginPath(); g.ellipse(x, y + 14, rx * 0.86, ry * 0.92, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(20,8,4,.85)'; g.lineWidth = 7; g.stroke();
    g.fillStyle = '#120806'; g.beginPath(); g.ellipse(x, y + 8, rx * 0.4, ry * 0.5, 0, 0, 7); g.fill();          // con ngươi
    g.fillStyle = 'rgba(255,220,170,.45)'; g.beginPath(); g.ellipse(x, y + ry * 0.62, rx * 0.55, ry * 0.18, 0, 0, 7); g.fill();   // ánh phản chiếu dưới
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - rx * 1.1, y - ry, rx * 2.2, ry * 0.32);                        // bóng mí trên
    g.restore();
    // đốm sáng
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x - sx * rx * 0.32, y - ry * 0.32, 26, 32, -0.3, 0, 7); g.fill();
    g.beginPath(); g.arc(x + sx * rx * 0.34, y + ry * 0.4, 12, 0, 7); g.fill();
    g.beginPath(); g.arc(x - sx * rx * 0.05, y + ry * 0.12, 6, 0, 7); g.fill();
    // mi trên dày, cong ra đuôi mắt; nữ có thêm 2 sợi mi vểnh
    g.strokeStyle = '#1a0c06'; g.lineCap = 'round'; g.lineWidth = nu ? 20 : 15;
    g.beginPath(); g.moveTo(x - sx * rx * 1.08, y - ry * 0.32); g.quadraticCurveTo(x, y - ry * 1.22, x + sx * rx * 1.12, y - ry * 0.5); g.stroke();
    if (nu) { g.lineWidth = 9; [[1.12, -0.5, 1.42, -0.78], [1.0, -0.72, 1.24, -1.02]].forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(x + sx * rx * a, y + ry * b); g.lineTo(x + sx * rx * c2, y + ry * d); g.stroke(); }); }
    g.lineWidth = 5; g.strokeStyle = 'rgba(80,40,25,.7)'; g.beginPath(); g.moveTo(x - sx * rx * 0.7, y - ry * 1.18); g.quadraticCurveTo(x, y - ry * 1.42, x + sx * rx * 0.9, y - ry * 1.02); g.stroke();   // nếp mí
    g.lineWidth = 5; g.strokeStyle = 'rgba(60,25,15,.75)'; g.beginPath(); g.moveTo(x - sx * rx * 0.5, y + ry * 1.02); g.quadraticCurveTo(x, y + ry * 1.1, x + sx * rx * 0.6, y + ry * 0.96); g.stroke();   // mi dưới
    // lông mày
    const [bx, by] = P(sx * 0.36, -0.3); g.strokeStyle = bald ? 'rgba(110,70,48,.85)' : 'rgba(40,22,14,.9)'; g.lineWidth = nu ? 9 : 13;
    g.beginPath(); g.moveTo(bx - sx * 60, by + 10); g.quadraticCurveTo(bx, by - 14, bx + sx * 66, by + 4); g.stroke();
  });
  // mũi: chấm bóng nhỏ
  { const [x, y] = P(0, 0.27); g.fillStyle = 'rgba(190,110,80,.55)'; g.beginPath(); g.ellipse(x + 4, y + 6, 9, 6, 0, 0, 7); g.fill(); }
  // miệng: cười hé, lưỡi hồng
  { const [x, y] = P(0, 0.42); g.fillStyle = '#8e2a20'; g.beginPath(); g.moveTo(x - 52, y - 10); g.quadraticCurveTo(x, y + 62, x + 52, y - 10); g.quadraticCurveTo(x, y + 8, x - 52, y - 10); g.fill();
    g.fillStyle = '#f07a74'; g.beginPath(); g.ellipse(x, y + 26, 24, 12, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(90,30,20,.8)'; g.lineWidth = 5; g.lineCap = 'round'; [-1, 1].forEach(s2 => { g.beginPath(); g.moveTo(x + s2 * 50, y - 10); g.lineTo(x + s2 * 60, y - 18); g.stroke(); }); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; _faces.set(key, t); return t;
}

const MALAS = { go: [0x8a5328, 0xa86a38], bode: [0xc9a46a, 0xe6c98e], tram: [0x3a2416, 0x5a3a22], ngoc: [0x3f8f6a, 0x7fd0a8], mana: [0xa8322a, 0xe0705a] };
const ROBES = { ...Object.fromEntries(Object.entries(PATTERNS).map(([k, v]) => [k, v.c])), hong: 0xd77a96, ngoc: 0x3f9a88, tim: 0x7a4f9e, reu: 0x5f7a3a, dat: 0xa8643a, kim: 0xd8a93a, lam: 0x4f6fc4, nau: 0x8c5530, xam: 0x767c8c, trang: 0xeeeef4, vang: 0xf0b93a, tang: 0xd9822b, hau: 0xe9a83a };
const SKINS = [0xf6d2b0, 0xeec09a, 0xf9dcc0, 0xdcaa80];
const HAIRC = [0x241915, 0x33221a, 0x43291b];
const grad = (() => { const d = new Uint8Array([84, 168, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const _mats = new Map();   // dùng chung vật liệu giữa các nhân vật (ít lần đổi trạng thái khi vẽ)
const T = (c, o = {}) => {
  const k = new THREE.Color(c).getHexString() + JSON.stringify(o, (key, v) => (v && v.isTexture ? v.uuid : v));
  let m = _mats.get(k); if (!m) { m = new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: grad }, o)); _mats.set(k, m); } return m;
};
const WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff });
const part = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const put = (parent, m) => { parent.add(m); return m; };   // thêm chi tiết và trả về chính chi tiết đó
const pivot = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
const V2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));
const lathe = (pts, m, seg = 28) => part(new THREE.LatheGeometry(V2(pts), seg), m);
const lite = (c, k) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k);
const dim = (c, k) => new THREE.Color(c).multiplyScalar(k);
const noLine = (o) => { o.userData.noLine = true; return o; };

// ---- gộp các chi tiết tĩnh cùng vật liệu dưới mỗi khớp thành 1 khối → ít lệnh vẽ (đoàn rước đông người vẫn mượt) ----
/* gộp mảnh: mọi mảnh cứng gắn vào cùng một khớp cử động (hông, thân, đầu, đùi, gối, vai, khuỷu…) và cùng chất liệu
   được ghép thành MỘT khối → mỗi nhân vật chỉ còn ~20 lệnh vẽ thay vì ~60 (điện thoại mượt hơn nhiều) */
const _vc = {};
const vcMat = (side) => _vc[side] || (_vc[side] = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: grad, side }));
function mergeLeaves(root, anchors) {
  const A = new Set([root, ...anchors.filter(Boolean)]);
  root.updateMatrixWorld(true);
  const groups = new Map(), inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), v = new THREE.Vector3(), nm = new THREE.Matrix3();
  root.traverse(c => {
    if (!c.isMesh || c.userData.keep || c.isSkinnedMesh) return;
    let a = c.parent; while (a && !A.has(a)) a = a.parent; if (!a) return;
    const m = c.material, flat = m.isMeshToonMaterial && !m.map && !m.transparent;   // mảnh màu trơn: gộp chung, tô màu theo đỉnh
    const k = a.uuid + (flat ? 'flat' + m.side : m.uuid) + (c.userData.noLine ? '!' : '') + (c.castShadow ? 's' : '');
    (groups.get(k) || groups.set(k, { a, list: [] }).get(k)).list.push(c);
  });
  groups.forEach(({ a, list }) => {
    if (list.length < 2 && list[0].parent === a) return;
    inv.copy(a.matrixWorld).invert();
    const pos = [], nor = [], uv = [], idx = [], col = []; let off = 0;
    const flat = list[0].material.isMeshToonMaterial && !list[0].material.map && !list[0].material.transparent && list.some(c => c.material !== list[0].material);
    list.forEach(c => {
      rel.multiplyMatrices(inv, c.matrixWorld); nm.getNormalMatrix(rel);
      const g = c.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, cc = c.material.color;
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(rel); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); if (flat) col.push(cc.r, cc.g, cc.b); }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < P.count; i++) idx.push(i + off);
      off += P.count; c.parent.remove(c); g.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    if (flat) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mm = new THREE.Mesh(geo, flat ? vcMat(list[0].material.side) : list[0].material); mm.castShadow = list[0].castShadow; mm.userData.noLine = !!list[0].userData.noLine; a.add(mm);
  });
}

// ---- viền nét hoạt hình: vỏ mặt sau đẩy theo pháp tuyến (dùng chung 1 vật liệu) ----
let _lineMat = null;
function lineMat() {
  if (_lineMat) return _lineMat;
  _lineMat = new THREE.MeshBasicMaterial({ color: 0x3a2418, side: THREE.BackSide });
  _lineMat.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normal * 0.0065;'); };
  _lineMat.customProgramCacheKey = () => 'chibi-line';
  return _lineMat;
}
function addOutline(root) {
  const list = []; root.traverse(o => { if (o.isMesh && !o.userData.noLine && !o.userData.isLine && !o.material.transparent && o.material.type !== 'MeshBasicMaterial') list.push(o); });
  list.forEach(o => { const l = new THREE.Mesh(o.geometry, lineMat()); l.userData.isLine = true; l.raycast = () => {}; o.add(l); });
}

// bán kính thân áo theo độ cao (để tràng hạt & cổ áo ôm sát thân)
const TORSO = [[0.255, 0], [0.25, 0.12], [0.228, 0.25], [0.172, 0.35], [0.09, 0.4], [0.001, 0.41]];
const torsoR = (y) => { for (let i = 1; i < TORSO.length; i++) { const [r0, y0] = TORSO[i - 1], [r1, y1] = TORSO[i]; if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0.001; };

const POSES = {
  idle:    { hipY: 0.5, torso: 0, head: 0, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -0.25, lElbow: -1.45, rArm: -0.25, rElbow: -1.45, armIn: 0.8, legOut: 0, skirt: 1 },
  kneel:   { hipY: 0.24, torso: 0.04, head: 0, lThigh: -1.45, lKnee: 1.5, rThigh: -1.45, rKnee: 1.5, lArm: -0.25, lElbow: -1.45, rArm: -0.25, rElbow: -1.45, armIn: 0.8, legOut: 0, skirt: 0.62 },
  bow:     { hipY: 0.24, torso: 1.15, head: 0.25, lThigh: -1.45, lKnee: 1.5, rThigh: -1.45, rKnee: 1.5, lArm: -1.5, lElbow: -0.2, rArm: -1.5, rElbow: -0.2, armIn: 0.15, legOut: 0, skirt: 0.62 },
  lotus:   { hipY: 0.18, torso: 0, head: 0.05, lThigh: -1.5, lKnee: 2.3, rThigh: -1.5, rKnee: 2.3, lArm: -0.15, lElbow: -1.0, rArm: -0.15, rElbow: -1.0, armIn: 0.5, legOut: 0.9, skirt: 0.5 },
  incense: { hipY: 0.5, torso: 0, head: -0.12, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -1.15, lElbow: -1.2, rArm: -1.15, rElbow: -1.2, armIn: 0.7, legOut: 0, skirt: 1 },
  carry:   { hipY: 0.5, torso: 0, head: 0.1, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -1.0, lElbow: -0.75, rArm: -1.0, rElbow: -0.75, armIn: 0.6, legOut: 0, skirt: 1 },
  standBow:{ hipY: 0.5, torso: 0.55, head: 0.2, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -0.5, lElbow: -1.4, rArm: -0.5, rElbow: -1.4, armIn: 0.8, legOut: 0, skirt: 1 }
};

export class Avatar {
  constructor({ look = {}, seed = 1, monk = false, kasaya = false, outline = Avatar.outline } = {}) {
    this.look = Object.assign({ g: 'nu', hair: 'bui', robe: 'lam', mala: 'go', rose: '' }, look);
    this.root = new THREE.Group(); this.root.userData.avatar = this;
    this.pose = Object.assign({}, POSES.idle); this.target = 'idle'; this.walkT = 0; this.speed = 0; this.bowT = -1; this.monk = monk || kasaya; this.kasaya = kasaya;
    this.seed = seed; this.skin = SKINS[seed % 4]; this.hairC = HAIRC[(seed >>> 2) % 3]; this.outline = outline;
    this.build();
  }
  build() {
    const r = this.root; while (r.children.length) r.remove(r.children[0]);
    this.aura = null;
    const L = this.look, nu = L.g === 'nu', sk = T(this.skin), robeC = this.monk ? 0xf7c51e : ROBES[L.robe] || ROBES.lam;   // sư: áo hậu vàng tươi
    const pat = !this.monk && PATTERNS[L.robe], robe = pat ? T(0xffffff, { map: patternTex(L.robe) }) : T(robeC, { map: fabricTex() }), robeD = T(dim(robeC, 0.62)), robeDD = T(dim(robeC, 0.5)), robeL = T(lite(robeC, 0.45)), hairM = T(this.hairC, { map: hairTex() });
    const lightRobe = new THREE.Color(robeC).getHSL({}).l > 0.6;   // áo sáng màu → quần sẫm, áo sẫm → quần kem cho tách bạch
    const pants = T(this.kasaya || this.monk ? dim(robeC, 0.78) : lightRobe ? 0x3b3742 : 0xe9dfcb), sash = T(0xf2c14e), sashD = T(0xd49a2a), wood = T((MALAS[L.mala] || MALAS.go)[0]), woodL = T((MALAS[L.mala] || MALAS.go)[1]), sole = T(0x5a3418), strap = T(0x7a4a26);
    const white = WHITE, inner = T(0xf7f1e6), skD = T(dim(this.skin, 0.9));
    this.hips = pivot(0, 0.5, 0); r.add(this.hips);

    // ---- vạt áo tràng dài tới bắp chân, loe nhẹ, viền gấu đậm, đường xẻ vạt trước ----
    this.skirt = lathe([[0.001, -0.3], [0.33, -0.3], [0.322, -0.22], [0.292, -0.1], [0.262, -0.02], [0.255, 0.02], [0.001, 0.02]], robe, 32); this.hips.add(this.skirt);
    put(this.skirt, part(new THREE.CylinderGeometry(0.334, 0.336, 0.05, sg(36), 1, true), robeD, 0, -0.272, 0));   // nẹp gấu áo sẫm màu
    put(this.skirt, part(new THREE.TorusGeometry(0.334, 0.014, sg(6), sg(36)), robeDD, 0, -0.297, 0)).rotation.x = Math.PI / 2;
    { const seam = part(new THREE.BoxGeometry(0.014, 0.27, 0.01), robeD, 0.085, -0.16, 0.278); noLine(seam); seam.rotation.set(-0.2, 0.3, 0); this.skirt.add(seam); }   // mép vạt chéo
    for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * Math.PI * 2; if (Math.abs(Math.atan2(Math.cos(a), Math.sin(a)) - 0.29) < 0.3) continue;   // nếp xếp quanh vạt áo (chừa mép vạt trước)
      const f = part(new THREE.BoxGeometry(0.014, 0.22, 0.012), robeDD, Math.cos(a) * 0.3, -0.155, Math.sin(a) * 0.3); f.rotation.order = 'YXZ'; f.rotation.y = Math.PI / 2 - a; f.rotation.x = -0.27; noLine(f); this.skirt.add(f); }

    // ---- chân: quần ống rộng, gấu viền, bàn chân, dép quai ----
    const leg = (sx) => {
      const thigh = pivot(sx * 0.095, -0.06, 0); this.hips.add(thigh);
      thigh.add(part(new THREE.CylinderGeometry(0.085, 0.09, 0.17, sg(12)), pants, 0, -0.08, 0));
      const knee = pivot(0, -0.16, 0); thigh.add(knee);
      knee.add(part(new THREE.CylinderGeometry(0.088, 0.108, 0.16, sg(14)), pants, 0, -0.08, 0));
      put(knee, part(new THREE.TorusGeometry(0.103, 0.013, sg(6), sg(18)), robeD, 0, -0.16, 0)).rotation.x = Math.PI / 2;   // gấu quần
      put(knee, part(new THREE.SphereGeometry(0.052, sg(12), sg(9)), sk, 0, -0.196, 0.035)).scale.set(0.92, 0.58, 1.55);     // bàn chân
      knee.add(part(new THREE.BoxGeometry(0.112, 0.026, 0.2), sole, 0, -0.232, 0.035));                            // đế dép
      put(knee, part(new THREE.TorusGeometry(0.046, 0.011, sg(5), sg(12), Math.PI), strap, 0, -0.214, 0.075));              // quai ngang
      put(knee, part(new THREE.CylinderGeometry(0.008, 0.008, 0.06, sg(5)), strap, 0, -0.205, 0.105)).rotation.x = 1.1; // quai xỏ ngón
      return { thigh, knee };
    };
    this.lLeg = leg(-1); this.rLeg = leg(1);

    // ---- thân trên: áo tràng, cổ giao lĩnh (vạt phải đè trái) lộ áo trong màu kem ----
    this.torso = pivot(0, 0, 0); this.hips.add(this.torso);
    this.torso.add(lathe(TORSO, robe, 32));
    { const ins = part(new THREE.ConeGeometry(0.06, 0.13, 3), inner, 0, 0.335, torsoR(0.335) - 0.03); ins.rotation.x = Math.PI; ins.scale.z = 0.4; noLine(ins); this.torso.add(ins); }  // áo trong lộ ở cổ chữ V
    [[1, -0.48, 0.045], [-1, 0.48, -0.045]].forEach(([sx, rz, x], i) => {   // hai vạt cổ chéo, vạt phải nằm trên
      const y = 0.315, c = part(new THREE.BoxGeometry(0.05, 0.17, 0.022), robeL, x * 0.8, y, torsoR(y) - 0.004 + i * 0.006);
      c.rotation.set(-0.5, 0, rz); this.torso.add(c);
    });
    put(this.torso, part(new THREE.CylinderGeometry(0.094, 0.11, 0.05, sg(20), 1, true), robeD, 0, 0.392, 0));   // cổ áo đứng sẫm màu (nhìn rõ từ sau lưng)
    { const bs = part(new THREE.BoxGeometry(0.03, 0.3, 0.012), robeD, 0, 0.215, -torsoR(0.215) - 0.002); bs.rotation.x = -0.1; noLine(bs); this.torso.add(bs); }   // đường may sống lưng
    [-1, 1].forEach(sx => { const y = 0.34, sh = part(new THREE.BoxGeometry(0.16, 0.022, 0.03), robeD, sx * 0.13, y, 0); sh.rotation.z = -sx * 0.55; noLine(sh); this.torso.add(sh); });   // đường may vai
    // thắt lưng vàng + nơ thắt bên hông, hai dải buông
    put(this.torso, part(new THREE.CylinderGeometry(0.262, 0.262, 0.05, sg(32), 1, true), sash, 0, 0.03, 0));
    put(this.torso, part(new THREE.TorusGeometry(0.262, 0.008, sg(5), sg(32)), sashD, 0, 0.056, 0)).rotation.x = Math.PI / 2;
    put(this.torso, part(new THREE.TorusGeometry(0.262, 0.008, sg(5), sg(32)), sashD, 0, 0.004, 0)).rotation.x = Math.PI / 2;
    { const kx = 0.11, kz = 0.245;
      this.torso.add(part(new THREE.SphereGeometry(0.03, sg(10), sg(8)), sash, kx, 0.03, kz));
      [-1, 1].forEach(s => { const lp = part(new THREE.SphereGeometry(0.04, sg(10), sg(8)), sash, kx + s * 0.045, 0.035, kz - 0.005); lp.scale.set(1.2, 0.7, 0.45); lp.rotation.z = s * 0.35; this.torso.add(lp); });
      [[-0.015, -0.12], [0.03, 0.18]].forEach(([x, rz]) => { const t = part(new THREE.BoxGeometry(0.038, 0.17, 0.014), sash, kx + x, -0.055, kz + 0.012); t.rotation.set(-0.12, 0, rz); this.torso.add(t); });
    }
    // tràng hạt gỗ ôm sát ngực: 27 hạt, hạt mẫu, tua vàng
    const neck = pivot(0, 0, 0); this.torso.add(neck); this.necklace = neck;
    const NB = 27;
    for (let i = 0; i < NB; i++) {
      const a = (i + 0.5) / NB * Math.PI * 2, f = Math.pow(Math.max(0, Math.sin(a)), 1.4), y = 0.378 - f * 0.085, rr = torsoR(y) + 0.02;
      neck.add(noLine(part(new THREE.SphereGeometry(0.021, sg(10), sg(8)), i % 9 === 4 ? woodL : wood, Math.cos(a) * rr, y, Math.sin(a) * rr)));
    }
    { const y = 0.285, z = torsoR(y) + 0.03;
      neck.add(part(new THREE.SphereGeometry(0.032, sg(12), sg(10)), woodL, 0, y, z));
      put(neck, part(new THREE.ConeGeometry(0.018, 0.045, 8), sash, 0, y - 0.04, z + 0.004)).rotation.x = Math.PI; }
    if (L.rose === 'do' || L.rose === 'trang') {   // bông hồng cài áo mùa Vu Lan: đỏ (còn mẹ) · trắng (mẹ đã khuất)
      const rc = L.rose === 'do' ? 0xd0283a : 0xf6f2ec, y = 0.3, z = torsoR(y) + 0.03, rose = pivot(-0.12, y, z - 0.02); this.torso.add(rose);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, pe = part(new THREE.SphereGeometry(0.022, sg(8), sg(6)), T(rc), Math.cos(a) * 0.018, Math.sin(a) * 0.018, 0); pe.scale.set(1, 1, 0.5); rose.add(pe); }
      rose.add(part(new THREE.SphereGeometry(0.02, sg(8), sg(6)), T(dim(rc, 0.8)), 0, 0, 0.008));
      [-1, 1].forEach(sx => { const lf = part(new THREE.SphereGeometry(0.02, sg(6), sg(5)), T(0x3f7a3a), sx * 0.03, -0.03, -0.004); lf.scale.set(1.4, 0.6, 0.4); rose.add(lf); });
    }

    // ---- tay: tay áo loe có lớp lót đậm, bàn tay dạng găng có ngón cái ----
    const sleeve = T(lite(robeC, 0.12), { map: fabricTex() });
    const arm = (sx) => {
      const shoulder = pivot(sx * 0.2, 0.33, 0); this.torso.add(shoulder);
      shoulder.add(part(new THREE.SphereGeometry(0.075, sg(12), sg(10)), sleeve, 0, -0.01, 0));
      shoulder.add(part(new THREE.CylinderGeometry(0.072, 0.092, 0.16, sg(12)), sleeve, 0, -0.08, 0));
      const elbow = pivot(0, -0.16, 0); elbow.rotation.order = 'YXZ'; shoulder.add(elbow);
      elbow.add(part(new THREE.CylinderGeometry(0.088, 0.122, 0.17, sg(16), 1, true), sleeve, 0, -0.085, 0));
      elbow.add(noLine(part(new THREE.CylinderGeometry(0.084, 0.117, 0.168, sg(16), 1, true), T(dim(robeC, 0.55), { side: THREE.BackSide }), 0, -0.085, 0)));   // lót trong tay áo
      put(elbow, noLine(part(new THREE.TorusGeometry(0.12, 0.012, sg(6), sg(20)), robeD, 0, -0.17, 0))).rotation.x = Math.PI / 2;   // viền cổ tay áo
      elbow.add(part(new THREE.CylinderGeometry(0.035, 0.038, 0.06, sg(10)), sk, 0, -0.18, 0));   // cổ tay
      const hand = pivot(0, -0.245, 0); elbow.add(hand);
      put(hand, part(new THREE.SphereGeometry(0.056, sg(12), sg(10)), sk, 0, 0, 0)).scale.set(0.6, 1.2, 1);   // lòng bàn tay
      put(hand, part(new THREE.SphereGeometry(0.019, sg(8), sg(6)), skD, sx * -0.01, 0.012, 0.045)).scale.set(1, 1.6, 1);   // ngón cái
      for (let f = 0; f < 4; f++) { const fg = part(new THREE.CapsuleGeometry(0.0115, 0.034, 3, 6), sk, 0, -0.07, (f - 1.5) * 0.021); fg.rotation.x = (f - 1.5) * 0.08; hand.add(fg); }   // bốn ngón tay
      return { shoulder, elbow, hand };
    };
    this.lArm = arm(-1); this.rArm = arm(1);
    this.incense = new THREE.Group(); this.incense.visible = false;
    [-0.025, 0.025].forEach(x => { this.incense.add(noLine(part(new THREE.CylinderGeometry(0.007, 0.007, 0.3, sg(5)), T(0xb3261e), x, 0.13, 0))); this.incense.add(part(new THREE.SphereGeometry(0.016, sg(6), sg(4)), new THREE.MeshBasicMaterial({ color: 0xffa020 }), x, 0.29, 0)); });
    this.rArm.elbow.add(this.incense); this.incense.position.set(-0.07, -0.21, 0.04);

    // ---- đầu to kiểu chibi (hơi dẹt ngang) ----
    const head = pivot(0, 0.41, 0); this.torso.add(head); this.head = head;
    const hr = nu ? 0.295 : 0.305, hy = hr * 0.9;
    put(head, part(new THREE.SphereGeometry(hr, sg(36), sg(28)), sk, 0, hy, 0)).scale.set(1.05, 0.97, 1);
    const onFace = (yaw, pitch, items) => { const g = pivot(0, hy, 0); g.rotation.set(pitch, yaw, 0, 'YXZ'); items.forEach(o => g.add(noLine(o))); head.add(g); return g; };
    const bald = this.monk || L.hair === 'troc';
    // mặt vẽ tay kiểu anime: một lớp "da mặt" phủ phía trước đầu, vẽ trên canvas 1024 px
    { const PH = 1.8, TH0 = 1.0, TL = 1.25;
      const face = part(new THREE.SphereGeometry(hr * 1.004, sg(40), sg(30), Math.PI / 2 - PH / 2, PH, TH0, TL),
        T(0xffffff, { map: faceTex(nu, bald, this.seed), transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }), 0, hy, 0);
      face.scale.set(1.05, 0.97, 1); face.castShadow = false; face.userData.keep = true; noLine(face); head.add(face); }
    [-1, 1].forEach(sx => {
      const ear = put(head, part(new THREE.SphereGeometry(0.058, sg(12), sg(9)), sk, sx * hr * 1.02, hy - 0.015, 0)); ear.scale.set(0.42, 0.88, 0.68);
      put(head, noLine(part(new THREE.SphereGeometry(0.03, sg(8), sg(6)), skD, sx * hr * 1.035, hy - 0.015, 0.008))).scale.set(0.3, 0.7, 0.55);   // vành tai trong
    });
    onFace(0, 0.25, [part(new THREE.SphereGeometry(0.014, sg(8), sg(6)), sk, 0, 0, hr * 1.0)]);   // sống mũi nhỏ nổi khối

    // ---- tóc ----
    const hair = this.monk ? 'troc' : L.hair, hairL = new THREE.MeshBasicMaterial({ color: lite(this.hairC, 0.42), transparent: true, opacity: 0.4 });
    if (hair !== 'troc') {
      const cap = part(new THREE.SphereGeometry(hr * 1.045, sg(32), sg(20), 0, Math.PI * 2, 0, Math.PI * 0.56), hairM, 0, hy + 0.004, -0.014); cap.rotation.x = -0.6; cap.scale.set(1.05, 0.98, 1); head.add(cap);
      // mái: các lọn hình giọt nước buông xuống trán
      const fringe = hair === 'ngan' ? [[-0.42, 0.9], [-0.22, 1.0], [0, 1.05], [0.2, 0.95], [0.4, 0.85]] : [[-0.5, 1.05], [-0.28, 1.15], [-0.07, 1.0], [0.14, 1.12], [0.34, 1.0], [0.52, 0.95]];
      fringe.forEach(([yaw, len]) => {
        const g = pivot(0, hy, 0); g.rotation.set(-0.62, yaw, 0, 'YXZ'); head.add(g);
        const lk = part(new THREE.SphereGeometry(0.06, sg(12), sg(10)), hairM, 0, -0.045 * len, hr * 1.0); lk.scale.set(0.95, 1.55 * len, 0.5); lk.rotation.z = -yaw * 0.35; g.add(lk);
      });
      // tóc mai hai bên tai
      [-1, 1].forEach(sx => { const g = pivot(0, hy, 0); g.rotation.set(-0.1, sx * 1.12, 0, 'YXZ'); head.add(g);
        const sd = part(new THREE.SphereGeometry(0.06, sg(12), sg(10)), hairM, 0, -0.05, hr * 0.99); sd.scale.set(0.8, nu ? 2.4 : 1.4, 0.5); g.add(sd); });
      // vệt bóng tóc (kiểu anime)
      const shine = part(new THREE.TorusGeometry(hr * 0.86, 0.01, sg(4), sg(24), 0.85), hairL, 0, hy + hr * 0.5, -0.02); shine.rotation.set(Math.PI / 2 - 0.3, 0, Math.PI * 0.3); noLine(shine); head.add(shine);
    }
    if (hair === 'bui') {
      const bun = part(new THREE.SphereGeometry(0.12, sg(16), sg(12)), hairM, 0, nu ? hy + 0.08 : hy + hr * 0.96, nu ? -hr * 0.88 : -0.05); head.add(bun);
      put(head, part(new THREE.TorusGeometry(0.1, 0.018, sg(6), sg(18)), hairM, 0, nu ? hy + 0.06 : hy + hr * 0.9, nu ? -hr * 0.8 : -0.05)).rotation.x = nu ? 0.4 : Math.PI / 2;   // vòng quấn búi
      if (nu) { put(head, part(new THREE.CylinderGeometry(0.008, 0.008, 0.3, sg(6)), T(0xe9b949), 0.04, hy + 0.1, -hr * 0.92)).rotation.z = 1.2;
        put(head, part(new THREE.SphereGeometry(0.022, sg(8), sg(6)), T(0xd9332a), 0.17, hy + 0.155, -hr * 0.92));
        put(head, part(new THREE.SphereGeometry(0.014, sg(6), sg(5)), T(0xffe08a), -0.1, hy + 0.04, -hr * 0.92)); }   // trâm cài & hạt
    }
    if (hair === 'dai') {
      put(head, part(new THREE.CapsuleGeometry(0.16, nu ? 0.34 : 0.14, 6, 14), hairM, 0, hy - (nu ? 0.3 : 0.16), -hr * 0.7)).scale.set(1.15, 1, 0.45);
      if (nu) { put(head, part(new THREE.TorusGeometry(0.05, 0.016, sg(6), sg(14)), T(0xd9332a), 0, hy - 0.12, -hr * 0.88)).scale.set(1.4, 0.8, 1);   // dây buộc tóc đỏ
        [-1, 1].forEach(s => { const rb = part(new THREE.SphereGeometry(0.035, sg(8), sg(6)), T(0xd9332a), s * 0.06, hy - 0.11, -hr * 0.9); rb.scale.set(1.4, 0.7, 0.4); head.add(rb); }); }
    }
    if (hair === 'ngan') head.add(part(new THREE.SphereGeometry(hr * 1.07, sg(26), sg(14), 0, Math.PI * 2, 0, Math.PI * 0.4), hairM, 0, hy + 0.012, -0.012));
    if (bald) { const sh = part(new THREE.SphereGeometry(hr * 1.006, sg(28), sg(14), 0, Math.PI * 2, 0, Math.PI * 0.44), T(dim(this.skin, 0.86), { transparent: true, opacity: 0.35 }), 0, hy, -0.02); sh.rotation.x = -0.55; sh.scale.set(1.05, 0.97, 1); noLine(sh); head.add(sh); }   // da đầu cạo hơi xanh

    if (this.monk) {   // áo cà sa đỏ khoác ngoài áo hậu vàng: phủ thân & vạt dưới, chừa vai phải, viền vàng chéo từ vai trái (trụ trì: đỏ thẫm)
      const km = T(0xffffff, { map: kasayaTex(this.kasaya ? 'su' : 'tru'), side: THREE.DoubleSide });
      const body = part(new THREE.LatheGeometry(V2([[0.29, -0.01], [0.268, 0.16], [0.238, 0.3], [0.185, 0.39]]), 28, Math.PI * 0.62, Math.PI * 1.62), km);
      this.torso.add(body);
      const skirtK = part(new THREE.LatheGeometry(V2([[0.395, -0.31], [0.372, -0.22], [0.322, -0.08], [0.283, 0.025]]), 28), km);
      this.skirt.add(skirtK);   // co giãn cùng vạt áo khi ngồi
      put(this.torso, part(new THREE.TorusGeometry(0.24, 0.022, sg(6), sg(30)), T(0xf0c25a), 0, 0.2, 0)).rotation.set(Math.PI / 2 - 0.35, 0.75, 0);   // viền cà sa chéo ngực
      put(this.torso, part(new THREE.SphereGeometry(0.035, sg(8), sg(6)), T(0xf0c25a), -0.17, 0.33, 0.12));   // khoen cà sa trên vai trái
      // chấm giới (tịnh giới) tròn trắng trên đỉnh đầu: trụ trì 9 chấm (3×3), sư thầy 6 chấm (2×3)
      const dotM = T(0xfbf8f0), cols = this.kasaya ? [-0.035, 0.035] : [-0.06, 0, 0.06], rows = [-0.07, 0, 0.07], up = new THREE.Vector3(0, 1, 0);
      for (const dx of cols) for (const dz of rows) { const ny = Math.sqrt(Math.max(0, hr * hr - dx * dx - dz * dz)); const n = new THREE.Vector3(dx, ny, dz).normalize();
        const d = noLine(part(new THREE.SphereGeometry(0.019, sg(10), sg(6)), dotM, n.x * hr * 1.06, hy + n.y * hr * 0.98, n.z * hr)); d.scale.set(1, 0.32, 1); d.quaternion.setFromUnitVectors(up, n); d.castShadow = false; head.add(d); }
    }
    mergeLeaves(r, [this.hips, this.torso, this.head, this.skirt, this.necklace, this.incense, this.lLeg.thigh, this.lLeg.knee, this.rLeg.thigh, this.rLeg.knee, this.lArm.shoulder, this.lArm.elbow, this.rArm.shoulder, this.rArm.elbow]);
    if (this.outline) addOutline(r);
    // vầng hào quang (khi được Phật Quang chiếu)
    this.halo = part(new THREE.RingGeometry(0.3, 0.36, 40), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }), 0, hy, -0.14); this.halo.visible = false; head.add(this.halo);
    this.apply();
  }
  setLook(look) { const aura = this.aura && this.aura.visible ? [this._auraColor, this._auraStrong] : null; Object.assign(this.look, look); this.build(); if (aura) this.setAura(true, aura[0], aura[1]); }
  setPose(name) { if (POSES[name]) this.target = name; }
  setGlow(on) { this.halo.visible = !!on; }
  setAura(on, color = 0xffe08a, strong = false) {   // hào quang công đức: vầng sáng & vòng vàng dưới chân (không làm lóa người)
    if (on) {
      if (!this.aura) {
        const g = new THREE.Group(); g.position.y = 0.03; this.root.add(g); this.aura = g;
        const mk = (geo, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: geo.type === 'CircleGeometry' ? auraTex() : null, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.renderOrder = -2; g.add(m); return m; };
        this.auraDisc = mk(new THREE.CircleGeometry(0.75, 40), 0.55);
        this.auraRing = mk(new THREE.RingGeometry(0.5, 0.54, 48), 0.7);
        this.auraRing2 = mk(new THREE.RingGeometry(0.66, 0.68, 48), 0.45);
        const pl = new THREE.PointLight(color, 0.35, 2.2, 1.8); pl.userData.mobileOff = matchMedia('(pointer: coarse)').matches; pl.position.y = 0.25; this.root.add(pl); this.auraLight = pl;
      }
      [this.auraDisc, this.auraRing, this.auraRing2].forEach(m => m.material.color.setHex(color)); this.auraLight.color.setHex(color);
      this._auraStrong = strong; this._auraColor = color; this.aura.scale.setScalar(strong ? 1.35 : 1); this.auraRing2.visible = strong;
      this.aura.visible = true; this.auraLight.visible = !this.auraLight.userData.mobileOff;
    } else if (this.aura) { this.aura.visible = this.auraLight.visible = false; }
  }
  bow() { this.bowT = 0; }
  get height() { return this.pose.hipY + 1.1; }
  update(dt, moving) {
    const tgt = Object.assign({}, POSES[moving && this.target !== 'carry' && !this.keepArms ? 'idle' : this.target]);   // keepArms: vừa đi vừa giữ tay (chắp tay, cầm hương, cầm cờ)
    if (moving) {
      this.walkT += dt * 9 * Math.max(0.6, this.speed);
      const s = Math.sin(this.walkT), a = 0.6 * Math.min(1, this.speed + 0.3);
      Object.assign(tgt, { lThigh: -s * a, rThigh: s * a, lKnee: Math.max(0, s) * a, rKnee: Math.max(0, -s) * a, hipY: 0.5 + Math.abs(Math.cos(this.walkT)) * 0.035 });
      if (this.target !== 'carry' && !this.keepArms) Object.assign(tgt, { lArm: s * a * 0.6 - 0.1, rArm: -s * a * 0.6 - 0.1, lElbow: -0.4, rElbow: -0.4, armIn: 0 });
    }
    if (this.bowT >= 0) {
      this.bowT += dt;
      const kneeling = this.target === 'kneel' || this.target === 'bow' || this.target === 'lotus';
      const peak = kneeling ? POSES.bow : POSES.standBow, k = Math.sin(Math.min(1, this.bowT / 2.2) * Math.PI);
      for (const key in peak) tgt[key] = tgt[key] + (peak[key] - tgt[key]) * k;
      if (this.bowT > 2.2) this.bowT = -1;
    }
    const lerp = 1 - Math.pow(0.0005, dt);
    for (const key in tgt) this.pose[key] += (tgt[key] - this.pose[key]) * (moving ? Math.min(1, lerp * 3) : lerp);
    this.incense.visible = this.target === 'incense';
    if (this.halo.visible) this.halo.rotation.z += dt;
    if (this.aura && this.aura.visible) { const st = this._auraStrong, k = 0.75 + 0.25 * Math.sin(performance.now() / 320); this.auraDisc.material.opacity = (st ? 0.6 : 0.42) * k; this.auraRing.material.opacity = 0.75 * k; this.auraLight.intensity = (st ? 0.5 : 0.3) * k; this.auraRing.scale.setScalar(0.94 + 0.12 * k); this.aura.rotation.y += dt * 0.6; }
    this.apply();
  }
  apply() {
    const p = this.pose;
    this.hips.position.y = p.hipY;
    this.torso.rotation.x = p.torso; this.head.rotation.x = p.head;
    this.lLeg.thigh.rotation.set(p.lThigh, 0, -p.legOut); this.rLeg.thigh.rotation.set(p.rThigh, 0, p.legOut);
    this.lLeg.knee.rotation.x = p.lKnee; this.rLeg.knee.rotation.x = p.rKnee;
    this.lArm.shoulder.rotation.set(p.lArm, 0, p.armIn * 0.12); this.rArm.shoulder.rotation.set(p.rArm, 0, -p.armIn * 0.12);
    this.lArm.elbow.rotation.set(p.lElbow, p.armIn, 0); this.rArm.elbow.rotation.set(p.rElbow, -p.armIn, 0);
    this.skirt.scale.set(1 + (1 - p.skirt) * 0.25, p.skirt, 1 + (1 - p.skirt) * 0.25);
  }
}
Avatar.outline = false;   // bật viền nét cho mọi nhân vật (main.js bật trên máy tính)
export { POSES, ROBES, MALAS, PATTERNS };
