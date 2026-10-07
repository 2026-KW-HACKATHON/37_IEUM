import { initialNoncontactState, volunteerTypes, requestStatuses, volunteerStatuses } from "./noncontact.js";

export const noncontactStorageKey = "ieum.noncontact.v1";
const text = (value) => typeof value === "string" && value.trim().length > 0;
const date = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const timestamp = (value) => text(value) && Number.isFinite(Date.parse(value));
const id = () => globalThis.crypto.randomUUID();
const now = () => new Date().toISOString();
const minutes = (value) => Number.isSafeInteger(value) && value >= 0;
function requireText(value, message) { if (!text(value)) throw new Error(message); return value.trim(); }
function history(entry) { return entry && text(entry.action) && text(entry.reason) && timestamp(entry.changedAt) && entry.actorRole === "admin"; }
function addHistory(item, action, reason) { return [...item.history, { action, reason, changedAt: now(), actorRole: "admin" }]; }
function activityOf(state, activityId) {
  const activity = state.activities.find((item) => item.id === activityId);
  if (!activity || activity.status === "취소") throw new Error("운영 가능한 봉사활동을 찾을 수 없습니다.");
  return activity;
}
function assignmentOf(state, assignmentId) {
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment) throw new Error("배정 정보를 찾을 수 없습니다.");
  activityOf(state, assignment.activityId);
  return assignment;
}
function withAssignment(state, next) {
  const assignments = state.assignments.map((item) => item.id === next.id ? next : item);
  const related = assignments.filter((item) => item.activityId === next.activityId);
  // 인원이 여러 명이면 아직 끝나지 않은 봉사자의 가장 앞선 단계를 표시합니다.
  const order = volunteerStatuses.filter((status) => status !== "모집 중" && status !== "취소");
  const status = order.find((stage) => related.some((item) => item.status === stage));
  return { ...state, assignments, activities: state.activities.map((item) => item.id === next.activityId ? { ...item, status } : item) };
}

export function isValidNoncontactState(state) {
  if (!state || !["requests", "activities", "applications", "assignments"].every((key) =>
    Array.isArray(state[key]) && state[key].every((item) => item && text(item.id)) &&
    new Set(state[key].map((item) => item.id)).size === state[key].length)) return false;
  const validHistory = (item) => Array.isArray(item.history) && item.history.every(history);
  if (!state.requests.every((item) => text(item.title) && text(item.requesterId) && volunteerTypes.includes(item.type) &&
    requestStatuses.includes(item.status) && validHistory(item))) return false;
  if (!state.activities.every((item) => state.requests.some((request) => request.id === item.requestId) &&
    ["title", "description", "target", "period", "requirements", "resultType", "evidence", "recognitionCriteria"].every((field) => text(item[field])) &&
    volunteerTypes.includes(item.type) && volunteerStatuses.includes(item.status) && date(item.startDate) && date(item.endDate) && date(item.deadline) &&
    item.startDate <= item.endDate && item.deadline >= item.startDate && item.deadline <= item.endDate &&
    Number.isSafeInteger(item.capacity) && item.capacity > 0 && typeof item.recruitmentOpen === "boolean" && typeof item.institutionApproved === "boolean" &&
    (!item.institutionApproved || (text(item.institutionName) && text(item.institutionApprovalRef))) &&
    item.guidance && ["method", "precautions", "resultFormat", "evidenceGuide", "logGuide"].every((field) => typeof item.guidance[field] === "string") && validHistory(item))) return false;
  if (new Set(state.activities.map((item) => item.requestId)).size !== state.activities.length) return false;
  if (!state.applications.every((item) => state.activities.some((activity) => activity.id === item.activityId) && text(item.studentId) && timestamp(item.appliedAt))) return false;
  if (!state.assignments.every((item) => state.activities.some((activity) => activity.id === item.activityId) &&
    state.applications.some((application) => application.activityId === item.activityId && application.studentId === item.studentId) &&
    volunteerStatuses.includes(item.status) && !["모집 중", "취소"].includes(item.status) && timestamp(item.assignedAt) && validHistory(item) &&
    Array.isArray(item.submissions) && item.submissions.every((submission) => submission && text(submission.id) && timestamp(submission.submittedAt) &&
      text(submission.result) && text(submission.activityLog) && text(submission.evidence) && minutes(submission.workedMinutes) &&
      (!submission.review || (["승인", "보완 요청"].includes(submission.review.decision) && text(submission.review.reason) &&
        minutes(submission.review.recognizedMinutes) && submission.review.recognizedMinutes <= submission.workedMinutes && timestamp(submission.review.changedAt) && submission.review.actorRole === "admin"))) &&
    (!["결과물 제출", "검토 중", "보완 요청", "재제출", "승인", "인증 완료"].includes(item.status) || item.submissions.length > 0) &&
    (!["승인", "인증 완료"].includes(item.status) || item.submissions.at(-1)?.review?.decision === "승인") &&
    (item.status !== "보완 요청" || item.submissions.at(-1)?.review?.decision === "보완 요청") &&
    (item.status !== "인증 완료" || Boolean(item.certification)) &&
    (!item.certification || (text(item.certification.reference) && text(item.certification.note) && timestamp(item.certification.certifiedAt) &&
      item.certification.actorRole === "admin" && item.certification.scope === "internal" &&
      item.status === "인증 완료" && item.submissions.at(-1)?.review?.decision === "승인")))) return false;
  const pairs = state.assignments.map((item) => `${item.activityId}:${item.studentId}`);
  return new Set(pairs).size === pairs.length && state.activities.every((activity) =>
    state.assignments.filter((item) => item.activityId === activity.id).length <= activity.capacity);
}

