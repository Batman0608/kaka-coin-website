# KỊCH BẢN GAME: CHÙA BÌNH AN ONLINE (TIKTOK LIVE TƯƠNG TÁC) — BẢN 2

> Bản này dựa trên kịch bản gốc, đã kiểm tra, sửa các điểm sai và bổ sung dữ liệu.
> Mọi con số, từ khóa, lời chúc đều sửa được trong `js/config.js` và `js/content.js`.

---

## 0. Những điểm đã sửa so với kịch bản gốc

| # | Kịch bản gốc | Vấn đề | Cách xử lý trong bản 2 |
|---|---|---|---|
| 1 | Tam Thế Phật = Thích Ca, A Di Đà, Dược Sư | Bộ này đúng tên là **Hoành Tam Thế** (theo không gian: Đông – Giữa – Tây). Nhiều chùa miền Bắc thờ **Thụ Tam Thế** (theo thời gian): A Di Đà (quá khứ), Thích Ca (hiện tại), Di Lặc (vị lai). | Có cả hai bộ, chuyển trên bảng điều khiển. Mặc định: Dược Sư – Thích Ca – A Di Đà. |
| 2 | Donut / Tim ngón tay = 5–10 xu | Giá thật: Tim ngón tay 5 xu, **Donut 30 xu**, Corgi 299, Súng tiền 500… TikTok còn hay đổi danh sách quà. | Xếp hiệu ứng theo **tổng số xu** của lần tặng, có thêm bảng gán theo tên quà. Quà mới vẫn tự rơi vào đúng bậc. |
| 3 | Mỗi quà tính ngay khi nhận | Quà combo (ấn liên tục) gửi nhiều sự kiện → bị **cộng trùng**. | Chỉ tính khi combo kết thúc (`repeatEnd`), lấy đúng số lượng cuối. |
| 4 | Comment +1 hạt | Spam comment sẽ đẩy điểm vô hạn. | Mỗi người chỉ được tính hạt từ comment 1 lần / 2,5 giây. |
| 5 | Một mốc 108 hạt | Với tim ×1, mốc 108 sẽ nổ liên tục mỗi vài giây, hết ý nghĩa. | 3 tầng: **108** (chuông nhỏ, cả chùa lạy) → **1.080** (Cầu An Tập Thể, hào quang) → **10.800** (Rồng hộ pháp). |
| 6 | Công đức không rõ cách tính | — | **Công đức = Xu × 10**, chỉ từ quà. **Hạt** = mọi tương tác. Có 2 bảng: Công Đức (người tặng quà) và Tinh Tấn (người niệm nhiều, kể cả không tặng quà). |
| 7 | Chưa có lọc comment | Lời nguyện hiện công khai trên màn hình → có thể bị chèn chửi bậy, quảng cáo, số tài khoản. | Danh sách từ cấm; comment vi phạm vẫn được tính hạt nhưng không hiện chữ. |

---

## I. Bố cục màn hình (1080×1920, dọc 9:16)

Bố cục đã tránh các vùng TikTok che (tên kênh ở trên cùng, bình luận góc dưới trái, nút bên phải). Bấm phím **S** trên màn hình phát để xem vùng an toàn.

```
┌──────────────────────────────────────┐
│ (vùng TikTok: tên kênh, người xem)   │  0–250
│      ╔═══ CHÙA BÌNH AN ═══╗           │
│  [● LIVE] [🙏 34 trong chùa] [✨ CĐ]  │
│       Chương trình: Tụng kinh         │
│┌────────┐  ☸    ☸☸☸    ☸  ┌────────┐│
││Cách    │ Dược  Thích  A Di │Bảng    ││  350–830
││tham gia│  Sư    Ca    Đà   │Công Đức││
││(8 mục) │ ═══ bàn thờ ═══   │Tinh Tấn││
│└────────┘ nến · ngũ quả · sen└────────┘│
│            ◯ tràng hạt 108 ◯          │  810–1150
│            ◯   lư hương    ◯          │
│            ◯  12.345 hạt   ◯          │
│  🧎🧎🧎🧎   ║thảm║   🧎🧎🧎🧎          │
│  🧎🧎🧎🧎   ║ đỏ ║   🧎🧎🧎🧎          │  sân chùa: 5 hàng × 8 = 40 chỗ
│  [ Thẻ lời chúc dành cho ... ]        │
│  [ Thông báo quà ]                    │
│ ┌──────────────────────────────────┐  │
│ │ ♪ Đang phát: Bát Nhã Tâm Kinh    │  │  1570–1700
│ │ Sắc bất dị không, không bất dị sắc│  │
│ └──────────────────────────────────┘  │
└──────────────────────────────────────┘
```

