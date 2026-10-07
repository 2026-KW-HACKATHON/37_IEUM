# 이음 (IEUM)

> 어르신의 생활 속 필요한 도움과 대학생의 봉사활동을 연결하는 비대면 봉사 플랫폼

**2026 KW 해커톤 — 광운대학교**<br>
**배리어프리 및 생활 편의 트랙**

---

## 1. 이음은 무엇인가?

이음(IEUM)은 월계1동을 중심으로 어르신에게 필요한 생활 속 도움을 대학생의 비대면 봉사활동으로 연결하는 플랫폼입니다.

어르신 본인 또는 가족이 필요한 도움을 요청하면 운영자가 내용을 검토해 봉사활동으로 구체화하고, 대학생이 참여해 활동을 수행합니다. 제출된 결과물은 운영자 검토와 내부 인증을 거쳐 의뢰자에게 전달됩니다.

```text
어르신 / 가족
      ↓
    도움 요청
      ↓
  운영자 검토
      ↓
봉사활동 등록·모집
      ↓
  대학생 신청·배정
      ↓
   활동 수행
      ↓
 결과물·증빙 제출
      ↓
   운영자 검토
      ↓
  보완 / 승인
      ↓
   봉사활동 인증
      ↓
   의뢰자 결과 확인
```

## 2. 해결하려는 문제

생활에 필요한 도움이나 정보가 있어도 어디에 요청해야 할지 모르는 경우가 있습니다. 특히 어르신에게는 스마트폰·키오스크 사용, 병원 예약 등 생활·디지털 안내, 취미·생활 활동, 말벗 및 기록과 같은 일상적인 도움이 필요할 수 있습니다.

이음은 이런 **생활 속 요청을 실제 봉사활동으로 연결**합니다.

## 3. 주요 기능

### 의뢰자

- 어르신 본인 또는 가족으로 회원가입하고 운영자 검토 상태 확인
- 필요한 도움 요청 및 요청 진행 상황 확인
- 검토·인증을 마친 활동 결과 확인

### 대학생 봉사자

- 운영자 승인 후 모집 중인 비대면 봉사활동 탐색 및 신청
- 배정된 활동의 안내 확인
- 결과물·활동일지·증빙 제출
- 검토 결과 확인 및 보완 자료 재제출

### 운영자

- 의뢰 내용 검토 및 봉사활동 등록·모집
- 대학생 신청 확인 및 봉사자 배정
- 활동 진행과 결과물 검토·보완 요청 관리
- 봉사활동 내부 인증 및 사용자 검증

## 4. 봉사활동 유형

| 유형 | 예시 |
| --- | --- |
| 생활·디지털 안내 | 스마트폰, 키오스크, 병원 예약 안내 |
| 생활·취미 키트 | 식물, 만들기, 생활 키트 |
| 말벗·기록 | 안부 나누기, 이야기 기록 |

## 5. 핵심 차별점

기존 봉사 플랫폼이 봉사자가 활동을 찾아가는 구조라면, 이음은 **지역에서 필요한 도움을 먼저 요청하고 그 요청을 봉사활동으로 연결하는 구조**를 지향합니다.

단순 모집에 그치지 않고 **의뢰 → 모집 → 배정 → 활동 → 결과물 제출 → 검토 → 인증**까지 하나의 흐름으로 관리합니다.

## 6. 기술 스택 및 프로젝트 구조

- **Frontend:** React, Vite, JavaScript
- **Backend / Database:** Supabase, PostgreSQL
- **기타:** Supabase Auth·Storage·Edge Functions, Naver Cloud SENS SMS 연동(원격 운영 시)

```text
src/
├── components/       # 주소 검색, 검토 상태 등 공통 UI
├── data/             # 인증, 운영 데이터, Supabase 연동
├── pages/
│   ├── login/
│   ├── student/
│   ├── requester/
│   └── admin/
├── App.jsx
└── main.jsx

supabase/
├── functions/
└── migrations/
```

## 7. 필요한 외부 서비스

| 기능 | 연동 | 필요한 설정 |
| --- | --- | --- |
| 전화번호·비밀번호 로그인과 휴대전화 확인 | Supabase Auth | Phone provider, OTP, SMS 발송 hook |
| 요청·모집·배정·검토 데이터 | Supabase Database | 아래 SQL migration 및 RLS 정책 |
| 재학 증빙·활동 결과 파일 | Supabase Storage | 비공개 `ieum-private` bucket 및 정책 |
| 한국 주소 검색 | Kakao 우편번호 서비스 | 브라우저 SDK, API 키 불필요 |
| 인증 문자 발송 | Naver Cloud SENS | Supabase Send SMS Hook Edge Function과 서버 비밀값 |

현재 흐름은 비대면이라 지도 화면, 지도 타일, 좌표 변환 API가 필요하지 않습니다. 추후 방문 봉사나 거리 기반 배정을 추가할 때만 지도 API를 검토하세요. Kakao 우편번호 서비스가 반환한 주소는 사용자가 선택한 다음에만 저장합니다.

1365 실적 등록은 이 앱의 내부 인증과 별개입니다. 기관 승인·제휴 및 1365 연동 권한이 확보되기 전에는 공식 봉사시간으로 표시하지 않습니다.

## 8. Supabase 프로젝트 설정 (실제 원격 서비스 사용 시)

