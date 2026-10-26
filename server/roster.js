// 10 nhân sự cố định theo đặc tả. Mỗi tài khoản mới được tạo một bản riêng của danh sách này.
import { db, now } from './db.js';

export const GROUPS = {
  Marketing: 'Marketing',
  VanHanhKiemSoat: 'Vận hành và kiểm soát',
  HoTroKyThuat: 'Hỗ trợ và kỹ thuật',
};

export const ROSTER = [
  {
    id: 'STAFF-001', name: 'An', role: 'Nội dung', grp: 'Marketing', shortLabel: 'Nội dung',
    mainSoftware: 'Fanpage', zone: 'Marketing', deskIndex: 0,
    responsibilities: 'Soạn nội dung Fanpage, hook, định dạng bài, lịch đăng. Nhận hướng làm từ Tuấn, không tự quyết ngân sách quảng cáo.',
  },
  {
    id: 'STAFF-002', name: 'Bình', role: 'Quảng cáo', grp: 'Marketing', shortLabel: 'Quảng cáo',
    mainSoftware: 'Meta Ads', zone: 'Marketing', deskIndex: 1,
    responsibilities: 'Quyết cách chạy quảng cáo từ số liệu của Tuấn. Tối ưu bài đã đăng, đề xuất điều chỉnh ngay khi hiệu quả kém.',
  },
  {
    id: 'STAFF-003', name: 'Tuấn', role: 'Phân tích thị trường', grp: 'Marketing', shortLabel: 'Thị trường',
    mainSoftware: 'Dữ liệu nội bộ, số liệu bài viết', zone: 'Marketing', deskIndex: 2,
    responsibilities: 'Chạy đầu tiên và xuyên suốt trong mọi việc Marketing. Phân tích đối thủ, khu vực, chiến dịch thành công và chỉ số bài viết hiệu quả. Đưa hướng cho An, không quyết thay Bình.',
  },
  {
    id: 'STAFF-004', name: 'Sơn', role: 'Sale', grp: 'VanHanhKiemSoat', shortLabel: 'Sale',
    mainSoftware: 'KiotViet, Messenger luồng khách mới', zone: 'Vận hành', deskIndex: 3,
    responsibilities: 'Tra giá, thông tin, chức năng và tồn kho từ KiotViet khi khách nhắn. Chủ động nhắn khách từ like, comment và lead. Chỉ tạo phiếu bán hàng khi khách đã gửi đủ 6 thông tin bắt buộc: tên, số điện thoại, địa chỉ, sản phẩm và mã, số lượng, phương thức thanh toán.',
  },
  {
    id: 'STAFF-005', name: 'Dũng', role: 'Kho', grp: 'VanHanhKiemSoat', shortLabel: 'Kho',
    mainSoftware: 'KiotViet, Zalo nhóm giao hàng', zone: 'Vận hành', deskIndex: 4,
    responsibilities: 'Nhận đơn trực tiếp từ Sale khi phiếu được tạo, rà tồn kho trên KiotViet, chuẩn bị giao, ghi ảnh từ nhóm giao hàng Zalo vào đúng phiếu kèm tên nhóm, thời gian và ghi chú, rồi báo lại cho Sale.',
  },
  {
    id: 'STAFF-006', name: 'Hà', role: 'Kế toán', grp: 'VanHanhKiemSoat', shortLabel: 'Kế toán',
    mainSoftware: 'KiotViet', zone: 'Vận hành', deskIndex: 5,
    responsibilities: 'Thống kê doanh thu, số lượng, khách hàng và tồn kho. Lưu trữ phiếu, kiểm tra và góp ý mọi phát sinh tài chính bằng số liệu. Là người chốt cuối về số liệu tài chính và ký hoàn tất phiếu sau khi giao hàng xong.',
  },
  {
    id: 'STAFF-007', name: 'Phúc', role: 'Quản lý', grp: 'VanHanhKiemSoat', shortLabel: 'Quản lý',
    mainSoftware: 'Tổng hợp nội bộ', zone: 'Giữa, dưới cùng', deskIndex: 9,
    responsibilities: 'Kiểm tra thường xuyên toàn bộ văn phòng, đánh giá hiệu quả bằng số liệu, trả việc làm lại kèm lý do và tiêu chí đạt. Có quyền dừng mọi hành động ngay lập tức, kể cả khi Pháp lý đã cho qua. Chịu trách nhiệm toàn bộ và tổng hợp báo cáo cuối ngày lúc 21:00.',
  },
  {
    id: 'STAFF-008', name: 'Chi', role: 'Tư vấn và CSKH', grp: 'HoTroKyThuat', shortLabel: 'CSKH',
    mainSoftware: 'Messenger luồng khách cũ, KiotViet, Zalo', zone: 'Hỗ trợ', deskIndex: 6,
    responsibilities: 'Chăm sóc khách lâu không mua, lên kế hoạch chăm sóc, tạo combo và khuyến mại ở dạng đề xuất đưa vào báo cáo 21:00. Chỉ gửi cho khách khi người dùng đã duyệt, không tự gửi.',
  },
  {
    id: 'STAFF-009', name: 'Trang', role: 'Nhân sự và Hiệu suất', grp: 'HoTroKyThuat', shortLabel: 'Nhân sự',
    mainSoftware: 'Dữ liệu nội bộ', zone: 'Hỗ trợ', deskIndex: 7,
    responsibilities: 'Đo hiệu quả và thời gian làm việc hiệu quả của nhân viên, theo dõi chỉ số công việc, chăm sóc nhân viên, cảnh báo thiếu người và đề xuất tuyển thêm.',
  },
  {
    id: 'STAFF-010', name: 'Minh', role: 'Pháp lý và Rủi ro', grp: 'HoTroKyThuat', shortLabel: 'Pháp lý',
    mainSoftware: 'Dữ liệu nội bộ, gắn cờ rủi ro', zone: 'Hỗ trợ', deskIndex: 8,
    responsibilities: 'Kiểm tra khách hàng, luật mới, rủi ro sản phẩm, trùng thương hiệu và giá cạnh tranh. Kết luận chỉ có ba dạng: được bán, bán kèm điều kiện, hoặc tạm dừng chờ người dùng quyết. Là người chốt cuối về rủi ro pháp lý.',
  },
];

