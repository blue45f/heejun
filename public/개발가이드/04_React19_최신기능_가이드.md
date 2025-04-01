# React 19 실전 가이드 — AI + 멀티 베타 환경 시대의 프론트엔드 (2026)

## 목차

1. [AI + React 19 개발 워크플로](#1-ai--react-19-개발-워크플로)
2. [멀티 베타 환경 React 패턴](#2-멀티-베타-환경-react-패턴)
3. [React Compiler](#3-react-compiler)
4. [Server Components 심화](#4-server-components-심화)
5. [Actions & Forms](#5-actions--forms)
6. [use() Hook 심화](#6-use-hook-심화)
7. [Next.js 15 통합](#7-nextjs-15-통합)
8. [마이그레이션 전략 (React 18 → 19)](#8-마이그레이션-전략-react-18--19)

---

## 1. AI + React 19 개발 워크플로

AI 도구를 React 19 전용으로 튜닝하면, 단순 코드 생성을 넘어 아키텍처 설계 - 구현 - 리뷰 - 마이그레이션의 전 주기를 자동화할 수 있다.

### 1.1 Claude Code 프롬프트 5선

#### 프롬프트 1: Server Component 생성

```
# Claude Code 프롬프트
React 19 Server Component를 작성해줘.
- 파일: src/components/dashboard/MetricsPanel.tsx
- DB에서 대시보드 지표를 직접 조회 (prisma 사용)
- searchParams로 기간/필터 수신
- 하위 클라이언트 인터랙션 컴포넌트 분리 (ChartInteraction.tsx)
- Suspense 경계와 loading fallback 포함
- TypeScript strict, 에러 핸들링 포함
```

생성 결과 예시:

```tsx
// src/components/dashboard/MetricsPanel.tsx — Server Component
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { ChartInteraction } from "./ChartInteraction";
import { MetricsSkeleton } from "./MetricsSkeleton";

interface DashboardSearchParams {
  period?: "7d" | "30d" | "90d";
  team?: string;
}

export async function MetricsPanel({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { period = "30d", team } = await searchParams;

  const metrics = await prisma.metric.findMany({
    where: {
      createdAt: { gte: getStartDate(period) },
      ...(team && { teamId: team }),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section>
      <h2>팀 대시보드</h2>
      <Suspense fallback={<MetricsSkeleton />}>
        <ChartInteraction initialData={metrics} period={period} />
      </Suspense>
    </section>
  );
}

function getStartDate(period: string): Date {
  const days = parseInt(period) || 30;
  return new Date(Date.now() - days * 86400000);
}
```

```tsx
// src/components/dashboard/ChartInteraction.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Metric } from "@prisma/client";

interface Props {
  initialData: Metric[];
  period: string;
}

export function ChartInteraction({ initialData, period }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: string) => {
    startTransition(() => {
      router.push(`?period=${newPeriod}`);
    });
  };

  return (
    <div data-pending={isPending || undefined}>
      <nav>
        {["7d", "30d", "90d"].map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            aria-pressed={p === period}
          >
            {p}
          </button>
        ))}
      </nav>
      <Chart data={initialData} />
    </div>
  );
}
```

#### 프롬프트 2: Actions + Zod 폼 생성

```
# Claude Code 프롬프트
React 19 Server Action 폼을 작성해줘.
- useActionState + Zod 스키마 유효성 검증
- Progressive Enhancement (JS 없이도 동작)
- useOptimistic으로 즉각적 UI 피드백
- 에러 상태를 필드별로 표시
- 파일: src/app/settings/profile-form.tsx
```

생성 결과 예시:

```tsx
// src/app/settings/actions.ts
"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const ProfileSchema = z.object({
  displayName: z.string().min(2, "이름은 2자 이상이어야 합니다"),
  email: z.string().email("올바른 이메일을 입력하세요"),
  bio: z.string().max(500, "소개는 500자 이내로 작성하세요").optional(),
});

export type ProfileState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function updateProfile(
  prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.user.update({
    where: { id: getCurrentUserId() },
    data: parsed.data,
  });

  revalidatePath("/settings");
  return { success: true, message: "프로필이 업데이트되었습니다" };
}
```

```tsx
// src/app/settings/profile-form.tsx
"use client";

import { useActionState, useOptimistic } from "react";
import { updateProfile, type ProfileState } from "./actions";

interface Props {
  user: { displayName: string; email: string; bio?: string };
}

export function ProfileForm({ user }: Props) {
  const [state, formAction, isPending] = useActionState(updateProfile, {
    success: false,
  });

  const [optimisticUser, setOptimisticUser] = useOptimistic(user);

  return (
    <form
      action={(formData) => {
        setOptimisticUser({
          displayName: formData.get("displayName") as string,
          email: formData.get("email") as string,
          bio: formData.get("bio") as string,
        });
        formAction(formData);
      }}
    >
      <fieldset disabled={isPending}>
        <div>
          <label htmlFor="displayName">이름</label>
          <input
            id="displayName"
            name="displayName"
            defaultValue={optimisticUser.displayName}
            required
          />
          {state.errors?.displayName?.map((e) => (
            <p key={e} role="alert">{e}</p>
          ))}
        </div>

        <div>
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={optimisticUser.email}
            required
          />
          {state.errors?.email?.map((e) => (
            <p key={e} role="alert">{e}</p>
          ))}
        </div>

        <div>
          <label htmlFor="bio">소개</label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={optimisticUser.bio ?? ""}
          />
        </div>

        <button type="submit">
          {isPending ? "저장 중..." : "저장"}
        </button>
      </fieldset>

      {state.success && <p role="status">{state.message}</p>}
    </form>
  );
}
```

#### 프롬프트 3: use() Hook 패턴 생성

```
# Claude Code 프롬프트
React 19 use() Hook으로 데이터 페칭 패턴을 작성해줘.
- 부모 Server Component에서 Promise를 생성하고 자식에 전달
- use()로 Promise를 소비하는 Client Component
- 워터폴 방지를 위한 병렬 프리페칭
- Context를 use()로 조건부 소비하는 패턴 포함
- Suspense/ErrorBoundary 경계 설계 포함
```

생성 결과 예시:

```tsx
// src/app/project/[id]/page.tsx — Server Component (Promise 생성)
import { Suspense } from "react";
import { fetchProject, fetchMembers, fetchActivity } from "@/lib/api";
import { ProjectDashboard } from "./ProjectDashboard";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 병렬 프리페칭 - 워터폴 방지
  const projectPromise = fetchProject(id);
  const membersPromise = fetchMembers(id);
  const activityPromise = fetchActivity(id);

  return (
    <Suspense fallback={<ProjectSkeleton />}>
      <ProjectDashboard
        projectPromise={projectPromise}
        membersPromise={membersPromise}
        activityPromise={activityPromise}
      />
    </Suspense>
  );
}
```

```tsx
// src/app/project/[id]/ProjectDashboard.tsx
"use client";

import { use } from "react";
import type { Project, Member, Activity } from "@/types";

interface Props {
  projectPromise: Promise<Project>;
  membersPromise: Promise<Member[]>;
  activityPromise: Promise<Activity[]>;
}

export function ProjectDashboard({
  projectPromise,
  membersPromise,
  activityPromise,
}: Props) {
  const project = use(projectPromise);
  const members = use(membersPromise);
  const activity = use(activityPromise);

  return (
    <div>
      <h1>{project.name}</h1>
      <MemberList members={members} />
      <ActivityFeed items={activity} />
    </div>
  );
}
```

#### 프롬프트 4: 마이그레이션 분석

```
# Claude Code 프롬프트
현재 프로젝트의 React 18 → 19 마이그레이션 영향도를 분석해줘.
- forwardRef 사용처 모두 찾아서 제거 가능 여부 판단
- useContext → use() 전환 대상 식별
- ReactDOM.render 등 deprecated API 검출
- 타사 라이브러리 호환성 체크 (package.json 기반)
- 예상 작업량을 S/M/L로 분류한 리포트 작성
```

#### 프롬프트 5: 성능 최적화 분석

```
# Claude Code 프롬프트
이 프로젝트의 React 19 성능 최적화 포인트를 찾아줘.
- React Compiler가 최적화하지 못하는 패턴 탐지
- 불필요한 수동 useMemo/useCallback 식별
- Server Component로 전환 가능한 Client Component 찾기
- Suspense 경계 배치 최적화 제안
- use()로 개선 가능한 데이터 페칭 패턴 식별
- 각 항목에 수정 코드 포함
```

### 1.2 Copilot / Cursor React 19 워크플로

#### .cursorrules 예시

프로젝트 루트에 `.cursorrules` 파일을 두면 Cursor가 React 19 컨벤션을 자동으로 준수한다.

```
# .cursorrules — React 19 + Next.js 15 프로젝트

## 아키텍처 원칙
- 기본적으로 Server Component로 작성. 'use client'는 인터랙션이 필요한 최소 범위에만 사용
- forwardRef 사용 금지 — React 19에서 ref는 일반 prop
- useContext 대신 use(Context) 사용
- 데이터 페칭은 Server Component에서 직접 수행, Client에서는 use()로 Promise 소비

## Server Actions
- 'use server' 지시어를 파일 최상단에 배치
- 모든 Action은 Zod 스키마로 입력 검증
- useActionState로 폼 상태 관리 (useFormState는 deprecated)

## 성능
- React Compiler가 자동 메모이제이션하므로 useMemo/useCallback/memo 사용 금지
- 최적화 제외가 필요한 경우에만 'use no memo' 지시어 사용

## 코드 스타일
- TypeScript strict 모드
- 컴포넌트 함수는 export function 선언 (export default 금지)
- Props 인터페이스는 컴포넌트 파일 내에 정의

## 파일 구조
- page.tsx: Server Component (데이터 페칭, 레이아웃)
- components/: UI 컴포넌트 (서버/클라이언트 분리)
- actions/: Server Actions (Zod 스키마와 함께)
```

#### Copilot 커스텀 인스트럭션 (.github/copilot-instructions.md)

```markdown
## React 19 규칙
- Server Component 우선. 'use client'는 최소 범위
- ref는 일반 prop으로 전달 (forwardRef 금지)
- useActionState + Zod로 폼 구현
- 수동 메모이제이션 금지 (React Compiler 사용 중)
- use()로 Context 및 Promise 소비
```

### 1.3 AI 기반 React 18 → 19 자동 마이그레이션 파이프라인

CI에서 AI를 활용한 자동 마이그레이션 검증과 코드 변환을 수행한다.

```yaml
# .github/workflows/react19-migration.yml
name: React 19 Migration Assistant

on:
  pull_request:
    paths: ["src/**/*.tsx", "src/**/*.ts"]

jobs:
  migration-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run React 19 Codemods (Dry Run)
        run: |
          npx @react-codemod/cli --dry-run --print \
            --transform react-19/replace-reactdom-render \
            --transform react-19/remove-forward-ref \
            --transform react-19/replace-use-context \
            src/

      - name: AI Migration Analysis
        uses: anthropics/claude-code-action@v1
        with:
          prompt: |
            변경된 파일들을 React 19 관점에서 분석해줘:
            1. forwardRef → ref prop 전환이 필요한 곳
            2. useContext → use() 전환 대상
            3. ReactDOM.render 등 deprecated API
            4. 서드파티 라이브러리 React 19 호환성
            각 항목에 구체적 수정 코드를 PR 코멘트로 남겨줘.
```

### 1.4 AI 코드 리뷰에서 React 19 안티패턴 자동 탐지

```yaml
# .github/workflows/react19-review.yml
name: React 19 Anti-pattern Review

on:
  pull_request:
    paths: ["src/**/*.tsx"]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AI Anti-pattern Detection
        uses: anthropics/claude-code-action@v1
        with:
          prompt: |
            PR의 변경된 TSX 파일에서 React 19 안티패턴을 탐지해줘:

            [심각] 즉시 수정 필요:
            - 'use client' 컴포넌트에서 직접 DB/API 호출
            - forwardRef 사용 (React 19에서 불필요)
            - ReactDOM.render 사용

            [경고] 개선 권장:
            - 수동 useMemo/useCallback (React Compiler가 처리)
            - useContext 대신 use() 미사용
            - Server Component로 전환 가능한 Client Component
            - Suspense 경계 없는 비동기 데이터 소비

            [정보] 최적화 기회:
            - use()로 개선 가능한 데이터 페칭
            - PPR 적용 가능한 페이지

            파일별로 라인 번호와 수정 코드를 포함해서 리뷰해줘.
```

---

## 2. 멀티 베타 환경 React 패턴

PR별 Preview, 스테이징, 카나리 등 여러 환경이 동시에 운영되는 구조에서 React 19의 기능을 활용하는 패턴이다.

### 2.1 타입 안전한 Feature Flag Provider

```tsx
// src/lib/feature-flags/types.ts
export interface FeatureFlags {
  newDashboard: boolean;
  betaEditor: boolean;
  experimentalSearch: boolean;
  darkModeV2: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  newDashboard: false,
  betaEditor: false,
  experimentalSearch: false,
  darkModeV2: false,
};
```

```tsx
// src/lib/feature-flags/provider.tsx
"use client";

import { createContext, use, type ReactNode } from "react";
import type { FeatureFlags } from "./types";
import { DEFAULT_FLAGS } from "./types";

const FeatureFlagContext = createContext<FeatureFlags>(DEFAULT_FLAGS);

interface Props {
  flags: FeatureFlags;
  children: ReactNode;
}

export function FeatureFlagProvider({ flags, children }: Props) {
  return (
    <FeatureFlagContext value={flags}>
      {children}
    </FeatureFlagContext>
  );
}

// use()로 조건부 컨텍스트 소비 (React 19)
export function useFeatureFlag<K extends keyof FeatureFlags>(
  flag: K,
): FeatureFlags[K] {
  const flags = use(FeatureFlagContext);
  return flags[flag];
}
```

```tsx
// src/lib/feature-flags/components.tsx
"use client";

import { type ReactNode } from "react";
import { useFeatureFlag } from "./provider";
import type { FeatureFlags } from "./types";

interface FeatureGateProps {
  flag: keyof FeatureFlags;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(flag);
  return enabled ? <>{children}</> : <>{fallback}</>;
}
```

```tsx
// src/app/layout.tsx — 환경별 플래그 주입
import { FeatureFlagProvider } from "@/lib/feature-flags/provider";
import { resolveFlags } from "@/lib/feature-flags/resolver";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const flags = await resolveFlags(process.env.DEPLOY_ENV);

  return (
    <html lang="ko">
      <body>
        <FeatureFlagProvider flags={flags}>
          {children}
        </FeatureFlagProvider>
      </body>
    </html>
  );
}
```

```tsx
// src/lib/feature-flags/resolver.ts
import type { FeatureFlags } from "./types";
import { DEFAULT_FLAGS } from "./types";

type DeployEnv = "production" | "staging" | "preview" | "canary";

const ENV_FLAGS: Record<DeployEnv, Partial<FeatureFlags>> = {
  production: {},
  staging: { newDashboard: true },
  canary: { newDashboard: true, betaEditor: true },
  preview: { newDashboard: true, betaEditor: true, experimentalSearch: true },
};

export async function resolveFlags(
  env?: string,
): Promise<FeatureFlags> {
  const deployEnv = (env as DeployEnv) || "production";
  const envOverrides = ENV_FLAGS[deployEnv] ?? {};

  return { ...DEFAULT_FLAGS, ...envOverrides };
}
```

### 2.2 환경별 Server Component 데이터 소스 전환

Server Component에서 환경에 따라 데이터 소스를 동적으로 전환한다.

```tsx
// src/lib/data-source/factory.ts
interface DataSource {
  getProducts(query: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
}

class ProductionDataSource implements DataSource {
  async getProducts(query: string) {
    return prisma.product.findMany({ where: { name: { contains: query } } });
  }
  async getProduct(id: string) {
    return prisma.product.findUnique({ where: { id } });
  }
}

class PreviewDataSource implements DataSource {
  private branchId: string;

  constructor(branchId: string) {
    this.branchId = branchId;
  }

  async getProducts(query: string) {
    // Preview 환경: 브랜치별 격리된 DB 스키마 사용
    return prisma.product.findMany({
      where: {
        name: { contains: query },
        branchId: this.branchId,
      },
    });
  }

  async getProduct(id: string) {
    return prisma.product.findUnique({
      where: { id, branchId: this.branchId },
    });
  }
}

export function createDataSource(): DataSource {
  const env = process.env.DEPLOY_ENV ?? "production";
  const branchId = process.env.BRANCH_ID ?? "main";

  switch (env) {
    case "preview":
      return new PreviewDataSource(branchId);
    default:
      return new ProductionDataSource();
  }
}
```

```tsx
// src/app/products/page.tsx — Server Component에서 활용
import { createDataSource } from "@/lib/data-source/factory";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const dataSource = createDataSource();
  const products = await dataSource.getProducts(q);

  return (
    <section>
      <h1>상품 목록</h1>
      <ul>
        {products.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </section>
  );
}
```

### 2.3 PR별 Preview 환경에서의 A/B 테스트 컴포넌트

```tsx
// src/lib/ab-test/ABTestProvider.tsx
"use client";

import { createContext, use, type ReactNode } from "react";

interface ABTestConfig {
  experiments: Record<string, string>; // experimentId → variantId
}

const ABTestContext = createContext<ABTestConfig>({ experiments: {} });

export function ABTestProvider({
  config,
  children,
}: {
  config: ABTestConfig;
  children: ReactNode;
}) {
  return (
    <ABTestContext value={config}>
      {children}
    </ABTestContext>
  );
}

export function useExperiment(experimentId: string): string {
  const { experiments } = use(ABTestContext);
  return experiments[experimentId] ?? "control";
}
```

```tsx
// src/components/ABVariant.tsx
"use client";

import { type ReactNode } from "react";
import { useExperiment } from "@/lib/ab-test/ABTestProvider";

interface Props {
  experimentId: string;
  variants: Record<string, ReactNode>;
  fallback?: ReactNode;
}

export function ABVariant({ experimentId, variants, fallback }: Props) {
  const variant = useExperiment(experimentId);
  return <>{variants[variant] ?? fallback ?? variants["control"]}</>;
}
```

```tsx
// Preview 환경에서의 사용 — 강제 variant 지정 가능
// src/app/layout.tsx 내부
import { ABTestProvider } from "@/lib/ab-test/ABTestProvider";

// Preview 환경에서는 URL 파라미터로 variant 강제 지정 가능
async function getABConfig(searchParams: Record<string, string>) {
  const isPreview = process.env.DEPLOY_ENV === "preview";

  if (isPreview && searchParams.ab_override) {
    // ?ab_override=checkout_flow:variant_b,header:variant_a
    const overrides = Object.fromEntries(
      searchParams.ab_override.split(",").map((s) => s.split(":")),
    );
    return { experiments: overrides };
  }

  // 프로덕션: 원격 설정에서 할당된 variant 사용
  return await fetchABConfig();
}
```

### 2.4 동적 환경 설정 Context

`window.__CONFIG__`를 React Context로 변환하여 타입 안전하게 사용한다.

```tsx
// src/lib/env-config/types.ts
export interface EnvConfig {
  apiBaseUrl: string;
  cdnUrl: string;
  sentryDsn: string;
  environment: "production" | "staging" | "preview" | "canary";
  featureApiEndpoint: string;
  debugEnabled: boolean;
}
```

```tsx
// src/lib/env-config/provider.tsx
"use client";

import { createContext, use, type ReactNode } from "react";
import type { EnvConfig } from "./types";

const EnvConfigContext = createContext<EnvConfig | null>(null);

export function EnvConfigProvider({
  config,
  children,
}: {
  config: EnvConfig;
  children: ReactNode;
}) {
  return (
    <EnvConfigContext value={config}>
      {children}
    </EnvConfigContext>
  );
}

export function useEnvConfig(): EnvConfig {
  const config = use(EnvConfigContext);
  if (!config) {
    throw new Error("useEnvConfig must be used within EnvConfigProvider");
  }
  return config;
}
```

```tsx
// src/lib/env-config/resolve.ts — Server에서 설정 조립
import type { EnvConfig } from "./types";

export function resolveEnvConfig(): EnvConfig {
  const env = (process.env.DEPLOY_ENV ?? "production") as EnvConfig["environment"];

  const configs: Record<EnvConfig["environment"], EnvConfig> = {
    production: {
      apiBaseUrl: "https://api.example.com",
      cdnUrl: "https://cdn.example.com",
      sentryDsn: process.env.SENTRY_DSN!,
      environment: "production",
      featureApiEndpoint: "https://features.example.com",
      debugEnabled: false,
    },
    staging: {
      apiBaseUrl: "https://api-staging.example.com",
      cdnUrl: "https://cdn-staging.example.com",
      sentryDsn: process.env.SENTRY_DSN!,
      environment: "staging",
      featureApiEndpoint: "https://features-staging.example.com",
      debugEnabled: true,
    },
    preview: {
      apiBaseUrl: `https://api-${process.env.BRANCH_ID}.example.com`,
      cdnUrl: "https://cdn-staging.example.com",
      sentryDsn: process.env.SENTRY_DSN!,
      environment: "preview",
      featureApiEndpoint: "https://features-staging.example.com",
      debugEnabled: true,
    },
    canary: {
      apiBaseUrl: "https://api-canary.example.com",
      cdnUrl: "https://cdn.example.com",
      sentryDsn: process.env.SENTRY_DSN!,
      environment: "canary",
      featureApiEndpoint: "https://features.example.com",
      debugEnabled: false,
    },
  };

  return configs[env];
}
```

### 2.5 멀티 베타 환경별 에러 바운더리 격리

환경에 따라 에러 보고 방식과 사용자 경험을 분리한다.

```tsx
// src/components/error/EnvErrorBoundary.tsx
"use client";

import { Component, type ReactNode } from "react";
import { useEnvConfig } from "@/lib/env-config/provider";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundaryInner extends Component<
  Props & { environment: string; debugEnabled: boolean },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const { environment, debugEnabled } = this.props;

    if (environment === "production" || environment === "canary") {
      // 프로덕션/카나리: Sentry 리포트
      reportToSentry(error, { environment, componentStack: info.componentStack });
    }

    if (debugEnabled) {
      // 스테이징/프리뷰: 콘솔 출력
      console.group(`[${environment}] React Error Boundary`);
      console.error(error);
      console.log("Component Stack:", info.componentStack);
      console.groupEnd();
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.debugEnabled) {
        return (
          <div style={{ padding: 20, background: "#fee", border: "2px solid red" }}>
            <h3>Error in {this.props.environment}</h3>
            <pre>{this.state.error.message}</pre>
            <pre>{this.state.error.stack}</pre>
            <button onClick={() => this.setState({ error: null })}>
              다시 시도
            </button>
          </div>
        );
      }
      return this.props.fallback ?? <DefaultErrorUI />;
    }
    return this.props.children;
  }
}

// use()로 Context를 소비한 뒤 클래스 컴포넌트에 전달
export function EnvErrorBoundary({ children, fallback }: Props) {
  const { environment, debugEnabled } = useEnvConfig();

  return (
    <ErrorBoundaryInner
      environment={environment}
      debugEnabled={debugEnabled}
      fallback={fallback}
    >
      {children}
    </ErrorBoundaryInner>
  );
}

function DefaultErrorUI() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>문제가 발생했습니다</h2>
      <p>잠시 후 다시 시도해주세요.</p>
    </div>
  );
}

