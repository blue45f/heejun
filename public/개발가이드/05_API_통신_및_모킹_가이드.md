# 21. API 통신 및 모킹 가이드 (2025-2026 Edition)

| 분류 | 아키텍처 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [20. 아키텍처](./20_아키텍처_설계_패턴.md), [30. 테스팅](./30_테스팅_가이드.md) | **AI 도구** | OpenAPI, Orval, MSW |
| **핵심 테마** | OpenAPI 코드젠, MSW 2.x, Result 패턴, TanStack Query | **Update** | 2025.04 |

---

> **"인터페이스 명세와 가상 응답만 있다면 비즈니스 로직을 완결할 수 있습니다."**
> 본 가이드는 타입 안전하고 예측 가능한 시스템 간 통신 계층을 구축하는 워크플로우를 제시합니다.

## 1. 인터페이스 주도 개발: OpenAPI & Codegen

시스템 스펙(OpenAPI)을 기반으로 TypeScript 타입과 통신 함수를 자동으로 생성하여 데이터 정합성을 보장합니다.

### 1.1 자동화 도구를 활용한 명세 동기화
백엔드 엔티티 변경 시 코드젠을 통해 즉시 타입 오류를 감지하고, 영향 범위를 파악합니다.

---

## 2. 가상 응답 시스템: MSW 2.x

실제 인프라가 준비되기 전이나 격리된 테스트 환경에서 네트워크 요청을 인터셉트하여 가상 데이터를 제공합니다.

### 2.1 핸들러 설계 (Domain-Neutral)
```typescript
// infrastructure/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  http.post('/api/v1/transaction/execute', async ({ request }) => {
    await delay(500); // 지연 시간 시뮬레이션
    return HttpResponse.json({
      transactionId: 'tx-999',
      status: 'COMPLETED',
      data: { id: 1, name: 'Sample Entity' }
    }, { status: 200 });
  }),
];
```

---

## 3. 예외 처리: Result 패턴

성공과 실패를 명시적인 객체로 반환하여 시스템의 견고함을 높입니다.

```typescript
// types/common.ts
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// infrastructure/client.ts
async function getResource(id: string): Promise<Result<Entity>> {
  try {
    const data = await fetch(`/api/resource/${id}`).then(r => r.json());
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

---

## 4. 서버 상태 동기화: TanStack Query (v5+)

비동기 리소스의 캐싱 및 상태 전이를 관리합니다. React 19의 `Suspense`와 연동하여 선언적인 데이터 로딩을 구현합니다.

---

## ✅ 체크리스트
- [ ] 데이터 엔티티 타입을 수동으로 선언하지 않고 명세(OpenAPI)에서 자동 생성하고 있나요?
- [ ] 개발 초기 단계에서 가상 응답(MSW)을 활용하여 로직을 완결했나요?
- [ ] 비동기 작업 결과에 대해 명시적인 예외 처리(Result 패턴)를 강제하고 있나요?
