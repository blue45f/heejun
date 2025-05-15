# React 19 최신 기능 가이드 (2025-2026)

## 목차
1. [React 19 주요 변경사항](#react-19-주요-변경사항)
2. [React Compiler (React Forget - 자동 최적화)](#1-react-compiler-react-forget---자동-최적화)
3. [Actions (폼 처리 개선)](#2-actions-폼-처리-개선) - useActionState, useFormStatus, useOptimistic
4. [use() Hook (비동기 데이터)](#3-use-hook-비동기-데이터)
5. [React Server Components 패턴](#4-react-server-components-패턴)
6. [Server Actions](#5-server-actions)
7. [Suspense 개선사항](#6-suspense-개선사항)
8. [Document Metadata](#7-document-metadata-메타데이터)
9. [ref as Prop](#8-ref-as-prop-더-이상-forwardref-불필요)
10. [Context as Provider](#9-context-as-provider-간소화)
11. [개선된 Hydration 에러](#10-개선된-hydration-에러)
12. [Cleanup 함수 반환 타이밍](#11-cleanup-함수-반환-타이밍)
13. [성능 개선](#12-성능-개선)
14. [마이그레이션 가이드](#마이그레이션-가이드)
15. [Best Practices](#best-practices)

---

## React 19 주요 변경사항

**릴리즈**: 2024년 12월
**현재 안정 버전**: 19.1.0 (2025년 3월)
**React Compiler**: 정식 릴리즈 (2025년, `react-compiler-runtime` 포함)
**주요 목표**: 성능 향상, 개발자 경험 개선, 서버 컴포넌트 완성, 자동 메모이제이션

---

## 1. React Compiler (React Forget - 자동 최적화)

### 개요
React Compiler(코드네임 React Forget)는 빌드 타임에 코드를 자동으로 분석하여 `useMemo`, `useCallback`, `React.memo`를 자동으로 추가해주는 컴파일러입니다. 2025년에 정식 릴리즈되어 프로덕션 사용이 가능합니다.

### 핵심 원리
- **빌드 타임 정적 분석**: 컴포넌트와 훅의 의존성을 자동으로 파악
- **세분화된 반응성(Fine-grained Reactivity)**: 값이 변경된 부분만 정확히 재계산
- **Rules of React 준수 검증**: 컴파일 시점에 React 규칙 위반을 감지하여 경고

### 설치 및 설정

```bash
npm install -D babel-plugin-react-compiler
npm install react-compiler-runtime
```

**babel.config.js**
```javascript
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      target: '19', // React 버전 타겟 ('17' | '18' | '19')
    }],
  ],
};
```

**Next.js 15+ 설정**
```javascript
// next.config.js
module.exports = {
  experimental: {
    reactCompiler: true,
  },
};
```

**Vite 설정**
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactCompiler from 'babel-plugin-react-compiler';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', { target: '19' }],
        ],
      },
    }),
  ],
});
```

### Before & After

**React 18 이하 (수동 최적화)**
```typescript
function ExpensiveComponent({ data, filter }) {
  // 수동으로 useMemo 필요
  const filteredData = useMemo(() => {
    return data.filter(item => item.category === filter);
  }, [data, filter]);

  // 수동으로 useCallback 필요
  const handleClick = useCallback(() => {
    console.log('Clicked!');
  }, []);

  return (
    <div>
      {filteredData.map(item => (
        <Item key={item.id} item={item} onClick={handleClick} />
      ))}
    </div>
  );
}
```

**React 19 + Compiler (자동 최적화)**
```typescript
function ExpensiveComponent({ data, filter }) {
  // Compiler가 자동으로 메모이제이션 처리
  // useMemo, useCallback 작성 불필요
  const filteredData = data.filter(item => item.category === filter);

  const handleClick = () => {
    console.log('Clicked!');
  };

  return (
    <div>
      {filteredData.map(item => (
        <Item key={item.id} item={item} onClick={handleClick} />
      ))}
    </div>
  );
}
```

### Compiler 제어

```typescript
'use no memo'; // 특정 컴포넌트 최적화 비활성화

function SimpleComponent() {
  // 이 컴포넌트는 컴파일러가 최적화하지 않음
  return <div>Simple</div>;
}
```

### ESLint 플러그인으로 호환성 사전 검증

```bash
npm install -D eslint-plugin-react-compiler
```

```javascript
// eslint.config.js
import reactCompiler from 'eslint-plugin-react-compiler';

export default [
  {
    plugins: { 'react-compiler': reactCompiler },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },
];
```

> **Tip**: ESLint 플러그인을 먼저 도입하여 Compiler와 호환되지 않는 패턴을 미리 수정한 후 Compiler를 활성화하는 것을 권장합니다.

---

## 2. Actions (폼 처리 개선)

### useActionState (구 useFormState)

> **참고**: React 19에서 `useFormState`는 `useActionState`로 이름이 변경되었습니다. `useFormState`는 deprecated 되었으며, 향후 버전에서 제거될 예정입니다.

**시그니처**
```typescript
const [state, action, isPending] = useActionState(actionFn, initialState, permalink?);
// actionFn: (prevState, formData) => newState (async 가능)
// initialState: 초기 상태 값
// permalink: 선택적, Server Actions에서 progressive enhancement를 위한 URL
```

**기본 사용법**
```typescript
import { useActionState } from 'react';

interface FormState {
  error?: string;
  success?: boolean;
}

async function createUser(prevState: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // 서버 API 호출
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  });

  if (!response.ok) {
    return { error: '사용자 생성에 실패했습니다' };
  }

  return { success: true };
}

function SignUpForm() {
  const [state, action, isPending] = useActionState(createUser, {});

  return (
    <form action={action}>
      <input name="name" required />
      <input name="email" type="email" required />

      <button disabled={isPending}>
        {isPending ? '처리 중...' : '가입하기'}
      </button>

      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p className="success">가입 완료!</p>}
    </form>
  );
}
```

**Server Action과 함께 사용 (progressive enhancement)**
```typescript
'use client';

import { useActionState } from 'react';
import { submitOrder } from './actions';

function OrderForm() {
  // permalink를 지정하면 JS 로드 전에도 폼 제출이 동작
  const [state, action, isPending] = useActionState(
    submitOrder,
    null,
    '/orders/submit' // progressive enhancement용 permalink
  );

  return (
    <form action={action}>
      <input name="product" required />
      <input name="quantity" type="number" required />
      <button disabled={isPending}>
        {isPending ? '주문 중...' : '주문하기'}
      </button>
    </form>
  );
}
```

### useFormStatus (폼 상태 접근)

> **주의**: `useFormStatus`는 반드시 `<form>` 내부의 자식 컴포넌트에서 호출해야 합니다. 같은 컴포넌트에서 `<form>`을 렌더링하면서 동시에 `useFormStatus`를 사용할 수 없습니다.

```typescript
import { useFormStatus } from 'react-dom';

function SubmitButton({ label = '제출' }: { label?: string }) {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? '제출 중...' : label}
    </button>
  );
}

function FormProgress() {
  const { pending } = useFormStatus();
  return pending ? <div className="progress-bar" /> : null;
}

function MyForm() {
  async function handleSubmit(formData: FormData) {
    await fetch('/api/submit', {
      method: 'POST',
      body: formData,
    });
  }

  return (
    <form action={handleSubmit}>
      <FormProgress />
      <input name="name" />
      <SubmitButton label="저장" /> {/* 자동으로 부모 폼 상태 감지 */}
    </form>
  );
}
```

### useOptimistic (낙관적 UI 업데이트)

낙관적 업데이트는 서버 응답을 기다리지 않고 UI를 즉시 반영하여 사용자 경험을 향상시킵니다. Action이 완료(성공 또는 실패)되면 실제 서버 데이터로 자동 교체됩니다.

```typescript
import { useOptimistic, useActionState } from 'react';

interface Todo {
  id: string;
  title: string;
  pending?: boolean;
}

function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic<Todo[], Todo>(
    todos,
    (state, newTodo) => [...state, newTodo]
  );

  async function addTodo(prevState: unknown, formData: FormData) {
    const title = formData.get('title') as string;

    // 낙관적 업데이트 (즉시 UI 반영)
    addOptimisticTodo({ id: crypto.randomUUID(), title, pending: true });

    // 실제 서버 요청
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      // 실패 시 optimistic 값은 자동으로 롤백됨
      return { error: '추가 실패' };
    }

    return { success: true };
  }

  const [state, action, isPending] = useActionState(addTodo, null);

  return (
    <div>
      <form action={action}>
        <input name="title" required />
        <button disabled={isPending}>추가</button>
      </form>

      {optimisticTodos.map(todo => (
        <div key={todo.id} className={todo.pending ? 'opacity-50' : ''}>
          {todo.title}
          {todo.pending && <span> (저장 중...)</span>}
        </div>
      ))}

      {state?.error && <p className="error">{state.error}</p>}
    </div>
  );
}
```

### useOptimistic 고급 패턴: 삭제 및 수정

```typescript
import { useOptimistic } from 'react';

type OptimisticAction =
  | { type: 'add'; todo: Todo }
  | { type: 'delete'; id: string }
  | { type: 'toggle'; id: string };

function TodoApp({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, dispatch] = useOptimistic<Todo[], OptimisticAction>(
    todos,
    (state, action) => {
      switch (action.type) {
        case 'add':
          return [...state, action.todo];
        case 'delete':
          return state.filter(t => t.id !== action.id);
        case 'toggle':
          return state.map(t =>
            t.id === action.id ? { ...t, completed: !t.completed } : t
          );
      }
    }
  );

  async function handleDelete(id: string) {
    dispatch({ type: 'delete', id });
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
  }

  // ...
}
```

---

## 3. use() Hook (비동기 데이터)

### 개요
`use()`는 React 19에서 추가된 새로운 Hook으로, Promise나 Context를 읽을 수 있습니다. 다른 Hook과 달리 조건문, 반복문 내부에서도 호출할 수 있다는 특별한 특징이 있습니다.

### Promise 직접 사용

```typescript
import { use, Suspense } from 'react';

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('사용자를 찾을 수 없습니다');
  return response.json();
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  // Promise를 직접 전달! Suspense가 로딩 상태를 처리
  const user = use(userPromise);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// 부모 컴포넌트에서 Promise를 생성하여 전달
function App() {
  // 중요: Promise는 렌더링 외부에서 생성 (캐싱 보장)
  const userPromise = fetchUser('123');

  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

> **주의**: `use(fetchUser(userId))`처럼 렌더링 중 매번 새 Promise를 생성하면 매 렌더링마다 요청이 재실행됩니다. 부모 컴포넌트에서 Promise를 생성하여 props로 전달하거나, 캐싱 레이어를 사용하세요.

### Context 조건부 읽기

```typescript
import { use, createContext } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

function Button({ primary }: { primary?: boolean }) {
  // 조건부로 Context 읽기 가능! (useContext로는 불가능했던 패턴)
  const theme = primary ? use(ThemeContext) : 'light';

  return (
    <button className={`btn-${theme}`}>
      Click me
    </button>
  );
}
```

### 반복문 내부에서 사용

```typescript
function CommentList({ commentPromises }: { commentPromises: Promise<Comment>[] }) {
  return (
    <ul>
      {commentPromises.map((promise, i) => (
        <CommentItem key={i} promise={promise} />
      ))}
    </ul>
  );
}

function CommentItem({ promise }: { promise: Promise<Comment> }) {
  const comment = use(promise); // 각 항목별로 독립적 로딩
  return <li>{comment.text}</li>;
}
```

### ErrorBoundary와 함께 사용

```typescript
import { use, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function DataView({ dataPromise }: { dataPromise: Promise<Data> }) {
  const data = use(dataPromise);
  return <div>{data.content}</div>;
}

function App() {
  return (
    <ErrorBoundary fallback={<div>오류가 발생했습니다</div>}>
      <Suspense fallback={<div>로딩 중...</div>}>
        <DataView dataPromise={fetchData()} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 기존 방식과 비교

**React 18 (기존)**
```typescript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error.message}</div>;

  return <div>{user.name}</div>;
}
```

**React 19 (use + Suspense + ErrorBoundary)**
```typescript
function UserProfile({ userPromise }) {
  const user = use(userPromise);
  return <div>{user.name}</div>;
}

