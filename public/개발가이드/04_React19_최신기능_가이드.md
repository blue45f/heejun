# React 19 실전 가이드 — AI 시대의 프론트엔드 (2026)

## 목차

1. [AI + React 19 개발](#1-ai--react-19-개발)
2. [React Compiler 프로덕션 심화](#2-react-compiler-프로덕션-심화)
3. [Server Components 심화](#3-server-components-심화)
4. [Actions & Forms 고급](#4-actions--forms-고급)
5. [use() Hook 심화](#5-use-hook-심화)
6. [Next.js 15 통합](#6-nextjs-15-통합)
7. [마이그레이션 전략 (React 18 → 19)](#7-마이그레이션-전략-react-18--19)

---

## 1. AI + React 19 개발

AI 코딩 도구를 React 19 개발 워크플로에 통합하면, 보일러플레이트 생성부터 대규모 마이그레이션까지 생산성이 크게 향상된다.

### 1.1 Claude Code로 React 19 컴포넌트 자동 생성

#### 프롬프트 1: Server Component 생성

```
# Claude Code 프롬프트
React 19 Server Component를 작성해줘.
- 파일: src/components/ProductCatalog.tsx
- DB에서 상품 목록을 직접 조회 (prisma 사용)
- 정렬/필터는 searchParams로 받음
- 하위에 클라이언트 인터랙션 컴포넌트를 분리
- Suspense 경계 포함
- TypeScript strict 모드
```

생성 결과 예시:

```tsx
// src/components/ProductCatalog.tsx — Server Component
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { ProductFilter } from "./ProductFilter"; // 'use client'
import { ProductGrid } from "./ProductGrid";

interface SearchParams {
  category?: string;
  sort?: "price" | "name" | "newest";
  page?: string;
}

export async function ProductCatalog({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category, sort = "newest", page = "1" } = searchParams;

  const products = await prisma.product.findMany({
    where: category ? { category } : undefined,
    orderBy: sort === "price"
      ? { price: "asc" }
      : sort === "name"
        ? { name: "asc" }
        : { createdAt: "desc" },
    take: 20,
    skip: (Number(page) - 1) * 20,
  });

  const categories = await prisma.product.findMany({
    select: { category: true },
    distinct: ["category"],
  });

  return (
    <section>
      <ProductFilter
        categories={categories.map((c) => c.category)}
        current={category}
      />
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid products={products} />
      </Suspense>
    </section>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded bg-gray-200" />
      ))}
    </div>
  );
}
```

#### 프롬프트 2: Actions + Zod 폼 생성

```
# Claude Code 프롬프트
React 19 Server Action 기반 폼을 만들어줘.
- 회원가입 폼 (이름, 이메일, 비밀번호, 비밀번호확인)
- Zod 스키마로 서버/클라이언트 양측 검증
- useActionState로 에러 상태 관리
- useOptimistic으로 제출 중 로딩 UX
- Progressive Enhancement (JS 없어도 동작)
```

생성 결과 예시:

```tsx
// src/lib/schemas/auth.ts
import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(2, "이름은 2자 이상이어야 합니다"),
    email: z.string().email("올바른 이메일을 입력하세요"),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다")
      .regex(/[A-Z]/, "대문자를 포함해야 합니다")
      .regex(/[0-9]/, "숫자를 포함해야 합니다"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
```

```tsx
// src/actions/signup.ts
"use server";

import { signupSchema } from "@/lib/schemas/auth";
import { createUser } from "@/lib/db/users";
import { redirect } from "next/navigation";

export type SignupState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function signupAction(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const raw = Object.fromEntries(formData);
  const result = signupSchema.safeParse(raw);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      message: "입력값을 확인해주세요.",
    };
  }

  try {
    await createUser(result.data);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return {
        errors: { email: ["이미 사용 중인 이메일입니다"] },
        message: "가입에 실패했습니다.",
      };
    }
    return { message: "서버 오류가 발생했습니다." };
  }

  redirect("/welcome");
}
```

```tsx
// src/components/SignupForm.tsx
"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "@/actions/signup";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState,
  );

  return (
    <form action={formAction} noValidate>
      <fieldset disabled={isPending}>
        <div>
          <label htmlFor="name">이름</label>
          <input id="name" name="name" type="text" required minLength={2} />
          {state.errors?.name?.map((e) => (
            <p key={e} className="text-red-500 text-sm">{e}</p>
          ))}
        </div>

        <div>
          <label htmlFor="email">이메일</label>
          <input id="email" name="email" type="email" required />
          {state.errors?.email?.map((e) => (
            <p key={e} className="text-red-500 text-sm">{e}</p>
          ))}
        </div>

        <div>
          <label htmlFor="password">비밀번호</label>
          <input id="password" name="password" type="password" required minLength={8} />
          {state.errors?.password?.map((e) => (
            <p key={e} className="text-red-500 text-sm">{e}</p>
          ))}
        </div>

        <div>
          <label htmlFor="confirmPassword">비밀번호 확인</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required />
          {state.errors?.confirmPassword?.map((e) => (
            <p key={e} className="text-red-500 text-sm">{e}</p>
          ))}
        </div>

        {state.message && !state.success && (
          <p className="text-red-600">{state.message}</p>
        )}

        <button type="submit">
          {isPending ? "가입 중..." : "회원가입"}
        </button>
      </fieldset>
    </form>
  );
}
```

#### 프롬프트 3: use() Hook 패턴

```
# Claude Code 프롬프트
React 19 use() Hook을 활용한 데이터 패칭 컴포넌트를 만들어줘.
- 부모에서 Promise를 생성해 자식에 prop으로 전달
- Suspense 워터폴 방지 (병렬 패칭)
- 조건부 Context 소비 포함
- 에러 바운더리 연동
- TypeScript
```

생성 결과 예시:

```tsx
// src/components/Dashboard.tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { fetchUserProfile, fetchNotifications, fetchStats } from "@/lib/api";
import { DashboardContent } from "./DashboardContent";

export function Dashboard({ userId }: { userId: string }) {
  // 병렬로 Promise 생성 — 워터폴 방지 핵심
  const profilePromise = fetchUserProfile(userId);
  const notificationsPromise = fetchNotifications(userId);
  const statsPromise = fetchStats(userId);

  return (
    <ErrorBoundary fallback={<div>오류가 발생했습니다.</div>}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          profilePromise={profilePromise}
          notificationsPromise={notificationsPromise}
          statsPromise={statsPromise}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
```

```tsx
// src/components/DashboardContent.tsx
"use client";

import { use, createContext } from "react";
import type { Profile, Notification, Stats } from "@/types";

const ThemeContext = createContext<"light" | "dark">("light");

interface Props {
  profilePromise: Promise<Profile>;
  notificationsPromise: Promise<Notification[]>;
  statsPromise: Promise<Stats>;
}

export function DashboardContent({
  profilePromise,
  notificationsPromise,
  statsPromise,
}: Props) {
  // use()로 Promise 소비 — Suspense가 대기 처리
  const profile = use(profilePromise);
  const notifications = use(notificationsPromise);
  const stats = use(statsPromise);

  // 조건부 Context 소비 — use()만 가능 (useContext는 불가)
  const theme = profile.prefersDark ? use(ThemeContext) : "light";

  return (
    <div data-theme={theme}>
      <h1>{profile.name}님의 대시보드</h1>
      <StatsPanel stats={stats} />
      <NotificationList items={notifications} />
    </div>
  );
}
```

### 1.2 Copilot / Cursor로 클래스 → 함수 컴포넌트 마이그레이션

Cursor의 Composer나 Copilot Chat을 활용하면 대량의 클래스 컴포넌트를 함수 컴포넌트로 자동 변환할 수 있다.

**Cursor Composer 프롬프트 예시:**

```
이 파일의 클래스 컴포넌트를 React 19 함수 컴포넌트로 변환해줘.
- componentDidMount → useEffect
- componentWillUnmount → useEffect cleanup
- this.state → useState
- this.props → 구조분해 파라미터
- getDerivedStateFromProps → useMemo 또는 렌더 중 계산
- shouldComponentUpdate → 제거 (React Compiler가 처리)
- ref forwarding → ref를 일반 prop으로 전달 (React 19)
- Context.Consumer → use(Context)
- 모든 타입을 TypeScript interface로
```

**변환 전후 비교:**

```tsx
// 변환 전: 클래스 컴포넌트
class UserCard extends React.Component<Props, State> {
  static contextType = ThemeContext;

  state = { isExpanded: false };

  componentDidMount() {
    analytics.track("user_card_view", { id: this.props.userId });
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return nextProps.userId !== this.props.userId
      || nextState.isExpanded !== this.state.isExpanded;
  }

  render() {
    const theme = this.context as Theme;
    return (
      <div className={theme.card}>
        <span>{this.props.name}</span>
        {this.state.isExpanded && <UserDetails userId={this.props.userId} />}
        <button onClick={() => this.setState({ isExpanded: !this.state.isExpanded })}>
          토글
        </button>
      </div>
    );
  }
}
```

```tsx
// 변환 후: React 19 함수 컴포넌트
function UserCard({ userId, name }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = use(ThemeContext); // use()로 Context 소비

  useEffect(() => {
    analytics.track("user_card_view", { id: userId });
  }, [userId]);

  // shouldComponentUpdate 제거 — React Compiler가 자동 최적화

  return (
    <div className={theme.card}>
      <span>{name}</span>
      {isExpanded && <UserDetails userId={userId} />}
      <button onClick={() => setIsExpanded((prev) => !prev)}>토글</button>
    </div>
  );
}
```

### 1.3 AI 기반 React 18 → 19 마이그레이션 전략

```bash
# 1단계: codemod로 기계적 변환 먼저 실행
npx codemod@latest react/19/replace-reactdom-render
npx codemod@latest react/19/replace-string-ref
npx codemod@latest react/19/replace-use-form-state

# 2단계: AI로 변환 결과 검토
# Claude Code에 프로젝트 전체를 컨텍스트로 주고 검토 요청
```

**Claude Code 검토 프롬프트:**

```
React 18→19 codemod를 실행한 직후 상태다.
다음 항목을 검토하고 수정해줘:
1. forwardRef → ref prop 직접 전달로 변환
2. useContext → use()로 변환 가능한 곳 식별 (조건부 분기 내부)
3. React.lazy 대신 Server Component로 전환 가능한 곳 추천
4. useMemo/useCallback 제거 가능 여부 (Compiler 적용 전제)
5. 제거된 API 사용 여부 (propTypes, defaultProps, createFactory 등)
```

### 1.4 .cursorrules / CLAUDE.md에 React 19 컨벤션 설정

프로젝트 루트에 AI 도구별 설정 파일을 배치하면, AI가 생성하는 코드가 팀 컨벤션에 맞게 나온다.

**.cursorrules 예시:**

```
# React 19 프로젝트 컨벤션

## 컴포넌트 작성 규칙
- 함수 선언문(function) 사용, 화살표 함수 금지
- Server Component가 기본값. 클라이언트 필요 시에만 'use client' 추가
- forwardRef 사용 금지 — ref를 일반 prop으로 전달
- useMemo, useCallback, React.memo 사용 금지 — React Compiler에 위임
- Context 소비 시 useContext 대신 use(Context) 우선 사용

## Server Actions
- 'use server' 파일은 src/actions/ 디렉토리에 배치
- 모든 Server Action은 Zod 스키마로 입력 검증 필수
- 인증 체크는 Action 최상단에서 수행

## 타입
- interface 우선, type alias는 유니온/인터섹션에만 사용
- Props 타입은 컴포넌트 파일 내에 정의
- 제네릭 컴포넌트 허용

## 파일 구조
- 페이지: src/app/[route]/page.tsx
- 컴포넌트: src/components/[Feature]/index.tsx
- Server Actions: src/actions/[domain].ts
- 스키마: src/lib/schemas/[domain].ts
```

**CLAUDE.md 예시:**

```markdown
# CLAUDE.md

이 프로젝트는 React 19 + Next.js 15 (App Router) + TypeScript strict 모드이다.

## 핵심 규칙
- Server Component를 기본으로 사용한다. 이벤트 핸들러, useState, useEffect가
  필요한 경우에만 'use client'를 선언한다.
- React Compiler가 활성화되어 있다. useMemo, useCallback, React.memo를 직접
  사용하지 않는다.
- 폼은 Server Action + useActionState + Zod 조합으로 구현한다.
- 데이터 패칭은 Server Component에서 직접 수행하거나, use() Hook으로
  Promise를 소비한다. useEffect + fetch 패턴은 사용하지 않는다.

## 금지 패턴
- forwardRef (ref를 일반 prop으로 전달)
- defaultProps (ES 기본 파라미터 사용)
- propTypes (TypeScript로 대체)
- createFactory, createElement 직접 호출
- string ref
```

---

## 2. React Compiler 프로덕션 심화

### 2.1 자동 메모이제이션 동작 원리

React Compiler는 빌드 타임에 컴포넌트를 정적 분석하여, 값과 함수의 의존성 그래프를 파악한 뒤 자동으로 메모이제이션 코드를 삽입한다.

```tsx
// 개발자가 작성하는 코드
function PriceDisplay({ items, taxRate }: Props) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal * (1 + taxRate);

  return <span>{total.toLocaleString()}원</span>;
}

// Compiler가 내부적으로 변환하는 결과 (개념적 표현)
function PriceDisplay({ items, taxRate }: Props) {
  const $ = _c(3); // 캐시 슬롯 3개 할당

  let subtotal;
  if ($[0] !== items) {
    subtotal = items.reduce((sum, item) => sum + item.price, 0);
    $[0] = items;
    $[1] = subtotal;
  } else {
    subtotal = $[1];
  }

  const total = subtotal * (1 + taxRate);

  let t0;
  if ($[2] !== total) {
    t0 = <span>{total.toLocaleString()}원</span>;
    $[2] = total;
  } else {
    t0 = $[2];
  }

  return t0;
}
```

### 2.2 Compiler의 한계 3가지

**한계 1: 외부 뮤터블 상태에 의존하는 코드**

```tsx
// Compiler가 올바르게 최적화할 수 없음
let globalCounter = 0;

function BrokenCounter() {
  globalCounter++; // 외부 변수 뮤테이션 — Compiler가 추적 불가
  return <span>{globalCounter}</span>;
}

// 해결: React 상태로 전환
function FixedCounter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)}>{count}</button>
  );
}
```

**한계 2: 동적 프로퍼티 접근 패턴**

```tsx
// Compiler가 의존성을 정확히 추적하기 어려움
function DynamicAccess({ data, key }: { data: Record<string, unknown>; key: string }) {
  // data[key] — key가 런타임에 결정되므로 보수적으로 캐싱 skip
  const value = data[key];
  return <span>{String(value)}</span>;
}

// 해결: 명시적 구조를 사용
function ExplicitAccess({ value }: { value: unknown }) {
  return <span>{String(value)}</span>;
}
```

**한계 3: Hook 규칙을 위반하는 코드**

```tsx
// Compiler가 거부하는 패턴
function ConditionalHook({ shouldFetch }: { shouldFetch: boolean }) {
  if (shouldFetch) {
    const data = use(fetchData()); // 조건부 use()는 가능하지만
    useState(data); // 조건부 useState는 여전히 규칙 위반
  }
  return null;
}
```

### 2.3 'use no memo' 디렉티브

특정 컴포넌트나 Hook에서 Compiler의 자동 메모이제이션을 명시적으로 비활성화할 수 있다. 디버깅, 벤치마크, 혹은 Compiler가 잘못 최적화하는 엣지 케이스에 사용한다.

```tsx
// 컴포넌트 단위 비활성화
function RealTimeChart({ data }: Props) {
  "use no memo"; // 이 컴포넌트는 매 렌더마다 전부 재계산

  // 60fps 실시간 데이터 — 캐싱 오버헤드가 오히려 성능 저하
  const points = data.map((d) => ({ x: d.timestamp, y: d.value }));
  return <Canvas points={points} />;
}

// Hook 단위 비활성화
function useDebugRenderCount() {
  "use no memo";
  const count = useRef(0);
  count.current++;
  console.log(`렌더 횟수: ${count.current}`);
}
```

**사용 케이스 정리:**

| 상황 | 'use no memo' 사용 |
|------|-------------------|
| 실시간 데이터 (60fps) | O — 캐시 비교 오버헤드 제거 |
| 디버깅/프로파일링 | O — 원본 동작 확인 |
| Compiler 버그 우회 | O — 임시 조치 |
| 일반 컴포넌트 | X — Compiler에 위임 |
| 무거운 계산 | X — Compiler가 가장 잘 최적화 |

### 2.4 Compiler 적용 전후 번들/성능 비교

```
┌──────────────────────────┬───────────────┬───────────────┐
│ 지표                     │ Compiler OFF  │ Compiler ON   │
├──────────────────────────┼───────────────┼───────────────┤
│ 번들 사이즈 (gzip)       │ 142 KB        │ 138 KB        │
│ ├ useMemo 호출 수        │ 47            │ 0 (자동)      │
│ ├ useCallback 호출 수    │ 32            │ 0 (자동)      │
│ └ React.memo 래핑 수     │ 18            │ 0 (자동)      │
│ TTI (Time to Interactive)│ 1.8s          │ 1.5s          │
│ 리렌더 횟수 (목록 정렬)  │ 14            │ 3             │
│ Lighthouse Performance   │ 82            │ 91            │
└──────────────────────────┴───────────────┴───────────────┘

* 수동 메모이제이션 코드 제거로 번들 소폭 감소
* 불필요한 리렌더가 자동으로 차단되어 런타임 성능 대폭 향상
* 개발자가 의존성 배열 실수로 인한 버그 원천 제거
```

**설정:**

```typescript
// vite.config.ts — React Compiler 활성화
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
  ],
});
```

```typescript
// next.config.ts — Next.js 15에서 활성화
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
```

---

## 3. Server Components 심화

### 3.1 PPR (Partial Prerendering) 실전 코드

PPR은 하나의 페이지에서 정적 셸을 즉시 보내고, 동적 부분은 스트리밍으로 채워넣는 기술이다.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
};
```

```tsx
// src/app/product/[id]/page.tsx
import { Suspense } from "react";
import { ProductInfo } from "@/components/ProductInfo";
import { ProductReviews } from "@/components/ProductReviews";
import { RecommendedProducts } from "@/components/RecommendedProducts";

// 정적 셸 + 동적 영역을 하나의 페이지에 혼합
export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <main>
      {/* 정적 영역: 빌드 타임에 렌더링 */}
      <header>
        <h1>상품 상세</h1>
        <nav>홈 &gt; 카테고리 &gt; 상품</nav>
      </header>

      {/* 동적 영역 1: 상품 정보 (DB 조회) */}
      <Suspense fallback={<ProductInfoSkeleton />}>
        <ProductInfo id={id} />
      </Suspense>

      {/* 동적 영역 2: 리뷰 (느린 API) */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews productId={id} />
      </Suspense>

      {/* 동적 영역 3: 추천 상품 (개인화) */}
      <Suspense fallback={<RecommendedSkeleton />}>
        <RecommendedProducts productId={id} />
      </Suspense>

      {/* 정적 영역: 푸터 */}
      <footer>고객센터 | 이용약관 | 개인정보처리방침</footer>
    </main>
  );
}
```

PPR 동작 흐름:

```
1. 초기 응답 (즉시): 정적 셸 + Suspense fallback들
   ┌──────────────────────────────┐
   │ [header — 정적]              │
   │ [ProductInfo — 스켈레톤]     │
   │ [Reviews — 스켈레톤]         │
   │ [Recommended — 스켈레톤]     │
   │ [footer — 정적]              │
   └──────────────────────────────┘

2. 스트리밍 (순서 무관, 준비되는 대로):
   - ProductInfo 완료 → 스켈레톤 교체
   - RecommendedProducts 완료 → 스켈레톤 교체
   - ProductReviews 완료 → 스켈레톤 교체
```

### 3.2 Streaming SSR + 계층적 Suspense

```tsx
// 계층적 Suspense — 세분화된 로딩 상태
export default async function OrderPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderLayout orderId={params.id}>
        {/* Level 1: 주문 기본 정보 (빠름) */}
        <Suspense fallback={<OrderHeaderSkeleton />}>
          <OrderHeader orderId={params.id} />
        </Suspense>

        <div className="grid grid-cols-2 gap-4">
          {/* Level 2a: 주문 상품 목록 */}
          <Suspense fallback={<OrderItemsSkeleton />}>
            <OrderItems orderId={params.id} />
          </Suspense>

          {/* Level 2b: 배송 추적 (외부 API, 느림) */}
          <Suspense fallback={<TrackingSkeleton />}>
            <DeliveryTracking orderId={params.id} />
          </Suspense>
        </div>

        {/* Level 2c: 관련 주문 추천 (가장 느림) */}
        <Suspense fallback={<RecommendationSkeleton />}>
          <RelatedOrders orderId={params.id} />
        </Suspense>
      </OrderLayout>
    </Suspense>
  );
}
```

### 3.3 Server/Client 경계 설계 원칙

```
트리 다이어그램 — Server/Client 경계:

  page.tsx (Server)
  ├── Header (Server) ─── 정적 내비게이션
  │   └── SearchBar (Client) ─── 'use client' 인터랙션
  │
  ├── ProductList (Server) ─── DB 직접 조회
  │   ├── ProductCard (Server) ─── 정적 렌더
  │   │   └── AddToCartButton (Client) ─── 'use client' 이벤트
  │   └── ProductCard (Server)
  │       └── AddToCartButton (Client)
  │
  ├── Sidebar (Server) ─── 카테고리 목록 조회
  │   └── FilterPanel (Client) ─── 'use client' 상태 관리
  │
  └── Footer (Server) ─── 정적 콘텐츠

설계 원칙:
1. 'use client' 경계는 가능한 한 트리 하단(리프)에 배치한다
2. Server Component에서 데이터를 조회하고, 직렬화 가능한 props로 전달한다
3. 이벤트 핸들러, useState, useEffect가 필요한 최소 단위만 Client Component로 분리한다
4. Client Component 안에서 Server Component를 children으로 받을 수 있다 (구멍 패턴)
```

**구멍 패턴 (Composition Pattern):**

```tsx
// ClientWrapper.tsx — 'use client'
"use client";

import { useState } from "react";

export function Tabs({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="tabs">
        <button onClick={() => setActiveTab(0)}>탭 1</button>
        <button onClick={() => setActiveTab(1)}>탭 2</button>
      </div>
      {/* children은 Server Component일 수 있다 */}
      <div>{children}</div>
    </div>
  );
}

// page.tsx — Server Component
import { Tabs } from "./Tabs";
import { HeavyContent } from "./HeavyContent"; // Server Component

export default function Page() {
  return (
    <Tabs>
      {/* HeavyContent는 서버에서 렌더링되어 HTML로 전달 */}
      <HeavyContent />
    </Tabs>
  );
}
```

### 3.4 RSC에서 무거운 라이브러리 활용 (번들 0KB)

Server Component에서 사용하는 라이브러리는 클라이언트 번들에 포함되지 않는다.

```tsx
// src/components/MarkdownArticle.tsx — Server Component
// 이 라이브러리들은 클라이언트에 전송되지 않음 → 번들 0KB
import { unified } from "unified";          // ~200KB
import remarkParse from "remark-parse";      // ~100KB
import remarkRehype from "remark-rehype";    // ~50KB
import rehypeSanitize from "rehype-sanitize"; // ~30KB
import rehypeStringify from "rehype-stringify"; // ~40KB
import { highlight } from "sugar-high";       // ~10KB

// 총 ~430KB가 클라이언트 번들에 포함되지 않음

export async function MarkdownArticle({ content }: { content: string }) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(content);

  return (
    <article
      className="prose"
      dangerouslySetInnerHTML={{ __html: String(result) }}
    />
  );
}
```

```tsx
// src/components/ChartReport.tsx — Server Component
import { Chart } from "chart-renderer"; // 서버 전용, 번들 미포함
import { prisma } from "@/lib/db";

export async function ChartReport({ period }: { period: string }) {
  const data = await prisma.salesData.findMany({
    where: { period },
    orderBy: { date: "asc" },
  });

  // 서버에서 SVG로 렌더링 → 클라이언트에는 SVG 문자열만 전달
  const svg = Chart.renderToSVG({
    type: "line",
    data: data.map((d) => ({ x: d.date, y: d.revenue })),
    width: 800,
    height: 400,
  });

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

---

## 4. Actions & Forms 고급

### 4.1 useActionState + Zod 전체 예제

```tsx
// src/lib/schemas/post.ts
import { z } from "zod";

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, "제목을 입력하세요")
    .max(100, "제목은 100자 이내여야 합니다"),
  content: z
    .string()
    .min(10, "내용은 10자 이상이어야 합니다")
    .max(10000, "내용은 10000자 이내여야 합니다"),
  category: z.enum(["tech", "life", "news"], {
    errorMap: () => ({ message: "카테고리를 선택하세요" }),
  }),
  tags: z
    .string()
    .transform((val) => val.split(",").map((t) => t.trim()).filter(Boolean))
    .pipe(z.array(z.string()).max(5, "태그는 5개 이내여야 합니다")),
  isPublished: z
    .string()
    .optional()
    .transform((val) => val === "on"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
```

```tsx
// src/actions/post.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPostSchema } from "@/lib/schemas/post";
import { revalidatePath } from "next/cache";

export type PostActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function createPostAction(
  prevState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  // 1. 인증 체크
  const session = await auth();
  if (!session?.user) {
    return { message: "로그인이 필요합니다." };
  }

  // 2. Zod 검증
  const raw = Object.fromEntries(formData);
  const result = createPostSchema.safeParse(raw);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      message: "입력값을 확인해주세요.",
    };
  }

  // 3. DB 저장
  try {
    await prisma.post.create({
      data: {
        ...result.data,
        authorId: session.user.id,
      },
    });
  } catch {
    return { message: "게시글 저장에 실패했습니다." };
  }

  // 4. 캐시 갱신
  revalidatePath("/posts");

  return { success: true, message: "게시글이 등록되었습니다." };
}
```

```tsx
// src/components/CreatePostForm.tsx
"use client";

import { useActionState, useRef, useEffect } from "react";
import { createPostAction, type PostActionState } from "@/actions/post";

const initialState: PostActionState = {};

export function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(
    createPostAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction}>
      <div>
        <label htmlFor="title">제목</label>
        <input id="title" name="title" type="text" required maxLength={100} />
        {state.errors?.title?.map((e) => (
          <p key={e} className="text-sm text-red-500">{e}</p>
        ))}
      </div>

      <div>
        <label htmlFor="content">내용</label>
        <textarea id="content" name="content" rows={10} required minLength={10} />
        {state.errors?.content?.map((e) => (
          <p key={e} className="text-sm text-red-500">{e}</p>
        ))}
      </div>

      <div>
        <label htmlFor="category">카테고리</label>
        <select id="category" name="category" required>
          <option value="">선택하세요</option>
          <option value="tech">기술</option>
          <option value="life">일상</option>
          <option value="news">뉴스</option>
        </select>
        {state.errors?.category?.map((e) => (
          <p key={e} className="text-sm text-red-500">{e}</p>
        ))}
      </div>

      <div>
        <label htmlFor="tags">태그 (쉼표 구분)</label>
        <input id="tags" name="tags" type="text" placeholder="react, typescript" />
        {state.errors?.tags?.map((e) => (
          <p key={e} className="text-sm text-red-500">{e}</p>
        ))}
      </div>

      <div>
        <label>
          <input name="isPublished" type="checkbox" defaultChecked />
          즉시 공개
        </label>
      </div>

      {state.message && (
        <p className={state.success ? "text-green-600" : "text-red-600"}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "게시하기"}
      </button>
    </form>
  );
}
```

### 4.2 useOptimistic 다중 액션 (add / delete / update)

```tsx
// src/components/TodoList.tsx
"use client";

import { useOptimistic, useActionState } from "react";
import { addTodo, deleteTodo, updateTodo } from "@/actions/todo";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

type OptimisticAction =
  | { type: "add"; todo: Todo }
  | { type: "delete"; id: string }
  | { type: "update"; id: string; changes: Partial<Todo> };

export function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [optimisticTodos, dispatch] = useOptimistic(
    initialTodos,
    (state: Todo[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.todo];
        case "delete":
          return state.filter((t) => t.id !== action.id);
        case "update":
          return state.map((t) =>
            t.id === action.id ? { ...t, ...action.changes } : t,
          );
      }
    },
  );

  async function handleAdd(formData: FormData) {
    const text = formData.get("text") as string;
    const tempId = `temp-${Date.now()}`;

    dispatch({
      type: "add",
      todo: { id: tempId, text, completed: false },
    });

    await addTodo(text);
  }

  async function handleDelete(id: string) {
    dispatch({ type: "delete", id });
    await deleteTodo(id);
  }

  async function handleToggle(id: string, completed: boolean) {
    dispatch({
      type: "update",
      id,
      changes: { completed: !completed },
    });
    await updateTodo(id, { completed: !completed });
  }

  return (
    <div>
      <form action={handleAdd}>
        <input name="text" type="text" required placeholder="할 일 입력" />
        <button type="submit">추가</button>
      </form>

      <ul>
        {optimisticTodos.map((todo) => (
          <li
            key={todo.id}
            style={{
              opacity: todo.id.startsWith("temp-") ? 0.5 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo.id, todo.completed)}
            />
            <span
              style={{
                textDecoration: todo.completed ? "line-through" : "none",
              }}
            >
              {todo.text}
            </span>
            <button onClick={() => handleDelete(todo.id)}>삭제</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4.3 Progressive Enhancement 폼

JS가 비활성화되어도 동작하는 폼을 구현한다. `action` 속성으로 Server Action을 직접 연결하면, 브라우저 기본 폼 제출로도 동작한다.

```tsx
// src/components/FeedbackForm.tsx
"use client";

import { useActionState } from "react";
import { submitFeedback, type FeedbackState } from "@/actions/feedback";

export function FeedbackForm() {
  const [state, formAction, isPending] = useActionState(
    submitFeedback,
    {} as FeedbackState,
  );

  return (
    // action={formAction} — JS 활성화 시 클라이언트에서 처리
    // JS 비활성화 시 서버로 폼 데이터 직접 전송
    <form action={formAction}>
      <label htmlFor="rating">평점</label>
      <select id="rating" name="rating" required>
        <option value="">선택</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{n}점</option>
        ))}
      </select>

      <label htmlFor="comment">의견</label>
      <textarea id="comment" name="comment" required minLength={5} />

      {state.message && (
        <p className={state.success ? "text-green-600" : "text-red-600"}>
          {state.message}
        </p>
      )}

      {/* noscript: JS 없이 제출 버튼 항상 활성화 */}
      <button type="submit" disabled={isPending}>
        {isPending ? "제출 중..." : "제출"}
      </button>

      <noscript>
        <style>{`.text-green-600, .text-red-600 { display: none; }`}</style>
      </noscript>
    </form>
  );
}
```

### 4.4 Server Actions 보안 (인증/인가 체크)

```tsx
// src/actions/admin.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// 보안 래퍼: 모든 Server Action에 인증/인가 적용
function protectedAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  roles: string[],
  handler: (input: TInput, userId: string) => Promise<TOutput>,
) {
  return async (formData: FormData): Promise<TOutput | { error: string }> => {
    // 1. 인증 체크
    const session = await auth();
    if (!session?.user) {
      return { error: "로그인이 필요합니다." };
    }

    // 2. 인가 체크
    if (roles.length > 0 && !roles.includes(session.user.role)) {
      return { error: "권한이 없습니다." };
    }

    // 3. 입력 검증
    const raw = Object.fromEntries(formData);
    const result = schema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }

    // 4. Rate limiting (예시)
    const recentActions = await prisma.actionLog.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });

    if (recentActions > 10) {
      return { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." };
    }

    // 5. 실행 및 감사 로그
    try {
      const output = await handler(result.data, session.user.id);
      await prisma.actionLog.create({
        data: {
          userId: session.user.id,
          action: handler.name,
          input: JSON.stringify(result.data),
        },
      });
      return output;
    } catch {
      return { error: "서버 오류가 발생했습니다." };
    }
  };
}

