/* THỬ TẢI: giả lập nhiều người chơi cùng lúc để xem máy chủ chịu được bao nhiêu.
   Cách dùng (máy chủ đang chạy):  node thu-tai.js 300            → 300 người, chia đều 11 chùa
                                  node thu-tai.js 120 binh-an     → 120 người vào cùng một chùa
   Đọc kết quả ở cửa sổ máy chủ hoặc http://localhost:8080/server */
const WebSocket = require('ws');
const N = +process.argv[2] || 100, ONLY = process.argv[3], URL = process.env.URL || 'ws://127.0.0.1:' + (process.env.PORT || 8080) + '/ws';
const T = ONLY ? [ONLY] : ['chua-ha', 'binh-an', 'bai-dinh', 'mot-cot', 'huong', 'yen-tu', 'thien-mu', 'linh-ung', 'long-son', 'vinh-nghiem', 'giac-lam', 'doi'];
let open = 0, recv = 0, bytes = 0, full = 0; const lat = [];
for (let i = 0; i < N; i++) setTimeout(() => {
  const ws = new WebSocket(URL); let x = Math.random() * 20 - 10, z = Math.random() * 20, a = Math.random() * 6;
  ws.on('open', () => { open++; ws.send(JSON.stringify({ t: 'hello', temple: T[i % T.length], name: 'Thử ' + i, look: {}, b: i, m: i })); });
  ws.on('message', (d) => { recv++; bytes += d.length; if (String(d).includes('"full"')) full++; });
  ws.on('close', () => open--); ws.on('error', () => {});
  // đi lại liên tục 5 lần/giây (trường hợp nặng nhất), thỉnh thoảng lạy / thắp hương
  setInterval(() => { if (ws.readyState !== 1) return; a += (Math.random() - 0.5) * 0.4; x += Math.sin(a) * 0.3; z += Math.cos(a) * 0.3; ws.send(JSON.stringify({ t: 's', s: [x, 0, z, a, 'idle', 1] })); if (Math.random() < 0.01) ws.send(JSON.stringify({ t: 'act', k: 'bow' })); }, 200);
}, i * 15);
let t0 = Date.now(), b0 = 0, r0 = 0;
setInterval(() => { const dt = (Date.now() - t0) / 1000; console.log(`${open} kết nối · mỗi người nhận ${((bytes - b0) / 1024 / dt / Math.max(1, open)).toFixed(1)} KB/s (${((recv - r0) / dt / Math.max(1, open)).toFixed(1)} gói/s) · bị từ chối ${full}`); t0 = Date.now(); b0 = bytes; r0 = recv; }, 5000);
