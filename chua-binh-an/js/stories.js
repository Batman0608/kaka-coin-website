/* =========================================================================
 *  KHO TRUYỆN PHẬT GIÁO — "HÀNH TRÌNH THEO DẤU CHÂN PHẬT"
 *  Lời văn tự soạn, tóm lược theo kinh sách và truyền thuyết phổ biến.
 *  Mỗi truyện: các cảnh (scenes) hiện lần lượt trên màn hình, một lời dạy
 *  (moral) và một câu đố (quiz: đáp án đúng là chỉ số 0/1/2 → A/B/C).
 *  Có thể thêm truyện mới theo đúng cấu trúc này.
 * ========================================================================= */
window.CBA = window.CBA || {};

CBA.storySeries = [
  { id: 'cuocdoi',  name: 'Cuộc Đời Đức Phật',      icon: '☸', title: 'Người Theo Dấu Chân Phật', main: true },
  { id: 'tamthe',   name: 'Tam Thế Phật & Bồ Tát',  icon: '🪷', title: 'Đệ Tử Tam Thế Phật' },
  { id: 'dede',     name: 'Chuyện Các Vị Đệ Tử',    icon: '📿', title: 'Bạn Lành Của Tăng Đoàn' },
  { id: 'bonsanh',  name: 'Truyện Tiền Thân (Bổn Sanh)', icon: '🦌', title: 'Hạnh Nguyện Bồ Tát' },
  { id: 'vietnam',  name: 'Phật Giáo Việt Nam',      icon: '🏯', title: 'Người Giữ Hồn Thiền Việt' },
  { id: 'vulan',    name: 'Hiếu Hạnh Vu Lan',        icon: '🌹', title: 'Hiếu Tử Vu Lan' }
];

