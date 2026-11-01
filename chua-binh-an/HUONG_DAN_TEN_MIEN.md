# Nối tên miền dichua.id.vn (Mắt Bão) vào máy chủ tại nhà

Sau khi làm xong, mọi người chỉ cần mở **https://dichua.id.vn** là vào chơi được. Có HTTPS nên cài được game về điện thoại.

**Cách làm: Cloudflare Tunnel (miễn phí).** Máy nhà bạn tự mở một "đường hầm" ra Cloudflare, nên:
- **không phải** mở cổng modem, **không cần** IP tĩnh, và vẫn chạy được khi nhà mạng dùng IP chung (CGNAT);
- **có sẵn HTTPS**, và **không lộ IP nhà bạn**;
- Cloudflare **lưu sẵn file game (hình, âm thanh)** ở máy chủ của họ, nên mạng nhà bạn đỡ tải rất nhiều khi đông người.

Tổng thời gian khoảng 20–30 phút, cộng thời gian chờ tên miền chuyển (thường 15 phút đến vài giờ).

---

## Bước 0: Cài máy chủ trên PC (nếu chưa làm)
1. Giải nén `ChuaBinhAn.zip` vào một thư mục cố định, ví dụ `C:\ChuaBinhAn`. Đừng để ở Desktop hay Downloads, vì dễ bị xóa nhầm.
2. Mở `cau-hinh-may-chu.bat` bằng Notepad, sửa `UPLOAD_MBPS` theo tốc độ **Upload** đo ở https://www.speedtest.net, rồi lưu lại.
3. **Nhấp chuột phải** vào `CAI_DAT_MAY_CHU.bat` và chọn **Run as administrator**. Script sẽ:
   - cài Node.js nếu thiếu (lần đầu cài xong thì chạy lại file này một lần nữa);
   - mở tường lửa và tắt chế độ ngủ khi cắm điện;
   - cho **máy chủ tự chạy ngầm mỗi khi bật máy**.
4. Trình duyệt sẽ mở `http://localhost:8080/game.html` (game) và `http://localhost:8080/server` (tình trạng máy chủ). Thấy game chạy là xong bước này.

## Bước 1: Tạo tài khoản Cloudflare và thêm tên miền
1. Vào https://dash.cloudflare.com/sign-up và tạo tài khoản (miễn phí).
2. Bấm **Add a domain** (hoặc **Add site**), nhập `dichua.id.vn`, chọn gói **Free**.
3. Cloudflare quét các bản ghi DNS cũ. Bấm **Continue**.
4. Cloudflare đưa ra **2 nameserver**, dạng `xxxx.ns.cloudflare.com` và `yyyy.ns.cloudflare.com`. **Chép lại cả hai.** Mỗi tài khoản sẽ có tên khác nhau.

