import { useState } from "react";

import StudentHome from "./pages/student/StudentHome";
import RequesterHome from "./pages/requester/RequesterHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { initialTasks } from "./data/tasks";
import { readTaskState, changeTaskStatus, saveTasks } from "./data/taskStore";
import { reviewTask } from "./data/taskReview";
import { sampleUsers } from "./data/users";
import { sampleApplications } from "./data/applications";
import { createTaskMatch, releaseTaskMatch } from "./data/taskMatching";
import { readUserState, reviewStudent, saveUsers } from "./data/userVerification";

function App() {
  const [userType, setUserType] = useState(null);
  const [userState, setUserState] = useState(() => {
    try {
      return readUserState(window.localStorage);
    } catch {
      return { users: sampleUsers, storageError: "브라우저 저장소에 접근할 수 없어 검증 처리와 새 매칭을 저장할 수 없습니다." };
    }
  });

  function updateUserVerification(userId, nextStatus, reason) {
    if (userState.storageError) throw new Error(userState.storageError);
    const nextUsers = reviewStudent(userState.users, userId, nextStatus, reason);
    saveUsers(window.localStorage, nextUsers);
    setUserState({ users: nextUsers, storageError: "" });
  }
  const [taskState, setTaskState] = useState(() => {
    try {
      return readTaskState(window.localStorage);
    } catch {
      return {
        tasks: initialTasks,
        storageError: "브라우저 저장소에 접근할 수 없어 상태를 저장할 수 없습니다. 브라우저 저장 설정을 확인해주세요."
      };
    }
  });

  function updateTaskStatus(taskId, nextStatus, reason) {
    if (taskState.storageError) throw new Error(taskState.storageError);

    const nextTasks = changeTaskStatus(taskState.tasks, taskId, nextStatus, reason);
    try {
      saveTasks(window.localStorage, nextTasks);
    } catch (error) {
      throw new Error(error.message || "브라우저 저장소에 접근할 수 없습니다.", { cause: error });
    }
    setTaskState({ tasks: nextTasks, storageError: "" });
  }

  function updateTaskReview(taskId, action, reason) {
    if (taskState.storageError) throw new Error(taskState.storageError);
    const nextTasks = reviewTask(taskState.tasks, taskId, action, reason);
    saveTasks(window.localStorage, nextTasks);
    setTaskState({ tasks: nextTasks, storageError: "" });
  }

  function updateTaskMatch(taskId, action, studentId, reason) {
    if (taskState.storageError) throw new Error(taskState.storageError);
    let nextTasks;
    if (action === "매칭") {
      if (userState.storageError) throw new Error(userState.storageError);
      nextTasks = createTaskMatch(taskState.tasks, userState.users, sampleApplications, taskId, studentId, reason);
    } else if (action === "매칭 해제") {
      nextTasks = releaseTaskMatch(taskState.tasks, userState.users, sampleApplications, taskId, reason);
    } else {
      throw new Error("지원하지 않는 매칭 처리입니다.");
    }
    saveTasks(window.localStorage, nextTasks);
    setTaskState({ tasks: nextTasks, storageError: "" });
  }

  if (userType === "student") {
    return <StudentHome />;
  }

  if (userType === "requester") {
    return <RequesterHome />;
  }

  if (userType === "admin") {
    return (
      <AdminDashboard
        users={userState.users}
        onVerificationChange={updateUserVerification}
        userStorageError={userState.storageError}
        applications={sampleApplications}
        tasks={taskState.tasks}
        onStatusChange={updateTaskStatus}
        onReviewChange={updateTaskReview}
        onMatchChange={updateTaskMatch}
        storageError={taskState.storageError}
      />
    );
  }

  return (
    <div>
      <h1>IEUM</h1>
      <p>어떤 사용자로 이용하시나요?</p>

      <button onClick={() => setUserType("student")}>
        대학생
      </button>

      <button onClick={() => setUserType("requester")}>
        어르신 / 가족
      </button>

      <button onClick={() => setUserType("admin")}>
        운영자
      </button>
    </div>
  );
}

export default App;
