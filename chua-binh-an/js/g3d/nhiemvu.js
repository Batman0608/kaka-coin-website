/* =========================================================================
 *  NHIỆM VỤ HẰNG NGÀY — bảng bên phải màn hình
 *  · Mỗi ngày 8 nhiệm vụ, xếp từ dễ → khó (4 bậc), chọn ngẫu nhiên theo ngày + người chơi
 *  · Thưởng tăng dần theo thứ tự: 10 → 130 hạt, kèm công đức
 *  · Xong cả 8 → mở Rương công đức (hạt + công đức + hoa sen), chuỗi ngày liên tiếp được cộng thêm
 *  · Bấm nhiệm vụ: đi tới chỗ làm (hoặc mở đúng bảng); xong thì bấm để nhận thưởng
 *  · Các nơi trong game báo việc đã làm bằng: window.dispatchEvent(new CustomEvent('cba-ev', { detail: 'bow' }))
 * ========================================================================= */
const POOL = [
  // bậc 1 — làm ngay trong 1 phút
  { id: 'bow3', t: 1, ev: 'bow', n: 3, ic: '🙏', name: 'Lạy Phật 3 lạy', hint: 'Vào chánh điện, ngồi đệm rồi bấm "Lạy Phật"', go: 'bow' },
  { id: 'bell', t: 1, ev: 'bell', n: 1, ic: '🔔', name: 'Thỉnh một hồi chuông', hint: 'Bấm "Thỉnh chuông" ở thanh hành động', go: 'bell' },
  { id: 'incense', t: 1, ev: 'incense', n: 1, ic: '🕯️', name: 'Thắp một nén hương', hint: 'Đến lư hương ngoài sân, bấm "Thắp hương"', go: 'incense' },
  { id: 'chat', t: 1, ev: 'chat', n: 1, ic: '💬', name: 'Gửi lời chào đại chúng', hint: 'Bấm nút 💬 và gửi một lời chào', go: 'chat' },
  // bậc 2 — vài phút tu tập
  { id: 'mala', t: 2, ev: 'mala', n: 1, ic: '📿', name: 'Lần tròn 1 chuỗi tràng hạt', hint: 'Lần đủ 108 hạt', go: 'mala' },
  { id: 'chant', t: 2, ev: 'chant', n: 1, ic: '🪵', name: 'Tụng một bài kinh', hint: 'Chọn một bài kinh và tụng theo', go: 'chant' },
  { id: 'med3', t: 2, ev: 'med', n: 3, ic: '🧘', name: 'Thiền định 3 phút', hint: 'Ngồi thiền đủ 3 phút', go: 'med' },
  { id: 'sweep3', t: 2, ev: 'sweep', n: 3, ic: '🧹', name: 'Quét 3 đống lá', hint: 'Đến gần đống lá trong sân, bấm "Quét sân"', go: 'sweep' },
  // bậc 3 — khám phá
  { id: 'quiz2', t: 3, ev: 'quiz', n: 2, ic: '❓', name: 'Trả lời đúng 2 câu đố', hint: 'Đến gần tượng Phật trong khuôn viên để nhận câu hỏi', go: 'quiz' },
  { id: 'poi', t: 3, ev: 'poi', n: 1, ic: '🧭', name: 'Khám phá 1 địa danh mới', hint: 'Đi tới chấm vàng trên bản đồ nhỏ', go: 'poi' },
  { id: 'offer', t: 3, ev: 'offer', n: 1, ic: '🪔', name: 'Dâng lễ vật lên Phật', hint: 'Bấm "Dâng lễ", chọn một lễ vật', go: 'offer' },
  { id: 'lantern', t: 3, ev: 'lantern', n: 1, ic: '🏮', name: 'Thả một ngọn đèn nguyện', hint: 'Bấm "Đèn nguyện", viết lời nguyện', go: 'lantern' },
  // bậc 4 — thử thách
  { id: 'bow9', t: 4, ev: 'bow', n: 9, ic: '🙏', name: 'Lạy Phật 9 lạy', hint: 'Lạy đủ 9 lạy (tính cả lạy ở sân)', go: 'bow' },
  { id: 'med5', t: 4, ev: 'med', n: 5, ic: '🧘', name: 'Thiền có hướng dẫn 5 phút', hint: 'Thiền đủ 5 phút', go: 'med5' },
  { id: 'sweepall', t: 4, ev: 'sweepall', n: 1, ic: '🧹', name: 'Quét sạch cả sân chùa', hint: 'Quét hết các đống lá trong sân', go: 'sweep' },
  { id: 'visit', t: 4, ev: 'visit', n: 1, ic: '🗺', name: 'Hành hương sang chùa khác', hint: 'Mở bản đồ, chọn một ngôi chùa khác', go: 'visit' },
  { id: 'quiz3', t: 4, ev: 'quiz', n: 3, ic: '❓', name: 'Trả lời đúng 3 câu đố', hint: 'Mỗi tượng Phật có câu hỏi riêng', go: 'quiz' }
];
// thưởng theo thứ tự (càng về sau càng lớn) — tổng 430 hạt + 188 công đức, chưa kể rương
const REWARD = [[10, 5], [15, 8], [25, 12], [35, 16], [50, 22], [70, 30], [95, 40], [130, 55]];
const CHEST = { beads: 200, merit: 80, lotus: 5 };

