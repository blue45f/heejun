# Sentry 관리 표준 — 장애 대응 자동화 & 멀티 베타 운영 (2026)

## 목차

1. [AI 기반 장애 대응 시나리오](#1-ai-기반-장애-대응-시나리오)
2. [Sentry 2026 신기능 활용](#2-sentry-2026-신기능-활용)
3. [OpenTelemetry + Sentry 통합](#3-opentelemetry--sentry-통합)
4. [멀티 베타: 환경별 Sentry 대시보드 자동 생성](#4-멀티-베타-환경별-sentry-대시보드-자동-생성)
5. [멀티 베타: Preview Release 자동 정리 스케줄러](#5-멀티-베타-preview-release-자동-정리-스케줄러)
6. [Source Map debugId — Vite 6 + Rolldown 설정](#6-source-map-debugid--vite-6--rolldown-설정)
7. [SDK 설정 표준](#7-sdk-설정-표준)
8. [체크리스트](#8-체크리스트)

---

## 1. AI 기반 장애 대응 시나리오

실전 장애 상황에서 AI를 활용하는 구체적 시나리오별 프롬프트와 자동화 파이프라인을 제공한다.

### 1.1 시나리오: "이 Sentry 이슈 원인 찾아줘"

Sentry Webhook으로 수신한 이슈 데이터를 AI에 전달하여 즉각적인 근본 원인 분석을 수행한다.

**프롬프트:**

```text
당신은 프론트엔드/백엔드 풀스택 시니어 엔지니어입니다.
아래 Sentry 이슈를 분석하여 근본 원인, 영향 범위, 즉시 조치 사항을 제시하세요.

## Sentry 이슈
- 이슈 ID: {{issue_id}}
- 에러 타입: {{exception_type}}
- 에러 메시지: {{exception_message}}
- 최초 발생: {{first_seen}}
- 발생 빈도: {{count}} (최근 1시간)
- 영향 사용자 수: {{user_count}}

## 스택트레이스
{{stacktrace}}

## 브레드크럼 (최근 10개)
{{breadcrumbs}}

## 태그
- 환경: {{environment}}
- 릴리즈: {{release}}
- 브라우저: {{browser}}
- URL: {{url}}

## 요청 형식
1. **근본 원인**: 1-2문장으로 핵심 원인 설명
2. **영향 범위**: 어떤 사용자/기능에 영향을 미치는지
3. **즉시 조치**: 지금 바로 할 수 있는 조치 (코드 수정, 롤백, 피처 플래그 등)
4. **장기 대책**: 재발 방지를 위한 구조적 개선안
5. **심각도 판단**: Critical / High / Medium / Low
```

**자동화 파이프라인:**

```ts
// src/lib/sentry/ai-analysis.ts
import Anthropic from "@anthropic-ai/sdk";

interface SentryIssuePayload {
  issueId: string;
  exceptionType: string;
  exceptionMessage: string;
  stacktrace: string;
  breadcrumbs: string;
  environment: string;
  release: string;
  browser: string;
  url: string;
  firstSeen: string;
  count: number;
  userCount: number;
}

interface AnalysisResult {
  rootCause: string;
  impactScope: string;
  immediateAction: string;
  longTermFix: string;
  severity: "Critical" | "High" | "Medium" | "Low";
}

export async function analyzeIssue(
  payload: SentryIssuePayload
): Promise<AnalysisResult> {
  const client = new Anthropic();

  const prompt = `당신은 프론트엔드/백엔드 풀스택 시니어 엔지니어입니다.
아래 Sentry 이슈를 분석하여 근본 원인, 영향 범위, 즉시 조치 사항을 JSON으로 응답하세요.

## Sentry 이슈
- 이슈 ID: ${payload.issueId}
- 에러 타입: ${payload.exceptionType}
- 에러 메시지: ${payload.exceptionMessage}
- 최초 발생: ${payload.firstSeen}
- 발생 빈도: ${payload.count} (최근 1시간)
- 영향 사용자 수: ${payload.userCount}

## 스택트레이스
${payload.stacktrace}

## 브레드크럼
${payload.breadcrumbs}

## 태그
- 환경: ${payload.environment}
- 릴리즈: ${payload.release}
- 브라우저: ${payload.browser}
- URL: ${payload.url}

JSON 형식으로만 응답하세요:
{
  "rootCause": "근본 원인",
  "impactScope": "영향 범위",
  "immediateAction": "즉시 조치",
  "longTermFix": "장기 대책",
  "severity": "Critical|High|Medium|Low"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text) as AnalysisResult;
}
```

### 1.2 시나리오: "이 스택트레이스에서 수정 코드 제안해줘"

**프롬프트:**

```text
아래 Sentry 스택트레이스와 해당 소스 코드를 분석하여 수정 코드를 제안해줘.

## 에러 정보
- 에러: {{exception_type}}: {{exception_message}}
- 파일: {{filename}}:{{lineno}}

## 스택트레이스
{{stacktrace}}

## 현재 소스 코드 (에러 발생 파일)
```tsx
{{source_code}}
```

## 요청
1. 에러 발생 원인을 코드 레벨에서 설명
2. 수정된 코드를 diff 형식으로 제안
3. 같은 패턴의 에러가 다른 곳에도 있을 수 있는지 검색할 grep 패턴 제시
4. 수정 후 확인할 테스트 케이스 제안
```

**Sentry Webhook → AI → Slack 자동 파이프라인:**

```ts
// src/lib/sentry/webhook-handler.ts
import { analyzeIssue } from "./ai-analysis";

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: Array<{ type: string; text: string }>;
}

async function postToSlack(
  webhookUrl: string,
  blocks: SlackBlock[]
): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
}

export async function handleSentryWebhook(
  rawPayload: Record<string, unknown>
): Promise<void> {
  const payload = extractSentryPayload(rawPayload);
  const analysis = await analyzeIssue(payload);

  const severityEmoji: Record<string, string> = {
    Critical: "P1",
    High: "P2",
    Medium: "P3",
    Low: "P4",
  };

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `[${severityEmoji[analysis.severity]}] Sentry 이슈 자동 분석`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `*에러:* \`${payload.exceptionType}: ${payload.exceptionMessage}\``,
          `*환경:* ${payload.environment} | *릴리즈:* ${payload.release}`,
          `*영향:* ${payload.userCount}명 | *빈도:* ${payload.count}회/시간`,
          "",
          `*근본 원인:* ${analysis.rootCause}`,
          `*영향 범위:* ${analysis.impactScope}`,
          `*즉시 조치:* ${analysis.immediateAction}`,
          `*장기 대책:* ${analysis.longTermFix}`,
        ].join("\n"),
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<https://sentry.io/issues/${payload.issueId}|Sentry에서 보기>`,
        },
      ],
    },
  ];

  const slackUrl = process.env.SLACK_WEBHOOK_URL!;
  await postToSlack(slackUrl, blocks);
}

