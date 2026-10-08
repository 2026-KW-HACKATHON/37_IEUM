import { useEffect, useState } from "react";
import { volunteerTypes } from "../../data/noncontact";

/* ─────────────────────────────────────────────
   이음(IEUM) · 대학생(Student) 화면 — 팀원 A
   App.jsx 가 넘겨주는 props 만 사용합니다. 데이터는 직접 만들지 않습니다.
   - loadHome()            → { user, summary, activities, requests } (App.jsx studentHomeData)
   - onApply(activityId)   → 참여 신청 (실패하면 Error 를 던짐)
   - onSubmitResult(assignmentId, { result, activityLog, evidence, workedMinutes, resultFilePath?, evidenceFilePath? })
   - onUploadFile(file, category) → 저장된 파일 경로 / onOpenFile(path) → 파일 열기
   화면 전환은 내부 state(view)로 처리합니다: list | my | detail | submit
   ───────────────────────────────────────────── */

// 배정 후 상태 (noncontactStore 의 공통 상태명). 화면에서 "봉사자 배정"은 "배정 완료"로 표시합니다.
const LABEL = { "봉사자 배정": "배정 완료" };
const TONE = { "모집 중": "ing", "신청 완료": "ing", "봉사자 배정": "ing", "진행 중": "ing", "결과물 제출": "wait", "검토 중": "wait", "재제출": "wait", "반려됨": "warn", "보완 요청": "warn", "승인": "done", "인증 완료": "done" };
const CAN_SUBMIT = ["진행 중", "보완 요청"];
const DOING = ["진행 중", "결과물 제출", "검토 중", "보완 요청", "재제출", "승인"];
const GROUPS = [
  ["신청한 활동", (a) => a.applied && !a.assignmentId, "신청한 활동이 없어요."],
  ["배정된 활동", (a) => a.assignmentId && a.status === "봉사자 배정", "배정된 활동이 없어요."],
  ["진행 중인 활동", (a) => a.assignmentId && DOING.includes(a.status), "진행 중인 활동이 없어요."],
  ["완료된 활동", (a) => a.assignmentId && a.status === "인증 완료", "완료된 활동이 없어요."],
];
const GUIDE = [["method", "활동 방법"], ["precautions", "주의사항"], ["resultFormat", "결과물 형식"], ["evidenceGuide", "증빙 방법"], ["logGuide", "활동일지 작성 방법"]];

const myStatus = (a) => {
  if (a.assignmentId) return a.status;
  if (!a.applied) return "";
  return a.applicationStatus === "반려됨" ? "반려됨" : "신청 완료";
};
const statusMessage = (a) => ({
  "신청 완료": "신청이 완료되었어요. 운영자 배정 전입니다.",
  "반려됨": "신청이 반려되었어요.",
  "봉사자 배정": `배정이 완료되었어요.${a.startDate ? ` ${a.startDate}부터` : " 활동 시작일부터"} 결과물을 제출할 수 있어요.`,
  "진행 중": `활동을 진행하고 결과물을 제출해 주세요.${a.deadline ? ` 제출 기한은 ${a.deadline}이에요.` : ""}`,
  "결과물 제출": "제출이 완료되었어요. 운영자 검토를 기다려 주세요.",
  "검토 중": "운영자가 제출한 결과물을 검토하고 있어요.",
  "보완 요청": "보완이 필요해요. 운영자 안내를 확인하고 다시 제출해 주세요.",
  "재제출": "재제출이 완료되었어요. 운영자가 다시 검토합니다.",
  "승인": "결과물이 승인되었어요. 내부 인증 완료를 기다려 주세요.",
  "인증 완료": "내부 인증이 완료되었어요. 공식 1365 등록과는 별개예요.",
}[myStatus(a)] || "");
const when = (v) => (v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "");
const hm = (m) => `${Math.floor(m / 60)}시간 ${m % 60}분`;

const Chip = ({ status }) => <span className={`st-chip ${TONE[status] || "ing"}`}>{LABEL[status] || status}</span>;

