# API 통신 계층 가이드 (2026)

## 목차
1. [AI 활용 극대화 - 프롬프트 7선](#1-ai-활용-극대화---프롬프트-7선)
2. [멀티 베타 환경 API 전략](#2-멀티-베타-환경-api-전략)
3. [REST vs GraphQL vs tRPC vs gRPC-Web 비교](#3-rest-vs-graphql-vs-trpc-vs-grpc-web-비교)
4. [BFF (Backend For Frontend) 패턴](#4-bff-backend-for-frontend-패턴)
5. [OpenAPI 코드젠 (orval, openapi-typescript)](#5-openapi-코드젠-orval-openapi-typescript)
6. [HTTP 클라이언트 래퍼 설계](#6-http-클라이언트-래퍼-설계)
7. [에러 핸들링 표준화 (Result 패턴 + Effect-TS)](#7-에러-핸들링-표준화-result-패턴--effect-ts)
8. [API 버전 관리 전략](#8-api-버전-관리-전략)
9. [캐싱 전략](#9-캐싱-전략)
10. [체크리스트](#10-체크리스트)

---

## 1. AI 활용 극대화 - 프롬프트 7선

> API 통신 계층에서 AI를 활용하면 **OpenAPI 스펙 기반 타입 안전 클라이언트 자동 생성**, **에러 핸들링 패턴 일괄 적용**, **API 변경 영향도 분석 자동화**가 가능하다. 수동 코드 작성을 70% 이상 줄이는 것이 목표다.

### 프롬프트 1: API 클라이언트 생성

```text
아래 OpenAPI 스펙을 분석하여 타입 안전한 API 클라이언트를 생성하라.

## 요구사항
1. 각 엔드포인트별 요청/응답 TypeScript 타입 자동 추출
2. Path parameter, query parameter, request body 분리
3. 에러 응답 타입도 유니온으로 정의
4. TanStack Query (v5)용 queryKey factory + hook 자동 생성
5. MSW handler도 함께 생성하여 테스트 지원

## OpenAPI 스펙
{spec_content}

## 출력 형식
- types.ts: 모든 요청/응답 타입
- client.ts: fetch 기반 API 함수
- queries.ts: TanStack Query hooks
- mocks.ts: MSW handlers
```

### 프롬프트 2: OpenAPI 코드젠 설정 자동화

```text
프로젝트의 OpenAPI 스펙 파일과 기존 API 호출 코드를 분석하여 최적의 코드젠 설정을 생성하라.

## 현재 환경
- 스펙 위치: {spec_path}
- 사용 중인 HTTP 클라이언트: {client_type} (fetch / axios / ky)
- 상태 관리: {state_lib} (TanStack Query / SWR / zustand)

## 요구사항
1. orval 또는 openapi-typescript 중 프로젝트에 맞는 도구 선택 및 근거 제시
2. 커스텀 transformer로 네이밍 규칙 통일 (camelCase)
3. 생성 코드에 Result 패턴 자동 적용
4. CI에서 스펙 변경 감지 시 자동 재생성 스크립트
5. 생성된 코드에 대한 lint 예외 규칙

## 출력 형식
- orval.config.ts 또는 openapi-ts.config.ts
- 커스텀 transformer 코드
- package.json scripts 추가분
- CI 연동 스크립트
```

### 프롬프트 3: 에러 핸들링 패턴 생성

```text
프로젝트의 API 에러 응답 구조를 분석하여 표준 에러 핸들링 패턴을 생성하라.

## API 에러 응답 구조
{error_response_samples}

## 요구사항
1. Result<T, E> 패턴으로 모든 API 호출 래핑
2. HTTP 상태 코드별 에러 분류 (4xx → 사용자 에러, 5xx → 시스템 에러)
3. 재시도 가능 에러 자동 판별 (429, 503 등)
4. 글로벌 에러 바운더리와 연동
5. 에러 발생 시 Sentry 자동 리포팅 (PII 마스킹 포함)
6. Effect-TS 파이프라인 활용 예시 포함

## 출력 형식
- errors.ts: 에러 타입 계층 구조
- result.ts: Result<T, E> 유틸리티
- error-handler.ts: 글로벌 에러 핸들러
- retry.ts: 재시도 로직
- error-boundary.tsx: React 에러 바운더리
```

### 프롬프트 4: API 타입 추론 및 검증

```text
기존 API 호출 코드에서 타입이 누락되거나 any로 처리된 부분을 분석하여 정확한 타입을 추론하라.

## 분석 대상
{api_call_files}

## 요구사항
1. 각 API 호출의 실제 응답 구조를 네트워크 로그 또는 기존 코드에서 추론
2. any 타입을 구체적 타입으로 변환
3. 런타임 타입 검증 (zod 스키마) 자동 생성
4. 타입 불일치 위험 지점 식별 및 경고
5. OpenAPI 스펙과의 일관성 검증

## 출력 형식
- 파일별 수정 사항 diff
- 생성할 zod 스키마 목록
- 타입 안전성 개선 리포트 (위험도 high/medium/low)
```

### 프롬프트 5: 요청/응답 변환 레이어 설계

```text
백엔드 API 응답 구조와 프론트엔드 도메인 모델 사이의 변환 레이어를 설계하라.

## 백엔드 응답 예시
{backend_response_samples}

## 프론트엔드 도메인 모델
{frontend_models}

## 요구사항
1. snake_case → camelCase 자동 변환
2. 날짜 문자열 → Date 객체 변환
3. 중첩 객체 재구조화 (flatten/unflatten)
4. null/undefined 안전 처리
5. 역방향 변환 (프론트 → 백엔드) 함수도 생성
6. zod transform을 활용한 파싱과 변환 통합

## 출력 형식
- transformers/{entity}.ts: 엔티티별 변환 함수
- transformers/index.ts: barrel export
- transformers/__tests__/{entity}.test.ts: 변환 테스트
```

### 프롬프트 6: 캐싱 전략 설계

```text
프로젝트의 API 엔드포인트 특성을 분석하여 최적의 캐싱 전략을 설계하라.

## 엔드포인트 목록과 특성
{endpoint_list_with_characteristics}

## 요구사항
1. 각 엔드포인트별 staleTime, gcTime 최적값 산정
2. 목록/상세 관계의 캐시 무효화 전략
3. Optimistic Update 적용 대상 식별
4. 오프라인 지원이 필요한 엔드포인트 식별
5. 프리페칭 전략 (라우트 기반, 호버 기반)
6. TanStack Query의 queryKey factory 패턴 적용

## 출력 형식
- cache-config.ts: 엔드포인트별 캐시 설정
- query-keys.ts: queryKey factory
- invalidation.ts: 캐시 무효화 규칙
- prefetch.ts: 프리페칭 로직
- 엔드포인트별 캐시 전략 표 (markdown)
```

### 프롬프트 7: API 문서 자동 생성

```text
프로젝트의 API 클라이언트 코드와 타입을 분석하여 개발자용 API 문서를 자동 생성하라.

## 분석 대상
{api_client_files}

## 요구사항
1. 각 엔드포인트별 사용법 예시 코드 생성
2. 요청/응답 타입 문서화 (테이블 형식)
3. 에러 시나리오별 처리 방법 문서화
4. TanStack Query hook 사용 예시
5. MSW 목업 연동 테스트 예시
6. Storybook과 연동 가능한 목업 데이터 생성

## 출력 형식
- docs/api/{endpoint-group}.md: 엔드포인트 그룹별 문서
- docs/api/errors.md: 에러 핸들링 가이드
- docs/api/examples.md: 통합 사용 예시
```

---

## 2. 멀티 베타 환경 API 전략

> 멀티 베타 환경에서는 N개의 Preview/Beta 환경이 동시에 존재하며, 각 환경이 서로 다른 API 엔드포인트를 바라봐야 한다. Feature Flag에 따라 API 버전이 분기되고, 모든 환경의 API 상태를 한 곳에서 모니터링할 수 있어야 한다.

### 2.1 환경별 API 엔드포인트 동적 라우팅

```typescript
// config/api-routing.ts

/** 환경 타입 정의 */
type Environment = 'production' | 'staging' | 'development' | `beta-${string}` | `preview-${string}`;

interface ApiRouteConfig {
  baseUrl: string;
  wsUrl?: string;
  timeout: number;
  retryCount: number;
  mockEnabled: boolean;
}

/** 환경 감지 - 빌드타임 변수 + 런타임 호스트네임 폴백 */
function detectEnvironment(): Environment {
  // 빌드타임 주입
  const buildEnv = import.meta.env.VITE_ENVIRONMENT;
  if (buildEnv) return buildEnv as Environment;

  // 런타임 호스트네임 기반 감지
  const hostname = globalThis.location?.hostname ?? '';

  if (hostname === 'app.example.com') return 'production';
  if (hostname === 'staging.example.com') return 'staging';

  // beta-{slug}.example.com 패턴
  const betaMatch = hostname.match(/^beta-(.+)\.example\.com$/);
  if (betaMatch) return `beta-${betaMatch[1]}`;

  // preview-{pr-number}.example.com 패턴
  const previewMatch = hostname.match(/^preview-(.+)\.example\.com$/);
  if (previewMatch) return `preview-${previewMatch[1]}`;

  return 'development';
}

/** 환경별 API 라우팅 설정 */
function resolveApiConfig(env: Environment): ApiRouteConfig {
  // 정적 매핑
  const staticConfigs: Partial<Record<Environment, ApiRouteConfig>> = {
    production: {
      baseUrl: 'https://api.example.com',
      wsUrl: 'wss://ws.example.com',
      timeout: 10_000,
      retryCount: 3,
      mockEnabled: false,
    },
    staging: {
      baseUrl: 'https://api-staging.example.com',
      wsUrl: 'wss://ws-staging.example.com',
      timeout: 15_000,
      retryCount: 2,
      mockEnabled: false,
    },
    development: {
      baseUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3002',
      timeout: 30_000,
      retryCount: 0,
      mockEnabled: true,
    },
  };

  if (staticConfigs[env]) return staticConfigs[env];

  // 동적 환경 (beta-*, preview-*)
  const slug = env.replace(/^(beta|preview)-/, '');
  const prefix = env.startsWith('beta-') ? 'beta' : 'preview';

  return {
    baseUrl: `https://api-${prefix}-${slug}.example.com`,
    wsUrl: `wss://ws-${prefix}-${slug}.example.com`,
    timeout: 15_000,
    retryCount: 1,
    mockEnabled: prefix === 'preview', // preview는 목업 가능
  };
}

/** 싱글톤 환경 설정 */
const currentEnv = detectEnvironment();
export const apiConfig = resolveApiConfig(currentEnv);
export { currentEnv, detectEnvironment, resolveApiConfig };
```

### 2.2 Preview 환경 목업 API 자동 제공 (MSW + 환경 감지)

```typescript
// mocks/setup.ts
import { setupWorker } from 'msw/browser';
import { setupServer } from 'msw/node';
import { detectEnvironment, apiConfig } from '../config/api-routing';
import type { RequestHandler } from 'msw';

/** 목업 핸들러 레지스트리 - 엔드포인트별 목업 등록 */
interface MockRegistry {
  handlers: RequestHandler[];
  register(handler: RequestHandler): void;
  registerAll(handlers: RequestHandler[]): void;
}

function createMockRegistry(): MockRegistry {
  const handlers: RequestHandler[] = [];
  return {
    handlers,
    register(handler) {
      handlers.push(handler);
    },
    registerAll(newHandlers) {
      handlers.push(...newHandlers);
    },
  };
}

export const mockRegistry = createMockRegistry();

/** 환경에 따라 MSW 자동 활성화 */
export async function initializeMocks(): Promise<void> {
  const env = detectEnvironment();

  // production / staging에서는 절대 활성화하지 않음
  if (env === 'production' || env === 'staging') return;

  // preview 환경: 백엔드 미배포 시 자동 목업
  if (env.startsWith('preview-') && apiConfig.mockEnabled) {
    const isBackendAvailable = await checkBackendHealth(apiConfig.baseUrl);
    if (isBackendAvailable) return; // 백엔드가 있으면 목업 불필요
  }

  // development 또는 백엔드 없는 preview 환경
  if (typeof window !== 'undefined') {
    const worker = setupWorker(...mockRegistry.handlers);
    await worker.start({
      onUnhandledRequest: 'bypass', // 등록 안 된 요청은 실제 서버로
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
    console.info(`[MSW] Mock API activated for environment: ${env}`);
  } else {
    // SSR / Node 환경
    const server = setupServer(...mockRegistry.handlers);
    server.listen({ onUnhandledRequest: 'bypass' });
  }
}

async function checkBackendHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

```typescript
// mocks/handlers/users.ts
import { http, HttpResponse } from 'msw';
import { apiConfig } from '../../config/api-routing';
import { mockRegistry } from '../setup';

const userHandlers = [
  http.get(`${apiConfig.baseUrl}/api/v1/users`, () => {
    return HttpResponse.json({
      data: [
        { id: '1', name: 'Mock User', email: 'mock@example.com' },
      ],
      meta: { total: 1, page: 1, limit: 20 },
    });
  }),

  http.get(`${apiConfig.baseUrl}/api/v1/users/:id`, ({ params }) => {
    return HttpResponse.json({
      data: { id: params.id, name: 'Mock User', email: 'mock@example.com' },
    });
  }),

  http.post(`${apiConfig.baseUrl}/api/v1/users`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { data: { id: crypto.randomUUID(), ...body } },
      { status: 201 },
    );
  }),
];

mockRegistry.registerAll(userHandlers);
```

### 2.3 Feature Flag별 API 버전 분기

```typescript
// api/versioned-client.ts

interface FeatureFlagService {
  isEnabled(flag: string): boolean;
  getVariant(flag: string): string | null;
}

/** Feature Flag에 따른 API 버전 분기 */
function createVersionedEndpoint(
  featureFlags: FeatureFlagService,
) {
  return function endpoint(
    path: string,
    versionMap: Record<string, string>,
    defaultVersion: string = 'v1',
  ): string {
    // versionMap 예: { 'new-user-api': 'v2', 'user-api-v3-beta': 'v3' }
    for (const [flag, version] of Object.entries(versionMap)) {
      if (featureFlags.isEnabled(flag)) {
        return path.replace(/\/v\d+\//, `/${version}/`);
      }
    }
    return path.replace(/\/v\d+\//, `/${defaultVersion}/`);
  };
}

// 사용 예시
// const resolve = createVersionedEndpoint(featureFlagService);
// const usersUrl = resolve('/api/v1/users', { 'new-user-api': 'v2' });
// → Feature flag가 켜져 있으면 '/api/v2/users', 아니면 '/api/v1/users'

/** API 버전별 클라이언트 분기 팩토리 */
interface ApiVersionConfig {
  version: string;
  featureFlag: string;
  transformRequest?: (data: unknown) => unknown;
  transformResponse?: (data: unknown) => unknown;
}

function createVersionedApiClient(
  baseClient: typeof fetch,
  featureFlags: FeatureFlagService,
  versionConfigs: ApiVersionConfig[],
) {
  return async function request<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    // 활성화된 Feature Flag에 해당하는 버전 찾기
    const activeConfig = versionConfigs.find(
      (config) => featureFlags.isEnabled(config.featureFlag),
    );

    const resolvedPath = activeConfig
      ? path.replace(/\/v\d+\//, `/${activeConfig.version}/`)
      : path;

    const body = activeConfig?.transformRequest && options?.body
      ? JSON.stringify(activeConfig.transformRequest(JSON.parse(options.body as string)))
      : options?.body;

    const response = await baseClient(resolvedPath, { ...options, body });
    const data = await response.json();

    return (activeConfig?.transformResponse?.(data) ?? data) as T;
  };
}

export { createVersionedEndpoint, createVersionedApiClient };
export type { ApiVersionConfig, FeatureFlagService };
```

### 2.4 N개 환경 API 헬스체크 대시보드

```typescript
// monitoring/api-healthcheck.ts

interface HealthStatus {
  environment: string;
  baseUrl: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latencyMs: number | null;
  lastChecked: Date;
  details?: Record<string, unknown>;
}

interface HealthCheckConfig {
  environments: Array<{
    name: string;
    baseUrl: string;
    healthEndpoint?: string;
  }>;
  intervalMs: number;
  timeoutMs: number;
}

/** 모든 환경의 API 상태를 주기적으로 확인 */
class ApiHealthDashboard {
  private statuses: Map<string, HealthStatus> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(statuses: HealthStatus[]) => void> = new Set();

  constructor(private config: HealthCheckConfig) {}

  async checkAll(): Promise<HealthStatus[]> {
    const results = await Promise.allSettled(
      this.config.environments.map((env) => this.checkOne(env)),
    );

    const statuses = results.map((result, i) => {
      const env = this.config.environments[i];
      if (result.status === 'fulfilled') return result.value;
      return {
        environment: env.name,
        baseUrl: env.baseUrl,
        status: 'down' as const,
        latencyMs: null,
        lastChecked: new Date(),
        details: { error: String(result.reason) },
      };
    });

    statuses.forEach((s) => this.statuses.set(s.environment, s));
    this.notify(statuses);
    return statuses;
  }

  private async checkOne(
    env: { name: string; baseUrl: string; healthEndpoint?: string },
  ): Promise<HealthStatus> {
    const url = `${env.baseUrl}${env.healthEndpoint ?? '/health'}`;
    const start = performance.now();

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      const latencyMs = Math.round(performance.now() - start);
      const body = await res.json().catch(() => null);

      return {
        environment: env.name,
        baseUrl: env.baseUrl,
        status: res.ok ? 'healthy' : 'degraded',
        latencyMs,
        lastChecked: new Date(),
        details: body,
      };
    } catch {
      return {
        environment: env.name,
        baseUrl: env.baseUrl,
        status: 'down',
        latencyMs: null,
        lastChecked: new Date(),
      };
    }
  }

  start(): void {
    this.checkAll();
    this.intervalId = setInterval(() => this.checkAll(), this.config.intervalMs);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  subscribe(listener: (statuses: HealthStatus[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(statuses: HealthStatus[]): void {
    this.listeners.forEach((fn) => fn(statuses));
  }

  getStatus(envName: string): HealthStatus | undefined {
    return this.statuses.get(envName);
  }

  getAllStatuses(): HealthStatus[] {
    return Array.from(this.statuses.values());
  }
}

export { ApiHealthDashboard };
export type { HealthStatus, HealthCheckConfig };
```

```typescript
// monitoring/useApiHealth.ts (React hook)
import { useEffect, useState } from 'react';
import { ApiHealthDashboard, type HealthStatus, type HealthCheckConfig } from './api-healthcheck';

export function useApiHealth(config: HealthCheckConfig) {
  const [statuses, setStatuses] = useState<HealthStatus[]>([]);

  useEffect(() => {
    const dashboard = new ApiHealthDashboard(config);
    const unsubscribe = dashboard.subscribe(setStatuses);
    dashboard.start();

    return () => {
      unsubscribe();
      dashboard.stop();
    };
  }, [config]);

  return {
    statuses,
    healthy: statuses.filter((s) => s.status === 'healthy'),
    degraded: statuses.filter((s) => s.status === 'degraded'),
    down: statuses.filter((s) => s.status === 'down'),
  };
}
```

---

## 3. REST vs GraphQL vs tRPC vs gRPC-Web 비교

| 항목 | REST | GraphQL | tRPC | gRPC-Web |
|------|------|---------|------|----------|
| **타입 안전성** | OpenAPI 코드젠 필요 | codegen 필요 | 빌드타임 풀 타입 안전 | Protobuf → TS 코드젠 |
| **학습 곡선** | 낮음 | 중간 | 낮음 (TS 필수) | 높음 |
| **오버페칭** | 발생 가능 | 클라이언트가 필드 선택 | N/A (프로시저 단위) | N/A |
| **캐싱** | HTTP 캐시 활용 가능 | 별도 정규화 캐시 필요 | TanStack Query 연동 | 별도 구현 |
| **파일 업로드** | 네이티브 지원 | multipart 확장 필요 | 별도 처리 | 미지원 (별도 REST) |
| **실시간** | SSE, WebSocket 별도 | Subscription 내장 | WebSocket 어댑터 | 서버 스트리밍 지원 |
| **브라우저 지원** | 네이티브 | 네이티브 | 네이티브 | Envoy 프록시 필요 |
| **생태계 성숙도** | 최고 | 높음 | 성장 중 | 제한적 |
| **BFF 친화도** | 높음 | 매우 높음 | 매우 높음 | 낮음 |
| **멀티 베타 환경** | URL 기반 분기 용이 | 스키마 버전 관리 복잡 | 라우터 레벨 분기 | Protobuf 버전 관리 |
| **추천 시나리오** | 공개 API, 마이크로서비스 | 복잡한 데이터 관계, BFF | 풀스택 TS, 내부 API | 고성능 내부 통신 |

### 선택 기준 의사결정 트리

```text
풀스택 TypeScript인가?
├─ YES → 내부 API인가?
│   ├─ YES → tRPC (빌드타임 타입 안전, 최소 보일러플레이트)
│   └─ NO → REST + OpenAPI 코드젠
└─ NO → 복잡한 데이터 관계가 있는가?
    ├─ YES → GraphQL (오버페칭 방지, 유연한 쿼리)
    └─ NO → 고성능 내부 통신이 필요한가?
        ├─ YES → gRPC-Web (바이너리 프로토콜, 스트리밍)
        └─ NO → REST (단순, 캐시 친화적)
```

---

## 4. BFF (Backend For Frontend) 패턴

### 4.1 BFF 아키텍처

```text
[Browser]
    │
    ▼
[BFF Layer] ──── 프론트엔드 팀이 소유
    │  ├─ API 집계 (여러 마이크로서비스 호출 → 하나의 응답)
    │  ├─ 응답 변환 (백엔드 스키마 → 프론트엔드 도메인 모델)
    │  ├─ 인증/인가 토큰 관리
    │  └─ 환경별 라우팅 (멀티 베타 분기)
    ▼
[Microservices] ──── 백엔드 팀이 소유
    ├─ User Service
    ├─ Order Service
    └─ Payment Service
```

### 4.2 Next.js Route Handlers 기반 BFF

```typescript
// app/api/dashboard/route.ts

import { type NextRequest, NextResponse } from 'next/server';

interface DashboardResponse {
  user: { id: string; name: string; role: string };
  stats: { orders: number; revenue: number };
  notifications: Array<{ id: string; message: string; read: boolean }>;
}

export async function GET(request: NextRequest): Promise<NextResponse<DashboardResponse>> {
  const token = request.headers.get('Authorization');

  // 여러 마이크로서비스를 병렬 호출
  const [userRes, statsRes, notiRes] = await Promise.all([
    fetch(`${process.env.USER_SERVICE_URL}/me`, {
      headers: { Authorization: token ?? '' },
    }),
    fetch(`${process.env.ORDER_SERVICE_URL}/stats`, {
      headers: { Authorization: token ?? '' },
    }),
    fetch(`${process.env.NOTIFICATION_SERVICE_URL}/recent`, {
      headers: { Authorization: token ?? '' },
    }),
  ]);

  // 응답 변환 - 백엔드 snake_case → 프론트엔드 camelCase
  const user = transformUser(await userRes.json());
  const stats = transformStats(await statsRes.json());
  const notifications = transformNotifications(await notiRes.json());

  return NextResponse.json({ user, stats, notifications });
}

function transformUser(raw: Record<string, unknown>) {
  return {
    id: raw.user_id as string,
    name: raw.display_name as string,
    role: raw.user_role as string,
  };
}

function transformStats(raw: Record<string, unknown>) {
  return {
    orders: raw.total_orders as number,
    revenue: raw.total_revenue as number,
  };
}

function transformNotifications(raw: { items: Array<Record<string, unknown>> }) {
  return raw.items.map((item) => ({
    id: item.notification_id as string,
    message: item.message_text as string,
    read: item.is_read as boolean,
  }));
}
```

---

## 5. OpenAPI 코드젠 (orval, openapi-typescript)

### 5.1 도구 비교

| 항목 | orval | openapi-typescript | openapi-fetch |
|------|-------|--------------------|---------------|
| **출력물** | 함수 + 타입 + 목업 | 타입만 | 타입 + 클라이언트 |
| **TanStack Query 연동** | 내장 플러그인 | 별도 구현 | 별도 구현 |
| **MSW 목업 생성** | 내장 | 미지원 | 미지원 |
| **커스텀 변환** | transformer 지원 | 미지원 | 미지원 |
| **번들 크기 영향** | 중간 | 제로 (타입만) | 최소 |
| **추천 시나리오** | 풀 코드젠 원하는 경우 | 타입만 필요한 경우 | 타입 + 최소 클라이언트 |

### 5.2 orval 설정

```typescript
// orval.config.ts
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: './specs/openapi.yaml',
      validation: true,
    },
    output: {
      target: './src/api/generated',
      schemas: './src/api/generated/models',
      client: 'react-query',
      mode: 'tags-split', // 태그별 파일 분리
      override: {
        mutator: {
          path: './src/api/custom-fetch.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useSuspenseQuery: true,
          signal: true,
        },
        // snake_case → camelCase 자동 변환
        transformer: './src/api/transformer.ts',
      },
      mock: true, // MSW 핸들러 자동 생성
    },
  },
});
```

```typescript
// src/api/custom-fetch.ts

import { apiConfig } from '../config/api-routing';

interface RequestConfig {
  url: string;
  method: string;
  params?: Record<string, string>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function customFetch<T>(config: RequestConfig): Promise<T> {
  const url = new URL(`${apiConfig.baseUrl}${config.url}`);

  if (config.params) {
    Object.entries(config.params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: config.method,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: config.data ? JSON.stringify(config.data) : undefined,
    signal: config.signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error);
  }

  return response.json() as Promise<T>;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public body: unknown,
  ) {
    super(`API Error: ${statusCode}`);
    this.name = 'ApiError';
  }
}
```

### 5.3 openapi-typescript + openapi-fetch

```typescript
// scripts/generate-types.ts
import openapiTS, { astToString } from 'openapi-typescript';
import { writeFile } from 'node:fs/promises';

async function generate() {
  const ast = await openapiTS(new URL('../specs/openapi.yaml', import.meta.url));
  const contents = astToString(ast);
  await writeFile('./src/api/schema.d.ts', contents);
}

generate();
```

```typescript
// src/api/client.ts
import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { apiConfig } from '../config/api-routing';

export const api = createClient<paths>({
  baseUrl: apiConfig.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 사용 예시 - 완전한 타입 안전성
// const { data, error } = await api.GET('/api/v1/users/{id}', {
//   params: { path: { id: '123' } },
// });
```

---

## 6. HTTP 클라이언트 래퍼 설계

### 6.1 클라이언트 비교

| 항목 | fetch (네이티브) | ky | ofetch | axios |
|------|-----------------|-----|--------|-------|
| **번들 크기** | 0 KB | ~4 KB | ~6 KB | ~13 KB |
| **인터셉터** | 미지원 (수동) | beforeRequest/afterResponse | onRequest/onResponse | interceptors |
| **타임아웃** | AbortSignal.timeout | 내장 | 내장 | 내장 |
| **재시도** | 수동 구현 | 내장 | 내장 | 별도 라이브러리 |
| **SSR 지원** | Node 18+ | Node 18+ | 네이티브 | 네이티브 |
| **스트리밍** | 네이티브 | 지원 | 제한적 | 제한적 |

### 6.2 범용 API 클라이언트 래퍼

```typescript
// api/http-client.ts

import { apiConfig } from '../config/api-routing';

interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
  defaultHeaders?: Record<string, string>;
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onResponse?: <T>(response: T, config: RequestConfig) => T;
  onError?: (error: HttpError) => void;
}

interface RequestConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  retry?: number;
}

class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
    public config: RequestConfig,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isRetryable(): boolean {
    return [408, 429, 502, 503, 504].includes(this.status);
  }
}

function createHttpClient(config: HttpClientConfig) {
  async function request<T>(reqConfig: RequestConfig): Promise<T> {
    const processedConfig = config.onRequest
      ? await config.onRequest(reqConfig)
      : reqConfig;

    const url = buildUrl(config.baseUrl, processedConfig);
    const retries = processedConfig.retry ?? 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: processedConfig.method,
          headers: {
            'Content-Type': 'application/json',
            ...config.defaultHeaders,
            ...processedConfig.headers,
          },
          body: processedConfig.body ? JSON.stringify(processedConfig.body) : undefined,
          signal: processedConfig.signal ?? AbortSignal.timeout(config.timeout),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new HttpError(response.status, response.statusText, errorBody, processedConfig);
        }

        const data = await response.json() as T;
        return config.onResponse ? config.onResponse(data, processedConfig) : data;
      } catch (error) {
        if (error instanceof HttpError && error.isRetryable && attempt < retries) {
          await delay(Math.pow(2, attempt) * 1000); // 지수 백오프
          continue;
        }
        if (error instanceof HttpError) {
          config.onError?.(error);
        }
        throw error;
      }
    }

    throw new Error('Unreachable');
  }

  return {
    get: <T>(path: string, params?: Record<string, string | number | boolean>, opts?: Partial<RequestConfig>) =>
      request<T>({ ...opts, path, method: 'GET', params }),
    post: <T>(path: string, body?: unknown, opts?: Partial<RequestConfig>) =>
      request<T>({ ...opts, path, method: 'POST', body }),
    put: <T>(path: string, body?: unknown, opts?: Partial<RequestConfig>) =>
      request<T>({ ...opts, path, method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown, opts?: Partial<RequestConfig>) =>
      request<T>({ ...opts, path, method: 'PATCH', body }),
    delete: <T>(path: string, opts?: Partial<RequestConfig>) =>
      request<T>({ ...opts, path, method: 'DELETE' }),
  };
}

function buildUrl(baseUrl: string, config: RequestConfig): string {
  const url = new URL(`${baseUrl}${config.path}`);
  if (config.params) {
    Object.entries(config.params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 프로젝트 기본 클라이언트 */
export const httpClient = createHttpClient({
  baseUrl: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  onRequest(config) {
    // 인증 토큰 자동 주입
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }
    return config;
  },
  onError(error) {
    // 401 → 토큰 갱신 또는 로그아웃
    if (error.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  },
});

export { createHttpClient, HttpError };
export type { HttpClientConfig, RequestConfig };
```

---

## 7. 에러 핸들링 표준화 (Result 패턴 + Effect-TS)

### 7.1 Result 패턴

```typescript
// api/result.ts

/** Result 모나드 - 에러를 값으로 다루기 */
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },

  err<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },

  /** Result를 반환하는 함수로 감싸기 */
  fromPromise<T, E = Error>(
    promise: Promise<T>,
    mapError?: (err: unknown) => E,
  ): Promise<Result<T, E>> {
    return promise
      .then((value) => Result.ok(value) as Result<T, E>)
      .catch((err) => Result.err((mapError ? mapError(err) : err) as E));
  },

  /** Result 매핑 */
  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return result.ok ? Result.ok(fn(result.value)) : result;
  },

  /** Result 체이닝 */
  flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
    return result.ok ? fn(result.value) : result;
  },

  /** 기본값 반환 */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.ok ? result.value : defaultValue;
  },
};

export { Result };
export type { Result as ResultType };
```

### 7.2 API 에러 타입 계층

```typescript
// api/errors.ts

/** API 에러 기본 타입 */
interface ApiErrorBase {
  code: string;
  message: string;
  timestamp: string;
  requestId?: string;
}

/** 사용자 입력 에러 (4xx) */
interface ValidationError extends ApiErrorBase {
  code: 'VALIDATION_ERROR';
  fieldErrors: Array<{
    field: string;
    message: string;
    constraint: string;
  }>;
}

/** 인증/인가 에러 */
interface AuthError extends ApiErrorBase {
  code: 'UNAUTHORIZED' | 'FORBIDDEN';
}

/** 리소스 미존재 */
interface NotFoundError extends ApiErrorBase {
  code: 'NOT_FOUND';
  resource: string;
  identifier: string;
}

/** 서버 에러 (5xx) */
interface ServerError extends ApiErrorBase {
  code: 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE';
}

/** 네트워크 에러 */
interface NetworkError {
  code: 'NETWORK_ERROR' | 'TIMEOUT';
  message: string;
  cause?: Error;
}

/** 모든 API 에러 유니온 */
type ApiError =
  | ValidationError
  | AuthError
  | NotFoundError
  | ServerError
  | NetworkError;

/** HTTP 상태 코드 → 에러 타입 매핑 */
function classifyHttpError(status: number, body: Record<string, unknown>): ApiError {
  if (status === 400) {
    return { code: 'VALIDATION_ERROR', fieldErrors: [], ...body } as ValidationError;
  }
  if (status === 401) return { code: 'UNAUTHORIZED', ...body } as AuthError;
  if (status === 403) return { code: 'FORBIDDEN', ...body } as AuthError;
  if (status === 404) return { code: 'NOT_FOUND', ...body } as NotFoundError;
  return { code: 'INTERNAL_ERROR', ...body } as ServerError;
}

export { classifyHttpError };
export type { ApiError, ValidationError, AuthError, NotFoundError, ServerError, NetworkError };
```

### 7.3 Effect-TS를 활용한 API 파이프라인

```typescript
// api/effect-pipeline.ts
import { Effect, pipe } from 'effect';
import type { ApiError } from './errors';

/** Effect-TS 기반 API 호출 파이프라인 */
function fetchEffect<T>(
  url: string,
  options?: RequestInit,
): Effect.Effect<T, ApiError> {
  return Effect.tryPromise({
    try: async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw { status: response.status, body };
      }
      return response.json() as Promise<T>;
    },
    catch: (error): ApiError => {
      if (error && typeof error === 'object' && 'status' in error) {
        const { status, body } = error as { status: number; body: Record<string, unknown> };
        if (status === 401) return { code: 'UNAUTHORIZED', message: 'Unauthorized', timestamp: new Date().toISOString() };
        if (status === 404) return { code: 'NOT_FOUND', message: 'Not found', resource: '', identifier: '', timestamp: new Date().toISOString() };
        return { code: 'INTERNAL_ERROR', message: 'Server error', timestamp: new Date().toISOString() };
      }
      return { code: 'NETWORK_ERROR', message: 'Network error', cause: error as Error };
    },
  });
}

// 파이프라인 사용 예시
// const getUserPipeline = pipe(
//   fetchEffect<User>('/api/v1/users/123'),
//   Effect.map((user) => ({ ...user, displayName: `${user.firstName} ${user.lastName}` })),
//   Effect.retry({ times: 2 }),
//   Effect.timeout('5 seconds'),
//   Effect.tapError((error) => Effect.sync(() => console.error('API Error:', error))),
// );

export { fetchEffect };
```

---

## 8. API 버전 관리 전략

### 8.1 버전 관리 방식 비교

| 방식 | 예시 | 장점 | 단점 |
|------|------|------|------|
| **URL Path** | `/api/v2/users` | 명확, 캐시 친화적 | URL 변경 필요 |
| **Query Param** | `/api/users?version=2` | URL 구조 유지 | 캐시 키 복잡 |
| **Header** | `Accept: application/vnd.api.v2+json` | URL 깔끔 | 디버깅 어려움 |
| **Content Negotiation** | `Accept: application/json;version=2` | 표준 준수 | 구현 복잡 |

### 8.2 추천: URL Path + 점진적 마이그레이션

```typescript
// api/version-manager.ts

interface VersionMigration {
  from: string;
  to: string;
  endpoints: string[];
  transformRequest?: (data: unknown) => unknown;
  transformResponse?: (data: unknown) => unknown;
  startDate: Date;
  deadline: Date;
}

/** 버전 마이그레이션 관리자 */
class ApiVersionManager {
  private migrations: VersionMigration[] = [];

  register(migration: VersionMigration): void {
    this.migrations.push(migration);
  }

  /** 현재 활성 마이그레이션 확인 */
  getActiveMigrations(): VersionMigration[] {
    const now = new Date();
    return this.migrations.filter(
      (m) => m.startDate <= now && now <= m.deadline,
    );
  }

  /** 엔드포인트의 최신 버전 확인 */
  resolveVersion(endpoint: string): string {
    const migration = this.getActiveMigrations()
      .reverse()
      .find((m) => m.endpoints.some((e) => endpoint.includes(e)));

    return migration?.to ?? 'v1';
  }

  /** 마이그레이션 진행률 리포트 */
  getMigrationReport(): Array<{
    migration: string;
    daysRemaining: number;
    endpoints: string[];
  }> {
    const now = new Date();
    return this.getActiveMigrations().map((m) => ({
      migration: `${m.from} → ${m.to}`,
      daysRemaining: Math.ceil(
        (m.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
      endpoints: m.endpoints,
    }));
  }
}

export { ApiVersionManager };
export type { VersionMigration };
```

---

## 9. 캐싱 전략

### 9.1 TanStack Query 캐시 설정 패턴

```typescript
// api/query-keys.ts

/** QueryKey Factory 패턴 */
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },
} as const;
```

```typescript
// api/cache-config.ts

/** 엔드포인트 특성별 캐시 설정 */
interface CacheProfile {
  staleTime: number;
  gcTime: number;
  refetchOnWindowFocus: boolean;
  refetchOnMount: boolean;
}

const MINUTE = 60 * 1000;

export const cacheProfiles: Record<string, CacheProfile> = {
  /** 거의 변하지 않는 데이터 (설정, 코드 테이블) */
  static: {
    staleTime: 30 * MINUTE,
    gcTime: 60 * MINUTE,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  /** 자주 변하지 않는 데이터 (사용자 프로필) */
  stable: {
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  },
  /** 자주 변하는 데이터 (목록, 검색 결과) */
  dynamic: {
    staleTime: 30 * 1000,
    gcTime: 5 * MINUTE,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
  /** 실시간성이 중요한 데이터 (알림, 채팅) */
  realtime: {
    staleTime: 0,
    gcTime: MINUTE,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
};
```

### 9.2 Optimistic Update 패턴

```typescript
// api/optimistic.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

interface User {
  id: string;
  name: string;
  email: string;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user: Partial<User> & { id: string }) =>
      httpClient.patch<User>(`/api/v1/users/${user.id}`, user),

    onMutate: async (newData) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(newData.id) });

      // 이전 데이터 스냅샷
      const previousUser = queryClient.getQueryData<User>(
        queryKeys.users.detail(newData.id),
      );

      // 낙관적 업데이트
      queryClient.setQueryData<User>(
        queryKeys.users.detail(newData.id),
        (old) => old ? { ...old, ...newData } : old,
      );

      return { previousUser };
    },

    onError: (_err, newData, context) => {
      // 실패 시 롤백
      if (context?.previousUser) {
        queryClient.setQueryData(
          queryKeys.users.detail(newData.id),
          context.previousUser,
        );
      }
    },

    onSettled: (_data, _error, variables) => {
      // 성공/실패 무관 → 서버 데이터로 재동기화
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}
```

---

## 10. 체크리스트

### API 클라이언트 설계

- [ ] OpenAPI 스펙 기반 코드젠 설정 완료 (orval 또는 openapi-typescript)
- [ ] HTTP 클라이언트 래퍼에 인증 토큰 자동 주입 구현
- [ ] 에러 핸들링이 Result 패턴으로 표준화되어 있는가
- [ ] 요청/응답 변환 레이어 (snake_case → camelCase) 적용
- [ ] 재시도 로직 (지수 백오프, 재시도 가능 에러 판별) 구현

### 멀티 베타 환경

- [ ] 환경 감지 로직이 빌드타임 + 런타임 폴백을 지원하는가
- [ ] Preview 환경에서 MSW 목업이 자동 활성화되는가
- [ ] Feature Flag별 API 버전 분기가 동작하는가
- [ ] 모든 환경의 API 헬스체크 대시보드가 구성되어 있는가
- [ ] 환경별 API 설정이 코드에 하드코딩되지 않고 설정으로 관리되는가

### 타입 안전성

- [ ] API 호출에 any 타입이 없는가
- [ ] zod를 활용한 런타임 응답 검증이 적용되어 있는가
- [ ] 에러 응답 타입이 유니온으로 정의되어 있는가
- [ ] queryKey factory 패턴을 사용하고 있는가

### 캐싱

- [ ] 엔드포인트 특성별 캐시 프로파일이 정의되어 있는가
- [ ] Optimistic Update가 필요한 곳에 적용되어 있는가
- [ ] 캐시 무효화 규칙이 명확한가

### API 버전 관리

- [ ] 버전 마이그레이션 계획과 데드라인이 문서화되어 있는가
- [ ] 점진적 마이그레이션이 가능한 구조인가
- [ ] 구 버전 API 사용처가 추적 가능한가
