/* Cửa hàng hoa sen · quà hằng ngày · nạp tiền (chuyển khoản, admin duyệt)
   Dữ liệu nạp lưu ở Firebase Firestore (khi đã cấu hình trong js/shop-config.js),
   chưa cấu hình thì chạy "chế độ thử" lưu trong trình duyệt này. */
import { fb, hasFirebase } from './fb.js';
const CFG = (window.CBA && CBA.shop) || {};
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/* lễ vật bán bằng hoa sen (mesh: hình dáng đặt trên bàn thờ) */
export const SHOP_ITEMS = [
  { id: 'tramhuong', mesh: 'nen', icon: '🪵', n: 'Trầm hương thượng hạng', price: 30, m: 120 },
  { id: 'denhoa', mesh: 'sen', icon: '🪷', n: 'Đèn hoa đăng', price: 20, m: 80 },
  { id: 'thapnen', mesh: 'nen', icon: '🕯', n: 'Tháp nến 108 ngọn', price: 50, m: 200 },
  { id: 'mamchay', mesh: 'qua', icon: '🍱', n: 'Mâm cỗ chay', price: 80, m: 320 },
  { id: 'sen9', mesh: 'sen', icon: '🌸', n: 'Chín đóa sen vàng', price: 100, m: 450 },
  { id: 'dendau', mesh: 'nen', icon: '🪔', n: 'Đèn dầu trường minh', price: 150, m: 700 }
];

/* hòm công đức: mức cúng dường theo các mức nạp, mỗi mức một chứng nhận & biểu tượng cạnh tên */
export const MERIT_TIERS = [
  { amount: 10000, icon: '🪷', title: 'Tùy Hỷ Công Đức', color: '#e78aa3' },
  { amount: 20000, icon: '🌸', title: 'Thiện Tâm Công Đức', color: '#f2a5c0' },
  { amount: 50000, icon: '🏵️', title: 'Hộ Pháp Công Đức', color: '#e9a23b' },
  { amount: 100000, icon: '📿', title: 'Công Đức Viên Mãn', color: '#c9772a' },
  { amount: 200000, icon: '🏮', title: 'Đại Thí Chủ', color: '#d9332a' },
  { amount: 500000, icon: '☸️', title: 'Hộ Trì Tam Bảo', color: '#f5c542' }
];
export const tierOf = (amount) => MERIT_TIERS.slice().reverse().find(t => amount >= t.amount) || MERIT_TIERS[0];
/* biểu tượng hiển thị cạnh tên: chứng nhận cao nhất đã có */
export function badgeOf(P) { const c = P.certs || []; if (!c.length) return ''; return tierOf(Math.max(...c.map(x => x.amount))).icon; }

