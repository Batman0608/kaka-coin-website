/* =========================================================================
 *  XIN QUẺ KINH DỊCH ở cổng chùa — thầy đồ ngồi chiếu, bàn thấp, gieo 3 đồng xu.
 *  Dữ liệu quẻ, chủ đề và cách luận lấy từ dự án "Tử Vi Phát Đạt — BEAR DEV"
 *  (https://github.com/khanhdevngu/xemtuvionline-bear), giấy phép MIT:
 *    Copyright (c) 2026 Kent Juno · Copyright (c) 2026 BEAR DEV (modifications)
 *  Bản quyền & giấy phép đầy đủ: assets/xinque/LICENSE.
 *  Đã chỉnh cho game chùa: bỏ phần mốc quà TikTok, thêm lời nhắc nhà Phật.
 * ========================================================================= */
export const TOPICS = [
    { id: 'tinh_duyen', label: 'Tình Duyên', icon: '💕', words: ['tinh duyen', 'tinh cam', 'nguoi yeu', 'vo chong', 'hon nhan', 'crush', 'duyen', 'ny', 'yeu', 'chia tay', 'quay lai'] },
    { id: 'tai_loc',    label: 'Tài Lộc',    icon: '💰', words: ['tai loc', 'tien bac', 'loc', 'kinh doanh', 'buon ban', 'lam an', 'dau tu', 'tien', 'no nan', 'giau', 'mua ban'] },
    { id: 'su_nghiep',  label: 'Sự Nghiệp',  icon: '📈', words: ['su nghiep', 'cong viec', 'cong danh', 'thi cu', 'hoc tap', 'thang tien', 'viec lam', 'xin viec', 'chuyen viec'] },
    { id: 'gia_dao',    label: 'Gia Đạo',    icon: '🏡', words: ['gia dao', 'gia dinh', 'con cai', 'nha cua', 'cha me', 'anh em', 'xay nha', 'dat dai'] },
    { id: 'suc_khoe',   label: 'Sức Khỏe',   icon: '🌿', words: ['suc khoe', 'benh', 'cau an', 'binh an', 'tho', 'om dau', 'tai qua'] },
    { id: 'tong_quan',  label: 'Vận Mệnh',   icon: '☯',  words: ['van menh', 'tong quan', 'tu vi', 'gieo que', 'xin que', 'xem que', 'que'] },
  ];

