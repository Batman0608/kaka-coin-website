// NHÀ CUNG CẤP GIẢ LẬP — CHỈ DÙNG CHO KIỂM THỬ. Mọi câu trả lời ở đây là dữ liệu test,
// được đánh dấu rõ "[TEST]" để không bị nhầm với câu trả lời thật của bộ não.
import http from 'node:http';

export function startFakeProvider() {
  const state = { failDefault: false, calls: [] };
  const server = http.createServer(async (req, res) => {
    let raw = '';
    for await (const c of req) raw += c;
    const key = req.headers['x-api-key'] || (req.headers.authorization || '').replace(/^Bearer /, '');
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'request-id': 'req_test' }); res.end(JSON.stringify(obj)); };
    const url = new URL(req.url, 'http://x');

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
      const sys = body.system;
      const who = /Bạn là (.+?), vai trò (.+?) tại/.exec(sys) || [];
      const q = /Đọc đúng câu hỏi: "([\s\S]*?)"\. Trả lời/.exec(sys)?.[1] || '';
      const prior = JSON.parse(/Các lượt nói trước: (.*)$/m.exec(sys)?.[1] || '[]');
      const hasImage = body.messages[0].content.some((b) => b.type === 'image');
      const consensus = /vòng (\d+)/.exec(q)?.[1] >= 2 ? `\n[ĐỒNG THUẬN]` : '';
      const text = `[TEST] ${who[1]} (${who[2]}) — phần chuyên môn ${who[2]} cho: ${q.slice(0, 80)}. Đã đọc ${prior.length} lượt trước.${hasImage ? ' Có ảnh đính kèm.' : ''}${consensus}`;
      return send(200, { id: 'msg_test', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_details: null, usage: { input_tokens: 10, output_tokens: 10 } });
    }
    send(404, { type: 'error', error: { type: 'not_found_error', message: 'not found' } });
  });
  return new Promise((resolve) => server.listen(0, () => resolve({ server, state, url: `http://127.0.0.1:${server.address().port}` })));
}