function reportToSentry(error: Error, context: Record<string, unknown>) {
  // Sentry 리포트 구현
}
```

### 2.6 Preview 환경 전용 디버그 패널 컴포넌트

Preview/Staging 환경에서만 렌더링되는 디버그 정보 패널이다.

```tsx
// src/components/debug/DebugPanel.tsx
"use client";

import { useState } from "react";
import { useEnvConfig } from "@/lib/env-config/provider";
import { useFeatureFlag } from "@/lib/feature-flags/provider";
import type { FeatureFlags } from "@/lib/feature-flags/types";

export function DebugPanel() {
  const config = useEnvConfig();
  const [isOpen, setIsOpen] = useState(false);

  // 프로덕션에서는 렌더링하지 않음
  if (!config.debugEnabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "#1a1a2e",
          color: "#0f0",
          border: "1px solid #0f0",
          borderRadius: 8,
          padding: "8px 16px",
          cursor: "pointer",
          fontFamily: "monospace",
        }}
      >
        {isOpen ? "Close Debug" : `Debug [${config.environment}]`}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 0,
            width: 400,
            maxHeight: "60vh",
            overflow: "auto",
            background: "#1a1a2e",
            color: "#e0e0e0",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 16,
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          <h4 style={{ color: "#0f0", margin: "0 0 12px" }}>
            Environment: {config.environment}
          </h4>

          <Section title="Config">
            <pre>{JSON.stringify(config, null, 2)}</pre>
          </Section>

          <Section title="Performance">
            <PerformanceInfo />
          </Section>

          <Section title="React Info">
            <p>React Version: {require("react").version}</p>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          color: "#88f",
          cursor: "pointer",
          fontFamily: "monospace",
          padding: 0,
        }}
      >
        {open ? "[-]" : "[+]"} {title}
      </button>
      {open && <div style={{ paddingLeft: 12, marginTop: 4 }}>{children}</div>}
    </div>
  );
}