function extractSentryPayload(
  raw: Record<string, unknown>
): import("./ai-analysis").SentryIssuePayload {
  // Sentry Webhook 페이로드에서 필요한 필드 추출
  const data = raw as Record<string, any>;
  const event = data.event ?? {};
  const exception = event.exception?.values?.[0] ?? {};

  return {
    issueId: String(data.id ?? ""),
    exceptionType: String(exception.type ?? "Unknown"),
    exceptionMessage: String(exception.value ?? ""),
    stacktrace: JSON.stringify(exception.stacktrace?.frames?.slice(-10) ?? []),
    breadcrumbs: JSON.stringify(event.breadcrumbs?.slice(-10) ?? []),
    environment: String(event.environment ?? "unknown"),
    release: String(event.release ?? "unknown"),
    browser: String(event.contexts?.browser?.name ?? "unknown"),
    url: String(event.request?.url ?? ""),
    firstSeen: String(data.first_seen ?? ""),
    count: Number(data.count ?? 1),
    userCount: Number(data.user_count ?? 0),
  };
}
```

### 1.3 시나리오: AI 기반 에러 자동 분류 + 담당자 할당

```ts
// src/lib/sentry/auto-assign.ts
import Anthropic from "@anthropic-ai/sdk";

interface AssignmentResult {
  category: string;
  team: string;
  assignee: string;
  priority: "P1" | "P2" | "P3" | "P4";
  reason: string;
}

const TEAM_MAP = {
  "auth-team": {
    paths: ["src/auth/", "src/lib/session/"],
    keywords: ["token", "session", "login", "OAuth"],
    members: ["alice", "bob"],
  },
  "payment-team": {
    paths: ["src/payment/", "src/billing/"],
    keywords: ["payment", "charge", "invoice", "stripe"],
    members: ["charlie", "diana"],
  },
  "platform-team": {
    paths: ["src/infra/", "src/lib/db/"],
    keywords: ["database", "redis", "timeout", "connection"],
    members: ["eve", "frank"],
  },
} as const;

export async function classifyAndAssign(
  exceptionType: string,
  message: string,
  stacktrace: string,
  userCount: number
): Promise<AssignmentResult> {
  const client = new Anthropic();

  const prompt = `에러를 분류하고 담당팀/담당자를 지정하세요.

## 에러
- 타입: ${exceptionType}
- 메시지: ${message}
- 영향 사용자: ${userCount}명

## 스택트레이스
${stacktrace}

## 팀 정보
${JSON.stringify(TEAM_MAP, null, 2)}

JSON 형식으로 응답:
{
  "category": "카테고리",
  "team": "팀 키 (auth-team|payment-team|platform-team)",
  "assignee": "담당자 이름",
  "priority": "P1|P2|P3|P4",
  "reason": "할당 이유"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text) as AssignmentResult;
}
```

---

## 2. Sentry 2026 신기능 활용

### 2.1 Trace Explorer

Trace Explorer를 사용하면 분산 트레이스를 시각적으로 탐색하고, 느린 트랜잭션의 근본 원인을 추적할 수 있다.

```ts
// Trace Explorer에서 유용한 쿼리 패턴

// 1. 특정 API 엔드포인트의 느린 트레이스 조회
// Sentry UI 쿼리: transaction:/api/orders/* AND transaction.duration:>2000

// 2. 프로그래매틱 쿼리 (Sentry API)
async function findSlowTraces(
  orgSlug: string,
  projectSlug: string,
  endpoint: string,
  thresholdMs: number
): Promise<unknown[]> {
  const response = await fetch(
    `https://sentry.io/api/0/organizations/${orgSlug}/events/?` +
      new URLSearchParams({
        dataset: "spansIndexed",
        field: ["trace", "transaction", "span.duration", "timestamp"],
        query: `transaction:${endpoint} span.duration:>${thresholdMs}`,
        sort: "-span.duration",
        per_page: "20",
        project: projectSlug,
      }),
    {
      headers: {
        Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
      },
    }
  );

  const data = await response.json();
  return data.data ?? [];
}
```

### 2.2 AI Autofix

Sentry AI Autofix는 에러를 자동으로 분석하고 수정 PR을 생성할 수 있다.

**AI Autofix 설정:**

```ts
// sentry.autofix.config.ts — 프로젝트 루트에 배치
export default {
  // Autofix가 분석할 코드 저장소 연결
  repos: [
    {
      provider: "github",
      owner: "your-org",
      name: "your-repo",
      defaultBranch: "main",
    },
  ],

  // Autofix가 PR을 자동 생성할지 여부
  autoPR: {
    enabled: true,
    // Critical/High 이슈에만 자동 PR 생성
    minSeverity: "high",
    // PR에 자동으로 리뷰어 할당
    reviewers: ["tech-lead"],
    // PR 라벨
    labels: ["autofix", "sentry"],
  },

  // 무시할 에러 패턴
  ignore: [
    "ResizeObserver loop",
    "Loading chunk",
    "Network Error",
  ],
};
```

**Autofix 결과를 Slack으로 전달:**

```ts
// src/lib/sentry/autofix-notify.ts
interface AutofixEvent {
  issueId: string;
  fixStatus: "suggested" | "pr_created" | "failed";
  prUrl?: string;
  suggestion?: string;
}

