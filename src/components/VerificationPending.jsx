const styles = `
.verification-gate{min-height:100vh;min-height:100svh;background:linear-gradient(180deg,#FFF9F4 0%,#F4FBF8 100%);color:#25404A;font-family:var(--font-body);display:flex;flex-direction:column}
.verification-gate *{box-sizing:border-box}
.verification-gate header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#fff;border-bottom:1px solid #DDE5EA}
.verification-gate .logo{font-size:22px;font-weight:800;color:#0F7B8A}
.verification-gate button{border:0;background:transparent;color:#5B6B77;font:inherit;cursor:pointer}
.verification-gate main{width:calc(100% - 32px);max-width:480px;flex:1;margin:clamp(24px,8vh,72px) auto}
.verification-gate section{padding:clamp(20px,6vw,28px);border:1px solid #E3E8E4;border-radius:28px;background:#fff;box-shadow:0 12px 28px #25404A0A}
.verification-gate h1{margin:0 0 16px;font-size:24px;line-height:1.4}
.verification-gate p{margin:0;color:#5B6B77;line-height:1.7}
.verification-gate .status{margin-top:20px;padding:16px;border-radius:20px;background:#E6F6F1;color:#168A88}
`;

export default function VerificationPending({ profile, onLogout }) {
  const isStudent = profile.role === "student";
  const status = isStudent ? profile.verificationStatus : profile.addressVerificationStatus;
  const rejected = status === "rejected";
  const subject = isStudent ? "재학 증빙" : "회원가입 정보와 주소";

  return (
    <div className="verification-gate">
      <style>{styles}</style>
      <header>
        <span className="logo">이음</span>
        {onLogout && <button type="button" onClick={onLogout}>로그아웃</button>}
      </header>
      <main>
        <section aria-labelledby="verification-title">
          <h1 id="verification-title">{rejected ? "확인할 내용이 있어요" : "운영자 검토 중이에요"}</h1>
          <p>
            {rejected
              ? `${subject} 확인이 반려되었습니다. 운영자에게 문의해 주세요.`
              : `${subject}을(를) 운영자가 검토하고 있어요. 승인되면 서비스를 이용할 수 있습니다.`}
          </p>
          <p className="status" role="status">검토 상태: {rejected ? "반려" : "검토 대기"}</p>
        </section>
      </main>
    </div>
  );
}
