// Kết nối phần mềm thật cho nhân viên: KiotViet Public API (sản phẩm, giá, tồn kho) và Facebook Graph API
// (bài đăng, lượt thích, bình luận của Fanpage). Chỉ gọi tới máy chủ chính thức; địa chỉ đổi được bằng biến môi trường
// để kiểm thử.
const KV_ID = process.env.VPA_KIOTVIET_ID_URL || 'https://id.kiotviet.vn';
const KV_API = process.env.VPA_KIOTVIET_API_URL || 'https://public.kiotapi.com';
const FB = process.env.VPA_FACEBOOK_GRAPH_URL || 'https://graph.facebook.com/v19.0';

async function call(url, opts = {}) {
  let r;
  try {
    r = await fetch(url, { ...opts, redirect: 'error', signal: AbortSignal.timeout(20000) });
  } catch (e) {
    throw new Error(`Không kết nối được (${e.cause?.code || e.name}): ${e.message}`);
  }
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* không phải JSON */ }
  if (!r.ok) {
    const msg = body?.error?.message || body?.error_description || body?.ResponseStatus?.Message || body?.message || text.slice(0, 300);
    throw Object.assign(new Error(`HTTP ${r.status} — ${msg}`), { status: r.status });
  }
  return { status: r.status, body };
}

