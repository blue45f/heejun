# TypeScript 심화 가이드 (2026)

## 목차
1. [AI 시대의 TypeScript](#ai-시대의-typescript)
2. [TypeScript 5.8+ 최신 기능 심화](#typescript-58-최신-기능-심화)
3. [타입 레벨 프로그래밍 마스터클래스](#타입-레벨-프로그래밍-마스터클래스)
4. [Full-Stack 타입 안전성](#full-stack-타입-안전성)
5. [React 19 + TypeScript 고급 패턴](#react-19--typescript-고급-패턴)
6. [런타임 검증과 타입 통합](#런타임-검증과-타입-통합)
7. [성능 & DX 최적화](#성능--dx-최적화)
8. [참고 자료](#참고-자료)

---

## AI 시대의 TypeScript

### AI 코드 어시스턴트와 TypeScript 타입 시스템 시너지

AI 코드 어시스턴트(GitHub Copilot, Claude 등)는 타입 정보가 풍부할수록 정확한 코드를 생성한다. TypeScript의 타입 시스템은 AI에게 강력한 컨텍스트를 제공하는 도구다.

```typescript
// 타입이 빈약한 경우 - AI가 의도를 파악하기 어려움
function process(data: any) {
  return data.map((item: any) => item.value);
}

// 타입이 풍부한 경우 - AI가 정확한 코드를 생성
interface SensorReading {
  /** 센서 고유 식별자 (예: "temp-001") */
  sensorId: string;
  /** 측정값 (섭씨 온도) */
  value: number;
  /** ISO 8601 형식 타임스탬프 */
  timestamp: string;
  /** 측정 신뢰도 (0-1 범위) */
  confidence: number;
}

function processSensorData(readings: SensorReading[]): {
  averageValue: number;
  highConfidenceCount: number;
} {
  const highConfidence = readings.filter(r => r.confidence > 0.9);
  const avg = readings.reduce((sum, r) => sum + r.value, 0) / readings.length;
  return { averageValue: avg, highConfidenceCount: highConfidence.length };
}
```

**핵심 원칙**: 타입을 더 명확하게 작성할수록 AI 어시스턴트가 생성하는 코드의 품질이 비례하여 높아진다.

### AI가 생성한 코드의 타입 안전성 검증 전략

AI가 생성한 코드는 런타임 에러를 포함할 수 있다. 타입 시스템을 방어 계층으로 활용하는 전략이 중요하다.

```typescript
// 1단계: strict 모드를 최대한 활용
// tsconfig.json에서 아래 옵션을 모두 활성화
// "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true

// 2단계: AI 생성 코드에 대한 타입 검증 래퍼
type Validator<T> = {
  validate: (input: unknown) => input is T;
  parse: (input: unknown) => T;
};

function createValidator<T>(guard: (input: unknown) => input is T): Validator<T> {
  return {
    validate: guard,
    parse(input: unknown): T {
      if (!guard(input)) {
        throw new TypeError(`Validation failed: ${JSON.stringify(input)}`);
      }
      return input;
    },
  };
}

// 3단계: AI 생성 함수를 타입 안전 래퍼로 감싸기
function withTypeCheck<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  returnValidator: Validator<TReturn>,
): (...args: TArgs) => TReturn {
  return (...args: TArgs) => {
    const result = fn(...args);
    return returnValidator.parse(result);
  };
}
```

### JSDoc + TypeScript로 AI 컨텍스트 최적화

JSDoc 주석은 AI 어시스턴트에게 의도와 제약 조건을 전달하는 가장 효과적인 수단이다.

```typescript
/**
 * 주문 금액을 계산한다.
 *
 * @description
 * - 할인율은 0-100 범위의 정수만 허용
 * - 세금은 주문 금액에서 할인 적용 후 계산
 * - 최종 금액이 0 미만이면 0을 반환
 *
 * @example
 * ```ts
 * calculateOrderTotal({ subtotal: 10000, discountPercent: 10, taxRate: 0.1 })
 * // => { subtotal: 10000, discount: 1000, tax: 900, total: 9900 }
 * ```
 */
function calculateOrderTotal(params: {
  /** 상품 합계 금액 (원) */
  subtotal: number;
  /** 할인율 (0-100) */
  discountPercent: number;
  /** 세율 (0-1 범위, 예: 0.1 = 10%) */
  taxRate: number;
}): {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
} {
  const { subtotal, discountPercent, taxRate } = params;
  const discount = Math.round(subtotal * (discountPercent / 100));
  const afterDiscount = subtotal - discount;
  const tax = Math.round(afterDiscount * taxRate);
  const total = Math.max(0, afterDiscount + tax);
  return { subtotal, discount, tax, total };
}
```

### Zod/Valibot 스키마에서 타입 자동 추론 (AI API 응답 검증)

AI API(OpenAI, Claude 등)의 응답을 런타임에 검증하면서 타입을 자동 추론하는 패턴이다.

```typescript
import { z } from 'zod';

// AI API 응답 스키마 정의 - 타입이 자동으로 추론됨
const AIAnalysisSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()).min(1),
  summary: z.string().max(500),
  categories: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(1),
  })),
});

// 스키마에서 타입 자동 추론
type AIAnalysis = z.infer<typeof AIAnalysisSchema>;
// {
//   sentiment: "positive" | "negative" | "neutral";
//   confidence: number;
//   keywords: string[];
//   summary: string;
//   categories: { name: string; score: number }[];
// }

// AI API 호출 + 런타임 검증
async function analyzeText(text: string): Promise<AIAnalysis> {
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const raw = await response.json();

  // 런타임 검증 - 스키마와 불일치하면 ZodError 발생
  const validated = AIAnalysisSchema.parse(raw);
  return validated; // 타입이 AIAnalysis로 보장됨
}

// Valibot 방식 (번들 크기 최적화)
import * as v from 'valibot';

const AIAnalysisValibotSchema = v.object({
  sentiment: v.picklist(['positive', 'negative', 'neutral']),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  keywords: v.pipe(v.array(v.string()), v.minLength(1)),
  summary: v.pipe(v.string(), v.maxLength(500)),
});

type AIAnalysisValibot = v.InferOutput<typeof AIAnalysisValibotSchema>;
```

---

## TypeScript 5.8+ 최신 기능 심화

### `erasableSyntaxOnly` 모드와 Node.js 네이티브 TS 실행

TypeScript 5.8에서 도입된 `erasableSyntaxOnly`는 Node.js의 `--experimental-strip-types`와 완벽히 호환되는 코드만 허용한다. 타입 구문을 단순 제거(erasure)하는 것만으로 유효한 JavaScript가 되어야 한다.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "erasableSyntaxOnly": true
  }
}
```

```typescript
// 허용되는 구문 (erasable)
type User = { name: string; age: number };
interface Config { debug: boolean }
function greet(name: string): string { return `Hello, ${name}`; }
const value = someValue as string;

// 금지되는 구문 (non-erasable) - 제거만으로는 의미가 바뀜
enum Direction { Up, Down, Left, Right }  // 에러: enum은 런타임 코드를 생성
namespace MyApp { export const version = '1.0'; }  // 에러: 값을 가진 namespace

// 대안: const enum 또는 union 타입 사용
// const enum은 erasable (인라인 치환됨)
const enum Direction { Up, Down, Left, Right }

// 또는 union 타입으로 대체 (권장)
type Direction = 'up' | 'down' | 'left' | 'right';
```

```bash
# Node.js 22.6+ 에서 TypeScript 직접 실행
node --experimental-strip-types app.ts

# Node.js 23+ 에서는 플래그 없이도 가능 (안정화)
node app.ts
```

### `isolatedDeclarations` 모드

`isolatedDeclarations`는 각 파일이 독립적으로 `.d.ts`를 생성할 수 있도록 강제한다. 다른 파일의 타입 정보 없이도 선언 파일을 만들 수 있어야 하므로, 내보내는 함수와 변수에 명시적 타입 어노테이션이 필요하다.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "isolatedDeclarations": true,
    "declaration": true
  }
}
```

```typescript
// 에러: 반환 타입을 명시해야 함
export function add(a: number, b: number) {
  return a + b;
}

// 수정: 반환 타입 명시
export function add(a: number, b: number): number {
  return a + b;
}

// 에러: 내보내는 변수의 타입을 추론에 의존할 수 없음
export const config = {
  port: 3000,
  host: 'localhost',
};

// 수정: 타입을 명시하거나 as const 사용
export const config: { port: number; host: string } = {
  port: 3000,
  host: 'localhost',
};

// 또는 satisfies + as const 조합
export const config = {
  port: 3000,
  host: 'localhost',
} as const satisfies { port: number; host: string };
```

**장점**: 병렬 빌드 도구(swc, oxc, esbuild)가 개별 파일에서 `.d.ts`를 생성할 수 있어 빌드 속도가 크게 향상된다.

### `--noCheck` 플래그로 빌드 성능 최적화

`--noCheck`를 사용하면 타입 체크를 생략하고 emit(변환)만 수행한다. CI에서 빌드와 타입 체크를 분리하여 전체 파이프라인 속도를 높일 수 있다.

```bash
# 빌드만 수행 (타입 체크 생략) - 빠름
tsc --noCheck --outDir dist

# 타입 체크만 수행 (emit 생략) - 별도 단계
tsc --noEmit

# CI 파이프라인 예시: 병렬 실행으로 시간 단축
# Step 1 (병렬): 빌드 + 타입 체크
tsc --noCheck --outDir dist &   # 빌드 (빠름)
tsc --noEmit &                  # 타입 체크 (별도)
wait
```

```jsonc
// tsconfig.build.json - 빌드 전용 설정
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noCheck": true,
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true
  }
}
```

### Resolution 모드 개선사항

TypeScript 5.8+에서는 모듈 해석이 더욱 정교해졌다. `require()` 호출에서도 ESM 모듈을 올바르게 처리한다.

```typescript
// 타입 임포트에서 resolution 모드 명시
import type { Config } from './config' with { 'resolution-mode': 'import' };
import type { Legacy } from './legacy' with { 'resolution-mode': 'require' };

// package.json의 exports 필드와 연동
// {
//   "exports": {
//     ".": {
//       "import": "./dist/esm/index.js",
//       "require": "./dist/cjs/index.cjs"
//     }
//   }
// }
```

```jsonc
// tsconfig.json - 2026 권장 모듈 설정
{
  "compilerOptions": {
    "module": "NodeNext",             // Node.js ESM/CJS 듀얼 지원
    "moduleResolution": "NodeNext",   // package.json exports 완전 지원
    // 또는 번들러 사용 시:
    "module": "ESNext",
    "moduleResolution": "Bundler"     // Vite, esbuild, webpack 5+
  }
}
```

---

## 타입 레벨 프로그래밍 마스터클래스

### Recursive Conditional Types 실전 패턴

재귀적 조건부 타입을 사용하면 복잡한 타입 변환을 구현할 수 있다.

```typescript
// 깊은 중첩 객체를 모두 Readonly로 변환
type DeepReadonly<T> =
  T extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

interface NestedConfig {
  db: {
    host: string;
    credentials: {
      username: string;
      password: string;
    };
  };
  features: string[];
}

type FrozenConfig = DeepReadonly<NestedConfig>;
// {
//   readonly db: {
//     readonly host: string;
//     readonly credentials: {
//       readonly username: string;
//       readonly password: string;
//     };
//   };
//   readonly features: ReadonlyArray<string>;
// }

// 깊은 Partial
type DeepPartial<T> =
  T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

// 점 표기법 경로 추출 (예: "db.credentials.username")
type DotPath<T, Prefix extends string = ''> =
  T extends object
    ? {
        [K in keyof T & string]:
          | `${Prefix}${K}`
          | DotPath<T[K], `${Prefix}${K}.`>
      }[keyof T & string]
    : never;

type ConfigPaths = DotPath<NestedConfig>;
// "db" | "db.host" | "db.credentials" | "db.credentials.username"
// | "db.credentials.password" | "features"

// 점 표기법으로 값 타입 추출
type GetByPath<T, P extends string> =
  P extends `${infer Head}.${infer Tail}`
    ? Head extends keyof T
      ? GetByPath<T[Head], Tail>
      : never
    : P extends keyof T
      ? T[P]
      : never;

type HostType = GetByPath<NestedConfig, 'db.host'>; // string
type CredType = GetByPath<NestedConfig, 'db.credentials'>; // { username: string; password: string }
```

### Variadic Tuple Types 고급 활용

가변 길이 튜플 타입을 활용한 타입 안전한 유틸리티 함수 패턴이다.

```typescript
// 타입 안전한 pipe 함수
type PipeFunction<In, Out> = (input: In) => Out;

function pipe<A>(value: A): A;
function pipe<A, B>(value: A, fn1: PipeFunction<A, B>): B;
function pipe<A, B, C>(value: A, fn1: PipeFunction<A, B>, fn2: PipeFunction<B, C>): C;
function pipe<A, B, C, D>(
  value: A,
  fn1: PipeFunction<A, B>,
  fn2: PipeFunction<B, C>,
  fn3: PipeFunction<C, D>,
): D;
function pipe(value: unknown, ...fns: Function[]) {
  return fns.reduce((acc, fn) => fn(acc), value);
}

const result = pipe(
  '  Hello, World!  ',
  (s: string) => s.trim(),
  (s: string) => s.toLowerCase(),
  (s: string) => s.split(' '),
);
// result: string[] = ["hello,", "world!"]

// 튜플 연결
type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B];
type AB = Concat<[1, 2], [3, 4]>; // [1, 2, 3, 4]

// 튜플의 첫 번째 / 나머지 분리
type Head<T extends unknown[]> = T extends [infer H, ...unknown[]] ? H : never;
type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : [];

type First = Head<[string, number, boolean]>; // string
type Rest = Tail<[string, number, boolean]>;  // [number, boolean]

// 튜플 길이 기반 타입 가드
type HasMinLength<T extends unknown[], N extends number> =
  T['length'] extends N ? true :
  T extends [unknown, ...infer Rest] ? HasMinLength<Rest, N> : false;

// 타입 안전한 zip 함수
function zip<A extends unknown[], B extends unknown[]>(
  a: [...A],
  b: [...B],
): { [K in keyof A]: K extends keyof B ? [A[K], B[K]] : never } {
  return a.map((val, i) => [val, b[i]]) as any;
}

const zipped = zip([1, 'a'] as [number, string], [true, 42] as [boolean, number]);
// 타입: [number, boolean], [string, number]]
```

### Key Remapping via `as` clause

Mapped Types에서 `as`를 사용한 키 재매핑으로 강력한 타입 변환을 구현한다.

```typescript
// Getter 타입 자동 생성
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
  email: string;
}

type PersonGetters = Getters<Person>;
// {
//   getName: () => string;
//   getAge: () => number;
//   getEmail: () => string;
// }

// 특정 타입의 프로퍼티만 필터링
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type StringProps = OnlyStrings<Person>;
// { name: string; email: string }

// 이벤트 핸들러 타입 생성
type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}Change`]: (newValue: T[K]) => void;
};

type PersonEvents = EventHandlers<Person>;
// {
//   onNameChange: (newValue: string) => void;
//   onAgeChange: (newValue: number) => void;
//   onEmailChange: (newValue: string) => void;
// }

// Prefix 제거
type RemovePrefix<T, P extends string> = {
  [K in keyof T as K extends `${P}${infer Rest}` ? Uncapitalize<Rest> : K]: T[K];
};

type ApiResponse = {
  data_userId: string;
  data_userName: string;
  data_email: string;
  meta_total: number;
};

type CleanResponse = RemovePrefix<ApiResponse, 'data_'>;
// { userId: string; userName: string; email: string; meta_total: number }
```

### Type-safe Event Emitter (제네릭 + 오버로딩)

타입 안전한 이벤트 이미터를 제네릭과 조건부 타입으로 구현한다.

```typescript
type EventMap = Record<string, unknown[]>;

type EventKey<T extends EventMap> = string & keyof T;

class TypedEventEmitter<Events extends EventMap> {
  private listeners = new Map<string, Set<Function>>();

  on<K extends EventKey<Events>>(
    event: K,
    handler: (...args: Events[K]) => void,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler);

    // 구독 해제 함수 반환
    return () => {
      handlers.delete(handler);
    };
  }

  emit<K extends EventKey<Events>>(event: K, ...args: Events[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  once<K extends EventKey<Events>>(
    event: K,
    handler: (...args: Events[K]) => void,
  ): void {
    const unsubscribe = this.on(event, ((...args: Events[K]) => {
      unsubscribe();
      handler(...args);
    }) as (...args: Events[K]) => void);
  }
}

// 사용: 이벤트 맵을 제네릭으로 정의
type AppEvents = {
  'user:login': [userId: string, timestamp: Date];
  'user:logout': [userId: string];
  'notification:push': [title: string, body: string, priority: 'low' | 'high'];
  'error': [error: Error, context: Record<string, unknown>];
};

const emitter = new TypedEventEmitter<AppEvents>();

// 모든 인수의 타입이 자동 추론됨
emitter.on('user:login', (userId, timestamp) => {
  // userId: string, timestamp: Date
  console.log(`${userId} logged in at ${timestamp.toISOString()}`);
});

emitter.emit('user:login', 'user-123', new Date()); // 정상
// emitter.emit('user:login', 123); // 에러: number는 string에 할당 불가
// emitter.emit('user:login', 'user-123'); // 에러: timestamp 인수 누락
```

### HKT(Higher-Kinded Types) 시뮬레이션

TypeScript는 Higher-Kinded Types를 직접 지원하지 않지만, 인터페이스 확장 패턴으로 시뮬레이션할 수 있다.

```typescript
// HKT 시뮬레이션을 위한 기반 인터페이스
interface HKT {
  readonly _URI: string;
  readonly _A: unknown;
}

// URI -> 구체 타입 매핑을 위한 레지스트리
interface URItoKind<A> {}

// URI에서 구체 타입 추출
type Kind<URI extends keyof URItoKind<unknown>, A> = URItoKind<A>[URI];

// Option 타입 정의
type Option<A> = { tag: 'none' } | { tag: 'some'; value: A };

// 레지스트리에 등록
interface URItoKind<A> {
  Option: Option<A>;
}

// Array 등록
interface URItoKind<A> {
  Array: A[];
}

// Functor 타입 클래스
interface Functor<F extends keyof URItoKind<unknown>> {
  map: <A, B>(fa: Kind<F, A>, f: (a: A) => B) => Kind<F, B>;
}

// Option의 Functor 인스턴스
const optionFunctor: Functor<'Option'> = {
  map: <A, B>(fa: Option<A>, f: (a: A) => B): Option<B> => {
    if (fa.tag === 'none') return { tag: 'none' };
    return { tag: 'some', value: f(fa.value) };
  },
};

// Array의 Functor 인스턴스
const arrayFunctor: Functor<'Array'> = {
  map: <A, B>(fa: A[], f: (a: A) => B): B[] => fa.map(f),
};

// Functor를 사용하는 제네릭 함수
function doubleAll<F extends keyof URItoKind<unknown>>(
  functor: Functor<F>,
  fa: Kind<F, number>,
): Kind<F, number> {
  return functor.map(fa, n => n * 2);
}

const doubled = doubleAll(arrayFunctor, [1, 2, 3]); // [2, 4, 6]
const doubledOpt = doubleAll(optionFunctor, { tag: 'some', value: 5 }); // { tag: 'some', value: 10 }
```

---

## Full-Stack 타입 안전성

### tRPC 타입 안전 API 계층

tRPC를 사용하면 서버와 클라이언트 사이에 API 스키마 없이 완전한 타입 안전성을 확보할 수 있다.

```typescript
// server/trpc.ts - tRPC 라우터 정의
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.context<{ userId?: string }>().create();

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { userId: ctx.userId } });
});

const protectedProcedure = t.procedure.use(isAuthed);

export const appRouter = t.router({
  user: t.router({
    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input, ctx }) => {
        // input.id: string (자동 추론)
        // ctx.userId: string (미들웨어에서 보장)
        const user = await db.user.findUnique({ where: { id: input.id } });
        if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
        return user;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.user.update({
          where: { id: input.id },
          data: { name: input.name, email: input.email },
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
          nextCursor: hasMore ? items[items.length - 1].id : undefined,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

```typescript
// client/trpc.ts - 클라이언트에서 사용
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/trpc';

export const trpc = createTRPCReact<AppRouter>();

// 컴포넌트에서 사용 - 모든 타입이 서버에서 자동 추론
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = trpc.user.getById.useQuery({ id: userId });
  // user의 타입이 서버의 반환 타입에서 자동 추론

  const updateMutation = trpc.user.update.useMutation();

  const handleUpdate = (name: string) => {
    updateMutation.mutate({
      id: userId,
      name, // 타입 안전: string만 허용
    });
  };

  if (isLoading) return <div>Loading...</div>;
  return <div>{user?.name}</div>;
}
```

### Prisma + TypeScript 타입 동기화

Prisma는 스키마에서 TypeScript 타입을 자동 생성하여 DB 계층부터 API까지 타입 안전성을 보장한다.

```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(MEMBER)
  posts     Post[]
  profile   Profile?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  tags      Tag[]
}

enum Role {
  ADMIN
  MEMBER
  GUEST
}
```

```typescript
// Prisma가 생성한 타입을 활용
import { Prisma, type User, type Post, type Role } from '@prisma/client';

// 관계를 포함한 타입 생성
type UserWithPosts = Prisma.UserGetPayload<{
  include: { posts: true; profile: true };
}>;
// {
//   id: string; email: string; name: string | null; role: Role;
//   posts: Post[]; profile: Profile | null;
//   createdAt: Date; updatedAt: Date;
// }

// select로 부분 타입 생성
type UserSummary = Prisma.UserGetPayload<{
  select: { id: true; email: true; name: true; role: true };
}>;
// { id: string; email: string; name: string | null; role: Role }

// 입력 타입 활용
type CreateUserInput = Prisma.UserCreateInput;
type UpdateUserInput = Prisma.UserUpdateInput;

// 서비스 레이어에서 타입 안전한 쿼리
async function getPublishedPostsByUser(userId: string): Promise<Post[]> {
  return prisma.post.findMany({
    where: {
      authorId: userId,
      published: true,  // boolean만 허용
    },
    orderBy: {
      createdAt: 'desc', // 'asc' | 'desc'만 허용
    },
  });
}
```

### Zodios/ts-rest로 REST API 타입 안전성

REST API에서도 계약 기반(contract-first) 접근으로 타입 안전성을 확보할 수 있다.

```typescript
// ts-rest 방식: API 계약 정의
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'guest']),
});

const CreateUserSchema = UserSchema.omit({ id: true });

export const apiContract = c.router({
  users: {
    getAll: {
      method: 'GET',
      path: '/api/users',
      query: z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
      }),
      responses: {
        200: z.object({
          users: z.array(UserSchema),
          total: z.number(),
        }),
      },
    },
    getById: {
      method: 'GET',
      path: '/api/users/:id',
      pathParams: z.object({ id: z.string() }),
      responses: {
        200: UserSchema,
        404: z.object({ message: z.string() }),
      },
    },
    create: {
      method: 'POST',
      path: '/api/users',
      body: CreateUserSchema,
      responses: {
        201: UserSchema,
        400: z.object({ errors: z.array(z.string()) }),
      },
    },
  },
});
```

```typescript
// 서버: 계약을 구현 (Express + ts-rest)
import { createExpressEndpoints, initServer } from '@ts-rest/express';
import { apiContract } from './contract';

const s = initServer();

const router = s.router(apiContract, {
  users: {
    getAll: async ({ query }) => {
      // query.page: number, query.limit: number (자동 추론)
      const users = await db.user.findMany({
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });
      return { status: 200, body: { users, total: await db.user.count() } };
    },
    getById: async ({ params }) => {
      const user = await db.user.findUnique({ where: { id: params.id } });
      if (!user) return { status: 404 as const, body: { message: 'Not found' } };
      return { status: 200 as const, body: user };
    },
    create: async ({ body }) => {
      // body의 타입이 CreateUserSchema에서 자동 추론
      const user = await db.user.create({ data: body });
      return { status: 201 as const, body: user };
    },
  },
});

createExpressEndpoints(apiContract, router, app);
```

```typescript
// 클라이언트: 동일한 계약으로 타입 안전한 호출
import { initClient } from '@ts-rest/core';
import { apiContract } from './contract';

const client = initClient(apiContract, {
  baseUrl: 'http://localhost:3000',
  baseHeaders: { Authorization: `Bearer ${token}` },
});

// 모든 요청/응답 타입이 계약에서 추론
const { status, body } = await client.users.getAll({
  query: { page: 1, limit: 10 },
});

if (status === 200) {
  body.users.forEach(user => {
    console.log(user.name); // string으로 추론
  });
}
```

### Server/Client 공유 타입 전략

모노레포에서 서버와 클라이언트 간 타입을 공유하는 실전 패턴이다.

```typescript
// packages/shared/src/types.ts - 공유 타입 패키지
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type UserRole = 'admin' | 'member' | 'guest';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// API 엔드포인트 타입 매핑
export interface ApiEndpoints {
  'GET /users': {
    query: { page?: number; limit?: number; role?: UserRole };
    response: PaginatedResponse<User>;
  };
  'GET /users/:id': {
    params: { id: string };
    response: User;
  };
  'POST /users': {
    body: Omit<User, 'id'>;
    response: User;
  };
  'PATCH /users/:id': {
    params: { id: string };
    body: Partial<Omit<User, 'id'>>;
    response: User;
  };
}

// 엔드포인트에서 메서드별 경로 추출
type ExtractPaths<M extends string> = {
  [K in keyof ApiEndpoints]: K extends `${M} ${infer Path}` ? Path : never;
}[keyof ApiEndpoints];

export type GetPaths = ExtractPaths<'GET'>;   // "/users" | "/users/:id"
export type PostPaths = ExtractPaths<'POST'>; // "/users"
```

```typescript
// packages/shared/src/typedFetch.ts - 타입 안전한 fetch 래퍼
import type { ApiEndpoints } from './types';

type EndpointConfig<K extends keyof ApiEndpoints> = ApiEndpoints[K];

export async function typedFetch<K extends keyof ApiEndpoints>(
  endpoint: K,
  ...args: 'body' extends keyof EndpointConfig<K>
    ? [options: { body: EndpointConfig<K> extends { body: infer B } ? B : never }]
    : [options?: { query?: Record<string, string> }]
): Promise<EndpointConfig<K> extends { response: infer R } ? R : never> {
  // 구현...
  const [method, path] = (endpoint as string).split(' ');
  const response = await fetch(path, { method });
  return response.json();
}
```

---

## React 19 + TypeScript 고급 패턴

### Server Components 타입 패턴

React 19의 Server Components에서는 비동기 컴포넌트와 Server Actions를 위한 새로운 타입 패턴이 필요하다.

```typescript
// async Server Component - React 19에서 공식 지원
interface PostPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string }>;
}

// Server Component는 async 함수로 작성 가능
async function PostPage({ params, searchParams }: PostPageProps) {
  const { slug } = await params;
  const { draft } = await searchParams;

  const post = await db.post.findUnique({
    where: { slug, published: draft !== 'true' },
  });

  if (!post) return notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <PostContent content={post.content} />
    </article>
  );
}

// Server Actions 타입 패턴
'use server';

import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

// 액션 결과 타입
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

async function createPost(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.getAll('tags'),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const post = await db.post.create({ data: parsed.data });
  revalidatePath('/posts');
  return { success: true, data: { id: post.id } };
}
```

```typescript
// 클라이언트에서 Server Action 사용
'use client';

import { useActionState } from 'react';

function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" disabled={isPending} />
      {state?.success === false && state.fieldErrors?.title && (
        <p className="error">{state.fieldErrors.title[0]}</p>
      )}
      <textarea name="content" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

### `use()` hook 타입 패턴

React 19의 `use()` hook은 Promise와 Context를 컴포넌트 내부에서 직접 소비할 수 있다.

```typescript
import { use, Suspense } from 'react';

// Promise를 use()로 소비
interface User {
  id: string;
  name: string;
  email: string;
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  // use()는 Promise를 unwrap - Suspense 경계 필요
  const user = use(userPromise);
  // user의 타입은 User로 자동 추론

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// 부모 컴포넌트에서 Promise 전달
function UserPage({ userId }: { userId: string }) {
  // Promise를 생성만 하고 전달 (렌더링 시점에 fetch 시작)
  const userPromise = fetchUser(userId);

  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}

// Context를 use()로 조건부 소비
import { createContext } from 'react';

interface Theme {
  primary: string;
  secondary: string;
  mode: 'light' | 'dark';
}

const ThemeContext = createContext<Theme | null>(null);

function ThemedButton({ override }: { override?: boolean }) {
  // use()는 조건문 안에서도 호출 가능 (useContext와 다른 점)
  if (override) {
    return <button style={{ color: 'red' }}>Override</button>;
  }

  const theme = use(ThemeContext);
  if (!theme) throw new Error('ThemeContext not provided');

  return (
    <button style={{ color: theme.primary }}>
      Themed Button ({theme.mode})
    </button>
  );
}
```

### Polymorphic 컴포넌트 타입 (개선된 패턴)

React 19에서는 `forwardRef` 없이 ref를 props로 받으므로 Polymorphic 패턴이 더 깔끔해진다.

```typescript
import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';

// 개선된 Polymorphic 타입 - ref 포함
type PolymorphicProps<
  C extends ElementType,
  Props = {},
> = Props & {
  as?: C;
  children?: ReactNode;
} & Omit<ComponentPropsWithRef<C>, keyof Props | 'as' | 'children'>;

// 스타일 props 포함 예시
interface BoxOwnProps {
  padding?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

type BoxProps<C extends ElementType = 'div'> = PolymorphicProps<C, BoxOwnProps>;

// React 19: forwardRef 없이 ref를 직접 prop으로 받음
function Box<C extends ElementType = 'div'>({
  as,
  padding,
  rounded,
  ref,
  children,
  className,
  ...rest
}: BoxProps<C>) {
  const Component = as ?? 'div';

  const paddingClass = padding ? `p-${padding}` : '';
  const roundedClass = rounded ? 'rounded' : '';

  return (
    <Component
      ref={ref}
      className={`${paddingClass} ${roundedClass} ${className ?? ''}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  );
}

// 사용
<Box padding="md" rounded>기본 div</Box>
<Box as="section" padding="lg">섹션으로 렌더링</Box>
<Box as="a" href="/home" padding="sm">앵커로 렌더링</Box>
<Box as="button" onClick={() => {}} padding="md">버튼으로 렌더링</Box>
// <Box as="a" disabled /> // 에러: 'a' 요소에 disabled 없음
```

### Compound Component 타입 패턴

관련 컴포넌트를 하나의 네임스페이스로 묶는 Compound Component 패턴이다.

```typescript
import { createContext, use, useState, type ReactNode } from 'react';

// 1. Context 타입 정의
interface AccordionContextValue {
  openItems: Set<string>;
  toggle: (id: string) => void;
  multiple: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext(): AccordionContextValue {
  const ctx = use(AccordionContext);
  if (!ctx) {
    throw new Error('Accordion 하위 컴포넌트는 Accordion 내부에서 사용해야 합니다.');
  }
  return ctx;
}

// 2. 루트 컴포넌트
interface AccordionRootProps {
  children: ReactNode;
  multiple?: boolean;
  defaultOpen?: string[];
}

function AccordionRoot({ children, multiple = false, defaultOpen = [] }: AccordionRootProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));

  const toggle = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <AccordionContext value={{ openItems, toggle, multiple }}>
      <div role="region">{children}</div>
    </AccordionContext>
  );
}

// 3. 하위 컴포넌트
interface AccordionItemProps {
  id: string;
  children: ReactNode;
}

function AccordionItem({ id, children }: AccordionItemProps) {
  return <div data-accordion-item={id}>{children}</div>;
}

interface AccordionTriggerProps {
  id: string;
  children: ReactNode;
}

function AccordionTrigger({ id, children }: AccordionTriggerProps) {
  const { openItems, toggle } = useAccordionContext();
  return (
    <button
      aria-expanded={openItems.has(id)}
      onClick={() => toggle(id)}
    >
      {children}
    </button>
  );
}

interface AccordionContentProps {
  id: string;
  children: ReactNode;
}

function AccordionContent({ id, children }: AccordionContentProps) {
  const { openItems } = useAccordionContext();
  if (!openItems.has(id)) return null;
  return <div role="region">{children}</div>;
}

// 4. Compound Component로 조합
const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});

// 사용
function FAQ() {
  return (
    <Accordion multiple defaultOpen={['faq-1']}>
      <Accordion.Item id="faq-1">
        <Accordion.Trigger id="faq-1">TypeScript란?</Accordion.Trigger>
        <Accordion.Content id="faq-1">
          TypeScript는 JavaScript의 슈퍼셋 언어입니다.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item id="faq-2">
        <Accordion.Trigger id="faq-2">왜 사용하나요?</Accordion.Trigger>
        <Accordion.Content id="faq-2">
          타입 안전성과 개발 생산성을 높여줍니다.
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}
```

### forwardRef 제거 후 ref 패턴

React 19에서는 `forwardRef`가 더 이상 필요하지 않다. ref를 일반 prop으로 받는다.

```typescript
// React 18 (이전 방식) - forwardRef 필요
import { forwardRef } from 'react';

interface InputProps {
  label: string;
  error?: string;
}

const InputOld = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...rest }, ref) => (
    <div>
      <label>{label}</label>
      <input ref={ref} {...rest} />
      {error && <span className="error">{error}</span>}
    </div>
  )
);

// React 19 (새 방식) - ref를 직접 prop으로 받음
interface InputNewProps {
  label: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

function Input({ label, error, ref, ...rest }: InputNewProps) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...rest} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}

// 제네릭 컴포넌트에서도 ref가 자연스럽게 동작
interface ListRef<T> {
  scrollToItem: (item: T) => void;
  getVisibleItems: () => T[];
}

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  ref?: React.Ref<ListRef<T>>;
}

function VirtualList<T>({ items, renderItem, ref }: VirtualListProps<T>) {
  useImperativeHandle(ref, () => ({
    scrollToItem: (item: T) => { /* 구현 */ },
    getVisibleItems: () => items.slice(0, 10),
  }));

  return <div>{items.map(renderItem)}</div>;
}

// 사용
const listRef = useRef<ListRef<User>>(null);
<VirtualList ref={listRef} items={users} renderItem={u => <div>{u.name}</div>} />
```

---

## 런타임 검증과 타입 통합

### Zod vs Valibot vs ArkType 비교 (2026)

| 특성 | Zod | Valibot | ArkType |
|------|-----|---------|---------|
| 번들 크기 | ~14KB | ~1KB (tree-shake) | ~5KB |
| API 스타일 | 메서드 체이닝 | 파이프/함수 조합 | 선언적 문법 |
| 타입 추론 | 우수 | 우수 | 최상 |
| 에러 메시지 | 커스터마이징 가능 | 커스터마이징 가능 | 자동 상세 메시지 |
| 생태계 | 가장 넓음 (tRPC, React Hook Form 등) | 빠르게 성장 중 | 신생 |
| 성능 | 좋음 | 매우 좋음 | 최상 (컴파일 타임 최적화) |

```typescript
// Zod - 가장 널리 쓰이는 선택
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().max(150),
  role: z.enum(['admin', 'member', 'guest']),
  metadata: z.record(z.unknown()).optional(),
});

type User = z.infer<typeof UserSchema>;

// 변환 포함 스키마
const CreateUserSchema = UserSchema.omit({ id: true }).transform(data => ({
  ...data,
  id: crypto.randomUUID(),
  createdAt: new Date(),
}));

type CreateUserInput = z.input<typeof CreateUserSchema>;   // 입력 타입 (id 제외)
type CreateUserOutput = z.output<typeof CreateUserSchema>; // 출력 타입 (id, createdAt 포함)
```

```typescript
// Valibot - 번들 크기 최소화 (tree-shakeable)
import * as v from 'valibot';

const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  email: v.pipe(v.string(), v.email()),
  age: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(150)),
  role: v.picklist(['admin', 'member', 'guest']),
  metadata: v.optional(v.record(v.string(), v.unknown())),
});

type User = v.InferOutput<typeof UserSchema>;

// 사용하지 않는 검증 함수는 번들에서 자동 제거됨
const result = v.safeParse(UserSchema, data);
if (result.success) {
  const user = result.output; // User 타입
} else {
  console.error(result.issues); // 상세 에러 정보
}
```

```typescript
// ArkType - 최고 성능 + 선언적 문법
import { type } from 'arktype';

const User = type({
  id: 'string.uuid',
  name: '1<string<=100',
  email: 'string.email',
  age: '1<integer<=150',
  role: '"admin" | "member" | "guest"',
  'metadata?': 'Record<string, unknown>',
});

type User = typeof User.infer;

// ArkType의 에러 메시지는 자동으로 상세함
const result = User({ id: 'not-uuid', name: '', age: -1, email: 'bad', role: 'unknown' });
if (result instanceof type.errors) {
  console.log(result.summary);
  // id must be a valid UUID (was "not-uuid")
  // name must be more than 1 characters (was "")
  // ...
}
```

### Effect-TS 타입 시스템 활용

Effect-TS는 에러 처리, 의존성 주입, 동시성을 타입 레벨에서 추적하는 함수형 프로그래밍 라이브러리다.

```typescript
import { Effect, pipe, Schema } from 'effect';

// 스키마 정의 (런타임 검증 + 타입 추론)
class User extends Schema.Class<User>('User')({
  id: Schema.String,
  name: Schema.NonEmptyString,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  role: Schema.Literal('admin', 'member', 'guest'),
}) {}

// Effect: 성공 타입(A), 에러 타입(E), 의존성(R)을 모두 추적
class DatabaseError {
  readonly _tag = 'DatabaseError';
  constructor(readonly cause: unknown) {}
}

class NotFoundError {
  readonly _tag = 'NotFoundError';
  constructor(readonly entity: string, readonly id: string) {}
}

interface UserRepository {
  readonly findById: (id: string) => Effect.Effect<User, DatabaseError | NotFoundError>;
  readonly save: (user: User) => Effect.Effect<void, DatabaseError>;
}

// 에러와 의존성이 타입에서 추적됨
const getUserProfile = (userId: string): Effect.Effect<
  { user: User; isAdmin: boolean },  // 성공 타입
  DatabaseError | NotFoundError,      // 에러 타입
  UserRepository                      // 의존성 타입
> =>
  pipe(
    Effect.serviceFunctionEffect(
      Effect.Tag<UserRepository>()('UserRepository'),
      repo => repo.findById,
    )(userId),
    Effect.map(user => ({
      user,
      isAdmin: user.role === 'admin',
    })),
  );
```

### io-ts에서 Zod/Valibot 마이그레이션

io-ts에서 Zod 또는 Valibot으로 마이그레이션하는 실전 패턴이다.

```typescript
// 이전: io-ts
import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';

const UserCodec = t.type({
  id: t.string,
  name: t.string,
  age: t.number,
  email: t.string,
  role: t.union([t.literal('admin'), t.literal('member')]),
});

type UserIoTs = t.TypeOf<typeof UserCodec>;

const result = UserCodec.decode(data);
if (isRight(result)) {
  const user = result.right;
}
```

```typescript
// 이후: Zod (권장 마이그레이션 대상)
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  email: z.string().email(), // 기본 제공 검증
  role: z.enum(['admin', 'member']),
});

type User = z.infer<typeof UserSchema>;

// safeParse는 Either 패턴과 유사하게 동작
const result = UserSchema.safeParse(data);
if (result.success) {
  const user = result.data; // User 타입
} else {
  console.error(result.error.flatten());
}
```

```typescript
// 마이그레이션 도우미: io-ts 코덱을 Zod 스키마로 매핑하는 패턴
// 점진적 마이그레이션 시 두 라이브러리를 병행 사용

// 공통 타입 정의
interface UserShape {
  id: string;
  name: string;
  age: number;
  email: string;
  role: 'admin' | 'member';
}

// 기존 io-ts 코덱과 새 Zod 스키마가 동일한 타입을 보장
type AssertSameType<A, B> = A extends B ? (B extends A ? true : never) : never;

type IoTsUser = t.TypeOf<typeof UserCodec>;
type ZodUser = z.infer<typeof UserSchema>;

// 컴파일 타임에 두 타입이 동일한지 검증
const _typeCheck: AssertSameType<IoTsUser, ZodUser> = true;
```

---

## 성능 & DX 최적화

### tsconfig 최적 설정 2026

```jsonc
// tsconfig.json - 2026 권장 설정
{
  "compilerOptions": {
    // 언어 & 환경
    "target": "ES2024",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",

    // 모듈
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,

    // 엄격한 타입 체크
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // 5.8+ 신규 옵션
    "erasableSyntaxOnly": true,
    "isolatedDeclarations": true,

    // 출력
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // 성능
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    "skipLibCheck": true,

    // 호환성
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,

    // 경로
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "env.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 타입 체크 성능 최적화 (`--incremental`, Project References)

대규모 프로젝트에서 타입 체크 속도를 개선하는 전략이다.

```jsonc
// 1. Incremental 빌드 - 변경된 파일만 재검사
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"  // 빌드 캐시 파일
  }
}
```

```jsonc
// 2. Project References - 모노레포에서 프로젝트 간 의존성 관리
// tsconfig.json (루트)
{
  "files": [],
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/server" },
    { "path": "packages/client" }
  ]
}
```

```jsonc
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,        // Project References 필수
    "declaration": true,      // .d.ts 생성 필수
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

```jsonc
// packages/server/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "references": [
    { "path": "../shared" }   // shared 프로젝트에 의존
  ],
  "include": ["src"]
}
```

```bash
# Project References 빌드 (의존 순서 자동 해석, 병렬 빌드)
tsc --build --verbose

# 변경된 프로젝트만 증분 빌드
tsc --build

# 캐시 초기화 후 전체 재빌드
tsc --build --clean && tsc --build
```

```typescript
// 3. 타입 체크를 느리게 만드는 안티패턴 회피

// 느림: 깊은 재귀 타입
type DeepNested<T, D extends number = 10> = /* 재귀 깊이 제한 없음 */

// 빠름: 재귀 깊이 제한
type DeepNested<T, D extends number[] = []> =
  D['length'] extends 10 ? T :  // 깊이 제한
  T extends object
    ? { [K in keyof T]: DeepNested<T[K], [...D, 0]> }
    : T;

// 느림: 과도한 union 타입
type AllPermutations = /* 수천 개의 union */

// 빠름: 필요한 만큼만 union 사용
type LimitedUnion = 'a' | 'b' | 'c'; // 적절한 크기 유지
```

### ESLint flat config + typescript-eslint v8

2026년 기준 ESLint flat config와 typescript-eslint v8 설정이다.

```typescript
// eslint.config.ts (flat config - ESM)
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 전역 무시 패턴
  { ignores: ['dist/', 'node_modules/', '*.config.*'] },

  // 기본 규칙
  eslint.configs.recommended,

  // TypeScript 권장 규칙 (타입 체크 포함)
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // TypeScript 파서 설정
  {
    languageOptions: {
      parserOptions: {
        projectService: true,         // v8: 자동 tsconfig 탐색
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 프로젝트별 커스텀 규칙
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      // 타입 안전성
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // 코드 품질
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/naming-convention': ['error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],

      // 불필요한 코드 방지
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    },
  },

  // 테스트 파일 규칙 완화
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
);
```

### Biome 린터/포매터 통합

Biome은 Rust로 작성된 초고속 린터/포매터로, ESLint + Prettier를 대체할 수 있다.

```jsonc
// biome.json - 2026 권장 설정
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noBannedTypes": "error",
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
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error",
        "useImportType": "error",
        "useNodejsImportProtocol": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noConfusingVoidType": "error"
      },
      "nursery": {
        "useSortedClasses": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  },
  "files": {
    "ignore": ["node_modules", "dist", ".next", "coverage"]
  },
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  }
}
```

```bash
# Biome 실행
npx @biomejs/biome check .              # 린트 + 포맷 검사
npx @biomejs/biome check --write .      # 자동 수정
npx @biomejs/biome format --write .     # 포맷만 적용
npx @biomejs/biome lint .               # 린트만 실행

# CI에서 사용
npx @biomejs/biome ci .                 # 포맷/린트 검사 (수정 없이 에러만 보고)

# ESLint/Prettier에서 마이그레이션
npx @biomejs/biome migrate eslint       # ESLint 규칙 자동 변환
npx @biomejs/biome migrate prettier     # Prettier 설정 자동 변환
```

```jsonc
// package.json - 스크립트 설정
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
    "ci": "biome ci . && tsc --noEmit"
  }
}
```

---

## 참고 자료

- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [TypeScript 5.8 릴리스 노트](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)
- [Type Challenges](https://github.com/type-challenges/type-challenges) - 타입 레벨 프로그래밍 연습
- [Total TypeScript](https://www.totaltypescript.com/) - Matt Pocock의 TypeScript 심화 강의
- [tRPC 공식 문서](https://trpc.io/docs) - Full-Stack 타입 안전성
- [Zod 공식 문서](https://zod.dev/) - 런타임 검증 라이브러리
- [Valibot 공식 문서](https://valibot.dev/) - 경량 검증 라이브러리
- [ArkType 공식 문서](https://arktype.io/) - 고성능 타입 검증
- [Effect-TS 공식 문서](https://effect.website/) - 함수형 TypeScript
- [Biome 공식 문서](https://biomejs.dev/) - 차세대 린터/포매터
- [ts-rest 공식 문서](https://ts-rest.com/) - REST API 타입 안전성
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/) - React + TS 패턴 모음
