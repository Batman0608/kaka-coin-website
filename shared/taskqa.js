// Hỏi trực tiếp về một việc đã giao: người trả lời là người làm việc đó, dựa trên tiến độ, kết quả và phản biện của chính việc ấy.

// Người có thể hỏi: người được giao, người làm từng bước theo bản chốt, và Phúc với việc chung.
export function taskPeople(task, managerId) {
  const ids = [...(task.assigneeIds || [])];
  for (const p of task.planSteps || []) if (p.staffId && !ids.includes(p.staffId)) ids.push(p.staffId);
  for (const o of task.outputs || []) if (o.staffId && !ids.includes(o.staffId)) ids.push(o.staffId);
  if (task.kind === 'general' && !ids.includes(managerId)) ids.push(managerId);
  return ids;
}

const cut = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : s || '');

export function taskQaContext(task, { finalSummary = null, qa = [], staffName = '' } = {}) {
  const ketQua = (task.outputs || []).filter((o) => o.text || o.error).map((o) => ({
    buoc: o.step || o.key, nguoi: o.staffName, ketQua: o.error ? `LỖI: ${cut(o.error, 400)}` : cut(o.text, 1500),
  }));
  const extraInstructions = `NGƯỜI DÙNG ĐANG HỎI BẠN (${staffName}) VỀ VIỆC ĐÃ GIAO: "${task.title}".
Trả lời trực tiếp về việc này: dựa trên mô tả, tiến độ, kết quả từng bước và đánh giá ở dưới. Nói rõ phần nào bạn đã làm, phần nào chưa xong.
Nếu câu hỏi cần làm thêm thì nói cụ thể bạn sẽ làm gì tiếp. Chưa có kết quả thì nói chưa có, không bịa.
Tiến độ việc: ${JSON.stringify({ trangThai: task.status, moTa: cut(task.description, 1200), lyDoTraLai: task.returnReason, tieuChiDat: task.passCriteria, banChot: cut(finalSummary, 2000), ketQuaTungBuoc: ketQua })}`;
  return {
    question: null,
    extraInstructions,
    currentTask: { id: task.id, title: task.title, status: task.status },
    priorTurns: qa.filter((x) => x.answer).slice(-6).flatMap((x) => [{ nguoi: 'Người dùng', noiDung: x.question }, { nguoi: x.staffName, noiDung: cut(x.answer, 800) }]),
  };
}
