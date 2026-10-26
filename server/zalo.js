// Hàng chờ Zalo + mã liên kết với cầu nối local. Văn phòng là nguồn sự thật; cầu nối chỉ gửi, nhận và trả biên nhận.
import crypto from 'node:crypto';
import { db, now, newId } from './db.js';
import { randomToken, sha256 } from './secrets.js';
import { isTaskBlocked } from './tasks.js';

const LINK_CODE_MINUTES = 30;
const WORKER_TIMEOUT_MS = 60 * 1000;
// Nội dung CSKH / khuyến mại (Chi) bắt buộc người dùng duyệt trước khi xếp hàng gửi.
const APPROVAL_STAFF = new Set(['STAFF-008']);

function rowToItem(r) {
  return {
    id: r.id, staffId: r.staff_id, taskId: r.task_id, target: r.target, content: r.content, status: r.status,
    receipt: r.receipt, providerError: r.provider_error, reply: r.reply,
    requiresUserApproval: !!r.requires_user_approval, approvedByUser: !!r.approved_by_user,
    createdAt: r.created_at, sentAt: r.sent_at,
  };
}

export const listQueue = (accountId) =>
  db.prepare('SELECT * FROM zalo_queue WHERE account_id = ? ORDER BY created_at DESC').all(accountId).map(rowToItem);

export function getItem(accountId, id) {
  const r = db.prepare('SELECT * FROM zalo_queue WHERE account_id = ? AND id = ?').get(accountId, id);
  return r ? rowToItem(r) : null;
}

