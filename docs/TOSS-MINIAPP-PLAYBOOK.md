# 토스인앱 개발 플레이북 — 웹/토스 이원화 최소화 (Toss Mini-App Playbook)

> **목적**: 같은 서비스의 **웹 버전**과 **토스인앱(AppsInToss/Granite) 버전** 사이에 **코드·기능 차이를 최대한 0으로** 만들고, **토스 정책상 어쩔 수 없는 경우에만** 이원화한다.
> **짝 문서**: 레포 골격·공유 패키지·툴링은 [`SIBLING-MONOREPO-STANDARD.md`](./SIBLING-MONOREPO-STANDARD.md).
> **운영 함정**(콘솔 등록·번들·검토·배포·.ait 업로드)은 메모리 `reference_toss-miniapp-deploy-playbook.md`를 **항상 먼저 recall**. 이 문서는 "코드 아키텍처"만 다룬다.
> **차기 토스인앱 개발 시 이 문서를 기준으로 작업한다.**

---

## 1. 핵심 원칙: Headless Core / Platform Skin

웹과 토스의 **유일한 본질적 차이는 프레젠테이션**이다:

- 웹 = Tailwind v4 + Radix + 웹 표준 API
- 토스 = **TDS(Toss Design System) 강제**(비게임 미니앱 검토 통과 조건) + 토스 네이티브 API

따라서 **프레젠테이션 위·아래의 모든 것은 공유**한다.

```
┌──────────────────────────────────────────────────────┐
│  apps/web (Tailwind 뷰)   │   apps/toss (TDS 뷰)        │  ← 갈라지는 유일한 층(스킨)
├──────────────────────────────────────────────────────┤
│           packages/client  (HEADLESS)                  │  ← 공유
│   뷰모델 훅 use*Model · 데이터 훅 · 스토어 · 브리지 IF    │
├──────────────────────────────────────────────────────┤
│           packages/shared  (FRAMEWORK-AGNOSTIC)        │  ← 공유
│   타입 · Zod 스키마 · 도메인 로직 · 순수 util            │
└──────────────────────────────────────────────────────┘
```

원칙 한 줄: **"화면이 무엇을 보여줄지(what)는 공유하고, 어떻게 그리는지(how)만 갈라진다."**

---

## 2. 무엇을 공유하고 무엇이 갈라지는가

| 관심사                                            | 위치                                           | 웹/토스 공유?                         |
| ------------------------------------------------- | ---------------------------------------------- | ------------------------------------- |
| 타입·Zod 스키마·도메인 로직                       | `shared`                                       | ✅ 100% 공유                          |
| API 클라이언트(ky)·데이터 훅(TanStack Query)      | `client`                                       | ✅ 공유                               |
| Zustand 스토어·셀렉터                             | `client`                                       | ✅ 공유                               |
| **뷰모델 훅 `use<Page>Model()`**                  | `client`                                       | ✅ 공유 (핵심)                        |
| 라우트 정의(path·meta·로더)                       | `shared`/`client`                              | ✅ 공유                               |
| **프레젠테이션 컴포넌트(JSX+스타일)**             | `apps/*`                                       | ❌ 갈라짐 — 정책상 불가피             |
| 디자인 시스템(Tailwind/Radix ↔ TDS)               | `apps/*`                                       | ❌ 갈라짐 — 정책상 불가피             |
| 네이티브 기능(공유·햅틱·클립보드·광고·동의프로필) | `client`의 `PlatformBridge` IF + `apps/*` 구현 | ⚠️ **인터페이스 공유, 구현만 갈라짐** |
| 인증 토큰 저장소                                  | `client` IF + `apps/*` 구현                    | ⚠️ 인터페이스 공유                    |

### "허용된 분기"는 이게 전부다 (이 외의 분기는 리뷰에서 거부)

1. **프레젠테이션 레이어**(컴포넌트 JSX/스타일) — 웹 Tailwind vs 토스 TDS.
2. **`PlatformBridge` 구현체** — 토스 네이티브 API를 못 쓰는 웹은 웹 표준/no-op로 대체.
3. **라우트 범위 축소** — 토스 검토 정책상 일부 기능(예: 관리자 콘솔, 결제 자금이동, 외부링크 과다)을 토스에서 숨김. 단 **로직을 지우지 말고 라우트 노출만 제어**.
4. **데이터 소스 어댑터**(§6) — 동일 훅, 내부 소스만(API vs 번들 JSON) 다름.

> 위 4가지에 해당하지 않는데 토스/웹 코드가 갈라졌다면 = 회수 대상. `client`로 올린다.

