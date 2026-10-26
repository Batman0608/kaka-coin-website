// Dữ kiện thật nội bộ đưa vào mỗi lượt suy nghĩ: chỉ những gì văn phòng đang lưu, không có số liệu bịa.
import { db } from './db.js';
import { buildRealData } from '../shared/core.js';
import { softwareFacts } from '../shared/staffkit.js';
import { staffLinkData } from './links.js';

export function realDataFor(accountId, staffId = null, question = '') {
  const slips = db.prepare('SELECT quantity, warehouse_status, archived_at, created_at FROM sales_slips WHERE account_id = ?').all(accountId)
    .map((r) => ({ quantity: r.quantity, warehouseStatus: r.warehouse_status, archivedAt: r.archived_at, createdAt: r.created_at }));
  const links = db.prepare('SELECT software_name, status FROM software_links WHERE account_id = ?').all(accountId)
    .map((r) => ({ softwareName: r.software_name, status: r.status }));
  const zalo = db.prepare('SELECT status FROM zalo_queue WHERE account_id = ?').all(accountId);
  const tasks = db.prepare('SELECT status FROM tasks WHERE account_id = ?').all(accountId);
  const facts = buildRealData({ slips, links, zalo, tasks });
  if (staffId) {
    // Dữ liệu từ phần mềm được giao cho chính nhân viên này (sản phẩm, giá, tồn kho, bài đăng…), chọn mục liên quan câu hỏi.
    const mine = staffLinkData(accountId, staffId);
    facts.phanMemCuaToi = softwareFacts(mine.links, mine.data, question);
  }
  return facts;
}
