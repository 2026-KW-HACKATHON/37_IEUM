import { useEffect, useState, useCallback } from "react";

/**
 * 이음 · 홈 화면(대학생) — 매니패스트 와이어프레임 n12
 *
 * 이 컴포넌트는 "화면 그리기"만 담당하고, 데이터 조회·신청·이동은 props 로 받습니다.
 * (실제 API 주소나 라우터는 이 파일이 몰라도 되도록 분리)
 *
 * props
 *  - loadHome():            Promise<HomeData>          홈 화면 데이터 조회
 *  - onApply(requestId):    Promise<void>              의뢰 신청
 *  - onNavigate(route, params?)                        화면 이동
 *
 * @typedef {Object} HomeData
 * @property {{ name: string }} user
 * @property {{ monthlyCount: number, totalMinutes: number, verifiedCount: number }} summary
 * @property {Array<{ id: string, title: string, subtitle?: string }>} myActivities  진행 중 활동
 * @property {Array<{ id: string, title: string, subtitle?: string, tags?: string[], applied?: boolean }>} requests  모집 중인 도움
 */

// 이동 대상 (와이어프레임 노드 ID 대응). 실제 경로 매핑은 onNavigate 쪽에서 처리.
const ROUTE = {
  REQUEST_MAP: "requestMap",     // n14 의뢰 탐색 지도
  EVENT_LIST: "eventList",       // n51 지역활동 목록
  REPORT: "report",              // n49 생활불편 제보
  HOURS: "hours",                // n45 봉사시간 내역
  ACTIVITY: "activity",          // 진행 중 활동 상세(params: { id })
  REQUEST: "request",            // 의뢰 상세(params: { id })
  EVENT: "event",                // 지역활동 상세(params: { id })
};

const formatMinutes = (m) => `${Math.floor(m / 60)}시간 ${m % 60}분`;

function useHomeData(loadHome) {
  const [state, setState] = useState({ status: "loading", data: null });

  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: "loading" }));
    loadHome()
      .then((data) => setState({ status: "ready", data }))
      .catch(() => setState({ status: "error", data: null }));
  }, [loadHome]);

  useEffect(() => {
    let active = true;
    loadHome()
      .then((data) => { if (active) setState({ status: "ready", data }); })
      .catch(() => { if (active) setState({ status: "error", data: null }); });
    return () => { active = false; };
  }, [loadHome]);
  return { ...state, reload, setData: (data) => setState({ status: "ready", data }) };
}

function Section({ title, items, empty, render }) {
  return (
    <section>
      <h2>{title}</h2>
      {items?.length ? items.map(render) : <p className="ih-empty">{empty}</p>}
    </section>
  );
}

// props 를 넘기지 않아도 실행되도록 하는 기본값 (값은 비어 있는 상태)
// 반드시 컴포넌트 밖에 두어야 함수 참조가 유지되어 재조회 루프가 생기지 않습니다.
const defaultLoadHome = () =>
  Promise.resolve({
    user: { name: "" },
    summary: { monthlyCount: 0, totalMinutes: 0, verifiedCount: 0 },
    myActivities: [],
    completedActivities: [],
    requests: [],
    events: [],
  });
const defaultOnApply = () => Promise.resolve();
const defaultOnNavigate = (route, params) => console.log("navigate:", route, params);

