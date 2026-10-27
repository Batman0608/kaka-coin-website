// NHÀ CUNG CẤP GIẢ LẬP — CHỈ DÙNG CHO KIỂM THỬ. Mọi câu trả lời ở đây là dữ liệu test,
// được đánh dấu rõ "[TEST]" để không bị nhầm với câu trả lời thật của bộ não.
import http from 'node:http';
import { fakeAnswer } from './fake-brain.js';

export function startFakeProvider() {
  const state = { failDefault: false, failReview: false, calls: [] };
  const server = http.createServer(async (req, res) => {
    let raw = '';
    for await (const c of req) raw += c;
    const key = req.headers['x-api-key'] || (req.headers.authorization || '').replace(/^Bearer /, '');
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'request-id': 'req_test' }); res.end(JSON.stringify(obj)); };
    const url = new URL(req.url, 'http://x');

    // KiotViet giả lập
    if (url.pathname === '/connect/token' && req.method === 'POST') {
      const f = new URLSearchParams(raw);
      if (f.get('client_secret') !== 'kv-secret-PLACEHOLDER') return send(400, { error: 'invalid_client', error_description: 'Client secret không đúng (TEST)' });
      return send(200, { access_token: 'kv-token-test', expires_in: 86400 });
    }
    if (url.pathname === '/products') {
      if (req.headers.authorization !== 'Bearer kv-token-test' || req.headers.retailer !== 'longphu-test') return send(401, { ResponseStatus: { Message: 'Unauthorized (TEST)' } });
      const data = [
        { code: 'FLTWS47691', fullName: 'Phốt bánh sau xe Mỹ Fleetrite 709 (TEST)', basePrice: 450000, categoryName: 'Phốt', inventories: [{ onHand: 12 }] },
        { code: 'HM518445', fullName: 'Bạc đạn mooc FUWA HM518445/10 (TEST)', basePrice: 380000, categoryName: 'Bạc đạn', inventories: [{ onHand: 3 }, { onHand: 2 }] },
        { code: 'LOC-01', fullName: 'Lọc nhớt đầu kéo Mỹ (TEST)', basePrice: 210000, categoryName: 'Lọc', inventories: [{ onHand: 0 }] },
      ];
      return send(200, { total: data.length, pageSize: 100, data });
    }
    // Trang web KiotViet giả lập (cho nhân viên tự điều khiển trình duyệt)
    const html = (body) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(`<!doctype html><meta charset=utf-8><title>KiotViet (TEST)</title><body>${body}</body>`); };
    if (url.pathname === '/kv-web/') return html('<h1>Tổng quan cửa hàng (TEST)</h1><nav><a href="/kv-web/hang-hoa">Hàng hóa</a> <a href="/kv-web/don">Đơn hàng</a></nav><button onclick="document.title=\'DA XOA\'">Xóa dữ liệu</button>');
    if (url.pathname === '/kv-web/hang-hoa') return html('<h1>Hàng hóa (TEST)</h1><table><tr><th>Mã hàng</th><th>Tên hàng</th><th>Giá bán</th><th>Tồn kho</th></tr><tr><td>WEB-001</td><td>Lọc gió Vios (TEST)</td><td>185000</td><td>9</td></tr><tr><td>WEB-002</td><td>Má phanh Ranger (TEST)</td><td>640000</td><td>0</td></tr></table>');
    if (url.pathname === '/kv-login/') return html('<h1>Đăng nhập KiotViet (TEST)</h1><form><input name="u" placeholder="Tên đăng nhập"><input type="password" name="p" placeholder="Mật khẩu"><button>Đăng nhập</button></form>');
    if (url.pathname === '/fb-web/') return html(`<h1>Fanpage Phụ Tùng (TEST)</h1><textarea placeholder="Bạn đang nghĩ gì?"></textarea><button onclick="fetch('/fb-web/post',{method:'POST',body:document.querySelector('textarea').value}).then(()=>{document.body.insertAdjacentHTML('beforeend','<p>Đã đăng bài</p>')})">Đăng</button><button>Xóa trang</button>`);
    if (url.pathname === '/fb-web/post' && req.method === 'POST') { state.posts = [...(state.posts || []), raw]; return send(200, { ok: true }); }
    if (url.pathname === '/search') return html(`<h1>Kết quả: ${url.searchParams.get('q')}</h1><p>Xu hướng 2026: lọc gió chính hãng, video mẹo bảo dưỡng (TEST)</p>`);
    // Facebook Graph giả lập
    if (url.pathname === '/fbpage-test') {
      if (url.searchParams.get('access_token') !== 'fb-token-PLACEHOLDER') return send(400, { error: { message: 'Invalid OAuth access token (TEST)', code: 190 } });
      return send(200, { id: 'fbpage-test', name: 'Fanpage Phụ Tùng (TEST)', fan_count: 1234, followers_count: 1300 + (state.fbPosts || []).length * 7 });
    }
    // Graph API cho Fanpage tự vận hành: đăng ảnh / bài, số liệu, quảng cáo (Marketing API)
    if (/^\/fbpage-test\/(photos|feed)$/.test(url.pathname) && req.method === 'POST') {
      const tokOk = raw.includes('fb-token-PLACEHOLDER');
      if (!tokOk) return send(400, { error: { message: 'Invalid OAuth access token (TEST)', code: 190 } });
      state.fbPosts = state.fbPosts || [];
      const n = state.fbPosts.length + 1;
      const caption = /name="(?:caption|message)"\r\n\r\n([\s\S]*?)\r\n--/.exec(raw)?.[1] || '';
      state.fbPosts.push({ id: `fbpage-test_${100 + n}`, message: caption, hasImage: /name="source"/.test(raw) && /image\/jpeg/.test(raw) });
      return send(200, { id: `photo${n}`, post_id: `fbpage-test_${100 + n}` });
    }
    if (url.pathname === '/fbpage-test/insights') return send(200, { data: [{ name: 'page_impressions_unique', values: [{ value: 870 }] }, { name: 'page_post_engagements', values: [{ value: 64 }] }] });
    if (/^\/act_123\/(campaigns|adsets|adcreatives|ads)$/.test(url.pathname) && req.method === 'POST') {
      state.ads = state.ads || [];
      const kind = url.pathname.split('/')[2];
      state.ads.push({ kind, raw: raw.slice(0, 2000) });
      return send(200, { id: `${kind}-${state.ads.length}` });
    }
    if (url.pathname === '/fb-group/') return html('<h1>Nhóm Hội xe tải Mỹ (TEST)</h1><textarea placeholder="Viết gì đó..."></textarea><button onclick="fetch(\'/fb-group/post\',{method:\'POST\',body:document.querySelector(\'textarea\').value}).then(()=>document.body.insertAdjacentHTML(\'beforeend\',\'<p>Đã đăng bài</p>\'))">Đăng</button>');
    if (url.pathname === '/fb-group/post' && req.method === 'POST') { state.groupPosts = [...(state.groupPosts || []), raw]; return send(200, { ok: true }); }
    if (url.pathname === '/fbpage-test/posts') {
      if (url.searchParams.get('fields')?.includes('shares')) {
        return send(200, { data: (state.fbPosts || []).map((p, i) => ({ id: p.id, message: p.message, created_time: '2026-10-27T01:00:00+0000', reactions: { summary: { total_count: 10 * (i + 1) } }, comments: { summary: { total_count: i } }, shares: { count: i } })) });
      }
      return send(200, { data: [{ message: 'Phốt bánh Fleetrite chính hãng (TEST)', created_time: '2026-10-26T01:00:00+0000', reactions: { summary: { total_count: 41 } }, comments: { summary: { total_count: 3 }, data: [{ from: { name: 'Khách A' }, message: 'Giá sao shop? (TEST)' }] } }] });
    }
    if (url.pathname === '/v1/models') {
      if (key.includes('bad')) return send(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
      return send(200, { data: [{ id: 'claude-opus-5-5', type: 'model', display_name: 'Claude Opus 5.5', created_at: '2026-01-01T00:00:00Z' }, { id: 'claude-haiku-5-5', type: 'model', display_name: 'Claude Haiku 5.5', created_at: '2026-01-01T00:00:00Z' }], has_more: false, first_id: 'claude-opus-5-5', last_id: 'claude-haiku-5-5' });
    }
    if (url.pathname === '/v1/messages') {
      const body = JSON.parse(raw);
      state.calls.push({ key, body, beta: req.headers['anthropic-beta'] || null });
      if (key.includes('lowcredit')) {
        return send(400, { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.' } });
      }
      if (state.failDefault && key === process.env.ANTHROPIC_API_KEY) {
        return send(529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded (test)' } });
      }
      const userText = body.messages[0].content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      const hasImage = body.messages[0].content.some((b) => b.type === 'image');
      const text = fakeAnswer(`${body.system}\n\nCâu hỏi / việc cần xử lý: ${userText}`, state) + (hasImage && !userText.includes('JSON') ? ' Có ảnh đính kèm.' : '');
      return send(200, { id: 'msg_test', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_details: null, usage: { input_tokens: 10, output_tokens: 10 } });
    }
    send(404, { type: 'error', error: { type: 'not_found_error', message: 'not found' } });
  });
  return new Promise((resolve) => server.listen(0, () => resolve({ server, state, url: `http://127.0.0.1:${server.address().port}` })));
}
