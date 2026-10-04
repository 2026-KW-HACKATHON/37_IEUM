import { useState } from "react";
import { activityReviewResults, getActivityExceptions } from "../../data/activityReview";

function formatTime(value) {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "기록 없음";
}

function ActivityManagement({ tasks, users, activities, onActivityReview, storageError }) {
  const [filter, setFilter] = useState("전체");
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const visibleActivities = activities.filter((activity) => {
    const task = tasks.find((item) => item.id === activity.taskId);
    const review = task?.activityReview?.activityId === activity.id ? task.activityReview.result : "검토 전";
    return filter === "전체" || (filter === "예외 기록" ? getActivityExceptions(activity).length > 0 : review === filter);
  });

  function resetDetails(id = null) {
    setSelectedId(id);
    setResult("");
    setReason("");
    setEvidence("");
    setMessage("");
    setError("");
  }

  function saveReview(event, activity) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      onActivityReview(activity.id, result, reason, evidence);
      setMessage(`활동 검토 결과 ‘${result}’ 처리를 저장했습니다.`);
      setResult("");
      setReason("");
      setEvidence("");
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <section aria-labelledby="activity-management-title">
      <h2 id="activity-management-title">활동 완료·예외 검토</h2>
      {activities.some((activity) => activity.isDemo) && <p>테스트용 활동 기록입니다. 실제 활동이나 의뢰자 확인 기록이 아닙니다.</p>}
      <p>완료 확인 시 요청 상태도 ‘활동 완료’로 변경합니다. 보류·미완료는 검토 결과만 저장하고 요청 상태는 유지합니다.</p>
      <p>활동 완료 상태만으로 봉사시간 인정이나 1365 등록이 확정되지 않습니다. 최종 인정 시간과 인증 처리는 별도입니다.</p>
      <label htmlFor="activity-review-filter">활동 검토 조건 </label>
      <select id="activity-review-filter" value={filter} onChange={(event) => {
        setFilter(event.target.value);
        resetDetails();
      }}>
        {["전체", "검토 전", "예외 기록", ...activityReviewResults].map((value) => <option key={value}>{value}</option>)}
      </select>
      <p>조회 결과: {visibleActivities.length}건</p>
      {storageError && <p role="alert">{storageError}</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {visibleActivities.length === 0 && <p>선택한 조건의 활동 기록이 없습니다.</p>}
      {visibleActivities.map((activity) => {
        const task = tasks.find((item) => item.id === activity.taskId);
        const student = users.find((user) => user.id === activity.studentId);
        const issues = getActivityExceptions(activity);
        const currentReview = task?.activityReview?.activityId === activity.id ? task.activityReview : null;
        const canReview = task && task.matchedStudentId === activity.studentId &&
          ["진행 중", "활동 완료"].includes(task.status);
        return (
          <article key={activity.id}>
            <h3>{task?.title || "연결된 요청 없음"}</h3>
            <p>대학생: {student?.name || activity.studentId}</p>
            <p>요청 상태: {task?.status || "정보 없음"}</p>
            <p>현재 검토 결과: {currentReview?.result || "검토 전"}</p>
            <button type="button" aria-expanded={selectedId === activity.id}
              aria-controls={`activity-detail-${activity.id}`}
              onClick={() => resetDetails(selectedId === activity.id ? null : activity.id)}>
              {selectedId === activity.id ? "활동 기록 닫기" : "활동 기록 보기"}
            </button>
            {selectedId === activity.id && <section id={`activity-detail-${activity.id}`}>
              <h4>활동 확인 기록</h4>
              <dl>
                <dt>활동 ID</dt><dd>{activity.id}</dd>
                <dt>체크인</dt><dd>{formatTime(activity.checkedInAt)}</dd>
                <dt>체크아웃</dt><dd>{formatTime(activity.checkedOutAt)}</dd>
                <dt>의뢰자 확인</dt><dd>{activity.requesterConfirmation === "confirmed" ? "완료 확인" : activity.requesterConfirmation === "disputed" ? "이의 있음" : "확인 필요"}</dd>
                <dt>의뢰자 확인 내용</dt><dd>{activity.requesterNote || "내용 없음"}</dd>
              </dl>
              <h4>예외 확인 사항</h4>
              {issues.length ? <ul>{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul> : <p>기록상 예외 확인 사항이 없습니다.</p>}
              {!canReview ? <p>현재 매칭된 학생의 활동이며 요청이 진행 중 또는 활동 완료일 때 검토할 수 있습니다. 기록만으로 요청을 자동 완료하지 않습니다.</p> : (
                <form onSubmit={(event) => saveReview(event, activity)}>
                  <label htmlFor={`activity-result-${activity.id}`}>활동 검토 결과 </label>
                  <select id={`activity-result-${activity.id}`} value={result} onChange={(event) => setResult(event.target.value)} required disabled={Boolean(storageError)}>
                    <option value="">결과를 선택해주세요</option>
                    {activityReviewResults.map((value) => <option key={value}>{value}</option>)}
                  </select>
                  <div><label htmlFor={`activity-reason-${activity.id}`}>활동 검토 사유 </label>
                    <textarea id={`activity-reason-${activity.id}`} value={reason} onChange={(event) => setReason(event.target.value)} required disabled={Boolean(storageError)} /></div>
                  <div><label htmlFor={`activity-evidence-${activity.id}`}>증빙 확인 내용 / 자료 참조 </label>
                    <textarea id={`activity-evidence-${activity.id}`} value={evidence} onChange={(event) => setEvidence(event.target.value)}
                      required={result === "완료 확인" && issues.length > 0} disabled={Boolean(storageError)} /></div>
                  <p>예외 기록을 완료 확인하는 경우 확인한 증빙 또는 자료 참조가 필요합니다.</p>
                  <button type="submit" disabled={Boolean(storageError) || !result || !reason.trim() || (result === "완료 확인" && issues.length > 0 && !evidence.trim())}>활동 검토 저장</button>
                </form>
              )}
              <h4>활동 검토 이력</h4>
              {task?.activityReviewHistory?.some((entry) => entry.activityId === activity.id) ? <ol>
                {task.activityReviewHistory.filter((entry) => entry.activityId === activity.id).map((entry, index) => <li key={`${entry.changedAt}-${index}`}>
                  <p>{entry.result} · 사유: {entry.reason}</p>
                  <p>증빙 확인: {entry.evidence || "추가 증빙 없음"}</p>
                  <p>운영자 · {formatTime(entry.changedAt)}{entry.isDemo ? " · 테스트 기록 검토" : ""}</p>
                </li>)}
              </ol> : <p>활동 검토 이력이 없습니다.</p>}
            </section>}
          </article>
        );
      })}
    </section>
  );
}

export default ActivityManagement;
