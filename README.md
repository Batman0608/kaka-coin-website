# Văn phòng ảo — 10 nhân sự AI

Ứng dụng web dựng theo đặc tả "Code lõi văn phòng ảo". Mở bằng trình duyệt ở bất kỳ máy nào, đăng nhập là vào đúng văn phòng của mình. **Mỗi tài khoản là một văn phòng riêng**: nhân sự, đào tạo, API, việc, phiếu bán và hàng chờ Zalo đều tách biệt.

- **Báo cáo cuối ngày 21:00:** Chi chuẩn bị đề xuất CSKH (chờ bạn duyệt), Phúc tổng hợp toàn văn phòng. Server tự tạo báo cáo cho văn phòng có hoạt động trong ngày; bạn cũng có thể bấm tạo bất cứ lúc nào.
- **Phản biện chéo khi làm việc chung:** mỗi người đề xuất kế hoạch độc lập → phản biện từng đề xuất của người khác (điểm mạnh, lỗi lập luận, chỗ cần kiểm chứng, rủi ro, chấm điểm) → tác giả trả lời từng ý và sửa, hoặc rút để ủng hộ đề xuất tốt hơn → chấm lại → Phúc xét từng đề xuất, chọn hoặc ghép ý tốt nhất bất kể ai đề xuất và giao bước cho người làm tốt nhất, không bắt buộc đúng vai trò → thực hiện → Phúc kiểm tra từng kết quả theo tiêu chí đạt, chưa đạt thì trả làm lại kèm lý do. Quy trình Marketing 5 bước chỉ còn là tham khảo cho Phúc. Minh vẫn chốt rủi ro pháp lý, Hà vẫn chốt số liệu tài chính.
- **Việc riêng có kiểm tra chéo:** bản nháp → một đồng nghiệp phản biện từng điểm → người làm trả lời từng ý và nộp bản cuối.
- **Chat nhóm:** người trả lời sau phải xét từng câu trả lời trước; cuối cùng Phúc kết luận ý của ai tốt nhất.
- **Cài đặt chi tiết từng nhân viên** (mỗi phần là một mục gập, vừa một màn hình):
  - *Thông tin*: tên, vai trò, nhãn 3D, màu, công cụ được dùng, bật/tắt tự học.
  - *Đào tạo riêng* gồm 10 mục: prompt riêng, kỹ năng, hướng dẫn làm việc, mô tả công việc, kết nối chéo, quy tắc đúng/sai, ví dụ TỐT, ví dụ SAI, giới hạn, bài học tự rút ra. Mỗi lần lưu là một phiên bản mới; xem và khôi phục được 8 bản gần nhất.
  - *Phần mềm làm việc* (KiotViet, Fanpage, phần mềm khác): ghi mục đích dùng, phạm vi quyền, mã truy cập (chỉ hiện 4 ký tự cuối). Có các nút Mở trình duyệt, Kiểm tra kết nối, Đồng bộ, Nhập dữ liệu (dán hoặc tải CSV), Xem dữ liệu, Đánh dấu hết hạn, cùng nhật ký từng lần thao tác. Khi trả lời, nhân viên nhận các mục liên quan câu hỏi (giá, tồn kho, bài đăng…) từ phần mềm của chính mình; chưa có dữ liệu thì nói "chưa cập nhật".
  - *Lịch tự động*: việc lặp lại hằng ngày theo giờ Việt Nam. Đến giờ, hệ thống tự giao việc, chạy nháp, phản biện và bản cuối.
