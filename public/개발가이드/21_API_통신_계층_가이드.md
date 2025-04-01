# API 통신 계층 가이드 (2026)

## 목차
1. [AI 기반 API 계층 (최우선)](#1-ai-기반-api-계층-최우선)
2. [REST vs GraphQL vs tRPC vs gRPC-Web 비교](#2-rest-vs-graphql-vs-trpc-vs-grpc-web-비교)
3. [BFF (Backend For Frontend) 패턴](#3-bff-backend-for-frontend-패턴)
4. [OpenAPI 코드젠 (orval, openapi-typescript)](#4-openapi-코드젠-orval-openapi-typescript)
5. [Axios / ky / ofetch 비교 및 래퍼 설계](#5-axios--ky--ofetch-비교-및-래퍼-설계)
6. [에러 핸들링 표준화 (Result 패턴, Effect-TS)](#6-에러-핸들링-표준화-result-패턴-effect-ts)
7. [API 버전 관리 전략](#7-api-버전-관리-전략)
8. [멀티 베타 환경 API 라우팅](#8-멀티-베타-환경-api-라우팅)
9. [체크리스트](#9-체크리스트)

---

## 1. AI 기반 API 계층 (최우선)

> API 통신 계층에서 AI를 활용하면 **OpenAPI 스펙으로부터 타입 안전한 클라이언트를 자동 생성**하고, **에러 핸들링 패턴을 일관되게 자동 적용**하며, **API 변경에 따른 프론트엔드 영향 분석을 자동화**할 수 있다. 수동 코드 작성을 70% 이상 줄이는 것이 목표다.

### 1.1 Claude로 API 클라이언트 자동 생성 프롬프트

#### 프롬프트 1: OpenAPI 스펙 기반 타입 안전 클라이언트 생성

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

#### 프롬프트 2: 기존 API 호출 코드를 표준 패턴으로 리팩토링

```text
아래 API 호출 코드를 분석하여 표준 패턴으로 리팩토링하라.

## 표준 패턴 규칙
1. 모든 API 호출은 Result<T, ApiError> 타입으로 래핑
2. 재시도 로직은 데코레이터 패턴으로 분리
3. 요청/응답 인터셉터는 미들웨어 체인으로 구성
4. 캐시 전략은 stale-while-revalidate 기본 적용
5. AbortController로 취소 가능하게 구현

## 현재 코드
{current_code}

## 프로젝트 컨텍스트
- HTTP 클라이언트: {client_name}
- 상태 관리: {state_lib}
- 에러 처리: {error_strategy}
```

#### 프롬프트 3: API 변경 영향 분석 및 마이그레이션 코드 생성

```text
API 스펙이 v1에서 v2로 변경되었다. 프론트엔드 영향을 분석하고 마이그레이션 코드를 생성하라.

## v1 스펙
{v1_spec}

## v2 스펙
{v2_spec}

## 분석 항목
1. Breaking changes 목록 (필드 삭제/타입 변경/필수값 변경)
2. 영향받는 프론트엔드 파일 목록 추정
3. 각 breaking change별 마이그레이션 코드 자동 생성
4. 하위 호환성 유지를 위한 어댑터 레이어 생성
5. 마이그레이션 완료 검증용 테스트 코드 생성
```

### 1.2 AI로 OpenAPI 스펙 → TypeScript 코드젠 자동화

```typescript
// ai-openapi-codegen.ts
import Anthropic from "@anthropic-ai/sdk";

interface CodegenResult {
  types: string;
  client: string;
  queries: string;
  mocks: string;
  summary: {
    endpoints: number;
    types: number;
    hooks: number;
  };
}

interface OpenAPISpec {
  openapi: string;
  paths: Record<string, Record<string, PathItem>>;
  components?: { schemas?: Record<string, SchemaObject> };
}

interface PathItem {
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
}

interface ParameterObject {
  name: string;
  in: "path" | "query" | "header";
  required?: boolean;
  schema: SchemaObject;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  $ref?: string;
  items?: SchemaObject;
  required?: string[];
  enum?: string[];
}

interface RequestBodyObject {
  content: Record<string, { schema: SchemaObject }>;
}

interface ResponseObject {
  content?: Record<string, { schema: SchemaObject }>;
}

async function generateAPIClientWithAI(
  spec: OpenAPISpec,
  options: {
    httpClient: "fetch" | "ky" | "ofetch";
    queryLib: "tanstack-query" | "swr";
    errorStrategy: "result" | "effect-ts" | "throw";
  },
): Promise<CodegenResult> {
  const client = new Anthropic();

  const prompt = `
OpenAPI 스펙을 분석하여 프로덕션 수준의 TypeScript API 클라이언트를 생성하라.

## 설정
- HTTP 클라이언트: ${options.httpClient}
- 쿼리 라이브러리: ${options.queryLib}
- 에러 전략: ${options.errorStrategy}

## OpenAPI 스펙
\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

## 생성 규칙
1. 모든 타입은 readonly로 정의 (불변성 보장)
2. nullable 필드는 T | null로 처리 (undefined 사용 금지)
3. enum은 as const 객체 + 유니온 타입으로 정의
4. Date 타입은 string으로 유지하되 branded type 적용
5. 쿼리 키는 계층적 배열 구조로 팩토리 패턴 적용
6. MSW 핸들러는 성공/실패 케이스 모두 생성
7. Zod 스키마도 함께 생성하여 런타임 검증 지원

JSON으로 응답:
{
  "types": "// types.ts 전체 내용",
  "client": "// client.ts 전체 내용",
  "queries": "// queries.ts 전체 내용",
  "mocks": "// mocks.ts 전체 내용",
  "summary": { "endpoints": 0, "types": 0, "hooks": 0 }
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text);
}

// 사용 예시: CI에서 OpenAPI 스펙 변경 감지 시 자동 실행
async function runCodegenPipeline(specPath: string): Promise<void> {
  const spec: OpenAPISpec = await import(specPath);

  const result = await generateAPIClientWithAI(spec, {
    httpClient: "ky",
    queryLib: "tanstack-query",
    errorStrategy: "result",
  });

  console.log(
    `생성 완료: ${result.summary.endpoints}개 엔드포인트, ` +
      `${result.summary.types}개 타입, ${result.summary.hooks}개 훅`,
  );
}
```

### 1.3 AI 기반 API 에러 핸들링 패턴 자동 생성

```typescript
// ai-error-pattern-generator.ts
interface ErrorPattern {
  statusCode: number;
  errorType: string;
  userMessage: string;
  retryable: boolean;
  retryStrategy?: RetryStrategy;
  fallbackAction: string;
  handlerCode: string;
}

interface RetryStrategy {
  maxRetries: number;
  backoffMs: number[];
  retryCondition: string;
}

interface EndpointContext {
  method: string;
  path: string;
  description: string;
  errorResponses: Array<{
    status: number;
    schema: Record<string, unknown>;
  }>;
}

async function generateErrorPatternsWithAI(
  endpoints: EndpointContext[],
  projectContext: {
    toastLib: string;
    i18nEnabled: boolean;
    sentryEnabled: boolean;
  },
): Promise<Map<string, ErrorPattern[]>> {
  const prompt = `
아래 API 엔드포인트별로 에러 핸들링 패턴을 생성하라.

## 엔드포인트 목록
${endpoints.map((e) => `- ${e.method} ${e.path}: ${e.description}\n  에러 응답: ${JSON.stringify(e.errorResponses)}`).join("\n")}

## 프로젝트 컨텍스트
- Toast 라이브러리: ${projectContext.toastLib}
- i18n 적용: ${projectContext.i18nEnabled}
- Sentry 연동: ${projectContext.sentryEnabled}

## 생성 규칙
1. 각 엔드포인트별 예상 에러 시나리오 전부 나열
2. 사용자에게 보여줄 메시지는 한국어로 (i18n 키 포함)
3. 재시도 가능한 에러는 exponential backoff 전략 포함
4. 401/403은 인증 플로우 리다이렉트 포함
5. 네트워크 에러는 오프라인 감지 + 큐잉 패턴 적용
6. Sentry에 보낼 컨텍스트 데이터 명시

각 에러 패턴별 TypeScript 핸들러 코드를 포함하여 응답하라.`;

  const response = await callAI(prompt);
  return new Map(Object.entries(response));
}

// 자동 생성된 에러 핸들러 예시 (AI 출력 결과)
const apiErrorHandler = {
  handle(error: ApiError): ErrorAction {
    switch (error.status) {
      case 400:
        return {
          type: "validation",
          message: error.details?.fields
            ? formatValidationErrors(error.details.fields)
            : "입력값을 확인해주세요.",
          retry: false,
        };
      case 401:
        return {
          type: "auth",
          message: "로그인이 필요합니다.",
          action: () => redirectToLogin(),
          retry: false,
        };
      case 403:
        return {
          type: "permission",
          message: "접근 권한이 없습니다.",
          retry: false,
        };
      case 404:
        return {
          type: "not-found",
          message: "요청한 리소스를 찾을 수 없습니다.",
          retry: false,
        };
      case 409:
        return {
          type: "conflict",
          message: "다른 사용자가 수정 중입니다. 새로고침 후 다시 시도해주세요.",
          retry: true,
          retryStrategy: { maxRetries: 1, backoffMs: [0] },
        };
      case 429:
        return {
          type: "rate-limit",
          message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
          retry: true,
          retryStrategy: {
            maxRetries: 3,
            backoffMs: [1000, 2000, 4000],
          },
        };
      default:
        if (error.status >= 500) {
          return {
            type: "server",
            message: "서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
            retry: true,
            retryStrategy: {
              maxRetries: 3,
              backoffMs: [1000, 3000, 5000],
            },
          };
        }
        return {
          type: "unknown",
          message: "알 수 없는 오류가 발생했습니다.",
          retry: false,
        };
    }
  },
} as const;

interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ErrorAction {
  type: string;
  message: string;
  retry: boolean;
  retryStrategy?: { maxRetries: number; backoffMs: number[] };
  action?: () => void;
}

function formatValidationErrors(
  fields: Record<string, string[]>,
): string {
  return Object.entries(fields)
    .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
    .join("\n");
}

function redirectToLogin(): void {
  window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
}

async function callAI(prompt: string): Promise<Record<string, ErrorPattern[]>> {
  const client = new (await import("@anthropic-ai/sdk")).default();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text);
}
```

---

## 2. REST vs GraphQL vs tRPC vs gRPC-Web 비교

| 항목 | REST | GraphQL | tRPC | gRPC-Web |
|------|------|---------|------|----------|
| **타입 안전성** | OpenAPI 코드젠 필요 | 코드젠 필요 (graphql-codegen) | 네이티브 (end-to-end) | Proto 코드젠 |
| **번들 크기** | 최소 | graphql 런타임 ~12KB | 최소 (프록시 제외) | protobuf.js ~40KB |
| **오버페칭** | 발생 가능 | 없음 (필드 선택) | 없음 | 없음 |
| **캐싱** | HTTP 캐시 네이티브 | 별도 캐시 레이어 필요 | TanStack Query 연동 | 별도 캐시 필요 |
| **파일 업로드** | 네이티브 | multipart 스펙 별도 | FormData 래핑 필요 | Stream 지원 |
| **실시간** | SSE, WebSocket 별도 | Subscription | WebSocket 별도 | Server Streaming |
| **에코시스템** | 가장 넓음 | 넓음 | TypeScript 전용 | 백엔드 중심 |
| **학습 곡선** | 낮음 | 중간 | 낮음 (TS 기반) | 높음 |
| **권장 시나리오** | 범용, 외부 API | 복잡한 데이터 관계 | 풀스택 TS 프로젝트 | 고성능 마이크로서비스 |

### 선택 기준

```typescript
// api-strategy-selector.ts
type ApiStrategy = "rest" | "graphql" | "trpc" | "grpc-web";

interface ProjectContext {
  backendLanguage: string;
  teamSize: number;
  dataComplexity: "simple" | "moderate" | "complex";
  performanceRequirement: "standard" | "high" | "realtime";
  externalApiCount: number;
}

function selectApiStrategy(ctx: ProjectContext): ApiStrategy {
  // 풀스택 TypeScript + 소규모 팀 → tRPC
  if (ctx.backendLanguage === "typescript" && ctx.teamSize <= 10) {
    return "trpc";
  }

  // 복잡한 데이터 관계 + 다수 클라이언트 → GraphQL
  if (ctx.dataComplexity === "complex" && ctx.externalApiCount > 3) {
    return "graphql";
  }

  // 고성능 마이크로서비스 → gRPC-Web
  if (ctx.performanceRequirement === "realtime") {
    return "grpc-web";
  }

  // 기본값: REST + OpenAPI
  return "rest";
}
```

---

## 3. BFF (Backend For Frontend) 패턴

### 3.1 BFF 아키텍처 구조

```typescript
// bff-layer.ts
// Next.js Route Handler 기반 BFF 구현

import { z } from "zod";

// BFF 레이어 — 프론트엔드 전용 API 조합
interface BFFConfig {
  upstreamAPIs: Record<string, { baseUrl: string; timeout: number }>;
  cacheStrategy: "none" | "memory" | "redis";
  circuitBreaker: { threshold: number; timeout: number };
}

const bffConfig: BFFConfig = {
  upstreamAPIs: {
    userService: { baseUrl: "https://api.internal/users", timeout: 3000 },
    productService: {
      baseUrl: "https://api.internal/products",
      timeout: 5000,
    },
    orderService: { baseUrl: "https://api.internal/orders", timeout: 5000 },
  },
  cacheStrategy: "memory",
  circuitBreaker: { threshold: 5, timeout: 30000 },
};

// BFF 엔드포인트: 여러 마이크로서비스 데이터 조합
const DashboardResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().url(),
  }),
  recentOrders: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      totalAmount: z.number(),
    }),
  ),
  recommendations: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      score: z.number(),
    }),
  ),
});

