/* NÉN & LÀM RỐI NHẸ MÃ JAVASCRIPT cho bản phát hành (không phá chức năng).
   Dùng: node tools/nen_ma.mjs <thư-mục-đích>
   Sao chép toàn bộ game sang thư mục đích rồi nén các file .js (trừ file cấu hình người dùng).
   - Đổi tên biến cục bộ, bỏ chú thích, dồn dòng → khó đọc, nhẹ hơn ~30%.
   - KHÔNG bật anti-debug/treo trình duyệt (gây hại người chơi, dễ bị qua mặt).
   Cần: npm i -g terser */
import { execSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
const SRC = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DST = path.resolve(process.argv[2] || path.join(SRC, '..', 'ChuaBinhAn-phat-hanh'));
const MODULES = new Set(['js/temple3d.js', 'js/g3d/main.js', 'js/g3d/world.js', 'js/g3d/avatar.js', 'js/g3d/shop.js', 'js/g3d/account.js', 'js/g3d/fb.js', 'js/g3d/net.js', 'js/g3d/tuhanh.js', 'js/g3d/duyen.js']);
const SKIP = new Set(['js/shop-config.js', 'js/cau-hinh-rieng.js']);   // file cấu hình: để nguyên cho dễ sửa
const SKIP_DIR = ['server/node_modules', '.git'];
function copyDir(a, b) {
  fs.mkdirSync(b, { recursive: true });
  for (const e of fs.readdirSync(a, { withFileTypes: true })) {
    const rel = path.relative(SRC, path.join(a, e.name)).replace(/\\/g, '/');
    if (SKIP_DIR.some(d => rel === d || rel.startsWith(d + '/')) || e.name === 'nhat-ky.txt') continue;
    const s = path.join(a, e.name), d = path.join(b, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
if (fs.existsSync(DST)) fs.rmSync(DST, { recursive: true, force: true });
copyDir(SRC, DST);
let done = 0, kept = 0, src = 0, out = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name), rel = path.relative(DST, full).replace(/\\/g, '/');
    if (e.isDirectory()) { if (rel === 'server' || rel === 'tools') continue; walk(full); continue; }
    if (!e.name.endsWith('.js') || rel.startsWith('vendor/')) continue;
    if (SKIP.has(rel)) { kept++; continue; }
    const before = fs.statSync(full).size, mod = MODULES.has(rel) ? ' --module' : '';
    try {
      execSync(`terser "${full}"${mod} -c passes=2 -m --comments false -o "${full}"`, { stdio: 'pipe' });
      done++; src += before; out += fs.statSync(full).size;
    } catch (err) { console.log('  ! bỏ qua (giữ nguyên):', rel); }
  }
}
walk(DST);
console.log(`Đã nén ${done} file .js (${(src / 1024) | 0} KB → ${(out / 1024) | 0} KB), giữ nguyên ${kept} file cấu hình.`);
console.log('Bản phát hành ở:', DST);
