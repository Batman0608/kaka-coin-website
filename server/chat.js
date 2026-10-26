// Chat nhóm, hỏi riêng từng nhân viên và tham vấn đồng nghiệp.
import { db, now, newId } from './db.js';
import { listStaff, getStaff, pickRelevantStaffIds } from './roster.js';
import { addressedStaffId, MANAGER_ID } from '../shared/core.js';
import { GROUP_CRITIQUE_INSTRUCTION, groupConclusionQuestion, consultDecisionQuestion } from '../shared/deliberation.js';
import { selectBrain, thinkWithBrain, kindOfText } from './brain.js';

export function addMessage(accountId, channel, sender, text, brainLabel = null, isError = false) {
  const id = newId('M-');
  db.prepare('INSERT INTO messages (id, account_id, channel, sender, text, brain_label, is_error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, accountId, channel, sender, text, brainLabel, isError ? 1 : 0, now());
  return id;
}

export function listMessages(accountId, channel, limit = 200) {
  return db.prepare('SELECT * FROM messages WHERE account_id = ? AND channel = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
    .all(accountId, channel, limit).reverse()
    .map((m) => ({ id: m.id, sender: m.sender, text: m.text, brainLabel: m.brain_label, isError: !!m.is_error, createdAt: m.created_at }));
}

function recentTurns(accountId, channel, staffById) {
  return listMessages(accountId, channel, 12).filter((m) => !m.isError).map((m) => ({
    nguoi: m.sender === 'user' ? 'Người dùng' : staffById[m.sender]?.name || m.sender,
    noiDung: m.text,
  }));
}

// Hỏi đích danh: tên nhân viên đứng đầu câu hoặc có @Tên → chỉ người đó trả lời.
export function addressedStaff(accountId, text) {
  const id = addressedStaffId(listStaff(accountId), text);
  return id ? getStaff(accountId, id) : null;
}

async function answerAs(accountId, staff, channel, question, staffById, extraInstructions) {
  const ctx = { question, priorTurns: recentTurns(accountId, channel, staffById), extraInstructions };
  try {
    const r = await thinkWithBrain(accountId, staff, selectBrain(accountId, staff, kindOfText(question)), ctx);
    for (const pe of r.providerErrors) addMessage(accountId, channel, staff.id, `Lỗi bộ não (${pe.label}): ${pe.error}`, pe.label, true);
    addMessage(accountId, channel, staff.id, r.text, r.brainLabel);
  } catch (e) {
    // Không thay bằng câu mẫu: chỉ báo lý do thật.
    addMessage(accountId, channel, staff.id, `Bộ não lỗi, chưa trả lời được: ${e.message}`, e.brainLabel || null, true);
  }
}

const busy = new Set();
export function isBusy(accountId, channel) {
  return busy.has(`${accountId}:${channel}`);
}

export async function groupChat(accountId, text, targetId = null) {
  const key = `${accountId}:group`;
  addMessage(accountId, 'group', 'user', text);
  const staffById = Object.fromEntries(listStaff(accountId).map((s) => [s.id, s]));
  const target = (targetId && getStaff(accountId, targetId)) || addressedStaff(accountId, text);
  const responders = target ? [target] : pickRelevantStaffIds(text).map((id) => staffById[id]);
  busy.add(key);
  try {
    // Người trả lời sau phải xét từng câu trả lời trước; cuối cùng Phúc kết luận ý của ai tốt nhất.
    for (const [i, s] of responders.entries()) {
      await answerAs(accountId, s, 'group', text, staffById, i > 0 ? GROUP_CRITIQUE_INSTRUCTION : undefined);
    }
    if (responders.length >= 2) {
      const phuc = staffById[MANAGER_ID];
      await answerAs(accountId, phuc, 'group', groupConclusionQuestion(text), staffById);
    }
  } finally {
    busy.delete(key);
  }
  return responders.map((s) => s.id);
}

export async function privateChat(accountId, staffId, text) {
  const staff = getStaff(accountId, staffId);
  if (!staff) throw new Error('Không tìm thấy nhân viên.');
  const channel = `staff:${staffId}`;
  addMessage(accountId, channel, 'user', text);
  const staffById = Object.fromEntries(listStaff(accountId).map((s) => [s.id, s]));
  busy.add(`${accountId}:${channel}`);
  try {
    await answerAs(accountId, staff, channel, text, staffById);
  } finally {
    busy.delete(`${accountId}:${channel}`);
  }
}

// Tham vấn: mỗi đồng nghiệp tự nghĩ bằng bộ não của mình, người chủ trì tự chốt.
export async function consultColleagues(accountId, ownerId, question, colleagueIds) {
  const owner = getStaff(accountId, ownerId);
  if (!owner) throw new Error('Không tìm thấy nhân viên chủ trì.');
  const ids = [...new Set(colleagueIds)].filter((id) => id !== ownerId && getStaff(accountId, id));
  if (!ids.length) throw new Error('Chọn ít nhất một đồng nghiệp để tham vấn.');
  const channel = `consult:${ownerId}`;
  addMessage(accountId, channel, 'user', `${owner.name} hỏi ý kiến ${ids.map((id) => getStaff(accountId, id).name).join(', ')}: ${question}`);
  const opinions = [];
  for (const id of ids) {
    const colleague = getStaff(accountId, id);
    try {
      const r = await thinkWithBrain(accountId, colleague, selectBrain(accountId, colleague, 'general'), {
        question: `${owner.name} (${owner.role}) hỏi ý kiến bạn: ${question}`,
      });
      opinions.push({ id: newId('DT-'), staffId: id, text: r.text, brainLabel: r.brainLabel, createdAt: now() });
      addMessage(accountId, channel, id, r.text, r.brainLabel);
    } catch (e) {
      addMessage(accountId, channel, id, `Bộ não lỗi, chưa cho ý kiến được: ${e.message}`, e.brainLabel || null, true);
    }
  }
  let decision = null;
  try {
    const r = await thinkWithBrain(accountId, owner, selectBrain(accountId, owner, 'general'), {
      question: consultDecisionQuestion(question),
      priorTurns: opinions.map((o) => ({ nguoi: getStaff(accountId, o.staffId).name, noiDung: o.text })),
    });
    decision = { text: r.text, brainLabel: r.brainLabel };
    addMessage(accountId, channel, ownerId, `QUYẾT ĐỊNH: ${r.text}`, r.brainLabel);
  } catch (e) {
    addMessage(accountId, channel, ownerId, `Bộ não lỗi, chưa chốt được: ${e.message}`, e.brainLabel || null, true);
  }
  return { opinions, decision };
}
