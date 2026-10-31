/* =========================================================================
 *  CHẾ ĐỘ CHƠI BÌNH THƯỜNG (không cần TikTok)
 *  Bật bằng: choi.html · live.html?mode=play · live.html#choi
 *  Người chơi tự tạo nhân vật, đi lại, ngồi đệm, lạy Phật, lần tràng hạt,
 *  tụng kinh, thiền, dâng lễ, thả đèn nguyện, nghe truyện, hành hương.
 * ========================================================================= */
(() => {
  const qs = new URLSearchParams(location.search);
  const PLAY = window.CBA_MODE === 'play' || qs.get('mode') === 'play' || location.hash === '#choi';
  if (!PLAY || !CBA.game || !CBA.game.play) return;
  const G = CBA.game.play, C = CBA.config, A = G.A;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmt = (n) => Math.round(n || 0).toLocaleString('vi-VN');
  const store = { get(k, d) { try { const v = localStorage.getItem('cba_play_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
                  set(k, v) { try { localStorage.setItem('cba_play_' + k, JSON.stringify(v)); } catch (e) {} } };
  const ME = 'me_local';
  const stage = $('stage');
  document.body.classList.add('play'); stage.classList.add('play'); dispatchEvent(new Event('resize'));
  $('unlock').classList.add('hidden');
  $('chipConn').querySelector('em').textContent = 'CHẾ ĐỘ CHƠI';
  $('simBadge').textContent = 'Phật tử khác trong chùa là mô phỏng';
  document.title = 'Chùa Bình An · Lên chùa';

  let me = null, meP = null;
  const stats = Object.assign({ lay: 0, rounds: 0, medMin: 0 }, store.get('stats', {}));
  const saveStats = () => store.set('stats', stats);

  /* ---------------- modal dùng chung ---------------- */
  const veil = el('div', 'pl-veil hidden'); document.body.append(veil);
  function modal(title, build, opts = {}) {
    veil.innerHTML = ''; veil.classList.remove('hidden');
    const box = el('div', 'pl-modal' + (opts.wide ? ' wide' : '')); veil.append(box);
    const head = el('div', 'pl-mhead'); head.append(el('h2', '', title));
    if (!opts.noClose) { const x = el('button', 'pl-x', '✕'); x.setAttribute('aria-label', 'Đóng'); x.onclick = close; head.append(x); }
    box.append(head); build(box); return box;
  }
  function close() { veil.classList.add('hidden'); veil.innerHTML = ''; if (closeHook) { const f = closeHook; closeHook = null; f(); } }
  let closeHook = null;
  veil.addEventListener('click', (e) => { if (e.target === veil && !veil.querySelector('.nox')) close(); });

  /* ---------------- tạo nhân vật ---------------- */
  let saved = store.get('player', null);
  function characterForm(first) {
    const look = Object.assign({ g: 'nu', hair: 'bui', robe: 'lam' }, saved && saved.look);
    modal(first ? 'Tạo nhân vật lên chùa' : 'Đổi nhân vật', (box) => {
      box.classList.add('nox');
      const f = el('div', 'pl-form');
      const nameIn = el('input'); nameIn.id = 'plName'; nameIn.maxLength = 24; nameIn.placeholder = 'Pháp danh / tên hiển thị'; nameIn.value = (saved && saved.name) || '';
      const lab = (t) => el('label', 'pl-lab', t);
      const choice = (key, opts) => { const row = el('div', 'pl-choice'); opts.forEach(([v, t, sw]) => { const b = el('button', look[key] === v ? 'on' : '', t); if (sw) { const i = el('i'); i.style.background = sw; b.prepend(i); } b.onclick = () => { look[key] = v; [...row.children].forEach(x => x.classList.toggle('on', x === b)); }; row.append(b); }); return row; };
      f.append(lab('Pháp danh / tên hiển thị'), nameIn,
        lab('Giới tính'), choice('g', [['nam', 'Nam'], ['nu', 'Nữ']]),
        lab('Kiểu tóc'), choice('hair', [['bui', 'Búi'], ['dai', 'Dài'], ['ngan', 'Ngắn'], ['troc', 'Cạo']]),
        lab('Áo'), choice('robe', [['lam', 'Áo tràng lam', '#7f93b6'], ['nau', 'Áo nâu', '#9c6b45'], ['xam', 'Áo xám', '#8d8f98'], ['trang', 'Áo trắng', '#e6e6ee']]));
      const go = el('button', 'pl-btn gold', first ? '🙏 Vào chùa' : 'Lưu');
      const err = el('div', 'pl-err');
      go.onclick = () => {
        const name = nameIn.value.trim().replace(/\s+/g, ' ');
        if (name.length < 2) { err.textContent = 'Nhập pháp danh hoặc tên (ít nhất 2 ký tự).'; nameIn.focus(); return; }
        saved = { name, look }; store.set('player', saved);
        enter(name, look); close();
      };
      nameIn.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
      f.append(err, go, el('p', 'pl-note', 'Tiến trình tu tập (hạt, cấp, chuỗi ngày, ấn hành hương) được lưu trên trình duyệt này.'));
      box.append(f); setTimeout(() => nameIn.focus(), 50);
    }, { noClose: first });
  }
  function welcomeBack() {
    modal('A Di Đà Phật!', (box) => {
      box.classList.add('nox');
      const pr = G.prof({ id: ME, name: saved.name });
      box.append(el('p', 'pl-big', `Chào ${saved.name} trở lại chùa.`),
        el('p', 'pl-note', `Cấp ${G.levelOf(pr.beads) + 1} · ${C.levels[G.levelOf(pr.beads)].name} · ${fmt(pr.beads)} hạt · chuỗi ${pr.streak || 0} ngày`));
      const row = el('div', 'pl-row');
      const a = el('button', 'pl-btn gold', '🙏 Vào chùa'); a.onclick = () => { enter(saved.name, saved.look); close(); };
      const b = el('button', 'pl-btn', 'Đổi nhân vật'); b.onclick = () => characterForm(false);
      row.append(a, b); box.append(row);
    }, { noClose: true });
  }
  function enter(name, look) {
    A.ensure();
    const u = G.user({ id: ME, name });
    Object.assign(G.lookOf(u), look); G.prof(u).look = Object.assign({}, look);
    const p = G.join(u); me = u; meP = p; p.isMe = true;
    if (p.pin == null) p.pin = store.get('pin', 13);
    p.figKey = ''; G.relayout();
    if (p.fig) p.fig.classList.add('me');
    if (!A.state().playing) A.play(0);
    G.toast('🙏', ['Chào mừng ', { b: name }, ' lên chùa · chạm vào đệm để ngồi, chạm xuống sân để đi lại'], true);
    if (store.get('npc', true)) G.setBot(true, 'cham');
    renderCard(); setInterval(renderCard, 1500);
    setInterval(() => { if (me) { me.last = Date.now(); } }, 20000);   // người chơi không bị "rời chùa" khi ngồi yên
  }

  /* ---------------- thẻ người chơi (thay khung Cách tham gia) ---------------- */
  const card = el('aside', 'panel pl-card'); card.id = 'plCard'; stage.append(card);
  function renderCard() {
    if (!me) return;
    const pr = G.prof(me), lv = G.levelOf(pr.beads), L = C.levels, nxt = L[lv + 1];
    const pct = nxt ? Math.min(100, (pr.beads - L[lv].at) / (nxt.at - L[lv].at) * 100) : 100;
    card.innerHTML = '';
    card.append(el('h3', '', me.name),
      el('div', 'pl-lv', `Cấp ${lv + 1} · ${L[lv].name}`));
    const bar = el('div', 'pl-bar'); const fi = el('i'); fi.style.width = pct + '%'; bar.append(fi); card.append(bar);
    card.append(el('div', 'pl-next', nxt ? `Còn ${fmt(nxt.at - pr.beads)} hạt lên ${nxt.name}` : 'Đã viên mãn'));
    const rows = [['📿 Hạt', fmt(pr.beads)], ['✨ Công đức', fmt(pr.merit)], ['🙏 Số lạy', fmt(stats.lay)], ['📿 Chuỗi tròn', fmt(stats.rounds)],
      ['🧘 Phút thiền', fmt(stats.medMin)], ['🔥 Chuỗi ngày', (pr.streak || 1) + ' ngày'], ['📜 Ấn chùa', `${(pr.temples || []).length}/${CBA.temples.length}`], ['📖 Truyện', `${(pr.stories || []).length}/${CBA.stories.length}`]];
    const ul = el('ul', 'pl-stats'); rows.forEach(([k, v]) => { const li = el('li'); li.append(el('span', '', k), el('b', '', v)); ul.append(li); }); card.append(ul);
    if ((pr.titles || []).length) card.append(el('div', 'pc-title', '🏅 ' + pr.titles.slice(-2).join(' · ')));
  }

  /* ---------------- chạm đệm để ngồi, chạm sân để đi ---------------- */
  const toStage = (e) => { const r = stage.getBoundingClientRect(), k = r.width / 1080; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
  document.querySelectorAll('#mats .mat').forEach((m, i) => m.addEventListener('click', (e) => { e.stopPropagation(); sitAt(i); }));
  function sitAt(i) {
    if (!meP || !meP.fig) return;
    const other = [...G.present().values()].find(p => p !== meP && p.seat === i);
    meP.pin = i; meP.busy = false; store.set('pin', i);
    if (other) other.seat = -2;
    G.relayout();
    if (meP.seat === i && !meP.fig.classList.contains('walk')) G.goSeat(meP);
  }
  const floor = el('div'); floor.id = 'floorTap'; stage.append(floor);
  floor.addEventListener('click', (e) => {
    if (!meP || !meP.fig) return;
    const pt = toStage(e); pt.x = Math.max(40, Math.min(1040, pt.x)); pt.y = Math.max(1000, Math.min(1560, pt.y));
    meP.busy = true;
    G.walkPath(meP, [[pt.x, pt.y]], null);
    const dot = el('div', 'pl-dot'); dot.style.left = pt.x + 'px'; dot.style.top = pt.y + 'px'; stage.append(dot); setTimeout(() => dot.remove(), 900);
  });

  /* ---------------- thanh hành động ---------------- */
  const bar = el('nav', 'pl-actions'); bar.setAttribute('aria-label', 'Hành động');
  const act = (icon, label, fn, id) => { const b = el('button', 'pl-act'); if (id) b.id = id; b.append(el('span', 'ic', icon), el('span', 'lb', label)); b.onclick = () => { if (!me) return; fn(b); }; bar.append(b); return b; };
  document.body.append(bar);

  // Lạy Phật
  let lastLay = 0;
  act('🙏', 'Lạy Phật', () => {
    if (Date.now() - lastLay < 2300) return; lastLay = Date.now();
    if (meP.busy && !meP.fig.classList.contains('walk')) { /* đang đứng ngoài sân: vái */ }
    else if (!meP.fig.classList.contains('kneel') && !meP.busy) G.sitDown(meP);
    G.bow(meP); A.mo(0.8); stats.lay++; saveStats();
    G.addBeads(me, 3, false);
    if (stats.lay % 108 === 0) { A.bigBell(); G.card({ kicker: 'Lạy Phật', title: `Tròn ${fmt(stats.lay)} lạy`, text: 'Mỗi lạy là một lần buông xuống. Tùy hỷ công phu của bạn.', ms: 6000 }); }
    renderCard();
  });

  // Tràng hạt 108
  act('📿', 'Tràng hạt', openMala);
  function openMala() {
    let n = store.get('mala', 0);
    const box = modal('Lần tràng hạt', (b) => {
      b.classList.add('mala-box');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '-170 -170 340 360'); svg.classList.add('pl-mala');
      const beads = [];
      for (let i = 0; i < 108; i++) {
        const a = Math.PI / 2 + (i + 0.5) * Math.PI * 2 / 108;
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', (Math.cos(a) * 150).toFixed(1)); c.setAttribute('cy', (Math.sin(a) * 150).toFixed(1)); c.setAttribute('r', 6.2);
        svg.append(c); beads.push(c);
      }
      const guru = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); guru.setAttribute('cx', 0); guru.setAttribute('cy', 164); guru.setAttribute('r', 11); guru.setAttribute('class', 'guru'); svg.append(guru);
      const mid = el('div', 'pl-malamid');
      const cnt = el('div', 'pl-cnt'), sub = el('div', 'pl-sub'), say = el('div', 'pl-say', 'Nam Mô A Di Đà Phật');
      mid.append(cnt, sub, say);
      const wrap = el('div', 'pl-malawrap'); wrap.append(svg, mid); b.append(wrap);
      b.append(el('p', 'pl-note', 'Chạm vào chuỗi, vuốt xuống, hoặc nhấn Space / ↓ để lần một hạt. Mỗi hạt +1, tròn chuỗi +54.'));
      const paint = () => { const k = n % 108; beads.forEach((c, i) => c.classList.toggle('on', i < k)); cnt.textContent = `${k} / 108`; sub.textContent = `Chuỗi thứ ${Math.floor(n / 108) + 1}`; };
      let lastT = 0;
      const tick = () => {
        if (Date.now() - lastT < 160) return; lastT = Date.now();
        n++; store.set('mala', n); A.mo(0.7); G.addBeads(me, 1, false);
        if (n % 108 === 0) { stats.rounds++; saveStats(); A.smallBell(); G.addBeads(me, 54, false); G.bow(meP); G.card({ kicker: 'Tràng hạt', title: `Viên mãn chuỗi thứ ${stats.rounds}`, text: '108 câu Phật hiệu đã tròn. Nguyện cho tất cả chúng sanh được an lạc.', ms: 5000 }); }
        paint(); const c = beads[(n - 1) % 108]; c.classList.remove('pop'); void c.getBBox(); c.classList.add('pop');
      };
      paint();
      wrap.addEventListener('pointerdown', tick);
      let y0 = null; wrap.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
      wrap.addEventListener('touchmove', (e) => { if (y0 != null && e.touches[0].clientY - y0 > 40) { y0 = e.touches[0].clientY; tick(); } }, { passive: true });
      const key = (e) => { if (e.code === 'Space' || e.key === 'ArrowDown') { e.preventDefault(); tick(); } if (e.key === 'Escape') close(); };
      addEventListener('keydown', key); closeHook = () => { removeEventListener('keydown', key); renderCard(); };
    });
    return box;
  }

  // Tụng kinh
  let moBtn = null;
  act('🪵', 'Tụng kinh', () => {
    modal('Chọn bài tụng', (b) => {
      const list = el('div', 'pl-list');
      const tracks = CBA.playlist.map((t, i) => ({ t, i })).filter(x => x.t.text || x.t.type === 'file');
      tracks.forEach(({ t, i }) => { const r = el('button', 'pl-item'); r.append(el('b', '', t.title), el('small', '', t.type === 'file' ? 'Bài thu âm' : 'Gõ mõ theo nhịp · chữ kinh chạy trên màn hình')); r.onclick = () => { A.ensure(); A.play(i); close(); showMo(); }; list.append(r); });
      b.append(list, el('p', 'pl-note', 'Tụng theo chữ trên màn hình. Bấm nút "Gõ mõ" theo nhịp: mỗi tiếng +1 hạt. Tụng trọn bài được thưởng thêm.'));
    });
  });
  function showMo() {
    if (moBtn) return;
    moBtn = el('button', 'pl-mo', '🪵 Gõ mõ'); document.body.append(moBtn);
    const stop = el('button', 'pl-mostop', 'Dừng tụng'); document.body.append(stop);
    let t0 = 0;
    moBtn.onclick = () => { if (Date.now() - t0 < 250) return; t0 = Date.now(); A.mo(1); G.addBeads(me, 1, false); moBtn.classList.remove('hit'); void moBtn.offsetWidth; moBtn.classList.add('hit'); };
    stop.onclick = () => { A.play(0); moBtn.remove(); stop.remove(); moBtn = null; };
  }

  // Thiền
  act('🧘', 'Thiền', () => {
    modal('Thiền định', (b) => {
      b.append(el('p', 'pl-note', 'Ngồi thẳng lưng, thả lỏng vai, theo dõi hơi thở. Mỗi phút ngồi +9 hạt.'));
      const row = el('div', 'pl-row');
      [[5, '5 phút'], [10, '10 phút'], [20, '20 phút'], [30, '30 phút'], [0, 'Tự do']].forEach(([m, t]) => { const x = el('button', 'pl-btn', t); x.onclick = () => { close(); meditate(m); }; row.append(x); });
      b.append(row);
    });
  });
  function meditate(min) {
    if (meP.busy) { meP.busy = false; G.relayout(); G.goSeat(meP); } else G.sitDown(meP);
    const ov = el('div', 'pl-med'); const circ = el('div', 'pl-breath'), lbl = el('div', 'pl-blabel', 'Hít vào…'), tm = el('div', 'pl-time', '00:00');
    const stop = el('button', 'pl-btn', 'Xả thiền'); ov.append(circ, lbl, tm, stop); document.body.append(ov);
    A.smallBell();
    const t0 = Date.now(); let paid = 0;
    const iv = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000), ph = s % 10;
      lbl.textContent = ph < 4 ? 'Hít vào…' : 'Thở ra…'; circ.classList.toggle('in', ph < 4);
      tm.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` + (min ? ` / ${String(min).padStart(2, '0')}:00` : '');
      const full = Math.floor(s / 60); if (full > paid) { paid = full; stats.medMin++; saveStats(); G.addBeads(me, 9, false); }
      if (min && s >= min * 60) end(true);
    }, 500);
    function end(done) { clearInterval(iv); ov.remove(); A.smallBell(); if (paid) G.card({ kicker: 'Thiền định', title: done ? `Viên mãn ${min} phút thiền` : `Đã ngồi ${paid} phút`, text: `+${paid * 9} hạt. Mang sự bình an này theo suốt ngày hôm nay.`, ms: 5000 }); renderCard(); }
    stop.onclick = () => end(false);
  }

  // Dâng lễ
  const OFFER = [
    { id: 'huong', icon: '🕯️', name: 'Thắp hương', merit: 10, cd: 60 },
    { id: 'chuong', icon: '🔔', name: 'Thắp nến · thỉnh chuông', merit: 20, cd: 180 },
    { id: 'nguqua', icon: '🍑', name: 'Dâng mâm ngũ quả', merit: 30, cd: 300 },
    { id: 'hoasen', icon: '🌸', name: 'Dâng hoa sen vàng', merit: 50, cd: 600 }
  ];
  act('🪔', 'Dâng lễ', () => {
    const cds = store.get('cd', {});
    modal('Dâng lễ', (b) => {
      const list = el('div', 'pl-list');
      OFFER.forEach(o => {
        const left = Math.max(0, Math.ceil(((cds[o.id] || 0) - Date.now()) / 1000));
        const r = el('button', 'pl-item' + (left ? ' wait' : ''));
        r.append(el('b', '', `${o.icon} ${o.name}`), el('small', '', left ? `Đợi ${Math.ceil(left / 60)} phút nữa` : `+${o.merit} công đức`));
        r.disabled = !!left;
        r.onclick = () => { cds[o.id] = Date.now() + o.cd * 1000; store.set('cd', cds); close(); G.giftEffect(o.id, me, 'dâng bằng tâm thành'); G.addMerit(me, o.merit); renderCard(); };
        list.append(r);
      });
      b.append(list, el('p', 'pl-note', 'Lễ vật trong game là miễn phí — quý ở tấm lòng. Mỗi lễ vật có thời gian chờ để giữ không khí trang nghiêm.'));
    });
  });

  // Kinh hành
  act('🚶', 'Kinh hành', () => { meP.pin = meP.pin ?? 13; meP.busy = false; G.kinhHanh(meP); G.say(meP, '🚶 Kinh hành'); G.addBeads(me, 9, false); });

  // Đèn nguyện
  act('🏮', 'Đèn nguyện', () => {
    modal('Thả đèn nguyện', (b) => {
      const ta = el('textarea'); ta.id = 'plWish'; ta.rows = 3; ta.maxLength = C.maxWishLength; ta.placeholder = 'VD: Nguyện cho mẹ con mau khỏe, gia đình bình an';
      const go = el('button', 'pl-btn gold', '🏮 Thả đèn');
      go.onclick = () => { const t = ta.value.trim(); if (t.length < 4) { ta.focus(); return; } close(); G.addWish(me, meP, t); G.say(meP, '🏮 ' + t, true); G.addMerit(me, 5); renderCard(); };
      b.append(ta, go, el('p', 'pl-note', 'Đèn nguyện hiện ở khung bên phải. Người khác có thể "tùy hỷ" với lời nguyện của bạn.'));
      const tu = el('button', 'pl-btn', '🤲 Tùy hỷ với lời nguyện gần nhất của người khác');
      tu.onclick = () => { close(); CBA.game.event({ type: 'chat', id: ME, name: me.name, text: 'Tùy hỷ' }); };
      b.append(tu);
    });
  });

  // Nghe truyện
  act('📖', 'Nghe truyện', () => {
    modal('Nghe Sư Ông kể chuyện', (b) => {
      const heard = G.prof(me).stories || [];
      CBA.storySeries.forEach(se => {
        const st = CBA.stories.filter(x => x.series === se.id); if (!st.length) return;
        const det = el('details'); const sm = el('summary', '', `${se.icon} ${se.name} · ${st.filter(x => heard.includes(x.id)).length}/${st.length}`); det.append(sm);
        st.forEach(x => { const r = el('button', 'pl-item sm'); r.append(el('b', '', (heard.includes(x.id) ? '✓ ' : '') + x.title)); r.onclick = () => { close(); G.stopStory(); G.startStory(x.id); }; det.append(r); });
        b.append(det);
      });
      b.append(el('p', 'pl-note', 'Cuối truyện có câu đố: bấm A, B hoặc C ngay trên màn hình.'));
    }, { wide: true });
  });
  // bấm đáp án câu đố
  $('stText').addEventListener('click', (e) => {
    const row = e.target.closest('.qo'); if (!row || !me || !G.quizActive()) return;
    if (G.answerQuiz(me, 'abc'[+row.dataset.i])) { row.classList.add('mine'); G.say(meP, '❓ ' + 'ABC'[+row.dataset.i]); }
  });

  // Bản đồ
  const mapA = el('a'); mapA.href = 'map.html'; mapA.target = '_blank'; mapA.rel = 'noopener'; mapA.hidden = true; document.body.append(mapA);
  act('🗺', 'Bản đồ', () => mapA.click());

  // Cài đặt
  act('⚙️', 'Cài đặt', () => {
    modal('Cài đặt', (b) => {
      const st = A.state();
      const tg = (label, on, fn) => { const r = el('label', 'pl-tg'); const c = el('input'); c.type = 'checkbox'; c.checked = on; c.onchange = () => fn(c.checked); r.append(c, document.createTextNode(' ' + label)); return r; };
      b.append(tg('Nhạc nền / tụng kinh', st.musicOn, v => A.set({ musicOn: v })), tg('Tiếng mõ, chuông', st.sfxOn, v => A.set({ sfxOn: v })),
        tg('Giọng đọc truyện', st.storyTtsOn, v => A.set({ storyTtsOn: v })),
        tg('Phật tử khác trong chùa (mô phỏng)', store.get('npc', true), v => { store.set('npc', v); G.setBot(v, 'cham'); }));
      const row = el('div', 'pl-row');
      const ch = el('button', 'pl-btn', 'Đổi nhân vật'); ch.onclick = () => characterForm(false);
      const tp = el('select'); tp.id = 'plTemple'; CBA.temples.forEach(t => { const o = el('option', '', t.name + (t.region && CBA.regions[t.region] ? ' · ' + CBA.regions[t.region] : '')); o.value = t.id; tp.append(o); }); tp.value = G.curTemple().id;
      const go = el('button', 'pl-btn gold', 'Hành hương'); go.onclick = () => { close(); G.setTemple(tp.value); };
      row.append(ch); b.append(row, el('label', 'pl-lab', 'Hành hương đến chùa'), tp, go);
    });
  });

  // phím tắt
  addEventListener('keydown', (e) => {
    if (!me || !veil.classList.contains('hidden') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'b' || e.key === 'B') bar.children[0].click();
    if (e.key === 'r' || e.key === 'R') openMala();
  });

  /* ---------------- bắt đầu ---------------- */
  if (saved && saved.name) welcomeBack(); else characterForm(true);
})();
