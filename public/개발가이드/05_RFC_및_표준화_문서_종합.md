# AI 중심 RFC 및 표준화 문서 종합

> AI 활용 표준을 핵심 축으로, 개발 환경/네이밍/테스트/UX 라이팅까지 아우르는 기술 표준화 종합 가이드

---

## 목차

1. [AI 활용 표준](#1-ai-활용-표준)
2. [AI로 표준화 문서 초안 자동 생성](#2-ai로-표준화-문서-초안-자동-생성)
3. [기술 표준화 사례 모음](#3-기술-표준화-사례-모음)
4. [개발 환경 표준화](#4-개발-환경-표준화)
5. [네이밍 컨벤션 표준](#5-네이밍-컨벤션-표준)
6. [테스트 전략 표준](#6-테스트-전략-표준)
7. [UX 라이팅 가이드라인](#7-ux-라이팅-가이드라인)

---

## 1. AI 활용 표준

AI 도구는 코드 생성, 리뷰, 문서 작성 전반에 걸쳐 활용되며, 품질과 보안을 보장하기 위한 명확한 표준이 필요하다. 이 섹션은 AI 활용의 모든 측면을 다룬다.

### 1.1 AI 코드 리뷰 정책

#### 적용 범위

| 구분 | AI 리뷰 자동화 | 사람 리뷰 필수 | 설명 |
|------|:---:|:---:|------|
| 코드 스타일/포맷 | O | - | ESLint/Prettier로 자동 수정, AI가 패턴 일관성 검증 |
| 일반적 버그 패턴 탐지 | O | - | null 체크 누락, 무한 루프, 메모리 릭 패턴 |
| 성능 안티패턴 식별 | O | - | 불필요한 리렌더링, N+1 쿼리, 번들 사이즈 이슈 |
| 보안 취약점 검사 | O | O | AI 1차 스캔 후 보안 담당자 최종 확인 |
| 비즈니스 로직 검증 | - | O | 도메인 지식이 필요한 영역은 사람이 판단 |
| 아키텍처 적합성 | - | O | 시스템 설계 원칙과의 정합성은 사람이 판단 |
| 접근성(a11y) 검사 | O | O | AI가 WCAG 기준 자동 검사, 사람이 UX 맥락 검증 |

#### AI 코드 리뷰 파이프라인 설정

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review
on: [pull_request]
jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Review
        uses: ai-code-review-action@v2
        with:
          model: "claude-sonnet"
          rules: |
            - security_scan: required
            - performance_check: required
            - accessibility_check: required
            - style_check: optional
          ignore_paths: |
            - "**/*.test.ts"
            - "**/__mocks__/**"
          human_review_required: |
            - "src/core/**"
            - "src/auth/**"
            - "src/payment/**"
```

#### AI 리뷰 결과 처리 기준

| AI 리뷰 결과 | 조치 |
|-------------|------|
| **Critical** (보안/데이터 유출 가능성) | 즉시 수정 필수, 머지 차단 |
| **Warning** (성능/패턴 이슈) | PR 코멘트로 남기고, 사람 리뷰어가 판단 |
| **Info** (스타일/개선 제안) | 작성자 재량으로 반영 |
| **False Positive** | `@ai-ignore` 주석으로 무시 처리, 이유 기록 |

### 1.2 AI 생성 코드 품질 기준

#### 기본 원칙

1. **반드시 사람이 검토**: AI가 생성한 코드는 자동 머지하지 않는다
2. **테스트 필수**: AI 생성 코드에 대해서도 동일한 테스트 기준 적용
3. **라이선스 확인**: AI가 생성한 코드의 라이선스 이슈 검토
4. **코드 이해 필수**: 이해하지 못하는 AI 생성 코드는 사용하지 않는다
5. **출처 표기**: AI 도구로 생성된 주요 코드는 커밋 메시지에 명시

#### AI 생성 코드 체크리스트

- [ ] 생성된 코드의 동작 원리를 완전히 이해했는가
- [ ] 프로젝트의 기존 패턴/컨벤션과 일치하는가
- [ ] 테스트 코드가 함께 작성되었는가
- [ ] 보안 취약점이 없는가 (하드코딩된 비밀값, 인젝션 등)
- [ ] 불필요한 의존성을 추가하지 않았는가
- [ ] 에러 핸들링이 적절한가
- [ ] 타입 안전성이 보장되는가 (any 타입 사용 금지)
- [ ] 접근성(a11y) 기준을 충족하는가
- [ ] 성능에 부정적 영향이 없는가

### 1.3 프롬프트 가이드

#### AI 코드 생성 시 권장 프롬프트 패턴

```text
다음 조건을 만족하는 코드를 작성해줘:

[기능 요구사항]
- {요구사항 설명}

[기술 제약]
- TypeScript strict 모드
- 서버/클라이언트 컴포넌트 구분
- 에러 바운더리 포함
- 접근성(WCAG 2.2 AA) 준수
- 테스트 코드 포함 (Vitest + Testing Library)

[프로젝트 컨텍스트]
- 상태 관리: Zustand
- 스타일링: Tailwind CSS
- API 호출: TanStack Query
```

#### AI 문서 생성 시 프롬프트

```text
다음 조건으로 기술 문서를 작성해줘:

[문서 유형]: RFC / ADR / 기술 가이드 / 표준화 문서
[대상 독자]: {독자 수준}
[문서 구조]: {섹션 구성}
[포함 내용]:
- 코드 예시 포함
- 의사결정 근거 명시
- 대안 비교표 포함
- 체크리스트 포함
```

#### AI 코드 리뷰 요청 시 프롬프트

```text
다음 코드를 리뷰해줘:

[리뷰 관점]
- 보안 취약점
- 성능 안티패턴
- 타입 안전성
- 에러 핸들링
- 접근성

[프로젝트 컨텍스트]
- {기술 스택 설명}
- {코딩 컨벤션 핵심 규칙}

[코드]
{코드 붙여넣기}
```

### 1.4 AI 활용 거버넌스

| 항목 | 정책 |
|------|------|
| AI 도구 선정 | 팀 합의 후 표준 도구 지정, 분기별 재평가 |
| 비용 관리 | 팀 단위 월간 사용량 모니터링, 예산 한도 설정 |
| 데이터 보안 | 민감 정보(API 키, 고객 데이터, 내부 비즈니스 데이터)를 AI에 입력 금지 |
| 교육 | 분기별 AI 활용 베스트 프랙티스 공유 세션 |
| 품질 추적 | AI 생성 코드의 버그 발생률 월간 추적 |
| 프롬프트 공유 | 팀 내 효과적인 프롬프트를 공유 저장소에 축적 |
| 라이선스 | AI 생성 코드의 라이선스 리스크를 법무팀과 사전 협의 |

---

## 2. AI로 표준화 문서 초안 자동 생성

표준화 문서의 초안을 AI로 생성하면, 작성 시간을 대폭 단축하고 빠짐없이 구조화된 문서를 만들 수 있다.

### 2.1 표준화 문서 초안 생성 프롬프트

```text
아래 조건으로 개발 표준화 문서 초안을 작성해줘:

[표준화 대상]
- 대상: {네이밍 컨벤션 / 테스트 전략 / 코드 리뷰 정책 / 개발 환경 등}
- 적용 범위: {전체 조직 / 특정 팀 / 특정 프로젝트}
- 기존 현황: {현재 운영 중인 규칙이나 관행}

[요구사항]
- 규칙마다 올바른 예시와 잘못된 예시를 함께 제시
- 예외 사항과 예외 허용 근거를 명시
- 도입 단계(기존 코드 마이그레이션 계획) 포함
- 자동화 방안(린터 규칙, CI 검사 등) 포함

[출력 형식]
- 마크다운 테이블 활용
- 체크리스트 형태의 검증 항목 포함
- 변경 이력 섹션 포함
```

### 2.2 AI 초안 활용 워크플로우

```
1. 담당자가 표준화 대상과 제약 조건을 정리 (10분)
2. AI에 프롬프트 입력 -> 초안 자동 생성 (2분)
3. 담당자가 팀 맥락(기존 코드, 레거시, 팀 관행) 보완 (30분)
4. AI 리뷰로 누락 항목 점검 (2분)
5. 팀 리뷰 및 합의 -> 표준 확정
```

### 2.3 주의사항

- AI 초안은 범용적이므로 팀 고유의 관행/레거시를 반드시 반영해야 한다
- 자동 생성된 코드 예시는 실제 프로젝트에서 동작 검증 후 사용한다
- 표준화 문서는 RFC 프로세스를 거쳐 팀 합의로 확정한다

---

## 3. 기술 표준화 사례 모음

### 사례 1: 렌더링 전략 표준화 (Server Components 기반)

| 항목 | 내용 |
|------|------|
| 발의일자 | YYYY-MM-DD |
| 상태 | Accepted |
| 영향 범위 | 프론트엔드 전체 |

**문제**: CSR/SSR/SSG 전략이 프로젝트마다 달라 코드 재사용성 저하
**결정**: Server Components를 기본으로 사용하고, 상호작용이 필요한 컴포넌트만 `'use client'` 선언

| 구분 | Server Component | Client Component |
|------|:---:|:---:|
| 데이터 패칭 | O | - |
| 정적 레이아웃 | O | - |
| 이벤트 핸들링 | - | O |
| 상태 관리 (useState) | - | O |
| 서드파티 (window 접근) | - | O |

### 사례 2: AI 코드 리뷰 파이프라인 표준화

| 항목 | 내용 |
|------|------|
| 발의일자 | YYYY-MM-DD |
| 상태 | Accepted |
| 영향 범위 | 전체 개발 조직 |

**문제**: AI 코드 리뷰 도구 도입이 팀마다 상이하여 품질 편차 발생
**결정**: PR 생성 시 AI 자동 리뷰를 1차로 수행하고, 사람 리뷰를 2차로 수행하는 2단계 리뷰 프로세스 표준화

### 사례 3: 모노레포 빌드 시스템 표준화

| 항목 | 내용 |
|------|------|
| 발의일자 | YYYY-MM-DD |
| 상태 | Accepted |
| 영향 범위 | 프로젝트 인프라 |

**문제**: 멀티레포 운영으로 패키지 버전 충돌, 공유 코드 관리 어려움
**결정**: Turborepo 기반 모노레포로 통합하고, 원격 캐싱으로 빌드 속도 보장

### 사례 4: 디자인 토큰 기반 스타일링 표준화

| 항목 | 내용 |
|------|------|
| 발의일자 | YYYY-MM-DD |
| 상태 | Accepted |
| 영향 범위 | 디자인 시스템, 프론트엔드 |

**문제**: 디자인-개발 간 색상/간격/타이포 불일치 빈번
**결정**: Figma Variables에서 디자인 토큰을 추출하고, Style Dictionary를 통해 CSS 테마로 자동 변환

### 사례 5: Edge Runtime 배포 전략 표준화

| 항목 | 내용 |
|------|------|
| 발의일자 | YYYY-MM-DD |
| 상태 | Accepted |
| 영향 범위 | 인프라, 백엔드 |

**문제**: 글로벌 사용자 대상 서비스에서 응답 지연 발생
**결정**: 사용자 인접 엣지에서 실행 가능한 경량 API를 Edge Runtime으로 배포하고, 무거운 연산은 Origin Server로 위임

### 사례 6: 타입 안전 API 계약 표준화

| 항목 | 내용 |
|------|------|
| 발의일자 | YYYY-MM-DD |
| 상태 | Accepted |
| 영향 범위 | 프론트엔드, 백엔드 |

**문제**: API 스펙 문서와 실제 구현의 불일치, 프론트-백 간 타입 불일치
**결정**: 내부 API는 tRPC, 외부 공개 API는 OpenAPI 3.1 + 자동 타입 생성으로 표준화

---

## 4. 개발 환경 표준화

### 4.1 devcontainer 설정

모든 프로젝트에 `.devcontainer` 설정을 포함하여 일관된 개발 환경을 보장한다.

```json
// .devcontainer/devcontainer.json
{
  "name": "Project Dev Container",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "vitest.explorer"
      ],
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": "explicit"
        }
      }
    }
  },
  "postCreateCommand": "pnpm install",
  "forwardPorts": [3000, 5173]
}
```

### 4.2 mise (런타임 버전 관리)

mise를 사용하여 Node.js, pnpm 등의 런타임 버전을 프로젝트별로 관리한다.

```toml
# .mise.toml
[tools]
node = "22"
pnpm = "9"

[env]
NODE_ENV = "development"
```

```bash
# mise 설치 및 활성화
curl https://mise.run | sh
mise install
mise activate
```

### 4.3 Node.js 버전 관리 정책

| 항목 | 정책 |
|------|------|
| LTS 버전 | Node.js 22 LTS |
| 업그레이드 주기 | LTS 릴리즈 후 3개월 이내 검토 |
| 버전 고정 도구 | mise + `.mise.toml` (우선) 또는 `.nvmrc` |
| CI/CD | `.mise.toml`과 동일 버전 사용 |
| 패키지 매니저 | pnpm 9+ (Corepack으로 버전 고정) |

```bash
# Corepack으로 pnpm 버전 고정
corepack enable
corepack use pnpm@9
```

### 4.4 표준 기술 스택

| 카테고리 | 표준 도구 | 비고 |
|---------|----------|------|
| 프레임워크 | React 19+ / Next.js 15+ | 서버 컴포넌트 기본 활용 |
| 언어 | TypeScript 5.5+ | strict 모드 필수 |
| 빌드 도구 | Vite 6+ | Rolldown 기반 |
| 패키지 매니저 | pnpm 9+ | 워크스페이스 지원 |
| 상태 관리 | Zustand / TanStack Query | 서버 상태와 클라이언트 상태 분리 |
| 스타일링 | Tailwind CSS 4+ | 디자인 토큰 연동 |
| 테스트 | Vitest + Playwright | 단위/통합/E2E 통합 |
| 린팅 | ESLint 9 (Flat Config) + Prettier | AI 린팅 보조 연동 |
| AI 보조 | Claude Code / GitHub Copilot | 코드 생성 + 리뷰 보조 |

---

## 5. 네이밍 컨벤션 표준

### 5.1 파일/폴더 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일 | PascalCase | `UserProfile.tsx` |
| 훅 파일 | camelCase (use 접두사) | `useAuth.ts` |
| 유틸 파일 | camelCase | `formatDate.ts` |
| 상수 파일 | camelCase | `apiEndpoints.ts` |
| 타입 파일 | camelCase | `user.types.ts` |
| 테스트 파일 | 원본명 + .test | `UserProfile.test.tsx` |
| 폴더 | kebab-case | `user-profile/` |

### 5.2 변수/함수 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수 | camelCase | `userName`, `isLoading` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| 함수 | camelCase (동사 시작) | `fetchUserData()`, `handleClick()` |
| 컴포넌트 | PascalCase | `UserProfileCard` |
| 커스텀 훅 | camelCase (use 접두사) | `useUserProfile()` |
| 타입/인터페이스 | PascalCase | `UserProfile`, `ApiResponse` |
| Enum | PascalCase (멤버: PascalCase) | `UserRole.Admin` |
| 이벤트 핸들러 | handle + 대상 + 동작 | `handleFormSubmit()` |
| boolean 변수 | is/has/can/should 접두사 | `isVisible`, `hasPermission` |

### 5.3 컴포넌트 네이밍

| 유형 | 규칙 | 예시 |
|------|------|------|
| 페이지 컴포넌트 | 도메인 + Page | `OrderListPage` |
| 레이아웃 | 영역 + Layout | `DashboardLayout` |
| 컨테이너 | 도메인 + Container | `UserProfileContainer` |
| 프레젠테이션 | 도메인 + 역할 | `UserCard`, `OrderTable` |
| 공통 UI | 기능 설명 | `Button`, `Modal`, `Tooltip` |

### 5.4 API 관련 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| API 호출 함수 | 동사 + 리소스 | `getUsers()`, `createOrder()` |
| Query Key | 배열 형태, 리소스 기반 | `['users', userId]` |
| API 응답 타입 | 리소스 + Response | `UserListResponse` |
| API 요청 타입 | 동작 + 리소스 + Request | `CreateUserRequest` |

### 5.5 금지 패턴

```typescript
// 의미 없는 이름
const data = fetchData();        // data가 무엇인지 불명확
const temp = calculate();        // 임시 변수명 사용 금지

// 올바른 이름
const userList = fetchUsers();
const discountRate = calculateDiscount();

// 부정형 boolean 금지
const isNotVisible = false;      // 이중 부정 발생 가능
const isVisible = true;          // 긍정형 사용

// 약어 사용 규칙
const btn = document.querySelector('button');   // 금지
const button = document.querySelector('button'); // 허용
// 예외: 업계 표준 약어 (API, URL, ID, CSS, HTML 등)
```

---

## 6. 테스트 전략 표준

### 6.1 Testing Trophy 채택

| 테스트 유형 | 비율 | 도구 | 설명 |
|-------------|------|------|------|
| 정적 분석 | 기반 | ESLint, TypeScript | 모든 테스트의 기반 |
| 단위 테스트 | 20% | Vitest | 순수 함수 및 복잡한 비즈니스 로직 |
| 통합 테스트 | 70% | Vitest + Testing Library | 컴포넌트 간 상호작용 검증 |
| E2E 테스트 | 10% | Playwright | 핵심 사용자 플로우 |

### 6.2 표준 테스트 도구

```json
{
  "devDependencies": {
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/user-event": "^15.0.0",
    "msw": "^3.0.0",
    "playwright": "^1.50.0",
    "@axe-core/playwright": "^5.0.0"
  }
}
```

### 6.3 테스트 작성 원칙

1. **사용자 행동 기반 테스트**: 구현 세부사항이 아닌 사용자 관점에서 테스트
2. **AAA 패턴**: Arrange-Act-Assert 구조 준수
3. **GWT 설명**: Given-When-Then 방식으로 테스트 설명 작성
4. **AI 보조 테스트 생성**: AI 도구로 테스트 코드 초안을 생성하되, 반드시 사람이 검토

### 6.4 테스트 커버리지 기준

| 지표 | 최소 기준 | 권장 기준 |
|------|----------|----------|
| 신규 코드 커버리지 | 20% | 40% 이상 |
| PR별 테스트 포함률 | 100% (신규 기능) | 100% (모든 변경) |
| E2E 핵심 플로우 | 필수 시나리오 100% | 전체 시나리오 80% |

### 6.5 테스트 작성 예시

```typescript
describe('LoginForm', () => {
  it('Given 유효한 인증 정보, When 로그인 버튼 클릭, Then 대시보드로 이동', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LoginForm />);

    // Act
    await user.type(screen.getByLabelText('이메일'), 'user@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('대시보드')).toBeInTheDocument();
    });
  });
});
```

---

## 7. UX 라이팅 가이드라인

### 7.1 핵심 원칙

1. **명확성 (Clear)**: 사용자에게 혼란을 주지 않고 메시지를 쉽고 빠르게 이해
2. **간결성 (Concise)**: 핵심 내용을 중심으로 짧고 효율적인 문장
3. **유용성 (Useful)**: 사용자가 다음에 어떤 행동을 해야 할지 명확히 안내
4. **친근함 (Friendly)**: 사용자에게 편안하고 친근하게 다가가는 어조
5. **신뢰성 (Trustworthy)**: 정확하고 일관된 정보 제공

### 7.2 Quick Check List

#### 공통 확인 항목

- **띄어쓰기**: 맞춤법 허용 시 **붙여쓰기** 우선
- **마침표**: Title/Label에는 없음, Description에는 있음
- **고유명사**: 서비스 공식 명칭 확인
- **날짜**: 한 자리 수 앞 '0' 제거 (8월 7일)
- **시간**: 12시간제 + 오전/오후 표기
- **금액**: 천 단위 쉼표 사용 (1,000원)

#### 대상별 어조

| 대상 | 어조 | 특징 |
|------|------|------|
| 일반 사용자 | 친근하고 편안한 어조 | 긍정적 표현, 혜택 강조 |
| 비즈니스 파트너 | 정중하고 전문적인 어조 | 적절한 호칭, 비즈니스 용어 |
| 내부 어드민 | 간결하고 기능 중심 | 기술 용어 허용 |

### 7.3 띄어쓰기 가이드

#### 무조건 붙여쓰기

| 잘못된 표기 | 올바른 표기 |
|------------|------------|
| 해 주세요 | 해주세요 |
| 알려 드려요 | 알려드려요 |
| 첫 주문 | 첫주문 |
| 더 보기 | 더보기 |
| 고객 센터 | 고객센터 |

#### 무조건 띄어쓰기

| 잘못된 표기 | 올바른 표기 |
|------------|------------|
| 준비중 | 준비 중 |
| 결제시 | 결제 시 |
| 분후 | 분 후 |
| 다음날 | 다음 날 |

### 7.4 Button Label 가이드

- 최대 한 줄, 권장 글자 수 12자 이내 (공백 포함)
- 구체적인 동작명 사용, 1가지 동작만 포함
- 명사형 또는 '-기' 종결

| 대상 | 예시 |
|------|------|
| 일반 사용자 | "주문하기", "장바구니 담기" |
| 비즈니스 파트너 | "주문 접수", "매출 확인" |
| 내부 어드민 | "조회", "등록", "수정", "삭제" |

---

*본 문서는 범용 기술 표준화 가이드이며, 조직의 규모와 문화에 맞게 조정하여 사용할 수 있다.*
