// QUY TRÌNH CHUẨN FANPAGE — đơn giản, từng bước như làm ngoài đời, mỗi bước MỘT người phụ trách và MỘT sản phẩm cụ thể.
// 1. Tuấn kiểm tra hiện trạng Fanpage (số liệu thật)          5. Bình xem bài thật → đề xuất quảng cáo cho bài
// 2. Bình lập kế hoạch + chia ngân sách → BẠN DUYỆT            6. BẠN DUYỆT quảng cáo → Bình tự chạy
// 3. An viết bài + thiết kế ảnh → BẠN DUYỆT (sửa được)          7. Sau X giờ Tuấn đo kết quả, khuyên An/Bình → bài tiếp theo
// 4. An tự đăng lên Fanpage đã kết nối                          8. Hết kế hoạch: Phúc báo cáo tổng kết so với mục tiêu
// Hành động lỗi (đăng, chạy quảng cáo) → hỏi bạn "Thử lại / Bỏ qua", không âm thầm bỏ qua.
import { CONTENT_ID, ADS_ID, ANALYST_ID, AD_KINDS, contentQuestion, tooSimilar, parseJson, vnd } from './fanpage.js';
import { normalizeDesign } from './design.js';

export const MANAGER = 'STAFF-007';
const cut = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : String(s ?? ''));
const num = (v) => { const n = Number(String(v ?? '').replace(/[^\d]/g, '')); return Number.isFinite(n) ? n : 0; };

// Việc chung nói về Fanpage / theo dõi / thích / quảng cáo / bài đăng → chạy theo quy trình chuẩn này.
export const isFanpageGoal = (text) => /fan ?page|follow|folow|theo dõi|lượt thích|like|quảng cáo|chạy ads|đăng bài|bài đăng/i.test(String(text || ''));

export function parseGoal(title, description = '') {
  const t = `${title}\n${description}`;
  const money = /([\d.,\s]{3,})\s*(k|nghìn|ngàn|tr|triệu|đ|đồng|vnd)?/gi;
  let budget = 0;
  for (const m of t.matchAll(money)) {
    const unit = (m[2] || '').toLowerCase();
    let v = num(m[1]);
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') v *= 1000;
    if (unit === 'tr' || unit === 'triệu') v *= 1000000;
    if (v >= 10000 && (unit || v >= 100000)) budget = Math.max(budget, v);
  }
  const days = num(/(\d{1,2})\s*ngày/i.exec(t)?.[1]) || 7;
  return { budget, days: Math.min(30, Math.max(1, days)) };
}

export const STEP_OWNER = { audit: ANALYST_ID, plan: ADS_ID, write: CONTENT_ID, publish: CONTENT_ID, ads: ADS_ID, run: ADS_ID, check: ANALYST_ID, report: MANAGER };

export function initCampaign({ title, description = '', budget, days }) {
  const g = parseGoal(title, description);
  return {
    goal: `${title}${description ? ` — ${description}` : ''}`.slice(0, 600), budget: Math.max(0, Math.round(Number(budget) || g.budget)), days: Number(days) || g.days,
    startedAt: new Date().toISOString(), baseline: null, plan: null, checks: [], advice: [],
    steps: [
      { key: 'audit', title: 'Tuấn kiểm tra hiện trạng Fanpage', owner: ANALYST_ID, status: 'todo' },
      { key: 'plan', title: 'Bình lập kế hoạch và chia ngân sách', owner: ADS_ID, status: 'todo' },
      { key: 'plan_ok', title: 'Bạn duyệt kế hoạch', owner: 'user', gate: 'plan', status: 'todo' },
    ],
  };
}

