// 활동 기록 API가 정해지기 전 운영자 검토 화면에서만 사용하는 예시입니다.
// 실제 체크인·체크아웃이나 의뢰자 확인을 생성하지 않습니다.
export const sampleActivities = [
  {
    id: "demo-activity-1",
    taskId: 1,
    studentId: "demo-student-1",
    checkedInAt: "2026-10-01T10:00:00+09:00",
    checkedOutAt: "2026-10-01T11:30:00+09:00",
    requesterConfirmation: "confirmed",
    requesterNote: "약속한 도움을 받았습니다. (테스트 예시)",
    exceptionNotes: "",
    isDemo: true
  }
];
