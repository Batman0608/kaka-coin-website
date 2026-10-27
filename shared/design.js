// Thiết kế ảnh bài đăng (1080×1080) vẽ bằng Canvas 2D từ bản thiết kế JSON của nhân viên nội dung.
// Nhiều bố cục × nhiều bảng màu; nhân viên chọn, hệ thống không cho lặp lại tổ hợp vừa dùng.
// Chạy được trong trình duyệt (bản trải nghiệm) và trong Playwright (bản server).

export const LAYOUTS = {
  cheo: 'Dải chéo lớn, tiêu đề đậm',
  'chia-doi': 'Chia đôi trái/phải: tiêu đề và danh sách ý',
  'khung-vien': 'Khung viền dày, chữ ở giữa',
  'tieu-diem': 'Vòng tròn tiêu điểm với nhãn nổi bật',
  'so-lon': 'Một con số / giá rất lớn làm điểm nhấn',
  'dai-bang': 'Các dải ngang xếp tầng như bảng hiệu',
};
export const PALETTES = {
  'vang-den': ['#111318', '#f2b705', '#ffffff'],
  'do-trang': ['#b3121b', '#ffffff', '#ffd23f'],
  'xanh-cam': ['#0b3c5d', '#ff7a00', '#ffffff'],
  'xanh-la': ['#0f5132', '#c6f432', '#ffffff'],
  'tim-hong': ['#2b1055', '#ff4fa3', '#ffffff'],
  'xam-thep': ['#2f3640', '#00d2d3', '#f5f6fa'],
  'kem-nau': ['#f6efe3', '#7a3e00', '#1d1d1d'],
};

