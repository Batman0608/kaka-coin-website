/* =========================================================================
 *  GIA PHẢ DÒNG HỌ — "Ông giữ gia phả" đứng ở mỗi chùa
 *  · Bấm vào ông → mở bảng gia phả của mình (lưu trên máy chủ theo mã nhân vật).
 *  · Chủ gia phả thêm MÃ NHÂN VẬT của người thân → người đó đến gặp ông giữ
 *    gia phả ở bất kỳ chùa nào là xem & sửa được. Người khác không xem được.
 *  · Cây phả hệ theo đời, thêm Con / Vợ-Chồng / Cha-Mẹ ngay trên từng người,
 *    danh sách tìm kiếm, lịch giỗ âm lịch (tự đổi ra dương lịch), ghi sổ cầu siêu.
 * ========================================================================= */
const TITLES = ['Cụ Tổ', 'Cụ Tổ Mẫu', 'Trưởng họ', 'Trưởng chi', 'Cụ ông', 'Cụ bà', 'Ông', 'Bà', 'Cha', 'Mẹ', 'Con trưởng', 'Con thứ', 'Con út', 'Cháu đích tôn', 'Thủ từ', 'Thủ quỹ họ'];

export function initGiaPha({ THREE, scene, Avatar, label, placeLabel, me, getW, NET, P, el, modal, closeModal, toast, A, getTemple }) {
  let keeper = null, box = null, list = null, fam = null, view = 'home', tab = 'tree', sel = '', zoom = 1, q = '', genF = '';
  const $q = (s, r = box) => r && r.querySelector(s);
  const btn = (t, cls, fn) => { const b = el('button', 'btn ' + (cls || ''), t); b.type = 'button'; b.onclick = fn; return b; };
  const field = (lab, inp, hint) => { const w = el('label', 'gpf'); w.append(el('span', '', lab), inp); if (hint) w.append(el('small', '', hint)); return w; };
  const input = (v, ph, type = 'text', max = 60) => { const i = el('input'); i.type = type; i.value = v == null ? '' : v; i.placeholder = ph || ''; i.maxLength = max; i.addEventListener('keydown', e => e.stopPropagation()); return i; };
  const isOpen = () => box && document.body.contains(box);

  /* ---------- kết nối máy chủ ---------- */
  NET.onSoc((m) => {
    if (m.op === 'gp.list') { list = m; if (isOpen() && view === 'home') render(); }
    else if (m.op === 'gp.fam') { const same = fam && fam.id === m.fam.id; if (!m.opened && !same) return; fam = m.fam; if (m.focus) sel = m.focus; if (m.opened) { view = 'fam'; } if (m.note) toast(m.note); if (isOpen()) render(); }
    else if (m.op === 'gp.left') { if (fam && fam.id === m.id) { fam = null; view = 'home'; if (m.dropped) toast('🗑 Đã xóa gia phả'); else toast('📜 Bạn không còn quyền ở gia phả này'); } NET.soc('gp.list'); if (isOpen()) render(); }
  });

  /* ---------- ông giữ gia phả ---------- */
  function onTemple() {
    dispose(); const W = getW(); if (!W || !W.layout || !W.layout.abbot) return;
    const [ax, az] = W.layout.abbot, ay = W.col.heightAt(ax, az, 50) ?? 0;
    let pos = null;
    for (let i = 0; i < 12 && !pos; i++) { const a = i / 12 * Math.PI * 2 + 0.4, r = 2.8 + (i % 2) * 0.8, x = ax + Math.cos(a) * r, z = az + Math.sin(a) * r;
      let ok = true; for (let k = 0; k <= 4 && ok; k++) { const b = k / 4 * Math.PI * 2, rr = k === 4 ? 0 : 0.6, h = W.col.heightAt(x + Math.cos(b) * rr, z + Math.sin(b) * rr, ay + 0.5, 0.3); if (h == null || Math.abs(h - ay) > 0.06) ok = false; }
      if (ok) pos = [x, z]; }
    if (!pos) pos = [ax + 2.8, az];
    const av = new Avatar({ look: { g: 'nam', hair: 'ngan', robe: 'nau', mala: 'tram' }, seed: 31 });
    av.root.position.set(pos[0], W.col.heightAt(pos[0], pos[1], 50) ?? ay, pos[1]); av.root.userData.tmp = true; scene.add(av.root);
    // bàn gỗ nhỏ đặt cuốn phả
    const desk = new THREE.Group(); desk.position.copy(av.root.position); desk.userData.tmp = true;
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a3a1e, roughness: 0.8 }), book = new THREE.MeshStandardMaterial({ color: 0xa3231a, roughness: 0.6 }), gold = new THREE.MeshStandardMaterial({ color: 0xd9a83a, metalness: 0.6, roughness: 0.4 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.55), wood); top.position.y = 0.78; desk.add(top);
    [[-0.42, -0.22], [0.42, -0.22], [-0.42, 0.22], [0.42, 0.22]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.76, 0.06), wood); l.position.set(x, 0.38, z); desk.add(l); });
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.3), book); bk.position.set(0, 0.85, 0); desk.add(bk);
    const bk2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.32), gold); bk2.position.set(0, 0.9, 0); desk.add(bk2);
    const yaw = Math.atan2(ax - pos[0], az - pos[1]) + Math.PI;   // quay lưng về phía sư trụ trì, mặt ra sân
    av.root.rotation.y = yaw; desk.rotation.y = yaw; desk.translateZ(0.7); scene.add(desk);
    keeper = { av, desk, label: label('📜 Ông giữ gia phả', 'abbot'), lastBow: 0 };
  }
  function dispose() { if (keeper) { scene.remove(keeper.av.root); scene.remove(keeper.desk); keeper.label.remove(); keeper = null; } }
  function step(dt) {
    if (!keeper) return; placeLabel(keeper.label, keeper.av.root.position, keeper.av.height + 0.15);
    if (keeper.av.update) keeper.av.update(dt);
    const d = Math.hypot(me.pos.x - keeper.av.root.position.x, me.pos.z - keeper.av.root.position.z);
    if (d < 4 && performance.now() - keeper.lastBow > 20000) { keeper.lastBow = performance.now(); keeper.av.bow && keeper.av.bow(); }
  }
  function context() {
    if (!keeper) return null; const p = keeper.av.root.position;
    if (Math.hypot(me.pos.x - p.x, me.pos.z - p.z) > 2.8) return null;
    return { label: '📜 Gia phả dòng họ', fn: open };
  }

  /* ---------- mở bảng ---------- */
  function open() {
    view = fam ? 'fam' : 'home';
    const ask = () => { if (!NET.soc('gp.list')) return false; if (fam) NET.soc('gp.get', { id: fam.id }); return true; };
    modal('📜 Gia phả dòng họ', (b) => { box = b; b.classList.add('gpm'); render(); }, { wide: true });
    if (!ask()) { const iv = setInterval(() => { if (!isOpen()) return clearInterval(iv); if (ask()) clearInterval(iv); }, 1500); }
    if (keeper && keeper.av.bow) keeper.av.bow();
  }
  function render() {
    if (!isOpen()) return; const head = box.querySelector('.mhead'); [...box.children].forEach(c => { if (c !== head) c.remove(); });
    const body = el('div', 'gpbody'); box.append(body);
    if (view === 'fam' && fam) renderFam(body); else renderHome(body);
  }

  /* ---------- màn hình đầu: danh sách gia phả ---------- */
  function renderHome(b) {
    const intro = el('div', 'gpintro');
    const ban = el('div', 'gpban'); ban.append(el('div', 'gpico', '📜'));
    const bt = el('div'); bt.append(el('b', '', 'Gia phả dòng họ'), el('p', '', 'Ghi chép cây phả hệ, nhớ ngày giỗ ông bà tổ tiên. Chỉ bạn và người thân được bạn thêm mã nhân vật mới xem và sửa được.')); ban.append(bt); intro.append(ban);
    const myc = el('div', 'gpcode'); myc.append(el('span', '', '🔑 Mã nhân vật của bạn'), el('b', '', list ? list.me : '…'));
    if (list) myc.append(btn('📋 Chép', 'sm', async () => { try { await navigator.clipboard.writeText(list.me); toast('📋 Đã chép mã ' + list.me); } catch (e) {} }));
    myc.append(el('small', '', 'Đưa mã này cho người lập gia phả để được thêm vào cùng xem & sửa.'));
    intro.append(myc); b.append(intro);
    if (!list) { b.append(el('p', 'note', NET.online ? 'Đang tải…' : '⏳ Đang kết nối máy chủ… (gia phả cần có mạng)')); return; }
    const card = (f) => { const c = el('button', 'gpcard'); c.type = 'button';
      c.append(el('i', 'gpcico', '🏯'), el('b', '', f.name), el('small', '', `${f.origin ? f.origin + ' · ' : ''}${f.n} người`), el('span', 'gprole ' + f.role, f.role === 'owner' ? '👑 Chủ gia phả' : `🤝 Cùng quản lý · chủ: ${f.owner}`));
      c.onclick = () => { NET.soc('gp.get', { id: f.id }); }; return c; };
    b.append(el('h3', 'gph', '📖 Gia phả do bạn lập'));
    const g1 = el('div', 'gpgrid'); list.own.forEach(f => g1.append(card(f)));
    if (list.own.length < list.max) { const nw = el('button', 'gpcard new'); nw.type = 'button'; nw.append(el('b', '', '＋ Lập gia phả mới'), el('small', '', `Còn lập được ${list.max - list.own.length} gia phả`)); nw.onclick = createForm; g1.append(nw); }
    b.append(g1);
    b.append(el('h3', 'gph', '🤝 Được mời cùng quản lý'));
    if (!list.shared.length) b.append(el('p', 'note', 'Chưa có. Khi người thân thêm mã nhân vật của bạn vào gia phả của họ, gia phả đó sẽ hiện ở đây.'));
    else { const g2 = el('div', 'gpgrid'); list.shared.forEach(f => g2.append(card(f))); b.append(g2); }
  }
  function createForm() {
    const b = box.querySelector('.gpbody'); b.innerHTML = '';
    b.append(el('h3', 'gph', '＋ Lập gia phả mới'));
    const nm = input('', 'Ví dụ: Họ Nguyễn Văn', 'text', 50), og = input('', 'Ví dụ: Làng Hành Thiện, Nam Định', 'text', 60);
    b.append(field('Tên dòng họ *', nm), field('Quê gốc / nơi lập từ đường', og));
    b.append(el('h3', 'gph', 'Bắt đầu từ ai?'));
    const st = el('div', 'gpchoice'); let start = 'to';
    const c1 = el('button', 'gpch on', '👴 Cụ Tổ (người đời đầu tiên)'), c2 = el('button', 'gpch', '🙋 Bản thân tôi (thêm dần cha mẹ, ông bà)');
    [c1, c2].forEach((c, i) => { c.type = 'button'; c.onclick = () => { start = i ? 'me' : 'to'; c1.classList.toggle('on', !i); c2.classList.toggle('on', !!i); fn.placeholder = i ? 'Họ tên của bạn' : 'Họ tên cụ tổ'; }; st.append(c); });
    b.append(st);
    const fn = input('', 'Họ tên cụ tổ', 'text', 60), gd = el('select'); [['nam', 'Nam'], ['nu', 'Nữ']].forEach(([v, t]) => { const o = el('option', '', t); o.value = v; gd.append(o); });
    const row = el('div', 'gprow'); row.append(field('Họ tên người đầu tiên', fn), field('Giới tính', gd)); b.append(row);
    const r2 = el('div', 'row');
    r2.append(btn('📜 Lập gia phả', 'gold', () => { if (nm.value.trim().length < 2) return toast('Hãy nhập tên dòng họ'); NET.soc('gp.create', { name: nm.value, origin: og.value, first: fn.value.trim() ? { name: fn.value, gender: gd.value, title: start === 'to' ? (gd.value === 'nu' ? 'Cụ Tổ Mẫu' : 'Cụ Tổ') : '', code: start === 'me' && list ? list.me : '' } : null }); }), btn('Quay lại', 'ghost', () => render()));
    b.append(r2); setTimeout(() => nm.focus(), 50);
  }

  /* ---------- tính toán phả hệ ---------- */
  function model() {
    const L = fam.people, M = Object.fromEntries(L.map(p => [p.id, p]));
    const kids = {}; L.forEach(p => [p.fatherId, p.motherId].forEach(pid => { if (pid && M[pid]) (kids[pid] = kids[pid] || new Set()).add(p.id); }));
    const hasPar = (p) => !!((p.fatherId && M[p.fatherId]) || (p.motherId && M[p.motherId]));
    const gen = {}; const setGen = (id, g, seen) => { if (seen.has(id)) return; seen.add(id); if (gen[id] == null || g < gen[id]) gen[id] = g; (M[id].spouseIds || []).forEach(s => { if (M[s] && gen[s] == null) gen[s] = g; }); (kids[id] ? [...kids[id]] : []).forEach(c => setGen(c, g + 1, seen)); };
    const roots = L.filter(p => !hasPar(p) && !(p.spouseIds || []).some(s => M[s] && hasPar(M[s])));
    roots.forEach(r => setGen(r.id, 1, new Set()));
    L.forEach(p => { if (gen[p.id] == null) gen[p.id] = 1; });
    return { M, kids, gen, roots, hasPar };
  }
  const yrs = (p) => (p.birth || p.death || p.dead) ? `${p.birth || '?'} – ${p.dead || p.death ? (p.death || '?') : 'nay'}` : '';
  /* ngày giỗ âm lịch → ngày dương gần nhất (bảng 400 ngày tới) */
  let gioTable = null, gioDay = '';
  function gioMap() {
    const today = new Date(); const k = today.toDateString(); if (gioTable && gioDay === k) return gioTable;
    gioTable = {}; gioDay = k; const L = (window.CBA && CBA.Lunar) || null; if (!L) return gioTable;
    for (let i = 0; i < 400; i++) { const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i), l = L.toLunar(d.getDate(), d.getMonth() + 1, d.getFullYear());
      if (l.leap) continue; const key = l.month + '-' + l.day; if (!gioTable[key]) gioTable[key] = { d, i };
      const d2 = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), nxt = L.toLunar(d2.getDate(), d2.getMonth() + 1, d2.getFullYear());
      if (l.day === 29 && nxt.day === 1 && !gioTable[l.month + '-30']) gioTable[l.month + '-30'] = { d, i };   // tháng thiếu: giỗ ngày 30 làm vào 29
    }
    return gioTable;
  }
  const nextGio = (p) => p.gioDay && p.gioMonth ? gioMap()[p.gioMonth + '-' + p.gioDay] || null : null;
  const fmtD = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  /* ---------- màn hình một gia phả ---------- */
  function renderFam(b) {
    const { M, kids, gen } = model();
    const hd = el('div', 'gptop');
    hd.append(btn('←', 'sm ghost gpback', () => { view = 'home'; fam = null; sel = ''; NET.soc('gp.list'); render(); }));
    const tt = el('div', 'gptt'); tt.append(el('h3', '', fam.name), el('small', '', `${fam.origin ? fam.origin + ' · ' : ''}${fam.role === 'owner' ? 'Bạn là chủ gia phả' : 'Chủ gia phả: ' + fam.owner}`)); hd.append(tt);
    const gens = Math.max(0, ...Object.values(gen)), soon = fam.people.filter(p => { const g = nextGio(p); return g && g.i <= 30; }).length;
    const stt = el('div', 'gpstats'); [[fam.people.length, 'người'], [gens, 'đời'], [soon, 'giỗ 30 ngày tới']].forEach(([n, t]) => { const s = el('span'); s.append(el('b', '', String(n)), document.createTextNode(' ' + t)); stt.append(s); }); hd.append(stt);
    b.append(hd);
    const tabs = el('div', 'tutabs gptabs');
    [['tree', '🌳 Cây phả hệ'], ['list', '📋 Danh sách'], ['gio', '🕯️ Lịch giỗ'], ['share', fam.role === 'owner' ? '👥 Quản lý' : '👥 Thông tin']].forEach(([k, t]) => { const x = el('button', tab === k ? 'on' : '', t); x.type = 'button'; x.onclick = () => { tab = k; render(); }; tabs.append(x); });
    b.append(tabs);
    const pg = el('div', 'gppage'); b.append(pg);
    if (!fam.people.length && tab !== 'share') { pg.append(el('p', 'note', 'Gia phả chưa có ai. Bấm nút dưới để thêm người đầu tiên (thường là Cụ Tổ).')); pg.append(btn('＋ Thêm người đầu tiên', 'gold', () => personForm(null, null))); return; }
    if (tab === 'tree') treeTab(pg, M, kids, gen);
    else if (tab === 'list') listTab(pg, M, gen);
    else if (tab === 'gio') gioTab(pg, M);
    else shareTab(pg);
  }
  function pcard(p, gen, onPick) {
    const c = el('button', `gpp ${p.gender}${p.dead || p.death ? ' dead' : ''}${sel === p.id ? ' on' : ''}`); c.type = 'button';
    c.append(el('i', 'gpgen', 'Đời ' + gen[p.id]));
    c.append(el('span', 'gpav', (p.name.trim().split(/\s+/).pop() || '?')[0])); c.append(el('b', '', p.name)); const y = yrs(p); if (y) c.append(el('small', '', y)); if (p.title) c.append(el('em', '', p.title));
    if (p.dead || p.death) c.append(el('span', 'gpinc', '🕯️'));
    if (p.code) c.append(el('span', 'gpme', '🎮'));
    c.onclick = (e) => { e.stopPropagation(); onPick(p); }; return c;
  }
  function treeTab(pg, M, kids, gen) {
    const wrap = el('div', 'gptreewrap'), tools = el('div', 'gptools');
    tools.append(el('span', 'note gphint', '👆 Bấm vào một người để xem và thêm Con · Vợ/Chồng · Cha/Mẹ'));
    const zb = el('div', 'gpzoom'); zb.append(btn('−', 'sm', () => { zoom = Math.max(0.4, zoom - 0.15); sc.style.transform = `scale(${zoom})`; }), btn('1:1', 'sm', () => { zoom = 1; sc.style.transform = ''; }), btn('+', 'sm', () => { zoom = Math.min(1.6, zoom + 0.15); sc.style.transform = `scale(${zoom})`; }));
    tools.append(zb, btn('＋ Thêm người', 'sm gold', () => personForm(null, null)));
    pg.append(tools);
    const scroll = el('div', 'gpscroll'), sc = el('div', 'gpscale'); sc.style.transform = zoom !== 1 ? `scale(${zoom})` : ''; scroll.append(sc); wrap.append(scroll);
    const placed = new Set();
    const pick = (p) => { sel = p.id; render(); };
    const unit = (p) => {
      const li = el('li'); placed.add(p.id);
      const cp = el('div', 'gpcouple'); cp.append(pcard(p, gen, pick));
      const sp = (p.spouseIds || []).map(s => M[s]).filter(s => s && !placed.has(s.id));
      sp.forEach(s => { placed.add(s.id); cp.append(el('span', 'gpheart', '❤'), pcard(s, gen, pick)); });
      li.append(cp);
      const ch = new Set([...(kids[p.id] || []), ...sp.flatMap(s => [...(kids[s.id] || [])])]);
      const L = [...ch].map(id => M[id]).filter(c => c && !placed.has(c.id)).sort((a, b) => (a.order || 99) - (b.order || 99) || String(a.birth).localeCompare(String(b.birth)));
      if (L.length) { const ul = el('ul'); L.forEach(c => { if (!placed.has(c.id)) ul.append(unit(c)); }); li.append(ul); }
      return li;
    };
    const { roots } = model();
    const rootUl = el('ul', 'gptree');
    const rs = roots.slice().sort((a, b) => (a.gender === 'nam' ? 0 : 1) - (b.gender === 'nam' ? 0 : 1));
    rs.forEach(r => { if (!placed.has(r.id)) rootUl.append(unit(r)); });
    fam.people.forEach(p => { if (!placed.has(p.id)) rootUl.append(unit(p)); });   // người chưa nối vào cây
    sc.append(rootUl);
    if (sel && M[sel]) { wrap.classList.add('has'); wrap.append(detail(M[sel], M, gen)); }
    pg.append(wrap);
    setTimeout(() => { const on = sel && sc.querySelector('.gpp.on');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
      else if (scroll.scrollWidth > scroll.clientWidth) { const first = sc.querySelector('.gptree > li > .gpcouple'); if (first) scroll.scrollLeft = Math.max(0, first.offsetLeft * zoom + first.offsetWidth * zoom / 2 - scroll.clientWidth / 2); } }, 30);   // điện thoại: tự canh giữa cụ tổ
  }
  function detail(p, M, gen) {
    const d = el('div', 'gpdetail'); d.append(el('i', 'gphandle'));
    const x = el('button', 'gpx', '✕'); x.type = 'button'; x.onclick = () => { sel = ''; render(); }; d.append(x);
    d.append(el('h4', `gpn ${p.gender}`, `${p.gender === 'nu' ? '👩' : '👨'} ${p.name}`));
    const rows = [['Đời', 'Đời thứ ' + gen[p.id]], ['Vai vế', p.title], ['Tên khác', p.other], ['Chi / nhánh', p.branch], ['Năm sinh', p.birth], ['Năm mất', p.dead || p.death ? (p.death || 'không rõ') : ''],
      ['Ngày giỗ', p.gioDay && p.gioMonth ? `${p.gioDay}/${p.gioMonth} âm lịch` + (nextGio(p) ? ` · lần tới ${fmtD(nextGio(p).d)}` : '') : ''], ['An táng', p.burial], ['Quê / nơi sống', p.place],
      ['Cha', p.fatherId && M[p.fatherId] ? M[p.fatherId].name : ''], ['Mẹ', p.motherId && M[p.motherId] ? M[p.motherId].name : ''], ['Vợ / chồng', (p.spouseIds || []).map(s => M[s] && M[s].name).filter(Boolean).join(', ')],
      ['Con', fam.people.filter(c => c.fatherId === p.id || c.motherId === p.id).map(c => c.name).join(', ')], ['Mã trong game', p.code], ['Ghi chú', p.note]];
    const dl = el('dl'); rows.forEach(([k, v]) => { if (!v) return; dl.append(el('dt', '', k), el('dd', '', v)); }); d.append(dl);
    const r = el('div', 'gpacts');
    r.append(btn('✏️ Sửa', 'sm gold', () => personForm(p, null)));
    r.append(btn('＋ Con', 'sm', () => personForm(null, { kind: 'child', of: p.id })));
    r.append(btn('＋ Vợ/Chồng', 'sm', () => personForm(null, { kind: 'spouse', of: p.id })));
    if (!p.fatherId || !p.motherId) r.append(btn('＋ Cha/Mẹ', 'sm', () => personForm(null, { kind: 'parent', of: p.id })));
    const del = btn('🗑 Xóa', 'sm ghost', () => { if (!del.dataset.ok) { del.dataset.ok = 1; del.textContent = 'Bấm lần nữa để xóa'; return; } NET.soc('gp.del', { id: fam.id, pid: p.id }); sel = ''; });
    r.append(del); d.append(r);
    return d;
  }
  function personForm(p, rel) {
    const M = Object.fromEntries(fam.people.map(x => [x.id, x])), base = rel && M[rel.of];
    const ov = el('div', 'gpov'), f = el('div', 'gpform'); ov.append(f); box.append(ov);
    const title = p ? `✏️ Sửa: ${p.name}` : rel ? { child: `＋ Thêm con của ${base.name}`, spouse: `＋ Thêm vợ/chồng của ${base.name}`, parent: `＋ Thêm cha/mẹ của ${base.name}` }[rel.kind] : '＋ Thêm người';
    f.append(el('h3', '', title));
    const v = Object.assign({ name: '', gender: rel && rel.kind === 'spouse' && base ? (base.gender === 'nam' ? 'nu' : 'nam') : rel && rel.kind === 'parent' && base && !base.fatherId ? 'nam' : rel && rel.kind === 'parent' ? 'nu' : 'nam', spouseIds: [] }, p || {});
    if (!p && rel && rel.kind === 'child' && base) v.branch = base.branch;
    const nm = input(v.name, 'Họ và tên đầy đủ', 'text', 60);
    const gd = el('div', 'gpseg'); let g = v.gender; [['nam', '👨 Nam'], ['nu', '👩 Nữ']].forEach(([k, t]) => { const b = el('button', g === k ? 'on' : '', t); b.type = 'button'; b.onclick = () => { g = k; [...gd.children].forEach(c => c.classList.toggle('on', c === b)); }; gd.append(b); });
    const tl = input(v.title, 'Ví dụ: Trưởng họ, Con trưởng…', 'text', 40); const dlid = 'gpt' + Math.random().toString(36).slice(2, 6); tl.setAttribute('list', dlid); const dl = el('datalist'); dl.id = dlid; TITLES.forEach(t => { const o = el('option'); o.value = t; dl.append(o); });
    const ot = input(v.other, 'Tên húy, tên tự, tên thường gọi', 'text', 40), br = input(v.branch, 'Ví dụ: Chi trưởng, Chi thứ hai', 'text', 40), od = input(v.order || '', 'Con thứ mấy (1, 2, 3…)', 'number', 2);
    const bi = input(v.birth, 'Năm sinh, ví dụ 1945', 'text', 10);
    const dead = el('input'); dead.type = 'checkbox'; dead.checked = !!(v.dead || v.death);
    const de = input(v.death, 'Năm mất (bỏ trống nếu không rõ)', 'text', 10), gdd = input(v.gioDay || '', 'Ngày', 'number', 2), gmm = input(v.gioMonth || '', 'Tháng', 'number', 2), bu = input(v.burial, 'Nghĩa trang, xứ đồng…', 'text', 80);
    const pl = input(v.place, 'Quê quán / nơi sinh sống', 'text', 80), cd = input(v.code, 'Nếu người này cũng chơi game (6 ký tự)', 'text', 6), nt = el('textarea'); nt.value = v.note || ''; nt.rows = 3; nt.maxLength = 400; nt.placeholder = 'Tiểu sử, công đức, sự tích…'; nt.addEventListener('keydown', e => e.stopPropagation());
    const sec = (t) => f.append(el('div', 'gpsec', t));
    sec('Thông tin chính');
    const r1 = el('div', 'gprow'); r1.append(field('Họ tên *', nm), field('Giới tính', gd)); f.append(r1);
    const r2 = el('div', 'gprow'); r2.append(field('Vai vế / chức danh', tl), field('Tên khác', ot)); f.append(r2, dl);
    const r3 = el('div', 'gprow'); r3.append(field('Chi / nhánh', br), field('Thứ tự anh chị em', od)); f.append(r3);
    sec('Sinh – mất – ngày giỗ');
    const r4 = el('div', 'gprow'); r4.append(field('Năm sinh', bi)); const dw = el('label', 'gpchk'); dw.append(dead, el('span', 'gptog'), el('b', '', 'Đã mất')); r4.append(field('Tình trạng', dw)); f.append(r4);
    const dbox = el('div', 'gpdead'); const r5 = el('div', 'gprow'); r5.append(field('Năm mất', de)); const gw = el('div', 'gpgio'); gw.append(gdd, el('span', '', '/'), gmm); r5.append(field('Ngày giỗ (âm lịch)', gw, 'Ngày/tháng âm — game tự tính ra ngày dương hằng năm')); dbox.append(r5, field('Nơi an táng', bu)); f.append(dbox);
    const tg = () => { dbox.style.display = dead.checked ? '' : 'none'; }; dead.onchange = tg; tg();
    sec('Quan hệ trong dòng họ');
    const opt = (sel0, filt, ph) => { const s = el('select'); const o0 = el('option', '', ph); o0.value = ''; s.append(o0); fam.people.filter(x => (!p || x.id !== p.id) && filt(x)).sort((a, b) => a.name.localeCompare(b.name, 'vi')).forEach(x => { const o = el('option', '', `${x.name}${x.birth ? ' (' + x.birth + ')' : ''}`); o.value = x.id; if (x.id === sel0) o.selected = true; s.append(o); }); return s; };
    let fa = v.fatherId || '', mo = v.motherId || '';
    if (!p && rel && rel.kind === 'child' && base) { if (base.gender === 'nam') { fa = base.id; mo = (base.spouseIds || [])[0] || ''; } else { mo = base.id; fa = (base.spouseIds || [])[0] || ''; } }
    const sf = opt(fa, x => x.gender === 'nam', '— chưa rõ —'), sm = opt(mo, x => x.gender === 'nu', '— chưa rõ —');
    const r6 = el('div', 'gprow'); r6.append(field('Cha', sf), field('Mẹ', sm)); f.append(r6);
    let sps = [...(v.spouseIds || [])]; if (!p && rel && rel.kind === 'spouse' && base) sps = [base.id];
    const spBox = el('div', 'gpsps'), spSel = opt('', x => !sps.includes(x.id), '＋ chọn vợ/chồng có sẵn…');
    const drawSp = () => { spBox.innerHTML = ''; sps.forEach(id => { const x = M[id]; if (!x) return; const c = el('span', 'gptag', x.name + ' '); const rm = el('button', '', '✕'); rm.type = 'button'; rm.onclick = () => { sps = sps.filter(i => i !== id); drawSp(); }; c.append(rm); spBox.append(c); }); };
    spSel.onchange = () => { if (spSel.value && !sps.includes(spSel.value)) sps.push(spSel.value); spSel.value = ''; drawSp(); }; drawSp();
    f.append(field('Vợ / chồng', spBox), spSel);
    sec('Khác'); f.append(field('Quê quán / nơi sống', pl), field('Mã nhân vật trong game', cd, 'Gắn người này với nhân vật của họ trong game (không bắt buộc)'), field('Ghi chú', nt));
    const act = el('div', 'row gpsave');
    act.append(btn('💾 Lưu', 'gold', () => {
      if (!nm.value.trim()) return toast('Hãy nhập họ tên');
      const person = { id: p ? p.id : '', name: nm.value, gender: g, title: tl.value, other: ot.value, branch: br.value, order: +od.value || 0, birth: bi.value, dead: dead.checked, death: dead.checked ? de.value : '', gioDay: +gdd.value || 0, gioMonth: +gmm.value || 0, burial: bu.value, place: pl.value, code: cd.value.trim().toUpperCase(), note: nt.value, fatherId: sf.value, motherId: sm.value, spouseIds: sps };
      NET.soc('gp.put', { id: fam.id, person, rel: p ? null : rel }); ov.remove();
    }), btn('Hủy', 'ghost', () => ov.remove()));
    f.append(act); setTimeout(() => nm.focus(), 50);
  }
  function listTab(pg, M, gen) {
    const t = el('div', 'gptools'); const s = input(q, '🔍 Tìm theo tên, vai vế, chi…', 'search', 40); s.oninput = () => { q = s.value; draw(); };
    const gf = el('select'); const o0 = el('option', '', 'Tất cả các đời'); o0.value = ''; gf.append(o0); [...new Set(Object.values(gen))].sort((a, b) => a - b).forEach(n => { const o = el('option', '', 'Đời ' + n); o.value = n; if (String(n) === genF) o.selected = true; gf.append(o); }); gf.onchange = () => { genF = gf.value; draw(); };
    t.append(s, gf, btn('＋ Thêm người', 'sm gold', () => personForm(null, null))); pg.append(t);
    const out = el('div', 'gplist'); pg.append(out);
    function draw() {
      out.innerHTML = ''; const k = q.trim().toLowerCase();
      const L = fam.people.filter(p => (!genF || String(gen[p.id]) === genF) && (!k || [p.name, p.title, p.branch, p.other].join(' ').toLowerCase().includes(k))).sort((a, b) => gen[a.id] - gen[b.id] || (a.order || 99) - (b.order || 99));
      if (!L.length) { out.append(el('p', 'note', 'Không có ai phù hợp.')); return; }
      L.forEach(p => { const r = el('button', `gprowp ${p.gender}`); r.type = 'button';
        r.append(el('i', 'gpgen', 'Đời ' + gen[p.id]), el('b', '', p.name + (p.dead || p.death ? ' 🕯️' : '')), el('small', '', [p.title, yrs(p), p.fatherId && M[p.fatherId] ? 'con ông ' + M[p.fatherId].name : p.motherId && M[p.motherId] ? 'con bà ' + M[p.motherId].name : ''].filter(Boolean).join(' · ')));
        r.onclick = () => { sel = p.id; tab = 'tree'; render(); }; out.append(r); });
    }
    draw(); setTimeout(() => s.focus(), 30);
  }
  function gioTab(pg, M) {
    const L = fam.people.filter(p => p.gioDay && p.gioMonth).map(p => ({ p, g: nextGio(p) })).sort((a, b) => (a.g ? a.g.i : 999) - (b.g ? b.g.i : 999));
    const missing = fam.people.filter(p => (p.dead || p.death) && !(p.gioDay && p.gioMonth));
    if (!L.length) pg.append(el('p', 'note', 'Chưa có ngày giỗ nào. Khi sửa thông tin người đã mất, hãy nhập ngày giỗ âm lịch.'));
    L.forEach(({ p, g }) => { const r = el('div', 'gpgiorow' + (g && g.i <= 7 ? ' soon' : '') + (g && g.i === 0 ? ' today' : ''));
      const cal = el('div', 'gpcal'); if (g) { cal.append(el('small', '', 'Th' + (g.d.getMonth() + 1)), el('b', '', String(g.d.getDate())), el('small', '', String(g.d.getFullYear()))); } else cal.append(el('b', '', '—'));
      const left = el('div', 'gpgioinfo'); left.append(el('b', '', p.name), el('small', '', `${p.title ? p.title + ' · ' : ''}giỗ ${p.gioDay}/${p.gioMonth} âm lịch`), el('span', 'gpwhen', g ? (g.i === 0 ? '🔔 Giỗ hôm nay' : `Còn ${g.i} ngày · ${fmtD(g.d)}`) : 'Chưa tính được ngày'));
      r.append(cal, left, btn('🕯️ Cầu siêu', 'sm', () => { const t = getTemple(); if (NET.soc('mem.add', { temple: t.id, n: p.name.slice(0, 30), kind: 'sieu' })) toast(`🕯️ Đã ghi tên ${p.name} vào sổ cầu siêu ở ${t.name}`); else toast('Chưa kết nối máy chủ'); A.khanh && A.khanh(); }));
      pg.append(r); });
    if (missing.length) pg.append(el('p', 'note', `Còn ${missing.length} người đã mất chưa có ngày giỗ: ${missing.slice(0, 6).map(p => p.name).join(', ')}${missing.length > 6 ? '…' : ''}`));
  }
  function shareTab(pg) {
    const own = fam.role === 'owner';
    pg.append(el('p', 'note', 'Chỉ những người dưới đây mới xem và sửa được gia phả này. Họ đến gặp ông giữ gia phả ở bất kỳ chùa nào để mở.'));
    const L = el('div', 'gpeds');
    const me0 = el('div', 'gped'); me0.append(el('b', '', `👑 ${fam.owner}`), el('small', '', `Chủ gia phả · mã ${fam.ownerCode}`)); L.append(me0);
    fam.editors.forEach(e => { const r = el('div', 'gped'); r.append(el('b', '', `${e.online ? '🟢' : '⚪'} ${e.name}`), el('small', '', `Cùng quản lý · mã ${e.code}`));
      if (own) r.append(btn('Bỏ quyền', 'sm ghost', () => NET.soc('gp.ed.del', { id: fam.id, uid: e.uid }))); L.append(r); });
    pg.append(L);
    if (own) {
      const add = el('div', 'gptools'); const c = input('', 'Mã nhân vật 6 ký tự, ví dụ A1B2C3', 'text', 6); c.style.textTransform = 'uppercase';
      add.append(c, btn('＋ Thêm người cùng quản lý', 'sm gold', () => { const v = c.value.trim().toUpperCase(); if (!/^[A-Z0-9]{6}$/.test(v)) return toast('Mã nhân vật gồm 6 ký tự'); NET.soc('gp.ed.add', { id: fam.id, code: v }); c.value = ''; }));
      pg.append(el('div', 'gpsec', 'Mời người thân cùng quản lý'), add, el('small', 'note', 'Người chơi xem mã nhân vật của mình trong Hồ sơ hoặc ngay ở bảng Gia phả.'));
      pg.append(el('div', 'gpsec', 'Thông tin dòng họ'));
      const nm = input(fam.name, 'Tên dòng họ', 'text', 50), og = input(fam.origin, 'Quê gốc', 'text', 60), nt = el('textarea'); nt.value = fam.note || ''; nt.rows = 2; nt.maxLength = 400; nt.placeholder = 'Lời dặn con cháu, địa chỉ từ đường…'; nt.addEventListener('keydown', e => e.stopPropagation());
      const r = el('div', 'gprow'); r.append(field('Tên dòng họ', nm), field('Quê gốc', og)); pg.append(r, field('Ghi chú chung', nt));
      pg.append(btn('💾 Lưu thông tin', 'sm gold', () => NET.soc('gp.meta', { id: fam.id, name: nm.value, origin: og.value, note: nt.value })));
    } else {
      if (fam.note) pg.append(el('div', 'gpsec', 'Ghi chú của dòng họ'), el('p', '', fam.note));
      const lv = btn('Rời khỏi gia phả này', 'sm ghost', () => { if (!lv.dataset.ok) { lv.dataset.ok = 1; lv.textContent = 'Bấm lần nữa để rời'; return; } NET.soc('gp.ed.del', { id: fam.id, uid: P.uid }); });
      pg.append(lv);
    }
    pg.append(el('div', 'gpsec', 'Sao lưu'));
    const io = el('div', 'gptools');
    io.append(btn('📥 Tải bản sao (.json)', 'sm', () => { const data = JSON.stringify({ name: fam.name, origin: fam.origin, members: fam.people }, null, 1); const a = el('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = `gia-pha-${fam.name.replace(/\s+/g, '-')}.json`; a.click(); }));
    if (own) { const fi = el('input'); fi.type = 'file'; fi.accept = '.json,application/json'; fi.hidden = true;
      fi.onchange = async () => { try { const j = JSON.parse(await fi.files[0].text()); const members = Array.isArray(j) ? j : j.members; if (!Array.isArray(members)) throw 0; NET.soc('gp.import', { id: fam.id, members, name: j.name || '' }); toast(`📤 Đang nhập ${members.length} người…`); } catch (e) { toast('Tệp không đúng định dạng gia phả'); } };
      io.append(fi, btn('📤 Nhập từ tệp (thay toàn bộ)', 'sm', () => fi.click())); }
    pg.append(io);
    if (fam.log && fam.log.length) { pg.append(el('div', 'gpsec', 'Thay đổi gần đây')); const lg = el('div', 'gplog'); fam.log.slice().reverse().slice(0, 12).forEach(x => lg.append(el('div', '', `${new Date(x.t).toLocaleDateString('vi-VN')} · ${x.by} ${x.act}`))); pg.append(lg); }
    if (own) { pg.append(el('div', 'gpsec', 'Xóa gia phả')); const dz = btn('🗑 Xóa vĩnh viễn gia phả này', 'sm ghost', () => { if (!dz.dataset.ok) { dz.dataset.ok = 1; dz.textContent = 'Bấm lần nữa: XÓA HẲN, không khôi phục được'; return; } NET.soc('gp.drop', { id: fam.id }); }); pg.append(dz); }
  }
  return { onTemple, dispose, step, context, open };
}
