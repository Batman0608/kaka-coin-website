import { createOffice } from './office3d.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');
const GROUP_NAME = { Marketing: 'Marketing', VanHanhKiemSoat: 'Vận hành và kiểm soát', HoTroKyThuat: 'Hỗ trợ và kỹ thuật' };
const GROUP_COLOR = { Marketing: 'var(--mkt)', VanHanhKiemSoat: 'var(--ops)', HoTroKyThuat: 'var(--sup)' };
const ROLE_NAME = { general: 'Chung', image_design: 'Thiết kế hình ảnh', writing: 'Viết bài', deep_analysis: 'Phân tích chuyên sâu', zalo_channel: 'Kênh Zalo' };
const TASK_STATUS = {
  open: 'Mới', in_progress: 'Đang làm', debating: 'Đang tranh luận', stopped_by_manager: 'Quản lý đã dừng',
  waiting_user: 'Chờ người dùng', done: 'Xong', returned_for_redo: 'Trả làm lại',
};
const WAREHOUSE = {
  pending: 'Chờ Kho nhận', stock_checked: 'Đã rà tồn', preparing: 'Đang chuẩn bị', delivered: 'Đã giao',
  delivery_photo_recorded: 'Đã ghi ảnh giao hàng',
};
const WAREHOUSE_NEXT = { pending: 'stock_checked', stock_checked: 'preparing', preparing: 'delivered', delivered: 'delivery_photo_recorded' };

const state = { me: null, staff: [], selected: 'STAFF-007', view: 'staff', sub: 'chat', refresh: null, office: null, taskDetail: null };

// ---------- API ----------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'content-type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/api/login')) {
    showAuth(data.expired ? 'Phiên đăng nhập đã hết hạn. Vui lòng tự đăng nhập lại.' : '');
    throw new Error(data.error || 'Chưa đăng nhập');
  }
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

function toast(msg, ms = 4000) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add('hidden'), ms);
}

async function act(fn, okMsg) {
  try {
    const r = await fn();
    if (okMsg) toast(okMsg);
    return r;
  } catch (e) {
    toast(e.message, 7000);
    return null;
  }
}

// ---------- Đăng nhập ----------
let authMode = 'login';
function showAuth(msg = '') {
  $('#app').classList.add('hidden');
  $('#auth').classList.remove('hidden');
  $('#authError').textContent = msg;
  clearInterval(state.poll);
}
$('#authTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  authMode = b.dataset.mode;
  for (const t of $('#authTabs').children) t.classList.toggle('active', t === b);
  $('.reg-only').classList.toggle('hidden', authMode !== 'register');
  $('#authSubmit').textContent = authMode === 'login' ? 'Đăng nhập' : 'Tạo văn phòng';
});
$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target));
  try {
    await api(authMode === 'login' ? '/api/login' : '/api/register', { body });
    e.target.reset();
    boot();
  } catch (err) {
    $('#authError').textContent = err.message;
  }
});
$('#logoutBtn').addEventListener('click', async () => { await api('/api/logout', { body: {} }); showAuth(); });

// ---------- Thanh trên: giờ thật Asia/Ho_Chi_Minh, thời tiết TP.HCM ----------
function tickClock() {
  $('#clock').textContent = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' });
}
async function loadWeather() {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=10.82&longitude=106.63&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FHo_Chi_Minh');
    if (!r.ok) throw new Error();
    const d = await r.json();
    const c = d.current;
    $('#weather').textContent = `TP.HCM ${Math.round(c.temperature_2m)}°C, ẩm ${c.relative_humidity_2m}% (Open-Meteo ${c.time.slice(11)})`;
  } catch {
    $('#weather').textContent = 'Thời tiết TP.HCM: chưa cập nhật';
  }
}

// ---------- Cột trái ----------
function renderLeft() {
  const groups = {};
  for (const s of state.staff) (groups[s.group] ||= []).push(s);
  $('#staffGroups').innerHTML = Object.entries(groups).map(([g, list]) => `
    <div class="group-title">${esc(GROUP_NAME[g] || g)}</div>
    ${list.map((s) => `
      <button class="staff-item ${s.id === state.selected && state.view === 'staff' ? 'active' : ''}" data-staff="${s.id}">
        <span class="dot" style="background:${GROUP_COLOR[s.group]}"></span>
        <span>${esc(s.name)} <small>${esc(s.role)} · ${esc(s.currentBrain.source === 'claude_fallback' ? 'Claude mặc định' : 'API riêng')}</small></span>
      </button>`).join('')}`).join('');
}
$('#staffGroups').addEventListener('click', (e) => {
  const b = e.target.closest('[data-staff]');
  if (b) selectStaff(b.dataset.staff);
});

async function loadOverview() {
  const o = await api('/api/overview').catch(() => null);
  if (o) $('#overview').innerHTML = `Nhân sự: ${o.staff} · Việc: ${o.tasks}<br>Liên kết phần mềm: ${o.softwareLinks}<br>Phiếu bán: ${o.slips}<br>Zalo chờ: ${o.zaloQueued} · lỗi: ${o.zaloError}`;
}

async function loadStaff() {
  state.staff = await api('/api/staff');
  renderLeft();
  state.office?.setStaff(state.staff);
  state.office?.select(state.view === 'staff' ? state.selected : null);
}

function selectStaff(id) {
  state.selected = id;
  setView('staff');
}

// ---------- Panel phải ----------
$('#mainTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (b) setView(b.dataset.view);
});

function setView(view) {
  state.view = view;
  state.taskDetail = view === 'tasks' ? state.taskDetail : null;
  for (const t of $('#mainTabs').children) t.classList.toggle('active', t.dataset.view === view);
  renderLeft();
  state.office?.select(view === 'staff' ? state.selected : null);
  ({ staff: viewStaff, group: viewGroup, tasks: viewTasks, slips: viewSlips, zalo: viewZalo, settings: viewSettings })[view]();
}

