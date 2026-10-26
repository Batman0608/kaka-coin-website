#!/usr/bin/env node
// Cầu nối Zalo chạy local trên máy tính của bạn. Nó chỉ làm kênh gửi / nhận và trả biên nhận,
// không tự quyết nghiệp vụ. Bản này chạy ở chế độ XÁC NHẬN THỦ CÔNG: in nội dung cần gửi,
// bạn gửi bằng chính ứng dụng Zalo của mình rồi gõ "y" để trả biên nhận về văn phòng.
//
// Cách dùng:
//   node bridge/zalo-bridge.js https://dia-chi-van-phong LPA-ZALO-XXXXXX
// Lần sau token được lưu ở ~/.zalo-bridge.json nên chỉ cần: node bridge/zalo-bridge.js https://dia-chi-van-phong
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';

const [, , baseArg, code] = process.argv;
if (!baseArg) {
  console.error('Thiếu địa chỉ văn phòng. Ví dụ: node bridge/zalo-bridge.js https://van-phong.example.com LPA-ZALO-XXXXXX');
  process.exit(1);
}
const BASE = baseArg.replace(/\/+$/, '');
const STORE = path.join(os.homedir(), '.zalo-bridge.json');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function post(p, body, token) {
  const r = await fetch(BASE + p, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body || {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

let token = null;
try { token = JSON.parse(fs.readFileSync(STORE, 'utf8'))[BASE] || null; } catch { /* chưa có */ }
if (code) {
  token = (await post('/bridge/link', { code })).token;
  const all = (() => { try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch { return {}; } })();
  fs.writeFileSync(STORE, JSON.stringify({ ...all, [BASE]: token }), { mode: 0o600 });
  console.log('Đã liên kết với văn phòng.');
}
if (!token) {
  console.error('Chưa liên kết. Tạo mã LPA-ZALO-XXXXXX trong tab Zalo của văn phòng rồi chạy lại kèm mã.');
  process.exit(1);
}

setInterval(() => post('/bridge/heartbeat', {}, token).catch((e) => console.error('Heartbeat lỗi:', e.message)), 20000);
await post('/bridge/heartbeat', {}, token);
console.log('Cầu nối đang chạy. Nhấn Ctrl+C để tắt (nhiệm vụ sẽ nằm chờ trong văn phòng).');

for (;;) {
  let item = null;
  try {
    item = (await post('/bridge/next', {}, token)).item;
  } catch (e) {
    console.error('Lỗi lấy nhiệm vụ:', e.message);
  }
  if (!item) { await new Promise((r) => setTimeout(r, 5000)); continue; }
  console.log(`\n=== ${item.id} — gửi tới: ${item.target || '(chưa ghi người nhận)'} ===\n${item.content}\n`);
  const ans = (await rl.question('Đã gửi bằng Zalo của bạn? (y = đã gửi / n = lỗi): ')).trim().toLowerCase();
  if (ans === 'y') {
    const reply = (await rl.question('Phản hồi Zalo (nếu có, Enter để bỏ qua): ')).trim();
    const receipt = `MANUAL-${new Date().toISOString()}-${os.hostname()}`;
    await post('/bridge/result', { id: item.id, receipt, reply: reply || undefined }, token);
    console.log(`Đã trả biên nhận ${receipt}`);
  } else {
    const why = (await rl.question('Lý do lỗi: ')).trim() || 'Người vận hành báo không gửi được';
    await post('/bridge/result', { id: item.id, error: why }, token);
    console.log('Đã báo lỗi, nhiệm vụ giữ lại để thử lại.');
  }
}
