# CI/CD 파이프라인 가이드 (2026) -- AI 극대화 + 멀티 베타 + Supply Chain Security

## 목차

1. [AI 프롬프트 5선](#1-ai-프롬프트-5선)
2. [Immutable Actions -- SHA Pinning](#2-immutable-actions--sha-pinning)
3. [Remote Cache -- Nx Cloud / Turborepo](#3-remote-cache--nx-cloud--turborepo)
4. [Reusable Workflow -- N개 환경 동시 배포](#4-reusable-workflow--n개-환경-동시-배포)
5. [Preview 자동 생성 + Lighthouse 비교](#5-preview-자동-생성--lighthouse-비교)
6. [Supply Chain Security -- Sigstore / SLSA / npm provenance](#6-supply-chain-security--sigstore--slsa--npm-provenance)
7. [CI 비용 최적화 -- Larger Runners vs Self-hosted](#7-ci-비용-최적화--larger-runners-vs-self-hosted)
8. [종합 체크리스트](#8-종합-체크리스트)

---

## 1. AI 프롬프트 5선

CI/CD 파이프라인 전 단계에서 AI를 적극 활용한다. 아래 5가지 프롬프트는 실무에서 즉시 사용할 수 있도록 설계되었다.

### 1.1 CI 실패 분석 (Failure Root-Cause Analysis)

CI가 실패했을 때 로그를 AI에 넘겨 근본 원인을 빠르게 파악한다.

```typescript
// ci-failure-analyzer.ts
interface CIFailureReport {
  rootCause: string;
  category: 'flaky' | 'dependency' | 'code' | 'infra' | 'config';
  suggestedFix: string;
  confidence: number;
  relatedCommits: string[];
}

async function analyzeCIFailure(
  log: string,
  recentCommits: { sha: string; message: string; files: string[] }[],
): Promise<CIFailureReport> {
  const prompt = `
당신은 CI/CD 전문 SRE 엔지니어다. 아래 CI 실패 로그를 분석하라.

## CI 로그 (마지막 200줄)
\`\`\`
${log.split('\n').slice(-200).join('\n')}
\`\`\`

## 최근 커밋
${recentCommits.map((c) => `- ${c.sha.slice(0, 7)}: ${c.message} (${c.files.join(', ')})`).join('\n')}

## 분석 기준
1. 에러 메시지 핵심 키워드 추출
2. flaky test 여부 판단 (이전 성공 이력 대비)
3. dependency 충돌 / lock 파일 불일치 탐지
4. OOM, 타임아웃 등 인프라 이슈 분류
5. 가장 가능성 높은 원인 커밋 지목

JSON 형식 응답:
{
  "rootCause": "구체적 원인 설명",
  "category": "flaky | dependency | code | infra | config",
  "suggestedFix": "수정 방법",
  "confidence": 0.0~1.0,
  "relatedCommits": ["sha1", "sha2"]
}
`.trim();

  return callAI<CIFailureReport>(prompt);
}
```

### 1.2 빌드 최적화 (Build Performance Advisor)

빌드 설정과 실행 시간 데이터를 넘겨 병목을 찾고 최적화 방안을 제안받는다.

```typescript
// build-optimizer-prompt.ts
interface BuildOptimizationAdvice {
  bottlenecks: { step: string; duration: number; suggestion: string }[];
  cacheRecommendations: string[];
  parallelizationOpportunities: string[];
  estimatedImprovement: string;
}

async function adviseBuildOptimization(
  workflowYaml: string,
  timingData: { step: string; avgDuration: number; p95Duration: number }[],
  cacheHitRate: number,
): Promise<BuildOptimizationAdvice> {
  const prompt = `
당신은 GitHub Actions 빌드 최적화 전문가다. 아래 워크플로우의 성능을 분석하라.

## 워크플로우 YAML
\`\`\`yaml
${workflowYaml}
\`\`\`

## Step별 실행 시간 (최근 30일 평균 / P95)
${timingData.map((t) => `- ${t.step}: avg ${t.avgDuration}s / p95 ${t.p95Duration}s`).join('\n')}

## 현재 캐시 히트율: ${(cacheHitRate * 100).toFixed(1)}%

## 분석 항목
1. 가장 느린 step 3개와 각각의 최적화 방안
2. 캐시 전략 개선 (dependency cache, build cache, docker layer cache)
3. 병렬 실행 가능한 step 조합 (needs 의존성 재배치)
4. 불필요한 step 제거 또는 조건부 실행 전환
5. Larger Runner / Self-hosted Runner 전환 효과 추정

JSON 형식 응답:
{
  "bottlenecks": [{ "step": "...", "duration": 0, "suggestion": "..." }],
  "cacheRecommendations": ["..."],
  "parallelizationOpportunities": ["..."],
  "estimatedImprovement": "전체 빌드 시간 X% 단축 예상"
}
`.trim();

  return callAI<BuildOptimizationAdvice>(prompt);
}
```

### 1.3 워크플로우 자동 생성 (Workflow Generator)

프로젝트 구조를 분석하여 최적의 GitHub Actions 워크플로우를 자동 생성한다.

```typescript
// workflow-generator-prompt.ts
interface GeneratedWorkflow {
  filename: string;
  content: string;
  explanation: string;
  securityNotes: string[];
}

async function generateWorkflow(
  packageJson: Record<string, unknown>,
  projectStructure: string[],
  requirements: string,
): Promise<GeneratedWorkflow> {
  const prompt = `
당신은 GitHub Actions 전문가다. 아래 프로젝트에 맞는 CI/CD 워크플로우를 생성하라.

## package.json (scripts 섹션)
\`\`\`json
${JSON.stringify(packageJson.scripts, null, 2)}
\`\`\`

## 프로젝트 구조 (주요 디렉토리)
${projectStructure.map((p) => `- ${p}`).join('\n')}

## 요구사항
${requirements}

## 필수 규칙
1. 모든 third-party actions는 SHA pinning 사용 (태그 금지)
2. permissions는 최소 권한 원칙 (contents: read 기본)
3. 시크릿은 환경 변수로만 참조 (하드코딩 금지)
4. concurrency 설정으로 중복 실행 방지
5. timeout-minutes 명시
6. Node 버전은 매트릭스 또는 .node-version 파일 참조

YAML 워크플로우 파일 전체를 생성하라.
응답 형식:
{
  "filename": "ci.yml",
  "content": "yaml 내용",
  "explanation": "워크플로우 설명",
  "securityNotes": ["보안 관련 참고사항"]
}
`.trim();

  return callAI<GeneratedWorkflow>(prompt);
}
```

### 1.4 보안 스캔 결과 분석 (Security Scan Triage)

SAST/SCA 스캔 결과를 AI에 넘겨 실제 위험도를 재평가하고 우선순위를 정한다.

```typescript
// security-scan-triage-prompt.ts
interface TriagedFinding {
  id: string;
  originalSeverity: string;
  adjustedSeverity: string;
  exploitability: 'confirmed' | 'likely' | 'unlikely' | 'false-positive';
  reason: string;
  remediation: string;
}

async function triageSecurityFindings(
  findings: { id: string; severity: string; title: string; file: string; snippet: string }[],
  projectContext: string,
): Promise<TriagedFinding[]> {
  const prompt = `
당신은 애플리케이션 보안(AppSec) 전문가다. 아래 보안 스캔 결과를 분석하라.

## 프로젝트 컨텍스트
${projectContext}

## 스캔 결과 (${findings.length}건)
${findings.map((f) => `
### ${f.id}: ${f.title} [${f.severity}]
파일: ${f.file}
\`\`\`
${f.snippet}
\`\`\`
`).join('\n')}

## 분석 기준
1. 실제 공격 가능성 (네트워크 노출 여부, 입력값 도달 경로)
2. false positive 여부 (프레임워크의 내장 보호, 이미 적용된 방어)
3. 비즈니스 임팩트 (데이터 유출 가능성, 권한 상승 등)
4. 수정 난이도와 구체적 코드 수정 방안

각 finding에 대해 JSON 배열로 응답:
[{
  "id": "...",
  "originalSeverity": "...",
  "adjustedSeverity": "critical | high | medium | low | info",
  "exploitability": "confirmed | likely | unlikely | false-positive",
  "reason": "판단 근거",
  "remediation": "구체적 수정 코드 또는 설정 변경"
}]
`.trim();

  return callAI<TriagedFinding[]>(prompt);
}
```

### 1.5 CI 비용 분석 (Cost Analysis)

GitHub Actions 사용량 데이터를 분석하여 비용 절감 방안을 제안받는다.

```typescript
// ci-cost-analyzer-prompt.ts
interface CostAnalysisResult {
  monthlyCost: number;
  topConsumers: { workflow: string; minutes: number; cost: number }[];
  savingOpportunities: { action: string; estimatedSaving: number; effort: string }[];
  runnerRecommendation: string;
}

async function analyzeCICost(
  usageData: {
    workflow: string;
    runs: number;
    avgMinutes: number;
    runnerType: string;
    cacheHitRate: number;
  }[],
  currentPlan: string,
): Promise<CostAnalysisResult> {
  const prompt = `
당신은 GitHub Actions 비용 최적화 전문가다. 아래 사용량 데이터를 분석하라.

## 현재 플랜: ${currentPlan}

## 워크플로우별 사용량 (최근 30일)
${usageData
  .map(
    (w) =>
      `- ${w.workflow}: ${w.runs}회 실행, 평균 ${w.avgMinutes}분, ` +
      `러너: ${w.runnerType}, 캐시 히트: ${(w.cacheHitRate * 100).toFixed(0)}%`,
  )
  .join('\n')}

## 분석 항목
1. 총 월간 비용 산출 (러너 타입별 분당 단가 적용)
2. 비용 상위 3개 워크플로우 상세 분석
3. 비용 절감 방안 (캐시 개선, 조건부 실행, 러너 전환 등)
4. GitHub Larger Runners vs Self-hosted ARM64 비용 비교
5. Spot 인스턴스 활용 시 절감 효과

JSON 형식 응답:
{
  "monthlyCost": 0,
  "topConsumers": [{ "workflow": "...", "minutes": 0, "cost": 0 }],
  "savingOpportunities": [{ "action": "...", "estimatedSaving": 0, "effort": "low|medium|high" }],
  "runnerRecommendation": "추천 러너 구성"
}
`.trim();

  return callAI<CostAnalysisResult>(prompt);
}
```

---

## 2. Immutable Actions -- SHA Pinning

Actions를 태그(예: `@v4`)로 참조하면 공급망 공격에 노출될 수 있다. **반드시 커밋 SHA 전체(40자)를 고정**한다.

### 2.1 SHA Pinning 규칙

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      # SHA pinning -- 태그 대신 전체 커밋 해시 사용
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - uses: actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.0
        with:
          path: |
            node_modules
            .next/cache
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
```

### 2.2 SHA 자동 갱신 (Renovate / Dependabot)

```json5
// renovate.json -- Actions SHA 자동 업데이트
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "packageRules": [
    {
      "matchManagers": ["github-actions"],
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true,
      "automergeType": "pr",
      "commitMessagePrefix": "ci: ",
      "groupName": "github-actions minor/patch"
    },
    {
      "matchManagers": ["github-actions"],
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["ci", "breaking"]
    }
  ]
}
```

### 2.3 SHA Pinning Lint (CI에서 강제)

```yaml
# .github/workflows/lint-actions.yml
name: Lint Action Refs

on:
  pull_request:
    paths:
      - '.github/workflows/**'

jobs:
  check-sha-pinning:
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      # uses: 라인에서 @sha가 아닌 @v* 태그 사용 시 실패
      - name: Check SHA pinning
        run: |
          VIOLATIONS=$(grep -rn 'uses:.*@v[0-9]' .github/workflows/ || true)
          if [ -n "$VIOLATIONS" ]; then
            echo "::error::Tag references detected. Use SHA pinning instead."
            echo "$VIOLATIONS"
            exit 1
          fi
          echo "All action references use SHA pinning."
```

---

## 3. Remote Cache -- Nx Cloud / Turborepo

모노레포에서 Remote Cache를 활용하면 이미 빌드된 태스크를 다른 CI 러너와 로컬 개발 환경에서 재사용할 수 있다. CI 시간을 50-80% 단축한다.

### 3.1 Nx Cloud 설정

```typescript
// nx.json
{
  "nxCloudId": "TEAM_NX_CLOUD_ID",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "parallel": 4,
        "useDaemonProcess": true
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json", "{workspaceRoot}/eslint.config.mjs"],
      "cache": true
    }
  }
}
```

```yaml
# .github/workflows/ci-nx.yml -- Nx Cloud + affected 명령어
name: CI (Nx Cloud)

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

env:
  NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}
  NX_BRANCH: ${{ github.event.pull_request.number || github.ref_name }}

jobs:
  main:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          fetch-depth: 0
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline

      # SHAs 설정 -- affected 범위 계산에 사용
      - uses: nrwl/nx-set-shas@e2e59b8eb7383c8a80e45134a48ed35a1f2e1fea # v4.3.0

      # affected 프로젝트만 lint/test/build
      - run: npx nx affected -t lint test build --parallel=4
```

### 3.2 Turborepo Remote Cache 설정

```json5
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.base.json"],
  "globalEnv": ["NODE_ENV", "CI"],
  "ui": "stream",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json", "package.json"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tests/**", "vitest.config.*"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "inputs": ["src/**", "eslint.config.*"],
      "outputs": [],
      "cache": true
    }
  }
}
```

```yaml
# .github/workflows/ci-turbo.yml
name: CI (Turborepo)

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline

      # --filter로 변경된 패키지만 빌드 (Remote Cache 자동 활용)
      - run: npx turbo run lint test build --filter='...[origin/main]'