const staffById = (id) => state.staff.find((s) => s.id === id);
const nameOf = (id) => (id === 'user' ? 'Bạn' : id === 'system' ? 'Hệ thống' : staffById(id)?.name || id);

function renderMessages(list, busy) {
  if (!list.length && !busy) return '<p class="muted">Chưa có tin nhắn. Gõ câu hỏi bên dưới để bắt đầu.</p>';
  return list.map((m) => `
    <div class="msg ${m.sender === 'user' ? 'user' : ''} ${m.isError ? 'err' : ''}">
      <div class="who">${esc(nameOf(m.sender))} <span class="muted">${esc(fmtTime(m.createdAt))}</span></div>
      <div class="body">${esc(m.text)}</div>
      ${m.brainLabel ? `<div class="brain">Bộ não: ${esc(m.brainLabel)}</div>` : ''}
    </div>`).join('') + (busy ? '<div class="typing">Nhân viên đang suy nghĩ…</div>' : '');
}

function chatBox(channel, postUrl, placeholder) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="chat" id="chatList" aria-live="polite"></div>
    <form class="composer"><textarea class="grow" name="text" aria-label="${esc(placeholder)}" placeholder="${esc(placeholder)}" required></textarea><button class="primary">Gửi</button></form>`;
  const list = $('#chatList', wrap);
  let lastCount = -1;
  const refresh = async () => {
    const d = await api(`/api/messages/${encodeURIComponent(channel)}`);
    const atBottom = $('#panel').scrollTop + $('#panel').clientHeight >= $('#panel').scrollHeight - 30;
    list.innerHTML = renderMessages(d.messages, d.busy);
    if (d.messages.length !== lastCount && atBottom) $('#panel').scrollTop = $('#panel').scrollHeight;
    lastCount = d.messages.length;
  };
  $('form', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text) return;
    e.target.text.value = '';
    await act(() => api(postUrl, { body: { text } }));
    setTimeout(refresh, 300);
  });
  $('textarea', wrap).addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.form.requestSubmit(); }
  });
  return { el: wrap, refresh };
}

function mount(html, refresh) {
  $('#panel').innerHTML = '';
  if (typeof html === 'string') $('#panel').innerHTML = html;
  else $('#panel').append(html);
  state.refresh = refresh || null;
  $('#panel h2')?.setAttribute('tabindex', '-1');
  refresh?.().catch((e) => { $('#panel').insertAdjacentHTML('afterbegin', `<p class="error" role="alert">Không tải được dữ liệu: ${esc(e.message)}</p>`); });
}

// ---------- Nhân viên ----------
const SUBS = [['chat', 'Hỏi riêng'], ['tasks', 'Việc'], ['brain', 'Bộ não / API'], ['software', 'Phần mềm'], ['training', 'Đào tạo'], ['consult', 'Tham vấn'], ['zalo', 'Zalo riêng']];

function viewStaff() {
  const s = staffById(state.selected);
  if (!s) return mount('<p class="muted">Chọn một nhân viên.</p>');
  const brainBadge = s.currentBrain.source === 'claude_fallback' ? 'warn' : 'ok';
  const head = document.createElement('div');
  head.innerHTML = `
    <h2>${esc(s.name)} — ${esc(s.role)}</h2>
    <div class="kv">${esc(GROUP_NAME[s.group])} · Mã ký ${esc(s.signCode)} · Đào tạo v${s.trainingVersion} · Chỗ ngồi: ${esc(s.seat.zone)}</div>
    <div class="kv">Phần mềm chính: ${esc(s.mainSoftware)}</div>
    <p style="margin:6px 0"><span class="badge ${brainBadge}">Bộ não: ${esc(s.currentBrain.label)}</span></p>
    ${s.lastBrainLabel ? `<div class="kv">Lượt gần nhất dùng: ${esc(s.lastBrainLabel)}</div>` : ''}
    <div class="subtabs">${SUBS.map(([k, n]) => `<button data-sub="${k}" class="${state.sub === k ? 'active' : ''}">${n}</button>`).join('')}</div>
    <div id="subBody"></div>`;
  $('.subtabs', head).addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (b) { state.sub = b.dataset.sub; viewStaff(); }
  });
  const body = $('#subBody', head);
  const sub = { chat: subChat, tasks: subTasks, brain: subBrain, software: subSoftware, training: subTraining, consult: subConsult, zalo: subZalo }[state.sub](s, body);
  mount(head, sub);
}

function subChat(s, body) {
  const c = chatBox(`staff:${s.id}`, `/api/chat/staff/${s.id}`, `Hỏi riêng ${s.name}…`);
  body.append(c.el);
  return c.refresh;
}

function subTasks(s, body) {
  body.innerHTML = `
    <form class="card" id="newTask">
      <strong>Giao việc riêng cho ${esc(s.name)}</strong>
      <label>Tên việc <input name="title" required></label>
      <label>Mô tả <textarea name="description"></textarea></label>
      <label>Loại việc <select name="taskKind">${Object.entries(ROLE_NAME).filter(([k]) => k !== 'zalo_channel').map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
      <button class="primary">Giao việc</button>
    </form>
    <div id="taskList"></div>`;
  $('#newTask', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const t = await act(() => api('/api/tasks', { body: { ...f, kind: 'individual', assigneeIds: [s.id] } }), 'Đã giao việc.');
    if (t) { e.target.reset(); state.taskDetail = t.id; setView('tasks'); }
  });
  return async () => {
    const tasks = (await api('/api/tasks')).filter((t) => t.assigneeIds.includes(s.id));
    $('#taskList', body).innerHTML = tasks.length ? tasks.map(taskCard).join('') : '<p class="muted">Chưa có việc.</p>';
  };
}

function taskCard(t) {
  return `<div class="card clickable" role="button" tabindex="0" data-task="${t.id}" aria-label="Mở việc ${esc(t.title)}">
    <div class="row"><strong class="grow">${esc(t.title)}</strong><span class="badge ${t.status === 'done' ? 'ok' : t.status === 'stopped_by_manager' ? 'err' : ''}">${esc(TASK_STATUS[t.status] || t.status)}</span></div>
    <div class="kv">${t.kind === 'general' ? 'Việc chung' : 'Việc riêng'} · ${esc(t.assigneeIds.map(nameOf).join(', '))} · ${esc(fmtTime(t.createdAt))}</div>
    ${t.lastError ? `<div class="error" style="font-size:12px">${esc(t.lastError)}</div>` : ''}
  </div>`;
}
function openTaskFrom(e) {
  const c = e.target.closest('[data-task]');
  if (c && $('#panel').contains(c)) { state.taskDetail = c.dataset.task; setView('tasks'); }
}
document.addEventListener('click', openTaskFrom);
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { if (e.target.matches?.('[data-task]')) { e.preventDefault(); openTaskFrom(e); } } });

function subBrain(s, body) {
  return apiConfigEditor(s.id, body, `Bộ não của ${s.name}`);
}

// Trình quản lý API dùng chung cho nhân viên và API mặc định công ty.
function apiConfigEditor(ownerId, body, title) {
  body.innerHTML = `
    <p class="kv">Thứ tự chọn bộ não: API chuyên môn khớp loại việc và đã kiểm tra đạt → API chung → API mặc định công ty → Claude mặc định (dự phòng, có ghi lý do).<br>
    <b>Kiểm tra key chỉ liệt kê model</b>, không gửi câu hỏi thử. Kiểm tra đạt không có nghĩa gọi trả lời sẽ thành công (số dư, hạn mức, quyền model chỉ bị kiểm tra khi gọi thật).</p>
    <div id="cfgList"></div>
    <form class="card" id="cfgForm">
      <strong>${esc(title)}: gắn API mới</strong>
      <label>Nhà cung cấp <select name="provider">
        <option value="anthropic">Claude (Anthropic) — key sk-ant-… hoặc token OAuth sk-ant-oat…</option>
        <option value="openai">OpenAI</option>
        <option value="openai_compatible">Tương thích OpenAI (Gemini, DeepSeek, OpenRouter…)</option>
      </select></label>
      <label class="base-url hidden">Base URL <input name="baseUrl" placeholder="https://…/v1"></label>
      <label>Vai trò <select name="role">${Object.entries(ROLE_NAME).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
      <label>Key (chỉ lưu ở server, mã hoá; giao diện chỉ hiện 4 ký tự cuối) <input name="apiKey" type="password" autocomplete="off" required></label>
      <div class="row"><button type="button" id="listModels">Lấy danh sách model từ key</button><span id="lmStatus" class="kv"></span></div>
      <label>Model (tự chọn; để trống = mặc định của nhà cung cấp) <select name="model"><option value="">— mặc định —</option></select></label>
      <button class="primary">Lưu API</button>
    </form>`;
  const form = $('#cfgForm', body);
  form.provider.addEventListener('change', () => $('.base-url', body).classList.toggle('hidden', form.provider.value !== 'openai_compatible'));
  $('#listModels', body).addEventListener('click', async () => {
    $('#lmStatus', body).textContent = 'Đang liệt kê…';
    const r = await act(() => api('/api/apis/list-models', { body: { provider: form.provider.value, apiKey: form.apiKey.value, baseUrl: form.baseUrl.value } }));
    if (!r) return ($('#lmStatus', body).textContent = '');
    if (!r.ok) { $('#lmStatus', body).innerHTML = `<span class="error">${esc(r.error)}</span>`; return; }
    $('#lmStatus', body).innerHTML = `<span class="ok">Liệt kê được ${r.models.length} model. Hãy tự chọn model bên dưới.</span>`;
    form.model.innerHTML = '<option value="">— mặc định —</option>' + r.models.map((m) => `<option>${esc(m)}</option>`).join('');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    if (await act(() => api(`/api/apis/${ownerId}`, { body: f }), 'Đã lưu API. Bấm "Kiểm tra" để liệt kê model.')) {
      form.reset(); refresh(); loadStaff();
    }
  });
  const list = $('#cfgList', body);
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.act === 'check') {
      b.disabled = true; b.textContent = 'Đang liệt kê model…';
      const r = await act(() => api(`/api/api-config/${id}/check`, { body: {} }));
      if (r) {
        const out = $(`[data-out="${id}"]`, list);
        out.innerHTML = r.ok
          ? `<span class="ok">Kiểm tra đạt: liệt kê được ${r.models.length} model.</span> <span class="kv">${esc(r.note)}</span>
             <label>Chọn model <select data-model="${id}"><option value="">— mặc định —</option>${r.models.map((m) => `<option ${m === r.config.model ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>`
          : `<span class="error">Kiểm tra không đạt: ${esc(r.error)}</span>`;
        loadStaff();
      }
      b.disabled = false; b.textContent = 'Kiểm tra (liệt kê model)';
    } else if (b.dataset.act === 'toggle') {
      await act(() => api(`/api/api-config/${id}`, { method: 'PUT', body: { enabled: b.dataset.enabled !== '1' } }));
      refresh(); loadStaff();
    } else if (b.dataset.act === 'delete') {
      if (confirm('Xoá API này? Key sẽ bị xoá khỏi server.')) { await act(() => api(`/api/api-config/${id}`, { method: 'DELETE' })); refresh(); loadStaff(); }
    }
  });
  list.addEventListener('change', async (e) => {
    const sel = e.target.closest('select[data-model]');
    if (sel) { await act(() => api(`/api/api-config/${sel.dataset.model}`, { method: 'PUT', body: { model: sel.value } }), 'Đã đổi model.'); loadStaff(); }
  });
  let rendered = false;
  async function refresh() {
    if (rendered && list.querySelector('select[data-model]')) return; // không xoá lựa chọn model đang mở
    const cfgs = await api(`/api/apis/${ownerId}`);
    rendered = true;
    list.innerHTML = cfgs.length ? cfgs.map((c) => `
      <div class="card">
        <div class="row"><strong class="grow">${esc(c.provider)} · ${esc(ROLE_NAME[c.role])}</strong>
          <span class="badge ${c.lastCheckOk ? 'ok' : c.lastCheckAt ? 'err' : ''}">${c.lastCheckOk ? 'Kiểm tra đạt' : c.lastCheckAt ? 'Kiểm tra lỗi' : 'Chưa kiểm tra'}</span>
          <span class="badge">${c.enabled ? 'Bật' : 'Tắt'}</span></div>
        <div class="kv">Key ···${esc(c.keyLast4)} · Model: ${esc(c.model || 'mặc định')}${c.baseUrl ? ` · ${esc(c.baseUrl)}` : ''} · Kiểm tra lúc ${esc(fmtTime(c.lastCheckAt))}</div>
        ${c.lastProviderError ? `<div class="error" style="font-size:12px">Lỗi nhà cung cấp gần nhất (nguyên văn): ${esc(c.lastProviderError)}</div>` : ''}
        <div data-out="${c.id}"></div>
        <div class="row" style="margin-top:6px">
          <button data-act="check" data-id="${c.id}">Kiểm tra (liệt kê model)</button>
          <button data-act="toggle" data-id="${c.id}" data-enabled="${c.enabled ? 1 : 0}">${c.enabled ? 'Tắt' : 'Bật'}</button>
          <button data-act="delete" data-id="${c.id}" class="danger">Xoá</button>
        </div>
      </div>`).join('') : '<p class="muted">Chưa gắn API riêng — đang dùng bộ não mặc định.</p>';
  }
  return refresh;
}

