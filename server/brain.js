// Logic chọn bộ não, giao thức suy nghĩ bắt buộc, gọi nhà cung cấp và kiểm tra key.
import Anthropic from '@anthropic-ai/sdk';
import dns from 'node:dns/promises';
import net from 'node:net';
import { db, now } from './db.js';
import { getSecret } from './secrets.js';

export const CLAUDE_DEFAULT_MODEL = process.env.CLAUDE_DEFAULT_MODEL || 'claude-opus-5-5';
export const API_ROLES = ['general', 'image_design', 'writing', 'deep_analysis', 'zalo_channel'];
export const TASK_KINDS = ['general', 'image_design', 'writing', 'deep_analysis'];
export const PROVIDERS = ['anthropic', 'openai', 'openai_compatible'];

// Các model hỗ trợ tham số `fallbacks: "default"` (chuyển model khi bị bộ lọc an toàn từ chối).
const FALLBACK_CAPABLE = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);

export class BrainError extends Error {
  constructor(message, { status = null, label = '' } = {}) {
    super(message);
    this.status = status;
    this.brainLabel = label;
  }
}

function rowToConfig(r) {
  return {
    id: r.id, staffId: r.staff_id, provider: r.provider, role: r.role, apiKeyRef: r.api_key_ref,
    keyLast4: r.key_last4, model: r.model, baseUrl: r.base_url, enabled: !!r.enabled,
    lastCheckAt: r.last_check_at, lastCheckOk: !!r.last_check_ok, lastProviderError: r.last_provider_error,
  };
}

export function listConfigs(accountId, staffId) {
  const rows = staffId === null
    ? db.prepare('SELECT * FROM api_configs WHERE account_id = ? AND staff_id IS NULL ORDER BY created_at').all(accountId)
    : db.prepare('SELECT * FROM api_configs WHERE account_id = ? AND staff_id = ? ORDER BY created_at').all(accountId, staffId);
  return rows.map(rowToConfig);
}

export const publicConfig = ({ apiKeyRef, ...rest }) => rest;

const providerName = (p) => (p === 'anthropic' ? 'Claude' : p === 'openai' ? 'OpenAI' : 'OpenAI-compatible');

function fromConfig(staff, cfg, source) {
  const model = cfg.model || (cfg.provider === 'anthropic' ? CLAUDE_DEFAULT_MODEL : 'gpt-4o');
  const where = source === 'specialty_api' ? `API chuyên môn ${cfg.role}`
    : source === 'staff_api' ? (cfg.lastCheckOk ? 'API chung' : 'API chưa kiểm tra')
      : 'API mặc định công ty';
  return {
    staffId: staff.id, provider: cfg.provider, model, source, config: cfg,
    label: `${providerName(cfg.provider)} · ${model} (${where} ···${cfg.keyLast4})`,
  };
}

export function claudeFallback(staff, reason) {
  return {
    staffId: staff.id, provider: 'anthropic', model: CLAUDE_DEFAULT_MODEL, source: 'claude_fallback', config: null,
    label: `Claude mặc định · ${CLAUDE_DEFAULT_MODEL} (dự phòng: ${reason})`,
    fallbackReason: reason,
  };
}

// Thứ tự ưu tiên cố định: API chuyên môn đạt → API chung đạt → API chưa kiểm tra → API công ty → Claude mặc định.
export function selectBrain(accountId, staff, kind = 'general') {
  const own = listConfigs(accountId, staff.id).filter((a) => a.enabled);
  const specialty = own.find((a) => a.role === kind && a.lastCheckOk);
  if (specialty) return fromConfig(staff, specialty, 'specialty_api');
  const general = own.find((a) => a.role === 'general' && a.lastCheckOk);
  if (general) return fromConfig(staff, general, 'staff_api');
  // API chưa từng kiểm tra vẫn được thử, nhưng không được ưu tiên hơn API đã đạt.
  const unverified = own.find((a) => a.role === kind) ?? own.find((a) => a.role === 'general');
  if (unverified) return fromConfig(staff, unverified, 'staff_api');
  const company = listConfigs(accountId, null).find((a) => a.enabled && a.role === 'general');
  if (company) return fromConfig(staff, company, 'company_default');
  return claudeFallback(staff, 'nhân viên chưa gắn API riêng');
}