```

---

## 4. Reusable Workflow -- N개 환경 동시 배포

하나의 Reusable Workflow를 정의하고, 매트릭스로 dev/staging/beta-1/beta-2/production 등 N개 환경에 동시 배포한다.

### 4.1 Reusable Workflow 정의

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
        description: '배포 대상 환경 (dev, staging, beta-1, beta-2, production)'
      ref:
        required: true
        type: string
        description: '배포할 Git ref (branch, tag, SHA)'
      skip-smoke-test:
        required: false
        type: boolean
        default: false
    secrets:
      AWS_ROLE_ARN:
        required: true
      DEPLOY_TOKEN:
        required: true

permissions:
  contents: read
  id-token: write   # OIDC

jobs:
  deploy:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    environment:
      name: ${{ inputs.environment }}
      url: https://${{ inputs.environment }}.example.com
    concurrency:
      group: deploy-${{ inputs.environment }}
      cancel-in-progress: false   # 배포는 취소하지 않음

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          ref: ${{ inputs.ref }}
          persist-credentials: false

      # OIDC로 AWS 인증 (장기 키 사용 안 함)
      - uses: aws-actions/configure-aws-credentials@ececac1a45f3b08a01d2dd070d28d111c5fe6722 # v4.1.0
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-2

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline

      - name: Build with environment config
        run: npm run build
        env:
          DEPLOY_ENV: ${{ inputs.environment }}

      - name: Deploy to ${{ inputs.environment }}
        run: |
          npx cdk deploy --require-approval never \
            --context env=${{ inputs.environment }}

      - name: Smoke test
        if: ${{ !inputs.skip-smoke-test }}
        run: |
          npx wait-on https://${{ inputs.environment }}.example.com --timeout 60000
          npx playwright test tests/smoke/ --project=chromium
        env:
          BASE_URL: https://${{ inputs.environment }}.example.com
```

