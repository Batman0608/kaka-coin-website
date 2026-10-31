/* =========================================================================
 *  NHÂN VẬT 3D CÓ KHỚP: hông → đùi → gối → cẳng chân → bàn chân;
 *  vai → cánh tay → khuỷu → cẳng tay → bàn tay; thân trên gập được để lạy.
 *  Tư thế: idle (chắp tay) · walk · kneel · bow (lạy sát đất) · lotus (thiền) · incense
 * ========================================================================= */
import { THREE } from '../temple3d.js';

const ROBES = { lam: 0x7f93b6, nau: 0x9c6b45, xam: 0x8d8f98, trang: 0xe6e6ee, vang: 0xf0b93a, tang: 0xc8701a };
const SKINS = [0xe8b88a, 0xdca77a, 0xf0c9a0, 0xc99668];
const HAIRC = [0x1d120c, 0x2a1810, 0x3b2414];
const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75 }, o));
const part = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const pivot = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };

/* các tư thế: góc khớp (radian) và độ cao hông */
const POSES = {
  idle:   { hipY: 0.92, torso: 0, head: 0, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -0.35, lElbow: -1.5, rArm: -0.35, rElbow: -1.5, armIn: 0.68, legOut: 0 },
  kneel:  { hipY: 0.5, torso: 0.05, head: 0, lThigh: -0.15, lKnee: 1.62, rThigh: -0.15, rKnee: 1.62, lArm: -0.35, lElbow: -1.5, rArm: -0.35, rElbow: -1.5, armIn: 0.68, legOut: 0 },
  bow:    { hipY: 0.5, torso: 1.25, head: 0.2, lThigh: -0.15, lKnee: 1.62, rThigh: -0.15, rKnee: 1.62, lArm: -1.4, lElbow: -0.2, rArm: -1.4, rElbow: -0.2, armIn: 0.1, legOut: 0 },
  lotus:  { hipY: 0.24, torso: 0, head: 0.05, lThigh: -1.45, lKnee: 2.3, rThigh: -1.45, rKnee: 2.3, lArm: -0.25, lElbow: -1.1, rArm: -0.25, rElbow: -1.1, armIn: 0.35, legOut: 0.85 },
  incense:{ hipY: 0.92, torso: 0, head: -0.15, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -1.2, lElbow: -1.3, rArm: -1.2, rElbow: -1.3, armIn: 0.5, legOut: 0 },
  standBow:{ hipY: 0.92, torso: 0.6, head: 0.2, lThigh: 0, lKnee: 0, rThigh: 0, rKnee: 0, lArm: -0.6, lElbow: -1.4, rArm: -0.6, rElbow: -1.4, armIn: 0.68, legOut: 0 }
};

