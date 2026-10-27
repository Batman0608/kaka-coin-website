// Tự động hoàn toàn: mỗi phút kiểm tra lịch làm việc hằng ngày của từng nhân viên; đến giờ thì tự giao việc
// và chạy (nháp → đồng nghiệp phản biện → bản cuối), rồi tự học từ kết quả. Báo cáo 21:00 chạy ở reports.js.
import { db } from './db.js';
import { listStaff } from './roster.js';
import { createTask, executeTask } from './tasks.js';
import { markRoutineRun } from './staffops.js';
import { dueRoutines, hcmToday } from '../shared/staffkit.js';
import { runDueFanpage } from './fanpage.js';

export async function runDueRoutines(now = new Date()) {
  const started = [];
  for (const { id: accountId } of db.prepare('SELECT id FROM accounts').all()) {
    for (const s of listStaff(accountId)) {
      for (const r of dueRoutines(s.routines, now)) {
        markRoutineRun(accountId, s.id, r.id, hcmToday(now)); // đánh dấu trước để không chạy hai lần
        const taskId = createTask(accountId, {
          title: `${r.time} — ${r.title}`, description: r.description, kind: 'individual', assigneeIds: [s.id], createdBy: 'system',
        });
        started.push(taskId);
        executeTask(accountId, taskId).catch((e) => console.error('routine', e));
      }
    }
  }
  return started;
}

export function startAutomation() {
  const every = Number(process.env.VPA_AUTOMATION_INTERVAL_MS || 60 * 1000);
  setInterval(() => runDueRoutines().catch((e) => console.error('automation', e)), every);
  // Fanpage tự vận hành: An đăng bài, Tuấn kiểm tra, Bình đề xuất quảng cáo / chia sẻ nhóm khi đến giờ.
  let busy = false;
  setInterval(() => { if (busy) return; busy = true; runDueFanpage().catch((e) => console.error('fanpage', e)).finally(() => { busy = false; }); }, every);
}