export const MANAGER_ID = 'STAFF-007';
export const byName = Object.fromEntries(ROSTER.map((s) => [s.name, s.id]));

function signCodeFor(index) {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KY-${String(index + 1).padStart(3, '0')}-${rand}`;
}

export function seedStaff(accountId) {
  const ins = db.prepare(`INSERT INTO staff (id, account_id, name, role, grp, short_label, sign_code,
    training_text, training_version, main_software, responsibilities, desk_index, zone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`);
  ROSTER.forEach((s, i) => {
    const training = `Trách nhiệm: ${s.responsibilities}\nPhần mềm chính: ${s.mainSoftware}.`;
    ins.run(s.id, accountId, s.name, s.role, s.grp, s.shortLabel, signCodeFor(i), training,
      s.mainSoftware, s.responsibilities, s.deskIndex, s.zone);
  });
}

export function rowToStaff(r) {
  return {
    id: r.id, name: r.name, role: r.role, group: r.grp, shortLabel: r.short_label,
    signCode: r.sign_code, trainingText: r.training_text, trainingVersion: r.training_version,
    mainSoftware: r.main_software, responsibilities: r.responsibilities,
    seat: { deskIndex: r.desk_index, zone: r.zone }, lastBrainLabel: r.last_brain_label,
  };
}

export function getStaff(accountId, staffId) {
  const r = db.prepare('SELECT * FROM staff WHERE account_id = ? AND id = ?').get(accountId, staffId);
  return r ? rowToStaff(r) : null;
}

export function listStaff(accountId) {
  return db.prepare('SELECT * FROM staff WHERE account_id = ? ORDER BY id').all(accountId).map(rowToStaff);
}

// Chọn nhân viên liên quan theo chuyên môn — không kéo cả 10 người vào mọi việc.
// Thứ tự trả về là thứ tự phát biểu: việc Marketing luôn để Tuấn chạy đầu tiên.
const TOPIC_RULES = [
  { re: /marketing|fanpage|like|follow|bài viết|bài đăng|nội dung|content|hook|quảng cáo|ads|chiến dịch|thương hiệu|tiếp thị|tương tác|reach/i, ids: ['STAFF-003', 'STAFF-001', 'STAFF-002'] },
  { re: /bán|sale|khách mua|đơn hàng|chốt đơn|báo giá|giá bán|phiếu/i, ids: ['STAFF-004'] },
  { re: /kho|tồn|giao hàng|vận chuyển|ship/i, ids: ['STAFF-005'] },
  { re: /doanh thu|chi phí|lợi nhuận|kế toán|tài chính|thu chi|ngân sách|công nợ/i, ids: ['STAFF-006'] },
  { re: /khách cũ|chăm sóc|cskh|khuyến mại|khuyến mãi|combo|tư vấn|hậu mãi/i, ids: ['STAFF-008'] },
  { re: /nhân sự|nhân viên|tuyển|hiệu suất|kpi|năng suất/i, ids: ['STAFF-009'] },
  { re: /pháp lý|luật|rủi ro|hợp đồng|thương hiệu trùng|trùng thương hiệu|vi phạm|đối thủ phá giá/i, ids: ['STAFF-010'] },
];

export function pickRelevantStaffIds(text) {
  const ids = [];
  for (const rule of TOPIC_RULES) {
    if (rule.re.test(text)) for (const id of rule.ids) if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length === 0) ids.push('STAFF-003', 'STAFF-004', 'STAFF-006'); // việc chung chưa rõ chuyên môn
  // Việc Marketing: Tuấn luôn đứng đầu
  if (ids.includes('STAFF-003')) ids.splice(ids.indexOf('STAFF-003'), 1), ids.unshift('STAFF-003');
  return ids.slice(0, 5);
}

export function isMarketing(text) {
  return TOPIC_RULES[0].re.test(text);
}
