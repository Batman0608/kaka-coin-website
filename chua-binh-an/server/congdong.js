/* =====================================================================
   CỘNG ĐỒNG & SỰ KIỆN (máy chủ)
   · Bảng Công Đức TUẦN (người thật) + thưởng top 3 tuần trước
   · Mời bạn: mã mời = mã nhân vật; bạn mới vào chơi qua đường mời được tính cho người mời
   · Đèn nguyện / hoa đăng có tên: lưu theo tuần, bình chọn lời nguyện hay (cuộc thi "Lời nguyện hay")
   · Thi ảnh "Góc chùa đẹp nhất": ảnh JPEG chụp trong game, mỗi người 1 ảnh / ngày, bình chọn
   · Khóa tu cuối tuần: đếm số người thật đang cùng tụng / thiền
   Dữ liệu nằm trong D.cd của tệp xa-hoi.json (ngoài thư mục game).
   ===================================================================== */
'use strict';
const fs = require('fs'), path = require('path');

function makeCongDong({ D, mark, reply, online, clean, cleanUid, codeOf, U, DATA_DIR }) {
  const C = D.cd = Object.assign({ wk: {}, inv: {}, lan: {}, pics: {}, prize: {} }, D.cd || {});
  const PIC_DIR = path.join(DATA_DIR, 'cong-dong-anh');
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const vn = (t = Date.now()) => new Date(t + 7 * 3600000);
  const wkOf = (t = Date.now()) => { const d = vn(t), n = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000); return 'W' + Math.floor((n + 3) / 7); };   // tuần bắt đầu thứ Hai (giống máy khách)
  const day = () => vn().toISOString().slice(0, 10);
  const kt = new Map();   // khóa tu cuối tuần: uid → lần báo gần nhất
  const PRIZE = [100, 60, 30];   // hoa sen cho top 1-2-3 tuần trước

  // dọn dữ liệu cũ: chỉ giữ tuần này và tuần trước
  function prune() {
    const keep = new Set([wkOf(), wkOf(Date.now() - 7 * 86400000)]);
    ['wk', 'lan', 'pics', 'prize'].forEach(k => Object.keys(C[k]).forEach(w => { if (!keep.has(w)) { if (k === 'pics') (C.pics[w] || []).forEach(x => fs.unlink(path.join(PIC_DIR, x.id + '.jpg'), () => {})); delete C[k][w]; } }));
  }
  setInterval(prune, 3600000); prune();

  const topOf = (w, n = 10) => Object.entries(C.wk[w] || {}).map(([uid, x]) => ({ uid, name: x.name, n: x.n })).sort((a, b) => b.n - a.n).slice(0, n);
  const pubItem = (x, uid) => ({ id: x.id, name: x.name, code: codeOf(x.uid), text: x.text, temple: x.temple, ev: x.ev, t: x.t, v: x.v.length, mine: x.uid === uid, voted: x.v.includes(uid) });

  function handle(p, op, m) {
    const uid = p.uid, u = U(uid), w = wkOf(), now = Date.now();
    if (!u.first) { u.first = now; mark(); }
    if (op === 'cd.merit') {   // cộng công đức tuần (máy khách gửi gộp mỗi 20 giây)
      const n = Math.max(0, Math.min(3000, m.n | 0)); if (!n) return;
      const W = (C.wk[w] = C.wk[w] || {}), x = (W[uid] = W[uid] || { n: 0, name: p.name }); x.n += n; x.name = p.name; mark(); return;
    }
    if (op === 'cd.top') {
      const L = topOf(w), all = Object.entries(C.wk[w] || {}).sort((a, b) => b[1].n - a[1].n), k = all.findIndex(([id]) => id === uid);
      const lw = wkOf(now - 7 * 86400000);
      return reply(p, { op: 'cd.top', wk: w, list: L.map((x, i) => ({ r: i + 1, name: x.name, code: codeOf(x.uid), n: x.n, me: x.uid === uid })), mine: k >= 0 ? { r: k + 1, n: all[k][1].n } : null,
        last: topOf(lw, 3).map((x, i) => ({ r: i + 1, name: x.name, n: x.n, prize: PRIZE[i] })), players: all.length });
    }
    if (op === 'cd.prize') {   // thưởng top 3 tuần trước (nhận một lần)
      const lw = wkOf(now - 7 * 86400000), k = topOf(lw, 3).findIndex(x => x.uid === uid); const P2 = (C.prize[lw] = C.prize[lw] || {});
      if (k < 0 || P2[uid]) return; P2[uid] = 1; mark(); return reply(p, { op: 'cd.prize', r: k + 1, lotus: PRIZE[k], wk: lw });
    }
    if (op === 'cd.inv') {   // người mới vào qua đường mời
      const by = Object.keys(D.users).find(id => codeOf(id) === String(m.code || '').toUpperCase().slice(0, 6));
      if (!by || by === uid || u.invBy || now - u.first > 2 * 86400000) return reply(p, { op: 'cd.inv.ok', ok: false });
      u.invBy = by; (C.inv[by] = C.inv[by] || []).push({ uid, t: now }); mark();
      const o = online.get(by); if (o) reply(o, { op: 'cd.invited', name: p.name });
      return reply(p, { op: 'cd.inv.ok', ok: true, by: (D.users[by] || {}).name || 'bạn' });
    }
    if (op === 'cd.invn') { const L = C.inv[uid] || []; return reply(p, { op: 'cd.invn', n: L.length, wk: L.filter(x => wkOf(x.t) === w).length, code: codeOf(uid) }); }
    if (op === 'cd.lan') {   // đèn nguyện / hoa đăng có lời nguyện
      const text = clean(m.text, 80); if (text.length < 2) return; const L = (C.lan[w] = C.lan[w] || []);
      const mine = L.filter(x => x.uid === uid && now - x.t < 600000); if (mine.length >= 3) return;   // tối đa 3 đèn / 10 phút
      L.push({ id: rid(), uid, name: p.name, text, temple: clean(m.temple, 20), ev: clean(m.ev, 10), t: now, v: [] }); if (L.length > 600) L.splice(0, L.length - 600); mark(); return;
    }
    if (op === 'cd.lanlist') {
      let L = (C.lan[w] || []).slice(); if (m.temple) L = L.filter(x => x.temple === m.temple); if (m.ev) L = L.filter(x => x.ev === m.ev); if (m.since) L = L.filter(x => x.t >= +m.since);
      L = m.sort === 'top' ? L.sort((a, b) => b.v.length - a.v.length || b.t - a.t) : L.sort((a, b) => b.t - a.t);
      return reply(p, { op: 'cd.lanlist', key: m.key || '', list: L.slice(0, 40).map(x => pubItem(x, uid)) });
    }
    if (op === 'cd.vote' || op === 'cd.picvote') {
      const L = op === 'cd.vote' ? (C.lan[w] || []) : (C.pics[w] || []), x = L.find(y => y.id === m.id); if (!x || x.uid === uid) return;
      const i = x.v.indexOf(uid); if (i >= 0) x.v.splice(i, 1); else x.v.push(uid); mark();
      return reply(p, { op: 'cd.voted', id: x.id, v: x.v.length, voted: i < 0 });
    }
    if (op === 'cd.piclist') {
      const L = (C.pics[w] || []).slice().sort(m.sort === 'top' ? (a, b) => b.v.length - a.v.length || b.t - a.t : (a, b) => b.t - a.t);
      return reply(p, { op: 'cd.piclist', list: L.slice(0, 30).map(x => pubItem(x, uid)) });
    }
    if (op === 'cd.kt') {   // khóa tu cuối tuần: đang tham gia (gửi lại mỗi 30 giây)
      if (m.on) kt.set(uid, now); else kt.delete(uid);
      for (const [k, t] of kt) if (now - t > 75000) kt.delete(k);
      return reply(p, { op: 'cd.kt', n: kt.size });
    }
  }
  // ảnh thi "Góc chùa đẹp nhất": HTTP POST thô (image/jpeg), tiêu đề x-uid, x-temple
  function upload(req, res) {
    const uid = cleanUid(req.headers['x-uid']), J = (c, o) => { res.writeHead(c, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
    if (!uid || !D.users[uid]) return J(403, { err: 'Hãy vào game và kết nối máy chủ trước' });
    const w = wkOf(), L = (C.pics[w] = C.pics[w] || []), d = day();
    if (L.some(x => x.uid === uid && x.day === d)) return J(429, { err: 'Mỗi ngày chỉ gửi 1 ảnh dự thi' });
    const chunks = []; let n = 0, bad = false;
    req.on('data', c => { n += c.length; if (n > 350 * 1024) { bad = true; req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (bad) return J(413, { err: 'Ảnh quá lớn' });
      const buf = Buffer.concat(chunks); if (buf.length < 200 || buf[0] !== 0xff || buf[1] !== 0xd8) return J(415, { err: 'Chỉ nhận ảnh JPEG' });
      const id = rid(); fs.mkdir(PIC_DIR, { recursive: true }, () => fs.writeFile(path.join(PIC_DIR, id + '.jpg'), buf, (e) => {
        if (e) return J(500, { err: 'Không lưu được ảnh' });
        L.push({ id, uid, name: (D.users[uid] || {}).name || 'Phật tử', text: clean(decodeURIComponent(req.headers['x-note'] || ''), 60), temple: clean(decodeURIComponent(req.headers['x-temple'] || ''), 30), day: d, t: Date.now(), v: [] }); mark(); J(200, { id });
      }));
    });
  }
  function photo(req, res, id) {
    if (!/^[a-z0-9]{8,20}$/.test(id)) { res.writeHead(404); return res.end(); }
    fs.readFile(path.join(PIC_DIR, id + '.jpg'), (e, buf) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' }); res.end(buf); });
  }
  return { handle, upload, photo };
}
module.exports = { makeCongDong };
