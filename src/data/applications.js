// 운영자 신청자 조회 검증용 예시입니다. 실제 학생의 신청 기록이 아닙니다.
// 테스트 사용자와 기존 샘플 요청을 예시로 연결하며 요청 상태는 자동 변경하지 않습니다.
// 실제 데이터/API 확정 시 이 임시 형식을 팀 구조에 맞춰 교체합니다.
export const sampleApplications = [
  {
    id: "demo-application-1",
    taskId: 1,
    studentId: "demo-student-1",
    appliedAt: "2026-10-01T10:00:00+09:00",
    isDemo: true
  },
  {
    id: "demo-application-2",
    taskId: 1,
    studentId: "demo-student-2",
    appliedAt: "2026-10-01T11:00:00+09:00",
    isDemo: true
  }
];
