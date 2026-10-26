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
  if (wantsJson && /"vanDe":\[/.test(question)) {
    return JSON.stringify({ diemManh: '[TEST] rõ ràng', vanDe: [{ diem: 'Thiếu số liệu', lyDo: 'chưa có nguồn', deXuat: 'ghi chưa cập nhật' }], canKiemChung: 'doanh thu tuần', yTuongTotHon: '', diem: 7 });
  }
  return `[TEST] ${name} (${who[2] || ''}) — trả lời: ${question.slice(0, 80).replace(/\n/g, ' ')}. Đã đọc ${priorCount} lượt trước.`;
}
