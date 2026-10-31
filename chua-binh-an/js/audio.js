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
    musicOn: true, sfxOn: true, ttsOn: false,
    musicVol: 0.55, sfxVol: 0.8,
    index: 0, playing: false, mode: 'next',   // next | loop | shuffle
    lineIdx: -1, missing: {},
    duck: 1
  };
  let onChange = () => {};
  let onBeat = () => {};

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

  /* Tiếng mõ gỗ: "cốc" */
  function mo(vol = 1, when = 0) {
    if (!ensure() || !st.sfxOn) return;
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
  const bigBell = (when = 0) => bell(98, 9, 0.85, when);
  const smallBell = (when = 0) => bell(520, 3.5, 0.45, when);
  const khanh = (when = 0) => bell(330, 5, 0.5, when);

  function duckFor(sec) {
    st.duck = 0.55; applyVolume();
    clearTimeout(duckFor._t);
    duckFor._t = setTimeout(() => { st.duck = 1; applyVolume(); }, Math.min(sec, 4) * 1000);
  }

  /* ---------- nhạc thiền tổng hợp ---------- */
  function startPad() {
    if (!ensure() || pad) return;
    const notes = [73.42, 110, 146.83, 220, 293.66];   // Rê – La ngũ cung
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
    const scale = [293.66, 329.63, 440, 493.88, 587.33, 659.25];
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
      mo(beat % 4 === 0 ? 1 : 0.65);
      onBeat();
      beat++;
      if (lines.length && beat % (tr.beatsPerLine || 8) === 0) {
        const n = st.lineIdx + 1;
        if (n >= lines.length) { if (st.mode === 'loop') setLine(0); else next(); return; }
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
  el.addEventListener('ended', () => { if (st.mode !== 'loop') next(); });

  function next() {
    if (st.mode === 'shuffle') play(Math.floor(Math.random() * list().length));
    else play(st.index + 1);
  }
  function prev() { play(st.index - 1); }
  function toggle() {
    if (st.playing) { stopAll(); onChange(); }
    else play();
  }
  function playCategory(cat) {
    const ok = list().map((t, i) => ({ t, i })).filter(x => x.t.category === cat && !st.missing[x.t.id]);
    // ưu tiên file thật nếu có, nếu không thì bài tổng hợp
    const pick = ok.find(x => x.t.type === 'file') || ok[0];
    if (pick) play(pick.i);
  }

  /* ---------- đọc giọng nói ---------- */
  let viVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    viVoice = vs.find(v => /^vi/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text) {
    if (!st.ttsOn || !window.speechSynthesis) return;
    if (speechSynthesis.pending) return;        // tránh dồn hàng đợi khi quà dồn dập
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN'; if (viVoice) u.voice = viVoice;
    u.rate = 0.95; u.pitch = 1;
    u.onstart = () => { st.duck = 0.35; applyVolume(); };
    u.onend = () => { st.duck = 1; applyVolume(); };
    speechSynthesis.speak(u);
  }

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
      musicOn: st.musicOn, sfxOn: st.sfxOn, ttsOn: st.ttsOn, musicVol: st.musicVol, sfxVol: st.sfxVol,
      mode: st.mode, playing: st.playing, index: st.index,
      title: tr ? tr.title : '', category: tr ? tr.category : '', type: tr ? tr.type : '',
      fallback: !!(tr && st.missing[tr.id]),
      line: st.lineIdx >= 0 ? lines[st.lineIdx] : '', lineIdx: st.lineIdx, lineCount: lines.length,
      nextLine: st.lineIdx >= 0 && st.lineIdx + 1 < lines.length ? lines[st.lineIdx + 1] : '',
      missing: Object.keys(st.missing), unlocked: unlocked(),
      hasVoice: !!viVoice
    };
  }

  return {
    ensure, unlocked, mo, bell, bigBell, smallBell, khanh, speak,
    play, next, prev, toggle, playCategory, stop: () => { stopAll(); onChange(); },
    set, state,
    onChange: fn => { onChange = fn; }, onBeat: fn => { onBeat = fn; }
  };
})();
