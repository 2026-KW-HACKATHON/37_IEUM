import { useState } from "react";

/* ─────────────────────────────────────────────
   이음(IEUM) · 봉사자(Student) 화면
   - 상태 체계: 모집 중 → 진행 중(배정됨) → 검토 중(제출완료) → 수정 요청 → 인증 완료
   - 의뢰자의 디자인 토큰과 UI 컴포넌트 구조를 동일하게 사용
   ───────────────────────────────────────────── */

const ME = "김대학"; // 데모용 로그인 유저

// 임시 데이터 (의뢰자 데이터 구조와 호환되게 구성)
const SAMPLE_TASKS = [
  {
    id: 1, title: "옛날이야기 기록하기", type: "말벗·기록",
    who: "본인", elderName: "", ageGroup: "80대",
    need: "젊을 때 살던 이야기를 글로 남기고 싶어요.",
    situation: "혼자 지내는 시간이 많고, 이야기하는 걸 좋아해요.",
    resultWanted: "글 기록", period: "한 달 이내", note: "",
    status: "모집 중", applicants: [], assignee: null
  },
  {
    id: 2, title: "스마트폰으로 병원 예약하는 방법", type: "생활·디지털 안내",
    who: "가족", elderName: "이순자 어르신", ageGroup: "70대",
    need: "병원 앱으로 진료 예약하는 방법을 알고 싶어요.",
    situation: "스마트폰은 쓰시지만 앱 설치와 로그인을 어려워하세요.",
    resultWanted: "PDF 안내문", period: "2주일 이내", note: "글씨는 크게 부탁드려요.",
    status: "모집 중", applicants: [ME], assignee: null // 내가 신청한 상태
  },
  {
    id: 3, title: "키오스크 주문 방법 안내", type: "생활·디지털 안내",
    who: "본인", elderName: "", ageGroup: "70대",
    need: "카페 키오스크로 주문하는 방법을 알려 주세요.",
    resultWanted: "영상", period: "2주일 이내", note: "",
    status: "진행 중", applicants: [ME], assignee: ME, // 나에게 배정됨
  },
  {
    id: 4, title: "식물 키우기 키트 안내", type: "생활·취미 키트",
    who: "가족", elderName: "박영식 어르신", ageGroup: "70대",
    need: "화분 키우는 방법을 쉽게 정리해 주세요.",
    resultWanted: "사진 자료", period: "1주일 이내", note: "",
    status: "수정 요청", applicants: [ME], assignee: ME,
    feedback: "사진 화질이 조금 흐립니다. 글씨가 잘 보이게 다시 찍어주실 수 있나요?",
  }
];

/* ───────── 공통 컴포넌트 ───────── */
const Header = ({ title, onBack }) => (
  <header className="st-header">
    {onBack ? (
      <button className="st-back" onClick={onBack} aria-label="뒤로 가기">‹</button>
    ) : <span className="st-logo">이음</span>}
    {onBack && <h1>{title}</h1>}
  </header>
);

const StatusChip = ({ status, isApplicant, assignee }) => {
  let label = status;
  let tone = "ing";

  if (status === "모집 중") {
    if (isApplicant) { label = "신청 완료"; tone = "done"; }
    else { tone = "brand"; }
  } else if (status === "진행 중") { tone = "ing"; }
  else if (status === "검토 중") { tone = "warn"; }
  else if (status === "수정 요청") { tone = "warn"; }
  else if (status === "인증 완료") { tone = "done"; }

  return <span className={`st-chip ${tone}`}>{label}</span>;
};

/* ───────── 결과물 제출 폼 ───────── */
function SubmitForm({ task, onUpdate }) {
  const [log, setLog] = useState("");
  const [file, setFile] = useState("");

  const send = () => {
    if (!log.trim() || !file) return alert("활동 내용과 결과물 파일을 모두 등록해 주세요.");
    onUpdate(task.id, { status: "검토 중", submission: { log, file }, feedback: "" });
  };

  return (
    <div className="st-panel submit-form">
      <h3>결과물 제출하기</h3>
      {task.status === "수정 요청" && (
        <div className="st-alert">
          <strong>운영자 보완 요청</strong>
          <p>{task.feedback}</p>
        </div>
      )}
      <label className="st-field">활동 내용 요약
        <textarea rows={3} placeholder="어떤 과정을 거쳐 결과물을 만들었는지 간단히 적어주세요." value={log} onChange={(e) => setLog(e.target.value)} />
      </label>
      <label className="st-field">결과물 파일 첨부
        <input type="file" onChange={(e) => setFile(e.target.files[0]?.name || "")} />
      </label>
      <button className="st-btn primary big" onClick={send}>
        {task.status === "수정 요청" ? "수정본 재제출하기" : "결과물 제출하기"}
      </button>
    </div>
  );
}

