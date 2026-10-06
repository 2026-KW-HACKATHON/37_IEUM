import { useState } from "react";
import { volunteerTypes } from "../../data/noncontact";
import { verificationStatuses } from "../../data/userVerification";

function VolunteerManagement({ data, users, onCommand, disabled, userStorageError }) {
  const [filter, setFilter] = useState("전체");
  const activities = data.activities.filter((item) => filter === "전체" || item.type === filter);
  function submit(event, command, ids) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (onCommand(command, { ...ids, ...fields })) event.currentTarget.reset();
  }
  return <section>
    <h2>봉사활동·모집·배정 관리</h2>
    <label htmlFor="volunteer-filter">봉사 유형 </label>
    <select id="volunteer-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>{["전체", ...volunteerTypes].map((value) => <option key={value}>{value}</option>)}</select>
    <p>조회 결과: {activities.length}건</p>
    {userStorageError && <p role="alert">{userStorageError}</p>}
    {!activities.length && <p>등록된 봉사활동이 없습니다.</p>}
    {activities.map((activity) => {
      const applications = data.applications.filter((item) => item.activityId === activity.id);
      const assignments = data.assignments.filter((item) => item.activityId === activity.id);
      const candidates = users.filter((user) => user.role === "student" && user.verificationStatus === "approved" &&
        applications.some((item) => item.studentId === user.id) && !assignments.some((item) => item.studentId === user.id));
      return <article key={activity.id}>
        <h3>{activity.title}</h3><p>{activity.type} · {activity.status}</p>
        <p>모집: {activity.recruitmentOpen ? "모집 중" : "모집 중지 / 시작 전"} · 배정 {assignments.length}/{activity.capacity}명</p>
        <details><summary>봉사활동 상세 / 모집·배정</summary>
          <dl>{[["활동 ID", activity.id], ["연결 의뢰 ID", activity.requestId], ["활동 내용", activity.description], ["활동 대상", activity.target],
            ["활동 기간", activity.period], ["필요한 역량", activity.requirements], ["결과물", activity.resultType], ["증빙자료", activity.evidence],
            ["인정 기준", activity.recognitionCriteria], ["제출 기한", activity.deadline], ["기관 사전 승인", activity.institutionApproved ? `${activity.institutionName} · ${activity.institutionApprovalRef}` : "미확인"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <form onSubmit={(event) => submit(event, activity.recruitmentOpen ? "close-recruitment" : "open-recruitment", { activityId: activity.id })}>
            <label htmlFor={`recruit-reason-${activity.id}`}>모집 처리 사유 </label><input id={`recruit-reason-${activity.id}`} name="reason" required disabled={disabled} />
            <button disabled={disabled || activity.status === "취소" || (!activity.recruitmentOpen && ["승인", "인증 완료"].includes(activity.status))}>{activity.recruitmentOpen ? "모집 종료" : "모집 시작"}</button>
          </form>
          <h4>신청자 확인</h4>
          {applications.length ? <ul>{applications.map((application) => {
            const student = users.find((user) => user.id === application.studentId);
            return <li key={application.id}>{student?.name || application.studentId} · {student?.university || "소속 미등록"} · {verificationStatuses[student?.verificationStatus] || "미제출"} · {new Date(application.appliedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</li>;
          })}</ul> : <p>신청자가 없습니다. 학생 참여 신청 연결 후 표시됩니다.</p>}
          <p>신청자가 있더라도 검증 승인된 학생만 배정할 수 있습니다.</p>
          {candidates.length > 0 && activity.recruitmentOpen && !["승인", "인증 완료", "취소"].includes(activity.status) && assignments.length < activity.capacity && <form onSubmit={(event) => submit(event, "assign", { activityId: activity.id })}>
            <label htmlFor={`student-${activity.id}`}>배정할 대학생 </label>
            <select id={`student-${activity.id}`} name="studentId" required disabled={disabled || Boolean(userStorageError)}><option value="">선택해주세요</option>{candidates.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
            <div><label htmlFor={`assign-reason-${activity.id}`}>배정 사유 </label><textarea id={`assign-reason-${activity.id}`} name="reason" required disabled={disabled} /></div>
            <button disabled={disabled || Boolean(userStorageError)}>봉사자 배정</button>
          </form>}
          <h4>사전교육 / 활동 안내</h4>
          <form onSubmit={(event) => submit(event, "guidance", { activityId: activity.id })}>
            {[["method", "활동 방법"], ["precautions", "주의사항"], ["resultFormat", "결과물 형식"], ["evidenceGuide", "증빙 방법"], ["logGuide", "활동일지 작성 방법"]].map(([name, label]) => <div key={name}>
              <label htmlFor={`${name}-${activity.id}`}>{label} </label><textarea id={`${name}-${activity.id}`} name={name} defaultValue={activity.guidance[name]} required disabled={disabled} /></div>)}
            <p>제출 기한: {activity.deadline} · 안내 저장은 학생의 교육 이수 확인을 대신하지 않습니다.</p>
            <button disabled={disabled}>활동 안내 저장</button>
          </form>
          <h4>배정 현황</h4>
          {!assignments.length && <p>배정된 봉사자가 없습니다.</p>}
          {assignments.map((assignment) => <div key={assignment.id}>
            <p>{users.find((user) => user.id === assignment.studentId)?.name || assignment.studentId} · {assignment.status}</p>
            {assignment.status === "봉사자 배정" && <form onSubmit={(event) => {
              event.preventDefault();
              const reason = new FormData(event.currentTarget).get("reason");
              const command = event.nativeEvent.submitter.value;
              if (onCommand(command, { assignmentId: assignment.id, reason })) event.currentTarget.reset();
            }}>
              <label htmlFor={`start-reason-${assignment.id}`}>배정 변경 / 활동 시작 사유 </label><input id={`start-reason-${assignment.id}`} name="reason" required disabled={disabled} />
              <button value="start" disabled={disabled}>활동 시작 확인</button><button value="release" disabled={disabled}>배정 해제</button>
            </form>}
          </div>)}
          <h4>운영 이력</h4>
          {activity.history.length ? <ol>{activity.history.map((entry, index) => <li key={index}>{entry.action} · {entry.reason} · 운영자 · {new Date(entry.changedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</li>)}</ol> : <p>운영 이력이 없습니다.</p>}
        </details>
      </article>;
    })}
  </section>;
}
export default VolunteerManagement;
