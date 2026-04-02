# React 19.1 실전 마이그레이션 & 아키텍처 가이드 (2026)

## 목차

1. [AI 기반 실전 마이그레이션 시나리오](#1-ai-기반-실전-마이그레이션-시나리오)
2. [React 19.1 안정화 이후 변경점](#2-react-191-안정화-이후-변경점)
3. [Server Functions 심화](#3-server-functions-심화)
4. [멀티 베타: RSC 데이터 소스 팩토리](#4-멀티-베타-rsc-데이터-소스-팩토리)
5. [멀티 베타: Preview Suspense 디버그 패널](#5-멀티-베타-preview-suspense-디버그-패널)
6. [React Router v7 + React 19 통합](#6-react-router-v7--react-19-통합)
7. [TanStack Start vs Next.js 15 비교](#7-tanstack-start-vs-nextjs-15-비교)
8. [체크리스트](#8-체크리스트)

---

## 1. AI 기반 실전 마이그레이션 시나리오

단순 코드 생성이 아닌, 실제 레거시 코드베이스를 React 19.1로 전환하는 시나리오별 프롬프트를 제공한다. 각 프롬프트는 입력(Before)과 기대 출력(After)을 함께 기술한다.

### 1.1 클래스 컴포넌트 → React 19 함수형 전환

**프롬프트:**

```text
아래 클래스 컴포넌트를 React 19.1 함수형으로 변환해줘.
- lifecycle → useEffect/use() 훅으로 교체
- this.state → useState/useReducer
- componentDidCatch → ErrorBoundary 컴포넌트 분리
- React Compiler가 최적화할 수 있도록 memo/useMemo/useCallback 제거
- ref는 props로 직접 전달 (forwardRef 제거)
- TypeScript strict 모드

## 원본 코드
```tsx
// 여기에 클래스 컴포넌트 코드를 붙여넣기
```
```

**변환 전/후 예시:**

```tsx
// Before: 클래스 컴포넌트
class UserDashboard extends React.Component<Props, State> {
  state = { user: null, loading: true };

  async componentDidMount() {
    const user = await fetchUser(this.props.userId);
    this.setState({ user, loading: false });
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.userId !== this.props.userId) {
      this.setState({ loading: true });
      fetchUser(this.props.userId).then((user) =>
        this.setState({ user, loading: false })
      );
    }
  }

  render() {
    if (this.state.loading) return <Spinner />;
    return <Profile user={this.state.user!} />;
  }
}
```

```tsx
// After: React 19.1 — use() + Suspense
import { use, Suspense } from "react";

function UserDashboard({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<Spinner />}>
      <UserDashboardContent userId={userId} />
    </Suspense>
  );
}

function UserDashboardContent({ userId }: { userId: string }) {
  // use()로 Promise를 직접 소비 — Suspense가 로딩 처리
  const user = use(fetchUser(userId));
  return <Profile user={user} />;
}
```

### 1.2 useEffect 데이터 페칭 → Server Function 전환

**프롬프트:**

```text
아래 useEffect 기반 데이터 페칭 코드를 React 19.1 Server Function으로 변환해줘.
- 클라이언트 fetch 호출 → 서버에서 직접 DB/API 접근
- loading/error 상태 → Suspense + ErrorBoundary로 교체
- "use server" 지시어 사용
- 반환 타입을 명시적으로 선언
- 보안상 민감한 로직은 서버에만 존재하도록 분리

## 원본 코드
```tsx
// 여기에 useEffect 데이터 페칭 코드를 붙여넣기
```
```

**변환 예시:**

```tsx
// Before: useEffect 기반
function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then(setOrders)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <OrderTable orders={orders} />;
}
```

```tsx
// After: Server Function + Suspense
// src/actions/orders.ts
"use server";

import { db } from "@/lib/db";
import type { Order } from "@/types/order";

export async function getOrders(): Promise<Order[]> {
  // 서버에서 직접 DB 접근 — API 라우트 불필요
  return db.order.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
```

```tsx
// src/components/OrderList.tsx — Server Component
import { Suspense } from "react";
import { getOrders } from "@/actions/orders";
import { OrderTable } from "./OrderTable";
import { OrderSkeleton } from "./OrderSkeleton";

export default async function OrderList() {
  const orders = await getOrders();
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderTable orders={orders} />
    </Suspense>
  );
}
```

### 1.3 폼 핸들링 → useActionState + Server Function

**프롬프트:**

```text
아래 useState + onSubmit 기반 폼을 React 19.1 useActionState + Server Function으로 변환해줘.
- useState로 관리하던 폼 상태 → useActionState로 교체
- e.preventDefault() 제거, <form action={...}> 패턴 사용
- useFormStatus()로 pending 상태 처리
- 서버 유효성 검증 포함
- 낙관적 업데이트가 필요하면 useOptimistic 사용 여부 판단

## 원본 코드
```tsx
// 여기에 기존 폼 코드를 붙여넣기
```
```

**변환 예시:**

```tsx
// Before: useState + fetch
function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
    } catch {
      setError("전송 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button disabled={submitting}>전송</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

```tsx
// After: Server Function + useActionState
"use server";

import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
});

export type ContactState = {
  success: boolean;
  errors?: Record<string, string[]>;
};

export async function submitContact(
  prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  await db.contact.create({ data: parsed.data });
  return { success: true };
}
```

```tsx
// ContactForm.tsx — Client Component
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitContact, type ContactState } from "@/actions/contact";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "전송 중..." : "전송"}
    </button>
  );
}

export function ContactForm() {
  const [state, action] = useActionState<ContactState, FormData>(
    submitContact,
    { success: false }
  );

  return (
    <form action={action}>
      <input name="name" required />
      {state.errors?.name && <p>{state.errors.name[0]}</p>}
      <input name="email" type="email" required />
      {state.errors?.email && <p>{state.errors.email[0]}</p>}
      <SubmitButton />
      {state.success && <p>전송 완료</p>}
    </form>
  );
}
```

### 1.4 forwardRef 제거 마이그레이션

**프롬프트:**

```text
아래 forwardRef 컴포넌트를 React 19.1 방식으로 변환해줘.
- forwardRef 제거, ref를 일반 props로 전달
- displayName 제거 (더 이상 불필요)
- 제네릭 타입이 있다면 보존

## 원본 코드
```tsx
// 여기에 forwardRef 코드를 붙여넣기
```
```

**변환 예시:**

```tsx
// Before
const TextInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
      {error && <span>{error}</span>}
    </div>
  )
);
TextInput.displayName = "TextInput";
```

```tsx
// After: React 19.1 — ref는 일반 props
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

