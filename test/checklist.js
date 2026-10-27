// Chạy checklist kiểm thử bắt buộc trong đặc tả trên một bản văn phòng tạm, với nhà cung cấp giả lập.
// Mọi key ở đây là placeholder dạng sk-...-PLACEHOLDER; mọi dữ liệu khách là dữ liệu test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { startFakeProvider } from './fake-provider.js';

const fake = await startFakeProvider();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpa-test-'));
Object.assign(process.env, {
  DATA_DIR: dir, VPA_ANTHROPIC_BASE_URL: fake.url, ANTHROPIC_API_KEY: 'sk-ant-default-PLACEHOLDER',
  APP_SECRET: 'test-secret', DEBATE_MINUTES: process.env.DEBATE_MINUTES || '10',
  VPA_KIOTVIET_ID_URL: fake.url, VPA_KIOTVIET_API_URL: fake.url, VPA_FACEBOOK_GRAPH_URL: fake.url, VPA_AUTOMATION_INTERVAL_MS: '1000',
  VPA_ALLOW_PRIVATE_BROWSE: 'true', VPA_SEARCH_URL: `${fake.url}/search?q=`, VPA_PLAYWRIGHT_PATH: process.env.VPA_PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright/index.js',
});

const results = [];
const check = (name, ok, evidence) => { results.push({ name, ok: !!ok, evidence }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(100); }
  return fn();
}

// Server chạy như tiến trình riêng để ca "đóng và mở lại app" là khởi động lại thật.
let portSeq = 4100 + Math.floor(Math.random() * 500);
async function startApp() {
  const port = portSeq++;
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
    env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'ignore', 'inherit'],
  });
  const base = `http://127.0.0.1:${port}`;
  await waitFor(() => fetch(`${base}/healthz`).then((r) => r.ok).catch(() => false), 10000);
  return { server: { close: (cb) => { child.once('exit', () => cb?.()); child.kill(); } }, base };
}

