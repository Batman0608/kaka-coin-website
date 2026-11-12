/* =========================================================================
 *  CHÂN DUNG NHÂN VẬT — chụp ảnh nhân vật 3D trong game làm ảnh hồ sơ
 *  (dùng cho bạn đồng hành ảo ở Cây tình duyên: ảnh vẽ từ nhân vật game, không dùng ảnh người thật)
 * ========================================================================= */
import { THREE } from '../temple3d.js';
import { Avatar } from './avatar.js';

const cache = new Map();
let R = null, scene = null, cam = null;
const BG = [['#f7d9a8', '#c98a4a'], ['#cfe6d8', '#5f9a7a'], ['#f3c9c9', '#b9606a'], ['#d6dcf2', '#6070b0'], ['#f1e2b6', '#b09040'], ['#e2d4f0', '#8a6ab0']];

function setup() {
  if (R) return true;
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 320;
    R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(320, 320, false);
    if ('outputColorSpace' in R) R.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6a5a48, 1.15));
    const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(1.5, 2.5, 3); scene.add(d);
    const f = new THREE.DirectionalLight(0xffe0c0, 0.45); f.position.set(-2, 1.5, 1); scene.add(f);
    cam = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
    return true;
  } catch (e) { R = null; return false; }
}
/* look: { g, hair, robe }, seed: số; trả về dataURL (PNG) hoặc '' nếu máy không vẽ được */
export function portrait(key, look, seed = 1) {
  if (cache.has(key)) return cache.get(key);
  if (!setup()) return '';
  const av = new Avatar({ look, seed, outline: false, player: false });   // ảnh chân dung vẽ ngay: dùng kiểu chibi
  scene.add(av.root); av.update(0.016, false);
  av.root.rotation.y = ((seed % 5) - 2) * 0.12;
  const hy = av.height; cam.position.set(0, hy - 0.05, 2.45); cam.lookAt(0, hy - 0.32, 0);
  R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam);
  // nền chuyển màu + khung tròn mềm
  const out = document.createElement('canvas'); out.width = out.height = 320; const g = out.getContext('2d');
  const [c0, c1] = BG[seed % BG.length], gr = g.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, 0, 320, 320);
  g.globalAlpha = 0.18; g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((seed * 53 + i * 71) % 320, (seed * 31 + i * 97) % 200, 18 + (i * 7) % 26, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
  g.drawImage(R.domElement, 0, 0);
  scene.remove(av.root); av.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  const url = out.toDataURL('image/jpeg', 0.86); cache.set(key, url); return url;
}
