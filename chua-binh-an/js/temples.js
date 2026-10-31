/* =========================================================================
 *  HÀNH HƯƠNG CÁC CHÙA — mỗi chùa: sự tích (kể như truyện, có câu đố),
 *  câu đối, màu điện thờ, bộ tượng, bài niệm riêng, âm điệu riêng, thư mục
 *  âm thanh riêng (audio/<id>/ — đặt mp3 vào đó để chùa phát bài riêng).
 *  Nội dung tóm lược theo tư liệu lịch sử và truyền thuyết phổ biến.
 * ========================================================================= */
window.CBA = window.CBA || {};

/* Bài niệm riêng của các chùa */
Object.assign(CBA.texts, {
  niemQuanAm: [
    'Nam Mô Đại Từ Đại Bi Cứu Khổ Cứu Nạn',
    'Quảng Đại Linh Cảm Quán Thế Âm Bồ Tát',
    'Nam Mô Đại Từ Đại Bi Cứu Khổ Cứu Nạn',
    'Quảng Đại Linh Cảm Quán Thế Âm Bồ Tát',
    'Án Ma Ni Bát Di Hồng',
    'Án Ma Ni Bát Di Hồng',
    'Nguyện cho chúng sanh tai qua nạn khỏi',
    'Thân tâm an lạc, gia đạo bình an'
  ],
  trucLam: [
    'Cư trần lạc đạo thả tùy duyên,',
    'Cơ tắc xan hề khốn tắc miên.',
    'Gia trung hữu bảo hưu tầm mịch,',
    'Đối cảnh vô tâm mạc vấn thiền.',
    '— Phật hoàng Trần Nhân Tông —',
    'Nam Mô Trúc Lâm Tam Tổ',
    'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật'
  ],
  niemDuocSu: [
    'Nam Mô Dược Sư Lưu Ly Quang Vương Phật',
    'Nam Mô Dược Sư Lưu Ly Quang Vương Phật',
    'Nam Mô Nhật Quang Biến Chiếu Bồ Tát',
    'Nam Mô Nguyệt Quang Biến Chiếu Bồ Tát',
    'Nguyện cho người bệnh mau lành',
    'Nguyện cho người khỏe thân tâm an lạc'
  ],
  niemThichCa: [
    'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
    'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
    'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
    'Nam Mô Văn Thù Sư Lợi Bồ Tát',
    'Nam Mô Phổ Hiền Bồ Tát',
    'Nam Mô Thập Phương Thường Trụ Tam Bảo'
  ]
});

CBA.regions = { bac: 'Miền Bắc', trung: 'Miền Trung', nam: 'Miền Nam' };

