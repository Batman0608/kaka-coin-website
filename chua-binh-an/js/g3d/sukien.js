/* =========================================================================
 *  SỰ KIỆN & CỘNG ĐỒNG (máy khách)
 *  · 🏮 Đêm rằm thả đèn (mùng 1 & Rằm, 18:00–24:00): thả hoa đăng có tên trên sông/hồ, xem đèn của mọi người, bình chọn
 *  · 🧘 Khóa tu cuối tuần (thứ Bảy, Chủ nhật 19:30–21:00): tụng chung, thiền chung, đếm số người thật tham gia
 *  · 🪷 Lễ lớn: Phật Đản (tắm Phật, hoa đăng), Vu Lan (dâng lễ cha mẹ, thắp nến người đã khuất), Tết (lì xì, hái lộc, xin quẻ)
 *  · 💞 Lễ cầu duyên ngày rằm (chùa Hà): thả đèn đôi, mời bạn cùng đi lễ
 *  · 🏆 Bảng Công Đức TUẦN (người thật) · thưởng top 3 tuần trước
 *  · 🏮 Thi "Lời nguyện hay" · 📸 Thi "Góc chùa đẹp nhất" · 💌 Mời bạn
 * ========================================================================= */
const QUE = [
  ['Thượng thượng', 'Mây tan trăng sáng, việc lành tự đến. Giữ tâm hiền thì phúc càng dày.'],
  ['Thượng', 'Gieo nhân lành gặt quả ngọt. Năm nay chăm chỉ ắt có thành tựu.'],
  ['Thượng', 'Gia đạo an hòa, người thân khỏe mạnh. Nên năng về thăm cha mẹ.'],
  ['Trung bình', 'Việc lớn nên thong thả, việc nhỏ nên chu đáo. Chậm mà chắc.'],
  ['Trung bình', 'Có quý nhân giúp đỡ. Biết lắng nghe thì gỡ được việc khó.'],
  ['Thượng', 'Lộc đến từ sự siêng năng. Tiêu dùng tiết kiệm thì của để dành.'],
  ['Trung bình', 'Tránh nóng giận, bớt lời qua tiếng lại. Nhẫn một chút, vui cả năm.'],
  ['Thượng thượng', 'Học hành tấn tới, công việc hanh thông. Nhớ giữ chữ tín.'],
  ['Trung bình', 'Sức khỏe là vàng. Ngủ sớm, ăn lành, tâm sẽ an.'],
  ['Thượng', 'Duyên lành đang tới. Mở lòng đón nhận, đừng vội vàng.'],
  ['Thượng', 'Bố thí không cần nhiều, chỉ cần thật lòng. Làm việc thiện, phúc tự sinh.'],
  ['Trung bình', 'Đường xa nên cẩn thận. Đi đâu cũng mang theo lòng từ bi.']
];

