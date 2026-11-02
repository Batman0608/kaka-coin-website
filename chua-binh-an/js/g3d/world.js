/* =========================================================================
 *  THẾ GIỚI 3D CỦA TỪNG CHÙA: dựng cảnh, va chạm, địa hình (núi leo được,
 *  bậc thềm bước được), địa danh khám phá, bến thuyền, sư trụ trì.
 * ========================================================================= */
import { THREE, buildLandmark, interiorHall, plaque, HALLS, box, mat, water, tree, LEAF, STONE, roof } from '../temple3d.js';

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
  'tam-chuc': { yard: [{ r: [-15, -8, 15, 30], gate: ['+z', 0, 6] }], spawn: [0, 34], abbot: [8, 26], pois: [
    ['Hồ Tam Chúc', 0, 37, 7, 'Hồ rộng khoảng 600 ha với sáu hòn đảo đá nổi — "tiền Lục Nhạc", sau lưng là bảy ngọn núi "hậu Thất Tinh".'],
    ['Vườn Cột Kinh', 0, 18, 5, 'Vườn có 32 cột kinh bằng đá, mỗi cột cao 12 mét, khắc kinh Phật — dẫn lối lên các điện.'],
    ['Điện Tam Thế', 0, 1, 7, 'Điện lớn nhất, thờ Tam Thế Phật: quá khứ, hiện tại và vị lai.'],
    ['Chùa Ngọc', 0, -24, 8, 'Chùa Ngọc bằng đá granit đỏ trên sườn núi Thất Tinh.'],
    ['Tượng Di Lặc', 28, 12, 7, 'Tượng Phật Di Lặc bằng đồng trên đồi, hướng mặt ra hồ Tam Chúc.']] },
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
  if (L.yard) buildYards(root, L.yard, temple);
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
/* kiểu cổng theo vùng miền & kiến trúc từng chùa */
const GATE_STYLE = { 'binh-an': 'bac', 'bai-dinh': 'baidinh', 'tam-chuc': 'hue', 'mot-cot': 'bac1', 'huong': 'son', 'yen-tu': 'son', 'thien-mu': 'hue', 'linh-ung': 'hien', 'long-son': 'nam', 'vinh-nghiem': 'bac', 'giac-lam': 'nam', 'doi': 'khmer' };
function buildYards(root, yards, temple) {
  root.updateMatrixWorld(true);
  const probe = new Collision(); probe.build(root);           // địa hình hiện có: bỏ đoạn tường đâm vào núi, nhà, nước
  const style = GATE_STYLE[temple.id] || 'bac';
  const plaster = mat('fencePl', style === 'khmer' ? 0xf2ead2 : style === 'hien' ? 0xf0efe8 : 0xe9dfc6), brickM = mat('fenceBr', 0x6e2418), cap = mat('fenceCap', style === 'nam' ? 0x2f6a4a : style === 'hien' ? 0x2f5a7a : 0x4a2616), postM = mat('fencePost', 0xd8c9a6);
  // sân cát cũ trong khuôn viên nhường chỗ cho nền gạch
  root.traverse(o => { if (o.userData.court) { const p = o.getWorldPosition(new THREE.Vector3()); if (yards.some(Y => p.x > Y.r[0] && p.x < Y.r[2] && p.z > Y.r[1] && p.z < Y.r[3])) o.visible = false; } });
  yards.forEach((Y, yi) => {
    const [x0, z0, x1, z1] = Y.r, y = Y.y || 0, w = x1 - x0, d = z1 - z0;
    // nền gạch đỏ sẫm
    const t = brickTex().clone(); t.needsUpdate = true; t.repeat.set(w / 2, d / 2);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
    fl.rotation.x = -Math.PI / 2; fl.position.set((x0 + x1) / 2, y + 0.012, (z0 + z1) / 2); fl.receiveShadow = true; fl.userData.noCollide = true; root.add(fl);
    const [gs, gat, gw] = Y.gate || ['+z', (x0 + x1) / 2, 5];
    const gateG = gateBuild(yi === 0 ? style : 'phu', gw, temple, { plaster, brickM, cap });
    const hw = gateG.userData.halfW;          // nửa bề rộng cả cổng (kể cả hai cánh bên)
    const sides = [['-z', x0, z0, x1, z0], ['+x', x1, z0, x1, z1], ['+z', x1, z1, x0, z1], ['-x', x0, z1, x0, z0]];
    const H = 1.25, T = 0.28;
    const ok = (x, z) => { const h = probe.heightAt(x, z, y + 4); return h != null && Math.abs(h - y) < 0.3; };
    const post = (x, z) => { if (!ok(x, z)) return; const p = new THREE.Group(); p.position.set(x, y, z); p.add(box(0.42, H + 0.35, 0.42, postM, 0, (H + 0.35) / 2, 0)); p.add(box(0.52, 0.1, 0.52, cap, 0, H + 0.4, 0)); const bud = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat('fenceBud', 0xe0a93a)); bud.scale.y = 1.4; bud.position.y = H + 0.6; bud.userData.noCollide = true; p.add(bud); root.add(p); };
    sides.forEach(([side, ax, az, bx, bz]) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2.6)), along = side === '-z' || side === '+z';
      const U = (k) => along ? ax + (bx - ax) * k : az + (bz - az) * k;          // toạ độ dọc cạnh
      const P = (u) => along ? [u, az] : [ax, u];
      for (let i = 0; i < n; i++) {
        let ua = U(i / n), ub = U((i + 1) / n); if (ua > ub) [ua, ub] = [ub, ua];
        // cắt bỏ phần trùng cổng
        const pieces = side === gs ? [[ua, Math.min(ub, gat - hw)], [Math.max(ua, gat + hw), ub]] : [[ua, ub]];
        pieces.forEach(([a, b]) => {
          if (b - a < 0.35) return;
          const m = (a + b) / 2, [mx, mz] = P(m), [sx, sz] = P(a + 0.1 * (b - a)), [ex, ez] = P(b - 0.1 * (b - a));
          if (!(ok(sx, sz) && ok(mx, mz) && ok(ex, ez))) return;
          const g = new THREE.Group(); g.position.set(mx, y, mz); if (!along) g.rotation.y = Math.PI / 2;
          const L = b - a;
          g.add(box(L, 0.55, T, brickM, 0, 0.275, 0));                     // chân tường gạch
          g.add(box(L, H - 0.6, T * 0.9, plaster, 0, 0.55 + (H - 0.6) / 2, 0));   // thân tường vôi
          g.add(box(L + 0.02, 0.1, T + 0.16, cap, 0, H, 0));               // mái ngói nhỏ
          if (L > 1.2) { const vent = box(L * 0.42, 0.28, T + 0.02, mat('fenceVent', 0x8a3a24), 0, 0.92, 0); vent.userData.noCollide = true; g.add(vent); }
          root.add(g);
          post(...P(a)); post(...P(b));
        });
      }
      if (side === gs) { const gx = along ? gat : ax, gz = along ? az : gat; gateG.position.set(gx, y, gz); if (!along) gateG.rotation.y = Math.PI / 2; root.add(gateG); }
    });
  });
}

