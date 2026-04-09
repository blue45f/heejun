# 01. TypeScript 심화 가이드 (2025-2026 Edition)

| 분류 | 핵심 기술 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [05. API 통신](./05_API_통신_및_모킹_가이드.md), [02. React 19](./02_React19_실무_가이드.md), [07. 테스팅](./07_테스팅_가이드.md) | **AI 도구** | Claude Code, Zod |
| **핵심 테마** | Type Branding, Zod Validation, Discriminated Unions, Type Guard, Generics | **Update** | 2025.04 |

---

> **"타입은 단순한 주석이 아니라, 런타임의 안전성을 보장하는 살아있는 명세서다."**
> 본 가이드는 단순한 문법을 넘어, 대규모 프로젝트에서 타입 시스템을 설계하는 고도화된 전략을 다룹니다.
> 각 섹션은 **왜 필요한지**, **어떻게 사용하는지**, **흔한 실수는 무엇인지**를 중심으로 구성되어 있습니다.

---

## 1. 런타임 안전성: Zod 기반의 스키마 검증

### 왜 중요한가

TypeScript의 타입은 **컴파일 타임에만 존재**합니다. 빌드가 완료된 JavaScript에는 타입 정보가 전혀 남아 있지 않습니다. 이 말은 외부 API, localStorage, URL 파라미터, 사용자 입력 등 **런타임에 들어오는 모든 데이터**에 대해 TypeScript가 아무런 보호도 제공하지 못한다는 뜻입니다.

`as` 키워드로 타입을 강제 캐스팅하면 컴파일러는 만족하지만, 실제 데이터 구조가 다를 경우 런타임에서 예측 불가능한 오류가 발생합니다. Zod는 **스키마 정의 한 번으로 런타임 검증과 타입 추론을 동시에** 해결해주는 라이브러리입니다.

### 1.1 유효성 검증 및 타입 추론

```typescript
import { z } from "zod";

// 1. 스키마 정의 (런타임 검증용)
// Zod 스키마가 곧 "진짜 타입"의 역할을 합니다.
const UserSchema = z.object({
  id: z.string().uuid(),                    // UUID 형식 강제
  email: z.string().email(),                // 이메일 형식 검증
  age: z.number().min(18).max(120),         // 범위 제한으로 논리적 오류 방지
  role: z.enum(["admin", "user", "guest"]), // 허용된 값만 통과
  createdAt: z.string().datetime(),         // ISO 8601 날짜 형식 검증
});

// 2. 타입 추출 (컴파일 타임용)
// 스키마에서 타입을 자동 추론하므로 타입과 검증 로직이 항상 동기화됩니다.
type User = z.infer<typeof UserSchema>;

// 3. API 응답을 안전하게 처리하는 함수
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/user/${id}`).then((res) => res.json());

  // safeParse()는 에러를 던지지 않고 결과 객체를 반환합니다.
  // parse()는 유효하지 않으면 ZodError를 던집니다.
  const result = UserSchema.safeParse(response);

  if (!result.success) {
    // 어떤 필드가 어떻게 잘못되었는지 상세하게 로깅
    console.error("API 스펙 불일치:", result.error.format());
    throw new Error("Invalid User Data");
  }

  // result.data는 이미 User 타입으로 추론됩니다.
  return result.data;
}
```

### 1.2 Bad Practice vs Good Practice

```typescript
// ❌ Bad: as 키워드로 타입 강제 캐스팅
// API 응답이 실제로 User 구조가 아니어도 컴파일러가 통과시킴
async function fetchUserBad(id: string): Promise<User> {
  const response = await fetch(`/api/user/${id}`).then((res) => res.json());
  return response as User; // 위험! 런타임에서 아무런 검증도 하지 않음
}

// ✅ Good: Zod를 사용한 런타임 검증
// 데이터 구조가 다르면 즉시 에러를 감지할 수 있음
async function fetchUserGood(id: string): Promise<User> {
  const response = await fetch(`/api/user/${id}`).then((res) => res.json());
  return UserSchema.parse(response); // 유효하지 않으면 명확한 에러 발생
}
```

### 1.3 Zod 스키마 조합과 변환

```typescript
// 기존 스키마를 확장하여 새로운 스키마를 만들 수 있습니다.
const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });
type CreateUserInput = z.infer<typeof CreateUserSchema>;

// 부분 업데이트를 위한 Partial 스키마
const UpdateUserSchema = UserSchema.partial().omit({ id: true });
type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// transform()으로 데이터 변환과 검증을 동시에 수행
const DateStringSchema = z.string().transform((val) => new Date(val));

// 기본값 설정
const PaginationSchema = z.object({
  page: z.number().min(1).default(1),        // 기본값 1
  limit: z.number().min(1).max(100).default(20), // 기본값 20
});
```

### 흔한 실수

```typescript
// ❌ 실수 1: parse()와 safeParse()를 혼동
// parse()는 에러를 throw하므로 try-catch가 필요합니다.
try {
  const user = UserSchema.parse(data); // 실패 시 ZodError throw
} catch (e) {
  // 반드시 에러 처리 필요
}

// ❌ 실수 2: z.infer 타입을 별도로 수동 정의
// 스키마와 타입이 서로 달라질 위험이 있습니다.
interface UserManual {
  id: string;
  email: string;
  // age 필드를 빼먹어도 컴파일러가 경고하지 않음!
}

