/* =========================================================================
 *  THUYỀN RỒNG THAM QUAN — sông Hương (Thiên Mụ), hồ Tam Chúc, suối Yến (chùa Hương)
 *  · Người bán vé đứng ở bến ngoài cổng: 30 hoa sen / 1 vòng.
 *  · Thuyền chạy theo lịch chung cho mọi người (đỗ bến ~45 giây rồi đi một vòng),
 *    nên ai ở cùng chùa cũng thấy cùng một con thuyền ở cùng một chỗ.
 *  · Mỗi chuyến tối đa 6 người (máy chủ giữ chỗ). Trên thuyền đi lại tự do trong mui.
 *  · Nút "⬇ Xuống thuyền" luôn hiện khi đang ở trên thuyền.
 * ========================================================================= */
const PRICE = 30, DOCK = 45, SPEED = 4.6;
const CFG = {
  'thien-mu': { name: 'Thuyền rồng sông Hương', scale: 1, seller: [3.2, 12.7, Math.PI], pier: [8, 15.6],
    route: [[8, 19.6], [45, 21.5], [95, 23.9], [145, 23.9], [168, 26.5], [150, 29.1], [95, 29.1], [30, 31.5], [-50, 32], [-130, 31], [-165, 27], [-150, 22], [-90, 20.5], [-30, 19.8]],
    say: [[0.06, '🐉 Thuyền rồng rời bến Thiên Mụ, xuôi dòng sông Hương'], [0.17, '🎶 Ca Huế trên sông Hương — điệu hò mái nhì, mái đẩy mênh mang'], [0.26, '🌉 Thuyền sắp lướt qua gầm cầu sắt nhiều nhịp vòm'], [0.4, '🔄 Thuyền quay đầu ngược dòng'], [0.6, '🏯 Nhìn sang bờ bắc: tháp Phước Duyên bảy tầng soi bóng xuống sông'], [0.78, '🌾 Hai bên bờ là làng quê, rặng tre xanh mát'], [0.94, '⚓ Thuyền sắp cập bến Thiên Mụ']] },
  'tam-chuc': { name: 'Thuyền rồng hồ Tam Chúc', scale: 1, seller: [5.4, 35.3, Math.PI], pier: [0, 41.8],
    route: [[0, 45.4], [45, 45], [110, 48], [170, 58], [180, 70], [140, 79], [60, 79], [0, 78], [-60, 79], [-140, 78], [-180, 68], [-165, 53], [-100, 45.5], [-45, 45.2]],
    say: [[0.06, '🐉 Thuyền rời bến, ra giữa hồ Tam Chúc'], [0.2, '⛰ Sáu hòn đảo đá giữa hồ — "tiền Lục Nhạc"'], [0.38, '🔄 Thuyền vòng qua phía bắc hồ'], [0.5, '🏯 Nhìn về bờ: các điện chùa Tam Chúc nối tầng lên núi Thất Tinh'], [0.7, '🙏 Tượng Di Lặc trên đồi hướng mặt ra hồ'], [0.94, '⚓ Thuyền sắp cập bến']] },
  'huong': { name: 'Đò rồng suối Yến', scale: 0.8, seller: [14.6, 29.2, 0], pier: [12, 23.6],
    route: [[12, 20.8], [60, 21], [120, 21.2], [162, 21.5], [178, 23.5], [185, 19.5], [176, 15.5], [160, 17.5], [100, 17.5], [0, 17.4], [-100, 17.5], [-160, 17.5], [-177, 15.5], [-185, 19.5], [-177, 23.5], [-160, 21.5], [-100, 21], [-40, 21]],
    say: [[0.05, '🛶 Đò rời bến Đục, xuôi suối Yến'], [0.18, '⛰ Hai bên núi non trùng điệp, cỏ năn xanh mướt'], [0.25, '🔄 Đò quay đầu ở vũng rộng'], [0.5, '🙏 "Nam mô A Di Đà Phật" — người đi lễ chào nhau trên suối'], [0.75, '🔄 Đò quay đầu lần nữa, về bến'], [0.94, '⚓ Đò sắp cập bến Đục']] },
};