function client(base) {
  let cookie = '';
  return async (p, body, method) => {
    const r = await fetch(base + p, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    return { status: r.status, data: await r.json().catch(() => null) };
  };
}

let { server, base } = await startApp();
const A = client(base);
const B = client(base);
await A('/api/register', { username: 'test-a', password: 'matkhau-test-1', officeName: 'VP Test A', companyName: 'Long Phu Auto (TEST)' });
await B('/api/register', { username: 'test-b', password: 'matkhau-test-2', officeName: 'VP Test B', companyName: 'Cty B (TEST)' });

// --- Tách văn phòng theo tài khoản ---
{
  const sa = (await A('/api/staff')).data;
  await A('/api/staff/STAFF-001/training', { trainingText: 'Đào tạo riêng của văn phòng A (TEST)' }, 'PUT');
  const anB = (await B('/api/staff')).data.find((s) => s.id === 'STAFF-001');
  const anon = await client(base)('/api/staff');
  check('Mỗi tài khoản là văn phòng riêng', sa.length === 10 && anB.trainingVersion === 1 && anon.status === 401,
    `A có ${sa.length} nhân sự; B không thấy sửa đào tạo của A (v${anB.trainingVersion}); chưa đăng nhập → HTTP ${anon.status}`);
  const phuc = sa.find((s) => s.id === 'STAFF-007');
  check('Phúc là Quản lý, ngồi giữa dưới cùng', phuc.role === 'Quản lý' && phuc.seat.deskIndex === 9, `${phuc.name}: ${phuc.role}, ${phuc.seat.zone}`);
  check('Mặc định dùng Claude', sa.every((s) => s.currentBrain.source === 'claude_fallback' && s.currentBrain.label.includes('claude-opus-5-5')), sa[0].currentBrain.label);
}

// --- Ca Fanpage ---
{
  await A('/api/chat/group', { text: 'Cả nhóm ơi, làm sao tăng like Fanpage?' });
  const msgs = await waitFor(async () => { const m = (await A('/api/messages/group')).data; return !m.busy && m.messages.length >= 5 && m; });
  const answers = msgs.messages.filter((m) => m.sender !== 'user');
  const order = answers.map((m) => m.sender);
  const texts = answers.map((m) => m.text);
  const groupCalls = fake.state.calls.slice(-4).map((c) => c.body.system);
  check('Chat nhóm: người sau xét từng câu trả lời trước, Phúc kết luận ý tốt nhất', !/xét LẦN LƯỢT TỪNG câu trả lời của đồng nghiệp/.test(groupCalls[0])
    && groupCalls.slice(1, 3).every((x) => /xét LẦN LƯỢT TỪNG câu trả lời của đồng nghiệp/.test(x)) && order.at(-1) === 'STAFF-007' && /ghi rõ ý đó của ai/.test(groupCalls[3]),
    `Thứ tự: ${order.join(' → ')}; Bình và An được yêu cầu xét từng câu trước; Phúc kết luận cuối`);
  check('Ca Fanpage', order[0] === 'STAFF-003' && order.includes('STAFF-001') && order.includes('STAFF-002') && !order.includes('STAFF-006')
    && new Set(texts).size === texts.length && answers.every((m) => m.brainLabel),
    `Người trả lời theo thứ tự: ${order.join(', ')} (Tuấn đầu tiên, không có Kế toán); ${new Set(texts).size}/${texts.length} câu khác nhau; mỗi câu có nhãn bộ não`);
  const sysTuan = fake.state.calls.at(-3).body.system;
  check('Giao thức suy nghĩ bắt buộc có trong mọi lượt', fake.state.calls.every((c) => c.body.system.includes('GIAO THỨC SUY NGHĨ BẮT BUỘC')),
    `${fake.state.calls.length} lượt gọi đều chứa giao thức; ví dụ lượt của Tuấn: "${sysTuan.slice(0, 60)}…"`);
  check('Model mặc định + fallback an toàn', fake.state.calls.every((c) => c.body.model === 'claude-opus-5-5' && c.body.fallbacks === 'default'),
    `model=${fake.state.calls[0].body.model}, fallbacks=${fake.state.calls[0].body.fallbacks}, beta=${fake.state.calls[0].beta}`);
}

// --- Ca hỏi đích danh ---
{
  const before = (await A('/api/messages/group')).data.messages.length;
  await A('/api/chat/group', { text: 'An ơi, hook bài tuần này thế nào?' });
  const m = await waitFor(async () => { const d = (await A('/api/messages/group')).data; return !d.busy && d.messages.length > before + 1 && d; });
  const newOnes = m.messages.slice(before).filter((x) => x.sender !== 'user');
  check('Ca hỏi đích danh', newOnes.length === 1 && newOnes[0].sender === 'STAFF-001', `Trả lời: ${newOnes.map((x) => x.sender).join(', ')}`);
}

// --- Ca tham vấn ---
{
  await A('/api/staff/STAFF-004/consult', { question: 'Khách hỏi giảm giá 10% có nên nhận không?', colleagueIds: ['STAFF-006', 'STAFF-010', 'STAFF-007'] });
  const d = await waitFor(async () => { const r = (await A('/api/messages/consult:STAFF-004')).data; return r.messages.some((x) => x.text.startsWith('QUYẾT ĐỊNH')) && r; });
  const ops = d.messages.filter((x) => ['STAFF-006', 'STAFF-010', 'STAFF-007'].includes(x.sender));
  const dec = d.messages.find((x) => x.sender === 'STAFF-004' && x.text.startsWith('QUYẾT ĐỊNH'));
  check('Ca tham vấn', ops.length === 3 && ops.every((o) => o.brainLabel) && dec && /Đã đọc 3 lượt/.test(dec.text),
    `3 đồng nghiệp trả lời kèm nhãn bộ não; Sơn chốt sau khi đọc ý kiến: "${dec?.text.slice(0, 90)}…"`);
}

// --- Ca kiểm tra đạt nhưng chat lỗi 400 ---
{
  const cfg = (await A('/api/apis/STAFF-002', { provider: 'anthropic', role: 'general', apiKey: 'sk-ant-lowcredit-PLACEHOLDER' })).data;
  const callsBefore = fake.state.calls.length;
  const chk = (await A(`/api/api-config/${cfg.id}/check`, {})).data;
  const noProbe = fake.state.calls.length === callsBefore;
  await A('/api/chat/staff/STAFF-002', { text: 'Ngân sách quảng cáo tuần này nên chia thế nào?' });
  const d = await waitFor(async () => { const r = (await A('/api/messages/staff:STAFF-002')).data; return !r.busy && r.messages.length >= 3 && r; });
  const err = d.messages.find((x) => x.isError);
  const ans = d.messages.filter((x) => !x.isError && x.sender === 'STAFF-002').at(-1);
  check('Ca kiểm tra đạt nhưng chat lỗi 400', chk.ok && noProbe && cfg.keyLast4 === 'LDER' && !JSON.stringify(cfg).includes('lowcredit')
    && err?.text.includes('HTTP 400') && err.text.includes('credit balance is too low') && /Kiểm tra chỉ liệt kê/.test(chk.note)
    && ans?.brainLabel.includes('dự phòng'),
    `Kiểm tra: ok=${chk.ok}, không gửi câu hỏi thử=${noProbe}, chỉ hiện ···${cfg.keyLast4}; lỗi chat: "${err?.text.slice(0, 140)}"; nhãn dự phòng: "${ans?.brainLabel.slice(0, 120)}…"`);
  const badChk = (await A('/api/apis/list-models', { provider: 'anthropic', apiKey: 'sk-ant-bad-PLACEHOLDER' })).data;
  check('Liệt kê model để người dùng tự chọn', (await A('/api/apis/list-models', { provider: 'anthropic', apiKey: 'sk-ant-x-PLACEHOLDER' })).data.models.length === 2 && !badChk.ok && badChk.error.includes('401'),
    `key tốt → danh sách 2 model; key xấu → "${badChk.error}"`);
}

// --- Ca bộ não lỗi ---
{
  fake.state.failDefault = true;
  const t = (await A('/api/tasks', { title: 'Thống kê doanh thu tuần (TEST)', kind: 'individual', assigneeIds: ['STAFF-006'] })).data;
  const d = await waitFor(async () => { const r = (await A(`/api/tasks/${t.id}`)).data.task; return r.lastError && r; });
  check('Ca bộ não lỗi', d.status === 'in_progress' && d.lastError.includes('529') && d.lastError.includes('Overloaded') && d.outputs.every((o) => !o.text),
    `Trạng thái giữ "${d.status}" để thử lại; lý do thật: "${d.lastError.slice(0, 120)}"; không có câu mẫu dưới tên Hà`);
  fake.state.failDefault = false;
  await A(`/api/tasks/${t.id}/retry`, {});
  const d2 = await waitFor(async () => { const r = (await A(`/api/tasks/${t.id}`)).data.task; return r.status === 'done' && r; });
  check('Thử lại sau khi bộ não hồi phục', d2?.status === 'done', `Sau thử lại: ${d2?.status}`);
  const steps = d2.outputs.map((o) => `${o.step} (${o.staffName})`);
  check('Việc riêng: bản nháp → đồng nghiệp phản biện từng điểm → bản cuối', d2.outputs.length === 3 && d2.outputs[1].staffId !== 'STAFF-006' && /Phản biện của/.test(d2.outputs[1].step) && /▸/.test(d2.outputs[1].text),
    steps.join(' → '));
}

// --- Ca tranh luận việc chung ---
{
  const img = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex').toString('base64');
  const t = (await A('/api/tasks', { title: 'Lên chiến dịch quảng cáo cho sản phẩm mới', kind: 'general', attachments: [{ fileName: 'sp.png', mimeType: 'image/png', data: img, productName: 'Bơm xe (TEST)', priceNote: '350.000đ' }] })).data;
  const d = await waitFor(async () => { const r = (await A(`/api/tasks/${t.id}`)).data; return r.task.status === 'done' && r; }, 15000);
  const s = d.session;
  check('Ca tranh luận việc chung (tự chốt)', s.status === 'closed_by_keyword' && s.finalSummary && d.task.outputs.length >= d.task.assigneeIds.length
    && fake.state.calls.some((c) => c.body.messages[0].content.some((b) => b.type === 'image')) && s.turns[0].staffId === 'STAFF-003',
    `Người tham gia: ${d.task.assigneeIds.join(', ')}; ${s.turns.length} lượt; đóng: ${s.status}; Phúc chốt; ${d.task.outputs.length} kết quả thực hiện; ảnh + giá đã gửi vào bối cảnh`);
  const phases = s.turns.filter((x) => x.phase).map((x) => x.phase);
  const count = (p) => phases.filter((x) => x === p).length;
  const n = d.task.assigneeIds.length;
  check('Phản biện chéo đủ 4 vòng rồi Phúc chọn', ['propose', 'critique', 'revise', 'score'].every((p) => count(p) === n) && count('judge') === 1
    && phases.indexOf('critique') > phases.lastIndexOf('propose') && phases.indexOf('judge') > phases.lastIndexOf('score'),
    `Các vòng: ${['propose', 'critique', 'revise', 'score', 'judge'].map((p) => `${p}×${count(p)}`).join(', ')}`);
  const proposeCalls = fake.state.calls.filter((c) => /VÒNG 1 — ĐỀ XUẤT ĐỘC LẬP/.test(c.body.system));
  const critiqueCalls = fake.state.calls.filter((c) => /VÒNG 2 — PHẢN BIỆN CHÉO/.test(c.body.system));
  const ownExcluded = critiqueCalls.every((c) => { const who = /Bạn là (.+?), vai trò/.exec(c.body.system)[1]; const ids = /Mã đề xuất cần xét: ([P\d, ]+)/.exec(c.body.system)[1].match(/P\d+/g); return ids.length === n - 1 && !new RegExp(`### P\\d \\(${who} `).test(c.body.system); });
  check('Đề xuất độc lập; phản biện từng đề xuất của người khác, không tự phản biện', proposeCalls.length >= n && proposeCalls.every((c) => /Các lượt nói trước: \[\]/.test(c.body.system)) && ownExcluded,
    `Đề xuất độc lập của ${[...new Set(proposeCalls.map((c) => /Bạn là (.+?),/.exec(c.body.system)[1]))].join(', ')} (lượt trước trống); mỗi người phản biện ${n - 1} đề xuất của người khác`);
  check('Bảng điểm phản biện và chấm lại (không tự chấm)', d.session.scoreboard.length === n && d.session.scoreboard.every((b) => b.critiqueScore !== null && b.finalScore !== null && b.revised),
    d.session.scoreboard.map((b) => `${b.proposalId} ${b.authorName}: ${b.critiqueScore} → ${b.finalScore}`).join('; '));
  const ex = d.task.outputs.map((o) => `${o.step?.split(':')[0]}:${o.staffName}`);
  check('Ý của ai tốt thì dùng: giao bước theo ý tưởng, không theo vai trò; Phúc kiểm tra từng kết quả', ex[0] === 'Bước 1:An' && ex[1] === 'Bước 2:Tuấn' && /Phúc kiểm tra/.test(d.task.outputs.at(-1).step) && /Bước 1: ĐẠT/.test(d.task.outputs.at(-1).text) && /ý của An/.test(s.finalSummary),
    `${ex.join(' → ')}; bản chốt: "${s.finalSummary.split('\n').find((l) => l.includes('của An'))}"`);
  const sys = fake.state.calls.at(-1).body.system;
  check('Dữ kiện thật nội bộ trong mỗi lượt, nguồn chưa nối ghi "chưa cập nhật"', /"phieuBanHang"/.test(sys) && /chưa cập nhật/.test(sys),
    `Lượt gần nhất mang dữ kiện: ${/Dữ kiện thật đã có: (.{0,160})/.exec(sys)?.[1]}…`);
  fake.state.failReview = true;
  const tr = (await A('/api/tasks', { title: 'Tăng tương tác Fanpage tuần này (TEST)', kind: 'general', assigneeIds: ['STAFF-001', 'STAFF-003'] })).data;
  const dr = await waitFor(async () => { const r = (await A(`/api/tasks/${tr.id}`)).data; return r.task.status === 'returned_for_redo' && r; }, 15000);
  fake.state.failReview = false;
  await A(`/api/tasks/${tr.id}/retry`, {});
  const dr2 = await waitFor(async () => { const r = (await A(`/api/tasks/${tr.id}`)).data; return r.task.status === 'done' && r; }, 15000);
  check('Phúc kiểm tra thấy bước chưa đạt → trả làm lại kèm lý do, làm lại thì đạt', dr?.task.status === 'returned_for_redo' && /Bước 1/.test(dr.task.returnReason) && dr.task.passCriteria && dr2?.task.status === 'done',
    `Trả lại: "${dr?.task.returnReason}" — tiêu chí: "${dr?.task.passCriteria}"; sau làm lại: ${dr2?.task.status}`);
  const t2 = (await A('/api/tasks', { title: 'Kế hoạch bán hàng quý (TEST)', kind: 'general' })).data;
  await A(`/api/tasks/${t2.id}/say`, { text: 'chốt công việc' });
  const d2 = await waitFor(async () => { const r = (await A(`/api/tasks/${t2.id}`)).data; return r.session.status !== 'running' && r; });
  const t3 = (await A('/api/tasks', { title: 'Kế hoạch tồn kho (TEST)', kind: 'general' })).data;
  await A(`/api/tasks/${t3.id}/say`, { text: 'dừng' });
  const d3 = await waitFor(async () => { const r = (await A(`/api/tasks/${t3.id}`)).data; return r.session.status !== 'running' && r; });
  const deadlineMin = (Date.parse(d2.session.deadlineAt) - Date.parse(d2.session.startedAt)) / 60000;
  check('Ca tranh luận: đóng khi gõ "chốt công việc", "dừng", hạn 10 phút', d2.session.status === 'closed_by_keyword' && d3.session.status === 'closed_by_keyword' && deadlineMin === 10,
    `"chốt công việc" → ${d2.session.status}; "dừng" → ${d3.session.status}; hạn phiên = ${deadlineMin} phút thực tế`);
}

// --- Ca Quản lý dừng việc ---
{
  const t = (await A('/api/tasks', { title: 'Đăng bài khuyến mại (TEST)', kind: 'individual', assigneeIds: ['STAFF-008'] })).data;
  await A(`/api/tasks/${t.id}/legal-clear`, {});
  const z = (await A('/api/zalo/queue', { staffId: 'STAFF-008', content: 'Khuyến mại 10% (TEST)', taskId: t.id })).data;
  const stop = (await A(`/api/tasks/${t.id}/stop`, { reason: 'Giá khuyến mại chưa được Kế toán xác nhận' })).data;
  const zAfter = (await A('/api/zalo')).data.queue.find((q) => q.id === z.id);
  const enqueueBlocked = await A('/api/zalo/queue', { staffId: 'STAFF-008', content: 'Gửi lại (TEST)', taskId: t.id });
  const retryBlocked = await A(`/api/tasks/${t.id}/retry`, {});
  check('Ca Quản lý dừng việc', stop.legalCleared && stop.status === 'stopped_by_manager' && stop.stopReason.includes('Kế toán') && zAfter.status === 'error' && enqueueBlocked.status === 400 && retryBlocked.status === 400,
    `Pháp lý đã cho qua nhưng việc → ${stop.status}; lý do ghi: "${stop.stopReason}"; lượt Zalo liên quan → ${zAfter.status}; xếp gửi mới → HTTP ${enqueueBlocked.status}; tự tiếp tục → HTTP ${retryBlocked.status}`);
}

// --- Ca phiếu bán hàng thiếu thông tin ---
let slipId;
{
  const full = { customerName: 'Khách Test', customerPhone: '0900000000', customerAddress: 'Địa chỉ test', productNameAndCode: 'Bơm xe BX-01 (TEST)', quantity: 2, paymentMethod: 'COD' };
  const missing = await A('/api/slips', { ...full, customerAddress: '' });
  const zeroQty = await A('/api/slips', { ...full, quantity: 0 });
  const ok = (await A('/api/slips', full)).data;
  slipId = ok.id;
  const earlyArchive = await A(`/api/slips/${ok.id}/archive`, {});
  const earlyAcc = await A(`/api/slips/${ok.id}/accounting-signoff`, {});
  for (const st of ['stock_checked', 'preparing', 'delivered']) await A(`/api/slips/${ok.id}/warehouse`, { status: st });
  const noGroup = await A(`/api/slips/${ok.id}/warehouse`, { status: 'delivery_photo_recorded', photo: { sourceGroupName: '' } });
  await A(`/api/slips/${ok.id}/warehouse`, { status: 'delivery_photo_recorded', photo: { sourceGroupName: 'Nhóm giao hàng nội bộ (TEST)', note: 'Đã giao' } });
  const beforeAcc = await A(`/api/slips/${ok.id}/archive`, {});
  await A(`/api/slips/${ok.id}/accounting-signoff`, {});
  const archived = (await A(`/api/slips/${ok.id}/archive`, {})).data;
  check('Ca phiếu bán hàng thiếu thông tin', missing.status === 400 && /customerAddress/.test(missing.data.error) && /hỏi thêm khách/.test(missing.data.error)
    && zeroQty.status === 400 && ok.id === 'PBH-00001' && earlyArchive.status === 400 && earlyAcc.status === 400 && noGroup.status === 400 && beforeAcc.status === 400
    && archived.archivedAt && archived.signatures.length === 3 && archived.deliveryPhoto.sourceGroupName.includes('Nhóm giao hàng'),
    `Thiếu địa chỉ → "${missing.data.error}"; SL=0 → ${zeroQty.status}; đủ 6 trường → ${ok.id}; lưu trữ sớm → ${earlyArchive.status} ("${earlyArchive.data.error}"); ảnh không tên nhóm → ${noGroup.status}; chưa ký Kế toán → ${beforeAcc.status}; cuối cùng lưu trữ với ${archived.signatures.length} chữ ký`);
}

// --- Ca Zalo không biên nhận ---
let zIds = [];
{
  const code = (await A('/api/zalo/link-codes', {})).data.code;
  const linked = await fetch(`${base}/bridge/link`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) }).then((r) => r.json());
  const reuse = await fetch(`${base}/bridge/link`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) });
  const bridge = (p, body = {}) => fetch(`${base}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${linked.token}` }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, data: await r.json() }));
  await bridge('/bridge/heartbeat');
  const z1 = (await A('/api/zalo/queue', { staffId: 'STAFF-005', content: 'Báo giao đơn PBH-00001 (TEST)', target: 'Nhóm giao hàng' })).data;
  const z2 = (await A('/api/zalo/queue', { staffId: 'STAFF-004', content: 'Báo khách đơn đã tạo (TEST)' })).data;
  const zChi = (await A('/api/zalo/queue', { staffId: 'STAFF-008', content: 'Combo tri ân (TEST)' })).data;
  zIds = [z1.id, z2.id, zChi.id];
  const s1 = await A(`/api/zalo/queue/${z1.id}/send`, {});
  const s2 = await A(`/api/zalo/queue/${z2.id}/send`, {});
  const sendingCount = (await A('/api/zalo')).data.queue.filter((q) => q.status === 'sending').length;
  const noReceipt = (await bridge('/bridge/result', { id: z1.id, reply: 'ok' })).data;
  const chiBlocked = await A(`/api/zalo/queue/${zChi.id}/send`, {});
  const claimed = (await bridge('/bridge/next')).data.item;
  const done = (await bridge('/bridge/result', { id: claimed.id, receipt: 'RCPT-TEST-1', reply: 'Đã xem' })).data;
  // tắt worker: thu hồi cầu nối
  await A('/api/zalo/bridges/revoke', {});
  await A(`/api/zalo/queue/${zChi.id}/approve`, {});
  const offline = await A(`/api/zalo/queue/${zChi.id}/send`, {});
  const zChiAfter = (await A('/api/zalo')).data.queue.find((q) => q.id === zChi.id);
  check('Ca Zalo không biên nhận', /^ZL-/.test(z1.id) && noReceipt.status === 'error' && /không có biên nhận/.test(noReceipt.providerError)
    && s1.status === 200 && s2.status === 400 && sendingCount === 1 && offline.status === 400 && /Worker Zalo đang tắt/.test(offline.data.error) && zChiAfter.status === 'queued'
    && done.status === 'done' && done.receipt && chiBlocked.status === 400 && reuse.status === 400,
    `Không biên nhận → ${noReceipt.status} ("${noReceipt.providerError}"); gửi đồng thời: chỉ ${sendingCount} ở sending, cái thứ hai → "${s2.data.error}"; có biên nhận → ${done.status}; Chi chưa duyệt → "${chiBlocked.data.error}"; worker tắt → "${offline.data.error}", nhiệm vụ vẫn ${zChiAfter.status}; mã liên kết dùng lại → HTTP ${reuse.status}`);
}

