# Sentry 관리 표준 가이드 2026

## 목차

1. [AI + Sentry 모니터링](#ai--sentry-모니터링)
2. [Sentry SDK 2026 설정](#sentry-sdk-2026-설정)
3. [에러 수집 최적화](#에러-수집-최적화)
4. [Source Map 보안 관리](#source-map-보안-관리)
5. [Alert 정책 설계](#alert-정책-설계)
6. [민감정보 필터링](#민감정보-필터링)
7. [Release Health 및 배포 연동](#release-health-및-배포-연동)
8. [체크리스트](#체크리스트)

---

## AI + Sentry 모니터링

AI를 Sentry 워크플로우의 중심에 배치한다. 에러 수집부터 분석, 분류, 알림까지 전 과정에서 AI를 활용하여 사람의 개입을 최소화하고, 근본 원인 파악 속도를 극대화한다.

### AI Issue Grouping 설정

Sentry의 AI Issue Grouping은 머신러닝 기반으로 스택트레이스, 에러 메시지, 컨텍스트를 종합 분석하여 유사 에러를 자동 그룹핑한다. 기존 fingerprint 기반보다 정확도가 높다.

**활성화 경로:** Sentry Dashboard > Settings > Issue Grouping > Enable AI Grouping

```typescript
// AI 그룹핑을 보강하는 커스텀 컨텍스트 추가
// AI가 더 정확한 그룹핑을 수행하도록 구조화된 데이터 제공
Sentry.setContext("business_context", {
  module: "payment",
  flow: "checkout",
  provider: "toss",
});

// AI 그룹핑 오버라이드가 필요한 경우 (예: 외부 API 에러)
Sentry.captureException(error, {
  fingerprint: ["external-api", apiProvider, endpoint],
  tags: {
    ai_group_hint: "external-dependency-failure",
  },
});
```

**AI Grouping 튜닝 설정:**

```typescript
// sentry.config.ts
Sentry.init({
  // AI Grouping에 더 많은 컨텍스트를 제공하는 이벤트 프로세서
  beforeSend(event) {
    if (event.exception?.values) {
      event.exception.values.forEach((exception) => {
        // 에러 분류 힌트를 태그로 추가
        if (exception.type?.includes("TypeError")) {
          event.tags = { ...event.tags, error_category: "type-safety" };
        }
        if (exception.type?.includes("NetworkError")) {
          event.tags = { ...event.tags, error_category: "network" };
        }
      });
    }
    return event;
  },
});
```

### Claude/GPT를 활용한 Sentry 에러 자동 분석

Sentry Webhook으로 수신한 에러를 LLM에 전달하여 자동 분석한다. 아래 프롬프트는 실전에서 검증된 패턴이다.

**프롬프트 1: 에러 근본 원인 분석**

```text
당신은 시니어 프론트엔드 엔지니어입니다.
아래 Sentry 에러 정보를 분석하여 근본 원인과 해결 방안을 제시하세요.

## 에러 정보
- 에러 타입: {{exception_type}}
- 에러 메시지: {{exception_message}}
- 스택트레이스:
{{stacktrace}}

## 환경 정보
- 브라우저: {{browser}}
- OS: {{os}}
- URL: {{url}}
- 사용자 액션: {{breadcrumbs_last_5}}

## 요청 형식
1. 근본 원인 (한 줄 요약)
2. 상세 분석 (코드 레벨)
3. 수정 방안 (코드 예시 포함)
4. 재발 방지 대책
5. 심각도 판단 (Critical/High/Medium/Low)
```

**프롬프트 2: 반복 에러 패턴 분석**

```text
아래는 최근 7일간 발생한 Sentry 에러 목록입니다.
패턴을 분석하여 공통 원인과 우선 해결 순서를 제안하세요.

## 에러 목록
{{error_list_with_count_and_first_seen}}

## 요청 형식
1. 에러 그룹 분류 (공통 원인별)
2. 각 그룹의 근본 원인 추정
3. 해결 우선순위 (사용자 영향도 기준)
4. 하나의 수정으로 여러 에러를 해결할 수 있는 경우 명시
```

**프롬프트 3: Release 영향 분석**

```text
새 릴리스 배포 후 발생한 에러를 이전 릴리스와 비교 분석하세요.

## 새 릴리스 에러 ({{new_release}})
{{new_errors}}

## 이전 릴리스 에러 ({{prev_release}})
{{prev_errors}}

## 요청 형식
1. 신규 에러 (이전 릴리스에 없던 에러)
2. 악화된 에러 (발생 빈도 증가)
3. 해결된 에러 (더 이상 발생하지 않는 에러)
4. 롤백 필요 여부 판단 (근거 포함)
5. 핫픽스 필요 항목 목록
```

### AI 기반 에러 자동 분류 및 담당자 할당

Sentry Ownership Rules와 AI를 결합하여 에러를 자동으로 분류하고 담당자를 할당한다.

```typescript
// scripts/sentry-ai-classifier.ts
// Sentry Webhook에서 호출되는 에러 분류기

import Anthropic from "@anthropic-ai/sdk";

interface SentryEvent {
  title: string;
  culprit: string;
  tags: Record<string, string>;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename: string; function: string }> };
    }>;
  };
}

interface ClassificationResult {
  team: string;
  assignee: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
}

const TEAM_MAP: Record<string, { slack: string; members: string[] }> = {
  payment: { slack: "#team-payment", members: ["alice", "bob"] },
  auth: { slack: "#team-auth", members: ["charlie", "dave"] },
  platform: { slack: "#team-platform", members: ["eve", "frank"] },
};

async function classifyError(event: SentryEvent): Promise<ClassificationResult> {
  const client = new Anthropic();

  const prompt = `
    에러를 분석하여 담당 팀, 우선순위, 카테고리를 JSON으로 반환하세요.

    팀 목록: ${Object.keys(TEAM_MAP).join(", ")}

    에러 정보:
    - 제목: ${event.title}
    - 소스: ${event.culprit}
    - 타입: ${event.exception?.values?.[0]?.type}
    - 메시지: ${event.exception?.values?.[0]?.value}
    - 파일 경로: ${event.exception?.values?.[0]?.stacktrace?.frames
      ?.map((f) => f.filename)
      .join(", ")}

    JSON 형식: { "team": string, "priority": "critical"|"high"|"medium"|"low", "category": string }
  `;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  const text = content.type === "text" ? content.text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const result = JSON.parse(jsonMatch![0]);

  const team = TEAM_MAP[result.team] || TEAM_MAP.platform;
  return {
    team: result.team,
    assignee: team.members[0],
    priority: result.priority,
    category: result.category,
  };
}
```

**Sentry Ownership Rules 설정 (`.sentry/CODEOWNERS`):**

```text
# 경로 기반 자동 할당 (AI 분류의 fallback)
path:src/features/payment/*    #team-payment
path:src/features/auth/*       #team-auth
path:src/shared/*              #team-platform

# URL 기반 할당
url:/checkout/*                #team-payment
url:/login/*                   #team-auth

# 에러 태그 기반 할당
tags.error_category:network    #team-platform
tags.error_category:payment    #team-payment
```

### Sentry -> Slack AI 요약 자동 전송 파이프라인

Sentry Webhook 이벤트를 받아 AI로 요약한 후 Slack에 전송하는 파이프라인이다.

```typescript
// functions/sentry-slack-pipeline.ts
// Sentry Webhook -> AI 분석 -> Slack 전송

import Anthropic from "@anthropic-ai/sdk";

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: Array<{ type: string; text: string }>;
}

interface SentryWebhookPayload {
  action: string;
  data: {
    issue: {
      title: string;
      culprit: string;
      count: string;
      firstSeen: string;
      lastSeen: string;
      permalink: string;
      metadata: {
        type: string;
        value: string;
      };
    };
  };
}

async function handleSentryWebhook(payload: SentryWebhookPayload): Promise<void> {
  const { issue } = payload.data;

  // 1. AI로 에러 요약 생성
  const client = new Anthropic();
  const aiResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `
          Sentry 에러를 Slack에 공유할 요약을 작성하세요.
          비개발자도 이해할 수 있는 수준으로, 사용자 영향을 중심으로 서술하세요.

          에러: ${issue.title}
          소스: ${issue.culprit}
          발생횟수: ${issue.count}
          에러타입: ${issue.metadata.type}
          에러메시지: ${issue.metadata.value}

          형식:
          1. 한 줄 요약 (사용자 영향 중심)
          2. 기술적 원인 (간결하게)
          3. 권장 조치
        `,
      },
    ],
  });

  const content = aiResponse.content[0];
  const summary = content.type === "text" ? content.text : "";

  // 2. Slack Block Kit 메시지 구성
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `Sentry Alert: ${issue.title.slice(0, 100)}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: summary },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*발생 횟수:* ${issue.count}` },
        { type: "mrkdwn", text: `*최초 발생:* ${issue.firstSeen}` },
        { type: "mrkdwn", text: `*최근 발생:* ${issue.lastSeen}` },
        { type: "mrkdwn", text: `*링크:* <${issue.permalink}|Sentry에서 보기>` },
      ],
    },
  ];

  // 3. Slack 전송
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
}
```

### AI로 반복 에러 패턴 분석 및 근본 원인 추적

Sentry API에서 이슈 목록을 조회하여 AI로 패턴을 분석하는 주기적 작업이다.

```typescript
// scripts/sentry-pattern-analysis.ts
// cron으로 주 1회 실행 — 반복 에러 패턴 분석

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
}

async function analyzeWeeklyPatterns(): Promise<void> {
  // 1. Sentry API에서 최근 7일 이슈 조회
  const response = await fetch(
    `https://sentry.io/api/0/projects/${process.env.SENTRY_ORG}/${process.env.SENTRY_PROJECT}/issues/?query=is:unresolved+firstSeen:-7d&sort=freq`,
    {
      headers: { Authorization: `Bearer ${process.env.SENTRY_API_TOKEN}` },
    }
  );
  const issues: SentryIssue[] = await response.json();

  // 2. AI 패턴 분석
  const analysisPrompt = `
    아래 Sentry 에러 목록의 패턴을 분석하세요.

    ${issues.map((i) => `- [${i.count}회, 영향 ${i.userCount}명] ${i.title} (${i.culprit})`).join("\n")}

    분석 요청:
    1. 공통 근본 원인으로 묶을 수 있는 에러 그룹
    2. 각 그룹의 추정 근본 원인
    3. 하나의 수정으로 여러 에러를 해결할 수 있는 항목
    4. 해결 우선순위 (사용자 영향도 x 발생빈도)
    5. 아키텍처 레벨 개선이 필요한 영역
  `;

  // 3. 분석 결과를 Slack으로 전송 (위의 파이프라인 재활용)
  // 4. 높은 우선순위 항목은 Jira 티켓 자동 생성
}
```

---

## Sentry SDK 2026 설정

### 기본 초기화

```typescript
// sentry.config.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_APP_ENV, // "production" | "staging" | "development"
  release: `app@${process.env.VITE_APP_VERSION}`,

  // Performance Monitoring v2
  tracesSampleRate: process.env.VITE_APP_ENV === "production" ? 0.2 : 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/api\.example\.com/],

  // Session Replay
  replaysSessionSampleRate: 0.1, // 전체 세션의 10% 기록
  replaysOnErrorSampleRate: 1.0, // 에러 발생 세션은 100% 기록

  // 통합 모듈
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: false,
      // 민감 영역 선택적 마스킹
      mask: [".sensitive-data", '[data-sentry-mask="true"]'],
      block: [".pii-content"],
      unmask: [".safe-to-show"],
    }),
    Sentry.feedbackIntegration({
      colorScheme: "system",
      showBranding: false,
    }),
  ],

  // 에러 필터링 (beforeSend 섹션에서 상세 설명)
  beforeSend(event) {
    return filterEvent(event);
  },
});
```

### React 19 Error Boundary 연동

React 19의 Error Boundary와 Sentry를 통합하여 컴포넌트 레벨 에러를 정확하게 포착한다.

```typescript
// components/SentryErrorBoundary.tsx
import * as Sentry from "@sentry/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  /** 에러 컨텍스트를 Sentry에 추가하기 위한 식별자 */
  boundary: string;
}

