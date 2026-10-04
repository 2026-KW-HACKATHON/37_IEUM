import { useState } from "react";
import { taskStatuses } from "../../data/tasks";
import { verificationStatuses } from "../../data/userVerification";

function MatchingManagement({ tasks, users, applications, onMatchChange, storageError, userStorageError }) {
  const [statusFilter, setStatusFilter] = useState("전체");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [matchReason, setMatchReason] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const filteredTasks = tasks.filter((task) => statusFilter === "전체" || task.status === statusFilter);

  function toggleDetails(taskId) {
    setSelectedTaskId(selectedTaskId === taskId ? null : taskId);
    setSelectedStudentId("");
    setMatchReason("");
    setMessage("");
    setErrorMessage("");
  }

  function handleMatch(event, task, action) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    try {
      onMatchChange(task.id, action, selectedStudentId, matchReason);
      setMessage(`‘${task.title}’ 요청의 ${action} 처리를 저장했습니다.`);
      setMatchReason("");
      setSelectedStudentId("");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <section aria-labelledby="matching-management-title">
      <h2 id="matching-management-title">매칭 관리</h2>
      {applications.some((application) => application.isDemo) && (
        <p>신청자는 테스트용 예시입니다. 실제 학생의 신청 기록이 아니며, 기존 요청 상태를 자동으로 변경하지 않습니다.</p>
      )}
      <p>운영자가 확인한 신청자 한 명을 선택해 매칭합니다. 이 브라우저에 저장되며 다른 기기와 공유되지는 않습니다.</p>
      <label htmlFor="matching-status-filter">요청 상태 </label>
      <select
        id="matching-status-filter"
        value={statusFilter}
        onChange={(event) => {
          setStatusFilter(event.target.value);
          setSelectedTaskId(null);
          setMessage("");
          setErrorMessage("");
        }}
      >
        <option value="전체">전체</option>
        {taskStatuses.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      <p>조회 결과: {filteredTasks.length}건</p>
      {storageError && <p role="alert">{storageError}</p>}
      {userStorageError && <p role="alert">{userStorageError}</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {message && <p role="status">{message}</p>}

      {filteredTasks.length === 0 ? (
        <p>{tasks.length === 0 ? "등록된 요청이 없습니다." : "선택한 상태의 요청이 없습니다."}</p>
      ) : (
        filteredTasks.map((task) => {
          const taskApplications = applications.filter((application) => application.taskId === task.id);
          const hasMatchedStudent = task.matchedStudentId !== undefined && task.matchedStudentId !== null;
          const matchedStudent = hasMatchedStudent
            ? users.find((user) => user.id === task.matchedStudentId && user.role === "student")
            : null;
          const needsMatchInfo = !hasMatchedStudent && ["매칭 완료", "진행 중", "활동 완료"].includes(task.status);
          const applicantStudents = users.filter((user) => user.role === "student" &&
            taskApplications.some((application) => application.studentId === user.id));
          const approvedApplicants = applicantStudents.filter((student) => student.verificationStatus === "approved");
          const canCreate = !hasMatchedStudent && ["모집 중", "신청자 있음"].includes(task.status) &&
            task.reviewStatus === "정상" && approvedApplicants.length > 0 && !userStorageError;
          const canRelease = hasMatchedStudent && task.status === "매칭 완료";

          return (
            <article key={task.id}>
              <h3>{task.title}</h3>
              <dl>
                <dt>요청 상태</dt>
                <dd>{task.status}</dd>
                <dt>안전검토 상태</dt>
                <dd>{task.reviewStatus ?? "검토 대기"}</dd>
                <dt>신청자 수{taskApplications.some((application) => application.isDemo) ? " (테스트 예시)" : ""}</dt>
                <dd>{new Set(taskApplications.map((application) => application.studentId)).size}명</dd>
                <dt>매칭된 대학생</dt>
                <dd>
                  {matchedStudent ? matchedStudent.name
                    : hasMatchedStudent ? "연결된 사용자 정보 확인 필요" : "매칭 정보 없음"}
                </dd>
              </dl>
              {needsMatchInfo && <p>요청 상태에 해당하는 매칭 사용자 정보가 아직 연결되지 않았습니다.</p>}
              <button
                type="button"
                aria-expanded={selectedTaskId === task.id}
                aria-controls={`matching-detail-${task.id}`}
                onClick={() => toggleDetails(task.id)}
              >
                {selectedTaskId === task.id ? "신청자 / 매칭 정보 닫기" : "신청자 / 매칭 정보 보기"}
              </button>
              <section
                id={`matching-detail-${task.id}`}
                hidden={selectedTaskId !== task.id}
                aria-labelledby={`matching-detail-title-${task.id}`}
              >
                <h4 id={`matching-detail-title-${task.id}`}>신청자 및 현재 매칭 정보</h4>
                <p>의뢰자: {task.client || "정보 없음"}</p>
                <p>날짜 / 시간: {task.date || "정보 없음"}</p>
                <p>장소: {task.place || "정보 없음"}</p>
                <h4>신청 기록</h4>
                {taskApplications.length === 0 ? (
                  <p>등록된 신청 기록이 없습니다.</p>
                ) : (
                  <ul>
                    {taskApplications.map((application) => {
                      const student = users.find((user) => user.id === application.studentId && user.role === "student");
                      const validDate = Number.isFinite(Date.parse(application.appliedAt));
                      return (
                        <li key={application.id}>
                          <p>{student ? student.name : "신청자 사용자 정보 확인 필요"}</p>
                          <p>사용자 ID: {application.studentId}</p>
                          <p>소속 대학: {student?.university || "정보 없음"}</p>
                          <p>검증 상태: {verificationStatuses[student?.verificationStatus] || "미제출"}</p>
                          <p>신청 시각: {validDate
                            ? new Date(application.appliedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
                            : "정보 없음"}</p>
                          {application.isDemo && <p>테스트 신청 기록</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <h4>현재 매칭</h4>
                {hasMatchedStudent ? (
                  <dl>
                    <dt>매칭된 대학생 ID</dt>
                    <dd>{task.matchedStudentId}</dd>
                    <dt>이름</dt>
                    <dd>{matchedStudent?.name || "사용자 정보 확인 필요"}</dd>
                    <dt>소속 대학</dt>
                    <dd>{matchedStudent?.university || "정보 없음"}</dd>
                    <dt>매칭 시각</dt>
                    <dd>{task.matchedAt ? new Date(task.matchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "정보 없음"}</dd>
                  </dl>
                ) : (
                  <p>매칭된 대학생 ID가 등록되어 있지 않습니다.</p>
                )}
                {task.matchingIsDemo && <p>테스트 신청자로 생성한 매칭입니다.</p>}

                <h4>매칭 처리</h4>
                {!hasMatchedStudent && task.reviewStatus !== "정상" && (
                  <p>요청 관리에서 안전검토를 정상 처리한 후 매칭할 수 있습니다.</p>
                )}
                {!hasMatchedStudent && !["모집 중", "신청자 있음"].includes(task.status) && (
                  <p>모집 중 또는 신청자 있음 상태의 요청만 새로 매칭할 수 있습니다.</p>
                )}
                {!hasMatchedStudent && applicantStudents.length === 0 && <p>매칭할 수 있는 신청자가 없습니다.</p>}
                {!hasMatchedStudent && applicantStudents.length > 0 && approvedApplicants.length === 0 && (
                  <p>검증 승인된 신청자가 없습니다. 사용자 관리에서 대학생 검증을 먼저 처리해주세요.</p>
                )}
                {hasMatchedStudent && !canRelease && (
                  <p>활동 시작 전 매칭 완료 상태에서만 매칭을 해제할 수 있습니다.</p>
                )}
                {(canCreate || canRelease) && (
                  <form onSubmit={(event) => handleMatch(event, task, canRelease ? "매칭 해제" : "매칭")}>
                    {canCreate && (
                      <>
                        <label htmlFor={`matching-student-${task.id}`}>매칭할 대학생 </label>
                        <select
                          id={`matching-student-${task.id}`}
                          value={selectedTaskId === task.id ? selectedStudentId : ""}
                          onChange={(event) => setSelectedStudentId(event.target.value)}
                          required
                          disabled={Boolean(storageError)}
                        >
                          <option value="">신청자를 선택해주세요</option>
                          {approvedApplicants.map((student) => (
                            <option key={student.id} value={student.id}>{student.name}</option>
                          ))}
                        </select>
                      </>
                    )}
                    <div>
                      <label htmlFor={`matching-reason-${task.id}`}>매칭 처리 사유 </label>
                      <textarea
                        id={`matching-reason-${task.id}`}
                        value={selectedTaskId === task.id ? matchReason : ""}
                        onChange={(event) => setMatchReason(event.target.value)}
                        required
                        disabled={Boolean(storageError)}
                      />
                    </div>
                    <button type="submit" disabled={Boolean(storageError) || !matchReason.trim() || (canCreate && !selectedStudentId)}>
                      {canRelease ? "매칭 해제" : "매칭 확정"}
                    </button>
                  </form>
                )}

                <h4>매칭 변경 이력</h4>
                {task.matchingHistory?.length ? (
                  <ol>
                    {task.matchingHistory.map((entry, index) => (
                      <li key={`${entry.changedAt}-${index}`}>
                        <p>{entry.action} · 대학생 ID: {entry.studentId}</p>
                        <p>사유: {entry.reason}</p>
                        <p>운영자 · {new Date(entry.changedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
                      </li>
                    ))}
                  </ol>
                ) : <p>매칭 변경 이력이 없습니다.</p>}
              </section>
            </article>
          );
        })
      )}
    </section>
  );
}

export default MatchingManagement;
