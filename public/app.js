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
  open: 'Mới giao', in_progress: 'Đang làm', debating: 'Đang phản biện', stopped_by_manager: 'Quản lý đã dừng',
  waiting_user: 'Chờ người dùng', done: 'Đã xong', returned_for_redo: 'Trả làm lại',
};
const TASK_TONE = { done: 'teal', stopped_by_manager: 'red', returned_for_redo: 'red', debating: 'orange', in_progress: 'orange', open: 'gold', waiting_user: 'gold' };
const WAREHOUSE = { pending: 'Chờ Kho nhận', stock_checked: 'Đã rà tồn', preparing: 'Đang chuẩn bị', delivered: 'Đã giao', delivery_photo_recorded: 'Đã ghi ảnh giao hàng' };
const WAREHOUSE_NEXT = { pending: 'stock_checked', stock_checked: 'preparing', preparing: 'delivered', delivered: 'delivery_photo_recorded' };
const PHASE_TITLES = {
  propose: 'Vòng 1 — Đề xuất độc lập', critique: 'Vòng 2 — Phản biện chéo', revise: 'Vòng 3 — Bảo vệ và sửa kế hoạch',
  score: 'Vòng 4 — Chấm lại kế hoạch đã sửa', judge: 'Phúc chọn ý tưởng tốt nhất',
};
const COLOR_CHOICES = ['#f2a516', '#e2645a', '#c03fd6', '#e23b3b', '#7fa6f0', '#c78ae6', '#5fcf7e', '#2fd1b4', '#1f9bb5', '#7a3fe0', '#f07fb0', '#9aa64a'];
const ACTIVE_TASK = new Set(['open', 'debating', 'in_progress', 'returned_for_redo', 'waiting_user']);

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
// Việc làm thực tế: chỉ người đang tới lượt mới tính là đang có việc.
const activeTasksOf = (id) => state.tasks.filter((t) => ACTIVE_TASK.has(t.status) && (t.isReal ? t.nowStaffId === id : involves(t, id)));

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
  settings: 'Cài đặt văn phòng', links: 'Liên kết phần mềm', overview: 'Chi tiết văn phòng', more: 'Thêm', requests: 'Nhân viên chờ bạn',
  fanpage: 'Vận hành Fanpage',
};
const VIEWS = {};