interface State {
  hasError: boolean;
}

class SentryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.withScope((scope) => {
      scope.setTag("boundary", this.props.boundary);
      scope.setContext("react", {
        componentStack: errorInfo.componentStack,
      });
      scope.setLevel("error");
      Sentry.captureException(error);
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Sentry의 래퍼를 활용한 간소화 버전
const SentryBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: ReactNode }) => <>{children}</>,
  {
    fallback: <div>오류가 발생했습니다. 페이지를 새로고침해 주세요.</div>,
    showDialog: true, // 사용자 피드백 다이얼로그 표시
  }
);

export { SentryErrorBoundary, SentryBoundary };
```

**페이지 레벨 적용:**

```typescript
// App.tsx
import { SentryErrorBoundary } from "./components/SentryErrorBoundary";

function App() {
  return (
    <SentryErrorBoundary boundary="app-root" fallback={<AppErrorFallback />}>
      <SentryErrorBoundary boundary="header" fallback={<HeaderFallback />}>
        <Header />
      </SentryErrorBoundary>
      <SentryErrorBoundary boundary="main-content" fallback={<ContentFallback />}>
        <MainContent />
      </SentryErrorBoundary>
    </SentryErrorBoundary>
  );
}
```

### 구조화된 에러 리포팅 (커스텀 에러 클래스)

에러를 구조화하면 Sentry에서 분류와 검색이 쉬워지고, AI 분석의 정확도도 올라간다.

```typescript
// errors/base.ts