// ✅ 올바른 방법: 항상 z.infer로 타입을 추출
type UserCorrect = z.infer<typeof UserSchema>;
```

---

## 2. Branded Types: 논리적 구분 강화

### 왜 중요한가

TypeScript의 타입 시스템은 **구조적 타이핑(Structural Typing)**을 사용합니다. 즉, 두 타입의 구조(형태)가 같으면 호환되는 것으로 판단합니다. 이 때문에 `UserId`와 `OrderId`가 둘 다 `string`이면 실수로 섞어 사용해도 컴파일러가 잡아주지 못합니다.

대규모 프로젝트에서 이런 실수는 **조용한 버그**로 이어집니다. 잘못된 ID로 API를 호출하면 데이터가 삭제되거나 잘못된 정보가 반환될 수 있습니다. **Branded Types**는 구조가 같은 타입이라도 논리적으로 구분되도록 "표식(brand)"을 붙여주는 패턴입니다.

### 2.1 브랜드 타입 구현 예시

```typescript
// 브랜드 유틸리티 타입 정의
// __brand는 실제 런타임에는 존재하지 않지만, 컴파일러가 타입을 구분하는 데 사용합니다.
type Brand<K, T> = K & { readonly __brand: T };

// 고유 ID 타입 정의
type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
type ProductId = Brand<string, "ProductId">;

// 타입 안전한 생성 함수
// 외부 입력을 받아 브랜드 타입으로 변환하는 유일한 진입점
function asUserId(id: string): UserId {
  // 필요 시 여기서 UUID 형식 검증도 가능
  if (!id.startsWith("user-")) {
    throw new Error(`잘못된 UserId 형식: ${id}`);
  }
  return id as UserId;
}

function asOrderId(id: string): OrderId {
  return id as OrderId;
}

// 사용 예시: 컴파일러가 잘못된 ID 사용을 잡아냄
function deleteUser(id: UserId): void {
  console.log(`유저 삭제: ${id}`);
}

function cancelOrder(id: OrderId): void {
  console.log(`주문 취소: ${id}`);
}

const myUserId = asUserId("user-123");
const myOrderId = asOrderId("order-456");

deleteUser(myUserId);    // ✅ 정상
cancelOrder(myOrderId);  // ✅ 정상

// deleteUser(myOrderId);  // ❌ 컴파일 에러! OrderId는 UserId에 할당 불가
// cancelOrder(myUserId);  // ❌ 컴파일 에러! UserId는 OrderId에 할당 불가
```

### 2.2 Bad Practice vs Good Practice

```typescript
// ❌ Bad: 일반 string 타입 사용
// userId와 orderId가 모두 string이므로 실수로 바꿔 넣어도 에러 없음
function deleteUserBad(userId: string): void { /* ... */ }
function cancelOrderBad(orderId: string): void { /* ... */ }

const userId = "user-123";
const orderId = "order-456";

deleteUserBad(orderId); // 컴파일 통과! 하지만 런타임에서 잘못된 유저 삭제 시도

// ✅ Good: Branded Types 사용
// 논리적으로 다른 ID를 타입 수준에서 구분
function deleteUserGood(userId: UserId): void { /* ... */ }
function cancelOrderGood(orderId: OrderId): void { /* ... */ }

const safeUserId = asUserId("user-123");
const safeOrderId = asOrderId("order-456");

// deleteUserGood(safeOrderId); // ❌ 컴파일 에러로 실수 방지
```

### 2.3 Zod와 Branded Types 결합

```typescript
// Zod의 .brand()를 사용하면 더 간결하게 브랜드 타입을 만들 수 있습니다.
const UserIdSchema = z.string().uuid().brand<"UserId">();
type ZodUserId = z.infer<typeof UserIdSchema>;

const OrderIdSchema = z.string().uuid().brand<"OrderId">();
type ZodOrderId = z.infer<typeof OrderIdSchema>;

// 런타임 검증과 브랜딩을 동시에!
const validUserId = UserIdSchema.parse("550e8400-e29b-41d4-a716-446655440000");
```

### 흔한 실수

```typescript
// ❌ 실수: 브랜드 타입을 직접 as 캐스팅으로 생성
// 생성 함수를 거치지 않으면 브랜드 타입의 의미가 없어집니다.
const unsafeId = "아무값이나" as UserId; // 검증 없이 브랜딩 → 무의미

// ✅ 올바른 방법: 반드시 생성 함수(팩토리)를 통해 생성
const safeId = asUserId("user-789"); // 검증 로직을 거쳐 안전하게 생성
```

---

## 3. 고급 유틸리티 타입: 템플릿 리터럴과 매핑

### 왜 중요한가

TypeScript의 **템플릿 리터럴 타입(Template Literal Types)**과 **매핑된 타입(Mapped Types)**은 반복적인 타입 정의를 자동화하고, 오타와 불일치를 컴파일 타임에 잡아주는 강력한 도구입니다.

예를 들어, CSS 색상 코드가 반드시 `#`으로 시작해야 한다거나, 이벤트 핸들러 이름이 `on`으로 시작해야 한다거나 하는 **패턴 기반 규칙**을 타입으로 표현할 수 있습니다. 이를 통해 IDE 자동완성과 컴파일러 검증을 동시에 활용할 수 있습니다.