export const HEXAGRAMS = [
    {
      num: 1, name: 'Thuần Càn', rank: 'Thượng Thượng Cát', changed: 'Thiên Phong Cấu',
      lines: [1, 1, 1, 1, 1, 1],
      verse: 'Rồng bay trên chín tầng mây, thời vận hanh thông vạn sự thành.',
      topics: {
        tinh_duyen: 'Nhân duyên sáng rõ, đôi bên tâm đầu ý hợp, người độc thân dễ gặp lương duyên cao quý.',
        tai_loc: 'Tài lộc vượng phát như rồng gặp mây, mưu sự lớn ắt thu về lộc dày.',
        su_nghiep: 'Công danh thăng tiến mạnh mẽ, được cấp trên trọng dụng, mở ra cơ hội dẫn đầu.',
        gia_dao: 'Gia môn hưng thịnh, trên dưới thuận hòa, đón tin vui từ người thân.',
        suc_khoe: 'Tinh thần sung mãn, dương khí dồi dào, bệnh tật tiêu trừ.',
        tong_quan: 'Nguyên hanh lợi trinh, vạn sự khởi đầu đều thuận buồm xuôi gió.',
      },
      advice: 'Giữ tâm khiêm cung giữa lúc thịnh vượng thì phúc lộc bền lâu.',
      lucky: { time: 'Tháng âm lịch tới & giờ Thìn, Ngọ', noble: 'Người tuổi Thìn, Thân, Tý', dir: 'Hướng Đông Nam · Màu Vàng Kim, Đỏ' }
    },
    {
      num: 14, name: 'Hỏa Thiên Đại Hữu', rank: 'Đại Cát Vượng Tài', changed: 'Hỏa Phong Đỉnh',
      lines: [1, 1, 1, 1, 0, 1],
      verse: 'Mặt trời tỏa sáng giữa trời cao, phúc lộc đầy nhà vạn điều may.',
      topics: {
        tinh_duyen: 'Tình cảm nồng ấm, chân thành gắn kết, nhân duyên đơm hoa kết trái.',
        tai_loc: 'Đại hữu là có nhiều lộc lớn, tiền tài tụ về từ nhiều nguồn thuận lợi.',
        su_nghiep: 'Uy tín vang xa, hợp tác làm ăn gặp người đồng tâm hiệp lực.',
        gia_dao: 'Trong ấm ngoài êm, gia đình sung túc, con cháu hiếu thuận.',
        suc_khoe: 'Khí huyết lưu thông, thân tâm an lạc, gặp thầy gặp thuốc.',
        tong_quan: 'Thời vận đang độ rực rỡ, cầu tài đắc tài, cầu lộc đắc lộc.',
      },
      advice: 'Biết sẻ chia phước báu và hành thiện tích đức sẽ giữ được đại lộc.',
      lucky: { time: 'Trong 15 ngày tới & giờ Tỵ, Ngọ', noble: 'Người tuổi Ngọ, Dần, Tuất', dir: 'Hướng Nam · Màu Đỏ Son, Cam Vàng' }
    },
    {
      num: 11, name: 'Địa Thiên Thái', rank: 'Thượng Cát · Hanh Thông', changed: 'Địa Trạch Lâm',
      lines: [1, 1, 1, 0, 0, 0],
      verse: 'Trời đất giao hòa muôn vật sinh sôi, tiểu vãng đại lai phúc lộc về.',
      topics: {
        tinh_duyen: 'Đôi lứa hòa hợp như đất với trời, hiểu lầm hóa giải, tình duyên bền chặt.',
        tai_loc: 'Bế tắc đã qua, vận may tài chính mở rộng, buôn may bán đắt.',
        su_nghiep: 'Mọi kế hoạch đang ấp ủ đều gặp thiên thời địa lợi nhân hòa.',
        gia_dao: 'Gia đạo bình an, tiếng cười ngập tràn, đón hỷ sự trong nhà.',
        suc_khoe: 'Âm dương cân bằng, cơ thể hồi phục nhanh chóng.',
        tong_quan: 'Cái nhỏ đi qua, cái lớn đang tới, vận trình chuyển mình rực rỡ.',
      },
      advice: 'Nắm bắt thời cơ ngay khi vận mở, chớ chần chừ bỏ lỡ cơ duyên.',
      lucky: { time: 'Đầu tháng âm lịch & giờ Mão, Thìn', noble: 'Người tuổi Sửu, Mùi, Thìn', dir: 'Hướng Đông Bắc · Màu Vàng Đất, Xanh Ngọc' }
    },
    {
      num: 22, name: 'Sơn Hỏa Bí', rank: 'Bình Hòa · Cát Tường', changed: 'Địa Hỏa Minh Di',
      lines: [1, 0, 1, 0, 0, 1],
      verse: 'Ánh lửa soi sáng chân núi, văn vẻ rạng ngời, việc nhỏ hanh thông.',
      topics: {
        tinh_duyen: 'Duyên lành đến từ sự chân thành, đừng chỉ nhìn vẻ hào nhoáng bên ngoài.',
        tai_loc: 'Lộc đến đều đặn, thích hợp củng cố nền tảng hơn là mạo hiểm lớn.',
        su_nghiep: 'Danh tiếng và tài năng được ghi nhận, thuận lợi cho giấy tờ, thi cử.',
        gia_dao: 'Nhà cửa trang hoàng ấm cúng, gia đình hòa thuận yên vui.',
        suc_khoe: 'Chú ý nghỉ ngơi điều độ, giữ tâm thanh tịnh tránh lo âu.',
        tong_quan: 'Quẻ chủ về sự tốt đẹp, sáng sủa, làm việc có kế hoạch ắt thành.',
      },
      advice: 'Lấy sự chân thật làm gốc, văn chất hài hòa thì phúc tự tìm đến.',
      lucky: { time: 'Cuối tuần này & giờ Dần, Ngọ', noble: 'Người tuổi Dần, Ngọ, Hợi', dir: 'Hướng Đông · Màu Trắng Kem, Đỏ Đô' }
    },
    {
      num: 15, name: 'Địa Sơn Khiêm', rank: 'Lục Hào Giai Cát', changed: 'Địa Hỏa Minh Di',
      lines: [0, 0, 1, 0, 0, 0],
      verse: 'Núi cao ẩn mình trong lòng đất, người khiêm nhường ắt được trời ban phúc.',
      topics: {
        tinh_duyen: 'Nhường nhịn và thấu hiểu giúp tình yêu vượt qua mọi thử thách, kết thành đôi.',
        tai_loc: 'Tài lộc tích tụ bền vững, càng khiêm tốn làm ăn càng thu lợi lớn.',
        su_nghiep: 'Được lòng cả cấp trên lẫn đồng nghiệp, quý nhân âm thầm nâng đỡ.',
        gia_dao: 'Gia phong lễ nghĩa, phúc đức tổ tiên che chở cho cả nhà.',
        suc_khoe: 'Bình an vô sự, tâm an thì vạn bệnh lùi xa.',
        tong_quan: 'Trong 64 quẻ Kinh Dịch, chỉ duy nhất quẻ Khiêm cả 6 hào đều tốt lành.',
      },
      advice: 'Lùi một bước biển rộng trời cao, mềm mỏng ắt thắng cứng rắn.',
      lucky: { time: 'Mọi khung giờ hoàng đạo trong tháng', noble: 'Người lớn tuổi trong gia đình', dir: 'Hướng Tây Nam · Màu Nâu Vàng, Trắng' }
    },
    {
      num: 31, name: 'Trạch Sơn Hàm', rank: 'Đại Cát Nhân Duyên', changed: 'Trạch Hỏa Cách',
      lines: [0, 0, 1, 1, 1, 0],
      verse: 'Núi đầm giao cảm, tâm linh tương thông, hữu duyên thiên lý năng tương ngộ.',
      topics: {
        tinh_duyen: 'Quẻ thượng cát về tình duyên! Đôi bên rung động chân thành, sớm có tin vui cưới hỏi hoặc tỏ tình.',
        tai_loc: 'Hợp tác ăn ý sinh tài lộc, khách hàng quý mến tìm đến.',
        su_nghiep: 'Giao tiếp thuận lợi, ký kết hợp đồng hay thương thảo đều suôn sẻ.',
        gia_dao: 'Vợ chồng đồng lòng, gia đình gắn kết yêu thương.',
        suc_khoe: 'Tâm trạng phấn chấn, tinh thần vui vẻ giúp cơ thể khỏe khoắn.',
        tong_quan: 'Vạn vật cảm ứng bằng chữ Tâm, cầu duyên đắc duyên, cầu hợp tác ắt thành.',
      },
      advice: 'Mở lòng đón nhận thiện ý, lắng nghe trực giác mách bảo.',
      lucky: { time: 'Rằm & mùng 1 âm lịch, giờ Dậu, Tuất', noble: 'Người khác giới tuổi Dậu, Sửu', dir: 'Hướng Tây · Màu Hồng Sen, Vàng Ánh Kim' }
    },
    {
      num: 50, name: 'Hỏa Phong Đỉnh', rank: 'Thượng Cát · Đổi Mới', changed: 'Hỏa Thiên Đại Hữu',
      lines: [0, 1, 1, 1, 0, 1],
      verse: 'Vạc vàng luyện ngọc, rũ bỏ cái cũ đón vận mới huy hoàng.',
      topics: {
        tinh_duyen: 'Mối quan hệ bước sang trang mới vững chắc, chín chắn và sâu sắc hơn.',
        tai_loc: 'Đầu tư đúng hướng, tài lộc chín muồi, thu hoạch thành quả xứng đáng.',
        su_nghiep: 'Vững vàng như chân vạc, khẳng định vị thế và bản lĩnh vững chắc.',
        gia_dao: 'Gia đình sung túc, bếp lửa luôn ấm, đón thêm tài sản mới.',
        suc_khoe: 'Bồi bổ đúng cách giúp sức khỏe dồi dào, tràn đầy sinh lực.',
        tong_quan: 'Cơ hội chuyển mình lên tầm cao mới, quý nhân trao quyền trợ lực.',
      },
      advice: 'Giữ chữ Tín và sự kiên định như vạc đồng ba chân thì đại sự tất thành.',
      lucky: { time: 'Tháng tới & giờ Tỵ, Mùi', noble: 'Người tuổi Mão, Ngọ, Mùi', dir: 'Hướng Nam · Màu Đỏ, Xanh Lá' }
    },
    {
      num: 42, name: 'Phong Lôi Ích', rank: 'Thượng Cát · Tăng Phúc', changed: 'Phong Hỏa Gia Nhân',
      lines: [1, 0, 0, 0, 1, 1],
      verse: 'Gió sấm tương trợ, mưa thuận gió hòa, làm một hưởng mười.',
      topics: {
        tinh_duyen: 'Tình cảm ngày càng gắn bó, đôi bên cùng nâng đỡ nhau tiến bộ.',
        tai_loc: 'Quẻ Ích chủ về thêm lộc thêm tài, lợi nhuận gia tăng vượt kỳ vọng.',
        su_nghiep: 'Thời cơ bứt phá đã điểm, mạnh dạn khởi sự hoặc mở rộng quy mô.',
        gia_dao: 'Thêm người thêm của, phúc khí tràn đầy trong gia quyến.',
        suc_khoe: 'Sức khỏe chuyển biến tích cực, tinh thần minh mẫn.',
        tong_quan: 'Thiên thời đang ủng hộ, tiến hành việc lớn hay nhỏ đều có lợi.',
      },
      advice: 'Thấy việc thiện nên làm ngay, thấy điều chưa chuẩn kịp thời sửa đổi.',
      lucky: { time: 'Trong 10 ngày tới & giờ Mão, Thìn', noble: 'Người tuổi Thìn, Tỵ, Dần', dir: 'Hướng Đông · Màu Xanh Ngọc, Vàng' }
    },
  ];

