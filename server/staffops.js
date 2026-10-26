// Lưu cài đặt từng nhân sự: đào tạo nhiều mục (có lịch sử), hồ sơ hiển thị, lịch tự động, bài học tự rút ra.
import { db } from './db.js';
import { getStaff } from './roster.js';
import { normalizeTraining, compileTraining, pushHistory, validateProfileFull, validateRoutines, mergeLessons } from '../shared/staffkit.js';

export function saveTraining(accountId, staffId, input, note = 'Người dùng sửa') {
  const s = getStaff(accountId, staffId);
  if (!s) throw new Error('Không tìm thấy nhân viên.');
  const training = normalizeTraining(input);
  if (!compileTraining(training)) throw new Error('Đào tạo không được để trống.');
  const history = pushHistory(s.trainingHistory, s.trainingVersion, s.training, note);
  db.prepare('UPDATE staff SET training_json = ?, training_text = ?, training_version = training_version + 1, training_history = ? WHERE account_id = ? AND id = ?')
    .run(JSON.stringify(training), compileTraining(training), JSON.stringify(history), accountId, staffId);
  return getStaff(accountId, staffId);
}

export function restoreTraining(accountId, staffId, version) {
  const s = getStaff(accountId, staffId);
  if (!s) throw new Error('Không tìm thấy nhân viên.');
  const h = s.trainingHistory.find((x) => x.version === Number(version));
  if (!h) throw new Error('Không tìm thấy phiên bản đào tạo này.');
  return saveTraining(accountId, staffId, h.training, `Khôi phục v${h.version}`);
}

// Bài học tự rút ra sau mỗi việc → phiên bản đào tạo mới, ghi chú "Tự học".
export function applyLessons(accountId, staffId, lessons, taskTitle) {
  const s = getStaff(accountId, staffId);
  if (!s) return;
  saveTraining(accountId, staffId, { ...s.training, lessons: mergeLessons(s.training.lessons, lessons, taskTitle) }, `Tự học từ việc "${String(taskTitle).slice(0, 60)}"`);
}

export function saveProfile(accountId, staffId, input) {
  const s = getStaff(accountId, staffId);
  if (!s) throw new Error('Không tìm thấy nhân viên.');
  const p = validateProfileFull(input || {});
  const cols = { name: 'name', role: 'role', shortLabel: 'short_label', color: 'color', tools: 'tools', autoLearn: 'auto_learn' };
  for (const [k, col] of Object.entries(cols)) {
    if (p[k] === undefined) continue;
    db.prepare(`UPDATE staff SET ${col} = ? WHERE account_id = ? AND id = ?`).run(k === 'autoLearn' ? (p[k] ? 1 : 0) : p[k], accountId, staffId);
  }
  return getStaff(accountId, staffId);
}

export function saveRoutines(accountId, staffId, list) {
  const s = getStaff(accountId, staffId);
  if (!s) throw new Error('Không tìm thấy nhân viên.');
  const old = Object.fromEntries(s.routines.map((r) => [r.id, r]));
  // Giữ ngày đã chạy của lịch cũ để không chạy lại trong cùng ngày khi người dùng sửa.
  const routines = validateRoutines(list).map((r) => ({ ...r, lastRunDate: old[r.id]?.lastRunDate ?? r.lastRunDate }));
  db.prepare('UPDATE staff SET routines = ? WHERE account_id = ? AND id = ?').run(JSON.stringify(routines), accountId, staffId);
  return getStaff(accountId, staffId);
}

export function markRoutineRun(accountId, staffId, routineId, date) {
  const s = getStaff(accountId, staffId);
  const routines = s.routines.map((r) => (r.id === routineId ? { ...r, lastRunDate: date } : r));
  db.prepare('UPDATE staff SET routines = ? WHERE account_id = ? AND id = ?').run(JSON.stringify(routines), accountId, staffId);
}
