// Backend của BẢN TRẢI NGHIỆM: chạy ngay trong trình duyệt, cùng hợp đồng API với server thật.
// Bộ não = Claude qua tài khoản claude.ai của người xem (capability `sample`), dữ liệu lưu riêng
// cho từng tài khoản (capability `db`, nhánh data/users/<id>), danh tính từ capability `user`.
import {
  ROSTER, MANAGER_ID, CSKH_ID, SALE_ID, KHO_ID, KE_TOAN_ID, signCodeFor, defaultTraining,
  pickRelevantStaffIds, isMarketing, addressedStaffId, kindOfText, buildThinkingPrompt, buildRealData,
  executionPlan, assertSlipCanBeCreated, WAREHOUSE_FLOW, REPORT_HOUR, hcmDate, hcmHour,
  CSKH_REPORT_QUESTION, MANAGER_REPORT_QUESTION, reportSnapshot,
} from '../shared/core.js';
import {
  runDebatePhases, runJudge, executeWithReview, runIndividual, reviewerFor, scoreboard,
  GROUP_CRITIQUE_INSTRUCTION, groupConclusionQuestion, consultDecisionQuestion,
} from '../shared/deliberation.js';

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
    officeName: 'Văn phòng Long Phu Auto', companyName: 'Long Phu Auto', createdAt: now(), counters: { slip: 0 },
    staff: ROSTER.map((s, i) => ({
      id: s.id, name: s.name, role: s.role, group: s.grp, shortLabel: s.shortLabel, signCode: signCodeFor(i),
      trainingText: defaultTraining(s), trainingVersion: 1, mainSoftware: s.mainSoftware,
      responsibilities: s.responsibilities, seat: { deskIndex: s.deskIndex, zone: s.zone }, lastBrainLabel: null,
    })),
  };
  store.docs.set('office', fresh);
  store.save('office');
  return fresh;
}
const saveOffice = () => store.save('office');
const staffList = () => office().staff;
const getStaff = (id) => staffList().find((s) => s.id === id) || null;
const staffById = () => Object.fromEntries(staffList().map((s) => [s.id, s]));

const listDoc = (name) => store.get(name, { list: [] });
const tasksAll = () => [...store.docs.entries()].filter(([k]) => k.startsWith('task-')).map(([, v]) => v)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const getTask = (id) => store.docs.get(`task-${id}`) || null;
const saveTask = (t) => { t.updatedAt = now(); store.docs.set(`task-${t.id}`, t); store.save(`task-${t.id}`); };
const zaloDoc = () => store.get('zalo', { queue: [], linkCodes: [] });

// Ảnh đính kèm chỉ giữ trong phiên (không lưu vào db, tránh vượt giới hạn tài liệu).
const imageCache = new Map();

function realData() {
  const z = zaloDoc();
  return buildRealData({ slips: listDoc('slips').list, links: listDoc('links').list, zalo: z.queue, tasks: tasksAll() });
}

// ---------- Bộ não: Claude qua tài khoản claude.ai ----------
const working = new Map();
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

async function think(staff, ctx) {
  const sample = await getSample();
  const tier = staff.id === MANAGER_ID ? 'complex' : 'default'; // Quản lý dùng bộ não tốt nhất
  const baseLabel = `Claude qua tài khoản claude.ai (${tier})`;
  if (!sample) throw new BrainError('Không gọi được Claude trong khung xem này (cần mở văn phòng trong claude.ai và cho phép dùng Claude).', baseLabel);
  const o = office();
  const prompt = `${buildThinkingPrompt(staff, o.companyName, { ...ctx, realData: realData() })}\n\nCâu hỏi / việc cần xử lý: ${ctx.question}`;
  const images = (ctx.imageIds || []).map((id) => imageCache.get(id)).filter(Boolean).slice(0, 4);
  working.set(staff.id, (working.get(staff.id) || 0) + 1);
  try {
    const opts = { modelTier: tier, cache: false };
    if (images.length) opts.images = images;
    const r = await sample(prompt, opts);
    const label = `Claude qua tài khoản claude.ai (${r.modelTierApplied})${r.truncated ? ' — câu trả lời bị cắt do quá dài' : ''}`;
    staff.lastBrainLabel = label; saveOffice();
    return { text: r.text.trim(), brainLabel: label, providerErrors: [] };
  } catch (e) {
    const msg = `${SAMPLE_ERRORS[e?.code] || 'Lỗi khi gọi Claude.'} [mã: ${e?.code || 'unknown'}] ${e?.message || ''}`.trim();
    throw new BrainError(msg, baseLabel);
  } finally {
    const n = working.get(staff.id) - 1;
    if (n > 0) working.set(staff.id, n); else working.delete(staff.id);
  }
}

// ---------- Tin nhắn ----------
function addMessage(channel, sender, text, brainLabel = null, isError = false) {
  const doc = store.get(`msg-${channel}`, { list: [] });
  doc.list.push({ id: rid('M-'), sender, text, brainLabel, isError, createdAt: now() });
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
  return { ...t, session: undefined, attachments: t.attachments.map((a) => ({ ...a, hasImage: imageCache.has(a.id) })) };
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
async function executeTask(taskId) {
  if (executing.has(taskId)) return;
  executing.add(taskId);
  try {
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
    let result;
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
    else if (result.status === 'done') t.status = 'done';
    else Object.assign(t, { status: 'in_progress', lastError: result.error || null });
    saveTask(t);
  } finally {
    executing.delete(taskId);
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
  apiConfigs: [], softwareLinks: listDoc('links').list.filter((l) => l.staffId === s.id),
})));
on('PUT', '/api/staff/(STAFF-\\d+)/training', (b, [id]) => {
  const s = getStaff(id);
  if (!s) throw fail('Không tìm thấy nhân viên.');
  const text = String(b?.trainingText || '').trim();
  if (!text) throw fail('Đào tạo không được để trống.');
  s.trainingText = text.slice(0, 20000); s.trainingVersion++;
  saveOffice();
  return s;
});

