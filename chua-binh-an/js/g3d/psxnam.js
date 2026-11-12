/* =========================================================================
 *  NHÂN VẬT NGƯỜI CHƠI NAM — mô hình 3D có khung xương
 *  Mô hình gốc: “PSX Avatar – May” — Emotenshi (Sketchfab, CC BY 4.0)
 *  https://sketchfab.com/3d-models/psx-avatar-may-ce84af593d2f461bb312e60ee0544b2d
 *  Đã chỉnh: vẽ lại áo phông → áo tràng (màu theo áo người chơi chọn), quần jean → quần
 *  ống rộng trơn, giày thể thao → giày vải; gắn thêm vạt áo dài & tay áo dài vào xương.
 *  Tư thế dùng chung bộ thông số với nhân vật chibi (hông, thân, đầu, đùi, gối, vai,
 *  khuỷu, vạt áo) nên mọi động tác cũ (đi, quỳ, lạy, thiền, thắp hương, khiêng kiệu) đều chạy.
 * ========================================================================= */
import { THREE } from '../temple3d.js';
import { GLTFLoader } from '../../vendor/three/addons/GLTFLoader.js';

const URL = 'assets/nhanvat/nam.glb', HEIGHT = 1.62;
let _buf = null;
const getBuf = () => _buf || (_buf = fetch(URL).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }));
export const preloadPsx = () => getBuf().catch(() => null);

/* ---- ảnh vân: vẽ lại áo / quần / giày theo màu áo tràng ---- */
const _tex = new Map();
function paintTex(img, robe, pants) {
  const key = robe + '|' + pants; if (_tex.has(key)) return _tex.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.drawImage(img, 0, 0, 512, 512);
  const hex = (n) => '#' + n.toString(16).padStart(6, '0'), dim = (n, k) => { const C = new THREE.Color(n).multiplyScalar(k); return '#' + C.getHexString(); };
  // áo (góc trên trái 256×256): nền màu áo, vân vải nhẹ, vạt chéo giao lĩnh & nẹp cổ sẫm
  g.fillStyle = hex(robe); g.fillRect(0, 0, 256, 256);
  g.fillStyle = dim(robe, 0.93); for (let y = 0; y < 256; y += 3) for (let x = (y % 6) ? 0 : 1; x < 256; x += 4) if ((x * 7 + y * 13) % 5 === 0) g.fillRect(x, y, 1, 1);
  g.fillStyle = dim(robe, 0.72); g.beginPath(); g.moveTo(30, 140); g.lineTo(46, 140); g.lineTo(120, 256); g.lineTo(104, 256); g.fill();
  g.fillStyle = dim(robe, 0.8); g.beginPath(); g.moveTo(110, 140); g.lineTo(126, 140); g.lineTo(52, 256); g.lineTo(36, 256); g.fill();
  g.fillStyle = dim(robe, 0.7); g.fillRect(0, 0, 256, 10);
  // quần ống rộng trơn (bỏ túi hộp, đường may jean) + gấu quần
  g.fillStyle = hex(pants); g.fillRect(256, 0, 126, 256); g.fillRect(382, 60, 130, 196);
  g.fillStyle = dim(pants, 0.82); g.fillRect(256, 236, 126, 20);
  // giày vải đen đế ngà
  g.fillStyle = '#28221e'; g.fillRect(382, 0, 130, 60); g.fillStyle = '#c8beaa'; g.fillRect(382, 52, 130, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  _tex.set(key, t); return t;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z), Q = () => new THREE.Quaternion();
const AX = V(1, 0, 0), AY = V(0, 1, 0), AZ = V(0, 0, 1);
const qa = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);

/* gắn mô hình vào nhân vật (bất đồng bộ: trong lúc tải vẫn hiện nhân vật chibi) */
export function usePsx(av, robeColor) {
  const tok = {}; av._psxTok = tok;
  getBuf().then(b => new GLTFLoader().parseAsync(b.slice(0), '')).then(gl => { if (av._psxTok === tok) mount(av, gl.scene, robeColor); })
    .catch(e => console.warn('[Nhân vật nam 3D]', e));
}

