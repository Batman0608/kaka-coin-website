// Fanpage tự vận hành (bản server): An làm bài + thiết kế và tự đăng, Tuấn kiểm tra số liệu và khuyên,
// Bình đề xuất quảng cáo (chỉ chạy khi người dùng duyệt) và chia sẻ bài hay vào nhóm. Logic chung ở shared/fanpage.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now, newId } from './db.js';
import { getStaff } from './roster.js';
import { selectBrain, thinkWithBrain } from './brain.js';
import { addMessage } from './chat.js';
import { getRow, credentials, addLog, rowToLink } from './links.js';
import { browseOnce } from './browse.js';
import { loadChromium } from './browser.js';
import { facebookPublish, facebookMetrics, facebookRunAd } from './connectors.js';
import { createRequest } from './requests.js';
import {
  DEFAULT_OPS, validateOps, dueCycles, markRun, runContentCycle, runAnalystCycle, runAdsCycle, executeAdsPlan, runShareCycle,
  CONTENT_ID, ADS_ID, ANALYST_ID, AD_KINDS, vnd,
} from '../shared/fanpage.js';

db.exec(`
CREATE TABLE IF NOT EXISTS fanpage_ops (account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fanpage_posts (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  topic TEXT, text TEXT NOT NULL, design TEXT, image TEXT, status TEXT NOT NULL, result TEXT, url TEXT, fb_post_id TEXT,
  stats TEXT, shares TEXT NOT NULL DEFAULT '[]', brain_label TEXT, created_at TEXT NOT NULL, posted_at TEXT
);
CREATE TABLE IF NOT EXISTS fanpage_snapshots (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, at TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fanpage_advice (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, from_id TEXT, to_id TEXT, text TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ad_plans (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, data TEXT NOT NULL, status TEXT NOT NULL, result TEXT, created_at TEXT NOT NULL, started_at TEXT);
`);
try { db.exec('ALTER TABLE messages ADD COLUMN post_id TEXT'); } catch { /* đã có */ }

// ---------- Lưu trữ ----------
export function getOps(accountId) {
  const r = db.prepare('SELECT data FROM fanpage_ops WHERE account_id = ?').get(accountId);
  return r ? { ...DEFAULT_OPS, ...JSON.parse(r.data) } : { ...DEFAULT_OPS };
}
function saveOps(accountId, ops) {
  db.prepare('INSERT INTO fanpage_ops (account_id, data) VALUES (?, ?) ON CONFLICT(account_id) DO UPDATE SET data = excluded.data').run(accountId, JSON.stringify(ops));
}
// Người dùng nhắn lịch đăng trong ô chat của việc: lưu giờ + mẫu bài, tới giờ tự đăng (chu kỳ nội dung).
export function setPostSchedule(accountId, { linkId, time, brief }) {
  getRow(accountId, linkId);
  const cur = getOps(accountId);
  const times = [...new Set([...(cur.postSchedule?.times || []), time])];
  updateOps(accountId, { fanpageLinkId: cur.fanpageLinkId || linkId, postSchedule: { times, brief } });
  return `Đã lưu lịch: mỗi ngày lúc ${times.join(', ')} (giờ Việt Nam) tự đăng bài mới theo mẫu.`;
}
export function updateOps(accountId, b) {
  const ops = validateOps(b, getOps(accountId));
  for (const k of ['fanpageLinkId', 'adsLinkId']) if (ops[k]) getRow(accountId, ops[k]);
  saveOps(accountId, ops);
  return ops;
}
const rowToPost = (r) => ({
  id: r.id, topic: r.topic, text: r.text, design: r.design ? JSON.parse(r.design) : null, hasImage: !!r.image, status: r.status, result: r.result,
  url: r.url, fbPostId: r.fb_post_id, stats: r.stats ? JSON.parse(r.stats) : null, shares: JSON.parse(r.shares), brainLabel: r.brain_label, createdAt: r.created_at, postedAt: r.posted_at,
});
export const listPosts = (a, limit = 30) => db.prepare('SELECT * FROM fanpage_posts WHERE account_id = ? ORDER BY created_at DESC LIMIT ?').all(a, limit).map(rowToPost);
export const postImage = (a, id) => db.prepare('SELECT image FROM fanpage_posts WHERE account_id = ? AND id = ?').get(a, id)?.image || null;
const snapshots = (a, limit = 20) => db.prepare('SELECT data FROM fanpage_snapshots WHERE account_id = ? ORDER BY at DESC LIMIT ?').all(a, limit).map((r) => JSON.parse(r.data));
const advice = (a, to, limit = 10) => db.prepare(`SELECT * FROM fanpage_advice WHERE account_id = ? ${to ? 'AND to_id = ?' : ''} ORDER BY at DESC LIMIT ?`).all(...(to ? [a, to, limit] : [a, limit]))
  .map((r) => ({ from: r.from_id, to: r.to_id, text: r.text, at: r.at }));
