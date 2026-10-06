import { useState } from "react";
import { requestStatuses, volunteerTypes } from "../../data/noncontact";

function RequestManagement({ data, users, onCommand, disabled }) {
  const [filter, setFilter] = useState("전체");
  const requests = data.requests.filter((request) => filter === "전체" || request.status === filter);
  function submit(event, command, requestId) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (command === "register") {
      fields.capacity = Number(fields.capacity);
      fields.institutionApproved = fields.institutionApproved === "on";
    }
    if (onCommand(command, { requestId, ...fields })) event.currentTarget.reset();
  }
  return <section>
    <h2>의뢰 검토·봉사활동 등록</h2>
    <label htmlFor="request-filter">의뢰 검토 상태 </label>
    <select id="request-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
      {["전체", ...requestStatuses].map((status) => <option key={status}>{status}</option>)}
    </select>
    <p>조회 결과: {requests.length}건</p>
    {!requests.length && <p>선택한 조건의 의뢰가 없습니다.</p>}
    {requests.map((request) => {
      const activity = data.activities.find((item) => item.requestId === request.id);
      const requester = users.find((user) => user.id === request.requesterId);
      const start = request.period.split(" ~ ")[0] || "";
      const end = request.period.split(" ~ ")[1] || "";
      return <article key={request.id}>
        <h3>{request.title}</h3><p>{request.type} · {request.status}</p>
        <details><summary>의뢰 상세 / 검토</summary>
          <dl><dt>의뢰자</dt><dd>{requester?.name || request.requesterId}</dd>
            <dt>연락처</dt><dd>{requester?.phone || "미등록"}</dd>
            <dt>회원 유형</dt><dd>{requester?.requesterType === "family" ? "어르신 가족" : requester?.requesterType === "self" ? "어르신 본인" : "테스트 계정"}</dd>
            {requester?.address && <><dt>등록 주소</dt><dd>{requester.address}</dd></>}
            {requester?.ageGroup && <><dt>가입 연령대</dt><dd>{requester.ageGroup}</dd></>}
            <dt>의뢰 대상</dt><dd>{request.target}</dd><dt>필요한 도움</dt><dd>{request.description}</dd>
            <dt>어르신 상황</dt><dd>{request.situation}</dd><dt>희망 결과물</dt><dd>{request.desiredResult}</dd>
            <dt>희망 기간</dt><dd>{request.period}</dd></dl>
          {!activity && ["요청 접수", "운영자 검토"].includes(request.status) && <form onSubmit={(event) => submit(event, "request-review", request.id)}>
            <label htmlFor={`decision-${request.id}`}>의뢰 검토 결과 </label>
            <select id={`decision-${request.id}`} name="decision" required disabled={disabled}>
              <option value="">선택해주세요</option>
              {["운영자 검토", "승인", "반려", "수정 요청"].filter((value) => value !== request.status).map((value) => <option key={value}>{value}</option>)}
            </select>
            <div><label htmlFor={`reason-${request.id}`}>의뢰 검토 사유 </label>
              <textarea id={`reason-${request.id}`} name="reason" required disabled={disabled} /></div>
            <button disabled={disabled}>의뢰 검토 저장</button>
          </form>}
          {activity && <p>연결된 봉사활동: {activity.title} ({activity.id})</p>}
          {request.status === "수정 요청" && <p>의뢰자 수정·재접수 기능 연결을 기다리는 상태입니다.</p>}
          {request.status === "반려" && <p>반려된 의뢰입니다. 이 의뢰에서는 봉사활동을 등록할 수 없습니다.</p>}
          {!activity && request.status === "승인" && <form onSubmit={(event) => submit(event, "register", request.id)}>
            <h4>봉사활동 등록</h4>
            <p>등록 후 봉사활동 관리에서 모집을 시작해주세요.</p>
            <div><label htmlFor={`title-${request.id}`}>봉사활동 제목 </label><input id={`title-${request.id}`} name="title" defaultValue={request.title} required disabled={disabled} /></div>
            <div><label htmlFor={`type-${request.id}`}>봉사 유형 </label><select id={`type-${request.id}`} name="type" defaultValue={request.type} disabled={disabled}>{volunteerTypes.map((value) => <option key={value}>{value}</option>)}</select></div>
            {[["description", "활동 내용", request.description], ["target", "활동 대상", "어르신"], ["requirements", "필요한 역량", ""],
              ["resultType", "제출 결과물", request.desiredResult], ["evidence", "필수 증빙자료", ""], ["recognitionCriteria", "활동 인정 기준", ""]].map(([name, label, value]) => <div key={name}>
              <label htmlFor={`${name}-${request.id}`}>{label} </label><textarea id={`${name}-${request.id}`} name={name} defaultValue={value} required disabled={disabled} />
            </div>)}
            <div><label htmlFor={`start-${request.id}`}>활동 시작일 </label><input id={`start-${request.id}`} type="date" name="startDate" defaultValue={start} required disabled={disabled} /></div>
            <div><label htmlFor={`end-${request.id}`}>활동 종료일 </label><input id={`end-${request.id}`} type="date" name="endDate" defaultValue={end} required disabled={disabled} /></div>
            <div><label htmlFor={`deadline-${request.id}`}>제출 기한 </label><input id={`deadline-${request.id}`} type="date" name="deadline" defaultValue={end} required disabled={disabled} /></div>
            <div><label htmlFor={`capacity-${request.id}`}>모집 인원 </label><input id={`capacity-${request.id}`} type="number" name="capacity" min="1" step="1" defaultValue="1" required disabled={disabled} /></div>
            <div><label><input type="checkbox" name="institutionApproved" disabled={disabled} />기관 사전 승인 확인</label></div>
            <div><label htmlFor={`institution-${request.id}`}>승인 기관 </label><input id={`institution-${request.id}`} name="institutionName" disabled={disabled} /></div>
            <div><label htmlFor={`approval-${request.id}`}>사전 승인 근거 / 참조 </label><input id={`approval-${request.id}`} name="institutionApprovalRef" disabled={disabled} /></div>
            <p>기관 사전 승인 정보는 근거를 확인한 뒤 입력합니다. 앱 내부 의뢰 승인과 별개입니다.</p>
            <button disabled={disabled}>봉사활동 등록</button>
          </form>}
          <h4>의뢰 검토 이력</h4>
          {request.history.length ? <ol>{request.history.map((entry, index) => <li key={index}>{entry.action} · {entry.reason} · 운영자 · {new Date(entry.changedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</li>)}</ol> : <p>검토 이력이 없습니다.</p>}
        </details>
      </article>;
    })}
  </section>;
}
export default RequestManagement;
