import { useState } from "react";
import { taskStatuses } from "../../data/tasks";
import { reviewStatuses, getReviewActions } from "../../data/taskReview";
import UserManagement from "./UserManagement";
import MatchingManagement from "./MatchingManagement";

function AdminDashboard({ tasks, users, applications, onStatusChange, onReviewChange, onMatchChange, storageError }) {
  const [adminView, setAdminView] = useState("requests");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("전체");
  const [nextStatus, setNextStatus] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [reviewFilter, setReviewFilter] = useState("전체");
  const [reviewAction, setReviewAction] = useState("");
  const [reviewReason, setReviewReason] = useState("");

  const filteredTasks = tasks.filter(
    (task) => (statusFilter === "전체" || task.status === statusFilter) &&
      (reviewFilter === "전체" || (task.reviewStatus ?? "검토 대기") === reviewFilter)
  );

  function toggleDetails(task) {
    setSelectedTaskId(selectedTaskId === task.id ? null : task.id);
    setNextStatus(task.status);
    setChangeReason("");
    setSaveError("");
    setSaveMessage("");
    setReviewAction("");
    setReviewReason("");
  }

  function handleStatusSave(event, task) {
    event.preventDefault();
    setSaveError("");
    setSaveMessage("");
    try {
      onStatusChange(task.id, nextStatus, changeReason);
      setChangeReason("");
      setSaveMessage(`‘${task.title}’ 요청을 ‘${nextStatus}’ 상태로 저장했습니다.`);
    } catch (error) {
      setSaveError(error.message);
    }
  }

  function handleReviewSave(event, task) {
    event.preventDefault();
    setSaveError("");
    setSaveMessage("");
    try {
      onReviewChange(task.id, reviewAction, reviewReason);
      if (reviewAction === "취소") setNextStatus("취소");
      setSaveMessage(`‘${task.title}’ 요청의 ‘${reviewAction}’ 조치를 저장했습니다.`);
      setReviewAction("");
      setReviewReason("");
    } catch (error) {
      setSaveError(error.message);
    }
  }

  if (adminView === "users") {
    return (
      <div>
        <h1>운영자 화면</h1>
        <button type="button" onClick={() => setAdminView("requests")}>
          운영 현황 / 요청 관리로 돌아가기
        </button>
        <UserManagement users={users} />
      </div>
    );
  }

  if (adminView === "matching") {
    return (
      <div>
        <h1>운영자 화면</h1>
        <button type="button" onClick={() => {
          setAdminView("requests");
          setSelectedTaskId(null);
          setSaveMessage("");
          setSaveError("");
        }}>
          운영 현황 / 요청 관리로 돌아가기
        </button>
        <MatchingManagement
          tasks={tasks}
          users={users}
          applications={applications}
          onMatchChange={onMatchChange}
          storageError={storageError}
        />
      </div>
    );
  }

  return (
    <div>
      <h1>운영 현황</h1>
      <button type="button" onClick={() => setAdminView("users")}>
        사용자 관리
      </button>
      <button type="button" onClick={() => setAdminView("matching")}>
        매칭 관리
      </button>
      <p>등록된 전체 요청과 상태별 요청 수를 확인할 수 있습니다.</p>

      <h2>전체 요청 수</h2>
      <p>{tasks.length}건</p>

      <h2>상태별 요청 수</h2>
      <dl>
        {taskStatuses.map((status) => (
          <div key={status}>
            <dt>{status}</dt>
            <dd>
              {tasks.filter((task) => task.status === status).length}건
            </dd>
          </div>
        ))}
      </dl>

      <h2>전체 요청 목록</h2>
      <label htmlFor="task-status-filter">요청 상태 </label>
      <select
        id="task-status-filter"
        value={statusFilter}
        onChange={(event) => {
          setStatusFilter(event.target.value);
          setSelectedTaskId(null);
          setSaveError("");
          setSaveMessage("");
        }}
      >
        <option value="전체">전체</option>
        {taskStatuses.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      <label htmlFor="task-review-filter"> 안전검토 상태 </label>
      <select
        id="task-review-filter"
        value={reviewFilter}
        onChange={(event) => {
          setReviewFilter(event.target.value);
          setSelectedTaskId(null);
          setSaveError("");
          setSaveMessage("");
        }}
      >
        <option value="전체">전체</option>
        {reviewStatuses.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      <p>조회 결과: {filteredTasks.length}건</p>
      {storageError && <p role="alert">{storageError}</p>}
      {saveError && <p role="alert">{saveError}</p>}
      {saveMessage && <p role="status">{saveMessage}</p>}
      {filteredTasks.length === 0 ? (
        <p>
          {tasks.length === 0
            ? "등록된 요청이 없습니다."
            : "선택한 조건의 요청이 없습니다."}
        </p>
      ) : (
        filteredTasks.map((task) => (
          <article key={task.id}>
            <h3>{task.title}</h3>
            <dl>
              <dt>활동 종류</dt>
              <dd>{task.category}</dd>
              <dt>날짜 / 시간</dt>
              <dd>{task.date}</dd>
              <dt>장소</dt>
              <dd>{task.place}</dd>
              <dt>현재 상태</dt>
              <dd>{task.status}</dd>
              <dt>안전검토 상태</dt>
              <dd>{task.reviewStatus ?? "검토 대기"}</dd>
            </dl>
            <button
              type="button"
              aria-expanded={selectedTaskId === task.id}
              aria-controls={`task-detail-${task.id}`}
              onClick={() => toggleDetails(task)}
            >
              {selectedTaskId === task.id ? "상세 닫기" : "상세 보기"}
            </button>
            <section
              id={`task-detail-${task.id}`}
              hidden={selectedTaskId !== task.id}
              aria-labelledby={`task-detail-title-${task.id}`}
            >
              <h4 id={`task-detail-title-${task.id}`}>요청 상세</h4>
              <dl>
                <dt>의뢰자</dt>
                <dd>{task.client}</dd>
                <dt>요청 내용</dt>
                <dd>{task.desc}</dd>
                <dt>예상 활동 시간</dt>
                <dd>{task.duration}</dd>
                <dt>봉사시간 안내</dt>
                <dd>{task.volTime}</dd>
              </dl>
              <p>공식 1365 인증 여부는 확인이 필요합니다.</p>

              <h4>의뢰 안전검토</h4>
              <p>보류·숨김은 요청의 진행 상태와 별도로 관리합니다. 취소 조치는 요청 상태도 ‘취소’로 변경합니다.</p>
              {task.status === "취소" ? (
                <p>취소된 요청에는 추가 안전검토 조치를 적용할 수 없습니다.</p>
              ) : (
                <form onSubmit={(event) => handleReviewSave(event, task)}>
                  <label htmlFor={`task-review-action-${task.id}`}>안전검토 조치 </label>
                  <select
                    id={`task-review-action-${task.id}`}
                    value={selectedTaskId === task.id ? reviewAction : ""}
                    onChange={(event) => {
                      setReviewAction(event.target.value);
                      setSaveError("");
                      setSaveMessage("");
                    }}
                    required
                    disabled={Boolean(storageError)}
                  >
                    <option value="">조치를 선택해주세요</option>
                    {getReviewActions(task).map((action) => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                  <div>
                    <label htmlFor={`task-review-reason-${task.id}`}>조치 사유 </label>
                    <textarea
                      id={`task-review-reason-${task.id}`}
                      value={selectedTaskId === task.id ? reviewReason : ""}
                      onChange={(event) => setReviewReason(event.target.value)}
                      required
                      disabled={Boolean(storageError)}
                    />
                  </div>
                  <button type="submit" disabled={Boolean(storageError) || !reviewAction || !reviewReason.trim()}>
                    조치 저장
                  </button>
                </form>
              )}

              <h4>안전검토 이력</h4>
              {task.reviewHistory?.length ? (
                <ol>
                  {task.reviewHistory.map((entry, index) => (
                    <li key={`${entry.changedAt}-${index}`}>
                      <p>
                        {entry.action === "취소"
                          ? "취소: 요청 상태를 ‘취소’로 변경"
                          : `${entry.action}: ${entry.fromReviewStatus} → ${entry.toReviewStatus}`}
                      </p>
                      <p>사유: {entry.reason}</p>
                      <p>운영자 · {new Date(entry.changedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>안전검토 이력이 없습니다.</p>
              )}

              <h4>요청 상태 관리</h4>
              <p>운영자가 확인한 요청 상태를 수동으로 변경합니다. 매칭 사용자와 봉사 인증은 별도로 관리합니다.</p>
              <p>이 브라우저에 저장되며 다른 기기와 공유되지는 않습니다.</p>
              <form onSubmit={(event) => handleStatusSave(event, task)}>
                <label htmlFor={`task-next-status-${task.id}`}>변경할 상태 </label>
                <select
                  id={`task-next-status-${task.id}`}
                  value={selectedTaskId === task.id ? nextStatus : task.status}
                  onChange={(event) => {
                    setNextStatus(event.target.value);
                    setSaveError("");
                    setSaveMessage("");
                  }}
                  disabled={Boolean(storageError)}
                >
                  {taskStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <div>
                  <label htmlFor={`task-change-reason-${task.id}`}>변경 사유 </label>
                  <textarea
                    id={`task-change-reason-${task.id}`}
                    value={selectedTaskId === task.id ? changeReason : ""}
                    onChange={(event) => setChangeReason(event.target.value)}
                    required
                    disabled={Boolean(storageError)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={Boolean(storageError) || nextStatus === task.status || !changeReason.trim()}
                >
                  상태 저장
                </button>
              </form>

              <h4>상태 변경 이력</h4>
              {task.statusHistory?.length ? (
                <ol>
                  {task.statusHistory.map((entry, index) => (
                    <li key={`${entry.changedAt}-${index}`}>
                      <p>{entry.fromStatus} → {entry.toStatus}</p>
                      <p>사유: {entry.reason}</p>
                      <p>
                        운영자 · {new Date(entry.changedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>상태 변경 이력이 없습니다.</p>
              )}
            </section>
          </article>
        ))
      )}
    </div>
  );
}

export default AdminDashboard;
