# Sentry 관리 표준 가이드 2026

## 목차

1. [AI + Sentry 통합 전략](#1-ai--sentry-통합-전략)
   - [Claude/GPT 에러 분석 프롬프트](#11-claudegpt-에러-분석-프롬프트)
   - [AI 기반 에러 자동 분류 및 담당자 할당](#12-ai-기반-에러-자동-분류-및-담당자-할당)
   - [Sentry → Slack AI 요약 파이프라인](#13-sentry--slack-ai-요약-파이프라인)
   - [AI 기반 주간 에러 트렌드 리포트](#14-ai-기반-주간-에러-트렌드-리포트)
   - [Copilot 에러 핸들링 자동 생성 패턴](#15-copilot-에러-핸들링-자동-생성-패턴)
2. [멀티 베타 환경 Sentry 전략](#2-멀티-베타-환경-sentry-전략)
   - [독립 프로젝트 vs 태그 기반 분리](#21-독립-프로젝트-vs-태그-기반-분리)
   - [PR별 Preview 환경 Release 자동 관리](#22-pr별-preview-환경-release-자동-관리)
   - [환경별 동적 샘플링](#23-환경별-동적-샘플링)
   - [Feature Flag별 에러 추적](#24-feature-flag별-에러-추적)
   - [베타 → 프로덕션 영향도 예측](#25-베타--프로덕션-영향도-예측)
   - [환경별 독립 Alert 정책](#26-환경별-독립-alert-정책)
   - [Preview 환경 정리 시 Sentry Release 연동](#27-preview-환경-정리-시-sentry-release-연동)
3. [Sentry SDK 2026 설정](#3-sentry-sdk-2026-설정)
4. [에러 수집 최적화](#4-에러-수집-최적화)
5. [Source Map 보안 관리](#5-source-map-보안-관리)
6. [Alert 정책 설계](#6-alert-정책-설계)
7. [Release Health 및 배포 연동](#7-release-health-및-배포-연동)
8. [체크리스트](#8-체크리스트)

---

## 1. AI + Sentry 통합 전략

AI를 Sentry 워크플로우 전 과정(수집 → 분류 → 분석 → 알림 → 리포트)에 내재화한다. 사람의 개입을 최소화하고 근본 원인 파악 속도를 극대화하는 것이 목표다.

### 1.1 Claude/GPT 에러 분석 프롬프트

Sentry Webhook으로 수신한 에러를 LLM에 전달하여 자동 분석한다. 아래 5개 프롬프트는 실전에서 검증된 패턴이다.

**프롬프트 1: 근본 원인 분석**

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
- 사용자 액션(최근 5개 breadcrumb): {{breadcrumbs_last_5}}

## 응답 형식
1. 근본 원인 (한 줄 요약)
2. 상세 분석 (코드 레벨, 어떤 조건에서 발생하는지)
3. 수정 방안 (코드 예시 포함)
4. 재발 방지 대책 (타입 가드, 테스트 케이스 등)
5. 심각도 판단 (Critical / High / Medium / Low) + 근거
```

**프롬프트 2: 반복 에러 패턴 분석**

```text
아래는 최근 7일간 발생한 Sentry 에러 목록입니다.
반복 패턴, 공통 원인, 우선 해결 순서를 분석하세요.

## 에러 목록
{{error_list_json}}
(각 항목: issue_id, title, count, first_seen, last_seen, tags)

## 분석 요청
1. 공통 근본 원인으로 묶을 수 있는 에러 그룹 식별
2. 각 그룹의 공통 패턴 (특정 브라우저, OS, 페이지, 시간대)
3. 해결 우선순위 (영향 범위 x 발생 빈도 기준)
4. 한 번의 수정으로 다수 에러를 해결할 수 있는 "root fix" 제안
5. 각 그룹별 예상 수정 난이도 (간단/보통/복잡)
```

**프롬프트 3: Release 영향 분석**

```text
새로운 Release 배포 후 Sentry 에러 변화를 분석하세요.

## Release 정보
- 현재 Release: {{current_release}}
- 이전 Release: {{previous_release}}
- 배포 시각: {{deploy_time}}

## 에러 데이터
- 신규 에러 (이전 Release에 없던 것): {{new_issues_json}}
- 재발 에러 (Resolved → Regressed): {{regressed_issues_json}}
- 해소 에러 (이번 Release에서 사라진 것): {{resolved_issues_json}}
- 에러율 변화: 이전 {{prev_error_rate}}% → 현재 {{curr_error_rate}}%

## 분석 요청
1. 이번 Release가 안정적인지 판단 (배포 유지/롤백 권고)
2. 신규 에러 각각의 원인 추정 및 긴급도
3. 재발 에러의 이전 수정이 불완전했던 이유 추정
4. 전체 에러율 변화 추이 해석
```

**프롬프트 4: 사용자 영향 범위 분석**

```text
아래 Sentry 에러의 사용자 영향 범위를 분석하세요.

## 에러 정보
- Issue ID: {{issue_id}}
- 에러 메시지: {{exception_message}}
- 총 이벤트 수: {{event_count}}
- 영향받은 사용자 수: {{affected_users}}
- 전체 활성 사용자 수: {{total_active_users}}

## 영향 분석 데이터
- 영향받은 페이지 목록: {{affected_pages}}
- 발생 브라우저 분포: {{browser_distribution}}
- 발생 지역 분포: {{geo_distribution}}
- 관련 트랜잭션 성능 데이터: {{transaction_metrics}}

## 분석 요청
1. 사용자 영향 심각도 (전체 사용자의 몇 %, 어떤 기능 차단)
2. 비즈니스 임팩트 (매출, 전환율, 사용자 이탈 예상)
3. 특정 사용자 세그먼트 집중 여부 (특정 브라우저/지역/기기)
4. 임시 대응 방안 (Feature Flag, 우회 로직 등)
5. 에러 미해결 시 예상되는 악화 시나리오
```

**프롬프트 5: 수정 코드 제안**

```text
아래 Sentry 에러에 대한 수정 코드를 제안하세요.

## 에러 정보
- 에러 타입: {{exception_type}}
- 에러 메시지: {{exception_message}}
- 발생 파일: {{culprit_file}}
- 발생 함수: {{culprit_function}}
- 스택트레이스:
{{stacktrace}}

## 현재 코드
```typescript
{{current_source_code}}
```

## 요청 사항
1. 에러를 해결하는 수정 코드 (diff 형태)
2. 수정 코드에 대한 설명
3. 에지 케이스 처리 포함 여부
4. 수정 후 추가해야 할 테스트 케이스 (vitest 기준)
5. 동일 패턴의 다른 코드에 적용할 일반화된 가이드
```

### 1.2 AI 기반 에러 자동 분류 및 담당자 할당

Sentry Webhook 이벤트를 수신하고 Anthropic SDK로 에러를 분류한 뒤, 적합한 담당자에게 자동 할당한다.

```typescript
// ai-error-classifier.ts
import Anthropic from "@anthropic-ai/sdk";

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  metadata: { type: string; value: string };
  tags: Array<{ key: string; value: string }>;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
}

interface ClassificationResult {
  category: "network" | "type-safety" | "ui-render" | "auth" | "data" | "performance" | "infra" | "unknown";
  severity: "critical" | "high" | "medium" | "low";
  assignee: string;
  explanation: string;
  suggestedLabels: string[];
}

// 팀별 담당 영역 매핑 (조직에 맞게 수정)
const TEAM_OWNERSHIP: Record<string, { team: string; members: string[] }> = {
  "network": { team: "platform", members: ["alice", "bob"] },
  "type-safety": { team: "frontend-core", members: ["charlie", "dave"] },
  "ui-render": { team: "frontend-ui", members: ["eve", "frank"] },
  "auth": { team: "security", members: ["grace", "heidi"] },
  "data": { team: "backend", members: ["ivan", "judy"] },
  "performance": { team: "platform", members: ["alice", "bob"] },
  "infra": { team: "devops", members: ["karl", "leo"] },
  "unknown": { team: "triage", members: ["lead-on-call"] },
};

const anthropic = new Anthropic();

export async function classifyAndAssign(issue: SentryIssue): Promise<ClassificationResult> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Sentry 에러를 분류하세요.

## 에러 정보
- 제목: ${issue.title}
- 타입: ${issue.metadata.type}
- 메시지: ${issue.metadata.value}
- 발생 위치: ${issue.culprit}
- 이벤트 수: ${issue.count}
- 영향 사용자 수: ${issue.userCount}
- 태그: ${JSON.stringify(issue.tags)}

## 반드시 아래 JSON 형식으로만 응답:
{
  "category": "network|type-safety|ui-render|auth|data|performance|infra|unknown",
  "severity": "critical|high|medium|low",
  "explanation": "분류 근거 한 줄",
  "suggestedLabels": ["라벨1", "라벨2"]
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const parsed = JSON.parse(content.text);
  const ownership = TEAM_OWNERSHIP[parsed.category] ?? TEAM_OWNERSHIP["unknown"];

  // 라운드 로빈으로 담당자 배정
  const assigneeIndex = parseInt(issue.id, 16) % ownership.members.length;

  return {
    ...parsed,
    assignee: ownership.members[assigneeIndex],
  };
}

// Sentry Webhook 핸들러
export async function handleSentryWebhook(payload: {
  action: string;
  data: { issue: SentryIssue };
}): Promise<void> {
  if (payload.action !== "created") return;

  const issue = payload.data.issue;
  const result = await classifyAndAssign(issue);

  // Sentry API로 이슈 업데이트
  await fetch(`https://sentry.io/api/0/organizations/{org}/issues/${issue.id}/`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assignedTo: `member:${result.assignee}`,
      priority: result.severity,
    }),
  });

  // Sentry 이슈에 AI 분석 코멘트 추가
  await fetch(`https://sentry.io/api/0/organizations/{org}/issues/${issue.id}/comments/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [
        `**AI 자동 분류 결과**`,
        `- 카테고리: \`${result.category}\``,
        `- 심각도: \`${result.severity}\``,
        `- 담당자: @${result.assignee}`,
        `- 근거: ${result.explanation}`,
        `- 라벨: ${result.suggestedLabels.map((l) => `\`${l}\``).join(", ")}`,
      ].join("\n"),
    }),
  });
}
```

### 1.3 Sentry → Slack AI 요약 파이프라인

Sentry 에러를 수신하면 AI로 요약한 뒤 Slack에 구조화된 메시지로 전송한다.

```typescript
// sentry-slack-ai-pipeline.ts
import Anthropic from "@anthropic-ai/sdk";

interface SentryEvent {
  event_id: string;
  title: string;
  message: string;
  culprit: string;
  environment: string;
  release: string;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename: string; function: string; lineno: number }> };
    }>;
  };
  tags: Array<{ key: string; value: string }>;
  contexts: Record<string, Record<string, unknown>>;
  user?: { id: string; email: string };
  breadcrumbs?: { values: Array<{ category: string; message: string; timestamp: string }> };
}

interface AISummary {
  oneLiner: string;
  rootCause: string;
  impact: string;
  suggestedFix: string;
  severity: "critical" | "high" | "medium" | "low";
}

const anthropic = new Anthropic();

async function analyzeWithAI(event: SentryEvent): Promise<AISummary> {
  const stackTrace = event.exception?.values?.[0]?.stacktrace?.frames
    ?.slice(-5)
    .map((f) => `  ${f.filename}:${f.lineno} in ${f.function}`)
    .join("\n") ?? "N/A";

  const recentBreadcrumbs = event.breadcrumbs?.values
    ?.slice(-5)
    .map((b) => `  [${b.category}] ${b.message}`)
    .join("\n") ?? "N/A";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Sentry 에러를 Slack 알림용으로 요약하세요.

에러: ${event.title}
메시지: ${event.exception?.values?.[0]?.value ?? event.message}
환경: ${event.environment}
릴리즈: ${event.release}
스택트레이스 (마지막 5프레임):
${stackTrace}
최근 사용자 액션:
${recentBreadcrumbs}

반드시 JSON으로만 응답:
{"oneLiner":"한 줄 요약","rootCause":"원인","impact":"영향","suggestedFix":"수정 제안","severity":"critical|high|medium|low"}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response");
  return JSON.parse(content.text);
}

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
};

async function sendToSlack(event: SentryEvent, summary: AISummary): Promise<void> {
  const sentryUrl = `https://sentry.io/organizations/{org}/issues/?query=${event.event_id}`;

  const payload = {
    channel: process.env.SLACK_SENTRY_CHANNEL,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `[${SEVERITY_EMOJI[summary.severity]}] ${summary.oneLiner}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*환경:*\n\`${event.environment}\`` },
          { type: "mrkdwn", text: `*릴리즈:*\n\`${event.release}\`` },
          { type: "mrkdwn", text: `*근본 원인:*\n${summary.rootCause}` },
          { type: "mrkdwn", text: `*영향 범위:*\n${summary.impact}` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*수정 제안:*\n\`\`\`${summary.suggestedFix}\`\`\`` },
      },
      {
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", text: "Sentry에서 보기" }, url: sentryUrl },
          {
            type: "button",
            text: { type: "plain_text", text: "담당자 할당" },
            action_id: "assign_issue",
            value: event.event_id,
          },
        ],
      },
    ],
  };

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

// 메인 파이프라인
export async function sentryToSlackPipeline(event: SentryEvent): Promise<void> {
  const summary = await analyzeWithAI(event);
  await sendToSlack(event, summary);

  // Critical 이벤트는 즉시 on-call 멘션
  if (summary.severity === "critical") {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: process.env.SLACK_ONCALL_CHANNEL,
        text: `<!here> CRITICAL 에러 발생: ${summary.oneLiner}\n원인: ${summary.rootCause}\n환경: ${event.environment}`,
      }),
    });
  }
}
```

### 1.4 AI 기반 주간 에러 트렌드 리포트

매주 월요일 자동 실행하여 지난 주 에러 트렌드를 AI가 분석하고, Slack/이메일로 리포트를 전송한다.

```typescript
// weekly-error-report.ts
import Anthropic from "@anthropic-ai/sdk";

interface WeeklyStats {
  totalEvents: number;
  totalIssues: number;
  newIssues: number;
  resolvedIssues: number;
  regressedIssues: number;
  crashFreeRate: number;
  topIssues: Array<{ title: string; count: number; users: number; firstSeen: string }>;
  errorsByCategory: Record<string, number>;
  errorsByEnvironment: Record<string, number>;
  errorTrend: Array<{ date: string; count: number }>; // 일별 추이
}

async function fetchWeeklyStats(): Promise<WeeklyStats> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const orgSlug = process.env.SENTRY_ORG!;
  const headers = { Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}` };

  const [issuesRes, statsRes] = await Promise.all([
    fetch(
      `https://sentry.io/api/0/organizations/${orgSlug}/issues/?query=firstSeen:>${weekAgo.toISOString()}&sort=freq&limit=20`,
      { headers },
    ),
    fetch(
      `https://sentry.io/api/0/organizations/${orgSlug}/stats_v2/?field=sum(quantity)&interval=1d&start=${weekAgo.toISOString()}&end=${now.toISOString()}&groupBy=outcome`,
      { headers },
    ),
  ]);

  const issues = (await issuesRes.json()) as Array<{
    title: string;
    count: string;
    userCount: number;
    firstSeen: string;
  }>;
  const stats = await statsRes.json();

  // 실제 프로젝트에서는 stats 파싱 로직 추가
  return {
    totalEvents: stats.groups?.reduce((sum: number, g: { totals: Record<string, number> }) =>
      sum + (g.totals?.["sum(quantity)"] ?? 0), 0) ?? 0,
    totalIssues: issues.length,
    newIssues: issues.length,
    resolvedIssues: 0,
    regressedIssues: 0,
    crashFreeRate: 99.5,
    topIssues: issues.slice(0, 10).map((i) => ({
      title: i.title,
      count: parseInt(i.count, 10),
      users: i.userCount,
      firstSeen: i.firstSeen,
    })),
    errorsByCategory: {},
    errorsByEnvironment: {},
    errorTrend: [],
  };
}

const anthropic = new Anthropic();

async function generateReport(stats: WeeklyStats): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `주간 Sentry 에러 트렌드 리포트를 작성하세요.

## 통계 데이터
${JSON.stringify(stats, null, 2)}

## 리포트 형식 (Slack mrkdwn)
1. 요약 대시보드 (핵심 지표 3~4개)
2. 주요 발견사항 (가장 중요한 3가지)
3. Top 5 에러 분석 (각각 원인 추정 + 권장 조치)
4. 환경별 에러 분포 분석 (베타 vs 프로덕션)
5. 지난주 대비 개선/악화 항목
6. 이번 주 권장 액션 아이템 (우선순위순)

간결하되 실행 가능한(actionable) 리포트를 작성하세요.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response");
  return content.text;
}

export async function sendWeeklyReport(): Promise<void> {
  const stats = await fetchWeeklyStats();
  const report = await generateReport(stats);

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: process.env.SLACK_REPORT_CHANNEL,
      text: `*주간 Sentry 에러 트렌드 리포트*\n${report}`,
    }),
  });
}
```

### 1.5 Copilot 에러 핸들링 자동 생성 패턴

GitHub Copilot이 에러 핸들링 코드를 일관되게 생성하도록 프로젝트 수준 지시를 설정한다.

**.github/copilot-instructions.md** 에 아래 내용을 추가:

```markdown
## 에러 핸들링 규칙

- 모든 API 호출은 try-catch로 감싸고 Sentry.captureException 호출
- catch 블록에서는 반드시 사용자 친화적 에러 메시지를 반환
- Sentry 에러에는 항상 context(모듈명, 함수명, 파라미터)를 첨부
- async 함수의 에러는 반드시 상위로 전파하거나 명시적으로 처리
- 네트워크 에러는 retry 로직과 함께 처리
```

Copilot이 위 지시를 참고하여 생성하는 전형적 패턴:

```typescript
// Copilot 생성 패턴: API 호출 + 에러 핸들링 + Sentry
import * as Sentry from "@sentry/react";

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const span = Sentry.startInactiveSpan({ name: "fetchUserProfile", op: "http.client" });

  try {
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const error = new Error(`Failed to fetch user profile: ${response.status}`);
      Sentry.captureException(error, {
        contexts: {
          api_call: {
            endpoint: `/api/users/${userId}`,
            status: response.status,
            response_body: errorBody.slice(0, 500),
          },
        },
        tags: { module: "user", operation: "fetch-profile" },
      });
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      // 네트워크 에러 → 재시도 가능
      Sentry.captureException(error, {
        level: "warning",
        tags: { error_type: "network", retryable: "true" },
      });
    }
    throw error;
  } finally {
    span.end();
  }
}

// Copilot 생성 패턴: React Error Boundary
function ProfilePage({ userId }: { userId: string }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} onRetry={resetError} context="프로필 페이지" />
      )}
      beforeCapture={(scope) => {
        scope.setTag("page", "profile");
        scope.setContext("component_props", { userId });
      }}
    >
      <ProfileContent userId={userId} />
    </Sentry.ErrorBoundary>
  );
}
```

---

## 2. 멀티 베타 환경 Sentry 전략

N개 베타 환경, PR별 Preview 환경에서 에러를 효과적으로 수집하고 프로덕션과 분리하여 관리한다.

### 2.1 독립 프로젝트 vs 태그 기반 분리

| 항목 | 독립 프로젝트 | 태그 기반 분리 (권장) |
|------|--------------|---------------------|
| 설정 복잡도 | 높음 (프로젝트별 DSN 관리) | 낮음 (단일 DSN + environment 태그) |
| 비용 | 프로젝트 수만큼 쿼터 소비 | 단일 쿼터 공유 (샘플링으로 제어) |
| 에러 검색 | 프로젝트 전환 필요 | 필터링으로 통합 검색 |
| Alert 독립성 | 완전 분리 | 환경 조건부 Alert로 분리 |
| 환경 간 비교 | 불편 (대시보드 별도) | 편리 (같은 이슈에서 환경별 필터) |
| 권한 분리 | 가능 | 불가 (동일 프로젝트) |
| Release 관리 | 독립적 | Release + environment 조합 |
| 추천 상황 | 보안/규정상 완전 분리 필요 시 | 대부분의 경우 |

**권장: 태그 기반 분리** (하나의 Sentry 프로젝트에서 `environment` 태그로 구분)

```typescript
// sentry-env-config.ts
type AppEnvironment = "production" | "staging" | `beta-${string}` | `preview-pr-${number}`;

function detectEnvironment(): AppEnvironment {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const envVar = process.env.NEXT_PUBLIC_APP_ENV;

  if (envVar) return envVar as AppEnvironment;
  if (hostname === "app.example.com") return "production";
  if (hostname === "staging.example.com") return "staging";

  // beta-1.example.com, beta-2.example.com
  const betaMatch = hostname.match(/^beta-(\w+)\.example\.com$/);
  if (betaMatch) return `beta-${betaMatch[1]}`;

  // pr-123.preview.example.com
  const prMatch = hostname.match(/^pr-(\d+)\.preview\.example\.com$/);
  if (prMatch) return `preview-pr-${parseInt(prMatch[1], 10)}`;

  return "production";
}

export function getSentryConfig(env: AppEnvironment) {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // 모든 환경에서 동일한 DSN
    environment: env,
    release: process.env.NEXT_PUBLIC_RELEASE_VERSION,
    // 환경별 태그 자동 추가
    initialScope: {
      tags: {
        app_env: env,
        is_beta: env.startsWith("beta-") ? "true" : "false",
        is_preview: env.startsWith("preview-") ? "true" : "false",
      },
    },
  };
}
```

### 2.2 PR별 Preview 환경 Release 자동 관리

GitHub Actions에서 PR 생성/머지 시 Sentry Release를 자동으로 등록하고 정리한다.

```yaml
# .github/workflows/preview-sentry.yml
name: Preview Sentry Release

on:
  pull_request:
    types: [opened, synchronize, closed]

jobs:
  sentry-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set release name
        run: echo "RELEASE=preview-pr-${{ github.event.pull_request.number }}-$(git rev-parse --short HEAD)" >> $GITHUB_ENV

      # PR 열림/업데이트 시 Release 등록
      - name: Create Sentry Release
        if: github.event.action != 'closed'
        run: |
          npx @sentry/cli releases new "$RELEASE" --org $SENTRY_ORG --project $SENTRY_PROJECT
          npx @sentry/cli releases set-commits "$RELEASE" --auto --org $SENTRY_ORG --project $SENTRY_PROJECT
          npx @sentry/cli releases deploys "$RELEASE" new -e "preview-pr-${{ github.event.pull_request.number }}" --org $SENTRY_ORG --project $SENTRY_PROJECT
          npx @sentry/cli sourcemaps upload ./dist --release "$RELEASE" --org $SENTRY_ORG --project $SENTRY_PROJECT
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ vars.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ vars.SENTRY_PROJECT }}

      # PR 닫힘 시 Release 정리
      - name: Cleanup Sentry Releases
        if: github.event.action == 'closed'
        run: |
          # 해당 PR의 모든 preview release 삭제
          npx @sentry/cli releases list --org $SENTRY_ORG --project $SENTRY_PROJECT \
            | grep "preview-pr-${{ github.event.pull_request.number }}" \
            | awk '{print $1}' \
            | xargs -I {} npx @sentry/cli releases delete {} --org $SENTRY_ORG --project $SENTRY_PROJECT
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ vars.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ vars.SENTRY_PROJECT }}
```

### 2.3 환경별 동적 샘플링

환경 중요도에 따라 샘플링 비율을 동적으로 조정하여 비용을 최적화한다.

```typescript
// sentry.config.ts
import * as Sentry from "@sentry/react";

const env = detectEnvironment();

const SAMPLING_RATES: Record<string, { errors: number; traces: number; replays: number }> = {
  production: { errors: 1.0, traces: 0.2, replays: 0.1 },
  staging: { errors: 1.0, traces: 0.5, replays: 0.3 },
};

function getSamplingRate(env: string): { errors: number; traces: number; replays: number } {
  if (SAMPLING_RATES[env]) return SAMPLING_RATES[env];
  if (env.startsWith("beta-")) return { errors: 0.5, traces: 0.3, replays: 0.2 };
  if (env.startsWith("preview-")) return { errors: 0.1, traces: 0.05, replays: 0.0 };
  return { errors: 1.0, traces: 0.1, replays: 0.0 };
}

const rates = getSamplingRate(env);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: env,
  release: process.env.NEXT_PUBLIC_RELEASE_VERSION,

  // 에러 샘플링: beforeSend로 확률적 드롭
  beforeSend(event) {
    if (Math.random() > rates.errors) return null;
    return event;
  },

  // 트랜잭션 샘플링: tracesSampler로 세밀 제어
  tracesSampler(samplingContext) {
    const txName = samplingContext.name;

    // 헬스체크는 모든 환경에서 드롭
    if (txName?.includes("/health") || txName?.includes("/ready")) return 0;

    // 결제 관련은 모든 환경에서 100%
    if (txName?.includes("/payment") || txName?.includes("/checkout")) return 1.0;

    return rates.traces;
  },

  // Session Replay 샘플링
  replaysSessionSampleRate: rates.replays,
  replaysOnErrorSampleRate: env === "production" ? 1.0 : 0.5,
});
```

### 2.4 Feature Flag별 에러 추적

Feature Flag 활성화 상태를 Sentry 이벤트에 첨부하여, 어떤 Flag가 에러를 유발하는지 추적한다.

```typescript
// feature-flag-sentry-integration.ts
import * as Sentry from "@sentry/react";

interface FeatureFlagState {
  [flagName: string]: boolean | string;
}

// Feature Flag 상태를 Sentry 컨텍스트에 동기화
export function syncFeatureFlagsToSentry(flags: FeatureFlagState): void {
  Sentry.setContext("feature_flags", flags);

  // 활성 Flag를 태그로도 추가 (검색/필터용)
  const activeFlags = Object.entries(flags)
    .filter(([, value]) => value === true || (typeof value === "string" && value !== "control"))
    .map(([key]) => key);

  Sentry.setTag("active_flags", activeFlags.join(","));
  Sentry.setTag("active_flags_count", String(activeFlags.length));
}

// Flag 변경 시점 추적
export function trackFlagChange(flagName: string, oldValue: unknown, newValue: unknown): void {
  Sentry.addBreadcrumb({
    category: "feature-flag",
    message: `Flag "${flagName}" changed: ${String(oldValue)} → ${String(newValue)}`,
    level: "info",
    data: { flagName, oldValue, newValue },
  });
}

// 특정 Flag가 에러와 상관관계가 있는지 분석하는 쿼리 헬퍼
// Sentry Discover에서 사용할 쿼리를 생성
export function buildFlagCorrelationQuery(flagName: string): string {
  return [
    // Flag ON 상태에서의 에러율
    `SELECT count() as error_count, count_unique(user) as affected_users`,
    `FROM events`,
    `WHERE feature_flags.${flagName}:true AND event.type:error`,
    `GROUP BY release, environment`,
    `ORDER BY error_count DESC`,
  ].join("\n");
}

// React Hook: Flag 상태 자동 동기화
export function useFeatureFlagSentry(flags: FeatureFlagState): void {
  // flags 변경 시 Sentry 컨텍스트 업데이트
  const prevFlagsRef = { current: flags };

  if (prevFlagsRef.current !== flags) {
    syncFeatureFlagsToSentry(flags);

    // 변경된 Flag 추적
    for (const [key, value] of Object.entries(flags)) {
      if (prevFlagsRef.current[key] !== value) {
        trackFlagChange(key, prevFlagsRef.current[key], value);
      }
    }
    prevFlagsRef.current = flags;
  }
}
```

### 2.5 베타 → 프로덕션 영향도 예측

베타 환경에서 수집된 에러 패턴을 분석하여, 해당 코드가 프로덕션에 배포되었을 때의 영향도를 AI로 예측한다.

```typescript
// beta-impact-predictor.ts
import Anthropic from "@anthropic-ai/sdk";

interface BetaErrorSummary {
  issueId: string;
  title: string;
  errorCount: number;
  userCount: number;
  betaEnvironment: string;
  firstSeen: string;
  affectedPages: string[];
  errorRate: number; // 베타 환경에서의 에러율 (%)
}

interface ImpactPrediction {
  risk: "critical" | "high" | "medium" | "low";
  estimatedProductionUsers: number;
  estimatedProductionEvents: number;
  recommendation: "block-deploy" | "deploy-with-monitoring" | "safe-to-deploy";
  explanation: string;
  mitigationSteps: string[];
}

const anthropic = new Anthropic();

export async function predictProductionImpact(
  betaErrors: BetaErrorSummary[],
  productionMetrics: { dailyActiveUsers: number; avgErrorRate: number },
): Promise<ImpactPrediction[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `베타 환경 에러가 프로덕션에 미칠 영향을 예측하세요.

## 베타 환경 에러 목록
${JSON.stringify(betaErrors, null, 2)}

## 프로덕션 기준 메트릭
- 일간 활성 사용자: ${productionMetrics.dailyActiveUsers}
- 현재 평균 에러율: ${productionMetrics.avgErrorRate}%

## 각 에러에 대해 JSON 배열로 응답:
[{
  "issueId": "이슈ID",
  "risk": "critical|high|medium|low",
  "estimatedProductionUsers": 숫자,
  "estimatedProductionEvents": 숫자,
  "recommendation": "block-deploy|deploy-with-monitoring|safe-to-deploy",
  "explanation": "예측 근거",
  "mitigationSteps": ["조치1", "조치2"]
}]`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response");
  return JSON.parse(content.text);
}
```

### 2.6 환경별 독립 Alert 정책

환경마다 다른 알림 채널과 임계값을 설정한다.

```typescript
// alert-policy-config.ts

// Sentry Alert Rule을 코드로 정의 (Terraform/API 호출용)
interface AlertRule {
  name: string;
  environment: string | null; // null = 모든 환경
  conditions: Array<{ id: string; value: number; interval?: string }>;
  actions: Array<{ id: string; channel?: string; service?: string; targetType?: string }>;
  frequency: number; // 분
}

export const alertPolicies: AlertRule[] = [
  // 프로덕션: PagerDuty + Slack 즉시 알림
  {
    name: "[PROD] Critical Error Spike",
    environment: "production",
    conditions: [
      { id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition", value: 100, interval: "5m" },
    ],
    actions: [
      { id: "sentry.integrations.pagerduty.notify_action.PagerDutyNotifyServiceAction", service: "prod-oncall" },
      { id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction", channel: "#prod-alerts" },
    ],
    frequency: 5,
  },
  {
    name: "[PROD] New Error in Release",
    environment: "production",
    conditions: [
      { id: "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition", value: 1 },
    ],
    actions: [
      { id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction", channel: "#prod-alerts" },
    ],
    frequency: 30,
  },
  {
    name: "[PROD] Crash Free Rate Drop",
    environment: "production",
    conditions: [
      { id: "sentry.rules.conditions.event_frequency.SessionFrequencyCondition", value: 95 },
    ],
    actions: [
      { id: "sentry.integrations.pagerduty.notify_action.PagerDutyNotifyServiceAction", service: "prod-oncall" },
    ],
    frequency: 10,
  },

  // 베타: Slack만 (비긴급)
  {
    name: "[BETA] Error Spike",
    environment: "beta-*",
    conditions: [
      { id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition", value: 50, interval: "10m" },
    ],
    actions: [
      { id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction", channel: "#beta-monitoring" },
    ],
    frequency: 30,
  },
  {
    name: "[BETA] New Error Type",
    environment: "beta-*",
    conditions: [
      { id: "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition", value: 1 },
    ],
    actions: [
      { id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction", channel: "#beta-monitoring" },
    ],
    frequency: 60,
  },

  // Preview: 로그만 (알림 없음, Sentry 대시보드에서 확인)
  {
    name: "[PREVIEW] Error Tracking Only",
    environment: "preview-*",
    conditions: [
      { id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition", value: 200, interval: "1h" },
    ],
    actions: [
      { id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction", channel: "#preview-errors" },
    ],
    frequency: 120,
  },
];

// Sentry API를 통해 Alert 규칙 일괄 등록
export async function syncAlertRules(projectSlug: string): Promise<void> {
  for (const rule of alertPolicies) {
    await fetch(
      `https://sentry.io/api/0/projects/${process.env.SENTRY_ORG}/${projectSlug}/rules/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: rule.name,
          environment: rule.environment,
          conditions: rule.conditions,
          actions: rule.actions,
          frequency: rule.frequency,
          actionMatch: "all",
        }),
      },
    );
  }
}
```

### 2.7 Preview 환경 정리 시 Sentry Release 연동

Preview 환경 인프라를 정리할 때 Sentry Release도 함께 정리한다.

```typescript
// preview-cleanup.ts

