// BỘ NÃO GIẢ LẬP — CHỈ DÙNG CHO KIỂM THỬ. Câu trả lời đánh dấu [TEST]; với các vòng cần JSON thì trả JSON đúng mẫu.
// Hàm tự chứa (không import) để còn nhúng được vào trình duyệt khi kiểm thử bản trải nghiệm.
export function fakeAnswer(prompt, flags = {}) {
  const who = /Bạn là (.+?), vai trò (.+?) tại/.exec(prompt) || [];
  const name = who[1] || '?';
  const qIdx = prompt.lastIndexOf('Câu hỏi / việc cần xử lý:');
  const question = qIdx >= 0 ? prompt.slice(qIdx + 25).trim() : '';
  const ids = (re) => (re.exec(question)?.[1] || '').split(/\s*,\s*/).filter(Boolean);
  const wantsJson = /Chỉ trả về MỘT đối tượng JSON/.test(question);
  const priorCount = JSON.parse(/Các lượt nói trước: (.*)$/m.exec(prompt)?.[1] || '[]').length;
  if (wantsJson && /"danhGia":\[\{"maDeXuat"/.test(question)) {
    return JSON.stringify({
      danhGia: ids(/Mã đề xuất cần xét: (.+)$/m).map((id, i) => ({ maDeXuat: id, diemManh: `[TEST] ${name} thấy ${id} rõ mục tiêu`, diemYeu: `[TEST] ${id} thiếu số liệu nền`, canKiemChung: 'Số like hiện tại', ruiRo: 'Chi phí quảng cáo', diem: 6 + ((i + name.length) % 4) })),
      nhanXet: `[TEST] ${name} đã xét từng đề xuất`,
    });
  }
  if (wantsJson && /"keHoachSua"/.test(question)) {
    return JSON.stringify({ phanHoi: [{ nguoiPhanBien: 'Đồng nghiệp', yKien: 'thiếu số liệu nền', chapNhan: true, lyDo: '[TEST] bổ sung bước đo số liệu nền' }], rutDeXuat: false, ungHo: '', keHoachSua: `[TEST] Kế hoạch đã sửa của ${name}: đo số liệu nền trước rồi mới làm.` });
  }
  if (wantsJson && /"cham":\[/.test(question)) {
    return JSON.stringify({ cham: ids(/Mã đề xuất cần chấm: (.+)$/m).map((id, i) => ({ maDeXuat: id, diem: 7 + ((i + name.length) % 3), lyDo: `[TEST] ${name} chấm ${id}` })), yTuongNenGhep: '[TEST] ghép bước đo số liệu nền' });
  }
  if (wantsJson && /"keHoach":\[/.test(question)) {
    // Chọn theo ý tưởng, không theo vai trò: bước nội dung giao cho Tuấn, bước số liệu giao cho An.
    return JSON.stringify({
      xetTungDeXuat: [{ maDeXuat: 'P1', tacGia: 'Tuấn', ketLuan: 'dùng một phần', lyDo: '[TEST] phân tích tốt' }, { maDeXuat: 'P2', tacGia: 'An', ketLuan: 'dùng', lyDo: '[TEST] ý đo số liệu nền tốt nhất' }],
      yTuongDuocChon: [{ maDeXuat: 'P2', tacGia: 'An', noiDung: 'Đo số liệu nền trước', lyDo: '[TEST] điểm chấm lại cao nhất' }],
      kiemTraChotCuoi: '[TEST] Hà chốt ngân sách',
      keHoach: [
        { buoc: 1, viec: 'Đo số liệu nền Fanpage', nguoiThucHien: 'An', lyDoChonNguoi: 'An đưa ra ý này', mocKiemTra: 'Ngày 2', tieuChiDat: 'Có số liệu nền' },
        { buoc: 2, viec: 'Viết 3 bài thử', nguoiThucHien: 'Tuấn', lyDoChonNguoi: 'Tuấn có hook tốt nhất trong phản biện', mocKiemTra: 'Ngày 4', tieuChiDat: '3 bài đăng' },
      ],
      tomTat: '[TEST] dùng ý của An và Tuấn',
    });
  }
  if (wantsJson && /"dat":true/.test(question)) {
    return JSON.stringify({ danhGia: [{ buoc: 1, dat: !flags.failReview, lyDo: flags.failReview ? '[TEST] thiếu số liệu nền thật' : '[TEST] đạt' }, { buoc: 2, dat: true, lyDo: '[TEST] đạt' }], ketLuan: '[TEST] đã xét từng bước' });
  }
  if (wantsJson && /"baiHoc":\[/.test(question)) {
    const names = [...question.matchAll(/^- ([^:\n]+): /gm)].map((m) => m[1]);
    return JSON.stringify({ baiHoc: names.map((n) => ({ nhanVien: n, baiHoc: [`[TEST] ${n}: kiểm tra số liệu nền trước khi đề xuất`] })) });
  }
  if (/^XÉT VIỆC MỚI/.test(question)) {
    // Mỗi người tự xét theo vai trò: tra giá → Sale; theo dõi / follow → nhóm Marketing; còn lại → Quản lý.
    const viec = /vừa giao cho cả văn phòng: "([^"]+)"/.exec(question)?.[1] || '';
    const me = /Vai trò của bạn \(([^ ]+) — /.exec(question)?.[1] || name;
    const nhan = /giá/i.test(viec) ? ['Sơn'] : /follow|theo dõi/i.test(viec) ? ['Tuấn', 'An', 'Bình'] : ['Phúc'];
    const ok = nhan.includes(me);
    return JSON.stringify({ lienQuan: ok, viecCuaToi: ok ? `[TEST] ${me} làm phần ${me === 'Tuấn' ? 'tìm xu hướng' : me === 'An' ? 'viết bài + ảnh' : me === 'Bình' ? 'chạy quảng cáo' : 'trả lời'}` : '', canChoAi: me === 'An' ? ['Tuấn'] : me === 'Bình' ? ['An'] : [], lyDo: ok ? '[TEST] đúng chuyên môn' : '[TEST] không thuộc vai trò' });
  }
  if (/^ĐIỀU PHỐI VIỆC/.test(question)) {
    const claims = JSON.parse(/đã tự nhận phần việc: (\[.*\])$/m.exec(question)?.[1] || '[]');
    const order = ['Tuấn', 'An', 'Bình'];
    claims.sort((a, b) => order.indexOf(a.nguoi) - order.indexOf(b.nguoi));
    return JSON.stringify({ thuTu: claims.map((c) => ({ nguoi: c.nguoi, viec: c.viec, sanPham: '[TEST] sản phẩm', sauKhi: c.canChoAi })), tomTat: '[TEST] Tuấn tìm xu hướng → An viết bài + ảnh → Bình chạy quảng cáo' });
  }
  if (/^KẾ HOẠCH CHIẾN DỊCH/.test(question)) {
    const b = Number(/Tổng ngân sách quảng cáo tối đa: (\d+)/.exec(question)?.[1] || 0);
    const sua = /NGƯỜI DÙNG KHÔNG DUYỆT/.test(question);
    return JSON.stringify({ tomTat: `[TEST] ${sua ? 'Bản sửa theo góp ý: ' : ''}2 bài, đẩy bài tốt nhất`, soBai: 2,
      baiViet: [{ so: 1, ngay: 1, gio: '19:30', chuDe: 'Giới thiệu lọc gió chính hãng', mucDich: 'thu hút người theo dõi' }, { so: 2, ngay: 3, gio: '19:30', chuDe: 'Mẹo bảo dưỡng xe tải', mucDich: 'tăng tương tác' }],
      quangCao: [{ baiSo: 1, loai: 'day_bai', nganSach: Math.floor(b * 0.6) }, { baiSo: 2, loai: 'tang_like_trang', nganSach: Math.floor(b * 0.4) }],
      kpi: '[TEST] +1000 người theo dõi', kiemTraSauGio: 1, doiTuong: { tuoiTu: 25, tuoiDen: 55, khuVuc: 'Việt Nam', soThich: ['xe tải'] } });
  }
  if (/^QUẢNG CÁO CHO BÀI VỪA ĐĂNG/.test(question)) {
    const max = Number(/tối đa (\d+) đồng/.exec(question)?.[1] || 0);
    return JSON.stringify({ chay: true, lyDo: '[TEST] Bài có tương tác tự nhiên tốt', loai: 'day_bai', nganSachNgay: Math.floor(max / 3), soNgay: 3, mucTieu: 'Tăng theo dõi', kpi: '[TEST] 300 người theo dõi' });
  }
  if (/^ĐO KẾT QUẢ CHIẾN DỊCH/.test(question)) {
    return JSON.stringify({ tienDo: '[TEST] +14 / 1000 người theo dõi', nhanXet: '[TEST] Bài 1 tiếp cận tốt', loiKhuyenNoiDung: '[TEST] Bài sau thêm ảnh thật sản phẩm', loiKhuyenQuangCao: '[TEST] Giữ đối tượng 25-55' });
  }
  if (/NHIỆM VỤ THƯỜNG TRỰC: bạn phụ trách nội dung Fanpage/.test(question)) {
    // Mỗi bài một chủ đề, bố cục, bảng màu khác nhau (đếm số bài gần đây để đổi).
    const prev = JSON.parse(/^Các bài gần đây: (\[.*\])$/m.exec(question)?.[1] || '[]');
    const n = prev.length + (/BẢN TRƯỚC BỊ TRẢ LẠI/.test(question) ? 1 : 0);
    const topics = ['Lọc gió Vios chính hãng', 'Mẹo kiểm tra phốt bánh xe tải', 'Bạc đạn mooc FUWA giá tốt', 'Lịch bảo dưỡng đầu kéo Mỹ', 'Khách hàng nói gì về Long Phu', 'Combo lọc nhớt + lọc gió'];
    const layouts = ['cheo', 'chia-doi', 'khung-vien', 'tieu-diem', 'so-lon', 'dai-bang'];
    const palettes = ['vang-den', 'do-trang', 'xanh-cam', 'xanh-la', 'tim-hong', 'xam-thep'];
    const t = topics[n % topics.length];
    return JSON.stringify({ chuDe: `[TEST] ${t}`, noiDung: `[TEST] ${t}: ${['Hàng chính hãng giao nhanh trong ngày', 'Ba dấu hiệu cần thay ngay để tránh hỏng nặng', 'Giá tốt cho đại lý, bảo hành rõ ràng', 'Bảo dưỡng đúng hạn giúp xe chạy bền', 'Cảm ơn bác tài đã tin tưởng ủng hộ', 'Mua combo tiết kiệm hơn mua lẻ'][n % 6]} — bài số ${n + 1}.`, hashtag: ['#LongPhuAuto'], thietKe: { boCuc: layouts[n % 6], bangMau: palettes[n % 6], tieuDe: t, phuDe: 'Phụ tùng xe tải Mỹ (TEST)', nhan: `${450 + n * 10}K`, chiTiet: ['Chính hãng', 'Giao nhanh', 'Bảo hành'], keuGoi: 'Nhắn tin ngay' }, khacBaiTruoc: 'đổi chủ đề và bố cục' });
  }
  if (/NHIỆM VỤ THƯỜNG TRỰC: bạn luôn theo dõi hiệu quả Fanpage/.test(question)) {
    const f = /"followers":(\d+)/.exec(question)?.[1] || /([\d.]+) người theo dõi/.exec(question)?.[1]?.replace(/\./g, '');
    return JSON.stringify({ tomTat: `[TEST] Trang có ${f ?? 'chưa rõ'} người theo dõi`, chiSo: { nguoiTheoDoi: Number(f) || null }, thayDoi: '[TEST] tăng nhẹ', baiTotNhat: [], loiKhuyenNoiDung: '[TEST] Đăng thêm bài mẹo bảo dưỡng lúc 19:30', loiKhuyenQuangCao: '[TEST] Đẩy bài có tương tác cao nhất, 25-55 tuổi', canhBao: '' });
  }
  if (/chịu trách nhiệm Fanpage TĂNG TRƯỞNG/.test(question)) {
    const posts = JSON.parse(/^Bài đã đăng \(chọn bài để đẩy theo mã\): (\[.*\])$/m.exec(question)?.[1] || '[]');
    const cap = Number(/Trần ngân sách mỗi ngày người dùng cho phép: (\d+)/.exec(question)?.[1] || 0);
    const deXuat = [];
    if (posts[0]) deXuat.push({ loai: 'day_bai', baiViet: posts[0].ma, mucTieu: 'Tăng tương tác', doiTuong: { tuoiTu: 25, tuoiDen: 55, khuVuc: 'Việt Nam', soThich: ['xe tải'] }, nganSachNgay: Math.floor(cap * 0.6), soNgay: 3, kpi: '200 tương tác' });
    deXuat.push({ loai: 'tang_like_trang', baiViet: null, mucTieu: 'Tăng người theo dõi', doiTuong: { tuoiTu: 25, tuoiDen: 55, khuVuc: 'Việt Nam', soThich: [] }, nganSachNgay: Math.floor(cap * 0.4), soNgay: 5, kpi: '100 lượt thích trang' });
    return JSON.stringify({ phanTich: '[TEST] Bài mới có tương tác tốt, trang còn ít người theo dõi', deXuat, kiemTraSau: '2 ngày' });
  }
  if (/BẠN ĐANG LÀM VIỆC THẬT/.test(question)) {
    // Làm việc thật: xem phần mềm của mình trước, hỏi người dùng khi việc có "(HỎI)", soạn bài và xin duyệt khi cần đăng.
    const grab = (re) => { try { return JSON.parse(re.exec(question)?.[1] || '[]'); } catch { return []; } };
    const links = grab(/^Phần mềm của bạn[^:]*: (\[.*\])$/m);
    const trace = grab(/^Các lượt bạn đã làm trong bước này: (\[.*\])$/m);
    const has = (a) => trace.some((t) => t.hanhDong === a);
    const fb = links.find((l) => l.loai === 'facebook_page' || /fanpage/i.test(l.ten));
    if (links.length && !has('xem_phan_mem')) return JSON.stringify({ hanhDong: 'xem_phan_mem', phanMem: (links.find((l) => l !== fb) || links[0]).ma, canLay: 'giá và tồn kho' });
    if (/PHẦN CỦA BẠN/.test(question) && name === 'Tuấn' && !has('tim_tren_web')) return JSON.stringify({ hanhDong: 'tim_tren_web', tuKhoa: 'xu hướng phụ tùng xe tải' });
    if (/PHẦN CỦA BẠN/.test(question) && name === 'An' && fb && !has('tao_anh')) return JSON.stringify({ hanhDong: 'tao_anh', thietKe: { boCuc: 'tieu-diem', bangMau: 'xanh-cam', tieuDe: 'Lọc gió chính hãng', nhan: '185K', chiTiet: ['Còn hàng'], keuGoi: 'Nhắn tin ngay' } });
    if (/PHẦN CỦA BẠN/.test(question) && name === 'An' && fb && !has('xin_duyet_dang')) {
      const img = /mã ảnh: (IMG-\w+)/.exec(question)?.[1];
      return JSON.stringify({ hanhDong: 'xin_duyet_dang', phanMem: fb.ma, noiDung: '[TEST] Bài đăng: lọc gió chính hãng, nhắn tin để được tư vấn.', anh: img, ghiChu: 'đăng ngay' });
    }
    if (/PHẦN CỦA BẠN/.test(question) && name === 'Bình' && fb && !has('xin_duyet_quang_cao')) return JSON.stringify({ hanhDong: 'xin_duyet_quang_cao', phanMem: fb.ma, noiDung: '[TEST] Đẩy bài lọc gió, 25-55 tuổi', nganSachNgay: 100000, soNgay: 3 });
    if (/\(HỎI\)/.test(question) && !has('hoi_nguoi_dung') && !/"hoi":"/.test(question)) return JSON.stringify({ hanhDong: 'hoi_nguoi_dung', cauHoi: '[TEST] Số like Fanpage hiện tại là bao nhiêu?', vi: 'cần số liệu nền' });
    if (/đăng bài/i.test(question) && fb && !has('xin_duyet_dang') && !/"daXinDang":/.test(question)) return JSON.stringify({ hanhDong: 'xin_duyet_dang', phanMem: fb.ma, noiDung: `[TEST] Bài đăng của ${name}: Lọc gió Vios chính hãng, còn hàng.`, ghiChu: 'đăng ngay' });
    const seen = trace.map((t) => t.ketQua).filter(Boolean).join(' | ').slice(0, 400);
    return JSON.stringify({ hanhDong: 'nop', ketQua: `[TEST] ${name} (${who[2] || ''}) — trả lời: nộp kết quả sau ${trace.length} lượt làm việc. Đã đọc ${priorCount} lượt trước.${seen ? ` Dữ kiện: ${seen}` : ''}` });
  }
  if (/Bạn đang tự điều khiển trình duyệt/.test(question)) {
    if (/CHẠY QUẢNG CÁO đúng như kế hoạch/.test(question)) {
      // Chạy quảng cáo qua trình duyệt: thử nhập vượt ngân sách (phải bị chặn), rồi nhập đúng, rồi Xuất bản.
      const pg = question.slice(question.lastIndexOf('<<<'), question.lastIndexOf('>>>'));
      const cap = Number(/Ngân sách mỗi ngày tối đa: (\d+)/.exec(question)?.[1] || 0);
      if (/Đã bật quảng cáo/.test(pg)) return JSON.stringify({ hanhDong: 'xong', ketQua: '[TEST] Quảng cáo đã bật' });
      const box = /\[(r\d+|ref_\d+)\][^\n]*Ngân sách/i.exec(pg);
      const btn = /\[(r\d+|ref_\d+)\][^\n]*"(Xuất bản|Đẩy mạnh bài viết)"/.exec(pg);
      if (/Ngân sách đã nhập/.test(pg) && btn) return JSON.stringify({ hanhDong: 'bam', ref: btn[1], vi: 'bật quảng cáo' });
      if (box && !/vượt ngân sách/.test(pg)) return JSON.stringify({ hanhDong: 'nhap', ref: box[1], noiDung: String(cap + 50000) });
      if (box) return JSON.stringify({ hanhDong: 'nhap', ref: box[1], noiDung: String(cap) });
      return JSON.stringify({ hanhDong: 'doc' });
    }
    if (/ĐĂNG nội dung NGƯỜI DÙNG ĐÃ DUYỆT/.test(question)) {
      const pg = question.slice(question.lastIndexOf('<<<'), question.lastIndexOf('>>>'));
      if (/Đã đăng bài/.test(pg)) return JSON.stringify({ hanhDong: 'xong', ketQua: '[TEST] Bài đã hiện trên trang' });
      const box = /\[(r\d+|ref_\d+)\][^\n]*(textarea|Bạn đang nghĩ gì|Viết gì đó)/.exec(pg);
      const btn = /\[(r\d+|ref_\d+)\][^\n]*"Đăng"/.exec(pg);
      if (box && !/"hanhDong":"nhap","ref":"(r\d+|ref_\d+)"/.test(question)) return JSON.stringify({ hanhDong: 'nhap', ref: box[1], noiDung: /<<<NOIDUNG\n([\s\S]*?)\nNOIDUNG>>>/.exec(question)?.[1] || '' });
      if (btn) return JSON.stringify({ hanhDong: 'bam', ref: btn[1], vi: 'đăng bài' });
      return JSON.stringify({ hanhDong: 'doc' });
    }
    // Đọc trang thật mà trình duyệt trả về: có bảng hàng → lưu; trang đăng nhập → dừng; còn lại bấm vào "Hàng hóa".
    const page = question.slice(question.indexOf('<<<'), question.indexOf('>>>'));
    if (/CÓ Ô MẬT KHẨU|type="?password|textbox "Mật khẩu"/i.test(page)) return JSON.stringify({ hanhDong: 'dung', canDangNhap: true, lyDo: '[TEST] Trang yêu cầu đăng nhập' });
    const fol = /([\d.]+) người theo dõi/.exec(page);
    if (fol) return JSON.stringify({ hanhDong: 'luu', loai: 'notes', muc: page.split('\n').filter((l) => /người theo dõi|thích|bình luận/.test(l)).map((l) => ({ ghiChu: l.trim() })), ketLuan: `[TEST] Trang có ${fol[1]} người theo dõi` });
    const rows = [...page.matchAll(/^([A-Z]{2,}-\d+)\s*[\t|]\s*(.+?)\s*[\t|]\s*(\d+)\s*[\t|]\s*(\d+)\s*$/gm)];
    if (rows.length) return JSON.stringify({ hanhDong: 'luu', loai: 'products', muc: rows.map((m) => ({ ma: m[1], ten: m[2], gia: Number(m[3]), ton: Number(m[4]) })), ketLuan: `[TEST] Lấy ${rows.length} sản phẩm từ trang Hàng hóa` });
    const risky = /\[(r\d+|ref_\d+)\][^\n]*Xóa dữ liệu/.exec(page);
    if (risky && !/LỖI khi "bam"/.test(page)) return JSON.stringify({ hanhDong: 'bam', ref: risky[1], vi: '[TEST] thử bấm nút nguy hiểm' });
    const ref = /\[(r\d+|ref_\d+)\][^\n]*Hàng hóa/.exec(page);
    return JSON.stringify(ref ? { hanhDong: 'bam', ref: ref[1], vi: '[TEST] mở danh sách hàng' } : { hanhDong: 'doc' });
  }
  if (wantsJson && /"vanDe":\[/.test(question)) {
    return JSON.stringify({ diemManh: '[TEST] rõ ràng', vanDe: [{ diem: 'Thiếu số liệu', lyDo: 'chưa có nguồn', deXuat: 'ghi chưa cập nhật' }], canKiemChung: 'doanh thu tuần', yTuongTotHon: '', diem: 7 });
  }
  return `[TEST] ${name} (${who[2] || ''}) — trả lời: ${question.slice(0, 80).replace(/\n/g, ' ')}. Đã đọc ${priorCount} lượt trước.`;
}