function ActivityCard({ a, onOpen }) {
  const status = myStatus(a) || "모집 중";
  return (
    <li>
      <button className="st-card" onClick={() => onOpen(a.id)}>
        <div className="top"><span className="type">{a.type}</span><Chip status={status} /></div>
        <strong>{a.title}</strong>
        <span className="sub">{a.period} · 모집 {a.capacity}명</span>
      </button>
    </li>
  );
}

function Detail({ a, busy, onApply, onSubmit, onOpenFile, onError }) {
  const status = myStatus(a);
  const subs = a.submissions ?? [];
  const latest = subs.at(-1);
  const recruiting = a.recruitmentOpen && !["승인", "인증 완료", "취소"].includes(a.status);
  const guide = GUIDE.filter(([key]) => a.guidance?.[key]);
  const rows = [["활동 대상", a.target], ["활동 기간", a.period], ["제출 기한", a.deadline], ["모집 인원", `${a.capacity}명`],
    ["필요한 역량", a.requirements], ["필요한 결과물", a.resultType], ["제출해야 하는 증빙자료", a.evidence], ["활동 인정 기준", a.recognitionCriteria]];
  const openFile = async (path) => { try { await onOpenFile(path); } catch (e) { onError(e); } };
  return (
    <>
      <div className="st-head"><span className="type">{a.type}</span><h2>{a.title}</h2>{status && <Chip status={status} />}</div>
      <p>{a.description}</p>
      <dl className="st-dl">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>

      {!status && (
        <button className="st-btn primary big" disabled={busy || !recruiting} onClick={onApply}>
          {recruiting ? "참여 신청" : "모집 중이 아니에요"}
        </button>
      )}
      {status && (
        <section className="st-panel">
          <p className="st-msg">{statusMessage(a)}</p>
          {CAN_SUBMIT.includes(status) && (
            <button className="st-btn primary big" onClick={onSubmit}>{status === "보완 요청" ? "재제출하기" : "결과물 제출하기"}</button>
          )}
        </section>
      )}

      {latest?.review && (
        <section className={`st-panel ${latest.review.decision === "보완 요청" ? "warn" : "done"}`}>
          <strong>운영자 검토: {latest.review.decision}</strong>
          <p>{latest.review.reason}</p>
          {latest.review.decision === "승인" && <p>인정 시간 {hm(latest.review.recognizedMinutes)}</p>}
        </section>
      )}

      {a.assignmentId && guide.length > 0 && (
        <section><h3>사전교육 · 활동 안내</h3>
          <dl className="st-dl">{guide.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{a.guidance[key]}</dd></div>)}</dl>
        </section>
      )}

      {subs.length > 0 && (
        <section><h3>내 제출 기록</h3>
          <ul className="st-list">{subs.map((s, i) => (
            <li key={s.id} className="st-panel">
              <strong>{i + 1}차 제출 · {when(s.submittedAt)}</strong>
              <p className="sub">활동 시간 {s.workedMinutes}분</p>
              <p>결과물: {s.result}</p>
              {s.resultFilePath && onOpenFile && <button className="st-btn" onClick={() => openFile(s.resultFilePath)}>결과물 파일 열기</button>}
            </li>
          ))}</ul>
        </section>
      )}
    </>
  );
}

