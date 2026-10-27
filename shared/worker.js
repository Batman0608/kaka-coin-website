// LÀM VIỆC THẬT cho từng bước việc: nhân viên không chỉ viết lời khuyên mà hành động từng lượt:
// xem phần mềm được giao (xin phép lần đầu), hỏi người dùng khi cần thông tin chỉ họ biết (việc dừng chờ trả lời),
// soạn nội dung và xin duyệt trước khi đăng lên phần mềm (duyệt xong hệ thống mới đăng), rồi nộp sản phẩm hoàn chỉnh.
// Mọi lượt ghi vào "trace" của bước; việc chờ người dùng thì lưu trace và chạy tiếp khi người dùng trả lời.

export const MAX_ROUNDS = 6;
const cut = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : String(s ?? ''));

export const REQUEST_TYPES = {
  info: 'Cần bạn cung cấp thông tin',
  access: 'Xin phép truy cập phần mềm',
  publish: 'Xin duyệt nội dung trước khi đăng',
};

export function workQuestion({ ask, links, trace, round, maxRounds, answers = [] }) {
  const last = round >= maxRounds;
  return `BẠN ĐANG LÀM VIỆC THẬT (lượt ${round}/${maxRounds}), không chỉ viết lời khuyên.
${ask}

Phần mềm của bạn (chỉ dùng được những phần mềm này): ${links.length ? JSON.stringify(links.map((l) => ({ ma: l.id, ten: l.softwareName, loai: l.kind, mucDich: l.purpose, trangThai: l.status, daChoPhep: !!l.accessGranted, duLieuDaCo: l.data ? `${l.data.count} mục lúc ${l.data.at}` : 'chưa có' }))) : '(chưa được giao phần mềm nào — cần dữ liệu thì hỏi người dùng)'}
Đã trao đổi với người dùng trong việc này (KHÔNG hỏi lại, KHÔNG đăng lại): ${JSON.stringify(answers)}
Các lượt bạn đã làm trong bước này: ${JSON.stringify(trace.map((t) => ({ luot: t.luot, hanhDong: t.hanhDong, chiTiet: t.chiTiet, ketQua: cut(t.ketQua, 2500) })))}

Cách làm:
- Cần số liệu thật (giá, tồn kho, bài đăng, tương tác…) → "xem_phan_mem". Không đoán số.
- Cần thông tin chỉ người dùng biết → "hoi_nguoi_dung" (việc dừng chờ họ trả lời). Không viết "xin người dùng cung cấp" vào kết quả.
- Muốn đăng / gửi / thay đổi gì trên phần mềm → soạn NỘI DUNG HOÀN CHỈNH rồi "xin_duyet_dang"; người dùng duyệt xong hệ thống mới đăng.
- Đủ rồi → "nop" với SẢN PHẨM HOÀN CHỈNH (bài viết hoàn chỉnh, bảng giá có số thật, kế hoạch cụ thể), ghi rõ đã làm gì, dữ liệu lấy từ đâu, phần nào còn chờ.
${last ? 'ĐÂY LÀ LƯỢT CUỐI: bắt buộc "nop".\n' : ''}Chỉ trả về MỘT đối tượng JSON:
{"hanhDong":"xem_phan_mem","phanMem":"mã phần mềm","canLay":"cần lấy gì"}
{"hanhDong":"hoi_nguoi_dung","cauHoi":"câu hỏi cụ thể","vi":"vì sao cần"}
{"hanhDong":"xin_duyet_dang","phanMem":"mã phần mềm","noiDung":"nội dung hoàn chỉnh sẽ đăng","ghiChu":"đăng ở đâu, khi nào"}
{"hanhDong":"nop","ketQua":"sản phẩm hoàn chỉnh"}`;
}

