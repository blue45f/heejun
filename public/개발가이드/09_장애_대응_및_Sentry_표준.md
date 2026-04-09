# 09. 장애 대응 및 Sentry 표준 (2025-2026 Edition)

| 분류 | 품질 & 성능 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [07. 테스팅](./07_테스팅_가이드.md), [11. CI/CD](./11_CICD_파이프라인_표준.md), [08. 성능 최적화](./08_성능_최적화_가이드.md), [06. 보안](./06_웹_보안_심화_가이드.md) | **AI 도구** | Sentry AI, Claude Code |
| **핵심 테마** | Error Tracking, AI Post-mortem, Session Replay, Alerting, Performance Monitoring | **Update** | 2025.04 |

---

> **"장애는 예방하는 것이 아니라, 관리하는 것이다. 빠른 탐지와 정확한 분석이 서비스의 신뢰를 만든다."**
> 본 가이드는 Sentry를 활용하여 장애를 모니터링하고, AI와 협업하여 근본 원인을 신속하게 파악하는 표준 프로세스를 다룹니다.

---

## 1. 에러 트래킹: Sentry SDK v8 최신 설정

프로덕션 환경에서의 에러를 추적하기 위해 소스 맵 연동과 세션 리플레이를 활성화합니다.

### 1.1 SDK 초기화 및 핵심 기능

```typescript
// sentry.ts — 앱 진입점(main.tsx)보다 먼저 import 해야 합니다.
import * as Sentry from "@sentry/react";

/**
 * 환경별 샘플링 비율 설정
 * - production: 비용 절감을 위해 낮은 샘플링
 * - staging: 디버깅 편의를 위해 높은 샘플링
 * - development: 전수 샘플링
 */
const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.VITE_APP_ENV === "staging";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_APP_ENV ?? process.env.NODE_ENV,
  release: process.env.VITE_APP_VERSION ?? "unknown",

  integrations: [
    // 브라우저 성능 추적 (페이지 로드, 네비게이션)
    Sentry.browserTracingIntegration(),

    // 세션 리플레이 — 에러 발생 시 사용자 행동 재현
    Sentry.replayIntegration({
      maskAllText: true,       // 민감한 텍스트 자동 마스킹
      blockAllMedia: true,     // 미디어 요소 차단
    }),

    // HTTP 클라이언트 에러 추적 (4xx, 5xx 응답 자동 캡처)
    Sentry.httpClientIntegration({
      failedRequestStatusCodes: [[400, 599]],
      failedRequestTargets: [
        /^https:\/\/api\.example\.com/,  // 모니터링 대상 API 도메인
        /^\/api\//,                       // 상대 경로 API
      ],
    }),

    // 글로벌 에러 핸들러 (window.onerror, unhandledrejection)
    Sentry.globalHandlersIntegration({
      onerror: true,
      onunhandledrejection: true,
    }),
  ],

  // 성능 샘플링 — 환경에 따라 차등 적용
  tracesSampleRate: isProduction ? 0.1 : isStaging ? 0.5 : 1.0,

  // 세션 리플레이 샘플링
  replaysSessionSampleRate: isProduction ? 0.1 : 0.5,
  replaysOnErrorSampleRate: 1.0, // 에러 발생 시 리플레이 100% 캡처

  // 민감 정보 필터링
  beforeSend(event) {
    // 로컬 개발 환경에서는 전송하지 않음
    if (process.env.NODE_ENV === "development") return null;

    // PII(개인식별정보) 제거
    if (event.request?.cookies) {
      delete event.request.cookies;
    }

    return event;
  },

  // 불필요한 에러 무시
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Network request failed",
    "Load failed",
    /^Non-Error exception captured/,
  ],
});
```

### 1.2 소스 맵(Source Map) 업로드

빌드 시 자동으로 소스 맵을 Sentry 서버에 업로드하여 난독화된 코드에서도 원래의 위치를 파악합니다.

