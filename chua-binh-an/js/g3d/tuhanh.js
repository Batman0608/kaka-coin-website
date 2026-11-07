/* =========================================================================
 *  TU TẬP & CỘNG ĐỒNG — các lối chơi giữ chân người chơi
 *  · Thời khóa theo giờ thật (công phu khuya, cúng ngọ, công phu chiều, tịnh độ)
 *  · Chuỗi ngày lên chùa: mốc thưởng, sám hối giữ chuỗi khi lỡ 1 ngày
 *  · Rằm / mùng Một: chùa treo đèn, phóng sinh ở hồ
 *  · Sự kiện mùa: Phật Đản (tắm Phật, hoa đăng), Vu Lan (cài hoa hồng, thư gửi mẹ),
 *    Tết (xin chữ ông đồ, hái lộc, giao thừa)
 *  · Vườn chùa riêng (trồng, tưới mỗi ngày, bạn đồng tu tưới giúp)
 *  · Con đường tu tập (4 bậc) · Bộ sưu tập (áo tràng, tràng hạt, ấn, chữ, hoa)
 *  · 7 hoa sen ẩn mỗi chùa · Ấn tri thức (đố sự tích) · Thiền có hướng dẫn
 *  · Hồi hướng / cầu an cho người thân (bảng trong chánh điện)
 *  · Bạn đồng tu · Đạo tràng (nhóm) · Tụng kinh nhóm
 * ========================================================================= */
import { THREE } from '../temple3d.js';
import { Avatar } from './avatar.js';