type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

async function getDashboardData(
  userId: string,
): Promise<DashboardResponse> {
  // 병렬로 여러 마이크로서비스 호출
  const [user, orders, recommendations] = await Promise.all([
    fetchFromService("userService", `/users/${userId}`),
    fetchFromService("orderService", `/users/${userId}/orders?limit=5`),
    fetchFromService("productService", `/recommendations/${userId}`),
  ]);

  // BFF에서 프론트엔드에 최적화된 형태로 변환
  return DashboardResponseSchema.parse({
    user: {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      avatar: user.profileImageUrl,
    },
    recentOrders: orders.items.map(
      (o: { orderId: string; orderStatus: string; total: number }) => ({
        id: o.orderId,
        status: o.orderStatus,
        totalAmount: o.total,
      }),
    ),
    recommendations: recommendations.items.slice(0, 6),
  });
}

async function fetchFromService(
  service: keyof typeof bffConfig.upstreamAPIs,
  path: string,
): Promise<Record<string, unknown>> {
  const config = bffConfig.upstreamAPIs[service];
  const response = await fetch(`${config.baseUrl}${path}`, {
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    throw new Error(`${service} responded with ${response.status}`);
  }

  return response.json();
}
```

### 3.2 BFF 미들웨어 체인

```typescript
// bff-middleware.ts
type Middleware = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>;

function compose(...middlewares: Middleware[]): Middleware {
  return (req, next) => {
    let index = -1;
    function dispatch(i: number): Promise<Response> {
      if (i <= index) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      index = i;
      const fn = i < middlewares.length ? middlewares[i] : next;
      return fn(req, () => dispatch(i + 1));
    }
    return dispatch(0);
  };
}

// 미들웨어 예시: 인증 검증
const authMiddleware: Middleware = async (req, next) => {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  return next();
};

// 미들웨어 예시: 요청 로깅
const loggingMiddleware: Middleware = async (req, next) => {
  const start = performance.now();
  const response = await next();
  const duration = performance.now() - start;
  console.log(`${req.method} ${req.url} - ${response.status} (${duration.toFixed(0)}ms)`);
  return response;
};

// 미들웨어 예시: 캐시
const cacheMiddleware: Middleware = async (req, next) => {
  const cacheKey = `bff:${req.url}`;
  const cached = cache.get(cacheKey);
  if (cached && !isStale(cached)) {
    return new Response(JSON.stringify(cached.data), {
      headers: { "X-Cache": "HIT" },
    });
  }
  const response = await next();
  const data = await response.clone().json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return response;
};

const cache = new Map<string, { data: unknown; timestamp: number }>();

function isStale(entry: { timestamp: number }): boolean {
  return Date.now() - entry.timestamp > 60_000; // 1분
}

// BFF 핸들러 구성
const bffHandler = compose(loggingMiddleware, authMiddleware, cacheMiddleware);
```

---

## 4. OpenAPI 코드젠 (orval, openapi-typescript)

### 4.1 orval 설정

```typescript
// orval.config.ts
import { defineConfig } from "orval";

export default defineConfig({
  petstore: {
    input: {
      target: "./specs/api.yaml",
      validation: true,
    },
    output: {
      target: "./src/api/generated",
      client: "react-query",
      mode: "tags-split",
      override: {
        mutator: {
          path: "./src/api/custom-fetch.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
          version: 5,
        },
        zod: {
          strict: {
            response: true,
            body: true,
          },
          generate: {
            body: true,
            response: true,
            header: false,
            param: true,
            query: true,
          },
        },
      },
      schemas: "./src/api/schemas",
      mock: true,
    },
  },
});
```

### 4.2 openapi-typescript 설정

```typescript
// openapi-ts.config.ts
import { astToString } from "openapi-typescript";

// 타입만 생성 (런타임 코드 없음)
async function generateTypes(): Promise<void> {
  const { default: openapiTS } = await import("openapi-typescript");

  const ast = await openapiTS(new URL("./specs/api.yaml", import.meta.url), {
    exportType: true,
    transform(schemaObject) {
      // Date 타입을 branded type으로 변환
      if (schemaObject.format === "date-time") {
        return {
          schema: schemaObject,
          questionToken: false,
        };
      }
      return undefined;
    },
  });

  const contents = astToString(ast);
  await Bun.write("./src/api/types.generated.ts", contents);
}

// openapi-fetch 클라이언트 사용
import createClient from "openapi-fetch";
import type { paths } from "./types.generated";

const apiClient = createClient<paths>({
  baseUrl: "https://api.example.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// 타입 안전한 API 호출
async function getUser(userId: string) {
  const { data, error } = await apiClient.GET("/users/{id}", {
    params: { path: { id: userId } },
  });

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return data;
}
```

---

## 5. Axios / ky / ofetch 비교 및 래퍼 설계

### 5.1 비교표

| 항목 | Axios | ky | ofetch |
|------|-------|-----|--------|
| **번들 크기** | ~13KB (gzip) | ~3KB (gzip) | ~3KB (gzip) |
| **기반** | XMLHttpRequest | Fetch API | Fetch API |
| **Node.js 지원** | 네이티브 | 제한적 | 네이티브 (unjs) |
| **인터셉터** | 네이티브 | beforeRequest hooks | onRequest hooks |
| **재시도** | 별도 구현 | 내장 (retry 옵션) | 내장 (retry 옵션) |
| **타입 안전성** | AxiosResponse<T> | 제네릭 지원 | 제네릭 지원 |
| **취소** | CancelToken (deprecated) → AbortController | AbortController | AbortController |
| **권장 시나리오** | 레거시 프로젝트 | 모던 브라우저 전용 | 풀스택 (Nuxt/Nitro) |

### 5.2 통합 HTTP 클라이언트 래퍼

```typescript
// http-client.ts
interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retry?: { count: number; delay: number };
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
}

type RequestInterceptor = (config: RequestInit & { url: string }) =>
  | (RequestInit & { url: string })
  | Promise<RequestInit & { url: string }>;

type ResponseInterceptor = (response: Response) =>
  | Response
  | Promise<Response>;

interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

class HttpClient {
  private config: Required<HttpClientConfig>;

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 10_000,
      headers: {},
      retry: { count: 0, delay: 1000 },
      interceptors: { request: [], response: [] },
      ...config,
    };
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<HttpResponse<T>> {
    const url = new URL(path, this.config.baseURL);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    return this.request<T>(url.toString(), { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    const url = new URL(path, this.config.baseURL);
    return this.request<T>(url.toString(), {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    const url = new URL(path, this.config.baseURL);
    return this.request<T>(url.toString(), {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<HttpResponse<T>> {
    const url = new URL(path, this.config.baseURL);
    return this.request<T>(url.toString(), { method: "DELETE" });
  }

  private async request<T>(
    url: string,
    init: RequestInit,
  ): Promise<HttpResponse<T>> {
    let requestConfig = {
      ...init,
      url,
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
        ...(init.headers as Record<string, string>),
      },
      signal: AbortSignal.timeout(this.config.timeout),
    };

    // 요청 인터셉터 실행
    for (const interceptor of this.config.interceptors.request) {
      requestConfig = await interceptor(requestConfig);
    }

    return this.executeWithRetry<T>(requestConfig);
  }

  private async executeWithRetry<T>(
    config: RequestInit & { url: string },
  ): Promise<HttpResponse<T>> {
    const { count, delay } = this.config.retry;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= count; attempt++) {
      try {
        const { url, ...init } = config;
        let response = await fetch(url, init);

        // 응답 인터셉터 실행
        for (const interceptor of this.config.interceptors.response) {
          response = await interceptor(response);
        }

        if (!response.ok) {
          throw new HttpError(response.status, await response.text());
        }

        return {
          data: (await response.json()) as T,
          status: response.status,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error as Error;
        if (attempt < count) {
          await new Promise((resolve) =>
            setTimeout(resolve, delay * Math.pow(2, attempt)),
          );
        }
      }
    }

    throw lastError;
  }
}

class HttpError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`HTTP ${status}: ${body}`);
    this.name = "HttpError";
  }
}

// 인스턴스 생성
const api = new HttpClient({
  baseURL: "https://api.example.com",
  timeout: 10_000,
  retry: { count: 3, delay: 1000 },
  interceptors: {
    request: [
      // 인증 토큰 자동 주입
      async (config) => {
        const token = await getAccessToken();
        if (token) {
          config.headers = {
            ...config.headers as Record<string, string>,
            Authorization: `Bearer ${token}`,
          };
        }
        return config;
      },
    ],
    response: [
      // 401 시 토큰 갱신
      async (response) => {
        if (response.status === 401) {
          await refreshToken();
        }
        return response;
      },
    ],
  },
});

async function getAccessToken(): Promise<string | null> {
  return sessionStorage.getItem("access_token");
}

async function refreshToken(): Promise<void> {
  // 토큰 갱신 로직
}

export { api, HttpClient, HttpError };
export type { HttpClientConfig, HttpResponse };
```

---

## 6. 에러 핸들링 표준화 (Result 패턴, Effect-TS)

### 6.1 Result 패턴

```typescript
// result.ts
type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },

  err<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },

  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return result.ok ? Result.ok(fn(result.value)) : result;
  },

  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>,
  ): Result<U, E> {
    return result.ok ? fn(result.value) : result;
  },

  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.ok ? result.value : defaultValue;
  },
} as const;

