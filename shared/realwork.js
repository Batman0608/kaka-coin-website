// VIỆC LÀM THỰC TẾ — mỗi việc chỉ có MỘT việc cần làm ngay của MỘT người, làm trên link và số liệu thật.
// Không dựng sẵn quy trình, không tranh luận tự động. Giao xong: việc ở trạng thái "Mới giao", một tin giao việc ngắn.
// Việc Fanpage / theo dõi / quảng cáo:
//   Tuấn mở Fanpage thật → ghi số liệu nhìn thấy → nhận xét ĐÚNG trên số liệu đó
//   → An viết 1 bài hoàn chỉnh → mở Fanpage đăng → dán link bài thật
//   → Bình đề xuất ngân sách bằng số cụ thể → BẠN DUYỆT trong thẻ → Bình mở Ads Manager chạy → ghi mã + link chiến dịch → xong.
// Việc khác: một thẻ, một hành động của đúng một người.
// Chặn đúng chỗ: An chưa viết được khi Tuấn chưa ghi số liệu; Bình chưa đề xuất được khi chưa có link bài;
// chưa chạy được quảng cáo khi bạn chưa duyệt ngân sách.

export const ANALYST = 'STAFF-003';
export const CONTENT = 'STAFF-001';
export const ADS = 'STAFF-002';
const cut = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : String(s ?? ''));
const num = (v) => { const n = Number(String(v ?? '').replace(/[^\d]/g, '')); return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null; };

export const isMarketingGoal = (text) => /fan ?page|follow|folow|theo dõi|lượt thích|like|quảng cáo|chạy ads|đăng bài|bài đăng|tăng tương tác/i.test(String(text || ''));

// Việc không phải Marketing: chọn đúng MỘT người theo nội dung việc.
const OWNER_RULES = [
  [/giá|tồn kho|còn hàng|sản phẩm|mã hàng|báo giá|chốt đơn|khách hỏi|bán/i, 'STAFF-004'],
  [/kho|giao hàng|vận chuyển|ship|nhập hàng/i, 'STAFF-005'],
  [/doanh thu|chi phí|lợi nhuận|kế toán|thu chi|công nợ|hoá đơn|hóa đơn/i, 'STAFF-006'],
  [/khách cũ|chăm sóc|cskh|hỏi thăm|phản ánh|khiếu nại|bảo hành/i, 'STAFF-008'],
  [/nhân sự|nhân viên|đào tạo|đánh giá|hiệu suất/i, 'STAFF-009'],
  [/pháp lý|luật|nghị định|thông tư|hợp đồng|rủi ro|lừa đảo|kiểm tra khách/i, 'STAFF-010'],
  [/thị trường|đối thủ|xu hướng|phân tích/i, 'STAFF-003'],
  [/viết bài|nội dung|thiết kế/i, 'STAFF-001'],
];
export function pickOwner(text) {
  for (const [re, id] of OWNER_RULES) if (re.test(text)) return id;
  return 'STAFF-007';
}

export function initReal(title, description = '') {
  const text = `${title}\n${description}`;
  if (isMarketingGoal(text)) return { kind: 'marketing', owner: ANALYST, done: false, log: [] };
  return { kind: 'single', owner: pickOwner(text), done: false, log: [] };
}
export const realTeam = (r) => (r.kind === 'marketing' ? [ANALYST, CONTENT, ADS] : [r.owner]);

// Việc cần làm ngay (duy nhất). staffId: người làm; 'user' = bạn duyệt.
export function currentAction(r) {
  if (r.done) return null;
  if (r.kind === 'single') return { key: 'answer', staffId: r.owner };
  if (!r.metrics) return { key: 'record_metrics', staffId: ANALYST };
  if (!r.analysis) return { key: 'analyze', staffId: ANALYST };
  if (!r.post) return { key: 'write_post', staffId: CONTENT };
  if (!r.postLink) return { key: 'publish', staffId: CONTENT };
  if (!r.budget) return { key: 'propose_budget', staffId: ADS };
  if (!r.budgetApproved) return { key: 'approve_budget', staffId: 'user' };
  if (!r.campaign) return { key: 'run_ads', staffId: ADS };
  return null;
}
export const ACTION_TITLE = {
  record_metrics: 'xem Fanpage và ghi lại số liệu nhìn thấy',
  analyze: 'nhận xét đúng trên số liệu vừa ghi',
  write_post: 'viết 1 bài hoàn chỉnh',
  publish: 'mở Fanpage đăng bài và dán link bài thật',
  propose_budget: 'đề xuất ngân sách quảng cáo bằng số cụ thể',
  approve_budget: 'duyệt ngân sách Bình đề xuất',
  run_ads: 'mở Ads Manager chạy quảng cáo, ghi mã và link chiến dịch',
  answer: 'làm việc này',
};

