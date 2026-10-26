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
