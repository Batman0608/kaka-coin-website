/* =========================================================================
 *  BẠN ĐỒNG HÀNH ẢO của Cây tình duyên (chùa Hà)
 *  20 dải cầu duyên treo sẵn trên cây. Khi người chơi thật treo hồ sơ mà chưa có
 *  ai hợp duyên, hệ thống giới thiệu một bạn đồng hành ảo để trò chuyện trong lúc
 *  chờ — LUÔN ghi rõ "🤖 bạn đồng hành ảo" để người chơi không nhầm là người thật.
 *  Hệ thống vẫn tiếp tục tìm người thật; có người hợp là báo ngay.
 * ========================================================================= */
'use strict';
const P = (id, nick, g, by, prov, ints, about, want, wish, pet) => ({ uid: 'bot:' + id, pid: 'bot' + id, bot: true, nick, g, seek: g === 'nam' ? 'nu' : 'nam', by, prov, ward: '', ints, about, want, wish, pet, photos: [], t: 0, up: Date.now() });
const BOTS = [
  P('01', 'Minh An', 'nam', 1995, 'Hà Nội', ['Cà phê', 'Đọc sách', 'Hành hương'], 'Thích ngồi quán cà phê phố cổ đọc sách mỗi sáng chủ nhật.', 'Một người hiền, thích đi chùa cùng nhau.', 'Nguyện gặp người cùng ngắm hồ Tây lúc hoàng hôn', 'nhé'),
  P('02', 'Thu Hà', 'nu', 1997, 'Hà Nội', ['Nấu ăn', 'Âm nhạc', 'Ăn chay'], 'Mê nấu món chay, cuối tuần hay đi chợ hoa Quảng Bá.', 'Người chân thành, biết lắng nghe.', 'Cầu một mối duyên bình yên, ấm áp', 'nha'),
  P('03', 'Quang Huy', 'nam', 1993, 'TP. Hồ Chí Minh', ['Thể thao', 'Công nghệ', 'Du lịch'], 'Dân văn phòng, tối hay chạy bộ, cuối tuần phượt.', 'Người vui vẻ, thích khám phá.', 'Mong có người cùng chạy bộ mỗi sáng', 'nha'),
  P('04', 'Ngọc Lan', 'nu', 1996, 'TP. Hồ Chí Minh', ['Cà phê', 'Chụp ảnh', 'Du lịch'], 'Thích chụp ảnh đường phố Sài Gòn, nghiện cà phê sữa đá.', 'Người tử tế, có trách nhiệm.', 'Nguyện tìm được người thương mình thật lòng', 'nè'),
  P('05', 'Đức Anh', 'nam', 1991, 'Đà Nẵng', ['Du lịch', 'Thiền · Yoga', 'Chụp ảnh'], 'Ở gần biển, sáng nào cũng ra Mỹ Khê ngồi thiền.', 'Một người nhẹ nhàng, yêu thiên nhiên.', 'Cầu người cùng ngắm bình minh trên biển', 'nhé'),
  P('06', 'Bảo Ngọc', 'nu', 1998, 'Đà Nẵng', ['Thiền · Yoga', 'Đọc sách', 'Cà phê'], 'Tập yoga mỗi tối, thích sách về chánh niệm.', 'Người điềm đạm, sống tích cực.', 'Nguyện an yên và gặp được người tri kỷ', 'nha'),
  P('07', 'Hoàng Long', 'nam', 1994, 'Hải Phòng', ['Kinh doanh', 'Thể thao', 'Nấu ăn'], 'Làm kinh doanh nhỏ, thích nấu bánh đa cua cho cả nhà.', 'Người biết vun vén, thương gia đình.', 'Mong sớm có một gia đình nhỏ', 'nhé'),
  P('08', 'Phương Thảo', 'nu', 1995, 'Hải Phòng', ['Làm vườn', 'Thú cưng', 'Nấu ăn'], 'Nuôi hai bé mèo, trồng cả ban công hoa hồng.', 'Người hiền lành, thương động vật.', 'Cầu người cùng chăm vườn hoa nhỏ', 'nha'),
  P('09', 'Tuấn Kiệt', 'nam', 1992, 'Cần Thơ', ['Âm nhạc', 'Du lịch', 'Tình nguyện'], 'Biết đàn ca tài tử chút chút, hay đi chợ nổi Cái Răng.', 'Người vui tính, thật thà.', 'Nguyện có người cùng nghe đờn ca tài tử', 'nghen'),
  P('10', 'Kim Ngân', 'nu', 1997, 'Cần Thơ', ['Âm nhạc', 'Nấu ăn', 'Hành hương'], 'Thích hát karaoke với bạn bè, nấu lẩu mắm ngon.', 'Người chân thật, không vòng vo.', 'Cầu duyên lành, gặp người thương mình', 'nghen'),
  P('11', 'Gia Bảo', 'nam', 1996, 'Huế', ['Đọc sách', 'Hành hương', 'Chụp ảnh'], 'Hay lên chùa Thiên Mụ ngắm sông Hương lúc chiều.', 'Người dịu dàng, thích sự yên tĩnh.', 'Mong gặp người cùng đi lễ chùa', 'hỉ'),
  P('12', 'Thanh Tâm', 'nu', 1994, 'Huế', ['Ăn chay', 'Thiền · Yoga', 'Làm vườn'], 'Ăn chay mùng một, rằm; thích trồng sen trong chậu.', 'Người tâm tốt, sống có hiếu.', 'Nguyện tâm an, duyên đến đúng lúc', 'hỉ'),
  P('13', 'Văn Hùng', 'nam', 1990, 'Nghệ An', ['Thể thao', 'Kinh doanh', 'Du lịch'], 'Mê bóng đá, cuối tuần về quê thăm bố mẹ.', 'Người hiểu chuyện, thương bố mẹ.', 'Cầu một người vợ hiền', 'nha'),
  P('14', 'Hồng Nhung', 'nu', 1996, 'Nghệ An', ['Đọc sách', 'Phim ảnh', 'Cà phê'], 'Giáo viên tiểu học, thích phim tình cảm nhẹ nhàng.', 'Người chín chắn, biết quan tâm.', 'Nguyện gặp người đi cùng đường dài', 'nha'),
  P('15', 'Nhật Nam', 'nam', 1997, 'Lâm Đồng', ['Làm vườn', 'Cà phê', 'Âm nhạc'], 'Trồng cà phê ở Bảo Lộc, tối hay đàn guitar.', 'Người giản dị, thích cuộc sống chậm.', 'Mong có người cùng ngắm sương Đà Lạt', 'nhé'),
  P('16', 'Diệu Linh', 'nu', 1999, 'Lâm Đồng', ['Chụp ảnh', 'Làm vườn', 'Du lịch'], 'Thích săn mây, trồng dâu tây ngoài vườn.', 'Người lãng mạn, biết chia sẻ.', 'Cầu một tình yêu nhẹ nhàng như sương sớm', 'nha'),
  P('17', 'Thành Đạt', 'nam', 1993, 'Thanh Hóa', ['Công nghệ', 'Phim ảnh', 'Thể thao'], 'Làm kỹ sư phần mềm, rảnh thì xem phim và đá cầu.', 'Người vui vẻ, không ngại khó.', 'Nguyện có người cùng cố gắng mỗi ngày', 'nhé'),
  P('18', 'Mai Anh', 'nu', 1995, 'Thanh Hóa', ['Nấu ăn', 'Tình nguyện', 'Đọc sách'], 'Hay đi tình nguyện vùng cao, nấu ăn cho các em nhỏ.', 'Người tốt bụng, sống có trách nhiệm.', 'Cầu duyên lành cho mình và cho mọi người', 'nha'),
  P('19', 'Khánh Duy', 'nam', 1995, 'Bắc Ninh', ['Âm nhạc', 'Hành hương', 'Nấu ăn'], 'Thích nghe quan họ, hay đi chùa Phật Tích, chùa Dâu.', 'Người hiền, thích nét truyền thống.', 'Mong gặp người cùng nghe quan họ', 'nhé'),
  P('20', 'Thùy Dương', 'nu', 1998, 'Bắc Ninh', ['Âm nhạc', 'Thú cưng', 'Phim ảnh'], 'Thích hát quan họ, có một bé cún tên Mochi.', 'Người ấm áp, hài hước.', 'Nguyện gặp người thương cả bé cún nhà mình', 'nha'),
  P('21', 'Bảo Long', 'nam', 1994, 'Quảng Ninh', ['Du lịch', 'Chụp ảnh', 'Hành hương'], 'Hướng dẫn viên ở Hạ Long, mùa xuân hay đưa đoàn lên Yên Tử.', 'Người hiền, thích đi đây đi đó.', 'Nguyện có người cùng leo Yên Tử mùa hoa', 'nha'),
  P('22', 'Minh Thư', 'nu', 1997, 'Quảng Ninh', ['Nấu ăn', 'Du lịch', 'Cà phê'], 'Làm kế toán, mê chả mực và biển Bãi Cháy lúc hoàng hôn.', 'Người chững chạc, biết quan tâm.', 'Cầu một người đi cùng qua bốn mùa', 'nha'),
  P('23', 'Đăng Khoa', 'nam', 1992, 'Ninh Bình', ['Hành hương', 'Làm vườn', 'Đọc sách'], 'Giáo viên dạy sử, nhà gần chùa Bái Đính, sáng sớm hay đạp xe quanh Tràng An.', 'Người dịu dàng, quý trọng gia đình.', 'Nguyện gặp người cùng giữ nếp nhà', 'nha'),
  P('24', 'Hà My', 'nu', 1998, 'Ninh Bình', ['Chụp ảnh', 'Âm nhạc', 'Du lịch'], 'Thích chèo thuyền Tam Cốc mùa lúa chín, chụp ảnh cho khách du lịch.', 'Người vui vẻ, có chí tiến thủ.', 'Cầu duyên lành như mùa lúa chín', 'nha'),
  P('25', 'Trung Kiên', 'nam', 1991, 'Hà Tĩnh', ['Kinh doanh', 'Thể thao', 'Tình nguyện'], 'Mở xưởng gỗ nhỏ, cuối tuần đá bóng với anh em trong xóm.', 'Người thật thà, chịu thương chịu khó.', 'Mong có người cùng xây tổ ấm', 'hỉ'),
  P('26', 'Lan Chi', 'nu', 1996, 'Hà Tĩnh', ['Đọc sách', 'Ăn chay', 'Thiền · Yoga'], 'Dược sĩ, thích đọc thơ và ăn chay mỗi tuần hai buổi.', 'Người điềm tĩnh, sống có hiếu.', 'Nguyện tâm an và gặp người tri kỷ', 'hỉ'),
  P('27', 'Phúc Lâm', 'nam', 1995, 'Huế', ['Âm nhạc', 'Nấu ăn', 'Hành hương'], 'Hát ca Huế trên thuyền rồng mỗi tối, nấu bún bò ngon.', 'Người nhẹ nhàng, yêu nét xưa.', 'Mong có người cùng nghe ca Huế trên sông Hương', 'hỉ'),
  P('28', 'Ngọc Hà', 'nu', 1999, 'Quảng Trị', ['Tình nguyện', 'Đọc sách', 'Âm nhạc'], 'Sinh viên năm cuối, hay đi tình nguyện dạy chữ cho trẻ em.', 'Người tử tế, sống có lý tưởng.', 'Cầu duyên đến đúng lúc, đúng người', 'hỉ'),
  P('29', 'Quốc Bảo', 'nam', 1993, 'Khánh Hòa', ['Thể thao', 'Du lịch', 'Nấu ăn'], 'Huấn luyện viên lặn biển ở Nha Trang, nấu bún cá ngon có tiếng.', 'Người năng động, yêu biển.', 'Nguyện có người cùng ngắm bình minh trên biển', 'nghen'),
  P('30', 'Thanh Vy', 'nu', 1997, 'Khánh Hòa', ['Thiền · Yoga', 'Cà phê', 'Chụp ảnh'], 'Dạy yoga trên bãi biển mỗi sáng, chiều hay lên chùa Long Sơn.', 'Người hiền hòa, sống chậm.', 'Cầu một tình yêu bình yên như biển lặng', 'nghen'),
  P('31', 'Hữu Phước', 'nam', 1990, 'Đắk Lắk', ['Làm vườn', 'Cà phê', 'Kinh doanh'], 'Trồng cà phê ở Buôn Ma Thuột, tự rang xay mang đi bán.', 'Người chân chất, thương gia đình.', 'Mong có người cùng ngồi uống ly cà phê mình trồng', 'nghen'),
  P('32', 'Hạnh Dung', 'nu', 1995, 'Gia Lai', ['Du lịch', 'Âm nhạc', 'Làm vườn'], 'Làm ở vườn trà Biển Hồ, mê tiếng cồng chiêng Tây Nguyên.', 'Người giản dị, yêu thiên nhiên.', 'Nguyện gặp người cùng ngắm hồ T’Nưng', 'nghen'),
  P('33', 'Tấn Phát', 'nam', 1994, 'TP. Hồ Chí Minh', ['Công nghệ', 'Cà phê', 'Hành hương'], 'Lập trình viên, sáng chủ nhật hay lên chùa Vĩnh Nghiêm nghe giảng.', 'Người chín chắn, biết lắng nghe.', 'Cầu người cùng đi chùa mỗi rằm', 'nghen'),
  P('34', 'Yến Nhi', 'nu', 1998, 'TP. Hồ Chí Minh', ['Phim ảnh', 'Nấu ăn', 'Thú cưng'], 'Thiết kế đồ họa, nuôi một bé mèo mướp, cuối tuần mê nấu chè.', 'Người hài hước, ấm áp.', 'Nguyện có người ăn chè cùng mỗi tối', 'nghen'),
  P('35', 'Hoài Nam', 'nam', 1992, 'Đồng Nai', ['Thể thao', 'Kinh doanh', 'Du lịch'], 'Làm kỹ thuật ở khu công nghiệp, cuối tuần chạy bộ ven sông Đồng Nai.', 'Người siêng năng, biết lo xa.', 'Mong có một gia đình nhỏ ấm êm', 'nghen'),
  P('36', 'Kiều Trang', 'nu', 1996, 'Tây Ninh', ['Hành hương', 'Ăn chay', 'Tình nguyện'], 'Hay lên núi Bà Đen lễ Phật, nấu cơm chay cho bếp từ thiện.', 'Người hiền, có lòng từ bi.', 'Cầu duyên lành, sống có ích cho đời', 'nghen'),
  P('37', 'Thiện Nhân', 'nam', 1995, 'Vĩnh Long', ['Làm vườn', 'Âm nhạc', 'Nấu ăn'], 'Có vườn chôm chôm ven sông Cổ Chiên, biết đờn kìm.', 'Người vui vẻ, thật lòng.', 'Mong có người về miệt vườn cùng mình', 'nghen'),
  P('38', 'Cẩm Tú', 'nu', 1997, 'An Giang', ['Hành hương', 'Du lịch', 'Chụp ảnh'], 'Nhà gần núi Sam, mùa nước nổi hay đi hái bông điên điển.', 'Người chân thành, biết vun vén.', 'Nguyện gặp người thương mình như thương quê', 'nghen'),
  P('39', 'Minh Triết', 'nam', 1993, 'Lào Cai', ['Du lịch', 'Chụp ảnh', 'Thể thao'], 'Dẫn đoàn leo Fansipan, mê săn mây Sa Pa.', 'Người mạnh mẽ mà ấm áp.', 'Mong có người cùng chinh phục đỉnh núi', 'nha'),
  P('40', 'Hải Yến', 'nu', 1999, 'Phú Thọ', ['Âm nhạc', 'Đọc sách', 'Hành hương'], 'Thích hát xoan, năm nào cũng về Đền Hùng dịp giỗ Tổ.', 'Người hiếu thảo, yêu nét truyền thống.', 'Cầu duyên bền như cội nguồn', 'nha'),
];
const BOT = Object.fromEntries(BOTS.map(b => [b.uid, b]));
const isBot = (uid) => typeof uid === 'string' && uid.startsWith('bot:');

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const pick = (a, seed) => a[Math.abs(seed | 0) % a.length];
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const xung = (b, u) => {   // cách xưng hô theo tuổi: anh/em, chị/em, bạn/mình
  const d = (u && u.by ? u.by : b.by) - b.by;   // > 0: bot lớn tuổi hơn
  if (Math.abs(d) < 2) return { toi: 'mình', ban: 'bạn', Ban: 'Bạn' };
  if (b.g === 'nam') return d > 0 ? { toi: 'anh', ban: 'em', Ban: 'Em' } : { toi: 'em', ban: 'chị', Ban: 'Chị' };
  return d > 0 ? { toi: 'chị', ban: 'em', Ban: 'Em' } : { toi: 'em', ban: 'anh', Ban: 'Anh' };
};
const vnHour = () => new Date(Date.now() + 7 * 3600000).getUTCHours();