### 4.2 N개 환경 동시 호출

```yaml
# .github/workflows/deploy-multi.yml
name: Multi-Environment Deploy

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      environments:
        description: '배포 환경 (콤마 구분: dev,staging,beta-1,beta-2,production)'
        required: true
        default: 'dev,staging'

permissions:
  contents: read

jobs:
  # 동적 매트릭스 생성
  prepare:
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - id: set-matrix
        run: |
          if [ "${{ github.event_name }}" = "push" ]; then
            ENVS='["dev","staging","beta-1","beta-2","production"]'
          else
            INPUT="${{ github.event.inputs.environments }}"
            ENVS=$(echo "$INPUT" | jq -Rc 'split(",")')
          fi
          echo "matrix={\"environment\":$ENVS}" >> "$GITHUB_OUTPUT"

  deploy:
    needs: prepare
    strategy:
      matrix: ${{ fromJson(needs.prepare.outputs.matrix) }}
      fail-fast: false   # 한 환경 실패해도 나머지 계속
      max-parallel: 3
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: ${{ matrix.environment }}
      ref: ${{ github.sha }}
    secrets:
      AWS_ROLE_ARN: ${{ secrets[format('AWS_ROLE_ARN_{0}', matrix.environment)] }}
      DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}

  # 전체 배포 완료 후 통합 알림
  notify:
    needs: deploy
    if: always()
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - name: Summary
        run: |
          echo "## Deploy Results" >> "$GITHUB_STEP_SUMMARY"
          echo "| Environment | Status |" >> "$GITHUB_STEP_SUMMARY"
          echo "| --- | --- |" >> "$GITHUB_STEP_SUMMARY"
          echo "Ref: ${{ github.sha }}" >> "$GITHUB_STEP_SUMMARY"
```

