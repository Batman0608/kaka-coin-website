// Việc làm thực tế (shared/realwork.js): giao xong chỉ lưu "Mới giao", không gọi bộ não, không tự chạy.
// Mỗi lần người dùng bấm trong thẻ việc mới làm đúng MỘT hành động của MỘT người.
import { db } from './db.js';
import { getStaff } from './roster.js';
import { selectBrain, thinkWithBrain } from './brain.js';
import { addMessage } from './chat.js';
import { listLinks } from './links.js';
import { getTaskRow, rowToTask, updateTask } from './tasks.js';
import { initReal, applyAction, currentAction, realTeam } from '../shared/realwork.js';
import { parseGoal } from '../shared/campaign.js';

try { db.exec('ALTER TABLE tasks ADD COLUMN real TEXT'); } catch { /* đã có */ }
db.exec('CREATE TABLE IF NOT EXISTS office_settings (account_id TEXT PRIMARY KEY, data TEXT NOT NULL)');

export function getSettings(accountId) {
  const r = db.prepare('SELECT data FROM office_settings WHERE account_id = ?').get(accountId);
  return { hotlines: [], fanpageUrl: '', kiotvietUrl: '', adsManagerUrl: 'https://adsmanager.facebook.com/', ...(r ? JSON.parse(r.data) : {}) };
}
export function saveSettings(accountId, b = {}) {
  const s = getSettings(accountId);
  for (const k of ['fanpageUrl', 'kiotvietUrl', 'adsManagerUrl']) {
    if (b[k] === undefined) continue;
    const v = String(b[k] || '').trim();
    if (v && !/^https:\/\//i.test(v)) throw new Error('Link phải bắt đầu bằng https://');
    s[k] = v;
  }
  if (b.hotlines !== undefined) {
    const list = (Array.isArray(b.hotlines) ? b.hotlines : String(b.hotlines).split(/[,;]+/)).map((x) => String(x).trim()).filter(Boolean);
    if (list.length && list.length !== 2) throw new Error('Nhập đúng 2 số hotline.');
    s.hotlines = list;
  }
  db.prepare('INSERT INTO office_settings (account_id, data) VALUES (?, ?) ON CONFLICT(account_id) DO UPDATE SET data = excluded.data').run(accountId, JSON.stringify(s));
  return s;
}
// Link thật để mở: lấy từ Cài đặt, không có thì lấy từ phần mềm đã kết nối.
export function realLinks(accountId) {
  const s = getSettings(accountId);
  const links = listLinks(accountId);
  const pick = (kind) => links.find((l) => l.kind === kind)?.url || '';
  return { fanpageUrl: s.fanpageUrl || pick('facebook_page'), kiotvietUrl: s.kiotvietUrl || pick('kiotviet'), adsManagerUrl: s.adsManagerUrl || pick('facebook_ads') || 'https://adsmanager.facebook.com/', hotlines: s.hotlines };
}

export const getReal = (accountId, taskId) => { const r = db.prepare('SELECT real FROM tasks WHERE account_id = ? AND id = ?').get(accountId, taskId); return r?.real ? JSON.parse(r.real) : null; };
const saveReal = (accountId, taskId, r) => db.prepare('UPDATE tasks SET real = ? WHERE account_id = ? AND id = ?').run(JSON.stringify(r), accountId, taskId);

export function realView(accountId, taskId) {
  const r = getReal(accountId, taskId);
  if (!r) return null;
  return { ...r, current: currentAction(r), team: realTeam(r), links: realLinks(accountId) };
}

export function startReal(accountId, taskId) {
  const t = rowToTask(getTaskRow(accountId, taskId));
  const r = initReal(t.title, t.description);
  saveReal(accountId, taskId, r);
  updateTask(accountId, taskId, { assignee_ids: JSON.stringify(realTeam(r)) });
  const who = getStaff(accountId, r.owner);
  addMessage(accountId, 'group', 'STAFF-007', `Giao việc "${t.title}" — ${who.name} làm trước.`);
  return r;
}

const busy = new Set();
export async function doRealAction(accountId, taskId, action, input = {}) {
  if (busy.has(taskId)) throw new Error('Đang làm hành động trước, chờ chút.');
  const r = getReal(accountId, taskId);
  if (!r) throw new Error('Việc này không phải việc làm thực tế.');
  const t = rowToTask(getTaskRow(accountId, taskId));
  busy.add(taskId);
  try {
    const { budget } = parseGoal(t.title, t.description);
    const res = await applyAction(r, action, input, {
      task: t,
      staff: (id) => getStaff(accountId, id),
      think: (s, ctx) => thinkWithBrain(accountId, s, selectBrain(accountId, s, action === 'write_post' ? 'writing' : 'deep_analysis'), ctx),
      hotlines: () => getSettings(accountId).hotlines,
      saveHotlines: (list) => saveSettings(accountId, { hotlines: list }),
      budgetCap: budget || 0,
    });
    saveReal(accountId, taskId, r);
    const sender = SENDER[action] || r.owner;
    addMessage(accountId, 'group', sender, res.message);
    updateTask(accountId, taskId, { status: r.done ? 'done' : 'in_progress', last_error: null });
    return realView(accountId, taskId);
  } finally { busy.delete(taskId); }
}
const SENDER = { record_metrics: 'STAFF-003', analyze: 'STAFF-003', write_post: 'STAFF-001', publish: 'STAFF-001', propose_budget: 'STAFF-002', approve_budget: 'user', run_ads: 'STAFF-002' };

export const pendingBudgetCount = (accountId) => db.prepare("SELECT real FROM tasks WHERE account_id = ? AND real IS NOT NULL AND status != 'done'").all(accountId)
  .filter((x) => currentAction(JSON.parse(x.real))?.key === 'approve_budget').length;
