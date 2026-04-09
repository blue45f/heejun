# 02. React 19 실무 가이드 (2025-2026 Edition)

| 분류 | 핵심 기술 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [05. API 통신](./05_API_통신_및_모킹_가이드.md), [03. 상태 관리](./03_상태관리_패턴_가이드.md), [08. 성능 최적화](./08_성능_최적화_가이드.md) | **AI 도구** | Claude Code, Cursor |
| **핵심 테마** | Actions, Server Functions, useActionState, useOptimistic, Ref as Props, React Compiler | **Update** | 2026.04 |

---

> **"React 19은 클라이언트와 서버의 경계를 허물고, 비동기 데이터 흐름을 프레임워크 수준에서 네이티브하게 처리한다."**
> 본 가이드는 수동으로 관리하던 비동기 상태를 React 엔진에 맡기고, 더 간결하고 안전한 코드를 작성하는 방법을 다룹니다.

---

## 1. Actions: 비동기 상태 관리의 혁명

과거에는 데이터 갱신 시 `isLoading`, `error`, `data` 상태를 각각 `useState`로 직접 관리해야 했습니다. React 19의 **Actions**를 사용하면 비동기 함수의 시작과 끝을 React가 추적하여 자동으로 상태를 관리해줍니다.

### 1.1 `useActionState`: 비동기 작업과 상태의 결합

`useActionState`는 폼 제출이나 비동기 작업에서 `useState` + `useTransition`을 조합하던 패턴을 단일 Hook으로 대체합니다. **상태(state)**, **디스패치 함수(action)**, **진행 여부(isPending)** 를 한 번에 반환합니다.

#### Before (React 18) - 여러 useState를 수동 관리

```tsx
import { useState } from "react";

function ProfileEditor() {
  // 3개의 상태를 개별적으로 선언하고 관리해야 함
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProfileResult | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);  // 로딩 시작
    setError(null);      // 이전 에러 초기화

    try {
      const formData = new FormData(e.currentTarget);
      const res = await updateProfile(formData);
      setResult(res);    // 성공 결과 반영
    } catch (err) {
      setError((err as Error).message); // 에러 상태 반영
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="displayName" disabled={isLoading} />
      <input name="email" disabled={isLoading} />
      <button disabled={isLoading}>
        {isLoading ? "저장 중..." : "프로필 저장"}
      </button>
      {error && <p className="text-error">{error}</p>}
      {result?.success && <p className="text-success">프로필이 업데이트되었습니다.</p>}
    </form>
  );
}
```

#### After (React 19) - useActionState로 통합

```tsx
import { useActionState } from "react";

// Action 함수: 이전 상태(prevState)와 FormData를 받아 새 상태를 반환
async function updateProfileAction(
  prevState: ProfileState | null,
  formData: FormData
): Promise<ProfileState> {
  try {
    const result = await updateProfile({
      displayName: formData.get("displayName") as string,
      email: formData.get("email") as string,
    });
    return { success: true, message: "프로필이 업데이트되었습니다.", data: result };
  } catch (err) {
    // 에러 발생 시에도 상태로 반환 (throw 하지 않음)
    return { success: false, message: (err as Error).message };
  }
}

function ProfileEditor() {
  // state: 작업 결과값, action: form에 바인딩할 함수, isPending: 실행 중 여부
  const [state, action, isPending] = useActionState(updateProfileAction, null);

  return (
    // form의 action 속성에 직접 바인딩 - onSubmit 불필요
    <form action={action}>
      <input name="displayName" disabled={isPending} />
      <input name="email" disabled={isPending} />
      <button disabled={isPending}>
        {isPending ? "저장 중..." : "프로필 저장"}
      </button>
      {/* state는 Action 함수의 반환값 */}
      {state?.success === false && <p className="text-error">{state.message}</p>}
      {state?.success && <p className="text-success">{state.message}</p>}
    </form>
  );
}
```

> **핵심 차이**: `useState` 3개 + `try/catch/finally` 보일러플레이트가 사라지고, `useActionState` 하나로 **상태**, **에러**, **로딩**을 모두 관리합니다. `form action`에 바인딩하므로 Progressive Enhancement(JS 없이도 폼 제출 가능)도 자연스럽게 지원됩니다.

### 1.2 `useFormStatus`: 하위 컴포넌트에서 폼 상태 공유

