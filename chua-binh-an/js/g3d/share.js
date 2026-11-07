/* =========================================================================
 *  KÊU GỌI CHIA SẺ GAME LÊN FACEBOOK
 *  Hiện bảng có sẵn lời giới thiệu + link game ở những lúc người chơi đang vui:
 *   · sau khi chơi liên tục 5 phút
 *   · sau khi dâng hương / thắp hương
 *   · khi gửi cầu duyên lần thứ 2 trở đi
 *  Không làm phiền: cách nhau ≥ 5 phút, "Để sau" → nghỉ 30 phút, đã chia sẻ → nghỉ 1 ngày,
 *  tối đa 4 lần / ngày.
 *  Nút "Chia sẻ lên Facebook": chép sẵn nội dung vào bộ nhớ tạm rồi mở hộp đăng bài Facebook với link
 *  /s/<ảnh>.html → bài đăng hiện ảnh quảng bá lớn (Facebook không cho trang web điền sẵn chữ: bấm Dán).
 *  Trên điện thoại có nút "Đăng kèm ảnh" gửi thẳng ảnh + lời giới thiệu sang ứng dụng Facebook.
 *  Chia sẻ được +50 công đức & +20 tràng hạt (mỗi ngày một lần).
 * ========================================================================= */
const SITE = 'https://dichua.id.vn/', LINK = '{LINK}', REWARD = 50;
// ảnh quảng bá (1200×630) — mỗi ảnh có trang /s/<tên>.html mang ảnh đó làm ảnh xem trước trên Facebook
const IMGS = [['cau-duyen', 'Cầu duyên chùa Hà'], ['cay-tinh-duyen', 'Cây tình duyên'], ['hanh-huong', 'Hành hương 12 chùa'], ['le-phat', 'Lạy Phật · tụng kinh'], ['tung-kinh', 'Tụng kinh đạo tràng'], ['mot-cot', 'Chùa Một Cột']];
const PICK = { time: 'hanh-huong', incense: 'le-phat', duyen: 'cau-duyen' };
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

