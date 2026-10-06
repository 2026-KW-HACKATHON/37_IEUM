import React, { useEffect, useState, useCallback } from "react";

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
export const ROUTE = {
  REQUEST_MAP: "requestMap",     // n14 의뢰 탐색 지도
  EVENT_LIST: "eventList",       // n51 지역활동 목록
  REPORT: "report",              // n49 생활불편 제보
  HOURS: "hours",                // n45 봉사시간 내역
  SETTINGS: "settings",          // n56 프로필·설정
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

  useEffect(reload, [reload]);
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
    requests: [],
    events: [],
  });
const defaultOnApply = () => Promise.resolve();
const defaultOnNavigate = (route, params) => console.log("navigate:", route, params);

function StudentHome({
  loadHome = defaultLoadHome,
  onApply = defaultOnApply,
  onNavigate = defaultOnNavigate,
  profile,
  onLogout,
}) {
  const { status, data, reload, setData } = useHomeData(loadHome);
  const [pending, setPending] = useState(null); // 신청 처리 중인 의뢰 id
  const go = (route, params) => onNavigate?.(route, params);

  const apply = async (id) => {
    setPending(id);
    try {
      await onApply(id);
      // 서버 재조회 없이 해당 의뢰만 신청됨으로 반영
      setData({
        ...data,
        requests: data.requests.map((r) => (r.id === id ? { ...r, applied: true } : r)),
      });
    } catch {
      alert("신청하지 못했어요. 잠시 후 다시 시도해 주세요.");
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

  const { user, summary, myActivities, requests } = data;
  const userName = profile?.name || user.name;

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
          <p className="rq-alert" role="status">
            학생 증빙 검토 상태: {profile?.verificationStatus === "rejected" ? "반려" : "검증 대기"}.
            승인 후 모집 중인 봉사활동에 신청할 수 있어요.
          </p>
        )}
        <button className="ih-link" onClick={() => go(ROUTE.HOURS)}>봉사시간 내역 보기</button>

        <Section
          title="내 진행 중 활동"
          items={myActivities}
          empty="진행 중인 활동이 없어요."
          render={(a) => (
            <div key={a.id} className="ih-item">
              <div><b>{a.title}</b><small>{a.subtitle}</small></div>
              <button onClick={() => go(ROUTE.ACTIVITY, { id: a.id })}>열기</button>
            </div>
          )}
        />

        <Section
          title="모집 중인 도움"
          items={requests}
          empty="현재 모집 중인 도움이 없어요."
          render={(r) => (
            <div key={r.id} className="ih-item">
              <div onClick={() => go(ROUTE.REQUEST, { id: r.id })} role="button" tabIndex={0}>
                <b>{r.title}</b>
                {r.tags?.length > 0 && <small className="ih-category">{r.tags.join(" · ")}</small>}
                {r.subtitle && <small>{r.subtitle}</small>}
              </div>
              <button className="ih-primary" disabled={Boolean(profile && profile.verificationStatus !== "approved") || r.applied || pending === r.id} onClick={() => apply(r.id)}>
                {r.applied ? "신청 완료" : "신청하기"}
              </button>
            </div>
          )}
        />

        <button className="ih-link" onClick={() => go(ROUTE.SETTINGS)}>프로필·설정</button>
      </main>
    </div>
  );
}

const css = `
.ih{--ink:#172B3A;--sub:#5B6B77;--line:#DDE5EA;--bg:#F5F8FA;--card:#fff;--brand:#0F7B8A;--brand-soft:#E3F2F4;max-width:480px;min-height:100vh;margin:0 auto;background:var(--bg);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;font-size:17px;line-height:1.55;display:flex;flex-direction:column}
.ih *{box-sizing:border-box}
.ih button{font:inherit;color:inherit;cursor:pointer}
.ih :focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.ih .rq-header{display:flex;align-items:center;gap:8px;padding:14px 16px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
.ih .ih-role{margin-left:auto;color:var(--sub);font-size:15px}
.ih .ih-logout{margin-left:8px;border:0;background:transparent;color:var(--sub);font-size:14px}
.ih .rq-main{padding:20px 16px 32px;display:flex;flex-direction:column;gap:20px;flex:1}
.ih .rq-hero{background:var(--brand);color:#fff;border-radius:20px;padding:24px 20px}
.ih .rq-hero h1{margin:0 0 8px;font-size:24px;line-height:1.35;color:inherit}
.ih .rq-hero p{margin:0;opacity:.9;font-size:16px}
.ih .rq-h3{font-size:18px;margin:0 0 10px}
.ih .rq-alert{padding:14px 16px;border:1px solid #DDE5EA;border-radius:14px;background:#fff;color:#5B6B77;margin:0}
.ih .rq-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.ih .rq-summary div{min-width:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 10px;display:flex;flex-direction:column;gap:4px}
.ih .rq-summary small{color:var(--sub);font-size:13px}
.ih .rq-summary b{font-size:15px;line-height:1.4}
.ih button{min-height:44px;padding:9px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.ih button:disabled{opacity:.5;cursor:default}
.ih .ih-link{align-self:flex-start;border:0;background:transparent;color:var(--brand);padding:0;min-height:44px;font-weight:600}
.ih section>h2{font-size:18px;margin:0 0 10px}
.ih .ih-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px;margin-bottom:10px;background:var(--card);border:1px solid var(--line);border-radius:14px}
.ih .ih-item>div:first-child{min-width:0;flex:1}
.ih .ih-item b{display:block;font-size:16px}
.ih .ih-item small{display:block;color:var(--sub);font-size:14px;margin-top:3px}
.ih .ih-item button{flex-shrink:0;font-size:14px}
.ih .ih-item .ih-primary{background:var(--ink);border-color:var(--ink);color:#fff}
.ih .ih-item .ih-category{color:var(--brand);font-weight:700}
.ih .ih-empty{color:var(--sub);font-size:15px;background:var(--card);border:1px dashed var(--line);border-radius:14px;padding:18px;margin:0}
.ih .ih-state{text-align:center;padding:24px 16px}
@media(max-width:360px){.ih .rq-summary{grid-template-columns:1fr}.ih .rq-summary div{padding:10px 12px}}
`;

export default StudentHome;