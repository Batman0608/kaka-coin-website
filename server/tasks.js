// Việc riêng / việc chung, phiên tranh luận tự động tối đa 10 phút, quyền dừng của Quản lý.
import { db, now, newId } from './db.js';
import { getStaff, pickRelevantStaffIds, MANAGER_ID, isMarketing } from './roster.js';
import { selectBrain, thinkWithBrain, kindOfText } from './brain.js';

export const DEBATE_MINUTES = Number(process.env.DEBATE_MINUTES || 10);
const MAX_ROUNDS = Number(process.env.DEBATE_MAX_ROUNDS || 4);
const CONSENSUS = '[ĐỒNG THUẬN]';

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

// ---------- Phiên tranh luận ----------
const running = new Set();

export function getSession(accountId, id) {
  const s = db.prepare('SELECT * FROM debate_sessions WHERE account_id = ? AND id = ?').get(accountId, id);
  if (!s) return null;
  const turns = db.prepare('SELECT * FROM debate_turns WHERE session_id = ? ORDER BY created_at, rowid').all(id)
    .map((t) => ({ id: t.id, staffId: t.staff_id, text: t.text, brainLabel: t.brain_label, createdAt: t.created_at }));
  return { id: s.id, taskId: s.task_id, startedAt: s.started_at, deadlineAt: s.deadline_at, status: s.status, finalSummary: s.final_summary, turns, runnerActive: running.has(id) };
}