export function initShare({ P, save, modal, closeModal, el, toast, addBeads, addMerit }) {
  const S = P.share = Object.assign({ last: 0, snooze: 0, day: '', n: 0, shared: 0, reward: '' }, P.share || {});
  const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const url = (img) => `${SITE}s/${img}.html`, imgUrl = (img) => `assets/share/${img}.jpg`;
  let busy = false, seq = 0;
  function can(reason) {
    const now = Date.now(); if (S.day !== today()) { S.day = today(); S.n = 0; }
    if (busy || document.hidden) return false;
    if (reason !== 'duyen' && !document.getElementById('veil').hidden) return false;   // đang mở bảng khác thì thôi
    return now > S.snooze && now - S.last > 5 * 60000 && S.n < 4;
  }
  function hud() { const b = document.getElementById('bShare'); if (!b) return; const got = S.reward === today(); b.classList.toggle('got', got); b.querySelector('small').textContent = got ? 'Lan tỏa thêm' : `+${REWARD} công đức`; }
  function show(reason, force) {
    if (!force && !can(reason)) return false;
    reason = TXT[reason] ? reason : 'time'; busy = true; if (!force) { S.last = Date.now(); S.n++; save(); }
    const tpl = TXT[reason][seq++ % TXT[reason].length]; let img = PICK[reason], edited = false;
    modal(TITLE[reason], (b) => {
      b.classList.add('share');
      const got = S.reward === today();
      b.append(el('p', 'note', SUB[reason] + (got ? '' : ` 🎁 Chia sẻ hôm nay được +${REWARD} công đức & +20 tràng hạt.`)));
      const big = el('img', 'shbig'); big.alt = 'Ảnh đính kèm bài chia sẻ'; b.append(big);
      const thumbs = el('div', 'shthumbs'); b.append(thumbs);
      const ta = el('textarea', 'shtext'); ta.rows = 5; ta.addEventListener('keydown', e => e.stopPropagation()); ta.oninput = () => { edited = true; }; b.append(ta);
      const pick = (k) => { img = k; big.src = imgUrl(k); [...thumbs.children].forEach(t => t.classList.toggle('on', t.dataset.k === k));
        ta.value = edited ? ta.value.replace(/https:\/\/dichua\.id\.vn\/\S*/g, url(k)) : tpl.split(LINK).join(url(k)); };
      IMGS.forEach(([k, t]) => { const bt = el('button', 'shth'); bt.dataset.k = k; bt.title = t; const im = el('img'); im.src = imgUrl(k); im.alt = t; im.loading = 'lazy'; bt.append(im); bt.onclick = () => pick(k); thumbs.append(bt); });
      pick(img);
      b.append(el('p', 'note', '✏️ Chọn ảnh đẹp nhất và sửa lời giới thiệu tùy ý. Bài đăng Facebook sẽ hiện ảnh lớn kèm link vào game.'));
      const copy = async () => { const t = ta.value.trim(); try { await navigator.clipboard.writeText(t); return true; } catch (e) { ta.select(); try { return document.execCommand('copy'); } catch (e2) { return false; } } };
      const done = () => {
        S.shared = Date.now(); S.snooze = Date.now() + 24 * 3600000;
        if (S.reward !== today()) { S.reward = today(); const g = addMerit ? addMerit(REWARD) : 0; if (addBeads) addBeads(20); setTimeout(() => toast(`🪷 Cảm ơn bạn đã lan tỏa Phật pháp · +${g || REWARD} công đức, +20 tràng hạt`), 2600); }
        save(); hud();
      };
      const row = el('div', 'row');
      const fb = el('button', 'btn gold shfb', '📘 Chia sẻ lên Facebook');
      fb.onclick = async () => {
        const ok = await copy();
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url(img)), 'fbshare', 'width=640,height=680');
        toast(ok ? '📋 Đã chép lời giới thiệu · trên Facebook bấm vào ô viết bài rồi DÁN (giữ ngón tay → Dán, hoặc Ctrl+V)' : 'Đã mở Facebook · chép lời giới thiệu ở trên rồi dán vào bài viết');
        done(); closeModal();
      };
      row.append(fb);
      // điện thoại: gửi thẳng ẢNH + lời giới thiệu sang ứng dụng Facebook / Zalo
      if (navigator.share) { const o = el('button', 'btn', '📲 Đăng kèm ảnh (Facebook · Zalo)'); o.onclick = async () => {
        const text = ta.value.trim(); copy();
        try { const blob = await (await fetch(imgUrl(img))).blob(), file = new File([blob], `chua-binh-an-${img}.jpg`, { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, title: 'Chùa Bình An Online' });
          else await navigator.share({ title: 'Chùa Bình An Online', text, url: url(img) });
          done(); closeModal(); } catch (e) { if (e && e.name !== 'AbortError') toast('Không mở được bảng chia sẻ · hãy dùng nút Chia sẻ lên Facebook'); } }; row.append(o); }
      const dl = el('a', 'btn', '📥 Tải ảnh'); dl.onclick = () => { dl.href = imgUrl(img); dl.download = `chua-binh-an-${img}.jpg`; }; row.append(dl);
      const c = el('button', 'btn', '📋 Chép nội dung'); c.onclick = async () => { if (await copy()) toast('📋 Đã chép · dán vào Facebook, Zalo hay bất cứ đâu'); }; row.append(c);
      if (!force) { const later = el('button', 'btn ghost', 'Để sau'); later.onclick = () => { S.snooze = Date.now() + 30 * 60000; save(); closeModal(); }; row.append(later); }
      b.append(row);
    }, { wide: true });
    setTimeout(() => { busy = false; }, 1500);
    return true;
  }
  // chơi liên tục 5 phút (chỉ tính khi đang mở game)
  let played = 0, asked = false;
  setInterval(() => { if (document.hidden) return; played += 15; if (!asked && played >= 300) { if (show('time')) asked = true; } }, 15000);
  const hb = document.getElementById('bShare'); if (hb) hb.onclick = () => show('time', true); hud();
  return { share: (reason) => setTimeout(() => show(reason), 1200), open: (reason) => show(reason || 'time', true) };
}