### 3.1 템플릿 리터럴 타입

```typescript
// 특정 접두사를 강제하는 타입
type ColorHex = `#${string}`;
const validColor: ColorHex = "#ff0000";   // ✅ 올바른 형식
// const invalidColor: ColorHex = "ff0000"; // ❌ '#'이 없으므로 에러

// API 엔드포인트 경로를 타입으로 제한
type ApiPath = `/api/${string}`;
const usersEndpoint: ApiPath = "/api/users";     // ✅
// const badEndpoint: ApiPath = "/users";          // ❌ '/api/'로 시작하지 않음

// CSS 단위를 포함한 값 타입
type CSSLength = `${number}${"px" | "rem" | "em" | "%"}`;
const fontSize: CSSLength = "16px";   // ✅
const margin: CSSLength = "1.5rem";   // ✅
// const bad: CSSLength = "16";        // ❌ 단위 없음

// 이벤트 이름 패턴
type EventName = `on${Capitalize<string>}`;
const clickHandler: EventName = "onClick";     // ✅
const changeHandler: EventName = "onChange";   // ✅
```

### 3.2 매핑된 타입 (Mapped Types)

```typescript
// 객체의 모든 키를 특정 형식으로 변환하는 유틸리티
// Getter 패턴: 각 프로퍼티에 대해 get 접두사가 붙은 메서드를 자동 생성
type Getter<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

// Setter 패턴도 동일하게 구현 가능
type Setter<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

interface UserState {
  name: string;
  age: number;
  email: string;
}

// Getter<UserState>의 결과:
// {
//   getName: () => string;
//   getAge: () => number;
//   getEmail: () => string;
// }
type UserGetter = Getter<UserState>;

// Getter와 Setter를 합쳐서 사용
type UserAccessor = Getter<UserState> & Setter<UserState>;
```

### 3.3 조건부 타입과 키 필터링

```typescript
// 특정 타입의 키만 추출하는 유틸리티
// T의 프로퍼티 중 값 타입이 V인 것만 골라냅니다.
type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

interface MixedData {
  id: number;
  name: string;
  email: string;
  age: number;
  isActive: boolean;
}

// string 타입인 키만 추출: "name" | "email"
type StringKeys = KeysOfType<MixedData, string>;

// number 타입인 키만 추출: "id" | "age"
type NumberKeys = KeysOfType<MixedData, number>;

// 이를 활용해 문자열 필드만 검색 가능하게 만드는 함수
function searchByStringField<K extends StringKeys>(
  data: MixedData,
  field: K,
  query: string
): boolean {
  return data[field].includes(query);
}
```

### Bad Practice vs Good Practice

```typescript
// ❌ Bad: 수동으로 Getter 인터페이스를 정의
// 원본 인터페이스가 변경되면 동기화를 잊기 쉬움
interface UserGetterManual {
  getName: () => string;
  getAge: () => number;
  // getEmail을 추가하는 것을 잊어버림!
}

// ✅ Good: Mapped Types로 자동 생성
// 원본 인터페이스가 변경되면 자동으로 반영됨
type UserGetterAuto = Getter<UserState>;
```

### 흔한 실수

```typescript
// ❌ 실수: 템플릿 리터럴 타입에서 너무 넓은 타입 사용
type TooWide = `${string}-${string}`; // 거의 모든 문자열이 통과됨
// "abc-def" ✅, "a-b" ✅ → 의미 없는 검증

// ✅ 개선: 가능하면 유니온 타입으로 범위를 좁힙니다.
type Locale = `${"ko" | "en" | "ja"}-${"KR" | "US" | "JP"}`;
// "ko-KR" ✅, "en-US" ✅, "fr-FR" ❌
```

---

## 4. `satisfies` 연산자의 실무 활용 (TypeScript 5.0+)

### 왜 중요한가

TypeScript에서 변수에 타입을 명시적으로 선언하면(`: Type`) 컴파일러는 해당 타입으로 값을 **넓혀서(widen)** 인식합니다. 이 과정에서 우리가 실제로 넣은 **구체적인 값 정보가 사라질** 수 있습니다.

`satisfies` 연산자는 **"이 값이 특정 타입을 만족하는지 검사하되, 원래의 구체적인 타입 추론은 유지해줘"**라는 의미입니다. 타입 안전성과 타입 추론의 정밀함을 동시에 얻을 수 있는 매우 유용한 기능입니다.

### 4.1 기본 사용법

```typescript
type Palette = "primary" | "secondary" | "accent";
type ColorHex = `#${string}`;

// ❌ Bad: 타입을 직접 선언하면 값의 구체적 타입이 사라짐
const paletteAnnotated: Record<Palette, ColorHex> = {
  primary: "#007bff",
  secondary: "#6c757d",
  accent: "#ffc107",
};
// paletteAnnotated.primary의 타입: ColorHex (= `#${string}`)
// → "#007bff"라는 구체적인 값을 알 수 없음

// ✅ Good: satisfies를 사용하면 검증과 추론을 동시에
const paletteSatisfies = {
  primary: "#007bff",
  secondary: "#6c757d",
  accent: "#ffc107",
} satisfies Record<Palette, ColorHex>;
// paletteSatisfies.primary의 타입: "#007bff" (리터럴 타입 유지!)
// → substring, toUpperCase 등 string 메서드도 자동완성됨

