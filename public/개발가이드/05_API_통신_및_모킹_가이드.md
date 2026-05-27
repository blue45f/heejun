# 05. API 통신 및 모킹 가이드

> **쉽게 읽기 안내**: 이 문서는 전문 용어가 많을 수 있어요.
> 이해가 어려우면 [공통 용어사전](./00_개발가이드_용어사전.md)에서 먼저 용어 뜻을 확인하고 본문을 이어서 읽으면 이해가 훨씬 빨라집니다.
> 특히 실무에서 자주 쓰이는 `배포`, `CI/CD`, `롤백`, `스키마`처럼 동작이 중요한 용어부터 먼저 익혀보세요.
## 초심자용 한눈에 보기

이 문서는 프론트엔드와 서버가 주고받는 약속과 테스트를 쉽게 맞추는 방법입니다.

### 핵심 용어 빠르게 정리

| 용어 | 쉬운 뜻 |
| --- | --- |
| `API` | 화면이 서버와 통신할 때 쓰는 주소/규칙 |
| `엔드포인트` | 특정 기능 요청을 받는 URL |
| `요청/응답` | 클라이언트가 보내는 질문과 서버가 돌려주는 대답 |
| `MSW` | 로컬 테스트용 가짜 서버 모킹 도구 |
| `contract` | 서버/클라이언트가 같은 데이터 규칙을 공유하는 약속 |



| 분류 | 아키텍처 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [04. 아키텍처](./04_아키텍처_설계_패턴.md), [07. 테스팅](./07_테스팅_가이드.md), [06. 보안](./06_웹_보안_심화_가이드.md) | **도구 원칙** | 벤더 중립 |
| **핵심 테마** | OpenAPI 3.1 코드젠, MSW 2.x(boundary), Result 패턴, TanStack Query v5, RSC Hydration | **Update** | 최신 기준 |

---

> **"인터페이스 명세와 가상 응답만 있다면 비즈니스 로직을 완결할 수 있습니다."**
> 본 가이드는 타입 안전하고 예측 가능한 시스템 간 통신 계층을 구축하는 워크플로우를 제시합니다.
> API 설계 원칙부터 에러 핸들링, 토큰 갱신, 캐싱 전략까지 프론트엔드 통신 계층의 전체 아키텍처를 다룹니다.

---


## 추천 항목 (실무 우선순위)

- **시작 추천**: API 계약(OpenAPI/스키마)을 먼저 고정하고 에러 코드는 일관된 분류 체계로 통일하세요.
- **안정 추천**: 프론트 요청 재시도/타임아웃 정책은 기능별로 다르지 않게 중앙 규칙으로 관리합니다.
- **운영 추천**: MSW는 계약 변경 시나리오 테스트까지 반영해 production 모킹 없이도 회귀를 줄입니다.


## 추천 항목 고도화 체크

- `즉시 적용` — 추천 항목 1개를 이번 주 내에 실제 작업 1건에 반영한다.
- `1주 내 정리` — 적용 결과를 PR 본문이나 회고 노트에 간단히 기록한다.
- `1개월 내 점검` — 재작업률/리뷰 충돌/배포 이슈 중 적어도 한 항목이 개선되었는지 확인한다.


## 추천 항목 실행 기록 템플릿

- `담당자` : 항목 적용 주체(문서 오너/팀원)를 명시
- `적용일` : 실제 반영된 날짜 및 작업 ID를 남김
- `측정 지표` : 리뷰 충돌/재작업/버그 재발 중 1개 이상 수치로 기록
- `보류 사유` : 적용을 못한 경우 이유를 1줄 기록하고 다음 액션을 지정

## 문서 책임 범위

## 0. 먼저 알고 가기 (30초 요약)

문서 전체가 길어 보여도 처음엔 아래 3가지만 이해하면 핵심을 놓치지 않습니다.

1. **`계약(API 명세)`이 먼저다.**
   - API의 입력/출력 형식을 먼저 정해야 타입과 런타임 검증이 맞춰집니다.
2. **실패를 미리 분류한다.**
   - 요청 실패를 “네트워크”, “권한”, “중복 요청”처럼 구분해 사용자 메시지와 재시도 전략을 다르게 만듭니다.
3. **모의 응답(MSW)도 실제 스펙을 따라야 한다.**
   - 테스트에서 쓰는 응답이 실제 API와 다르면, 운영에서 바로 문제가 납니다.

## 쉬운 말로 보는 용어 정리 (이 문서 중심)

| 용어 | 평소 말투로 바꿔 말하면 |
| --- | --- |
| `OpenAPI` | 백엔드와 프론트가 같은 약속으로 대화하도록 적어둔 메뉴얼 |
| `MSW` | 실제 서버 없이도 API 호출을 흉내 낼 수 있는 테스트용 가짜 서버 |
| `타임아웃` | 지정 시간 안에 응답이 안 오면 요청을 멈추는 장치 |
| `재시도` | 일시적 실패가 나면 잠시 후 다시 요청을 보내는 동작 |
| `contract test` | 클라이언트와 서버가 같은 데이터 규칙을 지키는지 자동 검사 |

| 이 문서가 결정하는 것 | 단일 출처로 따르는 문서 |
| :--- | :--- |
| API contract, generated client, mock fidelity, error taxonomy | [01. TypeScript](./01_TypeScript_심화_가이드.md), [07. 테스팅](./07_테스팅_가이드.md) |
| 인증, 토큰, CSRF, 민감정보가 걸린 통신 기준 | [06. 보안](./06_웹_보안_심화_가이드.md) |
| cache invalidation, retry, streaming, abort 정책 | [03. 상태관리](./03_상태관리_패턴_가이드.md), [12. CDN 캐시](./12_CDN_캐시_전략.md) |
| API 변경을 배포/롤백할 때의 운영 게이트 | [11. CI/CD](./11_CICD_파이프라인_표준.md), [14. 배포](./14_배포_프로세스_체크리스트.md) |

---

## 0. 모든 프론트엔드 그룹 공통 Baseline

API 통신 표준은 특정 코드젠 도구가 아니라 **계약, 실패 모델, 타입 안전성, 관측 가능성**을 일관되게 유지하는 방식입니다.

| 기준 | 최소 적용 |
| :--- | :--- |
| **계약 우선** | REST는 OpenAPI, GraphQL은 schema, RPC는 IDL처럼 기계가 검증할 수 있는 계약을 둡니다. |
| **생성 코드 격리** | generated client는 직접 수정하지 않고, thin wrapper에서 인증/에러/관측성을 처리합니다. |
| **런타임 검증** | 외부 응답, feature flag, CMS/remote config는 TypeScript 타입만 믿지 않고 schema로 검증합니다. |
| **실패 모델** | timeout, retry, abort, 401/403/409/429/5xx, 네트워크 단절을 Result 또는 동일한 에러 모델로 표현합니다. |
| **모킹 일관성** | 테스트/스토리/로컬 개발이 같은 mock contract를 사용하고, 실제 스펙과 drift를 검사합니다. |

### 0.0 통신 파이프라인 한눈에 보기

```mermaid
flowchart TD
  A[백엔드 명세(OpenAPI/IDL)] --> B[코드 생성기]
  B --> C[타입+클라이언트 공통 인터페이스]
  C --> D[인증/재시도/타임아웃/abort 정책]
  D --> E[도메인 서비스]
  E --> F[UI 반영]
  D -->|정책 위반| G[에러 정규화 + fallback]
  H[MSW Mock] --> C
  H --> I[Fixture 검증]
  I --> E
```

### 0.1 교차 검증 매트릭스

| 권고 | 1차 출처 | 실행 증거 | 운영 증거 | 철회 조건 |
| :--- | :--- | :--- | :--- | :--- |
| 신규 REST 계약은 OpenAPI 3.1 이상, 3.2는 도구 호환성 검증 후 적용한다 | OpenAPI Specification latest | spec lint, generated type diff, contract test | API drift, client runtime error | 코드젠/문서/게이트웨이가 해당 버전을 안정 지원하지 않을 때 |
| mock은 실제 API 계약에서 생성하거나 계약 테스트와 묶는다 | MSW/코드젠 도구 공식 문서 | mock handler coverage, schema validation | mock-pass/prod-fail 비율 | 백엔드 계약이 비정형이어서 명세 비용이 과도할 때 |
| API 에러는 throw 문자열이 아니라 구조화된 Result로 전달한다 | HTTP/RFC, 프레임워크 error boundary 문서 | exhaustive switch, 401/409/429 테스트 | 사용자 재시도 성공률, 에러 분류 정확도 | 호출 계층이 에러 바운더리로만 처리되는 단순 앱일 때 |
| 실시간/스트리밍 API는 backpressure와 취소를 먼저 설계한다 | Fetch/Streams 표준, OpenAPI streaming 지원 | abort test, reconnect test | reconnect storm, memory growth | 폴링이 더 단순하고 운영 비용이 낮을 때 |

### 0.2 운영 게이트