// API 에러 타입 정의
interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Result 패턴 적용 API 함수
async function fetchUserSafe(
  userId: string,
): Promise<Result<User, ApiError>> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      const errorBody = await response.json();
      return Result.err({
        status: response.status,
        code: errorBody.code ?? "UNKNOWN",
        message: errorBody.message ?? "요청 처리에 실패했습니다.",
        details: errorBody.details,
      });
    }
    const user: User = await response.json();
    return Result.ok(user);
  } catch {
    return Result.err({
      status: 0,
      code: "NETWORK_ERROR",
      message: "네트워크 연결을 확인해주세요.",
    });
  }
}

interface User {
  id: string;
  name: string;
  email: string;
}

// 컴포넌트에서 사용
async function handleFetchUser(userId: string): Promise<void> {
  const result = await fetchUserSafe(userId);

  if (result.ok) {
    console.log(`사용자: ${result.value.name}`);
  } else {
    switch (result.error.code) {
      case "NOT_FOUND":
        console.error("사용자를 찾을 수 없습니다.");
        break;
      case "NETWORK_ERROR":
        console.error("네트워크 오류:", result.error.message);
        break;
      default:
        console.error("오류:", result.error.message);
    }
  }
}

export { Result };
export type { ApiError };
```

### 6.2 Effect-TS 기반 API 계층

```typescript
// effect-api.ts
import { Effect, pipe, Schedule } from "effect";