#### Vite 플러그인 설정 (`@sentry/vite-plugin`)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    // 소스 맵 생성 활성화 (Sentry 업로드 후 삭제)
    sourcemap: true,
  },
  plugins: [
    react(),

    // Sentry 소스 맵 업로드 플러그인
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,           // Sentry 조직 슬러그
      project: process.env.SENTRY_PROJECT,   // Sentry 프로젝트 슬러그
      authToken: process.env.SENTRY_AUTH_TOKEN,

      release: {
        // 릴리스 이름 — git SHA 또는 버전 태그 사용
        name: process.env.VITE_APP_VERSION ?? "unknown",
      },

      sourcemaps: {
        // 업로드 대상 디렉토리
        assets: "./dist/**",
        // 업로드 후 로컬 소스 맵 파일 삭제 (보안)
        filesToDeleteAfterUpload: "./dist/**/*.map",
      },
    }),
  ],
});
```

#### 빌드 스크립트 (`package.json`)

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:staging": "VITE_APP_ENV=staging vite build",
    "build:production": "VITE_APP_ENV=production vite build",
    "sentry:sourcemaps": "sentry-cli sourcemaps inject ./dist && sentry-cli sourcemaps upload ./dist"
  }
}
```

> **참고**: `@sentry/vite-plugin`을 사용하면 `sentry-cli`를 별도로 호출할 필요가 없습니다. 플러그인이 빌드 완료 시 자동으로 업로드합니다. `sentry:sourcemaps` 스크립트는 수동 업로드가 필요한 경우를 위한 것입니다.

---

## 2. AI 기반 장애 분석: AI 포스트모템 (Post-mortem)

Sentry에서 제공하는 AI 도구를 활용하여 에러의 원인과 해결책을 자동으로 도출합니다.

### 2.1 AI 분석 워크플로우

전체 흐름을 다이어그램으로 나타내면 다음과 같습니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                     장애 발생 → Sentry 캡처                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │  1. Sentry 이슈 생성    │
               │  - 스택 트레이스        │
               │  - 세션 리플레이        │
               │  - HTTP 컨텍스트       │
               └───────────┬───────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
   ┌─────────────────┐      ┌─────────────────────┐
   │ 2a. Sentry AI   │      │ 2b. Claude Code     │
   │  Insight 분석    │      │  심층 코드 분석       │
   │  - 유사 이슈 매칭 │      │  - 근본 원인 파악     │
   │  - 자동 요약     │      │  - 수정 코드 제안     │
   └────────┬────────┘      └──────────┬──────────┘
            │                          │
            └────────────┬─────────────┘
                         ▼
              ┌─────────────────────┐
              │ 3. 수정 PR 생성      │
              │  - 핫픽스 코드       │
              │  - 방어 로직 추가     │
              │  - 테스트 코드 포함   │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ 4. 배포 및 검증      │
              │  - Sentry 이슈 해결  │
              │  - 모니터링 지속     │
              └─────────────────────┘
```

### 2.2 Sentry 이슈 → Claude Code 분석 흐름

아래는 Sentry에서 발견한 이슈를 Claude Code에게 전달하여 분석 및 수정 코드를 받는 실제 예시입니다.

**Step 1: Sentry에서 에러 정보 수집**
```
이슈: TypeError: Cannot read properties of undefined (reading 'map')
파일: src/components/UserList.tsx:42
발생 빈도: 최근 1시간 동안 340건
영향 사용자: 128명
스택 트레이스: UserList > fetchUsers > response.data.users.map(...)
```

**Step 2: Claude Code에 전달할 프롬프트 템플릿**
```markdown
## Sentry 에러 분석 요청

### 에러 정보
- **이슈 제목**: TypeError: Cannot read properties of undefined (reading 'map')
- **발생 위치**: src/components/UserList.tsx:42
- **발생 빈도**: 1시간 340건 / 영향 사용자 128명
- **환경**: production, Chrome 120+

### 스택 트레이스
[Sentry에서 복사한 전체 스택 트레이스 붙여넣기]

### 관련 컨텍스트
- 최근 배포 버전: v2.3.1 (30분 전 배포)
- 해당 API 응답 스펙: { users: User[] }
- 변경된 파일: src/api/userApi.ts, src/components/UserList.tsx

