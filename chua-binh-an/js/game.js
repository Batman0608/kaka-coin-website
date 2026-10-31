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
    placeBuddhas(set);
    const bg = $('bg');
    const img = params.get('bg') || C.background;
    if (img) { bg.classList.add('has-img'); bg.querySelector('.bg-img').style.backgroundImage = `url("${img}")`; }
    else bg.classList.remove('has-img');
    $('altar').classList.toggle('no-buddha', !!img && !C.showDrawnBuddhas);
    $('aura').style.display = img && !C.showDrawnBuddhas ? 'none' : '';
    const gl = $('guideList'); gl.innerHTML = '';
    C.guide.forEach(g => { const li = el('li'); li.append(el('span', 'gi', g.icon), el('span', 'gt', g.title), el('span', 'gd', g.desc)); gl.append(li); });
    setSegment(S.segment, false);
  }

  /* ============================ TƯỢNG PHẬT & HÀO QUANG ============================ */
  const BPOS = [{ cx: 300, h: 250 }, { cx: 540, h: 345 }, { cx: 780, h: 245 }], B_BOTTOM = 772;
  function placeBuddhas(set) {
    const groups = document.querySelectorAll('#buddhas .bud');
    const auraList = [];
    set.forEach((b, i) => {
      const g = groups[i], pos = BPOS[i], img = g.querySelector('.bimg'), sym = g.querySelector('.bsym');
      const useSym = () => {
        const w = pos.h * 300 / 420; img.style.display = 'none'; sym.style.display = '';
        sym.setAttribute('x', pos.cx - w / 2); sym.setAttribute('y', B_BOTTOM - pos.h); sym.setAttribute('width', w); sym.setAttribute('height', pos.h);
        setAura(i, w, 0.18, 0.5);
      };
      const setAura = (i, w, hf, bf) => {
        const top = B_BOTTOM - pos.h;
        auraList[i] = { x: pos.cx, head: top + pos.h * hf, body: top + pos.h * bf, w, h: pos.h, color: b.aura, kind: b.kind || 'thichca' };
        CBA.Aura.set(auraList.filter(Boolean).length === set.length ? auraList : auraList.map(x => x || { x: -999, head: 0, body: 0, w: 1, h: 1, color: '#000000' }));
      };
      if (!b.img) return useSym();
      const probe = new Image();
      probe.onload = () => {
        const w = pos.h * probe.naturalWidth / probe.naturalHeight;
        img.setAttribute('href', b.img); img.style.display = ''; sym.style.display = 'none';
        img.setAttribute('x', pos.cx - w / 2); img.setAttribute('y', B_BOTTOM - pos.h); img.setAttribute('width', w); img.setAttribute('height', pos.h);
        setAura(i, w, b.headFrac || 0.14, b.bodyFrac || 0.5);
      };
      probe.onerror = useSym;
      probe.src = b.img;
    });
  }
  const buddhaSet = () => C.buddhaSets[C.buddhaSet] || C.buddhaSets.hoanh;

  /* ---------- PHẬT QUANG: mỗi 10 phút, mỗi người đang tu tập có 50% may mắn ---------- */
  let pqNext = now() + C.phatQuang.everyMin * 60000, pqTurn = 0;
  function phatQuang() {
    pqNext = now() + C.phatQuang.everyMin * 60000;
    const cut = now() - C.phatQuang.activeMin * 60000;
    const cands = [...present.values()].filter(p => p.fig && p.u.last > cut);
    if (!cands.length) return;
    const bi = pqTurn++ % 3, b = buddhaSet()[bi], ab = CBA.Aura.list()[bi];
    const lucky = cands.filter(() => Math.random() < C.phatQuang.chance);
    CBA.Aura.manifest(bi, 14); radiant(4);
    A.khanh(); A.bigBell(0.8);
    lucky.forEach((p, k) => setTimeout(() => {
      const pos = figPos(p);
      if (ab) FX.beam(ab.x, ab.head, pos.x, pos.y, b.aura);
      bless(p, C.phatQuang.glowMin * 60); bow(p);
      addBeads(p.u, C.phatQuang.bonus, false);
      const pr = prof(p.u); pr.pq = (pr.pq || 0) + 1;
    }, 1200 + k * 180));
    saveP();
    const names = lucky.slice(0, 10).map(p => p.u.name).join(', ') + (lucky.length > 10 ? ` và ${lucky.length - 10} người khác` : '');
    card(lucky.length
      ? { kicker: `☀️ Phật Quang phổ chiếu · ${b.name}`, title: `${lucky.length}/${cands.length} Phật tử được hào quang chiếu đến`, text: names, sub: `Mỗi người +${C.phatQuang.bonus} hạt · ${b.mantra}`, ms: 9000, big: true }
      : { kicker: `☀️ Phật Quang · ${b.name}`, title: 'Hào quang đã tỏa khắp chùa', text: 'Lần này chưa ai được chiếu riêng — hãy tiếp tục niệm Phật, 10 phút nữa Phật Quang lại hiện.', ms: 7000, big: true });
    A.speak(`${b.name} tỏa hào quang. ${lucky.length ? lucky.length + ' Phật tử được hào quang chiếu đến.' : ''}`);
  }
  setInterval(() => { if (now() >= pqNext) phatQuang(); }, 1000);

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
    daily('beads', n);
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
    const a = $('altar'); a.classList.add('radiant'); FX.halo(sec); CBA.Aura.all(sec);
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

  const ROBE = ['#7f93b6', '#9c6b45', '#e6e6ee', '#f0b93a'];
  const ROBE2 = ['#6a7ea0', '#845a39', '#c9c9d4', '#d39a22'];
  function tierOfUser(u, rank) {
    if (u.merit > 0 && rank < 3) return 3;
    if (u.merit >= 1000) return 2;
    if (u.merit >= 10) return 1;
    return 0;
  }
  const scaleAt = (y) => Math.max(0.72, Math.min(1.25, 0.84 + (y - 1062) / 115 * 0.07));
  const AISLE = 540, BURNER_SPOT = { x: 540, y: 1186 };

  /* ---------- hình nhân vật (nhìn từ phía sau, hướng lên điện Phật) ---------- */
  function makeFigure(u) {
    const f = el('div', 'pt');
    const tag = el('div', 'tag');
    if (u.avatar) {
      const im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = u.avatar; im.onerror = () => im.replaceWith(el('span', 'av'));
      tag.append(im);
    } else tag.append(el('span', 'av'));
    tag.append(el('b', 'lv', '1'), document.createTextNode(u.name));
    const h = hashStr(u.id);
    const hair = ['bun', 'bun', 'short', 'long', 'long', 'shaved'][h % 6];
    const skin = ['#e8b88a', '#dca77a', '#f0c9a0', '#c99668'][(h >> 3) % 4];
    const hairC = ['#1d120c', '#2a1810', '#3b2414'][(h >> 5) % 3];
    const hairSvg = {
      bun: `<circle cx="40" cy="29" r="14.5" fill="${hairC}"/><circle cx="40" cy="15.5" r="6.5" fill="${hairC}"/><path d="M33 13 q7 -4 14 0" stroke="#7a5a3a" stroke-width="1.2" fill="none"/>`,
      short: `<circle cx="40" cy="29" r="14.5" fill="${hairC}"/><path d="M29 22 q11 -9 22 0" stroke="rgba(255,255,255,.12)" stroke-width="2" fill="none"/>`,
      long: `<path d="M26 30 Q25 56 31 64 L49 64 Q55 56 54 30 Z" fill="${hairC}"/><circle cx="40" cy="29" r="14.5" fill="${hairC}"/>`,
      shaved: `<circle cx="40" cy="29" r="14" fill="${skin}"/><circle cx="40" cy="29" r="14" fill="rgba(60,40,30,.18)"/>`
    }[hair];
    f.innerHTML = `<div class="hring"></div><svg viewBox="0 0 80 140">
      <ellipse class="shadow" cx="40" cy="136" rx="27" ry="5" fill="rgba(0,0,0,.35)"/>
      <g class="feet"><ellipse class="fl" cx="32" cy="133" rx="6.5" ry="3.5" fill="#2a1a12"/><ellipse class="fr" cx="48" cy="133" rx="6.5" ry="3.5" fill="#2a1a12"/></g>
      <g class="st">
        <path class="robe2" d="M24 52 Q11 72 13 104 Q20 108 27 103 Q25 82 29 64 Z" fill="${ROBE2[0]}"/>
        <path class="robe2" d="M56 52 Q69 72 67 104 Q60 108 53 103 Q55 82 51 64 Z" fill="${ROBE2[0]}"/>
        <path class="robe" d="M24 50 Q40 43 56 50 L63 129 Q40 135 17 129 Z" fill="${ROBE[0]}" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/>
        <path d="M40 50 V132" stroke="rgba(0,0,0,.2)" stroke-width="1.6"/>
        <path d="M30 70 L26 128 M50 70 L54 128" stroke="rgba(0,0,0,.08)" stroke-width="2"/>
        <path d="M31 50 Q40 56 49 50" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/>
      </g>
      <g class="kn">
        <path class="robe" d="M8 136 C6 112 15 91 40 84 C65 91 74 112 72 136 Z" fill="${ROBE[0]}" stroke="rgba(0,0,0,.32)" stroke-width="1.4"/>
        <path d="M40 88 V136" stroke="rgba(0,0,0,.2)" stroke-width="1.8"/>
        <path d="M14 122 Q21 104 28 98 M66 122 Q59 104 52 98" stroke="rgba(0,0,0,.16)" stroke-width="2" fill="none"/>
        <path d="M30 86 Q40 92 50 86" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/>
      </g>
      <g class="head">
        <g class="inc"><path d="M36 -2 L37.5 20 M44 -2 L42.5 20" stroke="#b3261e" stroke-width="2"/><circle cx="36" cy="-3" r="2.6" fill="#ffd36b"/><circle cx="44" cy="-3" r="2.6" fill="#ffd36b"/></g>
        <rect x="35" y="39" width="10" height="11" rx="3" fill="${skin}"/>
        <ellipse cx="25.5" cy="31" rx="3" ry="5" fill="${skin}"/><ellipse cx="54.5" cy="31" rx="3" ry="5" fill="${skin}"/>
        ${hairSvg}
      </g></svg>`;
    f.prepend(tag);
    $('yard').append(f);
    return f;
  }
  function setFigTier(p, t) {
    p.fig.className = p.fig.className.replace(/\bt\d\b/g, '').trim() + ' t' + t;
    p.fig.querySelectorAll('.robe').forEach(e => e.setAttribute('fill', ROBE[t]));
    p.fig.querySelectorAll('.robe2').forEach(e => e.setAttribute('fill', ROBE2[t]));
  }

  /* ---------- di chuyển theo lối đi ---------- */
  function place(p, x, y, sec) {
    const f = p.fig; if (!f) return;
    const from = p.pos || { x, y };
    f.style.transitionDuration = sec + 's';
    f.style.left = x + 'px'; f.style.top = y + 'px';
    f.style.setProperty('--sc', scaleAt(y).toFixed(3));
    f.style.zIndex = String(10 + Math.round(y / 10));
    f.classList.toggle('faceL', x < from.x - 4); f.classList.toggle('faceR', x > from.x + 4);
    p.pos = { x, y };
  }
  function walkPath(p, pts, done, speed = 190) {
    if (!p.fig) return;
    clearTimeout(p.walkT);
    p.fig.classList.remove('kneel', 'bow');
    p.fig.classList.add('walk');
    let i = 0;
    const step = () => {
      if (!p.fig) return;
      if (i >= pts.length) { p.fig.classList.remove('walk', 'faceL', 'faceR'); if (done) done(); return; }
      const [x, y] = pts[i++]; const c = p.pos || { x, y };
      const sec = Math.max(0.12, Math.hypot(x - c.x, y - c.y) / speed);
      place(p, x, y, sec);
      p.walkT = setTimeout(step, sec * 1000);
    };
    step();
  }
  const jit = () => (Math.random() - 0.5) * 36;
  function routeTo(p, x, y) {
    const c = p.pos || { x: AISLE, y: 1990 }, a = AISLE + jit(), pts = [];
    if (Math.abs(c.x - AISLE) > 25) pts.push([a, c.y]);
    if (Math.abs(c.y - y) > 4) pts.push([a, y]);
    pts.push([x, y]);
    return pts;
  }
  function sitDown(p) {
    if (!p.fig) return;
    p.fig.classList.add('kneel');
    setTimeout(() => bow(p), 450);
  }
  function goSeat(p) {
    const s = slots[p.seat]; if (!s) return;
    walkPath(p, routeTo(p, s.x, s.y), () => sitDown(p));
  }

  function join(u) {
    if (present.has(u.id)) { present.get(u.id).u = u; return present.get(u.id); }
    const p = { u, fig: null, seat: -1, since: now(), pos: null, busy: false };
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
    if (p.fig) walkOut(p);
    dirtySeats = true;
  }
  function walkOut(p) {
    const ghost = { fig: p.fig, pos: p.pos };
    p.fig = null; p.seat = -1; p.busy = false;
    clearTimeout(p.walkT);
    walkPath(ghost, routeTo(ghost, AISLE, 1990), () => { ghost.fig.style.opacity = '0'; setTimeout(() => ghost.fig.remove(), 900); });
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
        if (!p.fig) { p.fig = makeFigure(p.u); p.pos = null; place(p, AISLE + jit(), 1990, 0); }
        const r = meritRank.indexOf(p.u.id);
        setFigTier(p, tierOfUser(p.u, r === -1 ? 99 : r));
        const prr = prof(p.u);
        p.fig.querySelector('.lv').textContent = String(levelOf(prr.beads) + 1) + ((prr.titles || []).length ? '✦' : '');
        renderRose(p);
        if (p.seat !== i) {
          p.seat = i;
          if (!p.busy) { const go = () => goSeat(p); p.pos && p.pos.y < 1980 ? go() : requestAnimationFrame(() => requestAnimationFrame(go)); }
        }
      } else if (p.fig) {   // hết chỗ: ra hàng chờ
        walkOut(p);
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

  /* lạy: đang quỳ thì cúi sát đất, đang đứng thì vái */
  function bow(p) {
    if (!p || !p.fig || p.fig.classList.contains('walk')) return;
    p.fig.classList.remove('bow'); void p.fig.offsetWidth; p.fig.classList.add('bow');
    clearTimeout(p.bowT); p.bowT = setTimeout(() => p.fig && p.fig.classList.remove('bow'), 2300);
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
  function bless(p, sec = 60) {
    if (!p || !p.fig) return;
    p.fig.classList.add('blessed');
    clearTimeout(p.blT); p.blT = setTimeout(() => p.fig && p.fig.classList.remove('blessed'), sec * 1000);
  }
  function say(p, text, wish = false) {
    if (!p || !p.fig || !text) return;
    const old = p.fig.querySelector('.bubble'); if (old) old.remove();
    const b = el('div', 'bubble' + (wish ? ' wish' : ''), text);
    p.fig.append(b); setTimeout(() => b.remove(), 5000);
  }
  function figPos(p) {
    if (p && p.fig && p.pos) {
      const kneel = p.fig.classList.contains('kneel');
      return { x: p.pos.x, y: p.pos.y - (kneel ? 66 : 112) * scaleAt(p.pos.y) };
    }
    if (p && p.seat >= 0) { const s = slots[p.seat]; return { x: s.x, y: s.y - 66 }; }
    return { x: 540, y: 1500 };
  }

  /* ---------- lên lư hương thắp hương ---------- */
  let burnerVisitors = 0;
  function visitBurner(p, onPlant) {
    if (!p || !p.fig || p.busy) { if (onPlant) onPlant(); return; }
    p.busy = true; holdIncense(p, 40);
    const k = burnerVisitors++ % 3, x = BURNER_SPOT.x + (k - 1) * 46;
    walkPath(p, routeTo(p, x, BURNER_SPOT.y), () => {
      p.fig.classList.add('faceUp'); bow(p);
      setTimeout(() => bow(p), 2300);
      setTimeout(() => {
        if (onPlant) onPlant();
        if (!p.fig) return;
        p.fig.classList.remove('holding', 'faceUp'); p.busy = false;
        burnerVisitors = Math.max(0, burnerVisitors - 1);
        goSeat(p);
      }, 4700);
    });
  }

  /* ---------- kinh hành: đi chậm quanh sân chùa ---------- */
  function kinhHanh(p) {
    if (!p || !p.fig || p.busy || p.seat < 0) return;
    const s = slots[p.seat]; p.busy = true;
    const side = s.x < AISLE ? 70 : 1010, a = AISLE + jit();
    walkPath(p, [[a, s.y], [a, 1548], [side, 1548], [side, 1040], [s.x, 1040], [s.x, s.y]], () => { p.busy = false; if (slots[p.seat] === s) sitDown(p); else goSeat(p); }, 75);
  }
  setInterval(() => {   // sân chùa luôn có sự sống: người lạy, người kinh hành
    const seated = [...present.values()].filter(p => p.fig && !p.busy && p.fig.classList.contains('kneel'));
    if (!seated.length) return;
    if (Math.random() < 0.6) bow(pickOne(seated));
    const walkers = [...present.values()].filter(p => p.busy && p.fig && p.fig.classList.contains('walk')).length;
    const want = S.segment === 'niemphat' ? 4 : 1;
    if (walkers < want && Math.random() < (S.segment === 'niemphat' ? 0.5 : 0.12)) kinhHanh(pickOne(seated));
  }, 3000);

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
    if (tier.id !== 'huong') { bow(p); holdIncense(p, 8); }
    const pos = figPos(p);
    switch (tier.id) {
      case 'huong':
        u._buff = now() + C.incenseBuff.personalMin * 60000;
        A.mo(1);
        visitBurner(p, () => { addSticks(Math.min(count, 5)); FX.boostSmoke(6 + count * 2); FX.sparkle(14, FX.BURNER.x, FX.BURNER.y); A.mo(0.8); });
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
    if (storyRun && ev.id && ev.type !== 'join') storyUsers.add(ev.id);
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
    if (quiz && !quiz.revealed && answerQuiz(u, n)) { say(p, '❓ ' + text.slice(0, 20)); return; }
    if (has(n, K.checkBook)) {
      const pr = prof(u), got = (pr.stories || []).length;
      say(p, `📖 ${got}/${CBA.stories.length} truyện` + ((pr.titles || []).length ? ` · 🏅 ${pr.titles.slice(-2).join(', ')}` : ''));
      return;
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
      mantraAt.set(u.id, now()); daily('mantras');
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
    if (fl) { S.follows++; daily('follows'); } else { S.shares++; daily('shares'); }
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
    wishes.unshift(w); wishes = wishes.slice(0, 30); daily('wishes');
    const pos = figPos(p); FX.lanternAt(pos.x, pos.y);
    toast('🏮', [{ b: u.name }, ' thả đèn nguyện · comment "Tùy hỷ" để chung vui'], true);
    showWish(w);
  }
  function tuyHy(u, p) {
    bow(p);
    const w = wishes.find(x => x.uid !== u.id && now() - x.t < 15 * 60000 && !x.by.includes(u.id));
    if (!w) { say(p, '🤲 Tùy hỷ công đức'); return; }
    w.by.push(u.id); w.tuy++; daily('tuyhy');
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
    daily('present', present.size, true);
    $('simBadge').classList.toggle('hidden', !(bot || now() < simActiveUntil));
    const chips = [];
    chips.push(lunar.feast && C.lunarBonus ? `🌕 ${lunar.feast.name} · ×${lunar.mult}` : `🌙 ${lunar.text}`);
    const dn = dongTamCount(); if (dn >= C.dongTam.minPeople) chips.push(`🤝 Đồng tâm ${dn} người · ×${dongTamMult().toFixed(2)}`);
    const left = roomBuffUntil - now();
    const pqLeft = Math.max(0, pqNext - now());
    chips.push(`☀️ Phật Quang sau ${Math.floor(pqLeft / 60000)}:${String(Math.floor(pqLeft / 1000) % 60).padStart(2, '0')}`);
    if (left > 0) chips.push(`🪔 Hương trầm ×${C.incenseBuff.mult} · ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`);
    const html = chips.join('|');
    if (html !== updateHud._last) {
      updateHud._last = html;
      const box = $('bonus'); box.innerHTML = '';
      chips.forEach((c, i) => box.append(el('span', 'chip' + (i === 0 && lunar.feast ? ' feast' : ''), c)));
    }
    return seated;
  }
  setInterval(() => { layoutSeats(); renderBoard(); updateHud(); checkMissions(); }, 600);

  /* ======================= NHIỆM VỤ HẰNG NGÀY · HẠNH TU · DUYÊN LÀNH ======================= */
  const DKEY = 'cba_daily_v1';
  let D = null;
  function hashStr(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function loadDaily() {
    const today = dayKey(vnDate());
    let old = null; try { old = JSON.parse(localStorage.getItem(DKEY) || 'null'); } catch (e) {}
    if (old && old.day === today) { D = old; return; }
    // chọn 3 nhiệm vụ theo ngày (cố định trong ngày)
    const pool = C.missions.pool.slice(); const pick = []; let h = hashStr(today);
    while (pick.length < C.missions.perDay && pool.length) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; pick.push(pool.splice(h % pool.length, 1)[0].id); }
    const yesterday = dayKey(vnDate(new Date(Date.now() - 86400000)));
    const ts = old && old.allDone && old.day === yesterday ? (old.templeStreak || 0) : 0;
    D = { day: today, ids: pick, c: {}, done: [], allDone: false, templeStreak: ts, luck: [] };
    saveDaily();
  }
  function saveDaily() { try { localStorage.setItem(DKEY, JSON.stringify(D)); } catch (e) {} }
  function daily(k, n = 1, max = false) {
    if (!D || D.day !== dayKey(vnDate())) loadDaily();
    D.c[k] = max ? Math.max(D.c[k] || 0, n) : (D.c[k] || 0) + n;
  }
  const missionDef = (id) => C.missions.pool.find(m => m.id === id);
  function checkMissions() {
    if (!D) return;
    let changed = false;
    D.ids.forEach(id => {
      const m = missionDef(id); if (!m || D.done.includes(id)) return;
      if ((D.c[id] || 0) >= m.n) {
        D.done.push(id); changed = true;
        toast('✅', ['Nhiệm vụ của chùa hoàn thành: ', { b: m.text.replace('{n}', fmt(m.n)) }], true); A.smallBell();
      }
    });
    if (!D.allDone && D.done.length >= D.ids.length) {
      D.allDone = true; D.templeStreak = (D.templeStreak || 0) + 1; changed = true;
      for (const pp of present.values()) addBeads(pp.u, C.missions.allBonus, false);
      A.bigBell(); A.bigBell(2.4); radiant(6); FX.petals(80, false); bowAll();
      card({ kicker: 'Viên mãn ngày tu', title: 'Cả chùa hoàn thành nhiệm vụ hôm nay!', text: `Mỗi Phật tử đang có mặt +${C.missions.allBonus} hạt · Chùa đã viên mãn ${D.templeStreak} ngày liên tiếp`, ms: 8000, big: true });
    }
    if (changed || now() - (checkMissions._s || 0) > 5000) { checkMissions._s = now(); saveDaily(); }
    renderMissions();
  }
  const hanhTuToday = () => C.hanhTu[Math.floor(vnDate().getTime() / 86400000) % C.hanhTu.length];
  function renderMissions() {
    if (!D) return;
    const h = hanhTuToday();
    $('mHanh').textContent = `Hạnh tu hôm nay: ${h.name}`;
    $('mTip').textContent = h.tip;
    const ul = $('missionList'); ul.innerHTML = '';
    D.ids.forEach(id => {
      const m = missionDef(id); if (!m) return;
      const v = Math.min(m.n, D.c[id] || 0), done = D.done.includes(id);
      const li = el('li', done ? 'done' : '');
      li.append(el('span', 'mt', (done ? '✅ ' : '◻️ ') + m.text.replace('{n}', fmt(m.n))));
      const bar = el('span', 'mb'); const fillEl = el('i'); fillEl.style.width = (v / m.n * 100) + '%'; bar.append(fillEl);
      li.append(bar, el('span', 'mv', `${fmt(v)}/${fmt(m.n)}`));
      ul.append(li);
    });
    $('mStreak').textContent = D.templeStreak ? `🏯 Chùa viên mãn ${D.templeStreak} ngày liên tiếp` : 'Hoàn thành cả 3 để cả chùa nhận thưởng';
  }
  // panel trái luân phiên: Cách tham gia ↔ Nhiệm vụ hôm nay
  let guideFlip = false;
  setInterval(() => { guideFlip = !guideFlip; $('guide').classList.toggle('flip', guideFlip); }, 12000);

  /* Duyên lành: chọn ngẫu nhiên người đang tham gia — mọi người cơ hội như nhau, không liên quan quà tặng */
  let lastLuck = now();
  setInterval(() => {
    if (!C.duyenLanh.everyMin || now() - lastLuck < C.duyenLanh.everyMin * 60000) return;
    if (present.size < C.duyenLanh.minPresent || storyRun) return;
    const cut = now() - C.duyenLanh.activeMin * 60000, cool = now() - C.duyenLanh.cooldownDays * 86400000;
    const pool = [...present.values()].map(x => x.u).filter(u => u.last > cut && (prof(u).luck || 0) < cool);
    lastLuck = now();
    if (!pool.length) return;
    const u = pickOne(pool), pr = prof(u); pr.luck = now(); saveP();
    addBeads(u, C.duyenLanh.bonus, false, true);
    const pp = present.get(u.id); bow(pp); const pos = figPos(pp); FX.sparkle(40, pos.x, pos.y); FX.lanternAt(pos.x, pos.y);
    A.khanh(); A.smallBell(1);
    card({ kicker: '✨ Duyên lành hôm nay', title: u.name, text: `${C.storyteller} gửi lời chúc riêng: “${pickOne(CBA.wisdom)}”`, sub: `+${C.duyenLanh.bonus} hạt · Duyên lành chọn ngẫu nhiên người đang tu tập, không phụ thuộc quà tặng`, ms: 8000, big: true });
  }, 20000);

  /* ======================= KỂ CHUYỆN PHẬT ======================= */
  const SKEY = 'cba_story_v1';
  let SB = { mainIdx: 0, mainDay: '', told: {} };
  try { SB = Object.assign(SB, JSON.parse(localStorage.getItem(SKEY) || '{}')); } catch (e) {}
  const saveSB = () => { try { localStorage.setItem(SKEY, JSON.stringify(SB)); } catch (e) {} };
  const seriesOf = (id) => CBA.storySeries.find(x => x.id === id) || CBA.storySeries[0];
  const mainList = () => CBA.stories.filter(x => x.series === 'cuocdoi');
  let storyRun = null, storyUsers = new Set(), lastStoryEnd = now(), quiz = null;

  function todayStory() {
    const today = dayKey(vnDate());
    if (SB.mainDay !== today) return mainList()[SB.mainIdx % mainList().length];
    // truyện phụ: ưu tiên Vu Lan trong tháng 7 âm, Tam Thế Phật vào ngày lễ; còn lại truyện lâu chưa kể nhất
    let pool = CBA.stories.filter(x => x.series !== 'cuocdoi');
    if (lunar.vuLanMonth) { const v = pool.filter(x => x.series === 'vulan'); if (v.some(x => !SB.told[x.id] || now() - SB.told[x.id] > 86400000)) pool = v; }
    else if (lunar.feast) { const v = pool.filter(x => x.series === 'tamthe'); if (v.length) pool = v; }
    return pool.slice().sort((a, b) => (SB.told[a.id] || 0) - (SB.told[b.id] || 0))[0];
  }

  function startStory(id) {
    if (storyRun) return;
    const st = (id && CBA.stories.find(x => x.id === id)) || todayStory(); if (!st) return;
    stopTeaching();
    const ser = seriesOf(st.series);
    const pages = st.scenes.map(t => ({ t })).concat([{ t: st.moral, moral: true }]);
    storyRun = { st, ser, pages, i: -1, t0: 0, b0: 0 };
    storyUsers = new Set();
    stage.classList.add('storying');
    const chap = ser.main ? ` · Chương ${mainList().indexOf(st) + 1}/${mainList().length}` : '';
    $('stSeries').textContent = `${ser.icon} ${ser.name}${chap}`;
    $('stTitle').textContent = st.title;
    $('story').classList.remove('hidden', 'quiz');
    A.khanh(); A.speak(`${C.storyteller} kể chuyện: ${st.title}.`, 'story');
    toast('📖', [`${C.storyteller} bắt đầu kể: `, { b: st.title }, ' · thả tim để lật trang'], true);
    nextPage();
    broadcast();
  }
  function nextPage() {
    const r = storyRun; if (!r) return;
    r.i++;
    if (r.i >= r.pages.length) return startQuiz();
    const pg = r.pages[r.i];
    r.t0 = now(); r.b0 = S.beads;
    r.minMs = Math.max(C.story.minSceneSec * 1000, pg.t.length / 14 * 1000);
    const tx = $('stText'); tx.className = 'st-text' + (pg.moral ? ' moral' : '');
    tx.textContent = pg.moral ? '🪷 Lời dạy: ' + pg.t : pg.t;
    void tx.offsetWidth; tx.classList.add('in');
    $('stPage').textContent = pg.moral ? 'Lời dạy' : `Trang ${r.i + 1}/${r.pages.length - 1}`;
    A.mo(0.7);
    A.speak(pg.t, 'story');
    if (pg.moral) { FX.petals(30, false); bowAll(); }
  }
  function tickStory() {
    const r = storyRun;
    if (quiz) return tickQuiz();
    if (!r) return;
    const el2 = now() - r.t0, got = S.beads - r.b0;
    const need = C.story.sceneBeads;
    $('stBar').style.width = Math.min(100, Math.max(got / need, el2 / (C.story.maxSceneSec * 1000)) * 100) + '%';
    $('stHint').textContent = got >= need ? '✨ Đủ hạt — sắp lật trang' : `❤️ Thả tim / niệm Phật để lật trang: ${fmt(got)}/${need} hạt`;
    if ((el2 >= r.minMs && got >= need) || el2 >= C.story.maxSceneSec * 1000) nextPage();
  }

  function startQuiz() {
    const r = storyRun; const q = r.st.quiz;
    if (!q) return endStory();
    quiz = { q, t0: now(), answers: new Map(), correct: [] };
    $('story').classList.add('quiz');
    $('stPage').textContent = '❓ Đố vui';
    const tx = $('stText'); tx.className = 'st-text in'; tx.innerHTML = '';
    tx.append(el('div', 'qq', q.q));
    q.options.forEach((o, i) => {
      const row = el('div', 'qo'); row.dataset.i = i;
      row.append(el('b', '', 'ABC'[i]), el('span', '', o), el('em', '', '0'));
      tx.append(row);
    });
    A.smallBell(); A.speak('Câu đố: ' + q.q + ' ' + q.options.map((o, i) => 'ABC'[i] + ', ' + o).join('. '), 'story');
  }
  function answerQuiz(u, n) {
    if (!quiz || quiz.answers.has(u.id)) return false;
    const m = n.match(/^\s*(?:dap an\s*)?([abc123])(?:[^a-z0-9]|$)/);
    let idx = m ? ('abc'.indexOf(m[1]) >= 0 ? 'abc'.indexOf(m[1]) : +m[1] - 1) : -1;
    if (idx < 0) idx = quiz.q.options.findIndex(o => norm(o).length > 3 && n.includes(norm(o)));
    if (idx < 0) return false;
    quiz.answers.set(u.id, idx);
    if (idx === quiz.q.answer) quiz.correct.push(u);
    const counts = [0, 0, 0]; for (const v of quiz.answers.values()) counts[v]++;
    document.querySelectorAll('#stText .qo em').forEach((e, i) => { e.textContent = counts[i]; });
    return true;
  }
  function tickQuiz() {
    if (quiz.revealed) return;
    const left = C.story.quizSec * 1000 - (now() - quiz.t0);
    $('stBar').style.width = Math.max(0, left / (C.story.quizSec * 10)) + '%';
    $('stHint').textContent = `Comment A, B hoặc C · còn ${Math.max(0, Math.ceil(left / 1000))} giây · ${quiz.answers.size} người đã trả lời`;
    if (left <= 0 && !quiz.revealed) revealQuiz();
  }
  function revealQuiz() {
    quiz.revealed = true;
    const q = quiz.q;
    document.querySelectorAll('#stText .qo').forEach((row) => row.classList.add(+row.dataset.i === q.answer ? 'right' : 'wrong'));
    const win = quiz.correct;
    win.forEach(u => {
      addBeads(u, C.story.quizBonus, false);
      const pr = prof(u); pr.quiz = (pr.quiz || 0) + 1; daily('quiz');
      C.story.quizTitles.forEach(t => { if (pr.quiz === t.at) giveTitle(u, t.name); });
    });
    saveP();
    const names = win.slice(0, C.story.quizShow).map(u => u.name).join(', ');
    $('stHint').textContent = win.length ? `🎉 ${win.length} người đúng (+${C.story.quizBonus} hạt): ${names}${win.length > C.story.quizShow ? '…' : ''}` : `Đáp án: ${'ABC'[q.answer]}. ${q.options[q.answer]}`;
    A.speak(`Đáp án đúng là ${'ABC'[q.answer]}, ${q.options[q.answer]}. ${win.length ? 'Xin chúc mừng ' + win.length + ' Phật tử trả lời đúng.' : ''}`, 'story');
    if (win.length) { FX.sparkle(40, 540, 1300); A.smallBell(); }
    setTimeout(endStory, 7000);
  }
  function endStory() {
    const r = storyRun; if (!r) return;
    quiz = null; storyRun = null; lastStoryEnd = now();
    SB.told[r.st.id] = now();
    let teaser = '';
    if (r.ser.main) {
      SB.mainDay = dayKey(vnDate()); SB.mainIdx = (mainList().indexOf(r.st) + 1) % mainList().length;
      const nx = mainList()[SB.mainIdx];
      teaser = SB.mainIdx === 0 ? 'Đã kể trọn 12 chương Cuộc Đời Đức Phật. Ngày mai bắt đầu lại từ chương 1.' : `Hẹn ngày mai: Chương ${SB.mainIdx + 1} — ${nx.title}`;
    }
    saveSB(); daily('stories');
    // ghi vào sổ truyện của người đã tham gia
    let n = 0;
    storyUsers.forEach(id => {
      const u = S.users[id]; if (!u) return; n++;
      const pr = prof(u); pr.stories = pr.stories || [];
      if (!pr.stories.includes(r.st.id)) {
        pr.stories.push(r.st.id);
        const all = CBA.stories.filter(x => x.series === r.st.series).every(x => pr.stories.includes(x.id));
        if (all) giveTitle(u, r.ser.title);
      }
      addBeads(u, C.story.listenBonus, false);
    });
    saveP();
    $('story').classList.add('hidden'); stage.classList.remove('storying');
    card({ kicker: '📖 Viên mãn câu chuyện', title: r.st.title, text: `${n} Phật tử cùng nghe trọn truyện · mỗi người +${C.story.listenBonus} hạt và thêm 1 trang vào Sổ Truyện (comment !so để xem)`, sub: teaser, ms: 8000, big: true });
    if (teaser) A.speak(teaser, 'story');
    broadcast();
  }
  function stopStory() {
    if (!storyRun) return;
    quiz = null; storyRun = null; lastStoryEnd = now();
    $('story').classList.add('hidden'); stage.classList.remove('storying');
    A.speak('', 'cancel'); broadcast();
  }
  function giveTitle(u, name) {
    const pr = prof(u); pr.titles = pr.titles || [];
    if (pr.titles.includes(name)) return;
    pr.titles.push(name); saveP(); dirtySeats = true;
    const pp = present.get(u.id); bow(pp); const pos = figPos(pp); FX.sparkle(50, pos.x, pos.y);
    A.bigBell();
    card({ kicker: '🏅 Danh hiệu mới', title: u.name, text: `Nhận danh hiệu “${name}”`, sub: 'Danh hiệu chỉ đạt được bằng tu tập, không mua được bằng quà', ms: 7000, big: true });
  }
  setInterval(() => {
    tickStory();
    if (!storyRun && C.story.autoEveryMin && present.size > 0 && now() - lastStoryEnd > C.story.autoEveryMin * 60000) startStory();
  }, 500);

  /* ============================ CHƯƠNG TRÌNH & KINH ============================ */
  let teaching = null, teachIdx = 0, teachT = null, wisdomIdx = 0, wisdomT = 0;
  function setSegment(id, autoMusic = true) {
    const seg = C.segments.find(s => s.id === id) || C.segments[0];
    S.segment = seg.id;
    $('segTitle').textContent = seg.title; $('segNote').textContent = seg.note || '';
    if (autoMusic && seg.story) { stopTeaching(); A.playCategory(seg.category); startStory(); }
    else if (autoMusic && seg.category) {
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
      story: storyRun ? { id: storyRun.st.id, title: storyRun.st.title, page: storyRun.i + 1, pages: storyRun.pages.length, quiz: !!quiz } : null,
      storyBook: { mainIdx: SB.mainIdx, mainDoneToday: SB.mainDay === dayKey(vnDate()), next: (todayStory() || {}).title, auto: C.story.autoEveryMin },
      daily: D ? { ids: D.ids, c: D.c, done: D.done, streak: D.templeStreak, hanh: hanhTuToday().name } : null,
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
      case 'scanAudio': A.scanFolder().then(n => { ch && ch.postMessage({ type: 'scan', n }); broadcast(); }); break;
      case 'addTracks': A.addTracks(a.items || []); break;
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
      case 'storyStart': startStory(a.id); break;
      case 'storyNext': if (quiz) { if (!quiz.revealed) revealQuiz(); } else nextPage(); break;
      case 'storyStop': stopStory(); break;
      case 'storyAuto': C.story.autoEveryMin = +a.min || 0; break;
      case 'luckNow': lastLuck = 0; break;
      case 'phatQuang': phatQuang(); break;
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
      case 't': storyRun ? stopStory() : startStory(); break;
      case 'q': phatQuang(); break;
      case 'f': document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); break;
    }
  });

  /* ============================ KHỞI ĐỘNG ============================ */
  loadDaily();
  A.scanFolder().then(n => { if (n) toast('🎵', [`Đã nhận ${n} file nhạc/kinh trong thư mục audio`], true); });
  applyConfig();
  FX.init($('fx'));
  CBA.Aura.init($('aura'));
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
