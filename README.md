# Văn phòng ảo — 10 nhân sự AI

Ứng dụng web dựng theo đặc tả "Code lõi văn phòng ảo". Mở bằng trình duyệt ở bất kỳ máy nào, đăng nhập là vào đúng văn phòng của mình. **Mỗi tài khoản là một văn phòng riêng**: nhân sự, đào tạo, API, việc, phiếu bán và hàng chờ Zalo đều tách biệt.

- **Báo cáo cuối ngày 21:00:** Chi chuẩn bị đề xuất CSKH (chờ bạn duyệt), Phúc tổng hợp toàn văn phòng. Server tự tạo báo cáo cho văn phòng có hoạt động trong ngày; bạn cũng có thể bấm tạo bất cứ lúc nào.
- **Phản biện chéo khi làm việc chung:** mỗi người đề xuất kế hoạch độc lập → phản biện từng đề xuất của người khác (điểm mạnh, lỗi lập luận, chỗ cần kiểm chứng, rủi ro, chấm điểm) → tác giả trả lời từng ý và sửa, hoặc rút để ủng hộ đề xuất tốt hơn → chấm lại → Phúc xét từng đề xuất, chọn hoặc ghép ý tốt nhất bất kể ai đề xuất và giao bước cho người làm tốt nhất, không bắt buộc đúng vai trò → thực hiện → Phúc kiểm tra từng kết quả theo tiêu chí đạt, chưa đạt thì trả làm lại kèm lý do. Quy trình Marketing 5 bước chỉ còn là tham khảo cho Phúc. Minh vẫn chốt rủi ro pháp lý, Hà vẫn chốt số liệu tài chính.
- **Việc riêng có kiểm tra chéo:** bản nháp → một đồng nghiệp phản biện từng điểm → người làm trả lời từng ý và nộp bản cuối.
- **Chat nhóm:** người trả lời sau phải xét từng câu trả lời trước; cuối cùng Phúc kết luận ý của ai tốt nhất.
- **Dữ kiện thật nội bộ:** mỗi lượt trả lời đều nhận số liệu văn phòng đang có (phiếu, việc, hàng chờ, phần mềm đã liên kết). Nguồn chưa kết nối (giá, tồn kho KiotViet, số liệu Fanpage) được ghi rõ là "chưa cập nhật".
- **10 nhân sự cố định:** An, Bình, Tuấn (Marketing); Sơn, Dũng, Hà, Phúc (Vận hành và kiểm soát); Chi, Trang, Minh (Hỗ trợ và kỹ thuật). Phúc là Quản lý, ngồi giữa phía dưới, giữa hai dãy bàn.
- **Bộ não mặc định là Claude** (`claude-opus-5-5`), dùng `ANTHROPIC_API_KEY` của server. Muốn đổi bộ não cho ai thì vào **Nhân viên → Bộ não / API** và gắn key Claude, OpenAI hoặc nhà cung cấp tương thích OpenAI (Gemini, DeepSeek, OpenRouter…). Có thể gắn nhiều API theo vai trò: chung, thiết kế hình ảnh, viết bài, phân tích chuyên sâu, kênh Zalo.
- Thứ tự chọn bộ não: API chuyên môn đã kiểm tra đạt → API chung → API mặc định công ty (**Cài đặt**) → Claude mặc định. Mỗi câu trả lời đều ghi nhãn bộ não đã dùng; khi phải dùng dự phòng thì nhãn ghi kèm lý do.
- **Kiểm tra key chỉ liệt kê model**, không gửi câu hỏi thử. Khi gọi chat lỗi, giao diện hiện nguyên văn lý do nhà cung cấp trả về (ví dụ HTTP 400, số dư tín dụng quá thấp).

## Bản trải nghiệm (chạy trong Claude)

Bản trải nghiệm dùng chung giao diện và logic nghiệp vụ với bản server, nhưng chạy ngay trong claude.ai dưới dạng Artifact:

- Không cần đăng nhập riêng: tài khoản claude.ai chính là tài khoản văn phòng. Dữ liệu của mỗi tài khoản nằm trong nhánh riêng tư của tài khoản đó.
- Bộ não của mọi nhân viên là Claude, gọi qua tài khoản claude.ai của người xem và dùng hạn mức của tài khoản đó. Lần đầu dùng, Claude sẽ hỏi bạn cho phép. Phúc (Quản lý) dùng mức model cao nhất.
- Những phần chỉ có ở bản server: gắn API riêng cho từng nhân viên, lưu mã truy cập phần mềm đầy đủ (bản trải nghiệm chỉ giữ 4 ký tự cuối), cầu nối Zalo, thời tiết thật, và báo cáo tự chạy đúng 21:00 (bản trải nghiệm nhắc bạn bấm tạo báo cáo).
- Một việc chung 3 người tốn khoảng 13 lượt gọi Claude cho phần phản biện và chọn, cộng mỗi bước thực hiện một lượt và một lượt Phúc kiểm tra.

Đóng gói lại sau khi sửa code: `node scripts/build-trial.js`. Lệnh này tạo `dist-trial/`; thư mục này được publish thành Artifact. Backend của bản trải nghiệm nằm ở `trial/backend.js`.

