import { createOffice, PRESETS } from './office3d.js';
import { createMusic, MUSIC_PRESETS } from './music.js';

// ---------- Tiện ích ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');
const fmtClock = (iso) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');
const ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const GROUP_NAME = { Marketing: 'Nhóm Marketing', VanHanhKiemSoat: 'Vận hành & kiểm soát', HoTroKyThuat: 'Hỗ trợ & kỹ thuật' };
const STATUS = { sleeping: 'Đang ngủ', thinking: 'Đang suy nghĩ', working: 'Đang làm việc', resting: 'Đang nghỉ', error: 'Báo lỗi' };
const ROLE_NAME = { general: 'Chung', image_design: 'Thiết kế hình ảnh', writing: 'Viết bài', deep_analysis: 'Phân tích chuyên sâu', zalo_channel: 'Kênh Zalo' };
const TASK_STATUS = {
  open: 'Mới', in_progress: 'Đang làm', debating: 'Đang phản biện', stopped_by_manager: 'Quản lý đã dừng',
  waiting_user: 'Chờ người dùng', done: 'Đã xong', returned_for_redo: 'Trả làm lại',
};
const TASK_TONE = { done: 'teal', stopped_by_manager: 'red', returned_for_redo: 'red', debating: 'orange', in_progress: 'orange', open: 'gold' };
const WAREHOUSE = { pending: 'Chờ Kho nhận', stock_checked: 'Đã rà tồn', preparing: 'Đang chuẩn bị', delivered: 'Đã giao', delivery_photo_recorded: 'Đã ghi ảnh giao hàng' };
const WAREHOUSE_NEXT = { pending: 'stock_checked', stock_checked: 'preparing', preparing: 'delivered', delivered: 'delivery_photo_recorded' };
const PHASE_TITLES = {
  propose: 'Vòng 1 — Đề xuất độc lập', critique: 'Vòng 2 — Phản biện chéo', revise: 'Vòng 3 — Bảo vệ và sửa kế hoạch',
  score: 'Vòng 4 — Chấm lại kế hoạch đã sửa', judge: 'Phúc chọn ý tưởng tốt nhất',
};
const COLOR_CHOICES = ['#f2a516', '#e2645a', '#c03fd6', '#e23b3b', '#7fa6f0', '#c78ae6', '#5fcf7e', '#2fd1b4', '#1f9bb5', '#7a3fe0', '#f07fb0', '#9aa64a'];
const ACTIVE_TASK = new Set(['open', 'debating', 'in_progress', 'returned_for_redo']);

const state = {
  me: null, staff: [], tasks: [], activity: { working: [], said: {} }, overview: {},
  view: null, viewArg: null, sub: 'chat', refresh: null, office: null, meeting: false, drawerKey: '',
  music: createMusic(),
};
const desktop = matchMedia('(min-width: 1100px)');

// ---------- Gọi API ----------
// Mặc định gọi server thật; bản trải nghiệm thay bằng backend chạy trong trình duyệt (cùng hợp đồng API).
async function fetchTransport(path, { method, body }) {
  const res = await fetch(path, {
    method, headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin',
  });
  return { status: res.status, ok: res.ok, data: await res.json().catch(() => ({})) };
}
const transport = globalThis.__VPA_TRANSPORT__ || fetchTransport;