function openView(view, arg = null) {
  state.view = view; state.viewArg = arg;
  state.taskDetail = view === 'tasks' && arg && arg !== 'new' && arg !== 'meeting' ? arg : null;
  $('#sheetTitle').textContent = view === 'staff' ? `${staffById(arg)?.name} — ${staffById(arg)?.role}` : VIEW_TITLES[view] || 'Chi tiết';
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
      ${m.postId ? `<img class="post-img" data-post-img="${esc(m.postId)}" alt="Ảnh thiết kế của bài đăng" width="1080" height="1080">` : ''}
      ${m.brainLabel ? `<div class="brain">Bộ não đã suy nghĩ câu này: ${esc(m.brainLabel)}</div>` : ''}
    </div>`).join('') + (busy ? '<div class="typing">Nhân viên đang suy nghĩ…</div>' : '');
}

// Ảnh thiết kế của bài đăng: tải một lần rồi giữ trong bộ nhớ trang.
const postImgCache = new Map();
function loadPostImages(root) {
  for (const img of root.querySelectorAll('img[data-image-id]')) {
    const id = img.dataset.imageId;
    const key = `img:${id}`;
    if (postImgCache.has(key)) { const v = postImgCache.get(key); if (typeof v === 'string') img.src = v; continue; }
    postImgCache.set(key, api(`/api/images/${id}`).then((r) => {
      postImgCache.set(key, r.dataUrl || '');
      for (const x of document.querySelectorAll(`img[data-image-id="${id}"]`)) if (r.dataUrl) x.src = r.dataUrl; else x.remove();
    }).catch(() => postImgCache.delete(key)));
  }
  for (const img of root.querySelectorAll('img[data-post-img]')) {
    const id = img.dataset.postImg;
    if (postImgCache.has(id)) { const v = postImgCache.get(id); if (typeof v === 'string') img.src = v; continue; }
    postImgCache.set(id, api(`/api/fanpage/posts/${id}/image`).then((r) => {
      postImgCache.set(id, r.dataUrl || '');
      for (const x of document.querySelectorAll(`img[data-post-img="${id}"]`)) if (r.dataUrl) x.src = r.dataUrl; else x.remove();
    }).catch(() => postImgCache.delete(id)));
  }
}

function chatList(channel, container, autoScroll = true) {
  let lastCount = -1;
  return async () => {
    const d = await api(`/api/messages/${encodeURIComponent(channel)}`);
    const sheet = $('#sheet');
    const atBottom = sheet.scrollTop + sheet.clientHeight >= sheet.scrollHeight - 60;
    container.innerHTML = renderMessages(d.messages, d.busy);
    loadPostImages(container);
    if (autoScroll && d.messages.length !== lastCount && (atBottom || lastCount === -1)) sheet.scrollTop = sheet.scrollHeight;
    lastCount = d.messages.length;
  };
}

// ---------- Nhân viên: hồ sơ + xem trực tiếp + cài đặt ----------
const SUBS = [['chat', 'Hỏi riêng'], ['tasks', 'Việc'], ['profile', 'Thông tin'], ['training', 'Đào tạo'], ['software', 'Phần mềm'], ['auto', 'Lịch tự động'], ['brain', 'Bộ não / API'], ['consult', 'Tham vấn'], ['zalo', 'Zalo']];

VIEWS.staff = (id) => {
  const s = staffById(id);
  if (!s) return mount('<p class="muted">Chọn một nhân viên.</p>');
  const wrap = el(`
    <section class="profile">
      ${avatar(s)}
      <div class="grow">
        <h3>${esc(s.name)} <span class="role">— ${esc(s.role)}</span></h3>
        <div class="lines" id="pLines"></div>
      </div>
    </section>
    <div class="sig-card" title="Chữ ký số trên phiếu bán hàng: ký kèm ngày giờ, dấu V mờ dưới chữ ký">Mã ký riêng: <b>${esc(s.signCode)}</b><span class="v" aria-hidden="true">V</span></div>
    <div class="chips tight" id="statusChips" aria-label="Đổi trạng thái nhanh">${Object.entries(STATUS).map(([k, v]) => `<button type="button" class="chip sm" data-st="${k}">${v}</button>`).join('')}</div>
    <p class="kv" id="statusNote" style="margin:0"></p>
    <details class="card gold live" id="live" aria-live="polite"></details>
    <div class="seg" role="tablist" aria-label="Cài đặt và làm việc với ${esc(s.name)}">${SUBS.map(([k, n]) => `<button type="button" role="tab" class="chip sm ${state.sub === k ? 'active' : ''}" aria-selected="${state.sub === k}" data-sub="${k}">${n}</button>`).join('')}</div>
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
  const subRefresh = ({ chat: subChat, tasks: subTasks, training: subTraining, brain: subBrain, software: subSoftware, auto: subAuto, consult: subConsult, zalo: subZalo, profile: subProfile }[state.sub] || subChat)(s, body);

  function paintHead() {
    const cur = staffById(id);
    const st = statusOf(cur);
    const n = activeTasksOf(id).length;
    $('#pLines', wrap).innerHTML = `${statusHtml(st)}<span>· ${n ? `Đang xử lý ${n} việc` : 'Chưa có việc đang mở'}</span><span>· Đào tạo v${cur.trainingVersion}${cur.autoLearn ? ' (tự học)' : ''}</span><span>· Bộ não: ${esc(cur.currentBrain.label)}</span>`;
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
  let userToggled = false;
  box.addEventListener('click', (e) => {
    if (e.target.closest('summary')) userToggled = true;
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
      box.innerHTML = `<summary><h3>Xem trực tiếp</h3><span class="grow kv">Chưa có việc</span>${statusHtml(statusOf(s))}</summary>
        <p class="muted" style="margin:10px 0 0">${esc(s.name)} chưa có việc nào. Giao việc riêng ở mục "Việc", hoặc giao việc chung cho cả nhóm.</p>`;
      return;
    }
    let steps = [];
    let detail = null;
    if (task.kind === 'general' && !(task.planSteps || []).length) {
      detail = await api(`/api/tasks/${task.id}`).catch(() => null);
      const turns = detail?.session?.turns || [];
      const real = detail?.real;
      const phases = id === 'STAFF-007' && !task.assigneeIds.includes(id) ? ['judge'] : ['propose', 'critique', 'revise', 'score', ...(id === 'STAFF-007' ? ['judge'] : [])];
      steps = real ? [
        ...real.log.filter((x) => x.staffId === id).map((x) => ({ title: x.what, sub: '', done: true, label: 'Đã làm' })),
        ...(real.current?.staffId === id ? [{ title: `Bây giờ: ${REAL_TITLE[real.current.key]}`, sub: 'Mở việc để làm', done: false }] : []),
      ] : phases.map((p) => {
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
    if (!userToggled) box.open = active;
    box.innerHTML = `
      <summary><h3>Xem trực tiếp</h3><span class="grow kv live-sum">${esc(task.title)}${steps.length ? ` · ${doneN}/${steps.length} bước` : ''}</span><span class="pill ${tone}"><i class="dot"></i>${esc(TASK_STATUS[task.status])}</span></summary>
      <div class="stack" style="margin-top:12px;gap:10px">
      <p style="margin:0">Việc ${active ? 'đang làm' : 'gần nhất'}: <b>${esc(task.title)}</b></p>
      ${task.status === 'waiting_user' ? `<p class="notice" style="margin:0">${esc(s.name)} đang chờ bạn trả lời / duyệt. <button type="button" class="link-btn" data-task="${task.id}">Mở việc để trả lời</button></p>` : ''}
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
      <button type="button" class="btn sm" data-task="${task.id}">Mở toàn bộ việc</button></div>`;
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

// Người hỏi được về một việc: người được giao, người làm từng bước, và Phúc với việc chung (khớp shared/taskqa.js).
function taskPeople(t) {
  const ids = [...new Set([...t.assigneeIds, ...(t.planSteps || []).map((p) => p.staffId), ...(t.outputs || []).map((o) => o.staffId)].filter(Boolean))];
  if (t.kind === 'general' && !ids.includes('STAFF-007')) ids.push('STAFF-007');
  return ids;
}
// Thanh hỏi dưới mỗi việc: hỏi thẳng người đang làm việc đó; câu trả lời hiện trong trang việc.
function askBar(t, compact = true) {
  const people = taskPeople(t);
  return `<form class="ask-bar ${compact ? 'compact' : ''}" data-ask="${t.id}">
    <select name="staffId" aria-label="Hỏi ai">${people.map((id) => `<option value="${id}">${esc(nameOf(id))}</option>`).join('')}</select>
    <input name="question" autocomplete="off" aria-label="Câu hỏi về việc ${esc(t.title)}" placeholder="Hỏi về việc này…" maxlength="4000">
    <button class="btn gold sm" type="submit">Hỏi</button>
  </form>`;
}
// Danh sách tự làm mới mỗi 3 giây: không vẽ lại khi bạn đang gõ câu hỏi dở.
const typingAsk = (box) => [...box.querySelectorAll('.ask-bar input')].some((i) => i.value || i === document.activeElement);
document.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-ask]');
  if (!f) return;
  e.preventDefault();
  const question = f.question.value.trim();
  if (!question) return;
  const r = await act(() => api(`/api/tasks/${f.dataset.ask}/ask`, { body: { question, staffId: f.staffId.value } }));
  if (!r) return;
  f.question.value = '';
  if (state.taskDetail !== f.dataset.ask) openView('tasks', f.dataset.ask);
  else state.refresh?.();
});

function taskCard(t) {
  const steps = t.planSteps?.length ? t.planSteps.length : null;
  const done = steps ? t.planSteps.filter((p) => t.outputs.some((o) => o.key === p.key && !o.error)).length : null;
  const people = taskPeople(t);
  return `<div class="card clickable stack" style="gap:10px" role="button" tabindex="0" data-task="${t.id}" aria-label="Mở việc ${esc(t.title)}">
    <div class="row between"><b class="grow">${esc(t.title)}</b><span class="pill ${TASK_TONE[t.status] || ''}"><i class="dot"></i>${esc(TASK_STATUS[t.status] || t.status)}</span></div>
    <div class="row">${people.slice(0, 6).map((id) => avatar(staffById(id), 'sm')).join('')}<span class="kv">${t.kind === 'general' ? 'Việc chung' : 'Việc riêng'} · ${esc(fmtTime(t.createdAt))}</span></div>
    ${steps ? `<div class="progress"><i style="width:${Math.round((done / steps) * 100)}%"></i></div>` : ''}
    ${t.lastError ? `<div class="error" style="font-size:13px">${esc(t.lastError)}</div>` : ''}
    ${askBar(t)}
  </div>`;
}
function openTaskFrom(e) {
  if (e.target.closest('.ask-bar')) return;
  const c = e.target.closest('[data-task]');
  if (c && $('#panel').contains(c) && c.classList.contains('card')) openView('tasks', c.dataset.task);
}
document.addEventListener('click', openTaskFrom);
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.card[data-task]') && !e.target.closest('.ask-bar')) { e.preventDefault(); openTaskFrom(e); } });

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
    if (typingAsk($('#taskList', body))) return;
    $('#taskList', body).innerHTML = list.length ? list.map(taskCard).join('') : '<p class="muted">Chưa có việc.</p>';
  };
}

// Các mục đào tạo (khớp shared/staffkit.js). Mỗi mục là một ô gập để cả bảng vừa một màn hình.
const TRAINING_FIELDS = [
  ['prompt', 'Prompt riêng', 'Bạn là ai, làm cho ai, mục tiêu chính.'],
  ['skills', 'Kỹ năng chuyên môn', 'Những việc nhân sự giỏi và làm hằng ngày.'],
  ['workGuide', 'Hướng dẫn làm việc', 'Nhiệm vụ và quy trình phụ trách, theo thứ tự.'],
  ['jobDescription', 'Mô tả công việc', 'Phải làm gì, khi nào, ra sản phẩm gì.'],
  ['crossLinks', 'Kết nối chéo', 'Nhận việc từ ai, chuyển cho ai, phản biện thế nào.'],
  ['rules', 'Quy tắc đúng / sai', 'Điều bắt buộc và điều cấm.'],
  ['goodExamples', 'Ví dụ mẫu TỐT', 'Làm thế này là đúng.'],
  ['badExamples', 'Ví dụ mẫu SAI', 'Tránh làm thế này.'],
  ['limits', 'Giới hạn — chuyển cho chủ', 'Việc không được tự làm.'],
  ['lessons', 'Bài học tự rút ra', 'Hệ thống tự thêm sau mỗi việc; sửa hoặc xoá được.'],
];
const compileTraining = (t) => TRAINING_FIELDS.filter(([k]) => String(t?.[k] || '').trim()).map(([k, label]) => `[${label}]\n${String(t[k]).trim()}`).join('\n\n');
const lineCount = (v) => String(v || '').split('\n').filter((x) => x.trim()).length;

function subTraining(s, body) {
  const t = s.training || { prompt: s.trainingText };
  body.innerHTML = `
    <form class="card form tight" id="trainForm">
      <div class="row between"><h3>Đào tạo riêng</h3><span class="pill gold">Đang dùng v${s.trainingVersion}</span></div>
      <p class="kv" style="margin:0">Mọi câu trả lời của ${esc(s.name)} dùng bản mới nhất. ${s.autoLearn ? `Sau mỗi việc, Trang (Nhân sự) đọc kết quả và lời phản biện rồi ghi bài học vào mục cuối.` : 'Tự học đang tắt (bật ở mục Thông tin).'}</p>
      <div class="acc">${TRAINING_FIELDS.map(([k, label, hint], i) => `
        <details ${i === 0 ? 'open' : ''}>
          <summary><span>${esc(label)}</span><small>${lineCount(t[k]) ? `${lineCount(t[k])} dòng` : 'trống'}</small></summary>
          <textarea name="${k}" aria-label="${esc(label)}" placeholder="${esc(hint)}">${esc(t[k] || '')}</textarea>
        </details>`).join('')}</div>
      <button class="btn gold" type="submit">Lưu đào tạo (thành v${s.trainingVersion + 1})</button>
    </form>
    <details class="card fold">
      <summary><h3>Lịch sử đào tạo</h3><small>${s.trainingHistory?.length || 0} bản cũ</small></summary>
      ${s.trainingHistory?.length ? `<div class="history">${s.trainingHistory.map((h) => `
        <div class="item"><span class="pill">v${h.version}</span><span class="grow kv">${esc(h.note || '')} · ${esc(fmtTime(h.at))}</span>
          <button class="btn sm" type="button" data-view="${h.version}">Xem</button><button class="btn sm outline" type="button" data-restore="${h.version}">Khôi phục</button></div>
        <div class="detail-box open hidden" data-text="${h.version}">${esc(compileTraining(h.training) || h.text || '')}</div>`).join('')}</div>` : '<p class="muted">Chưa có phiên bản cũ. Bản cũ được giữ lại mỗi khi lưu đào tạo mới (kể cả khi tự học).</p>'}
    </details>`;
  $('#trainForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const training = Object.fromEntries(TRAINING_FIELDS.map(([k]) => [k, e.target[k].value]));
    if (await act(() => api(`/api/staff/${s.id}/training`, { method: 'PUT', body: { training } }), 'Đã lưu đào tạo.')) { await loadStaff(); VIEWS.staff(s.id); }
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
    <form class="card form tight" id="profForm">
      <h3>Thông tin cơ bản</h3>
      <div class="field-row">
        <label>Tên nhân vật <input name="name" value="${esc(s.name)}" maxlength="40" required></label>
        <label>Vai trò <input name="role" value="${esc(s.role)}" maxlength="80" required></label>
      </div>
      <div class="field-row">
        <label>Nhãn trên đầu nhân vật 3D (≤ 3 chữ) <input name="shortLabel" value="${esc(s.shortLabel)}" maxlength="18" required></label>
        <label>Công cụ được dùng <input name="tools" value="${esc(s.tools || '')}" maxlength="300" placeholder="Ví dụ: KiotViet, Fanpage, Zalo OA"></label>
      </div>
      <div class="row"><span class="kv">Màu</span>
        <div class="swatches" role="radiogroup" aria-label="Màu riêng">${COLOR_CHOICES.map((c) => `<button type="button" class="swatch ${c === s.color ? 'active' : ''}" role="radio" aria-checked="${c === s.color}" aria-label="Màu ${c}" data-color="${c}" style="background:${c}"></button>`).join('')}</div></div>
      <input type="hidden" name="color" value="${esc(s.color)}">
      <label class="check"><input type="checkbox" name="autoLearn" ${s.autoLearn ? 'checked' : ''}> Tự học sau mỗi việc (Trang ghi bài học vào đào tạo, tạo phiên bản mới)</label>
      <button class="btn gold" type="submit">Lưu thông tin</button>
    </form>
    <details class="card fold">
      <summary><h3>Hồ sơ cố định</h3><small>${esc(s.id)} · ${esc(GROUP_NAME[s.group] || s.group)}</small></summary>
      <dl class="facts">
        <dt>Nhóm</dt><dd>${esc(GROUP_NAME[s.group] || s.group)}</dd>
        <dt>Chỗ ngồi</dt><dd>${esc(s.seat.zone)} · bàn số ${s.seat.deskIndex + 1}</dd>
        <dt>Mã ký riêng</dt><dd>${esc(s.signCode)}</dd>
        <dt>Bộ não gần nhất</dt><dd>${esc(s.lastBrainLabel || '—')}</dd>
        <dt>Trách nhiệm</dt><dd>${esc(s.responsibilities)}</dd>
      </dl>
    </details>`;
  const form = $('#profForm', body);
  $('.swatches', body).addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    form.color.value = b.dataset.color;
    for (const x of $$('.swatch', body)) { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    v.autoLearn = form.autoLearn.checked;
    if (await act(() => api(`/api/staff/${s.id}/profile`, { method: 'PUT', body: v }), 'Đã lưu.')) { await loadStaff(); VIEWS.staff(s.id); }
  });
  return null;
}

// Lịch tự động: đến giờ (giờ Việt Nam) hệ thống tự giao việc cho nhân viên, chạy đủ vòng phản biện rồi tự học.
function subAuto(s, body) {
  let rows = (s.routines || []).map((r) => ({ ...r }));
  const paint = () => {
    body.innerHTML = `
      <form class="card form tight" id="autoForm">
        <div class="row between"><h3>Lịch tự động hằng ngày</h3><span class="pill">${rows.filter((r) => r.enabled).length}/${rows.length} đang bật</span></div>
        <p class="kv" style="margin:0">Đến giờ, ${esc(s.name)} tự nhận việc, làm nháp, đồng nghiệp phản biện, ra bản cuối và tự học. Báo cáo cuối ngày 21:00 cũng tự chạy. ${state.me.trial ? 'Bản trải nghiệm chỉ chạy khi trang đang mở.' : 'Bản server chạy cả khi bạn tắt trình duyệt.'}</p>
        ${rows.length ? rows.map((r, i) => `
          <div class="routine" data-i="${i}">
            <div class="row">
              <input type="time" name="time" value="${esc(r.time)}" aria-label="Giờ" required style="max-width:130px">
              <input class="grow" name="title" value="${esc(r.title)}" placeholder="Tên việc, ví dụ: Trả lời bình luận Fanpage" aria-label="Tên việc" required style="flex:1 1 180px">
              <label class="check"><input type="checkbox" name="enabled" ${r.enabled ? 'checked' : ''}> Bật</label>
              <button class="btn sm danger" type="button" data-rdel="${i}" aria-label="Xoá lịch">Xoá</button>
            </div>
            <textarea name="description" placeholder="Yêu cầu chi tiết (dùng dữ liệu phần mềm nào, ra kết quả gì)" aria-label="Yêu cầu chi tiết" style="min-height:64px">${esc(r.description || '')}</textarea>
            ${r.lastRunDate ? `<span class="kv">Chạy gần nhất: ${esc(r.lastRunDate)}</span>` : ''}
          </div>`).join('') : '<p class="muted" style="margin:0">Chưa có lịch. Thêm một việc lặp lại mỗi ngày.</p>'}
        <div class="row"><button class="btn sm outline" type="button" id="addRoutine">+ Thêm lịch</button><button class="btn gold sm" type="submit">Lưu lịch</button></div>
      </form>`;
    $('#addRoutine', body).addEventListener('click', () => { read(); rows.push({ time: '08:00', title: '', description: '', enabled: true }); paint(); });
    body.querySelectorAll('[data-rdel]').forEach((b) => b.addEventListener('click', () => { read(); rows.splice(Number(b.dataset.rdel), 1); paint(); }));
    $('#autoForm', body).addEventListener('submit', async (e) => {
      e.preventDefault();
      read();
      if (await act(() => api(`/api/staff/${s.id}/routines`, { method: 'PUT', body: { routines: rows } }), 'Đã lưu lịch tự động.')) { await loadStaff(); rows = (staffById(s.id).routines || []).map((r) => ({ ...r })); paint(); }
    });
  };
  const read = () => {
    for (const box of $$('.routine', body)) {
      const r = rows[Number(box.dataset.i)];
      r.time = $('[name=time]', box).value; r.title = $('[name=title]', box).value;
      r.description = $('[name=description]', box).value; r.enabled = $('[name=enabled]', box).checked;
    }
  };
  paint();
  return null;
}

// Trình quản lý API dùng chung cho nhân viên và API mặc định công ty.
function subBrain(s, body) { return apiConfigEditor(s.id, body, `Bộ não của ${s.name}`); }
const PROVIDERS_UI = {
  claude_ai: 'Claude qua tài khoản claude.ai (chọn model, không cần key)',
  anthropic: 'Claude (Anthropic) — key sk-ant-… hoặc token sk-ant-oat…',
  openai: 'OpenAI',
  openai_compatible: 'Tương thích OpenAI (Gemini, DeepSeek, OpenRouter…)',
};
const CLAUDE_MODELS = [['', 'Theo hạng mặc định của nhân viên'], ['claude-opus-5-5', 'Claude Opus 5.5'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5'], ['claude-haiku-5-5', 'Claude Haiku 5.5'], ['claude-fable-5-1', 'Claude Fable 5.1']];
const providerLabel = (p) => ({ claude_ai: 'Claude qua claude.ai', anthropic: 'Claude', openai: 'OpenAI', openai_compatible: 'Tương thích OpenAI' }[p] || p);

function apiConfigEditor(ownerId, body, title) {
  const who = ownerId === 'company' ? 'công ty' : nameOf(ownerId);
  const trial = !!state.me.trial;
  const providers = Object.entries(PROVIDERS_UI).filter(([k]) => trial || k !== 'claude_ai');
  body.innerHTML = `
    <form class="card form tight" id="cfgForm">
      <div class="row"><h3>Đính API AI riêng cho ${esc(who)}</h3><span class="pill gold" id="cfgCount">…</span></div>
      <label>Nhà cung cấp AI <select name="provider">
        <option value="">Claude mặc định — chưa gắn API riêng</option>
        ${providers.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}
      </select></label>
      <p class="kv hint" style="margin:0">Chọn một nhà cung cấp ở trên để hiện ô nhập API key cho ${esc(who)}.</p>
      <div class="pf hidden stack tight">
        <div class="field-row">
          <label>Dùng cho <select name="role">${Object.entries(ROLE_NAME).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
          <label class="p-claude hidden">Mức suy nghĩ <select name="effort"><option value="">Mặc định</option><option value="low">Thấp (nhanh)</option><option value="medium">Vừa</option><option value="high">Cao (kỹ)</option></select></label>
        </div>
        <label class="p-base hidden">Base URL <input name="baseUrl" placeholder="https://…/v1"></label>
        <label class="p-key">API key (${trial ? 'bản trải nghiệm chỉ giữ key trong trang đang mở, không lưu; tải lại trang phải nhập lại' : 'lưu mã hoá ở server'}; chỉ hiện 4 ký tự cuối)
          <input name="apiKey" type="password" autocomplete="new-password"></label>
        <label>Model <select name="model"></select></label>
        <p class="kv" id="lmStatus" style="margin:0"></p>
      </div>
      <div class="row"><button class="btn gold" type="submit" disabled>Lưu API cho ${esc(who)}</button><button class="btn outline" type="button" id="listModels" disabled>Kiểm tra API</button></div>
    </form>
    <section class="card stack tight">
      <div class="row between"><h3 id="cfgTitle">Danh sách API của ${esc(who)}</h3><button class="btn gold sm" type="button" id="addApi">+ Thêm API</button></div>
      <p class="kv" style="margin:0">Thứ tự chọn: API đúng loại việc đã kiểm tra đạt → API chung → API mặc định công ty → Claude mặc định (nhãn ghi lý do). <b>Kiểm tra chỉ liệt kê model</b>, không gửi câu hỏi thử.</p>
      <div id="cfgList" class="stack tight"></div>
    </section>`;
  const form = $('#cfgForm', body);
  const fillModels = (list) => {
    form.model.innerHTML = form.provider.value === 'claude_ai'
      ? CLAUDE_MODELS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')
      : '<option value="">— mặc định của nhà cung cấp —</option>' + (list || []).map((m) => `<option>${esc(m)}</option>`).join('');
  };
  const onProvider = () => {
    const p = form.provider.value;
    $('.pf', body).classList.toggle('hidden', !p);
    $('.hint', body).classList.toggle('hidden', !!p);
    $('.p-base', body).classList.toggle('hidden', p !== 'openai_compatible');
    $('.p-key', body).classList.toggle('hidden', p === 'claude_ai');
    $('.p-claude', body).classList.toggle('hidden', p !== 'claude_ai');
    form.apiKey.required = !!p && p !== 'claude_ai';
    for (const b of $$('button', form)) b.disabled = !p;
    $('#lmStatus', body).textContent = p === 'claude_ai' ? 'Dùng hạn mức tài khoản claude.ai của bạn. Model tài khoản không mở được thì nền tảng chạy model cùng hạng; nhãn câu trả lời ghi model thật.' : '';
    fillModels([]);
  };
  form.provider.addEventListener('change', onProvider);
  onProvider();
  $('#addApi', body).addEventListener('click', () => { form.provider.focus(); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#listModels', body).addEventListener('click', async () => {
    $('#lmStatus', body).textContent = 'Đang liệt kê model…';
    const r = await act(() => api('/api/apis/list-models', { body: { provider: form.provider.value, apiKey: form.apiKey.value, baseUrl: form.baseUrl.value } }));
    if (!r) return ($('#lmStatus', body).textContent = '');
    if (!r.ok) { $('#lmStatus', body).innerHTML = `<span class="error">Kiểm tra không đạt (nguyên văn nhà cung cấp): ${esc(r.error)}</span>`; return; }
    $('#lmStatus', body).innerHTML = `<span class="ok">Liệt kê được ${r.models.length} model. Hãy tự chọn model.</span>`;
    if (form.provider.value !== 'claude_ai') fillModels(r.models);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api(`/api/apis/${ownerId}`, { body: Object.fromEntries(new FormData(form)) }), `Đã gắn API cho ${who}.${form.provider.value === 'claude_ai' ? '' : ' Bấm "Kiểm tra" trong danh sách để liệt kê model.'}`)) {
      form.reset(); onProvider(); refresh(true); loadStaff();
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
        $(`[data-out="${id}"]`, list).innerHTML = r.ok
          ? `<span class="ok">Kiểm tra đạt: liệt kê được ${r.models.length} model.</span> <span class="kv">${esc(r.note)}</span>
             <label>Chọn model <select data-model="${id}"><option value="">— mặc định —</option>${r.models.map((m) => `<option ${m === r.config.model ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>`
          : `<span class="error">Kiểm tra không đạt (nguyên văn): ${esc(r.error)}</span>`;
        loadStaff();
      }
      b.disabled = false; b.textContent = 'Kiểm tra API';
    } else if (b.dataset.act === 'key') {
      const k = $(`[data-key="${id}"]`, list).value.trim();
      if (k && await act(() => api(`/api/api-config/${id}`, { method: 'PUT', body: { apiKey: k } }), 'Đã nhập key.')) refresh(true);
    } else if (b.dataset.act === 'toggle') {
      await act(() => api(`/api/api-config/${id}`, { method: 'PUT', body: { enabled: b.dataset.enabled !== '1' } }));
      refresh(true); loadStaff();
    } else if (b.dataset.act === 'delete') {
      if (await askConfirm('Xoá API này? Key sẽ bị xoá.', 'Xoá')) { await act(() => api(`/api/api-config/${id}`, { method: 'DELETE' })); refresh(true); loadStaff(); }
    }
  });
  list.addEventListener('change', async (e) => {
    const sel = e.target.closest('select[data-model]');
    if (sel) { await act(() => api(`/api/api-config/${sel.dataset.model}`, { method: 'PUT', body: { model: sel.value } }), 'Đã đổi model.'); loadStaff(); }
  });
  let rendered = false;
  async function refresh(force = false) {
    if (!force && rendered && (list.querySelector('select[data-model]') || typingAsk(list) || list.querySelector('input[data-key]:focus'))) return; // không xoá lựa chọn đang mở
    const cfgs = await api(`/api/apis/${ownerId}`);
    rendered = true;
    $('#cfgCount', body).textContent = cfgs.length ? `${cfgs.length} API` : 'Chưa gắn API';
    $('#cfgTitle', body).textContent = `Danh sách API của ${who} (${cfgs.length} API)`;
    list.innerHTML = cfgs.length ? cfgs.map((c) => `
      <div class="api-item stack tight">
        <div class="row between"><b>${esc(providerLabel(c.provider))} · ${esc(ROLE_NAME[c.role])}</b>
          <span class="row"><span class="pill ${c.lastCheckOk ? 'teal' : c.lastCheckAt ? 'red' : ''}">${c.lastCheckOk ? 'Kiểm tra đạt' : c.lastCheckAt ? 'Kiểm tra lỗi' : 'Chưa kiểm tra'}</span><span class="pill">${c.enabled ? 'Bật' : 'Tắt'}</span></span></div>
        <div class="kv">${c.keyLast4 ? `Key ···${esc(c.keyLast4)} · ` : ''}Model: ${esc(c.model || 'mặc định')}${c.effort ? ` · suy nghĩ ${esc(c.effort)}` : ''}${c.baseUrl ? ` · ${esc(c.baseUrl)}` : ''} · Kiểm tra lúc ${esc(fmtTime(c.lastCheckAt))}</div>
        ${c.keyInSession === false ? `<div class="row"><span class="notice grow" style="padding:6px 12px">Chưa có key trong phiên này — nhân viên đang dùng Claude dự phòng.</span><input type="password" data-key="${c.id}" aria-label="Nhập lại key" placeholder="Nhập lại key" autocomplete="new-password" style="flex:1 1 160px"><button class="btn sm" type="button" data-act="key" data-id="${c.id}">Dùng key</button></div>` : ''}
        ${c.lastProviderError ? `<div class="error" style="font-size:13px">Lỗi nhà cung cấp gần nhất (nguyên văn): ${esc(c.lastProviderError)}</div>` : ''}
        <div data-out="${c.id}"></div>
        <div class="row">
          <button class="btn sm" type="button" data-act="check" data-id="${c.id}">Kiểm tra API</button>
          <button class="btn sm" type="button" data-act="toggle" data-id="${c.id}" data-enabled="${c.enabled ? 1 : 0}">${c.enabled ? 'Tắt' : 'Bật'}</button>
          <button class="btn sm danger" type="button" data-act="delete" data-id="${c.id}">Xoá</button>
        </div>
      </div>`).join('') : `<p class="muted" style="margin:0">${esc(who)} chưa có API nào — bấm "+ Thêm API" để gắn API đầu tiên.</p>`;
  }
  return refresh;
}

const LINK_STATUS = { connected: 'Đã kết nối', expired: 'Hết hạn — cần tự đăng nhập lại', not_connected: 'Chưa kết nối' };
const LINK_KINDS = { kiotviet: 'KiotViet — sản phẩm, giá, tồn kho', facebook_page: 'Fanpage Facebook — bài đăng, tương tác', facebook_ads: 'Quảng cáo Facebook — tài khoản quảng cáo', other: 'Phần mềm khác' };
const LINK_DEFAULTS = {
  facebook_ads: { softwareName: 'Quảng cáo Facebook', url: 'https://adsmanager.facebook.com/', purpose: 'Chạy quảng cáo đã được duyệt cho Fanpage.', permissionScope: 'Tạo chiến dịch trong ngân sách đã duyệt' },
  kiotviet: { softwareName: 'KiotViet', url: 'https://www.kiotviet.vn/', purpose: 'Tra giá, tồn kho, mã hàng để trả lời khách đúng số liệu thật.', permissionScope: 'Chỉ đọc sản phẩm và tồn kho' },
  facebook_page: { softwareName: 'Fanpage', url: 'https://www.facebook.com/', purpose: 'Đọc bài đăng, lượt thích, bình luận mới để chăm sóc khách và báo cáo.', permissionScope: 'Chỉ đọc bài đăng và bình luận' },
  other: { softwareName: '', url: 'https://', purpose: '', permissionScope: '' },
};
const SECRET_LABEL = { kiotviet: 'Client Secret', facebook_page: 'Page Access Token', facebook_ads: 'Access token quảng cáo (quyền ads_management)', other: 'Mã truy cập' };
const linkTone = (st) => (st === 'connected' ? 'teal' : st === 'expired' ? 'red' : '');

function linkFields(l) {
  const k = l.kind || 'other';
  return `
    <label>Mục đích dùng <textarea name="purpose" style="min-height:56px" placeholder="Nhân viên dùng phần mềm này để làm gì">${esc(l.purpose || '')}</textarea></label>
    <div class="field-row">
      <label>Phần mềm <input name="softwareName" value="${esc(l.softwareName || '')}" required></label>
      <label>Đường dẫn mở <input name="url" value="${esc(l.url || '')}" required placeholder="https://"></label>
    </div>
    <div class="field-row">
      ${k === 'kiotviet' ? `<label>Tên gian hàng (Retailer) <input name="retailer" value="${esc(l.retailer || '')}" autocomplete="off"></label>
      <label>Client ID <input name="clientId" value="${esc(l.clientId || '')}" autocomplete="off"></label>` : ''}
      ${k === 'facebook_page' ? `<label>Page ID <input name="pageId" value="${esc(l.pageId || '')}" autocomplete="off"></label>` : ''}
      ${k === 'facebook_ads' ? `<label>Mã tài khoản quảng cáo (act_…) <input name="adAccountId" value="${esc(l.adAccountId || '')}" autocomplete="off"></label>` : ''}
      <label>Phạm vi quyền <input name="permissionScope" value="${esc(l.permissionScope || '')}" placeholder="Ví dụ: chỉ đọc"></label>
    </div>
    <label class="check"><input type="checkbox" name="accessGranted" ${l.accessGranted ? 'checked' : ''}> Cho phép ${esc(nameOf(l.staffId) || 'nhân viên')} tự mở phần mềm này khi làm việc (không chọn: nhân viên xin phép bạn lần đầu)</label>
    <label>${SECRET_LABEL[k]} (chỉ nhập ở đây; chỉ hiện 4 ký tự cuối${state.me.trial ? '; bản trải nghiệm không lưu mã đầy đủ' : ''})
      <input name="accessCode" type="password" autocomplete="new-password" placeholder="${l.accessCodeLast4 ? `•••• ${esc(l.accessCodeLast4)} — để trống nếu giữ nguyên` : 'Chưa nhập'}"></label>`;
}

function linkCard(l, showOwner = false) {
  const d = l.data;
  return `
    <details class="card link-card" data-link="${l.id}">
      <summary>
        <span class="grow"><b>${esc(l.softwareName)}</b>${showOwner ? ` <span class="kv">· ${esc(nameOf(l.staffId))}</span>` : ''}<br>
          <span class="kv">${esc(LINK_KINDS[l.kind] || LINK_KINDS.other)}${d ? ` · ${d.count} ${d.kind === 'products' ? 'sản phẩm' : d.kind === 'posts' ? 'bài đăng' : 'dòng'}` : ' · chưa có dữ liệu'}</span></span>
        <span class="pill ${linkTone(l.status)}">${{ connected: 'Đã kết nối', expired: 'Hết hạn', not_connected: 'Chưa kết nối' }[l.status]}</span>
      </summary>
      <div class="stat-row">
        <div><span>Đồng bộ cuối</span><b>${esc(fmtTime(l.lastSyncAt))}</b></div>
        <div><span>Kiểm tra gần nhất</span><b>${esc(fmtTime(l.lastCheckAt))}</b></div>
        <div><span>Lần mở</span><b>${esc(fmtTime(l.lastOpenedAt))}</b></div>
      </div>
      ${l.browsing ? `<p class="typing" style="margin:0">${esc(nameOf(l.staffId))} đang điều khiển trình duyệt: ${esc(l.browsing.step)}</p>` : ''}
      ${l.status === 'expired' ? '<p class="error" style="margin:0">Phiên đăng nhập đã hết hạn. Hệ thống không tự đăng nhập lại — hãy nhập lại mã và bấm Kiểm tra kết nối.</p>' : ''}
      <div class="row">
        <a class="btn sm outline" href="${esc(l.url)}" target="_blank" rel="noopener" data-opened="${l.id}">Mở trình duyệt</a>
        ${l.kind !== 'other' ? `<button class="btn sm" type="button" data-lact="check">Kiểm tra kết nối</button><button class="btn sm" type="button" data-lact="sync">Đồng bộ</button>` : ''}
        <button class="btn sm gold" type="button" data-lact="browse" ${l.browsing ? 'disabled' : ''}>${l.browsing ? 'Đang lấy qua trình duyệt…' : `${esc(nameOf(l.staffId))} lấy qua trình duyệt`}</button>
        <button class="btn sm" type="button" data-lact="import">Nhập dữ liệu</button>
        ${d ? '<button class="btn sm" type="button" data-lact="data">Xem dữ liệu</button>' : ''}
        ${l.status !== 'expired' ? '<button class="btn sm" type="button" data-lact="expire">Đánh dấu hết hạn</button>' : ''}
      </div>
      <div data-lout></div>
      <form class="form tight" data-lform>
        ${linkFields(l)}
        <div class="row"><button class="btn gold sm" type="submit">Lưu</button><button class="btn sm danger" type="button" data-lact="delete">Xoá</button></div>
      </form>
      <details class="fold-inner"><summary>Nhật ký (${(l.logs || []).length})</summary>
        ${(l.logs || []).length ? `<ul class="log">${l.logs.map((g) => `<li class="${g.ok ? '' : 'bad'}"><span class="kv">${esc(fmtTime(g.at))}</span> <b>${esc(g.action)}</b> ${g.ok ? '✓' : '✕'} ${esc(g.detail)}</li>`).join('')}</ul>` : '<p class="muted">Chưa có.</p>'}
      </details>
    </details>`;
}

function dataTable(d) {
  if (!d.items.length) return '<p class="muted">Chưa có dữ liệu.</p>';
  const cols = d.kind === 'products' ? [['ma', 'Mã'], ['ten', 'Tên'], ['gia', 'Giá'], ['ton', 'Tồn'], ['nhom', 'Nhóm']]
    : d.kind === 'posts' ? [['thoiGian', 'Thời gian'], ['noiDung', 'Nội dung'], ['luotThich', 'Thích'], ['binhLuan', 'Bình luận']] : [['ghiChu', 'Nội dung']];
  const cell = (v) => esc(typeof v === 'number' ? v.toLocaleString('vi-VN') : typeof v === 'object' ? JSON.stringify(v) : v ?? '—');
  return `<p class="kv" style="margin:0">${esc(d.source)} · ${esc(fmtTime(d.at))} · hiện ${d.items.length}/${d.total}</p>
    <div class="table-wrap"><table class="score"><thead><tr>${cols.map(([, n]) => `<th>${n}</th>`).join('')}</tr></thead>
    <tbody>${d.items.map((it) => `<tr>${cols.map(([k]) => `<td>${cell(typeof it === 'string' ? it : it[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function bindLinkActions(container, after) {
  container.addEventListener('click', async (e) => {
    const o = e.target.closest('[data-opened]');
    if (o) { api(`/api/links/${o.dataset.opened}`, { method: 'PUT', body: { opened: true } }).then(after).catch(() => {}); return; }
    const b = e.target.closest('[data-lact]');
    if (!b) return;
    const card = b.closest('[data-link]');
    const id = card.dataset.link;
    const out = $('[data-lout]', card);
    const a = b.dataset.lact;
    if (a === 'delete') {
      if (await askConfirm('Xoá liên kết phần mềm này cùng dữ liệu đã đồng bộ?', 'Xoá')) { await act(() => api(`/api/links/${id}`, { method: 'DELETE' })); after(); }
    } else if (a === 'expire') {
      if (await act(() => api(`/api/links/${id}`, { method: 'PUT', body: { status: 'expired' } }), 'Đã đánh dấu hết hạn.')) after(id);
    } else if (a === 'check' || a === 'sync') {
      b.disabled = true; out.innerHTML = `<p class="typing">${a === 'check' ? 'Đang kiểm tra kết nối…' : 'Đang đồng bộ dữ liệu…'}</p>`;
      try {
        const r = await api(`/api/links/${id}/${a}`, { body: {} });
        toast(r.message, 7000);
        await after(id);
        const box = $(`[data-link="${id}"] [data-lout]`, container);
        if (box) box.innerHTML = `<p class="${r.ok ? 'ok' : 'error'}" style="margin:0">${esc(r.message)}</p>`;
      } catch (err) { out.innerHTML = `<p class="error">${esc(err.message)}</p>`; b.disabled = false; }
    } else if (a === 'browse') {
      out.innerHTML = `<form class="form tight" data-bform>
        <label>Cần lấy gì lần này (để trống: theo mục đích dùng)
          <input name="goal" placeholder="Ví dụ: giá và tồn kho nhóm Lọc gió; hoặc 20 bài đăng mới và bình luận"></label>
        <p class="kv" style="margin:0">${state.me.trial
    ? 'Nhân viên dùng trình duyệt có sẵn trong ứng dụng Claude trên máy tính (bảng Trình duyệt). Lần đầu ứng dụng hỏi bạn cho phép; phần mềm cần đăng nhập thì bạn tự đăng nhập trong trình duyệt đó trước — nhân viên không tự đăng nhập.'
    : 'Nhân viên mở trình duyệt trên server, chỉ đọc. Phần mềm cần đăng nhập: chạy server trên máy bạn với VPA_BROWSER_HEADFUL=1 và tự đăng nhập một lần; hết phiên thì liên kết chuyển "Hết hạn", không tự đăng nhập lại.'}</p>
        <button class="btn gold sm" type="submit">Bắt đầu</button>
      </form>`;
      $('[data-bform]', out).addEventListener('submit', async (ev) => {
        ev.preventDefault();
        if (await act(() => api(`/api/links/${id}/browse`, { body: { goal: ev.target.goal.value } }), 'Nhân viên đang mở trình duyệt — tiến độ hiện trong thẻ và nhật ký.')) {
          await after(id);
          watchBrowse(container, id, after);
        }
      });
    } else if (a === 'data') {
      out.innerHTML = '<p class="typing">Đang tải…</p>';
      try { out.innerHTML = dataTable(await api(`/api/links/${id}/data`)); } catch (err) { out.innerHTML = `<p class="error">${esc(err.message)}</p>`; }
    } else if (a === 'import') {
      out.innerHTML = `<form class="form tight" data-iform>
        <label>Dán dữ liệu (CSV / bảng copy từ Excel: cột Mã hàng, Tên hàng, Giá bán, Tồn kho, Nhóm hàng — hoặc ghi chú từng dòng)
          <textarea name="text" style="min-height:110px" placeholder="Mã hàng,Tên hàng,Giá bán,Tồn kho&#10;FLT01,Lọc dầu,120000,8"></textarea></label>
        <div class="row"><label class="btn sm outline file-btn">Chọn file CSV<input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden></label>
          <button class="btn gold sm" type="submit">Nhập</button></div>
      </form>`;
      const f = $('[data-iform]', out);
      $('input[type=file]', f).addEventListener('change', async (ev) => { const file = ev.target.files[0]; if (file) f.text.value = await file.text(); });
      f.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const r = await act(() => api(`/api/links/${id}/import`, { body: { text: f.text.value } }));
        if (r) { toast(r.message); after(id); }
      });
    }
  });
  container.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-lform]');
    if (!f) return;
    e.preventDefault();
    const id = f.closest('[data-link]').dataset.link;
    const v = Object.fromEntries(new FormData(f));
    if (!v.accessCode) delete v.accessCode;
    v.accessGranted = f.accessGranted.checked;
    if (await act(() => api(`/api/links/${id}`, { method: 'PUT', body: v }), 'Đã lưu liên kết.')) after(id);
  });
}

// Theo dõi tiến độ khi nhân viên đang điều khiển trình duyệt: làm mới thẻ mỗi 2 giây tới khi xong.
function watchBrowse(container, id, after) {
  const timer = setInterval(async () => {
    if (!document.body.contains(container)) return clearInterval(timer);
    const l = (await api('/api/links').catch(() => [])).find((x) => x.id === id);
    if (container.querySelector('[data-lout] input:focus, [data-lform] :focus')) return;
    await after(id);
    if (!l?.browsing) clearInterval(timer);
  }, 2000);
}

function subSoftware(s, body) {
  body.innerHTML = `<p class="kv" style="margin:0">Phần mềm ${esc(s.name)} dùng để có dữ liệu thật khi trả lời khách (giá, tồn kho, bài đăng). Chỉ các mục liên quan câu hỏi được đưa vào câu trả lời; chưa có dữ liệu thì nhân viên nói "chưa cập nhật".</p>
    <div id="links" class="stack tight"></div>
    <details class="card fold" id="addLink">
      <summary><h3>+ Thêm phần mềm cho ${esc(s.name)}</h3></summary>
      <form class="form tight" id="linkForm">
        <label>Loại <select name="kind">${Object.entries(LINK_KINDS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <div id="newFields"></div>
        <button class="btn gold" type="submit">Thêm phần mềm</button>
      </form>
    </details>`;
  const form = $('#linkForm', body);
  const fill = () => { $('#newFields', body).innerHTML = linkFields({ kind: form.kind.value, ...LINK_DEFAULTS[form.kind.value] }); };
  form.kind.addEventListener('change', fill); fill();
  const refresh = async (openId) => {
    const links = (await api('/api/staff')).find((x) => x.id === s.id).softwareLinks;
    const was = new Set($$('#links details[open]', body).map((d) => d.dataset.link));
    if (openId) was.add(openId);
    $('#links', body).innerHTML = links.length ? links.map((l) => linkCard(l)).join('') : '<p class="muted" style="margin:0">Chưa có phần mềm nào.</p>';
    for (const d of $$('#links [data-link]', body)) if (was.has(d.dataset.link)) d.open = true;
    if (!links.length) $('#addLink', body).open = true;
  };
  bindLinkActions($('#links', body), refresh);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    if (!v.accessCode) delete v.accessCode;
    if (await act(() => api(`/api/staff/${s.id}/links`, { body: v }), 'Đã thêm phần mềm.')) { $('#addLink', body).open = false; fill(); refresh(); }
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
      <h3>${meeting ? 'Họp toàn văn phòng' : 'Giao việc cho văn phòng'}</h3>
      <p class="kv" style="margin:0">${meeting
    ? 'Mỗi người đề xuất, phản biện chéo, Phúc chọn ý tốt nhất (tối đa 10 phút).'
    : 'Giao xong việc chỉ ở trạng thái "Mới giao". Mở việc ra sẽ thấy đúng một việc cần làm ngay của một người, bấm là người đó làm.'}</p>
      <label>Việc cần làm <input id="gTitle" name="title" required placeholder="Ví dụ: Tra giá phốt FLTWS47691 / Tăng 1000 theo dõi cho Fanpage"></label>
      <label>Mô tả thêm (ngân sách, thời gian, yêu cầu…) <textarea name="description"></textarea></label>
      <div class="stack ${meeting ? '' : 'hidden'}" style="gap:8px"><span class="kv">Người tham gia (cả văn phòng; bỏ chọn bớt để tiết kiệm lượt gọi bộ não)</span>
        <div class="chips">${state.staff.map((x) => `<label class="chip" style="display:inline-flex;align-items:center;gap:8px;color:var(--text)"><input type="checkbox" name="a" value="${x.id}" ${meeting ? 'checked' : ''}> ${esc(x.name)}</label>`).join('')}</div></div>
      <label>Ảnh sản phẩm (tối đa 4) <input type="file" name="files" accept="image/png,image/jpeg,image/webp,image/gif" multiple></label>
      <div id="attMeta" class="stack" style="gap:8px"></div>
      <button class="btn gold" type="submit">${meeting ? 'Bắt đầu họp' : 'Giao việc'}</button>
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
    const workflow = meeting ? 'debate' : 'team';
    const t = await act(() => api('/api/tasks', { body: { title: form.title.value, description: form.description.value, kind: 'general', assigneeIds: meeting ? assigneeIds : [], attachments, workflow } }));
    if (!t) return;
    toast(meeting ? 'Đã bắt đầu họp.' : 'Đã giao việc — nhân viên đang đọc việc và nhắn vào ô chat.', 5000);
    await loadTasks(); openView('tasks', t.id);
  });
  mount(wrap, async () => {
    if (typingAsk($('#tList', wrap))) return;
    $('#tList', wrap).innerHTML = state.tasks.length ? state.tasks.map(taskCard).join('') : '<p class="muted">Chưa có việc nào. Giao việc ở trên, hoặc giao việc riêng trong trang của từng nhân viên.</p>';
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

// Quy trình chuẩn Fanpage: danh sách bước, ai làm, đang ở đâu, sản phẩm của từng bước.
const FLOW_ICON = { done: '✓', skipped: '⏭', doing: '⏳', waiting: '●', todo: '' };
function renderFlow(box, t, c, requests) {
  if (!c) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const cur = c.steps.find((x) => !['done', 'skipped'].includes(x.status));
  const doneN = c.steps.filter((x) => ['done', 'skipped'].includes(x.status)).length;
  const pct = Math.round((doneN / c.steps.length) * 100);
  const open = new Set([...box.querySelectorAll('details[open]')].map((d) => d.dataset.k));
  box.innerHTML = `
    <div class="row between"><h3>Quy trình chuẩn Fanpage</h3><span class="kv">${doneN}/${c.steps.length} bước · ngân sách ${vndUi(c.budget)} · ${c.days} ngày</span></div>
    <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    ${cur ? `<p class="${cur.owner === 'user' || cur.retryRequestId ? 'notice' : 'kv'}" style="margin:0">${cur.owner === 'user' || cur.retryRequestId ? 'Đang chờ BẠN: ' : 'Đang làm: '}<b>${esc(cur.title)}</b>${cur.dueAt && cur.status === 'waiting' ? ` — tự đo lúc ${esc(fmtTime(cur.dueAt))} <button type="button" class="btn sm" id="checkNow">Đo ngay</button>` : ''}${cur.owner === 'user' || cur.retryRequestId ? ' (thẻ duyệt ngay bên dưới)' : ''}</p>` : '<p class="ok" style="margin:0">Đã hoàn thành quy trình.</p>'}
    <ol class="flow">${c.steps.map((x) => `<li class="${x.status} ${x === cur ? 'cur' : ''}">
      <span class="ic" aria-hidden="true">${FLOW_ICON[x.status] || ''}</span>
      <div class="grow">${x.output ? `<details data-k="${x.key}" ${open.has(x.key) ? 'open' : ''}><summary><b>${esc(x.title)}</b> <small class="kv">${x.owner === 'user' ? 'Bạn' : esc(nameOf(x.owner))}</small></summary><div class="detail-box open">${esc(x.output)}</div></details>`
        : `<b>${esc(x.title)}</b> <small class="kv">${x.owner === 'user' ? 'Bạn' : esc(nameOf(x.owner))}</small>`}</div>
    </li>`).join('')}</ol>`;
  $('#checkNow', box)?.addEventListener('click', async () => { if (await act(() => api(`/api/tasks/${t.id}/check-now`, { body: {} }), 'Tuấn đang đo kết quả.')) state.refresh?.(); });
}

// Giao việc cho cả văn phòng thành MỘT ô chat như khi bạn nhắn với Claude: nhân viên tự xét việc, ai nhận thì làm
// và nhắn vào ô chat theo từng bước (xem phần mềm, tìm web, thiết kế ảnh, xin duyệt…). Bạn nhắn lại ở ô dưới cùng.
// Yêu cầu của nhân viên hiện ngay trong chat: bài chờ duyệt có ảnh + nút duyệt; đã xử lý thì chỉ còn một dòng kết quả.
function reqInChat(r) {
  if (['pending', 'publishing'].includes(r.status)) return requestCard(r, false);
  const line = r.status === 'published' ? `Đã đăng lên ${r.linkName}${r.result ? `: ${r.result}` : ''}` : r.status === 'failed' ? `Đăng lên ${r.linkName} thất bại: ${r.result || ''}`
    : r.status === 'rejected' ? 'Bạn không duyệt' : r.status === 'answered' ? `Bạn đã trả lời: ${r.answer}` : r.status === 'approved' ? 'Bạn đã cho phép' : '';
  return line ? `<p class="kv" style="margin:0">✔ ${esc(String(line).slice(0, 300))}</p>` : '';
}
function renderChat(box, t, f, requests, qa) {
  if (!f) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  if (typingReq(box)) return;
  const outs = Object.fromEntries((t.outputs || []).map((o) => [o.key, o]));
  const staffMsg = (sid, name, body, extra = '') => `<div class="msg staff"><div class="who">${avatar(staffById(sid), 'sm')} ${esc(name)}</div><div class="body">${body}</div>${extra}</div>`;
  const parts = [];
  parts.push(`<div class="msg user"><div class="who">Bạn</div><div class="body">${esc(t.title)}${t.description ? `\n${esc(t.description)}` : ''}${t.attachments.length ? `\n📎 ${t.attachments.map((a) => esc(a.fileName)).join(', ')}` : ''}</div></div>`);
  if (f.stage === 'triage') parts.push('<div class="typing">Cả văn phòng đang đọc việc, ai thấy là việc của mình sẽ nhận…</div>');
  const claimed = f.triage.filter((x) => x.lienQuan);
  for (const x of claimed) parts.push(staffMsg(x.staffId, x.name, esc(`Em nhận: ${x.viec || 'phần việc của em'}`)));
  const skip = f.triage.filter((x) => !x.lienQuan);
  if (skip.length) parts.push(`<p class="kv" style="margin:0">Không liên quan: ${skip.map((x) => esc(x.name)).join(', ')}</p>`);
  if (f.stage === 'order') parts.push('<div class="typing">Phúc đang sắp thứ tự ai làm trước…</div>');
  if (f.summaryPlan) parts.push(staffMsg('STAFF-007', 'Phúc', esc(f.summaryPlan)));
  for (const p of f.plan) {
    const o = outs[p.key];
    const reqs = requests.filter((r) => r.stepKey === p.key || (o?.requestId && r.id === o.requestId));
    for (const x of (o?.trace || []).filter((x) => x.hanhDong !== 'nop')) {
      parts.push(staffMsg(p.staffId, p.name, `<b>${esc(TRACE_LABEL[x.hanhDong] || x.hanhDong)}</b>${x.chiTiet ? ` — ${esc(x.chiTiet)}` : ''}${x.ketQua != null ? `\n→ ${esc(String(x.ketQua).slice(0, 600))}` : ''}`,
        x.imageId ? `<img class="post-img" data-image-id="${esc(x.imageId)}" alt="Ảnh ${esc(p.name)} thiết kế" width="1080" height="1080">` : ''));
    }
    if (o?.text) parts.push(staffMsg(p.staffId, p.name, esc(o.text), o.brainLabel ? `<div class="brain">Bộ não: ${esc(o.brainLabel)}</div>` : ''));
    if (o?.error) parts.push(`<div class="msg err"><div class="who">${esc(p.name)}</div><div class="body">Bộ não lỗi: ${esc(o.error)}</div></div>`);
    for (const r of reqs) parts.push(reqInChat(r));
    if (p.status === 'doing' && !o?.text) parts.push(`<div class="typing">${esc(p.name)} đang làm…</div>`);
  }
  const sum = outs.tongket;
  if (sum?.text) parts.push(staffMsg('STAFF-007', 'Phúc tổng kết', esc(sum.text), sum.brainLabel ? `<div class="brain">Bộ não: ${esc(sum.brainLabel)}</div>` : ''));
  for (const q of qa) {
    parts.push(`<div class="msg user"><div class="who">Bạn → ${esc(q.staffName)}</div><div class="body">${esc(q.question)}</div></div>`);
    for (const x of (q.trace || []).filter((x) => x.hanhDong !== 'nop')) {
      parts.push(staffMsg(q.staffId, q.staffName, `<b>${esc(TRACE_LABEL[x.hanhDong] || x.hanhDong)}</b>${x.chiTiet ? ` — ${esc(x.chiTiet)}` : ''}${x.ketQua != null && x.hanhDong !== 'xin_duyet_dang' ? `\n→ ${esc(String(x.ketQua).slice(0, 600))}` : ''}`,
        x.imageId ? `<img class="post-img" data-image-id="${esc(x.imageId)}" alt="Ảnh ${esc(q.staffName)} thiết kế" width="1080" height="1080">` : ''));
    }
    for (const r of requests.filter((r) => r.stepKey === `chat-${q.id}` || r.id === q.requestId)) parts.push(reqInChat(r));
    if (q.answer) parts.push(`<div class="msg staff ${q.isError ? 'err' : ''}"><div class="who">${avatar(staffById(q.staffId), 'sm')} ${esc(q.staffName)}</div><div class="body">${esc(q.answer)}</div></div>`);
    else if (!q.waiting) parts.push(`<div class="typing">${esc(q.staffName)} đang làm…</div>`);
  }
  if (f.stage === 'done' && !f.plan.some((p) => p.status !== 'done')) parts.push('<p class="kv" style="margin:0">Đã xong. Bạn vẫn có thể nhắn thêm bên dưới.</p>');
  const html = `<section class="card stack tight chat-task"><div class="chat">${parts.join('')}</div></section>`;
  // Chỉ vẽ lại khi có thay đổi: không nhấp nháy, không mất nút bạn sắp bấm.
  if (box.dataset.html !== html) {
    const nearEnd = window.innerHeight + window.scrollY >= document.body.scrollHeight - 160;
    box.innerHTML = html; box.dataset.html = html;
    if (nearEnd) box.lastElementChild?.scrollIntoView({ block: 'end' });
  }
  loadPostImages(box);
}

// Việc làm thực tế (shared/realwork.js): đúng MỘT việc cần làm ngay của MỘT người, làm trên link và số liệu thật.
const REAL_TITLE = {
  record_metrics: 'xem Fanpage và ghi lại số liệu nhìn thấy', analyze: 'nhận xét đúng trên số liệu vừa ghi', write_post: 'viết 1 bài hoàn chỉnh',
  publish: 'mở Fanpage đăng bài rồi dán link bài', propose_budget: 'đề xuất ngân sách quảng cáo bằng số cụ thể', approve_budget: 'duyệt ngân sách Bình đề xuất',
  run_ads: 'mở Ads Manager chạy quảng cáo, ghi mã chiến dịch', answer: 'làm việc này',
};
const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;
const openBtn = (url, label) => (url ? `<a class="btn sm outline" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : `<span class="btn sm outline" aria-disabled="true" title="Chưa có link — nhập ở ô bên dưới">${esc(label)} (chưa có link)</span>`);
function realActionHtml(r) {
  const c = r.current;
  const L = r.links;
  if (!c) return '';
  const who = c.staffId === 'user' ? 'bạn' : nameOf(c.staffId);
  const head = `<h3 style="margin:0">Việc của ${esc(who)} bây giờ là ${esc(REAL_TITLE[c.key])}</h3>`;
  const lastPost = r.post ? `<div class="detail-box open" id="rPost">${esc(r.post.text)}</div>` : '';
  const body = {
    record_metrics: () => `<div class="row">${openBtn(L.fanpageUrl, 'Mở Fanpage')}${openBtn(L.kiotvietUrl, 'Mở KiotViet')}</div>
      ${L.fanpageUrl ? '' : `<div class="field-row"><input name="fanpageUrl" aria-label="Link Fanpage" placeholder="Link Fanpage https://facebook.com/…"><button class="btn sm" type="button" data-save-link>Lưu link</button></div>`}
      <p class="kv" style="margin:0">Mở Fanpage, nhìn rồi ghi đúng số đang hiện trên trang.</p>
      <div class="field-row"><label>Người theo dõi <input name="followers" inputmode="numeric" placeholder="vd. 1.234"></label><label>Lượt thích trang <input name="likes" inputmode="numeric"></label></div>
      <label>Bài gần nhất (lượt thích / bình luận) <input name="recent" placeholder="không bắt buộc"></label>
      <button class="btn gold" type="submit">Ghi số liệu</button>`,
    analyze: () => `<p class="kv" style="margin:0">Số đã ghi: ${r.metrics.followers ?? '—'} người theo dõi · ${r.metrics.likes ?? '—'} lượt thích${r.metrics.recent ? ` · ${esc(r.metrics.recent)}` : ''}</p>
      <button class="btn gold" type="submit">Tuấn nhận xét</button>`,
    write_post: () => `${L.hotlines.length === 2 ? `<p class="kv" style="margin:0">Hotline ghi vào bài: ${esc(L.hotlines.join(' – '))}</p>` : `<div class="field-row"><input name="hotline1" required aria-label="Hotline 1" placeholder="Hotline 1"><input name="hotline2" required aria-label="Hotline 2" placeholder="Hotline 2"></div>`}
      <button class="btn gold" type="submit">Viết bài</button>`,
    publish: () => `${lastPost}<div class="row">${openBtn(L.fanpageUrl, 'Mở Fanpage')}<button class="btn sm" type="button" data-copy>Chép bài</button></div>
      <label>Link bài đã đăng <input name="postLink" required placeholder="https://facebook.com/…/posts/…"></label>
      <div class="row"><button class="btn gold" type="submit">Lưu link bài</button><input class="grow" name="feedback" aria-label="Góp ý để viết lại" placeholder="Góp ý nếu muốn viết lại"><button class="btn sm" type="button" data-redo="write_post">Viết lại</button></div>`,
    propose_budget: () => `<p class="kv" style="margin:0">Bài: <a href="${esc(r.postLink)}" target="_blank" rel="noopener">${esc(r.postLink)}</a></p>
      <button class="btn gold" type="submit">Bình đề xuất ngân sách</button>`,
    approve_budget: () => `<div class="notice"><b>${vnd(r.budget.perDay)}/ngày × ${r.budget.days} ngày = ${vnd(r.budget.total)}</b>${r.budget.target ? `<br>Đối tượng: ${esc(r.budget.target)}` : ''}${r.budget.reason ? `<br>${esc(r.budget.reason)}` : ''}</div>
      <div class="row"><button class="btn gold" type="submit">Duyệt ngân sách</button><input class="grow" name="feedback" aria-label="Góp ý để đề xuất lại" placeholder="Góp ý nếu muốn đề xuất lại"><button class="btn sm" type="button" data-redo="propose_budget">Đề xuất lại</button></div>`,
    run_ads: () => `<div class="row">${openBtn(L.adsManagerUrl, 'Mở Ads Manager')}</div>
      <p class="kv" style="margin:0">Đã duyệt ${vnd(r.budget.perDay)}/ngày × ${r.budget.days} ngày. Đẩy bài ${esc(r.postLink)}, xuất bản rồi ghi lại mã chiến dịch.</p>
      <div class="field-row"><label>Mã chiến dịch <input name="campaignId" required></label><label>Link chiến dịch <input name="campaignLink" placeholder="https://adsmanager.facebook.com/…"></label></div>
      <button class="btn gold" type="submit">Lưu mã chiến dịch</button>`,
    answer: () => `<button class="btn gold" type="submit">${esc(nameOf(c.staffId))} làm ngay</button>`,
  }[c.key]();
  return `<form class="card gold stack tight" id="realForm" data-action="${c.key}"><div class="row">${c.staffId === 'user' ? '' : avatar(staffById(c.staffId), 'sm')}${head}</div>${body}</form>`;
}
function realDoneHtml(r) {
  const items = [];
  if (r.metrics) items.push(['STAFF-003', `Số liệu Fanpage: ${r.metrics.followers ?? '—'} người theo dõi · ${r.metrics.likes ?? '—'} lượt thích`]);
  if (r.analysis) items.push(['STAFF-003', r.analysis]);
  if (r.post && r.postLink) items.push(['STAFF-001', `Đã đăng: ${r.postLink}\n\n${r.post.text}`]);
  if (r.budget && r.budgetApproved) items.push(['STAFF-002', `Ngân sách đã duyệt: ${vnd(r.budget.perDay)}/ngày × ${r.budget.days} ngày`]);
  if (r.campaign) items.push(['STAFF-002', `Mã chiến dịch: ${r.campaign.id}${r.campaign.link ? `\n${r.campaign.link}` : ''}`]);
  if (r.answer) items.push([r.owner, r.answer.text]);
  if (!items.length) return '';
  return `<section class="card stack tight"><h3>Đã làm</h3><div class="chat">${items.map(([sid, text]) => `<div class="msg staff"><div class="who">${esc(nameOf(sid))}</div><div class="body">${esc(text)}</div></div>`).join('')}</div></section>`;
}
function renderReal(box, t, r, refresh) {
  if (!r) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  if (box.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
  const html = `${r.done ? '<div class="notice">Việc đã xong.</div>' : realActionHtml(r)}${realDoneHtml(r)}`;
  if (box.dataset.html === html) return;
  box.innerHTML = html; box.dataset.html = html;
  const form = $('#realForm', box);
  if (!form) return;
  const send = async (action, input, btn) => {
    $$('button', form).forEach((b) => { b.disabled = true; });
    if (btn) btn.textContent = 'Đang làm…';
    const ok = await act(() => api(`/api/tasks/${t.id}/real`, { body: { action, input } }));
    if (!ok) $$('button', form).forEach((b) => { b.disabled = false; });
    box.dataset.html = '';
    refresh();
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); send(form.dataset.action, Object.fromEntries(new FormData(form)), e.submitter); });
  form.querySelectorAll('[data-redo]').forEach((b) => b.addEventListener('click', () => send(b.dataset.redo, { feedback: form.feedback?.value || '' }, b)));
  form.querySelector('[data-copy]')?.addEventListener('click', () => navigator.clipboard?.writeText(r.post.text).then(() => toast('Đã chép bài.')));
  form.querySelector('[data-save-link]')?.addEventListener('click', async () => {
    if (await act(() => api('/api/office-settings', { method: 'PUT', body: { fanpageUrl: form.fanpageUrl.value } }), 'Đã lưu link Fanpage.')) { box.dataset.html = ''; refresh(); }
  });
}

function viewTaskDetail(id) {
  const wrap = el(`<button class="btn sm" type="button" id="back">← Tất cả việc</button><div id="tHead" class="stack"></div>
    <section class="stack tight hidden" id="realBox"></section>
    <section class="stack tight hidden" id="teamBox"></section>
    <section class="card stack tight hidden" id="flowBox"></section>
    <div id="reqBox" class="stack tight"></div>
    <section class="card gold stack tight" id="qaBox" aria-live="polite">
      <div class="row between"><h3>Hỏi về việc này</h3><span class="kv">Người làm việc trả lời dựa trên tiến độ và kết quả của chính việc</span></div>
      <div id="qaList" class="chat"></div><div id="qaForm"></div>
    </section>
    <div id="outputs" class="stack"></div>
    <div id="sess" class="stack"></div>
    <form class="composer hidden" id="sayForm">
      <label for="sayText">Góp ý vào phiên (các vòng sau phải tính đến)</label>
      <div class="row"><input id="sayText" name="text" placeholder='Gõ "chốt công việc" hoặc "dừng" để chốt' autocomplete="off"><button class="btn gold" type="submit">Gửi</button><button type="button" id="closeBtn" class="btn danger">Dừng phiên</button></div>
    </form>
    <details class="card" id="mgrBox"><summary><b>Quyền Quản lý (Phúc)</b></summary>
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
    const { task: t, session: s, qa = [], requests = [], campaign = null, flow = null, real = null } = await api(`/api/tasks/${id}`);
    renderReal($('#realBox', wrap), t, real, refresh);
    for (const k of ['#mgrBox', '#reqBox']) $(k, wrap).classList.toggle('hidden', !!real);
    $('#qaBox', wrap).classList.toggle('chat-input', !!flow);
    renderFlow($('#flowBox', wrap), t, campaign, requests);
    renderChat($('#teamBox', wrap), t, flow, requests, qa);
    $('#outputs', wrap).classList.toggle('hidden', !!flow || !!real);
    if (flow) $('#reqBox', wrap).innerHTML = ''; // việc giao cả văn phòng: thẻ duyệt nằm trong bảng của người đang làm
    else if (!typingReq($('#reqBox', wrap))) {
      const open = requests.filter((r) => ['pending', 'publishing'].includes(r.status));
      const past = requests.filter((r) => !['pending', 'publishing'].includes(r.status));
      $('#reqBox', wrap).innerHTML = `${open.map((r) => requestCard(r, false)).join('')}${past.length ? `<details class="card fold"><summary><h3>Đã trao đổi với nhân viên</h3><small>${past.length}</small></summary><div class="stack tight">${past.map((r) => requestCard(r, false)).join('')}</div></details>` : ''}`;
      loadPostImages($('#reqBox', wrap));
    }
    $('#sheetTitle').textContent = t.title;
    const peopleKey = taskPeople({ ...t, planSteps: state.tasks.find((x) => x.id === t.id)?.planSteps || [] }).join();
    const qf = $('#qaForm form', wrap);
    if (!qf || (qf.dataset.people !== peopleKey && !qf.question.value)) {
      $('#qaForm', wrap).innerHTML = askBar({ ...t, planSteps: state.tasks.find((x) => x.id === t.id)?.planSteps || [] }, false);
      $('#qaForm form', wrap).dataset.people = peopleKey;
    }
    if (flow) { // ô nhắn dưới ô chat: tự gửi cho người đang làm (hoặc người làm gần nhất), không bắt chọn
      const form = $('#qaForm form', wrap);
      const pick = flow.plan.find((p) => ['doing', 'waiting'].includes(p.status)) || [...flow.plan].reverse().find((p) => p.status === 'done') || flow.plan[0];
      if (form && pick && [...form.staffId.options].some((o) => o.value === pick.staffId) && document.activeElement !== form.question) form.staffId.value = pick.staffId;
      if (form) form.question.placeholder = `Nhắn vào nhóm (gửi cho ${nameOf(form.staffId.value)})…`;
    }
    $('#qaList', wrap).innerHTML = qa.map((q) => `
      <div class="msg user"><div class="who">Bạn hỏi ${esc(q.staffName)} <span class="t">${esc(fmtClock(q.createdAt))}</span></div><div class="body">${esc(q.question)}</div></div>
      ${q.answer ? `<div class="msg staff ${q.isError ? 'err' : ''}"><div class="who">${esc(q.staffName)} <span class="t">${esc(fmtClock(q.answeredAt))}</span></div><div class="body">${esc(q.answer)}</div>${q.brainLabel ? `<div class="brain">Bộ não: ${esc(q.brainLabel)}</div>` : ''}</div>`
        : `<div class="typing">${esc(q.staffName)} đang xem lại việc và trả lời…</div>`}`).join('') || '<p class="kv" style="margin:0">Chưa có câu hỏi. Hỏi tiến độ, lý do, kết quả hoặc yêu cầu làm rõ — người làm việc sẽ trả lời đúng về việc này.</p>';
    $('#tHead', wrap).innerHTML = `
      <div class="row"><span class="pill ${TASK_TONE[t.status] || ''}"><i class="dot"></i>${esc(TASK_STATUS[t.status])}</span>${t.legalCleared ? '<span class="pill teal">Pháp lý đã cho qua</span>' : ''}
        <span class="kv">${t.kind === 'general' ? 'Việc chung' : 'Việc riêng'} · ${t.assigneeIds.map((x) => esc(nameOf(x))).join(', ')}</span></div>
      <h3 style="font-size:20px">${esc(t.title)}</h3>
      ${t.description ? `<p style="margin:0">${esc(t.description)}</p>` : ''}
      ${t.attachments.length ? `<div class="kv">Đính kèm: ${t.attachments.map((a) => esc(`${a.fileName}${a.productName ? ` (${a.productName}${a.priceNote ? `, ${a.priceNote}` : ''})` : ''}`)).join('; ')}</div>` : ''}
      ${t.stopReason ? `<div class="error">${esc(t.stopReason)}</div>` : ''}
      ${t.returnReason ? `<div class="notice">Trả làm lại: ${esc(t.returnReason)} — Tiêu chí đạt: ${esc(t.passCriteria)}</div>` : ''}
      ${t.lastError ? `<div class="error">Lỗi gần nhất (trạng thái việc được giữ nguyên để thử lại):\n${esc(t.lastError)}</div>` : ''}
      ${t.status === 'waiting_user' && !requests.some((r) => r.status === 'pending') ? '<div class="notice">Việc đang ở "Chờ người dùng" nhưng không còn yêu cầu nào chờ bạn. <button type="button" class="btn sm gold" id="unstick">Cho chạy tiếp</button></div>' : ''}`;
    $('#unstick', wrap)?.addEventListener('click', () => post('retry'));
    $('#outputs', wrap).innerHTML = t.outputs.length ? `<div class="eyebrow">Kết quả thực hiện</div><div class="steps">${t.outputs.map((o) => `
      <div class="step ${o.error ? 'fail' : o.waiting ? 'now' : 'done'}"><span class="tick">${o.error ? ICON_X : o.waiting ? '' : ICON_CHECK}</span><div style="min-width:0">
        <h4>${esc(o.step || 'Thực hiện')} <small class="kv">${esc(o.staffName)}</small>${o.waiting ? ' <small class="ok">Đang chờ bạn</small>' : ''}</h4>
        ${traceHtml(o.trace)}
        ${o.why ? `<div class="sub">Được giao vì: ${esc(o.why)}${o.criteria ? ` · Đạt khi: ${esc(o.criteria)}` : ''}</div>` : ''}
        ${o.waiting ? '' : `<div class="detail-box open">${esc(o.error ? `Bộ não lỗi: ${o.error}` : o.text)}</div>`}
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

// ---------- Vận hành Fanpage ----------
const CYCLE_UI = {
  content: ['An làm bài + ảnh & đăng', 'STAFF-001'], analyst: ['Tuấn kiểm tra số liệu', 'STAFF-003'],
  ads: ['Bình đề xuất quảng cáo', 'STAFF-002'], share: ['Bình chia sẻ vào nhóm', 'STAFF-002'],
};
const POST_STATUS = { posting: 'Đang đăng…', posted: 'Đã đăng', failed: 'Đăng lỗi' };
const PLAN_STATUS = { pending: 'Chờ bạn duyệt', starting: 'Đang chạy…', running: 'Đang chạy', partial: 'Chạy một phần', failed: 'Lỗi', rejected: 'Không duyệt' };
VIEWS.fanpage = () => {
  const wrap = el(`
    <p class="kv" style="margin:0">Ba người phụ trách Fanpage như người thật, tự lặp lại mỗi ngày: <b>An</b> làm bài + thiết kế ảnh (không bài nào giống bài nào), gửi lên nhóm rồi tự đăng; <b>Tuấn</b> kiểm tra số liệu Fanpage và khuyên An, Bình; <b>Bình</b> chịu trách nhiệm tăng trưởng — đề xuất quảng cáo + ngân sách, <b>chỉ chạy khi bạn duyệt</b>, và tự chia sẻ bài hay vào nhóm.</p>
    <div id="fpRun" class="chips"></div>
    <details class="card fold" id="fpCfg"><summary><h3>Cài đặt</h3><small id="fpState"></small></summary><form class="form tight" id="fpForm"></form></details>
    <div id="fpBody" class="stack tight"></div>`);
  let cfgDrawn = false;
  const form = $('#fpForm', wrap);
  async function drawCfg(d) {
    const links = await api('/api/links');
    const opt = (kinds, cur) => `<option value="">— chưa chọn —</option>${links.filter((l) => kinds.includes(l.kind)).map((l) => `<option value="${l.id}" ${l.id === cur ? 'selected' : ''}>${esc(l.softwareName)} · ${esc(nameOf(l.staffId))}</option>`).join('')}`;
    const o = d.ops;
    form.innerHTML = `
      <label class="check"><input type="checkbox" name="enabled" ${o.enabled ? 'checked' : ''}> Bật tự vận hành (chạy theo giờ bên dưới${state.me.trial ? ', khi văn phòng đang mở trong ứng dụng Claude trên máy tính' : ''})</label>
      <div class="field-row">
        <label>Fanpage <select name="fanpageLinkId">${opt(['facebook_page', 'other'], o.fanpageLinkId)}</select></label>
        <label>Tài khoản quảng cáo <select name="adsLinkId">${opt(['facebook_ads', 'facebook_page', 'other'], o.adsLinkId)}</select></label>
      </div>
      <p class="kv" style="margin:0">Chưa có? Thêm phần mềm loại "Fanpage Facebook" cho An và "Quảng cáo Facebook" cho Bình (trang nhân viên → Phần mềm).${state.me.trial ? '' : ' Có Page ID + Page Access Token thì đăng ảnh và đọc số liệu bằng API chính thức; có mã tài khoản quảng cáo + token thì chạy quảng cáo bằng Marketing API.'}</p>
      <div class="field-row">
        <label>Giờ An đăng bài <input name="contentTimes" value="${esc(o.contentTimes.join(', '))}" placeholder="09:00, 19:30"></label>
        <label>Tuấn kiểm tra mỗi (giờ) <input name="analystEveryHours" type="number" min="1" max="24" value="${o.analystEveryHours}"></label>
      </div>
      <div class="field-row">
        <label>Giờ Bình đề xuất quảng cáo <input name="adsTime" type="time" value="${esc(o.adsTime)}"></label>
        <label>Trần ngân sách / ngày (đ) <input name="dailyBudgetCap" type="number" min="0" step="10000" value="${o.dailyBudgetCap}"></label>
      </div>
      <div class="field-row">
        <label>Giờ chia sẻ vào nhóm <input name="shareTime" type="time" value="${esc(o.shareTime)}"></label>
        <label>Tối đa lượt chia sẻ / ngày <input name="shareMaxPerDay" type="number" min="0" max="10" value="${o.shareMaxPerDay}"></label>
      </div>
      <label>Nhóm được phép chia sẻ (mỗi dòng một địa chỉ https://facebook.com/groups/…) <textarea name="groups" style="min-height:70px">${esc(o.groups.map((g) => g.url).join('\n'))}</textarea></label>
      <label>Tên thương hiệu trên ảnh <input name="brand" value="${esc(o.brand || '')}" maxlength="40" placeholder="Long Phu Auto"></label>
      <button class="btn gold" type="submit">Lưu cài đặt</button>`;
    cfgDrawn = true;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    v.enabled = form.enabled.checked;
    if (await act(() => api('/api/fanpage', { method: 'PUT', body: v }), 'Đã lưu cài đặt Fanpage.')) { cfgDrawn = false; state.refresh?.(); }
  });
  $('#fpRun', wrap).addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cycle]');
    if (b && await act(() => api(`/api/fanpage/run/${b.dataset.cycle}`, { body: {} }), `${CYCLE_UI[b.dataset.cycle][0]} — đang chạy, kết quả hiện ở đây và trong chat nhóm.`)) state.refresh?.();
  });
  mount(wrap, async () => {
    const d = await api('/api/fanpage');
    if (!cfgDrawn) await drawCfg(d);
    $('#fpCfg', wrap).open ||= !d.ops.fanpageLinkId;
    $('#fpState', wrap).textContent = d.ops.enabled ? 'Đang bật' : 'Đang tắt';
    $('#fpRun', wrap).innerHTML = Object.entries(CYCLE_UI).map(([k, [n]]) => `<button type="button" class="chip sm ${d.running.includes(k) ? 'active' : ''}" data-cycle="${k}" ${d.running.includes(k) ? 'disabled' : ''}>${d.running.includes(k) ? '⏳ ' : '▶ '}${n}</button>`).join('');
    if (wrap.querySelector('#fpBody :focus')) return;
    const snap = d.snapshots[0];
    $('#fpBody', wrap).innerHTML = `
      <section class="card stack tight"><div class="row between"><h3>Số liệu Fanpage (Tuấn)</h3><span class="kv">${snap ? esc(fmtTime(snap.at)) : 'chưa kiểm tra'}</span></div>
        ${snap ? `<div class="stat-row"><div><span>Người theo dõi</span><b>${snap.followers ?? '—'}</b></div><div><span>Thích trang</span><b>${snap.likes ?? '—'}</b></div><div><span>Tiếp cận / tương tác</span><b>${snap.reach ?? '—'} / ${snap.engagement ?? '—'}</b></div></div>
          <p style="margin:0">${esc(snap.summary)}</p>${snap.change ? `<p class="kv" style="margin:0">So với lần trước: ${esc(snap.change)}</p>` : ''}
          ${d.snapshots.length > 1 ? `<div class="table-wrap"><table class="score"><thead><tr><th>Lúc</th><th>Theo dõi</th><th>Thích</th><th>Tiếp cận</th><th>Tương tác</th></tr></thead><tbody>${d.snapshots.slice(0, 8).map((x) => `<tr><td>${esc(fmtTime(x.at))}</td><td>${x.followers ?? '—'}</td><td>${x.likes ?? '—'}</td><td>${x.reach ?? '—'}</td><td>${x.engagement ?? '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}`
          : '<p class="muted" style="margin:0">Chưa có số liệu. Bấm "Tuấn kiểm tra số liệu".</p>'}
      </section>
      ${d.advice.length ? `<details class="card fold"><summary><h3>Lời khuyên của Tuấn</h3><small>${d.advice.length}</small></summary><div class="stack tight">${d.advice.slice(0, 8).map((a) => `<div><b>Cho ${esc(nameOf(a.to))}</b> <span class="kv">${esc(fmtTime(a.at))}</span><div style="white-space:pre-wrap">${esc(a.text)}</div></div>`).join('')}</div></details>` : ''}
      <section class="card stack tight"><h3>Kế hoạch quảng cáo (Bình)</h3>
        ${d.plans.length ? d.plans.slice(0, 5).map((pl) => `<div class="api-item stack tight"><div class="row between"><b>${esc(fmtTime(pl.createdAt))} · ${esc(vndUi(pl.perDay))}/ngày</b><span class="pill ${pl.status === 'pending' ? 'gold' : pl.status === 'running' ? 'teal' : ['failed', 'rejected'].includes(pl.status) ? 'red' : ''}">${esc(PLAN_STATUS[pl.status] || pl.status)}</span></div>
          <div class="detail-box open">${esc(pl.text || '')}</div>${pl.result ? `<div class="kv" style="white-space:pre-wrap">Kết quả: ${esc(pl.result)}</div>` : ''}
          ${pl.status === 'pending' ? '<button class="btn gold sm" type="button" data-open="requests">Mở để duyệt</button>' : ''}</div>`).join('') : '<p class="muted" style="margin:0">Chưa có kế hoạch. Bình đề xuất mỗi ngày lúc giờ đã đặt, hoặc bấm "Bình đề xuất quảng cáo".</p>'}
      </section>
      <section class="stack tight"><div class="eyebrow">Bài An đã làm</div>
        ${d.posts.length ? `<div class="post-grid">${d.posts.map((p) => `<article class="card post stack tight">
          ${p.hasImage ? `<img class="post-img" data-post-img="${p.id}" alt="Ảnh thiết kế: ${esc(p.design?.tieuDe || '')}" width="1080" height="1080">` : ''}
          <div class="row between"><b>${esc(p.topic || '')}</b><span class="pill ${p.status === 'posted' ? 'teal' : p.status === 'failed' ? 'red' : 'orange'}">${esc(POST_STATUS[p.status] || p.status)}</span></div>
          <div class="kv">${esc(fmtTime(p.createdAt))} · bố cục ${esc(p.design?.boCuc || '')} · màu ${esc(p.design?.bangMau || '')}${p.stats ? ` · ${p.stats.reactions} thích, ${p.stats.comments} bình luận, ${p.stats.shares} chia sẻ` : ''}</div>
          <details><summary class="kv">Nội dung bài</summary><div style="white-space:pre-wrap">${esc(p.text)}</div></details>
          ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">Xem trên Facebook</a>` : ''}${p.result && p.status !== 'posted' ? `<div class="error" style="font-size:13px">${esc(p.result)}</div>` : ''}
          ${(p.shares || []).length ? `<div class="kv">Đã chia sẻ: ${p.shares.map((x) => `${x.ok ? '✓' : '✕'} ${esc(x.url)}`).join(' · ')}</div>` : ''}
        </article>`).join('')}</div>` : '<p class="muted" style="margin:0">Chưa có bài. Bấm "An làm bài + ảnh & đăng".</p>'}
      </section>`;
    loadPostImages(wrap);
  });
};
const vndUi = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;

// ---------- Yêu cầu của nhân viên trong lúc làm việc thật ----------
const REQ_TYPE = {
  info: 'Cần bạn trả lời', access: 'Xin phép truy cập phần mềm', publish: 'Xin duyệt trước khi đăng', ads: 'Kế hoạch quảng cáo chờ duyệt',
  plan: 'Duyệt kế hoạch chiến dịch', post: 'Duyệt bài trước khi đăng', campaign_ads: 'Duyệt quảng cáo', retry: 'Bước bị lỗi — thử lại?',
};
const REQ_STATUS = { pending: 'Chờ bạn', answered: 'Đã trả lời', approved: 'Đã cho phép', rejected: 'Đã từ chối', publishing: 'Đang chạy…', published: 'Đã xong', failed: 'Lỗi' };
function requestCard(r, showTask = true) {
  const tone = r.status === 'pending' ? 'gold' : ['published', 'answered', 'approved'].includes(r.status) ? 'teal' : r.status === 'publishing' ? 'orange' : 'red';
  const head = `<div class="row between"><b>${esc(r.staffName)} · ${esc(REQ_TYPE[r.type])}</b><span class="pill ${tone}">${esc(REQ_STATUS[r.status] || r.status)}</span></div>
    ${showTask && r.taskTitle ? `<button type="button" class="link-btn kv" data-task-open="${r.taskId}">Việc: ${esc(r.taskTitle)}</button>` : ''}
    <p style="margin:0;white-space:pre-wrap">${esc(r.question)}</p>`;
  if (r.status !== 'pending') {
    return `<div class="card req stack tight" data-req="${r.id}">${head}
      ${r.content ? `<div class="detail-box open">${esc(r.content)}</div>` : ''}
      ${r.answer ? `<div class="kv">Bạn: ${esc(r.answer)}</div>` : ''}${r.result ? `<div class="kv">Kết quả: ${esc(r.result)}</div>` : ''}</div>`;
  }
  const body = r.type === 'info'
    ? `<textarea name="answer" placeholder="Câu trả lời của bạn" style="min-height:70px"></textarea>
       <div class="row"><button class="btn gold sm" type="submit" data-a="answer">Trả lời</button><button class="btn sm" type="button" data-a="reject">Bỏ qua câu này</button></div>`
    : r.type === 'plan'
      ? `<div class="detail-box open">${esc(r.content || '')}</div>
         <input name="answer" placeholder="Góp ý nếu muốn sửa (bấm 'Yêu cầu sửa' để Bình làm lại)">
         <div class="row"><button class="btn gold sm" type="submit" data-a="approve">Duyệt kế hoạch</button><button class="btn sm danger" type="button" data-a="reject">Yêu cầu sửa</button></div>`
    : r.type === 'post'
      ? `${r.postId ? `<img class="post-img" data-post-img="${esc(r.postId)}" alt="Ảnh thiết kế của bài" width="1080" height="1080">` : ''}
         <label>Nội dung sẽ đăng (sửa được trước khi duyệt)<textarea name="content" style="min-height:160px">${esc(r.content || '')}</textarea></label>
         <input name="answer" placeholder="Góp ý nếu muốn An viết lại">
         <div class="row"><button class="btn gold sm" type="submit" data-a="approve">Duyệt &amp; đăng lên Fanpage</button><button class="btn sm danger" type="button" data-a="reject">Yêu cầu viết lại</button></div>`
    : r.type === 'campaign_ads'
      ? `<div class="detail-box open">${esc(r.content || '')}</div>
         <input name="answer" placeholder="Lý do nếu không chạy">
         <div class="row"><button class="btn gold sm" type="submit" data-a="approve">Duyệt &amp; chạy quảng cáo</button><button class="btn sm danger" type="button" data-a="reject">Không chạy</button></div>`
    : r.type === 'retry'
      ? `<div class="row"><button class="btn gold sm" type="submit" data-a="approve">Thử lại</button><button class="btn sm" type="button" data-a="reject">Bỏ qua bước này</button></div>`
    : r.type === 'ads'
      ? `<div class="detail-box open">${esc(r.content || '')}</div>
         <p class="kv" style="margin:0">Duyệt thì Bình tự mở trình quản lý quảng cáo và chạy ĐÚNG kế hoạch này (không vượt ngân sách đã ghi). Không duyệt thì không chạy.</p>
         <input name="answer" placeholder="Góp ý / lý do nếu không duyệt (Bình sẽ đọc ở lần đề xuất sau)">
         <div class="row"><button class="btn gold sm" type="submit" data-a="approve">Duyệt &amp; chạy quảng cáo</button><button class="btn sm danger" type="button" data-a="reject">Không duyệt</button></div>`
    : r.type === 'access'
      ? `<p class="kv" style="margin:0">Cho phép thì ${esc(r.staffName)} được tự mở ${esc(r.linkName || 'phần mềm')} để đọc dữ liệu (chỉ đọc, không tự đăng nhập; thu hồi được trong thẻ phần mềm).</p>
         <div class="row"><button class="btn gold sm" type="submit" data-a="approve">Cho phép</button><button class="btn sm danger" type="button" data-a="reject">Không cho phép</button></div>`
      : r.mode === 'ads'
      ? `<div class="detail-box open">${esc(r.content || '')}</div>
         <p class="kv" style="margin:0">Duyệt thì ${esc(r.staffName)} tự mở trình quản lý quảng cáo và chạy đúng như trên, ngân sách không vượt ${esc(vndUi(r.budgetCap))}/ngày.</p>
         <input name="answer" placeholder="Lý do nếu không duyệt">
         <div class="row"><button class="btn gold sm" type="submit" data-a="approve">Duyệt &amp; chạy quảng cáo</button><button class="btn sm danger" type="button" data-a="reject">Không duyệt</button></div>`
      : `<label>Nội dung sẽ đăng / gửi qua ${esc(r.linkName || 'phần mềm')} (sửa được trước khi duyệt)<textarea name="content" style="min-height:140px">${esc(r.content || '')}</textarea></label>
         <input name="answer" placeholder="Lý do nếu không duyệt (không bắt buộc)">
         <div class="row"><button class="btn gold sm" type="submit" data-a="approve">Duyệt &amp; đăng</button><button class="btn sm danger" type="button" data-a="reject">Không duyệt</button></div>`;
  const pic = r.imageId ? `<img class="post-img" data-image-id="${esc(r.imageId)}" alt="Ảnh kèm bài" width="1080" height="1080">` : '';
  return `<form class="card gold req stack tight" data-req="${r.id}">${head}${pic}${body}</form>`;
}
async function sendRequest(form, action) {
  const body = { action, answer: form.answer?.value || '' };
  if (form.content) body.content = form.content.value;
  const r = await act(() => api(`/api/requests/${form.dataset.req}`, { body }), action === 'reject' ? 'Đã gửi.' : 'Đã gửi — nhân viên làm tiếp.');
  if (r) { form.reset(); document.activeElement?.blur?.(); await loadActivity(); state.refresh?.(); }
}
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-req]');
  if (!f) return;
  e.preventDefault();
  sendRequest(f, e.submitter?.dataset.a || 'answer');
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('form[data-req] button[data-a="reject"]');
  if (b) sendRequest(b.closest('form'), 'reject');
  const t = e.target.closest('[data-task-open]');
  if (t) openView('tasks', t.dataset.taskOpen);
});
const typingReq = (box) => [...box.querySelectorAll('form[data-req] textarea, form[data-req] input')].some((i) => i === document.activeElement || (i.name === 'answer' && i.value));

VIEWS.requests = () => {
  const wrap = el(`<p class="kv" style="margin:0">Nhân viên làm việc thật: cần thông tin chỉ bạn biết thì hỏi, lần đầu mở phần mềm thì xin phép, muốn đăng gì thì xin duyệt. Việc dừng ở "Chờ người dùng" tới khi bạn trả lời.</p><div id="reqList" class="stack tight"></div>`);
  mount(wrap, async () => {
    const box = $('#reqList', wrap);
    if (typingReq(box)) return;
    const list = await api('/api/requests');
    box.innerHTML = list.length ? list.map((r) => requestCard(r)).join('') : '<p class="muted">Không có yêu cầu nào.</p>';
    loadPostImages(box);
  });
};

// Từng lượt làm việc thật của một bước (xem phần mềm, hỏi bạn, xin duyệt, nộp).
const TRACE_LABEL = { xem_phan_mem: 'Xem phần mềm', tim_tren_web: 'Tìm trên web', tao_anh: 'Thiết kế ảnh', hoi_nguoi_dung: 'Hỏi bạn', xin_duyet_dang: 'Xin duyệt', xin_duyet_quang_cao: 'Xin duyệt quảng cáo', nho_dong_nghiep: 'Nhờ đồng nghiệp', len_lich: 'Lên lịch đăng', nop: 'Nộp kết quả' };
function traceHtml(trace) {
  if (!trace?.length) return '';
  return `<ol class="trace">${trace.map((t) => `<li><b>${esc(TRACE_LABEL[t.hanhDong] || t.hanhDong)}</b>${t.chiTiet ? ` — ${esc(t.chiTiet)}` : ''}${t.ketQua == null ? ' <span class="pill gold">Đang chờ bạn</span>' : t.hanhDong === 'nop' ? '' : `<div class="kv">${esc(String(t.ketQua).slice(0, 400))}</div>`}</li>`).join('')}</ol>`;
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
  const wrap = el(`<p class="kv" style="margin:0">Tất cả phần mềm làm việc của văn phòng. Thêm phần mềm trong trang từng nhân viên (mục Phần mềm).</p>
    <div class="chips">${state.staff.map((s) => `<button class="chip" type="button" data-addlink="${s.id}">+ ${esc(s.name)}</button>`).join('')}</div>
    <div id="allLinks" class="stack"></div>`);
  wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-addlink]'); if (b) { state.sub = 'software'; openView('staff', b.dataset.addlink); } });
  const refresh = async (openId) => {
    const links = await api('/api/links');
    $('#allLinks', wrap).innerHTML = links.length ? links.map((l) => linkCard(l, true)).join('') : '<p class="muted">Chưa có phần mềm nào.</p>';
    if (openId) { const d = $(`[data-link="${openId}"]`, wrap); if (d) d.open = true; }
  };
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
    <form class="card form" id="resetStaff"><h3>Thiết lập lại toàn bộ nhân viên</h3>
      <p class="kv" style="margin:0">Đưa 10 nhân viên về vai trò chuẩn (Phân tích, Nội dung, Quảng cáo, Sale, CSKH, Kho, Kế toán, Quản lý, Nhân sự, Pháp lý). Đào tạo cũ được lưu vào lịch sử từng người (khôi phục được); lịch tự động thay bằng lịch mặc định (tắt sẵn). Phần mềm đã kết nối và API giữ nguyên.</p>
      <button class="btn" type="submit">Thiết lập lại</button></form>
    <form class="card form" id="delForm"><h3>Xoá văn phòng</h3>
      <p class="kv" style="margin:0">Xoá vĩnh viễn tài khoản cùng toàn bộ nhân sự, key API, việc, phiếu bán và hàng chờ Zalo. Không khôi phục được.</p>
      <label>Nhập mật khẩu để xác nhận <input name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn danger" type="submit">Xoá vĩnh viễn văn phòng này</button></form>`);
  bindResetStaff(wrap);
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
function bindResetStaff(wrap) {
  $('#resetStaff', wrap)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(await askConfirm('Thiết lập lại toàn bộ 10 nhân viên theo vai trò chuẩn? Đào tạo cũ vẫn nằm trong lịch sử từng người.', 'Thiết lập lại'))) return;
    if (await act(() => api('/api/staff/reset', { body: {} }), 'Đã thiết lập lại toàn bộ nhân viên.')) { await loadStaff(); renderDrawer(); }
  });
}
function trialSettings() {
  const wrap = el(`
    <section class="card gold stack"><h3>Bản trải nghiệm</h3>
      <p class="kv" style="margin:0">Văn phòng này chạy trong Claude: bộ não của mọi nhân viên là Claude qua tài khoản claude.ai của bạn (dùng hạn mức của tài khoản, lần đầu sẽ hỏi bạn cho phép). Dữ liệu lưu riêng cho tài khoản của bạn.</p>
      <p class="kv" style="margin:0">Gắn API riêng cho từng nhân viên, mã truy cập phần mềm đầy đủ và cầu nối Zalo chỉ có ở bản server (khi đưa ra ngoài).</p></section>
    <form class="card form" id="accForm"><h3>Tài khoản</h3>
      <label>Tên văn phòng <input name="officeName" value="${esc(state.me.officeName)}"></label>
      <label>Tên công ty (nhân viên dùng trong câu trả lời) <input name="companyName" value="${esc(state.me.companyName)}"></label>
      <button class="btn gold" type="submit">Lưu</button></form>
    <form class="card form" id="resetStaff"><h3>Thiết lập lại toàn bộ nhân viên</h3>
      <p class="kv" style="margin:0">Đưa 10 nhân viên về vai trò chuẩn (Phân tích, Nội dung, Quảng cáo, Sale, CSKH, Kho, Kế toán, Quản lý, Nhân sự, Pháp lý). Đào tạo cũ được lưu vào lịch sử từng người (khôi phục được); lịch tự động thay bằng lịch mặc định (tắt sẵn). Phần mềm đã kết nối và API giữ nguyên.</p>
      <button class="btn" type="submit">Thiết lập lại</button></form>
    <form class="card form" id="delForm"><h3>Xoá dữ liệu văn phòng</h3>
      <p class="kv" style="margin:0">Xoá toàn bộ việc, tin nhắn, phiếu, hàng chờ và đào tạo; văn phòng trở về trạng thái ban đầu.</p>
      <button class="btn danger" type="submit">Xoá và làm lại từ đầu</button></form>`);
  $('#accForm', wrap).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await act(() => api('/api/me', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }), 'Đã lưu.')) await loadMe();
  });
  bindResetStaff(wrap);
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
  const n = a.pendingRequests || 0;
  $('#reqCount').textContent = n;
  $('#reqBtn').classList.toggle('hidden', !n);
  if (n) { // ghi rõ ai đang chờ bạn
    const list = await api('/api/requests').catch(() => []);
    const who = [...new Set(list.filter((r) => r.status === 'pending').map((r) => r.staffName))];
    $('#reqWho').textContent = who.length ? `${who.join(', ')} đang chờ · bấm để xem tất cả` : 'Bấm để xem tất cả';
  }
  if (n > (state.lastPending ?? n)) toast(`Nhân viên đang chờ bạn (${n} yêu cầu). Bấm thẻ vàng ở đầu trang để xem hết.`, 7000);
  state.lastPending = n;
  const warn = a.storageWarning || state.me?.storageWarning || '';
  $('#notice').textContent = warn; $('#notice').classList.toggle('hidden', !warn);
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
