import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, now, newId, tx } from './db.js';
import { hashPassword, verifyPassword, randomToken, sha256, putSecret, deleteSecret, last4 } from './secrets.js';
import { seedStaff, listStaff, getStaff } from './roster.js';
import {
  listConfigs, publicConfig, checkConfig, listModelsForKey, selectBrain, API_ROLES, PROVIDERS,
  CLAUDE_DEFAULT_MODEL, BrainError, providerErrorText, assertPublicBaseUrl, workingStaff,
} from './brain.js';
import {
  createTask, getTaskRow, rowToTask, startGeneralTask, getSession, userSaysInSession, closeByButton,
  executeTask, finishSession, managerStop, managerResume, managerReturn, updateTask, resumeRunningSessions,
} from './tasks.js';
import { groupChat, privateChat, consultColleagues, listMessages, isBusy } from './chat.js';
import { createSlip, listSlips, advanceWarehouse, accountingSignOff, archiveSlip } from './sales.js';
import * as zalo from './zalo.js';
import { listReports, generateReport, isGenerating, startReportScheduler } from './reports.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DAYS = 30;
const COOKIE = 'vpa_session';
const secureCookie = process.env.NODE_ENV === 'production';
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security header trên mọi phản hồi. CSP chỉ cho phép script của chính site (+ hash của importmap inline)
// và gọi ra ngoài duy nhất tới Open-Meteo để lấy thời tiết thật.
const indexHtml = fs.readFileSync(path.join(here, '..', 'public', 'index.html'), 'utf8');
const importMap = /<script type="importmap">([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? '';
const importMapHash = crypto.createHash('sha256').update(importMap).digest('base64');
const CSP = [
  "default-src 'self'", `script-src 'self' 'sha256-${importMapHash}'`, "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:", "connect-src 'self' https://api.open-meteo.com", "frame-ancestors 'none'",
  "base-uri 'self'", "form-action 'self'", "object-src 'none'",
].join('; ');
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (secureCookie) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

// Chống CSRF: ngoài cookie SameSite=Lax, mọi yêu cầu thay đổi dữ liệu phải đến từ chính site.
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const origin = req.headers.origin;
  let originHost = null;
  try { originHost = origin ? new URL(origin).host : null; } catch { originHost = 'invalid'; }
  if (origin && originHost !== req.headers.host) return res.status(403).json({ error: 'Yêu cầu từ nguồn khác bị từ chối.' });
  next();
});
app.use(express.json({ limit: '25mb' }));

// ---------- Tiện ích ----------
const wrap = (fn) => (req, res) => {
  Promise.resolve().then(() => fn(req, res)).catch((e) => {
    // Lỗi nghiệp vụ trả nguyên thông báo; lỗi nội bộ (DB, hệ thống) chỉ ghi log, trả thông báo chung.
    if (e.code || e instanceof TypeError || e instanceof RangeError) {
      console.error(e);
      return res.status(500).json({ error: 'Lỗi nội bộ của server. Thử lại sau.' });
    }
    res.status(e.status || 400).json({ error: e.message || String(e) });
  });
};

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

