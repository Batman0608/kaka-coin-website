/* =========================================================================
 *  TẠO GIỌNG ĐỌC NAM TỰ NHIÊN (giọng Bắc) CHO GAME — Azure Speech, giọng vi-VN-NamMinhNeural
 *  Cách dùng (cần Node.js 18+):
 *    node tools/tao-giong-doc.mjs <AZURE_KEY> <REGION>        vd: ... abc123 southeastasia
 *  Tạo khóa miễn phí: portal.azure.com → Create "Speech service" (gói F0: ~500.000 ký tự/tháng).
 *  Kết quả: audio/voice/*.mp3 + audio/voice/manifest.json — game tự dùng, chạy lại chỉ tạo câu còn thiếu.
 *  Muốn dùng giọng tự thu: đặt mp3 vào audio/voice/ và thêm dòng "câu chữ": "tên-file.mp3" vào manifest.json.
 * ========================================================================= */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import crypto from 'node:crypto';
const [, , KEY, REGION = 'southeastasia', VOICE = 'vi-VN-NamMinhNeural'] = process.argv;
if (!KEY) { console.log('Thiếu khóa Azure. Cách dùng: node tools/tao-giong-doc.mjs <AZURE_KEY> <REGION>'); process.exit(1); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['config.js', 'content.js', 'stories.js', 'temples.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx);
const C = ctx.CBA;
const texts = new Set(['Nam mô A Di Đà Phật', 'A Di Đà Phật. Chào mừng quý Phật tử về thăm chùa.']);
Object.values(C.texts).forEach(arr => arr.forEach(t => texts.add(t)));
C.stories.forEach(s => { s.scenes.forEach(t => texts.add(t)); texts.add('🪷 ' + s.moral); texts.add(s.moral); if (s.quiz) texts.add('Câu đố. ' + s.quiz.q); });
C.temples.forEach(t => { if (t.intro) texts.add(t.intro); });
const outDir = path.join(root, 'audio', 'voice'); fs.mkdirSync(outDir, { recursive: true });
const manPath = path.join(outDir, 'manifest.json');
const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
const key = (t) => t.normalize('NFC').replace(/\s+/g, ' ').trim();
const esc = (t) => t.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
let made = 0, chars = 0;
for (const raw of texts) {
  const k = key(raw); if (man[k] && fs.existsSync(path.join(outDir, man[k]))) continue;
  const speakText = k.replace(/^🪷\s*/, '');
  const isMantra = /^(Nam Mô|Nam mô|Án )/.test(speakText) || /niệm|Tâm Kinh|Yết đế/.test(speakText);
  const ssml = `<speak version="1.0" xml:lang="vi-VN"><voice name="${VOICE}"><prosody rate="${isMantra ? '-18%' : '-6%'}" pitch="${isMantra ? '-6%' : '-2%'}">${esc(speakText)}</prosody></voice></speak>`;
  const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'ChuaBinhAn' }, body: ssml });
  if (!res.ok) { console.log('Lỗi', res.status, await res.text()); if (res.status === 401) process.exit(1); continue; }
  const name = crypto.createHash('md5').update(k).digest('hex').slice(0, 12) + '.mp3';
  fs.writeFileSync(path.join(outDir, name), Buffer.from(await res.arrayBuffer()));
  man[k] = name; made++; chars += speakText.length;
  if (made % 20 === 0) { fs.writeFileSync(manPath, JSON.stringify(man, null, 0)); console.log(`… ${made} câu`); }
  await new Promise(r => setTimeout(r, 120));
}
fs.writeFileSync(manPath, JSON.stringify(man, null, 0));
console.log(`Xong: tạo ${made} câu mới (${chars} ký tự). Tổng ${Object.keys(man).length} câu trong manifest.`);