// --- Ca dữ liệu bền vững: đóng và mở lại app ---
{
  const before = (await A('/api/overview')).data;
  const zBefore = (await A('/api/zalo')).data.queue.map((q) => `${q.id}:${q.status}`).sort().join(',');
  await A('/api/staff/STAFF-005/links', { softwareName: 'KiotViet', url: 'https://example.invalid/kiotviet', accessCode: 'ma-truy-cap-PLACEHOLDER', status: 'connected' });
  const linksBefore = (await A('/api/overview')).data.softwareLinks;
  await new Promise((r) => server.close(r));
  ({ server, base } = await startApp());
  const A2 = client(base);
  await A2('/api/login', { username: 'test-a', password: 'matkhau-test-1' });
  const after = (await A2('/api/overview')).data;
  const zAfter = (await A2('/api/zalo')).data.queue.map((q) => `${q.id}:${q.status}`).sort().join(',');
  const link = (await A2('/api/staff')).data.find((s) => s.id === 'STAFF-005').softwareLinks[0];
  check('Ca dữ liệu bền vững', after.staff === 10 && after.tasks === before.tasks && after.softwareLinks === linksBefore && zAfter === zBefore && link.accessCodeLast4 === 'LDER' && !JSON.stringify(link).includes('ma-truy-cap'),
    `Sau khi mở lại: ${after.staff} nhân sự, ${after.tasks} việc, ${after.softwareLinks} liên kết (chỉ hiện ···${link.accessCodeLast4}), hàng chờ Zalo khớp: ${zAfter === zBefore}`);
}