// Effect-TS 기반 API 에러 타입 (tagged union)
class NetworkError {
  readonly _tag = "NetworkError" as const;
  constructor(readonly cause: unknown) {}
}

class ApiResponseError {
  readonly _tag = "ApiResponseError" as const;
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {}
}

class ValidationError {
  readonly _tag = "ValidationError" as const;
  constructor(readonly issues: string[]) {}
}

type ApiErrors = NetworkError | ApiResponseError | ValidationError;

// Effect 기반 API 호출
function fetchWithEffect<T>(
  url: string,
  schema: { parse: (data: unknown) => T },
): Effect.Effect<T, ApiErrors> {
  return pipe(
    // 1. fetch 실행
    Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) => new NetworkError(error),
    }),
    // 2. 응답 상태 확인
    Effect.flatMap((response) => {
      if (!response.ok) {
        return Effect.tryPromise({
          try: () => response.json(),
          catch: () => new ApiResponseError(response.status, null),
        }).pipe(
          Effect.flatMap((body) =>
            Effect.fail(new ApiResponseError(response.status, body)),
          ),
        );
      }
      return Effect.tryPromise({
        try: () => response.json() as Promise<unknown>,
        catch: (error) => new NetworkError(error),
      });
    }),
    // 3. 응답 데이터 검증
    Effect.flatMap((data) =>
      Effect.try({
        try: () => schema.parse(data),
        catch: (error) =>
          new ValidationError(
            error instanceof Error ? [error.message] : ["Validation failed"],
          ),
      }),
    ),
    // 4. 재시도 정책 (네트워크 에러, 5xx만)
    Effect.retry(
      Schedule.exponential("1 second").pipe(
        Schedule.compose(Schedule.recurs(3)),
        Schedule.whileInput(
          (error: ApiErrors) =>
            error._tag === "NetworkError" ||
            (error._tag === "ApiResponseError" && error.status >= 500),
        ),
      ),
    ),
  );
}