| Gate | Evidence | Owner | Rollback |
| :--- | :--- | :--- | :--- |
| API contract gate | spec lint, generated diff, contract test | API owner | previous spec artifact pinning |
| Mock fidelity gate | MSW handler coverage, schema fixture | FE/API owner | mock handler freeze 후 실제 API smoke 우선 |
| Error taxonomy gate | Result union test, 401/409/429 fixture | Feature owner | error boundary fallback path 유지 |
| Streaming gate | abort/reconnect/backpressure test | Platform owner | polling 또는 pagination fallback |

---


## 1. 인터페이스 주도 개발: OpenAPI 3.1 & Codegen

시스템 스펙(OpenAPI)을 기반으로 TypeScript 타입과 통신 함수를 자동으로 생성하여 데이터 정합성을 보장합니다.
백엔드 팀이 스웨거 명세를 변경하면, 코드젠 도구가 자동으로 타입을 재생성하여 프론트엔드에서 즉시 타입 오류를 감지할 수 있습니다.

> **OpenAPI 버전 기준**: OpenAPI 3.2.0이 2025년 9월 공개된 최신 minor이며, streaming media type과 tag 구조 개선을 포함합니다. 다만 코드젠/문서/게이트웨이 호환성이 조직마다 다르므로 신규 표준은 **3.1 이상을 baseline**, **3.2는 도구 호환성 검증 후 recommended**로 적용합니다. 3.1은 JSON Schema 2020-12와 완전 호환되어 `nullable` 대신 `type: [string, "null"]` 형식의 유니온, `examples` 배열, `webhooks` 정의를 지원합니다.

### 1.1 코드젠 도구 비교

| 도구 | 특징 | 추천 상황 |
| :--- | :--- | :--- |
| **openapi-typescript 7.x** | 런타임 코드 없이 **타입만** 생성. `openapi-fetch`와 조합 시 가장 가벼움. `--read-write-markers`로 readOnly/writeOnly 자동 분리 | 번들 크기 최소화, 타입만 필요 |
| **@hey-api/openapi-ts** | TypeScript + SDK + Zod + TanStack Query 훅까지 한 번에 생성. **ESM 전용**, 플러그인 기반 확장 | 풀스택 SDK 자동 생성, 신규 프로젝트 |
| **Orval v7+** | React Query/SWR/Angular/Vue 훅 + **MSW 핸들러 자동 생성**(Faker 데이터) + Zod 스키마 | 프론트 모킹까지 통합 자동화 |
| **Kubb** | 플러그인 기반, 부분 도입에 유리 | 기존 코드젠 일부만 교체 |

> **참고**: 본 가이드는 Orval을 중심으로 설명하지만, **타입만 필요하면 openapi-typescript 7.x**, **SDK·훅까지 자동 생성**이 필요하면 **@hey-api/openapi-ts**가 더 적합합니다.

### 1.2 워크플로우 개요

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ swagger.yaml │ ──→ │ Orval (코드젠) │ ──→ │ TypeScript 타입  │ ──→ │ API 함수 호출  │
│ (백엔드 제공) │     │  orval.config │     │ + API 클라이언트  │     │ (프론트엔드)   │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
```

### 1.3 Orval 설정 (orval.config.ts)

```typescript
// orval.config.ts — 프로젝트 루트에 위치
import { defineConfig } from 'orval';

export default defineConfig({
  // 메인 API 코드젠 설정
  mainApi: {
    input: {
      // 백엔드 스웨거 명세 경로 (로컬 파일 또는 URL)
      target: './swagger/api-spec.yaml',
      // 명세 유효성 검증 활성화
      validation: true,
    },
    output: {
      // 생성 파일 출력 경로
      target: './src/api/generated/endpoints.ts',
      // 스키마(타입) 별도 파일로 분리
      schemas: './src/api/generated/models',
      // 클라이언트 라이브러리 선택
      client: 'react-query',
      // HTTP 클라이언트 선택 (axios | fetch)
      httpClient: 'fetch',
      // 커스텀 인스턴스 사용 설정
      override: {
        // 커스텀 fetch 인스턴스 경로
        mutator: {
          path: './src/api/client/customFetch.ts',
          name: 'customFetch',
        },
        // 쿼리 키 팩토리 자동 생성
        query: {
          useQuery: true,
          useSuspenseQuery: true,
          useMutation: true,
          // 쿼리 키를 별도 파일로 추출
          signal: true,
        },
        // 응답 타입을 자동으로 추출
        operations: {
          // 특정 엔드포인트에 대한 오버라이드
          getUsers: {
            query: {
              useQuery: true,
              useSuspenseQuery: true,
            },
          },
        },
      },
      // 생성 모드: 'split' | 'single' | 'tags' | 'tags-split'
      mode: 'tags-split',
    },
  },
});
```

### 1.4 생성되는 코드 예시

**swagger.yaml 입력 (OpenAPI 3.1):**

```yaml
# swagger/api-spec.yaml — OpenAPI 3.1 (JSON Schema 2020-12 호환)
openapi: 3.1.0
info:
  title: 프로젝트 API
  version: 1.0.0
paths:
  /api/v1/users:
    get:
      operationId: getUsers
      summary: 사용자 목록 조회
      parameters:
        - name: page
          in: query
          schema:
            type: integer
        - name: size
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
    post:
      operationId: createUser
      summary: 사용자 생성
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: 생성 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      required: [id, email, name]
      properties:
        id:
          type: integer
        email:
          type: string
          format: email
        name:
          type: string
        role:
          type: string
          enum: [ADMIN, USER, GUEST]
    UserListResponse:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/User'
        totalCount:
          type: integer
        page:
          type: integer
    CreateUserRequest:
      type: object
      required: [email, name]
      properties:
        email:
          type: string
          format: email
        name:
          type: string
        role:
          type: string
          enum: [ADMIN, USER, GUEST]
```

**생성된 TypeScript 타입 (models/user.ts):**

```typescript
// src/api/generated/models/user.ts — 자동 생성 파일 (수동 편집 금지)

/** 사용자 역할 */
export type UserRole = 'ADMIN' | 'USER' | 'GUEST';

/** 사용자 엔티티 */
export interface User {
  id: number;
  email: string;
  name: string;
  role?: UserRole;
}

/** 사용자 목록 응답 */
export interface UserListResponse {
  items?: User[];
  totalCount?: number;
  page?: number;
}

/** 사용자 생성 요청 */
export interface CreateUserRequest {
  email: string;
  name: string;
  role?: UserRole;
}

/** getUsers 쿼리 파라미터 */
export interface GetUsersParams {
  page?: number;
  size?: number;
}
```

**생성된 API 함수 및 React Query 훅 (endpoints.ts):**

```typescript
// src/api/generated/endpoints.ts — 자동 생성 파일 (수동 편집 금지)
import { useSuspenseQuery, useMutation } from '@tanstack/react-query';
import { customFetch } from '../client/customFetch';
import type {
  User,
  UserListResponse,
  GetUsersParams,
  CreateUserRequest,
} from './models';

// ─── API 함수 ─────────────────────────────────
/** 사용자 목록 조회 */
export const getUsers = (params?: GetUsersParams, signal?: AbortSignal) => {
  return customFetch<UserListResponse>({
    url: '/api/v1/users',
    method: 'GET',
    params,
    signal,
  });
};

/** 사용자 생성 */
export const createUser = (body: CreateUserRequest) => {
  return customFetch<User>({
    url: '/api/v1/users',
    method: 'POST',
    data: body,
  });
};

// ─── 쿼리 키 팩토리 ──────────────────────────────
export const getUsersQueryKey = (params?: GetUsersParams) =>
  ['api', 'v1', 'users', ...(params ? [params] : [])] as const;

// ─── React Query 훅 ──────────────────────────────
/** 사용자 목록 조회 (Suspense 전용) */
export const useGetUsersSuspense = (params?: GetUsersParams) => {
  return useSuspenseQuery({
    queryKey: getUsersQueryKey(params),
    queryFn: ({ signal }) => getUsers(params, signal),
  });
};

/** 사용자 생성 뮤테이션 */
export const useCreateUser = () => {
  return useMutation({
    mutationFn: (body: CreateUserRequest) => createUser(body),
  });
};
```

### 1.5 package.json 스크립트 설정

```jsonc
// package.json
{
  "scripts": {
    // 코드젠 실행 (개발 시)
    "api:generate": "orval",
    // 코드젠 + 감시 모드 (명세 변경 시 자동 재생성)
    "api:watch": "orval --watch",
    // 스웨거 명세 다운로드 후 코드젠 (CI/CD에서 사용)
    "api:sync": "curl -o swagger/api-spec.yaml $API_SPEC_URL && orval",
    // 생성된 파일 정리
    "api:clean": "rm -rf src/api/generated"
  }
}
```

### 1.6 자동화 도구를 활용한 명세 동기화

백엔드 엔티티 변경 시 코드젠을 통해 즉시 타입 오류를 감지하고, 영향 범위를 파악합니다.

```bash
# CI 파이프라인에서 명세 변경 감지 후 자동 코드젠
# .ci/workflows/api-sync.yml 에서 사용
npm run api:sync

