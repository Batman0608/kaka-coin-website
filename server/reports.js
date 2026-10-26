// Báo cáo cuối ngày 21:00: Chi chuẩn bị đề xuất CSKH (chờ người dùng duyệt), Phúc tổng hợp toàn văn phòng.
import { db, now, newId } from './db.js';
import { getStaff, listStaff } from './roster.js';
import { selectBrain, thinkWithBrain } from './brain.js';
import { rowToTask } from './tasks.js';
import {
  MANAGER_ID, CSKH_ID, REPORT_HOUR, hcmDate, hcmHour, CSKH_REPORT_QUESTION, MANAGER_REPORT_QUESTION, reportSnapshot,
} from '../shared/core.js';

db.exec(`CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  trigger TEXT NOT NULL,          -- 'schedule' | 'manual'
  cskh_text TEXT, cskh_brain TEXT,
  summary TEXT, brain_label TEXT,
  error TEXT,
  created_at TEXT NOT NULL
)`);

const rowToReport = (r) => ({
  id: r.id, date: r.date, trigger: r.trigger, cskhText: r.cskh_text, cskhBrain: r.cskh_brain,
  summary: r.summary, brainLabel: r.brain_label, error: r.error, createdAt: r.created_at,
});

export const listReports = (accountId) =>
  db.prepare('SELECT * FROM reports WHERE account_id = ? ORDER BY created_at DESC LIMIT 60').all(accountId).map(rowToReport);

const generating = new Set();
export const isGenerating = (accountId) => generating.has(accountId);

export async function generateReport(accountId, trigger = 'manual') {
  if (generating.has(accountId)) throw new Error('Báo cáo đang được tạo.');
  generating.add(accountId);
  const date = hcmDate();
  const id = newId('R-');
  db.prepare('INSERT INTO reports (id, account_id, date, trigger, created_at) VALUES (?, ?, ?, ?, ?)').run(id, accountId, date, trigger, now());
  const set = (fields) => {
    const cols = Object.keys(fields);
    db.prepare(`UPDATE reports SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map((c) => fields[c]), id);
  };
  try {
    const staffById = Object.fromEntries(listStaff(accountId).map((s) => [s.id, s]));
    const tasks = db.prepare('SELECT * FROM tasks WHERE account_id = ? ORDER BY updated_at DESC').all(accountId).map(rowToTask);
    const snapshot = reportSnapshot(tasks, staffById);
    const errors = [];
    let cskh = null;
    try {
      const chi = getStaff(accountId, CSKH_ID);
      const r = await thinkWithBrain(accountId, chi, selectBrain(accountId, chi, 'general'), {
        question: CSKH_REPORT_QUESTION(date), currentTask: { baoCaoNgay: date, viecTrongVanPhong: snapshot },
      });
      cskh = r;
      set({ cskh_text: r.text, cskh_brain: r.brainLabel });
    } catch (e) {
      errors.push(`Chi: ${e.message}`);
    }
    try {
      const phuc = getStaff(accountId, MANAGER_ID);
      const r = await thinkWithBrain(accountId, phuc, selectBrain(accountId, phuc, 'deep_analysis'), {
        question: MANAGER_REPORT_QUESTION(date),
        currentTask: { baoCaoNgay: date, viecTrongVanPhong: snapshot },
        priorTurns: cskh ? [{ nguoi: 'Chi', noiDung: `Đề xuất CSKH (chờ người dùng duyệt): ${cskh.text}` }] : [],
      });
      set({ summary: r.text, brain_label: r.brainLabel });
    } catch (e) {
      errors.push(`Phúc: ${e.message}`);
    }
    if (errors.length) set({ error: errors.join('\n') });
    return id;
  } finally {
    generating.delete(accountId);
  }
}

// Mỗi phút kiểm tra: từ 21:00 giờ Việt Nam, văn phòng nào có hoạt động trong ngày mà chưa có báo cáo lịch thì tạo.
export function startReportScheduler() {
  const tick = async () => {
    if (hcmHour() < REPORT_HOUR) return;
    const date = hcmDate();
    const startUtc = new Date(`${date}T00:00:00+07:00`).toISOString();
    const accounts = db.prepare(`SELECT a.id FROM accounts a WHERE
      NOT EXISTS (SELECT 1 FROM reports r WHERE r.account_id = a.id AND r.date = ? AND r.trigger = 'schedule')
      AND (EXISTS (SELECT 1 FROM tasks t WHERE t.account_id = a.id AND t.updated_at >= ?)
        OR EXISTS (SELECT 1 FROM messages m WHERE m.account_id = a.id AND m.created_at >= ?)
        OR EXISTS (SELECT 1 FROM sales_slips s WHERE s.account_id = a.id AND s.created_at >= ?))`).all(date, startUtc, startUtc, startUtc);
    for (const a of accounts) await generateReport(a.id, 'schedule').catch((e) => console.error('report', e));
  };
  setInterval(() => tick().catch((e) => console.error(e)), 60 * 1000);
}