function Submit({ a, busy, canUpload, onSubmit }) {
  const prev = a.submissions?.at(-1);
  const [result, setResult] = useState(prev?.result ?? "");
  const [log, setLog] = useState(prev?.activityLog ?? "");
  const [evidence, setEvidence] = useState(prev?.evidence ?? "");
  const [minutes, setMinutes] = useState(prev ? String(prev.workedMinutes) : "");
  const [resultFile, setResultFile] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [error, setError] = useState("");
  const accept = "application/pdf,image/jpeg,image/png,image/webp,video/mp4";

  function go(event) {
    event.preventDefault();
    const worked = Number(minutes);
    const resultText = result.trim() || resultFile?.name || "";
    const evidenceText = evidence.trim() || evidenceFile?.name || "";
    if (!resultText) return setError("결과물 내용이나 파일을 입력해 주세요.");
    if (!log.trim()) return setError("활동일지를 작성해 주세요.");
    if (!evidenceText) return setError("증빙자료를 입력해 주세요.");
    if (!Number.isSafeInteger(worked) || worked < 1) return setError("활동 시간을 1분 이상의 정수로 입력해 주세요.");
    setError("");
    onSubmit({ result: resultText, activityLog: log.trim(), evidence: evidenceText, workedMinutes: worked, resultFile, evidenceFile });
  }

  return (
    <form className="st-form" onSubmit={go}>
      <h2>{a.title}</h2>
      <p className="sub">필요한 결과물: {a.resultType} · 증빙자료: {a.evidence}</p>
      <label>결과물 (파일 이름이나 내용 설명)<input value={result} onChange={(e) => setResult(e.target.value)} /></label>
      {canUpload && <label>결과물 파일 <em>(선택 · 10MB 이하)</em><input type="file" accept={accept} onChange={(e) => setResultFile(e.target.files?.[0] ?? null)} /></label>}
      <label>활동일지<textarea rows={5} value={log} onChange={(e) => setLog(e.target.value)} /></label>
      <label>증빙자료 (설명)<input value={evidence} onChange={(e) => setEvidence(e.target.value)} /></label>
      {canUpload && <label>증빙 파일 <em>(선택 · 10MB 이하)</em><input type="file" accept={accept} onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)} /></label>}
      <label>활동 시간 (분)<input type="number" min="1" step="1" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="예) 90" /></label>
      {!canUpload && <p className="sub">이 환경에서는 파일 업로드 없이 설명을 입력해 제출해요.</p>}
      {error && <p className="st-alert" role="alert">{error}</p>}
      <button className="st-btn primary big" type="submit" disabled={busy}>{a.status === "보완 요청" ? "재제출" : "제출하기"}</button>
    </form>
  );
}

