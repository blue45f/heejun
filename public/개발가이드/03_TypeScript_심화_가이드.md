# TypeScript 심화 가이드 (2026)

## 목차

1. [AI 시대의 TypeScript](#1-ai-시대의-typescript)
2. [TypeScript 5.8+ 최신 기능](#2-typescript-58-최신-기능)
3. [타입 레벨 프로그래밍 마스터클래스](#3-타입-레벨-프로그래밍-마스터클래스)
4. [Full-Stack 타입 안전성](#4-full-stack-타입-안전성)
5. [React 19 + TypeScript 고급 패턴](#5-react-19--typescript-고급-패턴)
6. [런타임 검증과 타입 통합](#6-런타임-검증과-타입-통합)
7. [성능 & DX 최적화](#7-성능--dx-최적화)

---

## 1. AI 시대의 TypeScript

### 1.1 Claude Code로 타입 안전한 코드 생성

Claude Code는 프로젝트 컨텍스트를 이해하고 타입 안전한 코드를 생성할 수 있다. 핵심은 **구체적인 프롬프트**를 작성하는 것이다.

#### 프롬프트 예시 1: API 응답 타입과 fetcher 생성

```
프롬프트:
"GET /api/users/:id 엔드포인트의 응답을 처리하는 코드를 만들어줘.
응답 필드: id(number), name(string), email(string), role('admin' | 'user' | 'viewer'),
createdAt(ISO 8601 string). 에러 응답도 타입으로 정의하고,
Zod 스키마로 런타임 검증까지 포함해줘."
```

```typescript
import { z } from "zod";

// Zod 스키마 정의 -> 타입 자동 추론
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "user", "viewer"]),
  createdAt: z.string().datetime(),
});

const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string()).optional(),
});

const ApiResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: UserSchema }),
  z.object({ success: z.literal(false), error: ApiErrorSchema }),
]);

// 스키마에서 타입 자동 추론 (단일 소스)
type User = z.infer<typeof UserSchema>;
type ApiError = z.infer<typeof ApiErrorSchema>;
type ApiResponse = z.infer<typeof ApiResponseSchema>;

async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  const json = await res.json();
  const parsed = ApiResponseSchema.parse(json);

  if (!parsed.success) {
    throw new Error(`API Error [${parsed.error.code}]: ${parsed.error.message}`);
  }
  return parsed.data;
}
```

#### 프롬프트 예시 2: 제네릭 유틸리티 타입 생성

```
프롬프트:
"중첩 객체의 모든 필드를 optional로 만드는 DeepPartial 타입,
dot notation 경로를 추출하는 DotPath 타입,
그리고 해당 경로로 값을 가져오는 타입 안전한 get 함수를 만들어줘."
```

```typescript
// DeepPartial: 중첩 객체까지 모두 optional
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// DotPath: "user.address.city" 같은 경로 타입 추출
type DotPath<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${Prefix}${K}` | DotPath<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

// PathValue: 경로에 해당하는 값의 타입
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

// 타입 안전한 get 함수
function get<T, P extends DotPath<T>>(obj: T, path: P): PathValue<T, P> {
  return path.split(".").reduce((acc: any, key) => acc?.[key], obj);
}

// 사용 예
interface Config {
  db: { host: string; port: number; credentials: { user: string; pass: string } };
  cache: { ttl: number };
}

const config: Config = {
  db: { host: "localhost", port: 5432, credentials: { user: "admin", pass: "secret" } },
  cache: { ttl: 3600 },
};

const host = get(config, "db.host"); // string
const port = get(config, "db.port"); // number
// get(config, "db.invalid"); // 컴파일 에러
```

#### 프롬프트 예시 3: 상태 머신 패턴 생성

```
프롬프트:
"주문 처리 상태 머신을 만들어줘.
상태: pending -> confirmed -> shipped -> delivered.
각 전이에서 필요한 데이터가 다르고, 잘못된 전이는 컴파일 타임에 막아야 해."
```

```typescript
interface OrderStates {
  pending: { orderId: string; items: string[] };
  confirmed: { orderId: string; confirmedAt: Date; estimatedDelivery: Date };
  shipped: { orderId: string; trackingNumber: string; carrier: string };
  delivered: { orderId: string; deliveredAt: Date; signature: string };
}

interface Transitions {
  pending: "confirmed";
  confirmed: "shipped";
  shipped: "delivered";
  delivered: never;
}

type TransitionPayload<From extends keyof OrderStates> =
  Transitions[From] extends never
    ? never
    : OrderStates[Transitions[From] & keyof OrderStates];

class OrderStateMachine<S extends keyof OrderStates> {
  constructor(
    public readonly state: S,
    public readonly data: OrderStates[S],
  ) {}

  transition(
    nextData: TransitionPayload<S>,
  ): Transitions[S] extends never
    ? never
    : OrderStateMachine<Transitions[S] & keyof OrderStates> {
    const nextState = {
      pending: "confirmed",
      confirmed: "shipped",
      shipped: "delivered",
    } as Record<string, string>;
    return new OrderStateMachine(
      nextState[this.state] as any,
      nextData as any,
    ) as any;
  }
}

// 사용
const order = new OrderStateMachine("pending", {
  orderId: "ORD-001",
  items: ["item-a", "item-b"],
});

const confirmed = order.transition({
  orderId: "ORD-001",
  confirmedAt: new Date(),
  estimatedDelivery: new Date(),
});
// confirmed.state === "confirmed" (타입 레벨에서 확정)
```

### 1.2 Copilot / Cursor에서 TypeScript 타입 시스템 최대 활용

#### AI 친화적 타입 작성 원칙

```typescript
// [원칙 1] JSDoc으로 비즈니스 컨텍스트 제공
/**
 * 사용자 구독 상태를 나타내는 타입.
 * 결제 주기에 따라 billing 정보가 달라진다.
 * @example
 * const sub: Subscription = { plan: "pro", billingCycle: "monthly", ... }
 */
interface Subscription {
  /** 구독 플랜 - free는 결제 정보 불필요 */
  plan: "free" | "pro" | "enterprise";
  /** 결제 주기 - free 플랜에서는 null */
  billingCycle: "monthly" | "yearly" | null;
  /** Unix timestamp (초 단위) */
  expiresAt: number;
}

// [원칙 2] 함수 시그니처에 의도를 명확히 표현
// Bad: AI가 반환값을 추측해야 함
function processPayment(amount: number): any { /* ... */ }

// Good: 성공/실패 케이스가 타입으로 명확
type PaymentResult =
  | { status: "success"; transactionId: string; receiptUrl: string }
  | { status: "failed"; errorCode: string; retryable: boolean }
  | { status: "pending"; estimatedCompletion: Date };

function processPayment(amount: number, currency: string): Promise<PaymentResult> {
  // AI가 각 케이스를 정확히 처리하는 코드를 생성할 수 있음
}

// [원칙 3] Branded Type으로 도메인 개념 인코딩
type USD = number & { readonly __brand: "USD" };
type EUR = number & { readonly __brand: "EUR" };

function createUSD(amount: number): USD { return amount as USD; }
function createEUR(amount: number): EUR { return amount as EUR; }

// AI가 통화 혼합 실수를 방지하는 코드를 생성
function addUSD(a: USD, b: USD): USD {
  return (a + b) as USD;
}
// addUSD(createUSD(10), createEUR(20)); // 컴파일 에러
```

#### .cursorrules / CLAUDE.md 로 AI 컨텍스트 최적화

프로젝트 루트에 `.cursorrules` 또는 `CLAUDE.md` 파일을 두면 AI가 프로젝트 규칙을 자동으로 반영한다.

```markdown
# CLAUDE.md 예시

## TypeScript 규칙
- 모든 함수에 명시적 반환 타입을 작성한다.
- `any` 대신 `unknown`을 사용하고, type guard로 좁힌다.
- API 응답은 반드시 Zod 스키마로 런타임 검증한다.
- 에러 처리는 Result 패턴(discriminated union)을 사용한다.

## 타입 패턴
- 도메인 ID는 Branded Type을 사용한다: `type UserId = string & { __brand: "UserId" }`
- 서버 응답 타입은 `/types/api.ts`에 정의한다.
- 컴포넌트 props는 컴포넌트 파일 내에 정의한다.

## 프로젝트 구조
- /src/types - 공유 타입 정의
- /src/schemas - Zod 스키마 (타입의 단일 소스)
- /src/lib - 유틸리티 함수
```

### 1.3 AI 생성 코드의 타입 안전성 검증 전략

```typescript
import { z } from "zod";

// 전략 1: Zod 스키마를 Single Source of Truth로 사용
const CreateUserInputSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

// 전략 2: AI가 생성한 함수에 대한 타입 테스트
// type-testing.ts
import { expectTypeOf } from "vitest";

expectTypeOf(fetchUser).parameter(0).toBeNumber();
expectTypeOf(fetchUser).returns.resolves.toMatchTypeOf<User>();

// 전략 3: satisfies를 활용한 타입 검증 (AI 출력 검증에 유용)
const defaultConfig = {
  retryCount: 3,
  timeout: 5000,
  baseUrl: "https://api.example.com",
} satisfies Record<string, string | number>;
// satisfies는 값의 타입을 좁히면서도 구조를 검증

// 전략 4: Valibot으로 경량 런타임 검증 (번들 사이즈 최소화)
import * as v from "valibot";

const UserSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
});

type User = v.InferOutput<typeof UserSchema>;

function validateApiResponse<T>(schema: v.BaseSchema<any, T, any>, data: unknown): T {
  return v.parse(schema, data);
}
```

### 1.4 AI API 응답 검증: Zod 스키마 -> TypeScript 타입 자동 추론 패턴

```typescript
import { z } from "zod";

// LLM API 응답을 구조화된 타입으로 검증하는 패턴
const LLMResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.enum(["assistant", "user", "system"]),
        content: z.string(),
      }),
      finishReason: z.enum(["stop", "length", "content_filter"]),
    }),
  ),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
});

