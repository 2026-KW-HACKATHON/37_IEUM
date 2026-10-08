export function localPhone(phone = "") {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("82") ? `0${digits.slice(2)}` : digits;
}

export function validateUserEdit(fields) {
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  const phone = typeof fields.phone === "string" ? localPhone(fields.phone) : "";
  const reason = typeof fields.reason === "string" ? fields.reason.trim() : "";
  if (!name || name.length > 50) throw new Error("이름을 1~50자로 입력해주세요.");
  if (!/^0\d{9,10}$/.test(phone)) throw new Error("전화번호를 0으로 시작하는 10~11자리로 입력해주세요.");
  if (!reason || reason.length > 500) throw new Error("처리 사유를 1~500자로 입력해주세요.");
  return { name, phone, reason };
}

export function requireManagedUser(users, userId, actor) {
  if (actor?.role !== "admin") throw new Error("운영자만 회원 정보를 변경할 수 있습니다.");
  const user = users.find((item) => item.id === userId);
  if (!user || !["student", "requester"].includes(user.role)) {
    throw new Error("수정·삭제할 일반 회원을 찾을 수 없습니다. 운영자 계정은 변경할 수 없습니다.");
  }
  return user;
}

export function editLocalUser(users, userId, fields, actor) {
  const user = requireManagedUser(users, userId, actor);
  const values = validateUserEdit(fields);
  if (users.some((item) => item.id !== userId && item.phone && localPhone(item.phone) === values.phone)) {
    throw new Error("이미 다른 회원이 사용 중인 전화번호입니다.");
  }
  const changedFields = ["name", "phone"].filter((field) =>
    (field === "phone" ? localPhone(user.phone) : user.name) !== values[field]);
  if (!changedFields.length) throw new Error("변경된 정보가 없습니다.");
  return users.map((item) => item.id !== userId ? item : {
    ...item, name: values.name, phone: values.phone,
    managementHistory: [...(item.managementHistory || []), {
      action: "기본정보 수정", changedFields, reason: values.reason,
      actorId: actor.id, changedAt: new Date().toISOString(),
    }],
  });
}

export function deletionBlockReason(userId, data, users) {
  if (data.requests.some((item) => item.requesterId === userId) ||
      data.applications.some((item) => item.studentId === userId) ||
      data.assignments.some((item) => item.studentId === userId)) {
    return "연결된 의뢰·신청·배정 기록이 있어 삭제할 수 없습니다. 기록 보존·정리 기준을 먼저 확인해주세요.";
  }
  if (users.some((item) => item.linkedElderId === userId)) {
    return "다른 회원의 어르신 연결 정보가 있어 삭제할 수 없습니다.";
  }
  return "";
}

export function deleteLocalUser(users, userId, fields, data, actor) {
  const user = requireManagedUser(users, userId, actor);
  if (fields.confirmName !== user.name || typeof fields.reason !== "string" ||
      !fields.reason.trim() || fields.reason.trim().length > 500) {
    throw new Error("삭제할 회원 이름과 처리 사유를 정확히 입력해주세요.");
  }
  const blocked = deletionBlockReason(userId, data, users);
  if (blocked) throw new Error(blocked);
  return users.filter((item) => item.id !== userId);
}