export { fetchWithEffect, NetworkError, ApiResponseError, ValidationError };
export type { ApiErrors };
```

---

## 7. API 버전 관리 전략

### 7.1 URL 기반 버전 관리

```typescript
// api-versioning.ts
type ApiVersion = "v1" | "v2" | "v3";

interface VersionedClientConfig {
  baseURL: string;
  defaultVersion: ApiVersion;
  versionOverrides?: Partial<Record<string, ApiVersion>>;
}

class VersionedApiClient {
  constructor(private config: VersionedClientConfig) {}

  private resolveVersion(endpoint: string): ApiVersion {
    return this.config.versionOverrides?.[endpoint] ?? this.config.defaultVersion;
  }

  private buildUrl(endpoint: string): string {
    const version = this.resolveVersion(endpoint);
    return `${this.config.baseURL}/${version}${endpoint}`;
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }
}

// 점진적 마이그레이션: 엔드포인트별 버전 지정
const apiClient = new VersionedApiClient({
  baseURL: "https://api.example.com",
  defaultVersion: "v1",
  versionOverrides: {
    "/users": "v2",       // users만 v2로 마이그레이션 완료
    "/products": "v2",    // products도 v2
    "/orders": "v1",      // orders는 아직 v1
  },
});
```

### 7.2 헤더 기반 버전 관리

```typescript
// header-versioning.ts
class HeaderVersionedClient {
  constructor(
    private baseURL: string,
    private defaultVersion: string,
  ) {}