interface CleanupResult {
  environment: string;
  releasesDeleted: string[];
  eventsArchived: number;
}

export async function cleanupPreviewSentry(prNumber: number): Promise<CleanupResult> {
  const orgSlug = process.env.SENTRY_ORG!;
  const projectSlug = process.env.SENTRY_PROJECT!;
  const headers = {
    Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
    "Content-Type": "application/json",
  };
  const environment = `preview-pr-${prNumber}`;

  // 1. 해당 환경의 Release 목록 조회
  const releasesRes = await fetch(
    `https://sentry.io/api/0/organizations/${orgSlug}/releases/?query=${environment}&project=${projectSlug}`,
    { headers },
  );
  const releases = (await releasesRes.json()) as Array<{ version: string }>;

  const deletedReleases: string[] = [];

  // 2. 각 Release 삭제
  for (const release of releases) {
    if (!release.version.includes(`preview-pr-${prNumber}`)) continue;

    const deleteRes = await fetch(
      `https://sentry.io/api/0/organizations/${orgSlug}/releases/${encodeURIComponent(release.version)}/`,
      { method: "DELETE", headers },
    );

    if (deleteRes.ok) {
      deletedReleases.push(release.version);
    }
  }

  // 3. 해당 환경의 미해결 이슈 일괄 아카이브
  const archiveRes = await fetch(
    `https://sentry.io/api/0/organizations/${orgSlug}/issues/?query=environment:${environment}&project=${projectSlug}`,
    { headers },
  );
  const issues = (await archiveRes.json()) as Array<{ id: string }>;

  if (issues.length > 0) {
    await fetch(
      `https://sentry.io/api/0/organizations/${orgSlug}/issues/`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: issues.map((i) => i.id),
          status: "ignored",
          substatus: "archived_until_escalating",
        }),
      },
    );
  }

  return {
    environment,
    releasesDeleted: deletedReleases,
    eventsArchived: issues.length,
  };
}
```

---

## 3. Sentry SDK 2026 설정

React 19 + Next.js 15 환경에 최적화된 Sentry SDK 구성.

```typescript
// sentry.config.ts
import * as Sentry from "@sentry/react";

