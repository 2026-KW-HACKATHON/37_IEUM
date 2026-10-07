import { useState } from "react";
import { formatPhoneInput } from "../../data/accountAuth";
import AddressSearchButton from "../../components/AddressSearchButton";

const roles = [
  { value: "student", label: "대학생", description: "봉사활동에 참여하고 도움을 전해요." },
  { value: "self", label: "어르신 본인", description: "나에게 필요한 도움을 직접 요청해요." },
  { value: "family", label: "어르신 가족", description: "가족을 대신해 필요한 도움을 요청해요." },
];
const AGE_GROUPS = ["60대", "70대", "80대", "90대 이상"];

const CSS = `
.rq-app{--ink:#25404A;--sub:#66777C;--line:#E3E8E4;--bg:#FFF9F4;--card:#fff;--brand:#168A88;--brand-soft:#E6F6F1;width:100%;max-width:440px;min-height:100vh;min-height:100svh;margin:0 auto;background:linear-gradient(180deg,#FFF9F4 0%,#F4FBF8 100%);color:var(--ink);font-family:var(--font-body);font-size:17px;line-height:1.6;display:flex;flex-direction:column}
.rq-app *{box-sizing:border-box}
.rq-app button{font:inherit;color:inherit;cursor:pointer}
.rq-app :focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.rq-header{display:flex;align-items:center;gap:8px;padding:14px 16px;background:#FFFFFFE8;border-bottom:1px solid var(--line);border-radius:0 0 22px 22px}
.rq-logo{font-weight:800;font-size:22px;color:var(--brand);letter-spacing:-.02em}
.rq-back{border:0;background:none;font-size:30px;line-height:1;padding:0 8px 4px 0}
.rq-main{padding:20px 16px 32px;display:flex;flex-direction:column;gap:20px;flex:1}
.rq-hero{background:linear-gradient(145deg,#168A88,#52B79E);color:#fff;border-radius:28px;padding:24px 20px;box-shadow:0 12px 28px #168A881A}
.rq-hero h1,.rq-hero h2{margin:0 0 8px;font-size:24px;line-height:1.35;color:inherit}
.rq-hero p{margin:0;opacity:.9;font-size:16px}
.rq-entry-options{display:grid;gap:10px}
.rq-entry-card{width:100%;min-height:76px;padding:16px;text-align:left;border:2px solid var(--line);border-radius:22px;background:var(--card);font-weight:700;font-size:18px;box-shadow:0 5px 16px #25404A08}
.rq-entry-card.on{border-color:var(--brand);background:var(--brand-soft)}
.rq-entry-card span{display:block;color:var(--sub);font-size:14px;font-weight:400}
.rq-field{display:flex;flex-direction:column;gap:8px;font-weight:600}
.rq-field input{width:100%;font:inherit;border:1px solid var(--line);border-radius:16px;padding:12px 14px;background:var(--card);font-weight:400}
.rq-field select{width:100%;font:inherit;border:1px solid var(--line);border-radius:16px;padding:12px 14px;background:var(--card);font-weight:400}
.rq-note{margin:0;color:var(--sub);font-size:14px}
.rq-btn{border:1px solid var(--line);background:var(--card);border-radius:18px;padding:10px 16px;font-weight:600;box-shadow:0 5px 14px #25404A0A}
.rq-btn.primary{background:var(--ink);border-color:var(--ink);color:#fff}
.rq-btn.big{width:100%;min-height:56px;font-size:18px}
.rq-btn:disabled{opacity:.45;cursor:not-allowed}
.rq-link{border:0;background:transparent;color:var(--sub);text-decoration:underline;text-underline-offset:3px}
.rq-footer{display:grid;gap:10px;padding:12px 16px 24px}
.rq-alert{padding:14px 16px;border:1px solid var(--line);border-radius:20px;background:var(--card)}
.rq-alert[role="alert"]{border-color:#B4532A;color:#7C3217}
.rq-welcome .rq-main{justify-content:space-evenly;padding-top:clamp(24px,8vh,80px);padding-bottom:clamp(24px,8vh,80px);gap:clamp(20px,5vh,40px)}
.rq-welcome .rq-hero{padding-top:clamp(36px,8vh,76px);padding-bottom:clamp(36px,8vh,76px)}
.rq-admin-login{min-height:100vh;min-height:100svh;background:radial-gradient(ellipse at 50% 38%,#E6F6F1 0%,#FFF9F4 62%)}
.rq-admin-login .rq-header{padding:20px 22px;background:#FFFFFFD9}
.rq-admin-login .rq-main{justify-content:center;gap:clamp(24px,5vh,40px);padding:clamp(36px,9vh,88px) 22px clamp(44px,11vh,104px)}
.rq-admin-login .rq-hero{min-height:clamp(170px,26vh,240px);display:flex;flex-direction:column;justify-content:flex-end;padding:30px 24px;border-radius:30px}
.rq-admin-login .rq-hero h1{font-size:clamp(27px,7vw,34px)}
.rq-admin-login form{width:100%;padding:22px;border:1px solid #E3E8E4;border-radius:26px;background:#FFFFFFD9;box-shadow:0 16px 40px #25404A12}
.rq-admin-login form .rq-main{gap:18px}
.rq-admin-login .rq-field{gap:10px}
.rq-admin-login .rq-field input{min-height:54px}
.rq-admin-login .rq-btn.big{min-height:60px}
.rq-admin-login>.rq-main>.rq-btn{margin-top:-8px}
@media(min-width:600px){.rq-app{box-shadow:0 0 48px #25404A12}}
`;