// 로딩/에러 처리가 선언적으로 분리됨
<ErrorBoundary fallback={<div>에러 발생</div>}>
  <Suspense fallback={<div>로딩 중...</div>}>
    <UserProfile userPromise={fetchUser('123')} />
  </Suspense>
</ErrorBoundary>
```

---

## 4. React Server Components 패턴

### 개요
React Server Components(RSC)는 서버에서만 실행되는 컴포넌트입니다. 클라이언트에 JavaScript 번들이 전송되지 않으며, DB, 파일 시스템 등 서버 리소스에 직접 접근할 수 있습니다.

### 기본 Server Component

```typescript
// app/products/page.tsx (기본적으로 Server Component)
import { db } from '@/lib/db';
import { ProductList } from './product-list'; // Client Component

export default async function ProductsPage() {
  // 서버에서만 실행 - DB 직접 접근 가능
  const products = await db.product.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1>상품 목록</h1>
      {/* Server Component에서 Client Component로 직렬화 가능한 데이터 전달 */}
      <ProductList products={products} />
    </div>
  );
}
```

### Server/Client 컴포넌트 구분 패턴

```
Server Component (기본값)          Client Component ('use client')
- async/await 사용 가능             - useState, useEffect 등 Hook 사용
- DB, 파일 시스템 직접 접근          - 이벤트 핸들러 (onClick, onChange)
- 환경 변수(서버용) 접근 가능        - 브라우저 API (localStorage, window)
- JS 번들에 포함되지 않음           - 인터랙티브 UI
```

### 컴포지션 패턴: Server + Client 조합

```typescript
// app/dashboard/page.tsx (Server Component)
import { db } from '@/lib/db';
import { DashboardChart } from './dashboard-chart'; // 'use client'
import { DashboardFilter } from './dashboard-filter'; // 'use client'

