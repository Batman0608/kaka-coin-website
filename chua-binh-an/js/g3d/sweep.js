/* =========================================================================
 *  QUÉT SÂN CHÙA — tích công đức bằng việc làm: lá rụng thành từng đống trong
 *  sân, người chơi đến gần bấm "🧹 Quét sân" → cầm chổi tre quét, lá bay đi,
 *  được cộng công đức (theo hạn mức công đức miễn phí mỗi ngày) và hạt.
 *  Quét sạch cả sân: thưởng thêm. Lá rụng lại sau ít phút.
 * ========================================================================= */
export function initSweep({ THREE, scene, me, getW, getTemple, P, save, toast, banner, A, addMerit, addBeads, meritTxt }) {
  let piles = [], busy = null, broom = null, respawnAt = 0, tipped = false;
  const LEAF_C = [0xc9862a, 0xa8551c, 0xd9a23a, 0x8a6a2a, 0xb84a1a, 0x9a7a30];
  const leafMats = LEAF_C.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide }));
  const leafGeo = new THREE.PlaneGeometry(0.16, 0.1);
  function makePile(x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y + 0.02, z);
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 0.7) * 0.9, l = new THREE.Mesh(leafGeo, leafMats[i % leafMats.length]);
      l.position.set(Math.cos(a) * r, 0.01 + (0.9 - r) * 0.12 * Math.random(), Math.sin(a) * r); l.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.6, 0, Math.random() * 6.3);
      l.userData = { noCollide: true, v: null }; g.add(l);
    }
    g.userData.noCollide = true; scene.add(g); return g;
  }
  function spots(n) {
    const W = getW(); if (!W || !W.layout || !W.layout.yard) return [];
    const out = [], halls = W.halls || [], q = W.quizSpots || [];
    const yards = W.layout.yard;
    for (let tries = 0; tries < 900 && out.length < n; tries++) {
      const Y = yards[tries % yards.length], [x0, z0, x1, z1] = Y.r, y0 = Y.y || 0;
      const x = x0 + 3 + Math.random() * (x1 - x0 - 6), z = z0 + 3 + Math.random() * (z1 - z0 - 6);
      if (halls.some(h => Math.hypot(x - h.altar.x, z - h.altar.z) < Math.max(h.w || 10, h.d || 10) / 2 + 3)) continue;
      if ((W.burners || []).some(b => Math.hypot(x - b.x, z - b.z) < 2.6)) continue;
      if (q.some(s => Math.hypot(x - s.x, z - s.z) < 4.2)) continue;
      if (out.some(p => Math.hypot(x - p.x, z - p.z) < 6)) continue;
      let ok = true;
      for (let i = 0; i <= 6 && ok; i++) { const a = i / 6 * Math.PI * 2, rr = i === 6 ? 0 : 1.3, hh = W.col.heightAt(x + Math.cos(a) * rr, z + Math.sin(a) * rr, y0 + 0.3, 0.3); if (hh == null || Math.abs(hh - y0) > 0.05) ok = false; }
      if (ok) out.push({ x, z, y: y0 });
    }
    return out;
  }
  function onTemple() {
    dispose(); const W = getW(); if (!W || !W.layout || !W.layout.yard) return;
    const big = W.layout.yard.reduce((a, Y) => a + (Y.r[2] - Y.r[0]) * (Y.r[3] - Y.r[1]), 0);
    const n = Math.max(4, Math.min(10, Math.round(big / 320)));
    piles = spots(n).map(s => ({ ...s, g: makePile(s.x, s.y, s.z), done: false }));
    respawnAt = 0;
    if (piles.length && !P.sweepTip) setTimeout(() => { if (piles.length) { toast('🍂 Sân chùa có lá rụng · đến gần đống lá, bấm "🧹 Quét sân" để tích công đức'); P.sweepTip = 1; save(); } }, 9000);
  }
  function dispose() { piles.forEach(p => { if (p.g) scene.remove(p.g); }); piles = []; if (broom) { scene.remove(broom); broom = null; } busy = null; }
  function getBroom() {
    if (broom) return broom;
    const g = new THREE.Group(), stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.8 }));
    stick.position.y = 0.75; g.add(stick);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9a65a, roughness: 1, side: THREE.DoubleSide })); head.position.y = 0.05; head.rotation.x = Math.PI; g.add(head);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xa3231a })); band.position.y = 0.32; g.add(band);
    g.traverse(o => { o.userData.noCollide = true; }); broom = g; return g;
  }
  function near() { return piles.find(p => !p.done && Math.hypot(me.pos.x - p.x, me.pos.z - p.z) < 1.9); }
  function context() {
    if (busy) return { label: '🧹 Đang quét…', fn: () => {} };
    const p = near(); if (!p) return null;
    return { label: '🧹 Quét sân · tích công đức', fn: () => sweep(p) };
  }
  function sweep(p) {
    if (busy || p.done) return;
    me.yaw = Math.atan2(p.x - me.pos.x, p.z - me.pos.z);
    const b = getBroom(); scene.add(b); busy = { p, t0: performance.now(), dur: 2.6 };
    p.g.children.forEach(l => { const a = me.yaw + (Math.random() - 0.5) * 1.6; l.userData.v = new THREE.Vector3(Math.sin(a) * (1 + Math.random() * 2), 0.6 + Math.random() * 0.8, Math.cos(a) * (1 + Math.random() * 2)); l.userData.delay = Math.random() * 1.6; });
    if (me.av && me.av.bow) me.av.bow();
  }
  function step(dt, t) {
    if (busy) {
      const { p } = busy, k = (performance.now() - busy.t0) / 1000;   // tính theo thời gian thật (máy chậm vẫn đúng 2,6 giây)
      // chổi quét qua lại phía trước nhân vật
      const sw = Math.sin(k * 7) * 0.55, fx = Math.sin(me.yaw), fz = Math.cos(me.yaw), rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
      if (broom) { broom.position.set(me.pos.x + fx * 0.75 + rx * (0.25 + sw), me.y + 0.05, me.pos.z + fz * 0.75 + rz * (0.25 + sw)); broom.rotation.set(0, me.yaw, 0); broom.rotateX(0.5); broom.rotateZ(-sw * 0.6); }
      p.g.children.forEach(l => { const u = l.userData; if (!u.v || k < u.delay) return; l.position.addScaledVector(u.v, dt); u.v.y -= dt * 1.6; l.rotation.z += dt * 6; if (l.position.y < 0) { l.position.y = 0; u.v.multiplyScalar(0.6); } l.material = l.material; l.scale.multiplyScalar(1 - dt * 0.35); });
      if (k > busy.dur) {
        p.done = true; scene.remove(p.g); if (broom) scene.remove(broom); busy = null;
        const gm = addMerit(5, true); addBeads(3); P.sweep = (P.sweep || 0) + 1; save(); window.dispatchEvent(new CustomEvent('cba-ev', { detail: 'sweep' })); A.smallBell && A.smallBell();
        const left = piles.filter(x => !x.done).length;
        toast(`🧹 Đã quét sạch một góc sân · ${meritTxt(gm)}, +3 hạt${left ? ` · còn ${left} đống lá` : ''}`);
        if (!left) { window.dispatchEvent(new CustomEvent('cba-ev', { detail: 'sweepall' })); const g2 = addMerit(20, true); addBeads(20); A.khanh && A.khanh(); banner('🧹 Sân chùa sạch sẽ', `Cảm ơn ${P.name || 'bạn'} đã quét sạch sân ${getTemple().name}`, `${meritTxt(g2)} · +20 hạt · lá sẽ rụng lại sau ít phút`); respawnAt = performance.now() + 8 * 60000; }
      }
    }
    if (respawnAt && performance.now() > respawnAt) { respawnAt = 0; onTemple(); }
    // lá khẽ lay động
    if (piles.length && !busy) { const s = Math.sin(t * 1.3) * 0.02; piles.forEach(p => { if (!p.done) p.g.rotation.y = s; }); }
  }
  const nearest = () => piles.filter(p => !p.done).sort((a, b) => Math.hypot(a.x - me.pos.x, a.z - me.pos.z) - Math.hypot(b.x - me.pos.x, b.z - me.pos.z))[0] || null;
  return { onTemple, dispose, step, context, nearest, busy: () => !!busy };
}