/* ---------------- cổng chùa: 6 kiểu ---------------- */
function gateBuild(style, gw, temple, M) {
  const G = new THREE.Group(), name = temple.name.toUpperCase();
  const nc = (o) => { o.traverse(x => { x.userData.noCollide = true; }); return o; };
  const gold = mat('mbgold', 0xe0a93a);
  const roofTier = (w, dep, y, m, curl = 0.55, hh = 0.55) => {   // mái dốc bốn mái + đầu đao (giống roof() của chùa, không lỗi)
    const r = new THREE.Group(); r.position.y = y;
    const h = Math.max(0.6, hh * 1.5);
    const geo = new THREE.CylinderGeometry(0.22, 0.7071, 1, 4, 1); geo.rotateY(Math.PI / 4);
    const body = new THREE.Mesh(geo, m); body.scale.set(w, h, dep); body.position.y = h / 2; r.add(body);
    r.add(box(w * 0.34, h * 0.12, dep * 0.12, gold, 0, h * 1.0, 0));   // nóc
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, dep) * 0.045, h * 0.7, 6), gold); c.position.set(sx * w * 0.5, h * 0.16, sz * dep * 0.5); c.rotation.z = -sx * 0.9; c.rotation.x = sz * 0.9; r.add(c); });   // đầu đao cong
    nc(r); return r;
  };
  const pillar = (x, h, col, w = 0.6) => { const p = new THREE.Group(); p.add(box(w + 0.15, 0.4, w + 0.15, M.brickM, x, 0.2, 0)); p.add(box(w, h, w, col, x, 0.4 + h / 2, 0)); return p; };
  const sign = (txt, W, H, y, z = 0.3) => { const s = plaque(txt, '', W, H); s.position.set(0, y, z); return nc(s); };
  let halfW = gw / 2 + 0.6;
  if (style === 'bac' || style === 'baidinh') {
    // TAM QUAN 3 lối kiểu Bắc Bộ: lối giữa cao, hai lối bên thấp (đóng cửa gỗ son), mái ngói hai tầng ở giữa
    const big = style === 'baidinh', vn = temple.id === 'vinh-nghiem';   // Vĩnh Nghiêm: trụ đá ong, mái ngói đỏ tươi
    const pc = mat(big ? 'gatePilS' : vn ? 'gatePilV' : 'gatePil', big ? 0xb8b2a4 : vn ? 0xc29a6a : 0xe4d6b4), tile = mat(big ? 'gateTileB' : vn ? 'gateTileV' : 'gateTile', big ? 0x3a2e28 : vn ? 0x9a3418 : 0x4a2616);
    const side = big ? 2.2 : 1.7, H = big ? 4.2 : 3.4, sh = H * 0.68;
    [-1, 1].forEach(sx => {
      G.add(pillar(sx * (gw / 2 + 0.3), H, pc));
      G.add(pillar(sx * (gw / 2 + 0.6 + side), sh, pc));
      const door = box(side - 0.1, sh - 0.2, 0.18, mat('gateDoor', 0x7a1a0e), sx * (gw / 2 + 0.6 + side / 2), 0.4 + (sh - 0.2) / 2, 0); G.add(door);
      [0.3, 0.6].forEach(f => { const st = box(0.06, 0.06, 0.2, mat('mbgold', 0xe0a93a), sx * (gw / 2 + 0.6 + side * f), 0.4 + sh * 0.5, 0.02); st.userData.noCollide = true; G.add(st); });
      const r = roofTier(side + 0.8, 1.6, 0.4 + sh, tile, 0.4, 0.45); r.position.x = sx * (gw / 2 + 0.6 + side / 2); G.add(r);
    });
    G.add(nc(box(gw + 1.4, 0.32, 0.55, mat('gateBeam', 0x8e1a0e), 0, 0.4 + H - 0.1, 0)));
    G.add(roofTier(gw + 2.0, 2.0, 0.4 + H + 0.1, tile, 0.6, 0.55));
    G.add(nc(box(gw * 0.6, 0.7, 0.5, M.plaster, 0, 0.4 + H + 0.85, 0)));       // gác chuông nhỏ giữa hai tầng mái
    G.add(roofTier(gw * 0.8, 1.4, 0.4 + H + 1.2, tile, 0.5, 0.5));
    G.add(sign(name, Math.min(gw * 0.85, 4), 0.55, 0.4 + H - 0.6, 0.31));
    halfW = gw / 2 + 0.6 + side + 0.35;
  } else if (style === 'bac1') {
    // Một Cột: cổng nhỏ một lối, mái chồng diêm hai tầng
    const pc = mat('gatePil', 0xe4d6b4), tile = mat('gateTile', 0x4a2616);
    [-1, 1].forEach(sx => G.add(pillar(sx * (gw / 2 + 0.3), 3.2, pc)));
    G.add(nc(box(gw + 1.2, 0.3, 0.5, mat('gateBeam', 0x8e1a0e), 0, 3.55, 0)));
    G.add(roofTier(gw + 1.8, 1.6, 3.7, tile, 0.5, 0.5)); G.add(roofTier(gw + 0.9, 1.2, 4.35, tile, 0.45, 0.45));
    G.add(sign(name, Math.min(gw * 0.85, 3.6), 0.48, 3.0, 0.31));
  } else if (style === 'son') {
    // cổng núi: trụ đá thô rêu phong, mái ngói nhỏ màu rêu, biển "Đệ nhất thiền môn" kiểu Yên Tử
    const stone = mat('gateStone', 0x8f8a7c), moss = mat('gateMoss', 0x4f6a3a);
    [-1, 1].forEach(sx => { for (let k = 0; k < 5; k++) G.add(box(0.85 - k * 0.04, 0.68, 0.85 - k * 0.04, k % 2 ? stone : mat('gateStone2', 0x7c776a), sx * (gw / 2 + 0.4), 0.34 + k * 0.68, 0)); });
    G.add(nc(box(gw + 1.6, 0.4, 0.7, stone, 0, 3.6, 0)));
    G.add(roofTier(gw + 2.2, 1.6, 3.8, moss, 0.35, 0.45));
    G.add(sign(temple.id === 'yen-tu' ? 'ĐỆ NHẤT THIỀN MÔN' : name, Math.min(gw * 0.9, 4.4), 0.5, 3.12, 0.36));
  } else if (style === 'hue') {
    // cổng tam quan Huế (Thiên Mụ): ba vòm cuốn bằng gạch, trên có gác lầu, mái ngói đỏ nâu
    const wallM = mat('gateHue', 0xd9c49a), tile = mat('gateTileH', 0x7a3a1e), side = 1.5;
    [-1, 1].forEach(sx => {
      G.add(box(0.9, 3.6, 0.9, wallM, sx * (gw / 2 + 0.45), 1.8, 0));
      G.add(box(side, 2.6, 0.7, wallM, sx * (gw / 2 + 0.9 + side / 2), 1.3, 0));
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(side * 0.32, side * 0.32, 0.72, 16, 1, false, 0, Math.PI), mat('gateDark', 0x2a140a)); arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); arch.position.set(sx * (gw / 2 + 0.9 + side / 2), 1.5, 0.01); G.add(nc(arch));
      G.add(nc(box(side * 0.64, 1.5, 0.72, mat('gateDark', 0x2a140a), sx * (gw / 2 + 0.9 + side / 2), 0.75, 0.01)));
    });
    G.add(nc(box(gw + 1.8, 0.7, 0.9, wallM, 0, 3.95, 0)));
    const arc = new THREE.Mesh(new THREE.TorusGeometry(gw / 2, 0.18, 8, 24, Math.PI), wallM); arc.position.set(0, 3.3 - gw / 2 + 0.3, 0); arc.scale.y = 0.35; G.add(nc(arc));
    G.add(nc(box(gw * 0.8, 1.3, 1.6, mat('gateHueU', 0xe8d6a8), 0, 4.95, 0)));    // gác lầu trên cổng
    for (let k = -2; k <= 2; k++) G.add(nc(box(0.12, 1.2, 0.12, mat('gateBeam', 0x8e1a0e), k * gw * 0.18, 4.95, 0.82)));
    G.add(roofTier(gw * 1.05, 2.2, 5.6, tile, 0.55, 0.55));
    G.add(roofTier(gw + 2 * side + 2, 1.4, 2.6, tile, 0.4, 0.35));
    G.add(sign(name, Math.min(gw * 0.85, 4), 0.48, 3.95, 0.47));
    halfW = gw / 2 + 0.9 + side + 0.1;
  } else if (style === 'nam') {
    // cổng Nam Bộ: trụ biểu tròn sơn son có câu đối, mái ngói men xanh, rồng chầu trên nóc
    const red = mat('gateRed', 0xa8261a), green = mat('gateGreen', 0x2f6a4a), gold = mat('mbgold', 0xe0a93a);
    [-1, 1].forEach(sx => {
      const x = sx * (gw / 2 + 0.35);
      G.add(box(0.9, 0.4, 0.9, M.brickM, x, 0.2, 0));
      G.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 3.6, 16), red)); G.children[G.children.length - 1].position.set(x, 2.2, 0);
      const cd = plaque(sx < 0 ? 'PHẬT' : 'PHÁP', '', 0.42, 0.42); cd.position.set(x, 2.6, 0.37); G.add(nc(cd));
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat('lantern', 0xd9332a, { emissive: 0xff4020, emissiveIntensity: 0.6 })); lan.scale.y = 1.25; lan.position.set(x, 3.2, 0.55); G.add(nc(lan));
    });
    G.add(nc(box(gw + 1.4, 0.36, 0.6, red, 0, 3.95, 0)));
    G.add(roofTier(gw + 2.2, 1.8, 4.15, green, 0.6, 0.6));
    [-1, 1].forEach(sx => { const dr = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.07, 6, 16, Math.PI * 1.3), green); dr.position.set(sx * gw * 0.3, 4.95, 0); dr.rotation.y = Math.PI / 2 * (1 - sx); G.add(nc(dr)); });
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), gold); pearl.position.set(0, 4.95, 0); G.add(nc(pearl));
    G.add(sign(name, Math.min(gw * 0.85, 4), 0.5, 3.4, 0.33));
  } else if (style === 'hien') {
    // Linh Ứng: cổng đá trắng hiện đại, mái ngói xanh dương như chánh điện
    const white = mat('gateWhite', 0xf2f0ea), blue = mat('gateBlue', 0x2f5a7a);
    [-1, 1].forEach(sx => { G.add(box(0.9, 0.5, 0.9, mat('gateWhite2', 0xd8d6cf), sx * (gw / 2 + 0.45), 0.25, 0)); G.add(box(0.7, 3.6, 0.7, white, sx * (gw / 2 + 0.45), 2.3, 0)); G.add(box(0.55, 0.25, 0.75, blue, sx * (gw / 2 + 0.45), 4.0, 0)); });
    G.add(nc(box(gw + 1.6, 0.45, 0.7, white, 0, 3.9, 0)));
    G.add(roofTier(gw + 2.4, 1.8, 4.1, blue, 0.6, 0.6));
    G.add(sign(name, Math.min(gw * 0.85, 4.4), 0.5, 3.35, 0.36));
  } else if (style === 'khmer') {
    // cổng Khmer (chùa Dơi): tường trắng viền vàng, tháp nhọn nhiều tầng, đầu rắn thần Naga hai bên
    const white = mat('gateKW', 0xf4eedc), gold = mat('mbgold', 0xe0a93a), orange = mat('gateKO', 0xd2691e);
    [-1, 1].forEach(sx => {
      G.add(box(0.9, 3.4, 0.9, white, sx * (gw / 2 + 0.45), 1.7, 0));
      G.add(box(1.0, 0.18, 1.0, gold, sx * (gw / 2 + 0.45), 3.45, 0));
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 8), gold); sp.position.set(sx * (gw / 2 + 0.45), 4.25, 0); G.add(nc(sp));
      const naga = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.1, 6, 14, Math.PI), gold); naga.position.set(sx * (gw / 2 + 0.9), 0.9, 0.6); naga.rotation.y = sx > 0 ? 0 : Math.PI; G.add(nc(naga));
    });
    G.add(nc(box(gw + 1.6, 0.5, 0.8, white, 0, 3.6, 0)));
    const tiers = [[gw + 1.2, 3.9], [gw * 0.75, 4.6], [gw * 0.45, 5.25]];
    tiers.forEach(([w, yy]) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(0, 0.9); sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0); const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: false }); const m = new THREE.Mesh(ge, orange); m.position.set(0, yy, -0.45); G.add(nc(m)); });
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.6, 8), gold); top.position.set(0, 6.6, 0); G.add(nc(top));
    G.add(sign(name, Math.min(gw * 0.85, 4), 0.48, 3.6, 0.42));
  } else {
    // cổng phụ (khuôn viên thứ hai): hai trụ, mái nhỏ
    const pc = mat('gatePil', 0xe4d6b4);
    [-1, 1].forEach(sx => G.add(pillar(sx * (gw / 2 + 0.3), 2.8, pc, 0.5)));
    G.add(nc(box(gw + 1, 0.28, 0.45, mat('gateBeam', 0x8e1a0e), 0, 3.3, 0)));
    G.add(roofTier(gw + 1.4, 1.2, 3.45, M.cap, 0.4, 0.4));
  }
  G.userData.halfW = halfW;
  return G;
}
