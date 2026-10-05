import { useState } from "react";

/* ─────────────────────────────────────────────
   이음(IEUM) · 의뢰자(Requester) 화면
   - 비대면 봉사: 실시간 매칭/체크인 없이 "요청 → 운영자 검토 → 모집 → 진행 → 완료"
   - 공통 상태 체계(팀원 D)를 그대로 저장하고, 의뢰자에게는 5단계로 묶어서 보여줌
   ───────────────────────────────────────────── */

// 의뢰자에게 보이는 5단계
export const STAGES = ["요청 접수", "운영자 검토 중", "모집 중", "진행 중", "완료"];

// 공통 상태(요청 접수 → … → 인증 완료)를 의뢰자 단계로 변환
// 봉사자 배정~승인은 모두 "진행 중", 운영자 인증이 끝나야 "완료"
export const toStage = (status) =>
  ({
    "요청 접수": "요청 접수",
    "운영자 검토": "운영자 검토 중",
    "수정 요청": "운영자 검토 중",
    "모집 중": "모집 중",
    "인증 완료": "완료",
  }[status] ?? "진행 중");

const STAGE_MESSAGE = {
  "요청 접수": "요청이 접수되었어요. 운영자가 곧 내용을 확인해요.",
  "운영자 검토 중": "운영자가 요청을 검토하고 있어요. 보통 1~2일 걸려요.",
  "모집 중": "이 요청이 봉사활동으로 등록되어 대학생 봉사자를 모집하고 있어요.",
  "진행 중": "배정된 대학생이 자료를 준비하고 있어요. 운영자 검토가 끝나면 알려드려요.",
  완료: "운영자 인증이 끝났어요. 아래에서 결과물을 확인해 보세요.",
};

const TYPES = [
  { key: "생활·디지털 안내", icon: "📱", examples: "스마트폰 · 키오스크 · 병원 예약" },
  { key: "생활·취미 키트", icon: "🌱", examples: "식물 · 만들기 · 생활 키트" },
  { key: "말벗·기록", icon: "💬", examples: "안부 연락 · 이야기 기록" },
];
const AGE_GROUPS = ["60대", "70대", "80대", "90대 이상"];
const RESULT_TYPES = ["영상", "PDF 안내문", "사진 자료", "글 기록"];
const PERIODS = ["1주일 이내", "2주일 이내", "한 달 이내"];

const SAMPLE = [
  {
    id: 1, title: "스마트폰으로 병원 예약하는 방법", type: "생활·디지털 안내",
    who: "가족", elderName: "이순자 어르신", ageGroup: "70대",
    need: "병원 앱으로 진료 예약하는 방법을 알고 싶어요.",
    situation: "스마트폰은 쓰시지만 앱 설치와 로그인을 어려워하세요.",
    resultWanted: "PDF 안내문", period: "2주일 이내", note: "글씨는 크게 부탁드려요.",
    status: "진행 중",
    activity: { title: "어르신 스마트폰 병원 예약 안내", period: "2026.10.10 ~ 2026.10.17" },
  },
  {
    id: 2, title: "옛날이야기 기록하기", type: "말벗·기록",
    who: "본인", elderName: "", ageGroup: "80대",
    need: "젊을 때 살던 이야기를 글로 남기고 싶어요.",
    situation: "혼자 지내는 시간이 많고, 이야기하는 걸 좋아해요.",
    resultWanted: "글 기록", period: "한 달 이내", note: "",
    status: "모집 중",
    activity: { title: "어르신 이야기 기록 봉사", period: "2026.10.12 ~ 2026.11.02" },
  },
  {
    id: 3, title: "식물 키우기 키트 안내", type: "생활·취미 키트",
    who: "가족", elderName: "박영식 어르신", ageGroup: "70대",
    need: "화분 키우는 방법을 쉽게 정리해 주세요.",
    situation: "베란다에서 화분을 키우고 싶어 하세요.",
    resultWanted: "사진 자료", period: "1주일 이내", note: "",
    status: "수정 요청",
    reviewNote: "희망 기간이 짧아 모집이 어려워요. 2주일 이상으로 조정해 주세요.",
  },
  {
    id: 4, title: "키오스크 주문 방법 안내", type: "생활·디지털 안내",
    who: "본인", elderName: "", ageGroup: "70대",
    need: "카페 키오스크로 주문하는 방법을 알려 주세요.",
    situation: "직원에게 물어보기 어려워 주문을 못 하고 나온 적이 있어요.",
    resultWanted: "영상", period: "2주일 이내", note: "",
    status: "인증 완료",
    activity: { title: "키오스크 주문 안내 영상 제작", period: "2026.09.20 ~ 2026.09.30" },
    result: {
      summary: "카페 키오스크 주문 순서를 5단계 영상으로 만들었어요.",
      files: [{ name: "키오스크_주문_안내.mp4", kind: "영상" }, { name: "단계별_요약.pdf", kind: "PDF" }],
      log: "화면을 하나씩 캡처해 순서대로 설명하고, 자주 틀리는 부분은 따로 짚었어요.",
    },
  },
];

