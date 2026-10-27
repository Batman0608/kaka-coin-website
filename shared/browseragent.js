// Nhân viên tự mở trình duyệt, điều khiển phần mềm (KiotViet, Fanpage…) để lấy dữ liệu.
// Vòng lặp: mở trang → đọc → (tìm / bấm / nhập) → lưu dữ liệu hoặc dừng. Mỗi bước bộ não trả MỘT hành động JSON;
// trình duyệt được truyền vào qua adapter nên dùng chung cho bản server (Playwright) và bản trải nghiệm
// (trình duyệt của ứng dụng Claude). Chỉ đọc: không tự đăng nhập, không bấm nút làm thay đổi dữ liệu.
import { pushLog } from './staffkit.js';

export const MAX_STEPS = 8;
const OBS_LIMIT = 9000;
// Nút luôn bị chặn (xoá, tiền, đơn hàng, đăng xuất) và nút ghi dữ liệu (chỉ được bấm khi đăng nội dung người dùng đã duyệt).
export const BLOCK_ALWAYS = /x[oó]a|delete|remove|thanh to[aá]n|đặt h[aà]ng|mua ngay|h[uủ]y|cancel|đăng xuất|log ?out|sign ?out|chuyển khoản|tạo đơn|trả tiền|nạp tiền/i;
export const WRITE = /g[uử]i|send|submit|l[uư]u|save|đăng|post|chia sẻ|share|xác nhận|publish/i;
export const RISKY = new RegExp(`${BLOCK_ALWAYS.source}|${WRITE.source}`, 'i');
export function clickBlocked(label, mode = 'read') {
  const l = String(label || '');
  if (BLOCK_ALWAYS.test(l)) return `Không bấm "${l.slice(0, 80)}": nút này có thể xoá dữ liệu, tạo đơn hoặc liên quan tiền (luôn bị chặn).`;
  if (mode === 'ads' && /đẩy mạnh|boost|quảng cáo|xuất bản|tiếp|next|continue/i.test(l)) return null;
  if (mode === 'read' && WRITE.test(l)) return `Không bấm "${l.slice(0, 80)}": nút này có thể làm thay đổi dữ liệu (nhân viên chỉ đọc).`;
  return null;
}