export function readNoncontactState(storage) {
  try {
    const saved = storage.getItem(noncontactStorageKey);
    if (saved === null) return { data: initialNoncontactState, storageError: "" };
    const data = JSON.parse(saved);
    if (!isValidNoncontactState(data)) throw new Error("invalid noncontact state");
    return { data, storageError: "" };
  } catch {
    return { data: initialNoncontactState, storageError: "저장된 비대면 데이터를 읽을 수 없어 테스트 예시를 표시합니다. 기존 기록 보호를 위해 변경 저장을 중단했습니다." };
  }
}
export function saveNoncontactState(storage, state) {
  if (!isValidNoncontactState(state)) throw new Error("비대면 데이터 구조가 올바르지 않아 저장하지 않았습니다.");
  try { storage.setItem(noncontactStorageKey, JSON.stringify(state)); }
  catch { throw new Error("브라우저에 저장하지 못해 변경사항을 적용하지 않았습니다. 저장 설정과 공간을 확인해주세요."); }
}

export function submitRequesterRequest(state, request) {
  const requesterId = requireText(request.requesterId, "요청자 정보를 확인할 수 없습니다.");
  const title = requireText(request.title, "도움 제목을 입력해주세요.");
  const type = request.type;
  if (!volunteerTypes.includes(type)) throw new Error("도움 유형을 선택해주세요.");
  const target = requireText(request.target, "도움이 필요한 대상을 확인할 수 없습니다.");
  const description = requireText(request.description, "필요한 도움을 입력해주세요.");
  const desiredResult = requireText(request.desiredResult, "원하는 결과물을 선택해주세요.");
  const period = requireText(request.period, "희망 기간을 선택해주세요.");
  if (request.situation !== undefined && typeof request.situation !== "string") throw new Error("상황 설명을 확인해주세요.");
  if (request.note !== undefined && typeof request.note !== "string") throw new Error("기타 전달사항을 확인해주세요.");
  const nextRequest = {
    id: `request-${id()}`,
    requesterId,
    target,
    title,
    type,
    description,
    situation: request.situation?.trim() ?? "",
    note: request.note?.trim() ?? "",
    desiredResult,
    period,
    status: "요청 접수",
    isDemo: false,
    history: [],
    ...(request.ageGroup && { ageGroup: request.ageGroup }),
    ...(request.elderName && { elderName: request.elderName.trim() }),
  };
  return { ...state, requests: [nextRequest, ...state.requests] };
}