function TextInput({ label, error, ref, ...props }: InputProps) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
      {error && <span>{error}</span>}
    </div>
  );
}
```

### 1.5 Context.Provider → Context 직접 사용

**프롬프트:**

```text
아래 Context.Provider 패턴을 React 19.1의 <Context> 직접 렌더링으로 변환해줘.
- MyContext.Provider → <MyContext value={...}> 형태로 교체
- Provider 래퍼 컴포넌트가 있으면 함께 수정

## 원본 코드
```tsx
// 여기에 Context.Provider 코드를 붙여넣기
```
```

**변환 예시:**

```tsx
// Before
const ThemeContext = createContext<Theme>("light");

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Main />
    </ThemeContext.Provider>
  );
}
```

```tsx
// After: React 19.1 — Provider 불필요
const ThemeContext = createContext<Theme>("light");

function App() {
  return (
    <ThemeContext value="dark">
      <Main />
    </ThemeContext>
  );
}
```

---

## 2. React 19.1 안정화 이후 변경점

React 19.0(2024-12) 이후 19.1(2025-03 안정화)에서 확정된 변경사항을 정리한다.

### 2.1 React Compiler 정식 출시

React Compiler(구 React Forget)가 19.1에서 정식 포함되었다. `useMemo`, `useCallback`, `React.memo`를 수동으로 작성할 필요가 사라진다.

```tsx
// react-compiler가 자동 메모이제이션 — 수동 memo 불필요
function ExpensiveList({ items, filter }: Props) {
  // Compiler가 items/filter 의존성을 자동 추적하여
  // 변경이 없으면 재계산하지 않음
  const filtered = items.filter((item) => item.category === filter);
  const sorted = filtered.sort((a, b) => b.score - a.score);

  return (
    <ul>
      {sorted.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

**Compiler 설정 (Vite 6):**

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
});
```

**Compiler가 최적화하지 못하는 패턴 (주의):**

```tsx
// 경고: 외부 뮤터블 변수를 읽는 패턴 — Compiler가 건너뜀
let externalCounter = 0;

function Counter() {
  // Compiler는 이 컴포넌트를 최적화하지 않음
  externalCounter++;
  return <span>{externalCounter}</span>;
}

// 해결: 상태를 React 안으로 이동
function Counter() {
  const [count, setCount] = useState(0);
  return <span>{count}</span>;
}
```

### 2.2 Activity API (Preview)

React 19.1에서 `<Activity>` API가 Preview로 도입되었다. 이전의 `<Offscreen>` 컨셉이 공식화된 것으로, 컴포넌트를 언마운트하지 않고 숨길 수 있다.

```tsx
import { Activity } from "react";

function TabPanel({ activeTab }: { activeTab: string }) {
  return (
    <div>
      {/* mode="hidden"이면 DOM에서 숨기지만 상태를 유지 */}
      <Activity mode={activeTab === "home" ? "visible" : "hidden"}>
        <HomeTab />
      </Activity>
      <Activity mode={activeTab === "search" ? "visible" : "hidden"}>
        <SearchTab />
      </Activity>
      <Activity mode={activeTab === "profile" ? "visible" : "hidden"}>
        <ProfileTab />
      </Activity>
    </div>
  );
}
```

**Activity의 핵심 특징:**

| 특징 | 설명 |
|------|------|
| 상태 보존 | `mode="hidden"`이어도 useState 값 유지 |
| Effect 제어 | hidden 전환 시 cleanup 실행, visible 복귀 시 setup 재실행 |
| 우선순위 | hidden 컴포넌트의 렌더링은 낮은 우선순위로 처리 |
| Suspense 연동 | hidden 상태에서도 사전 로딩(prerender) 가능 |

### 2.3 기타 19.1 안정화 변경점

| 항목 | 19.0 | 19.1 |
|------|------|------|
| `ref` cleanup | 도입 | 안정화 — cleanup 함수 반환 시 언마운트 때 실행 |
| `use()` | 도입 | Promise/Context 패턴 확정, 에러 전파 방식 표준화 |
| Document Metadata | `<title>`, `<meta>` 호이스팅 | `<link>` 호이스팅 추가, 중복 제거 로직 개선 |
| Stylesheet 우선순위 | `precedence` prop | 충돌 해결 알고리즘 개선 |
| Server Functions 명칭 | "Server Actions" | "Server Functions"로 공식 변경 (Actions는 mutation subset) |

---

## 3. Server Functions 심화

React 19.1에서 "Server Actions"가 "Server Functions"로 공식 명칭이 변경되었다. mutation뿐 아니라 데이터 조회도 포함하는 넓은 개념이다.

### 3.1 Server Functions vs Server Components 데이터 접근

```tsx
// Pattern 1: Server Component에서 직접 조회 (초기 로드)
// src/components/ProductPage.tsx — Server Component
import { db } from "@/lib/db";

export default async function ProductPage({ id }: { id: string }) {
  const product = await db.product.findUniqueOrThrow({ where: { id } });
  return <ProductDetail product={product} />;
}

// Pattern 2: Server Function으로 후속 조회 (클라이언트 트리거)
// src/actions/product.ts
"use server";

import { db } from "@/lib/db";

export async function getRelatedProducts(
  productId: string,
  category: string
): Promise<Product[]> {
  return db.product.findMany({
    where: { category, id: { not: productId } },
    take: 8,
  });
}

// Pattern 3: Server Function으로 mutation
// src/actions/cart.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function addToCart(
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session) return { success: false, error: "로그인이 필요합니다" };

  await db.cartItem.upsert({
    where: {
      userId_productId: { userId: session.user.id, productId },
    },
    create: { userId: session.user.id, productId, quantity },
    update: { quantity: { increment: quantity } },
  });

  revalidatePath("/cart");
  return { success: true };
}
```

### 3.2 Server Function 보안 패턴

```tsx
// src/lib/server-fn-guard.ts
"use server";

