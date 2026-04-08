# 10. TypeScript 심화 가이드 (2025-2026 Edition)

| 분류 | 핵심 기술 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [21. API 통신](./21_API_통신_및_모킹_가이드.md), [11. React 19](./11_React19_실무_가이드.md) | **AI 도구** | Claude Code, Zod |
| **핵심 테마** | Type Branding, Zod Validation, Advanced Utility Types | **Update** | 2025.04 |

---

> **"타입은 단순한 주석이 아니라, 런타임의 안전성을 보장하는 살아있는 명세서다."**
> 본 가이드는 단순한 문법을 넘어, 대규모 프로젝트에서 타입 시스템을 설계하는 고도화된 전략을 다룹니다.

## 1. 런타임 안전성: Zod 기반의 스키마 검증

TypeScript는 컴파일 타임에만 존재합니다. 외부 API에서 들어오는 데이터는 `Zod`를 사용하여 런타임에서도 검증해야 합니다.

### 1.1 유효성 검증 및 타입 추론
```typescript
import { z } from "zod";

// 1. 스키마 정의 (런타임용)
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().min(18),
  role: z.enum(["admin", "user", "guest"]),
});

// 2. 타입 추출 (컴파일 타임용)
type User = z.infer<typeof UserSchema>;

// 3. 실제 사용
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/user/${id}`).then(res => res.json());
  
  // parse()는 유효하지 않으면 에러를 던지고, safeParse()는 결과 객체를 반환합니다.
  const result = UserSchema.safeParse(response);
  if (!result.success) {
    console.error("API 스펙 불일치:", result.error.format());
    throw new Error("Invalid User Data");
  }
  
  return result.data;
}
```

---

## 2. Branded Types: 논리적 구분 강화

실수로 `UserId` 변수에 `ProductId`를 대입하는 사고를 방지하기 위해 **Branded Types**를 사용합니다.

### 2.1 브랜드 타입 구현 예시
```typescript
// 브랜드 유틸리티
type Brand<K, T> = K & { __brand: T };

// 고유 타입 정의
type UserId = Brand<string, "UserId">;
type ProductId = Brand<string, "ProductId">;

// 실제 값 생성 (Type Guard 활용)
function asUserId(id: string): UserId {
  return id as UserId;
}

// 사용 예시
function deleteUser(id: UserId) { /* ... */ }

const myUserId = asUserId("user-123");
const myProductId = "prod-999" as ProductId;

// deleteUser(myProductId); // Error: ProductId는 UserId에 할당될 수 없습니다!
```

---

## 3. 고급 유틸리티 타입: 템플릿 리터럴과 매핑

### 3.1 CSS 스타일 및 경로 타입 설계
```typescript
// 특정 접두사를 강제하는 타입
type ColorHex = `#${string}`;
const validColor: ColorHex = "#ff0000";
// const invalidColor: ColorHex = "ff0000"; // Error

// 객체의 모든 키를 특정 형식으로 변환 (Mapped Types)
type Getter<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface UserState {
  name: string;
  age: number;
}

type UserGetter = Getter<UserState>;
// 결과: { getName: () => string; getAge: () => number; }
```

---

## 4. `satisfies` 연산자의 실무 활용 (TypeScript 5.0+)

타입을 고정(Annotate)하지 않으면서도, 특정 인터페이스를 만족하는지 검사할 때 유용합니다.

```typescript
type Palette = "primary" | "secondary" | "accent";

// 타입을 직접 선언하면 palette.primary.toUpperCase() 같은 추론을 잃을 수 있습니다.
const palette = {
  primary: "#007bff",
  secondary: "#6c757d",
  accent: "#ffc107",
} satisfies Record<Palette, ColorHex>;

// 여전히 primary가 구체적인 문자열 값임을 알고 있습니다.
palette.primary.substring(1); 
```

---

## 💡 AI와 함께하는 타입 설계 전략

복잡한 요구사항에서 최적의 타입을 설계하고 싶을 때 AI를 활용하세요.

> **Prompt**: "React 컴포넌트의 Props를 설계 중이야. `variant`에 따라 `size`가 필수가 되거나 금지되어야 해. 예를 들어 `variant="primary"`일 때는 `size`가 필수고, `variant="link"`일 때는 `size`가 없어야 해. Discriminated Unions를 사용해서 가장 깔끔한 타입을 작성해줘."

## ✅ 체크리스트
- [ ] API 응답에 `as` 대신 `Zod` 스키마 검증을 적용했나요?
- [ ] ID 값들에 대해 **Branded Types** 적용을 검토했나요?
- [ ] `Record<string, any>` 대신 구체적인 인덱스 시그니처나 유니온 타입을 사용했나요?
- [ ] 라이브러리 설계 시 `satisfies`를 활용해 타입 추론을 극대화했나요?
