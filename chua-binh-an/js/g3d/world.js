/* =========================================================================
 *  THẾ GIỚI 3D CỦA TỪNG CHÙA: dựng cảnh, va chạm, địa hình (núi leo được,
 *  bậc thềm bước được), địa danh khám phá, bến thuyền, sư trụ trì.
 * ========================================================================= */
import { THREE, buildLandmark, interiorHall, HALLS, box, mat, water, tree, LEAF, STONE } from '../temple3d.js';

/* bố cục từng chùa: chỗ xuất hiện, địa danh [tên, x, z, bán kính, lời giới thiệu, hành động?], công trình thêm */
export const LAYOUT = {
  'binh-an': { spawn: [0, 22], abbot: [3.5, 7], pois: [
    ['Chánh điện', 0, 1, 6, 'Nơi thờ Tam Thế Phật. Vào trong, chọn một đệm để ngồi và lễ Phật.'],
    ['Lư hương trước sân', 0, 6, 3, 'Thắp nén hương, nguyện cho người thân bình an.'],
    ['Hàng cây trong vườn chùa', -8, 4, 4, 'Bóng cây che mát sân chùa — nơi Phật tử nghỉ chân.']] },
  'bai-dinh': { spawn: [0, 26], abbot: [4, 14], pois: [
    ['Điện Pháp Chủ trên nền cao', 0, 6, 7, 'Leo bậc đá lên nền cao để vào điện. Khu chùa mới Bái Đính khánh thành năm 2010.'],
    ['Gác chuông', -14, 6, 5, 'Chuông lớn của chùa. Đứng gần và bấm "Thỉnh chuông".', 'bell'],
    ['Bảo tháp 13 tầng', 16, 1, 6, 'Bảo tháp cao nhiều tầng trên sườn núi Bái Đính.'],
    ['Núi Bái Đính', -10, -8, 7, 'Chùa cổ Bái Đính nằm trong hang núi, gắn với thiền sư Nguyễn Minh Không thời Lý.']] },
  'mot-cot': { spawn: [0, 22], abbot: [4, 10], extraHall: [0, -22, 0], pois: [
    ['Đài sen trên một cột đá', 0, 2, 6, 'Đài vuông bằng gỗ trên một cột đá giữa hồ, như đóa sen vươn lên mặt nước. Leo bậc đá để lên đài.'],
    ['Hồ sen vuông (Linh Chiểu)', 9, 4, 4, 'Hồ vuông bao quanh cột đá, mùa hè sen nở kín mặt nước.'],
    ['Chùa Diên Hựu', 0, -16, 7, 'Năm 1049 vua Lý Thái Tông dựng chùa sau giấc mộng thấy Quán Âm. Tên chữ: Diên Hựu — phúc lành dài lâu.']] },
  'huong': { spawn: [0, 34], abbot: [-14, 30], extraHall: [-22, 34, Math.PI / 2], ferry: { from: [0, 25.5], to: [5, 13.6] }, pois: [
    ['Bến Đục · suối Yến', 0, 26, 4, 'Từ bến Đục, người hành hương ngồi thuyền xuôi suối Yến. Bấm "Lên thuyền" để sang bờ bên kia.', 'ferry'],
    ['Chùa Thiên Trù', -22, 34, 7, 'Chùa Thiên Trù — tương truyền là "bếp nhà trời", nơi dừng chân lễ Phật trước khi lên động.'],
    ['Cổng tam quan', 0, 12, 3, 'Ba cửa của chùa: Không môn, Vô tướng môn, Vô tác môn.'],
    ['Động Hương Tích', 0, 3, 4, 'Leo hết bậc đá là động Hương Tích. Năm 1770 chúa Trịnh Sâm cho khắc 5 chữ "Nam Thiên Đệ Nhất Động".']] },
  'yen-tu': { spawn: [0, 48], abbot: [-10, 36], extraHall: [-16, 32, 0], stream: [14, 34], pois: [
    ['Chùa Giải Oan', -16, 32, 7, 'Nơi Phật hoàng cho lập đàn cầu siêu cho các cung nữ.'],
    ['Suối Giải Oan', 12, 34, 4, 'Rửa mặt bên suối như gột bỏ phiền muộn trước khi lên núi.'],
    ['Đường lên chùa Đồng', 0, 24, 5, 'Đi bộ ngược lên sườn núi để tới chùa Đồng trên đỉnh cao khoảng 1.068 mét.'],
    ['Chùa Đồng trên đỉnh', 0, 3, 6, 'Chùa đúc bằng đồng giữa mây trời — đất tổ Thiền phái Trúc Lâm.']] },
  'thien-mu': { spawn: [8, 4], abbot: [-4, -3], pois: [
    ['Tháp Phước Duyên', 0, 2, 6, 'Tháp bát giác 7 tầng, vua Thiệu Trị dựng năm 1844.'],
    ['Điện Đại Hùng', 0, -9, 7, 'Chánh điện thờ Phật, phía sau tháp Phước Duyên.'],
    ['Bến sông Hương', 0, 9, 4, '"Gió đưa cành trúc la đà, tiếng chuông Thiên Mụ canh gà Thọ Xương."'],
    ['Lầu chuông', -6, 3, 3, 'Đại hồng chung đúc năm 1710 đời chúa Nguyễn Phúc Chu.', 'bell']] },
  'linh-ung': { spawn: [10, 12], abbot: [-6, 2], pois: [
    ['Tượng Quán Thế Âm 67 mét', 0, 8, 7, 'Tượng đứng trên tòa sen, mặt hướng ra biển như che chở người đi biển.'],
    ['Chánh điện', -12, -6, 7, 'Chánh điện mái xanh giữa rừng Sơn Trà.'],
    ['Hướng ra biển Đông', 0, 15, 4, 'Ngư dân thường hướng về Bãi Bụt cầu bình an trước mỗi chuyến ra khơi.']] },
  'long-son': { spawn: [0, 26], abbot: [-9, 14], pois: [
    ['Bậc đá lên đồi Trại Thủy', 0, 9, 4, 'Hơn 150 bậc đá dẫn lên đỉnh đồi.'],
    ['Kim Thân Phật Tổ', 0, -1, 7, 'Tượng Phật trắng ngồi trên tòa sen, cao 24 mét (tính cả tòa sen), khánh thành năm 1964.'],
    ['Chánh điện', -13, 10, 7, 'Chùa dựng năm 1886, ban đầu tên Đăng Long tự.']] },
  'vinh-nghiem': { spawn: [0, 24], abbot: [4, 9], pois: [
    ['Chánh điện', -3, 3, 8, 'Chánh điện lớn theo lối kiến trúc chùa miền Bắc.'],
    ['Tháp Quán Âm 7 tầng', 13, -2, 6, 'Tháp vuông bảy tầng — biểu tượng của chùa giữa Sài Gòn.'],
    ['Sân chùa', 0, 12, 5, 'Mang tên tổ đình Vĩnh Nghiêm ở Bắc Giang — nơi giữ kho mộc bản kinh Phật được UNESCO công nhận năm 2012.']] },
  'giac-lam': { spawn: [0, 22], abbot: [3, 8], pois: [
    ['Chánh điện cổ', -3, 4, 7, 'Dựng năm 1744 trên gò Cẩm Sơn, một trong những chùa cổ nhất vùng Gia Định.'],
    ['Bảo tháp 7 tầng', 12, 2, 6, 'Bảo tháp lục giác bảy tầng.'],
    ['Cây Bồ Đề', -14, 8, 5, 'Cây Bồ Đề chiết từ Sri Lanka, nối dài mạch nguồn từ nơi Đức Phật thành đạo.']] },
  'doi': { spawn: [0, 20], abbot: [5, 9], pois: [
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
      if (t === 'ConeGeometry' && o.geometry.parameters.radius > 6) {   // núi: địa hình leo được
        const p = o.getWorldPosition(new THREE.Vector3()), r = o.geometry.parameters.radius * Math.max(o.scale.x, o.scale.z), h = o.geometry.parameters.height * o.scale.y;
        this.cones.push({ x: p.x, z: p.z, r: r * 0.92, base: p.y - h / 2, h }); return;
      }
      bb.setFromObject(o);
      if (o.material && o.material.transparent) return;     // mây
      const sx = bb.max.x - bb.min.x, sz = bb.max.z - bb.min.z;
      if (sx < 0.12 && sz < 0.12) return;
      if (o.userData.cushion) return;
      this.boxes.push({ x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z, top: bb.max.y, bottom: bb.min.y });
    });
  }
  /* độ cao mặt đất tại (x,z) cho người đang đứng ở độ cao y; null = bị chặn */
  heightAt(x, z, y, rad = 0.28) {
    let ground = 0, blocked = false, onSolid = false;
    for (const c of this.cones) {
      const d = Math.hypot(x - c.x, z - c.z); if (d >= c.r) continue;
      const h = c.base + c.h * (1 - d / c.r) * 0.98;
      if (h > ground) ground = h;
    }
    for (const b of this.boxes) {
      if (x < b.x0 - rad || x > b.x1 + rad || z < b.z0 - rad || z > b.z1 + rad) continue;
      if (b.bottom > y + 1.6) continue;                    // ở trên đầu (xà, mái thấp)
      if (b.top <= y + STEP) { if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) { if (b.top > ground) ground = b.top; onSolid = true; } }
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
  root.updateMatrixWorld(true);
  const hallInfo = halls.map(h => {
    const m = h.userData.mainHall;
    return { altar: h.localToWorld(m.altar.clone()), cushions: m.cushions.map(c => h.localToWorld(c.clone())), group: h };
  });
  const burners = []; root.traverse(o => { if (o.userData.burner) burners.push(o.getWorldPosition(new THREE.Vector3())); });
  const col = new Collision(); col.build(root);
  return { root, conf, layout: L, halls: hallInfo, burners, col };
}

/* khói hương ở lư hương */
export function smoke(scene, pos) {
  const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const parts = [];
  for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })); s.userData.t = i / 18 * 6; scene.add(s); parts.push(s); }
  return (dt, boost = 0) => parts.forEach(s => { s.userData.t += dt * (1 + boost); const t = s.userData.t % 6; s.position.set(pos.x + Math.sin(t * 1.3 + s.id) * 0.25 * t, pos.y + 1.2 + t * 0.6, pos.z); const k = t / 6; s.scale.setScalar(0.3 + k * 1.6); s.material.opacity = 0.35 * Math.sin(Math.PI * k) * (1 + boost * 0.5); });
}
