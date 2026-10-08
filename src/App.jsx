import { useCallback, useEffect, useState } from "react";
import StudentHome from "./pages/student/StudentHome";
import RequesterHome from "./pages/requester/RequesterHome";
import LoginHome from "./pages/login/LoginHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import VerificationPending from "./components/VerificationPending";
import { createPasswordCredential, normalizePhone, phoneLoginEmail, verifyPassword } from "./data/accountAuth";
import { readUserState, reviewStudent, reviewRequesterAddress, saveUsers } from "./data/userVerification";
import { editLocalUser, deleteLocalUser } from "./data/userManagement";
import { getStudentSummary } from "./data/studentSummary";
import { noncontactStorageKey, readNoncontactState, saveNoncontactState, reviewRequest, registerVolunteerActivity,
  setRecruitment, assignVolunteer, releaseAssignment, saveGuidance, getAssignmentStatus,
  beginResultReview, reviewVolunteerResult, certifyVolunteerResult, submitVolunteerResult,
  submitRequesterRequest as createRequesterRequest, reviseRequesterRequest, applyToActivity } from "./data/noncontactStore";
import { isSupabaseConfigured, supabase, toSupabasePhone } from "./data/supabaseClient";
import {
  applyToRemoteActivity, emptyNoncontactState, fetchNoncontactState, fetchProfile, fetchUsers,
  createPrivateFileUrl, persistAdminState, persistRequesterRequest, saveProfile, submitRemoteActivityResult,
  uploadPrivateFile,
  manageRemoteUser, fetchUserManagementAudit,
} from "./data/supabaseStore";

function isProfileApproved(profile) {
  if (profile.role === "student") return profile.verificationStatus === "approved";
  if (profile.role === "requester") return profile.addressVerificationStatus === "approved";
  return profile.role === "admin";
}

function RouteNotice({ adminRoute, onLogout }) {
  return (
    <main style={{ maxWidth: 480, minHeight: "100vh", margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, color: "#25404A", background: "#FFF9F4" }}>
      <h1>{adminRoute ? "운영자 전용 주소입니다." : "운영자 계정으로 로그인되어 있어요."}</h1>
      <p>{adminRoute ? "운영자 계정으로 로그인해 주세요." : "운영자 화면은 전용 주소에서 이용해 주세요."}</p>
      <a href={adminRoute ? "/" : "/admin"}>{adminRoute ? "사용자 화면으로 이동" : "운영자 화면으로 이동"}</a>
      <button type="button" onClick={onLogout}>로그아웃</button>
    </main>
  );
}