const rowToPlan = (r) => ({ ...JSON.parse(r.data), id: r.id, status: r.status, result: r.result, createdAt: r.created_at, startedAt: r.started_at });
const plans = (a, limit = 10) => db.prepare('SELECT * FROM ad_plans WHERE account_id = ? ORDER BY created_at DESC LIMIT ?').all(a, limit).map(rowToPlan);

export function overview(accountId) {
  return { ops: getOps(accountId), posts: listPosts(accountId, 20), snapshots: snapshots(accountId, 12), advice: advice(accountId, null, 12), plans: plans(accountId, 8), running: [...(runningCycles.get(accountId) || [])] };
}

// ---------- Thiết kế ảnh: vẽ bằng shared/design.js trong Chromium ----------
const here = path.dirname(fileURLToPath(import.meta.url));
const designSrc = fs.readFileSync(path.join(here, '..', 'shared', 'design.js'), 'utf8');
async function renderDesign(spec) {
  let browser;
  try {
    const chromium = await loadChromium();
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent('<!doctype html><canvas id="c"></canvas>');
    await page.addScriptTag({ type: 'module', content: `${designSrc}\nwindow.__draw = drawDesign;` });
    await page.waitForFunction(() => !!window.__draw);
    return await page.evaluate((s) => window.__draw(document.getElementById('c'), s).toDataURL('image/jpeg', 0.86), spec);
  } catch (e) {
    console.error('render', e.message);
    return null;
  } finally {
    await browser?.close();
  }
}