function PerformanceInfo() {
  if (typeof window === "undefined") return null;

  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      <li>DOM Content Loaded: {Math.round(nav?.domContentLoadedEventEnd)}ms</li>
      <li>Load Complete: {Math.round(nav?.loadEventEnd)}ms</li>
      <li>TTFB: {Math.round(nav?.responseStart)}ms</li>
    </ul>
  );
}
```

---

## 3. React Compiler

React Compiler는 빌드 타임에 컴포넌트를 분석하여 자동으로 메모이제이션을 적용한다. 수동 `useMemo`, `useCallback`, `React.memo`가 대부분 불필요해진다.

### 3.1 설정

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
```

```bash
# 설치
npm install -D babel-plugin-react-compiler
```

### 3.2 자동 메모이제이션 — Before / After

```tsx
// Before: 수동 메모이제이션
import { useMemo, useCallback, memo } from "react";

const ExpensiveList = memo(function ExpensiveList({
  items,
  onSelect,
}: {
  items: Item[];
  onSelect: (id: string) => void;
}) {
  const sorted = useMemo(
    () => items.toSorted((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  const handleClick = useCallback(
    (id: string) => {
      onSelect(id);
    },
    [onSelect],
  );

  return (
    <ul>
      {sorted.map((item) => (
        <li key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});
```