// --- Cài đặt chi tiết từng nhân sự, phần mềm làm việc, tự học, lịch tự động ---
{
  const S = client(base);
  await S('/api/login', { username: 'test-a', password: 'matkhau-test-1' });
  // Đào tạo nhiều mục → đưa vào prompt
  const tr = (await S('/api/staff/STAFF-004/training', { training: { prompt: 'Bạn là Sale Long Phu Auto (TEST)', skills: 'Tư vấn phụ tùng đầu kéo Mỹ (TEST)', rules: 'Không bịa giá (TEST)', limits: 'Không tự giảm giá (TEST)' } }, 'PUT')).data;
  // Hồ sơ đầy đủ
  const pf = await S('/api/staff/STAFF-004/profile', { name: 'Sơn', role: 'Sale bán hàng', shortLabel: 'Sale', color: '#e23b3b', tools: 'KiotViet, Messenger', autoLearn: true }, 'PUT');
  // KiotViet: sai mã → hết hạn; đúng → kết nối, đồng bộ sản phẩm thật
  await S('/api/staff/STAFF-004/links', { softwareName: 'KiotViet', url: 'https://longphu-test.kiotviet.vn', kind: 'kiotviet', purpose: 'Tra giá và tồn kho khi khách hỏi', retailer: 'longphu-test', clientId: 'kv-client', accessCode: 'sai-PLACEHOLDER' });
  let link = (await S('/api/staff')).data.find((s) => s.id === 'STAFF-004').softwareLinks.find((l) => l.kind === 'kiotviet');
  const bad = (await S(`/api/links/${link.id}/check`, {})).data;
  await S(`/api/links/${link.id}`, { accessCode: 'kv-secret-PLACEHOLDER' }, 'PUT');
  const ok = (await S(`/api/links/${link.id}/check`, {})).data;
  const sync = (await S(`/api/links/${link.id}/sync`, {})).data;
  const before = fake.state.calls.length;
  await S('/api/chat/staff/STAFF-004', { text: 'Khách hỏi phốt bánh Fleetrite còn hàng không, giá bao nhiêu?' });
  await waitFor(async () => fake.state.calls.length > before && !(await S('/api/messages/staff:STAFF-004')).data.busy);
  const sys = fake.state.calls.slice(before).map((c) => c.body.system).find((x) => /Bạn là Sơn/.test(x)) || '';
  check('Đào tạo nhiều mục và hồ sơ đầy đủ', tr.trainingVersion >= 2 && /\[Kỹ năng chuyên môn\]/.test(sys) && /Không tự giảm giá/.test(sys) && pf.status === 200 && pf.data.tools === 'KiotViet, Messenger',
    `đào tạo v${tr.trainingVersion}; prompt có các mục Kỹ năng / Quy tắc / Giới hạn; công cụ: ${pf.data.tools}`);
  check('KiotViet: kiểm tra kết nối thật, đồng bộ sản phẩm, nhân viên dùng giá + tồn kho khi trả lời khách', !bad.ok && /Client secret không đúng/.test(bad.message) && bad.link.status === 'expired'
    && ok.ok && /HTTP 200/.test(ok.message) && sync.ok && sync.link.data.count === 3 && /FLTWS47691/.test(sys) && /"gia":450000/.test(sys) && /"ton":12/.test(sys) && sync.link.logs.length >= 3,
    `sai mã → "${bad.message}" (${bad.link.status}); đúng → "${ok.message}"; ${sync.message}; nhật ký ${sync.link.logs.length} dòng; prompt của Sơn có mã FLTWS47691, giá 450000, tồn 12`);
  // Fanpage
  await S('/api/staff/STAFF-001/links', { softwareName: 'Fanpage Phụ Tùng', url: 'https://www.facebook.com/phutung-test', kind: 'facebook_page', pageId: 'fbpage-test', accessCode: 'fb-token-PLACEHOLDER', purpose: 'Đăng bài, đọc tương tác' });
  const fl = (await S('/api/staff')).data.find((s) => s.id === 'STAFF-001').softwareLinks.find((l) => l.kind === 'facebook_page');
  const fcheck = (await S(`/api/links/${fl.id}/check`, {})).data;
  const fsync = (await S(`/api/links/${fl.id}/sync`, {})).data;
  const fdata = (await S(`/api/links/${fl.id}/data`)).data;
  check('Fanpage: kiểm tra kết nối, lấy bài đăng, lượt thích và bình luận mới', fcheck.ok && /1234 lượt thích/.test(fcheck.message) && fsync.ok && fdata.items[0].luotThich === 41 && /Giá sao shop/.test(fdata.items[0].binhLuanMoi[0]),
    `${fcheck.message}; ${fsync.message}; bài 1: ${fdata.items[0].luotThich} thích, bình luận: "${fdata.items[0].binhLuanMoi[0]}"`);
  // Nhập dữ liệu CSV xuất từ KiotViet
  await S('/api/staff/STAFF-005/links', { softwareName: 'KiotViet kho', url: 'https://longphu-test.kiotviet.vn', kind: 'other' });
  const kl = (await S('/api/staff')).data.find((s) => s.id === 'STAFF-005').softwareLinks[0];
  const imp = (await S(`/api/links/${kl.id}/import`, { text: 'Mã hàng,Tên hàng,Giá bán,Tồn kho\nAB-1,"Má phanh Mỹ, loại A (TEST)",320000,7\nAB-2,Bố thắng (TEST),150000,0' })).data;
  const kd = (await S(`/api/links/${kl.id}/data`)).data;
  check('Nhập dữ liệu: đọc bảng CSV xuất từ KiotViet thành sản phẩm', imp.ok && kd.total === 2 && kd.items[0].ten === 'Má phanh Mỹ, loại A (TEST)' && kd.items[0].gia === 320000 && kd.items[0].ton === 7, `${imp.message}; dòng 1: ${JSON.stringify(kd.items[0])}`);
  // Tự học: việc riêng của Hà ở ca trước đã xong → bài học trong đào tạo
  const ha = await waitFor(async () => { const s = (await S('/api/staff')).data.find((x) => x.id === 'STAFF-006'); return /\[TEST\] Hà/.test(s.training.lessons) && s; }, 8000);
  check('Tự học sau mỗi việc: Trang rút bài học, thành phiên bản đào tạo mới', ha && ha.trainingHistory.some((h) => /Tự học/.test(h.note)),
    ha ? `Bài học của Hà: "${ha.training.lessons.split('\n').at(-1)}"; lịch sử: ${ha.trainingHistory.map((h) => `v${h.version} ${h.note}`).join(' · ')}` : 'chưa có bài học');
  // Lịch tự động: đến giờ thì tự giao việc và chạy
  const rt = await S('/api/staff/STAFF-002/routines', { routines: [{ time: '00:00', title: 'Rà quảng cáo đang chạy (TEST)', description: 'Kiểm tra chi phí mỗi tin nhắn' }] }, 'PUT');
  const auto = await waitFor(async () => (await S('/api/tasks')).data.find((t) => /Rà quảng cáo đang chạy/.test(t.title) && t.status === 'done'), 15000);
  const after = (await S('/api/staff')).data.find((x) => x.id === 'STAFF-002').routines[0];
  check('Lịch tự động: đến giờ tự giao việc, chạy xong, không chạy lại trong ngày', rt.status === 200 && auto && auto.createdBy === 'system' && after.lastRunDate,
    auto ? `việc "${auto.title}" do hệ thống tạo → ${auto.status}; đã chạy ngày ${after.lastRunDate}` : 'không thấy việc tự động');
}

