import { useCallback, useEffect, useState } from "react";
import StudentHome from "./pages/student/StudentHome";
import RequesterHome from "./pages/requester/RequesterHome";
import LoginHome from "./pages/login/LoginHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { sampleUsers } from "./data/users";
import { createPasswordCredential, normalizePhone, verifyPassword } from "./data/accountAuth";
import { readUserState, reviewStudent, reviewRequesterAddress, saveUsers } from "./data/userVerification";
import { initialNoncontactState } from "./data/noncontact";
import { readNoncontactState, saveNoncontactState, reviewRequest, registerVolunteerActivity,
  setRecruitment, assignVolunteer, releaseAssignment, saveGuidance, startAssignment,
  beginResultReview, reviewVolunteerResult, certifyVolunteerResult, submitVolunteerResult,
  submitRequesterRequest as createRequesterRequest, reviseRequesterRequest, applyToActivity } from "./data/noncontactStore";
import { isSupabaseConfigured, supabase, toSupabasePhone } from "./data/supabaseClient";
import {
  applyToRemoteActivity, emptyNoncontactState, fetchNoncontactState, fetchProfile, fetchUsers,
  createPrivateFileUrl, persistAdminState, persistRequesterRequest, saveProfile, submitRemoteActivityResult,
  uploadPrivateFile,
} from "./data/supabaseStore";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [verificationUploadError, setVerificationUploadError] = useState("");
  const [appReady, setAppReady] = useState(!isSupabaseConfigured);
  const [startupError, setStartupError] = useState("");
  const [userState, setUserState] = useState(() => {
    if (isSupabaseConfigured) return { users: [], storageError: "" };
    try { return readUserState(window.localStorage); }
    catch { return { users: sampleUsers, storageError: "브라우저 저장소에 접근할 수 없어 사용자 검증과 새 배정을 저장할 수 없습니다." }; }
  });
  const [operationState, setOperationState] = useState(() => {
    if (isSupabaseConfigured) return { data: emptyNoncontactState, storageError: "" };
    try { return readNoncontactState(window.localStorage); }
    catch { return { data: initialNoncontactState, storageError: "브라우저 저장소에 접근할 수 없어 비대면 운영 변경사항을 저장할 수 없습니다." }; }
  });
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    const loadSession = async () => {
      setStartupError("");
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          if (active) setCurrentUser(null);
          return;
        }
        const profile = await fetchProfile(data.session.user.id);
        const [users, operationData] = profile.role === "admin"
          ? await Promise.all([fetchUsers(), fetchNoncontactState(profile)])
          : await Promise.all([Promise.resolve([profile]), fetchNoncontactState(profile)]);
        if (active) {
          setCurrentUser(profile);
          setUserState({ users, storageError: "" });
          setOperationState({ data: operationData, storageError: "" });
        }
      } catch (failure) {
        if (active) setStartupError(failure instanceof Error ? failure.message : "서비스 데이터를 불러오지 못했습니다.");
      } finally {
        if (active) setAppReady(true);
      }
    };
    loadSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) {
        setCurrentUser(null);
        setUserState({ users: [], storageError: "" });
        setOperationState({ data: emptyNoncontactState, storageError: "" });
      }
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);
  async function registerUser(profile, password, verificationDocument) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        phone: toSupabasePhone(profile.phone),
        password,
        options: { data: {
          role: profile.role,
          requesterType: profile.requesterType,
          name: profile.name,
          university: profile.university,
          ageGroup: profile.ageGroup,
          address: profile.address,
          addressZonecode: profile.addressZonecode,
          verificationSummary: profile.verificationSummary,
          verificationDocumentName: profile.verificationDocumentName,
        } },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("가입 사용자 정보를 받지 못했습니다.");
      if (!data.session) return { confirmationRequired: true };
      let user = await fetchProfile(data.user.id);
      if (verificationDocument) {
        try {
          const verificationDocumentPath = await uploadPrivateFile(verificationDocument, user.id, "verification");
          user = { ...user, verificationDocumentPath };
          await saveProfile(user);
          setVerificationUploadError("");
        } catch (failure) {
          setVerificationUploadError(failure instanceof Error ? failure.message : "증빙 파일을 저장하지 못했습니다.");
        }
      }
      setCurrentUser(user);
      setUserState({ users: [user], storageError: "" });
      setOperationState({ data: await fetchNoncontactState(user), storageError: "" });
      return { confirmationRequired: false };
    }
    if (userState.storageError) throw new Error(userState.storageError);
    const phone = normalizePhone(profile.phone);
    if (phone.length < 10) throw new Error("휴대전화 번호를 확인해주세요.");
    if (userState.users.some((user) => user.phone && normalizePhone(user.phone) === phone)) {
      throw new Error("이미 가입된 휴대전화 번호입니다. 로그인해 주세요.");
    }
    const user = {
      id: `user-${window.crypto.randomUUID()}`,
      ...profile,
      ...(await createPasswordCredential(password)),
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    const nextUsers = [user, ...userState.users];
    saveUsers(window.localStorage, nextUsers);
    setUserState({ users: nextUsers, storageError: "" });
    setCurrentUser(user);
  }
  async function loginUser(phone, password) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: toSupabasePhone(phone),
        password,
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("로그인 사용자 정보를 받지 못했습니다.");
      const user = await fetchProfile(data.user.id);
      const [users, operationData] = user.role === "admin"
        ? await Promise.all([fetchUsers(), fetchNoncontactState(user)])
        : await Promise.all([Promise.resolve([user]), fetchNoncontactState(user)]);
      setCurrentUser(user);
      setUserState({ users, storageError: "" });
      setOperationState({ data: operationData, storageError: "" });
      return;
    }
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
  async function verifyPhone(phone, token, verificationDocument) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: toSupabasePhone(phone),
      token,
      type: "sms",
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("휴대전화 인증 사용자 정보를 받지 못했습니다.");
    let user = await fetchProfile(data.user.id);
    if (verificationDocument) {
      try {
        const verificationDocumentPath = await uploadPrivateFile(verificationDocument, user.id, "verification");
        user = { ...user, verificationDocumentPath };
        await saveProfile(user);
        setVerificationUploadError("");
      } catch (failure) {
        setVerificationUploadError(failure instanceof Error ? failure.message : "증빙 파일을 저장하지 못했습니다.");
      }
    }
    setCurrentUser(user);
    setUserState({ users: [user], storageError: "" });
    setOperationState({ data: await fetchNoncontactState(user), storageError: "" });
  }
  async function submitStudentVerification(file) {
    const path = await uploadPrivateFile(file, currentUser.id, "verification");
    const updatedUser = { ...currentUser, verificationDocumentPath: path };
    await saveProfile(updatedUser);
    setCurrentUser(updatedUser);
    setUserState((state) => ({
      ...state,
      users: state.users.map((user) => user.id === updatedUser.id ? updatedUser : user),
    }));
    setVerificationUploadError("");
  }
  async function updateUserVerification(userId, nextStatus, reason) {
    if (userState.storageError) throw new Error(userState.storageError);
    const nextUsers = reviewStudent(userState.users, userId, nextStatus, reason);
    if (isSupabaseConfigured) await saveProfile(nextUsers.find((user) => user.id === userId));
    else saveUsers(window.localStorage, nextUsers);
    setUserState({ users: nextUsers, storageError: "" });
  }
  async function updateRequesterAddress(userId, nextStatus, reason) {
    if (userState.storageError) throw new Error(userState.storageError);
    const nextUsers = reviewRequesterAddress(userState.users, userId, nextStatus, reason);
    if (isSupabaseConfigured) await saveProfile(nextUsers.find((user) => user.id === userId));
    else saveUsers(window.localStorage, nextUsers);
    setUserState({ users: nextUsers, storageError: "" });
  }
  async function updateOperation(command, fields) {
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
      case "submit-result": next = submitVolunteerResult(data, fields.assignmentId, fields.studentId, fields); break;
      case "submit-request": next = createRequesterRequest(data, fields); break;
      case "revise-request": next = reviseRequesterRequest(data, fields.requestId, fields.requesterId, fields); break;
      case "apply": next = applyToActivity(data, userState.users, fields.activityId, fields.studentId); break;
      default: throw new Error("지원하지 않는 운영 처리입니다.");
    }
    if (isSupabaseConfigured) {
      if (command === "apply") {
        await applyToRemoteActivity(fields.activityId);
        next = await fetchNoncontactState(currentUser);
      } else if (command === "submit-result") {
        await submitRemoteActivityResult(fields.assignmentId, fields);
        next = await fetchNoncontactState(currentUser);
      } else if (command === "submit-request" || command === "revise-request") {
        const savedRequest = next.requests.find((item) => item.id === (fields.requestId || next.requests[0]?.id));
        await persistRequesterRequest(savedRequest);
        next = await fetchNoncontactState(currentUser);
      } else if (currentUser.role === "admin") {
        await persistAdminState(next);
      }
    } else {
      saveNoncontactState(window.localStorage, next);
    }
    if (command === "apply" || command === "submit-result" || command === "submit-request" || command === "revise-request") {
      setOperationState({ data: next, storageError: "" });
    } else if (!isSupabaseConfigured || currentUser.role === "admin") {
      setOperationState({ data: next, storageError: "" });
    }
    return next;
  }
  const studentProfile = currentUser?.role === "student" ? currentUser : null;
  const requesterProfile = currentUser?.role === "requester" ? currentUser : null;
  const studentHomeData = useCallback(() => {
    const data = operationState.data;
    const assignments = data.assignments.filter((assignment) => assignment.studentId === studentProfile?.id);
    const myActivities = assignments.map((assignment) => {
      const activity = data.activities.find((item) => item.id === assignment.activityId);
      return activity && {
        ...activity,
        assignmentId: assignment.id,
        assignmentStatus: assignment.status,
        submissions: assignment.submissions,
      };
    }).filter(Boolean);
    const myApplications = data.applications
      .filter((application) => application.studentId === studentProfile?.id &&
        !assignments.some((assignment) => assignment.activityId === application.activityId))
      .map((application) => {
        const activity = data.activities.find((item) => item.id === application.activityId);
        return activity && { ...activity, applicationStatus: "운영자 배정 대기" };
      }).filter(Boolean);
    const activities = data.activities.map((activity) => {
      const request = data.requests.find((item) => item.id === activity.requestId);
      const assignment = assignments.find((item) => item.activityId === activity.id);
      const application = data.applications.find((item) =>
        item.activityId === activity.id && item.studentId === studentProfile?.id
      );
      return {
        ...activity,
        target: request?.target || activity.target,
        applied: Boolean(application),
        applicationStatus: application ? "운영자 배정 대기" : "",
        assignmentId: assignment?.id,
        assignmentStatus: assignment?.status || "",
        submissions: assignment?.submissions || [],
      };
    });
    const requests = activities.filter((activity) =>
      activity.recruitmentOpen && !["승인", "인증 완료", "취소"].includes(activity.status) &&
      data.assignments.filter((assignment) => assignment.activityId === activity.id).length < activity.capacity
    );
    const certified = assignments.filter((assignment) => assignment.status === "인증 완료");
    const totalMinutes = certified.reduce((sum, assignment) =>
      sum + (assignment.submissions.at(-1)?.review?.recognizedMinutes || 0), 0);
    return Promise.resolve({
      user: { name: studentProfile?.name || "" },
      summary: { monthlyCount: certified.length, totalMinutes, verifiedCount: certified.length },
      myActivities,
      myApplications,
      activities,
      requests,
      events: [],
    });
  }, [operationState.data, studentProfile]);
  const applyForActivity = async (activityId) => {
    await updateOperation("apply", { activityId, studentId: studentProfile.id });
  };
  const submitStudentResult = async (assignmentId, fields) => {
    await updateOperation("submit-result", { ...fields, assignmentId, studentId: studentProfile.id });
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
        note: request.note || "",
        status,
        reviewNote: request.history.at(-1)?.reason || "",
        activity: activity && { title: activity.title, period: activity.period },
        result: assignment?.status === "인증 완료" && {
          summary: assignment.submissions.at(-1)?.result,
          log: assignment.submissions.at(-1)?.activityLog,
          files: [{
            name: assignment.submissions.at(-1)?.result,
            kind: activity.resultType,
            path: assignment.submissions.at(-1)?.resultFilePath,
          }],
        },
      };
    }) : [];
  const openPrivateFile = async (path) => {
    if (!path) throw new Error("파일 경로가 없습니다.");
    const fileWindow = window.open("about:blank", "_blank");
    if (!fileWindow) throw new Error("파일을 열려면 브라우저에서 새 창을 허용해주세요.");
    fileWindow.opener = null;
    try {
      fileWindow.location.href = await createPrivateFileUrl(path);
    } catch (error) {
      fileWindow.close();
      throw error;
    }
  };
  const handleRequesterSubmit = async (fields, requestId) => {
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
      note: fields.note || "",
      ...(fields.who === "가족" ? { elderName: fields.elderName, ageGroup: fields.ageGroup } : { ageGroup: requesterProfile.ageGroup }),
    };
    const next = await updateOperation(requestId ? "revise-request" : "submit-request", {
      ...request,
      requestId,
      requesterId: requesterProfile.id,
    });
    return requestId || next.requests[0].id;
  };
  if (!appReady) return <main className="rq-main"><p>이음 서비스 연결 중…</p></main>;
  if (startupError && !currentUser) return <LoginHome
    startupError={startupError}
    onLogin={loginUser}
    onRegister={registerUser}
    onVerify={verifyPhone}
  />;
  if (currentUser?.role === "admin") return <AdminDashboard data={operationState.data} users={userState.users}
    onCommand={updateOperation} onVerificationChange={updateUserVerification}
    onAddressVerificationChange={updateRequesterAddress}
    onOpenFile={openPrivateFile}
    userStorageError={userState.storageError} storageError={operationState.storageError}
    onLogout={() => isSupabaseConfigured ? supabase.auth.signOut() : setCurrentUser(null)} />;
  if (!currentUser) return <LoginHome
    onLogin={loginUser}
    onRegister={registerUser}
    onVerify={verifyPhone}
  />;
  if (currentUser.role === "student") return <StudentHome
    profile={currentUser}
    loadHome={studentHomeData}
    onApply={applyForActivity}
    onSubmitResult={submitStudentResult}
    onUploadFile={(file, category) => uploadPrivateFile(file, currentUser.id, category)}
    onOpenFile={openPrivateFile}
    onSubmitVerification={submitStudentVerification}
    verificationUploadError={verificationUploadError}
    allowFileUpload={isSupabaseConfigured}
    onLogout={() => isSupabaseConfigured ? supabase.auth.signOut() : setCurrentUser(null)}
  />;
  return <RequesterHome
    requesterType={currentUser.requesterType}
    profile={currentUser}
    requests={requesterRequests}
    onSubmitRequest={handleRequesterSubmit}
    onOpenFile={openPrivateFile}
    onLogout={() => isSupabaseConfigured ? supabase.auth.signOut() : setCurrentUser(null)}
  />;
}
export default App;