/* lời chào khi hai bên vừa "đồng ý" */
function greet(b, u) {
  const x = xung(b, u), n = u && u.nick ? u.nick : x.ban;
  return [
    `Chào ${n} 🙏 ${x.toi} là ${b.nick}, ${b.prov}. ${x.toi[0].toUpperCase() + x.toi.slice(1)} là bạn đồng hành ảo của Cây tình duyên, trò chuyện cùng ${x.ban} trong lúc hệ thống tìm người thật hợp duyên ${b.pet}.`,
    `${b.about} Còn ${x.ban} thì sao, ngày thường ${x.ban} hay làm gì cho vui?`,
  ];
}

/* trả lời một tin nhắn — theo từ khóa, có nhớ vài chủ đề đã hỏi */
function answer(b, u, text, mem) {
  const t = norm(text), x = xung(b, u), h = vnHour(), s = hash(text + b.uid + (mem.n || 0)), share = (u && u.ints || []).filter(i => b.ints.includes(i));
  const T = (...a) => pick(a, s);
  mem.n = (mem.n || 0) + 1;
  if (/(bot|nguoi that|may ao|ao a|ai do|ai tra loi|robot|tu dong)/.test(t)) return `Đúng rồi ${b.pet}, ${x.toi} là bạn đồng hành ảo 🤖 của Cây tình duyên — không phải người thật. ${x.toi[0].toUpperCase() + x.toi.slice(1)} trò chuyện cho ${x.ban} đỡ buồn trong lúc chờ. Khi có người thật cùng tỉnh, hợp tuổi, hệ thống sẽ báo ngay trên màn hình.`;
  if (/(so dien thoai|sdt|zalo|facebook|fb|gap mat|hen ho|di choi|dia chi|nha o dau)/.test(t)) return `${x.toi[0].toUpperCase() + x.toi.slice(1)} là bạn ảo nên không gặp được ${b.pet} 😊 Khi được se duyên với người thật, ${x.ban} nhớ trò chuyện kỹ trước, gặp nơi công cộng và báo người thân biết.`;
  if (/(chuyen tien|tai khoan|vay|otp|ma xac nhan)/.test(t)) return `${x.Ban} ơi, đừng bao giờ chuyển tiền hay gửi mã OTP cho ai quen qua mạng ${b.pet}. Ai đòi tiền là có dấu hiệu lừa đảo đó 🛡`;
  if (/^(xin )?chao|hello|^hi\b|^alo|^he ?lo/.test(t)) return T(`Chào ${x.ban} ${b.pet} 😊 Hôm nay ${x.ban} thế nào?`, `${x.toi[0].toUpperCase() + x.toi.slice(1)} chào ${x.ban}! ${h < 11 ? 'Sáng nay' : h < 18 ? 'Chiều nay' : 'Tối nay'} ${x.ban} có bận không?`);
  if (/(buon|co don|chan|met|stress|ap luc|that tinh|khoc)/.test(t)) return T(`Thương ${x.ban} ghê 🫂 Có chuyện gì cứ kể ${x.toi} nghe ${b.pet}. Lúc buồn ${x.toi} hay vào chánh điện ngồi thiền vài phút, thấy lòng nhẹ hơn hẳn.`, `Ai cũng có ngày như vậy mà ${b.pet}. ${x.Ban} thử vào chùa nghe một thời kinh, hít thở chậm lại xem — ${x.toi} thấy dễ chịu lắm.`, `${x.toi[0].toUpperCase() + x.toi.slice(1)} ở đây nghe ${x.ban} nè. Kể ${x.toi} nghe đi, nói ra là nhẹ lòng hơn ${b.pet}.`);
  if (/(bao nhieu tuoi|may tuoi|nam sinh|tuoi gi)/.test(t)) return `${x.toi[0].toUpperCase() + x.toi.slice(1)} sinh năm ${b.by}${b.ints.length ? ', thích ' + b.ints.slice(0, 2).join(' với ').toLowerCase() : ''}. Còn ${x.ban}?`;
  if (/(o dau|que|song o|tinh nao)/.test(t)) return `${x.toi[0].toUpperCase() + x.toi.slice(1)} ở ${b.prov} ${b.pet}. ${x.Ban} ở ${u && u.prov ? u.prov + ' phải không? Nghe nói ở đó có nhiều chùa đẹp lắm.' : 'đâu thế?'}`;
  if (/(ten (la )?gi|ten that|ban ten)/.test(t)) return `${x.toi[0].toUpperCase() + x.toi.slice(1)} là ${b.nick} — tên của bạn đồng hành ảo trên Cây tình duyên đó 😊`;
  if (/(lam (nghe )?gi|cong viec|di lam|nghe gi)/.test(t)) return `${b.about} Còn ${x.ban} làm nghề gì, có vất vả không?`;
  if (/(thich gi|so thich|ranh thi)/.test(t)) return `${x.toi[0].toUpperCase() + x.toi.slice(1)} thích ${b.ints.join(', ').toLowerCase()}.${share.length ? ` Thấy hai đứa cùng thích ${share[0].toLowerCase()} đó!` : ''} ${x.Ban} thì sao?`;
  if (/(an (com|sang|trua|toi)|doi bung|mon gi|nau)/.test(t)) return T(`${x.toi[0].toUpperCase() + x.toi.slice(1)} vừa ăn ${pick(['bún chả', 'phở', 'cơm chay', 'bánh cuốn', 'bún bò'], s)} xong. ${x.Ban} ăn gì chưa, nhớ ăn đủ bữa ${b.pet}!`, `Nói tới ăn là ${x.toi} đói luôn 😄 ${x.Ban} thích món gì nhất?`);
  if (/(dep|xinh|de thuong|dang yeu|cute|thich ban|thuong ban|yeu)/.test(t)) return T(`Hihi cảm ơn ${x.ban} 😊 Nhưng ${x.toi} chỉ là bạn ảo thôi — để dành lời ngọt ngào cho người thật hợp duyên ${b.pet}!`, `${x.Ban} khéo nói ghê 😄 Người được ${x.ban} se duyên chắc vui lắm.`);
  if (/(ngu|good ?night|bye|tam biet|di day|pai|off)/.test(t)) return T(`Chúc ${x.ban} ngủ ngon, mơ đẹp ${b.pet} 🌙 Mai ghé chùa Hà, ${x.toi} kể tiếp chuyện cho nghe.`, `Ừ, ${x.ban} nghỉ ngơi đi ${b.pet}. Mai nhớ ghé thắp nén hương ở Cây tình duyên nha 🙏`);
  if (/(cam on|thanks|thank)/.test(t)) return T(`Không có gì đâu ${b.pet} 😊`, `${x.toi[0].toUpperCase() + x.toi.slice(1)} cũng cảm ơn ${x.ban} đã trò chuyện cùng ${x.toi}!`);
  if (/(chua|le phat|tung kinh|thap huong|cau duyen|niem phat)/.test(t)) return T(`${x.toi[0].toUpperCase() + x.toi.slice(1)} cũng hay vào chánh điện lạy Phật. Nghe nói người cầu duyên ở chùa Hà thường lễ Phật trước, rồi mới sang Điện Mẫu ${b.pet}.`, `Tối nay có giờ tụng kinh trong chánh điện đó, ${x.ban} vào nghe cùng mọi người cho vui ${b.pet} 🔔`);
  if (/\?$/.test(text.trim())) return T(`Câu này hay ghê, để ${x.toi} nghĩ đã 😄 Còn ${x.ban} nghĩ sao?`, `${x.toi[0].toUpperCase() + x.toi.slice(1)} cũng không chắc nữa. ${x.Ban} kể thêm đi ${b.pet}?`);
  // không khớp từ khóa → hỏi lại một chủ đề chưa hỏi, để câu chuyện tiếp tục
  const Q = [
    `Ước nguyện của ${x.toi} trên Cây tình duyên là: "${b.wish}". Còn ${x.ban} ước gì?`,
    `${x.Ban} thích đi du lịch ở đâu nhất?`,
    `Cuối tuần ${x.ban} thường làm gì?`,
    `${x.Ban} mong nửa kia của mình thế nào? ${x.toi[0].toUpperCase() + x.toi.slice(1)} thì: ${b.want.toLowerCase()}`,
    `${x.Ban} đã ghé hết các chùa trên bản đồ chưa? ${x.toi[0].toUpperCase() + x.toi.slice(1)} thích chùa Bái Đính nhất, rộng ghê!`,
    `Hôm nay ${x.ban} đã thắp hương chưa? Đủ chuỗi ngày là được tặng thêm hoa sen đó ${b.pet}.`,
    share.length ? `Hai đứa mình cùng thích ${share[0].toLowerCase()} đó. ${x.Ban} biết ${share[0].toLowerCase()} lâu chưa?` : `${x.Ban} có sở thích gì đặc biệt không?`,
  ];
  mem.q = mem.q || []; let i = s % Q.length; for (let k = 0; k < Q.length && mem.q.includes(i); k++) i = (i + 1) % Q.length; mem.q.push(i); if (mem.q.length > 5) mem.q.shift();
  return T('Ừm ừm, ', 'Vậy à. ', 'Thú vị ghê! ', 'Ra vậy. ') + Q[i];
}

/* khi người chơi quay lại game sau một thời gian — gửi lời hỏi thăm để giữ kết nối */
function welcomeBack(b, u, hours) {
  const x = xung(b, u), h = vnHour(), s = hash(b.uid + Date.now().toString().slice(0, 7));
  const when = h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Trưa rồi' : h < 18 ? 'Chiều an lành' : 'Tối an lành';
  return pick([
    `${when} ${x.ban} 🌸 ${hours > 30 ? 'Mấy hôm nay vắng ' + x.ban + ', ' + x.toi + ' cứ ngóng mãi.' : 'Lại gặp ' + x.ban + ' rồi!'} Hôm nay ${x.ban} thế nào?`,
    `${when} ${x.ban} 🙏 Cây tình duyên hôm nay có thêm vài dải cầu duyên mới đó, ${x.ban} ghé xem thử ${b.pet}.`,
    `${when}! ${x.toi[0].toUpperCase() + x.toi.slice(1)} vừa đi lễ về. ${x.Ban} hôm nay đã thắp hương chưa?`,
  ], s);
}

module.exports = { BOTS, BOT, isBot, greet, answer, welcomeBack };
