/* =========================================================================
 *  THẾ GIỚI 3D CỦA TỪNG CHÙA: dựng cảnh, va chạm, địa hình (núi leo được,
 *  bậc thềm bước được), địa danh khám phá, bến thuyền, sư trụ trì.
 * ========================================================================= */
import { THREE, buildLandmark, interiorHall, plaque, HALLS, box, mat, water, tree, LEAF, STONE } from '../temple3d.js';

/* bố cục từng chùa: chỗ xuất hiện, địa danh [tên, x, z, bán kính, lời giới thiệu, hành động?], công trình thêm */
export const LAYOUT = {
  'binh-an': { yard: [{ r: [-15, -12, 15, 17], gate: ['+z', 0, 5] }],  spawn: [0, 22], abbot: [3.5, 7], pois: [
    ['Chánh điện', 0, 1, 6, 'Nơi thờ Tam Thế Phật. Vào trong, chọn một đệm để ngồi và lễ Phật.'],
    ['Lư hương trước sân', 0, 12, 3, 'Thắp nén hương, nguyện cho người thân bình an.'],
    ['Hàng cây trong vườn chùa', -8, 4, 4, 'Bóng cây che mát sân chùa — nơi Phật tử nghỉ chân.']] },
  'bai-dinh': { yard: [{ r: [-23, -17, 23, 19], gate: ['+z', 0, 6] }],  spawn: [0, 26], abbot: [4, 14], pois: [
    ['Điện Pháp Chủ trên nền cao', 0, 6, 7, 'Leo bậc đá lên nền cao để vào điện. Khu chùa mới Bái Đính khánh thành năm 2010.'],
    ['Gác chuông', -14, 6, 5, 'Chuông lớn của chùa. Đứng gần và bấm "Thỉnh chuông".', 'bell'],
    ['Bảo tháp 13 tầng', 16, 1, 6, 'Bảo tháp cao nhiều tầng trên sườn núi Bái Đính.'],
    ['Núi Bái Đính', -10, -8, 7, 'Chùa cổ Bái Đính nằm trong hang núi, gắn với thiền sư Nguyễn Minh Không thời Lý.']] },
  'mot-cot': { yard: [{ r: [-14, -33, 14, 13], gate: ['+z', 0, 5] }],  spawn: [0, 22], abbot: [4, 10], extraHall: [0, -22, 0], pois: [
    ['Đài sen trên một cột đá', 0, 2, 6, 'Đài vuông bằng gỗ trên một cột đá giữa hồ, như đóa sen vươn lên mặt nước. Leo bậc đá để lên đài.'],
    ['Hồ sen vuông (Linh Chiểu)', 9, 4, 4, 'Hồ vuông bao quanh cột đá, mùa hè sen nở kín mặt nước.'],
    ['Chùa Diên Hựu', 0, -16, 7, 'Năm 1049 vua Lý Thái Tông dựng chùa sau giấc mộng thấy Quán Âm. Tên chữ: Diên Hựu — phúc lành dài lâu.']] },
  'huong': { yard: [{ r: [-35, 25, -7, 45], gate: ['+x', 34, 6] }, { r: [-15, -1, 15, 14.2], gate: ['+z', 3, 8] }],  spawn: [0, 34], abbot: [-14, 30], extraHall: [-22, 34, Math.PI / 2], ferry: { from: [0, 25.5], to: [5, 13.6] }, pois: [
    ['Bến Đục · suối Yến', 0, 26, 4, 'Từ bến Đục, người hành hương ngồi thuyền xuôi suối Yến. Bấm "Lên thuyền" để sang bờ bên kia.', 'ferry'],
    ['Chùa Thiên Trù', -22, 34, 7, 'Chùa Thiên Trù — tương truyền là "bếp nhà trời", nơi dừng chân lễ Phật trước khi lên động.'],
    ['Cổng tam quan', 0, 12, 3, 'Ba cửa của chùa: Không môn, Vô tướng môn, Vô tác môn.'],
    ['Động Hương Tích', 0, 3, 4, 'Leo hết bậc đá là động Hương Tích. Năm 1770 chúa Trịnh Sâm cho khắc 5 chữ "Nam Thiên Đệ Nhất Động".']] },
  'yen-tu': { yard: [{ r: [-47, 32, -20, 57], gate: ['+z', -34, 6] }],  spawn: [0, 48], abbot: [-26, 54], extraHall: [-34, 44, 0], stream: [14, 34], pois: [
    ['Chùa Giải Oan', -34, 44, 7, 'Nơi Phật hoàng cho lập đàn cầu siêu cho các cung nữ.'],
    ['Suối Giải Oan', 12, 34, 4, 'Rửa mặt bên suối như gột bỏ phiền muộn trước khi lên núi.'],
    ['Đường lên chùa Đồng', 0, 24, 5, 'Đi bộ ngược lên sườn núi để tới chùa Đồng trên đỉnh cao khoảng 1.068 mét.'],
    ['Chùa Đồng trên đỉnh', 0, 3, 6, 'Chùa đúc bằng đồng giữa mây trời — đất tổ Thiền phái Trúc Lâm.']] },
  'thien-mu': { yard: [{ r: [-14.7, -19.5, 14.7, 7.7], y: 1.6, gate: ['+z', 0, 5.6] }],  spawn: [8, 4], abbot: [-4, -3], pois: [
    ['Tháp Phước Duyên', 0, 2, 6, 'Tháp bát giác 7 tầng, vua Thiệu Trị dựng năm 1844.'],
    ['Điện Đại Hùng', 0, -9, 7, 'Chánh điện thờ Phật, phía sau tháp Phước Duyên.'],
    ['Bến sông Hương', 0, 9, 4, '"Gió đưa cành trúc la đà, tiếng chuông Thiên Mụ canh gà Thọ Xương."'],
    ['Lầu chuông', -6, 3, 3, 'Đại hồng chung đúc năm 1710 đời chúa Nguyễn Phúc Chu.', 'bell']] },
  'linh-ung': { yard: [{ r: [-19.7, -14.7, 19.7, 14.7], y: 1.0, gate: ['+z', 0, 6] }],  spawn: [10, 12], abbot: [-6, 2], pois: [
    ['Tượng Quán Thế Âm 67 mét', 0, 8, 7, 'Tượng đứng trên tòa sen, mặt hướng ra biển như che chở người đi biển.'],
    ['Chánh điện', -12, -6, 7, 'Chánh điện mái xanh giữa rừng Sơn Trà.'],
    ['Hướng ra biển Đông', 0, 15, 4, 'Ngư dân thường hướng về Bãi Bụt cầu bình an trước mỗi chuyến ra khơi.']] },
  'long-son': { yard: [{ r: [-40, 3, -13, 29], gate: ['+z', -27, 6] }],  spawn: [0, 26], abbot: [-19, 24], pois: [
    ['Bậc đá lên đồi Trại Thủy', 0, 9, 4, 'Hơn 150 bậc đá dẫn lên đỉnh đồi.'],
    ['Kim Thân Phật Tổ', 0, -1, 7, 'Tượng Phật trắng ngồi trên tòa sen, cao 24 mét (tính cả tòa sen), khánh thành năm 1964.'],
    ['Chánh điện', -27, 15, 7, 'Chùa dựng năm 1886, ban đầu tên Đăng Long tự.']] },
  'vinh-nghiem': { yard: [{ r: [-21, -17, 20, 18], gate: ['+z', 0, 5] }],  spawn: [0, 24], abbot: [4, 9], pois: [
    ['Chánh điện', -3, 3, 8, 'Chánh điện lớn theo lối kiến trúc chùa miền Bắc.'],
    ['Tháp Quán Âm 7 tầng', 13, -2, 6, 'Tháp vuông bảy tầng — biểu tượng của chùa giữa Sài Gòn.'],
    ['Sân chùa', 0, 12, 5, 'Mang tên tổ đình Vĩnh Nghiêm ở Bắc Giang — nơi giữ kho mộc bản kinh Phật được UNESCO công nhận năm 2012.']] },
  'giac-lam': { yard: [{ r: [-21, -15, 18, 17], gate: ['+z', 0, 5] }],  spawn: [0, 22], abbot: [3, 8], pois: [
    ['Chánh điện cổ', -3, 4, 7, 'Dựng năm 1744 trên gò Cẩm Sơn, một trong những chùa cổ nhất vùng Gia Định.'],
    ['Bảo tháp 7 tầng', 12, 2, 6, 'Bảo tháp lục giác bảy tầng.'],
    ['Cây Bồ Đề', -14, 8, 5, 'Cây Bồ Đề chiết từ Sri Lanka, nối dài mạch nguồn từ nơi Đức Phật thành đạo.']] },
  'doi': { yard: [{ r: [-23, -12, 16, 15], gate: ['+z', 0, 5] }],  spawn: [0, 20], abbot: [5, 9], pois: [
    ['Chánh điện Khmer', 0, 2, 7, 'Mái nhiều tầng cong vút với đầu rắn thần Naga — nét đẹp Phật giáo Nam tông Khmer.'],
    ['Tháp xá lợi', 11, 6, 4, 'Tháp chuông trắng thờ xá lợi.'],
    ['Vườn cây đàn dơi', -14, -2, 7, 'Hàng nghìn con dơi treo mình trên cây cổ thụ, chiều tối bay đi kiếm ăn xa.']] }
};

