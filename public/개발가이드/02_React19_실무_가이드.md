# 11. React 19 실무 가이드 (2025-2026 Edition)

| 분류 | 핵심 기술 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [21. API 통신](./21_API_통신_및_모킹_가이드.md), [12. 상태 관리](./12_상태관리_패턴_가이드.md) | **AI 도구** | Claude Code, Cursor |
| **핵심 테마** | Actions, Server Functions, useActionState, Ref as Props | **Update** | 2025.04 |

---

> **"React 19은 클라이언트와 서버의 경계를 허물고, 비동기 데이터 흐름을 프레임워크 수준에서 네이티브하게 처리한다."**
> 본 가이드는 수동으로 관리하던 비동기 상태를 React 엔진에 맡기고, 더 간결하고 안전한 코드를 작성하는 방법을 다룹니다.

## 1. Actions: 비동기 상태 관리의 혁명

과거에는 데이터 갱신 시 `isLoading`, `error`, `data` 상태를 각각 `useState`로 직접 관리해야 했습니다. React 19의 **Actions**를 사용하면 비동기 함수의 시작과 끝을 React가 추적하여 자동으로 상태를 관리해줍니다.

### 1.1 `useActionState`: 비동기 작업과 상태의 결합
비동기 작업 실행 시 상태 전이와 에러 핸들링을 단일 인터페이스로 처리합니다.

```tsx
import { useActionState } from "react";
import { updateEntity } from "./actions";

function EntityManager() {
  // state: 작업 결과값, formAction: 실행할 함수, isPending: 실행 중 여부
  const [state, action, isPending] = useActionState(updateEntity, null);

  return (
    <form action={action}>
      <input name="resourceId" disabled={isPending} />
      {/* 별도의 로딩 상태 선언 없이 isPending으로 UI 제어 */}
      <button disabled={isPending}>
        {isPending ? "처리 중..." : "갱신"}
      </button>
      
      {state?.error && <p className="text-error">{state.error}</p>}
      {state?.success && <p className="text-success">데이터가 성공적으로 갱신되었습니다.</p>}
    </form>
  );
}
```

### 1.2 `useFormStatus`: 하위 컴포넌트에서 상태 공유
컴포넌트 트리 하단에서 Context 없이도 현재 비동기 작업의 진행 상태를 파악할 수 있습니다.

---

## 2. 간소화된 API (ForwardRef 제거 등)

### 2.1 Ref as a Prop
이제 별도의 래퍼 없이 컴포넌트의 props로 `ref`를 직접 전달받아 처리할 수 있어 계층 구조가 단순해집니다.

---

## 3. `use` Hook: 조건부 리소스 소비

`use`는 렌더링 도중 Promise나 Context를 효율적으로 처리하며, `if` 문이나 `for` 문 안에서도 사용할 수 있는 유연성을 제공합니다.

---

## 4. Server Functions & Actions

서버 환경에서 실행되는 로직을 클라이언트 레이어에서 투명하게 호출하여 네트워크 오버헤드를 줄이고 보안을 강화합니다.

```tsx
// actions.ts (Server-side Logic)
"use server";

export async function processTransaction(id: string) {
  await db.resources.process(id);
  // 서버 사이드 상태 갱신 및 캐시 무효화
}

// ClientComponent.tsx
function InteractionUnit({ id }) {
  return (
    <button onClick={() => processTransaction(id)}>실행</button>
  );
}
```

---

## ✅ 체크리스트
- [ ] 비동기 작업 상태 관리에 `useActionState`를 도입하여 불필요한 `useState`를 제거했나요?
- [ ] 서버 레이어 로직을 `Server Functions`로 격리하여 보안과 성능을 최적화했나요?
- [ ] 렌더링 도중의 데이터 의존성을 `use(promise)` 패턴으로 해결했나요?
