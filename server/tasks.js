// Việc riêng / việc chung, phiên phản biện tự động tối đa 10 phút, quyền dừng của Quản lý.
import { db, now, newId } from './db.js';
import { getStaff, listStaff, pickRelevantStaffIds, MANAGER_ID, isMarketing } from './roster.js';
import { selectBrain, thinkWithBrain, kindOfText } from './brain.js';
import { executionPlan } from '../shared/core.js';
import { runDebatePhases, runJudge, executeWithReview, runIndividual, reviewerFor, scoreboard } from '../shared/deliberation.js';
import { runLearning, TRAINER_ID } from '../shared/staffkit.js';
import { applyLessons } from './staffops.js';

export const DEBATE_MINUTES = Number(process.env.DEBATE_MINUTES || 10);

export function rowToTask(r) {
  return {
    id: r.id, title: r.title, description: r.description, kind: r.kind, taskKind: r.task_kind,
    assigneeIds: JSON.parse(r.assignee_ids), createdBy: r.created_by, status: r.status,
    attachments: JSON.parse(r.attachments).map(({ data, ...a }) => ({ ...a, hasImage: !!data })),
    debateSessionId: r.debate_session_id, returnReason: r.return_reason, passCriteria: r.pass_criteria,
    stopReason: r.stop_reason, legalCleared: !!r.legal_cleared, lastError: r.last_error,
    outputs: JSON.parse(r.outputs), createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function getTaskRow(accountId, id) {
  return db.prepare('SELECT * FROM tasks WHERE account_id = ? AND id = ?').get(accountId, id);
}

export function updateTask(accountId, id, fields) {
  const cols = Object.keys(fields);
  db.prepare(`UPDATE tasks SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE account_id = ? AND id = ?`)
    .run(...cols.map((c) => fields[c]), now(), accountId, id);
}

export function isTaskBlocked(accountId, taskId) {
  if (!taskId) return false;
  const t = getTaskRow(accountId, taskId);
  return t?.status === 'stopped_by_manager';
}

export function createTask(accountId, { title, description = '', kind, assigneeIds, attachments = [], createdBy = 'user', taskKind }) {
  if (!title?.trim()) throw new Error('Thiếu tên việc.');
  if (attachments.length > 4) throw new Error('Tối đa 4 ảnh cho mỗi nhiệm vụ.');
  const text = `${title}\n${description}`;
  let ids = (assigneeIds || []).filter((id) => getStaff(accountId, id));
  if (kind === 'individual' && ids.length !== 1) throw new Error('Việc riêng cần đúng 1 nhân viên phụ trách.');
  if (kind === 'general' && ids.length === 0) ids = pickRelevantStaffIds(text);
  if (kind === 'general' && isMarketing(text) && ids.includes('STAFF-003')) {
    ids = ['STAFF-003', ...ids.filter((x) => x !== 'STAFF-003')]; // Tuấn chạy đầu tiên
  }
  const id = newId('T-');
  const ts = now();
  db.prepare(`INSERT INTO tasks (id, account_id, title, description, kind, task_kind, assignee_ids, created_by, status, attachments, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`)
    .run(id, accountId, title.trim(), description, kind, taskKind || kindOfText(text), JSON.stringify(ids), createdBy,
      JSON.stringify(attachments), ts, ts);
  return id;
}

function taskContext(row) {
  const t = rowToTask(row);
  return {
    currentTask: { id: t.id, title: t.title, description: t.description, status: t.status, returnReason: t.returnReason, passCriteria: t.passCriteria },
    attachments: JSON.parse(row.attachments),
  };
}

// ---------- Phiên tranh luận: đề xuất → phản biện chéo → sửa → chấm lại → Phúc chọn ----------
try { db.exec('ALTER TABLE debate_turns ADD COLUMN meta TEXT'); } catch { /* đã có */ }
try { db.exec('ALTER TABLE debate_sessions ADD COLUMN final_plan TEXT'); } catch { /* đã có */ }

const running = new Set();
const finishing = new Set();
const executing = new Set();

function sessionTurns(sessionId) {
  return db.prepare('SELECT * FROM debate_turns WHERE session_id = ? ORDER BY created_at, rowid').all(sessionId)
    .map((t) => ({ id: t.id, staffId: t.staff_id, text: t.text, brainLabel: t.brain_label, createdAt: t.created_at, meta: t.meta ? JSON.parse(t.meta) : null }));
}

export function getSession(accountId, id) {
  const s = db.prepare('SELECT * FROM debate_sessions WHERE account_id = ? AND id = ?').get(accountId, id);
  if (!s) return null;
  const turns = sessionTurns(id);
  const row = getTaskRow(accountId, s.task_id);
  const participants = JSON.parse(row.assignee_ids).map((x) => getStaff(accountId, x)).filter(Boolean);
  return {
    id: s.id, taskId: s.task_id, startedAt: s.started_at, deadlineAt: s.deadline_at, status: s.status, finalSummary: s.final_summary,
    turns: turns.map((t) => ({ ...t, phase: t.meta?.phase || null, meta: undefined })),
    scoreboard: scoreboard(turns, participants, (x) => getStaff(accountId, x)?.name || x),
    runnerActive: running.has(id) || finishing.has(id) || executing.has(s.task_id),
  };
}

function appendTurn(accountId, sessionId, staffId, text, brainLabel, meta = null) {
  db.prepare('INSERT INTO debate_turns (id, account_id, session_id, staff_id, text, brain_label, created_at, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(newId('DT-'), accountId, sessionId, staffId, text, brainLabel, now(), meta ? JSON.stringify(meta) : null);
}

function sessionRow(id) {
  return db.prepare('SELECT * FROM debate_sessions WHERE id = ?').get(id);
}

export function startGeneralTask(accountId, taskId) {
  const row = getTaskRow(accountId, taskId);
  if (!row) throw new Error('Không tìm thấy việc.');
  if (row.status === 'stopped_by_manager') throw new Error('Việc đang bị Quản lý dừng.');
  let sessionId = row.debate_session_id;
  if (!sessionId || sessionRow(sessionId)?.status !== 'running') {
    sessionId = newId('DS-');
    const start = new Date();
    const deadline = new Date(start.getTime() + DEBATE_MINUTES * 60 * 1000);
    db.prepare('INSERT INTO debate_sessions (id, account_id, task_id, started_at, deadline_at, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(sessionId, accountId, taskId, start.toISOString(), deadline.toISOString(), 'running');
    updateTask(accountId, taskId, { debate_session_id: sessionId, status: 'debating', last_error: null, outputs: '[]' });
  }
  runDebate(accountId, sessionId).catch((e) => console.error('debate', e));
  return sessionId;
}

// Bộ não của nhân viên, có ghi lỗi nhà cung cấp vào phiên để người dùng thấy.
function thinker(accountId, sessionId, taskKind) {
  return async (staff, ctx) => {
    const r = await thinkWithBrain(accountId, staff, selectBrain(accountId, staff, staff.id === MANAGER_ID ? 'deep_analysis' : taskKind), ctx);
    if (sessionId) for (const pe of r.providerErrors) appendTurn(accountId, sessionId, 'system', `Lỗi bộ não của ${staff.name} (${pe.label}): ${pe.error}`, 'hệ thống');
    return r;
  };
}

function debateIo(accountId, sessionId) {
  const s = sessionRow(sessionId);
  const row = getTaskRow(accountId, s.task_id);
  const task = rowToTask(row);
  return {
    task,
    participants: task.assigneeIds.map((x) => getStaff(accountId, x)).filter(Boolean),
    allStaff: listStaff(accountId),
    manager: getStaff(accountId, MANAGER_ID),
    turns: () => sessionTurns(sessionId),
    think: thinker(accountId, sessionId, row.task_kind),
    record: (staffId, text, brainLabel, meta) => appendTurn(accountId, sessionId, staffId, text, brainLabel, meta),
    recordError: (staff, message, label) => {
      appendTurn(accountId, sessionId, 'system', `Bộ não của ${staff.name} lỗi: ${message}`, label || 'hệ thống');
      updateTask(accountId, s.task_id, { last_error: `${staff.name}: ${message}` });
    },
    baseCtx: () => taskContext(getTaskRow(accountId, s.task_id)),
    isOpen: () => sessionRow(sessionId).status === 'running' && Date.now() < Date.parse(s.deadline_at),
    isStopped: () => isTaskBlocked(accountId, s.task_id),
  };
}

export async function runDebate(accountId, sessionId) {
  if (running.has(sessionId)) return;
  running.add(sessionId);
  try {
    const io = debateIo(accountId, sessionId);
    const result = await runDebatePhases(io);
    if (result === 'stopped' || result === 'error') return; // giữ nguyên trạng thái để thử lại
    const s = sessionRow(sessionId);
    if (s.status === 'running') {
      const timeout = Date.now() >= Date.parse(s.deadline_at);
      closeSession(accountId, sessionId, timeout ? 'closed_by_timeout' : 'closed_by_keyword',
        timeout ? `Hết ${DEBATE_MINUTES} phút thực tế.` : 'Đã đi hết 4 vòng: đề xuất, phản biện chéo, sửa, chấm lại.');
    }
    await finishSession(accountId, sessionId);
  } finally {
    running.delete(sessionId);
  }
}

export function closeSession(accountId, sessionId, status, note) {
  const res = db.prepare("UPDATE debate_sessions SET status = ? WHERE id = ? AND account_id = ? AND status = 'running'").run(status, sessionId, accountId);
  if (res.changes) appendTurn(accountId, sessionId, 'system', `Phiên đóng: ${note}`, 'hệ thống');
  return res.changes > 0;
}

// Người dùng gõ vào phiên: "chốt công việc" / "dừng" đóng phiên; câu khác thành góp ý mà các vòng sau phải tính đến.
export function userSaysInSession(accountId, sessionId, text) {
  const s = sessionRow(sessionId);
  if (!s) throw new Error('Không tìm thấy phiên.');
  appendTurn(accountId, sessionId, 'user', text, 'người dùng');
  const t = text.trim().toLowerCase();
  if (s.status === 'running' && (t.includes('chốt công việc') || /(^|\s)dừng($|\s|[.!])/.test(t))) {
    closeSession(accountId, sessionId, 'closed_by_keyword', `người dùng gõ "${text.trim()}".`);
    if (!running.has(sessionId)) finishSession(accountId, sessionId).catch((e) => console.error(e));
  }
}

export function closeByButton(accountId, sessionId) {
  if (closeSession(accountId, sessionId, 'closed_by_button', 'người dùng bấm nút dừng.') && !running.has(sessionId)) {
    finishSession(accountId, sessionId).catch((e) => console.error(e));
  }
}

// Phiên đóng: Phúc xét từng đề xuất và chọn ý tốt nhất, rồi thực hiện theo bản chốt.
export async function finishSession(accountId, sessionId) {
  if (finishing.has(sessionId)) return;
  finishing.add(sessionId);
  try {
    const s = sessionRow(sessionId);
    if (s.status === 'running' || s.final_summary) return;
    if (isTaskBlocked(accountId, s.task_id)) return;
    const io = debateIo(accountId, sessionId);
    try {
      const { text, plan } = await runJudge(io);
      db.prepare('UPDATE debate_sessions SET final_summary = ?, final_plan = ? WHERE id = ?').run(text, plan ? JSON.stringify(plan) : null, sessionId);
    } catch (e) {
      appendTurn(accountId, sessionId, 'system', `Phúc chưa chọn được phương án: ${e.message}`, e.brainLabel || 'hệ thống');
      updateTask(accountId, s.task_id, { last_error: `Phúc: ${e.message}` });
      return;
    }
  } finally {
    finishing.delete(sessionId);
  }
  await executeTask(accountId, sessionRow(sessionId).task_id);
}

// Thực hiện việc: việc chung theo bản chốt (người làm do Phúc chọn theo năng lực) rồi Phúc kiểm tra từng kết quả;
// việc riêng qua bản nháp → đồng nghiệp phản biện → bản cuối.
export async function executeTask(accountId, taskId) {
  if (executing.has(taskId)) return;
  executing.add(taskId);
  try {
    let row = getTaskRow(accountId, taskId);
    const fresh = row.status === 'returned_for_redo';
    updateTask(accountId, taskId, { status: 'in_progress', last_error: null, ...(fresh ? { outputs: '[]' } : {}) });
    row = getTaskRow(accountId, taskId);
    const task = rowToTask(row);
    const outputsIo = {
      outputs: () => JSON.parse(getTaskRow(accountId, taskId).outputs),
      pushOutput: (o) => {
        const list = JSON.parse(getTaskRow(accountId, taskId).outputs).filter((x) => x.key !== o.key);
        list.push({ ...o, at: now() });
        updateTask(accountId, taskId, { outputs: JSON.stringify(list) });
      },
      isStopped: () => isTaskBlocked(accountId, taskId),
      baseCtx: () => taskContext(getTaskRow(accountId, taskId)),
      think: thinker(accountId, row.debate_session_id, row.task_kind),
    };
    let result;
    if (task.kind === 'general') {
      const s = row.debate_session_id ? sessionRow(row.debate_session_id) : null;
      const plan = s?.final_plan ? JSON.parse(s.final_plan) : null;
      const fallback = executionPlan(task).map((t, i) => ({
        key: `f${i + 1}`, staff: getStaff(accountId, t.staffId), label: t.label || `Phần của ${getStaff(accountId, t.staffId).name}`, ask: t.ask || 'Làm phần việc phù hợp nhất với bạn theo bản chốt.', criteria: '',
      }));
      result = await executeWithReview({ ...outputsIo, task, allStaff: listStaff(accountId), manager: getStaff(accountId, MANAGER_ID) }, plan, fallback, s?.final_summary || null);
    } else {
      const assignee = getStaff(accountId, task.assigneeIds[0]);
      result = await runIndividual({ ...outputsIo, task, assignee, reviewer: reviewerFor(task, assignee, listStaff(accountId)) });
    }
    // Quản lý có thể dừng đúng lúc bước cuối vừa xong: lệnh dừng luôn thắng, không ghi đè trạng thái.
    if (result.status === 'stopped' || isTaskBlocked(accountId, taskId)) return;
    if (result.status === 'returned_for_redo') {
      updateTask(accountId, taskId, { status: 'returned_for_redo', return_reason: `Phúc kiểm tra: ${result.returnReason}`, pass_criteria: result.passCriteria });
      learnFromTask(accountId, taskId).catch((e) => console.error('learn', e));
    } else if (result.status === 'done') {
      updateTask(accountId, taskId, { status: 'done' });
      learnFromTask(accountId, taskId).catch((e) => console.error('learn', e));
    } else {
      updateTask(accountId, taskId, { status: 'in_progress', last_error: result.error || null });
    }
  } finally {
    executing.delete(taskId);
  }
}

// ---------- Tự học sau mỗi việc ----------
// Trang đọc kết quả và đánh giá, viết bài học cho từng người; bài học vào mục "Bài học tự rút ra" (phiên bản đào tạo mới).
export async function learnFromTask(accountId, taskId) {
  const t = rowToTask(getTaskRow(accountId, taskId));
  const outputs = t.outputs.filter((o) => o.text || o.error);
  if (!outputs.length) return [];
  const trainer = getStaff(accountId, TRAINER_ID);
  return runLearning({
    task: t, outputs, staffList: listStaff(accountId), trainer,
    think: (staff, ctx) => thinkWithBrain(accountId, staff, selectBrain(accountId, staff, 'deep_analysis'), ctx),
    apply: (staffId, lessons) => applyLessons(accountId, staffId, lessons, t.title),
  });
}

// ---------- Quản lý ----------
export function managerStop(accountId, taskId, reason) {
  if (!reason?.trim()) throw new Error('Quản lý phải ghi lý do dừng.');
  const row = getTaskRow(accountId, taskId);
  if (!row) throw new Error('Không tìm thấy việc.');
  updateTask(accountId, taskId, { status: 'stopped_by_manager', stop_reason: `Phúc dừng lúc ${now()}: ${reason.trim()}` });
  if (row.debate_session_id) closeSession(accountId, row.debate_session_id, 'closed_by_button', 'Quản lý dừng việc.');
  // Chặn mọi lượt gửi Zalo liên quan đang chờ
  db.prepare("UPDATE zalo_queue SET status = 'error', provider_error = 'Bị chặn: Quản lý đã dừng việc liên quan.' WHERE account_id = ? AND task_id = ? AND status = 'queued'")
    .run(accountId, taskId);
}

export function managerResume(accountId, taskId) {
  const row = getTaskRow(accountId, taskId);
  if (row?.status !== 'stopped_by_manager') throw new Error('Việc này không ở trạng thái bị dừng.');
  updateTask(accountId, taskId, { status: 'open' });
}

export function managerReturn(accountId, taskId, reason, criteria) {
  if (!reason?.trim() || !criteria?.trim()) throw new Error('Trả việc cần lý do và tiêu chí đạt.');
  updateTask(accountId, taskId, { status: 'returned_for_redo', return_reason: reason.trim(), pass_criteria: criteria.trim() });
}

// Khởi động lại server: phiên đang chạy chạy tiếp; phiên đã đóng mà Phúc chưa chọn thì chọn tiếp.
export function resumeRunningSessions() {
  for (const r of db.prepare("SELECT account_id, id FROM debate_sessions WHERE status = 'running'").all()) {
    runDebate(r.account_id, r.id).catch((e) => console.error(e));
  }
  for (const r of db.prepare("SELECT s.account_id, s.id FROM debate_sessions s JOIN tasks t ON t.id = s.task_id WHERE s.status != 'running' AND s.final_summary IS NULL AND t.status = 'debating'").all()) {
    finishSession(r.account_id, r.id).catch((e) => console.error(e));
  }
}
