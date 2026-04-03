# 11. React 19 실무 가이드 (2025-2026 Edition)

| 분류 | 핵심 기술 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [21. API 통신](./21_API_통신_및_모킹_가이드.md), [12. 상태 관리](./12_상태관리_패턴_가이드.md) | **AI 도구** | Claude Code, Cursor |
| **핵심 테마** | Actions, Server Functions, useActionState, Ref as Props | **Update** | 2025.04 |

---

> **"React 19은 클라이언트와 서버의 경계를 허물고, 비동기 데이터 흐름을 프레임워크 수준에서 네이티브하게 처리한다."**
> 본 가이드는 수동으로 관리하던 비동기 상태를 React 엔진에 맡기고, 더 간결하고 안전한 코드를 작성하는 방법을 다룹니다.

## 1. Actions: 비동기 상태 관리의 혁명

과거에는 API 호출 시 `isLoading`, `error`, `data` 상태를 각각 `useState`로 직접 관리해야 했습니다. React 19의 **Actions**를 사용하면 비동기 함수의 시작과 끝을 React가 추적하여 자동으로 상태를 관리해줍니다.

### 1.1 `useActionState`: 폼 데이터와 비동기 상태의 결합
가장 많이 쓰이는 패턴입니다. 폼 제출 시 로딩 처리와 에러 핸들링을 한 번에 처리합니다.

```tsx
import { useActionState } from "react";
import { updateProfile } from "./actions";

function ProfileForm() {
  // state: 액션 결과값, formAction: 실행할 함수, isPending: 실행 중 여부
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  return (
    <form action={formAction}>
      <input name="name" disabled={isPending} />
      {/* 별도의 isLoading 상태 없이 isPending으로 버튼 제어 */}
      <button disabled={isPending}>
        {isPending ? "저장 중..." : "저장"}
      </button>
      
      {state?.error && <p className="text-red-500">{state.error}</p>}
      {state?.success && <p className="text-green-500">성공적으로 수정되었습니다!</p>}
    </form>
  );
}
```

### 1.2 `useFormStatus`: 하위 컴포넌트에서 상태 공유
`<form>` 내부의 하위 컴포넌트라면 Context 없이도 현재 폼의 제출 상태(pending 여부)를 알 수 있습니다.

```tsx
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "전송 중..." : "전송"}</button>;
}
```

---

## 2. 간소화된 API (ForwardRef 제거 등)

### 2.1 Ref as a Prop (더 이상 ForwardRef는 필요 없습니다)
이제 `forwardRef`로 감싸지 않아도 컴포넌트의 props로 `ref`를 직접 받을 수 있습니다.

```tsx
// React 19 이전: forwardRef 필수
// const MyInput = forwardRef((props, ref) => <input ref={ref} {...props} />);

// React 19 이후: 일반 props처럼 전달
function MyInput({ label, ref, ...props }) {
  return (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  );
}
```

### 2.2 `<Context>` 직접 사용
`MyContext.Provider` 대신 `<MyContext>`를 바로 사용할 수 있어 코드가 더 짧아집니다.

```tsx
// Before: <ThemeContext.Provider value="dark">
// After:
<ThemeContext value="dark">
  {children}
</ThemeContext>
```

---

## 3. `use` Hook: 조건부 Promise/Context 소비

`use`는 기존 `useContext`를 대체할 수 있을 뿐만 아니라, 렌더링 도중 Promise를 처리할 때도 쓰입니다.

*   **특징**: `if` 문이나 `for` 문 안에서도 사용할 수 있는 유일한 훅입니다.
*   **Suspense 연동**: Promise가 해결될 때까지 상위의 `<Suspense>`가 대기합니다.

```tsx
import { use } from "react";

function UserProfile({ userPromise }) {
  // Promise가 해결될 때까지 이 컴포넌트는 Suspense 상태가 됩니다.
  const user = use(userPromise);
  
  return <div>안녕하세요, {user.name}님!</div>;
}
```

---

## 4. Server Functions & Actions (Next.js 15+ 연동)

서버에서 실행되는 로직을 클라이언트에서 일반 함수처럼 호출할 수 있습니다.

```tsx
// actions.ts (서버 로직)
"use server";

export async function deletePost(id: string) {
  await db.posts.delete(id);
  // 데이터 캐시 무효화 등 서버 사이드 처리
}

// PostItem.tsx (클라이언트)
function PostItem({ id }) {
  return (
    <button onClick={() => deletePost(id)}>삭제</button>
  );
}
```

---

## 💡 AI와 함께하는 마이그레이션 전략

AI(Claude Code 등)에게 다음과 같이 요청하여 기존 코드를 React 19 스타일로 빠르게 바꿀 수 있습니다.

> **Prompt**: "아래 useState와 useEffect로 직접 관리하는 비동기 로직을 React 19의 useActionState 패턴으로 리팩토링해줘. forwardRef가 있다면 제거하고 props로 ref를 전달하도록 바꿔줘."

## ✅ 체크리스트
- [ ] `forwardRef`를 사용 중인 모든 컴포넌트에서 래퍼를 제거했나요?
- [ ] 폼 데이터 처리에 `useActionState`를 도입하여 `isLoading` 상태를 제거했나요?
- [ ] Context 사용 시 `.Provider` 접미사를 제거했나요?
- [ ] 비동기 데이터를 가져올 때 `useEffect` 대신 `use(promise)` 패턴을 고려해봤나요?