export function initBoat({ THREE, scene, Avatar, label, placeLabel, me, getW, getTemple, P, save, toast, banner, A, NET, spend, fade, el }) {
  let cfg = null, boat = null, curve = null, T = 120, cycle = 165, seller = null, aboard = false, L = new THREE.Vector3(), lastW = null, lastYaw = 0, said = new Set(), offBtn = null, roofMats = [], crew = [], flags = [], wake = null, heldTrip = -1;
  const now = () => Date.now() / 1000 + (globalThis.__boatShift || 0);   // __boatShift: chỉ dùng khi kiểm thử
  /* ---------- dựng thuyền rồng ---------- */
  function M(c, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o)); }
  function build(sc) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const Lh = 15, B = 4.4, half = Lh / 2;
    const outline = (k) => { const s = new THREE.Shape(), N = 28;
      for (let i = 0; i <= N; i++) { const z = -half + (i / N) * Lh, w = B / 2 * k * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / half, 2.6)), 0.55); i ? s.lineTo(w, z) : s.moveTo(w, z); }
      for (let i = N; i >= 0; i--) { const z = -half + (i / N) * Lh, w = B / 2 * k * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / half, 2.6)), 0.55); s.lineTo(-w, z); }
      return s; };
    const slab = (k, y0, h, m) => { const ge = new THREE.ExtrudeGeometry(outline(k), { depth: h, bevelEnabled: false, curveSegments: 4 }); ge.rotateX(Math.PI / 2); ge.translate(0, y0 + h, 0); const o = new THREE.Mesh(ge, m); o.castShadow = true; body.add(o); return o; };
    const red = M(0x8a1a12), gold = M(0xd9a83a, { metalness: 0.65, roughness: 0.35 }), green = M(0x2f8a5a, { roughness: 0.5 }), wood = M(0x8a5a32, { roughness: 0.8 }), dark = M(0x3a1a0c);
    slab(1, -0.45, 1.05, red); slab(1.02, 0.42, 0.2, gold); slab(0.95, 0.62, 0.22, wood);                  // thân, đai vàng, sàn
    slab(1.03, 0.0, 0.12, green);                                                                          // đường viền xanh ngấn nước
    // vảy rồng dọc mạn
    for (let i = -5; i <= 5; i++) [-1, 1].forEach(s => { const z = i * 1.25, w = B / 2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / half, 2.6)), 0.55); const sc2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), i % 2 ? gold : green); sc2.scale.set(0.4, 1, 1.4); sc2.position.set(s * (w + 0.02), 0.25, z); body.add(sc2); });
    // ĐẦU RỒNG ở mũi
    const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.6, half - 0.8), new THREE.Vector3(0, 1.3, half + 0.2), new THREE.Vector3(0, 2.4, half + 0.6), new THREE.Vector3(0, 3.3, half + 0.3)]);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(neck, 24, 0.42, 10), gold));
    for (let i = 0; i < 7; i++) { const p = neck.getPoint(0.15 + i * 0.12), c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 6), green); c.position.set(0, p.y + 0.15, p.z - 0.35); c.rotation.x = -0.9; body.add(c); }   // bờm
    const hd = new THREE.Group(); hd.position.set(0, 3.45, half + 0.55); body.add(hd);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), gold); skull.scale.set(0.85, 0.8, 1.15); hd.add(skull);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.9), gold); snout.position.set(0, -0.12, 0.72); hd.add(snout);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.8), red); jaw.position.set(0, -0.38, 0.62); jaw.rotation.x = 0.25; hd.add(jaw);
    [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M(0xffffff, { emissive: 0x332200 })); e.position.set(s * 0.3, 0.15, 0.45); hd.add(e);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), M(0x111111)); pu.position.set(s * 0.33, 0.16, 0.53); hd.add(pu);
      const hn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.9, 6), M(0xf2e2b0)); hn.position.set(s * 0.25, 0.55, -0.3); hn.rotation.x = -1.1; hd.add(hn);
      const wk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.28, -0.1, 1.05), new THREE.Vector3(s * 0.7, 0, 0.9), new THREE.Vector3(s * 1.0, -0.35, 0.5)]), 10, 0.025, 5), gold); hd.add(wk);
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), M(0xffffff)); fang.position.set(s * 0.2, -0.28, 1.05); fang.rotation.x = Math.PI; hd.add(fang); });
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), M(0xfff2c0, { emissive: 0xffc860, emissiveIntensity: 0.6 })); pearl.position.set(0, -0.1, 1.35); hd.add(pearl);
    // ĐUÔI RỒNG ở lái
    const tail = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.6, -half + 0.8), new THREE.Vector3(0, 1.4, -half - 0.2), new THREE.Vector3(0, 2.6, -half - 0.1), new THREE.Vector3(0, 3.4, -half + 0.7)]);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 20, 0.3, 8), gold));
    for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 5), i % 2 ? green : red); f.position.set(0, 3.4, -half + 0.7); f.rotation.set(-0.5 + i * 0.25, 0, (i - 2) * 0.45); f.translateY(0.5); body.add(f); }
    // ===== MUI THUYỀN (mái cong 2 tầng, cột đỏ, đèn lồng) — đi lại được bên trong =====
    const deck = 0.84, cz0 = -4.6, cz1 = 4.6, cl = cz1 - cz0, hw = 1.95;
    for (let k = 0; k <= 5; k++) { const z = cz0 + k * cl / 5; [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 2.5, 10), red); p.position.set(s * hw, deck + 1.25, z); body.add(p);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 10), gold); cap.position.set(s * hw, deck + 2.47, z); body.add(cap); }); }
    [-1, 1].forEach(s => { const bm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, cl + 0.3), gold); bm.position.set(s * hw, deck + 2.5, 0); body.add(bm); });
    for (let k = 0; k <= 5; k++) { const z = cz0 + k * cl / 5, tb = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 0.14, 0.14), red); tb.position.set(0, deck + 2.52, z); body.add(tb); }
    const roofM = M(0xd9a020, { side: THREE.DoubleSide, roughness: 0.45, emissive: 0x3a2000, emissiveIntensity: 0.2, transparent: true }), roofIn = M(0x7a1a10, { side: THREE.BackSide, transparent: true });
    const mkRoof = (r, len, y, sy) => { const ge = new THREE.CylinderGeometry(r, r, len, 24, 1, true, -Math.PI / 2, Math.PI); ge.rotateX(-Math.PI / 2);   // vòm cong úp xuống, chạy dọc thân thuyền
      const o = new THREE.Mesh(ge, roofM); o.scale.set(1, sy, 1); o.position.y = y; body.add(o); const i2 = new THREE.Mesh(ge, roofIn); i2.scale.set(0.98, sy * 0.98, 0.99); i2.position.y = y; body.add(i2); roofMats.push(roofM, roofIn); return o; };
    mkRoof(2.35, cl + 1.2, deck + 2.55, 0.42);
    mkRoof(1.4, cl * 0.55, deck + 3.45, 0.42);
    { const band = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, cl * 0.5), red); band.position.y = deck + 3.25; body.add(band); }
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, cl * 0.62), gold); ridge.position.y = deck + 4.05; body.add(ridge);
    [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.75, 6), gold); c.position.set(0, deck + 4.25, s * cl * 0.31); c.rotation.x = s * 0.9; body.add(c);   // đầu đao cong
      [-1, 1].forEach(t => { const d2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 6), gold); d2.position.set(t * 2.25, deck + 2.75, s * (cl / 2 + 0.6)); d2.rotation.set(s * 0.6, 0, -t * 0.7); body.add(d2); }); });
    const rp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), M(0xffe08a, { emissive: 0xffb030, emissiveIntensity: 0.6 })); rp.position.y = deck + 4.32; body.add(rp);   // ngọc trên nóc
    // đèn lồng treo mái
    const lantern = M(0xd9332a, { emissive: 0xff4020, emissiveIntensity: 0.8 });
    for (let k = 0; k < 5; k++) { const z = cz0 + 0.9 + k * (cl - 1.8) / 4; [-1, 1].forEach(s => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lantern); l.scale.y = 1.3; l.position.set(s * (hw + 0.15), deck + 2.05, z); body.add(l);
      const tsl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), gold); tsl.position.set(s * (hw + 0.15), deck + 1.7, z); body.add(tsl); }); }
    const glow = new THREE.PointLight(0xffb070, 1.2, 9, 1.6); glow.position.set(0, deck + 2.1, 0); body.add(glow);
    // lan can thấp hai mạn (chừa lối lên ở giữa), ghế dài đệm đỏ, bàn trà, thảm
    [-1, 1].forEach(s => { [[cz0, -1.1], [1.1, cz1]].forEach(([a, b]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, b - a), gold); r.position.set(s * hw, deck + 0.62, (a + b) / 2); body.add(r);
        for (let z = a; z <= b; z += 0.45) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), red); bl.position.set(s * hw, deck + 0.3, z); body.add(bl); } });
      [[cz0 + 0.3, -1.3], [1.3, cz1 - 0.3]].forEach(([a, b]) => { const bn = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, b - a), wood); bn.position.set(s * (hw - 0.42), deck + 0.21, (a + b) / 2); body.add(bn);
        const cu = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, b - a - 0.1), M(0xa3231a)); cu.position.set(s * (hw - 0.42), deck + 0.46, (a + b) / 2); body.add(cu); }); });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, cl - 0.6), M(0x8a1a12, { roughness: 0.9 })); rug.rotation.x = -Math.PI / 2; rug.position.y = deck + 0.02; body.add(rug);
    const rug2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, cl - 1.0), M(0xd9a83a, { roughness: 0.9 })); rug2.rotation.x = -Math.PI / 2; rug2.position.y = deck + 0.025; rug2.scale.set(0.96, 0.98, 1); body.add(rug2);
    const rug3 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, cl - 1.2), M(0x6a1410, { roughness: 0.9 })); rug3.rotation.x = -Math.PI / 2; rug3.position.y = deck + 0.03; body.add(rug3);
    const tbl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.6), wood); tbl.position.set(0, deck + 0.18, -2.6); body.add(tbl);
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M(0xf2efe6)); pot.position.set(0, deck + 0.45, -2.6); body.add(pot);
    [-0.25, 0.25].forEach(x => { const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 8), M(0xf2efe6)); cp.position.set(x, deck + 0.4, -2.45); body.add(cp); });
    // cờ ngũ sắc mũi & lái
    [[half - 1.6, 0xe0a92a], [-half + 1.6, 0xb3261e]].forEach(([z, c]) => { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 6), wood); pole.position.set(0, deck + 1.6, z); body.add(pole);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7, 4, 1), M(c, { side: THREE.DoubleSide })); fl.position.set(0, deck + 2.85, z - 0.55); fl.rotation.y = Math.PI / 2; body.add(fl); flags.push(fl); });
    // mái chèo lái
    const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 6), wood); oar.position.set(0.6, 0.6, -half - 0.6); oar.rotation.x = 1.05; body.add(oar);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.9), wood); blade.position.set(0.6, -0.3, -half - 2.3); blade.rotation.x = 1.05; body.add(blade);
    // vệt sóng sau lái
    wake = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); wake.rotation.x = -Math.PI / 2; wake.position.set(0, 0.07, -half - 5); g.add(wake);
    g.traverse(o => { if (o.isMesh) { o.userData.noCollide = true; } });
    // người chèo & hai ca nương hát ca Huế
    crew = [];
    const add = (look, seed, x, z, yaw, pose) => { const av = new Avatar({ look, seed }); av.root.position.set(x, deck, z); av.root.rotation.y = yaw; if (pose) av.setPose(pose); body.add(av.root); crew.push(av); };
    add({ g: 'nam', hair: 'ngan', robe: 'nau' }, 41, 0.3, -half + 1.4, Math.PI, null);
    add({ g: 'nu', hair: 'dai', robe: 'tim' }, 42, -0.55, cz1 - 0.9, Math.PI, 'lotus');
    add({ g: 'nu', hair: 'bui', robe: 'hong' }, 43, 0.55, cz1 - 0.9, Math.PI, 'lotus');
    g.scale.setScalar(sc); g.userData.deck = deck; g.userData.half = half; g.userData.cab = [cz0, cz1]; g.userData.hw = hw;
    return g;
  }
  /* ---------- lịch chạy chung ---------- */
  function poseAt(t) {
    const tc = ((t % cycle) + cycle) % cycle, trip = Math.floor(t / cycle);
    if (tc < DOCK) return { docked: true, trip, tc, u: 0 };
    const k = (tc - DOCK) / T, u = 0.5 - 0.5 * Math.cos(Math.PI * k);   // êm lúc rời & cập bến
    return { docked: false, trip, tc, u };
  }
  function place(t) {
    const ps = poseAt(t), u = ps.u % 1, p = curve.getPointAt(u), d = curve.getTangentAt(u);
    boat.position.set(p.x, 0.05 + Math.sin(t * 1.3) * 0.04, p.z); boat.rotation.set(0, Math.atan2(d.x, d.z), Math.sin(t * 0.9) * 0.02);
    return ps;
  }
  /* ---------- vào / ra chùa ---------- */
  function onTemple() {
    dispose(); const t = getTemple(); cfg = t && CFG[t.id]; if (!cfg) return;
    curve = new THREE.CatmullRomCurve3(cfg.route.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
    T = curve.getLength() / SPEED; cycle = DOCK + T;
    boat = build(cfg.scale); scene.add(boat); place(now());
    const av = new Avatar({ look: { g: 'nam', hair: 'ngan', robe: 'lam' }, seed: 51 }); const W = getW();
    av.root.position.set(cfg.seller[0], W ? W.col.heightAt(cfg.seller[0], cfg.seller[1], 50) ?? 0 : 0, cfg.seller[1]); av.root.rotation.y = cfg.seller[2]; scene.add(av.root);
    seller = { av, label: label('🎫 Bán vé ' + cfg.name.toLowerCase(), 'abbot'), last: 0 };
    if (P.boatTicket && P.boatTicket.temple !== t.id) P.boatTicket = null;
  }
  function dispose() {
    if (aboard) leave(true);
    if (boat) { scene.remove(boat); boat = null; } if (seller) { scene.remove(seller.av.root); seller.label.remove(); seller = null; }
    cfg = null; roofMats = []; crew = []; flags = []; said.clear();
  }
  /* ---------- vé & lên xuống ---------- */
  const ticketOk = (trip) => P.boatTicket && P.boatTicket.temple === getTemple().id && P.boatTicket.trip >= trip;
  const nearPier = () => cfg && (Math.hypot(me.pos.x - cfg.pier[0], me.pos.z - cfg.pier[1]) < 6 || Math.hypot(me.pos.x - cfg.seller[0], me.pos.z - cfg.seller[1]) < 4);
  function buy() {
    const ps = poseAt(now()), trip = ps.docked && ps.tc < DOCK - 3 ? ps.trip : ps.trip + 1;
    if (ticketOk(trip)) return board();
    if (!spend(PRICE)) return toast(`Cần ${PRICE} hoa sen để mua vé · nhận quà hằng ngày hoặc nạp thêm`);
    P.boatTicket = { temple: getTemple().id, trip }; save(); A.khanh && A.khanh();
    if (trip === ps.trip && !aboard) { toast(`🎫 Đã mua vé ${cfg.name} · mời lên thuyền`); board(); }
    else if (aboard) toast('🎫 Đã mua thêm vé · ngồi yên đi tiếp vòng nữa nhé');
    else toast(`🎫 Đã mua vé · thuyền đang đi tham quan, về bến sau khoảng ${Math.ceil(cycle - ps.tc)} giây — quay lại bến để lên thuyền`);
  }
  function board() {
    const ps = poseAt(now());
    if (!ps.docked || ps.tc > DOCK - 3) return toast(`⛵ Thuyền chưa về bến · khoảng ${Math.ceil(cycle - ps.tc)} giây nữa`);
    if (!ticketOk(ps.trip)) return buy();
    const go = () => fade(() => { aboard = true; heldTrip = ps.trip; L.set(0, boat.userData.deck, -0.6); lastW = null; lastYaw = boat.rotation.y; me.yaw = boat.rotation.y; me.seated = null; me.av.setPose('idle');
      roofMats.forEach(m => { m.opacity = 0.32; }); showOff(true);
      banner('🐉 ' + cfg.name, 'Mời quý khách lên thuyền', `Thuyền rời bến sau ${Math.max(1, Math.ceil(DOCK - ps.tc))} giây · đi lại tự do trong mui thuyền · bấm "Xuống thuyền" khi muốn lên bờ`); });
    const ok = NET.soc('bt.on', { temple: getTemple().id, trip: ps.trip });
    if (!ok) return go();
    pending = go; setTimeout(() => { if (pending === go) { pending = null; go(); } }, 2500);   // máy chủ không trả lời thì vẫn cho lên
  }
  let pending = null;
  NET.onSoc((m) => {
    if (m.op === 'bt.ok' && pending) { const f = pending; pending = null; f(); }
    else if (m.op === 'bt.full' && pending) { pending = null; if (P.boatTicket) { P.boatTicket.trip = m.trip + 1; save(); } toast('⛵ ' + m.msg + ' · vé của bạn đã chuyển sang chuyến sau'); }
  });
  function leave(silent) {
    if (!aboard) return; aboard = false; NET.soc('bt.off'); showOff(false); roofMats.forEach(m => { m.opacity = 1; });
    const W = getW(), put = () => { if (!cfg) return; me.pos.set(cfg.pier[0], 0, cfg.pier[1] - 0.6 * Math.sign(cfg.pier[1] - cfg.seller[1] || 1)); me.y = W ? W.col.heightAt(me.pos.x, me.pos.z, 50) ?? 0.35 : 0.35; };
    if (silent) return;
    const ps = poseAt(now()); if (ps.docked) put(); else fade(() => { put(); toast('🛶 Đò nhỏ đã đưa bạn vào bờ'); });
    if (ps.docked) toast('👣 Đã lên bờ · cảm ơn quý khách');
  }
  function showOff(on) {
    if (on && !offBtn) { offBtn = el('button', 'boatoff', '⬇ Xuống thuyền'); offBtn.onclick = () => leave(false); document.body.append(offBtn); }
    if (!on && offBtn) { offBtn.remove(); offBtn = null; }
  }
  /* ---------- đi lại trên thuyền ---------- */
  function walk(nx, nz) {
    if (!aboard || !boat) return; boat.updateMatrixWorld(true);
    const loc = boat.worldToLocal(new THREE.Vector3(nx, me.y, nz)), half = boat.userData.half, [c0, c1] = boat.userData.cab;
    const inCab = loc.z > c0 && loc.z < c1, lim = inCab ? 1.08 : Math.max(0.3, 2.2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(loc.z) / half, 2.6)), 0.55) - 0.55);
    // trong mui: lối đi giữa hai hàng ghế; lối lên ở giữa thông ra hai mạn
    const lx = Math.abs(loc.z) < 1.1 ? 1.7 : lim;
    loc.x = Math.max(-lx, Math.min(lx, loc.x)); loc.z = Math.max(-half + 1.9, Math.min(half - 1.6, loc.z)); loc.y = boat.userData.deck;
    L.copy(loc);
  }
  function carry() {
    if (!aboard || !boat) return false;
    if (lastW && Math.hypot(me.pos.x - lastW.x, me.pos.z - lastW.z) > 3) { leave(true); return false; }   // bị dịch chuyển đi chỗ khác (vào chánh điện…)
    place(now()); boat.updateMatrixWorld(true);
    const w = boat.localToWorld(L.clone()); me.pos.set(w.x, 0, w.z); me.y = w.y;
    const dy = boat.rotation.y - lastYaw; me.yaw += dy; lastYaw = boat.rotation.y; lastW = w;
    return true;
  }
  /* ---------- mỗi khung hình ---------- */
  function step(dt) {
    if (!boat) return; const t = now(), ps = place(t);
    if (seller) { placeLabel(seller.label, seller.av.root.position, seller.av.height + 0.15); seller.av.update(dt, false); }
    crew.forEach(a => a.update(dt, false));
    flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 3 + i) * 0.15; });
    if (wake) wake.material.opacity = ps.docked ? 0 : 0.18 + 0.1 * Math.sin(Math.PI * Math.min(1, (ps.tc - DOCK) / 8));
    if (aboard) {
      if (!ps.docked) cfg.say.forEach(([u, txt]) => { const k = ps.trip + ':' + u; if (ps.u >= u && !said.has(k)) { said.add(k); toast(txt); } });
      if (ps.docked && ps.trip > heldTrip) {   // thuyền đã về bến sau một vòng
        heldTrip = ps.trip; toast(`⚓ ${cfg.name} đã về bến · bấm "Xuống thuyền" để lên bờ, hoặc đến người bán vé mua vé đi tiếp`);
      }
      if (ps.docked && ps.tc > DOCK - 2.5 && !ticketOk(ps.trip)) { leave(false); toast('🎫 Hết vé · mời quý khách lên bờ'); }   // sắp rời bến mà chưa có vé mới
    }
  }
  function context() {
    if (!boat || !cfg) return null;
    const ps = poseAt(now());
    if (aboard) { if (ps.docked && !ticketOk(ps.trip + (ps.tc > DOCK - 3 ? 1 : 0))) return { label: `🎫 Mua vé đi tiếp (${PRICE} 🪷)`, fn: buy }; return null; }
    if (!nearPier()) return null;
    const trip = ps.docked && ps.tc < DOCK - 3 ? ps.trip : ps.trip + 1;
    if (ticketOk(trip)) return ps.docked && ps.tc < DOCK - 3 ? { label: '⛵ Lên thuyền rồng', fn: board } : { label: `⛵ Thuyền về bến sau ${Math.ceil(cycle - ps.tc)} giây`, fn: () => toast('Đợi thuyền về bến rồi bấm Lên thuyền') };
    return { label: `🎫 Mua vé thuyền rồng (${PRICE} 🪷)`, fn: buy };
  }
  return { onTemple, dispose, step, context, walk, carry, aboard: () => aboard, info: () => ({ cycle, T, dock: DOCK, boat }) };
}