export function reviseRequesterRequest(state, requestId, requesterId, request) {
  const existing = state.requests.find((item) => item.id === requestId && item.requesterId === requesterId);
  if (!existing) throw new Error("수정할 의뢰를 찾을 수 없습니다.");
  if (existing.status !== "수정 요청") throw new Error("운영자가 수정을 요청한 의뢰만 다시 제출할 수 있습니다.");
  if (state.activities.some((activity) => activity.requestId === requestId)) throw new Error("봉사활동 등록이 시작된 의뢰는 수정할 수 없습니다.");
  const nextState = submitRequesterRequest(
    { ...state, requests: state.requests.filter((item) => item.id !== requestId) },
    { ...request, requesterId }
  );
  const replacement = nextState.requests[0];
  return {
    ...nextState,
    requests: nextState.requests.map((item) => item.id === replacement.id
      ? { ...item, id: requestId, status: "요청 접수" }
      : item),
  };
}

export function applyToActivity(state, users, activityId, studentId) {
  const activity = activityOf(state, activityId);
  if (!activity.recruitmentOpen || ["승인", "인증 완료", "취소"].includes(activity.status)) {
    throw new Error("현재 모집 중인 봉사활동이 아닙니다.");
  }
  const student = users.find((user) => user.id === studentId && user.role === "student");
  if (!student || student.verificationStatus !== "approved") throw new Error("검증 승인된 대학생만 신청할 수 있습니다.");
  if (state.applications.some((application) => application.activityId === activityId && application.studentId === studentId)) {
    throw new Error("이미 신청한 봉사활동입니다.");
  }
  if (state.assignments.filter((assignment) => assignment.activityId === activityId).length >= activity.capacity) {
    throw new Error("모집 인원이 모두 찼습니다.");
  }
  return {
    ...state,
    applications: [...state.applications, {
      id: `application-${id()}`,
      activityId,
      studentId,
      appliedAt: now(),
      isDemo: false,
    }],
  };
}

export function reviewRequest(state, requestId, decision, reason) {
  const request = state.requests.find((item) => item.id === requestId);
  if (!request) throw new Error("의뢰를 찾을 수 없습니다.");
  if (state.activities.some((item) => item.requestId === requestId)) throw new Error("봉사활동으로 등록된 의뢰는 다시 검토할 수 없습니다.");
  if (!["요청 접수", "운영자 검토"].includes(request.status)) throw new Error("접수 또는 검토 중인 의뢰만 처리할 수 있습니다.");
  if (!["운영자 검토", "승인", "반려", "수정 요청"].includes(decision) || decision === request.status) throw new Error("다른 검토 결과를 선택해주세요.");
  reason = requireText(reason, "의뢰 검토 사유를 입력해주세요.");
  return { ...state, requests: state.requests.map((item) => item.id === requestId ?
    { ...item, status: decision, history: addHistory(item, decision, reason) } : item) };
}

export function registerVolunteerActivity(state, requestId, fields) {
  const request = state.requests.find((item) => item.id === requestId);
  if (!request || request.status !== "승인") throw new Error("승인된 의뢰만 봉사활동으로 등록할 수 있습니다.");
  if (state.activities.some((item) => item.requestId === requestId)) throw new Error("이미 봉사활동으로 등록된 의뢰입니다.");
  const next = {};
  for (const key of ["title", "description", "target", "requirements", "resultType", "evidence", "recognitionCriteria"]) {
    next[key] = requireText(fields[key], "봉사활동 필수 정보를 모두 입력해주세요.");
  }
  if (!volunteerTypes.includes(fields.type)) throw new Error("비대면 봉사 유형을 선택해주세요.");
  if (![fields.startDate, fields.endDate, fields.deadline].every(date) || fields.startDate > fields.endDate ||
    fields.deadline < fields.startDate || fields.deadline > fields.endDate) throw new Error("활동 기간과 기간 내 제출 기한을 확인해주세요.");
  if (!Number.isSafeInteger(fields.capacity) || fields.capacity < 1) throw new Error("모집 인원을 1명 이상의 정수로 입력해주세요.");
  if (fields.institutionApproved && (!text(fields.institutionName) || !text(fields.institutionApprovalRef))) throw new Error("사전 승인 기관과 승인 근거를 입력해주세요.");
  const activity = { ...next, id: id(), requestId, type: fields.type, startDate: fields.startDate, endDate: fields.endDate,
    deadline: fields.deadline, period: `${fields.startDate} ~ ${fields.endDate}`, capacity: fields.capacity, status: "모집 중", recruitmentOpen: false,
    institutionApproved: Boolean(fields.institutionApproved), institutionName: fields.institutionName?.trim() || "",
    institutionApprovalRef: fields.institutionApprovalRef?.trim() || "", isDemo: Boolean(request.isDemo),
    guidance: { method: "", precautions: "", resultFormat: "", evidenceGuide: "", logGuide: "" },
    history: [{ action: "봉사활동 등록", reason: "승인된 의뢰를 봉사활동으로 등록", changedAt: now(), actorRole: "admin" }] };
  return { ...state, activities: [...state.activities, activity] };
}

