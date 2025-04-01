# TypeScript 심화 가이드 (2026)

## 목차

1. [AI + TypeScript 워크플로우](#1-ai--typescript-워크플로우)
2. [멀티 베타 환경 타입 전략](#2-멀티-베타-환경-타입-전략)
3. [TypeScript 5.8+ 최신 기능](#3-typescript-58-최신-기능)
4. [타입 레벨 프로그래밍](#4-타입-레벨-프로그래밍)
5. [Full-Stack 타입 안전성](#5-full-stack-타입-안전성)
6. [React 19 + TypeScript 패턴](#6-react-19--typescript-패턴)
7. [런타임 검증과 타입 통합](#7-런타임-검증과-타입-통합)
8. [DX 최적화](#8-dx-최적화)

---

## 1. AI + TypeScript 워크플로우

AI 코드 생성 도구가 일상이 된 시점에서, TypeScript의 타입 시스템은 AI 생성 코드의 **품질 보증 장치**로서 결정적인 역할을 한다. 타입이 명확할수록 AI는 더 정확한 코드를 생성하고, 생성된 코드는 타입 체커에 의해 자동으로 검증된다.

### 1.1 Claude Code 타입 생성 프롬프트

#### 프롬프트 1: API 타입 추론

```
프롬프트:
"GET /api/orders/:id 엔드포인트의 응답 타입을 만들어줘.
응답에는 id(number), status('pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'),
items(배열, 각각 productId/name/quantity/price 포함), totalAmount(number),
createdAt/updatedAt(ISO 8601).
에러 응답은 code(string), message(string), field?(string).
Zod 스키마를 단일 소스로 하고 타입을 추론해줘.
fetcher 함수에서 런타임 검증까지 포함."
```

```typescript
import { z } from "zod";

const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const OrderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);

const OrderSchema = z.object({
  id: z.number(),
  status: OrderStatusSchema,
  items: z.array(OrderItemSchema),
  totalAmount: z.number().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

const OrderResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: OrderSchema }),
  z.object({ success: z.literal(false), error: ApiErrorSchema }),
]);

// 스키마에서 타입 추론 (단일 소스)
type Order = z.infer<typeof OrderSchema>;
type OrderItem = z.infer<typeof OrderItemSchema>;
type OrderStatus = z.infer<typeof OrderStatusSchema>;
type ApiError = z.infer<typeof ApiErrorSchema>;

class OrderApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly field?: string,
  ) {
    super(`API Error [${code}]`);
    this.name = "OrderApiError";
  }
}

async function fetchOrder(id: number): Promise<Order> {
  const res = await fetch(`/api/orders/${id}`);
  const json: unknown = await res.json();
  const parsed = OrderResponseSchema.parse(json);

  if (!parsed.success) {
    throw new OrderApiError(parsed.error.code, parsed.error.field);
  }
  return parsed.data;
}
```

#### 프롬프트 2: 제네릭 유틸리티 타입

```
프롬프트:
"다음 유틸리티 타입을 만들어줘:
1. DeepPartial<T> - 중첩 객체 모든 필드 optional
2. DeepRequired<T> - 중첩 객체 모든 필드 required
3. PickByValue<T, V> - 값 타입으로 키 필터링
4. StrictOmit<T, K> - K가 T의 키가 아니면 컴파일 에러
각각 테스트 케이스도 포함해줘."
```

```typescript
// DeepPartial: 중첩 객체까지 모두 optional
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// DeepRequired: 중첩 객체까지 모두 required
type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

// PickByValue: 값 타입이 V인 키만 추출
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

// StrictOmit: 존재하지 않는 키를 지정하면 컴파일 에러
type StrictOmit<T, K extends keyof T> = Omit<T, K>;

// 테스트
interface TestUser {
  id: number;
  name: string;
  active: boolean;
  profile: {
    bio: string;
    avatar?: string;
    settings: {
      theme: string;
      notifications: boolean;
    };
  };
}

// DeepPartial 적용: 모든 중첩 필드가 optional
type PartialUser = DeepPartial<TestUser>;
const partial: PartialUser = { profile: { settings: { theme: "dark" } } };

// PickByValue 적용: string 타입 필드만 추출
type StringFields = PickByValue<TestUser, string>;
// => { name: string }

// StrictOmit 적용: 존재하지 않는 키는 컴파일 에러
type WithoutId = StrictOmit<TestUser, "id">;
// StrictOmit<TestUser, "nonExistent"> // 컴파일 에러!
```

#### 프롬프트 3: Zod 스키마 + Form 타입

```
프롬프트:
"회원가입 폼의 Zod 스키마를 만들어줘.
email(이메일 형식), password(8자 이상, 대소문자+숫자+특수문자),
confirmPassword(password와 일치), name(2-50자), age(18-120),
terms(true만 허용). React Hook Form과 통합하는 예시도 포함."
```

```typescript
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const SignupSchema = z
  .object({
    email: z.string().email("올바른 이메일을 입력해 주세요"),
    password: z
      .string()
      .min(8, "8자 이상 입력해 주세요")
      .regex(/[a-z]/, "소문자를 포함해 주세요")
      .regex(/[A-Z]/, "대문자를 포함해 주세요")
      .regex(/[0-9]/, "숫자를 포함해 주세요")
      .regex(/[^a-zA-Z0-9]/, "특수문자를 포함해 주세요"),
    confirmPassword: z.string(),
    name: z.string().min(2, "2자 이상").max(50, "50자 이하"),
    age: z.number().int().min(18, "18세 이상").max(120),
    terms: z.literal(true, {
      errorMap: () => ({ message: "약관에 동의해 주세요" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof SignupSchema>;

function useSignupForm() {
  return useForm<SignupForm>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      age: undefined,
      terms: undefined,
    },
  });
}
```

#### 프롬프트 4: tRPC 라우터 타입

```
프롬프트:
"상품 관리 CRUD tRPC 라우터를 만들어줘.
list(페이지네이션+필터), getById, create, update, delete 프로시저 포함.
입력 검증은 Zod, 출력 타입은 Prisma 모델 기반.
낙관적 업데이트 유틸리티 훅도 포함해줘."
```

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const ProductFilterSchema = z.object({
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  search: z.string().optional(),
});

const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().positive(),
  category: z.string(),
  stock: z.number().int().nonnegative(),
});

const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: z.string().uuid(),
});

export const productRouter = router({
  list: protectedProcedure
    .input(PaginationSchema.merge(ProductFilterSchema))
    .query(async ({ ctx, input }) => {
      const { page, limit, ...filters } = input;
      const where = {
        ...(filters.category && { category: filters.category }),
        ...(filters.search && {
          name: { contains: filters.search, mode: "insensitive" as const },
        }),
        ...((filters.minPrice || filters.maxPrice) && {
          price: {
            ...(filters.minPrice && { gte: filters.minPrice }),
            ...(filters.maxPrice && { lte: filters.maxPrice }),
          },
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.product.count({ where }),
      ]);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.id },
      });
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "상품을 찾을 수 없습니다" });
      }
      return product;
    }),

  create: protectedProcedure
    .input(CreateProductSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.product.create({ data: input });
    }),

  update: protectedProcedure
    .input(UpdateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.product.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.product.delete({ where: { id: input.id } });
    }),
});
```

#### 프롬프트 5: 환경별 설정 타입

```
프롬프트:
"멀티 베타 환경(dev, staging, beta-1~N, production) 설정을 위한
타입 안전한 설정 시스템을 만들어줘.
각 환경별로 apiUrl, featureFlags, logLevel, sentryDsn 등을 포함하고,
production에서는 debug 관련 설정이 타입 레벨에서 금지되도록 해줘.
런타임 검증과 환경 변수 매핑도 포함."
```

```typescript
import { z } from "zod";

