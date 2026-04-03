# 21. API 통신 및 모킹 가이드 (2025-2026 Edition)

| 분류 | 아키텍처 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [20. 아키텍처](./20_아키텍처_설계_패턴.md), [30. 테스팅](./30_테스팅_가이드.md) | **AI 도구** | OpenAPI, Orval, MSW |
| **핵심 테마** | OpenAPI 코드젠, MSW 2.x, Result 패턴, TanStack Query | **Update** | 2025.04 |

---

> **"API가 개발될 때까지 기다리지 마세요. OpenAPI 스펙과 MSW만 있다면 프론트엔드가 먼저 완결될 수 있습니다."**
> 본 가이드는 타입 안전하고 예측 가능한 API 통신 계층을 구축하는 2026년 표준 워크플로우를 제시합니다.

## 1. 프론트엔드 주도 개발: OpenAPI & Codegen

백엔드 스펙(Swagger/OpenAPI)을 기반으로 TypeScript 타입과 API 요청 함수를 자동으로 생성합니다.

### 1.1 Orval을 활용한 자동 생성
`orval`은 OpenAPI YAML/JSON 파일을 읽어 **TanStack Query 훅**까지 한 번에 생성해주는 강력한 도구입니다.

*   **장점**: 백엔드 API 변경 시 코드젠만 실행하면 타입 오류를 통해 즉시 영향을 확인할 수 있습니다.
*   **설정**: `orval.config.ts`를 통해 Axios 또는 Fetch 기반의 클라이언트를 생성합니다.

---

## 2. API 모킹: MSW 2.x

실제 API가 구축되기 전이나 테스트 환경에서 네트워크 요청을 가로채어 가짜 응답을 제공합니다.

### 2.1 MSW 2.x Handler 설계
[30. 테스팅 가이드](./30_테스팅_가이드.md)와 연동하여, 개발 환경에서도 실제 서버가 있는 것처럼 동작하게 합니다.

```typescript
// infrastructure/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    await delay(500); // 실제 네트워크 지연 시뮬레이션
    return HttpResponse.json({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: { id: 1, name: 'AI-User' }
    }, { status: 200 });
  }),
];
```

---

## 3. 에러 핸들링: Result 패턴 (Rust 스타일)

`try-catch`에 의존하는 대신, 성공과 실패를 명시적으로 반환하는 **Result 패턴**을 권장합니다. 이를 통해 개발자는 실패 케이스 처리를 강제받게 되어 런타임 에러를 방지합니다.

```typescript
// types/api.ts
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// infrastructure/api-client.ts
async function getProfile(id: string): Promise<Result<UserProfile>> {
  try {
    const data = await fetch(`/api/profile/${id}`).then(r => r.json());
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

---

## 4. 서버 상태 관리: TanStack Query (v5+)

비동기 데이터의 캐싱, 리프레시, 낙관적 업데이트(Optimistic Update)를 담당합니다.

*   **캐싱 전략**: 데이터의 성격에 따라 `staleTime`과 `gcTime`을 정밀하게 설정하세요.
*   **React 19 호환**: React 19의 `use` 훅이나 `Suspense`와 완벽하게 연동됩니다.

---

## 💡 AI와 함께하는 API 레이어 구축

AI(Claude Code)에게 OpenAPI 스펙을 건네주고 클라이언트 로직을 생성받으세요.

> **Prompt**: "이 OpenAPI 스펙(JSON)을 바탕으로 `entities/product` 계층에서 사용할 리포지토리 클래스를 작성해줘. 응답은 내가 정의한 `Result<T>` 패턴을 따르고, `tanstack/react-query`의 `useSuspenseQuery`를 활용한 커스텀 훅까지 만들어줘."

## ✅ 체크리스트
- [ ] API 타입을 수동으로 작성하지 않고 **OpenAPI**에서 자동 생성하고 있나요?
- [ ] 개발 초기 단계에서 **MSW 2.x**를 사용하여 UI 작업을 완료했나요?
- [ ] 성공/실패 처리를 위해 **Result 패턴**이나 이와 유사한 명시적 처리를 도입했나요?
- [ ] `staleTime` 설정을 통해 불필요한 네트워크 요청을 줄였나요?
- [ ] API 호출 시 타임아웃 및 재시도(Retry) 전략이 포함되어 있나요?