`useFormStatus`는 가장 가까운 부모 `<form>` 의 제출 상태를 읽어옵니다. Context를 별도로 만들지 않아도 됩니다. **반드시 `<form>` 내부의 자식 컴포넌트에서 호출해야** 합니다(같은 컴포넌트에서 `<form>`을 렌더링하면서 호출하면 동작하지 않음).

```tsx
import { useFormStatus } from "react-dom";

// 재사용 가능한 제출 버튼 컴포넌트
// 반드시 <form> 자식으로 렌더링되어야 함
function SubmitButton({ label = "저장" }: { label?: string }) {
  // pending: 부모 form이 제출 중인지 여부
  // data: 제출 중인 FormData
  // method: "get" | "post"
  // action: form에 바인딩된 action 함수 참조
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "처리 중..." : label}
    </button>
  );
}

// 폼 전체 로딩 오버레이
function FormOverlay() {
  const { pending } = useFormStatus();

  if (!pending) return null;
  return (
    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
      <Spinner />
    </div>
  );
}

// 부모 폼 컴포넌트
function CreatePostForm() {
  const [state, action] = useActionState(createPostAction, null);

  return (
    <form action={action} className="relative">
      <FormOverlay />
      <input name="title" placeholder="제목" />
      <textarea name="content" placeholder="내용을 입력하세요" />
      {state?.error && <p className="text-error">{state.error}</p>}
      {/* SubmitButton은 form의 자식이므로 useFormStatus가 동작함 */}
      <SubmitButton label="게시글 작성" />
    </form>
  );
}
```

> **Context-like 동작 원리**: `useFormStatus`는 내부적으로 React의 Fiber 트리를 거슬러 올라가 가장 가까운 `<form>` 노드를 찾습니다. 별도의 Provider 없이도 깊은 자식 컴포넌트에서 폼 상태를 읽을 수 있어, 재사용 가능한 UI 컴포넌트를 만들기에 적합합니다.

---

## 2. 간소화된 API: ForwardRef 제거

### 2.1 Ref as a Prop

React 18까지는 함수 컴포넌트에서 `ref`를 받으려면 반드시 `forwardRef`로 감싸야 했습니다. React 19에서는 `ref`가 일반 prop처럼 전달되므로 래퍼가 필요 없어졌습니다.

#### Before (React 18) - forwardRef 필수

```tsx
import { forwardRef, useRef } from "react";

// forwardRef로 감싸야만 ref를 받을 수 있음
const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ label, error, ...props }, ref) {
    return (
      <div className="field">
        <label>{label}</label>
        <input ref={ref} {...props} />
        {error && <span className="text-error">{error}</span>}
      </div>
    );
  }
);

// 제네릭 컴포넌트는 forwardRef와 함께 쓰기 매우 번거로움
const GenericList = forwardRef<HTMLUListElement, GenericListProps<unknown>>(
  function GenericList({ items, renderItem }, ref) {
    return (
      <ul ref={ref}>
        {items.map((item, i) => (
          <li key={i}>{renderItem(item)}</li>
        ))}
      </ul>
    );
  }
);
// 제네릭 타입 정보가 forwardRef에 의해 소실됨!
```

#### After (React 19) - ref를 일반 prop으로 전달

```tsx
import { useRef } from "react";

// ref가 props의 일부로 직접 전달됨 - forwardRef 불필요
function TextInput({ label, error, ref, ...props }: TextInputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input ref={ref} {...props} />
      {error && <span className="text-error">{error}</span>}
    </div>
  );
}

// 제네릭 컴포넌트도 자연스럽게 동작
function GenericList<T>({ items, renderItem, ref }: GenericListProps<T> & { ref?: React.Ref<HTMLUListElement> }) {
  return (
    <ul ref={ref}>
      {items.map((item, i) => (
        <li key={i}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// 사용 시: 일반 prop처럼 전달
function ParentComponent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  return (
    <>
      <TextInput ref={inputRef} label="이름" />
      <GenericList<User> ref={listRef} items={users} renderItem={(u) => u.name} />
      <button onClick={() => inputRef.current?.focus()}>입력란 포커스</button>
    </>
  );
}
```

> **설계 간소화 포인트**: `forwardRef` 제거로 (1) 컴포넌트 정의가 단순해지고, (2) 제네릭 타입이 보존되며, (3) HOC/래퍼 패턴 설계가 쉬워집니다. 기존 `forwardRef` 코드는 React 19에서도 동작하지만 점진적으로 제거를 권장합니다.