export default async function DashboardPage() {
  const data = await db.analytics.getMonthlyData();

  return (
    <div>
      <h1>대시보드</h1>
      {/* Client Component에 서버 데이터를 직렬화하여 전달 */}
      <DashboardFilter />
      <DashboardChart data={data} />
      {/* Server Component를 Client Component의 children으로 전달 */}
      <InteractivePanel>
        <ServerRenderedContent />
      </InteractivePanel>
    </div>
  );
}
```

```typescript
// app/dashboard/interactive-panel.tsx
'use client';

export function InteractivePanel({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '접기' : '펼치기'}
      </button>
      {isOpen && children} {/* Server Component가 children으로 전달됨 */}
    </div>
  );
}
```

### 스트리밍 패턴: 점진적 로딩

```typescript
// app/page.tsx (Server Component)
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <div>
      {/* 즉시 렌더링되는 부분 */}
      <header>
        <h1>홈페이지</h1>
      </header>

      {/* 각 섹션이 독립적으로 스트리밍 */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations />
      </Suspense>

      <Suspense fallback={<RecentActivitySkeleton />}>
        <RecentActivity />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}

async function Recommendations() {
  const items = await fetchRecommendations(); // 느린 API
  return <RecommendationList items={items} />;
}
```

### 데이터 프리로딩 패턴

```typescript
// lib/data.ts
import { cache } from 'react';