export async function notifyAutofix(event: AutofixEvent): Promise<void> {
  const statusMap = {
    suggested: "AI가 수정 제안을 생성했습니다",
    pr_created: "AI가 수정 PR을 생성했습니다",
    failed: "AI 분석에 실패했습니다 (수동 확인 필요)",
  };

  const message = [
    `*[Sentry Autofix]* ${statusMap[event.fixStatus]}`,
    `이슈: <https://sentry.io/issues/${event.issueId}|#${event.issueId}>`,
    event.prUrl ? `PR: <${event.prUrl}|수정 PR 보기>` : "",
    event.suggestion ? `\`\`\`${event.suggestion}\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}
```

### 2.3 Cron Monitoring

배치 작업/스케줄러의 실행 상태를 Sentry에서 모니터링한다.

```ts
// src/lib/sentry/cron-monitor.ts
import * as Sentry from "@sentry/node";

// 방법 1: 래퍼 함수
export async function withCronMonitor<T>(
  monitorSlug: string,
  job: () => Promise<T>
): Promise<T> {
  const checkInId = Sentry.captureCheckIn({
    monitorSlug,
    status: "in_progress",
  });

  try {
    const result = await job();

    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: "ok",
    });

    return result;
  } catch (error) {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: "error",
    });
    throw error;
  }
}

// 방법 2: 모니터 생성 (Upsert)
export function registerCronMonitor(
  slug: string,
  schedule: { type: "crontab"; value: string },
  options?: {
    checkinMargin?: number;
    maxRuntime?: number;
    timezone?: string;
  }
): void {
  Sentry.captureCheckIn(
    {
      monitorSlug: slug,
      status: "in_progress",
    },
    {
      schedule,
      checkinMargin: options?.checkinMargin ?? 5,
      maxRuntime: options?.maxRuntime ?? 30,
      timezone: options?.timezone ?? "Asia/Seoul",
    }
  );
}
```

```ts
// 사용 예: 일일 정산 배치
import { withCronMonitor } from "@/lib/sentry/cron-monitor";

async function dailySettlement(): Promise<void> {
  await withCronMonitor("daily-settlement", async () => {
    const orders = await db.order.findMany({
      where: {
        status: "COMPLETED",
        settledAt: null,
        completedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    for (const order of orders) {
      await processSettlement(order);
    }

    console.log(`${orders.length}건 정산 완료`);
  });
}
```

### 2.4 Uptime Monitoring v2

외부 URL의 가용성을 Sentry에서 직접 모니터링한다.

```ts
// Sentry API로 Uptime Monitor 생성
async function createUptimeMonitor(config: {
  orgSlug: string;
  projectSlug: string;
  name: string;
  url: string;
  intervalSeconds: number;
  expectedStatus?: number;
}): Promise<void> {
  await fetch(
    `https://sentry.io/api/0/organizations/${config.orgSlug}/monitors/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: config.name,
        type: "uptime",
        config: {
          url: config.url,
          interval_seconds: config.intervalSeconds,
          expected_status: config.expectedStatus ?? 200,
        },
        project: config.projectSlug,
      }),
    }
  );
}

// 주요 엔드포인트 Uptime 등록
async function setupUptimeMonitors(): Promise<void> {
  const endpoints = [
    { name: "API Health", url: "https://api.example.com/health", interval: 60 },
    { name: "Auth Service", url: "https://auth.example.com/ping", interval: 60 },
    { name: "CDN Status", url: "https://cdn.example.com/status", interval: 300 },
  ];

  for (const ep of endpoints) {
    await createUptimeMonitor({
      orgSlug: "your-org",
      projectSlug: "your-project",
      name: ep.name,
      url: ep.url,
      intervalSeconds: ep.interval,
    });
  }
}
```

---

## 3. OpenTelemetry + Sentry 통합

OTel SDK로 계측하고 Sentry를 백엔드로 사용하여, 벤더 종속 없이 텔레메트리를 수집한다.

### 3.1 OTel SDK → Sentry 아키텍처

```
[App] → [OTel SDK] → [OTel Collector] → [Sentry Backend]
                              ↓
                     [다른 백엔드 (Jaeger, Datadog 등)]