---

## 3. `use` Hook: 조건부 리소스 소비

`use`는 React 19에서 새로 도입된 Hook으로, **Promise**나 **Context**를 렌더링 도중 읽을 수 있습니다. 기존 Hook들과 달리 `if`문, `for`문, `try/catch` 안에서도 호출 가능한 유일한 Hook입니다.

### 3.1 Promise와 함께 사용 (Suspense 통합)

```tsx
import { use, Suspense } from "react";

// 데이터 패칭 함수 (Promise를 반환)
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error("프로필을 불러올 수 없습니다.");
  return res.json();
}

// use()로 Promise를 읽는 컴포넌트
function UserProfile({ userPromise }: { userPromise: Promise<UserProfile> }) {
  // use()는 Promise가 resolve될 때까지 Suspense를 트리거함
  const user = use(userPromise);

  return (
    <div className="profile-card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>가입일: {new Date(user.createdAt).toLocaleDateString("ko-KR")}</p>
    </div>
  );
}

// 부모에서 Promise를 생성하고 Suspense로 감싸기
function UserPage({ userId }: { userId: string }) {
  // Promise는 부모에서 생성 (렌더링마다 새로 생성하지 않도록 주의)
  const userPromise = fetchUserProfile(userId);

  return (
    <ErrorBoundary fallback={<p>프로필 로딩 실패</p>}>
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile userPromise={userPromise} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 3.2 조건부 호출 - 기존 Hook과의 차이점

```tsx
function DashboardWidget({ featureFlags }: { featureFlags: Promise<FeatureFlags> }) {
  const flags = use(featureFlags);

  // 조건문 내부에서 use() 호출 가능 - 다른 Hook으로는 불가능!
  if (flags.showAnalytics) {
    const analytics = use(fetchAnalyticsData());
    return <AnalyticsPanel data={analytics} />;
  }

  if (flags.showReports) {
    const reports = use(fetchReportsSummary());
    return <ReportsSummary data={reports} />;
  }

  return <DefaultDashboard />;
}
```

### 3.3 Context와 함께 사용

```tsx
import { use, createContext } from "react";

const ThemeContext = createContext<Theme>({ mode: "light", primary: "#3b82f6" });

function ThemedButton({ showIcon }: { showIcon: boolean }) {
  // useContext 대신 use(Context)를 사용 가능
  // 조건부 호출이 필요할 때 유용
  const theme = use(ThemeContext);

  return (
    <button style={{ backgroundColor: theme.primary, color: theme.mode === "dark" ? "#fff" : "#000" }}>
      {showIcon && <Icon color={theme.primary} />}
      테마 버튼
    </button>
  );
}
```

> **주의**: `use(promise)`를 사용할 때 Promise는 렌더링 바깥에서 생성하거나 캐싱해야 합니다. 렌더링 중 매번 새 Promise를 생성하면 무한 Suspense에 빠질 수 있습니다.

---

## 4. Server Functions & Actions

`"use server"` 지시어로 선언된 함수는 서버에서만 실행되며, 클라이언트에서는 자동 생성된 RPC 참조를 통해 호출합니다. 네트워크 호출, 직렬화/역직렬화를 React가 자동으로 처리합니다.

### 4.1 기본 사용법: 폼 액션

```tsx
// actions.ts - 서버 전용 로직
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

// 입력값 검증 스키마
const CreateArticleSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").max(100),
  content: z.string().min(10, "내용을 10자 이상 입력해주세요"),
  categoryId: z.string().uuid("유효하지 않은 카테고리입니다"),
});

