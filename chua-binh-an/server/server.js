/* =====================================================================
   MÁY CHỦ CHÙA BÌNH AN (chạy trên máy tính của bạn)
   - Phục vụ game: http://<máy>:8080/game.html  (nén gzip, có bộ nhớ đệm)
   - Nhiều người chơi thật qua WebSocket tại /ws
   - Mỗi chùa chia thành nhiều KÊNH (server con). Kênh đầy (ROOM_CAP người)
     thì người mới vào tự được đưa sang kênh khác / kênh mới tạo → không quá tải.
   - Tổng người tối đa MAX_PLAYERS để bảo vệ máy tính & đường mạng của bạn.
   - Xem tình trạng: http://<máy>:8080/server
   Cấu hình bằng biến môi trường: PORT, ROOM_CAP, MAX_PLAYERS, TICK_HZ
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib'), os = require('os');
const { WebSocketServer } = require('ws');
const BOTD = require('./duyen-bot.js');

const PORT = +process.env.PORT || 8080;
const ROOM_CAP = +process.env.ROOM_CAP || 30;        // người / kênh (giới hạn để điện thoại vẽ mượt)
// tổng người cùng lúc: đặt thẳng MAX_PLAYERS, hoặc khai báo UPLOAD_MBPS (tốc độ tải lên đo ở speedtest.net)
// để máy chủ tự tính: mỗi người ≈ 0,04 Mbps khi kênh 30 người cùng đi lại, chừa 30% cho việc khác
const UPLOAD_MBPS = +process.env.UPLOAD_MBPS || 0;
const MAX_PLAYERS = +process.env.MAX_PLAYERS || (UPLOAD_MBPS ? Math.max(20, Math.floor(UPLOAD_MBPS * 0.7 / 0.04)) : 300);
const TICK_HZ = +process.env.TICK_HZ || 5;           // số lần gửi vị trí mỗi giây
const ADMIN_KEY = process.env.ADMIN_KEY || '';          // mã để xem /server từ xa
const ROOT = path.resolve(__dirname, '..');
// chống hotlink & chống nhúng iframe: chỉ các tên miền này mới được tải tài nguyên / nhúng game
const ALLOW_HOSTS = (process.env.ALLOW_HOSTS || 'dichua.id.vn,www.dichua.id.vn').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
const hostOf = (u) => { try { return new URL(u).host.toLowerCase(); } catch (e) { return ''; } };
const localHost = (h) => /^(localhost|127\.0\.0\.1|\[::1\]|(?:\d+\.){3}\d+)(:\d+)?$/.test(h) || /\.local(:\d+)?$/.test(h);
const allowedHost = (h) => { h = (h || '').toLowerCase(); const bare = h.replace(/:\d+$/, ''); return !h || localHost(h) || ALLOW_HOSTS.includes(h) || ALLOW_HOSTS.includes(bare); };
const TEMPLES = new Set(['chua-ha', 'binh-an', 'bai-dinh', 'mot-cot', 'huong', 'yen-tu', 'thien-mu', 'linh-ung', 'long-son', 'vinh-nghiem', 'giac-lam', 'doi']);
const POSES = new Set(['idle', 'kneel', 'bow', 'lotus', 'incense', 'carry']);
const ACTS = new Set(['bow', 'bell', 'incense', 'offer', 'lantern', 'mala', 'chant', 'cert', 'release', 'bath', 'greet']);

/* ---------------- phục vụ file game ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const gzCache = new Map();
function serveFile(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/game.html';
  // chống hotlink: tài nguyên (ảnh, âm thanh, mã js) chỉ phục vụ khi request đến từ đúng tên miền.
  // Trang game (.html) và file gốc vẫn mở trực tiếp (gõ địa chỉ, không có Referer) để người chơi vào được.
  const isAsset = /\.(js|mjs|css|png|jpg|jpeg|webp|mp3|json|webmanifest)$/i.test(p);
  const ref = req.headers.referer || req.headers.origin;
  if (isAsset && ref && !allowedHost(hostOf(ref))) { res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Chỉ phục vụ cho ' + ALLOW_HOSTS.join(', ')); }
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || file.includes(`${path.sep}server${path.sep}`) || /\/\.|node_modules|\.(bat|ps1|yml|yaml|exe|log)$|Caddyfile|firestore\.rules|tunnel-token/i.test(p)) { res.writeHead(403); return res.end('Không được phép'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Không tìm thấy'); }
    const ext = path.extname(file).toLowerCase(), type = TYPES[ext] || 'application/octet-stream';
    const etag = `"${st.size}-${st.mtimeMs | 0}"`;
    const media = /\.(png|jpg|webp|mp3)$/.test(ext);
    const head = { 'content-type': type, etag, 'cache-control': media ? 'public, max-age=604800' : 'no-cache' };
    if (ext === '.html') { head['x-frame-options'] = 'SAMEORIGIN'; head['content-security-policy'] = "frame-ancestors 'self' " + ALLOW_HOSTS.map(h => 'https://' + h).join(' ') + ';'; head['x-content-type-options'] = 'nosniff'; head['referrer-policy'] = 'strict-origin-when-cross-origin'; }
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, head); return res.end(); }
    const gz = !media && /gzip/.test(req.headers['accept-encoding'] || '');
    if (!gz) { res.writeHead(200, Object.assign(head, { 'content-length': st.size })); stats.bytesHttp += st.size; return fs.createReadStream(file).pipe(res); }
    const c = gzCache.get(file);
    if (c && c.etag === etag) { res.writeHead(200, Object.assign(head, { 'content-encoding': 'gzip', 'content-length': c.buf.length })); stats.bytesHttp += c.buf.length; return res.end(c.buf); }
    fs.readFile(file, (e, raw) => {
      if (e) { res.writeHead(500); return res.end(); }
      const buf = zlib.gzipSync(raw, { level: 9 }); gzCache.set(file, { etag, buf });
      res.writeHead(200, Object.assign(head, { 'content-encoding': 'gzip', 'content-length': buf.length })); stats.bytesHttp += buf.length; res.end(buf);
    });
  });
}

/* ---------------- kênh (phòng) ---------------- */
const rooms = new Map();   // key "chùa#kênh" → { temple, ch, players: Map(id → player), dirty:Set, acts:[] }
let nextId = 1, total = 0;
const stats = { msgIn: 0, msgOut: 0, bytesOut: 0, bytesHttp: 0, rejected: 0, kicked: 0, peak: 0, started: Date.now() };
const rkey = (t, c) => `${t}#${c}`;
function channelsOf(temple) { const l = []; for (const r of rooms.values()) if (r.temple === temple) l.push({ ch: r.ch, n: r.players.size }); return l.sort((a, b) => a.ch - b.ch); }
function newRoom(temple, ch) { const r = { temple, ch, players: new Map(), dirty: new Set(), acts: [] }; rooms.set(rkey(temple, ch), r); console.log(`[kênh] mở ${temple} · kênh ${ch}`); return r; }
function pickRoom(temple, want, create) {
  if (want) { const r = rooms.get(rkey(temple, want)); if (r && r.players.size < ROOM_CAP) return r; if (!r && create && want <= 99) return newRoom(temple, want); }
  const list = channelsOf(temple);
  // kênh thấp nhất còn chỗ (để người chơi gặp nhau đông vui), đầy hết thì mở kênh mới
  const free = list.find(c => c.n < ROOM_CAP);
  if (free) return rooms.get(rkey(temple, free.ch));
  let ch = 1; while (rooms.has(rkey(temple, ch))) ch++;
  return newRoom(temple, ch);
}
function send(ws, obj) { if (ws.readyState !== 1) return; const s = typeof obj === 'string' ? obj : JSON.stringify(obj); ws.send(s); stats.msgOut++; stats.bytesOut += s.length; }
function broadcast(room, obj, except) { const s = JSON.stringify(obj); for (const p of room.players.values()) if (p !== except) send(p.ws, s); }
const pub = (p) => ({ id: p.id, name: p.name, look: p.look, b: p.beads, m: p.merit, bd: p.badge, s: p.s });
function leaveRoom(p) {
  const r = p.room; if (!r) return;
  r.players.delete(p.id); r.dirty.delete(p.id); p.room = null;
  broadcast(r, { t: 'leave', id: p.id });
  if (!r.players.size && r.ch > 1) { rooms.delete(rkey(r.temple, r.ch)); console.log(`[kênh] đóng ${r.temple} · kênh ${r.ch} (trống)`); }
}
function joinRoom(p, temple, want, create) {
  leaveRoom(p);
  const r = pickRoom(temple, want, create); p.room = r; r.players.set(p.id, p);
  send(p.ws, { t: 'welcome', id: p.id, temple, ch: r.ch, cap: ROOM_CAP, chs: channelsOf(temple), peers: [...r.players.values()].filter(x => x !== p).map(pub) });
  broadcast(r, { t: 'join', p: pub(p) }, p);
}

