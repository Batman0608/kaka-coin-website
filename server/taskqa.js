// Ô hỏi dưới mỗi việc: người dùng hỏi, người làm việc đó trả lời trực tiếp dựa trên tiến độ và kết quả của việc.
import { db, now, newId } from './db.js';
import { getStaff, listStaff, MANAGER_ID } from './roster.js';
import { selectBrain, thinkWithBrain } from './brain.js';
import { rowToTask, getTaskRow, runChatTurn } from './tasks.js';
import { planSteps } from '../shared/deliberation.js';
import { taskPeople, taskQaContext } from '../shared/taskqa.js';

db.exec(`CREATE TABLE IF NOT EXISTS task_qa (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  brain_label TEXT,
  is_error INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  answered_at TEXT
)`);
for (const col of ['trace TEXT', 'request_id TEXT', 'waiting INTEGER NOT NULL DEFAULT 0']) {
  try { db.exec(`ALTER TABLE task_qa ADD COLUMN ${col}`); } catch { /* đã có */ }
}

export function listQa(accountId, taskId) {
  return db.prepare('SELECT * FROM task_qa WHERE account_id = ? AND task_id = ? ORDER BY created_at').all(accountId, taskId).map((r) => ({
    id: r.id, staffId: r.staff_id, staffName: getStaff(accountId, r.staff_id)?.name || r.staff_id, question: r.question,
    answer: r.answer, brainLabel: r.brain_label, isError: !!r.is_error, createdAt: r.created_at, answeredAt: r.answered_at,
    trace: r.trace ? JSON.parse(r.trace) : [], requestId: r.request_id || null, waiting: !!r.waiting,
  }));
}

function taskWithPlan(accountId, row) {
  const t = rowToTask(row);
  const s = t.debateSessionId ? db.prepare('SELECT final_plan, final_summary FROM debate_sessions WHERE id = ?').get(t.debateSessionId) : null;
  return { task: { ...t, planSteps: planSteps(s?.final_plan ? JSON.parse(s.final_plan) : null, listStaff(accountId)) }, finalSummary: s?.final_summary || null };
}

export function askTask(accountId, taskId, { question, staffId }) {
  const row = getTaskRow(accountId, taskId);
  if (!row) throw new Error('Không tìm thấy việc.');
  const q = String(question || '').trim();
  if (!q) throw new Error('Nhập câu hỏi.');
  if (q.length > 4000) throw new Error('Câu hỏi quá dài (tối đa 4000 ký tự).');
  const { task, finalSummary } = taskWithPlan(accountId, row);
  const people = taskPeople(task, MANAGER_ID);
  const who = staffId || people[0];
  if (!people.includes(who)) throw new Error('Chỉ hỏi được người đang làm việc này.');
  const staff = getStaff(accountId, who);
  const id = newId('QA-');
  db.prepare('INSERT INTO task_qa (id, account_id, task_id, staff_id, question, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, accountId, taskId, who, q, now());
  const ctx = taskQaContext(task, { finalSummary, qa: listQa(accountId, taskId).filter((x) => x.id !== id), staffName: staff.name });
  const fail = (e) => db.prepare('UPDATE task_qa SET answer = ?, brain_label = ?, is_error = 1, answered_at = ? WHERE id = ?')
    .run(`Bộ não lỗi, chưa trả lời được: ${e.message}`, e.brainLabel || null, now(), id);
  if (row.flow) {
    // Việc giao cả văn phòng = ô chat: người được nhắn làm luôn việc bạn nhắn.
    runChatTurn(accountId, taskId, staff, q, listQa(accountId, taskId).filter((x) => x.id !== id))
      .then((r) => db.prepare('UPDATE task_qa SET answer = ?, brain_label = ?, trace = ?, request_id = ?, waiting = ?, answered_at = ? WHERE id = ?')
        .run(r.status === 'done' ? r.text : '', r.brainLabel, JSON.stringify(r.trace), r.requestId || null, r.status === 'waiting' ? 1 : 0, now(), id))
      .catch(fail);
    return listQa(accountId, taskId);
  }
  thinkWithBrain(accountId, staff, selectBrain(accountId, staff, row.task_kind), { ...ctx, question: q, attachments: JSON.parse(row.attachments) })
    .then((r) => db.prepare('UPDATE task_qa SET answer = ?, brain_label = ?, answered_at = ? WHERE id = ?').run(r.text, r.brainLabel, now(), id))
    .catch(fail);
  return listQa(accountId, taskId);
}
