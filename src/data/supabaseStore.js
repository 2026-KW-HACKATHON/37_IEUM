import { supabase } from "./supabaseClient";

export const emptyNoncontactState = {
  requests: [],
  activities: [],
  applications: [],
  assignments: [],
};

function throwIfError({ error }) {
  if (error) throw new Error(error.message || "Supabase 요청에 실패했습니다.");
}

function profileFromRow(row) {
  return {
    ...row.profile_data,
    id: row.id,
    role: row.role,
    requesterType: row.requester_type || undefined,
    name: row.name,
    phone: row.phone || "",
    university: row.university || "",
    ageGroup: row.age_group || "",
    address: row.address || "",
    addressZonecode: row.address_zonecode || "",
    verificationStatus: row.verification_status || undefined,
    verificationSubmittedAt: row.verification_submitted_at || undefined,
    verificationSummary: row.verification_summary || undefined,
    verificationDocumentName: row.verification_document_name || undefined,
    addressVerificationStatus: row.address_verification_status || undefined,
    addressSubmittedAt: row.address_submitted_at || undefined,
    joinedAt: row.joined_at,
  };
}

function profileToRow(user) {
  const {
    id, role, requesterType, name, phone, university, ageGroup, address,
    addressZonecode, verificationStatus, verificationSubmittedAt,
    verificationSummary, verificationDocumentName, addressVerificationStatus,
    addressSubmittedAt, joinedAt, ...profileData
  } = user;
  return {
    id, role, requester_type: requesterType || null, name, phone: phone || null,
    university: university || null, age_group: ageGroup || null,
    address: address || null, address_zonecode: addressZonecode || null,
    verification_status: verificationStatus || null,
    verification_submitted_at: verificationSubmittedAt || null,
    verification_summary: verificationSummary || null,
    verification_document_name: verificationDocumentName || null,
    address_verification_status: addressVerificationStatus || null,
    address_submitted_at: addressSubmittedAt || null,
    joined_at: joinedAt || new Date().toISOString().slice(0, 10),
    profile_data: profileData,
  };
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw new Error(error.message || "사용자 프로필을 불러오지 못했습니다.");
  if (data.account_management_lock) throw new Error("운영자가 계정을 처리 중입니다. 잠시 후 다시 로그인해주세요.");
  return profileFromRow(data);
}

export async function manageRemoteUser(action, userId, fields) {
  const { data, error } = await supabase.functions.invoke("admin-user-management", {
    body: { action, userId, ...fields },
  });
  if (error) {
    let message = "회원 관리 서버에 연결하지 못했습니다. Edge Function 배포와 DB 설정을 확인해주세요.";
    try {
      const result = await error.context?.json();
      if (result?.error) message = result.error;
    } catch { /* 서버 응답이 JSON이 아닌 경우 기본 안내를 사용합니다. */ }
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || "회원 처리를 완료하지 못했습니다.");
  return data;
}