---

## 3. 화면 단위 패턴: 뷰모델 훅 + 플랫폼별 얇은 뷰

각 화면은 **로직 훅 1개(공유) + 뷰 2개(웹/토스 각각)** 로 구성한다.

### ❶ `client`에 뷰모델 훅 — 모든 로직 여기 (한 번만 작성)

```ts
// packages/client/src/poll/usePollDetailModel.ts
export function usePollDetailModel(pollId: string) {
  const { data: poll, isLoading, error } = usePollQuery(pollId) // 공유 데이터 훅
  const vote = useVoteMutation(pollId) // 공유 뮤테이션
  const platform = usePlatform() // 브리지(§4)

  const signal = poll ? pollSignal(poll) : null // shared 도메인 로직
  const onShare = () => platform.share({ url: pollShareUrl(pollId), text: poll?.title })

  return {
    poll,
    signal,
    isLoading,
    error,
    isVoting: vote.isPending,
    castVote: vote.mutate,
    onShare,
  }
  // ← plain 객체 + 핸들러만 반환. JSX·스타일·디자인시스템 전혀 모름.
}
```

### ❷ 웹 뷰 — 얇게, 모델을 그대로 소비

```tsx
// apps/web/src/pages/PollDetailPage.tsx
export default function PollDetailPage() {
  const { pollId } = useParams()
  const m = usePollDetailModel(pollId!)
  if (m.isLoading) return <Skeleton />
  return (
    <article className="mx-auto max-w-xl p-4">
      {' '}
      {/* Tailwind */}
      <h1 className="text-xl font-bold">{m.poll.title}</h1>
      <VoteDonutChart signal={m.signal} /> {/* client의 헤드리스 차트 */}
      <Button onClick={() => m.castVote(optionId)} disabled={m.isVoting}>
        투표
      </Button>
      <Button variant="ghost" onClick={m.onShare}>
        공유
      </Button>
    </article>
  )
}
```

### ❸ 토스 뷰 — 같은 모델, TDS로만 다르게 그림

```tsx
// apps/toss/src/pages/PollDetailPage.tsx
import { Top, ListRow, FixedBottomCTA } from '@toss/tds-mobile'
export default function PollDetailPage() {
  const { pollId } = useParams()
  const m = usePollDetailModel(pollId!) // ← 웹과 100% 동일한 훅
  if (m.isLoading) return <Loader />
  return (
    <>
      <Top title={m.poll.title} />
      <VoteDonutChart signal={m.signal} /> {/* 동일 헤드리스 차트 */}
      <FixedBottomCTA onClick={() => m.castVote(optionId)} loading={m.isVoting}>
        투표
      </FixedBottomCTA>
    </>
  )
}
```

**효과**: 새 기능 추가 = `client`에 모델 훅 1개 + 얇은 뷰 2개. 비즈니스 로직·데이터·상태는 **절대 두 번 작성하지 않는다**. 버그도 한 곳에서만 고친다.

---

## 4. 플랫폼 브리지 추상화 (네이티브 기능 이원화 격리)

토스 네이티브 기능(`@apps-in-toss/web-framework`)은 웹에 없다. 코드 곳곳에서 `if (isToss)` 분기하지 말고 **단일 인터페이스 뒤로 숨긴다**.