- **Tự đào tạo:** sau mỗi việc xong hoặc bị trả làm lại, Trang (Nhân sự) đọc kết quả và lời phản biện, rồi viết bài học cụ thể cho từng người vào mục "Bài học tự rút ra" và tạo phiên bản đào tạo mới. Mục này giữ 20 bài học gần nhất; bạn sửa hoặc xoá được.
- **Giao việc cho văn phòng** (nút "+ Giao việc"): một cách giao việc duy nhất.
  1. Cả 10 nhân viên đọc việc, mỗi người tự xét theo vai trò xem có phần nào của mình không. Trang việc hiện ai nhận, ai không liên quan.
  2. Chỉ một người nhận thì người đó làm luôn. Ví dụ "tra giá sản phẩm" → chỉ Sơn (Sale) nhận.
  3. Nhiều người nhận thì Phúc sắp thứ tự: ai làm gì, ai chờ ai. Ví dụ "tăng 1000 người theo dõi Fanpage" → Tuấn tìm xu hướng → An viết bài + thiết kế ảnh → Bình đề xuất quảng cáo. Không họp tranh luận.
  4. Mỗi người làm phần của mình bằng hành động thật:
     - xem phần mềm được giao, tìm trên web, thiết kế ảnh;
     - hỏi bạn khi cần thông tin;
     - xin duyệt trước khi đăng bài, nhắn khách hay chạy quảng cáo;
     - nhờ đồng nghiệp làm phần đúng chuyên môn của họ.
  5. Nhiều người thì cuối cùng Phúc tổng kết.
  - Trang việc có bảng riêng cho từng người. Đến lượt ai thì bảng người đó tự mở và được làm nổi bật, kèm từng việc họ đang làm, kết quả, và thẻ duyệt nếu cần bạn.
  - Nút "Gọi toàn nhân viên họp" vẫn mở cuộc họp phản biện kiểu cũ.
- **Vai trò chuẩn của 10 nhân viên** (`shared/roles.js`; Cài đặt → "Thiết lập lại toàn bộ nhân viên"):
  - **Marketing** (tăng độ nhận diện, thu thập dữ liệu khách để chuyển Sale):
    - Tuấn (Phân tích): thị trường, xu hướng trên web, đo số liệu.
    - An (Nội dung): thiết kế ảnh, viết bài, đăng bài.
    - Bình (Quảng cáo): chọn bài theo số liệu, ngân sách, cách chạy.
  - **Sơn (Sale):** nhắn khách, tra KiotViet, chủ động chào người tương tác, tạo phiếu.
  - **Chi (CSKH):** hỏi thăm khách đã mua, tìm khách lâu không mua; câu hỏi hàng hoá chuyển Sơn.
  - **Dũng (Kho):** gợi ý hàng còn tồn cho Sale và Nội dung, ảnh giao hàng vào phiếu.
  - **Hà (Kế toán):** chi phí, doanh thu, báo cáo, lưu hồ sơ.
  - **Phúc (Quản lý, bộ não cao nhất):** sự cố, điều phối, báo cáo, doanh số, rủi ro, kế hoạch bán hàng.
  - **Trang (Nhân sự):** đánh giá và đào tạo từng người theo chuyên môn.
  - **Minh (Pháp lý):** kiểm tra khách hàng trên web khi có đơn, rủi ro, văn bản pháp luật mới.
  - Văn phòng tạo trước đó được thiết lập lại một lần khi mở. Đào tạo cũ vẫn nằm trong lịch sử từng người và khôi phục được. Lịch tự động được thay bằng lịch mặc định của vai trò, tắt sẵn. Phần mềm đã kết nối và API giữ nguyên.
- **Quy trình chuẩn Fanpage** (khi giao việc chung, chọn "Quy trình chuẩn Fanpage"; việc nói về Fanpage, theo dõi, thích, quảng cáo thì form tự chọn sẵn và đọc ngân sách, số ngày trong mô tả). Không họp tranh luận; mỗi bước một người phụ trách và ra một sản phẩm cụ thể:
  1. Tuấn kiểm tra hiện trạng Fanpage (số liệu gốc).
  2. Bình lập kế hoạch: số bài, lịch đăng, chia ngân sách quảng cáo, KPI → **bạn duyệt**. "Yêu cầu sửa" kèm góp ý thì Bình làm lại.
  3. Với từng bài:
     - An viết bài + thiết kế ảnh → **bạn duyệt**; sửa được nội dung, hoặc "Yêu cầu viết lại".
     - An tự đăng lên Fanpage đã kết nối, đúng bản bạn duyệt.
     - Bình xem bài thật rồi đề xuất quảng cáo trong ngân sách kế hoạch (hoặc đề xuất không chạy) → **bạn duyệt** → Bình tự chạy.
     - Sau X giờ, Tuấn đo kết quả và khuyên An, Bình cho bài sau. Bấm "Đo ngay" nếu không muốn chờ.
  4. Phúc báo cáo tổng kết so với mục tiêu.
  - Trang việc hiện đủ các bước: ai làm, đang ở bước nào, sản phẩm của từng bước. Thẻ duyệt nằm ngay trên đầu trang việc và trong "Chờ bạn duyệt".
  - Đăng bài hay chạy quảng cáo bị lỗi thì hỏi bạn "Thử lại / Bỏ qua bước này", không âm thầm bỏ qua.
  - Việc nào đang "Chờ người dùng" mà không còn yêu cầu nào chờ bạn thì có nút "Cho chạy tiếp".
