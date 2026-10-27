// Cơ chế làm việc chung: đề xuất độc lập → phản biện chéo từng đề xuất → bảo vệ và sửa → chấm lại
// → Quản lý chọn ý tưởng tốt nhất (bất kể ai đề xuất) → thực hiện → Quản lý kiểm tra từng kết quả.
// Dùng chung cho server và bản trải nghiệm. Nơi gọi cung cấp `io` (cách gọi bộ não và lưu lượt nói).
//
// Trạng thái được suy ra từ các lượt đã lưu (meta.phase), nên chạy tiếp được sau khi khởi động lại.

import { MARKETING_STEPS, isMarketing, pickRelevantStaffIds, MANAGER_ID } from './core.js';

export const PHASES = ['propose', 'critique', 'revise', 'score'];
export const PHASE_TITLES = {
  propose: 'Vòng 1 — Đề xuất độc lập',
  critique: 'Vòng 2 — Phản biện chéo',
  revise: 'Vòng 3 — Bảo vệ và sửa kế hoạch',
  score: 'Vòng 4 — Chấm lại kế hoạch đã sửa',
  judge: 'Phúc chọn ý tưởng tốt nhất',
};

const JSON_ONLY = 'Chỉ trả về MỘT đối tượng JSON đúng mẫu dưới đây, không thêm chữ nào ngoài JSON.';

// ---------- Đọc JSON từ câu trả lời ----------
export function parseJsonLoose(text) {
  if (typeof text !== 'string') return null;
  const tries = [text.trim()];
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fence) tries.push(fence[1].trim());
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) tries.push(text.slice(a, b + 1));
  for (const t of tries) {
    try {
      const v = JSON.parse(t);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    } catch { /* thử cách khác */ }
  }
  return null;
}

const str = (v, max = 4000) => (v === undefined || v === null ? '' : String(v)).slice(0, max).trim();
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : null; };
const arr = (v) => (Array.isArray(v) ? v : []);

// ---------- Suy ra trạng thái từ các lượt đã lưu ----------
export function deliberationState(turns, participants) {
  const st = { proposals: [], critiques: [], revisions: [], scores: [], judge: null, userNotes: [] };
  for (const t of turns) {
    const m = t.meta || {};
    if (t.staffId === 'user') st.userNotes.push(t.text);
    if (m.phase === 'propose') st.proposals.push({ id: m.proposalId, author: t.staffId, text: m.text ?? t.text });
    if (m.phase === 'critique') st.critiques.push({ critic: t.staffId, items: arr(m.items), raw: m.parsed === false ? t.text : null });
    if (m.phase === 'revise') st.revisions.push({ author: t.staffId, proposalId: m.proposalId, text: m.revisedText, withdrawn: !!m.withdrawn, endorse: m.endorse || null, responses: arr(m.responses), raw: m.parsed === false ? t.text : null });
    if (m.phase === 'score') st.scores.push({ scorer: t.staffId, items: arr(m.items) });
    if (m.phase === 'judge') st.judge = { plan: m.plan || null, text: t.text };
  }
  st.done = (phase, staffId) => {
    const list = { propose: st.proposals.map((p) => p.author), critique: st.critiques.map((c) => c.critic), revise: st.revisions.map((r) => r.author), score: st.scores.map((s) => s.scorer) }[phase];
    return list.includes(staffId);
  };
  st.proposalIdOf = (staffId) => `P${participants.findIndex((p) => p.id === staffId) + 1}`;
  st.current = (pid) => { // kế hoạch hiện hành của một đề xuất (bản đã sửa nếu có)
    const r = st.revisions.find((x) => x.proposalId === pid);
    const p = st.proposals.find((x) => x.id === pid);
    if (!p) return null;
    return { ...p, text: r && !r.withdrawn && r.text ? r.text : p.text, revised: !!(r && r.text), withdrawn: !!r?.withdrawn, endorse: r?.endorse || null };
  };
  return st;
}

