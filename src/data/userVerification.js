import { sampleUsers } from "./users.js";

export const verificationStatuses = { pending: "검증 대기", approved: "승인", rejected: "반려" };
export const userStorageKey = "ieum.users.v1";

function validReviewHistory(history) {
  return history === undefined || (Array.isArray(history) && history.every((entry) =>
    entry && entry.fromStatus === "pending" && ["approved", "rejected"].includes(entry.toStatus) &&
    typeof entry.reason === "string" && entry.reason.trim() && typeof entry.changedAt === "string" &&
    Number.isFinite(Date.parse(entry.changedAt)) && entry.actorRole === "admin"));
}

function validUsers(users) {
  return Array.isArray(users) && new Set(users.map((user) => user?.id)).size === users.length &&
    users.every((user) => user && typeof user.id === "string" && user.id.trim() &&
      typeof user.name === "string" && ["student", "requester"].includes(user.role) &&
      (user.verificationStatus === undefined || Object.hasOwn(verificationStatuses, user.verificationStatus)) &&
      (user.addressVerificationStatus === undefined || ["pending", "approved", "rejected"].includes(user.addressVerificationStatus)) &&
      validReviewHistory(user.verificationHistory) &&
      validReviewHistory(user.addressVerificationHistory));
}

export function readUserState(storage) {
  try {
    const saved = storage.getItem(userStorageKey);
    if (saved === null) return { users: sampleUsers, storageError: "" };
    const users = JSON.parse(saved);
    if (!validUsers(users)) throw new Error("invalid saved users");
    return { users, storageError: "" };
  } catch {
    return { users: sampleUsers, storageError: "저장된 사용자를 불러올 수 없어 테스트 예시를 표시합니다. 기존 데이터 보호를 위해 검증 처리와 새 매칭을 중단했습니다. 브라우저 저장 설정과 데이터를 확인해주세요." };
  }
}

export function reviewStudent(users, userId, nextStatus, reason) {
  const user = users.find((item) => item.id === userId);
  if (!user || user.role !== "student") throw new Error("대학생 사용자를 찾을 수 없습니다.");
  if (user.verificationStatus !== "pending") throw new Error("검증 대기 중인 제출 건만 처리할 수 있습니다.");
  if (!user.verificationSubmittedAt || !user.verificationSummary || !user.university) {
    throw new Error("제출 정보와 소속 대학을 확인할 수 없습니다.");
  }
  if (!["approved", "rejected"].includes(nextStatus)) throw new Error("승인 또는 반려를 선택해주세요.");
  if (typeof reason !== "string" || !reason.trim()) throw new Error("검증 처리 사유를 입력해주세요.");
  const changedAt = new Date().toISOString();
  return users.map((item) => item.id !== userId ? item : {
    ...item,
    verificationStatus: nextStatus,
    verificationHistory: [...(item.verificationHistory ?? []), {
      fromStatus: "pending", toStatus: nextStatus, reason: reason.trim(), changedAt, actorRole: "admin"
    }]
  });
}

export function reviewRequesterAddress(users, userId, nextStatus, reason) {
  const user = users.find((item) => item.id === userId);
  if (!user || user.role !== "requester") throw new Error("의뢰자를 찾을 수 없습니다.");
  if (user.addressVerificationStatus !== "pending" || !user.address) {
    throw new Error("주소 확인 대기 중인 제출 건만 처리할 수 있습니다.");
  }
  if (!["approved", "rejected"].includes(nextStatus)) throw new Error("주소 확인 승인 또는 반려를 선택해주세요.");
  if (typeof reason !== "string" || !reason.trim()) throw new Error("주소 확인 처리 사유를 입력해주세요.");
  const changedAt = new Date().toISOString();
  return users.map((item) => item.id !== userId ? item : {
    ...item,
    addressVerificationStatus: nextStatus,
    addressVerificationHistory: [...(item.addressVerificationHistory ?? []), {
      fromStatus: "pending", toStatus: nextStatus, reason: reason.trim(), changedAt, actorRole: "admin"
    }]
  });
}

export function saveUsers(storage, users) {
  try {
    storage.setItem(userStorageKey, JSON.stringify(users));
  } catch {
    throw new Error("브라우저에 저장하지 못해 검증 결과를 적용하지 않았습니다. 저장 공간과 브라우저 설정을 확인해주세요.");
  }
}