export function initMissions(X) {
  const { P, save, el, toast, banner, A, addBeads, addMerit, addLotus, modal, closeModal, GO } = X;
  const vn = () => new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000);
  const dayKey = (d = vn()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const yKey = () => dayKey(new Date(vn().getTime() - 86400000));
  const Q = P.mq = Object.assign({ day: '', ids: [], p: {}, c: {}, chest: '', streak: 0, lastAll: '', min: false }, P.mq || {});

  function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }
  function roll() {
    const k = dayKey(); if (Q.day === k && Q.ids.length) return;
    const r = rng(hash(k + ':' + (P.uid || P.name || 'x'))), used = new Set(), ids = [];
    [1, 2, 3, 4].forEach(t => { const c = POOL.filter(m => m.t === t).sort(() => r() - 0.5); let n = 0;
      for (const m of c) { if (n >= 2) break; if (used.has(m.ev)) continue; used.add(m.ev); ids.push(m.id); n++; }
      for (const m of c) { if (n >= 2) break; if (!ids.includes(m.id)) { ids.push(m.id); n++; } } });
    Object.assign(Q, { day: k, ids, p: {}, c: {} }); save();
  }
  const list = () => Q.ids.map((id, i) => ({ ...POOL.find(m => m.id === id), i, r: REWARD[i] })).filter(m => m.id);
  const prog = (m) => Math.min(m.n, Q.p[m.id] || 0), done = (m) => prog(m) >= m.n, got = (m) => !!Q.c[m.id];
  const allClaimed = () => list().every(got);
  const chestBonus = () => { const s = Q.lastAll === yKey() ? Q.streak + 1 : 1; return { s, k: 1 + 0.1 * Math.min(s - 1, 5) }; };

  function ev(k, n = 1) {
    roll(); let hit = false;
    list().forEach(m => { if (m.ev !== k || got(m) || done(m)) return; Q.p[m.id] = (Q.p[m.id] || 0) + n; hit = true;
      if (done(m)) { A.smallBell && A.smallBell(); toast(`✅ Xong nhiệm vụ: ${m.name} · bấm ở bảng nhiệm vụ để nhận +${m.r[0]} hạt`); } });
    if (hit) { save(); render(); }
  }
  window.addEventListener('cba-ev', (e) => { const d = e.detail; if (typeof d === 'string') ev(d); else if (d && d.k) ev(d.k, d.n || 1); });

  function claim(m) {
    if (got(m) || !done(m)) return; Q.c[m.id] = 1;
    addBeads(m.r[0]); const g = addMerit(m.r[1]); save();
    A.khanh && A.khanh(); toast(`🎁 Nhận thưởng: +${m.r[0]} hạt, +${g || m.r[1]} công đức`);
    const nx = list().find(x => !got(x)); if (nx) setTimeout(() => toast(`➡️ Nhiệm vụ tiếp: ${nx.ic} ${nx.name} · thưởng +${nx.r[0]} hạt`), 1600);
    else setTimeout(() => { banner('🎁 Hoàn thành nhiệm vụ hôm nay', 'Rương công đức đã mở khóa', 'Bấm "Mở rương" ở bảng nhiệm vụ'); A.bigBell && A.bigBell(); }, 900);
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
  function go(m) {
    const f = GO[m.go]; toast(`${m.ic} ${m.hint}`);
    if (f) try { f(m); } catch (e) { /* bỏ qua */ }
  }

  /* ---------------- bảng bên phải ---------------- */
  const box = el('div', 'mqp'); box.id = 'mqPanel';
  { const rk = document.getElementById('rank'); if (rk && rk.parentNode) rk.after(box); else document.body.append(box); }   // nằm ngay dưới Bảng Công Đức
  function rowEl(m, big) {
    const d = done(m), r = el('button', 'mqr' + (d ? ' done' : '') + (big ? ' big' : ''));
    const pct = Math.round(prog(m) / m.n * 100);
    r.append(el('i', 'mqi', m.ic));
    const tx = el('span', 'mqt'); tx.append(el('b', '', m.name));
    const bar = el('em', 'mqbar'); const fill = el('u'); fill.style.width = pct + '%'; bar.append(fill);
    tx.append(bar, el('small', '', d ? `🎁 Bấm nhận +${m.r[0]} hạt` : `${prog(m)}/${m.n} · thưởng +${m.r[0]} hạt`));
    r.append(tx); r.title = d ? 'Nhận thưởng' : m.hint;
    r.onclick = (e) => { e.stopPropagation(); d ? claim(m) : go(m); };
    return r;
  }
  function render() {
    roll(); box.innerHTML = '';
    const L = list(), n = L.filter(got).length;
    const head = el('button', 'mqh'); head.append(el('b', '', `📋 Nhiệm vụ ${n}/${L.length}`), el('i', '', Q.min ? '▸' : '▾'));
    const ready = L.filter(m => done(m) && !got(m)).length; if (ready) head.append(el('em', 'mqdot', String(ready)));
    head.onclick = () => { Q.min = !Q.min; save(); render(); };
    box.append(head); box.classList.toggle('min', !!Q.min);
    if (Q.min) return;
    if (allClaimed()) {
      if (Q.chest !== Q.day) { const c = el('button', 'mqr chest'); c.append(el('i', 'mqi', '🎁'), el('span', 'mqt', '')); c.lastChild.append(el('b', '', 'Mở Rương công đức'), el('small', '', `+${Math.round(CHEST.beads * chestBonus().k)} hạt · +${CHEST.lotus} 🪷`)); c.onclick = openChest; box.append(c); }
      else box.append(el('p', 'mqok', `🌸 Đã xong hôm nay · 🔥 ${Q.streak} ngày liên tiếp`));
    } else {
      const todo = L.filter(m => !got(m)).sort((a, b) => (done(b) - done(a)) || a.i - b.i);
      todo.slice(0, 2).forEach((m, k) => box.append(rowEl(m, k === 0)));
    }
    const all = el('button', 'mqall', 'Xem tất cả ›'); all.onclick = openAll; box.append(all);
  }
  function openAll() {
    modal('📋 Nhiệm vụ hôm nay', (b) => {
      const { s, k } = chestBonus();
      b.append(el('p', 'note', 'Mỗi ngày 8 nhiệm vụ từ dễ đến khó · thưởng tăng dần · xong cả 8 được mở Rương công đức. Hoàn thành liên tiếp nhiều ngày, rương càng lớn (tối đa +50%).'));
      const wrap = el('div', 'mqlist');
      list().forEach(m => {
        const r = rowEl(m, false); r.classList.toggle('got', got(m)); r.prepend(el('i', 'mqn', got(m) ? '✓' : String(m.i + 1)));
        if (got(m)) { r.onclick = null; r.querySelector('small').textContent = `Đã nhận +${m.r[0]} hạt, +${m.r[1]} công đức`; }
        else { const o = r.onclick; r.onclick = (e) => { closeModal(); o(e); }; }
        wrap.append(r);
      });
      b.append(wrap);
      const c = el('div', 'mqchest' + (allClaimed() ? ' open' : ''));
      c.append(el('b', '', `🎁 Rương công đức: +${Math.round(CHEST.beads * k)} hạt · +${Math.round(CHEST.merit * k)} công đức · +${CHEST.lotus} 🪷`),
        el('small', '', Q.chest === Q.day ? `Đã mở hôm nay · chuỗi ${Q.streak} ngày` : `Chuỗi hiện tại: ${s - 1} ngày · hôm nay xong sẽ thành ${s} ngày${s > 1 ? ` (thưởng thêm ${Math.round((k - 1) * 100)}%)` : ''}`));
      if (allClaimed() && Q.chest !== Q.day) { const ob = el('button', 'btn gold', 'Mở rương'); ob.onclick = () => { closeModal(); openChest(); }; c.append(ob); }
      b.append(c);
    });
  }
  let t0 = 0, last = '';
  function step() { const n = performance.now(); if (n - t0 < 5000) return; t0 = n; const k = dayKey(); if (k !== last) { last = k; render(); } }
  render();
  return { ev, step, render, openAll };
}
