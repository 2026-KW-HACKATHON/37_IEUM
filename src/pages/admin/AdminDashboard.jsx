import { useState } from "react";
import { initialTasks } from "../../data/tasks";

const taskStatuses = [
  "모집 중",
  "신청자 있음",
  "매칭 완료",
  "진행 중",
  "활동 완료",
  "취소"
];

function AdminDashboard() {
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  return (
    <div>
      <h1>운영 현황</h1>
      <p>등록된 전체 요청과 상태별 요청 수를 확인할 수 있습니다.</p>

      <h2>전체 요청 수</h2>
      <p>{initialTasks.length}건</p>

      <h2>상태별 요청 수</h2>
      <dl>
        {taskStatuses.map((status) => (
          <div key={status}>
            <dt>{status}</dt>
            <dd>
              {initialTasks.filter((task) => task.status === status).length}건
            </dd>
          </div>
        ))}
      </dl>

      <h2>전체 요청 목록</h2>
      {initialTasks.length === 0 ? (
        <p>등록된 요청이 없습니다.</p>
      ) : (
        initialTasks.map((task) => (
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
            </dl>
            <button
              type="button"
              aria-expanded={selectedTaskId === task.id}
              aria-controls={`task-detail-${task.id}`}
              onClick={() =>
                setSelectedTaskId((currentId) =>
                  currentId === task.id ? null : task.id
                )
              }
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
            </section>
          </article>
        ))
      )}
    </div>
  );
}

export default AdminDashboard;