// React cache()로 요청 단위 중복 제거
export const getUser = cache(async (id: string) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
});

// app/user/[id]/page.tsx
import { getUser } from '@/lib/data';

export default async function UserPage({ params }: { params: { id: string } }) {
  // 같은 요청 내에서 getUser(id)를 여러 컴포넌트에서 호출해도 한 번만 실행
  const user = await getUser(params.id);
  return <UserProfile user={user} />;
}
```

---

## 5. Server Actions

### 기본 Server Actions

```typescript
// app/actions.ts
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createProduct(prevState: unknown, formData: FormData) {
  const name = formData.get('name') as string;
  const price = Number(formData.get('price'));

  // 서버측 유효성 검증
  if (!name || name.length < 2) {
    return { error: '상품명은 2자 이상이어야 합니다' };
  }

  if (isNaN(price) || price <= 0) {
    return { error: '유효한 가격을 입력하세요' };
  }

  await db.product.create({
    data: { name, price },
  });

  // 캐시 무효화
  revalidatePath('/products');

  return { success: true };
}

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });
  revalidatePath('/products');
}
```

**클라이언트에서 사용**
```typescript
'use client';

import { createProduct, deleteProduct } from './actions';
import { useActionState } from 'react';

export function ProductForm() {
  const [state, action, isPending] = useActionState(createProduct, null);

  return (
    <form action={action}>
      <input name="name" required />
      <input name="price" type="number" required />
      <button disabled={isPending}>
        {isPending ? '생성 중...' : '상품 추가'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}

export function DeleteButton({ id }: { id: string }) {
  return (
    <form action={deleteProduct.bind(null, id)}>
      <button>삭제</button>
    </form>
  );
}
```

### Server Action 에러 처리 패턴

```typescript
'use server';

import { redirect } from 'next/navigation';

export async function updateProfile(prevState: unknown, formData: FormData) {
  try {
    const data = Object.fromEntries(formData);

    await db.user.update({
      where: { id: data.userId as string },
      data: { name: data.name as string, bio: data.bio as string },
    });
  } catch (error) {
    // 에러를 직렬화 가능한 형태로 반환
    return { error: '프로필 업데이트에 실패했습니다. 다시 시도해주세요.' };
  }

  // 성공 시 리디렉션 (try 블록 밖에서 호출)
  redirect('/profile');
}
```

---

## 6. Suspense 개선사항

### React 19의 Suspense 변경점

React 19에서는 Suspense의 동작이 개선되어 더 예측 가능하고 성능이 향상되었습니다.

### Sibling Pre-warming

React 19에서는 Suspense boundary 내의 형제(sibling) 컴포넌트도 미리 렌더링을 시도합니다. 이전에는 suspended 된 컴포넌트의 형제들은 fallback이 표시될 때 렌더링되지 않았지만, 이제는 형제 컴포넌트의 lazy 로딩도 동시에 시작됩니다.

```typescript
function App() {
  return (
    <Suspense fallback={<Loading />}>
      {/* React 19: Header 데이터를 기다리는 동안 Sidebar와 Content도 미리 렌더링 시작 */}
      <Header />    {/* suspended */}
      <Sidebar />   {/* pre-warmed: 렌더링 시작됨 */}
      <Content />   {/* pre-warmed: 렌더링 시작됨 */}
    </Suspense>
  );
}
```

### 중첩 Suspense로 점진적 로딩

```typescript
function ProductPage({ productId }: { productId: string }) {
  return (
    <div>
      {/* 1단계: 기본 상품 정보 (빠르게 로드) */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductInfo productId={productId} />

        {/* 2단계: 리뷰 (약간 느림) */}
        <Suspense fallback={<ReviewsSkeleton />}>
          <ProductReviews productId={productId} />
        </Suspense>

        {/* 3단계: 추천 상품 (가장 느림) */}
        <Suspense fallback={<RecommendationsSkeleton />}>
          <RelatedProducts productId={productId} />
        </Suspense>
      </Suspense>
    </div>
  );
}
```

### Suspense + Transition 조합

```typescript
import { useTransition, Suspense, useState } from 'react';

function TabContainer() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  function selectTab(nextTab: string) {
    startTransition(() => {
      setTab(nextTab); // Transition 내에서 탭 전환
    });
  }

  return (
    <div>
      <nav>
        <button onClick={() => selectTab('home')}>홈</button>
        <button onClick={() => selectTab('posts')}>게시글</button>
        <button onClick={() => selectTab('settings')}>설정</button>
      </nav>

      {/* isPending 동안 이전 탭 콘텐츠를 유지하면서 스피너 표시 */}
      <div className={isPending ? 'opacity-50' : ''}>
        <Suspense fallback={<TabSkeleton />}>
          <TabContent tab={tab} />
        </Suspense>
      </div>
    </div>
  );
}
```

### SuspenseList 패턴 (순서 보장)

```typescript
// 여러 Suspense boundary의 표시 순서를 제어
function Feed() {
  return (
    <div>
      {/* 각 항목이 순서대로 표시되도록 보장 */}
      <Suspense fallback={<PostSkeleton />}>
        <Post id="1" />
      </Suspense>
      <Suspense fallback={<PostSkeleton />}>
        <Post id="2" />
      </Suspense>
      <Suspense fallback={<PostSkeleton />}>
        <Post id="3" />
      </Suspense>
    </div>
  );
}
```

---

## 7. Document Metadata (메타데이터)

### React 19 네이티브 메타데이터 (title, meta, link)

React 19에서는 `<title>`, `<meta>`, `<link>` 태그를 컴포넌트 내에서 직접 렌더링하면 자동으로 `<head>`에 호이스팅됩니다.

```typescript
function BlogPost({ post }) {
  return (
    <article>
      {/* React 19: 자동으로 <head>에 호이스팅 */}
      <title>{post.title}</title>
      <meta name="description" content={post.summary} />
      <link rel="canonical" href={`https://example.com/posts/${post.slug}`} />

      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### 프레임워크 메타데이터 (Next.js)

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: '웹사이트',
    template: '%s | 웹사이트',
  },
  description: '웹사이트 설명',
  openGraph: {
    title: '웹사이트',
    description: '웹사이트 설명',
    images: ['/og-image.jpg'],
  },
};
```

### 동적 메타데이터

```typescript
// app/products/[id]/page.tsx
export async function generateMetadata({ params }) {
  const product = await fetchProduct(params.id);

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      images: [product.image],
    },
  };
}
```

---

## 8. ref as Prop (더 이상 forwardRef 불필요)

**React 18 (기존)**
```typescript
import { forwardRef } from 'react';