export function enqueue(accountId, { staffId, content, target = '', taskId = null, requiresUserApproval }) {
  if (!content?.trim()) throw new Error('Nội dung trống.');
  if (isTaskBlocked(accountId, taskId)) throw new Error('Việc liên quan đang bị Quản lý dừng, không xếp hàng gửi.');
  const id = `ZL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const needApproval = requiresUserApproval ?? APPROVAL_STAFF.has(staffId);
  db.prepare(`INSERT INTO zalo_queue (id, account_id, staff_id, task_id, target, content, status, requires_user_approval, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)`).run(id, accountId, staffId, taskId, target, content.trim(), needApproval ? 1 : 0, now());
  return getItem(accountId, id);
}

export function approve(accountId, id) {
  db.prepare('UPDATE zalo_queue SET approved_by_user = 1 WHERE account_id = ? AND id = ?').run(accountId, id);
  return getItem(accountId, id);
}

export function retry(accountId, id) {
  const it = getItem(accountId, id);
  if (it?.status !== 'error') throw new Error('Chỉ thử lại nhiệm vụ đang lỗi.');
  if (isTaskBlocked(accountId, it.taskId)) throw new Error('Việc liên quan đang bị Quản lý dừng.');
  db.prepare("UPDATE zalo_queue SET status = 'queued', provider_error = NULL WHERE id = ?").run(id);
  return getItem(accountId, id);
}

// ---------- Trạng thái worker ----------
export function workerStatus(accountId) {
  const r = db.prepare('SELECT MAX(last_seen_at) AS seen FROM bridge_tokens WHERE account_id = ? AND revoked = 0').get(accountId);
  const lastSeenAt = r?.seen || null;
  return { online: !!lastSeenAt && Date.now() - Date.parse(lastSeenAt) < WORKER_TIMEOUT_MS, lastSeenAt };
}

// Cổng bắt đầu gửi — đúng máy trạng thái: queued → sending → done (có receipt) | error.
export function claimNext(accountId) {
  const worker = workerStatus(accountId);
  if (!worker.online) throw new Error('Worker Zalo đang tắt. Nhiệm vụ giữ ở trạng thái queued.');
  const sending = db.prepare("SELECT id FROM zalo_queue WHERE account_id = ? AND status = 'sending'").get(accountId);
  if (sending) return null; // một người gửi tại một thời điểm
  const candidates = db.prepare("SELECT * FROM zalo_queue WHERE account_id = ? AND status = 'queued' ORDER BY created_at").all(accountId);
  for (const r of candidates) {
    const item = rowToItem(r);
    if (item.requiresUserApproval && !item.approvedByUser) continue; // chưa duyệt thì không xếp hàng gửi
    if (isTaskBlocked(accountId, item.taskId)) continue;
    const res = db.prepare("UPDATE zalo_queue SET status = 'sending' WHERE id = ? AND status = 'queued' AND NOT EXISTS (SELECT 1 FROM zalo_queue WHERE account_id = ? AND status = 'sending')")
      .run(item.id, accountId);
    if (res.changes) return getItem(accountId, item.id);
  }
  return null;
}

// Ép gửi 1 nhiệm vụ cụ thể (từ nút "Gửi" trong văn phòng) — áp đủ các cổng kiểm soát.
export function markSending(accountId, id) {
  const item = getItem(accountId, id);
  if (!item) throw new Error('Không tìm thấy nhiệm vụ.');
  if (!workerStatus(accountId).online) throw new Error('Worker Zalo đang tắt. Nhiệm vụ giữ ở trạng thái queued.');
  if (item.requiresUserApproval && !item.approvedByUser) throw new Error('Nội dung chưa được người dùng duyệt, không xếp hàng gửi.');
  if (isTaskBlocked(accountId, item.taskId)) throw new Error('Việc liên quan đang bị Quản lý dừng.');
  if (item.status !== 'queued') throw new Error(`Nhiệm vụ đang ở trạng thái ${item.status}.`);
  const res = db.prepare("UPDATE zalo_queue SET status = 'sending' WHERE id = ? AND status = 'queued' AND NOT EXISTS (SELECT 1 FROM zalo_queue WHERE account_id = ? AND status = 'sending')")
    .run(id, accountId);
  if (!res.changes) throw new Error('Đang có một người gửi tại một thời điểm. Nhiệm vụ này chờ lượt.');
  return getItem(accountId, id);
}

export function reportResult(accountId, id, { receipt, error, reply }) {
  const item = getItem(accountId, id);
  if (!item) throw new Error('Không tìm thấy nhiệm vụ.');
  if (item.status !== 'sending') throw new Error(`Nhiệm vụ không ở trạng thái sending (hiện: ${item.status}).`);
  if (error) {
    db.prepare("UPDATE zalo_queue SET status = 'error', provider_error = ?, reply = ? WHERE id = ?").run(String(error), reply || null, id);
  } else if (!receipt) {
    db.prepare("UPDATE zalo_queue SET status = 'error', provider_error = 'Hoàn thành không có biên nhận bị từ chối.', reply = ? WHERE id = ?").run(reply || null, id);
  } else {
    db.prepare("UPDATE zalo_queue SET status = 'done', receipt = ?, reply = ?, sent_at = ? WHERE id = ?").run(String(receipt), reply || null, now(), id);
  }
  return getItem(accountId, id);
}

export function recordReply(accountId, id, reply) {
  db.prepare('UPDATE zalo_queue SET reply = ? WHERE account_id = ? AND id = ?').run(String(reply), accountId, id);
  return getItem(accountId, id);
}

// ---------- Mã liên kết LPA-ZALO-XXXXXX: một lần, 30 phút, thu hồi được ----------
export function createLinkCode(accountId) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = 'LPA-ZALO-' + Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('');
  const created = new Date();
  db.prepare('INSERT INTO link_codes (code, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(code, accountId, created.toISOString(), new Date(created.getTime() + LINK_CODE_MINUTES * 60000).toISOString());
  return { code, createdAt: created.toISOString(), expiresAt: new Date(created.getTime() + LINK_CODE_MINUTES * 60000).toISOString() };
}

export const listLinkCodes = (accountId) =>
  db.prepare('SELECT * FROM link_codes WHERE account_id = ? ORDER BY created_at DESC LIMIT 20').all(accountId)
    .map((r) => ({ code: r.code, createdAt: r.created_at, expiresAt: r.expires_at, usedAt: r.used_at, revoked: !!r.revoked }));

export function revokeLinkCode(accountId, code) {
  db.prepare('UPDATE link_codes SET revoked = 1 WHERE account_id = ? AND code = ?').run(accountId, code);
}

export function redeemLinkCode(code) {
  const r = db.prepare('SELECT * FROM link_codes WHERE code = ?').get(String(code || '').trim().toUpperCase());
  if (!r) throw new Error('Mã liên kết không tồn tại.');
  if (r.revoked) throw new Error('Mã liên kết đã bị thu hồi.');
  if (r.used_at) throw new Error('Mã liên kết đã được dùng, không dùng lại được.');
  if (Date.now() > Date.parse(r.expires_at)) throw new Error('Mã liên kết đã hết hạn (30 phút).');
  const token = randomToken();
  db.prepare('UPDATE link_codes SET used_at = ? WHERE code = ? AND used_at IS NULL').run(now(), r.code);
  db.prepare('INSERT INTO bridge_tokens (token_hash, account_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    .run(sha256(token), r.account_id, now(), now());
  return { token, accountId: r.account_id };
}

export function bridgeAccount(token) {
  if (!token) return null;
  const r = db.prepare('SELECT account_id FROM bridge_tokens WHERE token_hash = ? AND revoked = 0').get(sha256(token));
  if (!r) return null;
  db.prepare('UPDATE bridge_tokens SET last_seen_at = ? WHERE token_hash = ?').run(now(), sha256(token));
  return r.account_id;
}

export function revokeBridges(accountId) {
  db.prepare('UPDATE bridge_tokens SET revoked = 1 WHERE account_id = ?').run(accountId);
}

export { newId };
