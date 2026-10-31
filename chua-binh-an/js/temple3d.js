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
  return g;
}
/* điện thờ: nền đá, cột đỏ, tường, 1–2 tầng mái */
function hall({ w = 10, d = 6, h = 3.2, tiers = 2, wall = null, roofColor = null, base = 0.8 } = {}) {
  const g = new THREE.Group();
  g.add(box(w + 1.6, base, d + 1.6, STONE(), 0, base / 2, 0));
  g.add(box(w, h, d, wall || WALL(), 0, base + h / 2, 0));
  const n = Math.max(4, Math.round(w / 1.8));
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + (w / n) * i;
    g.add(cyl(0.18, 0.2, h, 10, RED(), x, base + h / 2, d / 2 + 0.55));
  }
  g.add(box(w * 0.22, h * 0.7, 0.1, DRED(), 0, base + h * 0.35, d / 2 + 0.05));
  [-1, 1].forEach(s => g.add(box(w * 0.12, h * 0.55, 0.1, DRED(), s * w * 0.3, base + h * 0.4, d / 2 + 0.05)));
  const r1 = roof(w + 2.2, d + 2.4, h * 0.75, roofColor); r1.position.y = base + h; g.add(r1);
  if (tiers > 1) {
    g.add(box(w * 0.6, h * 0.45, d * 0.6, wall || WALL(), 0, base + h + h * 0.75 * 0.5 + h * 0.2, 0));
    const r2 = roof(w * 0.75 + 1.4, d * 0.75 + 1.4, h * 0.65, roofColor); r2.position.y = base + h + h * 0.62; g.add(r2);
  }
  // bậc thềm
  for (let i = 0; i < 4; i++) g.add(box(w * 0.3, base / 4, 0.4, STONE(), 0, base / 8 + i * base / 4 - 0.0, d / 2 + 0.8 + 1.6 - i * 0.4));
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
function tree(h, m = LEAF(), x = 0, z = 0, kind = 'round') {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(cyl(h * 0.05, h * 0.08, h * 0.5, 8, WOOD(), 0, h * 0.25, 0));
  if (kind === 'pine') { for (let i = 0; i < 3; i++) g.add(mesh(new THREE.ConeGeometry(h * (0.32 - i * 0.07), h * 0.38, 8), LEAF2(), 0, h * (0.5 + i * 0.2), 0)); }
  else { for (let i = 0; i < 4; i++) { const s = mesh(new THREE.IcosahedronGeometry(h * (0.28 - i * 0.03), 0), m, (Math.random() - 0.5) * h * 0.35, h * (0.62 + i * 0.1), (Math.random() - 0.5) * h * 0.35); g.add(s); } }
  return g;
}
function mountain(r, h, color = 0x4f7a3f, seed = 1, x = 0, z = 0) {
  const geo = new THREE.ConeGeometry(r, h, 28, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); if (y > h / 2 - 0.01) continue;
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const n = 1 + 0.18 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 7 + seed * 2) + 0.06 * Math.sin(y * 0.5 + seed);
    p.setX(i, p.getX(i) * n); p.setZ(i, p.getZ(i) * n);
  }
  geo.computeVertexNormals();
  return mesh(geo, mat('mt' + color, color, { flatShading: true }), x, h / 2, z);
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
function ground(g, size = 120, color = null) { const o = mesh(new THREE.PlaneGeometry(size, size), color ? mat('gr' + color, color) : GRASS(), 0, 0, 0, false); o.rotation.x = -Math.PI / 2; g.add(o); }
function courtyard(g, w, d, z = 4) { const o = mesh(new THREE.PlaneGeometry(w, d), mat('court', 0xc9b48a), 0, 0.02, z, false); o.rotation.x = -Math.PI / 2; g.add(o); }
function burner(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(cyl(0.6, 0.45, 0.7, 12, BRONZE(), 0, 0.75, 0)); g.add(cyl(0.12, 0.12, 0.4, 8, BRONZE(), 0, 0.2, 0)); g.add(cyl(0.7, 0.6, 0.1, 12, BRONZE(), 0, 1.1, 0)); return g; }

