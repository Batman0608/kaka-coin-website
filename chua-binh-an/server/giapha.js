/* =========================================================================
 *  GIA PHẢ DÒNG HỌ — lưu trên máy chủ, gắn với MÃ NHÂN VẬT
 *  · Mỗi người lập tối đa 3 gia phả (là "chủ gia phả").
 *  · Chủ gia phả thêm mã nhân vật của người thân → người đó xem & sửa được.
 *  · Ai không có quyền thì không xem được gì (kể cả biết mã gia phả).
 *  · Mọi thay đổi được gửi ngay cho những người đang mở cùng gia phả.
 * ========================================================================= */
'use strict';
const MAX_FAM = 3, MAX_PEOPLE = 800, MAX_ED = 30;

function makeGiaPha({ D, mark, online, reply, send, clean, codeOf }) {
  const G = D.gp = Object.assign({ fam: {} }, D.gp || {});
  const rid = () => Math.random().toString(36).slice(2, 10);
  const nameOf = (uid) => (D.users[uid] && D.users[uid].name) || 'Phật tử';
  const pidOf = (uid) => (D.users[uid] && D.users[uid].pid) || codeOf(uid);   // mã nhân vật hiện trong Hồ sơ (CBA…)
  const findUid = (code) => Object.keys(D.users).find(k => D.users[k].pid === code) || Object.keys(D.users).find(k => codeOf(k) === code);
  const role = (f, uid) => !f ? '' : f.owner === uid ? 'owner' : (f.ed || []).includes(uid) ? 'editor' : '';
  const summary = (f, uid) => ({ id: f.id, name: f.name, origin: f.origin || '', n: Object.keys(f.people).length, owner: nameOf(f.owner), ownerCode: pidOf(f.owner), role: role(f, uid), up: f.up });
  const full = (f, uid) => ({ id: f.id, name: f.name, origin: f.origin || '', note: f.note || '', owner: nameOf(f.owner), ownerCode: pidOf(f.owner), role: role(f, uid), up: f.up,
    people: Object.values(f.people), editors: (f.ed || []).map(u => ({ uid: u, code: pidOf(u), name: nameOf(u), online: online.has(u) })), log: (f.log || []).slice(-30) });
  function push(f, exceptP, note) {   // gửi bản mới cho mọi người có quyền đang online
    [f.owner, ...(f.ed || [])].forEach(u => { const o = online.get(u); if (o && o !== exceptP) send(o.ws, { t: 'soc', op: 'gp.fam', fam: full(f, u), note }); });
  }
  function log(f, p, act) { f.log = (f.log || []).slice(-59); f.log.push({ by: p.name, act: clean(act, 120), t: Date.now() }); f.up = Date.now(); mark(); }
  const yr = (v) => { const s = clean(v, 10); return /^\d{3,4}$/.test(s) ? s : s ? s.replace(/[^\d?~\-]/g, '').slice(0, 10) : ''; };
  function cleanPerson(f, x, old) {
    const o = old || { id: 'p' + rid(), spouseIds: [] };
    const ids = new Set(Object.keys(f.people));
    const ref = (v) => { v = clean(v, 20); return ids.has(v) && v !== o.id ? v : ''; };
    o.name = clean(x.name, 60) || o.name || 'Chưa đặt tên';
    o.gender = x.gender === 'nu' ? 'nu' : 'nam';
    o.title = clean(x.title, 40); o.branch = clean(x.branch, 40); o.other = clean(x.other, 40);
    o.order = Math.max(0, Math.min(30, x.order | 0));
    o.birth = yr(x.birth); o.death = yr(x.death); o.dead = !!(x.dead || o.death);
    o.gioDay = o.dead ? Math.max(0, Math.min(30, x.gioDay | 0)) || null : null;
    o.gioMonth = o.dead ? Math.max(0, Math.min(12, x.gioMonth | 0)) || null : null;
    o.burial = clean(x.burial, 80); o.place = clean(x.place, 80); o.note = clean(x.note, 400);
    o.code = /^[A-Z0-9]{6,9}$/.test(String(x.code || '').toUpperCase()) ? String(x.code).toUpperCase() : '';   // mã nhân vật trong game (nếu người này cũng chơi)
    o.fatherId = ref(x.fatherId); o.motherId = ref(x.motherId);
    o.spouseIds = Array.isArray(x.spouseIds) ? [...new Set(x.spouseIds.map(ref).filter(Boolean))].slice(0, 6) : (o.spouseIds || []);
    return o;
  }
  function linkSpouses(f, p) {   // vợ/chồng luôn hai chiều
    Object.values(f.people).forEach(q => { if (q.id === p.id) return; const has = p.spouseIds.includes(q.id), back = (q.spouseIds || []).includes(p.id);
      if (has && !back) q.spouseIds = [...(q.spouseIds || []), p.id]; if (!has && back) q.spouseIds = q.spouseIds.filter(i => i !== p.id); });
  }
  function handle(p, op, m) {
    const uid = p.uid;
    if (op === 'gp.list') {
      const pid = String(m.pid || '').toUpperCase(); if (/^CBA[A-Z0-9]{6}$/.test(pid) && D.users[uid] && D.users[uid].pid !== pid) { D.users[uid].pid = pid; mark(); }
      const all = Object.values(G.fam), own = all.filter(f => f.owner === uid), sh = all.filter(f => (f.ed || []).includes(uid));
      return reply(p, { op: 'gp.list', own: own.map(f => summary(f, uid)), shared: sh.map(f => summary(f, uid)), me: pidOf(uid), max: MAX_FAM });
    }
    if (op === 'gp.create') {
      const own = Object.values(G.fam).filter(f => f.owner === uid);
      if (own.length >= MAX_FAM) return reply(p, { op: 'err', msg: `Mỗi người lập tối đa ${MAX_FAM} gia phả` });
      const name = clean(m.name, 50); if (name.length < 2) return reply(p, { op: 'err', msg: 'Hãy nhập tên dòng họ (ví dụ: Họ Nguyễn Văn – Nam Định)' });
      let id; do { id = rid(); } while (G.fam[id]);
      const f = G.fam[id] = { id, name, origin: clean(m.origin, 60), note: '', owner: uid, ed: [], people: {}, t: Date.now(), up: Date.now(), log: [] };
      if (m.first && m.first.name) { const pr = cleanPerson(f, m.first); f.people[pr.id] = pr; }
      log(f, p, 'lập gia phả'); return reply(p, { op: 'gp.fam', fam: full(f, uid), opened: true });
    }
    const f = G.fam[clean(m.id, 20)], r = role(f, uid);
    if (!f || !r) return reply(p, { op: 'err', msg: 'Bạn không có quyền xem gia phả này. Hãy nhờ chủ gia phả thêm mã nhân vật của bạn.' });
    if (op === 'gp.get') return reply(p, { op: 'gp.fam', fam: full(f, uid), opened: true });
    if (op === 'gp.meta') {
      f.name = clean(m.name, 50) || f.name; f.origin = clean(m.origin, 60); f.note = clean(m.note, 400);
      log(f, p, 'sửa thông tin dòng họ'); reply(p, { op: 'gp.fam', fam: full(f, uid) }); return push(f, p);
    }
    if (op === 'gp.put') {
      const x = m.person || {}, old = x.id && f.people[x.id];
      if (!old && Object.keys(f.people).length >= MAX_PEOPLE) return reply(p, { op: 'err', msg: `Gia phả tối đa ${MAX_PEOPLE} người` });
      const pr = cleanPerson(f, x, old); f.people[pr.id] = pr; linkSpouses(f, pr);
      // thêm nhanh theo quan hệ: con của / vợ chồng của / cha mẹ của
      const rel = m.rel || {}, base = f.people[clean(rel.of, 20)];
      if (!old && base) {
        if (rel.kind === 'child') { if (base.gender === 'nam') { pr.fatherId = base.id; pr.motherId = pr.motherId || (base.spouseIds || [])[0] || ''; } else { pr.motherId = base.id; pr.fatherId = pr.fatherId || (base.spouseIds || [])[0] || ''; } }
        if (rel.kind === 'spouse') { pr.spouseIds = [base.id]; linkSpouses(f, pr); }
        if (rel.kind === 'parent') { if (pr.gender === 'nam' && !base.fatherId) base.fatherId = pr.id; else if (pr.gender === 'nu' && !base.motherId) base.motherId = pr.id; else if (!base.fatherId) base.fatherId = pr.id; else base.motherId = pr.id;
          // cha mẹ của một người cũng là cha mẹ của anh chị em ruột chưa có cha/mẹ? — không tự đoán, để người dùng chọn
          const other = pr.gender === 'nam' ? base.motherId : base.fatherId; if (other && f.people[other] && !pr.spouseIds.includes(other)) { pr.spouseIds.push(other); linkSpouses(f, pr); } }
      }
      log(f, p, `${old ? 'sửa' : 'thêm'} ${pr.name}`); reply(p, { op: 'gp.fam', fam: full(f, uid), focus: pr.id }); return push(f, p);
    }
    if (op === 'gp.del') {
      const pid = clean(m.pid, 20), pr = f.people[pid]; if (!pr) return;
      delete f.people[pid];
      Object.values(f.people).forEach(q => { if (q.fatherId === pid) q.fatherId = ''; if (q.motherId === pid) q.motherId = ''; q.spouseIds = (q.spouseIds || []).filter(i => i !== pid); });
      log(f, p, `xóa ${pr.name}`); reply(p, { op: 'gp.fam', fam: full(f, uid) }); return push(f, p);
    }
    if (op === 'gp.import') {   // nhập từ tệp: { members:[...] } hoặc mảng — chỉ chủ gia phả, thay toàn bộ
      if (r !== 'owner') return reply(p, { op: 'err', msg: 'Chỉ chủ gia phả mới nhập được tệp' });
      const L = Array.isArray(m.members) ? m.members.slice(0, MAX_PEOPLE) : []; if (!L.length) return reply(p, { op: 'err', msg: 'Tệp không có dữ liệu gia phả' });
      const map = {}; L.forEach(x => { map[String(x.id)] = 'p' + rid(); });
      f.people = {}; L.forEach(x => { const id = map[String(x.id)]; f.people[id] = { id, spouseIds: [] }; });
      L.forEach(x => { const id = map[String(x.id)]; const y = Object.assign({}, x, { fatherId: map[x.fatherId] || '', motherId: map[x.motherId] || '', spouseIds: (x.spouseIds || []).map(s => map[s]).filter(Boolean) }); f.people[id] = cleanPerson(f, y, f.people[id]); f.people[id].id = id; });
      if (m.name) f.name = clean(m.name, 50) || f.name;
      log(f, p, `nhập ${L.length} người từ tệp`); reply(p, { op: 'gp.fam', fam: full(f, uid) }); return push(f, p);
    }
    if (op === 'gp.ed.add') {
      if (r !== 'owner') return reply(p, { op: 'err', msg: 'Chỉ chủ gia phả mới thêm người cùng quản lý' });
      const code = clean(m.code, 12).toUpperCase(), u2 = findUid(code);
      if (!u2) return reply(p, { op: 'err', msg: 'Không tìm thấy mã nhân vật ' + code + '. Người đó cần vào game ít nhất một lần.' });
      if (u2 === uid) return reply(p, { op: 'err', msg: 'Đây là mã của chính bạn' });
      f.ed = f.ed || []; if (f.ed.length >= MAX_ED) return reply(p, { op: 'err', msg: `Tối đa ${MAX_ED} người cùng quản lý` });
      if (!f.ed.includes(u2)) f.ed.push(u2);
      log(f, p, `thêm ${nameOf(u2)} (${code}) cùng quản lý`);
      const o = online.get(u2); if (o) send(o.ws, { t: 'soc', op: 'note', msg: `📜 ${p.name} đã mời bạn cùng quản lý gia phả "${f.name}" · đến gặp ông giữ gia phả ở chùa để xem` });
      reply(p, { op: 'gp.fam', fam: full(f, uid) }); return push(f, p);
    }
    if (op === 'gp.ed.del') {
      const u2 = String(m.uid || ''); if (r !== 'owner' && u2 !== uid) return;
      f.ed = (f.ed || []).filter(x => x !== u2); log(f, p, u2 === uid ? 'rời quản lý' : `bỏ quyền của ${nameOf(u2)}`);
      if (u2 === uid) { mark(); return reply(p, { op: 'gp.left', id: f.id }); }
      const o = online.get(u2); if (o) send(o.ws, { t: 'soc', op: 'gp.left', id: f.id });
      reply(p, { op: 'gp.fam', fam: full(f, uid) }); return push(f, p);
    }
    if (op === 'gp.drop') {
      if (r !== 'owner') return; const ed = f.ed || []; delete G.fam[f.id]; mark();
      ed.forEach(u2 => { const o = online.get(u2); if (o) send(o.ws, { t: 'soc', op: 'gp.left', id: f.id }); });
      return reply(p, { op: 'gp.left', id: f.id, dropped: true });
    }
  }
  return { handle };
}
module.exports = { makeGiaPha };
