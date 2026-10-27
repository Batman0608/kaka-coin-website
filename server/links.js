// Phần mềm làm việc của từng nhân viên (KiotViet, Fanpage…): mục đích dùng, phạm vi quyền, kết nối thật,
// đồng bộ / nhập dữ liệu, nhật ký từng lần lấy dữ liệu. Mã bí mật (Client Secret, Page Token) mã hoá ở server.
import { db, now, newId } from './db.js';
import { putSecret, getSecret, deleteSecret, last4 } from './secrets.js';
import { CONNECTORS } from './connectors.js';
import { LINK_KINDS, parseImport, pushLog } from '../shared/staffkit.js';

for (const col of ['kind TEXT', 'purpose TEXT', 'extra TEXT', 'logs TEXT', 'access_granted INTEGER NOT NULL DEFAULT 0']) {
  try { db.exec(`ALTER TABLE software_links ADD COLUMN ${col}`); } catch { /* đã có */ }
}
db.exec(`CREATE TABLE IF NOT EXISTS link_data (
  link_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, source TEXT NOT NULL, items TEXT NOT NULL, at TEXT NOT NULL
)`);

const STATUSES = ['connected', 'expired', 'not_connected'];
// Liên kết đang được nhân viên điều khiển trình duyệt: linkId → { step, at }.
export const browsing = new Map();

export function rowToLink(r) {
  const extra = r.extra ? JSON.parse(r.extra) : {};
  const data = db.prepare('SELECT kind, source, at, items FROM link_data WHERE link_id = ?').get(r.id);
  return {
    id: r.id, staffId: r.staff_id, softwareName: r.software_name, url: r.url, status: r.status, permissionScope: r.permission_scope,
    kind: r.kind || 'other', purpose: r.purpose || '', retailer: extra.retailer || '', clientId: extra.clientId || '', pageId: extra.pageId || '', adAccountId: extra.adAccountId || '',
    lastSyncAt: r.last_sync_at, lastCheckAt: r.last_check_at, lastOpenedAt: r.last_opened_at, accessCodeLast4: r.access_code_last4,
    accessGranted: !!r.access_granted, logs: r.logs ? JSON.parse(r.logs) : [], browsing: browsing.get(r.id) || null,
    data: data ? { kind: data.kind, source: data.source, at: data.at, count: JSON.parse(data.items).length } : null,
  };
}

export function getRow(accountId, id) {
  const r = db.prepare('SELECT * FROM software_links WHERE account_id = ? AND id = ?').get(accountId, id);
  if (!r) throw new Error('Không tìm thấy liên kết.');
  return r;
}

export function listLinks(accountId, staffId) {
  const rows = staffId
    ? db.prepare('SELECT * FROM software_links WHERE account_id = ? AND staff_id = ? ORDER BY software_name').all(accountId, staffId)
    : db.prepare('SELECT * FROM software_links WHERE account_id = ? ORDER BY staff_id, software_name').all(accountId);
  return rows.map(rowToLink);
}

function validate(b, partial = false) {
  const out = {};
  if (!partial || b.softwareName !== undefined) {
    out.softwareName = String(b.softwareName || '').trim().slice(0, 120);
    if (!out.softwareName) throw new Error('Cần tên phần mềm.');
  }
  if (!partial || b.url !== undefined) {
    out.url = String(b.url || '').trim().slice(0, 600);
    if (!/^https?:\/\//i.test(out.url)) throw new Error('Địa chỉ phần mềm phải bắt đầu bằng http:// hoặc https://');
  }
  if (b.kind !== undefined) { if (!LINK_KINDS[b.kind]) throw new Error('Loại phần mềm không hợp lệ.'); out.kind = b.kind; }
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) throw new Error('Trạng thái không hợp lệ.'); out.status = b.status; }
  for (const k of ['purpose', 'permissionScope']) if (b[k] !== undefined) out[k] = String(b[k]).trim().slice(0, 2000);
  for (const k of ['retailer', 'clientId', 'pageId', 'adAccountId']) if (b[k] !== undefined) out[k] = String(b[k]).trim().slice(0, 200);
  return out;
}