import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z, type ZodSchema } from "zod";

type ServerFnResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function createServerFn<TInput, TOutput>(config: {
  schema: ZodSchema<TInput>;
  requireAuth?: boolean;
  rateLimit?: { window: number; max: number };
  handler: (input: TInput, userId?: string) => Promise<TOutput>;
}) {
  return async (input: unknown): Promise<ServerFnResult<TOutput>> => {
    // 1. 인증 확인
    let userId: string | undefined;
    if (config.requireAuth) {
      const session = await auth();
      if (!session?.user?.id) {
        return { success: false, error: "인증이 필요합니다" };
      }
      userId = session.user.id;
    }

    // 2. Rate limiting
    if (config.rateLimit) {
      const allowed = await rateLimit(
        userId ?? "anonymous",
        config.rateLimit.window,
        config.rateLimit.max
      );
      if (!allowed) {
        return { success: false, error: "요청이 너무 많습니다" };
      }
    }

    // 3. 입력 검증
    const parsed = config.schema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // 4. 실행
    try {
      const data = await config.handler(parsed.data, userId);
      return { success: true, data };
    } catch (err) {
      console.error("[ServerFn Error]", err);
      return { success: false, error: "서버 오류가 발생했습니다" };
    }
  };
}
```

```tsx
// 사용 예
"use server";