/* ---------------- va chạm & địa hình ---------------- */
const STEP = 1.05;          // bậc cao tối đa bước lên được
export class Collision {
  constructor() { this.boxes = []; this.cones = []; this.waters = []; }
  build(root) {
    root.updateMatrixWorld(true);
    const bb = new THREE.Box3();
    root.traverse(o => {
      if (!o.isMesh || o.userData.noCollide) return;
      const t = o.geometry.type;
      if (['PlaneGeometry', 'CircleGeometry', 'TorusGeometry'].includes(t)) { if (o.material && o.material.transparent && o.material.opacity < 0.95 && t === 'PlaneGeometry') { bb.setFromObject(o); this.waters.push(bb.clone()); } return; }
      if (o.userData.mesa) {   // núi đỉnh bằng: địa hình leo được, mặt trên phẳng
        const p = o.getWorldPosition(new THREE.Vector3()), m = o.userData.mesa;
        this.cones.push({ x: p.x, z: p.z, r: m.r * 0.92, base: p.y - m.h / 2, h: m.h, top: m.top }); return;
      }
      if (t === 'ConeGeometry' && o.geometry.parameters.radius > 6) {   // núi: địa hình leo được
        const p = o.getWorldPosition(new THREE.Vector3()), r = o.geometry.parameters.radius * Math.max(o.scale.x, o.scale.z), h = o.geometry.parameters.height * o.scale.y;
        this.cones.push({ x: p.x, z: p.z, r: r * 0.92, base: p.y - h / 2, h }); return;
      }
      bb.setFromObject(o);
      if (o.material && o.material.transparent) return;     // mây
      const sx = bb.max.x - bb.min.x, sz = bb.max.z - bb.min.z;
      if (sx < 0.12 && sz < 0.12) return;
      if (o.userData.cushion) return;
      this.boxes.push({ x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z, top: bb.max.y, bottom: bb.min.y, camSkip: !!o.userData.camSkip });
    });
  }
  /* độ cao mặt đất tại (x,z) cho người đang đứng ở độ cao y; null = bị chặn */
  heightAt(x, z, y, rad = 0.28) {
    let ground = 0, blocked = false, onSolid = false;
    for (const c of this.cones) {
      const d = Math.hypot(x - c.x, z - c.z); if (d >= c.r) continue;
      const h = c.top ? c.base + c.h * Math.min(1, (c.r - d) / (c.r - c.top)) : c.base + c.h * (1 - d / c.r) * 0.98;
      if (h > ground) ground = h;
    }
    for (const b of this.boxes) {
      if (x < b.x0 - rad || x > b.x1 + rad || z < b.z0 - rad || z > b.z1 + rad) continue;
      if (b.bottom > y + 1.6) continue;                    // ở trên đầu (xà, mái thấp)
      if (b.top <= y + STEP) { const e = 0.03; if (x >= b.x0 - e && x <= b.x1 + e && z >= b.z0 - e && z <= b.z1 + e) { if (b.top > ground) ground = b.top; onSolid = true; } }   // e: bịt khe sai số giữa hai bậc liền nhau
      else blocked = true;
    }
    if (blocked) return null;
    if (!onSolid && ground < 0.2) for (const w of this.waters) if (x > w.min.x && x < w.max.x && z > w.min.z && z < w.max.z) return null;   // nước
    if (ground > y + STEP) return null;
    return ground;
  }
}