type LLMResponse = z.infer<typeof LLMResponseSchema>;

// Structured Output 검증 패턴
function createStructuredParser<T extends z.ZodType>(schema: T) {
  return {
    schema,
    parse(raw: unknown): z.infer<T> {
      return schema.parse(raw);
    },
    safeParse(raw: unknown) {
      return schema.safeParse(raw);
    },
  };
}

// 사용: AI가 JSON을 반환할 때 타입 안전하게 파싱
const SentimentSchema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()),
});

const sentimentParser = createStructuredParser(SentimentSchema);

async function analyzeSentiment(text: string) {
  const response = await callLLM({
    prompt: `Analyze sentiment: "${text}". Return JSON.`,
  });
  const parsed = JSON.parse(response.choices[0].message.content);
  return sentimentParser.parse(parsed);
  // 반환 타입이 자동으로 { sentiment: "positive" | ..., confidence: number, ... }
}
```

---

## 2. TypeScript 5.8+ 최신 기능

### 2.1 erasableSyntaxOnly + Node.js 네이티브 TS 실행

Node.js 22.6+에서 `--experimental-strip-types` 플래그로 TypeScript를 직접 실행할 수 있다. 이 모드는 타입 어노테이션을 단순히 제거(erase)하여 실행하므로, enum이나 namespace처럼 런타임 코드를 생성하는 구문은 사용할 수 없다.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "erasableSyntaxOnly": true,     // enum, namespace 등 사용 시 에러
    "verbatimModuleSyntax": true,   // import type 강제
    "rewriteRelativeImportExtensions": true  // .ts -> .js 자동 변환 (TS 5.7)
  }
}
```

