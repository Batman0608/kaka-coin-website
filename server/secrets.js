// Kho bí mật phía server: key API và mã truy cập phần mềm được mã hoá AES-256-GCM.
// Bản ghi nghiệp vụ chỉ giữ tham chiếu (ref) và 4 ký tự cuối.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, newId } from './db.js';

function loadMasterKey() {
  if (process.env.APP_SECRET) return crypto.createHash('sha256').update(process.env.APP_SECRET).digest();
  // Không có APP_SECRET: tự tạo một lần và lưu cạnh cơ sở dữ liệu.
  const dir = process.env.DATA_DIR || path.resolve('data');
  const file = path.join(dir, '.app-secret');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8').trim()).digest();
}
const KEY = loadMasterKey();

export function putSecret(accountId, plaintext) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
  const blob = Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
  const ref = newId('sec_');
  db.prepare('INSERT INTO secrets (ref, account_id, ciphertext) VALUES (?, ?, ?)').run(ref, accountId, blob);
  return ref;
}

export function getSecret(accountId, ref) {
  const row = db.prepare('SELECT ciphertext FROM secrets WHERE ref = ? AND account_id = ?').get(ref, accountId);
  if (!row) return null;
  const buf = Buffer.from(row.ciphertext, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}

export function deleteSecret(accountId, ref) {
  if (ref) db.prepare('DELETE FROM secrets WHERE ref = ? AND account_id = ?').run(ref, accountId);
}

export const last4 = (s) => String(s).slice(-4);

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [, saltHex, hashHex] = stored.split('$');
  const hash = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('base64url');
