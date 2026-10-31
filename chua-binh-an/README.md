# Chùa Bình An Online — Game tương tác TikTok LIVE

Game chạy trên trình duyệt (HTML/CSS/JS thuần, không cần cài thư viện). Có điện thờ Tam Thế Phật, Phật tử mang tên người xem vào quỳ lễ, tràng hạt 108 hạt, Bảng Công Đức, nhạc kinh, giảng pháp, và kết nối TikTok LIVE qua **TikFinity**.

Kịch bản đầy đủ: [`KICH_BAN.md`](KICH_BAN.md)

## Cấu trúc

```
chua-binh-an/
├── index.html      Bảng điều khiển (kết nối, nhạc, chương trình, thử hiệu ứng, thống kê)
├── live.html       Màn hình phát 9:16 — đưa vào TikTok LIVE Studio / OBS
├── start.bat       Chạy máy chủ nội bộ trên Windows (bấm đúp)
├── lien-ket-thu-muc-nhac.bat  Liên kết thư mục nhạc có sẵn (F:\I.Kinh,DanThien) vào audio/
├── js/stories.js   📖 40 truyện Phật + câu đố
├── js/config.js    ⚙️ Tên chùa, bậc quà, từ khóa, cách tính điểm, chương trình
├── js/content.js   📜 Kinh, bài giảng, lời chúc, danh sách phát
├── js/game.js      Lõi game
├── js/fx.js        Hiệu ứng (khói hương, hoa đăng, sen vàng, rồng…)
├── js/audio.js     Mõ, chuông, nhạc thiền tổng hợp, trình phát, giọng đọc
├── js/tiktok.js    Kết nối WebSocket TikFinity
├── audio/          Chép file mp3 kinh / nhạc của bạn vào đây
└── assets/         Ảnh nền riêng (tùy chọn)
```

## Chạy thử (5 phút)

1. Cài **Python** (python.org) hoặc **Node.js**.
2. Bấm đúp `start.bat` → trình duyệt mở `http://127.0.0.1:4173/`.
   (Hoặc tự chạy: `python -m http.server 4173` trong thư mục `chua-binh-an`.)
3. Trên bảng điều khiển bấm **Mở màn hình phát dọc 9:16**, rồi bấm vào cửa sổ mới một lần để bật âm thanh.
4. Mục ⑤ **Thử hiệu ứng**: bấm từng bậc quà, comment, thả tim, cột mốc. Hoặc bật ⑥ **Bot mô phỏng** để xem sân chùa đông người.

> Nên chạy qua `start.bat` / máy chủ nội bộ thay vì mở file trực tiếp: bảng điều khiển và màn hình phát nói chuyện với nhau qua BroadcastChannel, cần cùng địa chỉ `http://127.0.0.1:4173`.

## Kết nối TikTok LIVE bằng TikFinity

1. Cài **TikFinity Desktop App**, đăng nhập bằng tài khoản TikTok.
2. Bật WebSocket API trong TikFinity (mặc định `ws://localhost:21213/`; tùy phiên bản, xem trong phần cài đặt/Integrations của TikFinity).
3. Bắt đầu LIVE trên TikTok (LIVE Studio hoặc điện thoại).
4. Bảng điều khiển → ② → **Kết nối LIVE**. Ô trạng thái chuyển sang “đã kết nối”, chữ LIVE trên màn hình phát nhấp nháy đỏ.
5. Nhờ một người bạn comment “Bình An” và tặng một bông hồng để kiểm tra.

Tự kết nối khi mở màn hình phát: `live.html?autoconnect=1` (đổi địa chỉ bằng `&ws=ws://...`).

## Thêm nhạc, kinh của bạn (ví dụ thư mục `F:\I.Kinh,DanThien`)

Game **tự nhận mọi file âm thanh** (mp3, m4a, wav, ogg, flac…) trong thư mục `audio/`, kể cả thư mục con. Tên file dùng làm tên bài. Loại bài (Kinh, Niệm Phật, Giảng pháp, Vu Lan, Thiền) được đoán theo tên file hoặc tên thư mục: có chữ “kinh”, “chú”, “đại bi” → Kinh; “đàn”, “thiền”, “không lời” → Thiền… Có 3 cách:

