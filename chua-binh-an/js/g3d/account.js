/* Tài khoản người chơi: sau 900 giây chơi thật sẽ mời đăng ký,
   đăng nhập lần sau thì mọi dữ liệu (hồ sơ, hạt, công đức, hoa sen, cài đặt…) đi theo tài khoản.
   Có Firebase (js/shop-config.js) → lưu trên Firestore players/{uid}, dùng được trên mọi máy.
   Chưa có Firebase → "chế độ thử": tài khoản lưu trong trình duyệt này. */
import { fb, hasFirebase } from './fb.js';

const CFG = (window.CBA && CBA.shop) || {};
const PROMPT_AFTER = (CFG.accountPromptSec || 900);          // giây chơi thật trước khi mời đăng ký
const DOMAIN = CFG.accountEmailDomain || 'chuabinhan.game';   // tên đăng nhập → email nội bộ
const MARK = 'cba_acct', PLAY = 'cba_playsec', SKIP = 'cba_acctskip', DEMO = 'cba_accounts_demo';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const jget = (k, d) => { try { return JSON.parse(ls.get(k)) || d; } catch (e) { return d; } };
const mark = () => jget(MARK, null);
const setMark = (m) => m ? ls.set(MARK, JSON.stringify(m)) : ls.del(MARK);

/* những gì được lưu về tài khoản: mọi dữ liệu game 3D + giọng đọc đã chọn */
const synced = (k) => k.startsWith('cba3d_') || k === 'cba_voice';
function snapshot() { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (synced(k)) o[k] = localStorage.getItem(k); } } catch (e) {} return o; }
function applyData(data) {
  try { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('cba3d_')) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); } catch (e) {}
  Object.entries(data || {}).forEach(([k, v]) => { if (synced(k) && typeof v === 'string') ls.set(k, v); });
}
function clearLocal() { try { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('cba3d_')) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); } catch (e) {} ls.del(PLAY); ls.del(SKIP); }

