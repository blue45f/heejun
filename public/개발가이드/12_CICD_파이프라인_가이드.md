# CI/CD 파이프라인 가이드 (2026)

## 목차
1. [AI 기반 CI 최적화](#1-ai-기반-ci-최적화)
2. [AI로 GitHub Actions 워크플로우 자동 생성 및 최적화](#2-ai로-github-actions-워크플로우-자동-생성-및-최적화)
3. [AI 기반 보안 취약점 자동 스캔 및 수정 제안](#3-ai-기반-보안-취약점-자동-스캔-및-수정-제안)
4. [멀티 배포 CI/CD 파이프라인](#4-멀티-배포-cicd-파이프라인)
5. [보안 파이프라인 (SAST/DAST/SCA, SBOM)](#5-보안-파이프라인-sastdastsca-sbom)
6. [CI 메트릭스 — DORA 4 Key Metrics](#6-ci-메트릭스--dora-4-key-metrics)
7. [체크리스트](#7-체크리스트)

---

## 1. AI 기반 CI 최적화

> CI 파이프라인에서 AI를 활용하면 **변경 영향 범위를 분석하여 테스트를 선별 실행**하고, **빌드 캐시를 지능적으로 관리**하며, **플레이키 테스트를 자동 탐지**할 수 있다. 전체 CI 시간을 60% 이상 단축하는 것이 목표다.

### 1.1 AI 테스트 선별 실행 (Predictive Test Selection)

변경된 코드의 의존성 그래프를 AI가 분석하여, 영향받는 테스트만 선별 실행한다.

```typescript
// ai-test-selector.ts
interface TestSelectionResult {
  selectedTests: string[];
  skippedTests: string[];
  confidence: number;
  reasoning: string;
}

interface ChangedFile {
  path: string;
  diff: string;
  changeType: 'added' | 'modified' | 'deleted';
}

async function selectTestsWithAI(
  changedFiles: ChangedFile[],
  allTests: string[],
  dependencyGraph: Map<string, string[]>,
): Promise<TestSelectionResult> {
  // 1단계: 정적 의존성 분석으로 후보 축소
  const staticCandidates = new Set<string>();
  for (const file of changedFiles) {
    const dependents = dependencyGraph.get(file.path) ?? [];
    dependents.forEach((t) => staticCandidates.add(t));
  }

  // 2단계: AI로 실제 영향 범위 정밀 분석
  const prompt = buildTestSelectionPrompt(changedFiles, [...staticCandidates]);
  const response = await callAI(prompt);

  return {
    selectedTests: response.tests,
    skippedTests: allTests.filter((t) => !response.tests.includes(t)),
    confidence: response.confidence,
    reasoning: response.reasoning,
  };
}

function buildTestSelectionPrompt(
  changedFiles: ChangedFile[],
  candidateTests: string[],
): string {
  return `
다음 코드 변경사항을 분석하고, 실제로 실행이 필요한 테스트만 선별하라.

## 변경된 파일
${changedFiles.map((f) => `- ${f.path} (${f.changeType})\n\`\`\`diff\n${f.diff}\n\`\`\``).join('\n')}

## 후보 테스트 목록
${candidateTests.map((t) => `- ${t}`).join('\n')}

## 분석 기준
1. 변경된 함수/컴포넌트를 직접 사용하는 테스트는 반드시 포함
2. 타입 정의만 변경된 경우 런타임 테스트는 제외 가능
3. 설정 파일 변경 시 전체 통합 테스트 포함
4. CSS/스타일만 변경된 경우 스냅샷 테스트만 포함

JSON 형식으로 응답:
{ "tests": [...], "confidence": 0.0~1.0, "reasoning": "..." }
`.trim();
}
```

### 1.2 AI 빌드 캐시 최적화

```typescript
// ai-cache-optimizer.ts
interface CacheStrategy {
  layers: CacheLayer[];
  estimatedSavings: number; // 초 단위
  invalidationRules: InvalidationRule[];
}

interface CacheLayer {
  name: string;
  key: string;
  paths: string[];
  ttlHours: number;
  priority: number;
}

interface InvalidationRule {
  trigger: string;
  targets: string[];
}

async function optimizeBuildCache(
  buildHistory: BuildRecord[],
  currentConfig: CacheStrategy,
): Promise<CacheStrategy> {
  // 빌드 히스토리에서 캐시 히트율과 무효화 패턴 분석
  const cacheStats = analyzeCacheEfficiency(buildHistory);

  const prompt = `
빌드 캐시 전략을 최적화하라.

## 현재 캐시 히트율
${JSON.stringify(cacheStats, null, 2)}

## 최근 빌드 패턴
- 평균 빌드 시간: ${cacheStats.avgBuildTime}초
- 캐시 히트율: ${cacheStats.hitRate}%
- 불필요한 무효화 비율: ${cacheStats.unnecessaryInvalidationRate}%

## 최적화 방향
1. 의존성 변경 빈도에 따른 캐시 레이어 분리
2. 불필요한 캐시 무효화 제거
3. 원격 캐시 공유 전략 (팀원 간 캐시 재사용)

JSON으로 최적화된 CacheStrategy를 반환하라.
`.trim();

  return await callAI<CacheStrategy>(prompt);
}

function analyzeCacheEfficiency(
  history: BuildRecord[],
): CacheEfficiencyStats {
  const totalBuilds = history.length;
  const cacheHits = history.filter((b) => b.cacheHit).length;
  const avgBuildTime =
    history.reduce((sum, b) => sum + b.duration, 0) / totalBuilds;

  return {
    hitRate: Math.round((cacheHits / totalBuilds) * 100),
    avgBuildTime: Math.round(avgBuildTime),
    unnecessaryInvalidationRate: calculateUnnecessaryInvalidations(history),
    layerBreakdown: groupByLayer(history),
  };
}
```

### 1.3 AI 플레이키 테스트 자동 탐지

```typescript
// flaky-test-detector.ts
interface FlakyTestReport {
  testName: string;
  flakyScore: number; // 0~1, 높을수록 불안정
  pattern: 'timing' | 'ordering' | 'resource' | 'environment' | 'unknown';
  suggestedFix: string;
  recentResults: { passed: number; failed: number; total: number };
}

async function detectFlakyTests(
  testHistory: TestRunRecord[],
): Promise<FlakyTestReport[]> {
  // 동일 커밋에서 결과가 다른 테스트 식별
  const inconsistent = findInconsistentTests(testHistory);

  const reports: FlakyTestReport[] = [];
  for (const test of inconsistent) {
    const prompt = `
이 테스트의 실패 패턴을 분석하고 플레이키 원인을 추정하라.

## 테스트: ${test.name}
## 최근 30일 결과
- 성공: ${test.passed}회 / 실패: ${test.failed}회
- 실패 시간대 분포: ${JSON.stringify(test.failureTimeDistribution)}
- 실패 시 에러 메시지 상위 3개:
${test.topErrors.map((e) => `  - ${e}`).join('\n')}

## 패턴 분류
- timing: setTimeout/setInterval, 네트워크 지연, 애니메이션 대기
- ordering: 테스트 실행 순서 의존, 공유 상태 오염
- resource: 메모리 부족, 파일 핸들 누수, 포트 충돌
- environment: 환경 변수, OS 차이, 타임존

원인 패턴과 수정 방안을 제안하라.
`.trim();

    const analysis = await callAI(prompt);
    reports.push({
      testName: test.name,
      flakyScore: test.failed / (test.passed + test.failed),
      pattern: analysis.pattern,
      suggestedFix: analysis.fix,
      recentResults: {
        passed: test.passed,
        failed: test.failed,
        total: test.passed + test.failed,
      },
    });
  }

  return reports.sort((a, b) => b.flakyScore - a.flakyScore);
}
```

### AI 프롬프트 예시

#### 프롬프트 1: CI 파이프라인 병목 분석

```
우리 CI 파이프라인의 최근 빌드 로그를 분석해줘.

## 현재 상황
- 평균 CI 시간: 18분 (목표: 8분 이내)
- 테스트 단계: 12분 (전체의 67%)
- 빌드 단계: 4분
- 린트/타입체크: 2분

## 테스트 구성
- 단위 테스트 1,200개 (8분)
- 통합 테스트 150개 (3분)
- E2E 테스트 40개 (1분, 별도 워크플로우)

## 요청
1. 테스트 병렬화 전략 (GitHub Actions matrix 활용)
2. 변경 영향 범위 기반 테스트 선별 실행 방안
3. 빌드 캐시 최적화 (node_modules, .next/cache, turbo cache)
4. 각 최적화 적용 시 예상 시간 절감량
```

#### 프롬프트 2: 플레이키 테스트 근본 원인 분석

```
아래 테스트가 간헐적으로 실패한다. 근본 원인을 분석하고 수정 방안을 제안해줘.

## 테스트 정보
- 파일: src/components/DataTable.test.tsx
- 테스트명: "정렬 버튼 클릭 시 데이터가 정렬된다"
- 최근 30일: 성공 47회 / 실패 8회

## 실패 시 에러
- "Unable to find element with text: 가나다순"
- 주로 CI 환경에서 실패, 로컬에서는 재현 어려움

## 테스트 코드
const { getByText } = render(<DataTable data={mockData} />);
fireEvent.click(getByText('정렬'));
expect(getByText('가나다순')).toBeInTheDocument();

## 분석 요청
1. 비동기 상태 업데이트 누락 여부
2. waitFor/findByText 사용 필요 여부
3. 테스트 격리 문제 (공유 상태 오염) 가능성
4. 수정된 테스트 코드 제공
```

---

## 2. AI로 GitHub Actions 워크플로우 자동 생성 및 최적화

> AI에게 프로젝트 구조와 요구사항을 제공하면, 최적화된 GitHub Actions 워크플로우를 자동 생성할 수 있다.

### 2.1 AI 워크플로우 생성기

```typescript
// ai-workflow-generator.ts
interface WorkflowRequirements {
  projectType: 'next' | 'react' | 'vue' | 'node-api' | 'monorepo';
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
  testFramework: 'vitest' | 'jest' | 'playwright';
  deployTargets: DeployTarget[];
  features: WorkflowFeature[];
}

type WorkflowFeature =
  | 'preview-deploy'
  | 'matrix-deploy'
  | 'canary-release'
  | 'security-scan'
  | 'performance-audit'
  | 'auto-merge-dependabot';

interface DeployTarget {
  environment: string;
  provider: 'aws-s3' | 'cloudflare-pages' | 'vercel' | 'netlify';
  autoPromote: boolean;
}

async function generateWorkflow(
  requirements: WorkflowRequirements,
): Promise<string> {
  const projectStructure = await scanProjectStructure();

  const prompt = `
다음 프로젝트에 맞는 GitHub Actions 워크플로우를 생성하라.

## 프로젝트 정보
- 타입: ${requirements.projectType}
- 패키지 매니저: ${requirements.packageManager}
- 테스트 프레임워크: ${requirements.testFramework}
- 배포 대상: ${requirements.deployTargets.map((t) => `${t.environment} (${t.provider})`).join(', ')}
- 필요 기능: ${requirements.features.join(', ')}

## 프로젝트 구조
${projectStructure}

## 요구사항
1. Build Once, Deploy Everywhere 원칙 준수
2. 캐시 전략 최적화 (의존성, 빌드 산출물)
3. 보안: OIDC 기반 인증, 시크릿 최소 노출
4. 병렬화: 독립 작업은 최대 병렬 실행
5. 실패 시 Slack 알림 포함
6. concurrency 설정으로 중복 실행 방지

YAML 형식으로 워크플로우를 반환하라.
`.trim();

  return await callAI<string>(prompt);
}
```

### 2.2 AI 생성 워크플로우 예시 — PR Preview Deploy

```yaml
# .github/workflows/preview-deploy.yml
name: PR Preview Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  id-token: write
  contents: read
  pull-requests: write

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9'

jobs:
  preview:
    runs-on: ubuntu-latest
    environment:
      name: preview
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_API_URL: https://preview-api.example.com

      - name: Deploy to Preview
        id: deploy
        uses: cloudflare/wrangler-action@v3
        with:
          command: pages deploy out --project-name=my-app --branch=pr-${{ github.event.pull_request.number }}

      - name: Comment PR with Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.deploy.outputs.url }}';
            const body = `## Preview Deployment\n\nURL: ${url}\nCommit: \`${context.sha.slice(0, 7)}\``;

            const { data: comments } = await github.rest.issues.listComments({
              ...context.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.find(c =>
              c.body?.includes('Preview Deployment') && c.user?.login === 'github-actions[bot]'
            );

            if (existing) {
              await github.rest.issues.updateComment({
                ...context.repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                ...context.repo,
                issue_number: context.issue.number,
                body,
              });
            }
```

### 2.3 AI 워크플로우 최적화 분석

```typescript
// workflow-optimizer.ts
interface WorkflowAnalysis {
  currentDuration: number;
  optimizedDuration: number;
  savings: OptimizationSaving[];
  securityIssues: SecurityIssue[];
  updatedWorkflow: string;
}

async function analyzeAndOptimizeWorkflow(
  workflowYaml: string,
  runHistory: WorkflowRunRecord[],
): Promise<WorkflowAnalysis> {
  const avgDurations = calculateStepDurations(runHistory);

  const prompt = `
이 GitHub Actions 워크플로우를 분석하고 최적화하라.

## 워크플로우
\`\`\`yaml
${workflowYaml}
\`\`\`

## 각 스텝 평균 소요 시간
${avgDurations.map((s) => `- ${s.name}: ${s.avgSeconds}초`).join('\n')}

## 최적화 관점
1. 불필요한 직렬 실행을 병렬화
2. 캐시 미스율이 높은 캐시 키 개선
3. 무거운 액션을 경량 대안으로 교체
4. 조건부 스텝 실행 (변경 파일 기반)
5. runner 사이즈 최적화 (ubuntu-latest vs larger runners)
6. 보안 문제: 과도한 permissions, pinning 안 된 action, 시크릿 노출

최적화된 YAML과 각 개선 항목별 예상 절감 시간을 반환하라.
`.trim();

  return await callAI<WorkflowAnalysis>(prompt);
}
```

---

## 3. AI 기반 보안 취약점 자동 스캔 및 수정 제안

> CI 파이프라인에 AI 보안 스캔을 통합하면, 코드 변경 시점에 취약점을 탐지하고 즉각적인 수정 코드를 제안받을 수 있다.

### 3.1 AI 보안 스캐너 통합

```typescript
// ai-security-scanner.ts
interface SecurityScanResult {
  vulnerabilities: Vulnerability[];
  fixes: AutoFix[];
  riskScore: number;
  summary: string;
}

interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'xss' | 'injection' | 'auth-bypass' | 'ssrf' | 'dependency' | 'secret-leak';
  file: string;
  line: number;
  description: string;
  cweId: string;
}

interface AutoFix {
  vulnerabilityId: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  confidence: number;
}

async function scanWithAI(
  changedFiles: ChangedFile[],
  projectContext: ProjectContext,
): Promise<SecurityScanResult> {
  const prompt = `
보안 관점에서 다음 코드 변경을 분석하라.

## 변경 파일
${changedFiles.map((f) => `### ${f.path}\n\`\`\`diff\n${f.diff}\n\`\`\``).join('\n\n')}

## 프로젝트 컨텍스트
- 프레임워크: ${projectContext.framework}
- 인증 방식: ${projectContext.authMethod}
- 외부 API 통신: ${projectContext.externalApis.join(', ')}

## 점검 항목
1. XSS: dangerouslySetInnerHTML, URL 파라미터 미검증
2. SSRF: 사용자 입력 URL로 서버 요청
3. 인증 우회: 권한 체크 누락, JWT 검증 미흡
4. 시크릿 노출: 하드코딩된 키, 토큰
5. 의존성: 알려진 CVE가 있는 패키지
6. Prototype Pollution, ReDoS

각 취약점에 대해 수정 코드도 함께 제공하라.
`.trim();

  return await callAI<SecurityScanResult>(prompt);
}
```

### 3.2 CI 파이프라인 보안 스캔 워크플로우

```yaml
# .github/workflows/security-scan.yml
name: AI Security Scan

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write
  security-events: write

jobs:
  ai-security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get changed files
        id: changed
        run: |
          FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx')
          echo "files<<EOF" >> $GITHUB_OUTPUT
          echo "$FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: AI Security Analysis
        id: scan
        run: |
          npx ai-security-scanner \
            --files "${{ steps.changed.outputs.files }}" \
            --format sarif \
            --output results.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif

      - name: Comment PR with findings
        if: steps.scan.outputs.has-findings == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const sarif = JSON.parse(fs.readFileSync('results.sarif', 'utf8'));
            const findings = sarif.runs[0].results;
            const critical = findings.filter(f => f.properties?.severity === 'critical');

            let body = '## AI Security Scan Results\n\n';
            body += `Found **${findings.length}** issues (${critical.length} critical)\n\n`;
            findings.forEach(f => {
              body += `- **[${f.properties?.severity}]** ${f.message.text} (${f.locations[0]?.physicalLocation?.artifactLocation?.uri})\n`;
            });

            await github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body,
            });
```

---

## 4. 멀티 배포 CI/CD 파이프라인

> "Build Once, Deploy Everywhere" - 단일 빌드 아티팩트를 환경별 런타임 설정만 교체하여 배포한다.

### 4.1 전체 파이프라인 아키텍처

```
PR 생성       ->  Preview Deploy (per PR)
                    |
main 머지     ->  Build (단일)
                    |
              +-----+-----+----------+
              v     v     v          v
            dev  staging canary  production
              |     |      |         |
              |     |      v         |
              |     |   헬스체크     |
              |     |   10분 대기    |
              |     |      v         |
              |     |   검증 통과?   |
              |     |      v         |
              |     |   자동 프로모션 ->
```

### 4.2 Matrix Strategy 배포

```yaml
# .github/workflows/deploy-matrix.yml
name: Build & Multi-Environment Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      target-envs:
        description: '배포 대상 환경'
        type: choice
        options:
          - dev-only
          - dev-staging
          - all
        default: 'all'

permissions:
  id-token: write
  contents: read

env:
  NODE_VERSION: '22'

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact-id: ${{ steps.upload.outputs.artifact-id }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Upload build artifact
        id: upload
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
          retention-days: 1

  deploy:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        environment: [dev, staging, production]
        exclude:
          - environment: ${{ github.event.inputs.target-envs == 'dev-only' && 'staging' || 'none' }}
          - environment: ${{ github.event.inputs.target-envs == 'dev-only' && 'production' || 'none' }}
          - environment: ${{ github.event.inputs.target-envs == 'dev-staging' && 'production' || 'none' }}
    environment:
      name: ${{ matrix.environment }}
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/

      - name: Inject runtime config
        run: |
          cat > dist/config.js << 'SCRIPT'
          window.__RUNTIME_CONFIG__ = {
            API_URL: "${{ vars.API_URL }}",
            ENV: "${{ matrix.environment }}",
            FEATURE_FLAGS_ENDPOINT: "${{ vars.FF_ENDPOINT }}",
          };
          SCRIPT

      - name: Deploy to ${{ matrix.environment }}
        run: |
          aws s3 sync dist/ s3://${{ vars.S3_BUCKET }}/ \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html" \
            --exclude "config.js"

          aws s3 cp dist/index.html s3://${{ vars.S3_BUCKET }}/index.html \
            --cache-control "no-cache, no-store, must-revalidate"

          aws s3 cp dist/config.js s3://${{ vars.S3_BUCKET }}/config.js \
            --cache-control "no-cache, no-store, must-revalidate"

          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CF_DISTRIBUTION_ID }} \
            --paths "/index.html" "/config.js"
```

### 4.3 모노레포 선별 빌드

```yaml
# .github/workflows/monorepo-selective.yml
name: Monorepo Selective Build & Deploy

on:
  push:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'packages/web/**'
              - 'packages/shared/**'
            admin:
              - 'packages/admin/**'
              - 'packages/shared/**'
            docs:
              - 'packages/docs/**'

  build-deploy:
    needs: detect-changes
    if: needs.detect-changes.outputs.packages != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJson(needs.detect-changes.outputs.packages) }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter ${{ matrix.package }} build
      - run: pnpm --filter ${{ matrix.package }} deploy:${{ github.ref_name }}
```

### 4.4 Preview Deployments

```yaml
# .github/workflows/preview.yml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  deploy-preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    environment:
      name: preview
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Deploy Preview
        id: deploy
        run: |
          PREVIEW_URL=$(npx wrangler pages deploy dist \
            --project-name=my-app \
            --branch=pr-${{ github.event.pull_request.number }} \
            2>&1 | grep -oP 'https://[^\s]+')
          echo "url=$PREVIEW_URL" >> $GITHUB_OUTPUT

  cleanup-preview:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Delete preview deployment
        run: |
          npx wrangler pages deployment delete \
            --project-name=my-app \
            --branch=pr-${{ github.event.pull_request.number }}
```

---

## 5. 보안 파이프라인 (SAST/DAST/SCA, SBOM)

### 5.1 통합 보안 스캔 워크플로우

```yaml
# .github/workflows/security-pipeline.yml
name: Security Pipeline

on:
  pull_request:
  schedule:
    - cron: '0 6 * * 1' # 매주 월요일

permissions:
  contents: read
  security-events: write

jobs:
  # SAST - 정적 분석
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: CodeQL Analysis
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-and-quality

      - uses: github/codeql-action/analyze@v3

      - name: Semgrep SAST
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/typescript
            p/react
            p/nextjs
            p/owasp-top-ten

  # SCA - 의존성 취약점
  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Dependency Review (PR only)
        if: github.event_name == 'pull_request'
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          deny-licenses: GPL-3.0, AGPL-3.0

      - name: Trivy Vulnerability Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif

  # SBOM 생성
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          format: spdx-json
          output-file: sbom.spdx.json

      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json

  # DAST - 동적 분석 (Preview 배포 대상)
  dast:
    needs: [sast, sca]
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: ${{ needs.deploy-preview.outputs.url || 'https://staging.example.com' }}
          rules_file_name: '.zap/rules.tsv'
```

### 5.2 시크릿 스캔

```yaml
  # Secret Detection
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Gitleaks Secret Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: TruffleHog Deep Scan
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

---

## 6. CI 메트릭스 -- DORA 4 Key Metrics

> DORA(DevOps Research and Assessment) 4 Key Metrics는 소프트웨어 딜리버리 성과를 측정하는 업계 표준이다.

### 6.1 DORA 메트릭스 수집기

```typescript
// dora-metrics-collector.ts
interface DORAMetrics {
  deploymentFrequency: {
    deploysPerDay: number;
    trend: 'improving' | 'stable' | 'declining';
    rating: 'elite' | 'high' | 'medium' | 'low';
  };
  leadTimeForChanges: {
    medianMinutes: number;
    p95Minutes: number;
    rating: 'elite' | 'high' | 'medium' | 'low';
  };
  changeFailureRate: {
    percentage: number;
    totalDeploys: number;
    failedDeploys: number;
    rating: 'elite' | 'high' | 'medium' | 'low';
  };
  timeToRestore: {
    medianMinutes: number;
    p95Minutes: number;
    rating: 'elite' | 'high' | 'medium' | 'low';
  };
}

function rateDORAMetric(
  metric: keyof DORAMetrics,
  value: number,
): 'elite' | 'high' | 'medium' | 'low' {
  const thresholds: Record<string, Record<string, number>> = {
    deploymentFrequency: { elite: 1, high: 0.14, medium: 0.033 }, // per day
    leadTimeForChanges: { elite: 60, high: 1440, medium: 10080 }, // minutes
    changeFailureRate: { elite: 5, high: 10, medium: 15 }, // percentage
    timeToRestore: { elite: 60, high: 1440, medium: 10080 }, // minutes
  };

  const t = thresholds[metric];
  if (metric === 'deploymentFrequency') {
    if (value >= t.elite) return 'elite';
    if (value >= t.high) return 'high';
    if (value >= t.medium) return 'medium';
    return 'low';
  }

  // Lower is better for other metrics
  if (value <= t.elite) return 'elite';
  if (value <= t.high) return 'high';
  if (value <= t.medium) return 'medium';
  return 'low';
}

async function collectDORAMetrics(
  days: number = 30,
): Promise<DORAMetrics> {
  const deploys = await getDeployments(days);
  const incidents = await getIncidents(days);
  const prs = await getMergedPRs(days);

  const deploysPerDay = deploys.length / days;

  const leadTimes = prs.map(
    (pr) =>
      (pr.deployedAt.getTime() - pr.firstCommitAt.getTime()) / 60000,
  );
  const medianLeadTime = median(leadTimes);

  const failedDeploys = deploys.filter((d) => d.causedIncident).length;
  const cfr = (failedDeploys / deploys.length) * 100;

  const restoreTimes = incidents.map(
    (i) => (i.resolvedAt.getTime() - i.startedAt.getTime()) / 60000,
  );
  const medianRestore = median(restoreTimes);

  return {
    deploymentFrequency: {
      deploysPerDay,
      trend: calculateTrend(deploys),
      rating: rateDORAMetric('deploymentFrequency', deploysPerDay),
    },
    leadTimeForChanges: {
      medianMinutes: medianLeadTime,
      p95Minutes: percentile(leadTimes, 95),
      rating: rateDORAMetric('leadTimeForChanges', medianLeadTime),
    },
    changeFailureRate: {
      percentage: cfr,
      totalDeploys: deploys.length,
      failedDeploys,
      rating: rateDORAMetric('changeFailureRate', cfr),
    },
    timeToRestore: {
      medianMinutes: medianRestore,
      p95Minutes: percentile(restoreTimes, 95),
      rating: rateDORAMetric('timeToRestore', medianRestore),
    },
  };
}
```

### 6.2 DORA 대시보드 워크플로우

```yaml
# .github/workflows/dora-metrics.yml
name: DORA Metrics Collection

on:
  schedule:
    - cron: '0 9 * * 1' # 매주 월요일
  workflow_dispatch:

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Collect DORA Metrics
        id: metrics
        run: |
          npx ts-node scripts/dora-metrics-collector.ts \
            --days 30 \
            --output metrics.json

      - name: Post to Slack
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "DORA Metrics Report (Last 30 Days)",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Frequency:* ${{ steps.metrics.outputs.deploy-freq }}/day (${{ steps.metrics.outputs.deploy-rating }})\n*Lead Time:* ${{ steps.metrics.outputs.lead-time }}min (${{ steps.metrics.outputs.lead-rating }})\n*Change Failure Rate:* ${{ steps.metrics.outputs.cfr }}% (${{ steps.metrics.outputs.cfr-rating }})\n*Time to Restore:* ${{ steps.metrics.outputs.mttr }}min (${{ steps.metrics.outputs.mttr-rating }})"
                  }
                }
              ]
            }

      - name: Update GitHub Wiki
        run: |
          git clone https://github.com/${{ github.repository }}.wiki.git wiki
          cp metrics.json wiki/dora-metrics-latest.json
          cd wiki && git add . && git commit -m "Update DORA metrics" && git push
```

### 6.3 DORA 기준표

| 메트릭 | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deployment Frequency | 일 1회 이상 | 주 1회~일 1회 | 월 1회~주 1회 | 월 1회 미만 |
| Lead Time for Changes | < 1시간 | < 1일 | < 1주 | > 1주 |
| Change Failure Rate | < 5% | < 10% | < 15% | > 15% |
| Time to Restore | < 1시간 | < 1일 | < 1주 | > 1주 |

---

## 7. 체크리스트

### AI 활용
- [ ] AI 테스트 선별 실행으로 CI 시간 50% 이상 단축
- [ ] AI 플레이키 테스트 자동 탐지 및 격리 체계 구축
- [ ] AI 빌드 캐시 최적화 적용 (캐시 히트율 90% 이상)
- [ ] AI 보안 스캔 PR 파이프라인 통합

### 워크플로우
- [ ] Build Once, Deploy Everywhere 원칙 준수
- [ ] Preview Deploy가 모든 PR에 자동 생성
- [ ] concurrency 설정으로 중복 실행 방지
- [ ] 모노레포 선별 빌드 적용 (변경된 패키지만 빌드)

### 보안
- [ ] SAST(CodeQL + Semgrep) 적용
- [ ] SCA(Trivy + dependency-review) 적용
- [ ] Secret 스캔(Gitleaks) 적용
- [ ] SBOM 자동 생성 및 아카이브
- [ ] OIDC 기반 클라우드 인증 (장기 시크릿 제거)

### 메트릭스
- [ ] DORA 4 Key Metrics 자동 수집
- [ ] 주간 DORA 리포트 Slack 알림
- [ ] Deployment Frequency: High 이상 유지
- [ ] Lead Time for Changes: High 이상 유지
- [ ] Change Failure Rate: 10% 미만 유지