1. **Liên kết, không cần chép (khuyên dùng):** chuột phải `lien-ket-thu-muc-nhac.bat` → *Run as administrator*. File đã ghi sẵn đường dẫn `F:\I.Kinh,DanThien` (sửa bằng Notepad nếu khác). Game sẽ thấy thư mục đó ở `audio\ThuVienNhac`.
2. **Chép file:** chép toàn bộ nội dung `F:\I.Kinh,DanThien` vào `chua-binh-an\audio\`.
3. **Dùng tạm:** trên bảng điều khiển bấm *📁 Chọn thư mục nhạc trên máy…* rồi chọn thư mục đó. Chỉ dùng được đến khi đóng bảng điều khiển.

Sau cách 1 hoặc 2, mở lại màn hình phát (hoặc bấm *🔄 Quét lại thư mục audio/*). Cần chạy game qua `start.bat` thì mới quét được thư mục.

## Kể chuyện Phật

40 truyện trong `js/stories.js`. Bảng điều khiển có mục **📖 Kể chuyện Phật**: kể truyện hôm nay, chọn truyện, lật trang hoặc hiện đáp án, tự kể mỗi N phút, xem nhiệm vụ hôm nay. Phím **T** trên màn hình phát để bắt đầu hoặc dừng. Muốn thêm truyện thì chép một khối `{ id, series, title, scenes, moral, quiz }` theo mẫu.

## Đưa lên TikTok LIVE Studio / OBS

- **Cách khuyên dùng:** thêm nguồn **Window Capture** (Chụp cửa sổ) → chọn cửa sổ “Chùa Bình An · Màn hình phát”. Kéo cửa sổ cao lên (tỉ lệ 9:16) để hình nét. Âm thanh: thu âm thanh của Chrome (Application Audio Capture) hoặc âm thanh máy tính.
- **Browser Source của OBS** (`http://127.0.0.1:4173/live.html?obs=1&autoconnect=1`, 1080×1920): âm thanh tự phát, nhưng bảng điều khiển trên Chrome **không điều khiển được** nguồn này. Hãy dùng phím tắt (chuột phải nguồn → Interact).

Phím tắt trên màn hình phát: `H` trợ giúp · `M` tắt/bật nhạc · `N` bài kế · `P` phát/dừng · `K` kết nối · `1–6` thử quà · `C` comment · `L` tim · `B` bot · `S` vùng an toàn TikTok · `F` toàn màn hình.

## Tùy biến

- **Ảnh nền riêng:** chép ảnh 1080×1920 vào `assets/bg.jpg`, sửa `background: 'assets/bg.jpg'` trong `js/config.js`. Nếu ảnh đã có tượng Phật, đặt `showDrawnBuddhas: false`.
- **Bậc quà / giá:** `giftTiers` và `giftNameToTier` trong `config.js`.
- **Cách tính hạt, công đức:** `scoring`.
- **Nhạc:** chép mp3 vào `audio/` đúng tên trong `CBA.playlist` (`content.js`), hoặc thêm dòng mới.
- **Giọng đọc tiếng Việt:** Windows → Cài đặt → Thời gian & Ngôn ngữ → thêm Tiếng Việt (gồm giọng nói). Bật “Đọc lời cảm ơn” trên bảng điều khiển.

## Gọi hàm từ console (trên màn hình phát)

```js
CBA.game.spawnPlayer('Ngọc Hà')                  // thêm Phật tử
CBA.game.triggerGiftEffect('hoadang', 'Minh An') // huong | chuong | nguqua | hoasen | hoadang | rong
CBA.game.triggerGiftEffect('Rose', 'An', 1)      // theo tên quà + số xu
CBA.game.addGongSound()                          // đại hồng chung
CBA.game.CongDucCounter(); CBA.game.MantraCounter()
```

## Cơ chế giữ chân người xem (bản 3)

Cấp độ 10 bậc, chuỗi ngày lên chùa, Đồng tâm, hương trầm, hệ số ngày rằm/lễ theo lịch âm, đèn nguyện + tùy hỷ, thưởng tụng trọn bài kinh, Bảng Vàng tuần. Chỉnh trong `config.js` (`levels`, `streak`, `dongTam`, `incenseBuff`, `lunarBonus`, `chantCompleteBonus`). Hồ sơ lâu dài (cấp, chuỗi ngày) lưu riêng, không bị xóa khi bấm “Bắt đầu phiên mới”. Hãy dùng **cùng một trình duyệt, cùng địa chỉ** `http://127.0.0.1:4173` mỗi lần live để giữ dữ liệu.

Điểm của phiên được lưu trong trình duyệt (tải lại trang không mất). Bấm “Bắt đầu phiên mới” để xóa.
