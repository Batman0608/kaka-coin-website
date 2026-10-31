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

## 0b. So sánh với niemphat.online và những gì đã học theo (bản 3)

**Hai sản phẩm khác loại.** niemphat.online là **game chùa 3D trên web cho từng người**: có tài khoản, tự đi lại, ngồi bồ đoàn, nhiệm vụ, túi đồ, cửa hàng, tiền ảo Sen/Ngọc, nạp qua VietQR. **Chùa Bình An** là **màn hình tương tác cho TikTok LIVE**: người xem không cài gì, chỉ comment, thả tim, tặng quà. Vì vậy chỉ lấy những cơ chế giữ chân người xem phù hợp với livestream, và tự làm lại theo cách riêng (không sao chép hình ảnh hay chữ của họ).

| Hạng mục | niemphat.online | Chùa Bình An (bản 3) |
|---|---|---|
| Nền tảng | Web 3D (Three.js), mỗi người tự chơi | Lớp phủ 9:16 cho TikTok LIVE |
| Tham gia | Tạo nhân vật, chọn thiền phái | Comment / tim / quà → tự có nhân vật mang tên TikTok |
| Tràng hạt 108 | Mỗi người tự lần | Cả phòng cùng lần chung + bảng Tinh Tấn từng người |
| Cấp độ & danh xưng | 25 cấp theo thiền phái | **Mới:** 10 cấp theo tổng hạt tích lũy qua mọi buổi live (Sơ Phát Tâm → Viên Mãn Tâm), số cấp hiện trên bảng tên |
| Điểm danh / chuỗi ngày | Có, quà tăng dần tới ngày 7 | **Mới:** chuỗi ngày lên chùa, thưởng +3 hạt/ngày (tối đa +21), chúc mừng đặc biệt ngày 7, 21, 49, 100 |
| Cùng lạy được thưởng | “Đồng tâm” +5%/người | **Mới:** Đồng tâm — trong 60 giây có ≥3 người niệm Phật thì cả phòng ×(1 + 5%/người), tối đa ×1,5 |
| Thắp hương tăng điểm | +20% trong 10 phút | **Mới:** người thắp hương ×1,2 hạt trong 10 phút; quà Hoa đăng/Rồng làm *hương trầm tỏa khắp chùa* ×1,2 cho **cả phòng** 5 phút → người tặng quà giúp cả cộng đồng |
| Ngày rằm, lễ lớn | Mùng 1, rằm ×1,5; đại lễ ×2 | **Mới:** tự tính lịch âm; mùng 1/rằm ×1,5; Tết, Phật Đản, Vu Lan, vía A Di Đà, Thành Đạo ×2; vía Quán Âm, Dược Sư ×1,5. Tháng 7 âm nhắc bật chương trình Vu Lan |
| Đèn hoa đăng / lời nguyện | Thả đèn kèm lời nguyện, người khác tùy hỷ | **Mới:** comment “Cầu an…/Nguyện…” → đèn nguyện bay lên + hiện ở khung Đèn nguyện; người khác comment “Tùy hỷ” → chủ đèn +2 hạt, nhân vật cùng lạy |
| Tụng kinh | Tụng trọn bài +5 | **Mới:** tụng trọn một bài kinh có chữ → mọi người trong chùa +9 hạt |
| Bảng xếp hạng | Tuần / tháng / tất cả; Bảng vàng trong chánh điện | **Mới:** khung bên phải luân phiên **Bảng Công Đức (buổi này)** ↔ **Bảng Vàng Tuần** (cộng dồn mọi buổi live) |
| Lời nhắc | “Công đức trong game không phải công đức thật” | **Mới:** dòng nhắc nhỏ ở cuối khung Cách tham gia |
| Linh thú, cửa hàng, túi đồ, thiền phái | Có (linh thú có tỉ lệ ngẫu nhiên, mua bằng Ngọc) | **Không làm.** Cơ chế quay may rủi gắn với tiền dễ vi phạm quy định TikTok, và người xem live không có tài khoản trong game |
| Hình phạt “ngạ quỷ” | Bị phạt phải nghe kinh 30 phút | **Không làm.** Phạt người xem live chỉ làm họ rời phòng |
| Kiếm tiền | Nạp Ngọc + ủng hộ qua VietQR (website riêng) | Chỉ quà TikTok. **Không** hiện QR/số tài khoản trên live |