---

## 5. Preview 자동 생성 + Lighthouse 비교

PR마다 Preview 환경을 자동 생성하고, Lighthouse 점수를 main 브랜치와 비교하여 PR 코멘트로 남긴다.

### 5.1 Preview 배포 + Lighthouse CI

```yaml
# .github/workflows/preview.yml
name: Preview + Lighthouse

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  id-token: write

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  preview:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    outputs:
      preview-url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline

      - name: Build
        run: npm run build
        env:
          DEPLOY_ENV: preview
          PREVIEW_ID: pr-${{ github.event.pull_request.number }}

      # S3 + CloudFront로 Preview 배포
      - uses: aws-actions/configure-aws-credentials@ececac1a45f3b08a01d2dd070d28d111c5fe6722 # v4.1.0
        with:
          role-to-assume: ${{ secrets.AWS_PREVIEW_ROLE_ARN }}
          aws-region: ap-northeast-2

      - id: deploy
        name: Deploy Preview
        run: |
          BUCKET="preview-${{ github.repository_owner }}"
          PREFIX="pr-${{ github.event.pull_request.number }}"
          aws s3 sync dist/ "s3://${BUCKET}/${PREFIX}/" --delete
          aws cloudfront create-invalidation \
            --distribution-id "${{ secrets.PREVIEW_CF_ID }}" \
            --paths "/${PREFIX}/*"
          URL="https://preview.example.com/${PREFIX}/"
          echo "url=${URL}" >> "$GITHUB_OUTPUT"

  lighthouse:
    needs: preview
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline

      # PR Preview에 Lighthouse 실행
      - name: Lighthouse -- PR
        run: |
          npx @lhci/cli collect \
            --url="${{ needs.preview.outputs.preview-url }}" \
            --numberOfRuns=3 \
            --settings.preset=desktop
          npx @lhci/cli upload \
            --target=filesystem \
            --outputDir=./lhci-pr

      # main(Production)에 Lighthouse 실행
      - name: Lighthouse -- Production
        run: |
          npx @lhci/cli collect \
            --url="https://www.example.com" \
            --numberOfRuns=3 \
            --settings.preset=desktop
          npx @lhci/cli upload \
            --target=filesystem \
            --outputDir=./lhci-prod

      # 점수 비교 및 PR 코멘트
      - name: Compare & Comment
        uses: actions/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea # v7.0.1
        with:
          script: |
            const fs = require('fs');

            function readScores(dir) {
              const manifest = JSON.parse(
                fs.readFileSync(`${dir}/manifest.json`, 'utf8')
              );
              const results = manifest.map((entry) => {
                const lhr = JSON.parse(fs.readFileSync(entry.jsonPath, 'utf8'));
                return {
                  performance: lhr.categories.performance.score * 100,
                  accessibility: lhr.categories.accessibility.score * 100,
                  bestPractices: lhr.categories['best-practices'].score * 100,
                  seo: lhr.categories.seo.score * 100,
                };
              });
              // 중앙값 반환
              const mid = Math.floor(results.length / 2);
              return Object.fromEntries(
                Object.keys(results[0]).map((key) => {
                  const sorted = results.map((r) => r[key]).sort((a, b) => a - b);
                  return [key, sorted[mid]];
                })
              );
            }

            const pr = readScores('./lhci-pr');
            const prod = readScores('./lhci-prod');
            const delta = (key) => {
              const diff = pr[key] - prod[key];
              const sign = diff >= 0 ? '+' : '';
              const emoji = diff >= 0 ? ':white_check_mark:' : ':warning:';
              return `${emoji} ${sign}${diff.toFixed(0)}`;
            };

            const body = `## Lighthouse Comparison

            | Category | Production | PR Preview | Delta |
            | --- | --- | --- | --- |
            | Performance | ${prod.performance} | ${pr.performance} | ${delta('performance')} |
            | Accessibility | ${prod.accessibility} | ${pr.accessibility} | ${delta('accessibility')} |
            | Best Practices | ${prod.bestPractices} | ${pr.bestPractices} | ${delta('bestPractices')} |
            | SEO | ${prod.seo} | ${pr.seo} | ${delta('seo')} |

            Preview: ${{ needs.preview.outputs.preview-url }}`.replace(/^            /gm, '');

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.find(
              (c) => c.user.type === 'Bot' && c.body.includes('Lighthouse Comparison')
            );

            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }

  # PR 닫힐 때 Preview 정리
  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - uses: aws-actions/configure-aws-credentials@ececac1a45f3b08a01d2dd070d28d111c5fe6722 # v4.1.0
        with:
          role-to-assume: ${{ secrets.AWS_PREVIEW_ROLE_ARN }}
          aws-region: ap-northeast-2

      - run: |
          aws s3 rm "s3://preview-${{ github.repository_owner }}/pr-${{ github.event.pull_request.number }}/" --recursive
```