export function browseQuestion({ link, goal, history, observation, step, maxSteps, mode = 'read', content = '', hasImage = false, budgetCap = 0 }) {
  if (mode === 'ads') {
    return `Bạn đang tự điều khiển trình duyệt để CHẠY QUẢNG CÁO đúng như kế hoạch NGƯỜI DÙNG ĐÃ DUYỆT trên "${link.softwareName}" (${link.url}).
Mục đã duyệt (làm ĐÚNG, không thêm, không đổi):
<<<NOIDUNG
${content}
NOIDUNG>>>
Ngân sách mỗi ngày tối đa: ${budgetCap} đồng — không nhập số lớn hơn (hệ thống sẽ chặn).
Bước ${step}/${maxSteps}. Các bước đã làm: ${JSON.stringify(history.slice(-8))}

Trang hiện tại (nguyên văn trình duyệt trả về, đã cắt bớt):
<<<
${String(observation || '').slice(0, OBS_LIMIT)}
>>>

Quy tắc: không thêm / đổi phương thức thanh toán, không xoá gì, không đăng xuất, không tự đăng nhập (gặp trang đăng nhập thì dừng với "canDangNhap": true).
Chỉ trả về MỘT đối tượng JSON:
{"hanhDong":"bam","ref":"mã phần tử","vi":"lý do"}
{"hanhDong":"nhap","ref":"mã ô","noiDung":"giá trị"}
{"hanhDong":"di","url":"địa chỉ trong cùng trang quảng cáo"}
{"hanhDong":"tim","tuKhoa":"chữ cần tìm"}
{"hanhDong":"doc"}
{"hanhDong":"xong","ketQua":"quảng cáo đã bật chưa, mã / trạng thái thấy trên trang"}
{"hanhDong":"dung","lyDo":"vì sao dừng","canDangNhap":false}`;
  }
  if (mode === 'publish') {
    return `Bạn đang tự điều khiển trình duyệt để ĐĂNG nội dung NGƯỜI DÙNG ĐÃ DUYỆT lên "${link.softwareName}" (${link.url}).
Nội dung đã duyệt (đăng ĐÚNG NGUYÊN VĂN, không sửa):
<<<NOIDUNG
${content}
NOIDUNG>>>
Bước ${step}/${maxSteps}. Các bước đã làm: ${JSON.stringify(history.slice(-8))}

Trang hiện tại (nguyên văn trình duyệt trả về, đã cắt bớt):
<<<
${String(observation || '').slice(0, OBS_LIMIT)}
>>>

Quy tắc: chỉ đăng đúng một lần nội dung trên. Không xoá, không mua bán, không đổi cài đặt. Không tự đăng nhập: gặp trang đăng nhập thì dừng với "canDangNhap": true.
Chỉ trả về MỘT đối tượng JSON:
{"hanhDong":"bam","ref":"mã phần tử","vi":"lý do"}
{"hanhDong":"nhap","ref":"mã ô soạn bài","noiDung":"nội dung đã duyệt"}${hasImage ? '\n{"hanhDong":"anh","ref":"mã nút / ô chọn ảnh"}  (tải ảnh thiết kế kèm bài)' : ''}
{"hanhDong":"tim","tuKhoa":"chữ cần tìm"}
{"hanhDong":"doc"}
{"hanhDong":"xong","ketQua":"đã đăng ở đâu, thấy bài trên trang chưa"}
{"hanhDong":"dung","lyDo":"vì sao dừng","canDangNhap":false}`;
  }
  return `Bạn đang tự điều khiển trình duyệt để lấy dữ liệu từ phần mềm "${link.softwareName}" (${link.url}).
Mục đích dùng phần mềm: ${link.purpose || '(chưa ghi)'}
Việc cần lấy lần này: ${goal || link.purpose || 'Lấy dữ liệu chính của phần mềm (sản phẩm, giá, tồn kho; hoặc bài đăng, bình luận).'}
Bước ${step}/${maxSteps}. Các bước đã làm: ${JSON.stringify(history.slice(-8))}

Trang hiện tại (nguyên văn trình duyệt trả về, đã cắt bớt):
<<<
${String(observation || '').slice(0, OBS_LIMIT)}
>>>

Quy tắc: CHỈ ĐỌC. Không bấm nút xoá / lưu / gửi / đặt hàng / thanh toán / đăng xuất. Không tự nhập mật khẩu, không đăng nhập thay người dùng.
Gặp trang đăng nhập hoặc phiên hết hạn thì dừng với "canDangNhap": true. Chỉ ghi dữ liệu có thật trên trang, không bịa.
Chỉ trả về MỘT đối tượng JSON, chọn một hành động:
{"hanhDong":"tim","tuKhoa":"chữ cần tìm trên trang"}
{"hanhDong":"bam","ref":"mã phần tử (ví dụ r12 hoặc ref_5)","vi":"lý do"}
{"hanhDong":"nhap","ref":"mã ô tìm kiếm","noiDung":"chữ cần gõ"}
{"hanhDong":"di","url":"địa chỉ trang trong cùng phần mềm"}
{"hanhDong":"doc"}
{"hanhDong":"luu","loai":"products","muc":[{"ma":"","ten":"","gia":0,"ton":0,"nhom":""}],"ketLuan":"đã lấy gì"}
{"hanhDong":"luu","loai":"notes","muc":[{"ghiChu":"một dòng dữ liệu"}],"ketLuan":"đã lấy gì"}
{"hanhDong":"dung","lyDo":"vì sao dừng","canDangNhap":false}`;
}

