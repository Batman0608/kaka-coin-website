// FANPAGE TỰ VẬN HÀNH — ba người phụ trách như người thật, lặp lại liên tục:
//  - An (Nội dung): tự làm bài + thiết kế ảnh (không bài nào giống bài nào), gửi lên nhóm chat, tự đăng lên Fanpage.
//  - Tuấn (Phân tích): định kỳ đọc số liệu Fanpage thật, so với lần trước, khuyên An và Bình điều chỉnh.
//  - Bình (Quảng cáo): chịu trách nhiệm tăng trưởng trang. Phân tích số liệu thật → kế hoạch + ngân sách tốt nhất →
//    CHỈ chạy khi người dùng bấm duyệt. Tự chia sẻ bài hay vào các nhóm được phép.
// Các hàm ở đây không phụ thuộc nơi chạy: server / bản trải nghiệm truyền vào io (bộ não, lưu trữ, đăng bài, đọc số liệu…).
import { LAYOUTS, PALETTES, normalizeDesign } from './design.js';

export const CONTENT_ID = 'STAFF-001';
export const ADS_ID = 'STAFF-002';
export const ANALYST_ID = 'STAFF-003';
export const CYCLES = {
  content: 'An làm bài + thiết kế ảnh và tự đăng',
  analyst: 'Tuấn kiểm tra số liệu Fanpage và đưa lời khuyên',
  ads: 'Bình phân tích và đề xuất kế hoạch quảng cáo (chờ bạn duyệt)',
  share: 'Bình chia sẻ bài hay vào các nhóm',
};

const cut = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : String(s ?? ''));
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_OPS = {
  enabled: false, fanpageLinkId: null, adsLinkId: null,
  contentTimes: ['09:00', '19:30'], analystEveryHours: 4, adsTime: '10:00', shareTime: '20:30',
  shareMaxPerDay: 3, groups: [], dailyBudgetCap: 300000, brand: '',
  lastRun: { content: {}, analyst: null, ads: null, share: null },
};

