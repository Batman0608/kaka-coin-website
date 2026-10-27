// Ảnh nhân viên thiết kế trong lúc làm việc (tao_anh) — lưu theo tài khoản, gắn vào bài khi xin duyệt đăng.
import { db, now, newId } from './db.js';

db.exec(`CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, data_url TEXT NOT NULL, created_at TEXT NOT NULL
)`);

export function saveImage(accountId, dataUrl) {
  const id = newId('IMG-');
  db.prepare('INSERT INTO images (id, account_id, data_url, created_at) VALUES (?, ?, ?, ?)').run(id, accountId, dataUrl, now());
  return id;
}
export const getImage = (accountId, id) => db.prepare('SELECT data_url FROM images WHERE account_id = ? AND id = ?').get(accountId, id)?.data_url || null;