# 타입 오류 확인 — 명세 변경으로 인한 깨진 부분 즉시 발견
npx tsc --noEmit
```

**권장 워크플로우:**

1. 백엔드 팀이 스웨거 명세를 업데이트하고 PR을 생성
2. CI가 명세 변경을 감지하여 프론트엔드 리포지토리에 자동 PR 생성
3. `npm run api:generate` 실행으로 타입 + API 함수 재생성
4. `tsc --noEmit`으로 타입 오류 확인
5. 깨진 부분 수정 후 머지

---

## 2. 가상 응답 시스템: MSW 2.x

실제 인프라가 준비되기 전이나 격리된 테스트 환경에서 네트워크 요청을 인터셉트하여 가상 데이터를 제공합니다.

**MSW(Mock Service Worker)의 핵심 원리:**
- Service Worker를 통해 네트워크 레벨에서 요청을 인터셉트
- 애플리케이션 코드를 전혀 수정하지 않고 가상 응답 제공
- 브라우저(Service Worker)와 Node.js(인터셉터) 환경 모두 지원
- 실제 HTTP 요청/응답과 동일한 동작을 보장

> **MSW v1은 더 이상 지원되지 않습니다.** v2부터는 ① `req/res/ctx` 컴포지션이 사라지고 Fetch API `Response`를 직접 반환하는 방식으로 변경되었으며, ② Node.js 18+가 요구되고, ③ ESM 호환이 강화되었습니다. v1 프로젝트는 공식 codemod(`npx @msw/codemods`)로 일괄 마이그레이션할 수 있습니다.

### 2.1 설치 및 초기 설정

```bash
# MSW 설치
npm install msw --save-dev

# Service Worker 파일 생성 (브라우저 환경용)
npx msw init public/ --save
```

### 2.2 브라우저 환경 설정 (setupWorker)

```typescript
// src/mocks/browser.ts — 브라우저 환경에서 MSW 활성화
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Service Worker 기반 모킹 워커 생성
export const worker = setupWorker(...handlers);
```

```typescript
// src/main.tsx — 개발 환경에서만 MSW 활성화
async function bootstrap() {
  // 개발 환경에서만 MSW 워커를 시작
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      // 처리되지 않은 요청은 그대로 통과 (콘솔 경고 표시)
      onUnhandledRequest: 'warn',
      // Service Worker 파일 경로
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    console.log('[MSW] 모킹 활성화됨');
  }

  // React 앱 마운트
  const root = document.getElementById('root')!;
  ReactDOM.createRoot(root).render(<App />);
}

bootstrap();
```

### 2.3 MSW Node.js 환경 설정 (setupServer) — 테스트용

```typescript
// src/mocks/server.ts — Node.js 환경(테스트)에서 MSW 활성화
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Node.js 인터셉터 기반 모킹 서버 생성
export const server = setupServer(...handlers);
```

```typescript
// src/setupTests.ts — Vitest/Jest 전역 설정
// 연관: [07. 테스팅 가이드](./07_테스팅_가이드.md)
import { server } from './mocks/server';

// 모든 테스트 전에 서버 시작
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// 각 테스트 후 핸들러 초기화 (테스트 간 격리)
afterEach(() => server.resetHandlers());

// 모든 테스트 후 서버 종료
afterAll(() => server.close());
```

### 2.3.1 목업 테스트 운영 원칙

- Node 테스트는 `setupServer`를 전역 test setup에서 한 번 시작하고, `afterEach`에서 `resetHandlers`, `afterAll`에서 `close`를 호출합니다.
- 처리되지 않은 요청은 기본적으로 `onUnhandledRequest: 'error'`로 실패시켜 mock-pass/prod-fail을 줄입니다. 외부 asset이나 analytics처럼 우회가 필요한 요청은 명시적으로 handler 또는 bypass 정책을 남깁니다.
- handler는 테스트 파일 안에 숨기지 말고 feature의 `api` 또는 `mocks`에 두어 local dev, Storybook, integration test가 같은 fixture를 재사용하게 합니다.
- 목업 테스트는 성공 응답만 보지 않습니다. validation error, auth error, timeout, network error, rate limit, empty list를 최소 fixture로 둡니다.
- mock이 실제 계약을 대체하지 않도록 OpenAPI/GraphQL/protobuf diff 또는 실제 API smoke와 함께 운영합니다.

### 2.4 핸들러 설계 (Domain-Neutral)

```typescript
// src/mocks/handlers.ts — 모든 API 엔드포인트의 가상 응답 정의
import { http, HttpResponse, delay } from 'msw';
import type { User, CreateUserRequest, UserListResponse } from '@/api/generated/models';

// ─── 가상 데이터 ──────────────────────────────────
const mockUsers: User[] = [
  { id: 1, email: 'admin@example.com', name: '관리자', role: 'ADMIN' },
  { id: 2, email: 'user@example.com', name: '일반 사용자', role: 'USER' },
  { id: 3, email: 'guest@example.com', name: '게스트', role: 'GUEST' },
];

let nextId = 4; // 자동 증가 ID