const env = detectEnvironment();
const rates = getSamplingRate(env);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: env,
  release: process.env.NEXT_PUBLIC_RELEASE_VERSION,
  enabled: process.env.NODE_ENV === "production" || env.startsWith("beta-"),

  // Performance Monitoring
  tracesSampler(samplingContext) {
    if (samplingContext.name?.includes("/health")) return 0;
    if (samplingContext.name?.includes("/api/payment")) return 1.0;
    return rates.traces;
  },

  // Session Replay
  replaysSessionSampleRate: rates.replays,
  replaysOnErrorSampleRate: env === "production" ? 1.0 : 0.5,

  integrations: [
    // React 19 Error Boundary 통합
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: undefined, // React 19 자동 감지
    }),

    // Session Replay
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
      // 민감 요소 추가 마스킹
      mask: [".credit-card", ".ssn", "[data-sensitive]"],
      // 네트워크 요청 캡처
      networkDetailAllowUrls: ["/api/"],
      networkCaptureBodies: env !== "production", // 프로덕션에서는 body 미수집
      networkRequestHeaders: ["X-Request-Id", "X-Correlation-Id"],
      networkResponseHeaders: ["X-Request-Id"],
    }),

    // 브라우저 프로파일링
    Sentry.browserProfilingIntegration(),

    // HTTP 클라이언트 에러 캡처
    Sentry.httpClientIntegration({
      failedRequestStatusCodes: [[400, 599]],
      failedRequestTargets: ["/api/"],
    }),

    // 유저 피드백
    Sentry.feedbackIntegration({
      autoInject: false,
      colorScheme: "system",
    }),
  ],

  // 민감정보 필터링
  beforeSend(event) {
    // 에러 샘플링
    if (Math.random() > rates.errors) return null;

    // 민감 URL 파라미터 제거
    if (event.request?.query_string) {
      const params = new URLSearchParams(event.request.query_string);
      for (const key of ["token", "secret", "password", "apiKey", "authorization"]) {
        if (params.has(key)) params.set(key, "[FILTERED]");
      }
      event.request.query_string = params.toString();
    }

    // 쿠키 제거
    if (event.request?.cookies) {
      event.request.cookies = "[FILTERED]";
    }

    // 사용자 IP 제거
    if (event.user) {
      delete event.user.ip_address;
    }

    return event;
  },

  // 불필요한 에러 무시
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "AbortError",
    "NetworkError when attempting to fetch",
    "Load failed",
    /^Loading chunk \d+ failed/,
    /^Loading CSS chunk \d+ failed/,
    "ChunkLoadError",
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
    /gtag\/js/,
    /analytics/,
  ],
});
```

### React 19 Error Boundary 통합

```typescript
// components/SentryErrorBoundary.tsx
import * as Sentry from "@sentry/react";
import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  module: string;
  fallback?: ReactNode;
}

