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
 * @property {Array<{ id: string, title: string, subtitle?: string, tags?: string[], applied?: boolean }>} requests  근처 모집 중 의뢰
 * @property {Array<{ id: string, title: string, subtitle?: string }>} events  이번 달 지역활동
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

  if (status === "loading") return <p className="ih-state">불러오는 중…</p>;
  if (status === "error") {
    return (
      <div className="ih-state">
        <p>홈 화면을 불러오지 못했어요.</p>
        <button onClick={reload}>다시 시도</button>
      </div>
    );
  }

  const { user, summary, myActivities, requests, events } = data;

  return (
    <div className="ih">
      <style>{css}</style>

      <h1>{user.name ? `안녕하세요, ${user.name}님` : "안녕하세요"}</h1>

      <div className="ih-summary">
        <div><small>이번 달 활동</small><b>{summary.monthlyCount}회 완료</b></div>
        <div><small>누적 봉사시간</small><b>{formatMinutes(summary.totalMinutes)}</b></div>
        <div><small>인증 상태</small><b>검증 완료 {summary.verifiedCount}건</b></div>
      </div>
      <button className="ih-link" onClick={() => go(ROUTE.HOURS)}>봉사시간 내역 보기</button>

      <h2>빠른 시작</h2>
      <div className="ih-quick">
        <button onClick={() => go(ROUTE.REQUEST_MAP)}>의뢰 탐색</button>
        <button onClick={() => go(ROUTE.EVENT_LIST)}>지역활동</button>
        <button onClick={() => go(ROUTE.REPORT)}>생활 제보</button>
      </div>

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
        title="근처 모집 중 의뢰"
        items={requests}
        empty="근처에 모집 중인 의뢰가 없어요."
        render={(r) => (
          <div key={r.id} className="ih-item">
            <div onClick={() => go(ROUTE.REQUEST, { id: r.id })} role="button" tabIndex={0}>
              <b>{r.title}</b><small>{r.subtitle}</small>
              {r.tags?.length > 0 && <div className="ih-tags">{r.tags.map((t) => <span key={t}>{t}</span>)}</div>}
            </div>
            <button className="ih-primary" disabled={r.applied || pending === r.id} onClick={() => apply(r.id)}>
              {r.applied ? "신청 완료" : "신청하기"}
            </button>
          </div>
        )}
      />

      <Section
        title="이번 달 지역활동"
        items={events}
        empty="이번 달 지역활동이 없어요."
        render={(e) => (
          <div key={e.id} className="ih-item">
            <div><b>{e.title}</b><small>{e.subtitle}</small></div>
            <button onClick={() => go(ROUTE.EVENT, { id: e.id })}>자세히 보기</button>
          </div>
        )}
      />

      <button className="ih-link" onClick={() => go(ROUTE.SETTINGS)}>프로필·설정</button>
    </div>
  );
}

const css = `
.ih{max-width:430px;margin:0 auto;padding:20px 16px 40px;font-family:system-ui,"Noto Sans KR",sans-serif;color:#1c2b33}
.ih h1{font-size:20px;margin:0 0 16px}
.ih h2{font-size:16px;margin:24px 0 8px}
.ih button{font:inherit;min-height:44px;padding:0 14px;border:1px solid #cfd8dc;border-radius:10px;background:#fff;cursor:pointer}
.ih button:disabled{opacity:.5;cursor:default}
.ih .ih-primary{background:#2b6f77;border-color:#2b6f77;color:#fff}
.ih .ih-link{border:0;background:none;color:#2b6f77;padding:0;min-height:44px}
.ih small{display:block;color:#5d6d76;font-size:12px}
.ih-summary{display:flex;justify-content:space-between;gap:8px;padding:14px;border:1px solid #dbe3e7;border-radius:12px}
.ih-quick{display:flex;gap:8px}.ih-quick button{flex:1}
.ih-item{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px;margin-bottom:8px;border:1px solid #dbe3e7;border-radius:12px}
.ih-tags{display:flex;gap:6px;margin-top:4px}.ih-tags span{font-size:12px;padding:2px 8px;border-radius:999px;background:#e6f0f1}
.ih-empty{color:#5d6d76;font-size:14px}
.ih-state{text-align:center;padding:40px 16px}
`;

export default StudentHome;