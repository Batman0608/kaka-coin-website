/* =========================================================================
 *  NHIỆM VỤ — bảng dưới Bảng Công Đức
 *  · HẰNG NGÀY: 8 nhiệm vụ cố định, mỗi ngày xoay vòng thứ tự; thưởng tăng dần theo thứ tự (10 → 130 hạt)
 *    xong cả 8 → Rương công đức (chuỗi ngày liên tiếp được cộng thêm tới +50%)
 *  · HẰNG TUẦN: viếng đủ 3 miền, nghe đủ 5 truyện, giữ chuỗi 7 ngày, mời 1 bạn → mỗi việc 300 hạt + 10 🪷, đủ 4 → Rương tuần
 *  · CHUỖI NGÀY: hiện tiến độ tới các mốc 7 / 14 / 21 / 30 ngày và phần thưởng của từng mốc
 *  · Các nơi trong game báo việc đã làm: window.dispatchEvent(new CustomEvent('cba-ev', { detail: 'bow' | { k, id } }))
 * ========================================================================= */
const DAILY = [
  { id: 'visit', ev: 'visitnew', n: 1, ic: '🗺', name: 'Viếng 1 chùa mới', hint: 'Mở bản đồ, chọn một ngôi chùa hôm nay chưa đến', go: 'visit' },
  { id: 'bow', ev: 'bowhall', n: 3, ic: '🙏', name: 'Lạy 3 lạy ở chánh điện', hint: 'Vào chánh điện, ngồi đệm rồi bấm "Lạy Phật"', go: 'bow' },
  { id: 'lantern', ev: 'lantern', n: 1, ic: '🏮', name: 'Thả 1 đèn nguyện kèm lời nguyện', hint: 'Bấm "Đèn nguyện", viết lời nguyện rồi thả', go: 'lantern' },
  { id: 'chant', ev: 'chantmanual', n: 1, ic: '🪵', name: 'Tụng 1 bài kinh tự tay gõ mõ', hint: 'Chọn bài kinh, tự gõ mõ theo từng câu tới hết bài', go: 'chant' },
  { id: 'story', ev: 'story', n: 1, ic: '📜', name: 'Nghe 1 sự tích', hint: 'Đến gần sư trụ trì bấm "Nghe sự tích", hoặc mở "Truyện Phật"', go: 'story' },
  { id: 'greet', ev: 'greet', n: 3, ic: '🙏', name: 'Chào 3 Phật tử trong chùa', hint: 'Đến gần Phật tử, bấm "🙏 Chào"', go: 'greet' },
  { id: 'offer', ev: 'offer', n: 1, ic: '🪔', name: 'Dâng 1 lễ vật', hint: 'Bấm "Dâng lễ", chọn một lễ vật', go: 'offer' },
  { id: 'med', ev: 'med', n: 5, ic: '🧘', name: 'Thiền 5 phút', hint: 'Ngồi thiền đủ 5 phút', go: 'med5' }
];
const WEEKLY = [
  { id: 'mien', n: 3, ic: '🧭', name: 'Viếng đủ 3 miền Bắc – Trung – Nam', hint: 'Mở bản đồ, chọn chùa ở miền còn thiếu', go: 'visit' },
  { id: 'story5', n: 5, ic: '📖', name: 'Nghe đủ 5 truyện', hint: 'Mở "Truyện Phật" hoặc nghe sự tích ở các chùa', go: 'story' },
  { id: 'streak', n: 7, ic: '🔥', name: 'Giữ chuỗi 7 ngày lên chùa', hint: 'Mỗi ngày vào chùa một lần, không bỏ ngày nào', go: null },
  { id: 'invite', n: 1, ic: '💌', name: 'Mời 1 bạn vào chơi', hint: 'Gửi đường mời có mã của bạn · bạn mới vào chơi là tính', go: 'invite' }
];
// thưởng ngày theo thứ tự — tổng 430 hạt + 188 công đức, chưa kể rương
const REWARD = [[10, 5], [15, 8], [25, 12], [35, 16], [50, 22], [70, 30], [95, 40], [130, 55]];
const CHEST = { beads: 200, merit: 80, lotus: 5 };
const WREW = { beads: 300, merit: 100, lotus: 10 }, WCHEST = { beads: 600, merit: 200, lotus: 30 };
const MILES = [[7, '👘 Áo tràng hồng sen'], [14, '📿 Tràng hạt bồ đề'], [21, '🌼 Hạt giống mai vàng'], [30, '📿 Tràng hạt trầm hương']];