export function initSuKien(X) {
  const { P, save, el, $, toast, banner, modal, closeModal, A, NET, FEED, TH, addBeads, addMerit, addLotus, getTemple, goHall, openChant, openMeditate, openTemplePicker, isPracticing, snap } = X;
  const vn = () => new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000);
  const dayKey = (d = vn()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const S = P.sk = Object.assign({ ev: {}, ktMin: {}, moi: '' }, P.sk || {});
  const did = (k) => S.ev[k] === dayKey(), mark = (k) => { S.ev[k] = dayKey(); save(); };
  const btn = (t, cls, fn) => { const b = el('button', 'btn' + (cls ? ' ' + cls : ''), t); b.onclick = fn; return b; };
  const lunar = () => { try { return CBA.Lunar.today(vn()); } catch (e) { return null; } };
  const hm = (d) => d.getHours() * 60 + d.getMinutes();

  /* ---------------- lịch sự kiện ---------------- */
  const FORCE = (() => { try { return new URLSearchParams(location.search).get('sukien') || ''; } catch (e) { return ''; } })();   // thử sự kiện: game.html?sukien=ram
  const isRamDay = () => { if (FORCE === 'ram') return true; const L = lunar(); return !!L && !L.leap && (L.day === 15 || L.day === 1); };
  const ramNight = () => isRamDay() && (FORCE === 'ram' || hm(vn()) >= 18 * 60);
  const isWeekend = () => [0, 6].includes(vn().getDay());
  const retreat = () => isWeekend() && hm(vn()) >= 19 * 60 + 30 && hm(vn()) < 21 * 60;
  const season = () => (TH && TH.season ? TH.season() : '');
  const atHa = () => (getTemple() || {}).id === 'chua-ha';
  function events() {
    const L = lunar(), out = [], d = vn(), wd = d.getDay();
    const ramName = L && L.day === 1 ? 'mùng Một' : 'Rằm';
    out.push({ id: 'ram', ic: '🏮', n: 'Đêm rằm thả đèn', when: 'Mùng 1 & Rằm âm lịch · 18:00–24:00', on: ramNight(), soon: isRamDay() && !ramNight(),
      gift: 'Thả hoa đăng đầu tiên: +54 hạt · +20 công đức · +3 🪷 · đèn hiện tên bạn trên mặt nước', note: `Đêm ${ramName}: ra bờ sông, bờ hồ bấm "🏮 Thả hoa đăng rằm", viết lời nguyện. Đèn của mọi người cùng trôi, ai cũng thấy tên nhau.` });
    out.push({ id: 'kt', ic: '🧘', n: 'Khóa tu cuối tuần', when: 'Thứ Bảy, Chủ nhật · 19:30–21:00', on: retreat(), soon: isWeekend() && hm(d) < 19 * 60 + 30,
      gift: 'Tham gia đủ 10 phút: +108 hạt · +30 công đức', note: 'Vào chánh điện tụng kinh hoặc thiền cùng đại chúng · hiện số người thật đang tham gia.', live: true });
    const se = season();
    if (se === 'phatdan') out.push({ id: 'phatdan', ic: '🪷', n: 'Mùa Phật Đản', when: '8–15/4 âm lịch', on: true, gift: 'Tắm Phật +27 hạt · hoa đăng +9 hạt', note: 'Tắm Phật trước chánh điện, thả hoa đăng trên hồ, dự lễ rước kiệu buổi tối.' });
    if (se === 'vulan') out.push({ id: 'vulan', ic: '🌹', n: 'Mùa Vu Lan báo hiếu', when: '1–15/7 âm lịch', on: true, gift: 'Dâng lễ cha mẹ: +54 hạt · thắp nến tưởng nhớ: +27 hạt (mỗi ngày)', note: 'Cài hoa hồng, viết thư gửi mẹ, dâng lễ cho cha mẹ trong gia phả, thắp nến cho người đã khuất.' });
    if (se === 'tet') out.push({ id: 'tet', ic: '🧧', n: 'Tết Nguyên Đán', when: '23 tháng Chạp – mùng 7 Tết', on: true, gift: 'Lì xì đầu năm (hạt + hoa sen) · xin quẻ đầu năm · hái lộc', note: 'Mỗi ngày Tết nhận một bao lì xì, xin một quẻ, hái lộc và xin chữ ông đồ.' });
    if (isRamDay()) out.push({ id: 'duyen', ic: '💞', n: 'Lễ cầu duyên ngày rằm', when: 'Mùng 1 & Rằm · chùa Hà', on: true, gift: 'Thả đèn đôi: +54 hạt · +20 công đức', note: 'Đến chùa Hà, ra bờ hồ thả đèn đôi ghi tên hai người. Mời bạn cùng vào game để đi lễ chung.' });
    // ngày rằm tiếp theo (để báo trước)
    if (!isRamDay()) { for (let i = 1; i < 31; i++) { const dd = new Date(d.getTime() + i * 86400000); let l = null; try { l = CBA.Lunar.today(dd); } catch (e) {} if (l && (l.day === 15 || l.day === 1)) { out[0].next = `${dd.getDate()}/${dd.getMonth() + 1}`; break; } } }
    return out;
  }

  /* ---------------- công đức tuần ---------------- */
  let mBuf = 0, top = null, topT = 0, invN = { n: 0, wk: 0, code: '' }, ktN = 0;
  function merit(n) { if (n > 0) mBuf += n; }
  setInterval(() => { if (mBuf && NET.online) { if (!top || !top.mine) setTimeout(pullTop, 800); NET.soc('cd.merit', { n: Math.min(3000, mBuf) }); mBuf = 0; } }, 20000);
  function pullTop() { if (NET.online) NET.soc('cd.top'); }
  /* ---------------- máy chủ trả lời ---------------- */
  let lanView = null, picView = null, firstOnline = true;
  NET.onSoc((m) => {
    if (m.op === 'cd.top') { top = m; topT = performance.now(); }
    else if (m.op === 'cd.prize') { if (addLotus) addLotus(m.lotus); banner('🏆 Thưởng Công Đức Tuần', `Hạng ${m.r} tuần trước`, `+${m.lotus} 🪷 · cảm ơn bạn đã tinh tấn tu tập`); A.bigBell && A.bigBell(); }
    else if (m.op === 'cd.invn') { invN = m; }
    else if (m.op === 'cd.invited') { banner('💌 Có bạn mới', `${m.name} đã vào chơi theo lời mời của bạn`, 'Nhiệm vụ tuần "Mời 1 bạn" đã tính'); NET.soc('cd.invn'); }
    else if (m.op === 'cd.inv.ok') { S.moi = 'done'; save(); if (m.ok) toast(`💌 Chào mừng bạn! ${m.by} đã mời bạn đến Chùa Bình An`); }
    else if (m.op === 'cd.lanlist' && m.key === 'feat') { const x = (m.list || []).find(y => y.v > 0); if (x && FEED) FEED.sys(`🏮 Lời nguyện hay tuần này (${x.v} ❤️): “${x.text}” — ${x.name}`, () => TH.openHub('sukien')); }
    else if (m.op === 'cd.lanlist') { if (m.key === 'float') { const mine = P.name; const n = TH && TH.floatOthers ? TH.floatOthers(m.list.filter(x => !x.mine)) : 0; if (n) toast(`🏮 ${n} ngọn đèn của đại chúng đang trôi trên mặt nước`); } else if (lanView) lanView(m.list); }
    else if (m.op === 'cd.piclist') { if (picView) picView(m.list); }
    else if (m.op === 'cd.voted') { toast(m.voted ? '❤️ Đã bình chọn' : 'Đã bỏ bình chọn'); }
    else if (m.op === 'cd.kt') { ktN = m.n; }
  });
  setInterval(() => {   // kết nối: hỏi thưởng tuần, số người được mời, gửi mã mời
    if (!NET.online) { firstOnline = true; return; }
    if (firstOnline) { firstOnline = false; if (mBuf) { NET.soc('cd.merit', { n: Math.min(3000, mBuf) }); mBuf = 0; } NET.soc('cd.prize'); NET.soc('cd.invn'); pullTop(); if (S.moi && S.moi !== 'done') NET.soc('cd.inv', { code: S.moi }); }
    if (performance.now() - topT > 30000) pullTop();
  }, 3000);
  try { const q = new URLSearchParams(location.search).get('moi'); if (q && !S.moi) { S.moi = q.toUpperCase().slice(0, 6); save(); } } catch (e) {}

  /* ---------------- mời bạn ---------------- */
  function inviteLink() { return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}game.html?moi=${invN.code || (P.uid || '').slice(0, 6).toUpperCase()}`; }
  function invite() {
    modal('💌 Mời bạn vào chơi', (b) => {
      const link = inviteLink();
      b.append(el('p', 'note', 'Gửi đường dưới đây cho bạn bè, người thân. Bạn mới vào chơi qua đường này thì được tính cho bạn (nhiệm vụ tuần +300 hạt, +10 🪷). Đi lễ cùng người thật vui hơn nhiều!'));
      const inp = el('input'); inp.value = link; inp.readOnly = true; inp.onclick = () => inp.select(); b.append(inp);
      const r = el('div', 'row');
      r.append(btn('📋 Sao chép', 'gold', () => { try { navigator.clipboard.writeText(link); toast('Đã sao chép đường mời'); } catch (e) { inp.select(); document.execCommand('copy'); toast('Đã sao chép'); } }));
      if (navigator.share) r.append(btn('📤 Gửi qua Zalo, Messenger…', '', () => navigator.share({ title: 'Chùa Bình An Online', text: 'Cùng mình đi lễ chùa online, thả đèn, tụng kinh nhé 🙏', url: link }).catch(() => {})));
      b.append(r, el('p', 'note', `Đã mời: ${invN.n || 0} bạn · tuần này ${invN.wk || 0}.`));
    });
  }

  /* ---------------- thả đèn ---------------- */
  function lantern(text, ev) { if (NET.online) NET.soc('cd.lan', { text, temple: (getTemple() || {}).id, ev: ev || (ramNight() ? 'ram' : '') }); }
  function askText(title, hint, ph, fn) {
    modal(title, (b) => { b.append(el('p', 'note', hint)); const t = el('input'); t.maxLength = 70; t.placeholder = ph; b.append(t);
      b.append(btn('🏮 Thả đèn', 'gold', () => { const v = t.value.replace(/\s+/g, ' ').trim(); if (v.length < 2) return toast('Hãy viết lời nguyện'); closeModal(); fn(v); })); setTimeout(() => t.focus(), 50); });
  }
  function ramLantern() {
    askText('🏮 Thả hoa đăng đêm rằm', 'Viết một lời nguyện ngắn. Hoa đăng sẽ trôi trên mặt nước kèm tên bạn, mọi người trong chùa đều thấy.', 'VD: Nguyện cha mẹ mạnh khỏe, bình an', (v) => {
      TH.floatLantern(`${P.name}: ${v}`, { free: true, mine: true, icon: '🏮 ' }); A.khanh && A.khanh(); lantern(v, 'ram');
      window.dispatchEvent(new CustomEvent('cba-ev', { detail: 'lantern' }));
      if (!did('ram')) { mark('ram'); addBeads(54); const g = addMerit(20); if (addLotus) addLotus(3); banner('🏮 Đêm rằm thả đèn', 'Hoa đăng của bạn đã trôi trên mặt nước', `+54 hạt · +${g || 20} công đức · +3 🪷`); }
      else toast('🏮 Hoa đăng đã trôi trên mặt nước');
      NET.online && NET.soc('cd.lanlist', { key: 'float', ev: 'ram', temple: (getTemple() || {}).id, since: Date.now() - 6 * 3600000 });
    });
  }
  function duyenLantern() {
    modal('💞 Thả đèn đôi', (b) => {
      b.append(el('p', 'note', 'Lễ cầu duyên ngày rằm: ghi tên hai người lên đèn. Nếu chưa có ai, hãy ghi lời nguyện tìm được người hợp ý.'));
      const a = el('input'); a.maxLength = 20; a.value = P.name || ''; const c = el('input'); c.maxLength = 20; c.placeholder = 'Tên người ấy (có thể để trống)';
      b.append(a, c, btn('💞 Thả đèn đôi', 'gold', () => { const n1 = a.value.trim() || P.name, n2 = c.value.trim(); closeModal();
        const text = n2 ? `${n1} 💞 ${n2}` : `${n1} nguyện gặp người hợp ý`; TH.floatLantern(text, { free: true, mine: true, icon: '💞 ' }); A.khanh && A.khanh(); lantern(text, 'duyen');
        if (!did('duyen')) { mark('duyen'); addBeads(54); const g = addMerit(20); banner('💞 Lễ cầu duyên ngày rằm', text, `+54 hạt · +${g || 20} công đức`); } }));
    });
  }
  function waterCtx() {
    if (atHa() && isRamDay() && !did('duyen')) return { label: '💞 Thả đèn đôi', fn: duyenLantern };
    if (ramNight()) return { label: '🏮 Thả hoa đăng rằm', fn: ramLantern };
    return null;
  }
  let floatedFor = '';
  function onTemple() {   // vào chùa trong đêm rằm: thả đèn của đại chúng lên mặt nước
    const id = (getTemple() || {}).id; if (!ramNight() || floatedFor === id + dayKey()) return; floatedFor = id + dayKey();
    setTimeout(() => NET.online && NET.soc('cd.lanlist', { key: 'float', ev: 'ram', temple: id, since: Date.now() - 6 * 3600000 }), 3000);
  }

  /* ---------------- Tết: lì xì, xin quẻ · Vu Lan: dâng lễ cha mẹ, thắp nến ---------------- */
  function liXi() { if (did('lixi')) return toast('Hôm nay đã nhận lì xì rồi · mai quay lại nhé'); mark('lixi'); const h = [18, 27, 36, 54, 88][Math.random() * 5 | 0], l = 1 + (Math.random() * 8 | 0); addBeads(h); if (addLotus) addLotus(l); A.khanh && A.khanh(); banner('🧧 Lì xì đầu năm', `+${h} hạt · +${l} 🪷`, 'An khang thịnh vượng · vạn sự như ý'); }
  function xinQue() {
    if (did('que')) return toast('Mỗi ngày xin một quẻ thôi 🙏'); mark('que'); const [lv, t] = QUE[Math.random() * QUE.length | 0]; addBeads(9); A.smallBell && A.smallBell();
    modal('🎋 Quẻ đầu năm', (b) => { b.append(el('h3', '', `Quẻ ${lv}`), el('p', '', t), el('p', 'note', 'Quẻ chỉ để tham khảo, cầu may đầu năm. Điều quan trọng là gieo nhân lành mỗi ngày. +9 hạt')); });
  }
  function vuLanOffer() { if (did('vlo')) return toast('Hôm nay bạn đã dâng lễ cha mẹ'); mark('vlo'); addBeads(54); addMerit(20); A.khanh && A.khanh(); banner('🌹 Dâng lễ cha mẹ', 'Nguyện cha mẹ thân tâm an lạc', '+54 hạt · +20 công đức · mở gia phả gặp Ông giữ gia phả trong chánh điện'); goHall(); }
  function vuLanCandle() { if (!did('vlc')) { mark('vlc'); addBeads(27); A.smallBell && A.smallBell(); toast('🕯 Thắp nến tưởng nhớ · +27 hạt · ghi tên người đã khuất lên bảng hồi hướng'); } closeModal(); TH.openHub('hoihuong'); }

  /* ---------------- khóa tu cuối tuần ---------------- */
  let ktT = 0, ktAcc = 0;
  function step(dt) {
    const now = performance.now(); if (now - ktT < 30000) return; ktT = now;
    if (retreat()) {
      const on = isPracticing(); if (NET.online) NET.soc('cd.kt', { on });
      if (on) { const k = dayKey(); S.ktMin[k] = (S.ktMin[k] || 0) + 0.5; Object.keys(S.ktMin).forEach(x => { if (x !== k) delete S.ktMin[x]; }); save();
        if (S.ktMin[k] >= 10 && !did('kt')) { mark('kt'); addBeads(108); addMerit(30); A.bigBell && A.bigBell(); banner('🧘 Khóa tu cuối tuần', 'Tham gia đủ 10 phút', '+108 hạt · +30 công đức · tùy hỷ công đức'); } }
    }
  }
  // tin hệ thống trong khung chat (lặp lại định kỳ khi sự kiện đang diễn ra)
  let sysT = 0;
  setInterval(() => { if (NET.online) NET.soc('cd.lanlist', { sort: 'top', key: 'feat' }); }, 300000);   // giới thiệu lời nguyện hay mỗi 5 phút
  setInterval(() => {
    if (!FEED || performance.now() - sysT < 120000) return;
    const on = events().filter(e => e.on); if (!on.length) return; sysT = performance.now();
    const e = on[(Math.random() * on.length) | 0];
    FEED.sys(`${e.ic} ${e.n} đang diễn ra${e.id === 'kt' ? ` · ${ktN} người đang tham gia` : ''}`, () => TH.openHub('sukien'));
  }, 20000);

  /* ---------------- bảng tuần cho HUD ---------------- */
  // Phật tử ảo trên bảng tuần (tạo không khí thi đua) · công đức tăng dần theo ngày trong tuần · thưởng chỉ tính cho người chơi thật
  const BOTW = [['Diệu Hạnh', 4300], ['Minh Tuệ', 3700], ['Thanh Tịnh', 3200], ['Quảng Đức', 2800], ['An Nhiên', 2450], ['Tâm Nguyện', 2100], ['Thiện Tâm', 1800], ['Phúc An', 1500], ['Hoa Sen', 1250], ['Bình Yên', 1000], ['Như Ý', 780], ['Minh Châu', 560]];
  function botRows() {
    const d = vn(), dow = (d.getDay() + 6) % 7, f = Math.min(1, (dow * 1440 + d.getHours() * 60 + d.getMinutes()) / (7 * 1440)) * 0.97 + 0.03;
    const wk = Math.floor(Date.now() / (7 * 86400000));
    return BOTW.map(([name, T], i) => { const jit = 0.82 + (((wk * 31 + i * 17) % 37) / 37) * 0.36; return { name, n: Math.round(T * jit * Math.pow(f, 0.92)), bot: true }; });
  }
  function rows() {
    if (!top || !top.list) return null;
    const real = top.list.map(x => ({ ...x })); if (top.mine && !real.some(x => x.me)) real.push({ name: P.name, n: top.mine.n, me: true });
    const all = real.concat(botRows()).sort((a, b) => b.n - a.n); all.forEach((x, i) => { x.r = i + 1; });
    const me = all.find(x => x.me);
    return { ...top, list: all.slice(0, 10), mine: me ? { r: me.r, n: me.n } : null };
  }

  /* ---------------- thi ảnh góc chùa ---------------- */
  function sendPhoto(note) {
    const cv = snap(); if (!cv) return toast('Không chụp được ảnh');
    const W2 = 960, H2 = Math.round(cv.height * W2 / cv.width), c2 = document.createElement('canvas'); c2.width = W2; c2.height = H2; c2.getContext('2d').drawImage(cv, 0, 0, W2, H2);
    c2.toBlob((blob) => {
      if (!blob) return toast('Không chụp được ảnh');
      fetch(`${NET.httpBase()}/cd/anh`, { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-uid': P.uid, 'x-temple': encodeURIComponent((getTemple() || {}).name || ''), 'x-note': encodeURIComponent(note || '') }, body: blob })
        .then(r => r.json()).then(j => { if (j.err) toast('📸 ' + j.err); else { toast('📸 Đã gửi ảnh dự thi "Góc chùa đẹp nhất"'); addBeads(18); } }).catch(() => toast('📸 Chưa gửi được ảnh, thử lại sau'));
    }, 'image/jpeg', 0.8);
  }

  /* ---------------- tab Sự kiện (Tu tập) ---------------- */
  function view(b) {
    b.append(el('h3', '', '🎉 Sự kiện'));
    const list = el('div', 'evlist');
    events().forEach(e => {
      const c = el('div', 'evc' + (e.on ? ' on' : ''));
      c.append(el('b', '', `${e.ic} ${e.n}`), el('small', 'evwhen', e.when + (e.on ? ' · ĐANG DIỄN RA' : e.next ? ` · lần tới ${e.next}` : e.soon ? ' · hôm nay' : '')), el('p', '', e.note), el('em', '', '🎁 ' + e.gift));
      if (e.id === 'kt') c.append(el('p', 'evlive', `🟢 ${ktN} người thật đang tham gia`));
      const r = el('div', 'row');
      if (e.on && e.id === 'ram') r.append(btn('🏮 Ra mặt nước thả đèn', 'gold', () => { closeModal(); toast('Ra bờ sông, bờ hồ rồi bấm "🏮 Thả hoa đăng rằm"'); }));
      if (e.on && e.id === 'kt') r.append(btn('🪵 Tụng chung', 'gold', () => { closeModal(); goHall(() => openChant()); }), btn('🧘 Thiền chung', '', () => { closeModal(); goHall(() => openMeditate()); }));
      if (e.id === 'vulan') r.append(btn('🌹 Dâng lễ cha mẹ', 'gold', () => { closeModal(); vuLanOffer(); }), btn('🕯 Thắp nến tưởng nhớ', '', vuLanCandle));
      if (e.id === 'tet') r.append(btn('🧧 Nhận lì xì', 'gold', () => { closeModal(); liXi(); }), btn('🎋 Xin quẻ', '', () => { closeModal(); xinQue(); }));
      if (e.id === 'duyen') r.append(btn(atHa() ? '💞 Ra bờ hồ thả đèn đôi' : '💞 Đến chùa Hà', 'gold', () => { closeModal(); if (!atHa()) openTemplePicker(); else toast('Ra bờ hồ rồi bấm "💞 Thả đèn đôi"'); }), btn('💌 Mời bạn đi lễ cùng', '', () => { closeModal(); invite(); }));
      if (r.children.length) c.append(r);
      list.append(c);
    });
    b.append(list);
    // bảng tuần
    b.append(el('h3', '', '🏆 Công Đức Tuần'));
    const tb = el('div', 'evtop');
    const top = rows();
    if (!top) tb.append(el('p', 'note', NET.online ? 'Đang tải…' : 'Cần kết nối máy chủ để xem bảng tuần.'));
    else {
      const ol = el('ol', 'evrank'); (top.list || []).forEach(x => { const li = el('li', x.me ? 'me' : ''); li.append(el('b', '', String(x.r)), el('span', '', x.name), el('em', '', fmtN(x.n))); ol.append(li); });
      if (!top.list.length) tb.append(el('p', 'note', 'Tuần này chưa có ai · hãy là người đầu tiên!')); else tb.append(ol);
      if (top.mine && top.mine.r > 10) tb.append(el('p', 'note', `Bạn: hạng ${top.mine.r} · ${fmtN(top.mine.n)} công đức`));
      tb.append(el('p', 'note', `Thưởng cuối tuần cho 3 người chơi thật cao nhất (thứ Hai nhận): 🥇 100 🪷 · 🥈 60 🪷 · 🥉 30 🪷. ${top.last && top.last.length ? 'Tuần trước: ' + top.last.map(x => `${x.r}. ${x.name}`).join(' · ') : ''}`));
    }
    b.append(tb);
    // lời nguyện hay
    b.append(el('h3', '', '🏮 Thi "Lời nguyện hay" tuần này'));
    const lb = el('div', 'evlan'); b.append(lb, el('p', 'note', 'Lời nguyện từ đèn nguyện và hoa đăng của mọi người. Bấm ❤️ để bình chọn · lời nguyện nhiều bình chọn nhất được giới thiệu trên khung chat.'));
    const lr = el('div', 'row'); let sort = 'top'; const load = () => NET.online && NET.soc('cd.lanlist', { sort });
    lr.append(btn('Hay nhất', 'gold', () => { sort = 'top'; load(); }), btn('Mới nhất', '', () => { sort = 'new'; load(); })); b.insertBefore(lr, lb);
    lanView = (L) => { lb.innerHTML = ''; if (!L.length) lb.append(el('p', 'note', 'Chưa có lời nguyện nào tuần này.')); L.slice(0, 12).forEach(x => { const r = el('div', 'evitem'); r.append(el('span', '', `${x.ev === 'duyen' ? '💞' : '🏮'} ${x.text}`), el('small', '', `— ${x.name}`));
      const v = btn(`${x.voted ? '❤️' : '🤍'} ${x.v}`, 'ghost', () => { if (x.mine) return toast('Không tự bình chọn cho mình nhé'); x.voted = !x.voted; x.v += x.voted ? 1 : -1; v.textContent = `${x.voted ? '❤️' : '🤍'} ${x.v}`; NET.soc('cd.vote', { id: x.id }); }); r.append(v); lb.append(r); }); };
    load();
    // ảnh góc chùa
    b.append(el('h3', '', '📸 Thi "Góc chùa đẹp nhất"'));
    b.append(el('p', 'note', 'Xoay máy quay tới góc đẹp nhất của ngôi chùa rồi bấm "Chụp & gửi dự thi" (mỗi ngày 1 ảnh, +18 hạt). Ảnh nhiều ❤️ nhất tuần được giới thiệu.'));
    const note = el('input'); note.maxLength = 60; note.placeholder = 'Ghi chú cho ảnh (không bắt buộc)';
    b.append(note, btn('📸 Chụp & gửi dự thi', 'gold', () => { const v = note.value; closeModal(); setTimeout(() => sendPhoto(v), 400); }));
    const pg = el('div', 'evpics'); b.append(pg);
    picView = (L) => { pg.innerHTML = ''; if (!L.length) pg.append(el('p', 'note', 'Chưa có ảnh dự thi tuần này.')); L.slice(0, 12).forEach(x => { const c = el('div', 'evpic'); const im = el('img'); im.src = `${NET.httpBase()}/cd/anh/${x.id}.jpg`; im.loading = 'lazy'; im.alt = x.temple || '';
      const v = btn(`${x.voted ? '❤️' : '🤍'} ${x.v}`, 'ghost', () => { if (x.mine) return toast('Không tự bình chọn cho mình nhé'); x.voted = !x.voted; x.v += x.voted ? 1 : -1; v.textContent = `${x.voted ? '❤️' : '🤍'} ${x.v}`; NET.soc('cd.picvote', { id: x.id }); });
      c.append(im, el('small', '', `${x.name} · ${x.temple}${x.text ? ' · ' + x.text : ''}`), v); pg.append(c); }); };
    NET.online && NET.soc('cd.piclist', { sort: 'top' });
    // mời bạn
    b.append(el('h3', '', '💌 Mời bạn'), el('p', 'note', `Đã mời ${invN.n || 0} bạn · tuần này ${invN.wk || 0}. Mỗi tuần mời được 1 bạn là xong nhiệm vụ tuần.`), btn('💌 Lấy đường mời', 'gold', () => { closeModal(); invite(); }));
  }
  const fmtN = (n) => Number(n || 0).toLocaleString('vi-VN');

  return { merit, rows, step, view, waterCtx, onTemple, lantern, invite, invitesWeek: () => invN.wk || 0, events, retreat, ktN: () => ktN };
}