- **Fanpage tự vận hành** (nút "Vận hành Fanpage"): ba người phụ trách tự lặp lại mỗi ngày như người thật.
  - **An (nội dung)**, đến giờ đăng (mặc định 09:00 và 19:30):
    - Tự làm bài hoàn chỉnh, dùng sản phẩm và giá thật nếu có, kèm ảnh thiết kế 1080×1080.
    - Có 6 bố cục và 7 bảng màu. Hệ thống không cho bài mới giống bài cũ: chặn khi trùng nhiều cụm từ, trùng tiêu đề, hoặc lặp tổ hợp bố cục + màu của 3 bài gần nhất.
    - Gửi bài và ảnh lên chat nhóm rồi **tự đăng lên Fanpage, không cần duyệt**.
  - **Tuấn (phân tích)**, mặc định mỗi 4 giờ:
    - Đọc số liệu thật của Fanpage: người theo dõi, lượt thích, tiếp cận, tương tác từng bài.
    - So với lần trước, rồi gửi lời khuyên cụ thể cho An (chủ đề, giờ đăng, kiểu ảnh) và cho Bình (bài nên đẩy, đối tượng, ngân sách).
    - Lời khuyên được đưa vào lần làm việc sau của An và Bình.
  - **Bình (quảng cáo)** chịu trách nhiệm trang tăng trưởng:
    - Mỗi ngày phân tích số liệu thật và lời khuyên của Tuấn, đề xuất kế hoạch: đẩy bài nào, tăng thích/theo dõi cả trang, quảng cáo nhận tin nhắn, kèm đối tượng, ngân sách/ngày, số ngày, chỉ số đo.
    - Tổng ngân sách/ngày không được vượt trần bạn đặt. **Kế hoạch chỉ chạy khi bạn bấm "Duyệt & chạy quảng cáo"**, và chạy đúng kế hoạch đã duyệt. Khi chạy qua trình duyệt, ô ngân sách không nhận số lớn hơn mức đã duyệt, và nút thêm phương thức thanh toán luôn bị chặn.
    - Bình cũng tự chia sẻ bài hay vào các nhóm bạn liệt kê, có giới hạn lượt mỗi ngày.
  - **Bản server:**
    - Fanpage có Page ID + Page Access Token: An đăng ảnh kèm bài, Tuấn đọc số liệu bằng Graph API.
    - Tài khoản quảng cáo có mã act_… + access token (quyền ads_management): Bình chạy quảng cáo bằng Marketing API (chiến dịch → nhóm quảng cáo → mẫu → quảng cáo).
    - Không có mã thì nhân viên làm bằng trình duyệt.
    - Ảnh được vẽ trong Chromium (cần Playwright).
  - **Bản trải nghiệm:** mọi thao tác chạy qua trình duyệt của ứng dụng Claude trên máy tính, và chỉ khi trang đang mở. Trình duyệt này chưa có công cụ tải ảnh lên, nên bài đăng gồm phần chữ; ảnh nằm trong nhóm chat và trang "Vận hành Fanpage" để tải xuống.
- **Làm việc thật, không chỉ nhắn tin:** mỗi bước của việc (bản nháp, bản cuối, từng bước theo bản chốt của Phúc) là một vòng làm việc tối đa 6 lượt. Mỗi lượt nhân viên chọn một hành động:
  - *Xem phần mềm* được giao để lấy số liệu thật (API nếu có mã, không thì tự điều khiển trình duyệt). Lần đầu nhân viên **xin phép bạn**; bạn cho phép thì lần sau tự mở. Thu hồi quyền trong thẻ phần mềm.
  - *Hỏi bạn* khi cần thông tin chỉ bạn biết. Việc dừng ở "Chờ người dùng" cho tới khi bạn trả lời, rồi tự chạy tiếp; câu đã trả lời không bị hỏi lại.
  - *Xin duyệt đăng*: nhân viên soạn nội dung hoàn chỉnh. Bạn đọc, sửa rồi bấm "Duyệt & đăng"; nhân viên tự mở phần mềm (ví dụ Fanpage) đăng đúng nội dung đã duyệt, rồi làm tiếp. Không duyệt thì không đăng.
  - *Nộp kết quả* là sản phẩm hoàn chỉnh. Từng lượt (đã xem gì, hỏi gì, bạn trả lời gì) hiện dưới mỗi kết quả trong trang việc.
  - Có yêu cầu mới thì đầu trang hiện nút "Chờ bạn duyệt (N)" kèm thông báo; trang việc hiện ngay các yêu cầu đang chờ.
