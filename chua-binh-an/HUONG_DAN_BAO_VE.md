# Bảo vệ mã nguồn, tài nguyên và chống gian lận

Dưới đây là những gì **đã làm trong bản phát hành**, và những gì **không nên làm** (tốn công, lợi ích thấp hoặc gây hại cho người chơi). Nguyên tắc: web chạy trên trình duyệt thì **không thể giấu 100%** — mục tiêu là làm khó việc sao chép và **khóa chặt những gì liên quan tới tiền**.

## Đã làm
1. **Khóa phần tiền bằng Firebase (quan trọng nhất).** Cộng hoa sen, duyệt nạp, cấp chứng nhận đều qua `firestore.rules` chạy trên máy chủ Google. Người chơi sửa mã trong trình duyệt **không thể tự cộng tiền thật** cho mình — quy tắc đã chặn (đã kiểm thử: gửi yêu cầu sai tỉ lệ bị từ chối, không đọc được dữ liệu người khác).
2. **Nén & làm rối mã JavaScript** (`tools/nen_ma.mjs`): đổi tên biến, bỏ chú thích, dồn dòng. File mã nhẹ hơn ~30% và rất khó đọc. Bản phát hành gửi cho bạn đã nén sẵn; bản mã gốc (đọc được) chỉ nằm trên máy phát triển.
3. **Chống hotlink** (server): ảnh, âm thanh, mã `.js` chỉ được tải khi truy cập từ đúng tên miền `dichua.id.vn`. Trang khác nhúng link tài nguyên của bạn sẽ bị từ chối (403). Sửa danh sách tên miền bằng biến `ALLOW_HOSTS`.
4. **Chống nhúng iframe**: trang game gắn `X-Frame-Options` và `Content-Security-Policy: frame-ancestors` — web khác không iframe lại game của bạn được.
5. **Trang quản trị `/server` khóa**: chỉ xem được trên chính máy chủ, hoặc qua tên miền khi có `ADMIN_KEY`.
6. **Không lộ file nhạy cảm**: server chặn tải `.bat`, `tunnel-token.txt`, `firestore.rules`, mã máy chủ, thư mục `node_modules`.
7. **Bản quyền**: ghi trong `<meta>` và chú thích HTML của trang, và hiện trong Cài đặt → Thông tin liên hệ.

## Cố ý KHÔNG làm (và vì sao)
- **Anti-debug / treo trình duyệt khi mở F12**: dễ bị qua mặt trong vài giây, nhưng lại **làm hỏng máy người chơi thật** (nhất là máy yếu, điện thoại) và khiến chính bạn khó sửa lỗi. Lợi bất cập hại.
- **Làm rối cực mạnh (control-flow flattening, mã hóa chuỗi)**: làm game **chạy chậm, dễ lỗi**, mỗi lần cập nhật phải dựng lại và rất khó gỡ lỗi. Game 3D cần mượt nên không đáng.
- **Mã hóa tài nguyên (AES) / WebAssembly**: trình duyệt vẫn phải giải mã để vẽ, nên khóa nằm ngay trong mã client — chặn được người thường chứ không chặn được người giỏi, trong khi **mất bộ nhớ đệm của Cloudflare** (đang giúp bạn tiết kiệm băng thông rất nhiều). Không đáng đổi.
- **Pixel Streaming (chạy 3D trên cloud, truyền video)**: cần **máy chủ GPU cho từng người xem cùng lúc**, chi phí rất lớn và **phá bỏ toàn bộ kiến trúc nhẹ** đang cho phép một máy nhà phục vụ hàng trăm người. Không phù hợp.

## Nếu sau này cần chống gian lận điểm (hạt, công đức) triệt để
Hiện hạt/công đức lưu ở máy người chơi (hoặc tài khoản Firebase) nên về lý thuyết người rành kỹ thuật có thể sửa **điểm của chính họ** (không ảnh hưởng người khác, không liên quan tiền). Muốn chặn hẳn thì chuyển việc cộng điểm lên **Cloud Functions** của Firebase (máy chủ tính điểm, client chỉ gửi hành động). Đây là việc lớn, làm sau nếu thật sự cần.

## Dựng bản phát hành đã nén
Trên máy phát triển (có Node.js + terser):
```
npm install -g terser
node tools/nen_ma.mjs ..\ChuaBinhAn-phat-hanh
```
Thư mục `ChuaBinhAn-phat-hanh` là bản đã nén để đưa lên máy chủ. Hai file cấu hình `js/shop-config.js` và `js/cau-hinh-rieng.js` được giữ nguyên cho dễ sửa.
