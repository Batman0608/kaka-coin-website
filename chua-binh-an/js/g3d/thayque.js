/* =========================================================================
 *  THẦY ĐỒ XEM QUẺ ở ngoài cổng chùa
 *  Ngoài cổng nhiều chùa Việt có các cụ đồ ngồi chiếu, bày án thư nhỏ, xin quẻ
 *  đầu năm, viết câu đối. Trong game: cụ đồ ngồi bàn bên cổng tam quan, gieo 3
 *  đồng xu sáu lần lập quẻ Kinh Dịch, luận theo điều Phật tử muốn hỏi, rồi nhắc
 *  một lời nhà Phật: phúc họa do tâm, quẻ chỉ là tấm gương soi lòng.
 *  · Mỗi ngày một quẻ (giờ VN): hỏi lại cùng chủ đề trong ngày ra cùng quẻ.
 *  · Quẻ thường: miễn phí (tượng quẻ, hào động, lời khuyên).
 *  · Luận trọn vẹn (thời điểm thuận, quý nhân, hướng & màu hợp): PRICE hoa sen.
 *  Dữ liệu quẻ: js/g3d/xinque.js (MIT · Kent Juno · BEAR DEV).
 * ========================================================================= */
import { TOPICS, HEXAGRAMS, DHARMA } from './xinque.js';

const PRICE = 20;
// chỗ đã có người khác đứng (bán vé thuyền rồng, bến thuyền) — tránh ngồi đè lên
const AVOID = { 'thien-mu': [[3.2, 11.3], [8, 15.6]], 'tam-chuc': [[5.4, 34.1], [0, 41.8]], 'huong': [[14.6, 29.2], [12, 23.6]] };
const SAY = ['🪙 Xin quẻ đầu ngày, biết đường mà tu tâm!', '📜 Quẻ chỉ soi lòng, phúc do mình tạo.', '🖌 Lão ngồi đây đã ba mươi năm rồi…', '☯ Gieo ba đồng xu, sáu lần thành một quẻ.', '🙏 Vào lễ Phật xong ra đây xin quẻ nhé!'];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const vnDay = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

