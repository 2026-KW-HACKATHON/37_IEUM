function seoulMonth(date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit",
  }).formatToParts(date);
  return `${parts.find((part) => part.type === "year").value}-${parts.find((part) => part.type === "month").value}`;
}

export function getStudentSummary(assignments, now = new Date()) {
  const certified = assignments.filter((assignment) => assignment.status === "인증 완료");
  const month = seoulMonth(now);
  const monthlyCount = certified.filter((assignment) => {
    const completedAt = assignment.certification?.certifiedAt;
    if (!completedAt) return false;
    const date = new Date(completedAt);
    return Number.isFinite(date.getTime()) && date <= now && seoulMonth(date) === month;
  }).length;
  return {
    monthlyCount,
    totalMinutes: certified.reduce((sum, assignment) =>
      sum + (assignment.submissions.at(-1)?.review?.recognizedMinutes || 0), 0),
    verifiedCount: certified.length,
  };
}
