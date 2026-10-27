// Yêu cầu nhân viên gửi người dùng trong lúc làm việc thật: cần thông tin, xin phép truy cập phần mềm, xin duyệt nội dung
// trước khi đăng. Việc dừng ở trạng thái "Chờ người dùng"; người dùng trả lời / duyệt thì việc tự chạy tiếp.
import { db, now, newId } from './db.js';
import { getStaff } from './roster.js';
import { getRow as getLinkRow } from './links.js';
import { browseOnce } from './browse.js';
import { executeTask, getTaskRow } from './tasks.js';
import { settledExchanges } from '../shared/worker.js';
import { approveAdsPlan, rejectAdsPlan } from './fanpage.js';

db.exec(`CREATE TABLE IF NOT EXISTS staff_requests (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id TEXT, step_key TEXT, staff_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- info | access | publish
  question TEXT NOT NULL, content TEXT, link_id TEXT,
  status TEXT NOT NULL,         -- pending | answered | approved | rejected | publishing | published | failed
  answer TEXT, result TEXT, created_at TEXT NOT NULL, answered_at TEXT
)`);

function rowToRequest(r) {
  if (!r) return null;
  const link = r.link_id && r.type !== 'ads' ? db.prepare('SELECT software_name FROM software_links WHERE id = ?').get(r.link_id) : null;
  const task = r.task_id ? db.prepare('SELECT title FROM tasks WHERE id = ?').get(r.task_id) : null;
  return {
    id: r.id, taskId: r.task_id, taskTitle: task?.title || null, stepKey: r.step_key, staffId: r.staff_id, staffName: getStaff(r.account_id, r.staff_id)?.name || r.staff_id,
    type: r.type, question: r.question, content: r.content, linkId: r.link_id, linkName: link?.software_name || null,
    status: r.status, answer: r.answer, result: r.result, createdAt: r.created_at, answeredAt: r.answered_at,
    postId: ['post', 'campaign_ads'].includes(r.type) ? r.link_id : null,
  };
}

export function createRequest(accountId, { taskId = null, stepKey = null, staffId, type, question, content = null, linkId = null }) {
  const id = newId('RQ-');
  db.prepare(`INSERT INTO staff_requests (id, account_id, task_id, step_key, staff_id, type, question, content, link_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`).run(id, accountId, taskId, stepKey, staffId, type, question, content, linkId, now());
  return id;
}

export const getRequest = (accountId, id) => rowToRequest(db.prepare('SELECT * FROM staff_requests WHERE account_id = ? AND id = ?').get(accountId, id));

export function listRequests(accountId, { taskId } = {}) {
  const rows = taskId
    ? db.prepare('SELECT * FROM staff_requests WHERE account_id = ? AND task_id = ? ORDER BY created_at DESC').all(accountId, taskId)
    : db.prepare("SELECT * FROM staff_requests WHERE account_id = ? AND (status IN ('pending','publishing') OR created_at > ?) ORDER BY created_at DESC LIMIT 60")
      .all(accountId, new Date(Date.now() - 3 * 86400000).toISOString());
  return rows.map(rowToRequest);
}

export const knownAnswers = (accountId, taskId) => settledExchanges(listRequests(accountId, { taskId }));

export const pendingCount = (accountId) => db.prepare("SELECT COUNT(*) n FROM staff_requests WHERE account_id = ? AND status = 'pending'").get(accountId).n;

const set = (id, fields) => {
  const cols = Object.keys(fields);
  db.prepare(`UPDATE staff_requests SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map((c) => fields[c]), id);
};
function resume(accountId, taskId) {
  if (!taskId) return;
  const t = getTaskRow(accountId, taskId);
  if (t && t.status === 'waiting_user') executeTask(accountId, taskId).catch((e) => console.error('resume', e));
}

// action: answer (info) | approve (access, publish — content sửa được) | reject
export function respond(accountId, id, { action, answer = '', content, always = true }) {
  const r = getRequest(accountId, id);
  if (!r) throw new Error('Không tìm thấy yêu cầu.');
  if (r.status !== 'pending') throw new Error('Yêu cầu này đã được xử lý.');
  const text = String(answer || '').trim().slice(0, 4000);
  if (action === 'reject') {
    set(id, { status: 'rejected', answer: text || null, answered_at: now() });
    if (r.type === 'ads') rejectAdsPlan(accountId, r.linkId, text);
  } else if (r.type === 'ads') {
    // Kế hoạch quảng cáo: chỉ chạy khi người dùng bấm duyệt; chạy đúng kế hoạch đã duyệt.
    set(id, { status: 'publishing', answered_at: now() });
    approveAdsPlan(accountId, r.linkId)
      .then((res) => set(id, { status: res.status === 'failed' ? 'failed' : 'published', result: res.message }))
      .catch((e) => set(id, { status: 'failed', result: e.message }));
    return getRequest(accountId, id);
  } else if (['plan', 'post', 'campaign_ads', 'retry'].includes(r.type)) {
    // Chốt duyệt của quy trình chuẩn Fanpage: ghi lại quyết định (và nội dung đã sửa), việc tự chạy bước tiếp.
    set(id, { status: 'approved', answer: text || null, answered_at: now(), ...(r.type === 'post' && content !== undefined ? { content: String(content).slice(0, 8000) } : {}) });
  } else if (r.type === 'info') {
    if (!text) throw new Error('Nhập câu trả lời.');
    set(id, { status: 'answered', answer: text, answered_at: now() });
  } else if (r.type === 'access') {
    getLinkRow(accountId, r.linkId);
    if (always) db.prepare('UPDATE software_links SET access_granted = 1 WHERE id = ?').run(r.linkId);
    set(id, { status: 'approved', answer: text || null, answered_at: now() });
  } else if (r.type === 'publish') {
    const final = String(content ?? r.content ?? '').trim();
    if (!final) throw new Error('Nội dung đăng đang trống.');
    set(id, { status: 'publishing', content: final, answered_at: now() });
    browseOnce(accountId, r.linkId, { mode: 'publish', content: final, goal: r.question })
      .then((res) => set(id, { status: res.status === 'published' ? 'published' : 'failed', result: res.message }))
      .catch((e) => set(id, { status: 'failed', result: e.message }))
      .finally(() => resume(accountId, r.taskId));
    return getRequest(accountId, id);
  } else {
    throw new Error('Thao tác không hợp lệ.');
  }
  resume(accountId, r.taskId);
  return getRequest(accountId, id);
}
