// 10 nhân sự cố định theo đặc tả. Mỗi tài khoản mới được tạo một bản riêng của danh sách này.
import { db } from './db.js';
import { ROSTER, MANAGER_ID, signCodeFor, pickRelevantStaffIds, isMarketing, STAFF_COLORS } from '../shared/core.js';
import { normalizeTraining, compileTraining, seedTraining } from '../shared/staffkit.js';

for (const col of ['manual_status TEXT', 'color TEXT', 'training_history TEXT', 'tools TEXT', 'training_json TEXT', 'auto_learn INTEGER', 'routines TEXT']) {
  try { db.exec(`ALTER TABLE staff ADD COLUMN ${col}`); } catch { /* đã có */ }
}

export { ROSTER, MANAGER_ID, pickRelevantStaffIds, isMarketing };

export function seedStaff(accountId) {
  const ins = db.prepare(`INSERT INTO staff (id, account_id, name, role, grp, short_label, sign_code,
    training_text, training_json, training_version, main_software, tools, responsibilities, desk_index, zone, auto_learn)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 1)`);
  ROSTER.forEach((s, i) => {
    const training = seedTraining(s);
    ins.run(s.id, accountId, s.name, s.role, s.grp, s.shortLabel, signCodeFor(i), compileTraining(training), JSON.stringify(training),
      s.mainSoftware, s.mainSoftware, s.responsibilities, s.deskIndex, s.zone);
  });
}

export function rowToStaff(r) {
  // Văn phòng cũ chỉ có đào tạo dạng một đoạn: chuyển thành mục "Prompt riêng".
  const training = normalizeTraining(r.training_json ? JSON.parse(r.training_json) : null, r.training_text);
  return {
    id: r.id, name: r.name, role: r.role, group: r.grp, shortLabel: r.short_label,
    signCode: r.sign_code, training, trainingText: compileTraining(training), trainingVersion: r.training_version,
    tools: r.tools ?? r.main_software, autoLearn: r.auto_learn !== 0,
    routines: r.routines ? JSON.parse(r.routines) : [],
    mainSoftware: r.main_software, responsibilities: r.responsibilities,
    seat: { deskIndex: r.desk_index, zone: r.zone }, lastBrainLabel: r.last_brain_label,
    manualStatus: r.manual_status || 'resting', color: r.color || STAFF_COLORS[r.id] || '#f2a516',
    trainingHistory: (r.training_history ? JSON.parse(r.training_history) : [])
      .map((h) => ({ ...h, training: h.training || normalizeTraining(null, h.text), note: h.note || 'Người dùng sửa' })),
  };
}

export function getStaff(accountId, staffId) {
  const r = db.prepare('SELECT * FROM staff WHERE account_id = ? AND id = ?').get(accountId, staffId);
  return r ? rowToStaff(r) : null;
}

export function listStaff(accountId) {
  return db.prepare('SELECT * FROM staff WHERE account_id = ? ORDER BY id').all(accountId).map(rowToStaff);
}