### 요청 사항
1. 근본 원인(root cause)을 분석해줘.
2. 방어 로직을 포함한 수정 코드를 작성해줘.
3. 유사 에러 방지를 위한 Zod 스키마 유효성 검증 코드를 추가해줘.
4. 관련 테스트 코드를 작성해줘.
```

**Step 3: Claude Code 분석 결과 활용**
- 제안된 수정 코드를 PR로 생성
- 테스트 코드 추가 확인 ([07. 테스팅 가이드](./07_테스팅_가이드.md) 참조)
- [11. CI/CD 파이프라인](./11_CICD_파이프라인_표준.md)을 통해 자동 배포

---

## 3. 알람 전략: 피로도 감소와 정확도 향상

모든 에러에 알람을 보내면 '알람 피로'로 인해 진짜 중요한 이슈를 놓칩니다. 우선순위별로 알람 채널을 분리합니다.

### 3.1 알람 우선순위 매트릭스

| 등급 | 기준 | 알람 채널 | 응답 시간 | 예시 |
|:---|:---|:---|:---|:---|
| **P0 (Critical)** | 핵심 기능 장애, 매출 영향 | Slack `#incident-critical` + PagerDuty | 5분 이내 | 결제 실패, 로그인 불능, DB 연결 끊김 |
| **P1 (High)** | 주요 기능 오작동 | Slack `#incident-high` | 30분 이내 | 검색 기능 장애, 파일 업로드 실패 |
| **P2 (Normal)** | 하위 기능 에러, UI 결함 | Slack `#incident-normal` | 4시간 이내 | UI 깨짐, 비핵심 API 간헐 에러 |
| **P3 (Low)** | 경미한 이슈 | 주간 리포트 | 다음 스프린트 | 콘솔 경고, 비추적 에러 |

### 3.2 Sentry Alert Rule 설정 예시

Sentry 대시보드 > Alerts > Create Alert Rule에서 조건을 구성합니다.

```yaml
# P0 Alert Rule 예시
name: "[P0] 핵심 기능 장애 감지"
conditions:
  - type: event_frequency
    value: 10                      # 10건 이상
    interval: 5m                   # 5분 이내
  - type: tagged_event
    key: "level"
    match: "equal"
    value: "fatal"
actions:
  - type: slack
    workspace: "our-workspace"
    channel: "#incident-critical"
    tags: ["level", "url", "browser"]
  - type: pagerduty
    service: "frontend-oncall"
    severity: "critical"

---
# P1 Alert Rule 예시
name: "[P1] 주요 기능 오작동 감지"
conditions:
  - type: event_frequency
    value: 50
    interval: 1h
  - type: tagged_event
    key: "level"
    match: "equal"
    value: "error"
actions:
  - type: slack
    workspace: "our-workspace"
    channel: "#incident-high"
```

### 3.3 Slack Webhook 연동 코드

Sentry의 기본 Slack 연동 외에, 커스텀 알람 포맷이 필요한 경우 웹훅을 활용합니다.

```typescript
// lib/sentry-slack-webhook.ts
interface SentryWebhookPayload {
  action: string;
  data: {
    issue: {
      title: string;
      culprit: string;
      permalink: string;
      metadata: { value: string };
    };
  };
}

/**
 * Sentry 웹훅 수신 후 Slack으로 포맷팅된 메시지 전송
 * (API Route 또는 서버리스 함수에서 사용)
 */
export async function handleSentryWebhook(
  payload: SentryWebhookPayload,
): Promise<void> {
  const { issue } = payload.data;
  const severity = classifySeverity(issue.title);

  const slackMessage = {
    channel: getSlackChannel(severity),
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `[${severity}] 장애 발생`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*이슈:*\n${issue.title}` },
          { type: "mrkdwn", text: `*위치:*\n${issue.culprit}` },
          { type: "mrkdwn", text: `*상세:*\n${issue.metadata.value}` },
          {
            type: "mrkdwn",
            text: `*링크:*\n<${issue.permalink}|Sentry에서 보기>`,
          },
        ],
      },
    ],
  };

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackMessage),
  });
}