function App() {
  const adminRoute = /^\/admin\/?$/.test(window.location.pathname);
  const [currentUser, setCurrentUser] = useState(null);
  const [verificationUploadError, setVerificationUploadError] = useState("");
  const [appReady, setAppReady] = useState(!isSupabaseConfigured);
  const [startupError, setStartupError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [userState, setUserState] = useState(() => {
    if (isSupabaseConfigured) return { users: [], storageError: "" };
    try { return readUserState(window.localStorage); }
    catch { return { users: [], storageError: "브라우저 저장소에 접근할 수 없어 사용자 검증과 새 배정을 저장할 수 없습니다." }; }
  });
  const [operationState, setOperationState] = useState(() => {
    if (isSupabaseConfigured) return { data: emptyNoncontactState, storageError: "" };
    try { return readNoncontactState(window.localStorage); }
    catch { return { data: emptyNoncontactState, storageError: "브라우저 저장소에 접근할 수 없어 비대면 운영 변경사항을 저장할 수 없습니다." }; }
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
          : isProfileApproved(profile)
            ? await Promise.all([Promise.resolve([profile]), fetchNoncontactState(profile)])
            : [[profile], emptyNoncontactState];
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
        setSyncError("");
      }
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!currentUser || !isProfileApproved(currentUser)) return undefined;
    if (!isSupabaseConfigured) {
      const handleStorage = (event) => {
        if (event.key !== null && event.key !== noncontactStorageKey) return;
        const next = readNoncontactState(window.localStorage);
        setOperationState(next);
        setSyncError(next.storageError);
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }

    let active = true;
    let refreshTimer;
    const refresh = async () => {
      try {
        const data = await fetchNoncontactState(currentUser);
        if (!active) return;
        setOperationState({ data, storageError: "" });
        setSyncError("");
      } catch (failure) {
        if (active) setSyncError(failure instanceof Error ? failure.message : "최신 운영 정보를 불러오지 못했습니다.");
      }
    };
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => { void refresh(); }, 100);
    };
    const channel = supabase.channel(`ieum-operations:${currentUser.id}`);
    for (const table of ["requests", "activities", "applications", "assignments"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    }
    channel.subscribe((status) => {
      if (!active) return;
      if (status === "SUBSCRIBED") {
        setSyncError("");
        scheduleRefresh();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setSyncError("실시간 업데이트 연결이 끊겼습니다. 연결을 확인한 뒤 새로고침해 주세요.");
      }
    });
    return () => {
      active = false;
      window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [currentUser]);
  async function registerUser(profile, password, verificationDocument) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: phoneLoginEmail(profile.phone),
        password,
        options: { data: {
          role: profile.role,
          requesterType: profile.requesterType,
          name: profile.name,
          phone: toSupabasePhone(profile.phone),
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
      if (!data.session) {
        throw new Error("Supabase에서 이메일 확인을 꺼야 가입 후 바로 로그인할 수 있습니다. Authentication 설정을 확인해주세요.");
      }
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
      setOperationState({
        data: isProfileApproved(user) ? await fetchNoncontactState(user) : emptyNoncontactState,
        storageError: "",
      });
      return;
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
        email: phoneLoginEmail(phone),
        password,
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("로그인 사용자 정보를 받지 못했습니다.");
      const user = await fetchProfile(data.user.id);
      const [users, operationData] = user.role === "admin"
        ? await Promise.all([fetchUsers(), fetchNoncontactState(user)])
        : isProfileApproved(user)
          ? await Promise.all([Promise.resolve([user]), fetchNoncontactState(user)])
          : [[user], emptyNoncontactState];
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
  async function loginAdmin(adminId, password) {
    if (!isSupabaseConfigured) {
      const expectedId = import.meta.env.VITE_DEMO_ADMIN_ID || "kwhack";
      const expectedPassword = import.meta.env.VITE_DEMO_ADMIN_PASSWORD;
      if (!expectedPassword) throw new Error("시연용 운영자 비밀번호가 로컬 환경변수에 설정되지 않았습니다.");
      if (adminId !== expectedId || password !== expectedPassword) {
        throw new Error("운영자 아이디 또는 비밀번호가 올바르지 않습니다.");
      }
      setCurrentUser({
        id: "development-admin",
        role: "admin",
        name: adminId,
        isDemo: true,
      });
      return;
    }
    if (adminId !== "kwhack") throw new Error("운영자 아이디 또는 비밀번호가 올바르지 않습니다.");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "kwhack@ieum.invalid",
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("운영자 로그인 사용자 정보를 받지 못했습니다.");
    const user = await fetchProfile(data.user.id);
    if (user.role !== "admin") {
      await supabase.auth.signOut();
      throw new Error("이 계정에는 운영자 권한이 없습니다.");
    }
    const [users, operationData] = await Promise.all([fetchUsers(), fetchNoncontactState(user)]);
    setCurrentUser(user);
    setUserState({ users, storageError: "" });
    setOperationState({ data: operationData, storageError: "" });
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
  async function manageUser(action, userId, fields) {
    if (currentUser?.role !== "admin") throw new Error("운영자만 회원을 관리할 수 있습니다.");
    if (userState.storageError) throw new Error(userState.storageError);
    if (action === "delete" && operationState.storageError) throw new Error(operationState.storageError);
    if (isSupabaseConfigured) {
      const result = await manageRemoteUser(action, userId, fields);
      // 서버 처리 성공 이후 목록 조회 실패를 처리 실패와 혼동하지 않습니다.
      try { setUserState({ users: await fetchUsers(), storageError: "" }); }
      catch { return { warning: "회원 처리는 완료됐지만 목록 갱신에 실패했습니다. 새로고침해서 확인해주세요." }; }
      return result;
    }
    const users = action === "update"
      ? editLocalUser(userState.users, userId, fields, currentUser)
      : deleteLocalUser(userState.users, userId, fields, operationState.data, currentUser);
    saveUsers(window.localStorage, users);
    setUserState({ users, storageError: "" });
    return { success: true };
  }
  async function loadUserManagementAudit() {
    if (isSupabaseConfigured) return fetchUserManagementAudit();
    return userState.users.flatMap((user) => (user.managementHistory || []).map((entry) => ({
      id: `${user.id}-${entry.changedAt}`, target_id: user.id, actor_id: entry.actorId,
      action: "update", reason: entry.reason, changed_fields: entry.changedFields,
      status: "completed", created_at: entry.changedAt,
    })));
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
        try {
          await persistAdminState(next, data.revision);
        } catch (failure) {
          if (failure.code === "40001") {
            try {
              const latest = await fetchNoncontactState(currentUser);
              setOperationState({ data: latest, storageError: "" });
            } catch {
              throw new Error("다른 사용자가 데이터를 변경했고 최신 정보를 불러오지 못했습니다. 새로고침 후 다시 확인해주세요.");
            }
          }
          throw failure;
        }
        // 다음 저장에서도 서버가 확인한 최신 버전을 사용합니다.
        try { next = await fetchNoncontactState(currentUser); }
        catch {
          setOperationState({ data: next, storageError: "저장은 완료됐지만 최신 정보를 불러오지 못했습니다. 새로고침 후 다시 작업해주세요." });
          return next;
        }
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
    const assignedActivities = assignments.map((assignment) => {
      const activity = data.activities.find((item) => item.id === assignment.activityId);
      return activity && {
        ...activity,
        assignmentId: assignment.id,
        assignmentStatus: getAssignmentStatus(assignment, activity),
        submissions: assignment.submissions,
      };
    }).filter(Boolean);
    const myActivities = assignedActivities.filter((activity) => activity.assignmentStatus !== "인증 완료");
    const completedActivities = assignedActivities.filter((activity) => activity.assignmentStatus === "인증 완료");
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
        status: assignment ? getAssignmentStatus(assignment, activity) : activity.status,
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
    return Promise.resolve({
      user: { name: studentProfile?.name || "" },
      summary: getStudentSummary(assignments),
      myActivities,
      completedActivities,
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
          : activity && activity.status !== "모집 중" ? activity.status
            : activity?.recruitmentOpen ? "모집 중"
              : activity || request.status === "승인" ? "운영자 검토"
                : request.status;
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
      ...(fields.who === "가족" ? { elderName: fields.elderName, ageGroup: fields.ageGroup } : {}),
    };
    const next = await updateOperation(requestId ? "revise-request" : "submit-request", {
      ...request,
      requestId,
      requesterId: requesterProfile.id,
    });
    return requestId || next.requests[0].id;
  };
  if (!appReady) return <main className="rq-main"><p>이음 서비스 연결 중…</p></main>;
  if (currentUser && ((currentUser.role === "admin") !== adminRoute)) {
    return <RouteNotice
      adminRoute={adminRoute}
      onLogout={() => isSupabaseConfigured ? supabase.auth.signOut() : setCurrentUser(null)}
    />;
  }
  if (startupError && !currentUser) return <LoginHome
    startupError={startupError}
    localMode={!isSupabaseConfigured}
    onAdminLogin={loginAdmin}
    adminOnly={adminRoute}
    onLogin={loginUser}
    onRegister={registerUser}
  />;
  if (currentUser?.role === "admin") return <AdminDashboard data={operationState.data} users={userState.users} profile={currentUser}
    onManageUser={manageUser} onLoadUserManagementAudit={loadUserManagementAudit}
    onCommand={updateOperation} onVerificationChange={updateUserVerification}
    onAddressVerificationChange={updateRequesterAddress}
    onOpenFile={openPrivateFile}
    userStorageError={userState.storageError} storageError={operationState.storageError} syncError={syncError}
    onLogout={() => isSupabaseConfigured ? supabase.auth.signOut() : setCurrentUser(null)} />;
  if (studentProfile && studentProfile.verificationStatus !== "approved") return <VerificationPending
    profile={studentProfile}
    onLogout={() => isSupabaseConfigured ? supabase.auth.signOut() : setCurrentUser(null)}
  />;
  if (requesterProfile && requesterProfile.addressVerificationStatus !== "approved") return <VerificationPending
    profile={requesterProfile}
    onLogout={() => isSupabaseConfigured ? supabase.auth.signOut() : setCurrentUser(null)}
  />;
  if (!currentUser) return <LoginHome
    localMode={!isSupabaseConfigured}
    onAdminLogin={loginAdmin}
    adminOnly={adminRoute}
    onLogin={loginUser}
    onRegister={registerUser}
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
    syncError={syncError}
    allowFileUpload={isSupabaseConfigured}
    onLogout={() => isSupabaseConfigured ? supabase.auth.signOut() : setCurrentUser(null)}
  />;
  return <RequesterHome
    requesterType={currentUser.requesterType}
    profile={currentUser}
    requests={requesterRequests}
    syncError={syncError}
    onSubmitRequest={handleRequesterSubmit}
    onOpenFile={openPrivateFile}
    onLogout={() => isSupabaseConfigured ? supabase.auth.signOut() : setCurrentUser(null)}
  />;
}
export default App;