```

### 3.2 Node.js OTel + Sentry 설정

```ts
// src/instrumentation.ts
import * as Sentry from "@sentry/node";
import { SentrySpanProcessor } from "@sentry/opentelemetry";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

// Sentry 초기화 (OTel 모드)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.APP_ENV,
  tracesSampleRate: 1.0,
  // OTel과 통합할 때 Sentry의 자체 계측 비활성화
  skipOpenTelemetrySetup: false,
});

// OTel SDK 설정
const sdk = new NodeSDK({
  // Sentry로 span을 전송하는 processor
  spanProcessors: [new SentrySpanProcessor()],

  // 추가로 OTel Collector로도 전송 (선택)
  // traceExporter: new OTLPTraceExporter({
  //   url: "http://otel-collector:4318/v1/traces",
  // }),

  instrumentations: [
    getNodeAutoInstrumentations({
      // HTTP, Express, Prisma 등 자동 계측
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

sdk.start();

// 종료 시 flush
process.on("SIGTERM", async () => {
  await sdk.shutdown();
  await Sentry.close(5000);
  process.exit(0);
});
```

### 3.3 브라우저 OTel + Sentry 설정

```ts
// src/lib/otel-browser.ts
import * as Sentry from "@sentry/react";
import {
  SentrySpanProcessor,
  SentryPropagator,
} from "@sentry/opentelemetry";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { registerInstrumentations } from "@opentelemetry/instrumentation";

export function initBrowserOTel(): void {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.VITE_APP_ENV,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
  });

  const provider = new WebTracerProvider({
    spanProcessors: [new SentrySpanProcessor()],
  });

  provider.register({
    propagator: new SentryPropagator(),
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [
          /https:\/\/api\.example\.com/,
        ],
      }),
    ],
  });
}
```

### 3.4 커스텀 Span 생성 패턴

```ts
// src/lib/tracing.ts
import { trace, type Span, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("app", "1.0.0");

// 범용 래퍼: 함수 실행을 span으로 감싸기
export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes(attributes);
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

```ts
// 사용 예
import { withSpan } from "@/lib/tracing";

async function processOrder(orderId: string): Promise<Order> {
  return withSpan(
    "order.process",
    { "order.id": orderId },
    async (span) => {
      const order = await withSpan(
        "order.fetch",
        { "order.id": orderId },
        async () => db.order.findUniqueOrThrow({ where: { id: orderId } })
      );

      span.setAttribute("order.amount", order.totalAmount);

      const payment = await withSpan(
        "payment.charge",
        { "order.id": orderId, "payment.amount": order.totalAmount },
        async () => paymentGateway.charge(order)
      );

      span.setAttribute("payment.id", payment.id);

      return order;
    }
  );
}
```

---

## 4. 멀티 베타: 환경별 Sentry 대시보드 자동 생성

CDK/Terraform으로 환경이 생성될 때 Sentry 프로젝트, 대시보드, Alert 규칙을 함께 자동 프로비저닝한다.

### 4.1 Terraform Provider 기반

```hcl
# sentry/main.tf
terraform {
  required_providers {
    sentry = {
      source  = "jianyuan/sentry"
      version = "~> 0.14"
    }
  }
}

variable "environment" {
  type        = string
  description = "배포 환경 (production, staging, beta-a, beta-b, preview-PR-xxx)"
}

variable "team_slug" {
  type    = string
  default = "frontend"
}

# Sentry 프로젝트 생성
resource "sentry_project" "app" {
  organization = "your-org"
  teams        = [var.team_slug]
  name         = "app-${var.environment}"
  slug         = "app-${var.environment}"
  platform     = "javascript-react"

  resolve_age = var.environment == "production" ? 720 : 168
}

# 환경별 Alert 규칙
resource "sentry_issue_alert" "error_spike" {
  organization = "your-org"
  project      = sentry_project.app.slug
  name         = "[${var.environment}] Error Spike"

  conditions = jsonencode([{
    id       = "sentry.rules.conditions.event_frequency.EventFrequencyCondition"
    value    = var.environment == "production" ? 10 : 50
    interval = "1h"
  }])

  actions = jsonencode([{
    id        = "sentry.integrations.slack.notify_action.SlackNotifyServiceAction"
    workspace = data.sentry_organization.main.id
    channel   = var.environment == "production" ? "#alerts-prod" : "#alerts-${var.environment}"
  }])

  action_match = "all"
  frequency    = 1800
}

# 환경별 대시보드
resource "sentry_dashboard" "overview" {
  organization = "your-org"
  title        = "${var.environment} Overview"

  widgets = jsonencode([
    {
      title       = "Error Rate"
      displayType = "line"
      queries = [{
        name       = "errors"
        fields     = ["count()"]
        conditions = "environment:${var.environment}"
        orderby    = "-count()"
      }]
      layout = { x = 0, y = 0, w = 4, h = 2, minH = 2 }
    },
    {
      title       = "P95 Response Time"
      displayType = "line"
      queries = [{
        name       = "p95"
        fields     = ["p95(transaction.duration)"]
        conditions = "environment:${var.environment}"
        orderby    = "-p95(transaction.duration)"
      }]
      layout = { x = 4, y = 0, w = 4, h = 2, minH = 2 }
    },
    {
      title       = "Affected Users"
      displayType = "big_number"
      queries = [{
        name       = "users"
        fields     = ["count_unique(user)"]
        conditions = "environment:${var.environment} !level:info"
        orderby    = "-count_unique(user)"
      }]
      layout = { x = 0, y = 2, w = 2, h = 1, minH = 1 }
    },
  ])
}
```

### 4.2 CDK 기반 (TypeScript)

```ts
// infra/lib/sentry-stack.ts
import { Construct } from "constructs";

interface SentryEnvironmentConfig {
  environment: string;
  orgSlug: string;
  teamSlug: string;
  sentryAuthToken: string;
  slackChannel: string;
  errorThreshold: number;
}

export class SentryEnvironmentProvisioner {
  private baseUrl = "https://sentry.io/api/0";
  private headers: Record<string, string>;

  constructor(private config: SentryEnvironmentConfig) {
    this.headers = {
      Authorization: `Bearer ${config.sentryAuthToken}`,
      "Content-Type": "application/json",
    };
  }

  async provision(): Promise<{
    projectSlug: string;
    dsn: string;
    dashboardId: string;
  }> {
    // 1. 프로젝트 생성
    const project = await this.createProject();

    // 2. Alert 규칙 생성
    await this.createAlertRules(project.slug);

    // 3. 대시보드 생성
    const dashboard = await this.createDashboard();

    // 4. 환경별 샘플링 설정
    await this.configureSampling(project.slug);

    return {
      projectSlug: project.slug,
      dsn: project.dsn,
      dashboardId: dashboard.id,
    };
  }

  private async createProject(): Promise<{
    slug: string;
    dsn: string;
  }> {
    const response = await fetch(
      `${this.baseUrl}/teams/${this.config.orgSlug}/${this.config.teamSlug}/projects/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          name: `app-${this.config.environment}`,
          slug: `app-${this.config.environment}`,
          platform: "javascript-react",
        }),
      }
    );

    const data = await response.json();
    const keys = await this.getProjectKeys(data.slug);
    return { slug: data.slug, dsn: keys[0].dsn.public };
  }

  private async getProjectKeys(
    projectSlug: string
  ): Promise<Array<{ dsn: { public: string } }>> {
    const response = await fetch(
      `${this.baseUrl}/projects/${this.config.orgSlug}/${projectSlug}/keys/`,
      { headers: this.headers }
    );
    return response.json();
  }

  private async createAlertRules(projectSlug: string): Promise<void> {
    // 에러 스파이크 Alert
    await fetch(
      `${this.baseUrl}/projects/${this.config.orgSlug}/${projectSlug}/rules/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          name: `[${this.config.environment}] Error Spike`,
          actionMatch: "all",
          conditions: [
            {
              id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
              value: this.config.errorThreshold,
              interval: "1h",
            },
          ],
          actions: [
            {
              id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction",
              channel: this.config.slackChannel,
            },
          ],
          frequency: 1800,
        }),
      }
    );

    // P95 성능 Alert
    await fetch(
      `${this.baseUrl}/projects/${this.config.orgSlug}/${projectSlug}/alert-rules/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          name: `[${this.config.environment}] P95 Latency`,
          dataset: "transactions",
          aggregate: "p95(transaction.duration)",
          query: `environment:${this.config.environment}`,
          timeWindow: 10,
          triggers: [
            {
              label: "critical",
              alertThreshold: 3000,
              actions: [
                {
                  type: "slack",
                  targetIdentifier: this.config.slackChannel,
                },
              ],
            },
          ],
        }),
      }
    );
  }

  private async createDashboard(): Promise<{ id: string }> {
    const response = await fetch(
      `${this.baseUrl}/organizations/${this.config.orgSlug}/dashboards/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          title: `${this.config.environment} Overview`,
          widgets: [
            {
              title: "Error Rate (1h)",
              displayType: "line",
              queries: [
                {
                  name: "Errors",
                  fields: ["count()"],
                  conditions: `environment:${this.config.environment}`,
                },
              ],
            },
            {
              title: "Top Issues",
              displayType: "table",
              queries: [
                {
                  name: "Issues",
                  fields: ["issue", "title", "count()", "count_unique(user)"],
                  conditions: `environment:${this.config.environment}`,
                  orderby: "-count()",
                },
              ],
            },
          ],
        }),
      }
    );

    return response.json();
  }

  private async configureSampling(projectSlug: string): Promise<void> {
    const sampleRates: Record<string, number> = {
      production: 0.1,
      staging: 0.5,
      default: 1.0,
    };

    const rate =
      sampleRates[this.config.environment] ?? sampleRates.default;

    await fetch(
      `${this.baseUrl}/projects/${this.config.orgSlug}/${projectSlug}/dynamic-sampling/`,
      {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify({
          rules: [
            {
              sampleRate: rate,
              type: "transaction",
              condition: { op: "and", inner: [] },
            },
          ],
        }),
      }
    );
  }

  async teardown(): Promise<void> {
    const projectSlug = `app-${this.config.environment}`;
    await fetch(
      `${this.baseUrl}/projects/${this.config.orgSlug}/${projectSlug}/`,
      { method: "DELETE", headers: this.headers }
    );
  }
}
```

---

## 5. 멀티 베타: Preview Release 자동 정리 스케줄러

PR이 병합/닫히면 해당 Preview 환경의 Sentry Release, Deploy, 관련 아티팩트를 자동으로 정리한다.

### 5.1 GitHub Actions 기반 정리

```yaml
# .github/workflows/cleanup-preview-sentry.yml
name: Cleanup Preview Sentry Resources

on:
  pull_request:
    types: [closed]
  schedule:
    # 매일 03:00 KST에 오래된 Preview Release 정리
    - cron: "0 18 * * *"

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Cleanup Sentry Preview Resources
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: your-org
          SENTRY_PROJECT: your-project
          PR_NUMBER: ${{ github.event.pull_request.number }}
          EVENT_NAME: ${{ github.event_name }}
        run: npx tsx scripts/cleanup-sentry-preview.ts
```

### 5.2 정리 스크립트

```ts
// scripts/cleanup-sentry-preview.ts
interface SentryRelease {
  version: string;
  dateCreated: string;
  lastEvent: string | null;
  newGroups: number;
}

class SentryPreviewCleaner {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(
    private org: string,
    private project: string,
    authToken: string
  ) {
    this.baseUrl = "https://sentry.io/api/0";
    this.headers = {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * 특정 PR의 Preview Release 정리
   */
  async cleanupPR(prNumber: string): Promise<void> {
    const releasePrefix = `preview-PR-${prNumber}`;
    const releases = await this.listReleases(releasePrefix);

    console.log(
      `PR #${prNumber}: ${releases.length}개 Release 발견`
    );

    for (const release of releases) {
      await this.deleteRelease(release.version);
      console.log(`  삭제: ${release.version}`);
    }

    // Source Map 아티팩트도 정리
    for (const release of releases) {
      await this.deleteArtifacts(release.version);
    }
  }

  /**
   * 지정 일수 이상 오래된 모든 Preview Release 정리
   */
  async cleanupStale(maxAgeDays: number = 7): Promise<void> {
    const allReleases = await this.listReleases("preview-");
    const cutoff = new Date(
      Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    );

    const stale = allReleases.filter(
      (r) => new Date(r.dateCreated) < cutoff
    );

    console.log(
      `전체 Preview Release: ${allReleases.length}개, ` +
        `${maxAgeDays}일 이상 오래된 것: ${stale.length}개`
    );

    for (const release of stale) {
      await this.deleteRelease(release.version);
      await this.deleteArtifacts(release.version);
      console.log(`  삭제: ${release.version} (${release.dateCreated})`);
    }
  }

  private async listReleases(prefix: string): Promise<SentryRelease[]> {
    const response = await fetch(
      `${this.baseUrl}/organizations/${this.org}/releases/?` +
        new URLSearchParams({
          project: this.project,
          query: prefix,
          per_page: "100",
        }),
      { headers: this.headers }
    );

    return response.json();
  }

  private async deleteRelease(version: string): Promise<void> {
    await fetch(
      `${this.baseUrl}/organizations/${this.org}/releases/${encodeURIComponent(version)}/`,
      { method: "DELETE", headers: this.headers }
    );
  }

  private async deleteArtifacts(version: string): Promise<void> {
    // Release에 연결된 Source Map 파일들 조회 후 삭제
    const response = await fetch(
      `${this.baseUrl}/organizations/${this.org}/releases/${encodeURIComponent(version)}/files/`,
      { headers: this.headers }
    );

    const files: Array<{ id: string }> = await response.json();

    for (const file of files) {
      await fetch(
        `${this.baseUrl}/organizations/${this.org}/releases/${encodeURIComponent(version)}/files/${file.id}/`,
        { method: "DELETE", headers: this.headers }
      );
    }
  }
}