  async request<T>(
    path: string,
    options: RequestInit & { apiVersion?: string } = {},
  ): Promise<T> {
    const { apiVersion, ...fetchOptions } = options;
    const version = apiVersion ?? this.defaultVersion;

    const response = await fetch(`${this.baseURL}${path}`, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        "Accept": `application/vnd.api+json; version=${version}`,
        "X-API-Version": version,
      },
    });

    // 버전 사용 중단 경고 감지
    const deprecation = response.headers.get("Deprecation");
    const sunset = response.headers.get("Sunset");
    if (deprecation || sunset) {
      console.warn(
        `API 버전 사용 중단 예정: ${path} (Sunset: ${sunset ?? "미정"})`,
      );
    }

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }
}
```

---

## 8. 멀티 베타 환경 API 라우팅

### 8.1 환경별 API 엔드포인트 라우팅

```typescript
// multi-beta-api-routing.ts
type Environment = "production" | "staging" | "beta" | `beta-${string}`;

interface ApiRoutingConfig {
  production: string;
  staging: string;
  beta: string;
  betaOverrides: Record<string, string>;
}

const routingConfig: ApiRoutingConfig = {
  production: "https://api.example.com",
  staging: "https://api.staging.example.com",
  beta: "https://api.beta.example.com",
  betaOverrides: {
    "beta-feature-x": "https://api.beta-feature-x.example.com",
    "beta-v2-migration": "https://api.beta-v2.example.com",
  },
};