- **Nhân viên tự điều khiển trình duyệt để lấy dữ liệu:** trong thẻ phần mềm, bấm "<tên> lấy qua trình duyệt" và ghi cần lấy gì. Nhân viên mở phần mềm, đọc trang, tự bấm và tìm từng bước (tối đa 8 bước), rồi lưu sản phẩm, giá, tồn kho hoặc bài đăng vào dữ liệu của mình. Khi lấy dữ liệu, nhân viên chỉ đọc: hệ thống chặn các nút xoá, lưu, gửi, đăng, đặt hàng, thanh toán và đăng xuất. Chỉ khi đăng nội dung bạn đã duyệt mới được bấm Đăng/Gửi; nút xoá, tiền, đơn hàng và đăng xuất thì luôn bị chặn. Nhân viên không tự nhập mật khẩu. Gặp trang đăng nhập thì liên kết chuyển "Hết hạn"; bạn tự đăng nhập rồi chạy lại.
  - *Bản trải nghiệm* dùng trình duyệt có sẵn trong ứng dụng Claude trên máy tính, nên chỉ chạy khi mở văn phòng trong ứng dụng đó. Ứng dụng hỏi bạn cho phép ở lần đầu và có thể hỏi xác nhận khi nhân viên bấm hoặc nhập.
  - *Bản server* dùng Playwright (`npm i playwright && npx playwright install chromium`), mỗi phần mềm có một hồ sơ trình duyệt riêng. Muốn dùng phần mềm cần đăng nhập, chạy server trên máy bạn với `VPA_BROWSER_HEADFUL=1` và tự đăng nhập một lần; phiên đăng nhập được giữ lại. Trình duyệt không vào được địa chỉ nội bộ.
- **Hỏi dưới mỗi việc:** mỗi việc trong danh sách và trong trang việc có một thanh hỏi. Chọn người (người được giao, người làm từng bước, Phúc với việc chung) rồi gõ câu hỏi. Người đó trả lời dựa trên mô tả, tiến độ, kết quả từng bước và đánh giá của chính việc này. Câu hỏi và câu trả lời lưu trong trang việc.
- **KiotViet và Facebook thật (bản server):** KiotViet dùng Public API (Retailer, Client ID, Client Secret) để lấy sản phẩm, giá và tồn kho. Fanpage dùng Graph API (Page ID, Page Access Token) để lấy bài đăng, lượt thích và bình luận. Sai mã hoặc hết hạn thì liên kết chuyển sang "Hết hạn" và hệ thống không tự đăng nhập lại. Phần này mới được kiểm thử với máy chủ giả lập, chưa thử với tài khoản thật.
- **Dữ kiện thật nội bộ:** mỗi lượt trả lời đều nhận số liệu văn phòng đang có (phiếu, việc, hàng chờ, phần mềm đã liên kết). Nguồn chưa kết nối (giá, tồn kho KiotViet, số liệu Fanpage) được ghi rõ là "chưa cập nhật".
- **10 nhân sự cố định:** An, Bình, Tuấn (Marketing); Sơn, Dũng, Hà, Phúc (Vận hành và kiểm soát); Chi, Trang, Minh (Hỗ trợ và kỹ thuật). Phúc là Quản lý, ngồi giữa phía dưới, giữa hai dãy bàn.
- **Bộ não mặc định là Claude** (`claude-opus-5-5`), dùng `ANTHROPIC_API_KEY` của server. Muốn đổi bộ não cho ai thì vào **Nhân viên → Bộ não / API** và gắn key Claude, OpenAI hoặc nhà cung cấp tương thích OpenAI (Gemini, DeepSeek, OpenRouter…). Có thể gắn nhiều API theo vai trò: chung, thiết kế hình ảnh, viết bài, phân tích chuyên sâu, kênh Zalo.
- Thứ tự chọn bộ não: API chuyên môn đã kiểm tra đạt → API chung → API mặc định công ty (**Cài đặt**) → Claude mặc định. Mỗi câu trả lời đều ghi nhãn bộ não đã dùng; khi phải dùng dự phòng thì nhãn ghi kèm lý do.
- **Kiểm tra key chỉ liệt kê model**, không gửi câu hỏi thử. Khi gọi chat lỗi, giao diện hiện nguyên văn lý do nhà cung cấp trả về (ví dụ HTTP 400, số dư tín dụng quá thấp).

