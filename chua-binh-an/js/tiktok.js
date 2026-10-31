/* =========================================================================
 *  KẾT NỐI TIKFINITY (WebSocket API)
 *  TikFinity Desktop phát sự kiện TikTok LIVE ra ws://localhost:21213/
 *  dạng JSON: { "event": "chat" | "gift" | "like" | "follow" | "share" |
 *               "member" | "roomUser" | "social" ..., "data": {...} }
 *  Hàm normalize() bên dưới chấp nhận cả dữ liệu dạng phẳng (uniqueId,
 *  nickname...) và dạng lồng (data.user.uniqueId) của các phiên bản khác.
 * ========================================================================= */
window.CBA = window.CBA || {};

CBA.TikTok = (() => {
  let ws = null, url = '', want = false, retry = 0, retryTimer = null;
  let status = 'idle';         // idle | connecting | connected | error
  let handler = () => {};
  let statusCb = () => {};
  let lastEventAt = 0;

  function setStatus(s, msg) { status = s; statusCb(s, msg || ''); }

  function connect(u) {
    url = u || url || CBA.config.tikfinity.url;
    want = true; retry = 0;
    open();
  }
  function open() {
    clearTimeout(retryTimer);
    if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} }
    setStatus('connecting', url);
    try { ws = new WebSocket(url); } catch (e) { setStatus('error', String(e)); schedule(); return; }
    ws.onopen = () => { retry = 0; setStatus('connected', url); };
    ws.onmessage = (m) => {
      let msg; try { msg = JSON.parse(m.data); } catch (e) { return; }
      lastEventAt = Date.now();
      const ev = normalize(msg);
      if (ev) handler(ev);
    };
    ws.onerror = () => setStatus('error', 'Không kết nối được ' + url + ' — TikFinity đã mở chưa?');
    ws.onclose = () => { if (want) { setStatus('error', 'Mất kết nối, đang thử lại...'); schedule(); } else setStatus('idle'); };
  }
  function schedule() {
    if (!want) return;
    const delay = Math.min(15000, 1000 * Math.pow(2, retry++));
    retryTimer = setTimeout(open, delay);
  }
  function disconnect() {
    want = false; clearTimeout(retryTimer);
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    setStatus('idle');
  }

  function pick(d, ...keys) {
    for (const k of keys) {
      const v = k.split('.').reduce((o, p) => (o == null ? undefined : o[p]), d);
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  }

  function avatarOf(d) {
    const p = pick(d, 'profilePictureUrl', 'user.profilePictureUrl', 'user.profilePicture.url', 'user.profilePicture.urls.0', 'userDetails.profilePictureUrls.0', 'avatar');
    return Array.isArray(p) ? p[0] : p;
  }

  /* Chuẩn hóa về: { type, id, name, avatar, text, giftName, giftId, coins,
                    count, streaking, likes, viewers, sim } */
  function normalize(msg) {
    const type = (msg.event || msg.type || '').toString();
    const d = msg.data || msg;
    const base = {
      id: String(pick(d, 'uniqueId', 'user.uniqueId', 'userId', 'user.userId') || ''),
      name: String(pick(d, 'nickname', 'user.nickname', 'uniqueId', 'user.uniqueId') || 'Phật tử'),
      avatar: avatarOf(d),
      sim: !!d.__sim
    };
    switch (type) {
      case 'chat': case 'comment':
        return Object.assign(base, { type: 'chat', text: String(pick(d, 'comment', 'text', 'content') || '') });
      case 'gift': {
        const giftType = pick(d, 'giftType', 'giftDetails.giftType', 'gift.gift_type');
        const repeatEnd = pick(d, 'repeatEnd', 'gift.repeat_end');
        return Object.assign(base, {
          type: 'gift',
          giftName: String(pick(d, 'giftName', 'giftDetails.giftName', 'gift.name', 'extendedGiftInfo.name') || 'Quà'),
          giftId: pick(d, 'giftId', 'gift.id'),
          coins: Number(pick(d, 'diamondCount', 'giftDetails.diamondCount', 'gift.diamond_count', 'extendedGiftInfo.diamond_count') || 0),
          count: Number(pick(d, 'repeatCount', 'gift.repeat_count') || 1),
          // Quà combo (giftType 1) gửi nhiều sự kiện, chỉ tính khi repeatEnd = true
          streaking: Number(giftType) === 1 && !(repeatEnd === true || repeatEnd === 1 || repeatEnd === 'true')
        });
      }
      case 'like':
        return Object.assign(base, { type: 'like', likes: Number(pick(d, 'likeCount', 'count') || 1), total: Number(pick(d, 'totalLikeCount') || 0) });
      case 'follow':
        return Object.assign(base, { type: 'follow' });
      case 'share':
        return Object.assign(base, { type: 'share' });
      case 'social': {
        const label = String(pick(d, 'displayType', 'label') || '');
        if (/follow/i.test(label)) return Object.assign(base, { type: 'follow' });
        if (/share/i.test(label)) return Object.assign(base, { type: 'share' });
        return null;
      }
      case 'member': case 'join':
        return Object.assign(base, { type: 'join' });
      case 'roomUser': case 'viewerCount':
        return { type: 'viewers', viewers: Number(pick(d, 'viewerCount', 'count') || 0) };
      case 'subscribe':
        return Object.assign(base, { type: 'gift', giftName: 'Đăng ký hội viên', coins: 0, count: 1, streaking: false, subscribe: true });
      default:
        return null;
    }
  }

  return {
    connect, disconnect, normalize,
    onEvent: fn => { handler = fn; },
    onStatus: fn => { statusCb = fn; },
    status: () => status, url: () => url, lastEventAt: () => lastEventAt
  };
})();