/* ---------------- dựng cảnh ---------------- */
export function buildWorld(scene, temple) {
  const root = new THREE.Group(); scene.add(root);
  const set = temple.id === 'doi' ? 'nam' : temple.buddhaSet || 'hoanh';
  const conf = buildLandmark(root, temple.model || 'hall', { interior: true, set });
  const L = LAYOUT[temple.id] || LAYOUT['binh-an'];
  if (L.extraHall) {
    const h = interiorHall({ w: 10, d: 7, h: 3.4, tiers: 2 }, set); h.position.set(L.extraHall[0], 0, L.extraHall[1]); h.rotation.y = L.extraHall[2] || 0; root.add(h);
  }
  if (L.stream) { const w = water(4, 30, L.stream[0], L.stream[1]); root.add(w); }
  // nền đất lớn
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat('gground', 0x5f7f45)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.userData.noCollide = true; root.add(ground);
  // vài cây quanh rìa
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 55 + (i % 4) * 8; const t = tree(5 + (i % 3) * 2, LEAF(), Math.cos(a) * r, Math.sin(a) * r); root.add(t); }
  const halls = HALLS.slice();
  // bảng tên chùa theo tên thật, treo trên chánh điện chính
  const PL = [temple.name.toUpperCase(), temple.place || ''];   // đúng tên chùa như trên bản đồ
  halls.forEach((h, i) => {
    const m = h.userData.mainHall, a = m.plaqueAt; if (!a) return;
    const [t, sub] = i === 0 ? PL : ['CHÁNH ĐIỆN', temple.name];
    const p = plaque(t, sub, a.w, a.h); p.position.set(a.x, a.y, a.z); h.add(p);
    (m.front || m.roofs).push(p);   // ẩn khi người chơi ở trong điện để không che tầm nhìn
  });
  // khuôn viên chùa: nền gạch đỏ sẫm, tường rào bao quanh, cổng ở phía trước (bên ngoài vẫn là cỏ xanh)
  if (L.yard) buildYards(root, L.yard);
  // hòm công đức trong chánh điện chính, bên phải bàn thờ, quay ra cửa
  let meritAt = null;
  if (halls[0]) {
    const m = halls[0].userData.mainHall, mb = meritBox();
    mb.position.set(Math.min(m.w / 2 - 1.1, m.w * 0.35 + 1.0, 4.4), m.base, m.altar.z + 1.5); halls[0].add(mb); meritAt = mb;
  }
  root.updateMatrixWorld(true);
  const hallInfo = halls.map(h => {
    const m = h.userData.mainHall;
    return { altar: h.localToWorld(m.altar.clone()), cushions: m.cushions.map(c => h.localToWorld(c.clone())), group: h,
      offerSlots: (m.offerSlots || []).map(c => h.localToWorld(c.clone())), burner: m.burner ? h.localToWorld(m.burner.clone()) : null,
      roofs: m.roofs || [], front: m.front || [], ceilY: h.localToWorld(new THREE.Vector3(0, m.base + (m.h || 4), 0)).y, w: m.w, d: m.d, yaw: h.getWorldQuaternion(new THREE.Quaternion()) };
  });
  const burners = []; root.traverse(o => { if (o.userData.burner) burners.push(o.getWorldPosition(new THREE.Vector3())); });
  const col = new Collision(); col.build(root);
  return { root, conf, layout: L, halls: hallInfo, burners, col, merit: meritAt ? meritAt.getWorldPosition(new THREE.Vector3()) : null };
}