// --- Nhân viên tự điều khiển trình duyệt; hỏi trực tiếp về việc đã giao ---
{
  const W = client(base);
  await W('/api/login', { username: 'test-a', password: 'matkhau-test-1' });
  const links = (await W('/api/staff/STAFF-004/links', { softwareName: 'KiotViet web (TEST)', url: `${fake.url}/kv-web/`, kind: 'other', purpose: 'Tra giá và tồn kho' })).data;
  const web = links.find((l) => l.softwareName === 'KiotViet web (TEST)');
  const started = await W(`/api/links/${web.id}/browse`, { goal: 'Lấy giá và tồn kho' });
  const done = await waitFor(async () => { const l = (await W('/api/links')).data.find((x) => x.id === web.id); return !l.browsing && l.logs.some((g) => /Kết quả/.test(g.action)) && l; }, 60000);
  const wd = (await W(`/api/links/${web.id}/data`)).data;
  const logText = (done?.logs || []).map((g) => `${g.action}${g.ok ? '' : ' ✕'}: ${g.detail}`).reverse().join(' | ');
  const before = fake.state.calls.length;
  await W('/api/chat/staff/STAFF-004', { text: 'Lọc gió Vios WEB-001 giá bao nhiêu?' });
  await waitFor(async () => fake.state.calls.length > before, 8000);
  const sys = fake.state.calls.slice(before).map((c) => c.body.system).join('\n');
  check('Nhân viên tự mở trình duyệt, bấm vào phần mềm, lấy dữ liệu (chỉ đọc, không bấm nút xoá)', started.status === 200 && done?.status === 'connected' && wd.total === 2 && wd.items[0].ma === 'WEB-001' && wd.items[0].gia === 185000
    && /Không bấm "Xóa dữ liệu"/.test(logText) && /WEB-001/.test(sys) && /185000/.test(sys), started.status === 200 ? logText : JSON.stringify(started.data));
  const lg = (await W('/api/staff/STAFF-004/links', { softwareName: 'KiotViet đăng nhập (TEST)', url: `${fake.url}/kv-login/`, kind: 'other' })).data.find((l) => l.softwareName === 'KiotViet đăng nhập (TEST)');
  await W(`/api/links/${lg.id}/browse`, {});
  const lgDone = await waitFor(async () => { const l = (await W('/api/links')).data.find((x) => x.id === lg.id); return !l.browsing && l.logs.some((g) => /Kết quả/.test(g.action)) && l; }, 30000);
  check('Gặp trang đăng nhập: dừng, chuyển "Hết hạn", không tự đăng nhập', lgDone?.status === 'expired' && lgDone.logs.some((g) => g.action === 'Cần đăng nhập'), lgDone ? `${lgDone.status}; ${lgDone.logs[0].detail}` : 'không xong');

  // Làm việc thật: lần đầu nhân viên xin phép truy cập phần mềm, việc dừng chờ; cho phép thì tự xem phần mềm rồi làm tiếp.
  const t = (await W('/api/tasks', { title: 'Soạn báo giá phốt Fleetrite cho khách (TEST)', kind: 'individual', assigneeIds: ['STAFF-004'] })).data;
  const wait1 = await waitFor(async () => { const d = (await W(`/api/tasks/${t.id}`)).data; return d.task.status === 'waiting_user' && d.requests[0] && d; }, 15000);
  const rq = wait1?.requests[0];
  const pend = (await W('/api/activity')).data.pendingRequests;
  await W(`/api/requests/${rq?.id}`, { action: 'approve' });
  const doneT = await waitFor(async () => {
    const d = (await W(`/api/tasks/${t.id}`)).data;
    for (const r of d.requests.filter((x) => x.status === 'pending')) await W(`/api/requests/${r.id}`, { action: 'approve' });
    return d.task.status === 'done' && d;
  }, 60000);
  const draft = doneT?.task.outputs.find((o) => o.key === 'draft');
  check('Làm việc thật: xin phép truy cập phần mềm → chờ người dùng → được phép thì tự xem phần mềm, dùng số liệu thật',
    rq?.type === 'access' && /xin phép truy cập/.test(rq.question) && pend >= 1 && draft?.trace?.[0]?.hanhDong === 'xem_phan_mem' && /Dữ liệu .*mục/.test(draft.trace[0].ketQua) && doneT.task.status === 'done',
    rq ? `${rq.staffName}: "${rq.question}" → cho phép → ${draft?.trace?.map((x) => `${x.hanhDong}: ${String(x.ketQua).slice(0, 70)}`).join(' | ')}` : 'không thấy yêu cầu');
  const b2 = fake.state.calls.length;
  const ask = await W(`/api/tasks/${t.id}/ask`, { question: 'Báo giá đã gửi khách chưa, giá bao nhiêu?', staffId: 'STAFF-004' });
  const qa = await waitFor(async () => { const q = (await W(`/api/tasks/${t.id}`)).data.qa; return q?.[0]?.answer && q; }, 10000);
  const askSys = fake.state.calls.slice(b2).map((c) => c.body.system).find((x) => /NGƯỜI DÙNG ĐANG HỎI BẠN/.test(x)) || '';
  const wrong = await W(`/api/tasks/${t.id}/ask`, { question: 'x', staffId: 'STAFF-009' });
  check('Hỏi dưới mỗi việc: đúng người làm việc trả lời, dựa trên tiến độ và kết quả của việc', ask.status === 200 && qa?.[0].staffId === 'STAFF-004' && /Sơn/.test(qa[0].answer)
    && /Soạn báo giá phốt Fleetrite/.test(askSys) && /ketQuaTungBuoc/.test(askSys) && wrong.status === 400,
    qa ? `${qa[0].staffName}: "${qa[0].answer.slice(0, 90)}"; hỏi người ngoài việc → ${wrong.status} "${wrong.data.error}"` : JSON.stringify(ask.data));
}