function StudentHome({
  loadHome = defaultLoadHome,
  onApply = defaultOnApply,
  onSubmitResult,
  onUploadFile,
  onOpenFile,
  onSubmitVerification,
  verificationUploadError,
  allowFileUpload,
  onNavigate = defaultOnNavigate,
  profile,
  onLogout,
}) {
  const { status, data, reload, setData } = useHomeData(loadHome);
  const [pending, setPending] = useState(null); // 신청 처리 중인 의뢰 id
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const go = (route, params) => onNavigate?.(route, params);

  const apply = async (id) => {
    setPending(id);
    try {
      await onApply(id);
      // 서버 재조회 없이 해당 의뢰만 신청됨으로 반영
      setData({
        ...data,
        requests: data.requests.map((r) => (r.id === id ? { ...r, applied: true } : r)),
        activities: data.activities.map((activity) =>
          activity.id === id ? { ...activity, applied: true, applicationStatus: "운영자 배정 대기" } : activity
        ),
        myApplications: [
          ...(data.myApplications || []),
          data.activities.find((activity) => activity.id === id)
            ? { ...data.activities.find((activity) => activity.id === id), applicationStatus: "운영자 배정 대기" }
            : null,
        ].filter(Boolean),
      });
      setActionError("");
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : "신청하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(null);
    }
  };

  if (status === "loading") return (
    <div className="rq-app ih">
      <style>{css}</style>
      <header className="rq-header"><span className="rq-logo">이음</span><span className="ih-role">대학생</span>{onLogout && <button className="ih-logout" onClick={onLogout}>로그아웃</button>}</header>
      <main className="rq-main"><p className="rq-empty ih-state">불러오는 중…</p></main>
    </div>
  );
  if (status === "error") {
    return (
      <div className="rq-app ih">
        <style>{css}</style>
        <header className="rq-header"><span className="rq-logo">이음</span><span className="ih-role">대학생</span>{onLogout && <button className="ih-logout" onClick={onLogout}>로그아웃</button>}</header>
        <main className="rq-main">
          <section className="rq-hero"><h1>홈 화면을 불러오지 못했어요.</h1><p>잠시 후 다시 시도해 주세요.</p></section>
          <button className="rq-btn primary big" onClick={reload}>다시 시도</button>
        </main>
      </div>
    );
  }

  const { user, summary, myActivities, completedActivities = [], requests } = data;
  const userName = profile?.name || user.name;
  const selectedActivity = data.activities?.find((activity) => activity.id === selectedActivityId);

  if (selectedActivityId) {
    return (
      <div className="rq-app ih">
        <style>{css}</style>
        {selectedActivity ? (
          <StudentActivityDetail
            activity={selectedActivity}
            profile={profile}
            actionError={actionError}
            onBack={() => setSelectedActivityId(null)}
            onSubmitResult={onSubmitResult}
            onApply={onApply}
            onUploadFile={onUploadFile}
            onOpenFile={onOpenFile}
            onLogout={onLogout}
          />
        ) : (
          <main className="rq-main"><p role="alert">활동 정보를 찾을 수 없습니다.</p>
            <button onClick={() => setSelectedActivityId(null)}>목록으로</button>
          </main>
        )}
      </div>
    );
  }

  return (
    <div className="rq-app ih">
      <style>{css}</style>
      <header className="rq-header"><span className="rq-logo">이음</span><span className="ih-role">대학생</span>{onLogout && <button className="ih-logout" onClick={onLogout}>로그아웃</button>}</header>
      <main className="rq-main">
        <section className="rq-hero">
          <h1>{userName ? `안녕하세요, ${userName}님` : "안녕하세요"}</h1>
          <p>오늘도 이음과 함께 따뜻한 도움을 전해요.</p>
        </section>

        <section className="ih-summary" aria-label="활동 요약">
          <div><small>이번 달 활동</small><b>{summary.monthlyCount}회 완료</b></div>
          <div><small>누적 봉사시간</small><b>{formatMinutes(summary.totalMinutes)}</b></div>
          <div><small>인증 상태</small><b>검증 완료 {summary.verifiedCount}건</b></div>
        </section>
        {profile && profile.verificationStatus !== "approved" && (
          <>
            <p className="rq-alert" role="status">
              학생 증빙 검토 상태: {profile?.verificationStatus === "rejected" ? "반려" : "검증 대기"}.
              승인 후 모집 중인 봉사활동에 신청할 수 있어요.
            </p>
            {profile.verificationStatus === "rejected"
              ? <p className="ih-state" role="status">증빙 검토가 반려되었어요. 재검토가 필요하면 운영자에게 문의해 주세요.</p>
              : profile.verificationDocumentPath
                ? <p className="ih-state" role="status">재학 증빙을 제출했어요. 운영자 검토를 기다려 주세요.</p>
                : allowFileUpload ? <form className="ih-submission" onSubmit={async (event) => {
                event.preventDefault();
                const file = new FormData(event.currentTarget).get("verificationFile");
                setVerificationError("");
                setVerificationMessage("");
                try {
                  await onSubmitVerification(file);
                  setVerificationMessage("재학 증빙을 비공개 저장소에 제출했어요.");
                } catch (failure) {
                  setVerificationError(failure instanceof Error ? failure.message : "재학 증빙을 제출하지 못했어요.");
                }
              }}>
                <label>재학 증빙 파일
                  <input name="verificationFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
                </label>
                {verificationError && <p role="alert">{verificationError}</p>}
                {verificationMessage && <p role="status">{verificationMessage}</p>}
                {verificationUploadError && <p role="alert">{verificationUploadError}</p>}
                <button className="ih-primary" type="submit">증빙 제출</button>
                </form>
                  : <p className="ih-state" role="status">실제 증빙 파일 보관은 Supabase 파일 저장소를 설정한 뒤 사용할 수 있어요.</p>}
          </>
        )}
        {actionError && <p className="rq-alert" role="alert">{actionError}</p>}
        <button className="ih-link" onClick={() => go(ROUTE.HOURS)}>봉사시간 내역 보기</button>

        <Section
          title="내 진행 중 활동"
          items={myActivities}
          empty="진행 중인 활동이 없어요."
          render={(a) => (
            <div key={a.id} className="ih-item">
              <div><b>{a.title}</b><small>{a.period} · {a.assignmentStatus}</small></div>
              <button onClick={() => setSelectedActivityId(a.id)}>활동 상세</button>
            </div>
          )}
        />

        <Section
          title="완료한 활동"
          items={completedActivities}
          empty="인증 완료된 활동이 여기에 표시돼요."
          render={(a) => (
            <div key={a.id} className="ih-item">
              <div><b>{a.title}</b><small>{a.period} · 인증 완료</small></div>
              <button onClick={() => setSelectedActivityId(a.id)}>활동 상세</button>
            </div>
          )}
        />

        <Section
          title="신청한 활동"
          items={data.myApplications || []}
          empty="운영자 배정을 기다리는 신청이 없어요."
          render={(a) => (
            <div key={a.id} className="ih-item">
              <div><b>{a.title}</b><small>{a.period} · 운영자 배정 대기</small></div>
              <button onClick={() => setSelectedActivityId(a.id)}>신청 상세</button>
            </div>
          )}
        />

        <Section
          title="모집 중인 도움"
          items={requests}
          empty="운영자가 모집을 시작한 도움이 생기면 여기에서 신청할 수 있어요."
          render={(r) => (
            <div key={r.id} className="ih-item">
              <div>
                <b>{r.title}</b>
                {r.tags?.length > 0 && <small className="ih-category">{r.tags.join(" · ")}</small>}
                {r.subtitle && <small>{r.subtitle}</small>}
              </div>
              <div className="ih-actions">
                <button onClick={() => setSelectedActivityId(r.id)}>상세 보기</button>
                <button className="ih-primary" disabled={Boolean(profile && profile.verificationStatus !== "approved") || r.applied || pending === r.id} onClick={() => apply(r.id)}>
                  {r.applied ? "신청 완료" : pending === r.id ? "신청 중…" : "신청하기"}
                </button>
              </div>
            </div>
          )}
        />

      </main>
    </div>
  );
}

