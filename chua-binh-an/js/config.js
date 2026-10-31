/* =========================================================================
 *  CHÙA BÌNH AN ONLINE — CẤU HÌNH CHUNG
 *  Sửa file này để đổi tên chùa, mốc quà, từ khóa, danh sách nhạc...
 * ========================================================================= */
window.CBA = window.CBA || {};

CBA.config = {
  templeName: 'Chùa Bình An',
  subtitle: 'Một khoảng lặng giữa dòng live',

  /* Ảnh nền riêng (9:16, ví dụ 1080x1920). Để trống = dùng điện thờ vẽ sẵn.
     Ví dụ: 'assets/bg.jpg'. Khi có ảnh nền, tượng Phật vẽ sẵn sẽ được ẩn
     (đặt showDrawnBuddhas: true nếu vẫn muốn hiện). */
  background: '',
  showDrawnBuddhas: true,

  /* Bộ Tam Thế Phật hiển thị trên điện (trái → giữa → phải).
     'hoanh' = Hoành Tam Thế (theo không gian): Dược Sư – Thích Ca – A Di Đà
     'thu'   = Thụ Tam Thế (theo thời gian):   A Di Đà – Thích Ca – Di Lặc
               (cách bài trí phổ biến ở chùa miền Bắc) */
  buddhaSet: 'hoanh',
  buddhaSets: {
    hoanh: [
      { name: 'Phật Dược Sư', sub: 'Đông Phương Lưu Ly', aura: '#8fc3ff', mantra: 'Nam Mô Dược Sư Lưu Ly Quang Vương Phật' },
      { name: 'Phật Thích Ca', sub: 'Ta Bà Giáo Chủ', aura: '#ffd36b', mantra: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật' },
      { name: 'Phật A Di Đà', sub: 'Tây Phương Cực Lạc', aura: '#ffb27a', mantra: 'Nam Mô A Di Đà Phật' }
    ],
    thu: [
      { name: 'Phật A Di Đà', sub: 'Quá Khứ', aura: '#ffb27a', mantra: 'Nam Mô A Di Đà Phật' },
      { name: 'Phật Thích Ca', sub: 'Hiện Tại', aura: '#ffd36b', mantra: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật' },
      { name: 'Phật Di Lặc', sub: 'Vị Lai', aura: '#ffe9a8', mantra: 'Nam Mô Đương Lai Hạ Sanh Di Lặc Tôn Phật' }
    ]
  },

  /* Kết nối TikFinity (Desktop App → Settings → WebSocket API) */
  tikfinity: {
    url: 'ws://localhost:21213/',
    autoConnect: false          // true = màn hình phát tự kết nối khi mở
  },

  /* ---------------- CÁCH TÍNH ĐIỂM ----------------
     Tổng Hạt = Comment×1 + Like×1 + Xu×10 (+ Follow/Share thưởng)
     Công Đức = Xu × 10  (chỉ quà tặng mới tạo Công Đức)                    */
  scoring: {
    beadsPerComment: 1,
    beadsPerMantraComment: 3,   // comment có "nam mô", "a di đà"... được thêm hạt
    beadsPerLike: 1,
    beadsPerCoin: 10,
    beadsPerFollow: 9,
    beadsPerShare: 9,
    congDucPerCoin: 10,
    commentCooldownMs: 2500     // chống spam: mỗi người chỉ được tính hạt 1 lần / 2,5s
  },

  /* ---------------- TU TẬP LÂU DÀI (lưu qua nhiều buổi live) ----------------
     Cấp độ tính theo TỔNG HẠT tích lũy của mỗi người xem qua mọi buổi live. */
  levels: [
    { at: 0,       name: 'Sơ Phát Tâm' },
    { at: 108,     name: 'Tín Tâm' },
    { at: 324,     name: 'Hỷ Tâm' },
    { at: 1080,    name: 'Tịnh Tâm' },
    { at: 3240,    name: 'Định Tâm' },
    { at: 10800,   name: 'Tuệ Tâm' },
    { at: 32400,   name: 'Từ Tâm' },
    { at: 108000,  name: 'Bi Tâm' },
    { at: 324000,  name: 'Bồ Đề Tâm' },
    { at: 1080000, name: 'Viên Mãn Tâm' }
  ],

  /* Chuỗi ngày lên chùa: tương tác ít nhất 1 lần mỗi ngày (giờ Việt Nam) */
  streak: { bonusPerDay: 3, maxBonus: 21, specialDays: [7, 21, 49, 100] },

  /* Đồng tâm: nhiều người cùng niệm trong 60 giây → cả phòng được nhân hạt */
  dongTam: { windowSec: 60, minPeople: 3, perPerson: 0.05, max: 1.5 },

  /* Hương trầm: người thắp hương được ×1.2 hạt trong 10 phút;
     quà Hoa đăng / Rồng làm "hương trầm tỏa khắp chùa" ×1.2 cho cả phòng 5 phút */
  incenseBuff: { mult: 1.2, personalMin: 10, roomMin: 5 },

  /* Ngày rằm, mùng 1, đại lễ (tự tính theo lịch âm) nhân hạt & công đức */
  lunarBonus: true,

  /* Tụng trọn một bài kinh có chữ: mọi người đang trong chùa được thưởng */
  chantCompleteBonus: 9,

  /* Cột mốc hạt của cả phòng (đạt bội số sẽ kích hoạt) */
  milestones: [
    { every: 108,   kind: 'vong',  title: 'Viên mãn một vòng tràng hạt', text: 'Cả phòng vừa niệm đủ 108 hạt. Nguyện cho tất cả được an lạc.' },
    { every: 1080,  kind: 'cauan', title: 'Lễ Cầu An Tập Thể', text: 'Đủ 1.080 hạt! Tam Thế Phật tỏa hào quang — toàn thể Phật tử cùng đảnh lễ cầu an.' },
    { every: 10800, kind: 'rong',  title: 'Đại Viên Mãn 10.800 hạt', text: 'Rồng vàng hộ pháp hiện lên giữa điện. Hồi hướng công đức đến khắp mười phương.' }
  ],

  /* Sân chùa */
  seats: { rows: 5, perSide: 4 },        // 5 hàng × 8 chỗ = 40 Phật tử trên màn hình
  idleMinutes: 8,                        // không tương tác quá lâu sẽ rời chùa (người có công đức được giữ lâu gấp 3)
  joinOnAnyComment: true,                // true: mọi comment đều đưa người xem vào chùa
  maxWishLength: 70,

  /* ---------------- QUÀ TẶNG ----------------
     Xếp bậc theo TỔNG XU của lần tặng (đơn giá × số lượng combo).
     Không phụ thuộc tên quà nên vẫn đúng khi TikTok đổi danh sách quà. */
  giftTiers: [
    { id: 'huong',   min: 1,    label: 'Thắp nén hương',        icon: '🕯️', effect: 'Hương cháy trên lư, khói nghi ngút' },
    { id: 'chuong',  min: 5,    label: 'Thắp nến · thỉnh chuông', icon: '🔔', effect: 'Nến sáng trên bàn thờ, chuông ngân' },
    { id: 'nguqua',  min: 30,   label: 'Dâng mâm ngũ quả',      icon: '🍑', effect: 'Mâm quả lên bàn thờ, mõ & chuông' },
    { id: 'hoasen',  min: 100,  label: 'Dâng hoa sen vàng',     icon: '🌸', effect: 'Sen vàng bay lên chân Phật, mưa cánh hoa' },
    { id: 'hoadang', min: 299,  label: 'Thả hoa đăng',          icon: '🏮', effect: 'Hoa đăng phủ kín màn hình, lời chúc riêng' },
    { id: 'rong',    min: 1000, label: 'Rồng vàng hộ pháp',     icon: '🐉', effect: 'Rồng vàng bay quanh điện, Tam Thế Phật tỏa hào quang' }
  ],

  /* Gán cứng một số quà phổ biến (tên tiếng Anh từ TikTok) → bậc tối thiểu.
     Bậc thực tế = max(bậc theo tên, bậc theo tổng xu). */
  giftNameToTier: {
    'Rose': 'huong',
    'Hoa hồng': 'huong',
    'TikTok': 'huong',
    'Finger Heart': 'chuong',
    'Tim ngón tay': 'chuong',
    'Donut': 'nguqua',
    'Perfume': 'chuong',
    'Hand Hearts': 'hoasen',
    'Corgi': 'hoadang',
    'Money Gun': 'hoadang',
    'Galaxy': 'rong',
    'Lion': 'rong'
  },

  /* Hướng dẫn hiển thị ở panel trái màn hình phát */
  guide: [
    { icon: '💬', title: 'Comment "Bình An"', desc: 'Vào chùa quỳ lễ' },
    { icon: '📿', title: 'Comment "Nam Mô"', desc: '+3 hạt niệm Phật' },
    { icon: '🏮', title: '"Cầu an/Nguyện + điều ước"', desc: 'Thả đèn nguyện' },
    { icon: '🤲', title: 'Comment "Tùy hỷ"', desc: 'Chung vui đèn nguyện' },
    { icon: '❤️', title: 'Thả tim', desc: 'Lần hạt · sen bay' },
    { icon: '🌹', title: 'Hoa hồng', desc: 'Thắp nén hương' },
    { icon: '🍩', title: 'Quà 30+ xu', desc: 'Dâng mâm ngũ quả' },
    { icon: '🏮', title: 'Quà 299+ xu', desc: 'Thả hoa đăng' },
    { icon: '🐉', title: 'Quà 1000+ xu', desc: 'Rồng hộ pháp' }
  ],

  /* Từ khóa trong comment (so khớp không dấu, không phân biệt hoa thường) */
  keywords: {
    mantra: ['nam mo', 'namo', 'a di da', 'adidaphat', 'adida phat', 'adida', 'di da phat', 'adi da', 'thich ca', 'duoc su', 'om mani', 'niem phat', 'binh an', 'mo phat'],
    cauAn: ['cau an', 'cau binh an', 'cau cho', 'nguyen cau', 'cau mong'],
    cauSieu: ['cau sieu', 'sieu do', 'hoi huong cho'],
    conMe: ['con me', 'con ca me', 'con cha me'],
    matMe: ['mat me', 'me da mat', 'mo coi me', 'me da di xa'],
    checkHat: ['!hat', 'hat cua toi', 'bao nhieu hat', '!congduc', '!cap'],
    nguyen: ['nguyen cho', 'con nguyen', 'xin nguyen', 'nguyen cau', 'uoc nguyen', 'nguyen mong'],   // + mọi comment bắt đầu bằng chữ "Nguyện" (có dấu, để không nhầm họ Nguyễn)
    tuyHy: ['tuy hy', 'tuyhy', 'tuy hi', 'tuy hi cong duc', 'tuy hy cong duc']
  },

  /* Từ cấm — comment chứa từ này không hiện bong bóng/lời nguyện */
  bannedWords: ['dm', 'dmm', 'dcm', 'vcl', 'vl', 'clm', 'cmm', 'dit', 'http', 'https', 'www', '.com', 'zalo', 'stk', 'vay tien', 'lua dao'],
  /* (từ đơn được so theo nguyên từ; cụm có dấu cách/dấu chấm được so theo chuỗi con) */

  /* Đọc lời cảm ơn bằng giọng máy (Text-to-Speech) cho quà từ X xu trở lên */
  ttsMinCoins: 30,

  /* Chương trình trong một buổi live (chọn trên bảng điều khiển) */
  segments: [
    { id: 'khaichuong', title: 'Khai Chuông · Nhập Điện', category: 'thien', note: 'Mời quý Phật tử comment "Bình An" để vào chùa' },
    { id: 'tungkinh',   title: 'Thời Khóa Tụng Kinh',     category: 'kinh',  note: 'Cùng tụng kinh — thả tim để lần hạt' },
    { id: 'niemphat',   title: 'Niệm Phật · Lần Tràng Hạt', category: 'niem', note: 'Comment "Nam Mô A Di Đà Phật" +3 hạt' },
    { id: 'giangphap',  title: 'Giảng Pháp · Đạo Lý',      category: 'giang', note: 'Lắng nghe lời Phật dạy' },
    { id: 'vulan',      title: 'Mùa Vu Lan Báo Hiếu',      category: 'vulan', note: 'Comment "còn mẹ" cài hoa hồng đỏ · "mất mẹ" cài hoa trắng' },
    { id: 'hoihuong',   title: 'Hồi Hướng Công Đức',       category: 'hoihuong', note: 'Nguyện đem công đức này hướng về khắp tất cả' }
  ]
};