/* ---------------- kiểm tra dữ liệu người chơi gửi lên ---------------- */
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = (v, lim = 1e4) => { v = +v; return Number.isFinite(v) ? Math.max(-lim, Math.min(lim, Math.round(v * 100) / 100)) : 0; };
const ROBES = ['lam', 'nau', 'xam', 'trang', 'hong', 'ngoc', 'tim', 'reu', 'dat', 'kim'], MALAS = ['go', 'bode', 'tram', 'ngoc', 'mana'];
function cleanLook(l) { l = l || {}; return { g: l.g === 'nam' ? 'nam' : 'nu', hair: ['bui', 'dai', 'ngan', 'troc'].includes(l.hair) ? l.hair : 'bui', robe: ROBES.includes(l.robe) ? l.robe : 'lam', mala: MALAS.includes(l.mala) ? l.mala : 'go', rose: ['', 'do', 'trang'].includes(l.rose) ? l.rose : '' }; }

/* ---------------- dữ liệu cộng đồng: bạn đồng tu, đạo tràng, bảng hồi hướng, vườn chùa ----------------
   Lưu ở thư mục NGOÀI thư mục game (mặc định ../ChuaBinhAn-du-lieu/xa-hoi.json) để Tự cập nhật không xóa mất.
   Người chơi nhận diện bằng mã ngẫu nhiên (uid) tạo trên máy họ — không cần mật khẩu. */