CBA.stories = [
  /* ======================= CUỘC ĐỜI ĐỨC PHẬT (12 chương, kể theo ngày) ======================= */
  { id: 'cd01', series: 'cuocdoi', title: 'Giấc mộng voi trắng',
    scenes: [
      'Hơn 2.600 năm trước, dưới chân dãy Hy Mã Lạp Sơn có thành Ca Tỳ La Vệ, do vua Tịnh Phạn trị vì cùng hoàng hậu Ma Da hiền đức.',
      'Hai vị đã lớn tuổi mà chưa có con nối dõi. Một đêm trăng tròn, hoàng hậu nằm mộng thấy một con voi trắng sáu ngà, từ trời cao nhẹ nhàng đi vào bên hông phải của bà.',
      'Sáng ra, các vị đạo sĩ được mời vào cung giải mộng. Họ đồng thanh tâu: "Hoàng hậu sẽ sinh một hoàng tử phi thường."',
      '"Nếu ở ngôi vua, người sẽ là vị Chuyển Luân Thánh Vương trị vì thiên hạ. Nếu xuất gia, người sẽ thành bậc Giác Ngộ, cứu độ muôn loài."',
      'Cả kinh thành hân hoan. Hoàng hậu từ đó giữ tâm thanh tịnh, ăn chay, làm lành, chờ ngày đứa con đặc biệt chào đời.'
    ],
    moral: 'Một tâm thanh tịnh, một đời sống hiền lành là món quà đẹp nhất cha mẹ dành cho con.',
    quiz: { q: 'Hoàng hậu Ma Da nằm mộng thấy con vật gì?', options: ['Voi trắng sáu ngà', 'Rồng vàng', 'Sư tử xanh'], answer: 0 } },

  { id: 'cd02', series: 'cuocdoi', title: 'Đản sanh dưới cây Vô Ưu',
    scenes: [
      'Theo phong tục, hoàng hậu Ma Da về quê mẹ để sinh con. Đi ngang vườn Lâm Tỳ Ni đang mùa hoa nở, bà dừng chân nghỉ dưới tán cây Vô Ưu.',
      'Khi bà đưa tay vịn cành hoa, thái tử chào đời. Kinh sách kể: Ngài bước đi bảy bước, mỗi bước một đóa sen nở đỡ chân.',
      'Thái tử được đặt tên là Tất Đạt Đa — nghĩa là "người thành tựu mọi ước nguyện". Mùa Phật Đản rằm tháng Tư là để tưởng nhớ ngày ấy.',
      'Đạo sĩ A Tư Đà từ núi xuống thăm, vừa nhìn thái tử đã mỉm cười rồi bật khóc: "Ta mừng vì đời có bậc Giác Ngộ, nhưng buồn vì ta đã già, không kịp nghe Ngài thuyết pháp."',
      'Bảy ngày sau, hoàng hậu Ma Da qua đời. Người dì là bà Ma Ha Ba Xà Ba Đề đã thương yêu nuôi nấng thái tử như con ruột.'
    ],
    moral: 'Tình thương của người nuôi dưỡng cũng thiêng liêng như tình mẫu tử.',
    quiz: { q: 'Thái tử Tất Đạt Đa đản sanh ở đâu?', options: ['Thành Vương Xá', 'Vườn Lâm Tỳ Ni', 'Vườn Lộc Uyển'], answer: 1 } },

  { id: 'cd03', series: 'cuocdoi', title: 'Con thiên nga bị thương',
    scenes: [
      'Thái tử lớn lên thông minh, giỏi văn võ nhưng có trái tim rất mềm. Trong lễ cày ruộng đầu năm, Ngài thấy lưỡi cày lật lên con sâu, con chim sà xuống bắt sâu, rồi chim lớn lại vồ chim nhỏ.',
      'Thái tử lặng người: "Vì sao muôn loài phải ăn nhau mà sống?" Ngài ngồi dưới gốc cây, lòng lắng sâu — đó là lần đầu tiên Ngài nhập định.',
      'Một hôm, người em họ Đề Bà Đạt Đa giương cung bắn rơi một con thiên nga. Thái tử chạy đến trước, nhẹ nhàng rút mũi tên, băng bó vết thương cho nó.',
      'Đề Bà Đạt Đa đòi lại: "Con chim của tôi, tôi bắn được!" Thái tử không chịu. Hai người đưa nhau đến hội đồng các bậc trưởng lão.',
      'Vị trưởng lão phán: "Sự sống thuộc về người cứu sống nó, không thuộc về người muốn giết nó." Con thiên nga được chữa lành và bay về trời.'
    ],
    moral: 'Sự sống thuộc về người biết trân quý và che chở nó.',
    quiz: { q: 'Theo phán quyết, con thiên nga thuộc về ai?', options: ['Người bắn trúng nó', 'Nhà vua', 'Người cứu sống nó'], answer: 2 } },

  { id: 'cd04', series: 'cuocdoi', title: 'Bốn cửa thành',
    scenes: [
      'Vua Tịnh Phạn sợ con xuất gia nên xây cung điện cho ba mùa, cưới công chúa Da Du Đà La cho thái tử, và ra lệnh giấu hết những cảnh buồn khổ.',
      'Nhưng thái tử muốn biết đời sống thật. Cùng người đánh xe Xa Nặc, lần đầu ra cửa Đông, Ngài gặp một cụ già tóc bạc, lưng còng, chống gậy run rẩy.',
      'Ra cửa Nam, Ngài gặp người bệnh nằm rên xiết bên đường. Ra cửa Tây, Ngài thấy một đám tang, người thân khóc than thảm thiết.',
      '"Xa Nặc, ta cũng sẽ già, bệnh, chết như thế sao?" — "Thưa thái tử, không ai tránh khỏi." Lòng Ngài nặng trĩu.',
      'Ra cửa Bắc, Ngài gặp một vị sa môn áo vàng, gương mặt an nhiên giữa cuộc đời biến đổi. Một hạt giống đã nảy mầm: tìm con đường thoát khổ cho muôn người.'
    ],
    moral: 'Thấy rõ khổ đau không phải để buồn chán, mà để tìm ra con đường chuyển hóa.',
    quiz: { q: 'Ra cửa Bắc, thái tử gặp ai?', options: ['Một cụ già', 'Một vị sa môn', 'Một người bệnh'], answer: 1 } },

  { id: 'cd05', series: 'cuocdoi', title: 'Đêm vượt thành xuất gia',
    scenes: [
      'Giữa lúc ấy, công chúa Da Du Đà La sinh một bé trai, đặt tên là La Hầu La. Thái tử thương con vô cùng, nhưng biết rằng nếu nán lại, tình thương riêng sẽ giữ chân Ngài mãi.',
      'Nửa đêm, Ngài đứng ở cửa phòng nhìn vợ con say ngủ thật lâu. Ngài không đánh thức ai, chỉ thầm hứa: "Khi tìm ra đạo, ta sẽ trở về."',
      'Xa Nặc dắt con ngựa trắng Kiền Trắc. Tương truyền chư thiên đỡ vó ngựa cho khỏi kêu, và cửa thành tự mở.',
      'Đến bờ sông A Nô Ma, thái tử cắt mái tóc, trao lại áo mão ngọc ngà cho Xa Nặc mang về, khoác lên mình tấm áo vải thô của người tu.',
      'Kinh sách Nam truyền chép năm ấy Ngài 29 tuổi. Từ đây, thái tử Tất Đạt Đa trở thành vị sa môn Cồ Đàm, một mình bước vào rừng sâu tìm chân lý.'
    ],
    moral: 'Tình thương lớn đôi khi đòi hỏi buông bỏ tình thương nhỏ.',
    quiz: { q: 'Tên con ngựa thái tử cưỡi đêm xuất gia là gì?', options: ['Kiền Trắc', 'Xích Thố', 'Bạch Long'], answer: 0 } },

  { id: 'cd06', series: 'cuocdoi', title: 'Sáu năm khổ hạnh và bát sữa',
    scenes: [
      'Sa môn Cồ Đàm theo học các bậc thầy nổi tiếng, chứng được những tầng thiền rất cao, nhưng vẫn thấy chưa thoát được sinh tử.',
      'Ngài vào rừng Khổ Hạnh cùng năm anh em Kiều Trần Như, nhịn ăn mỗi ngày chỉ một hạt mè, một hạt gạo. Thân thể gầy đến mức da bọc xương.',
      'Một hôm nghe người thầy dạy đàn nói với trò: "Dây chùng quá thì không kêu, căng quá thì đứt, vừa phải mới thành tiếng hay." Ngài chợt hiểu ra con đường Trung Đạo.',
      'Ngài xuống sông tắm và nhận bát sữa của cô gái chăn bò tên Tu Xà Đề. Sức khỏe hồi phục, đôi mắt sáng lại.',
      'Năm anh em Kiều Trần Như tưởng Ngài thối chí nên bỏ đi. Ngài không giải thích, lặng lẽ đến gốc cây Tất Bát La bên bờ sông Ni Liên Thiền.'
    ],
    moral: 'Tu không phải hành hạ thân, cũng không buông thả thân — mà là con đường ở giữa.',
    quiz: { q: 'Bài học từ tiếng đàn dẫn Ngài đến con đường nào?', options: ['Khổ hạnh', 'Trung Đạo', 'Hưởng lạc'], answer: 1 } },

  { id: 'cd07', series: 'cuocdoi', title: 'Thành đạo dưới cội Bồ Đề',
    scenes: [
      'Ngài trải nắm cỏ làm tòa ngồi và phát nguyện: "Nếu không thành đạo, dù thịt nát xương tan ta cũng không rời chỗ này."',
      'Ma vương Ba Tuần kéo quân đến: gió bão, mưa tên, rồi sai các ma nữ xinh đẹp đến quyến rũ. Tâm Ngài vẫn bất động như núi.',
      'Ma vương hỏi: "Ai làm chứng cho ngươi xứng ngồi tòa này?" Ngài nhẹ đưa tay phải chạm đất. Mặt đất rung chuyển làm chứng, quân ma tan biến.',
      'Trải qua đêm thiền định sâu, Ngài thấy rõ các đời trước, thấy nghiệp quả của chúng sanh, thấu suốt gốc rễ của khổ đau.',
      'Khi sao Mai vừa mọc, Ngài hoát nhiên đại ngộ, thành bậc Chánh Đẳng Chánh Giác — Đức Phật Thích Ca Mâu Ni. Ngày ấy được nhớ là mùng 8 tháng Chạp. Cây Tất Bát La từ đó gọi là cây Bồ Đề.'
    ],
    moral: 'Ma lớn nhất không ở bên ngoài, mà là tham, sân, si trong chính tâm mình.',
    quiz: { q: 'Đức Phật chạm tay xuống đâu để làm chứng khi ma vương chất vấn?', options: ['Lên trời', 'Xuống mặt đất', 'Vào cây Bồ Đề'], answer: 1 } },

  { id: 'cd08', series: 'cuocdoi', title: 'Lần đầu chuyển bánh xe pháp',
    scenes: [
      'Sau khi thành đạo, Đức Phật nghĩ đến năm anh em Kiều Trần Như. Ngài đi bộ hàng trăm dặm đến vườn Lộc Uyển để tìm họ.',
      'Năm người hẹn nhau sẽ không đứng dậy chào. Nhưng khi Ngài đến gần, vẻ uy nghiêm an tịnh khiến họ tự nhiên đứng lên đón, trải tòa mời ngồi.',
      'Ngài giảng Tứ Diệu Đế: Đời có khổ. Khổ có nguyên nhân. Khổ có thể diệt. Và có con đường diệt khổ — Bát Chánh Đạo.',
      'Ngài Kiều Trần Như hiểu ra đầu tiên. Rồi cả năm vị xin xuất gia, trở thành những vị Tăng đầu tiên.',
      'Từ đây Tam Bảo đầy đủ: Phật là bậc giác ngộ, Pháp là lời dạy, Tăng là đoàn thể tu theo. Sự kiện này gọi là "Chuyển Pháp Luân" — lần đầu xoay bánh xe chánh pháp.'
    ],
    moral: 'Người thầy tốt tìm đến học trò, không đợi học trò tìm đến mình.',
    quiz: { q: 'Bài pháp đầu tiên Đức Phật giảng là gì?', options: ['Kinh A Di Đà', 'Tứ Diệu Đế', 'Kinh Pháp Hoa'], answer: 1 } },

  { id: 'cd09', series: 'cuocdoi', title: 'Gia tài của La Hầu La',
    scenes: [
      'Nghe tin con đã thành đạo, vua Tịnh Phạn mời Đức Phật về thăm. Ngài trở về Ca Tỳ La Vệ như đã hứa năm xưa — nhưng với bình bát của người khất thực.',
      'Vua cha buồn vì con trai mình đi xin ăn. Đức Phật nhẹ nhàng nói: "Thưa phụ vương, đây là truyền thống của chư Phật." Rồi Ngài giảng pháp, vua cha hoan hỷ.',
      'Công chúa Da Du Đà La bảo bé La Hầu La bảy tuổi: "Con hãy đến xin cha gia tài của con."',
      'Cậu bé chạy theo Đức Phật: "Thưa cha, xin cha cho con gia tài." Đức Phật mỉm cười: "Ta sẽ cho con thứ gia tài không bao giờ mất."',
      'Ngài cho La Hầu La xuất gia, trở thành vị sa di đầu tiên. Về sau La Hầu La nổi tiếng là người giữ giới nhỏ nhiệm nhất trong Tăng đoàn.'
    ],
    moral: 'Gia tài quý nhất cha mẹ để lại cho con là đạo đức và trí tuệ.',
    quiz: { q: 'Đức Phật trao cho La Hầu La "gia tài" gì?', options: ['Vàng bạc châu báu', 'Ngai vàng', 'Con đường tu tập'], answer: 2 } },

  { id: 'cd10', series: 'cuocdoi', title: 'Con voi say Nalagiri',
    scenes: [
      'Đề Bà Đạt Đa — người em họ năm xưa bắn thiên nga — sinh lòng ganh ghét, muốn thay Đức Phật lãnh đạo Tăng đoàn.',
      'Ông xúi người quản tượng cho con voi dữ Nalagiri uống rượu say, rồi thả ra con đường Đức Phật đang đi khất thực.',
      'Voi say lồng lên, phá nhà, người dân chạy tán loạn. Một người mẹ hoảng hốt đánh rơi đứa con nhỏ ngay giữa đường.',
      'Đức Phật bước ra trước mặt con voi, lòng tràn đầy từ bi. Con voi khựng lại, hạ vòi, rồi quỳ xuống trước Ngài.',
      'Ngài xoa đầu nó, nói lời hiền dịu. Voi hiền như cừu non, quay về chuồng. Người dân hiểu rằng lòng từ mạnh hơn mọi sức mạnh.'
    ],
    moral: 'Từ bi hàng phục được cả sự hung dữ mà vũ lực không làm được.',
    quiz: { q: 'Đức Phật hàng phục voi say bằng gì?', options: ['Thần thông', 'Lòng từ bi', 'Gậy sắt'], answer: 1 } },

  { id: 'cd11', series: 'cuocdoi', title: 'Ni đoàn đầu tiên',
    scenes: [
      'Sau khi vua Tịnh Phạn qua đời, bà Ma Ha Ba Xà Ba Đề — người dì đã nuôi Đức Phật — cùng nhiều phụ nữ dòng Thích Ca muốn xuất gia.',
      'Lần đầu xin, Đức Phật chưa chấp thuận. Các bà tự cạo tóc, mặc áo vàng, đi bộ đường xa theo Ngài, chân sưng rướm máu.',
      'Ngài A Nan thấy vậy rất xúc động, vào bạch Phật: "Bạch Thế Tôn, nữ giới tu tập có chứng được đạo quả không?" — "Này A Nan, có thể chứng được."',
      'Đức Phật chấp thuận, với những giới luật giúp Ni đoàn được bảo vệ và hòa hợp. Bà Ma Ha Ba Xà Ba Đề trở thành vị Tỳ kheo Ni đầu tiên.',
      'Từ đó cánh cửa giải thoát mở rộng cho mọi người, không phân biệt nam nữ, giàu nghèo hay giai cấp.'
    ],
    moral: 'Ai cũng có Phật tánh, ai cũng có thể giác ngộ.',
    quiz: { q: 'Vị Tỳ kheo Ni đầu tiên là ai?', options: ['Bà Ma Ha Ba Xà Ba Đề', 'Công chúa Da Du Đà La', 'Cô Tu Xà Đề'], answer: 0 } },

  { id: 'cd12', series: 'cuocdoi', title: 'Ngọn đuốc cuối cùng',
    scenes: [
      'Năm 80 tuổi, Đức Phật biết đã đến lúc nhập diệt. Ngài cùng ngài A Nan đi đến thành Câu Thi Na.',
      'Bác thợ rèn Thuần Đà kính cẩn dâng bữa cúng dường cuối cùng. Sau đó Ngài lâm bệnh nặng nhưng vẫn dặn: "Đừng để Thuần Đà áy náy — bữa cơm ấy có công đức rất lớn."',
      'Giữa hai cây Sa La, Ngài nằm nghiêng bên phải. Ngài A Nan khóc. Đức Phật an ủi: "Mọi sự hợp thành đều phải tan rã. Đừng buồn."',
      'Lời dạy cuối cùng: "Các con hãy tự mình thắp đuốc lên mà đi, lấy chánh pháp làm ngọn đuốc. Hãy tinh tấn, chớ buông lung."',
      'Ngài nhập Niết Bàn trong an tịnh. Xá lợi được chia tám phần, thờ khắp nơi. Hơn 2.500 năm sau, ngọn đuốc ấy vẫn còn được truyền tay — đến tận ngôi chùa nhỏ của chúng ta hôm nay.'
    ],
    moral: 'Hãy tự thắp đuốc lên mà đi — không ai tu thay được cho mình.',
    quiz: { q: 'Đức Phật nhập Niết Bàn giữa hai cây gì?', options: ['Cây Bồ Đề', 'Cây Vô Ưu', 'Cây Sa La'], answer: 2 } },

  /* ======================= TAM THẾ PHẬT & BỒ TÁT ======================= */
  { id: 'tt01', series: 'tamthe', title: 'Phật Nhiên Đăng thọ ký',
    scenes: [
      'Tam Thế Phật nhắc ta rằng chư Phật có mặt trong cả quá khứ, hiện tại và vị lai. Câu chuyện này kể về một kiếp rất xa xưa của Đức Thích Ca.',
      'Thuở ấy có vị Phật tên Nhiên Đăng — nghĩa là "ngọn đèn sáng". Một thanh niên tên Thiện Huệ nghe tin Phật sắp đi qua, liền tìm mua hoa sen để cúng dường.',
      'Hoa đã bị nhà vua mua hết. Một cô gái còn giữ bảy cành sen, cảm lòng thành của chàng nên bán lại năm cành.',
      'Con đường Phật đi qua có một vũng bùn lầy. Thiện Huệ không ngần ngại xõa mái tóc dài trải lên bùn để Phật bước qua.',
      'Đức Phật Nhiên Đăng thọ ký: "Về sau, người này sẽ thành Phật hiệu là Thích Ca Mâu Ni." Một hạt giống nhỏ gieo bằng lòng thành, nhiều kiếp sau nở thành quả giác ngộ.'
    ],
    moral: 'Không có việc lành nào là nhỏ khi làm bằng cả tấm lòng.',
    quiz: { q: 'Thiện Huệ đã trải gì lên bùn cho Phật Nhiên Đăng bước qua?', options: ['Áo choàng', 'Mái tóc', 'Hoa sen'], answer: 1 } },

  { id: 'tt02', series: 'tamthe', title: '48 lời nguyện của Phật A Di Đà',
    scenes: [
      'Thuở xa xưa có một vị quốc vương nghe Phật Thế Tự Tại Vương thuyết pháp, lòng rất hoan hỷ, liền bỏ ngôi vua xuất gia, lấy hiệu là Pháp Tạng.',
      'Tỳ kheo Pháp Tạng thưa: "Con muốn tạo một cõi nước thanh tịnh, nơi chúng sanh không còn khổ đau, dễ dàng tu tập."',
      'Ngài suy tư suốt năm kiếp, rồi phát 48 đại nguyện. Trong đó có lời nguyện: ai chí thành niệm danh hiệu Ngài, Ngài sẽ đến tiếp dẫn về cõi ấy.',
      'Trải qua vô lượng kiếp tu hành, các lời nguyện đều thành tựu. Tỳ kheo Pháp Tạng thành Phật A Di Đà — "Vô Lượng Quang, Vô Lượng Thọ".',
      'Cõi nước ấy là Tây Phương Cực Lạc. Vì vậy mỗi câu "Nam Mô A Di Đà Phật" là một lần ta nhớ về ánh sáng và lời nguyện từ bi ấy.'
    ],
    moral: 'Một lời nguyện lớn có thể soi sáng cho vô lượng người.',
    quiz: { q: 'Trước khi thành Phật, Phật A Di Đà là vị tỳ kheo tên gì?', options: ['Pháp Tạng', 'Thiện Huệ', 'Mục Liên'], answer: 0 } },

  { id: 'tt03', series: 'tamthe', title: 'Ánh sáng lưu ly của Phật Dược Sư',
    scenes: [
      'Ở phương Đông có cõi Tịnh Lưu Ly, đất làm bằng ngọc lưu ly trong suốt. Giáo chủ là Đức Phật Dược Sư Lưu Ly Quang Như Lai.',
      'Khi còn tu hạnh Bồ Tát, Ngài phát 12 đại nguyện. Ngài nguyện thân mình sáng như ngọc lưu ly, soi tỏ cả những nơi tối tăm nhất.',
      'Ngài nguyện cho người bệnh tật không thuốc men, không nơi nương tựa được lành bệnh, thân tâm an lạc.',
      'Ngài nguyện cho người đói được no, người rét được ấm, người lạc đường tìm thấy lối đi đúng.',
      'Hai vị Bồ Tát Nhật Quang và Nguyệt Quang luôn ở bên Ngài, như mặt trời và mặt trăng. Vì thế người xưa hay tụng kinh Dược Sư để cầu an cho người đau ốm.'
    ],
    moral: 'Chữa lành thân bệnh đã quý, chữa lành tâm bệnh còn quý hơn.',
    quiz: { q: 'Phật Dược Sư phát bao nhiêu đại nguyện?', options: ['12', '48', '108'], answer: 0 } },

  { id: 'tt04', series: 'tamthe', title: 'Nụ cười Di Lặc',
    scenes: [
      'Theo kinh sách, Bồ Tát Di Lặc hiện đang ở cung trời Đâu Suất. Trong tương lai, Ngài sẽ hạ sanh và thành Phật dưới cây Long Hoa — vị Phật của vị lai.',
      'Ở Trung Hoa xưa có một vị hòa thượng bụng to, lúc nào cũng cười, vai mang một chiếc túi vải lớn. Người ta gọi ông là Bố Đại hòa thượng.',
      'Ông đi khắp nơi, xin gì cũng bỏ vào túi rồi lại đem cho trẻ con. Ai hỏi đạo, ông chỉ đặt túi xuống, khoanh tay đứng cười.',
      'Có người hỏi: "Đặt túi xuống là sao?" Ông đáp: "Là buông bỏ." — "Rồi sao nữa?" Ông vác túi lên vai bước đi: "Buông được rồi thì gánh việc đời mà không thấy nặng."',
      'Khi ông mất, người ta tin ông là hóa thân của Bồ Tát Di Lặc. Từ đó tượng Di Lặc thường có bụng to và nụ cười hoan hỷ.'
    ],
    moral: 'Bụng to để bao dung, miệng cười để hoan hỷ — đó là tu.',
    quiz: { q: 'Bồ Tát Di Lặc sẽ thành Phật dưới cây gì?', options: ['Cây Long Hoa', 'Cây Bồ Đề', 'Cây Sa La'], answer: 0 } },

  { id: 'tt05', series: 'tamthe', title: 'Công chúa Diệu Thiện và núi Hương Tích',
    scenes: [
      'Truyền thuyết kể: vua Diệu Trang Vương có ba người con gái. Cô út Diệu Thiện từ nhỏ đã mộ đạo, không màng ngôi báu hay hôn nhân.',
      'Vua cha giận dữ, dùng mọi cách ép buộc. Nàng vẫn một lòng xin đi tu, chịu đủ thử thách mà không oán trách.',
      'Nàng về tu ở núi Hương Tích. Nhiều năm sau, vua cha mắc bệnh nặng, thầy thuốc nói phải có tay và mắt của người không bao giờ giận mới chữa được.',
      'Diệu Thiện không chút do dự, hiến tay và mắt của mình để cứu cha. Vua khỏi bệnh, tìm đến cảm tạ thì nhận ra đó chính là con gái mình.',
      'Vua hối hận, quy y Tam Bảo. Nàng hiện thân Bồ Tát Quán Thế Âm nghìn tay nghìn mắt. Đó là lý do chùa Hương được xem là nơi Quán Âm tu hành.'
    ],
    moral: 'Lòng hiếu và lòng từ không đòi người khác phải xứng đáng mới cho đi.',
    quiz: { q: 'Công chúa Diệu Thiện tu ở núi nào theo truyền thuyết?', options: ['Yên Tử', 'Hương Tích', 'Ngũ Hành Sơn'], answer: 1 } },

  { id: 'tt06', series: 'tamthe', title: 'Lời nguyện của Bồ Tát Địa Tạng',
    scenes: [
      'Thuở xưa có một cô gái dòng Bà La Môn rất hiếu thảo. Mẹ cô lại không tin nhân quả, sống nhiều điều ác, khi mất đã rơi vào cảnh khổ.',
      'Cô bán nhà cửa, mua hương hoa cúng dường chùa tháp, ngày đêm niệm danh hiệu Phật, chỉ mong biết mẹ ở đâu.',
      'Trong lúc thiền định, cô thấy mình đến bên bờ biển nghiệp, nơi chúng sanh chịu khổ. Một vị quỷ vương cho biết: nhờ phước của người con, mẹ cô đã được sanh về cõi lành.',
      'Thấy biết bao chúng sanh khác vẫn còn khổ, cô phát nguyện: "Con nguyện cứu độ tất cả chúng sanh đang chịu khổ."',
      'Cô gái ấy là tiền thân của Bồ Tát Địa Tạng, người có lời nguyện nổi tiếng: "Địa ngục chưa trống, thề không thành Phật."'
    ],
    moral: 'Lòng hiếu với mẹ cha có thể mở rộng thành lòng thương mọi chúng sanh.',
    quiz: { q: 'Lời nguyện nổi tiếng của Bồ Tát Địa Tạng là gì?', options: ['Địa ngục chưa trống, thề không thành Phật', 'Nguyện làm vua thiên hạ', 'Nguyện sống lâu muôn tuổi'], answer: 0 } },

  /* ======================= CHUYỆN CÁC VỊ ĐỆ TỬ ======================= */
  { id: 'dt01', series: 'dede', title: 'Bài kệ bốn câu của Xá Lợi Phất',
    scenes: [
      'Xá Lợi Phất và Mục Kiền Liên là đôi bạn thân, cùng đi tìm thầy học đạo. Họ hẹn nhau: ai tìm được chân lý trước sẽ báo cho người kia.',
      'Một sáng, Xá Lợi Phất gặp tỳ kheo Mã Thắng đi khất thực, dáng đi khoan thai, mắt nhìn xuống, gương mặt an tịnh lạ thường.',
      'Ông đến xin hỏi thầy của ngài là ai, dạy điều gì. Ngài Mã Thắng khiêm tốn: "Tôi mới học, chỉ nói được ít thôi."',
      'Rồi ngài đọc: "Các pháp do duyên sinh, cũng do duyên mà diệt. Thầy tôi là bậc Đại Sa Môn, thường dạy như vậy." Nghe xong, Xá Lợi Phất bừng tỉnh.',
      'Ông chạy đi báo cho Mục Kiền Liên đúng như lời hẹn. Hai người cùng theo Phật, về sau trở thành hai đại đệ tử: Xá Lợi Phất trí tuệ bậc nhất, Mục Kiền Liên thần thông bậc nhất.'
    ],
    moral: 'Một dáng đi an tịnh có thể dạy người nhiều hơn ngàn lời giảng.',
    quiz: { q: 'Xá Lợi Phất nổi tiếng bậc nhất về điều gì?', options: ['Thần thông', 'Trí tuệ', 'Đa văn'], answer: 1 } },

  { id: 'dt02', series: 'dede', title: 'Cành hoa và nụ cười Ca Diếp',
    scenes: [
      'Trên núi Linh Thứu, đại chúng đông đủ chờ Đức Phật thuyết pháp. Nhưng hôm ấy Ngài chỉ lặng lẽ cầm một cành hoa đưa lên.',
      'Mọi người nhìn nhau, không ai hiểu Ngài muốn nói gì. Cả hội chúng im phăng phắc.',
      'Chỉ có ngài Ma Ha Ca Diếp nhìn cành hoa và mỉm cười.',
      'Đức Phật nói: "Ta có chánh pháp nhãn tạng, Niết Bàn diệu tâm, nay trao lại cho Ma Ha Ca Diếp."',
      'Thiền tông xem đây là lần truyền tâm ấn đầu tiên — "niêm hoa vi tiếu": cầm hoa, mỉm cười. Có những điều không cần lời mà tâm vẫn hiểu tâm.'
    ],
    moral: 'Hiểu nhau thật sự đôi khi chỉ cần một nụ cười.',
    quiz: { q: '"Niêm hoa vi tiếu" nghĩa là gì?', options: ['Cầm hoa, mỉm cười', 'Hái hoa dâng Phật', 'Trồng hoa trước chùa'], answer: 0 } },

  { id: 'dt03', series: 'dede', title: 'A Nan và gáo nước giữa trưa',
    scenes: [
      'Ngài A Nan là thị giả của Đức Phật suốt 25 năm, nhớ hết mọi lời Phật dạy nên được gọi là "đa văn bậc nhất".',
      'Một trưa nắng gắt, ngài khát nước, đi ngang giếng làng thấy một cô gái đang múc nước. Ngài xin cô một gáo.',
      'Cô gái lúng túng: "Thưa thầy, con thuộc giai cấp thấp hèn, không dám dâng nước cho thầy."',
      'Ngài A Nan đáp: "Này cô, tôi xin nước, không hỏi giai cấp." Cô gái rưng rưng, vì lần đầu tiên được đối xử như một con người.',
      'Sau khi Phật nhập diệt, chính ngài A Nan đọc lại các bài kinh trong kỳ kết tập. Vì thế các kinh thường mở đầu: "Tôi nghe như vầy…"'
    ],
    moral: 'Trong mắt người tu, không ai cao sang hay thấp hèn hơn ai.',
    quiz: { q: 'Các bài kinh thường mở đầu bằng câu gì nhờ ngài A Nan?', options: ['Ngày xửa ngày xưa', 'Tôi nghe như vầy', 'Nam Mô A Di Đà Phật'], answer: 1 } },

  { id: 'dt04', series: 'dede', title: 'Chiếc khăn trắng của Châu Lợi Bàn Đặc',
    scenes: [
      'Châu Lợi Bàn Đặc là vị tỳ kheo chậm hiểu nhất trong Tăng đoàn. Bốn tháng trời, ông không thuộc nổi một bài kệ bốn câu.',
      'Người anh cũng là tỳ kheo, buồn lòng bảo ông nên hoàn tục. Ông đứng khóc ngoài cổng tinh xá.',
      'Đức Phật đi ngang, dắt ông vào, trao cho một chiếc khăn trắng: "Con hãy ngồi xoa chiếc khăn này và nhẩm: trừ cấu, trừ bụi."',
      'Ông chăm chỉ làm theo. Chiếc khăn trắng dần dần ngả màu bẩn. Ông chợt nghĩ: "Khăn vốn trắng, vì tay ta mà bẩn. Tâm cũng vậy, bụi phiền não bám vào mà thôi."',
      'Từ một câu đơn giản, ông chứng quả A La Hán. Người từng chậm hiểu nhất lại được Phật khen là người khéo hóa thân nhất.'
    ],
    moral: 'Không có ai quá chậm để tu — chỉ cần một pháp hợp với mình và lòng kiên trì.',
    quiz: { q: 'Đức Phật trao cho Châu Lợi Bàn Đặc vật gì?', options: ['Chiếc khăn trắng', 'Cuốn kinh', 'Chuỗi tràng hạt'], answer: 0 } },

  { id: 'dt05', series: 'dede', title: 'Ương Quật Ma La dừng lại',
    scenes: [
      'Ương Quật Ma La vốn là học trò giỏi, nhưng bị thầy lừa rằng phải giết đủ một nghìn người mới thành tựu đạo pháp. Ông xâu ngón tay nạn nhân thành vòng đeo cổ.',
      'Khi chỉ còn thiếu một người, ông thấy chính mẹ mình đang mang cơm đi tìm con. Ngay lúc ấy Đức Phật xuất hiện trên con đường.',
      'Ương Quật Ma La đuổi theo Phật. Lạ thay, ông chạy hết sức mà không đuổi kịp người đang đi thong thả. Ông hét: "Sa môn, đứng lại!"',
      'Đức Phật quay lại: "Ta đã dừng lại từ lâu. Chính ngươi mới là người chưa dừng." Câu nói như tiếng sét. Ông quăng gươm, quỳ xuống xin xuất gia.',
      'Ông thành một vị tỳ kheo hiền lành, chịu đựng mọi lời mắng nhiếc mà không oán hận, về sau chứng đạo quả.'
    ],
    moral: 'Không ai là không thể quay đầu. Dừng lại điều ác là bắt đầu điều thiện.',
    quiz: { q: 'Đức Phật nói gì với Ương Quật Ma La?', options: ['Ta sẽ trừng phạt ngươi', 'Ta đã dừng lại, ngươi chưa dừng', 'Hãy chạy nhanh hơn'], answer: 1 } },

  { id: 'dt06', series: 'dede', title: 'Nắm hạt cải của Kisa Gotami',
    scenes: [
      'Kisa Gotami có đứa con trai duy nhất mất khi còn rất nhỏ. Quá đau khổ, cô ôm xác con đi khắp nơi xin thuốc cứu sống nó.',
      'Có người chỉ cô đến gặp Đức Phật. Ngài bảo: "Con hãy xin một nắm hạt cải ở nhà nào chưa từng có người chết. Ta sẽ làm thuốc."',
      'Cô mừng rỡ đi gõ cửa từng nhà. Nhà nào cũng sẵn lòng cho hạt cải, nhưng nhà nào cũng từng có người thân qua đời.',
      'Đến tối, cô ngồi lặng bên đường, nhìn những ngọn đèn trong làng thắp lên rồi tắt. Cô hiểu ra: sinh tử là lẽ chung của tất cả mọi người.',
      'Cô an táng con, trở lại xin xuất gia, về sau chứng đạo quả. Đức Phật không xóa nỗi đau của cô, Ngài giúp cô nhìn thấy sự thật.'
    ],
    moral: 'Hiểu được vô thường, nỗi đau không mất đi nhưng ta không còn cô đơn trong nó.',
    quiz: { q: 'Đức Phật bảo Kisa Gotami đi xin gì?', options: ['Nước cam lồ', 'Hạt cải', 'Hoa sen'], answer: 1 } },

  { id: 'dt07', series: 'dede', title: 'Ngọn đèn của bà lão nghèo',
    scenes: [
      'Một lần Đức Phật về thành Xá Vệ, nhà vua cho thắp hàng vạn ngọn đèn dầu dọc đường cúng dường.',
      'Có một bà lão nghèo cũng muốn thắp đèn. Bà đi xin cả ngày được vài đồng, mua dầu chỉ đủ cho một ngọn đèn nhỏ.',
      'Bà khấn: "Con nghèo, chỉ có ngọn đèn này. Nguyện nhờ ánh sáng nhỏ này, đời sau con được trí tuệ soi sáng cho mọi người."',
      'Đêm khuya, gió thổi, đèn của vua tắt dần. Sáng ra, chỉ còn ngọn đèn của bà lão vẫn sáng. Ngài Mục Kiền Liên đến dập mà không tắt được.',
      'Đức Phật nói: "Đèn ấy được thắp bằng tâm nguyện rộng lớn, sức thần thông cũng không dập được." Công đức không đo bằng nhiều ít, mà bằng tấm lòng.'
    ],
    moral: 'Một ngọn đèn nhỏ thắp bằng cả tấm lòng sáng hơn vạn ngọn đèn hình thức.',
    quiz: { q: 'Vì sao ngọn đèn của bà lão không tắt?', options: ['Vì có nhiều dầu', 'Vì được thắp bằng tâm nguyện lớn', 'Vì không có gió'], answer: 1 } },

  { id: 'dt08', series: 'dede', title: 'Khu vườn trải vàng',
    scenes: [
      'Trưởng giả Tu Đạt rất giàu mà hay giúp người nghèo, nên được gọi là Cấp Cô Độc — người cấp dưỡng cho kẻ cô độc.',
      'Gặp Đức Phật, ông phát tâm xây một tinh xá ở thành Xá Vệ. Ông chọn khu vườn đẹp nhất của thái tử Kỳ Đà.',
      'Thái tử nói đùa: "Nếu ông trải vàng kín mặt đất thì tôi bán." Không ngờ ông Cấp Cô Độc cho chở vàng đến trải thật.',
      'Thái tử cảm động trước tấm lòng ấy, bèn xin góp phần: "Đất là của ông, nhưng cây trong vườn là của tôi cúng dường."',
      'Tinh xá được đặt tên Kỳ Thọ Cấp Cô Độc Viên — gọi tắt là Kỳ Viên. Đức Phật đã an cư ở đây nhiều mùa mưa và giảng rất nhiều bài kinh.'
    ],
    moral: 'Lòng thành của một người có thể khơi dậy lòng thành của người khác.',
    quiz: { q: 'Ông Cấp Cô Độc mua khu vườn của ai?', options: ['Vua Tịnh Phạn', 'Thái tử Kỳ Đà', 'Vua A Dục'], answer: 1 } },

  /* ======================= TRUYỆN TIỀN THÂN (BỔN SANH) ======================= */
  { id: 'bs01', series: 'bonsanh', title: 'Chú thỏ trên mặt trăng',
    scenes: [
      'Trong một kiếp xưa, Bồ Tát là một chú thỏ trắng sống trong rừng cùng ba người bạn: khỉ, rái cá và chó rừng. Bốn bạn cùng hẹn nhau giữ giới, làm việc thiện.',
      'Một ngày có ông lão đói lả đi qua. Khỉ hái trái cây, rái cá bắt cá, chó rừng tìm được thức ăn. Còn thỏ chỉ biết ăn cỏ, không có gì để dâng.',
      'Thỏ nói: "Xin ông nhóm lửa. Tôi không có gì, xin dâng chính thân tôi."',
      'Thỏ nhảy vào đống lửa. Lạ thay, lửa mát lạnh, không làm cháy một sợi lông. Ông lão hiện nguyên hình là trời Đế Thích, đến thử lòng các bạn.',
      'Để muôn đời nhớ tấm lòng ấy, Đế Thích vẽ hình chú thỏ lên mặt trăng. Mỗi đêm rằm, nhìn trăng, ta vẫn thấy chú thỏ hiền.'
    ],
    moral: 'Cho đi những gì mình có, dù nhỏ bé, chính là bố thí chân thật.',
    quiz: { q: 'Hình con vật nào được vẽ lên mặt trăng?', options: ['Con thỏ', 'Con khỉ', 'Con rái cá'], answer: 0 } },

  { id: 'bs02', series: 'bonsanh', title: 'Vua khỉ làm cầu',
    scenes: [
      'Bồ Tát từng là vua của tám vạn con khỉ, sống trên một cây xoài lớn bên bờ sông Hằng. Quả xoài ngọt đến nỗi vua người cũng thèm muốn.',
      'Nhà vua đem quân bao vây cây xoài, chờ trời sáng sẽ bắn hết bầy khỉ. Cả đàn hoảng sợ kêu khóc.',
      'Vua khỉ buộc một sợi dây mây vào cành cây, nhảy sang bờ bên kia. Dây hơi ngắn, nó dùng chính thân mình làm đoạn cầu nối.',
      'Tám vạn con khỉ lần lượt chạy qua lưng vua mà thoát. Con cuối cùng vốn ghét vua khỉ, cố ý nhảy mạnh làm gãy lưng nó.',
      'Nhà vua chứng kiến tất cả, hối hận, cho người đỡ vua khỉ xuống. Trước khi mất, vua khỉ dạy: "Người làm vua phải thương dân như thương thân mình."'
    ],
    moral: 'Người lãnh đạo thật sự là người sẵn sàng làm cầu cho người khác bước qua.',
    quiz: { q: 'Vua khỉ đã dùng gì để làm cầu cho đàn khỉ?', options: ['Thân mình', 'Thân cây xoài', 'Đá tảng'], answer: 0 } },

  { id: 'bs03', series: 'bonsanh', title: 'Hươu chúa thay hươu mẹ',
    scenes: [
      'Bồ Tát từng là hươu chúa lông vàng, cai quản một đàn hươu lớn trong vườn của nhà vua.',
      'Vua thích ăn thịt hươu, ngày nào cũng săn. Hươu chúa xin vua: mỗi ngày đàn hươu sẽ tự đưa một con đến, để những con khác khỏi bị thương vì bị đuổi bắt.',
      'Một ngày đến lượt một con hươu mẹ đang mang thai. Nó xin lùi lượt để sinh con. Hươu chúa không nỡ bắt con khác đi thay, nên tự mình bước lên thớt.',
      'Nhà vua kinh ngạc: "Sao hươu chúa lại tự đến?" Nghe chuyện, vua xúc động: "Ta là người mà không bằng một con hươu."',
      'Vua tha cho hươu chúa, rồi tha cho cả đàn, cho cả muôn loài trong vương quốc. Vườn hươu ấy về sau chính là vườn Lộc Uyển.'
    ],
    moral: 'Một hành động hy sinh có thể đánh thức lòng từ của cả một vương quốc.',
    quiz: { q: 'Hươu chúa đã đi thay cho con hươu nào?', options: ['Hươu con', 'Hươu mẹ mang thai', 'Hươu già'], answer: 1 } },

  { id: 'bs04', series: 'bonsanh', title: 'Vua Thi Tỳ và chim bồ câu',
    scenes: [
      'Vua Thi Tỳ là vị vua nổi tiếng nhân từ, đã nguyện che chở cho mọi loài đến xin nương tựa.',
      'Một ngày, con bồ câu hoảng hốt bay vào lòng vua, phía sau là con chim ưng đuổi theo.',
      'Chim ưng nói: "Ngài cứu bồ câu thì tôi chết đói. Ngài thương nó, sao không thương tôi?"',
      'Vua lấy dao cắt thịt đùi mình đặt lên cân, nặng bằng con bồ câu để đổi. Nhưng cắt mãi vẫn không đủ, cuối cùng vua bước cả thân mình lên bàn cân.',
      'Chim ưng và bồ câu hiện nguyên hình là hai vị trời đến thử lòng. Thân vua lành lặn như cũ. Lời nguyện che chở muôn loài được trời đất chứng giám.'
    ],
    moral: 'Lòng từ chân thật không chọn bên — thương cả kẻ bị đuổi lẫn kẻ đang đói.',
    quiz: { q: 'Vua Thi Tỳ cứu con chim gì?', options: ['Chim ưng', 'Bồ câu', 'Thiên nga'], answer: 1 } },

  { id: 'bs05', series: 'bonsanh', title: 'Chú vẹt dập lửa rừng',
    scenes: [
      'Bồ Tát từng là một chú vẹt nhỏ sống trong khu rừng xanh, được muôn loài trong rừng yêu quý.',
      'Một ngày cháy rừng lớn. Chim thú chạy tán loạn. Chú vẹt bay ra sông, nhúng ướt đôi cánh, rồi bay về rảy từng giọt nước lên đám lửa.',
      'Một vị trời nhìn thấy, bật cười: "Vẹt nhỏ ơi, vài giọt nước trên cánh làm sao dập được cả khu rừng cháy?"',
      'Vẹt đáp: "Tôi biết sức tôi nhỏ. Nhưng rừng này đã cho tôi nơi ở. Tôi sẽ làm đến khi nào còn bay được."',
      'Vị trời cảm động đến rơi nước mắt. Nước mắt hóa thành cơn mưa lớn dập tắt đám cháy, cứu cả khu rừng.'
    ],
    moral: 'Đừng hỏi việc mình làm nhỏ hay lớn — hãy hỏi mình đã làm hết lòng chưa.',
    quiz: { q: 'Chú vẹt dập lửa bằng cách nào?', options: ['Gọi mưa', 'Nhúng cánh xuống sông rảy nước', 'Đào hào ngăn lửa'], answer: 1 } },

  { id: 'bs06', series: 'bonsanh', title: 'Thái tử và cọp mẹ đói',
    scenes: [
      'Trong một kiếp xưa, Bồ Tát là thái tử Tát Đỏa, con út của một vị vua. Ba anh em cùng vào rừng dạo chơi.',
      'Dưới vực sâu, họ thấy một con cọp mẹ vừa sinh bảy con, đói lả đến mức sắp ăn thịt chính con mình.',
      'Hai người anh thương xót nhưng không biết làm gì, buồn bã bỏ đi. Thái tử Tát Đỏa nán lại phía sau.',
      'Ngài nghĩ: "Thân này rồi cũng sẽ hoại diệt. Nếu dùng nó cứu được tám mạng sống, đó là điều đáng làm." Ngài xả thân cho cọp mẹ.',
      'Cọp mẹ sống, bảy cọp con được nuôi lớn. Đây là truyện tiền thân nói về hạnh bố thí cao nhất. Ngày nay ta không cần xả thân, chỉ cần không làm ngơ trước nỗi khổ của người khác.'
    ],
    moral: 'Đừng làm ngơ trước nỗi khổ của bất kỳ ai.',
    quiz: { q: 'Thái tử Tát Đỏa thấy cọp mẹ có bao nhiêu con?', options: ['Ba', 'Bảy', 'Mười'], answer: 1 } },

  /* ======================= PHẬT GIÁO VIỆT NAM ======================= */
  { id: 'vn01', series: 'vietnam', title: 'Quan Âm Thị Kính',
    scenes: [
      'Thị Kính là cô gái hiền thục, lấy chồng là Thiện Sĩ. Một đêm chồng ngủ, nàng thấy sợi râu mọc ngược, cầm dao định cắt cho chồng.',
      'Thiện Sĩ giật mình, tưởng vợ muốn hại mình. Nhà chồng đuổi nàng đi. Nàng không oan trách, giả trai vào chùa tu, lấy pháp danh Kính Tâm.',
      'Cô Thị Mầu trong làng đem lòng thương chú tiểu Kính Tâm. Bị từ chối, Thị Mầu có thai với người khác rồi đổ cho Kính Tâm.',
      'Kính Tâm chịu đòn, chịu tiếng xấu, lại còn nhận nuôi đứa bé bị bỏ trước cổng chùa, đi xin sữa từng nhà mà nuôi.',
      'Đến khi Kính Tâm mất, mọi người mới biết đó là phụ nữ. Nỗi oan được giải. Tương truyền nàng thành Phật Quan Âm Thị Kính — "oan Thị Kính" thành câu nói của người Việt.'
    ],
    moral: 'Nhẫn nhục không phải yếu đuối, mà là sức mạnh của lòng từ.',
    quiz: { q: 'Khi vào chùa, Thị Kính lấy pháp danh gì?', options: ['Kính Tâm', 'Diệu Thiện', 'Thiện Sĩ'], answer: 0 } },

  { id: 'vn02', series: 'vietnam', title: 'Phật hoàng Trần Nhân Tông',
    scenes: [
      'Vua Trần Nhân Tông cùng quân dân Đại Việt hai lần đánh thắng quân Nguyên Mông hùng mạnh, giữ vững non sông.',
      'Đánh thắng rồi, vua tha tội cho những người từng theo giặc, ra lệnh đốt hết sổ sách để mọi người yên lòng làm lại cuộc đời.',
      'Đang tuổi sung sức, vua nhường ngôi cho con, lên núi Yên Tử khoác áo nâu sồng, tu hành khổ hạnh.',
      'Ngài sáng lập Thiền phái Trúc Lâm — một dòng thiền mang tinh thần Việt: tu ngay giữa đời, giữ đạo mà vẫn thương nước, thương dân.',
      'Người đời tôn Ngài là Phật hoàng. Ngài dạy: "Cư trần lạc đạo thả tùy duyên" — sống giữa đời mà vui với đạo, tùy duyên mà an.'
    ],
    moral: 'Tu không phải trốn đời, mà là sống giữa đời với tâm an lạc.',
    quiz: { q: 'Phật hoàng Trần Nhân Tông sáng lập thiền phái nào?', options: ['Trúc Lâm', 'Lâm Tế', 'Tào Động'], answer: 0 } },

  { id: 'vn03', series: 'vietnam', title: 'Giấc mộng xây chùa Một Cột',
    scenes: [
      'Vua Lý Thái Tông tuổi đã cao mà chưa có con nối dõi. Một đêm vua nằm mộng thấy Phật Bà Quán Âm ngồi trên tòa sen, đưa tay dắt vua lên đài.',
      'Tỉnh dậy, vua kể lại cho triều thần. Có người cho là điềm không lành, nhưng thiền sư Thiền Tuệ khuyên vua dựng chùa để tạ ơn và cầu phúc cho muôn dân.',
      'Năm 1049, một ngôi chùa nhỏ được dựng trên một cột đá giữa hồ, giống hình đóa sen vươn lên từ mặt nước như trong giấc mộng.',
      'Chùa được đặt tên Diên Hựu — nghĩa là phúc lành dài lâu. Người dân quen gọi là chùa Một Cột.',
      'Gần một nghìn năm qua, chùa đã nhiều lần trùng tu, nhưng hình ảnh đóa sen giữa hồ vẫn là biểu tượng thanh tịnh của Hà Nội.'
    ],
    moral: 'Đóa sen mọc từ bùn mà không nhiễm bùn — như tâm người tu giữa đời.',
    quiz: { q: 'Chùa Một Cột còn có tên là gì?', options: ['Chùa Hương', 'Chùa Diên Hựu', 'Chùa Trấn Quốc'], answer: 1 } },

  { id: 'vn04', series: 'vietnam', title: 'Man Nương và Tứ Pháp',
    scenes: [
      'Thời xa xưa ở vùng Luy Lâu (Bắc Ninh ngày nay), có thiền sư Khâu Đà La từ phương xa đến hoằng pháp. Cô bé Man Nương theo hầu và học đạo.',
      'Truyền thuyết kể rằng một đêm Man Nương ngủ quên ở bậc cửa. Thiền sư bước qua, và từ đó nàng có thai, sinh một bé gái.',
      'Thiền sư gửi đứa bé vào một gốc cây dung bên sông. Về sau cây đổ, trôi về, người dân tạc thành bốn pho tượng.',
      'Bốn tượng được đặt tên Pháp Vân, Pháp Vũ, Pháp Lôi, Pháp Điện — Mây, Mưa, Sấm, Chớp. Năm hạn hán, dân rước tượng cầu mưa, mưa liền đổ xuống.',
      'Đó là tín ngưỡng Tứ Pháp — nơi đạo Phật hòa cùng đời sống người trồng lúa nước. Chùa Dâu được xem là một trong những trung tâm Phật giáo sớm nhất Việt Nam.'
    ],
    moral: 'Đạo Phật đi vào lòng người Việt bằng sự gần gũi với mưa nắng ruộng đồng.',
    quiz: { q: 'Tứ Pháp gồm Pháp Vân, Pháp Vũ, Pháp Lôi và…?', options: ['Pháp Điện', 'Pháp Hải', 'Pháp Sơn'], answer: 0 } },

  { id: 'vn05', series: 'vietnam', title: 'Thiền sư Vạn Hạnh và chàng Lý Công Uẩn',
    scenes: [
      'Ở chùa Cổ Pháp có một cậu bé mồ côi được nhà chùa nuôi dạy. Cậu tên là Lý Công Uẩn, thông minh, chăm học, đức độ.',
      'Thiền sư Vạn Hạnh — bậc cao tăng được kính trọng thời ấy — sớm nhận ra tài năng của cậu và hết lòng dạy dỗ.',
      'Lớn lên, Lý Công Uẩn làm quan trong triều, được lòng người vì sự chính trực và nhân hậu.',
      'Năm 1009, ông lên ngôi vua, mở ra triều Lý. Năm sau, vua dời đô về Đại La, đặt tên mới là Thăng Long.',
      'Dưới triều Lý, đạo Phật hưng thịnh, chùa chiền mọc khắp nơi, đất nước thái bình. Tất cả bắt đầu từ một ngôi chùa làng đã nuôi dạy một cậu bé mồ côi.'
    ],
    moral: 'Một mái chùa nuôi dạy một đứa trẻ có thể thay đổi cả vận mệnh đất nước.',
    quiz: { q: 'Vua Lý Công Uẩn dời đô và đặt tên kinh đô mới là gì?', options: ['Hoa Lư', 'Thăng Long', 'Phú Xuân'], answer: 1 } },

  /* ======================= HIẾU HẠNH VU LAN ======================= */
  { id: 'vl01', series: 'vulan', title: 'Mục Kiền Liên cứu mẹ',
    scenes: [
      'Tôn giả Mục Kiền Liên đắc thần thông, việc đầu tiên Ngài làm là tìm xem mẹ mình — bà Thanh Đề — sau khi mất đã về đâu.',
      'Ngài thấy mẹ đọa làm ngạ quỷ, bụng to như trống, cổ nhỏ như kim, đói khát khổ sở. Ngài đau lòng, mang bát cơm dâng mẹ.',
      'Bà Thanh Đề vì lòng tham còn nặng, một tay che bát, một tay bốc ăn. Cơm vừa đưa lên miệng đã hóa thành lửa đỏ.',
      'Ngài về khóc bạch Phật. Đức Phật dạy: nghiệp của mẹ quá nặng, một mình con không cứu được. Ngày rằm tháng Bảy, chư Tăng mãn hạ, hãy sắm lễ cúng dường mười phương Tăng.',
      'Nhờ sức chú nguyện chung của chư Tăng, bà Thanh Đề thoát khổ. Từ đó, rằm tháng Bảy là ngày Vu Lan Báo Hiếu.'
    ],
    moral: 'Sức mạnh của nhiều tâm lành hợp lại lớn hơn mọi thần thông riêng lẻ.',
    quiz: { q: 'Mẹ của tôn giả Mục Kiền Liên tên là gì?', options: ['Thanh Đề', 'Ma Da', 'Thị Kính'], answer: 0 } },

  { id: 'vl02', series: 'vulan', title: 'Bông hồng cài áo',
    scenes: [
      'Năm 1962, thiền sư Nhất Hạnh viết một bài tùy bút ngắn kể về một phong tục ông được thấy ở Nhật Bản: người ta cài hoa lên áo trong ngày của mẹ.',
      'Ai còn mẹ thì cài một bông hồng màu đỏ, để thấy mình hạnh phúc vì mẹ vẫn còn đó.',
      'Ai đã mất mẹ thì cài một bông hồng trắng, để nhớ thương và biết ơn người đã sinh thành.',
      'Bài viết nhắn nhủ người đọc: đừng đợi đến ngày mai — chiều nay về nhà, hãy đến ngồi bên mẹ, nhìn mẹ thật lâu và nói một lời thương.',
      'Từ đó, trong mùa Vu Lan, chùa chiền Việt Nam có lễ Bông Hồng Cài Áo. Quý Phật tử đang xem, comment "còn mẹ" hay "mất mẹ" để cùng cài hoa trong chùa nhé.'
    ],
    moral: 'Đừng đợi đến khi cài bông hồng trắng mới biết thương mẹ.',
    quiz: { q: 'Người còn mẹ cài bông hồng màu gì?', options: ['Trắng', 'Vàng', 'Đỏ'], answer: 2 } },

  { id: 'vl03', series: 'vulan', title: 'Gánh cha mẹ đi khắp núi Tu Di',
    scenes: [
      'Trong kinh, Đức Phật kể về công ơn cha mẹ: mang nặng đẻ đau, nhịn đói cho con no, nhường chỗ khô cho con nằm, mình nằm chỗ ướt.',
      'Ngài nói: giả sử có người vai trái cõng cha, vai phải cõng mẹ, đi giáp vòng núi Tu Di trăm nghìn vòng, da mòn đến xương…',
      '…người ấy vẫn chưa đền đáp hết công ơn cha mẹ.',
      'Vậy phải làm sao? Đức Phật dạy: hãy giúp cha mẹ sống thiện lành, an vui, có niềm tin vào điều tốt và trí tuệ hiểu đúng lẽ đời.',
      'Báo hiếu không chỉ là mâm cao cỗ đầy ngày giỗ, mà là một lời hỏi han, một bữa cơm cùng ăn, một nụ cười cho mẹ cha hôm nay.'
    ],
    moral: 'Báo hiếu lớn nhất là giúp cha mẹ được an vui và hướng thiện.',
    quiz: { q: 'Theo lời Phật dạy, báo hiếu lớn nhất là gì?', options: ['Xây nhà to cho cha mẹ', 'Giúp cha mẹ an vui, hướng thiện', 'Cúng giỗ thật lớn'], answer: 1 } }
];
