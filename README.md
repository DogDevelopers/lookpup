<div align="center">
  <img src="./public/lookpup_logo.png" alt="봐주개 로고" width="500" />
</div>

<p align="center">
  <strong>믿고 맡기는 우리 동네 펫시터 매칭 플랫폼</strong><br/>
  <sub>2026.07.12 ~ (재구축 진행 중)</sub>
</p>

<div align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</div>

## 📑 목차

- [프로젝트 소개](#-프로젝트-소개)
- [왜 다시 만들었나](#-왜-다시-만들었나)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [주요 라이브러리](#-주요-라이브러리)
- [개발 도구](#-개발-도구)
- [구 버전 대비 개선 사항](#-구-버전-대비-개선-사항)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [환경 변수](#-환경-변수)

## 📝 프로젝트 소개

**봐주개**는 반려동물 보호자와 펫시터를 연결하는 매칭 플랫폼입니다.

보호자는 지역 기반 검색으로 가까운 펫시터를 찾아 예약하고 결제까지 한 번에 진행하며,
펫시터는 프로필과 제공 서비스를 등록해 돌봄 서비스를 제공하고 정산까지 관리합니다.
양측은 실시간 채팅으로 예약 조건을 협의하고, 돌봄이 끝나면 돌봄 기록과 후기가 남습니다.

이 저장소는 부트캠프 파이널 프로젝트로 만든
[구 버전](https://github.com/FRONTENDBOOTCAMP-17th/lookpup)을 **기능 동등성을 유지한 채 처음부터 다시 구축한 버전**입니다.
git 이력이 이어지지 않는 별개 저장소입니다.

## 🤔 왜 다시 만들었나

구 버전은 기간 안에 기능을 완성하는 것이 목표였고, 그 대가로 구조적인 문제가 남았습니다.
재구축의 목적은 새 기능이 아니라 **아래 네 가지를 해소하는 것**이었습니다.

| 문제                                           | 구 버전에서 벌어진 일                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| **데이터 무결성이 애플리케이션 코드에만 의존** | 예약 겹침 검사가 코드에만 있어 생성 경로 일부와 조회-후-INSERT 레이스가 뚫려 있었음 |
| **권한 검증이 실제로는 동작하지 않음**         | 정지 사용자 차단이 `proxy.ts`에만 있어, Server Action 직접 호출은 그대로 통과       |
| **조용히 실패하는 쓰기**                       | RLS에 막힌 UPDATE가 에러 없이 0행으로 끝나 후기 평점이 반영되지 않음                |
| **거대 단일 파일**                             | 채팅 컴포넌트 한 파일이 2,748줄. 결제·서비스 흐름이 얽혀 원인 추적 불가             |

공통점은 **문제가 터진 뒤에야 보인다**는 것입니다.
그래서 재구축의 방향을 "검증을 앞당기고, 마지막 방어선을 DB로 내린다"로 잡았습니다.

- 무결성은 코드가 아니라 **DB 제약**으로 (EXCLUDE 제약, CHECK 제약, 트리거)
- 권한 검증은 라우팅이 아니라 **모든 Server Action 진입부**에서
- 환경 변수 누락은 결제 시점이 아니라 **부팅 시점**에
- status 문자열은 리터럴이 아니라 **DB CHECK와 1:1로 묶인 상수**로

## ✨ 주요 기능

### 보호자

- **소셜 로그인** — 카카오 / 구글 OAuth (Supabase Auth)
- **본인인증** — PortOne 본인인증 채널 연동
- **반려동물 등록·관리** — 사진, 품종, 중성화 여부 등
- **펫시터 검색** — 카카오맵 기반 지역 검색 + 조건 필터 (서비스 종류, 가격, 평점)
- **예약 & 결제** — 예약 요청 → 시터 승인 → PortOne 결제, 추가 요금 정산 지원
- **구인글 작성** — 조건을 올리고 펫시터의 지원을 받는 역방향 매칭
- **후기 작성** — 사진 첨부, 평점 (DB 트리거로 시터 평균 평점 자동 반영)
- **돌봄 기록 조회** — 시터가 남긴 산책·식사·투약 기록 타임라인

### 펫시터

- **펫시터 등록** — 프로필, 제공 서비스, 자격증 업로드, 활동 지역 설정
- **작업 관리** — 예약 수락/거절, 진행 상태 관리, 구인글 지원
- **돌봄 기록 작성** — 돌봄 중 활동을 기록해 보호자에게 공유
- **정산 관리** — 수익 차트, 정산 내역, 계좌 등록

### 공통

- **실시간 채팅** — Supabase Realtime. 채팅창 안에서 예약 협의·수정·결제 요청까지 처리
- **실시간 알림** — 예약·결제·채팅 이벤트 토스트 + 알림 센터, 알림 유형별 수신 설정
- **위치 프라이버시** — 시터 활동 지역을 좌표 그대로 노출하지 않고 좌표 뭉개기(coarsen) 적용

### 관리자

- **신고 관리** — 신고 접수 처리, 사용자 정지(`suspended_until`)
- **펫시터 승인** — 등록 신청 검토 및 승인
- **예약 상태 관리** — 예약 상태 직접 조정

## 🛠 기술 스택

<details>
<summary>펼쳐보기</summary>

| 구분                  | 스택                                                  | 선택 이유                                             |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| **Framework**         | Next.js 16 (App Router), React 19                     | 서버 컴포넌트 기본 + Server Action으로 API 계층 제거  |
| **Language**          | TypeScript 5 (strict)                                 | `any` 금지, DB 타입은 생성 타입에서 파생              |
| **Styling**           | Tailwind CSS 4 (CSS-first `@theme`), shadcn/ui, Radix | 설정 파일 없이 CSS에서 토큰 관리                      |
| **Server State**      | TanStack Query v5                                     | 서버 데이터 단일 소스, queryKey 팩토리 상수화         |
| **Client State**      | Zustand v5                                            | UI 상태 전용 (서버 데이터 미보관)                     |
| **Form / Validation** | React Hook Form + Zod v4                              | 스키마 1개로 클라이언트 UX + 서버 재검증              |
| **Backend / DB**      | Supabase (Postgres, Auth, Realtime, RLS)              | `@supabase/ssr` 기반, 정책은 마이그레이션 파일로 관리 |
| **Payment**           | PortOne (결제 + 본인인증)                             | 검증은 서버에서 PortOne API 재조회                    |
| **Map**               | 카카오맵 (`react-kakao-maps-sdk`)                     | 지역 기반 검색                                        |
| **Image**             | Cloudinary (`next-cloudinary`)                        | 서명 기반 업로드로 키 비노출                          |
| **Deploy**            | Vercel (`icn1` 리전 고정)                             | 국내 사용자 대상 레이턴시                             |

</details>

## 📚 주요 라이브러리

<details>
<summary>펼쳐보기</summary>

| 라이브러리                         | 버전              | 용도                                             |
| ---------------------------------- | ----------------- | ------------------------------------------------ |
| next                               | 16.2.10           | React 프레임워크, 라우팅/렌더링                  |
| react / react-dom                  | 19.2.4            | UI 렌더링                                        |
| typescript                         | ^5                | 정적 타입 검사                                   |
| tailwindcss / @tailwindcss/postcss | ^4                | 스타일링 (CSS-first 설정)                        |
| tw-animate-css                     | ^1.4.0            | Tailwind 애니메이션 유틸리티                     |
| shadcn                             | ^4.13.0           | Radix 기반 UI 컴포넌트 세트                      |
| @radix-ui/react-label, react-slot  | ^2.1.11 / ^1.3.0  | 헤드리스 UI 프리미티브 (필요한 것만 개별 설치)   |
| @base-ui/react                     | ^1.6.0            | 일부 인터랙션 컴포넌트                           |
| class-variance-authority           | ^0.7.1            | 컴포넌트 variant 스타일 관리                     |
| clsx / tailwind-merge              | ^2.1.1 / ^3.6.0   | 클래스명 조건부 결합 및 중복 제거                |
| lucide-react                       | ^1.24.0           | 아이콘                                           |
| next-themes                        | ^0.4.6            | 테마 처리                                        |
| @supabase/supabase-js              | ^2.110.2          | Supabase 클라이언트 (DB, Auth, Realtime)         |
| @supabase/ssr                      | ^0.12.0           | SSR 환경 세션 처리 (`auth-helpers` 미사용)       |
| @tanstack/react-query              | ^5.101.2          | 서버 상태 관리 및 데이터 패칭                    |
| @tanstack/react-query-devtools     | ^5.101.2          | 쿼리 캐시 디버깅                                 |
| zustand                            | ^5.0.14           | 클라이언트 전역 UI 상태                          |
| react-hook-form                    | ^7.81.0           | 폼 상태 관리                                     |
| @hookform/resolvers                | ^5.4.0            | RHF ↔ zod 연동                                   |
| zod                                | ^4.4.3            | 스키마 기반 검증 (환경 변수·외부 응답 파싱 포함) |
| react-day-picker                   | ^9.14.0           | 예약 날짜 선택 UI                                |
| date-fns                           | ^4.4.0            | 날짜 포맷/연산                                   |
| @portone/browser-sdk               | ^0.1.9            | 결제 / 본인인증                                  |
| react-kakao-maps-sdk               | ^1.2.1            | 카카오맵 (수동 스크립트 주입 대체)               |
| cloudinary / next-cloudinary       | ^2.10.0 / ^6.17.5 | 서명 기반 이미지 업로드                          |
| recharts                           | ^3.8.0            | 정산/통계 차트                                   |
| sonner                             | ^2.0.7            | 토스트 알림 (`alert()` 미사용)                   |
| eslint / eslint-config-next        | ^9 / 16.2.10      | 코드 린팅                                        |

</details>

## 🧰 개발 도구

<details>
<summary>펼쳐보기</summary>

| 도구                            | 용도                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Supabase CLI + 마이그레이션** | RLS 정책·제약·트리거를 SQL 파일로 버전 관리 (16개 마이그레이션)                                                    |
| **Supabase MCP**                | 스키마 조회, 마이그레이션 적용, RLS 정책 확인. 컬럼명 추측 없이 실제 스키마 기준으로 코드 작성                     |
| **Vercel MCP**                  | 배포 상태·빌드 로그·환경 변수 확인                                                                                 |
| **Claude Code + `CLAUDE.md`**   | 프로젝트 규칙(폴더 구조, 금지 목록, 보안 체크리스트)을 하네스로 고정                                               |
| **`review/`, `docs/`**          | 리팩토링·성능·보안·트러블슈팅 조사 기록을 마크다운으로 남겨 근거 추적 (둘 다 `.gitignore`에 등록된 로컬 전용 기록) |
| **GitHub PR 템플릿**            | `.github/PULL_REQUEST_TEMPLATE.md`                                                                                 |
| **ESLint + `tsc --noEmit`**     | 커밋 전 통과 기준                                                                                                  |

</details>

## 🚀 구 버전 대비 개선 사항

<details>
<summary>펼쳐보기</summary>

> 별개 저장소라 diff가 아닌 **파일·패턴 전수 조사**로 비교했습니다. 근거 기록은 로컬 조사 문서(`review/`, `docs/` — 둘 다 `.gitignore` 대상)로 남겼습니다.

### 1. 예약 이중 부킹을 DB 제약으로 차단

구 버전은 애플리케이션 코드의 겹침 검사에만 의존했고, 세 경로가 뚫려 있었습니다.

1. 예약 생성 경로가 둘(예약 요청 / 구인글 지원)인데 후자에 겹침 검사가 없음
2. 관리자의 `canceled → accepted` 되돌리기는 검사를 거치지 않음
3. **조회-후-INSERT 사이의 레이스는 애플리케이션 코드로 막을 수 없음**

3번은 구조적으로 코드로 봉쇄가 불가능하므로 제약으로 옮겼습니다.

```sql
alter table public.reservations
  add constraint excl_reservations_sitter_period
  exclude using gist (
    sitter_id with =,
    tstzrange(start_datetime, end_datetime) with &&
  )
  where (status <> 'canceled' and start_datetime is not null and end_datetime is not null);
```

위반은 `lib/db-errors.ts`의 `isOverlapViolation`(SQLSTATE `23P01`)으로 판정합니다.
같은 마이그레이션에서 `chk_reservations_period`(`end > start`)도 추가했습니다.

### 2. 조용히 실패하던 UPDATE — 후기 평점 미반영 버그

후기를 등록해도 `sitters.rating`이 갱신되지 않던 문제입니다.
서버 액션이 **보호자 세션**으로 `sitters.update`를 호출했는데
`sitters_update_own` RLS(`auth.uid() = user_id`)에 막혀 **에러 없이 0행 업데이트**로 끝나고 있었습니다.

재계산을 `SECURITY DEFINER` 트리거로 옮겨, DB가 직접 평균을 다시 계산합니다.

```sql
create trigger reviews_recalc_sitter_rating
after insert or update or delete on reviews
for each row execute function recalc_sitter_rating();
```

### 3. 정지 사용자 차단이 실제로 작동하게 됨 🔴 보안

|           | 구 버전                                           | 현재                                        |
| --------- | ------------------------------------------------- | ------------------------------------------- |
| 검사 지점 | `proxy.ts`, `app/actions/admin.ts` — **2개 파일** | Server Action **20개 파일 / 74곳**          |
| 공통 함수 | 없음 (`getAuthUser()`는 인증만 확인)              | `lib/auth-guard.ts`의 `requireActiveUser()` |

구 버전은 `proxy.ts`에서 **페이지 이동만** 막았습니다.
Server Action 호출은 프록시를 거치지 않으므로, 정지된 사용자가 액션을 직접 호출하면 그대로 통과했습니다.

현재는 인증 + 정지 검사를 한 함수로 묶어 모든 쓰기 액션 진입부에서 수행합니다.
모든 Server Action은 **① `getUser()` 인증 → ② 리소스 소유권 확인 → ③ 실행** 순서를 지킵니다.

### 4. 환경 변수 검증 시점을 런타임 → 부팅 시점으로

|              | 구 버전                                    | 현재                      |
| ------------ | ------------------------------------------ | ------------------------- |
| 접근 방식    | `process.env.PORTONE_API_SECRET` 직접 참조 | `lib/env.ts`에서 zod 파싱 |
| 누락 시      | **결제 시도 시점**에 실패                  | **부팅 시점**에 실패      |
| 서버 키 격리 | 없음                                       | `getServerEnv()`로 분리   |

`clientEnv`는 모듈 로드 시 즉시 `parse`, 서버 키는 호출 시점 `getServerEnv()`로 분리해
클라이언트 번들에 섞이지 않도록 했습니다.

### 5. status 문자열 상수화

`reservations`, `payments`, `applications`, `requests`, `extra_charges`, `reports`, `sitters`에
status CHECK 제약이 걸려 있어 **리터럴 오타가 곧 프로덕션 INSERT/UPDATE 실패**입니다.
구 버전은 각 파일에서 문자열 리터럴을 직접 썼습니다.

현재는 `lib/constants.ts`에 `as const`로 정의하고 zod 스키마도 여기서 파생시킵니다.

### 6. API Route 전면 제거 — 부수 효과로 캐시 갱신 누락 해소

|                               | 구 버전 | 현재    |
| ----------------------------- | ------- | ------- |
| `app/api/**/route.ts`         | 21개    | **0개** |
| 클라이언트 `fetch(` 사용 파일 | 34      | **4**   |
| `revalidatePath`              | **0곳** | 8곳     |

단순 이관이 아닙니다. 구 버전에는 `revalidatePath`가 **한 곳도 없어서**
mutation 후 서버 캐시가 갱신되지 않았고, 이것이 stale 데이터 문제의 원인이었습니다.

### 7. 채팅 모듈 복잡도 절반 감소

| 파일                  | 구 버전                       | 현재                                                                            |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `chat_components.tsx` | **2,748줄** (단일 파일)       | 해체 → `cards/service-cards.tsx`, `cards/reservation-cards.tsx`, 모달 개별 파일 |
| `ChatClient.tsx`      | 1,984줄                       | **920줄**                                                                       |
| 채팅 서버 액션        | `app/actions/chat.ts` 1,205줄 | `features/chat/actions/` 7개 파일                                               |
| 훅                    | `hooks/chat/` 3개             | `features/chat/hooks/` 9개                                                      |

`use-payment-flow` / `use-service-flow` / `use-reservation-edit` / `use-approval-actions`로 흐름이 분리돼
결제·서비스 완료 경로를 독립적으로 추적할 수 있게 됐습니다.

분리 과정에서 캐시·realtime 관련 버그 세 건도 함께 발견해 수정했습니다.

- **시터 쪽 채팅방 realtime 갱신 누락**: `chat_rooms` UPDATE 구독이 `owner_id` 필터만 있고 `sitter_id` 필터가 없어, 예약을 수락한 시터 화면에는 방 타입 변경(`request` → `direct`)이 반영되지 않고 페이지를 이탈했다 재진입해야만 보였습니다.
- **채팅 딥링크 레이스 컨디션**: 알림·버튼 클릭으로 특정 방(`roomId`)에 진입할 때 방 자동 선택 로직이 비동기로 로드되는 `userId`에 의존해, 데이터가 이미 도착했는데도 화면 전환이 안 되는 경우가 있었습니다.
- **지원자 승낙 흐름의 캐시 무효화 누락**: 예약 요청 승낙(`handleAcceptConfirm`)에는 성공 후 `refresh()`가 있었지만, 구인글 지원자 승낙(`handleConfirmApplicant`)에는 빠져 있어 결제 진입 시 "예약 정보를 찾을 수 없습니다" 오류가 간헐적으로 발생했습니다.

### 8. 익명 사용자의 게시글 상세 조회 실패 수정

`supabase/migrations/20260806_grant_is_admin_execute_to_anon.sql`

관리자 정책을 추가하면서 `anon`의 `is_admin()` 실행 권한을 회수한 것이 원인이었습니다.
`sitters`처럼 관리자 정책이 걸린 테이블을 익명으로 조회하면
정책 평가 중 `42501 permission denied for function is_admin`으로 **쿼리 전체가 실패**합니다.
`sitters`의 나머지 정책(`status = 'approved'`)은 상수가 아니라 단축 평가되지 않습니다.

비로그인 상태에서 `/board/[id]`가 `applications → sitters` 조인 때문에
항상 "게시글을 찾을 수 없습니다"로 표시됐고, 크롤러도 같은 화면을 받고 있었습니다.
`is_admin()`은 `SECURITY DEFINER`라 익명 세션에서는 `auth.uid()`가 null이라 항상 false를
반환하므로, 실행 권한을 줘도 노출되는 정보는 없습니다.

### 9. 소프트 삭제(`deleted_at`) 정합성

`deleted_at`을 가진 테이블은 `pets`, `services`, `users` 셋입니다.
외부에 사용자 정보를 노출하는 경로는 전부 `SECURITY DEFINER` RPC를 거치고
**5개 RPC 모두 `u.deleted_at is null`을 겁니다** — RLS가 아니라 RPC가 방어선입니다.

`services`에 구멍이 하나 있어 함께 막았습니다.

|                    | 수정 전                                       | 수정 후                        |
| ------------------ | --------------------------------------------- | ------------------------------ |
| 서비스 소프트 삭제 | `deleted_at`만 세팅 (`is_active`는 true 유지) | `is_active: false`도 함께      |
| 예약 생성 검증     | `is_active`만 확인                            | `.is("deleted_at", null)` 추가 |

`services_select_public` RLS가 `is_active = true` 하나뿐이라 삭제된 서비스가 계속 읽혔고,
`createReservation`은 클라이언트가 보낸 `service_id`를 `is_active`로만 검사했습니다.
예약 UI는 `getSitterBookingInfo`가 걸러주지만, 삭제 직전에 열어둔 페이지나 조작된 요청은
그대로 통과해 **삭제된 서비스로 예약이 생성**될 수 있었습니다.

`pets`는 `verifyPetOwnership()`이 예약 생성 전에 `deleted_at`을 확인하고,
세 테이블 모두 실제 `DELETE`를 쓰는 코드는 없습니다.

### 10. RLS 정책이 파일로 관리됨

구 버전 `supabase/`에는 `.temp/linked-project.json`만 있었습니다.
정책이 대시보드에만 존재해 **리뷰도 롤백도 불가능**했습니다.

현재는 마이그레이션 **16개**로 다음이 파일에 남습니다.

- `pets` RLS + `neutered` 컬럼 / 예약 흐름 RLS / 시터 서비스 RLS / `requests` RLS
- `users` INSERT 정책 + 전화번호 unique / 관리자 RLS 정책
- `reports` INSERT 정책 + 사용자 검색 RPC / `notifications` UPDATE 정책
- `reviews` INSERT·DELETE 정책 / `public_user_profiles`에 `created_at`·`is_verified` 추가

### 11. 구조 재편

| 항목          | 구 버전                                     | 현재                                        |
| ------------- | ------------------------------------------- | ------------------------------------------- |
| 코드 배치     | `app/actions/` 20개 파일 + 타입별 폴더 분산 | `features/<도메인>/` 콜로케이션             |
| 라우트 그룹   | 없음                                        | `(main)` / `(no-footer)` / `auth` / `admin` |
| queryKey      | 인라인 문자열                               | `lib/query-keys.ts` 팩토리                  |
| Radix         | `radix-ui` 통짜 의존                        | `react-label` / `react-slot`만 설치         |
| 이미지 업로드 | 직접 처리                                   | Cloudinary 서명 기반 업로드                 |
| 카카오맵      | 수동 스크립트 주입                          | `react-kakao-maps-sdk`                      |
| 배포 리전     | 기본값                                      | `vercel.json`에 `icn1` 고정                 |

**신규 화면**: 관리자 페이지, 정지 사용자 안내, 시터 작업 이력(`myprofile/works`),
게시글 조회수, 정산 화면 세분화, 케어 기록 타임라인, 탈퇴 복구(`auth/restore`)

### 12. 렌더링 / Core Web Vitals

| 항목                        | 구 버전 | 현재              |
| --------------------------- | ------- | ----------------- |
| `<img>` 태그 사용 파일      | 5       | **0**             |
| `next/image` 사용 파일      | 11      | **30**            |
| `'use client'` **page.tsx** | 5       | **0** (전체 35개) |

페이지 진입점 35개가 전부 서버 컴포넌트라 크롤러가 완성된 HTML을 받습니다.
`<img>` 제거로 LCP·CLS도 개선됐습니다.

### 13. 메타데이터 / SEO

| 항목                       | 구 버전    | 현재                                |
| -------------------------- | ---------- | ----------------------------------- |
| 페이지별 metadata          | 0 (루트만) | **35개 전 페이지**                  |
| `generateMetadata`         | 0          | 2 (`board/[id]`, `petsitters/[id]`) |
| `title.template`           | ❌         | `%s \| 봐주개`                      |
| `openGraph` / canonical    | ❌         | 공개 페이지 전체                    |
| `robots.ts` / `sitemap.ts` | ❌         | ✅                                  |

공통 로직은 `lib/metadata.ts`의 `publicPage()` / `privatePage()` 두 헬퍼로 묶었습니다.
상세 페이지는 `generateMetadata`와 page가 같은 데이터를 각각 조회하므로
`getRequestDetail` / `getSitterDetail`을 React `cache()`로 감싸 **요청당 1회만 조회**합니다.

**시터 상세는 의도적으로 `noindex`입니다.** 색인하면 시터의 실명·프로필 사진·활동 지역이
검색 결과에 노출되는데, 이는 `LocationConsentModal`·`lib/geo.ts`로 위치를 신중히 다루는
서비스 성격과 상충합니다. 시터 동의 절차를 갖추기 전까지 유지합니다.
같은 이유로 `robots.txt`에서는 `/petsitters/*` 크롤을 **막지 않습니다** —
크롤을 막으면 페이지의 `noindex`를 읽지 못해 외부 링크만으로 URL이 색인될 수 있습니다.

</details>

## 📂 프로젝트 구조

<details>
<summary>펼쳐보기</summary>

```
src/
├── app/                       # 라우팅 전용 — page.tsx는 feature 조립만
│   ├── (main)/                # 헤더+푸터 레이아웃
│   │   ├── about/  board/  myprofile/  notifications/
│   │   ├── pet-register/  petsitters/  sitter-register/
│   │   └── privacy/  terms/
│   ├── (no-footer)/           # 채팅·지도 등 전체 화면
│   │   ├── chat/
│   │   └── petsitters/
│   ├── admin/                 # 관리자 (reports, state)
│   ├── auth/                  # login, callback, verification, restore
│   ├── suspended/             # 정지 계정 안내
│   ├── fonts/                 # Pretendard (local font)
│   └── layout.tsx
├── features/                  # 도메인별 콜로케이션
│   └── <domain>/              # components / actions.ts / queries.ts / schema.ts / types.ts
│       ├── about/  admin/  applications/  auth/  board/
│       ├── care-records/  chat/  earnings/  home/  legal/
│       ├── myprofile/  notifications/  payments/  pet-register/
│       ├── petsitters/  report/  reservations/  reviews/
│       └── sitter-register/
├── components/
│   ├── ui/                    # shadcn 생성물
│   ├── common/                # 2개 이상 도메인에서 쓰는 조합 컴포넌트
│   └── layout/                # Header / Footer / NavLink
├── lib/
│   ├── supabase/              # client.ts / server.ts / middleware.ts
│   ├── auth-guard.ts          # requireActiveUser()
│   ├── constants.ts           # status 상수 (DB CHECK와 1:1)
│   ├── env.ts                 # zod 기반 환경 변수 검증
│   ├── query-keys.ts          # queryKey 팩토리
│   ├── db-errors.ts           # SQLSTATE 판정 (겹침 제약 등)
│   ├── geo.ts, distance.ts, kakao-geocode.ts, map-marker.ts
│   └── cloudinary*.ts, notifications.ts, utils.ts
├── stores/                    # zustand (booking, auth)
├── hooks/                     # 전역 훅 (use-portone, use-realtime-channel)
├── types/                     # database.types.ts (supabase gen types)
└── proxy.ts                   # Next.js 16+ (구 middleware.ts)

supabase/migrations/           # RLS 정책 · 제약 · 트리거 (16개)
review/                        # 리팩토링·성능·보안 검토 기록
```

**import 방향**: `app → features → components/lib/stores` (역방향·feature 간 직접 import 금지)

</details>

## 🏁 시작하기

<details>
<summary>펼쳐보기</summary>

```bash
# 1. 저장소 클론
git clone https://github.com/Gyu-me/lookpup.git
cd lookpup

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.local.example .env.local   # 값 채우기

# 4. 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

```bash
npm run build   # 프로덕션 빌드
npm run lint    # ESLint
npx tsc --noEmit  # 타입 검사
```

</details>

## 🔑 환경 변수

<details>
<summary>펼쳐보기</summary>

`.env.local.example`을 복사해 채웁니다. `lib/env.ts`가 **부팅 시점에 zod로 검증**하므로,
누락된 값이 있으면 런타임이 아니라 빌드/기동 단계에서 실패합니다.

```env
# 클라이언트 노출 (NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_KAKAO_MAP_KEY=
NEXT_PUBLIC_PORTONE_STORE_ID=
NEXT_PUBLIC_PORTONE_PAY_CHANNEL_KEY=
# PortOne 콘솔의 본인인증 채널 키 (결제 채널 키와 다름)
NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# 서버 전용 — 절대 NEXT_PUBLIC_ 접두사를 붙이지 않는다
SUPABASE_SERVICE_ROLE_KEY=
PORTONE_API_SECRET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

</details>
