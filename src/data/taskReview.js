export const reviewStatuses = ["검토 대기", "정상", "보류", "숨김"];

export function getReviewActions(task) {
  if (task.status === "취소") return [];
  const current = task.reviewStatus ?? "검토 대기";
  return [
    ...(current === "검토 대기" ? ["정상 처리"] : []),
    ...(current === "보류" ? ["보류 해제"] : ["보류"]),
    ...(current === "숨김" ? ["복원"] : ["숨김"]),
    "취소"
  ];
}

export function reviewTask(tasks, taskId, action, reason) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("요청을 찾을 수 없습니다.");
  if (!getReviewActions(task).includes(action)) {
    throw new Error("현재 요청에 적용할 수 없는 조치입니다.");
  }
  if (typeof reason !== "string" || !reason.trim()) {
    throw new Error("안전검토 조치 사유를 입력해주세요.");
  }

  const fromReviewStatus = task.reviewStatus ?? "검토 대기";
  const toReviewStatus = action === "취소" ? fromReviewStatus
    : action === "보류" || action === "숨김" ? action : "정상";
  const changedAt = new Date().toISOString();
  const trimmedReason = reason.trim();

  return tasks.map((item) => item.id !== taskId ? item : {
    ...item,
    reviewStatus: toReviewStatus,
    status: action === "취소" ? "취소" : item.status,
    ...(action === "취소" ? {
      statusHistory: [
        ...(item.statusHistory ?? []),
        {
          fromStatus: item.status,
          toStatus: "취소",
          reason: trimmedReason,
          changedAt,
          actorRole: "admin"
        }
      ]
    } : {}),
    reviewHistory: [
      ...(item.reviewHistory ?? []),
      {
        action,
        fromReviewStatus,
        toReviewStatus,
        reason: trimmedReason,
        changedAt,
        actorRole: "admin"
      }
    ]
  });
}

export function isValidReviewData(task) {
  if (task.reviewStatus !== undefined && !reviewStatuses.includes(task.reviewStatus)) {
    return false;
  }
  if (task.reviewHistory === undefined) return true;
  return Array.isArray(task.reviewHistory) && task.reviewHistory.every((entry) =>
    entry && ["정상 처리", "보류", "보류 해제", "숨김", "복원", "취소"].includes(entry.action) &&
    reviewStatuses.includes(entry.fromReviewStatus) && reviewStatuses.includes(entry.toReviewStatus) &&
    typeof entry.reason === "string" && entry.reason.trim().length > 0 &&
    typeof entry.changedAt === "string" && Number.isFinite(Date.parse(entry.changedAt)) &&
    entry.actorRole === "admin"
  );
}