## Bước 2: Đổi nameserver ở Mắt Bão
1. Đăng nhập trang quản lý dịch vụ của Mắt Bão (https://id.matbao.net) bằng tài khoản đã mua tên miền.
2. Vào **Tên miền**, chọn **dichua.id.vn**, rồi tìm mục **Name Server** / **Đổi Nameserver** / **Cập nhật DNS**. Tên gọi có thể hơi khác tùy giao diện.
3. Chọn **dùng nameserver riêng (tùy chỉnh)**, xóa các nameserver cũ của Mắt Bão (`ns1.matbao.com`…), rồi điền **2 nameserver của Cloudflare** ở bước 1.4. Lưu lại.
4. Quay lại Cloudflare và bấm **Check nameservers**. Khi tên miền chuyển xong, Cloudflare gửi email báo tên miền **Active** (thường 15 phút đến vài giờ, tối đa 24–48 giờ).

> ⚠️ **Tên miền .id.vn** là tên miền cá nhân, VNNIC yêu cầu **xác thực thông tin chủ thể** (CCCD). Nếu Mắt Bão báo chưa đổi được nameserver hoặc tên miền đang bị tạm ngưng, hãy hoàn tất xác thực hoặc gọi tổng đài hỗ trợ của Mắt Bão nhờ đổi nameserver giúp.

## Bước 3: Tạo Tunnel và lấy TOKEN
1. Trong Cloudflare, vào **Zero Trust**. Lần đầu sẽ phải đặt tên nhóm và chọn gói **Free**; nếu được hỏi thẻ thanh toán thì gói Free vẫn không bị trừ tiền.
2. Vào **Networks → Tunnels → Create a tunnel**, chọn **Cloudflared**, đặt tên `dichua`, bấm **Save tunnel**.
3. Ở màn hình "Install and run a connector", chọn **Windows**. Cloudflare hiện một lệnh dạng:
   `cloudflared.exe service install eyJhIjoi...rất dài...`
   **Chép phần chuỗi dài bắt đầu bằng `eyJ`.** Đó là **TOKEN**.
4. Bấm **Next** để sang **Public Hostnames** (hoặc **Routes**) và thêm 2 dòng:

   | Subdomain | Domain | Type | URL |
   |---|---|---|---|
   | *(để trống)* | dichua.id.vn | HTTP | `localhost:8080` |
   | www | dichua.id.vn | HTTP | `localhost:8080` |

   Bấm **Save**.

## Bước 4: Chạy KET_NOI_TEN_MIEN.bat trên PC
1. **Nhấp chuột phải** vào `KET_NOI_TEN_MIEN.bat` và chọn **Run as administrator**.
2. Script tự cài `cloudflared`. Khi được hỏi, **dán TOKEN** (nhấp chuột phải vào cửa sổ để dán) rồi bấm Enter.
3. Đợi 1–2 phút rồi mở **https://dichua.id.vn**. Trên Cloudflare, tunnel `dichua` sẽ hiện trạng thái **HEALTHY**.

Tunnel chạy như một dịch vụ Windows và tự bật lại khi khởi động máy, giống máy chủ game.

## Bước 5: Việc nên làm sau khi có tên miền
- **Firebase** (tài khoản người chơi, nạp hoa sen): Firebase console → Authentication → Settings → **Authorized domains** → thêm `dichua.id.vn` và `www.dichua.id.vn`.
- **Cloudflare → Network → WebSockets**: đảm bảo đang **bật** (mặc định là bật).
- **Cloudflare → SSL/TLS**: để **Full**. Tunnel đã mã hóa sẵn, không cần chỉnh gì thêm.
- **Cloudflare → Rules → Redirect Rules** (không bắt buộc): chuyển `www.dichua.id.vn` về `dichua.id.vn`.
- Gửi cho mọi người link **https://dichua.id.vn**. Trên điện thoại, bấm **📲 Cài game** để đưa game ra màn hình chính.

## Kiểm tra nhanh khi có trục trặc
| Hiện tượng | Cách xử lý |
|---|---|
| `dichua.id.vn` báo lỗi 1033 / 502 | Tunnel chạy nhưng máy chủ game tắt: mở `http://localhost:8080/game.html` trên PC xem có vào được không. Không được thì chạy `chay-may-chu.bat` để xem lỗi. |
| Cloudflare báo tên miền "Pending" mãi | Nameserver ở Mắt Bão chưa đổi đúng hoặc tên miền chưa xác thực: xem lại bước 2. |
| Vào được game nhưng không thấy người khác | Trên PC mở `http://localhost:8080/server` (hoặc từ xa `https://dichua.id.vn/server?key=...` nếu đã đặt `ADMIN_KEY`) xem số người; kiểm tra Cloudflare → Network → WebSockets đang bật. |
| Muốn tắt máy chủ | Chạy `dung-may-chu.bat`. Muốn bật lại: `chay-may-chu.bat`, hoặc khởi động lại máy. |
| Muốn gỡ tự chạy | Mở Task Scheduler, xóa tác vụ **ChuaBinhAn**. Gỡ tunnel: `cloudflared service uninstall`. |

## Cách dự phòng (không dùng Cloudflare)
Chỉ dùng khi nhà mạng cấp **IP công khai** và bạn tự mở được cổng modem:
1. Trên modem, chuyển cổng **80** và **443** về IP của PC.
2. Ở Mắt Bão → Quản lý DNS, tạo bản ghi **A** `@` và `www` trỏ về IP công khai của nhà bạn (xem ở https://whatismyipaddress.com). Nếu IP thay đổi theo ngày, phải dùng thêm dịch vụ DDNS.
3. Tải **Caddy** (https://caddyserver.com/download), đặt `caddy.exe` cạnh file `Caddyfile` trong thư mục game, rồi chạy `caddy run`. Caddy tự xin chứng chỉ HTTPS.

Cách này lộ IP nhà bạn, không có bộ nhớ đệm của Cloudflare, và nhiều nhà mạng ở Việt Nam chặn cổng 80. Vì vậy **nên dùng Cloudflare Tunnel**.
