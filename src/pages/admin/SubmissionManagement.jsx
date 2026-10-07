import { useState } from "react";

function SubmissionManagement({ data, users, onCommand, onOpenFile, disabled }) {
  const [filter, setFilter] = useState("전체");
  const [fileError, setFileError] = useState("");
  const assignments = data.assignments.filter((item) => filter === "전체" || item.status === filter);
  async function submit(event, command, assignmentId) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (command === "result-review") fields.recognizedMinutes = fields.recognizedMinutes === "" ? NaN : Number(fields.recognizedMinutes);
    if (await onCommand(command, { assignmentId, ...fields })) form.reset();
  }
  return <section>
    <h2>결과물 검토·내부 인증</h2>
    <p>결과물·활동일지·증빙자료의 최신 제출본을 검토합니다. 보완 요청 후 학생 재제출이 있어야 다시 검토할 수 있습니다.</p>
    <p>인증 완료는 서비스 내부 검토·인증 기록입니다. 공식 1365 등록 완료나 기관의 실적 승인을 의미하지 않습니다.</p>
    <label htmlFor="submission-filter">결과 검토 상태 </label><select id="submission-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
      {["전체", "봉사자 배정", "진행 중", "결과물 제출", "검토 중", "보완 요청", "재제출", "승인", "인증 완료"].map((value) => <option key={value}>{value}</option>)}
    </select>
    <p>조회 결과: {assignments.length}건</p>
    {!assignments.length && <p>선택한 조건의 배정·제출 기록이 없습니다.</p>}
    {assignments.map((assignment) => {
      const activity = data.activities.find((item) => item.id === assignment.activityId);
      const latest = assignment.submissions.at(-1);
      return <article key={assignment.id}>
        <h3>{activity.title}</h3><p>{users.find((user) => user.id === assignment.studentId)?.name || "사용자 정보 없음"} · {assignment.status}</p>
        <details><summary>결과물 / 검토 이력 보기</summary>
          <p>필수 결과물: {activity.resultType} · 필수 증빙: {activity.evidence}</p>
          <p>활동 인정 기준: {activity.recognitionCriteria}</p>
          {!latest && <p>아직 제출된 결과물이 없습니다.</p>}
          {assignment.submissions.map((submission, index) => <section key={submission.id}>
            <h4>{index + 1}차 제출{index === assignment.submissions.length - 1 ? " (최신)" : " (이전)"}</h4>
            {submission.isDemo && <p>테스트 제출 예시입니다. 실제 업로드된 파일이 아닙니다.</p>}
            <dl><dt>결과물 / 파일 참조</dt><dd>{submission.result}</dd><dt>활동일지</dt><dd>{submission.activityLog}</dd>
              <dt>증빙자료</dt><dd>{submission.evidence}</dd><dt>제출 활동 시간</dt><dd>{submission.workedMinutes}분</dd>
              <dt>제출 시각</dt><dd>{new Date(submission.submittedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</dd></dl>
            {fileError && <p role="alert">{fileError}</p>}
            {submission.resultFilePath && <button type="button" onClick={async () => {
              setFileError("");
              try { await onOpenFile(submission.resultFilePath); }
              catch (failure) { setFileError(failure instanceof Error ? failure.message : "결과물 파일을 열지 못했습니다."); }
            }}>결과물 파일 열기</button>}
            {submission.evidenceFilePath && <button type="button" onClick={async () => {
              setFileError("");
              try { await onOpenFile(submission.evidenceFilePath); }
              catch (failure) { setFileError(failure instanceof Error ? failure.message : "증빙자료 파일을 열지 못했습니다."); }
            }}>증빙자료 파일 열기</button>}
            {submission.review && <p>검토 결과: {submission.review.decision} · 사유: {submission.review.reason} · 내부 검토 시간: {submission.review.recognizedMinutes}분</p>}
          </section>)}
          {["결과물 제출", "재제출"].includes(assignment.status) && <button type="button" disabled={disabled} onClick={async () => onCommand("begin-review", { assignmentId: assignment.id })}>결과 검토 시작</button>}
          {assignment.status === "검토 중" && <form onSubmit={(event) => submit(event, "result-review", assignment.id)}>
            <label htmlFor={`result-${assignment.id}`}>결과 검토 결정 </label><select id={`result-${assignment.id}`} name="decision" required disabled={disabled}><option value="">선택해주세요</option><option>승인</option><option>보완 요청</option></select>
            <div><label htmlFor={`reason-${assignment.id}`}>결과 검토 사유 / 보완 내용 </label><textarea id={`reason-${assignment.id}`} name="reason" required disabled={disabled} /></div>
            <div><label htmlFor={`minutes-${assignment.id}`}>내부 검토 인정 시간 (분) </label><input id={`minutes-${assignment.id}`} name="recognizedMinutes" type="number" min="0" max={latest.workedMinutes} step="1" defaultValue={latest.workedMinutes} disabled={disabled} /></div>
            <p>승인 시 시간을 입력합니다. 보완 요청의 인정 시간은 0분으로 저장합니다. 기관 사전 승인: {activity.institutionApproved ? activity.institutionName : "미확인"}</p>
            <button disabled={disabled}>결과 검토 저장</button>
          </form>}
          {assignment.status === "보완 요청" && <p>학생의 결과물·활동일지·증빙 재제출을 기다리고 있습니다.</p>}
          {assignment.status === "승인" && <form onSubmit={(event) => submit(event, "certify", assignment.id)}>
            <label htmlFor={`reference-${assignment.id}`}>내부 인증 기록 번호 </label><input id={`reference-${assignment.id}`} name="reference" required disabled={disabled} />
            <div><label htmlFor={`note-${assignment.id}`}>내부 인증 근거 / 사유 </label><textarea id={`note-${assignment.id}`} name="note" required disabled={disabled} /></div>
            <button disabled={disabled}>내부 인증 완료 처리</button>
          </form>}
          {assignment.certification && <p>내부 인증: {assignment.certification.reference} · {assignment.certification.note} · {new Date(assignment.certification.certifiedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>}
          <h4>배정·결과 검토 이력</h4>
          {assignment.history.length ? <ol>{assignment.history.map((entry, index) => <li key={index}>{entry.action} · {entry.reason} · 운영자 · {new Date(entry.changedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</li>)}</ol> : <p>추가 처리 이력이 없습니다.</p>}
        </details>
      </article>;
    })}
  </section>;
}
export default SubmissionManagement;