// ─── 핸들러 정의 ──────────────────────────────────
export const handlers = [
  // GET — 사용자 목록 조회 (페이지네이션 지원)
  http.get('/api/v1/users', async ({ request }) => {
    await delay(200); // 네트워크 지연 시뮬레이션

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 20);

    // 페이지네이션 처리
    const start = (page - 1) * size;
    const paginatedUsers = mockUsers.slice(start, start + size);

    return HttpResponse.json<UserListResponse>({
      items: paginatedUsers,
      totalCount: mockUsers.length,
      page,
    });
  }),

  // GET — 사용자 단건 조회
  http.get('/api/v1/users/:id', async ({ params }) => {
    await delay(150);
    const userId = Number(params.id);
    const user = mockUsers.find((u) => u.id === userId);

    if (!user) {
      // 404 에러 응답
      return HttpResponse.json(
        { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return HttpResponse.json(user);
  }),

  // POST — 사용자 생성
  http.post('/api/v1/users', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as CreateUserRequest;

    // 유효성 검증 실패 시뮬레이션
    if (!body.email || !body.name) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: '필수 필드가 누락되었습니다.',
          details: {
            email: body.email ? null : '이메일은 필수입니다.',
            name: body.name ? null : '이름은 필수입니다.',
          },
        },
        { status: 400 }
      );
    }

    // 새 사용자 생성
    const newUser: User = {
      id: nextId++,
      email: body.email,
      name: body.name,
      role: body.role ?? 'USER',
    };
    mockUsers.push(newUser);

    return HttpResponse.json(newUser, { status: 201 });
  }),

  // PUT — 사용자 정보 수정
  http.put('/api/v1/users/:id', async ({ params, request }) => {
    await delay(250);
    const userId = Number(params.id);
    const body = (await request.json()) as Partial<CreateUserRequest>;
    const userIndex = mockUsers.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return HttpResponse.json(
        { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 기존 데이터와 병합
    mockUsers[userIndex] = { ...mockUsers[userIndex], ...body };
    return HttpResponse.json(mockUsers[userIndex]);
  }),

  // DELETE — 사용자 삭제
  http.delete('/api/v1/users/:id', async ({ params }) => {
    await delay(200);
    const userId = Number(params.id);
    const userIndex = mockUsers.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return HttpResponse.json(
        { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    mockUsers.splice(userIndex, 1);
    // 204 No Content — 본문 없음
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── 에러 시나리오 핸들러 ─────────────────────────
  // 서버 에러 시뮬레이션 (특정 조건에서 500 반환)
  http.post('/api/v1/transaction/execute', async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as { forceError?: boolean };

    if (body.forceError) {
      return HttpResponse.json(
        { code: 'INTERNAL_ERROR', message: '내부 서버 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return HttpResponse.json({
      transactionId: 'tx-999',
      status: 'COMPLETED',
      data: { id: 1, name: 'Sample Entity' },
    });
  }),

  // 인증 에러 시뮬레이션 (토큰 만료)
  http.get('/api/v1/protected-resource', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || authHeader === 'Bearer expired-token') {
      return HttpResponse.json(
        { code: 'TOKEN_EXPIRED', message: '인증 토큰이 만료되었습니다.' },
        { status: 401 }
      );
    }

    return HttpResponse.json({ data: '보호된 리소스' });
  }),

  // 네트워크 타임아웃 시뮬레이션
  http.get('/api/v1/slow-endpoint', async () => {
    // 10초 지연 — 클라이언트 타임아웃 테스트용
    await delay(10_000);
    return HttpResponse.json({ data: '느린 응답' });
  }),
];
```

### 2.5 테스트에서 핸들러 오버라이드

```typescript
// 특정 테스트에서 기본 핸들러를 일시적으로 교체
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

test('서버 에러 발생 시 에러 화면을 표시한다', async () => {
  // 이 테스트에서만 500 에러를 반환하도록 오버라이드
  server.use(
    http.get('/api/v1/users', () => {
      return HttpResponse.json(
        { code: 'INTERNAL_ERROR', message: '서버 오류' },
        { status: 500 }
      );
    })
  );

  // 테스트 로직...
  // afterEach에서 server.resetHandlers()가 호출되므로 자동 복원됨
});
```

### 2.6 `server.boundary()` — 병렬 테스트 격리 (MSW 2.x 신규)

Vitest의 `--threads`/`fileParallelism` 같은 병렬 테스트 환경에서는 `server.use()`로 오버라이드한 핸들러가 다른 테스트에 누수될 위험이 있습니다. **`server.boundary()`** 는 콜백 내부의 모든 핸들러 변경을 해당 경계 밖으로 새지 않도록 격리합니다.

```typescript
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

test('병렬로 실행되어도 다른 테스트에 영향 없이 격리되는 시나리오', async () => {
  // boundary 안에서 등록한 핸들러는 이 콜백 안에서만 유효
  await server.boundary(async () => {
    server.use(
      http.get('/api/v1/users', () =>
        HttpResponse.json({ items: [], totalCount: 0, page: 1 })
      )
    );

    // boundary 안에서 실행되는 로직
    await renderAndAssertEmptyState();
  })();
});
```

> **권장 패턴**: 병렬 테스트에서는 `afterEach(server.resetHandlers)`만으로는 race condition을 안정적으로 막기 어렵습니다. **오버라이드가 필요한 테스트는 항상 `server.boundary(...)` 안에서 수행**하면 다른 워커의 요청과 충돌하지 않습니다.

### 2.7 `server.restoreHandlers()` — 일회성 핸들러 재사용

MSW 2.x에서 `http.get('/x', resolver, { once: true })`로 등록한 일회성 핸들러는 한 번 사용되면 비활성화됩니다. **`server.restoreHandlers()`** 는 사용된 일회성 핸들러를 다시 활성화하여, 재시도 로직이나 토큰 갱신 후 재요청 같은 시나리오에서 동일 핸들러를 재사용할 수 있게 합니다.

```typescript
test('401 → refresh → 원래 요청 재시도', async () => {
  server.use(
    // 첫 호출은 401, 두 번째 호출은 200으로 회복
    http.get('/api/v1/me', () => new HttpResponse(null, { status: 401 }), { once: true }),
    http.get('/api/v1/me', () => HttpResponse.json({ id: 1, name: '홍길동' }))
  );

  // ... 시나리오 실행 (자동 재시도) ...

  // 같은 401→200 시퀀스를 재실행하려면 일회성 핸들러 복원
  server.restoreHandlers();
});
```

---

## 3. 예외 처리: Result 패턴

성공과 실패를 명시적인 객체로 반환하여 시스템의 견고함을 높입니다.

### 3.1 try/catch와의 비교

| 관점 | try/catch | Result 패턴 |
|------|-----------|-------------|
| **타입 안전성** | catch의 error는 `unknown` | 에러 타입이 명시적으로 정의됨 |
| **강제성** | 에러 처리를 빼먹어도 컴파일 통과 | `success` 분기 없이 `data` 접근 불가 |
| **가독성** | try 블록이 길어지면 가독성 저하 | 성공/실패 경로가 명확히 분리 |
| **조합성** | 중첩 try/catch가 복잡해짐 | 체이닝과 변환이 용이 |

### 3.2 제네릭 Result 타입 정의

```typescript
// src/types/result.ts — 프로젝트 전역 Result 타입

/** 표준 에러 코드 열거 */
export type ApiErrorCode =
  | 'NETWORK_ERROR'       // 네트워크 연결 실패
  | 'TIMEOUT'             // 요청 타임아웃
  | 'UNAUTHORIZED'        // 인증 실패 (401)
  | 'FORBIDDEN'           // 권한 부족 (403)
  | 'NOT_FOUND'           // 리소스 없음 (404)
  | 'VALIDATION_ERROR'    // 유효성 검증 실패 (400)
  | 'CONFLICT'            // 충돌 (409)
  | 'RATE_LIMITED'        // 요청 제한 초과 (429)
  | 'SERVER_ERROR'        // 서버 내부 오류 (500)
  | 'UNKNOWN';            // 알 수 없는 에러

/** 구조화된 API 에러 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** HTTP 상태 코드 */
  status?: number;
  /** 필드별 유효성 검증 에러 */
  details?: Record<string, string | null>;
  /** 원본 에러 (디버깅용) */
  cause?: unknown;
}

/** 성공 결과 */
interface Success<T> {
  success: true;
  data: T;
}

/** 실패 결과 */
interface Failure<E = ApiError> {
  success: false;
  error: E;
}

/** Result 타입 — 성공(data) 또는 실패(error)를 명시적으로 표현 */
export type Result<T, E = ApiError> = Success<T> | Failure<E>;

// ─── 헬퍼 함수 ──────────────────────────────────
/** 성공 결과 생성 */
export const ok = <T>(data: T): Success<T> => ({ success: true, data });

/** 실패 결과 생성 */
export const fail = <E = ApiError>(error: E): Failure<E> => ({
  success: false,
  error,
});

/** Result를 변환 (성공 시에만 mapper 적용) */
export const mapResult = <T, U, E = ApiError>(
  result: Result<T, E>,
  mapper: (data: T) => U
): Result<U, E> => {
  if (result.success) {
    return ok(mapper(result.data));
  }
  return result;
};
```

### 3.3 API 클라이언트에서 Result 패턴 적용

```typescript
// src/api/client/customFetch.ts — Result 패턴을 적용한 커스텀 fetch

import type { Result, ApiError, ApiErrorCode } from '@/types/result';
import { ok, fail } from '@/types/result';

/** HTTP 상태 코드 → ApiErrorCode 매핑 */
function statusToErrorCode(status: number): ApiErrorCode {
  const map: Record<number, ApiErrorCode> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
  };
  return map[status] ?? (status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN');
}

interface FetchOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Result 패턴 기반 fetch 래퍼 */
export async function customFetch<T>(options: FetchOptions): Promise<Result<T>> {
  const { url, method, data, params, signal, headers } = options;

  // 쿼리 파라미터 조립
  const queryString = params
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';

  try {
    const response = await fetch(`${url}${queryString}`, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    // 204 No Content — 본문 없이 성공
    if (response.status === 204) {
      return ok(null as T);
    }

    const body = await response.json();

    if (!response.ok) {
      return fail({
        code: statusToErrorCode(response.status),
        message: body.message ?? '요청 처리 중 오류가 발생했습니다.',
        status: response.status,
        details: body.details,
      });
    }

    return ok(body as T);
  } catch (error) {
    // 네트워크 에러 또는 요청 취소
    if (error instanceof DOMException && error.name === 'AbortError') {
      return fail({
        code: 'TIMEOUT',
        message: '요청이 취소되었습니다.',
        cause: error,
      });
    }

    return fail({
      code: 'NETWORK_ERROR',
      message: '네트워크 연결을 확인해주세요.',
      cause: error,
    });
  }
}
```

### 3.4 React 컴포넌트에서 Result 사용

```tsx
// src/features/user/UserProfile.tsx
import type { Result } from '@/types/result';
import type { User } from '@/api/generated/models';

interface Props {
  userResult: Result<User>;
}

function UserProfile({ userResult }: Props) {
  // 타입 내로잉 — success 분기 없이 data에 접근할 수 없음
  if (!userResult.success) {
    const { error } = userResult;

    // 에러 코드별 분기 처리
    switch (error.code) {
      case 'NOT_FOUND':
        return <EmptyState message="사용자를 찾을 수 없습니다." />;
      case 'UNAUTHORIZED':
        return <LoginRedirect />;
      default:
        return <ErrorFallback message={error.message} />;
    }
  }

  // 여기서 userResult.data는 User 타입으로 확정
  const { data: user } = userResult;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <Badge>{user.role}</Badge>
    </div>
  );
}
```

---

## 4. 서버 상태 동기화: TanStack Query (v5+)

비동기 리소스의 캐싱 및 상태 전이를 관리합니다. React 19의 `Suspense`와 연동하여 선언적인 데이터 로딩을 구현합니다.

### 4.1 QueryClient 전역 설정

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5분 동안 캐시 유지 (stale 상태 전환 시간)
      staleTime: 5 * 60 * 1000,
      // 30분 동안 미사용 캐시 보관 후 가비지 컬렉션
      gcTime: 30 * 60 * 1000,
      // 실패 시 최대 2회 재시도 (지수 백오프)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // 창 포커스 시 자동 재조회
      refetchOnWindowFocus: true,
      // 네트워크 재연결 시 자동 재조회
      refetchOnReconnect: true,
    },
    mutations: {
      // 뮤테이션 실패 시 재시도하지 않음
      retry: false,
    },
  },
});
```

### 4.2 useSuspenseQuery — 선언적 데이터 로딩

```tsx
// src/features/user/UserList.tsx
import { Suspense } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getUsers, getUsersQueryKey } from '@/api/generated/endpoints';
import { ErrorBoundary } from 'react-error-boundary';

/** 사용자 목록 (Suspense 기반 — 로딩 상태를 부모에게 위임) */
function UserListContent({ page }: { page: number }) {
  // useSuspenseQuery는 data가 항상 존재함을 보장 (undefined 불가)
  const { data } = useSuspenseQuery({
    queryKey: getUsersQueryKey({ page, size: 20 }),
    queryFn: ({ signal }) => getUsers({ page, size: 20 }, signal),
  });

  // data.success 체크 (Result 패턴과 결합 시)
  if (!data.success) {
    throw new Error(data.error.message); // ErrorBoundary로 전파
  }

  return (
    <ul>
      {data.data.items?.map((user) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
}

/** 부모 컴포넌트 — Suspense + ErrorBoundary 조합 */
export function UserListPage() {
  const [page, setPage] = useState(1);

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div role="alert">
          <p>오류가 발생했습니다: {error.message}</p>
          <button onClick={resetErrorBoundary}>다시 시도</button>
        </div>
      )}
    >
      <Suspense fallback={<UserListSkeleton />}>
        <UserListContent page={page} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 4.3 useMutation — 데이터 변경

```tsx
// src/features/user/CreateUserForm.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser, getUsersQueryKey } from '@/api/generated/endpoints';
import type { CreateUserRequest } from '@/api/generated/models';

function CreateUserForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: CreateUserRequest) => createUser(body),

    // 성공 시 관련 쿼리 무효화 → 자동 재조회
    onSuccess: () => {
      // 사용자 목록 관련 모든 쿼리를 무효화
      queryClient.invalidateQueries({
        queryKey: ['api', 'v1', 'users'],
      });
      toast.success('사용자가 생성되었습니다.');
    },

    // 실패 시 에러 처리
    onError: (error) => {
      toast.error(`생성 실패: ${error.message}`);
    },
  });

  const handleSubmit = (formData: CreateUserRequest) => {
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleFormSubmit(handleSubmit)}>
      {/* 폼 필드 */}
      <button
        type="submit"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? '생성 중...' : '사용자 생성'}
      </button>
    </form>
  );
}
```

### 4.4 Optimistic Update (낙관적 업데이트)

서버 응답 전에 UI를 먼저 업데이트하여 즉각적인 사용자 경험을 제공합니다.

```typescript
// src/features/user/useUpdateUser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/api/generated/models';

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user: Partial<User> & { id: number }) =>
      customFetch<User>({
        url: `/api/v1/users/${user.id}`,
        method: 'PUT',
        data: user,
      }),

    // 1단계: 뮤테이션 시작 전 — 이전 데이터를 스냅샷으로 저장
    onMutate: async (updatedUser) => {
      // 진행 중인 조회를 취소하여 낙관적 업데이트와 충돌 방지
      await queryClient.cancelQueries({
        queryKey: ['api', 'v1', 'users', updatedUser.id],
      });

      // 현재 캐시 데이터 스냅샷
      const previousUser = queryClient.getQueryData<User>(
        ['api', 'v1', 'users', updatedUser.id]
      );

      // 캐시를 낙관적으로 업데이트 (서버 응답 전)
      queryClient.setQueryData(
        ['api', 'v1', 'users', updatedUser.id],
        (old: User | undefined) => (old ? { ...old, ...updatedUser } : old)
      );

      // 롤백용 스냅샷 반환
      return { previousUser };
    },

    // 2단계: 실패 시 — 스냅샷으로 롤백
    onError: (_err, updatedUser, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(
          ['api', 'v1', 'users', updatedUser.id],
          context.previousUser
        );
      }
      toast.error('수정에 실패했습니다. 이전 상태로 복원합니다.');
    },

    // 3단계: 성공/실패 무관하게 — 서버 데이터로 재동기화
    onSettled: (_data, _error, updatedUser) => {
      queryClient.invalidateQueries({
        queryKey: ['api', 'v1', 'users', updatedUser.id],
      });
    },
  });
}
```

### 4.5 RSC Hydration — 서버 컴포넌트와 결합 (현재 표준)

Next.js App Router에서는 **서버 컴포넌트에서 prefetch → 클라이언트에서 hydrate**가 널리 쓰이는 데이터 통신 패턴입니다. 서버는 초기 데이터를 안정적으로 채우고, 클라이언트는 동일 쿼리 키로 즉시 hydration된 캐시를 사용한 뒤 인터랙티브 갱신만 담당합니다. Next.js 15+ App Router 프로젝트도 동일 패턴을 적용할 수 있습니다.

```tsx
// app/(routes)/users/page.tsx — 서버 컴포넌트
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { userRepository } from '@/api/repositories/userRepository';
import { userKeys } from '@/api/queryKeys';
import { UserListClient } from './UserListClient';

