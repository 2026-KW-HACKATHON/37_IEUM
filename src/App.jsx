import { useCallback, useState } from "react";
import StudentHome from "./pages/student/StudentHome";
import RequesterHome from "./pages/requester/RequesterHome";
import LoginHome from "./pages/login/LoginHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { sampleUsers } from "./data/users";
import { normalizePhone, verifyPassword } from "./data/accountAuth";
import { readUserState, reviewStudent, reviewRequesterAddress, saveUsers } from "./data/userVerification";
import { initialNoncontactState } from "./data/noncontact";
import { readNoncontactState, saveNoncontactState, reviewRequest, registerVolunteerActivity,
  setRecruitment, assignVolunteer, releaseAssignment, saveGuidance, startAssignment,
  beginResultReview, reviewVolunteerResult, certifyVolunteerResult, submitRequesterRequest as createRequesterRequest,
  reviseRequesterRequest, applyToActivity } from "./data/noncontactStore";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [operatorMode, setOperatorMode] = useState(false);
  const [userState, setUserState] = useState(() => {
    try { return readUserState(window.localStorage); }
    catch { return { users: sampleUsers, storageError: "브라우저 저장소에 접근할 수 없어 사용자 검증과 새 배정을 저장할 수 없습니다." }; }
  });
  const [operationState, setOperationState] = useState(() => {
    try { return readNoncontactState(window.localStorage); }
    catch { return { data: initialNoncontactState, storageError: "브라우저 저장소에 접근할 수 없어 비대면 운영 변경사항을 저장할 수 없습니다." }; }
  });
  function registerUser(profile) {
    if (userState.storageError) throw new Error(userState.storageError);
    const phone = normalizePhone(profile.phone);
    if (phone.length < 10) throw new Error("휴대전화 번호를 확인해주세요.");
    if (userState.users.some((user) => user.phone && normalizePhone(user.phone) === phone)) {
      throw new Error("이미 가입된 휴대전화 번호입니다. 로그인해 주세요.");
    }
    const user = {
      id: `user-${window.crypto.randomUUID()}`,
      ...profile,
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    const nextUsers = [user, ...userState.users];
    saveUsers(window.localStorage, nextUsers);
    setUserState({ users: nextUsers, storageError: "" });
    setCurrentUser(user);
  }
  async function loginUser(phone, password) {
    if (userState.storageError) throw new Error(userState.storageError);
    const normalizedPhone = normalizePhone(phone);
    const user = userState.users.find((item) =>
      item.phone && normalizePhone(item.phone) === normalizedPhone &&
      item.passwordSalt && item.passwordHash
    );
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
      throw new Error("휴대전화 번호 또는 비밀번호가 올바르지 않습니다.");
    }
    setCurrentUser(user);
  }
  function updateUserVerification(userId, nextStatus, reason) {
    if (userState.storageError) throw new Error(userState.storageError);
    const nextUsers = reviewStudent(userState.users, userId, nextStatus, reason);
    saveUsers(window.localStorage, nextUsers);
    setUserState({ users: nextUsers, storageError: "" });
  }
  function updateRequesterAddress(userId, nextStatus, reason) {
    if (userState.storageError) throw new Error(userState.storageError);
    const nextUsers = reviewRequesterAddress(userState.users, userId, nextStatus, reason);
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
      case "submit-request": next = createRequesterRequest(data, fields); break;
      case "revise-request": next = reviseRequesterRequest(data, fields.requestId, fields.requesterId, fields); break;
      case "apply": next = applyToActivity(data, userState.users, fields.activityId, fields.studentId); break;
      default: throw new Error("지원하지 않는 운영 처리입니다.");
    }
    saveNoncontactState(window.localStorage, next);
    setOperationState({ data: next, storageError: "" });
    return next;
  }
  const studentProfile = currentUser?.role === "student" ? currentUser : null;
  const requesterProfile = currentUser?.role === "requester" ? currentUser : null;
  const studentHomeData = useCallback(() => {
    const data = operationState.data;
    const assignments = data.assignments.filter((assignment) => assignment.studentId === studentProfile?.id);
    const myActivities = assignments.map((assignment) => {
      const activity = data.activities.find((item) => item.id === assignment.activityId);
      return activity && { id: activity.id, title: activity.title, subtitle: `${activity.period} · ${assignment.status}` };
    }).filter(Boolean);
    const requests = data.activities.filter((activity) =>
      activity.recruitmentOpen && !["승인", "인증 완료", "취소"].includes(activity.status)
    ).map((activity) => {
      const request = data.requests.find((item) => item.id === activity.requestId);
      return {
        id: activity.id,
        title: activity.title,
        subtitle: `${request?.target || activity.target} · ${activity.period}`,
        tags: [activity.type],
        applied: data.applications.some((application) =>
          application.activityId === activity.id && application.studentId === studentProfile?.id
        ),
      };
    });
    const certified = assignments.filter((assignment) => assignment.status === "인증 완료");
    const totalMinutes = certified.reduce((sum, assignment) =>
      sum + (assignment.submissions.at(-1)?.review?.recognizedMinutes || 0), 0);
    return Promise.resolve({
      user: { name: studentProfile?.name || "" },
      summary: { monthlyCount: certified.length, totalMinutes, verifiedCount: certified.length },
      myActivities,
      requests,
      events: [],
    });
  }, [operationState.data, studentProfile]);
  const applyForActivity = (activityId) => {
    updateOperation("apply", { activityId, studentId: studentProfile.id });
  };
  const requesterRequests = requesterProfile ? operationState.data.requests
    .filter((request) => request.requesterId === requesterProfile.id)
    .map((request) => {
      const activity = operationState.data.activities.find((item) => item.requestId === request.id);
      const assignment = operationState.data.assignments.find((item) => item.activityId === activity?.id);
      const status = request.status === "수정 요청" || request.status === "반려"
        ? request.status
        : activity?.status === "인증 완료" ? "인증 완료"
          : activity?.recruitmentOpen ? "모집 중"
            : activity?.status || request.status;
      return {
        id: request.id,
        title: request.title,
        type: request.type,
        who: request.target === "어르신 가족" ? "가족" : "본인",
        elderName: request.elderName || "",
        ageGroup: request.ageGroup || requesterProfile.ageGroup || "",
        need: request.description,
        situation: request.situation,
        resultWanted: request.desiredResult,
        period: request.period,
        status,
        reviewNote: request.history.at(-1)?.reason || "",
        activity: activity && { title: activity.title, period: activity.period },
        result: assignment?.status === "인증 완료" && {
          summary: assignment.submissions.at(-1)?.result,
          log: assignment.submissions.at(-1)?.activityLog,
          files: [{ name: assignment.submissions.at(-1)?.result, kind: activity.resultType }],
        },
      };
    }) : [];
  const handleRequesterSubmit = (fields, requestId) => {
    if (!requesterProfile) throw new Error("로그인한 요청자 정보를 확인할 수 없습니다.");
    const request = {
      requesterId: requesterProfile.id,
      target: fields.who === "가족" ? "어르신 가족" : "어르신 본인",
      title: fields.need.trim().slice(0, 24) || fields.type,
      type: fields.type,
      description: fields.need,
      situation: fields.situation,
      desiredResult: fields.resultWanted,
      period: fields.period,
      ...(fields.who === "가족" ? { elderName: fields.elderName, ageGroup: fields.ageGroup } : { ageGroup: requesterProfile.ageGroup }),
    };
    const next = updateOperation(requestId ? "revise-request" : "submit-request", {
      ...request,
      requestId,
      requesterId: requesterProfile.id,
    });
    return requestId || next.requests[0].id;
  };
  if (operatorMode) return <AdminDashboard data={operationState.data} users={userState.users}
    onCommand={updateOperation} onVerificationChange={updateUserVerification}
    onAddressVerificationChange={updateRequesterAddress}
    userStorageError={userState.storageError} storageError={operationState.storageError}
    onLogout={() => setOperatorMode(false)} />;
  if (!currentUser) return <LoginHome
    onLogin={loginUser}
    onRegister={registerUser}
    onOperator={() => setOperatorMode(true)}
  />;
  if (currentUser.role === "student") return <StudentHome
    profile={currentUser}
    loadHome={studentHomeData}
    onApply={applyForActivity}
    onLogout={() => setCurrentUser(null)}
  />;
  return <RequesterHome
    requesterType={currentUser.requesterType}
    profile={currentUser}
    requests={requesterRequests}
    onSubmitRequest={handleRequesterSubmit}
    onLogout={() => setCurrentUser(null)}
  />;
}
export default App;
