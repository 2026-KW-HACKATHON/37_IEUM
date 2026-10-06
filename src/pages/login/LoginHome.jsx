import { useState } from "react";
import { createPasswordCredential, formatPhoneInput } from "../../data/accountAuth";

const roles = [
  { value: "student", label: "대학생", description: "봉사활동에 참여하고 도움을 전해요." },
  { value: "self", label: "어르신 본인", description: "나에게 필요한 도움을 직접 요청해요." },
  { value: "family", label: "어르신 가족", description: "가족을 대신해 필요한 도움을 요청해요." },
];
const AGE_GROUPS = ["60대", "70대", "80대", "90대 이상"];

const CSS = `
.rq-app{--ink:#172B3A;--sub:#5B6B77;--line:#DDE5EA;--bg:#F5F8FA;--card:#fff;--brand:#0F7B8A;--brand-soft:#E3F2F4;max-width:480px;min-height:100vh;margin:0 auto;background:var(--bg);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;font-size:17px;line-height:1.55;display:flex;flex-direction:column}
.rq-app *{box-sizing:border-box}
.rq-app button{font:inherit;color:inherit;cursor:pointer}
.rq-app :focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.rq-header{display:flex;align-items:center;gap:8px;padding:14px 16px;background:var(--card);border-bottom:1px solid var(--line)}
.rq-logo{font-weight:800;font-size:22px;color:var(--brand);letter-spacing:-.02em}
.rq-back{border:0;background:none;font-size:30px;line-height:1;padding:0 8px 4px 0}
.rq-main{padding:20px 16px 32px;display:flex;flex-direction:column;gap:20px;flex:1}
.rq-hero{background:var(--brand);color:#fff;border-radius:20px;padding:24px 20px}
.rq-hero h1,.rq-hero h2{margin:0 0 8px;font-size:24px;line-height:1.35;color:inherit}
.rq-hero p{margin:0;opacity:.9;font-size:16px}
.rq-entry-options{display:grid;gap:10px}
.rq-entry-card{width:100%;min-height:76px;padding:14px 16px;text-align:left;border:2px solid var(--line);border-radius:14px;background:var(--card);font-weight:700;font-size:18px}
.rq-entry-card.on{border-color:var(--brand);background:var(--brand-soft)}
.rq-entry-card span{display:block;color:var(--sub);font-size:14px;font-weight:400}
.rq-field{display:flex;flex-direction:column;gap:8px;font-weight:600}
.rq-field input{width:100%;font:inherit;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--card);font-weight:400}
.rq-field select{width:100%;font:inherit;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--card);font-weight:400}
.rq-note{margin:0;color:var(--sub);font-size:14px}
.rq-btn{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:10px 16px;font-weight:600}
.rq-btn.primary{background:var(--ink);border-color:var(--ink);color:#fff}
.rq-btn.big{width:100%;min-height:56px;font-size:18px}
.rq-btn:disabled{opacity:.45;cursor:not-allowed}
.rq-link{border:0;background:transparent;color:var(--sub);text-decoration:underline;text-underline-offset:3px}
.rq-footer{display:grid;gap:10px;padding:12px 16px 24px}
.rq-alert{padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--card)}
.rq-alert[role="alert"]{border-color:#B4532A;color:#7C3217}
`;