```typescript
// 허용: 순수 타입 구문 (컴파일 시 제거됨)
type UserId = string;
interface User { id: UserId; name: string; }
function greet(user: User): string { return `Hello ${user.name}`; }

// 금지: 런타임 코드를 생성하는 구문
// enum Status { Active, Inactive }  // 에러! erasableSyntaxOnly 위반
// namespace Utils { ... }           // 에러!

// 대안: const object + as const
const Status = { Active: "active", Inactive: "inactive" } as const;
type Status = (typeof Status)[keyof typeof Status];
```

```bash
# Node.js에서 직접 실행 (빌드 불필요)
node --experimental-strip-types src/server.ts

# Node.js 23+ (플래그 없이 실행 가능)
node src/server.ts
```

### 2.2 isolatedDeclarations 모드

각 파일이 다른 파일의 타입 정보 없이도 독립적으로 `.d.ts`를 생성할 수 있도록 강제한다. 대규모 프로젝트에서 병렬 선언 파일 생성이 가능해진다.

```jsonc
{
  "compilerOptions": {
    "isolatedDeclarations": true
  }
}
```

```typescript
// 에러: 반환 타입 추론 불가 (다른 파일 정보 필요)
// export function getUser(id: number) {
//   return db.findUser(id);
// }

// 해결: 명시적 반환 타입
export function getUser(id: number): User | null {
  return db.findUser(id);
}

// 에러: 복잡한 초기화 표현식에서 타입 추론 불가
// export const config = createConfig({ ... });

// 해결: 명시적 타입 어노테이션
export const config: AppConfig = createConfig({ /* ... */ });
```

### 2.3 --noCheck 빌드 성능 최적화

타입 검사를 건너뛰고 트랜스파일만 수행한다. CI에서 타입 검사와 빌드를 분리하여 병렬 실행할 때 유용하다.

```jsonc
// package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build:fast": "tsc --noCheck",
    "ci": "npm run typecheck & npm run build:fast & wait"
  }
}
```

### 2.4 추론된 타입 술어 (TS 5.5)

함수가 타입 가드 역할을 할 때, `is` 키워드 없이도 TypeScript가 자동으로 타입을 좁힌다.

```typescript
// TS 5.5 이전: 명시적 타입 술어 필요
function isString(value: unknown): value is string {
  return typeof value === "string";
}

// TS 5.5+: 자동 추론 (명시적 선언 불필요)
function isNonNull<T>(value: T | null | undefined) {
  return value != null;
  // 반환 타입이 자동으로 `value is T`로 추론됨
}

const items = ["a", null, "b", undefined, "c"];
const filtered = items.filter(isNonNull);
// 타입: string[] (null | undefined 제거됨)

// 실전: 배열에서 특정 조건 필터링 시 타입이 자동으로 좁혀짐
interface Cat { kind: "cat"; meow(): void; }
interface Dog { kind: "dog"; bark(): void; }
type Animal = Cat | Dog;

const animals: Animal[] = [/* ... */];
const dogs = animals.filter((a) => a.kind === "dog");
// TS 5.5+: Dog[] 로 자동 추론
```

### 2.5 정규표현식 구문 검사 (TS 5.5)

```typescript
// TS 5.5+: 잘못된 정규표현식을 컴파일 타임에 감지
// const re = /[a-z/;     // 에러: 닫히지 않은 문자 클래스
// const re2 = /(?<name)/; // 에러: 잘못된 named group

const validRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // OK
```