export default async function UsersPage() {
  const queryClient = new QueryClient();

  // 1) 서버에서 데이터 prefetch (Result 패턴 호환)
  await queryClient.prefetchQuery({
    queryKey: userKeys.list({ page: 1 }),
    queryFn: () => userRepository.getList({ page: 1, size: 20 }),
  });

  // 2) 직렬화된 캐시를 클라이언트에 전달
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserListClient />
    </HydrationBoundary>
  );
}
```

```tsx
// app/(routes)/users/UserListClient.tsx — 클라이언트에서 동일 키로 hydration
'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { userRepository } from '@/api/repositories/userRepository';
import { userKeys } from '@/api/queryKeys';

export function UserListClient() {
  // 서버 prefetch와 동일한 키 → 즉시 hydrate, 네트워크 호출 없음
  const { data } = useSuspenseQuery({
    queryKey: userKeys.list({ page: 1 }),
    queryFn: () => userRepository.getList({ page: 1, size: 20 }),
  });

  if (!data.success) throw new Error(data.error.message);
  return <ul>{data.data.items?.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

> **핵심 원칙**: ① 서버와 클라이언트가 **반드시 같은 queryKey + queryFn**을 사용할 것, ② `QueryClient`는 요청마다 새로 생성하여 사용자 간 캐시가 섞이지 않게 할 것, ③ 직렬화 비용이 큰 데이터(Map/Set/Date 객체)는 dehydrate 직전에 평탄화할 것.

### 4.6 쿼리 무효화 패턴

```typescript
// src/api/queryKeys.ts — 체계적인 쿼리 키 관리

/** 쿼리 키 팩토리 — 계층적 무효화를 지원 */
export const userKeys = {
  // 사용자 관련 모든 쿼리를 무효화할 때
  all: ['users'] as const,

  // 목록 관련 쿼리만 무효화할 때
  lists: () => [...userKeys.all, 'list'] as const,

  // 특정 필터의 목록만 무효화할 때
  list: (filters: { page?: number; role?: string }) =>
    [...userKeys.lists(), filters] as const,

  // 상세 관련 쿼리만 무효화할 때
  details: () => [...userKeys.all, 'detail'] as const,

  // 특정 사용자 상세만 무효화할 때
  detail: (id: number) => [...userKeys.details(), id] as const,
};

// 사용 예시:
// 사용자 생성 후 → 목록만 무효화
queryClient.invalidateQueries({ queryKey: userKeys.lists() });

// 사용자 수정 후 → 해당 사용자 상세 + 목록 모두 무효화
queryClient.invalidateQueries({ queryKey: userKeys.all });

// 사용자 삭제 후 → 특정 사용자 캐시 제거 + 목록 무효화
queryClient.removeQueries({ queryKey: userKeys.detail(userId) });
queryClient.invalidateQueries({ queryKey: userKeys.lists() });
```

---

## 5. Axios vs Fetch vs ky: HTTP 클라이언트 선택

| 기준 | **Fetch API** | **Axios** | **ky** |
|------|:---:|:---:|:---:|
| **번들 크기** | 0 KB (브라우저 내장) | ~13 KB (gzip) | ~3 KB (gzip) |
| **인터셉터** | 직접 구현 필요 | 내장 (request/response) | 내장 (hooks) |
| **자동 JSON 파싱** | 수동 (.json() 호출) | 자동 | 자동 |
| **타임아웃** | AbortController 사용 | timeout 옵션 내장 | timeout 옵션 내장 |
| **재시도** | 직접 구현 필요 | 직접 구현 필요 | retry 옵션 내장 |
| **에러 처리** | 4xx/5xx에서 throw 안 함 | 4xx/5xx에서 자동 throw | 4xx/5xx에서 자동 throw |
| **스트리밍** | ReadableStream 지원 | 제한적 | Fetch 기반이므로 지원 |
| **Node.js** | 18+ 내장 | 완전 지원 | Fetch 기반 |
| **진행률 추적** | ReadableStream으로 가능 | onUploadProgress 내장 | 미지원 |

### 5.1 선택 기준

```typescript
// ──────────────────────────────────────────────────
// 선택 가이드라인:
// ──────────────────────────────────────────────────
//
// ✅ Fetch API 추천:
//   - 번들 크기가 중요한 프로젝트
//   - 간단한 API 호출만 필요
//   - Orval 코드젠과 함께 사용 (httpClient: 'fetch')
//   - 스트리밍 응답 처리가 필요
//
// ✅ Axios 추천:
//   - 복잡한 인터셉터 로직이 필요
//   - 파일 업로드 진행률 추적이 필요
//   - 기존 프로젝트에서 이미 사용 중
//   - 브라우저 호환성이 중요 (IE11 등)
//
// ✅ ky 추천:
//   - Fetch 기반이면서 편의 기능 필요
//   - 내장 재시도가 필요
//   - 작은 번들 크기 유지하면서 DX 개선

// ky 사용 예시 — Fetch의 장점 + 편의 기능
import ky from 'ky';

const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000, // 10초 타임아웃
  retry: {
    limit: 2,           // 최대 2회 재시도
    methods: ['get'],    // GET 요청만 재시도
    statusCodes: [408, 500, 502, 503, 504], // 이 상태 코드에서 재시도
  },
  hooks: {
    // 요청 전 인터셉터
    beforeRequest: [
      (request) => {
        const token = getAccessToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    // 응답 후 인터셉터
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401) {
          // 토큰 갱신 로직 (섹션 7 참조)
        }
      },
    ],
  },
});
```

---

## 6. API 에러 핸들링 전략

### 6.1 에러 계층 구조

```
┌─────────────────────────────────────────────────┐
│              글로벌 에러 핸들러                    │  → 401/403 등 인증/권한 에러
│          (Axios 인터셉터 / ky hooks)              │  → 네트워크 에러
├─────────────────────────────────────────────────┤
│            React Error Boundary                  │  → 렌더링 중 발생한 에러
│         (페이지/섹션 레벨)                        │  → 예상치 못한 런타임 에러
├─────────────────────────────────────────────────┤
│          TanStack Query onError                  │  → 쿼리/뮤테이션 레벨 에러
│          (QueryClient defaults)                  │  → 재시도 로직
├─────────────────────────────────────────────────┤
│          컴포넌트 레벨 에러 처리                   │  → 폼 유효성 검증 에러
│          (Result 패턴 분기)                       │  → 비즈니스 로직 에러
└─────────────────────────────────────────────────┘
```

### 6.2 글로벌 에러 핸들러

```typescript
// src/api/client/globalErrorHandler.ts
import type { ApiError } from '@/types/result';
import { queryClient } from '@/lib/queryClient';

/** 글로벌 에러 처리 — 모든 API 에러가 여기를 통과 */
export function handleGlobalApiError(error: ApiError): void {
  switch (error.code) {
    case 'UNAUTHORIZED':
      // 인증 만료 → 로그인 페이지로 리다이렉트
      clearAuthTokens();
      // 모든 쿼리 캐시 초기화 (개인 정보 보호)
      queryClient.clear();
      window.location.href = '/login?reason=session_expired';
      break;

    case 'FORBIDDEN':
      // 권한 부족 → 접근 거부 페이지
      toast.error('접근 권한이 없습니다. 관리자에게 문의하세요.');
      break;

    case 'RATE_LIMITED':
      // 요청 제한 초과 → 잠시 후 재시도 안내
      toast.warning('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
      break;

    case 'NETWORK_ERROR':
      // 네트워크 에러 → 오프라인 상태 표시
      toast.error('네트워크 연결을 확인해주세요.');
      break;

    case 'SERVER_ERROR':
      // 서버 에러 → 관측성 도구 보고 + 사용자 안내
      // 연관: [09. 관측성 표준](./09_장애_대응_및_관측성_표준.md)
      reportErrorToObservability(error.cause ?? new Error(error.message));
      toast.error('일시적인 서버 오류입니다. 잠시 후 다시 시도해주세요.');
      break;

    default:
      console.error('[API Error]', error);
  }
}
```

### 6.3 Error Boundary 통합

```tsx
// src/components/error/ApiErrorBoundary.tsx
// 연관: [02. React 19 가이드](./02_React19_실무_가이드.md)
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import type { ApiError } from '@/types/result';

/** API 에러에 특화된 폴백 컴포넌트 */
function ApiErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // ApiError 구조인지 확인
  const apiError = error as ApiError | undefined;

  return (
    <div role="alert" className="error-container">
      <h2>문제가 발생했습니다</h2>
      <p>{apiError?.message ?? '알 수 없는 오류가 발생했습니다.'}</p>

      {apiError?.code === 'NETWORK_ERROR' && (
        <p className="hint">네트워크 연결 상태를 확인해주세요.</p>
      )}

      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  );
}

/** 페이지 레벨 Error Boundary 래퍼 */
export function ApiErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ApiErrorFallback}
      onError={(error) => {
        // 글로벌 에러 핸들러로 전파
        handleGlobalApiError(error as ApiError);
      }}
      onReset={() => {
        // 에러 복구 시 관련 쿼리 재조회
        queryClient.invalidateQueries();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### 6.4 TanStack Query 레벨 재시도 전략

```typescript
// src/lib/queryClient.ts (확장)

/** 에러 코드에 따른 재시도 여부 판단 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const apiError = error as ApiError;

  // 재시도하지 않는 에러 (클라이언트 문제)
  const noRetryErrors: ApiErrorCode[] = [
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'CONFLICT',
  ];

  if (noRetryErrors.includes(apiError.code)) {
    return false; // 재시도해도 결과가 같음
  }

  // 서버 에러/네트워크 에러는 최대 2회 재시도
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
    },
  },
});
```

---

## 7. 인터셉터와 토큰 갱신 패턴

### 7.1 요청/응답 인터셉터 (Axios 기준)

```typescript
// src/api/client/axiosInstance.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── 요청 인터셉터 ──────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. 인증 토큰 주입
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. 요청 추적 ID 주입 (디버깅/로깅용)
    config.headers['X-Request-Id'] = crypto.randomUUID();

    // 3. 요청 시작 시간 기록 (성능 측정용)
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── 응답 인터셉터 ──────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // 응답 시간 로깅
    const duration = Date.now() - response.config.metadata?.startTime;
    if (duration > 3000) {
      console.warn(`[Slow API] ${response.config.url} — ${duration}ms`);
    }
    return response;
  },
  async (error: AxiosError) => {
    // 401 에러 시 토큰 갱신 시도 (아래 섹션 참조)
    if (error.response?.status === 401) {
      return handleTokenRefresh(error);
    }
    return Promise.reject(error);
  }
);
```

### 7.2 자동 토큰 갱신 (Silent Refresh)

```typescript
// src/api/client/tokenRefresh.ts
import axios, { type AxiosError } from 'axios';

// 토큰 갱신 중복 방지를 위한 플래그
let isRefreshing = false;
// 갱신 대기 중인 요청들의 콜백 큐
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/** 대기 큐에 있는 모든 요청을 처리 */
function processQueue(error: Error | null, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

/** 401 에러 시 토큰 갱신 후 원래 요청 재시도 */
export async function handleTokenRefresh(error: AxiosError) {
  const originalRequest = error.config!;

  // 이미 갱신 중이면 큐에 추가하고 대기
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: (token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(axios(originalRequest));
        },
        reject,
      });
    });
  }

  isRefreshing = true;

  try {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      throw new Error('리프레시 토큰이 없습니다.');
    }

    // 토큰 갱신 API 호출
    const { data } = await axios.post('/api/v1/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = data;

    // 새 토큰 저장
    setAccessToken(accessToken);
    setRefreshToken(newRefreshToken);

    // 대기 중인 모든 요청에 새 토큰 전달
    processQueue(null, accessToken);

    // 원래 요청 재시도
    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return axios(originalRequest);
  } catch (refreshError) {
    // 갱신 실패 → 대기 큐 전부 reject
    processQueue(refreshError as Error, null);

    // 로그아웃 처리
    clearAuthTokens();
    window.location.href = '/login?reason=session_expired';

    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
}
```

### 7.3 Fetch 기반 인터셉터 (래퍼 패턴)

Fetch API에는 인터셉터가 내장되어 있지 않으므로, 래퍼 함수로 동일한 기능을 구현합니다.

```typescript
// src/api/client/fetchWithInterceptor.ts

