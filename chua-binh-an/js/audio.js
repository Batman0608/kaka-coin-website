/* =========================================================================
 *  ÂM THANH: tiếng mõ, chuông (tổng hợp bằng Web Audio), nhạc thiền tổng
 *  hợp, trình phát danh sách kinh/nhạc, đọc lời cảm ơn (Text-to-Speech).
 * ========================================================================= */
window.CBA = window.CBA || {};

CBA.Audio = (() => {
  let ctx = null, master, sfxGain, padGain;
  let pad = null;               // nhạc thiền tổng hợp đang chạy
  let metroTimer = null;        // nhịp mõ
  let lineTimer = null;
  const el = new Audio();       // phát file mp3 (không đi qua WebAudio để tránh lỗi CORS khi mở bằng file://)
  el.preload = 'auto';

  const st = {
    musicOn: true, sfxOn: true, ttsOn: false, storyTtsOn: true,
    musicVol: 0.55, sfxVol: 0.8,
    index: 0, playing: false, mode: 'next',   // next | loop | shuffle
    lineIdx: -1, missing: {},
    duck: 1
  };
  let onChange = () => {};
  let onBeat = () => {};
  let onComplete = () => {};

  /* ---------- khởi tạo ---------- */
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.connect(master);
      padGain = ctx.createGain(); padGain.connect(master);
      applyVolume();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function unlocked() { return !!ctx && ctx.state === 'running'; }
  /* mở khóa âm thanh ở lần chạm / bấm phím đầu tiên (trình duyệt chặn âm thanh trước khi người dùng tương tác) */
  function unlock() {
    if (!ensure()) return;
    try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    loadSamples();
    if (window.speechSynthesis && speechSynthesis.paused) speechSynthesis.resume();
  }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); });

  function applyVolume() {
    const mv = st.musicOn ? st.musicVol * st.duck : 0;
    el.volume = Math.max(0, Math.min(1, mv));
    if (ctx) {
      padGain.gain.setTargetAtTime(mv * 0.5, ctx.currentTime, 0.3);
      sfxGain.gain.setTargetAtTime(st.sfxOn ? st.sfxVol : 0, ctx.currentTime, 0.05);
    }
  }

  /* ---------- hiệu ứng âm thanh ---------- */
  function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  /* ---------- MẪU ÂM THANH THẬT (audio/sfx/) ---------- */
  const SAMPLES = {};
  const SAMPLE_URLS = { mo: 'audio/sfx/mo.mp3?v=3', moSoft: 'audio/sfx/mo-nhe.mp3?v=3', bell: 'audio/sfx/chuong-chua.mp3?v=3', bowl: 'audio/sfx/chuong-khanh.mp3', chant: 'audio/sfx/tung-kinh-nen.mp3' };
  function loadSamples() {
    if (!ensure() || loadSamples.done) return; loadSamples.done = true;
    Object.entries(SAMPLE_URLS).forEach(([k, u]) => fetch(u).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => ctx.decodeAudioData(b)).then(buf => { SAMPLES[k] = buf; if (k === 'chant' && ambience.on) ambience.restart(); }).catch(() => {}));
  }
  function playSample(k, vol = 1, when = 0, rate = 1, dest = null) {
    const b = SAMPLES[k]; if (!b) return false;
    const src = ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = vol; src.connect(g).connect(dest || sfxGain); src.start(ctx.currentTime + when); return true;
  }

  /* Tiếng mõ gỗ: "cốc" */
  function mo(vol = 1, when = 0) {
    if (!ensure() || !st.sfxOn) return;
    loadSamples();
    if (playSample(vol < 0.7 ? 'moSoft' : 'mo', Math.min(1, vol * 1.1), when, 0.97 + Math.random() * 0.06)) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(760, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7 * vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(sfxGain); o.start(t); o.stop(t + 0.25);
    // tiếng gõ (click)
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.03);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 3;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5 * vol, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    n.connect(bp).connect(ng).connect(sfxGain); n.start(t);
  }

  /* Chuông: f0 thấp = đại hồng chung, f0 cao = chuông gia trì / khánh */
  function bell(f0 = 140, dur = 7, vol = 0.6, when = 0) {
    if (!ensure() || !st.sfxOn) return;
    const t = ctx.currentTime + when;
    const partials = [[0.5, 0.35, 1.2], [1, 1, 1], [2.0, 0.45, 0.7], [2.76, 0.35, 0.55], [4.07, 0.2, 0.4], [5.4, 0.15, 0.3], [8.93, 0.06, 0.18]];
    partials.forEach(([r, a, dk]) => {
      [-0.6, 0.6].forEach(det => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f0 * r + det;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(a * vol * 0.22, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * dk);
        o.connect(g).connect(sfxGain); o.start(t); o.stop(t + dur * dk + 0.05);
      });
    });
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.06);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.25 * vol, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(lp).connect(ng).connect(sfxGain); n.start(t);
    duckFor(dur * 0.5);
  }
  const bigBell = (when = 0) => { if (ensure() && st.sfxOn && playSample('bell', 0.9, when)) { duckFor(4); return; } bell(98, 9, 0.85, when); };
  const smallBell = (when = 0) => { if (ensure() && st.sfxOn && playSample('bowl', 0.55, when, 1.25)) return; bell(520, 3.5, 0.45, when); };
  const khanh = (when = 0) => { if (ensure() && st.sfxOn && playSample('bowl', 0.7, when)) return; bell(330, 5, 0.5, when); };

  function duckFor(sec) {
    st.duck = 0.55; applyVolume();
    clearTimeout(duckFor._t);
    duckFor._t = setTimeout(() => { st.duck = 1; applyVolume(); }, Math.min(sec, 4) * 1000);
  }

  /* ---------- nhạc thiền tổng hợp ---------- */
  let tone = { root: 73.42, scale: [293.66, 329.63, 440, 493.88, 587.33] };
  function setTone(t) {   // mỗi chùa một âm điệu riêng
    if (!t) return; tone = t;
    if (pad) { stopPad(); setTimeout(startPad, 300); }
  }
  function startPad() {
    if (!ensure() || pad) return;
    const r = tone.root, notes = [r, r * 1.5, r * 2, r * 3, r * 4];   // nền ngũ cung theo âm chủ của chùa
    const out = ctx.createGain(); out.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    out.connect(lp).connect(padGain);
    const nodes = [];
    notes.forEach((f, i) => {
      ['sine', 'triangle'].forEach((type, k) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * (k ? 1.003 : 1);
        const g = ctx.createGain(); g.gain.value = (k ? 0.05 : 0.09) / (1 + i * 0.4);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.023;
        const lg = ctx.createGain(); lg.gain.value = g.gain.value * 0.6;
        lfo.connect(lg).connect(g.gain);
        o.connect(g).connect(out); o.start(); lfo.start();
        nodes.push(o, lfo);
      });
    });
    out.gain.setTargetAtTime(1, ctx.currentTime, 2);
    // thỉnh khánh nhẹ ngẫu nhiên
    const scale = tone.scale;
    const sparkle = setInterval(() => {
      if (!st.musicOn || !pad) return;
      const f = scale[Math.floor(Math.random() * scale.length)];
      const o = ctx.createOscillator(), g = ctx.createGain(); const t = ctx.currentTime;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.connect(g).connect(padGain); o.start(t); o.stop(t + 4.1);
    }, 5200);
    pad = { out, nodes, sparkle };
  }
  function stopPad() {
    if (!pad) return;
    const p = pad; pad = null;
    clearInterval(p.sparkle);
    p.out.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    setTimeout(() => p.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 2500);
  }

  /* ---------- trình phát ---------- */
  const list = () => CBA.playlist;
  const cur = () => list()[st.index];
  const textOf = (tr) => tr && tr.text ? (CBA.texts[tr.text] || []) : [];

  function clearTimers() { clearInterval(metroTimer); metroTimer = null; clearInterval(lineTimer); lineTimer = null; }

  function stopAll() {
    clearTimers(); stopPad();
    el.pause();
    st.playing = false; st.lineIdx = -1;
  }

  function setLine(i) { st.lineIdx = i; onChange(); }

  function startChant(tr) {
    startPad();
    const lines = textOf(tr);
    const ms = 60000 / (tr.bpm || 60);
    let beat = 0;
    setLine(lines.length ? 0 : -1);
    metroTimer = setInterval(() => {
      if (!st.playing) return;
      if (st.autoMo !== false) mo(beat % 4 === 0 ? 1 : 0.65);
      onBeat();
      beat++;
      if (lines.length && beat % (tr.beatsPerLine || 8) === 0) {
        const n = st.lineIdx + 1;
        if (n >= lines.length) { onComplete(tr); if (st.mode === 'loop') setLine(0); else next(); return; }
        setLine(n);
      }
    }, ms);
  }

  function startSynth(tr) {
    startPad();
    const lines = textOf(tr);
    if (lines.length) {
      setLine(0);
      lineTimer = setInterval(() => setLine((st.lineIdx + 1) % lines.length), (tr.lineSeconds || 8) * 1000);
    }
  }

  function play(i) {
    if (typeof i === 'number') st.index = (i + list().length) % list().length;
    ensure();
    stopAll();
    const tr = cur(); if (!tr) return;
    st.playing = true;
    if (tr.type === 'file') {
      if (st.missing[tr.id]) { startChant(Object.assign({ bpm: 60, beatsPerLine: 8 }, tr)); onChange(); return; }
      el.src = tr.src; el.currentTime = 0;
      el.loop = st.mode === 'loop';
      applyVolume();
      el.play().catch(() => {});
      setLine(textOf(tr).length ? 0 : -1);
    } else if (tr.type === 'chant') startChant(tr);
    else startSynth(tr);
    onChange();
  }

  el.addEventListener('error', () => {
    const tr = cur();
    if (tr && tr.type === 'file' && st.playing) {
      st.missing[tr.id] = true;
      console.warn('[Âm thanh] Không tìm thấy file', tr.src, '→ chuyển sang chế độ gõ mõ + chữ kinh');
      if (!tr.text) {   // bài không có chữ: chuyển sang bài tổng hợp cùng loại có chữ kinh
        const alt = list().findIndex(t => t.category === tr.category && t.type !== 'file' && t.text);
        if (alt >= 0) return play(alt);
      }
      play();
    }
  });
  el.addEventListener('timeupdate', () => {
    const tr = cur(); const lines = textOf(tr);
    if (!lines.length || !el.duration) return;
    const i = Math.min(lines.length - 1, Math.floor(el.currentTime / el.duration * lines.length));
    if (i !== st.lineIdx) setLine(i);
  });
  el.addEventListener('ended', () => { const tr = cur(); if (tr && tr.text) onComplete(tr); if (st.mode !== 'loop') next(); });

  function next() {
    if (st.mode === 'shuffle') play(Math.floor(Math.random() * list().length));
    else play(st.index + 1);
  }
  function prev() { play(st.index - 1); }
  function toggle() {
    if (st.playing) { stopAll(); onChange(); }
    else play();
  }
  function playCategory(cat, temple) {
    const all = list().map((t, i) => ({ t, i })).filter(x => !st.missing[x.t.id]);
    const ok = all.filter(x => x.t.category === cat);
    // ưu tiên: file riêng của chùa → bài riêng của chùa → file chung → bài tổng hợp
    const pick = (temple && all.find(x => x.t.temple === temple && x.t.type === 'file' && x.t.category === cat))
      || (temple && cat === 'niem' && all.find(x => x.t.temple === temple))
      || ok.find(x => x.t.type === 'file' && !x.t.temple) || ok.find(x => !x.t.temple) || ok[0];
    if (pick) play(pick.i);
  }
  function playTemple(temple) {
    const all = list().map((t, i) => ({ t, i })).filter(x => !st.missing[x.t.id] && x.t.temple === temple);
    const pick = all.find(x => x.t.type === 'file') || all[0];
    if (pick) play(pick.i);
  }
  function setTempleTrack(t) {   // bài niệm riêng của chùa (không cần file)
    const i = list().findIndex(x => x.id === 'temple_chant');
    const tr = { id: 'temple_chant', title: `Niệm tại ${t.name}`, category: 'niem', type: 'chant', bpm: 64, beatsPerLine: 8, text: t.chant, temple: t.id };
    if (i >= 0) list()[i] = tr; else list().splice(1, 0, tr);
    onChange();
  }

  /* ---------- đọc giọng nói ---------- */
  /* Giọng đọc: CHỈ dùng giọng tiếng Việt, ưu tiên giọng Bắc (Hà Nội).
     Edge: "Microsoft HoaiMy / NamMinh Online (Natural)"; Windows: "Microsoft An";
     Android/Chrome: "Google tiếng Việt". Không có giọng Việt thì KHÔNG đọc (tránh giọng tiếng Anh). */
  let viVoice = null, viVoices = [];
  const NORTH = [/namminh/i, /\ban\b|microsoft an/i, /hoaimy/i, /google.*(vi|việt)/i, /linh/i];   // ưu tiên giọng nam
  function pickVoice() {
    if (!window.speechSynthesis) return;
    viVoices = speechSynthesis.getVoices().filter(v => /^vi/i.test(v.lang) || /vietnam|việt/i.test(v.name));
    let want = null; try { want = localStorage.getItem('cba_voice'); } catch (e) {}
    viVoice = viVoices.find(v => v.name === want) || NORTH.map(r => viVoices.find(v => r.test(v.name))).find(Boolean) || viVoices[0] || null;
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text, kind) {
    if (kind === 'cancel') { stopVoice(); return; }
    if (kind === 'story' && st.storyTtsOn && hasVoiceFile(text)) { say(text); return; }
    if (!window.speechSynthesis) return;
    if (!viVoice) pickVoice();
    if (!viVoice) return;                         // không có giọng tiếng Việt: không đọc bằng giọng tiếng Anh
    if (kind === 'story') {                      // đọc truyện: bật/tắt riêng, đọc nối tiếp
      if (!st.storyTtsOn) return;
      if (/^Câu đố|^Trang|^Sư/.test(text) === false && speechSynthesis.speaking && text.length > 40) { /* để đọc nối */ }
    } else {
      if (!st.ttsOn) return;
      if (speechSynthesis.pending) return;       // tránh dồn hàng đợi khi quà dồn dập
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = viVoice.lang || 'vi-VN'; u.voice = viVoice;
    u.rate = 0.95; u.pitch = 1;
    u.onstart = () => { st.duck = 0.35; applyVolume(); };
    u.onend = () => { st.duck = 1; applyVolume(); };
    speechSynthesis.speak(u);
  }

  /* ---------- tự nhận file nhạc trong thư mục audio/ ----------
     Máy chủ nội bộ (start.bat) liệt kê được nội dung thư mục, nên chỉ cần chép
     file (mp3, m4a, wav, ogg, flac…) vào audio/ — kể cả thư mục con — là game
     tự thêm vào danh sách phát, tự đoán loại bài theo tên file / tên thư mục. */
  const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm|wma)$/i;
  const noMark = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  async function listDir(path, depth) {
    let html;
    try { const r = await fetch(path, { cache: 'no-store' }); if (!r.ok) return []; html = await r.text(); } catch (e) { return []; }
    const out = [], re = /href="([^"?#]+)"/gi; let m;
    while ((m = re.exec(html))) {
      let h = m[1];
      if (/^(https?:|\.\.|mailto:)/i.test(h)) continue;
      if (h.startsWith('/')) { if (h.startsWith('/' + path)) h = h.slice(path.length + 1); else continue; }
      if (!h || h === './') continue;
      if (h.endsWith('/')) { if (depth < 3) out.push(...await listDir(path + h, depth + 1)); }
      else if (AUDIO_EXT.test(h)) out.push(path + h);
    }
    return [...new Set(out)];
  }
  function guessCategory(t) {
    const n = noMark(t);
    if (/vu lan|bao hieu|cha me|on me|long me|hieu/.test(n)) return 'vulan';
    if (/hoi huong/.test(n)) return 'hoihuong';
    if (/giang|phap thoai|bai giang|thuyet/.test(n)) return 'giang';
    if (/niem phat|a di da|adida|nam mo|hong danh/.test(n)) return 'niem';
    if (/kinh|chu |chu$|dai bi|duoc su|bat nha|tung|sam|pho mon|lang nghiem|vang sanh/.test(n)) return 'kinh';
    return 'thien';
  }
  function niceTitle(file) {
    let t = decodeURIComponent(file.split('/').pop()).replace(AUDIO_EXT, '');
    t = t.replace(/[_]+/g, ' ').replace(/\s*-\s*/g, ' - ').replace(/^\s*\d{1,3}\s*[-._)]\s*/, '').trim();
    return t || file;
  }
  function addTracks(items) {   // items: [{ src, title?, folder? }]
    const have = new Set(list().map(t => t.src));
    let added = 0;
    items.forEach(it => {
      if (have.has(it.src)) return;
      const title = it.title || niceTitle(it.src);
      const folder = it.folder || decodeURIComponent(it.src.split('/').slice(1, -1).join(' '));
      const slug = noMark(folder).replace(/[^a-z0-9]+/g, '-');
      const tp = (CBA.temples || []).find(x => x.id !== 'binh-an' && slug.includes(x.id));
      list().push({ id: 'auto_' + list().length + '_' + noMark(title).replace(/[^a-z0-9]+/g, '_'), title: tp ? `${title} · ${tp.name}` : title, type: 'file', src: it.src, category: guessCategory(folder + ' ' + title), auto: true, temple: tp ? tp.id : undefined });
      added++;
    });
    if (added) onChange();
    return added;
  }
  async function scanFolder() {
    const files = await listDir('audio/', 0);
    if (!files.length) return 0;
    const found = new Set(files);
    // bỏ các bài mẫu trỏ tới file không có thật
    for (let i = list().length - 1; i >= 0; i--) {
      const t = list()[i];
      if (t.type === 'file' && !t.auto && !found.has(t.src) && i !== st.index) list().splice(i, 1);
    }
    st.index = Math.min(st.index, list().length - 1);
    const n = addTracks(files.filter(f => !list().some(t => t.src === f)).map(src => ({ src })));
    console.info('[Âm thanh] Đã nhận', files.length, 'file trong audio/ (thêm mới', n, ')');
    onChange();
    return files.length;
  }

  /* ---------- KHÔNG GIAN CHÙA: đại chúng tụng niệm + mõ xa + chuông xa ----------
     Tổng hợp bằng Web Audio: hợp xướng giọng trầm đọc "Nam mô A Di Đà Phật"
     (6 âm tiết, mỗi âm tiết một nguyên âm qua bộ lọc formant), mõ đều, đại hồng chung mỗi ~75 giây.
     ambience.level(0..1) theo khoảng cách tới chánh điện; ambience.duck(true) khi người chơi tự gõ mõ / lần hạt. */
  const ambience = (() => {
    let on = false, out = null, timer = null, bellT = null, lvl = 0, ducked = false;
    const VOW = { a: [800, 1150], o: [450, 800], u: [350, 650], i: [300, 2200], e: [400, 2000] };
    const SYL = [['a', 0], ['o', 0], ['a', 2], ['i', 0], ['a', -2], ['a', 0]];   // Nam · Mô · A · Di · Đà · Phật
    function voice(t, f0, vow, dur, gainV) {
      const [f1, f2] = VOW[vow];
      [-4, 0, 3, 7].forEach((det, k) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f0 * (k === 3 ? 0.5 : 1); o.detune.value = det * 3;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gainV, t + 0.08); g.gain.setValueAtTime(gainV, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f1; b1.Q.value = 6;
        const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = f2; b2.Q.value = 8;
        const m = ctx.createGain(); m.gain.value = 0.6;
        o.connect(g); g.connect(b1).connect(out); g.connect(b2).connect(m).connect(out);
        o.start(t); o.stop(t + dur + 0.05);
      });
    }
    function woodTap(t, v) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(500, t + 0.08);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.22);
    }
    function phrase() {
      if (!on) return;
      const t0 = ctx.currentTime + 0.05, beat = 1.05, base = 110;   // nhịp chậm như tụng thật
      SYL.forEach(([v, st], i) => { const t = t0 + i * beat; voice(t, base * Math.pow(2, st / 12), v, beat * (i === 5 ? 1.6 : 0.95), 0.05); if (i % 2 === 0) woodTap(t, 0.3); });
      timer = setTimeout(phrase, (SYL.length * beat + 2.0) * 1000);
    }
    let loop = null;
    function startLoop() {   // bản thu tụng kinh thật, phát lặp
      if (!SAMPLES.chant || loop) return false;
      loop = ctx.createBufferSource(); loop.buffer = SAMPLES.chant; loop.loop = true; const g = ctx.createGain(); g.gain.value = 0.9; loop.connect(g).connect(out); loop.start(); return true;
    }
    function distantBell() {
      if (!on) return;
      if (!playSample('bell', 0.55, 0, 1, out)) { const prev = sfxGain; sfxGain = out; bell(92, 9, 0.6); sfxGain = prev; }
      bellT = setTimeout(distantBell, 60000 + Math.random() * 30000);
    }
    const apply = () => { if (out) out.gain.setTargetAtTime(on ? lvl * (ducked ? 0.18 : 1) * 0.9 : 0, ctx.currentTime, 0.4); };
    return {
      start() {
        if (on || !ensure()) return; on = true;
        out = ctx.createGain(); out.gain.value = 0;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        const dl = ctx.createDelay(1); dl.delayTime.value = 0.23; const fb = ctx.createGain(); fb.gain.value = 0.35;   // vang trong điện
        out.connect(lp).connect(master); lp.connect(dl); dl.connect(fb).connect(dl); dl.connect(master);
        loadSamples(); if (!startLoop()) phrase(); bellT = setTimeout(distantBell, 8000); apply();
      },
      restart() { if (!on) return; clearTimeout(timer); startLoop(); },
      stop() { on = false; clearTimeout(timer); clearTimeout(bellT); if (loop) { try { loop.stop(); } catch (e) {} loop = null; } apply(); },
      level(v) { lvl = Math.max(0, Math.min(1, v)); apply(); },
      duck(d) { ducked = !!d; apply(); },
      get on() { return on; }
    };
  })();
  function voices() { pickVoice(); return viVoices.map(v => v.name); }
  /* file giọng đọc thu sẵn: audio/voice/manifest.json = { "câu chữ": "tên-file.mp3" } (tạo bằng tools/tao_giong_doc.py hoặc tự thu) */
  /* GIỌNG ĐỌC THU SẴN (Microsoft Neural, tự nhiên): audio/voice/<giọng>/manifest.json · danh sách ở audio/voice/voices.json
     Người chơi chọn trong Cài đặt; 'may' = dùng giọng có sẵn của máy (Web Speech). */
  let VOICE = null, voiceEl = null, PACKS = [], PACK = 'thay';
  try { PACK = localStorage.getItem('cba_voicepack') || 'thay'; } catch (e) {}
  function loadPack(id) {
    PACK = id; VOICE = null;
    if (id === 'may') { VOICE = {}; return Promise.resolve(); }
    return fetch('audio/voice/' + id + '/manifest.json').then(r => r.ok ? r.json() : {}).then(m => { if (PACK === id) VOICE = m || {}; }).catch(() => { VOICE = {}; });
  }
  fetch('audio/voice/voices.json').then(r => r.ok ? r.json() : []).then(l => { PACKS = l || []; if (PACK !== 'may' && !PACKS.some(p => p.id === PACK)) PACK = PACKS[0] ? PACKS[0].id : 'may'; loadPack(PACK); }).catch(() => { PACK = 'may'; VOICE = {}; });
  function voicePacks() { return PACKS.concat([{ id: 'may', name: 'Giọng có sẵn của máy' + (viVoice ? ' (' + viVoice.name.replace(/Microsoft |Google |Online \(Natural\)|- Vietnamese \(Vietnam\)/g, '').trim() + ')' : '') }]); }
  function setVoicePack(id) { try { localStorage.setItem('cba_voicepack', id); } catch (e) {} stopVoice(); return loadPack(id); }
  const vkey = (t) => t.normalize('NFC').replace(/\s+/g, ' ').trim();
  function hasVoiceFile(text) { return !!(VOICE && VOICE[vkey(text)]); }
  /* đọc một câu, trả về Promise khi đọc xong (dùng để tụng từng câu theo nhịp mõ) */
  function say(text, opts = {}) {
    return new Promise((done) => {
      const est = () => setTimeout(done, Math.max(1500, text.length * 85));
      if (!st.storyTtsOn && !opts.force) return est();
      const f = VOICE && VOICE[vkey(text)];
      if (f) {
        if (voiceEl) voiceEl.pause();
        voiceEl = new Audio('audio/voice/' + PACK + '/' + f); voiceEl.volume = Math.min(1, (opts.vol || 1));
        voiceEl.onended = () => done(); voiceEl.onerror = () => est();
        st.duck = 0.35; applyVolume(); voiceEl.addEventListener('ended', () => { st.duck = 1; applyVolume(); });
        voiceEl.play().catch(() => est()); return;
      }
      if (!window.speechSynthesis) return est();
      if (!viVoice) pickVoice(); if (!viVoice) return est();
      const u = new SpeechSynthesisUtterance(text); u.lang = viVoice.lang || 'vi-VN'; u.voice = viVoice; u.rate = opts.rate || 0.92; u.pitch = opts.pitch || 0.9;
      u.onend = () => { st.duck = 1; applyVolume(); done(); }; u.onerror = () => done();
      if (opts.force && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();   // Chrome hay kẹt hàng đợi → giọng im
      if (speechSynthesis.paused) speechSynthesis.resume();
      const guard = setTimeout(() => { done(); }, Math.max(4000, text.length * 160));   // không chờ mãi nếu trình duyệt không báo kết thúc
      u.onend = () => { clearTimeout(guard); st.duck = 1; applyVolume(); done(); }; u.onerror = () => { clearTimeout(guard); done(); };
      st.duck = 0.35; applyVolume(); speechSynthesis.speak(u);
    });
  }
  function stopVoice() { if (voiceEl) voiceEl.pause(); if (window.speechSynthesis) speechSynthesis.cancel(); }
  function setVoice(name) { try { localStorage.setItem('cba_voice', name); } catch (e) {} pickVoice(); }

  /* ---------- cài đặt ---------- */
  function set(opts) {
    Object.assign(st, opts);
    if ('musicOn' in opts && !opts.musicOn) { /* giữ trạng thái phát nhưng tắt tiếng */ }
    if ('mode' in opts) el.loop = st.mode === 'loop';
    applyVolume(); onChange();
  }

  function state() {
    const tr = cur(); const lines = textOf(tr);
    return {
      musicOn: st.musicOn, sfxOn: st.sfxOn, ttsOn: st.ttsOn, storyTtsOn: st.storyTtsOn, musicVol: st.musicVol, sfxVol: st.sfxVol,
      mode: st.mode, playing: st.playing, index: st.index,
      title: tr ? tr.title : '', category: tr ? tr.category : '', type: tr ? tr.type : '',
      fallback: !!(tr && st.missing[tr.id]),
      line: st.lineIdx >= 0 ? lines[st.lineIdx] : '', lineIdx: st.lineIdx, lineCount: lines.length,
      nextLine: st.lineIdx >= 0 && st.lineIdx + 1 < lines.length ? lines[st.lineIdx + 1] : '',
      missing: Object.keys(st.missing), unlocked: unlocked(),
      playlist: list().map(t => ({ title: t.title, type: t.type, category: t.category, missing: !!st.missing[t.id] })),
      hasVoice: !!viVoice
    };
  }

  return {
    ensure, unlocked, unlock, mo, bell, bigBell, smallBell, khanh, speak,
    play, next, prev, toggle, playCategory, stop: () => { stopAll(); onChange(); },
    set, state, scanFolder, addTracks, setTone, playTemple, setTempleTrack, ambience, voices, setVoice, voiceName: () => viVoice ? viVoice.name : '', say, stopVoice, hasVoiceFile, loadSamples, voicePacks, setVoicePack, voicePack: () => PACK,
    onChange: fn => { onChange = fn; }, onBeat: fn => { onBeat = fn; }, onComplete: fn => { onComplete = fn; }
  };
})();
