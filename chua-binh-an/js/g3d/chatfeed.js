/* =========================================================================
 *  KHUNG TRÒ CHUYỆN NHANH — hiện 4 tin gần nhất cạnh nút 💬
 *  · Tin dài tự cắt gọn trên một dòng; tin cũ nhất ẩn trước, mỗi tin tự mờ sau ~45 giây.
 *  · Lúc vắng người chơi thật, các Phật tử trong chùa (nhân vật có sẵn) thỉnh thoảng
 *    trò chuyện vài câu cho sân chùa thêm vui; ai nhắn khi vắng sẽ có người chào lại.
 * ========================================================================= */
const MAX = 4, LIFE = 45000, CUT = 140, NAMECUT = 10;   // giới hạn chữ: tin hiện đủ, tự xuống dòng (chỉ cắt khi quá ~140 ký tự), tên ~10 ký tự
const PROVS = ['Hà Nội', 'Huế', 'Đà Nẵng', 'Sài Gòn', 'Cần Thơ', 'Hải Phòng', 'Nghệ An', 'Thanh Hóa', 'Nam Định', 'Bắc Ninh', 'Đà Lạt', 'Quảng Ninh', 'Bình Dương', 'Đồng Nai'];
const SAY = [
  'Nam mô A Di Đà Phật 🙏', 'Chúc cả nhà một ngày an lành', 'Chùa {T} đẹp quá mọi người ơi', 'Ai tụng kinh cùng mình không?',
  'Mình vừa thắp hương xong 🕯️', 'Hôm nay đi lễ thấy lòng nhẹ hẳn', 'Có ai biết sự tích chùa này không?', 'Mới quét sân xong, mỏi tay mà vui 😄',
  'Tùy hỷ công đức mọi người 🙏', 'Mình ở {P}, mọi người ở đâu vậy?', 'Nghe tiếng chuông chùa thấy bình yên ghê', 'Cầu cho gia đình mọi người bình an',
  'Lần tràng hạt được 3 vòng rồi 📿', 'Hoa sen trong hồ nở đẹp quá 🪷', 'Mọi người nhớ nhận quà hằng ngày nha', 'Sáng nay lạy Phật xong thấy khỏe hẳn',
  'Ai đi thuyền rồng chưa, vui lắm đó ⛵', 'Ghé gặp ông giữ gia phả ghi lại gia phả nhà mình rồi 📜', 'Cây tình duyên ở chùa Hà nhiều dải lụa đẹp ghê 💞',
  'Nhớ ăn chay mùng một với rằm nha mọi người', 'Mình mới vào, chào cả nhà 🙏', 'A Di Đà Phật, sân chùa hôm nay đông vui quá', 'Thiền 5 phút thôi mà tâm an hẳn',
  'Ai biết giờ tụng kinh tối không ạ?', 'Mình vừa trả lời đúng câu hỏi ở tượng Phật, được thêm hạt 😄', 'Chúc mọi người tâm an, vạn sự an',
];
const REPLY = {
  hi: ['A Di Đà Phật, chào bạn 🙏', 'Chào bạn, chúc bạn đi lễ an lành', 'Chào bạn nha 😊'],
  thanks: ['Không có chi đâu 🙏', 'Tùy hỷ, tùy hỷ 🙏'],
  q: ['Mình cũng không rõ lắm, bạn hỏi thầy trụ trì thử xem 🙏', 'Bạn bấm vào sư trụ trì để nghe sự tích chùa đó'],
  any: ['A Di Đà Phật 🙏', 'Tùy hỷ công đức bạn 🙏', 'Chúc bạn tâm an nha', 'Hay quá 😊'],
};
const COLORS = ['#ffd36b', '#9cd0ff', '#ffa8c8', '#a8f0b0', '#ffc08a', '#d6b8ff', '#8ff0e6'];
const colorOf = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
const pick = (a) => a[Math.random() * a.length | 0];

export function initChatFeed({ el, NET, getNpcs, chatBubble, getTemple, me }) {
  const box = el('div', 'chatfeed'); box.setAttribute('aria-live', 'polite'); document.body.append(box);
  let lastReal = -1e9, nextBot = performance.now() + 9000, pendingReply = null;
  function add(name, text, kind) {
    text = String(text || '').replace(/\s+/g, ' ').trim(); if (!text) return;
    if (text.length > CUT) text = text.slice(0, CUT - 1) + '…';
    if (name.length > NAMECUT) name = name.split(' ').pop().slice(0, NAMECUT);   // tên dài: lấy tên gọi
    const r = el('div', 'cfl ' + (kind || '')), n = el('b', '', name + ': '); n.style.color = kind === 'me' ? '#ffe08a' : colorOf(name);
    r.append(n, document.createTextNode(text)); box.append(r);
    while (box.children.length > MAX) box.firstChild.remove();   // tin đến trước ẩn trước
    setTimeout(() => { r.classList.add('out'); setTimeout(() => r.remove(), 600); }, LIFE);
  }
  // tin hệ thống (thời khóa, lễ rước, tụng kinh…): bấm vào để mở đúng chức năng
  function sys(text, fn) {
    const r = el('div', 'cfl sys'), n = el('b', '', '📢 Hệ thống: ');
    r.append(n, document.createTextNode(String(text || '').replace(/\s+/g, ' ').trim()));
    if (fn) { r.classList.add('tap'); r.append(el('i', 'cfgo', ' · bấm xem ›')); r.onclick = (e) => { e.stopPropagation(); fn(); }; }
    box.append(r); while (box.children.length > MAX) box.firstChild.remove();
    setTimeout(() => { r.classList.add('out'); setTimeout(() => r.remove(), 600); }, LIFE);
  }
  const fill = (s) => s.replace('{T}', ((getTemple() || {}).name || 'mình').replace(/^Chùa\s+/i, '')).replace('{P}', pick(PROVS));
  const nameOf = (n) => (n.name || (n.label && n.label.childNodes[0] && n.label.childNodes[0].textContent) || 'Phật tử').trim();
  function botSay(text) {
    const L = (getNpcs() || []).filter(n => n.av && n.av.root && n.av.root.parent); if (!L.length) return false;
    const n = pick(L), t = fill(text);
    chatBubble(n.av.root, t, '', n.av.height, 4); add(nameOf(n), t, 'npc'); return true;
  }
  // nhận tin: người chơi (có tên) đi qua chatBubble
  function onBubble(root, text, name) {
    if (!name) return;
    const mine = me.av && root === me.av.root; add(name, text, mine ? 'me' : 'player');
    if (!mine) { lastReal = performance.now(); return; }
    // vắng người thật: có người chào lại
    if (NET.count <= 1 && performance.now() - lastReal > 120000 && Math.random() < 0.7) {
      const t = text.toLowerCase(), pool = /chào|hello|hi\b|xin chào|alo/.test(t) ? REPLY.hi : /cảm ơn|cám ơn|thank/.test(t) ? REPLY.thanks : /\?/.test(t) ? REPLY.q : REPLY.any;
      clearTimeout(pendingReply); pendingReply = setTimeout(() => botSay(pick(pool)), 2500 + Math.random() * 3500);
    }
  }
  function step() {
    const now = performance.now(); if (now < nextBot) return;
    const busy = NET.count > 2 || now - lastReal < 90000;   // đang có người thật trò chuyện thì để họ nói
    nextBot = now + (busy ? 60000 + Math.random() * 60000 : 15000 + Math.random() * 15000);
    if (!busy) botSay(pick(SAY));
  }
  function clear() { box.innerHTML = ''; nextBot = performance.now() + 8000; }
  return { add, sys, onBubble, step, clear };
}