// 사용 예시
const deleteUserSchema = z.object({
  userId: z.string().uuid(),
});

export const deleteUserAction = protectedAction(
  deleteUserSchema,
  ["admin"], // admin 역할만 허용
  async (input, _currentUserId) => {
    await prisma.user.delete({ where: { id: input.userId } });
    return { success: true };
  },
);
```

---

## 5. use() Hook 심화

### 5.1 조건부 Context 소비

`use()`는 일반 Hook과 달리 `if` 블록이나 `for` 루프 안에서 호출할 수 있다. 이를 통해 조건부로 Context를 소비하는 패턴이 가능하다.

```tsx
"use client";

import { use, createContext } from "react";

const AdminContext = createContext<{ permissions: string[] } | null>(null);
const ThemeContext = createContext<"light" | "dark">("light");

interface Props {
  isAdmin: boolean;
  showTheme: boolean;
}

export function ConditionalPanel({ isAdmin, showTheme }: Props) {
  // 조건부 Context 소비 — useContext로는 불가능
  const admin = isAdmin ? use(AdminContext) : null;
  const theme = showTheme ? use(ThemeContext) : "light";

  return (
    <div data-theme={theme}>
      {admin && (
        <div>
          <h3>관리자 패널</h3>
          <ul>
            {admin.permissions.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 5.2 Promise 캐싱 3전략

Promise를 매 렌더마다 새로 생성하면, `use()`가 매번 새 Promise를 구독하여 무한 Suspense에 빠질 수 있다. 아래 3가지 전략으로 방지한다.

**전략 1: Prop으로 Promise 전달 (부모에서 생성)**

```tsx
// 부모 Server Component에서 생성
export default function Page({ params }: { params: { id: string } }) {
  // 렌더마다 한 번만 생성됨 (Server Component는 한 번만 실행)
  const dataPromise = fetchData(params.id);

  return (
    <Suspense fallback={<Loading />}>
      <DataDisplay dataPromise={dataPromise} />
    </Suspense>
  );
}

// 자식에서 소비
"use client";
function DataDisplay({ dataPromise }: { dataPromise: Promise<Data> }) {
  const data = use(dataPromise);
  return <div>{data.title}</div>;
}
```

**전략 2: 모듈 레벨 cache 함수**

```tsx
// src/lib/api.ts
import { cache } from "react";

// React.cache()는 같은 렌더 트리 내에서 동일 인자에 대해 결과를 공유
export const fetchUser = cache(async (userId: string) => {
  const res = await fetch(`/api/users/${userId}`);
  return res.json() as Promise<User>;
});

// 같은 렌더에서 여러 컴포넌트가 fetchUser("123")을 호출해도
// 실제 네트워크 요청은 한 번만 발생
```

**전략 3: useMemo로 래핑 (클라이언트 전용)**

```tsx
"use client";

import { use, useMemo } from "react";

function SearchResults({ query }: { query: string }) {
  // query가 변경될 때만 새 Promise 생성
  const resultsPromise = useMemo(
    () => fetch(`/api/search?q=${query}`).then((r) => r.json()),
    [query],
  );

  const results = use(resultsPromise);

  return (
    <ul>
      {results.map((r: { id: string; title: string }) => (
        <li key={r.id}>{r.title}</li>
      ))}
    </ul>
  );
}
```

### 5.3 Suspense 워터폴 방지

```tsx
// 문제: 워터폴 — 순차 실행
function BadDashboard({ userId }: { userId: string }) {
  // fetchProfile이 완료된 후에야 fetchPosts 시작
  const profile = use(fetchProfile(userId));     // 500ms
  const posts = use(fetchPosts(userId));         // 300ms
  const notifications = use(fetchNotifications(userId)); // 200ms
  // 총 대기: 1000ms (순차)

  return <div>...</div>;
}

// 해결: 병렬 Promise 생성은 부모에서
function GoodDashboard({ userId }: { userId: string }) {
  // 세 요청을 동시에 시작
  const profilePromise = fetchProfile(userId);       // 시작
  const postsPromise = fetchPosts(userId);           // 동시 시작
  const notificationsPromise = fetchNotifications(userId); // 동시 시작

  return (
    <>
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile dataPromise={profilePromise} />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <Posts dataPromise={postsPromise} />
      </Suspense>
      <Suspense fallback={<NotificationsSkeleton />}>
        <Notifications dataPromise={notificationsPromise} />
      </Suspense>
    </>
  );
  // 총 대기: ~500ms (병렬, 가장 느린 요청 기준)
}
```

---

## 6. Next.js 15 통합

### 6.1 App Router + Turbopack

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
    ppr: true,
    // Turbopack은 next dev --turbopack 으로 활성화
  },
};

export default nextConfig;
```

```bash
# 개발 서버 — Turbopack으로 HMR 극적 향상
npx next dev --turbopack

# 빌드는 여전히 Webpack (Turbopack 프로덕션 빌드 지원 예정)
npx next build
```

**App Router 파일 구조:**

```
src/app/
├── layout.tsx          # 루트 레이아웃 (Server Component)
├── page.tsx            # 홈페이지
├── loading.tsx         # 루트 로딩 UI
├── error.tsx           # 루트 에러 UI ('use client')
├── not-found.tsx       # 404 UI
├── posts/
│   ├── page.tsx        # /posts
│   ├── loading.tsx     # /posts 로딩 UI
│   ├── [slug]/
│   │   ├── page.tsx    # /posts/:slug
│   │   └── opengraph-image.tsx  # OG 이미지 자동 생성
│   └── new/
│       └── page.tsx    # /posts/new
├── api/
│   └── webhook/
│       └── route.ts    # API Route Handler
└── (admin)/            # 라우트 그룹 — URL에 미반영
    ├── layout.tsx      # 어드민 전용 레이아웃
    └── dashboard/
        └── page.tsx    # /dashboard
```

### 6.2 미들웨어 패턴

```typescript
// middleware.ts (프로젝트 루트)
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 인증 체크
  const token = request.cookies.get("session-token")?.value;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isProtectedPage = pathname.startsWith("/dashboard") || pathname.startsWith("/settings");

  if (isProtectedPage && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. 국제화 (i18n) 리다이렉트
  const locale = request.headers.get("accept-language")?.split(",")[0]?.split("-")[0];
  if (pathname === "/" && locale === "en") {
    return NextResponse.redirect(new URL("/en", request.url));
  }

  // 3. Rate Limiting 헤더
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", "100");
  response.headers.set("X-Request-Id", crypto.randomUUID());

  // 4. 보안 헤더
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    // 정적 파일과 API 제외
    "/((?!_next/static|_next/image|favicon.ico|api/webhook).*)",
  ],
};
```

### 6.3 revalidatePath / revalidateTag

```tsx
// Server Action에서 캐시 무효화
"use server";

import { revalidatePath, revalidateTag } from "next/cache";

// 방법 1: 경로 기반 무효화
export async function updatePost(id: string, data: PostInput) {
  await prisma.post.update({ where: { id }, data });

  revalidatePath("/posts");           // /posts 페이지 캐시 무효화
  revalidatePath(`/posts/${id}`);     // 특정 포스트 페이지 무효화
  revalidatePath("/posts", "layout"); // 레이아웃 포함 무효화
}

// 방법 2: 태그 기반 무효화 (세밀한 제어)
export async function updateUserProfile(userId: string, data: ProfileInput) {
  await prisma.user.update({ where: { id: userId }, data });

  revalidateTag(`user-${userId}`);   // 이 사용자 관련 캐시만 무효화
  revalidateTag("leaderboard");      // 리더보드 캐시 무효화
}
```

```tsx
// 태그를 활용한 데이터 패칭
// src/lib/api.ts

export async function getUser(userId: string) {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    next: {
      tags: [`user-${userId}`, "users"],  // 태그 부여
      revalidate: 3600,                   // 1시간 후 자동 갱신
    },
  });
  return res.json();
}

