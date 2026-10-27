// Backend của BẢN TRẢI NGHIỆM: chạy ngay trong trình duyệt, cùng hợp đồng API với server thật.
// Bộ não = Claude qua tài khoản claude.ai của người xem (capability `sample`), dữ liệu lưu riêng
// cho từng tài khoản (capability `db`, nhánh data/users/<id>), danh tính từ capability `user`.
import {
  ROSTER, MANAGER_ID, CSKH_ID, SALE_ID, KHO_ID, KE_TOAN_ID, signCodeFor, defaultTraining,
  pickRelevantStaffIds, isMarketing, addressedStaffId, kindOfText, buildThinkingPrompt, buildRealData,
  executionPlan, assertSlipCanBeCreated, WAREHOUSE_FLOW, REPORT_HOUR, hcmDate, hcmHour,
  STAFF_COLORS, STAFF_STATUSES,
  CSKH_REPORT_QUESTION, MANAGER_REPORT_QUESTION, reportSnapshot,
} from '../shared/core.js';
import {
  runDebatePhases, runJudge, executeWithReview, runIndividual, reviewerFor, scoreboard, planSteps,
  GROUP_CRITIQUE_INSTRUCTION, groupConclusionQuestion, consultDecisionQuestion,
} from '../shared/deliberation.js';
import {
  normalizeTraining, compileTraining, pushHistory, validateProfileFull, validateRoutines, dueRoutines, hcmToday, seedTraining,
  LINK_KINDS, parseImport, pushLog, softwareFacts, runLearning, mergeLessons, TRAINER_ID,
} from '../shared/staffkit.js';
import { runBrowserAgent, logInto, clickBlocked } from '../shared/browseragent.js';
import { runWorkStep, settledExchanges } from '../shared/worker.js';
import { pickRelevant } from '../shared/staffkit.js';
import {
  DEFAULT_OPS, validateOps, dueCycles, markRun, runContentCycle, runAnalystCycle, runAdsCycle, executeAdsPlan, runShareCycle,
  CONTENT_ID, ADS_ID, ANALYST_ID, AD_KINDS, vnd,
} from '../shared/fanpage.js';
import { drawDesign } from '../shared/design.js';
import { advanceCampaign, initCampaign, MANAGER as CAMPAIGN_MANAGER } from '../shared/campaign.js';
import { runTeamFlow, addDelegation, initFlow } from '../shared/teamflow.js';
import { ROSTER_VERSION, DEFAULT_ROUTINES } from '../shared/roles.js';
import { initReal, applyAction, currentAction, realTeam } from '../shared/realwork.js';
import { parseGoal } from '../shared/campaign.js';
import { taskPeople, taskQaContext } from '../shared/taskqa.js';

const DEBATE_MINUTES = 10;
const MSG_KEEP = 80;

const now = () => new Date().toISOString();
const rid = (p = '') => p + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
const clone = (x) => JSON.parse(JSON.stringify(x));
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

// ---------- Kho dữ liệu: bộ nhớ + đồng bộ từng tài liệu vào db ----------
class Store {
  constructor() { this.docs = new Map(); this.queue = new Map(); this.col = null; this.persistent = false; this.writeError = null; }

  async init() {
    const cl = globalThis.claude;
    const [db, user] = cl ? await Promise.all([cl.use('db'), cl.use('user')]) : [null, null];
    this.userName = '';
    let uid = null;
    if (user) {
      uid = await user.id().catch(() => null);
      const me = await user.me?.().catch(() => null);
      this.userName = me?.name || '';
    }
    if (db && uid) {
      this.col = db.collection(`data/users/${uid}`);
      try {
        const snap = await this.col.get();
        for (const d of snap.docs) this.docs.set(d.id, clone(d.data()));
        this.persistent = true;
      } catch (e) {
        this.writeError = `Không đọc được dữ liệu đã lưu (${e.code || e.message}).`;
      }
    }
  }

  get(id, fallback) {
    if (!this.docs.has(id)) this.docs.set(id, clone(fallback));
    return this.docs.get(id);
  }

  // Ghi lần lượt từng tài liệu; dồn nhiều thay đổi liên tiếp thành một lần ghi.
  save(id) {
    if (!this.persistent) return;
    const q = this.queue.get(id) || { running: false, dirty: false };
    this.queue.set(id, q);
    q.dirty = true;
    if (q.running) return;
    const run = async () => {
      q.running = true;
      while (q.dirty) {
        q.dirty = false;
        const body = this.docs.get(id);
        try {
          if (body === undefined) await this.col.doc(id).delete();
          else await this.col.doc(id).set(clone(body));
          this.writeError = null;
        } catch (e) {
          this.writeError = e.code === 'quota_exceeded'
            ? 'Bộ nhớ của bản trải nghiệm đã đầy: hãy xoá bớt việc cũ hoặc xoá dữ liệu văn phòng trong Cài đặt.'
            : `Chưa lưu được dữ liệu (${e.code || e.message}).`;
        }
      }
      q.running = false;
    };
    run();
  }

  remove(id) { this.docs.delete(id); this.save(id); }
}

const store = new Store();

// ---------- Truy cập dữ liệu ----------
function office() {
  const o = store.get('office', null);
  if (o) return o;
  const fresh = {
    officeName: 'Văn phòng Long Phu Auto', companyName: 'Long Phu Auto', createdAt: now(), counters: { slip: 0 }, rosterVersion: ROSTER_VERSION,
    staff: ROSTER.map((s, i) => ({
      id: s.id, name: s.name, role: s.role, group: s.grp, shortLabel: s.shortLabel, signCode: signCodeFor(i),
      trainingText: defaultTraining(s), trainingVersion: 1, mainSoftware: s.mainSoftware,
      responsibilities: s.responsibilities, seat: { deskIndex: s.deskIndex, zone: s.zone }, lastBrainLabel: null,
      manualStatus: 'resting', color: STAFF_COLORS[s.id], trainingHistory: [],
    })),
  };
  store.docs.set('office', fresh);
  store.save('office');
  return fresh;
}
const saveOffice = () => store.save('office');
// Văn phòng tạo từ bản cũ chưa có các trường mới thì bổ sung giá trị mặc định.
// Bản ghi gốc (để sửa và lưu) và bản đầy đủ (kèm đào tạo, đọc từ tài liệu riêng của từng nhân viên).
const rawStaff = (id) => office().staff.find((s) => s.id === id) || null;
function trainingDoc(id) {
  let d = store.docs.get(`training-${id}`);
  if (!d) {
    const s = rawStaff(id);
    const roster = ROSTER.find((r) => r.id === id);
    // Văn phòng cũ có đào tạo một đoạn đã sửa → mục Prompt riêng; còn lại điền sẵn từ đặc tả.
    const training = s?.trainingText && s.trainingVersion > 1 ? normalizeTraining(null, s.trainingText) : seedTraining({ ...roster, name: s?.name || roster.name, role: s?.role || roster.role });
    d = { training, history: (s?.trainingHistory || []).map((h) => ({ ...h, training: h.training || normalizeTraining(null, h.text), note: h.note || 'Người dùng sửa' })) };
    store.docs.set(`training-${id}`, d);
  }
  return d;
}
const enrich = (s) => {
  const t = trainingDoc(s.id);
  return {
    ...s, manualStatus: s.manualStatus || 'resting', color: s.color || STAFF_COLORS[s.id], tools: s.tools ?? s.mainSoftware,
    autoLearn: s.autoLearn !== false, routines: s.routines || [], training: t.training, trainingText: compileTraining(t.training), trainingHistory: t.history,
  };
};
const staffList = () => office().staff.map(enrich);
// Thiết lập lại toàn bộ nhân viên theo vai trò chuẩn (shared/roles.js): đào tạo cũ vào lịch sử (khôi phục được),
// lịch tự động thay bằng lịch mặc định của vai trò (tắt sẵn). Không đụng phần mềm đã kết nối và API.
function resetAllStaff() {
  const o = office();
  for (const r of ROSTER) {
    const raw = rawStaff(r.id);
    if (!raw) continue;
    Object.assign(raw, { role: r.role, shortLabel: r.shortLabel, responsibilities: r.responsibilities, autoLearn: true,
      routines: (DEFAULT_ROUTINES[r.id] || []).map((x, i) => ({ ...x, id: `R${r.id.slice(-3)}${i}`, enabled: false, lastRunDate: null })) });
    saveTraining(r.id, seedTraining(r), 'Bản cũ — trước khi thiết lập lại theo vai trò chuẩn');
  }
  o.rosterVersion = ROSTER_VERSION;
  saveOffice();
}
const getStaff = (id) => { const s = rawStaff(id); return s ? enrich(s) : null; };
const staffById = () => Object.fromEntries(staffList().map((s) => [s.id, s]));

const listDoc = (name) => store.get(name, { list: [] });
const tasksAll = () => [...store.docs.entries()].filter(([k]) => k.startsWith('task-')).map(([, v]) => v)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const getTask = (id) => store.docs.get(`task-${id}`) || null;
const saveTask = (t) => { t.updatedAt = now(); store.docs.set(`task-${t.id}`, t); store.save(`task-${t.id}`); };
const zaloDoc = () => store.get('zalo', { queue: [], linkCodes: [] });

// Ảnh đính kèm chỉ giữ trong phiên (không lưu vào db, tránh vượt giới hạn tài liệu).
const imageCache = new Map();

function realData(staffId, question) {
  const z = zaloDoc();
  const facts = buildRealData({ slips: listDoc('slips').list, links: listDoc('links').list, zalo: z.queue, tasks: tasksAll() });
  if (staffId) {
    // Dữ liệu từ phần mềm được giao cho chính nhân viên này, chọn mục liên quan câu hỏi.
    const links = listDoc('links').list.filter((l) => l.staffId === staffId);
    const data = Object.fromEntries(links.map((l) => [l.id, store.docs.get(`linkdata-${l.id}`)]).filter(([, d]) => d));
    facts.phanMemCuaToi = softwareFacts(links, data, question);
  }
  return facts;
}

// ---------- Bộ não: Claude qua tài khoản claude.ai ----------
const working = new Map();
const said = new Map(); // câu vừa nói của từng nhân viên, cho bong bóng thoại 3D
let samplePromise = null;
const getSample = () => (samplePromise ||= (globalThis.claude ? globalThis.claude.use('sample') : Promise.resolve(null)));

class BrainError extends Error {
  constructor(message, label) { super(message); this.brainLabel = label; }
}

const SAMPLE_ERRORS = {
  not_granted: 'Bạn chưa cho phép văn phòng dùng Claude (hỏi lại khi tải lại trang).',
  sampling_disabled: 'Tài khoản hoặc tổ chức này không dùng được Claude.',
  rate_limited: 'Đã chạm giới hạn gọi Claude của tài khoản claude.ai — thử lại sau ít phút.',
  session_expired: 'Phiên claude.ai đã hết hạn — hãy đăng nhập lại claude.ai.',
  refused: 'Claude từ chối trả lời nội dung này.',
  empty_completion: 'Claude không trả về nội dung.',
  upstream_error: 'Lỗi tạm thời của dịch vụ Claude.',
  prompt_too_large: 'Bối cảnh quá dài cho một lượt.',
};

// API riêng của từng nhân viên. "claude_ai": chọn model Claude qua tài khoản claude.ai (không cần key).
// Key Claude / OpenAI / tương thích OpenAI: chỉ giữ trong bộ nhớ của trang (không lưu vào kho dữ liệu), gọi thẳng
// từ trình duyệt; lỗi nhà cung cấp hiện nguyên văn và nhân viên chuyển sang Claude qua claude.ai, nhãn ghi rõ lý do.
const CLAUDE_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'];
const TRIAL_PROVIDERS = ['claude_ai', 'anthropic', 'openai', 'openai_compatible'];
const API_ROLES = ['general', 'image_design', 'writing', 'deep_analysis', 'zalo_channel'];
const sessionKeys = new Map();
const brainsOf = (ownerId) => {
  if (ownerId === 'company') return (office().companyBrains ||= []);
  const raw = rawStaff(ownerId);
  if (!raw) throw fail('Không tìm thấy nhân viên.');
  return (raw.brains ||= []);
};
const allBrains = () => [...(office().companyBrains || []), ...office().staff.flatMap((x) => x.brains || [])];
const publicBrain = (c) => ({ ...c, keyInSession: c.provider === 'claude_ai' || sessionKeys.has(c.id) });
const PROVIDER_NAME = { claude_ai: 'Claude qua claude.ai', anthropic: 'Claude (key riêng)', openai: 'OpenAI', openai_compatible: 'Tương thích OpenAI' };