function subSoftware(s, body) {
  body.innerHTML = `<div id="links"></div>
    <form class="card" id="linkForm">
      <strong>Thêm liên kết phần mềm</strong>
      <label>Phần mềm <input name="softwareName" list="swList" required></label>
      <datalist id="swList"><option>KiotViet</option><option>Fanpage</option><option>Meta Ads</option><option>Messenger</option><option>Zalo</option></datalist>
      <label>Đường dẫn <input name="url" required placeholder="https://"></label>
      <label>Phạm vi quyền <input name="permissionScope" placeholder="Ví dụ: chỉ đọc tồn kho"></label>
      <label>Mã truy cập (chỉ nhập ở đây, chỉ hiện 4 ký tự cuối) <input name="accessCode" type="password" autocomplete="off"></label>
      <label>Trạng thái <select name="status"><option value="not_connected">Chưa kết nối</option><option value="connected">Đã kết nối</option><option value="expired">Hết hạn</option></select></label>
      <button class="primary">Thêm</button>
    </form>`;
  const render = (links) => {
    $('#links', body).innerHTML = links.length ? links.map((l) => `
      <div class="card"><div class="row"><strong class="grow">${esc(l.softwareName)}</strong>
        <span class="badge ${l.status === 'connected' ? 'ok' : l.status === 'expired' ? 'err' : ''}">${{ connected: 'Đã kết nối', expired: 'Hết hạn — cần tự đăng nhập lại', not_connected: 'Chưa kết nối' }[l.status]}</span></div>
        <div class="kv"><a href="${esc(l.url)}" target="_blank" rel="noopener" data-open="${l.id}">${esc(l.url)}</a></div>
        <div class="kv">Quyền: ${esc(l.permissionScope || '—')} · Mã: ${l.accessCodeLast4 ? '···' + esc(l.accessCodeLast4) : '—'} · Kiểm tra: ${esc(fmtTime(l.lastCheckAt))} · Mở: ${esc(fmtTime(l.lastOpenedAt))}</div>
        <div class="row" style="margin-top:6px">
          <select data-status="${l.id}" aria-label="Trạng thái ${esc(l.softwareName)}">${['connected', 'expired', 'not_connected'].map((x) => `<option value="${x}" ${x === l.status ? 'selected' : ''}>${{ connected: 'Đã kết nối', expired: 'Hết hạn', not_connected: 'Chưa kết nối' }[x]}</option>`).join('')}</select>
          <button class="danger" data-del="${l.id}">Xoá</button></div>
      </div>`).join('') : '<p class="muted">Chưa có liên kết phần mềm.</p>';
  };
  body.addEventListener('click', async (e) => {
    if (e.target.dataset.open) api(`/api/links/${e.target.dataset.open}`, { method: 'PUT', body: { opened: true } });
    if (e.target.dataset.del && confirm('Xoá liên kết?')) { render(await api(`/api/links/${e.target.dataset.del}`, { method: 'DELETE' })); loadOverview(); }
  });
  body.addEventListener('change', async (e) => {
    if (e.target.dataset.status) render(await api(`/api/links/${e.target.dataset.status}`, { method: 'PUT', body: { status: e.target.value } }));
  });
  $('#linkForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await act(() => api(`/api/staff/${s.id}/links`, { body: Object.fromEntries(new FormData(e.target)) }), 'Đã thêm liên kết.');
    if (r) { e.target.reset(); render(r); loadOverview(); }
  });
  let done = false;
  return async () => { if (!done) { done = true; render((await api('/api/staff')).find((x) => x.id === s.id).softwareLinks); } };
}