const DATA_DIR = process.env.DATA_DIR || path.resolve(ROOT, '..', 'ChuaBinhAn-du-lieu');
const DATA_FILE = path.join(DATA_DIR, 'xa-hoi.json');
const cleanUid = (u) => /^[a-z0-9]{12,24}$/.test(String(u || '')) ? String(u) : '';
const codeOf = (uid) => uid.slice(0, 6).toUpperCase();
const vnDay = () => { const d = new Date(Date.now() + 7 * 3600000); return d.toISOString().slice(0, 10); };
const weekKey = () => { const d = new Date(Date.now() + 7 * 3600000); const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day + 3); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 4)); return t.getUTCFullYear() + '-W' + (1 + Math.round(((t - y) / 86400000 - 3 + ((y.getUTCDay() + 6) % 7)) / 7)); };
const PROVS = ['Hà Nội', 'Huế', 'Lai Châu', 'Điện Biên', 'Sơn La', 'Lạng Sơn', 'Quảng Ninh', 'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Cao Bằng', 'Tuyên Quang', 'Lào Cai', 'Thái Nguyên', 'Phú Thọ', 'Bắc Ninh', 'Hưng Yên', 'Hải Phòng', 'Ninh Bình', 'Quảng Trị', 'Đà Nẵng', 'Quảng Ngãi', 'Gia Lai', 'Khánh Hòa', 'Lâm Đồng', 'Đắk Lắk', 'TP. Hồ Chí Minh', 'Đồng Nai', 'Tây Ninh', 'Cần Thơ', 'Vĩnh Long', 'Đồng Tháp', 'Cà Mau', 'An Giang'];
const INTS = ['Du lịch', 'Nấu ăn', 'Đọc sách', 'Âm nhạc', 'Thiền · Yoga', 'Thể thao', 'Phim ảnh', 'Cà phê', 'Làm vườn', 'Chụp ảnh', 'Hành hương', 'Thú cưng', 'Công nghệ', 'Kinh doanh', 'Ăn chay', 'Tình nguyện'];
const PHOTO_DIR = path.join(DATA_DIR, 'duyen-anh');
const maskContact = (s) => s.replace(/(\+?\d[\d .-]{7,}\d)/g, '•••').replace(/(https?:\/\/|www\.)\S+/gi, '•••').replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '•••');
const vnYear = () => new Date(Date.now() + 7 * 3600000).getUTCFullYear();
const SOC = (() => {
  let D = { users: {}, groups: {}, mem: {}, greets: {}, helps: {} };
  try { D = Object.assign(D, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); console.log(`[cộng đồng] nạp ${Object.keys(D.users).length} người, ${Object.keys(D.groups).length} đạo tràng`); } catch (e) {}
  let dirty = false; const mark = () => { dirty = true; };
  setInterval(() => { if (!dirty) return; dirty = false; fs.mkdir(DATA_DIR, { recursive: true }, () => fs.writeFile(DATA_FILE + '.tmp', JSON.stringify(D), (e) => { if (!e) fs.rename(DATA_FILE + '.tmp', DATA_FILE, () => {}); })); }, 5000);
  const online = new Map();   // uid → player
  const U = (uid) => (D.users[uid] = D.users[uid] || { name: 'Phật tử', fr: [], dt: '', garden: null, temple: '', last: 0 });
  const pubU = (uid) => { const u = D.users[uid]; if (!u) return null; const o = online.get(uid); return { uid, code: codeOf(uid), name: u.name, online: !!o, temple: o && o.room ? o.room.temple : u.temple, last: u.last, garden: u.garden }; };
  const reply = (p, o) => send(p.ws, Object.assign({ t: 'soc' }, o));
  function seen(p) { const u = U(p.uid); u.name = p.name; u.last = Date.now(); online.set(p.uid, p); mark(); }
  function gone(p) { if (online.get(p.uid) === p) online.delete(p.uid); const u = D.users[p.uid]; if (u) { u.last = Date.now(); if (p.room) u.temple = p.room.temple; mark(); } }
  function groupInfo(id) {
    const g = D.groups[id]; if (!g) return null; const wk = weekKey(), w = (g.wk && g.wk[wk]) || {};
    return { id, code: id, name: g.name, owner: g.owner, goal: g.goal, total: Object.values(w).reduce((a, b) => a + b, 0), week: wk,
      members: g.members.map(uid => { const x = pubU(uid) || { uid, name: '?' }; return { uid, name: x.name, online: x.online, temple: x.temple, wk: w[uid] || 0 }; }).sort((a, b) => b.wk - a.wk) };
  }
  function handle(p, m) {
    if (!p.uid) return; const u = U(p.uid), op = String(m.op || '');
    const now = Date.now(); if (now - (p.socWin || 0) > 5000) { p.socWin = now; p.socN = 0; } if (++p.socN > 25) return;   // chống spam: tối đa 25 yêu cầu / 5 giây
    if (op.startsWith('du.')) return DU.handle(p, u, op, m, now);
    if (op === 'fr.list') return reply(p, { op: 'fr', list: u.fr.map(pubU).filter(Boolean), me: codeOf(p.uid) });
    if (op === 'fr.add') {
      const code = clean(m.code, 8).toUpperCase(), uid = Object.keys(D.users).find(k => codeOf(k) === code);
      if (!uid || uid === p.uid) return reply(p, { op: 'err', msg: 'Không tìm thấy mã bạn đồng tu này' });
      if (!u.fr.includes(uid) && u.fr.length < 100) u.fr.push(uid); const o = U(uid); if (!o.fr.includes(p.uid) && o.fr.length < 100) o.fr.push(p.uid); mark();
      const oo = online.get(uid); if (oo) send(oo.ws, { t: 'soc', op: 'note', msg: `🤝 ${p.name} đã kết bạn đồng tu với bạn` });
      return reply(p, { op: 'fr', list: u.fr.map(pubU).filter(Boolean), me: codeOf(p.uid), added: pubU(uid) });
    }
    if (op === 'fr.del') { const uid = cleanUid(m.uid); u.fr = u.fr.filter(x => x !== uid); mark(); return reply(p, { op: 'fr', list: u.fr.map(pubU).filter(Boolean), me: codeOf(p.uid) }); }
    if (op === 'fr.greet') {
      const uid = cleanUid(m.uid); if (!u.fr.includes(uid)) return; const day = vnDay(), k = p.uid + '>' + uid;
      D.greets[day] = D.greets[day] || {}; if (D.greets[day][k]) return reply(p, { op: 'err', msg: 'Hôm nay đã gửi lời chúc cho bạn này rồi' });
      D.greets[day][k] = 1; Object.keys(D.greets).forEach(d => { if (d !== day) delete D.greets[d]; }); mark();
      const oo = online.get(uid); if (oo) send(oo.ws, { t: 'soc', op: 'greet', from: p.name, msg: clean(m.msg, 60) });
      else { const o = U(uid); o.inbox = (o.inbox || []).slice(-19); o.inbox.push({ from: p.name, msg: clean(m.msg, 60), t: now }); }
      return reply(p, { op: 'greeted', uid });
    }
    if (op === 'inbox') { const box = u.inbox || []; u.inbox = []; mark(); return reply(p, { op: 'inbox', list: box }); }
    if (op === 'gd.set') { const g = m.garden; if (Array.isArray(g) && g.length <= 9) { u.garden = g.map(x => [clean(x && x[0], 8), Math.max(0, Math.min(9, x && x[1] | 0)), x && x[2] ? 1 : 0]); mark(); } return; }
    if (op === 'gd.get') { const uid = cleanUid(m.uid), x = pubU(uid); return reply(p, { op: 'gd', uid, name: x ? x.name : '?', garden: x ? x.garden : null, helped: !!(D.helps[uid] && D.helps[uid][p.uid] === vnDay()) }); }
    if (op === 'gd.water') {
      const uid = cleanUid(m.uid); if (!uid || uid === p.uid || !u.fr.includes(uid)) return; D.helps[uid] = D.helps[uid] || {};
      if (D.helps[uid][p.uid] === vnDay()) return reply(p, { op: 'err', msg: 'Hôm nay bạn đã tưới vườn này rồi' });
      D.helps[uid][p.uid] = vnDay(); mark(); const oo = online.get(uid); if (oo) send(oo.ws, { t: 'soc', op: 'note', msg: `💧 ${p.name} vừa tưới giúp vườn chùa của bạn` });
      return reply(p, { op: 'watered', uid });
    }
    if (op === 'gd.helps') { const h = D.helps[p.uid] || {}, day = vnDay(); const n = Object.values(h).filter(d => d === day).length; return reply(p, { op: 'helps', n, day }); }
    if (op === 'mem.list') { const t = TEMPLES.has(m.temple) ? m.temple : ''; return reply(p, { op: 'mem', temple: t, list: (D.mem[t] || []).slice(-80) }); }
    if (op === 'mem.add') {
      const t = TEMPLES.has(m.temple) ? m.temple : ''; const n = clean(m.n, 30), kind = m.kind === 'an' ? 'an' : 'sieu'; if (!t || n.length < 2) return;
      const L = (D.mem[t] = D.mem[t] || []); if (L.filter(x => x.uid === p.uid).length >= 6) return reply(p, { op: 'err', msg: 'Mỗi người ghi tối đa 6 tên ở mỗi chùa' });
      L.push({ uid: p.uid, n, kind, by: p.name, t: now }); if (L.length > 400) L.splice(0, L.length - 400); mark();
      if (p.room) broadcast(p.room, { t: 'soc', op: 'mem.new', temple: t, n, kind, by: p.name });
      return reply(p, { op: 'mem', temple: t, list: L.slice(-80) });
    }
    if (op === 'mem.del') { const t = TEMPLES.has(m.temple) ? m.temple : ''; const L = D.mem[t] || []; const i = L.findIndex(x => x.uid === p.uid && x.n === clean(m.n, 30)); if (i >= 0) { L.splice(i, 1); mark(); } return reply(p, { op: 'mem', temple: t, list: L.slice(-80) }); }
    if (op === 'dt.create') {
      const name = clean(m.name, 30); if (name.length < 3) return reply(p, { op: 'err', msg: 'Tên đạo tràng ít nhất 3 ký tự' });
      let id; do { id = Math.random().toString(36).slice(2, 8).toUpperCase(); } while (D.groups[id]);
      if (u.dt && D.groups[u.dt]) leaveGroup(p.uid);
      D.groups[id] = { name, owner: p.uid, members: [p.uid], goal: 3000, wk: {} }; u.dt = id; mark(); return reply(p, { op: 'dt', info: groupInfo(id) });
    }
    if (op === 'dt.join') {
      const id = clean(m.code, 8).toUpperCase(), g = D.groups[id]; if (!g) return reply(p, { op: 'err', msg: 'Không có đạo tràng mã này' });
      if (g.members.length >= 50) return reply(p, { op: 'err', msg: 'Đạo tràng đã đủ 50 người' });
      if (u.dt && u.dt !== id) leaveGroup(p.uid); if (!g.members.includes(p.uid)) g.members.push(p.uid); u.dt = id; mark();
      g.members.forEach(uid => { const oo = online.get(uid); if (oo && oo !== p) send(oo.ws, { t: 'soc', op: 'note', msg: `🪷 ${p.name} vừa gia nhập đạo tràng ${g.name}` }); });
      return reply(p, { op: 'dt', info: groupInfo(id) });
    }
    if (op === 'dt.leave') { leaveGroup(p.uid); mark(); return reply(p, { op: 'dt', info: null }); }
    if (op === 'dt.info') return reply(p, { op: 'dt', info: u.dt ? groupInfo(u.dt) : null });
    if (op === 'dt.merit') {
      const n = Math.max(0, Math.min(200, m.n | 0)), g = D.groups[u.dt]; if (!g || !n) return;
      const wk = weekKey(); g.wk = { [wk]: (g.wk && g.wk[wk]) || {} }; g.wk[wk][p.uid] = (g.wk[wk][p.uid] || 0) + n; mark(); return;
    }
  }
  function leaveGroup(uid) { const u = U(uid), g = D.groups[u.dt]; if (g) { g.members = g.members.filter(x => x !== uid); if (!g.members.length) delete D.groups[u.dt]; else if (g.owner === uid) g.owner = g.members[0]; } u.dt = ''; }
  function onSeen(p) { DU && DU.onSeen && DU.onSeen(p); }
  const DU = makeDuyen({ D, mark, online, reply, U });
  return { handle, seen: (p) => { seen(p); onSeen(p); }, gone, DU };
})();
const DU = SOC.DU;