paletteSatisfies.primary.substring(1); // ✅ 타입 추론이 살아있어 string 메서드 사용 가능
```

### 4.2 실무에서의 활용 패턴

```typescript
// 라우트 설정에서 satisfies 활용
interface RouteConfig {
  path: string;
  component: React.ComponentType;
  auth: boolean;
}

// satisfies를 사용하면 각 라우트의 path가 리터럴 타입으로 유지됩니다.
const routes = {
  home: { path: "/", component: HomePage, auth: false },
  dashboard: { path: "/dashboard", component: DashboardPage, auth: true },
  profile: { path: "/profile", component: ProfilePage, auth: true },
} satisfies Record<string, RouteConfig>;

// routes.home.path의 타입: "/" (리터럴!)
// 다른 곳에서 이 경로를 참조할 때 오타를 방지할 수 있습니다.

// 에러 메시지 맵에서 satisfies 활용
type ErrorCode = "NOT_FOUND" | "UNAUTHORIZED" | "SERVER_ERROR";

const errorMessages = {
  NOT_FOUND: "요청한 리소스를 찾을 수 없습니다.",
  UNAUTHORIZED: "인증이 필요합니다. 다시 로그인해 주세요.",
  SERVER_ERROR: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
} satisfies Record<ErrorCode, string>;
// 만약 ErrorCode에 새 코드가 추가되면, 여기서 컴파일 에러 발생 → 빠뜨림 방지
```

### 흔한 실수

```typescript
// ❌ 실수: satisfies와 as const를 혼동
// as const는 모든 값을 readonly 리터럴로 만들고, 타입 호환성 검사를 하지 않음
const colorsConst = {
  primary: "#007bff",
  typo: "#ffffff", // 키가 잘못되어도 에러 없음!
} as const;

// ✅ satisfies는 타입 호환성을 검사하면서도 리터럴 추론을 유지
const colorsSatisfies = {
  primary: "#007bff",
  // typo: "#ffffff", // ❌ 에러! 'typo'는 Palette 타입의 키가 아님
  secondary: "#6c757d",
  accent: "#ffc107",
} satisfies Record<Palette, ColorHex>;

// ✅ 둘을 합쳐서 사용할 수도 있음: 검증 + 완전한 불변 리터럴
const colorsImmutable = {
  primary: "#007bff",
  secondary: "#6c757d",
  accent: "#ffc107",
} as const satisfies Record<Palette, ColorHex>;
```

---

## 5. Discriminated Unions: 조건부 타입 설계

### 왜 중요한가

**Discriminated Unions(판별 유니온)**은 하나의 "판별자(discriminant)" 프로퍼티를 기준으로 여러 타입 중 하나를 선택하는 패턴입니다. React 컴포넌트 Props 설계에서 특히 강력한데, `variant`나 `type` 같은 프로퍼티 값에 따라 다른 프로퍼티가 필수/금지되는 조건을 **타입 수준에서 강제**할 수 있습니다.

이 패턴을 사용하면 "이 prop 조합은 허용하면 안 되는데..." 같은 런타임 버그를 컴파일 타임에 예방할 수 있습니다.

### 5.1 컴포넌트 Props에 적용

```typescript
// 버튼 컴포넌트: variant에 따라 허용되는 props가 달라짐
// "primary"일 때는 size가 필수, "link"일 때는 size가 없어야 하고 href가 필수

type PrimaryButtonProps = {
  variant: "primary";
  size: "sm" | "md" | "lg"; // 필수
  href?: never;              // 금지 (never로 사용 불가능하게)
  children: React.ReactNode;
  onClick?: () => void;
};

type LinkButtonProps = {
  variant: "link";
  size?: never;              // 금지
  href: string;              // 필수
  children: React.ReactNode;
  onClick?: () => void;
};

type GhostButtonProps = {
  variant: "ghost";
  size?: "sm" | "md" | "lg"; // 선택
  href?: never;
  children: React.ReactNode;
  onClick?: () => void;
};

// 유니온으로 합침
type ButtonProps = PrimaryButtonProps | LinkButtonProps | GhostButtonProps;

function Button(props: ButtonProps) {
  // variant로 분기하면 TypeScript가 자동으로 타입을 좁혀줌
  switch (props.variant) {
    case "primary":
      // 여기서 props.size는 "sm" | "md" | "lg" (필수)
      return <button className={`btn-primary btn-${props.size}`}>{props.children}</button>;
    case "link":
      // 여기서 props.href는 string (필수)
      return <a href={props.href} className="btn-link">{props.children}</a>;
    case "ghost":
      // 여기서 props.size는 선택적
      return <button className={`btn-ghost ${props.size ? `btn-${props.size}` : ""}`}>{props.children}</button>;
  }
}

// ✅ 올바른 사용
<Button variant="primary" size="lg">확인</Button>
<Button variant="link" href="/about">더 알아보기</Button>

// ❌ 컴파일 에러: "primary"인데 size가 없음
// <Button variant="primary">확인</Button>

// ❌ 컴파일 에러: "link"인데 href가 없음
// <Button variant="link">더 알아보기</Button>

