// Văn phòng 3D: sàn 30x20 có tường kính, dãy bàn làm việc (Quản lý ngồi giữa dưới cùng, giữa hai dãy),
// khu thư giãn, phòng họp kính, kệ trưng bày phụ tùng. Nhân viên đi lại theo trạng thái thật:
// làm việc / suy nghĩ / nghỉ tại chỗ → ngồi ở bàn; đang ngủ → khu thư giãn; họp hoặc đang phản biện việc chung → bàn họp.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const PRESETS = [
  { id: 'all', label: 'Toàn cảnh', pos: [-15, 21, 24], target: [0, 0, 0] },
  { id: 'desks', label: 'Dãy bàn làm việc', pos: [7.5, 12, 17], target: [7.5, 0, -0.5] },
  { id: 'display', label: 'Bàn trưng bày', pos: [-4, 6.5, 4], target: [-13, 0.8, 3] },
  { id: 'lounge', label: 'Khu thư giãn', pos: [-1, 8.5, 3], target: [-8, 0, -5] },
  { id: 'meeting', label: 'Bàn họp', pos: [1, 10, 14], target: [-5, 0, 5.5] },
];

const WALK = 9.2;             // lối đi chính phía trước (z)
const SKIN = 0xf1c9a5;

// ---------- Vị trí ----------
// Mỗi chỗ có "lối vào" từ lối đi chính, để nhân vật đi theo lối thay vì xuyên qua bàn ghế.
function deskSpot(i) {
  if (i === 9) return { x: 7.5, z: 7.3, rot: Math.PI, sit: true, path: [[7.5, WALK]] }; // Quản lý
  if (i <= 4) { const z = -7 + i * 2.6; return { x: 3.2, z, rot: Math.PI / 2, sit: true, path: [[2.1, WALK], [2.1, z]] }; }
  const z = -7 + (i - 5) * 2.6;
  return { x: 11.8, z, rot: -Math.PI / 2, sit: true, path: [[12.9, WALK], [12.9, z]] };
}
const LOUNGE_C = [-8, -4.6];
function loungeSpot(i) {
  const via = [[-0.4, WALK], [-0.4, -2.2]];
  if (i < 4) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return { x: LOUNGE_C[0] + Math.cos(a) * 1.6, z: LOUNGE_C[1] + Math.sin(a) * 1.6, rot: Math.atan2(-Math.cos(a), -Math.sin(a)), sit: true, path: via }; }
  if (i < 7) return { x: -9.4 + (i - 4) * 1.1, z: -7.7, rot: 0, sit: true, path: via };          // sofa
  return { x: -4.4 - (i - 7) * 1.2, z: -2.3 - (i - 7) * 0.5, rot: Math.PI * 0.85, sit: false, path: via }; // đứng uống nước
}
function meetingSpot(i) {
  const side = i % 2 === 0 ? -1 : 1;
  const k = Math.floor(i / 2);
  const x = -7.4 + k * 1.2;
  return { x, z: 5.5 + side * 1.35, rot: side < 0 ? 0 : Math.PI, sit: true, path: [[-0.4, WALK], [-0.4, 5.5], [-2.2, 5.5], [x, 5.5 + side * 2.2]] };
}

// ---------- Vật liệu & đồ đạc ----------
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
const M = {
  floor: mat(0xc8ccd4), floorWork: mat(0xb9bec8), rug: mat(0xd8c6a6), frame: mat(0x1d2230, { roughness: 0.5 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xa9c2dc, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, depthWrite: false }),
  desk: mat(0xeef0f4), deskLeg: mat(0x2b3140), screen: mat(0x1f4fbf, { emissive: 0x2a63e0, emissiveIntensity: 0.55 }),
  chair: mat(0x23314f), sofa: mat(0x1f5a46), wood: mat(0x9a5b33), white: mat(0xf4f5f7), dark: mat(0x161a24),
  tire: mat(0x15171d, { roughness: 0.9 }), metal: mat(0x9aa3b2, { metalness: 0.6, roughness: 0.35 }), pot: mat(0x8a6a4e),
  leaf: mat(0x2f7a48), lamp: mat(0xffe3a3, { emissive: 0xffd27a, emissiveIntensity: 1.2 }), cord: mat(0x222222), pants: mat(0x232b3d),
};