// 실행
async function main(): Promise<void> {
  const cleaner = new SentryPreviewCleaner(
    process.env.SENTRY_ORG!,
    process.env.SENTRY_PROJECT!,
    process.env.SENTRY_AUTH_TOKEN!
  );

  if (process.env.EVENT_NAME === "pull_request" && process.env.PR_NUMBER) {
    // PR 닫힘 이벤트 → 해당 PR만 정리
    await cleaner.cleanupPR(process.env.PR_NUMBER);
  } else {
    // 스케줄 실행 → 7일 이상 오래된 것 전체 정리
    await cleaner.cleanupStale(7);
  }
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
```

### 5.3 PR별 Release 태깅 (배포 시)

```ts
// scripts/create-preview-release.ts
// Preview 배포 시 Sentry Release 생성

async function createPreviewRelease(): Promise<void> {
  const prNumber = process.env.PR_NUMBER!;
  const commitSha = process.env.GITHUB_SHA!;
  const version = `preview-PR-${prNumber}-${commitSha.slice(0, 7)}`;

  const org = process.env.SENTRY_ORG!;
  const project = process.env.SENTRY_PROJECT!;
  const headers = {
    Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
    "Content-Type": "application/json",
  };
  const baseUrl = "https://sentry.io/api/0";

  // 1. Release 생성
  await fetch(`${baseUrl}/organizations/${org}/releases/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      version,
      projects: [project],
      refs: [
        {
          repository: `${process.env.GITHUB_REPOSITORY}`,
          commit: commitSha,
        },
      ],
    }),
  });

  // 2. Deploy 기록
  await fetch(
    `${baseUrl}/organizations/${org}/releases/${encodeURIComponent(version)}/deploys/`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        environment: `preview-PR-${prNumber}`,
        name: `Preview PR #${prNumber}`,
      }),
    }
  );

  // 3. Source Map 업로드는 별도 CLI로 처리
  // npx sentry-cli releases files $version upload-sourcemaps ./dist

  console.log(`Sentry Release 생성: ${version}`);
}

