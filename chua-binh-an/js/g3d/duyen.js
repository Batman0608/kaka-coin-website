/* =========================================================================
 *  CẦU DUYÊN — chùa Hà (Cầu Giấy, Hà Nội)
 *  1. Người chơi (từ 18 tuổi) điền hồ sơ: biệt danh, giới tính, muốn tìm, năm sinh,
 *     tỉnh/thành + phường/xã, sở thích, giới thiệu, mong muốn, tối đa 3 ảnh.
 *  2. Treo hồ sơ lên CÂY TÌNH DUYÊN giữa sân chùa Hà: mỗi hồ sơ là một trái tim
 *     trên cây — bấm vào trái tim để xem ảnh & thông tin, thả tim, báo cáo.
 *  3. Máy chủ tự se duyên: khác giới theo mong muốn đôi bên, cùng tỉnh, tuổi gần
 *     nhau, chung sở thích (cùng phường/xã được ưu tiên) → báo lên màn hình cả hai.
 *  4. Cả hai bấm "Đồng ý" → mở khung trò chuyện riêng cho hai người.
 *  An toàn: chặn & báo cáo; số điện thoại / đường link trong hồ sơ công khai bị che.
 * ========================================================================= */
import { heartMesh } from './world.js';
import { portrait } from './chandung.js';

const PROVS = ['Hà Nội', 'Huế', 'Lai Châu', 'Điện Biên', 'Sơn La', 'Lạng Sơn', 'Quảng Ninh', 'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Cao Bằng', 'Tuyên Quang', 'Lào Cai', 'Thái Nguyên', 'Phú Thọ', 'Bắc Ninh', 'Hưng Yên', 'Hải Phòng', 'Ninh Bình', 'Quảng Trị', 'Đà Nẵng', 'Quảng Ngãi', 'Gia Lai', 'Khánh Hòa', 'Lâm Đồng', 'Đắk Lắk', 'TP. Hồ Chí Minh', 'Đồng Nai', 'Tây Ninh', 'Cần Thơ', 'Vĩnh Long', 'Đồng Tháp', 'Cà Mau', 'An Giang'];
const INTS = ['Du lịch', 'Nấu ăn', 'Đọc sách', 'Âm nhạc', 'Thiền · Yoga', 'Thể thao', 'Phim ảnh', 'Cà phê', 'Làm vườn', 'Chụp ảnh', 'Hành hương', 'Thú cưng', 'Công nghệ', 'Kinh doanh', 'Ăn chay', 'Tình nguyện'];