function appendTurn(accountId, sessionId, staffId, text, brainLabel) {
  db.prepare('INSERT INTO debate_turns (id, account_id, session_id, staff_id, text, brain_label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(newId('DT-'), accountId, sessionId, staffId, text, brainLabel, now());
}

function sessionStatus(id) {
  return db.prepare('SELECT status FROM debate_sessions WHERE id = ?').get(id)?.status;
}

export function startGeneralTask(accountId, taskId) {
  const row = getTaskRow(accountId, taskId);
  if (!row) throw new Error('Không tìm thấy việc.');
  if (row.status === 'stopped_by_manager') throw new Error('Việc đang bị Quản lý dừng.');
  let sessionId = row.debate_session_id;
  if (!sessionId || sessionStatus(sessionId) !== 'running') {
    sessionId = newId('DS-');
    const start = new Date();
    const deadline = new Date(start.getTime() + DEBATE_MINUTES * 60 * 1000);
    db.prepare('INSERT INTO debate_sessions (id, account_id, task_id, started_at, deadline_at, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(sessionId, accountId, taskId, start.toISOString(), deadline.toISOString(), 'running');
    updateTask(accountId, taskId, { debate_session_id: sessionId, status: 'debating', last_error: null });
  }
  runDebate(accountId, sessionId).catch((e) => console.error('debate', e));
  return sessionId;
}

const toPrior = (turns) => turns.map((t) => ({ nguoi: t.staffId === 'user' ? 'Người dùng' : (t.staffName || t.staffId), noiDung: t.text }));

function priorTurnsFor(accountId, sessionId) {
  const s = getSession(accountId, sessionId);
  return toPrior(s.turns.filter((t) => t.staffId !== 'system').map((t) => ({ ...t, staffName: getStaff(accountId, t.staffId)?.name })));
}

export async function runDebate(accountId, sessionId) {
  if (running.has(sessionId)) return;
  running.add(sessionId);
  try {
    const s = getSession(accountId, sessionId);
    const row = getTaskRow(accountId, s.taskId);
    const participants = JSON.parse(row.assignee_ids).map((id) => getStaff(accountId, id)).filter(Boolean);
    let round = 0;
    while (sessionStatus(sessionId) === 'running' && Date.now() < Date.parse(s.deadlineAt) && round < MAX_ROUNDS) {
      round++;
      let agreed = 0;
      let failures = 0;
      for (const staff of participants) {
        if (sessionStatus(sessionId) !== 'running' || Date.now() >= Date.parse(s.deadlineAt)) break;
        if (isTaskBlocked(accountId, s.taskId)) return; // Quản lý đã dừng
        const ctx = {
          ...taskContext(getTaskRow(accountId, s.taskId)),
          question: `Việc chung: ${row.title}${row.description ? ` — ${row.description}` : ''}. Trình bày phần của bạn trong phiên tranh luận (vòng ${round}).`,
          priorTurns: priorTurnsFor(accountId, sessionId),
          extraInstructions: `Đây là phiên tranh luận việc chung giữa: ${participants.map((p) => `${p.name} (${p.role})`).join(', ')}. ` +
            `Nếu bạn thấy phương án chung đã đủ tốt để bắt tay làm và không còn gì cần phản biện, kết thúc câu trả lời bằng đúng dòng ${CONSENSUS}.`,
        };
        try {
          const brain = selectBrain(accountId, staff, row.task_kind);
          const r = await thinkWithBrain(accountId, staff, brain, ctx);
          for (const pe of r.providerErrors) appendTurn(accountId, sessionId, 'system', `Lỗi bộ não của ${staff.name} (${pe.label}): ${pe.error}`, 'hệ thống');
          if (sessionStatus(sessionId) !== 'running' && !r.text) break;
          appendTurn(accountId, sessionId, staff.id, r.text, r.brainLabel);
          if (r.text.includes(CONSENSUS)) agreed++;
        } catch (e) {
          failures++;
          appendTurn(accountId, sessionId, 'system', `Bộ não của ${staff.name} lỗi: ${e.message}`, e.brainLabel || 'hệ thống');
          updateTask(accountId, s.taskId, { last_error: `${staff.name}: ${e.message}` });
        }
      }
      if (failures === participants.length) return; // giữ nguyên trạng thái để thử lại
      const converged = agreed === participants.length && (round > 1 || participants.length === 1);
      if (converged && sessionStatus(sessionId) === 'running') closeSession(accountId, sessionId, 'closed_by_keyword', 'Các nhân viên đã đồng thuận phương án.');
    }
    if (sessionStatus(sessionId) === 'running') {
      const reason = Date.now() >= Date.parse(s.deadlineAt) ? 'closed_by_timeout' : 'closed_by_keyword';
      closeSession(accountId, sessionId, reason, reason === 'closed_by_timeout' ? `Hết ${DEBATE_MINUTES} phút thực tế.` : 'Đã hết số vòng tranh luận tối đa.');
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

// Người dùng gõ vào phiên: "chốt công việc" / "dừng" đóng phiên; câu khác thành một lượt cho nhân viên đọc.
export function userSaysInSession(accountId, sessionId, text) {
  const s = getSession(accountId, sessionId);
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

const finishing = new Set();
// Quản lý tổng hợp bản chốt, rồi từng nhân viên bắt tay làm phần của mình theo bản chốt.
async function finishSession(accountId, sessionId) {
  if (finishing.has(sessionId)) return;
  finishing.add(sessionId);
  try {
    const s = getSession(accountId, sessionId);
    if (s.status === 'running' || s.finalSummary) return;
    const row = getTaskRow(accountId, s.taskId);
    if (row.status === 'stopped_by_manager') return;
    const manager = getStaff(accountId, MANAGER_ID);
    let summary;
    try {
      const r = await thinkWithBrain(accountId, manager, selectBrain(accountId, manager, 'deep_analysis'), {
        ...taskContext(row),
        question: `Tổng hợp BẢN CHỐT của phiên tranh luận việc "${row.title}": ai làm gì, thứ tự, mốc kiểm tra và tiêu chí đạt. Chỉ tổng hợp và đặt mốc kiểm tra, không viết thay phần chuyên môn của người khác.`,
        priorTurns: priorTurnsFor(accountId, sessionId),
      });
      summary = r.text;
      appendTurn(accountId, sessionId, MANAGER_ID, `BẢN CHỐT:\n${r.text}`, r.brainLabel);
    } catch (e) {
      appendTurn(accountId, sessionId, 'system', `Bộ não của Phúc lỗi khi tổng hợp: ${e.message}`, e.brainLabel || 'hệ thống');
      updateTask(accountId, s.taskId, { last_error: `Phúc: ${e.message}` });
      return;
    }
    db.prepare('UPDATE debate_sessions SET final_summary = ? WHERE id = ?').run(summary, sessionId);
    await executeTask(accountId, s.taskId, summary);
  } finally {
    finishing.delete(sessionId);
  }
}

export async function executeTask(accountId, taskId, plan) {
  updateTask(accountId, taskId, { status: 'in_progress', last_error: null });
  const row = getTaskRow(accountId, taskId);
  const outputs = [];
  for (const id of JSON.parse(row.assignee_ids)) {
    if (isTaskBlocked(accountId, taskId)) return;
    const staff = getStaff(accountId, id);
    try {
      const r = await thinkWithBrain(accountId, staff, selectBrain(accountId, staff, row.task_kind), {
        ...taskContext(getTaskRow(accountId, taskId)),
        question: plan
          ? `Bắt tay làm phần việc của bạn theo bản chốt sau và trả về kết quả cụ thể của phần bạn:\n${plan}`
          : `Thực hiện việc "${row.title}"${row.description ? `: ${row.description}` : ''} và trả về kết quả cụ thể.`,
        priorTurns: outputs.map((o) => ({ nguoi: o.staffName, noiDung: o.text })),
      });
      outputs.push({ staffId: id, staffName: staff.name, text: r.text, brainLabel: r.brainLabel, errors: r.providerErrors, at: now() });
    } catch (e) {
      outputs.push({ staffId: id, staffName: staff.name, error: e.message, brainLabel: e.brainLabel, at: now() });
    }
    updateTask(accountId, taskId, { outputs: JSON.stringify(outputs) });
  }
  if (isTaskBlocked(accountId, taskId)) return;
  const failed = outputs.filter((o) => o.error);
  updateTask(accountId, taskId, failed.length
    ? { status: 'in_progress', last_error: failed.map((f) => `${f.staffName}: ${f.error}`).join('\n') }
    : { status: 'done' });
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

export function resumeRunningSessions() {
  const rows = db.prepare("SELECT account_id, id FROM debate_sessions WHERE status = 'running'").all();
  for (const r of rows) runDebate(r.account_id, r.id).catch((e) => console.error(e));
}
