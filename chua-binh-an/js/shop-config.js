/* =========================================================
   CỬA HÀNG HOA SEN & NẠP TIỀN — FILE CẤU HÌNH (tự điền)
   Xem hướng dẫn chi tiết: HUONG_DAN_NAP_TIEN.md
   ========================================================= */
window.CBA = window.CBA || {};
CBA.shop = {
  // bật/tắt chức năng nạp tiền thật (cửa hàng & quà hằng ngày vẫn chạy khi tắt)
  topupEnabled: false,   // TẠM ẨN nạp hoa sen & hòm công đức (không hiện số tài khoản) trong thời gian game miễn phí · đổi thành true để mở lại

  // tỉ lệ: 10.000đ = 200 hoa sen  →  1 hoa sen = 50đ
  vndPerLotus: 50,
  packs: [10000, 20000, 50000, 100000, 200000, 500000],

  // quà hằng ngày (hoa sen) · ngày thứ 7 liên tiếp được thêm thưởng
  daily: 20, dailyWeekBonus: 50,

  /* ---- TÀI KHOẢN NHẬN TIỀN (để trống = chưa hiện mã QR) ----
     bank: mã ngân hàng theo VietQR, ví dụ 'MB', 'VCB' (Vietcombank), 'TCB' (Techcombank),
           'ACB', 'VPB', 'BIDV', 'ICB' (VietinBank), 'VBA' (Agribank), 'TPB', 'STB' (Sacombank)…
     account: số tài khoản · owner: tên chủ tài khoản (VIẾT HOA KHÔNG DẤU) */
  bank: { bank: '', bankName: '', account: '', owner: '' },
  // tiền tố nội dung chuyển khoản: "HS <mã nhân vật> <số tiền>K"
  contentPrefix: 'HS',
  // hòm công đức ở các chùa: cùng các mức như gói nạp, nội dung CK "CD <mã nhân vật> <số tiền>K"
  donatePrefix: 'CD',

  /* ---- TÀI KHOẢN NGƯỜI CHƠI ----
     chơi đủ số giây này (thời gian thật, tab đang mở) thì mời tạo tài khoản */
  accountPromptSec: 900,
  // tên đăng nhập được đổi thành email nội bộ <tên>@<miền này> trên Firebase Authentication
  accountEmailDomain: 'chuabinhan.game',

  /* ---- FIREBASE (để trống = chế độ thử trên cùng một trình duyệt) ----
     Dán phần cấu hình web app lấy ở Firebase console → Project settings → Your apps. */
  firebase: {
    apiKey: 'AIzaSyAI6Eo1xE5lC77goV4wnrSuog_j-gkRFRY',
    authDomain: 'di-chua-online-1ea45.firebaseapp.com',
    projectId: 'di-chua-online-1ea45',
    storageBucket: 'di-chua-online-1ea45.firebasestorage.app',
    messagingSenderId: '113062550060',
    appId: '1:113062550060:web:f4abf77129898eb3754f89'
  },

  // chế độ thử (khi chưa có Firebase): mật khẩu admin tạm để xem bảng duyệt
  demoAdminPassword: 'admin123'
};

/* ---- MÁY CHỦ NHIỀU NGƯỜI CHƠI (server/server.js, chạy trên máy tính của bạn) ----
   'auto' = khi game được mở từ chính máy chủ thì tự nối về máy chủ đó.
   Nếu để file game ở nơi khác (GitHub Pages…), điền địa chỉ máy chủ, ví dụ 'wss://chua.ten-mien-cua-ban.com'.
   Để trống '' = luôn chơi một mình (Phật tử mô phỏng). */
CBA.server = { url: 'auto' };