const Input = forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    return <input ref={ref} {...props} />;
  }
);
```

**React 19 (개선)**
```typescript
interface InputProps {
  ref?: React.Ref<HTMLInputElement>;
  placeholder?: string;
}

function Input({ ref, placeholder }: InputProps) {
  // ref를 일반 prop처럼 사용!
  return <input ref={ref} placeholder={placeholder} />;
}

// 사용
function Parent() {
  const inputRef = useRef<HTMLInputElement>(null);

  return <Input ref={inputRef} placeholder="입력하세요" />;
}
```

---

## 9. Context as Provider (간소화)

**React 18 (기존)**
```typescript
import { createContext } from 'react';

const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Content />
    </ThemeContext.Provider>
  );
}
```

**React 19 (개선)**
```typescript
import { createContext } from 'react';

const ThemeContext = createContext('light');

function App() {
  // Context를 직접 Provider로 사용!
  return (
    <ThemeContext value="dark">
      <Content />
    </ThemeContext>
  );
}
```

---

## 10. 개선된 Hydration 에러

### 더 나은 에러 메시지

**React 18**
```
Warning: Text content did not match. Server: "Hello" Client: "Hi"
```

**React 19**
```
Hydration failed because the server rendered HTML didn't match the client.
As a result this tree will be regenerated on the client.