/* khói hương ở lư hương */
export function smoke(scene, pos) {
  const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const parts = [];
  for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })); s.userData.t = i / 18 * 6; scene.add(s); parts.push(s); }
  return (dt, boost = 0) => parts.forEach(s => { s.userData.t += dt * (1 + boost); const t = s.userData.t % 6; s.position.set(pos.x + Math.sin(t * 1.3 + s.id) * 0.25 * t, pos.y + 1.2 + t * 0.6, pos.z); const k = t / 6; s.scale.setScalar(0.3 + k * 1.6); s.material.opacity = 0.35 * Math.sin(Math.PI * k) * (1 + boost * 0.5); });
}

/* hòm công đức: hộp gỗ sơn son, viền vàng, khe bỏ tiền, bảng chữ "CÔNG ĐỨC" */
function meritBox() {
  const g = new THREE.Group(), red = mat('mbred', 0x8e1a0e), gold = mat('mbgold', 0xe0a93a, { metalness: 0.6, roughness: 0.35 }), dark = mat('mbdark', 0x2a0d06);
  g.add(box(0.95, 0.12, 0.7, dark, 0, 0.06, 0));                        // đế
  g.add(box(0.8, 0.95, 0.58, red, 0, 0.6, 0));                          // thân hòm
  g.add(box(0.86, 0.06, 0.64, gold, 0, 1.1, 0));                        // nắp viền vàng
  g.add(box(0.82, 0.08, 0.6, red, 0, 1.16, 0));
  const slot = box(0.42, 0.02, 0.06, dark, 0, 1.21, 0); slot.userData.noCollide = true; g.add(slot);   // khe bỏ tiền
  [[-0.41, 0.6, 0.3], [0.41, 0.6, 0.3], [-0.41, 0.6, -0.3], [0.41, 0.6, -0.3]].forEach(([x, y, z]) => g.add(box(0.05, 0.98, 0.05, gold, x, y, z)));
  const sign = plaque('CÔNG ĐỨC', '', 0.62, 0.3); sign.position.set(0, 0.72, 0.3); g.add(sign);
  // đóa sen vàng trên nắp
  const lotus = new THREE.Group(); lotus.position.set(0.28, 1.2, 0.12);
  for (let i = 0; i < 6; i++) { const pt = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), gold); pt.scale.set(0.6, 1.5, 0.6); const a = i / 6 * Math.PI * 2; pt.position.set(Math.cos(a) * 0.05, 0.06, Math.sin(a) * 0.05); pt.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); lotus.add(pt); }
  lotus.traverse(o => { o.userData.noCollide = true; }); g.add(lotus);
  g.userData.meritBox = true;
  return g;
}