const EMPTY_FORM = {
  who: "본인", elderName: "", ageGroup: "", type: "",
  need: "", situation: "", resultWanted: "", period: "", note: "",
};

/* ───────── 작은 부품 (공통 컴포넌트가 준비되면 교체) ───────── */
const Header = ({ title, onBack }) => (
  <header className="rq-header">
    {onBack ? (
      <button className="rq-back" onClick={onBack} aria-label="뒤로 가기">‹</button>
    ) : <span className="rq-logo">이음</span>}
    {onBack && <h1>{title}</h1>}
  </header>
);

const StatusChip = ({ status }) => {
  const stage = toStage(status);
  const tone = stage === "완료" ? "done" : status === "수정 요청" ? "warn" : "ing";
  return <span className={`rq-chip ${tone}`}>{status === "수정 요청" ? "수정 요청" : stage}</span>;
};

const Stepper = ({ stage }) => {
  const idx = STAGES.indexOf(stage);
  return (
    <ol className="rq-stepper" aria-label="진행 상황">
      {STAGES.map((s, i) => (
        <li key={s} className={i < idx ? "past" : i === idx ? "now" : ""} aria-current={i === idx ? "step" : undefined}>
          <span className="dot">{i < idx ? "✓" : ""}</span>
          <span className="label">{s}</span>
        </li>
      ))}
    </ol>
  );
};

