// Quy trình chuẩn Fanpage cho một việc (bản server): ghép shared/campaign.js với Fanpage, quảng cáo, yêu cầu duyệt.
import { db, now } from './db.js';
import { getStaff } from './roster.js';
import { selectBrain, thinkWithBrain } from './brain.js';
import { fanpageIo } from './fanpage.js';
import { createRequest, getRequest } from './requests.js';
import { advanceCampaign, initCampaign, MANAGER } from '../shared/campaign.js';
import { CONTENT_ID, ADS_ID, ANALYST_ID } from '../shared/fanpage.js';

try { db.exec('ALTER TABLE tasks ADD COLUMN campaign TEXT'); } catch { /* đã có */ }

export const CAMPAIGN_TEAM = [ANALYST_ID, ADS_ID, CONTENT_ID, MANAGER];
export function startCampaign(accountId, taskId, { title, description, budget, days }) {
  db.prepare('UPDATE tasks SET campaign = ? WHERE account_id = ? AND id = ?').run(JSON.stringify(initCampaign({ title, description, budget, days })), accountId, taskId);
}
export const getCampaign = (accountId, taskId) => {
  const r = db.prepare('SELECT campaign FROM tasks WHERE account_id = ? AND id = ?').get(accountId, taskId);
  return r?.campaign ? JSON.parse(r.campaign) : null;
};

// "Đo ngay": không chờ đủ giờ, Tuấn đo kết quả luôn.
export function checkNow(accountId, taskId) {
  const c = getCampaign(accountId, taskId);
  const s = c?.steps.find((x) => !['done', 'skipped'].includes(x.status));
  if (!s || !s.key.startsWith('check_')) throw new Error('Bước hiện tại không phải bước đo kết quả.');
  s.runNow = true;
  db.prepare('UPDATE tasks SET campaign = ? WHERE account_id = ? AND id = ?').run(JSON.stringify(c), accountId, taskId);
}

export async function runCampaign(accountId, taskId, pushOutput) {
  const campaign = getCampaign(accountId, taskId);
  const fp = fanpageIo(accountId, CONTENT_ID);
  const kindOf = (id) => (id === CONTENT_ID ? 'writing' : 'deep_analysis');
  return advanceCampaign({
    ...fp, campaign,
    save: () => db.prepare('UPDATE tasks SET campaign = ?, updated_at = ? WHERE account_id = ? AND id = ?').run(JSON.stringify(campaign), now(), accountId, taskId),
    think: (staffId, ctx) => { const s = getStaff(accountId, staffId); return thinkWithBrain(accountId, s, selectBrain(accountId, s, kindOf(staffId)), ctx); },
    staffName: (id) => getStaff(accountId, id)?.name || id,
    publishPost: (p) => fp.publish({ text: p.text, image: fp.postImage(p.id), post: p }),
    createRequest: (q) => createRequest(accountId, { ...q, taskId, staffId: q.type === 'post' ? CONTENT_ID : q.type === 'retry' ? ANALYST_ID : ADS_ID, linkId: q.postId || null }),
    getRequest: (id) => getRequest(accountId, id),
    pushOutput,
  });
}