async function api(path, opts = {}) {
  const res = await transport(path, { method: opts.method || (opts.body ? 'POST' : 'GET'), body: opts.body });
  const data = res.data;
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

// Hộp xác nhận ngay trong trang (khung Artifact không hiện confirm() của trình duyệt).
function askConfirm(message, okLabel = 'Đồng ý') {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="cfMsg">
      <p id="cfMsg" style="margin:0">${esc(message)}</p>
      <div class="row"><button type="button" class="btn sm" data-a="no">Huỷ</button><button type="button" class="btn sm danger" data-a="yes">${esc(okLabel)}</button></div></div>`;
    const done = (v) => { ov.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') done(false); };
    ov.addEventListener('click', (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (a) done(a === 'yes'); else if (e.target === ov) done(false); });
    document.addEventListener('keydown', onKey);
    document.body.append(ov);
    $('[data-a="no"]', ov).focus();
  });
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

// ---------- Giờ thật Asia/Ho_Chi_Minh & thời tiết TP.HCM ----------
function tickClock() {
  $('#clock').textContent = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function weatherText(code) {
  if (code === 0) return 'Trời quang';
  if (code <= 3) return 'Có mây';
  if (code <= 48) return 'Sương mù';
  if (code <= 67) return 'Mưa';
  if (code <= 82) return 'Mưa rào';
  if (code <= 99) return 'Có dông';
  return 'Thời tiết';
}
async function loadWeather() {
  if (state.me?.trial) { $('#weather').textContent = 'thời tiết chưa cập nhật'; $('#weather').title = 'Bản trải nghiệm không kết nối mạng ngoài'; return; }
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=10.82&longitude=106.63&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FHo_Chi_Minh');
    if (!r.ok) throw new Error();
    const c = (await r.json()).current;
    $('#weather').textContent = `${weatherText(c.weather_code)} · ${c.temperature_2m.toFixed(1)}°C · ẩm ${c.relative_humidity_2m}%`;
    $('#weather').classList.remove('muted');
  } catch {
    $('#weather').textContent = 'thời tiết chưa cập nhật';
  }
}

// ---------- Trạng thái nhân viên (suy ra) ----------
const staffById = (id) => state.staff.find((s) => s.id === id);
const nameOf = (id) => (id === 'user' ? 'Bạn' : id === 'system' ? 'Hệ thống' : staffById(id)?.name || id);
const initial = (name) => (name || '?').trim().charAt(0).toLocaleUpperCase('vi');
const avatar = (s, size = '') => `<span class="avatar ${size}" style="background:${esc(s?.color || '#556')}" aria-hidden="true">${esc(initial(s?.name))}</span>`;

function involves(t, id) {
  return t.assigneeIds.includes(id) || (t.planSteps || []).some((p) => p.staffId === id) || (t.outputs || []).some((o) => o.staffId === id);
}
const activeTasksOf = (id) => state.tasks.filter((t) => ACTIVE_TASK.has(t.status) && involves(t, id));

// Ưu tiên: đang suy nghĩ thật > ngủ / báo lỗi do người dùng đặt > đang có việc > trạng thái người dùng đặt.
function statusOf(s) {
  if (state.activity.working.includes(s.id)) return 'thinking';
  if (s.manualStatus === 'sleeping' || s.manualStatus === 'error') return s.manualStatus;
  if (activeTasksOf(s.id).length) return 'working';
  return s.manualStatus || 'resting';
}
const statusHtml = (st) => `<span class="status st-${st}"><i class="dot"></i>${STATUS[st]}</span>`;

// ---------- Ngăn kéo nhân viên & phần đầu trang ----------
function renderDrawer() {
  const groups = {};
  for (const s of state.staff) (groups[s.group] ||= []).push(s);
  const html = Object.entries(groups).map(([g, list]) => `
    <h3 class="eyebrow group-title">${esc(GROUP_NAME[g] || g)}</h3>
    ${list.map((s) => {
      const n = activeTasksOf(s.id).length;
      return `<button class="staff-item ${state.view === 'staff' && state.viewArg === s.id ? 'active' : ''}" type="button" data-staff="${s.id}">
        ${avatar(s)}
        <span class="who"><b>${esc(s.name)}${n ? ` <span class="badge-gold">${n} việc</span>` : ''}</b><small>${esc(s.role)}</small></span>
        ${statusHtml(statusOf(s))}
      </button>`;
    }).join('')}`).join('');
  if (html !== state.drawerKey) { $('#staffGroups').innerHTML = html; state.drawerKey = html; }
}
$('#staffGroups').addEventListener('click', (e) => {
  const b = e.target.closest('[data-staff]');
  if (b) { openView('staff', b.dataset.staff); if (!desktop.matches) closeDrawer(); }
});

function renderHero() {
  const working = state.staff.filter((s) => ['working', 'thinking'].includes(statusOf(s))).length;
  const open = state.tasks.filter((t) => ACTIVE_TASK.has(t.status)).length;
  $('#officeMeta').textContent = `${state.me.companyName} · ${state.staff.length} nhân sự · ${working} đang làm · ${open} việc đang mở`;
  $('#groupCount').textContent = state.overview.groupMessages ?? 0;
  const o = state.overview;
  $('#overview').innerHTML = `<span>Việc: ${o.tasks ?? 0} (đang mở ${o.openTasks ?? 0})</span><span>Phiếu bán: ${o.slips ?? 0}</span><span>Liên kết phần mềm: ${o.softwareLinks ?? 0}</span><span>Zalo chờ: ${o.zaloQueued ?? 0} · lỗi: ${o.zaloError ?? 0}</span>`;
}

function openDrawer() { $('#drawer').classList.add('open'); $('#backdrop').classList.remove('hidden'); }
function closeDrawer() { $('#drawer').classList.remove('open'); if (!$('#sheet').classList.contains('open')) $('#backdrop').classList.add('hidden'); }
$('#drawerBtn').addEventListener('click', openDrawer);
$('#backdrop').addEventListener('click', () => { closeDrawer(); closeSheet(); });
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-close]');
  if (c?.dataset.close === 'drawer') closeDrawer();
  if (c?.dataset.close === 'sheet') closeSheet();
  const o = e.target.closest('[data-open]');
  if (o && !o.closest('#panel')) {
    const [view, arg] = o.dataset.open.split(':');
    openView(view, arg || null);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($('#stage').classList.contains('immersive')) exitImmersive();
  else if (!desktop.matches) { closeSheet(); closeDrawer(); }
});

// ---------- Bảng chi tiết (sheet) ----------
const VIEW_TITLES = {
  group: 'Chat nhóm công ty', tasks: 'Họp / Việc chung', slips: 'Phiếu bán hàng', zalo: 'Hàng chờ Zalo', reports: 'Báo cáo cuối ngày',
  settings: 'Cài đặt văn phòng', links: 'Liên kết phần mềm', overview: 'Chi tiết văn phòng', more: 'Thêm',
};
const VIEWS = {};

function openView(view, arg = null) {
  state.view = view; state.viewArg = arg;
  state.taskDetail = view === 'tasks' && arg && arg !== 'new' && arg !== 'meeting' ? arg : null;
  $('#sheetTitle').textContent = view === 'staff' ? `${staffById(arg)?.name} — ${staffById(arg)?.role}` : VIEW_TITLES[view] || 'Chi tiết';
  for (const b of $$('.bottom-nav button')) b.classList.toggle('active', b.dataset.open.split(':')[0] === view);
  state.office?.select(view === 'staff' ? arg : null);
  state.drawerKey = ''; renderDrawer();
  VIEWS[view](arg);
  $('#sheet').classList.add('open');
  $('#sheet').scrollTop = 0;
  if (!desktop.matches) { $('#backdrop').classList.remove('hidden'); closeDrawer(); }
}
function closeSheet() {
  if (desktop.matches) return;
  $('#sheet').classList.remove('open');
  if (!$('#drawer').classList.contains('open')) $('#backdrop').classList.add('hidden');
  for (const b of $$('.bottom-nav button')) b.classList.remove('active');
  state.refresh = null;
}

function mount(node, refresh) {
  const panel = $('#panel');
  panel.innerHTML = '';
  if (typeof node === 'string') panel.innerHTML = node; else panel.append(node);
  state.refresh = refresh || null;
  refresh?.().catch((e) => panel.insertAdjacentHTML('afterbegin', `<p class="error" role="alert">Không tải được dữ liệu: ${esc(e.message)}</p>`));
}
const el = (html) => { const d = document.createElement('div'); d.className = 'stack'; d.innerHTML = html; return d; };

// ---------- Tin nhắn ----------
function renderMessages(list, busy) {
  if (!list.length && !busy) return '<p class="muted">Chưa có tin nhắn. Gõ câu hỏi bên dưới để bắt đầu.</p>';
  return list.map((m) => `
    <div class="msg ${m.sender === 'user' ? 'user' : 'staff'} ${m.isError ? 'err' : ''}">
      <div class="who">${m.sender === 'user' ? 'Bạn' : esc(nameOf(m.sender))} <span class="t">${esc(fmtTime(m.createdAt))}</span></div>
      <div class="body">${esc(m.text)}</div>
      ${m.brainLabel ? `<div class="brain">Bộ não đã suy nghĩ câu này: ${esc(m.brainLabel)}</div>` : ''}
    </div>`).join('') + (busy ? '<div class="typing">Nhân viên đang suy nghĩ…</div>' : '');
}

function chatList(channel, container, autoScroll = true) {
  let lastCount = -1;
  return async () => {
    const d = await api(`/api/messages/${encodeURIComponent(channel)}`);
    const sheet = $('#sheet');
    const atBottom = sheet.scrollTop + sheet.clientHeight >= sheet.scrollHeight - 60;
    container.innerHTML = renderMessages(d.messages, d.busy);
    if (autoScroll && d.messages.length !== lastCount && (atBottom || lastCount === -1)) sheet.scrollTop = sheet.scrollHeight;
    lastCount = d.messages.length;
  };
}

// ---------- Nhân viên: hồ sơ + xem trực tiếp + cài đặt ----------
const SUBS = [['chat', 'Hỏi riêng'], ['tasks', 'Việc'], ['training', 'Đào tạo'], ['brain', 'Bộ não / API'], ['software', 'Phần mềm'], ['consult', 'Tham vấn'], ['zalo', 'Zalo riêng'], ['profile', 'Hồ sơ']];

VIEWS.staff = (id) => {
  const s = staffById(id);
  if (!s) return mount('<p class="muted">Chọn một nhân viên.</p>');
  const wrap = el(`
    <section class="profile">
      ${avatar(s, 'lg')}
      <div class="grow">
        <h3>${esc(s.name)} — ${esc(s.role)}</h3>
        <div class="lines" id="pLines"></div>
      </div>
    </section>
    <div class="sig-card">Mã ký riêng (chữ ký số trên phiếu bán hàng): <b>${esc(s.signCode)}</b> — ký kèm ngày giờ, dấu V mờ dưới chữ ký<span class="v" aria-hidden="true">V</span></div>
    <div class="stack" style="gap:10px">
      <div class="eyebrow">Đổi trạng thái nhanh</div>
      <div class="chips" id="statusChips">${Object.entries(STATUS).map(([k, v]) => `<button type="button" class="chip" data-st="${k}">${v}</button>`).join('')}</div>
      <p class="kv" id="statusNote"></p>
    </div>
    <section class="card gold live stack" id="live" aria-live="polite"></section>
    <div class="stack" style="gap:10px">
      <div class="eyebrow">Cài đặt &amp; làm việc với ${esc(s.name)}</div>
      <div class="seg" role="tablist">${SUBS.map(([k, n]) => `<button type="button" role="tab" class="chip ${state.sub === k ? 'active' : ''}" aria-selected="${state.sub === k}" data-sub="${k}">${n}</button>`).join('')}</div>
    </div>
    <div id="subBody" class="stack"></div>`);
  $('#statusChips', wrap).addEventListener('click', async (e) => {
    const b = e.target.closest('[data-st]');
    if (!b) return;
    if (await act(() => api(`/api/staff/${s.id}/status`, { method: 'PUT', body: { status: b.dataset.st } }), `${s.name}: ${STATUS[b.dataset.st]}`)) { await loadStaff(); paintHead(); }
  });
  $('.seg', wrap).addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (b) { state.sub = b.dataset.sub; VIEWS.staff(id); }
  });
  const body = $('#subBody', wrap);
  const subRefresh = { chat: subChat, tasks: subTasks, training: subTraining, brain: subBrain, software: subSoftware, consult: subConsult, zalo: subZalo, profile: subProfile }[state.sub](s, body);

  function paintHead() {
    const cur = staffById(id);
    const st = statusOf(cur);
    const n = activeTasksOf(id).length;
    $('#pLines', wrap).innerHTML = `${statusHtml(st)}<span>· ${n ? `Đang xử lý ${n} việc` : 'Chưa có việc đang mở'}</span><span>· Đào tạo v${cur.trainingVersion}</span><span>· Bộ não: ${esc(cur.currentBrain.label)}</span>`;
    for (const c of $$('#statusChips .chip', wrap)) c.classList.toggle('active', c.dataset.st === cur.manualStatus);
    const auto = st !== cur.manualStatus;
    $('#statusNote', wrap).textContent = auto ? `Đang hiện "${STATUS[st]}" vì ${st === 'thinking' ? `${cur.name} đang suy nghĩ câu trả lời` : `${cur.name} đang có việc mở`}; trạng thái bạn đặt: ${STATUS[cur.manualStatus]}.` : '';
  }
  const liveRefresh = liveCard(id, $('#live', wrap));
  mount(wrap, async () => { paintHead(); await Promise.all([liveRefresh(), subRefresh?.()]); });
};

// Xem trực tiếp: việc gần nhất của nhân viên, từng bước, tiến trình.
function liveCard(id, box) {
  const openState = new Set();
  box.addEventListener('click', (e) => {
    const m = e.target.closest('[data-more]');
    if (m) { const k = m.dataset.more; openState.has(k) ? openState.delete(k) : openState.add(k); m.previousElementSibling.classList.toggle('open'); m.textContent = openState.has(k) ? 'Thu gọn' : 'Xem đầy đủ'; }
    const o = e.target.closest('[data-task]');
    if (o) openView('tasks', o.dataset.task);
  });
  return async () => {
    const s = staffById(id);
    const mine = state.tasks.filter((t) => involves(t, id));
    const task = mine.find((t) => ACTIVE_TASK.has(t.status)) || mine[0];
    if (!task) {
      box.innerHTML = `<div class="row between"><h3>Xem trực tiếp — ${esc(s.name)} đang làm gì</h3>${statusHtml(statusOf(s))}</div>
        <p class="muted">${esc(s.name)} chưa có việc nào. Giao việc riêng ở mục "Việc" bên dưới, hoặc giao việc chung cho cả nhóm.</p>`;
      return;
    }
    let steps = [];
    let detail = null;
    if (task.kind === 'general' && !(task.planSteps || []).length) {
      detail = await api(`/api/tasks/${task.id}`).catch(() => null);
      const turns = detail?.session?.turns || [];
      const phases = id === 'STAFF-007' && !task.assigneeIds.includes(id) ? ['judge'] : ['propose', 'critique', 'revise', 'score', ...(id === 'STAFF-007' ? ['judge'] : [])];
      steps = phases.map((p) => {
        const turn = turns.find((x) => x.phase === p && x.staffId === id);
        return { title: PHASE_TITLES[p], sub: p === 'judge' ? 'Xét từng đề xuất, chọn ý tốt nhất bất kể ai đề xuất' : '', done: !!turn, text: turn?.text, label: 'Đã nói' };
      });
    } else if (task.kind === 'general') {
      steps = task.planSteps.filter((p) => p.staffId === id).map((p) => {
        const o = task.outputs.find((x) => x.key === p.key);
        return { title: p.label, sub: p.criteria ? `Đạt khi: ${p.criteria}` : '', done: !!o && !o.error, fail: !!o?.error, text: o?.error ? `Bộ não lỗi: ${o.error}` : o?.text, label: 'Kết quả' };
      });
      const review = task.outputs.find((o) => o.key === 'review');
      if (id === 'STAFF-007') steps.push({ title: 'Kiểm tra từng kết quả theo tiêu chí đạt', sub: '', done: !!review, text: review?.text, label: 'Đánh giá' });
    } else {
      steps = [['draft', 'Bản nháp'], ['peer', 'Đồng nghiệp phản biện'], ['final', 'Bản cuối sau phản biện']].map(([k, n]) => {
        const o = task.outputs.find((x) => x.key === k);
        return { title: `${n}${o ? ` — ${o.staffName}` : ''}`, sub: '', done: !!o && !o.error, fail: !!o?.error, text: o?.error ? `Bộ não lỗi: ${o.error}` : o?.text, label: k === 'peer' ? 'Phản biện' : 'Kết quả' };
      });
    }
    const active = ACTIVE_TASK.has(task.status);
    const nowIdx = active ? steps.findIndex((x) => !x.done) : -1;
    const doneN = steps.filter((x) => x.done).length;
    const pct = steps.length ? Math.round((doneN / steps.length) * 100) : 0;
    const tone = TASK_TONE[task.status] || 'gold';
    box.innerHTML = `
      <div class="row between"><h3>Xem trực tiếp — ${esc(s.name)} đang làm gì</h3><span class="pill ${tone}"><i class="dot"></i>${esc(TASK_STATUS[task.status])}</span></div>
      <p style="margin:0">Việc ${active ? 'đang làm' : 'gần nhất'}: <b>${esc(task.title)}</b></p>
      <p class="kv" style="margin:0">Bộ não đang dùng: ${esc(s.currentBrain.label)} · Cập nhật lúc ${esc(fmtTime(task.updatedAt))} · Tự làm mới mỗi 3 giây</p>
      ${steps.length ? `<div class="row between kv"><span>Tiến trình: ${doneN}/${steps.length} bước</span><span>${pct}%</span></div>
      <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>` : ''}
      <div class="steps">${steps.map((x, i) => `
        <div class="step ${x.done ? 'done' : x.fail ? 'fail' : i === nowIdx ? 'now' : ''}">
          <span class="tick">${x.done ? ICON_CHECK : x.fail ? ICON_X : ''}</span>
          <div style="min-width:0">
            <h4>${esc(x.title)} <small class="${x.done ? 'ok' : x.fail ? 'error' : ''}">${x.done ? 'Đã xong' : x.fail ? 'Lỗi' : i === nowIdx ? (statusOf(s) === 'thinking' ? 'Đang suy nghĩ…' : 'Đang chờ lượt') : 'Chưa tới'}</small></h4>
            ${x.sub ? `<div class="sub">${esc(x.sub)}</div>` : ''}
            ${x.text ? `<div class="detail-box ${openState.has(`${task.id}${i}`) ? 'open' : ''}"><b>${esc(x.label)}:</b> ${esc(x.text)}</div><button type="button" class="more-btn" data-more="${task.id}${i}">${openState.has(`${task.id}${i}`) ? 'Thu gọn' : 'Xem đầy đủ'}</button>` : ''}
          </div>
        </div>`).join('') || '<p class="muted">Đang chờ bản chốt của Phúc để chia bước.</p>'}</div>
      <button type="button" class="btn sm" data-task="${task.id}">Mở toàn bộ việc</button>`;
  };
}

function subChat(s, body) {
  body.innerHTML = `<div class="chat" id="chatList" aria-live="polite"></div>
    <form class="composer" id="pForm">
      <label>Hỏi riêng ${esc(s.name)} <textarea id="pText" name="text" rows="2" placeholder="Ví dụ: ${esc(s.name)} đang làm những gì?" required></textarea></label>
      <button class="btn gold block" type="submit">Gửi cho ${esc(s.name)}</button>
    </form>`;
  const refresh = chatList(`staff:${s.id}`, $('#chatList', body), false);
  const form = $('#pForm', body);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = form.text.value.trim();
    if (!text) return;
    form.text.value = '';
    await act(() => api(`/api/chat/staff/${s.id}`, { body: { text } }));
    setTimeout(refresh, 300);
  });
  form.text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  return refresh;
}

function taskCard(t) {
  const steps = t.planSteps?.length ? t.planSteps.length : null;
  const done = steps ? t.planSteps.filter((p) => t.outputs.some((o) => o.key === p.key && !o.error)).length : null;
  const people = [...new Set([...t.assigneeIds, ...(t.planSteps || []).map((p) => p.staffId).filter(Boolean)])];
  return `<div class="card clickable stack" style="gap:10px" role="button" tabindex="0" data-task="${t.id}" aria-label="Mở việc ${esc(t.title)}">
    <div class="row between"><b class="grow">${esc(t.title)}</b><span class="pill ${TASK_TONE[t.status] || ''}"><i class="dot"></i>${esc(TASK_STATUS[t.status] || t.status)}</span></div>
    <div class="row">${people.slice(0, 6).map((id) => avatar(staffById(id), 'sm')).join('')}<span class="kv">${t.kind === 'general' ? 'Việc chung' : 'Việc riêng'} · ${esc(fmtTime(t.createdAt))}</span></div>
    ${steps ? `<div class="progress"><i style="width:${Math.round((done / steps) * 100)}%"></i></div>` : ''}
    ${t.lastError ? `<div class="error" style="font-size:13px">${esc(t.lastError)}</div>` : ''}
  </div>`;
}
function openTaskFrom(e) {
  const c = e.target.closest('[data-task]');
  if (c && $('#panel').contains(c) && c.classList.contains('card')) openView('tasks', c.dataset.task);
}
document.addEventListener('click', openTaskFrom);
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.card[data-task]')) { e.preventDefault(); openTaskFrom(e); } });

function subTasks(s, body) {
  body.innerHTML = `
    <form class="card form" id="newTask">
      <h3>Giao việc riêng cho ${esc(s.name)}</h3>
      <p class="kv">${esc(s.name)} làm bản nháp, một đồng nghiệp phản biện từng điểm, rồi ${esc(s.name)} trả lời từng ý và nộp bản cuối.</p>
      <label>Tên việc <input name="title" required></label>
      <label>Mô tả <textarea name="description"></textarea></label>
      <label>Loại việc <select name="taskKind">${Object.entries(ROLE_NAME).filter(([k]) => k !== 'zalo_channel').map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
      <button class="btn gold" type="submit">Giao việc</button>
    </form>
    <div id="taskList" class="stack"></div>`;
  $('#newTask', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const t = await act(() => api('/api/tasks', { body: { ...f, kind: 'individual', assigneeIds: [s.id] } }), 'Đã giao việc.');
    if (t) { e.target.reset(); await loadTasks(); openView('tasks', t.id); }
  });
  return async () => {
    const list = state.tasks.filter((t) => involves(t, s.id));
    $('#taskList', body).innerHTML = list.length ? list.map(taskCard).join('') : '<p class="muted">Chưa có việc.</p>';
  };
}

function subTraining(s, body) {
  body.innerHTML = `
    <form class="card form" id="trainForm">
      <div class="row between"><h3>Đào tạo riêng</h3><span class="pill gold">Đang dùng v${s.trainingVersion}</span></div>
      <p class="kv">Mỗi lần lưu tăng phiên bản; mọi câu trả lời của ${esc(s.name)} dùng bản mới nhất.</p>
      <textarea name="trainingText" id="trainText" style="min-height:240px">${esc(s.trainingText)}</textarea>
      <button class="btn gold" type="submit">Lưu đào tạo (thành v${s.trainingVersion + 1})</button>
    </form>
    <section class="card stack">
      <h3>Lịch sử đào tạo</h3>
      ${s.trainingHistory?.length ? `<div class="history">${s.trainingHistory.map((h) => `
        <div class="item"><span class="pill">v${h.version}</span><span class="grow kv">${esc(fmtTime(h.at))}</span>
          <button class="btn sm" type="button" data-view="${h.version}">Xem</button><button class="btn sm outline" type="button" data-restore="${h.version}">Khôi phục</button></div>
        <div class="detail-box open hidden" data-text="${h.version}">${esc(h.text)}</div>`).join('')}</div>` : '<p class="muted">Chưa có phiên bản cũ. Bản cũ được giữ lại mỗi khi bạn lưu đào tạo mới.</p>'}
    </section>`;
  $('#trainForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api(`/api/staff/${s.id}/training`, { method: 'PUT', body: { trainingText: e.target.trainingText.value } }), 'Đã lưu đào tạo.')) { await loadStaff(); VIEWS.staff(s.id); }
  });
  body.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-view]');
    if (v) $(`[data-text="${v.dataset.view}"]`, body).classList.toggle('hidden');
    const r = e.target.closest('[data-restore]');
    if (r && await askConfirm(`Khôi phục đào tạo v${r.dataset.restore} thành phiên bản mới?`, 'Khôi phục')) {
      if (await act(() => api(`/api/staff/${s.id}/training/restore`, { body: { version: Number(r.dataset.restore) } }), 'Đã khôi phục.')) { await loadStaff(); VIEWS.staff(s.id); }
    }
  });
  return null;
}

function subProfile(s, body) {
  body.innerHTML = `
    <section class="card stack">
      <h3>Hồ sơ</h3>
      <dl class="facts">
        <dt>Mã nhân viên</dt><dd>${esc(s.id)}</dd>
        <dt>Vai trò</dt><dd>${esc(s.role)}</dd>
        <dt>Nhóm</dt><dd>${esc(GROUP_NAME[s.group] || s.group)}</dd>
        <dt>Phần mềm chính</dt><dd>${esc(s.mainSoftware)}</dd>
        <dt>Chỗ ngồi</dt><dd>${esc(s.seat.zone)} · bàn số ${s.seat.deskIndex + 1}</dd>
        <dt>Mã ký riêng</dt><dd>${esc(s.signCode)}</dd>
        <dt>Bộ não gần nhất</dt><dd>${esc(s.lastBrainLabel || '—')}</dd>
      </dl>
      <div><div class="kv" style="margin-bottom:4px">Trách nhiệm cốt lõi</div><p style="margin:0">${esc(s.responsibilities)}</p></div>
    </section>
    <form class="card form" id="profForm">
      <h3>Hiển thị trong văn phòng</h3>
      <label>Nhãn trên đầu nhân vật 3D (tối đa 3 chữ) <input id="pfLabel" name="shortLabel" value="${esc(s.shortLabel)}" maxlength="18" required></label>
      <div class="stack" style="gap:8px"><span class="kv">Màu riêng (ảnh đại diện, áo, nhãn)</span>
        <div class="swatches" role="radiogroup" aria-label="Màu riêng">${COLOR_CHOICES.map((c) => `<button type="button" class="swatch ${c === s.color ? 'active' : ''}" role="radio" aria-checked="${c === s.color}" aria-label="Màu ${c}" data-color="${c}" style="background:${c}"></button>`).join('')}</div></div>
      <input type="hidden" name="color" value="${esc(s.color)}">
      <button class="btn gold" type="submit">Lưu hiển thị</button>
    </form>`;
  const form = $('#profForm', body);
  $('.swatches', body).addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    form.color.value = b.dataset.color;
    for (const x of $$('.swatch', body)) { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api(`/api/staff/${s.id}/profile`, { method: 'PUT', body: Object.fromEntries(new FormData(form)) }), 'Đã lưu.')) { await loadStaff(); VIEWS.staff(s.id); }
  });
  return null;
}

// Trình quản lý API dùng chung cho nhân viên và API mặc định công ty.
function subBrain(s, body) { return apiConfigEditor(s.id, body, `Bộ não của ${s.name}`); }
function apiConfigEditor(ownerId, body, title) {
  if (state.me.trial) {
    body.innerHTML = `<div class="card stack"><h3>Bản trải nghiệm</h3>
      <p class="kv" style="margin:0">Bộ não hiện tại: Claude qua tài khoản claude.ai của bạn. Gắn API riêng (Claude, OpenAI, Gemini…) theo vai trò, kiểm tra key và chọn model có ở bản server khi đưa ra ngoài.</p></div>`;
    return null;
  }
  body.innerHTML = `
    <p class="kv" style="margin:0">Thứ tự chọn bộ não: API chuyên môn khớp loại việc và đã kiểm tra đạt → API chung → API mặc định công ty → Claude mặc định (dự phòng, có ghi lý do).
    <b>Kiểm tra key chỉ liệt kê model</b>, không gửi câu hỏi thử; kiểm tra đạt không có nghĩa gọi trả lời sẽ thành công.</p>
    <div id="cfgList" class="stack"></div>
    <form class="card form" id="cfgForm">
      <h3>${esc(title)}: gắn API mới</h3>
      <label>Nhà cung cấp <select name="provider">
        <option value="anthropic">Claude (Anthropic) — key sk-ant-… hoặc token OAuth sk-ant-oat…</option>
        <option value="openai">OpenAI</option>
        <option value="openai_compatible">Tương thích OpenAI (Gemini, DeepSeek, OpenRouter…)</option>
      </select></label>
      <label class="base-url hidden">Base URL <input name="baseUrl" placeholder="https://…/v1"></label>
      <label>Vai trò <select name="role">${Object.entries(ROLE_NAME).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
      <label>Key (chỉ lưu ở server, mã hoá; chỉ hiện 4 ký tự cuối) <input name="apiKey" type="password" autocomplete="off" required></label>
      <div class="row"><button class="btn sm" type="button" id="listModels">Lấy danh sách model từ key</button><span id="lmStatus" class="kv"></span></div>
      <label>Model (tự chọn; để trống = mặc định của nhà cung cấp) <select name="model"><option value="">— mặc định —</option></select></label>
      <button class="btn gold" type="submit">Lưu API</button>
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
    if (await act(() => api(`/api/apis/${ownerId}`, { body: Object.fromEntries(new FormData(form)) }), 'Đã lưu API. Bấm "Kiểm tra" để liệt kê model.')) { form.reset(); refresh(); loadStaff(); }
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
        $(`[data-out="${id}"]`, list).innerHTML = r.ok
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
      if (await askConfirm('Xoá API này? Key sẽ bị xoá khỏi server.', 'Xoá')) { await act(() => api(`/api/api-config/${id}`, { method: 'DELETE' })); refresh(); loadStaff(); }
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
      <div class="card stack" style="gap:8px">
        <div class="row between"><b>${esc(c.provider)} · ${esc(ROLE_NAME[c.role])}</b>
          <span class="row"><span class="pill ${c.lastCheckOk ? 'teal' : c.lastCheckAt ? 'red' : ''}">${c.lastCheckOk ? 'Kiểm tra đạt' : c.lastCheckAt ? 'Kiểm tra lỗi' : 'Chưa kiểm tra'}</span><span class="pill">${c.enabled ? 'Bật' : 'Tắt'}</span></span></div>
        <div class="kv">Key ···${esc(c.keyLast4)} · Model: ${esc(c.model || 'mặc định')}${c.baseUrl ? ` · ${esc(c.baseUrl)}` : ''} · Kiểm tra lúc ${esc(fmtTime(c.lastCheckAt))}</div>
        ${c.lastProviderError ? `<div class="error" style="font-size:13px">Lỗi nhà cung cấp gần nhất (nguyên văn): ${esc(c.lastProviderError)}</div>` : ''}
        <div data-out="${c.id}"></div>
        <div class="row">
          <button class="btn sm" type="button" data-act="check" data-id="${c.id}">Kiểm tra (liệt kê model)</button>
          <button class="btn sm" type="button" data-act="toggle" data-id="${c.id}" data-enabled="${c.enabled ? 1 : 0}">${c.enabled ? 'Tắt' : 'Bật'}</button>
          <button class="btn sm danger" type="button" data-act="delete" data-id="${c.id}">Xoá</button>
        </div>
      </div>`).join('') : '<p class="muted">Chưa gắn API riêng — đang dùng bộ não mặc định.</p>';
  }
  return refresh;
}

const LINK_STATUS = { connected: 'Đã kết nối', expired: 'Hết hạn — cần tự đăng nhập lại', not_connected: 'Chưa kết nối' };
function linkCards(links, showOwner = false) {
  return links.length ? links.map((l) => `
    <div class="card stack" style="gap:8px">
      <div class="row between"><b>${esc(l.softwareName)}${showOwner ? ` · ${esc(nameOf(l.staffId))}` : ''}</b>
        <span class="pill ${l.status === 'connected' ? 'teal' : l.status === 'expired' ? 'red' : ''}">${LINK_STATUS[l.status]}</span></div>
      <a class="kv" href="${esc(l.url)}" target="_blank" rel="noopener" data-opened="${l.id}">${esc(l.url)}</a>
      <div class="kv">Quyền: ${esc(l.permissionScope || '—')} · Mã: ${l.accessCodeLast4 ? '···' + esc(l.accessCodeLast4) : '—'} · Kiểm tra: ${esc(fmtTime(l.lastCheckAt))} · Mở: ${esc(fmtTime(l.lastOpenedAt))}</div>
      <div class="row"><select class="grow" data-lstatus="${l.id}" aria-label="Trạng thái ${esc(l.softwareName)}" style="max-width:240px">${Object.keys(LINK_STATUS).map((x) => `<option value="${x}" ${x === l.status ? 'selected' : ''}>${{ connected: 'Đã kết nối', expired: 'Hết hạn', not_connected: 'Chưa kết nối' }[x]}</option>`).join('')}</select>
        <button class="btn sm danger" type="button" data-ldel="${l.id}">Xoá</button></div>
    </div>`).join('') : '<p class="muted">Chưa có liên kết phần mềm.</p>';
}
function bindLinkActions(container, after) {
  container.addEventListener('click', async (e) => {
    const o = e.target.closest('[data-opened]');
    if (o) api(`/api/links/${o.dataset.opened}`, { method: 'PUT', body: { opened: true } });
    const d = e.target.closest('[data-ldel]');
    if (d && await askConfirm('Xoá liên kết phần mềm này?', 'Xoá')) { await act(() => api(`/api/links/${d.dataset.ldel}`, { method: 'DELETE' })); after(); }
  });
  container.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-lstatus]');
    if (s) { await act(() => api(`/api/links/${s.dataset.lstatus}`, { method: 'PUT', body: { status: s.value } })); after(); }
  });
}

function subSoftware(s, body) {
  body.innerHTML = `<div id="links" class="stack"></div>
    <form class="card form" id="linkForm">
      <h3>Thêm liên kết phần mềm cho ${esc(s.name)}</h3>
      <label>Phần mềm <input name="softwareName" list="swList" required></label>
      <datalist id="swList"><option>KiotViet</option><option>Fanpage</option><option>Meta Ads</option><option>Messenger</option><option>Zalo</option></datalist>
      <label>Đường dẫn <input name="url" required placeholder="https://"></label>
      <label>Phạm vi quyền <input name="permissionScope" placeholder="Ví dụ: chỉ đọc tồn kho"></label>
      <label>Mã truy cập (chỉ nhập ở đây, chỉ hiện 4 ký tự cuối${state.me.trial ? '; bản trải nghiệm chỉ giữ 4 ký tự cuối' : ''}) <input name="accessCode" type="password" autocomplete="off"></label>
      <label>Trạng thái <select name="status"><option value="not_connected">Chưa kết nối</option><option value="connected">Đã kết nối</option><option value="expired">Hết hạn</option></select></label>
      <button class="btn gold" type="submit">Thêm liên kết</button>
    </form>`;
  const refresh = async () => { $('#links', body).innerHTML = linkCards((await api('/api/staff')).find((x) => x.id === s.id).softwareLinks); };
  bindLinkActions($('#links', body), refresh);
  $('#linkForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api(`/api/staff/${s.id}/links`, { body: Object.fromEntries(new FormData(e.target)) }), 'Đã thêm liên kết.')) { e.target.reset(); refresh(); }
  });
  let done = false;
  return async () => { if (!done) { done = true; await refresh(); } };
}

function subConsult(s, body) {
  body.innerHTML = `<form class="card form" id="consultForm">
      <h3>${esc(s.name)} hỏi ý kiến đồng nghiệp</h3>
      <p class="kv" style="margin:0">Mỗi đồng nghiệp tự suy nghĩ bằng bộ não của mình; ${esc(s.name)} cân từng ý kiến, chọn ý tốt nhất dù của ai rồi tự chốt.</p>
      <div class="chips">${state.staff.filter((x) => x.id !== s.id).map((x) => `<label class="chip" style="display:inline-flex;align-items:center;gap:8px;color:var(--text)"><input type="checkbox" name="c" value="${x.id}"> ${esc(x.name)}</label>`).join('')}</div>
      <label>Câu hỏi <textarea name="question" required></textarea></label>
      <button class="btn gold" type="submit">Tham vấn</button>
    </form><div class="chat" id="consultList"></div>`;
  $('#consultForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const colleagueIds = $$('input[name=c]:checked', e.target).map((i) => i.value);
    if (await act(() => api(`/api/staff/${s.id}/consult`, { body: { question: e.target.question.value, colleagueIds } }), 'Đang tham vấn…')) e.target.question.value = '';
  });
  return async () => {
    const d = await api(`/api/messages/${encodeURIComponent('consult:' + s.id)}`);
    $('#consultList', body).innerHTML = renderMessages(d.messages, d.busy);
  };
}

function subZalo(s, body) {
  body.innerHTML = `<form class="card form" id="zForm">
      <h3>Xếp nhiệm vụ Zalo cho ${esc(s.name)}</h3>
      <label>Người nhận / nhóm <input name="target" placeholder="Ví dụ: Nhóm giao hàng nội bộ"></label>
      <label>Nội dung <textarea name="content" required></textarea></label>
      ${s.id === 'STAFF-008' ? '<p class="kv" style="margin:0">Nội dung CSKH / khuyến mại của Chi bắt buộc bạn duyệt trước khi gửi.</p>' : ''}
      <button class="btn gold" type="submit">Xếp hàng</button>
    </form><div id="zList" class="stack"></div>`;
  $('#zForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api('/api/zalo/queue', { body: { staffId: s.id, ...Object.fromEntries(new FormData(e.target)) } }), 'Đã xếp hàng.')) { e.target.reset(); refresh(); }
  });
  async function refresh() { $('#zList', body).innerHTML = zaloItems((await api('/api/zalo')).queue.filter((i) => i.staffId === s.id)); }
  return refresh;
}

// ---------- Chat nhóm ----------
VIEWS.group = () => {
  const wrap = el(`
    <p class="kv" style="margin:0">Hỏi chung: các nhân viên liên quan trả lời lần lượt, người sau xét từng câu trả lời trước, rồi Phúc kết luận ý của ai tốt nhất. Chọn một người thì chỉ người đó trả lời.</p>
    <div class="chat" id="chatList" aria-live="polite"></div>
    <form class="composer" id="gChat">
      <label>Hỏi ai trong nhóm?
        <select id="gTarget" name="target"><option value="">Hỏi chung — cả nhóm thảo luận</option>${state.staff.map((s) => `<option value="${s.id}">${esc(s.name)} — ${esc(s.role)}</option>`).join('')}</select>
      </label>
      <label for="gText">Gõ vào Chat nhóm công ty</label>
      <div class="row"><input id="gText" name="text" placeholder="Ví dụ: An đang làm những gì? / Cả nhóm làm sao tăng like Fanpage?" required autocomplete="off"><button class="btn gold" type="submit">Gửi vào nhóm</button></div>
    </form>`);
  const refresh = chatList('group', $('#chatList', wrap));
  const form = $('#gChat', wrap);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = form.text.value.trim();
    if (!text) return;
    form.text.value = '';
    await act(() => api('/api/chat/group', { body: { text, target: form.target.value || undefined } }));
    setTimeout(refresh, 300);
  });
  mount(wrap, refresh);
};

// ---------- Việc ----------
VIEWS.tasks = (arg) => {
  if (state.taskDetail) return viewTaskDetail(state.taskDetail);
  const meeting = arg === 'meeting';
  const wrap = el(`
    <form class="card gold form" id="gForm">
      <h3>${meeting ? 'Họp toàn văn phòng' : 'Giao việc chung / Họp'}</h3>
      <p class="kv" style="margin:0">Mỗi người đề xuất độc lập, phản biện chéo từng đề xuất của người khác, sửa kế hoạch và chấm lại (tối đa 10 phút). Phúc chọn ý tốt nhất bất kể ai đề xuất, giao việc theo năng lực rồi kiểm tra từng kết quả. Gõ "chốt công việc" hoặc "dừng" trong phiên để chốt sớm.</p>
      <label>Tên việc <input id="gTitle" name="title" required placeholder="Ví dụ: Làm sao tăng like Fanpage"></label>
      <label>Mô tả <textarea name="description"></textarea></label>
      <div class="stack" style="gap:8px"><span class="kv">Người tham gia ${meeting ? '(cả văn phòng; bỏ chọn bớt để tiết kiệm lượt gọi bộ não)' : '(để trống: hệ thống tự chọn theo chuyên môn)'}</span>
        <div class="chips">${state.staff.map((x) => `<label class="chip" style="display:inline-flex;align-items:center;gap:8px;color:var(--text)"><input type="checkbox" name="a" value="${x.id}" ${meeting ? 'checked' : ''}> ${esc(x.name)}</label>`).join('')}</div></div>
      <label>Ảnh sản phẩm (tối đa 4) <input type="file" name="files" accept="image/png,image/jpeg,image/webp,image/gif" multiple></label>
      <div id="attMeta" class="stack" style="gap:8px"></div>
      <button class="btn gold" type="submit">${meeting ? 'Bắt đầu họp' : 'Giao việc chung'}</button>
    </form>
    <div class="eyebrow">Tất cả việc</div>
    <div id="tList" class="stack"></div>`);
  const form = $('#gForm', wrap);
  form.files.addEventListener('change', () => {
    const files = [...form.files.files];
    if (files.length > 4) { toast('Tối đa 4 ảnh cho mỗi nhiệm vụ.'); form.files.value = ''; return; }
    $('#attMeta', wrap).innerHTML = files.map((f, i) => `<div class="field-row"><span class="kv">${esc(f.name)}</span>
      <input name="pn${i}" aria-label="Tên sản phẩm của ${esc(f.name)}" placeholder="Tên sản phẩm"><input name="pr${i}" aria-label="Giá của ${esc(f.name)}" placeholder="Giá"></div>`).join('');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const files = [...form.files.files].slice(0, 4);
    const attachments = await Promise.all(files.map((f, i) => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res({ fileName: f.name, mimeType: f.type, data: String(r.result).split(',')[1], productName: form[`pn${i}`]?.value, priceNote: form[`pr${i}`]?.value });
      r.readAsDataURL(f);
    })));
    const assigneeIds = $$('input[name=a]:checked', form).map((i) => i.value);
    const t = await act(() => api('/api/tasks', { body: { title: form.title.value, description: form.description.value, kind: 'general', assigneeIds, attachments } }), 'Đã giao việc chung, phiên phản biện bắt đầu.');
    if (t) { await loadTasks(); openView('tasks', t.id); }
  });
  mount(wrap, async () => {
    $('#tList', wrap).innerHTML = state.tasks.length ? state.tasks.map(taskCard).join('') : '<p class="muted">Chưa có việc nào. Giao việc chung ở trên, hoặc giao việc riêng trong trang của từng nhân viên.</p>';
  });
  if (arg === 'new' || meeting) setTimeout(() => $('#gTitle')?.focus(), 250);
};

function renderScoreboard(board) {
  if (!board?.length) return '';
  const best = Math.max(...board.map((b) => b.finalScore ?? b.critiqueScore ?? 0));
  return `<div class="table-wrap"><table class="score">
    <caption>Bảng điểm trung bình (thang 10, không tính tự chấm)</caption>
    <thead><tr><th scope="col">Đề xuất</th><th scope="col">Tác giả</th><th scope="col">Phản biện</th><th scope="col">Chấm lại</th><th scope="col">Trạng thái</th></tr></thead>
    <tbody>${board.map((b) => `<tr${(b.finalScore ?? b.critiqueScore) === best && best > 0 ? ' class="lead"' : ''}>
      <td>${esc(b.proposalId)}</td><td>${esc(b.authorName)}</td><td>${b.critiqueScore ?? '—'}</td><td>${b.finalScore ?? '—'}</td>
      <td>${b.withdrawn ? `Đã rút${b.endorse ? `, ủng hộ ${esc(b.endorse)}` : ''}` : b.revised ? 'Đã sửa' : 'Bản đầu'}</td></tr>`).join('')}</tbody>
  </table></div>`;
}
function renderDebateTurns(turns) {
  let last = null;
  return turns.map((m) => {
    const head = m.phase && m.phase !== last ? `<h4 class="phase">${esc(PHASE_TITLES[m.phase] || m.phase)}</h4>` : '';
    if (m.phase) last = m.phase;
    return `${head}<div class="msg ${m.staffId === 'user' ? 'user' : m.staffId === 'system' ? 'system' : 'staff'}">
      <div class="who">${esc(nameOf(m.staffId))} <span class="t">${esc(fmtTime(m.createdAt))}</span></div><div class="body">${esc(m.text)}</div>
      ${m.staffId !== 'user' && m.staffId !== 'system' ? `<div class="brain">Bộ não: ${esc(m.brainLabel)}</div>` : ''}</div>`;
  }).join('');
}

function viewTaskDetail(id) {
  const wrap = el(`<button class="btn sm" type="button" id="back">← Tất cả việc</button><div id="tHead" class="stack"></div>
    <div id="outputs" class="stack"></div>
    <div id="sess" class="stack"></div>
    <form class="composer hidden" id="sayForm">
      <label for="sayText">Góp ý vào phiên (các vòng sau phải tính đến)</label>
      <div class="row"><input id="sayText" name="text" placeholder='Gõ "chốt công việc" hoặc "dừng" để chốt' autocomplete="off"><button class="btn gold" type="submit">Gửi</button><button type="button" id="closeBtn" class="btn danger">Dừng phiên</button></div>
    </form>
    <details class="card"><summary><b>Quyền Quản lý (Phúc)</b></summary>
      <div class="form" style="margin-top:12px">
        <div class="row"><input class="grow" id="stopReason" aria-label="Lý do dừng" placeholder="Lý do dừng"><button class="btn danger" type="button" id="stopBtn">Dừng ngay</button></div>
        <div class="field-row"><input id="retReason" aria-label="Lý do trả làm lại" placeholder="Lý do trả làm lại"><input id="retCrit" aria-label="Tiêu chí đạt" placeholder="Tiêu chí đạt"><button class="btn" type="button" id="retBtn">Trả việc</button></div>
        <div class="row"><button class="btn sm" type="button" id="resumeBtn">Cho phép mở lại</button><button class="btn sm" type="button" id="legalBtn">Pháp lý (Minh) cho qua</button><button class="btn sm outline" type="button" id="retryBtn">Thử lại / chạy lại</button></div>
      </div></details>`);
  $('#back', wrap).onclick = () => { state.taskDetail = null; openView('tasks'); };
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
    $('#sheetTitle').textContent = t.title;
    $('#tHead', wrap).innerHTML = `
      <div class="row"><span class="pill ${TASK_TONE[t.status] || ''}"><i class="dot"></i>${esc(TASK_STATUS[t.status])}</span>${t.legalCleared ? '<span class="pill teal">Pháp lý đã cho qua</span>' : ''}
        <span class="kv">${t.kind === 'general' ? 'Việc chung' : 'Việc riêng'} · ${t.assigneeIds.map((x) => esc(nameOf(x))).join(', ')}</span></div>
      <h3 style="font-size:20px">${esc(t.title)}</h3>
      ${t.description ? `<p style="margin:0">${esc(t.description)}</p>` : ''}
      ${t.attachments.length ? `<div class="kv">Đính kèm: ${t.attachments.map((a) => esc(`${a.fileName}${a.productName ? ` (${a.productName}${a.priceNote ? `, ${a.priceNote}` : ''})` : ''}`)).join('; ')}</div>` : ''}
      ${t.stopReason ? `<div class="error">${esc(t.stopReason)}</div>` : ''}
      ${t.returnReason ? `<div class="notice">Trả làm lại: ${esc(t.returnReason)} — Tiêu chí đạt: ${esc(t.passCriteria)}</div>` : ''}
      ${t.lastError ? `<div class="error">Lỗi gần nhất (trạng thái việc được giữ nguyên để thử lại):\n${esc(t.lastError)}</div>` : ''}`;
    $('#outputs', wrap).innerHTML = t.outputs.length ? `<div class="eyebrow">Kết quả thực hiện</div><div class="steps">${t.outputs.map((o) => `
      <div class="step ${o.error ? 'fail' : 'done'}"><span class="tick">${o.error ? ICON_X : ICON_CHECK}</span><div style="min-width:0">
        <h4>${esc(o.step || 'Thực hiện')} <small class="kv">${esc(o.staffName)}</small></h4>
        ${o.why ? `<div class="sub">Được giao vì: ${esc(o.why)}${o.criteria ? ` · Đạt khi: ${esc(o.criteria)}` : ''}</div>` : ''}
        <div class="detail-box open">${esc(o.error ? `Bộ não lỗi: ${o.error}` : o.text)}</div>
        ${o.brainLabel ? `<div class="kv" style="margin-top:6px;color:var(--teal)">Bộ não: ${esc(o.brainLabel)}</div>` : ''}
      </div></div>`).join('')}</div>` : '';
    if (s) {
      const left = Math.max(0, Date.parse(s.deadlineAt) - Date.now());
      $('#sess', wrap).innerHTML = `
        <div class="row between"><div class="eyebrow">Phiên phản biện</div><span class="pill ${s.status === 'running' ? 'orange' : 'teal'}">${s.status === 'running' ? `Còn ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}` : { closed_by_keyword: 'Đã chốt', closed_by_timeout: 'Hết 10 phút', closed_by_button: 'Đã dừng' }[s.status] || s.status}</span></div>
        ${renderScoreboard(s.scoreboard)}
        <div class="chat">${renderDebateTurns(s.turns)}${s.runnerActive ? '<div class="typing">Các nhân viên đang làm việc…</div>' : ''}</div>`;
      $('#sayForm', wrap).classList.toggle('hidden', s.status !== 'running');
    }
  }
  mount(wrap, refresh);
}

// ---------- Phiếu bán hàng ----------
const SLIP_FIELDS = [['customerName', 'Tên khách'], ['customerPhone', 'Số điện thoại'], ['customerAddress', 'Địa chỉ'], ['productNameAndCode', 'Sản phẩm và mã'], ['quantity', 'Số lượng'], ['paymentMethod', 'Phương thức thanh toán']];
VIEWS.slips = () => {
  const wrap = el(`
    <form class="card gold form" id="slipForm" novalidate>
      <h3>Sơn (Sale) tạo phiếu</h3>
      <p class="kv" style="margin:0">Chỉ tạo khi khách đã gửi đủ 6 thông tin bắt buộc. Tạo xong Kho nhận đơn, Kế toán ký hoàn tất sau khi giao.</p>
      ${SLIP_FIELDS.map(([k, n]) => `<label>${n} * <input name="${k}" ${k === 'quantity' ? 'type="number" min="1" inputmode="numeric"' : ''}></label>`).join('')}
      <button class="btn gold" type="submit">Tạo phiếu</button><p class="error" id="slipErr" role="alert" style="margin:0"></p>
    </form><div class="eyebrow">Phiếu đã tạo</div><div id="slipList" class="stack"></div>`);
  $('#slipForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const missing = SLIP_FIELDS.filter(([k]) => !String(f[k] || '').trim() || (k === 'quantity' && !(Number(f[k]) > 0)));
    if (missing.length) { $('#slipErr', wrap).textContent = `Thiếu: ${missing.map(([, n]) => n).join(', ')}. Sale phải hỏi thêm khách.`; return; }
    try {
      await api('/api/slips', { body: f });
      $('#slipErr', wrap).textContent = ''; e.target.reset(); toast('Đã tạo phiếu, chuyển Kho.'); refresh();
    } catch (err) { $('#slipErr', wrap).textContent = err.message; }
  });
  $('#slipList', wrap).addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-slip]');
    if (!b) return;
    const id = b.dataset.slip;
    if (b.dataset.a === 'wh') {
      let photo;
      if (b.dataset.next === 'delivery_photo_recorded') { const card = b.closest('.card'); photo = { sourceGroupName: $('[name=grp]', card).value, note: $('[name=note]', card).value }; }
      await act(() => api(`/api/slips/${id}/warehouse`, { body: { status: b.dataset.next, photo } }));
    } else if (b.dataset.a === 'acc') await act(() => api(`/api/slips/${id}/accounting-signoff`, { body: {} }));
    else if (b.dataset.a === 'arc') await act(() => api(`/api/slips/${id}/archive`, { body: {} }), 'Đã lưu trữ phiếu.');
    refresh();
  });
  async function refresh() {
    const slips = await api('/api/slips');
    $('#slipList', wrap).innerHTML = slips.map((p) => `<div class="card stack" style="gap:8px">
      <div class="row between"><b>${esc(p.id)}</b><span class="row"><span class="pill orange">${esc(WAREHOUSE[p.warehouseStatus])}</span>${p.archivedAt ? '<span class="pill teal">Đã lưu trữ</span>' : ''}</span></div>
      <div class="kv">${esc(p.customerName)} · ${esc(p.customerPhone)} · ${esc(p.customerAddress)}</div>
      <div>${esc(p.productNameAndCode)} × ${p.quantity} · ${esc(p.paymentMethod)}</div>
      <div class="kv">Chữ ký: ${p.signatures.map((s) => `${esc(s.staffName)} [${esc(s.signCode)}] ${esc(fmtTime(s.signedAt))} ✓`).join(' · ')}</div>
      ${p.deliveryPhoto ? `<div class="kv">Ảnh giao hàng từ nhóm "${esc(p.deliveryPhoto.sourceGroupName)}" lúc ${esc(fmtTime(p.deliveryPhoto.recordedAt))}${p.deliveryPhoto.note ? ` — ${esc(p.deliveryPhoto.note)}` : ''}</div>` : ''}
      ${p.archivedAt ? '' : `<div class="row">
        ${WAREHOUSE_NEXT[p.warehouseStatus] === 'delivery_photo_recorded' ? '<input name="grp" class="grow" aria-label="Tên nhóm giao hàng Zalo" placeholder="Tên nhóm giao hàng Zalo"><input name="note" class="grow" aria-label="Ghi chú giao hàng" placeholder="Ghi chú">' : ''}
        ${WAREHOUSE_NEXT[p.warehouseStatus] ? `<button class="btn sm" type="button" data-slip="${p.id}" data-a="wh" data-next="${WAREHOUSE_NEXT[p.warehouseStatus]}">Dũng (Kho): ${esc(WAREHOUSE[WAREHOUSE_NEXT[p.warehouseStatus]])}</button>` : ''}
        ${!p.accountingSignedOff ? `<button class="btn sm" type="button" data-slip="${p.id}" data-a="acc">Hà (Kế toán) ký hoàn tất</button>` : '<span class="pill teal">Kế toán đã ký</span>'}
        <button class="btn sm outline" type="button" data-slip="${p.id}" data-a="arc">Lưu trữ</button></div>`}
    </div>`).join('') || '<p class="muted">Chưa có phiếu.</p>';
  }
  let first = true;
  mount(wrap, async () => { if (first || !wrap.querySelector('#slipList input:focus')) { first = false; await refresh(); } });
};

// ---------- Zalo ----------
function zaloItems(items) {
  return items.length ? items.map((i) => `<div class="card stack" style="gap:8px">
    <div class="row between"><b>${esc(i.id)} · ${esc(nameOf(i.staffId))}</b>
      <span class="pill ${i.status === 'done' ? 'teal' : i.status === 'error' ? 'red' : i.status === 'sending' ? 'orange' : ''}">${esc(i.status)}</span></div>
    <div class="kv">Tới: ${esc(i.target || '—')} · Tạo ${esc(fmtTime(i.createdAt))}${i.sentAt ? ` · Gửi ${esc(fmtTime(i.sentAt))}` : ''}</div>
    <div style="white-space:pre-wrap">${esc(i.content)}</div>
    ${i.receipt ? `<div class="kv ok">Biên nhận: ${esc(i.receipt)}</div>` : ''}
    ${i.reply ? `<div class="kv">Phản hồi Zalo: ${esc(i.reply)}</div>` : ''}
    ${i.providerError ? `<div class="error" style="font-size:13px">${esc(i.providerError)}</div>` : ''}
    <div class="row">
      ${i.requiresUserApproval && !i.approvedByUser ? `<button class="btn sm gold" type="button" data-z="approve" data-id="${i.id}">Duyệt nội dung</button>` : i.requiresUserApproval ? '<span class="pill teal">Đã duyệt</span>' : ''}
      ${i.status === 'queued' ? `<button class="btn sm" type="button" data-z="send" data-id="${i.id}">Gửi ngay</button>` : ''}
      ${i.status === 'error' ? `<button class="btn sm" type="button" data-z="retry" data-id="${i.id}">Thử lại</button>` : ''}
    </div></div>`).join('') : '<p class="muted">Không có nhiệm vụ Zalo.</p>';
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-z]');
  if (!b) return;
  await act(() => api(`/api/zalo/queue/${b.dataset.id}/${b.dataset.z}`, { body: {} }));
  state.refresh?.();
});

VIEWS.zalo = () => {
  const wrap = el(`
    <p class="kv" style="margin:0">Zalo chạy qua cầu nối local trên máy tính của bạn, dùng chính ứng dụng Zalo của bạn. Văn phòng là nguồn sự thật; cầu nối chỉ gửi, nhận và trả biên nhận.</p>
    ${state.me.trial ? '<p class="notice">Bản trải nghiệm: hàng chờ, duyệt nội dung và mã liên kết hoạt động đầy đủ, nhưng cầu nối chỉ nối được với bản server, nên worker luôn "Đã tắt" và lệnh gửi bị từ chối, đúng như quy tắc khi worker tắt.</p>' : ''}
    <div class="card" id="worker"></div>
    <div class="card stack"><div class="row between"><h3>Mã liên kết cầu nối</h3><button id="newCode" class="btn sm gold" type="button">Tạo mã (30 phút, dùng 1 lần)</button></div>
      <div id="codes" class="stack" style="gap:6px"></div><button id="revokeBridges" class="btn sm danger" type="button">Ngắt mọi cầu nối đã liên kết</button></div>
    <div class="eyebrow">Nhiệm vụ</div><div id="queue" class="stack"></div>`);
  $('#newCode', wrap).onclick = async () => { await act(() => api('/api/zalo/link-codes', { body: {} })); refresh(); };
  $('#revokeBridges', wrap).onclick = async () => { if (await askConfirm('Ngắt mọi cầu nối Zalo đã liên kết?', 'Ngắt')) { await act(() => api('/api/zalo/bridges/revoke', { body: {} })); refresh(); } };
  wrap.addEventListener('click', async (e) => {
    const r = e.target.closest('[data-revoke]');
    if (r) { await act(() => api(`/api/zalo/link-codes/${r.dataset.revoke}/revoke`, { body: {} })); refresh(); }
  });
  async function refresh() {
    const d = await api('/api/zalo');
    $('#worker', wrap).innerHTML = `<div class="row between"><b>Cầu nối Zalo</b><span class="pill ${d.worker.online ? 'teal' : 'red'}"><i class="dot"></i>${d.worker.online ? 'Đang chạy' : 'Đã tắt'}</span></div><div class="kv">Lần cuối thấy: ${esc(fmtTime(d.worker.lastSeenAt))}</div>`;
    $('#codes', wrap).innerHTML = d.linkCodes.map((c) => {
      const st = c.revoked ? 'đã thu hồi' : c.usedAt ? 'đã dùng' : Date.now() > Date.parse(c.expiresAt) ? 'hết hạn' : 'còn hiệu lực';
      return `<div class="row kv"><code class="grow" style="color:var(--text)">${esc(c.code)}</code><span>${st} · hết hạn ${esc(fmtClock(c.expiresAt))}</span>${st === 'còn hiệu lực' ? `<button class="btn sm" type="button" data-revoke="${esc(c.code)}">Thu hồi</button>` : ''}</div>`;
    }).join('') || '<p class="muted" style="margin:0">Chưa có mã.</p>';
    $('#queue', wrap).innerHTML = zaloItems(d.queue);
  }
  mount(wrap, refresh);
};

// ---------- Báo cáo ----------
VIEWS.reports = () => {
  const wrap = el(`
    <p class="kv" style="margin:0">Lúc 21:00 (giờ Việt Nam), Chi chuẩn bị đề xuất chăm sóc khách (chờ bạn duyệt, không tự gửi) và Phúc tổng hợp báo cáo toàn văn phòng.
    ${state.me.trial ? 'Ở bản trải nghiệm, văn phòng nhắc bạn tạo báo cáo khi đến giờ.' : 'Server tự tạo cho văn phòng có hoạt động trong ngày.'}</p>
    <button class="btn gold" type="button" id="mkReport">Tạo báo cáo ngay</button>
    <div id="reports" class="stack"></div>`);
  $('#mkReport', wrap).onclick = async () => { await act(() => api('/api/reports', { body: {} }), 'Đang tạo báo cáo…'); refresh(); };
  async function refresh() {
    const d = await api('/api/reports');
    $('#mkReport', wrap).disabled = d.generating;
    $('#reports', wrap).innerHTML = (d.generating ? '<p class="typing">Chi và Phúc đang làm báo cáo…</p>' : '') + (d.reports.length ? d.reports.map((r) => `
      <div class="card stack">
        <div class="row between"><h3>Báo cáo ${esc(r.date)}</h3><span class="pill ${r.trigger === 'schedule' ? 'gold' : ''}">${r.trigger === 'schedule' ? 'Tự động 21:00' : 'Tạo tay'}</span></div>
        <div class="kv">${esc(fmtTime(r.createdAt))}</div>
        ${r.summary ? `<div class="msg staff"><div class="who">Phúc — tổng hợp</div><div class="body">${esc(r.summary)}</div><div class="brain">Bộ não: ${esc(r.brainLabel)}</div></div>` : ''}
        ${r.cskhText ? `<div class="msg staff"><div class="who">Chi — đề xuất chăm sóc khách (chờ duyệt)</div><div class="body">${esc(r.cskhText)}</div><div class="brain">Bộ não: ${esc(r.cskhBrain)}</div></div>` : ''}
        ${r.error ? `<div class="error">Bộ não lỗi, phần này chưa có: ${esc(r.error)}</div>` : ''}
        ${!r.summary && !r.cskhText && !r.error ? '<p class="typing">Đang tạo…</p>' : ''}
      </div>`).join('') : '<p class="muted">Chưa có báo cáo.</p>');
  }
  mount(wrap, refresh);
};

// ---------- Liên kết phần mềm (toàn văn phòng) ----------
VIEWS.links = () => {
  const wrap = el(`<p class="kv" style="margin:0">Tất cả liên kết phần mềm của văn phòng. Thêm liên kết trong trang của từng nhân viên (mục Phần mềm).</p>
    <div class="chips">${state.staff.map((s) => `<button class="chip" type="button" data-addlink="${s.id}">+ ${esc(s.name)}</button>`).join('')}</div>
    <div id="allLinks" class="stack"></div>`);
  wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-addlink]'); if (b) { state.sub = 'software'; openView('staff', b.dataset.addlink); } });
  const refresh = async () => { $('#allLinks', wrap).innerHTML = linkCards((await api('/api/staff')).flatMap((s) => s.softwareLinks), true); };
  bindLinkActions($('#allLinks', wrap), refresh);
  let done = false;
  mount(wrap, async () => { if (!done) { done = true; await refresh(); } });
};

// ---------- Chi tiết văn phòng ----------
VIEWS.overview = () => {
  const wrap = el('<div id="ovBody" class="stack"></div>');
  mount(wrap, async () => {
    const o = state.overview;
    const byStatus = {};
    for (const s of state.staff) (byStatus[statusOf(s)] ||= []).push(s.name);
    const taskBy = {};
    for (const t of state.tasks) taskBy[t.status] = (taskBy[t.status] || 0) + 1;
    $('#ovBody', wrap).innerHTML = `
      <div class="stat-grid">
        <div class="stat"><b>${state.staff.length}</b>nhân sự</div><div class="stat"><b>${o.openTasks ?? 0}</b>việc đang mở</div>
        <div class="stat"><b>${o.slips ?? 0}</b>phiếu bán</div><div class="stat"><b>${o.zaloQueued ?? 0}</b>Zalo đang chờ</div>
      </div>
      <section class="card stack"><h3>Nhân viên theo trạng thái</h3>
        ${Object.entries(STATUS).map(([k, v]) => `<div class="row between">${statusHtml(k)}<span class="kv">${esc((byStatus[k] || []).join(', ') || '—')}</span></div>`).join('')}</section>
      <section class="card stack"><h3>Việc theo trạng thái</h3>
        ${Object.entries(TASK_STATUS).filter(([k]) => taskBy[k]).map(([k, v]) => `<div class="row between"><span class="pill ${TASK_TONE[k] || ''}">${v}</span><b>${taskBy[k]}</b></div>`).join('') || '<p class="muted">Chưa có việc.</p>'}</section>
      <section class="card stack"><h3>Kênh và liên kết</h3>
        <div class="row between"><span>Tin nhắn chat nhóm</span><b>${o.groupMessages ?? 0}</b></div>
        <div class="row between"><span>Liên kết phần mềm</span><b>${o.softwareLinks ?? 0}</b></div>
        <div class="row between"><span>Zalo lỗi</span><b>${o.zaloError ?? 0}</b></div></section>`;
  });
};

VIEWS.more = () => {
  mount(el(`<div class="menu-list">
    ${[['tasks', 'Họp / Việc chung'], ['links', 'Liên kết phần mềm'], ['zalo', 'Hàng chờ Zalo'], ['overview', 'Chi tiết văn phòng'], ['settings', 'Cài đặt văn phòng']]
      .map(([v, n]) => `<button class="btn" type="button" data-go="${v}">${n}</button>`).join('')}</div>`));
};
document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) openView(g.dataset.go); });

// ---------- Cài đặt ----------
VIEWS.settings = () => {
  if (state.me.trial) return trialSettings();
  const cd = state.me.claudeDefault;
  const wrap = el(`
    <section class="card stack"><h3>Bộ não mặc định</h3>
      <p class="kv" style="margin:0">Nhân viên chưa gắn API riêng dùng Claude <code>${esc(cd.model)}</code> do server cung cấp.</p>
      <span class="pill ${cd.configured ? 'teal' : 'red'}" style="justify-self:start">${cd.configured ? 'Server đã cấu hình' : 'Server CHƯA cấu hình ANTHROPIC_API_KEY'}</span></section>
    <div class="eyebrow">API mặc định của công ty</div>
    <p class="kv" style="margin:0">Dùng cho mọi nhân viên chưa có API riêng hoạt động, ưu tiên trước Claude mặc định của server.</p>
    <div id="companyApi" class="stack"></div>
    <form class="card form" id="accForm"><h3>Tài khoản</h3>
      <label>Tên văn phòng <input name="officeName" value="${esc(state.me.officeName)}"></label>
      <label>Tên công ty (nhân viên dùng trong câu trả lời) <input name="companyName" value="${esc(state.me.companyName)}"></label>
      <label>Mật khẩu hiện tại <input name="currentPassword" type="password" autocomplete="current-password"></label>
      <label>Mật khẩu mới <input name="newPassword" type="password" autocomplete="new-password"></label>
      <button class="btn gold" type="submit">Lưu</button></form>
    <form class="card form" id="delForm"><h3>Xoá văn phòng</h3>
      <p class="kv" style="margin:0">Xoá vĩnh viễn tài khoản cùng toàn bộ nhân sự, key API, việc, phiếu bán và hàng chờ Zalo. Không khôi phục được.</p>
      <label>Nhập mật khẩu để xác nhận <input name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn danger" type="submit">Xoá vĩnh viễn văn phòng này</button></form>`);
  $('#delForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!await askConfirm('Xoá vĩnh viễn văn phòng này? Không khôi phục được.', 'Xoá vĩnh viễn')) return;
    if (await act(() => api('/api/me', { method: 'DELETE', body: { password: e.target.password.value } }))) showAuth('Đã xoá văn phòng.');
  });
  $('#accForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api('/api/me', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }), 'Đã lưu.')) {
      e.target.currentPassword.value = e.target.newPassword.value = '';
      await loadMe();
    }
  });
  mount(wrap, apiConfigEditor('company', $('#companyApi', wrap), 'API công ty'));
};