// --- Làm việc thật: hỏi người dùng, soạn bài và xin duyệt, duyệt xong tự đăng lên Fanpage ---
{
  const K = client(base);
  await K('/api/login', { username: 'test-a', password: 'matkhau-test-1' });
  const t1 = (await K('/api/tasks', { title: '(HỎI) Lên kế hoạch tăng like Fanpage (TEST)', kind: 'individual', assigneeIds: ['STAFF-001'] })).data;
  // An có phần mềm được giao thì xin phép mở trước (cho phép), rồi hỏi người dùng số like (trả lời).
  const w1 = await waitFor(async () => {
    const d = (await K(`/api/tasks/${t1.id}`)).data;
    for (const r of d.requests.filter((x) => x.status === 'pending' && x.type === 'access')) await K(`/api/requests/${r.id}`, { action: 'approve' });
    return d.requests.find((r) => r.type === 'info' && r.status === 'pending') && d;
  }, 30000);
  const info = w1?.requests.find((r) => r.type === 'info');
  await K(`/api/requests/${info?.id}`, { action: 'answer', answer: 'Hiện có 1200 like (TEST)' });
  const d1 = await waitFor(async () => {
    const d = (await K(`/api/tasks/${t1.id}`)).data;
    for (const r of d.requests.filter((x) => x.status === 'pending' && x.type !== 'info')) await K(`/api/requests/${r.id}`, { action: 'reject', answer: 'Chưa đăng (TEST)' });
    return d.task.status === 'done' && d;
  }, 30000);
  const tr = d1?.task?.outputs.find((o) => o.key === 'draft')?.trace || [];
  check('Cần thông tin chỉ người dùng biết: nhân viên hỏi, việc dừng chờ, trả lời xong làm tiếp với câu trả lời',
    info && /Số like Fanpage/.test(info.question) && tr.some((x) => x.hanhDong === 'hoi_nguoi_dung' && /1200 like/.test(x.ketQua)) && /1200 like/.test(d1.task.outputs.find((o) => o.key === 'draft').text) && d1.requests.filter((r) => r.type === 'info').length === 1,
    info ? `Hỏi: "${info.question.split('\n')[0]}" → trả lời "1200 like" → ${d1?.task?.status}` : `không có câu hỏi: ${JSON.stringify((await K(`/api/tasks/${t1.id}`)).data).slice(0, 900)}`);

  const fb = (await K('/api/staff/STAFF-002/links', { softwareName: 'Fanpage (TEST)', url: `${fake.url}/fb-web/`, kind: 'facebook_page', purpose: 'Đăng bài và đọc bình luận' })).data.find((l) => l.softwareName === 'Fanpage (TEST)');
  await K(`/api/links/${fb.id}`, { accessGranted: true }, 'PUT');
  const t2 = (await K('/api/tasks', { title: 'Viết và đăng bài Fanpage lọc gió (TEST)', description: 'Soạn đăng bài giới thiệu lọc gió', kind: 'individual', assigneeIds: ['STAFF-002'] })).data;
  const w2 = await waitFor(async () => { const d = (await K(`/api/tasks/${t2.id}`)).data; return d.requests.find((r) => r.type === 'publish' && r.status === 'pending') && d; }, 60000);
  const pub = w2?.requests.find((r) => r.type === 'publish');
  const before = (fake.state.posts || []).length;
  await K(`/api/requests/${pub?.id}`, { action: 'approve', content: `${pub?.content} (đã sửa bởi chủ)` });
  const d2 = await waitFor(async () => {
    const d = (await K(`/api/tasks/${t2.id}`)).data;
    for (const r of d.requests.filter((x) => x.status === 'pending' && x.type === 'publish')) await K(`/api/requests/${r.id}`, { action: 'reject', answer: 'Đã đăng một bài rồi' });
    return d.task.status === 'done' && d;
  }, 90000);
  const posted = (fake.state.posts || []).slice(before);
  const pubAfter = d2?.requests.find((r) => r.id === pub?.id);
  check('Soạn nội dung → xin duyệt → chủ sửa và duyệt → nhân viên tự mở Fanpage đăng đúng nội dung đã duyệt',
    pub?.status === 'pending' && /Lọc gió Vios/.test(pub.content) && posted.length === 1 && /đã sửa bởi chủ/.test(posted[0]) && pubAfter?.status === 'published' && d2?.task.status === 'done',
    `đăng: ${JSON.stringify(posted)}; yêu cầu → ${pubAfter?.status} (${pubAfter?.result})`);
}

// --- Fanpage tự vận hành: An làm bài + ảnh và tự đăng, Tuấn kiểm tra, Bình đề xuất quảng cáo (chờ duyệt) và chia sẻ nhóm ---
{
  const F = client(base);
  await F('/api/login', { username: 'test-a', password: 'matkhau-test-1' });
  const fbl = (await F('/api/staff/STAFF-001/links', { softwareName: 'Fanpage vận hành (TEST)', url: `${fake.url}/fb-web/`, kind: 'facebook_page', pageId: 'fbpage-test', accessCode: 'fb-token-PLACEHOLDER' })).data.find((l) => l.softwareName === 'Fanpage vận hành (TEST)');
  const adl = (await F('/api/staff/STAFF-002/links', { softwareName: 'Quảng cáo (TEST)', url: 'https://adsmanager.facebook.com/', kind: 'facebook_ads', adAccountId: '123', accessCode: 'ads-token-PLACEHOLDER' })).data.find((l) => l.softwareName === 'Quảng cáo (TEST)');
  const cfg = await F('/api/fanpage', { enabled: false, fanpageLinkId: fbl.id, adsLinkId: adl.id, groups: `${fake.url}/fb-group/`, dailyBudgetCap: 300000, shareMaxPerDay: 1, brand: 'Long Phu Auto' }, 'PUT');
  const idle = () => waitFor(async () => { const o = (await F('/api/fanpage')).data; return !o.running.length && o; }, 90000);
  const before = (fake.state.fbPosts || []).length;
  for (const c of ['content', 'content']) { await F(`/api/fanpage/run/${c}`, {}); await sleep(200); await idle(); }
  let o = (await F('/api/fanpage')).data;
  const [p2, p1] = o.posts;
  const imgs = await Promise.all([p1, p2].map(async (p) => (await F(`/api/fanpage/posts/${p.id}/image`)).data.dataUrl || ''));
  const fbNew = (fake.state.fbPosts || []).slice(before);
  const chat = (await F('/api/messages/group')).data.messages;
  check('An tự làm bài + thiết kế ảnh, gửi lên nhóm rồi tự đăng lên Fanpage (không cần duyệt); hai bài khác nhau',
    cfg.status === 200 && p1?.status === 'posted' && p2?.status === 'posted' && p1.topic !== p2.topic && `${p1.design.boCuc}|${p1.design.bangMau}` !== `${p2.design.boCuc}|${p2.design.bangMau}`
      && imgs.every((x) => /^data:image\/jpeg;base64,/.test(x) && x.length > 20000) && fbNew.length === 2 && fbNew.every((x) => x.hasImage) && chat.some((m) => m.sender === 'STAFF-001' && m.postId === p1.id),
    `${[p1, p2].map((p) => `"${p?.topic}" (${p?.design.boCuc}/${p?.design.bangMau}, ${p?.status})`).join(' · ')}; ảnh ${imgs.map((x) => Math.round(x.length / 1024) + 'KB').join(', ')}; Facebook nhận ${fbNew.length} bài có ảnh`);

  await F('/api/fanpage/run/analyst', {}); await sleep(200); await idle();
  o = (await F('/api/fanpage')).data;
  const sn = o.snapshots[0];
  check('Tuấn đọc số liệu Fanpage thật, so sánh, khuyên An và Bình (trong nhóm chat)', sn?.followers > 0 && sn.reach === 870 && o.advice.some((a) => a.to === 'STAFF-001') && o.advice.some((a) => a.to === 'STAFF-002')
    && o.posts.some((p) => p.stats?.reactions > 0),
    sn ? `theo dõi ${sn.followers}, thích ${sn.likes}, tiếp cận ${sn.reach}; lời khuyên cho An: "${o.advice.find((a) => a.to === 'STAFF-001')?.text}"` : 'không có số liệu');

  const adsBefore = (fake.state.ads || []).length;
  await F('/api/fanpage/run/ads', {}); await sleep(200); await idle();
  o = (await F('/api/fanpage')).data;
  const plan = o.plans[0];
  const rq = (await F('/api/requests')).data.find((r) => r.type === 'ads' && r.status === 'pending');
  const noRunYet = (fake.state.ads || []).length === adsBefore;
  await F(`/api/requests/${rq?.id}`, { action: 'approve' });
  const ran = await waitFor(async () => { const p = (await F('/api/fanpage')).data.plans[0]; return ['running', 'partial', 'failed'].includes(p.status) && p; }, 20000);
  const budgets = (fake.state.ads || []).slice(adsBefore).filter((x) => x.kind === 'adsets').map((x) => Number(/name="daily_budget"\r\n\r\n(\d+)/.exec(x.raw)?.[1]));
  check('Bình phân tích → kế hoạch + ngân sách trong trần → CHỜ DUYỆT (chưa chạy) → bạn duyệt thì mới chạy đúng ngân sách',
    plan?.status === 'pending' && plan.perDay <= 300000 && rq && noRunYet && ran?.status === 'running' && budgets.length === plan.items.length && budgets.every((b, i) => b === plan.items[i].nganSachNgay),
    `${plan?.items.map((x) => `${x.loai} ${x.nganSachNgay}/ngày × ${x.soNgay}`).join(', ')}; trước duyệt: ${noRunYet ? 'chưa chạy' : 'ĐÃ CHẠY'}; sau duyệt: ${ran?.status} — ngân sách gửi Facebook ${budgets.join(', ')}`);

  const gBefore = (fake.state.groupPosts || []).length;
  await F('/api/fanpage/run/share', {}); await sleep(200); await idle();
  const gNew = (fake.state.groupPosts || []).slice(gBefore);
  o = (await F('/api/fanpage')).data;
  check('Bình tự chia sẻ bài hay vào nhóm được phép (giới hạn lượt mỗi ngày)', gNew.length === 1 && /facebook\.com\/fbpage-test_/.test(gNew[0]) && o.posts.some((p) => p.shares?.some((x) => x.ok)),
    `nhóm nhận: ${JSON.stringify(gNew.map((x) => x.slice(0, 80)))}`);
}