const str = (v, n) => String(v ?? '').trim().slice(0, n);
export function normalizeDesign(d = {}) {
  return {
    boCuc: LAYOUTS[d.boCuc] ? d.boCuc : 'cheo',
    bangMau: PALETTES[d.bangMau] ? d.bangMau : 'vang-den',
    tieuDe: str(d.tieuDe, 70) || 'Phụ tùng chính hãng',
    phuDe: str(d.phuDe, 110),
    nhan: str(d.nhan, 24),
    chiTiet: (Array.isArray(d.chiTiet) ? d.chiTiet : []).map((x) => str(x, 60)).filter(Boolean).slice(0, 4),
    keuGoi: str(d.keuGoi, 40),
    thuongHieu: str(d.thuongHieu, 40),
  };
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
function text(ctx, s, x, y, { size = 60, weight = 800, color = '#fff', maxW = 900, align = 'left', lh = 1.15, maxLines = 4 } = {}) {
  ctx.font = `${weight} ${size}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const lines = wrap(ctx, s, maxW).slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh));
  return y + lines.length * size * lh;
}
function pill(ctx, s, x, y, bg, fg, size = 40) {
  if (!s) return;
  ctx.font = `800 ${size}px "Be Vietnam Pro", Arial, sans-serif`;
  const w = ctx.measureText(s).width + size * 1.2;
  const h = size * 1.6;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, h / 2) : ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(s, x + size * 0.6, y + h / 2 + 2);
}
function bullets(ctx, items, x, y, color, accent, maxW, size = 40) {
  for (const it of items) {
    ctx.fillStyle = accent;
    ctx.fillRect(x, y + size * 0.35, size * 0.45, size * 0.45);
    y = text(ctx, it, x + size * 0.8, y, { size, weight: 600, color, maxW: maxW - size, maxLines: 2 }) + size * 0.35;
  }
  return y;
}

/** Vẽ thiết kế lên canvas 1080×1080. */
export function drawDesign(canvas, spec) {
  const d = normalizeDesign(spec);
  const [bg, accent, fg] = PALETTES[d.bangMau];
  const W = 1080;
  canvas.width = W; canvas.height = W;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, W);
  const brand = () => { if (d.thuongHieu) text(ctx, d.thuongHieu.toUpperCase(), 60, 990, { size: 34, weight: 700, color: fg, maxW: 600, maxLines: 1 }); };
  const cta = (y, inv = false) => pill(ctx, d.keuGoi, 60, y, inv ? fg : accent, inv ? bg : bg, 42);

  if (d.boCuc === 'cheo') {
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.moveTo(0, 620); ctx.lineTo(W, 380); ctx.lineTo(W, 620); ctx.lineTo(0, 860); ctx.closePath(); ctx.fill();
    pill(ctx, d.nhan, 60, 70, accent, bg, 38);
    let y = text(ctx, d.tieuDe.toUpperCase(), 60, 170, { size: 92, color: fg, maxLines: 3 });
    text(ctx, d.phuDe, 60, y + 20, { size: 40, weight: 500, color: fg, maxW: 880, maxLines: 2 });
    bullets(ctx, d.chiTiet.slice(0, 2), 560, 545, bg, bg, 460, 32);
    cta(900, true); brand();
  } else if (d.boCuc === 'chia-doi') {
    ctx.fillStyle = accent; ctx.fillRect(540, 0, 540, W);
    pill(ctx, d.nhan, 50, 60, accent, bg, 34);
    const y = text(ctx, d.tieuDe, 50, 160, { size: 78, color: fg, maxW: 450, maxLines: 5 });
    text(ctx, d.phuDe, 50, y + 20, { size: 36, weight: 500, color: fg, maxW: 450, maxLines: 4 });
    bullets(ctx, d.chiTiet, 590, 160, bg, bg, 440, 42);
    cta(890); brand();
  } else if (d.boCuc === 'khung-vien') {
    ctx.strokeStyle = accent; ctx.lineWidth = 36; ctx.strokeRect(54, 54, W - 108, W - 108);
    ctx.lineWidth = 6; ctx.strokeRect(120, 120, W - 240, W - 240);
    if (d.nhan) text(ctx, d.nhan.toUpperCase(), W / 2, 180, { size: 40, weight: 800, color: accent, align: 'center', maxW: 760, maxLines: 1 });
    const y = text(ctx, d.tieuDe, W / 2, 280, { size: 86, color: fg, align: 'center', maxW: 760, maxLines: 4 });
    text(ctx, d.phuDe, W / 2, y + 30, { size: 40, weight: 500, color: fg, align: 'center', maxW: 760, maxLines: 3 });
    if (d.keuGoi) text(ctx, `▶ ${d.keuGoi}`, W / 2, 840, { size: 44, color: accent, align: 'center', maxW: 760, maxLines: 1 });
  } else if (d.boCuc === 'tieu-diem') {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(780, 330, 250, 0, Math.PI * 2); ctx.fill();
    if (d.nhan) text(ctx, d.nhan, 780, 290, { size: 64, color: bg, align: 'center', maxW: 420, maxLines: 2 });
    const y = text(ctx, d.tieuDe, 60, 600, { size: 80, color: fg, maxW: 960, maxLines: 2 });
    text(ctx, d.phuDe, 60, y + 16, { size: 38, weight: 500, color: fg, maxW: 960, maxLines: 2 });
    bullets(ctx, d.chiTiet.slice(0, 3), 60, 120, fg, accent, 450, 38);
    cta(900); brand();
  } else if (d.boCuc === 'so-lon') {
    const big = d.nhan || d.chiTiet[0] || d.tieuDe;
    text(ctx, big, W / 2, 140, { size: 210, weight: 900, color: accent, align: 'center', maxW: 980, maxLines: 2, lh: 1 });
    const y = text(ctx, d.tieuDe, W / 2, 560, { size: 72, color: fg, align: 'center', maxW: 960, maxLines: 2 });
    text(ctx, d.phuDe, W / 2, y + 20, { size: 38, weight: 500, color: fg, align: 'center', maxW: 900, maxLines: 2 });
    cta(900); brand();
  } else {
    const rows = [d.nhan || d.thuongHieu, d.tieuDe, ...d.chiTiet.slice(0, 2)].filter(Boolean);
    rows.forEach((r, i) => {
      const y = 90 + i * 210;
      ctx.fillStyle = i % 2 ? fg : accent;
      ctx.fillRect(i % 2 ? 120 : 0, y, W - 120, 170);
      text(ctx, r, i % 2 ? 160 : 60, y + 40, { size: i === 1 ? 72 : 52, color: bg, maxW: 860, maxLines: 2 });
    });
    if (d.phuDe) text(ctx, d.phuDe, 60, 90 + rows.length * 210, { size: 38, weight: 500, color: fg, maxW: 960, maxLines: 2 });
    cta(910);
  }
  return canvas;
}
