import { useState } from "react";
import UserManagement from "./UserManagement";
import RequestManagement from "./RequestManagement";
import VolunteerManagement from "./VolunteerManagement";
import SubmissionManagement from "./SubmissionManagement";
import { volunteerTypes } from "../../data/noncontact";

const ADMIN_CSS = `
.ieum-admin{--ink:#172B3A;--sub:#5B6B77;--line:#DDE5EA;--bg:#F5F8FA;--card:#fff;--brand:#0F7B8A;--brand-soft:#E3F2F4;max-width:480px;min-height:100vh;margin:0 auto;background:var(--bg);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;font-size:16px;line-height:1.55;display:flex;flex-direction:column}
.ieum-admin *{box-sizing:border-box}
.ieum-admin button,.ieum-admin input,.ieum-admin select,.ieum-admin textarea{font:inherit}
.ieum-admin button{cursor:pointer}
.ieum-admin :focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.ieum-admin .rq-header{display:flex;align-items:center;gap:8px;padding:14px 16px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
.ieum-admin .rq-logo{font-weight:800;font-size:22px;color:var(--brand)}
.ieum-admin .rq-header strong{font-size:16px}
.ieum-admin .rq-logout{margin-left:auto;border:0;background:transparent;color:var(--sub);font-size:14px}
.ieum-admin main{padding:16px;display:flex;flex-direction:column;gap:14px}
.ieum-admin nav{display:flex;gap:8px;overflow-x:auto;padding:2px 0 8px}
.ieum-admin nav button{flex:0 0 auto;min-height:44px;padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);white-space:nowrap}
.ieum-admin nav button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#fff}
.ieum-admin main>p{margin:0;color:var(--sub);font-size:14px}
.ieum-admin main>p[role="alert"]{padding:12px;border:1px solid #F0CDBE;border-radius:12px;background:#FBEBE3;color:#7C3217}
.ieum-admin main>p[role="status"]{padding:12px;border:1px solid #B8DBCB;border-radius:12px;background:#E4F3EA;color:#245D3E}
.ieum-admin main>section{padding:16px;background:var(--card);border:1px solid var(--line);border-radius:16px}
.ieum-admin h1,.ieum-admin h2,.ieum-admin h3,.ieum-admin h4{color:var(--ink);line-height:1.35}
.ieum-admin h2{font-size:19px;margin:0 0 12px}
.ieum-admin h3{font-size:17px;margin:16px 0 8px}
.ieum-admin h4{font-size:16px;margin:14px 0 8px}
.ieum-admin dl{margin:0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px}
.ieum-admin dl>div{display:contents}
.ieum-admin dt{color:var(--sub)}
.ieum-admin dd{margin:0;font-weight:700;text-align:right}
.ieum-admin article{margin-top:12px;padding:14px;background:var(--card);border:1px solid var(--line);border-radius:14px}
.ieum-admin article h3{margin:0 0 6px}
.ieum-admin article details{margin-top:10px}
.ieum-admin summary{cursor:pointer;font-weight:700;color:var(--brand)}
.ieum-admin form{display:grid;gap:8px;margin:12px 0;padding:12px;border-radius:12px;background:var(--bg)}
.ieum-admin label{font-weight:600}
.ieum-admin input:not([type="checkbox"]),.ieum-admin select,.ieum-admin textarea{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink)}
.ieum-admin textarea{min-height:76px}
.ieum-admin input[type="checkbox"]{width:20px;height:20px;vertical-align:middle}
.ieum-admin button:not(nav button){min-height:42px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
.ieum-admin form button{background:var(--ink)!important;border-color:var(--ink)!important;color:#fff!important}
.ieum-admin button:disabled{opacity:.45;cursor:not-allowed}
.ieum-admin ul,.ieum-admin ol{padding-left:22px}
`;

function AdminDashboard({ data, users, onCommand, onVerificationChange, onAddressVerificationChange, userStorageError, storageError, onLogout }) {
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
  return <div className="rq-app ieum-admin">
    <style>{ADMIN_CSS}</style>
    <header className="rq-header"><span className="rq-logo">이음</span><strong>운영자</strong>{onLogout && <button className="rq-logout" onClick={onLogout}>로그아웃</button>}</header>
    <main>
      <nav aria-label="운영자 메뉴">{menus.map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => { setView(key); setMessage(""); setError(""); }}>{label}</button>)}</nav>
      <p>의뢰·봉사활동·학생 신청·결과물·사용자 검증을 한 곳에서 확인하고 처리합니다.</p>
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
      {view === "users" && <UserManagement users={users} onVerificationChange={onVerificationChange}
        onAddressVerificationChange={onAddressVerificationChange} storageError={userStorageError} />}
    </main>
  </div>;
}
export default AdminDashboard;