import { createServerFn } from "@/lib/server-fn-guard";
import { z } from "zod";

export const updateProfile = createServerFn({
  schema: z.object({
    displayName: z.string().min(2).max(50),
    bio: z.string().max(500).optional(),
  }),
  requireAuth: true,
  rateLimit: { window: 60_000, max: 10 },
  handler: async (input, userId) => {
    return db.user.update({
      where: { id: userId },
      data: input,
    });
  },
});
```

### 3.3 Server Function + useOptimistic 패턴

```tsx
"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/actions/like";

interface LikeButtonProps {
  postId: string;
  liked: boolean;
  likeCount: number;
}

export function LikeButton({ postId, liked, likeCount }: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();

  const [optimistic, setOptimistic] = useOptimistic(
    { liked, likeCount },
    (current, action: "toggle") => ({
      liked: !current.liked,
      likeCount: current.liked
        ? current.likeCount - 1
        : current.likeCount + 1,
    })
  );

  const handleClick = () => {
    startTransition(async () => {
      setOptimistic("toggle");
      await toggleLike(postId);
    });
  };

  return (
    <button onClick={handleClick} disabled={isPending}>
      {optimistic.liked ? "❤️" : "🤍"} {optimistic.likeCount}
    </button>
  );
}
```

---

## 4. 멀티 베타: RSC 데이터 소스 팩토리

환경(production, staging, beta-a, beta-b, preview-PR-xxx)마다 서로 다른 데이터 소스를 RSC에 주입해야 할 때, 팩토리 패턴으로 일원화한다.

### 4.1 데이터 소스 팩토리 구현

```tsx
// src/lib/data-source/factory.ts
import type { DataSource } from "./types";

export interface DataSourceConfig {
  database: {
    url: string;
    pool: { min: number; max: number };
  };
  cache: {
    provider: "redis" | "memory" | "none";
    url?: string;
    ttl: number;
  };
  featureFlags: {
    provider: "launchdarkly" | "unleash" | "static";
    sdkKey?: string;
    overrides?: Record<string, boolean>;
  };
}

