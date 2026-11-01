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
const TEMPLES = new Set(['binh-an', 'bai-dinh', 'mot-cot', 'huong', 'yen-tu', 'thien-mu', 'linh-ung', 'long-son', 'vinh-nghiem', 'giac-lam', 'doi']);
const POSES = new Set(['idle', 'kneel', 'bow', 'lotus', 'incense', 'carry']);
const ACTS = new Set(['bow', 'bell', 'incense', 'offer', 'lantern', 'mala', 'chant', 'cert']);

/* ---------------- phục vụ file game ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
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
function cleanLook(l) { l = l || {}; return { g: l.g === 'nam' ? 'nam' : 'nu', hair: ['bui', 'dai', 'ngan', 'troc'].includes(l.hair) ? l.hair : 'bui', robe: ['lam', 'nau', 'xam', 'trang'].includes(l.robe) ? l.robe : 'lam' }; }

/* ---------------- WebSocket ---------------- */
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/status' || u === '/server') {   // trang quản trị: chỉ trên chính PC, hoặc qua tên miền khi có ?key=ADMIN_KEY
    const remote = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || !/^(::1|127\.|::ffff:127\.|192\.168\.|10\.|::ffff:192\.168\.|::ffff:10\.)/.test(req.socket.remoteAddress || '');
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (remote && !(ADMIN_KEY && key === ADMIN_KEY)) { res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Trang quản trị chỉ mở trên máy chủ (hoặc thêm ?key=... theo ADMIN_KEY trong cau-hinh-may-chu.bat)'); }
  }
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
      p.name = clean(m.name, 24) || 'Phật tử'; p.look = cleanLook(m.look); p.beads = num(m.b, 1e9) | 0; p.merit = num(m.m, 1e9) | 0; p.badge = clean(m.bd, 4);
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
  });
  ws.on('close', () => { total--; leaveRoom(p); });
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
