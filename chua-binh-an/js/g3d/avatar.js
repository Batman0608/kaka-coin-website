/* =========================================================================
 *  NHÂN VẬT CHIBI 3D: đầu tròn lớn, áo tràng dáng chuông có dải vàng,
 *  chuỗi hạt đeo cổ, tay áo rộng, chân nhỏ — tô kiểu hoạt hình (toon).
 *  Khớp: hông → đùi → gối → bàn chân; vai → khuỷu → bàn tay; thân trên gập để lạy.
 *  Tư thế: idle (chắp tay) · walk · kneel · bow · lotus (thiền) · incense
 * ========================================================================= */
import { THREE } from '../temple3d.js';

const ROBES = { lam: 0x6f86b8, nau: 0x9a6a42, xam: 0x8c8f9a, trang: 0xeeeef4, vang: 0xf0b93a, tang: 0xd9822b };
const SKINS = [0xf2c9a2, 0xe6b48a, 0xf6d6b4, 0xd29e74];
const HAIRC = [0x1f1612, 0x2c1d14, 0x3a2618];
const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const T = (c, o = {}) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: grad }, o));
const part = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const put = (parent, m) => { parent.add(m); return m; };   // thêm chi tiết và trả về chính chi tiết đó
const pivot = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
const lathe = (pts, m) => part(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28), m);

const POSES = {
  idle:    { hipY: 0.5, torso: 0, head: 0, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -0.25, lElbow: -1.45, rArm: -0.25, rElbow: -1.45, armIn: 0.8, legOut: 0, skirt: 1 },
  kneel:   { hipY: 0.24, torso: 0.04, head: 0, lThigh: -1.45, lKnee: 1.5, rThigh: -1.45, rKnee: 1.5, lArm: -0.25, lElbow: -1.45, rArm: -0.25, rElbow: -1.45, armIn: 0.8, legOut: 0, skirt: 0.62 },
  bow:     { hipY: 0.24, torso: 1.15, head: 0.25, lThigh: -1.45, lKnee: 1.5, rThigh: -1.45, rKnee: 1.5, lArm: -1.5, lElbow: -0.2, rArm: -1.5, rElbow: -0.2, armIn: 0.15, legOut: 0, skirt: 0.62 },
  lotus:   { hipY: 0.18, torso: 0, head: 0.05, lThigh: -1.5, lKnee: 2.3, rThigh: -1.5, rKnee: 2.3, lArm: -0.15, lElbow: -1.0, rArm: -0.15, rElbow: -1.0, armIn: 0.5, legOut: 0.9, skirt: 0.5 },
  incense: { hipY: 0.5, torso: 0, head: -0.12, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -1.15, lElbow: -1.2, rArm: -1.15, rElbow: -1.2, armIn: 0.7, legOut: 0, skirt: 1 },
  standBow:{ hipY: 0.5, torso: 0.55, head: 0.2, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -0.5, lElbow: -1.4, rArm: -0.5, rElbow: -1.4, armIn: 0.8, legOut: 0, skirt: 1 }
};