/* ───────── 메인 화면 ───────── */
export default function StudentHome() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [view, setView] = useState("home"); // home | detail
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("모집 중"); // 모집 중 | 내 활동

  const open = tasks.filter((t) => t.status === "모집 중" && !t.applicants.includes(ME));
  const mine = tasks.filter((t) => t.applicants.includes(ME) || t.assignee === ME);
  
  const detail = tasks.find((t) => t.id === selectedId);
  const isApplied = (t) => t.applicants.includes(ME);

  const list = tab === "모집 중" ? open : mine;

  const updateTask = (id, patch) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
    if (patch.status === "검토 중") setView("home"); // 제출 후 홈으로
  };

  const applyTask = (id) => {
    updateTask(id, { applicants: [...detail.applicants, ME] });
    setView("home");
    setTab("내 활동");
  };

  return (
    <div className="st-app">
      <style>{CSS}</style>

      {/* ── 홈 화면 ── */}
      {view === "home" && (
        <>
          <Header />
          <main className="st-main">
            <section className="st-hero">
              <h2>어르신의 일상에<br/>도움을 더해주세요</h2>
              <p>원하는 시간에 비대면으로 참여하는 봉사활동</p>
            </section>

            <section className="st-summary">
              <div onClick={() => setTab("모집 중")} style={{cursor: 'pointer'}}>
                <strong>{open.length}</strong><span>새로운 봉사</span>
              </div>
              <div onClick={() => setTab("내 활동")} style={{cursor: 'pointer'}}>
                <strong>{mine.length}</strong><span>나의 활동</span>
              </div>
            </section>

            <section>
              <div className="st-tabs" role="tablist">
                <button role="tab" className={tab === "모집 중" ? "on" : ""} onClick={() => setTab("모집 중")}>모집 중인 활동</button>
                <button role="tab" className={tab === "내 활동" ? "on" : ""} onClick={() => setTab("내 활동")}>내 활동</button>
              </div>

              {list.length === 0 ? (
                <p className="st-empty">
                  {tab === "모집 중" ? "지금은 모집 중인 활동이 없어요." : "아직 신청한 활동이 없어요. 모집 중인 활동을 확인해 보세요!"}
                </p>
              ) : (
                <ul className="st-list">
                  {list.map((t) => (
                    <li key={t.id}>
                      <button className="st-card" onClick={() => { setSelectedId(t.id); setView("detail"); }}>
                        <div className="top">
                          <span className="type">{t.type}</span>
                          <StatusChip status={t.status} isApplicant={isApplied(t)} assignee={t.assignee} />
                        </div>
                        <strong>{t.title}</strong>
                        <span className="sub">
                          {t.who === "가족" ? `${t.elderName} · ` : `본인 · `} {t.resultWanted} 형태
                        </span>
                        {t.status === "수정 요청" && t.assignee === ME && <span className="hint">운영자의 보완 요청이 있어요</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </>
      )}

      {/* ── 상세 화면 ── */}
      {view === "detail" && detail && (
        <>
          <Header title="봉사활동 상세" onBack={() => setView("home")} />
          <main className="st-main">
            <div className="st-detail-head">
              <span className="type">{detail.type}</span>
              <h2>{detail.title}</h2>
              <StatusChip status={detail.status} isApplicant={isApplied(detail)} assignee={detail.assignee} />
            </div>

            {/* 의뢰 내용 요약 */}
            <section>
              <h3 className="st-h3">의뢰 내용</h3>
              <dl className="st-dl">
                <dt>대상</dt><dd>{detail.who === "가족" ? `${detail.elderName} (${detail.ageGroup})` : `본인 (${detail.ageGroup})`}</dd>
                <dt>필요한 도움</dt><dd>{detail.need}</dd>
                {detail.situation && <><dt>어르신 상황</dt><dd>{detail.situation}</dd></>}
                <dt>원하는 결과물</dt><dd>{detail.resultWanted}</dd>
                <dt>희망 기간</dt><dd>{detail.period}</dd>
                {detail.note && <><dt>기타 전달사항</dt><dd>{detail.note}</dd></>}
              </dl>
            </section>

            {/* 상태에 따른 하단 액션 / 폼 영역 */}
            {detail.status === "모집 중" && !isApplied(detail) && (
              <div className="st-footer-action">
                <p className="st-note">신청하면 운영자가 내용을 검토한 뒤 개별 배정해 드려요.</p>
                <button className="st-btn primary big" onClick={() => applyTask(detail.id)}>이 활동 참여 신청하기</button>
              </div>
            )}

            {detail.status === "모집 중" && isApplied(detail) && (
              <div className="st-panel">
                <h4>신청 완료</h4>
                <p>운영자가 배정을 진행하고 있어요. 배정 결과는 알림으로 알려드려요.</p>
              </div>
            )}

            {(detail.status === "진행 중" || detail.status === "수정 요청") && detail.assignee === ME && (
              <SubmitForm task={detail} onUpdate={updateTask} />
            )}

            {detail.status === "검토 중" && detail.assignee === ME && (
              <div className="st-panel">
                <h4>제출 완료</h4>
                <p>운영자가 제출하신 결과물을 검토하고 있어요. 검토가 끝나면 봉사시간이 인증돼요.</p>
              </div>
            )}

            {detail.status === "인증 완료" && detail.assignee === ME && (
              <div className="st-panel" style={{ borderColor: 'var(--done)', backgroundColor: 'var(--done-soft)' }}>
                <h4 style={{ color: 'var(--done)' }}>🎉 인증 완료</h4>
                <p>수고하셨습니다! 어르신께 결과물이 잘 전달되었으며 봉사시간 인증이 완료되었습니다.</p>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

/* ───────── 스타일 (의뢰자 화면과 동일한 테마 공유) ───────── */
const CSS = `
.st-app {
  --ink: #172B3A; --sub: #5B6B77; --line: #DDE5EA; --bg: #F5F8FA; --card: #fff;
  --brand: #0F7B8A; --brand-soft: #E3F2F4; 
  --warn: #B4532A; --warn-soft: #FBEBE3; 
  --done: #2E7D55; --done-soft: #E4F3EA;
  max-width: 480px; margin: 0 auto; min-height: 100vh; background: var(--bg); color: var(--ink);
  font-family: Pretendard, "Noto Sans KR", system-ui, sans-serif; font-size: 17px; line-height: 1.55; display: flex; flex-direction: column;
}
.st-app * { box-sizing: border-box; }
.st-app button { font: inherit; color: inherit; cursor: pointer; }

/* Header */
.st-header { display: flex; align-items: center; gap: 8px; padding: 14px 16px; background: var(--card); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 2; }
.st-header h1 { font-size: 19px; margin: 0; }
.st-logo { font-weight: 800; font-size: 22px; color: var(--brand); letter-spacing: -.02em; }
.st-back { border: 0; background: none; font-size: 30px; line-height: 1; padding: 0 8px 4px 0; }

/* Main */
.st-main { padding: 20px 16px 32px; display: flex; flex-direction: column; gap: 24px; flex: 1; }
.st-hero { background: var(--ink); color: #fff; border-radius: 20px; padding: 24px 20px; }
.st-hero h2 { margin: 0 0 8px; font-size: 24px; line-height: 1.35; }
.st-hero p { margin: 0; opacity: .8; font-size: 15px; }

/* Dashboard */
.st-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.st-summary div { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; transition: transform 0.1s; }
.st-summary div:active { transform: scale(0.98); }
.st-summary strong { font-size: 28px; line-height: 1.2; color: var(--brand); }
.st-summary span { color: var(--sub); font-size: 15px; }

/* Tabs */
.st-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.st-tabs button { border: 1px solid var(--line); background: var(--card); border-radius: 999px; padding: 6px 16px; }
.st-tabs button.on { background: var(--ink); color: #fff; border-color: var(--ink); }

/* List & Cards */
.st-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.st-card { width: 100%; text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
.st-card .top { display: flex; justify-content: space-between; align-items: center; }
.st-card strong { font-size: 18px; line-height: 1.4; }
.st-card .sub, .type { color: var(--sub); font-size: 14px; }
.st-card .hint { color: var(--warn); font-size: 14px; font-weight: 600; margin-top: 4px; }
.st-empty { color: var(--sub); background: var(--card); border: 1px dashed var(--line); border-radius: 14px; padding: 24px; margin: 0; text-align: center; }

/* Detail Head & DL */
.st-detail-head { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.st-detail-head h2 { margin: 0 0 4px; font-size: 22px; line-height: 1.35; }
.st-h3 { font-size: 18px; margin: 0 0 10px; }
.st-dl { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 8px 16px; }
.st-dl dt { color: var(--sub); font-size: 14px; margin-top: 10px; }
.st-dl dd { margin: 2px 0 10px; font-weight: 500; }

/* Panels & Forms */
.st-panel { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 20px; }
.st-panel h4 { margin: 0 0 8px; font-size: 16px; }
.st-panel p { margin: 0; font-size: 15px; color: var(--sub); }
.st-alert { background: var(--warn-soft); border: 1px solid #F0CDBE; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; }
.st-alert p { margin: 4px 0 0; font-size: 15px; }
.st-field { display: flex; flex-direction: column; gap: 8px; font-weight: 600; margin-bottom: 16px; }
.st-field textarea, .st-field input { font: inherit; border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: #fff; resize: vertical; font-weight: 400; }
.st-field input[type="file"] { padding: 10px; font-size: 15px; }

/* Buttons & Chips */
.st-btn { border: 1px solid var(--line); background: var(--card); border-radius: 12px; padding: 10px 16px; font-weight: 600; }
.st-btn.primary { background: var(--ink); border-color: var(--ink); color: #fff; }
.st-btn.big { width: 100%; min-height: 56px; font-size: 18px; margin-top: 8px; }
.st-chip { font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
.st-chip.brand { background: var(--brand-soft); color: var(--brand); }
.st-chip.ing { background: var(--line); color: var(--ink); }
.st-chip.warn { background: var(--warn-soft); color: var(--warn); }
.st-chip.done { background: var(--done-soft); color: var(--done); }

.st-footer-action { margin-top: auto; padding-top: 20px; }
.st-note { color: var(--sub); font-size: 14px; text-align: center; margin-bottom: 10px; }
`;