// --- Quy trình chuẩn Fanpage: từng bước một người phụ trách, bạn duyệt kế hoạch / bài / quảng cáo ---
{
  const C = client(base);
  await C('/api/login', { username: 'test-a', password: 'matkhau-test-1' });
  const t = (await C('/api/tasks', { title: 'Tăng 1000 folow cho fanpage', description: 'ngân sách khoảng 500.000 đ, thời gian 7 ngày hãy lên kế hoạch và triển khai cho tôi', kind: 'general', workflow: 'fanpage' })).data;
  const fbBefore = (fake.state.fbPosts || []).length;
  const adsBefore = (fake.state.ads || []).length;
  const log = [];
  let rejected = false; let ranBeforeApproval = false;
  const final = await waitFor(async () => {
    const d = (await C(`/api/tasks/${t.id}`)).data;
    const cur = d.campaign.steps.find((s) => !['done', 'skipped'].includes(s.status));
    const p = d.requests.find((r) => r.status === 'pending');
    if (p) {
      log.push(p.type);
      if (p.type === 'campaign_ads' && (fake.state.ads || []).length !== adsBefore + (log.filter((x) => x === 'campaign_ads').length - 1) * 4) ranBeforeApproval = true;
      if (p.type === 'plan' && !rejected) { rejected = true; await C(`/api/requests/${p.id}`, { action: 'reject', answer: 'Thêm bài về khách hàng (TEST)' }); }
      else if (p.type === 'post') await C(`/api/requests/${p.id}`, { action: 'approve', content: `${p.content}\n(chủ sửa TEST)` });
      else await C(`/api/requests/${p.id}`, { action: 'approve' });
    } else if (cur?.key.startsWith('check_') && cur.status === 'waiting') await C(`/api/tasks/${t.id}/check-now`, {});
    return d.task.status === 'done' && d;
  }, 120000);
  const steps = final?.campaign.steps || [];
  const fbNew = (fake.state.fbPosts || []).slice(fbBefore);
  const budgets = (fake.state.ads || []).slice(adsBefore).filter((x) => x.kind === 'adsets').map((x) => Number(/name="daily_budget"\r\n\r\n(\d+)/.exec(x.raw)?.[1]));
  const planned = steps.filter((s) => s.item).map((s) => s.item.nganSachNgay);
  check('Quy trình chuẩn Fanpage: Tuấn kiểm tra → Bình lập kế hoạch (bạn yêu cầu sửa, rồi duyệt) → An viết + ảnh (bạn sửa, duyệt) → An tự đăng → Bình đề xuất quảng cáo (bạn duyệt) → chạy → Tuấn đo → … → Phúc tổng kết',
    final && t.assigneeIds.join() === 'STAFF-003,STAFF-002,STAFF-001,STAFF-007' && steps.every((s) => s.status === 'done') && /Bản sửa theo góp ý/.test(final.campaign.plan.tomTat)
      && fbNew.length === final.campaign.plan.soBai && fbNew.every((x) => x.hasImage && /chủ sửa TEST/.test(x.message)) && budgets.join() === planned.join() && !ranBeforeApproval
      && log.filter((x) => x === 'post').length === final.campaign.plan.soBai,
    final ? `${steps.length} bước xong; duyệt: ${[...new Set(log)].join(', ')}; Facebook nhận ${fbNew.length} bài (bản đã sửa, có ảnh); ngân sách quảng cáo ${budgets.join(', ')}/ngày` : `chưa xong: ${JSON.stringify((await C(`/api/tasks/${t.id}`)).data.campaign.steps.map((s) => `${s.key}:${s.status}`))}`);
}

// --- Giao việc cho cả văn phòng: ai liên quan thì làm (tra giá → Sơn; tăng theo dõi → nhóm Marketing) ---
{
  const T = client(base);
  await T('/api/login', { username: 'test-a', password: 'matkhau-test-1' });
  const runToEnd = async (id, edit) => waitFor(async () => {
    const d = (await T(`/api/tasks/${id}`)).data;
    for (const r of d.requests.filter((x) => x.status === 'pending')) {
      await T(`/api/requests/${r.id}`, r.type === 'info' ? { action: 'answer', answer: 'TEST' } : { action: 'approve', ...(edit && r.type === 'publish' && r.mode !== 'ads' ? { content: `${r.content}\n(chủ sửa TEST)` } : {}) });
    }
    return d.task.status === 'done' && d;
  }, 120000);
  const t1 = (await T('/api/tasks', { title: 'Tra giá phốt FLTWS47691', kind: 'general', workflow: 'team' })).data;
  const d1 = await runToEnd(t1.id);
  const claimed1 = d1?.flow.triage.filter((x) => x.lienQuan).map((x) => x.name);
  check('Giao "tra giá": cả 10 người tự xét, chỉ Sơn (Sale) nhận và làm, không họp', d1 && d1.flow.triage.length === 10 && claimed1.join() === 'Sơn' && d1.flow.plan.length === 1 && d1.task.outputs.every((o) => o.staffId === 'STAFF-004') && !d1.task.outputs.some((o) => o.key === 'tongket'),
    d1 ? `nhận việc: ${claimed1.join(', ')}; ${d1.task.outputs.map((o) => `${o.staffName}: ${(o.trace || []).map((x) => x.hanhDong).join('→')}`).join(' | ')}` : 'chưa xong');

  const fbBefore = (fake.state.fbPosts || []).length;
  const t2 = (await T('/api/tasks', { title: 'Tăng 1000 người theo dõi Fanpage', description: 'ngân sách 500.000 đ trong 7 ngày', kind: 'general', workflow: 'team' })).data;
  const d2 = await runToEnd(t2.id, true);
  const order = d2?.flow.plan.map((p) => p.name).join(' → ');
  const tr = Object.fromEntries((d2?.task.outputs || []).map((o) => [o.staffName, (o.trace || []).map((x) => x.hanhDong)]));
  const posted = (fake.state.fbPosts || []).slice(fbBefore);
  const adsReq = d2?.requests.find((r) => r.mode === 'ads');
  check('Giao "tăng theo dõi": nhóm Marketing nhận, Phúc sắp thứ tự; Tuấn tìm trên web → An thiết kế ảnh + xin duyệt → bạn sửa & duyệt → đăng kèm ảnh → Bình xin duyệt quảng cáo → Phúc tổng kết',
    d2 && order === 'Tuấn → An → Bình' && tr['Tuấn']?.includes('tim_tren_web') && tr['An']?.includes('tao_anh') && tr['An']?.includes('xin_duyet_dang')
      && posted.length === 1 && posted[0].hasImage && /chủ sửa TEST/.test(posted[0].message) && adsReq?.budgetCap === 100000 && d2.task.outputs.some((o) => o.key === 'tongket' && o.staffId === 'STAFF-007'),
    d2 ? `${order}; Tuấn: ${tr['Tuấn']?.join('→')}; An: ${tr['An']?.join('→')}; Bình: ${tr['Bình']?.join('→')}; Facebook nhận ${posted.length} bài có ảnh; quảng cáo ${adsReq?.status}` : 'chưa xong');
}

// --- Báo cáo cuối ngày + hoạt động 3D ---
{
  const R = client(base); // server vừa khởi động lại ở ca trên
  await R('/api/login', { username: 'test-a', password: 'matkhau-test-1' });
  const r0 = await R('/api/reports', {});
  const d = await waitFor(async () => { const r = (await R('/api/reports')).data; return !r.generating && r.reports[0]?.summary && r; }, 10000);
  const rep = d?.reports[0];
  const act = (await R('/api/activity')).data;
  check('Báo cáo cuối ngày: Chi đề xuất, Phúc tổng hợp', r0.status === 200 && rep?.cskhText?.includes('Chi') && rep.summary.includes('Phúc') && rep.brainLabel && Array.isArray(act.working),
    `Chi: "${rep?.cskhText?.slice(0, 70)}…"; Phúc: "${rep?.summary?.slice(0, 70)}…"; /api/activity → ${JSON.stringify(act)}`);
}