export class Avatar {
  constructor({ name = '', look = {}, seed = 1, monk = false } = {}) {
    this.look = Object.assign({ g: 'nu', hair: 'bui', robe: 'lam' }, look);
    this.root = new THREE.Group(); this.root.userData.avatar = this;
    this.pose = Object.assign({}, POSES.idle); this.target = 'idle'; this.walkT = 0; this.speed = 0; this.bowT = -1; this.monk = monk;
    this.skin = SKINS[seed % 4]; this.hairC = HAIRC[(seed >> 2) % 3];
    this.build();
  }
  build() {
    const r = this.root; while (r.children.length) r.remove(r.children[0]);
    const L = this.look, nu = L.g === 'nu', sk = M(this.skin), robe = M(ROBES[this.monk ? 'tang' : L.robe] || ROBES.lam), pants = M(0x3a3434), dark = M(this.hairC);
    const sh = nu ? 0.2 : 0.24;
    this.hips = pivot(0, 0.92, 0); r.add(this.hips);
    // váy áo tràng (phần dưới) — gắn ở hông, không gập theo thân
    const skirt = part(new THREE.CylinderGeometry(0.21, nu ? 0.33 : 0.35, 0.62, 16, 1, true), robe, 0, -0.3, 0); skirt.material.side = THREE.DoubleSide; this.hips.add(skirt);
    this.skirt = skirt;
    // chân
    const leg = (sx) => {
      const thigh = pivot(sx * 0.1, -0.02, 0); this.hips.add(thigh);
      thigh.add(part(new THREE.CapsuleGeometry(0.075, 0.32, 4, 8), pants, 0, -0.22, 0));
      const knee = pivot(0, -0.44, 0); thigh.add(knee);
      knee.add(part(new THREE.CapsuleGeometry(0.065, 0.32, 4, 8), pants, 0, -0.2, 0));
      const foot = part(new THREE.BoxGeometry(0.11, 0.07, 0.24), M(0x2a1a12), 0, -0.44, 0.05); knee.add(foot);
      return { thigh, knee };
    };
    this.lLeg = leg(-1); this.rLeg = leg(1);
    // thân trên (gập được)
    this.torso = pivot(0, 0, 0); this.hips.add(this.torso);
    this.torso.add(part(new THREE.CylinderGeometry(sh * 0.95, 0.22, 0.55, 16), robe, 0, 0.28, 0));
    this.torso.add(part(new THREE.SphereGeometry(sh, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), robe, 0, 0.55, 0));
    this.torso.add(part(new THREE.TorusGeometry(0.11, 0.02, 6, 16, Math.PI), M(0xffffff, { roughness: 0.6 }), 0, 0.58, 0.06)).rotation.x = Math.PI / 2;   // cổ áo
    // tay (tay áo rộng)
    const arm = (sx) => {
      const shoulder = pivot(sx * sh * 0.95, 0.5, 0); this.torso.add(shoulder);
      shoulder.add(part(new THREE.CylinderGeometry(0.06, 0.1, 0.3, 10), robe, 0, -0.15, 0));
      const elbow = pivot(0, -0.3, 0); elbow.rotation.order = 'YXZ'; shoulder.add(elbow);   // gập trước rồi xoay vào trong → chắp tay
      elbow.add(part(new THREE.CylinderGeometry(0.1, 0.13, 0.26, 10), robe, 0, -0.13, 0));
      elbow.add(part(new THREE.SphereGeometry(0.055, 10, 8), sk, 0, -0.3, 0));
      return { shoulder, elbow };
    };
    this.lArm = arm(-1); this.rArm = arm(1);
    // hương cầm tay
    this.incense = new THREE.Group(); this.incense.visible = false;
    [-0.03, 0.03].forEach(x => { this.incense.add(part(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 5), M(0xb3261e), x, 0.17, 0)); this.incense.add(part(new THREE.SphereGeometry(0.018, 6, 4), M(0xffb030, { emissive: 0xff6a00, emissiveIntensity: 2 }), x, 0.35, 0)); });
    this.rArm.elbow.add(this.incense); this.incense.position.set(-0.08, -0.32, 0.05);
    // đầu
    this.neck = pivot(0, 0.6, 0); this.torso.add(this.neck);
    this.neck.add(part(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), sk, 0, 0.04, 0));
    const head = pivot(0, 0.2, 0); this.neck.add(head); this.head = head;
    head.add(part(new THREE.SphereGeometry(nu ? 0.13 : 0.14, 18, 14), sk));
    [-1, 1].forEach(sx => { head.add(part(new THREE.SphereGeometry(0.025, 6, 4), M(0x1a1010), sx * 0.045, 0.01, 0.125)); head.add(part(new THREE.SphereGeometry(0.03, 6, 4), sk, sx * 0.135, 0, 0)); });
    head.add(part(new THREE.TorusGeometry(0.03, 0.007, 4, 8, Math.PI), M(0x8a3a2a), 0, -0.055, 0.12)).rotation.z = Math.PI;
    const hair = this.monk ? 'troc' : L.hair, hr = nu ? 0.135 : 0.145;
    if (hair !== 'troc') { const cap = part(new THREE.SphereGeometry(hr, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), dark, 0, 0.012, -0.014); cap.rotation.x = -0.35; head.add(cap); }
    if (hair === 'bui') head.add(part(new THREE.SphereGeometry(0.065, 10, 8), dark, 0, nu ? 0.04 : 0.13, nu ? -0.14 : -0.03));
    if (hair === 'bui' && nu) head.add(part(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 5), M(0xe9b949, { metalness: 0.7 }), 0.03, 0.06, -0.15)).rotation.z = 1.2;
    if (hair === 'dai') { const back = part(new THREE.BoxGeometry(0.24, nu ? 0.42 : 0.26, 0.06), dark, 0, nu ? -0.17 : -0.08, -0.12); head.add(back); }
    if (hair === 'ngan') head.add(part(new THREE.SphereGeometry(hr * 1.02, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), dark, 0, 0.02, -0.01));
    if (this.monk) this.torso.add(part(new THREE.TorusGeometry(0.2, 0.03, 6, 20, Math.PI), M(0xa86d14), 0, 0.35, 0)).rotation.set(0.4, 0, 0.8);
    this.apply();
  }
  setLook(look) { Object.assign(this.look, look); this.build(); }
  setPose(name) { if (POSES[name]) this.target = name; }
  bow() { this.bowT = 0; }
  update(dt, moving) {
    // nhịp đi
    const T = moving ? 'walk' : this.target;
    const tgt = Object.assign({}, POSES[T === 'walk' ? 'idle' : T]);
    if (moving) {
      this.walkT += dt * 8 * Math.max(0.6, this.speed);
      const s = Math.sin(this.walkT), a = 0.55 * Math.min(1, this.speed + 0.3);
      Object.assign(tgt, { lThigh: -s * a, rThigh: s * a, lKnee: Math.max(0, s) * a * 1.2, rKnee: Math.max(0, -s) * a * 1.2, lArm: s * a * 0.7, rArm: -s * a * 0.7, lElbow: -0.3, rElbow: -0.3, armIn: 0, hipY: 0.92 + Math.abs(Math.cos(this.walkT)) * 0.03 });
    }
    // lạy: một nhịp xuống – lên
    if (this.bowT >= 0) {
      this.bowT += dt;
      const kneeling = this.target === 'kneel' || this.target === 'bow';
      const peak = kneeling ? POSES.bow : POSES.standBow;
      const k = Math.sin(Math.min(1, this.bowT / 2.2) * Math.PI);
      for (const key in peak) tgt[key] = tgt[key] + (peak[key] - tgt[key]) * k;
      if (this.bowT > 2.2) this.bowT = -1;
    }
    const lerp = 1 - Math.pow(0.0005, dt);
    for (const key in tgt) this.pose[key] += (tgt[key] - this.pose[key]) * (moving ? Math.min(1, lerp * 3) : lerp);
    this.incense.visible = this.target === 'incense';
    this.apply();
  }
  apply() {
    const p = this.pose;
    this.hips.position.y = p.hipY;
    this.torso.rotation.x = p.torso; this.head.rotation.x = p.head;
    this.lLeg.thigh.rotation.set(p.lThigh, 0, -p.legOut); this.rLeg.thigh.rotation.set(p.rThigh, 0, p.legOut);
    this.lLeg.knee.rotation.x = p.lKnee; this.rLeg.knee.rotation.x = p.rKnee;
    this.lArm.shoulder.rotation.set(p.lArm, 0, p.armIn * 0.15); this.rArm.shoulder.rotation.set(p.rArm, 0, -p.armIn * 0.15);
    this.lArm.elbow.rotation.set(p.lElbow, p.armIn, 0); this.rArm.elbow.rotation.set(p.rElbow, -p.armIn, 0);
    this.skirt.scale.y = 1 - Math.max(0, 0.92 - p.hipY) * 0.9;
    this.skirt.position.y = -0.3 * this.skirt.scale.y;
  }
}
export { POSES, ROBES };
