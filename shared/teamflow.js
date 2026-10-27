// GIAO VIỆC CHO CẢ VĂN PHÒNG — một cách làm duy nhất, rõ ràng:
// 1. Cả 10 nhân viên đọc việc, mỗi người tự xét "việc này có phần nào của mình không" (theo vai trò chuẩn).
//    Ví dụ "tra giá sản phẩm X" → chỉ Sơn (Sale) nhận; "tăng người theo dõi Fanpage" → cả nhóm Marketing nhận.
// 2. Một người nhận → làm luôn. Nhiều người → Phúc sắp thứ tự (ai làm gì, ai chờ ai), bỏ phần trùng.
// 3. Từng người làm phần của mình bằng hành động thật (shared/worker.js): xem phần mềm, tìm trên web, thiết kế ảnh,
//    hỏi người dùng, xin duyệt trước khi đăng / nhắn khách / chạy quảng cáo, nhờ đồng nghiệp.
// 4. Nhiều người thì Phúc tổng kết cho người dùng.
import { ROLE_PROFILES } from './roles.js';

export const MANAGER = 'STAFF-007';
const cut = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : String(s ?? ''));
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
function parseJson(text) {
  const s = String(text || '');
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}
const byName = (list, name) => list.find((s) => fold(s.name) === fold(name)) || list.find((s) => fold(name).split(/[\s,()/-]+/).includes(fold(s.name))) || null;

export function initFlow() {
  return { stage: 'triage', triage: [], plan: [], summary: null };
}

export const triageQuestion = (task, s) => `XÉT VIỆC MỚI. Người dùng vừa giao cho cả văn phòng: "${task.title}"${task.description ? ` — ${task.description}` : ''}.
Vai trò của bạn (${s.name} — ${s.role}): ${ROLE_PROFILES[s.id]?.responsibilities || s.responsibilities}
Việc này có phần nào ĐÚNG chuyên môn của bạn không? Chỉ nhận khi bạn thật sự cần làm (ví dụ "tra giá sản phẩm" chỉ Sale nhận; "tăng người theo dõi Fanpage" thì cả nhóm Marketing nhận; "báo cáo doanh thu" thì Kế toán nhận).
Chỉ trả về MỘT đối tượng JSON:
{"lienQuan":true,"viecCuaToi":"phần cụ thể bạn sẽ làm và ra sản phẩm gì","canChoAi":["tên đồng nghiệp cần làm xong trước bạn"],"lyDo":"vì sao"}`;

export const orderQuestion = (task, claims, staffList) => `ĐIỀU PHỐI VIỆC. Người dùng giao: "${task.title}"${task.description ? ` — ${task.description}` : ''}.
Các nhân viên đã tự nhận phần việc: ${JSON.stringify(claims.map((c) => ({ nguoi: c.name, vaiTro: c.role, viec: c.viec, canChoAi: c.canCho })))}
Danh sách nhân viên: ${staffList.map((s) => `${s.name} (${s.role})`).join(', ')}.
Sắp THỨ TỰ làm cho hợp lý (ai cần số liệu của ai thì làm sau người đó), mỗi người MỘT phần rõ ràng, có sản phẩm đầu ra; bỏ phần trùng; thêm người còn thiếu nếu cần. Không họp, không tranh luận.
Chỉ trả về MỘT đối tượng JSON:
{"thuTu":[{"nguoi":"Tuấn","viec":"...","sanPham":"...","sauKhi":["..."]}],"tomTat":"1-2 câu cách cả nhóm sẽ làm"}`;

const summaryQuestion = (task, plan) => `TỔNG KẾT CHO NGƯỜI DÙNG việc "${task.title}". Kết quả từng người nằm trong "Các lượt nói trước".
Viết ngắn gọn: đã làm được gì (theo từng người), còn gì đang chờ người dùng / chưa xong, bước tiếp theo đề xuất. Không bịa số liệu.
Phân việc: ${JSON.stringify(plan.map((p) => ({ nguoi: p.name, viec: p.viec, trangThai: p.status })))}`;

export function stepAsk(task, item) {
  return `Việc người dùng giao cho văn phòng: "${task.title}"${task.description ? ` — ${task.description}` : ''}.
PHẦN CỦA BẠN: ${item.viec}${item.sanPham ? `\nSản phẩm cần nộp: ${item.sanPham}` : ''}${item.from ? `\n(${item.from} nhờ bạn làm phần này)` : ''}
Kết quả của đồng nghiệp làm trước nằm trong "Các lượt nói trước" — dùng lại, không làm trùng.`;
}

// Nhân viên nhờ đồng nghiệp làm thêm một phần (thêm vào cuối danh sách nếu người đó chưa có phần chưa làm).
export function addDelegation(flow, staff, viec, fromName) {
  if (flow.plan.some((p) => p.staffId === staff.id && p.status !== 'done' && fold(p.viec) === fold(viec))) return false;
  flow.plan.push({ key: `p${flow.plan.length + 1}`, staffId: staff.id, name: staff.name, role: staff.role, viec: cut(viec, 600), sanPham: '', from: fromName, status: 'todo' });
  return true;
}

/**
 * io: { task, flow, save(), staffList, think(staff, ctx, {quick}) → {text, brainLabel}, work(step, ctx, trace) → {status, text?, trace, requestId?, brainLabel},
 *       outputs(), pushOutput(o), isStopped(), groupMessage?(staffId, text) }
 * Trả về { status: 'done' | 'waiting_user' | 'stopped' | 'in_progress', error? }
 */