// Sau khi kế hoạch được duyệt: các bước cho từng bài + báo cáo cuối.
function expandSteps(c) {
  const steps = c.steps.filter((s) => ['audit', 'plan', 'plan_ok'].includes(s.key));
  for (const b of c.plan.baiViet) {
    const i = b.so;
    const ad = c.plan.quangCao.find((q) => q.baiSo === i);
    steps.push(
      { key: `write_${i}`, title: `An viết bài ${i} + thiết kế ảnh: ${cut(b.chuDe, 60)}`, owner: CONTENT_ID, status: 'todo', bai: i },
      { key: `post_ok_${i}`, title: `Bạn duyệt bài ${i}`, owner: 'user', gate: 'post', status: 'todo', bai: i },
      { key: `publish_${i}`, title: `An đăng bài ${i} lên Fanpage`, owner: CONTENT_ID, status: 'todo', bai: i },
    );
    if (ad && ad.nganSach > 0) {
      steps.push(
        { key: `ads_${i}`, title: `Bình xem bài ${i} thực tế và đề xuất quảng cáo (≤ ${vnd(ad.nganSach)})`, owner: ADS_ID, status: 'todo', bai: i },
        { key: `ads_ok_${i}`, title: `Bạn duyệt quảng cáo bài ${i}`, owner: 'user', gate: 'campaign_ads', status: 'todo', bai: i },
        { key: `run_${i}`, title: `Bình chạy quảng cáo bài ${i}`, owner: ADS_ID, status: 'todo', bai: i },
      );
    }
    steps.push({ key: `check_${i}`, title: `Tuấn đo kết quả sau bài ${i} (sau ${c.plan.kiemTraSauGio} giờ)`, owner: ANALYST_ID, status: 'todo', bai: i });
  }
  steps.push({ key: 'report', title: 'Phúc báo cáo tổng kết so với mục tiêu', owner: MANAGER, status: 'todo' });
  c.steps = steps;
}

// ---------- Câu hỏi cho từng người (mỗi câu ra MỘT sản phẩm dạng JSON) ----------
const ONLY_JSON = 'Chỉ trả về MỘT đối tượng JSON đúng mẫu.';
export const planQuestion = (c, feedback) => `KẾ HOẠCH CHIẾN DỊCH (bạn là người chạy quảng cáo, chịu trách nhiệm Fanpage tăng trưởng). Lập kế hoạch ĐƠN GIẢN, LÀM ĐƯỢC NGAY.
Mục tiêu người dùng giao: ${c.goal}
Tổng ngân sách quảng cáo tối đa: ${c.budget} đồng. Thời gian: ${c.days} ngày.
Hiện trạng Fanpage (Tuấn vừa kiểm tra): ${JSON.stringify(c.baseline || 'chưa có số liệu')}
${feedback ? `NGƯỜI DÙNG KHÔNG DUYỆT bản trước, góp ý: "${feedback}" — sửa theo góp ý.\n` : ''}Yêu cầu: số bài vừa sức (1 bài / 1–2 ngày), mỗi bài có chủ đề KHÁC nhau và mục đích rõ; chia ngân sách cho bài nào chạy quảng cáo (tổng không vượt ngân sách); chỉ số đo (KPI) cụ thể; sau bao nhiêu giờ đo kết quả mỗi bài.
${ONLY_JSON}
{"tomTat":"1-2 câu","soBai":3,"baiViet":[{"so":1,"ngay":1,"gio":"19:30","chuDe":"...","mucDich":"..."}],"quangCao":[{"baiSo":1,"loai":"day_bai","nganSach":150000}],"kpi":"...","kiemTraSauGio":24,"doiTuong":{"tuoiTu":25,"tuoiDen":55,"khuVuc":"Việt Nam","soThich":["..."]}}`;