// ❌ 컴파일 에러: "link"인데 size를 전달함
// <Button variant="link" href="/about" size="lg">더 알아보기</Button>
```

### 5.2 API 응답 타입에 적용

```typescript
// API 응답을 성공/실패로 명확하게 구분
type ApiResponse<T> =
  | { status: "success"; data: T; error?: never }
  | { status: "error"; data?: never; error: { code: number; message: string } }
  | { status: "loading"; data?: never; error?: never };

function handleResponse<T>(response: ApiResponse<T>) {
  switch (response.status) {
    case "success":
      // response.data가 T 타입으로 안전하게 접근 가능
      console.log("데이터:", response.data);
      break;
    case "error":
      // response.error가 { code, message }로 안전하게 접근 가능
      console.error(`에러 ${response.error.code}: ${response.error.message}`);
      break;
    case "loading":
      // data도 error도 없음
      console.log("로딩 중...");
      break;
  }
}
```

### 5.3 exhaustiveness 검사 (모든 케이스 처리 보장)

```typescript
// never 타입을 활용하여 switch문에서 모든 케이스를 처리했는지 검사
function assertNever(value: never): never {
  throw new Error(`처리되지 않은 케이스: ${JSON.stringify(value)}`);
}

type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return (shape.base * shape.height) / 2;
    default:
      // 만약 Shape에 새로운 kind가 추가되면 여기서 컴파일 에러 발생!
      return assertNever(shape);
  }
}
```

### 흔한 실수

```typescript
// ❌ 실수: 판별자 없이 유니온 타입 사용
// TypeScript가 어떤 타입인지 자동으로 좁혀줄 수 없음
type BadUnion = { name: string; age: number } | { name: string; email: string };
// name이 두 타입 모두에 있어서 구분이 불가능

// ✅ 올바른 방법: 공통 판별자 프로퍼티를 추가
type GoodUnion =
  | { type: "person"; name: string; age: number }
  | { type: "contact"; name: string; email: string };
// type 프로퍼티로 명확하게 구분 가능
```

---

## 6. 타입 가드(Type Guard)와 타입 내로잉(Narrowing)

### 왜 중요한가

TypeScript의 타입 시스템은 **제어 흐름 분석(Control Flow Analysis)**을 통해 조건문 내부에서 타입을 자동으로 좁혀줍니다. 하지만 복잡한 비즈니스 로직에서는 기본 제공 연산자(`typeof`, `instanceof`, `in`)만으로는 부족할 때가 있습니다.

**사용자 정의 타입 가드(User-Defined Type Guard)**를 사용하면 개발자가 직접 타입 좁힘 로직을 정의하고, 이를 재사용 가능한 함수로 만들 수 있습니다. 타입 가드를 잘 활용하면 `as` 키워드 사용을 거의 없앨 수 있습니다.

### 6.1 기본 내로잉: typeof / instanceof / in

```typescript
// typeof: 원시 타입 구분
function processValue(value: string | number) {
  if (typeof value === "string") {
    // 이 블록 안에서 value는 string 타입
    console.log(value.toUpperCase());
  } else {
    // 이 블록 안에서 value는 number 타입
    console.log(value.toFixed(2));
  }
}

// instanceof: 클래스 인스턴스 구분
class ApiError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

class NetworkError extends Error {
  constructor(public retryable: boolean, message: string) {
    super(message);
  }
}

function handleError(error: ApiError | NetworkError) {
  if (error instanceof ApiError) {
    // error.code에 안전하게 접근 가능
    console.error(`API 에러 ${error.code}: ${error.message}`);
  } else {
    // error.retryable에 안전하게 접근 가능
    if (error.retryable) {
      console.log("재시도 가능한 네트워크 오류");
    }
  }
}

// in: 특정 프로퍼티 존재 여부로 구분
interface Dog {
  bark: () => void;
  breed: string;
}

interface Cat {
  meow: () => void;
  color: string;
}

function interact(animal: Dog | Cat) {
  if ("bark" in animal) {
    // animal은 Dog 타입
    animal.bark();
    console.log(`품종: ${animal.breed}`);
  } else {
    // animal은 Cat 타입
    animal.meow();
    console.log(`색상: ${animal.color}`);
  }
}
```

### 6.2 사용자 정의 타입 가드 (`is` 키워드)

```typescript
// 반환 타입에 "is" 키워드를 사용하면 TypeScript에게 타입 좁힘 정보를 알려줌
interface Admin {
  role: "admin";
  permissions: string[];
  department: string;
}

interface RegularUser {
  role: "user";
  subscriptionTier: "free" | "pro";
}

type AppUser = Admin | RegularUser;

// 사용자 정의 타입 가드 함수
// 반환 타입 "user is Admin"이 핵심
function isAdmin(user: AppUser): user is Admin {
  return user.role === "admin";
}

function renderDashboard(user: AppUser) {
  if (isAdmin(user)) {
    // 이 블록에서 user는 Admin 타입
    console.log(`관리자 부서: ${user.department}`);
    console.log(`권한: ${user.permissions.join(", ")}`);
  } else {
    // 이 블록에서 user는 RegularUser 타입
    console.log(`구독 등급: ${user.subscriptionTier}`);
  }
}