- **Phật tử áo lam** quay lưng về phía màn hình, quỳ hướng lên điện. Màu áo theo công đức:
  lam (thường) → nâu (≥10 công đức) → trắng (≥1.000) → **vàng phát sáng** (Top 3).
- **Chỗ ngồi theo công đức**: người công đức cao nhất ngồi hàng đầu gần điện; khi có người vượt lên, các nhân vật tự đổi chỗ (đi bộ sang vị trí mới). Hết 40 chỗ thì người ít điểm vào hàng chờ.
- Không tương tác 8 phút sẽ rời chùa (người đã tặng quà được giữ lâu gấp 3).

---

## II. Bảng tương tác

### 1. Comment

| Comment (có dấu hay không dấu đều được) | Hiệu ứng | Hạt |
|---|---|---|
| Bất kỳ | Nhân vật mang tên TikTok đi từ cổng vào chỗ quỳ, bong bóng thoại | +1 |
| “Bình an”, “Nam mô…”, “A Di Đà Phật”, “adidaphat”, “Om mani”… | Lạy, sen nhỏ bay lên | **+3** |
| “Cầu an + điều ước” (vd: *Cầu an cho mẹ con mau khỏe*) | Bong bóng vàng lời nguyện + thông báo | +1 |
| “Cầu siêu …” | Đèn cầu siêu, tiếng khánh, thẻ lời nguyện (mỗi người 2 phút/lần) | +1 |
| “Còn mẹ” (mùa Vu Lan) | Cài **hoa hồng đỏ** lên nhân vật | +1 |
| “Mất mẹ” | Cài **hoa hồng trắng** | +1 |
| “!hat” | Bong bóng báo số hạt + công đức của người đó | +1 |

### 2. Tim, Follow, Share

| Hành động | Hiệu ứng | Hạt |
|---|---|---|
| Thả tim | Vào chùa, sen hồng bay lên, tràng hạt nhảy, tiếng mõ | +1 / tim |
| Follow | Chuông nhỏ, “đã theo dõi chùa” | +9 |
| Share | Chuông nhỏ, “đã chia sẻ phiên live” | +9 |

### 3. Quà tặng (xếp theo tổng xu của lần tặng)

| Bậc | Tổng xu | Quà ví dụ | Hiệu ứng | Âm thanh |
|---|---|---|---|---|
| 1. Thắp nén hương | 1–4 | Hoa hồng, TikTok | Nén hương cắm lên lư (cháy 4 phút), khói dày lên, nhân vật cầm hương và lạy | Mõ |
| 2. Thắp nến · thỉnh chuông | 5–29 | Tim ngón tay, Nước hoa | Một ngọn nến trên bàn thờ sáng lên (tối đa 6) + thẻ lời chúc | Chuông gia trì |
| 3. Dâng mâm ngũ quả | 30–99 | Donut | Mâm ngũ quả xuất hiện trên bàn thờ + thẻ lời chúc + câu đạo lý | Mõ, mõ, khánh |
| 4. Dâng hoa sen vàng | 100–298 | Hand Hearts | Sen vàng bay từ chỗ người tặng lên chân Phật, mưa cánh hoa | Khánh + đại hồng chung |
| 5. Thả hoa đăng | 299–999 | Corgi, Súng tiền | 40 hoa đăng bay lên toàn màn hình, Tam Thế Phật sáng lên, thẻ lời chúc riêng + hồng danh Phật | 3 hồi chuông |
| 6. Rồng vàng hộ pháp | ≥1.000 | Galaxy, Sư tử | Rồng vàng bay quanh điện, hào quang tỏa, cả chùa cùng lạy | 3 hồi đại hồng chung |