Server:
  <div>Hello</div>

Client:
  <div>Hi</div>
```

### Diff 표시

```
Mismatch at <div>
  Server: "서버에서 렌더링한 내용"
  Client: "클라이언트에서 렌더링한 내용"
```

---

## 11. Cleanup 함수 반환 타이밍

**React 18 이하**
- ref 콜백에서 클린업 함수 반환 불가 (반환값 무시됨)

**React 19**
- ref 콜백에서 클린업 함수를 반환할 수 있음
- DOM 요소가 제거될 때 클린업 함수 실행

```typescript
// React 19: ref 콜백 클린업
function MyComponent() {
  return (
    <input
      ref={(element) => {
        if (element) {
          // 요소가 마운트될 때 실행
          element.focus();
        }
        // 클린업 함수 반환 (React 19 신기능)
        return () => {
          // 요소가 언마운트될 때 실행
          console.log('input removed');
        };
      }}
    />
  );
}
```

> **참고**: `useEffect`의 클린업 타이밍은 React 18과 동일합니다. React 18에서 이미 자동 배칭(automatic batching)이 도입되어 `setTimeout`, `Promise` 등 모든 컨텍스트에서 배칭이 적용됩니다.

---

## 12. 성능 개선

### Transition 개선 (React 19)

```typescript
import { useTransition } from 'react';

function SearchInput() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value); // 긴급 업데이트

    startTransition(() => {
      // 낮은 우선순위 업데이트
      updateSearchResults(value);
    });
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
    </div>
  );
}
```

---

## 마이그레이션 가이드

### 1. React 19 업그레이드

```bash
npm install react@latest react-dom@latest
npm install -D @types/react@latest @types/react-dom@latest
```

### 2. Breaking Changes 대응

**forwardRef 제거**
```typescript
// Before
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);

// After
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

**Context.Provider → Context**
```typescript
// Before
<ThemeContext.Provider value="dark">

// After
<ThemeContext value="dark">
```

### 3. 점진적 마이그레이션

1. React 18 코드는 대부분 그대로 동작 (높은 하위 호환성)
2. `useFormState` -> `useActionState`로 이름 변경 (deprecated 경고 확인)
3. 새 기능(`use`, Actions, `useOptimistic`)은 점진적 도입
4. React Compiler는 선택사항 (ESLint 플러그인으로 호환성 사전 검증 권장)
5. Server Components는 Next.js 15+ 등 RSC 지원 프레임워크 필요
6. `forwardRef` -> ref as prop 전환 (기존 forwardRef도 계속 동작)

