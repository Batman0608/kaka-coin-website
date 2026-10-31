/* =========================================================================
 *  HÀO QUANG SAU TƯỢNG PHẬT (vẽ phía sau tượng, liên tục chuyển động)
 *  - Vầng sáng thân (mandorla) + vầng sáng đầu (nimbus) + tia sáng xoay
 *  - Dấu ấn riêng: Dược Sư = tinh thể lưu ly xanh; Thích Ca = bánh xe pháp;
 *    A Di Đà = cánh sen rơi; Di Lặc = ánh vàng ấm
 *  - manifest(i): Phật hiện — hào quang bừng sáng khi có người được Phật Quang
 * ========================================================================= */
window.CBA = window.CBA || {};

CBA.Aura = (() => {
  let c, W, H, B = [], last = 0, parts = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  /* list: [{ x, head, body, w, h, color, kind }] */
  function set(list) { B = list.map((b, i) => Object.assign({ boost: 0, boostUntil: 0, i }, B[i] || {}, b)); }
  function init(canvas) { c = canvas.getContext('2d'); W = canvas.width; H = canvas.height; requestAnimationFrame(loop); }
  function manifest(i, sec = 14) { if (B[i]) { B[i].boostUntil = performance.now() + sec * 1000; B[i].boostLen = sec * 1000; } }
  function all(sec = 6) { B.forEach((b, i) => manifest(i, sec)); }

  function rays(b, t, k, n, len, alpha, width) {
    c.save(); c.translate(b.x, b.head); c.rotate(t * 0.06 * (b.i % 2 ? -1 : 1));
    c.globalCompositeOperation = 'lighter';
    for (let r = 0; r < n; r++) {
      c.rotate(Math.PI * 2 / n);
      const L = len * (r % 2 ? 0.72 : 1) * (1 + 0.06 * Math.sin(t * 1.3 + r));
      const g = c.createLinearGradient(0, 0, 0, -L);
      g.addColorStop(0, hexA(b.color, alpha * k)); g.addColorStop(1, hexA(b.color, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(-width, 0); c.lineTo(-width * 2.4, -L); c.lineTo(width * 2.4, -L); c.lineTo(width, 0); c.fill();
    }
    c.restore();
  }
  function wheel(b, t, r, alpha) {   // bánh xe pháp 8 nan
    c.save(); c.translate(b.x, b.head); c.rotate(t * 0.15);
    c.strokeStyle = `rgba(255,230,150,${alpha})`; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.22, 0, Math.PI * 2); c.stroke();
    for (let s = 0; s < 8; s++) { const a = s * Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.stroke(); }
    for (let s = 0; s < 8; s++) { const a = s * Math.PI / 4 + Math.PI / 8; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 4, 0, Math.PI * 2); c.fillStyle = `rgba(255,230,150,${alpha})`; c.fill(); }
    c.restore();
  }

  function loop(ts) {
    const t = ts / 1000, dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    c.clearRect(0, 0, W, H);
    B.forEach((b) => {
      // độ bừng sáng khi Phật hiện: lên nhanh, giữ, tắt dần
      let m = 0;
      if (b.boostUntil > ts) { const left = b.boostUntil - ts, el = b.boostLen - left; m = Math.min(1, el / 900, left / 2500); }
      const k = 1 + m * 1.6;
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.4 + b.i * 2);

      // vầng sáng thân (mandorla)
      c.save(); c.globalCompositeOperation = 'lighter';
      const rx = b.w * (0.62 + 0.18 * m), ry = b.h * (0.6 + 0.15 * m);
      const g = c.createRadialGradient(b.x, b.body, 0, b.x, b.body, Math.max(rx, ry));
      g.addColorStop(0, hexA(b.color, 0.32 * pulse * k)); g.addColorStop(0.55, hexA(b.color, 0.16 * pulse * k)); g.addColorStop(1, hexA(b.color, 0));
      c.fillStyle = g; c.beginPath(); c.ellipse(b.x, b.body, rx, ry, 0, 0, Math.PI * 2); c.fill();
      // viền lửa của mandorla
      c.strokeStyle = hexA(b.color, (0.22 + 0.35 * m) * pulse); c.lineWidth = 3 + 4 * m;
      c.beginPath(); c.ellipse(b.x, b.body - b.h * 0.04, rx * 0.86, ry * 0.92, 0, 0, Math.PI * 2); c.stroke();
      c.restore();

      // tia sáng xoay sau đầu
      rays(b, t, k, 28, b.w * (0.9 + 0.9 * m), 0.16, 2.2 + 2 * m);

      // vầng sáng đầu (nimbus)
      c.save(); c.globalCompositeOperation = 'lighter';
      const hr = b.w * (0.3 + 0.08 * m);
      const hg = c.createRadialGradient(b.x, b.head, hr * 0.2, b.x, b.head, hr);
      hg.addColorStop(0, `rgba(255,250,225,${0.55 * k * pulse})`); hg.addColorStop(0.6, hexA(b.color, 0.35 * k)); hg.addColorStop(1, hexA(b.color, 0));
      c.fillStyle = hg; c.beginPath(); c.arc(b.x, b.head, hr, 0, Math.PI * 2); c.fill();
      c.strokeStyle = `rgba(255,236,170,${0.55 + 0.3 * m})`; c.lineWidth = 2.5;
      c.beginPath(); c.arc(b.x, b.head, hr * 0.78, 0, Math.PI * 2); c.stroke();
      c.restore();

      // dấu ấn riêng của từng vị
      if (b.kind === 'thichca') wheel(b, t, b.w * 0.36, 0.22 + 0.5 * m);
      const rate = (b.kind === 'duocsu' || b.kind === 'adida' ? 2.5 : 1.5) * (1 + m * 8);
      if (Math.random() < dt * rate) {
        const a = rnd(0, Math.PI * 2), rr = rnd(0.4, 1) * b.w * 0.7;
        if (b.kind === 'duocsu') parts.push({ k: 'crystal', x: b.x + Math.cos(a) * rr, y: b.body + Math.sin(a) * rr * 1.1, vy: rnd(-25, -10), life: 0, max: rnd(2, 4), s: rnd(3, 6), rot: rnd(0, 6) });
        else if (b.kind === 'adida') parts.push({ k: 'petal', x: b.x + rnd(-b.w * 0.8, b.w * 0.8), y: b.head - b.h * 0.3, vy: rnd(25, 50), vx: rnd(-10, 10), life: 0, max: rnd(4, 7), s: rnd(5, 9), rot: rnd(0, 6) });
        else parts.push({ k: 'mote', x: b.x + Math.cos(a) * rr, y: b.body + Math.sin(a) * rr, vy: rnd(-30, -12), life: 0, max: rnd(2, 4), s: rnd(2, 4) });
      }
    });

    parts = parts.filter(p => (p.life += dt) < p.max);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const a = Math.sin(Math.PI * p.life / p.max);
      p.y += p.vy * dt; if (p.vx) p.x += (p.vx + Math.sin(p.life * 2 + p.rot) * 12) * dt;
      if (p.k === 'crystal') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot + p.life); c.fillStyle = `rgba(170,215,255,${0.8 * a})`;
        c.beginPath(); for (let s = 0; s < 6; s++) { const an = s * Math.PI / 3; c.lineTo(Math.cos(an) * p.s, Math.sin(an) * p.s); } c.fill(); c.restore();
      } else if (p.k === 'petal') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot + p.life); c.fillStyle = `rgba(255,170,190,${0.75 * a})`;
        c.beginPath(); c.ellipse(0, 0, p.s * 0.45, p.s, 0, 0, Math.PI * 2); c.fill(); c.restore();
      } else {
        c.fillStyle = `rgba(255,236,170,${0.8 * a})`; c.beginPath(); c.arc(p.x, p.y, p.s, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
    if (parts.length > 400) parts.splice(0, parts.length - 400);
    requestAnimationFrame(loop);
  }

  return { init, set, manifest, all, list: () => B };
})();