export default function LoginHome({ onLogin, onRegister, onOperator }) {
  const [mode, setMode] = useState("welcome");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [university, setUniversity] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [address, setAddress] = useState("");
  const [document, setDocument] = useState(null);
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState("");

  const isStudent = role === "student";
  const isRequester = role === "self" || role === "family";
  const canSubmit = Boolean(
    phone.trim() && password &&
    (mode === "login" || (password.length >= 8 && password === passwordConfirm && role && name.trim() && consented &&
      (isStudent ? university.trim() && document :
        isRequester ? address.trim() && (role !== "self" || ageGroup) : false)))
  );

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await onLogin(phone, password);
        return;
      }
      if (password.length < 8) throw new Error("비밀번호를 8자 이상 입력해주세요.");
      if (password !== passwordConfirm) throw new Error("비밀번호가 서로 일치하지 않습니다.");
      const credential = await createPasswordCredential(password);
      await onRegister({
        role: isStudent ? "student" : "requester",
        ...(isRequester && { requesterType: role }),
        name: name.trim(),
        phone: phone.trim(),
        ...credential,
        ...(isStudent && {
          university: university.trim(),
          verificationStatus: "pending",
          verificationSubmittedAt: new Date().toISOString(),
          verificationSummary: `학생 증빙 사진 제출: ${document.name}`,
          verificationDocumentName: document.name,
        }),
        ...(isRequester && {
          address: address.trim(),
          addressVerificationStatus: "pending",
          addressSubmittedAt: new Date().toISOString(),
          ...(role === "self" && { ageGroup }),
        }),
      });
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "가입 정보를 저장하지 못했어요.");
    }
  }

  return (
    <div className="rq-app">
      <style>{CSS}</style>
      <header className="rq-header">
        {mode !== "welcome" && <button className="rq-back" type="button" onClick={() => { setMode("welcome"); setError(""); }} aria-label="처음으로 돌아가기">‹</button>}
        <span className="rq-logo">이음</span>
      </header>

      <main className="rq-main">
        {mode === "welcome" ? (
          <>
            <section className="rq-hero">
              <h1>월계 이음에 오신 걸 환영해요.</h1>
              <p>로그인하거나 회원가입하고, 필요한 도움을 이어서 시작해 보세요.</p>
            </section>
            <button className="rq-btn primary big" type="button" onClick={() => setMode("login")}>로그인</button>
            <button className="rq-btn big" type="button" onClick={() => setMode("signup")}>회원가입</button>
            <button className="rq-link" type="button" onClick={onOperator}>운영자 바로가기 (개발용)</button>
          </>
        ) : (
          <>
            <section className="rq-hero">
              <h1>{mode === "signup" ? "이음 회원가입" : "이음 로그인"}</h1>
              <p>{mode === "signup" ? "함께할 유형을 선택하고 필요한 정보를 입력해 주세요." : "가입한 휴대전화 번호와 비밀번호를 입력해 주세요."}</p>
            </section>

            {mode === "signup" && <div className="rq-entry-options" role="group" aria-label="회원 유형">
              {roles.map((item) => (
                <button
                  className={`rq-entry-card${role === item.value ? " on" : ""}`}
                  type="button"
                  key={item.value}
                  aria-pressed={role === item.value}
                  onClick={() => { setRole(item.value); setError(""); }}
                >
                  {item.label}
                  <span>{item.description}</span>
                </button>
              ))}
            </div>}

            <form onSubmit={submit}>
                <div className="rq-main" style={{ padding: 0 }}>
                  {mode === "signup" && <label className="rq-field">이름
                    <input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
                  </label>}
                  <label className="rq-field">휴대전화 번호
                    <input autoComplete="tel" type="tel" inputMode="numeric" required value={phone} onChange={(event) => setPhone(formatPhoneInput(event.target.value))} placeholder="010-0000-0000" />
                  </label>
                  <label className="rq-field">비밀번호
                    <input autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
                    {mode === "signup" && <span className="rq-note">8자 이상으로 입력해 주세요.</span>}
                  </label>
                  {mode === "signup" && <label className="rq-field">비밀번호 확인
                    <input autoComplete="new-password" type="password" minLength={8} required value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} />
                  </label>}

                  {mode === "signup" && isStudent && (
                    <>
                      <label className="rq-field">소속 대학
                        <input required value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="예) 광운대학교" />
                      </label>
                      <label className="rq-field">재학 증빙 사진
                        <input
                          required
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
                        />
                        <span className="rq-note">재학증명서 또는 학생증 사진을 선택해 주세요. JPG, PNG, WEBP 파일을 지원해요.</span>
                      </label>
                      {document && <p className="rq-note">선택한 파일: {document.name} ({Math.ceil(document.size / 1024)}KB)</p>}
                      <p className="rq-alert">현재는 파일 원본을 업로드하거나 저장하지 않고 파일명만 기록해요. 실제 증빙 확인을 위해서는 안전한 서버 업로드 연결이 필요해요.</p>
                    </>
                  )}

                  {mode === "signup" && isRequester && (
                    <>
                      {role === "self" && (
                        <label className="rq-field">연령대
                          <select required value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>
                            <option value="">연령대를 선택해 주세요.</option>
                            {AGE_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                          </select>
                        </label>
                      )}
                      <label className="rq-field">거주지 주소
                        <input autoComplete="street-address" required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="시·군·구와 도로명 주소를 입력해 주세요." />
                      </label>
                      <p className="rq-alert">주소는 가입 정보에 저장되며 운영자 확인 대기 상태로 접수돼요. 현재는 실제 주소 검색·인증 서비스와 연결되어 있지 않아요.</p>
                    </>
                  )}

                  {mode === "signup" && <label className="rq-note">
                    <input type="checkbox" required checked={consented} onChange={(event) => setConsented(event.target.checked)} />
                    {" "}가입 및 운영자 확인을 위해 입력한 가입 정보와 검증 상태를 이 브라우저에 저장하는 데 동의합니다.
                  </label>}

                  {error && <p className="rq-alert" role="alert">{error}</p>}
                  <button className="rq-btn primary big" type="submit" disabled={!canSubmit}>{mode === "signup" ? "가입 신청하기" : "로그인"}</button>
                </div>
              </form>
          </>
        )}
      </main>
    </div>
  );
}