/** 모든 커스텀 에러의 베이스 클래스 */
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly severity: "critical" | "high" | "medium" | "low";
  abstract readonly userMessage: string;
  readonly metadata: Record<string, unknown>;

  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.metadata = metadata;
  }

  /** Sentry에 구조화된 형태로 보고 */
  report(): void {
    Sentry.withScope((scope) => {
      scope.setTag("error.code", this.code);
      scope.setTag("error.severity", this.severity);
      scope.setLevel(this.severity === "critical" ? "fatal" : "error");
      scope.setContext("error_metadata", this.metadata);
      scope.setFingerprint([this.code]);
      Sentry.captureException(this);
    });
  }
}

// errors/api.ts
class ApiError extends AppError {
  readonly code: string;
  readonly severity: "critical" | "high" | "medium" | "low";
  readonly userMessage: string;

  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, { status, endpoint, ...metadata });
    this.code = `API_${status}`;
    this.severity = status >= 500 ? "high" : "medium";
    this.userMessage =
      status >= 500
        ? "서버에 일시적인 문제가 발생했습니다."
        : "요청을 처리할 수 없습니다.";
  }
}

// errors/payment.ts
class PaymentError extends AppError {
  readonly code: string;
  readonly severity = "critical" as const;
  readonly userMessage = "결제 처리 중 문제가 발생했습니다.";