type RequestInterceptor = (config: RequestInit & { url: string }) => RequestInit & { url: string };
type ResponseInterceptor = (response: Response, request: RequestInit & { url: string }) => Promise<Response>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

/** 인터셉터를 등록하는 유틸리티 */
export const interceptors = {
  request: {
    use: (fn: RequestInterceptor) => requestInterceptors.push(fn),
  },
  response: {
    use: (fn: ResponseInterceptor) => responseInterceptors.push(fn),
  },
};

/** 인터셉터가 적용된 fetch 래퍼 */
export async function fetchWithInterceptor(
  url: string,
  init?: RequestInit
): Promise<Response> {
  // 요청 인터셉터 순차 적용
  let config = { ...init, url } as RequestInit & { url: string };
  for (const interceptor of requestInterceptors) {
    config = interceptor(config);
  }

  let response = await fetch(config.url, config);

  // 응답 인터셉터 순차 적용
  for (const interceptor of responseInterceptors) {
    response = await interceptor(response, config);
  }

  return response;
}

// 사용 예시: 인증 토큰 자동 주입
interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});
```

---

## 8. API 계층 구조 설계

> 연관: [04. 아키텍처 설계 패턴](./04_아키텍처_설계_패턴.md)

### 8.1 계층 다이어그램

```
┌─────────────────────────────────────────────────┐
│  UI Layer (React 컴포넌트)                       │
│  └─ useSuspenseQuery, useMutation               │
├─────────────────────────────────────────────────┤
│  Hook Layer (커스텀 훅)                          │
│  └─ useUsers, useCreateUser 등                  │
│  └─ 비즈니스 로직 캡슐화, 캐싱 전략 결정          │
├─────────────────────────────────────────────────┤
│  Service Layer (서비스 함수)                      │
│  └─ 여러 API를 조합한 복합 비즈니스 로직          │
│  └─ 데이터 변환, 유효성 검증                      │
├─────────────────────────────────────────────────┤
│  Repository Layer (API 함수)                     │
│  └─ Orval 자동 생성 또는 수동 작성               │
│  └─ 단일 엔드포인트 ↔ 단일 함수                  │
├─────────────────────────────────────────────────┤
│  Client Layer (HTTP 클라이언트)                   │
│  └─ Axios/Fetch/ky 인스턴스                      │
│  └─ 인터셉터, 토큰 관리, 에러 변환               │
└─────────────────────────────────────────────────┘
```

### 8.2 Repository 패턴

```typescript
// src/api/repositories/userRepository.ts
// Repository는 단일 도메인의 API 엔드포인트를 그룹화