### 2.6 NoInfer 유틸리티 타입 (TS 5.4)

제네릭 타입 추론에서 특정 위치의 타입이 추론에 참여하지 않도록 막는다.

```typescript
// 문제: defaultValue의 타입이 추론에 영향을 줌
function getOrDefault<T>(values: T[], defaultValue: T): T {
  return values.length > 0 ? values[0] : defaultValue;
}
// getOrDefault([1, 2, 3], "fallback") -> T가 string | number로 추론 (의도하지 않음)

// 해결: NoInfer로 defaultValue를 추론에서 제외
function getOrDefault<T>(values: T[], defaultValue: NoInfer<T>): T {
  return values.length > 0 ? values[0] : defaultValue;
}
// getOrDefault([1, 2, 3], "fallback") -> 에러! string은 number에 할당 불가
// getOrDefault([1, 2, 3], 0)          -> OK, T는 number

// 실전: 이벤트 핸들러에서 페이로드 타입 강제
function on<K extends string>(
  event: K,
  handler: (payload: NoInfer<EventMap[K]>) => void,
): void { /* ... */ }
```

---

## 3. 타입 레벨 프로그래밍 마스터클래스

### 3.1 Recursive Conditional Types

```typescript
// DeepReadonly: 중첩 객체를 재귀적으로 readonly로 변환
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

interface AppState {
  user: { name: string; settings: { theme: string; notifications: boolean } };
  items: { id: number; tags: string[] }[];
}

type FrozenState = DeepReadonly<AppState>;
// FrozenState.user.settings.theme은 readonly string
// FrozenState.items는 ReadonlyArray<...>

// DotPath (재귀 경로 추출 - 깊이 제한 포함)
type DotPath<T, Depth extends unknown[] = []> = Depth["length"] extends 5
  ? never
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends object
          ? K | `${K}.${DotPath<T[K], [...Depth, unknown]>}`
          : K;
      }[keyof T & string]
    : never;

type StatePaths = DotPath<AppState>;
// "user" | "user.name" | "user.settings" | "user.settings.theme" | ...
```

### 3.2 Variadic Tuple Types

```typescript
// pipe: 함수 합성을 타입 안전하게 구현
type LastOf<T extends any[]> = T extends [...any[], infer L] ? L : never;
type PipeReturn<Fns extends ((...args: any[]) => any)[]> = ReturnType<LastOf<Fns>>;

function pipe<A, B>(fn1: (a: A) => B): (a: A) => B;
function pipe<A, B, C>(fn1: (a: A) => B, fn2: (b: B) => C): (a: A) => C;
function pipe<A, B, C, D>(
  fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D,
): (a: A) => D;
function pipe(...fns: Function[]) {
  return (x: any) => fns.reduce((v, f) => f(v), x);
}

const transform = pipe(
  (s: string) => s.length,         // string -> number
  (n: number) => n > 5,            // number -> boolean
  (b: boolean) => (b ? "long" : "short"), // boolean -> string
);
// transform의 타입: (s: string) => string

// zip: 두 튜플을 쌍으로 묶기
type Zip<A extends any[], B extends any[]> = A extends [infer AH, ...infer AT]
  ? B extends [infer BH, ...infer BT]
    ? [[AH, BH], ...Zip<AT, BT>]
    : []
  : [];

function zip<A extends any[], B extends any[]>(a: [...A], b: [...B]): Zip<A, B> {
  return a.map((item, i) => [item, b[i]]) as any;
}

const zipped = zip([1, "a", true] as const, ["x", 2, null] as const);
// 타입: [[1, "x"], ["a", 2], [true, null]]
```

### 3.3 Key Remapping via `as` clause

```typescript
// Getters 자동 생성
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person { name: string; age: number; email: string; }
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number; getEmail: () => string }

// 특정 타입의 키만 필터링
type OnlyStringKeys<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type StringFields = OnlyStringKeys<Person>;
// { name: string; email: string } (age 제외)

// Event Handler 맵 생성
type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}Change`]: (newValue: T[K]) => void;
};

type PersonHandlers = EventHandlers<Person>;
// { onNameChange: (v: string) => void; onAgeChange: (v: number) => void; ... }
```

### 3.4 Type-safe Event Emitter

```typescript
// Template Literal Types + 제네릭으로 타입 안전한 이벤트 시스템
interface EventMap {
  "user:login": { userId: string; timestamp: number };
  "user:logout": { userId: string; reason: "manual" | "timeout" };
  "order:created": { orderId: string; total: number };
  "order:shipped": { orderId: string; trackingNumber: string };
}

// 이벤트 이름에서 namespace 추출
type EventNamespace = EventMap extends Record<`${infer NS}:${string}`, any> ? NS : never;
// "user" | "order"

class TypedEventEmitter<Events extends Record<string, any>> {
  private listeners = new Map<string, Set<Function>>();

  on<K extends keyof Events & string>(
    event: K,
    handler: (payload: Events[K]) => void,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }

  // 와일드카드: 특정 namespace의 모든 이벤트 구독
  onNamespace<NS extends EventNamespace>(
    namespace: NS,
    handler: (event: string, payload: any) => void,
  ): void {
    for (const [event] of this.listeners) {
      if (event.startsWith(`${namespace}:`)) {
        this.on(event as any, (payload) => handler(event, payload));
      }
    }
  }
}

const emitter = new TypedEventEmitter<EventMap>();

emitter.on("user:login", (payload) => {
  // payload는 자동으로 { userId: string; timestamp: number }
  console.log(`User ${payload.userId} logged in`);
});

emitter.emit("order:created", { orderId: "ORD-1", total: 99.99 });
// emitter.emit("order:created", { orderId: "ORD-1" }); // 에러: total 누락
```

### 3.5 HKT(Higher-Kinded Types) 시뮬레이션

TypeScript는 HKT를 네이티브로 지원하지 않지만, 인터페이스 확장 패턴으로 시뮬레이션할 수 있다.

```typescript
// HKT 시뮬레이션을 위한 기본 인프라
interface TypeRegistry<A = unknown> {
  Array: A[];
  Promise: Promise<A>;
  Nullable: A | null;
  Readonly: Readonly<A>;
}

type Kind<F extends keyof TypeRegistry, A> = TypeRegistry<A>[F];

// HKT를 활용한 Functor 인터페이스
interface Functor<F extends keyof TypeRegistry> {
  map<A, B>(fa: Kind<F, A>, f: (a: A) => B): Kind<F, B>;
}

// Array Functor
const arrayFunctor: Functor<"Array"> = {
  map: <A, B>(fa: A[], f: (a: A) => B): B[] => fa.map(f),
};

// Nullable Functor
const nullableFunctor: Functor<"Nullable"> = {
  map: <A, B>(fa: A | null, f: (a: A) => B): B | null =>
    fa === null ? null : f(fa),
};

// 제네릭 함수에서 HKT 활용
function doubleAll<F extends keyof TypeRegistry>(
  functor: Functor<F>,
  values: Kind<F, number>,
): Kind<F, number> {
  return functor.map(values, (n) => n * 2);
}

doubleAll(arrayFunctor, [1, 2, 3]);         // [2, 4, 6]
doubleAll(nullableFunctor, 5);               // 10
doubleAll(nullableFunctor, null);             // null
```

---

## 4. Full-Stack 타입 안전성

### 4.1 tRPC 타입 안전 API 계층

```typescript
// server/trpc.ts - 라우터 정의
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.context<{ userId?: string }>().create();

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { userId: ctx.userId } });
});

const protectedProcedure = t.procedure.use(isAuthed);

export const appRouter = t.router({
  user: t.router({
    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input, ctx }) => {
        const user = await db.user.findUnique({ where: { id: input.id } });
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });
        return user;
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        bio: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.user.update({
          where: { id: ctx.userId },
          data: input,
        });
      }),

    list: protectedProcedure
      .input(z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ input }) => {
        const items = await db.user.findMany({
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
        });
        const hasMore = items.length > input.limit;
        return {
          items: hasMore ? items.slice(0, -1) : items,
          nextCursor: hasMore ? items[items.length - 1].id : null,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

```typescript
// client/trpc.ts - 클라이언트 (타입이 자동으로 동기화)
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../server/trpc";

export const trpc = createTRPCReact<AppRouter>();

// 컴포넌트에서 사용
function UserProfile({ userId }: { userId: string }) {
  const { data: user } = trpc.user.getById.useQuery({ id: userId });
  // user의 타입이 서버 반환 타입과 자동으로 동기화됨

  const updateMutation = trpc.user.updateProfile.useMutation();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      updateMutation.mutate({ name: "New Name", bio: "Updated bio" });
      // 입력 타입도 서버 Zod 스키마에서 자동 추론
    }}>
      <p>{user?.name}</p>
    </form>
  );
}
```

### 4.2 Prisma + TypeScript 타입 동기화

```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

```typescript
// Prisma가 자동 생성한 타입 활용
import { Prisma } from "@prisma/client";

// 특정 select/include 조합에 대한 타입 추출
const userWithPosts = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { posts: { where: { published: true } } },
});
type UserWithPosts = Prisma.UserGetPayload<typeof userWithPosts>;

// 재사용 가능한 쿼리 빌더
function buildUserQuery<T extends Prisma.UserFindManyArgs>(
  args: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>,
) {
  return prisma.user.findMany(args);
}

// 호출 시 select/include에 따라 반환 타입이 자동으로 달라짐
const simpleUsers = await buildUserQuery({ select: { id: true, name: true } });
// 타입: { id: string; name: string }[]

const fullUsers = await buildUserQuery({ include: { posts: true } });
// 타입: (User & { posts: Post[] })[]

// 서비스 레이어에서 타입 안전한 패턴
class UserService {
  async findActive(role?: Role): Promise<UserWithPosts[]> {
    return prisma.user.findMany({
      where: { role },
      include: { posts: { where: { published: true } } },
    });
  }
}
```

### 4.3 ts-rest REST API 계약

```typescript
// shared/contract.ts - 서버/클라이언트 공유 API 계약
import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  published: z.boolean(),
  authorId: z.string(),
});