function subTraining(s, body) {
  body.innerHTML = `<p class="kv">Đào tạo riêng hiện tại — phiên bản ${s.trainingVersion}. Mỗi lần lưu tăng phiên bản; mọi câu trả lời dùng bản mới nhất.</p>
    <form id="trainForm"><textarea name="trainingText" style="min-height:220px">${esc(s.trainingText)}</textarea>
    <button class="primary" style="margin-top:6px">Lưu đào tạo</button></form>`;
  $('#trainForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api(`/api/staff/${s.id}/training`, { method: 'PUT', body: { trainingText: e.target.trainingText.value } }), 'Đã lưu đào tạo.')) {
      await loadStaff(); viewStaff();
    }
  });
  return null;
}

function subConsult(s, body) {
  body.innerHTML = `<form class="card" id="consultForm">
      <strong>${esc(s.name)} hỏi ý kiến đồng nghiệp</strong>
      <div class="row" style="margin:6px 0">${state.staff.filter((x) => x.id !== s.id).map((x) => `<label style="margin:0"><input type="checkbox" name="c" value="${x.id}" style="width:auto"> ${esc(x.name)}</label>`).join('')}</div>
      <label>Câu hỏi <textarea name="question" required></textarea></label>
      <button class="primary">Tham vấn</button>
    </form><div class="chat" id="consultList"></div>`;
  $('#consultForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const colleagueIds = [...e.target.querySelectorAll('input[name=c]:checked')].map((i) => i.value);
    if (await act(() => api(`/api/staff/${s.id}/consult`, { body: { question: e.target.question.value, colleagueIds } }), 'Đang tham vấn…')) e.target.question.value = '';
  });
  return async () => {
    const d = await api(`/api/messages/${encodeURIComponent('consult:' + s.id)}`);
    $('#consultList', body).innerHTML = renderMessages(d.messages, false);
  };
}