export function setRecruitment(state, activityId, open, reason) {
  const activity = activityOf(state, activityId);
  reason = requireText(reason, "모집 처리 사유를 입력해주세요.");
  if (typeof open !== "boolean" || open === activity.recruitmentOpen) throw new Error("현재와 다른 모집 상태를 선택해주세요.");
  if (open && ["승인", "인증 완료"].includes(activity.status)) throw new Error("승인·인증된 활동의 모집을 다시 시작할 수 없습니다.");
  return { ...state, activities: state.activities.map((item) => item.id === activityId ?
    { ...item, recruitmentOpen: open, history: addHistory(item, open ? "모집 시작" : "모집 종료", reason) } : item) };
}

export function assignVolunteer(state, users, activityId, studentId, reason) {
  const activity = activityOf(state, activityId);
  if (["승인", "인증 완료"].includes(activity.status)) throw new Error("최종 승인·인증된 활동에는 새 봉사자를 배정할 수 없습니다.");
  if (!activity.recruitmentOpen) throw new Error("모집을 시작한 활동만 배정할 수 있습니다.");
  const student = users.find((item) => item.id === studentId && item.role === "student");
  if (!student || student.verificationStatus !== "approved") throw new Error("검증 승인된 대학생만 배정할 수 있습니다.");
  if (!state.applications.some((item) => item.activityId === activityId && item.studentId === studentId)) throw new Error("해당 봉사활동 신청자를 선택해주세요.");
  const assigned = state.assignments.filter((item) => item.activityId === activityId);
  if (assigned.some((item) => item.studentId === studentId)) throw new Error("이미 배정된 대학생입니다.");
  if (assigned.length >= activity.capacity) throw new Error("모집 인원이 모두 배정되었습니다.");
  reason = requireText(reason, "배정 사유를 입력해주세요.");
  const assignment = { id: id(), activityId, studentId, assignedAt: now(), status: "봉사자 배정", submissions: [],
    history: [{ action: "봉사자 배정", reason, changedAt: now(), actorRole: "admin" }] };
  return withAssignment({ ...state, assignments: [...state.assignments, assignment] }, assignment);
}

export function releaseAssignment(state, assignmentId, reason) {
  const assignment = assignmentOf(state, assignmentId);
  if (assignment.status !== "봉사자 배정") throw new Error("활동 시작 전 배정만 해제할 수 있습니다.");
  reason = requireText(reason, "배정 해제 사유를 입력해주세요.");
  const next = { ...state, assignments: state.assignments.filter((item) => item.id !== assignmentId), activities: state.activities.map((item) =>
    item.id === assignment.activityId ? { ...item, history: addHistory(item, "배정 해제", `${assignment.studentId}: ${reason}`) } : item) };
  const remaining = next.assignments.find((item) => item.activityId === assignment.activityId);
  return remaining ? withAssignment(next, remaining) : { ...next, activities: next.activities.map((item) => item.id === assignment.activityId ? { ...item, status: "모집 중" } : item) };
}