// Bản trải nghiệm: không mật khẩu (đăng nhập bằng tài khoản claude.ai), không gắn API ngoài.
function trialSettings() {
  const wrap = el(`
    <section class="card gold stack"><h3>Bản trải nghiệm</h3>
      <p class="kv" style="margin:0">Văn phòng này chạy trong Claude: bộ não của mọi nhân viên là Claude qua tài khoản claude.ai của bạn (dùng hạn mức của tài khoản, lần đầu sẽ hỏi bạn cho phép). Dữ liệu lưu riêng cho tài khoản của bạn.</p>
      <p class="kv" style="margin:0">Gắn API riêng cho từng nhân viên, mã truy cập phần mềm đầy đủ và cầu nối Zalo chỉ có ở bản server (khi đưa ra ngoài).</p></section>
    <form class="card form" id="accForm"><h3>Tài khoản</h3>
      <label>Tên văn phòng <input name="officeName" value="${esc(state.me.officeName)}"></label>
      <label>Tên công ty (nhân viên dùng trong câu trả lời) <input name="companyName" value="${esc(state.me.companyName)}"></label>
      <button class="btn gold" type="submit">Lưu</button></form>
    <form class="card form" id="delForm"><h3>Xoá dữ liệu văn phòng</h3>
      <p class="kv" style="margin:0">Xoá toàn bộ việc, tin nhắn, phiếu, hàng chờ và đào tạo; văn phòng trở về trạng thái ban đầu.</p>
      <button class="btn danger" type="submit">Xoá và làm lại từ đầu</button></form>`);
  $('#accForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api('/api/me', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }), 'Đã lưu.')) await loadMe();
  });
  $('#delForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!await askConfirm('Xoá toàn bộ dữ liệu văn phòng và làm lại từ đầu?', 'Xoá dữ liệu')) return;
    if (await act(() => api('/api/me', { method: 'DELETE', body: {} }), 'Đã xoá dữ liệu.')) { await loadMe(); await refreshAll(); openView('staff', 'STAFF-007'); }
  });
  mount(wrap, null);
}

