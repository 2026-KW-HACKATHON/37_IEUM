import { useState } from "react";

import StudentHome from "./pages/student/StudentHome";
import RequesterHome from "./pages/requester/RequesterHome";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  const [userType, setUserType] = useState(null);

  if (userType === "student") {
    return <StudentHome />;
  }

  if (userType === "requester") {
    return <RequesterHome />;
  }

  if (userType === "admin") {
    return <AdminDashboard />;
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