// Đóng gói BẢN TRẢI NGHIỆM (chạy trong Claude) vào dist-trial/ đúng cấu trúc đường dẫn sẽ publish.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-trial');
const files = {
  'index.html': 'trial/index.html',
  'trial/main.js': 'trial/main.js',
  'trial/backend.js': 'trial/backend.js',
  'shared/core.js': 'shared/core.js',
  'app.js': 'public/app.js',
  'office3d.js': 'public/office3d.js',
  'style.css': 'public/style.css',
  'vendor/three/build/three.module.js': 'node_modules/three/build/three.module.min.js',
  'vendor/three/examples/jsm/controls/OrbitControls.js': 'node_modules/three/examples/jsm/controls/OrbitControls.js',
};
fs.rmSync(out, { recursive: true, force: true });
for (const [dest, src] of Object.entries(files)) {
  fs.mkdirSync(path.dirname(path.join(out, dest)), { recursive: true });
  fs.copyFileSync(path.join(root, src), path.join(out, dest));
}
console.log(`Đã đóng gói ${Object.keys(files).length} file vào ${out}`);
