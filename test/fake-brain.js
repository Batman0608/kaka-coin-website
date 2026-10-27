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
  if (/BẠN ĐANG LÀM VIỆC THẬT/.test(question)) {
    // Làm việc thật: xem phần mềm của mình trước, hỏi người dùng khi việc có "(HỎI)", soạn bài và xin duyệt khi cần đăng.
    const grab = (re) => { try { return JSON.parse(re.exec(question)?.[1] || '[]'); } catch { return []; } };
    const links = grab(/^Phần mềm của bạn[^:]*: (\[.*\])$/m);
    const trace = grab(/^Các lượt bạn đã làm trong bước này: (\[.*\])$/m);
    const has = (a) => trace.some((t) => t.hanhDong === a);
    const fb = links.find((l) => l.loai === 'facebook_page' || /fanpage/i.test(l.ten));
    if (links.length && !has('xem_phan_mem')) return JSON.stringify({ hanhDong: 'xem_phan_mem', phanMem: (links.find((l) => l !== fb) || links[0]).ma, canLay: 'giá và tồn kho' });
    if (/\(HỎI\)/.test(question) && !has('hoi_nguoi_dung') && !/"hoi":"/.test(question)) return JSON.stringify({ hanhDong: 'hoi_nguoi_dung', cauHoi: '[TEST] Số like Fanpage hiện tại là bao nhiêu?', vi: 'cần số liệu nền' });
    if (/đăng bài/i.test(question) && fb && !has('xin_duyet_dang') && !/"daXinDang":/.test(question)) return JSON.stringify({ hanhDong: 'xin_duyet_dang', phanMem: fb.ma, noiDung: `[TEST] Bài đăng của ${name}: Lọc gió Vios chính hãng, còn hàng.`, ghiChu: 'đăng ngay' });
    const seen = trace.map((t) => t.ketQua).filter(Boolean).join(' | ').slice(0, 400);
    return JSON.stringify({ hanhDong: 'nop', ketQua: `[TEST] ${name} (${who[2] || ''}) — trả lời: nộp kết quả sau ${trace.length} lượt làm việc. Đã đọc ${priorCount} lượt trước.${seen ? ` Dữ kiện: ${seen}` : ''}` });
  }
  if (/Bạn đang tự điều khiển trình duyệt/.test(question)) {
    if (/ĐĂNG nội dung NGƯỜI DÙNG ĐÃ DUYỆT/.test(question)) {
      const pg = question.slice(question.lastIndexOf('<<<'), question.lastIndexOf('>>>'));
      if (/Đã đăng bài/.test(pg)) return JSON.stringify({ hanhDong: 'xong', ketQua: '[TEST] Bài đã hiện trên trang' });
      const box = /\[(r\d+|ref_\d+)\][^\n]*(textarea|Bạn đang nghĩ gì)/.exec(pg);
      const btn = /\[(r\d+|ref_\d+)\][^\n]*"Đăng"/.exec(pg);
      if (box && !/"hanhDong":"nhap","ref":"(r\d+|ref_\d+)"/.test(question)) return JSON.stringify({ hanhDong: 'nhap', ref: box[1], noiDung: /<<<NOIDUNG\n([\s\S]*?)\nNOIDUNG>>>/.exec(question)?.[1] || '' });
      if (btn) return JSON.stringify({ hanhDong: 'bam', ref: btn[1], vi: 'đăng bài' });
      return JSON.stringify({ hanhDong: 'doc' });
    }
    // Đọc trang thật mà trình duyệt trả về: có bảng hàng → lưu; trang đăng nhập → dừng; còn lại bấm vào "Hàng hóa".
    const page = question.slice(question.indexOf('<<<'), question.indexOf('>>>'));
    if (/CÓ Ô MẬT KHẨU|type="?password|textbox "Mật khẩu"/i.test(page)) return JSON.stringify({ hanhDong: 'dung', canDangNhap: true, lyDo: '[TEST] Trang yêu cầu đăng nhập' });
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
