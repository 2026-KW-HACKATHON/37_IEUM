import { useState } from "react";
import UserManagement from "./UserManagement";
import RequestManagement from "./RequestManagement";
import VolunteerManagement from "./VolunteerManagement";
import SubmissionManagement from "./SubmissionManagement";
import { volunteerTypes } from "../../data/noncontact";

function AdminDashboard({ data, users, onCommand, onVerificationChange, userStorageError, storageError }) {
  const [view, setView] = useState("dashboard");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const menus = [["dashboard", "운영 현황"], ["requests", "의뢰 검토·봉사활동 등록"], ["volunteers", "봉사활동·모집·배정 관리"], ["submissions", "결과물 검토·내부 인증"], ["users", "사용자 관리"]];
  function execute(command, payload) {
    setMessage("");
    setError("");
    try {
      onCommand(command, payload);
      setMessage("변경사항을 이 브라우저에 저장했습니다.");
      return true;
    } catch (failure) {
      setError(failure.message);
      return false;
    }
  }
  const pending = data.assignments.filter((item) => ["결과물 제출", "검토 중", "재제출"].includes(item.status)).length;
  return <div>
    <h1>월계 이음 운영자</h1>
    <nav aria-label="운영자 메뉴">{menus.map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => { setView(key); setMessage(""); setError(""); }}>{label}</button>)}</nav>
    <p>비대면 봉사 운영 기능입니다. 의뢰·신청·결과물은 테스트 예시이며, 이 브라우저에 저장됩니다. 다른 기기와 공유되지 않습니다.</p>
    {storageError && <p role="alert">{storageError}</p>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {view === "dashboard" && <section>
      <h2>운영 현황</h2>
      <dl>{[
        ["전체 의뢰", data.requests.length],
        ["새로운 요청", data.requests.filter((item) => item.status === "요청 접수").length],
        ["의뢰 검토 중", data.requests.filter((item) => item.status === "운영자 검토").length],
        ["전체 봉사활동", data.activities.length],
        ["모집 중인 봉사활동", data.activities.filter((item) => item.recruitmentOpen && !["승인", "인증 완료", "취소"].includes(item.status) && data.assignments.filter((assignment) => assignment.activityId === item.id).length < item.capacity).length],
        ["진행 중인 봉사활동", data.activities.filter((item) => data.assignments.some((assignment) => assignment.activityId === item.id && assignment.status === "진행 중")).length],
        ["결과물 검토 대기 / 검토 중", pending],
        ["보완 요청", data.assignments.filter((item) => item.status === "보완 요청").length],
        ["내부 인증 완료", data.assignments.filter((item) => item.status === "인증 완료").length]
      ].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}건</dd></div>)}</dl>
      <h3>유형별 봉사활동</h3><dl>{volunteerTypes.map((type) => <div key={type}><dt>{type}</dt><dd>{data.activities.filter((item) => item.type === type).length}건</dd></div>)}</dl>
      <p>결과물 검토·보완 요청·내부 인증 건수는 봉사자별 배정 건을 기준으로 집계합니다.</p>
    </section>}
    {view === "requests" && <RequestManagement data={data} users={users} onCommand={execute} disabled={Boolean(storageError)} />}
    {view === "volunteers" && <VolunteerManagement data={data} users={users} onCommand={execute} disabled={Boolean(storageError)} userStorageError={userStorageError} />}
    {view === "submissions" && <SubmissionManagement data={data} users={users} onCommand={execute} disabled={Boolean(storageError)} />}
    {view === "users" && <UserManagement users={users} onVerificationChange={onVerificationChange} storageError={userStorageError} />}
  </div>;
}
export default AdminDashboard;