const NO_API = () => { throw fail('Bản trải nghiệm dùng Claude qua tài khoản claude.ai. Gắn API riêng có ở bản server.'); };
on('GET', '/api/apis/.+', () => []);
on('POST', '/api/apis/.+', NO_API);
on('PUT|DELETE|POST', '/api/api-config/.+', NO_API);

// Liên kết phần mềm — không lưu mã truy cập đầy đủ (chỉ 4 ký tự cuối).
on('POST', '/api/staff/(STAFF-\\d+)/links', (b, [id]) => {
  if (!getStaff(id)) throw fail('Không tìm thấy nhân viên.');
  if (!b.softwareName?.trim() || !b.url?.trim()) throw fail('Cần tên phần mềm và đường dẫn.');
  if (!/^https?:\/\//i.test(b.url.trim())) throw fail('Đường dẫn phải bắt đầu bằng http:// hoặc https://');
  const status = ['connected', 'expired', 'not_connected'].includes(b.status) ? b.status : 'not_connected';
  const doc = listDoc('links');
  doc.list.push({
    id: rid('SL-'), staffId: id, softwareName: b.softwareName.trim(), url: b.url.trim(), status, permissionScope: b.permissionScope || '',
    accessCodeLast4: b.accessCode ? String(b.accessCode).slice(-4) : null, lastSyncAt: null, lastCheckAt: now(), lastOpenedAt: null,
  });
  store.save('links');
  return doc.list.filter((l) => l.staffId === id);
});
on('PUT', '/api/links/([\\w-]+)', (b, [id]) => {
  const doc = listDoc('links');
  const l = doc.list.find((x) => x.id === id);
  if (!l) throw fail('Không tìm thấy liên kết.');
  if (b.status) { if (!['connected', 'expired', 'not_connected'].includes(b.status)) throw fail('Trạng thái không hợp lệ.'); l.status = b.status; l.lastCheckAt = now(); }
  if (b.opened) l.lastOpenedAt = now();
  store.save('links');
  return doc.list.filter((x) => x.staffId === l.staffId);
});
on('DELETE', '/api/links/([\\w-]+)', (b, [id]) => {
  const doc = listDoc('links');
  const l = doc.list.find((x) => x.id === id);
  if (!l) throw fail('Không tìm thấy liên kết.');
  doc.list = doc.list.filter((x) => x.id !== id);
  store.save('links');
  return doc.list.filter((x) => x.staffId === l.staffId);
});

// Chat
on('GET', '/api/messages/(.+)', (b, [ch]) => ({ messages: listMessages(decodeURIComponent(ch)), busy: busy.has(decodeURIComponent(ch)) }));
on('POST', '/api/chat/group', (b) => {
  const text = textOf(b);
  addMessage('group', 'user', text);
  const target = addressedStaffId(staffList(), text);
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
on('GET', '/api/tasks', () => tasksAll().map(publicTask));
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
  const t = {
    id: rid('T-'), title: b.title.trim(), description: b.description || '', kind: b.kind, taskKind: b.taskKind || kindOfText(text),
    assigneeIds: ids, createdBy: 'user', status: 'open', attachments, debateSessionId: null, session: null,
    returnReason: null, passCriteria: null, stopReason: null, legalCleared: false, lastError: null, outputs: [],
    createdAt: now(), updatedAt: now(),
  };
  saveTask(t);
  if (b.kind === 'general') startGeneral(t);
  else bg(executeTask(t.id));
  return publicTask(t);
});
const needTask = (id) => { const t = getTask(id); if (!t) throw fail('Không tìm thấy việc.'); return t; };
on('GET', '/api/tasks/([\\w-]+)', (b, [id]) => {
  const t = needTask(id);
  if (!t.session) return { task: publicTask(t), session: null };
  const participants = t.assigneeIds.map(getStaff).filter(Boolean);
  return {
    task: publicTask(t),
    session: {
      ...t.session, finalPlan: undefined, taskId: t.id,
      turns: t.session.turns.map((x) => ({ ...x, phase: x.meta?.phase || null, meta: undefined })),
      scoreboard: scoreboard(t.session.turns, participants, (x) => getStaff(x)?.name || x),
      runnerActive: running.has(t.id) || finishing.has(t.id) || executing.has(t.id),
    },
  };
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
  const today = hcmDate();
  const reportDue = hcmHour() >= REPORT_HOUR && !listDoc('reports').list.some((r) => r.date === today);
  return { working: [...working.keys()], reportDue, storageWarning: store.writeError };
});
on('GET', '/api/overview', () => {
  const z = zaloDoc();
  return {
    staff: staffList().length, tasks: tasksAll().length, softwareLinks: listDoc('links').list.length,
    zaloQueued: z.queue.filter((q) => q.status === 'queued').length, zaloError: z.queue.filter((q) => q.status === 'error').length,
    slips: listDoc('slips').list.length,
  };
});

// ---------- Khởi động ----------
let ready = null;
async function init() {
  await store.init();
  office();
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
