// Cổng phiếu bán hàng: 6 trường bắt buộc, luồng ký Sale → Kho → Kế toán, chỉ lưu trữ khi Kế toán ký hoàn tất.
import { db, now, nextCounter } from './db.js';
import { getStaff } from './roster.js';
import { isTaskBlocked } from './tasks.js';

export const REQUIRED = ['customerName', 'customerPhone', 'customerAddress', 'productNameAndCode', 'quantity', 'paymentMethod'];
const LABELS = {
  customerName: 'tên khách', customerPhone: 'số điện thoại', customerAddress: 'địa chỉ',
  productNameAndCode: 'sản phẩm và mã', quantity: 'số lượng', paymentMethod: 'phương thức thanh toán',
};
const SALE = 'STAFF-004', KHO = 'STAFF-005', KE_TOAN = 'STAFF-006';
const WAREHOUSE_FLOW = ['pending', 'stock_checked', 'preparing', 'delivered', 'delivery_photo_recorded'];

export function assertSlipCanBeCreated(input) {
  for (const field of REQUIRED) {
    let v = input[field];
    if (typeof v === 'string') v = v.trim();
    if (field === 'quantity') v = Number(v);
    if (v === undefined || v === null || v === '' || v === 0 || Number.isNaN(v)) {
      throw new Error(`Thiếu thông tin bắt buộc để tạo phiếu: ${field} (${LABELS[field]}). Sale phải hỏi thêm khách.`);
    }
  }
}

function rowToSlip(r) {
  return {
    id: r.id, createdByStaffId: r.created_by_staff_id, customerName: r.customer_name, customerPhone: r.customer_phone,
    customerAddress: r.customer_address, productNameAndCode: r.product_name_and_code, quantity: r.quantity,
    paymentMethod: r.payment_method, signatures: JSON.parse(r.signatures), warehouseStatus: r.warehouse_status,
    deliveryPhoto: r.delivery_photo ? JSON.parse(r.delivery_photo) : null, accountingSignedOff: !!r.accounting_signed_off,
    archivedAt: r.archived_at, taskId: r.task_id, createdAt: r.created_at,
  };
}

export const listSlips = (accountId) =>
  db.prepare('SELECT * FROM sales_slips WHERE account_id = ? ORDER BY created_at DESC').all(accountId).map(rowToSlip);

function getSlip(accountId, id) {
  const r = db.prepare('SELECT * FROM sales_slips WHERE account_id = ? AND id = ?').get(accountId, id);
  if (!r) throw new Error('Không tìm thấy phiếu.');
  return rowToSlip(r);
}

function sign(staffId, accountId) {
  const s = getStaff(accountId, staffId);
  return { staffId, staffName: s.name, signCode: s.signCode, signedAt: now() };
}

export function createSlip(accountId, input) {
  assertSlipCanBeCreated(input);
  if (isTaskBlocked(accountId, input.taskId)) throw new Error('Việc liên quan đang bị Quản lý dừng.');
  const id = `PBH-${String(nextCounter(accountId, 'slip')).padStart(5, '0')}`;
  db.prepare(`INSERT INTO sales_slips (id, account_id, created_by_staff_id, customer_name, customer_phone, customer_address,
    product_name_and_code, quantity, payment_method, signatures, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, accountId, SALE, input.customerName.trim(), String(input.customerPhone).trim(), input.customerAddress.trim(),
      input.productNameAndCode.trim(), Number(input.quantity), input.paymentMethod.trim(),
      JSON.stringify([sign(SALE, accountId)]), input.taskId || null, now());
  return getSlip(accountId, id);
}

function save(accountId, slip) {
  db.prepare(`UPDATE sales_slips SET signatures = ?, warehouse_status = ?, delivery_photo = ?, accounting_signed_off = ?, archived_at = ?
    WHERE account_id = ? AND id = ?`).run(JSON.stringify(slip.signatures), slip.warehouseStatus,
    slip.deliveryPhoto ? JSON.stringify(slip.deliveryPhoto) : null, slip.accountingSignedOff ? 1 : 0, slip.archivedAt, accountId, slip.id);
  return getSlip(accountId, slip.id);
}

// Kho chuyển trạng thái theo đúng thứ tự; bước "đã nhận ảnh" phải kèm thông tin ảnh từ nhóm Zalo.
export function advanceWarehouse(accountId, id, nextStatus, photo) {
  const slip = getSlip(accountId, id);
  if (slip.archivedAt) throw new Error('Phiếu đã lưu trữ.');
  if (isTaskBlocked(accountId, slip.taskId)) throw new Error('Việc liên quan đang bị Quản lý dừng.');
  const cur = WAREHOUSE_FLOW.indexOf(slip.warehouseStatus);
  if (WAREHOUSE_FLOW.indexOf(nextStatus) !== cur + 1) throw new Error(`Kho phải đi đúng thứ tự: sau "${slip.warehouseStatus}" là "${WAREHOUSE_FLOW[cur + 1] || 'hết bước'}".`);
  if (nextStatus === 'delivery_photo_recorded') {
    if (!photo?.sourceGroupName?.trim()) throw new Error('Ghi ảnh giao hàng cần tên nhóm giao hàng Zalo thực tế.');
    slip.deliveryPhoto = { sourceGroupName: photo.sourceGroupName.trim(), recordedAt: now(), note: (photo.note || '').trim() };
    if (!slip.signatures.some((s) => s.staffId === KHO)) slip.signatures.push(sign(KHO, accountId));
  }
  if (nextStatus === 'stock_checked' && !slip.signatures.some((s) => s.staffId === KHO)) slip.signatures.push(sign(KHO, accountId));
  slip.warehouseStatus = nextStatus;
  return save(accountId, slip);
}

export function accountingSignOff(accountId, id) {
  const slip = getSlip(accountId, id);
  if (slip.warehouseStatus !== 'delivery_photo_recorded') throw new Error('Kế toán chỉ ký hoàn tất khi Kho đã ghi ảnh giao hàng vào phiếu.');
  slip.accountingSignedOff = true;
  if (!slip.signatures.some((s) => s.staffId === KE_TOAN)) slip.signatures.push(sign(KE_TOAN, accountId));
  return save(accountId, slip);
}

export function archiveSlip(accountId, id) {
  const slip = getSlip(accountId, id);
  const need = [SALE, KHO, KE_TOAN].filter((sid) => !slip.signatures.some((s) => s.staffId === sid));
  if (need.length) throw new Error(`Chưa đủ chữ ký: thiếu ${need.map((sid) => getStaff(accountId, sid).name).join(', ')}.`);
  if (!slip.accountingSignedOff) throw new Error('Chưa có ký hoàn tất của Kế toán.');
  slip.archivedAt = now();
  return save(accountId, slip);
}
