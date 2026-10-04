import { useState } from "react";

function getUserType(user) {
  if (user.role === "student") return "대학생";
  if (user.role === "requester" && user.requesterType === "self") return "어르신 본인";
  if (user.role === "requester" && user.requesterType === "family") return "어르신 가족";
  if (user.role === "requester") return "어르신 / 가족 (유형 확인 필요)";
  return "역할 확인 필요";
}

function UserManagement({ users }) {
  const [userFilter, setUserFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState(null);

  const filteredUsers = users.filter((user) => {
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
      <label htmlFor="admin-user-filter">사용자 유형 </label>
      <select
        id="admin-user-filter"
        value={userFilter}
        onChange={(event) => {
          setUserFilter(event.target.value);
          setSelectedUserId(null);
        }}
      >
        <option value="all">전체</option>
        <option value="student">대학생</option>
        <option value="requester">어르신 / 가족 전체</option>
        <option value="self">어르신 본인</option>
        <option value="family">어르신 가족</option>
      </select>
      <p>조회 결과: {filteredUsers.length}명</p>

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
              <button
                type="button"
                aria-expanded={selectedUserId === user.id}
                aria-controls={`user-detail-${user.id}`}
                onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
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
                    </>
                  )}
                  {user.role === "requester" && user.requesterType === "family" && (
                    <>
                      <dt>대리 관계로 연결된 어르신</dt>
                      <dd>{linkedElder ? linkedElder.name : "연결 정보 없음"}</dd>
                    </>
                  )}
                </dl>
              </section>
            </article>
          );
        })
      )}
    </section>
  );
}

export default UserManagement;