// ---------- Giao thức suy nghĩ bắt buộc ----------
export function buildThinkingPrompt(staff, companyName, ctx) {
  return `
Bạn là ${staff.name}, vai trò ${staff.role} tại ${companyName}.
Đào tạo riêng của bạn (phiên bản ${staff.trainingVersion}): ${staff.trainingText}

GIAO THỨC SUY NGHĨ BẮT BUỘC, theo đúng thứ tự:
1. Đọc đúng câu hỏi: "${ctx.question}". Trả lời đúng câu hỏi này, không trả lời câu hỏi khác.
2. Tách rõ hai nhóm: dữ kiện ĐÃ CÓ trong bối cảnh và dữ kiện CHƯA BIẾT.
   Chưa biết thì nói rõ là chưa biết, không bịa số liệu, giá, tồn kho hay kết quả.
3. Phân tích CHỈ trong chuyên môn của bạn (${staff.role}).
   Không nói thay phần việc của người khác. Phần của người khác thì nêu tên người phụ trách.
4. Đưa phương án CỤ THỂ thuộc phần việc của bạn, kèm bước tiếp theo rõ ràng và mốc kiểm tra của bạn.
5. Nếu lượt trước có ý kiến của đồng nghiệp, phản biện hoặc bổ sung có lý do, không lặp lại nguyên văn.

Đồng nghiệp: An (Nội dung), Bình (Quảng cáo), Tuấn (Phân tích thị trường), Sơn (Sale), Dũng (Kho), Hà (Kế toán), Phúc (Quản lý), Chi (Tư vấn và CSKH), Trang (Nhân sự và Hiệu suất), Minh (Pháp lý và Rủi ro).
Trả lời bằng tiếng Việt, ngắn gọn, đi thẳng vào việc.${ctx.extraInstructions ? `\n\n${ctx.extraInstructions}` : ''}

Bối cảnh việc: ${JSON.stringify(ctx.currentTask ?? null)}
Sản phẩm và giá đính kèm: ${JSON.stringify((ctx.attachments || []).map((a) => ({ fileName: a.fileName, productName: a.productName, priceNote: a.priceNote })))}
Dữ kiện thật đã có: ${JSON.stringify(ctx.realData || {})}
Các lượt nói trước: ${JSON.stringify(ctx.priorTurns || [])}
`.trim();
}

// ---------- Gọi nhà cung cấp ----------
function anthropicClient(key) {
  const opts = { maxRetries: 1, timeout: 5 * 60 * 1000 };
  if (process.env.ANTHROPIC_BASE_URL) opts.baseURL = process.env.ANTHROPIC_BASE_URL;
  if (key && key.startsWith('sk-ant-oat')) {
    // Token OAuth: gửi qua Authorization: Bearer kèm beta oauth.
    return new Anthropic({ ...opts, apiKey: null, authToken: key, defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' } });
  }
  if (key) return new Anthropic({ ...opts, apiKey: key });
  return new Anthropic(opts); // dùng ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN của server
}

// Trích nguyên văn lý do nhà cung cấp trả về, không chỉ mã HTTP.
export function providerErrorText(e) {
  if (e instanceof Anthropic.APIConnectionError) return `Không kết nối được tới nhà cung cấp: ${e.message}`;
  if (e instanceof Anthropic.APIError) {
    const raw = e.error?.error?.message ?? (e.error ? JSON.stringify(e.error) : e.message);
    return `HTTP ${e.status ?? '?'} — ${raw}`;
  }
  return e?.message || String(e);
}

async function callAnthropic({ key, model, system, userText, images }) {
  const client = anthropicClient(key);
  const content = [
    ...images.map((img) => ({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.data } })),
    { type: 'text', text: userText },
  ];
  const params = {
    model, max_tokens: 16000, system,
    messages: [{ role: 'user', content }],
  };
  const betas = [];
  if (key?.startsWith('sk-ant-oat')) betas.push('oauth-2025-04-20');
  if (FALLBACK_CAPABLE.has(model) && !process.env.DISABLE_REFUSAL_FALLBACK) {
    betas.push('server-side-fallback-2026-07-01');
    params.fallbacks = 'default';
  }
  const res = betas.length
    ? await client.beta.messages.create({ ...params, betas })
    : await client.messages.create(params);
  if (res.stop_reason === 'refusal') {
    const cat = res.stop_details?.category ? ` (${res.stop_details.category})` : '';
    throw new BrainError(`Nhà cung cấp từ chối trả lời${cat}: ${res.stop_details?.explanation || 'không có giải thích'}`);
  }
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!text) throw new BrainError(`Nhà cung cấp trả về câu trả lời rỗng (stop_reason: ${res.stop_reason}).`);
  return { text, servedModel: res.model };
}

