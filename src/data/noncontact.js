export const volunteerTypes = ["생활·디지털 안내", "생활·취미 키트", "말벗·기록"];
export const requestStatuses = ["요청 접수", "운영자 검토", "승인", "반려", "수정 요청"];
export const volunteerStatuses = ["모집 중", "봉사자 배정", "진행 중", "결과물 제출", "검토 중", "보완 요청", "재제출", "승인", "인증 완료", "취소"];

// 테스트 예시입니다. 실제 기관 승인, 신청, 제출 또는 1365 실적이 아닙니다.
export const initialNoncontactState = {
  requests: [
    { id: "demo-request-1", requesterId: "demo-requester-1", target: "어르신 본인", title: "스마트폰 사진 보내는 법을 알려주세요", type: "생활·디지털 안내", description: "가족에게 사진 보내는 방법을 큰 글씨로 안내해주세요.", situation: "작은 글씨를 읽기 어려워요.", desiredResult: "큰 글씨 PDF 안내서", period: "2026-10-10 ~ 2026-10-17", status: "승인", isDemo: true, history: [] },
    { id: "demo-request-2", requesterId: "demo-requester-2", target: "어르신 가족", title: "집에서 키울 반려식물 키트가 필요해요", type: "생활·취미 키트", description: "작은 화분과 쉬운 관리 설명서를 부탁드려요.", situation: "외출이 어려워 집에서 취미를 즐기고 싶어요.", desiredResult: "식물 키트와 관리 안내서", period: "2026-10-12 ~ 2026-10-20", status: "요청 접수", isDemo: true, history: [] },
    { id: "demo-request-3", requesterId: "demo-requester-1", target: "어르신 본인", title: "정기적으로 안부 이야기를 나누고 싶어요", type: "말벗·기록", description: "전화로 안부를 나누고 활동일지를 남겨주세요.", situation: "전화로 대화하는 방식이 편해요.", desiredResult: "안부전화와 활동일지", period: "2026-10-12 ~ 2026-10-26", status: "요청 접수", isDemo: true, history: [] }
  ],
  activities: [
    { id: "demo-volunteer-1", requestId: "demo-request-1", title: "어르신 스마트폰 사진 전송 안내서 제작", type: "생활·디지털 안내", description: "어르신 상황에 맞춘 큰 글씨 안내서 제작", target: "어르신", period: "2026-10-10 ~ 2026-10-17", startDate: "2026-10-10", endDate: "2026-10-17", status: "결과물 제출", capacity: 2, requirements: "PDF 제작", resultType: "큰 글씨 PDF", evidence: "결과물 및 활동일지", deadline: "2026-10-17", recognitionCriteria: "자료의 정확성·가독성과 제작 활동일지 검토", recruitmentOpen: true, institutionApproved: false, institutionName: "", institutionApprovalRef: "", guidance: { method: "어르신 질문에 맞춰 단계별 안내서를 제작합니다.", precautions: "실제 개인정보나 계정 비밀번호를 사용하지 않습니다.", resultFormat: "큰 글씨 PDF", evidenceGuide: "결과물과 제작 활동일지를 제출합니다.", logGuide: "수행 내용과 소요 시간을 기록합니다." }, isDemo: true, history: [] }
  ],
  applications: [
    { id: "demo-apply-1", activityId: "demo-volunteer-1", studentId: "demo-student-1", appliedAt: "2026-10-10T09:00:00+09:00", isDemo: true },
    { id: "demo-apply-2", activityId: "demo-volunteer-1", studentId: "demo-student-2", appliedAt: "2026-10-10T09:30:00+09:00", isDemo: true }
  ],
  assignments: [
    { id: "demo-assignment-1", activityId: "demo-volunteer-1", studentId: "demo-student-1", status: "결과물 제출", assignedAt: "2026-10-10T10:00:00+09:00", history: [], submissions: [
      { id: "demo-submission-1", submittedAt: "2026-10-12T12:00:00+09:00", result: "사진 전송 안내서.pdf (테스트 파일명, 실제 파일 없음)", activityLog: "사진 전송 절차를 확인하고 큰 글씨 안내서를 제작했습니다. (예시)", evidence: "초안·수정 내용 기록 (예시)", workedMinutes: 90, isDemo: true }
    ] }
  ]
};
