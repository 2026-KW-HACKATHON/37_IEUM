import React, { useState } from 'react';

// 월계1동 중심 실제 의뢰 데이터
const initialTasks = [
  {
    id: 1,
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
  // 화면 전환 네비게이션: 'role', 'auth', 'student_home', 'elder_home', 'explore', 'detail', 'checkin', 'progress', 'complete', 'review', 'create_task'
  const [page, setPage] = useState('role');
  const [role, setRole] = useState('student'); // 'student' | 'elder'
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(initialTasks[0]);

  // 체크인 체크박스 상태
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  // 어르신 의뢰 등록 폼 상태
  const [newTaskCategory, setNewTaskCategory] = useState("장보기");
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newTaskPlace, setNewTaskPlace] = useState("월계1동 주민센터 앞");

  // 의뢰 등록 처리
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskContent) return alert("요청 내용을 입력해 주세요.");
    const newTask = {
      id: Date.now(),
      category: newTaskCategory,
      status: "모집 중",
      title: newTaskContent.slice(0, 18) + "...",
      date: "오늘 오후",
      place: newTaskPlace,
      client: "김순자 어르신 (본인)",
      desc: newTaskContent,
      duration: "약 1시간",
      volTime: "봉사 인정"
    };
    setTasks([newTask, ...tasks]);
    alert("월계1동 의뢰가 등록되었습니다!");
    setPage('elder_home');
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '16px 0', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ width: '390px', minHeight: '844px', background: '#fff', border: '1px solid #d9d6d2', borderRadius: '12px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

        {/* 상단 앱 헤더 (역할 화면 제외) */}
        {page !== 'role' && (
          <header style={{ height: '48px', borderBottom: '1px solid #e8e6e3', display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: 'space-between', flexShrink: 0 }}>
            <button onClick={() => setPage(role === 'student' ? 'student_home' : 'elder_home')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>←</button>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>
              {page === 'student_home' && '홈 화면(대학생)'}
              {page === 'elder_home' && '홈 화면(어르신·가족)'}
              {page === 'explore' && '의뢰 탐색 지도 (월계1동)'}
              {page === 'detail' && '의뢰 상세'}
              {page === 'checkin' && '활동 체크인'}
              {page === 'progress' && '활동 진행 중'}
              {page === 'complete' && '활동 완료 확인'}
              {page === 'review' && '후기 작성'}
              {page === 'create_task' && '도움 의뢰 등록'}
              {page === 'auth' && '소속 및 본인 확인'}
            </span>
            <div style={{ width: '20px' }}></div>
          </header>
        )}

        {/* 스크롤 가능한 본문 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* 1. 역할 선택 화면 (n2) */}
          {page === 'role' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', paddingTop: '40px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>이음</h1>
              <p style={{ color: '#5f5b57', fontSize: '13px', margin: 0 }}>세대를 잇는 월계1동 지역 돌봄</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <div style={{ border: '1px solid #e8e6e3', borderRadius: '8px', padding: '16px', textAlign: 'left' }}>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>대학생 활동자</div>
                  <div style={{ fontSize: '12px', color: '#8f8a85', margin: '4px 0 12px 0' }}>어르신을 돕고 봉사시간을 인증받으세요</div>
                  <button onClick={() => { setRole('student'); setPage('auth'); }} style={btnDark}>선택하기</button>
                </div>

                <div style={{ border: '1px solid #e8e6e3', borderRadius: '8px', padding: '16px', textAlign: 'left' }}>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>어르신 의뢰자 / 가족 대리</div>
                  <div style={{ fontSize: '12px', color: '#8f8a85', margin: '4px 0 12px 0' }}>생활 속 도움이 필요할 때 요청하세요</div>
                  <button onClick={() => { setRole('elder'); setPage('elder_home'); }} style={btnDark}>선택하기</button>
                </div>
              </div>
            </div>
          )}

          {/* 2. 대학생 본인/학교 인증 화면 (n5, n9) */}
          {page === 'auth' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '17px', margin: 0 }}>소속 대학 및 본인 확인</h2>
              <p style={{ fontSize: '13px', color: '#5f5b57', margin: 0 }}>월계1동 인근 대학생 활동자 인증을 진행합니다.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={labelStyle}>학교 이메일 (@ac.kr)</label>
                <input placeholder="example@university.ac.kr" style={inputStyle} defaultValue="student@kw.ac.kr" />
                <button style={btnLight}>인증번호 발송</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={labelStyle}>거주/활동 인증지</label>
                <div style={{ padding: '10px', background: '#f6f5f3', borderRadius: '6px', fontSize: '13px' }}>
                  📍 서울특별시 노원구 월계1동 (인증 완료)
                </div>
              </div>

              <button onClick={() => setPage('student_home')} style={{ ...btnDark, marginTop: '20px' }}>인증 완료하고 시작하기</button>
            </div>
          )}

          {/* 3. 대학생 홈 화면 (n12) */}
          {page === 'student_home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', margin: '0 0 4px 0' }}>안녕하세요, 김지수님 👋</h2>
                <p style={{ fontSize: '13px', color: '#5f5b57', margin: 0 }}>오늘도 월계1동 이웃과 함께해요</p>
              </div>

              {/* 통계 요약 카드 */}
              <div style={{ border: '1px solid #e8e6e3', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div><div style={{ fontSize: '11px', color: '#8f8a85' }}>이번 달 활동</div><div style={{ fontWeight: '700', fontSize: '15px' }}>3회</div></div>
                <div><div style={{ fontSize: '11px', color: '#8f8a85' }}>누적 봉사시간</div><div style={{ fontWeight: '700', fontSize: '15px' }}>12시간 30분</div></div>
                <div><div style={{ fontSize: '11px', color: '#8f8a85' }}>1365 연계</div><div style={{ fontWeight: '700', fontSize: '15px', color: '#2563EB' }}>연동 완료</div></div>
              </div>

              {/* 액션 버튼 */}
              <button onClick={() => setPage('explore')} style={{ ...btnDark, padding: '12px' }}>
                🔍 월계1동 의뢰 탐색 지도 보기
              </button>

              <h3 style={{ fontSize: '15px', margin: '10px 0 0 0' }}>내 진행 예정 활동</h3>
              <div style={{ border: '1px solid #e8e6e3', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>장보기 동행</div>
                  <div style={{ fontSize: '12px', color: '#5f5b57' }}>오늘 14:00 · 월계1동 주민센터 앞</div>
                </div>
                <button onClick={() => setPage('checkin')} style={{ ...btnDark, padding: '6px 12px', fontSize: '13px' }}>체크인</button>
              </div>
            </div>
          )}

          {/* 4. 의뢰 탐색 지도 목록 (n14) */}
          {page === 'explore' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 지도 박스 */}
              <div style={{ height: '140px', background: '#e2e4dc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5f5b57', fontSize: '13px' }}>
                🗺️ 월계1동 실시간 의뢰 지도 핀 노출 중 (3건)
              </div>

              <div style={{ fontSize: '14px', fontWeight: '600' }}>탐색된 의뢰 ({tasks.length}건)</div>

              {tasks.map((item) => (
                <div key={item.id} style={{ border: '1px solid #e8e6e3', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', background: '#ecebe8', padding: '2px 8px', borderRadius: '100px' }}>{item.category}</span>
                    <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: '600' }}>{item.status}</span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: '#5f5b57' }}>📅 {item.date}</div>
                  <div style={{ fontSize: '12px', color: '#5f5b57' }}>📍 {item.place}</div>
                  <button onClick={() => { setSelectedTask(item); setPage('detail'); }} style={{ ...btnLight, marginTop: '6px', alignSelf: 'flex-end', fontSize: '13px' }}>
                    상세보기
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 5. 의뢰 상세 보기 (n17) */}
          {page === 'detail' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid #e8e6e3', paddingBottom: '12px' }}>
                <span style={{ fontSize: '12px', background: '#ecebe8', padding: '2px 8px', borderRadius: '100px' }}>{selectedTask.category}</span>
                <h2 style={{ fontSize: '18px', margin: '8px 0 4px 0' }}>{selectedTask.title}</h2>
                <div style={{ fontSize: '13px', color: '#5f5b57' }}>의뢰자: {selectedTask.client}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div><strong>일시:</strong> {selectedTask.date}</div>
                <div><strong>예상 소요:</strong> {selectedTask.duration}</div>
                <div><strong>장소:</strong> {selectedTask.place}</div>
                <div><strong>봉사 인정:</strong> {selectedTask.volTime}</div>
              </div>

              <div style={{ background: '#f6f5f3', padding: '12px', borderRadius: '6px', fontSize: '13px', lineHeight: 1.5 }}>
                {selectedTask.desc}
              </div>

              <button onClick={() => { alert('의뢰가 수락되었습니다!'); setPage('checkin'); }} style={btnDark}>
                의뢰 수락하고 체크인 준비
              </button>
            </div>
          )}

          {/* 6. 활동 체크인 (n30) */}
          {page === 'checkin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '17px', margin: 0 }}>현장 체크인 (월계1동)</h2>
              <div style={{ border: '1px solid #e8e6e3', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                <div><strong>대상:</strong> 김순자 어르신 (장보기 동행)</div>
                <div><strong>위치:</strong> 월계1동 주민센터 앞 </div>
                <div><strong>현재 시각:</strong> 14:02 (체크인 정상 구간)</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '10px 0' }}>
                <label style={{ fontSize: '13px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={check1} onChange={(e) => setCheck1(e.target.checked)} />
                  약속 장소(주민센터 앞)에 도착했습니다
                </label>
                <label style={{ fontSize: '13px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={check2} onChange={(e) => setCheck2(e.target.checked)} />
                  약속 시간을 확인했습니다 (14:00)
                </label>
                <label style={{ fontSize: '13px', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={check3} onChange={(e) => setCheck3(e.target.checked)} />
                  어르신과 직접 만남을 확인했습니다
                </label>
              </div>

              <button 
                disabled={!(check1 && check2 && check3)} 
                onClick={() => setPage('progress')} 
                style={{ ...btnDark, background: (check1 && check2 && check3) ? '#2e2c2a' : '#ccc', cursor: (check1 && check2 && check3) ? 'pointer' : 'not-allowed' }}
              >
                활동 시작 체크인
              </button>
            </div>
          )}

          {/* 7. 활동 진행 중 (n32) */}
          {page === 'progress' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', paddingTop: '20px' }}>
              <div style={{ fontSize: '32px' }}>⏱️</div>
              <h2 style={{ fontSize: '18px', margin: 0 }}>활동이 안전하게 진행 중입니다</h2>
              <p style={{ fontSize: '13px', color: '#5f5b57', margin: 0 }}>장소: 월계시장 하나로마트 일대</p>

              <div style={{ border: '1px solid #e8e6e3', borderRadius: '8px', padding: '16px', textAlign: 'left', fontSize: '13px', lineHeight: 1.8 }}>
                <div>• 체크인 완료: 14:03</div>
                <div>• 경과 시간: 1시간 24분</div>
                <div>• 체크아웃 권장 시각: 15:00 ~ 15:30</div>
              </div>

              <button onClick={() => setPage('complete')} style={{ ...btnDark, marginTop: '20px' }}>
                활동 종료 및 체크아웃
              </button>
            </div>
          )}

          {/* 8. 활동 완료 확인 (n36) */}
          {page === 'complete' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>활동 완료 확인</h2>
              <div style={{ border: '1px solid #e8e6e3', borderRadius: '8px', padding: '14px', fontSize: '13px', lineHeight: 1.8 }}>
                <div><strong>활동 유형:</strong> 장보기 동행</div>
                <div><strong>체크인:</strong> 14:03 / <strong>체크아웃:</strong> 15:30</div>
                <div><strong>총 인정 시간:</strong> 1시간 30분</div>
                <div><strong>검증 상태:</strong> 앱 자동 검증 완료 (1365 연계 대기)</div>
              </div>

              <button onClick={() => setPage('review')} style={btnDark}>후기 작성하고 봉사시간 적립</button>
            </div>
          )}

          {/* 9. 후기 작성 (n41) */}
          {page === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>활동 후기 작성</h2>
              <div style={{ fontSize: '13px', color: '#5f5b57' }}>어르신과의 활동은 어떠셨나요?</div>
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', fontSize: '24px', cursor: 'pointer' }}>
                ⭐⭐⭐⭐⭐
              </div>

              <textarea 
                rows="4" 
                placeholder="어르신께서 친절하게 맞아주셔서 보람찬 시간이었습니다. 장바구니 짐이 조금 무거웠지만 안전하게 귀가까지 모셔다드렸습니다." 
                style={{ ...inputStyle, height: '100px' }} 
              />

              <button onClick={() => { alert('후기가 등록되었으며 1365 봉사시간으로 전송되었습니다!'); setPage('student_home'); }} style={btnDark}>
                후기 제출 완료
              </button>
            </div>
          )}

          {/* 10. 어르신/가족 홈 화면 (n13) */}
          {page === 'elder_home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', margin: '0 0 4px 0' }}>안녕하세요, 김순자 어르신</h2>
                <p style={{ fontSize: '13px', color: '#5f5b57', margin: 0 }}>월계1동 청년들이 함께합니다</p>
              </div>

              <div style={{ border: '1px solid #e8e6e3', borderRadius: '8px', padding: '16px', background: '#fafafa' }}>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '6px' }}>도움이 필요하신가요?</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>대학생 청년이 장보기, 병원 동행, 말벗 도움을 드립니다.</div>
                <button onClick={() => setPage('create_task')} style={{ ...btnDark, width: '100%' }}>도움 의뢰 등록하기</button>
              </div>

              <h3 style={{ fontSize: '15px', margin: '8px 0 0 0' }}>내 의뢰 현황</h3>
              <div style={{ border: '1px solid #e8e6e3', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>장보기 도움 의뢰</span>
                  <span style={{ color: '#10B981' }}>매칭 완료</span>
                </div>
                <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>활동자: 김지수 (한국대) 매칭됨</div>
              </div>
            </div>
          )}

          {/* 11. 도움 의뢰 등록 (n22, n24) */}
          {page === 'create_task' && (
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h2 style={{ fontSize: '17px', margin: 0 }}>어떤 도움이 필요하신가요?</h2>
              
              <div>
                <label style={labelStyle}>도움 유형</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {["장보기", "병원 동행", "말벗", "기타"].map((cat) => (
                    <button 
                      key={cat} 
                      type="button" 
                      onClick={() => setNewTaskCategory(cat)}
                      style={{ ...btnLight, flex: 1, padding: '8px 4px', fontSize: '12px', background: newTaskCategory === cat ? '#2e2c2a' : '#fff', color: newTaskCategory === cat ? '#fff' : '#2e2c2a' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>요청 내용</label>
                <textarea 
                  rows="3" 
                  value={newTaskContent} 
                  onChange={(e) => setNewTaskContent(e.target.value)} 
                  placeholder="예: 월계시장 하나로마트에서 쌀과 과일 사는 것 동행 부탁드립니다." 
                  style={{ ...inputStyle, height: '80px' }} 
                />
              </div>

              <div>
                <label style={labelStyle}>만남 장소</label>
                <input 
                  value={newTaskPlace} 
                  onChange={(e) => setNewTaskPlace(e.target.value)} 
                  style={inputStyle} 
                />
              </div>

              <button type="submit" style={{ ...btnDark, marginTop: '10px' }}>의뢰 등록 완료</button>
            </form>
          )}

        </div>

        {/* 하단 고정 탭 바 (n12 스타일) */}
        {page !== 'role' && (
          <nav style={{ height: '56px', borderTop: '1px solid #e8e6e3', display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#fff', flexShrink: 0 }}>
            <button onClick={() => setPage(role === 'student' ? 'student_home' : 'elder_home')} style={tabBtn}>🏠 홈</button>
            <button onClick={() => setPage('explore')} style={tabBtn}>📋 의뢰</button>
            <button onClick={() => alert('월계1동 주민센터 제보 탭입니다.')} style={tabBtn}>📍 제보</button>
            <button onClick={() => setPage('role')} style={tabBtn}>👤 전환</button>
          </nav>
        )}

      </div>
    </div>
  );
}

// 스타일 모음
const btnDark = { border: '1px solid #2e2c2a', borderRadius: '6px', padding: '10px 16px', background: '#2e2c2a', color: '#fff', cursor: 'pointer', fontWeight: '500', width: '100%' };
const btnLight = { border: '1px solid #d9d6d2', borderRadius: '6px', padding: '8px 14px', background: '#fff', color: '#2e2c2a', cursor: 'pointer', fontWeight: '500' };
const inputStyle = { width: '100%', border: '1px solid #d9d6d2', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' };
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#2e2c2a' };
const tabBtn = { border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#5f5b57', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' };