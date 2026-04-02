# TypeScript 심화 가이드 2026 v2

> 타입 퍼즐 해결 중심 AI 프롬프트 + TypeScript 5.9 Preview + Effect-TS 2.0 심화 + Feature Flag 타입 자동 생성 + Branded Types/Zod 통합 + tsgo 소개

## 목차

1. [AI 타입 퍼즐 해결 프롬프트](#1-ai-타입-퍼즐-해결-프롬프트)
2. [TypeScript 5.9 Preview](#2-typescript-59-preview)
3. [Effect-TS 2.0 심화](#3-effect-ts-20-심화)
4. [멀티 베타: Feature Flag 타입 자동 생성](#4-멀티-베타-feature-flag-타입-자동-생성)
5. [Branded Types + Zod 통합 패턴](#5-branded-types--zod-통합-패턴)
6. [tsgo: TypeScript Native Port](#6-tsgo-typescript-native-port)

---

## 1. AI 타입 퍼즐 해결 프롬프트

실무에서 마주치는 타입 에러를 AI에게 "해결해줘" 스타일로 요청하는 실전 프롬프트 모음입니다. 분석이 아닌 즉시 적용 가능한 해결책을 받아내는 데 초점을 맞춥니다.

### 1.1 타입 에러 해결 프롬프트

#### 프롬프트 1: 제네릭 추론 실패 해결

```
이 타입 에러 해결해줘. 제네릭 함수에서 리턴 타입이 unknown으로 추론돼.

에러 메시지:
Type 'unknown' is not assignable to type 'T[K]'

코드:
function getNestedValue<T, K extends keyof T>(obj: T, key: K, fallback: T[K]): T[K] {
  const value = obj[key];
  return value ?? fallback;
}

// 이렇게 쓰면 에러:
const config = { db: { host: 'localhost', port: 5432 }, cache: { ttl: 300 } };
const host = getNestedValue(config, 'db', { host: '', port: 0 });
// host가 { host: string; port: number }로 추론되게 해줘
```

해결:

```typescript
// 해결 1: 제네릭 파라미터를 정교하게 제약
function getNestedValue<
  T extends Record<string, unknown>,
  K extends keyof T,
>(obj: T, key: K, fallback: NoInfer<T[K]>): T[K] {
  const value = obj[key];
  return value ?? fallback;
}

// NoInfer<T[K]>를 사용하여 fallback에서 역방향 추론 방지
// TypeScript 5.4+의 NoInfer 유틸리티 타입 활용

const config = { db: { host: "localhost", port: 5432 }, cache: { ttl: 300 } };
const db = getNestedValue(config, "db", { host: "", port: 0 });
// db: { host: string; port: number } - 정확히 추론됨
```

#### 프롬프트 2: 유니온 타입 좁히기 (Narrowing) 실패

```
이 discriminated union에서 타입 좁히기가 안 돼. switch문 안에서
payload 타입이 여전히 전체 유니온이야. 고쳐줘.

type Event =
  | { type: 'USER_LOGIN'; payload: { userId: string; timestamp: number } }
  | { type: 'PURCHASE'; payload: { orderId: string; amount: number } }
  | { type: 'PAGE_VIEW'; payload: { url: string; referrer?: string } };

function handleEvent(event: Event) {
  switch (event.type) {
    case 'PURCHASE':
      // event.payload.amount가 에러남 - Property 'amount' does not exist
      console.log(event.payload.amount);
  }
}
```

해결:

```typescript
// 원인: Event 타입의 정의 방식 자체는 정상
// 실제로 이 코드는 TypeScript 최신 버전에서 정상 동작함
// 에러가 난다면 아래 상황 중 하나:

// 상황 1: event가 함수 파라미터가 아닌 변수 재할당된 경우
// => const로 변수 바인딩 보장
function handleEvent(event: Event) {
  // 좁히기가 유지되려면 event를 재할당하지 않아야 함
  switch (event.type) {
    case "PURCHASE":
      console.log(event.payload.amount); // OK
      break;
    case "USER_LOGIN":
      console.log(event.payload.userId); // OK
      break;
    case "PAGE_VIEW":
      console.log(event.payload.url); // OK
      break;
  }
}

// 상황 2: 이벤트 핸들러 맵 패턴으로 안전하게 처리
type EventHandlerMap = {
  [E in Event as E["type"]]: (payload: E["payload"]) => void;
};

function createEventRouter(handlers: EventHandlerMap) {
  return (event: Event) => {
    // 타입 안전한 dispatch
    const handler = handlers[event.type] as (payload: Event["payload"]) => void;
    handler(event.payload);
  };
}

const router = createEventRouter({
  USER_LOGIN: (payload) => {
    // payload: { userId: string; timestamp: number } - 자동 추론
    console.log(payload.userId);
  },
  PURCHASE: (payload) => {
    // payload: { orderId: string; amount: number }
    console.log(payload.amount);
  },
  PAGE_VIEW: (payload) => {
    // payload: { url: string; referrer?: string }
    console.log(payload.url);
  },
});
```

#### 프롬프트 3: 조건부 타입 무한 재귀 해결

```
이 재귀 타입이 "Type instantiation is excessively deep" 에러를 내.
깊이 제한 없이 동작하게 해줘.

type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 깊은 중첩 객체에서 에러 발생
```

해결:

```typescript
// 해결: 재귀 깊이 제한 + 프리미티브/배열/Map/Set 분기 처리

type DeepReadonly<T> = T extends readonly (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends Set<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends Date | RegExp | Error
        ? T // 빌트인 객체는 재귀하지 않음
        : T extends object
          ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
          : T;

// 더 안전한 버전: 깊이 카운터 포함
type DeepReadonlySafe<T, Depth extends number[] = []> =
  Depth["length"] extends 10
    ? T // 깊이 10에서 중단
    : T extends readonly (infer U)[]
      ? ReadonlyArray<DeepReadonlySafe<U, [...Depth, 0]>>
      : T extends object
        ? { readonly [P in keyof T]: DeepReadonlySafe<T[P], [...Depth, 0]> }
        : T;

// 사용
interface DeeplyNested {
  a: { b: { c: { d: { e: string } } } };
  arr: { nested: { value: number } }[];
}

type ReadonlyNested = DeepReadonly<DeeplyNested>;
// 모든 레벨이 readonly로 변환됨
```

#### 프롬프트 4: 함수 오버로드 타입 추론 개선

```
이 함수의 오버로드를 타입 안전하게 만들어줘. 현재 구현부에서 any를 쓰고 있어.

function fetch(url: string): Promise<Response>;
function fetch(url: string, options: RequestInit): Promise<Response>;
function fetch(url: string, options?: any): Promise<any> {
  // 구현
}
```

해결:

```typescript
// 오버로드 대신 제네릭 + 조건부 타입으로 통합

interface TypedRequestConfig<T = unknown> {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  schema?: import("zod").ZodType<T>;
  signal?: AbortSignal;
  timeout?: number;
}

// 스키마가 있으면 파싱된 타입, 없으면 Response 반환
type FetchResult<T> = T extends { schema: import("zod").ZodType<infer R> }
  ? R
  : Response;

async function typedFetch<C extends TypedRequestConfig>(
  url: string,
  config?: C
): Promise<FetchResult<C>> {
  const controller = new AbortController();
  const timeout = config?.timeout ?? 30_000;

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: config?.method ?? "GET",
      headers: config?.headers,
      body: config?.body ? JSON.stringify(config.body) : undefined,
      signal: config?.signal ?? controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (config?.schema) {
      const data = await response.json();
      return config.schema.parse(data) as FetchResult<C>;
    }

    return response as FetchResult<C>;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 사용
import { z } from "zod";

const UserSchema = z.object({ id: z.string(), name: z.string() });

// 스키마 제공 시: 파싱된 타입 반환
const user = await typedFetch("/api/user/1", {
  schema: UserSchema,
});
// user: { id: string; name: string }

// 스키마 없을 시: Response 반환
const raw = await typedFetch("/api/health");
// raw: Response
```

#### 프롬프트 5: 타입 레벨 문자열 파서

```
이 URL 경로 패턴에서 파라미터를 자동 추출하는 타입 만들어줘.
"/users/:userId/posts/:postId" => { userId: string; postId: string }
```

해결:

```typescript
// 경로 문자열에서 파라미터 자동 추출
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : Record<string, never>;

// 테스트
type Params1 = ExtractParams<"/users/:userId/posts/:postId">;
// { userId: string } & { postId: string }

type Params2 = ExtractParams<"/api/v1/:resource/:id/comments">;
// { resource: string } & { id: string }

type Params3 = ExtractParams<"/static/page">;
// Record<string, never> (파라미터 없음)

// 실전 활용: 타입 안전한 라우터
function createRoute<P extends string>(
  pattern: P,
  handler: (params: ExtractParams<P>, req: Request) => Response | Promise<Response>
) {
  return { pattern, handler };
}

// 파라미터가 자동으로 타입 추론됨
createRoute("/users/:userId/posts/:postId", (params) => {
  // params.userId: string (자동 완성 지원)
  // params.postId: string
  return new Response(`User: ${params.userId}, Post: ${params.postId}`);
});

// 없는 파라미터 접근 시 타입 에러
createRoute("/users/:userId", (params) => {
  // @ts-expect-error - postId는 존재하지 않음
  params.postId;
  return new Response(params.userId);
});
```

---

## 2. TypeScript 5.9 Preview

TypeScript 5.9는 성능, 타입 추론, DX 개선에 집중한 릴리스입니다. 주요 신규 기능을 소개합니다.

### 2.1 Deferred Type Checking

대규모 코드베이스에서 타입 체크 성능을 극적으로 개선하는 기능입니다. 사용하지 않는 코드 경로의 타입 체크를 실제 접근 시점까지 지연합니다.

```typescript
// tsconfig.json
// {
//   "compilerOptions": {
//     "deferredTypeChecking": true  // 5.9 Preview 기능
//   }
// }

// 기존 동작: 모든 제네릭 인스턴스를 즉시 체크
// 새 동작: 실제 사용 시점에서 체크

// 이 패턴에서 특히 효과적:
// 거대한 유니온 타입, 복잡한 조건부 타입, 깊은 제네릭 중첩

// 예시: 수백 개 라우트가 있는 앱에서
type AppRoutes =
  | { path: "/users"; params: Record<string, never> }
  | { path: "/users/:id"; params: { id: string } }
  | { path: "/posts/:postId/comments/:commentId"; params: { postId: string; commentId: string } };
  // ... 수백 개 라우트

// Deferred Checking이 없으면:
// AppRoutes 참조 시 모든 라우트의 타입이 즉시 확인됨

// Deferred Checking이 있으면:
// 실제 사용하는 라우트의 타입만 확인됨
// => 대규모 프로젝트에서 tsc 속도 20-40% 향상 보고
```

### 2.2 `satisfies` 연산자 개선

```typescript
// TypeScript 5.9에서 satisfies가 더 스마트해짐

// 개선 1: satisfies + as const 조합 개선
const routes = {
  home: { path: "/", exact: true },
  users: { path: "/users", exact: false },
  userDetail: { path: "/users/:id", exact: true },
} as const satisfies Record<string, { path: string; exact: boolean }>;

// routes.home.path의 타입: "/" (리터럴 유지)
// 이전에는 satisfies가 as const의 리터럴 타입을 넓힐 수 있었음

// 개선 2: 에러 메시지에 satisfies 컨텍스트 포함
const config = {
  port: "3000", // 에러: string is not assignable to number
  host: "localhost",
} satisfies { port: number; host: string };
// 5.9에서는 에러 메시지에 "in satisfies expression" 컨텍스트 추가
// 어디서 타입 불일치가 발생했는지 더 명확
```

### 2.3 `import defer` (Stage 3 지원 준비)

```typescript
// Import Defer 제안 - 모듈의 실제 평가를 지연
// TypeScript 5.9에서 구문 지원 + 타입 체킹 준비

// 기존: import 시점에 모듈 즉시 평가
// import { heavyComputation } from "./heavy-module";

// 새로운 방식: 첫 접근 시점까지 평가 지연
// import defer * as heavyModule from "./heavy-module";

// TypeScript 5.9에서는 아직 emit하지 않지만 타입 체크는 지원
// 향후 런타임 지원 시 자동 활성화

// 현재 동일 효과를 내는 패턴:
const lazyModule = () => import("./heavy-module");

type LazyModule<T> = () => Promise<T>;

async function useLazy<T>(loader: LazyModule<T>): Promise<T> {
  return loader();
}

// 사용
const heavyModule = await useLazy(() => import("./heavy-computation"));
heavyModule.process(data);
```

### 2.4 향상된 타입 추론

```typescript
// 5.9의 개선된 제어 흐름 분석

// 개선 1: Array.isArray 이후 readonly 배열 추론
function processInput(input: string | readonly string[]) {
  if (Array.isArray(input)) {
    // 5.8: input: string[] (readonly 손실)
    // 5.9: input: readonly string[] (readonly 유지)
    input.forEach((s) => console.log(s));
  }
}

// 개선 2: 정규식 그룹의 타입 추론
// (향후 TC39 제안과 연동 예정)
const dateRegex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const match = "2026-04-01".match(dateRegex);

if (match?.groups) {
  // 5.9에서 groups의 타입이 더 정확해짐
  const { year, month, day } = match.groups;
  // year, month, day: string
}

// 개선 3: Promise.withResolvers 타입 개선
const { promise, resolve, reject } = Promise.withResolvers<string>();
// resolve: (value: string | PromiseLike<string>) => void
// reject: (reason?: unknown) => void
// 5.9에서 제네릭 추론이 더 정확해짐
```

---

## 3. Effect-TS 2.0 심화

Effect-TS 2.0은 TypeScript 생태계에서 가장 강력한 함수형 프로그래밍 라이브러리입니다. Schema, Layer, Runtime 시스템을 중심으로 실전 패턴을 다룹니다.

### 3.1 Effect Schema: 런타임 검증과 타입의 통합

```typescript
import { Schema } from "effect";

// Schema 정의 = 타입 정의 + 런타임 검증 + 인코딩/디코딩 규칙
const UserSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand("UserId")),
  email: Schema.String.pipe(
    Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/),
    Schema.brand("Email")
  ),
  age: Schema.Number.pipe(
    Schema.int(),
    Schema.between(0, 150)
  ),
  role: Schema.Literal("admin", "user", "moderator"),
  createdAt: Schema.DateFromString, // string -> Date 자동 변환
  metadata: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }),
});

// 스키마에서 타입 추출
type User = typeof UserSchema.Type;
// {
//   id: string & Brand<"UserId">;
//   email: string & Brand<"Email">;
//   age: number;
//   role: "admin" | "user" | "moderator";
//   createdAt: Date;
//   metadata: Record<string, unknown>;
// }

// 인코딩 타입 (API 직렬화용)
type UserEncoded = typeof UserSchema.Encoded;
// createdAt가 string으로 변환됨

// 디코딩 (parse)
const parseUser = Schema.decodeUnknownSync(UserSchema);

try {
  const user = parseUser({
    id: "usr_123",
    email: "user@example.com",
    age: 25,
    role: "user",
    createdAt: "2026-04-01T00:00:00Z",
    metadata: { theme: "dark" },
  });
  // user: User 타입으로 안전하게 사용
} catch (error) {
  // ParseError: 구체적인 에러 경로와 메시지
  console.error(error);
}

// 인코딩 (serialize)
const encodeUser = Schema.encodeSync(UserSchema);
// Date -> string 자동 변환
```

### 3.2 Effect Layer: 의존성 주입 시스템

```typescript
import { Effect, Layer, Context, pipe } from "effect";

// 서비스 정의
class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    query: <T>(sql: string, params?: unknown[]) => Effect.Effect<T[], Error>;
    transaction: <T>(fn: () => Effect.Effect<T, Error>) => Effect.Effect<T, Error>;
  }
>() {}

class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    get: <T>(key: string) => Effect.Effect<T | null>;
    set: <T>(key: string, value: T, ttl?: number) => Effect.Effect<void>;
    del: (key: string) => Effect.Effect<void>;
  }
>() {}

class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    findById: (id: string) => Effect.Effect<User | null, Error>;
    save: (user: User) => Effect.Effect<User, Error>;
  }
>() {}

// Layer 구현: 프로덕션
const DatabaseLive = Layer.succeed(
  DatabaseService,
  {
    query: <T>(sql: string, params?: unknown[]) =>
      Effect.tryPromise({
        try: () => db.query<T>(sql, params),
        catch: (e) => new Error(`DB query failed: ${e}`),
      }),
    transaction: <T>(fn: () => Effect.Effect<T, Error>) =>
      pipe(fn(), Effect.tap(() => Effect.log("Transaction committed"))),
  }
);

const CacheLive = Layer.succeed(
  CacheService,
  {
    get: <T>(key: string) =>
      Effect.tryPromise({
        try: async () => {
          const raw = await redis.get(key);
          return raw ? (JSON.parse(raw) as T) : null;
        },
        catch: () => null as T | null,
      }),
    set: <T>(key: string, value: T, ttl = 300) =>
      Effect.tryPromise({
        try: () => redis.setex(key, ttl, JSON.stringify(value)),
        catch: () => undefined,
      }),
    del: (key: string) =>
      Effect.tryPromise({
        try: () => redis.del(key),
        catch: () => undefined,
      }),
  }
);

// UserRepository는 Database + Cache에 의존
const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const cache = yield* CacheService;

    return {
      findById: (id: string) =>
        Effect.gen(function* () {
          // 캐시 먼저 확인
          const cached = yield* cache.get<User>(`user:${id}`);
          if (cached) return cached;

          // DB 조회
          const results = yield* db.query<User>(
            "SELECT * FROM users WHERE id = $1",
            [id]
          );
          const user = results[0] ?? null;

          // 캐시에 저장
          if (user) yield* cache.set(`user:${id}`, user, 600);

          return user;
        }),

      save: (user: User) =>
        Effect.gen(function* () {
          const results = yield* db.query<User>(
            "INSERT INTO users (id, email, age, role) VALUES ($1, $2, $3, $4) RETURNING *",
            [user.id, user.email, user.age, user.role]
          );
          // 캐시 무효화
          yield* cache.del(`user:${user.id}`);
          return results[0];
        }),
    };
  })
);

// 전체 앱 Layer 조합
const AppLive = UserRepositoryLive.pipe(
  Layer.provide(DatabaseLive),
  Layer.provide(CacheLive)
);

// 테스트용 Layer: 인메모리 구현
const DatabaseTest = Layer.succeed(
  DatabaseService,
  {
    query: <T>(_sql: string, _params?: unknown[]) =>
      Effect.succeed([] as T[]),
    transaction: <T>(fn: () => Effect.Effect<T, Error>) => fn(),
  }
);

const CacheTest = Layer.succeed(
  CacheService,
  (() => {
    const store = new Map<string, string>();
    return {
      get: <T>(key: string) =>
        Effect.succeed(
          store.has(key) ? (JSON.parse(store.get(key)!) as T) : null
        ),
      set: <T>(key: string, value: T) =>
        Effect.succeed(void store.set(key, JSON.stringify(value))),
      del: (key: string) =>
        Effect.succeed(void store.delete(key)),
    };
  })()
);

const AppTest = UserRepositoryLive.pipe(
  Layer.provide(DatabaseTest),
  Layer.provide(CacheTest)
);
```

### 3.3 Effect Runtime: 에러 처리와 동시성

```typescript
import { Effect, Schedule, Duration, Fiber, Queue } from "effect";

// 체계적 에러 처리
class NetworkError extends Error {
  readonly _tag = "NetworkError" as const;
  constructor(
    message: string,
    readonly statusCode?: number
  ) {
    super(message);
  }
}

class ValidationError extends Error {
  readonly _tag = "ValidationError" as const;
  constructor(
    message: string,
    readonly field: string
  ) {
    super(message);
  }
}

class TimeoutError extends Error {
  readonly _tag = "TimeoutError" as const;
}

// 재시도 + 타임아웃 + 에러 복구 조합
const fetchWithResilience = <T>(
  url: string,
  schema: import("effect").Schema.Schema<T>
) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: () => new NetworkError(`Failed to fetch ${url}`),
    });

    if (!response.ok) {
      yield* Effect.fail(
        new NetworkError(`HTTP ${response.status}`, response.status)
      );
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => new NetworkError("JSON parse failed"),
    });

    return yield* Effect.try({
      try: () => Schema.decodeUnknownSync(schema)(data),
      catch: (e) => new ValidationError(String(e), "response"),
    });
  }).pipe(
    // 타임아웃 5초
    Effect.timeout(Duration.seconds(5)),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new TimeoutError())
    ),
    // 네트워크 에러 시 최대 3회 재시도 (지수 백오프)
    Effect.retry(
      Schedule.exponential(Duration.seconds(1)).pipe(
        Schedule.compose(Schedule.recurs(3)),
        Schedule.whileInput((err: NetworkError | ValidationError | TimeoutError) =>
          err._tag === "NetworkError"
        )
      )
    )
  );

// 동시성 제어: 병렬 실행 + 속도 제한
const processBatch = <T, R>(
  items: T[],
  processor: (item: T) => Effect.Effect<R, Error>,
  concurrency = 5
) =>
  Effect.forEach(items, processor, {
    concurrency,
    batching: true,
  });

// 큐 기반 작업 처리
const createWorkerPool = <T, R>(
  handler: (item: T) => Effect.Effect<R, Error>,
  workerCount = 4
) =>
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<T>(100);

    // 워커 생성
    const workers = Array.from({ length: workerCount }, (_, i) =>
      Effect.gen(function* () {
        while (true) {
          const item = yield* Queue.take(queue);
          yield* handler(item).pipe(
            Effect.catchAll((e) =>
              Effect.log(`Worker ${i} error: ${e}`)
            )
          );
        }
      }).pipe(Effect.fork)
    );

    const fibers = yield* Effect.all(workers);

    return {
      submit: (item: T) => Queue.offer(queue, item),
      shutdown: () =>
        Effect.gen(function* () {
          yield* Queue.shutdown(queue);
          yield* Effect.forEach(fibers, Fiber.join);
        }),
    };
  });
```

---

## 4. 멀티 베타: Feature Flag 타입 자동 생성

서버에서 관리하는 Feature Flag를 TypeScript 타입으로 자동 생성하여 환경별 타입 안전성을 보장하는 시스템입니다.

### 4.1 Feature Flag 서버 스키마

```typescript
// feature-flags/schema.ts
import { z } from "zod";

// 플래그 값 타입
const FlagValueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("boolean"), value: z.boolean() }),
  z.object({ type: z.literal("string"), value: z.string() }),
  z.object({ type: z.literal("number"), value: z.number() }),
  z.object({
    type: z.literal("json"),
    value: z.record(z.unknown()),
  }),
]);

// 환경별 플래그 설정
const EnvironmentSchema = z.enum([
  "development",
  "staging",
  "beta-1",
  "beta-2",
  "beta-3",
  "production",
]);

type Environment = z.infer<typeof EnvironmentSchema>;

// 플래그 정의
const FeatureFlagDefinitionSchema = z.object({
  key: z.string(),
  description: z.string(),
  defaultValue: FlagValueSchema,
  environments: z.record(EnvironmentSchema, FlagValueSchema.optional()),
  tags: z.array(z.string()).optional(),
  owner: z.string().optional(),
  deprecated: z.boolean().optional(),
});

// 전체 플래그 설정 파일
const FeatureFlagsConfigSchema = z.object({
  version: z.string(),
  updatedAt: z.string().datetime(),
  flags: z.array(FeatureFlagDefinitionSchema),
});

type FeatureFlagsConfig = z.infer<typeof FeatureFlagsConfigSchema>;
type FeatureFlagDefinition = z.infer<typeof FeatureFlagDefinitionSchema>;
type FlagValue = z.infer<typeof FlagValueSchema>;

export {
  FeatureFlagsConfigSchema,
  EnvironmentSchema,
  type FeatureFlagsConfig,
  type FeatureFlagDefinition,
  type FlagValue,
  type Environment,
};
```

### 4.2 타입 코드 생성기

```typescript
// scripts/generate-flag-types.ts
import { readFileSync, writeFileSync } from "node:fs";
import { FeatureFlagsConfigSchema, type Environment } from "../feature-flags/schema";

function generateFlagTypes(configPath: string, outputPath: string, env: Environment) {
  const raw = JSON.parse(readFileSync(configPath, "utf-8"));
  const config = FeatureFlagsConfigSchema.parse(raw);

  const lines: string[] = [
    "// 자동 생성 파일 - 직접 수정하지 마세요",
    `// 생성 시각: ${new Date().toISOString()}`,
    `// 환경: ${env}`,
    `// 소스: ${configPath}`,
    "",
    'import type { Brand } from "./brand";',
    "",
  ];

  // 플래그 키 유니온 타입
  const flagKeys = config.flags.map((f) => `"${f.key}"`).join(" | ");
  lines.push(`export type FeatureFlagKey = ${flagKeys};`);
  lines.push("");

  // 각 플래그의 값 타입 매핑
  lines.push("export interface FeatureFlagTypes {");
  for (const flag of config.flags) {
    const envOverride = flag.environments[env];
    const effectiveValue = envOverride ?? flag.defaultValue;
    const tsType = flagValueToTsType(effectiveValue);
    const deprecated = flag.deprecated ? " @deprecated" : "";
    lines.push(`  /** ${flag.description}${deprecated} */`);
    lines.push(`  "${flag.key}": ${tsType};`);
  }
  lines.push("}");
  lines.push("");

  // 현재 환경의 기본값 상수
  lines.push(`export const FLAG_DEFAULTS = {`);
  for (const flag of config.flags) {
    const envOverride = flag.environments[env];
    const effectiveValue = envOverride ?? flag.defaultValue;
    lines.push(`  "${flag.key}": ${flagValueToLiteral(effectiveValue)},`);
  }
  lines.push("} as const satisfies Record<FeatureFlagKey, unknown>;");
  lines.push("");

  // 타입 안전한 플래그 접근 함수 타입
  lines.push("export interface FeatureFlagClient {");
  lines.push("  get<K extends FeatureFlagKey>(key: K): FeatureFlagTypes[K];");
  lines.push("  isEnabled(key: FeatureFlagKey): boolean;");
  lines.push("  getAll(): Readonly<FeatureFlagTypes>;");
  lines.push("}");
  lines.push("");

  // 활성/비활성 플래그 유니온 (현재 환경 기준)
  const enabledFlags = config.flags
    .filter((f) => {
      const v = f.environments[env] ?? f.defaultValue;
      return v.type === "boolean" && v.value === true;
    })
    .map((f) => `"${f.key}"`);

  const disabledFlags = config.flags
    .filter((f) => {
      const v = f.environments[env] ?? f.defaultValue;
      return v.type === "boolean" && v.value === false;
    })
    .map((f) => `"${f.key}"`);

  lines.push(
    `export type EnabledFlags = ${enabledFlags.length ? enabledFlags.join(" | ") : "never"};`
  );
  lines.push(
    `export type DisabledFlags = ${disabledFlags.length ? disabledFlags.join(" | ") : "never"};`
  );

  writeFileSync(outputPath, lines.join("\n") + "\n");
  console.log(`Generated flag types for "${env}" at ${outputPath}`);
}

function flagValueToTsType(value: { type: string; value: unknown }): string {
  switch (value.type) {
    case "boolean": return "boolean";
    case "string": return "string";
    case "number": return "number";
    case "json": return "Record<string, unknown>";
    default: return "unknown";
  }
}

function flagValueToLiteral(value: { type: string; value: unknown }): string {
  switch (value.type) {
    case "boolean":
    case "number":
      return String(value.value);
    case "string":
      return `"${value.value}"`;
    case "json":
      return JSON.stringify(value.value);
    default:
      return "undefined";
  }
}

// CLI
const args = process.argv.slice(2);
const configPath = args[0] ?? "feature-flags/flags.json";
const env = (args[1] ?? "development") as Environment;
const outputPath = args[2] ?? `src/generated/feature-flags.${env}.ts`;

generateFlagTypes(configPath, outputPath, env);
```

### 4.3 타입 안전한 Feature Flag 클라이언트

```typescript
// feature-flags/client.ts
import type { FeatureFlagKey, FeatureFlagTypes } from "../generated/feature-flags.production";
import { FLAG_DEFAULTS } from "../generated/feature-flags.production";

interface FlagOverrides {
  source: "remote" | "localStorage" | "url";
  flags: Partial<FeatureFlagTypes>;
}

class TypedFeatureFlagClient {
  private overrides: Partial<FeatureFlagTypes> = {};
  private listeners = new Map<FeatureFlagKey, Set<(value: unknown) => void>>();

  constructor(private defaults: typeof FLAG_DEFAULTS) {
    this.loadOverrides();
  }

  get<K extends FeatureFlagKey>(key: K): FeatureFlagTypes[K] {
    if (key in this.overrides) {
      return this.overrides[key] as FeatureFlagTypes[K];
    }
    return this.defaults[key] as FeatureFlagTypes[K];
  }

  isEnabled(key: FeatureFlagKey): boolean {
    const value = this.get(key);
    return Boolean(value);
  }

  getAll(): Readonly<FeatureFlagTypes> {
    return { ...this.defaults, ...this.overrides } as Readonly<FeatureFlagTypes>;
  }

  // 원격 플래그 동기화
  async sync(endpoint: string): Promise<void> {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) return;

      const remote = (await response.json()) as Partial<FeatureFlagTypes>;
      this.overrides = { ...this.overrides, ...remote };
      this.notifyAll();
    } catch {
      console.warn("Feature flag sync failed, using defaults");
    }
  }

  // 개발 환경에서 URL 파라미터로 오버라이드
  // ?ff_newCheckout=true&ff_darkMode=false
  private loadOverrides() {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of params) {
      if (key.startsWith("ff_")) {
        const flagKey = key.slice(3) as FeatureFlagKey;
        if (flagKey in this.defaults) {
          this.overrides[flagKey] = parseValue(value) as FeatureFlagTypes[typeof flagKey];
        }
      }
    }
  }

  // 변경 구독
  subscribe<K extends FeatureFlagKey>(
    key: K,
    listener: (value: FeatureFlagTypes[K]) => void
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener as (value: unknown) => void);

    return () => {
      this.listeners.get(key)?.delete(listener as (value: unknown) => void);
    };
  }

  private notifyAll() {
    for (const [key, listeners] of this.listeners) {
      const value = this.get(key);
      for (const listener of listeners) {
        listener(value);
      }
    }
  }
}

function parseValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  const num = Number(value);
  if (!isNaN(num)) return num;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const featureFlags = new TypedFeatureFlagClient(FLAG_DEFAULTS);
```

### 4.4 React Hook + CI 연동

```typescript
// hooks/useFeatureFlag.ts
import { useSyncExternalStore, useCallback } from "react";
import { featureFlags } from "../feature-flags/client";
import type { FeatureFlagKey, FeatureFlagTypes } from "../generated/feature-flags.production";

export function useFeatureFlag<K extends FeatureFlagKey>(
  key: K
): FeatureFlagTypes[K] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return featureFlags.subscribe(key, onStoreChange);
    },
    [key]
  );

  const getSnapshot = useCallback(() => featureFlags.get(key), [key]);
  const getServerSnapshot = useCallback(() => featureFlags.get(key), [key]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// 조건부 렌더링 컴포넌트
interface FeatureGateProps {
  flag: FeatureFlagKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(flag);
  return <>{enabled ? children : fallback}</>;
}

// CI: 플래그 타입 생성 + 검증
// package.json scripts:
// "flags:generate": "tsx scripts/generate-flag-types.ts flags.json production src/generated/feature-flags.production.ts"
// "flags:generate:all": "for env in development staging beta-1 beta-2 beta-3 production; do tsx scripts/generate-flag-types.ts flags.json $env src/generated/feature-flags.$env.ts; done"
// "flags:check": "tsc --noEmit --project tsconfig.flags.json"
```

---

## 5. Branded Types + Zod 통합 패턴

### 5.1 Branded Type 기반 체계

```typescript
// types/brand.ts

// 브랜드 타입 유틸리티
declare const __brand: unique symbol;

export type Brand<B extends string> = { readonly [__brand]: B };
export type Branded<T, B extends string> = T & Brand<B>;

// 자주 쓰는 브랜드 타입
export type UserId = Branded<string, "UserId">;
export type OrderId = Branded<string, "OrderId">;
export type Email = Branded<string, "Email">;
export type PositiveInt = Branded<number, "PositiveInt">;
export type NonEmptyString = Branded<string, "NonEmptyString">;
export type ISODateString = Branded<string, "ISODateString">;
export type Currency = Branded<number, "Currency">; // 센트 단위
export type Percentage = Branded<number, "Percentage">; // 0-100
export type Latitude = Branded<number, "Latitude">;
export type Longitude = Branded<number, "Longitude">;

// 생성자 함수: 런타임 검증 포함
export function UserId(value: string): UserId {
  if (!value.startsWith("usr_")) {
    throw new Error(`Invalid UserId: must start with "usr_"`);
  }
  return value as UserId;
}

export function Email(value: string): Email {
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
    throw new Error(`Invalid Email: ${value}`);
  }
  return value as Email;
}