> **이건 직접 만들지 말고 공통 패키지 [`@heejun/platform-bridge`](https://www.npmjs.com/package/@heejun/platform-bridge)를 쓴다.** 소스=`desk-platform/packages/platform-bridge/`, 통합가이드=`desk-platform/docs/PLATFORM_BRIDGE_INTEGRATION.md`. `@heejun/deskcloud`와 동일하게 npm으로 배포되어 모든 형제 레포가 공통 소비한다. 인터페이스를 늘려야 하면 패키지를 고치고 minor 발행한다(레포마다 복제 금지).

패키지가 제공하는 것: `PlatformBridge` 인터페이스 · `PlatformContext` · `usePlatform()` · `webPlatformBridge`(웹 구현) · `copyTextToClipboard`, 그리고 `@heejun/platform-bridge/toss`의 `createTossPlatformBridge(options?)`(토스 구현, `@apps-in-toss/web-framework` optional peer).

### 웹 앱 셸

```tsx
import { PlatformContext, webPlatformBridge } from '@heejun/platform-bridge'
;<PlatformContext.Provider value={webPlatformBridge}>
  <App />
</PlatformContext.Provider> // 웹은 추가 코드 0
```

### 토스 앱 셸

```tsx
import { PlatformContext } from '@heejun/platform-bridge'
import { createTossPlatformBridge } from '@heejun/platform-bridge/toss'

// 앱별 차이(음소거 연동·공유 문구)만 옵션으로 주입, 나머지는 표준.
const bridge = createTossPlatformBridge({ hapticEnabled: () => !isSoundMuted() })

;<TDSMobileAITProvider ...>
  <PlatformContext.Provider value={bridge}>
    <App />
  </PlatformContext.Provider>
</TDSMobileAITProvider>
```

### 공유 코드 / 뷰모델에서 사용

```ts
import { usePlatform } from '@heejun/platform-bridge'
const platform = usePlatform()
await platform.share({ title, text, url }) // 'shared' | 'copied' | 'dismissed' | 'unsupported'
platform.haptic('confetti')
platform.openExternal(url)
```

이후 모든 공유 코드는 `usePlatform()`만 호출 → **네이티브 이원화가 패키지 한 곳으로 격리**된다. `client`의 뷰모델 훅(§3)이 이 브리지를 호출하므로 웹/토스 뷰는 핸들러만 연결한다.

---

## 5. 라우팅 표준 — 웹/토스 모두 React Router 7

토스 웹뷰도 RR7이 정상 동작한다(webtoon·rotifolk 토스에서 검증). 따라서:

- **라우트 정의는 공유**: `path` + `meta`(title/seo) + 어떤 모델을 쓰는지. `shared` 또는 `client`에 배열로.
- 각 앱은 **element만 자기 디자인시스템 뷰로 매핑**.

```ts
// packages/client/src/routes.ts  (요소 없는 순수 라우트 메타)
export const ROUTES = [
  { id: 'poll-detail', path: '/poll/:id', titleKey: 'poll.detail' },
  { id: 'poll-list', path: '/', titleKey: 'poll.list' },
  // 토스에서 숨길 라우트는 platforms: ['web'] 플래그
  { id: 'admin', path: '/admin', titleKey: 'admin', platforms: ['web'] },
] as const
```

```tsx
// apps/web: createBrowserRouter(ROUTES.map(r => ({ path: r.path, element: WEB_VIEWS[r.id] })))
// apps/toss: 동일하되 platforms 필터 + TOSS_VIEWS[r.id]
```

- **금지**: aidigestdesk 웹의 수동 `pathname` 파싱, picky 토스의 RR6, rotifolk 토스의 커스텀 `router.ts` → 전부 RR7로 정렬(짝 문서 §5).
- 토스 **딥링크 진입**은 `platform.getEntryRoute()`로 받아 RR7 `navigate`에 연결.

---

## 6. 데이터 전략 — 정적/실시간 차이도 훅 뒤로 숨긴다

앱마다 데이터 소스가 다르다(웹=API 또는 거대 catalog import / 토스=번들 JSON으로 700KB 회피 — aidigestdesk 사례). 이 차이를 **컴포넌트가 알면 안 된다**. `client`의 데이터 훅이 **DataSource 어댑터**를 주입받는다.

```ts
// packages/client/src/data/source.ts
export interface RankingSource {
  list(): Promise<Ranking[]>
}

// apps/web/src/platform/  →  API 또는 catalog import
export const webRankingSource: RankingSource = { list: () => api.get('rankings').json() }
// apps/toss/src/platform/  →  빌드시 생성된 경량 JSON
import tossRankings from '../../data/toss-rankings.json'
export const tossRankingSource: RankingSource = { list: async () => tossRankings }

// client 훅은 소스만 받아 동일하게 캐싱
export const useRankings = () =>
  useQuery({ queryKey: ['rankings'], queryFn: () => usePlatform().rankingSource.list() })
```

- 실시간(rotifolk Socket.IO)도 동일: 연결 로직은 `client`, 토스에서 비활성/축소는 라우트·뷰 레벨에서만.
- 토스 JSON 생성 스크립트(`generate-toss-*.mjs`)는 유지하되, 그 산출물을 **어댑터 뒤에** 둔다. drift 방지 = 빌드 prebuild 훅(aidigestdesk 패턴) + verify.

---

## 7. 토스 전용 함정 (코드 측면) — 반드시 적용

| 함정                                                                                                                                                                         | 표준 처리                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`ait build` 전체 실패** — granite collect-package-version 플러그인이 raw-src 워크스페이스 패키지(`@scope/*`) 심링크를 `packages/*`로 해석→`node_modules/<name>` 미스→throw | `pnpm patch @apps-in-toss/plugins@<ver>` → `dist/index.{cjs,js}`의 `extractPackagePath` throw를 `return null`로(버전수집만 스킵, 무해) → `pnpm-workspace` `patchedDependencies`. **토스가 공유 워크스페이스 패키지를 소비하면 필수.** (injected dep은 심링크 유지돼 무효 — 패치가 정답. webtoon 적용완료 `patches/`) |
| `.ait` 번들러가 `workspace:*` 못 풂                                                                                                                                          | 토스 `vite.config`에서 `@<repo>/shared`,`@<repo>/client` → `packages/*/src` **소스 alias**. picky `scripts/sync-toss-shared.mjs` + `pnpm check:shared` verify 게이트.                                                                                                                                                |
| 모노레포 React 중복(훅 깨짐)                                                                                                                                                 | 토스 `vite.config` `resolve.dedupe: ['react','react-dom']`                                                                                                                                                                                                                                                           |
| TDS가 브라우저(비-AIT)에서 throw                                                                                                                                             | `tds-shim.tsx` + `PREVIEW_NO_TDS=1` alias 스텁(전 레포 보유)                                                                                                                                                                                                                                                         |
| 비게임 미니앱 = TDS 필수                                                                                                                                                     | 토스 프레젠테이션은 **반드시 `@toss/tds-mobile`(+`-ait`)**. 임의 컴포넌트로 검토 통과 불가                                                                                                                                                                                                                           |
| ESLint                                                                                                                                                                       | 토스 `apps/toss/**`는 `@heejun/eslint-config` 제외 유지(짝 문서 §4). 뷰만 얇게 두어 사각 최소화                                                                                                                                                                                                                      |
| 익명 사용자 `email='' ` DB UNIQUE 충돌                                                                                                                                       | 메모리 배포 플레이북 참조                                                                                                                                                                                                                                                                                            |
| 토스 정책 모듈(자금이동 등)                                                                                                                                                  | 결정만 기록, 실제 자금이동 X (메모리 `offhours-money-movement-boundary`)                                                                                                                                                                                                                                             |

> 콘솔 등록/검토요청/번들 업로드/Vercel/핀치줌/ERR_UPLOAD_FILE_CHANGED 등 **운영 함정은 메모리 `reference_toss-miniapp-deploy-playbook.md`** 가 정본. 코드와 운영을 분리해 본다.

---

## 8. 신규 토스인앱 추가 체크리스트 (기존 웹 서비스에 토스 붙일 때)

1. [ ] 메모리 `reference_toss-miniapp-deploy-playbook.md` recall (콘솔/검토/배포 절차)
2. [ ] `packages/client`가 있는가? 없으면 먼저 생성하고 웹 로직(데이터 훅·스토어·뷰모델)을 승격(짝 문서 §5)
3. [ ] `PlatformBridge` 인터페이스 정의 + 웹 구현 먼저(웹부터 브리지 경유로 리팩터)
4. [ ] `apps/toss` 스캐폴드: Vite 6 + Granite + `granite.config.ts` + TDS + tds-shim + React dedupe + 소스 alias + sync 스크립트
5. [ ] `tossBridge` 구현(네이티브 API 매핑)
6. [ ] 라우트 메타에서 토스 노출 범위 결정(`platforms` 플래그) — 정책상 숨길 것만
7. [ ] 화면별로 **웹과 동일한 `use*Model` 훅** 소비하는 TDS 뷰 작성 (로직 재작성 금지)
8. [ ] 데이터가 무거우면 §6 DataSource 어댑터 + 생성 JSON
9. [ ] `pnpm check:shared` + typecheck + 토스 빌드(`ait build`) + 프리뷰(`PREVIEW_NO_TDS=1`) 검증
10. [ ] 웹↔토스 diff 점검: §2 "허용된 분기" 4종 외 로직 분기 0 확인

---

## 9. 안티패턴 (하지 말 것)

- ❌ 토스에서 페이지를 통째로 복붙해 로직까지 재구현 (현 aidigestdesk/picky/rotifolk 토스의 `lib/` 중복) → `client`로 회수
- ❌ 컴포넌트 안에서 `if (isTossEnv())` 분기로 네이티브 호출 → `PlatformBridge`로
- ❌ 토스 전용 라우터·상태 라이브러리 도입 → RR7 + Zustand 공유
- ❌ 도메인 계산·포맷 함수를 토스 `lib/`에 사본으로 → `shared`
- ❌ 토스 검토 통과 위해 로직 자체를 삭제 → 라우트 노출만 제어, 로직은 보존
