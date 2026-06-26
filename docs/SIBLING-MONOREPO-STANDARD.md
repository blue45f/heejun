# 형제 레포 모노레포 아키텍처 표준 (Sibling Monorepo Standard)

> **목적**: `webtoon-index`, `aidigestdesk`, `picky`, `rotifolk` 그리고 이후 모든 형제 레포(웹 + 토스인앱 동시 제공 서비스)의 폴더 구조·레이어·공유 패키지·툴링을 **단일 표준**으로 수렴시킨다.
> **짝 문서**: 토스인앱 개발 패턴은 [`TOSS-MINIAPP-PLAYBOOK.md`](./TOSS-MINIAPP-PLAYBOOK.md) 참조. 이 문서는 "레포 골격", 짝 문서는 "웹/토스 코드 이원화 최소화"를 다룬다.
> **상태**: 표준 정의 + 레포별 마이그레이션 플랜. 실제 리팩터는 레포별 PR로 단계 실행.

---

## 0. 한눈에 보는 현재 상태 (2026-06 실측)

| 항목                      | webtoon-index                      | aidigestdesk                | picky                     | rotifolk                         |
| ------------------------- | ---------------------------------- | --------------------------- | ------------------------- | -------------------------------- |
| 모노레포                  | pnpm ✓                             | pnpm ✓                      | pnpm ✓                    | pnpm ✓                           |
| **웹 앱 위치**            | **레포 루트(`.`)** ⚠️              | `apps/web` ✓                | `apps/web` ✓              | `apps/web` ✓                     |
| 토스 앱                   | `apps/toss`                        | `apps/toss`                 | `apps/toss`               | `apps/toss`                      |
| 백엔드                    | `apps/api` (Nest)                  | 없음(정적)                  | `apps/api` (Nest)         | `apps/api` (Nest)                |
| 공유 패키지               | `core` + `play-core`               | `content`                   | `shared` + `client`       | `shared`                         |
| 공유 철학                 | 토스가 웹 페이지 직접 import(래퍼) | 데이터만 공유, 페이지 중복  | shared(zod)+client(react) | shared(logic)만, react 공유 없음 |
| ORM                       | Drizzle                            | —                           | Drizzle                   | **Prisma** ⚠️                    |
| 검증                      | nestjs-zod                         | —                           | nestjs-zod                | nestjs-zod                       |
| 라우팅(웹)                | React Router 7                     | **수동 pathname** ⚠️        | RR7                       | RR7                              |
| 라우팅(토스)              | RR7                                | 커스텀 router.ts            | **RR6** ⚠️                | 커스텀 router.ts                 |
| 서버 상태                 | ky(쿼리 없음)                      | 정적 import                 | 커스텀 api.ts(쿼리 없음)  | **ky + TanStack Query** ✓        |
| 클라 상태                 | Zustand                            | Context+Zustand             | Zustand 팩토리            | Zustand                          |
| eslint preset             | `@heejun/eslint-config@4`          | `@5`                        | **없음(인라인)** ⚠️       | `@5`                             |
| prettier preset           | 인라인                             | `@heejun/prettier-config@3` | 인라인                    | `@3`                             |
| `tsconfig.base.json`      | 없음                               | ✓                           | 없음                      | 없음                             |
| tailwind                  | v4                                 | v4                          | CSS 수기(72KB)            | v4                               |
| 레이어 boundaries(eslint) | ✓ app/domains/shared/infra         | 부분                        | 없음                      | ✓ app/domains/shared/infra       |

**결론**: 네 레포가 "비슷하지만 다 다르다". 표준 정렬 시 기준은 **rotifolk(데이터 레이어·레이어 경계가 가장 현대적) + picky(shared/client 2단 분리) + aidigestdesk(`@heejun/*` preset + `tsconfig.base`)** 의 장점 합집합.

---

## 1. 표준 폴더 구조 (Canonical Layout)

모든 형제 레포는 다음 골격으로 수렴한다. 백엔드 유무·데이터 소스에 따라 `apps/api`만 조건부.

