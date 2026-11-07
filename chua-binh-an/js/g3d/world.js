/* =========================================================================
 *  THẾ GIỚI 3D CỦA TỪNG CHÙA: dựng cảnh, va chạm, địa hình (núi leo được,
 *  bậc thềm bước được), địa danh khám phá, bến thuyền, sư trụ trì.
 * ========================================================================= */
import { THREE, buildLandmark, interiorHall, plaque, HALLS, box, mat, water, tree, LEAF, LEAF2, STONE, roof, cyl, hall, lotusPads, standingGuanyin, GOLD, BRONZE, WOOD, RED, seatedBuddha, maitreya, WHITE, ANIM } from '../temple3d.js';

/* bố cục từng chùa: chỗ xuất hiện, địa danh [tên, x, z, bán kính, lời giới thiệu, hành động?], công trình thêm */
export const LAYOUT = {
  // Chùa Hà (Cầu Giấy): chùa CẦU DUYÊN — Cây tình duyên giữa sân, Điện Mẫu bên trái, biển "CẦU DUYÊN" trên lối vào
  'chua-ha': { yard: [{ r: [-34, -18, 34, 64], gate: ['+z', 0, 5] }], spawn: [0, 69], abbot: [5, 15.5], decor: 'chua-ha', walk: [-13, -13, 13, 15], tree: [0, 38], pois: [
    ['Chánh điện', 0, 1, 6, 'Lễ Phật trước, rồi sang Điện Mẫu và Cây tình duyên để cầu duyên.'],
    ['Cây tình duyên', 0, 38, 9, 'CẦU DUYÊN: điền thông tin, đính ảnh và treo hồ sơ lên cây. Hệ thống tự se duyên cho người cùng tỉnh, hợp tuổi, chung sở thích.', 'duyen'],
    ['Điện Mẫu · nơi cầu duyên', -18, 3, 4.5, 'Người đi lễ chùa Hà thường khấn cầu nhân duyên ở ban thờ Mẫu.'],
    ['Lư hương trước sân', 0, 16.4, 3, 'Thắp nén hương, nguyện gặp được người tri kỷ.']] },
  // Bình An: sân rộng ~3 lần (54 × 56 m) — lối đá vào, đường kinh hành vòng quanh chánh điện, hồ sen, gác chuông, vườn Quan Âm
  'binh-an': { yard: [{ r: [-27, -24, 27, 32], gate: ['+z', 0, 5] }],  spawn: [0, 37], abbot: [5, 15.5], decor: 'binh-an', walk: [-14.5, -15, 14.5, 17], pois: [
    ['Chánh điện', 0, 1, 6, 'Nơi thờ Tam Thế Phật. Vào trong, chọn một đệm để ngồi và lễ Phật.'],
    ['Lư hương trước sân', 0, 16.4, 3, 'Thắp nén hương, nguyện cho người thân bình an.'],
    ['Gác chuông', -20, -9, 4.5, 'Đại hồng chung của chùa. Đứng gần và bấm "Thỉnh chuông".', 'bell'],
    ['Vườn Quan Âm', 20, -9, 5, 'Tượng Bồ Tát Quán Thế Âm đứng giữa vườn — lắng lòng niệm "Nam mô Quán Thế Âm Bồ Tát".'],
    ['Hồ sen', -19, 21, 4.5, 'Hồ sen trước sân chùa — "gần bùn mà chẳng hôi tanh mùi bùn".'],
    ['Đường kinh hành', 14.5, 3, 3.5, 'Lối đá vòng quanh chánh điện — đi chậm, niệm Phật theo từng bước chân. Lễ rước kiệu cũng đi theo đường này.']] },
  'bai-dinh': { yard: [{ r: [-23, -25, 23, 19], gate: ['+z', 0, 6] }],  spawn: [0, 26], abbot: [4, 14], pois: [
    ['Điện Pháp Chủ trên nền cao', 0, 6, 7, 'Leo bậc đá lên nền cao để vào điện. Khu chùa mới Bái Đính khánh thành năm 2010.'],
    ['Gác chuông', -14, 6, 5, 'Chuông lớn của chùa. Đứng gần và bấm "Thỉnh chuông".', 'bell'],
    ['Bảo tháp 13 tầng', 16, 1, 6, 'Bảo tháp cao nhiều tầng trên sườn núi Bái Đính.'],
    ['Núi Bái Đính', -10, -8, 7, 'Chùa cổ Bái Đính nằm trong hang núi, gắn với thiền sư Nguyễn Minh Không thời Lý.']] },
  'tam-chuc': { yard: [{ r: [-17.5, -56, 17.5, 32], gate: ['+z', 0, 6] }], spawn: [0, 34], abbot: [8, 27], pois: [
    ['Hồ Tam Chúc', 0, 37, 7, 'Hồ rộng khoảng 600 ha với sáu hòn đảo đá — "tiền Lục Nhạc", sau lưng là bảy ngọn núi "hậu Thất Tinh".'],
    ['Vườn Cột Kinh', 0, 30, 6, 'Hai hàng cột kinh bằng đá cao, khắc kinh Phật, dẫn lối lên các cấp điện.'],
    ['Điện Pháp Chủ', 0, 0, 6, 'Điện cấp giữa thờ đức Pháp Chủ. Cửa điện đóng — đứng ngoài sân chiêm bái, rồi theo bậc hai bên lên cao.'],
    ['Chánh điện Tam Thế', 0, -34, 9, 'Điện cao nhất, thờ Tam Thế Phật: quá khứ, hiện tại và vị lai — vào lễ Phật tại đây.'],
    ['Tượng Di Lặc', 32, 12, 8, 'Tượng Phật Di Lặc bằng đồng trên đồi, hướng mặt ra hồ Tam Chúc.']] },
  'mot-cot': { yard: [{ r: [-14, -37, 14, 13], gate: ['+z', 0, 5] }],  spawn: [0, 22], abbot: [4, 10], extraHall: [0, -23.5, 0], pois: [
    ['Đài sen trên một cột đá', 0, 2, 6, 'Đài vuông bằng gỗ trên một cột đá giữa hồ, như đóa sen vươn lên mặt nước. Leo bậc đá để lên đài.'],
    ['Hồ sen vuông (Linh Chiểu)', 9, 4, 4, 'Hồ vuông bao quanh cột đá, mùa hè sen nở kín mặt nước.'],
    ['Chùa Diên Hựu', 0, -18, 8, 'Năm 1049 vua Lý Thái Tông dựng chùa sau giấc mộng thấy Quán Âm. Tên chữ: Diên Hựu — phúc lành dài lâu.']] },
  'huong': { yard: [{ r: [-37, 23, -7, 47], gate: ['+x', 34, 6] }, { r: [-15, -1, 15, 14.2], gate: ['+z', 3, 8] }],  spawn: [0, 34], abbot: [-14, 30], extraHall: [-25, 35, Math.PI / 2], ferry: { from: [0, 25.5], to: [5, 13.6] }, pois: [
    ['Bến Đục · suối Yến', 0, 26, 4, 'Từ bến Đục, người hành hương ngồi thuyền xuôi suối Yến. Bấm "Lên thuyền" để sang bờ bên kia.', 'ferry'],
    ['Chùa Thiên Trù', -25, 35, 8, 'Chùa Thiên Trù — tương truyền là "bếp nhà trời", nơi dừng chân lễ Phật trước khi lên động.'],
    ['Cổng tam quan', 0, 12, 3, 'Ba cửa của chùa: Không môn, Vô tướng môn, Vô tác môn.'],
    ['Động Hương Tích', 0, 3, 4, 'Leo hết bậc đá là động Hương Tích. Năm 1770 chúa Trịnh Sâm cho khắc 5 chữ "Nam Thiên Đệ Nhất Động".']] },
  'yen-tu': { yard: [{ r: [-48, 30, -19, 60], gate: ['+z', -34, 6] }],  spawn: [0, 48], abbot: [-26, 58], extraHall: [-34, 43, 0], stream: [14, 34], pois: [
    ['Chùa Giải Oan', -34, 44, 7, 'Nơi Phật hoàng cho lập đàn cầu siêu cho các cung nữ.'],
    ['Suối Giải Oan', 12, 34, 4, 'Rửa mặt bên suối như gột bỏ phiền muộn trước khi lên núi.'],
    ['Đường lên chùa Đồng', 0, 24, 5, 'Đi bộ ngược lên sườn núi để tới chùa Đồng trên đỉnh cao khoảng 1.068 mét.'],
    ['Chùa Đồng trên đỉnh', 0, 3, 6, 'Chùa đúc bằng đồng giữa mây trời — đất tổ Thiền phái Trúc Lâm.']] },
  'thien-mu': { yard: [{ r: [-14.7, -34.5, 14.7, 7.7], y: 1.6, gate: ['+z', 0, 5.6] }],  spawn: [8, 4], abbot: [-4, -3], pois: [
    ['Tháp Phước Duyên', 0, 2, 6, 'Tháp bát giác 7 tầng, vua Thiệu Trị dựng năm 1844.'],
    ['Điện Đại Hùng', 0, -19, 8, 'Chánh điện thờ Phật, phía sau tháp Phước Duyên.'],
    ['Bến sông Hương', 0, 9, 4, '"Gió đưa cành trúc la đà, tiếng chuông Thiên Mụ canh gà Thọ Xương."'],
    ['Lầu chuông', -6, 3, 3, 'Đại hồng chung đúc năm 1710 đời chúa Nguyễn Phúc Chu.', 'bell']] },
  'linh-ung': { yard: [{ r: [-33.5, -21.5, 23.5, 15.5], y: 1.0, gate: ['+z', 0, 6] }],  spawn: [10, 12], abbot: [-9, 9], pois: [
    ['Tượng Quán Thế Âm 67 mét', 0, 8, 7, 'Tượng đứng trên tòa sen, mặt hướng ra biển như che chở người đi biển.'],
    ['Chánh điện', -20, -8, 8, 'Chánh điện mái xanh giữa rừng Sơn Trà.'],
    ['Hướng ra biển Đông', 0, 15, 4, 'Ngư dân thường hướng về Bãi Bụt cầu bình an trước mỗi chuyến ra khơi.']] },
  'long-son': { yard: [{ r: [-40, 3, -13, 29], gate: ['+z', -27, 6] }],  spawn: [0, 26], abbot: [-15, 27.5], pois: [
    ['Bậc đá lên đồi Trại Thủy', 0, 9, 4, 'Hơn 150 bậc đá dẫn lên đỉnh đồi.'],
    ['Kim Thân Phật Tổ', 0, -1, 7, 'Tượng Phật trắng ngồi trên tòa sen, cao 24 mét (tính cả tòa sen), khánh thành năm 1964.'],
    ['Chánh điện', -27, 15, 7, 'Chùa dựng năm 1886, ban đầu tên Đăng Long tự.']] },
  'vinh-nghiem': { yard: [{ r: [-26, -23, 24, 22], gate: ['+z', 0, 5] }],  spawn: [0, 28], abbot: [5, 11], pois: [
    ['Chánh điện', -6, 0, 9, 'Chánh điện lớn theo lối kiến trúc chùa miền Bắc.'],
    ['Tháp Quán Âm 7 tầng', 17, -2, 6, 'Tháp vuông bảy tầng — biểu tượng của chùa giữa Sài Gòn.'],
    ['Sân chùa', 0, 15, 5, 'Mang tên tổ đình Vĩnh Nghiêm ở Bắc Giang — nơi giữ kho mộc bản kinh Phật được UNESCO công nhận năm 2012.']] },
  'giac-lam': { yard: [{ r: [-27, -22, 22, 20], gate: ['+z', 0, 5] }],  spawn: [0, 26], abbot: [4, 11], pois: [
    ['Chánh điện cổ', -6, 0, 9, 'Dựng năm 1744 trên gò Cẩm Sơn, một trong những chùa cổ nhất vùng Gia Định.'],
    ['Bảo tháp 7 tầng', 14, 4, 6, 'Bảo tháp lục giác bảy tầng.'],
    ['Cây Bồ Đề', -22, 12, 5, 'Cây Bồ Đề chiết từ Sri Lanka, nối dài mạch nguồn từ nơi Đức Phật thành đạo.']] },
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
  const ALTAR_OF = { 'bai-dinh': 'tamthe', 'tam-chuc': 'tamthe', 'binh-an': 'thichca', 'thien-mu': 'thichca', 'yen-tu': 'thichca', 'long-son': 'thichca', 'doi': 'thichca', 'vinh-nghiem': 'adida', 'giac-lam': 'adida', 'mot-cot': 'quanam', 'huong': 'quanam', 'linh-ung': 'quanam' };
  // nền phía sau tượng — mỗi chùa một khung cảnh riêng cho hợp (cùng vị Phật vẫn khác nền)
  const BG_OF = { 'bai-dinh': 'bodhi', 'tam-chuc': 'relief', 'binh-an': 'bodhi', 'thien-mu': 'river', 'yen-tu': 'mountain', 'long-son': 'bodhi', 'doi': 'khmer', 'vinh-nghiem': 'pureland', 'giac-lam': 'pureland', 'mot-cot': 'lotuspond', 'huong': 'cave', 'linh-ung': 'sea' };
  const altar = ALTAR_OF[temple.id] || 'thichca';
  const bg = BG_OF[temple.id] || null;
  const conf = buildLandmark(root, temple.model || 'hall', { interior: true, set, altar, bg, style: temple.id });
  const L = LAYOUT[temple.id] || LAYOUT['binh-an'];
  if (L.extraHall) {
    const h = interiorHall({ w: 10, d: 7, h: 3.4, tiers: 2 }, set, altar, bg, temple.id); h.position.set(L.extraHall[0], 0, L.extraHall[1]); h.rotation.y = L.extraHall[2] || 0; root.add(h);
  }
  if (L.stream) { const w = water(4, 30, L.stream[0], L.stream[1]); root.add(w); }
  // nền đất lớn
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat('gground', 0x5f7f45)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.userData.noCollide = true; root.add(ground);
  // vài cây quanh rìa — tránh trồng đè lên các điện (nhất là điện phụ ở xa)
  root.updateMatrixWorld(true);
  const hallSpots = HALLS.map(h => { const p = h.getWorldPosition(new THREE.Vector3()), m = h.userData.mainHall; return { x: p.x, z: p.z, r: (m ? Math.max(m.w, m.d) / 2 : 6) + 6 }; });
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 55 + (i % 4) * 8, x = Math.cos(a) * r, z = Math.sin(a) * r; if (hallSpots.some(s => Math.hypot(x - s.x, z - s.z) < s.r)) continue; root.add(tree(5 + (i % 3) * 2, LEAF(), x, z)); }
  const halls = HALLS.slice();
  // bảng tên chùa theo tên thật, treo trên chánh điện chính
  const PL = [temple.name.toUpperCase(), temple.place || ''];   // đúng tên chùa như trên bản đồ
  halls.forEach((h, i) => {
    const m = h.userData.mainHall, a = m.plaqueAt; if (!a) return;
    const [t, sub] = i === 0 ? PL : ['CHÁNH ĐIỆN', temple.name];
    const p = plaque(t, sub, a.w, a.h); p.position.set(a.x, a.y, a.z); h.add(p);
    (m.front || m.roofs).push(p);   // ẩn khi người chơi ở trong điện để không che tầm nhìn
  });
  // khuôn viên chùa: nền gạch vuông xám cũ, tường rào bao quanh, cổng ở phía trước (bên ngoài vẫn là cỏ xanh)
  let Lx = L;
  if (L.yard && !L.decor) Lx = expandYards(root, L);   // các chùa khác: nới sân ~3 lần diện tích trên phần đất bằng
  if (L.decor === 'chua-ha') haDecor(root, L); else if (L.decor) yardDecor(root, L);
  if (Lx.yard) buildYards(root, Lx.yard, temple);
  if (Lx.grown) yardGreen(root, Lx);
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
  let col = new Collision(); col.build(root);
  // khuôn viên: tượng Phật, hồ sen, hồ cá Koi… đặt vào chỗ trống bằng phẳng; mỗi nơi là một điểm câu hỏi
  const quiz = gardenDecor(root, Lx, temple, col, hallInfo);
  if (quiz.added) { root.updateMatrixWorld(true); col = new Collision(); col.build(root); }
  (Lx.pois || []).forEach(p => { if (!p[5] && !hallInfo.some(h => Math.hypot(p[1] - h.altar.x, p[2] - h.altar.z) < Math.max(h.w, h.d) / 2 + 2)) quiz.spots.push({ name: p[0], x: p[1], z: p[2], r: Math.min(p[3], 5) }); });   // điểm trong chánh điện không hỏi (đang lễ Phật)
  // mái cổng & phần cao của cổng: ẩn tạm khi che giữa camera và người chơi
  const camHide = []; root.traverse(o => { if (o.userData.gate) o.traverse(m => { if (m.isMesh && new THREE.Box3().setFromObject(m).max.y > 2.2) camHide.push(m); }); });
  return { quizSpots: quiz.spots, root, conf, layout: Lx, duyenTree: root.userData.duyenTree || null, halls: hallInfo, burners, col, camHide, merit: meritAt ? meritAt.getWorldPosition(new THREE.Vector3()) : null };
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
function brickTex() {   // gạch vuông xám đã cũ: ố màu, sứt mẻ, rêu mạch — như sân chùa lâu năm
  if (_brick) return _brick;
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#4a4740'; k.fillRect(0, 0, 512, 512);   // mạch vữa
  const tw = 128;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) {
    const x = i * tw, y = r * tw, v = Math.random(), base = 128 + v * 34 | 0, warm = Math.random() * 8 | 0;
    k.fillStyle = `rgb(${base + warm},${base + warm - 2},${base - 6})`; k.fillRect(x + 3, y + 3, tw - 6, tw - 6);
    // vết ố loang
    for (let n = 0; n < 5; n++) { const g2 = k.createRadialGradient(x + Math.random() * tw, y + Math.random() * tw, 0, x + tw / 2, y + tw / 2, 20 + Math.random() * 50); g2.addColorStop(0, `rgba(${60 + Math.random() * 30 | 0},${55 + Math.random() * 25 | 0},${45},${0.12 + Math.random() * 0.12})`); g2.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = g2; k.fillRect(x + 3, y + 3, tw - 6, tw - 6); }
    // hạt đá, rỗ
    for (let n = 0; n < 70; n++) { k.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.12})`; k.fillRect(x + 4 + Math.random() * (tw - 8), y + 4 + Math.random() * (tw - 8), 2, 2); }
    // vết nứt
    if (Math.random() < 0.3) { k.strokeStyle = 'rgba(40,38,34,.55)'; k.lineWidth = 1.2; k.beginPath(); let px = x + 10 + Math.random() * (tw - 20), py = y + 4; k.moveTo(px, py); for (let s = 0; s < 6; s++) { px += (Math.random() - 0.5) * 22; py += tw / 6; k.lineTo(px, Math.min(py, y + tw - 4)); } k.stroke(); }
    // mẻ góc
    if (Math.random() < 0.25) { k.fillStyle = '#4a4740'; k.beginPath(); const cx = x + (Math.random() < 0.5 ? 3 : tw - 3), cy = y + (Math.random() < 0.5 ? 3 : tw - 3); k.moveTo(cx, cy); k.lineTo(cx + (cx < x + tw / 2 ? 14 : -14), cy); k.lineTo(cx, cy + (cy < y + tw / 2 ? 10 : -10)); k.fill(); }
    k.fillStyle = 'rgba(255,255,255,.05)'; k.fillRect(x + 3, y + 3, tw - 6, 3);
  }
  // rêu xanh trong mạch gạch
  for (let n = 0; n < 60; n++) { const onV = Math.random() < 0.5, p = (Math.random() * 4 | 0) * tw, q = Math.random() * 512; k.fillStyle = `rgba(${70 + Math.random() * 20 | 0},${100 + Math.random() * 30 | 0},${50},${0.35 + Math.random() * 0.3})`; if (onV) k.fillRect(p - 2, q, 5, 6 + Math.random() * 14); else k.fillRect(q, p - 2, 6 + Math.random() * 14, 5); }
  _brick = new THREE.CanvasTexture(c); _brick.colorSpace = THREE.SRGBColorSpace; _brick.wrapS = _brick.wrapT = THREE.RepeatWrapping; _brick.anisotropy = 4;
  return _brick;
}
/* kiểu cổng theo vùng miền & kiến trúc từng chùa */
const GATE_STYLE = { 'chua-ha': 'bac1', 'binh-an': 'bac', 'bai-dinh': 'baidinh', 'tam-chuc': 'hue', 'mot-cot': 'bac1', 'huong': 'son', 'yen-tu': 'son', 'thien-mu': 'hue', 'linh-ung': 'hien', 'long-son': 'nam', 'vinh-nghiem': 'bac', 'giac-lam': 'nam', 'doi': 'khmer' };
function buildYards(root, yards, temple) {
  root.updateMatrixWorld(true);
  const probe = new Collision(); probe.build(root);           // địa hình hiện có: bỏ đoạn tường đâm vào núi, nhà, nước
  const style = GATE_STYLE[temple.id] || 'bac';
  const plaster = mat('fencePl', style === 'khmer' ? 0xf2ead2 : style === 'hien' ? 0xf0efe8 : 0xe9dfc6), brickM = mat('fenceBr', 0x6e2418), cap = mat('fenceCap', style === 'nam' ? 0x2f6a4a : style === 'hien' ? 0x2f5a7a : 0x4a2616), postM = mat('fencePost', 0xd8c9a6);
  // sân cát cũ trong khuôn viên nhường chỗ cho nền gạch
  root.traverse(o => { if (o.userData.court) { const p = o.getWorldPosition(new THREE.Vector3()); if (yards.some(Y => p.x > Y.r[0] && p.x < Y.r[2] && p.z > Y.r[1] && p.z < Y.r[3])) o.visible = false; } });
  yards.forEach((Y, yi) => {
    const [x0, z0, x1, z1] = Y.r, y = Y.y || 0, w = x1 - x0, d = z1 - z0;
    // nền gạch vuông xám cũ
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
      if (side === gs) { gateG.userData.gate = true; const gx = along ? gat : ax, gz = along ? az : gat; gateG.position.set(gx, y, gz); if (!along) gateG.rotation.y = Math.PI / 2; root.add(gateG); }
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
    const arc = new THREE.Mesh(new THREE.TorusGeometry(gw / 2, 0.18, 8, 24, Math.PI), wallM); arc.position.set(0, 3.6 - gw / 2 * 0.35, 0.02); arc.scale.y = 0.35;   // vòm cuốn ngay dưới xà cổng G.add(nc(arc));
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

/* ---------------- trang trí sân rộng (chùa Bình An) ---------------- */
function yardDecor(root, L) {
  const g = new THREE.Group(); root.add(g);
  const flat = (w, d, m, x, z, y = 0.022) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); o.receiveShadow = true; o.userData.noCollide = true; g.add(o); return o; };
  const pave = mat('pave', 0xb3aea2, { roughness: 0.95 }), paveE = mat('paveEdge', 0x6f6a60);
  // lối đá lớn từ cổng vào thẳng chánh điện, viền đá sẫm hai bên
  flat(4.2, 24, pave, 0, 20); [-1, 1].forEach(s => flat(0.25, 24, paveE, s * 2.2, 20, 0.024));
  // đường kinh hành vòng quanh chánh điện (đoàn rước kiệu đi theo lối này)
  const [wx0, wz0, wx1, wz1] = L.walk, ww = 3.2;
  flat(wx1 - wx0 + ww, ww, pave, (wx0 + wx1) / 2, wz0); flat(wx1 - wx0 + ww, ww, pave, (wx0 + wx1) / 2, wz1);
  flat(ww, wz1 - wz0, pave, wx0, (wz0 + wz1) / 2); flat(ww, wz1 - wz0, pave, wx1, (wz0 + wz1) / 2);
  // đèn đá dọc lối vào và bốn góc đường kinh hành
  const stone = STONE(), lampM = mat('stoneLamp', 0xffd9a0, { emissive: 0xffb050, emissiveIntensity: 0.9 });
  const lantern = (x, z) => { const l = new THREE.Group(); l.position.set(x, 0, z);
    l.add(box(0.6, 0.2, 0.6, stone, 0, 0.1, 0)); l.add(cyl(0.1, 0.13, 0.85, 8, stone, 0, 0.62, 0)); l.add(box(0.5, 0.42, 0.5, lampM, 0, 1.25, 0)); l.add(box(0.36, 0.44, 0.62, stone, 0, 1.25, 0));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.36, 4), stone); cap.rotation.y = Math.PI / 4; cap.position.y = 1.64; l.add(cap); g.add(l); };
  [21.5, 25.5, 29.5].forEach(z => [-3.3, 3.3].forEach(x => lantern(x, z)));
  [[wx0 - 2.4, wz0 - 2.4], [wx1 + 2.4, wz0 - 2.4], [wx0 - 2.4, wz1 + 2.4], [wx1 + 2.4, wz1 + 2.4]].forEach(([x, z]) => lantern(x, z));
  // hai hồ sen trước sân: bờ đá thấp, nước, lá & hoa sen
  [-19, 19].forEach(cx => { const cz = 21, w = 9, d = 7;
    [[0, -d / 2, w + 0.6, 0.5], [0, d / 2, w + 0.6, 0.5], [-w / 2, 0, 0.5, d], [w / 2, 0, 0.5, d]].forEach(([x, z, bw, bd]) => g.add(box(bw, 0.42, bd, stone, cx + x, 0.21, cz + z)));
    const pw = water(w - 0.4, d - 0.4, cx, cz); pw.position.y = 0.26; g.add(pw);
    const pads = new THREE.Group(); lotusPads(pads, 22, w - 1.2, d - 1.2, cx, cz); pads.children.forEach(o => { o.position.y += 0.22; o.userData.noCollide = true; }); g.add(pads); });
  // gác chuông (trái sau) và vườn Quan Âm (phải sau)
  const bt = hall({ w: 4, d: 4, h: 2.6, tiers: 2 }); bt.position.set(-20, 0, -9); bt.rotation.y = Math.PI / 2; g.add(bt);
  { const bell = new THREE.Group(); bell.position.set(-17.2, 0, -9);
    bell.add(box(0.25, 3.4, 0.25, RED(), 0, 1.7, -1.1)); bell.add(box(0.25, 3.4, 0.25, RED(), 0, 1.7, 1.1)); bell.add(box(0.3, 0.3, 2.6, RED(), 0, 3.3, 0));
    const b = cyl(0.55, 0.7, 1.3, 16, BRONZE(), 0, 2.4, 0); b.userData.noCollide = true; bell.add(b); g.add(bell); }
  { const gy = new THREE.Group(); gy.position.set(20, 0, -9); g.add(gy);
    gy.add(cyl(2.4, 2.6, 0.5, 24, stone, 0, 0.25, 0));
    const gu = standingGuanyin(4.2, mat('guanyinW', 0xf5f1e6, { roughness: 0.5 })); gu.position.y = 0.5; gu.rotation.y = -Math.PI / 2; gy.add(gu);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), LEAF2()); bush.position.set(Math.cos(a) * 3.6, 0.4, Math.sin(a) * 3.6); bush.userData.noCollide = true; gy.add(bush); } }
  // hàng cây: dọc lối vào, quanh tường rào, sau chánh điện
  const T = (x, z, h = 6) => g.add(tree(h, (Math.abs(x * 7 + z) | 0) % 2 ? LEAF() : LEAF2(), x, z));
  [23, 28.5].forEach(z => [-8, 8].forEach(x => T(x, z, 5.5)));
  for (let z = -20; z <= 27; z += 7) [-24, 24].forEach(x => { if (Math.abs(z - 21) < 5) return; T(x, z, 6 + (z & 1)); });
  for (let x = -17; x <= 17; x += 6.8) T(x, -21, 6.5);
  [[-19.5, 3], [19.5, 3], [-18, -15], [18, -15]].forEach(([x, z]) => T(x, z, 5));
}

/* ---------------- nới rộng sân các chùa (không sửa LAYOUT gốc) ----------------
   Mỗi cạnh lùi ra từng mét tới khi diện tích ~3 lần; dừng lại khi gặp núi, nước,
   mép nền cao hoặc sân khác. Nhà cửa trong phần nới thì vẫn giữ (nằm trong sân). */
function expandYards(root, L) {
  root.updateMatrixWorld(true);
  const probe = new Collision(); probe.build(root);
  const coneH = (x, z) => { let g = 0; for (const c of probe.cones) { const d = Math.hypot(x - c.x, z - c.z); if (d >= c.r) continue; const h = c.top ? c.base + c.h * Math.min(1, (c.r - d) / (c.r - c.top)) : c.base + c.h * (1 - d / c.r) * 0.98; if (h > g) g = h; } return g; };
  const flatOk = (x, z, y) => {
    for (const w of probe.waters) if (x > w.min.x - 0.6 && x < w.max.x + 0.6 && z > w.min.z - 0.6 && z < w.max.z + 0.6) return false;
    const ch = coneH(x, z);
    if (y <= 0.2) return ch < 0.3;                                   // sân dưới đất: không leo lên sườn núi
    return Math.abs(ch - y) < 0.35 || (ch < y - 0.3 && platform(x, z, y));   // sân trên nền cao: phải còn nền bên dưới
  };
  const platform = (x, z, y) => probe.boxes.some(b => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && Math.abs(b.top - y) < 0.35 && b.x1 - b.x0 > 3 && b.z1 - b.z0 > 3);
  const yards = L.yard.map(Y => Object.assign({}, Y, { r: Y.r.slice() }));
  const overlap = (a, b) => a[0] < b[2] + 3 && a[2] > b[0] - 3 && a[1] < b[3] + 3 && a[3] > b[1] - 3;
  yards.forEach((Y, yi) => {
    const r = Y.r, y = Y.y || 0, a0 = (r[2] - r[0]) * (r[3] - r[1]), live = [true, true, true, true];   // -x, -z, +x, +z
    const raised = y > 0.2, gk = Y.gate ? { '-x': 0, '-z': 1, '+x': 2, '+z': 3 }[Y.gate[0]] : -1;
    // sân trên nền cao: nới 3 cạnh (giữ cạnh cổng vì có bậc lên), phần mới đắp thêm nền đá; dưới phải là đất trống, không núi, không nước
    const fillOk = (x, z) => { for (const w of probe.waters) if (x > w.min.x - 0.6 && x < w.max.x + 0.6 && z > w.min.z - 0.6 && z < w.max.z + 0.6) return false; return coneH(x, z) < y + 0.3; };
    const lineOk = (k, v) => { if (raised && k === gk) return false; const pts = []; if (k % 2 === 0) for (let z = r[1]; z <= r[3]; z += 1.2) pts.push([v, z]); else for (let x = r[0]; x <= r[2]; x += 1.2) pts.push([x, v]); return pts.every(([x, z]) => raised ? fillOk(x, z) : flatOk(x, z, y)); };
    let guard = 0;
    while ((r[2] - r[0]) * (r[3] - r[1]) < a0 * 3 && live.some(Boolean) && guard++ < 200) {
      for (let k = 0; k < 4; k++) {
        if (!live[k] || (r[2] - r[0]) * (r[3] - r[1]) >= a0 * 3) continue;
        const idx = [0, 1, 2, 3][k], dir = k < 2 ? -1 : 1, nv = r[idx] + dir;
        const nr = r.slice(); nr[idx] = nv;
        if (!lineOk(k, nv + dir * 0.6) || yards.some((o, j) => j !== yi && overlap(nr, o.r))) { live[k] = false; continue; }
        r[idx] = nv;
      }
    }
    Y.grown = (r[2] - r[0]) * (r[3] - r[1]) / a0;
    if (raised && Y.grown > 1.05) {   // đắp nền: khối đá có mặt trên đúng cao độ sân, bờ kè đá quanh mép
      const fill = box(r[2] - r[0] + 0.6, y, r[3] - r[1] + 0.6, mat('terrace', 0x8f8676), (r[0] + r[2]) / 2, y / 2, (r[1] + r[3]) / 2); fill.receiveShadow = true; root.add(fill);
    }
  });
  // chỗ xuất hiện: nếu giờ đã lọt vào trong sân thì dời ra ngoài cổng
  let spawn = L.spawn.slice();
  const Y0 = yards[0], O = L.yard[0].r, inside = (p, r) => p[0] > r[0] && p[0] < r[2] && p[1] > r[1] && p[1] < r[3];
  if (Y0 && Y0.gate && !inside(spawn, O) && inside(spawn, Y0.r)) {
    const [gs, gat] = Y0.gate, R = Y0.r, out = { '+z': [gat, R[3] + 5], '-z': [gat, R[1] - 5], '+x': [R[2] + 5, gat], '-x': [R[0] - 5, gat] }[gs];
    if (out && flatOk(out[0], out[1], 0)) spawn = out;
  }
  // cổng phải nằm trên cạnh đã dời: toạ độ dọc cạnh giữ nguyên, kẹp vào trong cạnh
  yards.forEach(Y => { if (!Y.gate) return; const [gs, gat, gw] = Y.gate, along = gs === '+z' || gs === '-z', lo = along ? Y.r[0] : Y.r[1], hi = along ? Y.r[2] : Y.r[3]; Y.gate = [gs, Math.max(lo + gw, Math.min(hi - gw, gat)), gw]; });
  return Object.assign({}, L, { yard: yards, spawn, grown: yards.some(Y => Y.grown > 1.3), __orig: L.yard.map(Y => Y.r) });
}
/* cây xanh, đèn đá trong phần sân mới nới — chỉ đặt ở chỗ trống bằng phẳng */
function yardGreen(root, L) {
  root.updateMatrixWorld(true);
  const probe = new Collision(); probe.build(root);
  const g = new THREE.Group(); root.add(g);
  const free = (x, z, y, rad) => { for (const [dx, dz] of [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad]]) { const h = probe.heightAt(x + dx, z + dz, y + 0.5, 0.3); if (h == null || Math.abs(h - y) > 0.25) return false; } return !HALLS.some(H => { const p = H.getWorldPosition(new THREE.Vector3()), m = H.userData.mainHall; return Math.hypot(x - p.x, z - p.z) < Math.max(m.w, m.d) / 2 + 7; }); };
  const stone = STONE(), lampM = mat('stoneLamp', 0xffd9a0, { emissive: 0xffb050, emissiveIntensity: 0.9 });
  const lantern = (x, z, y) => { const l = new THREE.Group(); l.position.set(x, y, z);
    l.add(box(0.6, 0.2, 0.6, stone, 0, 0.1, 0)); l.add(cyl(0.1, 0.13, 0.85, 8, stone, 0, 0.62, 0)); l.add(box(0.5, 0.42, 0.5, lampM, 0, 1.25, 0)); l.add(box(0.36, 0.44, 0.62, stone, 0, 1.25, 0));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.36, 4), stone); cap.rotation.y = Math.PI / 4; cap.position.y = 1.64; l.add(cap); g.add(l); };
  L.yard.forEach((Y, yi) => {
    const [x0, z0, x1, z1] = Y.r, y = Y.y || 0, O = (LAYOUT_OF(L, yi) || Y.r);
    const isNew = (x, z) => !(x > O[0] - 1 && x < O[2] + 1 && z > O[1] - 1 && z < O[3] + 1);
    // hàng cây sát tường rào, chừa khoảng trước cổng
    const [gs, gat, gw] = Y.gate || ['+z', 0, 5], inset = 2.6;
    const nearGate = (x, z) => { const along = gs === '+z' || gs === '-z'; const edge = { '+z': z1, '-z': z0, '+x': x1, '-x': x0 }[gs]; return Math.abs((along ? x : z) - gat) < gw + 3 && Math.abs((along ? z : x) - edge) < 8; };
    let n = 0;
    const tryTree = (x, z, h) => { if (!isNew(x, z) || nearGate(x, z) || !free(x, z, y, 1.4)) return; const t = tree(h, n++ % 2 ? LEAF() : LEAF2(), x, z); t.position.y = y; g.add(t); };
    for (let x = x0 + inset; x <= x1 - inset; x += 7) { tryTree(x, z0 + inset, 6 + (n % 3)); tryTree(x, z1 - inset, 5.5 + (n % 2)); }
    for (let z = z0 + inset + 7; z <= z1 - inset - 7; z += 7) { tryTree(x0 + inset, z, 6); tryTree(x1 - inset, z, 6.5); }
    // đèn đá hai bên lối vào cổng
    if (Y.gate) { const along = gs === '+z' || gs === '-z', sgn = gs[0] === '+' ? -1 : 1, edge = { '+z': z1, '-z': z0, '+x': x1, '-x': x0 }[gs];
      [4, 9].forEach(d => [-3.2, 3.2].forEach(o => { const x = along ? gat + o : edge + sgn * d, z = along ? edge + sgn * d : gat + o; if (free(x, z, y, 0.6)) lantern(x, z, y); })); }
  });
}
const LAYOUT_OF = (L, yi) => L.__orig && L.__orig[yi];

/* ---------------- CHÙA HÀ: quảng trường Cây tình duyên, Điện Mẫu, biển CẦU DUYÊN ---------------- */
function haDecor(root, L) {
  const g = new THREE.Group(); root.add(g);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const flat = (w, d, m, x, z, y = 0.022) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); o.receiveShadow = true; o.userData.noCollide = true; g.add(o); return o; };
  const disc = (r0, r1, m, x, z, y) => { const o = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), m); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); o.receiveShadow = true; o.userData.noCollide = true; g.add(o); return o; };
  const pave = mat('pave', 0xb3aea2, { roughness: 0.95 }), paveE = mat('paveEdge', 0x6f6a60), stone = STONE();
  const pink = mat('haPave', 0xd9b3a8, { roughness: 0.95 }), rose2 = mat('haPave2', 0xb7848a, { roughness: 0.95 });
  const [TX, TZ] = L.tree, R = 13;   // tâm cây & bán kính quảng trường
  // lối đá: cổng → quảng trường → chánh điện
  flat(4.6, 64 - (TZ + R) + 1, pave, 0, (64 + TZ + R) / 2); [-1, 1].forEach(s => flat(0.25, 64 - (TZ + R), paveE, s * 2.4, (64 + TZ + R) / 2, 0.024));
  flat(4.6, TZ - R - 15 + 1, pave, 0, (TZ - R + 15) / 2);
  const [wx0, wz0, wx1, wz1] = L.walk, ww = 3.2;   // đường kinh hành quanh chánh điện
  flat(wx1 - wx0 + ww, ww, pave, 0, wz0); flat(wx1 - wx0 + ww, ww, pave, 0, wz1); flat(ww, wz1 - wz0, pave, wx0, (wz0 + wz1) / 2); flat(ww, wz1 - wz0, pave, wx1, (wz0 + wz1) / 2);
  // quảng trường tròn lát gạch hồng, viền đá, vòng hoa văn
  disc(0, R, pink, TX, TZ, 0.025); disc(R - 0.35, R, paveE, TX, TZ, 0.03); disc(7.4, 8.0, rose2, TX, TZ, 0.03); disc(10.2, 10.5, rose2, TX, TZ, 0.03);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, o = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.28), rose2); o.rotation.set(-Math.PI / 2, 0, -a); o.position.set(TX + Math.cos(a) * 9.1, 0.031, TZ + Math.sin(a) * 9.1); o.userData.noCollide = true; g.add(o); }
  // ===== CÂY TÌNH DUYÊN cổ thụ giữa quảng trường =====
  const T = new THREE.Group(); T.position.set(TX, 0, TZ); g.add(T);
  const haRed = mat('haRed', 0xa3233a);
  T.add(cyl(5.4, 5.6, 0.35, 48, stone, 0, 0.175, 0), cyl(5.42, 5.42, 0.06, 48, haRed, 0, 0.36, 0));        // bệ hai tầng (bước lên được)
  T.add(cyl(4.3, 4.45, 0.35, 48, stone, 0, 0.525, 0), cyl(4.32, 4.32, 0.06, 48, haRed, 0, 0.71, 0));
  const bark = mat('bark', 0x5a3a24, { roughness: 1 }), barkD = mat('barkD', 0x45291a, { roughness: 1 });
  T.add(cyl(1.15, 1.6, 6.4, 14, bark, 0, 3.9, 0));                                       // thân cây to
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.2, r = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.45, 2.4, 6), barkD); r.position.set(Math.cos(a) * 1.55, 1.15, Math.sin(a) * 1.55); r.rotation.set(Math.sin(a) * 0.95, 0, -Math.cos(a) * 0.95); r.userData.noCollide = true; T.add(r); }   // rễ nổi
  const crown = new THREE.Group(); crown.userData.gate = true; T.add(crown);   // tán cây: tự ẩn khi che camera
  const anchors = [];
  for (let i = 0; i < 10; i++) {   // cành lớn tỏa rộng
    const a = i / 10 * Math.PI * 2 + 0.3, len = 5.2 + (i % 3) * 0.8, tilt = 1.12 - (i % 2) * 0.12, br = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, len, 7), bark);
    br.position.set(Math.cos(a) * len * 0.44, 6.9 + (i % 2) * 0.6, Math.sin(a) * len * 0.44); br.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt); br.castShadow = true; br.userData.noCollide = true; crown.add(br);
    for (let k = 0; k < 6; k++) { const r = 2.6 + k * 0.85, h = 6.5 + k * 0.12 + (i % 2) * 0.45, ang = a + (k - 2.5) * 0.09; anchors.push(new THREE.Vector3(Math.cos(ang) * r, h, Math.sin(ang) * r)); }
  }
  const leafA = mat('duyenLeaf', 0x4f8a3a, { flatShading: true }), leafB = mat('duyenLeaf2', 0x3f7a35, { flatShading: true }), bloom = mat('duyenBloom', 0xf5a3c0, { flatShading: true, emissive: 0x7a2040, emissiveIntensity: 0.15 }), bloom2 = mat('duyenBloom2', 0xff7fa8, { flatShading: true, emissive: 0x7a2040, emissiveIntensity: 0.2 });
  const blobs = [[0, 11.4, 0, 4.4, leafA]];
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = 5.0 + (i % 2) * 0.9; blobs.push([Math.cos(a) * r, 9.2 + (i % 3) * 0.5, Math.sin(a) * r, 2.6 + (i % 2) * 0.5, i % 2 ? leafB : leafA]); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.25, r = 3.2 + (i % 3) * 1.6; blobs.push([Math.cos(a) * r, 10.2 + (i % 4) * 0.55, Math.sin(a) * r, 1.4 + (i % 3) * 0.35, i % 2 ? bloom : bloom2]); }
  blobs.forEach(([x, y, z, r, m]) => { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); c.scale.y = 0.78; c.position.set(x, y, z); c.castShadow = true; c.userData.noCollide = true; crown.add(c); });
  // sợi chỉ đỏ se duyên rủ xuống
  const thread = mat('thread', 0xd7263d, { emissive: 0x5a0a14, emissiveIntensity: 0.3 });
  anchors.forEach((p, i) => { if (i % 3) return; const len = 1.0 + (i % 5) * 0.3, t = new THREE.Mesh(new THREE.BoxGeometry(0.03, len, 0.03), thread); t.position.set(p.x, p.y - len / 2, p.z); t.userData.noCollide = true; crown.add(t); });
  // ===== 20 DẢI CẦU DUYÊN (lụa đỏ / hồng + thẻ gỗ ghi lời nguyện) — duyen.js gắn hồ sơ bạn đồng hành vào =====
  const silk = [mat('silkR', 0xd7263d, { side: THREE.DoubleSide, emissive: 0x5a0a14, emissiveIntensity: 0.35, roughness: 0.6 }), mat('silkP', 0xf06aa0, { side: THREE.DoubleSide, emissive: 0x6a1a40, emissiveIntensity: 0.35, roughness: 0.6 })];
  const tag = mat('woodTag', 0xc8a165, { roughness: 0.8 }), ribbons = [];
  for (let i = 0; i < 20; i++) {
    const p = anchors[(i * 3 + 1) % anchors.length], len = 1.6 + (i % 4) * 0.3, rb = new THREE.Group();
    rb.position.set(p.x, p.y - 0.05, p.z); rb.rotation.y = Math.atan2(p.x, p.z);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.26, len, 1, 4), silk[i % 2]); strip.position.y = -len / 2; strip.castShadow = true;
    const tg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.04), tag); tg.position.y = -len - 0.2;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), silk[i % 2]);
    [strip, tg, knot].forEach(o => { o.userData.noCollide = true; o.userData.ribbon = i; rb.add(o); });
    rb.userData.ph = i * 0.9; crown.add(rb); ribbons.push(rb);
  }
  const lamp = new THREE.PointLight(0xff8aa8, 1.3, 18, 1.6); lamp.position.set(0, 4.5, 0); T.add(lamp);
  // biển CẦU DUYÊN trên bệ, quay về phía cổng
  const sign = plaque('CẦU DUYÊN', 'Cây tình duyên · vào lẻ bóng, ra có đôi', 3.8, 1.0); sign.position.set(0, 2.0, 5.75); T.add(sign); [-1.75, 1.75].forEach(x => T.add(cyl(0.08, 0.08, 2.1, 8, RED(), x, 1.05, 5.68)));
  T.traverse(o => { if (o !== T && o.isMesh && o.geometry.type !== 'CylinderGeometry') o.userData.noCollide = true; });
  root.userData.duyenTree = { group: T, anchors, ribbons, center: T.position.clone(), radius: R - 3.5 };
  // ===== vòng đèn lồng đỏ, dây chỉ hồng nối các cột, ghế đá quanh quảng trường =====
  const red = mat('lanternRed', 0xd7261e, { emissive: 0xff4020, emissiveIntensity: 0.55 }), rose = mat('rose', 0xd0283a), leaf = LEAF2();
  const posts = [];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + Math.PI / 14; if (Math.abs(Math.sin(a)) > 0.97) continue; const x = TX + Math.cos(a) * 11.8, z = TZ + Math.sin(a) * 11.8;
    g.add(cyl(0.07, 0.08, 3.0, 6, RED(), x, 1.5, z)); const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), red); l.scale.y = 1.25; l.position.set(x, 2.75, z); l.userData.noCollide = true; g.add(l); posts.push(new THREE.Vector3(x, 3.0, z)); }
  posts.forEach((p, i) => { const q = posts[(i + 1) % posts.length], d = p.distanceTo(q); if (d > 7) return; const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, d), thread); t.position.copy(p).add(q).multiplyScalar(0.5).setY(2.95); t.lookAt(q.x, 2.95, q.z); t.userData.noCollide = true; g.add(t);
    for (let k = 1; k < 4; k++) { const hh = heartMesh(0.11, mat('heartDeco', 0xe2264a, { emissive: 0x8a0a20, emissiveIntensity: 0.4 })); hh.position.lerpVectors(p, q, k / 4).setY(2.7); hh.lookAt(TX, 2.7, TZ); g.add(hh); } });
  const benchM = mat('bench', 0xa69a88, { roughness: 0.9 });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8, x = TX + Math.cos(a) * 9.1, z = TZ + Math.sin(a) * 9.1; if (Math.sin(a) > 0.9 || Math.sin(a) < -0.9) continue;
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = -a + Math.PI / 2; b.add(at(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.55), benchM), 0, 0.46, 0), at(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.45), benchM), -0.8, 0.21, 0), at(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.45), benchM), 0.8, 0.21, 0)); g.add(b); }
  // luống hoa hồng vòng ngoài quảng trường
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; if (Math.abs(Math.sin(a)) > 0.95) continue; const x = TX + Math.cos(a) * 13.8, z = TZ + Math.sin(a) * 13.8;
    const bu = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), leaf); bu.position.set(x, 0.42, z); bu.userData.noCollide = true; g.add(bu);
    for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), i % 3 ? rose : mat('rosePink', 0xf28cb0)); f.position.set(x + Math.cos(k * 1.3) * 0.45, 0.66 + (k % 2) * 0.15, z + Math.sin(k * 1.3) * 0.45); f.userData.noCollide = true; g.add(f); } }
  // đào hồng quanh quảng trường
  const peach = mat('peach', 0xf7a8c4, { flatShading: true, emissive: 0x6a2040, emissiveIntensity: 0.12 });
  [[-17.5, TZ - 8], [17.5, TZ - 8], [-17.5, TZ + 8], [17.5, TZ + 8], [-21, TZ], [21, TZ]].forEach(([x, z]) => { g.add(cyl(0.22, 0.32, 3.2, 8, bark, x, 1.6, z));
    [[0, 3.9, 0, 1.7], [1.0, 3.5, 0.5, 1.1], [-0.9, 3.6, -0.4, 1.2]].forEach(([dx, y, dz, r]) => { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), peach); c.position.set(x + dx, y, z + dz); c.userData.noCollide = true; g.add(c); }); });
  // ===== cổng chào CẦU DUYÊN trên lối vào =====
  const GZ = 57;
  [-3.6, 3.6].forEach(x => g.add(cyl(0.2, 0.22, 4.8, 10, RED(), x, 2.4, GZ)));
  const ban = plaque('CHÙA HÀ · CẦU DUYÊN', 'Vào lẻ bóng · ra có đôi', 7.6, 1.25); ban.position.set(0, 4.5, GZ + 0.1); g.add(ban);
  const ban2 = plaque('CẦU DUYÊN', 'Nam mô Quán Thế Âm Bồ Tát', 7.6, 1.25); ban2.position.set(0, 4.5, GZ - 0.1); ban2.rotation.y = Math.PI; g.add(ban2);
  // đèn lồng & bụi hồng dọc lối vào
  for (let z = TZ + R + 2; z <= 62; z += 3.6) [-3.6, 3.6].forEach(x => { if (Math.abs(z - GZ) < 1.2) return; g.add(cyl(0.06, 0.07, 2.6, 6, RED(), x, 1.3, z)); const l = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), red); l.scale.y = 1.25; l.position.set(x, 2.4, z); l.userData.noCollide = true; g.add(l); });
  for (let z = TZ + R + 1; z <= 62; z += 2.4) [-5.6, 5.6].forEach(x => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), leaf); b.position.set(x, 0.42, z); b.userData.noCollide = true; g.add(b);
    for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), rose); f.position.set(x + Math.cos(k * 1.3) * 0.42, 0.62 + (k % 2) * 0.15, z + Math.sin(k * 1.3) * 0.42); f.userData.noCollide = true; g.add(f); } });
  // ===== Điện Mẫu (bên trái), quay vào giữa sân =====
  const dm = hall({ w: 5, d: 4.6, h: 2.8, tiers: 2 }); dm.position.set(-19.5, 0, 3); dm.rotation.y = Math.PI / 2; g.add(dm);
  const dmp = plaque('ĐIỆN MẪU', 'cầu duyên · cầu an', 2.6, 0.7); dmp.position.set(-16.8, 2.9, 3); dmp.rotation.y = Math.PI / 2; g.add(dmp);
  // hàng cây quanh tường
  const TR = (x, z, h = 6) => g.add(tree(h, (Math.abs(x * 7 + z) | 0) % 2 ? LEAF() : LEAF2(), x, z));
  for (let z = -14; z <= 60; z += 7.4) [-31, 31].forEach(x => TR(x, z, 6.5));
  for (let x = -26; x <= 26; x += 6.5) TR(x, -15.5, 6.5);
  [[-16.5, 9], [16.5, 9], [-24, 22], [24, 22], [-24, 54], [24, 54], [-14, 58], [14, 58]].forEach(([x, z]) => TR(x, z, 5.5));
}
function heartMesh(s, m) {   // trái tim phẳng có độ dày
  const sh = new THREE.Shape(); sh.moveTo(0, -0.9); sh.bezierCurveTo(-1.6, 0.2, -0.7, 1.4, 0, 0.6); sh.bezierCurveTo(0.7, 1.4, 1.6, 0.2, 0, -0.9);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 10 }); geo.center();
  const h = new THREE.Mesh(geo, m); h.scale.setScalar(s); h.castShadow = true; h.userData.noCollide = true; return h;
}
export { heartMesh };

/* ---------------- KHUÔN VIÊN CHÙA: tượng Phật ngoài trời, hồ sen, hồ cá Koi ----------------
   Tự tìm chỗ đất bằng còn trống trong sân (không chắn lối vào chánh điện, không đè nhà cửa),
   mỗi công trình là một điểm tham quan có câu hỏi ngẫu nhiên. */
function gardenDecor(root, L, temple, col, halls) {
  const spots = [], g = new THREE.Group(); root.add(g);
  const hsh = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const H = hsh(temple.id);
  const yards = L.yard && L.yard.length ? L.yard : [{ r: [-30, -30, 30, 30] }];
  const h0 = halls[0], hp = h0 ? h0.altar : new THREE.Vector3();
  const sp = new THREE.Vector3(L.spawn[0], 0, L.spawn[1]);
  const avoid = [];   // [x, z, r]
  (L.pois || []).forEach(p => { if (p[5]) avoid.push([p[1], p[2], 4]); });
  if (L.abbot) avoid.push([L.abbot[0], L.abbot[1], 3]);
  if (L.tree) avoid.push([L.tree[0], L.tree[1], 15]);
  root.traverse(o => { if (o.userData.burner) { const v = o.getWorldPosition(new THREE.Vector3()); avoid.push([v.x, v.z, 3.5]); } });
  // lối chính: từ cửa chánh điện ra cổng / chỗ xuất hiện — chừa trống 5 m mỗi bên
  const segD = (x, z, a, b) => { const abx = b.x - a.x, abz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz || 1))); return Math.hypot(x - a.x - abx * t, z - a.z - abz * t); };
  const lanes = [];
  halls.forEach(h => { const yaw = new THREE.Euler().setFromQuaternion(h.yaw).y, f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); const door = h.altar.clone().add(f.clone().multiplyScalar(h.d / 2 + 1)); lanes.push([door, door.clone().add(f.clone().multiplyScalar(14))]); lanes.push([door, sp]); });
  if (L.walk) { const [x0, z0, x1, z1] = L.walk, V = (x, z) => new THREE.Vector3(x, 0, z); lanes.push([V(x0, z0), V(x1, z0)], [V(x1, z0), V(x1, z1)], [V(x1, z1), V(x0, z1)], [V(x0, z1), V(x0, z0)]); }   // đường kinh hành
  yards.forEach(Y => { if (!Y.gate) return; const [x0, z0, x1, z1] = Y.r, [gs, gat] = Y.gate; const gp = { '+z': new THREE.Vector3(gat, 0, z1), '-z': new THREE.Vector3(gat, 0, z0), '+x': new THREE.Vector3(x1, 0, gat), '-x': new THREE.Vector3(x0, 0, gat) }[gs]; if (gp && h0) lanes.push([gp, hp]); });
  const free = (x, z, R, y0) => {
    for (const [ax, az, ar] of avoid) if (Math.hypot(x - ax, z - az) < R + ar) return false;
    for (const [a, b] of lanes) if (segD(x, z, a, b) < R + 3.2) return false;
    for (const h of halls) if (Math.hypot(x - h.altar.x, z - h.altar.z) < Math.max(h.w, h.d) / 2 + R + 3) return false;
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2, rr = i === 12 ? 0 : R + 0.8, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, hh = col.heightAt(px, pz, y0 + 0.3, 0.3);
      if (hh == null || Math.abs(hh - y0) > 0.04) return false; }
    return true;
  };
  const cands = [];
  yards.forEach(Y => { const [x0, z0, x1, z1] = Y.r, y0 = Y.y || 0; for (let x = x0 + 4; x <= x1 - 4; x += 1.5) for (let z = z0 + 4; z <= z1 - 4; z += 1.5) cands.push([x, z, y0]); });
  const chosen = [];
  const place = (R) => {
    const sc = [];
    for (const [x, z, y0] of cands) {
      const dn = chosen.length ? Math.min(...chosen.map(c => Math.hypot(c.x - x, c.z - z) - c.R)) : 20; if (dn < R + 2.5) continue;
      const dh = h0 ? Math.hypot(x - hp.x, z - hp.z) : 15; sc.push([Math.min(dn, 18) - Math.abs(dh - 18) * 0.35 + ((x * 7 + z * 13 + H) % 5) * 0.1, x, z, y0]);
    }
    sc.sort((a, b) => b[0] - a[0]);
    for (let i = 0; i < sc.length && i < 400; i++) { const [, x, z, y0] = sc[i]; if (free(x, z, R, y0)) { const b = { x, z, y: y0, R }; chosen.push(b); return b; } }
    return null;
  };
  const stone = STONE(), faceTo = (o, x, z) => { o.rotation.y = Math.atan2((h0 ? (sp.x + hp.x) / 2 : 0) - x, (h0 ? (sp.z + hp.z) / 2 : 0) - z); };
  const plates = (grp, R, y) => { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const bsh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), LEAF2()); bsh.position.set(Math.cos(a) * R, y + 0.3, Math.sin(a) * R); bsh.userData.noCollide = true; grp.add(bsh); } };
  // 1) tượng Phật ngồi ngoài trời (Thích Ca / A Di Đà) trên bệ sen, có bàn lễ nhỏ
  const statueKinds = [['Tượng Phật Thích Ca ngoài trời', 'thichca'], ['Tượng Phật A Di Đà', 'adida'], ['Tượng Phật Dược Sư', 'duocsu']];
  { const p = place(3.0); if (p) { const [nm] = statueKinds[H % 3]; const q = new THREE.Group(); q.position.set(p.x, p.y, p.z); g.add(q);
    q.add(cyl(2.2, 2.4, 0.6, 24, stone, 0, 0.3, 0)); q.add(box(1.6, 1.0, 1.6, stone, 0, 1.1, 0));
    const b = seatedBuddha(1.15, H % 2 ? WHITE() : GOLD()); b.position.y = 1.6; b.traverse(o => { o.userData.noCollide = true; }); q.add(b);
    const tb = box(1.0, 0.5, 0.45, mat('altar', 0x7a1a0e), 0, 0.85, 1.55); q.add(tb); faceTo(q, p.x, p.z);
    plates(q, 2.6, 0);
    spots.push({ name: nm, x: p.x, z: p.z, r: 4.6 }); } }
  // 2) hồ sen tròn có bờ đá
  { const p = place(3.8); if (p) { const q = new THREE.Group(); q.position.set(p.x, p.y, p.z); g.add(q);
    q.add(cyl(3.8, 3.9, 0.5, 32, stone, 0, 0.25, 0));
    const wtr = new THREE.Mesh(new THREE.CircleGeometry(3.45, 32), mat('pondWater', 0x3c7f9a, { roughness: 0.15, metalness: 0.3 })); wtr.rotation.x = -Math.PI / 2; wtr.position.y = 0.52; wtr.userData.noCollide = true; q.add(wtr);
    const pads = new THREE.Group(); lotusPads(pads, 16, 5, 5); pads.children.forEach(o => { o.position.y += 0.46; o.userData.noCollide = true; }); q.add(pads);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.4, r = 1.2 + (i % 2) * 1.1, fl = new THREE.Group(); fl.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r);
      for (let k = 0; k < 6; k++) { const pe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat('lotusPetal', 0xf7a8c4, { emissive: 0x6a2040, emissiveIntensity: 0.15 })); pe.scale.set(0.6, 1.2, 0.4); pe.position.set(Math.cos(k) * 0.12, 0.12, Math.sin(k) * 0.12); pe.rotation.z = Math.cos(k) * 0.5; pe.rotation.x = Math.sin(k) * 0.5; fl.add(pe); }
      fl.traverse(o => { o.userData.noCollide = true; }); q.add(fl); }
    spots.push({ name: 'Hồ sen', x: p.x, z: p.z, r: 5.2 }); } }
  // 3) hồ cá Koi: bờ đá chữ nhật, cá chép đỏ, trắng, vàng bơi vòng
  { const p = place(3.4); if (p) { const q = new THREE.Group(); q.position.set(p.x, p.y, p.z); g.add(q); const W2 = 6.2, D2 = 4.2;
    [[0, -D2 / 2, W2 + 0.6, 0.4], [0, D2 / 2, W2 + 0.6, 0.4], [-W2 / 2, 0, 0.4, D2], [W2 / 2, 0, 0.4, D2]].forEach(([x, z, w, d]) => q.add(box(w, 0.5, d, stone, x, 0.25, z)));
    const bot = box(W2 - 0.2, 0.05, D2 - 0.2, mat('koiBottom', 0x1f4a52), 0, 0.05, 0); bot.userData.noCollide = true; q.add(bot);
    q.add(box(W2 - 0.3, 0.32, D2 - 0.3, mat('koiFill', 0x214a40), 0, 0.16, 0)).userData.noCollide = true;
    const wtr = new THREE.Mesh(new THREE.PlaneGeometry(W2 - 0.3, D2 - 0.3), mat('koiWater', 0x4aa0b8, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 })); wtr.rotation.x = -Math.PI / 2; wtr.position.y = 0.44; wtr.userData.noCollide = true; q.add(wtr);
    const fish = [], cols = [0xff6a1a, 0xffffff, 0xffc020, 0xe23a1a, 0xff8a40, 0xf5f0e6, 0xd94010];
    cols.forEach((c, i) => { const f = new THREE.Group(); const bd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat('koi' + c, c, { roughness: 0.4 })); bd.scale.set(0.55, 0.4, 1.4); f.add(bd);
      const tl = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 6), mat('koi' + c, c)); tl.rotation.x = -Math.PI / 2; tl.position.z = -0.28; f.add(tl);
      if (i % 2) { const sp2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mat('koiSpot', 0xe23a1a)); sp2.position.set(0, 0.05, 0.05); f.add(sp2); }
      f.traverse(o => { o.userData.noCollide = true; }); f.userData = { ph: i * 0.9, r: 0.6 + (i % 3) * 0.45, sp: 0.4 + (i % 4) * 0.12, dir: i % 2 ? 1 : -1 }; q.add(f); fish.push(f); });
    ANIM.push((t) => fish.forEach(f => { const u = f.userData, a = t * u.sp * u.dir + u.ph; f.position.set(Math.cos(a) * u.r * 2.0, 0.34, Math.sin(a) * u.r * 1.15); f.lookAt(q.localToWorld(new THREE.Vector3(Math.cos(a + 0.2 * u.dir) * u.r * 2.0, 0.34, Math.sin(a + 0.2 * u.dir) * u.r * 1.15))); }));
    // đá cảnh & cây bonsai cạnh hồ
    [[-W2 / 2 - 0.9, -D2 / 2 - 0.6], [W2 / 2 + 0.9, D2 / 2 + 0.6]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), mat('rock', 0x8a8478, { flatShading: true })); r.position.set(x, 0.4, z); r.scale.y = 1.4; q.add(r); });
    q.rotation.y = (H % 4) * Math.PI / 2;
    spots.push({ name: 'Hồ cá Koi', x: p.x, z: p.z, r: 5 }); } }
  // 4) tượng Quán Âm đứng / Di Lặc cười
  { const p = place(2.6); if (p) { const q = new THREE.Group(); q.position.set(p.x, p.y, p.z); g.add(q); const dl = H % 2;
    q.add(cyl(1.9, 2.1, 0.5, 20, stone, 0, 0.25, 0));
    const st = dl ? maitreya(1.1, GOLD()) : standingGuanyin(3.2, mat('guanyinW', 0xf5f1e6, { roughness: 0.5 })); st.position.y = 0.5; st.traverse(o => { o.userData.noCollide = true; }); q.add(st);
    q.add(box(0.9, 1.2, 0.9, stone, 0, 0.6, 0)); faceTo(q, p.x, p.z); plates(q, 2.3, 0);
    spots.push({ name: dl ? 'Tượng Phật Di Lặc' : 'Tượng Quán Thế Âm Bồ Tát', x: p.x, z: p.z, r: 4.2 }); } }
  // 5) sân rộng: vườn cảnh ở góc sân — hòn non bộ, bonsai, khóm trúc, ghế đá, đèn đá
  const areaOf = (Y) => (Y.r[2] - Y.r[0]) * (Y.r[3] - Y.r[1]);
  const big = yards.filter(Y => areaOf(Y) > 1400).sort((a, b) => areaOf(b) - areaOf(a))[0];
  if (big) {
    const [x0, z0, x1, z1] = big.r, corners = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]];
    const nCorner = areaOf(big) > 3000 ? 2 : 1;
    const placeCorner = (R) => {
      const sc = cands.filter(([x, z]) => x > x0 && x < x1 && z > z0 && z < z1).map(([x, z, y0]) => [Math.min(...corners.map(([cx, cz]) => Math.hypot(x - cx, z - cz))), x, z, y0])
        .filter(c => !chosen.some(o => Math.hypot(o.x - c[1], o.z - c[2]) < o.R + R + 2)).sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < sc.length && i < 500; i++) { const [, x, z, y0] = sc[i]; if (free(x, z, R, y0)) { const b = { x, z, y: y0, R }; chosen.push(b); return b; } }
      return null;
    };
    for (let k = 0; k < nCorner; k++) {
      const p = placeCorner(4.6); if (!p) break;
      const q = new THREE.Group(); q.position.set(p.x, p.y, p.z); g.add(q);
      const rockM = mat('rockery', 0x7d776c, { flatShading: true }), rockD = mat('rockeryD', 0x5f5a52, { flatShading: true }), moss = mat('moss', 0x4f7a3a, { flatShading: true });
      if (k === 0) {   // hòn non bộ giữa hồ nhỏ, có tháp & cầu tí hon
        q.add(cyl(2.6, 2.7, 0.45, 24, stone, 0, 0.225, 0));
        const wtr = new THREE.Mesh(new THREE.CircleGeometry(2.3, 24), mat('pondWater', 0x3c7f9a, { roughness: 0.15, metalness: 0.3 })); wtr.rotation.x = -Math.PI / 2; wtr.position.y = 0.46; wtr.userData.noCollide = true; q.add(wtr);
        [[0, 0, 1.0, 2.2], [0.7, 0.3, 0.6, 1.4], [-0.6, -0.4, 0.55, 1.1], [0.2, -0.8, 0.4, 0.8]].forEach(([x, z, r, hh], i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, hh, 6), i % 2 ? rockD : rockM); m.position.set(x, 0.45 + hh / 2, z); m.rotation.y = i; m.userData.noCollide = true; q.add(m);
          const ms = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.35, 0), moss); ms.position.set(x + r * 0.2, 0.45 + hh * 0.55, z); ms.userData.noCollide = true; q.add(ms); });
        const tp = new THREE.Group(); tp.position.set(0, 2.6, 0); for (let t = 0; t < 3; t++) { tp.add(box(0.22 - t * 0.05, 0.14, 0.22 - t * 0.05, mat('miniWall', 0xe9dcc0), 0, t * 0.2, 0)); const r2 = new THREE.Mesh(new THREE.ConeGeometry(0.2 - t * 0.04, 0.08, 4), mat('miniRoof', 0x5a2a1a)); r2.position.y = t * 0.2 + 0.1; r2.rotation.y = Math.PI / 4; tp.add(r2); } tp.traverse(o => { o.userData.noCollide = true; }); q.add(tp);
        const br = box(0.9, 0.08, 0.25, RED(), 1.3, 0.6, 1.2); br.userData.noCollide = true; br.rotation.y = 0.6; q.add(br);
        // chậu bonsai quanh hồ
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, x = Math.cos(a) * 3.6, z = Math.sin(a) * 3.6;
          q.add(cyl(0.32, 0.24, 0.3, 10, mat('potGlaze', i % 2 ? 0x2f5a6a : 0x8a3a1e, { roughness: 0.5 }), x, 0.15, z));
          const tr = cyl(0.05, 0.07, 0.45, 6, mat('bark', 0x5a3a24), x, 0.52, z); tr.rotation.z = 0.3; tr.userData.noCollide = true; q.add(tr);
          [[0.15, 0.85, 0], [-0.12, 0.75, 0.1], [0.05, 0.98, -0.1]].forEach(([dx, y, dz]) => { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), LEAF2()); c.scale.y = 0.6; c.position.set(x + dx, y, z + dz); c.userData.noCollide = true; q.add(c); }); }
        spots.push({ name: 'Hòn non bộ', x: p.x, z: p.z, r: 5.5 });
      } else {   // vườn trúc thiền: khóm trúc, ghế đá, đèn đá, sỏi cào
        const sand = new THREE.Mesh(new THREE.CircleGeometry(4.2, 28), mat('raked', 0xd8d0bc, { roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.03; sand.userData.noCollide = true; q.add(sand);
        for (let r = 1.2; r < 4; r += 0.6) { const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.05, 40), mat('rakeLine', 0xb8ae98)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.035; ring.userData.noCollide = true; q.add(ring); }
        const bm = mat('bamboo', 0x7aa04a), bl = mat('bambooLeaf', 0x4f8a3a, { flatShading: true });
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 1.2 + Math.PI * 0.9, r = 3.4 + (i % 3) * 0.3, x = Math.cos(a) * r, z = Math.sin(a) * r, hh = 3.5 + (i % 4) * 0.6;
          const c = cyl(0.05, 0.06, hh, 6, bm, x, hh / 2, z); c.rotation.z = (i % 3 - 1) * 0.06; q.add(c);
          const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), bl); lf.scale.set(1, 0.5, 1); lf.position.set(x, hh - 0.2, z); lf.userData.noCollide = true; q.add(lf); }
        const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), rockM); rk.position.set(0.4, 0.45, -0.3); rk.scale.set(1.3, 0.8, 1); q.add(rk);
        const rk2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), rockD); rk2.position.set(-0.9, 0.3, 0.5); q.add(rk2);
        const bench = new THREE.Group(); bench.position.set(0, 0, 2.6); bench.add(box(1.8, 0.12, 0.5, stone, 0, 0.45, 0)); [-0.7, 0.7].forEach(x => bench.add(box(0.15, 0.42, 0.42, stone, x, 0.21, 0))); q.add(bench);
        const lampM = mat('stoneLamp', 0xffd9a0, { emissive: 0xffb050, emissiveIntensity: 0.9 });
        [[-2.4, 1.6], [2.4, 1.6]].forEach(([x, z]) => { const l = new THREE.Group(); l.position.set(x, 0, z); l.add(box(0.5, 0.18, 0.5, stone, 0, 0.09, 0)); l.add(cyl(0.09, 0.12, 0.75, 8, stone, 0, 0.55, 0)); l.add(box(0.42, 0.36, 0.42, lampM, 0, 1.1, 0)); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), stone); cap.rotation.y = Math.PI / 4; cap.position.y = 1.43; l.add(cap); q.add(l); });
        faceTo(q, p.x, p.z);
        spots.push({ name: 'Vườn trúc thiền', x: p.x, z: p.z, r: 5 });
      }
    }
  }
  return { spots, added: chosen.length > 0 };
}