function setSession(res, accountId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  db.prepare('INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(sha256(token), accountId, now(), expires.toISOString());
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Expires=${expires.toUTCString()}${secureCookie ? '; Secure' : ''}`);
}

function auth(req, res, next) {
  const token = parseCookies(req)[COOKIE];
  if (token) {
    const s = db.prepare('SELECT account_id, expires_at FROM sessions WHERE token_hash = ?').get(sha256(token));
    if (s && Date.parse(s.expires_at) > Date.now()) {
      req.accountId = s.account_id;
      return next();
    }
  }
  // Không tự đăng nhập lại: báo hết phiên để người dùng tự đăng nhập.
  res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập.', expired: !!token });
}

// Giới hạn thử: 10 lần sai / 15 phút theo IP (bộ đếm trong bộ nhớ — đủ cho 1 tiến trình server).
const attempts = new Map();
const WINDOW_MS = 15 * 60000;
function rateLimit(req) {
  const a = attempts.get(req.ip);
  if (a && Date.now() - a.t < WINDOW_MS && a.n >= 10) throw Object.assign(new Error('Thử sai quá nhiều lần, đợi 15 phút.'), { status: 429 });
}
function recordFailure(req) {
  const a = attempts.get(req.ip);
  if (!a || Date.now() - a.t >= WINDOW_MS) attempts.set(req.ip, { n: 1, t: Date.now() });
  else a.n++;
}

// ---------- Tài khoản ----------
app.post('/api/register', wrap((req, res) => {
  rateLimit(req);
  const { username, password, officeName, companyName, inviteCode } = req.body || {};
  if (process.env.REGISTRATION_CODE && inviteCode !== process.env.REGISTRATION_CODE) {
    recordFailure(req);
    throw new Error('Mã mời đăng ký không đúng.');
  }
  if (process.env.ALLOW_REGISTRATION === 'false') throw new Error('Đăng ký tài khoản mới đang tắt.');
  const u = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(u)) throw new Error('Tên đăng nhập 3–40 ký tự: chữ thường, số, dấu . _ -');
  if (String(password || '').length < 8) throw new Error('Mật khẩu tối thiểu 8 ký tự.');
  if (db.prepare('SELECT 1 FROM accounts WHERE username = ?').get(u)) throw new Error('Tên đăng nhập đã tồn tại.');
  const id = newId('ACC-');
  tx(() => {
    db.prepare('INSERT INTO accounts (id, username, password_hash, office_name, company_name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, u, hashPassword(password), (officeName || 'Văn phòng ảo').trim(), (companyName || officeName || 'Công ty').trim(), now());
    seedStaff(id);
  });
  setSession(res, id);
  res.json({ ok: true });
}));

app.post('/api/login', wrap((req, res) => {
  rateLimit(req);
  const { username, password } = req.body || {};
  const a = db.prepare('SELECT * FROM accounts WHERE username = ?').get(String(username || '').trim().toLowerCase());
  if (!a || !verifyPassword(String(password || ''), a.password_hash)) {
    recordFailure(req);
    throw Object.assign(new Error('Sai tên đăng nhập hoặc mật khẩu.'), { status: 401 });
  }
  setSession(res, a.id);
  res.json({ ok: true });
}));

app.post('/api/logout', (req, res) => {
  const token = parseCookies(req)[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.get('/api/me', auth, wrap((req, res) => {
  const a = db.prepare('SELECT id, username, office_name, company_name FROM accounts WHERE id = ?').get(req.accountId);
  res.json({
    username: a.username, officeName: a.office_name, companyName: a.company_name,
    claudeDefault: { model: CLAUDE_DEFAULT_MODEL, configured: !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) },
  });
}));

app.put('/api/me', auth, wrap((req, res) => {
  const { officeName, companyName, currentPassword, newPassword } = req.body || {};
  if (officeName?.trim()) db.prepare('UPDATE accounts SET office_name = ? WHERE id = ?').run(officeName.trim(), req.accountId);
  if (companyName?.trim()) db.prepare('UPDATE accounts SET company_name = ? WHERE id = ?').run(companyName.trim(), req.accountId);
  if (newPassword) {
    const a = db.prepare('SELECT password_hash FROM accounts WHERE id = ?').get(req.accountId);
    if (!verifyPassword(String(currentPassword || ''), a.password_hash)) throw new Error('Mật khẩu hiện tại không đúng.');
    if (String(newPassword).length < 8) throw new Error('Mật khẩu mới tối thiểu 8 ký tự.');
    db.prepare('UPDATE accounts SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), req.accountId);
  }
  res.json({ ok: true });
}));

// Xoá văn phòng: xoá vĩnh viễn tài khoản cùng toàn bộ nhân sự, key, việc, phiếu, hàng chờ.
app.delete('/api/me', auth, wrap((req, res) => {
  const a = db.prepare('SELECT password_hash FROM accounts WHERE id = ?').get(req.accountId);
  if (!verifyPassword(String(req.body?.password || ''), a.password_hash)) throw new Error('Mật khẩu không đúng.');
  tx(() => {
    for (const t of ['debate_turns', 'counters']) db.prepare(`DELETE FROM ${t} WHERE account_id = ?`).run(req.accountId);
    db.prepare('DELETE FROM accounts WHERE id = ?').run(req.accountId); // các bảng còn lại xoá theo ON DELETE CASCADE
  });
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.json({ ok: true });
}));

// ---------- Nhân sự ----------
function staffView(accountId, s) {
  const brain = selectBrain(accountId, s, 'general');
  return {
    ...s,
    currentBrain: { label: brain.label, source: brain.source, fallbackReason: brain.fallbackReason || null },
    apiConfigs: listConfigs(accountId, s.id).map(publicConfig),
    softwareLinks: listLinks(accountId, s.id),
  };
}

app.get('/api/staff', auth, wrap((req, res) => {
  res.json(listStaff(req.accountId).map((s) => staffView(req.accountId, s)));
}));

app.put('/api/staff/:id/training', auth, wrap((req, res) => {
  const s = getStaff(req.accountId, req.params.id);
  if (!s) throw new Error('Không tìm thấy nhân viên.');
  const text = String(req.body?.trainingText || '').trim();
  if (!text) throw new Error('Đào tạo không được để trống.');
  db.prepare('UPDATE staff SET training_text = ?, training_version = training_version + 1 WHERE account_id = ? AND id = ?')
    .run(text, req.accountId, s.id);
  res.json(staffView(req.accountId, getStaff(req.accountId, s.id)));
}));

// ---------- API của nhân viên / công ty ----------
function ownerOf(req) {
  const sid = req.params.staffId;
  if (sid === 'company') return null;
  if (!getStaff(req.accountId, sid)) throw new Error('Không tìm thấy nhân viên.');
  return sid;
}

app.get('/api/apis/:staffId', auth, wrap((req, res) => {
  res.json(listConfigs(req.accountId, ownerOf(req)).map(publicConfig));
}));

// Lấy danh sách model từ key chưa lưu — người dùng tự chọn model, không tự lấy model đầu tiên.
app.post('/api/apis/list-models', auth, wrap(async (req, res) => {
  const { provider, apiKey, baseUrl } = req.body || {};
  if (!PROVIDERS.includes(provider)) throw new Error('Nhà cung cấp không hợp lệ.');
  if (!apiKey) throw new Error('Nhập key trước.');
  try {
    res.json({ ok: true, models: await listModelsForKey({ provider, key: apiKey.trim(), baseUrl: provider === 'openai_compatible' ? baseUrl : undefined }) });
  } catch (e) {
    res.json({ ok: false, error: e instanceof BrainError ? e.message : providerErrorText(e) });
  }
}));

app.post('/api/apis/:staffId', auth, wrap(async (req, res) => {
  const staffId = ownerOf(req);
  const { provider, role = 'general', apiKey, model, baseUrl } = req.body || {};
  if (!PROVIDERS.includes(provider)) throw new Error('Nhà cung cấp không hợp lệ.');
  if (!API_ROLES.includes(role)) throw new Error('Vai trò API không hợp lệ.');
  if (!apiKey?.trim()) throw new Error('Thiếu key.');
  if (provider === 'openai_compatible' && !baseUrl?.trim()) throw new Error('Nhà cung cấp tương thích OpenAI cần Base URL.');
  if (provider === 'openai_compatible') await assertPublicBaseUrl(baseUrl.trim());
  const key = apiKey.trim();
  const id = newId('API-');
  db.prepare(`INSERT INTO api_configs (id, account_id, staff_id, provider, role, api_key_ref, key_last4, model, base_url, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`)
    .run(id, req.accountId, staffId, provider, role, putSecret(req.accountId, key), last4(key), model?.trim() || null,
      provider === 'openai_compatible' ? baseUrl.trim() : null, now());
  res.json(publicConfig(listConfigs(req.accountId, staffId).find((c) => c.id === id)));
}));

function getConfig(accountId, id) {
  const r = db.prepare('SELECT * FROM api_configs WHERE account_id = ? AND id = ?').get(accountId, id);
  if (!r) throw new Error('Không tìm thấy API.');
  return listConfigs(accountId, r.staff_id).find((c) => c.id === id);
}

app.put('/api/api-config/:id', auth, wrap((req, res) => {
  const cfg = getConfig(req.accountId, req.params.id);
  const { enabled, model, role } = req.body || {};
  if (role !== undefined && !API_ROLES.includes(role)) throw new Error('Vai trò API không hợp lệ.');
  db.prepare('UPDATE api_configs SET enabled = ?, model = ?, role = ? WHERE id = ?')
    .run(enabled === undefined ? (cfg.enabled ? 1 : 0) : (enabled ? 1 : 0), model === undefined ? cfg.model : (model || null), role ?? cfg.role, cfg.id);
  res.json(publicConfig(getConfig(req.accountId, cfg.id)));
}));

app.delete('/api/api-config/:id', auth, wrap((req, res) => {
  const cfg = getConfig(req.accountId, req.params.id);
  deleteSecret(req.accountId, cfg.apiKeyRef);
  db.prepare('DELETE FROM api_configs WHERE id = ?').run(cfg.id);
  res.json({ ok: true });
}));

// Kiểm tra key = CHỈ liệt kê model. Không gửi câu hỏi thử.
app.post('/api/api-config/:id/check', auth, wrap(async (req, res) => {
  const cfg = getConfig(req.accountId, req.params.id);
  const r = await checkConfig(req.accountId, cfg);
  res.json({
    ...r, config: publicConfig(getConfig(req.accountId, cfg.id)),
    note: 'Kiểm tra chỉ liệt kê danh sách model. Kiểm tra đạt KHÔNG có nghĩa gọi trả lời sẽ thành công (số dư, hạn mức, quyền model chỉ bị kiểm tra khi gọi chat thật).',
  });
}));

// ---------- Liên kết phần mềm ----------
function listLinks(accountId, staffId) {
  return db.prepare('SELECT * FROM software_links WHERE account_id = ? AND staff_id = ? ORDER BY software_name').all(accountId, staffId)
    .map((r) => ({
      id: r.id, staffId: r.staff_id, softwareName: r.software_name, url: r.url, status: r.status, permissionScope: r.permission_scope,
      lastSyncAt: r.last_sync_at, lastCheckAt: r.last_check_at, lastOpenedAt: r.last_opened_at, accessCodeLast4: r.access_code_last4,
    }));
}

app.post('/api/staff/:id/links', auth, wrap((req, res) => {
  const s = getStaff(req.accountId, req.params.id);
  if (!s) throw new Error('Không tìm thấy nhân viên.');
  const { softwareName, url, permissionScope = '', accessCode, status = 'not_connected' } = req.body || {};
  if (!softwareName?.trim() || !url?.trim()) throw new Error('Cần tên phần mềm và đường dẫn.');
  if (!['connected', 'expired', 'not_connected'].includes(status)) throw new Error('Trạng thái không hợp lệ.');
  const ref = accessCode ? putSecret(req.accountId, accessCode) : null;
  db.prepare(`INSERT INTO software_links (id, account_id, staff_id, software_name, url, status, permission_scope, access_code_ref, access_code_last4, last_check_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(newId('SL-'), req.accountId, s.id, softwareName.trim(), url.trim(), status, permissionScope, ref, accessCode ? last4(accessCode) : null, now());
  res.json(listLinks(req.accountId, s.id));
}));

app.put('/api/links/:id', auth, wrap((req, res) => {
  const r = db.prepare('SELECT * FROM software_links WHERE account_id = ? AND id = ?').get(req.accountId, req.params.id);
  if (!r) throw new Error('Không tìm thấy liên kết.');
  const { status, opened } = req.body || {};
  if (status && !['connected', 'expired', 'not_connected'].includes(status)) throw new Error('Trạng thái không hợp lệ.');
  db.prepare('UPDATE software_links SET status = ?, last_check_at = ?, last_opened_at = ? WHERE id = ?')
    .run(status || r.status, status ? now() : r.last_check_at, opened ? now() : r.last_opened_at, r.id);
  res.json(listLinks(req.accountId, r.staff_id));
}));

app.delete('/api/links/:id', auth, wrap((req, res) => {
  const r = db.prepare('SELECT * FROM software_links WHERE account_id = ? AND id = ?').get(req.accountId, req.params.id);
  if (!r) throw new Error('Không tìm thấy liên kết.');
  deleteSecret(req.accountId, r.access_code_ref);
  db.prepare('DELETE FROM software_links WHERE id = ?').run(r.id);
  res.json(listLinks(req.accountId, r.staff_id));
}));

// ---------- Chat ----------
app.get('/api/messages/:channel', auth, wrap((req, res) => {
  res.json({ messages: listMessages(req.accountId, req.params.channel), busy: isBusy(req.accountId, req.params.channel) });
}));

const MAX_TEXT = 20000;
function textOf(body, field = 'text') {
  const text = String(body?.[field] || '').trim();
  if (!text) throw new Error('Nội dung trống.');
  if (text.length > MAX_TEXT) throw new Error(`Nội dung quá dài (tối đa ${MAX_TEXT} ký tự).`);
  return text;
}

app.post('/api/chat/group', auth, wrap(async (req, res) => {
  const text = textOf(req.body);
  groupChat(req.accountId, text).catch((e) => console.error(e));
  res.json({ ok: true });
}));

app.post('/api/chat/staff/:id', auth, wrap(async (req, res) => {
  const text = textOf(req.body);
  if (!getStaff(req.accountId, req.params.id)) throw new Error('Không tìm thấy nhân viên.');
  privateChat(req.accountId, req.params.id, text).catch((e) => console.error(e));
  res.json({ ok: true });
}));

app.post('/api/staff/:id/consult', auth, wrap(async (req, res) => {
  const question = textOf(req.body, 'question');
  const colleagueIds = Array.isArray(req.body?.colleagueIds) ? req.body.colleagueIds.map(String) : [];
  consultColleagues(req.accountId, req.params.id, question, colleagueIds).catch((e) => console.error(e));
  res.json({ ok: true });
}));

// ---------- Việc ----------
app.get('/api/tasks', auth, wrap((req, res) => {
  res.json(db.prepare('SELECT * FROM tasks WHERE account_id = ? ORDER BY created_at DESC').all(req.accountId).map(rowToTask));
}));

app.post('/api/tasks', auth, wrap((req, res) => {
  const { title, description, kind, assigneeIds, attachments, taskKind } = req.body || {};
  if (!['individual', 'general'].includes(kind)) throw new Error('Loại việc không hợp lệ.');
  if (!Array.isArray(attachments ?? [])) throw new Error('Đính kèm không hợp lệ.');
  for (const a of attachments || []) {
    if (!/^image\/(png|jpeg|gif|webp)$/.test(a?.mimeType)) throw new Error('Chỉ nhận ảnh PNG, JPEG, GIF, WEBP.');
    if (String(a.data || '').length > 5 * 1024 * 1024 * 4 / 3) throw new Error(`Ảnh ${a.fileName} vượt quá 5MB.`);
  }
  const atts = (attachments || []).map((a) => ({
    id: newId('ATT-'), fileName: String(a.fileName || 'anh'), mimeType: String(a.mimeType || ''),
    productName: a.productName || undefined, priceNote: a.priceNote || undefined,
    data: /^image\/(png|jpeg|gif|webp)$/.test(a.mimeType) ? String(a.data || '') : undefined,
  }));
  const id = createTask(req.accountId, { title, description, kind, assigneeIds, attachments: atts, taskKind });
  if (kind === 'general') startGeneralTask(req.accountId, id);
  else executeTask(req.accountId, id).catch((e) => console.error(e));
  res.json(rowToTask(getTaskRow(req.accountId, id)));
}));

app.get('/api/tasks/:id', auth, wrap((req, res) => {
  const row = getTaskRow(req.accountId, req.params.id);
  if (!row) throw new Error('Không tìm thấy việc.');
  const task = rowToTask(row);
  res.json({ task, session: task.debateSessionId ? getSession(req.accountId, task.debateSessionId) : null });
}));

app.post('/api/tasks/:id/retry', auth, wrap((req, res) => {
  const row = getTaskRow(req.accountId, req.params.id);
  if (!row) throw new Error('Không tìm thấy việc.');
  if (row.status === 'stopped_by_manager') throw new Error('Việc đang bị Quản lý dừng. Cần Quản lý hoặc người dùng cho phép mở lại.');
  if (row.kind === 'general') {
    const s = row.debate_session_id && getSession(req.accountId, row.debate_session_id);
    if (s && s.status !== 'running' && s.finalSummary) executeTask(req.accountId, row.id).catch(console.error);
    else if (s && s.status !== 'running') finishSession(req.accountId, s.id).catch(console.error);
    else startGeneralTask(req.accountId, row.id);
  } else {
    executeTask(req.accountId, row.id).catch(console.error);
  }
  res.json({ ok: true });
}));

app.post('/api/tasks/:id/say', auth, wrap((req, res) => {
  const row = getTaskRow(req.accountId, req.params.id);
  if (!row?.debate_session_id) throw new Error('Việc này không có phiên tranh luận.');
  userSaysInSession(req.accountId, row.debate_session_id, textOf(req.body));
  res.json({ ok: true });
}));

app.post('/api/tasks/:id/close-debate', auth, wrap((req, res) => {
  const row = getTaskRow(req.accountId, req.params.id);
  if (!row?.debate_session_id) throw new Error('Việc này không có phiên tranh luận.');
  closeByButton(req.accountId, row.debate_session_id);
  res.json({ ok: true });
}));

app.post('/api/tasks/:id/legal-clear', auth, wrap((req, res) => {
  updateTask(req.accountId, req.params.id, { legal_cleared: 1 });
  res.json(rowToTask(getTaskRow(req.accountId, req.params.id)));
}));
app.post('/api/tasks/:id/stop', auth, wrap((req, res) => {
  managerStop(req.accountId, req.params.id, req.body?.reason);
  res.json(rowToTask(getTaskRow(req.accountId, req.params.id)));
}));
app.post('/api/tasks/:id/resume', auth, wrap((req, res) => {
  managerResume(req.accountId, req.params.id);
  res.json(rowToTask(getTaskRow(req.accountId, req.params.id)));
}));
app.post('/api/tasks/:id/return', auth, wrap((req, res) => {
  managerReturn(req.accountId, req.params.id, req.body?.reason, req.body?.criteria);
  res.json(rowToTask(getTaskRow(req.accountId, req.params.id)));
}));

// ---------- Phiếu bán hàng ----------
app.get('/api/slips', auth, wrap((req, res) => res.json(listSlips(req.accountId))));
app.post('/api/slips', auth, wrap((req, res) => res.json(createSlip(req.accountId, req.body || {}))));
app.post('/api/slips/:id/warehouse', auth, wrap((req, res) =>
  res.json(advanceWarehouse(req.accountId, req.params.id, req.body?.status, req.body?.photo))));
app.post('/api/slips/:id/accounting-signoff', auth, wrap((req, res) => res.json(accountingSignOff(req.accountId, req.params.id))));
app.post('/api/slips/:id/archive', auth, wrap((req, res) => res.json(archiveSlip(req.accountId, req.params.id))));

// ---------- Zalo (phía văn phòng) ----------
app.get('/api/zalo', auth, wrap((req, res) => res.json({
  queue: zalo.listQueue(req.accountId), worker: zalo.workerStatus(req.accountId), linkCodes: zalo.listLinkCodes(req.accountId),
})));
app.post('/api/zalo/queue', auth, wrap((req, res) => res.json(zalo.enqueue(req.accountId, req.body || {}))));
app.post('/api/zalo/queue/:id/approve', auth, wrap((req, res) => res.json(zalo.approve(req.accountId, req.params.id))));
app.post('/api/zalo/queue/:id/retry', auth, wrap((req, res) => res.json(zalo.retry(req.accountId, req.params.id))));
app.post('/api/zalo/queue/:id/send', auth, wrap((req, res) => res.json(zalo.markSending(req.accountId, req.params.id))));
app.post('/api/zalo/link-codes', auth, wrap((req, res) => res.json(zalo.createLinkCode(req.accountId))));
app.post('/api/zalo/link-codes/:code/revoke', auth, wrap((req, res) => { zalo.revokeLinkCode(req.accountId, req.params.code); res.json({ ok: true }); }));
app.post('/api/zalo/bridges/revoke', auth, wrap((req, res) => { zalo.revokeBridges(req.accountId); res.json({ ok: true }); }));

// ---------- Zalo (phía cầu nối local) ----------
app.post('/bridge/link', wrap((req, res) => res.json(zalo.redeemLinkCode(req.body?.code))));
function bridgeAuth(req, res, next) {
  const accountId = zalo.bridgeAccount((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (!accountId) return res.status(401).json({ error: 'Cầu nối chưa liên kết hoặc đã bị thu hồi.' });
  req.accountId = accountId;
  next();
}
app.post('/bridge/heartbeat', bridgeAuth, wrap((req, res) => res.json(zalo.workerStatus(req.accountId))));
app.post('/bridge/next', bridgeAuth, wrap((req, res) => res.json({ item: zalo.claimNext(req.accountId) })));
app.post('/bridge/result', bridgeAuth, wrap((req, res) => res.json(zalo.reportResult(req.accountId, req.body?.id, req.body || {}))));
app.post('/bridge/reply', bridgeAuth, wrap((req, res) => res.json(zalo.recordReply(req.accountId, req.body?.id, req.body?.reply))));

// ---------- Báo cáo cuối ngày ----------
app.get('/api/reports', auth, wrap((req, res) => res.json({ reports: listReports(req.accountId), generating: isGenerating(req.accountId) })));
app.post('/api/reports', auth, wrap((req, res) => {
  if (isGenerating(req.accountId)) throw new Error('Báo cáo đang được tạo.');
  generateReport(req.accountId, 'manual').catch((e) => console.error(e));
  res.json({ ok: true });
}));

// Nhân viên đang suy nghĩ — cho văn phòng 3D
app.get('/api/activity', auth, wrap((req, res) => res.json({ working: workingStaff(req.accountId) })));

// ---------- Tổng quan ----------
app.get('/api/overview', auth, wrap((req, res) => {
  const a = req.accountId;
  const count = (sql) => db.prepare(sql).get(a).n;
  res.json({
    staff: count('SELECT COUNT(*) n FROM staff WHERE account_id = ?'),
    tasks: count('SELECT COUNT(*) n FROM tasks WHERE account_id = ?'),
    softwareLinks: count('SELECT COUNT(*) n FROM software_links WHERE account_id = ?'),
    zaloQueued: count("SELECT COUNT(*) n FROM zalo_queue WHERE account_id = ? AND status = 'queued'"),
    zaloError: count("SELECT COUNT(*) n FROM zalo_queue WHERE account_id = ? AND status = 'error'"),
    slips: count('SELECT COUNT(*) n FROM sales_slips WHERE account_id = ?'),
  });
}));

app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use('/vendor/three', express.static(path.join(here, '..', 'node_modules', 'three'), { maxAge: '7d' }));
app.use(express.static(path.join(here, '..', 'public')));
app.get('*', (req, res) => res.sendFile(path.join(here, '..', 'public', 'index.html')));

export { app };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Văn phòng ảo đang chạy: http://localhost:${port}`);
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      console.warn('Chưa đặt ANTHROPIC_API_KEY: nhân viên chưa gắn API riêng sẽ báo lỗi bộ não cho tới khi đặt.');
    }
    resumeRunningSessions();
    startReportScheduler();
  });
}