const envConfigs: Record<string, () => DataSourceConfig> = {
  production: () => ({
    database: {
      url: process.env.DATABASE_URL!,
      pool: { min: 5, max: 20 },
    },
    cache: {
      provider: "redis",
      url: process.env.REDIS_URL!,
      ttl: 300,
    },
    featureFlags: {
      provider: "launchdarkly",
      sdkKey: process.env.LD_SDK_KEY!,
    },
  }),

  staging: () => ({
    database: {
      url: process.env.STAGING_DATABASE_URL!,
      pool: { min: 2, max: 10 },
    },
    cache: {
      provider: "redis",
      url: process.env.STAGING_REDIS_URL!,
      ttl: 60,
    },
    featureFlags: {
      provider: "unleash",
      sdkKey: process.env.UNLEASH_KEY!,
    },
  }),

  preview: () => ({
    database: {
      url: process.env.PREVIEW_DATABASE_URL!,
      pool: { min: 1, max: 3 },
    },
    cache: {
      provider: "memory",
      ttl: 30,
    },
    featureFlags: {
      provider: "static",
      overrides: JSON.parse(process.env.FF_OVERRIDES ?? "{}"),
    },
  }),
};

export function getDataSourceConfig(): DataSourceConfig {
  const env = process.env.APP_ENV ?? "preview";
  const factory = envConfigs[env] ?? envConfigs.preview;
  return factory();
}
```

### 4.2 RSC에서 팩토리 사용

```tsx
// src/lib/data-source/index.ts
import { getDataSourceConfig, type DataSourceConfig } from "./factory";
import { PrismaClient } from "@prisma/client";
import { createCache, type CacheAdapter } from "./cache";
import { createFlagClient, type FlagClient } from "./flags";

export interface DataSource {
  db: PrismaClient;
  cache: CacheAdapter;
  flags: FlagClient;
}

// 글로벌 싱글톤 (서버 프로세스 내)
const globalForDs = globalThis as unknown as { __ds?: DataSource };

export function getDataSource(): DataSource {
  if (globalForDs.__ds) return globalForDs.__ds;

  const config = getDataSourceConfig();

  const ds: DataSource = {
    db: new PrismaClient({
      datasourceUrl: config.database.url,
    }),
    cache: createCache(config.cache),
    flags: createFlagClient(config.featureFlags),
  };

  globalForDs.__ds = ds;
  return ds;
}
```

```tsx
// src/components/ProductList.tsx — Server Component
import { getDataSource } from "@/lib/data-source";

export default async function ProductList({
  category,
}: {
  category: string;
}) {
  const { db, cache, flags } = getDataSource();

  // 환경별로 자동으로 다른 DB/캐시/피처플래그를 사용
  const cacheKey = `products:${category}`;
  let products = await cache.get<Product[]>(cacheKey);

  if (!products) {
    products = await db.product.findMany({
      where: { category, active: true },
      orderBy: { createdAt: "desc" },
    });
    await cache.set(cacheKey, products);
  }

  const showNewUI = await flags.isEnabled("new-product-card");

  return (
    <div>
      {products.map((p) =>
        showNewUI ? (
          <NewProductCard key={p.id} product={p} />
        ) : (
          <ProductCard key={p.id} product={p} />
        )
      )}
    </div>
  );
}
```

### 4.3 환경별 데이터 소스 자동 테스트

```tsx
// src/lib/data-source/__tests__/factory.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { getDataSourceConfig } from "../factory";