```tsx
// After: React Compiler가 자동 최적화
function ExpensiveList({
  items,
  onSelect,
}: {
  items: Item[];
  onSelect: (id: string) => void;
}) {
  const sorted = items.toSorted((a, b) => a.name.localeCompare(b.name));

  return (
    <ul>
      {sorted.map((item) => (
        <li key={item.id} onClick={() => onSelect(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

### 3.3 'use no memo' 지시어

특정 컴포넌트나 Hook을 Compiler 최적화에서 제외해야 하는 경우 사용한다.

```tsx
function RealTimeChart({ dataStream }: { dataStream: DataStream }) {
  "use no memo"; // 매 렌더마다 새 참조가 필요한 경우

  const latestData = dataStream.consume();

  return <Canvas data={latestData} />;
}
```

### 3.4 React Compiler 한계점

| 상황 | Compiler 동작 | 대응 |
|------|--------------|------|
| 외부 뮤터블 스토어 참조 | 최적화 스킵 | `useSyncExternalStore` 사용 |
| 렌더 중 사이드이펙트 | 최적화 스킵 | 순수 함수 리팩터링 |
| 비표준 Hook 패턴 | 잘못된 최적화 가능 | `'use no memo'` 지시어 |
| dynamic `this` 바인딩 | 분석 불가 | 클로저로 전환 |

```tsx
// 주의: Compiler가 최적화하지 못하는 패턴
function ProblematicComponent() {
  // 렌더 중 외부 상태 변경 — Compiler가 스킵
  globalCounter++;

  // 대신 useEffect로 분리
  useEffect(() => {
    globalCounter++;
  });

  return <div>{globalCounter}</div>;
}
```

---

## 4. Server Components 심화

### 4.1 Partial Prerendering (PPR)

정적 셸은 빌드 타임에, 동적 부분은 요청 시 스트리밍한다.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
    ppr: "incremental", // 페이지별 점진 적용
  },
};
```