export async function runTeamFlow(io) {
  const f = io.flow;
  const staff = io.staffList;
  const get = (id) => staff.find((s) => s.id === id);

  if (f.stage === 'triage') {
    const answers = await Promise.all(staff.map(async (s) => {
      try {
        const r = await io.think(s, { question: triageQuestion(io.task, s) }, { quick: true });
        const o = parseJson(r.text) || {};
        return { staffId: s.id, name: s.name, role: s.role, lienQuan: o.lienQuan === true, viec: cut(o.viecCuaToi, 600), canCho: (Array.isArray(o.canChoAi) ? o.canChoAi : []).map(String).slice(0, 5), lyDo: cut(o.lyDo, 300), brainLabel: r.brainLabel };
      } catch (e) {
        return { staffId: s.id, name: s.name, role: s.role, lienQuan: false, viec: '', canCho: [], lyDo: `Bộ não lỗi: ${e.message}`, error: true };
      }
    }));
    f.triage = answers;
    const claims = answers.filter((a) => a.lienQuan);
    if (claims.length > 1) {
      f.stage = 'order';
    } else {
      const c = claims[0] || { staffId: MANAGER, name: get(MANAGER).name, role: get(MANAGER).role, viec: `Không ai nhận việc này — Phúc tự xử lý hoặc hỏi lại người dùng cho rõ.` };
      f.plan = [{ key: 'p1', staffId: c.staffId, name: c.name, role: c.role, viec: c.viec, sanPham: '', status: 'todo' }];
      f.stage = 'work';
    }
    await io.save();
  }

  if (f.stage === 'order') {
    const claims = f.triage.filter((a) => a.lienQuan);
    let plan = [];
    try {
      const r = await io.think(get(MANAGER), { question: orderQuestion(io.task, claims, staff) });
      const o = parseJson(r.text);
      plan = (Array.isArray(o?.thuTu) ? o.thuTu : []).map((x) => ({ s: byName(staff, x.nguoi), x })).filter((p) => p.s)
        .map(({ s, x }, i) => ({ key: `p${i + 1}`, staffId: s.id, name: s.name, role: s.role, viec: cut(x.viec, 600) || claims.find((c) => c.staffId === s.id)?.viec || '', sanPham: cut(x.sanPham, 300), sauKhi: (x.sauKhi || []).map(String).slice(0, 5), status: 'todo' }));
      f.summaryPlan = cut(o?.tomTat, 600);
      f.orderLabel = r.brainLabel;
    } catch (e) {
      f.orderError = e.message;
    }
    if (!plan.length) plan = claims.map((c, i) => ({ key: `p${i + 1}`, staffId: c.staffId, name: c.name, role: c.role, viec: c.viec, sanPham: '', status: 'todo' }));
    f.plan = plan;
    f.stage = 'work';
    await io.save();
  }

  if (f.stage === 'work') {
    for (let i = 0; i < f.plan.length; i++) { // độ dài có thể tăng khi nhân viên nhờ đồng nghiệp
      const item = f.plan[i];
      if (item.status === 'done') continue;
      if (io.isStopped()) return { status: 'stopped' };
      const s = get(item.staffId);
      const step = { key: item.key, staff: s, label: `${s.name}: ${cut(item.viec, 140)}` };
      const prev = io.outputs().find((o) => o.key === item.key && o.waiting);
      item.status = 'doing'; await io.save();
      let r;
      try {
        r = await io.work(step, {
          question: stepAsk(io.task, item),
          priorTurns: io.outputs().filter((o) => !o.error && !o.waiting && o.text).map((o) => ({ nguoi: o.staffName, buoc: o.step, noiDung: cut(o.text, 2500) })),
          currentTask: { id: io.task.id, title: io.task.title },
        }, prev?.trace || []);
      } catch (e) {
        item.status = 'todo'; await io.save();
        io.pushOutput({ key: item.key, staffId: s.id, staffName: s.name, step: step.label, error: e.message, brainLabel: e.brainLabel });
        return { status: 'in_progress', error: `${s.name}: ${e.message}` };
      }
      if (r.status === 'waiting') {
        item.status = 'waiting'; await io.save();
        io.pushOutput({ key: item.key, staffId: s.id, staffName: s.name, step: step.label, waiting: true, requestId: r.requestId, trace: r.trace, text: '', brainLabel: r.brainLabel });
        return { status: 'waiting_user' };
      }
      item.status = 'done'; await io.save();
      io.pushOutput({ key: item.key, staffId: s.id, staffName: s.name, step: step.label, text: r.text, trace: r.trace, brainLabel: r.brainLabel });
    }
    f.stage = f.plan.length > 1 ? 'summary' : 'done';
    await io.save();
  }

  if (f.stage === 'summary') {
    const m = get(MANAGER);
    const r = await io.think(m, {
      question: summaryQuestion(io.task, f.plan),
      priorTurns: io.outputs().filter((o) => !o.error && o.text).map((o) => ({ nguoi: o.staffName, buoc: o.step, noiDung: cut(o.text, 2000) })),
    });
    io.pushOutput({ key: 'tongket', staffId: m.id, staffName: m.name, step: 'Phúc tổng kết cho bạn', text: r.text, brainLabel: r.brainLabel });
    f.stage = 'done';
    await io.save();
  }
  return { status: 'done' };
}