function pickConfig(staff, kind) {
  const own = (rawStaff(staff.id)?.brains || []).filter((c) => c.enabled);
  const c = own.find((x) => x.role === kind && x.lastCheckOk) || own.find((x) => x.role === 'general' && x.lastCheckOk)
    || own.find((x) => x.role === kind) || own.find((x) => x.role === 'general');
  if (c) return { cfg: c, where: c.role === kind && kind !== 'general' ? `API chuyên môn ${c.role}` : 'API riêng' };
  const company = (office().companyBrains || []).find((x) => x.enabled && x.role === 'general');
  return company ? { cfg: company, where: 'API mặc định công ty' } : null;
}

async function fetchJson(url, opts) {
  let r;
  try { r = await fetch(url, opts); } catch (e) { throw new Error(`Không kết nối được tới nhà cung cấp (${e.name}): ${e.message}`); }
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* không phải JSON */ }
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${body?.error?.message || text.slice(0, 300) || r.statusText}`);
  return body;
}
const openaiBase = (c) => (c.provider === 'openai' ? 'https://api.openai.com/v1' : String(c.baseUrl || '').replace(/\/+$/, ''));
function anthropicHeaders(key) {
  const h = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
  if (key.startsWith('sk-ant-oat')) Object.assign(h, { authorization: `Bearer ${key}`, 'anthropic-beta': 'oauth-2025-04-20' });
  else h['x-api-key'] = key;
  return h;
}
async function callExternal(c, key, system, user) {
  if (c.provider === 'anthropic') {
    const body = await fetchJson('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: anthropicHeaders(key),
      body: JSON.stringify({ model: c.model || 'claude-opus-5-5', max_tokens: 8000, system, messages: [{ role: 'user', content: user }] }),
    });
    return (body.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('\n').trim();
  }
  const body = await fetchJson(`${openaiBase(c)}/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: c.model || 'gpt-4o', messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  return String(body.choices?.[0]?.message?.content || '').trim();
}
// Kiểm tra key = CHỈ liệt kê model, không gửi câu hỏi thử.
async function listModels(c, key) {
  if (c.provider === 'claude_ai') return CLAUDE_MODELS;
  if (!key) throw new Error('Chưa có key trong phiên này (bản trải nghiệm không lưu key) — nhập lại key.');
  if (c.provider === 'anthropic') return ((await fetchJson('https://api.anthropic.com/v1/models', { headers: anthropicHeaders(key) })).data || []).map((m) => m.id);
  return ((await fetchJson(`${openaiBase(c)}/models`, { headers: { authorization: `Bearer ${key}` } })).data || []).map((m) => m.id);
}

