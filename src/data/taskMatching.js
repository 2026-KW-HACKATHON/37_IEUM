import { taskStatuses } from "./tasks.js";

function requireReason(reason) {
  if (typeof reason !== "string" || !reason.trim()) {
    throw new Error("매칭 처리 사유를 입력해주세요.");
  }
  return reason.trim();
}

export function clearTaskMatch(task, reason, changedAt, action = "매칭 해제") {
  if (task.matchedStudentId === undefined || task.matchedStudentId === null) return task;
  return {
    ...task,
    matchedStudentId: null,
    matchedApplicationId: null,
    matchedAt: null,
    matchingIsDemo: false,
    matchingHistory: [
      ...(task.matchingHistory ?? []),
      { action, studentId: task.matchedStudentId, reason, changedAt, actorRole: "admin" }
    ]
  };
}

export function createTaskMatch(tasks, users, applications, taskId, studentId, reason) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("요청을 찾을 수 없습니다.");
  const trimmedReason = requireReason(reason);
  if (task.matchedStudentId !== undefined && task.matchedStudentId !== null) {
    throw new Error("이미 매칭된 요청입니다. 다른 학생으로 변경하려면 먼저 매칭을 해제해주세요.");
  }
  if (!["모집 중", "신청자 있음"].includes(task.status)) {
    throw new Error("모집 중 또는 신청자 있음 상태의 요청만 매칭할 수 있습니다.");
  }
  if (task.reviewStatus !== "정상") {
    throw new Error("요청 관리에서 안전검토를 정상 처리한 후 매칭해주세요.");
  }
  const student = users.find((user) => user.id === studentId && user.role === "student");
  const application = applications.find((item) => item.taskId === taskId && item.studentId === studentId);
  if (!student || !application) throw new Error("이 요청에 신청한 대학생을 선택해주세요.");
  // 현재는 테스트 사용자만 있습니다. 실제 사용자 연결 시 검증 승인도 확인합니다.
  if (!student.isDemo && student.verificationStatus !== "approved") {
    throw new Error("검증 승인된 대학생만 매칭할 수 있습니다.");
  }
  const changedAt = new Date().toISOString();
  return tasks.map((item) => item.id !== taskId ? item : {
    ...item,
    status: "매칭 완료",
    matchedStudentId: studentId,
    matchedApplicationId: application.id,
    matchedAt: changedAt,
    matchingIsDemo: Boolean(student.isDemo || application.isDemo),
    statusHistory: [
      ...(item.statusHistory ?? []),
      { fromStatus: item.status, toStatus: "매칭 완료", reason: trimmedReason, changedAt, actorRole: "admin" }
    ],
    matchingHistory: [
      ...(item.matchingHistory ?? []),
      { action: "매칭", studentId, reason: trimmedReason, changedAt, actorRole: "admin" }
    ]
  });
}

export function releaseTaskMatch(tasks, users, applications, taskId, reason) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("요청을 찾을 수 없습니다.");
  const trimmedReason = requireReason(reason);
  if (task.matchedStudentId === undefined || task.matchedStudentId === null) {
    throw new Error("해제할 매칭 정보가 없습니다.");
  }
  if (task.status !== "매칭 완료") {
    throw new Error("활동 시작 전 매칭 완료 상태에서만 매칭을 해제할 수 있습니다.");
  }
  const hasApplicants = applications.some((application) =>
    application.taskId === taskId && users.some((user) => user.id === application.studentId && user.role === "student")
  );
  const nextStatus = hasApplicants ? "신청자 있음" : "모집 중";
  const changedAt = new Date().toISOString();
  return tasks.map((item) => item.id !== taskId ? item : {
    ...clearTaskMatch(item, trimmedReason, changedAt),
    status: nextStatus,
    statusHistory: [
      ...(item.statusHistory ?? []),
      { fromStatus: item.status, toStatus: nextStatus, reason: trimmedReason, changedAt, actorRole: "admin" }
    ]
  });
}

export function isValidMatchingData(task) {
  const validId = (value) => value === undefined || value === null ||
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value));
  if (!validId(task.matchedStudentId) || !validId(task.matchedApplicationId)) return false;
  if (task.matchedAt !== undefined && task.matchedAt !== null &&
    (typeof task.matchedAt !== "string" || !Number.isFinite(Date.parse(task.matchedAt)))) return false;
  if (task.matchingHistory === undefined) return true;
  return Array.isArray(task.matchingHistory) && task.matchingHistory.every((entry) =>
    entry && ["매칭", "매칭 해제", "요청 취소"].includes(entry.action) &&
    entry.studentId !== undefined && entry.studentId !== null && validId(entry.studentId) &&
    typeof entry.reason === "string" && entry.reason.trim().length > 0 &&
    typeof entry.changedAt === "string" && Number.isFinite(Date.parse(entry.changedAt)) &&
    entry.actorRole === "admin"
  );
}

export function validateStatusMatch(task, nextStatus) {
  if (!taskStatuses.includes(nextStatus)) return;
  const hasMatch = task.matchedStudentId !== undefined && task.matchedStudentId !== null;
  if (!hasMatch && ["매칭 완료", "진행 중", "활동 완료"].includes(nextStatus)) {
    throw new Error("매칭 관리에서 신청자를 선택해 매칭한 후 상태를 변경해주세요.");
  }
  if (hasMatch && ["모집 중", "신청자 있음"].includes(nextStatus)) {
    throw new Error("매칭 관리에서 매칭을 해제한 후 모집 상태로 변경해주세요.");
  }
}