function resolveApiBaseUrl(env: Environment): string {
  if (env.startsWith("beta-")) {
    const betaId = env;
    return routingConfig.betaOverrides[betaId] ?? routingConfig.beta;
  }

  switch (env) {
    case "production":
      return routingConfig.production;
    case "staging":
      return routingConfig.staging;
    case "beta":
      return routingConfig.beta;
    default:
      return routingConfig.production;
  }
}

// 환경 감지 (쿠키 또는 헤더 기반)
function detectEnvironment(): Environment {
  // 쿠키에서 베타 환경 확인
  const betaCookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith("x-beta-env="));

  if (betaCookie) {
    return betaCookie.split("=")[1] as Environment;
  }

  // URL 기반 감지
  const hostname = window.location.hostname;
  if (hostname.includes("beta-")) {
    const betaId = hostname.split(".")[0];
    return betaId as Environment;
  }
  if (hostname.includes("beta")) return "beta";
  if (hostname.includes("staging")) return "staging";

  return "production";
}

// 환경별 클라이언트 팩토리
function createApiClient(): { baseUrl: string; env: Environment } {
  const env = detectEnvironment();
  const baseUrl = resolveApiBaseUrl(env);

  console.log(`API 환경: ${env} → ${baseUrl}`);

  return { baseUrl, env };
}

