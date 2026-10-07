import { useEffect, useRef, useState } from "react";

let postcodeScript;

function loadPostcodeScript() {
  if (window.daum?.Postcode) return Promise.resolve();
  if (!postcodeScript) {
    postcodeScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        postcodeScript = null;
        reject(new Error("주소 검색 서비스를 불러오지 못했습니다. 네트워크를 확인해주세요."));
      };
      document.head.appendChild(script);
    });
  }
  return postcodeScript;
}

export default function AddressSearchButton({ onSelect }) {
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const postcodeContainer = useRef(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    loadPostcodeScript().then(() => {
      if (!active || !postcodeContainer.current) return;
      new window.daum.Postcode({
        oncomplete: (data) => {
          onSelectRef.current({
            address: data.roadAddress || data.jibunAddress || data.address,
            zonecode: data.zonecode,
          });
          setIsOpen(false);
        },
      }).embed(postcodeContainer.current);
    }).catch((failure) => {
      if (!active) return;
      setError(failure instanceof Error ? failure.message : "주소 검색을 시작하지 못했습니다.");
      setIsOpen(false);
    });
    return () => { active = false; };
  }, [isOpen]);

  return (
    <>
      <button className="rq-btn" type="button" onClick={() => { setError(""); setIsOpen(true); }}>주소 찾기</button>
      {error && <p className="rq-alert" role="alert">{error}</p>}
      {isOpen && <div className="postcode-overlay" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsOpen(false);
      }}>
        <section className="postcode-dialog" role="dialog" aria-modal="true" aria-label="도로명 주소 찾기">
          <header>
            <strong>도로명 주소 찾기</strong>
            <button type="button" aria-label="주소 검색 닫기" onClick={() => setIsOpen(false)}>닫기</button>
          </header>
          <div className="postcode-content" ref={postcodeContainer} />
        </section>
        <style>{`
          .postcode-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:#172B3A99}
          .postcode-dialog{display:flex;flex-direction:column;width:min(100%,500px);height:min(620px,90vh);overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 16px 48px #0004}
          .postcode-dialog header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #DDE5EA}
          .postcode-dialog header button{border:0;background:transparent;font:inherit;cursor:pointer}
          .postcode-content{flex:1;min-height:0}
          .postcode-content iframe{width:100%;height:100%;border:0}
        `}</style>
      </div>}
    </>
  );
}
