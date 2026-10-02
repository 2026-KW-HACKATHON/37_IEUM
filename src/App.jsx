import React, { useState } from 'react';

const initialTasks = [
  {
    id: 1,
    requesterType: "어르신 본인",
    category: "장보기",
    status: "모집 중",
    title: "마트 장보기 동행 부탁드려요",
    date: "6월 14일(토) 오전 10시",
    place: "월계1동 근처 · 도보 약 8분",
    client: "김순자 어르신 (75세)",
    desc: "무거운 것은 못 들어서 장바구니 끌어주실 분 필요해요. 쌀 한 포대랑 채소 좀 사야 합니다. 마트는 월계시장 하나로마트입니다.",
    duration: "약 1시간 30분",
    volTime: "1시간 30분 인정"
  },
  {
    id: 2,
    requesterType: "어르신 본인",
    category: "병원 동행",
    status: "모집 중",
    title: "가까운 내과 진료 동행 요청",
    date: "6월 16일(월) 오전 9시",
    place: "월계1동 근처 · 도보 약 12분",
    client: "박○○ 어르신",
    desc: "정기 검진일인데 거동이 불편해 병원까지 함께 걸어가 주실 분을 구합니다.",
    duration: "약 2시간",
    volTime: "2시간 인정"
  },
  {
    id: 3,
    requesterType: "어르신 본인",
    category: "말벗",
    status: "마감 임박",
    title: "오후에 잠깐 말동무 해주실 분",
    date: "6월 15일(일) 오후 2시",
    place: "월계1동 근처 · 도보 약 5분",
    client: "이○○ 어르신",
    desc: "주민센터 앞 벤치에서 가볍게 담소 나누실 청년 활동자 환영합니다.",
    duration: "1시간",
    volTime: "1시간 인정"
  }
];