import { customFetch } from '@/api/client/customFetch';
import type { Result } from '@/types/result';
import type { User, CreateUserRequest, UserListResponse, GetUsersParams } from '@/api/generated/models';

/** 사용자 도메인 Repository — 모든 User 관련 API 호출을 캡슐화 */
export const userRepository = {
  /** 사용자 목록 조회 */
  getList: (params?: GetUsersParams, signal?: AbortSignal): Promise<Result<UserListResponse>> =>
    customFetch({ url: '/api/v1/users', method: 'GET', params, signal }),

  /** 사용자 단건 조회 */
  getById: (id: number, signal?: AbortSignal): Promise<Result<User>> =>
    customFetch({ url: `/api/v1/users/${id}`, method: 'GET', signal }),

  /** 사용자 생성 */
  create: (body: CreateUserRequest): Promise<Result<User>> =>
    customFetch({ url: '/api/v1/users', method: 'POST', data: body }),

  /** 사용자 수정 */
  update: (id: number, body: Partial<CreateUserRequest>): Promise<Result<User>> =>
    customFetch({ url: `/api/v1/users/${id}`, method: 'PUT', data: body }),

  /** 사용자 삭제 */
  delete: (id: number): Promise<Result<void>> =>
    customFetch({ url: `/api/v1/users/${id}`, method: 'DELETE' }),
} as const;
```

### 8.3 Service Layer

```typescript
// src/services/userService.ts
// Service는 여러 Repository를 조합한 복합 비즈니스 로직을 담당

import { userRepository } from '@/api/repositories/userRepository';
import { teamRepository } from '@/api/repositories/teamRepository';
import type { Result } from '@/types/result';
import { ok, fail } from '@/types/result';

/** 사용자 + 소속 팀 정보를 함께 조회하는 복합 서비스 */
export async function getUserWithTeam(userId: number): Promise<
  Result<{ user: User; team: Team | null }>
> {
  // 사용자 조회
  const userResult = await userRepository.getById(userId);
  if (!userResult.success) return userResult;

  const user = userResult.data;

  // 팀 정보 조회 (실패해도 사용자 정보는 반환)
  if (user.teamId) {
    const teamResult = await teamRepository.getById(user.teamId);
    return ok({
      user,
      team: teamResult.success ? teamResult.data : null,
    });
  }

  return ok({ user, team: null });
}

/** 사용자 생성 + 기본 팀 배정 (트랜잭션적 로직) */
export async function createUserWithDefaultTeam(
  body: CreateUserRequest,
  defaultTeamId: number
): Promise<Result<User>> {
  // 1. 사용자 생성
  const createResult = await userRepository.create(body);
  if (!createResult.success) return createResult;

  // 2. 기본 팀 배정
  const assignResult = await teamRepository.addMember(
    defaultTeamId,
    createResult.data.id
  );

  if (!assignResult.success) {
    // 팀 배정 실패 시 사용자 생성은 유지하되 경고 로깅
    console.warn('기본 팀 배정 실패:', assignResult.error);
  }

  return createResult;
}
```

### 8.4 커스텀 훅 계층

```typescript
// src/features/user/hooks/useUsers.ts
// 훅 계층은 React Query + Repository/Service를 연결

import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userRepository } from '@/api/repositories/userRepository';
import { userKeys } from '@/api/queryKeys';

/** 사용자 목록 조회 훅 */
export function useUsers(params?: GetUsersParams) {
  return useSuspenseQuery({
    queryKey: userKeys.list(params ?? {}),
    queryFn: ({ signal }) => userRepository.getList(params, signal),
  });
}