```tsx
// src/app/products/page.tsx
export const experimental_ppr = true;

import { Suspense } from "react";
import { StaticHeader } from "@/components/StaticHeader";
import { DynamicProductList } from "@/components/DynamicProductList";
import { ProductSkeleton } from "@/components/ProductSkeleton";

export default function ProductsPage() {
  return (
    <>
      {/* 정적 셸 — 빌드 타임에 프리렌더링 */}
      <StaticHeader />
      <nav>카테고리 필터 (정적)</nav>

      {/* 동적 영역 — Suspense 경계가 PPR 분할 지점 */}
      <Suspense fallback={<ProductSkeleton />}>
        <DynamicProductList />
      </Suspense>
    </>
  );
}
```

### 4.2 Streaming과 Suspense 경계 설계

```tsx
// 나쁜 예: 최상위 단일 Suspense → 전체가 블록됨
export default function Dashboard() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <MetricsPanel />  {/* 느림 */}
      <ActivityFeed />  {/* 빠름 */}
      <UserList />      {/* 중간 */}
    </Suspense>
  );
}

// 좋은 예: 독립적 Suspense 경계 → 준비된 것부터 스트리밍
export default function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsPanel />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <ActivityFeed />
      </Suspense>
      <Suspense fallback={<UserSkeleton />}>
        <UserList />
      </Suspense>
    </div>
  );
}
```