// ---------- KiotViet ----------
async function kiotToken({ clientId, secret }) {
  if (!clientId || !secret) throw new Error('Thiếu Client ID hoặc Mã bảo mật (Client Secret) KiotViet.');
  const form = new URLSearchParams({ scopes: 'PublicApi.Access', grant_type: 'client_credentials', client_id: clientId, client_secret: secret });
  let body;
  try {
    ({ body } = await call(`${KV_ID}/connect/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form }));
  } catch (e) {
    // Sai Client ID / Secret: cần người dùng nhập lại → coi như phiên đăng nhập hết hạn.
    throw Object.assign(new Error(`Đăng nhập KiotViet thất bại: ${e.message}`), { status: e.status ? 401 : undefined });
  }
  if (!body?.access_token) throw new Error('KiotViet không trả về access token.');
  return body.access_token;
}

function kvHeaders(retailer, token) {
  if (!retailer) throw new Error('Thiếu tên gian hàng (Retailer) KiotViet.');
  return { Retailer: retailer, Authorization: `Bearer ${token}` };
}

export async function kiotvietCheck({ retailer, clientId, secret }) {
  const token = await kiotToken({ clientId, secret });
  const { status } = await call(`${KV_API}/products?pageSize=1`, { headers: kvHeaders(retailer, token) });
  return `KiotViet phản hồi thành công (HTTP ${status}) — nhân viên lấy được dữ liệu thật.`;
}

export async function kiotvietSync({ retailer, clientId, secret }, maxItems = 2000) {
  const token = await kiotToken({ clientId, secret });
  const items = [];
  for (let skip = 0; skip < maxItems; skip += 100) {
    const { body } = await call(`${KV_API}/products?pageSize=100&currentItem=${skip}&includeInventory=true&isActive=true`, { headers: kvHeaders(retailer, token) });
    const data = body?.data || [];
    for (const p of data) {
      const ton = (p.inventories || []).reduce((n, inv) => n + (Number(inv.onHand) || 0), 0);
      items.push({ ten: p.fullName || p.name, ma: p.code, gia: p.basePrice ?? null, ton, nhom: p.categoryName || '', anh: (p.images || [])[0] || '' });
    }
    if (data.length < 100 || items.length >= (body?.total ?? Infinity)) break;
  }
  return { kind: 'products', items };
}

// ---------- Facebook Page ----------
export async function facebookCheck({ pageId, secret }) {
  if (!pageId || !secret) throw new Error('Thiếu Page ID hoặc Page Access Token.');
  const { status, body } = await call(`${FB}/${encodeURIComponent(pageId)}?fields=name,fan_count&access_token=${encodeURIComponent(secret)}`);
  return `Facebook phản hồi thành công (HTTP ${status}) — Fanpage "${body?.name || pageId}"${body?.fan_count != null ? `, ${body.fan_count} lượt thích trang` : ''}.`;
}

export async function facebookSync({ pageId, secret }) {
  if (!pageId || !secret) throw new Error('Thiếu Page ID hoặc Page Access Token.');
  const fields = 'message,created_time,permalink_url,reactions.summary(true).limit(0),comments.summary(true).limit(5){message,from,created_time}';
  const { body } = await call(`${FB}/${encodeURIComponent(pageId)}/posts?limit=30&fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(secret)}`);
  const items = (body?.data || []).map((p) => ({
    noiDung: String(p.message || '').slice(0, 400), thoiGian: p.created_time, link: p.permalink_url || '',
    luotThich: p.reactions?.summary?.total_count ?? null, binhLuan: p.comments?.summary?.total_count ?? null,
    binhLuanMoi: (p.comments?.data || []).map((c) => `${c.from?.name || 'Khách'}: ${String(c.message || '').slice(0, 160)}`),
  }));
  return { kind: 'posts', items };
}

// ---------- Fanpage tự vận hành: đăng bài, đọc số liệu, chạy quảng cáo (Graph API / Marketing API) ----------
const form = (fields) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) f.append(k, v); return f; };

export async function facebookPublish({ pageId, secret }, { text, image }) {
  if (!pageId || !secret) throw new Error('Thiếu Page ID hoặc Page Access Token.');
  let body;
  if (image) {
    const m = /^data:(image\/\w+);base64,(.+)$/.exec(image);
    const blob = new Blob([Buffer.from(m[2], 'base64')], { type: m[1] });
    const f = form({ caption: text, access_token: secret });
    f.append('source', blob, 'thiet-ke.jpg');
    ({ body } = await call(`${FB}/${encodeURIComponent(pageId)}/photos`, { method: 'POST', body: f }));
  } else {
    ({ body } = await call(`${FB}/${encodeURIComponent(pageId)}/feed`, { method: 'POST', body: form({ message: text, access_token: secret }) }));
  }
  const postId = body?.post_id || body?.id;
  return { ok: true, fbPostId: postId, url: postId ? `https://www.facebook.com/${postId}` : null, message: `Facebook nhận bài (mã ${postId}).` };
}

export async function facebookMetrics({ pageId, secret }) {
  if (!pageId || !secret) throw new Error('Thiếu Page ID hoặc Page Access Token.');
  const tok = `access_token=${encodeURIComponent(secret)}`;
  const { body: page } = await call(`${FB}/${encodeURIComponent(pageId)}?fields=name,followers_count,fan_count&${tok}`);
  const fields = 'message,created_time,permalink_url,reactions.summary(true).limit(0),comments.summary(true).limit(0),shares';
  const { body: posts } = await call(`${FB}/${encodeURIComponent(pageId)}/posts?limit=15&fields=${encodeURIComponent(fields)}&${tok}`);
  let reach = null; let engagement = null;
  try {
    const { body: ins } = await call(`${FB}/${encodeURIComponent(pageId)}/insights?metric=page_impressions_unique,page_post_engagements&period=day&${tok}`);
    const last = (name) => { const m = (ins?.data || []).find((x) => x.name === name); return m?.values?.at(-1)?.value ?? null; };
    reach = last('page_impressions_unique'); engagement = last('page_post_engagements');
  } catch { /* trang nhỏ / thiếu quyền read_insights: để trống, không bịa */ }
  return {
    source: 'Facebook Graph API', name: page?.name, followers: page?.followers_count ?? null, likes: page?.fan_count ?? null, reach, engagement,
    posts: (posts?.data || []).map((p) => ({ fbPostId: p.id, text: String(p.message || '').slice(0, 200), at: p.created_time, url: p.permalink_url, reactions: p.reactions?.summary?.total_count ?? 0, comments: p.comments?.summary?.total_count ?? 0, shares: p.shares?.count ?? 0 })),
  };
}

// Chạy MỘT mục kế hoạch quảng cáo người dùng đã duyệt: chiến dịch → nhóm quảng cáo (ngân sách/ngày, đối tượng) → mẫu → quảng cáo.
export async function facebookRunAd({ adAccountId, secret, pageId }, item, post) {
  if (!adAccountId || !secret) throw new Error('Thiếu mã tài khoản quảng cáo (act_…) hoặc access token quảng cáo.');
  if (!pageId) throw new Error('Thiếu Page ID của Fanpage.');
  const act = String(adAccountId).startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const base = `${FB}/${encodeURIComponent(act)}`;
  const tok = { access_token: secret };
  const name = `VPA ${item.loai} ${new Date().toISOString().slice(0, 10)}`;
  const { body: c } = await call(`${base}/campaigns`, { method: 'POST', body: form({ ...tok, name, objective: 'OUTCOME_ENGAGEMENT', status: 'ACTIVE', special_ad_categories: '[]' }) });
  const end = new Date(Date.now() + item.soNgay * 86400000).toISOString();
  const targeting = { geo_locations: { countries: ['VN'] }, age_min: item.doiTuong.tuoiTu, age_max: item.doiTuong.tuoiDen };
  const goal = item.loai === 'tang_like_trang' ? 'PAGE_LIKES' : item.loai === 'tin_nhan' ? 'CONVERSATIONS' : 'POST_ENGAGEMENT';
  const { body: as } = await call(`${base}/adsets`, {
    method: 'POST',
    body: form({ ...tok, name, campaign_id: c.id, daily_budget: String(item.nganSachNgay), billing_event: 'IMPRESSIONS', optimization_goal: goal, bid_strategy: 'LOWEST_COST_WITHOUT_CAP', targeting: JSON.stringify(targeting), promoted_object: JSON.stringify({ page_id: pageId }), end_time: end, status: 'ACTIVE' }),
  });
  const spec = item.loai === 'day_bai'
    ? { object_story_id: post?.fbPostId?.includes('_') ? post.fbPostId : `${pageId}_${post?.fbPostId}` }
    : { object_story_spec: JSON.stringify({ page_id: pageId, link_data: { link: `https://www.facebook.com/${pageId}`, message: item.mucTieu, call_to_action: { type: item.loai === 'tin_nhan' ? 'MESSAGE_PAGE' : 'LIKE_PAGE' } } }) };
  if (item.loai === 'day_bai' && !post?.fbPostId) throw new Error('Bài này chưa có mã bài trên Facebook (đăng qua trình duyệt) — không đẩy bằng API được.');
  const { body: cr } = await call(`${base}/adcreatives`, { method: 'POST', body: form({ ...tok, name, ...spec }) });
  const { body: ad } = await call(`${base}/ads`, { method: 'POST', body: form({ ...tok, name, adset_id: as.id, creative: JSON.stringify({ creative_id: cr.id }), status: 'ACTIVE' }) });
  return { ok: true, message: `Chiến dịch ${c.id}, nhóm ${as.id}, quảng cáo ${ad.id} — ${item.nganSachNgay.toLocaleString('vi-VN')} đ/ngày × ${item.soNgay} ngày.` };
}

export const CONNECTORS = {
  kiotviet: { check: kiotvietCheck, sync: kiotvietSync },
  facebook_page: { check: facebookCheck, sync: facebookSync },
};
