import { useState } from "react";

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

  async function openSearch() {
    setError("");
    try {
      await loadPostcodeScript();
      new window.daum.Postcode({
        oncomplete: (data) => onSelect({
          address: data.roadAddress || data.jibunAddress || data.address,
          zonecode: data.zonecode,
        }),
      }).open();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "주소 검색을 시작하지 못했습니다.");
    }
  }

  return (
    <>
      <button className="rq-btn" type="button" onClick={openSearch}>주소 찾기</button>
      {error && <p className="rq-alert" role="alert">{error}</p>}
    </>
  );
}
