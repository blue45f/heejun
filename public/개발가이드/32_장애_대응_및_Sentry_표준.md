# 장애 대응 표준 2026 -- AI-Native & Multi-Beta Incident Response

## 목차

1. [AIOps & AI 기반 장애 대응](#1-aiops--ai-기반-장애-대응)
   - [1.1 AI 장애 분석 프롬프트 라이브러리 (7종)](#11-ai-장애-분석-프롬프트-라이브러리-7종)
   - [1.2 AI 기반 장애 예측 시스템](#12-ai-기반-장애-예측-시스템)
   - [1.3 AI 자동 복구 시스템](#13-ai-자동-복구-시스템)
2. [멀티 베타 환경 장애 대응](#2-멀티-베타-환경-장애-대응)
   - [2.1 환경별 장애 격리 및 라우팅](#21-환경별-장애-격리-및-라우팅)
   - [2.2 멀티 베타 장애 시뮬레이션 자동화](#22-멀티-베타-장애-시뮬레이션-자동화)
3. [Observability 3대 축 통합](#3-observability-3대-축-통합)
4. [SLO/SLI/SLA 기반 장애 대응 체계](#4-sloslisla-기반-장애-대응-체계)
5. [장애 대응 프로세스](#5-장애-대응-프로세스)
6. [Chaos Engineering](#6-chaos-engineering)

---

## 1. AIOps & AI 기반 장애 대응

> AI를 장애 대응의 **모든 단계**에 투입한다. 탐지 -> 분류 -> 원인 분석 -> 롤백 판단 -> 핫픽스 -> Post-mortem까지 AI가 주도하고, 엔지니어는 **검증과 의사결정**에 집중한다. 이상 징후를 사전에 탐지하고, 임계치 초과 시 AI가 자동 롤백과 Feature Flag 비활성화를 수행한다.

### 1.1 AI 장애 분석 프롬프트 라이브러리 (7종)

장애 상황별로 즉시 사용할 수 있는 7가지 표준 프롬프트. Claude, GPT 등 LLM에 그대로 붙여넣어 활용한다.

#### 프롬프트 1: 로그 분석

```text
당신은 시니어 SRE 엔지니어입니다. 아래 로그를 분석하세요.

[분석 대상 로그 붙여넣기]

다음을 수행하세요:
1. 에러/경고 패턴을 시간순으로 정리
2. 첫 번째 이상 징후가 나타난 시점과 해당 로그 라인 식별
3. 에러 간 인과 관계 추론 (예: DB 커넥션 풀 고갈 -> 타임아웃 -> 500 에러)
4. 영향받는 서비스/컴포넌트 목록
5. 즉각적 완화 조치 3가지 제안

출력 형식: 마크다운 테이블 + 타임라인 다이어그램(텍스트)
```

#### 프롬프트 2: 메트릭 상관관계 분석

```text
당신은 Observability 전문가입니다. 아래 메트릭 데이터의 상관관계를 분석하세요.

- 시간 범위: [장애 발생 전후 30분]
- CPU 사용률: [데이터]
- 메모리 사용률: [데이터]
- 요청 처리량 (RPS): [데이터]
- 응답 시간 (p50/p95/p99): [데이터]
- 에러율: [데이터]
- DB 커넥션 수: [데이터]

다음을 수행하세요:
1. 메트릭 간 상관계수가 높은 쌍 식별
2. 선행 지표(leading indicator)와 후행 지표(lagging indicator) 구분
3. 변곡점(inflection point) 시점과 원인 추정
4. 병목 지점 진단
5. 용량 계획 관점의 임계치 권고
```

#### 프롬프트 3: 분산 트레이스 분석

```text
당신은 분산 시스템 전문가입니다. 아래 트레이스 데이터를 분석하세요.

[OpenTelemetry 트레이스 JSON 또는 Jaeger 출력 붙여넣기]

다음을 수행하세요:
1. 전체 요청 흐름을 서비스 간 호출 다이어그램으로 시각화
2. 각 span의 duration 분석 -- 비정상적으로 긴 span 식별
3. 실패한 span의 에러 코드/메시지와 전파 경로
4. 재시도(retry) 패턴 탐지 및 재시도 폭풍(retry storm) 여부 판단
5. 서비스 간 타임아웃 설정 불일치 탐지
6. 최적화 포인트 3가지 제안
```

#### 프롬프트 4: 에러 패턴 분류

```text
당신은 소프트웨어 신뢰성 엔지니어입니다. 최근 24시간 에러 로그를 분석하세요.

[에러 로그 샘플 100건 이상 붙여넣기]

다음을 수행하세요:
1. 에러를 유형별로 클러스터링 (스택 트레이스 유사도 기반)
2. 각 클러스터의 발생 빈도, 최초/최근 발생 시각, 추세
3. 신규 에러 vs 기존 에러 분류
4. 사용자 영향도 기준 우선순위 매기기 (P0~P3)
5. 각 에러 클러스터별 추정 원인과 수정 방향
6. 동일 에러 재발 방지를 위한 테스트 케이스 제안
```

#### 프롬프트 5: Post-mortem 초안 생성

```text
당신은 SRE 팀의 Post-mortem 작성자입니다.
아래 장애 정보를 바탕으로 Blameless Post-mortem 초안을 작성하세요.

- 장애 제목: [제목]
- 심각도: [SEV1~4]
- 영향 범위: [영향받은 사용자 수/서비스]
- 타임라인: [탐지 시각, 대응 시작, 완화, 해결]
- 근본 원인: [확인된 원인 또는 추정]
- 복구 조치: [수행한 조치 목록]

다음 형식으로 작성하세요:
1. 요약 (3줄 이내)
2. 영향도 (사용자 수, 매출 영향, SLO 소진량)
3. 타임라인 (5분 단위로 상세하게)
4. 근본 원인 분석 (5 Whys 기법)
5. 교훈 (잘한 점 / 개선할 점 / 행운이었던 점)
6. 액션 아이템 (담당자, 기한 포함)
7. 재발 방지 메트릭/알림 설정 제안
```

#### 프롬프트 6: 복구 전략 수립

```text
당신은 시스템 복구 전문가입니다. 아래 장애 상황에 대한 최적 복구 전략을 수립하세요.

- 장애 유형: [서비스 다운 / 성능 저하 / 데이터 불일치 / 보안 침해]
- 영향받는 환경: [production / beta-1~N / staging / preview]
- 현재 상태: [에러율, 응답 시간, 영향받는 엔드포인트]
- 최근 배포: [마지막 배포 시각, 변경 내용, 배포 방식]
- Feature Flag 상태: [활성화된 플래그 목록]

다음을 수행하세요:
1. 즉시 실행 가능한 완화 조치 (5분 이내)
   - 롤백 vs Feature Flag 비활성화 vs 트래픽 제한 판단 근거
2. 단계별 복구 계획 (시간순)
3. 각 단계의 성공 기준과 검증 방법
4. 복구 중 모니터링해야 할 핵심 메트릭
5. 복구 실패 시 에스컬레이션 플랜
6. 멀티 베타 환경별 차등 복구 전략
```

#### 프롬프트 7: 예방 조치 설계

```text
당신은 시스템 신뢰성 아키텍트입니다.
아래 장애 이력을 바탕으로 재발 방지를 위한 예방 조치를 설계하세요.

[최근 3개월 장애 이력 또는 Post-mortem 요약 붙여넣기]

다음을 수행하세요:
1. 장애 패턴 분석 (유형별 빈도, MTTR 추이, 반복 원인)
2. 아키텍처 수준 개선 사항 (서킷 브레이커, 격벽, 폴백 등)
3. 코드 수준 개선 사항 (에러 핸들링, 재시도 로직, 타임아웃)
4. 모니터링 강화 항목 (새 알림, SLO 조정, 대시보드)
5. Chaos Engineering 실험 설계 (가설, 실험 방법, 기대 결과)
6. 예방 조치별 우선순위와 예상 효과 (MTTR 단축 기대치)
7. 멀티 베타 환경을 활용한 단계적 검증 계획
```

### 1.2 AI 기반 장애 예측 시스템

이상 징후를 사전에 탐지하여 장애가 발생하기 전에 Slack 경고를 보낸다.

#### 이상 징후 탐지 엔진

```typescript
// monitoring/anomalyDetector.ts
interface MetricDataPoint {
  timestamp: number;
  value: number;
}

interface AnomalyResult {
  metric: string;
  isAnomaly: boolean;
  severity: "low" | "medium" | "high" | "critical";
  currentValue: number;
  expectedRange: { min: number; max: number };
  deviationPercent: number;
  message: string;
}

interface AnomalyConfig {
  metric: string;
  windowSize: number; // 이동 평균 윈도우 (분)
  stddevThreshold: number; // 표준편차 배수
  minDataPoints: number;
}

const DEFAULT_CONFIGS: AnomalyConfig[] = [
  { metric: "error_rate", windowSize: 15, stddevThreshold: 2.5, minDataPoints: 30 },
  { metric: "response_time_p99", windowSize: 10, stddevThreshold: 3, minDataPoints: 20 },
  { metric: "cpu_usage", windowSize: 5, stddevThreshold: 2, minDataPoints: 60 },
  { metric: "memory_usage", windowSize: 5, stddevThreshold: 2, minDataPoints: 60 },
  { metric: "request_rate", windowSize: 10, stddevThreshold: 3, minDataPoints: 30 },
];

function calculateStats(values: number[]): { mean: number; stddev: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, stddev: Math.sqrt(variance) };
}

export function detectAnomaly(
  config: AnomalyConfig,
  historicalData: MetricDataPoint[],
  currentValue: number,
): AnomalyResult {
  if (historicalData.length < config.minDataPoints) {
    return {
      metric: config.metric,
      isAnomaly: false,
      severity: "low",
      currentValue,
      expectedRange: { min: 0, max: Infinity },
      deviationPercent: 0,
      message: `Insufficient data (${historicalData.length}/${config.minDataPoints})`,
    };
  }

  const values = historicalData.map((d) => d.value);
  const { mean, stddev } = calculateStats(values);
  const lowerBound = mean - config.stddevThreshold * stddev;
  const upperBound = mean + config.stddevThreshold * stddev;
  const isAnomaly = currentValue < lowerBound || currentValue > upperBound;
  const deviationPercent =
    mean === 0 ? 0 : ((currentValue - mean) / mean) * 100;

  let severity: AnomalyResult["severity"] = "low";
  if (Math.abs(deviationPercent) > 100) severity = "critical";
  else if (Math.abs(deviationPercent) > 50) severity = "high";
  else if (Math.abs(deviationPercent) > 25) severity = "medium";

  return {
    metric: config.metric,
    isAnomaly,
    severity,
    currentValue,
    expectedRange: { min: Math.max(0, lowerBound), max: upperBound },
    deviationPercent,
    message: isAnomaly
      ? `${config.metric} anomaly detected: ${currentValue.toFixed(2)} (expected ${lowerBound.toFixed(2)}~${upperBound.toFixed(2)})`
      : `${config.metric} within normal range`,
  };
}

export async function runAnomalyDetection(
  fetchMetrics: (metric: string, windowMinutes: number) => Promise<MetricDataPoint[]>,
  getCurrentValue: (metric: string) => Promise<number>,
): Promise<AnomalyResult[]> {
  const results: AnomalyResult[] = [];

  for (const config of DEFAULT_CONFIGS) {
    const historical = await fetchMetrics(config.metric, config.windowSize * 10);
    const current = await getCurrentValue(config.metric);
    results.push(detectAnomaly(config, historical, current));
  }

  return results;
}
```

#### Slack 경고 발송

```typescript
// monitoring/slackAlert.ts
interface SlackAlertPayload {
  channel: string;
  text: string;
  blocks: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: Array<{ type: string; text: string }>;
}

interface AnomalyResult {
  metric: string;
  isAnomaly: boolean;
  severity: "low" | "medium" | "high" | "critical";
  currentValue: number;
  expectedRange: { min: number; max: number };
  deviationPercent: number;
  message: string;
}

const SEVERITY_EMOJI: Record<string, string> = {
  low: "white_circle",
  medium: "large_yellow_circle",
  high: "red_circle",
  critical: "rotating_light",
};

export function buildAnomalyAlert(
  anomalies: AnomalyResult[],
  environment: string,
): SlackAlertPayload {
  const critical = anomalies.filter(
    (a) => a.isAnomaly && (a.severity === "critical" || a.severity === "high"),
  );

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Anomaly Detected - ${environment}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${critical.length}* critical/high anomalies detected at ${new Date().toISOString()}`,
      },
    },
  ];

  for (const anomaly of anomalies.filter((a) => a.isAnomaly)) {
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Metric:* :${SEVERITY_EMOJI[anomaly.severity]}: ${anomaly.metric}`,
        },
        {
          type: "mrkdwn",
          text: `*Current:* ${anomaly.currentValue.toFixed(2)}`,
        },
        {
          type: "mrkdwn",
          text: `*Expected:* ${anomaly.expectedRange.min.toFixed(2)} ~ ${anomaly.expectedRange.max.toFixed(2)}`,
        },
        {
          type: "mrkdwn",
          text: `*Deviation:* ${anomaly.deviationPercent.toFixed(1)}%`,
        },
      ],
    });
  }

  return {
    channel: critical.length > 0 ? "#incidents" : "#monitoring",
    text: `[${environment}] ${critical.length} anomalies detected`,
    blocks,
  };
}

export async function sendSlackAlert(
  webhookUrl: string,
  payload: SlackAlertPayload,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack alert failed: ${response.status} ${response.statusText}`);
  }
}
```

#### 예측 스케줄러 (GitHub Actions)

```yaml
# .github/workflows/anomaly-detection.yml
name: Anomaly Detection
on:
  schedule:
    - cron: "*/5 * * * *" # 5분마다 실행
  workflow_dispatch:

jobs:
  detect:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [production, beta-1, beta-2, staging]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci

      - name: Run Anomaly Detection
        run: npx tsx monitoring/runDetection.ts
        env:
          TARGET_ENV: ${{ matrix.environment }}
          METRICS_API_URL: ${{ secrets.METRICS_API_URL }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 1.3 AI 자동 복구 시스템

에러율 임계치 초과 시 AI가 롤백 판단과 Feature Flag 자동 비활성화를 수행한다.

#### 자동 복구 의사결정 엔진

```typescript
// recovery/autoRecovery.ts
interface EnvironmentStatus {
  name: string;
  errorRate: number; // 0~1
  responseTimeP99: number; // ms
  activeFeatureFlags: string[];
  lastDeployTimestamp: number;
  lastDeployCommit: string;
}

interface RecoveryDecision {
  action: "none" | "disable-flag" | "rollback" | "scale-up" | "circuit-break";
  targetFlag?: string;
  rollbackToCommit?: string;
  reason: string;
  confidence: number; // 0~1
  requiresApproval: boolean;
}

interface RecoveryConfig {
  errorRateThreshold: number;
  responseTimeThresholdMs: number;
  autoApprovalConfidence: number; // 이 이상이면 자동 실행
  recentDeployWindowMs: number; // 최근 배포 판단 기준 시간
}

const DEFAULT_CONFIG: RecoveryConfig = {
  errorRateThreshold: 0.05, // 5%
  responseTimeThresholdMs: 3000,
  autoApprovalConfidence: 0.9,
  recentDeployWindowMs: 30 * 60 * 1000, // 30분
};

export function makeRecoveryDecision(
  status: EnvironmentStatus,
  config: RecoveryConfig = DEFAULT_CONFIG,
): RecoveryDecision {
  const isErrorRateHigh = status.errorRate > config.errorRateThreshold;
  const isResponseTimeSlow =
    status.responseTimeP99 > config.responseTimeThresholdMs;
  const isRecentDeploy =
    Date.now() - status.lastDeployTimestamp < config.recentDeployWindowMs;

  // 케이스 1: 에러율 급등 + 최근 배포 -> 롤백
  if (isErrorRateHigh && isRecentDeploy) {
    return {
      action: "rollback",
      rollbackToCommit: status.lastDeployCommit,
      reason: `Error rate ${(status.errorRate * 100).toFixed(1)}% exceeds ${config.errorRateThreshold * 100}% threshold. Recent deploy detected.`,
      confidence: 0.85,
      requiresApproval: true,
    };
  }

  // 케이스 2: 에러율 급등 + Feature Flag 활성 -> 플래그 비활성화
  if (isErrorRateHigh && status.activeFeatureFlags.length > 0) {
    // 가장 최근 활성화된 플래그를 비활성화 대상으로 선택
    const targetFlag =
      status.activeFeatureFlags[status.activeFeatureFlags.length - 1];
    return {
      action: "disable-flag",
      targetFlag,
      reason: `Error rate ${(status.errorRate * 100).toFixed(1)}% exceeds threshold. Disabling most recent flag: ${targetFlag}`,
      confidence: 0.7,
      requiresApproval: false,
    };
  }

  // 케이스 3: 응답 시간 급등 -> 서킷 브레이커
  if (isResponseTimeSlow && !isErrorRateHigh) {
    return {
      action: "circuit-break",
      reason: `P99 response time ${status.responseTimeP99}ms exceeds ${config.responseTimeThresholdMs}ms threshold.`,
      confidence: 0.6,
      requiresApproval: true,
    };
  }

  // 케이스 4: 에러율 높지만 원인 불분명
  if (isErrorRateHigh) {
    return {
      action: "rollback",
      rollbackToCommit: status.lastDeployCommit,
      reason: `Error rate ${(status.errorRate * 100).toFixed(1)}% exceeds threshold. No clear cause identified. Rollback recommended.`,
      confidence: 0.5,
      requiresApproval: true,
    };
  }

  return {
    action: "none",
    reason: "All metrics within normal range.",
    confidence: 1.0,
    requiresApproval: false,
  };
}
```

#### Feature Flag 자동 비활성화

```typescript
// recovery/flagController.ts
interface FlagToggleResult {
  flag: string;
  previousState: boolean;
  newState: boolean;
  environment: string;
  timestamp: number;
}

interface FlagProvider {
  getFlag(env: string, flag: string): Promise<boolean>;
  setFlag(env: string, flag: string, enabled: boolean): Promise<void>;
}

export async function disableFlag(
  provider: FlagProvider,
  environment: string,
  flagName: string,
): Promise<FlagToggleResult> {
  const previousState = await provider.getFlag(environment, flagName);

  if (!previousState) {
    return {
      flag: flagName,
      previousState: false,
      newState: false,
      environment,
      timestamp: Date.now(),
    };
  }

  await provider.setFlag(environment, flagName, false);

  return {
    flag: flagName,
    previousState: true,
    newState: false,
    environment,
    timestamp: Date.now(),
  };
}

export async function disableAllFlags(
  provider: FlagProvider,
  environment: string,
  flags: string[],
): Promise<FlagToggleResult[]> {
  const results: FlagToggleResult[] = [];

  for (const flag of flags) {
    const result = await disableFlag(provider, environment, flag);
    results.push(result);
  }

  return results;
}
```

#### 자동 복구 실행기

```typescript
// recovery/executor.ts
interface RecoveryDecision {
  action: "none" | "disable-flag" | "rollback" | "scale-up" | "circuit-break";
  targetFlag?: string;
  rollbackToCommit?: string;
  reason: string;
  confidence: number;
  requiresApproval: boolean;
}

interface RecoveryExecution {
  decision: RecoveryDecision;
  executed: boolean;
  result: string;
  timestamp: number;
}

interface RecoveryDeps {
  rollback(commit: string): Promise<void>;
  disableFlag(flag: string): Promise<void>;
  enableCircuitBreaker(service: string): Promise<void>;
  sendAlert(message: string, channel: string): Promise<void>;
  requestApproval(message: string): Promise<boolean>;
}

export async function executeRecovery(
  decision: RecoveryDecision,
  environment: string,
  deps: RecoveryDeps,
): Promise<RecoveryExecution> {
  const execution: RecoveryExecution = {
    decision,
    executed: false,
    result: "",
    timestamp: Date.now(),
  };

  if (decision.action === "none") {
    execution.result = "No action required.";
    return execution;
  }

  // 승인이 필요한 경우
  if (decision.requiresApproval) {
    const approved = await deps.requestApproval(
      `[${environment}] Recovery action: ${decision.action}\nReason: ${decision.reason}\nConfidence: ${(decision.confidence * 100).toFixed(0)}%`,
    );
    if (!approved) {
      execution.result = "Recovery action rejected by operator.";
      return execution;
    }
  }

  try {
    switch (decision.action) {
      case "disable-flag":
        if (decision.targetFlag) {
          await deps.disableFlag(decision.targetFlag);
          execution.result = `Feature flag '${decision.targetFlag}' disabled.`;
        }
        break;

      case "rollback":
        if (decision.rollbackToCommit) {
          await deps.rollback(decision.rollbackToCommit);
          execution.result = `Rolled back to commit ${decision.rollbackToCommit}.`;
        }
        break;

      case "circuit-break":
        await deps.enableCircuitBreaker(environment);
        execution.result = `Circuit breaker enabled for ${environment}.`;
        break;

      default:
        execution.result = `Unknown action: ${decision.action}`;
        return execution;
    }

    execution.executed = true;
    await deps.sendAlert(
      `[AUTO-RECOVERY] ${environment}: ${execution.result}\nReason: ${decision.reason}`,
      "#incidents",
    );
  } catch (error) {
    execution.result = `Recovery failed: ${error instanceof Error ? error.message : String(error)}`;
    await deps.sendAlert(
      `[AUTO-RECOVERY FAILED] ${environment}: ${execution.result}`,
      "#incidents-critical",
    );
  }

  return execution;
}
```

---

## 2. 멀티 베타 환경 장애 대응

### 2.1 환경별 장애 격리 및 라우팅

```typescript
// incident/environmentRouter.ts
interface BetaEnvironment {
  name: string;
  baseUrl: string;
  healthEndpoint: string;
  priority: number; // 1 = 최고 우선순위 (production)
}

interface HealthStatus {
  environment: string;
  healthy: boolean;
  errorRate: number;
  responseTimeMs: number;
  checkedAt: number;
}

interface RoutingDecision {
  from: string;
  to: string;
  reason: string;
  timestamp: number;
}

const environments: BetaEnvironment[] = [
  { name: "production", baseUrl: "https://app.example.com", healthEndpoint: "/health", priority: 1 },
  { name: "beta-1", baseUrl: "https://beta-1.example.com", healthEndpoint: "/health", priority: 2 },
  { name: "beta-2", baseUrl: "https://beta-2.example.com", healthEndpoint: "/health", priority: 3 },
  { name: "staging", baseUrl: "https://staging.example.com", healthEndpoint: "/health", priority: 4 },
];

export async function checkHealth(env: BetaEnvironment): Promise<HealthStatus> {
  const start = Date.now();

  try {
    const response = await fetch(`${env.baseUrl}${env.healthEndpoint}`, {
      signal: AbortSignal.timeout(5000),
    });
    const responseTime = Date.now() - start;
    const data = await response.json();

    return {
      environment: env.name,
      healthy: response.ok && data.status === "ok",
      errorRate: data.errorRate ?? 0,
      responseTimeMs: responseTime,
      checkedAt: Date.now(),
    };
  } catch {
    return {
      environment: env.name,
      healthy: false,
      errorRate: 1,
      responseTimeMs: Date.now() - start,
      checkedAt: Date.now(),
    };
  }
}

export async function checkAllEnvironments(): Promise<HealthStatus[]> {
  return Promise.all(environments.map(checkHealth));
}

export function determineRouting(
  statuses: HealthStatus[],
  failedEnv: string,
): RoutingDecision | null {
  const failed = statuses.find((s) => s.environment === failedEnv);
  if (!failed || failed.healthy) return null;

  const healthy = statuses
    .filter((s) => s.healthy && s.environment !== failedEnv)
    .sort((a, b) => {
      const aPriority = environments.find((e) => e.name === a.environment)?.priority ?? 99;
      const bPriority = environments.find((e) => e.name === b.environment)?.priority ?? 99;
      return aPriority - bPriority;
    });

  if (healthy.length === 0) return null;

  return {
    from: failedEnv,
    to: healthy[0].environment,
    reason: `${failedEnv} unhealthy (error rate: ${(failed.errorRate * 100).toFixed(1)}%). Routing to ${healthy[0].environment}.`,
    timestamp: Date.now(),
  };
}
```

### 2.2 멀티 베타 장애 시뮬레이션 자동화

Chaos Engineering과 AI 결과 분석을 결합하여 멀티 베타 환경에서 장애 시뮬레이션을 자동화한다.

#### Chaos 실험 정의 및 실행

```typescript
// chaos/chaosEngine.ts
interface ChaosExperiment {
  id: string;
  name: string;
  targetEnvironment: string;
  type: "latency" | "error-injection" | "resource-exhaustion" | "dependency-failure";
  config: LatencyConfig | ErrorConfig | ResourceConfig | DependencyConfig;
  durationSeconds: number;
  rollbackOnFailure: boolean;
}

interface LatencyConfig {
  type: "latency";
  targetService: string;
  delayMs: number;
  jitterMs: number;
}

interface ErrorConfig {
  type: "error-injection";
  targetEndpoint: string;
  errorRate: number; // 0~1
  statusCode: number;
}

interface ResourceConfig {
  type: "resource-exhaustion";
  resource: "cpu" | "memory" | "disk" | "connections";
  targetPercent: number;
}

interface DependencyConfig {
  type: "dependency-failure";
  targetDependency: string;
  failureMode: "timeout" | "connection-refused" | "intermittent";
}

type ExperimentConfig = LatencyConfig | ErrorConfig | ResourceConfig | DependencyConfig;

interface ExperimentResult {
  experimentId: string;
  environment: string;
  startTime: number;
  endTime: number;
  metrics: {
    errorRateBefore: number;
    errorRateDuring: number;
    errorRateAfter: number;
    responseTimeBefore: number;
    responseTimeDuring: number;
    responseTimeAfter: number;
    recoveryTimeMs: number;
  };
  passed: boolean;
  findings: string[];
}

export function createExperiment(
  name: string,
  targetEnvironment: string,
  config: ExperimentConfig,
  durationSeconds = 300,
): ChaosExperiment {
  return {
    id: `chaos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    targetEnvironment,
    type: config.type,
    config,
    durationSeconds,
    rollbackOnFailure: true,
  };
}

// 사전 정의된 실험 시나리오
export const STANDARD_EXPERIMENTS: Array<{
  name: string;
  config: ExperimentConfig;
}> = [
  {
    name: "API 지연 주입",
    config: {
      type: "latency",
      targetService: "api-gateway",
      delayMs: 2000,
      jitterMs: 500,
    },
  },
  {
    name: "DB 커넥션 고갈",
    config: {
      type: "resource-exhaustion",
      resource: "connections",
      targetPercent: 95,
    },
  },
  {
    name: "결제 서비스 장애",
    config: {
      type: "dependency-failure",
      targetDependency: "payment-service",
      failureMode: "timeout",
    },
  },
  {
    name: "간헐적 500 에러",
    config: {
      type: "error-injection",
      targetEndpoint: "/api/products",
      errorRate: 0.3,
      statusCode: 500,
    },
  },
];
```

#### AI 기반 실험 결과 분석

```typescript
// chaos/resultAnalyzer.ts
interface ExperimentResult {
  experimentId: string;
  environment: string;
  startTime: number;
  endTime: number;
  metrics: {
    errorRateBefore: number;
    errorRateDuring: number;
    errorRateAfter: number;
    responseTimeBefore: number;
    responseTimeDuring: number;
    responseTimeAfter: number;
    recoveryTimeMs: number;
  };
  passed: boolean;
  findings: string[];
}

interface AnalysisReport {
  summary: string;
  resilienceScore: number; // 0~100
  findings: Finding[];
  recommendations: string[];
  comparisonWithPrevious?: ComparisonResult;
}

interface Finding {
  severity: "info" | "warning" | "critical";
  category: string;
  description: string;
  evidence: string;
}

interface ComparisonResult {
  previousScore: number;
  currentScore: number;
  trend: "improving" | "degrading" | "stable";
  changedMetrics: string[];
}

export function analyzeResults(results: ExperimentResult[]): AnalysisReport {
  const findings: Finding[] = [];
  const recommendations: string[] = [];
  let totalScore = 0;

  for (const result of results) {
    const { metrics } = result;

    // 에러율 분석
    const errorRateIncrease = metrics.errorRateDuring - metrics.errorRateBefore;
    if (errorRateIncrease > 0.1) {
      findings.push({
        severity: "critical",
        category: "Error Handling",
        description: `Error rate increased by ${(errorRateIncrease * 100).toFixed(1)}% during chaos experiment`,
        evidence: `Before: ${(metrics.errorRateBefore * 100).toFixed(1)}%, During: ${(metrics.errorRateDuring * 100).toFixed(1)}%`,
      });
    }

    // 복구 시간 분석
    if (metrics.recoveryTimeMs > 60000) {
      findings.push({
        severity: "warning",
        category: "Recovery",
        description: `Recovery time ${(metrics.recoveryTimeMs / 1000).toFixed(0)}s exceeds 60s target`,
        evidence: `Error rate after recovery: ${(metrics.errorRateAfter * 100).toFixed(1)}%`,
      });
      recommendations.push(
        "Implement circuit breaker with faster trip threshold",
      );
    }

    // 응답 시간 분석
    const responseTimeDegradation =
      metrics.responseTimeDuring / metrics.responseTimeBefore;
    if (responseTimeDegradation > 3) {
      findings.push({
        severity: "warning",
        category: "Performance",
        description: `Response time degraded ${responseTimeDegradation.toFixed(1)}x during experiment`,
        evidence: `Before: ${metrics.responseTimeBefore}ms, During: ${metrics.responseTimeDuring}ms`,
      });
      recommendations.push("Add request timeout and bulkhead isolation");
    }

    // 점수 계산
    const errorScore = Math.max(0, 100 - errorRateIncrease * 500);
    const recoveryScore = Math.max(
      0,
      100 - (metrics.recoveryTimeMs / 1000) * 2,
    );
    const responseScore = Math.max(
      0,
      100 - (responseTimeDegradation - 1) * 30,
    );
    totalScore += (errorScore + recoveryScore + responseScore) / 3;
  }

  const resilienceScore =
    results.length > 0 ? Math.round(totalScore / results.length) : 0;

  return {
    summary: `Resilience Score: ${resilienceScore}/100. ${findings.filter((f) => f.severity === "critical").length} critical, ${findings.filter((f) => f.severity === "warning").length} warning findings.`,
    resilienceScore,
    findings,
    recommendations,
  };
}

export function generateAIAnalysisPrompt(
  results: ExperimentResult[],
  report: AnalysisReport,
): string {
  return `당신은 Chaos Engineering 전문가입니다. 아래 실험 결과를 분석하세요.

## 실험 결과
${JSON.stringify(results, null, 2)}

## 자동 분석 리포트
- Resilience Score: ${report.resilienceScore}/100
- Findings: ${report.findings.length}개
- Critical: ${report.findings.filter((f) => f.severity === "critical").length}개

다음을 수행하세요:
1. 각 실험의 시스템 복원력 평가 (서킷 브레이커, 폴백, 격벽 동작 여부)
2. 장애 전파 경로 분석 (어떤 장애가 다른 서비스에 영향을 미쳤는지)
3. 자동 복구 메커니즘의 효과성 평가
4. 개선이 필요한 영역과 구체적 코드 수준 수정 제안
5. 다음 Chaos 실험 설계 제안 (이번 실험에서 발견된 약점 기반)
6. 멀티 베타 환경 간 복원력 차이 분석`;
}
```

#### Chaos 실험 자동화 (GitHub Actions)

```yaml
# .github/workflows/chaos-engineering.yml
name: Chaos Engineering
on:
  schedule:
    - cron: "0 3 * * 3" # 매주 수요일 새벽 3시
  workflow_dispatch:
    inputs:
      experiment:
        description: "Experiment name"
        type: choice
        options:
          - all
          - api-latency
          - db-connection
          - payment-failure
          - error-injection

jobs:
  chaos:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        environment: [beta-1, beta-2]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci

      - name: Run Chaos Experiment
        run: npx tsx chaos/run.ts
        env:
          TARGET_ENV: ${{ matrix.environment }}
          EXPERIMENT: ${{ inputs.experiment || 'all' }}
          CHAOS_API_KEY: ${{ secrets.CHAOS_API_KEY }}

      - name: Analyze Results
        run: npx tsx chaos/analyze.ts
        env:
          TARGET_ENV: ${{ matrix.environment }}

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: chaos-report-${{ matrix.environment }}
          path: chaos-results/

      - name: Post Results to Slack
        run: npx tsx chaos/notifySlack.ts
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          TARGET_ENV: ${{ matrix.environment }}
```

---

## 3. Observability 3대 축 통합

### 3.1 OpenTelemetry 통합 설정

```typescript
// observability/tracing.ts
import {
  trace,
  context,
  SpanStatusCode,
  type Span,
  type Tracer,
} from "@opentelemetry/api";

const SERVICE_NAME = process.env.SERVICE_NAME || "frontend";
const ENVIRONMENT = process.env.DEPLOY_ENV || "development";

export function getTracer(name?: string): Tracer {
  return trace.getTracer(name || SERVICE_NAME);
}

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }
    span.setAttribute("environment", ENVIRONMENT);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### 3.2 구조화된 로깅

```typescript
// observability/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  environment: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, unknown>;
}

const SERVICE_NAME = process.env.SERVICE_NAME || "frontend";
const ENVIRONMENT = process.env.DEPLOY_ENV || "development";

function createEntry(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    metadata,
  };
}

export const logger = {
  debug: (message: string, metadata?: Record<string, unknown>) =>
    console.debug(JSON.stringify(createEntry("debug", message, metadata))),

  info: (message: string, metadata?: Record<string, unknown>) =>
    console.info(JSON.stringify(createEntry("info", message, metadata))),

  warn: (message: string, metadata?: Record<string, unknown>) =>
    console.warn(JSON.stringify(createEntry("warn", message, metadata))),

  error: (message: string, error?: Error, metadata?: Record<string, unknown>) =>
    console.error(
      JSON.stringify(
        createEntry("error", message, {
          ...metadata,
          error: error
            ? { name: error.name, message: error.message, stack: error.stack }
            : undefined,
        }),
      ),
    ),
};
```

### 3.3 메트릭 수집

```typescript
// observability/metrics.ts
interface MetricOptions {
  name: string;
  description: string;
  unit: string;
}

interface Counter {
  add(value: number, attributes?: Record<string, string>): void;
}

interface Histogram {
  record(value: number, attributes?: Record<string, string>): void;
}

// 범용 메트릭 팩토리 (OpenTelemetry, Prometheus 등 백엔드에 무관하게 사용 가능)
class MetricsRegistry {
  private counters = new Map<string, { value: number; attributes: Record<string, string> }[]>();
  private histograms = new Map<string, { value: number; attributes: Record<string, string> }[]>();

  createCounter(options: MetricOptions): Counter {
    this.counters.set(options.name, []);
    return {
      add: (value: number, attributes: Record<string, string> = {}) => {
        this.counters.get(options.name)?.push({ value, attributes });
      },
    };
  }

  createHistogram(options: MetricOptions): Histogram {
    this.histograms.set(options.name, []);
    return {
      record: (value: number, attributes: Record<string, string> = {}) => {
        this.histograms.get(options.name)?.push({ value, attributes });
      },
    };
  }
}

export const registry = new MetricsRegistry();

export const httpRequestDuration = registry.createHistogram({
  name: "http_request_duration_ms",
  description: "HTTP request duration in milliseconds",
  unit: "ms",
});

export const httpRequestTotal = registry.createCounter({
  name: "http_request_total",
  description: "Total HTTP requests",
  unit: "1",
});

export const errorTotal = registry.createCounter({
  name: "error_total",
  description: "Total errors",
  unit: "1",
});

export const featureFlagEvaluation = registry.createCounter({
  name: "feature_flag_evaluation_total",
  description: "Feature flag evaluations",
  unit: "1",
});
```

---

## 4. SLO/SLI/SLA 기반 장애 대응 체계

### 4.1 SLI/SLO 정의

```typescript
// slo/definitions.ts
interface SLI {
  name: string;
  description: string;
  query: string; // 모니터링 시스템 쿼리
  unit: string;
}

interface SLO {
  name: string;
  sli: SLI;
  target: number;
  window: "30d" | "7d" | "24h";
  burnRateThresholds: {
    critical: number; // 빠르게 소진 (1시간 내)
    warning: number; // 느리게 소진 (6시간 내)
  };
}

export const SLO_DEFINITIONS: SLO[] = [
  {
    name: "Availability",
    sli: {
      name: "success_rate",
      description: "Non-5xx responses / Total responses",
      query: "sum(rate(http_requests_total{status!~'5..'}[5m])) / sum(rate(http_requests_total[5m]))",
      unit: "ratio",
    },
    target: 0.999, // 99.9%
    window: "30d",
    burnRateThresholds: { critical: 14.4, warning: 6 },
  },
  {
    name: "Latency",
    sli: {
      name: "fast_requests_rate",
      description: "Requests under 300ms / Total requests",
      query: "sum(rate(http_request_duration_ms_bucket{le='300'}[5m])) / sum(rate(http_request_duration_ms_count[5m]))",
      unit: "ratio",
    },
    target: 0.95, // 95%
    window: "30d",
    burnRateThresholds: { critical: 14.4, warning: 6 },
  },
];

export function calculateErrorBudget(
  slo: SLO,
  currentSLI: number,
): { totalBudget: number; consumed: number; remaining: number; remainingPercent: number } {
  const totalBudget = 1 - slo.target;
  const consumed = Math.max(0, 1 - currentSLI - (1 - 1)); // simplified
  const remaining = totalBudget - (1 - currentSLI);
  const remainingPercent = (remaining / totalBudget) * 100;

  return {
    totalBudget,
    consumed: 1 - currentSLI,
    remaining: Math.max(0, remaining),
    remainingPercent: Math.max(0, remainingPercent),
  };
}
```

### 4.2 번 레이트 알림

```typescript
// slo/burnRateAlert.ts
interface BurnRateCheck {
  sloName: string;
  shortWindowRate: number; // 5분 윈도우
  longWindowRate: number; // 1시간 윈도우
  threshold: number;
  isAlerting: boolean;
  severity: "critical" | "warning" | "ok";
}

export function checkBurnRate(
  sloName: string,
  currentSLI: number,
  target: number,
  thresholds: { critical: number; warning: number },
): BurnRateCheck {
  const errorRate = 1 - currentSLI;
  const allowedErrorRate = 1 - target;
  const burnRate = errorRate / allowedErrorRate;

  let severity: BurnRateCheck["severity"] = "ok";
  let threshold = 0;

  if (burnRate >= thresholds.critical) {
    severity = "critical";
    threshold = thresholds.critical;
  } else if (burnRate >= thresholds.warning) {
    severity = "warning";
    threshold = thresholds.warning;
  }

  return {
    sloName,
    shortWindowRate: burnRate,
    longWindowRate: burnRate,
    threshold,
    isAlerting: severity !== "ok",
    severity,
  };
}
```

---

## 5. 장애 대응 프로세스

### 5.1 대응 플로우

```
장애 탐지 (자동)
    │
    ├── AI 이상 징후 탐지 (5분 간격)
    ├── SLO Burn Rate 알림
    └── 사용자 리포트
         │
         v
  ┌──────────────────┐
  │  자동 분류 (AI)   │  AI가 로그/메트릭/트레이스 분석
  │  SEV1~4 판정      │
  └────────┬─────────┘
           │
     ┌─────┴─────┐
     │           │
   SEV1~2     SEV3~4
     │           │
     v           v
  자동 복구    알림만 발송
  판단 (AI)    (Slack)
     │
     ├── Feature Flag OFF (자동)
     ├── 롤백 (승인 후)
     └── 서킷 브레이커 (자동)
           │
           v
  ┌──────────────────┐
  │  검증 & 모니터링  │  복구 후 메트릭 안정화 확인
  └────────┬─────────┘
           │
           v
  ┌──────────────────┐
  │  Post-mortem     │  AI 초안 생성 -> 팀 리뷰
  │  (AI 프롬프트 5) │
  └──────────────────┘
```

### 5.2 심각도 분류 기준

| 심각도 | 기준 | 대응 시간 | 자동 복구 |
|--------|------|-----------|-----------|
| SEV1 | 전체 서비스 중단, 데이터 유실 위험 | 즉시 | 롤백 (승인 후) |
| SEV2 | 주요 기능 장애, 에러율 > 5% | 15분 이내 | Feature Flag OFF |
| SEV3 | 부분 기능 저하, 에러율 1~5% | 1시간 이내 | 알림만 |
| SEV4 | 경미한 이슈, 에러율 < 1% | 다음 근무일 | 없음 |

### 5.3 온콜 에스컬레이션

```typescript
// incident/escalation.ts
interface OnCallSchedule {
  primary: string;
  secondary: string;
  manager: string;
}

interface EscalationRule {
  severity: "SEV1" | "SEV2" | "SEV3" | "SEV4";
  initialNotify: ("primary" | "secondary" | "manager")[];
  escalateAfterMinutes: number;
  escalateTo: ("primary" | "secondary" | "manager")[];
}

const ESCALATION_RULES: EscalationRule[] = [
  {
    severity: "SEV1",
    initialNotify: ["primary", "secondary", "manager"],
    escalateAfterMinutes: 5,
    escalateTo: ["manager"],
  },
  {
    severity: "SEV2",
    initialNotify: ["primary"],
    escalateAfterMinutes: 15,
    escalateTo: ["primary", "secondary"],
  },
  {
    severity: "SEV3",
    initialNotify: ["primary"],
    escalateAfterMinutes: 60,
    escalateTo: ["secondary"],
  },
  {
    severity: "SEV4",
    initialNotify: ["primary"],
    escalateAfterMinutes: 480,
    escalateTo: ["primary"],
  },
];

export function getEscalationRule(
  severity: EscalationRule["severity"],
): EscalationRule {
  const rule = ESCALATION_RULES.find((r) => r.severity === severity);
  if (!rule) throw new Error(`Unknown severity: ${severity}`);
  return rule;
}

export function getNotificationTargets(
  schedule: OnCallSchedule,
  rule: EscalationRule,
  minutesSinceIncident: number,
): string[] {
  const targets =
    minutesSinceIncident >= rule.escalateAfterMinutes
      ? rule.escalateTo
      : rule.initialNotify;

  return targets.map((role) => schedule[role]);
}
```

---

## 6. Chaos Engineering

### 6.1 실험 원칙

1. **프로덕션이 아닌 베타에서 먼저 실행**: beta-1, beta-2 환경에서 검증 후 staging으로 확대
2. **블래스트 반경 제한**: 한 번에 하나의 장애 유형만 주입, 환경 격리 유지
3. **자동 롤백 준비**: 실험 중 임계치 초과 시 즉시 원상 복구
4. **AI 결과 분석**: 실험 결과를 AI 프롬프트로 분석하여 개선점 도출

### 6.2 주간 Chaos 실험 일정

| 요일 | 환경 | 실험 유형 | 목적 |
|------|------|-----------|------|
| 월 | beta-1 | API 지연 주입 | 타임아웃/서킷 브레이커 검증 |
| 화 | beta-2 | 에러 주입 | 에러 핸들링/폴백 UI 검증 |
| 수 | beta-1, beta-2 | 의존성 장애 | 격벽 패턴/그레이스풀 디그레이데이션 검증 |
| 목 | staging | 리소스 고갈 | 오토스케일링/자원 관리 검증 |
| 금 | - | 결과 분석 | AI 분석 + 개선 액션 아이템 도출 |

### 6.3 실험 결과 대시보드 자동 생성

```typescript
// chaos/dashboard.ts
interface DashboardConfig {
  title: string;
  experiments: Array<{
    name: string;
    environment: string;
    resilienceScore: number;
    trend: "improving" | "degrading" | "stable";
    lastRun: string;
  }>;
}

export function generateDashboardMarkdown(config: DashboardConfig): string {
  let md = `# ${config.title}\n\n`;
  md += `| Experiment | Environment | Score | Trend | Last Run |\n`;
  md += `|------------|-------------|-------|-------|----------|\n`;

  for (const exp of config.experiments) {
    const trendIcon =
      exp.trend === "improving"
        ? "UP"
        : exp.trend === "degrading"
          ? "DOWN"
          : "STABLE";
    md += `| ${exp.name} | ${exp.environment} | ${exp.resilienceScore}/100 | ${trendIcon} | ${exp.lastRun} |\n`;
  }

  return md;
}
```