const EnvironmentSchema = z.enum(["development", "staging", "production"]).or(
  z.string().regex(/^beta-\d+$/)
);
type Environment = z.infer<typeof EnvironmentSchema>;

// 환경별 차별화된 설정 타입
interface BaseConfig {
  apiUrl: string;
  appName: string;
  logLevel: "error" | "warn" | "info" | "debug";
  sentryDsn: string;
  featureFlags: Record<string, boolean>;
}

interface DebugConfig {
  enableDevTools: boolean;
  mockApiDelay: number;
  showDebugPanel: boolean;
}

interface ProductionConfig extends BaseConfig {
  logLevel: "error" | "warn";
  cdn: string;
  // DebugConfig 속성은 포함하지 않아 타입 레벨에서 금지
}

interface NonProductionConfig extends BaseConfig, DebugConfig {
  betaLabel?: string;
}

type EnvironmentConfig<E extends Environment> = E extends "production"
  ? ProductionConfig
  : NonProductionConfig;

// 설정 빌더
function createConfig<E extends Environment>(
  env: E,
  config: EnvironmentConfig<E>,
): EnvironmentConfig<E> {
  return Object.freeze(config);
}

// 사용 예시
const prodConfig = createConfig("production", {
  apiUrl: "https://api.example.com",
  appName: "MyApp",
  logLevel: "error", // "debug" 입력 시 컴파일 에러
  sentryDsn: "https://sentry.io/xxx",
  featureFlags: { newCheckout: true },
  cdn: "https://cdn.example.com",
  // enableDevTools: true, // 컴파일 에러! ProductionConfig에 없는 속성
});

const betaConfig = createConfig("beta-3", {
  apiUrl: "https://beta-3.api.example.com",
  appName: "MyApp (Beta 3)",
  logLevel: "debug",
  sentryDsn: "https://sentry.io/xxx",
  featureFlags: { newCheckout: true, experimentalSearch: true },
  enableDevTools: true,
  mockApiDelay: 0,
  showDebugPanel: true,
  betaLabel: "Beta 3",
});
```

### 1.2 AI 도구 연동 설정

#### .cursorrules 예시

```
# TypeScript 규칙
- 모든 함수에 명시적 반환 타입을 선언할 것
- any 사용 금지. unknown 후 타입 가드로 좁힐 것
- Zod 스키마를 단일 소스로 하고 z.infer로 타입 추론할 것
- API 응답은 반드시 런타임 검증을 거칠 것
- 제네릭 타입에는 제약 조건(extends)을 명시할 것
- enum 대신 as const + typeof 패턴을 사용할 것
- barrel export(index.ts)는 사용하지 않을 것
- import type을 사용하여 타입 전용 import를 구분할 것
```

#### CLAUDE.md 예시

```markdown
# CLAUDE.md

## 프로젝트 구조
- src/types/ - 공유 타입 정의
- src/schemas/ - Zod 스키마 (타입의 단일 소스)
- src/api/ - tRPC 라우터
- src/hooks/ - React 훅

## TypeScript 규칙
- strict: true 필수
- 타입은 schemas/ 디렉토리의 Zod 스키마에서 추론
- API 함수는 입출력 모두 Zod로 검증
- 환경 설정은 src/config/env.ts의 타입 시스템을 따름
- Feature Flag는 src/config/flags.ts에 정의된 타입만 사용

## 금지 사항
- any 타입 사용 금지
- as 타입 단언 최소화 (타입 가드 사용)
- 런타임 검증 없는 JSON.parse 금지
```

### 1.3 AI 생성 코드의 타입 안전성 자동 검증 파이프라인

AI가 생성한 코드가 프로젝트의 타입 규칙을 준수하는지 자동으로 검증하는 파이프라인을 구성한다.

```typescript
// scripts/verify-types.ts
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

interface VerificationResult {
  step: string;
  passed: boolean;
  errors: string[];
  duration: number;
}

async function runStep(
  step: string,
  command: string,
): Promise<VerificationResult> {
  const start = Date.now();
  try {
    await execAsync(command);
    return { step, passed: true, errors: [], duration: Date.now() - start };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      step,
      passed: false,
      errors: [message],
      duration: Date.now() - start,
    };
  }
}

async function verifyTypesSafety(): Promise<void> {
  const results: VerificationResult[] = [];

  // 1. tsc --noEmit: 타입 에러 검사
  results.push(await runStep("TypeScript Compile", "npx tsc --noEmit"));

  // 2. any 사용 검사
  results.push(
    await runStep(
      "No any Types",
      'npx eslint --rule \'{"@typescript-eslint/no-explicit-any": "error"}\' --ext .ts,.tsx src/',
    ),
  );

  // 3. strict null 검사
  results.push(
    await runStep(
      "Strict Null Checks",
      "npx tsc --noEmit --strictNullChecks",
    ),
  );

  // 4. unused exports 검사
  results.push(await runStep("No Unused Exports", "npx ts-prune --error"));

  // 5. 타입 커버리지 측정
  results.push(
    await runStep(
      "Type Coverage > 95%",
      "npx type-coverage --at-least 95 --strict",
    ),
  );

  const allPassed = results.every((r) => r.passed);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log("\n=== Type Safety Verification ===");
  for (const result of results) {
    const icon = result.passed ? "PASS" : "FAIL";
    console.log(`[${icon}] ${result.step} (${result.duration}ms)`);
    if (!result.passed) {
      result.errors.forEach((e) => console.log(`     ${e.slice(0, 200)}`));
    }
  }
  console.log(`\nTotal: ${totalDuration}ms`);

  if (!allPassed) {
    process.exit(1);
  }
}

verifyTypesSafety();
```

```jsonc
// package.json scripts
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "verify:types": "tsx scripts/verify-types.ts",
    "verify:ai": "npm run verify:types && npm run lint && npm run test:types"
  }
}
```

### 1.4 AI 기반 타입 마이그레이션

#### JS -> TS 점진적 마이그레이션 전략

```typescript
// migrate-to-ts.ts - JS 파일을 TS로 변환하는 도우미

