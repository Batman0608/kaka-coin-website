/* =========================================================================
 *  KÊU GỌI CHIA SẺ GAME LÊN FACEBOOK
 *  Hiện bảng có sẵn lời giới thiệu + link game ở những lúc người chơi đang vui:
 *   · sau khi chơi liên tục 5 phút
 *   · sau khi dâng hương / thắp hương
 *   · khi gửi cầu duyên lần thứ 2 trở đi
 *  Không làm phiền: cách nhau ≥ 5 phút, "Để sau" → nghỉ 30 phút, đã chia sẻ → nghỉ 1 ngày,
 *  tối đa 4 lần / ngày.
 *  Nút "Chia sẻ lên Facebook": chép sẵn nội dung vào bộ nhớ tạm rồi mở hộp đăng bài Facebook
 *  (Facebook không cho trang web điền sẵn chữ, nên người chơi chỉ cần bấm Dán).
 * ========================================================================= */
const LINK = 'https://dichua.id.vn/';
const TXT = {
  time: [
    '🙏 Mình đang chơi "Chùa Bình An Online" — đi lễ 12 ngôi chùa Việt bằng 3D ngay trên điện thoại: lạy Phật, tụng kinh, lần tràng hạt, thả đèn nguyện. Nhẹ nhàng mà an yên lắm!\n👉 Chơi miễn phí tại: ' + LINK,
    '🪷 Mỗi ngày dành 5 phút vào chùa, nghe một thời kinh, thắp nén hương cho lòng nhẹ lại. Mình thấy game này hay nên chia sẻ cho mọi người cùng chơi.\n👉 ' + LINK + '\n#ChuaBinhAn #DiChua #AnYen',
  ],
  incense: [
    '🕯️ Vừa thắp một nén hương ở "Chùa Bình An Online", nguyện cho gia đình và bạn bè luôn bình an, mạnh khỏe. Ai muốn cùng đi lễ chùa 3D thì vào đây nhé 🙏\n👉 ' + LINK,
    '🙏 Nam mô A Di Đà Phật. Hôm nay mình đã dâng hương ở chùa trong game "Chùa Bình An Online" — có cả Bái Đính, Yên Tử, chùa Một Cột… rất đẹp. Mời cả nhà cùng vào lễ Phật.\n👉 ' + LINK,
  ],
  duyen: [
    '💞 Mình vừa treo lời nguyện lên Cây tình duyên ở chùa Hà trong game "Chùa Bình An Online". Ai còn lẻ bóng thì vào cầu duyên cùng mình nha — hệ thống tự se duyên người cùng tỉnh, hợp tuổi! 🌸\n👉 ' + LINK,
    '🎐 "Vào lẻ bóng, ra có đôi" — đi chùa Hà cầu duyên ngay trên điện thoại! Treo hồ sơ lên Cây tình duyên, gặp người cùng sở thích. Rủ hội độc thân cùng vào nhé 💗\n👉 ' + LINK + '\n#CauDuyen #ChuaHa #ChuaBinhAn',
  ],
};
const TITLE = { time: '🪷 Lan tỏa an yên', incense: '🕯️ Lan tỏa phước lành', duyen: '💞 Rủ bạn bè cùng cầu duyên' };
const SUB = {
  time: 'Bạn đã cùng chùa hơn 5 phút rồi đó! Chia sẻ game cho người thân, bạn bè cùng vào lễ Phật nhé.',
  incense: 'Một nén hương thơm, nhân lên khi được chia sẻ. Mời người thân cùng vào chùa nhé.',
  duyen: 'Càng nhiều người treo hồ sơ, Cây tình duyên càng dễ se duyên cho bạn. Rủ hội bạn độc thân cùng vào nhé!',
};

export function initShare({ P, save, modal, closeModal, el, toast, addBeads }) {
  const S = P.share = Object.assign({ last: 0, snooze: 0, day: '', n: 0, shared: 0, reward: '' }, P.share || {});
  const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  let busy = false, seq = 0;
  function can(reason) {
    const now = Date.now(); if (S.day !== today()) { S.day = today(); S.n = 0; }
    if (busy || document.hidden) return false;
    if (reason !== 'duyen' && !document.getElementById('veil').hidden) return false;   // đang mở bảng khác thì thôi
    return now > S.snooze && now - S.last > 5 * 60000 && S.n < 4;
  }
  function show(reason, force) {
    if (!force && !can(reason)) return false;
    reason = TXT[reason] ? reason : 'time'; busy = true; S.last = Date.now(); S.n++; save();
    const text0 = TXT[reason][seq++ % TXT[reason].length];
    modal(TITLE[reason], (b) => {
      b.classList.add('share');
      b.append(el('p', 'note', SUB[reason]));
      const ta = el('textarea', 'shtext'); ta.rows = 6; ta.value = text0; ta.addEventListener('keydown', e => e.stopPropagation()); b.append(ta);
      b.append(el('p', 'note', '✏️ Bạn có thể sửa lời giới thiệu trước khi chia sẻ.'));
      const copy = async () => { const t = ta.value.trim(); try { await navigator.clipboard.writeText(t); return true; } catch (e) { ta.select(); try { return document.execCommand('copy'); } catch (e2) { return false; } } };
      const done = () => { S.shared = Date.now(); S.snooze = Date.now() + 24 * 3600000; if (S.reward !== today()) { S.reward = today(); if (addBeads) addBeads(20); toast('🪷 Cảm ơn bạn đã lan tỏa · +20 tràng hạt'); } save(); };
      const row = el('div', 'row');
      const fb = el('button', 'btn gold shfb', '📘 Chia sẻ lên Facebook');
      fb.onclick = async () => {
        const ok = await copy();
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(LINK), 'fbshare', 'width=640,height=640');
        toast(ok ? '📋 Đã chép lời giới thiệu · trên Facebook bấm vào ô viết bài rồi DÁN (giữ ngón tay → Dán, hoặc Ctrl+V)' : 'Đã mở Facebook · chép lời giới thiệu ở trên rồi dán vào bài viết');
        done(); closeModal();
      };
      row.append(fb);
      if (navigator.share) { const o = el('button', 'btn', '📲 Zalo · Messenger · khác'); o.onclick = async () => { try { await navigator.share({ title: 'Chùa Bình An Online', text: ta.value.trim(), url: LINK }); done(); closeModal(); } catch (e) {} }; row.append(o); }
      const c = el('button', 'btn', '📋 Chép nội dung'); c.onclick = async () => { if (await copy()) toast('📋 Đã chép · dán vào Facebook, Zalo hay bất cứ đâu'); done(); }; row.append(c);
      const later = el('button', 'btn ghost', 'Để sau'); later.onclick = () => { S.snooze = Date.now() + 30 * 60000; save(); closeModal(); }; row.append(later);
      b.append(row);
    });
    setTimeout(() => { busy = false; }, 1500);
    return true;
  }
  // chơi liên tục 5 phút (chỉ tính khi đang mở game)
  let played = 0, asked = false;
  setInterval(() => { if (document.hidden) return; played += 15; if (!asked && played >= 300) { if (show('time')) asked = true; } }, 15000);
  return { share: (reason) => setTimeout(() => show(reason), 1200), open: (reason) => show(reason || 'time', true) };
}
