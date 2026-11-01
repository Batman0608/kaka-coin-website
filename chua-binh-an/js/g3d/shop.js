/* Cửa hàng hoa sen · quà hằng ngày · nạp tiền (chuyển khoản, admin duyệt)
   Dữ liệu nạp lưu ở Firebase Firestore (khi đã cấu hình trong js/shop-config.js),
   chưa cấu hình thì chạy "chế độ thử" lưu trong trình duyệt này. */
const CFG = (window.CBA && CBA.shop) || {};
const FB_VER = '10.12.2';
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

export function initShop(ctx) {
  const { P, save, modal, closeModal, el, $, toast, banner, A, fmt } = ctx;
  if (!P.id) { let s = 'CBA'; for (let i = 0; i < 6; i++) s += ID_CHARS[(Math.random() * ID_CHARS.length) | 0]; P.id = s; }
  P.lotus = P.lotus || 0; P.credited = P.credited || {}; save();
  const lotusOf = (vnd) => Math.round(vnd / (CFG.vndPerLotus || 50));
  const contentOf = (vnd) => `${CFG.contentPrefix || 'HS'} ${P.id} ${vnd / 1000}K`;
  const vnd = (n) => n.toLocaleString('vi-VN') + 'đ';
  const today = () => { const d = new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const hasFb = !!(CFG.firebase && CFG.firebase.apiKey && CFG.firebase.projectId);
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
  backend.ready.then(() => backend.watchMine(P.id, (list) => { myReqs = list; creditApproved(); listeners.forEach(f => f()); })).catch(e => console.warn('[Nạp]', e));
  // hoa sen về tài khoản khi admin đã chấp nhận
  async function creditApproved() {
    for (const r of myReqs) {
      if (r.status !== 'approved' || r.claimed || P.credited[r.id]) continue;
      P.credited[r.id] = true; addLotus(r.lotus);
      banner('🪷 Nạp thành công', `+${fmt(r.lotus)} hoa sen`, `Đã nhận ${vnd(r.amount)} · cảm ơn quý Phật tử đã hộ trì`);
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
      async decide(id, ok, by) { const l = read(); const r = l.find(x => x.id === id); if (r && r.status === 'pending') { r.status = ok ? 'approved' : 'rejected'; r.decidedAt = Date.now(); r.decidedBy = by; write(l); } }
    };
  }

  function firebaseBackend() {
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    let fs, au, db, auth;
    const ready = (async () => {
      const [appM, authM, fsM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
      au = authM; fs = fsM;
      const app = appM.initializeApp(CFG.firebase); auth = au.getAuth(app); db = fs.getFirestore(app);
      await new Promise(res => { const off = au.onAuthStateChanged(auth, (u) => { off(); res(u); }); });
      if (!auth.currentUser) await au.signInAnonymously(auth);
      if (auth.currentUser && !auth.currentUser.isAnonymous) isAdmin = await checkAdmin();
    })();
    async function checkAdmin() { try { const s = await fs.getDoc(fs.doc(db, 'admins', auth.currentUser.uid)); return s.exists(); } catch (e) { return false; } }
    const rows = (snap) => snap.docs.map(d => Object.assign({ id: d.id }, d.data(), { createdAt: d.data().createdAt && d.data().createdAt.toMillis ? d.data().createdAt.toMillis() : Date.now() }));
    let unMine = null;
    return {
      mode: 'firebase', ready,
      watchMine(pid, cb) { if (unMine) unMine(); unMine = fs.onSnapshot(fs.query(fs.collection(db, 'topups'), fs.where('uid', '==', auth.currentUser.uid)), (s) => cb(rows(s).filter(r => r.pid === pid)), (e) => console.warn('[Nạp]', e)); },
      async create(req) { await ready; const r = await fs.addDoc(fs.collection(db, 'topups'), Object.assign({}, req, { uid: auth.currentUser.uid, status: 'pending', claimed: false, createdAt: fs.serverTimestamp() })); return r.id; },
      async claim(id) { await fs.updateDoc(fs.doc(db, 'topups', id), { claimed: true, claimedAt: fs.serverTimestamp() }); },
      async adminLogin(email, pw) {
        await ready; await au.signInWithEmailAndPassword(auth, email, pw);
        if (!(await checkAdmin())) { await au.signOut(auth); await au.signInAnonymously(auth); throw new Error('Tài khoản này chưa được cấp quyền admin (thiếu tài liệu admins/<UID>)'); }
        return true;
      },
      async adminLogout() { await au.signOut(auth); await au.signInAnonymously(auth); backend.watchMine(P.id, (l) => { myReqs = l; creditApproved(); }); },
      watchAll(cb) { return fs.onSnapshot(fs.query(fs.collection(db, 'topups'), fs.where('status', '==', 'pending')), (s) => cb(rows(s)), (e) => toast('⚠️ Không đọc được yêu cầu nạp: ' + e.message)); },
      async decide(id, ok, by) { await fs.updateDoc(fs.doc(db, 'topups', id), { status: ok ? 'approved' : 'rejected', decidedAt: fs.serverTimestamp(), decidedBy: by || 'admin' }); }
    };
  }

  /* ---------- nạp hoa sen ---------- */
  function qrUrl(amount) {
    const b = CFG.bank; if (!bankOk) return '';
    return `https://img.vietqr.io/image/${encodeURIComponent(b.bank)}-${encodeURIComponent(b.account)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(contentOf(amount))}&accountName=${encodeURIComponent(b.owner || '')}`;
  }
  const copyBtn = (text) => { const c = el('button', 'btn sm', '📋 Chép'); c.onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Đã chép: ' + text), () => toast(text)); }; return c; };
  function openTopup() {
    if (CFG.topupEnabled === false) return toast('Chức năng nạp đang tạm đóng');
    modal('➕ Nạp hoa sen', (b) => {
      b.append(el('p', 'note', `10.000đ = ${lotusOf(10000)} hoa sen · Mã nhân vật của bạn: ${P.id}`));
      const grid = el('div', 'packs');
      (CFG.packs || []).forEach(v => { const p = el('button', 'pack'); p.append(el('b', '', `🪷 ${fmt(lotusOf(v))}`), el('small', '', vnd(v))); p.onclick = () => payStep(b, v); grid.append(p); });
      b.append(grid);
      if (backend.mode === 'demo') b.append(el('p', 'note warn', 'Đang ở chế độ thử (chưa cấu hình Firebase): yêu cầu nạp chỉ lưu trong trình duyệt này để xem thử luồng duyệt.'));
      b.append(myList());
    }, { wide: true });
  }
  function payStep(b, amount) {
    [...b.children].forEach((c, i) => { if (i) c.remove(); });
    const content = contentOf(amount), L = lotusOf(amount), box = el('div', 'pay');
    const qr = qrUrl(amount);
    if (qr) { const im = el('img', 'qr'); im.alt = 'Mã QR chuyển khoản'; im.src = qr; im.onerror = () => { im.replaceWith(el('p', 'note warn', 'Không tải được ảnh QR · vui lòng chuyển khoản theo thông tin bên dưới.')); }; box.append(im); }
    else box.append(el('p', 'note warn', 'Chùa chưa điền tài khoản nhận tiền (js/shop-config.js → bank).'));
    const rows = el('div', 'payinfo');
    const row = (k, v, copy) => { const r = el('div', 'prow'); r.append(el('span', '', k), el('b', '', v)); if (copy) r.append(copyBtn(copy)); rows.append(r); };
    row('Ngân hàng', CFG.bank.bankName || CFG.bank.bank || '—');
    row('Số tài khoản', CFG.bank.account || '—', CFG.bank.account || '');
    row('Chủ tài khoản', CFG.bank.owner || '—');
    row('Số tiền', vnd(amount), String(amount));
    row('Nội dung CK', content, content);
    box.append(rows, el('p', 'note', `Nhận ${fmt(L)} hoa sen sau khi chùa xác nhận đã nhận tiền. Ghi đúng nội dung chuyển khoản để được duyệt nhanh.`));
    const done = el('button', 'btn gold', '✅ Tôi đã chuyển khoản');
    done.onclick = async () => {
      done.disabled = true; done.textContent = 'Đang gửi…';
      try { await backend.create({ pid: P.id, name: P.name, amount, lotus: L, content }); toast('📨 Đã gửi yêu cầu · chờ chùa xác nhận'); closeModal(); openTopup(); }
      catch (e) { done.disabled = false; done.textContent = '✅ Tôi đã chuyển khoản'; toast('⚠️ Không gửi được: ' + e.message); }
    };
    const back = el('button', 'btn', '← Chọn gói khác'); back.onclick = () => { closeModal(); openTopup(); };
    const r2 = el('div', 'row'); r2.append(back, done); box.append(r2); b.append(box);
  }
  function myList() {
    const w = el('div'); if (!myReqs.length) return w;
    w.append(el('h3', '', '📜 Yêu cầu nạp của bạn'));
    const ul = el('div', 'reqs');
    myReqs.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8).forEach(r => {
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
    modal('🛡 Duyệt nạp hoa sen', (b) => {
      const box = el('div');
      const paint = () => {
        box.innerHTML = '';
        if (!pending.length) box.append(el('p', 'note', 'Chưa có yêu cầu nạp nào đang chờ. Bảng tự cập nhật khi có người bấm "Tôi đã chuyển khoản".'));
        pending.forEach(r => {
          const it = el('div', 'req pending'); const info = el('div');
          info.append(el('b', '', `${r.name || '—'} · ${r.pid}`), el('small', '', `${vnd(r.amount)} → 🪷 ${fmt(r.lotus)} · ${new Date(r.createdAt).toLocaleString('vi-VN')}`), el('code', '', r.content));
          const ok = el('button', 'btn gold sm', '✅ Chấp nhận'), no = el('button', 'btn sm', '❌ Từ chối');
          ok.onclick = async () => { ok.disabled = no.disabled = true; try { await backend.decide(r.id, true, P.name); toast(`✅ Đã cộng ${fmt(r.lotus)} hoa sen cho ${r.name}`); } catch (e) { toast('⚠️ ' + e.message); ok.disabled = no.disabled = false; } };
          no.onclick = async () => { if (!confirm(`Từ chối yêu cầu ${vnd(r.amount)} của ${r.name}?`)) return; ok.disabled = no.disabled = true; try { await backend.decide(r.id, false, P.name); } catch (e) { toast('⚠️ ' + e.message); ok.disabled = no.disabled = false; } };
          const act = el('div', 'row'); act.append(ok, no); it.append(info, act); box.append(it);
        });
      };
      paint(); adminHooks.add(paint);
      const out = el('button', 'btn sm', 'Thoát quản trị'); out.onclick = async () => { await backend.adminLogout(); isAdmin = false; if (unAll) unAll(); $('bAdmin').hidden = true; closeModal(); toast('Đã thoát chế độ quản trị'); };
      b.append(el('p', 'note', 'Kiểm tra tài khoản ngân hàng: thấy tiền về đúng số tiền & nội dung thì bấm "Chấp nhận" — hoa sen tự chuyển về người chơi.'), box, out);
      const cleanup = () => adminHooks.delete(paint); setTimeout(() => { const v = $('veil'); const obs = new MutationObserver(() => { if (v.hidden) { cleanup(); obs.disconnect(); } }); obs.observe(v, { attributes: true }); }, 0);
    }, { wide: true });
  }
  backend.ready.then(() => { if (isAdmin) startAdmin(); });

  return {
    get lotus() { return P.lotus; }, get mode() { return backend.mode; }, get isAdmin() { return isAdmin; },
    items: SHOP_ITEMS, spend, addLotus, dailyReady, claimDaily, openTopup, openAdmin, adminLogin,
    onChange(f) { listeners.add(f); }, myList
  };
}
