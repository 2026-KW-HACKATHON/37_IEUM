import { useState } from "react";
import StudentHome from "./pages/student/StudentHome";
import RequesterHome from "./pages/requester/RequesterHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { sampleUsers } from "./data/users";
import { readUserState, reviewStudent, saveUsers } from "./data/userVerification";
import { initialNoncontactState } from "./data/noncontact";
import { readNoncontactState, saveNoncontactState, reviewRequest, registerVolunteerActivity,
  setRecruitment, assignVolunteer, releaseAssignment, saveGuidance, startAssignment,
  beginResultReview, reviewVolunteerResult, certifyVolunteerResult } from "./data/noncontactStore";

function App() {
  const [userType, setUserType] = useState(null);
  const [userState, setUserState] = useState(() => {
    try { return readUserState(window.localStorage); }
    catch { return { users: sampleUsers, storageError: "브라우저 저장소에 접근할 수 없어 사용자 검증과 새 배정을 저장할 수 없습니다." }; }
  });
  const [operationState, setOperationState] = useState(() => {
    try { return readNoncontactState(window.localStorage); }
    catch { return { data: initialNoncontactState, storageError: "브라우저 저장소에 접근할 수 없어 비대면 운영 변경사항을 저장할 수 없습니다." }; }
  });
  function updateUserVerification(userId, nextStatus, reason) {
    if (userState.storageError) throw new Error(userState.storageError);
    const nextUsers = reviewStudent(userState.users, userId, nextStatus, reason);
    saveUsers(window.localStorage, nextUsers);
    setUserState({ users: nextUsers, storageError: "" });
  }
  function updateOperation(command, fields) {
    if (operationState.storageError) throw new Error(operationState.storageError);
    const data = operationState.data;
    let next;
    switch (command) {
      case "request-review": next = reviewRequest(data, fields.requestId, fields.decision, fields.reason); break;
      case "register": next = registerVolunteerActivity(data, fields.requestId, fields); break;
      case "open-recruitment": next = setRecruitment(data, fields.activityId, true, fields.reason); break;
      case "close-recruitment": next = setRecruitment(data, fields.activityId, false, fields.reason); break;
      case "assign":
        if (userState.storageError) throw new Error(userState.storageError);
        next = assignVolunteer(data, userState.users, fields.activityId, fields.studentId, fields.reason); break;
      case "release": next = releaseAssignment(data, fields.assignmentId, fields.reason); break;
      case "guidance": next = saveGuidance(data, fields.activityId, fields); break;
      case "start": next = startAssignment(data, fields.assignmentId, fields.reason); break;
      case "begin-review": next = beginResultReview(data, fields.assignmentId); break;
      case "result-review": next = reviewVolunteerResult(data, fields.assignmentId, fields.decision, fields.reason, fields.recognizedMinutes); break;
      case "certify": next = certifyVolunteerResult(data, fields.assignmentId, fields.reference, fields.note); break;
      default: throw new Error("지원하지 않는 운영 처리입니다.");
    }
    saveNoncontactState(window.localStorage, next);
    setOperationState({ data: next, storageError: "" });
  }
  if (userType === "student") return <StudentHome />;
  if (userType === "requester") return <RequesterHome />;
  if (userType === "admin") return <AdminDashboard data={operationState.data} users={userState.users}
    onCommand={updateOperation} onVerificationChange={updateUserVerification}
    userStorageError={userState.storageError} storageError={operationState.storageError} />;
  return <div>
    <h1>IEUM</h1><p>어떤 사용자로 이용하시나요?</p>
    <button onClick={() => setUserType("student")}>대학생</button>
    <button onClick={() => setUserType("requester")}>어르신 / 가족</button>
    <button onClick={() => setUserType("admin")}>운영자</button>
  </div>;
}
export default App;