function openaiBase(cfg) {
  return (cfg?.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
}

// Chống SSRF: Base URL do người dùng nhập chỉ được trỏ tới địa chỉ công khai qua HTTPS.
const PRIVATE = new net.BlockList();
for (const [a, p] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['224.0.0.0', 4], ['240.0.0.0', 4]]) PRIVATE.addSubnet(a, p, 'ipv4');
for (const [a, p] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['::ffff:0:0', 96]]) PRIVATE.addSubnet(a, p, 'ipv6');

export async function assertPublicBaseUrl(raw) {
  if (process.env.ALLOW_PRIVATE_BASE_URL === 'true') return;
  let u;
  try { u = new URL(raw); } catch { throw new BrainError('Base URL không hợp lệ.'); }
  if (u.protocol !== 'https:') throw new BrainError('Base URL phải dùng https://');
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => []);
  if (!addrs.length) throw new BrainError(`Không phân giải được tên miền ${u.hostname}.`);
  if (addrs.some((a) => PRIVATE.check(a.address, a.family === 6 ? 'ipv6' : 'ipv4'))) {
    throw new BrainError('Base URL trỏ tới địa chỉ nội bộ, không được phép.');
  }
}

async function callOpenAI({ key, model, baseUrl, system, userText, images }) {
  await assertPublicBaseUrl(baseUrl);
  const content = [
    { type: 'text', text: userText },
    ...images.map((img) => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } })),
  ];
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST', redirect: 'error',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) {
    const raw = body?.error?.message || JSON.stringify(body) || r.statusText;
    throw new BrainError(`HTTP ${r.status} — ${raw}`, { status: r.status });
  }
  const text = body?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new BrainError('Nhà cung cấp trả về câu trả lời rỗng.');
  return { text, servedModel: body.model || model };
}

async function invoke(accountId, brain, system, userText, images) {
  if (brain.source === 'claude_fallback') {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new BrainError('Server chưa cấu hình ANTHROPIC_API_KEY cho bộ não Claude mặc định, và nhân viên này chưa gắn API riêng.');
    }
    return callAnthropic({ key: null, model: brain.model, system, userText, images });
  }
  const key = getSecret(accountId, brain.config.apiKeyRef);
  if (!key) throw new BrainError('Không đọc được key trong kho bí mật.');
  if (brain.provider === 'anthropic') return callAnthropic({ key, model: brain.model, system, userText, images });
  return callOpenAI({ key, model: brain.model, baseUrl: openaiBase(brain.config), system, userText, images });
}