function subZalo(s, body) {
  body.innerHTML = `<form class="card" id="zForm">
      <strong>Xếp nhiệm vụ Zalo cho ${esc(s.name)}</strong>
      <label>Người nhận / nhóm <input name="target" placeholder="Ví dụ: Nhóm giao hàng nội bộ"></label>
      <label>Nội dung <textarea name="content" required></textarea></label>
      ${s.id === 'STAFF-008' ? '<p class="kv">Nội dung CSKH / khuyến mại của Chi bắt buộc người dùng duyệt trước khi gửi.</p>' : ''}
      <button class="primary">Xếp hàng</button>
    </form><div id="zList"></div>`;
  $('#zForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api('/api/zalo/queue', { body: { staffId: s.id, ...Object.fromEntries(new FormData(e.target)) } }), 'Đã xếp hàng.')) { e.target.reset(); refresh(); }
  });
  async function refresh() {
    const d = await api('/api/zalo');
    $('#zList', body).innerHTML = zaloItems(d.queue.filter((i) => i.staffId === s.id));
  }
  return refresh;
}

// ---------- Chat nhóm ----------
function viewGroup() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<h2>Chat nhóm công ty</h2>
    <p class="kv">Hỏi đích danh (ví dụ "An ơi…" hoặc "@An") thì chỉ người đó trả lời. Hỏi chung thì các nhân viên liên quan trả lời lần lượt theo chuyên môn.</p>`;
  const c = chatBox('group', '/api/chat/group', 'Nhắn cả nhóm…');
  wrap.append(c.el);
  mount(wrap, c.refresh);
}

// ---------- Việc ----------
function viewTasks() {
  if (state.taskDetail) return viewTaskDetail(state.taskDetail);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<h2>Việc</h2>
    <form class="card" id="gForm">
      <strong>Giao việc chung</strong>
      <p class="kv">Hệ thống tự chọn nhân viên liên quan, họ tự tranh luận tối đa 10 phút rồi Quản lý chốt và bắt tay làm. Gõ "chốt công việc" hoặc "dừng" trong phiên để chốt sớm.</p>
      <label>Tên việc <input name="title" required placeholder="Ví dụ: Làm sao tăng like Fanpage"></label>
      <label>Mô tả <textarea name="description"></textarea></label>
      <details><summary class="kv">Tự chọn người phụ trách (không bắt buộc)</summary>
        <div class="row">${state.staff.map((x) => `<label style="margin:0"><input type="checkbox" name="a" value="${x.id}" style="width:auto"> ${esc(x.name)}</label>`).join('')}</div></details>
      <label>Ảnh sản phẩm (tối đa 4) <input type="file" name="files" accept="image/png,image/jpeg,image/webp,image/gif" multiple></label>
      <div id="attMeta"></div>
      <button class="primary">Giao việc chung</button>
    </form>
    <div id="tList"></div>`;
  const form = $('#gForm', wrap);
  form.files.addEventListener('change', () => {
    const files = [...form.files.files];
    if (files.length > 4) { toast('Tối đa 4 ảnh cho mỗi nhiệm vụ.'); form.files.value = ''; return; }
    $('#attMeta', wrap).innerHTML = files.map((f, i) => `<div class="row"><span class="kv grow">${esc(f.name)}</span>
      <input class="grow" name="pn${i}" aria-label="Tên sản phẩm của ${esc(f.name)}" placeholder="Tên sản phẩm"><input class="grow" name="pr${i}" aria-label="Giá của ${esc(f.name)}" placeholder="Giá"></div>`).join('');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const files = [...form.files.files].slice(0, 4);
    const attachments = await Promise.all(files.map((f, i) => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res({ fileName: f.name, mimeType: f.type, data: String(r.result).split(',')[1], productName: form[`pn${i}`]?.value, priceNote: form[`pr${i}`]?.value });
      r.readAsDataURL(f);
    })));
    const assigneeIds = [...form.querySelectorAll('input[name=a]:checked')].map((i) => i.value);
    const t = await act(() => api('/api/tasks', { body: { title: form.title.value, description: form.description.value, kind: 'general', assigneeIds, attachments } }), 'Đã giao việc chung, phiên tranh luận bắt đầu.');
    if (t) { state.taskDetail = t.id; viewTasks(); }
  });
  mount(wrap, async () => {
    const tasks = await api('/api/tasks');
    $('#tList', wrap).innerHTML = tasks.length ? tasks.map(taskCard).join('') : '<p class="muted">Chưa có việc.</p>';
  });
}

