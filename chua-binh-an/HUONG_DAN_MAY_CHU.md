# Máy chủ nhiều người chơi: chạy trên máy tính của bạn

Máy chủ (`server/server.js`) làm 2 việc:
1. **Phục vụ game** tại `http://<máy>:8080/game.html` (nén gzip, trình duyệt lưu lại cho lần sau).
2. **Cho mọi người gặp nhau thật trong chùa**: thấy nhau đi lại, lạy Phật, thắp hương, thỉnh chuông, thả đèn; tên người thật có nhãn xanh và lên Bảng Công Đức.

## Tự chia kênh khi đông (chống quá tải)
- Mỗi chùa chia thành nhiều **kênh** (server con). Mỗi kênh tối đa `ROOM_CAP` người (mặc định **30**).
- Người mới vào được xếp vào **kênh thấp nhất còn chỗ**, để mọi người dễ gặp nhau. Kênh nào cũng đầy thì máy chủ **tự mở kênh mới**. Kênh trống tự đóng.
- Người chơi bấm vào dòng "🟢 … đang tu tập · Kênh N" (góc trái) để xem các kênh, chuyển kênh hoặc mở kênh mới.
- Có giới hạn tổng `MAX_PLAYERS` để bảo vệ máy và đường mạng. Khi đầy, người mới vào chơi chế độ một mình (vẫn có Phật tử mô phỏng), không bị lỗi.
- Nếu máy chủ tắt hoặc mất mạng, game tự chuyển sang chơi một mình và tự kết nối lại.

## Chạy máy chủ (Windows)
1. Cài **Node.js bản LTS**: https://nodejs.org/
2. Đo tốc độ **tải lên (Upload)** của mạng nhà bạn ở https://www.speedtest.net
3. Mở `cau-hinh-may-chu.bat` bằng Notepad, sửa dòng `set UPLOAD_MBPS=20` theo số vừa đo, lưu lại.
4. **Nhấp chuột phải** vào `CAI_DAT_MAY_CHU.bat` và chọn **Run as administrator**. Máy chủ được cài để **tự chạy ngầm mỗi khi bật máy**, nhật ký ghi ở `server\nhat-ky.txt`. Trang **tình trạng máy chủ** (`http://localhost:8080/server`) cho xem số người, các kênh, CPU và mạng.
   Muốn chạy tay có cửa sổ thì dùng `chay-may-chu.bat`; muốn tắt thì dùng `dung-may-chu.bat`.
5. Chơi trên máy đó: `http://localhost:8080/game.html`. Máy khác cùng wifi: dùng địa chỉ hiện trong cửa sổ máy chủ, ví dụ `http://192.168.1.5:8080/game.html`.

> Máy Mac/Linux: `cd server && npm install && UPLOAD_MBPS=20 node server.js`

## Mở cho người ở xa vào chơi
➡️ Với tên miền **dichua.id.vn**, xem hướng dẫn từng bước trong **HUONG_DAN_TEN_MIEN.md**.

Cách dễ và an toàn nhất là **Cloudflare Tunnel** (miễn phí). Cách này không phải mở cổng modem, có sẵn HTTPS/WSS, và **cài được game về điện thoại**.
- **Thử nhanh:** cài `cloudflared` (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/), rồi chạy:
  `cloudflared tunnel --url http://localhost:8080`
  Lệnh sẽ in ra địa chỉ dạng `https://xxxx.trycloudflare.com`. Gửi địa chỉ đó (thêm `/game.html`) cho mọi người. Mỗi lần chạy lại, địa chỉ sẽ đổi.
- **Dùng lâu dài:** dùng tên miền riêng với "named tunnel" của Cloudflare (ví dụ `https://chua.ten-mien.vn`).
- Game tự nối về máy chủ khi được mở từ chính địa chỉ đó (`CBA.server.url = 'auto'` trong `js/shop-config.js`).

**Khuyên dùng khi đông người:** để **file game** ở GitHub Pages hoặc Firebase Hosting (miễn phí, nhanh), còn máy nhà bạn **chỉ lo phần gặp nhau**. Khi đó, trong `js/shop-config.js` điền:
`CBA.server = { url: 'wss://chua.ten-mien.vn' };`

## Mỗi chùa bao nhiêu người thì ổn định?
Số liệu dưới đây **đo thật** bằng công cụ thử tải `server/thu-tai.js`, giả lập người chơi **đi lại liên tục 5 lần/giây** (trường hợp nặng nhất):