export function addLog(id, action, ok, detail) {
  const r = db.prepare('SELECT logs FROM software_links WHERE id = ?').get(id);
  db.prepare('UPDATE software_links SET logs = ? WHERE id = ?').run(JSON.stringify(pushLog(r?.logs ? JSON.parse(r.logs) : [], action, ok, detail)), id);
}

export function createLink(accountId, staffId, b) {
  const v = validate(b);
  const id = newId('SL-');
  const ref = b.accessCode ? putSecret(accountId, String(b.accessCode)) : null;
  db.prepare(`INSERT INTO software_links (id, account_id, staff_id, software_name, url, status, permission_scope, access_code_ref, access_code_last4,
    last_check_at, kind, purpose, extra, logs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`)
    .run(id, accountId, staffId, v.softwareName, v.url, v.status || 'not_connected', v.permissionScope || '', ref, b.accessCode ? last4(b.accessCode) : null,
      now(), v.kind || 'other', v.purpose || '', JSON.stringify({ retailer: v.retailer || '', clientId: v.clientId || '', pageId: v.pageId || '', adAccountId: v.adAccountId || '' }));
  addLog(id, 'Tạo liên kết', true, v.purpose || '');
  return rowToLink(getRow(accountId, id));
}

export function updateLink(accountId, id, b) {
  const r = getRow(accountId, id);
  const v = validate(b, true);
  const extra = { ...(r.extra ? JSON.parse(r.extra) : {}) };
  for (const k of ['retailer', 'clientId', 'pageId', 'adAccountId']) if (v[k] !== undefined) extra[k] = v[k];
  if (b.accessCode) { deleteSecret(accountId, r.access_code_ref); r.access_code_ref = putSecret(accountId, String(b.accessCode)); r.access_code_last4 = last4(b.accessCode); }
  db.prepare(`UPDATE software_links SET software_name = ?, url = ?, status = ?, permission_scope = ?, kind = ?, purpose = ?, extra = ?,
    access_code_ref = ?, access_code_last4 = ?, last_check_at = ?, last_opened_at = ? WHERE id = ?`)
    .run(v.softwareName ?? r.software_name, v.url ?? r.url, v.status ?? r.status, v.permissionScope ?? r.permission_scope, v.kind ?? r.kind ?? 'other',
      v.purpose ?? r.purpose ?? '', JSON.stringify(extra), r.access_code_ref, r.access_code_last4, v.status ? now() : r.last_check_at,
      b.opened ? now() : r.last_opened_at, id);
  if (b.accessGranted !== undefined) {
    db.prepare('UPDATE software_links SET access_granted = ? WHERE id = ?').run(b.accessGranted ? 1 : 0, id);
    addLog(id, b.accessGranted ? 'Cho phép nhân viên tự truy cập' : 'Thu hồi quyền tự truy cập', true, '');
  }
  if (b.opened) addLog(id, 'Mở trình duyệt', true, r.url);
  if (v.status === 'expired') addLog(id, 'Đánh dấu hết hạn', true, 'Chờ người dùng tự đăng nhập lại.');
  return rowToLink(getRow(accountId, id));
}

export function deleteLink(accountId, id) {
  const r = getRow(accountId, id);
  deleteSecret(accountId, r.access_code_ref);
  db.prepare('DELETE FROM link_data WHERE link_id = ?').run(id);
  db.prepare('DELETE FROM software_links WHERE id = ?').run(id);
  return r.staff_id;
}

export function credentials(accountId, r) {
  const extra = r.extra ? JSON.parse(r.extra) : {};
  return { ...extra, secret: r.access_code_ref ? getSecret(accountId, r.access_code_ref) : null };
}

