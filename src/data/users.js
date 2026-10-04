// 사용자 데이터/API가 정해지기 전 운영자 화면 검증에만 사용하는 임시 데이터입니다.
// 실제 가입 계정이나 tasks.js의 의뢰자와 연결된 데이터가 아닙니다.
// role은 student/requester를 유지하고 requesterType으로 본인/가족을 구분합니다.
export const sampleUsers = [
  {
    id: "demo-student-1",
    role: "student",
    name: "테스트 대학생 1",
    university: "광운대학교 (예시)",
    joinedAt: "2026-10-01",
    isDemo: true
  },
  {
    id: "demo-student-2",
    role: "student",
    name: "테스트 대학생 2",
    university: "인근 대학교 (예시)",
    joinedAt: "2026-10-02",
    isDemo: true
  },
  {
    id: "demo-requester-1",
    role: "requester",
    requesterType: "self",
    name: "테스트 어르신 1",
    joinedAt: "2026-10-01",
    isDemo: true
  },
  {
    id: "demo-requester-2",
    role: "requester",
    requesterType: "family",
    name: "테스트 가족 1",
    linkedElderId: "demo-requester-1",
    joinedAt: "2026-10-02",
    isDemo: true
  }
];