export default function LoginHome({ onLogin, onRegister, onVerify, onAdminLogin, startupError, localMode, adminOnly = false }) {
  const [mode, setMode] = useState(adminOnly ? "login" : "welcome");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [university, setUniversity] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [address, setAddress] = useState("");
  const [addressZonecode, setAddressZonecode] = useState("");
  const [document, setDocument] = useState(null);
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState("");
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [otp, setOtp] = useState("");

  const isStudent = role === "student";
  const isRequester = role === "self" || role === "family";
  const adminLogin = adminOnly;
  const canSubmit = Boolean(
    (adminLogin ? adminId.trim() : phone.trim()) && password &&
    (mode === "login" || (password.length >= 8 && password === passwordConfirm && role && name.trim() && consented &&
      (isStudent ? university.trim() && document :
        isRequester ? address.trim() && (role !== "self" || ageGroup) : false)))
  );

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (confirmationRequired) {
        await onVerify(phone, otp, document);
        return;
      }
      if (mode === "login") {
        if (adminLogin) {
          await onAdminLogin(adminId.trim(), password);
          return;
        }
        await onLogin(phone, password);
        return;
      }
      if (password.length < 8) throw new Error("비밀번호를 8자 이상 입력해주세요.");
      if (password !== passwordConfirm) throw new Error("비밀번호가 서로 일치하지 않습니다.");
      const profile = {
        role: isStudent ? "student" : "requester",
        ...(isRequester && { requesterType: role }),
        name: name.trim(),
        phone: phone.trim(),
        ...(isStudent && {
          university: university.trim(),
          verificationStatus: "pending",
          verificationSubmittedAt: new Date().toISOString(),
          verificationSummary: `학생 증빙 사진 제출: ${document.name}`,
          verificationDocumentName: document.name,
        }),
        ...(isRequester && {
          address: address.trim(),
          addressZonecode,
          addressVerificationStatus: "pending",
          addressSubmittedAt: new Date().toISOString(),
          ...(role === "self" && { ageGroup }),
        }),
      };
      const result = await onRegister(profile, password, document);
      if (result?.confirmationRequired) setConfirmationRequired(true);
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "가입 정보를 저장하지 못했어요.");
    }
  }

  return (
    <div className={`rq-app${mode === "welcome" ? " rq-welcome" : ""}${adminOnly ? " rq-admin-login" : ""}`}>
      <style>{CSS}</style>
      <header className="rq-header">
        {mode !== "welcome" && !adminOnly && <button className="rq-back" type="button" onClick={() => { setMode("welcome"); setError(""); }} aria-label="처음으로 돌아가기">‹</button>}
        <span className="rq-logo">이음</span>
      </header>

      <main className="rq-main">
        {startupError && <p className="rq-alert" role="alert">{startupError}</p>}
        {mode === "welcome" ? (
          <>
            <section className="rq-hero">
              <h1>{adminOnly ? "이음 운영자 화면" : "월계 이음에 오신 걸 환영해요."}</h1>
              <p>{adminOnly ? "운영자 계정으로 로그인해 주세요." : "로그인하거나 회원가입하고, 필요한 도움을 이어서 시작해 보세요."}</p>
            </section>
            <button className="rq-btn primary big" type="button" onClick={() => setMode("login")}>로그인</button>
            {!adminOnly && <button className="rq-btn big" type="button" onClick={() => setMode("signup")}>회원가입</button>}
          </>
        ) : (
          <>
            <section className="rq-hero">
              <h1>{confirmationRequired ? "휴대전화 인증" : mode === "signup" ? "이음 회원가입" : adminOnly ? "운영자 로그인" : "이음 로그인"}</h1>
              <p>{confirmationRequired ? "문자로 받은 인증번호를 입력해 가입을 완료해 주세요." : mode === "signup" ? "함께할 유형을 선택하고 필요한 정보를 입력해 주세요." : adminOnly ? "운영자 아이디와 비밀번호를 입력해 주세요." : "가입한 휴대전화 번호와 비밀번호를 입력해 주세요."}</p>
            </section>

            {!confirmationRequired && mode === "signup" && <div className="rq-entry-options" role="group" aria-label="회원 유형">
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

            {mode === "signup" && !role
              ? <p className="rq-note" role="status">회원 유형을 선택하면 가입 정보를 입력할 수 있어요.</p>
              : <form onSubmit={submit}>
                <div className="rq-main" style={{ padding: 0 }}>
                  {confirmationRequired ? <>
                    <p className="rq-alert">인증 번호를 보낼 전화번호: {phone}</p>
                    <label className="rq-field">문자 인증번호
                      <input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} />
                    </label>
                  </> : <>
                  {mode === "signup" && <label className="rq-field">이름
                    <input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
                  </label>}
                  {adminLogin
                    ? <label className="rq-field">운영자 아이디
                      <input autoComplete="username" required value={adminId} onChange={(event) => setAdminId(event.target.value)} />
                    </label>
                    : <label className="rq-field">휴대전화 번호
                      <input autoComplete="tel" type="tel" inputMode="numeric" required value={phone} onChange={(event) => setPhone(formatPhoneInput(event.target.value))} placeholder="010-0000-0000" />
                    </label>}
                  <label className="rq-field">비밀번호
                    <input autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" minLength={adminLogin ? undefined : 8} required value={password} onChange={(event) => setPassword(event.target.value)} />
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
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
                        />
                        <span className="rq-note">재학증명서 또는 학생증 자료를 선택해 주세요. PDF, JPG, PNG, WEBP 파일을 지원해요.</span>
                      </label>
                      {document && <p className="rq-note">선택한 파일: {document.name} ({Math.ceil(document.size / 1024)}KB)</p>}
                      {localMode
                        ? <p className="rq-alert">로컬 테스트 모드에서는 휴대전화 인증 및 증빙 파일 업로드가 진행되지 않으며, 데이터는 이 브라우저에만 저장돼요.</p>
                        : <p className="rq-alert">선택한 증빙은 휴대전화 인증 후 비공개 저장소에 업로드되어 운영자만 확인할 수 있어요.</p>}
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
                        <input autoComplete="street-address" required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="주소를 직접 입력하거나 주소 찾기를 이용해 주세요." />
                      </label>
                      <AddressSearchButton onSelect={({ address: selectedAddress, zonecode }) => {
                        setAddress(`${selectedAddress} (${zonecode})`);
                        setAddressZonecode(zonecode);
                      }} />
                      <p className="rq-alert">주소는 가입 정보에 저장되며 운영자 확인 대기 상태로 접수돼요.</p>
                    </>
                  )}

                  {mode === "signup" && <label className="rq-note">
                    <input type="checkbox" required checked={consented} onChange={(event) => setConsented(event.target.checked)} />
                    {" "}가입 및 운영자 확인을 위해 입력한 가입 정보와 검증 상태를 이 브라우저에 저장하는 데 동의합니다.
                  </label>}
                  </>}

                  {error && <p className="rq-alert" role="alert">{error}</p>}
                  <button className="rq-btn primary big" type="submit" disabled={confirmationRequired ? otp.length !== 6 : !canSubmit}>{confirmationRequired ? "인증하고 가입 완료" : mode === "signup" ? "가입 신청하기" : adminOnly ? "운영자 로그인" : "로그인"}</button>
                </div>
              </form>}
          </>
        )}
      </main>
    </div>
  );
}