// 배열 필터링에서 타입 가드 활용
const users: AppUser[] = [
  { role: "admin", permissions: ["read", "write"], department: "Engineering" },
  { role: "user", subscriptionTier: "pro" },
  { role: "admin", permissions: ["read"], department: "Marketing" },
];

// isAdmin을 타입 가드로 사용하면 filter 결과가 Admin[] 타입으로 추론됨!
const admins: Admin[] = users.filter(isAdmin);
```

### 6.3 null/undefined 필터링 타입 가드

```typescript
// 실무에서 매우 자주 사용하는 패턴: null/undefined 제거
function isNotNullish<T>(value: T | null | undefined): value is T {
  return value != null; // null과 undefined를 동시에 체크
}

const mixedArray: (string | null | undefined)[] = ["hello", null, "world", undefined, "!"];

// filter(Boolean)은 타입을 좁혀주지 않지만, 커스텀 가드는 가능!
const cleanArray: string[] = mixedArray.filter(isNotNullish);
// cleanArray: ["hello", "world", "!"]
// 타입도 string[]으로 정확하게 추론됨
```

### Bad Practice vs Good Practice

```typescript
// ❌ Bad: 타입 단언(as)으로 강제 캐스팅
function getAdminPermissions(user: AppUser): string[] {
  return (user as Admin).permissions; // Admin이 아니면 런타임 에러!
}

// ✅ Good: 타입 가드로 안전하게 좁힘
function getAdminPermissionsSafe(user: AppUser): string[] | null {
  if (isAdmin(user)) {
    return user.permissions; // 안전하게 접근
  }
  return null;
}
```

### 흔한 실수

```typescript
// ❌ 실수: 타입 가드 함수에서 반환 타입 "is"를 빼먹음
// boolean만 반환하면 TypeScript가 타입을 좁혀주지 않음
function isAdminBad(user: AppUser): boolean {
  return user.role === "admin";
}

if (isAdminBad(user)) {
  // user는 여전히 AppUser 타입 → Admin의 프로퍼티에 접근 불가!
  // user.permissions; // ❌ 에러
}

// ✅ 올바른 방법: 반환 타입에 "is" 명시
function isAdminGood(user: AppUser): user is Admin {
  return user.role === "admin";
}

if (isAdminGood(user)) {
  user.permissions; // ✅ 안전하게 접근 가능
}
```

---

## 7. 제네릭 실전 패턴

### 왜 중요한가

**제네릭(Generics)**은 "타입을 매개변수처럼" 사용하는 기능입니다. 함수나 클래스를 작성할 때 특정 타입에 종속되지 않으면서도 타입 안전성을 유지할 수 있게 해줍니다.

제네릭이 없다면 범용 유틸리티 함수를 만들 때 `any`를 사용하게 되고, 이는 타입 안전성을 완전히 포기하는 것입니다. 제네릭을 올바르게 활용하면 **재사용성과 타입 안전성을 동시에** 확보할 수 있습니다.

### 7.1 제네릭 제약 조건 (Constraints)

```typescript
// extends를 사용하여 제네릭 타입에 제약 조건을 부여
// "T는 반드시 id 프로퍼티를 가진 객체여야 한다"
interface HasId {
  id: string | number;
}

// T extends HasId: T는 HasId를 만족하는 타입만 허용
function findById<T extends HasId>(items: T[], id: T["id"]): T | undefined {
  return items.find((item) => item.id === id);
}

interface User {
  id: string;
  name: string;
}

interface Product {
  id: number;
  title: string;
  price: number;
}

const users: User[] = [{ id: "u1", name: "김철수" }];
const products: Product[] = [{ id: 1, title: "키보드", price: 50000 }];

const user = findById(users, "u1");       // 반환 타입: User | undefined
const product = findById(products, 1);     // 반환 타입: Product | undefined
// findById(products, "u1");               // ❌ 에러: number 타입에 string 할당 불가
```

### 7.2 제네릭 커스텀 훅

```typescript
import { useState, useCallback } from "react";

// 비동기 작업을 위한 제네릭 훅
// T: 성공 시 데이터 타입, E: 에러 타입
function useAsync<T, E = Error>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);
  const [loading, setLoading] = useState(false);

  // execute는 Promise<T>를 반환하는 함수를 받아 실행
  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      setError(err as E);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, error, loading, execute } as const;
}

// 사용 예시: 타입이 자동으로 추론됨
function UserProfile({ userId }: { userId: string }) {
  const { data, error, loading, execute } = useAsync<User>();

  useEffect(() => {
    execute(() => fetchUser(userId));
  }, [userId, execute]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>에러 발생</div>;
  if (!data) return null;

  // data는 User 타입으로 안전하게 사용 가능
  return <div>{data.name}</div>;
}
```

### 7.3 keyof와 제네릭 조합

```typescript
// 객체에서 특정 키의 값을 안전하게 가져오는 유틸리티
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "김철수", age: 30, email: "kim@test.com" };

const name = getProperty(user, "name");   // 타입: string
const age = getProperty(user, "age");     // 타입: number
// getProperty(user, "phone");            // ❌ 에러: "phone"은 keyof User가 아님

// 여러 키를 동시에 가져오는 pick 유틸리티
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    result[key] = obj[key];
  });
  return result;
}

