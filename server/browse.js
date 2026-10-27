// Nhân viên tự mở trình duyệt điều khiển phần mềm được giao: lấy dữ liệu (chỉ đọc) hoặc đăng nội dung người dùng đã duyệt.
import { db, now } from './db.js';
import { getStaff } from './roster.js';
import { selectBrain, thinkWithBrain } from './brain.js';
import { getRow, rowToLink, addLog, storeData, browsing, syncLink } from './links.js';
import { CONNECTORS } from './connectors.js';
import { openStaffBrowser } from './browser.js';
import { runBrowserAgent } from '../shared/browseragent.js';
import { pickRelevant } from '../shared/staffkit.js';

export async function browseOnce(accountId, id, { goal = '', mode = 'read', content = '' } = {}) {
  const r = getRow(accountId, id);
  if (browsing.has(id)) throw new Error('Nhân viên đang dùng trình duyệt cho phần mềm này, thử lại sau.');
  const link = rowToLink(r);
  const staff = getStaff(accountId, r.staff_id);
  browsing.set(id, { step: 'Đang mở trình duyệt…', at: now() });
  let browser = null;
  try {
    browser = await openStaffBrowser(accountId, id);
    const res = await runBrowserAgent({
      staff, link, goal: String(goal || '').slice(0, 1000), browser, mode, content,
      think: (s, ctx) => thinkWithBrain(accountId, s, selectBrain(accountId, s, 'deep_analysis'), ctx),
      log: (action, ok, detail) => { addLog(id, action, ok, detail); browsing.set(id, { step: `${action}${detail ? `: ${String(detail).slice(0, 80)}` : ''}`, at: now() }); },
    });
    if (res.status === 'saved') {
      storeData(accountId, id, res.data.kind, `${staff.name} lấy qua trình duyệt`, res.data.items);
      db.prepare("UPDATE software_links SET status = 'connected', last_check_at = ?, last_opened_at = ? WHERE id = ?").run(now(), now(), id);
    } else if (res.status === 'need_login') {
      // Không tự đăng nhập lại: chuyển "Hết hạn" để người dùng tự đăng nhập.
      db.prepare("UPDATE software_links SET status = 'expired', last_check_at = ?, last_opened_at = ? WHERE id = ?").run(now(), now(), id);
    } else {
      db.prepare('UPDATE software_links SET last_opened_at = ? WHERE id = ?').run(now(), id);
    }
    addLog(id, mode === 'publish' ? 'Kết quả đăng nội dung' : 'Kết quả lấy dữ liệu qua trình duyệt', res.status === 'saved' || res.status === 'published', res.message);
    return res;
  } catch (e) {
    addLog(id, mode === 'publish' ? 'Đăng nội dung' : 'Lấy dữ liệu qua trình duyệt', false, e.message);
    return { status: 'error', message: e.message };
  } finally {
    await browser?.close();
    browsing.delete(id);
  }
}

export function startBrowse(accountId, id, goal = '') {
  const r = getRow(accountId, id);
  if (browsing.has(id)) throw new Error('Nhân viên đang mở trình duyệt cho phần mềm này.');
  browseOnce(accountId, id, { goal }).catch((e) => console.error('browse', e));
  return rowToLink(getRow(accountId, r.id));
}

// Nhân viên xem phần mềm trong lúc làm việc: API (KiotViet/Facebook) nếu có mã, không thì trình duyệt; lỗi thì dùng dữ liệu đã lưu.
export async function readSoftware(accountId, id, want = '') {
  const r = getRow(accountId, id);
  let note = '';
  if (CONNECTORS[r.kind] && r.access_code_ref) {
    const s = await syncLink(accountId, id);
    if (!s.ok) note = `Đồng bộ API lỗi: ${s.message}. `;
  } else {
    const res = await browseOnce(accountId, id, { goal: want });
    if (res.status !== 'saved') note = `Trình duyệt chưa lấy được dữ liệu (${res.status === 'need_login' ? 'phần mềm yêu cầu đăng nhập — người dùng phải tự đăng nhập' : res.message}). `;
  }
  const d = db.prepare('SELECT items, at, source FROM link_data WHERE link_id = ?').get(id);
  if (!d) return `${note}Chưa có dữ liệu nào của ${r.software_name}.`;
  const items = JSON.parse(d.items);
  return `${note}Dữ liệu ${r.software_name} (${d.source}, lúc ${d.at}, tổng ${items.length} mục). Các mục liên quan: ${JSON.stringify(pickRelevant(items, want, 30))}`;
}