createPreviewRelease().catch(console.error);
```

---

## 6. Source Map debugId -- Vite 6 + Rolldown 설정

Vite 6의 Rolldown 번들러 환경에서 Sentry Source Map `debugId`를 설정하는 방법이다. `debugId`는 빌드 아티팩트와 Source Map을 Release 없이도 연결할 수 있는 매커니즘이다.

### 6.1 Vite 6 + Sentry 플러그인 설정

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => ({
  build: {
    // Source Map 생성 필수 (hidden = 브라우저에서 숨김)
    sourcemap: "hidden",
    // Rolldown 사용 시 (Vite 6 실험적 기능)
    // rollupOptions는 Rolldown과 호환
  },

  plugins: [
    react(),

    // Sentry Vite Plugin — 빌드 후 자동으로 debugId 주입 + 업로드
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // debugId 모드 (Release 기반이 아닌 debugId 기반)
      debug: mode === "development",

      sourcemaps: {
        // Source Map 파일 위치
        assets: "./dist/**/*.map",
        // 업로드 후 로컬에서 삭제
        filesToDeleteAfterUpload: "./dist/**/*.map",
      },

      // Release 정보도 함께 설정 (선택)
      release: {
        name: process.env.VITE_RELEASE_VERSION,
        // Git 커밋 정보 자동 포함
        setCommits: {
          auto: true,
        },
      },

      // Rolldown 호환 설정
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayIframe: true,
        excludeReplayShadowDom: true,
      },
    }),
  ],
}));
```