/* ---------------- khuôn viên: nền gạch + tường rào + cổng ---------------- */
let _brick = null;
function brickTex() {
  if (_brick) return _brick;
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#3a160e'; k.fillRect(0, 0, 512, 512);   // mạch vữa
  const bw = 64, bh = 32;
  for (let r = 0; r < 512 / bh; r++) for (let i = -1; i < 512 / bw + 1; i++) {
    const x = i * bw + (r % 2 ? bw / 2 : 0), y = r * bh, v = Math.random();
    const R = 110 + v * 34 | 0, G = 38 + v * 14 | 0, B = 26 + v * 10 | 0;
    k.fillStyle = `rgb(${R},${G},${B})`; k.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    k.fillStyle = 'rgba(255,200,170,.06)'; k.fillRect(x + 2, y + 2, bw - 4, 4);   // mép sáng
    for (let n = 0; n < 6; n++) { k.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; k.fillRect(x + 4 + Math.random() * (bw - 10), y + 4 + Math.random() * (bh - 10), 3, 3); }
  }
  _brick = new THREE.CanvasTexture(c); _brick.colorSpace = THREE.SRGBColorSpace; _brick.wrapS = _brick.wrapT = THREE.RepeatWrapping; _brick.anisotropy = 4;
  return _brick;
}
function buildYards(root, yards) {
  root.updateMatrixWorld(true);
  const probe = new Collision(); probe.build(root);           // địa hình hiện có: bỏ đoạn tường đâm vào núi, nhà, nước
  const plaster = mat('fencePl', 0xe9dfc6), brickM = mat('fenceBr', 0x6e2418), cap = mat('fenceCap', 0x4a2616), postM = mat('fencePost', 0xd8c9a6);
  // sân cát cũ trong khuôn viên nhường chỗ cho nền gạch
  root.traverse(o => { if (o.userData.court) { const p = o.getWorldPosition(new THREE.Vector3()); if (yards.some(Y => p.x > Y.r[0] && p.x < Y.r[2] && p.z > Y.r[1] && p.z < Y.r[3])) o.visible = false; } });
  yards.forEach(Y => {
    const [x0, z0, x1, z1] = Y.r, y = Y.y || 0, w = x1 - x0, d = z1 - z0;
    // nền gạch đỏ sẫm
    const t = brickTex().clone(); t.needsUpdate = true; t.repeat.set(w / 2, d / 2);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
    fl.rotation.x = -Math.PI / 2; fl.position.set((x0 + x1) / 2, y + 0.012, (z0 + z1) / 2); fl.receiveShadow = true; fl.userData.noCollide = true; root.add(fl);
    // tường rào
    const [gs, gat, gw] = Y.gate || ['+z', (x0 + x1) / 2, 5];
    const sides = [['-z', x0, z0, x1, z0], ['+x', x1, z0, x1, z1], ['+z', x1, z1, x0, z1], ['-x', x0, z1, x0, z0]];
    const H = 1.25, T = 0.28;
    const ok = (x, z) => { const h = probe.heightAt(x, z, y + 4); return h != null && Math.abs(h - y) < 0.3; };
    sides.forEach(([side, ax, az, bx, bz]) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2.6)), seg = len / n, along = side === '-z' || side === '+z';
      const gc = along ? gat : gat;   // toạ độ tâm cổng theo trục của cạnh
      let prevOk = false;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, sx = ax + (bx - ax) * t0, sz = az + (bz - az) * t0, ex = ax + (bx - ax) * t1, ez = az + (bz - az) * t1;
        const mx = (sx + ex) / 2, mz = (sz + ez) / 2, u = along ? mx : mz;
        const inGate = side === gs && Math.abs(u - gc) < gw / 2 + seg / 2 - 0.01;
        const good = !inGate && ok(sx * 0.9 + ex * 0.1, sz * 0.9 + ez * 0.1) && ok(mx, mz) && ok(sx * 0.1 + ex * 0.9, sz * 0.1 + ez * 0.9);
        if (good) {
          const g = new THREE.Group(); g.position.set(mx, y, mz); if (!along) g.rotation.y = Math.PI / 2;
          g.add(box(seg, 0.55, T, brickM, 0, 0.275, 0));                 // chân tường gạch
          g.add(box(seg, H - 0.6, T * 0.9, plaster, 0, 0.55 + (H - 0.6) / 2, 0));   // thân tường vôi
          g.add(box(seg + 0.02, 0.1, T + 0.16, cap, 0, H, 0));             // mái ngói nhỏ
          // ô hoa gió trang trí
          const vent = box(seg * 0.42, 0.28, T + 0.02, mat('fenceVent', 0x8a3a24), 0, 0.92, 0); vent.userData.noCollide = true; g.add(vent);
          root.add(g);
        }
        // trụ ở hai đầu đoạn tường còn lại
        if (good || prevOk) { if (ok(sx, sz)) { const p = new THREE.Group(); p.position.set(sx, y, sz); p.add(box(0.42, H + 0.35, 0.42, postM, 0, (H + 0.35) / 2, 0)); p.add(box(0.52, 0.1, 0.52, cap, 0, H + 0.4, 0)); const bud = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat('fenceBud', 0xe0a93a)); bud.scale.y = 1.4; bud.position.y = H + 0.6; bud.userData.noCollide = true; p.add(bud); root.add(p); } }
        prevOk = good;
      }
      if (prevOk && ok(bx, bz)) { const p = new THREE.Group(); p.position.set(bx, y, bz); p.add(box(0.42, H + 0.35, 0.42, postM, 0, (H + 0.35) / 2, 0)); p.add(box(0.52, 0.1, 0.52, cap, 0, H + 0.4, 0)); root.add(p); }
      // cổng chùa
      if (side === gs) {
        const along2 = along, gx = along2 ? gc : ax, gz = along2 ? az : gc;
        const gate = new THREE.Group(); gate.position.set(gx, y, gz); if (!along2) gate.rotation.y = Math.PI / 2;
        [-1, 1].forEach(sxg => {
          const px = sxg * (gw / 2 + 0.25);
          gate.add(box(0.75, 0.4, 0.75, brickM, px, 0.2, 0));
          gate.add(box(0.6, 3.2, 0.6, mat('gatePil', 0xe4d6b4), px, 1.8, 0));
          gate.add(box(0.72, 0.12, 0.72, cap, px, 3.45, 0));
          const bud = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat('fenceBud', 0xe0a93a)); bud.scale.y = 1.5; bud.position.set(px, 3.75, 0); bud.userData.noCollide = true; gate.add(bud);
        });
        const top = new THREE.Group(); top.position.y = 3.2;
        top.add(box(gw + 1.3, 0.3, 0.5, mat('gateBeam', 0x8e1a0e), 0, 0, 0));
        top.add(box(gw + 2.2, 0.14, 1.3, cap, 0, 0.42, 0));
        const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.75, 0.55, 4, 1), cap); rf.rotation.y = Math.PI / 4; rf.scale.x = (gw + 2.2) / 1.06; rf.position.y = 0.75; top.add(rf);
        [-1, 1].forEach(sxr => { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 6), mat('mbgold', 0xe0a93a)); horn.position.set(sxr * (gw / 2 + 1.1), 0.62, 0); horn.rotation.z = -sxr * 0.9; top.add(horn); });
        const sign = plaque('TAM QUAN', '', Math.min(2.4, gw * 0.5), 0.42); sign.position.set(0, 0.02, 0.27); top.add(sign);
        top.traverse(o => { o.userData.noCollide = true; }); gate.add(top);
        root.add(gate);
      }
    });
  });
}