---

## 6. Supply Chain Security -- Sigstore / SLSA / npm provenance

소프트웨어 공급망 보안을 위한 3중 방어 체계를 구축한다.

### 6.1 Sigstore 서명 (컨테이너 이미지)

```yaml
# .github/workflows/sign-image.yml
name: Build, Push & Sign Container Image

on:
  push:
    tags: ['v*']

permissions:
  contents: read
  packages: write
  id-token: write   # Sigstore OIDC

jobs:
  build-sign:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: sigstore/cosign-installer@dc72c7d5c4d10cd6bcb8cf6e3fd625a9e5e537da # v3.7.0

      - uses: docker/login-action@9780b0c442fbb1117ed29e0efdff1e18412f7567 # v3.3.0
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@369eb591f429131d6889c46b94e711f089e6ca96 # v5.6.1
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=semver,pattern={{version}}
            type=sha

      - id: build-push
        uses: docker/build-push-action@48aba3b46d1b1fec4febb7c5d0c644b249420afd # v6.10.0
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}

      # Keyless 서명 (Sigstore Fulcio + Rekor)
      - name: Sign image with Cosign
        run: |
          cosign sign --yes \
            ghcr.io/${{ github.repository }}@${{ steps.build-push.outputs.digest }}

      # 서명 검증 (CI에서 검증 가능 확인)
      - name: Verify signature
        run: |
          cosign verify \
            --certificate-identity-regexp="https://github.com/${{ github.repository }}/*" \
            --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
            ghcr.io/${{ github.repository }}@${{ steps.build-push.outputs.digest }}
```

