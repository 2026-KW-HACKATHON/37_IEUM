import { useState } from "react";
import { taskStatuses } from "../../data/tasks";

function MatchingManagement({ tasks, users, applications }) {
  const [statusFilter, setStatusFilter] = useState("전체");
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const filteredTasks = tasks.filter((task) => statusFilter === "전체" || task.status === statusFilter);

  return (
    <section aria-labelledby="matching-management-title">
      <h2 id="matching-management-title">매칭 관리</h2>
      {applications.some((application) => application.isDemo) && (
        <p>신청자는 테스트용 예시입니다. 실제 학생의 신청 기록이 아니며, 기존 요청 상태를 자동으로 변경하지 않습니다.</p>
      )}
      <p>현재 단계는 신청자와 매칭 정보 조회입니다. 매칭 생성·해제 기능은 아직 연결되지 않았습니다.</p>
      <label htmlFor="matching-status-filter">요청 상태 </label>
      <select
        id="matching-status-filter"
        value={statusFilter}
        onChange={(event) => {
          setStatusFilter(event.target.value);
          setSelectedTaskId(null);
        }}
      >
        <option value="전체">전체</option>
        {taskStatuses.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      <p>조회 결과: {filteredTasks.length}건</p>

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

          return (
            <article key={task.id}>
              <h3>{task.title}</h3>
              <dl>
                <dt>요청 상태</dt>
                <dd>{task.status}</dd>
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
                onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
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
                  </dl>
                ) : (
                  <p>매칭된 대학생 ID가 등록되어 있지 않습니다.</p>
                )}
              </section>
            </article>
          );
        })
      )}
    </section>
  );
}

export default MatchingManagement;