export const contract = c.router({
  posts: {
    getAll: {
      method: "GET",
      path: "/posts",
      query: z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
        published: z.coerce.boolean().optional(),
      }),
      responses: {
        200: z.object({
          items: z.array(PostSchema),
          total: z.number(),
        }),
      },
    },
    getById: {
      method: "GET",
      path: "/posts/:id",
      pathParams: z.object({ id: z.string() }),
      responses: {
        200: PostSchema,
        404: z.object({ message: z.string() }),
      },
    },
    create: {
      method: "POST",
      path: "/posts",
      body: z.object({
        title: z.string().min(1),
        content: z.string().optional(),
      }),
      responses: {
        201: PostSchema,
        400: z.object({ errors: z.array(z.string()) }),
      },
    },
  },
});
```

```typescript
// server/routes.ts - Express/Fastify 서버 구현
import { createExpressEndpoints } from "@ts-rest/express";
import { contract } from "../shared/contract";

createExpressEndpoints(contract, {
  posts: {
    getAll: async ({ query }) => {
      const { page, limit, published } = query;
      const [items, total] = await Promise.all([
        prisma.post.findMany({
          where: published !== undefined ? { published } : {},
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.post.count(),
      ]);
      return { status: 200, body: { items, total } };
    },
    getById: async ({ params }) => {
      const post = await prisma.post.findUnique({ where: { id: params.id } });
      if (!post) return { status: 404 as const, body: { message: "Not found" } };
      return { status: 200 as const, body: post };
    },
    create: async ({ body }) => {
      const post = await prisma.post.create({ data: body });
      return { status: 201 as const, body: post };
    },
  },
}, app);
```

### 4.4 Server/Client 공유 타입 전략

```typescript
// shared/types.ts - 공유 타입 (패키지 또는 경로 alias로 공유)
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResult<T> {
  success: true;
  data: T;
  meta?: { requestId: string; duration: number };
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiResult<T> | ApiError;

// 타입 가드
export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return !response.success;
}

// 공유 유틸리티 타입
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

// monorepo에서의 활용 (tsconfig paths)
// tsconfig.json: { "paths": { "@shared/*": ["../../packages/shared/src/*"] } }
// import type { ApiResponse } from "@shared/types";
```

---

## 5. React 19 + TypeScript 고급 패턴

### 5.1 async Server Components 타입

```typescript
// React 19 Server Components는 async 함수 가능
interface UserPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

// Next.js 15+ App Router Server Component
async function UserPage({ params, searchParams }: UserPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const user = await fetchUser(id);

  return (
    <div>
      <h1>{user.name}</h1>
      {tab === "posts" && <UserPosts userId={id} />}
    </div>
  );
}

// async Server Component의 타입 정의
async function UserPosts({ userId }: { userId: string }) {
  const posts = await db.post.findMany({ where: { authorId: userId } });

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

export default UserPage;
```

### 5.2 Server Actions 타입 패턴

```typescript
"use server";

import { z } from "zod";

// Server Action에 Zod 검증을 결합한 패턴
const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

interface ActionState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

export async function updateProfile(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateProfileSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await db.user.update({
      where: { id: getCurrentUserId() },
      data: parsed.data,
    });
    return { success: true, message: "Profile updated" };
  } catch {
    return { success: false, message: "Failed to update profile" };
  }
}
```

```typescript
"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";

function ProfileForm() {
  const [state, formAction, isPending] = useActionState(updateProfile, {
    success: false,
    message: "",
  });

  return (
    <form action={formAction}>
      <input name="name" />
      {state.errors?.name && <p>{state.errors.name[0]}</p>}

      <textarea name="bio" />
      {state.errors?.bio && <p>{state.errors.bio[0]}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>

      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```

### 5.3 Polymorphic 컴포넌트 (ref 포함)

```typescript
import { type ComponentPropsWithRef, type ElementType, forwardRef } from "react";

// Polymorphic 컴포넌트의 핵심 타입
type PolymorphicProps<E extends ElementType, Props = {}> = Props &
  Omit<ComponentPropsWithRef<E>, keyof Props | "as"> & {
    as?: E;
  };

// ref를 포함한 Polymorphic 컴포넌트
type ButtonProps<E extends ElementType = "button"> = PolymorphicProps<
  E,
  {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
  }
>;

type ButtonComponent = <E extends ElementType = "button">(
  props: ButtonProps<E>,
) => React.ReactElement | null;

const Button: ButtonComponent = forwardRef(function Button<
  E extends ElementType = "button",
>(
  { as, variant = "primary", size = "md", isLoading, children, ...rest }: ButtonProps<E>,
  ref: React.Ref<Element>,
) {
  const Component = as || "button";
  return (
    <Component ref={ref} data-variant={variant} data-size={size} {...rest}>
      {isLoading ? "Loading..." : children}
    </Component>
  );
}) as ButtonComponent;

// 사용
<Button variant="primary">Click me</Button>                          // button
<Button as="a" href="/about" variant="ghost">About</Button>          // a 태그
<Button as="link" to="/dashboard" variant="secondary">Dashboard</Button>
// 각각의 경우 해당 요소의 props가 자동 완성됨
```

### 5.4 Compound Component 타입 패턴

```typescript
import { createContext, useContext, useState, type ReactNode } from "react";

// Compound Component 패턴: Tabs 예시
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs compound component must be used within <Tabs>");
  }
  return context;
}

// Root
interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  onChange?: (tab: string) => void;
}

function Tabs({ defaultTab, children, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const handleChange = (tab: string) => {
    setActiveTab(tab);
    onChange?.(tab);
  };
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleChange }}>
      <div role="tablist">{children}</div>
    </TabsContext.Provider>
  );
}