/**
 * 마이그레이션 단계:
 *
 * Phase 1: allowJs + checkJs 활성화
 *   - tsconfig.json에 allowJs: true, checkJs: true 설정
 *   - JSDoc 주석으로 기존 JS 파일에 타입 힌트 추가
 *
 * Phase 2: 파일 단위 변환
 *   - 의존성이 적은 유틸리티 파일부터 .ts로 변환
 *   - 공유 타입 정의를 types/ 디렉토리에 생성
 *
 * Phase 3: strict 모드 점진적 활성화
 *   - strictNullChecks -> strictFunctionTypes -> strict 순서로
 */

// Phase 1: JSDoc으로 기존 JS에 타입 추가 (AI 프롬프트)
// "이 JS 파일의 함수들에 JSDoc 타입 주석을 추가해줘"

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function add(a, b) {
  return a + b;
}

// Phase 2: TS 변환 후 (AI가 자동 변환)
function addTyped(a: number, b: number): number {
  return a + b;
}
```

#### any 제거 자동화

```typescript
// AI 프롬프트: "이 파일의 모든 any를 적절한 타입으로 교체해줘"

// Before: any 범벅 코드
function processData(data: any): any {
  return data.items.map((item: any) => ({
    id: item.id,
    label: item.name as any,
  }));
}

// After: AI가 타입을 추론하여 교체
interface DataItem {
  id: string;
  name: string;
}

interface DataInput {
  items: DataItem[];
}

interface ProcessedItem {
  id: string;
  label: string;
}

function processDataTyped(data: DataInput): ProcessedItem[] {
  return data.items.map((item) => ({
    id: item.id,
    label: item.name,
  }));
}
```

```jsonc
// tsconfig의 any 탐지 강화
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strict": true
  },
  // any가 남아있는 파일 추적
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

```bash
# any 사용 현황 리포트
npx eslint --rule '{"@typescript-eslint/no-explicit-any": "warn"}' \
  --format json src/ | jq '.[] | {file: .filePath, anyCount: (.messages | length)}'
```

---

## 2. 멀티 베타 환경 타입 전략

멀티 베타 환경에서는 dev, staging, beta-1 ~ beta-N, production이 동시에 운영된다. 각 환경의 설정, Feature Flag, API 엔드포인트가 타입 레벨에서 안전하게 관리되어야 한다.

### 2.1 환경별 설정 타입 시스템

```typescript
// src/config/environments.ts

// 환경 식별자 타입
type StaticEnv = "development" | "staging" | "production";
type BetaEnv = `beta-${number}`;
type Environment = StaticEnv | BetaEnv;

// 환경 판별 함수
function isBetaEnv(env: Environment): env is BetaEnv {
  return env.startsWith("beta-");
}

function isProductionEnv(env: Environment): env is "production" {
  return env === "production";
}

// 환경별 설정 구조체
interface SharedConfig {
  readonly appName: string;
  readonly apiVersion: string;
  readonly region: string;
}

interface DevelopmentConfig extends SharedConfig {
  readonly env: "development";
  readonly apiUrl: "http://localhost:3000";
  readonly debug: true;
  readonly mockEnabled: boolean;
  readonly hotReload: true;
}

interface StagingConfig extends SharedConfig {
  readonly env: "staging";
  readonly apiUrl: "https://staging-api.example.com";
  readonly debug: boolean;
  readonly seedData: boolean;
}

interface BetaConfig extends SharedConfig {
  readonly env: BetaEnv;
  readonly apiUrl: string;
  readonly debug: boolean;
  readonly betaNumber: number;
  readonly parentBranch: string;
  readonly expiresAt: string;
}

interface ProductionConfig extends SharedConfig {
  readonly env: "production";
  readonly apiUrl: "https://api.example.com";
  readonly debug: false; // production에서는 항상 false
  readonly cdn: string;
  readonly replicaRegions: string[];
}

// Discriminated Union으로 환경 설정 통합
type AppConfig =
  | DevelopmentConfig
  | StagingConfig
  | BetaConfig
  | ProductionConfig;

// 환경에 따른 설정 팩토리
function createAppConfig(env: Environment): AppConfig {
  const shared: SharedConfig = {
    appName: "MyApp",
    apiVersion: "v2",
    region: "ap-northeast-2",
  };

  if (env === "development") {
    return {
      ...shared,
      env: "development",
      apiUrl: "http://localhost:3000",
      debug: true,
      mockEnabled: true,
      hotReload: true,
    };
  }

  if (env === "staging") {
    return {
      ...shared,
      env: "staging",
      apiUrl: "https://staging-api.example.com",
      debug: true,
      seedData: true,
    };
  }

  if (isBetaEnv(env)) {
    const betaNumber = parseInt(env.split("-")[1], 10);
    return {
      ...shared,
      env,
      apiUrl: `https://beta-${betaNumber}-api.example.com`,
      debug: true,
      betaNumber,
      parentBranch: `feature/beta-${betaNumber}`,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return {
    ...shared,
    env: "production",
    apiUrl: "https://api.example.com",
    debug: false,
    cdn: "https://cdn.example.com",
    replicaRegions: ["us-west-2", "eu-west-1"],
  };
}

// 타입 좁히기를 통한 안전한 접근
function handleConfig(config: AppConfig): void {
  // 공통 속성은 바로 접근
  console.log(config.apiUrl);

  // 환경 특화 속성은 타입 좁히기 후 접근
  switch (config.env) {
    case "development":
      console.log(config.hotReload); // DevelopmentConfig에만 존재
      break;
    case "production":
      console.log(config.cdn); // ProductionConfig에만 존재
      break;
    default:
      if (isBetaEnv(config.env)) {
        console.log(config.betaNumber); // BetaConfig에만 존재
      }
  }
}
```

### 2.2 Feature Flag 타입 안전성

```typescript
// src/config/flags.ts

// Feature Flag 정의 (단일 소스)
const FEATURE_FLAGS = {
  newCheckout: {
    description: "새로운 결제 플로우",
    defaultValue: false,
    environments: ["development", "staging", "beta-*"] as const,
  },
  darkMode: {
    description: "다크 모드 지원",
    defaultValue: true,
    environments: ["*"] as const,
  },
  experimentalSearch: {
    description: "실험적 검색 엔진",
    defaultValue: false,
    environments: ["development", "beta-*"] as const,
  },
  aiRecommendations: {
    description: "AI 기반 추천",
    defaultValue: false,
    environments: ["beta-*", "production"] as const,
  },
} as const;

// Flag 이름 타입 (존재하지 않는 Flag 사용 시 컴파일 에러)
type FeatureFlagName = keyof typeof FEATURE_FLAGS;

// Flag 정의 타입
type FeatureFlagDefinition = {
  description: string;
  defaultValue: boolean;
  environments: readonly string[];
};