export function initTuHanh(X) {
  const { P, save, modal, closeModal, el, $, toast, banner, ticker, A, fmt, addBeads, addMerit, NET, scene, me, C, kinhVN, TEMPLES } = X;
  const W = () => X.getW(), temple = () => X.getTemple();
  // ---------------- dữ liệu ----------------
  if (!P.uid) { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; P.uid = Array.from({ length: 16 }, () => a[(Math.random() * 36) | 0]).join(''); }
  const T = P.th = Object.assign({ tk: {}, tkCount: 0, unlock: [], best: P.streak || 0, garden: [], gHelp: '', flowers: {}, words: [], sen: {}, lq: {}, medWk: '', medMin: 0, medClaim: '', mem: {}, ev: {}, dtClaim: '', samHoi: null }, P.th || {});
  const dayKey = (d = kinhVN()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const dayNum = (d = kinhVN()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const weekKey = () => { const n = dayNum(), w = Math.floor((n + 3) / 7); return 'W' + w; };   // tuần bắt đầu thứ Hai
  const lunar = (d) => { try { return CBA.Lunar.today(d); } catch (e) { return null; } };
  const q = new URLSearchParams(location.search), FORCE = q.get('sukien') || ((C.suKien || {}).force) || '';
  const el2 = (tag, cls, kids) => { const e = el(tag, cls); (kids || []).forEach(k => e.append(k)); return e; };
  const btn = (t, cls, fn) => { const b = el('button', 'btn' + (cls ? ' ' + cls : ''), t); b.onclick = fn; return b; };
  const stamps = () => Object.values(P.temples || {}).filter(t => t.stamp).length;
  const tmpObjs = [];   // vật thể 3D của chùa hiện tại
  const add3d = (o) => { o.userData.tmp = true; o.traverse(x => { x.userData.noCollide = true; }); scene.add(o); tmpObjs.push(o); return o; };

  /* =================== 1. THỜI KHÓA THEO GIỜ THẬT =================== */
  const TK = (C.thoiKhoa) || [
    { id: 'khuya', name: 'Công phu khuya', icon: '🌙', h: 4, m: 0, dur: 90, note: 'Tụng Lăng Nghiêm, niệm Phật trong sương sớm' },
    { id: 'ngo', name: 'Cúng ngọ', icon: '☀️', h: 11, m: 0, dur: 60, note: 'Dâng cơm cúng Phật, quá đường' },
    { id: 'chieu', name: 'Công phu chiều', icon: '🌇', h: 16, m: 30, dur: 90, note: 'Tụng kinh A Di Đà, Mông Sơn thí thực' },
    { id: 'tinhdo', name: 'Khóa lễ tịnh độ', icon: '🪔', h: 19, m: 30, dur: 90, note: 'Niệm Phật, sám hối, hồi hướng' }
  ];
  function tkNow() {
    const d = kinhVN(), mins = d.getHours() * 60 + d.getMinutes();
    for (const s of TK) { const a = s.h * 60 + (s.m || 0); if (mins >= a && mins < a + s.dur) return Object.assign({ left: a + s.dur - mins, key: dayKey(d) + ':' + s.id }, s); }
    return null;
  }
  function tkNext() { const d = kinhVN(), mins = d.getHours() * 60 + d.getMinutes(); return TK.find(s => s.h * 60 + (s.m || 0) > mins) || TK[0]; }
  let tkShown = '', tkBar = null;
  function tkTick() {
    const s = tkNow();
    if (!tkBar) { tkBar = el('div', 'kinhbar tkbar'); tkBar.hidden = true; tkBar.onclick = () => openHub('homnay'); document.body.append(tkBar); }
    if (s) {
      tkBar.hidden = false; tkBar.textContent = `${s.icon} ${s.name} · hạt ×1,5 · còn ${s.left} phút${T.tk[s.key] ? ' · ✓ đã dự' : ' · lạy, tụng, thiền để dự lễ'}`;
      if (tkShown !== s.key) { tkShown = s.key; banner('🕯 Thời khóa', s.name, s.note + ' · tham dự để nhận +27 hạt'); A.smallBell(); ticker(`${s.icon} Đã đến giờ ${s.name} · mời đại chúng về chánh điện`); }
    } else tkBar.hidden = true;
  }
  function practiced() {
    const s = tkNow(); if (!s || T.tk[s.key]) return;
    T.tk[s.key] = 1; T.tkCount++; Object.keys(T.tk).forEach(k => { if (!k.startsWith(dayKey())) delete T.tk[k]; });
    addBeads(27); addMerit(10, true); banner('🕯 Dự khóa lễ', s.name, `+27 hạt · đã dự ${T.tkCount} khóa lễ`); save(); checkUnlocks();
  }

  /* =================== 2. CHUỖI NGÀY & SÁM HỐI =================== */
  function preCheckIn() {   // gọi trước checkIn: lỡ đúng 1 ngày & chuỗi ≥ 3 → cho sám hối giữ chuỗi
    const d = kinhVN(), key = dayKey(d); if (P.lastDay === key) return;
    const y2 = dayKey(new Date(d.getTime() - 2 * 86400000));
    if (P.lastDay === y2 && (P.streak || 0) >= 3) T.samHoi = { keep: P.streak, day: key };
  }
  function postCheckIn() {
    T.best = Math.max(T.best || 0, P.streak || 0);
    if (T.samHoi && T.samHoi.day === dayKey()) setTimeout(() => banner('🙏 Sám hối giữ chuỗi', `Hôm qua bạn lỡ một ngày (chuỗi ${T.samHoi.keep} ngày)`, 'Lần tràng hạt tròn 108 hạt hôm nay để giữ lại chuỗi'), 4000);
    checkUnlocks(); save();
  }
  function malaRound() {
    if (T.samHoi && T.samHoi.day === dayKey()) { P.streak = T.samHoi.keep + 1; T.best = Math.max(T.best, P.streak); T.samHoi = null; banner('🙏 Sám hối viên mãn', `Giữ lại chuỗi ${P.streak} ngày`, 'Tâm thành thì không có gì là muộn'); A.bigBell(); save(); }
    practiced();
  }

  /* =================== 3. CON ĐƯỜNG TU TẬP · MỞ KHÓA · SƯU TẬP =================== */
  const RANKS = [
    { n: 'Phật tử sơ cơ', icon: '🌱', need: 'Bắt đầu', ok: () => true },
    { n: 'Phật tử tinh tấn', icon: '🪷', need: 'Cấp 3 · lên chùa 7 ngày', ok: () => lv() >= 3 && P.days >= 7 },
    { n: 'Cư sĩ hộ trì', icon: '📿', need: 'Cấp 5 · 30 ngày · 3 ấn · 10 khóa lễ', ok: () => lv() >= 5 && P.days >= 30 && stamps() >= 3 && T.tkCount >= 10 },
    { n: 'Cư sĩ đạo hạnh', icon: '☸️', need: 'Cấp 7 · 60 ngày · 8 ấn · 30 khóa lễ', ok: () => lv() >= 7 && P.days >= 60 && stamps() >= 8 && T.tkCount >= 30 }
  ];
  const lv = () => X.levelOf(P.beads) + 1;
  const rank = () => { let r = 0; RANKS.forEach((k, i) => { if (k.ok()) r = i; }); return r; };
  const st = (id) => !!(P.temples[id] && P.temples[id].stamp);
  const UNL = [
    ['robe:hong', 'Áo tràng hồng sen', 'Chuỗi 7 ngày', () => T.best >= 7], ['robe:ngoc', 'Áo tràng xanh ngọc', 'Bậc Phật tử tinh tấn', () => rank() >= 1],
    ['robe:tim', 'Áo tràng tím Huế', 'Ấn chùa Thiên Mụ', () => st('thien-mu')], ['robe:reu', 'Áo tràng xanh rêu Yên Tử', 'Ấn chùa Yên Tử', () => st('yen-tu')],
    ['robe:dat', 'Áo tràng nâu đất Nam Bộ', 'Ấn chùa Giác Lâm hoặc Vĩnh Nghiêm', () => st('giac-lam') || st('vinh-nghiem')], ['robe:kim', 'Áo tràng vàng kim', 'Bậc Cư sĩ đạo hạnh hoặc chuỗi 100 ngày', () => rank() >= 3 || T.best >= 100],
    ['mala:bode', 'Tràng hạt bồ đề', 'Chuỗi 14 ngày', () => T.best >= 14], ['mala:tram', 'Tràng hạt trầm hương', 'Chuỗi 30 ngày', () => T.best >= 30],
    ['mala:ngoc', 'Tràng hạt ngọc bích', 'Ấn chùa Linh Ứng', () => st('linh-ung')], ['mala:mana', 'Tràng hạt mã não', 'Bậc Cư sĩ hộ trì', () => rank() >= 2],
    ['seed:truc', 'Hạt giống trúc', 'Cấp 3', () => lv() >= 3], ['seed:mai', 'Hạt giống mai vàng', 'Chuỗi 21 ngày hoặc mùa Tết', () => T.best >= 21 || season() === 'tet'],
    ['seed:lan', 'Hạt giống lan', 'Bậc Phật tử tinh tấn', () => rank() >= 1], ['seed:bode', 'Hạt bồ đề', 'Bậc Cư sĩ hộ trì', () => rank() >= 2],
    ['seat:front', 'Đệm hàng đầu chánh điện', 'Bậc Cư sĩ hộ trì', () => rank() >= 2]
  ];
  const has = (id) => T.unlock.includes(id) || ['robe:lam', 'robe:nau', 'robe:xam', 'robe:trang', 'mala:go', 'seed:cuc', 'seed:sen'].includes(id);
  let lastRank = -1;
  function checkUnlocks() {
    const r = rank(); if (lastRank >= 0 && r > lastRank) { banner('☸️ Con đường tu tập', `${RANKS[r].icon} ${RANKS[r].n}`, 'Đã mở thêm áo tràng, hạt giống, chỗ ngồi'); A.bigBell(); } lastRank = r;
    UNL.forEach(([id, n, , ok]) => { if (!T.unlock.includes(id) && ok()) { T.unlock.push(id); toast(`🎁 Mở khóa: ${n}`); } });
    badge();
  }
  const ROBE_N = { lam: ['Áo tràng lam', '#4f6fc4'], nau: ['Áo nâu', '#8c5530'], xam: ['Áo xám', '#767c8c'], trang: ['Áo trắng', '#eeeef4'], hong: ['Hồng sen', '#d77a96'], ngoc: ['Xanh ngọc', '#3f9a88'], tim: ['Tím Huế', '#7a4f9e'], reu: ['Xanh rêu', '#5f7a3a'], dat: ['Nâu đất', '#a8643a'], kim: ['Vàng kim', '#d8a93a'] };
  const MALA_N = { go: ['Gỗ nâu', '#8a5328'], bode: ['Bồ đề', '#c9a46a'], tram: ['Trầm hương', '#3a2416'], ngoc: ['Ngọc bích', '#3f8f6a'], mana: ['Mã não', '#a8322a'] };
  function equip(k, v) { P.look = Object.assign({}, P.look, { [k]: v }); if (me.av) me.av.setLook(P.look); NET.sendLook(); save(); }

  /* =================== 4. VƯỜN CHÙA RIÊNG =================== */
  const SEEDS = {
    cuc: { n: 'Cúc vàng', days: 3, beads: 27, icon: '🌼' }, sen: { n: 'Sen hồng', days: 5, beads: 54, icon: '🪷' }, truc: { n: 'Trúc xanh', days: 6, beads: 54, icon: '🎋' },
    mai: { n: 'Mai vàng', days: 7, beads: 81, icon: '🌸' }, lan: { n: 'Lan tím', days: 8, beads: 81, icon: '💮' }, bode: { n: 'Cây bồ đề', days: 12, beads: 162, icon: '🌳' }
  };
  const NPLOT = 6;
  const G = () => { while (T.garden.length < NPLOT) T.garden.push(null); return T.garden; };
  const plotInfo = (p) => { if (!p) return null; const need = SEEDS[p.k].days, n = p.w.length + (p.bonus || 0), last = p.w.length ? p.w[p.w.length - 1] : p.d0, wilt = dayNum() - last >= 3 && n < need; return { need, n: Math.min(n, need), ripe: n >= need, wilt, today: p.w.includes(dayNum()) }; };
  const needWater = () => G().some(p => p && !plotInfo(p).ripe && !plotInfo(p).today);
  function gardenSync() { NET.soc('gd.set', { garden: G().map(p => { if (!p) return ['', 0, 0]; const i = plotInfo(p); return [p.k, Math.round(i.n / i.need * 9), i.wilt ? 1 : 0]; }) }); }
  function plant(i, k) { G()[i] = { k, d0: dayNum(), w: [], bonus: 0 }; save(); gardenSync(); badge(); }
  function waterAll() {
    let n = 0; G().forEach(p => { if (p && !plotInfo(p).ripe && !p.w.includes(dayNum())) { p.w.push(dayNum()); n++; } });
    if (!n) return toast('🌱 Vườn đã tưới hôm nay rồi'); addBeads(n * 2); practicedGarden(); toast(`💧 Đã tưới ${n} luống · +${n * 2} hạt`); save(); gardenSync(); badge();
  }
  function practicedGarden() { if (T.gWater !== dayKey()) { T.gWater = dayKey(); addMerit(5, true); } }
  function harvest(i) {
    const p = G()[i], s = SEEDS[p.k]; G()[i] = null; T.flowers[p.k] = (T.flowers[p.k] || 0) + 1;
    addBeads(s.beads); addMerit(10, true); banner('🌾 Thu hoạch', `${s.icon} ${s.n}`, `+${s.beads} hạt · hoa nhà trồng dâng lên Phật`); A.smallBell(); save(); gardenSync(); badge();
  }
  // vẽ vườn 2D trên canvas: 6 luống đất, cây theo giai đoạn lớn, héo khi bỏ quên
  function drawGarden(cv, plots) {
    const g = cv.getContext('2d'), Wd = cv.width, Hd = cv.height; g.clearRect(0, 0, Wd, Hd);
    const sky = g.createLinearGradient(0, 0, 0, Hd); sky.addColorStop(0, '#f7e6c4'); sky.addColorStop(1, '#d9c39a'); g.fillStyle = sky; g.fillRect(0, 0, Wd, Hd);
    g.fillStyle = '#9c2a1a'; for (let x = 0; x < Wd; x += 24) g.fillRect(x, 8, 20, 10);   // tường gạch sau vườn
    const cw = Wd / 3, chh = (Hd - 30) / 2;
    plots.forEach((p, i) => {
      const cx = (i % 3) * cw + cw / 2, by = 30 + Math.floor(i / 3) * chh + chh - 16;
      g.fillStyle = p && p.k === 'sen' ? '#5a8fa6' : '#6b4226'; g.beginPath(); g.ellipse(cx, by, cw * 0.4, 16, 0, 0, 7); g.fill();
      g.fillStyle = p && p.k === 'sen' ? '#7fb2c6' : '#8a5a36'; g.beginPath(); g.ellipse(cx, by - 4, cw * 0.36, 11, 0, 0, 7); g.fill();
      if (!p) { g.fillStyle = 'rgba(60,30,10,.55)'; g.font = '600 13px sans-serif'; g.textAlign = 'center'; g.fillText('Luống trống', cx, by + 34); return; }
      const f = Math.max(0.12, p.f), wilt = p.wilt, H = chh * 0.72 * f, leaf = wilt ? '#8a7a3a' : '#3f8a3a', dark = wilt ? '#6a5a2a' : '#2f6a2f';
      g.lineCap = 'round';
      if (p.k === 'cuc') { for (let s = -1; s <= 1; s++) { g.strokeStyle = leaf; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + s * 16, by - 6); g.quadraticCurveTo(cx + s * 22, by - H * 0.6, cx + s * 14, by - H); g.stroke(); if (f >= 1) { g.fillStyle = wilt ? '#b9a25a' : '#f5c518'; for (let k = 0; k < 10; k++) { const a = k / 10 * 7; g.beginPath(); g.ellipse(cx + s * 14 + Math.cos(a) * 9, by - H + Math.sin(a) * 9, 6, 3, a, 0, 7); g.fill(); } g.fillStyle = '#c47a10'; g.beginPath(); g.arc(cx + s * 14, by - H, 5, 0, 7); g.fill(); } } }
      else if (p.k === 'sen') { g.fillStyle = dark; [-26, 22, 2].forEach((dx, k) => { g.beginPath(); g.ellipse(cx + dx, by - 6 - k * 2, 16, 6, 0, 0, 7); g.fill(); }); g.strokeStyle = leaf; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, by - 6); g.lineTo(cx, by - H); g.stroke(); if (f >= 1) { g.fillStyle = wilt ? '#c9a0a8' : '#f28fb0'; for (let k = -2; k <= 2; k++) { g.save(); g.translate(cx, by - H); g.rotate(k * 0.38); g.beginPath(); g.ellipse(0, -14, 8, 18, 0, 0, 7); g.fill(); g.restore(); } } else { g.fillStyle = '#e6a0b4'; g.beginPath(); g.ellipse(cx, by - H, 6, 10, 0, 0, 7); g.fill(); } }
      else if (p.k === 'truc') { for (let s = -1; s <= 1; s++) { const x = cx + s * 14, h = H * (1 - Math.abs(s) * 0.15); g.strokeStyle = leaf; g.lineWidth = 7; g.beginPath(); g.moveTo(x, by - 6); g.lineTo(x, by - h); g.stroke(); g.strokeStyle = dark; g.lineWidth = 2; for (let y = by - 20; y > by - h; y -= 18) { g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.stroke(); } g.fillStyle = leaf; g.beginPath(); g.ellipse(x + 10, by - h + 6, 12, 3, -0.4, 0, 7); g.fill(); } }
      else if (p.k === 'mai' || p.k === 'bode') { g.strokeStyle = '#6a3c1c'; g.lineWidth = 8; g.beginPath(); g.moveTo(cx, by - 6); g.lineTo(cx, by - H * 0.7); g.stroke(); g.lineWidth = 4; [[-1, 0.55], [1, 0.7], [-1, 0.85]].forEach(([s, t]) => { g.beginPath(); g.moveTo(cx, by - H * t * 0.8); g.lineTo(cx + s * 30 * f, by - H * t); g.stroke(); });
        if (p.k === 'bode') { g.fillStyle = leaf; for (let k = 0; k < 14 * f; k++) { const a = k * 2.3; g.beginPath(); g.ellipse(cx + Math.cos(a) * 28 * f, by - H * 0.85 + Math.sin(a) * 18 * f, 7, 9, a, 0, 7); g.fill(); } }
        else { g.fillStyle = f >= 1 ? (wilt ? '#c9b46a' : '#ffd23a') : leaf; for (let k = 0; k < 12 * f; k++) { const a = k * 2.1, x = cx + Math.cos(a) * 26 * f, y = by - H * 0.8 + Math.sin(a) * 16 * f; for (let pp = 0; pp < 5; pp++) { g.beginPath(); g.arc(x + Math.cos(pp * 1.26) * 4, y + Math.sin(pp * 1.26) * 4, 3, 0, 7); g.fill(); } } } }
      else if (p.k === 'lan') { g.strokeStyle = leaf; g.lineWidth = 5; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(cx, by - 6); g.quadraticCurveTo(cx + s * 30, by - 30, cx + s * 40, by - 12); g.stroke(); }); g.lineWidth = 3; g.beginPath(); g.moveTo(cx, by - 6); g.quadraticCurveTo(cx + 10, by - H * 0.7, cx + 22, by - H); g.stroke(); if (f >= 0.6) { g.fillStyle = wilt ? '#a99ab0' : '#a855c8'; [[22, 1], [14, 0.85], [8, 0.7]].forEach(([dx, t]) => { const x = cx + dx, y = by - H * t; for (let pp = 0; pp < 5; pp++) { g.beginPath(); g.ellipse(x + Math.cos(pp * 1.26) * 6, y + Math.sin(pp * 1.26) * 6, 5, 3, pp, 0, 7); g.fill(); } }); } }
      if (wilt) { g.fillStyle = 'rgba(120,80,20,.18)'; g.fillRect(cx - cw * 0.4, by - chh * 0.8, cw * 0.8, chh * 0.8); }
      // nhãn + thanh lớn
      g.fillStyle = 'rgba(40,16,6,.8)'; g.font = '700 13px sans-serif'; g.textAlign = 'center'; g.fillText(`${SEEDS[p.k].icon} ${SEEDS[p.k].n}${wilt ? ' · héo' : ''}`, cx, by + 30);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(cx - 40, by + 37, 80, 6); g.fillStyle = f >= 1 ? '#ffd36b' : '#5fe08a'; g.fillRect(cx - 40, by + 37, 80 * Math.min(1, p.f), 6);
    });
  }
  const myPlots = () => G().map(p => { if (!p) return null; const i = plotInfo(p); return { k: p.k, f: i.n / i.need, wilt: i.wilt }; });

  /* =================== 5. LỄ HỘI · SỰ KIỆN MÙA =================== */
  function season(d) {
    if (FORCE && !d) return FORCE === 'giaothua' ? 'tet' : FORCE;
    const L = lunar(d); if (!L || L.leap) return '';
    if (L.month === 4 && L.day >= 8 && L.day <= 15) return 'phatdan';
    if (L.month === 7 && L.day >= 1 && L.day <= 15) return 'vulan';
    if ((L.month === 12 && L.day >= 23) || (L.month === 1 && L.day <= 7)) return 'tet';
    return '';
  }
  const holy = () => { if (FORCE === 'ram') return true; const L = lunar(); return !!(L && L.feast) || !!season(); };
  const SEASONS = { phatdan: { n: 'Mùa Phật Đản', icon: '🪷', when: '8–15/4 âm lịch', acts: '🛁 Tắm Phật trước chánh điện · 🪷 thả hoa đăng trên hồ' },
    vulan: { n: 'Mùa Vu Lan báo hiếu', icon: '🌹', when: '1–15/7 âm lịch', acts: '🌹 Cài hoa hồng · ✉️ viết thư gửi mẹ · 🪷 thả hoa đăng' },
    tet: { n: 'Tết Nguyên Đán', icon: '🧧', when: '23 tháng Chạp – mùng 7 Tết', acts: '🖌 Xin chữ ông đồ · 🌸 hái lộc · 🔔 thỉnh chuông giao thừa' } };
  function nextDates() {   // ngày dương lịch sắp tới của từng mùa (quét tối đa 400 ngày)
    const out = {}, now = Date.now();
    for (let i = 0; i < 400 && Object.keys(out).length < 3; i++) { const d = new Date(now + i * 86400000), s = season(d); if (s && !out[s]) out[s] = d; }
    return out;
  }
  const doneToday = (k) => T.ev[k] === dayKey();
  const markToday = (k) => { T.ev[k] = dayKey(); save(); };
  let giaoT = '';
  function giaoThuaTick() {
    const d = kinhVN(), L = lunar(d), Ln = lunar(new Date(Date.now() + 86400000));
    const eve = (FORCE === 'giaothua') || (Ln && Ln.month === 1 && Ln.day === 1 && L && L.month === 12);
    const mins = d.getHours() * 60 + d.getMinutes();
    if (eve && mins >= 23 * 60 + 50) { const left = 24 * 60 - mins; if (giaoT !== 'c' + left) { giaoT = 'c' + left; banner('🧨 Giao thừa', `Còn ${left} phút nữa sang năm mới`, 'Mời đại chúng về sân chùa thỉnh chuông'); } }
    const ny = L && L.month === 1 && L.day === 1 && mins < 2;
    if ((ny || (FORCE === 'giaothua' && giaoT === 'c1')) && giaoT !== 'ny' + dayKey()) {
      giaoT = 'ny' + dayKey(); [0, 2500, 5000].forEach(t => setTimeout(() => A.bigBell(), t)); X.petalShower('dragon');
      banner('🎊 Chúc mừng năm mới', 'An khang · thịnh vượng · vạn sự như ý', 'Nam mô Đương Lai Hạ Sanh Di Lặc Tôn Phật'); ticker('🎊 Giao thừa đã điểm · chúc đại chúng năm mới an lạc');
      if (!doneToday('giaothua')) { markToday('giaothua'); addBeads(108); }
    }
  }

  /* ---- vật thể lễ hội trong chùa ---- */
  let props = {}, floating = [], fx = [];
  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55 }, o));
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
  function frontOf(k, x = 0) { const h = W().halls[0]; if (!h || !h.group) return null; return h.group.localToWorld(new THREE.Vector3(x, 0, h.d / 2 + k)); }
  function groundY(p) { const y = W().col.heightAt(p.x, p.z, (p.y || 0) + 2); return y == null ? null : y; }
  function freeSpot(cands) { for (const p of cands) { if (!p) continue; const y = groundY(p); if (y != null && Math.abs(y - (groundY(cands[0]) ?? y)) < 0.6 && !W().burners.some(b => Math.hypot(b.x - p.x, b.z - p.z) < 2.2)) { p.y = y; return p; } } return null; }
  function gateSpot(dx) {
    const Y = (W().layout.yard || [])[0]; if (!Y || !Y.gate) return null; const [gs, gat] = Y.gate, r = Y.r;
    const p = { '+z': [gat + dx, r[3] - 4], '-z': [gat + dx, r[1] + 4], '+x': [r[2] - 4, gat + dx], '-x': [r[0] + 4, gat + dx] }[gs]; return p ? new THREE.Vector3(p[0], Y.y || 0, p[1]) : null;
  }
  function babyBuddha() {   // tượng Phật sơ sinh trong chậu sen (tắm Phật)
    const g = new THREE.Group(), gold = M(0xe2b048, { metalness: 0.6, roughness: 0.3 });
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.55, 24), M(0xb9b2a4)), 0, 0.27, 0));
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), M(0x6aaec6, { metalness: 0.2, roughness: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.53; g.add(water);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 7, pe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), M(0xf2a0bc)); pe.scale.set(0.6, 1.2, 0.5); pe.position.set(Math.cos(a) * 0.32, 0.64, Math.sin(a) * 0.32); pe.rotation.z = Math.cos(a) * 0.5; pe.rotation.x = -Math.sin(a) * 0.5; g.add(pe); }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.42, 12), gold); body.position.y = 0.92; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), gold); head.position.y = 1.2; g.add(head);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 6), gold); arm.position.set(0.12, 1.24, 0); arm.rotation.z = -0.15; g.add(arm);   // tay phải chỉ trời
    const ladle = new THREE.Group(); ladle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), M(0x8a5a2a))); g.add(ladle); ladle.position.set(0.6, 0.75, 0.2); ladle.rotation.z = 0.8;
    return g;
  }
  function ongDo() {   // ông đồ cho chữ: bàn thấp, giấy đỏ, nghiên mực
    const g = new THREE.Group();
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.7), M(0x5a2a12)), 0, 0.18, 0.55));
    [-0.35, 0.3].forEach((x, i) => { const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5), M(0xc8261c, { side: THREE.DoubleSide })); pp.rotation.x = -Math.PI / 2; pp.position.set(x, 0.37, 0.55); pp.rotation.z = i ? 0.2 : -0.1; g.add(pp); });
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.12), M(0x1a1a1a)), 0.55, 0.38, 0.5));
    const av = new Avatar({ look: { g: 'nam', hair: 'ngan', robe: 'nau' }, seed: 41, outline: false }); av.setPose('kneel'); av.update(5, false); g.add(av.root); g.userData.av = av;
    return g;
  }
  function maiTree() {   // cây mai vàng để hái lộc
    const g = new THREE.Group(), wood = M(0x5a3418);
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.5, 14), M(0x9a4a2a)), 0, 0.25, 0));   // chậu
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.6, 8), wood); tr.position.y = 1.2; g.add(tr);
    const fl = M(0xffd23a, { emissive: 0x6a4a00, emissiveIntensity: 0.3 });
    for (let i = 0; i < 9; i++) { const a = i / 9 * 7, b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.9, 6), wood); b.position.set(Math.cos(a) * 0.32, 1.7 + (i % 3) * 0.15, Math.sin(a) * 0.32); b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(b);
      for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), fl); f.position.set(Math.cos(a) * (0.35 + k * 0.07) + (Math.random() - 0.5) * 0.15, 1.75 + (i % 3) * 0.15 + k * 0.05 + (Math.random() - 0.5) * 0.12, Math.sin(a) * (0.35 + k * 0.07) + (Math.random() - 0.5) * 0.15); g.add(f); } }
    for (let i = 0; i < 5; i++) { const env = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.2), M(0xd7261e, { side: THREE.DoubleSide })); const a = i * 1.3; env.position.set(Math.cos(a) * 0.5, 1.6 + i * 0.08, Math.sin(a) * 0.5); env.rotation.y = a; g.add(env); }   // bao lì xì treo cành
    return g;
  }
  function lanternString(a, b, y0, n) {   // dây đèn lồng đỏ giăng giữa hai cột
    const g = new THREE.Group(), red = M(0xd7261e, { emissive: 0xff4020, emissiveIntensity: 0.55 }), gold = M(0xe2b048, { metalness: 0.5 }), pole = M(0x6a2a12);
    [a, b].forEach(p => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, y0 + 0.4, 6), pole); c.position.set(p.x, p.y + (y0 + 0.4) / 2, p.z); g.add(c); });
    const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t + y0 + 0.3 - Math.sin(t * Math.PI) * 0.5; pts.push(new THREE.Vector3(x, y, z)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3a1a0a })));
    for (let i = 1; i < n + 1; i++) { const p = pts[Math.round(i / (n + 1) * 20)], l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), red); l.scale.y = 1.25; l.position.set(p.x, p.y - 0.32, p.z); g.add(l); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8), gold); c.position.set(p.x, p.y - 0.06, p.z); g.add(c); }
    return g;
  }
  function decorate() {
    const L = W().layout, Y = (L.yard || [])[0];
    if (holy() && Y) {   // rằm, mùng Một, ngày vía, mùa lễ: giăng đèn lồng hai bên lối vào và dọc mặt tiền điện
      const [x0, z0, x1, z1] = Y.r, y = Y.y || 0, cx = (x0 + x1) / 2;
      const pairs = []; const f1 = frontOf(4, -6), f2 = frontOf(4, 6); if (f1 && f2) pairs.push([f1, f2]);
      const g1 = gateSpot(-4), g2 = gateSpot(4); if (g1 && g2) pairs.push([g1, g2]);
      pairs.forEach(([a, b]) => { const ya = groundY(a), yb = groundY(b); if (ya == null || yb == null) return; a.y = ya; b.y = yb; add3d(lanternString(a, b, 2.4, 5)); });
    }
    const s = season();
    if (s === 'phatdan') { const p = freeSpot([frontOf(6, 3.6), frontOf(6, -3.6), frontOf(8, 4.5)]); if (p) { const g = babyBuddha(); g.position.copy(p); add3d(g); props.bath = g; } }
    if (s === 'tet') {
      const p = freeSpot([gateSpot(-5.5), gateSpot(5.5), frontOf(9, -5)]); if (p) { const g = ongDo(); g.position.copy(p); g.rotation.y = Math.atan2(-p.x, -p.z) + Math.PI; add3d(g); props.ongdo = g; }
      const m = freeSpot([gateSpot(5.5), gateSpot(-7), frontOf(9, 5)].filter(x => !props.ongdo || !x || x.distanceTo(props.ongdo.position) > 3)); if (m) { const g = maiTree(); g.position.copy(m); add3d(g); props.mai = g; }
    }
  }
  /* ---- nước gần nhất (hồ sen, sông) ---- */
  function nearWater(r = 1.9) {
    const w = W(); if (!w) return null; let best = null;
    for (const b of w.col.waters) { const dx = Math.max(b.min.x - me.pos.x, 0, me.pos.x - b.max.x), dz = Math.max(b.min.z - me.pos.z, 0, me.pos.z - b.max.z), d = Math.hypot(dx, dz); if (d < r && (!best || d < best.d)) best = { d, b }; }
    return best && best.b;
  }
  const waterPoint = (b) => new THREE.Vector3(Math.max(b.min.x + 0.6, Math.min(b.max.x - 0.6, me.pos.x)), b.max.y + 0.02, Math.max(b.min.z + 0.6, Math.min(b.max.z - 0.6, me.pos.z)));
  function arcFx(mesh, from, to, dur, h, done) { add3d(mesh); fx.push({ mesh, from: from.clone(), to: to.clone(), t: 0, dur, h, done }); }
  function releaseFish() {
    const b = nearWater(); if (!b) return; const to = waterPoint(b); me.yaw = Math.atan2(to.x - me.pos.x, to.z - me.pos.z); me.av.setPose('incense'); setTimeout(() => me.av.setPose('idle'), 1800);
    for (let i = 0; i < 5; i++) { const f = new THREE.Group(), m = M([0xf08a24, 0xd7261e, 0xf2c14e][i % 3]); const bd = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m); bd.scale.set(0.6, 0.6, 1.4); f.add(bd); const tl = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), m); tl.rotation.x = Math.PI / 2; tl.position.z = -0.16; f.add(tl);
      const tt = to.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)); setTimeout(() => arcFx(f, new THREE.Vector3(me.pos.x, me.y + 1.1, me.pos.z), tt, 1.1, 1.6, () => ripple(tt)), i * 220); }
    markToday('release'); addBeads(18); const gm = addMerit(20, true); A.khanh(); NET.act('release'); practiced();
    banner('🐟 Phóng sinh', 'Nguyện các loài được tự tại an vui', `+18 hạt${gm ? ' · +' + gm + ' công đức' : ''}`); ticker(`🐟 ${P.name} vừa phóng sinh tại ${temple().name}`);
  }
  function ripple(p) { const r = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.16, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.copy(p); r.position.y += 0.03; add3d(r); fx.push({ mesh: r, ripple: true, t: 0, dur: 1.2 }); }
  function floatLantern(text) {   // hoa đăng: đèn hoa sen trôi trên mặt nước
    const b = nearWater(); if (!b) return; const p = waterPoint(b), g = new THREE.Group();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 7, pe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M(0xf6a0bc, { emissive: 0xff7aa0, emissiveIntensity: 0.35 })); pe.scale.set(0.6, 1.3, 0.4); pe.position.set(Math.cos(a) * 0.14, 0.08, Math.sin(a) * 0.14); pe.rotation.set(-Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6); g.add(pe); }
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false })); flame.position.y = 0.2; flame.scale.y = 1.6; g.add(flame);
    const pl = new THREE.PointLight(0xffb050, 0.6, 3, 2); pl.position.y = 0.3; g.add(pl);
    g.position.copy(p); add3d(g); floating.push({ g, b, v: new THREE.Vector2((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15), ph: Math.random() * 6, lbl: text ? X.label('🪷 ' + text, 'wishlbl') : null });
    while (floating.length > 30) { const o = floating.shift(); scene.remove(o.g); if (o.lbl) o.lbl.remove(); }
    markToday('hoadang'); addBeads(9); const gm = addMerit(10, true); A.khanh(); practiced(); toast(`🪷 Hoa đăng đã trôi trên mặt hồ · +9 hạt${gm ? ' · +' + gm + ' công đức' : ''}`);
  }
  function bathBuddha() {
    const g = props.bath; me.yaw = Math.atan2(g.position.x - me.pos.x, g.position.z - me.pos.z); me.av.setPose('incense'); setTimeout(() => me.av.setPose('idle'), 2400);
    for (let i = 0; i < 14; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0x9fd8ee, transparent: true, opacity: 0.85 })); setTimeout(() => arcFx(d, new THREE.Vector3(g.position.x + 0.5, g.position.y + 1.5, g.position.z + 0.2), new THREE.Vector3(g.position.x + (Math.random() - 0.5) * 0.15, g.position.y + 1.25, g.position.z + (Math.random() - 0.5) * 0.15), 0.5, 0.15), i * 110); }
    markToday('bath'); addBeads(27); const gm = addMerit(20, true); A.khanh(); NET.act('bath'); practiced();
    banner('🛁 Tắm Phật', 'Nguyện gột sạch tham sân si', `+27 hạt${gm ? ' · +' + gm + ' công đức' : ''}`); ticker(`🛁 ${P.name} vừa tắm Phật mừng Phật Đản`);
  }
  const WORDS = [['Phúc', 'Phúc lành đầy nhà'], ['Lộc', 'Tài lộc dồi dào'], ['Thọ', 'Sống lâu mạnh khỏe'], ['An', 'Bình an tự tại'], ['Tâm', 'Giữ tâm trong sáng'], ['Nhẫn', 'Nhẫn nhịn được an vui'], ['Đức', 'Tu nhân tích đức'],
    ['Hòa', 'Gia đình hòa thuận'], ['Hiếu', 'Hiếu kính mẹ cha'], ['Trí', 'Trí tuệ sáng suốt'], ['Thiện', 'Làm lành lánh dữ'], ['Tĩnh', 'Tĩnh lặng mà sáng'], ['Như Ý', 'Vạn sự như ý'], ['Bình An', 'Cả năm bình an']];
  function calligraphy(w) {
    const c = document.createElement('canvas'); c.width = 360; c.height = 500; const g = c.getContext('2d');
    g.fillStyle = '#c8261c'; g.fillRect(0, 0, 360, 500); g.strokeStyle = '#f0c25a'; g.lineWidth = 8; g.strokeRect(14, 14, 332, 472); g.lineWidth = 2; g.strokeRect(26, 26, 308, 448);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,220,120,${Math.random() * 0.25})`; g.beginPath(); g.arc(30 + Math.random() * 300, 30 + Math.random() * 440, Math.random() * 3, 0, 7); g.fill(); }
    g.fillStyle = '#1a0a04'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const big = w[0].length <= 4; g.font = `italic 900 ${big ? 150 : 96}px "Noto Serif", Georgia, serif`;
    if (big) g.fillText(w[0], 180, 230); else w[0].split(' ').forEach((p, i) => g.fillText(p, 180, 170 + i * 120));
    g.font = '600 22px "Be Vietnam Pro", sans-serif'; g.fillStyle = '#ffe9b8'; g.fillText(w[1], 180, 420);
    g.fillStyle = '#e8452c'; g.fillRect(290, 440, 34, 34); g.fillStyle = '#ffe9b8'; g.font = '700 14px serif'; g.fillText('ẤN', 307, 458);
    return c;
  }
  function xinChu() {
    const w = WORDS[(Math.random() * WORDS.length) | 0]; markToday('chu'); if (!T.words.includes(w[0])) T.words.push(w[0]); addBeads(27); save(); A.smallBell();
    modal('🖌 Ông đồ cho chữ', (b) => { const cv = calligraphy(w); cv.className = 'callig'; b.append(cv, el('p', 'note', `Chữ “${w[0]}” — ${w[1]}. Chữ đã lưu vào Bộ sưu tập · +27 hạt`)); });
  }
  const LOC = ['Năm mới an khang, gia đạo bình an', 'Tâm an thì vạn sự an', 'Gieo nhân lành, gặt quả ngọt', 'Sức khỏe dồi dào, công việc hanh thông', 'Hiếu thuận mẹ cha, phúc đức đầy nhà', 'Bớt một phần giận, thêm một phần vui', 'Học hành tấn tới, trí tuệ sáng soi', 'Làm điều lành, nói lời hay'];
  function haiLoc() { const t = LOC[(Math.random() * LOC.length) | 0]; markToday('loc'); addBeads(18); save(); A.khanh(); banner('🌸 Hái lộc đầu xuân', t, '+18 hạt'); }
  function roseForm() {
    modal('🌹 Cài hoa hồng mùa Vu Lan', (b) => {
      b.append(el('p', 'note', 'Bông hồng đỏ cho người còn mẹ, bông hồng trắng tưởng nhớ mẹ đã khuất. Hoa cài trên áo nhân vật suốt mùa Vu Lan.'));
      const row = el('div', 'row'); [['do', '🌹 Hồng đỏ'], ['trang', '🤍 Hồng trắng'], ['', 'Bỏ hoa']].forEach(([v, t]) => row.append(btn(t, v === P.look.rose ? 'gold' : '', () => { equip('rose', v); if (v && !doneToday('rose')) { markToday('rose'); addBeads(9); } closeModal(); toast(v ? '🌹 Đã cài hoa hồng lên áo' : 'Đã tháo hoa'); })));
      b.append(row);
    });
  }
  function letterForm() {
    modal('✉️ Viết thư gửi mẹ', (b) => {
      b.append(el('p', 'note', 'Lời con gửi mẹ sẽ theo ngọn đèn bay lên trước chánh điện.'));
      const ta = el('textarea'); ta.maxLength = 80; ta.rows = 3; ta.placeholder = 'Mẹ ơi, con thương mẹ…'; ta.style.width = '100%'; b.append(ta);
      b.append(btn('🕊 Gửi thư', 'gold', () => { const t = ta.value.trim(); if (t.length < 2) return ta.focus(); closeModal(); X.releaseLantern('✉️ ' + t); markToday('letter'); addBeads(18); }));
    });
  }

  /* =================== 6. HOA SEN ẨN (7 đóa mỗi chùa) =================== */
  let hidden = [];
  function rng(seed) { let s = seed >>> 0; return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; }; }
  function placeHidden() {
    const w = W(), t = temple(), Y = (w.layout.yard || [])[0]; if (!Y) return; const got = T.sen[t.id] || [], R = rng(X.hash('sen' + t.id)), pts = [];
    const hallsBox = w.halls.map(h => ({ p: h.altar, r: Math.max(h.w || 10, h.d || 8) / 2 + 2 }));
    for (let k = 0; k < 400 && pts.length < 7; k++) {
      const x = Y.r[0] + 2 + R() * (Y.r[2] - Y.r[0] - 4), z = Y.r[1] + 2 + R() * (Y.r[3] - Y.r[1] - 4), y = w.col.heightAt(x, z, (Y.y || 0) + 0.6);
      if (y == null || Math.abs(y - (Y.y || 0)) > 0.3 || pts.some(p => Math.hypot(p.x - x, p.z - z) < 6) || w.burners.some(b => Math.hypot(b.x - x, b.z - z) < 2.5)) continue;
      pts.push(new THREE.Vector3(x, y, z));
    }
    pts.forEach((p, i) => {
      if (got.includes(i)) return; const g = new THREE.Group(); g.position.copy(p);
      for (let k = 0; k < 7; k++) { const a = k / 7 * 7, pe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M(0xffb6cf, { emissive: 0xff7aa8, emissiveIntensity: 0.5 })); pe.scale.set(0.6, 1.4, 0.4); pe.position.set(Math.cos(a) * 0.1, 0.12, Math.sin(a) * 0.1); pe.rotation.set(-Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5); g.add(pe); }
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 24), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
      add3d(g); hidden.push({ g, i, ring });
    });
  }
  function hiddenStep(t) {
    hidden.forEach(h => { h.g.position.y += Math.sin(t * 2 + h.i) * 0.0015; h.g.rotation.y += 0.01; h.ring.material.opacity = 0.3 + 0.25 * Math.sin(t * 3 + h.i); });
    const i = hidden.findIndex(h => Math.hypot(h.g.position.x - me.pos.x, h.g.position.z - me.pos.z) < 1.2 && Math.abs(h.g.position.y - me.y) < 1.5); if (i < 0) return;
    const h = hidden.splice(i, 1)[0], id = temple().id; scene.remove(h.g); const L = (T.sen[id] = T.sen[id] || []); L.push(h.i); A.smallBell(); addBeads(9);
    if (L.length >= 7) { addBeads(108); banner('🪷 Ấn Sen', `Tìm đủ 7 hoa sen ẩn tại ${temple().name}`, '+108 hạt · đã lưu vào Bộ sưu tập'); X.petalShower('hall'); } else toast(`🪷 Tìm thấy hoa sen ẩn (${L.length}/7) · +9 hạt`);
    save();
  }

  /* =================== 7. HỒI HƯỚNG · CẦU AN (bảng trong chánh điện) =================== */
  let memList = [], memBoard = null;
  function memLocal() { return (T.mem[temple().id] || []).map(x => Object.assign({ by: P.name, uid: P.uid }, x)); }
  function memMerge(server) { const own = memLocal(), all = (server || []).slice(); own.forEach(o => { if (!all.some(x => x.n === o.n && x.uid === P.uid)) all.push(o); }); return all; }
  function memTex(list) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 720; const g = c.getContext('2d');
    g.fillStyle = '#5a140c'; g.fillRect(0, 0, 512, 720); g.strokeStyle = '#e2b048'; g.lineWidth = 10; g.strokeRect(10, 10, 492, 700); g.lineWidth = 2; g.strokeRect(24, 24, 464, 672);
    g.fillStyle = '#ffd36b'; g.textAlign = 'center'; g.font = '900 34px "Noto Serif", Georgia, serif'; g.fillText('BẢNG HỒI HƯỚNG', 256, 72);
    g.font = '600 18px "Be Vietnam Pro", sans-serif'; g.fillStyle = '#f5d9a8'; g.fillText('Nguyện công đức này hồi hướng khắp tất cả', 256, 102);
    const col = (title, kind, x) => { g.fillStyle = kind === 'sieu' ? '#f2e2b0' : '#ffb0a0'; g.font = '800 20px "Be Vietnam Pro", sans-serif'; g.fillText(title, x, 146);
      const L = list.filter(m => m.kind === kind).slice(-20).reverse(); g.font = '600 19px "Be Vietnam Pro", sans-serif'; g.fillStyle = '#fff1d6';
      L.forEach((m, i) => g.fillText((m.uid === P.uid ? '🪔 ' : '') + m.n, x, 182 + i * 26)); if (!L.length) { g.fillStyle = 'rgba(255,240,210,.5)'; g.fillText('—', x, 182); } };
    col('🕯 CẦU SIÊU', 'sieu', 136); col('🌸 CẦU AN', 'an', 376);
    g.strokeStyle = 'rgba(226,176,72,.5)'; g.beginPath(); g.moveTo(256, 128); g.lineTo(256, 690); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function placeMemBoard() {
    const h = W().halls[0]; if (!h || !h.group || !h.w) return; const lc = h.group.worldToLocal(h.altar.clone());
    const g = new THREE.Group(); g.position.set(-(h.w / 2 - 0.4), lc.y + 0.4, lc.z + 3.2); g.rotation.y = Math.PI / 2;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), new THREE.MeshStandardMaterial({ map: memTex(memMerge(memList)), roughness: 0.7 })); board.position.y = 1.6; g.add(board);
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.5), M(0x5a2a12)), 0, 0.6, 0.2));   // kệ đèn
    for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc860, toneMapped: false })); l.position.set(-0.6 + i * 0.3, 0.72, 0.25); l.scale.y = 1.6; g.add(l); }
    const pl = new THREE.PointLight(0xffb050, 0.7, 4, 1.6); pl.position.set(0, 1.0, 0.6); g.add(pl);
    g.traverse(x => { x.userData.noCollide = true; x.userData.tmp = true; }); h.group.add(g); tmpObjs.push(g); memBoard = board;
  }
  function memRefresh() { if (memBoard) { const old = memBoard.material.map; memBoard.material.map = memTex(memMerge(memList)); memBoard.material.needsUpdate = true; if (old) old.dispose(); } }

  /* =================== 8. BẠN ĐỒNG TU · ĐẠO TRÀNG · TỤNG KINH NHÓM =================== */
  let friends = [], myCode = '', dt = null, socView = null, gdView = null, helpsDay = '';
  NET.onSoc((m) => {
    if (m.op === 'fr') { friends = m.list || []; myCode = m.me || myCode; if (m.added) toast(`🤝 Đã kết bạn đồng tu với ${m.added.name}`); if (socView) socView(); }
    else if (m.op === 'dt') { dt = m.info; if (socView) socView(); checkDtGoal(); }
    else if (m.op === 'err') toast('⚠️ ' + m.msg);
    else if (m.op === 'note') toast(m.msg);
    else if (m.op === 'greet') { addBeads(9); banner('🙏 Lời chúc từ bạn đồng tu', m.from, (m.msg || 'Chúc bạn thân tâm an lạc') + ' · +9 hạt'); A.smallBell(); }
    else if (m.op === 'greeted') { addBeads(9); toast('🙏 Đã gửi lời chúc · +9 hạt'); }
    else if (m.op === 'inbox') { (m.list || []).forEach((x, i) => setTimeout(() => toast(`🙏 ${x.from}: ${x.msg || 'chúc bạn an lạc'}`), i * 1500)); if (m.list && m.list.length) addBeads(9 * Math.min(5, m.list.length)); }
    else if (m.op === 'gd') { if (gdView) gdView(m); }
    else if (m.op === 'watered') { addBeads(5); toast('💧 Đã tưới giúp · +5 hạt'); }
    else if (m.op === 'helps') { if (m.n > 0 && T.gHelp !== m.day) { T.gHelp = m.day; const p = G().find(x => x && !plotInfo(x).ripe); if (p) { p.bonus = (p.bonus || 0) + 1; toast(`💧 ${m.n} bạn đồng tu đã tưới giúp vườn · cây lớn thêm một ngày`); save(); gardenSync(); } } }
    else if (m.op === 'mem') { if (m.temple === (temple() && temple().id)) { memList = m.list || []; memRefresh(); if (socView) socView(); } }
    else if (m.op === 'mem.new') { if (m.temple === temple().id) { memList.push({ n: m.n, kind: m.kind, by: m.by }); memRefresh(); ticker(`🕯 ${m.by} vừa hồi hướng cho ${m.n}`); } }
  });
  let socAsked = false;
  NET.onChange(() => { if (NET.online && !socAsked) { socAsked = true; NET.soc('inbox'); NET.soc('fr.list'); NET.soc('dt.info'); NET.soc('gd.helps'); gardenSync(); } if (NET.online && temple()) NET.soc('mem.list', { temple: temple().id }); });
  let meritBuf = 0, meritT = 0;
  function merit(n) { if (n > 0) meritBuf += n; }
  function checkDtGoal() { if (!dt || dt.total < dt.goal || T.dtClaim === dt.week) return; T.dtClaim = dt.week; addBeads(108); banner('🪷 Đạo tràng viên mãn tuần', dt.name, `Cả đạo tràng đạt ${fmt(dt.goal)} công đức · +108 hạt`); A.bigBell(); save(); }
  let chantSent = 0;
  function chantBeat() {   // gõ mõ khi tụng: báo cho người cùng kênh, tính thưởng tụng chung
    if (Date.now() - chantSent > 60000) { chantSent = Date.now(); NET.act('chant', 'kinh'); }
    practiced();
    const n = NET.chanters(), mult = n >= 4 ? 3 : n >= 1 ? 2 : 1;
    const box = $('cMerit'); if (box && n) box.dataset.group = `🙏 Đang tụng cùng ${n} người · hạt ×${mult}`;
    return mult;
  }

  /* =================== 9. THIỀN CÓ HƯỚNG DẪN =================== */
  const GUIDE = [[0, 'Ngồi thẳng lưng, hai tay đặt nhẹ lên đùi, thả lỏng đôi vai.'], [14, 'Nhắm mắt nhẹ nhàng. Hít vào, biết mình đang hít vào.'], [30, 'Thở ra, biết mình đang thở ra. Không cần cố gắng.'],
    [55, 'Đếm hơi thở từ một đến mười, rồi bắt đầu lại.'], [110, 'Nếu tâm chạy đi đâu đó, nhẹ nhàng đưa về hơi thở.'], [165, 'Cảm nhận thân thể từ đỉnh đầu xuống bàn chân, buông thư từng phần.'],
    [225, 'Mỉm cười nhẹ. Gửi lòng từ đến cha mẹ, người thân và mọi người.'], [270, 'Nguyện cho tất cả chúng sanh được bình an.'], [290, 'Chuẩn bị xả thiền: xoa hai bàn tay, xoa nhẹ mặt, mở mắt.']];
  let guideIdx = -1;
  function guide(sec, inhale) {
    const loop = sec % 300, i = GUIDE.reduce((a, g, k) => g[0] <= loop ? k : a, 0);
    if (i !== guideIdx) { guideIdx = i; try { A.speak(GUIDE[i][1], 'story'); } catch (e) {} }
    const n = Math.floor(sec / 10) % 10 + 1; return `${inhale ? 'Hít vào' : 'Thở ra'} · ${n}\n${GUIDE[i][1]}`;
  }
  function medMinute() {
    const wk = weekKey(); if (T.medWk !== wk) { T.medWk = wk; T.medMin = 0; } T.medMin++; practiced();
    if (T.medMin >= 60 && T.medClaim !== wk) { T.medClaim = wk; addBeads(108); banner('🧘 Chánh niệm trọn tuần', '60 phút thiền trong tuần', '+108 hạt'); } save();
  }

  /* =================== 10. TRUNG TÂM "TU TẬP" =================== */
  function badge() { const b = $('tuBadge'); if (b) b.hidden = !(needWater() || (T.samHoi && T.samHoi.day === dayKey())); }
  function openHub(tab = 'homnay') {
    checkUnlocks();
    modal('🪷 Tu tập', (box) => {
      const tabs = el('div', 'tutabs'), body = el('div', 'tubody'); box.append(tabs, body);
      const TABS = [['homnay', '📅 Hôm nay'], ['vuon', '🌱 Vườn'], ['duong', '☸️ Đường tu'], ['suutap', '🎁 Sưu tập'], ['hoihuong', '🕯 Hồi hướng'], ['ban', '🤝 Bạn đạo'], ['daotrang', '🪷 Đạo tràng']];
      const show = (k) => { [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.k === k)); body.innerHTML = ''; socView = null; gdView = null; VIEWS[k](body); };
      TABS.forEach(([k, t]) => { const b = el('button', '', t); b.dataset.k = k; b.onclick = () => show(k); tabs.append(b); });
      show(tab);
    }, { wide: true });
  }
  const row = (k, v) => { const li = el('li'); li.append(el('span', '', k), el('b', '', v)); return li; };
  /* ---- dòng thời gian trong ngày: thời khóa, giờ sư tụng kinh, lễ rước kiệu ---- */
  const hm = (m) => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`;
  function daySlots() {
    const sc = X.schedule ? X.schedule() : {}, out = [];
    TK.forEach(x => out.push({ ic: x.icon, n: x.name, a: x.h * 60 + (x.m || 0), d: x.dur, note: x.note, gift: 'Dự lễ +27 hạt · mọi hạt ×1,5', c: 'tk', done: !!T.tk[dayKey() + ':' + x.id] }));
    ((sc.kinh && sc.kinh.enabled !== false && sc.kinh.slots) || []).forEach(k => out.push({ ic: '🎧', n: 'Chư tăng tụng kinh', a: k.h * 60 + (k.m || 0), d: k.dur || 60, note: 'Ba vị sư tụng kinh trong chánh điện · vào điện nghe cùng', gift: 'Vào điện ngồi nghe, lạy, lần hạt', c: 'kinh' }));
    const f = sc.fest; if (f) { const [h, m] = f.at.split(':').map(Number); out.push({ ic: '🏮', n: `Rước kiệu · ${f.temple.name}`, a: h * 60 + m, d: Math.round(f.dur / 60), note: 'Đoàn rước đi quanh chánh điện · đến gần bấm "Khiêng kiệu"', gift: 'Khiêng kiệu nhận hạt & công đức', c: 'fest' }); }
    return out.sort((x, y) => x.a - y.a);
  }
  function dayTimeline(b) {
    const d = kinhVN(), now = d.getHours() * 60 + d.getMinutes(), L = daySlots();
    const bar = el('div', 'tlbar'), H0 = 0, H1 = 24 * 60, pos = (m) => ((m - H0) / (H1 - H0) * 100) + '%';
    [0, 4, 8, 12, 16, 20, 24].forEach(h => { const t = el('i', 'tlh', h + 'h'); t.style.left = pos(h * 60); bar.append(t); });
    L.forEach(x => { const s = el('u', 'tls ' + x.c); s.style.left = pos(x.a); s.style.width = `calc(${(x.d / (H1 - H0)) * 100}% + 2px)`; s.title = `${x.ic} ${x.n} ${hm(x.a)}–${hm(x.a + x.d)}`; bar.append(s); });
    const nw = el('b', 'tlnow'); nw.style.left = pos(now); nw.title = 'Bây giờ ' + hm(now); bar.append(nw);
    const lg = el('div', 'tlleg'); lg.innerHTML = '<i class="tk"></i>Thời khóa <i class="kinh"></i>Sư tụng kinh <i class="fest"></i>Rước kiệu <i class="nowi"></i>Bây giờ'; b.append(bar, lg);
    const list = el('div', 'tllist'), rank = (x) => now >= x.a + x.d ? 2 : now >= x.a ? 0 : 1;
    L.slice().sort((x, y) => rank(x) - rank(y) || x.a - y.a).forEach(x => {
      const st = now >= x.a + x.d ? 'past' : now >= x.a ? 'live' : 'soon', left = x.a - now, r = el('div', 'tlrow ' + st);
      const tag = st === 'live' ? `ĐANG DIỄN RA · còn ${x.a + x.d - now} phút` : st === 'past' ? (x.done ? '✓ Đã dự' : 'Đã qua') : left < 60 ? `Còn ${left} phút` : `Còn ${Math.floor(left / 60)} giờ ${left % 60} phút`;
      const tt = el('b', 'tlt'); tt.append(hm(x.a), el('small', '', hm(x.a + x.d))); r.append(tt);
      const mid = el('span', 'tlm'); mid.append(el('b', '', `${x.ic} ${x.n}`), el('small', '', x.note), el('em', '', '🎁 ' + x.gift)); r.append(mid, el('i', 'tltag', tag));
      if (st === 'live' && x.c !== 'fest') { const g = btn('Đến ngay', 'gold', () => { const sc = X.schedule && X.schedule(); if (sc && sc.goHall) sc.goHall(); }); r.append(g); }
      list.append(r);
    });
    b.append(list);
  }
  const VIEWS = {
    homnay(b) {
      const s = tkNow(), nx = tkNext(), L = lunar(), se = season();
      b.append(el('h3', '', '🕰 Lịch sinh hoạt trong ngày (giờ Việt Nam)'));
      dayTimeline(b);
      b.append(el('p', 'note', s ? `Đang ${s.name}: lạy Phật, tụng kinh, lần hạt hoặc thiền để dự lễ (+27 hạt) · mọi hạt nhận được ×1,5.` : `Khóa lễ tới: ${nx.icon} ${nx.name} lúc ${nx.h}:${String(nx.m || 0).padStart(2, '0')}. Đã dự ${T.tkCount} khóa lễ.`));
      b.append(el('h3', '', '🔥 Chuỗi ngày lên chùa'));
      const u2 = el('ul', 'stats'); u2.append(row('Chuỗi hiện tại', `${P.streak || 0} ngày`), row('Kỷ lục', `${T.best || 0} ngày`), row('Mốc thưởng kế tiếp', [7, 14, 21, 30, 100].map(n => `${n}`).find(n => +n > (T.best || 0)) ? `${[7, 14, 21, 30, 100].find(n => n > (T.best || 0))} ngày` : 'Đã đủ')); b.append(u2);
      if (T.samHoi && T.samHoi.day === dayKey()) b.append(el('p', 'note warn', `🙏 Hôm qua bạn lỡ một ngày. Lần tràng hạt tròn 108 hạt hôm nay để giữ lại chuỗi ${T.samHoi.keep} ngày.`), btn('📿 Lần tràng hạt sám hối', 'gold', () => { closeModal(); X.openMala(); }));
      b.append(el('h3', '', `🌕 ${L ? L.text : ''}${L && L.feast ? ' · ' + L.feast.name : ''}`));
      if (holy()) b.append(el('p', 'note', 'Hôm nay chùa giăng đèn. Đến gần hồ nước bấm “🐟 Phóng sinh” (mỗi ngày lễ một lần) · hạt được nhân thêm.'));
      else b.append(el('p', 'note', 'Ngày Rằm và mùng Một: chùa giăng đèn, phóng sinh ở hồ, hạt được nhân ×1,5.'));
      b.append(el('h3', '', '🎊 Lễ hội theo mùa'));
      const nd = nextDates(), u3 = el('ul', 'stats'); Object.entries(SEASONS).forEach(([k, v]) => u3.append(row(`${v.icon} ${v.n}`, se === k ? 'ĐANG DIỄN RA' : nd[k] ? `từ ${nd[k].getDate()}/${nd[k].getMonth() + 1}` : v.when))); b.append(u3);
      if (se) { b.append(el('p', 'note', SEASONS[se].acts)); const r = el('div', 'row');
        if (se === 'vulan') r.append(btn('🌹 Cài hoa hồng', '', roseForm), btn('✉️ Viết thư gửi mẹ', '', () => { closeModal(); letterForm(); }));
        if (se === 'tet' && props.ongdo) r.append(btn('🖌 Đến chỗ ông đồ', '', () => { closeModal(); X.walkTo([props.ongdo.position.clone().add(new THREE.Vector3(0, 0, 1.6))]); }));
        if (r.children.length) b.append(r); }
      b.append(el('h3', '', '🧭 Khám phá'));
      const id = temple().id, u4 = el('ul', 'stats'); u4.append(row('🪷 Hoa sen ẩn ở chùa này', `${(T.sen[id] || []).length}/7`), row('📜 Ấn tri thức (đố sự tích)', `${Object.keys(T.lq).length} chùa`), row('🧘 Thiền tuần này', `${T.medWk === weekKey() ? T.medMin : 0}/60 phút`)); b.append(u4);
      b.append(btn('🎧 Thiền có hướng dẫn 5 phút', 'gold', () => { closeModal(); X.meditate(5, true); }));
    },
    vuon(b) {
      const cv = el('canvas', 'gardencv'); cv.width = 600; cv.height = 380; b.append(cv); drawGarden(cv, myPlots());
      const r = el('div', 'row'); r.append(btn('💧 Tưới cả vườn', 'gold', () => { waterAll(); drawGarden(cv, myPlots()); render(); })); b.append(r);
      const list = el('div', 'plots'); b.append(list);
      const render = () => { list.innerHTML = ''; G().forEach((p, i) => {
        const c = el('div', 'plot'); if (!p) { c.append(el('b', '', `Luống ${i + 1} · trống`)); const sr = el('div', 'row'); Object.entries(SEEDS).forEach(([k, s]) => { const ok = has('seed:' + k); const x = btn(`${s.icon} ${s.n} (${s.days} ngày)`, ok ? '' : 'ghost', () => { if (!ok) return toast('🔒 ' + (UNL.find(u => u[0] === 'seed:' + k) || [])[2]); plant(i, k); drawGarden(cv, myPlots()); render(); }); x.disabled = !ok; sr.append(x); }); c.append(sr); }
        else { const inf = plotInfo(p), s = SEEDS[p.k]; c.append(el('b', '', `${s.icon} ${s.n} · ${inf.n}/${inf.need} ngày${inf.wilt ? ' · đang héo, tưới ngay' : inf.ripe ? ' · đã nở' : inf.today ? ' · đã tưới hôm nay' : ''}`));
          if (inf.ripe) c.append(btn(`🌾 Thu hoạch (+${s.beads} hạt)`, 'gold', () => { harvest(i); drawGarden(cv, myPlots()); render(); })); }
        list.append(c); }); };
      render();
      b.append(el('p', 'note', 'Mỗi ngày tưới một lần, cây lớn thêm một ngày. Bỏ quên 3 ngày cây sẽ héo (tưới lại là hồi). Bạn đồng tu có thể ghé tưới giúp.'));
    },
    duong(b) {
      const r = rank(); b.append(el('h3', '', `${RANKS[r].icon} ${RANKS[r].n}`));
      RANKS.forEach((k, i) => { const c = el('div', 'rankstep' + (i <= r ? ' on' : '')); c.append(el('b', '', `${k.icon} ${k.n}`), el('small', '', k.need)); b.append(c); });
      const ul = el('ul', 'stats'); ul.append(row('Cấp', `${lv()} · ${C.levels[lv() - 1].name}`), row('Ngày lên chùa', P.days), row('Ấn hành hương', stamps()), row('Khóa lễ đã dự', T.tkCount)); b.append(ul);
      b.append(el('p', 'note', 'Mỗi bậc mở thêm áo tràng, tràng hạt, hạt giống cho vườn; bậc Cư sĩ hộ trì được ngồi đệm hàng đầu chánh điện.'));
    },
    suutap(b) {
      b.append(el('h3', '', '👘 Áo tràng'));
      const g1 = el('div', 'colgrid'); Object.entries(ROBE_N).forEach(([k, [n, c]]) => { const ok = has('robe:' + k), x = el('button', 'colitem' + (P.look.robe === k ? ' on' : '') + (ok ? '' : ' lock')); const sw = el('i'); sw.style.background = c; x.append(sw, el('b', '', n), el('small', '', ok ? (P.look.robe === k ? 'Đang mặc' : 'Bấm để mặc') : '🔒 ' + (UNL.find(u => u[0] === 'robe:' + k) || [])[2])); x.onclick = () => { if (!ok) return; equip('robe', k); VIEWS.suutap((b.innerHTML = '', b)); }; g1.append(x); }); b.append(g1);
      b.append(el('h3', '', '📿 Tràng hạt'));
      const g2 = el('div', 'colgrid'); Object.entries(MALA_N).forEach(([k, [n, c]]) => { const ok = has('mala:' + k), cur = (P.look.mala || 'go') === k, x = el('button', 'colitem' + (cur ? ' on' : '') + (ok ? '' : ' lock')); const sw = el('i'); sw.style.background = c; x.append(sw, el('b', '', n), el('small', '', ok ? (cur ? 'Đang đeo' : 'Bấm để đeo') : '🔒 ' + (UNL.find(u => u[0] === 'mala:' + k) || [])[2])); x.onclick = () => { if (!ok) return; equip('mala', k); VIEWS.suutap((b.innerHTML = '', b)); }; g2.append(x); }); b.append(g2);
      b.append(el('h3', '', '📜 Ấn & tượng hành hương'));
      const g3 = el('div', 'stamps'); TEMPLES.filter(t => !t.home).forEach(t => { const on = st(t.id), s = el('div', 'stamp' + (on ? ' on' : ''), (on ? '🛕 ' : '') + t.name.replace('Chùa ', '')); s.title = (T.lq[t.id] ? 'Có Ấn tri thức · ' : '') + ((T.sen[t.id] || []).length >= 7 ? 'Có Ấn Sen' : ''); if (T.lq[t.id]) s.append(el('small', '', ' 📖')); if ((T.sen[t.id] || []).length >= 7) s.append(el('small', '', ' 🪷')); g3.append(s); }); b.append(g3);
      b.append(el('h3', '', '🖌 Chữ thư pháp ngày Tết'), el('p', 'note', T.words.length ? T.words.join(' · ') : 'Chưa có · xin chữ ông đồ dịp Tết'));
      b.append(el('h3', '', '🌾 Hoa nhà trồng'), el('p', 'note', Object.keys(T.flowers).length ? Object.entries(T.flowers).map(([k, n]) => `${SEEDS[k].icon} ${SEEDS[k].n} ×${n}`).join(' · ') : 'Chưa thu hoạch'));
    },
    hoihuong(b) {
      const t = temple(); b.append(el('p', 'note', `Ghi tên người thân để hồi hướng công đức. Tên hiện trên Bảng hồi hướng trong chánh điện ${t.name} (bên trái bàn thờ) và mọi người trong chùa cùng thấy. Mỗi người tối đa 6 tên mỗi chùa.`));
      const name = el('input'); name.maxLength = 30; name.placeholder = 'VD: Cha Nguyễn Văn A · Bà nội'; const kind = el('select'); [['sieu', '🕯 Cầu siêu (đã khuất)'], ['an', '🌸 Cầu an (còn sống)']].forEach(([v, x]) => { const o = el('option', '', x); o.value = v; kind.append(o); });
      b.append(name, kind, btn('🙏 Hồi hướng', 'gold', () => { const n = name.value.trim(); if (n.length < 2) return name.focus(); const own = (T.mem[t.id] = T.mem[t.id] || []); if (own.length >= 6) return toast('Mỗi chùa tối đa 6 tên');
        own.push({ n, kind: kind.value }); addBeads(9); addMerit(10, true); A.khanh(); save(); if (!NET.soc('mem.add', { temple: t.id, n, kind: kind.value })) memRefresh(); name.value = ''; toast(`🕯 Đã hồi hướng cho ${n}`); setTimeout(() => VIEWS.hoihuong((b.innerHTML = '', b)), 200); }));
      const mine = T.mem[t.id] || []; if (mine.length) { b.append(el('h3', '', 'Tên bạn đã ghi ở chùa này')); mine.forEach((m, i) => { const r = el('div', 'row'); r.append(el('span', '', `${m.kind === 'sieu' ? '🕯' : '🌸'} ${m.n}`), btn('Xóa', 'ghost', () => { mine.splice(i, 1); save(); NET.soc('mem.del', { temple: t.id, n: m.n }); memRefresh(); VIEWS.hoihuong((b.innerHTML = '', b)); })); b.append(r); }); }
      const all = memMerge(memList); b.append(el('h3', '', `Đại chúng đã hồi hướng (${all.length})`), el('p', 'note', all.slice(-30).reverse().map(m => `${m.kind === 'sieu' ? '🕯' : '🌸'} ${m.n}`).join(' · ') || 'Chưa có'));
      if (!NET.online) b.append(el('p', 'note warn', 'Đang chơi một mình (chưa nối máy chủ): tên chỉ hiện trên máy bạn.'));
    },
    ban(b) {
      if (!NET.online) { b.append(el('p', 'note warn', 'Bạn đồng tu cần kết nối máy chủ nhiều người chơi. Khi game chạy trên máy chủ của chùa, mục này sẽ hoạt động.')); return; }
      const draw = () => {
        b.innerHTML = ''; b.append(el('p', 'note', `Mã đồng tu của bạn: `), el('div', 'codebox', myCode || '…'));
        const inp = el('input'); inp.maxLength = 8; inp.placeholder = 'Nhập mã đồng tu của bạn bè'; b.append(inp, btn('🤝 Kết bạn', 'gold', () => { const c = inp.value.trim(); if (c.length >= 4) NET.soc('fr.add', { code: c }); }));
        const near = NET.peerList(); if (near.length) b.append(el('p', 'note', `Đang cùng kênh: ${near.map(p => p.name).join(', ')} · xin mã đồng tu qua khung chat để kết bạn.`));
        b.append(el('h3', '', `Bạn đồng tu (${friends.length})`));
        if (!friends.length) b.append(el('p', 'note', 'Chưa có bạn. Gửi mã của bạn cho người thân, bạn bè cùng chơi.'));
        friends.forEach(f => {
          const c = el('div', 'plot'); const tn = (TEMPLES.find(t => t.id === f.temple) || {}).name || '';
          c.append(el('b', '', `${f.online ? '🟢' : '⚪'} ${f.name}`), el('small', '', f.online ? `đang ở ${tn}` : `vắng · ${tn}`));
          const r = el('div', 'row'); r.append(btn('🙏 Gửi lời chúc', '', () => NET.soc('fr.greet', { uid: f.uid, msg: 'Chúc bạn thân tâm an lạc' })), btn('🌱 Thăm vườn', '', () => visitGarden(f, b)));
          if (f.online && f.temple && f.temple !== temple().id) r.append(btn('🛕 Đến chùa', '', () => { closeModal(); X.fade(() => X.loadTemple(f.temple)); }));
          c.append(r); b.append(c);
        });
      };
      socView = draw; draw(); NET.soc('fr.list');
    },
    daotrang(b) {
      if (!NET.online) { b.append(el('p', 'note warn', 'Đạo tràng cần kết nối máy chủ nhiều người chơi.')); return; }
      const draw = () => {
        b.innerHTML = '';
        if (!dt) {
          b.append(el('p', 'note', 'Đạo tràng là nhóm cùng tu: gom công đức chung cả tuần, đạt mục tiêu thì mọi người cùng nhận thưởng.'));
          const nm = el('input'); nm.maxLength = 30; nm.placeholder = 'Tên đạo tràng (VD: Gia đình Phật tử Minh Tâm)'; b.append(nm, btn('🪷 Lập đạo tràng', 'gold', () => NET.soc('dt.create', { name: nm.value.trim() })));
          const cd = el('input'); cd.maxLength = 8; cd.placeholder = 'Mã đạo tràng để gia nhập'; b.append(cd, btn('🙏 Gia nhập', '', () => NET.soc('dt.join', { code: cd.value.trim() })));
          return;
        }
        b.append(el('h3', '', `🪷 ${dt.name}`), el('p', 'note', 'Mã gia nhập (gửi cho thành viên):'), el('div', 'codebox', dt.code));
        const pr = el('div', 'bar big'); const i = el('i'); i.style.width = Math.min(100, dt.total / dt.goal * 100) + '%'; pr.append(i); b.append(el('p', 'note', `Công đức tuần này: ${fmt(dt.total)} / ${fmt(dt.goal)}${dt.total >= dt.goal ? ' · ✅ viên mãn' : ''}`), pr);
        const ul = el('ul', 'stats'); dt.members.forEach(m => ul.append(row(`${m.online ? '🟢' : '⚪'} ${m.name}`, fmt(m.wk)))); b.append(ul);
        b.append(btn('Rời đạo tràng', 'ghost', () => NET.soc('dt.leave')));
      };
      socView = draw; draw(); NET.soc('dt.info');
    }
  };
  function visitGarden(f, b) {
    gdView = (m) => {
      b.innerHTML = ''; b.append(el('h3', '', `🌱 Vườn của ${m.name}`));
      const cv = el('canvas', 'gardencv'); cv.width = 600; cv.height = 380; b.append(cv);
      drawGarden(cv, (m.garden || []).map(x => x && x[0] && SEEDS[x[0]] ? { k: x[0], f: x[1] / 9, wilt: !!x[2] } : null));
      const r = el('div', 'row'); if (!m.helped) r.append(btn('💧 Tưới giúp', 'gold', () => { NET.soc('gd.water', { uid: f.uid }); m.helped = true; gdView(m); })); else r.append(el('span', 'note', '✓ Hôm nay đã tưới giúp'));
      r.append(btn('‹ Quay lại', 'ghost', () => VIEWS.ban(b))); b.append(r);
    };
    NET.soc('gd.get', { uid: f.uid });
  }

  /* =================== ngữ cảnh (nút hành động gần vật thể) =================== */
  const nearP = (p, r) => p && Math.hypot(me.pos.x - p.x, me.pos.z - p.z) < r && Math.abs(me.y - p.y) < 2.5;
  function context() {
    if (!W()) return null;
    if (props.bath && nearP(props.bath.position, 2.4)) return doneToday('bath') ? null : { label: '🛁 Tắm Phật', fn: bathBuddha };
    if (props.ongdo && nearP(props.ongdo.position, 2.6)) return doneToday('chu') ? null : { label: '🖌 Xin chữ ông đồ', fn: xinChu };
    if (props.mai && nearP(props.mai.position, 2.2)) return doneToday('loc') ? null : { label: '🌸 Hái lộc', fn: haiLoc };
    if (nearWater()) {
      const s = season();
      if ((s === 'phatdan' || s === 'vulan') && !doneToday('hoadang')) return { label: '🪷 Thả hoa đăng', fn: () => floatLantern(s === 'vulan' ? 'Vu Lan báo hiếu' : 'Mừng Phật Đản') };
      if (holy() && !doneToday('release')) return { label: '🐟 Phóng sinh', fn: releaseFish };
    }
    return null;
  }

  /* =================== vòng đời theo chùa & mỗi khung hình =================== */
  function dispose() { tmpObjs.forEach(o => { if (o.parent) o.parent.remove(o); }); tmpObjs.length = 0; floating.forEach(o => o.lbl && o.lbl.remove()); floating = []; fx = []; hidden = []; props = {}; memBoard = null; memList = []; }
  function onTemple() { dispose(); try { decorate(); placeHidden(); placeMemBoard(); } catch (e) { console.warn('tuhanh', e); } if (NET.online) NET.soc('mem.list', { temple: temple().id }); }
  let slow = 0;
  function step(delta, t) {
    if (!W()) return; const dt0 = delta;
    hiddenStep(t);
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt0; const k = Math.min(1, f.t / f.dur);
      if (f.ripple) { f.mesh.scale.setScalar(1 + k * 5); f.mesh.material.opacity = 0.8 * (1 - k); }
      else { f.mesh.position.lerpVectors(f.from, f.to, k); f.mesh.position.y += Math.sin(k * Math.PI) * f.h; f.mesh.rotation.x = k * 3; }
      if (k >= 1) { scene.remove(f.mesh); fx.splice(i, 1); if (f.done) f.done(); } }
    floating.forEach(o => { o.g.position.x = Math.max(o.b.min.x + 0.4, Math.min(o.b.max.x - 0.4, o.g.position.x + o.v.x * dt0)); o.g.position.z = Math.max(o.b.min.z + 0.4, Math.min(o.b.max.z - 0.4, o.g.position.z + o.v.y * dt0)); o.g.position.y = o.b.max.y + 0.02 + Math.sin(t * 1.5 + o.ph) * 0.02; if (o.lbl) X.placeLabel(o.lbl, o.g.position, 0.5); });
    if (props.ongdo && props.ongdo.userData.av) props.ongdo.userData.av.update(dt0, false);
    slow += dt0; if (slow > 3) { slow = 0; tkTick(); giaoThuaTick(); }
    meritT += dt0; if (meritT > 20) { meritT = 0; if (meritBuf) { NET.soc('dt.merit', { n: Math.min(200, meritBuf) }); meritBuf = 0; } }
  }
  const binder = $('bTu'); if (binder) binder.onclick = () => openHub();
  setTimeout(() => { checkUnlocks(); badge(); tkTick(); }, 1500);
  setInterval(badge, 60000);

  return {
    beadMult: () => (tkNow() ? 1.5 : 1), practiced, preCheckIn, postCheckIn, malaRound, merit, chantBeat, guide, medMinute,
    quiz(st, ok, isLegend) { const id = temple().id; if (isLegend && ok && !T.lq[id]) { T.lq[id] = 1; addBeads(54); banner('📖 Ấn tri thức', temple().name, 'Trả lời đúng câu đố sự tích · +54 hạt'); save(); } },
    frontSeat: () => has('seat:front'), context, onTemple, dispose, step, openHub, season, holy
  };
}