export function PositiveInt(value: number): PositiveInt {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid PositiveInt: ${value}`);
  }
  return value as PositiveInt;
}

export function Currency(value: number): Currency {
  // 센트 단위 정수로 강제
  return Math.round(value * 100) as unknown as Currency;
}
```

### 5.2 Zod + Branded Types 통합

```typescript
// schemas/branded-schemas.ts
import { z } from "zod";
import type { Brand, Branded } from "../types/brand";

// Zod에 브랜드 타입을 통합하는 유틸리티
function brandedString<B extends string>(
  brand: B,
  refinements?: (schema: z.ZodString) => z.ZodString
) {
  let schema = z.string();
  if (refinements) schema = refinements(schema);
  return schema.transform((val) => val as Branded<string, B>);
}

function brandedNumber<B extends string>(
  brand: B,
  refinements?: (schema: z.ZodNumber) => z.ZodNumber
) {
  let schema = z.number();
  if (refinements) schema = refinements(schema);
  return schema.transform((val) => val as Branded<number, B>);
}

// 구체적인 스키마 정의
export const UserIdSchema = brandedString("UserId", (s) =>
  s.regex(/^usr_[a-zA-Z0-9]+$/, "UserId must start with usr_")
);

export const EmailSchema = brandedString("Email", (s) =>
  s.email("Invalid email format").toLowerCase()
);

export const OrderIdSchema = brandedString("OrderId", (s) =>
  s.regex(/^ord_[a-zA-Z0-9]+$/, "OrderId must start with ord_")
);

export const PositiveIntSchema = brandedNumber("PositiveInt", (n) =>
  n.int().positive()
);

export const CurrencySchema = brandedNumber("Currency", (n) =>
  n.nonnegative()
).transform((val) => Math.round(val * 100) as Branded<number, "Currency">);

export const PercentageSchema = brandedNumber("Percentage", (n) =>
  n.min(0).max(100)
);

export const ISODateStringSchema = brandedString("ISODateString", (s) =>
  s.datetime()
);

// 도메인 엔티티 스키마
export const CreateOrderSchema = z.object({
  userId: UserIdSchema,
  items: z.array(
    z.object({
      productId: brandedString("ProductId"),
      quantity: PositiveIntSchema,
      unitPrice: CurrencySchema,
    })
  ).min(1, "Order must have at least one item"),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.string().length(2), // ISO 3166-1 alpha-2
  }),
  couponCode: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
// CreateOrderInput.userId는 Branded<string, "UserId"> 타입

// API 핸들러에서 사용
async function createOrder(rawInput: unknown) {
  // Zod 파싱 = 런타임 검증 + 브랜드 타입 부여
  const input = CreateOrderSchema.parse(rawInput);

  // input.userId: Branded<string, "UserId">
  // input.items[0].unitPrice: Branded<number, "Currency">

  // 브랜드 타입 덕분에 실수 방지
  // processPayment(input.userId); // 타입 에러: UserId는 PaymentId가 아님
  // calculateDiscount(input.userId); // 타입 에러: UserId는 Percentage가 아님

  return await orderService.create(input);
}
```

### 5.3 Branded Types 간 변환 규칙

```typescript
// types/converters.ts
import type { Branded, Currency, Percentage } from "./brand";

// 명시적 변환 함수로 타입 안전성 유지
export function applyDiscount(price: Currency, discount: Percentage): Currency {
  const discountFactor = 1 - (discount as unknown as number) / 100;
  const discounted = (price as unknown as number) * discountFactor;
  return Math.round(discounted) as unknown as Currency;
}

export function addCurrency(a: Currency, b: Currency): Currency {
  return ((a as unknown as number) + (b as unknown as number)) as unknown as Currency;
}

export function multiplyCurrency(price: Currency, quantity: number): Currency {
  return ((price as unknown as number) * quantity) as unknown as Currency;
}

// 안전한 변환 체인
export function formatCurrency(amount: Currency, locale = "ko-KR"): string {
  const cents = amount as unknown as number;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// 타입 가드
export function isUserId(value: string): value is Branded<string, "UserId"> {
  return value.startsWith("usr_");
}

export function isEmail(value: string): value is Branded<string, "Email"> {
  return /^[^@]+@[^@]+\.[^@]+$/.test(value);
}
```

---

## 6. tsgo: TypeScript Native Port

tsgo는 TypeScript 컴파일러를 Go로 재작성한 공식 프로젝트입니다. 10배 이상의 타입 체크 속도 향상을 목표로 합니다.

### 6.1 tsgo 개요

```typescript
// tsgo는 Microsoft의 공식 프로젝트로 TypeScript 컴파일러를
// Go 언어로 재작성(native port)하여 성능을 극대화한 것입니다.

// 주요 특징:
// - TypeScript 컴파일러의 타입 체킹 로직을 Go로 1:1 포팅
// - JavaScript(tsc) 대비 10배 이상 빠른 타입 체크
// - 기존 tsconfig.json 100% 호환
// - IDE (VS Code) 언어 서버로도 활용 가능
// - 점진적 도입 가능 (CI에서만 사용, 개발 시 기존 tsc 유지 등)

// 벤치마크 (공식 발표 기준):
// | 프로젝트         | tsc (5.8) | tsgo    | 배율   |
// |-----------------|-----------|---------|--------|
// | VS Code 코드베이스 | 77.8초    | 7.5초   | 10.4x |
// | Playwright       | 11.1초    | 1.1초   | 10.1x |
// | TypeORM          | 17.5초    | 1.3초   | 13.5x |
```

### 6.2 tsgo 도입 가이드

```typescript
// 설치 및 설정

// 1. 설치
// npm install -D @anthropic/tsgo (예시 - 실제 패키지명은 공식 문서 참조)
// 또는 바이너리 직접 다운로드

// 2. 기존 프로젝트에서 바로 사용
// tsgo --project tsconfig.json

// 3. CI에서 활용 (tsc 대체)
// package.json:
// {
//   "scripts": {
//     "typecheck": "tsgo --noEmit",
//     "typecheck:legacy": "tsc --noEmit",
//     "build": "tsgo --build && vite build"
//   }
// }
```

### 6.3 CI 파이프라인 통합

```yaml
# .github/workflows/typecheck.yml
name: Type Check

on:
  pull_request:
    paths: ["**/*.ts", "**/*.tsx"]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile

      # tsgo로 빠른 타입 체크
      - name: Type check with tsgo
        run: bun run typecheck
        # 기존 tsc 대비 CI 시간 80-90% 단축

      # 필요 시 tsc와 결과 비교 (전환기에만)
      - name: Verify with tsc (optional)
        if: github.event.pull_request.labels.*.name == 'verify-tsc'
        run: bun run typecheck:legacy
```

### 6.4 tsgo와 기존 도구의 공존

```typescript
// tsgo 도입 시 주의사항과 공존 전략

// 1. tsgo는 타입 체킹에 집중 - emit(JS 생성)은 기존 도구 사용
// - 빌드: Vite / Bun / esbuild가 트랜스파일 담당
// - 타입 체크: tsgo가 담당
// - 역할 분리가 이미 대부분의 프로젝트에서 이루어져 있으므로 전환이 자연스러움

// 2. IDE 통합
// - tsgo 기반 언어 서버가 준비되면 VS Code에서 훨씬 빠른 경험 제공
// - 현재는 CI 전용으로 먼저 도입하는 것을 추천

// 3. 플러그인 호환성
// - tsc의 transformer plugin은 tsgo에서 미지원
// - 대부분의 Vite/Bun 플러그인은 영향 없음 (빌드 시 tsc를 사용하지 않으므로)

// 4. 점진적 도입 전략
interface TsgoAdoptionPlan {
  phase1: "CI에서 tsgo로 타입 체크 (tsc와 병행)";
  phase2: "tsc 결과와 tsgo 결과 일치 확인 후 tsc 제거";
  phase3: "로컬 개발에서도 tsgo 언어 서버 사용";
  phase4: "전체 파이프라인 tsgo 전환 완료";
}

// 5. 성능 비교 스크립트
// scripts/compare-typecheck.ts
async function compareTypecheckers() {
  const { execSync } = await import("node:child_process");

  console.log("Running tsc...");
  const tscStart = performance.now();
  try {
    execSync("npx tsc --noEmit", { stdio: "pipe" });
  } catch { /* type errors expected */ }
  const tscTime = performance.now() - tscStart;

  console.log("Running tsgo...");
  const tsgoStart = performance.now();
  try {
    execSync("tsgo --noEmit", { stdio: "pipe" });
  } catch { /* type errors expected */ }
  const tsgoTime = performance.now() - tsgoStart;

  console.log(`\ntsc:  ${Math.round(tscTime)}ms`);
  console.log(`tsgo: ${Math.round(tsgoTime)}ms`);
  console.log(`Speed: ${(tscTime / tsgoTime).toFixed(1)}x faster`);
}

compareTypecheckers();
```

---

## 참고 자료

- [TypeScript 5.9 Roadmap - GitHub](https://github.com/microsoft/TypeScript/issues?q=milestone%3A%22TypeScript+5.9%22)
- [tsgo - TypeScript Native Port](https://github.com/nicolo-ribaudo/tc39-proposal-defer-import-eval)
- [Effect-TS Documentation](https://effect.website/docs/introduction)
- [Zod Documentation](https://zod.dev)
- [Branded Types in TypeScript](https://egghead.io/blog/using-branded-types-in-typescript)
- [React Compiler](https://react.dev/learn/react-compiler)