// ---------- Văn phòng 3D, nhạc, họp ----------
function setupStage() {
  $('#presets').innerHTML = PRESETS.map((p, i) => `<button type="button" class="chip dark ${i === 0 ? 'active' : ''}" data-preset="${p.id}">${p.label}</button>`).join('');
  $('#zoneChips').innerHTML = PRESETS.map((p) => `<button type="button" class="chip" data-preset="${p.id}">${p.label}</button>`).join('');
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    state.office?.goPreset(b.dataset.preset);
    for (const c of $$('#presets .chip')) c.classList.toggle('active', c.dataset.preset === b.dataset.preset);
    if (b.closest('#drawer') && !desktop.matches) closeDrawer();
  });
  $('#camReset').onclick = () => { state.office?.goPreset('all'); for (const c of $$('#presets .chip')) c.classList.toggle('active', c.dataset.preset === 'all'); };
  $('#camPan').onclick = (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', on); e.currentTarget.classList.toggle('on', on);
    state.office?.setPan(on);
    $('#stageHint').textContent = on ? 'Đang ở chế độ kéo để di chuyển' : 'Chạm nhân viên để mở chi tiết · kéo để xoay';
  };
  $('#stageFull').onclick = enterImmersive;
  $('#stageExit').onclick = exitImmersive;
  $('#enterBtn').onclick = () => { enterImmersive(); startMusic(); };

  $('#musicSel').innerHTML = MUSIC_PRESETS.map((m) => `<option value="${m.id}">${m.label}</option>`).join('');
  $('#musicBtn').onclick = () => (state.music.isPlaying() ? stopMusic() : startMusic());
  $('#musicSel').onchange = () => { if (state.music.isPlaying()) startMusic(); };

  $('#meetingBtn').onclick = () => {
    state.meeting = !state.meeting;
    state.office?.setMeeting(state.meeting);
    $('#meetingBtn').textContent = state.meeting ? 'Kết thúc họp' : 'Gọi toàn nhân viên họp';
    if (state.meeting) { state.office?.goPreset('meeting'); openView('tasks', 'meeting'); }
  };
}
async function startMusic() {
  try { await state.music.play($('#musicSel').value); $('#musicBtn').textContent = '■ Dừng nhạc'; }
  catch { toast('Trình duyệt chưa cho phát âm thanh. Bấm Phát lần nữa.'); }
}
function stopMusic() { state.music.stop(); $('#musicBtn').textContent = '▶ Phát'; }
function enterImmersive() {
  $('#stage').classList.add('immersive');
  $('#stageExit').classList.remove('hidden');
  $('#stage').requestFullscreen?.().catch(() => {});
  setTimeout(() => state.office?.resize(), 50);
}
function exitImmersive() {
  $('#stage').classList.remove('immersive');
  $('#stageExit').classList.add('hidden');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  setTimeout(() => state.office?.resize(), 50);
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && $('#stage').classList.contains('immersive')) exitImmersive(); });