export async function createArticle(
  prevState: ArticleFormState | null,
  formData: FormData
): Promise<ArticleFormState> {
  // 1. 서버에서 입력값 검증
  const parsed = CreateArticleSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    // 필드별 에러 메시지 반환
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // 2. DB 저장
    const article = await db.article.create({ data: parsed.data });

    // 3. 관련 페이지 캐시 무효화 (ISR 재생성 트리거)
    revalidatePath("/articles");
    revalidatePath(`/articles/${article.id}`);

    return { success: true, articleId: article.id };
  } catch (err) {
    // 4. 서버 에러를 안전하게 클라이언트에 전달
    console.error("게시글 생성 실패:", err);
    return {
      success: false,
      serverError: "게시글 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
```

### 4.2 클라이언트에서 Server Action 사용

```tsx
"use client";

import { useActionState } from "react";
import { createArticle } from "./actions";

function ArticleForm() {
  const [state, action, isPending] = useActionState(createArticle, null);

  return (
    <form action={action}>
      <div>
        <input name="title" placeholder="제목" />
        {/* 필드별 에러 표시 */}
        {state?.fieldErrors?.title && (
          <p className="text-error text-sm">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div>
        <textarea name="content" placeholder="내용" rows={10} />
        {state?.fieldErrors?.content && (
          <p className="text-error text-sm">{state.fieldErrors.content[0]}</p>
        )}
      </div>

      <select name="categoryId">
        <option value="">카테고리 선택</option>
        {/* 카테고리 옵션들 */}
      </select>

      {/* 서버 에러 표시 */}
      {state?.serverError && (
        <div className="bg-red-50 p-3 rounded">{state.serverError}</div>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? "게시 중..." : "게시글 작성"}
      </button>
    </form>
  );
}
```

### 4.3 이벤트 핸들러에서 Server Action 호출

```tsx
"use client";

import { useTransition } from "react";
import { deleteArticle } from "./actions";

function DeleteButton({ articleId }: { articleId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    // useTransition으로 감싸면 isPending 상태를 추적 가능
    startTransition(async () => {
      await deleteArticle(articleId);
    });
  };

  return (
    <button onClick={handleDelete} disabled={isPending} className="text-red-600">
      {isPending ? "삭제 중..." : "삭제"}
    </button>
  );
}
```

---

## 5. `useOptimistic`: 낙관적 업데이트

네트워크 응답을 기다리지 않고 UI를 즉시 업데이트한 뒤, 서버 응답이 오면 실제 상태로 동기화합니다. 사용자 체감 속도를 극적으로 향상시킵니다.

### 5.1 장바구니 수량 변경 예제

```tsx
import { useOptimistic, useActionState } from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

function ShoppingCart({ initialItems }: { initialItems: CartItem[] }) {
  const [items, setItems] = useState(initialItems);

  // optimisticItems: 화면에 보여줄 낙관적 상태
  // addOptimistic: 낙관적 업데이트를 적용하는 함수
  const [optimisticItems, addOptimistic] = useOptimistic(
    items,
    // 리듀서: 현재 상태 + 업데이트 정보 → 낙관적 상태
    (currentItems: CartItem[], update: { id: string; delta: number }) =>
      currentItems.map((item) =>
        item.id === update.id
          ? { ...item, quantity: Math.max(0, item.quantity + update.delta) }
          : item
      )
  );

  const handleQuantityChange = async (itemId: string, delta: number) => {
    // 1. UI를 즉시 업데이트 (낙관적)
    addOptimistic({ id: itemId, delta });

    // 2. 서버에 실제 요청
    try {
      const updatedItems = await updateCartQuantity(itemId, delta);
      setItems(updatedItems); // 서버 응답으로 실제 상태 동기화
    } catch {
      // 실패 시 낙관적 상태가 자동으로 롤백됨 (items가 원래 값이므로)
      toast.error("수량 변경에 실패했습니다.");
    }
  };

  const totalPrice = optimisticItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="cart">
      <h2>장바구니</h2>
      {optimisticItems.map((item) => (
        <div key={item.id} className="cart-item flex items-center gap-4">
          <span className="flex-1">{item.name}</span>
          <span>{item.price.toLocaleString()}원</span>
          <div className="flex items-center gap-2">
            <button onClick={() => handleQuantityChange(item.id, -1)}>-</button>
            <span>{item.quantity}</span>
            <button onClick={() => handleQuantityChange(item.id, +1)}>+</button>
          </div>
        </div>
      ))}
      <div className="cart-total font-bold text-lg">
        합계: {totalPrice.toLocaleString()}원
      </div>
    </div>
  );
}
```

### 5.2 좋아요 토글 예제 (Server Action 조합)

```tsx
"use client";

import { useOptimistic } from "react";

function LikeButton({ articleId, initialLiked, initialCount }: LikeButtonProps) {
  const [{ liked, count }, setLikeState] = useState({
    liked: initialLiked,
    count: initialCount,
  });

  const [optimistic, addOptimistic] = useOptimistic(
    { liked, count },
    (current, newLiked: boolean) => ({
      liked: newLiked,
      count: current.count + (newLiked ? 1 : -1),
    })
  );

  const handleToggle = async () => {
    const next = !optimistic.liked;
    addOptimistic(next); // 즉시 UI 반영

    const result = await toggleLike(articleId); // 서버 요청
    setLikeState({ liked: result.liked, count: result.count }); // 실제 반영
  };

  return (
    <button onClick={handleToggle} className={optimistic.liked ? "text-red-500" : "text-gray-400"}>
      {optimistic.liked ? "♥" : "♡"} {optimistic.count}
    </button>
  );
}
```

---

## 6. React Compiler 시대의 변화

React Compiler(구 React Forget)는 빌드 타임에 컴포넌트를 자동 메모이제이션합니다. 수동으로 `memo`, `useMemo`, `useCallback`을 작성할 필요가 사라집니다.

### 6.1 무엇이 바뀌나

```tsx
// === Before: 수동 메모이제이션 지옥 ===
import { memo, useMemo, useCallback } from "react";

const ExpensiveList = memo(function ExpensiveList({ items, onSelect }: Props) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.score - a.score),
    [items]
  );

  const handleSelect = useCallback(
    (id: string) => { onSelect(id); },
    [onSelect]
  );

  return (
    <ul>
      {sorted.map((item) => (
        <ListItem key={item.id} item={item} onSelect={handleSelect} />
      ))}
    </ul>
  );
});

const ListItem = memo(function ListItem({ item, onSelect }: ItemProps) {
  return <li onClick={() => onSelect(item.id)}>{item.name}: {item.score}</li>;
});


// === After: React Compiler가 자동 처리 ===
// memo, useMemo, useCallback 제거 — 컴파일러가 동일한 최적화를 자동 적용
function ExpensiveList({ items, onSelect }: Props) {
  const sorted = [...items].sort((a, b) => b.score - a.score);

  return (
    <ul>
      {sorted.map((item) => (
        <ListItem key={item.id} item={item} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function ListItem({ item, onSelect }: ItemProps) {
  return <li onClick={() => onSelect(item.id)}>{item.name}: {item.score}</li>;
}
```

### 6.2 React Compiler 도입 가이드

```ts
// babel.config.js 또는 next.config.js
// Next.js 15+에서 활성화
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};
```

**React Compiler가 처리하는 것:**
- 컴포넌트 리렌더링 스킵 (`memo` 대체)
- 계산값 캐싱 (`useMemo` 대체)
- 콜백 참조 안정성 (`useCallback` 대체)
- JSX 엘리먼트 캐싱

**React Compiler가 처리하지 않는 것:**
- 부수 효과 (`useEffect`)는 여전히 수동 관리
- 외부 스토어 구독 (`useSyncExternalStore`)
- 의도적인 매번 재계산이 필요한 경우

> **마이그레이션 전략**: 기존 `memo`/`useMemo`/`useCallback`은 즉시 제거할 필요 없습니다. React Compiler가 활성화되면 중복 최적화가 될 뿐 오류는 발생하지 않습니다. 새 코드부터 작성하지 않으면 됩니다.

---

## 7. Document Metadata: `<title>`, `<meta>`, `<link>`

React 19에서는 컴포넌트 내부에서 직접 `<title>`, `<meta>`, `<link>` 등을 렌더링하면 React가 자동으로 `<head>`에 호이스팅합니다. `react-helmet` 같은 서드파티 라이브러리가 불필요해집니다.

```tsx
// 이전: react-helmet 또는 next/head 필요
// 이후: 컴포넌트 JSX에 직접 선언

function ArticlePage({ article }: { article: Article }) {
  return (
    <article>
      {/* React 19이 자동으로 <head>에 호이스팅 */}
      <title>{article.title} | 우리 블로그</title>
      <meta name="description" content={article.summary} />
      <meta property="og:title" content={article.title} />
      <meta property="og:description" content={article.summary} />
      <meta property="og:image" content={article.thumbnailUrl} />
      <link rel="canonical" href={`https://blog.example.com/articles/${article.slug}`} />

      {/* 페이지 본문 */}
      <h1>{article.title}</h1>
      <p>{article.content}</p>
    </article>
  );
}

// 중첩 레이아웃에서도 동작 — 자식의 <title>이 부모를 덮어씀
function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <title>상품 목록 | 쇼핑몰</title>
      <meta name="robots" content="index,follow" />
      {children}
    </div>
  );
}

function ProductDetail({ product }: { product: Product }) {
  return (
    <div>
      {/* 이 title이 ProductLayout의 title을 덮어씀 */}
      <title>{product.name} | 쇼핑몰</title>
      <meta name="description" content={product.description} />
      <p>{product.description}</p>
    </div>
  );
}
```

> **참고**: Next.js App Router를 사용하는 경우 `generateMetadata`와 혼용하지 마세요. 순수 React 프로젝트(Vite 등)에서 특히 유용합니다. SEO 관련 상세 내용은 [24. SEO 메타데이터 가이드](./24_SEO_메타데이터_가이드.md)를 참고하세요.

---

## 8. 마이그레이션 가이드: React 18 → 19

### 8.1 단계별 업그레이드

```bash
# 1단계: 패키지 업그레이드
npm install react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19

# 2단계: (선택) React Compiler 설치
npm install -D babel-plugin-react-compiler
```

### 8.2 주요 Breaking Changes 대응

| 변경 사항 | React 18 | React 19 | 대응 방법 |
| :--- | :--- | :--- | :--- |
| `forwardRef` | 필수 | 선택 (점진적 제거) | 새 코드는 ref를 prop으로, 기존 코드는 유지 |
| `useContext` | 유일한 방법 | `use(Context)` 도 가능 | 조건부 호출이 필요한 곳만 `use`로 전환 |
| `ReactDOM.render` | 지원 (deprecated) | **제거됨** | `createRoot` 사용 필수 |
| `React.lazy` | 유일한 방법 | `use(import(...))` 가능 | 기존 코드 유지 가능, 새 코드는 `use` 활용 |
| `ref` 콜백 반환값 | 무시됨 | 클린업 함수로 사용 | ref 콜백에서 의도치 않은 return 제거 |
| `string ref` | deprecated | **제거됨** | `useRef` 또는 콜백 ref로 전환 |

### 8.3 Codemod 활용

```bash
# React 공식 codemod로 자동 변환
npx @react-codemod/v19 ./src

# 주요 변환 항목:
# - ReactDOM.render → createRoot
# - forwardRef 제거
# - useContext → use(Context) (선택적)
# - string ref → useRef
```

### 8.4 점진적 마이그레이션 전략

1. **1주차**: 패키지 업그레이드 + codemod 실행 + 빌드 오류 해결
2. **2주차**: `forwardRef` 제거 (새 코드부터 적용, 기존 코드는 lint 규칙으로 점진 전환)
3. **3주차**: `useActionState` 도입 (폼 관련 컴포넌트 우선)
4. **4주차**: `use` Hook, `useOptimistic` 적용 (데이터 패칭 레이어)
5. **5주차 이후**: React Compiler 실험적 도입 + `memo`/`useMemo`/`useCallback` 점진적 제거

---

## 9. 주의사항 및 흔한 실수

### 9.1 `use(promise)`에서 무한 Suspense

```tsx
// 잘못된 예: 렌더링마다 새 Promise 생성 → 무한 Suspense
function BadExample({ userId }: { userId: string }) {
  // 렌더링할 때마다 fetch가 호출되어 새 Promise가 생성됨
  const user = use(fetch(`/api/users/${userId}`).then((r) => r.json()));
  return <p>{user.name}</p>;
}

// 올바른 예: Promise를 컴포넌트 바깥에서 생성
function GoodExample({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <p>{user.name}</p>;
}

// 또는 캐시된 패칭 함수 사용 (React.cache 또는 라이브러리)
const fetchUser = cache(async (userId: string) => {
  const res = await fetch(`/api/users/${userId}`);
  return res.json();
});
```

### 9.2 `useFormStatus`를 form 바깥에서 호출

```tsx
// 잘못된 예: form을 렌더링하는 컴포넌트에서 직접 호출
function BrokenForm() {
  const { pending } = useFormStatus(); // 항상 pending: false

  return (
    <form action={someAction}>
      <button disabled={pending}>저장</button> {/* 동작 안 함! */}
    </form>
  );
}

// 올바른 예: form의 자식 컴포넌트에서 호출
function WorkingForm() {
  return (
    <form action={someAction}>
      <SubmitButton />  {/* 자식 컴포넌트에서 useFormStatus 호출 */}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus(); // 정상 동작
  return <button disabled={pending}>저장</button>;
}
```

### 9.3 Server Action에서 민감한 정보 노출

```tsx
// 잘못된 예: 서버 에러를 그대로 클라이언트에 전달
"use server";
export async function riskyAction(formData: FormData) {
  try {
    await db.query("INSERT INTO ...");
  } catch (err) {
    // DB 에러 메시지가 클라이언트에 노출됨!
    return { error: (err as Error).message };
  }
}

// 올바른 예: 에러를 로깅하고 일반적인 메시지만 반환
"use server";
export async function safeAction(formData: FormData) {
  try {
    await db.query("INSERT INTO ...");
    return { success: true };
  } catch (err) {
    console.error("DB 오류:", err); // 서버 로그에만 기록
    return { success: false, error: "처리 중 오류가 발생했습니다." };
  }
}
```

### 9.4 `useActionState`의 초기값 타입 불일치

```tsx
// 잘못된 예: 초기값 null인데 state를 바로 접근
const [state, action, isPending] = useActionState(myAction, null);
return <p>{state.message}</p>; // TypeError: Cannot read property 'message' of null

// 올바른 예: null 체크 후 접근
const [state, action, isPending] = useActionState(myAction, null);
return state ? <p>{state.message}</p> : null;
```

---

## AI 프롬프트 가이드

> **React 19 마이그레이션 프롬프트 예시:**
> "이 React 18 컴포넌트를 React 19 스타일로 리팩토링해줘. forwardRef를 제거하고, useState 기반 비동기 상태 관리를 useActionState로 전환하고, 필요하면 useOptimistic을 적용해줘."

> **Server Action 프롬프트 예시:**
> "이 API 라우트를 Server Action으로 전환해줘. Zod 검증, 에러 핸들링, revalidatePath를 포함하고, 클라이언트에서는 useActionState로 호출하는 폼 컴포넌트도 만들어줘."

---

## ✅ 체크리스트

### 기본 적용
- [ ] 비동기 작업 상태 관리에 `useActionState`를 도입하여 불필요한 `useState` 보일러플레이트를 제거했나요?
- [ ] 재사용 가능한 폼 UI 컴포넌트에서 `useFormStatus`를 활용하고 있나요?
- [ ] 새로운 컴포넌트에서 `forwardRef` 없이 `ref`를 prop으로 직접 받고 있나요?
- [ ] 렌더링 도중의 데이터 의존성을 `use(promise)` 패턴으로 해결했나요?

### 서버 통합
- [ ] 서버 레이어 로직을 `Server Functions`로 격리하여 보안과 성능을 최적화했나요?
- [ ] Server Action에서 Zod 등으로 입력값을 검증하고 있나요?
- [ ] Server Action의 에러 메시지가 민감한 정보를 노출하지 않나요?
- [ ] `revalidatePath`/`revalidateTag`로 캐시 무효화를 처리하고 있나요?

### 사용자 경험
- [ ] 즉각적인 피드백이 필요한 인터랙션에 `useOptimistic`을 적용했나요?
- [ ] `use(promise)` 사용 시 Suspense 폴백과 ErrorBoundary를 함께 설정했나요?
- [ ] Document Metadata를 컴포넌트 내에서 직접 관리하고 있나요?

### 성능 및 마이그레이션
- [ ] React Compiler 도입 가능성을 검토했나요? (기존 `memo`/`useMemo`/`useCallback` 점진적 제거 계획)
- [ ] `use(promise)`에서 렌더링마다 새 Promise를 생성하지 않도록 주의했나요?
- [ ] `ReactDOM.render`, `string ref` 등 제거된 API를 사용하고 있지 않나요?
- [ ] React 18 → 19 codemod를 실행하여 자동 마이그레이션을 완료했나요?

---

> **연관 가이드**: [01. TypeScript 심화](./01_TypeScript_심화_가이드.md) | [03. 상태 관리 패턴](./03_상태관리_패턴_가이드.md) | [05. API 통신](./05_API_통신_및_모킹_가이드.md) | [08. 성능 최적화](./08_성능_최적화_가이드.md) | [24. SEO 메타데이터](./24_SEO_메타데이터_가이드.md)
