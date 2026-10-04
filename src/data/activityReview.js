export const activityReviewResults = ["완료 확인", "보류", "미완료"];

function validTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function getActivityExceptions(activity) {
  const issues = [];
  if (!validTime(activity.checkedInAt)) issues.push("체크인 기록 누락 또는 오류");
  if (!validTime(activity.checkedOutAt)) issues.push("체크아웃 기록 누락 또는 오류");
  if (validTime(activity.checkedInAt) && validTime(activity.checkedOutAt) &&
    Date.parse(activity.checkedOutAt) <= Date.parse(activity.checkedInAt)) issues.push("활동 시간 순서 오류");
  if (activity.requesterConfirmation !== "confirmed") {
    issues.push(activity.requesterConfirmation === "disputed" ? "의뢰자 이의 있음" : "의뢰자 확인 필요");
  }
  if (activity.exceptionNotes) issues.push(activity.exceptionNotes);
  return issues;
}

export function reviewActivity(tasks, activities, activityId, result, reason, evidence) {
  const activity = activities.find((item) => item.id === activityId);
  if (!activity) throw new Error("활동 기록을 찾을 수 없습니다.");
  const task = tasks.find((item) => item.id === activity.taskId);
  if (!task) throw new Error("연결된 요청을 찾을 수 없습니다.");
  if (task.matchedStudentId !== activity.studentId) throw new Error("현재 매칭된 학생의 활동 기록만 검토할 수 있습니다.");
  if (!["진행 중", "활동 완료"].includes(task.status)) throw new Error("진행 중 또는 활동 완료 요청의 기록만 검토할 수 있습니다.");
  if (!validTime(activity.checkedInAt) && !validTime(activity.checkedOutAt)) throw new Error("체크인 또는 체크아웃 기록이 필요합니다.");
  if (!activityReviewResults.includes(result)) throw new Error("활동 검토 결과를 선택해주세요.");
  if (typeof reason !== "string" || !reason.trim()) throw new Error("활동 검토 사유를 입력해주세요.");
  if (typeof evidence !== "string") throw new Error("증빙 확인 내용을 입력해주세요.");
  if (result === "완료 확인") {
    if (task.reviewStatus !== "정상") throw new Error("요청 안전검토를 정상 처리한 후 완료 확인해주세요.");
    if (getActivityExceptions(activity).length > 0 && !evidence.trim()) {
      throw new Error("예외 활동을 완료 확인하려면 확인한 증빙 또는 자료 참조를 입력해주세요.");
    }
  }
  const changedAt = new Date().toISOString();
  const entry = {
    activityId, studentId: activity.studentId, result, reason: reason.trim(), evidence: evidence.trim(),
    changedAt, actorRole: "admin", isDemo: Boolean(activity.isDemo)
  };
  return tasks.map((item) => item.id !== task.id ? item : {
    ...item,
    activityReview: entry,
    activityReviewHistory: [...(item.activityReviewHistory ?? []), entry],
    ...(result === "완료 확인" && item.status !== "활동 완료" ? {
      status: "활동 완료",
      statusHistory: [...(item.statusHistory ?? []), {
        fromStatus: item.status, toStatus: "활동 완료", reason: reason.trim(), changedAt, actorRole: "admin"
      }]
    } : {})
  });
}

export function isValidActivityReviewData(task) {
  const validEntry = (entry) => entry && typeof entry.activityId === "string" && entry.activityId.trim() &&
    typeof entry.studentId === "string" && entry.studentId.trim() && activityReviewResults.includes(entry.result) &&
    typeof entry.reason === "string" && entry.reason.trim() && typeof entry.evidence === "string" &&
    validTime(entry.changedAt) && entry.actorRole === "admin" && typeof entry.isDemo === "boolean";
  if (task.activityReview !== undefined && !validEntry(task.activityReview)) return false;
  return task.activityReviewHistory === undefined ||
    (Array.isArray(task.activityReviewHistory) && task.activityReviewHistory.every(validEntry));
}