/** 이슈 제목 키워드 기반 심각도 분류 */
function classifySeverity(title: string): "P0" | "P1" | "P2" | "P3" {
  const criticalKeywords = ["결제", "payment", "로그인", "auth", "database"];
  const highKeywords = ["timeout", "500", "crash", "unhandled"];

  if (criticalKeywords.some((kw) => title.toLowerCase().includes(kw)))
    return "P0";
  if (highKeywords.some((kw) => title.toLowerCase().includes(kw))) return "P1";
  return "P2";
}

/** 심각도에 따른 Slack 채널 매핑 */
function getSlackChannel(severity: string): string {
  const channelMap: Record<string, string> = {
    P0: "#incident-critical",
    P1: "#incident-high",
    P2: "#incident-normal",
    P3: "#incident-low",
  };
  return channelMap[severity] ?? "#incident-normal";
}
```

### 3.4 PagerDuty 연동 설정

```typescript
// lib/pagerduty.ts

/**
 * PagerDuty Events API v2를 통한 인시던트 생성
 * P0 장애 발생 시 온콜 담당자에게 즉시 알림
 */
export async function triggerPagerDutyIncident(params: {
  title: string;
  details: string;
  severity: "critical" | "error" | "warning" | "info";
  source: string;
  dedupKey?: string;
}): Promise<void> {
  await fetch("https://events.pagerduty.com/v2/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      routing_key: process.env.PAGERDUTY_ROUTING_KEY,
      event_action: "trigger",
      dedup_key: params.dedupKey,
      payload: {
        summary: params.title,
        severity: params.severity,
        source: params.source,
        custom_details: { description: params.details },
      },
    }),
  });
}
```

---

## 4. 장애 대응 5단계 프로세스

### 4.1 탐지 (Detection) — 즉시

| 담당 | 행동 |
|:---|:---|
| **자동 시스템** | Sentry 알람 → Slack/PagerDuty 전파 |
| **온콜 엔지니어** | 알람 확인 및 영향도 초기 판단 |

- Sentry 대시보드에서 이슈 상세 확인 (스택 트레이스, 세션 리플레이)
- 에러 발생 빈도, 영향 사용자 수, 최근 배포와의 상관관계 파악
- P0/P1 여부 즉시 판단

### 4.2 전파 (Notification) — 5분 이내

| 담당 | 행동 |
|:---|:---|
| **온콜 엔지니어** | 장애 사실 공유, 인시던트 채널 개설 |
| **테크 리드** | 담당자 지정 및 우선순위 확정 |

**Slack 장애 공유 템플릿:**
```
[P0 장애 발생]
- 시각: 2025-04-09 14:32 KST
- 현상: 결제 페이지에서 "TypeError: Cannot read properties of undefined" 발생
- 영향: 약 500명의 사용자 결제 불가
- Sentry 링크: https://sentry.io/organizations/xxx/issues/12345/
- 담당자: @frontend-oncall
- 상태: 조사 중
```

### 4.3 격리 및 복구 (Mitigation) — 30분 이내

| 담당 | 행동 |
|:---|:---|
| **담당 개발자** | 원인 코드 격리 또는 롤백 결정 |
| **DevOps** | 롤백 배포 실행 또는 핫픽스 배포 지원 |

> **원칙: 원인 파악보다 복구가 우선입니다.**

- **롤백이 안전한 경우**: 이전 버전으로 즉시 롤백 ([11. CI/CD](./11_CICD_파이프라인_표준.md) 참조)
- **롤백이 불가능한 경우**: Feature Flag로 해당 기능 비활성화, 또는 핫픽스 긴급 배포
- 복구 후 Sentry에서 에러 발생률 감소 확인

### 4.4 분석 (Analysis) — 복구 후 24시간 이내

| 담당 | 행동 |
|:---|:---|
| **담당 개발자** | Sentry 리플레이/로그 기반 근본 원인 분석 |
| **테크 리드** | 포스트모템 문서 작성 주도 |

- Sentry Session Replay로 사용자 행동 재현
- Claude Code를 활용한 AI 포스트모템 분석 (섹션 2 참조)
- 타임라인 작성: 장애 발생 → 탐지 → 복구까지의 전체 흐름 기록

### 4.5 예방 (Prevention) — 복구 후 1주일 이내

| 담당 | 행동 |
|:---|:---|
| **담당 개발자** | 방어 코드 추가, 테스트 코드 작성 |
| **팀 전체** | 포스트모템 리뷰, 가이드 업데이트 |

- 유사 사례 방지를 위한 테스트 코드 추가 ([07. 테스팅 가이드](./07_테스팅_가이드.md))
- Error Boundary 보강 (섹션 5 참조)
- 알람 규칙 보완 (임계값 조정, 새로운 키워드 추가)
- 포스트모템 문서를 팀 위키에 공유

---

## 5. Error Boundary 설계 패턴

React의 Error Boundary를 활용하여 컴포넌트 트리의 에러가 전체 앱을 크래시시키지 않도록 합니다.

### 5.1 Sentry 연동 Error Boundary

```tsx
// components/ErrorBoundary.tsx
import * as Sentry from "@sentry/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 에러 발생 시 보여줄 대체 UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** 에러 발생 시 호출되는 콜백 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Sentry에 에러 전송 (컴포넌트 스택 정보 포함)
    Sentry.withScope((scope) => {
      scope.setTag("errorBoundary", "true");
      scope.setExtra("componentStack", errorInfo.componentStack);
      Sentry.captureException(error);
    });

    // 커스텀 에러 핸들러 호출
    this.props.onError?.(error, errorInfo);
  }

  /** 에러 상태 초기화 — 재시도 시 사용 */
  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // 함수형 fallback인 경우 error와 reset 함수 전달
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      // ReactNode fallback
      return this.props.fallback ?? <DefaultFallbackUI onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