// Flag 저장소 타입
type FeatureFlagStore = Record<FeatureFlagName, boolean>;

class FeatureFlagService {
  private flags: FeatureFlagStore;

  constructor(
    private readonly env: Environment,
    overrides?: Partial<FeatureFlagStore>,
  ) {
    this.flags = this.initializeFlags(overrides);
  }

  private initializeFlags(
    overrides?: Partial<FeatureFlagStore>,
  ): FeatureFlagStore {
    const entries = Object.entries(FEATURE_FLAGS) as [
      FeatureFlagName,
      FeatureFlagDefinition,
    ][];

    const flags = {} as FeatureFlagStore;
    for (const [name, def] of entries) {
      flags[name] = overrides?.[name] ?? def.defaultValue;
    }
    return flags;
  }

  // 타입 안전한 Flag 조회 (존재하지 않는 Flag는 컴파일 에러)
  isEnabled(flagName: FeatureFlagName): boolean {
    return this.flags[flagName];
  }

  // Flag 환경 적합성 검사
  isAvailableInEnvironment(flagName: FeatureFlagName): boolean {
    const flag = FEATURE_FLAGS[flagName];
    return flag.environments.some((pattern) => {
      if (pattern === "*") return true;
      if (pattern === "beta-*") return isBetaEnv(this.env);
      return pattern === this.env;
    });
  }

  // 현재 환경에서 활성화된 Flag만 반환
  getActiveFlags(): Partial<FeatureFlagStore> {
    const active: Partial<FeatureFlagStore> = {};
    for (const name of Object.keys(this.flags) as FeatureFlagName[]) {
      if (this.isAvailableInEnvironment(name) && this.isEnabled(name)) {
        active[name] = true;
      }
    }
    return active;
  }
}

// 사용 예시
const flags = new FeatureFlagService("beta-3", {
  newCheckout: true,
  experimentalSearch: true,
});

flags.isEnabled("newCheckout"); // OK
// flags.isEnabled("nonExistentFlag"); // 컴파일 에러!
```

### 2.3 멀티 환경 API 엔드포인트 타입

```typescript
// src/config/api-endpoints.ts

type ApiVersion = "v1" | "v2";

// 환경별 URL 매핑 타입
type EnvironmentUrlMap = {
  development: `http://localhost:${number}`;
  staging: `https://staging-api.example.com`;
  production: `https://api.example.com`;
  [key: `beta-${number}`]: `https://beta-${number}-api.example.com`;
};

// API 엔드포인트 정의
interface ApiEndpoints {
  users: `/api/${ApiVersion}/users`;
  orders: `/api/${ApiVersion}/orders`;
  products: `/api/${ApiVersion}/products`;
  auth: `/api/${ApiVersion}/auth`;
}

type EndpointName = keyof ApiEndpoints;

// 환경별 전체 URL 생성 타입
type FullApiUrl<
  E extends Environment,
  P extends EndpointName,
> = `${string}${ApiEndpoints[P]}`;

class ApiClient {
  private readonly baseUrl: string;

  constructor(
    private readonly env: Environment,
    private readonly version: ApiVersion = "v2",
  ) {
    this.baseUrl = this.resolveBaseUrl();
  }

  private resolveBaseUrl(): string {
    if (this.env === "development") return "http://localhost:3000";
    if (this.env === "staging") return "https://staging-api.example.com";
    if (this.env === "production") return "https://api.example.com";
    if (isBetaEnv(this.env)) {
      const num = this.env.split("-")[1];
      return `https://beta-${num}-api.example.com`;
    }
    throw new Error(`Unknown environment: ${this.env}`);
  }

  // 타입 안전한 엔드포인트 URL 생성
  endpoint(name: EndpointName): string {
    const paths: ApiEndpoints = {
      users: `/api/${this.version}/users`,
      orders: `/api/${this.version}/orders`,
      products: `/api/${this.version}/products`,
      auth: `/api/${this.version}/auth`,
    };
    return `${this.baseUrl}${paths[name]}`;
  }

  // 환경 정보 헤더 자동 주입
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Api-Version": this.version,
      "X-Environment": this.env,
    };

    if (isBetaEnv(this.env)) {
      headers["X-Beta-Number"] = this.env.split("-")[1];
    }

    return headers;
  }

  async get<T>(name: EndpointName, path = ""): Promise<T> {
    const res = await fetch(`${this.endpoint(name)}${path}`, {
      headers: this.getHeaders(),
    });
    return res.json() as Promise<T>;
  }
}

// 사용 예시
const api = new ApiClient("beta-3", "v2");
// api.endpoint("users")  -> "https://beta-3-api.example.com/api/v2/users"
// api.endpoint("orders") -> "https://beta-3-api.example.com/api/v2/orders"
```

### 2.4 동적 환경 생성 시 타입 안전한 설정 주입

```typescript
// src/config/runtime-config.ts

import { z } from "zod";

// window.__CONFIG__의 Zod 스키마 (런타임 검증)
const RuntimeConfigSchema = z.object({
  ENV: z.string().refine(
    (v): v is Environment =>
      ["development", "staging", "production"].includes(v) ||
      /^beta-\d+$/.test(v),
    "Invalid environment",
  ),
  API_URL: z.string().url(),
  WS_URL: z.string().url(),
  SENTRY_DSN: z.string().optional(),
  FEATURE_FLAGS: z.record(z.string(), z.boolean()),
  BUILD_HASH: z.string(),
  BUILD_TIMESTAMP: z.string().datetime(),
  AUTH_PROVIDER: z.enum(["cognito", "auth0", "custom"]),
  ANALYTICS_ID: z.string().optional(),
});

type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

// Window 타입 확장
declare global {
  interface Window {
    __CONFIG__?: unknown;
  }
}