export function saveGuidance(state, activityId, guidance) {
  activityOf(state, activityId);
  const next = {};
  for (const key of ["method", "precautions", "resultFormat", "evidenceGuide", "logGuide"]) next[key] = requireText(guidance[key], "활동 안내 필수 항목을 모두 입력해주세요.");
  return { ...state, activities: state.activities.map((item) => item.id === activityId ?
    { ...item, guidance: next, history: addHistory(item, "활동 안내 저장", "활동 방법·주의사항·제출 안내 갱신") } : item) };
}
export function startAssignment(state, assignmentId, reason) {
  const assignment = assignmentOf(state, assignmentId);
  const activity = activityOf(state, assignment.activityId);
  if (assignment.status !== "봉사자 배정") throw new Error("배정된 봉사자만 활동을 시작할 수 있습니다.");
  if (!Object.values(activity.guidance).every(text)) throw new Error("사전교육 / 활동 안내를 먼저 저장해주세요.");
  reason = requireText(reason, "활동 시작 확인 사유를 입력해주세요.");
  return withAssignment(state, { ...assignment, status: "진행 중", history: addHistory(assignment, "활동 시작 확인", reason) });
}

// 학생 화면 연결용: 실제 제출 권한·파일 저장은 서버에서 구현해야 합니다.
export function submitVolunteerResult(state, assignmentId, studentId, fields) {
  const assignment = assignmentOf(state, assignmentId);
  if (assignment.studentId !== studentId || !["진행 중", "보완 요청"].includes(assignment.status)) throw new Error("본인에게 배정된 진행 중 또는 보완 요청 활동만 제출할 수 있습니다.");
  const submission = { id: id(), result: requireText(fields.result, "결과물이 필요합니다."), activityLog: requireText(fields.activityLog, "활동일지가 필요합니다."),
    evidence: requireText(fields.evidence, "증빙자료가 필요합니다."), workedMinutes: fields.workedMinutes, submittedAt: now(), isDemo: Boolean(fields.isDemo) };
  if (!minutes(fields.workedMinutes) || fields.workedMinutes === 0) throw new Error("활동 시간을 양의 정수(분)로 입력해주세요.");
  return withAssignment(state, { ...assignment, status: assignment.status === "보완 요청" ? "재제출" : "결과물 제출", submissions: [...assignment.submissions, submission] });
}
export function beginResultReview(state, assignmentId) {
  const assignment = assignmentOf(state, assignmentId);
  if (!["결과물 제출", "재제출"].includes(assignment.status) || !assignment.submissions.length) throw new Error("제출 또는 재제출된 결과물만 검토할 수 있습니다.");
  return withAssignment(state, { ...assignment, status: "검토 중", history: addHistory(assignment, "검토 시작", "최신 제출물 검토 시작") });
}
export function reviewVolunteerResult(state, assignmentId, decision, reason, recognizedMinutes) {
  const assignment = assignmentOf(state, assignmentId);
  if (assignment.status !== "검토 중" || !assignment.submissions.length) throw new Error("검토를 시작한 제출물만 처리할 수 있습니다.");
  if (!["승인", "보완 요청"].includes(decision)) throw new Error("승인 또는 보완 요청을 선택해주세요.");
  reason = requireText(reason, "결과 검토 사유를 입력해주세요.");
  const latest = assignment.submissions.at(-1);
  if (decision === "승인" && (!minutes(recognizedMinutes) || recognizedMinutes > latest.workedMinutes)) throw new Error("인정 시간은 제출 활동 시간 이내의 정수(분)로 입력해주세요.");
  const review = { decision, reason, recognizedMinutes: decision === "승인" ? recognizedMinutes : 0, changedAt: now(), actorRole: "admin" };
  return withAssignment(state, { ...assignment, status: decision, history: addHistory(assignment, decision, reason),
    submissions: assignment.submissions.map((item, index) => index === assignment.submissions.length - 1 ? { ...item, review } : item) });
}
export function certifyVolunteerResult(state, assignmentId, reference, note) {
  const assignment = assignmentOf(state, assignmentId);
  if (assignment.status !== "승인" || assignment.submissions.at(-1)?.review?.decision !== "승인") throw new Error("최신 결과물이 승인된 활동만 내부 인증할 수 있습니다.");
  reference = requireText(reference, "내부 인증 기록 번호를 입력해주세요.");
  note = requireText(note, "인증 근거와 사유를 입력해주세요.");
  return withAssignment(state, { ...assignment, status: "인증 완료", certification: { reference, note, certifiedAt: now(), actorRole: "admin", scope: "internal" },
    history: addHistory(assignment, "내부 인증 완료", `${reference}: ${note}`) });
}