function viewTaskDetail(id) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<button class="ghost" id="back">← Danh sách việc</button><div id="tHead"></div>
    <div class="card"><strong>Quyền Quản lý (Phúc)</strong>
      <div class="row" style="margin-top:6px">
        <input class="grow" id="stopReason" aria-label="Lý do dừng" placeholder="Lý do dừng"><button class="danger" id="stopBtn">Dừng ngay</button></div>
      <div class="row" style="margin-top:6px"><input class="grow" id="retReason" aria-label="Lý do trả làm lại" placeholder="Lý do trả làm lại"><input class="grow" id="retCrit" aria-label="Tiêu chí đạt" placeholder="Tiêu chí đạt"><button id="retBtn">Trả việc</button></div>
      <div class="row" style="margin-top:6px"><button id="resumeBtn">Cho phép mở lại</button><button id="legalBtn">Pháp lý (Minh) cho qua</button><button id="retryBtn">Thử lại / chạy lại</button></div>
    </div>
    <div id="sess"></div>
    <form class="composer hidden" id="sayForm"><textarea class="grow" name="text" aria-label="Góp ý vào phiên tranh luận" placeholder='Góp ý vào phiên… gõ "chốt công việc" hoặc "dừng" để chốt'></textarea><button class="primary">Gửi</button><button type="button" id="closeBtn" class="danger">Nút dừng</button></form>
    <div id="outputs"></div>`;
  $('#back', wrap).onclick = () => { state.taskDetail = null; viewTasks(); };
  const post = (p, body = {}) => act(() => api(`/api/tasks/${id}/${p}`, { body })).then(refresh);
  $('#stopBtn', wrap).onclick = () => post('stop', { reason: $('#stopReason', wrap).value });
  $('#retBtn', wrap).onclick = () => post('return', { reason: $('#retReason', wrap).value, criteria: $('#retCrit', wrap).value });
  $('#resumeBtn', wrap).onclick = () => post('resume');
  $('#legalBtn', wrap).onclick = () => post('legal-clear');
  $('#retryBtn', wrap).onclick = () => post('retry');
  $('#closeBtn', wrap).onclick = () => post('close-debate');
  $('#sayForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text) return;
    e.target.text.value = '';
    await post('say', { text });
  });
  async function refresh() {
    const { task: t, session: s } = await api(`/api/tasks/${id}`);
    $('#tHead', wrap).innerHTML = `<h2>${esc(t.title)}</h2>
      <div class="row"><span class="badge ${t.status === 'done' ? 'ok' : t.status === 'stopped_by_manager' ? 'err' : ''}">${esc(TASK_STATUS[t.status])}</span>
      ${t.legalCleared ? '<span class="badge ok">Pháp lý đã cho qua</span>' : ''}<span class="kv">${t.kind === 'general' ? 'Việc chung' : 'Việc riêng'} · ${esc(t.assigneeIds.map(nameOf).join(' → '))}</span></div>
      ${t.description ? `<p>${esc(t.description)}</p>` : ''}
      ${t.attachments.length ? `<div class="kv">Đính kèm: ${t.attachments.map((a) => esc(`${a.fileName}${a.productName ? ` (${a.productName}${a.priceNote ? `, ${a.priceNote}` : ''})` : ''}`)).join('; ')}</div>` : ''}
      ${t.stopReason ? `<div class="error">${esc(t.stopReason)}</div>` : ''}
      ${t.returnReason ? `<div class="kv">Trả làm lại: ${esc(t.returnReason)} — Tiêu chí đạt: ${esc(t.passCriteria)}</div>` : ''}
      ${t.lastError ? `<div class="error">Lỗi gần nhất (trạng thái việc được giữ nguyên để thử lại):\n${esc(t.lastError)}</div>` : ''}`;
    if (s) {
      const left = Math.max(0, Date.parse(s.deadlineAt) - Date.now());
      $('#sess', wrap).innerHTML = `<h3>Phiên tranh luận ${s.status === 'running' ? `— còn ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}` : `— ${{ closed_by_keyword: 'đã chốt', closed_by_timeout: 'hết 10 phút', closed_by_button: 'đã dừng' }[s.status] || s.status}`}</h3>
        <div class="chat">${s.turns.map((m) => `<div class="msg ${m.staffId === 'user' ? 'user' : m.staffId === 'system' ? 'system' : ''}">
          <div class="who">${esc(nameOf(m.staffId))} <span class="muted">${esc(fmtTime(m.createdAt))}</span></div><div class="body">${esc(m.text)}</div>
          ${m.staffId !== 'user' && m.staffId !== 'system' ? `<div class="brain">Bộ não: ${esc(m.brainLabel)}</div>` : ''}</div>`).join('')}
          ${s.runnerActive ? '<div class="typing">Các nhân viên đang tranh luận…</div>' : ''}</div>`;
      $('#sayForm', wrap).classList.toggle('hidden', s.status !== 'running');
    }
    $('#outputs', wrap).innerHTML = t.outputs.length ? `<h3>Kết quả thực hiện</h3>${t.outputs.map((o) => `
      <div class="msg ${o.error ? 'err' : ''}"><div class="who">${esc(o.staffName)}</div><div class="body">${esc(o.error ? `Bộ não lỗi: ${o.error}` : o.text)}</div>
      ${o.brainLabel ? `<div class="brain">Bộ não: ${esc(o.brainLabel)}</div>` : ''}</div>`).join('')}` : '';
  }
  mount(wrap, refresh);
}

// ---------- Phiếu bán hàng ----------
const SLIP_FIELDS = [['customerName', 'Tên khách'], ['customerPhone', 'Số điện thoại'], ['customerAddress', 'Địa chỉ'], ['productNameAndCode', 'Sản phẩm và mã'], ['quantity', 'Số lượng'], ['paymentMethod', 'Phương thức thanh toán']];
function viewSlips() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<h2>Phiếu bán hàng</h2>
    <form class="card" id="slipForm" novalidate>
      <strong>Sơn (Sale) tạo phiếu — đủ 6 thông tin bắt buộc</strong>
      ${SLIP_FIELDS.map(([k, n]) => `<label>${n} * <input name="${k}" ${k === 'quantity' ? 'type="number" min="1"' : ''}></label>`).join('')}
      <button class="primary">Tạo phiếu</button><p class="error" id="slipErr"></p>
    </form><div id="slipList"></div>`;
  $('#slipForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const missing = SLIP_FIELDS.filter(([k]) => !String(f[k] || '').trim() || (k === 'quantity' && !(Number(f[k]) > 0)));
    if (missing.length) {
      $('#slipErr', wrap).textContent = `Thiếu: ${missing.map(([, n]) => n).join(', ')}. Sale phải hỏi thêm khách.`;
      return;
    }
    try {
      await api('/api/slips', { body: f });
      $('#slipErr', wrap).textContent = ''; e.target.reset(); toast('Đã tạo phiếu, chuyển Kho.'); refresh(); loadOverview();
    } catch (err) { $('#slipErr', wrap).textContent = err.message; }
  });
  $('#slipList', wrap).addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-slip]');
    if (!b) return;
    const id = b.dataset.slip;
    if (b.dataset.a === 'wh') {
      const next = b.dataset.next;
      let photo;
      if (next === 'delivery_photo_recorded') {
        const card = b.closest('.card');
        photo = { sourceGroupName: $('[name=grp]', card).value, note: $('[name=note]', card).value };
      }
      await act(() => api(`/api/slips/${id}/warehouse`, { body: { status: next, photo } }));
    } else if (b.dataset.a === 'acc') await act(() => api(`/api/slips/${id}/accounting-signoff`, { body: {} }));
    else if (b.dataset.a === 'arc') await act(() => api(`/api/slips/${id}/archive`, { body: {} }), 'Đã lưu trữ phiếu.');
    refresh();
  });
  async function refresh() {
    const slips = await api('/api/slips');
    $('#slipList', wrap).innerHTML = slips.map((p) => `<div class="card">
      <div class="row"><strong class="grow">${esc(p.id)}</strong><span class="badge">${esc(WAREHOUSE[p.warehouseStatus])}</span>${p.archivedAt ? '<span class="badge ok">Đã lưu trữ</span>' : ''}</div>
      <div class="kv">${esc(p.customerName)} · ${esc(p.customerPhone)} · ${esc(p.customerAddress)}</div>
      <div class="kv">${esc(p.productNameAndCode)} × ${p.quantity} · ${esc(p.paymentMethod)}</div>
      <div class="kv">Chữ ký: ${p.signatures.map((s) => `${esc(s.staffName)} [${esc(s.signCode)}] ${esc(fmtTime(s.signedAt))} ✓`).join(' · ')}</div>
      ${p.deliveryPhoto ? `<div class="kv">Ảnh giao hàng từ nhóm "${esc(p.deliveryPhoto.sourceGroupName)}" lúc ${esc(fmtTime(p.deliveryPhoto.recordedAt))}${p.deliveryPhoto.note ? ` — ${esc(p.deliveryPhoto.note)}` : ''}</div>` : ''}
      ${p.archivedAt ? '' : `<div class="row" style="margin-top:6px">
        ${WAREHOUSE_NEXT[p.warehouseStatus] === 'delivery_photo_recorded' ? '<input name="grp" class="grow" aria-label="Tên nhóm giao hàng Zalo" placeholder="Tên nhóm giao hàng Zalo"><input name="note" class="grow" aria-label="Ghi chú giao hàng" placeholder="Ghi chú">' : ''}
        ${WAREHOUSE_NEXT[p.warehouseStatus] ? `<button data-slip="${p.id}" data-a="wh" data-next="${WAREHOUSE_NEXT[p.warehouseStatus]}">Dũng (Kho): ${esc(WAREHOUSE[WAREHOUSE_NEXT[p.warehouseStatus]])}</button>` : ''}
        ${!p.accountingSignedOff ? `<button data-slip="${p.id}" data-a="acc">Hà (Kế toán) ký hoàn tất</button>` : '<span class="badge ok">Kế toán đã ký</span>'}
        <button data-slip="${p.id}" data-a="arc">Lưu trữ</button></div>`}
    </div>`).join('') || '<p class="muted">Chưa có phiếu.</p>';
  }
  let first = true;
  mount(wrap, async () => { if (first || !wrap.querySelector('#slipList input:focus')) { first = false; await refresh(); } });
}