/** 사용자 삭제 훅 — 삭제 후 목록 자동 갱신 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => userRepository.delete(userId),
    onSuccess: (_data, userId) => {
      // 삭제된 사용자의 개별 캐시 제거
      queryClient.removeQueries({ queryKey: userKeys.detail(userId) });
      // 목록 캐시 무효화 → 자동 재조회
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
```

---

## 9. 주의사항 및 흔한 실수

### 9.1 쿼리 키 불일치

```typescript
// ❌ 잘못된 예 — 쿼리 키에 참조 타입을 매번 새로 생성
const { data } = useQuery({
  // 매 렌더마다 새 객체가 생성되어 무한 재조회 발생!
  queryKey: ['users', { page, filters: { role: 'admin' } }],
  queryFn: fetchUsers,
});

// ✅ 올바른 예 — 쿼리 키 팩토리로 안정적인 키 생성
const { data } = useQuery({
  queryKey: userKeys.list({ page, role: 'admin' }),
  queryFn: fetchUsers,
});
```

### 9.2 Suspense에서 조건부 쿼리

```typescript
// ❌ 잘못된 예 — useSuspenseQuery에 enabled 옵션 사용 불가
const { data } = useSuspenseQuery({
  queryKey: ['user', userId],
  queryFn: () => getUser(userId),
  enabled: !!userId, // Suspense 쿼리에서는 지원되지 않음!
});

// ✅ 올바른 예 — 조건부 렌더링으로 해결
function UserDetail({ userId }: { userId: number | null }) {
  if (!userId) return <EmptyState />;
  return <UserDetailContent userId={userId} />;
}

function UserDetailContent({ userId }: { userId: number }) {
  // userId가 반드시 존재하므로 안전하게 호출
  const { data } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  });
  return <div>{data.name}</div>;
}
```

### 9.3 MSW 핸들러에서 타입 누락

```typescript
// ❌ 잘못된 예 — 응답 타입이 실제 API 스키마와 불일치
http.get('/api/v1/users', () => {
  return HttpResponse.json([
    { id: 1, username: 'test' }, // 'username'은 스키마에 없는 필드!
  ]);
});

// ✅ 올바른 예 — 생성된 타입을 임포트하여 타입 안전성 확보
import type { UserListResponse } from '@/api/generated/models';

http.get('/api/v1/users', () => {
  return HttpResponse.json<UserListResponse>({
    items: [{ id: 1, email: 'test@example.com', name: '테스트' }],
    totalCount: 1,
    page: 1,
  });
});
```

### 9.4 인터셉터에서 무한 루프

```typescript
// ❌ 잘못된 예 — 토큰 갱신 요청도 인터셉터를 통과하여 무한 루프
apiClient.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401) {
    // 이 요청도 apiClient를 사용하면 다시 401 → 무한 루프!
    const { data } = await apiClient.post('/api/v1/auth/refresh', { ... });
  }
});

// ✅ 올바른 예 — 토큰 갱신은 별도 Axios 인스턴스 사용
const authClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401) {
    // 인터셉터가 없는 별도 인스턴스로 갱신 요청
    const { data } = await authClient.post('/api/v1/auth/refresh', { ... });
  }
});
```

### 9.5 불필요한 리렌더링

```typescript
// ❌ 잘못된 예 — 객체 전체를 구독하여 관련 없는 필드 변경에도 리렌더링
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => getUser(userId),
});
// data.name만 사용하지만 data.lastLogin이 변경되어도 리렌더링

// ✅ 올바른 예 — select로 필요한 데이터만 추출
const { data: userName } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => getUser(userId),
  select: (data) => data.name, // name이 변경될 때만 리렌더링
});
```

### 9.6 생성 코드 수동 편집

```typescript
// ❌ 절대 금지 — Orval이 생성한 파일을 직접 수정
// src/api/generated/endpoints.ts 에 커스텀 로직 추가

// ✅ 올바른 방법 — orval.config.ts의 override 옵션으로 커스터마이징
// 또는 생성된 함수를 래핑하는 별도 파일 작성
// src/api/repositories/userRepository.ts 에서 생성 함수를 import하여 확장
```

---

## 체크리스트

### OpenAPI & 코드젠
- [ ] 데이터 엔티티 타입을 수동으로 선언하지 않고 명세(OpenAPI)에서 자동 생성하고 있나요?
- [ ] orval.config.ts가 프로젝트 루트에 설정되어 있나요?
- [ ] `npm run api:generate` 스크립트가 package.json에 등록되어 있나요?
- [ ] CI 파이프라인에서 명세 변경 시 자동 코드젠이 실행되나요?
- [ ] 생성된 파일에 "수동 편집 금지" 주석이 있고, .gitignore 또는 .eslintignore에 등록되어 있나요?

### MSW 모킹
- [ ] 개발 초기 단계에서 가상 응답(MSW)을 활용하여 로직을 완결했나요?
- [ ] MSW v1을 사용 중이라면 codemod로 **v2로 마이그레이션**을 완료했나요? (v1은 유지보수 종료)
- [ ] 브라우저용 setupWorker와 테스트용 setupServer가 분리되어 있나요?
- [ ] MSW 핸들러에서 생성된 타입을 사용하여 응답 타입 안전성을 확보했나요?
- [ ] 에러 시나리오(404, 500, 네트워크 에러)에 대한 핸들러가 준비되어 있나요?
- [ ] 테스트에서 `afterEach(() => server.resetHandlers())`로 격리를 보장하나요?
- [ ] 병렬 테스트에서 오버라이드가 필요한 경우 `server.boundary(...)`로 누수를 차단했나요?
- [ ] 일회성 핸들러 재사용이 필요한 시나리오에 `server.restoreHandlers()`를 활용하나요?

### Result 패턴 & 에러 처리
- [ ] 비동기 작업 결과에 대해 명시적인 예외 처리(Result 패턴)를 강제하고 있나요?
- [ ] ApiError 타입에 에러 코드, 메시지, HTTP 상태가 포함되어 있나요?
- [ ] 글로벌 에러 핸들러가 401/403/500 등 공통 에러를 처리하나요?
- [ ] Error Boundary가 페이지/섹션 레벨에 적절히 배치되어 있나요?

### TanStack Query
- [ ] QueryClient에 적절한 staleTime, gcTime, retry 정책이 설정되어 있나요?
- [ ] 쿼리 키 팩토리를 사용하여 체계적으로 키를 관리하나요?
- [ ] 뮤테이션 성공 후 관련 쿼리를 적절히 무효화하나요?
- [ ] 낙관적 업데이트가 필요한 곳에 onMutate/onError/onSettled 패턴을 적용했나요?
- [ ] useSuspenseQuery에서 enabled 대신 조건부 렌더링을 사용하나요?
- [ ] RSC 환경에서 서버는 `prefetchQuery` + `HydrationBoundary`, 클라이언트는 동일 키의 `useSuspenseQuery`로 hydrate하고 있나요?
- [ ] `QueryClient`를 사용자 요청 단위로 생성하여 캐시가 사용자 간 섞이지 않도록 했나요?

### 인터셉터 & 인증
- [ ] 요청 인터셉터에서 인증 토큰을 자동으로 주입하나요?
- [ ] 토큰 갱신 시 동시 요청 큐잉(중복 방지)이 구현되어 있나요?
- [ ] 토큰 갱신 실패 시 적절한 로그아웃 처리가 되나요?
- [ ] 토큰 갱신 요청은 별도 HTTP 인스턴스를 사용하여 무한 루프를 방지하나요?

### API 계층 설계
- [ ] Repository → Service → Hook → Component 계층이 명확히 분리되어 있나요?
- [ ] 각 계층의 책임이 단일 원칙을 따르나요?
- [ ] HTTP 클라이언트 선택 근거가 문서화되어 있나요?

---

> **다음 단계:** [07. 테스팅 가이드](./07_테스팅_가이드.md)에서 MSW를 활용한 통합 테스트 전략을 확인하세요.
> **연관 가이드:** [04. 아키텍처 설계 패턴](./04_아키텍처_설계_패턴.md) | [06. 웹 보안 심화 가이드](./06_웹_보안_심화_가이드.md) | [09. 장애 대응 및 관측성 표준](./09_장애_대응_및_관측성_표준.md)

---

## 12. API 코드 예측 가능성 규칙

API 계층은 이름과 반환 타입이 조금만 흔들려도 화면 전체의 에러 처리가 깨집니다.

### 12.1 wrapper 이름에 숨은 동작을 드러낸다

- 인증 토큰을 붙이는 client는 `http.get`이 아니라 `authHttp.getWithAuth`처럼 이름에서 부수 동작을 알 수 있게 합니다.
- retry, tracing, logging, refresh token, idempotency key 삽입은 wrapper 이름, 옵션, 반환 타입 중 하나로 드러냅니다.
- fetch 함수가 데이터 조회처럼 보이는데 analytics logging이나 navigation을 실행하면 숨은 로직입니다. 호출부 orchestration으로 옮깁니다.

### 12.2 같은 계열 API 함수의 반환 계약을 통일한다

- endpoint client는 `Result<T, ApiError>` 또는 throw 기반 중 하나로 통일하고 섞지 않습니다.
- query hook은 query object 반환, data-only 반환 중 하나를 기능 그룹 안에서 고정합니다.
- validation 함수는 boolean과 객체 반환을 섞지 않고 `{ ok: true } | { ok: false; reason: string }`처럼 분기 가능한 타입을 사용합니다.

### 12.3 mock과 계약 파일을 같은 변경 단위로 둔다

- client, schema, MSW handler, fixture, contract test는 같은 feature 폴더에 둡니다.
- generated file은 수동 수정하지 않고, "수동 편집 금지" 주석과 재생성 명령을 함께 둡니다.
- mock handler가 추가되면 실제 API 계약과 깨지는 부분이 없는지 diff를 남깁니다.

---

## 실무 적용 가이드

### 언제 이 문서를 펼칠까

- API 스펙 변경 후 프론트가 배포 뒤 깨질 때
- mock과 실제 API 응답이 달라 테스트 신뢰도가 낮을 때
- 에러 응답과 재시도 정책이 화면마다 다르게 처리될 때

### 적용 순서

1. OpenAPI/GraphQL/protobuf 같은 계약 파일을 기준으로 client type을 생성한다.
2. feature별 API client, schema, MSW handler, contract test를 함께 둔다.
3. 성공 응답보다 validation error, auth error, rate limit, timeout을 먼저 모델링한다.
4. Result pattern 또는 일관된 error type으로 화면 처리를 통일한다.
5. breaking change diff와 mock coverage를 PR에 남긴다.

### 함께 두는 파일

- `features/<name>/api` 아래 client, handler, fixture, schema, test를 둔다.
- 공통 fetch wrapper는 인증, timeout, trace id처럼 도메인 무관한 것만 담당한다.
- endpoint별 UI fallback은 해당 feature에 둔다.

### 흔한 실수

- 수동 타입을 백엔드 스펙과 따로 관리한다.
- MSW handler를 테스트 전용 폴더에 몰아 실제 기능과 분리한다.
- HTTP status만 보고 비즈니스 에러를 구분한다.
- retry가 안전한 요청인지 idempotency를 확인하지 않는다.

### PR 완료 기준

- [ ] contract diff가 확인되었다.
- [ ] MSW success/failure fixture가 있다.
- [ ] API error UI가 재시도 또는 복구 경로를 제공한다.
- [ ] client/schema/mock/test가 같은 변경 단위에 있다.

## 추천 항목 실행 우선순위 매핑

- `P1(7일 내)` — 추천 항목 1개를 우선 적용하고 1회 사용자 관측 신호(에러율/실패율/지연)와 연결한다.
- `P2(30일 내)` — 추천 항목 1개를 팀 내 표준/템플릿에 반영해 재사용성을 확보한다.
- `P3(90일 내)` — 추천 항목 1개를 다른 관련 문서에 역링크로 연동해 중복 작업을 줄인다.
- `완료 기준` — 각 항목별 산출물(예: PR 링크/체크리스트/회고 노트)을 1개 이상 남긴다.

## 추천 항목 실행 체크리스트

- [ ] `1단계(7일)` : 추천 항목 1개를 실제 작업으로 전환
- [ ] `2단계(30일)` : 전환 결과를 팀 산출물(ADR/PR/체크리스트)에 반영
- [ ] `3단계(60일)` : 정적 지표 1개 이상으로 효과 검증
- [ ] `문제 대응` : 미달성 시 보류 사유와 다음 실행 액션을 문서화


## 추천 항목 실행 운영 규칙

- `실행 게이트` : 위험, 비용, 기대 효과가 1회 이상 정량화되어야 적용한다.
- `승인 체계` : 적용 전 사전 승인자(팀 리드/보안/운영)와 rollback 담당자를 확인한다.
- `재개 조건` : 실패 신호가 기준치 이내로 돌아오면 다음 단계로 확장한다.
- `정지 조건` : 회귀 지표 악화가 1개 이상이면 즉시 중단하고 보류 사유를 갱신한다.
- `리스크 점수` : 
- `리더 승인자` : 
- `승인 역할` : 
- `재평가 주기` : 