- Hiệu ứng bậc 5–6 được **xếp hàng** để không đè lên nhau; ai tặng cũng được xướng tên trọn vẹn.
- Quà từ 30 xu: máy **đọc lời cảm ơn** bằng giọng tiếng Việt (bật/tắt được).
- Quà combo: hoa hồng ×10 = 10 xu → lên bậc 2 (thắp nến) và cắm 5 nén hương.

### 4. Cột mốc của cả phòng

| Tổng hạt | Sự kiện |
|---|---|
| Mỗi 108 | “Viên mãn một vòng tràng hạt” — chuông, cả chùa lạy, mưa cánh hoa |
| Mỗi 1.080 | **Lễ Cầu An Tập Thể** — Tam Thế Phật tỏa hào quang 8 giây, 2 hồi đại hồng chung |
| Mỗi 10.800 | **Đại Viên Mãn** — Rồng vàng + 50 hoa đăng |

Mục tiêu chung giúp cả người không tặng quà cũng có lý do ở lại thả tim: *“Còn 230 hạt nữa là đủ 1.080, cả nhà cùng thả tim nhé!”*

---

## III. Hệ thống âm thanh

**Hiệu ứng (tạo bằng trình duyệt, không cần file):** tiếng mõ gỗ, chuông gia trì, khánh, đại hồng chung, nhạc thiền nền (ngũ cung).

**Danh sách phát** (bảng điều khiển → mục ③):

| Bài | Loại | Ghi chú |
|---|---|---|
| Nhạc Thiền Tĩnh Tâm | Tổng hợp | Chạy ngay; hiện câu đạo lý luân phiên |
| Bát Nhã Tâm Kinh | Gõ mõ + chữ kinh | Chữ Hán Việt chạy theo nhịp mõ — người dẫn tụng theo được |
| Niệm Hồng Danh Tam Thế Phật | Gõ mõ + chữ | |
| Niệm Phật A Di Đà | Gõ mõ + chữ | |
| Hồi Hướng Công Đức | Gõ mõ + chữ | Dùng cuối buổi |
| Vu Lan Báo Hiếu | Tổng hợp + chữ | Lời nhắc hiếu đạo |
| Chú Đại Bi, Chú Dược Sư, Kinh Vu Lan, Giảng pháp, Nhạc thiền | File mp3 của bạn | Chép vào `audio/`. Thiếu file thì tự chuyển sang gõ mõ + chữ kinh |

Chức năng: bật/tắt nhạc, bật/tắt mõ chuông, âm lượng riêng, bài trước/sau, lặp 1 bài, ngẫu nhiên, tự giảm nhạc khi chuông hoặc giọng đọc vang lên.

**Bài giảng** (hiện từng câu trên màn hình, 8 giây/câu): Tứ Diệu Đế · Năm Giới · Nhẫn Nhục · Vô Thường · Sự tích Mục Kiền Liên cứu mẹ.

---

## IV. Chương trình một buổi live (gợi ý 60–90 phút)

| Phút | Chương trình | Nhạc tự đổi | Người dẫn nói |
|---|---|---|---|
| 0–10 | **Khai Chuông · Nhập Điện** | Nhạc thiền | “Mời quý Phật tử comment *Bình An* để vào chùa” |
| 10–30 | **Thời Khóa Tụng Kinh** | Bát Nhã / Chú Đại Bi | Tụng theo chữ chạy trên màn hình |
| 30–45 | **Niệm Phật · Lần Tràng Hạt** | Niệm A Di Đà | “Còn X hạt nữa là đủ 1.080 — cùng thả tim” |
| 45–60 | **Giảng Pháp** | Bài giảng hiện chữ | Kể chuyện, đọc comment hỏi đáp |
| (tháng 7 âm lịch) | **Mùa Vu Lan** | Vu Lan | “Còn mẹ” / “mất mẹ” cài hoa |
| 60–70 | **Hồi Hướng** | Hồi hướng | Đọc tên Top Công Đức + Tinh Tấn (xuất CSV) |

Lịch cố định giúp người xem quay lại: **5h sáng** (tụng sáng), **20h tối** (tụng tối), **rằm và mùng 1**, **Phật Đản**, **Vu Lan**.