// ---------- Zalo ----------
function zaloItems(items) {
  return items.length ? items.map((i) => `<div class="card">
    <div class="row"><strong class="grow">${esc(i.id)} · ${esc(nameOf(i.staffId))}</strong>
      <span class="badge ${i.status === 'done' ? 'ok' : i.status === 'error' ? 'err' : i.status === 'sending' ? 'warn' : ''}">${esc(i.status)}</span></div>
    <div class="kv">Tới: ${esc(i.target || '—')} · Tạo ${esc(fmtTime(i.createdAt))}${i.sentAt ? ` · Gửi ${esc(fmtTime(i.sentAt))}` : ''}</div>
    <div style="white-space:pre-wrap">${esc(i.content)}</div>
    ${i.receipt ? `<div class="kv ok">Biên nhận: ${esc(i.receipt)}</div>` : ''}
    ${i.reply ? `<div class="kv">Phản hồi Zalo: ${esc(i.reply)}</div>` : ''}
    ${i.providerError ? `<div class="error" style="font-size:12px">${esc(i.providerError)}</div>` : ''}
    <div class="row" style="margin-top:6px">
      ${i.requiresUserApproval && !i.approvedByUser ? `<button data-z="approve" data-id="${i.id}" class="primary">Duyệt nội dung</button>` : i.requiresUserApproval ? '<span class="badge ok">Đã duyệt</span>' : ''}
      ${i.status === 'queued' ? `<button data-z="send" data-id="${i.id}">Gửi ngay</button>` : ''}
      ${i.status === 'error' ? `<button data-z="retry" data-id="${i.id}">Thử lại</button>` : ''}
    </div></div>`).join('') : '<p class="muted">Không có nhiệm vụ Zalo.</p>';
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-z]');
  if (!b) return;
  await act(() => api(`/api/zalo/queue/${b.dataset.id}/${b.dataset.z}`, { body: {} }));
  state.refresh?.();
});

