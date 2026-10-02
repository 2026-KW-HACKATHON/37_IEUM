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
    </div>
  );
}

export default AdminDashboard;