export { createApiClient, resolveApiBaseUrl, detectEnvironment };
export type { Environment, ApiRoutingConfig };
```

### 8.2 Feature Flag 기반 API 분기

```typescript
// feature-flag-api.ts
interface FeatureFlaggedEndpoint {
  default: string;
  experiments: Record<string, string>;
}

const endpointMap: Record<string, FeatureFlaggedEndpoint> = {
  search: {
    default: "/api/v1/search",
    experiments: {
      "new-search-engine": "/api/v2/search",
      "ai-search": "/api/v2/search/ai",
    },
  },
  recommendations: {
    default: "/api/v1/recommendations",
    experiments: {
      "ml-recs-v2": "/api/v2/recommendations",
    },
  },
};

function resolveEndpoint(
  name: string,
  activeFlags: Set<string>,
): string {
  const config = endpointMap[name];
  if (!config) throw new Error(`Unknown endpoint: ${name}`);

  // 활성화된 실험 중 매칭되는 엔드포인트 반환
  for (const [flag, endpoint] of Object.entries(config.experiments)) {
    if (activeFlags.has(flag)) {
      return endpoint;
    }
  }

  return config.default;
}

export { resolveEndpoint };
```

---

## 9. 체크리스트

- [ ] API 클라이언트는 OpenAPI 스펙에서 자동 생성하는가
- [ ] 에러 핸들링이 Result 패턴 또는 Effect-TS로 표준화되어 있는가
- [ ] 재시도 로직에 exponential backoff가 적용되어 있는가
- [ ] 요청 취소(AbortController)가 구현되어 있는가
- [ ] API 버전 관리 전략이 수립되어 있는가
- [ ] BFF 패턴으로 마이크로서비스를 조합하고 있는가
- [ ] 멀티 베타 환경에서 API 라우팅이 정상 동작하는가
- [ ] AI 프롬프트로 API 클라이언트 / 에러 핸들러를 자동 생성하고 있는가
- [ ] MSW 목 핸들러가 자동 생성되어 테스트에 활용되고 있는가
- [ ] 런타임 응답 검증(Zod)이 적용되어 있는가