// --- Việc làm thực tế: mỗi lúc MỘT việc của MỘT người, chặn đúng chỗ, chuỗi thật tới mã chiến dịch ---
{
  const V = client(base);
  await V('/api/register', { username: 'test-real', password: 'matkhau-test-9', officeName: 'VP Thực tế' });
  await V('/api/office-settings', { fanpageUrl: 'https://www.facebook.com/longphuauto', kiotvietUrl: 'https://longphu.kiotviet.vn', hotlines: ['0912 345 678', '0987 654 321'] }, 'PUT');
  const tk = (await V('/api/tasks', { title: 'Tăng 1000 người theo dõi Fanpage', description: 'Ngân sách quảng cáo tối đa 300.000 đ', kind: 'general', workflow: 'real' })).data;
  await sleep(600);
  const g0 = (await V(`/api/tasks/${tk.id}`)).data;
  const msgs0 = (await V('/api/messages/group')).data.messages;
  const fresh = g0.task.status === 'open' && !g0.session && !(g0.task.outputs || []).length && msgs0.length === 1 && g0.real.current.key === 'record_metrics' && g0.real.current.staffId === 'STAFF-003' && g0.real.links.fanpageUrl.includes('facebook.com');
  const act = (action, input = {}) => V(`/api/tasks/${tk.id}/real`, { action, input });
  const gateWrite = await act('write_post');
  const r1 = await act('record_metrics', { followers: '1.234', likes: '1.100', recent: 'Bài gần nhất 12 lượt thích' });
  const r2 = (await act('analyze')).data.real;
  const gateBudget = await act('propose_budget');
  const r3 = (await act('write_post')).data.real;
  const post = r3.post.text;
  const postOk = !/\d[\d.]*\s*(đ|k\b|đồng)/i.test(post) && !/www\.|https?:/i.test(post) && post.includes('0912 345 678') && post.includes('0987 654 321') && (post.match(/0\d{2,3}[\s.]?\d{3}[\s.]?\d{3}/g) || []).length === 2 && post.includes('(Chưa đăng)');
  const badLink = await act('publish', { postLink: 'https://www.longphu.vn/bai-1' });
  const r4 = (await act('publish', { postLink: 'https://www.facebook.com/longphuauto/posts/123456' })).data.real;
  const gateRun = await V(`/api/tasks/${tk.id}/real`, { action: 'run_ads', input: { campaignId: '120200000001' } });
  const r5 = (await act('propose_budget')).data.real;
  const pend = (await V('/api/activity')).data.pendingRequests;
  const gateRun2 = await act('run_ads', { campaignId: '120200000001' });
  const r6 = (await act('approve_budget')).data.real;
  const r7 = (await act('run_ads', { campaignId: '120200000001', campaignLink: 'https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=120200000001' })).data.real;
  const g1 = (await V(`/api/tasks/${tk.id}`)).data;
  check('Việc làm thực tế: giao xong chỉ "Mới giao", Tuấn làm trước, không quy trình dựng sẵn',
    fresh, `trạng thái ${g0.task.status}, ${msgs0.length} tin nhóm ("${msgs0[0]?.text}"), việc bây giờ: ${g0.real.current.key} của ${g0.real.current.staffId}, link Fanpage ${g0.real.links.fanpageUrl}`);
  check('Chặn đúng chỗ: An viết khi chưa có số liệu, Bình đề xuất khi chưa có link bài, chạy quảng cáo khi chưa duyệt',
    gateWrite.status === 400 && gateBudget.status === 400 && gateRun.status === 400 && gateRun2.status === 400 && badLink.status === 400,
    `viết bài → ${gateWrite.status} "${gateWrite.data.error}"; đề xuất → ${gateBudget.status} "${gateBudget.data.error}"; chạy → ${gateRun2.status} "${gateRun2.data.error}"; link không phải Facebook → ${badLink.status}`);
  check('Chuỗi thật: số liệu → nhận xét đúng số → 1 bài đúng quy cách → link → 90.000 đ × 3 ngày → duyệt → mã chiến dịch → xong',
    r1.status === 200 && /1234/.test(r2.analysis) && /1100/.test(r2.analysis) && postOk && r4.postLink && !r4.post.text.includes('(Chưa đăng)')
    && r5.budget.perDay === 90000 && r5.budget.days === 3 && r5.current.key === 'approve_budget' && pend >= 1
    && r6.current.key === 'run_ads' && r7.campaign.id === '120200000001' && r7.done && !r7.current && g1.task.status === 'done',
    `nhận xét: "${r2.analysis.slice(0, 90)}…"; bài: "${post.replace(/\n/g, ' / ').slice(0, 160)}…"; ngân sách ${r5.budget.perDay}×${r5.budget.days}; chờ duyệt ${pend}; mã ${r7.campaign?.id}; trạng thái ${g1.task.status}`);
  const single = (await V('/api/tasks', { title: 'Tra giá lọc gió Hino', kind: 'general', workflow: 'real' })).data;
  const s0 = (await V(`/api/tasks/${single.id}`)).data.real;
  const s1 = (await V(`/api/tasks/${single.id}/real`, { action: 'answer' })).data.real;
  check('Việc không phải Marketing: 1 thẻ, 1 hành động của đúng 1 người', s0.kind === 'single' && s0.team.length === 1 && s0.current.staffId === 'STAFF-004' && s1.done && s1.answer.text,
    `"Tra giá lọc gió Hino" → ${s0.current.staffId}, xong: ${s1.done}, trả lời "${s1.answer?.text.slice(0, 60)}…"`);
  const del1 = await V(`/api/tasks/${tk.id}`, null, 'DELETE');
  const del2 = await V(`/api/tasks/${single.id}`, null, 'DELETE');
  const gone = (await V(`/api/tasks/${tk.id}`)).status;
  check('Xoá việc kiểm thử sau khi kiểm tra', del1.status === 200 && del2.status === 200 && gone === 400, `xoá → ${del1.status}, ${del2.status}; mở lại → ${gone}`);
}

// --- Bảo mật (theo skill security-and-hardening) ---
{
  const r = await fetch(base + '/');
  const csp = r.headers.get('content-security-policy') || '';
  const csrf = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ke-xau.example' }, body: '{}' });
  const C = client(base);
  await C('/api/register', { username: 'test-c', password: 'matkhau-test-3', officeName: 'VP C' });
  const ssrf = await C('/api/apis/STAFF-001', { provider: 'openai_compatible', role: 'general', apiKey: 'sk-PLACEHOLDER', baseUrl: 'https://127.0.0.1/v1' });
  const ssrfHttp = await C('/api/apis/STAFF-001', { provider: 'openai_compatible', role: 'general', apiKey: 'sk-PLACEHOLDER', baseUrl: 'http://example.com/v1' });
  const del = await C('/api/me', { password: 'matkhau-test-3' }, 'DELETE');
  const relog = await client(base)('/api/login', { username: 'test-c', password: 'matkhau-test-3' });
  const L = client(base);
  let limited = null;
  for (let i = 0; i < 11; i++) limited = await L('/api/login', { username: 'test-a', password: 'sai-mat-khau' });
  check('Bảo mật: header, CSRF, SSRF, xoá văn phòng, giới hạn đăng nhập',
    csp.includes("default-src 'self'") && r.headers.get('x-frame-options') === 'DENY' && r.headers.get('x-content-type-options') === 'nosniff'
    && csrf.status === 403 && ssrf.status === 400 && ssrfHttp.status === 400 && del.status === 200 && relog.status === 401 && limited.status === 429,
    `CSP + X-Frame-Options + nosniff có; POST từ origin lạ → ${csrf.status}; Base URL nội bộ → ${ssrf.status} ("${ssrf.data.error}"), http → ${ssrfHttp.status}; xoá văn phòng → ${del.status}, đăng nhập lại → ${relog.status}; lần sai thứ 11 → ${limited.status}`);
}

// --- Báo cáo ---
let pass = 0;
for (const r of results) {
  if (r.ok) pass++;
  console.log(`${r.ok ? 'ĐẠT     ' : 'KHÔNG ĐẠT'} | ${r.name}\n           ${r.evidence}\n`);
}
console.log(`${pass}/${results.length} ca đạt`);
server.close(); fake.server.close();
fs.rmSync(dir, { recursive: true, force: true });
process.exit(pass === results.length ? 0 : 1);
