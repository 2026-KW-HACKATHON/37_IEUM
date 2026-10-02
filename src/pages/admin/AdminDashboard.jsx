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
          </article>
        ))
      )}
    </div>
  );
}

export default AdminDashboard;
