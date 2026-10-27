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
  CLAUDE_DEFAULT_MODEL, BrainError, providerErrorText, assertPublicBaseUrl, workingStaff, recentSaid,
} from './brain.js';
import {
  createTask, getTaskRow, rowToTask, startGeneralTask, getSession, userSaysInSession, closeByButton,
  executeTask, finishSession, managerStop, managerResume, managerReturn, updateTask, resumeRunningSessions,
} from './tasks.js';
import { groupChat, privateChat, consultColleagues, listMessages, isBusy } from './chat.js';
import { STAFF_STATUSES } from '../shared/core.js';
import { saveTraining, restoreTraining, saveProfile, saveRoutines } from './staffops.js';
import { listLinks, createLink, updateLink, deleteLink, checkLink, syncLink, importLink, linkData } from './links.js';
import { startAutomation } from './automation.js';
import { startBrowse } from './browse.js';
import { askTask, listQa } from './taskqa.js';
import { listRequests, respond, pendingCount } from './requests.js';
import { overview as fanpageOverview, updateOps as updateFanpageOps, runCycle as runFanpageCycle, postImage } from './fanpage.js';
import { planSteps } from '../shared/deliberation.js';
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
  "default-src 'self'", `script-src 'self' 'sha256-${importMapHash}'`, "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src https://fonts.gstatic.com",
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

// Đào tạo nhiều mục: nhận { training: {prompt, skills, …} } (hoặc trainingText cũ → mục Prompt riêng).
app.put('/api/staff/:id/training', auth, wrap((req, res) => {
  const input = req.body?.training || { prompt: req.body?.trainingText };
  res.json(staffView(req.accountId, saveTraining(req.accountId, req.params.id, input)));
}));

app.post('/api/staff/:id/training/restore', auth, wrap((req, res) => {
  res.json(staffView(req.accountId, restoreTraining(req.accountId, req.params.id, req.body?.version)));
}));

app.put('/api/staff/:id/routines', auth, wrap((req, res) => {
  res.json(staffView(req.accountId, saveRoutines(req.accountId, req.params.id, req.body?.routines)));
}));

app.put('/api/staff/:id/status', auth, wrap((req, res) => {
  const s = getStaff(req.accountId, req.params.id);
  if (!s) throw new Error('Không tìm thấy nhân viên.');
  if (!STAFF_STATUSES[req.body?.status]) throw new Error('Trạng thái không hợp lệ.');
  db.prepare('UPDATE staff SET manual_status = ? WHERE account_id = ? AND id = ?').run(req.body.status, req.accountId, s.id);
  res.json(staffView(req.accountId, getStaff(req.accountId, s.id)));
}));