/** 기본 에러 대체 UI */
function DefaultFallbackUI({ onReset }: { onReset: () => void }) {
  return (
    <div role="alert" style={{ padding: "2rem", textAlign: "center" }}>
      <h2>일시적인 오류가 발생했습니다</h2>
      <p>잠시 후 다시 시도해 주세요.</p>
      <button onClick={onReset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
        다시 시도
      </button>
    </div>
  );
}
```

### 5.2 Sentry의 내장 Error Boundary 활용

```tsx
// Sentry가 제공하는 Error Boundary — 자동으로 에러를 캡처합니다.
import * as Sentry from "@sentry/react";

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div role="alert">
          <h2>오류가 발생했습니다</h2>
          <p>{error.message}</p>
          <button onClick={resetError}>다시 시도</button>
        </div>
      )}
      beforeCapture={(scope) => {
        scope.setTag("location", "app-root");
      }}
    >
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  );
}
```

### 5.3 페이지별 Error Boundary 전략

```tsx
// 라우트 레벨에서 개별 Error Boundary 적용
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RootErrorPage />,      // 최상위 에러 페이지
    children: [
      {
        path: "dashboard",
        element: (
          <Sentry.ErrorBoundary fallback={<DashboardErrorFallback />}>
            <DashboardPage />
          </Sentry.ErrorBoundary>
        ),
      },
      {
        path: "payment",
        element: (
          // 결제 페이지는 별도의 상세 에러 처리
          <Sentry.ErrorBoundary
            fallback={<PaymentErrorFallback />}
            beforeCapture={(scope) => {
              scope.setTag("critical", "true");
              scope.setLevel("fatal");
            }}
          >
            <PaymentPage />
          </Sentry.ErrorBoundary>
        ),
      },
    ],
  },
]);
```

---

## 6. 커스텀 에러 컨텍스트 추가

Sentry에 전송되는 이벤트에 추가 컨텍스트를 붙이면 디버깅 속도가 크게 향상됩니다.

### 6.1 사용자 컨텍스트 (`Sentry.setUser`)

```typescript
// 로그인 성공 후 사용자 정보 설정
function onLoginSuccess(user: { id: string; email: string; plan: string }) {
  Sentry.setUser({
    id: user.id,
    // 주의: 이메일은 PII이므로 해시 처리 권장
    email: hashEmail(user.email),
    segment: user.plan, // free, pro, enterprise
  });
}