### 6.2 SLSA Provenance (빌드 출처 증명)

```yaml
# .github/workflows/slsa-provenance.yml
name: SLSA Build Provenance

on:
  push:
    tags: ['v*']

permissions:
  contents: read
  id-token: write
  attestations: write

jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    outputs:
      digest: ${{ steps.hash.outputs.digest }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline
      - run: npm run build

      # 빌드 아티팩트 해시 생성
      - id: hash
        name: Generate artifact hash
        run: |
          DIGEST=$(sha256sum dist/app.zip | cut -d' ' -f1)
          echo "digest=sha256:${DIGEST}" >> "$GITHUB_OUTPUT"

      - uses: actions/upload-artifact@ea165f8d65b6db9b8a1f7c0b7b2fe98ca28edf28 # v4.6.0
        with:
          name: build-artifact
          path: dist/app.zip

      # GitHub Attestation (SLSA Level 3)
      - uses: actions/attest-build-provenance@ef244123eb79f2f7a7e75d99086184b89e6d0e87 # v1.4.4
        with:
          subject-name: ${{ github.repository }}-app
          subject-digest: ${{ steps.hash.outputs.digest }}
```

### 6.3 npm provenance (패키지 출처 증명)

```yaml
# .github/workflows/npm-publish.yml
name: Publish to npm with Provenance

on:
  push:
    tags: ['v*']

permissions:
  contents: read
  id-token: write   # npm provenance에 필요

jobs:
  publish:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci --prefer-offline
      - run: npm run build

      # --provenance 플래그로 SLSA provenance 자동 첨부
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 6.4 SBOM 생성 + 취약점 자동 스캔

```yaml
# .github/workflows/sbom.yml
name: SBOM & Vulnerability Scan

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # 매주 월요일 06:00 UTC

