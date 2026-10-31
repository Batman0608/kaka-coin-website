/* =========================================================================
 *  CHÙA BÌNH AN ONLINE — LÕI GAME (chạy trên màn hình phát live.html)
 *  API chính (gọi được từ console hoặc bảng điều khiển):
 *    CBA.game.spawnPlayer(name, avatar)
 *    CBA.game.triggerGiftEffect(tierId | giftName, username, coins)
 *    CBA.game.addGongSound()
 *    CBA.game.event({type:'chat'|'like'|'gift'|..., ...})
 * ========================================================================= */
(() => {
  const C = CBA.config, A = CBA.Audio, FX = CBA.FX, T = CBA.TikTok;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const now = () => Date.now();
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const fmt = (n) => Math.round(n || 0).toLocaleString('vi-VN');
  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fill = (tpl, name) => tpl.replace(/\{name\}/g, name);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  /* ============================ KHUNG HÌNH ============================ */
  const stage = $('stage');
  function fit() {
    const s = Math.min(innerWidth / 1080, innerHeight / 1920);
    stage.style.transform = `scale(${s}) translate(-50%, -50%)`;
  }
  addEventListener('resize', fit); fit();

  /* ============================ TRẠNG THÁI ============================ */
  const KEY = 'cba_session_v1';
  const fresh = () => ({ started: now(), merit: 0, beads: 0, coins: 0, likes: 0, comments: 0, gifts: 0, follows: 0, shares: 0,
    users: {}, segment: C.segments[0].id, candles: 0, offerings: [] });
  let S = fresh();
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) {}
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        const ids = Object.keys(S.users);
        if (ids.length > 3000) { // giữ lại người có điểm cao nhất
          ids.sort((a, b) => (S.users[b].merit * 10 + S.users[b].beads) - (S.users[a].merit * 10 + S.users[a].beads));
          ids.slice(3000).forEach(id => delete S.users[id]);
        }
        localStorage.setItem(KEY, JSON.stringify(S));
      } catch (e) {}
    }, 1500);
  }

  let viewers = 0, simActiveUntil = 0, lastEventAt = 0;
  const present = new Map();   // id -> { u, fig, seat, since }
  let dirtySeats = false, dirtyBoard = true;

  function user(ev) {
    const id = ev.id || ('anon_' + norm(ev.name));
    let u = S.users[id];
    if (!u) u = S.users[id] = { id, name: ev.name || 'Phật tử', avatar: ev.avatar || '', merit: 0, beads: 0, coins: 0, last: now(), rose: '' };
    if (ev.name) u.name = ev.name;
    if (ev.avatar) u.avatar = ev.avatar;
    u.last = now();
    checkIn(u);
    return u;
  }

  /* ===================== HỒ SƠ LÂU DÀI: CẤP ĐỘ · CHUỖI NGÀY · BẢNG VÀNG TUẦN =====================
     Lưu riêng (không bị xóa khi bắt đầu phiên mới) — người xem quay lại vẫn giữ cấp và chuỗi ngày. */
  const PKEY = 'cba_profiles_v1';
  let P = {};
  try { P = JSON.parse(localStorage.getItem(PKEY) || '{}') || {}; } catch (e) {}
  let savePT = null;
  function saveP() {
    clearTimeout(savePT);
    savePT = setTimeout(() => {
      try {
        const ids = Object.keys(P);
        if (ids.length > 20000) { ids.sort((a, b) => P[b].beads - P[a].beads); ids.slice(20000).forEach(i => delete P[i]); }
        localStorage.setItem(PKEY, JSON.stringify(P));
      } catch (e) {}
    }, 2000);
  }
  const vnDate = (t = new Date()) => new Date(t.getTime() + (t.getTimezoneOffset() + 420) * 60000);
  const dayKey = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  function weekKey(d = vnDate()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const wd = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - wd);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return t.getUTCFullYear() + '-W' + Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }
  function prof(u) {
    let p = P[u.id];
    if (!p) p = P[u.id] = { name: u.name, beads: 0, merit: 0, streak: 0, best: 0, lastDay: '', days: 0, wk: '', wMerit: 0, wBeads: 0 };
    p.name = u.name;
    const wk = weekKey(); if (p.wk !== wk) { p.wk = wk; p.wMerit = 0; p.wBeads = 0; }
    return p;
  }
  const levelOf = (beads) => { let i = 0; C.levels.forEach((l, k) => { if (beads >= l.at) i = k; }); return i; };

  function checkIn(u) {
    const p = prof(u), today = dayKey(vnDate());
    if (p.lastDay === today) return;
    const yesterday = dayKey(vnDate(new Date(Date.now() - 86400000)));
    p.streak = p.lastDay === yesterday ? p.streak + 1 : 1;
    p.best = Math.max(p.best, p.streak); p.days++; p.lastDay = today; saveP();
    if (p.days > 1) setTimeout(() => greetReturn(u, p), 2600);   // đợi nhân vật đi vào chỗ
  }
  function greetReturn(u, p) {
    const pp = present.get(u.id);
    if (p.streak >= 2) {
      const bonus = Math.min(C.streak.maxBonus, p.streak * C.streak.bonusPerDay);
      addBeads(u, bonus, false, true);
      toast('🔥', [{ b: u.name }, ` lên chùa ngày thứ ${p.streak} liên tiếp · +${bonus} hạt`], true, u.avatar);
      say(pp, `🔥 ${p.streak} ngày liên tiếp`);
    } else toast('🙏', [{ b: u.name }, ` đã trở lại chùa · lần thứ ${p.days}`], true, u.avatar);
    if (C.streak.specialDays.includes(p.streak)) {
      card({ kicker: 'Tinh tấn bền bỉ', title: u.name, text: `Tròn ${p.streak} ngày liên tiếp lên chùa. Cả chùa tùy hỷ với sự bền bỉ của bạn!`, ms: 6000, big: true });
      A.khanh(); FX.petals(40, false);
    }
  }
  function levelUp(u, lv) {
    const L = C.levels[lv];
    dirtySeats = true;
    if (lv < 3) { toast('🪷', [{ b: u.name }, ` lên cấp ${lv + 1} · ${L.name}`], true, u.avatar); return; }
    card({ kicker: 'Thăng cấp tu tập', title: u.name, text: `Đạt cấp ${lv + 1}: ${L.name}`, sub: pickOne(CBA.wisdom), ms: 5000 });
    A.smallBell(); const pp = present.get(u.id); bow(pp);
    const pos = figPos(pp); FX.sparkle(30, pos.x, pos.y);
  }

  /* ===================== HỆ SỐ NHÂN: NGÀY LỄ · ĐỒNG TÂM · HƯƠNG TRẦM ===================== */
  let lunar = CBA.Lunar.today();
  setInterval(() => { lunar = CBA.Lunar.today(); }, 10 * 60000);
  const mantraAt = new Map();
  let roomBuffUntil = 0, dongTamAnnounced = 0;
  function dongTamCount() {
    const t = now() - C.dongTam.windowSec * 1000; let n = 0;
    for (const [id, ts] of mantraAt) { if (ts < t) mantraAt.delete(id); else n++; }
    return n;
  }
  const dongTamMult = () => { const n = dongTamCount(); return n >= C.dongTam.minPeople ? Math.min(C.dongTam.max, 1 + C.dongTam.perPerson * n) : 1; };
  const buffMult = (u) => (now() < roomBuffUntil || (u && now() < (u._buff || 0))) ? C.incenseBuff.mult : 1;
  const lunarMult = () => (C.lunarBonus ? lunar.mult : 1);
  const mult = (u) => lunarMult() * dongTamMult() * buffMult(u);

  /* ============================ GIAO DIỆN TĨNH ============================ */
  function applyConfig() {
    $('templeName').textContent = C.templeName;
    $('templeSub').textContent = C.subtitle;
    document.title = C.templeName + ' · Màn hình phát 9:16';
    const set = C.buddhaSets[C.buddhaSet] || C.buddhaSets.hoanh;
    const texts = document.querySelectorAll('#buddhaNames text');
    set.forEach((b, i) => { texts[i * 2].textContent = b.name; texts[i * 2 + 1].textContent = b.sub; });
    const halos = document.querySelectorAll('#halos .halo');
    set.forEach((b, i) => halos[i] && halos[i].style.setProperty('filter', `drop-shadow(0 0 30px ${b.aura})`));
    const bg = $('bg');
    const img = params.get('bg') || C.background;
    if (img) { bg.classList.add('has-img'); bg.querySelector('.bg-img').style.backgroundImage = `url("${img}")`; }
    else bg.classList.remove('has-img');
    $('altar').classList.toggle('no-buddha', !!img && !C.showDrawnBuddhas);
    const gl = $('guideList'); gl.innerHTML = '';
    C.guide.forEach(g => { const li = el('li'); li.append(el('span', 'gi', g.icon), el('span', 'gt', g.title), el('span', 'gd', g.desc)); gl.append(li); });
    setSegment(S.segment, false);
  }

  /* ============================ TRÀNG HẠT ============================ */
  const beads = [];
  (function buildMala() {
    const svg = $('malaSvg'); const R = 135;
    svg.append(svgEl('circle', { cx: 0, cy: 0, r: R, fill: 'none', stroke: '#6b3f0b', 'stroke-width': 1.5, opacity: .7 }));
    for (let i = 0; i < 108; i++) {
      const a = Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / 108);
      const b = svgEl('circle', { cx: (Math.cos(a) * R).toFixed(1), cy: (Math.sin(a) * R).toFixed(1), r: 5, fill: '#4a2412', stroke: '#2a0a04', 'stroke-width': 1, class: 'bead' });
      svg.append(b); beads.push(b);
    }
    svg.append(svgEl('path', { d: `M0 ${R + 14} q-6 18 -3 34 M0 ${R + 14} q0 20 0 36 M0 ${R + 14} q6 18 3 34`, stroke: '#d9472f', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }));
    svg.append(svgEl('circle', { cx: 0, cy: R + 8, r: 10, fill: 'url(#gGold)', stroke: '#6b3f0b', 'stroke-width': 1.5 }));
  })();
  let shownBeads = S.beads, lastLit = -1;
  function renderMala() {
    const lit = S.beads % 108;
    if (lit !== lastLit) {
      for (let i = 0; i < 108; i++) {
        beads[i].classList.toggle('on', i < lit);
        beads[i].classList.remove('cur');
      }
      if (lit > 0) { const b = beads[lit - 1]; void b.getBBox(); b.classList.add('cur'); }
      lastLit = lit;
    }
  }
  function tickCounter() {
    if (shownBeads !== S.beads) {
      const d = S.beads - shownBeads;
      shownBeads += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * 0.12));
      if ((d > 0 && shownBeads > S.beads) || (d < 0 && shownBeads < S.beads)) shownBeads = S.beads;
      $('beadNum').textContent = fmt(shownBeads);
      $('beadSub').textContent = `hạt · vòng ${fmt(Math.floor(shownBeads / 108))}`;
    }
    requestAnimationFrame(tickCounter);
  }

  let lastMo = 0;
  function addBeads(u, n, withSound = true, raw = false) {
    if (n <= 0) return;
    if (!raw) n = Math.round(n * mult(u));
    if (u) {
      const pr = prof(u), lv0 = levelOf(pr.beads);
      pr.beads += n; pr.wBeads += n;
      const lv = levelOf(pr.beads); if (lv > lv0) levelUp(u, lv);
      saveP();
    }
    const before = S.beads;
    S.beads += n; if (u) u.beads += n;
    renderMala();
    const b = $('beadNum'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    if (withSound && now() - lastMo > 320) { lastMo = now(); A.mo(0.55); }
    checkMilestones(before, S.beads);
    dirtyBoard = true; save();
  }

  /* ============================ CỘT MỐC ============================ */
  function checkMilestones(a, b) {
    let hit = null;
    for (const m of C.milestones) if (Math.floor(a / m.every) < Math.floor(b / m.every)) hit = m;   // lấy mốc lớn nhất vượt qua
    if (hit) runMilestone(hit);
  }
  function runMilestone(m) {
    const box = $('milestone');
    $('msTitle').textContent = m.title; $('msText').textContent = m.text;
    box.classList.remove('hidden');
    clearTimeout(runMilestone._t);
    runMilestone._t = setTimeout(() => box.classList.add('hidden'), m.kind === 'vong' ? 4000 : 8000);
    bowAll();
    if (m.kind === 'vong') { A.smallBell(); FX.ring(); FX.petals(30, false); }
    if (m.kind === 'cauan') { A.bigBell(); A.bigBell(2.5); radiant(8); FX.petals(80, false); A.speak('Cả chùa đã niệm đủ một ngàn không trăm tám mươi hạt. Nguyện cho tất cả mọi người bình an.'); }
    if (m.kind === 'rong') { A.bigBell(); A.bigBell(2.2); A.bigBell(4.4); radiant(12); FX.dragon(12); FX.lanterns(50); }
  }
  function radiant(sec) {
    const a = $('altar'); a.classList.add('radiant'); FX.halo(sec);
    clearTimeout(radiant._t); radiant._t = setTimeout(() => a.classList.remove('radiant'), sec * 1000);
  }

  /* ============================ SÂN CHÙA ============================ */
  const slots = [];
  (function buildSlots() {
    const rows = C.seats.rows, per = C.seats.perSide;
    for (let r = 0; r < rows; r++) {
      const y = 1062 + r * 115, sc = 0.84 + r * 0.07;
      for (let k = 0; k < per; k++) {
        const dx = 175 + k * 92;
        slots.push({ x: 540 - dx, y, sc }); slots.push({ x: 540 + dx, y, sc });
      }
    }
  })();

  const ROBE = ['#8597b8', '#a0714a', '#e9e9ef', '#f0b93a'];
  function tierOfUser(u, rank) {
    if (u.merit > 0 && rank < 3) return 3;
    if (u.merit >= 1000) return 2;
    if (u.merit >= 10) return 1;
    return 0;
  }

  function makeFigure(u) {
    const f = el('div', 'pt walking');
    const tag = el('div', 'tag');
    if (u.avatar) {
      const im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = u.avatar; im.onerror = () => im.replaceWith(el('span', 'av'));
      tag.append(im);
    } else tag.append(el('span', 'av'));
    tag.append(el('b', 'lv', '1'), document.createTextNode(u.name));
    const hasBun = (u.id.charCodeAt(0) + u.id.length) % 2 === 0;
    f.innerHTML = `<svg viewBox="0 0 74 104"><ellipse cx="37" cy="100" rx="31" ry="5" fill="rgba(0,0,0,.35)"/>
      <g class="body"><g class="torso" style="transform-box:fill-box;transform-origin:50% 100%">
        <path class="robe" d="M7 100 C5 78 13 58 37 51 C61 58 69 78 67 100 Z" fill="${ROBE[0]}" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>
        <path d="M37 56 V100" stroke="rgba(0,0,0,.22)" stroke-width="2"/>
        <path d="M12 86 Q20 70 26 64 M62 86 Q54 70 48 64" stroke="rgba(0,0,0,.18)" stroke-width="2" fill="none"/>
        <path d="M27 53 Q37 59 47 53" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/></g>
      <g class="head" style="transform-box:fill-box;transform-origin:50% 100%">
        <rect x="32" y="44" width="10" height="9" rx="3" fill="#e8b88a"/>
        <ellipse cx="22.5" cy="38" rx="3" ry="5" fill="#e8b88a"/><ellipse cx="51.5" cy="38" rx="3" ry="5" fill="#e8b88a"/>
        <circle cx="37" cy="35" r="15" fill="#1d120c"/>
        ${hasBun ? '<circle cx="37" cy="22" r="6.5" fill="#1d120c"/>' : '<path d="M24 30 Q37 18 50 30" stroke="#3a261a" stroke-width="2" fill="none"/>'}
      </g></g></svg><div class="incense"></div>`;
    f.prepend(tag);
    f.style.left = '540px'; f.style.top = '1960px';
    $('yard').append(f);
    return f;
  }

  function join(u) {
    if (present.has(u.id)) { present.get(u.id).u = u; return present.get(u.id); }
    const p = { u, fig: null, seat: -1, since: now() };
    present.set(u.id, p);
    if (present.size > 250) {   // giới hạn danh sách trong chùa
      const oldest = [...present.values()].filter(x => x.u.merit === 0).sort((a, b) => a.u.last - b.u.last)[0];
      if (oldest) leave(oldest.u.id);
    }
    dirtySeats = true;
    layoutSeats();
    return p;
  }

  function leave(id) {
    const p = present.get(id); if (!p) return;
    present.delete(id);
    if (p.fig) walkOut(p.fig);
    dirtySeats = true;
  }
  function walkOut(fig) {
    fig.classList.add('walking');
    fig.style.left = '540px'; fig.style.top = '1980px'; fig.style.opacity = '0';
    setTimeout(() => fig.remove(), 2300);
  }

  function ranked() {
    return [...present.values()].sort((a, b) => (b.u.merit - a.u.merit) || (a.since - b.since));
  }

  function layoutSeats() {
    if (!dirtySeats) return; dirtySeats = false;
    const list = ranked();
    const meritRank = Object.values(S.users).filter(u => u.merit > 0).sort((a, b) => b.merit - a.merit).slice(0, 3).map(u => u.id);
    list.forEach((p, i) => {
      if (i < slots.length) {
        const fresh = !p.fig;
        if (fresh) p.fig = makeFigure(p.u);
        const s = slots[i];
        const t = tierOfUser(p.u, meritRank.indexOf(p.u.id) === -1 ? 99 : meritRank.indexOf(p.u.id));
        p.fig.className = p.fig.className.replace(/\bt\d\b/g, '').trim() + ' t' + t;
        p.fig.querySelector('.robe').setAttribute('fill', ROBE[t]);
        p.fig.querySelector('.lv').textContent = String(levelOf(prof(p.u).beads) + 1);
        p.fig.style.zIndex = String(10 + Math.round(s.y / 10));
        p.fig.style.transform = `scale(${s.sc})`;
        renderRose(p);
        if (p.seat !== i) {
          p.seat = i;
          p.fig.classList.add('walking');
          const go = () => { p.fig.style.left = s.x + 'px'; p.fig.style.top = s.y + 'px'; };
          fresh ? requestAnimationFrame(() => requestAnimationFrame(go)) : go();
          clearTimeout(p.walkT);
          p.walkT = setTimeout(() => { if (p.fig) { p.fig.classList.remove('walking'); bow(p); } }, 2300);
        }
      } else if (p.fig) {   // hết chỗ: ra hàng chờ
        walkOut(p.fig); p.fig = null; p.seat = -1;
      }
    });
    updateHud();
  }

  function renderRose(p) {
    if (!p || !p.fig) return;
    let r = p.fig.querySelector('.rose');
    if (!p.u.rose) { if (r) r.remove(); return; }
    if (!r) { r = el('span', 'rose', '🌹'); p.fig.append(r); }
    r.style.filter = p.u.rose === 'white' ? 'grayscale(1) brightness(2.2)' : '';
  }

  function bow(p) {
    if (!p || !p.fig) return;
    p.fig.classList.remove('bow'); void p.fig.offsetWidth; p.fig.classList.add('bow');
    setTimeout(() => p.fig && p.fig.classList.remove('bow'), 1900);
  }
  function bowAll() {
    let d = 0;
    for (const p of present.values()) if (p.fig) { setTimeout(() => bow(p), d); d += 25; }
  }
  function holdIncense(p, sec = 25) {
    if (!p || !p.fig) return;
    p.fig.classList.add('holding');
    clearTimeout(p.incT); p.incT = setTimeout(() => p.fig && p.fig.classList.remove('holding'), sec * 1000);
  }
  function say(p, text, wish = false) {
    if (!p || !p.fig || !text) return;
    const old = p.fig.querySelector('.bubble'); if (old) old.remove();
    const b = el('div', 'bubble' + (wish ? ' wish' : ''), text);
    p.fig.append(b); setTimeout(() => b.remove(), 5000);
  }
  function figPos(p) {
    if (p && p.seat >= 0) { const s = slots[p.seat]; return { x: s.x, y: s.y - 70 }; }
    return { x: 540, y: 1500 };
  }

  // rời chùa khi lâu không tương tác
  setInterval(() => {
    const t = now();
    for (const [id, p] of present) {
      const lim = C.idleMinutes * 60000 * (p.u.merit > 0 ? 3 : 1);
      if (t - p.u.last > lim) leave(id);
    }
    layoutSeats();
  }, 15000);

  /* ============================ LƯ HƯƠNG & BÀN THỜ ============================ */
  let sticks = [];
  function addSticks(n) {
    for (let i = 0; i < n; i++) sticks.push(now());
    renderSticks();
  }
  function renderSticks() {
    const t = now();
    sticks = sticks.filter(s => t - s < 4 * 60000).slice(-15);
    const box = $('sticks'); box.innerHTML = '';
    const n = Math.max(3, sticks.length);
    for (let i = 0; i < n; i++) {
      const s = el('i'); const x = (i + 0.5) / n * 100;
      s.style.left = x + '%'; s.style.transform = `rotate(${(x - 50) * 0.25}deg)`; s.style.height = (52 + (i % 3) * 6) + 'px';
      box.append(s);
    }
  }
  setInterval(renderSticks, 30000);

  const CANDLE_X = [222, 268, 314, 766, 812, 858];
  function renderCandles() {
    const g = $('candles'); g.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const x = CANDLE_X[i], lit = i < S.candles;
      g.append(svgEl('rect', { x: x - 7, y: 728, width: 14, height: 42, rx: 3, fill: '#c0392b', stroke: '#7a1410' }));
      g.append(svgEl('rect', { x: x - 11, y: 766, width: 22, height: 6, rx: 2, fill: '#c98a1c' }));
      if (lit) {
        g.append(svgEl('ellipse', { cx: x, cy: 718, rx: 18, ry: 22, fill: 'rgba(255,200,80,.35)' }));
        g.append(svgEl('path', { d: `M${x} 702 Q${x + 7} 716 ${x} 727 Q${x - 7} 716 ${x} 702Z`, fill: '#ffe08a', class: 'flame' }));
      }
    }
  }
  const OFFER_X = [455, 625, 400, 680, 510, 570];
  function renderOfferings(popLast) {
    const g = $('offerings'); g.innerHTML = '';
    S.offerings.forEach((kind, i) => {
      const x = OFFER_X[i % OFFER_X.length];
      const grp = svgEl('g', {}); if (popLast && i === S.offerings.length - 1) grp.setAttribute('class', 'pop');
      if (kind === 'fruit') {
        grp.append(svgEl('ellipse', { cx: x, cy: 768, rx: 38, ry: 9, fill: 'url(#gGold)', stroke: '#6b3f0b' }));
        [[-20, 754, '#ff8c1a'], [0, 750, '#e63b2e'], [20, 754, '#ffd23f'], [-10, 738, '#8bc34a'], [10, 738, '#ff6f61'], [0, 724, '#ffb347']]
          .forEach(([dx, y, c]) => grp.append(svgEl('circle', { cx: x + dx, cy: y, r: 12, fill: c, stroke: 'rgba(0,0,0,.25)' })));
      } else {
        grp.append(svgEl('path', { d: `M${x - 16} 770 L${x - 10} 740 H${x + 10} L${x + 16} 770Z`, fill: 'url(#gGold)', stroke: '#6b3f0b' }));
        grp.append(svgEl('use', { href: '#lotusIcon', x: x - 34, y: 690, width: 68, height: 50 }));
      }
      g.append(grp);
    });
  }
  function addOffering(kind) {
    S.offerings.push(kind); if (S.offerings.length > 6) S.offerings.shift();
    renderOfferings(true); save();
  }

  /* ============================ THẺ LỜI CHÚC & THÔNG BÁO ============================ */
  const cardQ = []; let cardBusy = false;
  function card(c) {
    if (cardQ.length >= 6) cardQ.splice(cardQ.findIndex(x => !x.big), 1);
    cardQ.push(c); if (!cardBusy) nextCard();
  }
  function nextCard() {
    const box = $('blessing');
    const c = cardQ.shift();
    if (!c) { cardBusy = false; box.classList.add('hidden'); return; }
    cardBusy = true;
    box.className = 'tier-' + (c.tier || '');
    $('blKicker').textContent = c.kicker || 'Lời chúc dành cho';
    $('blTitle').textContent = c.title || '';
    $('blText').textContent = c.text || '';
    $('blSub').textContent = c.sub || '';
    setTimeout(() => { box.classList.add('hidden'); setTimeout(nextCard, 550); }, c.ms || 5200);
  }

  function toast(icon, html, soft = false, avatar = '') {
    const box = $('toasts');
    while (box.children.length >= 3) box.firstChild.remove();
    const t = el('div', 'toast' + (soft ? ' soft' : ''));
    const ic = el('span', 'ic');
    if (avatar) { const im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = avatar; im.onerror = () => { ic.textContent = icon; im.remove(); }; ic.append(im); }
    else ic.textContent = icon;
    const tx = el('span'); html.forEach(part => tx.append(typeof part === 'string' ? document.createTextNode(part) : el('b', '', part.b)));
    t.append(ic, tx); box.append(t);
    setTimeout(() => t.remove(), 5000);
  }

  /* ============================ QUÀ TẶNG ============================ */
  const TIERS = C.giftTiers;
  const tierIdx = (id) => TIERS.findIndex(t => t.id === id);
  function tierFor(coins, giftName) {
    let i = 0;
    TIERS.forEach((t, k) => { if (coins >= t.min) i = k; });
    const byName = C.giftNameToTier[giftName];
    if (byName && tierIdx(byName) > i) i = tierIdx(byName);
    return TIERS[i];
  }

  const bigQ = []; let bigBusy = false;
  function queueBig(fn, sec) { bigQ.push({ fn, sec }); if (!bigBusy) runBig(); }
  function runBig() {
    const j = bigQ.shift(); if (!j) { bigBusy = false; return; }
    bigBusy = true; j.fn(); setTimeout(runBig, j.sec * 1000);
  }

  function giftEffect(tier, u, giftName, count, coins) {
    const p = present.get(u.id);
    const name = u.name;
    const bless = fill(pickOne(CBA.blessings[tier.id] || CBA.blessings.huong), name);
    const qty = count > 1 ? ` ×${count}` : '';
    toast(tier.icon, [{ b: name }, ` ${tier.label.toLowerCase()} · ${giftName}${qty}`], false, u.avatar);
    bow(p); holdIncense(p);
    const pos = figPos(p);
    switch (tier.id) {
      case 'huong':
        u._buff = now() + C.incenseBuff.personalMin * 60000;
        addSticks(Math.min(count, 5)); FX.boostSmoke(6 + count * 2); A.mo(1);
        FX.sparkle(10, FX.BURNER.x, FX.BURNER.y);
        if (count >= 5) card({ title: name, text: bless, tier: tier.id, ms: 4200 });
        break;
      case 'chuong':
        S.candles = Math.min(6, S.candles + 1); renderCandles();
        A.smallBell(); FX.ring(540, 720); addSticks(1); FX.boostSmoke(6);
        card({ title: name, text: bless, tier: tier.id, ms: 4500 });
        break;
      case 'nguqua':
        addOffering('fruit'); A.mo(1); A.mo(1, .35); A.khanh(.8); FX.sparkle(30, 540, 760);
        card({ title: name, text: bless, sub: pickOne(CBA.wisdom), tier: tier.id });
        break;
      case 'hoasen':
        FX.goldenLotus(pos.x, pos.y); setTimeout(() => addOffering('lotus'), 2600);
        A.khanh(); A.bigBell(1.5); FX.petals(60, false);
        card({ title: name, text: bless, sub: pickOne(CBA.wisdom), tier: tier.id, ms: 6500, big: true });
        break;
      case 'hoadang':
        roomIncense(name);
        queueBig(() => {
          FX.lanterns(40); A.bigBell(); A.smallBell(1.2); A.bigBell(3);
          radiant(5);
          card({ kicker: 'Hoa đăng nguyện cầu', title: name, text: bless, sub: centerMantra(), tier: tier.id, ms: 8000, big: true });
        }, 7);
        break;
      case 'rong':
        roomIncense(name);
        queueBig(() => {
          FX.dragon(11); FX.lanterns(30); radiant(11); bowAll();
          A.bigBell(); A.bigBell(2.4); A.bigBell(4.8);
          card({ kicker: 'Rồng vàng hộ pháp', title: name, text: bless, sub: 'Toàn thể Phật tử cùng đảnh lễ cầu an', tier: tier.id, ms: 10000, big: true });
        }, 11);
        break;
    }
    if (coins >= C.ttsMinCoins) A.speak(`Cảm ơn ${name} đã ${tier.label.toLowerCase()}. Chúc bạn và gia đình luôn bình an.`);
  }
  function roomIncense(name) {
    const fresh = now() > roomBuffUntil;
    roomBuffUntil = now() + C.incenseBuff.roomMin * 60000;
    if (fresh) toast('🪔', ['Hương trầm của ', { b: name }, ` tỏa khắp chùa · cả phòng ×${C.incenseBuff.mult} hạt trong ${C.incenseBuff.roomMin} phút`], true);
  }
  function centerMantra() { const set = C.buddhaSets[C.buddhaSet] || C.buddhaSets.hoanh; return set[1].mantra; }

  /* ============================ XỬ LÝ SỰ KIỆN ============================ */
  const kwRe = {};
  const has = (n, list) => list.some(k => (kwRe[k] = kwRe[k] || new RegExp('(^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)')).test(n));
  function isBad(n) {
    const words = n.split(/[^a-z0-9.]+/);
    return C.bannedWords.some(w => (/[ .]/.test(w) ? n.includes(w) : words.includes(w)));
  }
  let lastJoinToast = 0;
  const lastCauSieu = {};

  function handle(ev) {
    if (!ev) return;
    lastEventAt = now();
    if (ev.sim) simActiveUntil = now() + 30000;
    switch (ev.type) {
      case 'chat': onChat(ev); break;
      case 'like': onLike(ev); break;
      case 'gift': onGift(ev); break;
      case 'follow': case 'share': onSocial(ev); break;
      case 'join': onJoin(ev); break;
      case 'viewers': viewers = ev.viewers; updateHud(); break;
    }
  }

  function onChat(ev) {
    const text = (ev.text || '').trim().slice(0, 200); if (!text) return;
    const n = norm(text);
    const u = user(ev); S.comments++;
    const K = C.keywords;
    const mantra = has(n, K.mantra);
    const bad = isBad(n);
    let p = present.get(u.id);
    if (!p && (C.joinOnAnyComment || mantra)) p = join(u);
    if (now() - (u._cd || 0) > C.scoring.commentCooldownMs) {
      u._cd = now();
      addBeads(u, mantra ? C.scoring.beadsPerMantraComment : C.scoring.beadsPerComment);
    }
    if (has(n, K.checkHat)) {
      const pr = prof(u), lv = levelOf(pr.beads);
      say(p, `Cấp ${lv + 1} ${C.levels[lv].name} · ${fmt(pr.beads)} hạt · 🔥${pr.streak} ngày`);
      return;
    }
    if (has(n, K.matMe)) { u.rose = 'white'; renderRose(p); say(p, '🤍 Cài bông hồng trắng'); toast('🤍', [{ b: u.name }, ' cài bông hồng trắng nhớ mẹ'], true); return save(); }
    if (has(n, K.conMe)) { u.rose = 'red'; renderRose(p); say(p, '🌹 Cài bông hồng đỏ'); toast('🌹', [{ b: u.name }, ' cài bông hồng đỏ — mẹ hiền còn đó'], true); return save(); }
    if (has(n, K.cauSieu)) {
      say(p, bad ? '🙏 Cầu siêu' : text.slice(0, C.maxWishLength), true); bow(p);
      if (now() - (lastCauSieu[u.id] || 0) > 120000) {
        lastCauSieu[u.id] = now();
        const pos = figPos(p); FX.sparkle(16, pos.x, pos.y); A.khanh();
        card({ kicker: 'Đèn cầu siêu', title: u.name, text: fill(pickOne(CBA.blessings.cauSieu), u.name), ms: 4500 });
      }
      return;
    }
    if (has(n, K.tuyHy)) { tuyHy(u, p); return; }
    if (has(n, K.cauAn) || has(n, K.nguyen) || text.toLowerCase().startsWith('nguyện')) {
      say(p, bad ? '🙏 Cầu an' : '🏮 ' + text.slice(0, C.maxWishLength), true); bow(p);
      if (!bad) addWish(u, p, text.slice(0, C.maxWishLength));
      return;
    }
    if (mantra) {
      mantraAt.set(u.id, now());
      const dn = dongTamCount();
      if (dn < C.dongTam.minPeople) dongTamAnnounced = 0;
      else if ([3, 5, 10, 20, 50].some(t => dn >= t && dongTamAnnounced < t)) {
        dongTamAnnounced = dn;
        toast('🤝', ['Đồng tâm: ', { b: dn + ' người' }, ` cùng niệm · hạt ×${dongTamMult().toFixed(2)}`], true);
        bowAll();
      } bow(p); say(p, '📿 ' + text.slice(0, 40)); const pos = figPos(p); FX.lotusUp(pos.x, pos.y); return; }
    if (!bad && !text.startsWith('!')) say(p, text.slice(0, 60));
  }

  function onLike(ev) {
    const u = user(ev); const n = Math.max(1, Math.min(ev.likes || 1, 500));
    S.likes += n;
    let p = present.get(u.id); if (!p) p = join(u);
    addBeads(u, n * C.scoring.beadsPerLike);
    const pos = figPos(p);
    for (let i = 0; i < Math.min(n, 4); i++) setTimeout(() => FX.lotusUp(pos.x + (Math.random() - .5) * 40, pos.y), i * 120);
  }

  function onGift(ev) {
    if (ev.streaking) return;                // đợi combo kết thúc mới tính
    const u = user(ev);
    const count = Math.max(1, ev.count || 1);
    const coins = (ev.coins || 0) * count;
    S.gifts++; S.coins += coins; u.coins += coins;
    const merit = Math.round(coins * C.scoring.congDucPerCoin * lunarMult());
    u.merit += merit; S.merit += merit;
    const pr = prof(u); pr.merit += merit; pr.wMerit += merit; saveP();
    if (!present.has(u.id)) join(u);
    dirtySeats = true; dirtyBoard = true; flashUser = u.id;
    if (ev.subscribe) {
      toast('⭐', [{ b: u.name }, ' đã đăng ký hội viên của chùa'], false, u.avatar); A.khanh();
      card({ kicker: 'Hội viên', title: u.name, text: 'Cảm ơn bạn đã đồng hành cùng chùa. Nguyện bạn luôn an lạc.', ms: 5000 });
    } else giftEffect(tierFor(coins, ev.giftName), u, ev.giftName || 'Quà', count, coins);
    addBeads(u, coins * C.scoring.beadsPerCoin, false);
    layoutSeats(); updateHud(); save();
  }

  function onSocial(ev) {
    const u = user(ev); const p = present.get(u.id) || join(u);
    const fl = ev.type === 'follow';
    if (fl) S.follows++; else S.shares++;
    addBeads(u, fl ? C.scoring.beadsPerFollow : C.scoring.beadsPerShare);
    toast(fl ? '➕' : '📤', [{ b: u.name }, fl ? ' đã theo dõi chùa' : ' đã chia sẻ phiên live'], true, u.avatar);
    say(p, fl ? '🙏 Xin theo dõi chùa' : '📤 Đã chia sẻ'); bow(p);
    A.smallBell();
  }

  function onJoin(ev) {
    if (now() - lastJoinToast < 4000) return;
    lastJoinToast = now();
    toast('🚪', [{ b: ev.name }, ' vừa bước vào cổng chùa'], true);
  }

  /* ============================ ĐÈN NGUYỆN & TÙY HỶ ============================ */
  let wishes = [], wishIdx = 0, wishShown = null;
  function addWish(u, p, text) {
    const w = { uid: u.id, name: u.name, text, tuy: 0, by: [], t: now() };
    wishes.unshift(w); wishes = wishes.slice(0, 30);
    const pos = figPos(p); FX.lanternAt(pos.x, pos.y);
    toast('🏮', [{ b: u.name }, ' thả đèn nguyện · comment "Tùy hỷ" để chung vui'], true);
    showWish(w);
  }
  function tuyHy(u, p) {
    bow(p);
    const w = wishes.find(x => x.uid !== u.id && now() - x.t < 15 * 60000 && !x.by.includes(u.id));
    if (!w) { say(p, '🤲 Tùy hỷ công đức'); return; }
    w.by.push(u.id); w.tuy++;
    const owner = S.users[w.uid]; if (owner) addBeads(owner, 2, false, true);
    say(p, `🤲 Tùy hỷ cùng ${w.name}`);
    bow(present.get(w.uid));
    showWish(w);
  }
  function showWish(w) {
    wishShown = w;
    $('wishBox').classList.remove('hidden');
    $('wishName').textContent = w.name;
    $('wishText').textContent = '“' + w.text + '”';
    $('wishTuy').textContent = w.tuy ? `🤲 ${w.tuy} người tùy hỷ` : 'Comment "Tùy hỷ" để chung vui';
    const b = $('wishBox'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
  }
  setInterval(() => {   // luân phiên 5 lời nguyện gần nhất
    const recent = wishes.filter(w => now() - w.t < 30 * 60000).slice(0, 5);
    if (!recent.length) { $('wishBox').classList.add('hidden'); return; }
    wishIdx = (wishIdx + 1) % recent.length; showWish(recent[wishIdx]);
  }, 7000);

  /* ============================ TỤNG TRỌN BÀI KINH ============================ */
  A.onComplete((tr) => {
    const n = present.size; if (!n || !C.chantCompleteBonus) return;
    for (const pp of present.values()) addBeads(pp.u, C.chantCompleteBonus, false);
    A.khanh(); bowAll(); FX.petals(50, false);
    card({ kicker: 'Viên mãn thời kinh', title: tr.title.replace(/\s*\(.*\)$/, ''), text: `${n} Phật tử cùng tụng trọn bài kinh · mỗi người +${C.chantCompleteBonus} hạt`, ms: 6000, big: true });
  });

  /* ============================ BẢNG XẾP HẠNG & HUD ============================ */
  let flashUser = null;
  let boardWeek = false;
  setInterval(() => {   // luân phiên: Công Đức phiên này ↔ Bảng Vàng tuần
    const hasWeek = Object.values(P).some(p => p.wk === weekKey() && p.wMerit > 0);
    boardWeek = hasWeek ? !boardWeek : false; dirtyBoard = true;
  }, 10000);
  function renderBoard() {
    if (!dirtyBoard) return; dirtyBoard = false;
    const wk = weekKey();
    const users = boardWeek
      ? Object.entries(P).filter(([, p]) => p.wk === wk).map(([id, p]) => ({ id, name: p.name, merit: p.wMerit, beads: p.wBeads }))
      : Object.values(S.users);
    $('boardTitle').textContent = boardWeek ? 'Bảng Vàng Tuần' : 'Bảng Công Đức';
    $('boardSub').textContent = boardWeek ? 'cộng dồn mọi buổi live trong tuần' : 'buổi live hôm nay';
    const top = users.filter(u => u.merit > 0).sort((a, b) => b.merit - a.merit).slice(0, 5);
    const ol = $('topMerit'); ol.innerHTML = '';
    if (!top.length) ol.append(el('li', 'empty', 'Hãy là người đầu tiên'));
    top.forEach((u, i) => {
      const li = el('li', u.id === flashUser ? 'flash' : ''); li.append(el('span', 'rk', String(i + 1)), el('span', 'nm', u.name), el('span', 'sc', fmt(u.merit))); ol.append(li);
    });
    const tb = users.filter(u => u.beads > 0).sort((a, b) => b.beads - a.beads).slice(0, 3);
    const ob = $('topBeads'); ob.innerHTML = '';
    if (!tb.length) ob.append(el('li', 'empty', '—'));
    tb.forEach((u, i) => { const li = el('li'); li.append(el('span', 'rk', String(i + 1)), el('span', 'nm', u.name), el('span', 'sc', fmt(u.beads))); ob.append(li); });
    flashUser = null;
  }
  function updateHud() {
    const seated = Math.min(present.size, slots.length), waiting = Math.max(0, present.size - slots.length);
    $('cPeople').textContent = fmt(present.size) + (waiting ? ` (${waiting} chờ)` : '');
    $('cViewers').textContent = fmt(viewers);
    $('cMerit').textContent = fmt(S.merit);
    $('simBadge').classList.toggle('hidden', !(bot || now() < simActiveUntil));
    const chips = [];
    chips.push(lunar.feast && C.lunarBonus ? `🌕 ${lunar.feast.name} · ×${lunar.mult}` : `🌙 ${lunar.text}`);
    const dn = dongTamCount(); if (dn >= C.dongTam.minPeople) chips.push(`🤝 Đồng tâm ${dn} người · ×${dongTamMult().toFixed(2)}`);
    const left = roomBuffUntil - now();
    if (left > 0) chips.push(`🪔 Hương trầm ×${C.incenseBuff.mult} · ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`);
    const html = chips.join('|');
    if (html !== updateHud._last) {
      updateHud._last = html;
      const box = $('bonus'); box.innerHTML = '';
      chips.forEach((c, i) => box.append(el('span', 'chip' + (i === 0 && lunar.feast ? ' feast' : ''), c)));
    }
    return seated;
  }
  setInterval(() => { layoutSeats(); renderBoard(); updateHud(); }, 600);

  /* ============================ CHƯƠNG TRÌNH & KINH ============================ */
  let teaching = null, teachIdx = 0, teachT = null, wisdomIdx = 0, wisdomT = 0;
  function setSegment(id, autoMusic = true) {
    const seg = C.segments.find(s => s.id === id) || C.segments[0];
    S.segment = seg.id;
    $('segTitle').textContent = seg.title; $('segNote').textContent = seg.note || '';
    if (autoMusic && seg.category) {
      if (seg.category === 'giang') startTeaching(CBA.teachings[0].id);
      else { stopTeaching(); A.playCategory(seg.category); }
    }
    save(); broadcast();
  }
  function startTeaching(id) {
    teaching = CBA.teachings.find(t => t.id === id) || null; teachIdx = 0;
    clearInterval(teachT);
    if (teaching) teachT = setInterval(() => { teachIdx = (teachIdx + 1) % teaching.lines.length; renderScripture(true); }, 8000);
    renderScripture(true);
  }
  function stopTeaching() { teaching = null; clearInterval(teachT); renderScripture(true); }

  let lastLine = '';
  function renderScripture(force) {
    const box = $('scripture');
    let title, line, next, playing = true;
    if (teaching) {
      title = '☸ Giảng pháp · ' + teaching.title;
      line = teaching.lines[teachIdx]; next = teaching.lines[teachIdx + 1] || '';
    } else {
      const s = A.state();
      if (!s.title) { box.classList.add('hidden'); return; }
      playing = s.playing && s.musicOn;
      title = (s.playing ? (s.musicOn ? '♪ Đang phát: ' : '🔇 Tắt tiếng: ') : '⏸ ') + s.title;
      if (s.line) { line = s.line; next = s.nextLine; }
      else {   // nhạc không lời: chạy câu đạo lý
        if (now() - wisdomT > 12000) { wisdomT = now(); wisdomIdx = (wisdomIdx + 1) % CBA.wisdom.length; }
        line = CBA.wisdom[wisdomIdx]; next = '';
      }
    }
    box.classList.remove('hidden');
    box.classList.toggle('paused', !playing);
    $('scTitle').textContent = title;
    if (line !== lastLine || force) {
      const l = $('scLine'); l.textContent = line; l.classList.remove('in'); void l.offsetWidth; l.classList.add('in');
      lastLine = line;
    }
    $('scNext').textContent = next || '';
  }
  setInterval(() => renderScripture(false), 1000);
  A.onChange(() => { renderScripture(false); broadcast(); });

  /* ============================ BOT MÔ PHỎNG (chỉ để test) ============================ */
  let bot = null;
  const RATE = { cham: 1600, vua: 650, nhanh: 220 };
  function simRaw(kind, opts = {}) {
    const D = CBA.simData;
    const nm = opts.name || pickOne(D.names) + ' ' + (10 + Math.floor(Math.random() * 89));
    const base = { uniqueId: 'sim_' + norm(nm).replace(/\s+/g, '_'), nickname: nm, __sim: true };
    if (kind === 'chat') return { event: 'chat', data: Object.assign(base, { comment: opts.text || pickOne(D.comments) }) };
    if (kind === 'like') return { event: 'like', data: Object.assign(base, { likeCount: opts.likes || 1 + Math.floor(Math.random() * 15) }) };
    if (kind === 'follow') return { event: 'follow', data: base };
    if (kind === 'share') return { event: 'share', data: base };
    if (kind === 'gift') {
      const g = opts.giftName ? { giftName: opts.giftName, diamondCount: opts.coins || 1 } : pickOne(D.gifts.slice(0, Math.random() < .93 ? 5 : D.gifts.length));
      return { event: 'gift', data: Object.assign(base, g, { repeatCount: opts.count || (g.diamondCount === 1 ? 1 + Math.floor(Math.random() * 5) : 1), repeatEnd: true, giftType: 1 }) };
    }
  }
  function sim(kind, opts) { handle(T.normalize(simRaw(kind, opts))); }
  function setBot(on, rate = 'vua') {
    clearInterval(bot); bot = null;
    if (on) bot = setInterval(() => {
      const r = Math.random();
      sim(r < .5 ? 'like' : r < .88 ? 'chat' : r < .985 ? 'gift' : 'follow');
      if (Math.random() < .3) { viewers = Math.max(viewers, present.size + Math.floor(Math.random() * 20)); }
    }, RATE[rate] || 650);
    updateHud(); broadcast();
  }

  function testTier(id, name) {
    const t = TIERS.find(x => x.id === id) || TIERS[0];
    const giftName = Object.keys(C.giftNameToTier).find(k => C.giftNameToTier[k] === t.id) || t.label;
    sim('gift', { name, giftName, coins: t.min, count: 1 });
  }

  /* ============================ KẾT NỐI ============================ */
  let connStatus = 'idle', connMsg = '';
  T.onEvent(handle);
  T.onStatus((s, msg) => {
    connStatus = s; connMsg = msg;
    const chip = $('chipConn');
    chip.classList.toggle('on', s === 'connected');
    chip.querySelector('em').textContent = s === 'connected' ? 'LIVE' : s === 'connecting' ? 'ĐANG KẾT NỐI' : s === 'error' ? 'MẤT KẾT NỐI' : 'CHƯA KẾT NỐI';
    broadcast();
  });

  /* ============================ ĐIỀU KHIỂN TỪ BẢNG ĐIỀU KHIỂN ============================ */
  const ch = 'BroadcastChannel' in window ? new BroadcastChannel('chua-binh-an') : null;
  function broadcast() {
    if (!ch) return;
    const top = Object.values(S.users).filter(u => u.merit > 0).sort((a, b) => b.merit - a.merit).slice(0, 10).map(u => ({ name: u.name, merit: u.merit, coins: u.coins, beads: u.beads }));
    ch.postMessage({ type: 'state', conn: connStatus, connMsg, url: T.url(), viewers, present: present.size, seats: slots.length,
      stats: { merit: S.merit, beads: S.beads, coins: S.coins, likes: S.likes, comments: S.comments, gifts: S.gifts, follows: S.follows, shares: S.shares, started: S.started, users: Object.keys(S.users).length },
      top, segment: S.segment, lunar: { text: lunar.text, feast: lunar.feast, vuLanMonth: lunar.vuLanMonth },
      mult: { lunar: lunarMult(), dongTam: dongTamMult(), room: now() < roomBuffUntil }, profiles: Object.keys(P).length, teaching: teaching ? teaching.id : null, bot: !!bot, audio: A.state(), lastEventAt });
  }
  setInterval(broadcast, 1500);

  function command(m) {
    const a = m.args || {};
    switch (m.cmd) {
      case 'connect': T.connect(a.url); break;
      case 'disconnect': T.disconnect(); break;
      case 'play': A.ensure(); A.play(a.index); break;
      case 'toggle': A.ensure(); A.toggle(); break;
      case 'next': A.next(); break;
      case 'prev': A.prev(); break;
      case 'audio': A.set(a); break;
      case 'category': A.playCategory(a.category); break;
      case 'segment': setSegment(a.id, a.auto !== false); break;
      case 'teaching': a.id ? startTeaching(a.id) : stopTeaching(); break;
      case 'announce': card({ kicker: a.kicker || 'Thông báo', title: a.title || C.templeName, text: a.text || '', ms: 7000, big: true }); A.smallBell(); break;
      case 'test':
        if (a.kind === 'tier') testTier(a.tier, a.name);
        else if (a.kind === 'milestone') runMilestone(C.milestones.find(x => x.kind === a.milestone) || C.milestones[0]);
        else sim(a.kind, a);
        break;
      case 'bot': setBot(a.on, a.rate); break;
      case 'bell': a.big ? A.bigBell() : A.smallBell(); break;
      case 'mo': A.mo(1); break;
      case 'bowAll': bowAll(); break;
      case 'safe': $('safe').classList.toggle('hidden'); break;
      case 'hideUi': stage.classList.toggle('hidden-ui'); break;
      case 'buddhaSet': C.buddhaSet = a.set; applyConfig(); break;
      case 'reset': resetSession(); break;
      case 'resetProfiles': P = {}; try { localStorage.removeItem(PKEY); } catch (e) {} dirtySeats = true; break;
      case 'clearYard': for (const id of [...present.keys()]) leave(id); break;
      case 'export': ch && ch.postMessage({ type: 'export', users: Object.values(S.users).sort((x, y) => (y.merit - x.merit) || (y.beads - x.beads))
        .map(u => { const pr = prof(u), lv = levelOf(pr.beads); return Object.assign({}, u, { level: `${lv + 1} ${C.levels[lv].name}`, streak: pr.streak, lifeBeads: pr.beads }); }) }); break;
    }
    broadcast();
  }
  if (ch) ch.onmessage = (e) => { if (e.data && e.data.type === 'cmd') command(e.data); };

  function resetSession() {
    for (const id of [...present.keys()]) leave(id);
    S = fresh(); shownBeads = 0; lastLit = -1; sticks = [];
    wishes = []; $('wishBox').classList.add('hidden'); roomBuffUntil = 0; mantraAt.clear();
    renderMala(); renderCandles(); renderOfferings(); renderSticks();
    dirtyBoard = true; renderBoard(); updateHud();
    $('beadNum').textContent = '0'; $('beadSub').textContent = 'hạt · vòng 0';
    try { localStorage.removeItem(KEY); } catch (e) {}
    setSegment(S.segment, false);
  }

  /* ============================ PHÍM TẮT & MỞ KHÓA ÂM THANH ============================ */
  function unlock() {
    A.ensure(); $('unlock').classList.add('hidden');
    if (!A.state().playing && params.get('music') !== '0') A.play(0);
  }
  $('unlock').addEventListener('click', unlock);
  if (params.get('obs') === '1') setTimeout(unlock, 300);
  else setTimeout(() => { A.ensure(); if (A.unlocked()) unlock(); }, 400);   // OBS / trình duyệt cho phép tự phát

  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '6') return testTier(TIERS[+k - 1].id);
    switch (k) {
      case 'm': A.set({ musicOn: !A.state().musicOn }); break;
      case 'n': A.next(); break;
      case 'p': A.toggle(); break;
      case 'k': T.status() === 'connected' ? T.disconnect() : T.connect(params.get('ws') || C.tikfinity.url); break;
      case 'c': sim('chat'); break;
      case 'l': sim('like'); break;
      case 'b': setBot(!bot); break;
      case 's': $('safe').classList.toggle('hidden'); break;
      case 'h': $('quick').classList.toggle('hidden'); break;
      case 'f': document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); break;
    }
  });

  /* ============================ KHỞI ĐỘNG ============================ */
  applyConfig();
  FX.init($('fx'));
  renderMala(); renderCandles(); renderOfferings(); renderSticks(); renderBoard(); updateHud();
  $('beadNum').textContent = fmt(S.beads); $('beadSub').textContent = `hạt · vòng ${fmt(Math.floor(S.beads / 108))}`;
  requestAnimationFrame(tickCounter);
  if (params.get('autoconnect') === '1' || C.tikfinity.autoConnect) T.connect(params.get('ws') || C.tikfinity.url);

  /* API công khai (đúng tên hàm trong kịch bản) */
  CBA.game = {
    event: handle,
    spawnPlayer: (name, avatar) => join(user({ id: 'manual_' + norm(name), name, avatar })),
    addGongSound: () => A.bigBell(),
    triggerGiftEffect: (giftTypeOrTier, username = 'Phật tử', coins) => {
      const t = TIERS.find(x => x.id === giftTypeOrTier);
      if (t) testTier(t.id, username);
      else sim('gift', { name: username, giftName: giftTypeOrTier, coins: coins || 1 });
    },
    CongDucCounter: () => S.merit,
    MantraCounter: () => S.beads,
    simulate: sim, setBot, reset: resetSession, state: () => S
  };
})();
