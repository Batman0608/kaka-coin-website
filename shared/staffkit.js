// Cài đặt chi tiết từng nhân sự: đào tạo nhiều mục, hồ sơ hiển thị, lịch tự động, dữ liệu phần mềm, tự học.
// Logic thuần, dùng chung cho server và bản trải nghiệm.

// ---------- Đào tạo nhiều mục ----------
export const TRAINING_FIELDS = [
  ['prompt', 'Prompt riêng', 'Bạn là ai, làm cho ai, mục tiêu chính.'],
  ['skills', 'Kỹ năng chuyên môn', 'Những việc nhân sự giỏi và làm hằng ngày.'],
  ['workGuide', 'Hướng dẫn làm việc', 'Nhiệm vụ và quy trình phụ trách, theo thứ tự.'],
  ['jobDescription', 'Mô tả công việc đầy đủ', 'Phải làm gì, khi nào, ra sản phẩm gì.'],
  ['crossLinks', 'Kết nối chéo với nhân viên khác', 'Nhận việc từ ai, chuyển cho ai, phản biện thế nào.'],
  ['rules', 'Quy tắc đúng / sai phải tuân theo', 'Điều bắt buộc và điều cấm.'],
  ['goodExamples', 'Ví dụ mẫu TỐT', 'Làm thế này là đúng.'],
  ['badExamples', 'Ví dụ mẫu SAI', 'Tránh làm thế này.'],
  ['limits', 'Giới hạn — việc phải chuyển cho chủ', 'Việc không được tự làm.'],
  ['lessons', 'Bài học tự rút ra', 'Hệ thống tự thêm sau mỗi việc; sửa hoặc xoá được.'],
];
const FIELD_KEYS = TRAINING_FIELDS.map(([k]) => k);
const MAX_FIELD = 6000;

export function normalizeTraining(input, fallbackText = '') {
  const t = {};
  const src = input && typeof input === 'object' ? input : {};
  for (const k of FIELD_KEYS) t[k] = String(src[k] ?? '').slice(0, MAX_FIELD).trim();
  if (!FIELD_KEYS.some((k) => t[k]) && fallbackText) t.prompt = String(fallbackText).slice(0, MAX_FIELD).trim();
  return t;
}

// Ghép các mục đào tạo thành đoạn văn đưa vào giao thức suy nghĩ.
export function compileTraining(training) {
  return TRAINING_FIELDS.filter(([k]) => training?.[k]).map(([k, label]) => `[${label}]\n${training[k]}`).join('\n\n');
}

export function trainingFilled(training) {
  return FIELD_KEYS.filter((k) => training?.[k]).length;
}

// Lịch sử: giữ 8 phiên bản gần nhất (kèm ghi chú: tự học hay người dùng sửa).
export function pushHistory(history, version, training, note = 'Người dùng sửa') {
  return [{ version, training, note, at: new Date().toISOString() }, ...(history || []).filter((h) => h.version !== version)].slice(0, 8);
}