// Bảng điểm: điểm phản biện (vòng 2) và điểm chấm lại (vòng 4), trung bình, không tính tự chấm.
export function scoreboard(turns, participants, nameOf) {
  const st = deliberationState(turns, participants);
  return st.proposals.map((p) => {
    const avg = (list) => {
      const v = list.flatMap((x) => x.items.filter((i) => str(i.maDeXuat).toUpperCase() === p.id && x.who !== p.author).map((i) => num(i.diem)).filter((n) => n !== null));
      return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
    };
    const cur = st.current(p.id);
    return {
      proposalId: p.id, author: p.author, authorName: nameOf(p.author),
      critiqueScore: avg(st.critiques.map((c) => ({ who: c.critic, items: c.items }))),
      finalScore: avg(st.scores.map((s) => ({ who: s.scorer, items: s.items }))),
      revised: cur.revised, withdrawn: cur.withdrawn, endorse: cur.endorse,
    };
  });
}

// ---------- Câu hỏi cho từng vòng ----------
const taskLine = (task) => `Việc chung: "${task.title}"${task.description ? ` — ${task.description}` : ''}.`;
const notes = (st) => (st.userNotes.length ? `\nGóp ý của người dùng trong phiên (phải tính đến): ${st.userNotes.map((n) => `"${n}"`).join('; ')}` : '');
const label = (pid, staff) => `${pid} (${staff?.name || '?'} — ${staff?.role || ''})`;

function proposeQuestion(task, st) {
  return `${taskLine(task)}
VÒNG 1 — ĐỀ XUẤT ĐỘC LẬP. Bạn chưa thấy đề xuất của ai. Suy nghĩ kỹ và đưa ra KẾ HOẠCH TỐT NHẤT theo bạn cho TOÀN BỘ việc này, không giới hạn ở phần chuyên môn của bạn:
- mục tiêu đo được;
- các bước cụ thể theo thứ tự, mỗi bước ai nên làm và vì sao;
- căn cứ: dữ kiện đã có và dữ kiện còn thiếu (thiếu thì nói rõ, không bịa);
- rủi ro chính và cách kiểm chứng sớm.${notes(st)}`;
}