export function validateOps(b = {}, cur = DEFAULT_OPS) {
  const o = { ...DEFAULT_OPS, ...cur, lastRun: { ...DEFAULT_OPS.lastRun, ...(cur.lastRun || {}) } };
  if (b.enabled !== undefined) o.enabled = !!b.enabled;
  for (const k of ['fanpageLinkId', 'adsLinkId']) if (b[k] !== undefined) o[k] = b[k] ? String(b[k]) : null;
  if (b.contentTimes !== undefined) {
    const list = (Array.isArray(b.contentTimes) ? b.contentTimes : String(b.contentTimes).split(/[,\s]+/)).map((x) => String(x).trim()).filter(Boolean);
    if (list.length > 6 || list.some((t) => !TIME.test(t))) throw new Error('Giờ đăng bài phải dạng HH:MM, tối đa 6 giờ mỗi ngày.');
    o.contentTimes = [...new Set(list)].sort();
  }
  for (const k of ['adsTime', 'shareTime']) if (b[k] !== undefined) { if (!TIME.test(b[k])) throw new Error('Giờ phải dạng HH:MM.'); o[k] = b[k]; }
  if (b.analystEveryHours !== undefined) { const n = Number(b.analystEveryHours); if (!(n >= 1 && n <= 24)) throw new Error('Tuấn kiểm tra mỗi 1–24 giờ.'); o.analystEveryHours = n; }
  if (b.shareMaxPerDay !== undefined) { const n = Number(b.shareMaxPerDay); if (!(n >= 0 && n <= 10)) throw new Error('Chia sẻ nhóm tối đa 10 lượt mỗi ngày.'); o.shareMaxPerDay = n; }
  if (b.dailyBudgetCap !== undefined) { const n = Math.round(Number(b.dailyBudgetCap)); if (!(n >= 0)) throw new Error('Trần ngân sách không hợp lệ.'); o.dailyBudgetCap = n; }
  if (b.brand !== undefined) o.brand = String(b.brand).trim().slice(0, 40);
  if (b.groups !== undefined) {
    const lines = Array.isArray(b.groups) ? b.groups : String(b.groups).split('\n');
    o.groups = lines.map((g) => (typeof g === 'string' ? g : g.url)).map((u) => String(u || '').trim()).filter(Boolean).slice(0, 20)
      .map((url) => { if (!/^https?:\/\//i.test(url)) throw new Error(`Địa chỉ nhóm phải bắt đầu bằng https:// (${url})`); return { url }; });
  }
  return o;
}

const hcm = (d) => new Date(d.getTime() + 7 * 3600000).toISOString();
const hcmDay = (d) => hcm(d).slice(0, 10);
const hcmHM = (d) => hcm(d).slice(11, 16);

// Chu kỳ đến giờ chạy (giờ Việt Nam). Mỗi giờ đăng bài chạy một lần mỗi ngày.
export function dueCycles(ops, now = new Date()) {
  if (!ops?.enabled || !ops.fanpageLinkId) return [];
  const day = hcmDay(now);
  const hm = hcmHM(now);
  const lr = ops.lastRun || {};
  const out = [];
  const slot = (ops.contentTimes || []).filter((t) => t <= hm).pop();
  if (slot && lr.content?.[slot] !== day) out.push({ cycle: 'content', slot });
  if (!lr.analyst || now - Date.parse(lr.analyst) >= ops.analystEveryHours * 3600000) out.push({ cycle: 'analyst' });
  if (ops.adsTime <= hm && lr.ads !== day) out.push({ cycle: 'ads' });
  if (ops.groups?.length && ops.shareMaxPerDay > 0 && ops.shareTime <= hm && lr.share !== day) out.push({ cycle: 'share' });
  return out;
}
export function markRun(ops, cycle, slot, now = new Date()) {
  ops.lastRun ||= { content: {} };
  if (cycle === 'content') ops.lastRun.content = { ...(ops.lastRun.content || {}), [slot || 'tay']: hcmDay(now) };
  else if (cycle === 'analyst') ops.lastRun.analyst = now.toISOString();
  else ops.lastRun[cycle] = hcmDay(now);
}

// ---------- Không cho bài sau giống bài trước ----------
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
function shingles(s) {
  const w = fold(s).split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return out;
}
export function similarity(a, b) {
  const A = shingles(a); const B = shingles(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return n / Math.min(A.size, B.size);
}
// Trả về lý do nếu bài mới quá giống bài cũ (chữ, tiêu đề, hoặc lặp lại bố cục + màu của 3 bài gần nhất).
export function tooSimilar(draft, posts) {
  for (const p of posts.slice(0, 20)) {
    const s = similarity(draft.noiDung, p.text);
    if (s >= 0.45) return `Nội dung giống bài "${cut(p.design?.tieuDe || p.text, 50)}" (${Math.round(s * 100)}% cụm từ trùng). Viết góc nhìn khác hẳn.`;
    if (fold(draft.thietKe.tieuDe).trim() && fold(draft.thietKe.tieuDe).trim() === fold(p.design?.tieuDe).trim()) return `Tiêu đề ảnh trùng bài trước: "${p.design.tieuDe}".`;
  }
  const recent = posts.slice(0, 3).map((p) => `${p.design?.boCuc}|${p.design?.bangMau}`);
  if (recent.includes(`${draft.thietKe.boCuc}|${draft.thietKe.bangMau}`)) return `Bố cục "${draft.thietKe.boCuc}" + màu "${draft.thietKe.bangMau}" vừa dùng trong 3 bài gần nhất — chọn tổ hợp khác.`;
  return null;
}

export function parseJson(text) {
  const s = String(text || '');
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}
const ONLY_JSON = 'Chỉ trả về MỘT đối tượng JSON đúng mẫu, không thêm chữ nào khác.';

// ---------- An: làm bài + thiết kế ----------
export function contentQuestion({ ops, posts, advice, feedback = '' }) {
  return `NHIỆM VỤ THƯỜNG TRỰC: bạn phụ trách nội dung Fanpage${ops.brand ? ` "${ops.brand}"` : ''}. Làm MỘT bài đăng mới hoàn chỉnh (bài quảng cáo / giới thiệu / mẹo dùng sản phẩm…) kèm bản thiết kế ảnh.
Dùng sản phẩm, giá, tồn kho THẬT trong "Dữ kiện thật đã có" (phanMemCuaToi) nếu có; không bịa giá.
Bài và ảnh KHÔNG được giống các bài gần đây (khác chủ đề hoặc góc nhìn, khác tiêu đề, khác bố cục + bảng màu).
Các bài gần đây: ${JSON.stringify(posts.slice(0, 12).map((p) => ({ luc: p.createdAt, chuDe: p.topic, tieuDeAnh: p.design?.tieuDe, boCuc: p.design?.boCuc, bangMau: p.design?.bangMau, tuongTac: p.stats || null, doan: cut(p.text, 160) })))}
Lời khuyên mới nhất của Tuấn (phân tích) cho bạn: ${JSON.stringify(advice.slice(0, 3).map((a) => cut(a.text, 600)))}
${feedback ? `BẢN TRƯỚC BỊ TRẢ LẠI: ${feedback}\n` : ''}Bố cục được chọn: ${JSON.stringify(LAYOUTS)}
Bảng màu được chọn: ${JSON.stringify(Object.keys(PALETTES))}
${ONLY_JSON}
{"chuDe":"...","noiDung":"bài đăng hoàn chỉnh (mở đầu cuốn hút, thông tin, kêu gọi hành động)","hashtag":["#..."],"thietKe":{"boCuc":"cheo","bangMau":"vang-den","tieuDe":"≤ 8 chữ","phuDe":"...","nhan":"nhãn / giá nổi bật","chiTiet":["ý 1","ý 2","ý 3"],"keuGoi":"Nhắn tin ngay"},"khacBaiTruoc":"khác bài trước ở điểm nào"}`;
}

/**
 * io: { ops, staff, think, posts(), advice(toId), render(spec) → dataUrl|null, publish({text, image}) → {ok, message, url?, fbPostId?},
 *       savePost(post) → post, updatePost(id, fields), groupMessage(staffId, text, postId?) }
 */
export async function runContentCycle(io) {
  const posts = await io.posts();
  const advice = await io.advice(CONTENT_ID);
  let feedback = '';
  let draft = null;
  let brainLabel = null;
  for (let i = 0; i < 3; i++) {
    const r = await io.think(io.staff, { question: contentQuestion({ ops: io.ops, posts, advice, feedback }) });
    brainLabel = r.brainLabel;
    const o = parseJson(r.text);
    if (!o?.noiDung) { feedback = 'Câu trả lời trước không phải JSON đúng mẫu.'; continue; }
    const d = { chuDe: cut(o.chuDe, 120), noiDung: String(o.noiDung).trim().slice(0, 5000), hashtag: (Array.isArray(o.hashtag) ? o.hashtag : []).map((h) => cut(h, 40)).slice(0, 8), thietKe: normalizeDesign({ ...o.thietKe, thuongHieu: io.ops.brand }) };
    const why = tooSimilar(d, posts);
    if (!why) { draft = d; break; }
    feedback = why;
  }
  if (!draft) {
    await io.groupMessage(io.staff.id, `Chưa ra được bài đủ khác các bài trước sau 3 lần thử (${feedback}). Lần sau làm lại.`);
    return { status: 'failed', message: feedback };
  }
  const text = `${draft.noiDung}${draft.hashtag.length ? `\n\n${draft.hashtag.join(' ')}` : ''}`;
  const image = await io.render(draft.thietKe);
  const post = await io.savePost({ topic: draft.chuDe, text, design: draft.thietKe, hasImage: !!image, image, status: 'posting', brainLabel });
  await io.groupMessage(io.staff.id, `Bài mới: ${draft.chuDe}\n\n${text}\n\n(Ảnh: bố cục ${draft.thietKe.boCuc}, màu ${draft.thietKe.bangMau}. Mình đang tự mở Fanpage để đăng.)`, post.id);
  const res = await io.publish({ text, image, post });
  await io.updatePost(post.id, { status: res.ok ? 'posted' : 'failed', result: res.message, url: res.url || null, fbPostId: res.fbPostId || null, postedAt: res.ok ? new Date().toISOString() : null });
  await io.groupMessage(io.staff.id, res.ok ? `Đã đăng lên Fanpage${res.url ? `: ${res.url}` : ''}. ${cut(res.message, 200)}` : `Đăng lên Fanpage CHƯA được: ${res.message}`);
  return { status: res.ok ? 'posted' : 'failed', postId: post.id, message: res.message };
}

// ---------- Tuấn: kiểm tra số liệu và khuyên ----------
export function analystQuestion({ snapshot, history, posts, plans }) {
  return `NHIỆM VỤ THƯỜNG TRỰC: bạn luôn theo dõi hiệu quả Fanpage. Đây là số liệu VỪA LẤY (nguyên văn nguồn) và các lần trước.
Số liệu mới: ${JSON.stringify(snapshot).slice(0, 6000)}
Các lần trước (mới → cũ): ${JSON.stringify(history.slice(0, 8).map((h) => ({ luc: h.at, nguoiTheoDoi: h.followers, thichTrang: h.likes, tiepCan: h.reach, tuongTac: h.engagement })))}
Bài đã đăng gần đây: ${JSON.stringify(posts.slice(0, 10).map((p) => ({ ma: p.id, chuDe: p.topic, luc: p.postedAt || p.createdAt, trangThai: p.status, tuongTac: p.stats || null })))}
Kế hoạch quảng cáo gần đây: ${JSON.stringify(plans.slice(0, 3).map((p) => ({ luc: p.createdAt, trangThai: p.status, tong: p.total })))}
So sánh với lần trước: tăng/giảm người theo dõi, lượt thích, tiếp cận, bài nào hiệu quả nhất và vì sao. Chưa có số liệu thì nói rõ là chưa có, không bịa.
Đưa lời khuyên CỤ THỂ cho An (nội dung: chủ đề, giờ đăng, kiểu ảnh) và cho Bình (quảng cáo: bài nào nên đẩy, đối tượng, ngân sách, có nên chạy tăng like cả trang).
${ONLY_JSON}
{"tomTat":"...","chiSo":{"nguoiTheoDoi":0,"thichTrang":0,"tiepCan":0,"tuongTac":0},"thayDoi":"so với lần trước","baiTotNhat":["mã bài"],"loiKhuyenNoiDung":"...","loiKhuyenQuangCao":"...","canhBao":""}`;
}

/** io: { staff, think, readMetrics() → {ok, snapshot?, message}, history(), posts(), plans(), saveSnapshot(s), saveAdvice({from,to,text}), groupMessage(staffId, text) } */
export async function runAnalystCycle(io) {
  const m = await io.readMetrics();
  if (!m.ok) {
    await io.groupMessage(io.staff.id, `Chưa đọc được số liệu Fanpage: ${m.message}`);
    return { status: 'failed', message: m.message };
  }
  const r = await io.think(io.staff, { question: analystQuestion({ snapshot: m.snapshot, history: await io.history(), posts: await io.posts(), plans: await io.plans() }) });
  const o = parseJson(r.text) || { tomTat: r.text };
  // Không có số thì để trống (null), không ghi thành 0.
  const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(String(v).replace(/[.,\s]/g, ''))) ? null : Number(String(v).replace(/[.,\s]/g, '')));
  const snap = {
    at: new Date().toISOString(), source: m.snapshot.source || '',
    followers: num(m.snapshot.followers ?? o.chiSo?.nguoiTheoDoi), likes: num(m.snapshot.likes ?? o.chiSo?.thichTrang),
    reach: num(m.snapshot.reach ?? o.chiSo?.tiepCan), engagement: num(m.snapshot.engagement ?? o.chiSo?.tuongTac),
    summary: cut(o.tomTat, 1500), change: cut(o.thayDoi, 800), ...(m.snapshot.raw ? { raw: cut(JSON.stringify(m.snapshot.raw), 1500) } : {}), best: Array.isArray(o.baiTotNhat) ? o.baiTotNhat.slice(0, 5) : [],
  };
  await io.saveSnapshot(snap, m.snapshot.posts || []);
  if (o.loiKhuyenNoiDung) await io.saveAdvice({ from: io.staff.id, to: CONTENT_ID, text: String(o.loiKhuyenNoiDung) });
  if (o.loiKhuyenQuangCao) await io.saveAdvice({ from: io.staff.id, to: ADS_ID, text: String(o.loiKhuyenQuangCao) });
  await io.groupMessage(io.staff.id, [
    `Báo cáo Fanpage: ${o.tomTat || ''}`,
    o.thayDoi ? `So với lần trước: ${o.thayDoi}` : '',
    o.loiKhuyenNoiDung ? `@An: ${o.loiKhuyenNoiDung}` : '',
    o.loiKhuyenQuangCao ? `@Bình: ${o.loiKhuyenQuangCao}` : '',
    o.canhBao ? `⚠ ${o.canhBao}` : '',
  ].filter(Boolean).join('\n'));
  return { status: 'done', snapshot: snap };
}

// ---------- Bình: kế hoạch quảng cáo (chờ duyệt) ----------
export const AD_KINDS = { day_bai: 'Đẩy một bài viết', tang_like_trang: 'Tăng lượt thích / theo dõi cả trang', tin_nhan: 'Quảng cáo nhận tin nhắn' };

export function adsQuestion({ ops, snapshot, advice, posts, plans }) {
  return `NHIỆM VỤ THƯỜNG TRỰC: bạn chịu trách nhiệm Fanpage TĂNG TRƯỞNG và được nhiều người biết đến. Bạn nắm rõ cách chạy quảng cáo Facebook:
đẩy bài (chọn bài có tương tác tự nhiên tốt), chạy tăng thích/theo dõi cả trang, quảng cáo nhận tin nhắn; chọn đối tượng, ngân sách, thời gian, chỉ số đo.
Phân tích số liệu THẬT dưới đây rồi đề xuất kế hoạch tốt nhất. Chỉ đề xuất chạy khi số liệu cho thấy đáng chạy; chưa đủ dữ liệu thì nói rõ và đề xuất mức thử nhỏ.
Trần ngân sách mỗi ngày người dùng cho phép: ${ops.dailyBudgetCap} đồng (tổng ngân sách/ngày của mọi mục không vượt trần).
Số liệu mới nhất của Tuấn: ${JSON.stringify(snapshot || 'chưa có')}
Lời khuyên của Tuấn cho bạn: ${JSON.stringify(advice.slice(0, 3).map((a) => cut(a.text, 600)))}
Bài đã đăng (chọn bài để đẩy theo mã): ${JSON.stringify(posts.slice(0, 12).map((p) => ({ ma: p.id, chuDe: p.topic, trangThai: p.status, maFacebook: p.fbPostId, tuongTac: p.stats || null, doan: cut(p.text, 120) })))}
Kết quả các kế hoạch trước: ${JSON.stringify(plans.slice(0, 3).map((p) => ({ luc: p.createdAt, trangThai: p.status, tong: p.total, ketQua: cut(p.result, 300) })))}
${ONLY_JSON}
{"phanTich":"vì sao chọn","deXuat":[{"loai":"day_bai","baiViet":"mã bài hoặc null","mucTieu":"...","doiTuong":{"tuoiTu":25,"tuoiDen":55,"khuVuc":"Việt Nam","soThich":["xe tải"]},"nganSachNgay":100000,"soNgay":3,"kpi":"..."}],"kiemTraSau":"sau bao lâu xem lại số liệu"}`;
}

export function validatePlan(o, ops, posts) {
  const items = (Array.isArray(o?.deXuat) ? o.deXuat : []).slice(0, 5).map((x) => ({
    loai: AD_KINDS[x.loai] ? x.loai : 'day_bai',
    baiViet: x.baiViet && posts.some((p) => p.id === x.baiViet) ? x.baiViet : null,
    mucTieu: cut(x.mucTieu, 300), kpi: cut(x.kpi, 300),
    doiTuong: { tuoiTu: Math.max(18, Number(x.doiTuong?.tuoiTu) || 18), tuoiDen: Math.min(65, Number(x.doiTuong?.tuoiDen) || 65), khuVuc: cut(x.doiTuong?.khuVuc || 'Việt Nam', 120), soThich: (x.doiTuong?.soThich || []).map((s) => cut(s, 40)).slice(0, 6) },
    nganSachNgay: Math.max(0, Math.round(Number(x.nganSachNgay) || 0)), soNgay: Math.min(30, Math.max(1, Math.round(Number(x.soNgay) || 1))),
  })).filter((x) => x.nganSachNgay > 0 && (x.loai !== 'day_bai' || x.baiViet));
  const perDay = items.reduce((n, x) => n + x.nganSachNgay, 0);
  const total = items.reduce((n, x) => n + x.nganSachNgay * x.soNgay, 0);
  return { items, perDay, total, overCap: perDay > ops.dailyBudgetCap, analysis: cut(o?.phanTich, 2000), recheck: cut(o?.kiemTraSau, 200) };
}
export const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;
export function planText(plan, posts) {
  return [
    `Phân tích: ${plan.analysis}`,
    ...plan.items.map((x, i) => `${i + 1}. ${AD_KINDS[x.loai]}${x.baiViet ? ` — bài "${cut(posts.find((p) => p.id === x.baiViet)?.topic, 60)}"` : ''}: ${vnd(x.nganSachNgay)}/ngày × ${x.soNgay} ngày; đối tượng ${x.doiTuong.tuoiTu}–${x.doiTuong.tuoiDen} tuổi, ${x.doiTuong.khuVuc}${x.doiTuong.soThich.length ? `, quan tâm ${x.doiTuong.soThich.join(', ')}` : ''}. Mục tiêu: ${x.mucTieu}. Đo: ${x.kpi}`),
    `Tổng: ${vnd(plan.perDay)}/ngày, cả kế hoạch ${vnd(plan.total)}.${plan.recheck ? ` Kiểm tra lại: ${plan.recheck}.` : ''}`,
  ].join('\n');
}

/** io: { ops, staff, think, latestSnapshot(), advice(toId), posts(), plans(), savePlan(plan) → plan, createRequest({question, content, planId}), groupMessage } */
export async function runAdsCycle(io) {
  const posts = await io.posts();
  const r = await io.think(io.staff, { question: adsQuestion({ ops: io.ops, snapshot: await io.latestSnapshot(), advice: await io.advice(ADS_ID), posts, plans: await io.plans() }) });
  const o = parseJson(r.text);
  if (!o) { await io.groupMessage(io.staff.id, r.text); return { status: 'no_plan' }; }
  const plan = validatePlan(o, io.ops, posts);
  if (!plan.items.length) {
    await io.groupMessage(io.staff.id, `Chưa đề xuất chạy quảng cáo hôm nay. ${plan.analysis}`);
    return { status: 'no_plan' };
  }
  const text = planText(plan, posts);
  if (plan.overCap) {
    await io.groupMessage(io.staff.id, `Kế hoạch vượt trần ${vnd(io.ops.dailyBudgetCap)}/ngày nên KHÔNG gửi duyệt; mình sẽ làm lại trong trần.\n${text}`);
    return { status: 'over_cap', plan };
  }
  const saved = await io.savePlan({ ...plan, text, status: 'pending' });
  await io.createRequest({ question: `Bình đề xuất kế hoạch quảng cáo — tổng ${vnd(plan.perDay)}/ngày, cả kế hoạch ${vnd(plan.total)}. Chỉ chạy khi bạn duyệt.`, content: text, planId: saved.id });
  await io.groupMessage(io.staff.id, `Mình vừa gửi kế hoạch quảng cáo chờ bạn duyệt:\n${text}`);
  return { status: 'proposed', plan: saved };
}

/** Sau khi người dùng duyệt: chạy từng mục. io: { ops, staff, plan, posts(), runAd(item, post) → {ok, message}, updatePlan(id, fields), groupMessage } */
export async function executeAdsPlan(io) {
  const posts = await io.posts();
  const lines = [];
  let ok = 0;
  for (const item of io.plan.items) {
    const post = item.baiViet ? posts.find((p) => p.id === item.baiViet) : null;
    let res;
    try { res = await io.runAd(item, post); } catch (e) { res = { ok: false, message: e.message }; }
    if (res.ok) ok++;
    lines.push(`${AD_KINDS[item.loai]}${post ? ` "${cut(post.topic, 40)}"` : ''}: ${res.ok ? 'ĐANG CHẠY' : 'LỖI'} — ${res.message}`);
  }
  const status = ok === io.plan.items.length ? 'running' : ok ? 'partial' : 'failed';
  await io.updatePlan(io.plan.id, { status, result: lines.join('\n'), startedAt: new Date().toISOString() });
  await io.groupMessage(io.staff.id, `Đã chạy kế hoạch quảng cáo bạn duyệt:\n${lines.join('\n')}\nTuấn sẽ theo dõi số liệu ở các lần kiểm tra tới.`);
  return { status, message: lines.join('\n') };
}

// ---------- Bình: chia sẻ bài hay vào nhóm (tự động, giới hạn mỗi ngày) ----------
/** io: { ops, staff, posts(), latestSnapshot(), shareToGroup(post, group) → {ok, message}, markShared(postId, groupUrl, ok, message), groupMessage } */
export async function runShareCycle(io) {
  const posts = (await io.posts()).filter((p) => p.status === 'posted');
  const snap = await io.latestSnapshot();
  const score = (p) => (snap?.best?.includes(p.id) ? 1000 : 0) + (p.stats ? (p.stats.reactions || 0) + 2 * (p.stats.comments || 0) + 3 * (p.stats.shares || 0) : 0);
  const ranked = [...posts].sort((a, b) => score(b) - score(a));
  const done = [];
  for (const post of ranked) {
    for (const g of io.ops.groups) {
      if (done.length >= io.ops.shareMaxPerDay) break;
      if ((post.shares || []).some((s) => s.url === g.url && s.ok)) continue;
      let res;
      try { res = await io.shareToGroup(post, g); } catch (e) { res = { ok: false, message: e.message }; }
      await io.markShared(post.id, g.url, res.ok, res.message);
      done.push(`${res.ok ? '✓' : '✕'} "${cut(post.topic, 40)}" → ${g.url}: ${cut(res.message, 120)}`);
    }
  }
  if (done.length) await io.groupMessage(io.staff.id, `Chia sẻ bài vào nhóm:\n${done.join('\n')}`);
  return { status: 'done', shared: done.length };
}