// 로그아웃 시 사용자 정보 제거
function onLogout() {
  Sentry.setUser(null);
}
```

### 6.2 커스텀 컨텍스트 (`Sentry.setContext`)

```typescript
// 비즈니스 로직 관련 컨텍스트 추가
Sentry.setContext("order", {
  orderId: "ORD-20250409-001",
  totalAmount: 55000,
  itemCount: 3,
  paymentMethod: "card",
});

// API 요청 관련 컨텍스트
Sentry.setContext("api_request", {
  endpoint: "/api/v2/users",
  method: "GET",
  responseStatus: 500,
  duration: 3200, // ms
});
```

### 6.3 Breadcrumbs (행동 추적)

```typescript
// 수동 Breadcrumb 추가 — 에러 발생 전 사용자의 행동 경로 기록
Sentry.addBreadcrumb({
  category: "user.action",
  message: "장바구니에 상품 추가",
  level: "info",
  data: {
    productId: "PROD-123",
    quantity: 2,
  },
});

// 네비게이션 추적
Sentry.addBreadcrumb({
  category: "navigation",
  message: "결제 페이지로 이동",
  level: "info",
  data: {
    from: "/cart",
    to: "/checkout",
  },
});

// API 호출 추적
Sentry.addBreadcrumb({
  category: "api",
  message: "결제 API 호출",
  level: "info",
  data: {
    url: "/api/payments",
    method: "POST",
    statusCode: 200,
  },
});
```

### 6.4 태그 활용 (`Sentry.setTag`)

```typescript
// 필터링과 검색에 유용한 태그 설정
Sentry.setTag("feature", "checkout");
Sentry.setTag("team", "payment");
Sentry.setTag("release_phase", "canary"); // canary, stable

// A/B 테스트 실험군 태그
Sentry.setTag("experiment", "new-checkout-v2");
```

---

## 7. 성능 모니터링 (Transactions & Spans)

Sentry의 Performance 기능을 활용하여 느린 구간을 추적하고 병목을 찾습니다. ([08. 성능 최적화 가이드](./08_성능_최적화_가이드.md) 참조)

### 7.1 커스텀 트랜잭션 측정

```typescript
import * as Sentry from "@sentry/react";

/**
 * 결제 프로세스 전체 소요 시간 추적 예시
 * 트랜잭션 안에 여러 Span을 넣어 구간별 소요 시간을 확인합니다.
 */
async function processPayment(orderId: string): Promise<void> {
  await Sentry.startSpan(
    {
      name: "payment.process",
      op: "transaction",
      attributes: { orderId },
    },
    async (span) => {
      // 1단계: 재고 확인
      await Sentry.startSpan(
        { name: "payment.check_inventory", op: "http.client" },
        async () => {
          await checkInventory(orderId);
        },
      );

      // 2단계: PG사 결제 요청
      await Sentry.startSpan(
        { name: "payment.pg_request", op: "http.client" },
        async () => {
          await requestPaymentGateway(orderId);
        },
      );

      // 3단계: 주문 상태 업데이트
      await Sentry.startSpan(
        { name: "payment.update_order", op: "db" },
        async () => {
          await updateOrderStatus(orderId, "paid");
        },
      );
    },
  );
}
```

### 7.2 React 컴포넌트 렌더링 성능 추적

```tsx
import * as Sentry from "@sentry/react";

// Sentry Profiler로 컴포넌트 렌더링 시간 측정
const ProfiledDashboard = Sentry.withProfiler(DashboardPage, {
  name: "DashboardPage",
});

// 사용
function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <ProfiledDashboard />
    </Sentry.ErrorBoundary>
  );
}
```

### 7.3 Web Vitals 자동 수집

```typescript
// Sentry SDK v8은 browserTracingIntegration에서 자동으로 수집합니다.
// 별도 설정 없이 다음 지표가 Sentry Performance 탭에 표시됩니다:
// - LCP (Largest Contentful Paint)
// - FID (First Input Delay)
// - CLS (Cumulative Layout Shift)
// - FCP (First Contentful Paint)
// - TTFB (Time to First Byte)
// - INP (Interaction to Next Paint)