export function initMissions(X) {
  const { P, save, el, toast, banner, A, addBeads, addMerit, addLotus, modal, closeModal, GO, TEMPLES, getTemple, invites } = X;
  const vn = () => new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000);
  const dayKey = (d = vn()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const yKey = () => dayKey(new Date(vn().getTime() - 86400000));
  const weekKey = () => { const d = vn(), n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); return 'W' + Math.floor((n + 3) / 7); };
  const Q = P.mq = Object.assign({ day: '', ids: [], p: {}, c: {}, chest: '', streak: 0, lastAll: '', min: false, vt: [], seen: [], w: null }, P.mq || {});
  const regionOf = (id) => ((TEMPLES || []).find(t => t.id === id) || {}).region;

  function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }
  function roll() {
    const k = dayKey(), wk = weekKey();
    if (!Q.w || Q.w.wk !== wk) { Q.w = { wk, mien: [], st: [], c: {}, chest: '' }; const r0 = regionOf((getTemple() || {}).id); if (r0 && r0 !== 'online') Q.w.mien.push(r0); save(); }
    if (Q.day === k && Q.ids.length === DAILY.length && Q.ids.every(id => DAILY.some(m => m.id === id))) return;
    const r = rng(hash(k + ':' + (P.uid || P.name || 'x'))), ids = DAILY.map(m => m.id).sort(() => r() - 0.5);   // xoay vòng thứ tự mỗi ngày
    Object.assign(Q, { day: k, ids, p: {}, c: {}, vt: [(getTemple() || {}).id].filter(Boolean), seen: [] }); save();
  }
  const list = () => Q.ids.map((id, i) => ({ ...DAILY.find(m => m.id === id), i, r: REWARD[i] })).filter(m => m.id);
  const prog = (m) => Math.min(m.n, Q.p[m.id] || 0), done = (m) => prog(m) >= m.n, got = (m) => !!Q.c[m.id];
  const allClaimed = () => list().every(got);
  const chestBonus = () => { const s = Q.lastAll === yKey() || Q.lastAll === Q.day ? (Q.lastAll === Q.day ? Q.streak : Q.streak + 1) : 1; return { s, k: 1 + 0.1 * Math.min(s - 1, 5) }; };
  // tuần
  const wprog = (m) => { const w = Q.w || {}; if (m.id === 'mien') return (w.mien || []).length; if (m.id === 'story5') return (w.st || []).length; if (m.id === 'streak') return Math.min(7, P.streak || 0); if (m.id === 'invite') return invites ? invites() : 0; return 0; };
  const wdone = (m) => wprog(m) >= m.n, wgot = (m) => !!(Q.w && Q.w.c[m.id]);

  function ev(k, n = 1, d = {}) {
    roll(); let hit = false;
    // nhiệm vụ tuần
    if (k === 'visit' && d.id) { const rg = regionOf(d.id); if (rg && rg !== 'online' && !Q.w.mien.includes(rg)) { Q.w.mien.push(rg); hit = true; if (Q.w.mien.length === 3) toast('🧭 Đã viếng đủ 3 miền tuần này · vào bảng nhiệm vụ nhận thưởng'); } }
    if (k === 'story' && d.id && !Q.w.st.includes(d.id)) { Q.w.st.push(d.id); hit = true; }
    if (k === 'visit' && d.id) { if (Q.vt.includes(d.id)) { if (hit) { save(); render(); } return; } Q.vt.push(d.id); k = 'visitnew'; }
    if (k === 'greet') { if (!d.id || Q.seen.includes(d.id)) return; Q.seen.push(d.id); }
    list().forEach(m => { if (m.ev !== k || got(m) || done(m)) return; Q.p[m.id] = (Q.p[m.id] || 0) + n; hit = true;
      if (done(m)) { A.smallBell && A.smallBell(); toast(`✅ Xong nhiệm vụ: ${m.name} · bấm ở bảng nhiệm vụ để nhận +${m.r[0]} hạt`); } });
    if (hit) { save(); render(); }
  }
  window.addEventListener('cba-ev', (e) => { const d = e.detail; if (typeof d === 'string') ev(d); else if (d && d.k) ev(d.k, d.n || 1, d); });

  function claim(m) {
    if (got(m) || !done(m)) return; Q.c[m.id] = 1;
    addBeads(m.r[0]); const g = addMerit(m.r[1]); save();
    A.khanh && A.khanh(); toast(`🎁 Nhận thưởng: +${m.r[0]} hạt, +${g || m.r[1]} công đức`);
    const nx = list().find(x => !got(x)); if (nx) setTimeout(() => toast(`➡️ Nhiệm vụ tiếp: ${nx.ic} ${nx.name} · thưởng +${nx.r[0]} hạt`), 1600);
    else setTimeout(() => { banner('🎁 Hoàn thành nhiệm vụ hôm nay', 'Rương công đức đã mở khóa', 'Bấm "Mở rương" ở bảng nhiệm vụ'); A.bigBell && A.bigBell(); }, 900);
    render();
  }
  function claimW(m) {
    if (wgot(m) || !wdone(m)) return; Q.w.c[m.id] = 1;
    addBeads(WREW.beads); addMerit(WREW.merit); if (addLotus) addLotus(WREW.lotus); save(); A.khanh && A.khanh();
    banner('🏅 Nhiệm vụ tuần', m.name, `+${WREW.beads} hạt · +${WREW.merit} công đức · +${WREW.lotus} 🪷`);
    if (WEEKLY.every(wgot)) setTimeout(() => { banner('🎁 Rương tuần đã mở khóa', 'Hoàn thành cả 4 nhiệm vụ tuần', 'Bấm "Mở rương tuần" trong bảng nhiệm vụ'); A.bigBell && A.bigBell(); }, 2500);
    render();
  }
  function openChest() {
    if (!allClaimed() || Q.chest === Q.day) return;
    const { s, k } = chestBonus(), b = Math.round(CHEST.beads * k), mr = Math.round(CHEST.merit * k);
    Q.chest = Q.day; Q.streak = s; Q.lastAll = Q.day;
    addBeads(b); addMerit(mr); if (addLotus) addLotus(CHEST.lotus); save();
    banner('🎁 Rương công đức', `+${b} hạt · +${mr} công đức · +${CHEST.lotus} 🪷`, s > 1 ? `🔥 ${s} ngày liên tiếp · thưởng thêm ${Math.round((k - 1) * 100)}%` : 'Mai quay lại để giữ chuỗi ngày, rương sẽ lớn hơn');
    A.bigBell && A.bigBell(); render();
  }
  function openWChest() {
    if (!WEEKLY.every(wgot) || Q.w.chest) return; Q.w.chest = 1;
    addBeads(WCHEST.beads); addMerit(WCHEST.merit); if (addLotus) addLotus(WCHEST.lotus); save();
    banner('🎁 Rương tuần', `+${WCHEST.beads} hạt · +${WCHEST.merit} công đức · +${WCHEST.lotus} 🪷`, 'Tuần sau có bộ nhiệm vụ mới'); A.bigBell && A.bigBell(); render();
  }
  function go(m) { const f = m.go && GO[m.go]; toast(`${m.ic} ${m.hint}`); if (f) try { f(m); } catch (e) { /* bỏ qua */ } }

  /* ---- mốc chuỗi ngày ---- */
  function nextMile() { const s = P.streak || 0; return MILES.find(([d]) => d > s) || null; }
  function streakEl(big) {
    const s = P.streak || 0, nx = nextMile(), prev = MILES.filter(([d]) => d <= s).pop(), from = prev ? prev[0] : 0;
    const w = el('div', 'mqstreak' + (big ? ' big' : ''));
    w.append(el('b', '', nx ? `🔥 Chuỗi ${s} ngày · còn ${nx[0] - s} ngày tới ${nx[1]}` : `🔥 Chuỗi ${s} ngày · đã đạt mọi mốc`));
    const bar = el('em', 'mqbar'), u = el('u'); u.style.width = nx ? Math.round((s - from) / (nx[0] - from) * 100) + '%' : '100%'; bar.append(u); w.append(bar);
    if (big) { const ul = el('div', 'mqmiles'); MILES.forEach(([d, t]) => { const r = el('div', 'mqmile' + (s >= d ? ' ok' : '')); r.append(el('i', '', s >= d ? '✓' : d), el('span', '', `${d} ngày · ${t}`)); ul.append(r); });
      const r = el('div', 'mqmile' + ((P.days || 0) >= 30 ? ' ok' : '')); r.append(el('i', '', '🧘'), el('span', '', 'Đệm hàng đầu chánh điện · bậc Cư sĩ hộ trì (30 ngày lên chùa, cấp 5, 3 ấn, 10 khóa lễ)')); ul.append(r); w.append(ul); }
    return w;
  }

  /* ---------------- bảng (dưới Bảng Công Đức) ---------------- */
  const box = el('div', 'mqp'); box.id = 'mqPanel';
  { const rk = document.getElementById('rank'); if (rk && rk.parentNode) rk.after(box); else document.body.append(box); }
  function rowEl(m, big, weekly) {
    const d = weekly ? wdone(m) : done(m), p = weekly ? Math.min(m.n, wprog(m)) : prog(m), rw = weekly ? WREW.beads : m.r[0];
    const r = el('button', 'mqr' + (d ? ' done' : '') + (big ? ' big' : ''));
    r.append(el('i', 'mqi', m.ic));
    const tx = el('span', 'mqt'); tx.append(el('b', '', m.name));
    const bar = el('em', 'mqbar'); const fill = el('u'); fill.style.width = Math.round(p / m.n * 100) + '%'; bar.append(fill);
    tx.append(bar, el('small', '', d ? `🎁 Bấm nhận +${rw} hạt${weekly ? ` · +${WREW.lotus} 🪷` : ''}` : `${p}/${m.n} · thưởng +${rw} hạt${weekly ? ` · +${WREW.lotus} 🪷` : ''}`));
    r.append(tx); r.title = d ? 'Nhận thưởng' : m.hint;
    r.onclick = (e) => { e.stopPropagation(); d ? (weekly ? claimW(m) : claim(m)) : go(m); };
    return r;
  }
  function render() {
    roll(); box.innerHTML = '';
    const L = list(), n = L.filter(got).length, wn = WEEKLY.filter(wgot).length;
    const head = el('button', 'mqh'); head.append(el('b', '', `📋 Nhiệm vụ ${n}/${L.length}`), el('i', '', Q.min ? '▸' : '▾'));
    const ready = L.filter(m => done(m) && !got(m)).length + WEEKLY.filter(m => wdone(m) && !wgot(m)).length; if (ready) head.append(el('em', 'mqdot', String(ready)));
    head.onclick = () => { Q.min = !Q.min; save(); render(); };
    box.append(head); box.classList.toggle('min', !!Q.min);
    if (Q.min) return;
    if (allClaimed()) {
      if (Q.chest !== Q.day) { const c = el('button', 'mqr chest'); c.append(el('i', 'mqi', '🎁'), el('span', 'mqt', '')); c.lastChild.append(el('b', '', 'Mở Rương công đức'), el('small', '', `+${Math.round(CHEST.beads * chestBonus().k)} hạt · +${CHEST.lotus} 🪷`)); c.onclick = openChest; box.append(c); }
      else box.append(el('p', 'mqok', `🌸 Đã xong hôm nay · 🔥 rương ${Q.streak} ngày liên tiếp`));
    } else {
      const todo = L.filter(m => !got(m)).sort((a, b) => (done(b) - done(a)) || a.i - b.i);
      todo.slice(0, 2).forEach((m, k) => box.append(rowEl(m, k === 0)));
    }
    const wr = WEEKLY.find(m => wdone(m) && !wgot(m)); if (wr) box.append(rowEl(wr, false, true));
    const ft = el('div', 'mqft'); ft.append(el('span', '', `🗓 Tuần ${wn}/4 · 🔥 ${P.streak || 0} ngày`));
    const all = el('button', 'mqall', 'Xem tất cả ›'); all.onclick = () => openAll(); ft.append(all); box.append(ft);
  }
  function openAll(tab = 'day') {
    modal('📋 Nhiệm vụ', (b) => {
      const tabs = el('div', 'tutabs'), body = el('div', ''); b.append(tabs, body);
      const show = (t) => { [...tabs.children].forEach(x => x.classList.toggle('on', x.dataset.k === t)); body.innerHTML = ''; (t === 'day' ? dayView : t === 'week' ? weekView : streakView)(body); };
      [['day', '📅 Hôm nay'], ['week', '🗓 Tuần này'], ['streak', '🔥 Chuỗi ngày']].forEach(([k, t]) => { const x = el('button', '', t); x.dataset.k = k; x.onclick = () => show(k); tabs.append(x); });
      show(tab);
    });
  }
  const wrapClose = (r) => { const o = r.onclick; if (o) r.onclick = (e) => { closeModal(); o(e); }; return r; };
  function dayView(b) {
    const { s, k } = chestBonus();
    b.append(el('p', 'note', 'Mỗi ngày 8 nhiệm vụ, thứ tự xoay vòng · thưởng tăng dần · xong cả 8 được mở Rương công đức. Hoàn thành liên tiếp nhiều ngày, rương càng lớn (tối đa +50%).'));
    const wrap = el('div', 'mqlist');
    list().forEach(m => { const r = rowEl(m, false); r.classList.toggle('got', got(m)); r.prepend(el('i', 'mqn', got(m) ? '✓' : String(m.i + 1)));
      if (got(m)) { r.onclick = null; r.querySelector('small').textContent = `Đã nhận +${m.r[0]} hạt, +${m.r[1]} công đức`; } else if (!done(m)) wrapClose(r); wrap.append(r); });
    b.append(wrap);
    const c = el('div', 'mqchest' + (allClaimed() ? ' open' : ''));
    c.append(el('b', '', `🎁 Rương công đức: +${Math.round(CHEST.beads * k)} hạt · +${Math.round(CHEST.merit * k)} công đức · +${CHEST.lotus} 🪷`),
      el('small', '', Q.chest === Q.day ? `Đã mở hôm nay · rương ${Q.streak} ngày liên tiếp` : `Hôm nay xong sẽ thành ${s} ngày liên tiếp${s > 1 ? ` (thưởng thêm ${Math.round((k - 1) * 100)}%)` : ''}`));
    if (allClaimed() && Q.chest !== Q.day) { const ob = el('button', 'btn gold', 'Mở rương'); ob.onclick = () => { closeModal(); openChest(); }; c.append(ob); }
    b.append(c);
  }
  function weekView(b) {
    b.append(el('p', 'note', `Nhiệm vụ tuần (đổi mới mỗi thứ Hai) · mỗi việc +${WREW.beads} hạt, +${WREW.merit} công đức, +${WREW.lotus} 🪷 · xong cả 4 mở Rương tuần.`));
    const wrap = el('div', 'mqlist');
    WEEKLY.forEach(m => { const r = rowEl(m, false, true); r.classList.toggle('got', wgot(m)); if (wgot(m)) { r.onclick = null; r.querySelector('small').textContent = 'Đã nhận thưởng'; } else if (!wdone(m)) wrapClose(r);
      if (m.id === 'mien') { const lbl = { bac: 'Bắc', trung: 'Trung', nam: 'Nam' }; r.querySelector('small').textContent += ' · ' + ['bac', 'trung', 'nam'].map(x => (Q.w.mien.includes(x) ? '✓ ' : '○ ') + lbl[x]).join('  '); }
      wrap.append(r); });
    b.append(wrap);
    const c = el('div', 'mqchest' + (WEEKLY.every(wgot) ? ' open' : '')); c.append(el('b', '', `🎁 Rương tuần: +${WCHEST.beads} hạt · +${WCHEST.merit} công đức · +${WCHEST.lotus} 🪷`), el('small', '', Q.w.chest ? 'Đã mở tuần này' : 'Xong cả 4 nhiệm vụ tuần để mở'));
    if (WEEKLY.every(wgot) && !Q.w.chest) { const ob = el('button', 'btn gold', 'Mở rương tuần'); ob.onclick = () => { closeModal(); openWChest(); }; c.append(ob); }
    b.append(c);
  }
  function streakView(b) {
    b.append(el('p', 'note', 'Mỗi ngày vào chùa một lần để giữ chuỗi. Lỡ một ngày: hôm sau lần tròn 108 hạt tràng hạt để sám hối, giữ lại chuỗi. Đạt mốc nào sẽ tự mở khóa phần thưởng (xem trong Tu tập → Sưu tập).'));
    b.append(streakEl(true));
  }
  let t0 = 0, last = '';
  function step() { const n = performance.now(); if (n - t0 < 5000) return; t0 = n; const k = dayKey() + weekKey(); if (k !== last) { last = k; render(); }
    const rg = regionOf((getTemple() || {}).id); if (Q.w && rg && rg !== 'online' && !Q.w.mien.includes(rg)) { Q.w.mien.push(rg); save(); render(); } }   // chùa đang đứng cũng tính miền
  render();
  return { ev, step, render, openAll };
}