### 6.2 debugId 동작 원리

```ts
// Sentry Vite Plugin이 빌드 시 자동으로 수행하는 작업:

// 1. 각 번들 파일 끝에 debugId 주입
//    //# debugId=<uuid>
//    //# sourceMappingURL=...

// 2. 대응하는 .map 파일에도 동일한 debugId 삽입
//    { "debugId": "<uuid>", "version": 3, "sources": [...] }

// 3. Sentry 서버에 Source Map + debugId 업로드

// 4. 에러 발생 시:
//    브라우저가 에러 스택에서 debugId를 읽음 →
//    Sentry가 debugId로 Source Map을 매칭 →
//    원본 소스 코드 위치를 표시
```

### 6.3 Rolldown 환경 특이사항

```ts
// vite.config.ts — Rolldown 실험적 사용 시 추가 설정
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: "hidden",
    // Rolldown은 일부 Rollup 플러그인과 호환되지 않을 수 있음
    // Sentry Vite Plugin은 Vite 레벨 플러그인이므로 문제없음
  },

  // Rolldown 전용 최적화 (Vite 6 실험)
  experimental: {
    // renderBuiltUrl을 사용하여 CDN 경로 재작성 시
    // Source Map의 sources 경로도 함께 업데이트 필요
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === "js") {
        return { runtime: `window.__cdn_base + ${JSON.stringify(filename)}` };
      }
      return filename;
    },
  },
});
```

### 6.4 CI/CD에서 Source Map 업로드

```yaml
# .github/workflows/deploy.yml (발췌)
- name: Build with Source Maps
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: your-project
    VITE_RELEASE_VERSION: ${{ github.sha }}
  run: npm run build
  # sentryVitePlugin이 빌드 과정에서 자동으로:
  # 1. debugId 주입
  # 2. Source Map 업로드
  # 3. .map 파일 삭제

- name: Verify Source Maps Upload
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
  run: |
    npx sentry-cli sourcemaps explain \
      --org your-org \
      --project your-project \
      ${{ github.sha }}
```

### 6.5 Source Map 보안

```ts
// Source Map이 프로덕션에서 노출되지 않도록 확인

// 1. vite.config.ts에서 sourcemap: "hidden" 사용
//    → .map 파일은 생성되지만 JS 파일에 sourceMappingURL 주석 미삽입

// 2. CDN/서버에서 .map 파일 접근 차단
// nginx 예시:
// location ~* \.map$ {
//   deny all;
//   return 404;
// }

// 3. Sentry Plugin의 filesToDeleteAfterUpload로 배포 아티팩트에서 제거
// → Sentry 서버에만 Source Map이 존재

// 4. debugId 방식은 Release Name을 URL에 노출하지 않으므로
//    Source Map 파일명을 추측하기 더 어려움
```

---

## 7. SDK 설정 표준

### 7.1 브라우저 SDK (React)