function critiqueQuestion(task, st, me, staffOf) {
  const others = st.proposals.filter((p) => p.author !== me.id);
  return `${taskLine(task)}
VÒNG 2 — PHẢN BIỆN CHÉO. Xét LẦN LƯỢT TỪNG đề xuất dưới đây, mỗi đề xuất một mục riêng. Với mỗi đề xuất: chỉ ra điểm mạnh thật sự, lỗi lập luận hoặc chỗ thiếu căn cứ, giả định cần kiểm chứng bằng dữ kiện, rủi ro, rồi chấm điểm 0–10 theo hiệu quả, tính khả thi, chi phí, rủi ro và mức có căn cứ. Không khen chung chung, không chấm nể. Ý tưởng tốt thì nói tốt dù không phải chuyên môn của người đó.

${others.map((p) => `### ${label(p.id, staffOf(p.author))}\n${p.text}`).join('\n\n')}
${notes(st)}
${JSON_ONLY}
{"danhGia":[{"maDeXuat":"P2","diemManh":"...","diemYeu":"lỗi lập luận / thiếu căn cứ","canKiemChung":"giả định hoặc số liệu cần kiểm tra","ruiRo":"...","diem":7}],"nhanXet":"nhận xét chung ngắn"}
Mã đề xuất cần xét: ${others.map((p) => p.id).join(', ')}`;
}

function reviseQuestion(task, st, me, staffOf) {
  const pid = st.proposalIdOf(me.id);
  const mine = st.proposals.find((p) => p.id === pid);
  const crit = st.critiques.flatMap((c) => c.items.filter((i) => str(i.maDeXuat).toUpperCase() === pid).map((i) => ({ ...i, critic: staffOf(c.critic)?.name })));
  const others = st.proposals.filter((p) => p.id !== pid);
  return `${taskLine(task)}
VÒNG 3 — BẢO VỆ VÀ SỬA. Đây là đề xuất ${pid} của bạn và các ý phản biện nhắm vào nó. Trả lời TỪNG ý phản biện: chấp nhận (và sửa) hoặc bác bỏ kèm lý lẽ và căn cứ. Sau đó viết lại kế hoạch đã sửa. Nếu thấy đề xuất của người khác tốt hơn của mình, hãy thẳng thắn rút đề xuất và ghi mã đề xuất bạn ủng hộ.

### Đề xuất ${pid} của bạn
${mine?.text || '(không có)'}

### Phản biện nhắm vào ${pid}
${crit.length ? crit.map((c) => `- ${c.critic}: mạnh: ${str(c.diemManh)} | yếu: ${str(c.diemYeu)} | cần kiểm chứng: ${str(c.canKiemChung)} | rủi ro: ${str(c.ruiRo)} | điểm ${c.diem}`).join('\n') : '(chưa có phản biện)'}

### Các đề xuất khác để so sánh
${others.map((p) => `- ${label(p.id, staffOf(p.author))}: ${p.text.slice(0, 1500)}`).join('\n')}
${notes(st)}
${JSON_ONLY}
{"phanHoi":[{"nguoiPhanBien":"tên","yKien":"tóm tắt ý phản biện","chapNhan":true,"lyDo":"..."}],"rutDeXuat":false,"ungHo":"","keHoachSua":"toàn văn kế hoạch đã sửa"}`;
}

function scoreQuestion(task, st, me, staffOf) {
  const list = st.proposals.filter((p) => p.author !== me.id).map((p) => st.current(p.id));
  return `${taskLine(task)}
VÒNG 4 — CHẤM LẠI. Đây là các kế hoạch SAU KHI đã bị phản biện và sửa. Xét lần lượt từng kế hoạch, kiểm tra lỗi đã được sửa thật chưa, rồi chấm 0–10 kèm lý do. Đề xuất đã rút vẫn có thể có ý hay đáng giữ. Nêu ý nào nên ghép từ nhiều kế hoạch.

${list.map((p) => `### ${label(p.id, staffOf(p.author))}${p.withdrawn ? ` — ĐÃ RÚT${p.endorse ? `, ủng hộ ${p.endorse}` : ''}` : p.revised ? ' — đã sửa' : ''}\n${p.text}`).join('\n\n')}
${notes(st)}
${JSON_ONLY}
{"cham":[{"maDeXuat":"P1","diem":8,"lyDo":"..."}],"yTuongNenGhep":"ý nào từ kế hoạch nào nên ghép"}
Mã đề xuất cần chấm: ${list.map((p) => p.id).join(', ')}`;
}

function judgeQuestion(task, st, board, staffOf, allStaff) {
  const ref = isMarketing(`${task.title}\n${task.description || ''}`)
    ? `\nQuy trình Marketing 5 bước để THAM KHẢO (không bắt buộc, được đổi người và thứ tự nếu có lý do): ${MARKETING_STEPS.map((s) => `${s.step}. ${s.title}`).join('; ')}.` : '';
  const crit = st.critiques.flatMap((c) => c.items.map((i) => `- ${staffOf(c.critic)?.name} về ${str(i.maDeXuat)}: yếu: ${str(i.diemYeu, 400)} | cần kiểm chứng: ${str(i.canKiemChung, 300)}`));
  return `${taskLine(task)}
${st.proposals.length ? '' : 'Phiên đã chốt trước khi có đề xuất nào: bạn tự lập kế hoạch tốt nhất từ thông tin việc và góp ý của người dùng, giao bước theo năng lực.\n'}BẠN LÀ NGƯỜI CHỌN. Xét LẦN LƯỢT TỪNG đề xuất (bản đã sửa) cùng bảng điểm và các phản biện. Chọn ý tưởng theo CHẤT LƯỢNG và LÝ LẼ, không theo chức danh hay quy trình mặc định: ý của ai tốt thì dùng, được ghép ý từ nhiều người. Giao từng bước cho người có ý tưởng hoặc năng lực tốt nhất với bước đó, không bắt buộc đúng vai trò. Rủi ro pháp lý vẫn để Minh chốt, số liệu tài chính vẫn để Hà chốt, nếu việc có liên quan thì ghi vào kế hoạch.${ref}
Nhân sự có thể giao việc: ${allStaff.map((s) => `${s.name} (${s.role})`).join(', ')}.

### Bảng điểm (trung bình, không tính tự chấm)
${board.map((b) => `- ${b.proposalId} của ${b.authorName}: phản biện ${b.critiqueScore ?? '—'}, chấm lại ${b.finalScore ?? '—'}${b.withdrawn ? ` (đã rút${b.endorse ? `, ủng hộ ${b.endorse}` : ''})` : ''}`).join('\n')}

### Các kế hoạch hiện hành
${st.proposals.map((p) => { const c = st.current(p.id); return `### ${label(p.id, staffOf(p.author))}${c.withdrawn ? ' — ĐÃ RÚT' : ''}\n${c.text}`; }).join('\n\n')}

### Phản biện chính
${crit.join('\n').slice(0, 12000) || '(không có)'}
${notes(st)}
${JSON_ONLY}
{"xetTungDeXuat":[{"maDeXuat":"P1","tacGia":"tên","ketLuan":"dùng | dùng một phần | loại","lyDo":"..."}],"yTuongDuocChon":[{"maDeXuat":"P2","tacGia":"tên","noiDung":"ý được dùng","lyDo":"vì sao tốt nhất"}],"kiemTraChotCuoi":"điểm cần Minh / Hà chốt, nếu có","keHoach":[{"buoc":1,"viec":"...","nguoiThucHien":"tên nhân viên","lyDoChonNguoi":"...","mocKiemTra":"...","tieuChiDat":"..."}],"tomTat":"bản chốt ngắn gọn"}`;
}

// ---------- Hiển thị câu trả lời có cấu trúc thành chữ ----------
const renderCritique = (o, staffOf, st) => [
  ...arr(o.danhGia).map((d) => {
    const p = st.proposals.find((x) => x.id === str(d.maDeXuat).toUpperCase());
    return `▸ ${str(d.maDeXuat)}${p ? ` (${staffOf(p.author)?.name})` : ''} — ${num(d.diem) ?? '?'}/10\n  Mạnh: ${str(d.diemManh)}\n  Yếu: ${str(d.diemYeu)}\n  Cần kiểm chứng: ${str(d.canKiemChung)}\n  Rủi ro: ${str(d.ruiRo)}`;
  }),
  o.nhanXet ? `Nhận xét chung: ${str(o.nhanXet)}` : '',
].filter(Boolean).join('\n\n');

const renderRevise = (o, pid) => [
  ...arr(o.phanHoi).map((r) => `▸ ${str(r.nguoiPhanBien)}: "${str(r.yKien, 500)}" → ${r.chapNhan ? 'CHẤP NHẬN' : 'BÁC BỎ'}: ${str(r.lyDo)}`),
  o.rutDeXuat ? `RÚT đề xuất ${pid}${o.ungHo ? `, ủng hộ ${str(o.ungHo)}` : ''}.` : `KẾ HOẠCH ${pid} ĐÃ SỬA:\n${str(o.keHoachSua, 8000)}`,
].join('\n\n');

const renderScore = (o) => [
  ...arr(o.cham).map((c) => `▸ ${str(c.maDeXuat)}: ${num(c.diem) ?? '?'}/10 — ${str(c.lyDo)}`),
  o.yTuongNenGhep ? `Nên ghép: ${str(o.yTuongNenGhep)}` : '',
].filter(Boolean).join('\n');

export function renderJudge(o) {
  return [
    'BẢN CHỐT',
    'Xét từng đề xuất:', ...arr(o.xetTungDeXuat).map((x) => `▸ ${str(x.maDeXuat)} (${str(x.tacGia)}): ${str(x.ketLuan)} — ${str(x.lyDo)}`),
    'Ý tưởng được dùng:', ...arr(o.yTuongDuocChon).map((x) => `▸ ${str(x.noiDung)} — của ${str(x.tacGia)} (${str(x.maDeXuat)}): ${str(x.lyDo)}`),
    o.kiemTraChotCuoi ? `Cần chốt cuối: ${str(o.kiemTraChotCuoi)}` : '',
    'Kế hoạch thực hiện:', ...arr(o.keHoach).map((k) => `${k.buoc}. ${str(k.viec)} — ${str(k.nguoiThucHien)} (${str(k.lyDoChonNguoi)}). Mốc: ${str(k.mocKiemTra)}. Đạt khi: ${str(k.tieuChiDat)}`),
    o.tomTat ? `Tóm tắt: ${str(o.tomTat)}` : '',
  ].filter(Boolean).join('\n');
}

// ---------- Chạy các vòng tranh luận ----------
/**
 * io: {
 *   task, participants, allStaff, manager,
 *   turns(): lượt đã lưu [{staffId, text, brainLabel, meta}],
 *   think(staff, ctx) → {text, brainLabel} (ném lỗi có message/brainLabel),
 *   record(staffId, text, brainLabel, meta), recordError(staff, message, brainLabel),
 *   baseCtx(): bối cảnh việc chung (currentTask, attachments, imageIds),
 *   isOpen(): phiên còn mở (chưa chốt, chưa hết giờ), isStopped(): Quản lý đã dừng
 * }
 * Trả về 'complete' | 'closed' | 'stopped' | 'error'.
 */
export async function runDebatePhases(io) {
  const staffOf = (id) => io.allStaff.find((s) => s.id === id);
  for (const phase of PHASES) {
    let failures = 0, attempted = 0;
    for (const me of io.participants) {
      if (io.isStopped()) return 'stopped';
      if (!io.isOpen()) return 'closed';
      const st = deliberationState(io.turns(), io.participants);
      if (st.done(phase, me.id)) continue;
      const pid = st.proposalIdOf(me.id);
      if (phase === 'revise' && !st.proposals.some((p) => p.id === pid)) continue; // không có đề xuất để sửa
      if ((phase === 'critique' || phase === 'score') && !st.proposals.some((p) => p.author !== me.id)) continue;
      attempted++;
      try {
        if (phase === 'propose') {
          const r = await io.think(me, { ...io.baseCtx(), question: proposeQuestion(io.task, st), priorTurns: [] });
          io.record(me.id, `ĐỀ XUẤT ${pid}:\n${r.text}`, r.brainLabel, { phase, proposalId: pid, text: r.text });
        } else if (phase === 'critique') {
          const r = await io.think(me, { ...io.baseCtx(), question: critiqueQuestion(io.task, st, me, staffOf) });
          const o = parseJsonLoose(r.text);
          io.record(me.id, o ? `PHẢN BIỆN CHÉO:\n${renderCritique(o, staffOf, st)}` : `PHẢN BIỆN CHÉO:\n${r.text}`, r.brainLabel,
            { phase, items: o ? arr(o.danhGia).map((d) => ({ ...d, maDeXuat: str(d.maDeXuat).toUpperCase(), diem: num(d.diem) })) : [], parsed: !!o });
        } else if (phase === 'revise') {
          const r = await io.think(me, { ...io.baseCtx(), question: reviseQuestion(io.task, st, me, staffOf) });
          const o = parseJsonLoose(r.text);
          io.record(me.id, o ? renderRevise(o, pid) : `KẾ HOẠCH ${pid} ĐÃ SỬA:\n${r.text}`, r.brainLabel, {
            phase, proposalId: pid, parsed: !!o, withdrawn: !!o?.rutDeXuat, endorse: o?.ungHo ? str(o.ungHo).toUpperCase() : null,
            revisedText: o ? (o.rutDeXuat ? '' : str(o.keHoachSua, 8000)) : r.text, responses: o ? arr(o.phanHoi) : [],
          });
        } else {
          const r = await io.think(me, { ...io.baseCtx(), question: scoreQuestion(io.task, st, me, staffOf) });
          const o = parseJsonLoose(r.text);
          io.record(me.id, `CHẤM LẠI:\n${o ? renderScore(o) : r.text}`, r.brainLabel,
            { phase, items: o ? arr(o.cham).map((c) => ({ ...c, maDeXuat: str(c.maDeXuat).toUpperCase(), diem: num(c.diem) })) : [], parsed: !!o });
        }
      } catch (e) {
        failures++;
        io.recordError(me, e.message, e.brainLabel);
      }
    }
    if (attempted && failures === attempted) return 'error'; // giữ nguyên trạng thái để thử lại
  }
  return 'complete';
}

// Phúc chọn ý tưởng tốt nhất. Trả về {text, plan} hoặc ném lỗi.
export async function runJudge(io) {
  const staffOf = (id) => io.allStaff.find((s) => s.id === id);
  const st = deliberationState(io.turns(), io.participants);
  const board = scoreboard(io.turns(), io.participants, (id) => staffOf(id)?.name || id);
  const r = await io.think(io.manager, { ...io.baseCtx(), question: judgeQuestion(io.task, st, board, staffOf, io.allStaff) });
  const o = parseJsonLoose(r.text);
  const plan = o && arr(o.keHoach).length ? o : null;
  const text = plan ? renderJudge(plan) : `BẢN CHỐT:\n${r.text}`;
  io.record(io.manager.id, text, r.brainLabel, { phase: 'judge', plan });
  return { text, plan };
}

// Các bước trong bản chốt, dạng gọn để giao diện hiển thị tiến trình theo từng người.
export function planSteps(plan, allStaff) {
  if (!plan) return [];
  return arr(plan.keHoach).map((k, i) => {
    const s = resolveStaff(k.nguoiThucHien, allStaff);
    return { key: `b${i + 1}`, label: `Bước ${k.buoc ?? i + 1}: ${str(k.viec, 300)}`, staffId: s?.id || null, staffName: s?.name || str(k.nguoiThucHien), criteria: str(k.tieuChiDat) };
  });
}

// ---------- Thực hiện theo bản chốt + Quản lý kiểm tra từng kết quả ----------
// Một bước "làm": có io.work thì nhân viên làm việc thật (xem phần mềm, hỏi người dùng, xin duyệt đăng — shared/worker.js),
// không thì chỉ suy nghĩ một lượt. Bước đang chờ người dùng được lưu lại (waiting + trace) và chạy tiếp từ đó.
async function doStep(io, s, ctx) {
  if (!io.work) {
    const r = await io.think(s.staff, ctx);
    return { status: 'done', text: r.text, brainLabel: r.brainLabel };
  }
  const prev = io.outputs().find((o) => o.key === s.key && o.waiting);
  return io.work(s, ctx, prev?.trace || []);
}
function stepOutput(base, r) {
  if (r.status === 'waiting') return { ...base, waiting: true, requestId: r.requestId, trace: r.trace, text: '', brainLabel: r.brainLabel };
  return { ...base, text: r.text, brainLabel: r.brainLabel, ...(r.trace?.length ? { trace: r.trace } : {}) };
}
export function resolveStaff(name, allStaff) {
  const n = str(name).toLocaleLowerCase('vi');
  if (!n) return null;
  return allStaff.find((s) => s.name.toLocaleLowerCase('vi') === n)
    || allStaff.find((s) => n.split(/[\s,()/-]+/).includes(s.name.toLocaleLowerCase('vi'))) || null;
}

/**
 * io: { task, allStaff, manager, think, baseCtx, outputs(), pushOutput(o), isStopped() }
 * plan: kết quả runJudge().plan (null → làm theo danh sách mặc định).
 * Trả về {status: 'done'|'returned_for_redo'|'in_progress'|'stopped', returnReason?, passCriteria?, error?}
 */
export async function executeWithReview(io, plan, fallbackSteps, summaryText) {
  const steps = plan
    ? arr(plan.keHoach).map((k, i) => ({
      key: `b${i + 1}`, label: `Bước ${k.buoc ?? i + 1}: ${str(k.viec, 300)}`, staff: resolveStaff(k.nguoiThucHien, io.allStaff) || io.manager,
      why: str(k.lyDoChonNguoi), checkpoint: str(k.mocKiemTra), criteria: str(k.tieuChiDat),
      ask: `Bạn được giao bước này vì: ${str(k.lyDoChonNguoi) || 'Quản lý chọn'}. Việc: ${str(k.viec)}. Mốc kiểm tra: ${str(k.mocKiemTra)}. Tiêu chí đạt: ${str(k.tieuChiDat)}.`,
    }))
    : fallbackSteps;
  const done = () => io.outputs();
  for (const s of steps) {
    if (io.isStopped()) return { status: 'stopped' };
    if (done().some((o) => o.key === s.key && !o.error && !o.waiting)) continue;
    const base = { key: s.key, staffId: s.staff.id, staffName: s.staff.name, step: s.label, why: s.why || null, criteria: s.criteria || null };
    try {
      const r = await doStep(io, s, {
        ...io.baseCtx(),
        question: `${summaryText ? `Bản chốt của Phúc:\n${summaryText}\n\n` : ''}${s.ask}\nHãy thực hiện bước này và trả về KẾT QUẢ CỤ THỂ (sản phẩm, nội dung, số liệu đã có, việc đã làm), tự kiểm tra lại theo tiêu chí đạt trước khi nộp.`,
        priorTurns: done().filter((o) => !o.error && !o.waiting).map((o) => ({ nguoi: o.staffName, buoc: o.step, noiDung: o.text })),
      });
      io.pushOutput(stepOutput(base, r));
    } catch (e) {
      io.pushOutput({ ...base, error: e.message, brainLabel: e.brainLabel });
    }
  }
  if (io.isStopped()) return { status: 'stopped' };
  if (done().some((o) => o.waiting)) return { status: 'waiting_user' };
  const results = done().filter((o) => o.key !== 'review');
  const failed = results.filter((o) => o.error);
  if (failed.length) return { status: 'in_progress', error: failed.map((f) => `${f.staffName}: ${f.error}`).join('\n') };

  // Quản lý kiểm tra TỪNG kết quả theo tiêu chí đạt
  try {
    const r = await io.think(io.manager, {
      ...io.baseCtx(),
      question: `KIỂM TRA KẾT QUẢ việc "${io.task.title}". Xét LẦN LƯỢT TỪNG bước dưới đây theo tiêu chí đạt của nó: kết quả có đúng, đủ, có căn cứ, không bịa số liệu không. Đánh giá thẳng, bước nào chưa đạt thì nói rõ vì sao và cần làm lại gì.

${results.map((o, i) => `### ${i + 1}. ${o.step} — ${o.staffName}${o.criteria ? ` (đạt khi: ${o.criteria})` : ''}\n${o.text}`).join('\n\n')}

${JSON_ONLY}
{"danhGia":[{"buoc":1,"dat":true,"lyDo":"..."}],"ketLuan":"..."}`,
    });
    const o = parseJsonLoose(r.text);
    const evals = o ? arr(o.danhGia) : [];
    const failedSteps = evals.filter((e) => e.dat === false);
    const text = o
      ? `KIỂM TRA KẾT QUẢ:\n${evals.map((e) => `▸ Bước ${e.buoc}: ${e.dat ? 'ĐẠT' : 'CHƯA ĐẠT'} — ${str(e.lyDo)}`).join('\n')}\nKết luận: ${str(o.ketLuan)}`
      : `KIỂM TRA KẾT QUẢ:\n${r.text}`;
    io.pushOutput({ key: 'review', staffId: io.manager.id, staffName: io.manager.name, step: 'Phúc kiểm tra từng kết quả', text, brainLabel: r.brainLabel });
    if (failedSteps.length) {
      return {
        status: 'returned_for_redo',
        returnReason: failedSteps.map((e) => `Bước ${e.buoc}: ${str(e.lyDo)}`).join('; '),
        passCriteria: failedSteps.map((e) => { const s = results[Number(e.buoc) - 1]; return `Bước ${e.buoc}: ${s?.criteria || 'đạt yêu cầu của Quản lý'}`; }).join('; '),
      };
    }
    return { status: 'done' };
  } catch (e) {
    return { status: 'in_progress', error: `Phúc kiểm tra kết quả: ${e.message}` };
  }
}

// ---------- Việc riêng: bản nháp → đồng nghiệp phản biện → sửa từng điểm ----------
export function reviewerFor(task, assignee, allStaff) {
  const ids = pickRelevantStaffIds(`${task.title}\n${task.description || ''}`).filter((id) => id !== assignee.id);
  const id = assignee.id === MANAGER_ID ? (ids[0] || 'STAFF-003') : (ids[0] || MANAGER_ID);
  return allStaff.find((s) => s.id === id);
}

export function individualSteps(task, assignee, reviewer) {
  const what = `"${task.title}"${task.description ? `: ${task.description}` : ''}`;
  const redo = task.returnReason ? `\nViệc đã bị trả làm lại. Lý do: ${task.returnReason}. Tiêu chí đạt: ${task.passCriteria}.` : '';
  return [
    { key: 'draft', staff: assignee, label: 'Bản nháp', ask: `Thực hiện việc ${what}. Suy nghĩ từng bước và đưa ra kết quả cụ thể.${redo}` },
    {
      key: 'peer', staff: reviewer, label: `Phản biện của ${reviewer.name}`, json: true,
      ask: `Đồng nghiệp ${assignee.name} (${assignee.role}) vừa làm việc ${what}. Bản nháp của họ nằm trong "Các lượt nói trước". Phản biện TỪNG điểm: chỗ đúng, lỗi lập luận, chỗ thiếu căn cứ hoặc bịa số liệu, cách làm tốt hơn (dù ngoài chuyên môn của ai).
${JSON_ONLY}
{"diemManh":"...","vanDe":[{"diem":"vấn đề","lyDo":"...","deXuat":"cách sửa"}],"canKiemChung":"...","yTuongTotHon":"nếu có","diem":7}`,
    },
    { key: 'final', staff: assignee, label: 'Bản cuối sau phản biện', ask: `${reviewer.name} đã phản biện bản nháp của bạn (xem "Các lượt nói trước"). Trả lời TỪNG ý: chấp nhận và sửa, hoặc bác bỏ kèm lý lẽ. Ý tưởng của ${reviewer.name} tốt hơn thì dùng. Sau đó đưa ra KẾT QUẢ CUỐI hoàn chỉnh của việc ${what}.` },
  ];
}

export function renderPeerReview(text) {
  const o = parseJsonLoose(text);
  if (!o) return text;
  return [
    `Điểm mạnh: ${str(o.diemManh)}`,
    ...arr(o.vanDe).map((v) => `▸ ${str(v.diem)} — ${str(v.lyDo)} → Đề xuất: ${str(v.deXuat)}`),
    o.canKiemChung ? `Cần kiểm chứng: ${str(o.canKiemChung)}` : '',
    o.yTuongTotHon ? `Ý tưởng tốt hơn: ${str(o.yTuongTotHon)}` : '',
    num(o.diem) !== null ? `Điểm: ${num(o.diem)}/10` : '',
  ].filter(Boolean).join('\n');
}

// ---------- Chat nhóm: người sau xét từng câu trả lời trước; Phúc kết luận ý tốt nhất ----------
export const GROUP_CRITIQUE_INSTRUCTION = 'Trước khi nêu ý của bạn, xét LẦN LƯỢT TỪNG câu trả lời của đồng nghiệp trong lượt này: đúng ở đâu, sai hoặc thiếu căn cứ ở đâu, kiểm tra chéo với dữ kiện. Ý của người khác tốt hơn thì nói thẳng và ủng hộ, không giữ ý mình vì sĩ diện. Sau đó mới bổ sung ý mới có lý lẽ.';

export const groupConclusionQuestion = (question) =>
  `Người dùng hỏi: "${question}". Các đồng nghiệp đã trả lời và phản biện nhau (xem "Các lượt nói trước"). Xét TỪNG câu trả lời một, chỉ ra ý nào có lý lẽ và căn cứ tốt nhất, ghi rõ ý đó của ai và vì sao (không theo chức danh), ghép ý hay từ nhiều người nếu hợp lý, rồi đưa KẾT LUẬN ngắn gọn và bước tiếp theo.`;

export const consultDecisionQuestion = (question) =>
  `Bạn đã hỏi ý kiến đồng nghiệp về: ${question}. Xét TỪNG ý kiến một: lý lẽ nào đứng vững, chỗ nào thiếu căn cứ, kiểm tra chéo với dữ kiện. Chọn ý tốt nhất dù của ai, nói rõ vì sao, rồi tự chốt quyết định của bạn.`;

/**
 * Chạy việc riêng có kiểm tra chéo. io: { task, assignee, reviewer, think, baseCtx, outputs(), pushOutput(o), isStopped() }
 * Trả về {status: 'done'|'in_progress'|'stopped', error?}
 */
export async function runIndividual(io) {
  for (const s of individualSteps(io.task, io.assignee, io.reviewer)) {
    if (io.isStopped()) return { status: 'stopped' };
    if (io.outputs().some((o) => o.key === s.key && !o.error && !o.waiting)) continue;
    const base = { key: s.key, staffId: s.staff.id, staffName: s.staff.name, step: s.label };
    try {
      const ctx = {
        ...io.baseCtx(),
        question: s.ask,
        priorTurns: io.outputs().filter((o) => !o.error && !o.waiting).map((o) => ({ nguoi: o.staffName, buoc: o.step, noiDung: o.text })),
      };
      // Phản biện của đồng nghiệp là một lượt suy nghĩ; bản nháp và bản cuối là làm việc thật.
      const r = s.json ? { status: 'done', ...(await io.think(s.staff, ctx)) } : await doStep(io, s, ctx);
      if (s.json) r.text = renderPeerReview(r.text);
      io.pushOutput(stepOutput(base, r));
      if (r.status === 'waiting') return { status: 'waiting_user' };
    } catch (e) {
      io.pushOutput({ key: s.key, staffId: s.staff.id, staffName: s.staff.name, step: s.label, error: e.message, brainLabel: e.brainLabel });
      return { status: 'in_progress', error: `${s.staff.name}: ${e.message}` };
    }
  }
  return { status: 'done' };
}