// Sub-components
interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}

function Tab({ value, children, disabled }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return <div role="tabpanel">{children}</div>;
}

// Namespace export
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export { Tabs };

// 사용
function App() {
  return (
    <Tabs defaultTab="overview" onChange={(tab) => console.log(tab)}>
      <Tabs.Tab value="overview">Overview</Tabs.Tab>
      <Tabs.Tab value="settings">Settings</Tabs.Tab>
      <Tabs.Tab value="billing" disabled>Billing</Tabs.Tab>

      <Tabs.Panel value="overview">Overview content</Tabs.Panel>
      <Tabs.Panel value="settings">Settings content</Tabs.Panel>
    </Tabs>
  );
}
```

---

## 6. 런타임 검증과 타입 통합

### 6.1 Zod vs Valibot vs ArkType 비교 (2026)

| 항목 | Zod | Valibot | ArkType |
|------|-----|---------|---------|
| **번들 사이즈** | ~57KB (min) | ~6KB (사용분만) | ~30KB |
| **Tree-shaking** | 제한적 | 완벽 (함수 기반) | 부분 지원 |
| **성능 (파싱)** | 기준선 | ~2x 빠름 | ~5x 빠름 |
| **API 스타일** | 메서드 체이닝 | 파이프 기반 | 문자열 DSL |
| **TypeScript 추론** | 우수 | 우수 | 최상 (1:1 매핑) |
| **에코시스템** | 최대 (tRPC, react-hook-form) | 성장 중 | 초기 |
| **러닝 커브** | 낮음 | 낮음 | 중간 |
| **추천 시나리오** | 범용, 에코시스템 중요 | 번들 사이즈 민감 | 최대 성능 필요 |

```typescript
// Zod: 가장 넓은 에코시스템
import { z } from "zod";
const ZodUser = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive(),
});

// Valibot: 최소 번들 사이즈 (함수형 API)
import * as v from "valibot";
const ValibotUser = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
  age: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

// ArkType: 최대 성능 + TypeScript에 가장 가까운 문법
import { type } from "arktype";
const ArkUser = type({
  name: "string > 0",
  email: "string.email",
  age: "integer > 0",
});
```

### 6.2 Effect-TS 타입 시스템

Effect-TS는 함수형 프로그래밍 기반의 강력한 타입 시스템을 제공한다. 에러 타입, 의존성, 성공 타입을 모두 타입 레벨에서 추적한다.

```typescript
import { Effect, pipe, Schema } from "effect";

// Effect<Success, Error, Requirements>
// 세 가지 타입 파라미터로 부수 효과를 완전히 추적

// Schema: Effect의 내장 검증 라이브러리
class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.NonEmptyString,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  age: Schema.Int.pipe(Schema.positive()),
}) {}

// 에러 타입이 자동으로 추적됨
class DatabaseError extends Schema.TaggedError<DatabaseError>()("DatabaseError", {
  message: Schema.String,
}) {}

class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  entityId: Schema.String,
}) {}

// Effect를 사용한 서비스 정의
const findUser = (id: string): Effect.Effect<User, DatabaseError | NotFoundError> =>
  pipe(
    Effect.tryPromise({
      try: () => db.user.findUnique({ where: { id } }),
      catch: () => new DatabaseError({ message: "DB connection failed" }),
    }),
    Effect.flatMap((user) =>
      user
        ? Effect.succeed(user as User)
        : Effect.fail(new NotFoundError({ entityId: id })),
    ),
  );

// 에러 처리: 각 에러 타입별로 분기
const program = pipe(
  findUser("user-123"),
  Effect.catchTag("NotFoundError", (e) =>
    Effect.succeed({ fallback: true, id: e.entityId }),
  ),
  // 이 시점에서 에러 타입은 DatabaseError만 남음
);
```

### 6.3 환경 변수 타입 안전 검증

```typescript
import { z } from "zod";

// 환경 변수 스키마 정의
const envSchema = z.object({
  // 서버 전용
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),

  // 공개 (클라이언트 접근 가능)
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]),

  // 숫자형 환경 변수
  PORT: z.coerce.number().default(3000),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),

  // 불리언 환경 변수
  ENABLE_CACHE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
});

