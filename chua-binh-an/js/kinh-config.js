/* =========================================================================
   LỊCH TỤNG KINH TỰ ĐỘNG TRONG CHÁNH ĐIỆN
   Mỗi ngày đến giờ (giờ Việt Nam), người chơi ở trong điện sẽ tự nghe tụng kinh.
   Mỗi khung giờ phát MỘT bài, luân phiên qua các bài, hết danh sách quay lại đầu.
   Thêm/bớt bài: chép file .mp3 vào audio/kinh/ rồi thêm dòng vào "tracks"
   (dur = số giây, xem bằng cách mở file, hoặc để 0 thì game tự đo khi phát).
   ========================================================================= */
window.CBA = window.CBA || {};
CBA.kinh = {
  enabled: true,
  slots: [ { h: 5, m: 0 }, { h: 19, m: 0 } ],   // 5h sáng và 19h tối (giờ VN)
  windowMin: 60,                                 // mỗi khung kéo dài 60 phút
  tracks: [
    { file: 'a-di-da-1.mp3',        title: 'Tụng Kinh A Di Đà · phần 1', dur: 588 },
    { file: 'a-di-da-2.mp3',        title: 'Tụng Kinh A Di Đà · phần 2', dur: 601 },
    { file: 'a-di-da-3.mp3',        title: 'Tụng Kinh A Di Đà · phần 3', dur: 652 },
    { file: 'a-di-da-4.mp3',        title: 'Tụng Kinh A Di Đà · phần 4', dur: 674 },
    { file: 'chap-tay-ve-lang.mp3', title: 'Chắp Tay Về Làng · Masew, Khói Vũ', dur: 235 }
  ]
};
