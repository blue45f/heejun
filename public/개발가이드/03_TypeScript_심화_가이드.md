# TypeScript 심화 가이드 (2025-2026 최신)

## 목차
1. [TypeScript 5.x 주요 기능](#typescript-5x-주요-기능)
2. [고급 타입 시스템](#고급-타입-시스템)
3. [제네릭 고급 패턴](#제네릭-고급-패턴)
4. [유틸리티 타입 심화](#유틸리티-타입-심화)
5. [타입 가드](#타입-가드)
6. [고급 패턴](#고급-패턴)
7. [React 타입 패턴](#react-타입-패턴)
8. [TypeScript 설정 Best Practices](#typescript-설정-best-practices)
9. [실전 팁](#실전-팁)
10. [참고 자료](#참고-자료)

---

## TypeScript 5.x 주요 기능

### 설치
```bash
npm install -D typescript@latest
# TypeScript 5.8+ (2026년 기준)
```

### satisfies 연산자 (TS 4.9+)

`satisfies`는 타입 검증과 타입 추론을 동시에 유지할 수 있는 연산자이다. 타입 어노테이션과 달리 값의 구체적인 타입 정보가 손실되지 않는다.

```typescript
type Route = {
  path: string;
  children?: Route[];
};

// 타입 어노테이션 방식: 추론이 Route[]로 넓어짐
const routes: Route[] = [
  { path: '/', children: [{ path: '/home' }] },
  { path: '/about' },
];

// satisfies 방식: 타입 검증 + 구체적 추론 유지
const routes = [
  { path: '/', children: [{ path: '/home' }] },
  { path: '/about' },
] satisfies Route[];
// routes[0].children는 Route[]로 추론 (undefined 아님)

// 실전 활용: 설정 객체
type Config = Record<string, string | number | boolean>;

const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  debug: false,
} satisfies Config;

// config.apiUrl은 string으로 추론 (string | number | boolean이 아님)
config.apiUrl.startsWith('https'); // ✅ OK, 타입이 좁혀져 있음
```

### const 타입 파라미터 (TS 5.0+)

제네릭 함수에서 `const` 수정자를 사용하면 인수를 자동으로 `as const`처럼 추론한다.

```typescript
// const 타입 파라미터 없이
function createRoutes<T extends readonly string[]>(paths: T) {
  return paths;
}
const r1 = createRoutes(['/', '/about']); // string[] 으로 추론

// const 타입 파라미터 사용
function createRoutes<const T extends readonly string[]>(paths: T) {
  return paths;
}
const r2 = createRoutes(['/', '/about']); // readonly ["/", "/about"] 으로 추론

// 실전 활용: 타입 안전한 이벤트 매핑
function defineEvents<const T extends Record<string, unknown[]>>(events: T) {
  return events;
}

const events = defineEvents({
  click: [0, 0] as [x: number, y: number],
  keydown: [''] as [key: string],
});
// typeof events = { click: [x: number, y: number]; keydown: [key: string] }
```

### 데코레이터 메타데이터 (TS 5.2+)

ES 표준 데코레이터에서 메타데이터를 공유하는 공식 방법이다. `Symbol.metadata`를 통해 데코레이터 간 데이터 전달이 가능하다.

```typescript
// 데코레이터 메타데이터 활용
function tracked(value: unknown, context: ClassFieldDecoratorContext) {
  // context.metadata를 통해 메타데이터 접근
  const fields = (context.metadata.trackedFields ??= []) as string[];
  fields.push(String(context.name));
}

class User {
  @tracked name: string = '';
  @tracked email: string = '';
  role: string = 'viewer';
}

// 메타데이터 조회
const trackedFields = User[Symbol.metadata]?.trackedFields;
// ["name", "email"] - role은 @tracked가 없으므로 미포함
```

### using 선언과 명시적 리소스 관리 (TS 5.2+)

`Symbol.dispose`와 `using` 키워드로 리소스를 자동 정리한다.

```typescript
class DatabaseConnection {
  constructor(private url: string) {
    console.log(`Connected to ${url}`);
  }

  query(sql: string) { /* ... */ }

  [Symbol.dispose]() {
    console.log(`Disconnected from ${this.url}`);
  }
}

function executeQuery() {
  using db = new DatabaseConnection('postgres://localhost/mydb');
  db.query('SELECT * FROM users');
  // 스코프를 벗어나면 자동으로 [Symbol.dispose]() 호출
}

// 비동기 리소스: await using
class FileHandle {
  async [Symbol.asyncDispose]() {
    await this.flush();
    await this.close();
  }
  // ...
}

async function writeFile() {
  await using file = new FileHandle('/tmp/data.txt');
  await file.write('hello');
  // 스코프를 벗어나면 자동으로 [Symbol.asyncDispose]() 호출
}
```

### 기타 주목할 기능 (TS 5.5 - 5.8)

```typescript
// 추론된 타입 술어 (TS 5.5) - filter에서 자동 타입 좁히기
const nums = [1, null, 3, undefined, 5];
const filtered = nums.filter(x => x != null);
// TS 5.5+: number[] 로 자동 추론 (이전에는 (number | null | undefined)[])

// 정규표현식 구문 검사 (TS 5.5)
const re = /hello(?/; // ❌ TS 5.5+에서 컴파일 에러

// import 속성 (TS 5.3)
import data from './config.json' with { type: 'json' };
import styles from './app.css' with { type: 'css' };
```

---

## 고급 타입 시스템

### 1. Template Literal Types

**기본 사용**
```typescript
type EventName = 'click' | 'scroll' | 'mousemove';
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onScroll" | "onMousemove"

// 실전 예시: CSS 속성
type CSSProperty = 'padding' | 'margin' | 'border';
type CSSDirection = 'top' | 'right' | 'bottom' | 'left';
type CSSPropertyWithDirection = `${CSSProperty}-${CSSDirection}`;
// "padding-top" | "padding-right" | ... | "border-left"
```

**고급 패턴: 타입 안전한 이벤트 시스템**
```typescript
type Events = {
  'user:login': { userId: string; email: string };
  'user:logout': { userId: string };
  'product:add': { productId: string; quantity: number };
  'product:remove': { productId: string };
};

class EventBus {
  private listeners = new Map<keyof Events, Set<Function>>();

  on<K extends keyof Events>(
    event: K,
    handler: (payload: Events[K]) => void
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(payload));
    }
  }
}

// 사용
const bus = new EventBus();

bus.on('user:login', (payload) => {
  // payload의 타입이 자동으로 { userId: string; email: string }
  console.log(payload.userId, payload.email);
});

bus.emit('user:login', { 
  userId: '123', 
  email: 'user@example.com' 
}); // ✅ OK

bus.emit('user:login', { 
  userId: '123' 
}); // ❌ Error: email 누락
```

### 2. Conditional Types

**기본 패턴**
```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<number>; // false

// infer 키워드
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: '123', name: 'John' };
}

type UserReturnType = GetReturnType<typeof getUser>;
// { id: string; name: string; }
```

**실전 예시: API 응답 타입 추출**
```typescript
type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

type UnwrapApiResponse<T> = T extends ApiResponse<infer U> ? U : never;

type UserResponse = ApiResponse<{ id: string; name: string }>;
type User = UnwrapApiResponse<UserResponse>;
// { id: string; name: string }

// 배열 요소 타입 추출
type ArrayElement<T> = T extends (infer U)[] ? U : never;

type Numbers = number[];
type NumberElement = ArrayElement<Numbers>; // number
```

### 3. Mapped Types

**유틸리티 타입 직접 구현**
```typescript
// Partial 직접 구현
type MyPartial<T> = {
  [P in keyof T]?: T[P];
};

// Required 직접 구현
type MyRequired<T> = {
  [P in keyof T]-?: T[P]; // -? 는 선택적 제거
};

// Readonly 직접 구현
type MyReadonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Mutable (readonly 제거)
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
```

**실전 예시: API 엔드포인트 타입**
```typescript
type ApiEndpoints = {
  'GET /users': { response: User[] };
  'GET /users/:id': { response: User };
  'POST /users': { body: CreateUserDto; response: User };
  'GET /products': { response: Product[] };
};

type ExtractEndpoint<
  T,
  M extends string
> = {
  [K in keyof T]: T[K] extends { method: M } ? K : never;
}[keyof T];

type GetEndpoints = ExtractEndpoint<ApiEndpoint, 'GET'>;
// '/users' | '/users/:id' | '/products'

type PostEndpoints = ExtractEndpoint<ApiEndpoint, 'POST'>;
// '/users'
```

### 4. Discriminated Unions (Tagged Unions)

**상태 관리 타입 안전성**
```typescript
type LoadingState = {
  status: 'loading';
};

type SuccessState<T> = {
  status: 'success';
  data: T;
};

type ErrorState = {
  status: 'error';
  error: Error;
};

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

// 사용
function render(state: AsyncState<User>) {
  switch (state.status) {
    case 'loading':
      // state.data는 접근 불가 (타입 안전)
      return <Spinner />;
    
    case 'success':
      // state.data는 User 타입으로 보장됨
      return <UserProfile user={state.data} />;
    
    case 'error':
      // state.error는 Error 타입으로 보장됨
      return <ErrorMessage error={state.error} />;
  }
}
```

**Redux Action 타입**
```typescript
type Action =
  | { type: 'INCREMENT'; payload: number }
  | { type: 'DECREMENT'; payload: number }
  | { type: 'RESET' }
  | { type: 'SET_USER'; payload: User };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      // action.payload는 number로 보장
      return { ...state, count: state.count + action.payload };
    
    case 'RESET':
      // action.payload 접근 불가 (타입 에러)
      return { ...state, count: 0 };
    
    case 'SET_USER':
      // action.payload는 User로 보장
      return { ...state, user: action.payload };
  }
}
```

---

## 제네릭 고급 패턴

### 1. 제네릭 제약 (Constraints)

```typescript
// extends로 제약 조건 설정
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: '123', name: 'John', age: 30 };
const userName = getProperty(user, 'name'); // ✅ OK, 타입은 string
const invalid = getProperty(user, 'invalid'); // ❌ Error

// 여러 제약 조건
interface HasId {
  id: string;
}

interface HasTimestamp {
  createdAt: Date;
  updatedAt: Date;
}

function merge<T extends HasId & HasTimestamp>(
  obj1: T,
  obj2: Partial<T>
): T {
  return { ...obj1, ...obj2, updatedAt: new Date() };
}
```

### 2. 제네릭 기본값

```typescript
interface ApiResponse<T = unknown, E = Error> {
  data?: T;
  error?: E;
  isLoading: boolean;
}

// 타입 인수 생략 가능
const response: ApiResponse = { isLoading: false };
// ApiResponse<unknown, Error>

// 일부만 지정
const userResponse: ApiResponse<User> = { data: user, isLoading: false };
// ApiResponse<User, Error>
```

### 3. 제네릭 함수 오버로딩

```typescript
function createFetcher<T>(url: string): Promise<T>;
function createFetcher<T>(url: string, options: RequestInit): Promise<T>;
function createFetcher<T>(url: string, options?: RequestInit): Promise<T> {
  return fetch(url, options).then(res => res.json());
}

// 사용
const users = await createFetcher<User[]>('/api/users');
const user = await createFetcher<User>('/api/users/123', { method: 'GET' });
```

---

## 유틸리티 타입 심화

### 1. Pick & Omit 활용

```typescript
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  age: number;
  role: 'admin' | 'user';
}

// 로그인 응답 (password 제외)
type UserResponse = Omit<User, 'password'>;

// 회원가입 요청 (id 제외)
type CreateUserDto = Omit<User, 'id'>;

// 프로필 업데이트 (id, email, password 제외)
type UpdateProfileDto = Omit<User, 'id' | 'email' | 'password'>;

// 필요한 필드만 선택
type UserPreview = Pick<User, 'id' | 'name' | 'role'>;
```

### 2. Record 활용

```typescript
// 객체 키-값 타입 정의
type UserRole = 'admin' | 'editor' | 'viewer';

type Permissions = Record<UserRole, string[]>;

const permissions: Permissions = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

// 중첩 Record
type PageComponents = Record<string, Record<string, React.ComponentType>>;

const components: PageComponents = {
  home: {
    Header: HomeHeader,
    Footer: HomeFooter,
  },
  product: {
    Header: ProductHeader,
    Sidebar: ProductSidebar,
  },
};
```

### 3. ReturnType & Parameters

```typescript
function createUser(name: string, age: number) {
  return {
    id: Math.random().toString(),
    name,
    age,
    createdAt: new Date(),
  };
}

// 함수 반환 타입 추출
type User = ReturnType<typeof createUser>;
// { id: string; name: string; age: number; createdAt: Date }

// 함수 매개변수 타입 추출
type CreateUserParams = Parameters<typeof createUser>;
// [name: string, age: number]

// 첫 번째 매개변수만
type FirstParam = Parameters<typeof createUser>[0];
// string
```

### 4. Awaited (비동기 타입 추출)

```typescript
async function fetchUser() {
  const response = await fetch('/api/user');
  return response.json();
}

// Promise의 resolved 타입 추출
type User = Awaited<ReturnType<typeof fetchUser>>;

// 중첩 Promise도 처리
type DeepAwaited = Awaited<Promise<Promise<number>>>;
// number
```

---

## 타입 가드

### 1. typeof 타입 가드

```typescript
function processValue(value: string | number) {
  if (typeof value === 'string') {
    // value는 string으로 좁혀짐
    return value.toUpperCase();
  } else {
    // value는 number로 좁혀짐
    return value.toFixed(2);
  }
}
```

### 2. instanceof 타입 가드

```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
  }
}

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    // error는 ApiError로 좁혀짐
    console.error(`API Error ${error.statusCode}: ${error.message}`);
  } else if (error instanceof Error) {
    // error는 Error로 좁혀짐
    console.error(error.message);
  } else {
    console.error('Unknown error', error);
  }
}
```

### 3. 커스텀 타입 가드

```typescript
interface User {
  type: 'user';
  id: string;
  email: string;
}

interface Admin {
  type: 'admin';
  id: string;
  email: string;
  permissions: string[];
}

type Account = User | Admin;

// 타입 가드 함수
function isAdmin(account: Account): account is Admin {
  return account.type === 'admin';
}

// 사용
function greet(account: Account) {
  if (isAdmin(account)) {
    // account는 Admin으로 좁혀짐
    console.log(`Admin with permissions: ${account.permissions.join(', ')}`);
  } else {
    // account는 User로 좁혀짐
    console.log(`User: ${account.email}`);
  }
}
```

### 4. Assertion Functions (단언 함수)

```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Not a string');
  }
}

function processInput(input: unknown) {
  assertIsString(input);
  // 이 시점부터 input은 string으로 보장됨
  return input.toUpperCase();
}

// Non-null assertion
function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error('Value is null or undefined');
  }
}

function processUser(user: User | null) {
  assertIsDefined(user);
  // user는 User로 보장됨 (null 제외)
  console.log(user.name);
}
```

---

## 고급 패턴

### 1. Builder 패턴

```typescript
class QueryBuilder<T> {
  private filters: Array<(item: T) => boolean> = [];
  private sorts: Array<(a: T, b: T) => number> = [];

  where(predicate: (item: T) => boolean): this {
    this.filters.push(predicate);
    return this;
  }

  orderBy(compareFn: (a: T, b: T) => number): this {
    this.sorts.push(compareFn);
    return this;
  }

  execute(data: T[]): T[] {
    let result = [...data];
    
    // 필터 적용
    for (const filter of this.filters) {
      result = result.filter(filter);
    }
    
    // 정렬 적용
    for (const sort of this.sorts) {
      result = result.sort(sort);
    }
    
    return result;
  }
}

// 사용
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

const products: Product[] = [/* ... */];

const result = new QueryBuilder<Product>()
  .where(p => p.price > 100)
  .where(p => p.category === 'electronics')
  .orderBy((a, b) => b.price - a.price)
  .execute(products);
```

### 2. Opaque Types (명목적 타입)

```typescript
// 브랜드 타입으로 구분
type UserId = string & { readonly brand: unique symbol };
type ProductId = string & { readonly brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}

function createProductId(id: string): ProductId {
  return id as ProductId;
}

function getUser(userId: UserId) {
  // userId는 UserId 타입만 허용
}

const userId = createUserId('123');
const productId = createProductId('456');

getUser(userId); // ✅ OK
getUser(productId); // ❌ Error: ProductId는 UserId가 아님
getUser('123'); // ❌ Error: string은 UserId가 아님
```

### 3. Nominal Typing with Classes

```typescript
class Email {
  private readonly _brand!: 'Email';
  
  private constructor(public readonly value: string) {}
  
  static create(email: string): Email | null {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Email(email);
    }
    return null;
  }
}

class PhoneNumber {
  private readonly _brand!: 'PhoneNumber';
  
  private constructor(public readonly value: string) {}
  
  static create(phone: string): PhoneNumber | null {
    if (/^\d{3}-\d{4}-\d{4}$/.test(phone)) {
      return new PhoneNumber(phone);
    }
    return null;
  }
}

function sendEmail(email: Email) {
  console.log(`Sending to ${email.value}`);
}

const email = Email.create('test@example.com');
const phone = PhoneNumber.create('010-1234-5678');

if (email) {
  sendEmail(email); // ✅ OK
}

// sendEmail(phone); // ❌ Error: PhoneNumber는 Email이 아님
```

---

## React 타입 패턴

### 1. 타입이 지정된 커스텀 Hooks

```typescript
import { useState, useCallback, useEffect } from 'react';

// 제네릭 커스텀 Hook: useFetch
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as T;
        setData(json);
        setError(null);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [url]);

  return { data, error, isLoading } as const;
}

// 사용: 반환 타입이 자동 추론됨
const { data, error, isLoading } = useFetch<User[]>('/api/users');
// data: User[] | null

// 제네릭 커스텀 Hook: useLocalStorage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue(prev => {
        const nextValue = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(nextValue));
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue] as const;
}

// 사용
const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
// theme: 'light' | 'dark'
// setTheme: (value: 'light' | 'dark' | ((prev: ...) => ...)) => void
```

### 2. 제네릭 컴포넌트

```typescript
import { type ReactNode } from 'react';

// 제네릭 리스트 컴포넌트
type ListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
};

function List<T>({ items, renderItem, keyExtractor, emptyMessage }: ListProps<T>) {
  if (items.length === 0) {
    return <p>{emptyMessage ?? '항목이 없습니다.'}</p>;
  }
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// 사용: T가 User로 자동 추론
<List
  items={users}
  keyExtractor={user => user.id}
  renderItem={user => <span>{user.name}</span>}
/>

// 제네릭 Select 컴포넌트
type SelectProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
};

function Select<T extends string>({ options, value, onChange, label }: SelectProps<T>) {
  return (
    <label>
      {label}
      <select value={value} onChange={e => onChange(e.target.value as T)}>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

// 사용: T가 리터럴 유니온으로 추론
const roles = ['admin', 'editor', 'viewer'] as const;
<Select
  options={roles}
  value={currentRole}  // 'admin' | 'editor' | 'viewer' 만 허용
  onChange={setRole}
/>
```

### 3. 다형성(Polymorphic) 컴포넌트

```typescript
import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react';

// as prop으로 렌더링할 HTML 요소를 지정하는 패턴
type PolyProps<C extends ElementType> = {
  as?: C;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<C>, 'as' | 'children'>;

function Box<C extends ElementType = 'div'>({ as, children, ...rest }: PolyProps<C>) {
  const Component = as ?? 'div';
  return <Component {...rest}>{children}</Component>;
}

// 사용
<Box>div로 렌더링</Box>
<Box as="a" href="/home">앵커로 렌더링</Box>
<Box as="button" onClick={handleClick}>버튼으로 렌더링</Box>
<Box as="a" onClick={handleClick} href="/test">앵커 속성 + 이벤트</Box>
// <Box as="a" disabled /> // ❌ Error: 'a' 요소에 disabled 속성 없음
```

### 4. 컴포넌트 Props 패턴 모음

```typescript
// 상호 배타적 Props (Discriminated Union)
type ModalProps =
  | { variant: 'alert'; message: string; onConfirm: () => void }
  | { variant: 'confirm'; message: string; onConfirm: () => void; onCancel: () => void }
  | { variant: 'custom'; children: ReactNode };

function Modal(props: ModalProps) {
  switch (props.variant) {
    case 'alert':
      return <div>{props.message}<button onClick={props.onConfirm}>OK</button></div>;
    case 'confirm':
      return (
        <div>
          {props.message}
          <button onClick={props.onConfirm}>Yes</button>
          <button onClick={props.onCancel}>No</button>
        </div>
      );
    case 'custom':
      return <div>{props.children}</div>;
  }
}

// Props를 satisfies로 기본값 정의
const defaultButtonProps = {
  size: 'md',
  variant: 'primary',
  disabled: false,
} satisfies Partial<ButtonProps>;
```

---

## TypeScript 설정 Best Practices

### tsconfig.json (2025-2026 권장)

```json
{
  "compilerOptions": {
    // 언어 & 환경
    "target": "ES2023",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",

    // 모듈 해석
    "moduleResolution": "Bundler", // Vite, esbuild 등
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true, // TS 5.0+ import type 강제

    // Type Checking
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "erasableSyntaxOnly": true, // TS 5.8+ Node.js --experimental-strip-types 호환

    // Emit
    "noEmit": true, // Vite 등 번들러가 빌드 담당
    "sourceMap": true,

    // Interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // Path Mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    },

    // Advanced
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

---

## 실전 팁

### 1. never를 활용한 완전성 검사

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'triangle':
      return (shape.base * shape.height) / 2;
    default:
      // 모든 케이스를 처리했다면 shape는 never
      const _exhaustiveCheck: never = shape;
      throw new Error(`Unhandled shape: ${JSON.stringify(_exhaustiveCheck)}`);
  }
}

// 나중에 Shape에 새로운 타입 추가 시 컴파일 에러 발생
```

### 2. const assertion

```typescript
// 일반 객체
const mutableConfig = {
  endpoint: '/api',
  timeout: 3000,
};
// { endpoint: string; timeout: number }

// const assertion
const frozenConfig = {
  endpoint: '/api',
  timeout: 3000,
} as const;
// { readonly endpoint: "/api"; readonly timeout: 3000 }

// 배열에도 적용
const colors = ['red', 'green', 'blue'] as const;
// readonly ["red", "green", "blue"]

type Color = typeof colors[number];
// "red" | "green" | "blue"
```

### 3. NoInfer 유틸리티 타입 (TS 5.4+)

```typescript
// 제네릭 추론에서 특정 위치의 추론을 차단
function createFSM<S extends string>(config: {
  initial: NoInfer<S>;
  states: S[];
}) {
  return config;
}

createFSM({
  initial: 'idle',       // ✅ 'idle'은 states에 포함됨
  states: ['idle', 'loading', 'error'],
});

createFSM({
  initial: 'unknown',    // ❌ Error: 'unknown'은 states에 없음
  states: ['idle', 'loading', 'error'],
});
// NoInfer가 없으면 initial의 'unknown'도 S 추론에 포함되어 에러가 발생하지 않음
```

### 4. 타입 안전한 Object.keys / entries

```typescript
// Object.keys는 string[]을 반환하므로 직접 타입을 좁힌다
function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

const user = { name: 'Alice', age: 30 };
for (const key of typedKeys(user)) {
  console.log(user[key]); // ✅ key는 'name' | 'age'
}
```

---

## 참고 자료

- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [TypeScript 5.x 릴리스 노트](https://devblogs.microsoft.com/typescript/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
- [Total TypeScript](https://www.totaltypescript.com/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