permissions:
  contents: read
  security-events: write

jobs:
  sbom:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      # SBOM 생성 (CycloneDX 형식)
      - name: Generate SBOM
        run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json

      # Grype로 취약점 스캔
      - uses: anchore/scan-action@2c901ab7378897c01b8efaa2d0c9bf519cc64b9e # v5.3.0
        id: scan
        with:
          sbom: sbom.json
          fail-build: true
          severity-cutoff: high

      # 결과를 GitHub Security 탭에 업로드
      - uses: github/codeql-action/upload-sarif@4dd16135b69cb9d56b0d6f37f0c559cee5a2ef00 # v3.28.0
        if: always()
        with:
          sarif_file: ${{ steps.scan.outputs.sarif }}

      - uses: actions/upload-artifact@ea165f8d65b6db9b8a1f7c0b7b2fe98ca28edf28 # v4.6.0
        with:
          name: sbom
          path: sbom.json
```

---

## 7. CI 비용 최적화 -- Larger Runners vs Self-hosted

### 7.1 러너 타입별 비용 비교 (2026 기준)

| 러너 타입 | vCPU | RAM | 분당 단가 (USD) | 적합한 용도 |
| --- | --- | --- | --- | --- |
| `ubuntu-latest` (GitHub 제공) | 4 | 16 GB | $0.008 | 일반 CI |
| `ubuntu-24.04-16core` (Larger) | 16 | 64 GB | $0.064 | 대형 빌드, E2E |
| `ubuntu-24.04-32core` (Larger) | 32 | 128 GB | $0.128 | 모노레포 전체 빌드 |
| Self-hosted (ARM64 Graviton) | 16 | 32 GB | ~$0.02* | 상시 CI, 커스텀 도구 |
| Self-hosted (Spot ARM64) | 16 | 32 GB | ~$0.008* | 비핵심 태스크 |

*Self-hosted 단가는 EC2 비용 기준 추정치. 관리 비용 별도.

### 7.2 비용 최적화 전략 워크플로우

```yaml
# .github/workflows/cost-optimized-ci.yml
name: Cost-Optimized CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  # 빠른 체크 -- 기본 러너 (저비용)
  quick-checks:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline
      - run: npm run typecheck
      - run: npm run lint

  # 유닛 테스트 -- 기본 러너 (저비용)
  unit-test:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline
      - run: npm run test -- --shard=${{ strategy.job-index + 1 }}/${{ strategy.job-total }}
    strategy:
      matrix:
        shard: [1, 2, 3, 4]

  # E2E 테스트 -- Larger Runner (고비용이지만 빠름)
  e2e-test:
    needs: [quick-checks]
    runs-on: ubuntu-24.04-16core  # Larger Runner
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline
      - run: npx playwright install --with-deps chromium

      - name: E2E Tests (parallel on 16 cores)
        run: npx playwright test --workers=8

      - uses: actions/upload-artifact@ea165f8d65b6db9b8a1f7c0b7b2fe98ca28edf28 # v4.6.0
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  # 빌드 -- 조건부 러너 선택
  build:
    needs: [quick-checks]
    runs-on: ${{ github.ref == 'refs/heads/main' && 'ubuntu-24.04-16core' || 'ubuntu-24.04' }}
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version-file: '.node-version'
          cache: 'npm'

      - run: npm ci --prefer-offline
      - run: npm run build

      - uses: actions/upload-artifact@ea165f8d65b6db9b8a1f7c0b7b2fe98ca28edf28 # v4.6.0
        with:
          name: build-output
          path: dist/
          retention-days: 3
