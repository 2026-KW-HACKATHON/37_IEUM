import { useState } from "react";

import StudentHome from "./pages/student/StudentHome";
import RequesterHome from "./pages/requester/RequesterHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { initialTasks } from "./data/tasks";
import { readTaskState, changeTaskStatus, saveTasks } from "./data/taskStore";
import { reviewTask } from "./data/taskReview";
import { sampleUsers } from "./data/users";
import { sampleApplications } from "./data/applications";

function App() {
  const [userType, setUserType] = useState(null);
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

  if (userType === "student") {
    return <StudentHome />;
  }

  if (userType === "requester") {
    return <RequesterHome />;
  }

  if (userType === "admin") {
    return (
      <AdminDashboard
        users={sampleUsers}
        applications={sampleApplications}
        tasks={taskState.tasks}
        onStatusChange={updateTaskStatus}
        onReviewChange={updateTaskReview}
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
