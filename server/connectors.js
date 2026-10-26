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

export const CONNECTORS = {
  kiotviet: { check: kiotvietCheck, sync: kiotvietSync },
  facebook_page: { check: facebookCheck, sync: facebookSync },
};
