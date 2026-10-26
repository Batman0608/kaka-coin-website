// Cơ sở dữ liệu SQLite — nguồn sự thật duy nhất. Mọi bảng nghiệp vụ đều gắn account_id,
// nên mỗi tài khoản là một văn phòng tách biệt hoàn toàn.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'van-phong.db');

export const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  office_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS secrets (
  ref TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS staff (
  id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  grp TEXT NOT NULL,
  short_label TEXT NOT NULL,
  sign_code TEXT NOT NULL,
  training_text TEXT NOT NULL,
  training_version INTEGER NOT NULL DEFAULT 1,
  main_software TEXT NOT NULL,
  responsibilities TEXT NOT NULL,
  desk_index INTEGER NOT NULL,
  zone TEXT NOT NULL,
  last_brain_label TEXT,
  PRIMARY KEY (account_id, id)
);
CREATE TABLE IF NOT EXISTS api_configs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  staff_id TEXT,                 -- NULL = API mặc định của công ty
  provider TEXT NOT NULL,
  role TEXT NOT NULL,
  api_key_ref TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  model TEXT,
  base_url TEXT,                 -- chỉ dùng cho nhà cung cấp tương thích OpenAI
  enabled INTEGER NOT NULL DEFAULT 1,
  last_check_at TEXT,
  last_check_ok INTEGER NOT NULL DEFAULT 0,
  last_provider_error TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS software_links (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,
  software_name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_connected',
  permission_scope TEXT NOT NULL DEFAULT '',
  access_code_ref TEXT,
  access_code_last4 TEXT,
  last_sync_at TEXT,
  last_check_at TEXT,
  last_opened_at TEXT
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,             -- individual | general
  task_kind TEXT NOT NULL DEFAULT 'general', -- general | image_design | writing | deep_analysis
  assignee_ids TEXT NOT NULL,     -- JSON
  created_by TEXT NOT NULL,
  status TEXT NOT NULL,
  attachments TEXT NOT NULL DEFAULT '[]', -- JSON (tối đa 4 ảnh)
  debate_session_id TEXT,
  return_reason TEXT,
  pass_criteria TEXT,
  stop_reason TEXT,
  legal_cleared INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  outputs TEXT NOT NULL DEFAULT '[]',     -- JSON: kết quả thực hiện từng người
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS debate_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  deadline_at TEXT NOT NULL,
  status TEXT NOT NULL,
  final_summary TEXT
);
CREATE TABLE IF NOT EXISTS debate_turns (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,         -- 'user' khi người dùng gõ vào phiên
  text TEXT NOT NULL,
  brain_label TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,          -- 'group' | 'staff:<id>' | 'consult:<id>'
  sender TEXT NOT NULL,           -- 'user' | staff id
  text TEXT NOT NULL,
  brain_label TEXT,
  is_error INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sales_slips (
  id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by_staff_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  product_name_and_code TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  signatures TEXT NOT NULL DEFAULT '[]',
  warehouse_status TEXT NOT NULL DEFAULT 'pending',
  delivery_photo TEXT,
  accounting_signed_off INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  task_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (account_id, id)
);
CREATE TABLE IF NOT EXISTS zalo_queue (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,
  task_id TEXT,
  target TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  receipt TEXT,
  provider_error TEXT,
  reply TEXT,
  requires_user_approval INTEGER NOT NULL DEFAULT 0,
  approved_by_user INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE TABLE IF NOT EXISTS link_codes (
  code TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bridge_tokens (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS counters (
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value INTEGER NOT NULL,
  PRIMARY KEY (account_id, name)
);
`);

export const now = () => new Date().toISOString();
export const newId = (prefix = '') => prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

export function nextCounter(accountId, name) {
  db.prepare(`INSERT INTO counters (account_id, name, value) VALUES (?, ?, 1)
              ON CONFLICT(account_id, name) DO UPDATE SET value = value + 1`).run(accountId, name);
  return db.prepare('SELECT value FROM counters WHERE account_id = ? AND name = ?').get(accountId, name).value;
}

export function tx(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
