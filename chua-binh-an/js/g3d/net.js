/* Nhiều người chơi thật: kết nối máy chủ (server/server.js) qua WebSocket.
   Mỗi chùa có nhiều KÊNH; máy chủ tự xếp người vào kênh còn chỗ hoặc mở kênh mới.
   Không có máy chủ → game chạy một mình như cũ (Phật tử mô phỏng). */
const CFG = (window.CBA && CBA.server) || {};
const SEND_HZ = 5;

function serverUrl() {
  let u = CFG.url == null ? 'auto' : CFG.url;
  const q = new URLSearchParams(location.search).get('server'); if (q) u = q;
  if (!u) return '';
  if (u === 'auto') {   // game do chính máy chủ phục vụ → nối về cùng địa chỉ
    if (!/^https?:$/.test(location.protocol) || /claude\.ai|claudeusercontent|github\.io/.test(location.host)) return '';
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  }
  return u.replace(/^http/, 'ws').replace(/\/?$/, u.endsWith('/ws') ? '' : '/ws').replace(/\/ws\/ws$/, '/ws');
}

export function initNet(ctx) {
  const { P, me, scene, Avatar, label, placeLabel, toast, ticker, A, hash, onPeers, remoteLantern, badgeOf } = ctx;
  const url = serverUrl();
  let ws = null, temple = null, ch = 0, chs = [], cap = 30, myId = 0, online = false, tries = 0, sendT = 0, lastS = '', lastSentAt = 0, profT = 0, wantCh = 0;
  const peers = new Map();   // id → { av, label, name, b, m, bd, tgt, yaw, mv }
  const listeners = new Set(), changed = () => listeners.forEach(f => f());

  function clearPeers() { peers.forEach(p => { scene.remove(p.av.root); p.label.remove(); }); peers.clear(); onPeers(0); }
  function addPeer(d) {
    if (peers.has(d.id) || d.id === myId) return;
    const av = new Avatar({ look: d.look, seed: hash(d.name + d.id) }); av.root.userData.tmp = true; av.root.userData.peer = true;
    const s = d.s || [0, 0, 0, 0, 'idle', 0];
    const pe = { av, label: label('🟢 ' + d.name + (d.bd ? ' ' + d.bd : ''), 'peer'), name: d.name, b: d.b || 0, m: d.m || 0, bd: d.bd || '', tgt: { x: s[0], y: s[1], z: s[2] }, yaw: s[3], mv: 0, pose: s[4] || 'idle', seen: !!(s[0] || s[2]) };
    av.root.position.set(s[0], s[1], s[2]); av.root.visible = pe.seen; scene.add(av.root); peers.set(d.id, pe); onPeers(peers.size);
  }
  function delPeer(id) { const p = peers.get(id); if (!p) return; scene.remove(p.av.root); p.label.remove(); peers.delete(id); onPeers(peers.size); }

  function connect() {
    if (!url || ws) return;
    try { ws = new WebSocket(url); } catch (e) { ws = null; return; }
    ws.onopen = () => { tries = 0; if (temple) hello(); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } handle(m); };
    ws.onclose = () => {
      const was = online; ws = null; online = false; clearPeers(); changed();
      if (was) toast('📡 Mất kết nối máy chủ · đang thử kết nối lại…');
      tries++; if (tries < 30) setTimeout(connect, Math.min(30000, 1500 * tries));
    };
    ws.onerror = () => {};
  }
  const sendJ = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  function hello() { sendJ({ t: 'hello', temple, ch: wantCh || ch, name: P.name, look: P.look, b: P.beads | 0, m: P.merit | 0, bd: badgeOf(P) }); lastS = ''; }
  function handle(m) {
    if (m.t === 'welcome') {
      clearPeers(); myId = m.id; ch = m.ch; cap = m.cap; chs = m.chs || []; online = true; wantCh = 0;
      (m.peers || []).forEach(addPeer); changed();
      toast(peers.size ? `📡 Kênh ${ch} · có ${peers.size} người chơi thật khác đang ở đây (nhãn 🟢 xanh)` : `📡 Đã vào Kênh ${ch} · bạn là người chơi thật đầu tiên ở đây`);
    } else if (m.t === 'join') { addPeer(m.p); changed(); toast(`👋 ${m.p.name} vừa vào chùa (người chơi thật)`); }
    else if (m.t === 'leave') { delPeer(m.id); changed(); }
    else if (m.t === 'prof') { const p = peers.get(m.id); if (p) { p.b = m.b; p.m = m.m; p.bd = m.bd; p.label.textContent = '🟢 ' + p.name + (p.bd ? ' ' + p.bd : ''); } }
    else if (m.t === 's') {
      (m.l || []).forEach(([id, x, y, z, yaw, pose, mv]) => {
        const p = peers.get(id); if (!p) return;
        if (!p.seen) { p.av.root.position.set(x, y, z); p.av.root.visible = true; p.seen = true; }
        const far = Math.hypot(x - p.tgt.x, z - p.tgt.z) > 8;   // dịch chuyển xa (vào điện, đổi chỗ) → nhảy luôn
        p.tgt = { x, y, z }; p.yaw = yaw; p.mv = mv; if (far) p.av.root.position.set(x, y, z);
        if (pose !== p.pose) { p.pose = pose; p.av.setPose(pose === 'bow' ? 'kneel' : pose); }
      });
      (m.a || []).forEach(([id, k, d]) => act(id, k, d));
    } else if (m.t === 'chs') { chs = m.chs; cap = m.cap; changed(); }
    else if (m.t === 'chfull') toast(`Kênh ${m.ch} vừa đầy · chọn kênh khác`);
    else if (m.t === 'full') { toast(`📡 Máy chủ đang đầy (${m.max} người) · bạn chơi chế độ một mình, thử lại sau`); tries = 99; }
  }
  function act(id, k, d) {
    if (id === myId) return; const p = peers.get(id); if (!p) return;
    const nm = p.name, near = me.av && p.av.root.position.distanceTo(me.av.root.position) < 22;
    if (k === 'bow') p.av.bow();
    else if (k === 'bell') { p.av.bow(); if (near && A.smallBell) A.smallBell(); ticker(`🔔 ${nm} vừa thỉnh chuông`); }
    else if (k === 'incense') { p.av.setPose('incense'); setTimeout(() => p.av.setPose(p.pose || 'idle'), 2400); ticker(`🕯️ ${nm} vừa thắp nén hương`); }
    else if (k === 'offer') ticker(`🪔 ${nm} vừa dâng ${d || 'lễ vật'} lên Tam Thế Phật`);
    else if (k === 'lantern') { remoteLantern(p.av.root.position); ticker(`🏮 ${nm} vừa thả đèn nguyện`); }
    else if (k === 'mala') ticker(`📿 ${nm} vừa tròn một chuỗi 108 hạt`);
    else if (k === 'chant') ticker(`🪵 ${nm} đang tụng ${d || 'kinh'}`);
    else if (k === 'cert') ticker(`${d || '🪷'} ${nm} vừa nhận chứng nhận công đức`);
  }

  /* gọi mỗi khung hình */
  function step(dt) {
    peers.forEach(p => {
      const r = p.av.root.position, k = Math.min(1, dt * 8);
      const dx = p.tgt.x - r.x, dz = p.tgt.z - r.z, moving = p.mv || Math.hypot(dx, dz) > 0.05;
      r.x += dx * k; r.y += (p.tgt.y - r.y) * k; r.z += dz * k;
      let dy = p.yaw - p.av.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.av.root.rotation.y += dy * k;
      p.av.update(dt, moving && p.pose === 'idle'); placeLabel(p.label, r, p.av.height + 0.15);
    });
    if (!online) return;
    sendT += dt; if (sendT < 1 / SEND_HZ) return; sendT = 0;
    const pose = me.av ? (me.av.target || 'idle') : 'idle';
    const s = [+me.pos.x.toFixed(2), +me.y.toFixed(2), +me.pos.z.toFixed(2), +me.yaw.toFixed(2), pose, me.moving ? 1 : 0], key = JSON.stringify(s);
    if (key !== lastS || Date.now() - lastSentAt > 4000) { sendJ({ t: 's', s }); lastS = key; lastSentAt = Date.now(); }   // đứng yên thì không gửi (nhẹ mạng)
    profT += 1 / SEND_HZ; if (profT > 15) { profT = 0; sendJ({ t: 'prof', b: P.beads | 0, m: P.merit | 0, bd: badgeOf(P) }); }
  }

  return {
    get enabled() { return !!url; }, get online() { return online; }, get ch() { return ch; }, get cap() { return cap; }, get chs() { return chs; },
    get count() { return peers.size + 1; },
    peers: () => [...peers.values()].map(p => ({ name: p.name, beads: p.b, merit: p.m, bd: p.bd })),
    join(t) { temple = t; if (!url) return; if (!ws) connect(); else if (ws.readyState === 1) hello(); },
    leave() { clearPeers(); },
    act(k, d) { if (online) sendJ({ t: 'act', k, d: d || '' }); },
    profile() { if (online) sendJ({ t: 'prof', b: P.beads | 0, m: P.merit | 0, bd: badgeOf(P) }); },
    listChannels() { sendJ({ t: 'chs' }); },
    switchChannel(c) { if (online && c !== ch) { wantCh = c; sendJ({ t: 'ch', ch: c }); } },
    newChannel() { if (online) { let c = 1; while (chs.some(x => x.ch === c)) c++; wantCh = c; sendJ({ t: 'ch', ch: c }); } },
    step, onChange: (f) => listeners.add(f)
  };
}