const nameAndAge = pick(user, ["name", "age"]);
// 타입: Pick<typeof user, "name" | "age"> = { name: string; age: number }
```

### 7.4 제네릭 팩토리 패턴

```typescript
// API 엔드포인트별 CRUD 함수를 자동 생성하는 팩토리
function createApi<T extends HasId>(endpoint: string) {
  return {
    // 전체 목록 조회
    async getAll(): Promise<T[]> {
      const res = await fetch(`/api/${endpoint}`);
      return res.json();
    },

    // 단건 조회
    async getById(id: T["id"]): Promise<T> {
      const res = await fetch(`/api/${endpoint}/${id}`);
      return res.json();
    },

    // 생성 (id 제외)
    async create(data: Omit<T, "id">): Promise<T> {
      const res = await fetch(`/api/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },

    // 부분 수정
    async update(id: T["id"], data: Partial<Omit<T, "id">>): Promise<T> {
      const res = await fetch(`/api/${endpoint}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res.json();
    },
  };
}

// 사용: 타입 안전한 API 클라이언트가 자동 생성됨
const userApi = createApi<User>("users");
const productApi = createApi<Product>("products");

// userApi.getById의 인자는 string (User의 id 타입)
// productApi.getById의 인자는 number (Product의 id 타입)
```

### Bad Practice vs Good Practice

```typescript
// ❌ Bad: any를 사용한 범용 함수
function getPropertyBad(obj: any, key: string): any {
  return obj[key]; // 타입 안전성 전혀 없음
}
const value = getPropertyBad(user, "nonexistent"); // 에러 없이 undefined 반환

// ✅ Good: 제네릭을 사용한 타입 안전 함수
function getPropertyGood<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]; // 존재하는 키만 허용, 반환 타입도 정확
}
// getPropertyGood(user, "nonexistent"); // ❌ 컴파일 에러
```

### 흔한 실수

```typescript
// ❌ 실수 1: 불필요한 제네릭 (제네릭이 한 번만 사용됨)
// T가 반환 타입에만 사용되면 그냥 구체 타입을 쓰는 게 나음
function badGeneric<T>(value: T): void {
  console.log(value); // T를 반환하지 않으므로 제네릭이 의미 없음
}

// ✅ 개선: 제네릭 없이도 충분
function goodSimple(value: unknown): void {
  console.log(value);
}

// ❌ 실수 2: 제네릭 기본값을 설정하지 않아 사용처마다 타입을 명시해야 함
function useFetchBad<T>() { /* ... */ }
// 매번 useFetchBad<User>()로 타입을 명시해야 함

// ✅ 개선: 기본값 설정
function useFetchGood<T = unknown>() { /* ... */ }
// 타입 없이 useFetchGood()만으로도 사용 가능 (unknown으로 추론)

// ❌ 실수 3: extends 제약 조건을 너무 넓게 잡음
function processBad<T extends object>(data: T) { /* ... */ }
// object는 너무 넓음 → 배열, 함수, Date 등 모든 객체가 들어올 수 있음

// ✅ 개선: 필요한 구조를 명확하게 제약
function processGood<T extends { id: string; name: string }>(data: T) { /* ... */ }
```

---

## 8. 주의사항 및 흔한 실수

이 섹션은 TypeScript를 사용하면서 실무에서 자주 마주치는 실수와 안티패턴을 모아놓은 것입니다. 각 항목을 숙지하면 디버깅 시간을 크게 줄일 수 있습니다.

### 8.1 `any` 남용

```typescript
// ❌ any는 타입 시스템을 완전히 비활성화합니다.
function parseData(data: any) {
  return data.users.map((u: any) => u.name); // 런타임 에러 위험
}

// ✅ unknown을 사용하고 타입 가드로 좁히세요.
function parseDataSafe(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "users" in data &&
    Array.isArray((data as { users: unknown }).users)
  ) {
    // 안전하게 처리
  }
}

// ✅ 더 나은 방법: Zod 스키마로 검증
const DataSchema = z.object({
  users: z.array(z.object({ name: z.string() })),
});

function parseDataBest(data: unknown) {
  const result = DataSchema.parse(data);
  return result.users.map((u) => u.name); // 완전히 타입 안전
}
```

### 8.2 `!` (Non-null assertion) 남용

```typescript
// ❌ 느낌표(!)는 "이 값은 절대 null이 아니야"라고 컴파일러에게 거짓말하는 것
function getUserName(user: User | null) {
  return user!.name; // user가 null이면 런타임 에러
}

// ✅ 올바르게 null 체크
function getUserNameSafe(user: User | null): string {
  if (!user) {
    throw new Error("유저 정보가 없습니다.");
  }
  return user.name; // TypeScript가 자동으로 null 제거
}

// ✅ 옵셔널 체이닝과 기본값 활용
function getUserNameDefault(user: User | null): string {
  return user?.name ?? "알 수 없음";
}
```

### 8.3 `enum` 대신 `as const` 유니온 사용

```typescript
// ❌ enum은 트리쉐이킹이 안 되고, 번들 크기를 늘림
enum StatusBad {
  Active = "active",
  Inactive = "inactive",
  Pending = "pending",
}

// ✅ as const + 유니온 타입이 더 가벼움
const STATUS = {
  Active: "active",
  Inactive: "inactive",
  Pending: "pending",
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];
// 타입: "active" | "inactive" | "pending"