export async function fetchUserManagementAudit() {
  const { data, error } = await supabase.from("user_management_audit")
    .select("id,actor_id,target_id,action,reason,changed_fields,status,created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("처리 이력을 불러오지 못했습니다. DB 설정을 확인해주세요.");
  return data;
}

export async function fetchUsers() {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw new Error(error.message || "사용자 목록을 불러오지 못했습니다.");
  return data.map(profileFromRow);
}

export async function saveProfile(profile) {
  const { error } = await supabase.from("profiles").update(profileToRow(profile)).eq("id", profile.id);
  if (error) throw new Error(error.message || "프로필을 저장하지 못했습니다.");
}

export async function fetchNoncontactState(profile) {
  let revision;
  let results;
  if (profile?.role === "admin") {
    const { data, error } = await supabase.rpc("read_ieum_admin_state");
    if (error) throw new Error("운영 정보를 불러오지 못했습니다. DB 마이그레이션 적용 여부를 확인해주세요.");
    revision = data.revision;
    results = ["requests", "activities", "applications", "assignments"].map((key) => ({ data: data[key], error: null }));
  } else results = await Promise.all([
    supabase.from("requests").select("id,requester_id,status,data"),
    supabase.from("activities").select("id,request_id,status,recruitment_open,capacity,data"),
    supabase.from("applications").select("id,activity_id,student_id,applied_at,data"),
    supabase.from("assignments").select("id,activity_id,student_id,status,data"),
  ]);
  const [requestsResult, activitiesResult, applicationsResult, assignmentsResult] = results;
  [requestsResult, activitiesResult, applicationsResult, assignmentsResult].forEach(throwIfError);

  return {
    ...(revision ? { revision } : {}),
    requests: requestsResult.data.map(({ data }) => data),
    activities: activitiesResult.data.map(({ data, ...row }) => ({
      ...data,
      id: row.id,
      requestId: row.request_id,
      status: row.status,
      recruitmentOpen: row.recruitment_open,
      capacity: row.capacity,
    })),
    applications: applicationsResult.data.map(({ data, ...row }) => ({
      ...data,
      id: row.id,
      activityId: row.activity_id,
      studentId: row.student_id,
      appliedAt: row.applied_at,
    })),
    assignments: assignmentsResult.data.map(({ data, ...row }) => ({
      ...data,
      id: row.id,
      activityId: row.activity_id,
      studentId: row.student_id,
      status: row.status,
    })),
  };
}

function requestRow(request) {
  return {
    id: request.id,
    requester_id: request.requesterId,
    status: request.status,
    data: request,
  };
}

function activityRow(activity) {
  return {
    id: activity.id,
    request_id: activity.requestId,
    status: activity.status,
    recruitment_open: activity.recruitmentOpen,
    capacity: activity.capacity,
    data: activity,
  };
}

function applicationRow(application) {
  const { id, activityId, studentId, appliedAt, ...data } = application;
  return {
    id,
    activity_id: activityId,
    student_id: studentId,
    applied_at: appliedAt,
    data: { ...data, isDemo: false },
  };
}

function assignmentRow(assignment) {
  return {
    id: assignment.id,
    activity_id: assignment.activityId,
    student_id: assignment.studentId,
    status: assignment.status,
    data: assignment,
  };
}

export async function persistAdminState(state, expectedRevision) {
  if (!expectedRevision) throw new Error("저장할 데이터 버전이 없습니다. 새로고침 후 다시 작업해주세요.");
  const { error } = await supabase.rpc("save_ieum_admin_state", {
    p_expected_revision: expectedRevision,
    p_requests: state.requests.filter((item) => !item.isDemo).map(requestRow),
    p_activities: state.activities.filter((item) => !item.isDemo).map(activityRow),
    p_applications: state.applications.filter((item) => !item.isDemo).map(applicationRow),
    p_assignments: state.assignments.filter((item) => !item.isDemo).map(assignmentRow),
  });
  if (error) {
    const failure = new Error(error.code === "40001"
      ? "다른 사용자의 변경 또는 처리 중인 작업이 감지됐습니다. 최신 정보를 확인하고 잠시 후 다시 저장해주세요."
      : error.message || "운영 변경사항을 저장하지 못했습니다.");
    failure.code = error.code;
    throw failure;
  }
}

export async function persistRequesterRequest(request) {
  const { error } = await supabase.from("requests").upsert(requestRow(request));
  if (error) throw new Error(error.message || "의뢰를 저장하지 못했습니다.");
}

export async function applyToRemoteActivity(activityId) {
  const { error } = await supabase.rpc("apply_to_ieum_activity", { p_activity_id: activityId });
  if (error) throw new Error(error.message || "활동을 신청하지 못했습니다.");
}

export async function submitRemoteActivityResult(assignmentId, fields) {
  const { error } = await supabase.rpc("submit_ieum_activity_result", {
    p_assignment_id: assignmentId,
    p_result: fields.result,
    p_activity_log: fields.activityLog,
    p_evidence: fields.evidence,
    p_worked_minutes: fields.workedMinutes,
    p_result_file_path: fields.resultFilePath || null,
    p_evidence_file_path: fields.evidenceFilePath || null,
  });
  if (error) throw new Error(error.message || "활동 결과를 제출하지 못했습니다.");
}

export async function uploadPrivateFile(file, userId, category) {
  if (!supabase) throw new Error("Supabase 파일 저장소 설정이 필요합니다.");
  if (!(file instanceof File)) throw new Error("업로드할 파일을 선택해주세요.");
  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    throw new Error("파일은 10MB 이하의 빈 파일이 아닌 자료만 업로드할 수 있습니다.");
  }
  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4"]);
  if (!allowedTypes.has(file.type)) throw new Error("PDF, JPG, PNG, WEBP, MP4 파일만 업로드할 수 있습니다.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${category}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("ieum-private").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message || "비공개 파일 저장에 실패했습니다.");
  return path;
}

export async function createPrivateFileUrl(path) {
  if (!supabase) throw new Error("Supabase 파일 저장소 설정이 필요합니다.");
  const { data, error } = await supabase.storage.from("ieum-private").createSignedUrl(path, 60);
  if (error) throw new Error(error.message || "비공개 파일 주소를 만들지 못했습니다.");
  return data.signedUrl;
}