export async function getPosts() {
  const res = await fetch(`${API_URL}/posts`, {
    next: {
      tags: ["posts"],
      revalidate: 60,  // 1분마다 백그라운드 갱신
    },
  });
  return res.json();
}

// 동적 데이터 — 캐시하지 않음
export async function getNotifications(userId: string) {
  const res = await fetch(`${API_URL}/notifications/${userId}`, {
    cache: "no-store",
  });
  return res.json();
}
```

---

## 7. 마이그레이션 전략 (React 18 -> 19)

### 7.1 4단계 마이그레이션 계획

```
┌─────────────────────────────────────────────────────────┐
│                  React 18 → 19 마이그레이션              │
├─────────┬───────────────────────────────────────────────┤
│ 1단계   │ 준비 및 호환성 점검 (1~2주)                    │
│         │ - React 18.3 업그레이드 (deprecation 경고 확인)│
│         │ - TypeScript 5.x 필수                         │
│         │ - 제거 예정 API 사용 현황 감사                  │
│         │ - 테스트 커버리지 확보 (80% 이상 권장)          │
├─────────┼───────────────────────────────────────────────┤
│ 2단계   │ Codemod 자동 변환 (1일)                        │
│         │ - npx codemod@latest react/19/* 실행           │
│         │ - 변환 결과 diff 검토                          │
│         │ - AI로 변환 누락 및 이상 패턴 검토              │
├─────────┼───────────────────────────────────────────────┤
│ 3단계   │ 수동 마이그레이션 (1~3주)                      │
│         │ - forwardRef → ref prop 변환                   │
│         │ - Context.Provider → Context 직접 사용         │
│         │ - useContext → use() 변환 (조건부 분기 대상)    │
│         │ - React Compiler 점진적 적용                   │
│         │ - Server Components 도입 (해당 시)              │
├─────────┼───────────────────────────────────────────────┤
│ 4단계   │ 최적화 및 안정화 (1~2주)                       │
│         │ - useMemo/useCallback/React.memo 제거          │
│         │ - Compiler 관련 성능 프로파일링                 │
│         │ - E2E 테스트 전체 실행                          │
│         │ - 카나리 배포 → 점진적 롤아웃                   │
└─────────┴───────────────────────────────────────────────┘
```

### 7.2 Codemod 실행

```bash
# 모든 React 19 codemod 한번에 실행
npx codemod@latest react/19/migration-recipe

# 또는 개별 실행
npx codemod@latest react/19/replace-reactdom-render
npx codemod@latest react/19/replace-string-ref
npx codemod@latest react/19/replace-use-form-state
npx codemod@latest react/19/replace-act-import

# 변환 결과 확인
git diff --stat
```

### 7.3 Breaking Changes 요약

| 변경 사항 | React 18 | React 19 | 대응 |
|-----------|----------|----------|------|
| `forwardRef` | 필수 | 불필요 (ref가 일반 prop) | ref를 props에서 직접 받기 |
| `Context.Provider` | `<Ctx.Provider>` | `<Ctx>` 직접 사용 | JSX 태그 변경 |
| `useContext` | `useContext(Ctx)` | `use(Ctx)` 가능 | 조건부 분기에서는 use() 사용 |
| `ref` 콜백 | cleanup 없음 | cleanup 함수 반환 가능 | 기존 코드 호환, 신규 코드에 활용 |
| `useDeferredValue` | 초기값 없음 | 초기값 인자 추가 | 선택적 마이그레이션 |
| `propTypes` | 런타임 검증 | 제거됨 | TypeScript로 전환 |
| `defaultProps` | 지원 | 함수 컴포넌트에서 제거 | ES 기본 파라미터로 전환 |
| `string ref` | deprecated | 제거됨 | `useRef` 또는 콜백 ref 사용 |
| `react-test-renderer` | 지원 | deprecated | `@testing-library/react` 전환 |
| `ReactDOM.render` | 지원 | 제거됨 | `createRoot` 사용 |
| UMD 빌드 | 지원 | 제거됨 | ESM으로 전환 |

### 7.4 마이그레이션 호환성 체크리스트

```markdown
## 사전 점검
- [ ] Node.js 18+ 환경인가?
- [ ] TypeScript 5.x 이상인가?
- [ ] React 18.3으로 먼저 업그레이드하여 deprecation 경고를 확인했는가?
- [ ] 서드파티 라이브러리가 React 19를 지원하는지 확인했는가?

## 제거된 API
- [ ] `ReactDOM.render` → `createRoot` 전환 완료?
- [ ] `ReactDOM.hydrate` → `hydrateRoot` 전환 완료?
- [ ] `ReactDOM.unmountComponentAtNode` 제거 완료?
- [ ] `ReactDOM.findDOMNode` 제거 완료?
- [ ] `string ref` 제거 완료?
- [ ] `propTypes` / `defaultProps` (함수 컴포넌트) 제거 완료?
- [ ] `createFactory` 제거 완료?
- [ ] `react-test-renderer` → `@testing-library/react` 전환 완료?

## 신규 기능 적용
- [ ] React Compiler 설정 완료?
- [ ] `useMemo` / `useCallback` / `React.memo` 제거?
- [ ] `forwardRef` → ref prop 직접 전달 변환?
- [ ] `Context.Provider` → `Context` 직접 사용 변환?
- [ ] Server Actions 도입 검토?
- [ ] `use()` Hook 활용 검토?

## 테스트 및 배포
- [ ] 단위 테스트 전체 통과?
- [ ] E2E 테스트 전체 통과?
- [ ] Lighthouse 성능 점수 유지 또는 향상?
- [ ] 카나리 배포 후 에러율 모니터링?
- [ ] 롤백 계획 수립?
```

---

> **참고 자료**
> - [React 19 공식 블로그](https://react.dev/blog/2024/12/05/react-19)
> - [React Compiler 문서](https://react.dev/learn/react-compiler)
> - [Next.js 15 문서](https://nextjs.org/docs)
> - [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