function StudentActivityDetail({ activity, profile, actionError, onBack, onSubmitResult, onApply, onUploadFile, onOpenFile, onLogout }) {
  const [submissionError, setSubmissionError] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");
  return (
    <>
      <header className="rq-header">
        <button className="ih-back" type="button" onClick={onBack}>‹ 목록</button>
        <span className="ih-role">대학생</span>
        {onLogout && <button className="ih-logout" onClick={onLogout}>로그아웃</button>}
      </header>
      <main className="rq-main">
        <section className="rq-hero">
          <small>{activity.type}</small>
          <h1>{activity.title}</h1>
          <p>{activity.description}</p>
        </section>
        {actionError && <p className="rq-alert" role="alert">{actionError}</p>}
        <section className="ih-detail-card">
          <h2>활동 안내</h2>
          <dl>
            <dt>활동 대상</dt><dd>{activity.target}</dd>
            <dt>활동 기간</dt><dd>{activity.period}</dd>
            <dt>모집 상태</dt><dd>{activity.recruitmentOpen ? "모집 중" : activity.status}</dd>
            <dt>모집 인원</dt><dd>{activity.capacity}명</dd>
            <dt>필요한 역량</dt><dd>{activity.requirements}</dd>
            <dt>필요한 결과물</dt><dd>{activity.resultType}</dd>
            <dt>제출 증빙자료</dt><dd>{activity.evidence}</dd>
            <dt>제출 기한</dt><dd>{activity.deadline}</dd>
          </dl>
        </section>
        {activity.assignmentId ? (
          <section className="ih-detail-card">
            <h2>내 활동 · {activity.assignmentStatus}</h2>
            <h3>사전교육 / 활동 안내</h3>
            <dl>
              <dt>활동 방법</dt><dd>{activity.guidance.method || "운영자 안내를 기다리고 있어요."}</dd>
              <dt>주의사항</dt><dd>{activity.guidance.precautions || "운영자 안내를 기다리고 있어요."}</dd>
              <dt>결과물 형식</dt><dd>{activity.guidance.resultFormat || activity.resultType}</dd>
              <dt>증빙 방법</dt><dd>{activity.guidance.evidenceGuide || activity.evidence}</dd>
              <dt>활동일지 작성</dt><dd>{activity.guidance.logGuide || "활동 내용과 소요 시간을 기록해 주세요."}</dd>
            </dl>
            {activity.submissions?.length > 0 && (() => {
              const latest = activity.submissions.at(-1);
              return <div className="ih-latest">
                <h3>최근 제출 · {activity.assignmentStatus}</h3>
                <p><b>결과물:</b> {latest.result}</p>
                <p><b>활동일지:</b> {latest.activityLog}</p>
                <p><b>증빙자료:</b> {latest.evidence}</p>
                {latest.resultFilePath && <button type="button" onClick={async () => {
                  try { await onOpenFile(latest.resultFilePath); }
                  catch (failure) { setSubmissionError(failure instanceof Error ? failure.message : "결과물 파일을 열지 못했습니다."); }
                }}>결과물 파일 열기</button>}
                {latest.evidenceFilePath && <button type="button" onClick={async () => {
                  try { await onOpenFile(latest.evidenceFilePath); }
                  catch (failure) { setSubmissionError(failure instanceof Error ? failure.message : "증빙자료 파일을 열지 못했습니다."); }
                }}>증빙자료 파일 열기</button>}
                {latest.review && <p role={latest.review.decision === "보완 요청" ? "alert" : "status"}>
                  운영자 검토: {latest.review.decision} · {latest.review.reason}
                </p>}
              </div>;
            })()}
            {["진행 중", "보완 요청"].includes(activity.assignmentStatus) && (
              <form className="ih-submission" onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const fields = Object.fromEntries(new FormData(form));
                fields.workedMinutes = Number(fields.workedMinutes);
                setSubmissionError("");
                setSubmissionMessage("");
                try {
                  const resultFile = fields.resultFile;
                  const evidenceFile = fields.evidenceFile;
                  delete fields.resultFile;
                  delete fields.evidenceFile;
                  if (resultFile?.size) {
                    fields.resultFilePath = await onUploadFile(resultFile, "results");
                    if (!fields.result.trim()) fields.result = resultFile.name;
                  }
                  if (evidenceFile?.size) {
                    fields.evidenceFilePath = await onUploadFile(evidenceFile, "evidence");
                    if (!fields.evidence.trim()) fields.evidence = evidenceFile.name;
                  }
                  await onSubmitResult(activity.assignmentId, fields);
                  setSubmissionMessage("결과물을 제출했어요. 운영자 검토를 기다려 주세요.");
                  form.reset();
                } catch (failure) {
                  setSubmissionError(failure instanceof Error ? failure.message : "결과물을 제출하지 못했어요.");
                }
              }}>
                <h3>{activity.assignmentStatus === "보완 요청" ? "결과물 재제출" : "활동 결과 제출"}</h3>
                {submissionError && <p role="alert">{submissionError}</p>}
                {submissionMessage && <p role="status">{submissionMessage}</p>}
                <label>결과물 파일명 또는 공유 링크
                  <input name="result" maxLength="500" placeholder="예) 안내서.pdf 또는 공유 링크" required />
                </label>
                <label>결과물 파일 업로드 (선택)
                  <input name="resultFile" type="file" accept=".pdf,image/jpeg,image/png,image/webp,video/mp4" onChange={(event) => {
                    const fileName = event.currentTarget.files?.[0]?.name;
                    const resultInput = event.currentTarget.form?.elements.namedItem("result");
                    if (fileName && resultInput && !resultInput.value) resultInput.value = fileName;
                  }} />
                </label>
                <label>활동일지
                  <textarea name="activityLog" required maxLength="3000" rows="4" placeholder="수행한 활동과 진행 내용을 기록해 주세요." />
                </label>
                <label>증빙자료 설명 또는 보관 링크
                  <input name="evidence" maxLength="1000" placeholder="예) 제작 과정 사진 파일명 또는 링크" required />
                </label>
                <label>증빙자료 파일 업로드 (선택)
                  <input name="evidenceFile" type="file" accept=".pdf,image/jpeg,image/png,image/webp,video/mp4" onChange={(event) => {
                    const fileName = event.currentTarget.files?.[0]?.name;
                    const evidenceInput = event.currentTarget.form?.elements.namedItem("evidence");
                    if (fileName && evidenceInput && !evidenceInput.value) evidenceInput.value = fileName;
                  }} />
                </label>
                <label>활동 시간 (분)
                  <input name="workedMinutes" type="number" min="1" step="1" required />
                </label>
                <p className="ih-upload-note">파일은 비공개 저장소로 업로드됩니다. 파일당 최대 10MB이며 PDF, JPG, PNG, WEBP, MP4 형식을 지원합니다.</p>
                <button className="ih-primary" type="submit">제출하기</button>
              </form>
            )}
            {["봉사자 배정", "결과물 제출", "검토 중", "재제출", "승인", "인증 완료"].includes(activity.assignmentStatus) &&
              !["진행 중", "보완 요청"].includes(activity.assignmentStatus) &&
              <p className="ih-state" role="status">{activity.assignmentStatus === "봉사자 배정"
                ? `활동 시작일(${activity.startDate})부터 결과물을 제출할 수 있어요.`
                : activity.assignmentStatus === "승인"
                  ? "결과물이 승인되었어요. 운영자의 최종 인증을 기다리고 있습니다."
                  : activity.assignmentStatus === "인증 완료"
                    ? "활동 인증이 완료되었어요."
                    : "제출한 결과물을 운영자가 검토하고 있어요."}</p>}
          </section>
        ) : activity.applied ? (
          <p className="ih-state" role="status">참여 신청이 완료되었어요. 운영자 배정을 기다리고 있습니다.</p>
        ) : (
          <section className="ih-detail-card">
            {profile?.verificationStatus !== "approved" && <p role="status">학생 증빙 검토 승인 후 신청할 수 있어요.</p>}
            <button className="ih-primary" type="button" disabled={!activity.recruitmentOpen || (profile && profile.verificationStatus !== "approved")}
              onClick={async () => {
                setSubmissionError("");
                try {
                  await onApply(activity.id);
                } catch (failure) {
                  setSubmissionError(failure instanceof Error ? failure.message : "신청하지 못했어요.");
                }
              }}>참여 신청하기</button>
            {submissionError && <p role="alert">{submissionError}</p>}
          </section>
        )}
      </main>
    </>
  );
}