export function SentryErrorBoundary({ children, module, fallback }: Props) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) =>
        fallback ?? (
          <div role="alert">
            <h2>오류가 발생했습니다</h2>
            <p>잠시 후 다시 시도해주세요.</p>
            <button onClick={resetError}>다시 시도</button>
          </div>
        )
      }
      beforeCapture={(scope) => {
        scope.setTag("module", module);
        scope.setTag("boundary", "react-error-boundary");
        scope.setLevel("error");
      }}
      onError={(error, componentStack) => {
        // 에러 발생 시 추가 컨텍스트 전송
        Sentry.setContext("react_component_stack", {
          componentStack,
        });
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

// 사용 예시
function App() {
  return (
    <SentryErrorBoundary module="app-root">
      <SentryErrorBoundary module="header">
        <Header />
      </SentryErrorBoundary>
      <SentryErrorBoundary module="main-content">
        <MainContent />
      </SentryErrorBoundary>
      <SentryErrorBoundary module="footer">
        <Footer />
      </SentryErrorBoundary>
    </SentryErrorBoundary>
  );
}
```

---

## 4. 에러 수집 최적화

### beforeSend 필터링 전략

```typescript
// sentry-filters.ts
import type { Event, EventHint } from "@sentry/types";

// 비용 효율적인 에러 수집을 위한 필터 체인
type EventFilter = (event: Event, hint: EventHint) => Event | null;

const filters: EventFilter[] = [
  // 1. 봇/크롤러 에러 무시
  (event) => {
    const ua = event.request?.headers?.["User-Agent"] ?? "";
    if (/bot|crawler|spider|scraper/i.test(ua)) return null;
    return event;
  },

  // 2. 이미 해결된 브라우저 호환성 이슈 무시
  (event) => {
    const msg = event.exception?.values?.[0]?.value ?? "";
    const knownBrowserBugs = [
      "Cannot read properties of null (reading 'offsetHeight')",
      "Permission denied to access property",
      "SecurityError: Blocked a frame with origin",
    ];
    if (knownBrowserBugs.some((bug) => msg.includes(bug))) return null;
    return event;
  },

  // 3. 3rd party 스크립트 에러 제외
  (event) => {
    const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
    const hasAppFrame = frames.some(
      (f) => f.filename && !f.filename.includes("node_modules") && f.in_app,
    );
    if (frames.length > 0 && !hasAppFrame) return null;
    return event;
  },

  // 4. 같은 에러가 빈번할 경우 클라이언트 사이드 레이트 리밋
  (() => {
    const errorCounts = new Map<string, { count: number; resetAt: number }>();

    return (event) => {
      const key = event.exception?.values?.[0]?.type + ":" + event.exception?.values?.[0]?.value;
      const now = Date.now();
      const entry = errorCounts.get(key);

      if (entry && entry.resetAt > now) {
        if (entry.count >= 10) return null; // 1분 내 10회 초과 시 드롭
        entry.count++;
      } else {
        errorCounts.set(key, { count: 1, resetAt: now + 60_000 });
      }

      return event;
    };
  })(),
];

// beforeSend에 통합
export function createBeforeSend(): (event: Event, hint: EventHint) => Event | null {
  return (event, hint) => {
    let result: Event | null = event;
    for (const filter of filters) {
      if (!result) return null;
      result = filter(result, hint);
    }
    return result;
  };
}
```

### 비용 모니터링

```typescript
// sentry-cost-monitor.ts

// Sentry 쿼터 사용량 모니터링
export async function checkQuotaUsage(): Promise<{
  used: number;
  limit: number;
  percentage: number;
  projectedOverage: boolean;
}> {
  const res = await fetch(
    `https://sentry.io/api/0/organizations/${process.env.SENTRY_ORG}/stats_v2/?field=sum(quantity)&interval=1d&statsPeriod=30d&groupBy=outcome&category=error`,
    { headers: { Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}` } },
  );

  const data = await res.json();
  const accepted = data.groups
    ?.find((g: { by: { outcome: string } }) => g.by.outcome === "accepted")
    ?.totals?.["sum(quantity)"] ?? 0;
  const limit = 100_000; // 월간 쿼터 (조직에 맞게 수정)

  const daysElapsed = new Date().getDate();
  const projected = (accepted / daysElapsed) * 30;

  return {
    used: accepted,
    limit,
    percentage: Math.round((accepted / limit) * 100),
    projectedOverage: projected > limit,
  };
}
```

---

## 5. Source Map 보안 관리

Source Map을 Sentry에 업로드한 뒤 빌드 아티팩트에서 삭제하여 외부 노출을 방지한다. `debugId` 기반으로 업로드한다.

### CI/CD 파이프라인

```yaml
# .github/workflows/deploy.yml (source map 관련 단계만 발췌)
jobs:
  build-and-deploy:
    steps:
      - name: Build with source maps
        run: pnpm build
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

      # debugId 주입 + Source Map 업로드
      - name: Upload source maps to Sentry
        run: |
          npx @sentry/cli sourcemaps inject ./dist
          npx @sentry/cli sourcemaps upload ./dist \
            --release "${{ env.RELEASE }}" \
            --org ${{ vars.SENTRY_ORG }} \
            --project ${{ vars.SENTRY_PROJECT }}
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

      # Source Map 파일 삭제 (배포 아티팩트에서 제거)
      - name: Remove source maps from build output
        run: find ./dist -name "*.map" -type f -delete

      # sourceMappingURL 참조 제거
      - name: Remove sourceMappingURL references
        run: |
          find ./dist -name "*.js" -type f -exec \
            sed -i 's/\/\/# sourceMappingURL=.*//g' {} +

      - name: Deploy
        run: pnpm deploy
```

### Sentry 설정 (Source Map 해석용)

```typescript
// vite.config.ts (또는 next.config.ts)
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    sourcemap: true, // 빌드 시 source map 생성 (CI에서 업로드 후 삭제)
  },
  plugins: [
    // 로컬 개발에서는 Sentry plugin 비활성화
    process.env.CI
      ? sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: { name: process.env.RELEASE_VERSION },
          sourcemaps: {
            filesToDeleteAfterUpload: ["./dist/**/*.map"],
          },
          debug: false,
        })
      : null,
  ].filter(Boolean),
});
```

---

## 6. Alert 정책 설계

### Metric Alerts

| Alert | 조건 | 임계값 | 액션 | 환경 |
|-------|------|--------|------|------|
| Error Rate Spike | 에러 이벤트 수/5분 | > 100 (Warning), > 500 (Critical) | Slack + PagerDuty | production |
| Transaction Duration | p95 응답 시간 | > 3s (Warning), > 10s (Critical) | Slack | production |
| Crash Free Rate | 세션 기반 비율 | < 99% (Warning), < 95% (Critical) | PagerDuty | production |
| Apdex Drop | Apdex Score | < 0.8 (Warning), < 0.5 (Critical) | Slack | production |
| Beta Error Spike | 에러 이벤트 수/10분 | > 50 | Slack #beta | beta-* |

### Issue Alerts

```typescript
// 코드 레벨 Alert 설정 참조
const issueAlertRules = [
  {
    name: "First Seen in Production",
    conditions: [{ id: "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition" }],
    filters: [{ id: "sentry.rules.filters.event_attribute.EventAttributeFilter", attribute: "environment", value: "production" }],
    actions: [{ id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction", channel: "#prod-errors" }],
  },
  {
    name: "Regression Detected",
    conditions: [{ id: "sentry.rules.conditions.regression_event.RegressionEventCondition" }],
    filters: [{ id: "sentry.rules.filters.event_attribute.EventAttributeFilter", attribute: "environment", value: "production" }],
    actions: [
      { id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction", channel: "#prod-errors" },
      { id: "sentry.integrations.pagerduty.notify_action.PagerDutyNotifyServiceAction", service: "prod-oncall" },
    ],
  },
  {
    name: "High Volume Error",
    conditions: [{ id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition", value: 1000, interval: "1h" }],
    actions: [{ id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction", channel: "#prod-alerts" }],
  },
];
```

### Uptime Monitoring

```typescript
// Sentry Uptime 설정 (Sentry Dashboard에서 설정)
const uptimeConfig = {
  monitors: [
    {
      name: "API Health Check",
      url: "https://api.example.com/health",
      schedule: { type: "interval", value: 1, unit: "minute" },
      alertRule: {
        environment: "production",
        targets: [{ type: "slack", channel: "#infra-alerts" }],
      },
    },
    {
      name: "Web App Availability",
      url: "https://app.example.com",
      schedule: { type: "interval", value: 5, unit: "minute" },
      alertRule: {
        targets: [{ type: "slack", channel: "#infra-alerts" }],
      },
    },
  ],
};
```

### 에스컬레이션 정책

```
Level 0 (자동 대응, 0분):
  → 조건: Low/Medium 이슈
  → 액션: Slack 채널에 AI 요약 전송, 자동 담당자 할당

Level 1 (팀 알림, 10분):
  → 조건: High 이슈 또는 Level 0 미응답
  → 액션: 담당 팀 Slack DM, 이슈 Priority 상향

Level 2 (긴급 대응, 30분):
  → 조건: Critical 이슈 또는 Level 1 미응답
  → 액션: PagerDuty 알림, 팀 리드 멘션

Level 3 (경영진 보고, 60분):
  → 조건: Level 2 미해결, 영향 사용자 > 전체의 10%
  → 액션: 경영진 Slack 채널 알림, 인시던트 선언
```

---

## 7. Release Health 및 배포 연동

### Release 등록 (CI/CD)

```yaml
# .github/workflows/release.yml
name: Create Sentry Release

on:
  push:
    branches: [main]

jobs:
  sentry-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set release version
        run: echo "RELEASE=$(git describe --tags --always)" >> $GITHUB_ENV

      - name: Create Sentry Release
        uses: getsentry/action-release@v3
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ vars.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ vars.SENTRY_PROJECT }}
        with:
          environment: production
          version: ${{ env.RELEASE }}
          sourcemaps: ./dist
          set_commits: auto
          finalize: true
```

### Crash Free Rate 모니터링

```typescript
// release-health-monitor.ts

interface ReleaseHealth {
  version: string;
  crashFreeRate: number;
  crashFreeSessions: number;
  totalSessions: number;
  newIssues: number;
  status: "healthy" | "degraded" | "critical";
}

export async function checkReleaseHealth(release: string): Promise<ReleaseHealth> {
  const orgSlug = process.env.SENTRY_ORG!;
  const projectSlug = process.env.SENTRY_PROJECT!;
  const headers = { Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}` };

  const res = await fetch(
    `https://sentry.io/api/0/organizations/${orgSlug}/releases/${encodeURIComponent(release)}/`,
    { headers },
  );

  const data = await res.json();
  const sessions = data.projects?.[0]?.healthData;
  const crashFreeRate = sessions?.crashFreeRate ?? 100;

  let status: "healthy" | "degraded" | "critical";
  if (crashFreeRate >= 99) status = "healthy";
  else if (crashFreeRate >= 95) status = "degraded";
  else status = "critical";

  return {
    version: release,
    crashFreeRate,
    crashFreeSessions: sessions?.crashFreeSessions ?? 0,
    totalSessions: sessions?.totalSessions ?? 0,
    newIssues: data.newGroups ?? 0,
    status,
  };
}

// 배포 후 자동 모니터링 (5분 간격, 30분간)
export async function postDeployMonitoring(release: string): Promise<void> {
  const checkIntervalMs = 5 * 60 * 1000;
  const totalChecks = 6;

  for (let i = 0; i < totalChecks; i++) {
    await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));

    const health = await checkReleaseHealth(release);

    if (health.status === "critical") {
      // 자동 롤백 알림
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: process.env.SLACK_ONCALL_CHANNEL,
          text: [
            `<!here> Release \`${release}\` CRITICAL`,
            `Crash Free Rate: ${health.crashFreeRate}%`,
            `신규 이슈: ${health.newIssues}개`,
            `롤백을 검토하세요.`,
          ].join("\n"),
        }),
      });
      break;
    }

    if (health.status === "degraded") {
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: process.env.SLACK_SENTRY_CHANNEL,
          text: `Release \`${release}\` 상태 주의: Crash Free Rate ${health.crashFreeRate}% (${i + 1}/${totalChecks} 체크)`,
        }),
      });
    }
  }
}
```

---

## 8. 체크리스트

### 초기 설정

- [ ] Sentry 프로젝트 생성 및 DSN 발급
- [ ] 환경 변수 설정 (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`)
- [ ] `sentry.config.ts` 작성 (SDK 초기화, 샘플링, 필터링)
- [ ] `beforeSend` 필터 체인 구성
- [ ] `ignoreErrors`, `denyUrls` 설정
- [ ] Source Map 업로드 CI/CD 파이프라인 구성
- [ ] Source Map 빌드 아티팩트 삭제 확인

