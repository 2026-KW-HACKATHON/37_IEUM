# 이음 (IEUM)

어르신과 가족의 생활 도움 요청을 대학생 비대면 봉사활동으로 연결하는 웹 서비스입니다.

## 서비스 흐름

```text
어르신·가족 도움 요청
  → 운영자 검토·승인
  → 봉사활동 등록·모집 시작
  → 대학생 신청·운영자 배정
  → 활동·결과물 제출
  → 운영자 검토·보완 또는 승인
  → 내부 인증·의뢰자 결과 확인
```

### 이용자 기능

- **의뢰자:** 본인 또는 가족 유형으로 가입하고 주소 확인 승인을 받은 뒤 도움 요청, 진행 상황, 인증된 결과물을 확인합니다.
- **대학생:** 가입 후 운영자에게 재학 증빙을 확인받습니다. 검증 승인 뒤 모집 중인 도움에 신청하고, 배정된 활동 안내 확인·결과물·활동일지·증빙 제출을 할 수 있습니다.
- **운영자:** 의뢰 검토와 봉사활동 등록, 모집·신청·배정, 사용자 확인, 제출물 검토, 내부 인증을 관리합니다.

Supabase 모드에서 운영자 화면은 프로필에 운영자 권한이 부여된 계정으로 로그인해야 열립니다. 현재 사용자 화면과 운영자 화면은 같은 웹 앱 주소에서 계정 권한에 따라 표시되며, `/admin` 전용 주소나 별도 운영자 링크는 아직 구현되지 않았습니다. 로컬 모드에서는 개발 편의를 위한 운영자 진입 버튼을 사용할 수 있습니다.

## 현재 제공 범위와 유의사항

- 봉사활동 유형: 생활·디지털 안내, 생활·취미 키트, 말벗·기록.
- 한 의뢰에서 봉사활동 하나를 등록할 수 있고, 활동 정원만큼 여러 대학생을 배정할 수 있습니다.
- 학생 모집 목록에는 운영자가 모집을 시작했고, 활동이 완료·취소되지 않았으며, 정원이 남은 활동이 표시됩니다. 의뢰 승인만으로 목록에 노출되지는 않습니다.
- 활동 시작일이 되면 배정 상태가 `진행 중`으로 표시됩니다. Supabase의 배정 레코드는 학생이 제출할 때 서버 함수에서 시작일을 확인해 상태를 갱신합니다.
- `인증 완료`는 서비스 내부의 결과 검토 기록입니다. 기관의 최종 승인이나 1365 공식 실적 등록을 의미하지 않습니다.
- 관리자 화면의 전 데이터 저장은 Supabase SQL 마이그레이션의 `admin_replace_ieum_state` RPC와 RLS 정책에 의존합니다.

## 기술 구성

- React 19, Vite 8, JavaScript
- Supabase Auth, PostgreSQL, 비공개 Storage, Edge Function
- 주소 검색: Kakao 우편번호 서비스
- 선택 연동: Naver Cloud SENS를 사용하는 Supabase Auth SMS Hook

주요 경로:

```text
src/
├── components/
├── data/                 # 인증, 로컬 저장, Supabase 연동
├── pages/
│   ├── login/
│   ├── student/
│   ├── requester/
│   └── admin/
├── App.jsx
└── main.jsx
supabase/
├── functions/send-sms-hook/
└── migrations/
docs/noncontact-admin-flow.md
```

## 로컬 실행

필요 조건: Node.js와 npm.

```sh
npm install
npm run dev
npm run lint
npm run build
node --test --test-isolation=none tests/noncontactStore.test.js
```

Supabase 미설정 상태에서는 로컬 브라우저 저장소 모드로 실행됩니다. 신규 로컬 저장소는 사용자와 비대면 운영 데이터가 빈 상태로 시작합니다. 데이터는 해당 브라우저에만 저장되고 Supabase와 공유되지 않습니다.

`VITE_USE_LOCAL_STORAGE=true`를 지정하면 Supabase URL과 키가 있어도 로컬 모드가 우선됩니다. 로컬 모드에서는 실제 SMS 확인 및 비공개 파일 업로드를 사용할 수 없습니다.

## Supabase 연결 및 배포 준비

1. Supabase 프로젝트를 만들고 **Project Settings → API**에서 Project URL과 publishable key(구형 프로젝트의 anon key)를 준비합니다.
2. 로컬 개발 시 저장소 루트의 `.env.example`을 참고해 Git에 포함되지 않는 `.env.local`을 만듭니다.

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```

3. Supabase SQL Editor에서 `supabase/migrations/`의 SQL 파일을 파일명 순서대로 실행합니다. 현재 초기 스키마와 활동 시작일 처리 마이그레이션이 포함되어 있습니다.
4. Authentication에서 Phone provider와 OTP 정책을 설정합니다. 실제 문자 발송이 필요하면 Naver Cloud SENS와 Supabase Send SMS Hook을 설정하고 서버 비밀값을 Supabase secrets에 저장합니다. 비밀값을 `VITE_` 환경변수, 브라우저 코드, Git에 넣지 마세요.
5. 사용자용과 운영자용 링크를 분리하는 경로는 아직 구현되지 않았습니다. 현재는 같은 앱 주소에서 로그인 사용자 역할에 따라 화면을 표시합니다.
6. 배포 호스트의 환경변수에 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`를 설정하고 `VITE_USE_LOCAL_STORAGE`는 설정하지 않거나 `false`로 둡니다. 환경변수 변경 후에는 새 빌드가 필요합니다. 호스트의 환경변수는 브라우저 번들에 포함되므로 publishable/anon key만 사용합니다.
7. 먼저 신뢰할 수 있는 전화번호로 일반 계정을 만들고 소유자를 확인한 뒤, Supabase SQL Editor에서 해당 프로필을 운영자로 승격합니다.

   ```sql
   update public.profiles
   set role = 'admin', requester_type = null
   where phone = '+821012345678';
   ```

   위 번호는 실제 운영자 계정의 E.164 전화번호로 바꾸세요. 운영자 권한은 신뢰할 수 있는 계정에만 부여하고, `service_role` key나 데이터베이스 비밀번호는 클라이언트에 노출하지 마세요.

Supabase는 여러 배포 URL에서 공유할 수 있습니다. 사용자용·운영자용 별도 링크가 필요하면 먼저 라우팅과 권한별 진입 화면을 구현해야 하며, 링크를 아는 것만으로 운영자 권한을 주어서는 안 됩니다.

## 파일 및 개인정보

- 업로드는 비공개 `ieum-private` bucket을 사용하며 허용 형식은 PDF, JPG, PNG, WEBP, MP4, 파일당 최대 10MB입니다.
- 파일 접근은 로그인 사용자, 소유자, 운영자 및 정책상 완료된 의뢰자에게 제한됩니다.
- 배포 전 Supabase Security Advisor, RLS, OTP 비용·속도 제한, 운영자 MFA 및 개인정보 보관·삭제 정책을 점검하세요.
- 기관 협약과 공식 연동이 마련되기 전에는 내부 인증 시간을 1365 공식 봉사시간으로 안내하지 마세요.
