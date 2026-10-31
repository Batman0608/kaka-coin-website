/* =========================================================================
 *  HIỆU ỨNG CANVAS: khói hương, cánh sen, hoa đăng, sen vàng, rồng vàng,
 *  hào quang, sóng chuông, lấp lánh.
 * ========================================================================= */
window.CBA = window.CBA || {};

CBA.FX = (() => {
  const W = 1080, H = 1920;
  let c, parts = [], dragons = [], rays = [], smokeBoost = 0, last = 0;
  const BURNER = { x: 540, y: 905 };
  const BUDDHA = { x: 540, y: 430 };
  const rnd = (a, b) => a + Math.random() * (b - a);

  function init(canvas) { c = canvas.getContext('2d'); requestAnimationFrame(loop); }

  /* ---------- hình vẽ ---------- */
  function lotus(x, y, s, a = 1, petal = '#ffd56a', inner = '#fff4cf', glow = 0) {
    c.save(); c.translate(x, y); c.globalAlpha = a;
    if (glow) { c.shadowColor = 'rgba(255,210,90,.95)'; c.shadowBlur = glow; }
    const draw = (ang, len, wid, col) => {
      c.save(); c.rotate(ang); c.beginPath(); c.moveTo(0, 0);
      c.quadraticCurveTo(-wid, -len * .55, 0, -len); c.quadraticCurveTo(wid, -len * .55, 0, 0);
      c.fillStyle = col; c.fill(); c.restore();
    };
    [-1.25, 1.25, -0.85, 0.85].forEach(r => draw(r, s * .8, s * .3, petal));
    [-0.45, 0.45].forEach(r => draw(r, s * .95, s * .3, petal));
    draw(0, s, s * .32, inner);
    c.restore();
  }
  function petal(x, y, s, rot, col, a) {
    c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a;
    c.beginPath(); c.ellipse(0, 0, s * .45, s, 0, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.restore();
  }
  function glowDot(x, y, r, col, a) {
    c.save(); c.globalAlpha = a; c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,160,40,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.restore();
  }

  /* ---------- tạo hạt ---------- */
  function smoke(n = 1, x = BURNER.x, y = BURNER.y) {
    for (let i = 0; i < n; i++) parts.push({ k: 'smoke', x: x + rnd(-18, 18), y, vx: rnd(-6, 6), vy: rnd(-55, -35), r: rnd(6, 12), life: 0, max: rnd(5, 8), ph: rnd(0, 6) });
  }
  function petals(n = 12, fromBottom = true) {
    const cols = ['#ffb3c6', '#ff8fab', '#ffd6e0', '#ffe08a', '#fff1c2'];
    for (let i = 0; i < n; i++) {
      parts.push(fromBottom
        ? { k: 'petal', x: rnd(80, 1000), y: H + 20, vx: rnd(-30, 30), vy: rnd(-260, -160), s: rnd(7, 12), rot: rnd(0, 6), vr: rnd(-3, 3), col: cols[i % cols.length], life: 0, max: rnd(3, 5) }
        : { k: 'petal', x: rnd(0, W), y: rnd(-200, -10), vx: rnd(-25, 25), vy: rnd(90, 170), s: rnd(8, 13), rot: rnd(0, 6), vr: rnd(-3, 3), col: cols[i % cols.length], life: 0, max: rnd(8, 12) });
    }
  }
  function lotusUp(x, y) {   // sen nhỏ bay lên khi thả tim
    parts.push({ k: 'lotusUp', x, y, vy: rnd(-120, -80), vx: rnd(-15, 15), s: rnd(14, 22), life: 0, max: 3 });
  }
  function goldenLotus(fromX = 540, fromY = 1700) {
    parts.push({ k: 'goldLotus', x: fromX, y: fromY, x0: fromX, y0: fromY, tx: 540, ty: 760, life: 0, max: 4.5 });
    sparkle(30, fromX, fromY);
  }
  function lanterns(n = 36) {
    for (let i = 0; i < n; i++) parts.push({ k: 'lantern', x: rnd(60, 1020), y: H + rnd(20, 900), vx: rnd(-10, 10), vy: rnd(-120, -70), s: rnd(26, 46), life: 0, max: 16, ph: rnd(0, 6) });
  }
  function sparkle(n, x, y, spread = 60) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(40, 220);
      parts.push({ k: 'spark', x: x + rnd(-spread, spread) * .3, y: y + rnd(-spread, spread) * .3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, r: rnd(2, 5), life: 0, max: rnd(.8, 1.8) });
    }
  }
  function ring(x = BUDDHA.x, y = 300, col = 'rgba(255,215,110,') { parts.push({ k: 'ring', x, y, r: 20, life: 0, max: 2.4, col }); }
  function halo(sec = 6) { rays.push({ life: 0, max: sec }); }
  function dragon(sec = 11) { dragons.push({ t: 0, max: sec, hist: [] }); }
  function boostSmoke(v) { smokeBoost = Math.min(30, smokeBoost + v); }

  /* ---------- rồng ---------- */
  function dragonHead(d, dt) {
    d.t += dt;
    const th = d.t * 0.75;
    const x = 540 + 430 * Math.sin(th);
    const y = 560 + 300 * Math.sin(th * 2) * 0.55 + 140 * Math.cos(th * 0.5) - 60;
    d.hist.unshift({ x, y });
    if (d.hist.length > 260) d.hist.pop();
  }
  function drawDragon(d) {
    const fade = Math.min(1, d.t / 1, (d.max - d.t) / 1.2);
    const N = 46;
    c.save(); c.globalAlpha = Math.max(0, fade);
    for (let i = N - 1; i >= 0; i--) {
      const p = d.hist[Math.min(d.hist.length - 1, i * 5)]; if (!p) continue;
      const r = 26 * (1 - i / N * 0.75);
      const g = c.createRadialGradient(p.x - r * .3, p.y - r * .3, 1, p.x, p.y, r);
      g.addColorStop(0, '#fff3b0'); g.addColorStop(.5, '#f3c047'); g.addColorStop(1, '#a86d14');
      c.shadowColor = 'rgba(255,200,80,.9)'; c.shadowBlur = 18;
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
      if (i % 3 === 0) { // vây lưng
        const q = d.hist[Math.min(d.hist.length - 1, i * 5 + 3)] || p;
        const ang = Math.atan2(p.y - q.y, p.x - q.x) - Math.PI / 2;
        c.fillStyle = '#d9472f';
        c.beginPath(); c.moveTo(p.x + Math.cos(ang) * r * .6, p.y + Math.sin(ang) * r * .6);
        c.lineTo(p.x + Math.cos(ang) * r * 1.6, p.y + Math.sin(ang) * r * 1.6);
        c.lineTo(p.x + Math.cos(ang + .5) * r * .8, p.y + Math.sin(ang + .5) * r * .8); c.fill();
      }
    }
    // đầu rồng
    const h = d.hist[0], h2 = d.hist[4] || h;
    if (h) {
      const ang = Math.atan2(h.y - h2.y, h.x - h2.x);
      c.translate(h.x, h.y); c.rotate(ang);
      c.shadowBlur = 30; c.shadowColor = 'rgba(255,220,120,1)';
      c.fillStyle = '#f3c047';
      c.beginPath(); c.ellipse(10, 0, 40, 26, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(30, -12); c.lineTo(66, -6); c.lineTo(66, 8); c.lineTo(30, 14); c.fill(); // mõm
      c.strokeStyle = '#ffe9a0'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(-30, -60, -50, -50); c.stroke(); // sừng
      c.beginPath(); c.moveTo(0, 20); c.quadraticCurveTo(-30, 60, -50, 50); c.stroke();
      c.strokeStyle = '#fff6d0'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(60, -4); c.quadraticCurveTo(90, -40, 120, -20); c.stroke(); // râu
      c.beginPath(); c.moveTo(60, 6); c.quadraticCurveTo(90, 40, 120, 24); c.stroke();
      c.shadowBlur = 0; c.fillStyle = '#b3261e';
      c.beginPath(); c.arc(26, -10, 6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(26, 10, 6, 0, Math.PI * 2); c.fill();
      // ngọc
      c.rotate(-ang); glowDot(Math.cos(ang) * 130, Math.sin(ang) * 130, 30, 'rgba(255,255,230,1)', .9);
    }
    c.restore();
    if (Math.random() < .5 && h) sparkle(1, h.x, h.y, 20);
  }

  /* ---------- vòng lặp ---------- */
  function loop(ts) {
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    c.clearRect(0, 0, W, H);

    // hào quang tỏa
    rays = rays.filter(r => (r.life += dt) < r.max);
    rays.forEach(r => {
      const a = Math.min(1, r.life / .8, (r.max - r.life) / 1.2);
      c.save(); c.translate(BUDDHA.x, BUDDHA.y); c.rotate(r.life * .25); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 24; i++) {
        c.rotate(Math.PI * 2 / 24);
        const g = c.createLinearGradient(0, 0, 0, -1100);
        g.addColorStop(0, `rgba(255,236,160,${.18 * a})`); g.addColorStop(1, 'rgba(255,200,80,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(-14, 0); c.lineTo(-70, -1100); c.lineTo(70, -1100); c.lineTo(14, 0); c.fill();
      }
      c.restore();
      glowDot(BUDDHA.x, BUDDHA.y, 260, `rgba(255,245,200,${.3 * a})`, 1);
    });

    // khói hương
    if (Math.random() < dt * (2.5 + smokeBoost)) smoke(1);
    smokeBoost = Math.max(0, smokeBoost - dt * 1.5);

    parts = parts.filter(p => (p.life += dt) < p.max);
    for (const p of parts) {
      const t = p.life / p.max;
      switch (p.k) {
        case 'smoke': {
          p.x += (p.vx + Math.sin(p.life * 1.4 + p.ph) * 14) * dt; p.y += p.vy * dt; p.r += 9 * dt;
          const a = 0.22 * Math.sin(Math.PI * Math.min(1, t * 1.2));
          const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, `rgba(240,235,225,${a})`); g.addColorStop(1, 'rgba(240,235,225,0)');
          c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
          break;
        }
        case 'petal':
          p.x += (p.vx + Math.sin(p.life * 2 + p.rot) * 30) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.vy < 0) p.vy += 40 * dt;
          petal(p.x, p.y, p.s, p.rot, p.col, Math.min(1, (1 - t) * 3));
          break;
        case 'lotusUp':
          p.x += p.vx * dt; p.y += p.vy * dt;
          lotus(p.x, p.y, p.s, Math.min(1, (1 - t) * 2), '#ff9fb8', '#ffe0ea');
          break;
        case 'goldLotus': {
          const e = Math.min(1, t / .55), ease = 1 - Math.pow(1 - e, 3);
          p.x = p.x0 + (p.tx - p.x0) * ease; p.y = p.y0 + (p.ty - p.y0) * ease - Math.sin(e * Math.PI) * 120;
          const s = 40 + 50 * ease;
          glowDot(p.x, p.y - s * .4, s * 1.6, 'rgba(255,230,140,.9)', t > .8 ? (1 - t) * 5 : 1);
          lotus(p.x, p.y, s, t > .8 ? (1 - t) * 5 : 1, '#ffd56a', '#fff4cf', 30);
          break;
        }
        case 'lantern': {
          p.x += (p.vx + Math.sin(p.life + p.ph) * 12) * dt; p.y += p.vy * dt;
          const a = Math.min(1, p.life / 1, (p.max - p.life) / 2);
          glowDot(p.x, p.y - p.s * .5, p.s * 2.2, 'rgba(255,190,90,.8)', a * .9);
          lotus(p.x, p.y, p.s, a, '#ff8fab', '#ffe0ea');
          glowDot(p.x, p.y - p.s * .55, p.s * .35, 'rgba(255,255,220,1)', a);
          break;
        }
        case 'spark':
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.vx *= .98;
          glowDot(p.x, p.y, p.r * 3, 'rgba(255,240,180,1)', 1 - t);
          break;
        case 'ring':
          p.r += 420 * dt;
          c.save(); c.strokeStyle = p.col + (0.8 * (1 - t)) + ')'; c.lineWidth = 6 * (1 - t) + 1;
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke(); c.restore();
          break;
      }
    }
    if (parts.length > 1400) parts.splice(0, parts.length - 1400);

    dragons = dragons.filter(d => d.t < d.max);
    dragons.forEach(d => { dragonHead(d, dt); drawDragon(d); });

    requestAnimationFrame(loop);
  }

  return { init, smoke, petals, lotusUp, goldenLotus, lanterns, sparkle, ring, halo, dragon, boostSmoke, BURNER };
})();