const css = `
.ih{--ink:#25404A;--sub:#66777C;--line:#E3E8E4;--bg:#FFF9F4;--card:#fff;--brand:#168A88;--brand-soft:#E6F6F1;width:100%;max-width:480px;min-height:100vh;min-height:100svh;margin:0 auto;background:linear-gradient(180deg,#FFF9F4 0%,#F4FBF8 100%);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;font-size:17px;line-height:1.55;display:flex;flex-direction:column}
.ih *{box-sizing:border-box}
.ih button{font:inherit;color:inherit;cursor:pointer}
.ih :focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.ih .rq-header{display:flex;align-items:center;gap:8px;padding:14px 16px;background:#FFFFFFE8;border-bottom:1px solid var(--line);border-radius:0 0 22px 22px;position:sticky;top:0;z-index:2}
.ih .ih-role{margin-left:auto;color:var(--sub);font-size:15px}
.ih .ih-logout{margin-left:8px;border:0;background:transparent;color:var(--sub);font-size:14px}
.ih .rq-main{padding:20px 16px 32px;display:flex;flex-direction:column;gap:20px;flex:1}
.ih .rq-hero{background:linear-gradient(145deg,#168A88,#52B79E);color:#fff;border-radius:28px;padding:24px 20px;box-shadow:0 12px 28px #168A881A}
.ih .rq-hero h1{margin:0 0 8px;font-size:24px;line-height:1.35;color:inherit}
.ih .rq-hero p{margin:0;opacity:.9;font-size:16px}
.ih .rq-h3{font-size:18px;margin:0 0 10px}
.ih .rq-alert{padding:14px 16px;border:1px solid #DDE5EA;border-radius:14px;background:#fff;color:#5B6B77;margin:0}
.ih .rq-summary{display:grid;grid-template-columns:1fr;gap:8px}
.ih .rq-summary div{min-width:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 10px;display:flex;flex-direction:column;gap:4px}
.ih .rq-summary small{color:var(--sub);font-size:13px}
.ih .rq-summary b{font-size:15px;line-height:1.4}
.ih button{min-height:44px;padding:9px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.ih button:disabled{opacity:.5;cursor:default}
.ih .ih-link{align-self:flex-start;border:0;background:transparent;color:var(--brand);padding:0;min-height:44px;font-weight:600}
.ih section>h2{font-size:18px;margin:0 0 10px}
.ih .ih-item{display:flex;flex-direction:column;align-items:stretch;gap:10px;padding:16px;margin-bottom:12px;background:var(--card);border:1px solid var(--line);border-radius:22px;box-shadow:0 7px 20px #25404A08}
.ih .ih-item>div:first-child{min-width:0;flex:1}
.ih .ih-item b{display:block;font-size:16px}
.ih .ih-item small{display:block;color:var(--sub);font-size:14px;margin-top:3px}
.ih .ih-item button{width:100%;font-size:14px}
.ih .ih-actions{display:flex;flex-direction:column;gap:6px}
.ih .ih-actions button{font-size:13px;padding:8px}
.ih .ih-back{margin-right:auto}
.ih .ih-detail-card{padding:18px;background:var(--card);border:1px solid var(--line);border-radius:24px;box-shadow:0 7px 20px #25404A08}
.ih .ih-detail-card h2,.ih .ih-detail-card h3{margin:0 0 12px;font-size:18px}
.ih .ih-detail-card h3{margin-top:16px;font-size:16px}
.ih .ih-detail-card dl{display:grid;grid-template-columns:1fr;gap:2px 12px;margin:0}
.ih .ih-detail-card dt{color:var(--sub)}
.ih .ih-detail-card dd{margin:0 0 8px;overflow-wrap:anywhere}
.ih .ih-latest{margin-top:16px;padding:12px;border-radius:10px;background:var(--bg)}
.ih .ih-latest p{margin:6px 0;overflow-wrap:anywhere}
.ih .ih-submission{display:grid;gap:12px;margin-top:16px}
.ih .ih-submission label{display:grid;gap:6px;font-weight:600}
.ih .ih-submission input,.ih .ih-submission textarea{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);font:inherit}
.ih .ih-submission input[type="file"]{padding:8px}
.ih .ih-upload-note,.ih .ih-state{margin:0;padding:12px;border-radius:10px;background:var(--bg);color:var(--sub);font-size:14px}
.ih .ih-item .ih-primary{background:var(--ink);border-color:var(--ink);color:#fff}
.ih .ih-item .ih-category{color:var(--brand);font-weight:700}
.ih .ih-empty{color:var(--sub);font-size:15px;background:var(--card);border:1px dashed #D6E6DE;border-radius:22px;padding:20px;margin:0}
.ih .ih-state{text-align:center;padding:24px 16px}
`;

export default StudentHome;