> Hướng phát triển sau: nếu muốn có web riêng như niemphat.online (tài khoản, nạp tiền), nên làm thành một dự án riêng có điều khoản thanh toán đầy đủ, rồi chỉ giới thiệu trên kênh TikTok, không xin chuyển khoản ngay trên live.

---

## 0c. Cốt truyện & vòng lặp mỗi ngày (bản 4)

**Ý tưởng chung:** người xem là Phật tử về một ngôi chùa nhỏ trên mạng. Sư trụ trì là **Sư Ông Tâm An** (nhân vật tự tạo). Mỗi ngày Sư Ông kể một chương **“Hành Trình Theo Dấu Chân Phật”**. Cả phòng cùng thả tim, niệm Phật để lật trang, cuối truyện có câu đố, người nghe được ghi vào **Sổ Truyện**. Học theo niemphat.online: người kể chuyện, nghe chuyện được thưởng, sổ đóng ấn, nhiệm vụ ngày, “duyên” ngẫu nhiên. Tất cả làm lại cho livestream, và lời truyện do mình tự viết.

### Kho truyện: 40 truyện, 6 bộ (`js/stories.js`)

| Bộ | Số truyện | Danh hiệu khi nghe đủ cả bộ |
|---|---|---|
| ☸ Cuộc Đời Đức Phật: giấc mộng voi trắng → đản sanh → thiên nga → bốn cửa thành → xuất gia → khổ hạnh → thành đạo → chuyển pháp luân → La Hầu La → voi say → Ni đoàn → nhập Niết Bàn | 12 chương | Người Theo Dấu Chân Phật |
| 🪷 Tam Thế Phật & Bồ Tát: Phật Nhiên Đăng thọ ký, 48 nguyện A Di Đà, Phật Dược Sư, Di Lặc, Diệu Thiện (chùa Hương), Địa Tạng | 6 | Đệ Tử Tam Thế Phật |
| 📿 Các vị đệ tử: Xá Lợi Phất, Ca Diếp cầm hoa mỉm cười, A Nan xin nước, Châu Lợi Bàn Đặc, Ương Quật Ma La, Kisa Gotami, ngọn đèn bà lão nghèo, vườn trải vàng Kỳ Viên | 8 | Bạn Lành Của Tăng Đoàn |
| 🦌 Tiền thân (Bổn sanh): thỏ trên mặt trăng, vua khỉ làm cầu, hươu chúa, vua Thi Tỳ, chú vẹt dập lửa, cọp mẹ đói | 6 | Hạnh Nguyện Bồ Tát |
| 🏯 Phật giáo Việt Nam: Quan Âm Thị Kính, Phật hoàng Trần Nhân Tông, chùa Một Cột, Man Nương & Tứ Pháp, Vạn Hạnh & Lý Công Uẩn | 5 | Người Giữ Hồn Thiền Việt |
| 🌹 Hiếu hạnh Vu Lan: Mục Kiền Liên cứu mẹ, Bông hồng cài áo, công ơn cha mẹ | 3 | Hiếu Tử Vu Lan |

### Một buổi kể chuyện diễn ra thế nào (khoảng 3–5 phút)
1. Sư Ông giới thiệu tên truyện. Giọng máy đọc nếu bật “Đọc truyện”.
2. Mỗi **trang** hiện một đoạn. Thanh tiến độ: *“Thả tim / niệm Phật để lật trang: 30/54 hạt”*. Cả phòng góp đủ hạt thì trang lật sớm; không đủ thì tối đa 40 giây trang cũng tự lật.
3. Trang cuối là **Lời dạy** của truyện: cánh hoa rơi, cả chùa lạy.
4. **Câu đố** 35 giây: comment A, B, C (hoặc 1, 2, 3, hoặc gõ nguyên đáp án). Số người chọn từng đáp án hiện trực tiếp. Người trả lời đúng +27 hạt, tên được xướng lên.
5. Kết thúc: ai đã tương tác trong lúc kể được **+9 hạt** và thêm 1 trang vào **Sổ Truyện**. Nghe đủ một bộ thì nhận **danh hiệu**. Trả lời đúng 10 và 50 câu cũng có danh hiệu.
6. **Câu móc nối:** *“Hẹn ngày mai: Chương 5 — Đêm vượt thành xuất gia”*. Đây là lý do để người xem quay lại hôm sau.