// 커스텀 Web Vitals 임계값 기반 알람을 설정하려면
// Sentry 대시보드 > Performance > Web Vitals 에서 구성합니다.
```

---

## 8. 로그 수준 표준화

어떤 상황에서 어떤 로그 수준을 사용할지 팀 내 표준을 정합니다.

### 8.1 로그 수준별 사용 기준

| 수준 | 도구 | 사용 시점 | 예시 |
|:---|:---|:---|:---|
| **debug** | `console.debug()` | 개발 환경 디버깅 전용 (프로덕션 미전송) | 상태 변경 추적, API 응답 로깅 |
| **info** | `Sentry.captureMessage(msg, "info")` | 비즈니스 이벤트 추적 (에러 아님) | 사용자 결제 완료, 가입 전환 |
| **warning** | `Sentry.captureMessage(msg, "warning")` | 잠재적 문제, 즉시 조치 불필요 | API 응답 지연(3초+), 재시도 발생 |
| **error** | `Sentry.captureException(error)` | 처리된 에러 — 사용자 영향 있지만 앱은 동작 | API 실패 후 fallback, 파싱 에러 |
| **fatal** | `Sentry.captureException(error, { level: "fatal" })` | 처리 불가능한 에러 — 앱 크래시 | Error Boundary 포착, 메모리 부족 |

### 8.2 코드 예시

```typescript
// ❌ 잘못된 사용: 모든 에러를 console.error로만 처리
try {
  await fetchData();
} catch (error) {
  console.error("에러 발생:", error); // Sentry에 전송되지 않음!
}

// ✅ 올바른 사용: Sentry로 전송하여 추적 가능하게
try {
  await fetchData();
} catch (error) {
  // 사용자에게 영향이 있는 에러 → captureException
  Sentry.captureException(error, {
    tags: { feature: "data-fetch" },
    extra: { endpoint: "/api/data", retryCount: 3 },
  });
}

// ✅ 비즈니스 이벤트 추적 (에러가 아닌 경우)
Sentry.captureMessage("사용자가 플랜을 다운그레이드함", {
  level: "info",
  tags: { feature: "billing" },
  extra: { fromPlan: "pro", toPlan: "free" },
});

// ✅ 잠재적 문제 경고
if (apiResponseTime > 3000) {
  Sentry.captureMessage(`API 응답 지연: ${apiResponseTime}ms`, {
    level: "warning",
    tags: { endpoint: "/api/search" },
  });
}
```

---

## 9. 주의사항 및 흔한 실수

### 9.1 노이즈 과다 (Too Much Noise)

```typescript
// ❌ 모든 예상 가능한 에러를 Sentry에 전송하면 노이즈가 됩니다.
try {
  const data = JSON.parse(userInput);
} catch (error) {
  Sentry.captureException(error); // 사용자 입력 파싱 실패는 예상 가능한 에러
}

// ✅ 예상 가능한 에러는 로컬에서 처리하고, 예상 불가능한 에러만 전송합니다.
try {
  const data = JSON.parse(userInput);
} catch (error) {
  // 사용자에게 유효성 검사 메시지를 보여주고
  setValidationError("올바른 JSON 형식을 입력해주세요.");
  // Sentry에는 전송하지 않음 — 예상된 사용자 입력 에러
}
```

**노이즈 방지 체크리스트:**
- `ignoreErrors`에 무의미한 브라우저 에러 패턴 추가 (섹션 1.1 참조)
- 샘플링 비율을 환경에 맞게 조정
- `beforeSend`에서 불필요한 이벤트 필터링

### 9.2 소스 맵 누락

소스 맵이 업로드되지 않으면 스택 트레이스가 난독화된 코드를 가리켜 디버깅이 불가능합니다.

**확인 방법:**
```bash
# Sentry CLI로 릴리스별 소스 맵 업로드 상태 확인
sentry-cli releases files <RELEASE_NAME> list

# 소스 맵 업로드 테스트
sentry-cli sourcemaps explain <EVENT_ID>
```

**흔한 원인과 해결:**
- `vite.config.ts`에서 `sourcemap: true` 미설정 → 빌드 옵션 확인
- `SENTRY_AUTH_TOKEN` 환경 변수 미설정 → CI/CD 환경 변수 확인
- `release` 이름 불일치 → SDK `init`과 빌드 플러그인의 release 이름 동일하게 설정

### 9.3 PII(개인식별정보) 유출

```typescript
// ❌ 사용자의 민감 정보가 Sentry에 그대로 전송됨
Sentry.setUser({
  email: "user@example.com",     // 평문 이메일
  ip_address: "123.456.789.0",   // IP 주소
  username: "홍길동",              // 실명
});