// 혹은 더 간단하게 (값 목록이 작을 때)
type StatusSimple = "active" | "inactive" | "pending";
```

### 8.4 인덱스 시그니처 남용

```typescript
// ❌ Record<string, any>는 어떤 키든 어떤 값이든 허용
const configBad: Record<string, any> = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  // 오타가 있어도 에러 없음
  tiemout: 3000,
};

// ✅ 구체적인 타입을 정의하세요
interface AppConfig {
  apiUrl: string;
  timeout: number;
  retryCount: number;
  debug: boolean;
}

const configGood: AppConfig = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retryCount: 3,
  debug: false,
  // tiemout: 3000, // ❌ 컴파일 에러! 오타 즉시 발견
};
```

### 8.5 타입 단언(as) 체인

```typescript
// ❌ as를 체인으로 사용하면 거의 모든 타입 검사를 우회할 수 있음
const value = "hello" as unknown as number; // 문자열을 숫자로?!

// ❌ API 응답에 as를 직접 사용
const user = response.data as User; // 실제 데이터가 User가 아닐 수 있음

// ✅ Zod로 검증하거나 타입 가드를 사용
const validatedUser = UserSchema.parse(response.data);
```

### 8.6 옵셔널 프로퍼티 vs undefined 유니온

```typescript
// 이 두 가지는 다릅니다!
interface WithOptional {
  name?: string; // 키 자체가 없어도 됨
}

interface WithUndefined {
  name: string | undefined; // 키는 반드시 있어야 하고, 값이 undefined일 수 있음
}

const a: WithOptional = {};              // ✅ name 키 자체가 없어도 OK
const b: WithUndefined = {};             // ❌ 에러: name이 필수
const c: WithUndefined = { name: undefined }; // ✅ 키는 있되 값이 undefined

// 실무 팁: exactOptionalPropertyTypes 컴파일러 옵션을 켜면
// 옵셔널 프로퍼티에 명시적으로 undefined를 할당하는 것도 에러가 됩니다.
```

---

## 💡 AI와 함께하는 타입 설계 전략

복잡한 요구사항에서 최적의 타입을 설계하고 싶을 때 AI를 활용하세요. 아래는 효과적인 프롬프트 예시입니다.

> **Prompt 1 - Discriminated Unions 설계**:
> "React 컴포넌트의 Props를 설계 중이야. `variant`에 따라 `size`가 필수가 되거나 금지되어야 해. 예를 들어 `variant="primary"`일 때는 `size`가 필수고, `variant="link"`일 때는 `size`가 없어야 해. Discriminated Unions를 사용해서 가장 깔끔한 타입을 작성해줘."

> **Prompt 2 - 제네릭 설계**:
> "API 엔드포인트별로 CRUD 함수를 자동 생성하는 팩토리 함수를 만들고 싶어. 각 엔티티 타입에 맞게 타입 안전한 메서드들이 생성되어야 해. 제네릭을 활용해서 설계해줘."

> **Prompt 3 - Zod 스키마 전환**:
> "기존에 `interface`로 정의된 타입들을 Zod 스키마로 전환하고 싶어. 기존 인터페이스를 보여줄 테니 Zod 스키마를 만들고, `z.infer`로 타입을 추출하는 코드를 작성해줘. 런타임 검증 로직도 포함해줘."

---

## ✅ 체크리스트

### 런타임 안전성
- [ ] API 응답에 `as` 대신 `Zod` 스키마 검증을 적용했나요?
- [ ] 외부 입력(URL 파라미터, localStorage, 사용자 입력)에 대한 검증이 있나요?
- [ ] `z.infer`로 타입을 추출하여 스키마와 타입의 동기화를 보장하나요?

### 타입 설계
- [ ] ID 값들에 대해 **Branded Types** 적용을 검토했나요?
- [ ] `Record<string, any>` 대신 구체적인 인덱스 시그니처나 유니온 타입을 사용했나요?
- [ ] 라이브러리 설계 시 `satisfies`를 활용해 타입 추론을 극대화했나요?
- [ ] Props에 조건부 요구사항이 있으면 **Discriminated Unions**을 사용했나요?

### 타입 안전성
- [ ] `any` 대신 `unknown`을 사용하고 타입 가드로 좁히고 있나요?
- [ ] `!` (non-null assertion)을 남용하지 않고 적절한 null 체크를 하고 있나요?
- [ ] `as` 타입 단언을 최소화하고 타입 가드를 활용하고 있나요?
- [ ] `enum` 대신 `as const` 유니온 타입을 사용하고 있나요?

### 제네릭과 유틸리티
- [ ] 제네릭에 적절한 `extends` 제약 조건을 걸었나요?
- [ ] `keyof`, `Pick`, `Omit` 등 내장 유틸리티 타입을 활용하고 있나요?
- [ ] 커스텀 타입 가드 함수에 `is` 반환 타입을 명시했나요?
- [ ] switch문에서 `assertNever`로 exhaustiveness 검사를 하고 있나요?

### 코드 품질
- [ ] 옵셔널 프로퍼티(`?`)와 `undefined` 유니온의 차이를 이해하고 적절히 사용했나요?
- [ ] 템플릿 리터럴 타입으로 문자열 패턴을 강제하고 있나요?
- [ ] 매핑된 타입으로 반복적인 타입 정의를 자동화했나요?