```ts
// src/lib/sentry.ts
import * as Sentry from "@sentry/react";

export function initSentry(): void {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_APP_ENV ?? "development",
    release: import.meta.env.VITE_RELEASE_VERSION,
    enabled: import.meta.env.PROD,

    // 샘플링
    tracesSampleRate: getSampleRate(),
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    profilesSampleRate: 0.1,

    integrations: [
      Sentry.browserTracingIntegration({
        enableInp: true,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        networkDetailAllowUrls: [/\/api\//],
      }),
      Sentry.browserProfilingIntegration(),
      Sentry.feedbackIntegration({
        colorScheme: "system",
        triggerLabel: "버그 신고",
        formTitle: "문제가 발생했나요?",
        submitButtonLabel: "보내기",
        cancelButtonLabel: "취소",
      }),
    ],

    // 무시할 에러
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection captured",
      /Loading chunk \d+ failed/,
      /Network request failed/,
    ],

    // 민감정보 필터링
    beforeSend(event) {
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      // PII 마스킹
      if (event.user) {
        delete event.user.ip_address;
      }
      return event;
    },

    // 트랜잭션 필터링
    beforeSendTransaction(event) {
      // health check 트랜잭션 제외
      if (event.transaction?.includes("/health")) {
        return null;
      }
      return event;
    },
  });
}

function getSampleRate(): number {
  const env = import.meta.env.VITE_APP_ENV;
  const rates: Record<string, number> = {
    production: 0.1,
    staging: 0.5,
    preview: 1.0,
  };
  return rates[env] ?? 1.0;
}
```

### 7.2 에러 바운더리 통합

```tsx
// src/components/ErrorBoundary.tsx
import * as Sentry from "@sentry/react";
import type { ReactNode } from "react";

interface FallbackProps {
  error: Error;
  resetError: () => void;
}

function ErrorFallback({ error, resetError }: FallbackProps) {
  return (
    <div role="alert" style={{ padding: 24, textAlign: "center" }}>
      <h2>문제가 발생했습니다</h2>
      <p style={{ color: "#666" }}>{error.message}</p>
      <button onClick={resetError}>다시 시도</button>
      <button onClick={() => Sentry.showReportDialog()}>
        문제 신고
      </button>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback
          error={error as Error}
          resetError={resetError}
        />
      )}
      beforeCapture={(scope) => {
        scope.setTag("boundary", "app-root");
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

// 페이지별 세분화된 바운더리
export function PageErrorBoundary({
  pageName,
  children,
}: {
  pageName: string;
  children: ReactNode;
}) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback
          error={error as Error}
          resetError={resetError}
        />
      )}
      beforeCapture={(scope) => {
        scope.setTag("boundary", `page:${pageName}`);
        scope.setLevel("error");
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
```

---

## 8. 체크리스트

### AI 장애 대응 체크리스트

- [ ] Sentry Webhook → AI 분석 파이프라인 구축
- [ ] 근본 원인 분석 프롬프트 커스터마이징 (도메인 맥락 추가)
- [ ] AI 분류 → 담당자 자동 할당 연동
- [ ] AI 분석 결과 → Slack 채널 자동 알림
- [ ] Sentry AI Autofix 활성화 및 수정 PR 리뷰 프로세스 수립

### Sentry 2026 신기능 체크리스트

- [ ] Trace Explorer 쿼리 패턴 팀 내 공유
- [ ] Cron Monitoring 등록 (모든 배치/스케줄러)
- [ ] Uptime Monitoring 등록 (주요 엔드포인트)
- [ ] AI Autofix 설정 (repos, autoPR, ignore 패턴)

### OpenTelemetry 통합 체크리스트

- [ ] OTel SDK 설치 및 Sentry SpanProcessor 연결
- [ ] 자동 계측 활성화 (HTTP, DB, 프레임워크)
- [ ] 커스텀 Span 래퍼 (withSpan) 도입
- [ ] 브라우저/서버 양쪽 OTel 설정 완료
- [ ] 트레이스 전파 (W3C TraceContext) 확인

### 멀티 베타 환경 체크리스트

- [ ] 환경별 Sentry 프로젝트/대시보드 자동 프로비저닝 (Terraform/CDK)
- [ ] 환경별 Alert 임계값 차등 설정
- [ ] 환경별 동적 샘플링 비율 설정
- [ ] Preview Release 자동 정리 스케줄러 등록 (PR close + cron)
- [ ] Preview 배포 시 Sentry Release + Deploy 자동 생성

### Source Map 체크리스트

- [ ] Vite 6 + sentryVitePlugin 설정
- [ ] `sourcemap: "hidden"` 확인
- [ ] `filesToDeleteAfterUpload` 설정 (배포 아티팩트에서 .map 제거)
- [ ] debugId 기반 매칭 동작 확인 (`sentry-cli sourcemaps explain`)
- [ ] CDN/웹서버에서 .map 파일 접근 차단 확인

### SDK 설정 체크리스트

- [ ] 환경별 샘플링 비율 설정 (production: 0.1, staging: 0.5, preview: 1.0)
- [ ] ignoreErrors에 노이즈 에러 패턴 등록
- [ ] beforeSend에서 PII/민감정보 필터링
- [ ] Session Replay 설정 (maskAllText, blockAllMedia)
- [ ] ErrorBoundary 계층 구조 설정 (App → Page → Feature)
- [ ] Feedback Integration 활성화