export function validateCampaignPlan(o, c) {
  if (!o) throw new Error('Kế hoạch không đúng mẫu JSON.');
  const soBai = Math.min(Math.max(1, Math.round(Number(o.soBai) || (o.baiViet || []).length || 1)), Math.min(10, c.days * 2));
  const baiViet = (Array.isArray(o.baiViet) ? o.baiViet : []).slice(0, soBai).map((b, i) => ({
    so: i + 1, ngay: Math.min(c.days, Math.max(1, Math.round(Number(b.ngay) || i + 1))), gio: /^\d{2}:\d{2}$/.test(b.gio) ? b.gio : '19:30',
    chuDe: cut(b.chuDe, 160) || `Bài ${i + 1}`, mucDich: cut(b.mucDich, 200),
  }));
  while (baiViet.length < soBai) baiViet.push({ so: baiViet.length + 1, ngay: baiViet.length + 1, gio: '19:30', chuDe: `Bài ${baiViet.length + 1}`, mucDich: '' });
  const quangCao = (Array.isArray(o.quangCao) ? o.quangCao : [])
    .map((q) => ({ baiSo: Math.round(Number(q.baiSo)), loai: AD_KINDS[q.loai] ? q.loai : 'day_bai', nganSach: Math.max(0, Math.round(num(q.nganSach))) }))
    .filter((q) => q.baiSo >= 1 && q.baiSo <= soBai && q.nganSach > 0);
  const tong = quangCao.reduce((n, q) => n + q.nganSach, 0);
  if (tong > c.budget) throw new Error(`Tổng quảng cáo ${vnd(tong)} vượt ngân sách ${vnd(c.budget)}.`);
  const d = o.doiTuong || {};
  return {
    tomTat: cut(o.tomTat, 600), soBai, baiViet, quangCao, tong, kpi: cut(o.kpi, 400),
    kiemTraSauGio: Math.min(72, Math.max(1, Math.round(Number(o.kiemTraSauGio) || 24))),
    doiTuong: { tuoiTu: Math.max(18, Number(d.tuoiTu) || 18), tuoiDen: Math.min(65, Number(d.tuoiDen) || 65), khuVuc: cut(d.khuVuc || 'Việt Nam', 120), soThich: (d.soThich || []).map((x) => cut(x, 40)).slice(0, 6) },
  };
}
export const planToText = (p) => [
  p.tomTat,
  ...p.baiViet.map((b) => { const q = p.quangCao.find((x) => x.baiSo === b.so); return `Bài ${b.so} — ngày ${b.ngay} lúc ${b.gio}: ${b.chuDe}${b.mucDich ? ` (${b.mucDich})` : ''}${q ? ` · quảng cáo ${AD_KINDS[q.loai]} ${vnd(q.nganSach)}` : ' · không chạy quảng cáo'}`; }),
  `Tổng quảng cáo: ${vnd(p.tong)}. Đối tượng: ${p.doiTuong.tuoiTu}–${p.doiTuong.tuoiDen} tuổi, ${p.doiTuong.khuVuc}${p.doiTuong.soThich.length ? `, quan tâm ${p.doiTuong.soThich.join(', ')}` : ''}.`,
  `KPI: ${p.kpi}. Đo kết quả sau mỗi bài: ${p.kiemTraSauGio} giờ.`,
].filter(Boolean).join('\n');

const adsStepQuestion = (c, post, ad, latest) => `QUẢNG CÁO CHO BÀI VỪA ĐĂNG. Trước khi đề xuất, xem tình hình THỰC TẾ của bài và trang rồi mới quyết.
Mục tiêu chiến dịch: ${c.goal}
Bài đã đăng: ${JSON.stringify({ chuDe: post.topic, link: post.url, tuongTacHienTai: post.stats || 'chưa có số liệu', doan: cut(post.text, 300) })}
Ngân sách kế hoạch dành cho bài này: tối đa ${ad.nganSach} đồng (tổng). Loại dự kiến: ${AD_KINDS[ad.loai]}. Đối tượng dự kiến: ${JSON.stringify(c.plan.doiTuong)}
Số liệu mới nhất của Tuấn: ${JSON.stringify(latest || c.baseline || 'chưa có')}
Lời khuyên của Tuấn cho quảng cáo: ${JSON.stringify(c.advice.filter((a) => a.to === ADS_ID).slice(-2).map((a) => a.text))}
Nếu thấy bài không đáng chạy thì đề xuất KHÔNG chạy và nói lý do (tiền giữ lại cho bài sau).
${ONLY_JSON}
{"chay":true,"lyDo":"...","loai":"day_bai","nganSachNgay":50000,"soNgay":3,"doiTuong":{"tuoiTu":25,"tuoiDen":55,"khuVuc":"...","soThich":["..."]},"mucTieu":"...","kpi":"..."}`;

const checkQuestion = (c, i, metrics) => `ĐO KẾT QUẢ CHIẾN DỊCH sau bài ${i}/${c.plan.soBai}. So số liệu mới với số liệu gốc và lần đo trước, tính tiến độ so với mục tiêu.
Mục tiêu: ${c.goal}
Số liệu gốc: ${JSON.stringify(c.baseline || 'chưa có')}
Các lần đo trước: ${JSON.stringify(c.checks.slice(-3))}
Số liệu vừa lấy (nguyên văn nguồn): ${JSON.stringify(metrics).slice(0, 5000)}
Không có số thì nói chưa có, không bịa.
${ONLY_JSON}
{"tienDo":"đã đạt bao nhiêu so với mục tiêu","nhanXet":"...","loiKhuyenNoiDung":"cho An","loiKhuyenQuangCao":"cho Bình"}`;