export function initDuyen(X) {
  const { P, save, modal, closeModal, el, $, toast, banner, ticker, A, NET, scene, me, camera, canvas, THREE } = X;
  const W = () => X.getW(), temple = () => X.getTemple();
  let st = { prof: null, pairs: [], matches: [] }, tree = [], bots = [], saves = 0, myPid = '', unread = {}, chatOpen = null, view = null;
  const year = () => new Date(Date.now() + 7 * 3600000).getUTCFullYear();
  const photoUrl = (id) => `${NET.httpBase()}/duyen/anh/${id}.jpg`;
  // ảnh chân dung của bạn đồng hành ảo: vẽ từ nhân vật 3D trong game (không dùng ảnh người thật)
  const ROBE_K = ['hong', 'ngoc', 'tim', 'lam', 'nau', 'kim', 'trang', 'reu', 'dat', 'xam'];
  function botPic(c) { let n = 7; for (const ch of String(c.nick) + c.age) n = (n * 31 + ch.charCodeAt(0)) % 100003; return portrait('bot' + c.nick + c.age, { g: c.g, hair: c.g === 'nam' ? 'ngan' : ['dai', 'bui', 'dai'][n % 3], robe: ROBE_K[(n * 7) % ROBE_K.length] }, n * 13 + 3); }
  const avImg = (c) => { const u = c.bot ? botPic(c) : (c.photos && c.photos[0] ? photoUrl(c.photos[0]) : ''); if (!u) return null; const im = new Image(); im.src = u; im.alt = c.nick || ''; im.loading = 'lazy'; return im; };
  const btn = (t, cls, fn) => { const b = el('button', 'btn' + (cls ? ' ' + cls : ''), t); b.onclick = fn; return b; };
  const gIcon = (g) => (g === 'nam' ? '👨' : '👩');
  const badge = () => { const b = $('duyenBadge'); if (!b) return; const n = st.pairs.filter(p => !p.mine).length + Object.values(unread).reduce((a, b) => a + b, 0); b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n || '!'); };

  /* ---------------- tin từ máy chủ ---------------- */
  NET.onSoc((m) => {
    if (m.op === 'du.me') { st = { prof: m.prof, pairs: m.pairs || [], matches: m.matches || [] }; badge(); if (view) view(); refreshChat(); }
    else if (m.op === 'du.tree') { tree = m.list || []; bots = m.bots || []; myPid = m.mine || ''; hangHearts(); if (view) view(); }
    else if (m.op === 'du.pair') { const i = st.pairs.findIndex(p => p.id === m.pair.id); if (i >= 0) st.pairs[i] = m.pair; else st.pairs.push(m.pair); badge(); if (!m.pair.mine) announcePair(m.pair); if (view) view(); }
    else if (m.op === 'du.closed') { st.pairs = st.pairs.filter(p => p.id !== m.pair); toast(m.msg); badge(); if (view) view(); }
    else if (m.op === 'du.matched') { st.pairs = st.pairs.filter(p => !p.other || p.other.pid !== (m.match.other || {}).pid); st.matches.push(m.match); badge(); A.bigBell(); X.banner('💞 Duyên đã thành', `Bạn và ${m.match.other.nick} cùng đồng ý`, 'Khung trò chuyện riêng đã mở'); openChat(m.match.id); }
    else if (m.op === 'du.msg') { const mt = st.matches.find(x => x.id === m.match); if (!mt) return; mt.msgs.push(m.msg); if (chatOpen !== m.match && !m.msg.me) { unread[m.match] = (unread[m.match] || 0) + 1; toast(`💬 ${m.from}: ${m.msg.x.slice(0, 40)}`); A.smallBell(); } badge(); refreshChat(); }
    else if (m.op === 'du.ended') { st.matches = st.matches.filter(x => x.id !== m.match); if (chatOpen === m.match) closeChat(); toast(m.msg); badge(); }
  });
  let asked = false;
  NET.onChange(() => { if (NET.online && !asked) { asked = true; NET.soc('du.me'); } });

  /* ---------------- trái tim trên Cây tình duyên ---------------- */
  let hearts = [], hGroup = null;
  const MAT = { nam: new THREE.MeshStandardMaterial({ color: 0xd7263d, emissive: 0x7a0a18, emissiveIntensity: 0.45, roughness: 0.4 }), nu: new THREE.MeshStandardMaterial({ color: 0xf06aa0, emissive: 0x8a2050, emissiveIntensity: 0.45, roughness: 0.4 }), me: new THREE.MeshStandardMaterial({ color: 0xffc83a, emissive: 0x8a5a00, emissiveIntensity: 0.6, roughness: 0.3 }) };
  function hangHearts() {
    const T = W() && W().duyenTree; if (!T) return; if (hGroup) T.group.remove(hGroup); hGroup = new THREE.Group(); T.group.add(hGroup); hearts = [];
    tree.forEach((c, i) => {
      const a = T.anchors[(i * 7 + 3) % T.anchors.length], drop = 0.7 + (i % 4) * 0.25, h = heartMesh(0.24, c.pid === myPid ? MAT.me : MAT[c.g] || MAT.nu);
      h.position.set(a.x * 0.92, a.y - drop - 0.3, a.z * 0.92); h.rotation.y = Math.atan2(a.x, a.z); h.userData.card = c; h.userData.ph = i * 0.7;
      const str = new THREE.Mesh(new THREE.BoxGeometry(0.012, drop, 0.012), new THREE.MeshBasicMaterial({ color: 0xb01830 })); str.position.set(a.x * 0.92, a.y - drop / 2, a.z * 0.92);
      hGroup.add(h, str); hearts.push(h);
    });
    // 20 dải cầu duyên trên cây = 20 bạn đồng hành ảo
    (T.ribbons || []).forEach((rb, i) => { const c = bots[i]; rb.traverse(o => { if (o.isMesh) { o.userData.card = c || null; if (c) hearts.push(o); } }); });
  }
  // bấm vào trái tim (không phải kéo xoay camera) để xem hồ sơ
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(); let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || !hearts.length) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null; if (d > 8 || dt > 500) return;
    const r = canvas.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera);
    const hit = ray.intersectObjects(hearts.filter(h => h.visible !== false), false)[0]; if (hit && hit.object.userData.card) showCard(hit.object.userData.card);
  });

  /* ---------------- xem hồ sơ (ảnh + thông tin) ---------------- */
  function cardView(c, box, opts = {}) {
    const wrap = el('div', 'dcard');
    if (c.photos && c.photos.length) { const ph = el('div', 'dphotos'); c.photos.forEach(id => { const im = new Image(); im.src = photoUrl(id); im.alt = c.nick; im.loading = 'lazy'; im.onclick = () => zoom(im.src); ph.append(im); }); wrap.append(ph); }
    else if (c.bot && botPic(c)) { const ph = el('div', 'dphotos'); const im = avImg(c); im.onclick = () => zoom(im.src); ph.append(im); wrap.append(ph); }
    else wrap.append(el('div', 'dnophoto', gIcon(c.g)));
    if (c.bot) wrap.append(el('p', 'dbot', '🤖 Bạn đồng hành ảo · không phải người thật — trò chuyện cho vui trong lúc Cây tình duyên tìm người thật hợp với bạn'));
    wrap.append(el('h3', '', `${gIcon(c.g)} ${c.nick} · ${c.age} tuổi`), el('p', 'dloc', `📍 ${c.prov}${c.ward ? ' · ' + c.ward : ''}`));
    const chips = el('div', 'dchips'); (c.ints || []).forEach(i => chips.append(el('span', '', i))); wrap.append(chips);
    if (c.about) wrap.append(el('p', '', `💬 ${c.about}`)); if (c.want) wrap.append(el('p', 'note', `💗 Mong muốn: ${c.want}`));
    if (c.wish) wrap.append(el('p', 'dwhy', `🎐 Lời nguyện trên dải lụa: “${c.wish}”`));
    if (opts.why) wrap.append(el('p', 'dwhy', `✨ ${opts.why}`));
    box.append(wrap); return wrap;
  }
  function zoom(src) { const z = el('div', 'dzoom'); const im = new Image(); im.src = src; z.append(im); z.onclick = () => z.remove(); document.body.append(z); }
  function showCard(c) {
    modal('💞 Cây tình duyên', (b) => {
      cardView(c, b);
      if (c.pid === myPid) { b.append(el('p', 'note', 'Đây là hồ sơ của bạn.')); return; }
      if (c.bot) { const r = el('div', 'row'); r.append(btn('💬 Trò chuyện với bạn đồng hành', 'gold', () => { if (!st.prof) { toast('Hãy treo hồ sơ của bạn lên cây trước'); V._edit = true; return openHub('hoso'); } NET.soc('du.like', { pid: c.pid }); closeModal(); })); b.append(r); return; }
      const r = el('div', 'row'); r.append(btn('💗 Thả tim', 'gold', () => { NET.soc('du.like', { pid: c.pid }); closeModal(); }), btn('🚩 Báo cáo', 'ghost', () => reportForm(c.pid))); b.append(r);
      b.append(el('p', 'note', 'Nếu hai người cùng thả tim cho nhau, hệ thống sẽ hỏi cả hai có muốn trò chuyện không.'));
    });
  }
  function reportForm(pid) {
    modal('🚩 Báo cáo hồ sơ', (b) => {
      const s = el('select'); ['Ảnh không phù hợp', 'Giả mạo người khác', 'Có dấu hiệu lừa đảo', 'Dưới 18 tuổi', 'Nội dung xúc phạm', 'Khác'].forEach(x => { const o = el('option', '', x); o.value = x; s.append(o); });
      b.append(el('p', 'note', 'Hồ sơ bị 3 người báo cáo sẽ tự ẩn khỏi cây và không được ghép với bạn nữa.'), s, btn('Gửi báo cáo', 'gold', () => { NET.soc('du.report', { pid, reason: s.value }); closeModal(); }));
    });
  }

  /* ---------------- thông báo se duyên ---------------- */
  function announcePair(p) {
    A.bigBell(); X.banner('💞 Cây tình duyên vừa se duyên', `Bạn và ${p.other.nick}`, p.why);
    setTimeout(() => openHub('se'), 1200);
  }

  /* ---------------- trung tâm Cầu duyên ---------------- */
  function openHub(tab) {
    if (!NET.online) return modal('💞 Cầu duyên', (b) => b.append(el('p', 'note warn', 'Cầu duyên cần kết nối máy chủ nhiều người chơi (để ghép đôi và trò chuyện). Hãy chơi qua địa chỉ máy chủ của chùa.')));
    NET.soc('du.me'); NET.soc('du.tree');
    tab = tab || (st.pairs.length ? 'se' : st.prof ? 'cay' : 'hoso');
    modal('💞 Cầu duyên · chùa Hà', (box) => {
      const tabs = el('div', 'tutabs'), body = el('div', 'tubody'); box.append(tabs, body);
      const T = [['hoso', '📝 Hồ sơ của tôi'], ['cay', '🌳 Cây tình duyên'], ['se', '💞 Se duyên'], ['chat', '💬 Trò chuyện']];
      const show = (k) => { [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.k === k)); view = () => { if (!body.isConnected) { view = null; return; } body.innerHTML = ''; V[k](body); }; view(); };
      T.forEach(([k, t]) => { const b = el('button', '', t); b.dataset.k = k; b.onclick = () => show(k); tabs.append(b); });
      show(tab);
    }, { wide: true });
  }
  const V = {
    hoso(b) {
      const pr = st.prof;
      if (pr && !V._edit) {
        b.append(el('p', 'note', pr.hidden ? '⚠️ Hồ sơ đang bị ẩn do bị báo cáo.' : '🌳 Hồ sơ đang treo trên Cây tình duyên ở chùa Hà.'));
        cardView({ ...pr, age: year() - pr.by }, b);
        const r = el('div', 'row'); r.append(btn('✏️ Sửa hồ sơ', '', () => { V._edit = true; view(); }), btn('🌳 Đến Cây tình duyên', '', goTree), btn('Gỡ hồ sơ & xóa ảnh', 'ghost', () => NET.soc('du.del')));
        b.append(r); return;
      }
      form(b, pr);
    },
    cay(b) {
      if (!tree.length && !bots.length) { b.append(el('p', 'note', 'Cây tình duyên chưa có hồ sơ nào. Hãy là người đầu tiên treo lời nguyện!')); return; }
      const f = el('select'); [['', 'Tất cả tỉnh thành'], ...PROVS.map(x => [x, x])].forEach(([v, t]) => { const o = el('option', '', t); o.value = v; f.append(o); }); if (st.prof) f.value = st.prof.prov;
      const grid = el('div', 'dgrid'); b.append(f, grid);
      const draw = () => { grid.innerHTML = ''; [...tree, ...bots].filter(c => !f.value || c.prov === f.value).forEach(c => { const it = el('button', 'ditem' + (c.pid === myPid ? ' me' : '') + (c.bot ? ' bot' : '')); { const im = avImg(c); if (im) it.append(im); else it.append(el('i', '', gIcon(c.g))); }
        it.append(el('b', '', `${c.bot ? '🤖 ' : ''}${c.nick}, ${c.age}`), el('small', '', c.bot ? `${c.prov} · bạn đồng hành ảo` : c.prov)); it.onclick = () => showCard(c); grid.append(it); }); if (!grid.children.length) grid.append(el('p', 'note', 'Chưa có hồ sơ ở tỉnh này.')); };
      f.onchange = draw; draw();
    },
    se(b) {
      if (!st.prof) { b.append(el('p', 'note', 'Hãy treo hồ sơ lên Cây tình duyên trước. Khi có người hợp duyên, hệ thống sẽ báo ngay trên màn hình.'), btn('📝 Điền hồ sơ', 'gold', () => { V._edit = true; openHub('hoso'); })); return; }
      if (!st.pairs.length) { b.append(el('p', 'note', 'Chưa có lời se duyên mới. Hệ thống tìm người cùng tỉnh, tuổi gần nhau (chênh tối đa 6 tuổi), có chung sở thích — và ưu tiên cùng phường/xã.')); return; }
      st.pairs.forEach(p => {
        const box = el('div', 'dpair'); cardView(p.other, box, { why: p.why });
        if (p.mine === 1) box.append(el('p', 'note', '💞 Bạn đã đồng ý · đang chờ người ấy trả lời'));
        else { const r = el('div', 'row'); r.append(btn('💞 Đồng ý trò chuyện', 'gold', () => NET.soc('du.ans', { pair: p.id, ok: true })), btn('Không hợp', 'ghost', () => NET.soc('du.ans', { pair: p.id, ok: false }))); box.append(r); }
        b.append(box);
      });
    },
    chat(b) {
      if (!st.matches.length) { b.append(el('p', 'note', 'Khi cả hai cùng bấm "Đồng ý", khung trò chuyện riêng sẽ mở ở đây.')); return; }
      st.matches.forEach(m => { const it = el('button', 'ditem wide'); { const im = avImg(m.other); if (im) it.append(im); else it.append(el('i', '', gIcon(m.other.g))); }
        it.append(el('b', '', `${m.other.bot ? '🤖 ' : ''}${m.other.nick}${unread[m.id] ? ` · ${unread[m.id]} tin mới` : ''}`), el('small', '', m.msgs.length ? m.msgs[m.msgs.length - 1].x.slice(0, 40) : 'Hãy gửi lời chào 🙏')); it.onclick = () => { closeModal(); openChat(m.id); }; b.append(it); });
    }
  };
  function goTree() { closeModal(); if (temple().id !== 'chua-ha') X.fade(() => X.loadTemple('chua-ha')); else { const T = W().duyenTree; X.walkTo([new THREE.Vector3(T.center.x, 0, T.center.z + T.radius - 1)]); } }

  /* ---------------- form hồ sơ ---------------- */
  function form(b, pr) {
    pr = pr || {}; const photos = (pr.photos || []).slice();
    b.append(el('p', 'note', 'Điền thông tin để treo lên Cây tình duyên. Chỉ ghi tỉnh/thành và phường/xã — KHÔNG ghi số nhà, số điện thoại, số tài khoản (hệ thống sẽ tự che).'));
    const f = el('div', 'dform');
    const inp = (lab, node) => { const w = el('label', 'dfield'); w.append(el('span', '', lab), node); f.append(w); return node; };
    const nick = inp('Biệt danh', el('input')); nick.maxLength = 24; nick.value = pr.nick || P.name || '';
    const sel = (opts, v) => { const s = el('select'); opts.forEach(([val, t]) => { const o = el('option', '', t); o.value = val; s.append(o); }); if (v) s.value = v; return s; };
    const g = inp('Bạn là', sel([['', '— chọn —'], ['nam', 'Nam'], ['nu', 'Nữ']], pr.g));
    const seek = inp('Muốn tìm', sel([['nu', 'Nữ'], ['nam', 'Nam']], pr.seek || (pr.g === 'nu' ? 'nam' : 'nu')));
    g.onchange = () => { seek.value = g.value === 'nu' ? 'nam' : 'nu'; };
    const by = inp('Năm sinh', el('input')); by.type = 'number'; by.min = year() - 80; by.max = year() - 18; by.placeholder = 'VD: 1996'; by.value = pr.by || '';
    const prov = inp('Tỉnh / thành phố', sel([['', '— chọn —'], ...PROVS.map(x => [x, x])], pr.prov));
    const ward = inp('Phường / xã (không bắt buộc)', el('input')); ward.maxLength = 40; ward.placeholder = 'VD: phường Cầu Giấy'; ward.value = pr.ward || '';
    b.append(f);
    b.append(el('h3', '', 'Sở thích (chọn 1–6)'));
    const chosen = new Set(pr.ints || []), chips = el('div', 'dchips pick'); INTS.forEach(i => { const c = el('button', chosen.has(i) ? 'on' : '', i); c.onclick = () => { if (chosen.has(i)) chosen.delete(i); else if (chosen.size < 6) chosen.add(i); c.classList.toggle('on', chosen.has(i)); }; chips.append(c); }); b.append(chips);
    const about = el('textarea'); about.maxLength = 220; about.rows = 3; about.placeholder = 'Giới thiệu đôi chút về bạn…'; about.value = pr.about || '';
    const want = el('textarea'); want.maxLength = 140; want.rows = 2; want.placeholder = 'Bạn mong người ấy thế nào?'; want.value = pr.want || '';
    b.append(el('h3', '', 'Giới thiệu bản thân'), about, el('h3', '', 'Mong muốn ở nửa kia'), want);
    // ảnh
    b.append(el('h3', '', 'Ảnh (tối đa 3 · ảnh chân dung rõ mặt của chính bạn)'), el('p', 'note', '🔍 Ảnh được tự động kiểm tra: chỉ nhận ảnh có khuôn mặt người nhìn rõ.'));
    const pbox = el('div', 'dphotos edit'); b.append(pbox);
    const drawP = () => { pbox.innerHTML = ''; photos.forEach((id, i) => { const w = el('div', 'dph'); const im = new Image(); im.src = photoUrl(id); w.append(im, btn('✕', 'ghost', () => { photos.splice(i, 1); drawP(); })); pbox.append(w); });
      if (photos.length < 3) { const lab = el('label', 'dadd', '＋ Thêm ảnh'); const fi = el('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.hidden = true; lab.append(fi); fi.onchange = () => { const file = fi.files[0]; if (file) upload(file).then(id => { if (id) { photos.push(id); drawP(); } }); }; pbox.append(lab); } };
    drawP();
    // cam kết
    const c1 = el('input'); c1.type = 'checkbox'; const c2 = el('input'); c2.type = 'checkbox';
    const l1 = el('label', 'dcheck'); l1.append(c1, document.createTextNode(' Tôi từ 18 tuổi trở lên.')); const l2 = el('label', 'dcheck'); l2.append(c2, document.createTextNode(' Tôi đồng ý cho người chơi khác xem hồ sơ & ảnh này; không đăng ảnh người khác hay ảnh nhạy cảm.'));
    if (pr.nick) { c1.checked = c2.checked = true; } b.append(l1, l2);
    const r = el('div', 'row'); r.append(btn('🌳 Treo lên Cây tình duyên', 'gold', () => {
      const yb = +by.value; if (!g.value) return toast('Chọn giới tính'); if (!yb || year() - yb < 18) return toast('⚠️ Cầu duyên chỉ dành cho người từ 18 tuổi'); if (!prov.value) return toast('Chọn tỉnh / thành phố');
      if (!chosen.size) return toast('Chọn ít nhất 1 sở thích'); if (!c1.checked || !c2.checked) return toast('Hãy xác nhận hai ô cam kết');
      V._edit = false; NET.soc('du.save', { prof: { nick: nick.value.trim(), g: g.value, seek: seek.value, by: yb, prov: prov.value, ward: ward.value.trim(), ints: [...chosen], about: about.value.trim(), want: want.value.trim(), photos, adult: true } });
      A.khanh(); X.addBeads(9); P.dSaves = (P.dSaves || 0) + 1; save(); if (P.dSaves >= 2 && X.share) setTimeout(() => X.share('duyen'), 2500);
      setTimeout(() => NET.soc('du.tree'), 600);
    }));
    if (pr.nick) r.append(btn('Hủy', 'ghost', () => { V._edit = false; view(); }));
    b.append(r);
  }
  // nhận diện khuôn mặt ngay trên máy (face-api, mô hình Tiny Face Detector) — máy chủ còn kiểm tra lại lần nữa
  let FA = null;
  async function faceApi() {
    if (FA) return FA;
    const m = await import('../../vendor/face-api/face-api.esm.js');
    await m.nets.tinyFaceDetector.loadFromUri('vendor/face-api/model'); FA = m; return m;
  }
  async function hasFace(cv) {
    try {
      const fa = await faceApi(), det = await fa.detectAllFaces(cv, new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }));
      return det.some(d => d.score >= 0.6 && Math.max(d.box.width, d.box.height) >= 0.08 * Math.min(cv.width, cv.height));
    } catch (e) { console.warn('face-api', e); return null; }   // không chạy được trên máy này → để máy chủ kiểm tra
  }
  // thu nhỏ ảnh trên máy (≤ 720 px, JPEG) rồi gửi lên máy chủ
  async function upload(file) {
    try {
      const bmp = await createImageBitmap(file); const k = Math.min(1, 720 / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      toast('🔍 Đang kiểm tra khuôn mặt trong ảnh…');
      const ok = await hasFace(c); if (ok === false) { toast('⚠️ Không thấy rõ khuôn mặt người. Hãy chọn ảnh chân dung của chính bạn, nhìn rõ mặt.'); return null; }
      let q = 0.85, blob; do { blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q)); q -= 0.12; } while (blob && blob.size > 380 * 1024 && q > 0.3);
      toast('⏳ Đang tải ảnh…');
      const res = await fetch(`${NET.httpBase()}/duyen/anh`, { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-uid': P.uid }, body: blob });
      const j = await res.json(); if (!res.ok) { toast('⚠️ ' + (j.err || 'Không tải được ảnh')); return null; } toast('✅ Đã tải ảnh'); return j.id;
    } catch (e) { toast('⚠️ Không đọc được ảnh này'); return null; }
  }

  /* ---------------- khung trò chuyện riêng ---------------- */
  let chatEl = null;
  function openChat(id) {
    const m = st.matches.find(x => x.id === id); if (!m) return; chatOpen = id; unread[id] = 0; badge();
    if (!chatEl) { chatEl = el('div', 'dchat'); document.body.append(chatEl); }
    chatEl.hidden = false; chatEl.innerHTML = '';
    const head = el('div', 'dch-h'); const av = avImg(m.other) || el('i', '', gIcon(m.other.g)); av.onclick = () => showCard(m.other);
    const tt = el('div', 'dch-t'); tt.append(el('b', '', (m.other.bot ? '🤖 ' : '') + (m.other.nick || 'Người ấy')), el('small', '', m.other.bot ? 'Bạn đồng hành ảo · không phải người thật' : `${m.other.age ? m.other.age + ' tuổi · ' : ''}${m.other.prov || ''}`));
    const menu = el('div', 'dch-m'); menu.append(btn('⋯', 'ghost', () => endMenu(m)), btn('✕', 'ghost', closeChat));
    head.append(av, tt, menu);
    const log = el('div', 'dch-log'); log.id = 'dchLog';
    const safe = el('div', 'dch-safe', '🛡 Giữ an toàn: không chuyển tiền, không gửi mã OTP hay số tài khoản; gặp mặt ở nơi công cộng và báo người thân.');
    const form = el('form', 'dch-f'); const ip = el('input'); ip.maxLength = 300; ip.placeholder = 'Nhắn tin…'; ip.autocomplete = 'off'; form.append(ip, el('button', 'btn gold', 'Gửi'));
    form.onsubmit = (e) => { e.preventDefault(); const t = ip.value.trim(); if (!t) return; NET.soc('du.msg', { match: id, text: t }); ip.value = ''; };
    ip.addEventListener('keydown', e => e.stopPropagation());
    chatEl.append(head, safe, log, form); refreshChat(); setTimeout(() => ip.focus(), 50);
  }
  function refreshChat() {
    if (!chatOpen || !chatEl) return; const m = st.matches.find(x => x.id === chatOpen), log = $('dchLog'); if (!m || !log) return;
    log.innerHTML = ''; m.msgs.forEach(x => { const d = el('div', 'dmsg' + (x.me ? ' me' : '')); d.append(el('span', '', x.x), el('small', '', new Date(x.t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }))); log.append(d); });
    if (!m.msgs.length) log.append(el('p', 'note', `Hai bạn đã cùng đồng ý trò chuyện. Hãy gửi lời chào đầu tiên tới ${m.other.nick} 🙏`));
    log.scrollTop = log.scrollHeight;
  }
  function closeChat() { chatOpen = null; if (chatEl) chatEl.hidden = true; }
  function endMenu(m) {
    modal('Cuộc trò chuyện với ' + m.other.nick, (b) => {
      b.append(btn('🙏 Kết thúc trò chuyện', '', () => { NET.soc('du.end', { match: m.id }); closeModal(); closeChat(); }),
        btn('⛔ Chặn người này', '', () => { NET.soc('du.end', { match: m.id, block: true }); closeModal(); closeChat(); toast('Đã chặn · hai bạn sẽ không được ghép lại'); }),
        btn('🚩 Chặn & báo cáo', 'ghost', () => { NET.soc('du.end', { match: m.id, block: true, report: true, reason: 'Báo cáo từ khung trò chuyện' }); closeModal(); closeChat(); toast('🙏 Đã chặn và báo cáo'); }));
    });
  }

  /* ---------------- vòng đời ---------------- */
  function onTemple() { hearts = []; hGroup = null; if (W() && W().duyenTree && NET.online) NET.soc('du.tree'); }
  function dispose() { hearts = []; hGroup = null; }
  function step(dt, t) { hearts.forEach(h => { if (h.userData.ph != null) h.rotation.z = Math.sin(t * 1.6 + h.userData.ph) * 0.18; }); const T = W() && W().duyenTree; if (T && T.ribbons) T.ribbons.forEach(rb => { rb.rotation.x = Math.sin(t * 1.3 + rb.userData.ph) * 0.12; rb.rotation.z = Math.sin(t * 0.9 + rb.userData.ph * 1.7) * 0.08; }); }
  function context() {
    const T = W() && W().duyenTree; if (!T) return null; const c = T.center;
    if (Math.hypot(me.pos.x - c.x, me.pos.z - c.z) < (T.radius || 5.6)) return { label: st.prof ? '💞 Cây tình duyên' : '💞 Cầu duyên · treo hồ sơ', fn: () => openHub() };
    return null;
  }
  const b0 = $('bDuyen'); if (b0) b0.onclick = () => openHub();
  return { onTemple, dispose, step, context, openHub };
}
