/* =========================================================================
 *  BẢNG ĐIỀU KHIỂN — gửi lệnh sang màn hình phát qua BroadcastChannel
 * ========================================================================= */
(() => {
  const C = CBA.config;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n || 0).toLocaleString('vi-VN');
  const ch = new BroadcastChannel('chua-binh-an');
  const send = (cmd, args) => ch.postMessage({ type: 'cmd', cmd, args: args || {} });
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let lastState = 0, st = null, liveWin = null;

  const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem('cba_admin_' + k); localStorage.setItem('cba_admin_' + k, v); } catch (e) {} };
  $('wsUrl').value = pref('ws') || C.tikfinity.url;

  /* màn hình phát */
  $('openLive').onclick = () => {
    liveWin = window.open('live.html', 'cba_live', 'width=540,height=960');
    if (!liveWin) alert('Trình duyệt chặn cửa sổ mới — hãy cho phép pop-up cho trang này.');
  };
  document.querySelectorAll('[data-cmd]').forEach(b => b.onclick = () => send(b.dataset.cmd, b.dataset.args ? JSON.parse(b.dataset.args) : {}));
  $('buddhaSet').onchange = (e) => send('buddhaSet', { set: e.target.value });

  /* kết nối */
  $('connect').onclick = () => { pref('ws', $('wsUrl').value.trim()); send('connect', { url: $('wsUrl').value.trim() }); };
  $('disconnect').onclick = () => send('disconnect');

  /* âm nhạc */
  const pl = $('playlist');
  CBA.playlist.forEach((t, i) => {
    const li = el('li'); li.dataset.i = i;
    li.append(el('span', '', t.title), el('em', 'tag' + (t.type === 'file' ? ' file' : ''), t.type === 'file' ? 'FILE' : t.type === 'chant' ? 'GÕ MÕ' : 'TỔNG HỢP'));
    li.onclick = () => send('play', { index: i });
    pl.append(li);
  });
  ['musicOn', 'sfxOn', 'ttsOn'].forEach(k => $(k).onchange = (e) => send('audio', { [k]: e.target.checked }));
  ['musicVol', 'sfxVol'].forEach(k => $(k).oninput = (e) => send('audio', { [k]: +e.target.value }));
  $('mode').onchange = (e) => send('audio', { mode: e.target.value });

  /* chương trình */
  C.segments.forEach(s => {
    const b = el('button', 'btn'); b.dataset.id = s.id;
    b.append(el('b', '', s.title), el('div', 'hint', s.note));
    b.onclick = () => send('segment', { id: s.id, auto: $('segAuto').checked });
    $('segments').append(b);
  });
  CBA.teachings.forEach(t => { const o = el('option', '', t.title); o.value = t.id; $('teaching').append(o); });
  $('teaching').onchange = (e) => send('teaching', { id: e.target.value || null });
  $('announce').onclick = () => { const t = $('annText').value.trim(); if (t) send('announce', { text: t }); };

  /* thử hiệu ứng */
  C.giftTiers.forEach((t, i) => {
    const b = el('button', 'btn'); b.append(el('b', '', `${i + 1}. ${t.icon} ${t.label}`), el('small', '', `${t.min}+ xu · ${t.effect}`));
    b.onclick = () => send('test', { kind: 'tier', tier: t.id, name: $('testName').value || undefined });
    $('tierBtns').append(b);
  });
  document.querySelectorAll('[data-test]').forEach(b => b.onclick = () => send('test', { kind: b.dataset.test, name: $('testName').value || undefined }));
  $('sendText').onclick = () => { const t = $('testText').value.trim(); if (t) send('test', { kind: 'chat', text: t, name: $('testName').value || undefined }); };
  $('testText').onkeydown = (e) => { if (e.key === 'Enter') $('sendText').click(); };
  document.querySelectorAll('[data-ms]').forEach(b => b.onclick = () => send('test', { kind: 'milestone', milestone: b.dataset.ms }));

  /* bot */
  $('botBtn').onclick = () => send('bot', { on: !(st && st.bot), rate: $('botRate').value });
  $('botRate').onchange = () => { if (st && st.bot) send('bot', { on: true, rate: $('botRate').value }); };

  /* phiên */
  $('reset').onclick = () => { if (confirm('Xóa toàn bộ điểm Công Đức, hạt và bảng xếp hạng của phiên hiện tại?')) send('reset'); };
  $('export').onclick = () => send('export');

  /* nhận trạng thái */
  ch.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'state') { st = m; lastState = Date.now(); render(); }
    if (m.type === 'export') downloadCsv(m.users);
  };

  function render() {
    const s = st;
    const pill = $('connPill');
    pill.textContent = { connected: 'đã kết nối', connecting: 'đang kết nối…', error: 'lỗi kết nối', idle: 'chưa kết nối' }[s.conn] || s.conn;
    pill.className = 'pill' + (s.conn === 'connected' ? ' ok' : s.conn === 'error' ? ' err' : '');
    if (s.connMsg) $('connMsg').textContent = s.conn === 'connected' ? 'Đã kết nối ' + s.connMsg + ' — sự kiện thật đang được chuyển vào sân chùa.' : s.connMsg;
    $('sViewers').textContent = fmt(s.viewers);
    $('sPresent').textContent = `${fmt(s.present)}/${s.seats}`;
    $('sLast').textContent = s.lastEventAt ? Math.round((Date.now() - s.lastEventAt) / 1000) + 's trước' : '—';

    const a = s.audio;
    $('nowTitle').textContent = a.title + (a.fallback ? ' (thiếu file → gõ mõ)' : '');
    $('nowLine').textContent = a.line || '';
    $('playBtn').textContent = a.playing ? '⏸ Dừng' : '▶ Phát';
    $('musicOn').checked = a.musicOn; $('sfxOn').checked = a.sfxOn; $('ttsOn').checked = a.ttsOn;
    if (document.activeElement !== $('musicVol')) $('musicVol').value = a.musicVol;
    if (document.activeElement !== $('sfxVol')) $('sfxVol').value = a.sfxVol;
    $('mode').value = a.mode;
    [...pl.children].forEach((li, i) => {
      li.classList.toggle('cur', i === a.index);
      const tr = CBA.playlist[i]; const tag = li.querySelector('.tag');
      if (a.missing.includes(tr.id)) { tag.textContent = 'THIẾU FILE'; tag.className = 'tag miss'; }
    });
    if (a.ttsOn && !a.hasVoice) $('ttsOn').parentElement.title = 'Máy chưa có giọng đọc tiếng Việt — cài thêm trong cài đặt Windows (Ngôn ngữ → Tiếng Việt → Giọng nói)';

    document.querySelectorAll('#segments button').forEach(b => b.classList.toggle('cur', b.dataset.id === s.segment));
    if (document.activeElement !== $('teaching')) $('teaching').value = s.teaching || '';

    $('botPill').textContent = s.bot ? 'ĐANG CHẠY' : 'tắt';
    $('botPill').className = 'pill' + (s.bot ? ' err' : '');
    $('botBtn').textContent = s.bot ? 'Tắt bot' : 'Bật bot';

    const t = s.stats;
    $('tMerit').textContent = fmt(t.merit); $('tBeads').textContent = fmt(t.beads); $('tCoins').textContent = fmt(t.coins);
    $('tGifts').textContent = fmt(t.gifts); $('tComments').textContent = fmt(t.comments); $('tLikes').textContent = fmt(t.likes);
    $('tSocial').textContent = `${fmt(t.follows)} / ${fmt(t.shares)}`; $('tUsers').textContent = fmt(t.users);
    const tb = $('topTable'); tb.innerHTML = '';
    s.top.forEach((u, i) => { const tr = el('tr'); [i + 1, u.name, fmt(u.merit), fmt(u.coins), fmt(u.beads)].forEach(v => tr.append(el('td', '', String(v)))); tb.append(tr); });
  }

  setInterval(() => {
    const on = Date.now() - lastState < 4000;
    $('liveState').classList.toggle('on', on);
    $('liveState').innerHTML = 'Màn hình phát: <b>' + (on ? 'đang chạy' : 'chưa mở') + '</b>';
  }, 1000);

  function downloadCsv(users) {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [['Hạng', 'Tên', 'TikTok ID', 'Công đức', 'Xu', 'Hạt']].concat(users.map((u, i) => [i + 1, u.name, u.id, u.merit, u.coins, u.beads]));
    const csv = '﻿' + rows.map(r => r.map(q).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'cong-duc-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  }
})();
