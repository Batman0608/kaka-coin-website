// Văn phòng 3D: sàn 26x18, hai dãy bàn, Quản lý ngồi giữa dưới cùng, giữa hai dãy.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GROUP_COLOR = { Marketing: 0xe07a3f, VanHanhKiemSoat: 0x2f6fdf, HoTroKyThuat: 0x2d8a4e };

// Vị trí bàn theo deskIndex: dãy trái 0–4, dãy phải 5–8, Quản lý (9) ở giữa dưới cùng.
function seatPosition(deskIndex) {
  if (deskIndex === 9) return { x: 0, z: 6.2, faceZ: -1 };
  if (deskIndex <= 4) return { x: -5.5, z: -7 + deskIndex * 3, faceX: 1 };
  return { x: 5.5, z: -7 + (deskIndex - 5) * 3, faceX: -1 };
}

function labelSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 72;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,24,32,0.82)';
  g.beginPath(); g.roundRect(4, 8, 248, 56, 14); g.fill();
  g.fillStyle = '#' + color.toString(16).padStart(6, '0');
  g.fillRect(16, 26, 10, 20);
  g.fillStyle = '#fff'; g.font = '600 30px system-ui, sans-serif'; g.textBaseline = 'middle';
  g.fillText(text, 36, 37);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(2.4, 0.68, 1);
  return s;
}

export function createOffice(container, onSelect) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  scene.background = new THREE.Color(dark ? 0x12151b : 0xe9edf2);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 20, 20);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.minDistance = 8; controls.maxDistance = 45;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8892a6, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(8, 18, 6); sun.castShadow = true;
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
  scene.add(sun);

  // Sàn 26x18 + tường thấp
  const floor = new THREE.Mesh(new THREE.BoxGeometry(26, 0.2, 18), new THREE.MeshStandardMaterial({ color: dark ? 0x2a2f3a : 0xd8dde5 }));
  floor.position.y = -0.1; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(26, 26, 0x9aa3b2, 0x9aa3b2);
  grid.material.opacity = 0.18; grid.material.transparent = true; grid.scale.z = 18 / 26; scene.add(grid);
  const wallMat = new THREE.MeshStandardMaterial({ color: dark ? 0x3a4150 : 0xc3cad6 });
  for (const [w, d, x, z] of [[26, 0.3, 0, -9], [0.3, 18, -13, 0], [0.3, 18, 13, 0]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), wallMat);
    wall.position.set(x, 0.6, z); scene.add(wall);
  }

  const deskMat = new THREE.MeshStandardMaterial({ color: 0x8b6b4a });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x1f2633, emissive: 0x223355 });
  const people = new Map(); // staffId -> { group, ring, body }
  const pickables = [];

  function addDesk(pos) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.2), deskMat);
    const dx = pos.faceX ? pos.faceX * 0.9 : 0;
    const dz = pos.faceZ ? pos.faceZ * 0.9 : 0;
    desk.position.set(pos.x + dx, 0.45, pos.z + dz);
    if (pos.faceX) desk.rotation.y = Math.PI / 2;
    desk.castShadow = true; desk.receiveShadow = true; scene.add(desk);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.06), screenMat);
    screen.position.set(pos.x + dx * 1.25, 1.2, pos.z + dz * 1.25);
    if (pos.faceX) screen.rotation.y = Math.PI / 2;
    scene.add(screen);
  }

  function setStaff(list) {
    for (const p of people.values()) scene.remove(p.group);
    people.clear(); pickables.length = 0;
    for (const s of list) {
      const pos = seatPosition(s.seat.deskIndex);
      addDesk(pos);
      const color = GROUP_COLOR[s.group] || 0x888888;
      const g = new THREE.Group();
      g.position.set(pos.x, 0, pos.z);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.3, 20), new THREE.MeshStandardMaterial({ color }));
      body.position.y = 0.65; body.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf1c9a5 }));
      head.position.y = 1.62; head.castShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; ring.visible = false;
      const label = labelSprite(s.shortLabel, color);
      label.position.y = 2.55;
      g.add(body, head, ring, label);
      body.userData.staffId = head.userData.staffId = s.id;
      pickables.push(body, head);
      scene.add(g);
      people.set(s.id, { group: g, ring, body, busy: false });
    }
  }

  function select(id) {
    for (const [sid, p] of people) p.ring.visible = sid === id;
  }

  function setBusy(id, busy) {
    const p = people.get(id);
    if (p) p.busy = busy;
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables)[0];
    if (hit) onSelect(hit.object.userData.staffId);
  });

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    for (const p of people.values()) {
      p.body.position.y = 0.65 + (p.busy ? Math.abs(Math.sin(t * 6)) * 0.15 : 0);
      if (p.ring.visible) p.ring.rotation.z = t;
    }
    controls.update();
    renderer.render(scene, camera);
  });

  return { setStaff, select, setBusy };
}