  constructor(
    public readonly provider: string,
    public readonly errorCode: string,
    message: string
  ) {
    super(message, { provider, errorCode });
    this.code = `PAYMENT_${provider.toUpperCase()}_${errorCode}`;
  }
}
```

**사용 예시:**

```typescript
async function processPayment(orderId: string): Promise<void> {
  try {
    const result = await paymentApi.charge(orderId);
    if (!result.success) {
      throw new PaymentError("toss", result.errorCode, result.message);
    }
  } catch (error) {
    if (error instanceof AppError) {
      error.report();
    } else {
      Sentry.captureException(error);
    }
    throw error;
  }
}
```

### Session Replay 설정 (민감정보 마스킹)

Session Replay는 에러 발생 전후의 사용자 행동을 영상으로 재현한다. 민감정보 마스킹이 핵심이다.

```typescript
// sentry.replay.ts
Sentry.replayIntegration({
  // 텍스트 마스킹
  maskAllText: false, // 전체 마스킹 대신 선택적 마스킹
  mask: [
    // CSS 선택자로 마스킹 대상 지정
    "input[type='password']",
    "input[type='email']",
    "[data-sentry-mask]",
    ".user-name",
    ".phone-number",
    ".address",
    ".credit-card",
  ],

  // 입력 필드 마스킹
  maskAllInputs: true, // 모든 입력 필드는 기본 마스킹

  // 미디어 차단
  block: [
    ".profile-image", // 프로필 사진
    ".id-document", // 신분증
    "[data-sentry-block]",
  ],

  // 마스킹 해제 (마스킹하지 않아도 되는 요소)
  unmask: [
    ".product-name",
    ".button-text",
    "h1", "h2", "h3",
    "[data-sentry-unmask]",
  ],

  // 네트워크 요청 캡처
  networkDetailAllowUrls: [/^https:\/\/api\.example\.com/],
  networkDetailDenyUrls: [/\/auth\//, /\/payment\//],
  networkCaptureBodies: false,
  networkRequestHeaders: ["X-Request-Id"],
  networkResponseHeaders: ["X-Request-Id"],
});
```

### Performance Monitoring v2 (Web Vitals 자동 수집)

```typescript
// sentry.performance.ts
import * as Sentry from "@sentry/react";
import {
  createBrowserRouter,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

Sentry.init({
  integrations: [
    Sentry.browserTracingIntegration({
      // React Router v7 연동
      routingInstrumentation: Sentry.reactRouterV7BrowserTracingIntegration(
        { useEffect: undefined as any, useLocation, useNavigationType, createRoutesFromChildren: undefined as any, matchRoutes } // 실제 프로젝트에서 적절한 import 사용
      ),
    }),
  ],

  // Web Vitals 자동 수집 (LCP, FID, CLS, INP, TTFB)
  enableTracing: true,
  tracesSampleRate: 0.2,
});

// 커스텀 성능 측정
function measureApiCall(name: string, fn: () => Promise<unknown>): Promise<unknown> {
  return Sentry.startSpan(
    {
      name,
      op: "http.client",
      attributes: { "sentry.origin": "manual" },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: 1, message: "ok" });
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: "internal_error" });
        throw error;
      }
    }
  );
}

