// Đóng gói BẢN TRẢI NGHIỆM (chạy trong Claude) vào dist-trial/ đúng cấu trúc đường dẫn sẽ publish.
// Trang được sinh từ public/index.html (phần giữa APP-BODY) để bản trải nghiệm và bản server luôn cùng giao diện.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-trial');
const files = {
  'trial/main.js': 'trial/main.js',
  'trial/backend.js': 'trial/backend.js',
  'shared/core.js': 'shared/core.js',
  'shared/deliberation.js': 'shared/deliberation.js',
  'shared/staffkit.js': 'shared/staffkit.js',
  'shared/browseragent.js': 'shared/browseragent.js',
  'shared/taskqa.js': 'shared/taskqa.js',
  'shared/worker.js': 'shared/worker.js',
  'shared/fanpage.js': 'shared/fanpage.js',
  'shared/design.js': 'shared/design.js',
  'shared/campaign.js': 'shared/campaign.js',
  'shared/teamflow.js': 'shared/teamflow.js',
  'shared/roles.js': 'shared/roles.js',
  'shared/realwork.js': 'shared/realwork.js',
  'app.js': 'public/app.js',
  'office3d.js': 'public/office3d.js',
  'music.js': 'public/music.js',
  'style.css': 'public/style.css',
  'vendor/three/build/three.module.js': 'node_modules/three/build/three.module.min.js',
  'vendor/three/examples/jsm/controls/OrbitControls.js': 'node_modules/three/examples/jsm/controls/OrbitControls.js',
};
fs.rmSync(out, { recursive: true, force: true });
for (const [dest, src] of Object.entries(files)) {
  fs.mkdirSync(path.dirname(path.join(out, dest)), { recursive: true });
  fs.copyFileSync(path.join(root, src), path.join(out, dest));
}

const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const body = /<!-- APP-BODY:START -->([\s\S]*?)<!-- APP-BODY:END -->/.exec(html)[1].trim();
// Artifact tự bọc trang trong khung <html><head><body>: chỉ viết phần nội dung, tiêu đề và tài nguyên.
const page = `<title>Văn phòng ảo Long Phu Auto</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="style.css">
<script type="importmap">
  { "imports": {
    "three": "./vendor/three/build/three.module.js",
    "three/addons/": "./vendor/three/examples/jsm/"
  } }
</script>
<!-- BẢN TRẢI NGHIỆM: chạy trong Claude. Bộ não = Claude qua tài khoản claude.ai của người xem; dữ liệu lưu riêng theo tài khoản. -->
${body}
<script type="module" src="trial/main.js"></script>
`;
fs.writeFileSync(path.join(out, 'index.html'), page);
console.log(`Đã đóng gói ${Object.keys(files).length + 1} file vào ${out}`);