app.put('/api/staff/:id/profile', auth, wrap((req, res) => {
  res.json(staffView(req.accountId, saveProfile(req.accountId, req.params.id, req.body)));
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

// ---------- Phần mềm làm việc của nhân viên ----------
app.get('/api/links', auth, wrap((req, res) => res.json(listLinks(req.accountId))));
app.post('/api/staff/:id/links', auth, wrap((req, res) => {
  if (!getStaff(req.accountId, req.params.id)) throw new Error('Không tìm thấy nhân viên.');
  createLink(req.accountId, req.params.id, req.body || {});
  res.json(listLinks(req.accountId, req.params.id));
}));
app.put('/api/links/:id', auth, wrap((req, res) => res.json(updateLink(req.accountId, req.params.id, req.body || {}))));
app.delete('/api/links/:id', auth, wrap((req, res) => res.json(listLinks(req.accountId, deleteLink(req.accountId, req.params.id)))));
app.post('/api/links/:id/check', auth, wrap(async (req, res) => res.json(await checkLink(req.accountId, req.params.id))));
app.post('/api/links/:id/sync', auth, wrap(async (req, res) => res.json(await syncLink(req.accountId, req.params.id))));
app.post('/api/links/:id/import', auth, wrap((req, res) => {
  const text = String(req.body?.text || '');
  if (text.length > 3_000_000) throw new Error('Dữ liệu quá lớn (tối đa khoảng 3 MB).');
  res.json(importLink(req.accountId, req.params.id, text));
}));
// Nhân viên tự mở trình duyệt, điều khiển phần mềm để lấy dữ liệu (chạy nền; tiến độ ở nhật ký và trường browsing).
app.post('/api/links/:id/browse', auth, wrap((req, res) => res.json(startBrowse(req.accountId, req.params.id, req.body?.goal))));
app.get('/api/links/:id/data', auth, wrap((req, res) => res.json(linkData(req.accountId, req.params.id))));

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
  const target = req.body?.target ? String(req.body.target) : null;
  if (target && !getStaff(req.accountId, target)) throw new Error('Không tìm thấy nhân viên.');
  groupChat(req.accountId, text, target).catch((e) => console.error(e));
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
// Danh sách việc kèm các bước trong bản chốt (để xem trực tiếp nhân viên đang làm bước nào).
app.get('/api/tasks', auth, wrap((req, res) => {
  const plans = Object.fromEntries(db.prepare('SELECT id, final_plan FROM debate_sessions WHERE account_id = ? AND final_plan IS NOT NULL').all(req.accountId)
    .map((r) => [r.id, JSON.parse(r.final_plan)]));
  res.json(db.prepare('SELECT * FROM tasks WHERE account_id = ? ORDER BY created_at DESC').all(req.accountId).map((r) => {
    const t = rowToTask(r);
    return { ...t, planSteps: planSteps(plans[t.debateSessionId], listStaff(req.accountId)) };
  }));
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
  res.json({ task, session: task.debateSessionId ? getSession(req.accountId, task.debateSessionId) : null, qa: listQa(req.accountId, task.id), requests: listRequests(req.accountId, { taskId: task.id }) });
}));

// Ô hỏi dưới mỗi việc: người làm việc trả lời trực tiếp về việc đã giao.
app.post('/api/tasks/:id/ask', auth, wrap((req, res) => res.json({ qa: askTask(req.accountId, req.params.id, { question: req.body?.question, staffId: req.body?.staffId }) })));

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
app.get('/api/activity', auth, wrap((req, res) => res.json({ working: workingStaff(req.accountId), said: recentSaid(req.accountId), pendingRequests: pendingCount(req.accountId) })));

// Yêu cầu của nhân viên trong lúc làm việc (cần thông tin, xin phép truy cập, xin duyệt đăng).
// Fanpage tự vận hành
app.get('/api/fanpage', auth, wrap((req, res) => res.json(fanpageOverview(req.accountId))));
app.put('/api/fanpage', auth, wrap((req, res) => { updateFanpageOps(req.accountId, req.body || {}); res.json(fanpageOverview(req.accountId)); }));
app.post('/api/fanpage/run/:cycle', auth, wrap((req, res) => {
  if (!['content', 'analyst', 'ads', 'share'].includes(req.params.cycle)) throw new Error('Chu kỳ không hợp lệ.');
  runFanpageCycle(req.accountId, req.params.cycle, 'tay').catch((e) => console.error('fanpage', e));
  res.json({ ok: true });
}));
app.get('/api/fanpage/posts/:id/image', auth, wrap((req, res) => res.json({ dataUrl: postImage(req.accountId, req.params.id) })));
app.get('/api/requests', auth, wrap((req, res) => res.json(listRequests(req.accountId))));
app.post('/api/requests/:id', auth, wrap((req, res) => res.json(respond(req.accountId, req.params.id, req.body || {}))));

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
    groupMessages: count("SELECT COUNT(*) n FROM messages WHERE account_id = ? AND channel = 'group'"),
    openTasks: count("SELECT COUNT(*) n FROM tasks WHERE account_id = ? AND status NOT IN ('done')"),
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
    startAutomation();
  });
}