export function initShop(ctx) {
  const { P, save, modal, closeModal, el, $, toast, banner, A, fmt, onCert } = ctx;
  P.certs = P.certs || [];
  if (!P.id) { let s = 'CBA'; for (let i = 0; i < 6; i++) s += ID_CHARS[(Math.random() * ID_CHARS.length) | 0]; P.id = s; }
  P.lotus = P.lotus || 0; P.credited = P.credited || {}; P.reqIds = P.reqIds || []; save();   // reqIds: mã các yêu cầu nạp nhân vật đã gửi
  const lotusOf = (vnd) => Math.round(vnd / (CFG.vndPerLotus || 50));
  const contentOf = (vnd, kind) => `${kind === 'donate' ? (CFG.donatePrefix || 'CD') : (CFG.contentPrefix || 'HS')} ${P.id} ${vnd / 1000}K`;
  const vnd = (n) => n.toLocaleString('vi-VN') + 'đ';
  const today = () => { const d = new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const hasFb = hasFirebase;
  const bankOk = !!(CFG.bank && CFG.bank.bank && CFG.bank.account);

  /* ---------- ví hoa sen ---------- */
  const listeners = new Set();
  const changed = () => { save(); listeners.forEach(f => f()); };
  function addLotus(n, why) { P.lotus += n; changed(); if (why) toast(`🪷 +${fmt(n)} hoa sen · ${why}`); }
  function spend(n) { if (P.lotus < n) return false; P.lotus -= n; changed(); return true; }

  /* ---------- quà hằng ngày ---------- */
  function dailyReady() { return P.dailyAt !== today(); }
  function claimDaily() {
    if (!dailyReady()) return toast('Hôm nay đã nhận quà · quay lại ngày mai nhé');
    const d = new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000), y = new Date(d.getTime() - 86400000), yk = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
    P.dailyStreak = P.dailyAt === yk ? (P.dailyStreak || 0) + 1 : 1; P.dailyAt = today();
    const bonus = P.dailyStreak % 7 === 0 ? (CFG.dailyWeekBonus || 50) : 0, n = (CFG.daily || 20) + bonus;
    addLotus(n); A.khanh && A.khanh();
    banner('🎁 Quà hằng ngày', `+${n} hoa sen`, bonus ? `Tròn 7 ngày liên tiếp · thưởng thêm ${bonus}` : `Ngày thứ ${P.dailyStreak} liên tiếp · đủ 7 ngày được thưởng thêm`);
  }

  /* ---------- nơi lưu yêu cầu nạp ---------- */
  const backend = hasFb ? firebaseBackend() : localBackend();
  let myReqs = [], pending = [], isAdmin = false;
  const adminHooks = new Set();
  const onMine = (list) => { myReqs = list; creditApproved(); listeners.forEach(f => f()); };
  const rewatch = () => backend.watchMine(P.id, onMine);
  backend.ready.then(rewatch).catch(e => console.warn('[Nạp]', e));
  const remember = (id) => { if (id && !P.reqIds.includes(id)) { P.reqIds.push(id); if (P.reqIds.length > 60) P.reqIds.splice(0, P.reqIds.length - 60); save(); } };
  // hoa sen về tài khoản khi admin đã chấp nhận
  async function creditApproved(extra) {
    for (const r of (extra || myReqs)) {
      if (r.status !== 'approved' || r.claimed || P.credited[r.id]) continue;
      P.credited[r.id] = true;
      if (r.kind === 'donate') {
        const t = tierOf(r.amount);
        P.certs.push({ id: r.id, amount: r.amount, temple: r.temple || '', templeName: r.templeName || '', at: r.createdAt || Date.now(), name: P.name });
        P.merit = (P.merit || 0) + Math.round(r.amount / 100); changed();
        banner(`${t.icon} Chứng nhận công đức`, t.title, `Đã nhận ${vnd(r.amount)} cúng dường ${r.templeName || ''} · biểu tượng ${t.icon} đã hiện cạnh tên bạn`);
        if (onCert) onCert(r, t);
      } else {
        addLotus(r.lotus);
        banner('🪷 Nạp thành công', `+${fmt(r.lotus)} hoa sen`, `Đã nhận ${vnd(r.amount)} · cảm ơn quý Phật tử đã hộ trì`);
      }
      A.bigBell && A.bigBell();
      try { await backend.claim(r.id); } catch (e) { console.warn('[Nạp] claim', e); }
    }
  }

  function localBackend() {
    const K = 'cba_topups_demo', read = () => { try { return JSON.parse(localStorage.getItem(K) || '[]'); } catch (e) { return []; } };
    const write = (l) => { try { localStorage.setItem(K, JSON.stringify(l)); } catch (e) {} fire(); };
    const subs = []; const fire = () => subs.forEach(f => f(read()));
    addEventListener('storage', (e) => { if (e.key === K) fire(); });
    return {
      mode: 'demo', ready: Promise.resolve(),
      watchMine(pid, cb) { const f = (l) => cb(l.filter(r => r.pid === pid)); subs.push(f); f(read()); },
      async create(req) { const l = read(); const r = Object.assign({ id: 'R' + Date.now().toString(36).toUpperCase(), createdAt: Date.now(), status: 'pending', claimed: false }, req); l.push(r); write(l); return r.id; },
      async claim(id) { const l = read(); const r = l.find(x => x.id === id); if (r) { r.claimed = true; write(l); } },
      async adminLogin(email, pw) { if (pw !== (CFG.demoAdminPassword || 'admin123')) throw new Error('Sai mật khẩu'); return true; },
      async adminLogout() {},
      watchAll(cb) { const f = (l) => cb(l); subs.push(f); f(read()); },
      watchUnclaimed(cb) { const f = (l) => cb(l.filter(r => r.status === 'approved' && !r.claimed)); subs.push(f); f(read()); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
      watchDonations(cb) { const f = (l) => cb(l.filter(r => r.kind === 'donate' && r.status === 'approved')); subs.push(f); f(read()); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
      async decide(id, ok, by) { const l = read(); const r = l.find(x => x.id === id); if (r && r.status === 'pending') { r.status = ok ? 'approved' : 'rejected'; r.decidedAt = Date.now(); r.decidedBy = by; write(l); } }
    };
  }

  function firebaseBackend() {
    let fs, au, db, auth;
    const ready = (async () => {
      const F = await fb(); au = F.au; fs = F.fs; auth = F.auth; db = F.db;
      if (!auth.currentUser) await au.signInAnonymously(auth);
      if (auth.currentUser && !auth.currentUser.isAnonymous && await checkAdmin()) setTimeout(startAdmin, 0);
    })();
    async function checkAdmin() { try { const s = await fs.getDoc(fs.doc(db, 'admins', auth.currentUser.uid)); return s.exists(); } catch (e) { return false; } }
    const rows = (snap) => snap.docs.map(d => Object.assign({ id: d.id }, d.data(), { createdAt: d.data().createdAt && d.data().createdAt.toMillis ? d.data().createdAt.toMillis() : Date.now() }));
    let unMine = null, authHooked = false;
    return {
      mode: 'firebase', ready,
      // theo dõi yêu cầu của tài khoản đang đăng nhập; đăng nhập / đăng xuất tài khoản thì tự theo dõi lại
      // (trước đây đổi đăng nhập giữa chừng làm mất theo dõi → được duyệt nhưng không cộng hoa sen)
      watchMine(pid, cb) {
        if (unMine) unMine(); unMine = null;
        if (auth.currentUser) unMine = fs.onSnapshot(fs.query(fs.collection(db, 'topups'), fs.where('uid', '==', auth.currentUser.uid)),
          (s) => cb(rows(s).filter(r => r.pid === pid || P.reqIds.includes(r.id))), (e) => console.warn('[Nạp]', e));
        if (!authHooked) { authHooked = true; let last = auth.currentUser && auth.currentUser.uid;
          au.onAuthStateChanged(auth, (u) => { const uid = u && u.uid; if (uid !== last) { last = uid; if (u) backend.watchMine(P.id, cb); } }); }
      },
      async create(req) { await ready; const r = await fs.addDoc(fs.collection(db, 'topups'), Object.assign({}, req, { uid: auth.currentUser.uid, status: 'pending', claimed: false, createdAt: fs.serverTimestamp() })); return r.id; },
      watchUnclaimed(cb) { return fs.onSnapshot(fs.query(fs.collection(db, 'topups'), fs.where('status', '==', 'approved'), fs.where('claimed', '==', false)), (s) => cb(rows(s)), (e) => console.warn('[Nạp] chưa nhận', e)); },
      async claim(id) { await fs.updateDoc(fs.doc(db, 'topups', id), { claimed: true, claimedAt: fs.serverTimestamp() }); },
      async adminLogin(email, pw) {
        await ready; await au.signInWithEmailAndPassword(auth, email, pw);
        if (!(await checkAdmin())) { await au.signOut(auth); await au.signInAnonymously(auth); throw new Error('Tài khoản này chưa được cấp quyền admin (thiếu tài liệu admins/<UID>)'); }
        return true;
      },
      async adminLogout() { await au.signOut(auth); await au.signInAnonymously(auth); rewatch(); window.dispatchEvent(new Event('cba-auth-changed')); },
      watchAll(cb) { return fs.onSnapshot(fs.query(fs.collection(db, 'topups'), fs.where('status', '==', 'pending')), (s) => cb(rows(s)), (e) => toast('⚠️ Không đọc được yêu cầu nạp: ' + e.message)); },
      watchDonations(cb) { return fs.onSnapshot(fs.query(fs.collection(db, 'topups'), fs.where('kind', '==', 'donate'), fs.where('status', '==', 'approved')), (s) => cb(rows(s)), (e) => toast('⚠️ Không đọc được hòm công đức: ' + e.message)); },
      async decide(id, ok, by) { await fs.updateDoc(fs.doc(db, 'topups', id), { status: ok ? 'approved' : 'rejected', decidedAt: fs.serverTimestamp(), decidedBy: by || 'admin' }); }
    };
  }

  /* ---------- nạp hoa sen ---------- */
  function qrUrl(amount, kind) {
    const b = CFG.bank; if (!bankOk) return '';
    return `https://img.vietqr.io/image/${encodeURIComponent(b.bank)}-${encodeURIComponent(b.account)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(contentOf(amount, kind))}&accountName=${encodeURIComponent(b.owner || '')}`;
  }
  const copyBtn = (text) => { const c = el('button', 'btn sm', '📋 Chép'); c.onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Đã chép: ' + text), () => toast(text)); }; return c; };
  function openTopup() {
    if (CFG.topupEnabled === false) return toast('🎁 Game đang miễn phí · tạm ngưng nạp hoa sen. Nhận hoa sen qua quà hằng ngày nhé!');
    modal('➕ Nạp hoa sen', (b) => {
      b.append(el('p', 'note', `10.000đ = ${lotusOf(10000)} hoa sen · Mã nhân vật của bạn: ${P.id}`));
      const grid = el('div', 'packs');
      (CFG.packs || []).forEach(v => { const p = el('button', 'pack'); p.append(el('b', '', `🪷 ${fmt(lotusOf(v))}`), el('small', '', vnd(v))); p.onclick = () => payStep(b, v); grid.append(p); });
      b.append(grid);
      if (backend.mode === 'demo') b.append(el('p', 'note warn', 'Đang ở chế độ thử (chưa cấu hình Firebase): yêu cầu nạp chỉ lưu trong trình duyệt này để xem thử luồng duyệt.'));
      b.append(myList());
    }, { wide: true });
  }
  function payStep(b, amount, don) {
    if (CFG.topupEnabled === false) return;   // tạm ẩn số tài khoản
    [...b.children].forEach((c, i) => { if (i) c.remove(); });
    const kind = don ? 'donate' : 'topup', content = contentOf(amount, kind), L = don ? 0 : lotusOf(amount), box = el('div', 'pay');
    const qr = qrUrl(amount, kind);
    if (qr) { const im = el('img', 'qr'); im.alt = 'Mã QR chuyển khoản'; im.src = qr; im.onerror = () => { im.replaceWith(el('p', 'note warn', 'Không tải được ảnh QR · vui lòng chuyển khoản theo thông tin bên dưới.')); }; box.append(im); }
    else box.append(el('p', 'note warn', 'Chùa chưa điền tài khoản nhận tiền (js/shop-config.js → bank).'));
    const rows = el('div', 'payinfo');
    const row = (k, v, copy) => { const r = el('div', 'prow'); r.append(el('span', '', k), el('b', '', v)); if (copy) r.append(copyBtn(copy)); rows.append(r); };
    row('Ngân hàng', CFG.bank.bankName || CFG.bank.bank || '—');
    row('Số tài khoản', CFG.bank.account || '—', CFG.bank.account || '');
    { const ct = (CBA.shop && CBA.shop.contact) || {}, ph = ct.phone || '0938.225.268', fp = ct.facebook || 'https://www.facebook.com/share/19u9bTRswX/';
      const r = el('div', 'prow pnote'); r.append(el('span', '', '💬 Hãy nhắn tin cho admin'));
      const v = el('b'); const t = el('a', '', ph); t.href = 'tel:' + ph.replace(/[^0-9]/g, ''); const f = el('a', '', 'Fanpage'); f.href = fp; f.target = '_blank'; f.rel = 'noopener';
      v.append(t, document.createTextNode(' · '), f); r.append(v); rows.append(r); }
    row('Chủ tài khoản', CFG.bank.owner || '—');
    row('Số tiền', vnd(amount), String(amount));
    row('Nội dung CK', content, content);
    box.append(rows, el('p', 'note', don ? `Sau khi chùa xác nhận đã nhận, bạn được cấp chứng nhận "${tierOf(amount).title}" ${tierOf(amount).icon} và biểu tượng hiện cạnh tên. Ghi đúng nội dung chuyển khoản để được duyệt nhanh.` : `Nhận ${fmt(L)} hoa sen sau khi chùa xác nhận đã nhận tiền. Ghi đúng nội dung chuyển khoản để được duyệt nhanh.`));
    const done = el('button', 'btn gold', '✅ Tôi đã chuyển khoản');
    done.onclick = async () => {
      done.disabled = true; done.textContent = 'Đang gửi…';
      try {
        const req = { kind, pid: P.id, name: P.name, amount, lotus: L, content };
        if (don) Object.assign(req, { temple: don.id, templeName: don.name });
        remember(await backend.create(req)); toast(don ? '🙏 Đã ghi nhận tâm cúng dường · chờ chùa xác nhận' : '📨 Đã gửi yêu cầu · chờ chùa xác nhận'); closeModal(); don ? openDonate(don) : openTopup();
      }
      catch (e) { done.disabled = false; done.textContent = '✅ Tôi đã chuyển khoản'; toast('⚠️ Không gửi được: ' + e.message); }
    };
    const back = el('button', 'btn', '← Chọn mức khác'); back.onclick = () => { closeModal(); don ? openDonate(don) : openTopup(); };
    const r2 = el('div', 'row'); r2.append(back, done); box.append(r2); b.append(box);
  }
  function myList() {
    const mine = myReqs.filter(r => r.kind !== 'donate');
    const w = el('div'); if (!mine.length) return w;
    w.append(el('h3', '', '📜 Yêu cầu nạp của bạn'));
    const ul = el('div', 'reqs');
    mine.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8).forEach(r => {
      const st = { pending: '⏳ Chờ duyệt', approved: '✅ Đã cộng', rejected: '❌ Từ chối' }[r.status] || r.status;
      const it = el('div', 'req ' + r.status); it.append(el('b', '', `${vnd(r.amount)} → 🪷 ${fmt(r.lotus)}`), el('small', '', `${new Date(r.createdAt).toLocaleString('vi-VN')} · ${r.content}`), el('em', '', st)); ul.append(it);
    });
    w.append(ul); return w;
  }

  /* ---------- admin: bảng duyệt nạp ---------- */
  let unAll = null, seen = new Set();
  function startAdmin() {
    isAdmin = true; $('bAdmin').hidden = false;
    unAll = backend.watchAll((list) => {
      pending = list.filter(r => r.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
      const fresh = pending.filter(r => !seen.has(r.id)); pending.forEach(r => seen.add(r.id));
      if (fresh.length && seen.size > fresh.length) { toast(`🔔 Có ${fresh.length} yêu cầu nạp mới`); A.smallBell && A.smallBell(); }
      const badge = $('adminBadge'); badge.textContent = pending.length; badge.hidden = !pending.length;
      adminHooks.forEach(f => f());
    });
  }
  async function adminLogin() {
    modal('🛡 Đăng nhập quản trị', (b) => {
      const em = el('input'); em.type = 'email'; em.placeholder = 'Email admin (Firebase)'; em.autocomplete = 'username';
      const pw = el('input'); pw.type = 'password'; pw.placeholder = 'Mật khẩu'; pw.autocomplete = 'current-password';
      const err = el('p', 'note warn'); err.hidden = true;
      const go = el('button', 'btn gold', 'Đăng nhập');
      go.onclick = async () => { go.disabled = true; try { await backend.adminLogin(em.value.trim(), pw.value); closeModal(); startAdmin(); toast('🛡 Đã vào chế độ quản trị'); openAdmin(); } catch (e) { err.hidden = false; err.textContent = e.message; go.disabled = false; } };
      if (backend.mode === 'demo') { em.hidden = true; b.append(el('p', 'note', `Chế độ thử: mật khẩu tạm là "${CFG.demoAdminPassword || 'admin123'}" (đổi trong js/shop-config.js). Khi đã cấu hình Firebase, đăng nhập bằng email/mật khẩu admin.`)); }
      b.append(em, pw, err, go);
    });
  }
  function openAdmin() {
    if (!isAdmin) return adminLogin();
    modal('🛡 Duyệt nạp & công đức', (b) => {
      const box = el('div');
      const paint = () => {
        box.innerHTML = '';
        if (!pending.length) box.append(el('p', 'note', 'Chưa có yêu cầu nạp nào đang chờ. Bảng tự cập nhật khi có người bấm "Tôi đã chuyển khoản".'));
        pending.forEach(r => {
          const it = el('div', 'req pending'); const info = el('div');
          const what = r.kind === 'donate' ? `💝 Cúng hòm công đức ${r.templeName || ''} → chứng nhận ${tierOf(r.amount).icon} ${tierOf(r.amount).title}` : `🪷 Nạp → ${fmt(r.lotus)} hoa sen`;
          info.append(el('b', '', `${r.name || '—'} · ${r.pid} · ${vnd(r.amount)}`), el('small', '', `${what} · ${new Date(r.createdAt).toLocaleString('vi-VN')}`), el('code', '', r.content), el('small', '', 'Mã yêu cầu: ' + r.id));
          if (r.kind === 'donate') it.classList.add('don');
          const ok = el('button', 'btn gold sm', '✅ Chấp nhận'), no = el('button', 'btn sm', '❌ Từ chối');
          ok.onclick = async () => { ok.disabled = no.disabled = true; try { await backend.decide(r.id, true, P.name); if (r.pid === P.id) creditApproved([Object.assign({}, r, { status: 'approved' })]);   /* admin duyệt cho chính nhân vật trên máy này */ toast(r.kind === 'donate' ? `✅ Đã cấp chứng nhận ${tierOf(r.amount).title} cho ${r.name}` : `✅ Đã cộng ${fmt(r.lotus)} hoa sen cho ${r.name}`); } catch (e) { toast('⚠️ ' + e.message); ok.disabled = no.disabled = false; } };
          no.onclick = async () => { if (!confirm(`Từ chối yêu cầu ${vnd(r.amount)} của ${r.name}?`)) return; ok.disabled = no.disabled = true; try { await backend.decide(r.id, false, P.name); } catch (e) { toast('⚠️ ' + e.message); ok.disabled = no.disabled = false; } };
          const act = el('div', 'row'); act.append(ok, no); it.append(info, act); box.append(it);
        });
      };
      // đã duyệt nhưng người chơi chưa nhận được (thường do họ đổi đăng nhập sau khi gửi) → admin thấy để xử lý
      const un = el('div'); let unOff = null;
      const paintUn = (l) => { un.innerHTML = ''; if (!l.length) return; un.append(el('h3', '', `⏳ Đã duyệt, người chơi chưa nhận (${l.length})`));
        l.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20).forEach(r => { const it = el('div', 'req'); const info = el('div');
          info.append(el('b', '', `${r.name || '—'} · ${r.pid} · ${vnd(r.amount)}`), el('small', '', `${r.kind === 'donate' ? '💝 Công đức' : '🪷 ' + fmt(r.lotus) + ' hoa sen'} · duyệt ${r.decidedAt && r.decidedAt.toDate ? r.decidedAt.toDate().toLocaleString('vi-VN') : ''} · mã ${r.id}`));
          it.append(info, copyBtn(r.id)); un.append(it); }); };
      if (backend.watchUnclaimed) unOff = backend.watchUnclaimed(paintUn);
      paint(); adminHooks.add(paint);
      const out = el('button', 'btn sm', 'Thoát quản trị'); out.onclick = async () => { await backend.adminLogout(); isAdmin = false; if (unAll) unAll(); $('bAdmin').hidden = true; closeModal(); toast('Đã thoát chế độ quản trị'); };
      b.append(el('p', 'note', 'Kiểm tra tài khoản ngân hàng: thấy tiền về đúng số tiền & nội dung thì bấm "Chấp nhận" — hoa sen tự chuyển về người chơi.'), box, un, out);
      const cleanup = () => { adminHooks.delete(paint); if (unOff) unOff(); }; setTimeout(() => { const v = $('veil'); const obs = new MutationObserver(() => { if (v.hidden) { cleanup(); obs.disconnect(); } }); obs.observe(v, { attributes: true }); }, 0);
    }, { wide: true });
  }
  backend.ready.then(() => { if (isAdmin) startAdmin(); });

  /* ---------- hòm công đức ---------- */
  function openDonate(temple) {
    if (CFG.topupEnabled === false) return toast('🎁 Game đang miễn phí · hòm công đức tạm ngưng nhận cúng dường');
    modal(`💝 Hòm công đức · ${temple.name}`, (b) => {
      b.append(el('p', 'note', 'Phát tâm cúng dường tùy hỷ để duy trì hương đăng, tu bổ chùa. Mỗi mức cúng dường được cấp một chứng nhận công đức và biểu tượng cạnh tên nhân vật.'));
      if (isAdmin) b.append(adminStats(temple));
      const grid = el('div', 'packs tiers');
      MERIT_TIERS.forEach(t => {
        const p = el('button', 'pack tier'); p.style.setProperty('--tc', t.color);
        p.append(el('span', 'ti', t.icon), el('b', '', vnd(t.amount)), el('small', '', t.title));
        p.onclick = () => payStep(b, t.amount, temple); grid.append(p);
      });
      b.append(grid);
      const wait = myReqs.filter(r => r.kind === 'donate' && r.status === 'pending');
      if (wait.length) b.append(el('p', 'note', `⏳ ${wait.length} lần cúng dường đang chờ chùa xác nhận: ${wait.map(r => vnd(r.amount)).join(', ')}`));
      if (backend.mode === 'demo') b.append(el('p', 'note warn', 'Chế độ thử (chưa cấu hình Firebase): yêu cầu chỉ lưu trong trình duyệt này.'));
      b.append(certList());
    }, { wide: true });
  }
  function certList() {
    const w = el('div'); if (!P.certs.length) return w;
    w.append(el('h3', '', '📜 Chứng nhận công đức của bạn'));
    const ul = el('div', 'certs');
    P.certs.slice().sort((a, b) => b.at - a.at).forEach(c => {
      const t = tierOf(c.amount), it = el('button', 'cert'); it.style.setProperty('--tc', t.color);
      it.append(el('span', 'ti', t.icon), el('b', '', t.title), el('small', '', `${vnd(c.amount)} · ${c.templeName || ''} · ${new Date(c.at).toLocaleDateString('vi-VN')}`));
      it.onclick = () => showCert(c); ul.append(it);
    });
    w.append(ul); return w;
  }
  function showCert(c) {
    const cv = certCanvas(c), url = cv.toDataURL('image/png');
    modal('📜 Giấy chứng nhận công đức', (b) => {
      const im = el('img', 'certimg'); im.src = url; im.alt = 'Giấy chứng nhận công đức'; b.append(im);
      const r = el('div', 'row'), dl = el('a', 'btn gold', '⬇️ Lưu ảnh chứng nhận'); dl.href = url; dl.download = `chung-nhan-cong-duc-${P.id}-${c.amount / 1000}k.png`;
      r.append(dl); b.append(r);
    }, { wide: true });
  }
  function certCanvas(c) {
    const t = tierOf(c.amount), W = 1400, H = 990, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const k = cv.getContext('2d');
    const bg = k.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7); bg.addColorStop(0, '#fff8e6'); bg.addColorStop(1, '#f0d9a6'); k.fillStyle = bg; k.fillRect(0, 0, W, H);
    k.strokeStyle = '#8e1a0e'; k.lineWidth = 26; k.strokeRect(30, 30, W - 60, H - 60);
    k.strokeStyle = '#d4a03a'; k.lineWidth = 6; k.strokeRect(62, 62, W - 124, H - 124); k.lineWidth = 2; k.strokeRect(76, 76, W - 152, H - 152);
    // hoa văn góc
    [[90, 90], [W - 90, 90], [90, H - 90], [W - 90, H - 90]].forEach(([x, y]) => { k.save(); k.translate(x, y); k.fillStyle = '#d4a03a'; for (let i = 0; i < 8; i++) { k.rotate(Math.PI / 4); k.beginPath(); k.ellipse(0, 18, 7, 18, 0, 0, 7); k.fill(); } k.fillStyle = '#8e1a0e'; k.beginPath(); k.arc(0, 0, 8, 0, 7); k.fill(); k.restore(); });
    // bánh xe pháp mờ ở nền
    k.save(); k.globalAlpha = 0.07; k.translate(W / 2, H / 2 + 40); k.strokeStyle = '#8e1a0e'; k.lineWidth = 18; k.beginPath(); k.arc(0, 0, 260, 0, 7); k.stroke(); k.beginPath(); k.arc(0, 0, 60, 0, 7); k.stroke();
    for (let i = 0; i < 8; i++) { k.rotate(Math.PI / 4); k.beginPath(); k.moveTo(0, 60); k.lineTo(0, 260); k.stroke(); } k.restore();
    k.textAlign = 'left'; k.textBaseline = 'middle'; const serif = "Georgia, 'Times New Roman', serif", emo = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
    // đo rồi tự canh giữa (không dựa vào textAlign: Safari iPhone đo sai khi chữ lẫn biểu tượng) · tự thu nhỏ chữ nếu dài quá khung
    const fit = (txt, style, size, maxW, fam = serif) => { let sz = size; k.font = `${style} ${sz}px ${fam}`; while (k.measureText(txt).width > maxW && sz > 12) { sz -= 2; k.font = `${style} ${sz}px ${fam}`; } return k.measureText(txt).width; };
    const put = (txt, style, size, y, maxW = W - 260, cx = W / 2) => { const w = fit(txt, style, size, maxW); k.fillText(txt, cx - w / 2, y); return w; };
    k.fillStyle = '#8e1a0e'; put('NAM MÔ BỔN SƯ THÍCH CA MÂU NI PHẬT', '700', 30, 140);
    put('GIẤY CHỨNG NHẬN CÔNG ĐỨC', '900', 76, 230, W - 300);
    k.fillStyle = '#6a4a1a'; put(`${c.templeName || 'Chùa'} trân trọng chứng nhận Phật tử`, 'italic', 30, 315);
    k.fillStyle = '#8e1a0e'; put(c.name || P.name, '900', 82, 410, W - 400);
    k.fillStyle = '#6a4a1a'; put(`Mã nhân vật: ${P.id}`, '600', 26, 470);
    put(`đã phát tâm cúng dường vào hòm công đức số tịnh tài ${vnd(c.amount)}`, '', 30, 535);
    // danh hiệu: biểu tượng và chữ đo riêng, ô bo tròn vừa khít chữ
    const iw = fit(t.icon, '', 50, 80, emo), tw = fit(t.title, '900', 54, 760), gap = 18, tot = iw + gap + tw, pw = Math.max(520, tot + 120), px = W / 2 - pw / 2;
    k.fillStyle = t.color; k.beginPath(); k.roundRect ? k.roundRect(px, 585, pw, 110, 55) : k.rect(px, 585, pw, 110); k.fill();
    k.shadowColor = 'rgba(0,0,0,.35)'; k.shadowBlur = 6;
    k.font = `50px ${emo}`; k.fillStyle = '#fff'; k.fillText(t.icon, W / 2 - tot / 2, 642);
    fit(t.title, '900', 54, 760); k.fillText(t.title, W / 2 - tot / 2 + iw + gap, 642); k.shadowBlur = 0;
    k.fillStyle = '#6a4a1a'; put('Nguyện đem công đức này hướng về khắp tất cả, đệ tử và chúng sanh đều trọn thành Phật đạo.', 'italic', 28, 755, W - 380);
    const d = new Date(c.at); k.font = `26px ${serif}`; k.fillText(`Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`, 150, 860);
    put(`Mã chứng nhận: ${String(c.id).slice(-10).toUpperCase()}`, '', 26, 905, 520, W / 2 - 80);
    // con dấu đỏ
    k.save(); k.translate(W - 255, 842); k.rotate(-0.12); k.strokeStyle = '#c0261b'; k.fillStyle = 'rgba(192,38,27,.1)'; k.lineWidth = 8; k.beginPath(); k.arc(0, 0, 80, 0, 7); k.fill(); k.stroke(); k.lineWidth = 3; k.beginPath(); k.arc(0, 0, 66, 0, 7); k.stroke();
    k.fillStyle = '#c0261b'; k.textAlign = 'center'; k.font = `900 22px ${serif}`; k.fillText('CÔNG ĐỨC', 0, -20); k.font = `900 34px ${serif}`; k.fillText('☸', 0, 14); k.font = `700 13px ${serif}`; k.fillText((c.templeName || '').toUpperCase().slice(0, 18), 0, 44); k.restore();
    return cv;
  }
  /* admin bấm vào hòm công đức: xem tổng đã nhận */
  function adminStats(temple) {
    const w = el('div', 'mstats'); let un = null;
    const paint = (list) => {
      w.innerHTML = '';
      const all = list.reduce((s, r) => s + r.amount, 0), here = list.filter(r => r.temple === temple.id), sum = here.reduce((s, r) => s + r.amount, 0);
      const pend = pending.filter(r => r.kind === 'donate');
      const tiles = el('div', 'mtiles');
      [[`💝 ${temple.name}`, vnd(sum), `${here.length} lượt cúng dường`], ['🏯 Tất cả các chùa', vnd(all), `${list.length} lượt · ${new Set(list.map(r => r.pid)).size} Phật tử`], ['⏳ Chờ xác nhận', String(pend.length), pend.length ? vnd(pend.reduce((s, r) => s + r.amount, 0)) : 'không có']]
        .forEach(([k, v, sub]) => { const t = el('div', 'mtile'); t.append(el('small', '', k), el('b', '', v), el('span', '', sub)); tiles.append(t); });
      w.append(el('h3', '', '🛡 Quản trị · tổng công đức đã nhận'), tiles);
      const byT = {}; list.forEach(r => { const n = r.templeName || r.temple || '—'; byT[n] = (byT[n] || 0) + r.amount; });
      const rowsT = Object.entries(byT).sort((a, b) => b[1] - a[1]);
      if (rowsT.length) { const tb = el('div', 'mtable'); rowsT.forEach(([n, v]) => { const r = el('div', ''); r.append(el('span', '', n), el('b', '', vnd(v))); tb.append(r); }); w.append(el('small', 'mcap', 'Theo từng chùa'), tb); }
      const recent = here.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
      if (recent.length) { const tb = el('div', 'mtable'); recent.forEach(r => { const x = el('div', ''); x.append(el('span', '', `${tierOf(r.amount).icon} ${r.name} · ${new Date(r.createdAt).toLocaleDateString('vi-VN')}`), el('b', '', vnd(r.amount))); tb.append(x); }); w.append(el('small', 'mcap', `Gần đây tại ${temple.name}`), tb); }
      if (pend.length) { const go = el('button', 'btn sm gold', `Duyệt ${pend.length} yêu cầu đang chờ`); go.onclick = () => { closeModal(); openAdmin(); }; w.append(go); }
    };
    paint([]);
    un = backend.watchDonations(paint);
    setTimeout(() => { const v = $('veil'); const obs = new MutationObserver(() => { if (v.hidden || !w.isConnected) { if (un) un(); obs.disconnect(); } }); obs.observe(v, { attributes: true, childList: true }); }, 0);
    return w;
  }

  return {
    get payOpen() { return CFG.topupEnabled !== false; }, get lotus() { return P.lotus; }, get mode() { return backend.mode; }, get isAdmin() { return isAdmin; },
    items: SHOP_ITEMS, spend, addLotus, dailyReady, claimDaily, openTopup, openAdmin, adminLogin, openDonate, certList, showCert,
    onChange(f) { listeners.add(f); }, myList
  };
}