describe("DataSource Factory", () => {
  beforeEach(() => {
    // 환경 변수 초기화
    delete process.env.APP_ENV;
  });

  it("production 환경에서 Redis 캐시와 LaunchDarkly를 사용한다", () => {
    process.env.APP_ENV = "production";
    process.env.DATABASE_URL = "postgres://prod";
    process.env.REDIS_URL = "redis://prod";
    process.env.LD_SDK_KEY = "sdk-prod";

    const config = getDataSourceConfig();
    expect(config.cache.provider).toBe("redis");
    expect(config.featureFlags.provider).toBe("launchdarkly");
    expect(config.database.pool.max).toBe(20);
  });

  it("preview 환경에서 메모리 캐시와 정적 플래그를 사용한다", () => {
    process.env.APP_ENV = "preview";
    process.env.PREVIEW_DATABASE_URL = "postgres://preview";

    const config = getDataSourceConfig();
    expect(config.cache.provider).toBe("memory");
    expect(config.featureFlags.provider).toBe("static");
    expect(config.database.pool.max).toBe(3);
  });

  it("APP_ENV가 없으면 preview로 폴백한다", () => {
    process.env.PREVIEW_DATABASE_URL = "postgres://preview";

    const config = getDataSourceConfig();
    expect(config.cache.provider).toBe("memory");
  });
});
```

---

## 5. 멀티 베타: Preview Suspense 디버그 패널

Preview/Beta 환경에서 Suspense 경계의 상태를 시각적으로 추적하는 디버그 패널을 제공한다. 프로덕션에서는 자동으로 비활성화된다.

### 5.1 Suspense 래퍼 + 타이밍 수집

```tsx
// src/lib/debug/suspense-tracker.ts
export interface SuspenseEvent {
  id: string;
  name: string;
  status: "pending" | "resolved" | "error";
  startedAt: number;
  resolvedAt?: number;
  duration?: number;
  error?: string;
}

class SuspenseTracker {
  private events = new Map<string, SuspenseEvent>();
  private listeners = new Set<(events: SuspenseEvent[]) => void>();

  track(id: string, name: string): void {
    const event: SuspenseEvent = {
      id,
      name,
      status: "pending",
      startedAt: performance.now(),
    };
    this.events.set(id, event);
    this.notify();
  }

  resolve(id: string): void {
    const event = this.events.get(id);
    if (!event) return;
    event.status = "resolved";
    event.resolvedAt = performance.now();
    event.duration = event.resolvedAt - event.startedAt;
    this.notify();
  }

  error(id: string, error: string): void {
    const event = this.events.get(id);
    if (!event) return;
    event.status = "error";
    event.error = error;
    event.resolvedAt = performance.now();
    event.duration = event.resolvedAt - event.startedAt;
    this.notify();
  }

  subscribe(listener: (events: SuspenseEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = Array.from(this.events.values());
    this.listeners.forEach((fn) => fn(snapshot));
  }
}

export const suspenseTracker = new SuspenseTracker();
```

### 5.2 TrackedSuspense 컴포넌트

```tsx
// src/components/debug/TrackedSuspense.tsx
"use client";

import { Suspense, useId, useEffect, type ReactNode } from "react";
import { suspenseTracker } from "@/lib/debug/suspense-tracker";

interface TrackedSuspenseProps {
  name: string;
  fallback: ReactNode;
  children: ReactNode;
}

function TrackResolved({ id }: { id: string }) {
  useEffect(() => {
    suspenseTracker.resolve(id);
  }, [id]);
  return null;
}

export function TrackedSuspense({
  name,
  fallback,
  children,
}: TrackedSuspenseProps) {
  const id = useId();

  useEffect(() => {
    suspenseTracker.track(id, name);
  }, [id, name]);

  // 프로덕션에서는 일반 Suspense로 동작
  if (process.env.NODE_ENV === "production") {
    return <Suspense fallback={fallback}>{children}</Suspense>;
  }

  return (
    <Suspense fallback={fallback}>
      <TrackResolved id={id} />
      {children}
    </Suspense>
  );
}
```

### 5.3 디버그 패널 UI

```tsx
// src/components/debug/SuspenseDebugPanel.tsx
"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import {
  suspenseTracker,
  type SuspenseEvent,
} from "@/lib/debug/suspense-tracker";

function useTrackerEvents(): SuspenseEvent[] {
  return useSyncExternalStore(
    (cb) => suspenseTracker.subscribe(cb),
    () => [] // getSnapshot — 초기값
  );
}