function paintOffice() {
  if (!state.office) return;
  const states = {};
  for (const s of state.staff) states[s.id] = { status: statusOf(s), said: state.activity.said?.[s.id] || null };
  state.office.update(states);
  state.office.setDebating(state.tasks.filter((t) => t.status === 'debating').flatMap((t) => t.assigneeIds));
}

// ---------- Tải dữ liệu ----------
async function loadMe() {
  state.me = await api('/api/me');
  $('#officeName').textContent = state.me.officeName;
  document.title = `${state.me.officeName} — Văn phòng ảo`;
  $('#logoutBtn').classList.toggle('hidden', !!state.me.trial);
  $('#sessionState').textContent = state.me.trial ? 'Bản trải nghiệm' : `Đã đăng nhập · ${state.me.username}`;
}
async function loadStaff() {
  state.staff = await api('/api/staff');
  state.office?.setStaff(state.staff);
  if (state.me) { renderDrawer(); renderHero(); paintOffice(); } // đổi trạng thái / hồ sơ thì danh sách và 3D cập nhật ngay
}
async function loadTasks() { state.tasks = await api('/api/tasks'); }
async function loadActivity() {
  const a = await api('/api/activity').catch(() => null);
  if (!a) return;
  state.activity = { working: a.working || [], said: a.said || {} };
  const warn = a.storageWarning || state.me?.storageWarning || '';
  $('#notice').textContent = warn; $('#notice').classList.toggle('hidden', !warn);
  if (a.reportDue && state.reportNagged !== new Date().toDateString()) {
    state.reportNagged = new Date().toDateString();
    toast('Đã đến giờ báo cáo cuối ngày 21:00. Mở mục Báo cáo và bấm "Tạo báo cáo ngay".', 9000);
  }
}
async function refreshAll() {
  const [, , overview] = await Promise.all([loadTasks(), loadActivity(), api('/api/overview').catch(() => state.overview), loadStaff()]);
  state.overview = overview || {};
  renderHero(); renderDrawer(); paintOffice();
}