// ---------- Hồ sơ ----------
export function validateProfileFull(input) {
  const out = {};
  const s = (v, max) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
  if (input.name !== undefined) {
    out.name = s(input.name, 30);
    if (!out.name) throw new Error('Tên nhân vật không được để trống.');
  }
  if (input.role !== undefined) {
    out.role = s(input.role, 80);
    if (!out.role) throw new Error('Vai trò không được để trống.');
  }
  if (input.shortLabel !== undefined) {
    const v = s(input.shortLabel, 40);
    if (!v) throw new Error('Nhãn trên đầu không được để trống.');
    if (v.split(' ').length > 3 || v.length > 18) throw new Error('Nhãn trên đầu tối đa 3 chữ (18 ký tự).');
    out.shortLabel = v;
  }
  if (input.color !== undefined) {
    if (!/^#[0-9a-f]{6}$/i.test(String(input.color))) throw new Error('Màu không hợp lệ.');
    out.color = String(input.color).toLowerCase();
  }
  if (input.tools !== undefined) out.tools = String(input.tools).trim().slice(0, 600);
  if (input.autoLearn !== undefined) out.autoLearn = input.autoLearn === true || input.autoLearn === 'on' || input.autoLearn === 'true' || input.autoLearn === 1;
  return out;
}

// ---------- Lịch tự động (việc lặp lại mỗi ngày) ----------
export function validateRoutines(list) {
  if (!Array.isArray(list)) throw new Error('Lịch tự động không hợp lệ.');
  if (list.length > 10) throw new Error('Tối đa 10 lịch tự động cho mỗi nhân viên.');
  return list.map((r, i) => {
    const time = String(r.time || '').trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Lịch ${i + 1}: giờ phải dạng HH:MM.`);
    const title = String(r.title || '').trim().slice(0, 160);
    if (!title) throw new Error(`Lịch ${i + 1}: thiếu tên việc.`);
    return {
      id: String(r.id || `R${Date.now().toString(36)}${i}`).slice(0, 40), time, title,
      description: String(r.description || '').trim().slice(0, 2000), enabled: r.enabled !== false && r.enabled !== 'false',
      lastRunDate: r.lastRunDate || null,
    };
  });
}

export const hcmTime = (d = new Date()) => d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
export const hcmToday = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

// Các lịch đến giờ mà hôm nay chưa chạy.
export function dueRoutines(routines, now = new Date()) {
  const t = hcmTime(now), today = hcmToday(now);
  return (routines || []).filter((r) => r.enabled && r.time <= t && r.lastRunDate !== today);
}

// ---------- Dữ liệu phần mềm ----------
export const LINK_KINDS = {
  kiotviet: 'KiotViet (sản phẩm, giá, tồn kho)',
  facebook_page: 'Fanpage Facebook (bài đăng, tương tác)',
  facebook_ads: 'Quảng cáo Facebook (tài khoản quảng cáo)',
  other: 'Phần mềm khác',
};

export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function splitCsvLine(line, sep) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}
const toNum = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null; };

// Nhập dữ liệu dán vào / tải lên: nhận bảng CSV xuất từ KiotViet (Mã hàng, Tên hàng, Giá bán, Tồn kho…);
// không phải bảng thì lưu thành ghi chú từng dòng.
export function parseImport(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 5000);
  if (!lines.length) throw new Error('Không có dữ liệu để nhập.');
  const sep = [',', ';', '\t'].map((c) => [c, (lines[0].match(new RegExp(c === '\t' ? '\\t' : `\\${c}`, 'g')) || []).length]).sort((a, b) => b[1] - a[1])[0];
  if (sep[1] >= 1) {
    const head = splitCsvLine(lines[0], sep[0]).map(fold);
    const find = (...keys) => head.findIndex((h) => keys.some((k) => h.includes(k)));
    const iName = find('ten hang', 'ten san pham', 'ten', 'name', 'product');
    const iCode = find('ma hang', 'ma sp', 'ma', 'code', 'sku');
    const iPrice = find('gia ban', 'gia', 'price');
    const iStock = find('ton kho', 'ton', 'stock', 'so luong');
    const iGroup = find('nhom hang', 'nhom', 'category', 'loai');
    if (iName >= 0) {
      const items = lines.slice(1).map((l) => splitCsvLine(l, sep[0])).filter((c) => c[iName]).map((c) => ({
        ten: c[iName], ma: iCode >= 0 ? c[iCode] : '', gia: iPrice >= 0 ? toNum(c[iPrice]) : null,
        ton: iStock >= 0 ? toNum(c[iStock]) : null, nhom: iGroup >= 0 ? c[iGroup] : '',
      }));
      if (items.length) return { kind: 'products', items };
    }
  }
  return { kind: 'notes', items: lines.map((l) => ({ ghiChu: l.slice(0, 500) })) };
}

// Chọn các dòng dữ liệu liên quan câu hỏi (khớp tên / mã, không dấu) để đưa vào bối cảnh, tránh quá dài.
export function pickRelevant(items, question, limit = 30) {
  if (!items?.length) return [];
  const words = fold(question).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  const scored = items.map((it) => {
    const hay = fold(`${it.ten || ''} ${it.ma || ''} ${it.nhom || ''} ${it.ghiChu || ''} ${it.noiDung || ''}`);
    return [words.reduce((n, w) => n + (hay.includes(w) ? (w.length >= 4 ? 2 : 1) : 0), 0), it];
  });
  const hits = scored.filter(([n]) => n > 0).sort((a, b) => b[0] - a[0]).map(([, it]) => it);
  return (hits.length ? hits : items).slice(0, limit);
}

// Dữ liệu phần mềm của chính nhân viên đưa vào "Dữ kiện thật đã có".
export function softwareFacts(links, dataByLink, question) {
  return links.map((l) => {
    const d = dataByLink[l.id];
    const base = { phanMem: l.softwareName, loai: l.kind || 'other', trangThai: l.status, mucDich: l.purpose || '' };
    if (!d?.items?.length) return { ...base, duLieu: 'chưa cập nhật (chưa đồng bộ hoặc nhập dữ liệu)' };
    return { ...base, capNhatLuc: d.at, tongSoMuc: d.items.length, nguon: d.source || 'đồng bộ', mucLienQuan: pickRelevant(d.items, question) };
  });
}

export function pushLog(logs, action, ok, detail) {
  return [{ at: new Date().toISOString(), action, ok: !!ok, detail: String(detail || '').slice(0, 400) }, ...(logs || [])].slice(0, 30);
}

// ---------- Tự học sau mỗi việc ----------
export const TRAINER_ID = 'STAFF-009'; // Trang — Nhân sự và Hiệu suất

export function learnQuestion(task, outputs, staffList) {
  const people = [...new Set(outputs.map((o) => o.staffId))].map((id) => staffList.find((s) => s.id === id)).filter(Boolean);
  return {
    people,
    question: `RÚT BÀI HỌC ĐÀO TẠO sau việc "${task.title}" (trạng thái: ${task.status}${task.returnReason ? `, bị trả làm lại: ${task.returnReason}` : ''}).
Đọc kết quả từng người và đánh giá của Phúc / người phản biện dưới đây. Với TỪNG nhân viên, viết 1–3 bài học NGẮN, CỤ THỂ, dùng được cho lần sau (làm gì tốt hơn, tránh lỗi gì). Không lặp bài học đã có, không chung chung, không bịa.

${outputs.map((o) => `### ${o.step || 'Kết quả'} — ${o.staffName}\n${String(o.text || o.error || '').slice(0, 1500)}`).join('\n\n')}

Bài học đã có:
${people.map((p) => `- ${p.name}: ${(p.training?.lessons || '').slice(-600) || '(chưa có)'}`).join('\n')}

Chỉ trả về MỘT đối tượng JSON đúng mẫu dưới đây, không thêm chữ nào ngoài JSON.
{"baiHoc":[{"nhanVien":"tên","baiHoc":["..."]}]}`,
  };
}

// Gộp bài học mới vào mục "Bài học tự rút ra": thêm ngày, bỏ trùng, giữ 20 dòng gần nhất.
export function mergeLessons(old, newOnes, taskTitle) {
  const date = hcmToday();
  const lines = String(old || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const seen = new Set(lines.map((l) => fold(l.replace(/^- \[[^\]]*\]\s*/, ''))));
  for (const lesson of newOnes) {
    const t = String(lesson).trim().slice(0, 300);
    if (!t || seen.has(fold(t))) continue;
    seen.add(fold(t));
    lines.push(`- [${date} · ${String(taskTitle).slice(0, 40)}] ${t}`);
  }
  return lines.slice(-20).join('\n');
}

// Đào tạo ban đầu cho văn phòng mới: điền sẵn từ đặc tả để người dùng sửa tiếp.
export function seedTraining(s) {
  return normalizeTraining({
    prompt: `Bạn là ${s.name}, phụ trách ${s.role}. Làm việc chủ động, dựa trên dữ liệu thật của văn phòng và phần mềm được giao, không bịa.`,
    jobDescription: s.responsibilities,
    crossLinks: 'Mọi nhân sự được góp ý và phản biện việc của người khác; ý tưởng của ai tốt thì dùng. Mỗi việc chỉ có một người chốt cuối: Minh chốt rủi ro pháp lý, Hà chốt số liệu tài chính, Phúc chốt hiệu quả tổng thể.',
    rules: 'Không bịa giá, tồn kho, số liệu. Chưa có dữ liệu thì nói rõ là chưa cập nhật.',
    limits: 'Không tự đăng nhập lại khi phiên phần mềm hết hạn — báo người dùng. Không gửi khuyến mại hay nội dung chăm sóc cho khách khi chưa được duyệt.',
  });
}

/**
 * Tự học sau một việc: Trang (Nhân sự & Hiệu suất) đọc kết quả và đánh giá, viết bài học cho từng người.
 * io: { task, outputs, staffList, trainer, think(staff, ctx) → {text}, apply(staffId, lessons) }
 */
export async function runLearning(io) {
  const { people, question } = learnQuestion(io.task, io.outputs, io.staffList);
  const learners = people.filter((p) => p.autoLearn !== false);
  if (!learners.length) return [];
  const r = await io.think(io.trainer, { question });
  const a = r.text.indexOf('{'), b = r.text.lastIndexOf('}');
  let o = null;
  try { o = JSON.parse(r.text.slice(a, b + 1)); } catch { return []; }
  const applied = [];
  for (const entry of Array.isArray(o?.baiHoc) ? o.baiHoc : []) {
    const name = fold(entry.nhanVien);
    const staff = learners.find((p) => fold(p.name) === name) || learners.find((p) => name.includes(fold(p.name)));
    const lessons = (Array.isArray(entry.baiHoc) ? entry.baiHoc : []).map(String).filter(Boolean).slice(0, 3);
    if (staff && lessons.length) { io.apply(staff.id, lessons); applied.push({ staffId: staff.id, lessons }); }
  }
  return applied;
}