const cleanUser = (u) => u.trim().toLowerCase();
const toEmail = (u) => u.includes('@') ? u : `${u}@${DOMAIN}`;
async function sha(s) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('cba:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 2166136261; for (const c of 'cba:' + s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16); }
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Hết thời gian chờ mạng')), ms))]);
function viErr(e) {
  const c = (e && e.code) || '', m = (e && e.message) || String(e);
  if (/email-already-in-use/.test(c)) return 'Tên đăng nhập này đã có người dùng · chọn tên khác hoặc chuyển sang Đăng nhập.';
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'Sai tên đăng nhập hoặc mật khẩu.';
  if (/weak-password/.test(c)) return 'Mật khẩu cần ít nhất 6 ký tự.';
  if (/invalid-email/.test(c)) return 'Tên đăng nhập không hợp lệ.';
  if (/too-many-requests/.test(c)) return 'Thử quá nhiều lần · vui lòng đợi ít phút.';
  if (/operation-not-allowed/.test(c)) return 'Firebase chưa bật đăng nhập Email/Password (xem HUONG_DAN_NAP_TIEN.md).';
  if (/network/.test(c)) return 'Không có mạng · kiểm tra kết nối rồi thử lại.';
  if (/credential-already-in-use|provider-already-linked/.test(c)) return 'Tài khoản này đã liên kết · hãy dùng Đăng nhập.';
  return m;
}

/* ---------- nơi lưu tài khoản ---------- */
function demoBackend() {
  const all = () => jget(DEMO, {}), put = (o) => ls.set(DEMO, JSON.stringify(o));
  return {
    mode: 'demo',
    async current() { const m = mark(); return m && all()[m.user] ? { uid: m.uid, user: m.user } : null; },
    async register(user, pw) { const a = all(); if (a[user]) throw new Error('Tên đăng nhập này đã có người dùng · chọn tên khác hoặc chuyển sang Đăng nhập.'); a[user] = { h: await sha(user + ':' + pw), uid: 'D' + Date.now().toString(36), data: null, savedMs: 0 }; put(a); return { uid: a[user].uid, user }; },
    async login(user, pw) { const r = all()[user]; if (!r || r.h !== await sha(user + ':' + pw)) throw new Error('Sai tên đăng nhập hoặc mật khẩu.'); return { uid: r.uid, user }; },
    async logout() {},
    async pull(u) { const r = all()[u.user]; return r && r.data ? { data: r.data, savedMs: r.savedMs } : null; },
    async push(u, data) { const a = all(); if (!a[u.user]) return; const t = Date.now(); a[u.user].data = data; a[u.user].savedMs = t; put(a); return t; }
  };
}
function firebaseBackend() {
  const F = () => withTimeout(fb(), 8000);
  return {
    mode: 'firebase',
    async current() { const { auth } = await F(); const u = auth.currentUser; return u && !u.isAnonymous ? { uid: u.uid, user: (u.email || '').replace('@' + DOMAIN, '') } : null; },
    async register(user, pw) {
      const { au, auth } = await F(); const email = toEmail(user); let cred;
      // giữ nguyên mã đăng nhập ẩn danh (lịch sử nạp hoa sen) bằng cách liên kết
      if (auth.currentUser && auth.currentUser.isAnonymous) cred = await au.linkWithCredential(auth.currentUser, au.EmailAuthProvider.credential(email, pw));
      else cred = await au.createUserWithEmailAndPassword(auth, email, pw);
      try { await cred.user.getIdToken(true); } catch (e) {}   // làm mới token: hết là "ẩn danh" để được ghi players/{uid}
      return { uid: cred.user.uid, user };
    },
    async login(user, pw) { const { au, auth } = await F(); const c = await au.signInWithEmailAndPassword(auth, toEmail(user), pw); return { uid: c.user.uid, user }; },
    async logout() { const { au, auth } = await F(); await au.signOut(auth); },
    async pull(u) { const { fs, db } = await F(); const s = await fs.getDoc(fs.doc(db, 'players', u.uid)); if (!s.exists()) return null; const d = s.data(); return { data: d.data || {}, savedMs: d.savedMs || 0 }; },
    async push(u, data, P) { const { fs, db } = await F(); const t = Date.now(); await fs.setDoc(fs.doc(db, 'players', u.uid), { user: u.user, name: (P && P.name) || '', pid: (P && P.id) || '', data, savedMs: t, savedAt: fs.serverTimestamp() }); return t; }
  };
}
const backend = hasFirebase ? firebaseBackend() : demoBackend();

/* Gọi TRƯỚC khi game đọc dữ liệu: nếu máy này đã đăng nhập, lấy bản mới nhất trên tài khoản về */
let bootUser = null, needLogin = false;
export async function bootAccount() {
  const m = mark(); if (!m) return;
  try {
    const u = await withTimeout(backend.current(), 9000);
    if (!u || u.uid !== m.uid) { needLogin = true; setMark(null); return; }
    bootUser = u;
    const r = await withTimeout(backend.pull(u), 9000);
    if (r && r.savedMs > (m.syncedMs || 0)) { applyData(r.data); setMark(Object.assign({}, m, { syncedMs: r.savedMs })); }
  } catch (e) { console.warn('[Tài khoản] boot', e); bootUser = { uid: m.uid, user: m.user, offline: true }; }
}

export function initAccount(ctx) {
  const { P, modal, closeModal, el, $, toast, banner, A, flush } = ctx;
  let user = bootUser, lastSent = user ? JSON.stringify(snapshot()) : '', pushing = false, savedAt = (mark() || {}).syncedMs || 0;
  const listeners = new Set(), changed = () => listeners.forEach(f => f());

  /* ---------- đồng bộ ---------- */
  async function push(force) {
    if (!user || pushing || window.__cbaLock) return;
    if (flush) flush();   // ghi hồ sơ đang chơi xuống trước khi gửi
    const data = snapshot(), s = JSON.stringify(data);
    if (!force && s === lastSent) return;
    pushing = true;
    try { const t = await backend.push(user, data, P); lastSent = s; savedAt = t || Date.now(); setMark({ uid: user.uid, user: user.user, syncedMs: savedAt }); user.offline = false; changed(); return true; }
    catch (e) { console.warn('[Tài khoản] lưu', e); if (force) toast('⚠️ Chưa lưu được lên tài khoản: ' + viErr(e)); return false; }
    finally { pushing = false; }
  }
  setInterval(push, 12000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(); });
  addEventListener('pagehide', () => push());

  /* ---------- đếm thời gian chơi thật ---------- */
  let played = +ls.get(PLAY) || 0, asked = false;
  const busy = () => !$('veil').hidden || ['chant', 'malaUI', 'med', 'story'].some(id => $(id) && !$(id).hidden);
  setInterval(() => {
    if (user || !P.name || document.visibilityState !== 'visible') return;
    played++; if (played % 10 === 0) ls.set(PLAY, played);
    if (played >= PROMPT_AFTER && !asked && !ls.get(SKIP) && !busy()) { asked = true; ls.set(PLAY, played); openAccount('register', true); }
  }, 1000);
  if (needLogin) setTimeout(() => toast('👤 Phiên đăng nhập đã hết · vào Cài đặt → Tài khoản để đăng nhập lại'), 4000);

  /* ---------- giao diện ---------- */
  function openAccount(tab = 'register', invited = false) {
    modal(invited ? '🪷 Lưu tiến trình tu tập' : '👤 Tài khoản', (b) => {
      if (invited) b.append(el('p', 'big', `Bạn đã tu tập được ${Math.round(played / 60)} phút.`), el('p', 'note', 'Tạo tài khoản để lưu hạt, công đức, hoa sen, sổ hành hương và cài đặt. Lần sau chỉ cần đăng nhập là có lại toàn bộ, kể cả trên điện thoại hay máy khác.'));
      const tabs = el('div', 'tabs'), body = el('div', 'acct');
      const tb = (k, t) => { const x = el('button', 'tab' + (k === tab ? ' on' : ''), t); x.onclick = () => { tab = k; [...tabs.children].forEach(c => c.classList.toggle('on', c === x)); form(); }; return x; };
      tabs.append(tb('register', '✨ Đăng ký'), tb('login', '🔑 Đăng nhập')); b.append(tabs, body);
      function form() {
        body.innerHTML = '';
        const u = el('input'); u.placeholder = 'Tên đăng nhập (vd: minhtam99)'; u.autocomplete = 'username'; u.maxLength = 40; u.autocapitalize = 'none';
        const p = el('input'); p.type = 'password'; p.placeholder = 'Mật khẩu (ít nhất 6 ký tự)'; p.autocomplete = tab === 'register' ? 'new-password' : 'current-password';
        const p2 = el('input'); p2.type = 'password'; p2.placeholder = 'Nhập lại mật khẩu'; p2.autocomplete = 'new-password';
        const err = el('div', 'err'), go = el('button', 'btn gold', tab === 'register' ? '✨ Tạo tài khoản & lưu' : '🔑 Đăng nhập');
        body.append(el('label', '', 'Tên đăng nhập'), u, el('label', '', 'Mật khẩu'), p);
        if (tab === 'register') body.append(el('label', '', 'Nhập lại mật khẩu'), p2);
        body.append(err, go);
        if (tab === 'login') body.append(el('p', 'note', 'Đăng nhập sẽ thay tiến trình đang chơi trên máy này bằng tiến trình đã lưu trong tài khoản.'));
        if (backend.mode === 'demo') body.append(el('p', 'note warn', 'Chế độ thử (chưa cấu hình Firebase): tài khoản chỉ lưu trong trình duyệt này. Khi cấu hình Firebase, tài khoản dùng được trên mọi máy.'));
        const submit = async () => {
          const name = cleanUser(u.value), pw = p.value; err.textContent = '';
          if (!/^[a-z0-9._@-]{3,40}$/.test(name)) { err.textContent = 'Tên đăng nhập 3–40 ký tự: chữ không dấu, số, dấu chấm, gạch dưới.'; return u.focus(); }
          if (pw.length < 6) { err.textContent = 'Mật khẩu cần ít nhất 6 ký tự.'; return p.focus(); }
          if (tab === 'register' && pw !== p2.value) { err.textContent = 'Hai lần nhập mật khẩu chưa khớp.'; return p2.focus(); }
          go.disabled = true; go.textContent = '⏳ Đang xử lý…';
          try { tab === 'register' ? await doRegister(name, pw) : await doLogin(name, pw); }
          catch (e) { err.textContent = viErr(e); go.disabled = false; go.textContent = tab === 'register' ? '✨ Tạo tài khoản & lưu' : '🔑 Đăng nhập'; }
        };
        go.onclick = submit; [u, p, p2].forEach(i => i.onkeydown = (e) => { if (e.key === 'Enter') submit(); });
        setTimeout(() => u.focus(), 50);
      }
      form();
      if (invited) { const later = el('button', 'btn ghost', 'Không cần tài khoản'); later.onclick = () => confirmSkip(); b.append(later); }
    }, { noClose: invited });
  }
  function confirmSkip() {
    modal('⚠️ Dữ liệu sẽ không được lưu', (b) => {
      b.append(el('p', 'note warn', 'Nếu không tạo tài khoản, tiến trình chỉ nằm tạm trong trình duyệt này và KHÔNG được lưu vào tài khoản. Xóa dữ liệu trình duyệt, dùng tab ẩn danh, đổi trình duyệt hay đổi máy là mất toàn bộ hạt, công đức và hoa sen (kể cả hoa sen đã nạp).'),
        el('p', 'note', 'Bạn vẫn có thể tạo tài khoản bất cứ lúc nào trong Cài đặt → 👤 Tài khoản.'));
      const r = el('div', 'row'), back = el('button', 'btn gold', '← Quay lại đăng ký'), off = el('button', 'btn', 'Tôi hiểu, vẫn tắt');
      back.onclick = () => openAccount('register', true);
      off.onclick = () => { ls.set(SKIP, '1'); closeModal(); toast('Đã tắt lời mời đăng ký · dữ liệu chưa được lưu vào tài khoản'); changed(); };
      r.append(back, off); b.append(r);
    }, { noClose: true });
  }
  async function doRegister(name, pw) {
    const u = await backend.register(name, pw); user = u; ls.del(SKIP);
    if (!(await push(true))) throw new Error('Đã tạo tài khoản nhưng chưa lưu được dữ liệu · thử lại "Lưu ngay" trong Cài đặt.');
    closeModal(); A.smallBell && A.smallBell(); banner('🪷 Đã tạo tài khoản', name, 'Tiến trình tu tập đã được lưu · lần sau đăng nhập để chơi tiếp'); changed();
  }
  async function doLogin(name, pw) {
    const u = await backend.login(name, pw), r = await backend.pull(u);
    if (r && r.data && Object.keys(r.data).length) { window.__cbaLock = true; applyData(r.data); setMark({ uid: u.uid, user: u.user, syncedMs: r.savedMs }); ls.del(SKIP); toast('🔑 Đăng nhập thành công · đang tải tiến trình…'); setTimeout(() => location.reload(), 500); }
    else { user = u; ls.del(SKIP); await push(true); closeModal(); toast('🔑 Đăng nhập thành công · đã lưu tiến trình máy này vào tài khoản'); changed(); }
  }
  async function logout() {
    modal('Đăng xuất?', (b) => {
      b.append(el('p', 'note', 'Tiến trình được lưu lên tài khoản rồi xóa khỏi máy này. Đăng nhập lại để chơi tiếp.'));
      const r = el('div', 'row'), ok = el('button', 'btn gold', 'Lưu & đăng xuất'), no = el('button', 'btn', 'Ở lại');
      no.onclick = closeModal;
      ok.onclick = async () => { ok.disabled = true; if (!(await push(true))) { ok.disabled = false; return; } window.__cbaLock = true; user = null; try { await backend.logout(); } catch (e) {} setMark(null); clearLocal(); location.reload(); };
      r.append(ok, no); b.append(r);
    });
  }
  /* khối trong Cài đặt */
  function section(b) {
    b.append(el('h3', '', '👤 Tài khoản'));
    const r = el('div', 'row');
    if (user) {
      const t = savedAt ? new Date(savedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'chưa';
      b.append(el('p', 'note', `Đã đăng nhập: ${user.user} · lưu lần cuối ${t}${user.offline ? ' · đang ngoại tuyến' : ''}`));
      const sv = el('button', 'btn', '☁️ Lưu ngay'); sv.onclick = async () => { sv.disabled = true; if (await push(true)) toast('☁️ Đã lưu tiến trình lên tài khoản'); sv.disabled = false; };
      const lo = el('button', 'btn', 'Đăng xuất'); lo.onclick = logout; r.append(sv, lo);
    } else {
      b.append(el('p', 'note warn', ls.get(SKIP) ? '⚠️ Bạn đã tắt lời mời đăng ký: dữ liệu KHÔNG được lưu vào tài khoản, xóa trình duyệt hoặc đổi máy sẽ mất.' : '⚠️ Chưa có tài khoản: dữ liệu chỉ lưu tạm trong trình duyệt này.'));
      const rg = el('button', 'btn gold', '✨ Đăng ký'); rg.onclick = () => openAccount('register');
      const li = el('button', 'btn', '🔑 Đăng nhập'); li.onclick = () => openAccount('login'); r.append(rg, li);
    }
    b.append(r);
  }
  return { get user() { return user; }, get skipped() { return !!ls.get(SKIP); }, mode: backend.mode, openAccount, section, push, onChange: (f) => listeners.add(f) };
}
