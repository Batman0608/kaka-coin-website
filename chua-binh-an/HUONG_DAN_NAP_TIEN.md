# Cửa hàng hoa sen & nạp tiền — hướng dẫn cài đặt

## Cách hoạt động
1. Mỗi nhân vật có **mã nhân vật** riêng (ví dụ `CBA7K2Q9M`), xem trong Hồ sơ hoặc Cài đặt.
2. Người chơi vào **Dâng lễ → ➕ Nạp hoa sen**, chọn gói: 10k, 20k, 50k, 100k, 200k, 500k (10.000đ = 200 hoa sen).
3. Game hiện **mã QR VietQR**, số tài khoản, số tiền và **nội dung chuyển khoản tự sinh**: `HS <mã nhân vật> <số tiền>K` (ví dụ `HS CBA7K2Q9M 50K`).
4. Chuyển khoản xong, người chơi bấm **"Tôi đã chuyển khoản"** → yêu cầu được gửi lên Firebase, trạng thái "Chờ duyệt".
5. **Admin** chơi game như người thường. Sau khi đăng nhập quản trị, cột biểu tượng bên phải có nút **🛡 Duyệt nạp**, kèm số yêu cầu đang chờ, có chuông báo khi có yêu cầu mới.
6. Admin kiểm tra tài khoản ngân hàng: thấy tiền về đúng số tiền và nội dung thì bấm **✅ Chấp nhận**. Hoa sen tự cộng vào tài khoản người chơi (ngay cả khi người chơi đang online).
7. **Quà hằng ngày:** mỗi ngày nhận 20 hoa sen; ngày thứ 7 liên tiếp được thưởng thêm 50.
8. **Cửa hàng** (Dâng lễ → 🏪 Cửa hàng) bán lễ vật bằng hoa sen, nhiều công đức hơn lễ vật thường (lễ vật thường vẫn miễn phí).

## Bước 1: Điền tài khoản nhận tiền
Mở `js/shop-config.js`, điền phần `bank`:
```js
bank: { bank: 'MB', bankName: 'MB Bank', account: '0123456789', owner: 'NGUYEN VAN A' },
```
`bank` là mã ngân hàng theo VietQR: MB, VCB, TCB, ACB, VPB, BIDV, ICB (VietinBank), VBA (Agribank), TPB, STB…

## Bước 2: Tạo Firebase (miễn phí)
1. Vào https://console.firebase.google.com → **Add project** (tạo dự án).
2. **Build → Firestore Database → Create database** (chọn vùng `asia-southeast1`, chế độ production).
3. **Firestore → Rules**: xóa nội dung cũ, dán toàn bộ file `firestore.rules`, bấm **Publish**.
4. **Build → Authentication → Get started → Sign-in method**: bật **Anonymous** và **Email/Password**.
5. **Authentication → Users → Add user**: tạo tài khoản admin (email + mật khẩu). Chép **User UID** của tài khoản đó.
6. **Firestore → Start collection** tên `admins` → Document ID = **UID vừa chép** → thêm 1 trường bất kỳ (ví dụ `name: "admin"`) → Save.
7. **Project settings (⚙️) → Your apps → Web (</>)** → đăng ký app → chép đoạn `firebaseConfig`.
8. Dán vào `js/shop-config.js`:
```js
firebase: { apiKey: 'AIza…', authDomain: 'ten-du-an.firebaseapp.com', projectId: 'ten-du-an', appId: '1:…:web:…' },
```
9. **Authentication → Settings → Authorized domains**: thêm tên miền đang chạy game (ví dụ `kaka-coin.com`).

## Bước 3: Đăng nhập quản trị trong game
Cài đặt (⚙️) → **🛡 Đăng nhập quản trị** → nhập email/mật khẩu admin ở bước 2.5.

## Chế độ thử (chưa có Firebase)
Khi `firebase.apiKey` để trống, game chạy **chế độ thử**: yêu cầu nạp chỉ lưu trong trình duyệt đang mở, dùng để xem luồng duyệt.
Mật khẩu admin tạm: `admin123` (đổi ở `demoAdminPassword`). Mở 2 tab cùng trình duyệt: một tab người chơi, một tab admin.

## Lưu ý
- **Pháp lý:** tại Việt Nam, game online bán vật phẩm/tiền ảo thu tiền thật thường cần giấy phép phát hành (G1) và tuân thủ quy định về thanh toán. Hãy tìm hiểu kỹ trước khi mở nạp cho người chơi. Có thể tắt nạp bằng `topupEnabled: false`.
- Dữ liệu game (hạt, hoa sen…) vẫn lưu trên máy người chơi. Firebase chỉ giữ **yêu cầu nạp** và trạng thái duyệt, nên mỗi lần nạp chỉ được cộng một lần (đánh dấu "đã nhận" trên Firebase).
- Người chơi xóa dữ liệu trình duyệt sẽ mất nhân vật và hoa sen trên máy đó. Mã nhân vật cũng đổi, vì vậy nên nhắc người chơi giữ nguyên trình duyệt.