```
<repo>/
├── apps/
│   ├── web/                 # Vite 8 + React 19 + RR7 + Tailwind v4 + Radix. "얇은 셸"
│   │   └── src/
│   │       ├── app/         # 셸: 레이아웃, 루트 프로바이더, 라우터 와이어링
│   │       ├── pages/       # 라우트별 프레젠테이션(뷰) 컴포넌트 — 로직 없음
│   │       ├── platform/    # PlatformBridge 웹 구현 (navigator.share 등)
│   │       └── styles/      # tailwind.css, tokens.css, global.css
│   ├── toss/                # Vite 6 + React 19 + RR7 + Granite + TDS. "얇은 셸"
│   │   └── src/
│   │       ├── app/         # Granite 셸, TDSMobileAITProvider, 라우터 와이어링
│   │       ├── pages/       # TDS 프레젠테이션(뷰) — 로직 없음
│   │       ├── platform/    # PlatformBridge 토스 구현 (@apps-in-toss/web-framework)
│   │       ├── tds-shim.tsx # 브라우저 프리뷰용 TDS 스텁 (PREVIEW_NO_TDS)
│   │       └── theme.ts
│   └── api/                 # (백엔드 있을 때만) NestJS 11 + Drizzle + Neon + nestjs-zod
│       └── src/
│           ├── modules/     # 도메인별 모듈 (controller/service/dto/module)
│           ├── common/      # guards, pipes, filters
│           ├── db/          # drizzle schema + migrations
│           └── config/
├── packages/
│   ├── shared/              # ❶ 프레임워크 무관 커널 (types · zod · 도메인 로직 · 순수 util)
│   │   └── src/
│   └── client/              # ❷ React 헤드리스 (stores · 데이터 훅 · 뷰모델 · 브리지 IF)
│       └── src/
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json       # 모든 app/package가 extends
├── eslint.config.mjs        # @heejun/eslint-config (flat)
├── .prettierrc 또는 package.json#prettier → @heejun/prettier-config
└── docs/
```

### 디렉터리 핵심 규칙

- **`apps/web`는 반드시 `apps/` 아래**. webtoon-index만 루트에 있으므로 이동 대상(§5.1).
- 웹/토스 앱의 `src/`는 **얇아야 한다**: `app/`(셸) + `pages/`(뷰) + `platform/`(브리지 구현) + 스타일. 비즈니스 로직·데이터·상태는 들어오지 않는다.
- 앱 내부 도메인 폴더(`domains/`, `features/`, `entities/`)를 앱마다 두지 않는다 — 그건 `packages/`로 올린다. (rotifolk 웹은 `domains/`가 두꺼운데, 로직은 `client`로, 뷰만 `pages/`로 분해하는 방향.)

---

## 2. 레이어 책임 & 의존성 방향

```
shared  ←  client  ←  apps/{web,toss}
   ↑__________________________|
            apps/api ← shared (client은 import 금지)
```

| 레이어         | 패키지           | 담는 것                                                                                                                                                        | 금지                                     |
| -------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **❶ shared**   | `@<repo>/shared` | TS 타입, Zod 스키마(IO 경계용), 도메인 로직(랭킹·매칭·정산·포맷·검색), 상수, 순수 함수                                                                         | React, DOM, CSS, 어떤 UI 라이브러리도 ❌ |
| **❷ client**   | `@<repo>/client` | Zustand 스토어, 데이터 훅(TanStack Query + ky), **뷰모델 훅(`use*Model`)**, `PlatformBridge` 인터페이스+컨텍스트, 헤드리스 컴포넌트(차트 등 디자인시스템 무관) | Tailwind 클래스, TDS, 앱 전용 라우터 ❌  |
| **❸ web/toss** | `apps/*`         | 라우팅 와이어링, **프레젠테이션 컴포넌트(JSX+스타일)**, 브리지 구현                                                                                            | 비즈니스 로직·fetch·도메인 계산 ❌       |
| **api**        | `apps/api`       | Nest 모듈/컨트롤러/서비스, Drizzle 접근                                                                                                                        | `client` import ❌ (shared만 공유)       |