### 4.3 Server / Client 경계 설계 원칙

```
page.tsx (Server)
├── Header.tsx (Server) — 정적 네비게이션
├── SearchBar.tsx (Client) — 사용자 입력
├── ProductGrid.tsx (Server) — DB 조회, 렌더링
│   └── AddToCartButton.tsx (Client) — 인터랙션
└── Footer.tsx (Server) — 정적
```

원칙:
- Server Component를 기본으로 사용한다
- `'use client'`는 인터랙션(이벤트 핸들러, 상태, 브라우저 API)이 필요한 최소 단위에만 적용한다
- Client Component 내부에서 Server Component를 `children`으로 전달받을 수 있다
- 데이터 페칭은 가능한 한 Server Component에서 수행한다

```tsx
// Client Component가 Server Component를 children으로 수용하는 패턴
"use client";

import { useState, type ReactNode } from "react";

export function Tabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <nav>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActive(i)}>
            {tab.label}
          </button>
        ))}
      </nav>
      {/* content는 Server Component일 수 있음 */}
      <div>{tabs[active].content}</div>
    </div>
  );
}
```

---

## 5. Actions & Forms

### 5.1 useActionState + Zod 완전한 폼

```tsx
// src/app/contact/actions.ts
"use server";

import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요"),
  email: z.string().email("올바른 이메일을 입력하세요"),
  message: z.string().min(10, "메시지는 10자 이상이어야 합니다"),
  category: z.enum(["general", "support", "sales"], {
    errorMap: () => ({ message: "카테고리를 선택하세요" }),
  }),
});

export type ContactFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function submitContact(
  prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = Object.fromEntries(formData);
  const parsed = ContactSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  // DB 저장, 이메일 발송 등
  await saveContact(parsed.data);

  return { success: true, message: "문의가 접수되었습니다" };
}
```

```tsx
// src/app/contact/ContactForm.tsx
"use client";

import { useActionState } from "react";
import { submitContact, type ContactFormState } from "./actions";

const initialState: ContactFormState = { success: false };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContact,
    initialState,
  );

  if (state.success) {
    return <p role="status">{state.message}</p>;
  }

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="name">이름</label>
        <input id="name" name="name" required />
        <FieldError errors={state.errors?.name} />
      </div>

      <div>
        <label htmlFor="email">이메일</label>
        <input id="email" name="email" type="email" required />
        <FieldError errors={state.errors?.email} />
      </div>

      <div>
        <label htmlFor="category">카테고리</label>
        <select id="category" name="category" required>
          <option value="">선택</option>
          <option value="general">일반</option>
          <option value="support">지원</option>
          <option value="sales">영업</option>
        </select>
        <FieldError errors={state.errors?.category} />
      </div>

      <div>
        <label htmlFor="message">메시지</label>
        <textarea id="message" name="message" rows={5} required />
        <FieldError errors={state.errors?.message} />
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? "전송 중..." : "전송"}
      </button>
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <>
      {errors.map((e) => (
        <p key={e} role="alert" style={{ color: "red" }}>
          {e}
        </p>
      ))}
    </>
  );
}
```

### 5.2 useOptimistic 활용