SMS 인증을 설정하지 않고 화면과 흐름을 테스트하려면 아래 설정 대신 [로컬 개발](#로컬-개발) 모드를 사용하세요. 로컬 모드에서는 `.env.local`의 `VITE_USE_LOCAL_STORAGE=true`가 Supabase 연결보다 우선합니다.

1. [Supabase Dashboard](https://supabase.com/dashboard/projects)에서 프로젝트를 만들고 가까운 리전을 선택합니다.
2. **Project Settings → API**에서 Project URL과 publishable key(구형 프로젝트의 anon key)를 확인합니다.
3. 저장소 루트에서 `.env.example`을 참고해 `.env.local`을 만듭니다.

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```

   `.env.local`은 Git에서 제외됩니다. `service_role`, 데이터베이스 비밀번호, SMS 비밀키를 `VITE_` 환경 변수나 브라우저 코드에 넣지 마세요. URL과 키를 바꾼 뒤 개발 서버를 재시작해야 합니다.

4. Supabase **SQL Editor**에서 `supabase/migrations/`의 SQL 파일을 이름순으로 모두 실행합니다. 초기 스키마와 학생 결과 제출 RPC, 활동 시작일 자동 처리 변경이 적용됩니다.
5. **Authentication → Providers → Phone**에서 전화번호 인증을 켜고 Phone sign-up confirmation 및 OTP 정책을 설정합니다. SMS 발송 업체가 연결되지 않았다면 가입 OTP가 전송되지 않습니다.
6. Naver Cloud SENS에 SMS 서비스와 발신번호를 등록하고, 프로젝트에서 사용할 서비스 ID, Access Key, Secret Key, 승인된 발신번호를 준비합니다. **비밀키는 앱에 입력하거나 Git에 저장하지 않습니다.**
7. Supabase CLI를 설치·로그인한 뒤 함수를 배포합니다.

   ```powershell
   supabase functions deploy send-sms-hook --no-verify-jwt
   supabase secrets set SENS_ACCESS_KEY=... SENS_SECRET_KEY=... SENS_SERVICE_ID=... SENS_SENDER_NUMBER=... SEND_SMS_HOOK_SECRET=...
   ```

   `SEND_SMS_HOOK_SECRET`은 Supabase Auth의 **Send SMS Hook**에서 발급한 같은 signing secret을 사용합니다. Auth Hooks에서 배포된 `send-sms-hook` URL을 선택하고 secret을 설정하세요. Edge Function은 Supabase 서명을 검증한 후 SENS에 인증 문자를 보냅니다. provider 오류는 인증 실패로 처리되며 비밀값은 서버에만 남습니다.

8. 실제 운영자 계정은 먼저 전화번호 인증을 마친 일반 계정으로 만들고, **SQL Editor에서 신뢰할 수 있는 계정만** 운영자로 승격합니다. 아래 전화번호는 DB에 저장된 E.164 형식에 맞춰 바꿉니다.

   ```sql
   update public.profiles
   set role = 'admin', requester_type = null
   where phone = '+821012345678';
   ```

   운영자 계정은 스스로 가입 유형을 선택해 만들 수 없습니다. 이 SQL 실행은 계정 소유자를 확인한 프로젝트 관리자만 해야 합니다.

9. `npm run dev`로 실행합니다. 원격 사용자·데이터가 사용되므로 기존 브라우저 localStorage 테스트 계정은 Supabase 계정으로 자동 이전되지 않습니다. 각 사용자는 새로 가입하고 전화번호를 확인해야 합니다.

## 9. 파일 업로드

재학 증빙 및 봉사 결과·증빙은 `ieum-private` 비공개 bucket에 저장합니다. 현재 허용 형식은 PDF, JPG, PNG, WEBP, MP4이며 파일당 10MB 이하입니다. 증빙은 본인과 운영자만, 완료된 의뢰의 최종 결과 파일은 해당 의뢰자도 제한 시간의 서명 URL로 열 수 있습니다.

## 10. 로컬 개발

`.env.local`에 `VITE_USE_LOCAL_STORAGE=true`를 설정하면 Supabase URL과 키가 있어도 SMS 인증 없이 개발용 브라우저 저장소 모드로 실행됩니다. 시작 화면의 **개발용 운영자 화면** 버튼으로 운영자 화면을 열 수 있습니다. 신규 브라우저 저장소는 테스트 계정·의뢰 없이 빈 상태로 시작합니다. 기존 URL과 키는 삭제할 필요가 없습니다. 이 모드에서 새로 만든 계정·데이터는 현재 브라우저에만 저장되며 원격 Supabase와 공유되지 않고, 학생 증빙 파일 업로드도 진행되지 않습니다. 실사용자 계정이나 공식 봉사 실적이 아닙니다. 원격 Supabase를 다시 사용하려면 이 설정을 삭제하거나 `false`로 바꾸고 개발 서버를 재시작하세요.

대학생은 재학 증빙, 의뢰자 본인과 가족은 주소를 운영자가 승인하기 전까지 검토 상태만 표시하며 모집 목록·요청 기능은 사용할 수 없습니다. 주소 검색은 화면 안에서 도로명 주소 검색 창으로 열립니다. 본인 의뢰의 도움 요청에는 나이대를 묻지 않고, 가족 의뢰에서만 도움받을 어르신의 연령대를 입력합니다. 프로필 설정 화면은 아직 제공하지 않습니다.

```sh
npm install
npm run dev
npm run lint
npm run build
node --test tests/noncontactStore.test.js
```

배포 전 Supabase Security Advisor를 확인하고, 전화번호·주소·증빙 접근 정책, SMS rate limit/CAPTCHA, 인증문자 비용 제한, 관리자 MFA 및 개인정보 보관·삭제 기준을 검토하세요.