// 사용 예시
async function fetchUserProfile(userId: string): Promise<unknown> {
  return measureApiCall(`GET /users/${userId}`, () =>
    fetch(`/api/users/${userId}`).then((r) => r.json())
  );
}
```

---

## 에러 수집 최적화

### 동적 샘플링 전략

환경과 트랜잭션 유형에 따라 샘플링 비율을 동적으로 조절한다.

```typescript
// sentry.sampling.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  tracesSampler(samplingContext) {
    const { name, attributes } = samplingContext;

    // 헬스체크 요청은 수집하지 않음
    if (name?.includes("/health") || name?.includes("/readiness")) {
      return 0;
    }

    // 결제 관련 트랜잭션은 100% 수집
    if (name?.includes("/payment") || name?.includes("/checkout")) {
      return 1.0;
    }

    // 관리자 페이지는 낮은 비율
    if (name?.includes("/admin")) {
      return 0.05;
    }

    // 정적 리소스 요청은 수집하지 않음
    if (name?.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
      return 0;
    }

    // API 호출은 환경별 다른 비율
    if (attributes?.["http.method"]) {
      switch (process.env.VITE_APP_ENV) {
        case "production":
          return 0.1;
        case "staging":
          return 0.5;
        default:
          return 1.0;
      }
    }

    // 기본 샘플링 비율
    return process.env.VITE_APP_ENV === "production" ? 0.2 : 1.0;
  },
});
```

### Rate Limiting 설정

Sentry 클라이언트 측에서 이벤트 발생량을 제한한다.

```typescript
// sentry.ratelimit.ts
Sentry.init({
  // 클라이언트 리포트 제한
  maxBreadcrumbs: 50, // 브레드크럼 최대 개수
  maxValueLength: 1000, // 문자열 값 최대 길이

  // Transport 레벨 제한
  transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  transportOptions: {
    // 네트워크 오프라인 시 로컬 저장 후 재전송
  },
});

// 애플리케이션 레벨 Rate Limiting
class SentryRateLimiter {
  private eventCounts = new Map<string, { count: number; resetAt: number }>();
  private readonly maxEventsPerMinute = 10;
  private readonly windowMs = 60_000;

  shouldSend(eventKey: string): boolean {
    const now = Date.now();
    const entry = this.eventCounts.get(eventKey);

    if (!entry || now > entry.resetAt) {
      this.eventCounts.set(eventKey, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxEventsPerMinute) {
      return false;
    }

    entry.count++;
    return true;
  }
}

const rateLimiter = new SentryRateLimiter();

// beforeSend에서 Rate Limiting 적용
function filterEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  const errorType = event.exception?.values?.[0]?.type || "unknown";
  if (!rateLimiter.shouldSend(errorType)) {
    return null; // 이벤트 드롭
  }
  return event;
}
```

### 비용 관리 대시보드

Sentry 대시보드에서 비용과 사용량을 모니터링하기 위한 설정이다.

```typescript
// Sentry Organization Settings에서 설정:
// 1. Spike Protection: 활성화 (급격한 이벤트 증가 시 자동 제한)
// 2. Spend Allocation: 프로젝트별 예산 배분
// 3. Rate Limits: 프로젝트별 초당 이벤트 상한

// 비용 모니터링 스크립트 (주기적 실행)
async function checkSentryUsage(): Promise<void> {
  const response = await fetch(
    `https://sentry.io/api/0/organizations/${process.env.SENTRY_ORG}/stats_v2/?category=error&field=sum(quantity)&interval=1d&statsPeriod=30d`,
    {
      headers: { Authorization: `Bearer ${process.env.SENTRY_API_TOKEN}` },
    }
  );
  const stats = await response.json();

  const totalEvents = stats.groups[0]?.totals["sum(quantity)"] || 0;
  const monthlyQuota = 100_000; // 월간 할당량

  const usagePercent = (totalEvents / monthlyQuota) * 100;

  if (usagePercent > 80) {
    // Slack 알림: 할당량 80% 초과 경고
    await notifySlack(`Sentry 월간 사용량 ${usagePercent.toFixed(1)}% 도달. 샘플링 비율 조정 검토 필요.`);
  }
}
```

### beforeSend로 노이즈 필터링

```typescript
// sentry.filter.ts

/** 무시할 에러 패턴 목록 */
const IGNORED_ERRORS: Array<string | RegExp> = [
  // 브라우저 확장 프로그램 에러
  "chrome-extension://",
  "moz-extension://",
  // 네트워크 일시 단절
  "Failed to fetch",
  "NetworkError",
  "Load failed",
  // 사용자 취소
  "AbortError",
  // 서드파티 스크립트
  /^Script error\.?$/,
  // 리사이즈 옵저버 (무해한 에러)
  "ResizeObserver loop",
  // 구형 브라우저 호환성
  /Object doesn't support property or method/,
];

/** 무시할 URL 패턴 */
const IGNORED_URLS: RegExp[] = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /googletagmanager\.com/i,
  /analytics\.google\.com/i,
  /hotjar\.com/i,
];

function filterEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  const errorMessage = event.exception?.values?.[0]?.value || "";
  const errorType = event.exception?.values?.[0]?.type || "";

  // 1. 에러 메시지 패턴 필터
  for (const pattern of IGNORED_ERRORS) {
    if (typeof pattern === "string" && errorMessage.includes(pattern)) return null;
    if (pattern instanceof RegExp && pattern.test(errorMessage)) return null;
  }

  // 2. URL 패턴 필터 (서드파티 스크립트 에러 제외)
  const frames = event.exception?.values?.[0]?.stacktrace?.frames || [];
  const isThirdParty = frames.every(
    (frame) => frame.filename && IGNORED_URLS.some((pattern) => pattern.test(frame.filename!))
  );
  if (isThirdParty && frames.length > 0) return null;

  // 3. Bot/Crawler 트래픽 제외
  const userAgent = event.request?.headers?.["User-Agent"] || "";
  if (/bot|crawler|spider|headless/i.test(userAgent)) return null;

  // 4. Rate Limiting 적용
  if (!rateLimiter.shouldSend(errorType)) return null;

  return event;
}
```

---

## Source Map 보안 관리

Source Map은 프로덕션 에러의 디버깅에 필수이지만, 소스 코드 노출 위험이 있다. debugId 기반 업로드와 배포 후 삭제 패턴을 사용한다.

### debugId 기반 Source Map 업로드

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    sourcemap: true, // 빌드 시 Source Map 생성
  },
  plugins: [
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // debugId 기반 업로드 (release 이름 불필요)
      release: {
        name: process.env.VITE_APP_VERSION,
      },

      sourcemaps: {
        // Source Map 파일 패턴
        assets: "./dist/**/*.{js,map}",
        // 업로드 후 로컬 Source Map 삭제
        filesToDeleteAfterUpload: "./dist/**/*.map",
      },

      // 디버그 모드 (문제 해결 시 활성화)
      debug: false,
    }),
  ],
});
```

### Webpack 플러그인 설정

```typescript
// webpack.config.ts
import { sentryWebpackPlugin } from "@sentry/webpack-plugin";

export default {
  devtool: "source-map",
  plugins: [
    sentryWebpackPlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      release: {
        name: process.env.APP_VERSION,
      },

      sourcemaps: {
        assets: "./build/**/*.{js,map}",
        filesToDeleteAfterUpload: "./build/**/*.map",
      },
    }),
  ],
};
```

### CI/CD에서 업로드 후 삭제 패턴

```yaml
# .github/workflows/deploy.yml
name: Deploy with Sentry Source Maps

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: npm run build
        env:
          VITE_APP_VERSION: ${{ github.sha }}

      # Vite/Webpack 플러그인이 빌드 시 자동 업로드하므로
      # 별도 업로드 단계가 불필요. 플러그인 미사용 시 아래 방식 사용:
      - name: Upload Source Maps (플러그인 미사용 시)
        if: false # 플러그인 사용 시 비활성화
        run: |
          npx @sentry/cli sourcemaps upload \
            --org ${{ secrets.SENTRY_ORG }} \
            --project ${{ secrets.SENTRY_PROJECT }} \
            --auth-token ${{ secrets.SENTRY_AUTH_TOKEN }} \
            --release ${{ github.sha }} \
            ./dist

      - name: Verify Source Maps deleted from build
        run: |
          MAP_COUNT=$(find ./dist -name "*.map" | wc -l)
          if [ "$MAP_COUNT" -gt "0" ]; then
            echo "ERROR: Source Map files still exist in build output!"
            find ./dist -name "*.map" -delete
            echo "Deleted $MAP_COUNT source map files."
          fi

      - name: Deploy
        run: npm run deploy

      - name: Create Sentry Release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
          version: ${{ github.sha }}
```

---

## Alert 정책 설계

Alert은 반드시 액션 가능한 것만 설정한다. "알림 피로"를 방지하는 것이 핵심이다.

### Metric Alerts (P95 응답시간, 에러율)

Sentry Dashboard > Alerts > Create Alert > Metric Alert에서 설정한다.

| Alert 이름 | 조건 | 임계값 | 알림 대상 | 비고 |
|---|---|---|---|---|
| 에러율 급증 | `count()` | Warning: 50/5분, Critical: 200/5분 | Slack #alerts, PagerDuty | 5분 윈도우 |
| P95 응답시간 | `p95(transaction.duration)` | Warning: 3초, Critical: 5초 | Slack #performance | API 트랜잭션 대상 |
| LCP 저하 | `p75(measurements.lcp)` | Warning: 2.5초, Critical: 4초 | Slack #performance | 페이지 로드 성능 |
| INP 저하 | `p75(measurements.inp)` | Warning: 200ms, Critical: 500ms | Slack #performance | 인터랙션 성능 |
| Crash Free Rate 저하 | `crash_free_rate(session)` | Warning: 99%, Critical: 95% | Slack #releases, PagerDuty | 릴리스 안정성 |

### Issue Alerts (새 에러, 회귀)

| Alert 이름 | 조건 | 필터 | 알림 대상 |
|---|---|---|---|
| 새 에러 발생 | `FirstSeenEvent` | `level:error` | Slack #errors, 담당 팀 |
| 에러 회귀 | `RegressionEvent` | `is:resolved` | Slack #errors, 원래 해결자 |
| 에러 확산 | `EventFrequency > 100 in 1h` | `level:error` | Slack #alerts, PagerDuty |
| Critical 에러 | `NewEvent` | `tags.severity:critical` | PagerDuty, Slack #incidents |