| Số người cùng lúc | Cách chia | CPU máy chủ | RAM | Mạng tải lên cần |
|---|---|---|---|---|
| 300 | 11 chùa, mỗi chùa ~27 người (1 kênh) | ~6% một nhân | ~70 MB | ~11 Mbps |
| 300 | dồn hết vào 1 chùa → tự chia 10 kênh × 30 | ~7% một nhân | ~80 MB | ~12 Mbps |
| 900 | 11 chùa × 3 kênh | ~15% một nhân | ~100 MB | ~33 Mbps |

- **Mỗi người** cần khoảng **0,04 Mbps** mạng tải lên của máy chủ (kênh 30 người cùng đi lại; đứng yên hay ngồi lạy thì gần như không tốn).
- **CPU và RAM không phải vấn đề.** Giới hạn thật là **tốc độ tải lên** của mạng nhà bạn.
- **Mỗi kênh 30 người** là mức đẹp: điện thoại tầm trung vẫn vẽ mượt 30 nhân vật. Điện thoại yếu thì đặt `ROOM_CAP=20`.
- **Mỗi chùa không giới hạn số kênh**, nên một chùa đông vẫn ổn, chỉ là mọi người chia ra nhiều kênh.

**Tổng số người nên đặt theo mạng nhà bạn** (khi máy chủ chỉ lo phần gặp nhau, file game để ở GitHub Pages hoặc Firebase Hosting):

| Upload nhà bạn | Tổng người ổn định (`MAX_PLAYERS` tự tính) | Ví dụ chia |
|---|---|---|
| 10 Mbps | ~175 | 11 chùa × ~15 người |
| 20 Mbps | ~350 | 11 chùa × ~30 người (1 kênh/chùa) |
| 50 Mbps | ~875 | chùa đông 3–5 kênh |
| 100 Mbps | ~1.750 | nên tách sang máy chủ thuê |

⚠️ **Nếu máy nhà bạn phục vụ cả file game:** mỗi người **mới vào** tải khoảng **1,7 MB** (lần sau trình duyệt dùng lại). Ví dụ 100 người vào trong 1 phút sẽ tốn khoảng 23 Mbps trong phút đó, nên khi mở cho đông người hãy để file game ở GitHub Pages hoặc Firebase Hosting.

## Cấu hình (sửa trong `cau-hinh-may-chu.bat`)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `UPLOAD_MBPS` | — | Tốc độ tải lên đo được; máy chủ tự tính `MAX_PLAYERS` = upload × 0,7 ÷ 0,04 |
| `MAX_PLAYERS` | 300 | Đặt thẳng tổng người tối đa (ưu tiên hơn `UPLOAD_MBPS`) |
| `ROOM_CAP` | 30 | Số người tối đa mỗi kênh |
| `TICK_HZ` | 5 | Số lần cập nhật vị trí mỗi giây (giảm xuống 3 thì đỡ ~40% mạng, chuyển động kém mượt hơn) |
| `PORT` | 8080 | Cổng |
| `ADMIN_KEY` | (trống) | Mã để xem `/server` từ xa: `https://dichua.id.vn/server?key=MÃ`. Để trống thì chỉ xem được trên chính PC |

## Tự thử tải trên máy bạn
Khi máy chủ đang chạy, mở cửa sổ lệnh khác:
```
cd server
node thu-tai.js 300            (300 người chia đều 11 chùa)
node thu-tai.js 120 binh-an    (120 người dồn vào Chùa Bình An → tự chia 4 kênh)
```
Xem số liệu ở `http://localhost:8080/server`.

## Lưu ý
- Giữ máy **không ngủ** khi chạy máy chủ: Windows → Settings → Power → Sleep: Never.
- Lần đầu chạy, Windows Firewall hỏi quyền cho Node.js: chọn **Allow** cho mạng Private.
- Máy chủ **không chuyển tiếp nội dung chữ** người chơi gõ (điều ước của đèn nguyện chỉ hiện trên máy người viết), để tránh nội dung xấu. Chỉ tên nhân vật (tối đa 24 ký tự) được gửi đi.
- Có chống spam: mỗi người tối đa 40 tin/giây, vượt quá sẽ bị ngắt.
- Hạt, công đức, hoa sen vẫn lưu ở máy người chơi hoặc tài khoản Firebase. Máy chủ chỉ chuyển vị trí và hành động, **không lưu gì**, nên tắt hay bật máy chủ lại không mất dữ liệu.
