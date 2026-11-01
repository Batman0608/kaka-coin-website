# Cửa hàng hoa sen, nạp tiền, hòm công đức & tài khoản: hướng dẫn cài đặt

## Cách hoạt động
1. Mỗi nhân vật có **mã nhân vật** riêng (ví dụ `CBA7K2Q9M`), xem trong Hồ sơ hoặc Cài đặt.
2. Người chơi vào **Dâng lễ → ➕ Nạp hoa sen**, chọn gói: 10k, 20k, 50k, 100k, 200k, 500k (10.000đ = 200 hoa sen).
3. Game hiện **mã QR VietQR**, số tài khoản, số tiền và **nội dung chuyển khoản tự sinh**: `HS <mã nhân vật> <số tiền>K` (ví dụ `HS CBA7K2Q9M 50K`).
4. Chuyển khoản xong, người chơi bấm **"Tôi đã chuyển khoản"** → yêu cầu được gửi lên Firebase, trạng thái "Chờ duyệt".
5. **Admin** chơi game như người thường. Sau khi đăng nhập quản trị, cột biểu tượng bên phải có nút **🛡 Duyệt nạp**, kèm số yêu cầu đang chờ, có chuông báo khi có yêu cầu mới.
6. Admin kiểm tra tài khoản ngân hàng: thấy tiền về đúng số tiền và nội dung thì bấm **✅ Chấp nhận**. Hoa sen tự cộng vào tài khoản người chơi (ngay cả khi người chơi đang online).
7. **Quà hằng ngày:** mỗi ngày nhận 20 hoa sen; ngày thứ 7 liên tiếp được thưởng thêm 50.
8. **Cửa hàng** (Dâng lễ → 🏪 Cửa hàng) bán lễ vật bằng hoa sen, nhiều công đức hơn lễ vật thường (lễ vật thường vẫn miễn phí).
9. **Hòm công đức:** mỗi chùa có hòm công đức trong chánh điện, bên phải bàn thờ (đến gần hòm bấm **💝 Hòm công đức**, hoặc vào Dâng lễ → 💝 Hòm công đức). Các mức cúng dường giống các gói nạp, mỗi mức có một chứng nhận và biểu tượng riêng:

   | Mức | Chứng nhận | Biểu tượng |
   |---|---|---|
   | 10.000đ | Tùy Hỷ Công Đức | 🪷 |
   | 20.000đ | Thiện Tâm Công Đức | 🌸 |
   | 50.000đ | Hộ Pháp Công Đức | 🏵️ |
   | 100.000đ | Công Đức Viên Mãn | 📿 |
   | 200.000đ | Đại Thí Chủ | 🏮 |
   | 500.000đ | Hộ Trì Tam Bảo | ☸️ |

   Nội dung chuyển khoản: `CD <mã nhân vật> <số tiền>K`. Admin chấp nhận trong cùng bảng **🛡 Duyệt nạp** (yêu cầu công đức có viền vàng). Khi được chấp nhận, người chơi nhận **giấy chứng nhận** (xem và lưu ảnh trong Hồ sơ hoặc trong hòm công đức), công đức, và biểu tượng của chứng nhận cao nhất hiện cạnh tên nhân vật.
   **Admin bấm vào hòm công đức** để xem tổng đã nhận: tại chùa đó, trên tất cả các chùa, theo từng chùa, các lượt gần đây, và số yêu cầu đang chờ.
10. **Tài khoản người chơi:** sau 900 giây chơi thật (đổi ở `accountPromptSec`), game mời tạo tài khoản (tên đăng nhập + mật khẩu). Tạo xong, mọi dữ liệu (hồ sơ, hạt, công đức, hoa sen, chứng nhận, cài đặt) tự lưu lên tài khoản mỗi 12 giây và khi đóng game. Lần sau, hoặc trên máy khác, chỉ cần đăng nhập. Người chơi có thể bấm "Không cần tài khoản": game cảnh báo dữ liệu sẽ không được lưu rồi tắt lời mời. Vẫn tạo tài khoản được bất cứ lúc nào ở Cài đặt → 👤 Tài khoản.
   Admin cũng có thể đăng nhập bằng tài khoản người chơi của mình: nếu UID của tài khoản đó có trong `admins`, game tự bật chế độ quản trị.
11. **Cài game về điện thoại:** trên điện thoại có nút **📲 Cài game** ở cột bên phải (và trong Cài đặt). Android/Chrome cài trực tiếp; iPhone hiện hướng dẫn "Chia sẻ → Thêm vào MH chính". Để cài được, game phải chạy trên **tên miền HTTPS riêng** (GitHub Pages, Firebase Hosting, Netlify…). Trong khung xem trước của Claude hay trong trình duyệt của Zalo/Facebook thì không cài được.

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
4. **Build → Authentication → Get started → Sign-in method**: bật **Anonymous** và **Email/Password** (Email/Password dùng cho cả tài khoản người chơi lẫn admin; tên đăng nhập được đổi thành email nội bộ `<tên>@chuabinhan.game`).
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
- Người chơi **có tài khoản**: dữ liệu lưu trên Firestore `players/<UID>`, chỉ chính họ đọc/ghi được. Người chơi **không có tài khoản**: dữ liệu chỉ nằm trong trình duyệt, xóa trình duyệt là mất.
- Yêu cầu nạp và cúng dường nằm ở `topups` (trường `kind`: `topup` hoặc `donate`). Mỗi lần nạp chỉ được cộng một lần (đánh dấu "đã nhận" trên Firebase).
- Đây là game chạy trên trình duyệt: người rành kỹ thuật có thể tự sửa số hoa sen trong dữ liệu của mình. Nếu cần chống gian lận tuyệt đối, phải chuyển phần ví hoa sen lên máy chủ (Cloud Functions).
- **Tiền cúng dường:** thu tiền công đức qua game nên do chính chùa hoặc đơn vị được chùa ủy quyền đứng tên tài khoản nhận, minh bạch sổ sách và tuân thủ quy định về tiếp nhận tài trợ/quyên góp.
- **Chế độ thử:** tài khoản người chơi lưu trong trình duyệt đang mở (khóa `cba_accounts_demo`), chỉ để xem thử luồng.