function viewZalo() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<h2>Hàng chờ Zalo</h2>
    <p class="kv">Zalo chạy qua cầu nối local trên máy tính của bạn, dùng chính ứng dụng Zalo của bạn. Văn phòng là nguồn sự thật; cầu nối chỉ gửi, nhận và trả biên nhận. Không đưa mật khẩu hay mã QR Zalo qua chat.</p>
    <div class="card" id="worker"></div>
    <div class="card"><div class="row"><strong class="grow">Mã liên kết cầu nối</strong><button id="newCode" class="primary">Tạo mã (30 phút, dùng 1 lần)</button></div>
      <div id="codes"></div><button id="revokeBridges" class="danger" style="margin-top:6px">Ngắt mọi cầu nối đã liên kết</button></div>
    <h3>Nhiệm vụ</h3><div id="queue"></div>`;
  $('#newCode', wrap).onclick = async () => { await act(() => api('/api/zalo/link-codes', { body: {} })); refresh(); };
  $('#revokeBridges', wrap).onclick = async () => { if (confirm('Ngắt mọi cầu nối?')) { await act(() => api('/api/zalo/bridges/revoke', { body: {} })); refresh(); } };
  wrap.addEventListener('click', async (e) => {
    if (e.target.dataset.revoke) { await act(() => api(`/api/zalo/link-codes/${e.target.dataset.revoke}/revoke`, { body: {} })); refresh(); }
  });
  async function refresh() {
    const d = await api('/api/zalo');
    $('#worker', wrap).innerHTML = `<strong>Cầu nối Zalo:</strong> <span class="badge ${d.worker.online ? 'ok' : 'err'}">${d.worker.online ? 'Đang chạy' : 'Đã tắt'}</span> <span class="kv">lần cuối ${esc(fmtTime(d.worker.lastSeenAt))}</span>`;
    $('#codes', wrap).innerHTML = d.linkCodes.map((c) => {
      const st = c.revoked ? 'đã thu hồi' : c.usedAt ? 'đã dùng' : Date.now() > Date.parse(c.expiresAt) ? 'hết hạn' : 'còn hiệu lực';
      return `<div class="row kv"><code class="grow">${esc(c.code)}</code><span>${st} · hết hạn ${esc(fmtTime(c.expiresAt))}</span>${st === 'còn hiệu lực' ? `<button data-revoke="${esc(c.code)}">Thu hồi</button>` : ''}</div>`;
    }).join('');
    $('#queue', wrap).innerHTML = zaloItems(d.queue);
  }
  mount(wrap, refresh);
}

// ---------- Cài đặt ----------
function viewSettings() {
  const wrap = document.createElement('div');
  const cd = state.me.claudeDefault;
  wrap.innerHTML = `<h2>Cài đặt văn phòng</h2>
    <div class="card"><strong>Bộ não mặc định</strong>
      <p class="kv">Nhân viên chưa gắn API riêng dùng Claude <code>${esc(cd.model)}</code> do server cung cấp —
      <span class="badge ${cd.configured ? 'ok' : 'err'}">${cd.configured ? 'server đã cấu hình' : 'server CHƯA cấu hình ANTHROPIC_API_KEY'}</span></p></div>
    <h3>API mặc định của công ty</h3><p class="kv">Dùng cho mọi nhân viên chưa có API riêng hoạt động, ưu tiên trước Claude mặc định của server.</p>
    <div id="companyApi"></div>
    <h3>Tài khoản</h3>
    <form class="card" id="accForm">
      <label>Tên văn phòng <input name="officeName" value="${esc(state.me.officeName)}"></label>
      <label>Tên công ty (nhân viên dùng trong câu trả lời) <input name="companyName" value="${esc(state.me.companyName)}"></label>
      <label>Mật khẩu hiện tại <input name="currentPassword" type="password" autocomplete="current-password"></label>
      <label>Mật khẩu mới <input name="newPassword" type="password" autocomplete="new-password"></label>
      <button class="primary">Lưu</button>
    </form>
    <form class="card" id="delForm">
      <strong>Xoá văn phòng</strong>
      <p class="kv">Xoá vĩnh viễn tài khoản cùng toàn bộ nhân sự, key API, việc, phiếu bán và hàng chờ Zalo. Không khôi phục được.</p>
      <label>Nhập mật khẩu để xác nhận <input name="password" type="password" autocomplete="current-password" required></label>
      <button class="danger">Xoá vĩnh viễn văn phòng này</button>
    </form>`;
  $('#delForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!confirm('Xoá vĩnh viễn văn phòng này?')) return;
    if (await act(() => api('/api/me', { method: 'DELETE', body: { password: e.target.password.value } }))) showAuth('Đã xoá văn phòng.');
  });
  $('#accForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api('/api/me', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }), 'Đã lưu.')) {
      e.target.currentPassword.value = e.target.newPassword.value = '';
      await loadMe();
    }
  });
  const refresh = apiConfigEditor('company', $('#companyApi', wrap), 'API công ty');
  mount(wrap, refresh);
}

// ---------- Khởi động ----------
async function loadMe() {
  state.me = await api('/api/me');
  $('#officeName').textContent = state.me.officeName;
  $('#companyName').textContent = `· ${state.me.companyName} · ${state.me.username}`;
  document.title = `${state.me.officeName} — Văn phòng ảo`;
}

async function boot() {
  try { await loadMe(); } catch { return showAuth(); }
  $('#auth').classList.add('hidden');
  $('#app').classList.remove('hidden');
  if (!state.office) {
    try {
      state.office = createOffice($('#office3d'), (id) => selectStaff(id));
    } catch (e) {
      $('#office3d').innerHTML = `<p class="muted" style="padding:16px">Không khởi tạo được đồ hoạ 3D trên trình duyệt này (${esc(e.message)}). Các panel vẫn dùng bình thường.</p>`;
    }
  }
  await loadStaff();
  loadOverview();
  setView(state.view);
  loadWeather();
  clearInterval(state.poll);
  state.poll = setInterval(async () => {
    if (document.hidden) return;
    try {
      await state.refresh?.();
      loadOverview();
    } catch { /* 401 đã được xử lý trong api() */ }
  }, 3000);
}

tickClock();
setInterval(tickClock, 1000);
setInterval(loadWeather, 15 * 60 * 1000);
boot();