### Uptime Monitoring 설정

```typescript
// Sentry Dashboard > Crons > Uptime Monitoring

// 또는 SDK에서 직접 설정 (Cron Monitoring)
import * as Sentry from "@sentry/node";

// 주기적 작업 모니터링 예시
async function scheduledJob(): Promise<void> {
  const checkInId = Sentry.captureCheckIn({
    monitorSlug: "daily-report-generation",
    status: "in_progress",
  });

  try {
    await generateDailyReport();

    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "daily-report-generation",
      status: "ok",
    });
  } catch (error) {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "daily-report-generation",
      status: "error",
    });
    throw error;
  }
}
```

**Uptime Monitor 설정 (대시보드):**

| Monitor 이름 | URL | 주기 | 타임아웃 | 알림 대상 |
|---|---|---|---|---|
| API Health | `https://api.example.com/health` | 1분 | 10초 | PagerDuty |
| Web Health | `https://www.example.com` | 1분 | 15초 | Slack #alerts |
| Auth Service | `https://auth.example.com/health` | 1분 | 10초 | PagerDuty |

### 에스컬레이션 정책

```
Level 1 (0분)   → Slack #alerts 알림
Level 2 (15분)  → 담당 팀 리드 PagerDuty 호출
Level 3 (30분)  → 엔지니어링 매니저 PagerDuty 호출
Level 4 (60분)  → CTO 에스컬레이션
```

에스컬레이션 조건:
- **Critical**: P95 응답시간 10초 초과 또는 에러율 5% 초과 시 즉시 Level 2
- **High**: Crash Free Rate 95% 미만 시 즉시 Level 2
- **자동 해제**: 지표가 정상 범위로 복귀하면 자동으로 에스컬레이션 해제

---

## 민감정보 필터링

### PII Scrubbing 설정

Sentry 서버 측 PII Scrubbing과 클라이언트 측 필터링을 이중으로 적용한다.

**서버 측 (Sentry Dashboard):**

Settings > Security & Privacy에서 설정:
- **Data Scrubbing**: 활성화
- **Default Scrubbing**: 활성화 (이메일, IP, 신용카드 등 자동 감지)
- **Sensitive Fields**: `password`, `token`, `secret`, `authorization`, `cookie`, `ssn`, `phone`
- **Safe Fields**: `error_code`, `status_code`, `request_id` (스크러빙 제외)

**클라이언트 측:**

```typescript
// sentry.pii.ts
Sentry.init({
  beforeSend(event) {
    // 요청 데이터에서 민감 정보 제거
    if (event.request) {
      // 쿠키 제거
      delete event.request.cookies;

      // Authorization 헤더 마스킹
      if (event.request.headers) {
        const sensitiveHeaders = ["Authorization", "Cookie", "X-API-Key"];
        for (const header of sensitiveHeaders) {
          if (event.request.headers[header]) {
            event.request.headers[header] = "[FILTERED]";
          }
        }
      }

      // 요청 바디에서 민감 필드 마스킹
      if (event.request.data && typeof event.request.data === "object") {
        event.request.data = scrubObject(event.request.data as Record<string, unknown>);
      }
    }

    // 사용자 정보 최소화
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      // ID만 유지 (에러 추적에 필요)
      event.user = { id: event.user.id };
    }

    // 브레드크럼에서 민감 데이터 제거
    if (event.breadcrumbs?.values) {
      event.breadcrumbs.values = event.breadcrumbs.values.map((crumb) => {
        if (crumb.data) {
          crumb.data = scrubObject(crumb.data as Record<string, unknown>);
        }
        return crumb;
      });
    }

    return event;
  },

  beforeBreadcrumb(breadcrumb) {
    // XHR/fetch 브레드크럼에서 인증 관련 URL 필터
    if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
      const url = breadcrumb.data?.url as string | undefined;
      if (url && /\/(auth|login|token)/.test(url)) {
        breadcrumb.data = { url: "[FILTERED_AUTH_URL]" };
      }
    }
    return breadcrumb;
  },
});

/** 객체에서 민감 필드를 재귀적으로 마스킹 */
function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = /password|token|secret|key|auth|credit|card|ssn|social/i;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.test(key)) {
      result[key] = "[FILTERED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = scrubObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}
```

### Session Replay 마스킹 규칙

```typescript
// 컴포넌트에서 마스킹 어트리뷰트 사용
function UserProfile({ user }: { user: User }) {
  return (
    <div>
      {/* 마스킹 대상 */}
      <p data-sentry-mask="true">{user.email}</p>
      <p data-sentry-mask="true">{user.phone}</p>

      {/* 차단 대상 (DOM 자체를 기록하지 않음) */}
      <div data-sentry-block="true">
        <CreditCardForm />
      </div>

      {/* 마스킹 제외 (안전한 데이터) */}
      <span data-sentry-unmask="true">{user.displayName}</span>
    </div>
  );
}
```