// 타입 안전한 설정 로더
function loadRuntimeConfig(): RuntimeConfig {
  const raw = window.__CONFIG__;

  if (!raw) {
    throw new Error(
      "Runtime config not found. Ensure window.__CONFIG__ is set before app initialization.",
    );
  }

  const result = RuntimeConfigSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid runtime config:\n${issues}`);
  }

  return result.data;
}

// 싱글턴 설정 접근
let cachedConfig: RuntimeConfig | null = null;

export function getRuntimeConfig(): RuntimeConfig {
  if (!cachedConfig) {
    cachedConfig = loadRuntimeConfig();
  }
  return cachedConfig;
}

// HTML 템플릿에서의 주입 (서버 사이드)
// <script>
//   window.__CONFIG__ = {
//     ENV: "beta-3",
//     API_URL: "https://beta-3-api.example.com",
//     WS_URL: "wss://beta-3-ws.example.com",
//     FEATURE_FLAGS: { newCheckout: true, experimentalSearch: true },
//     BUILD_HASH: "abc123",
//     BUILD_TIMESTAMP: "2026-04-01T00:00:00Z",
//     AUTH_PROVIDER: "cognito"
//   };
// </script>
```

### 2.5 환경별 분기 코드의 타입 좁히기

```typescript
// Discriminated Union을 활용한 환경별 분기

// 환경별 인증 설정 (Discriminated Union)
type AuthConfig =
  | {
      provider: "cognito";
      userPoolId: string;
      clientId: string;
      region: string;
    }
  | {
      provider: "auth0";
      domain: string;
      clientId: string;
      audience: string;
    }
  | {
      provider: "custom";
      loginUrl: string;
      tokenEndpoint: string;
    };

// 환경별 인증 설정 매핑
function getAuthConfig(env: Environment): AuthConfig {
  switch (env) {
    case "development":
      return {
        provider: "custom",
        loginUrl: "http://localhost:3001/login",
        tokenEndpoint: "http://localhost:3001/token",
      };
    case "staging":
      return {
        provider: "auth0",
        domain: "staging.auth0.com",
        clientId: "staging-client-id",
        audience: "https://staging-api.example.com",
      };
    case "production":
      return {
        provider: "cognito",
        userPoolId: "ap-northeast-2_xxxxx",
        clientId: "production-client-id",
        region: "ap-northeast-2",
      };
    default:
      // beta 환경은 staging과 동일한 인증 사용
      return {
        provider: "auth0",
        domain: "staging.auth0.com",
        clientId: `beta-client-${env.split("-")[1]}`,
        audience: `https://${env}-api.example.com`,
      };
  }
}

// Discriminated Union으로 타입 좁히기
function initAuth(config: AuthConfig): void {
  switch (config.provider) {
    case "cognito":
      // config.userPoolId, config.region 접근 가능
      console.log(`Cognito: ${config.userPoolId} in ${config.region}`);
      break;
    case "auth0":
      // config.domain, config.audience 접근 가능
      console.log(`Auth0: ${config.domain}`);
      break;
    case "custom":
      // config.loginUrl, config.tokenEndpoint 접근 가능
      console.log(`Custom: ${config.loginUrl}`);
      break;
  }
}

// 환경별 로깅 전략 (Discriminated Union)
type LogDestination =
  | { type: "console"; pretty: boolean }
  | { type: "file"; path: string; maxSize: string }
  | { type: "remote"; endpoint: string; batchSize: number; flushInterval: number };

function getLogDestination(env: Environment): LogDestination {
  if (env === "development") {
    return { type: "console", pretty: true };
  }
  if (env === "production") {
    return { type: "remote", endpoint: "https://logs.example.com", batchSize: 100, flushInterval: 5000 };
  }
  // staging, beta 환경
  return { type: "file", path: `/var/log/app/${env}.log`, maxSize: "100MB" };
}
```

---

## 3. TypeScript 5.8+ 최신 기능

### 3.1 erasableSyntaxOnly

TypeScript 5.8에서 도입된 `--erasableSyntaxOnly` 플래그는 Node.js의 `--experimental-strip-types`와 완벽히 호환되는 코드를 보장한다. 이 플래그가 활성화되면 런타임에 영향을 주는 TypeScript 전용 구문(enum, namespace, parameter properties)을 사용할 수 없다.

```typescript
// tsconfig.json
// { "compilerOptions": { "erasableSyntaxOnly": true } }

// 금지되는 구문들:

// 1. enum -> as const 객체로 대체
// enum Direction { Up, Down }  // 에러!

const Direction = {
  Up: 0,
  Down: 1,
  Left: 2,
  Right: 3,
} as const;
type Direction = (typeof Direction)[keyof typeof Direction];

// 2. namespace -> 모듈로 대체
// namespace Utils { ... }  // 에러!

// utils.ts 파일로 분리하여 모듈로 관리

// 3. Parameter properties -> 명시적 할당으로 대체
// class User { constructor(public name: string) {} }  // 에러!

class User {
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
}

// 허용되는 구문: 타입 주석, 인터페이스, 제네릭 등 (지워도 의미가 변하지 않는 것)
interface UserData {
  id: number;
  name: string;
}

function greet(user: UserData): string {
  return `Hello, ${user.name}`;
}
```

### 3.2 isolatedDeclarations

대규모 프로젝트에서 `.d.ts` 생성을 병렬화하기 위한 기능. 모든 export에 명시적 타입 주석이 필요하다.

```typescript
// tsconfig.json
// { "compilerOptions": { "isolatedDeclarations": true } }

// 반환 타입 추론에 의존하면 에러
// export function add(a: number, b: number) { return a + b; }  // 에러!

// 명시적 반환 타입 필요
export function add(a: number, b: number): number {
  return a + b;
}

// export된 상수도 타입 주석 필요
export const MAX_RETRIES: number = 3;

// 복잡한 반환 타입도 명시
export function createPair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

// 내부 함수는 추론 가능 (export하지 않으므로)
function internalHelper(x: number) {
  return x * 2; // 반환 타입 추론 OK
}
```

### 3.3 NoInfer 유틸리티 타입

제네릭 타입 매개변수의 추론 방향을 제어하여 의도하지 않은 타입 확장을 방지한다.

```typescript
// NoInfer 없이: defaultValue가 타입 추론에 영향
function getValueBefore<T>(values: T[], defaultValue: T): T {
  return values[0] ?? defaultValue;
}
// getValueBefore([1, 2, 3], "fallback")
// T가 number | string으로 추론됨 (의도하지 않음)

// NoInfer 사용: defaultValue는 추론에 참여하지 않음
function getValue<T>(values: T[], defaultValue: NoInfer<T>): T {
  return values[0] ?? defaultValue;
}
// getValue([1, 2, 3], "fallback")  // 에러! string은 number에 할당 불가
// getValue([1, 2, 3], 0)  // OK

// 실용적인 예시: 이벤트 핸들러
type EventMap = {
  click: { x: number; y: number };
  keydown: { key: string; code: string };
  scroll: { scrollTop: number };
};

function on<K extends keyof EventMap>(
  event: K,
  handler: (data: EventMap[K]) => void,
  defaultData?: NoInfer<EventMap[K]>,
): void {
  // handler의 인자 타입은 event 키로부터만 추론
  // defaultData는 추론에 영향을 주지 않음
}

on("click", (data) => {
  console.log(data.x, data.y); // 정확히 { x: number; y: number }
});
```

### 3.4 const 타입 매개변수

```typescript
// 일반 제네릭: 넓은 타입으로 추론
function withoutConst<T>(value: T): T {
  return value;
}
const a = withoutConst({ status: "active", count: 3 });
// { status: string; count: number }

// const 타입 매개변수: 리터럴 타입 유지
function withConst<const T>(value: T): T {
  return value;
}
const b = withConst({ status: "active", count: 3 });
// { readonly status: "active"; readonly count: 3 }

// 라우트 정의에서 활용
function defineRoutes<const T extends readonly { path: string; method: string }[]>(
  routes: T,
): T {
  return routes;
}

