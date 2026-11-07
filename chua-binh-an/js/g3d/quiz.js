/* =========================================================================
 *  CÂU HỎI THAM QUAN — đi tới gần tượng Phật, hồ sen, hồ cá, địa danh trong
 *  khuôn viên chùa sẽ hiện một câu hỏi ngẫu nhiên. Trả lời đúng: +15 hạt.
 *  Không chặn việc đi lại (thẻ nhỏ phía dưới màn hình), mỗi điểm hỏi lại sau 8 phút.
 * ========================================================================= */
const BANK = [
  // [câu hỏi, đáp án đúng, [3 đáp án sai], chủ đề]
  ['Tên thật của Đức Phật Thích Ca là gì?', 'Tất Đạt Đa (Siddhartha)', ['A Nan Đà', 'Ca Diếp', 'Mục Kiền Liên'], 'phat'],
  ['Đức Phật đản sinh tại khu vườn nào?', 'Vườn Lâm Tỳ Ni (Lumbini)', ['Vườn Lộc Uyển', 'Tinh xá Kỳ Viên', 'Rừng Trúc Lâm'], 'phat'],
  ['Đức Phật thành đạo dưới cội cây gì?', 'Cây Bồ Đề', ['Cây Sa La', 'Cây Vô Ưu', 'Cây Đa La'], 'phat'],
  ['Đức Phật giảng bài pháp đầu tiên ở đâu?', 'Vườn Lộc Uyển', ['Núi Linh Thứu', 'Tinh xá Kỳ Viên', 'Thành Câu Thi Na'], 'phat'],
  ['Bài pháp đầu tiên của Đức Phật nói về điều gì?', 'Tứ Diệu Đế', ['Kinh Pháp Hoa', 'Kinh A Di Đà', 'Kinh Kim Cang'], 'phat'],
  ['Đức Phật nhập Niết Bàn tại đâu?', 'Câu Thi Na (Kushinagar)', ['Bồ Đề Đạo Tràng', 'Lâm Tỳ Ni', 'Vương Xá'], 'phat'],
  ['Vị đệ tử làm thị giả của Đức Phật, nổi tiếng "đa văn" (nghe nhiều nhớ nhiều) là ai?', 'Tôn giả A Nan', ['Tôn giả Xá Lợi Phất', 'Tôn giả Ca Diếp', 'Tôn giả La Hầu La'], 'phat'],
  ['Tam Bảo gồm những gì?', 'Phật, Pháp, Tăng', ['Giới, Định, Tuệ', 'Văn, Tư, Tu', 'Thân, Khẩu, Ý'], 'chung'],
  ['"Tam độc" trong đạo Phật là gì?', 'Tham, sân, si', ['Sinh, lão, bệnh', 'Giới, định, tuệ', 'Từ, bi, hỷ'], 'chung'],
  ['Giới thứ nhất trong Ngũ giới là gì?', 'Không sát sinh', ['Không uống rượu', 'Không nói dối', 'Không trộm cắp'], 'chung'],
  ['Bát Chánh Đạo có bao nhiêu chi (phần)?', '8', ['4', '6', '10'], 'chung'],
  ['"Tứ vô lượng tâm" gồm những tâm nào?', 'Từ, bi, hỷ, xả', ['Tham, sân, si, mạn', 'Giới, định, tuệ, giải thoát', 'Tín, tấn, niệm, định'], 'chung'],
  ['Hạnh đứng đầu trong Lục độ (sáu ba-la-mật) là gì?', 'Bố thí', ['Nhẫn nhục', 'Thiền định', 'Trí tuệ'], 'chung'],
  ['Bài kinh ngắn có câu "sắc tức thị không, không tức thị sắc" là kinh gì?', 'Bát Nhã Tâm Kinh', ['Kinh Vu Lan', 'Kinh Phổ Môn', 'Kinh Địa Tạng'], 'chung'],
  ['Lễ Phật Đản (ngày Đức Phật đản sinh) ở Việt Nam vào ngày nào âm lịch?', 'Rằm tháng Tư', ['Rằm tháng Giêng', 'Rằm tháng Bảy', 'Mùng 8 tháng Chạp'], 'le'],
  ['Lễ Vu Lan báo hiếu diễn ra vào ngày nào âm lịch?', 'Rằm tháng Bảy', ['Rằm tháng Tư', 'Rằm tháng Tám', 'Mùng 1 tháng Giêng'], 'le'],
  ['Theo truyền thống Bắc tông, ngày Đức Phật thành đạo là ngày nào âm lịch?', 'Mùng 8 tháng Chạp', ['Rằm tháng Tư', 'Mùng 8 tháng Hai', 'Rằm tháng Mười'], 'le'],
  ['Tam Thế Phật là chư Phật của ba đời nào?', 'Quá khứ, hiện tại, vị lai', ['Sáng, trưa, tối', 'Trời, đất, người', 'Thân, khẩu, ý'], 'phat'],
  ['Phật Di Lặc là vị Phật của thời nào?', 'Tương lai (vị lai)', ['Quá khứ', 'Hiện tại', 'Thời Đức Phật Thích Ca'], 'dilac'],
  ['Hình tượng Phật Di Lặc bụng lớn, miệng cười thường gợi điều gì?', 'Hoan hỷ, bao dung', ['Giận dữ, uy nghiêm', 'Buồn bã', 'Nghiêm khắc trừng phạt'], 'dilac'],
  ['Cõi Tây Phương Cực Lạc là cõi của Đức Phật nào?', 'Phật A Di Đà', ['Phật Dược Sư', 'Phật Di Lặc', 'Phật Thích Ca'], 'phat'],
  ['Đức Phật Dược Sư giáo hóa ở cõi nào?', 'Đông Phương Tịnh Lưu Ly', ['Tây Phương Cực Lạc', 'Cung trời Đâu Suất', 'Núi Linh Thứu'], 'phat'],
  ['Bồ Tát Quán Thế Âm tượng trưng cho điều gì?', 'Lòng từ bi cứu khổ', ['Trí tuệ', 'Đại hạnh', 'Đại nguyện cứu địa ngục'], 'quanam'],
  ['Bồ Tát Quán Thế Âm thường cầm bình gì?', 'Bình cam lồ (nước tịnh)', ['Bình rượu', 'Bình hoa mai', 'Bình dầu'], 'quanam'],
  ['Vị Bồ Tát tượng trưng cho trí tuệ, thường cưỡi sư tử xanh là ai?', 'Bồ Tát Văn Thù', ['Bồ Tát Phổ Hiền', 'Bồ Tát Địa Tạng', 'Bồ Tát Quán Thế Âm'], 'chung'],
  ['Hoa sen trong đạo Phật tượng trưng cho điều gì?', 'Sự thanh tịnh, vươn lên từ bùn lầy', ['Sự giàu sang', 'Quyền lực', 'Sức mạnh võ thuật'], 'sen'],
  ['Câu ca dao nào nói về hoa sen?', '"Gần bùn mà chẳng hôi tanh mùi bùn"', ['"Uống nước nhớ nguồn"', '"Ăn quả nhớ kẻ trồng cây"', '"Có công mài sắt có ngày nên kim"'], 'sen'],
  ['Tòa ngồi của chư Phật thường có hình gì?', 'Hoa sen', ['Hoa cúc', 'Hoa mai', 'Hoa đào'], 'sen'],
  ['Hình ảnh cá chép vượt Vũ Môn hóa rồng tượng trưng cho điều gì?', 'Sự kiên trì vượt khó', ['Sự lười biếng', 'May rủi', 'Sự giận dữ'], 'ca'],
  ['Phóng sinh cá, chim là thực hành hạnh nào?', 'Từ bi, tôn trọng sự sống', ['Cầu tài lộc', 'Trang trí cho đẹp', 'Thử may mắn'], 'ca'],
  ['Thiền phái Trúc Lâm Yên Tử do ai sáng lập?', 'Vua Trần Nhân Tông', ['Vua Lý Thái Tổ', 'Vua Lý Thái Tông', 'Vua Lê Thánh Tông'], 'vn'],
  ['Chùa Một Cột (Diên Hựu) được dựng năm 1049 dưới triều vua nào?', 'Vua Lý Thái Tông', ['Vua Lý Thái Tổ', 'Vua Trần Nhân Tông', 'Vua Lê Lợi'], 'vn'],
  ['Hai vị hộ pháp đứng canh cửa chùa miền Bắc thường được gọi là gì?', 'Khuyến Thiện và Trừng Ác', ['Thiện Tài và Long Nữ', 'Ông Thiện và Ông Hiền', 'Tiêu Diện và Hộ Pháp'], 'hophap'],
  ['Khi vào chánh điện, Phật tử nên làm gì?', 'Đi nhẹ, nói khẽ, chắp tay cung kính', ['Nói to cho vui', 'Chạy nhảy', 'Ăn uống trước bàn thờ'], 'le'],
  ['Chắp hai bàn tay trước ngực khi chào trong chùa thể hiện điều gì?', 'Sự cung kính, nhất tâm', ['Đang lạnh tay', 'Đang cầu xin tiền bạc', 'Muốn ra về'], 'le'],
  ['Đi kinh hành quanh tháp, tượng Phật theo truyền thống đi theo chiều nào?', 'Theo chiều kim đồng hồ (vai phải hướng vào tượng)', ['Ngược chiều kim đồng hồ', 'Đi thẳng rồi quay lại', 'Đi tùy ý'], 'le'],
  ['"Bố thí pháp" nghĩa là gì?', 'Chia sẻ giáo lý, điều hay lẽ phải cho người khác', ['Cho tiền', 'Cho quần áo', 'Cho thức ăn'], 'chung'],
  ['Ngày rằm và mùng một, nhiều Phật tử thường làm gì?', 'Đi chùa, ăn chay, tụng kinh', ['Đi săn bắn', 'Tổ chức tiệc rượu', 'Nghỉ không làm gì'], 'le'],
  ['"Nam mô" trong câu "Nam mô A Di Đà Phật" có nghĩa là gì?', 'Quy y, kính lễ', ['Xin chào', 'Tạm biệt', 'Cảm ơn'], 'chung'],
  ['Sư tử đá, nghê đá đặt trước cửa chùa có ý nghĩa gì?', 'Canh giữ, trấn giữ nơi tôn nghiêm', ['Để trẻ con trèo chơi', 'Để buộc ngựa', 'Để đánh dấu đường đi'], 'hophap'],
];
const TOPIC = (name) => /Hồ sen/i.test(name) ? 'sen' : /cá/i.test(name) ? 'ca' : /Di Lặc/i.test(name) ? 'dilac' : /Quán Thế Âm|Quan Âm/i.test(name) ? 'quanam' : /Tượng Phật|Phật/i.test(name) ? 'phat' : null;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function initQuiz({ P, save, el, toast, A, addBeads, me, getW, getTemple, TEMPLES, isBusy }) {
  const seen = {}; let card = null, cur = null, lastAt = 0, recent = [];
  P.quiz = Object.assign({ ok: 0, n: 0 }, P.quiz || {});
  function templeQ() {   // câu hỏi về chính ngôi chùa đang đứng
    const real = (x) => x.place && x.id !== 'binh-an', t = getTemple(); if (!t || !real(t)) return null;
    const others = shuffle(TEMPLES.filter(x => real(x) && x.place !== t.place).map(x => x.place)).slice(0, 3); if (others.length < 3) return null;
    return [`Chùa ${t.name.replace(/^Chùa\s+/i, '')} nằm ở đâu?`, t.place, others, 'vn'];
  }
  function pickQ(spot) {
    const tp = TOPIC(spot.name); let pool = BANK.filter(q => !recent.includes(q[0]));
    if (Math.random() < 0.2) { const tq = templeQ(); if (tq && !recent.includes(tq[0])) return tq; }
    const th = tp ? pool.filter(q => q[3] === tp) : []; if (th.length && Math.random() < 0.8) pool = th;
    const q = pool[Math.random() * pool.length | 0] || BANK[0]; recent.push(q[0]); if (recent.length > 18) recent.shift(); return q;
  }
  function close() { if (card) card.remove(); card = null; cur = null; }
  function show(spot) {
    const q = pickQ(spot); cur = spot; lastAt = Date.now(); seen[getTemple().id + spot.name] = Date.now();
    if (!card) { card = el('div', 'quizc'); document.body.append(card); }
    card.innerHTML = '';
    const hd = el('div', 'qz-h'); hd.append(el('b', '', `❓ ${spot.name}`), el('small', '', 'Trả lời đúng +15 hạt'));
    const x = el('button', 'qz-x', '✕'); x.onclick = close; hd.append(x);
    const opts = el('div', 'qz-o');
    shuffle([q[1], ...q[2]]).forEach(o => { const b = el('button', 'qz-b', o); b.onclick = () => {
      if (card.classList.contains('done')) return; card.classList.add('done'); P.quiz.n++;
      [...opts.children].forEach(c => { if (c.textContent === q[1]) c.classList.add('ok'); });
      if (o === q[1]) { P.quiz.ok++; window.dispatchEvent(new CustomEvent('cba-ev', { detail: 'quiz' })); addBeads(15); A.khanh && A.khanh(); toast('✅ Chính xác! +15 hạt'); }
      else { b.classList.add('bad'); toast('🙏 Chưa đúng — đáp án đã được tô xanh'); }
      save(); setTimeout(() => { if (cur === spot) close(); }, 4200);
    }; opts.append(b); });
    card.append(hd, el('p', 'qz-q', q[0]), opts);
  }
  function step() {
    const W = getW(); if (!W || !W.quizSpots || !me.pos) return;
    if (cur) { if (Math.hypot(me.pos.x - cur.x, me.pos.z - cur.z) > cur.r + 7) close(); return; }
    if (Date.now() - lastAt < 40000 || me.seated || (isBusy && isBusy())) return;
    const tid = getTemple().id;
    for (const s of W.quizSpots) {
      if (Math.hypot(me.pos.x - s.x, me.pos.z - s.z) > s.r) continue;
      if (Date.now() - (seen[tid + s.name] || 0) < 8 * 60000) continue;
      show(s); break;
    }
  }
  return { step, close };
}