- 의존성은 **항상 한 방향**(apps → client → shared). eslint boundaries로 강제(rotifolk/webtoon에 이미 존재 → 표준화).
- `shared`는 백엔드(`apps/api`)와 프런트(`client`)가 **공동 소비**한다. class-validator 금지, nestjs-zod 통일(이미 전 레포 완료).
- **Zod는 IO 경계(API 요청/응답·폼 검증)에서만.** 클라이언트 **렌더 경로에서 read-model을 매 렌더 zod parse 하지 말 것**(과거 자가비판에서 기각된 함정). 렌더용 read-model은 **plain TS interface + `satisfies`** 로 계약을 표현한다(레퍼런스: webtoon `@toonspectrum/core`의 `/server` 브라우저세이프 read-model).

---

## 3. 공유 패키지 전략 — 왜 2단(shared/client)인가

현재 네 레포가 제각각인 부분. 표준은 **picky의 shared+client 2단 분리**를 채택한다.

- **`shared`** = "노드/브라우저 어디서나 도는 순수 로직". 백엔드도 쓴다. **표준 패키징 = raw-src 워크스페이스 레시피**(빌드 스텝 無): `package.json`의 main/module/types → `./src/index.ts`, `tsconfig moduleResolution: bundler`. 서브패스(`./server` 등)로 브라우저세이프/노드전용 분리. (레퍼런스: webtoon `@toonspectrum/core`. 현재 picky/rotifolk는 tsup 빌드 → raw-src 정렬은 선택사항, 강제 아님.)
- **`client`** = "React가 필요하지만 디자인 시스템은 모르는" 코드. 웹(Tailwind)과 토스(TDS)가 **둘 다** 그대로 쓴다. 여기에 **뷰모델 훅**(데이터+상태+핸들러를 묶어 plain 객체로 반환)이 산다 → 이게 웹/토스 이원화 최소화의 핵심(§ 짝 문서).
- 토스 `.ait` 번들러가 `workspace:*`를 못 풀므로, 토스는 `shared`/`client`를 **소스 경로 alias**로 참조(`packages/*/src`). picky의 `sync-toss-shared.mjs` + verify 게이트 패턴을 표준 채택.
- **`PlatformBridge`(네이티브 능력)는 레포별 `client`에 두지 않고 공통 npm 패키지 [`@heejun/platform-bridge`](https://www.npmjs.com/package/@heejun/platform-bridge)로 외부화**(소스=`desk-platform/packages/platform-bridge`). `client`의 뷰모델 훅이 `usePlatform()`을 호출한다. 짝 문서 §4.

레포별 현 위치 → 목표:

- **webtoon**: `core`(로직+fx 훅 섞임) + `play-core` → `shared`(순수 로직, play-core 흡수 또는 `shared/play`) + `client`(fx 훅·carousel 훅·뷰모델). 이름은 기존 유지 가능하나 **역할 경계**를 shared/client로 정리.
- **aidigestdesk**: `content`(데이터+util) → `shared`(데이터+zero-dep util) 유지 + `client` 신설(뷰모델·스토어). 토스 generate-JSON은 §짝문서의 "repository 어댑터"로 흡수.
- **picky**: 이미 `shared`+`client` ✓ — 표준의 레퍼런스. 토스 `lib/`에 흩어진 로직(format/keywords/pollSignal 중복)을 shared/client로 회수.
- **rotifolk**: `shared`만 있음 → `client` 신설. 웹 `domains/*/queries.ts`(TanStack 훅)·스토어를 `client`로 승격. 토스 bespoke API 래퍼 제거하고 client의 데이터 훅 재사용.

---

## 4. 툴링 / 설정 표준

| 영역              | 표준                                                             | 현재 일탈                                          |
| ----------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| 패키지 매니저     | pnpm 11.x, `shamefully-hoist=true`, `auto-install-peers=true`    | 전부 OK                                            |
| 태스크 러너       | Turbo 2.9.x (`build`/`lint`/`typecheck`/`test`)                  | 전부 OK                                            |
| eslint            | `@heejun/eslint-config@^5` (flat, boundaries 포함)               | webtoon=@4(업), **picky=인라인(도입)**             |
| prettier          | `@heejun/prettier-config@^3`                                     | webtoon·picky 인라인(도입)                         |
| tsconfig          | 루트 `tsconfig.base.json` + 앱/패키지 extends                    | aidigestdesk만 있음 → 나머지 도입                  |
| 스타일(웹)        | Tailwind v4(`@tailwindcss/vite`, no config 파일) + 토큰 CSS 변수 | **picky=72KB 수기 CSS**(Tailwind 이관)             |
| React             | 19.x + React Compiler(babel-plugin)                              | 전부 OK                                            |
| Vite              | 웹 8.x / 토스 6.x(Granite 제약)                                  | 전부 OK — 의도된 차이                              |
| ORM               | **Drizzle + Neon Postgres**                                      | **rotifolk=Prisma**(장기 선택, §5.4)               |
| 검증              | nestjs-zod                                                       | 전부 OK                                            |
| 데이터 레이어(웹) | **ky + TanStack Query v5**                                       | webtoon·picky·aidigest 도입(§5.5)                  |
| 라우팅            | React Router 7 (웹·토스 **둘 다**)                               | aidigest(웹 수동)·picky/rotifolk(토스 커스텀) 도입 |

> **토스 ESLint 제외는 표준으로 유지**. 토스는 `@apps-in-toss` 규칙·TDS 인라인 스타일 때문에 `@heejun/eslint-config` 대신 제외하는 게 현재 합의. 대신 토스 `src/`가 §1처럼 "얇은 뷰"만 담으면 린트 사각이 작아진다.

---

## 5. 레포별 마이그레이션 플랜 (단계별, 우선순위순)

각 레포는 독립 PR. 순서: **골격 정렬 → 설정 통일 → 공유 2단 분리 → 데이터/라우팅 → 토스 이원화 최소화(짝 문서)**. 한 번에 다 하지 말고 phase별로 verify 통과 후 머지.

### 5.1 webtoon-index — 골격이 가장 이질적(단, 루트-웹 이전은 신중)

> ⚠️ **루트 웹 앱 → `apps/web` 이동은 과거 자가비판에서 "churn 과대"로 기각된 적 있음**([[project_webtoon-index]]). 강제하지 않는다. 편차를 용인하거나, 하더라도 **독립 대형 PR로 분리**하고 다른 정렬 작업과 섞지 말 것.

1. **(선택·고비용)** 루트 웹 앱 → `apps/web` 이동: 루트 `src/`,`components/`,`lib/`,`index.html`,`vite.config.ts` → `apps/web/`, `lib/db` → `apps/api/src/db`, `@/` alias 재정의. **churn이 크므로 가치 판단 후 별도 진행.**
2. `core` → `shared`(순수 로직) + `client`(fx/carousel 훅·뷰모델)로 **역할 경계** 정리(이름 유지 가능). `play-core` 유지 또는 `shared/play`.
3. eslint preset `@4 → @5`, `tsconfig.base.json` 신설. (저비용·우선)
4. 데이터: ky 유지하되 TanStack Query 도입(§5.5).
5. 토스: 현재 "웹 페이지 직접 import" 래퍼는 **이원화 최소 측면에선 모범**. 동작하면 그대로 두고, `client` 뷰모델 패턴으로 **점진** 전환만(짝 문서). 무리한 재작성 금지.

### 5.2 picky — 우선순위 상 (preset 미적용 + CSS)

1. `@heejun/eslint-config@5` + `@heejun/prettier-config@3` 도입, 인라인 config 제거.
2. `tsconfig.base.json` 신설, 패키지별 extends.
3. 웹 72KB 수기 `index.css` → Tailwind v4 점진 이관(토큰화).
4. 토스 `lib/` 중복 로직(format·keywords·pollSignal·pollReadiness)을 `shared`/`client`로 회수.
5. 토스 라우팅 RR6 → RR7 정렬.
6. 데이터: 커스텀 `api.ts` multi-candidate 유지(좋은 패턴)하되 그 위에 TanStack Query 훅 래핑.

### 5.3 aidigestdesk — 우선순위 중

1. 웹 **수동 pathname 라우팅 → React Router 7** 도입(`appRoutes.ts`를 RR7 route 배열로).
2. `client` 패키지 신설: 스토어·뷰모델·`PlatformBridge`. 현재 web=Context, toss=zustand 분산을 통일.
3. 토스 generate-JSON 전략을 `client`의 **DataSource 어댑터**로 추상화(웹=catalog import, 토스=생성 JSON; 훅은 동일 인터페이스). → 짝 문서 §6.
4. eslint `@5` 유지 ✓, `tsconfig.base` 있음 ✓. 골격은 이미 표준에 가장 근접.

### 5.4 rotifolk — 우선순위 중 (데이터 레퍼런스지만 client 없음)

1. `client` 패키지 신설: 웹 `domains/*/queries.ts`(TanStack 훅)·`store/`·`infrastructure/api.ts`를 승격. 웹 `pages/`는 뷰만 남김.
2. 토스 bespoke API 래퍼 제거 → `client` 데이터 훅 재사용. 토스 커스텀 router.ts → RR7.
3. `tsconfig.base.json` 신설.
4. **Prisma → Drizzle**: 표준은 Drizzle이나 마이그레이션 비용 큼(40+ 모델, Socket.IO 결합). **장기 선택지로 보류**, 강제하지 않음. 단 신규 형제 레포는 Drizzle로 시작.

### 5.5 공통 데이터 레이어 통일

- 표준 = **`ky`(HTTP) + TanStack Query v5(서버 상태 캐시/무효화) + Zustand(클라 UI 상태)**. rotifolk가 레퍼런스.
- 데이터 훅은 전부 `client`의 `use<Domain>Query` / `use<Domain>Mutation`으로. 웹/토스 공유.
- 정적 데이터 앱(aidigestdesk, webtoon catalog)도 동일 훅 시그니처를 쓰되 내부 DataSource만 다름(§짝 문서 §6).

---

## 6. 신규 형제 레포 부트스트랩 체크리스트

새 "웹+토스" 서비스를 시작할 때(또는 기존 정렬 시) 이 순서:

- [ ] `apps/web`, `apps/toss`, (백엔드면)`apps/api`, `packages/shared`, `packages/client` 골격 생성
- [ ] `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
- [ ] `@heejun/eslint-config@^5` + `@heejun/prettier-config@^3`
- [ ] `shared`: Zod 스키마 = 백엔드/프런트 단일 계약. tsup ESM+CJS+dts.
- [ ] `client`: `PlatformBridge` 인터페이스 + 컨텍스트, 데이터 훅(ky+TanStack), Zustand 스토어, 뷰모델 훅
- [ ] `apps/web`: RR7 + Tailwind v4 + Radix + `WebPlatformBridge`
- [ ] `apps/toss`: RR7 + Granite + TDS + `TossPlatformBridge` + tds-shim + React dedupe + shared/client 소스 alias + sync 스크립트
- [ ] 토스 등록·배포는 메모리 `reference_toss-miniapp-deploy-playbook.md` 선행 recall
- [ ] 짝 문서 [`TOSS-MINIAPP-PLAYBOOK.md`](./TOSS-MINIAPP-PLAYBOOK.md)의 "이원화 최소화" 패턴 적용

---

## 7. 검증 (각 PR 머지 전)

- `pnpm -w turbo run typecheck lint test build` 통과
- eslint boundaries 위반 0 (apps → client → shared 단방향)
- 토스 `pnpm check:shared`(sync 어댑터 일치) 통과
- 웹/토스 동일 기능에서 **로직 분기**가 새로 생기지 않았는지 diff 점검(짝 문서 §2의 "허용된 분기"만)