---

## V. Thu nhập — nói thật để tránh bị khóa kênh

**Tiền đến từ đâu:** Quà người xem tặng → TikTok đổi thành Kim cương → bạn rút tiền. TikTok giữ lại một phần lớn giá trị quà; tỉ lệ và điều kiện (độ tuổi, số người theo dõi để được LIVE và nhận quà) thay đổi theo thời gian — kiểm tra trong ứng dụng TikTok trước khi tính toán.

**Những thứ làm người xem muốn tặng quà (đã có trong game):**
1. Được **xướng tên** trên thẻ lời chúc riêng, được đọc tên bằng giọng nói.
2. **Ngồi hàng đầu**, áo vàng phát sáng, đứng tên trên Bảng Công Đức.
3. Hiệu ứng lớn, đẹp mà cả phòng cùng xem (hoa đăng, rồng).
4. Mục tiêu chung của cả phòng (1.080 / 10.800 hạt).
5. Tên được đọc trong phần **Hồi Hướng** cuối buổi.

**Những việc KHÔNG nên làm** (dễ bị TikTok hạn chế LIVE, cấm nhận quà hoặc khóa kênh):
- ❌ Nói hoặc viết kiểu “tặng quà để được Phật phù hộ / giải hạn / hết bệnh”. Hứa lợi ích tâm linh để đổi lấy tiền có thể bị coi là lừa đảo, và cũng không đúng tinh thần nhà Phật. Hãy dùng “cảm ơn tấm lòng”, “tùy hỷ công đức”.
- ❌ Bật **bot mô phỏng** khi đang live thật (ảnh chụp số 2 của bạn đang chạy 5.000 bot). Tương tác giả vi phạm quy định TikTok. Bot trong game này chỉ để thử, và màn hình sẽ luôn hiện chữ “MÔ PHỎNG” khi bot chạy.
- ❌ Hiện số tài khoản ngân hàng, mã QR hoặc Zalo trên màn hình để xin tiền ngoài TikTok.
- ❌ Phát nhạc hoặc giọng tụng có bản quyền của người khác (nhiều bản Chú Đại Bi, nhạc Phật nổi tiếng có bản quyền) → bị tắt tiếng hoặc gỡ live. Hãy tự thu giọng tụng, xin phép chùa hoặc mua nhạc có giấy phép.
- ❌ Treo máy phát lặp lại 24/7 mà không có người dẫn. Nội dung không có người tương tác thường bị TikTok hạn chế đề xuất. Nên có người dẫn tụng hoặc trả lời comment.
- ❌ Lấy nguyên ảnh nền của kênh khác (ảnh chụp số 3). Hãy tự tạo ảnh nền để có bản sắc riêng và tránh bị báo cáo bản quyền.

**Cách tăng thu nhập bền vững:** live đều đặn theo lịch cố định, cắt các đoạn hay (rồng bay, lễ Cầu An, giảng pháp) đăng video ngắn để kéo người theo dõi, cảm ơn từng người theo tên, mở gói hội viên (Subscription) của TikTok khi đủ điều kiện — người đăng ký được game hiện thẻ “Hội viên”.

---

## VI. Quy trình triển khai

| Bước | Việc làm | Trong dự án này |
|---|---|---|
| 1 | Thiết kế giao diện | Đã có sẵn (điện thờ vẽ bằng code). Muốn dùng ảnh riêng: đặt `assets/bg.jpg`, sửa `background` trong `config.js` |
| 2 | Kết nối TikFinity | Bảng điều khiển → ② → Kết nối LIVE (`ws://localhost:21213/`) |
| 3 | Thử hiệu ứng quà | Bảng điều khiển → ⑤ (6 bậc quà, comment, tim, cột mốc) hoặc phím 1–6 trên màn hình phát |
| 4 | Phát chính thức | Window Capture cửa sổ màn hình phát vào TikTok LIVE Studio / OBS. **Tắt bot.** |
| 5 | Nhận quà | Theo dõi mục ⑦; cuối buổi xuất CSV để đọc tên hồi hướng / cảm ơn |

Chi tiết cài đặt xem `README.md`.