async function boot() {
  try { await loadMe(); } catch { return showAuth(); }
  $('#auth').classList.add('hidden');
  $('#app').classList.remove('hidden');
  if (!state.office) {
    setupStage();
    try {
      state.office = createOffice($('#office3d'), { onSelect: (id) => openView('staff', id), companyName: state.me.companyName });
    } catch (e) {
      $('#office3d').innerHTML = `<p class="muted" style="padding:16px">Không khởi tạo được đồ hoạ 3D trên trình duyệt này (${esc(e.message)}). Các mục khác vẫn dùng bình thường.</p>`;
    }
  }
  await refreshAll();
  if (desktop.matches || state.view) openView(state.view || 'staff', state.viewArg || 'STAFF-007');
  loadWeather();
  clearInterval(state.poll);
  state.poll = setInterval(async () => {
    if (document.hidden) return;
    try {
      await Promise.all([loadTasks(), loadActivity(), api('/api/overview').then((o) => { state.overview = o; }), loadStaff()]);
      renderHero(); renderDrawer(); paintOffice();
      await state.refresh?.();
    } catch { /* 401 đã được xử lý trong api() */ }
  }, 3000);
}
desktop.addEventListener('change', () => { if (desktop.matches && !state.view) openView('staff', 'STAFF-007'); state.office?.resize(); });

tickClock();
setInterval(tickClock, 1000);
setInterval(loadWeather, 15 * 60 * 1000);
boot();