// 타입 추론
type Env = z.infer<typeof envSchema>;

// 검증 함수: 앱 시작 시 호출
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

// 전역 접근 (타입 안전)
export const env = validateEnv();

// 사용
// env.DATABASE_URL   // string (검증됨)
// env.PORT           // number (자동 변환됨)
// env.ENABLE_CACHE   // boolean (자동 변환됨)

// Next.js의 경우 클라이언트/서버 분리
const clientEnvSchema = envSchema.pick({
  NEXT_PUBLIC_API_URL: true,
  NEXT_PUBLIC_APP_ENV: true,
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});
```

---

## 7. 성능 & DX 최적화

### 7.1 tsconfig 2026 최적 설정

```jsonc
// tsconfig.json - 2026 권장 설정
{
  "compilerOptions": {
    // 타입 검사 강화
    "strict": true,
    "noUncheckedIndexedAccess": true,     // 인덱스 접근 시 undefined 가능성 체크
    "exactOptionalPropertyTypes": true,    // optional과 undefined 구분
    "noPropertyAccessFromIndexSignature": true,  // 인덱스 시그니처 dot 접근 금지

    // 모듈 시스템
    "module": "node16",                    // ESM + CJS 호환
    "moduleResolution": "node16",
    "verbatimModuleSyntax": true,          // import type 강제
    "isolatedModules": true,               // 트랜스파일러 호환

    // 빌드 최적화
    "target": "es2023",
    "lib": ["es2023", "dom", "dom.iterable"],
    "incremental": true,                   // 증분 빌드
    "tsBuildInfoFile": "./node_modules/.cache/tsconfig.tsbuildinfo",

    // 2026 신규 기능
    "erasableSyntaxOnly": true,            // Node.js 네이티브 실행 호환
    "isolatedDeclarations": true,          // 병렬 선언 파일 생성

    // 출력
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,                // IDE go-to-definition 지원
    "sourceMap": true,

    // 경로
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./packages/shared/src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 7.2 Project References & incremental 빌드

monorepo에서 패키지 간 의존 관계를 선언하여 변경된 패키지만 재빌드한다.

```jsonc
// tsconfig.json (루트)
{
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/server" },
    { "path": "./packages/client" }
  ],
  "files": []
}

// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,        // Project References 필수
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}

// packages/server/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../shared" }   // shared 패키지 의존
  ],
  "include": ["src/**/*.ts"]
}
```

```bash
# 변경된 프로젝트만 빌드
tsc --build --watch

# 클린 빌드
tsc --build --clean

# 빌드 정보 확인
tsc --build --verbose
```

### 7.3 ESLint flat config + typescript-eslint v8

```typescript
// eslint.config.ts (ESLint 9+ flat config)
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // 전역 무시 패턴
  { ignores: ["dist/", "node_modules/", "*.config.*"] },

  // 기본 규칙
  eslint.configs.recommended,

  // TypeScript 권장 규칙 (타입 기반)
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // 타입 기반 규칙에 필요한 파서 설정
  {
    languageOptions: {
      parserOptions: {
        projectService: true,           // v8: 자동 tsconfig 감지
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 프로젝트별 규칙 커스터마이징
  {
    rules: {
      // 타입 안전성
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-return": "error",

      // 코드 품질
      "@typescript-eslint/no-floating-promises": "error",  // await 누락 방지
      "@typescript-eslint/no-misused-promises": "error",   // Promise 잘못된 사용
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/strict-boolean-expressions": "warn",

      // 네이밍
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["UPPER_CASE"] },
        {
          selector: "variable",
          modifiers: ["const", "exported"],
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
        },
      ],
    },
  },

  // 테스트 파일은 규칙 완화
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
);
```

### 7.4 Biome 2.0 통합

Biome는 ESLint + Prettier를 대체하는 Rust 기반 통합 도구다. 속도가 10~100배 빠르다.

```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "warn",
          "options": { "maxAllowedComplexity": 15 }
        }
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noConsoleLog": "warn"
      },
      "style": {
        "useConst": "error",
        "noNonNullAssertion": "warn"
      },
      "nursery": {
        "useSortedClasses": "warn"
      }
    }
  },
  "overrides": [
    {
      "include": ["**/*.test.ts", "**/*.spec.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"
          }
        }
      }
    }
  ]
}
```

```jsonc
// package.json - Biome 스크립트
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "ci:lint": "biome ci ."
  }
}
```

---

## 참고 자료

- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [TypeScript 5.8 릴리스 노트](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)
- [tRPC 공식 문서](https://trpc.io/docs)
- [ts-rest 공식 문서](https://ts-rest.com)
- [Zod 공식 문서](https://zod.dev)
- [Valibot 공식 문서](https://valibot.dev)
- [ArkType 공식 문서](https://arktype.io)
- [Effect-TS 공식 문서](https://effect.website)
- [Biome 공식 문서](https://biomejs.dev)
- [typescript-eslint v8](https://typescript-eslint.io)
- [Prisma 공식 문서](https://www.prisma.io/docs)