// ✅ 민감 정보 해시 처리 또는 제거
Sentry.setUser({
  id: "user-uuid-12345",          // 식별 가능하지만 비민감 ID
  email: hashEmail(email),         // 해시된 이메일
  segment: "enterprise",           // 비민감 세그먼트 정보만
});

// ✅ Sentry 프로젝트 설정에서 Data Scrubbing 활성화
// Settings > Security & Privacy > Data Scrubbing
// - "Scrub data" 활성화
// - "Scrub IP addresses" 활성화
// - 커스텀 필드 추가: password, token, secret, authorization
```

### 9.4 과도한 이벤트 볼륨 (할당량 초과)

```typescript
// Sentry 할당량을 초과하면 이벤트가 드롭됩니다.
// beforeSend에서 불필요한 이벤트를 필터링하세요.

Sentry.init({
  // ... 기본 설정
  beforeSend(event, hint) {
    const error = hint.originalException;

    // 봇/크롤러에서 발생하는 에러 무시
    if (event.request?.headers?.["user-agent"]?.match(/bot|crawler|spider/i)) {
      return null;
    }

    // 개발자 도구에서 발생하는 에러 무시
    if (error instanceof Error && error.stack?.includes("chrome-extension://")) {
      return null;
    }

    return event;
  },

  // 이벤트 전송 속도 제한 (클라이언트측)
  maxBreadcrumbs: 50,       // 기본값 100 → 50으로 축소
});
```

---

## ✅ 체크리스트

### SDK 설정
- [ ] `@sentry/react` 및 `@sentry/vite-plugin`이 최신 버전(v8+)으로 설치되어 있나요?
- [ ] 환경별(`production`, `staging`, `development`) 샘플링 비율이 적절하게 설정되어 있나요?
- [ ] `ignoreErrors`에 무의미한 브라우저 에러 패턴이 등록되어 있나요?

### 소스 맵
- [ ] 프로덕션 빌드 시 **소스 맵**이 Sentry에 정상적으로 업로드되나요?
- [ ] 업로드 후 로컬 소스 맵 파일이 삭제되어 외부 노출되지 않나요?
- [ ] SDK의 `release`와 빌드 플러그인의 `release` 이름이 일치하나요?

### 모니터링
- [ ] 에러 발생 시 사용자의 행동을 재현할 수 있는 **Session Replay**가 켜져 있나요?
- [ ] `httpClientIntegration`으로 4xx/5xx HTTP 에러가 추적되고 있나요?
- [ ] 주요 비즈니스 트랜잭션에 커스텀 성능 측정이 적용되어 있나요?

### 알람 및 대응
- [ ] 에러의 우선순위(P0~P3)에 따라 알람 채널이 분리되어 있나요?
- [ ] P0 장애 시 PagerDuty 또는 동등한 온콜 시스템이 연동되어 있나요?
- [ ] 장애 대응 5단계 프로세스가 팀원 전체에게 공유되어 있나요?

### 에러 처리
- [ ] 주요 페이지 및 기능별로 **Error Boundary**가 적용되어 있나요?
- [ ] `Sentry.captureException`과 `console.error`의 사용 기준이 팀 내에서 합의되어 있나요?
- [ ] 장애 복구 후 해당 에러를 재발 방지하기 위한 **테스트 코드**가 추가되었나요?

### 보안 및 개인정보
- [ ] 민감한 사용자 정보가 Sentry 로그에 노출되지 않도록 마스킹 처리가 되었나요?
- [ ] `Sentry.setUser`에 평문 이메일/이름 대신 해시값 또는 ID만 사용하고 있나요?
- [ ] Sentry 프로젝트 설정에서 Data Scrubbing이 활성화되어 있나요?
- [ ] `beforeSend`에서 쿠키 등 민감 정보를 제거하고 있나요?