export function SuspenseDebugPanel() {
  const events = useTrackerEvents();
  const [visible, setVisible] = useState(false);

  // 프로덕션 환경에서는 렌더링하지 않음
  if (process.env.NODE_ENV === "production") return null;

  const pending = events.filter((e) => e.status === "pending");
  const errors = events.filter((e) => e.status === "error");
  const resolved = events.filter((e) => e.status === "resolved");

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 99999,
        fontFamily: "monospace",
        fontSize: 12,
      }}
    >
      <button
        onClick={() => setVisible((v) => !v)}
        style={{
          background: errors.length > 0 ? "#e74c3c" : "#2ecc71",
          color: "white",
          border: "none",
          borderRadius: 20,
          padding: "8px 16px",
          cursor: "pointer",
        }}
      >
        Suspense {pending.length}P / {errors.length}E / {resolved.length}R
      </button>

      {visible && (
        <div
          style={{
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: 16,
            borderRadius: 8,
            maxHeight: 400,
            overflow: "auto",
            marginTop: 8,
            width: 360,
          }}
        >
          <h4 style={{ margin: "0 0 8px", color: "#fff" }}>
            Suspense 경계 상태
          </h4>
          {events.map((e) => (
            <div
              key={e.id}
              style={{
                padding: "4px 0",
                borderBottom: "1px solid #333",
                color:
                  e.status === "error"
                    ? "#e74c3c"
                    : e.status === "pending"
                    ? "#f39c12"
                    : "#2ecc71",
              }}
            >
              <strong>{e.name}</strong> — {e.status}
              {e.duration != null && ` (${e.duration.toFixed(0)}ms)`}
              {e.error && <div style={{ color: "#e74c3c" }}>{e.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5.4 레이아웃에 패널 통합

```tsx
// src/app/layout.tsx
import { SuspenseDebugPanel } from "@/components/debug/SuspenseDebugPanel";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        {/* 프로덕션 빌드에서 tree-shaking으로 제거됨 */}
        {process.env.NODE_ENV !== "production" && <SuspenseDebugPanel />}
      </body>
    </html>
  );
}
```

---

## 6. React Router v7 + React 19 통합

React Router v7이 Remix와 통합되면서, Next.js 없이도 Server Functions + RSC를 사용할 수 있다.

### 6.1 기본 설정

```ts
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  future: {
    unstable_optimizeDeps: true,
  },
} satisfies Config;
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
  ],
});
```

### 6.2 Loader + Server Function 통합

```tsx
// app/routes/products.$id.tsx
import type { Route } from "./+types/products.$id";
import { db } from "~/lib/db";

// loader: 서버에서 데이터 로드 (GET)
export async function loader({ params }: Route.LoaderArgs) {
  const product = await db.product.findUniqueOrThrow({
    where: { id: params.id },
    include: { reviews: { take: 10 } },
  });
  return { product };
}

// action: Server Function (POST/mutation)
export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment"));

  await db.review.create({
    data: {
      productId: params.id,
      rating,
      comment,
    },
  });

  return { success: true };
}

// 컴포넌트
export default function ProductPage({
  loaderData,
}: Route.ComponentProps) {
  const { product } = loaderData;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>

      <section>
        <h2>리뷰</h2>
        {product.reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </section>

      <ReviewForm productId={product.id} />
    </div>
  );
}
```

### 6.3 React Router v7 타입 안전 라우팅

```tsx
// app/routes.ts
import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("layouts/main.tsx", [
    index("routes/home.tsx"),
    route("products", "routes/products.tsx"),
    route("products/:id", "routes/products.$id.tsx"),
    route("cart", "routes/cart.tsx"),
  ]),
  route("login", "routes/login.tsx"),
] satisfies RouteConfig;
```

```tsx
// 타입 안전 네비게이션
import { useNavigate, type NavigateFunction } from "react-router";
import { href } from "react-router";

function ProductLink({ id }: { id: string }) {
  return (
    <a href={href("/products/:id", { id })}>
      상품 보기
    </a>
  );
}
```

---

## 7. TanStack Start vs Next.js 15 비교

2026년 기준 React 19.1을 지원하는 두 풀스택 프레임워크를 비교한다.

### 7.1 기능 비교표

| 기능 | Next.js 15 | TanStack Start |
|------|-----------|----------------|
| React 버전 | 19.1 지원 | 19.1 지원 |
| 서버 렌더링 | RSC 네이티브 | SSR + 스트리밍 (RSC는 별도 설정) |
| 라우팅 | App Router (파일 기반) | TanStack Router (코드 기반 + 타입 안전) |
| 데이터 페칭 | Server Components + fetch cache | TanStack Query 통합, loader 패턴 |
| 서버 함수 | Server Functions 네이티브 | createServerFn() API |
| 빌드 | Turbopack (Webpack 호환) | Vite + Nitro |
| 배포 | Vercel 최적화, 셀프호스트 가능 | 어댑터 기반 (Node, Deno, CF Workers 등) |
| 타입 안전 라우팅 | experimental typedRoutes | TanStack Router 네이티브 |
| 번들 크기 | 큰 편 (프레임워크 오버헤드) | 작은 편 (트리셰이킹 공격적) |
| 커뮤니티/생태계 | 매우 큼 | 성장 중 |

### 7.2 TanStack Start 코드 예시

```tsx
// app/routes/products.$id.tsx (TanStack Start)
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start/server";
import { z } from "zod";

const fetchProduct = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const product = await db.product.findUniqueOrThrow({
      where: { id: data.id },
    });
    return product;
  });

export const Route = createFileRoute("/products/$id")({
  loader: ({ params }) => fetchProduct({ data: { id: params.id } }),
  component: ProductPage,
});

function ProductPage() {
  const product = Route.useLoaderData();

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </div>
  );
}
```

### 7.3 선택 가이드

| 상황 | 추천 |
|------|------|
| Vercel 배포 + 빠른 시작 | Next.js 15 |
| 타입 안전 라우팅이 핵심 | TanStack Start |
| 기존 SPA를 SSR로 전환 | TanStack Start (Vite 생태계 유지) |
| RSC 적극 활용 | Next.js 15 |
| Edge Runtime (CF Workers 등) | TanStack Start |
| 대규모 엔터프라이즈, 안정성 우선 | Next.js 15 |
| React Router v7에서 마이그레이션 | 둘 다 가능 (RR v7은 Remix 기반이므로 Next.js와 구조 유사) |

---

## 8. 체크리스트

### 마이그레이션 체크리스트

- [ ] `forwardRef` → ref를 일반 props로 전환
- [ ] `Context.Provider` → `<Context value={...}>` 직접 렌더링
- [ ] `useMemo`/`useCallback`/`React.memo` → React Compiler 도입 후 제거
- [ ] useEffect 데이터 페칭 → Server Component 또는 Server Function
- [ ] `e.preventDefault()` 폼 → `<form action={...}>` + `useActionState`
- [ ] `react-helmet` → React 19 Document Metadata (`<title>`, `<meta>`)
- [ ] `renderToString` → `renderToReadableStream`

### React 19.1 신기능 도입 체크리스트

- [ ] React Compiler 활성화 (babel-plugin-react-compiler)
- [ ] Compiler 호환성 lint 룰 적용 (`eslint-plugin-react-compiler`)
- [ ] `Activity` API 탐색 (탭/모달 상태 보존 시나리오)
- [ ] Server Functions 보안 가드 패턴 적용
- [ ] `useOptimistic` 도입 (mutation UX 개선)

### 멀티 베타 환경 체크리스트

- [ ] RSC 데이터 소스 팩토리 구현 (환경별 DB/캐시/플래그 분리)
- [ ] Preview 환경 Suspense 디버그 패널 활성화
- [ ] 환경별 DataSource 자동 테스트 작성
- [ ] Preview 환경 리소스 풀 사이즈 제한 확인

### 프레임워크 선택 체크리스트

- [ ] React Router v7 / Next.js 15 / TanStack Start 비교 검토
- [ ] 타입 안전 라우팅 요구사항 확인
- [ ] 배포 타겟(Vercel, Edge, 셀프호스트) 결정
- [ ] 기존 코드베이스와의 호환성 검증
