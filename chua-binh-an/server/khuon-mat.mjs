/* Luồng phụ nhận diện KHUÔN MẶT NGƯỜI cho ảnh cầu duyên (chạy tách khỏi luồng game để không làm giật).
   Dùng face-api (MIT, vendor/face-api) + mô hình Tiny Face Detector, giải mã JPEG thuần JS — không cần cài thêm gói. */
import { parentPort } from 'worker_threads';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url), here = path.dirname(fileURLToPath(import.meta.url));
const decode = require('./lib/jpeg-decoder.js');
const VEN = path.join(here, '..', 'vendor', 'face-api');
// bản face-api đóng gói cho trình duyệt: giả lập môi trường trình duyệt tối thiểu trong luồng phụ này
globalThis.window = globalThis; globalThis.document = { createElement: () => ({ getContext: () => null }) };
Object.defineProperty(globalThis, 'process', { value: undefined, configurable: true, writable: true });
const faceapi = await import(pathToFileURL(path.join(VEN, 'face-api.esm.js')).href);
class Stub {}
faceapi.env.setEnv({ Canvas: Stub, CanvasRenderingContext2D: Stub, Image: Stub, ImageData: Stub, Video: Stub, createCanvasElement: () => new Stub(), createImageElement: () => new Stub(), fetch: globalThis.fetch, readFile: () => { throw new Error('no fs'); } });
const tf = faceapi.tf; await tf.setBackend('cpu'); await tf.ready();
const man = JSON.parse(fs.readFileSync(path.join(VEN, 'model', 'tiny_face_detector_model-weights_manifest.json'), 'utf8'));
const bin = fs.readFileSync(path.join(VEN, 'model', man[0].paths[0]));
await faceapi.nets.tinyFaceDetector.loadFromWeightMap(tf.io.decodeWeights(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length), man[0].weights));
parentPort.postMessage({ ready: true });
parentPort.on('message', async ({ id, buf }) => {
  try {
    const img = decode(Buffer.from(buf), { useTArray: true, formatAsRGBA: false, maxResolutionInMP: 4, maxMemoryUsageInMB: 128 });
    const t = tf.tensor3d(img.data, [img.height, img.width, 3], 'int32');
    const det = await faceapi.detectAllFaces(t, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })); t.dispose();
    parentPort.postMessage({ id, W: img.width, H: img.height, faces: det.map(d => ({ s: d.score, w: d.box.width, h: d.box.height })) });
  } catch (e) { parentPort.postMessage({ id, err: String(e && e.message || e) }); }
});
