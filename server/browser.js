// Trình duyệt của nhân viên (bản server): Playwright mở phần mềm bằng hồ sơ trình duyệt riêng cho từng liên kết,
// để phiên đăng nhập người dùng tự làm được giữ lại. Nhân viên chỉ đọc; gặp trang đăng nhập thì dừng, không tự đăng nhập.
// Chạy trên máy của bạn với VPA_BROWSER_HEADFUL=1 để thấy cửa sổ và tự đăng nhập lần đầu.
import path from 'node:path';
import dns from 'node:dns/promises';
import { isPrivateAddress } from './brain.js';
import { clickBlocked } from '../shared/browseragent.js';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');

export async function loadChromium() {
  try {
    const mod = await import(process.env.VPA_PLAYWRIGHT_PATH || 'playwright');
    return (mod.default || mod).chromium;
  } catch (e) {
    throw new Error(`Server chưa cài Playwright (chạy: npm i playwright && npx playwright install chromium). Lỗi gốc: ${e.message}`);
  }
}

// Chặn trình duyệt đi vào địa chỉ nội bộ (chống SSRF), trừ khi cho phép rõ để kiểm thử.
const hostOk = new Map();
async function publicHost(url) {
  if (process.env.VPA_ALLOW_PRIVATE_BROWSE === 'true') return true;
  let u;
  try { u = new URL(url); } catch { return false; }
  if (!/^https?:$/.test(u.protocol)) return u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:';
  if (hostOk.has(u.hostname)) return hostOk.get(u.hostname);
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => []);
  const ok = addrs.length > 0 && !addrs.some((a) => isPrivateAddress(a.address, a.family));
  hostOk.set(u.hostname, ok);
  return ok;
}

// Đánh mã r1, r2… cho phần tử bấm / nhập được để bộ não chỉ định.
function snapshot() {
  for (const el of document.querySelectorAll('[data-vpa-ref]')) el.removeAttribute('data-vpa-ref');
  const els = [];
  let i = 0;
  for (const el of document.querySelectorAll('a,button,input,select,textarea,[role=button],[role=link],[role=tab],[role=menuitem]')) {
    const r = el.getBoundingClientRect();
    if ((!r.width || !r.height) && el.type !== 'file') continue;
    if (i >= 120) continue;
    const ref = `r${++i}`;
    el.setAttribute('data-vpa-ref', ref);
    const label = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    els.push(`[${ref}] ${el.tagName.toLowerCase()}${el.type ? `(${el.type})` : ''} "${label}"`);
  }
  const pw = [...document.querySelectorAll('input[type=password]')].some((x) => x.getBoundingClientRect().width > 0);
  return { title: document.title, url: location.href, text: (document.body?.innerText || '').slice(0, 7000), els, pw };
}

export async function openStaffBrowser(accountId, linkId) {
  const chromium = await loadChromium();
  const dir = path.join(DATA_DIR, 'browser', accountId, linkId);
  const ctx = await chromium.launchPersistentContext(dir, { headless: process.env.VPA_BROWSER_HEADFUL !== '1' });
  await ctx.route('**/*', async (route) => ((await publicHost(route.request().url())) ? route.continue() : route.abort('blockedbyclient')));
  const page = ctx.pages()[0] || await ctx.newPage();
  const settle = () => page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  const read = async () => {
    const s = await page.evaluate(snapshot);
    return `Trang: ${s.title} (${s.url})${s.pw ? '\nCÓ Ô MẬT KHẨU — đây là trang đăng nhập.' : ''}\n--- Nội dung ---\n${s.text}\n--- Phần tử bấm / nhập được ---\n${s.els.join('\n')}`;
  };
  const el = (ref) => {
    if (!/^r\d+$/.test(ref)) throw new Error(`Mã phần tử "${ref}" không hợp lệ (dạng r12).`);
    return page.locator(`[data-vpa-ref="${ref}"]`).first();
  };
  const go = async (url) => {
    if (!(await publicHost(url))) throw new Error('Địa chỉ nội bộ — không được mở.');
    await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
    return read();
  };
  return {
    open: go,
    go,
    read,
    async find(q) {
      const all = await read();
      const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
      const hits = all.split('\n').filter((l) => words.some((w) => l.toLowerCase().includes(w))).slice(0, 60);
      return hits.length ? `Các dòng có "${q}":\n${hits.join('\n')}` : `Không thấy "${q}" trên trang.`;
    },
    async click(ref, mode) {
      const e = el(ref);
      const label = ((await e.innerText().catch(() => '')) || (await e.getAttribute('value')) || (await e.getAttribute('aria-label')) || '').trim();
      const blocked = clickBlocked(label, mode);
      if (blocked) throw new Error(blocked);
      await e.click({ timeout: 10000 });
      await settle();
      await page.waitForTimeout(500);
      return read();
    },
    async type(ref, text) {
      const e = el(ref);
      if ((await e.getAttribute('type')) === 'password') throw new Error('Không tự nhập mật khẩu — người dùng phải tự đăng nhập.');
      await e.fill(text, { timeout: 10000 });
      await e.press('Enter').catch(() => {});
      await settle();
      await page.waitForTimeout(500);
      return read();
    },
    async upload(ref, dataUrl) {
      const m = /^data:(image\/\w+);base64,(.+)$/.exec(String(dataUrl));
      if (!m) throw new Error('Ảnh không hợp lệ.');
      const buffer = Buffer.from(m[2], 'base64');
      const e = el(ref);
      const isFile = (await e.getAttribute('type')) === 'file';
      if (isFile) await e.setInputFiles({ name: 'thiet-ke.jpg', mimeType: m[1], buffer });
      else {
        // Nút "Ảnh/video": bấm rồi nhận hộp chọn tệp.
        const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }), e.click()]);
        await chooser.setFiles({ name: 'thiet-ke.jpg', mimeType: m[1], buffer });
      }
      await page.waitForTimeout(800);
      return read();
    },
    close: () => ctx.close().catch(() => {}),
  };
}