// ---------- Kênh thật: API nếu có mã, không thì nhân viên tự điều khiển trình duyệt ----------
// Fanpage đang dùng: chọn trong "Vận hành Fanpage", chưa chọn thì lấy Fanpage đầu tiên đã kết nối cho nhân viên.
function fanpageLink(accountId, ops) {
  if (ops.fanpageLinkId) return getRow(accountId, ops.fanpageLinkId);
  const r = db.prepare("SELECT id FROM software_links WHERE account_id = ? AND kind = 'facebook_page' ORDER BY (staff_id = 'STAFF-001') DESC LIMIT 1").get(accountId);
  if (!r) throw new Error('Chưa kết nối Fanpage: thêm phần mềm loại "Fanpage Facebook" cho An (trang nhân viên → Phần mềm).');
  return getRow(accountId, r.id);
}
async function publish(accountId, ops, { text, image }) {
  const r = fanpageLink(accountId, ops);
  const c = credentials(accountId, r);
  if (r.kind === 'facebook_page' && c.pageId && c.secret) {
    try {
      const res = await facebookPublish(c, { text, image });
      addLog(r.id, 'An đăng bài (Graph API)', true, res.message);
      return res;
    } catch (e) {
      addLog(r.id, 'An đăng bài (Graph API)', false, e.message);
      return { ok: false, message: e.message };
    }
  }
  const res = await browseOnce(accountId, r.id, { mode: 'publish', content: text, image, goal: 'Đăng bài mới lên Fanpage' });
  return { ok: res.status === 'published', message: res.message };
}
async function readMetrics(accountId, ops) {
  const r = fanpageLink(accountId, ops);
  const c = credentials(accountId, r);
  if (r.kind === 'facebook_page' && c.pageId && c.secret) {
    try {
      const snap = await facebookMetrics(c);
      // Gắn tương tác thật vào các bài An đã đăng.
      for (const p of snap.posts) {
        db.prepare('UPDATE fanpage_posts SET stats = ? WHERE account_id = ? AND fb_post_id = ?')
          .run(JSON.stringify({ reactions: p.reactions, comments: p.comments, shares: p.shares, at: now() }), accountId, p.fbPostId);
      }
      return { ok: true, snapshot: snap };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }
  const res = await browseOnce(accountId, r.id, { goal: 'Đọc số người theo dõi, lượt thích trang, và lượt thích / bình luận / chia sẻ của các bài mới nhất' });
  const d = db.prepare('SELECT items, at FROM link_data WHERE link_id = ?').get(r.id);
  if (res.status !== 'saved' && !d) return { ok: false, message: res.message };
  return { ok: true, snapshot: { source: res.status === 'saved' ? 'Tuấn đọc qua trình duyệt' : `dữ liệu lưu lúc ${d.at} (trình duyệt lần này lỗi: ${res.message})`, raw: JSON.parse(d.items).slice(0, 40) } };
}
async function runAd(accountId, ops, item, post) {
  const fb = fanpageLink(accountId, ops);
  const fbc = credentials(accountId, fb);
  if (ops.adsLinkId) {
    const r = getRow(accountId, ops.adsLinkId);
    const c = credentials(accountId, r);
    if (r.kind === 'facebook_ads' && c.adAccountId && c.secret) {
      try {
        const res = await facebookRunAd({ ...c, pageId: fbc.pageId }, item, post);
        addLog(r.id, 'Bình chạy quảng cáo (Marketing API)', true, res.message);
        return res;
      } catch (e) {
        addLog(r.id, 'Bình chạy quảng cáo (Marketing API)', false, e.message);
        return { ok: false, message: e.message };
      }
    }
  }
  const link = ops.adsLinkId || fb.id;
  const desc = `${AD_KINDS[item.loai]}${post ? ` cho bài: ${post.url || post.topic}` : ' cho cả trang'}; ngân sách ${vnd(item.nganSachNgay)}/ngày trong ${item.soNgay} ngày; đối tượng ${item.doiTuong.tuoiTu}-${item.doiTuong.tuoiDen} tuổi, ${item.doiTuong.khuVuc}${item.doiTuong.soThich.length ? `, quan tâm ${item.doiTuong.soThich.join(', ')}` : ''}; mục tiêu: ${item.mucTieu}`;
  const res = await browseOnce(accountId, link, { mode: 'ads', content: desc, budgetCap: item.nganSachNgay, goal: 'Chạy quảng cáo đã duyệt', url: post?.url || null });
  return { ok: res.status === 'published', message: res.message };
}
async function shareToGroup(accountId, ops, post, group) {
  const r = fanpageLink(accountId, ops);
  const content = `${post.url ? `${post.url}\n\n` : ''}${String(post.text).slice(0, 600)}`;
  const res = await browseOnce(accountId, r.id, { mode: 'publish', content, url: group.url, goal: 'Chia sẻ bài viết của Fanpage vào nhóm' });
  return { ok: res.status === 'published', message: res.message };
}

// ---------- Ghép io cho các chu kỳ ----------
export function fanpageIo(accountId, staffId) {
  const ops = getOps(accountId);
  const staff = getStaff(accountId, staffId);
  return {
    ops, staff,
    think: (s, ctx) => thinkWithBrain(accountId, s, selectBrain(accountId, s, s.id === ADS_ID ? 'deep_analysis' : s.id === CONTENT_ID ? 'writing' : 'deep_analysis'), ctx),
    posts: () => listPosts(accountId),
    advice: (to) => advice(accountId, to, 5),
    history: () => snapshots(accountId, 10),
    latestSnapshot: () => snapshots(accountId, 1)[0] || null,
    plans: () => plans(accountId, 5),
    render: renderDesign,
    publish: (p) => publish(accountId, ops, p),
    runAd: (item, post) => runAd(accountId, ops, item, post),
    getPost: (id) => listPosts(accountId, 200).find((p) => p.id === id) || null,
    postImage: (id) => postImage(accountId, id),
    readMetrics: () => readMetrics(accountId, ops),
    shareToGroup: (post, g) => shareToGroup(accountId, ops, post, g),
    savePost: (p) => {
      const id = newId('FP-');
      db.prepare('INSERT INTO fanpage_posts (id, account_id, topic, text, design, image, status, brain_label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, accountId, p.topic, p.text, JSON.stringify(p.design), p.image || null, p.status, p.brainLabel || null, now());
      return rowToPost(db.prepare('SELECT * FROM fanpage_posts WHERE id = ?').get(id));
    },
    updatePost: (id, f) => {
      const cols = { status: 'status', result: 'result', url: 'url', fbPostId: 'fb_post_id', postedAt: 'posted_at', text: 'text' };
      const keys = Object.keys(f).filter((k) => cols[k] && f[k] !== undefined);
      if (keys.length) db.prepare(`UPDATE fanpage_posts SET ${keys.map((k) => `${cols[k]} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => f[k]), id);
    },
    markShared: (id, url, ok, message) => {
      const p = db.prepare('SELECT shares FROM fanpage_posts WHERE id = ?').get(id);
      db.prepare('UPDATE fanpage_posts SET shares = ? WHERE id = ?').run(JSON.stringify([...JSON.parse(p.shares), { url, ok, message: String(message).slice(0, 300), at: now() }]), id);
    },
    saveSnapshot: (s) => db.prepare('INSERT INTO fanpage_snapshots (id, account_id, at, data) VALUES (?, ?, ?, ?)').run(newId('SN-'), accountId, s.at, JSON.stringify(s)),
    saveAdvice: (a) => db.prepare('INSERT INTO fanpage_advice (id, account_id, from_id, to_id, text, at) VALUES (?, ?, ?, ?, ?, ?)').run(newId('AV-'), accountId, a.from, a.to, a.text.slice(0, 3000), now()),
    savePlan: (p) => {
      const id = newId('AP-');
      const { status, ...data } = p;
      db.prepare('INSERT INTO ad_plans (id, account_id, data, status, created_at) VALUES (?, ?, ?, ?, ?)').run(id, accountId, JSON.stringify(data), status, now());
      return rowToPlan(db.prepare('SELECT * FROM ad_plans WHERE id = ?').get(id));
    },
    updatePlan: (id, f) => db.prepare('UPDATE ad_plans SET status = ?, result = ?, started_at = ? WHERE id = ?').run(f.status, f.result, f.startedAt || null, id),
    createRequest: (q) => createRequest(accountId, { staffId: ADS_ID, type: 'ads', question: q.question, content: q.content, linkId: q.planId }),
    groupMessage: (staffId, text, postId = null) => {
      const id = addMessage(accountId, 'group', staffId, text, null);
      if (postId) db.prepare('UPDATE messages SET post_id = ? WHERE id = ?').run(postId, id);
    },
  };
}

const runningCycles = new Map(); // accountId → Set(cycle)
export async function runCycle(accountId, cycle, slot = null) {
  const set = runningCycles.get(accountId) || new Set();
  runningCycles.set(accountId, set);
  if (set.has(cycle)) throw new Error('Chu kỳ này đang chạy.');
  set.add(cycle);
  const ops = getOps(accountId);
  markRun(ops, cycle, slot);
  saveOps(accountId, { ...getOps(accountId), lastRun: ops.lastRun }); // đánh dấu trước để không chạy hai lần
  try {
    if (cycle === 'content') return await runContentCycle(fanpageIo(accountId, CONTENT_ID));
    if (cycle === 'analyst') return await runAnalystCycle(fanpageIo(accountId, ANALYST_ID));
    if (cycle === 'ads') return await runAdsCycle(fanpageIo(accountId, ADS_ID));
    if (cycle === 'share') return await runShareCycle(fanpageIo(accountId, ADS_ID));
    throw new Error('Chu kỳ không hợp lệ.');
  } catch (e) {
    addMessage(accountId, 'group', { content: CONTENT_ID, analyst: ANALYST_ID }[cycle] || ADS_ID, `Lỗi khi chạy "${cycle}": ${e.message}`, null, true);
    return { status: 'error', message: e.message };
  } finally {
    set.delete(cycle);
  }
}

// Người dùng duyệt kế hoạch quảng cáo → Bình chạy đúng kế hoạch đã duyệt.
export async function approveAdsPlan(accountId, planId) {
  const p = db.prepare('SELECT * FROM ad_plans WHERE account_id = ? AND id = ?').get(accountId, planId);
  if (!p) throw new Error('Không tìm thấy kế hoạch quảng cáo.');
  const plan = rowToPlan(p);
  db.prepare("UPDATE ad_plans SET status = 'starting' WHERE id = ?").run(planId);
  const x = fanpageIo(accountId, ADS_ID);
  return executeAdsPlan({ ...x, plan, runAd: (item, post) => runAd(accountId, x.ops, item, post) });
}
export function rejectAdsPlan(accountId, planId, reason) {
  db.prepare("UPDATE ad_plans SET status = 'rejected', result = ? WHERE account_id = ? AND id = ?").run(reason || 'Người dùng không duyệt', accountId, planId);
}

export async function runDueFanpage(nowDate = new Date()) {
  for (const { account_id: a } of db.prepare('SELECT account_id FROM fanpage_ops').all()) {
    for (const d of dueCycles(getOps(a), nowDate)) {
      if (runningCycles.get(a)?.has(d.cycle)) continue;
      await runCycle(a, d.cycle, d.slot).catch((e) => console.error('fanpage', e));
    }
  }
}
export { rowToLink };

export { renderDesign };