### AI 통합

- [ ] Sentry Webhook 설정 (에러 수신 엔드포인트)
- [ ] AI 에러 자동 분류 + 담당자 할당 로직 배포
- [ ] Sentry → Slack AI 요약 파이프라인 배포
- [ ] 주간 에러 트렌드 리포트 스케줄링 (cron)
- [ ] Copilot 에러 핸들링 지시 (`.github/copilot-instructions.md`)

### 멀티 베타 환경

- [ ] 환경 감지 로직 (`detectEnvironment`) 구현
- [ ] 환경별 샘플링 비율 설정 및 검증
- [ ] PR별 Preview Release 자동 등록/정리 CI 구성
- [ ] Feature Flag → Sentry 컨텍스트 동기화
- [ ] 환경별 Alert 정책 등록
- [ ] Preview 환경 정리 시 Sentry Release 삭제 연동

### Alert 및 모니터링

- [ ] Metric Alert 규칙 설정 (Error Rate, p95, Crash Free Rate)
- [ ] Issue Alert 규칙 설정 (First Seen, Regression)
- [ ] Uptime Monitoring 설정
- [ ] 에스컬레이션 정책 문서화 및 팀 공유
- [ ] PagerDuty 연동 (프로덕션)
- [ ] Slack 채널 구조 설정 (`#prod-alerts`, `#beta-monitoring`, `#preview-errors`)

### Release Health

- [ ] Release 자동 등록 CI/CD 구성
- [ ] 배포 후 자동 모니터링 스크립트 배포
- [ ] Crash Free Rate 임계값 알림 설정
- [ ] 롤백 판단 기준 및 프로세스 문서화
