// Nhân viên tự mở trình duyệt điều khiển phần mềm được giao để lấy dữ liệu (chạy nền, tiến độ ghi vào nhật ký).
import { db, now } from './db.js';
import { getStaff } from './roster.js';
import { selectBrain, thinkWithBrain } from './brain.js';
import { getRow, rowToLink, addLog, storeData, browsing } from './links.js';
import { openStaffBrowser } from './browser.js';
import { runBrowserAgent } from '../shared/browseragent.js';

export function startBrowse(accountId, id, goal = '') {
  const r = getRow(accountId, id);
  if (browsing.has(id)) throw new Error('Nhân viên đang mở trình duyệt cho phần mềm này.');
  const link = rowToLink(r);
  const staff = getStaff(accountId, r.staff_id);
  browsing.set(id, { step: 'Đang mở trình duyệt…', at: now() });
  (async () => {
    let browser = null;
    try {
      browser = await openStaffBrowser(accountId, id);
      const res = await runBrowserAgent({
        staff, link, goal: String(goal || '').slice(0, 1000), browser,
        think: (s, ctx) => thinkWithBrain(accountId, s, selectBrain(accountId, s, 'deep_analysis'), ctx),
        log: (action, ok, detail) => { addLog(id, action, ok, detail); browsing.set(id, { step: `${action}${detail ? `: ${String(detail).slice(0, 80)}` : ''}`, at: now() }); },
      });
      if (res.status === 'saved') {
        storeData(accountId, id, res.data.kind, 'Nhân viên lấy qua trình duyệt', res.data.items);
        db.prepare("UPDATE software_links SET status = 'connected', last_check_at = ?, last_opened_at = ? WHERE id = ?").run(now(), now(), id);
      } else if (res.status === 'need_login') {
        // Không tự đăng nhập lại: chuyển "Hết hạn" để người dùng tự đăng nhập.
        db.prepare("UPDATE software_links SET status = 'expired', last_check_at = ?, last_opened_at = ? WHERE id = ?").run(now(), now(), id);
      } else {
        db.prepare('UPDATE software_links SET last_opened_at = ? WHERE id = ?').run(now(), id);
      }
      addLog(id, 'Kết quả lấy dữ liệu qua trình duyệt', res.status === 'saved', res.message);
    } catch (e) {
      addLog(id, 'Lấy dữ liệu qua trình duyệt', false, e.message);
    } finally {
      await browser?.close();
      browsing.delete(id);
    }
  })();
  return rowToLink(getRow(accountId, id));
}