/* ───────── 메인 ───────── */
export default function RequesterHome() {
  const [requests, setRequests] = useState(SAMPLE);
  const [view, setView] = useState("home"); // home | form | detail
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("전체");
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [editingId, setEditingId] = useState(null);

  const selected = requests.find((r) => r.id === selectedId);
  const isDone = (r) => toStage(r.status) === "완료";
  const ongoing = requests.filter((r) => !isDone(r));
  const done = requests.filter(isDone);
  const list = tab === "진행 중" ? ongoing : tab === "완료" ? done : requests;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const openDetail = (id) => { setSelectedId(id); setView("detail"); };
  const startNew = () => { setForm(EMPTY_FORM); setEditingId(null); setStep(1); setView("form"); };
  const startEdit = (r) => { setForm({ ...EMPTY_FORM, ...r }); setEditingId(r.id); setStep(3); setView("form"); };

  const canNext = {
    1: form.who === "본인" ? !!form.ageGroup : !!(form.elderName.trim() && form.ageGroup),
    2: !!form.type,
    3: !!(form.need.trim() && form.resultWanted && form.period),
    4: true,
  }[step];

  const submit = () => {
    const title = form.need.trim().slice(0, 24) || form.type;
    if (editingId) {
      setRequests((rs) =>
        rs.map((r) => (r.id === editingId ? { ...r, ...form, title, status: "운영자 검토", reviewNote: undefined } : r))
      );
      openDetail(editingId);
    } else {
      const id = Date.now();
      setRequests((rs) => [{ id, title, ...form, status: "요청 접수" }, ...rs]);
      openDetail(id);
    }
  };

  return (
    <div className="rq-app">
      <style>{CSS}</style>

      {/* ── 홈 ── */}
      {view === "home" && (
        <>
          <Header />
          <main className="rq-main">
            <section className="rq-hero">
              <h2>어르신께 도움을 드립니다</h2>
              <p>대학생 봉사자가 도움을 드려요. 시간을 맞추지 않아도 돼요.</p>
              <button className="rq-btn primary big" onClick={startNew}>도움 요청하기</button>
            </section>

            <section className="rq-summary">
              <div><strong>{ongoing.length}</strong><span>진행 중인 요청</span></div>
              <div><strong>{done.length}</strong><span>완료된 요청</span></div>
            </section>

            <section>
              <h3 className="rq-h3">내 의뢰</h3>
              <div className="rq-tabs" role="tablist">
                {["전체", "진행 중", "완료"].map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
                ))}
              </div>
              {list.length === 0 ? (
                <p className="rq-empty">아직 {tab === "전체" ? "" : `${tab} `}요청이 없어요. 위 버튼으로 첫 요청을 만들어 보세요.</p>
              ) : (
                <ul className="rq-list">
                  {list.map((r) => (
                    <li key={r.id}>
                      <button className="rq-card" onClick={() => openDetail(r.id)}>
                        <div className="top"><span className="type">{r.type}</span><StatusChip status={r.status} /></div>
                        <strong>{r.title}</strong>
                        <span className="sub">{r.who === "가족" ? `${r.elderName} · ${r.ageGroup}` : `본인 · ${r.ageGroup}`}</span>
                        {r.status === "수정 요청" && <span className="hint">운영자의 수정 요청이 있어요</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </>
      )}

      {/* ── 요청 작성 (4단계) ── */}
      {view === "form" && (
        <>
          <Header title={editingId ? "요청 수정" : "도움 요청하기"} onBack={() => (step > 1 && !editingId ? setStep(step - 1) : setView(editingId ? "detail" : "home"))} />
          <main className="rq-main">
            <div className="rq-progress" aria-label={`${step}/4 단계`}>
              {[1, 2, 3, 4].map((n) => <i key={n} className={n <= step ? "on" : ""} />)}
            </div>

            {step === 1 && (
              <section className="rq-step">
                <h2>누구를 위한 도움인가요?</h2>
                <div className="rq-choice-row">
                  {["본인", "어르신 가족"].map((w) => {
                    const val = w === "본인" ? "본인" : "가족";
                    return (
                      <button key={w} className={`rq-choice ${form.who === val ? "on" : ""}`} onClick={() => set({ who: val })}>{w}</button>
                    );
                  })}
                </div>
                {form.who === "가족" && (
                  <label className="rq-field">어르신 성함 또는 호칭
                    <input value={form.elderName} onChange={(e) => set({ elderName: e.target.value })} placeholder="예) 이순자 어르신" />
                  </label>
                )}
                <div className="rq-field">
                  <span>{form.who === "가족" ? "어르신 연령대" : "내 연령대"}</span>
                  <div className="rq-pills">
                    {AGE_GROUPS.map((a) => (
                      <button key={a} className={form.ageGroup === a ? "on" : ""} onClick={() => set({ ageGroup: a })}>{a}</button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="rq-step">
                <h2>어떤 도움이 필요하세요?</h2>
                <div className="rq-types">
                  {TYPES.map((t) => (
                    <button key={t.key} className={`rq-type ${form.type === t.key ? "on" : ""}`} onClick={() => set({ type: t.key })}>
                      <span className="ic" aria-hidden>{t.icon}</span>
                      <span><strong>{t.key}</strong><small>{t.examples}</small></span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="rq-step">
                <h2>요청 내용을 알려 주세요</h2>
                <label className="rq-field">어떤 도움이 필요한가요?
                  <textarea rows={3} value={form.need} onChange={(e) => set({ need: e.target.value })} placeholder="예) 스마트폰으로 병원 예약하는 방법을 알고 싶어요." />
                </label>
                <label className="rq-field">어르신의 상황 <em>(선택)</em>
                  <textarea rows={3} value={form.situation} onChange={(e) => set({ situation: e.target.value })} placeholder="예) 앱 설치와 로그인이 어려우세요." />
                </label>
                <div className="rq-field">
                  <span>원하는 결과물</span>
                  <div className="rq-pills">
                    {RESULT_TYPES.map((r) => (
                      <button key={r} className={form.resultWanted === r ? "on" : ""} onClick={() => set({ resultWanted: r })}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="rq-field">
                  <span>희망 기간</span>
                  <div className="rq-pills">
                    {PERIODS.map((p) => (
                      <button key={p} className={form.period === p ? "on" : ""} onClick={() => set({ period: p })}>{p}</button>
                    ))}
                  </div>
                </div>
                <label className="rq-field">기타 전달사항 <em>(선택)</em>
                  <textarea rows={2} value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="예) 글씨는 크게 부탁드려요." />
                </label>
              </section>
            )}

            {step === 4 && (
              <section className="rq-step">
                <h2>이대로 요청할까요?</h2>
                <dl className="rq-dl">
                  <dt>대상</dt><dd>{form.who === "가족" ? `${form.elderName} (${form.ageGroup})` : `본인 (${form.ageGroup})`}</dd>
                  <dt>도움 유형</dt><dd>{form.type}</dd>
                  <dt>필요한 도움</dt><dd>{form.need}</dd>
                  {form.situation && (<><dt>어르신의 상황</dt><dd>{form.situation}</dd></>)}
                  <dt>원하는 결과물</dt><dd>{form.resultWanted}</dd>
                  <dt>희망 기간</dt><dd>{form.period}</dd>
                  {form.note && (<><dt>기타 전달사항</dt><dd>{form.note}</dd></>)}
                </dl>
                <p className="rq-note">제출하면 운영자가 내용을 검토한 뒤 봉사활동으로 등록해요.</p>
              </section>
            )}
          </main>

          <footer className="rq-footer">
            {step < 4 ? (
              <button className="rq-btn primary big" disabled={!canNext} onClick={() => setStep(step + 1)}>다음</button>
            ) : (
              <button className="rq-btn primary big" onClick={submit}>{editingId ? "수정해서 다시 제출" : "요청 제출하기"}</button>
            )}
          </footer>
        </>
      )}

      {/* ── 의뢰 상세 / 진행 상황 / 결과 확인 ── */}
      {view === "detail" && selected && (() => {
        const stage = toStage(selected.status);
        return (
          <>
            <Header title="내 의뢰" onBack={() => setView("home")} />
            <main className="rq-main">
              <div className="rq-detail-head">
                <span className="type">{selected.type}</span>
                <h2>{selected.title}</h2>
                <StatusChip status={selected.status} />
              </div>

              <section className="rq-panel">
                <Stepper stage={stage} />
                <p className="rq-stage-msg">{STAGE_MESSAGE[stage]}</p>
              </section>

              {selected.status === "수정 요청" && (
                <section className="rq-alert">
                  <strong>운영자가 수정을 요청했어요</strong>
                  <p>{selected.reviewNote}</p>
                  <button className="rq-btn primary" onClick={() => startEdit(selected)}>요청 수정하기</button>
                </section>
              )}

              {selected.activity && (
                <section>
                  <h3 className="rq-h3">담당 봉사활동</h3>
                  <dl className="rq-dl">
                    <dt>활동명</dt><dd>{selected.activity.title}</dd>
                    <dt>활동 기간</dt><dd>{selected.activity.period}</dd>
                    <dt>진행 방식</dt><dd>비대면 · 정해진 시간 없이 기간 안에 진행해요</dd>
                  </dl>
                </section>
              )}

              {stage === "완료" && selected.result && (
                <section>
                  <h3 className="rq-h3">완료 결과</h3>
                  <div className="rq-panel">
                    <h4>활동 내용</h4>
                    <p>{selected.result.summary}</p>
                    <p className="sub">{selected.result.log}</p>
                    <h4>학생 결과물</h4>
                    <ul className="rq-files">
                      {selected.result.files.map((f) => (
                        <li key={f.name}><span className="kind">{f.kind}</span>{f.name}<button className="rq-btn small">열기</button></li>
                      ))}
                    </ul>
                    <p className="rq-note">운영자 검토와 인증이 끝난 결과물만 보여요.</p>
                  </div>
                </section>
              )}

              <section>
                <h3 className="rq-h3">요청 내용</h3>
                <dl className="rq-dl">
                  <dt>대상</dt><dd>{selected.who === "가족" ? `${selected.elderName} (${selected.ageGroup})` : `본인 (${selected.ageGroup})`}</dd>
                  <dt>필요한 도움</dt><dd>{selected.need}</dd>
                  {selected.situation && (<><dt>어르신의 상황</dt><dd>{selected.situation}</dd></>)}
                  <dt>원하는 결과물</dt><dd>{selected.resultWanted}</dd>
                  <dt>희망 기간</dt><dd>{selected.period}</dd>
                  {selected.note && (<><dt>기타 전달사항</dt><dd>{selected.note}</dd></>)}
                </dl>
              </section>
            </main>
          </>
        );
      })()}
    </div>
  );
}

/* ───────── 스타일 (팀원 D의 공통 디자인 토큰이 정해지면 변수만 교체) ───────── */
const CSS = `
.rq-app{--ink:#172B3A;--sub:#5B6B77;--line:#DDE5EA;--bg:#F5F8FA;--card:#fff;--brand:#0F7B8A;--brand-soft:#E3F2F4;--warn:#B4532A;--warn-soft:#FBEBE3;--done:#2E7D55;--done-soft:#E4F3EA;
max-width:480px;margin:0 auto;min-height:100vh;background:var(--bg);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;font-size:17px;line-height:1.55;display:flex;flex-direction:column}
.rq-app *{box-sizing:border-box}
.rq-app button{font:inherit;color:inherit;cursor:pointer}
.rq-app :focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.rq-header{display:flex;align-items:center;gap:8px;padding:14px 16px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
.rq-header h1{font-size:19px;margin:0}
.rq-logo{font-weight:800;font-size:22px;color:var(--brand);letter-spacing:-.02em}
.rq-back{border:0;background:none;font-size:30px;line-height:1;padding:0 8px 4px 0}
.rq-main{padding:20px 16px 32px;display:flex;flex-direction:column;gap:24px;flex:1}
.rq-hero{background:var(--brand);color:#fff;border-radius:20px;padding:24px 20px}
.rq-hero h2{margin:0 0 8px;font-size:24px;line-height:1.35}
.rq-hero p{margin:0 0 18px;opacity:.9;font-size:16px}
.rq-btn{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:10px 16px;font-weight:600}
.rq-btn.primary{background:var(--ink);border-color:var(--ink);color:#fff}
.rq-hero .rq-btn.primary{background:#fff;color:var(--brand);border-color:#fff}
.rq-btn.big{width:100%;min-height:56px;font-size:18px}
.rq-btn.small{padding:4px 12px;font-size:14px;margin-left:auto}
.rq-btn:disabled{opacity:.4;cursor:not-allowed}
.rq-summary{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.rq-summary div{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column}
.rq-summary strong{font-size:28px;line-height:1.2}
.rq-summary span{color:var(--sub);font-size:15px}
.rq-h3{font-size:18px;margin:0 0 10px}
.rq-tabs{display:flex;gap:8px;margin-bottom:12px}
.rq-tabs button{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 16px}
.rq-tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.rq-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.rq-card{width:100%;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:4px}
.rq-card .top{display:flex;justify-content:space-between;align-items:center}
.rq-card strong{font-size:18px}
.rq-card .sub,.type{color:var(--sub);font-size:15px}
.rq-card .hint{color:var(--warn);font-size:15px;font-weight:600}
.rq-chip{font-size:14px;font-weight:700;padding:3px 10px;border-radius:999px}
.rq-chip.ing{background:var(--brand-soft);color:var(--brand)}
.rq-chip.warn{background:var(--warn-soft);color:var(--warn)}
.rq-chip.done{background:var(--done-soft);color:var(--done)}
.rq-empty{color:var(--sub);background:var(--card);border:1px dashed var(--line);border-radius:14px;padding:20px;margin:0}
.rq-progress{display:flex;gap:6px}
.rq-progress i{flex:1;height:5px;border-radius:3px;background:var(--line)}
.rq-progress i.on{background:var(--brand)}
.rq-step{display:flex;flex-direction:column;gap:18px}
.rq-step h2,.rq-detail-head h2{margin:0;font-size:22px;line-height:1.35}
.rq-choice-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rq-choice{min-height:64px;border:2px solid var(--line);background:var(--card);border-radius:14px;font-weight:700;font-size:18px}
.rq-choice.on,.rq-type.on{border-color:var(--brand);background:var(--brand-soft)}
.rq-field{display:flex;flex-direction:column;gap:8px;font-weight:600}
.rq-field em{font-style:normal;color:var(--sub);font-weight:400;font-size:15px}
.rq-field input,.rq-field textarea{font:inherit;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--card);resize:vertical;font-weight:400}
.rq-pills{display:flex;flex-wrap:wrap;gap:8px}
.rq-pills button{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:8px 16px;font-weight:500}
.rq-pills button.on{border-color:var(--brand);background:var(--brand-soft);color:var(--brand);font-weight:700}
.rq-types{display:flex;flex-direction:column;gap:10px}
.rq-type{display:flex;gap:14px;align-items:center;text-align:left;border:2px solid var(--line);background:var(--card);border-radius:14px;padding:16px}
.rq-type .ic{font-size:30px}
.rq-type strong{display:block;font-size:18px}
.rq-type small{color:var(--sub);font-size:15px}
.rq-dl{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:6px 16px}
.rq-dl dt{color:var(--sub);font-size:14px;margin-top:10px}
.rq-dl dd{margin:2px 0 10px}
.rq-note{color:var(--sub);font-size:15px;margin:0}
.rq-footer{position:sticky;bottom:0;padding:12px 16px 20px;background:linear-gradient(transparent,var(--bg) 30%)}
.rq-detail-head{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.rq-panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}
.rq-panel h4{margin:14px 0 4px;font-size:16px}
.rq-panel h4:first-child{margin-top:0}
.rq-panel p{margin:0 0 6px}
.rq-panel .sub{color:var(--sub);font-size:15px}
.rq-stepper{list-style:none;margin:0 0 14px;padding:0;display:flex;justify-content:space-between;position:relative}
.rq-stepper li{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;font-size:13px;color:var(--sub);position:relative}
.rq-stepper li:not(:first-child)::before{content:"";position:absolute;top:11px;right:50%;width:100%;height:3px;background:var(--line)}
.rq-stepper li.past::before,.rq-stepper li.now::before{background:var(--brand)}
.rq-stepper .dot{width:24px;height:24px;border-radius:50%;background:var(--card);border:3px solid var(--line);z-index:1;display:grid;place-items:center;font-size:13px;color:#fff}
.rq-stepper .past .dot{background:var(--brand);border-color:var(--brand)}
.rq-stepper .now .dot{border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft)}
.rq-stepper .now .label{color:var(--ink);font-weight:700}
.rq-stage-msg{margin:0;font-weight:600}
.rq-alert{background:var(--warn-soft);border:1px solid #F0CDBE;border-radius:14px;padding:16px}
.rq-alert p{margin:4px 0 12px}
.rq-files{list-style:none;margin:6px 0 12px;padding:0;display:flex;flex-direction:column;gap:8px}
.rq-files li{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:15px}
.rq-files .kind{background:var(--brand-soft);color:var(--brand);font-size:12px;font-weight:700;border-radius:6px;padding:2px 8px}
@media (prefers-reduced-motion:no-preference){.rq-card,.rq-btn{transition:transform .12s}.rq-card:active,.rq-btn:active{transform:scale(.99)}}
`;