export default function StudentHome({ loadHome, onApply, onSubmitResult, onUploadFile, onOpenFile, allowFileUpload, syncError, onLogout }) {
  const [view, setView] = useState("list"); // list | my | detail | submit
  const [id, setId] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [home, setHome] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // App.jsx 의 데이터가 바뀌면(loadHome 이 새로 만들어지면) 다시 불러옵니다.
  useEffect(() => {
    let alive = true;
    if (typeof loadHome !== "function") { setLoadError("활동 데이터를 불러오는 함수(loadHome)가 연결되지 않았어요."); return undefined; }
    Promise.resolve().then(loadHome)
      .then((data) => { if (alive) { setHome(data); setLoadError(""); } })
      .catch((e) => { if (alive) setLoadError(e instanceof Error ? e.message : "활동을 불러오지 못했어요."); });
    return () => { alive = false; };
  }, [loadHome, reloadKey]);

  const activities = home?.activities ?? [];
  const recruiting = (home?.requests ?? []).filter((a) => filter === "전체" || a.type === filter);
  const selected = activities.find((a) => a.id === id);
  const mine = activities.filter((a) => myStatus(a)).length;
  const message = (e) => (e instanceof Error ? e.message : "처리하지 못했어요.");

  async function run(task, onDone) {
    setBusy(true); setNotice("");
    try { await task(); onDone?.(); } catch (e) { setNotice(message(e)); } finally { setBusy(false); }
  }
  const open = (next) => { setNotice(""); setId(next); setView("detail"); };
  const apply = () => run(() => onApply(selected.id));
  const submit = (form) => run(async () => {
    const fields = { result: form.result, activityLog: form.activityLog, evidence: form.evidence, workedMinutes: form.workedMinutes };
    if (form.resultFile) fields.resultFilePath = await onUploadFile(form.resultFile, "result");
    if (form.evidenceFile) fields.evidenceFilePath = await onUploadFile(form.evidenceFile, "evidence");
    await onSubmitResult(selected.assignmentId, fields);
  }, () => setView("detail"));

  let title = view === "my" ? "내 활동" : "비대면 봉사활동";
  let body;
  if (loadError && !home) {
    body = <><p className="st-alert" role="alert">{loadError}</p><button className="st-btn" onClick={() => setReloadKey((k) => k + 1)}>다시 시도</button></>;
  } else if (!home) {
    body = <p className="sub">불러오는 중…</p>;
  } else if (view === "my") {
    const s = home.summary;
    body = (
      <>
        {s && <section className="st-sum"><div><strong>{s.verifiedCount}건</strong><span>인증 완료</span></div><div><strong>{hm(s.totalMinutes)}</strong><span>인정 시간</span></div></section>}
        {GROUPS.map(([name, test, empty]) => {
          const items = activities.filter(test);
          return (
            <section key={name}><h3>{name} ({items.length})</h3>
              {items.length ? <ul className="st-list">{items.map((a) => <ActivityCard key={a.id} a={a} onOpen={open} />)}</ul> : <p className="st-empty">{empty}</p>}
            </section>
          );
        })}
      </>
    );
  } else if (selected && view === "detail") {
    title = "활동 상세";
    body = <Detail a={selected} busy={busy} onApply={apply} onSubmit={() => { setNotice(""); setView("submit"); }} onOpenFile={onOpenFile} onError={(e) => setNotice(message(e))} />;
  } else if (selected && view === "submit" && CAN_SUBMIT.includes(selected.status)) {
    title = "결과 제출";
    body = <Submit a={selected} busy={busy} canUpload={Boolean(allowFileUpload && onUploadFile)} onSubmit={submit} />;
  } else if (view === "detail" || view === "submit") {
    body = <p className="st-empty">활동을 찾을 수 없어요.</p>;
  } else {
    body = (
      <>
        <section className="st-hero"><h2>{home.user?.name ? `${home.user.name}님, 안녕하세요` : "안녕하세요"}</h2><p>집에서 할 수 있는 비대면 봉사활동을 찾아보세요.</p></section>
        <div className="st-pills" role="group" aria-label="활동 유형">
          {["전체", ...volunteerTypes].map((t) => <button key={t} className={filter === t ? "on" : ""} aria-pressed={filter === t} onClick={() => setFilter(t)}>{t}</button>)}
        </div>
        {recruiting.length ? <ul className="st-list">{recruiting.map((a) => <ActivityCard key={a.id} a={a} onOpen={open} />)}</ul> : <p className="st-empty">지금 모집 중인 봉사활동이 없어요.</p>}
      </>
    );
  }

  const back = view === "detail" ? () => setView("list") : view === "submit" ? () => setView("detail") : null;
  return (
    <div className="st-app">
      <style>{CSS}</style>
      <header className="st-header">
        {back ? <button className="st-back" onClick={back} aria-label="뒤로 가기">‹</button> : <span className="st-logo">이음</span>}
        {back && <h1>{title}</h1>}
        {onLogout && <button className="st-logout" onClick={onLogout}>로그아웃</button>}
      </header>
      <main className="st-main">
        {!back && <h1 className="st-title">{title}</h1>}
        {syncError && <p className="st-alert" role="alert">{syncError}</p>}
        {notice && <p className="st-alert" role="alert">{notice}</p>}
        {body}
      </main>
      <nav className="st-tabs" aria-label="대학생 메뉴">
        <button className={view !== "my" ? "on" : ""} onClick={() => { setNotice(""); setView("list"); }}>활동 찾기</button>
        <button className={view === "my" ? "on" : ""} onClick={() => { setNotice(""); setView("my"); }}>내 활동 ({mine})</button>
      </nav>
    </div>
  );
}