/* ---------------- cảnh của từng chùa ---------------- */
const SCENES = {
  hall(g) {
    ground(g); courtyard(g, 18, 10, 5);
    g.add(hall({ w: 10, d: 6 })); g.add(burner(0, 6));
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
    g.add(box(2.4, 1.6, 2.4, mat('mcwall', 0xb3401f), 0, 5.2, 0));
    const r = roof(4.6, 4.6, 1.5); r.position.y = 6.4; g.add(r);
    const st = stairs(1.6, 14, 0.3, 0.5); st.position.set(0, 0.5, 6.8); st.rotation.y = 0; g.add(st);
    g.add(box(1.6, 0.25, 4.5, STONE(), 0, 4.2, 2.6));
    [-10, 10, -9, 9].forEach((x, i) => g.add(tree(5, mat('frangi', 0x4d7a3a, { flatShading: true }), x, i < 2 ? -6 : 7)));
    return { cam: [13, 9, 16], target: [0, 4, 0] };
  },
  baidinh(g) {
    ground(g, 160, 0x5f7a45);
    g.add(mountain(28, 26, 0x3f6a35, 1, -6, -30)); g.add(mountain(20, 20, 0x4a7a3a, 3, 18, -26)); g.add(mountain(18, 16, 0x56803f, 5, -24, -20));
    const base = box(26, 3, 14, STONE(), 0, 1.5, -2); g.add(base);
    const h = hall({ w: 16, d: 8, h: 4.2, tiers: 2 }); h.position.set(0, 3, -3); g.add(h);
    const st = stairs(6, 10, 0.3, 0.6); st.position.set(0, 0, 8.8); g.add(st);
    const bell = hall({ w: 4, d: 4, h: 2.6, tiers: 2 }); bell.position.set(-14, 0, 6); g.add(bell);
    const tw = tower({ tiers: 13, sides: 4, r: 2.4, th: 1.5, taper: 0.5 }); tw.position.set(16, 0, -6); g.add(tw);
    courtyard(g, 30, 10, 12); g.add(burner(0, 12));
    [-20, -10, 10, 22].forEach((x, i) => g.add(tree(5.5, LEAF(), x, 14 + (i % 2) * 3)));
    return { cam: [26, 16, 34], target: [0, 6, -2] };
  },
  huong(g) {
    ground(g, 160, 0x4f7a3f);
    const m1 = mountain(18, 30, 0x6a7a5a, 2, 0, -14); g.add(m1); g.add(mountain(14, 22, 0x5a6a4a, 4, -26, -18)); g.add(mountain(13, 20, 0x5f7050, 6, 26, -20));
    const cave = mesh(new THREE.CircleGeometry(3.4, 24, 0, Math.PI), DARK(), 0, 8.4, 0.2, false); cave.scale.set(1, 1.3, 1); cave.rotation.x = -0.35; g.add(cave);
    g.add(box(8, 0.6, 3, STONE(), 0, 8.1, 1.2));
    const st = stairs(2.4, 26, 0.31, 0.3); st.position.set(0, 0, 10.5); g.add(st);
    // tam quan
    const gate = new THREE.Group(); gate.position.set(0, 0, 12.5);
    [-2.6, 0, 2.6].forEach((x, i) => { gate.add(box(i === 1 ? 2.4 : 1.8, i === 1 ? 3.2 : 2.6, 0.8, WALL(), x, i === 1 ? 1.6 : 1.3, 0)); const r = roof(i === 1 ? 3.2 : 2.4, 1.6, 0.9); r.position.set(x, i === 1 ? 3.2 : 2.6, 0); gate.add(r); });
    g.add(gate);
    g.add(water(80, 9, 0, 19)); g.add(boat(-6, 18, 0.3)); g.add(boat(6, 20, -0.2)); lotusPads(g, 20, 60, 6, 0, 19);
    [-9, 9, -14, 14].forEach((x, i) => g.add(tree(4.5, LEAF(), x, 9 + (i % 2) * 2)));
    return { cam: [10, 13, 40], target: [0, 7, 2] };
  },
  yentu(g) {
    ground(g, 200, 0x3f6a35);
    g.add(mountain(30, 34, 0x35602f, 1, 0, 0)); g.add(mountain(22, 24, 0x3f6a35, 7, -26, -14)); g.add(mountain(20, 22, 0x45703a, 9, 24, -18));
    const t = hall({ w: 5, d: 4, h: 2.4, tiers: 2, wall: BRONZE(), roofColor: 0x8a5a24, base: 0.5 }); t.position.set(0, 34, 0); g.add(t);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, rr = 14 + (i % 3) * 5, y = 34 - rr * 1.05; const tr = tree(3.5, LEAF2(), Math.cos(a) * rr, Math.sin(a) * rr, 'pine'); tr.position.y = Math.max(0, y * 0.95); g.add(tr); }
    const upd = clouds(g, 10, 22, 20);
    return { cam: [30, 38, 34], target: [0, 30, 0], update: upd };
  },
  thienmu(g) {
    ground(g, 160, 0x5a8a45); g.add(water(160, 22, 0, 22));
    g.add(box(30, 1.6, 18, mat('hill', 0x6a8a4a), 0, 0.8, -4));
    const tw = tower({ tiers: 7, sides: 8, r: 2.6, th: 2.2, taper: 0.42, wall: mat('tmwall', 0xd9b89a), roofColor: 0x5a4a3a }); tw.position.set(0, 1.6, 2); g.add(tw);
    const h = hall({ w: 9, d: 5, h: 3, tiers: 2 }); h.position.set(0, 1.6, -9); g.add(h);
    [-6, 6].forEach(x => { const p = hall({ w: 2.6, d: 2.6, h: 2, tiers: 1 }); p.position.set(x, 1.6, 3); g.add(p); });
    const st = stairs(5, 6, 0.27, 0.5); st.position.set(0, 0, 10.8); g.add(st);
    [-12, 12, -10, 11].forEach((x, i) => g.add(tree(5, LEAF(), x, i < 2 ? -6 : 6)));
    g.add(boat(-10, 20, 0.1));
    return { cam: [22, 14, 30], target: [0, 8, 0] };
  },
  linhung(g) {
    ground(g, 200, 0x55804a); g.add(water(260, 120, 0, 85));
    g.add(box(40, 1, 22, mat('cliff', 0x8a8a7a), 0, 0.5, 4));
    const s = standingGuanyin(24); s.position.set(0, 1, 8); s.rotation.y = 0; g.add(s);
    const h = hall({ w: 12, d: 7, h: 3.6, tiers: 2, wall: YWALL(), roofColor: 0x2f5a7a }); h.position.set(-12, 1, -6); g.add(h);
    [10, 16, -20, 20].forEach((x, i) => g.add(tree(5, LEAF(), x, -4 - (i % 2) * 4)));
    g.add(mountain(26, 24, 0x3f6a35, 2, 10, -30));
    return { cam: [-22, 16, 38], target: [0, 11, 4] };
  },
  longson(g) {
    ground(g, 160, 0x5f8a45);
    const hill = mountain(20, 14, 0x5f8a45, 4, 0, -6); hill.scale.y = 1; g.add(hill);
    g.add(cyl(6, 7.5, 1.2, 24, STONE(), 0, 12.8, -6));
    const b = seatedBuddha(7.5); b.position.set(0, 13.4, -6); g.add(b);
    const st = stairs(2.4, 30, 0.42, 0.42); st.position.set(0, 0, 10); g.add(st);
    const h = hall({ w: 10, d: 6, h: 3, tiers: 2 }); h.position.set(-13, 0, 10); g.add(h);
    [10, 14, -20].forEach(x => g.add(tree(5, LEAF(), x, 9)));
    return { cam: [20, 20, 30], target: [0, 17, -5] };
  },
  vinhnghiem(g) {
    ground(g, 140, 0x8a8a7a); courtyard(g, 34, 14, 9);
    const h = hall({ w: 16, d: 9, h: 4, tiers: 2, roofColor: 0x5a2a1a }); h.position.set(-3, 0, -3); g.add(h);
    const tw = tower({ tiers: 7, sides: 4, r: 2.2, th: 2, taper: 0.4, wall: mat('vnwall', 0xe8e0d0), roofColor: 0x3a3a3a }); tw.position.set(13, 0, -2); g.add(tw);
    g.add(burner(-3, 9));
    [-16, -12, 18].forEach(x => g.add(tree(5, LEAF(), x, 10)));
    return { cam: [24, 13, 30], target: [2, 6, 0] };
  },
  giaclam(g) {
    ground(g, 140, 0x5f8a45); courtyard(g, 30, 12, 8);
    const h = hall({ w: 13, d: 8, h: 3.2, tiers: 1, roofColor: 0x5a3a2a }); h.position.set(-3, 0, -2); g.add(h);
    const tw = tower({ tiers: 7, sides: 6, r: 2, th: 2, taper: 0.45, wall: mat('glwall', 0xeadbbf), roofColor: 0x4a3a2a }); tw.position.set(12, 0, 2); g.add(tw);
    const bodhi = tree(10, mat('bodhi', 0x3a7a32, { flatShading: true }), -14, 8); g.add(bodhi);
    g.add(burner(-3, 8));
    return { cam: [20, 12, 28], target: [0, 5, 0] };
  },
  khmer(g) {
    ground(g, 140, 0x5f8a45); courtyard(g, 24, 12, 8);
    const hg = new THREE.Group(); g.add(hg);
    hg.add(box(16, 2, 10, mat('kbase', 0xe8d8a8), 0, 1, -2));
    hg.add(box(13, 3.6, 7.5, mat('kwall', 0xf0d080), 0, 3.8, -2));
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
  const conf = (SCENES[model] || SCENES.hall)(g);
  const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 500);
  camera.position.set(...conf.cam);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...conf.target); controls.enableDamping = true; controls.autoRotate = opts.autoRotate !== false; controls.autoRotateSpeed = 0.7;
  controls.maxPolarAngle = Math.PI * 0.48; controls.minDistance = 6; controls.maxDistance = 90; controls.enablePan = false;
  controls.enabled = opts.interactive !== false;
  controls.update();
  let raf = 0, alive = true; const clock = new THREE.Clock();
  const loop = () => { if (!alive) return; const tt = clock.getElapsedTime(); if (conf.update) conf.update(tt); controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
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