```tsx
"use client";

import { useOptimistic, useActionState } from "react";
import { toggleTodo, type Todo } from "./actions";

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, setOptimisticTodo] = useOptimistic(
    todos,
    (current, toggledId: string) =>
      current.map((t) =>
        t.id === toggledId ? { ...t, completed: !t.completed } : t,
      ),
  );

  return (
    <ul>
      {optimisticTodos.map((todo) => (
        <li key={todo.id}>
          <form
            action={async () => {
              setOptimisticTodo(todo.id);
              await toggleTodo(todo.id);
            }}
          >
            <button type="submit">
              {todo.completed ? "v" : "o"} {todo.title}
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
```

### 5.3 Progressive Enhancement

```tsx
// Server Action 폼은 JS 없이도 동작
// form action에 Server Action을 직접 전달하면
// JS가 로드되기 전에도 네이티브 폼 제출로 동작한다

// 핵심 원칙:
// 1. <form action={serverAction}> — JS 없이 동작
// 2. useActionState로 감싸면 — JS 있을 때 향상된 UX 제공
// 3. useOptimistic 추가 — 즉각적 피드백

// 점진적 향상 계층:
// Layer 0: HTML <form> + Server Action → 동작함
// Layer 1: + useActionState → pending 상태, 에러 표시
// Layer 2: + useOptimistic → 즉각적 UI 업데이트
// Layer 3: + useTransition → 네비게이션 중 상태 유지
```

---

## 6. use() Hook 심화

### 6.1 Context 소비 — 조건부 사용 가능

```tsx
"use client";

import { use, createContext } from "react";

const ThemeContext = createContext<"light" | "dark">("light");
const AuthContext = createContext<{ userId: string } | null>(null);

function UserGreeting({ showTheme }: { showTheme: boolean }) {
  // use()는 조건문 내에서 호출 가능 (useContext와의 핵심 차이)
  const auth = use(AuthContext);

  if (!auth) {
    return <p>로그인이 필요합니다</p>;
  }

  // 조건부 Context 소비
  if (showTheme) {
    const theme = use(ThemeContext);
    return (
      <p className={theme}>
        안녕하세요, {auth.userId}님 (테마: {theme})
      </p>
    );
  }

  return <p>안녕하세요, {auth.userId}님</p>;
}
```

### 6.2 Promise 소비와 캐싱

```tsx
// Server Component에서 Promise 생성 후 Client로 전달
// src/app/user/[id]/page.tsx
import { Suspense } from "react";
import { UserProfile } from "./UserProfile";

async function fetchUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    next: { revalidate: 60 }, // 60초 캐싱
  });
  if (!res.ok) throw new Error("User not found");
  return res.json();
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Promise를 생성만 하고 await하지 않음 — 즉시 전달
  const userPromise = fetchUser(id);

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

```tsx
// src/app/user/[id]/UserProfile.tsx
"use client";

import { use } from "react";
import type { User } from "@/types";