### Lịch kể
- **Mỗi ngày 1 chương chính** của Cuộc Đời Đức Phật, kể xong mới chuyển sang chương kế vào ngày hôm sau. 12 ngày trọn bộ rồi bắt đầu lại.
- Các lần kể khác trong ngày là **truyện phụ**, ưu tiên truyện lâu chưa kể. Tháng 7 âm lịch ưu tiên bộ Vu Lan, ngày rằm hoặc lễ ưu tiên bộ Tam Thế Phật.
- Tự kể mỗi 20 phút (chỉnh được), hoặc người dẫn bấm “Kể truyện hôm nay”, phím **T**, hay chọn chương trình “Kể Chuyện Phật”.

### Vòng lặp giữ chân người xem mỗi ngày

| Mỗi ngày | Mục đích |
|---|---|
| **Chương mới** của Cuộc Đời Đức Phật + câu móc nối | Tò mò muốn nghe tiếp |
| **Hạnh tu hôm nay** (Lục độ: Bố thí, Trì giới, Nhẫn nhục, Tinh tấn, Thiền định, Trí tuệ) kèm một việc nhỏ để làm | Mang lời dạy ra đời sống |
| **3 nhiệm vụ chung của cả chùa** (vd: niệm đủ 1.080 hạt, thả 5 đèn nguyện, 10 câu đố đúng, nghe trọn 2 truyện). Tất cả đều miễn phí | Cả phòng cùng hướng tới một mục tiêu. Hoàn thành cả 3 thì ai đang có mặt cũng +54 hạt, và **chuỗi ngày viên mãn của chùa** tăng thêm 1 |
| **Chuỗi ngày lên chùa** của từng người (bản 3) | Ngại bỏ lỡ một ngày |
| **Duyên lành** mỗi 15 phút: chọn ngẫu nhiên 1 người đang tương tác, ai cũng có cơ hội như nhau, không liên quan quà. Người được chọn nhận lời chúc riêng của Sư Ông + 108 hạt | Ở lại và tương tác để có cơ hội |
| **Sổ Truyện & danh hiệu** (comment `!so`) | Muốn sưu tầm đủ bộ |

> Nguyên tắc giữ nguyên: danh hiệu, Duyên lành và nhiệm vụ **không mua được bằng quà**. Quà tặng chỉ tạo hiệu ứng, chỗ ngồi và Bảng Công Đức. Như vậy người không tặng quà vẫn có lý do để ở lại, và không vi phạm quy định cấm hứa lợi ích để đổi lấy quà.

---

## 0d. Tượng Phật thật, hào quang, nhân vật chuyển động & Phật Quang (bản 5)

**Tượng Tam Thế Phật bằng ảnh tượng thật** (Wikimedia Commons, giấy phép mở, đã tách nền và chỉnh cùng tông vàng; nguồn ghi trong `assets/buddha/CREDITS.md`):
- **Phật Dược Sư** (trái): tượng đồng mạ vàng Tây Tạng thế kỷ 15, tay cầm bát thuốc.
- **Phật Thích Ca** (giữa): tượng đồng mạ vàng ngồi tòa sen, tay phải bắt ấn chạm đất (ấn lúc thành đạo).
- **Phật A Di Đà** (phải): tượng ngồi kiết già, hai tay bắt ấn thiền định.
- Tên các vị được khắc trên ba bảng ở mặt trước bàn thờ, như trong chùa thật.

**Hào quang sống phía sau mỗi vị** (`js/aura.js`), luôn chuyển động nhẹ:
- Vầng sáng thân, vầng sáng đầu và tia sáng xoay chậm.
- Mỗi vị có dấu ấn riêng: Dược Sư có tinh thể lưu ly xanh bay lên; Thích Ca có bánh xe pháp 8 nan xoay sau đầu; A Di Đà có cánh sen hồng rơi.

**Nhân vật mới:** áo tràng dài, 4 kiểu tóc (búi, ngắn, dài, cạo), nhiều màu da. Màu áo theo công đức: lam, nâu, trắng, vàng.