## Chạy thử trên máy

```bash
npm install
cp .env.example .env          # rồi điền ANTHROPIC_API_KEY
export $(grep -v '^#' .env | xargs)
npm start                     # http://localhost:3000
```

Cần Node.js 22.13 trở lên. Cơ sở dữ liệu SQLite nằm ở `DATA_DIR` (mặc định `./data`).

## Đưa lên mạng để có link dùng ở mọi máy

Dữ liệu nằm trong file SQLite, nên nơi hosting **phải có ổ đĩa bền vững**. Nếu không có, dữ liệu sẽ mất mỗi lần deploy lại.

**Render (dễ nhất):** render.com → New → Blueprint → chọn repo này. File `render.yaml` đã cấu hình Docker, ổ đĩa `/data` và các biến môi trường. Điền `ANTHROPIC_API_KEY` khi được hỏi. Link có dạng `https://van-phong-ao.onrender.com`.

**Railway / Fly.io / VPS:** dùng `Dockerfile` và gắn volume vào `/data`.

Biến môi trường:

| Biến | Ý nghĩa |
|---|---|
| `ANTHROPIC_API_KEY` | Key Claude cho bộ não mặc định (mọi văn phòng trên server dùng chung, chi phí tính vào key này) |
| `APP_SECRET` | Chuỗi ngẫu nhiên dài để mã hoá key API của người dùng. Đừng đổi sau khi đã có dữ liệu |
| `REGISTRATION_CODE` | Nếu đặt, người tạo văn phòng mới phải nhập mã mời này, tránh người lạ dùng key của bạn |
| `ALLOW_REGISTRATION=false` | Tắt hẳn việc tạo văn phòng mới |
| `NODE_ENV=production` | Bật cookie Secure và HSTS (bắt buộc khi chạy HTTPS) |

## Cầu nối Zalo

Zalo chạy qua cầu nối local trên máy của bạn, dùng chính ứng dụng Zalo của bạn. Trong tab **Zalo**, tạo mã `LPA-ZALO-XXXXXX` (dùng 1 lần, hiệu lực 30 phút), rồi chạy trên máy:

```bash
node bridge/zalo-bridge.js https://link-van-phong-cua-ban LPA-ZALO-XXXXXX
```

Bản hiện tại chạy ở chế độ xác nhận thủ công: cầu nối in nội dung cần gửi, bạn gửi bằng Zalo, gõ `y` thì biên nhận được trả về văn phòng. Nhiệm vụ báo xong mà không có biên nhận sẽ bị từ chối. Mỗi lúc chỉ một nhiệm vụ được gửi. Khi cầu nối tắt, nhiệm vụ nằm chờ, không bị mất.

## Kiểm thử

```bash
npm test
```

Lệnh này chạy checklist kiểm thử bắt buộc của đặc tả (ca Fanpage, hỏi đích danh, tham vấn, kiểm tra đạt nhưng chat lỗi 400, bộ não lỗi, tranh luận việc chung, Quản lý dừng việc, phiếu thiếu thông tin, Zalo không biên nhận, dữ liệu bền vững) cùng các ca bảo mật. Bộ test dùng nhà cung cấp giả lập (`test/fake-provider.js`), không tốn tín dụng thật; mọi câu trả lời giả đều có nhãn `[TEST]`.

## Bảo mật

- Mật khẩu băm bằng scrypt. Phiên đăng nhập dùng cookie HttpOnly, SameSite=Lax, Secure khi chạy production. Khi phiên hết hạn, ứng dụng không tự đăng nhập lại mà yêu cầu người dùng tự đăng nhập.
- Key API và mã truy cập phần mềm được mã hoá AES-256-GCM ở server. Giao diện chỉ hiện 4 ký tự cuối.
- Có CSP và các security header khác, chặn yêu cầu ghi dữ liệu từ origin lạ (chống CSRF), giới hạn 10 lần đăng nhập sai trong 15 phút, và chặn Base URL trỏ vào địa chỉ nội bộ (chống SSRF).
- **Cài đặt → Xoá văn phòng** xoá vĩnh viễn toàn bộ dữ liệu của tài khoản.

## Cấu trúc

```
shared/   core.js — logic thuần dùng chung: 10 nhân sự, chọn người, giao thức suy nghĩ, Marketing 5 bước, cổng phiếu, báo cáo
server/   index.js (API, đăng nhập) · brain.js (chọn bộ não, gọi nhà cung cấp) · tasks.js (việc, tranh luận 10 phút, quyền dừng)
          reports.js (báo cáo 21:00) · realdata.js · chat.js · sales.js · zalo.js · roster.js · db.js · secrets.js
trial/    main.js · backend.js — bản trải nghiệm chạy trong Claude (trang được sinh từ public/index.html khi đóng gói)
public/   index.html · app.js (giao diện: ngăn kéo nhân viên, văn phòng 3D, bảng chi tiết) · office3d.js (Three.js, sàn 30x20) · music.js (nhạc nền tự tạo) · style.css
bridge/   zalo-bridge.js (chạy trên máy người dùng)
test/     checklist.js · fake-provider.js
.claude/skills/  bộ skill kỹ thuật từ addyosmani/agent-skills (MIT)
```