function imagesOf(ctx) {
  return (ctx.attachments || []).filter((a) => a.data && /^image\//.test(a.mimeType)).slice(0, 4);
}

/**
 * Mọi lượt trả lời của nhân viên đi qua đây. Không bao giờ trả câu mẫu:
 * nếu bộ não riêng lỗi thì ghi nguyên văn lỗi, thử Claude mặc định kèm nhãn dự phòng + lý do;
 * nếu vẫn lỗi thì ném BrainError để nơi gọi giữ nguyên trạng thái việc.
 */
export async function thinkWithBrain(accountId, staff, brain, ctx) {
  const account = db.prepare('SELECT company_name FROM accounts WHERE id = ?').get(accountId);
  const system = buildThinkingPrompt(staff, account?.company_name || 'công ty', ctx);
  const userText = ctx.question;
  const images = imagesOf(ctx);
  const providerErrors = [];
  try {
    const r = await invoke(accountId, brain, system, userText, images);
    markUsed(accountId, staff.id, brain.label, brain.config, null);
    return { text: r.text, brainLabel: brain.label, providerErrors };
  } catch (e) {
    const msg = e instanceof BrainError ? e.message : providerErrorText(e);
    if (brain.source === 'claude_fallback') {
      markUsed(accountId, staff.id, brain.label, null, msg);
      throw new BrainError(msg, { label: brain.label });
    }
    markUsed(accountId, staff.id, brain.label, brain.config, msg);
    providerErrors.push({ label: brain.label, error: msg });
    const fb = claudeFallback(staff, `${brain.label} lỗi: ${msg}`);
    try {
      const r = await invoke(accountId, fb, system, userText, images);
      markUsed(accountId, staff.id, fb.label, null, null);
      return { text: r.text, brainLabel: fb.label, providerErrors };
    } catch (e2) {
      const msg2 = e2 instanceof BrainError ? e2.message : providerErrorText(e2);
      throw new BrainError(`${brain.label}: ${msg}\nDự phòng Claude mặc định cũng lỗi: ${msg2}`, { label: brain.label });
    }
  }
}

function markUsed(accountId, staffId, label, cfg, error) {
  db.prepare('UPDATE staff SET last_brain_label = ? WHERE account_id = ? AND id = ?').run(label, accountId, staffId);
  if (cfg) db.prepare('UPDATE api_configs SET last_provider_error = ? WHERE id = ? AND account_id = ?').run(error, cfg.id, accountId);
}

// ---------- Kiểm tra key: CHỈ liệt kê model, không gửi câu hỏi thử ----------
export async function listModelsForKey({ provider, key, baseUrl }) {
  if (provider === 'anthropic') {
    const client = anthropicClient(key);
    const ids = [];
    for await (const m of client.models.list()) ids.push(m.id);
    return ids;
  }
  const base = openaiBase({ baseUrl });
  await assertPublicBaseUrl(base);
  const r = await fetch(`${base}/models`, {
    redirect: 'error', headers: { authorization: `Bearer ${key}` },
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new BrainError(`HTTP ${r.status} — ${body?.error?.message || JSON.stringify(body) || r.statusText}`);
  return (body?.data || []).map((m) => m.id);
}

export async function checkConfig(accountId, cfg) {
  const key = getSecret(accountId, cfg.apiKeyRef);
  try {
    const models = await listModelsForKey({ provider: cfg.provider, key, baseUrl: cfg.baseUrl });
    db.prepare('UPDATE api_configs SET last_check_at = ?, last_check_ok = 1 WHERE id = ?').run(now(), cfg.id);
    return { ok: true, models };
  } catch (e) {
    const msg = e instanceof BrainError ? e.message : providerErrorText(e);
    db.prepare('UPDATE api_configs SET last_check_at = ?, last_check_ok = 0, last_provider_error = ? WHERE id = ?').run(now(), msg, cfg.id);
    return { ok: false, error: msg };
  }
}

// Phân loại việc → loại bộ não chuyên môn.
export function kindOfText(text) {
  if (/thiết kế|hình ảnh|ảnh bìa|banner|poster|logo|design/i.test(text)) return 'image_design';
  if (/viết bài|soạn bài|caption|nội dung|content|kịch bản|hook/i.test(text)) return 'writing';
  if (/phân tích sâu|phân tích chuyên sâu|báo cáo phân tích|đánh giá chuyên sâu|nghiên cứu/i.test(text)) return 'deep_analysis';
  return 'general';
}