async function think(staff, ctx) {
  const sample = await getSample();
  const tier = staff.id === MANAGER_ID ? 'complex' : ctx.quick ? 'quick' : 'default'; // Quản lý dùng bộ não tốt nhất; xét việc nhanh dùng mức nhanh
  const kind = ctx.kind || (staff.id === MANAGER_ID ? 'deep_analysis' : 'general');
  const picked = pickConfig(staff, kind);
  const o = office();
  const system = buildThinkingPrompt(staff, o.companyName, { ...ctx, realData: realData(staff.id, ctx.question) });
  const prompt = `${system}\n\nCâu hỏi / việc cần xử lý: ${ctx.question}`;
  const providerErrors = [];
  let fallbackNote = '';
  working.set(staff.id, (working.get(staff.id) || 0) + 1);
  const done = (text, label) => {
    rawStaff(staff.id).lastBrainLabel = label; saveOffice();
    if (!/^\s*[{[`]/.test(text)) said.set(staff.id, { text: text.replace(/\s+/g, ' ').slice(0, 140), at: now() });
    return { text: text.trim(), brainLabel: label, providerErrors };
  };
  try {
    const c = picked?.cfg;
    if (c && c.provider !== 'claude_ai') {
      const label = `${PROVIDER_NAME[c.provider]} · ${c.model || 'mặc định'} (${picked.where} ···${c.keyLast4})`;
      const key = sessionKeys.get(c.id);
      if (!key) {
        fallbackNote = `${label}: chưa nhập key trong phiên này (bản trải nghiệm không lưu key)`;
      } else {
        try {
          const text = await callExternal(c, key, system, ctx.question);
          c.lastProviderError = null; saveOffice();
          return done(text, label);
        } catch (e) {
          c.lastProviderError = e.message; saveOffice();
          providerErrors.push({ label, error: e.message });
          fallbackNote = `${label} lỗi: ${e.message}`;
        }
      }
    }
    const baseLabel = `Claude qua tài khoản claude.ai (${tier})`;
    if (!sample) throw new BrainError(`Không gọi được Claude trong khung xem này (cần mở văn phòng trong claude.ai và cho phép dùng Claude).${fallbackNote ? ` Trước đó: ${fallbackNote}` : ''}`, baseLabel);
    const images = (ctx.imageIds || []).map((id) => imageCache.get(id)).filter(Boolean).slice(0, 4);
    const opts = { modelTier: tier, cache: false };
    if (c?.provider === 'claude_ai') {
      if (c.model) opts.model = c.model;
      if (c.effort) opts.effort = c.effort;
    }
    if (images.length) opts.images = images;
    try {
      const r = await sample(prompt, opts);
      const applied = r.modelApplied || r.modelTierApplied;
      const label = c?.provider === 'claude_ai'
        ? `Claude qua claude.ai · ${applied}${c.model && r.modelApplied !== c.model ? ` (đã chọn ${c.model}, nền tảng chạy ${applied})` : ''} (${picked.where})`
        : `Claude qua tài khoản claude.ai (${applied})${fallbackNote ? ` (dự phòng: ${fallbackNote})` : ''}`;
      return done(r.text, `${label}${r.truncated ? ' — câu trả lời bị cắt do quá dài' : ''}`);
    } catch (e) {
      const msg = `${SAMPLE_ERRORS[e?.code] || 'Lỗi khi gọi Claude.'} [mã: ${e?.code || 'unknown'}] ${e?.message || ''}`.trim();
      throw new BrainError(fallbackNote ? `${fallbackNote}\nDự phòng Claude qua claude.ai cũng lỗi: ${msg}` : msg, baseLabel);
    }
  } finally {
    const n = working.get(staff.id) - 1;
    if (n > 0) working.set(staff.id, n); else working.delete(staff.id);
  }
}

// ---------- Tin nhắn ----------
function addMessage(channel, sender, text, brainLabel = null, isError = false, postId = null) {
  const doc = store.get(`msg-${channel}`, { list: [] });
  doc.list.push({ id: rid('M-'), sender, text, brainLabel, isError, createdAt: now(), ...(postId ? { postId } : {}) });
  doc.list = doc.list.slice(-MSG_KEEP);
  while (JSON.stringify(doc).length > 200000 && doc.list.length > 1) doc.list.shift();
  store.save(`msg-${channel}`);
}
const listMessages = (channel) => store.get(`msg-${channel}`, { list: [] }).list;
const busy = new Set();

function recentTurns(channel) {
  const byId = staffById();
  return listMessages(channel).slice(-12).filter((m) => !m.isError)
    .map((m) => ({ nguoi: m.sender === 'user' ? 'Người dùng' : byId[m.sender]?.name || m.sender, noiDung: m.text }));
}

async function answerAs(staff, channel, question, extraInstructions) {
  try {
    const r = await think(staff, { question, priorTurns: recentTurns(channel), extraInstructions });
    addMessage(channel, staff.id, r.text, r.brainLabel);
  } catch (e) {
    addMessage(channel, staff.id, `Bộ não lỗi, chưa trả lời được: ${e.message}`, e.brainLabel, true);
  }
}

async function withBusy(channel, fn) {
  busy.add(channel);
  try { await fn(); } finally { busy.delete(channel); }
}

// ---------- Việc & tranh luận ----------
const running = new Set();
const finishing = new Set();
const executing = new Set();

function publicTask(t) {
  return { ...t, session: undefined, real: undefined, ...(t.real ? { isReal: true, nowStaffId: currentAction(t.real)?.staffId || null } : {}), attachments: t.attachments.map((a) => ({ ...a, hasImage: imageCache.has(a.id) })) };
}
function createTaskRecord(b) {
  const t = {
    id: rid('T-'), title: b.title, description: b.description || '', kind: b.kind, taskKind: b.taskKind || kindOfText(`${b.title}\n${b.description || ''}`),
    assigneeIds: b.assigneeIds, createdBy: b.createdBy || 'user', status: 'open', attachments: b.attachments || [], debateSessionId: null, session: null,
    returnReason: null, passCriteria: null, stopReason: null, legalCleared: false, lastError: null, outputs: [],
    createdAt: now(), updatedAt: now(),
  };
  saveTask(t);
  return t;
}
const isBlocked = (taskId) => !!taskId && getTask(taskId)?.status === 'stopped_by_manager';

function taskCtx(t) {
  return {
    currentTask: { id: t.id, title: t.title, description: t.description, status: t.status, returnReason: t.returnReason, passCriteria: t.passCriteria },
    attachments: t.attachments, imageIds: t.attachments.map((a) => a.id),
  };
}

function appendTurn(t, staffId, text, brainLabel, meta = null) {
  t.session.turns.push({ id: rid('DT-'), staffId, text, brainLabel, meta, createdAt: now() });
  saveTask(t);
}

function closeSession(t, status, note) {
  if (!t.session || t.session.status !== 'running') return false;
  t.session.status = status;
  appendTurn(t, 'system', `Phiên đóng: ${note}`, 'hệ thống');
  return true;
}

function startGeneral(t) {
  if (t.status === 'stopped_by_manager') throw fail('Việc đang bị Quản lý dừng.');
  if (!t.session || t.session.status !== 'running') {
    const start = new Date();
    t.session = { id: rid('DS-'), startedAt: start.toISOString(), deadlineAt: new Date(start.getTime() + DEBATE_MINUTES * 60000).toISOString(), status: 'running', finalSummary: null, finalPlan: null, turns: [] };
    t.debateSessionId = t.session.id;
    t.status = 'debating'; t.lastError = null; t.outputs = [];
    saveTask(t);
  }
  bg(runDebate(t.id));
}

function debateIo(taskId) {
  const t0 = getTask(taskId);
  return {
    task: t0,
    participants: t0.assigneeIds.map(getStaff).filter(Boolean),
    allStaff: staffList(),
    manager: getStaff(MANAGER_ID),
    turns: () => getTask(taskId).session.turns,
    think,
    record: (staffId, text, brainLabel, meta) => appendTurn(getTask(taskId), staffId, text, brainLabel, meta),
    recordError: (staff, message, label) => {
      const t = getTask(taskId);
      t.lastError = `${staff.name}: ${message}`;
      appendTurn(t, 'system', `Bộ não của ${staff.name} lỗi: ${message}`, label || 'hệ thống');
    },
    baseCtx: () => taskCtx(getTask(taskId)),
    isOpen: () => { const s = getTask(taskId).session; return s.status === 'running' && Date.now() < Date.parse(s.deadlineAt); },
    isStopped: () => isBlocked(taskId),
  };
}

async function runDebate(taskId) {
  if (running.has(taskId)) return;
  running.add(taskId);
  try {
    const result = await runDebatePhases(debateIo(taskId));
    if (result === 'stopped' || result === 'error') return; // giữ nguyên trạng thái để thử lại
    const t = getTask(taskId);
    if (t.session.status === 'running') {
      const timeout = Date.now() >= Date.parse(t.session.deadlineAt);
      closeSession(t, timeout ? 'closed_by_timeout' : 'closed_by_keyword', timeout ? `Hết ${DEBATE_MINUTES} phút thực tế.` : 'Đã đi hết 4 vòng: đề xuất, phản biện chéo, sửa, chấm lại.');
    }
    await finishSession(taskId);
  } finally {
    running.delete(taskId);
  }
}

async function finishSession(taskId) {
  if (finishing.has(taskId)) return;
  finishing.add(taskId);
  try {
    const t = getTask(taskId);
    if (!t.session || t.session.status === 'running' || t.session.finalSummary || isBlocked(taskId)) return;
    try {
      const { text, plan } = await runJudge(debateIo(taskId));
      const cur = getTask(taskId);
      cur.session.finalSummary = text; cur.session.finalPlan = plan;
      saveTask(cur);
    } catch (e) {
      const cur = getTask(taskId);
      cur.lastError = `Phúc: ${e.message}`;
      appendTurn(cur, 'system', `Phúc chưa chọn được phương án: ${e.message}`, e.brainLabel || 'hệ thống');
      return;
    }
  } finally {
    finishing.delete(taskId);
  }
  await executeTask(taskId);
}

// Việc chung: làm theo bản chốt rồi Phúc kiểm tra từng kết quả. Việc riêng: nháp → đồng nghiệp phản biện → bản cuối.
// Có yêu cầu chạy lại trong lúc việc đang chạy (vd. người dùng vừa trả lời) → chạy thêm một lượt ngay khi xong.
const rerun = new Set();
async function executeTask(taskId) {
  if (executing.has(taskId)) { rerun.add(taskId); return; }
  executing.add(taskId);
  try {
    await executeOnce(taskId);
  } finally {
    executing.delete(taskId);
    if (rerun.delete(taskId)) bg(executeTask(taskId));
  }
}
async function executeOnce(taskId) {
  {
    let t = getTask(taskId);
    if (t.status === 'returned_for_redo') t.outputs = [];
    t.status = 'in_progress'; t.lastError = null;
    saveTask(t);
    const io = {
      task: t, allStaff: staffList(), manager: getStaff(MANAGER_ID), think,
      outputs: () => getTask(taskId).outputs,
      pushOutput: (o) => { const cur = getTask(taskId); cur.outputs = cur.outputs.filter((x) => x.key !== o.key).concat({ ...o, at: now() }); saveTask(cur); },
      isStopped: () => isBlocked(taskId),
      baseCtx: () => taskCtx(getTask(taskId)),
    };
    // Làm việc thật: xem phần mềm (xin phép lần đầu), hỏi người dùng, xin duyệt trước khi đăng.
    io.work = (st, ctx, trace) => runWorkStep({
      staff: st.staff, ask: ctx.question, ctx, think, trace,
      tools: {
        listLinks: (staffId) => linksOf(staffId),
        readSoftware,
        createRequest: (q) => createRequest({ ...q, taskId, stepKey: st.key, staffId: st.staff.id }),
        getRequest,
        knownAnswers: () => settledExchanges(reqDoc().list.filter((r) => r.taskId === taskId).map(requestView)),
        webSearch,
        makeImage: async (spec) => { const url = renderDesign(spec); if (!url) return null; const id = rid('IMG-'); store.docs.set(`img-${id}`, { dataUrl: url }); store.save(`img-${id}`); return id; },
        hasImage: (id) => !!store.docs.get(`img-${id}`),
        delegate: t.flow ? (name, viec) => {
          const stf = staffList().find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
          if (!stf) return `Không có đồng nghiệp tên "${name}".`;
          const cur = getTask(taskId);
          const ok = addDelegation(cur.flow, stf, viec, st.staff.name);
          saveTask(cur);
          return ok ? `Đã nhờ ${stf.name}: ${viec}. ${stf.name} sẽ làm sau bạn.` : `${stf.name} đã có phần việc này.`;
        } : undefined,
      },
    });
    let result;
    if (t.flow) {
      // Giao việc cho cả văn phòng: ai liên quan thì làm, Phúc sắp thứ tự khi nhiều người (shared/teamflow.js).
      const flow = t.flow;
      let r;
      try {
        r = await runTeamFlow({
          task: t, flow, staffList: staffList(),
          save: () => { const cur = getTask(taskId); cur.flow = flow; saveTask(cur); },
          think: (st, ctx, o = {}) => think(st, { ...taskCtx(getTask(taskId)), ...ctx, quick: !!o.quick, kind: st.id === MANAGER_ID ? 'deep_analysis' : t.taskKind }),
          work: io.work, outputs: io.outputs, pushOutput: io.pushOutput, isStopped: io.isStopped,
        });
      } catch (e) { const cur = getTask(taskId); Object.assign(cur, { status: 'in_progress', lastError: e.message }); saveTask(cur); return; }
      if (r.status === 'stopped' || isBlocked(taskId)) return;
      const cur = getTask(taskId);
      cur.flow = flow;
      const ids = [...new Set(flow.plan.map((p) => p.staffId))];
      if (ids.length) cur.assigneeIds = ids;
      cur.status = r.status === 'done' ? 'done' : r.status === 'waiting_user' ? 'waiting_user' : 'in_progress';
      cur.lastError = r.error || null;
      saveTask(cur);
      if (r.status === 'waiting_user' && (cur.outputs || []).some((o) => o.waiting && o.requestId && getRequest(o.requestId)?.status !== 'pending')) rerun.add(taskId);
      if (r.status === 'done') bg(learnFromTask(taskId));
      return;
    }
    if (t.campaign) {
      // Quy trình chuẩn Fanpage: từng bước một người phụ trách, chốt duyệt của người dùng.
      let r;
      try { r = await runCampaign(taskId, io.pushOutput); } catch (e) { const cur = getTask(taskId); Object.assign(cur, { status: 'in_progress', lastError: e.message }); saveTask(cur); return; }
      if (isBlocked(taskId)) return;
      const cur = getTask(taskId);
      cur.status = r.status === 'done' ? 'done' : r.status === 'waiting_user' ? 'waiting_user' : 'in_progress';
      saveTask(cur);
      if (r.status === 'done') bg(learnFromTask(taskId));
      return;
    }
    if (t.kind === 'general') {
      const fallback = executionPlan(t).map((x, i) => ({
        key: `f${i + 1}`, staff: getStaff(x.staffId), label: x.label || `Phần của ${getStaff(x.staffId).name}`, ask: x.ask || 'Làm phần việc phù hợp nhất với bạn theo bản chốt.', criteria: '',
      }));
      result = await executeWithReview(io, t.session?.finalPlan || null, fallback, t.session?.finalSummary || null);
    } else {
      const assignee = getStaff(t.assigneeIds[0]);
      result = await runIndividual({ ...io, assignee, reviewer: reviewerFor(t, assignee, staffList()) });
    }
    if (result.status === 'stopped' || isBlocked(taskId)) return; // lệnh dừng của Quản lý luôn thắng
    t = getTask(taskId);
    if (result.status === 'returned_for_redo') Object.assign(t, { status: 'returned_for_redo', returnReason: `Phúc kiểm tra: ${result.returnReason}`, passCriteria: result.passCriteria });
    else if (result.status === 'waiting_user') {
      t.status = 'waiting_user';
      // Người dùng đã trả lời trong lúc các bước khác còn chạy → không để việc kẹt ở "Chờ người dùng".
      if ((t.outputs || []).some((o) => o.waiting && o.requestId && getRequest(o.requestId)?.status !== 'pending')) rerun.add(taskId);
    }
    else if (result.status === 'done') t.status = 'done';
    else Object.assign(t, { status: 'in_progress', lastError: result.error || null });
    saveTask(t);
    if (result.status === 'done' || result.status === 'returned_for_redo') bg(learnFromTask(taskId));
  }
}

// ---------- Quy trình chuẩn Fanpage (shared/campaign.js) ----------
async function runCampaign(taskId, pushOutput) {
  const t = getTask(taskId);
  const campaign = t.campaign;
  const fpx = fpIo(CONTENT_ID);
  return advanceCampaign({
    ...fpx, campaign,
    save: () => { const cur = getTask(taskId); cur.campaign = campaign; saveTask(cur); },
    think: (staffId, ctx) => think(getStaff(staffId), { ...ctx, kind: staffId === CONTENT_ID ? 'writing' : 'deep_analysis' }),
    staffName: (id) => getStaff(id)?.name || id,
    getPost: (id) => fp().posts.find((x) => x.id === id) || null,
    publishPost: (post) => fpx.publish({ text: post.text, image: store.docs.get(`fpimg-${post.id}`)?.dataUrl || null, post }),
    runAd: (item, post) => trialRunAd(fpx.ops, item, post),
    createRequest: (q) => createRequest({ ...q, taskId, staffId: q.type === 'post' ? CONTENT_ID : q.type === 'retry' ? ANALYST_ID : ADS_ID }),
    getRequest,
    pushOutput,
  });
}

// ---------- Tự học sau mỗi việc ----------
// Trang đọc kết quả và đánh giá, viết bài học cho từng người → mục "Bài học tự rút ra", phiên bản đào tạo mới.
async function learnFromTask(taskId) {
  const t = getTask(taskId);
  const outputs = (t.outputs || []).filter((o) => o.text || o.error);
  if (!outputs.length) return;
  await runLearning({
    task: t, outputs, staffList: staffList(), trainer: getStaff(TRAINER_ID), think,
    apply: (staffId, lessons) => {
      const s = getStaff(staffId);
      saveTraining(staffId, { ...s.training, lessons: mergeLessons(s.training.lessons, lessons, t.title) }, `Tự học từ việc "${String(t.title).slice(0, 60)}"`);
    },
  }).catch((e) => console.error('learn', e));
}

// ---------- Tự động: lịch làm việc hằng ngày và báo cáo 21:00 (chạy khi văn phòng đang mở) ----------
let autoBusy = false;
async function runAutomation() {
  if (autoBusy) return;
  autoBusy = true;
  try {
    for (const due of dueCycles(fp().ops)) if (!fpRunning.has(due.cycle)) bg(runFpCycle(due.cycle, due.slot));
    for (const t of tasksAll()) if (t.campaign && t.status === 'in_progress' && !executing.has(t.id)) bg(executeTask(t.id));
    for (const s of office().staff) {
      for (const r of dueRoutines(s.routines || [])) {
        r.lastRunDate = hcmToday(); saveOffice(); // đánh dấu trước để không chạy hai lần
        const t = createTaskRecord({ title: `${r.time} — ${r.title}`, description: r.description, kind: 'individual', assigneeIds: [s.id], createdBy: 'system' });
        bg(executeTask(t.id));
      }
    }
    const today = hcmDate();
    if (hcmHour() >= REPORT_HOUR && !reportRunning && !listDoc('reports').list.some((x) => x.date === today && x.trigger === 'schedule')) {
      const active = tasksAll().some((x) => x.updatedAt?.startsWith(today)) || listMessages('group').some((m) => m.createdAt.startsWith(today));
      if (active) bg(generateReport('schedule'));
    }
  } finally {
    autoBusy = false;
  }
}

// ---------- Phiếu bán hàng ----------
function sign(staffId) {
  const s = getStaff(staffId);
  return { staffId, staffName: s.name, signCode: s.signCode, signedAt: now() };
}
function getSlip(id) {
  const s = listDoc('slips').list.find((x) => x.id === id);
  if (!s) throw fail('Không tìm thấy phiếu.');
  return s;
}

// ---------- Zalo (bản trải nghiệm: không có cầu nối, worker luôn tắt) ----------
const zaloWorker = () => ({ online: false, lastSeenAt: null });

// ---------- Báo cáo ----------
let reportRunning = false;
async function generateReport(trigger) {
  if (reportRunning) throw fail('Báo cáo đang được tạo.');
  reportRunning = true;
  const doc = listDoc('reports');
  const rep = { id: rid('R-'), date: hcmDate(), trigger, cskhText: null, cskhBrain: null, summary: null, brainLabel: null, error: null, createdAt: now() };
  doc.list.unshift(rep);
  doc.list = doc.list.slice(0, 20);
  store.save('reports');
  try {
    const snapshot = reportSnapshot(tasksAll(), staffById());
    const errors = [];
    try {
      const r = await think(getStaff(CSKH_ID), { question: CSKH_REPORT_QUESTION(rep.date), currentTask: { baoCaoNgay: rep.date, viecTrongVanPhong: snapshot } });
      rep.cskhText = r.text; rep.cskhBrain = r.brainLabel;
      store.save('reports');
    } catch (e) { errors.push(`Chi: ${e.message}`); }
    try {
      const r = await think(getStaff(MANAGER_ID), {
        question: MANAGER_REPORT_QUESTION(rep.date), currentTask: { baoCaoNgay: rep.date, viecTrongVanPhong: snapshot },
        priorTurns: rep.cskhText ? [{ nguoi: 'Chi', noiDung: `Đề xuất CSKH (chờ người dùng duyệt): ${rep.cskhText}` }] : [],
      });
      rep.summary = r.text; rep.brainLabel = r.brainLabel;
    } catch (e) { errors.push(`Phúc: ${e.message}`); }
    if (errors.length) rep.error = errors.join('\n');
    store.save('reports');
  } finally {
    reportRunning = false;
  }
}

// ---------- Định tuyến ----------
const routes = [];
const on = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern}$`), fn });
const bg = (p) => { p.catch((e) => console.error(e)); };
const textOf = (b, f = 'text') => {
  const t = String(b?.[f] || '').trim();
  if (!t) throw fail('Nội dung trống.');
  if (t.length > 20000) throw fail('Nội dung quá dài (tối đa 20000 ký tự).');
  return t;
};

on('GET', '/api/me', () => {
  const o = office();
  return {
    username: store.userName || 'tài khoản claude.ai', officeName: o.officeName, companyName: o.companyName, trial: true,
    persistent: store.persistent, storageWarning: store.persistent ? store.writeError : (store.writeError || 'Không lưu được dữ liệu trong khung xem này: dữ liệu sẽ mất khi tải lại trang.'),
    claudeDefault: { model: 'Claude qua tài khoản claude.ai', configured: true },
  };
});
on('PUT', '/api/me', (b) => {
  const o = office();
  if (b.officeName?.trim()) o.officeName = b.officeName.trim().slice(0, 120);
  if (b.companyName?.trim()) o.companyName = b.companyName.trim().slice(0, 120);
  saveOffice();
  return { ok: true };
});
on('DELETE', '/api/me', () => {
  for (const id of [...store.docs.keys()]) store.remove(id);
  imageCache.clear();
  office();
  return { ok: true };
});
on('POST', '/api/logout', () => ({ ok: true }));

on('GET', '/api/staff', () => staffList().map((s) => ({
  ...s,
  currentBrain: { label: `Claude qua tài khoản claude.ai (${s.id === MANAGER_ID ? 'complex' : 'default'})`, source: 'claude_account', fallbackReason: null },
  apiConfigs: (rawStaff(s.id)?.brains || []).map(publicBrain), softwareLinks: linksOf(s.id),
})));
on('PUT', '/api/staff/(STAFF-\\d+)/training', (b, [id]) => {
  if (!rawStaff(id)) throw fail('Không tìm thấy nhân viên.');
  return saveTraining(id, b?.training || { prompt: b?.trainingText });
});
// Lưu đào tạo nhiều mục thành phiên bản mới; bản cũ vào lịch sử (giữ 8 bản, cắt bớt nếu tài liệu quá lớn).
function saveTraining(id, input, note = 'Người dùng sửa') {
  const raw = rawStaff(id);
  const d = trainingDoc(id);
  const training = normalizeTraining(input);
  if (!compileTraining(training)) throw fail('Đào tạo không được để trống.');
  d.history = pushHistory(d.history, raw.trainingVersion, d.training, note);
  d.training = training;
  while (JSON.stringify(d).length > 230000 && d.history.length) d.history.pop();
  raw.trainingVersion++;
  store.save(`training-${id}`); saveOffice();
  return getStaff(id);
}
on('POST', '/api/staff/(STAFF-\\d+)/training/restore', (b, [id]) => {
  if (!rawStaff(id)) throw fail('Không tìm thấy nhân viên.');
  const h = trainingDoc(id).history.find((x) => x.version === Number(b.version));
  if (!h) throw fail('Không tìm thấy phiên bản đào tạo này.');
  return saveTraining(id, h.training, `Khôi phục v${h.version}`);
});
on('POST', '/api/staff/reset', () => { resetAllStaff(); return staffList(); });
on('PUT', '/api/staff/(STAFF-\\d+)/routines', (b, [id]) => {
  const raw = rawStaff(id);
  if (!raw) throw fail('Không tìm thấy nhân viên.');
  const old = Object.fromEntries((raw.routines || []).map((r) => [r.id, r]));
  try { raw.routines = validateRoutines(b.routines).map((r) => ({ ...r, lastRunDate: old[r.id]?.lastRunDate ?? r.lastRunDate })); } catch (e) { throw fail(e.message); }
  saveOffice();
  return getStaff(id);
});
on('PUT', '/api/staff/(STAFF-\\d+)/status', (b, [id]) => {
  const s = rawStaff(id);
  if (!s) throw fail('Không tìm thấy nhân viên.');
  if (!STAFF_STATUSES[b.status]) throw fail('Trạng thái không hợp lệ.');
  s.manualStatus = b.status; saveOffice();
  return getStaff(id);
});
on('PUT', '/api/staff/(STAFF-\\d+)/profile', (b, [id]) => {
  const s = rawStaff(id);
  if (!s) throw fail('Không tìm thấy nhân viên.');
  try { Object.assign(s, validateProfileFull(b)); } catch (e) { throw fail(e.message); }
  saveOffice();
  return getStaff(id);
});

// API riêng: cùng hợp đồng với bản server (/api/apis/:owner, /api/api-config/:id), thêm nhà cung cấp "claude_ai".
const needBrain = (id) => { const c = allBrains().find((x) => x.id === id); if (!c) throw fail('Không tìm thấy API.'); return c; };
on('POST', '/api/apis/list-models', async (b) => {
  if (!TRIAL_PROVIDERS.includes(b.provider)) throw fail('Nhà cung cấp không hợp lệ.');
  if (b.provider !== 'claude_ai' && !b.apiKey) throw fail('Nhập key trước.');
  try { return { ok: true, models: await listModels({ provider: b.provider, baseUrl: b.baseUrl }, String(b.apiKey || '').trim()) }; } catch (e) { return { ok: false, error: e.message }; }
});
on('GET', '/api/apis/(company|STAFF-\\d+)', (b, [owner]) => brainsOf(owner).map(publicBrain));
on('POST', '/api/apis/(company|STAFF-\\d+)', (b, [owner]) => {
  const list = brainsOf(owner);
  if (!TRIAL_PROVIDERS.includes(b.provider)) throw fail('Nhà cung cấp không hợp lệ.');
  const role = b.role || 'general';
  if (!API_ROLES.includes(role)) throw fail('Vai trò API không hợp lệ.');
  const key = String(b.apiKey || '').trim();
  if (b.provider !== 'claude_ai' && !key) throw fail('Thiếu key.');
  if (b.provider === 'openai_compatible' && !/^https:\/\//i.test(String(b.baseUrl || '').trim())) throw fail('Nhà cung cấp tương thích OpenAI cần Base URL bắt đầu bằng https://');
  if (b.provider === 'claude_ai' && b.model && !CLAUDE_MODELS.includes(b.model)) throw fail('Model Claude không hợp lệ.');
  if (list.length >= 8) throw fail('Tối đa 8 API cho mỗi nhân viên.');
  const c = {
    id: rid('API-'), staffId: owner === 'company' ? null : owner, provider: b.provider, role, model: String(b.model || '').trim() || null,
    effort: ['low', 'medium', 'high'].includes(b.effort) ? b.effort : null, baseUrl: b.provider === 'openai_compatible' ? String(b.baseUrl).trim() : null,
    keyLast4: key ? key.slice(-4) : null, enabled: true, lastCheckAt: b.provider === 'claude_ai' ? now() : null, lastCheckOk: b.provider === 'claude_ai', lastProviderError: null, createdAt: now(),
  };
  if (key) sessionKeys.set(c.id, key);
  list.push(c); saveOffice();
  return publicBrain(c);
});
on('PUT', '/api/api-config/([\\w-]+)', (b, [id]) => {
  const c = needBrain(id);
  if (b.enabled !== undefined) c.enabled = !!b.enabled;
  if (b.model !== undefined) c.model = String(b.model || '').trim() || null;
  if (b.effort !== undefined) c.effort = ['low', 'medium', 'high'].includes(b.effort) ? b.effort : null;
  if (b.role !== undefined) { if (!API_ROLES.includes(b.role)) throw fail('Vai trò API không hợp lệ.'); c.role = b.role; }
  if (b.apiKey) { const k = String(b.apiKey).trim(); sessionKeys.set(c.id, k); c.keyLast4 = k.slice(-4); c.lastCheckOk = false; }
  saveOffice();
  return publicBrain(c);
});
on('DELETE', '/api/api-config/([\\w-]+)', (b, [id]) => {
  needBrain(id);
  sessionKeys.delete(id);
  const o = office();
  o.companyBrains = (o.companyBrains || []).filter((x) => x.id !== id);
  for (const x of o.staff) if (x.brains) x.brains = x.brains.filter((c) => c.id !== id);
  saveOffice();
  return { ok: true };
});
on('POST', '/api/api-config/([\\w-]+)/check', async (b, [id]) => {
  const c = needBrain(id);
  const note = c.provider === 'claude_ai'
    ? 'Claude qua claude.ai không cần key: dùng hạn mức tài khoản claude.ai của bạn. Model không mở được cho tài khoản thì nền tảng tự chạy model cùng hạng, nhãn câu trả lời ghi model thật.'
    : 'Kiểm tra chỉ liệt kê danh sách model. Kiểm tra đạt KHÔNG có nghĩa gọi trả lời sẽ thành công.';
  try {
    const models = await listModels(c, sessionKeys.get(c.id));
    Object.assign(c, { lastCheckAt: now(), lastCheckOk: true });
    saveOffice();
    return { ok: true, models, note, config: publicBrain(c) };
  } catch (e) {
    Object.assign(c, { lastCheckAt: now(), lastCheckOk: false, lastProviderError: e.message });
    saveOffice();
    return { ok: false, error: e.message, note, config: publicBrain(c) };
  }
});

// Phần mềm làm việc. Bản trải nghiệm không lưu mã bí mật (chỉ 4 ký tự cuối) và không gọi được mạng ngoài:
// dữ liệu nạp bằng "Nhập dữ liệu" (dán / tải CSV xuất từ KiotViet). Mỗi lần thao tác ghi vào nhật ký.
const LINK_STATUSES = ['connected', 'expired', 'not_connected'];
const linkView = (l) => {
  const d = store.docs.get(`linkdata-${l.id}`);
  return { kind: 'other', purpose: '', retailer: '', clientId: '', pageId: '', logs: [], ...l, browsing: browsing.get(l.id) || null, data: d ? { kind: d.kind, source: d.source, at: d.at, count: d.items.length } : null };
};
const linksOf = (staffId) => listDoc('links').list.filter((l) => !staffId || l.staffId === staffId).map(linkView);
function needLink(id) {
  const l = listDoc('links').list.find((x) => x.id === id);
  if (!l) throw fail('Không tìm thấy liên kết.');
  return l;
}
function applyLinkFields(l, b) {
  if (b.softwareName !== undefined) { const v = String(b.softwareName).trim().slice(0, 120); if (!v) throw fail('Cần tên phần mềm.'); l.softwareName = v; }
  if (b.url !== undefined) { const v = String(b.url).trim().slice(0, 600); if (!/^https?:\/\//i.test(v)) throw fail('Địa chỉ phần mềm phải bắt đầu bằng http:// hoặc https://'); l.url = v; }
  if (b.kind !== undefined) { if (!LINK_KINDS[b.kind]) throw fail('Loại phần mềm không hợp lệ.'); l.kind = b.kind; }
  if (b.status !== undefined) { if (!LINK_STATUSES.includes(b.status)) throw fail('Trạng thái không hợp lệ.'); l.status = b.status; l.lastCheckAt = now(); }
  for (const k of ['purpose', 'permissionScope']) if (b[k] !== undefined) l[k] = String(b[k]).trim().slice(0, 2000);
  for (const k of ['retailer', 'clientId', 'pageId', 'adAccountId']) if (b[k] !== undefined) l[k] = String(b[k]).trim().slice(0, 200);
  if (b.accessCode) l.accessCodeLast4 = String(b.accessCode).slice(-4);
  if (b.accessGranted !== undefined) {
    l.accessGranted = !!b.accessGranted;
    l.logs = pushLog(l.logs, l.accessGranted ? 'Cho phép nhân viên tự truy cập' : 'Thu hồi quyền tự truy cập', true, '');
  }
}
on('GET', '/api/links', () => linksOf());
on('POST', '/api/staff/(STAFF-\\d+)/links', (b, [id]) => {
  if (!rawStaff(id)) throw fail('Không tìm thấy nhân viên.');
  const l = { id: rid('SL-'), staffId: id, status: 'not_connected', permissionScope: '', accessCodeLast4: null, lastSyncAt: null, lastCheckAt: now(), lastOpenedAt: null, logs: [] };
  if (!b.softwareName || !b.url) throw fail('Cần tên phần mềm và đường dẫn.');
  applyLinkFields(l, b);
  l.logs = pushLog(l.logs, 'Tạo liên kết', true, l.purpose || '');
  listDoc('links').list.push(l); store.save('links');
  return linksOf(id);
});
on('PUT', '/api/links/([\\w-]+)', (b, [id]) => {
  const l = needLink(id);
  applyLinkFields(l, b);
  if (b.opened) { l.lastOpenedAt = now(); l.logs = pushLog(l.logs, 'Mở trình duyệt', true, l.url); }
  if (b.status === 'expired') l.logs = pushLog(l.logs, 'Đánh dấu hết hạn', true, 'Chờ người dùng tự đăng nhập lại.');
  store.save('links');
  return linkView(l);
});
on('DELETE', '/api/links/([\\w-]+)', (b, [id]) => {
  const l = needLink(id);
  const doc = listDoc('links');
  doc.list = doc.list.filter((x) => x.id !== id);
  store.save('links'); store.remove(`linkdata-${id}`);
  return linksOf(l.staffId);
});
// Nhân viên tự điều khiển trình duyệt có sẵn trong ứng dụng Claude (máy tính) để lấy dữ liệu phần mềm.
// Chỉ chạy khi mở văn phòng trong ứng dụng Claude desktop; mỗi lần bấm / nhập ứng dụng có thể hỏi bạn xác nhận.
const BROWSER = 'host:claude_browser';
const browsing = new Map();
let mcpPromise = null;
const getMcp = () => (mcpPromise ||= (globalThis.claude ? globalThis.claude.use('mcp') : Promise.resolve(null)));
const mcpText = (r) => {
  const blocks = (r?.content || []).filter((x) => x.type === 'text');
  if (blocks.length) return blocks.map((x) => x.text).join('\n');
  return typeof r?.payload === 'string' ? r.payload : r?.payload != null ? JSON.stringify(r.payload) : '';
};
const MCP_HINT = {
  server_not_connected: 'Trình duyệt chỉ dùng được khi mở văn phòng trong ứng dụng Claude trên máy tính.',
  not_in_manifest: 'Bạn chưa cho phép văn phòng dùng trình duyệt (mở menu Quyền của trang để bật lại).',
  approval_required: 'Thao tác cần bạn xác nhận trong ứng dụng Claude.',
  cancelled: 'Bạn đã từ chối thao tác này trong ứng dụng Claude.',
};
function claudeBrowser(mcp) {
  let tabId;
  let elements = ''; // danh sách phần tử lần đọc gần nhất, để biết nút sắp bấm là nút gì
  const call = async (tool, input) => {
    try {
      return mcpText(await mcp.callTool(BROWSER, tool, tabId === undefined ? input : { ...input, tabId }));
    } catch (e) {
      throw new Error(`${MCP_HINT[e?.code] ? `${MCP_HINT[e.code]} ` : ''}[${e?.code || 'lỗi'}] ${e?.message || e}`);
    }
  };
  const read = async () => {
    const text = await call('get_page_text', {});
    elements = await call('read_page', { filter: 'interactive' }).catch((e) => `(không đọc được phần tử: ${e.message})`);
    return `${text.slice(0, 7000)}\n--- Phần tử (mã ref để bấm / nhập) ---\n${elements.slice(0, 5000)}`;
  };
  return {
    async open(url) {
      const r = await mcp.callTool(BROWSER, 'preview_start', { url }).catch((e) => { throw new Error(`${MCP_HINT[e?.code] || ''} [${e?.code || 'lỗi'}] ${e?.message || e}`.trim()); });
      const id = r?.payload?.tabId ?? r?.structuredContent?.tabId ?? Number(/tab\s*id\D{0,5}(\d+)/i.exec(mcpText(r))?.[1]);
      if (Number.isFinite(Number(id))) tabId = Number(id);
      await new Promise((ok) => setTimeout(ok, 1500));
      return read();
    },
    async go(url) { await call('navigate', { url }); return read(); },
    read,
    find: (q) => call('find', { query: q }),
    async click(ref, mode) {
      const line = elements.split('\n').find((l) => new RegExp(`\\b${ref.replace(/[^\w-]/g, '')}\\b`).test(l)) || '';
      const blocked = clickBlocked(line.trim(), mode);
      if (blocked) throw new Error(blocked);
      await call('computer', { action: 'left_click', ref }); await new Promise((ok) => setTimeout(ok, 1200)); return read(); },
    async type(ref, text) { await call('form_input', { ref, value: text }); return read(); },
  };
}
async function browseOnce(id, { goal = '', mode = 'read', content = '', image = null, budgetCap = 0, url = null } = {}) {
  const l = needLink(id);
  if (browsing.has(id)) return { status: 'error', message: 'Nhân viên đang dùng trình duyệt cho phần mềm này, thử lại sau.' };
  const mcp = await getMcp();
  const log = logInto(l);
  if (!mcp) {
    log(mode === 'publish' ? 'Đăng nội dung' : 'Mở trình duyệt', false, MCP_HINT.server_not_connected);
    store.save('links');
    return { status: 'error', message: MCP_HINT.server_not_connected };
  }
  const staff = getStaff(l.staffId);
  browsing.set(id, { step: 'Đang mở trình duyệt…', at: now() });
  try {
    const res = await runBrowserAgent({
      staff, link: l, goal: String(goal || '').slice(0, 1000), browser: claudeBrowser(mcp), mode, content, image, budgetCap, url,
      think: (st, ctx) => think(st, { ...ctx, kind: 'deep_analysis' }),
      log: (action, ok, detail) => { log(action, ok, detail); browsing.set(id, { step: `${action}${detail ? `: ${String(detail).slice(0, 80)}` : ''}`, at: now() }); store.save('links'); },
    });
    l.lastOpenedAt = now();
    if (res.status === 'saved') {
      const doc = { kind: res.data.kind, source: `${staff.name} lấy qua trình duyệt`, at: now(), items: res.data.items };
      while (JSON.stringify(doc).length > 240000 && doc.items.length > 10) doc.items = doc.items.slice(0, Math.floor(doc.items.length * 0.8));
      store.docs.set(`linkdata-${id}`, doc); store.save(`linkdata-${id}`);
      Object.assign(l, { status: 'connected', lastSyncAt: now(), lastCheckAt: now() });
    } else if (res.status === 'need_login') {
      Object.assign(l, { status: 'expired', lastCheckAt: now() }); // không tự đăng nhập lại
    }
    log(mode === 'publish' ? 'Kết quả đăng nội dung' : 'Kết quả lấy dữ liệu qua trình duyệt', res.status === 'saved' || res.status === 'published', res.message);
    return res;
  } catch (e) {
    log(mode === 'publish' ? 'Đăng nội dung' : 'Lấy dữ liệu qua trình duyệt', false, e.message);
    return { status: 'error', message: e.message };
  } finally {
    browsing.delete(id);
    store.save('links');
  }
}
async function webSearch(q) {
  const mcp = await getMcp();
  if (!mcp) throw new Error(MCP_HINT.server_not_connected);
  // Mở trang tìm kiếm trong trình duyệt của ứng dụng Claude, đọc chữ của trang kết quả.
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const opened = await mcp.callTool(BROWSER, 'preview_start', { url }).catch((e) => { throw new Error(`${MCP_HINT[e?.code] || ''} [${e?.code || 'lỗi'}] ${e?.message || e}`.trim()); });
  const tabId = Number(opened?.payload?.tabId ?? opened?.structuredContent?.tabId ?? /tab\s*id\D{0,5}(\d+)/i.exec(mcpText(opened))?.[1]);
  await new Promise((ok) => setTimeout(ok, 1500));
  const text = mcpText(await mcp.callTool(BROWSER, 'get_page_text', Number.isFinite(tabId) ? { tabId } : {}));
  return `Kết quả tìm "${q}":\n${text.slice(0, 5000)}`;
}
on('POST', '/api/links/([\\w-]+)/browse', async (b, [id]) => {
  const l = needLink(id);
  if (browsing.has(id)) throw fail('Nhân viên đang mở trình duyệt cho phần mềm này.');
  if (!(await getMcp())) throw fail(MCP_HINT.server_not_connected);
  bg(browseOnce(id, { goal: b.goal }));
  return linkView(l);
});
// Nhân viên xem phần mềm trong lúc làm việc: trình duyệt của ứng dụng Claude; không được thì dùng dữ liệu đã lưu.
async function readSoftware(id, want = '') {
  const l = needLink(id);
  const res = await browseOnce(id, { goal: want });
  const note = res.status === 'saved' ? '' : `Trình duyệt chưa lấy được dữ liệu (${res.status === 'need_login' ? 'phần mềm yêu cầu đăng nhập — người dùng phải tự đăng nhập trong trình duyệt của ứng dụng Claude' : res.message}). `;
  const d = store.docs.get(`linkdata-${id}`);
  if (!d) return `${note}Chưa có dữ liệu nào của ${l.softwareName}.`;
  return `${note}Dữ liệu ${l.softwareName} (${d.source}, lúc ${d.at}, tổng ${d.items.length} mục). Các mục liên quan: ${JSON.stringify(pickRelevant(d.items, want, 30))}`;
}

// ---------- Fanpage tự vận hành (shared/fanpage.js) ----------
// An làm bài + thiết kế và tự đăng, Tuấn kiểm tra số liệu và khuyên, Bình đề xuất quảng cáo (chỉ chạy khi bạn duyệt)
// và chia sẻ bài hay vào nhóm. Bản trải nghiệm thao tác qua trình duyệt của ứng dụng Claude; ảnh lưu từng tài liệu riêng.
const fp = () => store.get('fanpage', { ops: { ...DEFAULT_OPS }, posts: [], snapshots: [], advice: [], plans: [] });
const saveFp = () => {
  const d = fp();
  d.posts = d.posts.slice(0, 40); d.snapshots = d.snapshots.slice(0, 30); d.advice = d.advice.slice(0, 30); d.plans = d.plans.slice(0, 20);
  while (JSON.stringify(d).length > 230000 && d.posts.length > 5) d.posts.pop();
  store.save('fanpage');
};
const fpRunning = new Set();
function renderDesign(spec) {
  try {
    const c = drawDesign(document.createElement('canvas'), spec);
    return c.toDataURL('image/jpeg', 0.8);
  } catch (e) {
    console.error('render', e);
    return null;
  }
}
// Fanpage đang dùng: chọn trong "Vận hành Fanpage", chưa chọn thì lấy Fanpage đầu tiên đã kết nối (ưu tiên của An).
const fpLink = (ops) => {
  if (ops.fanpageLinkId) return needLink(ops.fanpageLinkId);
  const l = [...listDoc('links').list].sort((a, b) => (b.staffId === CONTENT_ID) - (a.staffId === CONTENT_ID)).find((x) => x.kind === 'facebook_page');
  if (!l) throw new Error('Chưa kết nối Fanpage: thêm phần mềm loại "Fanpage Facebook" cho An (trang nhân viên → Phần mềm).');
  return l;
};
async function trialRunAd(ops, item, post) {
  const link = ops.adsLinkId || fpLink(ops).id;
  const desc = `${AD_KINDS[item.loai]}${post ? ` cho bài: ${post.url || post.topic}` : ' cho cả trang'}; ngân sách ${vnd(item.nganSachNgay)}/ngày trong ${item.soNgay} ngày; đối tượng ${item.doiTuong.tuoiTu}-${item.doiTuong.tuoiDen} tuổi, ${item.doiTuong.khuVuc}; mục tiêu: ${item.mucTieu}`;
  const res = await browseOnce(link, { mode: 'ads', content: desc, budgetCap: item.nganSachNgay, goal: 'Chạy quảng cáo đã duyệt', url: post?.url || null });
  return { ok: res.status === 'published', message: res.message };
}
function fpIo(staffId) {
  const d = fp();
  const ops = d.ops;
  return {
    ops, staff: getStaff(staffId),
    think: (st, ctx) => think(st, { ...ctx, kind: st.id === CONTENT_ID ? 'writing' : 'deep_analysis' }),
    posts: () => fp().posts,
    advice: (to) => fp().advice.filter((a) => a.to === to).slice(0, 5),
    history: () => fp().snapshots.slice(0, 10),
    latestSnapshot: () => fp().snapshots[0] || null,
    plans: () => fp().plans.slice(0, 5),
    render: renderDesign,
    publish: async ({ text, image }) => {
      const res = await browseOnce(fpLink(ops).id, { mode: 'publish', content: text, image, goal: 'Đăng bài mới lên Fanpage' });
      return { ok: res.status === 'published', message: res.message };
    },
    readMetrics: async () => {
      const l = fpLink(ops);
      const res = await browseOnce(l.id, { goal: 'Đọc số người theo dõi, lượt thích trang, và lượt thích / bình luận / chia sẻ của các bài mới nhất' });
      const data = store.docs.get(`linkdata-${l.id}`);
      if (res.status !== 'saved' && !data) return { ok: false, message: res.message };
      return { ok: true, snapshot: { source: res.status === 'saved' ? 'Tuấn đọc qua trình duyệt' : `dữ liệu lưu lúc ${data.at} (trình duyệt lần này lỗi: ${res.message})`, raw: data.items.slice(0, 40) } };
    },
    shareToGroup: async (post, g) => {
      const res = await browseOnce(fpLink(ops).id, { mode: 'publish', content: `${post.url ? `${post.url}\n\n` : ''}${String(post.text).slice(0, 600)}`, url: g.url, goal: 'Chia sẻ bài viết của Fanpage vào nhóm' });
      return { ok: res.status === 'published', message: res.message };
    },
    savePost: (p) => {
      const { image, ...rest } = p;
      const post = { id: rid('FP-'), ...rest, shares: [], stats: null, createdAt: now() };
      if (image) { store.docs.set(`fpimg-${post.id}`, { dataUrl: image }); store.save(`fpimg-${post.id}`); }
      fp().posts.unshift(post); saveFp();
      return post;
    },
    updatePost: (id, f) => { const p = fp().posts.find((x) => x.id === id); if (p) Object.assign(p, f); saveFp(); },
    markShared: (id, url, ok, message) => { const p = fp().posts.find((x) => x.id === id); if (p) p.shares = [...(p.shares || []), { url, ok, message: String(message).slice(0, 300), at: now() }]; saveFp(); },
    saveSnapshot: (snap) => { fp().snapshots.unshift(snap); saveFp(); },
    saveAdvice: (a) => { fp().advice.unshift({ ...a, text: a.text.slice(0, 3000), at: now() }); saveFp(); },
    savePlan: (p) => { const plan = { id: rid('AP-'), ...p, createdAt: now() }; fp().plans.unshift(plan); saveFp(); return plan; },
    updatePlan: (id, f) => { const p = fp().plans.find((x) => x.id === id); if (p) Object.assign(p, f); saveFp(); },
    createRequest: (q) => createRequest({ type: 'ads', staffId: ADS_ID, question: q.question, content: q.content, planId: q.planId }),
    groupMessage: (sid, text, postId = null) => addMessage('group', sid, text, null, false, postId),
  };
}
async function runFpCycle(cycle, slot = 'tay') {
  if (fpRunning.has(cycle)) throw fail('Chu kỳ này đang chạy.');
  fpRunning.add(cycle);
  const d = fp();
  markRun(d.ops, cycle, slot); saveFp(); // đánh dấu trước để không chạy hai lần
  try {
    if (cycle === 'content') return await runContentCycle(fpIo(CONTENT_ID));
    if (cycle === 'analyst') return await runAnalystCycle(fpIo(ANALYST_ID));
    if (cycle === 'ads') return await runAdsCycle(fpIo(ADS_ID));
    if (cycle === 'share') return await runShareCycle(fpIo(ADS_ID));
    throw fail('Chu kỳ không hợp lệ.');
  } catch (e) {
    addMessage('group', { content: CONTENT_ID, analyst: ANALYST_ID }[cycle] || ADS_ID, `Lỗi khi chạy "${cycle}": ${e.message}`, null, true);
    return { status: 'error', message: e.message };
  } finally {
    fpRunning.delete(cycle);
  }
}
async function approveAdsPlan(planId) {
  const plan = fp().plans.find((x) => x.id === planId);
  if (!plan) throw new Error('Không tìm thấy kế hoạch quảng cáo.');
  plan.status = 'starting'; saveFp();
  const x = fpIo(ADS_ID);
  return executeAdsPlan({
    ...x, plan,
    runAd: (item, post) => trialRunAd(x.ops, item, post),
  });
}
on('GET', '/api/fanpage', () => ({ ...fp(), posts: fp().posts.slice(0, 20), running: [...fpRunning] }));
on('PUT', '/api/fanpage', (b) => {
  const d = fp();
  let ops;
  try { ops = validateOps(b, d.ops); } catch (e) { throw fail(e.message); }
  for (const k of ['fanpageLinkId', 'adsLinkId']) if (ops[k]) needLink(ops[k]);
  d.ops = ops; saveFp();
  return { ...fp(), posts: fp().posts.slice(0, 20), running: [...fpRunning] };
});
on('POST', '/api/fanpage/run/(content|analyst|ads|share)', (b, [cycle]) => {
  if (fpRunning.has(cycle)) throw fail('Chu kỳ này đang chạy.');
  bg(runFpCycle(cycle));
  return { ok: true };
});
on('GET', '/api/images/([\\w-]+)', (b, [id]) => ({ dataUrl: store.docs.get(`img-${id}`)?.dataUrl || null }));
on('GET', '/api/fanpage/posts/([\\w-]+)/image', (b, [id]) => ({ dataUrl: store.docs.get(`fpimg-${id}`)?.dataUrl || null }));

// ---------- Yêu cầu của nhân viên trong lúc làm việc thật ----------
// Cần thông tin / xin phép truy cập / xin duyệt đăng. Việc dừng "Chờ người dùng"; trả lời xong thì tự chạy tiếp.
const reqDoc = () => listDoc('requests');
const requestView = (r) => ({ ...r, staffName: getStaff(r.staffId)?.name || r.staffId, linkName: r.linkId ? listDoc('links').list.find((x) => x.id === r.linkId)?.softwareName || null : null, taskTitle: r.taskId ? getTask(r.taskId)?.title || null : null });
function createRequest(q) {
  const r = { id: rid('RQ-'), status: 'pending', answer: null, result: null, content: null, linkId: null, createdAt: now(), answeredAt: null, ...q };
  const d = reqDoc();
  d.list = [r, ...d.list].slice(0, 120);
  store.save('requests');
  return r.id;
}
const getRequest = (id) => { const r = reqDoc().list.find((x) => x.id === id); return r ? requestView(r) : null; };
function resumeTask(taskId) {
  const t = taskId && getTask(taskId);
  if (t && t.status === 'waiting_user') bg(executeTask(taskId));
}
on('GET', '/api/requests', () => reqDoc().list.filter((r) => ['pending', 'publishing'].includes(r.status) || Date.now() - Date.parse(r.createdAt) < 3 * 86400000).map(requestView));
on('POST', '/api/requests/([\\w-]+)', (b, [id]) => {
  const r = reqDoc().list.find((x) => x.id === id);
  if (!r) throw fail('Không tìm thấy yêu cầu.');
  if (r.status !== 'pending') throw fail('Yêu cầu này đã được xử lý.');
  const text = String(b.answer || '').trim().slice(0, 4000);
  r.answeredAt = now();
  if (b.action === 'reject') {
    Object.assign(r, { status: 'rejected', answer: text || null });
    if (r.type === 'ads') { const pl = fp().plans.find((x) => x.id === r.planId); if (pl) Object.assign(pl, { status: 'rejected', result: text || 'Người dùng không duyệt' }); saveFp(); }
  } else if (r.type === 'ads') {
    // Kế hoạch quảng cáo: chỉ chạy khi người dùng bấm duyệt; chạy đúng kế hoạch đã duyệt.
    Object.assign(r, { status: 'publishing' });
    store.save('requests');
    bg(approveAdsPlan(r.planId).then((res) => Object.assign(r, { status: res.status === 'failed' ? 'failed' : 'published', result: res.message }))
      .catch((e) => Object.assign(r, { status: 'failed', result: e.message })).finally(() => store.save('requests')));
    return requestView(r);
  }
  else if (['plan', 'post', 'campaign_ads', 'retry'].includes(r.type)) {
    Object.assign(r, { status: 'approved', answer: text || null });
    if (r.type === 'post' && b.content !== undefined) r.content = String(b.content).slice(0, 8000);
  } else if (r.type === 'info') { if (!text) throw fail('Nhập câu trả lời.'); Object.assign(r, { status: 'answered', answer: text }); }
  else if (r.type === 'access') {
    const l = needLink(r.linkId);
    if (b.always !== false) { l.accessGranted = true; l.logs = pushLog(l.logs, 'Cho phép nhân viên tự truy cập', true, ''); store.save('links'); }
    Object.assign(r, { status: 'approved', answer: text || null });
  } else if (r.type === 'publish') {
    const final = String(b.content ?? r.content ?? '').trim();
    if (!final) throw fail('Nội dung đăng đang trống.');
    Object.assign(r, { status: 'publishing', content: final });
    store.save('requests');
    bg(browseOnce(r.linkId, r.mode === 'ads'
      ? { mode: 'ads', content: final, budgetCap: r.budgetCap || 0, goal: r.question }
      : { mode: 'publish', content: final, image: r.imageId ? store.docs.get(`img-${r.imageId}`)?.dataUrl || null : null, goal: r.question }).then((res) => {
      Object.assign(r, { status: res.status === 'published' ? 'published' : 'failed', result: res.message });
      store.save('requests');
      resumeTask(r.taskId);
    }));
    return requestView(r);
  } else throw fail('Thao tác không hợp lệ.');
  store.save('requests');
  resumeTask(r.taskId);
  return requestView(r);
});

const NO_NETWORK = 'Bản trải nghiệm chạy trong Claude nên không gọi được API KiotViet / Facebook. Hãy bấm "Nhân viên lấy qua trình duyệt" (cần ứng dụng Claude trên máy tính) hoặc "Nhập dữ liệu" (dán / tải CSV). Kết nối API trực tiếp có ở bản server.';
for (const [path, action] of [['check', 'Kiểm tra kết nối'], ['sync', 'Đồng bộ dữ liệu']]) {
  on('POST', `/api/links/([\\w-]+)/${path}`, (b, [id]) => {
    const l = needLink(id);
    l.logs = pushLog(l.logs, action, false, NO_NETWORK);
    store.save('links');
    return { ok: false, message: NO_NETWORK, link: linkView(l) };
  });
}
on('POST', '/api/links/([\\w-]+)/import', (b, [id]) => {
  const l = needLink(id);
  let d;
  try { d = parseImport(b.text); } catch (e) { throw fail(e.message); }
  let items = d.items.slice(0, 3000);
  const doc = { kind: d.kind, source: 'Nhập tay', at: now(), items };
  while (JSON.stringify(doc).length > 240000 && doc.items.length > 10) doc.items = doc.items.slice(0, Math.floor(doc.items.length * 0.8));
  store.docs.set(`linkdata-${id}`, doc); store.save(`linkdata-${id}`);
  const unit = d.kind === 'products' ? 'sản phẩm' : 'dòng ghi chú';
  const cut = doc.items.length < d.items.length ? ` (giữ ${doc.items.length}/${d.items.length} do giới hạn lưu trữ bản trải nghiệm)` : '';
  l.lastSyncAt = now(); l.logs = pushLog(l.logs, 'Nhập dữ liệu', true, `${doc.items.length} ${unit}${cut}.`);
  store.save('links');
  return { ok: true, message: `Đã nhập ${doc.items.length} ${unit}${cut}.`, link: linkView(l) };
});
on('GET', '/api/links/([\\w-]+)/data', (b, [id]) => {
  needLink(id);
  const d = store.docs.get(`linkdata-${id}`);
  return d ? { kind: d.kind, source: d.source, at: d.at, total: d.items.length, items: d.items.slice(0, 50) } : { items: [], total: 0 };
});

// Chat
on('GET', '/api/messages/(.+)', (b, [ch]) => ({ messages: listMessages(decodeURIComponent(ch)), busy: busy.has(decodeURIComponent(ch)) }));
on('POST', '/api/chat/group', (b) => {
  const text = textOf(b);
  if (b.target && !getStaff(String(b.target))) throw fail('Không tìm thấy nhân viên.');
  addMessage('group', 'user', text);
  const target = (b.target && String(b.target)) || addressedStaffId(staffList(), text);
  const responders = target ? [target] : pickRelevantStaffIds(text);
  // Người sau xét từng câu trả lời trước; cuối cùng Phúc kết luận ý của ai tốt nhất.
  bg(withBusy('group', async () => {
    for (const [i, id] of responders.entries()) await answerAs(getStaff(id), 'group', text, i > 0 ? GROUP_CRITIQUE_INSTRUCTION : undefined);
    if (responders.length >= 2) await answerAs(getStaff(MANAGER_ID), 'group', groupConclusionQuestion(text));
  }));
  return { ok: true };
});
on('POST', '/api/chat/staff/(STAFF-\\d+)', (b, [id]) => {
  const s = getStaff(id);
  if (!s) throw fail('Không tìm thấy nhân viên.');
  const text = textOf(b);
  addMessage(`staff:${id}`, 'user', text);
  bg(withBusy(`staff:${id}`, () => answerAs(s, `staff:${id}`, text)));
  return { ok: true };
});
on('POST', '/api/staff/(STAFF-\\d+)/consult', (b, [ownerId]) => {
  const owner = getStaff(ownerId);
  const question = textOf(b, 'question');
  const ids = [...new Set((b.colleagueIds || []).map(String))].filter((x) => x !== ownerId && getStaff(x));
  if (!ids.length) throw fail('Chọn ít nhất một đồng nghiệp để tham vấn.');
  const ch = `consult:${ownerId}`;
  addMessage(ch, 'user', `${owner.name} hỏi ý kiến ${ids.map((x) => getStaff(x).name).join(', ')}: ${question}`);
  bg(withBusy(ch, async () => {
    const opinions = [];
    for (const id of ids) {
      const c = getStaff(id);
      try {
        const r = await think(c, { question: `${owner.name} (${owner.role}) hỏi ý kiến bạn: ${question}` });
        opinions.push({ nguoi: c.name, noiDung: r.text });
        addMessage(ch, id, r.text, r.brainLabel);
      } catch (e) { addMessage(ch, id, `Bộ não lỗi, chưa cho ý kiến được: ${e.message}`, e.brainLabel, true); }
    }
    try {
      const r = await think(owner, { question: consultDecisionQuestion(question), priorTurns: opinions });
      addMessage(ch, ownerId, `QUYẾT ĐỊNH: ${r.text}`, r.brainLabel);
    } catch (e) { addMessage(ch, ownerId, `Bộ não lỗi, chưa chốt được: ${e.message}`, e.brainLabel, true); }
  }));
  return { ok: true };
});

// Việc
// Ô hỏi dưới mỗi việc: người làm việc trả lời trực tiếp dựa trên tiến độ và kết quả của chính việc đó.
on('POST', '/api/tasks/([\\w-]+)/ask', (b, [id]) => {
  const t = needTask(id);
  const q = String(b.question || '').trim();
  if (!q) throw fail('Nhập câu hỏi.');
  if (q.length > 4000) throw fail('Câu hỏi quá dài (tối đa 4000 ký tự).');
  const task = { ...t, planSteps: planSteps(t.session?.finalPlan, staffList()) };
  const people = taskPeople(task, MANAGER_ID);
  const who = b.staffId || people[0];
  if (!people.includes(who)) throw fail('Chỉ hỏi được người đang làm việc này.');
  const staff = getStaff(who);
  const entry = { id: rid('QA-'), staffId: who, staffName: staff.name, question: q, answer: null, brainLabel: null, isError: false, createdAt: now(), answeredAt: null };
  const ctx = taskQaContext(task, { finalSummary: t.session?.finalSummary, qa: t.qa || [], staffName: staff.name });
  t.qa = [...(t.qa || []), entry].slice(-30);
  saveTask(t);
  bg((async () => {
    try {
      const r = await think(staff, { ...ctx, question: q, kind: t.taskKind, imageIds: (t.attachments || []).map((a) => a.id) });
      Object.assign(entry, { answer: r.text, brainLabel: r.brainLabel });
    } catch (e) {
      Object.assign(entry, { answer: `Bộ não lỗi, chưa trả lời được: ${e.message}`, brainLabel: e.brainLabel || null, isError: true });
    }
    entry.answeredAt = now();
    const cur = getTask(id);
    const i = (cur.qa || []).findIndex((x) => x.id === entry.id);
    if (i >= 0) cur.qa[i] = entry;
    store.docs.set(`task-${id}`, cur); store.save(`task-${id}`); // không đổi updatedAt: hỏi đáp không phải tiến độ việc
  })());
  return { qa: t.qa };
});
on('GET', '/api/tasks', () => tasksAll().map((t) => ({ ...publicTask(t), planSteps: planSteps(t.session?.finalPlan, staffList()) })));
on('POST', '/api/tasks', (b) => {
  if (!['individual', 'general'].includes(b.kind)) throw fail('Loại việc không hợp lệ.');
  if (!b.title?.trim()) throw fail('Thiếu tên việc.');
  const atts = b.attachments || [];
  if (atts.length > 4) throw fail('Tối đa 4 ảnh cho mỗi nhiệm vụ.');
  const text = `${b.title}\n${b.description || ''}`;
  let ids = (b.assigneeIds || []).filter(getStaff);
  if (b.kind === 'individual' && ids.length !== 1) throw fail('Việc riêng cần đúng 1 nhân viên phụ trách.');
  if (b.kind === 'general' && !ids.length) ids = pickRelevantStaffIds(text);
  if (b.kind === 'general' && isMarketing(text) && ids.includes('STAFF-003')) ids = ['STAFF-003', ...ids.filter((x) => x !== 'STAFF-003')];
  const attachments = atts.map((a) => {
    if (!/^image\/(png|jpeg|gif|webp)$/.test(a?.mimeType)) throw fail('Chỉ nhận ảnh PNG, JPEG, GIF, WEBP.');
    const id = rid('ATT-');
    const bin = Uint8Array.from(atob(String(a.data || '')), (c) => c.charCodeAt(0));
    if (bin.length > 5 * 1024 * 1024) throw fail(`Ảnh ${a.fileName} vượt quá 5MB.`);
    imageCache.set(id, new Blob([bin], { type: a.mimeType }));
    return { id, fileName: String(a.fileName || 'anh'), mimeType: a.mimeType, productName: a.productName || undefined, priceNote: a.priceNote || undefined };
  });
  // Quy trình chuẩn Fanpage (form tự chọn khi việc nói về Fanpage / theo dõi / quảng cáo; người dùng đổi được) → từng bước, không họp tranh luận.
  const fanpageFlow = b.kind === 'general' && b.workflow === 'fanpage';
  // Giao việc cho cả văn phòng: từng người tự xét liên quan, ai liên quan thì làm (shared/teamflow.js).
  const teamFlow = b.kind === 'general' && b.workflow === 'team';
  // Việc làm thực tế: giao xong chỉ "Mới giao", mỗi lúc một việc của một người, làm khi bạn bấm (shared/realwork.js).
  if (b.workflow === 'real') {
    const t = createTaskRecord({ ...b, kind: 'general', title: b.title.trim(), assigneeIds: [MANAGER_ID], attachments, taskKind: b.taskKind || kindOfText(text) });
    t.real = initReal(t.title, t.description);
    t.assigneeIds = realTeam(t.real);
    saveTask(t);
    addMessage('group', MANAGER_ID, `Giao việc "${t.title}" — ${getStaff(t.real.owner).name} làm trước.`);
    return publicTask(t);
  }
  const t = createTaskRecord({ ...b, title: b.title.trim(), assigneeIds: fanpageFlow ? [ANALYST_ID, ADS_ID, CONTENT_ID, CAMPAIGN_MANAGER] : teamFlow ? [MANAGER_ID] : ids, attachments, taskKind: b.taskKind || kindOfText(text) });
  if (teamFlow) {
    t.flow = initFlow();
    saveTask(t);
    bg(executeTask(t.id));
  } else if (fanpageFlow) {
    t.campaign = initCampaign({ title: t.title, description: t.description, budget: b.budget, days: b.days });
    saveTask(t);
    bg(executeTask(t.id));
  } else if (b.kind === 'general') startGeneral(t);
  else bg(executeTask(t.id));
  return publicTask(t);
});
const needTask = (id) => { const t = getTask(id); if (!t) throw fail('Không tìm thấy việc.'); return t; };
on('GET', '/api/tasks/([\\w-]+)', (b, [id]) => {
  const t = needTask(id);
  const requests = reqDoc().list.filter((r) => r.taskId === id).map(requestView);
  if (!t.session) return { task: publicTask(t), session: null, qa: t.qa || [], requests, campaign: t.campaign || null, flow: t.flow || null, real: realView(t) };
  const participants = t.assigneeIds.map(getStaff).filter(Boolean);
  return {
    task: publicTask(t),
    session: {
      ...t.session, finalPlan: undefined, taskId: t.id,
      turns: t.session.turns.map((x) => ({ ...x, phase: x.meta?.phase || null, meta: undefined })),
      scoreboard: scoreboard(t.session.turns, participants, (x) => getStaff(x)?.name || x),
      runnerActive: running.has(t.id) || finishing.has(t.id) || executing.has(t.id),
    },
    qa: t.qa || [], requests,
  };
});
// ---------- Việc làm thực tế ----------
const settingsDoc = () => store.get('officeSettings', { hotlines: [], fanpageUrl: '', kiotvietUrl: '', adsManagerUrl: 'https://adsmanager.facebook.com/' });
function realLinks() {
  const s = settingsDoc();
  const links = listDoc('links').list;
  const pick = (kind) => links.find((l) => l.kind === kind)?.url || '';
  return { fanpageUrl: s.fanpageUrl || pick('facebook_page'), kiotvietUrl: s.kiotvietUrl || pick('kiotviet'), adsManagerUrl: s.adsManagerUrl || pick('facebook_ads') || 'https://adsmanager.facebook.com/', hotlines: s.hotlines };
}
const realView = (t) => (t.real ? { ...t.real, current: currentAction(t.real), team: realTeam(t.real), links: realLinks() } : null);
function saveSettings(b = {}) {
  const s = settingsDoc();
  for (const k of ['fanpageUrl', 'kiotvietUrl', 'adsManagerUrl']) {
    if (b[k] === undefined) continue;
    const v = String(b[k] || '').trim();
    if (v && !/^https:\/\//i.test(v)) throw fail('Link phải bắt đầu bằng https://');
    s[k] = v;
  }
  if (b.hotlines !== undefined) {
    const list = (Array.isArray(b.hotlines) ? b.hotlines : String(b.hotlines).split(/[,;]+/)).map((x) => String(x).trim()).filter(Boolean);
    if (list.length && list.length !== 2) throw fail('Nhập đúng 2 số hotline.');
    s.hotlines = list;
  }
  store.save('officeSettings');
  return s;
}
on('GET', '/api/office-settings', () => settingsDoc());
on('PUT', '/api/office-settings', (b) => saveSettings(b));
const REAL_SENDER = { record_metrics: ANALYST_ID, analyze: ANALYST_ID, write_post: CONTENT_ID, publish: CONTENT_ID, propose_budget: ADS_ID, approve_budget: 'user', run_ads: ADS_ID };
const realBusy = new Set();
on('POST', '/api/tasks/([\\w-]+)/real', async (b, [id]) => {
  const t = needTask(id);
  if (!t.real) throw fail('Việc này không phải việc làm thực tế.');
  if (realBusy.has(id)) throw fail('Đang làm hành động trước, chờ chút.');
  realBusy.add(id);
  try {
    const r = t.real;
    const action = String(b.action || '');
    let res;
    try {
      res = await applyAction(r, action, b.input || {}, {
        task: t, staff: getStaff,
        think: (s, ctx) => think(s, { ...ctx, kind: action === 'write_post' ? 'writing' : 'deep_analysis' }),
        hotlines: () => settingsDoc().hotlines,
        saveHotlines: (list) => saveSettings({ hotlines: list }),
        budgetCap: parseGoal(t.title, t.description).budget || 0,
      });
    } catch (e) { throw e.status ? e : fail(e.message); }
    t.real = r;
    t.status = r.done ? 'done' : 'in_progress';
    t.lastError = null;
    saveTask(t);
    addMessage('group', REAL_SENDER[action] || r.owner, res.message);
    return { real: realView(t) };
  } finally { realBusy.delete(id); }
});
on('DELETE', '/api/tasks/([\\w-]+)', (b, [id]) => {
  needTask(id);
  store.remove(`task-${id}`);
  const rd = reqDoc();
  rd.list = rd.list.filter((r) => r.taskId !== id);
  store.save('requests');
  return { ok: true };
});

on('POST', '/api/tasks/([\\w-]+)/check-now', (b, [id]) => {
  const t = needTask(id);
  const st = t.campaign?.steps.find((x) => !['done', 'skipped'].includes(x.status));
  if (!st || !st.key.startsWith('check_')) throw fail('Bước hiện tại không phải bước đo kết quả.');
  st.runNow = true; saveTask(t);
  bg(executeTask(id));
  return { ok: true };
});
on('POST', '/api/tasks/([\\w-]+)/retry', (b, [id]) => {
  const t = needTask(id);
  if (t.status === 'stopped_by_manager') throw fail('Việc đang bị Quản lý dừng. Cần Quản lý hoặc người dùng cho phép mở lại.');
  if (t.kind === 'general') {
    if (t.session && t.session.status !== 'running' && t.session.finalSummary) bg(executeTask(t.id));
    else if (t.session && t.session.status !== 'running') bg(finishSession(t.id));
    else startGeneral(t);
  } else bg(executeTask(t.id));
  return { ok: true };
});
on('POST', '/api/tasks/([\\w-]+)/say', (b, [id]) => {
  const t = needTask(id);
  if (!t.session) throw fail('Việc này không có phiên tranh luận.');
  const text = textOf(b);
  appendTurn(t, 'user', text, 'người dùng');
  const low = text.toLowerCase();
  if (t.session.status === 'running' && (low.includes('chốt công việc') || /(^|\s)dừng($|\s|[.!])/.test(low))) {
    closeSession(t, 'closed_by_keyword', `người dùng gõ "${text}".`);
    if (!running.has(id)) bg(finishSession(id));
  }
  return { ok: true };
});
on('POST', '/api/tasks/([\\w-]+)/close-debate', (b, [id]) => {
  const t = needTask(id);
  if (!t.session) throw fail('Việc này không có phiên tranh luận.');
  if (closeSession(t, 'closed_by_button', 'người dùng bấm nút dừng.') && !running.has(id)) bg(finishSession(id));
  return { ok: true };
});
on('POST', '/api/tasks/([\\w-]+)/legal-clear', (b, [id]) => { const t = needTask(id); t.legalCleared = true; saveTask(t); return publicTask(t); });
on('POST', '/api/tasks/([\\w-]+)/stop', (b, [id]) => {
  const t = needTask(id);
  if (!b.reason?.trim()) throw fail('Quản lý phải ghi lý do dừng.');
  t.status = 'stopped_by_manager';
  t.stopReason = `Phúc dừng lúc ${now()}: ${b.reason.trim()}`;
  closeSession(t, 'closed_by_button', 'Quản lý dừng việc.');
  saveTask(t);
  const z = zaloDoc();
  for (const q of z.queue) if (q.taskId === id && q.status === 'queued') { q.status = 'error'; q.providerError = 'Bị chặn: Quản lý đã dừng việc liên quan.'; }
  store.save('zalo');
  return publicTask(t);
});
on('POST', '/api/tasks/([\\w-]+)/resume', (b, [id]) => {
  const t = needTask(id);
  if (t.status !== 'stopped_by_manager') throw fail('Việc này không ở trạng thái bị dừng.');
  t.status = 'open'; saveTask(t);
  return publicTask(t);
});
on('POST', '/api/tasks/([\\w-]+)/return', (b, [id]) => {
  const t = needTask(id);
  if (!b.reason?.trim() || !b.criteria?.trim()) throw fail('Trả việc cần lý do và tiêu chí đạt.');
  Object.assign(t, { status: 'returned_for_redo', returnReason: b.reason.trim(), passCriteria: b.criteria.trim() });
  saveTask(t);
  return publicTask(t);
});

// Phiếu bán hàng
on('GET', '/api/slips', () => listDoc('slips').list.slice().reverse());
on('POST', '/api/slips', (b) => {
  assertSlipCanBeCreated(b);
  if (isBlocked(b.taskId)) throw fail('Việc liên quan đang bị Quản lý dừng.');
  const o = office();
  o.counters.slip = (o.counters.slip || 0) + 1; saveOffice();
  const slip = {
    id: `PBH-${String(o.counters.slip).padStart(5, '0')}`, createdByStaffId: SALE_ID,
    customerName: b.customerName.trim(), customerPhone: String(b.customerPhone).trim(), customerAddress: b.customerAddress.trim(),
    productNameAndCode: b.productNameAndCode.trim(), quantity: Number(b.quantity), paymentMethod: b.paymentMethod.trim(),
    signatures: [sign(SALE_ID)], warehouseStatus: 'pending', deliveryPhoto: null, accountingSignedOff: false, archivedAt: null,
    taskId: b.taskId || null, createdAt: now(),
  };
  listDoc('slips').list.push(slip); store.save('slips');
  return slip;
});
on('POST', '/api/slips/([\\w-]+)/warehouse', (b, [id]) => {
  const slip = getSlip(id);
  if (slip.archivedAt) throw fail('Phiếu đã lưu trữ.');
  if (isBlocked(slip.taskId)) throw fail('Việc liên quan đang bị Quản lý dừng.');
  const cur = WAREHOUSE_FLOW.indexOf(slip.warehouseStatus);
  if (WAREHOUSE_FLOW.indexOf(b.status) !== cur + 1) throw fail(`Kho phải đi đúng thứ tự: sau "${slip.warehouseStatus}" là "${WAREHOUSE_FLOW[cur + 1] || 'hết bước'}".`);
  if (b.status === 'delivery_photo_recorded') {
    if (!b.photo?.sourceGroupName?.trim()) throw fail('Ghi ảnh giao hàng cần tên nhóm giao hàng Zalo thực tế.');
    slip.deliveryPhoto = { sourceGroupName: b.photo.sourceGroupName.trim(), recordedAt: now(), note: (b.photo.note || '').trim() };
  }
  if (['stock_checked', 'delivery_photo_recorded'].includes(b.status) && !slip.signatures.some((s) => s.staffId === KHO_ID)) slip.signatures.push(sign(KHO_ID));
  slip.warehouseStatus = b.status;
  store.save('slips');
  return slip;
});
on('POST', '/api/slips/([\\w-]+)/accounting-signoff', (b, [id]) => {
  const slip = getSlip(id);
  if (slip.warehouseStatus !== 'delivery_photo_recorded') throw fail('Kế toán chỉ ký hoàn tất khi Kho đã ghi ảnh giao hàng vào phiếu.');
  slip.accountingSignedOff = true;
  if (!slip.signatures.some((s) => s.staffId === KE_TOAN_ID)) slip.signatures.push(sign(KE_TOAN_ID));
  store.save('slips');
  return slip;
});
on('POST', '/api/slips/([\\w-]+)/archive', (b, [id]) => {
  const slip = getSlip(id);
  const need = [SALE_ID, KHO_ID, KE_TOAN_ID].filter((sid) => !slip.signatures.some((s) => s.staffId === sid));
  if (need.length) throw fail(`Chưa đủ chữ ký: thiếu ${need.map((sid) => getStaff(sid).name).join(', ')}.`);
  if (!slip.accountingSignedOff) throw fail('Chưa có ký hoàn tất của Kế toán.');
  slip.archivedAt = now();
  store.save('slips');
  return slip;
});

// Zalo
on('GET', '/api/zalo', () => { const z = zaloDoc(); return { queue: z.queue.slice().reverse(), worker: zaloWorker(), linkCodes: z.linkCodes.slice(-20).reverse() }; });
on('POST', '/api/zalo/queue', (b) => {
  if (!b.content?.trim()) throw fail('Nội dung trống.');
  if (!getStaff(b.staffId)) throw fail('Không tìm thấy nhân viên.');
  if (isBlocked(b.taskId)) throw fail('Việc liên quan đang bị Quản lý dừng, không xếp hàng gửi.');
  const hex = [...crypto.getRandomValues(new Uint8Array(4))].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  const item = {
    id: `ZL-${hex}`, staffId: b.staffId, taskId: b.taskId || null, target: b.target || '', content: b.content.trim(), status: 'queued',
    receipt: null, providerError: null, reply: null, requiresUserApproval: b.requiresUserApproval ?? b.staffId === CSKH_ID,
    approvedByUser: false, createdAt: now(), sentAt: null,
  };
  zaloDoc().queue.push(item); store.save('zalo');
  return item;
});
const zItem = (id) => { const it = zaloDoc().queue.find((q) => q.id === id); if (!it) throw fail('Không tìm thấy nhiệm vụ.'); return it; };
on('POST', '/api/zalo/queue/([\\w-]+)/approve', (b, [id]) => { const it = zItem(id); it.approvedByUser = true; store.save('zalo'); return it; });
on('POST', '/api/zalo/queue/([\\w-]+)/retry', (b, [id]) => {
  const it = zItem(id);
  if (it.status !== 'error') throw fail('Chỉ thử lại nhiệm vụ đang lỗi.');
  if (isBlocked(it.taskId)) throw fail('Việc liên quan đang bị Quản lý dừng.');
  it.status = 'queued'; it.providerError = null; store.save('zalo');
  return it;
});
on('POST', '/api/zalo/queue/([\\w-]+)/send', (b, [id]) => {
  const it = zItem(id);
  if (!zaloWorker().online) throw fail('Worker Zalo đang tắt. Nhiệm vụ giữ ở trạng thái queued.');
  return it;
});
on('POST', '/api/zalo/link-codes', () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = 'LPA-ZALO-' + [...crypto.getRandomValues(new Uint8Array(6))].map((x) => alphabet[x % alphabet.length]).join('');
  const c = { code, createdAt: now(), expiresAt: new Date(Date.now() + 30 * 60000).toISOString(), usedAt: null, revoked: false };
  zaloDoc().linkCodes.push(c); store.save('zalo');
  return c;
});
on('POST', '/api/zalo/link-codes/([\\w-]+)/revoke', (b, [code]) => {
  const c = zaloDoc().linkCodes.find((x) => x.code === code);
  if (c) { c.revoked = true; store.save('zalo'); }
  return { ok: true };
});
on('POST', '/api/zalo/bridges/revoke', () => ({ ok: true }));

// Báo cáo, hoạt động, tổng quan
on('GET', '/api/reports', () => ({ reports: listDoc('reports').list, generating: reportRunning }));
on('POST', '/api/reports', () => { if (reportRunning) throw fail('Báo cáo đang được tạo.'); bg(generateReport('manual')); return { ok: true }; });
on('GET', '/api/activity', () => {
  bg(runAutomation());
  const recent = Object.fromEntries([...said].filter(([, v]) => Date.now() - Date.parse(v.at) < 90000));
  return { working: [...working.keys()], said: recent, storageWarning: store.writeError, pendingRequests: reqDoc().list.filter((r) => r.status === 'pending').length + tasksAll().filter((t) => t.real && currentAction(t.real)?.key === 'approve_budget').length };
});
on('GET', '/api/overview', () => {
  const z = zaloDoc();
  return {
    staff: staffList().length, tasks: tasksAll().length, softwareLinks: listDoc('links').list.length,
    zaloQueued: z.queue.filter((q) => q.status === 'queued').length, zaloError: z.queue.filter((q) => q.status === 'error').length,
    slips: listDoc('slips').list.length,
    groupMessages: listMessages('group').length,
    openTasks: tasksAll().filter((t) => t.status !== 'done').length,
  };
});

// ---------- Khởi động ----------
let ready = null;
async function init() {
  await store.init();
  // Văn phòng tạo trước khi có vai trò chuẩn mới → thiết lập lại một lần (đào tạo cũ vẫn nằm trong lịch sử).
  if ((office().rosterVersion || 1) < ROSTER_VERSION) resetAllStaff();
  // Phiên tranh luận còn dở khi đóng trang: chạy tiếp (quá hạn thì đóng theo hết giờ rồi tổng hợp).
  for (const t of tasksAll()) {
    if (t.session?.status === 'running') bg(runDebate(t.id));
    else if (t.session && !t.session.finalSummary && t.status === 'debating') bg(finishSession(t.id));
  }
}

export async function trialTransport(path, { method, body }) {
  ready ||= init();
  await ready;
  const url = path.split('?')[0];
  for (const r of routes) {
    if (!r.method.split('|').includes(method)) continue;
    const m = r.re.exec(url);
    if (!m) continue;
    try {
      const data = await r.fn(body || {}, m.slice(1));
      return { status: 200, ok: true, data };
    } catch (e) {
      return { status: e.status || 400, ok: false, data: { error: e.message || String(e) } };
    }
  }
  return { status: 404, ok: false, data: { error: `Không có chức năng ${method} ${url} ở bản trải nghiệm.` } };
}