export function parseAction(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export function normalizeItems(kind, list) {
  const items = Array.isArray(list) ? list.slice(0, 3000) : [];
  if (kind === 'products') {
    return items.map((x) => ({ ma: String(x.ma ?? '').slice(0, 80), ten: String(x.ten ?? '').slice(0, 300), gia: num(x.gia), ton: num(x.ton), nhom: String(x.nhom ?? '').slice(0, 120) }))
      .filter((x) => x.ten || x.ma);
  }
  return items.map((x) => ({ ghiChu: String(typeof x === 'string' ? x : x.ghiChu ?? JSON.stringify(x)).slice(0, 500) })).filter((x) => x.ghiChu);
}

/**
 * browser: { open(url), go(url), read(), find(q), click(ref), type(ref, text) } — mỗi hàm trả về chữ quan sát được.
 * Lỗi của trình duyệt được đưa nguyên văn cho bộ não ở bước sau và ghi vào nhật ký.
 * Trả về { status: 'saved' | 'need_login' | 'stopped' | 'error', message, data? , steps }.
 */
export async function runBrowserAgent({ staff, link, goal, think, browser, log = () => {}, maxSteps = MAX_STEPS, isCancelled = () => false, mode = 'read', content = '', image = null, budgetCap = 0, url = null }) {
  const history = [];
  let observation;
  try {
    observation = await browser.open(url || link.url);
    log('Mở trình duyệt', true, url || link.url);
  } catch (e) {
    log('Mở trình duyệt', false, e.message);
    return { status: 'error', message: `Không mở được trình duyệt: ${e.message}`, steps: history };
  }
  for (let step = 1; step <= maxSteps; step++) {
    if (isCancelled()) return { status: 'stopped', message: 'Đã dừng theo yêu cầu.', steps: history };
    let r;
    try {
      r = await think(staff, { question: browseQuestion({ link, goal, history, observation, step, maxSteps, mode, content, hasImage: !!image, budgetCap }) });
    } catch (e) {
      log('Bộ não', false, e.message);
      return { status: 'error', message: `Bộ não lỗi: ${e.message}`, steps: history };
    }
    const act = parseAction(r.text);
    if (!act?.hanhDong) {
      history.push({ buoc: step, loi: 'Không đọc được hành động JSON' });
      observation = `${observation}\n\n(LỖI: câu trả lời trước không phải JSON hành động hợp lệ — hãy trả đúng một đối tượng JSON.)`;
      continue;
    }
    const h = { buoc: step, hanhDong: act.hanhDong, ...(act.ref ? { ref: act.ref } : {}), ...(act.tuKhoa ? { tuKhoa: act.tuKhoa } : {}), ...(act.url ? { url: act.url } : {}) };
    history.push(h);
    if (act.hanhDong === 'luu') {
      const kind = act.loai === 'products' ? 'products' : 'notes';
      const items = normalizeItems(kind, act.muc);
      if (!items.length) {
        observation = `${observation}\n\n(LỖI: "luu" không có mục nào hợp lệ. Nếu trang không có dữ liệu thì dùng "dung".)`;
        continue;
      }
      log('Lấy dữ liệu qua trình duyệt', true, `${items.length} ${kind === 'products' ? 'sản phẩm' : 'dòng'}. ${act.ketLuan || ''}`.trim());
      return { status: 'saved', message: act.ketLuan || `Đã lấy ${items.length} mục.`, data: { kind, items }, steps: history };
    }
    if (act.hanhDong === 'xong' && mode !== 'read') {
      log(mode === 'ads' ? 'Chạy quảng cáo đã duyệt' : 'Đăng nội dung', true, act.ketQua || '');
      return { status: 'published', message: act.ketQua || 'Đã đăng.', steps: history };
    }
    if (act.hanhDong === 'dung') {
      const login = !!act.canDangNhap;
      log(login ? 'Cần đăng nhập' : 'Dừng', false, act.lyDo || '');
      return { status: login ? 'need_login' : 'stopped', message: act.lyDo || (login ? 'Phần mềm yêu cầu đăng nhập.' : 'Nhân viên dừng.'), steps: history };
    }
    try {
      if (act.hanhDong === 'tim') observation = await browser.find(String(act.tuKhoa || ''));
      else if (act.hanhDong === 'bam') observation = await browser.click(String(act.ref || ''), mode);
      else if (act.hanhDong === 'nhap') {
        const v = String(act.noiDung || '');
        // Chạy quảng cáo: không cho nhập ngân sách lớn hơn mức đã duyệt.
        const big = mode === 'ads' && (v.replace(/[.,\s]/g, '').match(/\d{4,}/g) || []).map(Number).find((n) => n > budgetCap);
        if (big) throw new Error(`Không nhập ${big}: vượt ngân sách đã duyệt ${budgetCap} đồng/ngày.`);
        observation = await browser.type(String(act.ref || ''), v);
      } else if (act.hanhDong === 'anh') {
        if (!image || !browser.upload) throw new Error('Trình duyệt này chưa tải ảnh lên được — đăng phần chữ, ảnh đã gửi trong nhóm chat.');
        observation = await browser.upload(String(act.ref || ''), image);
      }
      else if (act.hanhDong === 'di') observation = await browser.go(String(act.url || ''));
      else observation = await browser.read();
      log(`Trình duyệt: ${act.hanhDong}`, true, act.ref || act.tuKhoa || act.url || '');
    } catch (e) {
      log(`Trình duyệt: ${act.hanhDong}`, false, e.message);
      observation = `${observation}\n\n(LỖI khi "${act.hanhDong}": ${e.message})`;
    }
  }
  log('Dừng', false, `Hết ${maxSteps} bước mà chưa lấy được dữ liệu.`);
  return { status: 'stopped', message: `Hết ${maxSteps} bước mà chưa lấy được dữ liệu.`, steps: history };
}

// Nhật ký dùng chung: thêm một dòng vào logs của liên kết.
export const logInto = (link) => (action, ok, detail) => { link.logs = pushLog(link.logs, action, ok, detail); };