export default function App() {
  const [page, setPage] = useState('role');
  const [role, setRole] = useState('student');
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(initialTasks[0]);

  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  const [newTaskCategory, setNewTaskCategory] = useState("장보기");
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newTaskPlace, setNewTaskPlace] = useState("월계1동 주민센터 앞");

  // 가족 인증
  const [familyName, setFamilyName] = useState("");
  const [elderName, setElderName] = useState("");
  const [familyRelation, setFamilyRelation] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");
  const [elderPhone, setElderPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [familyVerified, setFamilyVerified] = useState(false);

  // 의뢰자 활동 완료 / 평가
  const [completionChecker, setCompletionChecker] = useState("");
  const [requesterRating, setRequesterRating] = useState(0);
  const [requesterReview, setRequesterReview] = useState("");
  const [requestCompleted, setRequestCompleted] = useState(false);

  // 신청자 / 매칭
  const [matchedStudent, setMatchedStudent] = useState(null);

  // 현재는 프론트 시연용 데이터
  // 실제 서비스에서는 대학생 신청 데이터를 서버에서 받아오면 됨
  const applicants = [
    {
      id: 1,
      name: "김지수",
      school: "한국대",
      activity: "누적 봉사 12시간"
    },
    {
      id: 2,
      name: "이민준",
      school: "광운대",
      activity: "누적 봉사 8시간"
    }
  ];

  const handleCreateTask = (e) => {
    e.preventDefault();

    if (!newTaskContent) {
      return alert("요청 내용을 입력해 주세요.");
    }

    const newTask = {
      id: Date.now(),
      requesterType: role === 'family' ? "어르신 가족" : "어르신 본인",
      category: newTaskCategory,
      status: "모집 중",
      title: newTaskContent.length > 18
        ? newTaskContent.slice(0, 18) + "..."
        : newTaskContent,
      date: "오늘 오후",
      place: newTaskPlace,
      client: role === 'family'
        ? `${elderName} 어르신 (${familyName}님 대리 요청)`
        : "김순자 어르신 (본인)",
      desc: newTaskContent,
      duration: "약 1시간",
      volTime: "봉사 인정"
    };

    setTasks([newTask, ...tasks]);

    if (role === 'family') {
      alert(`${elderName} 어르신을 위한 의뢰가 등록되었습니다!`);
    } else {
      alert("월계1동 의뢰가 등록되었습니다!");
    }

    setNewTaskContent("");
    setPage('elder_home');
  };

  return (
    <div style={{
      background: '#f5f5f5',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      padding: '16px 0',
      fontFamily: '-apple-system, sans-serif'
    }}>
      <div style={{
        width: '390px',
        minHeight: '844px',
        background: '#fff',
        border: '1px solid #d9d6d2',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* 헤더 */}
        {page !== 'role' && (
          <header style={{
            height: '48px',
            borderBottom: '1px solid #e8e6e3',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            justifyContent: 'space-between'
          }}>
            <button
              onClick={() => {
                if (page === 'family_auth') {
                  setPage('role');
                  return;
                }

                setPage(role === 'student' ? 'student_home' : 'elder_home');
              }}
              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            >
              ←
            </button>

            <span style={{ fontSize: '15px', fontWeight: '600' }}>
              {page === 'student_home' && '홈 화면(대학생)'}
              {page === 'elder_home' && '홈 화면(어르신·가족)'}
              {page === 'family_auth' && '가족 인증'}
              {page === 'explore' && '의뢰 탐색 지도 (월계1동)'}
              {page === 'detail' && '의뢰 상세'}
              {page === 'checkin' && '활동 체크인'}
              {page === 'progress' && '활동 진행 중'}
              {page === 'complete' && '활동 완료 확인'}
              {page === 'review' && '후기 작성'}
              {page === 'applicants' && '신청자 확인'}
              {page === 'requester_complete' && '활동 완료 확인'}
              {page === 'requester_review' && '활동자 평가'}
              {page === 'create_task' && '도움 의뢰 등록'}
              {page === 'auth' && '소속 및 본인 확인'}
            </span>

            <div style={{ width: '20px' }} />
          </header>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* 역할 선택 */}
          {page === 'role' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'center',
              paddingTop: '40px'
            }}>
              <h1 style={{ fontSize: '22px', margin: 0 }}>이음</h1>

              <p style={{ color: '#5f5b57', fontSize: '13px' }}>
                세대를 잇는 월계1동 지역 돌봄
              </p>

              <RoleCard
                title="대학생 활동자"
                text="어르신을 돕고 봉사시간을 인증받으세요"
                onClick={() => {
                  setRole('student');
                  setPage('auth');
                }}
              />

              <RoleCard
                title="어르신 본인"
                text="생활 속 도움이 필요할 때 직접 요청하세요"
                onClick={() => {
                  setRole('elder');
                  setRequestCompleted(false);
                  setMatchedStudent(null);
                  setPage('elder_home');
                }}
              />

              <RoleCard
                title="어르신 가족"
                text="가족을 대신하여 도움을 요청하세요"
                onClick={() => {
                  setRole('family');
                  setFamilyVerified(false);
                  setCodeSent(false);
                  setVerificationCode("");
                  setRequestCompleted(false);
                  setMatchedStudent(null);
                  setPage('family_auth');
                }}
              />
            </div>
          )}

          {/* 대학생 인증 */}
          {page === 'auth' && (
            <div style={column}>
              <h2 style={title}>소속 대학 및 본인 확인</h2>

              <p style={description}>
                월계1동 인근 대학생 활동자 인증을 진행합니다.
              </p>

              <label style={labelStyle}>학교 이메일 (@ac.kr)</label>

              <input
                style={inputStyle}
                defaultValue="student@kw.ac.kr"
              />

              <button style={btnLight}>인증번호 발송</button>

              <div style={infoBox}>
                📍 서울특별시 노원구 월계1동 (인증 완료)
              </div>

              <button
                onClick={() => setPage('student_home')}
                style={btnDark}
              >
                인증 완료하고 시작하기
              </button>
            </div>
          )}

          {/* 가족 인증 */}
          {page === 'family_auth' && (
            <div style={column}>
              <h2 style={title}>어르신 가족 인증</h2>

              <p style={description}>
                가족 정보와 어르신의 동의 확인이 필요합니다.
              </p>

              <input
                placeholder="가족 이름"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="도움을 받을 어르신 이름"
                value={elderName}
                onChange={(e) => setElderName(e.target.value)}
                style={inputStyle}
              />

              <select
                value={familyRelation}
                onChange={(e) => setFamilyRelation(e.target.value)}
                style={inputStyle}
              >
                <option value="">어르신과의 관계</option>
                <option>자녀</option>
                <option>배우자</option>
                <option>손자녀</option>
                <option>형제·자매</option>
                <option>기타</option>
              </select>

              <input
                placeholder="가족 연락처"
                value={familyPhone}
                onChange={(e) => setFamilyPhone(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="어르신 연락처"
                value={elderPhone}
                onChange={(e) => setElderPhone(e.target.value)}
                style={inputStyle}
              />

              <button
                style={btnLight}
                onClick={() => {
                  if (!elderPhone.trim()) {
                    return alert("어르신 연락처를 입력해 주세요.");
                  }

                  setCodeSent(true);
                  setVerificationCode("");
                  alert("인증번호를 발송했습니다.\n테스트 인증번호: 123456");
                }}
              >
                {codeSent ? "인증번호 다시 발송" : "인증번호 발송"}
              </button>

              {codeSent && (
                <input
                  placeholder="6자리 인증번호"
                  maxLength="6"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(
                      e.target.value.replace(/[^0-9]/g, '')
                    )
                  }
                  style={inputStyle}
                />
              )}

              <button
                style={btnDark}
                onClick={() => {
                  if (
                    !familyName ||
                    !elderName ||
                    !familyRelation ||
                    !familyPhone ||
                    !elderPhone
                  ) {
                    return alert("모든 정보를 입력해 주세요.");
                  }

                  if (!codeSent) {
                    return alert("인증번호를 발송해 주세요.");
                  }

                  if (verificationCode !== "123456") {
                    return alert("인증번호가 올바르지 않습니다.");
                  }

                  setFamilyVerified(true);
                  alert("어르신 확인 및 가족 인증이 완료되었습니다.");
                  setPage('elder_home');
                }}
              >
                인증 완료
              </button>
            </div>
          )}

          {/* 대학생 홈 */}
          {page === 'student_home' && (
            <div style={column}>
              <h2 style={title}>안녕하세요, 김지수님 👋</h2>

              <div style={infoBox}>
                이번 달 활동 3회 · 누적 봉사시간 12시간 30분
              </div>

              <button
                onClick={() => setPage('explore')}
                style={btnDark}
              >
                🔍 월계1동 의뢰 탐색 지도 보기
              </button>

              <h3 style={{ fontSize: '15px' }}>내 진행 예정 활동</h3>

              <div style={card}>
                <strong>장보기 동행</strong>

                <div style={description}>
                  오늘 14:00 · 월계1동 주민센터 앞
                </div>

                <button
                  onClick={() => setPage('checkin')}
                  style={{ ...btnDark, marginTop: '10px' }}
                >
                  체크인
                </button>
              </div>
            </div>
          )}

          {/* 의뢰 탐색 */}
          {page === 'explore' && (
            <div style={column}>
              <div style={infoBox}>
                🗺️ 월계1동 실시간 의뢰 ({tasks.length}건)
              </div>

              {tasks.map((item) => (
                <div key={item.id} style={card}>
                  <strong>{item.title}</strong>

                  <div style={description}>
                    {item.requesterType} · {item.category}
                  </div>

                  <div style={description}>📅 {item.date}</div>
                  <div style={description}>📍 {item.place}</div>

                  <button
                    style={btnLight}
                    onClick={() => {
                      setSelectedTask(item);
                      setPage('detail');
                    }}
                  >
                    상세보기
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 의뢰 상세 */}
          {page === 'detail' && (
            <div style={column}>
              <h2 style={title}>{selectedTask.title}</h2>

              <div style={description}>
                의뢰자: {selectedTask.client}
              </div>

              <div style={description}>
                요청 유형: {selectedTask.requesterType}
              </div>

              <div style={infoBox}>
                {selectedTask.desc}
              </div>

              <button
                onClick={() => {
                  alert("의뢰가 수락되었습니다!");
                  setPage('checkin');
                }}
                style={btnDark}
              >
                의뢰 수락하고 체크인 준비
              </button>
            </div>
          )}

          {/* 체크인 */}
          {page === 'checkin' && (
            <div style={column}>
              <h2 style={title}>현장 체크인</h2>

              <label>
                <input
                  type="checkbox"
                  checked={check1}
                  onChange={(e) => setCheck1(e.target.checked)}
                /> 장소 도착 확인
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={check2}
                  onChange={(e) => setCheck2(e.target.checked)}
                /> 약속 시간 확인
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={check3}
                  onChange={(e) => setCheck3(e.target.checked)}
                /> 어르신과 만남 확인
              </label>

              <button
                disabled={!(check1 && check2 && check3)}
                onClick={() => setPage('progress')}
                style={{
                  ...btnDark,
                  opacity: check1 && check2 && check3 ? 1 : 0.4
                }}
              >
                활동 시작 체크인
              </button>
            </div>
          )}

          {/* 활동 진행 */}
          {page === 'progress' && (
            <div style={{ ...column, textAlign: 'center' }}>
              <div style={{ fontSize: '32px' }}>⏱️</div>

              <h2 style={title}>활동이 진행 중입니다</h2>

              <div style={infoBox}>
                체크인 14:03 · 경과 시간 1시간 24분
              </div>

              <button
                onClick={() => setPage('complete')}
                style={btnDark}
              >
                활동 종료 및 체크아웃
              </button>
            </div>
          )}

          {/* 학생 활동 완료 */}
          {page === 'complete' && (
            <div style={column}>
              <h2 style={title}>활동 완료 확인</h2>

              <div style={infoBox}>
                활동 유형: 장보기 동행<br />
                체크인 14:03 / 체크아웃 15:30<br />
                총 인정 시간: 1시간 30분
              </div>

              <button
                onClick={() => setPage('review')}
                style={btnDark}
              >
                후기 작성하고 봉사시간 적립
              </button>
            </div>
          )}

          {/* 학생 후기 */}
          {page === 'review' && (
            <div style={column}>
              <h2 style={title}>활동 후기 작성</h2>

              <div style={{ textAlign: 'center', fontSize: '24px' }}>
                ⭐⭐⭐⭐⭐
              </div>

              <textarea
                placeholder="활동 후기를 작성해 주세요."
                style={{ ...inputStyle, height: '100px' }}
              />

              <button
                onClick={() => {
                  alert("후기가 등록되었습니다!");
                  setPage('student_home');
                }}
                style={btnDark}
              >
                후기 제출 완료
              </button>
            </div>
          )}

          {/* 어르신/가족 홈 */}
          {page === 'elder_home' && (
            <div style={column}>
              <h2 style={title}>
                {role === 'family'
                  ? `안녕하세요, ${familyName}님`
                  : '안녕하세요, 김순자 어르신'}
              </h2>

              {role === 'family' && familyVerified && (
                <div style={infoBox}>
                  ✓ {elderName} 어르신 동의 확인 완료
                </div>
              )}

              <div style={card}>
                <strong>
                  {role === 'family'
                    ? `${elderName} 어르신께 도움이 필요하신가요?`
                    : '도움이 필요하신가요?'}
                </strong>

                <p style={description}>
                  대학생 청년이 장보기, 병원 동행, 말벗 도움을 드립니다.
                </p>

                <button
                  onClick={() => setPage('create_task')}
                  style={btnDark}
                >
                  도움 의뢰 등록하기
                </button>
              </div>

              <h3 style={{ fontSize: '15px', marginBottom: 0 }}>
                내 의뢰 현황
              </h3>

              <div style={card}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <strong>장보기 도움 의뢰</strong>

                  <strong style={{
                    color: requestCompleted
                      ? '#2563EB'
                      : matchedStudent
                      ? '#10B981'
                      : '#E67E22'
                  }}>
                    {requestCompleted
                      ? '활동 완료'
                      : matchedStudent
                      ? '매칭 완료'
                      : `신청자 ${applicants.length}명`}
                  </strong>
                </div>

                {!matchedStudent && !requestCompleted && (
                  <>
                    <div style={{
                      ...description,
                      marginTop: '5px'
                    }}>
                      대학생 활동자의 신청이 도착했습니다.
                    </div>

                    <button
                      onClick={() => setPage('applicants')}
                      style={{
                        ...btnLight,
                        marginTop: '10px'
                      }}
                    >
                      신청자 확인
                    </button>
                  </>
                )}

                {matchedStudent && !requestCompleted && (
                  <>
                    <div style={{
                      ...description,
                      marginTop: '5px'
                    }}>
                      활동자: {matchedStudent.name} ({matchedStudent.school}) 매칭됨
                    </div>

                    <button
                      onClick={() => {
                        setCompletionChecker(
                          role === 'elder'
                            ? '김순자 어르신'
                            : ''
                        );

                        setPage('requester_complete');
                      }}
                      style={{
                        ...btnLight,
                        marginTop: '10px'
                      }}
                    >
                      활동 완료 확인
                    </button>
                  </>
                )}

                {requestCompleted && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '13px'
                  }}>
                    <div>
                      활동자: {matchedStudent?.name} ({matchedStudent?.school})
                    </div>

                    <div style={{ marginTop: '5px' }}>
                      {'★'.repeat(requesterRating)}
                      {'☆'.repeat(5 - requesterRating)}
                    </div>

                    <div style={{
                      color: '#666',
                      marginTop: '3px'
                    }}>
                      {completionChecker} 확인 완료
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 신청자 확인 */}
          {page === 'applicants' && (
            <div style={column}>
              <h2 style={title}>신청자 확인</h2>

              <div style={infoBox}>
                장보기 도움 의뢰에 {applicants.length}명의 대학생이 신청했습니다.
              </div>

              {applicants.map((student) => (
                <div key={student.id} style={card}>
                  <strong>{student.name}</strong>

                  <div style={{
                    ...description,
                    marginTop: '5px'
                  }}>
                    {student.school}
                  </div>

                  <div style={{
                    ...description,
                    marginTop: '3px'
                  }}>
                    {student.activity}
                  </div>

                  <button
                    onClick={() => {
                      const ok = window.confirm(
                        `${student.name} 학생과 매칭하시겠습니까?`
                      );

                      if (!ok) return;

                      setMatchedStudent(student);

                      alert(
                        `${student.name} 학생과 매칭되었습니다.`
                      );

                      setPage('elder_home');
                    }}
                    style={{
                      ...btnDark,
                      marginTop: '10px'
                    }}
                  >
                    이 활동자 선택
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 의뢰자 활동 완료 확인 */}
          {page === 'requester_complete' && (
            <div style={column}>
              <h2 style={title}>활동 완료 확인</h2>

              <div style={infoBox}>
                {matchedStudent?.name} 활동자가 활동을 종료했습니다.<br />
                장보기 동행 · 14:03 ~ 15:30
              </div>

              {role === 'family' && (
                <>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    누가 활동 완료를 확인하시나요?
                  </div>

                  <button
                    onClick={() =>
                      setCompletionChecker(`가족 ${familyName}님`)
                    }
                    style={{
                      ...btnLight,
                      background:
                        completionChecker === `가족 ${familyName}님`
                          ? '#2e2c2a'
                          : '#fff',
                      color:
                        completionChecker === `가족 ${familyName}님`
                          ? '#fff'
                          : '#2e2c2a'
                    }}
                  >
                    가족 {familyName}님
                  </button>

                  <button
                    onClick={() =>
                      setCompletionChecker(`${elderName} 어르신`)
                    }
                    style={{
                      ...btnLight,
                      background:
                        completionChecker === `${elderName} 어르신`
                          ? '#2e2c2a'
                          : '#fff',
                      color:
                        completionChecker === `${elderName} 어르신`
                          ? '#fff'
                          : '#2e2c2a'
                    }}
                  >
                    {elderName} 어르신
                  </button>
                </>
              )}

              {role === 'elder' && (
                <div style={infoBox}>
                  김순자 어르신이 활동 완료를 확인합니다.
                </div>
              )}

              <button
                onClick={() => {
                  if (!completionChecker) {
                    return alert("완료 확인자를 선택해 주세요.");
                  }

                  setRequesterRating(0);
                  setRequesterReview("");
                  setPage('requester_review');
                }}
                style={btnDark}
              >
                활동 완료 확인
              </button>
            </div>
          )}

          {/* 의뢰자 평가 */}
          {page === 'requester_review' && (
            <div style={column}>
              <h2 style={title}>활동자 평가</h2>

              <div style={description}>
                {matchedStudent?.name} 활동자의 활동은 어떠셨나요?
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '6px'
              }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRequesterRating(star)}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '30px',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    {star <= requesterRating ? '★' : '☆'}
                  </button>
                ))}
              </div>

              <div style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#666'
              }}>
                별점은 필수입니다.
              </div>

              <textarea
                value={requesterReview}
                onChange={(e) =>
                  setRequesterReview(e.target.value)
                }
                placeholder="후기를 남겨주세요. (선택)"
                style={{
                  ...inputStyle,
                  height: '100px'
                }}
              />

              <button
                onClick={() => {
                  if (requesterRating === 0) {
                    return alert("별점을 선택해 주세요.");
                  }

                  setRequestCompleted(true);
                  alert("활동 확인 및 평가가 완료되었습니다.");
                  setPage('elder_home');
                }}
                style={btnDark}
              >
                평가 완료
              </button>
            </div>
          )}

          {/* 도움 의뢰 등록 */}
          {page === 'create_task' && (
            <form
              onSubmit={handleCreateTask}
              style={column}
            >
              <h2 style={title}>
                어떤 도움이 필요하신가요?
              </h2>

              <div style={infoBox}>
                {role === 'family'
                  ? `${familyName}님이 ${elderName} 어르신을 대신하여 요청합니다.`
                  : '어르신 본인이 직접 요청합니다.'}
              </div>

              <label style={labelStyle}>도움 유형</label>

              <select
                value={newTaskCategory}
                onChange={(e) =>
                  setNewTaskCategory(e.target.value)
                }
                style={inputStyle}
              >
                <option>장보기</option>
                <option>병원 동행</option>
                <option>말벗</option>
                <option>기타</option>
              </select>

              <label style={labelStyle}>요청 내용</label>

              <textarea
                value={newTaskContent}
                onChange={(e) =>
                  setNewTaskContent(e.target.value)
                }
                placeholder="필요한 도움을 입력해 주세요."
                style={{
                  ...inputStyle,
                  height: '80px'
                }}
              />

              <label style={labelStyle}>만남 장소</label>

              <input
                value={newTaskPlace}
                onChange={(e) =>
                  setNewTaskPlace(e.target.value)
                }
                style={inputStyle}
              />

              <button
                type="submit"
                style={btnDark}
              >
                의뢰 등록 완료
              </button>
            </form>
          )}

        </div>

        {/* 하단 메뉴 */}
        {page !== 'role' && page !== 'family_auth' && (
          <nav style={{
            height: '56px',
            borderTop: '1px solid #e8e6e3',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center'
          }}>
            <button
              onClick={() =>
                setPage(
                  role === 'student'
                    ? 'student_home'
                    : 'elder_home'
                )
              }
              style={tabBtn}
            >
              🏠 홈
            </button>

            <button
              onClick={() => setPage('explore')}
              style={tabBtn}
            >
              📋 의뢰
            </button>

            <button
              onClick={() =>
                alert('월계1동 주민센터 제보 탭입니다.')
              }
              style={tabBtn}
            >
              📍 제보
            </button>

            <button
              onClick={() => setPage('role')}
              style={tabBtn}
            >
              👤 전환
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

function RoleCard({ title, text, onClick }) {
  return (
    <div style={card}>
      <strong>{title}</strong>

      <p style={description}>
        {text}
      </p>

      <button
        onClick={onClick}
        style={btnDark}
      >
        선택하기
      </button>
    </div>
  );
}

const column = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px'
};

const card = {
  border: '1px solid #e8e6e3',
  borderRadius: '8px',
  padding: '14px',
  textAlign: 'left'
};

const infoBox = {
  background: '#f6f5f3',
  padding: '12px',
  borderRadius: '8px',
  fontSize: '13px',
  lineHeight: 1.6
};

const title = {
  fontSize: '18px',
  margin: 0
};

const description = {
  fontSize: '13px',
  color: '#5f5b57'
};

const btnDark = {
  border: '1px solid #2e2c2a',
  borderRadius: '6px',
  padding: '10px 16px',
  background: '#2e2c2a',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: '500',
  width: '100%'
};

const btnLight = {
  border: '1px solid #d9d6d2',
  borderRadius: '6px',
  padding: '8px 14px',
  background: '#fff',
  color: '#2e2c2a',
  cursor: 'pointer',
  fontWeight: '500'
};

const inputStyle = {
  width: '100%',
  border: '1px solid #d9d6d2',
  borderRadius: '6px',
  padding: '8px 10px',
  fontSize: '13px',
  boxSizing: 'border-box'
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#2e2c2a'
};

const tabBtn = {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  color: '#5f5b57'
};