// ---------- Quy cách bài đăng: không giá, không website, đúng 2 hotline, ghi rõ chưa đăng ----------
const PRICE = /\d[\d.,\s]*\s*(k\b|đ\b|đồng|vnd|vnđ|nghìn|ngàn|triệu|tr\b)|giá\s*(chỉ|từ|:)?\s*\d/i;
const URL = /(https?:\/\/|www\.)\S+|\b[\w-]+\.(com|vn|net|org|shop|store|info|biz)(\/\S*)?\b/i;
const PHONE = /(\+?84|0)[\d.\s-]{8,12}\d/g;
export const normPhone = (s) => String(s || '').replace(/[^\d]/g, '').replace(/^84/, '0');
export function checkPost(text, hotlines) {
  const t = String(text || '');
  const problems = [];
  if (t.trim().length < 120) problems.push('bài quá ngắn');
  if (PRICE.test(t)) problems.push('có ghi giá');
  if (URL.test(t)) problems.push('có website / đường link');
  const phones = [...new Set((t.match(PHONE) || []).map(normPhone))];
  const want = hotlines.map(normPhone);
  if (phones.length !== 2 || !want.every((h) => phones.includes(h))) problems.push(`phải có đúng 2 hotline ${hotlines.join(' và ')}`);
  if (!/chưa đăng/i.test(t)) problems.push('chưa ghi rõ "(Chưa đăng)"');
  return problems;
}
// Sửa chắc chắn đúng quy cách khi bộ não vẫn sót: bỏ dòng có giá / link / số điện thoại lạ, thêm đúng 2 hotline và nhãn chưa đăng.
export function finalizePost(text, hotlines) {
  const lines = String(text || '').split('\n').filter((l) => !PRICE.test(l) && !URL.test(l))
    .map((l) => l.replace(PHONE, (m) => (hotlines.map(normPhone).includes(normPhone(m)) ? m : '')).replace(/(hotline|liên hệ|gọi)\s*[:\-–]?\s*$/i, '').trimEnd())
    .filter((l, i, a) => !(l.trim() === '' && a[i - 1]?.trim() === '') && !/chưa đăng/i.test(l));
  const body = lines.join('\n').trim().replace(/(\n.*hotline.*)+$/i, '');
  const clean = body.replace(PHONE, '').replace(/[ \t]+$/gm, '');
  return `${clean.trim()}\n\nHotline: ${hotlines[0]} – ${hotlines[1]}\n(Chưa đăng)`;
}

// ---------- Câu hỏi cho bộ não (ngắn, một sản phẩm) ----------
export const analyzeQuestion = (task, m) => `Bạn là người phân tích. Người dùng giao: "${task.title}"${task.description ? ` — ${task.description}` : ''}.
Số liệu Fanpage VỪA GHI khi mở trang thật (chỉ được dùng đúng các số này, không thêm số nào khác): ${JSON.stringify({ nguoiTheoDoi: m.followers, luotThichTrang: m.likes, tuongTacBaiGanNhat: m.recent, ghiChu: m.note })}
Viết nhận xét NGẮN (tối đa 6 dòng): trang đang ở đâu so với mục tiêu, cần thêm bao nhiêu, nên đăng kiểu bài gì để kéo người theo dõi. Số nào chưa ghi thì nói "chưa có số".`;

export const postQuestion = (task, r, hotlines, feedback) => `Bạn là người viết nội dung Fanpage. Viết MỘT bài đăng HOÀN CHỈNH để đăng ngay, phục vụ việc: "${task.title}".
Nhận xét của Tuấn (dựa trên số liệu thật): ${r.analysis}
QUY CÁCH BẮT BUỘC: không ghi giá; không ghi website hay đường link; ghi đúng 2 hotline ${hotlines.join(' và ')} (không số nào khác); dòng cuối ghi "(Chưa đăng)".
${feedback ? `Bản trước bị trả lại vì: ${feedback}. Sửa lại.\n` : ''}Chỉ trả về nội dung bài, không giải thích.`;

