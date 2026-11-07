/* Service worker: cho phép cài game về điện thoại và chơi được khi mạng yếu.
   Đổi VER mỗi lần cập nhật lớn để máy người chơi tải bản mới. */
const VER = 'cba-v47';
const CORE = [
  'game.html', 'manifest.webmanifest', 'css/game.css',
  'js/config.js', 'js/content.js', 'js/lunar.js', 'js/stories.js', 'js/temples.js', 'js/audio.js', 'js/shop-config.js', 'js/kinh-config.js', 'js/cau-hinh-rieng.js', 'js/temple3d.js',
  'js/g3d/main.js', 'js/g3d/world.js', 'js/g3d/avatar.js', 'js/g3d/shop.js', 'js/g3d/account.js', 'js/g3d/fb.js', 'js/g3d/net.js', 'js/g3d/tuhanh.js', 'js/g3d/duyen.js', 'js/g3d/share.js', 'js/g3d/quiz.js', 'js/g3d/sweep.js', 'js/g3d/giapha.js',
  'vendor/three/three.module.min.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png'
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VER).then(c => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;     // Firebase, VietQR… đi thẳng ra mạng
  const media = /\.(mp3|webp|jpg|png|json)$/.test(url.pathname);
  if (media) {   // âm thanh, hình: lấy trong bộ nhớ trước cho nhanh
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) caches.open(VER).then(c => c.put(req, res.clone())); return res; })));
    return;
  }
  // mã game: ưu tiên bản mới trên mạng, mất mạng thì dùng bản đã lưu
  e.respondWith(fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(req, cp)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('game.html'))));
});