// Kiểm tra kết nối thật (KiotViet / Facebook). Phần mềm khác không có API thì chỉ ghi nhận thủ công.
export async function checkLink(accountId, id) {
  const r = getRow(accountId, id);
  const c = CONNECTORS[r.kind];
  if (!c) throw new Error('Phần mềm này chưa có kết nối tự động. Hãy dùng "Nhập dữ liệu" hoặc tự đánh dấu trạng thái.');
  try {
    const msg = await c.check(credentials(accountId, r));
    db.prepare("UPDATE software_links SET status = 'connected', last_check_at = ? WHERE id = ?").run(now(), id);
    addLog(id, 'Kiểm tra kết nối', true, msg);
    return { ok: true, message: msg, link: rowToLink(getRow(accountId, id)) };
  } catch (e) {
    const expired = e.status === 401 || e.status === 403 || /token|hết hạn|expired/i.test(e.message);
    db.prepare('UPDATE software_links SET status = ?, last_check_at = ? WHERE id = ?').run(expired ? 'expired' : r.status, now(), id);
    addLog(id, 'Kiểm tra kết nối', false, e.message);
    return { ok: false, message: e.message, link: rowToLink(getRow(accountId, id)) };
  }
}

export function storeData(accountId, id, kind, source, items) {
  const capped = items.slice(0, 3000);
  db.prepare(`INSERT INTO link_data (link_id, account_id, kind, source, items, at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(link_id) DO UPDATE SET kind = excluded.kind, source = excluded.source, items = excluded.items, at = excluded.at`)
    .run(id, accountId, kind, source, JSON.stringify(capped), now());
  db.prepare('UPDATE software_links SET last_sync_at = ? WHERE id = ?').run(now(), id);
  return capped.length;
}

export async function syncLink(accountId, id) {
  const r = getRow(accountId, id);
  const c = CONNECTORS[r.kind];
  if (!c) throw new Error('Phần mềm này chưa có đồng bộ tự động. Hãy dùng "Nhập dữ liệu".');
  try {
    const d = await c.sync(credentials(accountId, r));
    const n = storeData(accountId, id, d.kind, 'Đồng bộ tự động', d.items);
    db.prepare("UPDATE software_links SET status = 'connected', last_check_at = ? WHERE id = ?").run(now(), id);
    addLog(id, 'Đồng bộ dữ liệu', true, `Lấy được ${n} mục.`);
    return { ok: true, message: `Đã đồng bộ ${n} mục.`, link: rowToLink(getRow(accountId, id)) };
  } catch (e) {
    addLog(id, 'Đồng bộ dữ liệu', false, e.message);
    return { ok: false, message: e.message, link: rowToLink(getRow(accountId, id)) };
  }
}

export function importLink(accountId, id, text) {
  getRow(accountId, id);
  const d = parseImport(text);
  const n = storeData(accountId, id, d.kind, 'Nhập tay', d.items);
  addLog(id, 'Nhập dữ liệu', true, `${n} ${d.kind === 'products' ? 'sản phẩm' : 'dòng ghi chú'}.`);
  return { ok: true, message: `Đã nhập ${n} ${d.kind === 'products' ? 'sản phẩm' : 'dòng ghi chú'}.`, link: rowToLink(getRow(accountId, id)) };
}

export function linkData(accountId, id, limit = 50) {
  getRow(accountId, id);
  const d = db.prepare('SELECT * FROM link_data WHERE link_id = ?').get(id);
  if (!d) return { items: [], total: 0 };
  const items = JSON.parse(d.items);
  return { kind: d.kind, source: d.source, at: d.at, total: items.length, items: items.slice(0, limit) };
}

// Dữ liệu phần mềm của một nhân viên (dùng cho bối cảnh suy nghĩ).
export function staffLinkData(accountId, staffId) {
  const links = listLinks(accountId, staffId);
  const data = {};
  for (const l of links) {
    const d = db.prepare('SELECT items, at, source FROM link_data WHERE link_id = ?').get(l.id);
    if (d) data[l.id] = { items: JSON.parse(d.items), at: d.at, source: d.source };
  }
  return { links, data };
}