## Bản trải nghiệm (chạy trong Claude)

Bản trải nghiệm dùng chung giao diện và logic nghiệp vụ với bản server, nhưng chạy ngay trong claude.ai dưới dạng Artifact:

- Không cần đăng nhập riêng: tài khoản claude.ai chính là tài khoản văn phòng. Dữ liệu của mỗi tài khoản nằm trong nhánh riêng tư của tài khoản đó.
- Bộ não của mọi nhân viên là Claude, gọi qua tài khoản claude.ai của người xem và dùng hạn mức của tài khoản đó. Lần đầu dùng, Claude sẽ hỏi bạn cho phép. Phúc (Quản lý) dùng mức model cao nhất.
- **API riêng từng nhân viên** (mục Bộ não / API, theo mẫu "Đính API AI riêng" và "Danh sách API"):
  - Chọn *Claude qua claude.ai* để đặt model riêng (Opus, Sonnet, Haiku, Fable) và mức suy nghĩ, không cần key.
  - Hoặc gắn key Claude, OpenAI hay nhà cung cấp tương thích OpenAI. Key chỉ giữ trong trang đang mở và không lưu; tải lại trang thì nhập lại. Lỗi nhà cung cấp hiện nguyên văn, và khi lỗi nhân viên chuyển sang Claude qua claude.ai với nhãn ghi rõ lý do.
- Những phần chỉ có ở bản server: lưu mã truy cập phần mềm đầy đủ (bản trải nghiệm chỉ giữ 4 ký tự cuối), lưu key API lâu dài, cầu nối Zalo, thời tiết thật, kết nối và đồng bộ KiotViet/Facebook trực tiếp (bản trải nghiệm dùng trình duyệt của ứng dụng Claude hoặc Nhập dữ liệu bằng CSV), và tự động khi trình duyệt đã tắt. Lịch tự động và báo cáo 21:00 của bản trải nghiệm chỉ chạy khi trang đang mở.
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
          deliberation.js (phản biện chéo) · staffkit.js (đào tạo nhiều mục, lịch tự động, dữ liệu phần mềm, tự học)
          browseragent.js (nhân viên điều khiển trình duyệt) · taskqa.js (hỏi về việc đã giao) · worker.js (làm việc thật từng lượt) · teamflow.js (giao việc cho cả văn phòng) · roles.js (vai trò chuẩn)
          fanpage.js (Fanpage tự vận hành) · design.js (vẽ ảnh thiết kế)
server/   index.js (API, đăng nhập) · brain.js (chọn bộ não, gọi nhà cung cấp) · tasks.js (việc, tranh luận 10 phút, quyền dừng)
          reports.js (báo cáo 21:00) · automation.js (lịch tự động) · links.js · connectors.js (KiotViet, Facebook) · browser.js + browse.js (trình duyệt Playwright) · requests.js (yêu cầu chờ duyệt) · fanpage.js (Fanpage tự vận hành) · taskqa.js · staffops.js · realdata.js · chat.js · sales.js · zalo.js · roster.js · db.js · secrets.js
trial/    main.js · backend.js — bản trải nghiệm chạy trong Claude (trang được sinh từ public/index.html khi đóng gói)
public/   index.html · app.js (giao diện: ngăn kéo nhân viên, văn phòng 3D, bảng chi tiết) · office3d.js (Three.js, sàn 30x20) · music.js (nhạc nền tự tạo) · style.css
bridge/   zalo-bridge.js (chạy trên máy người dùng)
test/     checklist.js · fake-provider.js
.claude/skills/  bộ skill kỹ thuật từ addyosmani/agent-skills (MIT)
```