const routes = defineRoutes([
  { path: "/users", method: "GET" },
  { path: "/users", method: "POST" },
  { path: "/users/:id", method: "PUT" },
]);
// typeof routes[0] = { readonly path: "/users"; readonly method: "GET" }
```

---

## 4. 타입 레벨 프로그래밍

### 4.1 Recursive Types

```typescript
// JSON 타입 (재귀적 정의)
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// DeepReadonly (재귀적)
type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// 중첩 키 경로 추출 (재귀)
type DotPath<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${Prefix}${K}` | DotPath<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

// 경로로 값 타입 추출
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

// 타입 안전한 깊은 접근 함수
function deepGet<T, P extends DotPath<T>>(
  obj: T,
  path: P,
): PathValue<T, P> {
  return path
    .split(".")
    .reduce((current: unknown, key: string) => (current as Record<string, unknown>)[key], obj) as PathValue<T, P>;
}

// 사용 예시
interface Config {
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
  database: {
    url: string;
    pool: { min: number; max: number };
  };
}

declare const config: Config;
const host = deepGet(config, "server.host"); // string
const sslEnabled = deepGet(config, "server.ssl.enabled"); // boolean
const poolMax = deepGet(config, "database.pool.max"); // number
// deepGet(config, "server.nonexistent"); // 컴파일 에러!
```

### 4.2 Variadic Tuple Types

```typescript
// 튜플 첫 번째/마지막 원소 추출
type First<T extends readonly unknown[]> = T extends readonly [
  infer F,
  ...unknown[],
]
  ? F
  : never;

type Last<T extends readonly unknown[]> = T extends readonly [
  ...unknown[],
  infer L,
]
  ? L
  : never;

// 튜플 결합
type Concat<A extends readonly unknown[], B extends readonly unknown[]> = [
  ...A,
  ...B,
];

// 파이프라인 타입: 각 함수의 출력이 다음 함수의 입력
type Pipeline<Fns extends readonly ((arg: never) => unknown)[]> =
  Fns extends readonly [
    (arg: infer A) => infer B,
    ...infer Rest extends readonly ((arg: never) => unknown)[],
  ]
    ? Rest extends readonly [(arg: infer C) => unknown, ...unknown[]]
      ? B extends C
        ? [A, ...Pipeline<Rest>]
        : never // 타입 불일치
      : [A, B] // 마지막 함수
    : never;

// 실용적인 pipe 함수
function pipe<A, B>(fn1: (a: A) => B): (a: A) => B;
function pipe<A, B, C>(fn1: (a: A) => B, fn2: (b: B) => C): (a: A) => C;
function pipe<A, B, C, D>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
): (a: A) => D;
function pipe(...fns: ((arg: unknown) => unknown)[]): (arg: unknown) => unknown {
  return (arg) => fns.reduce((acc, fn) => fn(acc), arg);
}

// 사용 예시
const transform = pipe(
  (x: string) => parseInt(x, 10),
  (x: number) => x * 2,
  (x: number) => `Result: ${x}`,
);
const result = transform("21"); // "Result: 42"
```

### 4.3 Higher-Kinded Types (HKT) 시뮬레이션

TypeScript는 HKT를 직접 지원하지 않지만 인터페이스 매핑으로 시뮬레이션할 수 있다.

```typescript
// HKT 시뮬레이션 기본 구조
interface TypeRegistry {
  Array: unknown[];
  Promise: Promise<unknown>;
  Set: Set<unknown>;
}

type Kind<F extends keyof TypeRegistry, A> = F extends "Array"
  ? A[]
  : F extends "Promise"
    ? Promise<A>
    : F extends "Set"
      ? Set<A>
      : never;

// Functor: map 연산 추상화
interface Functor<F extends keyof TypeRegistry> {
  map<A, B>(fa: Kind<F, A>, f: (a: A) => B): Kind<F, B>;
}

const arrayFunctor: Functor<"Array"> = {
  map: <A, B>(fa: A[], f: (a: A) => B): B[] => fa.map(f),
};

const promiseFunctor: Functor<"Promise"> = {
  map: <A, B>(fa: Promise<A>, f: (a: A) => B): Promise<B> => fa.then(f),
};

// 범용 double 함수: Functor면 무엇이든 동작
function doubleAll<F extends keyof TypeRegistry>(
  functor: Functor<F>,
  fa: Kind<F, number>,
): Kind<F, number> {
  return functor.map(fa, (n) => n * 2);
}

doubleAll(arrayFunctor, [1, 2, 3]); // [2, 4, 6]
doubleAll(promiseFunctor, Promise.resolve(5)); // Promise<10>
```

---

## 5. Full-Stack 타입 안전성

### 5.1 tRPC: 엔드투엔드 타입 안전성

```typescript
// server/trpc.ts - tRPC 서버 설정
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});

// server/routers/user.ts
const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { id: true, name: true, email: true, role: true },
    });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.user.id },
        data: input,
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(20),
        role: z.enum(["admin", "user", "viewer"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.user.findMany({
        where: input.role ? { role: input.role } : undefined,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),
});

// client/hooks/useUser.ts - 클라이언트에서 타입 자동 추론
import { trpc } from "../utils/trpc";

function UserProfile() {
  // 반환 타입이 서버 코드에서 자동 추론됨
  const { data: user } = trpc.user.me.useQuery();
  // user: { id: string; name: string; email: string; role: string } | undefined

  const updateMutation = trpc.user.updateProfile.useMutation();

  const handleUpdate = (name: string) => {
    updateMutation.mutate({ name }); // 입력 타입도 자동 검증
    // updateMutation.mutate({ invalid: true }); // 컴파일 에러!
  };

  // 무한 스크롤
  const { data, fetchNextPage } = trpc.user.list.useInfiniteQuery(
    { limit: 20, role: "user" },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  return null; // JSX 생략
}
```

### 5.2 ts-rest: REST API 타입 안전성

```typescript
import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

// 계약 정의 (클라이언트-서버 공유)
export const apiContract = c.router({
  getUser: {
    method: "GET",
    path: "/users/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      }),
      404: z.object({ message: z.string() }),
    },
  },
  createUser: {
    method: "POST",
    path: "/users",
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }),
    responses: {
      201: z.object({ id: z.string(), name: z.string(), email: z.string() }),
      409: z.object({ message: z.string() }),
    },
  },
});

// 서버 구현 (계약을 만족해야 컴파일 통과)
import { createExpressEndpoints } from "@ts-rest/express";
import express from "express";

const app = express();

createExpressEndpoints(apiContract, {
  getUser: async ({ params }) => {
    // params.id는 string으로 자동 타입됨
    const user = await db.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return { status: 404, body: { message: "Not found" } };
    }
    return { status: 200, body: user };
  },
  createUser: async ({ body }) => {
    // body.name, body.email 자동 타입 + Zod 검증
    const user = await db.user.create({ data: body });
    return { status: 201, body: user };
  },
}, app);
```