/* model: kiểu mô hình 3D (js/temple3d.js) · lat/lon: vị trí trên bản đồ */
CBA.temples = [
  { id: 'binh-an', name: 'Chùa Bình An', place: 'Ngôi chùa nhỏ giữa dòng live', region: 'online', home: true,
    couplet: ['慈悲喜捨', '清淨莊嚴'], theme: { pillar: '#b3261e', glow: '#ffc450', floor: '#a85a22' },
    buddhaSet: 'hoanh', chant: 'tamTheNiem', tone: { root: 73.42, scale: [293.66, 329.63, 440, 493.88, 587.33] },
    model: 'hall', intro: 'Ngôi chùa nhỏ của chúng ta — nơi Sư Ông Tâm An kể chuyện Phật mỗi ngày.' },

  /* ---------------- MIỀN BẮC ---------------- */
  { id: 'bai-dinh', name: 'Chùa Bái Đính', place: 'Gia Sinh · Gia Viễn · Ninh Bình', region: 'bac', lat: 20.276, lon: 105.866,
    couplet: ['拜頂寺', '明空國師'], theme: { pillar: '#8a2a14', glow: '#ffd36b', floor: '#6a4a2a' },
    buddhaSet: 'thu', chant: 'niemADiDa', tone: { root: 55, scale: [220, 246.94, 329.63, 369.99, 440] }, model: 'baidinh',
    intro: 'Quần thể chùa trên núi Bái Đính: chùa cổ gắn với thiền sư Nguyễn Minh Không thời Lý, và khu chùa mới rộng lớn khánh thành năm 2010.',
    facts: ['Chùa cổ thờ thiền sư Nguyễn Minh Không — Quốc sư thời Lý', 'Hành lang La Hán với 500 pho tượng đá', 'Tượng Phật Thích Ca bằng đồng nặng khoảng 100 tấn', 'Bảo tháp 13 tầng trên sườn núi'],
    legend: { title: 'Thiền sư Minh Không chữa bệnh cho vua',
      scenes: [
        'Thời Lý có thiền sư Nguyễn Minh Không, người làng Đàm Xá (Ninh Bình), giỏi y thuật, thường hái thuốc trong vùng núi Bái Đính.',
        'Truyền thuyết kể: vua Lý Thần Tông mắc bệnh lạ, mình mọc lông, gầm gừ như hổ. Ngự y cả nước bó tay.',
        'Thiền sư Minh Không được mời về kinh. Ngài đun một vạc dầu lớn, thả vào trăm cây kim, rồi dùng tay không vớt kim ra trước mặt mọi người.',
        'Ngài tắm và chữa trị cho vua, bệnh dần khỏi. Vua cảm phục, phong Ngài làm Quốc sư.',
        'Ngài trở về quê, dựng chùa trong hang núi Bái Đính. Người đời sau thờ Ngài là ông tổ nghề đúc đồng và một thầy thuốc nhân từ.'
      ],
      moral: 'Người tu hành lấy việc chữa lành cho đời làm hạnh nguyện.',
      quiz: { q: 'Thiền sư Minh Không chữa bệnh cho vị vua nào?', options: ['Lý Thần Tông', 'Trần Thái Tông', 'Lê Lợi'], answer: 0 } } },

  { id: 'mot-cot', name: 'Chùa Một Cột', place: 'Ba Đình · Hà Nội', region: 'bac', lat: 21.036, lon: 105.834, year: 1049,
    couplet: ['蓮花臺', '延祐寺'], theme: { pillar: '#9c2a1a', glow: '#ffd98a', floor: '#8a5a2a' },
    buddhaSet: 'hoanh', chant: 'niemQuanAm', tone: { root: 82.41, scale: [329.63, 369.99, 493.88, 554.37, 659.25] }, model: 'motcot',
    intro: 'Ngôi chùa hình đóa sen trên một cột đá giữa hồ vuông, dựng năm 1049 đời vua Lý Thái Tông, thờ Quán Thế Âm Bồ Tát.',
    facts: ['Tên chữ: Diên Hựu tự — "phúc lành dài lâu"', 'Đài sen vuông đặt trên một cột đá giữa hồ', 'Năm 1954 bị phá hủy, năm 1955 được dựng lại theo kiến trúc cũ', 'Biểu tượng văn hóa của Hà Nội'],
    legendStory: 'vn03' },

  { id: 'huong', name: 'Chùa Hương', place: 'Hương Sơn · Mỹ Đức · Hà Nội', region: 'bac', lat: 20.617, lon: 105.747,
    couplet: ['香跡洞', '南天第一'], theme: { pillar: '#7a2f3a', glow: '#ffd0e0', floor: '#7a5a3a' },
    buddhaSet: 'hoanh', chant: 'niemQuanAm', tone: { root: 87.31, scale: [349.23, 392, 523.25, 587.33, 698.46] }, model: 'huong',
    intro: 'Quần thể chùa – động giữa núi rừng Hương Sơn; trẩy hội từ mùng 6 tháng Giêng, đi thuyền trên suối Yến.',
    facts: ['Động Hương Tích được khắc 5 chữ "Nam Thiên Đệ Nhất Động" (1770)', 'Đi thuyền từ bến Đục theo suối Yến', 'Chùa Thiên Trù — "bếp nhà trời"', 'Lễ hội lớn nhất mùa xuân miền Bắc'],
    legend: { title: 'Nam Thiên Đệ Nhất Động',
      scenes: [
        'Truyền thuyết kể rằng công chúa Diệu Thiện đã về núi Hương Tích tu hành, rồi thành Bồ Tát Quán Thế Âm. Vì vậy chùa Hương là nơi người Việt về lễ Phật Bà.',
        'Đường vào chùa bắt đầu từ bến Đục, ngồi thuyền xuôi dòng suối Yến quanh co giữa núi non, hai bên là ruộng lúa và hoa súng.',
        'Dọc đường có chùa Thiên Trù — tương truyền là "bếp nhà trời" — và nhiều đền, động nhỏ, mỗi nơi một sự tích.',
        'Đỉnh của hành trình là động Hương Tích. Năm 1770, chúa Trịnh Sâm đến thăm, cảm phục cảnh đẹp, cho khắc năm chữ "Nam Thiên Đệ Nhất Động" ở cửa động.',
        'Mỗi mùa xuân, hàng vạn người trẩy hội, chào nhau bằng câu "Nam Mô A Di Đà Phật" suốt dọc đường lên núi.'
      ],
      moral: 'Đường lên chùa xa mà lòng người vẫn đến — vì tâm đã hướng thiện.',
      quiz: { q: 'Năm chữ khắc ở cửa động Hương Tích là gì?', options: ['Thiên hạ thái bình', 'Nam Thiên Đệ Nhất Động', 'Quốc thái dân an'], answer: 1 } } },

  { id: 'yen-tu', name: 'Yên Tử · Chùa Đồng', place: 'Uông Bí · Quảng Ninh', region: 'bac', lat: 21.159, lon: 106.719,
    couplet: ['竹林禪', '安子山'], theme: { pillar: '#5a3a1a', glow: '#e8f0c0', floor: '#5a4a2a' },
    buddhaSet: 'hoanh', chant: 'trucLam', tone: { root: 61.74, scale: [246.94, 277.18, 369.99, 415.3, 493.88] }, model: 'yentu',
    intro: 'Đất tổ Thiền phái Trúc Lâm. Chùa Đồng nằm trên đỉnh núi cao hơn một nghìn mét, quanh năm mây phủ.',
    facts: ['Nơi Phật hoàng Trần Nhân Tông tu hành và lập Thiền phái Trúc Lâm', 'Chùa Đồng trên đỉnh cao khoảng 1.068 mét, đúc bằng đồng', 'Vườn tháp Huệ Quang lưu giữ xá lợi các vị tổ', 'Rừng trúc, tùng cổ thụ dọc đường hành hương'],
    legend: { title: 'Suối Giải Oan',
      scenes: [
        'Năm 1299, Thái thượng hoàng Trần Nhân Tông rời kinh thành, lên núi Yên Tử tu hành.',
        'Truyền thuyết kể: nhiều cung nữ thương nhớ, theo lên núi khẩn cầu Ngài trở về. Ngài khuyên họ quay về, vì chí tu đã quyết.',
        'Các cung nữ tuyệt vọng, gieo mình xuống dòng suối dưới chân núi. Phật hoàng vô cùng thương xót.',
        'Ngài cho lập đàn cầu siêu và dựng chùa bên suối để giải oan cho các nàng. Dòng suối từ đó gọi là suối Giải Oan.',
        'Ngày nay người hành hương lên Yên Tử thường dừng chân ở chùa Giải Oan, rửa mặt bên suối như gột bỏ phiền muộn trước khi leo tiếp lên chùa Đồng.'
      ],
      moral: 'Lòng từ bi không bỏ rơi ai — kể cả những người đã khuất.',
      quiz: { q: 'Ai đã lên núi Yên Tử tu hành và lập Thiền phái Trúc Lâm?', options: ['Lý Công Uẩn', 'Trần Nhân Tông', 'Lê Thánh Tông'], answer: 1 } } },

  /* ---------------- MIỀN TRUNG ---------------- */
  { id: 'thien-mu', name: 'Chùa Thiên Mụ', place: 'Đồi Hà Khê · bờ sông Hương · Huế', region: 'trung', lat: 16.454, lon: 107.545, year: 1601,
    couplet: ['天姥寺', '香江'], theme: { pillar: '#6a1f3a', glow: '#f0d0ff', floor: '#6a4a3a' },
    buddhaSet: 'hoanh', chant: 'batNha', tone: { root: 77.78, scale: [311.13, 349.23, 466.16, 523.25, 622.25] }, model: 'thienmu',
    intro: 'Ngôi chùa cổ bên bờ sông Hương, dựng năm 1601 đời chúa Nguyễn Hoàng, có tháp Phước Duyên bảy tầng.',
    facts: ['Tháp Phước Duyên 7 tầng, hình bát giác, dựng năm 1844', 'Đại hồng chung đúc năm 1710', '"Tiếng chuông Thiên Mụ, canh gà Thọ Xương"', 'Biểu tượng của cố đô Huế'],
    legend: { title: 'Bà lão trên đồi Hà Khê',
      scenes: [
        'Người dân Huế kể rằng: xưa kia trên đồi Hà Khê bên sông Hương, đêm đêm có một bà lão mặc áo đỏ quần lục hiện ra.',
        'Bà nói với mọi người: "Rồi đây sẽ có vị chân chúa đến dựng chùa ở chỗ này, để tụ linh khí, giữ vững long mạch." Nói xong bà biến mất.',
        'Năm 1601, chúa Nguyễn Hoàng đi xem địa thế, nghe dân kể chuyện, liền cho dựng chùa trên đồi, đặt tên là Thiên Mụ — "bà lão nhà trời".',
        'Năm 1710, chúa Nguyễn Phúc Chu cho đúc một quả đại hồng chung. Năm 1844, vua Thiệu Trị dựng tháp Phước Duyên bảy tầng.',
        'Tiếng chuông Thiên Mụ vang trên sông Hương đã đi vào câu ca: "Gió đưa cành trúc la đà, tiếng chuông Thiên Mụ canh gà Thọ Xương."'
      ],
      moral: 'Một ngôi chùa có thể trở thành linh hồn của cả một vùng đất.',
      quiz: { q: 'Tháp Phước Duyên ở chùa Thiên Mụ có mấy tầng?', options: ['Năm', 'Bảy', 'Chín'], answer: 1 } } },

  { id: 'linh-ung', name: 'Chùa Linh Ứng Bãi Bụt', place: 'Bán đảo Sơn Trà · Đà Nẵng', region: 'trung', lat: 16.1, lon: 108.278,
    couplet: ['靈應寺', '觀音'], theme: { pillar: '#2a4a6a', glow: '#d0f0ff', floor: '#6a6a5a' },
    buddhaSet: 'hoanh', chant: 'niemQuanAm', tone: { root: 92.5, scale: [369.99, 415.3, 554.37, 622.25, 739.99] }, model: 'linhung',
    intro: 'Ngôi chùa hướng ra biển trên bán đảo Sơn Trà, có tượng Quán Thế Âm cao 67 mét dang tay che chở ngư dân.',
    facts: ['Tượng Quán Thế Âm cao 67 mét, đứng trên tòa sen', 'Tượng nhìn ra biển Đông, che chở người đi biển', 'Nằm giữa rừng nguyên sinh Sơn Trà', 'Chùa xây dựng đầu thế kỷ 21'],
    legend: { title: 'Phật Bà nhìn ra biển',
      scenes: [
        'Bán đảo Sơn Trà có một bãi biển nhỏ mà người dân gọi là Bãi Bụt. Tương truyền ngư dân từng thấy tượng Phật trôi dạt vào bờ nơi đây.',
        'Người dân cho đó là điềm lành, lập am nhỏ thờ phụng. Từ đó những chuyến ra khơi đều được bình yên trở về.',
        'Đầu thế kỷ 21, chùa Linh Ứng được xây dựng khang trang ở nơi này, nhìn thẳng ra biển Đông.',
        'Giữa sân chùa sừng sững tượng Quán Thế Âm Bồ Tát cao 67 mét, đứng trên tòa sen, mặt hướng ra biển như che chở cho người đi biển.',
        'Mỗi khi có bão, người dân miền biển lại hướng về Bãi Bụt, niệm danh hiệu Quán Thế Âm cầu cho tàu thuyền bình an.'
      ],
      moral: 'Lòng từ của Bồ Tát như biển rộng, ai gọi cũng được lắng nghe.',
      quiz: { q: 'Tượng Quán Thế Âm ở chùa Linh Ứng Bãi Bụt hướng về đâu?', options: ['Về núi', 'Ra biển', 'Về thành phố'], answer: 1 } } },

  { id: 'long-son', name: 'Chùa Long Sơn', place: 'Đồi Trại Thủy · Nha Trang · Khánh Hòa', region: 'trung', lat: 12.25, lon: 109.18, year: 1886,
    couplet: ['龍山寺', '金身佛祖'], theme: { pillar: '#8a3a1a', glow: '#fff4d0', floor: '#7a6a4a' },
    buddhaSet: 'hoanh', chant: 'niemThichCa', tone: { root: 65.41, scale: [261.63, 293.66, 392, 440, 523.25] }, model: 'longson',
    intro: 'Ngôi chùa dưới chân đồi Trại Thủy, nổi tiếng với tượng Kim Thân Phật Tổ trắng ngồi trên đỉnh đồi nhìn xuống thành phố biển.',
    facts: ['Dựng năm 1886, ban đầu tên Đăng Long tự', 'Tượng Kim Thân Phật Tổ cao 24 mét (tính cả tòa sen), khánh thành năm 1964', 'Hơn 150 bậc đá dẫn lên đỉnh đồi', 'Tòa sen khắc chân dung các vị tăng ni vị pháp thiêu thân năm 1963'],
    legend: { title: 'Kim Thân Phật Tổ trên đồi Trại Thủy',
      scenes: [
        'Năm 1886, hòa thượng Thích Ngộ Chí dựng một ngôi chùa nhỏ trên đồi Trại Thủy ở Nha Trang, đặt tên là Đăng Long tự.',
        'Năm 1900, một trận bão lớn làm chùa sụp đổ. Chùa được dựng lại ở chân đồi, đổi tên là Long Sơn — "núi rồng".',
        'Năm 1963, nhiều vị tăng ni đã thiêu thân để bảo vệ đạo pháp. Để tưởng niệm, Phật tử khắp nơi góp sức tạc một pho tượng lớn trên đỉnh đồi.',
        'Năm 1964, tượng Kim Thân Phật Tổ hoàn thành: Đức Phật ngồi kiết già trên tòa sen, toàn thân trắng, cao 24 mét. Quanh tòa sen là chân dung các vị đã vị pháp thiêu thân.',
        'Người hành hương leo hơn 150 bậc đá, qua tượng Phật nằm, để lên đỉnh đồi chiêm bái và ngắm toàn cảnh Nha Trang.'
      ],
      moral: 'Mỗi bậc đá là một bước tinh tấn; lên tới đỉnh, lòng tự rộng mở.',
      quiz: { q: 'Tên ban đầu của chùa Long Sơn là gì?', options: ['Đăng Long tự', 'Thiên Mụ tự', 'Diên Hựu tự'], answer: 0 } } },

  /* ---------------- MIỀN NAM ---------------- */
  { id: 'vinh-nghiem', name: 'Chùa Vĩnh Nghiêm', place: 'Quận 3 · TP. Hồ Chí Minh', region: 'nam', lat: 10.79, lon: 106.683, year: 1964,
    couplet: ['永嚴寺', '竹林'], theme: { pillar: '#8a2a1a', glow: '#ffe0a0', floor: '#7a5a3a' },
    buddhaSet: 'hoanh', chant: 'hoiHuong', tone: { root: 73.42, scale: [293.66, 349.23, 392, 440, 523.25] }, model: 'vinhnghiem',
    intro: 'Ngôi chùa lớn giữa Sài Gòn, dựng theo mẫu tổ đình Vĩnh Nghiêm ở Bắc Giang — nơi lưu giữ kho mộc bản kinh Phật quý.',
    facts: ['Khởi công năm 1964, hoàn thành năm 1971', 'Tháp Quán Âm 7 tầng', 'Mang tên tổ đình Vĩnh Nghiêm (Bắc Giang) của Thiền phái Trúc Lâm', 'Mộc bản tổ đình là Di sản tư liệu UNESCO khu vực (2012)'],
    legend: { title: 'Từ tổ đình Bắc Giang vào Sài Gòn',
      scenes: [
        'Ở Bắc Giang có chùa Vĩnh Nghiêm cổ kính, từng là trung tâm của Thiền phái Trúc Lâm thời Trần, nơi các vị tổ truyền dạy và in kinh.',
        'Chùa còn giữ hàng nghìn tấm mộc bản khắc kinh Phật bằng chữ Hán và chữ Nôm. Năm 2012, kho mộc bản được UNESCO công nhận là Di sản tư liệu khu vực châu Á – Thái Bình Dương.',
        'Năm 1964, các vị hòa thượng từ miền Bắc vào Nam đã khởi công dựng một ngôi chùa mới ở Sài Gòn, lấy tên tổ đình là Vĩnh Nghiêm để nhớ cội nguồn.',
        'Chùa có ngôi tháp Quán Âm bảy tầng và quả chuông lớn, trở thành nơi sinh hoạt Phật giáo quen thuộc của người Sài Gòn.',
        'Từ Bắc vào Nam, ngọn đèn Trúc Lâm vẫn được giữ — như lời nhắc: đi đâu cũng đừng quên nguồn cội.'
      ],
      moral: 'Uống nước nhớ nguồn — đi xa vẫn giữ cội gốc.',
      quiz: { q: 'Kho mộc bản ở tổ đình Vĩnh Nghiêm (Bắc Giang) được UNESCO công nhận năm nào?', options: ['2002', '2012', '2022'], answer: 1 } } },

  { id: 'giac-lam', name: 'Chùa Giác Lâm', place: 'Tân Bình · TP. Hồ Chí Minh', region: 'nam', lat: 10.777, lon: 106.652, year: 1744,
    couplet: ['覺林寺', '古剎'], theme: { pillar: '#7a2a14', glow: '#ffe6b0', floor: '#6a4a2a' },
    buddhaSet: 'hoanh', chant: 'niemADiDa', tone: { root: 58.27, scale: [233.08, 261.63, 349.23, 392, 466.16] }, model: 'giaclam',
    intro: 'Một trong những ngôi chùa cổ nhất vùng Sài Gòn – Gia Định, dựng năm 1744, lưu giữ hơn trăm pho tượng gỗ quý.',
    facts: ['Dựng năm 1744 trên gò Cẩm Sơn', 'Lưu giữ hơn 100 pho tượng gỗ cổ', 'Cây Bồ Đề trong sân chiết từ Sri Lanka', 'Bảo tháp xá lợi 7 tầng'],
    legend: { title: 'Rừng giác ngộ trên gò Cẩm Sơn',
      scenes: [
        'Năm 1744, khi vùng đất Gia Định còn hoang sơ, ông Lý Thụy Long — một cư sĩ mộ đạo — bỏ tiền dựng một ngôi chùa nhỏ trên gò đất cao gọi là gò Cẩm Sơn.',
        'Ban đầu chùa có tên Sơn Can, rồi Cẩm Sơn. Về sau, chùa mang tên Giác Lâm — nghĩa là "rừng giác ngộ".',
        'Qua nhiều đời trụ trì, chùa trở thành nơi đào tạo tăng tài, lưu giữ hơn trăm pho tượng gỗ chạm khắc tinh xảo của người Nam Bộ xưa.',
        'Giữa thế kỷ 20, một cây Bồ Đề chiết từ Sri Lanka được trồng trong sân chùa, nối dài mạch nguồn từ nơi Đức Phật thành đạo.',
        'Hơn hai trăm năm mưa nắng, mái chùa rêu phong vẫn giữ được vẻ trầm mặc giữa lòng thành phố ồn ào.'
      ],
      moral: 'Giữa phố thị ồn ào, vẫn có thể giữ cho mình một khu rừng tĩnh lặng trong tâm.',
      quiz: { q: '"Giác Lâm" nghĩa là gì?', options: ['Rừng giác ngộ', 'Núi vàng', 'Sông thiêng'], answer: 0 } } },

  { id: 'doi', name: 'Chùa Dơi (Mahatup)', place: 'Phường 3 · Sóc Trăng', region: 'nam', lat: 9.589, lon: 105.978,
    couplet: ['南宗寺', '蝙蝠'], theme: { pillar: '#b37a14', glow: '#fff0a0', floor: '#7a5a2a' },
    buddhaSet: 'hoanh', chant: 'niemThichCa', tone: { root: 69.3, scale: [277.18, 311.13, 415.3, 466.16, 554.37] }, model: 'khmer',
    intro: 'Ngôi chùa Phật giáo Nam tông Khmer hơn 400 năm tuổi, nơi hàng nghìn con dơi treo mình trên những cây cổ thụ trong khuôn viên.',
    facts: ['Chùa Phật giáo Nam tông Khmer, mái cong nhiều tầng rực rỡ', 'Hàng nghìn con dơi ngựa sống trên cây trong chùa', 'Dơi bay đi ăn xa ban đêm, không ăn trái cây trong vườn chùa', 'Có tượng heo năm móng gắn với tích xưa của chùa'],
    legend: { title: 'Đàn dơi giữ chùa',
      scenes: [
        'Ở Sóc Trăng có ngôi chùa Khmer tên Mahatup, đã hơn bốn trăm năm tuổi. Người Việt quen gọi là chùa Dơi.',
        'Trên những cây sao, cây dầu cổ thụ trong khuôn viên, hàng nghìn con dơi ngựa treo mình lủng lẳng như những trái cây đen suốt cả ban ngày.',
        'Chiều tối, đàn dơi bay đi kiếm ăn ở những vườn cây xa, sáng sớm lại trở về. Người dân kể rằng chúng không bao giờ ăn trái cây trong vườn chùa.',
        'Người Khmer tin rằng đàn dơi là những vị hộ pháp giữ chùa, sống hiền hòa cùng các vị sư suốt nhiều thế hệ.',
        'Mái chùa nhiều tầng, đầu rắn thần Naga cong vút, sắc vàng đỏ rực rỡ — vẻ đẹp đặc trưng của Phật giáo Nam tông Khmer ở miền Tây Nam Bộ.'
      ],
      moral: 'Nơi nào có lòng từ, muôn loài tự tìm về nương náu.',
      quiz: { q: 'Đàn dơi ở chùa Mahatup không làm điều gì?', options: ['Bay đi kiếm ăn ban đêm', 'Ăn trái cây trong vườn chùa', 'Treo mình trên cây'], answer: 1 } } }
];

/* Biến sự tích các chùa thành truyện để kể như các truyện khác */
CBA.storySeries.push({ id: 'chua', name: 'Sự Tích Các Chùa', icon: '🏯', title: 'Hành Giả Hành Hương' });
CBA.temples.forEach(t => {
  if (t.legend) CBA.stories.push(Object.assign({ id: 'chua_' + t.id, series: 'chua', temple: t.id }, t.legend));
});