export function initThayQue({ THREE, scene, Avatar, label, placeLabel, me, getW, getTemple, P, save, toast, modal, closeModal, el, spend, A, chatBubble, addBeads }) {
  let npc = null;
  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75 }, o));

  /* ---------- chỗ ngồi: bên trái cổng tam quan (nhìn từ ngoài vào), phía ngoài, không đè lên điện ---------- */
  function spot(W, sides = [-1, 1], atHall = false) {
    const Y = W.layout.yard && W.layout.yard[0]; if (!Y || !Y.gate) return null;
    const [x0, z0, x1, z1] = Y.r, [gs, gat, gw = 5] = Y.gate;
    const P0 = { '+z': [gat, z1, 0, 1], '-z': [gat, z0, 0, -1], '+x': [x1, gat, 1, 0], '-x': [x0, gat, -1, 0] }[gs]; if (!P0) return null;
    const [gx, gz, nx, nz] = P0, tx = nz, tz = -nx;   // pháp tuyến ra ngoài & phương dọc cổng
    const t = getTemple(), avoid = (AVOID[t && t.id] || []).flatMap(([x, z]) => [[x, z], [x + 1.6, z], [x - 1.6, z], [x, z + 1.6], [x, z - 1.6]]).concat([W.layout.spawn], W.layout.ferry ? [W.layout.ferry.from, W.layout.ferry.to] : []);
    const flat = (x, z, ax, az) => {
      if (avoid.some(([qx, qz]) => Math.hypot(x - qx, z - qz) < 3.6 || Math.hypot(x + ax * 1.5 - qx, z + az * 1.5 - qz) < 2.4)) return null;   // chỗ ngồi & chỗ khách đứng trước bàn phải bằng phẳng, đi tới được
      const hs = [[0, 0], [ax * 1.5, az * 1.5], [-az * 0.9, ax * 0.9], [az * 0.9, -ax * 0.9], [-ax * 0.8, -az * 0.8]].map(([dx, dz]) => W.col.heightAt(x + dx, z + dz, 60, 0.4));
      return hs.every(h => h != null && Math.abs(h - hs[0]) < 0.3) ? hs[0] : null; };
    // trước cửa chánh điện, bên TRÁI (đứng ngoài sân nhìn vào điện), quay mặt vào lối giữa
    const H = atHall && W.halls && W.halls[0], MH = H && H.group && H.group.userData.mainHall;
    if (MH) { const G = H.group; G.updateMatrixWorld(true);
      const o = G.localToWorld(new THREE.Vector3(0, 0, 0)), dx = G.localToWorld(new THREE.Vector3(1, 0, 0)).sub(o);
      for (const lz of [2.2, 3.2, 4.4, 5.6, 7, 8.5]) for (const lx of [-3.4, -4.2, -5.2, -2.8, -6.4]) {
        if (-lx > MH.w / 2 + 1.5) continue;
        const p = G.localToWorld(new THREE.Vector3(lx, 0, MH.d / 2 + lz));
        if (W.burners.some(b => Math.hypot(b.x - p.x, b.z - p.z) < 2.6)) continue;
        const h = flat(p.x, p.z, dx.x, dx.z); if (h != null) return { x: p.x, z: p.z, y: h, face: Math.atan2(dx.x, dx.z) };
      } }
    for (const side of sides) for (const out of [2.6, 3.6, 1.8, 4.8, 6.5, 8.5])   // side -1: bên TRÁI cổng khi đứng ngoài nhìn vào; hết chỗ mới sang phải
      for (const lat of [gw / 2 + 2.6, gw / 2 + 3.6, gw / 2 + 1.8, gw / 2 + 5]) {
      const x = gx + nx * out + tx * side * lat, z = gz + nz * out + tz * side * lat, ax = -tx * side, az = -tz * side;   // quay mặt về lối đi vào cổng
      const h = flat(x, z, ax, az); if (h != null) return { x, z, y: h, face: Math.atan2(ax, az) };
    }
    // cổng nằm trên bậc cao/sát mép nước: ngồi gần chỗ khách mới đến
    const [sx, sz] = W.layout.spawn;
    for (const r of [4, 5.5, 7]) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, x = sx + Math.cos(a) * r, z = sz + Math.sin(a) * r, ax = -Math.cos(a), az = -Math.sin(a);
      const h = flat(x, z, ax, az); if (h != null) return { x, z, y: h, face: Math.atan2(ax, az) }; }
    return null;
  }

  /* ---------- án thư, chiếu, cờ "XIN QUẺ" ---------- */
  function signTex() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#b3241a'; g.fillRect(0, 0, 128, 512); g.strokeStyle = '#f2c14e'; g.lineWidth = 8; g.strokeRect(8, 8, 112, 496);
    g.fillStyle = '#ffe08a'; g.font = '900 54px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XIN', 'QUẺ', '☯', 'KINH', 'DỊCH'].forEach((t, i) => g.fillText(t, 64, 60 + i * 96));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function buildStall() {
    const g = new THREE.Group();
    const wood = M(0x6b3a1c, { roughness: 0.55 }), red = M(0xa8241a), gold = M(0xd9a83a, { metalness: 0.6, roughness: 0.35 }), paper = M(0xf3e6c4, { roughness: 0.95 });
    // chiếu cói
    const mat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 1.9), M(0xc9a868, { roughness: 1 })); mat.position.set(0, 0.015, 0.1); mat.receiveShadow = true; mat.userData.noCollide = true; g.add(mat);
    for (let i = -5; i <= 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.032, 0.03), M(0xa8874a)); s.position.set(0, 0.016, 0.1 + i * 0.17); s.userData.noCollide = true; g.add(s); }
    // án thư thấp trước mặt cụ đồ (+z là phía khách)
    const desk = new THREE.Group(); desk.position.set(0, 0, 0.62); g.add(desk);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.66), wood); top.position.y = 0.46; top.castShadow = true; desk.add(top);
    [[-0.66, -0.26], [0.66, -0.26], [-0.66, 0.26], [0.66, 0.26]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.43, 0.07), wood); l.position.set(x, 0.215, z); l.userData.noCollide = true; desk.add(l); });
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.3, 0.02), red); cloth.position.set(0, 0.32, 0.335); cloth.userData.noCollide = true; desk.add(cloth);   // khăn điều rủ trước bàn
    const clothTrim = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.03, 0.025), gold); clothTrim.position.set(0, 0.18, 0.336); clothTrim.userData.noCollide = true; desk.add(clothTrim);
    // sách quẻ mở, nghiên mực, bút lông, ống thẻ, ba đồng xu
    [-1, 1].forEach(s => { const pg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.32), paper); pg.position.set(-0.36 + s * 0.135, 0.505, 0.02); pg.rotation.z = -s * 0.06; pg.userData.noCollide = true; desk.add(pg); });
    const ink = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.14), M(0x1a1a1a, { roughness: 0.3 })); ink.position.set(0.15, 0.515, -0.12); ink.userData.noCollide = true; desk.add(ink);
    const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), M(0x8a5a32)); brush.rotation.z = Math.PI / 2; brush.rotation.y = 0.3; brush.position.set(0.18, 0.51, 0.06); brush.userData.noCollide = true; desk.add(brush);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.26, 12), red); tube.position.set(0.55, 0.62, -0.14); tube.userData.noCollide = true; desk.add(tube);
    for (let i = 0; i < 7; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.3, 0.006), M(0xd8b36a)); st.position.set(0.55 + (i - 3) * 0.016, 0.72, -0.14 + Math.sin(i) * 0.02); st.rotation.z = (i - 3) * 0.06; st.userData.noCollide = true; desk.add(st); }
    const coins = [];
    for (let i = 0; i < 3; i++) { const co = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), gold); co.position.set(0.36 + i * 0.11, 0.505, 0.14); co.userData.noCollide = true; desk.add(co); coins.push(co); }
    // collision: chỉ cái bàn
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.66), new THREE.MeshBasicMaterial({ visible: false })); block.position.set(0, 0.25, 0.62); g.add(block);
    // cờ dọc "XIN QUẺ KINH DỊCH" cắm sau lưng
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.9, 8), M(0x4a2a12)); pole.position.set(-0.95, 1.45, -0.55); pole.userData.noCollide = true; g.add(pole);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 6), M(0x4a2a12)); bar.rotation.z = Math.PI / 2; bar.position.set(-0.69, 2.78, -0.55); bar.userData.noCollide = true; g.add(bar);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 1.84), new THREE.MeshStandardMaterial({ map: signTex(), side: THREE.DoubleSide, roughness: 0.9 })); flag.position.set(-0.69, 1.84, -0.54); flag.userData.noCollide = true; g.add(flag);
    // lọng che nắng
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.42, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.9, side: THREE.DoubleSide })); umb.position.set(0.15, 2.45, -0.1); umb.userData.noCollide = true; umb.castShadow = true; g.add(umb);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.3, 6), M(0x4a2a12)); stick.position.set(0.15, 1.2, -0.62); stick.rotation.x = 0.22; stick.userData.noCollide = true; g.add(stick);
    return { g, coins, block, flag };
  }
  /* khăn xếp, râu bạc cho cụ đồ */
  function dress(av) {
    const h = av.head; if (!h) return;
    const hy = 0.275, hr = 0.305;
    const ink = new THREE.MeshStandardMaterial({ color: 0x1c1a20, roughness: 0.7 }), white = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.9 });
    const turban = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.98, 0.07, 10, 28), ink); turban.rotation.x = Math.PI / 2 + 0.22; turban.position.set(0, hy + 0.13, -0.02); h.add(turban);
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.9, 0.06, 10, 28), ink); t2.rotation.x = Math.PI / 2 + 0.22; t2.position.set(0, hy + 0.21, -0.04); h.add(t2);
    const capTop = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.9, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), ink); capTop.position.set(0, hy + 0.1, -0.03); capTop.rotation.x = -0.22; h.add(capTop);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 10), white); beard.rotation.x = Math.PI - 0.35; beard.position.set(0, hy - 0.3, hr * 0.92); h.add(beard);
    [-1, 1].forEach(s => { const mu = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.08, 4, 6), white); mu.rotation.z = s * 1.1; mu.position.set(s * 0.06, hy - 0.13, hr * 0.97); h.add(mu); });   // ria mép
    [-1, 1].forEach(s => { const br = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.07, 4, 6), white); br.rotation.z = Math.PI / 2 - s * 0.15; br.position.set(s * 0.1, hy + 0.06, hr * 0.96); h.add(br); });   // lông mày bạc
  }

  function onTemple() {
    dispose(); const W = getW(); if (!W) return;
    const s = spot(W, [-1, 1], true); if (!s) return;
    const st = buildStall(); st.g.position.set(s.x, s.y, s.z); st.g.rotation.y = s.face; st.g.userData.tmp = true; scene.add(st.g);
    st.g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(st.block); const box = { x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z, top: bb.max.y, bottom: bb.min.y }; W.col.boxes.push(box);
    const av = new Avatar({ look: { g: 'nam', hair: 'ngan', robe: 'nau', mala: 'go' }, seed: 83 }); dress(av);
    av.root.position.copy(new THREE.Vector3(0, 0.03, -0.05).applyMatrix4(st.g.matrixWorld)); av.root.rotation.y = s.face; av.root.userData.tmp = true; scene.add(av.root); av.setPose('lotus');
    // chỗ khách đứng hỏi quẻ (trước bàn)
    const ask = new THREE.Vector3(0, 0, 1.55).applyMatrix4(st.g.matrixWorld);
    npc = { ...st, av, box, ask, label: label('🔮 Cụ đồ xem quẻ', 'abbot'), sayT: 6 + Math.random() * 6, spin: 0, W };
  }
  function dispose() {
    if (!npc) return; scene.remove(npc.g); scene.remove(npc.av.root); npc.label.remove();
    const i = npc.W.col.boxes.indexOf(npc.box); if (i >= 0) npc.W.col.boxes.splice(i, 1);
    npc = null;
  }
  const _p = new THREE.Vector3();
  function step(dt) {
    if (!npc) return;
    npc.av.update(dt, false);
    _p.copy(npc.av.root.position); placeLabel(npc.label, _p, 1.25);
    if (npc.spin > 0) { npc.spin -= dt; npc.coins.forEach((c, i) => { c.position.y = 0.505 + Math.abs(Math.sin(npc.spin * 9 + i)) * 0.25; c.rotation.x += dt * (14 + i * 3); }); if (npc.spin <= 0) npc.coins.forEach(c => { c.position.y = 0.505; c.rotation.x = 0; }); }
    npc.sayT -= dt;
    if (npc.sayT < 0) { npc.sayT = 14 + Math.random() * 16; if (Math.hypot(me.pos.x - _p.x, me.pos.z - _p.z) < 14) chatBubble(npc.av.root, SAY[Math.random() * SAY.length | 0], '', 1.15, 4); }
  }
  function context() {
    if (!npc) return null;
    const d = Math.min(Math.hypot(me.pos.x - npc.ask.x, me.pos.z - npc.ask.z), Math.hypot(me.pos.x - _p.x, me.pos.z - _p.z) - 0.6);
    return d < 2.0 ? { label: '🔮 Xin quẻ đầu ngày', fn: open } : null;
  }

  /* ---------- lập quẻ ---------- */
  function cast(topic) {   // cùng người, cùng ngày, cùng việc → cùng quẻ (như xin quẻ thật: một việc hỏi một lần)
    const r = rnd(hash(`${P.id || P.name}|${vnDay()}|${topic}`));
    const h = HEXAGRAMS[Math.floor(r() * HEXAGRAMS.length)];
    const moving = 1 + Math.floor(r() * 6);
    // sáu lần gieo 3 đồng xu (mặt ngửa=3, sấp=2): 7 dương, 8 âm, 9 dương động, 6 âm động — khớp với vạch của quẻ
    const tosses = h.lines.map((yang, i) => { const mv = i + 1 === moving; const sum = yang ? (mv ? 9 : 7) : (mv ? 6 : 8); const heads = sum - 6; return [0, 1, 2].map(k => k < heads ? 1 : 0).sort(() => r() - 0.5); });
    return { h, moving, tosses, topic, dharma: DHARMA[Math.floor(r() * DHARMA.length)] };
  }
  const xq = () => { const d = vnDay(); if (!P.xq || P.xq.day !== d) P.xq = { day: d, asked: {}, full: {} }; return P.xq; };

  function open() {
    if (!npc) return;
    npc.av.bow && npc.av.bow();
    modal('🔮 Cụ đồ xem quẻ', (b) => {
      b.append(el('p', 'note', 'Cụ đồ ngồi chiếu bên cổng chùa, gieo ba đồng xu sáu lần lập quẻ Kinh Dịch. Mỗi ngày mỗi việc xin một quẻ.'));
      b.append(el('h3', '', 'Quý Phật tử muốn hỏi việc gì?'));
      const grid = el('div', 'xq-topics'); b.append(grid);
      const Q = xq();
      TOPICS.forEach(t => { const bt = el('button', 'xq-topic'); bt.append(el('span', '', t.icon), el('b', '', t.label)); if (Q.asked[t.id]) bt.append(el('small', '', 'đã xin hôm nay')); bt.onclick = () => throwCoins(b, t.id); grid.append(bt); });
      b.append(el('p', 'note', '🙏 Xem quẻ là nét văn hóa dân gian để tham khảo, vui là chính. Phúc họa do tâm và việc làm của mỗi người.'));
    });
  }
  function hexSvg(lines, moving, upTo = 6) {   // vẽ quẻ: hào 1 ở dưới cùng
    const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 120 132'); s.setAttribute('class', 'xq-hex');
    for (let i = 0; i < upTo; i++) { const y = 112 - i * 21, mv = i + 1 === moving, col = mv ? '#ff6a4a' : '#ffe08a';
      const r = (x, w) => { const e = document.createElementNS(ns, 'rect'); Object.entries({ x, y, width: w, height: 12, rx: 3, fill: col }).forEach(([k, v]) => e.setAttribute(k, v)); s.append(e); };
      if (lines[i]) r(10, 100); else { r(10, 43); r(67, 43); }
      if (mv) { const c = document.createElementNS(ns, 'circle'); Object.entries({ cx: 60, cy: y + 6, r: 4, fill: '#fff' }).forEach(([k, v]) => c.setAttribute(k, v)); s.append(c); } }
    return s;
  }
  function throwCoins(b, topic) {
    const Q = xq(), R = cast(topic), first = !Q.asked[topic];
    Q.asked[topic] = 1; save();
    b.innerHTML = ''; const head = el('div', 'mhead'); head.append(el('h2', '', '🪙 Gieo quẻ')); const x = el('button', 'x', '✕'); x.onclick = closeModal; head.append(x); b.append(head);
    const T = TOPICS.find(t => t.id === topic);
    b.append(el('p', 'note', `Cụ đồ khấn: "Đệ tử ${P.name || "Phật tử"} xin hỏi việc ${T.label.toLowerCase()}…" rồi gieo đồng xu.`));
    const stage = el('div', 'xq-stage'), coinRow = el('div', 'xq-coins'), hexBox = el('div', 'xq-hexbox'), tally = el('div', 'note');
    stage.append(coinRow, hexBox); b.append(stage, tally);
    const coinEls = [0, 1, 2].map(() => { const c = el('i', 'xq-coin'); coinRow.append(c); return c; });
    hexBox.append(hexSvg(R.h.lines, R.moving, 0));
    if (npc) npc.spin = 4.2; A && A.khanh && A.khanh();
    let i = 0;
    const next = () => {
      if (!b.isConnected) return;
      if (i >= 6) return reveal(b, R, first);
      coinEls.forEach(c => { c.classList.remove('up', 'dn'); c.classList.add('spin'); });
      setTimeout(() => { if (!b.isConnected) return;
        R.tosses[i].forEach((hd, k) => { coinEls[k].classList.remove('spin'); coinEls[k].classList.add(hd ? 'up' : 'dn'); });
        i++; hexBox.innerHTML = ''; hexBox.append(hexSvg(R.h.lines, R.moving, i));
        tally.textContent = `Lần gieo ${i}/6 · ${R.tosses[i - 1].filter(Boolean).length} ngửa · hào ${i}: ${R.h.lines[i - 1] ? 'dương ⚊' : 'âm ⚋'}${i === R.moving ? ' (hào động)' : ''}`;
        setTimeout(next, 420); }, 380);
    };
    setTimeout(next, 300);
  }
  function reveal(b, R, first) {
    const { h } = R, T = TOPICS.find(t => t.id === R.topic), Q = xq(), full = !!Q.full[R.topic];
    b.innerHTML = ''; const head = el('div', 'mhead'); head.append(el('h2', '', `☯ Quẻ ${h.name}`)); const x = el('button', 'x', '✕'); x.onclick = closeModal; head.append(x); b.append(head);
    const top = el('div', 'xq-top'); top.append(hexSvg(h.lines, R.moving));
    const info = el('div'); info.append(el('div', 'big', `Quẻ số ${h.num} · ${h.name}`), el('div', 'xq-rank', h.rank), el('div', 'note', `${T.icon} Hỏi về ${T.label.toLowerCase()}`)); top.append(info); b.append(top);
    b.append(el('p', 'xq-verse', `“${h.verse}”`));
    b.append(el('h3', '', `${T.icon} ${T.label}`), el('p', '', h.topics[R.topic] || h.topics.tong_quan));
    b.append(el('h3', '', '🔁 Hào động'), el('p', '', `Hào ${R.moving} động, quẻ biến sang ${h.changed}.`));
    b.append(el('h3', '', '🖌 Lời khuyên của cụ đồ'), el('p', '', h.advice));
    const deep = el('div'); b.append(deep);
    const showDeep = () => { deep.innerHTML = ''; deep.append(el('h3', '', '👑 Luận trọn vẹn'),
      el('p', '', `⏰ Thời điểm thuận lợi: ${h.lucky.time}`), el('p', '', `🤝 Quý nhân phù trợ: ${h.lucky.noble}`), el('p', '', `🧭 Hướng & màu hợp: ${h.lucky.dir}`)); };
    if (full) showDeep();
    else { const bt = el('button', 'btn gold', `👑 Xin cụ luận trọn vẹn · ${PRICE} 🪷`); bt.onclick = () => { if (!spend(PRICE)) return toast(`Cần ${PRICE} hoa sen để cụ luận trọn vẹn`); Q.full[R.topic] = 1; save(); showDeep(); A && A.khanh && A.khanh(); }; deep.append(el('div', 'row', null)); deep.firstChild.append(bt); }
    b.append(el('div', 'xq-dharma', `🪷 ${R.dharma}`));
    const row = el('div', 'row'); const again = el('button', 'btn', '↺ Hỏi việc khác'); again.onclick = open; const ok = el('button', 'btn gold', '🙏 Cảm ơn cụ'); ok.onclick = closeModal; row.append(again, ok); b.append(row);
    b.append(el('p', 'note', 'Dữ liệu quẻ: dự án Tử Vi Phát Đạt — BEAR DEV (giấy phép MIT).'));
    if (A && A.speak) A.speak(`Quẻ ${h.name}. ${h.verse} ${h.topics[R.topic] || ''} ${R.dharma}`, 'story');
    if (first) window.dispatchEvent(new CustomEvent('cba-ev', { detail: { k: 'xinque', id: R.topic } }));
    if (npc) chatBubble(npc.av.root, `☯ Quẻ ${h.name} · ${h.rank}`, '', 1.15, 4);
  }
  return { onTemple, dispose, step, context, open, info: () => npc && { x: npc.g.position.x, y: npc.g.position.y, z: npc.g.position.z, ask: npc.ask } };
}