export function castHexagram(topicId = 'tong_quan', tierId = 'khai_loc', seed = 0){
    const idx = Math.floor(Math.abs(seed || (Date.now() + Math.random() * 1000))) % HEXAGRAMS.length;
    const h = HEXAGRAMS[idx];
    const moving = 1 + (Math.floor(Math.abs(seed * 7 || Date.now())) % 6);
    const coins = [0, 1, 2].map(() => (Math.random() < 0.58 ? 1 : 0));
    const tpKey = h.topics[topicId] ? topicId : 'tong_quan';
    const topicObj = TOPICS.find(x => x.id === tpKey) || TOPICS[5];
    const mainText = h.topics[tpKey];
    let fullReading = `Quẻ số ${h.num}: ${h.name} (${h.rank}). ${h.verse} Về ${topicObj.label.toLowerCase()}: ${mainText}`;
    if (tierId !== 'khai_loc') {
      fullReading += ` Hào động tại hào ${moving}, biến sang quẻ ${h.changed}. Lời khuyên: ${h.advice}`;
    }
    if (tierId === 'thien_loc' || tierId === 'long_phuong' || tierId === 'thien_menh') {
      fullReading += ` Thời điểm thuận lợi: ${h.lucky.time}.`;
    }
    if (tierId === 'long_phuong' || tierId === 'thien_menh') {
      fullReading += ` Quý nhân phù trợ: ${h.lucky.noble}. Hướng và màu hợp: ${h.lucky.dir}.`;
    }
    return {
      num: h.num,
      name: h.name,
      rank: h.rank,
      changed: h.changed,
      lines: h.lines,
      moving,
      coins,
      verse: h.verse,
      topicId: tpKey,
      topicLabel: topicObj.label,
      mainText,
      advice: h.advice,
      lucky: h.lucky,
      fullReading,
    };
  }


/* lời nhắc nhà Phật kèm mỗi quẻ: quẻ chỉ để tham khảo, phúc họa do tâm & việc lành */
export const DHARMA = [
  'Quẻ chỉ là tấm gương soi lòng; phúc họa do tâm, do việc mình làm mỗi ngày.',
  'Tâm thiện sinh phúc, gieo nhân lành ắt gặt quả lành.',
  'Đừng cầu điều may bên ngoài, hãy giữ giới, làm lành, tâm sẽ an.',
  'Nghiệp do mình tạo, cũng do mình chuyển: sống tử tế là quẻ tốt nhất.',
  'Biết đủ thì vui, biết nhường thì yên, biết thương thì phúc đến.'
];