### 5.3 Prisma: 데이터베이스 타입 안전성

```typescript
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// select로 정확한 반환 타입 추론
async function getUserProfile(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      posts: {
        select: { id: true, title: true, publishedAt: true },
        where: { published: true },
        orderBy: { publishedAt: "desc" },
        take: 5,
      },
    },
  });
}
// 반환 타입이 select 구조를 정확히 반영:
// { id: string; name: string; email: string; posts: { id: string; title: string; publishedAt: Date | null }[] }

// Prisma validator로 재사용 가능한 select/include 정의
const userWithPosts = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { posts: { where: { published: true } } },
});

type UserWithPosts = Prisma.UserGetPayload<typeof userWithPosts>;

// 트랜잭션도 타입 안전
async function transferCredits(fromId: string, toId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const from = await tx.user.update({
      where: { id: fromId },
      data: { credits: { decrement: amount } },
    });

    if (from.credits < 0) {
      throw new Error("Insufficient credits");
    }

    await tx.user.update({
      where: { id: toId },
      data: { credits: { increment: amount } },
    });

    return { from: from.credits, transferred: amount };
  });
}
```

---

## 6. React 19 + TypeScript 패턴

### 6.1 Server Components 타입

```typescript
// app/users/[id]/page.tsx - Server Component
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

// Server Component (async 함수)
export default async function UserPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  const user = await fetchUser(id); // 서버에서 직접 데이터 fetch

  return (
    <main>
      <h1>{user.name}</h1>
      <UserTabs activeTab={tab ?? "profile"} userId={id} />
    </main>
  );
}

// Server Component 전용 데이터 fetch (클라이언트 번들에 포함되지 않음)
async function fetchUser(id: string): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
}> {
  const res = await fetch(`${process.env.API_URL}/users/${id}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}
```

### 6.2 Server Actions 타입

```typescript
// actions/user.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
});

// Server Action의 반환 타입 정의
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateProfile(
  formData: FormData,
): Promise<ActionResult<{ name: string }>> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateProfileSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const updated = await db.user.update({
      where: { id: getCurrentUserId() },
      data: parsed.data,
    });

    revalidatePath("/profile");
    return { success: true, data: { name: updated.name } };
  } catch {
    return { success: false, error: "Failed to update profile" };
  }
}

// 클라이언트에서 사용
// "use client";
// import { useActionState } from "react";
// import { updateProfile } from "./actions/user";
//
// function ProfileForm() {
//   const [state, action, isPending] = useActionState(updateProfile, null);
//   return (
//     <form action={action}>
//       {state?.success === false && <p>{state.error}</p>}
//       <input name="name" />
//       <button disabled={isPending}>저장</button>
//     </form>
//   );
// }
```

### 6.3 Polymorphic Component 패턴

```typescript
import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
  forwardRef,
} from "react";

// Polymorphic 컴포넌트 타입 유틸리티
type PolymorphicProps<
  E extends ElementType,
  Props = object,
> = Props &
  Omit<ComponentPropsWithoutRef<E>, keyof Props | "as"> & {
    as?: E;
  };

type PolymorphicRef<E extends ElementType> =
  ComponentPropsWithoutRef<E> extends { ref?: infer R } ? R : never;

// Button 컴포넌트: <button>, <a>, <Link> 등으로 렌더링 가능
interface ButtonBaseProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

type ButtonProps<E extends ElementType = "button"> = PolymorphicProps<
  E,
  ButtonBaseProps
>;

function ButtonInner<E extends ElementType = "button">(
  { as, variant = "primary", size = "md", loading, children, ...props }: ButtonProps<E>,
  ref: PolymorphicRef<E>,
) {
  const Component = as ?? "button";
  return (
    <Component ref={ref} data-variant={variant} data-size={size} {...props}>
      {loading ? "Loading..." : children}
    </Component>
  );
}

export const Button = forwardRef(ButtonInner) as <
  E extends ElementType = "button",
>(
  props: ButtonProps<E> & { ref?: PolymorphicRef<E> },
) => ReactNode;

// 사용 예시
// <Button variant="primary">Click</Button>              // <button>
// <Button as="a" href="/home">Home</Button>             // <a>
// <Button as={Link} to="/about">About</Button>          // <Link>
// <Button as="a" href={123}>Error</Button>              // 컴파일 에러! href는 string
```

### 6.4 타입 안전한 Context + useReducer

```typescript
import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

// Discriminated Union으로 액션 정의
type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; payload: { id: string; name: string; role: string } }
  | { type: "LOGIN_FAILURE"; payload: { error: string } }
  | { type: "LOGOUT" }
  | { type: "UPDATE_PROFILE"; payload: { name?: string } };

interface AuthState {
  user: { id: string; name: string; role: string } | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = { user: null, loading: false, error: null };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_START":
      return { ...state, loading: true, error: null };
    case "LOGIN_SUCCESS":
      return { user: action.payload, loading: false, error: null };
    case "LOGIN_FAILURE":
      return { user: null, loading: false, error: action.payload.error };
    case "LOGOUT":
      return initialState;
    case "UPDATE_PROFILE":
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...action.payload } };
  }
}

// Context를 분리하여 불필요한 리렌더링 방지
const AuthStateContext = createContext<AuthState | null>(null);
const AuthDispatchContext = createContext<Dispatch<AuthAction> | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider value={dispatch}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
}

export function useAuthState(): AuthState {
  const state = useContext(AuthStateContext);
  if (!state) throw new Error("useAuthState must be used within AuthProvider");
  return state;
}

export function useAuthDispatch(): Dispatch<AuthAction> {
  const dispatch = useContext(AuthDispatchContext);
  if (!dispatch)
    throw new Error("useAuthDispatch must be used within AuthProvider");
  return dispatch;
}
```

---

## 7. 런타임 검증과 타입 통합

### 7.1 Zod vs Valibot vs ArkType 비교

```typescript
// === Zod: 가장 성숙한 생태계 ===
import { z } from "zod";

const ZodUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(["admin", "user"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
type ZodUser = z.infer<typeof ZodUserSchema>;

// === Valibot: 트리셰이킹에 최적화된 경량 대안 ===
import * as v from "valibot";

const ValibotUserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  email: v.pipe(v.string(), v.email()),
  age: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(150)),
  role: v.picklist(["admin", "user"]),
  metadata: v.optional(v.record(v.string(), v.unknown())),
});
type ValibotUser = v.InferOutput<typeof ValibotUserSchema>;

// === ArkType: TypeScript 네이티브 구문 ===
import { type } from "arktype";

const ArkUser = type({
  id: "string.uuid",
  email: "string.email",
  age: "0 <= integer <= 150",
  role: "'admin' | 'user'",
  "metadata?": "Record<string, unknown>",
});
type ArkUser = typeof ArkUser.infer;