function box(w, h, d, m, x, y, z, parent, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cyl(rt, rb, h, m, x, y, z, parent, seg = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const FONT = '"Be Vietnam Pro", system-ui, sans-serif';

function pillSprite(text, bg, fg = '#ffffff', scale = 0.0092) {
  const fontPx = 46;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `700 ${fontPx}px ${FONT}`;
  const w = Math.ceil(probe.measureText(text).width) + 56;
  const tex = canvasTexture(w, 84, (g) => {
    g.fillStyle = bg;
    g.beginPath(); g.roundRect(2, 2, w - 4, 80, 40); g.fill();
    g.fillStyle = fg; g.font = `700 ${fontPx}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillText(text, w / 2, 44);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(w * scale, 84 * scale, 1);
  s.renderOrder = 10;
  return s;
}

// Bong bóng thoại: chữ thật của nhân viên (hoặc "…" khi đang suy nghĩ), xuống dòng tối đa 3 dòng.
function bubbleSprite(text, tone = 'light') {
  const fontPx = 34, maxW = 560, pad = 28;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `500 ${fontPx}px ${FONT}`;
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const t = cur ? `${cur} ${word}` : word;
    if (probe.measureText(t).width > maxW && cur) { lines.push(cur); cur = word; } else cur = t;
    if (lines.length === 3) break;
  }
  if (lines.length < 3 && cur) lines.push(cur);
  if (lines.length === 3 && words.join(' ').length > lines.join(' ').length) lines[2] = `${lines[2].replace(/\s*\S*$/, '')}…`;
  const w = Math.min(maxW, Math.max(...lines.map((l) => probe.measureText(l).width))) + pad * 2;
  const h = lines.length * 44 + pad * 2 - 8 + 18;
  const bg = tone === 'error' ? '#ef6464' : '#ffffff';
  const fg = tone === 'error' ? '#ffffff' : '#1b2233';
  const tex = canvasTexture(w, h, (g) => {
    g.fillStyle = bg;
    g.beginPath(); g.roundRect(2, 2, w - 4, h - 22, 30); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 16, h - 22); g.lineTo(w / 2, h - 2); g.lineTo(w / 2 + 16, h - 22); g.fill();
    g.fillStyle = fg; g.font = `500 ${fontPx}px ${FONT}`; g.textBaseline = 'top'; g.textAlign = 'center';
    lines.forEach((l, i) => g.fillText(l, w / 2, pad + i * 44 - 4));
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(w * 0.0085, h * 0.0085, 1);
  s.center.set(0.5, 0);
  s.renderOrder = 11;
  return s;
}

function plant(parent, x, z, s = 1) {
  cyl(0.32 * s, 0.26 * s, 0.55 * s, M.pot, x, 0.28 * s, z, parent);
  const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 * s, 1), M.leaf);
  f.position.set(x, 0.95 * s, z); f.castShadow = true;
  parent.add(f);
}

function chair(parent, x, z, rot, m = M.chair) {
  const g = new THREE.Group();
  box(0.55, 0.08, 0.55, m, 0, 0.48, 0, g);
  box(0.55, 0.6, 0.07, m, 0, 0.8, -0.26, g);
  cyl(0.04, 0.04, 0.45, M.deskLeg, 0, 0.23, 0, g, 8);
  g.position.set(x, 0, z); g.rotation.y = rot;
  parent.add(g);
}

function buildRoom(scene, companyName) {
  const room = new THREE.Group();
  scene.add(room);
  // Sàn
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 20), M.floor);
  floor.position.y = -0.1; floor.receiveShadow = true; room.add(floor);
  const work = new THREE.Mesh(new THREE.BoxGeometry(13, 0.02, 17), M.floorWork);
  work.position.set(7.5, 0.01, -0.5); work.receiveShadow = true; room.add(work);
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.03, 48), M.rug);
  rug.position.set(LOUNGE_C[0], 0.02, LOUNGE_C[1]); rug.receiveShadow = true; room.add(rug);

  // Tường kính ba phía, khung đen chia ô
  const H = 4.6;
  const glassWall = (w, x, z, ry) => {
    const g = new THREE.Group();
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, H), M.glass);
    pane.position.y = H / 2; g.add(pane);
    for (let i = 0; i <= Math.round(w / 2.5); i++) box(0.09, H, 0.09, M.frame, -w / 2 + (i * w) / Math.round(w / 2.5), H / 2, 0, g, false);
    box(w, 0.1, 0.1, M.frame, 0, H, 0, g, false);
    box(w, 0.1, 0.1, M.frame, 0, 0.05, 0, g, false);
    box(w, 0.06, 0.06, M.frame, 0, 2.4, 0, g, false);
    g.position.set(x, 0, z); g.rotation.y = ry;
    room.add(g);
  };
  glassWall(30, 0, -10, 0);
  glassWall(20, -15, 0, Math.PI / 2);
  glassWall(20, 15, 0, Math.PI / 2);

  // Bảng hiệu công ty trên tường sau
  const signTex = canvasTexture(1024, 384, (g, w, h) => {
    g.fillStyle = '#f5f6f8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1c2233'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#d9ae4c'; g.beginPath(); g.arc(170, h / 2, 96, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1c2233'; g.beginPath(); g.arc(170, h / 2, 60, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f5f6f8'; g.beginPath(); g.arc(170, h / 2, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1c2233'; g.font = `800 76px ${FONT}`; g.textBaseline = 'middle';
    const name = (companyName || 'Văn phòng ảo').toUpperCase();
    g.fillText(name.length > 16 ? name.slice(0, 16) : name, 300, h / 2 - 30);
    g.font = `500 40px ${FONT}`; g.fillStyle = '#5a6378';
    g.fillText('Văn phòng ảo · 10 nhân sự', 300, h / 2 + 48);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.0), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }));
  sign.position.set(7.5, 2.9, -9.85);
  room.add(sign);
  box(5.7, 2.3, 0.08, M.dark, 7.5, 2.9, -9.92, room, false);

  // Dãy bàn làm việc: 5 bàn bên trái, 4 bàn bên phải, bàn Quản lý giữa phía dưới
  const desk = (x, z, rot) => {
    const g = new THREE.Group();
    box(1.9, 0.08, 1.15, M.desk, 0, 0.78, 0, g);
    for (const [dx, dz] of [[-0.85, -0.5], [0.85, -0.5], [-0.85, 0.5], [0.85, 0.5]]) box(0.06, 0.78, 0.06, M.deskLeg, dx, 0.39, dz, g);
    box(0.9, 0.52, 0.05, M.screen, 0, 1.18, -0.32, g);
    box(0.08, 0.3, 0.08, M.deskLeg, 0, 0.94, -0.36, g);
    box(0.5, 0.03, 0.18, M.dark, 0, 0.84, 0.1, g);
    g.position.set(x, 0, z); g.rotation.y = rot;
    room.add(g);
  };
  for (let i = 0; i < 10; i++) {
    const s = deskSpot(i);
    const dx = Math.sin(s.rot) * 0.95, dz = Math.cos(s.rot) * 0.95;
    desk(s.x + dx, s.z + dz, s.rot + Math.PI);
    chair(room, s.x, s.z, s.rot + Math.PI);
  }

  // Khu thư giãn: bàn tròn, ghế, sofa, quầy cà phê
  cyl(0.85, 0.85, 0.07, M.wood, LOUNGE_C[0], 0.74, LOUNGE_C[1], room, 32);
  cyl(0.1, 0.25, 0.72, M.dark, LOUNGE_C[0], 0.36, LOUNGE_C[1], room, 12);
  for (let i = 0; i < 4; i++) { const s = loungeSpot(i); chair(room, s.x, s.z, s.rot + Math.PI, mat(0xb4582f)); }
  box(3.8, 0.45, 1.0, M.sofa, -8.3, 0.32, -8.1, room);
  box(3.8, 0.75, 0.25, M.sofa, -8.3, 0.75, -8.6, room);
  box(0.25, 0.6, 1.0, M.sofa, -10.2, 0.5, -8.1, room);
  box(0.25, 0.6, 1.0, M.sofa, -6.4, 0.5, -8.1, room);
  box(2.2, 1.0, 0.7, M.wood, -4.2, 0.5, -8.9, room);
  cyl(0.18, 0.18, 0.4, M.metal, -4.7, 1.2, -8.9, room, 16);
  box(0.4, 0.5, 0.35, M.dark, -3.7, 1.25, -8.9, room);

  // Phòng họp kính với bàn dài
  box(6.6, 0.08, 1.7, M.white, -5, 0.78, 5.5, room);
  for (const [dx, dz] of [[-3, -0.7], [3, -0.7], [-3, 0.7], [3, 0.7]]) box(0.08, 0.78, 0.08, M.deskLeg, -5 + dx, 0.39, 5.5 + dz, room);
  for (let i = 0; i < 10; i++) { const s = meetingSpot(i); chair(room, s.x, s.z, s.rot + Math.PI, M.dark); }
  const mGlass = (w, x, z, ry) => {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6), M.glass);
    pane.position.set(x, 1.3, z); pane.rotation.y = ry; room.add(pane);
    const f = box(ry ? 0.06 : w, 0.06, ry ? w : 0.06, M.frame, x, 2.6, z, room, false);
    f.castShadow = false;
  };
  mGlass(8.2, -5, 2.4, 0);
  mGlass(8.2, -5, 8.6, 0);
  mGlass(6.2, -9.1, 5.5, Math.PI / 2);
  mGlass(2.4, -0.9, 3.6, Math.PI / 2);
  mGlass(2.4, -0.9, 7.4, Math.PI / 2);
  const screen = box(2.8, 1.5, 0.06, M.screen, -5, 1.7, 2.5, room, false);
  screen.material = mat(0x24324f, { emissive: 0x1d3a7a, emissiveIntensity: 0.4 });

  // Kệ trưng bày phụ tùng dọc tường trái
  box(1.2, 0.9, 11, M.white, -13.9, 0.45, 3, room);
  box(1.25, 0.06, 11.05, M.dark, -13.9, 0.92, 3, room);
  for (let i = 0; i < 6; i++) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.15, 12, 28), M.tire);
    tire.position.set(-13.9, 1.12, -1.6 + i * 1.8); tire.rotation.x = Math.PI / 2; tire.castShadow = true; room.add(tire);
    cyl(0.22, 0.22, 0.3, M.metal, -13.9, 1.12, -0.7 + i * 1.8, room, 18);
  }
  const shelfSign = pillSprite('PHỤ TÙNG XE TẢI MỸ', '#1d2230', '#e9c46a', 0.008);
  shelfSign.position.set(-13.4, 2.2, 3); room.add(shelfSign);

  // Cây xanh
  for (const [x, z, s] of [[-14, -9, 1.2], [14, -9, 1.2], [14, 8.8, 1.1], [-0.6, 1.5, 0.9], [-14, 9, 1.1], [1.4, -9, 0.9], [-1.6, -9, 0.9]]) plant(room, x, z, s);

  // Đèn thả trần
  const lamps = [];
  for (const [x, z] of [[-8, -4.6], [-5, 5.5], [3.6, -5], [3.6, 0], [11.4, -5], [11.4, 0], [7.5, 6], [-11, 1], [-2, -6]]) {
    const cord = cyl(0.015, 0.015, 1.2, M.cord, x, 4.2, z, room, 6); cord.castShadow = false;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.3, 20, 1, true), M.lamp);
    shade.position.set(x, 3.5, z); room.add(shade);
    lamps.push(shade);
  }
  return room;
}

// ---------- Nhân vật ----------
function capsule(r, len, m) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), m);
  mesh.castShadow = true;
  return mesh;
}

function buildPerson(staff) {
  const g = new THREE.Group();
  const shirt = mat(staff.color || '#f2a516');
  const body = new THREE.Group(); // phần nhún khi suy nghĩ
  g.add(body);
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.14, 0.68, 0);
    const leg = capsule(0.12, 0.45, M.pants);
    leg.position.y = -0.33;
    hip.add(leg);
    body.add(hip);
    legs.push(hip);
  }
  const torso = capsule(0.29, 0.42, shirt);
  torso.position.y = 1.05;
  body.add(torso);
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(side * 0.38, 1.32, 0);
    const arm = capsule(0.085, 0.42, shirt);
    arm.position.y = -0.3;
    sh.add(arm);
    sh.rotation.z = side * 0.12;
    body.add(sh);
    arms.push(sh);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), mat(SKIN));
  head.position.y = 1.7; head.castShadow = true; body.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.275, 24, 12, 0, Math.PI * 2, 0, Math.PI / 1.9), mat(0x2a1f17));
  hair.position.y = 1.73; hair.rotation.x = -0.25; body.add(hair);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: 0xd9ae4c }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.04; ring.visible = false;
  g.add(ring);
  const label = pillSprite(staff.shortLabel, staff.color || '#d9ae4c');
  label.position.y = 2.42;
  g.add(label);
  g.traverse((o) => { o.userData.staffId = staff.id; });
  return { group: g, body, legs, arms, ring, label, shirt };
}

// ---------- Cảnh ----------
export function createOffice(container, { onSelect, companyName } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2236);
  scene.fog = new THREE.Fog(0x1a2236, 45, 80);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.minDistance = 4; controls.maxDistance = 48;

  scene.add(new THREE.HemisphereLight(0xf3f6ff, 0x5a6278, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-10, 22, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 14, bottom: -14, far: 60 });
  scene.add(sun);
  const warm = new THREE.PointLight(0xffd59a, 18, 14, 2);
  warm.position.set(-8, 3.4, -4.6); scene.add(warm);
  const warm2 = new THREE.PointLight(0xffe4b8, 14, 16, 2);
  warm2.position.set(7.5, 3.4, -1); scene.add(warm2);

  let room = buildRoom(scene, companyName);
  const people = new Map();
  let meeting = false;
  let debating = new Set();

  // ----- Camera -----
  let tween = null;
  function goPreset(id, instant = false) {
    const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
    const to = { pos: new THREE.Vector3(...p.pos), target: new THREE.Vector3(...p.target) };
    if (instant) { camera.position.copy(to.pos); controls.target.copy(to.target); controls.update(); return; }
    tween = { from: { pos: camera.position.clone(), target: controls.target.clone() }, to, t: 0 };
  }
  goPreset('all', true);

  function setPan(on) {
    controls.mouseButtons.LEFT = on ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.touches.ONE = on ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  }

  // ----- Nhân viên -----
  function spotFor(p) {
    const st = p.status;
    if (meeting || debating.has(p.id)) return meetingSpot(p.order);
    if (st === 'sleeping') return loungeSpot(p.order);
    return deskSpot(p.deskIndex);
  }

  function routeTo(p, spot) {
    const from = p.spot;
    const pts = [];
    if (from) for (const q of [...from.path].reverse()) pts.push(q);
    for (const q of spot.path) pts.push(q);
    pts.push([spot.x, spot.z]);
    p.route = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
    p.spot = spot;
  }

  function setStaff(list) {
    const seen = new Set();
    list.forEach((s, order) => {
      seen.add(s.id);
      let p = people.get(s.id);
      const key = `${s.shortLabel}|${s.color}`;
      if (p && p.key !== key) { scene.remove(p.group); p = null; people.delete(s.id); }
      if (!p) {
        const parts = buildPerson(s);
        p = { ...parts, id: s.id, staff: s, key, order, deskIndex: s.seat.deskIndex, status: 'resting', route: [], spot: null, bubble: null, bubbleUntil: 0, sitT: 1 };
        const spot = spotFor(p);
        p.spot = spot;
        p.group.position.set(spot.x, 0, spot.z);
        p.group.rotation.y = spot.rot;
        scene.add(p.group);
        people.set(s.id, p);
      }
      p.order = order; p.deskIndex = s.seat.deskIndex; p.staff = s;
    });
    for (const [id, p] of people) if (!seen.has(id)) { scene.remove(p.group); people.delete(id); }
  }

  function setBubble(p, text, tone, ms) {
    if (p.bubble) { p.group.remove(p.bubble); p.bubble.material.map.dispose(); p.bubble = null; }
    p.bubbleText = null;
    if (!text) return;
    p.bubble = bubbleSprite(text, tone);
    p.bubble.position.y = 2.75;
    p.group.add(p.bubble);
    p.bubbleUntil = ms ? performance.now() + ms : Infinity;
    p.bubbleText = text;
  }

  // states: { [staffId]: { status, said?: {text, at} } }
  // Bong bóng: câu nói thật vừa nói (9 giây), nếu không thì ký hiệu trạng thái (… / Zz / Báo lỗi).
  function update(states) {
    for (const [id, p] of people) {
      const s = states[id];
      if (!s) continue;
      p.status = s.status;
      const target = spotFor(p);
      if (!p.spot || target.x !== p.spot.x || target.z !== p.spot.z) routeTo(p, target);
      const statusBubble = { thinking: ['…', 'light'], sleeping: ['Zz', 'light'], error: ['Báo lỗi', 'error'] }[p.status];
      if (s.said && s.said.at !== p.saidAt) {
        p.saidAt = s.said.at;
        setBubble(p, s.said.text, 'light', 9000);
      } else if (!p.bubble || p.bubbleUntil === Infinity) {
        const want = statusBubble?.[0] || null;
        if (want !== (p.bubble ? p.bubbleText : null)) setBubble(p, want, statusBubble?.[1], 0);
      }
    }
  }

  function setMeeting(on) { meeting = on; for (const p of people.values()) { const t = spotFor(p); if (t.x !== p.spot?.x || t.z !== p.spot?.z) routeTo(p, t); } }
  function setDebating(ids) { debating = new Set(ids); setMeeting(meeting); }
  function select(id) { for (const [sid, p] of people) p.ring.visible = sid === id; }
  function setCompany(name) { scene.remove(room); room = buildRoom(scene, name); }

  // ----- Chọn nhân viên -----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const objs = [...people.values()].map((p) => p.group);
    const hit = ray.intersectObjects(objs, true)[0];
    if (hit?.object.userData.staffId) onSelect?.(hit.object.userData.staffId);
  });

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.fov = w < 520 ? 52 : 42;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ----- Vòng vẽ -----
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 0.9);
      const k = 1 - Math.pow(1 - tween.t, 3);
      camera.position.lerpVectors(tween.from.pos, tween.to.pos, k);
      controls.target.lerpVectors(tween.from.target, tween.to.target, k);
      if (tween.t >= 1) tween = null;
    }
    for (const p of people.values()) {
      const g = p.group;
      let moving = false;
      if (p.route.length) {
        const next = p.route[0];
        tmp.copy(next).sub(g.position); tmp.y = 0;
        const d = tmp.length();
        const step = 2.6 * dt;
        if (d <= step) { g.position.x = next.x; g.position.z = next.z; p.route.shift(); }
        else { g.position.addScaledVector(tmp.normalize(), step); moving = true; }
        if (d > 0.01) {
          const want = Math.atan2(next.x - g.position.x, next.z - g.position.z);
          let diff = want - g.rotation.y;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          g.rotation.y += diff * Math.min(1, dt * 10);
        }
      } else if (p.spot) {
        let diff = p.spot.rot - g.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        g.rotation.y += diff * Math.min(1, dt * 6);
      }
      const sitting = !moving && !p.route.length && p.spot?.sit;
      p.sitT += ((sitting ? 1 : 0) - p.sitT) * Math.min(1, dt * 8);
      const swing = moving ? Math.sin(t * 9) * 0.6 : 0;
      p.legs[0].rotation.x = -p.sitT * 1.45 + swing;
      p.legs[1].rotation.x = -p.sitT * 1.45 - swing;
      p.arms[0].rotation.x = -swing * 0.8 - (p.status === 'working' && sitting ? 0.9 : 0);
      p.arms[1].rotation.x = swing * 0.8 - (p.status === 'working' && sitting ? 0.9 : 0);
      p.body.position.y = -p.sitT * 0.2 + (p.status === 'thinking' ? Math.abs(Math.sin(t * 5)) * 0.06 : 0) + (moving ? Math.abs(Math.sin(t * 9)) * 0.04 : 0);
      if (p.ring.visible) p.ring.rotation.z = t;
      if (p.bubble && performance.now() > p.bubbleUntil) setBubble(p, null);
    }
    controls.update();
    renderer.render(scene, camera);
  });

  // Phông chữ tải xong thì vẽ lại nhãn cho đúng font.
  document.fonts?.ready.then(() => {
    for (const p of people.values()) {
      p.group.remove(p.label);
      p.label = pillSprite(p.staff.shortLabel, p.staff.color || '#d9ae4c');
      p.label.position.y = 2.42;
      p.label.userData.staffId = p.id;
      p.group.add(p.label);
    }
  }).catch(() => {});

  return { setStaff, select, update, setMeeting, setDebating, goPreset, setPan, setCompany, resize };
}