```

### 7.3 Self-hosted Runner 구성 (Terraform)

```hcl
# infra/ci-runners/main.tf
module "github_runner" {
  source  = "philips-labs/github-runner/aws"
  version = "~> 6.0"

  # Graviton ARM64 -- x86 대비 비용 40% 절감, 성능 동등
  instance_types = ["m7g.4xlarge"]  # 16 vCPU, 64 GB
  ami_filter = {
    name = ["ubuntu/images/hvm-ssd-gp3/ubuntu-*-24.04-arm64-server-*"]
  }

  # Spot 인스턴스로 추가 60-70% 절감
  market_options = {
    market_type = "spot"
    spot_options = {
      max_price = "0.25"  # On-demand 대비 상한
    }
  }

  runners_maximum_count = 10
  runners_minimum_count = 1   # warm pool
  scale_down_schedule    = "cron(0 20 ? * MON-FRI *)"  # 퇴근 후 축소
  scale_up_schedule      = "cron(0 8 ? * MON-FRI *)"   # 출근 시 확장

  # Runner 라벨
  runner_extra_labels = ["self-hosted", "arm64", "spot"]

  # 캐시용 EBS 볼륨
  block_device_mappings = [{
    device_name = "/dev/sda1"
    ebs = {
      volume_size = 100
      volume_type = "gp3"
      iops        = 6000
      throughput  = 400
    }
  }]
}
```

---

## 8. 종합 체크리스트

### Actions & Workflow

- [ ] 모든 third-party actions에 SHA pinning 적용 (태그 참조 금지)
- [ ] Renovate 또는 Dependabot으로 SHA 자동 갱신 설정
- [ ] `permissions`를 job 레벨에서 최소 권한으로 명시
- [ ] `timeout-minutes`를 모든 job에 명시
- [ ] `concurrency` 설정으로 중복 실행 방지
- [ ] `persist-credentials: false`를 checkout에 명시

### Remote Cache

- [ ] Nx Cloud 또는 Turborepo Remote Cache 연동
- [ ] `affected` / `filter` 명령어로 변경분만 빌드
- [ ] cache hit rate 80% 이상 달성 여부 모니터링

### 멀티 환경 배포

- [ ] Reusable Workflow로 N개 환경 매트릭스 배포 구성
- [ ] 환경별 GitHub Environment + 승인 규칙 설정
- [ ] OIDC 인증 사용 (장기 시크릿 키 금지)
- [ ] fail-fast: false로 한 환경 실패 시 나머지 계속 배포

### Preview & Lighthouse

- [ ] PR별 Preview 환경 자동 생성
- [ ] PR 닫힘 시 Preview 자동 정리
- [ ] Lighthouse 점수 main 대비 비교, PR 코멘트 자동 게시
- [ ] Performance 점수 하락 시 경고 또는 블로킹 설정

### Supply Chain Security

- [ ] 컨테이너 이미지 Sigstore(Cosign) keyless 서명
- [ ] SLSA Provenance 생성 및 GitHub Attestation 활용
- [ ] npm publish 시 `--provenance` 플래그 사용
- [ ] SBOM(CycloneDX) 생성 및 Grype 취약점 스캔
- [ ] 주간 정기 스캔 스케줄 설정

### CI 비용

- [ ] 러너 타입별 비용 대비 성능 분석 완료
- [ ] Lint/Typecheck는 기본 러너, E2E/빌드는 Larger Runner 분리
- [ ] main 브랜치만 Larger Runner 사용하는 조건부 분기 적용
- [ ] Self-hosted 고려 시 Graviton ARM64 + Spot 인스턴스 검토
- [ ] 아티팩트 retention-days 최소화 (기본값 90일 -> 3-7일)

### AI 활용

- [ ] CI 실패 시 AI 자동 분석 파이프라인 구축
- [ ] 보안 스캔 결과 AI triage로 false positive 필터링
- [ ] 월간 CI 비용 AI 분석 리포트 자동화
- [ ] 새 프로젝트 워크플로우 생성 시 AI 프롬프트 활용