const reportQuestion = (c) => `BÁO CÁO TỔNG KẾT CHIẾN DỊCH cho người dùng. Mục tiêu: ${c.goal}. Ngân sách: ${c.budget} đồng trong ${c.days} ngày.
Số liệu gốc: ${JSON.stringify(c.baseline || 'chưa có')}
Các lần đo: ${JSON.stringify(c.checks)}
Các bước đã làm: ${JSON.stringify(c.steps.map((s) => ({ buoc: s.title, trangThai: s.status, ketQua: cut(s.output, 300) })))}
Viết ngắn gọn: đạt bao nhiêu % mục tiêu, tiền đã dùng, bài nào hiệu quả nhất, bài học, đề xuất bước tiếp theo. Không bịa số.`;

// ---------- Bộ chạy ----------
const ACTION_TYPES = { publish: 'Đăng bài', run: 'Chạy quảng cáo' };
/**
 * io: { campaign, save(), think(staffId, ctx) → {text, brainLabel}, readMetrics() → {ok, snapshot?, message},
 *       posts() (bài đã có, để không lặp), ops (brand), render(spec) → dataUrl, savePost(p) → post, updatePost(id, f), getPost(id),
 *       publishPost(post) → {ok, message, url?, fbPostId?}, runAd(item, post) → {ok, message},
 *       createRequest({type, stepKey, question, content, postId}) → id, getRequest(id), groupMessage(staffId, text, postId?), pushOutput(o) }
 * Trả về { status: 'waiting_user' | 'waiting_time' | 'done', until? }
 */