export class Avatar {
  constructor({ look = {}, seed = 1, monk = false } = {}) {
    this.look = Object.assign({ g: 'nu', hair: 'bui', robe: 'lam' }, look);
    this.root = new THREE.Group(); this.root.userData.avatar = this;
    this.pose = Object.assign({}, POSES.idle); this.target = 'idle'; this.walkT = 0; this.speed = 0; this.bowT = -1; this.monk = monk;
    this.skin = SKINS[seed % 4]; this.hairC = HAIRC[(seed >> 2) % 3];
    this.build();
  }
  build() {
    const r = this.root; while (r.children.length) r.remove(r.children[0]);
    const L = this.look, nu = L.g === 'nu', sk = T(this.skin), robeC = ROBES[this.monk ? 'tang' : L.robe] || ROBES.lam;
    const robe = T(robeC), robeD = T(new THREE.Color(robeC).multiplyScalar(0.82)), gold = T(0xe0a93a), hairM = T(this.hairC), dark = T(0x2a1a14), bead = T(0xb7774a);
    this.hips = pivot(0, 0.5, 0); r.add(this.hips);
    // vạt áo dưới (dáng chuông)
    this.skirt = lathe([[0.001, -0.3], [0.37, -0.3], [0.35, -0.22], [0.3, -0.08], [0.26, 0.02], [0.001, 0.02]], robe); this.hips.add(this.skirt);
    put(this.hips, part(new THREE.TorusGeometry(0.36, 0.018, 6, 30), gold, 0, -0.29, 0)).rotation.x = Math.PI / 2;   // viền gấu áo
    // chân
    const leg = (sx) => {
      const thigh = pivot(sx * 0.1, -0.02, 0); this.hips.add(thigh);
      thigh.add(part(new THREE.CapsuleGeometry(0.055, 0.12, 4, 8), dark, 0, -0.1, 0));
      const knee = pivot(0, -0.22, 0); thigh.add(knee);
      knee.add(part(new THREE.CapsuleGeometry(0.05, 0.1, 4, 8), dark, 0, -0.09, 0));
      put(knee, part(new THREE.SphereGeometry(0.075, 10, 8), T(0x3a2418), 0, -0.22, 0.04)).scale.set(0.9, 0.55, 1.4);
      return { thigh, knee };
    };
    this.lLeg = leg(-1); this.rLeg = leg(1);
    // thân trên
    this.torso = pivot(0, 0, 0); this.hips.add(this.torso);
    this.torso.add(lathe([[0.001, 0], [0.26, 0], [0.24, 0.16], [0.21, 0.3], [0.15, 0.4], [0.07, 0.44], [0.001, 0.45]], robe));
    const sash = part(new THREE.TorusGeometry(0.22, 0.03, 8, 30), gold, 0, 0.2, 0); sash.rotation.set(Math.PI / 2 + 0.15, 0.55, 0); sash.scale.set(1.05, 1.05, 1); this.torso.add(sash);   // dải vàng chéo ngực
    const neck = pivot(0, 0.42, 0); this.torso.add(neck);
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; neck.add(part(new THREE.SphereGeometry(0.022, 6, 5), bead, Math.cos(a) * 0.13, -0.03 - Math.max(0, Math.sin(a)) * 0.05, Math.sin(a) * 0.11)); }   // chuỗi hạt
    // tay áo rộng
    const arm = (sx) => {
      const shoulder = pivot(sx * 0.19, 0.34, 0); this.torso.add(shoulder);
      shoulder.add(part(new THREE.CylinderGeometry(0.06, 0.085, 0.16, 12), robeD, 0, -0.08, 0));
      const elbow = pivot(0, -0.16, 0); elbow.rotation.order = 'YXZ'; shoulder.add(elbow);
      elbow.add(part(new THREE.CylinderGeometry(0.085, 0.115, 0.16, 12), robe, 0, -0.08, 0));
      elbow.add(part(new THREE.SphereGeometry(0.048, 10, 8), sk, 0, -0.18, 0));
      return { shoulder, elbow };
    };
    this.lArm = arm(-1); this.rArm = arm(1);
    this.incense = new THREE.Group(); this.incense.visible = false;
    [-0.025, 0.025].forEach(x => { this.incense.add(part(new THREE.CylinderGeometry(0.007, 0.007, 0.3, 5), T(0xb3261e), x, 0.13, 0)); this.incense.add(part(new THREE.SphereGeometry(0.016, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffa020 }), x, 0.29, 0)); });
    this.rArm.elbow.add(this.incense); this.incense.position.set(-0.07, -0.2, 0.04);
    // đầu to tròn
    const head = pivot(0, 0.45, 0); this.torso.add(head); this.head = head;
    const hr = nu ? 0.235 : 0.245;
    head.add(part(new THREE.SphereGeometry(hr, 28, 22), sk, 0, hr * 0.92, 0));
    const hy = hr * 0.92;
    [-1, 1].forEach(sx => {
      put(head, part(new THREE.SphereGeometry(0.028, 10, 8), T(0x1a1010), sx * 0.085, hy - 0.01, hr * 0.9)).scale.set(0.8, 1.15, 0.5);   // mắt
      head.add(part(new THREE.SphereGeometry(0.009, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }), sx * 0.085 + 0.008, hy + 0.005, hr * 0.95));
      put(head, part(new THREE.SphereGeometry(0.03, 8, 6), T(0xf3a0a0, { transparent: true, opacity: 0.55 }), sx * 0.14, hy - 0.06, hr * 0.84)).scale.set(1, 0.6, 0.4);   // má hồng
      put(head, part(new THREE.SphereGeometry(0.045, 8, 6), sk, sx * hr * 0.98, hy - 0.01, 0)).scale.set(0.5, 0.9, 0.7);   // tai
    });
    put(head, part(new THREE.TorusGeometry(0.03, 0.007, 4, 10, Math.PI), T(0x9a3a2a), 0, hy - 0.08, hr * 0.92)).rotation.z = Math.PI;   // miệng cười
    const hair = this.monk ? 'troc' : L.hair;
    if (hair !== 'troc') { const cap = part(new THREE.SphereGeometry(hr * 1.04, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM, 0, hy + 0.005, -0.012); cap.rotation.x = -0.42; head.add(cap); }
    if (hair === 'bui') {
      head.add(part(new THREE.SphereGeometry(0.11, 14, 10), hairM, 0, nu ? hy + 0.06 : hy + hr * 0.98, nu ? -hr * 0.9 : -0.05));
      if (nu) { put(head, part(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6), T(0xe9b949), 0.04, hy + 0.08, -hr * 0.95)).rotation.z = 1.2; put(head, part(new THREE.SphereGeometry(0.02, 6, 5), T(0xd9332a), 0.15, hy + 0.13, -hr * 0.95)); }
    }
    if (hair === 'dai') put(head, part(new THREE.CapsuleGeometry(0.15, nu ? 0.3 : 0.12, 6, 12), hairM, 0, hy - (nu ? 0.28 : 0.15), -hr * 0.72)).scale.set(1.15, 1, 0.45);
    if (hair === 'ngan') head.add(part(new THREE.SphereGeometry(hr * 1.06, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM, 0, hy + 0.01, -0.01));
    if (this.monk) put(this.torso, part(new THREE.TorusGeometry(0.2, 0.035, 6, 24), T(0xa83a14), 0, 0.2, 0)).rotation.set(Math.PI / 2 - 0.2, -0.6, 0);
    // vầng hào quang (khi được Phật Quang chiếu)
    this.halo = part(new THREE.RingGeometry(0.3, 0.36, 40), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }), 0, hy, -0.12); this.halo.visible = false; head.add(this.halo);
    this.apply();
  }
  setLook(look) { Object.assign(this.look, look); this.build(); }
  setPose(name) { if (POSES[name]) this.target = name; }
  setGlow(on) { this.halo.visible = !!on; }
  bow() { this.bowT = 0; }
  get height() { return this.pose.hipY + 1.0; }
  update(dt, moving) {
    const tgt = Object.assign({}, POSES[moving ? 'idle' : this.target]);
    if (moving) {
      this.walkT += dt * 9 * Math.max(0.6, this.speed);
      const s = Math.sin(this.walkT), a = 0.6 * Math.min(1, this.speed + 0.3);
      Object.assign(tgt, { lThigh: -s * a, rThigh: s * a, lKnee: Math.max(0, s) * a, rKnee: Math.max(0, -s) * a, lArm: s * a * 0.6 - 0.1, rArm: -s * a * 0.6 - 0.1, lElbow: -0.4, rElbow: -0.4, armIn: 0, hipY: 0.5 + Math.abs(Math.cos(this.walkT)) * 0.035 });
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
export { POSES, ROBES };
