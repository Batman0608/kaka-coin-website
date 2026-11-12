/* =========================================================================
 *  SƯ THẦY & SƯ TRỤ TRÌ — mô hình 3D thật
 *  Mô hình gốc: “Monk Rigged 3D Model” — CG-Moon (Sketchfab, CC BY 4.0)
 *  https://sketchfab.com/3d-models/monk-rigged-3d-model-999aac12a3354a10862ae87f1eaee31c
 *  Bản tải về là khối tĩnh (không có xương) → ở đây tự dựng khung xương & tính trọng số
 *  da theo vùng cơ thể, rồi dùng chung bộ thông số tư thế với nhân vật chibi/nam
 *  (đi, quỳ, lạy, ngồi kiết già tụng kinh, thắp hương).
 *  Trang phục vẽ lại theo sư Việt:
 *   · Sư trụ trì: áo hậu vàng, cà sa đỏ thẫm ghép mảnh (đường ghép vàng kim).
 *   · Sư thầy:    áo hậu vàng, cà sa vàng nghệ ghép mảnh.
 * ========================================================================= */
import { THREE } from '../temple3d.js';
import { GLTFLoader } from '../../vendor/three/addons/GLTFLoader.js';

const URL = 'assets/nhanvat/su.glb', HEIGHT = 1.62;
const STYLE = {
  tru: { robe: [233, 186, 72], casa: [150, 36, 22], seam: [238, 196, 92] },    // trụ trì
  su:  { robe: [236, 196, 96], casa: [222, 132, 36], seam: [250, 214, 120] },   // sư thầy
};
let _buf = null;
const getBuf = () => _buf || (_buf = fetch(URL).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }));
export const preloadMonk = () => getBuf().catch(() => null);

/* ---- tô lại vải: vải trắng → màu áo (giữ sáng tối nếp vải); vùng cà sa: mảng trắng → màu cà sa, đường ghép → vàng kim ---- */
const _tex = new Map();
function recolor(img, kind, part) {
  const key = kind + part; if (_tex.has(key)) return _tex.get(key);
  const S = STYLE[kind], c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 512, 512);
  const D = g.getImageData(0, 0, 512, 512), a = D.data;
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i], gg = a[i + 1], b = a[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0, v = mx / 255;
    const px = (i / 4) % 512, py = (i / 4) / 512 | 0;
    if (part === 'casa') {   // tấm cà sa: mảng vải trắng & mảng vàng nhạt
      if (sat < 0.22 && v > 0.45) { const k = v * 1.05; a[i] = S.casa[0] * k; a[i + 1] = S.casa[1] * k; a[i + 2] = S.casa[2] * k; }
      else if (r > gg && gg > b && sat < 0.6 && v > 0.4) { const k = v * 1.0; a[i] = S.seam[0] * k; a[i + 1] = S.seam[1] * k; a[i + 2] = S.seam[2] * k; }
    } else {
      const skin = px < 140 && py > 300 || (px > 380 && px < 500 && py > 250 && py < 320);   // mặt & bàn tay giữ nguyên
      if (!skin && sat < 0.2 && v > 0.5) { const k = Math.min(1.08, v * 1.06); a[i] = S.robe[0] * k; a[i + 1] = S.robe[1] * k; a[i + 2] = S.robe[2] * k; }
    }
  }
  g.putImageData(D, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; _tex.set(key, t); return t;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z), Q = () => new THREE.Quaternion();
const AX = V(1, 0, 0), AY = V(0, 1, 0), AZ = V(0, 0, 1);
const qa = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function useMonk(av, kind) {
  const tok = {}; av._psxTok = tok;
  getBuf().then(b => new GLTFLoader().parseAsync(b.slice(0), '')).then(gl => { if (av._psxTok === tok) mount(av, gl.scene, STYLE[kind] ? kind : 'su'); })
    .catch(e => console.warn('[Sư thầy 3D]', e));
}