export async function advanceCampaign(io) {
  const c = io.campaign;
  for (let guard = 0; guard < 60; guard++) {
    const step = c.steps.find((s) => !['done', 'skipped'].includes(s.status));
    if (!step) { c.done = true; await io.save(); return { status: 'done' }; }
    const name = step.owner === 'user' ? 'Bạn' : io.staffName(step.owner);
    const finish = async (output, extra = {}) => {
      Object.assign(step, { status: 'done', output: String(output || '').slice(0, 6000), at: new Date().toISOString(), ...extra });
      await io.pushOutput({ key: step.key, staffId: step.owner === 'user' ? null : step.owner, staffName: name, step: step.title, text: step.output, brainLabel: extra.brainLabel || null });
      await io.save();
    };
    const kind = step.key.replace(/_\d+$/, '');
    const post = step.bai ? c.steps.find((s) => s.key === `write_${step.bai}`)?.postId : null;

    // --- Chốt người dùng duyệt ---
    if (step.gate) {
      if (!step.requestId) {
        const p = post ? await io.getPost(post) : null;
        const ad = step.gate === 'campaign_ads' ? c.steps.find((s) => s.key === `ads_${step.bai}`)?.item : null;
        const q = step.gate === 'plan'
          ? { question: `Bình gửi kế hoạch chiến dịch — tổng quảng cáo ${vnd(c.plan.tong)} / ${c.days} ngày. Duyệt thì An bắt đầu viết bài 1.`, content: planToText(c.plan) }
          : step.gate === 'post'
            ? { question: `An gửi bài ${step.bai} để bạn duyệt. Bạn sửa được nội dung; duyệt xong An tự đăng lên Fanpage.`, content: p?.text || '', postId: post }
            : { question: `Bình đề xuất quảng cáo bài ${step.bai}: ${vnd(ad.nganSachNgay)}/ngày × ${ad.soNgay} ngày = ${vnd(ad.nganSachNgay * ad.soNgay)}. Duyệt thì Bình tự chạy.`, content: c.steps.find((s) => s.key === `ads_${step.bai}`)?.output || '', postId: post };
        step.requestId = await io.createRequest({ type: step.gate, stepKey: step.key, ...q });
        step.status = 'waiting';
        await io.save();
        return { status: 'waiting_user' };
      }
      const r = await io.getRequest(step.requestId);
      if (!r || r.status === 'pending') return { status: 'waiting_user' };
      if (r.status === 'approved') {
        if (step.gate === 'plan') { await finish(`Đã duyệt${r.answer ? ` — ghi chú: ${r.answer}` : ''}.`); expandSteps(c); await io.save(); continue; }
        if (step.gate === 'post' && r.content) await io.updatePost(post, { text: r.content });
        await finish(`Đã duyệt${r.answer ? ` — ghi chú: ${r.answer}` : ''}.`);
        continue;
      }
      // Không duyệt: làm lại bước trước theo góp ý (kế hoạch / bài), hoặc bỏ quảng cáo bài này.
      const fb = r.answer || 'Người dùng không duyệt';
      if (step.gate === 'plan') { Object.assign(c.steps.find((s) => s.key === 'plan'), { status: 'todo', feedback: fb }); Object.assign(step, { status: 'todo', requestId: null }); }
      else if (step.gate === 'post') { Object.assign(c.steps.find((s) => s.key === `write_${step.bai}`), { status: 'todo', feedback: fb }); Object.assign(step, { status: 'todo', requestId: null }); }
      else {
        await finish(`Không duyệt quảng cáo: ${fb}`);
        const run = c.steps.find((s) => s.key === `run_${step.bai}`);
        if (run) Object.assign(run, { status: 'skipped', output: 'Bỏ qua vì người dùng không duyệt.' });
      }
      await io.save();
      continue;
    }

    // --- Bước hành động bị lỗi đang chờ "Thử lại / Bỏ qua" ---
    if (step.retryRequestId) {
      const r = await io.getRequest(step.retryRequestId);
      if (!r || r.status === 'pending') return { status: 'waiting_user' };
      step.retryRequestId = null;
      if (r.status === 'rejected') { Object.assign(step, { status: 'skipped', output: `Bỏ qua theo lựa chọn của bạn. Lỗi trước đó: ${cut(step.lastError, 300)}` }); await io.save(); continue; }
    }
    // --- Bước chờ đến giờ (đo kết quả sau X giờ) ---
    if (kind === 'check') {
      if (!step.dueAt) { step.dueAt = new Date(Date.now() + c.plan.kiemTraSauGio * 3600000).toISOString(); step.status = 'waiting'; await io.save(); }
      if (Date.now() < Date.parse(step.dueAt) && !step.runNow) return { status: 'waiting_time', until: step.dueAt };
    }

    step.status = 'doing';
    await io.save();
    try {
      if (kind === 'audit') {
        const m = await io.readMetrics();
        c.baseline = m.ok ? { luc: new Date().toISOString(), ...m.snapshot, posts: undefined, raw: m.snapshot.raw ? cut(JSON.stringify(m.snapshot.raw), 1500) : undefined } : { loi: m.message };
        const text = m.ok
          ? `Số liệu gốc (${m.snapshot.source || ''}): người theo dõi ${m.snapshot.followers ?? 'chưa rõ'}, thích trang ${m.snapshot.likes ?? 'chưa rõ'}, tiếp cận ${m.snapshot.reach ?? 'chưa rõ'}, tương tác ${m.snapshot.engagement ?? 'chưa rõ'}.${m.snapshot.raw ? `\nĐọc được trên trang: ${cut(JSON.stringify(m.snapshot.raw), 600)}` : ''}`
          : `Chưa đọc được số liệu Fanpage: ${m.message}. Kế hoạch sẽ ghi số liệu gốc là "chưa có".`;
        await finish(text);
        await io.groupMessage(ANALYST_ID, `[Chiến dịch] ${text}`);
      } else if (kind === 'plan') {
        const r = await io.think(ADS_ID, { question: planQuestion(c, step.feedback) });
        let p;
        try { p = validateCampaignPlan(parseJson(r.text), c); } catch (e) {
          step.feedback = `${e.message} Làm lại cho đúng.`; step.tries = (step.tries || 0) + 1;
          if (step.tries < 3) { step.status = 'todo'; await io.save(); continue; }
          throw e;
        }
        c.plan = p;
        await finish(planToText(p), { brainLabel: r.brainLabel });
        await io.groupMessage(ADS_ID, `[Chiến dịch] Kế hoạch gửi bạn duyệt:\n${planToText(p)}`);
      } else if (kind === 'write') {
        const b = c.plan.baiViet.find((x) => x.so === step.bai);
        const posts = await io.posts();
        let feedback = step.feedback ? `Người dùng không duyệt bản trước: "${step.feedback}".` : '';
        let draft = null; let label = null;
        for (let i = 0; i < 3 && !draft; i++) {
          const ask = `${contentQuestion({ ops: io.ops, posts, advice: c.advice.filter((a) => a.to === CONTENT_ID).slice(-3).reverse(), feedback })}\nBÀI NÀY THEO KẾ HOẠCH: bài ${b.so}/${c.plan.soBai}, chủ đề "${b.chuDe}", mục đích: ${b.mucDich || c.goal}.`;
          const r = await io.think(CONTENT_ID, { question: ask });
          label = r.brainLabel;
          const o = parseJson(r.text);
          if (!o?.noiDung) { feedback = 'Câu trả lời trước không phải JSON đúng mẫu.'; continue; }
          const d = { chuDe: cut(o.chuDe || b.chuDe, 120), noiDung: String(o.noiDung).trim().slice(0, 5000), hashtag: (o.hashtag || []).map((h) => cut(h, 40)).slice(0, 8), thietKe: normalizeDesign({ ...o.thietKe, thuongHieu: io.ops.brand }) };
          const why = tooSimilar(d, posts);
          if (why) feedback = why; else draft = d;
        }
        if (!draft) throw new Error(`Chưa viết được bài đủ khác các bài trước (${feedback}).`);
        const text = `${draft.noiDung}${draft.hashtag.length ? `\n\n${draft.hashtag.join(' ')}` : ''}`;
        const image = await io.render(draft.thietKe);
        const saved = await io.savePost({ topic: draft.chuDe, text, design: draft.thietKe, hasImage: !!image, image, status: 'draft', brainLabel: label });
        step.postId = saved.id;
        await finish(`Bài ${b.so}: ${draft.chuDe}\n\n${text}\n\n(Ảnh: bố cục ${draft.thietKe.boCuc}, màu ${draft.thietKe.bangMau})`, { brainLabel: label });
        await io.groupMessage(CONTENT_ID, `[Chiến dịch] Bài ${b.so} xong, chờ bạn duyệt: ${draft.chuDe}\n\n${text}`, saved.id);
      } else if (kind === 'publish') {
        const p = await io.getPost(post);
        const res = await io.publishPost(p);
        if (!res.ok) throw Object.assign(new Error(res.message), { action: true });
        await io.updatePost(post, { status: 'posted', url: res.url || null, fbPostId: res.fbPostId || null, result: res.message, postedAt: new Date().toISOString() });
        await finish(`Đã đăng lên Fanpage${res.url ? `: ${res.url}` : ''}. ${res.message}`);
        await io.groupMessage(CONTENT_ID, `[Chiến dịch] Đã đăng bài ${step.bai} lên Fanpage${res.url ? `: ${res.url}` : ''}.`);
      } else if (kind === 'ads') {
        const p = await io.getPost(post);
        const ad = c.plan.quangCao.find((q) => q.baiSo === step.bai);
        const r = await io.think(ADS_ID, { question: adsStepQuestion(c, p, ad, c.checks.at(-1)) });
        const o = parseJson(r.text) || {};
        if (o.chay === false) {
          await finish(`Đề xuất KHÔNG chạy quảng cáo bài ${step.bai}: ${o.lyDo || ''}`, { brainLabel: r.brainLabel });
          for (const k of [`ads_ok_${step.bai}`, `run_${step.bai}`]) Object.assign(c.steps.find((s) => s.key === k) || {}, { status: 'skipped', output: 'Bình đề xuất không chạy.' });
          await io.save();
        } else {
          let ngay = Math.max(1, Math.min(c.days, Math.round(Number(o.soNgay) || 1)));
          let perDay = Math.max(1000, num(o.nganSachNgay) || Math.floor(ad.nganSach / ngay));
          if (perDay * ngay > ad.nganSach) perDay = Math.floor(ad.nganSach / ngay); // không vượt ngân sách kế hoạch
          const d = o.doiTuong || c.plan.doiTuong;
          const item = { loai: AD_KINDS[o.loai] ? o.loai : ad.loai, baiViet: post, nganSachNgay: perDay, soNgay: ngay, mucTieu: cut(o.mucTieu, 300), kpi: cut(o.kpi, 300), doiTuong: { tuoiTu: Math.max(18, Number(d.tuoiTu) || 18), tuoiDen: Math.min(65, Number(d.tuoiDen) || 65), khuVuc: cut(d.khuVuc || 'Việt Nam', 120), soThich: (d.soThich || []).map((x) => cut(x, 40)).slice(0, 6) } };
          step.item = item;
          await finish(`${o.lyDo ? `Nhận định: ${o.lyDo}\n` : ''}${AD_KINDS[item.loai]}: ${vnd(perDay)}/ngày × ${ngay} ngày = ${vnd(perDay * ngay)}; đối tượng ${item.doiTuong.tuoiTu}–${item.doiTuong.tuoiDen} tuổi, ${item.doiTuong.khuVuc}${item.doiTuong.soThich.length ? `, quan tâm ${item.doiTuong.soThich.join(', ')}` : ''}. Mục tiêu: ${item.mucTieu}. Đo: ${item.kpi}`, { brainLabel: r.brainLabel, item });
        }
      } else if (kind === 'run') {
        const item = c.steps.find((s) => s.key === `ads_${step.bai}`).item;
        const res = await io.runAd(item, await io.getPost(post));
        if (!res.ok) throw Object.assign(new Error(res.message), { action: true });
        await finish(`Quảng cáo đang chạy: ${res.message}`);
        await io.groupMessage(ADS_ID, `[Chiến dịch] Đã chạy quảng cáo bài ${step.bai}: ${vnd(item.nganSachNgay)}/ngày × ${item.soNgay} ngày. ${res.message}`);
      } else if (kind === 'check') {
        const m = await io.readMetrics();
        const r = await io.think(ANALYST_ID, { question: checkQuestion(c, step.bai, m.ok ? m.snapshot : { loi: m.message }) });
        const o = parseJson(r.text) || { nhanXet: r.text };
        c.checks.push({ luc: new Date().toISOString(), sauBai: step.bai, followers: m.snapshot?.followers ?? null, likes: m.snapshot?.likes ?? null, tienDo: cut(o.tienDo, 200) });
        if (o.loiKhuyenNoiDung) c.advice.push({ to: CONTENT_ID, text: cut(o.loiKhuyenNoiDung, 800) });
        if (o.loiKhuyenQuangCao) c.advice.push({ to: ADS_ID, text: cut(o.loiKhuyenQuangCao, 800) });
        const text = [`Tiến độ: ${o.tienDo || 'chưa rõ'}`, o.nhanXet, o.loiKhuyenNoiDung ? `@An: ${o.loiKhuyenNoiDung}` : '', o.loiKhuyenQuangCao ? `@Bình: ${o.loiKhuyenQuangCao}` : ''].filter(Boolean).join('\n');
        await finish(text, { brainLabel: r.brainLabel });
        await io.groupMessage(ANALYST_ID, `[Chiến dịch] Đo kết quả sau bài ${step.bai}:\n${text}`);
      } else if (kind === 'report') {
        const r = await io.think(MANAGER, { question: reportQuestion(c) });
        await finish(r.text, { brainLabel: r.brainLabel });
        await io.groupMessage(MANAGER, `[Chiến dịch] Báo cáo tổng kết:\n${r.text}`);
      }
    } catch (e) {
      // Hành động thật lỗi → hỏi người dùng thử lại hay bỏ qua. Bộ não lỗi → giữ nguyên để thử lại sau.
      step.lastError = e.message;
      if (e.action || ACTION_TYPES[kind]) {
        step.status = 'waiting';
        step.retryRequestId = await io.createRequest({ type: 'retry', stepKey: step.key, question: `${ACTION_TYPES[kind] || 'Bước'} "${step.title}" chưa làm được: ${e.message}\nBạn kiểm tra kết nối / đăng nhập Facebook rồi bấm "Thử lại", hoặc "Bỏ qua bước này".`, content: '' });
        await io.save();
        await io.groupMessage(step.owner, `[Chiến dịch] ${step.title} — LỖI: ${e.message}. Đang chờ bạn chọn Thử lại / Bỏ qua.`);
        return { status: 'waiting_user' };
      }
      step.status = 'todo';
      await io.save();
      throw e;
    }
  }
  return { status: 'waiting_user' };
}

export const nextStep = (c) => c?.steps?.find((s) => !['done', 'skipped'].includes(s.status)) || null;