export const budgetQuestion = (task, r, cap) => `Bạn là người chạy quảng cáo. Bài đã đăng thật: ${r.postLink}
Việc: "${task.title}"${task.description ? ` — ${task.description}` : ''}. Số liệu trang: ${JSON.stringify({ nguoiTheoDoi: r.metrics.followers, luotThichTrang: r.metrics.likes })}. Nhận xét: ${cut(r.analysis, 600)}
${cap ? `Tổng ngân sách người dùng cho phép: ${cap} đồng (nganSachNgay × soNgay không vượt).\n` : ''}Đề xuất ngân sách bằng SỐ CỤ THỂ cho bài này. Chỉ trả về MỘT JSON:
{"nganSachNgay":90000,"soNgay":3,"doiTuong":"25–55 tuổi, chủ xe tải, toàn quốc","mucTieu":"tăng người theo dõi","lyDo":"1–2 câu"}`;

export const singleQuestion = (task, s) => `Người dùng giao cho bạn (${s.name} — ${s.role}): "${task.title}"${task.description ? ` — ${task.description}` : ''}.
Làm NGAY và trả lời ngắn gọn, đúng việc, dùng dữ liệu thật trong "Dữ kiện thật đã có" (phần mềm của bạn). Thiếu dữ liệu thì nói rõ thiếu gì và cần mở phần mềm nào.`;

