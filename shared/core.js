// Logic thuần (không phụ thuộc cơ sở dữ liệu) dùng chung cho server và bản trải nghiệm trên trình duyệt.

import { ROLE_PROFILES } from './roles.js';

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
// Vai trò chuẩn (phiên bản 2, theo mô tả của chủ văn phòng) ghi đè tên vai trò, nhãn và trách nhiệm.
for (const r of ROSTER) Object.assign(r, { role: ROLE_PROFILES[r.id].role, shortLabel: ROLE_PROFILES[r.id].shortLabel, responsibilities: ROLE_PROFILES[r.id].responsibilities });


export const MANAGER_ID = 'STAFF-007';
export const CSKH_ID = 'STAFF-008';
export const SALE_ID = 'STAFF-004';
export const KHO_ID = 'STAFF-005';
export const KE_TOAN_ID = 'STAFF-006';
export const MARKETING = { TUAN: 'STAFF-003', AN: 'STAFF-001', BINH: 'STAFF-002' };

export const defaultTraining = (s) => `Trách nhiệm: ${s.responsibilities}\nPhần mềm chính: ${s.mainSoftware}.`;

export function signCodeFor(index) {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LPA-KY-${String(index + 1).padStart(3, '0')}-${rand}`;
}

// Màu riêng mặc định của từng nhân viên (ảnh đại diện, áo nhân vật 3D, nhãn trên đầu).
export const STAFF_COLORS = {
  'STAFF-001': '#f2a516', 'STAFF-002': '#e2645a', 'STAFF-003': '#c03fd6', 'STAFF-004': '#e23b3b', 'STAFF-005': '#7fa6f0',
  'STAFF-006': '#c78ae6', 'STAFF-007': '#5fcf7e', 'STAFF-008': '#2fd1b4', 'STAFF-009': '#1f9bb5', 'STAFF-010': '#7a3fe0',
};
export const COLOR_CHOICES = ['#f2a516', '#e2645a', '#c03fd6', '#e23b3b', '#7fa6f0', '#c78ae6', '#5fcf7e', '#2fd1b4', '#1f9bb5', '#7a3fe0', '#f07fb0', '#9aa64a'];

// Trạng thái nhân viên. Người dùng đổi nhanh được; khi đang suy nghĩ hoặc đang có việc thì hệ thống tự hiện.
export const STAFF_STATUSES = { sleeping: 'Đang ngủ', thinking: 'Đang suy nghĩ', working: 'Đang làm việc', resting: 'Đang nghỉ', error: 'Báo lỗi' };

export function validateProfile({ shortLabel, color }) {
  const out = {};
  if (shortLabel !== undefined) {
    const v = String(shortLabel).trim().replace(/\s+/g, ' ');
    if (!v) throw new Error('Nhãn trên đầu không được để trống.');
    if (v.split(' ').length > 3 || v.length > 18) throw new Error('Nhãn trên đầu tối đa 3 chữ (18 ký tự).');
    out.shortLabel = v;
  }
  if (color !== undefined) {
    if (!/^#[0-9a-f]{6}$/i.test(String(color))) throw new Error('Màu không hợp lệ.');
    out.color = String(color).toLowerCase();
  }
  return out;
}

// Lưu tối đa 6 phiên bản đào tạo gần nhất để xem lại và khôi phục.
export function pushTrainingHistory(history, version, text) {
  return [{ version, text, at: new Date().toISOString() }, ...(history || []).filter((h) => h.version !== version)].slice(0, 6);
}

// ---------- Chọn người theo chuyên môn ----------
// Không kéo cả 10 người vào mọi việc. Thứ tự trả về là thứ tự phát biểu: việc Marketing luôn để Tuấn đầu tiên.
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
  if (ids.includes('STAFF-003')) ids.splice(ids.indexOf('STAFF-003'), 1), ids.unshift('STAFF-003');
  return ids.slice(0, 5);
}

export const isMarketing = (text) => TOPIC_RULES[0].re.test(text);

// Hỏi đích danh: "@An", "An ơi…", "chị Hà, …" → chỉ người đó trả lời.
export function addressedStaffId(staffList, text) {
  const lower = text.trim().toLocaleLowerCase('vi');
  for (const s of staffList) {
    const n = s.name.toLocaleLowerCase('vi');
    if (lower.includes(`@${n}`)) return s.id;
    if (new RegExp(`^(anh |chị |em |bạn )?${n}(\\s|,|:|ơi|$)`, 'u').test(lower)) return s.id;
  }
  return null;
}

// Phân loại việc → loại bộ não chuyên môn.
export function kindOfText(text) {
  if (/thiết kế|hình ảnh|ảnh bìa|banner|poster|logo|design/i.test(text)) return 'image_design';
  if (/viết bài|soạn bài|caption|nội dung|content|kịch bản|hook/i.test(text)) return 'writing';
  if (/phân tích sâu|phân tích chuyên sâu|báo cáo phân tích|đánh giá chuyên sâu|nghiên cứu/i.test(text)) return 'deep_analysis';
  return 'general';
}

// ---------- Giao thức suy nghĩ bắt buộc ----------
export function buildThinkingPrompt(staff, companyName, ctx) {
  return `
Bạn là ${staff.name}, vai trò ${staff.role} tại ${companyName}.
Đào tạo riêng của bạn (phiên bản ${staff.trainingVersion}): ${staff.trainingText}

GIAO THỨC SUY NGHĨ BẮT BUỘC, theo đúng thứ tự:
1. Đọc đúng câu hỏi: "${ctx.question}". Trả lời đúng câu hỏi này, không trả lời câu hỏi khác.
2. Tách rõ hai nhóm: dữ kiện ĐÃ CÓ trong bối cảnh và dữ kiện CHƯA BIẾT.
   Chưa biết thì nói rõ là chưa biết, không bịa số liệu, giá, tồn kho hay kết quả.
3. Phân tích từ góc chuyên môn của bạn (${staff.role}) trước. Được góp ý ngoài chuyên môn nếu có lý lẽ và căn cứ cụ thể,
   khi đó ghi rõ là góp ý ngoài chuyên môn. Không quyết thay người chốt cuối (Minh: rủi ro pháp lý, Hà: số liệu tài chính, Phúc: hiệu quả tổng thể).
4. Đưa phương án CỤ THỂ, kèm bước tiếp theo rõ ràng và mốc kiểm tra. Tự kiểm tra lại lập luận của mình trước khi trả lời.
5. Nếu đã có ý kiến của đồng nghiệp: xét LẦN LƯỢT TỪNG ý, kiểm tra chéo lý lẽ và dữ kiện, chỉ ra chỗ đúng, chỗ sai hoặc thiếu căn cứ.
   Ý của người khác tốt hơn thì nói thẳng và ủng hộ, bất kể chức danh. Không lặp lại nguyên văn, không đồng ý cho có.

Đồng nghiệp: ${ROSTER.map((r) => `${r.name} (${r.role})`).join(', ')}.
Trả lời bằng tiếng Việt, ngắn gọn, đi thẳng vào việc.${ctx.extraInstructions ? `\n\n${ctx.extraInstructions}` : ''}

Bối cảnh việc: ${JSON.stringify(ctx.currentTask ?? null)}
Sản phẩm và giá đính kèm: ${JSON.stringify((ctx.attachments || []).map((a) => ({ fileName: a.fileName, productName: a.productName, priceNote: a.priceNote })))}
Dữ kiện thật đã có: ${JSON.stringify(ctx.realData || {})}
Các lượt nói trước: ${JSON.stringify(ctx.priorTurns || [])}
`.trim();
}

// ---------- Dữ kiện thật nội bộ ----------
// Chỉ tổng hợp dữ liệu văn phòng đang có; nguồn ngoài chưa kết nối thì ghi rõ "chưa cập nhật".
export function buildRealData({ slips = [], links = [], zalo = [], tasks = [], nowIso = new Date().toISOString() }) {
  const today = nowIso.slice(0, 10);
  const byStatus = (list, key) => list.reduce((m, x) => ((m[x[key]] = (m[x[key]] || 0) + 1), m), {});
  const kiot = links.find((l) => /kiotviet/i.test(l.softwareName) && l.status === 'connected');
  return {
    thoiDiem: nowIso,
    phieuBanHang: {
      tong: slips.length,
      homNay: slips.filter((s) => s.createdAt?.startsWith(today)).length,
      daLuuTru: slips.filter((s) => s.archivedAt).length,
      tongSoLuongSanPham: slips.reduce((n, s) => n + (Number(s.quantity) || 0), 0),
      theoTrangThaiKho: byStatus(slips, 'warehouseStatus'),
    },
    viec: { tong: tasks.length, theoTrangThai: byStatus(tasks, 'status') },
    hangChoZalo: byStatus(zalo, 'status'),
    phanMemDaLienKet: links.map((l) => `${l.softwareName}: ${l.status}`),
    chuaCapNhat: [
      kiot ? null : 'Giá, tồn kho, doanh thu KiotViet: chưa cập nhật (chưa có liên kết KiotViet đang kết nối)',
      'Số liệu Fanpage / Meta Ads: chưa cập nhật (chưa có nguồn số liệu thật kết nối)',
    ].filter(Boolean),
  };
}

// ---------- Quy trình Marketing 5 bước ----------
// Thứ tự thực hiện việc Marketing; Tuấn chạy bước 1 và xuyên suốt, Phúc giám sát bước 5.
export const MARKETING_STEPS = [
  { step: 1, title: 'Phân tích thị trường', staff: [MARKETING.TUAN], ask: 'Phân tích đối thủ, khu vực, chiến dịch thành công và chỉ số bài viết hiệu quả. Đầu ra là số liệu và hướng làm cho An.' },
  { step: 2, title: 'Nội dung', staff: [MARKETING.AN], ask: 'Thiết kế và soạn nội dung, lịch đăng Fanpage theo hướng của Tuấn.' },
  { step: 3, title: 'Phân tích và tối ưu', staff: [MARKETING.TUAN, MARKETING.BINH], ask: 'Đối chiếu bài đã đăng với số liệu. Tuấn cung cấp số liệu, Bình quyết cách tối ưu quảng cáo; Tuấn không quyết thay Bình.' },
  { step: 4, title: 'Chạy quảng cáo', staff: [MARKETING.BINH], ask: 'Chạy quảng cáo theo cách đã quyết ở bước 3.' },
  { step: 5, title: 'Theo dõi và điều chỉnh ngay', staff: [MARKETING.BINH, MARKETING.TUAN, MANAGER_ID], ask: 'Theo dõi liên tục khi đang chạy; hiệu quả kém thì điều chỉnh ngay, không chờ hết chiến dịch. Phúc giám sát và đặt mốc kiểm tra.' },
];

// Danh sách lượt thực hiện: việc Marketing đi đúng 5 bước, người ngoài Marketing làm phần mình sau đó.
export function executionPlan(task) {
  const text = `${task.title}\n${task.description || ''}`;
  if (!isMarketing(text)) return task.assigneeIds.map((staffId) => ({ staffId, label: null, ask: null }));
  const plan = [];
  for (const s of MARKETING_STEPS) for (const staffId of s.staff) plan.push({ staffId, label: `Bước ${s.step} — ${s.title}`, ask: s.ask });
  for (const staffId of task.assigneeIds) if (!plan.some((p) => p.staffId === staffId)) plan.push({ staffId, label: null, ask: null });
  return plan;
}

// ---------- Phiếu bán hàng ----------
export const SLIP_REQUIRED = ['customerName', 'customerPhone', 'customerAddress', 'productNameAndCode', 'quantity', 'paymentMethod'];
const SLIP_LABELS = {
  customerName: 'tên khách', customerPhone: 'số điện thoại', customerAddress: 'địa chỉ',
  productNameAndCode: 'sản phẩm và mã', quantity: 'số lượng', paymentMethod: 'phương thức thanh toán',
};
export const WAREHOUSE_FLOW = ['pending', 'stock_checked', 'preparing', 'delivered', 'delivery_photo_recorded'];

export function assertSlipCanBeCreated(input) {
  for (const field of SLIP_REQUIRED) {
    let v = input[field];
    if (typeof v === 'string') v = v.trim();
    if (field === 'quantity') v = Number(v);
    if (v === undefined || v === null || v === '' || v === 0 || Number.isNaN(v)) {
      throw new Error(`Thiếu thông tin bắt buộc để tạo phiếu: ${field} (${SLIP_LABELS[field]}). Sale phải hỏi thêm khách.`);
    }
  }
}

// ---------- Báo cáo cuối ngày 21:00 ----------
export const REPORT_HOUR = 21;
export const hcmDate = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
export const hcmHour = (d = new Date()) => Number(d.toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }));

export const CSKH_REPORT_QUESTION = (date) =>
  `Chuẩn bị phần đề xuất CSKH cho báo cáo cuối ngày ${date}: kế hoạch chăm sóc khách lâu không mua, combo và khuyến mại ở dạng ĐỀ XUẤT chờ người dùng duyệt. Chỉ dựa trên dữ kiện thật đã có; thiếu dữ liệu khách thì nói rõ cần dữ liệu gì.`;

export const MANAGER_REPORT_QUESTION = (date) =>
  `Tổng hợp BÁO CÁO CUỐI NGÀY ${date} của toàn văn phòng: việc đã xong, việc đang làm, việc bị dừng hoặc trả làm lại, phiếu bán hàng, hàng chờ Zalo, lỗi bộ não, và đề xuất CSKH của Chi (đang chờ người dùng duyệt). Đánh giá hiệu quả bằng số liệu có trong dữ kiện thật, chỉ ra việc cần làm lại kèm tiêu chí đạt, và ưu tiên cho ngày mai. Không bịa số liệu.`;

// Ảnh chụp trạng thái văn phòng cho báo cáo (không chứa dữ liệu bí mật).
export function reportSnapshot(tasks, staffById) {
  return tasks.slice(0, 40).map((t) => ({
    viec: t.title, trangThai: t.status, nguoiPhuTrach: t.assigneeIds.map((id) => staffById[id]?.name || id),
    loi: t.lastError || null, lyDoDung: t.stopReason || null, traLamLai: t.returnReason || null,
  }));
}