| Tư thế / hành động | Khi nào |
|---|---|
| **Đi bộ** (bước chân, tà áo đung đưa, đi theo lối thảm đỏ rồi rẽ vào chỗ) | Mới vào chùa, đổi chỗ khi xếp hạng thay đổi, ra về |
| **Quỳ** và **lạy sát đất** | Ngồi tại chỗ; người ngẫu nhiên lạy, cả chùa lạy ở các cột mốc |
| **Lên lư hương** (cầm 2 nén hương có đốm lửa, đứng vái 2 lần, cắm hương rồi về chỗ) | Khi tặng quà bậc Thắp hương (hoa hồng…) |
| **Kinh hành** (đi chậm vòng quanh sân rồi về chỗ) | Thỉnh thoảng; nhiều người hơn khi đang ở chương trình Niệm Phật |
| **Vầng sáng trên đầu, thân phát sáng** | Được Phật Quang chiếu (3 phút) |

**☀️ Phật Quang (theo yêu cầu: mỗi 10 phút, tỉ lệ may mắn 50%):**
- Màn hình luôn đếm ngược: *“☀️ Phật Quang sau 7:12”*.
- Đến giờ, lần lượt một vị trong Tam Thế Phật tỏa hào quang rực rỡ.
- **Mỗi người** đang trong chùa và có tương tác trong 10 phút gần nhất được tung một lần, **50% trúng**.
- Người trúng nhận một **tia hào quang** chiếu từ tượng Phật xuống nhân vật của mình, phát sáng 3 phút, được +54 hạt, và có tên trên thẻ *“Phật Quang phổ chiếu · Phật Dược Sư — 8/24 Phật tử được hào quang chiếu đến”*.
- Hoàn toàn ngẫu nhiên, **không phụ thuộc quà**, nên không vi phạm quy định cấm bán cơ hội may rủi của TikTok.
- Chỉnh trong `config.js` → `phatQuang` (`everyMin`, `chance`, `bonus`). Thử ngay bằng phím **Q** hoặc nút “☀️ Phật Quang ngay”.

---

## 0e. Hành hương 10 chùa, bản đồ 3D, đệm ngồi, nhân vật tự chọn (bản 6)

### 10 ngôi chùa nổi tiếng (`js/temples.js`)
| Miền | Chùa | Đặc trưng dựng trong mô hình 3D | Sự tích kể trên live |
|---|---|---|---|
| Bắc | **Bái Đính** (Ninh Bình) | Điện lớn hai tầng mái trên nền cao, gác chuông, bảo tháp 13 tầng, núi đá phía sau | Thiền sư Minh Không chữa bệnh cho vua Lý Thần Tông |
| Bắc | **Một Cột** (Hà Nội) | Đài sen vuông trên một cột đá giữa hồ sen vuông, cầu thang đá | Giấc mộng của vua Lý Thái Tông |
| Bắc | **Chùa Hương** (Hà Nội) | Núi đá vôi, cửa động Hương Tích, bậc đá, cổng tam quan, suối Yến có thuyền | Nam Thiên Đệ Nhất Động |
| Bắc | **Yên Tử – Chùa Đồng** (Quảng Ninh) | Chùa đồng trên đỉnh núi, rừng tùng, mây trôi quanh núi | Suối Giải Oan |
| Trung | **Thiên Mụ** (Huế) | Tháp Phước Duyên bát giác 7 tầng, chánh điện, sông Hương | Bà lão trên đồi Hà Khê |
| Trung | **Linh Ứng Bãi Bụt** (Đà Nẵng) | Tượng Quán Âm trắng cao lớn nhìn ra biển, chánh điện mái xanh | Phật Bà nhìn ra biển |
| Trung | **Long Sơn** (Nha Trang) | Đồi Trại Thủy, bậc đá, tượng Kim Thân Phật Tổ trắng ngồi trên đỉnh | Kim Thân Phật Tổ trên đồi Trại Thủy |
| Nam | **Vĩnh Nghiêm** (TP.HCM) | Chánh điện lớn kiểu Bắc, tháp Quán Âm vuông 7 tầng | Từ tổ đình Bắc Giang vào Sài Gòn |
| Nam | **Giác Lâm** (TP.HCM) | Chánh điện cổ mái thấp, bảo tháp lục giác 7 tầng, cây Bồ Đề lớn | Rừng giác ngộ trên gò Cẩm Sơn |
| Nam | **Chùa Dơi – Mahatup** (Sóc Trăng) | Mái Khmer nhọn nhiều tầng màu cam đỏ, đầu rắn Naga vàng, tháp chuông trắng, cây cổ thụ, **đàn dơi bay** | Đàn dơi giữ chùa |