function parseJson(text) {
  const s = String(text || '');
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

/**
 * Làm một hành động. io: { task, staff(id), think(staff, ctx) → {text, brainLabel}, hotlines(), saveHotlines(list), budgetCap }
 * input: dữ liệu từ thẻ việc. Trả về { message } (một dòng báo vào nhóm). Sai điều kiện → ném lỗi rõ ràng.
 */
export async function applyAction(r, action, input, io) {
  const cur = currentAction(r);
  if (!cur) throw new Error('Việc này đã xong.');
  const log = (staffId, what) => r.log.push({ at: new Date().toISOString(), staffId, what: cut(what, 300) });
  // Chặn đúng chỗ, kể cả khi gọi thẳng API.
  if (action === 'write_post' && !r.metrics) throw new Error('Chưa viết được: Tuấn chưa ghi số liệu Fanpage.');
  if (action === 'propose_budget' && !r.postLink) throw new Error('Chưa đề xuất được: chưa có link bài đã đăng.');
  if (action === 'run_ads' && !r.budgetApproved) throw new Error('Chưa chạy được quảng cáo: bạn chưa duyệt ngân sách.');
  const redo = (action === 'write_post' && cur.key === 'publish') || (action === 'propose_budget' && cur.key === 'approve_budget');
  if (action !== cur.key && !redo) throw new Error(`Bây giờ là lượt: ${ACTION_TITLE[cur.key]}.`);

  if (action === 'record_metrics') {
    const m = { followers: num(input.followers), likes: num(input.likes), recent: cut(input.recent, 200).trim() || null, note: cut(input.note, 300).trim() || null, at: new Date().toISOString(), source: cut(input.source || 'Mở Fanpage thật và ghi lại', 120) };
    if (m.followers === null && m.likes === null) throw new Error('Ghi ít nhất số người theo dõi hoặc số lượt thích trang nhìn thấy trên Fanpage.');
    r.metrics = m;
    log(ANALYST, `Ghi số liệu Fanpage: ${m.followers ?? '—'} người theo dõi, ${m.likes ?? '—'} lượt thích`);
    return { message: `Tuấn đã ghi số liệu Fanpage: ${m.followers ?? '—'} người theo dõi, ${m.likes ?? '—'} lượt thích.` };
  }
  if (action === 'analyze') {
    const res = await io.think(io.staff(ANALYST), { question: analyzeQuestion(io.task, r.metrics) });
    r.analysis = res.text.trim(); r.analysisLabel = res.brainLabel;
    log(ANALYST, 'Nhận xét trên số liệu vừa ghi');
    return { message: `Tuấn nhận xét: ${cut(r.analysis, 200)}` };
  }
  if (action === 'write_post') {
    let hotlines = io.hotlines();
    if (input.hotline1 || input.hotline2) {
      hotlines = [cut(input.hotline1, 20).trim(), cut(input.hotline2, 20).trim()];
      if (hotlines.some((h) => normPhone(h).length < 9)) throw new Error('Nhập đúng 2 số hotline.');
      await io.saveHotlines(hotlines);
    }
    if (hotlines.length !== 2) throw new Error('Cần 2 số hotline để ghi vào bài: nhập ngay trong thẻ việc.');
    let text = ''; let feedback = input.feedback ? `người dùng góp ý: ${cut(input.feedback, 300)}` : '';
    let label = null;
    for (let i = 0; i < 2; i++) {
      const res = await io.think(io.staff(CONTENT), { question: postQuestion(io.task, r, hotlines, feedback) });
      text = res.text.trim(); label = res.brainLabel;
      const p = checkPost(text, hotlines);
      if (!p.length) break;
      feedback = p.join(', ');
    }
    if (checkPost(text, hotlines).length) text = finalizePost(text, hotlines);
    r.post = { text, at: new Date().toISOString(), brainLabel: label };
    r.postLink = null;
    log(CONTENT, 'Viết xong 1 bài (chưa đăng)');
    return { message: `An viết xong 1 bài, chờ đăng lên Fanpage.` };
  }
  if (action === 'publish') {
    const link = String(input.postLink || '').trim();
    if (!/^https:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.com|fb\.watch)\//i.test(link)) throw new Error('Dán link bài thật trên Facebook (bắt đầu bằng https://facebook.com/…).');
    r.postLink = link;
    r.post.text = r.post.text.replace(/\n?\(Chưa đăng\)\s*$/i, '').trim();
    log(CONTENT, `Đã đăng: ${link}`);
    return { message: `An đã đăng bài lên Fanpage: ${link}` };
  }
  if (action === 'propose_budget') {
    const res = await io.think(io.staff(ADS), { question: budgetQuestion(io.task, r, io.budgetCap) });
    const o = parseJson(res.text) || {};
    let perDay = num(o.nganSachNgay) || 0; const days = Math.min(30, Math.max(1, num(o.soNgay) || 1));
    if (!perDay) throw new Error(`Bình chưa đưa ra số ngân sách cụ thể (trả lời: ${cut(res.text, 200)}).`);
    if (io.budgetCap && perDay * days > io.budgetCap) perDay = Math.floor(io.budgetCap / days / 1000) * 1000;
    r.budget = { perDay, days, total: perDay * days, target: cut(o.doiTuong, 200), goal: cut(o.mucTieu, 200), reason: cut(o.lyDo, 400), brainLabel: res.brainLabel, note: input.feedback ? cut(input.feedback, 300) : null };
    r.budgetApproved = false;
    log(ADS, `Đề xuất ${perDay.toLocaleString('vi-VN')} đ/ngày × ${days} ngày`);
    return { message: `Bình đề xuất quảng cáo ${perDay.toLocaleString('vi-VN')} đ/ngày × ${days} ngày = ${(perDay * days).toLocaleString('vi-VN')} đ — chờ bạn duyệt.` };
  }
  if (action === 'approve_budget') {
    r.budgetApproved = true;
    log('user', `Duyệt ${r.budget.perDay.toLocaleString('vi-VN')} đ/ngày × ${r.budget.days} ngày`);
    return { message: `Bạn đã duyệt ngân sách. Bình mở Ads Manager để chạy.` };
  }
  if (action === 'run_ads') {
    const id = cut(input.campaignId, 60).trim();
    const link = String(input.campaignLink || '').trim();
    if (!/^[\w-]{4,}$/.test(id)) throw new Error('Ghi mã chiến dịch thấy trong Ads Manager.');
    if (link && !/^https:\/\/([\w-]+\.)?facebook\.com\//i.test(link)) throw new Error('Link chiến dịch phải là link Facebook (adsmanager.facebook.com…).');
    r.campaign = { id, link: link || null, at: new Date().toISOString() };
    r.done = true;
    log(ADS, `Chạy quảng cáo, mã chiến dịch ${id}`);
    return { message: `Bình đã chạy quảng cáo, mã chiến dịch ${id}${link ? ` (${link})` : ''}. Việc xong.` };
  }
  if (action === 'answer') {
    const s = io.staff(r.owner);
    const res = await io.think(s, { question: singleQuestion(io.task, s) });
    r.answer = { text: res.text.trim(), brainLabel: res.brainLabel, at: new Date().toISOString() };
    r.done = true;
    log(r.owner, 'Làm xong');
    return { message: `${s.name}: ${cut(r.answer.text, 200)}` };
  }
  throw new Error('Hành động không hợp lệ.');
}
