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

반려동물을 맡길 곳을 찾는 일은 생각보다 까다롭습니다. 낯선 사람에게 가족을 맡기는 일이기 때문입니다.

**봐주개**는 그 불안을 줄이기 위해 만든 펫시터 매칭 플랫폼입니다.
보호자는 동네 시터를 지도에서 찾아 예약과 결제를 한 번에 진행하고,
시터는 프로필과 서비스를 등록해 일감을 받고 정산까지 관리합니다.
양측의 조율은 실시간 채팅으로 이루어지며, 돌봄이 끝나면 기록과 후기가 남습니다.

이 저장소는 부트캠프 파이널 프로젝트였던
[구 버전](https://github.com/FRONTENDBOOTCAMP-17th/lookpup)을
**기능은 그대로 유지한 채 처음부터 다시 구축한** 결과물입니다. git 이력이 이어지지 않는 별개 저장소입니다.

## 🤔 왜 다시 만들었나

잘 동작하던 프로젝트를 다시 만든 이유는 구조적 문제 때문입니다.

구 버전은 마감 안에 기능을 완성하는 것이 목표였고, 그 목표는 달성했지만 대신 다음과 같은 문제가 남았습니다.
새 기능을 추가하기 위해서가 아니라, **아래 네 가지 문제를 해소하기 위해** 다시 만들었습니다.

| 문제                                           | 구 버전에서 벌어진 일                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| **데이터 무결성이 애플리케이션 코드에만 의존** | 예약 겹침 검사가 코드에만 있어 생성 경로 일부와 조회-후-INSERT 레이스가 뚫려 있었음 |
| **권한 검증이 실제로는 동작하지 않음**         | 정지 사용자 차단이 `proxy.ts`에만 있어, Server Action 직접 호출은 그대로 통과       |
| **조용히 실패하는 쓰기**                       | RLS에 막힌 UPDATE가 에러 없이 0행으로 끝나 후기 평점이 반영되지 않음                |
| **거대 단일 파일**                             | 채팅 컴포넌트 한 파일이 2,748줄. 결제·서비스 흐름이 얽혀 원인 추적 불가             |

네 가지 문제의 공통점은 **문제가 발생한 뒤에야 드러난다**는 것입니다.
로그에 남지 않고, 테스트에도 잘 걸리지 않으며, 결국 사용자 제보로 발견되는 종류의 결함입니다.

그래서 재구축의 방향을 다음과 같이 잡았습니다 — **검증 시점을 최대한 앞당기고, 마지막 방어선은 DB에 둔다.**

- 무결성은 코드가 아니라 DB 제약으로 (EXCLUDE, CHECK, 트리거)
- 권한 검증은 라우팅이 아니라 모든 Server Action 진입부에서
- 환경 변수 누락은 결제할 때가 아니라 부팅할 때 터지도록
- status 문자열은 리터럴 대신 DB CHECK와 1:1로 묶인 상수로

## ✨ 주요 기능

### 보호자

- **소셜 로그인** — 카카오 / 구글 OAuth (Supabase Auth)
- **본인인증** — PortOne 본인인증 채널 연동
- **반려동물 등록·관리** — 사진, 품종, 중성화 여부 등
- **펫시터 검색** — 카카오맵 기반 지역 검색 및 서비스 종류·가격·평점 필터
- **예약 & 결제** — 예약 요청 → 시터 승인 → PortOne 결제, 추가 요금 정산까지 지원
- **구인글 작성** — 조건을 올려두고 시터의 지원을 받는 역방향 매칭
- **후기 작성** — 사진 첨부, 평점. 시터 평균 평점은 DB 트리거가 자동으로 재계산
- **돌봄 기록 조회** — 시터가 남긴 산책·식사·투약 기록을 타임라인으로 확인

### 펫시터

- **펫시터 등록** — 프로필, 제공 서비스, 자격증 업로드, 활동 지역 설정
- **작업 관리** — 예약 수락/거절, 진행 상태 관리, 구인글 지원
- **돌봄 기록 작성** — 돌봄 중 활동을 기록해 보호자에게 공유
- **정산 관리** — 수익 차트, 정산 내역, 계좌 등록

### 공통

- **실시간 채팅** — Supabase Realtime 기반. 채팅창 안에서 예약 협의·수정·결제 요청까지 처리
- **실시간 알림** — 예약·결제·채팅 이벤트 토스트와 알림 센터, 알림 유형별 수신 설정
- **위치 프라이버시** — 시터의 활동 지역을 좌표 그대로 노출하지 않고 좌표를 뭉개어(coarsen) 표시

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

> 별개 저장소라 diff를 뜰 수 없어 **파일과 패턴을 전수 조사**하는 방식으로 비교했습니다.
> 근거는 로컬 조사 문서(`review/`, `docs/` — 둘 다 `.gitignore` 대상)에 남겨두었습니다.

### 1. 이중 부킹을 DB 제약으로 차단

구 버전은 겹침 검사를 애플리케이션 코드에만 두었고, 그 결과 세 경로가 뚫려 있었습니다.

1. 예약 생성 경로가 둘(예약 요청 / 구인글 지원)인데, 후자에는 검사가 아예 없었습니다
2. 관리자가 `canceled → accepted`로 되돌리는 경로는 검사를 거치지 않습니다
3. **조회 후 INSERT 사이의 레이스 컨디션은 애플리케이션 코드로 막을 수 없습니다**

특히 3번은 구조적으로 코드 레벨에서 봉쇄가 불가능하므로 DB 제약으로 옮겼습니다.

```sql
alter table public.reservations
  add constraint excl_reservations_sitter_period
  exclude using gist (
    sitter_id with =,
    tstzrange(start_datetime, end_datetime) with &&
  )
  where (status <> 'canceled' and start_datetime is not null and end_datetime is not null);
```

위반은 `lib/db-errors.ts`의 `isOverlapViolation`(SQLSTATE `23P01`)으로 판정해 사용자에게 안내합니다.
같은 마이그레이션에 `chk_reservations_period`(`end > start`)도 추가했습니다.

### 2. 조용히 실패하던 UPDATE — 후기 평점 미반영 버그

후기를 등록해도 `sitters.rating`이 갱신되지 않던 문제입니다. 원인은 권한이었습니다.

서버 액션이 **보호자 세션**으로 `sitters.update`를 호출했는데, `sitters_update_own` RLS(`auth.uid() = user_id`)에
막혀 있었습니다. 문제는 이 과정에서 **에러가 발생하지 않는다**는 점입니다.
에러 없이 0행 업데이트로 끝나기 때문에, 이런 유형의 버그는 발견까지 오래 걸립니다.

재계산 로직을 `SECURITY DEFINER` 트리거로 옮겨, DB가 직접 평균을 다시 계산하도록 했습니다.

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

구 버전은 `proxy.ts`에서 **페이지 이동만** 차단하고 있었습니다.
Server Action 호출은 프록시를 거치지 않으므로, 정지된 사용자가 액션을 직접 호출하면 그대로 통과되었습니다.

현재는 인증과 정지 검사를 한 함수로 묶어 모든 쓰기 액션 진입부에서 수행합니다.
순서 또한 고정되어 있습니다 — **① `getUser()` 인증 → ② 리소스 소유권 확인 → ③ 실행.**

### 4. 환경 변수 검증 시점을 런타임에서 부팅 시점으로

|              | 구 버전                                    | 현재                      |
| ------------ | ------------------------------------------ | ------------------------- |
| 접근 방식    | `process.env.PORTONE_API_SECRET` 직접 참조 | `lib/env.ts`에서 zod 파싱 |
| 누락 시      | **결제 시도 시점**에 실패                  | **부팅 시점**에 실패      |
| 서버 키 격리 | 없음                                       | `getServerEnv()`로 분리   |

환경 변수 하나가 누락되었을 때 사용자가 결제를 시도한 뒤에야 발견하는 것과 배포 단계에서 즉시 발견하는 것은
안정성 측면에서 차이가 큽니다. `clientEnv`는 모듈 로드 시점에 바로 `parse`하고,
서버 키는 `getServerEnv()`로 분리해 클라이언트 번들에 섞이지 않도록 했습니다.

### 5. status 문자열 상수화

`reservations`, `payments`, `applications`, `requests`, `extra_charges`, `reports`, `sitters`에
status CHECK 제약이 걸려 있어 **리터럴 오타가 곧 프로덕션 INSERT 실패**로 이어집니다.
구 버전은 각 파일에서 문자열 리터럴을 직접 사용했습니다.

현재는 `lib/constants.ts`에 `as const`로 정의하고, zod 스키마도 여기서 파생시킵니다.

### 6. API Route 전면 제거 — 부수 효과로 캐시 갱신 누락 해소

|                               | 구 버전 | 현재    |
| ----------------------------- | ------- | ------- |
| `app/api/**/route.ts`         | 21개    | **0개** |
| 클라이언트 `fetch(` 사용 파일 | 34      | **4**   |
| `revalidatePath`              | **0곳** | 8곳     |

단순 이관이 아닙니다. 구 버전에는 `revalidatePath`가 **한 곳도 없어서**
mutation 후 서버 캐시가 갱신되지 않았고, 이는 오래 지속된 stale 데이터 문제의 원인이었습니다.

### 7. 채팅 모듈 복잡도 절반 감소

| 파일                  | 구 버전                       | 현재                                                                            |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `chat_components.tsx` | **2,748줄** (단일 파일)       | 해체 → `cards/service-cards.tsx`, `cards/reservation-cards.tsx`, 모달 개별 파일 |
| `ChatClient.tsx`      | 1,984줄                       | **920줄**                                                                       |
| 채팅 서버 액션        | `app/actions/chat.ts` 1,205줄 | `features/chat/actions/` 7개 파일                                               |
| 훅                    | `hooks/chat/` 3개             | `features/chat/hooks/` 9개                                                      |

`use-payment-flow` / `use-service-flow` / `use-reservation-edit` / `use-approval-actions`로 흐름을 분리해,
결제 관련 문제가 발생했을 때 결제 훅만 확인하면 되도록 했습니다. 이전에는 2,748줄 전체를 뒤져야 했습니다.

분리 과정에서 캐시·realtime 관련 버그 세 건도 함께 발견해 수정했습니다. 한 파일에 뭉쳐 있을 때는 드러나지 않던 문제들입니다.

- **시터 쪽 채팅방 realtime 갱신 누락**: `chat_rooms` UPDATE 구독이 `owner_id` 필터만 있고 `sitter_id` 필터가 없어, 예약을 수락한 시터 화면에는 방 타입 변경(`request` → `direct`)이 반영되지 않고 페이지를 이탈했다 재진입해야만 보였습니다.
- **채팅 딥링크 레이스 컨디션**: 알림·버튼 클릭으로 특정 방(`roomId`)에 진입할 때 방 자동 선택 로직이 비동기로 로드되는 `userId`에 의존해, 데이터가 이미 도착했는데도 화면 전환이 안 되는 경우가 있었습니다.
- **지원자 승낙 흐름의 캐시 무효화 누락**: 예약 요청 승낙(`handleAcceptConfirm`)에는 성공 후 `refresh()`가 있었지만, 구인글 지원자 승낙(`handleConfirmApplicant`)에는 빠져 있어 결제 진입 시 "예약 정보를 찾을 수 없습니다" 오류가 간헐적으로 발생했습니다.

### 8. 익명 사용자의 게시글 상세 조회 실패 수정

`supabase/migrations/20260806_grant_is_admin_execute_to_anon.sql`

관리자 정책을 추가하면서 익명(`anon`)의 `is_admin()` 실행 권한을 회수한 것이 원인이었습니다.
`sitters`처럼 관리자 정책이 걸린 테이블을 익명으로 조회하면, 정책 평가 중
`42501 permission denied for function is_admin`으로 **쿼리 전체가 실패**합니다.
나머지 정책(`status = 'approved'`)은 상수가 아니므로 단축 평가되지 않습니다.

이로 인해 비로그인 상태에서 `/board/[id]`가 `applications → sitters` 조인 때문에
항상 "게시글을 찾을 수 없습니다"로 표시되었고, 크롤러도 동일한 화면을 받고 있었습니다.
`is_admin()`은 `SECURITY DEFINER`이지만 익명 세션에서는 `auth.uid()`가 null이라 항상 false를
반환하므로, 실행 권한을 부여해도 노출되는 정보는 없습니다.

### 9. 소프트 삭제(`deleted_at`) 정합성

`deleted_at`을 가진 테이블은 `pets`, `services`, `users` 셋입니다.
외부에 사용자 정보를 노출하는 경로는 전부 `SECURITY DEFINER` RPC를 거치며,
**5개 RPC 모두 `u.deleted_at is null`을 겁니다** — RLS가 아니라 RPC가 방어선인 구조입니다.

`services`에 구멍이 하나 있어 함께 막았습니다.

|                    | 수정 전                                       | 수정 후                        |
| ------------------ | --------------------------------------------- | ------------------------------ |
| 서비스 소프트 삭제 | `deleted_at`만 세팅 (`is_active`는 true 유지) | `is_active: false`도 함께      |
| 예약 생성 검증     | `is_active`만 확인                            | `.is("deleted_at", null)` 추가 |

`services_select_public` RLS가 `is_active = true` 하나만 확인하므로 삭제된 서비스가 계속 조회되었고,
`createReservation`도 클라이언트가 보낸 `service_id`를 `is_active`로만 검사했습니다.
예약 화면은 `getSitterBookingInfo`가 걸러주지만, 삭제 직전에 열어둔 페이지나 조작된 요청은
그대로 통과해 **삭제된 서비스로 예약이 생성**될 수 있었습니다.

`pets`는 `verifyPetOwnership()`이 예약 생성 전에 `deleted_at`을 확인하고,
세 테이블 모두 실제 `DELETE`를 쓰는 코드는 없습니다.

### 10. RLS 정책이 파일로 관리됨

구 버전 `supabase/`에는 `.temp/linked-project.json`만 있었습니다.
정책이 대시보드에만 존재해 **리뷰도 롤백도 불가능**했고,
누가 언제 무엇을 변경했는지 추적할 방법이 없었습니다.

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
`<img>` 제거로 LCP·CLS도 개선되었습니다.

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
cp .env.example .env   # 값 채우기

# 4. 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

```bash
npm run build   # 프로덕션 빌드
npm run lint    # ESLint
npx tsc --noEmit  # 타입 검사
```

</details>

## 🔑 환경 변수

<details>
<summary>펼쳐보기</summary>

`.env.example`을 `.env`로 복사해 채웁니다.
`lib/env.ts`가 **부팅 시점에 zod로 검증**하므로, 누락된 값이 있으면 런타임이 아니라
빌드/기동 단계에서 실패합니다.

```env
# 브라우저에 노출됨 (NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_KAKAO_MAP_KEY=
NEXT_PUBLIC_PORTONE_STORE_ID=
NEXT_PUBLIC_PORTONE_PAY_CHANNEL_KEY=
# PortOne 콘솔의 본인인증 채널 키 (결제 채널 키와 다름)
NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY=
NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY_TOSS=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# 선택 — metadataBase / sitemap 의 기준 URL
NEXT_PUBLIC_SITE_URL=

# 서버 전용 — 여기엔 절대 NEXT_PUBLIC_ 을 붙이지 않습니다
SUPABASE_SERVICE_ROLE_KEY=
PORTONE_API_SECRET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

카카오·구글 소셜 로그인 키는 여기가 아니라 **Supabase 대시보드**(Authentication > Providers)에
등록합니다. 앱 코드에서 직접 읽지 않아 `.env`에 넣을 필요가 없습니다.

</details>