---

## Best Practices

### 1. use() 활용

```typescript
// ✅ Good: Suspense와 ErrorBoundary와 함께 사용
<ErrorBoundary fallback={<ErrorUI />}>
  <Suspense fallback={<Loading />}>
    <DataComponent />
  </Suspense>
</ErrorBoundary>

// ✅ Good: Promise를 부모에서 생성하여 전달
function Parent() {
  const dataPromise = fetchData(); // 렌더링마다 새로 생성되지 않도록 주의
  return (
    <Suspense fallback={<Loading />}>
      <Child dataPromise={dataPromise} />
    </Suspense>
  );
}

// ❌ Bad: Suspense 없이 사용 (에러 발생)
<DataComponent />

// ❌ Bad: 렌더링 중 매번 새 Promise 생성
function Child({ userId }) {
  const user = use(fetchUser(userId)); // 매 렌더마다 새 요청 발생
}
```

### 2. Server Actions 보안

```typescript
'use server';

import { auth } from '@/lib/auth';
import { z } from 'zod';

// 스키마 기반 유효성 검증
const deleteUserSchema = z.object({
  userId: z.string().uuid(),
});

export async function deleteUser(userId: string) {
  // 1. 입력값 검증
  const parsed = deleteUserSchema.safeParse({ userId });
  if (!parsed.success) {
    return { error: '잘못된 요청입니다' };
  }

  // 2. 반드시 권한 검증!
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: '권한이 없습니다' };
  }

  // 3. 비즈니스 로직 실행
  await db.user.delete({ where: { id: parsed.data.userId } });

  return { success: true };
}
```

### 3. Server/Client 컴포넌트 경계 설계

```typescript
// ✅ Good: 최소한의 'use client' 범위
// components/product-page.tsx (Server Component)
async function ProductPage({ id }) {
  const product = await getProduct(id);
  return (
    <div>
      <h1>{product.name}</h1>          {/* 서버 렌더링 */}
      <p>{product.description}</p>      {/* 서버 렌더링 */}
      <AddToCartButton productId={id} /> {/* 클라이언트 컴포넌트 */}
    </div>
  );
}

// ❌ Bad: 전체 페이지를 'use client'로 선언
'use client'; // 불필요하게 넓은 범위
function ProductPage({ id }) { ... }
```

### 4. useOptimistic 활용 지침

```typescript
// ✅ Good: Action과 함께 사용하여 자동 롤백 보장
function LikeButton({ postId, likes }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(likes);

  async function handleLike() {
    addOptimisticLike(optimisticLikes + 1); // 즉시 반영
    await likePost(postId);                 // 실패 시 자동 롤백
  }

  return <button onClick={handleLike}>{optimisticLikes}</button>;
}
```

### 5. React Compiler 호환 코드 작성

```typescript
// ✅ Good: Compiler가 최적화할 수 있는 순수한 코드
function ProductList({ products, filter }) {
  const filtered = products.filter(p => p.category === filter);
  return filtered.map(p => <ProductCard key={p.id} product={p} />);
}

// ❌ Bad: Compiler가 최적화하기 어려운 패턴 (외부 변수 변이)
let externalCache = {};
function ProductList({ products }) {
  externalCache[products.length] = products; // 외부 변이
  return products.map(p => <ProductCard key={p.id} product={p} />);
}
```

### 6. Suspense 경계 전략

```typescript
// ✅ Good: 의미 있는 단위로 Suspense 경계 설정
function Dashboard() {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <div className="grid">
        <Suspense fallback={<ChartSkeleton />}>
          <SalesChart />
        </Suspense>
        <Suspense fallback={<TableSkeleton />}>
          <RecentOrders />
        </Suspense>
      </div>
    </div>
  );
}

// ❌ Bad: 모든 것을 하나의 Suspense로 감싸기
function Dashboard() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Header />
      <SalesChart />
      <RecentOrders />
    </Suspense>
  );
}
```

---

## 참고 자료

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React 19.1 Release](https://react.dev/blog)
- [React Compiler](https://react.dev/learn/react-compiler)
- [Server Components](https://react.dev/reference/rsc/server-components)
- [useActionState](https://react.dev/reference/react/useActionState)
- [useOptimistic](https://react.dev/reference/react/useOptimistic)
- [use](https://react.dev/reference/react/use)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