// 비교 요약:
// Zod     - 생태계 최대, tRPC/React Hook Form 등 통합 우수, 번들 ~14KB
// Valibot - 트리셰이킹 가능, 번들 ~2KB(사용분만), Zod 유사 API
// ArkType - TS 구문 그대로 사용, 최고 성능, 번들 ~7KB
```

### 7.2 Effect-TS 통합

```typescript
import { Effect, pipe, Schema } from "effect";

// Effect Schema: 검증 + 직렬화/역직렬화 + 타입 추론
class UserId extends Schema.Class<UserId>("UserId")({
  value: Schema.UUID,
}) {}

class UserEmail extends Schema.Class<UserEmail>("UserEmail")({
  value: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
}) {}

class User extends Schema.Class<User>("User")({
  id: UserId,
  email: UserEmail,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  role: Schema.Literal("admin", "user", "viewer"),
  createdAt: Schema.DateFromString,
}) {}

// Effect로 에러 처리 타입 안전하게
class UserNotFoundError {
  readonly _tag = "UserNotFoundError";
  constructor(readonly userId: string) {}
}

class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly cause: unknown) {}
}

// 반환 타입에 가능한 에러가 명시됨
function findUser(
  id: string,
): Effect.Effect<User, UserNotFoundError | DatabaseError> {
  return pipe(
    Effect.tryPromise({
      try: () => db.user.findUnique({ where: { id } }),
      catch: (e) => new DatabaseError(e),
    }),
    Effect.flatMap((user) =>
      user
        ? Effect.succeed(user as unknown as User)
        : Effect.fail(new UserNotFoundError(id)),
    ),
  );
}

// 호출자는 모든 에러를 처리해야 함
const program = pipe(
  findUser("user-123"),
  Effect.catchTag("UserNotFoundError", (e) =>
    Effect.succeed({ message: `User ${e.userId} not found` }),
  ),
  Effect.catchTag("DatabaseError", (e) =>
    Effect.succeed({ message: "Database unavailable" }),
  ),
);
```

### 7.3 브랜디드 타입 (Branded Types)

```typescript
// 원시 타입의 혼동을 방지하는 브랜딩
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
type Email = Brand<string, "Email">;
type PositiveNumber = Brand<number, "PositiveNumber">;

// 생성 함수 (런타임 검증 포함)
function createUserId(value: string): UserId {
  if (!value.match(/^usr_[a-zA-Z0-9]{20}$/)) {
    throw new Error(`Invalid user ID format: ${value}`);
  }
  return value as UserId;
}

function createEmail(value: string): Email {
  if (!value.includes("@")) {
    throw new Error(`Invalid email: ${value}`);
  }
  return value as Email;
}

function createPositiveNumber(value: number): PositiveNumber {
  if (value <= 0) throw new Error(`Expected positive number: ${value}`);
  return value as PositiveNumber;
}

// 컴파일 타임에 혼동 방지
function sendEmail(to: Email, subject: string): void {
  console.log(`Sending "${subject}" to ${to}`);
}

function getOrder(id: OrderId): void {
  console.log(`Fetching order ${id}`);
}

const email = createEmail("user@example.com");
const userId = createUserId("usr_abc12345678901234567");
const orderId = "ord_123" as OrderId;

sendEmail(email, "Welcome"); // OK
// sendEmail(userId, "Welcome"); // 컴파일 에러! UserId는 Email이 아님
// getOrder(userId); // 컴파일 에러! UserId는 OrderId가 아님
```

---

## 8. DX 최적화

### 8.1 tsconfig 2026 권장 설정

```jsonc
// tsconfig.json (2026 권장)
{
  "compilerOptions": {
    // 기본
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],

    // 엄격 모드 (모두 활성화)
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // 5.8+ 신규
    "erasableSyntaxOnly": true,
    "isolatedDeclarations": true,

    // 출력
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",

    // 호환성
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,

    // 경로
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

### 8.2 Biome 2.0 설정

```jsonc
// biome.json (Biome 2.0 - ESLint + Prettier 통합 대체)
{
  "$schema": "https://biomejs.dev/schemas/2.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noAssertionInEqualityCheck": "error"
      },
      "style": {
        "useConst": "error",
        "useTemplate": "error",
        "noNonNullAssertion": "warn"
      },
      "complexity": {
        "noBannedTypes": "error",
        "noExcessiveCognitiveComplexity": {
          "level": "warn",
          "options": { "maxAllowedComplexity": 15 }
        }
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  }
}
```

### 8.3 Project References (모노레포)

```jsonc
// tsconfig.json (루트)
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/api" },
    { "path": "./packages/web" },
    { "path": "./packages/mobile" }
  ]
}
```

```jsonc
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

```jsonc
// packages/api/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "references": [
    { "path": "../shared" }
  ]
}
```

```jsonc
// packages/web/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "references": [
    { "path": "../shared" },
    { "path": "../api" }
  ]
}
```

```bash
# 의존성 순서대로 빌드 (변경된 프로젝트만 증분 빌드)
tsc --build --verbose

# 감시 모드
tsc --build --watch
```

### 8.4 타입 성능 최적화

```typescript
// 1. 인터페이스를 타입 별칭보다 선호 (확장 시 캐싱 효율)
// 좋음
interface UserBase {
  id: string;
  name: string;
}

interface UserWithPosts extends UserBase {
  posts: Post[];
}

// 피할 것 (매번 재계산)
// type UserWithPosts = UserBase & { posts: Post[] };

// 2. 조건부 타입 분배 제어
type ToArray<T> = [T] extends [unknown] ? T[] : never;
// T가 유니온이어도 분배되지 않음

// 3. 재귀 타입 깊이 제한
type DeepPartialSafe<T, Depth extends readonly unknown[] = []> =
  Depth["length"] extends 10
    ? T // 깊이 10에서 중단
    : T extends object
      ? { [K in keyof T]?: DeepPartialSafe<T[K], [...Depth, unknown]> }
      : T;

// 4. 불필요한 타입 연산 줄이기
// 느림: 매번 전체 유니온을 순회
// type SlowLookup = Extract<HugeUnion, { type: "specific" }>;

// 빠름: 맵 타입으로 O(1) 접근
interface EventMap {
  click: { x: number; y: number };
  keydown: { key: string };
}
type ClickEvent = EventMap["click"]; // O(1)
```

---

## 참고 자료

- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [TypeScript 5.8 릴리스 노트](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)
- [tRPC 공식 문서](https://trpc.io/docs)
- [Zod 공식 문서](https://zod.dev)
- [Valibot 공식 문서](https://valibot.dev)
- [ArkType 공식 문서](https://arktype.io)
- [Effect-TS 공식 문서](https://effect.website)
- [Biome 공식 문서](https://biomejs.dev)
- [Prisma 공식 문서](https://www.prisma.io/docs)