---

## Release Health 및 배포 연동

### Release Health 모니터링 (Crash Free Rate)

```typescript
// sentry.release.ts
Sentry.init({
  release: `app@${process.env.VITE_APP_VERSION}`,

  // 세션 추적 활성화 (Release Health 필수)
  autoSessionTracking: true,

  // 세션 종료 감지
  // 브라우저 탭 비활성화 시 세션 종료로 처리
});

// 릴리스별 커스텀 태그 추가
Sentry.setTag("deploy.region", process.env.DEPLOY_REGION || "ap-northeast-2");
Sentry.setTag("deploy.commit", process.env.VITE_COMMIT_SHA?.slice(0, 7) || "unknown");
```

**모니터링 지표:**

| 지표 | 목표치 | 경고 임계값 | 위험 임계값 |
|---|---|---|---|
| Crash Free Session Rate | 99.5% | 99.0% | 95.0% |
| Crash Free User Rate | 99.5% | 99.0% | 95.0% |
| Adoption Rate (24h) | 90% | 50% | 30% |
| Error Count (신규) | 0 | 5 | 20 |

### Deploy 연동 (GitHub Actions)

```yaml
# .github/workflows/sentry-release.yml
name: Sentry Release

on:
  push:
    branches: [main]

jobs:
  sentry-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # 커밋 히스토리 필요 (커밋 연결)

      - name: Create Sentry Release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
          version: ${{ github.sha }}
          set_commits: auto # 커밋 자동 연결
          started_at: ${{ github.event.head_commit.timestamp }}
          finalize: true

      # 배포 후 Sentry Release Health 모니터링
      - name: Monitor Release Health
        run: |
          echo "Release ${{ github.sha }} created."
          echo "Monitor at: https://sentry.io/organizations/${{ secrets.SENTRY_ORG }}/releases/${{ github.sha }}/"
```

### 외부 서비스 연동

**Slack 연동:**

Sentry Dashboard > Settings > Integrations > Slack

```text
연동 설정:
1. Slack 워크스페이스 연결
2. Alert Rule에서 알림 채널 지정:
   - #sentry-errors: 모든 새 에러
   - #sentry-alerts: Metric Alert (P95, 에러율)
   - #sentry-releases: Release Health 변경
3. Issue Alert Action으로 "Send Slack notification" 추가
```

**PagerDuty 연동:**

```text
연동 설정:
1. Sentry > Settings > Integrations > PagerDuty
2. PagerDuty Service Key 입력
3. Alert Rule에서 에스컬레이션 조건 설정:
   - Critical Alert → PagerDuty Incident 자동 생성
   - Incident 해결 시 Sentry Issue 자동 Resolve
```

**Jira 연동:**

```text
연동 설정:
1. Sentry > Settings > Integrations > Jira
2. Jira 프로젝트 매핑 설정
3. Sentry Issue에서 "Create Jira Issue" 버튼으로 티켓 생성
4. 양방향 동기화:
   - Jira 티켓 Resolve → Sentry Issue 자동 Resolve
   - Sentry Issue Resolve → Jira 티켓 상태 업데이트
```

---

## 체크리스트

### 초기 설정

- [ ] Sentry DSN 환경변수 설정
- [ ] SDK 초기화 코드 추가 (environment, release 포함)
- [ ] AI Issue Grouping 활성화
- [ ] Session Replay 설정 (마스킹 규칙 포함)
- [ ] Performance Monitoring 활성화
- [ ] Source Map 업로드 플러그인 설정
- [ ] beforeSend 필터링 적용

### 보안

- [ ] PII Scrubbing 서버/클라이언트 이중 적용
- [ ] Session Replay 마스킹 규칙 검증
- [ ] Source Map 빌드 후 삭제 확인
- [ ] 민감 헤더(Authorization, Cookie) 필터링

### 모니터링

- [ ] Metric Alert 설정 (에러율, P95, Web Vitals)
- [ ] Issue Alert 설정 (새 에러, 회귀)
- [ ] Uptime Monitoring 설정
- [ ] 에스컬레이션 정책 문서화

### AI 연동

- [ ] Sentry Webhook -> AI 분석 파이프라인 구축
- [ ] Slack AI 요약 자동 전송 설정
- [ ] 주간 패턴 분석 자동화 (cron)
- [ ] AI 기반 에러 분류 및 담당자 할당 테스트

### 배포

- [ ] GitHub Actions Sentry Release 설정
- [ ] Slack/PagerDuty/Jira 연동
- [ ] Release Health 대시보드 확인
- [ ] 비용 사용량 모니터링 알림 설정