Mỗi chùa trên live có: tên và địa danh trên bảng hiệu, câu đối chữ Hán trên cột, màu cột và màu nền riêng, bộ tượng, **bài niệm riêng** (vd: Quán Âm ở Một Cột, Chùa Hương, Linh Ứng; *Cư trần lạc đạo* ở Yên Tử; Bát Nhã ở Thiên Mụ), và **âm điệu nhạc nền riêng**. Đặt mp3 vào `audio/<mã-chùa>/` (vd `audio/huong/`) hoặc thư mục có tên chùa thì chùa đó phát bài riêng.

**Chùa duyên mỗi ngày:** chế độ tự động đổi chùa mỗi ngày. Khi đổi chùa, live hiện thẻ *“🏯 Hành hương · Miền Trung — Chùa Thiên Mụ”* kèm **mô hình 3D xoay**, đánh 2 hồi chuông, cả chùa lạy, 14 giây sau Sư Ông kể sự tích chùa đó. **Ấn hành hương:** ai tương tác khi đang ở chùa nào thì nhận ấn chùa đó. Đủ 5 ấn được danh hiệu *Người Hành Hương*, đủ tất cả được *Hành Giả Thập Phương*.

### Bản đồ hành hương (`map.html`)
- Bản đồ Việt Nam (Natural Earth), có **QĐ. Hoàng Sa** và **QĐ. Trường Sa** ghi rõ *(Việt Nam)*, kèm Biển Đông và tuyến hành hương Bắc → Nam.
- Lọc theo **Miền Bắc 4 · Miền Trung 3 · Miền Nam 3**: bản đồ tự phóng to vào miền đã chọn.
- Bấm một chùa → bên phải hiện **mô hình 3D** (kéo để xoay, cuộn để phóng to) hoặc **ảnh thật** (Wikimedia Commons, có ghi nguồn), thông tin, các điểm nổi bật và sự tích đầy đủ.
- Nút **“Hành hương đến chùa này trên live”** và **“Kể sự tích trên live”**. Chùa đang phát trên live có vòng xanh nhấp nháy trên bản đồ.

### Đệm ngồi & nhân vật
- 40 **đệm vuông** xếp thành hàng trên sân. Hai hàng đầu là **đệm vàng** dành cho Top công đức, còn lại là đệm đỏ viền vàng. Người xem quỳ trên đệm nghe giảng.
- Người xem **tự chọn nhân vật bằng comment**:
  - `!nam` / `!nu`: dáng vai khác nhau; nữ có trâm cài tóc khi búi.
  - `!toc bui` · `!toc dai` · `!toc ngan` · `!troc`: kiểu tóc.
  - `!ao lam` · `!ao nau` · `!ao xam` · `!ao trang`: màu áo tràng. Top 3 công đức tự mặc áo vàng.
  - `!di`: đi kinh hành quanh sân. `!lay`: lạy 3 lạy. `!vai`: lên trước điện vái Phật. `!chua`: xem chùa đang ở và số ấn.
- Lựa chọn được lưu, lần sau quay lại vẫn giữ. Khung trái màn hình phát luân phiên 3 trang: Cách tham gia → Nhiệm vụ hôm nay → Nhân vật của bạn.

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
| “Cầu an + điều ước” (vd: *Cầu an cho mẹ con mau khỏe*) | Bong bóng vàng + **đèn nguyện** bay lên, hiện ở khung Đèn nguyện | +1 |
| “Cầu siêu …” | Đèn cầu siêu, tiếng khánh, thẻ lời nguyện (mỗi người 2 phút/lần) | +1 |
| “Còn mẹ” (mùa Vu Lan) | Cài **hoa hồng đỏ** lên nhân vật | +1 |
| “Mất mẹ” | Cài **hoa hồng trắng** | +1 |
| “!hat” / “!cap” | Bong bóng báo cấp, tổng hạt tích lũy, chuỗi ngày | +1 |
| “!so” | Bong bóng báo số truyện đã nghe / 40 và danh hiệu | +1 |
| A / B / C (lúc có câu đố) | Trả lời câu đố, đúng được +27 hạt | +1 |
| “Nguyện …” | Thả đèn nguyện (như “Cầu an”) | +1 |
| “Tùy hỷ” | Chung vui với đèn nguyện gần nhất của người khác; chủ đèn +2 hạt | +1 |

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