export function UserProfile({
  userPromise,
}: {
  userPromise: Promise<User>;
}) {
  const user = use(userPromise); // Suspense가 처리

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### 6.3 워터폴 방지 — 병렬 프리페칭

```tsx
// 나쁜 예: 순차 실행 (워터폴)
export default async function Page() {
  const user = await fetchUser();       // 500ms
  const posts = await fetchPosts();      // 300ms
  const comments = await fetchComments(); // 200ms
  // 총 1000ms

  return <Dashboard user={user} posts={posts} comments={comments} />;
}

// 좋은 예: 병렬 실행
export default async function Page() {
  // Promise를 동시에 생성
  const userPromise = fetchUser();        // 시작
  const postsPromise = fetchPosts();      // 동시 시작
  const commentsPromise = fetchComments(); // 동시 시작
  // 총 ~500ms (가장 느린 것 기준)

  return (
    <>
      <Suspense fallback={<UserSkeleton />}>
        <UserSection userPromise={userPromise} />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <PostsSection postsPromise={postsPromise} />
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <CommentsSection commentsPromise={commentsPromise} />
      </Suspense>
    </>
  );
}
```

---

## 7. Next.js 15 통합

### 7.1 App Router 핵심 패턴

```
src/app/
├── layout.tsx          # 루트 레이아웃 (Server Component)
├── page.tsx            # 홈 페이지
├── loading.tsx         # 자동 Suspense fallback
├── error.tsx           # 자동 ErrorBoundary ('use client')
├── not-found.tsx       # 404 페이지
├── (auth)/
│   ├── layout.tsx      # 인증 그룹 레이아웃
│   ├── login/page.tsx
│   └── signup/page.tsx
└── dashboard/
    ├── layout.tsx      # 대시보드 레이아웃
    ├── page.tsx
    └── @sidebar/       # Parallel Route
        └── page.tsx
```

```tsx
// src/app/dashboard/layout.tsx — Parallel Routes
export default function DashboardLayout({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode; // @sidebar 슬롯
}) {
  return (
    <div className="flex">
      <aside className="w-64">{sidebar}</aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### 7.2 Turbopack

```bash
# 개발 서버 (Turbopack 기본 활성화 — Next.js 15)
next dev --turbopack

# 빌드 (Turbopack은 아직 개발 모드만 지원)
next build
```

```ts
// next.config.ts — Turbopack 커스텀 설정
const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@components": "./src/components",
      "@lib": "./src/lib",
    },
  },
};
```

### 7.3 미들웨어

```tsx
// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 환경 정보 헤더 주입
  const response = NextResponse.next();
  response.headers.set("x-deploy-env", process.env.DEPLOY_ENV ?? "production");
  response.headers.set("x-branch-id", process.env.BRANCH_ID ?? "main");

  // 인증 체크
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("auth-token");
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Preview 환경: 디버그 헤더 추가
  if (process.env.DEPLOY_ENV === "preview") {
    response.headers.set("x-debug-enabled", "true");
    response.headers.set("x-request-id", crypto.randomUUID());
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### 7.4 비동기 API 변경 (Next.js 15 Breaking Change)

Next.js 15에서 `headers()`, `cookies()`, `params`, `searchParams`가 모두 비동기로 변경되었다.

```tsx
// Before (Next.js 14)
import { headers, cookies } from "next/headers";

export default function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { q: string };
}) {
  const headerList = headers();
  const cookieStore = cookies();
  // 동기적 접근
  const id = params.id;
  const query = searchParams.q;
}
```

```tsx
// After (Next.js 15)
import { headers, cookies } from "next/headers";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const headerList = await headers();
  const cookieStore = await cookies();
  const { id } = await params;
  const { q } = await searchParams;
}
```

---

## 8. 마이그레이션 전략 (React 18 → 19)

### 8.1 4단계 계획

```
Phase 1: 준비 (1주)
├── React 19 릴리스 노트 및 Breaking Changes 확인
├── 서드파티 라이브러리 호환성 조사
├── 자동 codemod 드라이런 실행
└── 영향 범위 리포트 작성

Phase 2: 자동 변환 (1주)
├── npx @react-codemod/cli 실행
├── forwardRef 제거
├── useContext → use() 전환
├── 타입 정의 업데이트 (ref prop)
└── 자동 변환 결과 리뷰

Phase 3: 수동 수정 (1-2주)
├── Codemod가 처리하지 못한 패턴 수동 수정
├── Server Action / useActionState 전환
├── React Compiler 활성화 및 검증
├── 테스트 스위트 실행 및 수정
└── 성능 벤치마크 비교

Phase 4: 검증 및 배포 (1주)
├── 스테이징 환경 전체 테스트
├── 카나리 배포 (5% → 25% → 100%)
├── 성능 모니터링 (Core Web Vitals)
└── 롤백 계획 확인
```

### 8.2 Codemod 실행

```bash
# forwardRef 제거
npx @react-codemod/cli \
  --transform react-19/remove-forward-ref \
  src/

# useContext → use() 전환
npx @react-codemod/cli \
  --transform react-19/replace-use-context \
  src/

# 전체 드라이런 (변경 없이 결과만 확인)
npx @react-codemod/cli \
  --dry-run --print \
  --transform react-19/remove-forward-ref \
  --transform react-19/replace-use-context \
  src/
```

### 8.3 주요 Breaking Changes

| 변경 사항 | React 18 | React 19 | 대응 |
|-----------|----------|----------|------|
| ref 전달 | `forwardRef()` 필수 | ref를 일반 prop으로 전달 | `forwardRef` 제거, ref를 prop으로 받기 |
| Context 소비 | `useContext(Ctx)` | `use(Ctx)` | codemod로 일괄 변환 |
| Context Provider | `<Ctx.Provider value={}>` | `<Ctx value={}>` | `.Provider` 제거 |
| 폼 상태 관리 | `useFormState` (canary) | `useActionState` | 이름 변경 + 반환값에 `isPending` 추가 |
| ref 콜백 클린업 | 지원 안 함 | 클린업 함수 반환 가능 | `ref={(el) => { setup(el); return () => cleanup(); }}` |
| useDeferredValue | 초기값 없음 | `useDeferredValue(value, initialValue)` | 두 번째 인자 옵션 활용 |
| 에러 처리 | `onRecoverableError` | 에러가 자동으로 `window.reportError`로 전달 | 글로벌 에러 핸들러 확인 |
| 메타 태그 | `react-helmet` 등 | `<title>`, `<meta>` 직접 사용 | 서드파티 의존성 제거 가능 |

### 8.4 호환성 체크리스트

```tsx
// 1. forwardRef 제거
// Before
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});

// After
function Input({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}

// 2. Context Provider 간소화
// Before
<ThemeContext.Provider value={theme}>
  {children}
</ThemeContext.Provider>

// After
<ThemeContext value={theme}>
  {children}
</ThemeContext>

// 3. useContext → use()
// Before
import { useContext } from "react";
const theme = useContext(ThemeContext);

// After
import { use } from "react";
const theme = use(ThemeContext);

// 4. ref 콜백 클린업
// Before
<div ref={(el) => {
  if (el) observe(el);
  // 클린업 불가
}} />

// After
<div ref={(el) => {
  observe(el);
  return () => unobserve(el); // 클린업 함수 반환
}} />

// 5. Document Metadata
// Before (react-helmet)
<Helmet>
  <title>My Page</title>
  <meta name="description" content="..." />
</Helmet>

// After (React 19 내장)
function Page() {
  return (
    <>
      <title>My Page</title>
      <meta name="description" content="..." />
      <div>페이지 내용</div>
    </>
  );
}
```

---

## 부록: 빠른 참조 치트시트

```
React 19 핵심 변경 요약
========================

Server Component    → 기본값. 'use client' 없으면 Server
Client Component    → 'use client' 선언. 인터랙션 필요 시에만
Server Action       → 'use server' 선언. 폼 처리, 데이터 변경
React Compiler      → 자동 메모이제이션. useMemo/useCallback 불필요
use()               → Context + Promise 소비. 조건부 호출 가능
useActionState      → 폼 Action 상태 관리 (이전 useFormState)
useOptimistic       → 낙관적 UI 업데이트
ref as prop         → forwardRef 불필요. ref를 일반 prop으로
PPR                 → Suspense 경계 기준으로 정적/동적 분할
```