const CSS = `
.st-app{--ink:#25404A;--sub:#66777C;--line:#E3E8E4;--card:#fff;--brand:#168A88;--brand-soft:#E6F6F1;--warn:#B4532A;--warn-soft:#FBEBE3;--done:#2E7D55;--done-soft:#E4F3EA;--wait:#8A6A00;--wait-soft:#FFF3D6;
width:100%;max-width:440px;min-height:100vh;min-height:100svh;margin:0 auto;display:flex;flex-direction:column;background:linear-gradient(180deg,#FFF9F4 0%,#F4FBF8 100%);color:var(--ink);font-family:var(--font-body,system-ui,"Noto Sans KR",sans-serif);font-size:17px;line-height:1.6;text-align:left}
.st-app *{box-sizing:border-box}
.st-app button{font:inherit;color:inherit;cursor:pointer}
.st-app :focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.st-header{display:flex;align-items:center;gap:8px;padding:14px 16px;background:#FFFFFFE8;border-bottom:1px solid var(--line);border-radius:0 0 22px 22px;position:sticky;top:0;z-index:2}
.st-header h1{font-size:19px;margin:0}
.st-logo{font-weight:800;font-size:22px;color:var(--brand);letter-spacing:-.02em}
.st-back{border:0;background:none;font-size:30px;line-height:1;padding:0 8px 4px 0}
.st-logout{margin-left:auto;border:0;background:transparent;color:var(--sub);font-size:14px}
.st-main{padding:20px 16px 24px;display:flex;flex-direction:column;gap:18px;flex:1}
.st-title{font-size:22px;margin:0}
.st-main h2{margin:0;font-size:20px;line-height:1.35}
.st-main h3{margin:0 0 8px;font-size:17px}
.st-main p{margin:0}
.sub,.type{color:var(--sub);font-size:15px}
.st-hero{background:linear-gradient(145deg,#168A88,#52B79E);color:#fff;border-radius:28px;padding:22px 20px}
.st-hero p{opacity:.9;font-size:16px}
.st-pills{display:flex;flex-wrap:wrap;gap:8px}
.st-pills button{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 14px;font-size:15px}
.st-pills button.on{border-color:var(--brand);background:var(--brand-soft);color:var(--brand);font-weight:700}
.st-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.st-card{width:100%;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:4px;box-shadow:0 7px 20px #25404A08}
.st-card .top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.st-card strong{font-size:18px}
.st-chip{font-size:14px;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap}
.st-chip.ing{background:var(--brand-soft);color:var(--brand)}
.st-chip.wait{background:var(--wait-soft);color:var(--wait)}
.st-chip.warn{background:var(--warn-soft);color:var(--warn)}
.st-chip.done{background:var(--done-soft);color:var(--done)}
.st-head{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.st-dl{margin:0;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:6px 18px}
.st-dl dt{color:var(--sub);font-size:14px;margin-top:10px}
.st-dl dd{margin:2px 0 10px;overflow-wrap:anywhere}
.st-panel{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:8px}
.st-panel.warn{background:var(--warn-soft);border-color:#F0CDBE}
.st-panel.done{background:var(--done-soft);border-color:#B8DBCB}
.st-msg{font-weight:600}
.st-sum{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.st-sum div{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:14px 16px;display:flex;flex-direction:column}
.st-sum strong{font-size:22px;line-height:1.3}
.st-sum span{color:var(--sub);font-size:15px}
.st-empty{color:var(--sub);background:var(--card);border:1px dashed var(--line);border-radius:14px;padding:16px}
.st-alert{background:var(--warn-soft);border:1px solid #F0CDBE;color:#7C3217;border-radius:14px;padding:12px 14px}
.st-btn{border:1px solid var(--line);background:var(--card);border-radius:18px;padding:10px 16px;font-weight:600;min-height:44px}
.st-btn.primary{background:var(--ink);border-color:var(--ink);color:#fff}
.st-btn.big{width:100%;min-height:56px;font-size:18px}
.st-btn:disabled{opacity:.4;cursor:not-allowed}
.st-form{display:flex;flex-direction:column;gap:16px}
.st-form label{display:flex;flex-direction:column;gap:8px;font-weight:600}
.st-form em{font-style:normal;color:var(--sub);font-weight:400;font-size:15px}
.st-form input,.st-form textarea{width:100%;font:inherit;font-weight:400;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--card);resize:vertical}
.st-tabs{position:sticky;bottom:0;display:flex;background:#FFFFFFF2;border-top:1px solid var(--line)}
.st-tabs button{flex:1;border:0;background:none;min-height:56px;color:var(--sub);font-size:16px}
.st-tabs button.on{color:var(--brand);font-weight:700}
@media(min-width:600px){.st-app{box-shadow:0 0 48px #25404A12}}
`;