function mount(av, scene, robe) {
  const light = new THREE.Color(robe).getHSL({}).l > 0.6, pants = light ? 0x3b3742 : 0xe9dfcb;
  // vật liệu: bỏ "unlit" để có sáng tối như cảnh (ban đêm không phát sáng)
  let tex = null;
  scene.traverse(o => { if (!o.isMesh) return; const m = o.material; if (!tex && m.map && m.map.image) tex = paintTex(m.map.image, robe, pants);
    o.material = new THREE.MeshLambertMaterial({ map: tex || m.map, side: THREE.DoubleSide }); o.castShadow = true; o.frustumCulled = false; });
  const box = new THREE.Group(); box.rotation.y = Math.PI; box.add(scene);   // mô hình gốc quay mặt về -z → xoay lại về +z như nhân vật chibi
  const holder = new THREE.Group(); holder.add(box); holder.updateMatrixWorld(true);
  const B = {}; scene.traverse(b => { if (b.isBone) B[b.name.replace(/_\d+$/, '').replace(/\./g, '')] = b; });
  const need = ['Pelvis', 'Belly', 'Chest', 'Neck', 'Head', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR', 'upper_armL', 'forearmL', 'handL', 'upper_armR', 'forearmR', 'handR'];
  if (need.some(k => !B[k])) { console.warn('[Nhân vật nam 3D] thiếu xương'); return; }
  const wp = (o) => o.getWorldPosition(V()), wq = (o) => o.getWorldQuaternion(Q());
  // 1) đưa về tư thế đứng thẳng: thân & cổ thẳng đứng, chân & tay buông thẳng (mô hình gốc đứng dạng chân, tay chống cằm)
  const aim = (bone, child, dir) => { holder.updateMatrixWorld(true); const d = wp(child).sub(wp(bone)).normalize(); const nw = new THREE.Quaternion().setFromUnitVectors(d, dir.clone().normalize()).multiply(wq(bone));
    bone.quaternion.copy(wq(bone.parent).invert().multiply(nw)); holder.updateMatrixWorld(true); };
  const side = (b) => Math.sign(wp(b).x) || 1;
  aim(B.Belly, B.Chest, AY); aim(B.Chest, B.Neck, AY); aim(B.Neck, B.Head, AY);
  for (const s of ['L', 'R']) { const sx = side(B['thigh' + s]);
    aim(B['thigh' + s], B['shin' + s], V(sx * 0.06, -1, 0)); aim(B['shin' + s], B['foot' + s], V(0, -1, 0));
    const ux = side(B['upper_arm' + s]); aim(B['upper_arm' + s], B['forearm' + s], V(ux * 0.22, -1, 0)); aim(B['forearm' + s], B['hand' + s], V(ux * 0.05, -1, 0.05));
    const f = B['Fingers' + s]; if (f) aim(B['hand' + s], f, V(0, -1, 0.1)); }
  // 2) chia tỉ lệ & đặt chân chạm đất
  holder.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(holder, true), k = HEIGHT / (bb.max.y - bb.min.y);
  holder.scale.setScalar(k); holder.updateMatrixWorld(true);
  const bb2 = new THREE.Box3().setFromObject(holder, true); const lift = -bb2.min.y; holder.position.y = lift; holder.updateMatrixWorld(true);
  const pelvisY = wp(B.Pelvis).y;
  // 3) lưu tư thế gốc (cục bộ & theo khung thân người) của các xương sẽ cử động
  const J = {};
  const keep = (name) => { const b = B[name]; J[name] = { b, nl: b.quaternion.clone(), nw: wq(b).premultiply(wq(holder).invert()), s: side(b) }; };
  ['Belly', 'Head', 'thighL', 'thighR', 'shinL', 'shinR', 'upper_armL', 'upper_armR', 'forearmL', 'forearmR'].forEach(keep);
  const set = (name, D) => { const j = J[name], nwInv = j.nw.clone().invert(); j.b.quaternion.copy(j.nl).multiply(nwInv.multiply(D).multiply(j.nw)); };
  // 4) vạt áo tràng dài & tay áo dài (gắn vào xương, cử động theo)
  const robeM = new THREE.MeshLambertMaterial({ color: robe, side: THREE.DoubleSide }), hemM = new THREE.MeshLambertMaterial({ color: new THREE.Color(robe).multiplyScalar(0.72), side: THREE.DoubleSide });
  const top = wp(B.Belly).y, shin = wp(B.shinL).y, foot = wp(B.footL).y, bot = shin - (shin - foot) * 0.5, hw = Math.abs(wp(B.thighL).x - wp(B.thighR).x) * 0.95 + 0.05;
  const skirt = new THREE.Group(); skirt.position.copy(V(wp(B.Pelvis).x, top, wp(B.Pelvis).z)); holder.attach(skirt);
  { const L = top - bot; const g1 = new THREE.CylinderGeometry(hw * 0.95, hw * 1.45, L, 16, 1, true); g1.translate(0, -L / 2, 0); const m1 = new THREE.Mesh(g1, robeM); m1.scale.z = 0.8; m1.castShadow = true; skirt.add(m1);
    const g2 = new THREE.CylinderGeometry(hw * 1.46, hw * 1.47, L * 0.06, 16, 1, true); g2.translate(0, -L + L * 0.03, 0); const m2 = new THREE.Mesh(g2, hemM); m2.scale.z = 0.8; skirt.add(m2); }
  const pelvisB = B.Pelvis; pelvisB.attach(skirt); const s0 = skirt.scale.clone();
  const tube = (bone, p0, p1, r0, r1) => { const L = p0.distanceTo(p1); const g = new THREE.CylinderGeometry(r1, r0, L, 10, 1, true); g.translate(0, L / 2, 0);
    const m = new THREE.Mesh(g, robeM); m.quaternion.setFromUnitVectors(AY, p1.clone().sub(p0).normalize()); m.position.copy(p0); m.castShadow = true; holder.attach(m); bone.attach(m); };
  for (const s of ['L', 'R']) { const a = wp(B['upper_arm' + s]), b = wp(B['forearm' + s]), c = wp(B['hand' + s]), rr = a.distanceTo(b) * 0.2;
    tube(B['upper_arm' + s], a, b, rr * 1.05, rr * 1.05); tube(B['forearm' + s], b, c.clone().lerp(b, 0.05), rr * 1.05, rr * 1.55); }
  // 5) nén hương cầm tay phải, vầng hào quang sau đầu
  const inc = new THREE.Group(); inc.visible = false;
  [-0.025, 0.025].forEach(x => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.3, 5), new THREE.MeshLambertMaterial({ color: 0xb3261e })); st.position.set(x, 0.13, 0); inc.add(st);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff7a3a })); tip.position.set(x, 0.28, 0); inc.add(tip); });
  { const hp = wp(B.handR); inc.position.copy(hp).add(V(0, 0.02, 0.06)); holder.attach(inc); B.handR.attach(inc); }
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 40), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
  halo.visible = !!(av.halo && av.halo.visible); { const hp = wp(B.Head); halo.position.copy(hp).add(V(0, 0.12, -0.16)); holder.attach(halo); B.Head.attach(halo); }
  // 6) thay phần thân chibi bằng mô hình (giữ vòng hào quang công đức dưới chân)
  const r = av.root; [...r.children].forEach(c => { if (c !== av.aura && c !== av.auraLight) r.remove(c); });
  r.add(holder); av.incense = inc; av.halo = halo;
  const hipK = pelvisY / 0.5;   // hipY của bộ tư thế (0.5 khi đứng) → độ cao hông thật của mô hình
  av.psx = {
    apply(p) {
      holder.position.y = lift + (p.hipY - 0.5) * hipK * 0.92;
      set('Belly', qa(AX, p.torso)); set('Head', qa(AX, p.head));
      for (const s of ['L', 'R']) { const j = J['thigh' + s], sx = j.s, left = s === 'L';
        const sw = left ? p.lThigh : p.rThigh, kn = left ? p.lKnee : p.rKnee, ar = left ? p.lArm : p.rArm, el = left ? p.lElbow : p.rElbow;
        set('thigh' + s, qa(AX, sw).multiply(qa(AZ, sx * p.legOut * 0.9)));
        set('shin' + s, qa(AX, kn));
        set('upper_arm' + s, qa(AX, ar * 0.95).multiply(qa(AZ, -sx * p.armIn * 0.18)));
        set('forearm' + s, qa(AY, -sx * p.armIn * 0.45).multiply(qa(AX, el)));
      }
      const wk = 1 + (1 - p.skirt) * 0.35; skirt.scale.set(s0.x * wk, s0.y * Math.max(0.35, p.skirt), s0.z * wk);
    },
  };
  av.apply();
}
