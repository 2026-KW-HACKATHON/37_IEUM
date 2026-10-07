import { useState } from "react";
import { verificationStatuses } from "../../data/userVerification";

function getUserType(user) {
  if (user.role === "student") return "대학생";
  if (user.role === "requester" && user.requesterType === "self") return "어르신 본인";
  if (user.role === "requester" && user.requesterType === "family") return "어르신 가족";
  if (user.role === "requester") return "어르신 / 가족 (유형 확인 필요)";
  return "역할 확인 필요";
}

function UserManagement({ users, onVerificationChange, onAddressVerificationChange, onOpenFile, storageError }) {
  const [userFilter, setUserFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function resetDetails(userId = null) {
    setSelectedUserId(userId);
    setDecision("");
    setReason("");
    setMessage("");
    setErrorMessage("");
  }

  async function handleVerification(event, user) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    try {
      await onVerificationChange(user.id, decision, reason);
      setMessage(`‘${user.name}’ 검증을 ‘${verificationStatuses[decision]}’ 처리했습니다.`);
      setDecision("");
      setReason("");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleAddressVerification(event, user) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    try {
      await onAddressVerificationChange(user.id, decision, reason);
      setMessage(`‘${user.name}’ 주소 확인을 ‘${verificationStatuses[decision]}’ 처리했습니다.`);
      setDecision("");
      setReason("");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  const filteredUsers = users.filter((user) => {
    if (verificationFilter !== "all" &&
      (user.role !== "student" || user.verificationStatus !== verificationFilter)) return false;
    if (userFilter === "all") return true;
    if (userFilter === "student" || userFilter === "requester") return user.role === userFilter;
    return user.role === "requester" && user.requesterType === userFilter;
  });

  return (
    <section aria-labelledby="user-management-title">
      <h2 id="user-management-title">사용자 관리</h2>
      {users.some((user) => user.isDemo) && (
        <p>테스트용 샘플 데이터입니다. 실제 가입 사용자나 요청의 의뢰자와 연결된 정보가 아닙니다.</p>
      )}
      <p>전체 사용자: {users.length}명</p>
      <p>대학생 검증 대기: {users.filter((user) => user.role === "student" && user.verificationStatus === "pending").length}명</p>
      <p>주소 확인 대기: {users.filter((user) => user.role === "requester" && user.addressVerificationStatus === "pending").length}명</p>
      <p>학생 증빙과 의뢰자 주소를 확인한 뒤 처리하세요. 승인된 대학생만 새 매칭 대상으로 선택할 수 있습니다.</p>
      <label htmlFor="admin-user-filter">사용자 유형 </label>
      <select
        id="admin-user-filter"
        value={userFilter}
        onChange={(event) => {
          setUserFilter(event.target.value);
          resetDetails();
          setVerificationFilter("all");
        }}
      >
        <option value="all">전체</option>
        <option value="student">대학생</option>
        <option value="requester">어르신 / 가족 전체</option>
        <option value="self">어르신 본인</option>
        <option value="family">어르신 가족</option>
      </select>
      <label htmlFor="admin-verification-filter"> 대학생 검증 상태 </label>
      <select id="admin-verification-filter" value={verificationFilter} onChange={(event) => {
        setVerificationFilter(event.target.value);
        if (event.target.value !== "all") setUserFilter("student");
        resetDetails();
      }}>
        <option value="all">전체</option>
        {Object.entries(verificationStatuses).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <p>조회 결과: {filteredUsers.length}명</p>
      {storageError && <p role="alert">{storageError}</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {message && <p role="status">{message}</p>}

      {filteredUsers.length === 0 ? (
        <p>{users.length === 0 ? "등록된 사용자가 없습니다." : "선택한 유형의 사용자가 없습니다."}</p>
      ) : (
        filteredUsers.map((user) => {
          const linkedElder = users.find((item) =>
            item.id === user.linkedElderId && item.role === "requester" && item.requesterType === "self"
          );

          return (
            <article key={user.id}>
              <h3>{user.name}</h3>
              <p>{getUserType(user)}</p>
              {user.role === "student" && <p>검증 상태: {verificationStatuses[user.verificationStatus] || "미제출"}</p>}
              <button
                type="button"
                aria-expanded={selectedUserId === user.id}
                aria-controls={`user-detail-${user.id}`}
                onClick={() => resetDetails(selectedUserId === user.id ? null : user.id)}
              >
                {selectedUserId === user.id ? "기본 정보 닫기" : "기본 정보 보기"}
              </button>
              <section
                id={`user-detail-${user.id}`}
                hidden={selectedUserId !== user.id}
                aria-labelledby={`user-detail-title-${user.id}`}
              >
                <h4 id={`user-detail-title-${user.id}`}>사용자 기본 정보</h4>
                <dl>
                  <dt>사용자 ID</dt>
                  <dd>{user.id}</dd>
                  <dt>이름</dt>
                  <dd>{user.name}</dd>
                  <dt>사용자 유형</dt>
                  <dd>{getUserType(user)}</dd>
                  <dt>가입일</dt>
                  <dd>{user.joinedAt || "미등록"}</dd>
                  {user.role === "student" && (
                    <>
                      <dt>소속 대학</dt>
                      <dd>{user.university || "미등록"}</dd>
                      <dt>재학 증빙</dt>
                      <dd>{user.verificationDocumentPath
                        ? <button type="button" onClick={async () => {
                          setErrorMessage("");
                          try { await onOpenFile(user.verificationDocumentPath); }
                          catch (failure) { setErrorMessage(failure.message); }
                        }}>비공개 증빙 열기</button>
                        : user.verificationDocumentName || "미등록"}</dd>
                    </>
                  )}
                  {user.role === "requester" && user.requesterType === "family" && (
                    <>
                      <dt>대리 관계로 연결된 어르신</dt>
                      <dd>{linkedElder ? linkedElder.name : "연결 정보 없음"}</dd>
                    </>
                  )}
                  {user.role === "requester" && (
                    <>
                      <dt>거주지 주소</dt>
                      <dd>{user.address || "미등록"}</dd>
                      <dt>주소 확인 상태</dt>
                      <dd>{verificationStatuses[user.addressVerificationStatus] || "미제출"}</dd>
                    </>
                  )}
                </dl>
                {user.role === "requester" && user.addressVerificationStatus === "pending" && (
                  <form onSubmit={(event) => handleAddressVerification(event, user)}>
                    <h4>주소 확인 처리</h4>
                    <label htmlFor={`address-decision-${user.id}`}>확인 결과 </label>
                    <select id={`address-decision-${user.id}`} value={selectedUserId === user.id ? decision : ""}
                      onChange={(event) => setDecision(event.target.value)} required disabled={Boolean(storageError)}>
                      <option value="">결과를 선택해주세요</option>
                      <option value="approved">승인</option>
                      <option value="rejected">반려</option>
                    </select>
                    <div>
                      <label htmlFor={`address-reason-${user.id}`}>처리 사유 </label>
                      <textarea id={`address-reason-${user.id}`} value={selectedUserId === user.id ? reason : ""}
                        onChange={(event) => setReason(event.target.value)} required disabled={Boolean(storageError)} />
                    </div>
                    <button type="submit" disabled={Boolean(storageError) || !decision || !reason.trim()}>주소 확인 결과 저장</button>
                  </form>
                )}
                {user.addressVerificationHistory?.length > 0 && (
                  <>
                    <h4>주소 확인 이력</h4>
                    <ol>{user.addressVerificationHistory.map((entry, index) => (
                      <li key={`${entry.changedAt}-${index}`}>
                        {verificationStatuses[entry.fromStatus]} → {verificationStatuses[entry.toStatus]} · {entry.reason} · 운영자 · {new Date(entry.changedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </li>
                    ))}</ol>
                  </>
                )}
                {user.role === "student" && (
                  <>
                    <h4>활동자 검증 제출 정보</h4>
                    <p>제출 시각: {user.verificationSubmittedAt
                      ? new Date(user.verificationSubmittedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "미제출"}</p>
                    <p>제출 내용: {user.verificationSummary || "제출 정보 없음"}</p>
                    {user.verificationDocumentName && <p>선택한 증빙 사진: {user.verificationDocumentName} (파일 원본 미저장)</p>}
                    {user.isDemo && <p>실제 신원 증빙을 확인한 결과가 아닌 기능 검증용 처리입니다.</p>}
                    {user.verificationStatus === "pending" ? (
                      <form onSubmit={(event) => handleVerification(event, user)}>
                        <label htmlFor={`verification-decision-${user.id}`}>검증 처리 결과 </label>
                        <select id={`verification-decision-${user.id}`} value={selectedUserId === user.id ? decision : ""}
                          onChange={(event) => setDecision(event.target.value)} required disabled={Boolean(storageError)}>
                          <option value="">결과를 선택해주세요</option>
                          <option value="approved">승인</option>
                          <option value="rejected">반려</option>
                        </select>
                        <div>
                          <label htmlFor={`verification-reason-${user.id}`}>검증 처리 사유 </label>
                          <textarea id={`verification-reason-${user.id}`} value={selectedUserId === user.id ? reason : ""}
                            onChange={(event) => setReason(event.target.value)} required disabled={Boolean(storageError)} />
                        </div>
                        <button type="submit" disabled={Boolean(storageError) || !decision || !reason.trim()}>검증 결과 저장</button>
                      </form>
                    ) : <p>{user.verificationStatus ? "이미 처리된 검증 건입니다." : "검증 정보를 제출한 후 처리할 수 있습니다."}</p>}
                    <h4>검증 처리 이력</h4>
                    {user.verificationHistory?.length ? (
                      <ol>{user.verificationHistory.map((entry, index) => (
                        <li key={`${entry.changedAt}-${index}`}>
                          <p>{verificationStatuses[entry.fromStatus]} → {verificationStatuses[entry.toStatus]}</p>
                          <p>사유: {entry.reason}</p>
                          <p>운영자 · {new Date(entry.changedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
                        </li>
                      ))}</ol>
                    ) : <p>검증 처리 이력이 없습니다.</p>}
                  </>
                )}
              </section>
            </article>
          );
        })
      )}
    </section>
  );
}

export default UserManagement;
