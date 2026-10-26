// Nhạc nền tự tạo bằng Web Audio — không cần tải file, chạy được cả khi không có mạng ngoài.
// Chỉ phát sau khi người dùng bấm (trình duyệt chặn tự phát âm thanh).

export const MUSIC_PRESETS = [
  { id: 'lofi', label: 'Lo-fi Giờ Nghỉ' },
  { id: 'focus', label: 'Tập trung làm việc' },
  { id: 'rain', label: 'Mưa nhẹ Sài Gòn' },
];

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export function createMusic() {
  let ctx = null, master = null, timer = null, nodes = [], playing = null;

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.0;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    return ctx;
  }

  function noiseBuffer(seconds, brown = false) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  function loopNoise({ brown, freq, type = 'lowpass', gain, q = 0.7 }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(3, brown);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(master);
    src.start();
    nodes.push(src);
  }

  // Một nốt piano điện êm: hai dao động + lọc thấp + bao biên dài.
  function keys(note, when, dur, vel = 0.12, cutoff = 1800) {
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = cutoff;
    for (const [type, det, v] of [['triangle', 0, 1], ['sine', 7, 0.6]]) {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = midi(note); o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = v;
      o.connect(og).connect(f);
      o.start(when); o.stop(when + dur + 0.6);
    }
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vel, when + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0008, when + dur + 0.5);
    f.connect(g).connect(master);
  }

  function kick(when) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, when);
    o.frequency.exponentialRampToValueAtTime(42, when + 0.18);
    g.gain.setValueAtTime(0.32, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
    o.connect(g).connect(master); o.start(when); o.stop(when + 0.32);
  }
  function hat(when, v = 0.05) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.06);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
    const g = ctx.createGain(); g.gain.setValueAtTime(v, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
    s.connect(f).connect(g).connect(master); s.start(when);
  }

  // Vòng hợp âm Fmaj7 – Em7 – Dm7 – Cmaj7 (lo-fi) hoặc Am9 – Fmaj7 (tập trung).
  const PROG = {
    lofi: { bpm: 72, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], drums: true, cutoff: 1500 },
    focus: { bpm: 60, chords: [[45, 52, 55, 59, 60], [41, 48, 52, 57]], drums: false, cutoff: 1100 },
  };

  function scheduleBars(kind) {
    const p = PROG[kind];
    const beat = 60 / p.bpm;
    let bar = 0;
    let next = ctx.currentTime + 0.1;
    const tick = () => {
      while (next < ctx.currentTime + 1.2) {
        const chord = p.chords[bar % p.chords.length];
        chord.forEach((n, i) => keys(n, next + i * 0.025, beat * 3.6, 0.07, p.cutoff));
        if (kind === 'lofi') keys(chord[3] + 12, next + beat * 2.5, beat, 0.05, 2200);
        if (p.drums) {
          for (let b = 0; b < 4; b++) {
            const t = next + b * beat;
            if (b === 0) kick(t);
            if (b === 2) kick(t + beat * 0.5);
            hat(t + beat * 0.5 + (b % 2 ? 0.03 : 0));
          }
        }
        next += beat * 4;
        bar++;
      }
    };
    tick();
    timer = setInterval(tick, 300);
  }

  async function play(kind) {
    ensure();
    await ctx.resume();
    stop(true);
    playing = kind;
    if (kind === 'rain') {
      loopNoise({ brown: false, freq: 1200, type: 'bandpass', gain: 0.22, q: 0.4 });
      loopNoise({ brown: true, freq: 500, gain: 0.5 });
    } else {
      loopNoise({ brown: false, freq: 3200, type: 'bandpass', gain: 0.012, q: 0.8 }); // tiếng đĩa than
      if (kind === 'focus') loopNoise({ brown: true, freq: 380, gain: 0.25 });
      scheduleBars(kind);
    }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.75, ctx.currentTime, 0.4);
  }

  function stop(immediate = false) {
    clearInterval(timer); timer = null;
    if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, immediate ? 0.01 : 0.25);
    const old = nodes; nodes = [];
    setTimeout(() => old.forEach((n) => { try { n.stop(); } catch { /* đã dừng */ } }), immediate ? 30 : 600);
    playing = null;
  }

  return { play, stop, isPlaying: () => !!playing, current: () => playing };
}