function parseJson(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

// Kết quả của một yêu cầu đã được người dùng xử lý → chữ đưa lại cho nhân viên. null = vẫn đang chờ.
async function settle(entry, tools) {
  const r = await tools.getRequest(entry.requestId);
  if (!r) return 'Yêu cầu không còn (đã bị xoá).';
  if (r.type === 'info') {
    if (r.status === 'answered') return `Người dùng trả lời: ${r.answer}`;
    if (r.status === 'rejected') return `Người dùng không trả lời câu này${r.answer ? `: ${r.answer}` : ''}. Làm tiếp với dữ liệu đang có, ghi rõ phần thiếu.`;
    return null;
  }
  if (r.type === 'access') {
    if (r.status === 'approved') return tools.readSoftware(r.linkId, entry.canLay || '');
    if (r.status === 'rejected') return `Người dùng KHÔNG cho phép truy cập ${r.linkName}${r.answer ? `: ${r.answer}` : ''}.`;
    return null;
  }
  if (r.status === 'published') return `Đã đăng lên ${r.linkName} (nội dung người dùng duyệt: "${cut(r.content, 600)}"). Kết quả: ${r.result}`;
  if (r.status === 'failed') return `Đăng lên ${r.linkName} THẤT BẠI: ${r.result}`;
  if (r.status === 'rejected') return `Người dùng KHÔNG duyệt đăng${r.answer ? `: ${r.answer}` : ''}.`;
  return null; // pending / approved / publishing
}

/**
 * tools: { listLinks(staffId), readSoftware(linkId, canLay) → chữ, createRequest({type, question, content, linkId}) → id, getRequest(id),
 *          knownAnswers() → [{hoi, traLoi}] người dùng đã trả lời trong việc này }
 * Trả về { status: 'done', text, brainLabel, trace } | { status: 'waiting', requestId, trace, brainLabel }. Bộ não lỗi → ném lỗi.
 */
export async function runWorkStep({ staff, ask, ctx, think, tools, trace: prior = [], maxRounds = MAX_ROUNDS }) {
  const trace = prior.map((t) => ({ ...t }));
  let brainLabel = null;
  // Đang chờ người dùng ở lượt trước?
  const open = trace.find((t) => t.requestId && t.ketQua == null);
  if (open) {
    const res = await settle(open, tools);
    if (res == null) return { status: 'waiting', requestId: open.requestId, trace, brainLabel };
    open.ketQua = res;
  }
  for (let round = trace.length + 1; round <= maxRounds + 1; round++) {
    const links = await tools.listLinks(staff.id);
    const answers = (await tools.knownAnswers?.()) || [];
    const r = await think(staff, { ...ctx, question: workQuestion({ ask, links, trace, answers, round: Math.min(round, maxRounds), maxRounds }) });
    brainLabel = r.brainLabel;
    const a = parseJson(r.text);
    const act = a?.hanhDong;
    if (!act || act === 'nop' || round > maxRounds) {
      // Không ra JSON thì coi cả câu trả lời là sản phẩm nộp (không bỏ phí lượt suy nghĩ).
      const text = act === 'nop' ? String(a.ketQua || '').trim() || r.text : r.text;
      trace.push({ luot: round, hanhDong: 'nop', chiTiet: '', ketQua: 'Đã nộp.' });
      return { status: 'done', text, brainLabel, trace };
    }
    const link = a.phanMem ? links.find((l) => l.id === a.phanMem || l.softwareName === a.phanMem) : null;
    if (act === 'xem_phan_mem') {
      const entry = { luot: round, hanhDong: act, chiTiet: `${link?.softwareName || a.phanMem}: ${cut(a.canLay, 200)}`, canLay: String(a.canLay || '') };
      trace.push(entry);
      if (!link) { entry.ketQua = `Không có phần mềm "${a.phanMem}" trong danh sách của bạn.`; continue; }
      if (!link.accessGranted) {
        entry.requestId = await tools.createRequest({ type: 'access', linkId: link.id, question: `${staff.name} xin phép truy cập ${link.softwareName} để: ${cut(a.canLay || link.purpose, 300)}` });
        return { status: 'waiting', requestId: entry.requestId, trace, brainLabel };
      }
      entry.ketQua = await tools.readSoftware(link.id, entry.canLay);
      continue;
    }
    if (act === 'hoi_nguoi_dung') {
      const q = cut(a.cauHoi, 1000).trim() || 'Cần thêm thông tin.';
      const entry = { luot: round, hanhDong: act, chiTiet: q };
      trace.push(entry);
      entry.requestId = await tools.createRequest({ type: 'info', question: `${q}${a.vi ? `\n(Vì sao cần: ${cut(a.vi, 300)})` : ''}` });
      return { status: 'waiting', requestId: entry.requestId, trace, brainLabel };
    }
    if (act === 'xin_duyet_dang') {
      const entry = { luot: round, hanhDong: act, chiTiet: `${link?.softwareName || a.phanMem}: ${cut(a.noiDung, 200)}` };
      trace.push(entry);
      if (!link) { entry.ketQua = `Không có phần mềm "${a.phanMem}" để đăng.`; continue; }
      if (!String(a.noiDung || '').trim()) { entry.ketQua = 'Thiếu nội dung để xin duyệt.'; continue; }
      entry.requestId = await tools.createRequest({ type: 'publish', linkId: link.id, content: String(a.noiDung).slice(0, 8000), question: `${staff.name} xin duyệt nội dung để đăng lên ${link.softwareName}${a.ghiChu ? ` (${cut(a.ghiChu, 300)})` : ''}` });
      return { status: 'waiting', requestId: entry.requestId, trace, brainLabel };
    }
    trace.push({ luot: round, hanhDong: act, chiTiet: '', ketQua: `Hành động "${act}" không có. Chỉ dùng: xem_phan_mem, hoi_nguoi_dung, xin_duyet_dang, nop.` });
  }
  return { status: 'done', text: 'Hết lượt làm việc mà chưa nộp kết quả.', brainLabel, trace };
}

// Các trao đổi đã xong với người dùng trong một việc (để bước sau không hỏi lại, không đăng lại).
export function settledExchanges(requests) {
  return requests.filter((r) => ['answered', 'published', 'rejected'].includes(r.status)).map((r) => (
    r.type === 'info' ? { hoi: r.question.split('\n')[0], traLoi: r.status === 'answered' ? r.answer : 'không trả lời' }
      : r.type === 'publish' ? { daXinDang: r.linkName, ketQua: r.status === 'published' ? `ĐÃ ĐĂNG: "${cut(r.content, 300)}"` : `không duyệt${r.answer ? `: ${r.answer}` : ''}` }
        : { xinTruyCap: r.linkName, ketQua: r.status === 'rejected' ? 'không cho phép' : 'đã cho phép' }));
}

// Mô tả ngắn từng lượt cho giao diện ("An xem KiotViet…", "An hỏi bạn…").
export const TRACE_LABEL = { xem_phan_mem: 'Xem phần mềm', hoi_nguoi_dung: 'Hỏi bạn', xin_duyet_dang: 'Xin duyệt đăng', nop: 'Nộp kết quả' };