/* ---------------- CẦU DUYÊN (chùa Hà): hồ sơ, ảnh, tự se duyên, đồng ý đôi bên, trò chuyện riêng ----------------
   An toàn: chỉ người từ 18 tuổi; không lưu số nhà / số điện thoại trong hồ sơ công khai (tự che dãy số dài & đường link);
   ảnh chỉ nhận JPEG ≤ 400 KB; bị 3 người khác nhau báo cáo thì hồ sơ tự ẩn; chặn thì không bao giờ ghép lại. */
/* kiểm tra ảnh có KHUÔN MẶT NGƯỜI (luồng phụ khuon-mat.mjs). Tắt bằng biến môi trường KIEM_TRA_MAT=0 */
const FACE = (() => {
  if (process.env.KIEM_TRA_MAT === '0') { console.log('[cầu duyên] tắt kiểm tra khuôn mặt (KIEM_TRA_MAT=0)'); return null; }
  let w = null, ready = false, broken = '', seq = 0; const wait = new Map();
  function start() {
    try {
      const { Worker } = require('worker_threads'); w = new Worker(path.join(__dirname, 'khuon-mat.mjs'));
      w.on('message', (m) => { if (m.ready) { ready = true; console.log('[cầu duyên] sẵn sàng kiểm tra khuôn mặt trong ảnh'); return; } const f = wait.get(m.id); if (f) { wait.delete(m.id); f(m); } });
      w.on('error', (e) => { broken = String(e && e.message || e); console.log('[cầu duyên] không chạy được kiểm tra khuôn mặt:', broken); });
      w.on('exit', () => { ready = false; w = null; wait.forEach(f => f({ err: 'luồng nhận diện dừng' })); wait.clear(); if (!broken) setTimeout(start, 5000); });
    } catch (e) { broken = String(e.message || e); }
  }
  start();
  return {
    check(buf) { return new Promise((res) => {
      if (!w || !ready) return res({ err: broken || 'đang khởi động bộ nhận diện, thử lại sau vài giây' });
      const id = ++seq; wait.set(id, res); w.postMessage({ id, buf }); setTimeout(() => { if (wait.has(id)) { wait.delete(id); res({ err: 'nhận diện quá lâu' }); } }, 20000);
    }); }
  };
})();
// đạt khi có ≥ 1 khuôn mặt rõ (độ tin cậy ≥ 0,6) chiếm đủ lớn trong ảnh (cạnh ≥ 8% cạnh ngắn của ảnh)
const faceOk = (r) => (r.faces || []).some(f => f.s >= 0.6 && Math.max(f.w, f.h) >= 0.08 * Math.min(r.W, r.H));
function makeDuyen({ D, mark, online, reply, U }) {
  const Y = D.duyen = Object.assign({ prof: {}, pairs: {}, matches: {}, no: {}, likes: {}, reports: {}, up: {}, botAt: {} }, D.duyen || {}); Y.botAt = Y.botAt || {};
  const PR = (uid) => Y.prof[uid] || BOTD.BOT[uid];   // hồ sơ người thật hoặc bạn đồng hành ảo
  const key = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  const age = (pr) => vnYear() - pr.by;
  const card = (pr) => pr && { bot: !!pr.bot, pid: pr.pid, nick: pr.nick, g: pr.g, age: age(pr), prov: pr.prov, ward: pr.ward, ints: pr.ints, about: pr.about, want: pr.want, photos: pr.photos, t: pr.t };
  const tell = (uid, o) => { const pp = online.get(uid); if (pp) reply(pp, o); };
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  function pendingOf(uid) { return Object.values(Y.pairs).filter(x => (x.a === uid || x.b === uid) && !x.done); }
  function matchesOf(uid) { return Object.values(Y.matches).filter(x => x.a === uid || x.b === uid); }
  function viewPair(x, uid) { const me = x.a === uid ? 'a' : 'b', o = me === 'a' ? x.b : x.a; return { id: x.id, other: card(PR(o)), why: x.why, mine: x['s' + me], theirs: x['s' + (me === 'a' ? 'b' : 'a')], t: x.t }; }
  function viewMatch(x, uid) { const o = x.a === uid ? x.b : x.a; return { id: x.id, other: card(PR(o)) || { nick: (D.users[o] || {}).name || 'Người ấy' }, msgs: x.msgs.slice(-60).map(mm => ({ me: mm.f === uid, x: mm.x, t: mm.t })), online: BOTD.isBot(o) || online.has(o) }; }
  function stateFor(uid) { return { op: 'du.me', prof: Y.prof[uid] || null, pairs: pendingOf(uid).map(x => viewPair(x, uid)), matches: matchesOf(uid).map(x => viewMatch(x, uid)) }; }
  // ---- ghép đôi: khác giới theo mong muốn đôi bên, cùng tỉnh, chung ≥1 sở thích, tuổi chênh ≤ 6 ----
  function score(A, B) {
    if (A.uid === B.uid || B.hidden || A.hidden) return -1;
    if (A.seek !== B.g || B.seek !== A.g) return -1;
    if (A.prov !== B.prov) return -1;
    const d = Math.abs(age(A) - age(B)); if (d > 6) return -1;
    const shared = A.ints.filter(i => B.ints.includes(i)); if (!shared.length) return -1;
    if (Y.no[key(A.uid, B.uid)]) return -1;
    if (Object.values(Y.matches).some(x => key(x.a, x.b) === key(A.uid, B.uid))) return -1;
    const ward = A.ward && B.ward && A.ward.toLowerCase() === B.ward.toLowerCase();
    return { s: shared.length * 10 - d * 3 + (ward ? 15 : 0), shared, d, ward };
  }
  function makePair(A, B, why) {
    const x = { id: rid(), a: A.uid, b: B.uid, sa: 0, sb: B.bot ? 1 : 0, t: Date.now(), why, bot: !!B.bot };
    Y.pairs[x.id] = x; mark();
    [A.uid, B.uid].forEach(uid => tell(uid, { op: 'du.pair', pair: viewPair(x, uid) }));
    console.log(`[cầu duyên] se duyên ${A.nick} ♥ ${B.nick} (${why})`);
  }
  function runMatch() {
    const now = Date.now();
    Object.values(Y.pairs).forEach(x => { if (!x.done && now - x.t > 72 * 3600000) { x.done = 1; Y.no[key(x.a, x.b)] = 1; mark(); } });   // quá 3 ngày chưa trả lời → thôi
    Object.keys(Y.pairs).forEach(k => { if (Y.pairs[k].done && now - Y.pairs[k].t > 7 * 86400000) { delete Y.pairs[k]; mark(); } });
    const busy = new Set(); Object.values(Y.pairs).forEach(x => { if (!x.done && !x.bot) { busy.add(x.a); busy.add(x.b); } });
    const L = Object.values(Y.prof).filter(pr => !pr.hidden && now - pr.up < 60 * 86400000).sort((a, b) => a.t - b.t);
    for (const A of L) {
      if (busy.has(A.uid)) continue;
      let best = null; for (const B of L) { if (busy.has(B.uid)) continue; const sc = score(A, B); if (sc !== -1 && (!best || sc.s > best.sc.s)) best = { B, sc }; }
      if (!best) continue;
      const { B, sc } = best; busy.add(A.uid); busy.add(B.uid);
      makePair(A, B, `Cùng ${A.prov}${sc.ward ? ' · cùng ' + A.ward : ''} · cùng thích ${sc.shared.slice(0, 3).join(', ')} · ${sc.d ? 'hơn kém ' + sc.d + ' tuổi' : 'bằng tuổi'}`);
    }
    // chưa có ai hợp duyên → giới thiệu một bạn đồng hành ảo (ghi rõ là ảo) để người chơi không thấy vắng
    for (const A of L) {
      if (busy.has(A.uid) || !online.has(A.uid) || now - A.up < 25000) continue;
      if (matchesOf(A.uid).length || pendingOf(A.uid).length || now - (Y.botAt[A.uid] || 0) < 20 * 3600000) continue;
      const B = botFor(A); if (!B) continue;
      Y.botAt[A.uid] = now; const sh = A.ints.filter(i => B.ints.includes(i));
      makePair(A, B, `🤖 Bạn đồng hành ảo · trò chuyện cho vui trong lúc Cây tình duyên tìm người thật hợp với bạn${sh.length ? ' · cùng thích ' + sh.slice(0, 2).join(', ') : ''}`);
    }
  }
  function botFor(A) {   // bạn ảo khác giới theo mong muốn, ưu tiên cùng tỉnh → chung sở thích → gần tuổi
    let best = null;
    for (const B of BOTD.BOTS) {
      if (B.g !== A.seek || Y.no[key(A.uid, B.uid)]) continue;
      const s = (B.prov === A.prov ? 30 : 0) + A.ints.filter(i => B.ints.includes(i)).length * 8 - Math.abs(B.by - A.by) * 2 + Math.random() * 3;
      if (!best || s > best.s) best = { B, s };
    }
    return best && best.B;
  }
  // bạn ảo trả lời tin nhắn: trễ vài giây như đang gõ
  const botMem = {};
  function botSay(mt, botUid, text, delay) {
    setTimeout(() => {
      if (!Y.matches[mt.id]) return; const t = Date.now(), msg = { f: botUid, x: text, t }; mt.msgs.push(msg); if (mt.msgs.length > 200) mt.msgs.splice(0, mt.msgs.length - 200); mark();
      const user = mt.a === botUid ? mt.b : mt.a; tell(user, { op: 'du.msg', match: mt.id, msg: { me: false, x: text, t }, from: BOTD.BOT[botUid].nick });
    }, delay);
  }
  function botReply(mt, botUid, text) {
    const user = mt.a === botUid ? mt.b : mt.a, mem = (botMem[mt.id] = botMem[mt.id] || {});
    const ans = BOTD.answer(BOTD.BOT[botUid], Y.prof[user], text, mem);
    botSay(mt, botUid, ans, 1800 + Math.min(5000, ans.length * 45) + Math.random() * 1500);
  }
  setInterval(runMatch, 60000);
  function delPhotos(list) { (list || []).forEach(id => { if (/^[a-z0-9]{8,20}$/.test(id)) fs.unlink(path.join(PHOTO_DIR, id + '.jpg'), () => {}); }); }
  function handle(p, u, op, m, now) {
    const uid = p.uid;
    if (op === 'du.me') return reply(p, stateFor(uid));
    if (op === 'du.save') {
      const f = m.prof || {}, by = f.by | 0, yr = vnYear();
      if (!f.adult || by < yr - 90 || yr - by < 18) return reply(p, { op: 'err', msg: 'Cầu duyên chỉ dành cho người từ 18 tuổi trở lên' });
      const g = f.g === 'nam' ? 'nam' : f.g === 'nu' ? 'nu' : ''; if (!g) return reply(p, { op: 'err', msg: 'Chọn giới tính' });
      const prov = PROVS.includes(f.prov) ? f.prov : ''; if (!prov) return reply(p, { op: 'err', msg: 'Chọn tỉnh / thành phố' });
      const ints = (Array.isArray(f.ints) ? f.ints : []).filter(i => INTS.includes(i)).slice(0, 6); if (!ints.length) return reply(p, { op: 'err', msg: 'Chọn ít nhất 1 sở thích' });
      const nick = maskContact(clean(f.nick, 24)); if (nick.length < 2) return reply(p, { op: 'err', msg: 'Nhập biệt danh' });
      const up = Y.up[uid] || [], photos = (Array.isArray(f.photos) ? f.photos : []).filter(id => up.includes(id)).slice(0, 3);
      const old = Y.prof[uid];
      if (old) delPhotos(old.photos.filter(id => !photos.includes(id)));
      delPhotos(up.filter(id => !photos.includes(id) && !(old && old.photos.includes(id)))); Y.up[uid] = photos.slice();
      Y.prof[uid] = { pid: old ? old.pid : rid(), uid, nick, g, seek: f.seek === 'nam' ? 'nam' : f.seek === 'nu' ? 'nu' : (g === 'nam' ? 'nu' : 'nam'), by, prov, ward: maskContact(clean(f.ward, 40)),
        ints, about: maskContact(clean(f.about, 220)), want: maskContact(clean(f.want, 140)), photos, t: old ? old.t : now, up: now, hidden: old ? old.hidden : false };
      mark(); runMatch(); setTimeout(runMatch, 30000); reply(p, stateFor(uid));
      return reply(p, { op: 'note', msg: '💞 Hồ sơ đã treo lên Cây tình duyên · khi có người hợp duyên, hệ thống sẽ báo cho cả hai' });
    }
    if (op === 'du.del') { const pr = Y.prof[uid]; if (pr) { delPhotos(pr.photos); delete Y.prof[uid]; } Object.values(Y.pairs).forEach(x => { if (!x.done && (x.a === uid || x.b === uid)) x.done = 1; }); Y.up[uid] = []; mark(); return reply(p, stateFor(uid)); }
    if (op === 'du.tree') { const L = Object.values(Y.prof).filter(pr => !pr.hidden && now - pr.up < 60 * 86400000).sort((a, b) => b.up - a.up).slice(0, 80); return reply(p, { op: 'du.tree', list: L.map(card), bots: BOTD.BOTS.map(b => Object.assign(card(b), { wish: b.wish })), mine: Y.prof[uid] ? Y.prof[uid].pid : '' }); }
    if (op === 'du.like') {
      const pid = clean(m.pid, 20), B = Object.values(Y.prof).find(x => x.pid === pid) || BOTD.BOTS.find(x => x.pid === pid), A = Y.prof[uid]; if (!B || B.uid === uid) return;
      if (!A) return reply(p, { op: 'err', msg: 'Hãy treo hồ sơ của bạn lên cây trước khi thả tim' });
      Y.likes[uid] = Y.likes[uid] || []; if (!Y.likes[uid].includes(B.uid)) Y.likes[uid].push(B.uid); mark();
      reply(p, { op: 'note', msg: `💗 Đã thả tim cho ${B.nick}` });
      const k = key(uid, B.uid);
      if (B.bot) { if (!Y.no[k] && !pendingOf(uid).some(x => x.bot) && !matchesOf(uid).some(x => key(x.a, x.b) === k)) makePair(A, B, '🤖 Bạn đồng hành ảo · bạn vừa thả tim cho dải cầu duyên này trên cây'); return; }
      if ((Y.likes[B.uid] || []).includes(uid) && !Y.no[k] && !Object.values(Y.pairs).some(x => !x.done && key(x.a, x.b) === k) && !Object.values(Y.matches).some(x => key(x.a, x.b) === k)) makePair(A, B, 'Hai bạn cùng thả tim cho nhau trên Cây tình duyên');
      return;
    }
    if (op === 'du.ans') {
      const x = Y.pairs[clean(m.pair, 20)]; if (!x || x.done || (x.a !== uid && x.b !== uid)) return;
      const me = x.a === uid ? 'a' : 'b', other = me === 'a' ? x.b : x.a; x['s' + me] = m.ok ? 1 : -1; mark();
      if (!m.ok) { x.done = 1; Y.no[key(x.a, x.b)] = 1; tell(other, { op: 'du.closed', pair: x.id, msg: 'Lần này duyên chưa tới. Cây tình duyên sẽ tiếp tục tìm người hợp với bạn 🙏' }); reply(p, stateFor(uid)); return runMatch(); }
      if (x.sa === 1 && x.sb === 1) {
        x.done = 1; const mt = { id: rid(), a: x.a, b: x.b, t: Date.now(), msgs: [] }; Y.matches[mt.id] = mt; mark();
        [x.a, x.b].forEach(id => tell(id, { op: 'du.matched', match: viewMatch(mt, id) }));
        if (x.bot) { const bu = BOTD.isBot(x.a) ? x.a : x.b, hu = bu === x.a ? x.b : x.a; BOTD.greet(BOTD.BOT[bu], Y.prof[hu]).forEach((g, i) => botSay(mt, bu, g, 2500 + i * 4500)); }
      } else { reply(p, { op: 'note', msg: '💞 Đã đồng ý · chờ người ấy trả lời' }); tell(other, { op: 'du.pair', pair: viewPair(x, other) }); }
      return reply(p, stateFor(uid));
    }
    if (op === 'du.msg') {
      const x = Y.matches[clean(m.match, 20)]; if (!x || (x.a !== uid && x.b !== uid)) return;
      if (now - (p.duMsgAt || 0) < 700) return; p.duMsgAt = now;
      const text = clean(m.text, 300); if (!text) return;
      const msg = { f: uid, x: text, t: now }; x.msgs.push(msg); if (x.msgs.length > 200) x.msgs.splice(0, x.msgs.length - 200); mark();
      const other = x.a === uid ? x.b : x.a;
      if (BOTD.isBot(other)) botReply(x, other, text);
      else tell(other, { op: 'du.msg', match: x.id, msg: { me: false, x: text, t: now }, from: (Y.prof[uid] || {}).nick || p.name });
      return reply(p, { op: 'du.msg', match: x.id, msg: { me: true, x: text, t: now } });
    }
    if (op === 'du.end') {
      const x = Y.matches[clean(m.match, 20)]; if (!x || (x.a !== uid && x.b !== uid)) return; const other = x.a === uid ? x.b : x.a;
      delete Y.matches[x.id]; Y.no[key(x.a, x.b)] = m.block ? 2 : 1; mark();
      tell(other, { op: 'du.ended', match: x.id, msg: 'Cuộc trò chuyện đã kết thúc. Chúc bạn sớm gặp duyên lành 🙏' });
      if (m.report && !BOTD.isBot(other)) report(uid, other, clean(m.reason, 120));
      return reply(p, stateFor(uid));
    }
    if (op === 'du.report') { if (String(m.pid || '').startsWith('bot')) return reply(p, { op: 'note', msg: '🙏 Đây là bạn đồng hành ảo của hệ thống, không phải người thật.' }); const B = Object.values(Y.prof).find(x => x.pid === clean(m.pid, 20)); if (B) report(uid, B.uid, clean(m.reason, 120)); return reply(p, { op: 'note', msg: '🙏 Cảm ơn bạn đã báo cáo. Hồ sơ vi phạm sẽ bị ẩn.' }); }
  }
  function report(from, target, reason) {
    const R = (Y.reports[target] = Y.reports[target] || []); if (R.some(r => r.from === from)) return;
    R.push({ from, reason, t: Date.now() }); Y.no[key(from, target)] = 2; mark();
    console.log(`[cầu duyên] BÁO CÁO hồ sơ ${(Y.prof[target] || {}).nick || target}: ${reason || '(không ghi lý do)'} · tổng ${R.length}`);
    if (R.length >= 3 && Y.prof[target]) { Y.prof[target].hidden = true; console.log(`[cầu duyên] ẨN hồ sơ ${Y.prof[target].nick} do bị báo cáo 3 lần`); }
  }
  function onSeen(p) {
    setTimeout(() => { if (Y.prof[p.uid] || pendingOf(p.uid).length || matchesOf(p.uid).length) reply(p, stateFor(p.uid)); }, 1500);
    // bạn ảo hỏi thăm khi người chơi quay lại (tối đa 1 lần / 6 giờ)
    setTimeout(() => { matchesOf(p.uid).forEach(mt => { const bu = BOTD.isBot(mt.a) ? mt.a : BOTD.isBot(mt.b) ? mt.b : null; if (!bu) return;
      const last = mt.msgs.length ? mt.msgs[mt.msgs.length - 1].t : mt.t, lastBot = Math.max(0, ...mt.msgs.filter(x => x.f === bu).map(x => x.t)); if (Date.now() - last < 6 * 3600000 || Date.now() - lastBot < 6 * 3600000) return;
      botSay(mt, bu, BOTD.welcomeBack(BOTD.BOT[bu], Y.prof[p.uid], (Date.now() - last) / 3600000), 6000); }); runMatch(); }, 4000);
  }
  // ảnh: nhận qua HTTP POST thô (image/jpeg), trả về mã ảnh
  function upload(req, res) {
    const uid = cleanUid(req.headers['x-uid']), J = (c, o) => { res.writeHead(c, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
    if (!uid || !D.users[uid]) return J(403, { err: 'Hãy vào game và kết nối máy chủ trước' });
    const up = (Y.up[uid] = Y.up[uid] || []); if (up.length >= 6) return J(429, { err: 'Tối đa 3 ảnh, hãy lưu hồ sơ trước khi tải thêm' });
    const chunks = []; let n = 0, bad = false;
    req.on('data', c => { n += c.length; if (n > 400 * 1024) { bad = true; req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (bad) return J(413, { err: 'Ảnh quá lớn (tối đa 400 KB)' });
      const buf = Buffer.concat(chunks); if (buf.length < 200 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return J(415, { err: 'Chỉ nhận ảnh JPEG' });
      const save = () => { const id = rid(); fs.mkdir(PHOTO_DIR, { recursive: true }, () => fs.writeFile(path.join(PHOTO_DIR, id + '.jpg'), buf, (e) => { if (e) return J(500, { err: 'Không lưu được ảnh' }); up.push(id); mark(); J(200, { id }); })); };
      if (!FACE) return save();
      FACE.check(buf).then(r => {
        if (r.err) { console.log('[cầu duyên] lỗi kiểm tra khuôn mặt:', r.err); return J(503, { err: 'Chưa kiểm tra được ảnh, vui lòng thử lại sau ít phút' }); }
        if (!faceOk(r)) return J(422, { err: 'Không thấy rõ khuôn mặt người trong ảnh. Hãy chọn ảnh chân dung của chính bạn, nhìn rõ mặt.' });
        save();
      });
    });
  }
  function photo(req, res, id) {
    if (!/^[a-z0-9]{8,20}$/.test(id)) { res.writeHead(404); return res.end(); }
    fs.readFile(path.join(PHOTO_DIR, id + '.jpg'), (e, buf) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' }); res.end(buf); });
  }
  function admin() { return { prof: Object.values(Y.prof).map(pr => ({ nick: pr.nick, prov: pr.prov, age: age(pr), hidden: pr.hidden, reports: (Y.reports[pr.uid] || []).length, pid: pr.pid })), pairs: Object.values(Y.pairs).filter(x => !x.done).length, matches: Object.keys(Y.matches).length }; }
  function toggle(pid) { const pr = Object.values(Y.prof).find(x => x.pid === pid); if (pr) { pr.hidden = !pr.hidden; mark(); } }
  return { handle, onSeen, upload, photo, admin, toggle, PROVS, INTS };
}

/* ---------------- WebSocket ---------------- */
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/status' || u === '/server') {   // trang quản trị: chỉ trên chính PC, hoặc qua tên miền khi có ?key=ADMIN_KEY
    const remote = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || !/^(::1|127\.|::ffff:127\.|192\.168\.|10\.|::ffff:192\.168\.|::ffff:10\.)/.test(req.socket.remoteAddress || '');
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (remote && !(ADMIN_KEY && key === ADMIN_KEY)) { res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Trang quản trị chỉ mở trên máy chủ (hoặc thêm ?key=... theo ADMIN_KEY trong cau-hinh-may-chu.bat)'); }
  }
  if (u === '/duyen/anh' && req.method === 'POST') return DU.upload(req, res);
  { const mm = u.match(/^\/duyen\/anh\/([a-z0-9]+)\.jpg$/); if (mm) return DU.photo(req, res, mm[1]); }
  if (u === '/duyen/admin') { const remote = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || !/^(::1|127\.|::ffff:127\.)/.test(req.socket.remoteAddress || ''); const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (remote && !(ADMIN_KEY && key === ADMIN_KEY)) { res.writeHead(403); return res.end('Chỉ mở trên máy chủ'); }
    const hide = new URL(req.url, 'http://x').searchParams.get('an'); if (hide) DU.toggle(hide);
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); return res.end(JSON.stringify(DU.admin(), null, 1)); }
  if (u === '/status') { res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-store' }); return res.end(JSON.stringify(status())); }
  if (u === '/server') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(DASH); }
  serveFile(req, res);
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096, perMessageDeflate: false });
wss.on('connection', (ws, req) => {
  if (total >= MAX_PLAYERS) { stats.rejected++; send(ws, { t: 'full', max: MAX_PLAYERS }); return ws.close(1013, 'full'); }
  total++; stats.peak = Math.max(stats.peak, total);
  const p = { id: nextId++, ws, name: 'Phật tử', look: cleanLook(), beads: 0, merit: 0, badge: '', s: [0, 0, 0, 0, 'idle', 0], room: null, alive: true, win: Date.now(), cnt: 0 };
  ws._p = p; ws.on('pong', () => { p.alive = true; });
  ws.on('message', (data) => {
    stats.msgIn++;
    // chống spam: tối đa 40 tin / giây
    const now = Date.now(); if (now - p.win > 1000) { p.win = now; p.cnt = 0; } if (++p.cnt > 40) { if (p.cnt > 120) { stats.kicked++; ws.close(1008, 'spam'); } return; }
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      p.name = clean(m.name, 24) || 'Phật tử'; p.look = cleanLook(m.look); p.uid = cleanUid(m.uid); if (p.uid) SOC.seen(p); p.beads = num(m.b, 1e9) | 0; p.merit = num(m.m, 1e9) | 0; p.badge = clean(m.bd, 4);
      if (!TEMPLES.has(m.temple)) return;
      return joinRoom(p, m.temple, num(m.ch, 999) | 0);
    }
    const r = p.room; if (!r) return;
    if (m.t === 's') {   // vị trí: [x, y, z, hướng, tư thế, đang đi]
      const a = m.s || []; p.s = [num(a[0], 500), num(a[1], 200), num(a[2], 500), num(a[3], 20), POSES.has(a[4]) ? a[4] : 'idle', a[5] ? 1 : 0]; r.dirty.add(p.id);
    } else if (m.t === 'act') {
      if (!ACTS.has(m.k)) return;
      r.acts.push([p.id, m.k, clean(m.d, 40)]);
      if (r.acts.length > 60) r.acts.shift();
    } else if (m.t === 'chat') {
      const text = clean(m.text, 120); if (!text) return;
      const nowc = Date.now(); if (nowc - (p.chatAt || 0) < 1200) return; p.chatAt = nowc;   // chống spam chat
      broadcast(r, { t: 'chat', id: p.id, name: p.name, text }, p);   // gửi cho mọi người khác trong kênh
    } else if (m.t === 'prof') {
      p.beads = num(m.b, 1e9) | 0; p.merit = num(m.m, 1e9) | 0; p.badge = clean(m.bd, 4);
      broadcast(r, { t: 'prof', id: p.id, b: p.beads, m: p.merit, bd: p.badge }, p);
    } else if (m.t === 'ch') {   // đổi kênh
      const want = num(m.ch, 999) | 0, target = rooms.get(rkey(r.temple, want));
      if (target && target !== r && target.players.size >= ROOM_CAP) return send(ws, { t: 'chfull', ch: want });
      joinRoom(p, r.temple, want || 0, true);
    } else if (m.t === 'chs') send(ws, { t: 'chs', chs: channelsOf(r.temple), cap: ROOM_CAP });
    else if (m.t === 'look') { p.look = cleanLook(m.look); broadcast(r, { t: 'look', id: p.id, look: p.look }, p); }
    else if (m.t === 'soc') SOC.handle(p, m);
  });
  ws.on('close', () => { total--; if (p.uid) SOC.gone(p); leaveRoom(p); });
  ws.on('error', () => {});
});
// gửi gộp vị trí + hành động của cả kênh, TICK_HZ lần mỗi giây (ít gói tin, nhẹ mạng)
setInterval(() => {
  for (const r of rooms.values()) {
    if (!r.dirty.size && !r.acts.length) continue;
    const l = []; for (const id of r.dirty) { const p = r.players.get(id); if (p) l.push([id, ...p.s]); }
    const msg = { t: 's', l }; if (r.acts.length) msg.a = r.acts;
    const s = JSON.stringify(msg);
    for (const p of r.players.values()) send(p.ws, s);
    r.dirty.clear(); r.acts = [];
  }
}, 1000 / TICK_HZ);
// kiểm tra kết nối chết
setInterval(() => { wss.clients.forEach(ws => { const p = ws._p; if (p && !p.alive) return ws.terminate(); if (p) p.alive = false; try { ws.ping(); } catch (e) {} }); }, 20000);

/* ---------------- thống kê ---------------- */
let last = { t: Date.now(), out: 0, http: 0, msgIn: 0, cpu: process.cpuUsage() }, rate = { kbOut: 0, kbHttp: 0, msgIn: 0, cpu: 0 };
setInterval(() => {
  const now = Date.now(), dt = (now - last.t) / 1000;
  const cu = process.cpuUsage(last.cpu);
  rate = { kbOut: (stats.bytesOut - last.out) / 1024 / dt, kbHttp: (stats.bytesHttp - last.http) / 1024 / dt, msgIn: (stats.msgIn - last.msgIn) / dt, cpu: (cu.user + cu.system) / 1e4 / dt };
  last = { t: now, out: stats.bytesOut, http: stats.bytesHttp, msgIn: stats.msgIn, cpu: process.cpuUsage() };
}, 5000);
function status() {
  const temples = {}; for (const r of rooms.values()) (temples[r.temple] = temples[r.temple] || []).push({ ch: r.ch, n: r.players.size });
  Object.values(temples).forEach(l => l.sort((a, b) => a.ch - b.ch));
  const mem = process.memoryUsage();
  return { online: total, max: MAX_PLAYERS, roomCap: ROOM_CAP, tickHz: TICK_HZ, peak: stats.peak, rejected: stats.rejected, kicked: stats.kicked, temples,
    net: { wsKBps: +rate.kbOut.toFixed(1), httpKBps: +rate.kbHttp.toFixed(1), wsMbps: +(rate.kbOut * 8 / 1024).toFixed(2), msgInPerSec: +rate.msgIn.toFixed(0) },
    cpuPct: +rate.cpu.toFixed(1), ramMB: +(mem.rss / 1048576).toFixed(0), load: os.loadavg()[0].toFixed(2), uptimeMin: ((Date.now() - stats.started) / 60000) | 0 };
}
setInterval(() => { const s = status(); if (s.online) console.log(`[${new Date().toLocaleTimeString('vi-VN')}] ${s.online}/${s.max} người · ${Object.entries(s.temples).map(([t, l]) => `${t}: ${l.map(c => c.n).join('+')}`).join(' · ')} · gửi ${s.net.wsMbps} Mbps · RAM ${s.ramMB} MB`); }, 60000);

const DASH = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Máy chủ Chùa Bình An</title>
<style>body{margin:0;padding:16px;font:15px system-ui,sans-serif;background:#1c0b05;color:#fbeed6}h1{font:700 22px Georgia,serif;color:#ffd36b}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.c{background:#2e1408;border:1px solid #5a2c14;border-radius:12px;padding:10px 12px}.c small{color:#d9b98a;display:block}.c b{font-size:24px;color:#ffd36b}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:6px;border-bottom:1px solid #4a2410;text-align:left}.bar{height:8px;background:#4a2410;border-radius:4px;overflow:hidden}.bar i{display:block;height:100%;background:#e3a63a}</style></head>
<body><h1>🛕 Máy chủ Chùa Bình An</h1><div class="g" id="g"></div><table><thead><tr><th>Chùa</th><th>Kênh</th><th>Số người</th></tr></thead><tbody id="t"></tbody></table>
<script>const K=new URLSearchParams(location.search).get('key');async function u(){const s=await (await fetch('/status'+(K?'?key='+encodeURIComponent(K):''))).json();const c=(k,v)=>'<div class="c"><small>'+k+'</small><b>'+v+'</b></div>';
document.getElementById('g').innerHTML=c('Đang chơi',s.online+' / '+s.max)+c('Cao nhất',s.peak)+c('Mạng gửi đi (game)',s.net.wsMbps+' Mbps')+c('Tải file game',(s.net.httpKBps/128).toFixed(2)+' Mbps')+c('CPU (1 nhân)',s.cpuPct+' %')+c('RAM',s.ramMB+' MB')+c('Bị từ chối (đầy)',s.rejected);
let h='';for(const[t,l]of Object.entries(s.temples))for(const r of l)h+='<tr><td>'+t+'</td><td>Kênh '+r.ch+'</td><td><div class="bar"><i style="width:'+(r.n/s.roomCap*100)+'%"></i></div>'+r.n+' / '+s.roomCap+'</td></tr>';
document.getElementById('t').innerHTML=h||'<tr><td colspan=3>Chưa có ai</td></tr>';}u();setInterval(u,3000)</script></body></html>`;

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('🛕 Máy chủ Chùa Bình An đang chạy');
  console.log(`   Chơi trên máy này:      http://localhost:${PORT}/game.html`);
  ips.forEach(ip => console.log(`   Máy khác cùng wifi:     http://${ip}:${PORT}/game.html`));
  console.log(`   Xem tình trạng máy chủ: http://localhost:${PORT}/server`);
  console.log(`   Mỗi kênh tối đa ${ROOM_CAP} người · tổng tối đa ${MAX_PLAYERS} người · ${TICK_HZ} lần cập nhật/giây`);
});