/* đoạn thẳng gần nhất: khoảng cách từ p tới đoạn ab, kèm tham số t */
function seg(p, a, b) { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return [p.distanceTo(a.clone().addScaledVector(ab, t)), t]; }

function mount(av, scene, kind) {
  scene.updateMatrixWorld(true);
  const meshes = []; scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) return;
  // ---- gom đỉnh về toạ độ mô hình, tìm khung người ----
  const bb = new THREE.Box3(); meshes.forEach(m => bb.expandByObject(m));
  const H = bb.max.y - bb.min.y, y0 = bb.min.y;
  let tip = 0, tipY = 0; meshes[0].geometry.attributes.position; meshes.forEach(m => { const p = m.geometry.attributes.position, v = V();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (v.x > tip) { tip = v.x; tipY = v.y; } } });
  const J = {   // vị trí khớp ước lượng theo tỉ lệ cơ thể (mô hình đứng chữ T, mặt nhìn +z)
    pelvis: V(0, y0 + 0.53 * H, 0), belly: V(0, y0 + 0.62 * H, 0), chest: V(0, y0 + 0.72 * H, 0), neck: V(0, y0 + 0.83 * H, 0), head: V(0, y0 + 0.87 * H, 0), top: V(0, y0 + H, 0) };
  for (const s of [1, -1]) { const sh = V(s * 0.11 * H, y0 + 0.79 * H, 0), hand = V(s * tip, tipY, 0), el = sh.clone().lerp(hand, 0.47), wr = sh.clone().lerp(hand, 0.83);
    const L = s > 0 ? 'L' : 'R';
    Object.assign(J, { ['sh' + L]: sh, ['el' + L]: el, ['wr' + L]: wr, ['tip' + L]: hand,
      ['hip' + L]: V(s * 0.055 * H, y0 + 0.5 * H, 0), ['kn' + L]: V(s * 0.06 * H, y0 + 0.27 * H, 0.01), ['an' + L]: V(s * 0.065 * H, y0 + 0.05 * H, 0) }); }
  // ---- khung xương ----
  const mk = (name, at, parent) => { const b = new THREE.Bone(); b.name = name; const pw = parent ? parent.userData.at : V(); b.position.copy(at.clone().sub(pw)); b.userData.at = at.clone(); if (parent) parent.add(b); return b; };
  const B = {}; B.Pelvis = mk('Pelvis', J.pelvis); B.Belly = mk('Belly', J.belly, B.Pelvis); B.Chest = mk('Chest', J.chest, B.Belly); B.Neck = mk('Neck', J.neck, B.Chest); B.Head = mk('Head', J.head, B.Neck); B.Top = mk('Top', J.top, B.Head);
  for (const L of ['L', 'R']) { B['upper_arm' + L] = mk('ua' + L, J['sh' + L], B.Chest); B['forearm' + L] = mk('fa' + L, J['el' + L], B['upper_arm' + L]); B['hand' + L] = mk('ha' + L, J['wr' + L], B['forearm' + L]); B['Fingers' + L] = mk('fi' + L, J['tip' + L], B['hand' + L]);
    B['thigh' + L] = mk('th' + L, J['hip' + L], B.Pelvis); B['shin' + L] = mk('sn' + L, J['kn' + L], B['thigh' + L]); B['foot' + L] = mk('ft' + L, J['an' + L], B['shin' + L]); }
  const bones = Object.values(B), idx = new Map(bones.map((b, i) => [b, i]));
  // ---- trọng số da theo vùng ----
  const W = (p, isCasa) => {
    const out = new Map(), add = (b, w) => { if (w > 1e-3) out.set(b, (out.get(b) || 0) + w); };
    const ax = Math.abs(p.x), s = p.x >= 0 ? 'L' : 'R', armK = sm(0.11 * H, 0.16 * H, ax) * sm(0.47 * H, 0.52 * H, p.y);   // tay chéo xuống (chữ A): vai 0.8H → đầu ngón 0.55H
    if (armK > 0) { const [d1, t1] = seg(p, J['sh' + s], J['el' + s]), [d2] = seg(p, J['el' + s], J['wr' + s]), [d3] = seg(p, J['wr' + s], J['tip' + s]);
      const ws = [1 / (d1 * d1 + 1e-3), 1 / (d2 * d2 + 1e-3), 1 / (d3 * d3 + 1e-3)], tot = ws[0] + ws[1] + ws[2];
      add(B['upper_arm' + s], armK * ws[0] / tot); add(B['forearm' + s], armK * ws[1] / tot); add(B['hand' + s], armK * ws[2] / tot); }
    const rest = 1 - armK; if (rest <= 0) return out;
    if (p.y >= J.pelvis.y - 0.02 * H) {   // thân trên
      const kh = sm(J.neck.y, J.head.y + 0.02 * H, p.y), kc = sm(J.belly.y, J.chest.y + 0.04 * H, p.y) * (1 - kh), kb = sm(J.pelvis.y - 0.02 * H, J.belly.y + 0.02 * H, p.y) * (1 - kh - kc), kp = 1 - kh - kc - kb;
      add(B.Head, rest * kh); add(B.Chest, rest * kc); add(B.Belly, rest * kb); add(B.Pelvis, rest * kp);
    } else {   // dưới hông: chân (vạt áo giữa hai chân chia đều hai bên)
      const lw = sm(-0.05 * H, 0.05 * H, p.x), rw = 1 - lw, kHip = sm(J.pelvis.y - 0.14 * H, J.pelvis.y, p.y), stiff = isCasa ? 0.6 : 0;
      for (const [L, wl] of [['L', lw], ['R', rw]]) { if (wl < 1e-3) continue;
        const kKnee = sm(J['kn' + L].y + 0.06 * H, J['kn' + L].y - 0.06 * H, p.y), kFoot = sm(J['an' + L].y + 0.06 * H, J['an' + L].y - 0.02 * H, p.y);
        const legW = rest * wl * (1 - kHip * 0.5) * (1 - stiff);
        add(B['thigh' + L], legW * (1 - kKnee)); add(B['shin' + L], legW * kKnee * (1 - kFoot)); add(B['foot' + L], legW * kFoot); }
      add(B.Pelvis, rest * (kHip * 0.5 + stiff));
    }
    return out;
  };
  const S = STYLE[kind];
  const root = new THREE.Group();
  meshes.forEach((m, mi) => {
    const isCasa = m.geometry.attributes.position.count < 300;   // tấm cà sa là khối nhỏ (≈95 đỉnh)
    const geo = m.geometry.clone(); geo.applyMatrix4(m.matrixWorld);
    const pos = geo.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), v = V();
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i); const w = [...W(v, isCasa).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); const tot = w.reduce((s2, e) => s2 + e[1], 0) || 1;
      w.forEach(([b, x], k) => { si[i * 4 + k] = idx.get(b); sw[i * 4 + k] = x / tot; }); if (!w.length) { si[i * 4] = idx.get(B.Pelvis); sw[i * 4] = 1; } }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    const img = m.material.map && m.material.map.image;
    const mat = new THREE.MeshLambertMaterial({ map: img ? recolor(img, kind, isCasa ? 'casa' : 'body') : null, side: THREE.DoubleSide });
    const sk = new THREE.SkinnedMesh(geo, mat); sk.castShadow = true; sk.frustumCulled = false; root.add(sk); m.userData.sk = sk;
  });
  root.add(B.Pelvis); root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones); root.children.forEach(c => { if (c.isSkinnedMesh) c.bind(skeleton); });
  // ---- tư thế đứng: tay buông xuôi ----
  const holder = new THREE.Group(); holder.add(root); holder.updateMatrixWorld(true);
  const wp = (o) => o.getWorldPosition(V()), wq = (o) => o.getWorldQuaternion(Q());
  const aim = (bone, child, dir) => { holder.updateMatrixWorld(true); const d = wp(child).sub(wp(bone)).normalize(); const nw = new THREE.Quaternion().setFromUnitVectors(d, dir.clone().normalize()).multiply(wq(bone));
    bone.quaternion.copy(wq(bone.parent).invert().multiply(nw)); holder.updateMatrixWorld(true); };
  const side = (b) => Math.sign(wp(b).x) || 1;
  for (const s of ['L', 'R']) { const ux = side(B['upper_arm' + s]); aim(B['upper_arm' + s], B['forearm' + s], V(ux * 0.3, -1, 0.05)); aim(B['forearm' + s], B['hand' + s], V(ux * 0.08, -1, 0.12)); }
  const k = HEIGHT / H; holder.scale.setScalar(k); holder.position.y = -y0 * k; holder.updateMatrixWorld(true);
  const lift = holder.position.y, pelvisY = wp(B.Pelvis).y;
  const JN = {};
  const keep = (name) => { const b = B[name]; JN[name] = { b, nl: b.quaternion.clone(), nw: wq(b).premultiply(wq(holder).invert()), s: side(b) }; };
  ['Belly', 'Head', 'thighL', 'thighR', 'shinL', 'shinR', 'upper_armL', 'upper_armR', 'forearmL', 'forearmR'].forEach(keep);
  const set = (name, D) => { const j = JN[name], nwInv = j.nw.clone().invert(); j.b.quaternion.copy(j.nl).multiply(nwInv.multiply(D).multiply(j.nw)); };
  // nén hương tay phải, vầng hào quang sau đầu
  const inc = new THREE.Group(); inc.visible = false;
  [-0.025, 0.025].forEach(x => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.3, 5), new THREE.MeshLambertMaterial({ color: 0xb3261e })); st.position.set(x, 0.13, 0); inc.add(st);
    const tp = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff7a3a })); tp.position.set(x, 0.28, 0); inc.add(tp); });
  { inc.position.copy(wp(B.handR)).add(V(0, 0.02, 0.06)); holder.attach(inc); B.handR.attach(inc); }
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 40), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
  halo.visible = !!(av.halo && av.halo.visible); { halo.position.copy(wp(B.Head)).add(V(0, 0.12, -0.18)); holder.attach(halo); B.Head.attach(halo); }
  // tràng hạt nâu đeo cổ (trụ trì)
  if (kind === 'tru') { const mala = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 6, 24), new THREE.MeshLambertMaterial({ color: 0x5a2a12 })); mala.position.copy(wp(B.Neck)).add(V(0, -0.1, 0.06)); mala.rotation.x = Math.PI / 2 - 0.35; holder.attach(mala); B.Chest.attach(mala); }
  // ---- thay thân chibi ----
  const r = av.root; [...r.children].forEach(c => { if (c !== av.aura && c !== av.auraLight) r.remove(c); });
  r.add(holder); av.incense = inc; av.halo = halo;
  const hipK = pelvisY / 0.5;
  av.psx = {
    apply(p) {
      holder.position.y = lift + (p.hipY - 0.5) * hipK * 0.95;
      set('Belly', qa(AX, p.torso)); set('Head', qa(AX, p.head));
      for (const s of ['L', 'R']) { const sx = JN['thigh' + s].s, left = s === 'L';
        const sw = left ? p.lThigh : p.rThigh, kn = left ? p.lKnee : p.rKnee, ar = left ? p.lArm : p.rArm, el = left ? p.lElbow : p.rElbow;
        set('thigh' + s, qa(AX, sw).multiply(qa(AZ, sx * p.legOut * 0.9)));
        set('shin' + s, qa(AX, kn));
        set('upper_arm' + s, qa(AX, ar * 0.95).multiply(qa(AZ, -sx * p.armIn * 0.18)));
        set('forearm' + s, qa(AY, -sx * p.armIn * 0.45).multiply(qa(AX, el)));
      }
    },
  };
  av.apply();
}
