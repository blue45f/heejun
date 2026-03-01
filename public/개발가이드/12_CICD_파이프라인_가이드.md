# CI/CD 파이프라인 가이드 (2026) -- AI 활용 + 멀티 베타 환경

## 목차
1. [AI 기반 CI 최적화](#1-ai-기반-ci-최적화)
2. [AI로 GitHub Actions 워크플로우 자동 생성 및 최적화](#2-ai로-github-actions-워크플로우-자동-생성-및-최적화)
3. [AI 기반 보안 취약점 자동 스캔 및 수정 제안](#3-ai-기반-보안-취약점-자동-스캔-및-수정-제안)
4. [멀티 베타 CI/CD 파이프라인](#4-멀티-베타-cicd-파이프라인)
5. [PR별 Preview 자동 생성 (S3+CloudFront)](#5-pr별-preview-자동-생성-s3cloudfront)
6. [모노레포 앱별 선별 빌드/배포](#6-모노레포-앱별-선별-빌드배포)
7. [멀티 CDN 동시 배포](#7-멀티-cdn-동시-배포)
8. [보안 파이프라인 (SAST/DAST/SCA, SBOM)](#8-보안-파이프라인-sastdastsca-sbom)
9. [CI 메트릭스 -- DORA 4 Key Metrics](#9-ci-메트릭스--dora-4-key-metrics)
10. [AI 프롬프트 모음](#10-ai-프롬프트-모음)
11. [체크리스트](#11-체크리스트)

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
  estimatedSavings: number;
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
4. 멀티 베타 환경별 캐시 키 분리 전략

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
  flakyScore: number;
  pattern: 'timing' | 'ordering' | 'resource' | 'environment' | 'unknown';
  suggestedFix: string;
  recentResults: { passed: number; failed: number; total: number };
}

async function detectFlakyTests(
  testHistory: TestRunRecord[],
): Promise<FlakyTestReport[]> {
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
  multiBeta: MultiBetaConfig;
}

type WorkflowFeature =
  | 'preview-deploy'
  | 'matrix-deploy'
  | 'canary-release'
  | 'security-scan'
  | 'performance-audit'
  | 'auto-merge-dependabot'
  | 'multi-cdn'
  | 'monorepo-affected';

interface DeployTarget {
  environment: string;
  provider: 'aws-s3' | 'cloudflare-pages' | 'vercel' | 'netlify' | 'fastly';
  autoPromote: boolean;
}

interface MultiBetaConfig {
  maxEnvironments: number;
  previewPerPR: boolean;
  autoCleanupDays: number;
  cdnProviders: string[];
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

## 멀티 베타 요구사항
- 최대 동시 환경 수: ${requirements.multiBeta.maxEnvironments}
- PR별 Preview: ${requirements.multiBeta.previewPerPR}
- 자동 정리 주기: ${requirements.multiBeta.autoCleanupDays}일
- CDN 프로바이더: ${requirements.multiBeta.cdnProviders.join(', ')}

## 프로젝트 구조
${projectStructure}

## 요구사항
1. Build Once, Deploy Everywhere 원칙 준수
2. 멀티 베타 환경 매트릭스 배포 지원
3. 보안: OIDC 기반 인증, 시크릿 최소 노출
4. 병렬화: 독립 작업은 최대 병렬 실행
5. 실패 시 Slack 알림 포함
6. concurrency 설정으로 중복 실행 방지
7. 멀티 CDN 동시 배포 (CloudFront + Cloudflare + Fastly)

YAML 형식으로 워크플로우를 반환하라.
`.trim();

  return await callAI<string>(prompt);
}
```

### 2.2 AI 워크플로우 최적화 분석

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
7. 멀티 베타 환경 매트릭스 최적화 (불필요한 환경 제외)

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

## 4. 멀티 베타 CI/CD 파이프라인

> "Build Once, Deploy to N Environments" -- 단일 빌드 아티팩트를 N개 베타 환경에 동시 배포한다. GitHub Actions matrix를 활용하여 환경별 런타임 설정만 교체한다.

### 4.1 전체 파이프라인 아키텍처

```
PR 생성       ->  Preview Deploy (per PR, S3+CloudFront 자동 프로비저닝)
                    |
main 머지     ->  Build (단일)
                    |
              +-----+-----+----------+----------+
              v     v     v          v          v
            dev  beta-1 beta-2 ... beta-N   production
              |     |      |                    |
              |     +------+                    |
              |     멀티 베타 매트릭스           |
              |     헬스체크 + AI 검증           |
              |            |                    |
              |     검증 통과?                   |
              |            v                    |
              |     자동 프로모션 ------------->
```

### 4.2 N개 환경 동시 배포 매트릭스

```yaml
# .github/workflows/multi-beta-deploy.yml
name: Build & Multi-Beta Deploy

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
          - dev-and-betas
          - all
        default: 'all'
      beta-count:
        description: '베타 환경 수'
        type: number
        default: 3

permissions:
  id-token: write
  contents: read

env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9'

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact-id: ${{ steps.upload.outputs.artifact-id }}
      build-hash: ${{ steps.hash.outputs.hash }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Compute build hash
        id: hash
        run: echo "hash=$(find dist -type f -exec sha256sum {} \; | sha256sum | cut -d' ' -f1)" >> $GITHUB_OUTPUT

      - name: Upload build artifact
        id: upload
        uses: actions/upload-artifact@v4
        with:
          name: build-output-${{ github.sha }}
          path: dist/
          retention-days: 3

  # 매트릭스 기반 N개 환경 동시 배포
  deploy:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      max-parallel: 5
      matrix:
        environment:
          - dev
          - beta-1
          - beta-2
          - beta-3
          - staging
          - production
        exclude:
          - environment: ${{ github.event.inputs.target-envs == 'dev-only' && 'beta-1' || 'none' }}
          - environment: ${{ github.event.inputs.target-envs == 'dev-only' && 'beta-2' || 'none' }}
          - environment: ${{ github.event.inputs.target-envs == 'dev-only' && 'beta-3' || 'none' }}
          - environment: ${{ github.event.inputs.target-envs == 'dev-only' && 'staging' || 'none' }}
          - environment: ${{ github.event.inputs.target-envs == 'dev-only' && 'production' || 'none' }}
    environment:
      name: ${{ matrix.environment }}
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output-${{ github.sha }}
          path: dist/

      - name: Configure AWS Credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ap-northeast-2

      - name: Inject runtime config
        run: |
          cat > dist/config.js << SCRIPT
          window.__RUNTIME_CONFIG__ = {
            API_URL: "${{ vars.API_URL }}",
            ENV: "${{ matrix.environment }}",
            BUILD_HASH: "${{ needs.build.outputs.build-hash }}",
            FEATURE_FLAGS_ENDPOINT: "${{ vars.FF_ENDPOINT }}",
            CDN_PROVIDER: "${{ vars.CDN_PROVIDER }}",
          };
          SCRIPT

      - name: Deploy to ${{ matrix.environment }}
        id: deploy
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

          echo "url=https://${{ vars.DOMAIN }}" >> $GITHUB_OUTPUT

      - name: AI Health Check
        run: |
          npx ai-health-checker \
            --url "https://${{ vars.DOMAIN }}" \
            --checks "status,performance,console-errors,visual-regression" \
            --threshold 0.95

  # 매트릭스 배포 결과 집계
  deploy-summary:
    needs: deploy
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Summarize deployment results
        uses: actions/github-script@v7
        with:
          script: |
            const jobs = ${{ toJSON(needs.deploy) }};
            let body = '## Multi-Beta Deployment Summary\n\n';
            body += `| Environment | Status |\n|---|---|\n`;
            // 매트릭스 결과를 집계하여 PR/커밋에 코멘트
            body += `| Overall | ${jobs.result} |\n`;
            console.log(body);
```

### 4.3 동적 매트릭스 생성 (N개 환경 자동 구성)

```typescript
// scripts/generate-deploy-matrix.ts
interface BetaEnvironment {
  name: string;
  s3Bucket: string;
  cfDistributionId: string;
  domain: string;
  apiUrl: string;
  featureFlags: Record<string, boolean>;
}

async function generateDeployMatrix(
  betaCount: number,
  projectName: string,
): Promise<BetaEnvironment[]> {
  const environments: BetaEnvironment[] = [];

  for (let i = 1; i <= betaCount; i++) {
    environments.push({
      name: `beta-${i}`,
      s3Bucket: `${projectName}-beta-${i}`,
      cfDistributionId: `CF_DIST_BETA_${i}`,
      domain: `beta-${i}.${projectName}.example.com`,
      apiUrl: `https://api-beta-${i}.${projectName}.example.com`,
      featureFlags: {},
    });
  }

  return environments;
}

// GitHub Actions에서 동적 매트릭스로 사용
async function outputMatrix(): Promise<void> {
  const envs = await generateDeployMatrix(
    parseInt(process.env.BETA_COUNT ?? '3'),
    process.env.PROJECT_NAME ?? 'app',
  );

  // GitHub Actions output으로 매트릭스 전달
  const matrix = { include: envs.map((e) => ({ environment: e.name, ...e })) };
  console.log(`matrix=${JSON.stringify(matrix)}`);
}
```

```yaml
# 동적 매트릭스 워크플로우
jobs:
  generate-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - name: Generate dynamic matrix
        id: matrix
        run: |
          MATRIX=$(npx tsx scripts/generate-deploy-matrix.ts)
          echo "matrix=$MATRIX" >> $GITHUB_OUTPUT
        env:
          BETA_COUNT: ${{ github.event.inputs.beta-count || '3' }}
          PROJECT_NAME: my-app

  deploy:
    needs: [build, generate-matrix]
    strategy:
      matrix: ${{ fromJson(needs.generate-matrix.outputs.matrix) }}
    # ... 배포 스텝
```

---

## 5. PR별 Preview 자동 생성 (S3+CloudFront)

> PR이 열릴 때마다 독립된 S3 버킷 경로 + CloudFront Behavior를 동적으로 생성하고, PR 코멘트에 Preview URL을 자동으로 게시한다.

### 5.1 S3+CloudFront 동적 프로비저닝 Preview

```yaml
# .github/workflows/pr-preview-s3-cf.yml
name: PR Preview (S3 + CloudFront)

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

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
  PREVIEW_BUCKET: my-app-previews
  CF_DISTRIBUTION_ID: ${{ vars.PREVIEW_CF_DISTRIBUTION_ID }}

jobs:
  deploy-preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    environment:
      name: preview
      url: ${{ steps.deploy.outputs.preview_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          NEXT_PUBLIC_BASE_PATH: /pr-${{ github.event.pull_request.number }}

      - name: Configure AWS Credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_PREVIEW_ROLE_ARN }}
          aws-region: ap-northeast-2

      - name: Deploy to S3 (PR prefix)
        id: deploy
        run: |
          PR_NUM=${{ github.event.pull_request.number }}
          PREFIX="pr-${PR_NUM}"

          # PR별 S3 경로에 업로드
          aws s3 sync dist/ "s3://${PREVIEW_BUCKET}/${PREFIX}/" \
            --delete \
            --cache-control "public, max-age=300"

          # CloudFront 캐시 무효화
          aws cloudfront create-invalidation \
            --distribution-id "${CF_DISTRIBUTION_ID}" \
            --paths "/${PREFIX}/*"

          PREVIEW_URL="https://preview.example.com/${PREFIX}/"
          echo "preview_url=${PREVIEW_URL}" >> $GITHUB_OUTPUT

      - name: Comment PR with Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.issue.number;
            const url = '${{ steps.deploy.outputs.preview_url }}';
            const sha = context.sha.slice(0, 7);
            const body = [
              '## Preview Deployment',
              '',
              `| Item | Value |`,
              `|------|-------|`,
              `| URL | [${url}](${url}) |`,
              `| Commit | \`${sha}\` |`,
              `| Status | Deployed |`,
              '',
              '_Preview는 PR이 닫히면 자동으로 정리됩니다._',
            ].join('\n');

            const { data: comments } = await github.rest.issues.listComments({
              ...context.repo,
              issue_number: prNumber,
            });
            const existing = comments.find(c =>
              c.body?.includes('Preview Deployment') &&
              c.user?.login === 'github-actions[bot]'
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
                issue_number: prNumber,
                body,
              });
            }

  cleanup-preview:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS Credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_PREVIEW_ROLE_ARN }}
          aws-region: ap-northeast-2

      - name: Delete preview from S3
        run: |
          PR_NUM=${{ github.event.pull_request.number }}
          aws s3 rm "s3://${PREVIEW_BUCKET}/pr-${PR_NUM}/" --recursive

          aws cloudfront create-invalidation \
            --distribution-id "${CF_DISTRIBUTION_ID}" \
            --paths "/pr-${PR_NUM}/*"

      - name: Comment PR cleanup
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body: '## Preview Deployment\n\nPreview 환경이 정리되었습니다.',
            });
```

### 5.2 CloudFront Behavior 동적 생성 (CDK)

```typescript
// infra/preview-cloudfront.ts
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface PreviewCloudfrontProps extends cdk.StackProps {
  previewBucket: s3.IBucket;
  maxPreviews: number;
}

export class PreviewCloudfrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PreviewCloudfrontProps) {
    super(scope, id, props);

    // PR 경로를 라우팅하는 CloudFront Function
    const routerFunction = new cloudfront.Function(this, 'PreviewRouter', {
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          var uri = request.uri;

          // /pr-{number}/ 패턴 매칭
          var match = uri.match(/^\\/pr-(\\d+)(\\/.*)?$/);
          if (match) {
            var prNum = match[1];
            var path = match[2] || '/index.html';
            if (path === '/' || !path.includes('.')) {
              path = '/index.html';
            }
            request.uri = '/pr-' + prNum + path;
          }
          return request;
        }
      `),
    });

    // 단일 Distribution으로 N개 Preview 서빙
    new cloudfront.Distribution(this, 'PreviewDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(props.previewBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: new cloudfront.CachePolicy(this, 'PreviewCachePolicy', {
          defaultTtl: cdk.Duration.minutes(5),
          maxTtl: cdk.Duration.hours(1),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
        }),
        functionAssociations: [{
          function: routerFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      defaultRootObject: 'index.html',
      errorResponses: [{
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.minutes(1),
      }],
    });
  }
}
```

---

## 6. 모노레포 앱별 선별 빌드/배포

> 모노레포에서 변경된 패키지(affected)만 감지하여 빌드/배포한다. 공유 패키지 변경 시 의존하는 모든 앱을 자동으로 빌드한다.

### 6.1 Affected 감지 + 선별 빌드

```yaml
# .github/workflows/monorepo-affected.yml
name: Monorepo Affected Build & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9'

jobs:
  detect-affected:
    runs-on: ubuntu-latest
    outputs:
      affected-apps: ${{ steps.affected.outputs.apps }}
      affected-count: ${{ steps.affected.outputs.count }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Detect affected packages
        id: affected
        run: |
          # Turborepo dry-run으로 affected 패키지 감지
          AFFECTED=$(pnpm turbo build --dry-run=json --filter='...[origin/main]' \
            | jq -r '[.packages[] | select(. != "//") ] | unique')

          echo "apps=${AFFECTED}" >> $GITHUB_OUTPUT
          echo "count=$(echo $AFFECTED | jq length)" >> $GITHUB_OUTPUT
          echo "Affected packages: ${AFFECTED}"

      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'apps/web/**'
              - 'packages/shared/**'
              - 'packages/ui/**'
            admin:
              - 'apps/admin/**'
              - 'packages/shared/**'
            docs:
              - 'apps/docs/**'
            storybook:
              - 'packages/ui/**'

  build-deploy:
    needs: detect-affected
    if: needs.detect-affected.outputs.affected-count != '0'
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        app: ${{ fromJson(needs.detect-affected.outputs.affected-apps) }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build affected app
        run: pnpm turbo build --filter=${{ matrix.app }}

      - name: Deploy ${{ matrix.app }}
        if: github.ref == 'refs/heads/main'
        run: |
          # 앱별 배포 타겟 매핑
          case "${{ matrix.app }}" in
            web)    BUCKET="${{ vars.WEB_S3_BUCKET }}" ;;
            admin)  BUCKET="${{ vars.ADMIN_S3_BUCKET }}" ;;
            docs)   BUCKET="${{ vars.DOCS_S3_BUCKET }}" ;;
          esac

          aws s3 sync "apps/${{ matrix.app }}/dist/" "s3://${BUCKET}/" --delete
```

### 6.2 Affected 감지 유틸리티

```typescript
// scripts/detect-affected.ts
interface PackageInfo {
  name: string;
  path: string;
  dependencies: string[];
  deployConfig: {
    s3Bucket: string;
    cfDistributionId: string;
    environments: string[];
  };
}

interface AffectedResult {
  directlyChanged: string[];
  transitivelyAffected: string[];
  allAffected: string[];
  deployMatrix: Array<{ app: string; environment: string }>;
}

function detectAffected(
  changedFiles: string[],
  packages: PackageInfo[],
): AffectedResult {
  const directlyChanged: Set<string> = new Set();
  const transitivelyAffected: Set<string> = new Set();

  // 1. 직접 변경된 패키지 감지
  for (const file of changedFiles) {
    for (const pkg of packages) {
      if (file.startsWith(pkg.path)) {
        directlyChanged.add(pkg.name);
      }
    }
  }

  // 2. 의존성 그래프를 따라 전이적으로 영향받는 패키지 감지
  const dependencyGraph = buildReverseDependencyGraph(packages);
  const queue = [...directlyChanged];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = dependencyGraph.get(current) ?? [];
    for (const dep of dependents) {
      if (!directlyChanged.has(dep) && !transitivelyAffected.has(dep)) {
        transitivelyAffected.add(dep);
        queue.push(dep);
      }
    }
  }

  const allAffected = [...directlyChanged, ...transitivelyAffected];

  // 3. 배포 매트릭스 생성 (앱 x 환경)
  const deployMatrix = allAffected.flatMap((app) => {
    const pkg = packages.find((p) => p.name === app);
    return (pkg?.deployConfig.environments ?? []).map((env) => ({
      app,
      environment: env,
    }));
  });

  return {
    directlyChanged: [...directlyChanged],
    transitivelyAffected: [...transitivelyAffected],
    allAffected,
    deployMatrix,
  };
}

function buildReverseDependencyGraph(
  packages: PackageInfo[],
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const pkg of packages) {
    for (const dep of pkg.dependencies) {
      const existing = graph.get(dep) ?? [];
      existing.push(pkg.name);
      graph.set(dep, existing);
    }
  }
  return graph;
}
```

---

## 7. 멀티 CDN 동시 배포

> CloudFront, Cloudflare, Fastly에 동시 배포하여 가용성을 극대화하고, DNS 기반 Failover로 장애 시 자동 전환한다.

### 7.1 멀티 CDN 동시 배포 워크플로우

```yaml
# .github/workflows/multi-cdn-deploy.yml
name: Multi-CDN Simultaneous Deploy

on:
  workflow_call:
    inputs:
      build-artifact:
        required: true
        type: string
      environment:
        required: true
        type: string

jobs:
  deploy-all-cdns:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        cdn:
          - name: cloudfront
            provider: aws
          - name: cloudflare
            provider: cloudflare
          - name: fastly
            provider: fastly
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: ${{ inputs.build-artifact }}
          path: dist/

      # CloudFront 배포
      - name: Deploy to CloudFront
        if: matrix.cdn.name == 'cloudfront'
        run: |
          aws s3 sync dist/ s3://${{ vars.CF_S3_BUCKET }}/ --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CF_DISTRIBUTION_ID }} \
            --paths "/*"

      # Cloudflare Pages 배포
      - name: Deploy to Cloudflare
        if: matrix.cdn.name == 'cloudflare'
        run: |
          npx wrangler pages deploy dist/ \
            --project-name=${{ vars.CLOUDFLARE_PROJECT }} \
            --branch=${{ inputs.environment }}

      # Fastly 배포
      - name: Deploy to Fastly
        if: matrix.cdn.name == 'fastly'
        run: |
          # Fastly Compute@Edge 또는 S3 Origin 배포
          aws s3 sync dist/ s3://${{ vars.FASTLY_ORIGIN_BUCKET }}/ --delete
          curl -X POST "https://api.fastly.com/service/${{ vars.FASTLY_SERVICE_ID }}/purge_all" \
            -H "Fastly-Key: ${{ secrets.FASTLY_API_TOKEN }}"

      - name: Health Check
        run: |
          case "${{ matrix.cdn.name }}" in
            cloudfront)  URL="${{ vars.CLOUDFRONT_URL }}" ;;
            cloudflare)  URL="${{ vars.CLOUDFLARE_URL }}" ;;
            fastly)      URL="${{ vars.FASTLY_URL }}" ;;
          esac

          for i in {1..5}; do
            STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$URL")
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed for ${{ matrix.cdn.name }}"
              exit 0
            fi
            sleep 5
          done
          echo "Health check failed for ${{ matrix.cdn.name }}"
          exit 1
```

### 7.2 멀티 CDN 오케스트레이터

```typescript
// multi-cdn-orchestrator.ts
interface CDNProvider {
  name: string;
  endpoint: string;
  healthCheckUrl: string;
  weight: number;
  priority: number;
  region: string;
}

interface MultiCDNConfig {
  providers: CDNProvider[];
  failoverStrategy: 'active-passive' | 'active-active' | 'latency-based';
  healthCheck: {
    intervalSeconds: number;
    thresholdCount: number;
    timeoutSeconds: number;
  };
  syncValidation: {
    enabled: boolean;
    checksumVerification: boolean;
    contentSampling: boolean;
  };
}

const multiCDNConfig: MultiCDNConfig = {
  providers: [
    {
      name: 'cloudfront',
      endpoint: 'dxxx.cloudfront.net',
      healthCheckUrl: 'https://dxxx.cloudfront.net/health',
      weight: 60,
      priority: 1,
      region: 'global',
    },
    {
      name: 'cloudflare',
      endpoint: 'app.pages.dev',
      healthCheckUrl: 'https://app.pages.dev/health',
      weight: 30,
      priority: 2,
      region: 'global',
    },
    {
      name: 'fastly',
      endpoint: 'app.global.ssl.fastly.net',
      healthCheckUrl: 'https://app.global.ssl.fastly.net/health',
      weight: 10,
      priority: 3,
      region: 'global',
    },
  ],
  failoverStrategy: 'active-active',
  healthCheck: {
    intervalSeconds: 30,
    thresholdCount: 3,
    timeoutSeconds: 5,
  },
  syncValidation: {
    enabled: true,
    checksumVerification: true,
    contentSampling: true,
  },
};

async function validateMultiCDNSync(
  config: MultiCDNConfig,
  samplePaths: string[],
): Promise<SyncValidationResult> {
  const results: Map<string, Map<string, string>> = new Map();

  for (const path of samplePaths) {
    const checksums = new Map<string, string>();
    for (const provider of config.providers) {
      const response = await fetch(`https://${provider.endpoint}${path}`);
      const body = await response.text();
      checksums.set(provider.name, hashContent(body));
    }
    results.set(path, checksums);
  }

  // 모든 CDN의 콘텐츠가 동일한지 검증
  const outOfSync = [...results.entries()].filter(([, checksums]) => {
    const values = [...checksums.values()];
    return new Set(values).size > 1;
  });

  return {
    inSync: outOfSync.length === 0,
    outOfSyncPaths: outOfSync.map(([path]) => path),
    details: Object.fromEntries(results),
  };
}
```

---

## 8. 보안 파이프라인 (SAST/DAST/SCA, SBOM)

### 8.1 통합 보안 스캔 워크플로우

```yaml
# .github/workflows/security-pipeline.yml
name: Security Pipeline

on:
  pull_request:
  schedule:
    - cron: '0 6 * * 1'

permissions:
  contents: read
  security-events: write

jobs:
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

  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate SBOM (CycloneDX)
        run: |
          npx @cyclonedx/cyclonedx-npm --output-file sbom.json --spec-version 1.5

      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
```

---

## 9. CI 메트릭스 -- DORA 4 Key Metrics

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| **배포 빈도** | main 브랜치 배포 횟수/주 | 일 1회 이상 |
| **변경 리드 타임** | 커밋 -> 프로덕션 배포 소요 시간 | 1시간 이내 |
| **변경 실패율** | 롤백 또는 핫픽스 비율 | 5% 미만 |
| **복구 시간** | 장애 감지 -> 복구 완료 시간 | 30분 이내 |

```typescript
// dora-metrics-collector.ts
interface DORAMetrics {
  deploymentFrequency: {
    deploysPerWeek: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  leadTimeForChanges: {
    avgMinutes: number;
    p50Minutes: number;
    p95Minutes: number;
  };
  changeFailureRate: {
    percentage: number;
    rollbackCount: number;
    hotfixCount: number;
  };
  timeToRestore: {
    avgMinutes: number;
    incidentCount: number;
  };
}

async function collectDORAMetrics(
  period: { start: Date; end: Date },
): Promise<DORAMetrics> {
  const deployments = await getDeploymentHistory(period);
  const incidents = await getIncidentHistory(period);
  const commits = await getCommitHistory(period);

  return {
    deploymentFrequency: {
      deploysPerWeek: calculateDeploysPerWeek(deployments, period),
      trend: determineTrend(deployments),
    },
    leadTimeForChanges: {
      avgMinutes: calculateAvgLeadTime(commits, deployments),
      p50Minutes: calculatePercentileLeadTime(commits, deployments, 50),
      p95Minutes: calculatePercentileLeadTime(commits, deployments, 95),
    },
    changeFailureRate: {
      percentage: calculateFailureRate(deployments),
      rollbackCount: deployments.filter((d) => d.rolledBack).length,
      hotfixCount: deployments.filter((d) => d.isHotfix).length,
    },
    timeToRestore: {
      avgMinutes: calculateAvgRestoreTime(incidents),
      incidentCount: incidents.length,
    },
  };
}
```

---

## 10. AI 프롬프트 모음

### 프롬프트 1: CI 파이프라인 병목 분석 + 멀티 베타 최적화

```text
우리 CI 파이프라인의 최근 빌드 로그를 분석하고 멀티 베타 환경 최적화를 제안해줘.

## 현재 상황
- 평균 CI 시간: 18분 (목표: 8분 이내)
- 테스트 단계: 12분 (전체의 67%)
- 빌드 단계: 4분
- 린트/타입체크: 2분
- 멀티 베타 배포: 5개 환경 순차 배포 중

## 요청
1. 테스트 병렬화 전략 (GitHub Actions matrix 활용)
2. 변경 영향 범위 기반 테스트 선별 실행 방안
3. 빌드 캐시 최적화 (node_modules, turbo cache)
4. 멀티 베타 배포 매트릭스 병렬화 전략
5. 각 최적화 적용 시 예상 시간 절감량
```

### 프롬프트 2: 플레이키 테스트 근본 원인 분석

```text
아래 테스트가 간헐적으로 실패한다. 근본 원인을 분석하고 수정 방안을 제안해줘.

## 테스트 정보
- 파일: src/components/DataTable.test.tsx
- 테스트명: "정렬 버튼 클릭 시 데이터가 정렬된다"
- 최근 30일: 성공 47회 / 실패 8회

## 실패 시 에러
- "Unable to find element with text: 가나다순"
- 주로 CI 환경에서 실패, 로컬에서는 재현 어려움
- 멀티 베타 환경 중 beta-2에서만 집중적으로 실패

## 분석 요청
1. 비동기 상태 업데이트 누락 여부
2. waitFor/findByText 사용 필요 여부
3. 환경별 차이 (beta-2 특이 사항) 분석
4. 수정된 테스트 코드 제공
```

### 프롬프트 3: GitHub Actions 매트릭스 전략 최적화

```text
멀티 베타 환경 배포를 위한 GitHub Actions 매트릭스 전략을 최적화해줘.

## 현재 구성
- 5개 베타 환경 (beta-1 ~ beta-5)
- 3개 CDN (CloudFront, Cloudflare, Fastly)
- 모노레포 3개 앱 (web, admin, docs)
- 총 매트릭스: 5 x 3 x 3 = 45 조합

## 문제
- 45개 조합 전체 실행 시 비용과 시간 과다
- GitHub Actions 동시 runner 제한에 걸림

## 요청
1. 매트릭스 최적화: 필수 조합만 선별하는 전략
2. 변경 감지 기반 동적 매트릭스 축소
3. 비용 대비 효과적인 CDN 배포 전략
4. GitHub Actions YAML 코드로 제공
```

### 프롬프트 4: PR Preview 환경 자동화

```text
PR별 Preview 환경을 S3+CloudFront로 자동 프로비저닝하는 시스템을 설계해줘.

## 요구사항
- PR 생성 시 자동으로 Preview 환경 생성
- PR 업데이트 시 동일 URL로 재배포
- PR 종료 시 리소스 자동 정리
- PR 코멘트에 Preview URL 자동 게시
- 최대 동시 Preview 환경: 20개
- 비용 최적화: 단일 CloudFront Distribution + S3 prefix 분리

## 기술 스택
- GitHub Actions
- AWS S3 + CloudFront
- OIDC 인증

## 제공 형식
- GitHub Actions 워크플로우 YAML
- CloudFront Function (라우팅)
- CDK 스택 코드 (TypeScript)
```

### 프롬프트 5: AI CI 최적화 -- 빌드 시간 단축

```text
AI를 활용하여 CI 파이프라인의 빌드 시간을 단축하는 전략을 제안해줘.

## 현재 CI 파이프라인
- 총 소요 시간: 25분
- install: 3분, lint: 2분, type-check: 3분, test: 10분, build: 5분, deploy(5 betas): 12분

## 환경
- 모노레포 (Turborepo)
- pnpm workspace
- 멀티 베타 환경 5개
- 멀티 CDN 3개

## 요청
1. AI 기반 테스트 선별 실행 (변경 영향 범위 분석)
2. 빌드 캐시 지능적 관리 (캐시 히트율 개선)
3. 플레이키 테스트 자동 탐지 및 격리
4. 병렬화 전략 (테스트 shard, 매트릭스 최적화)
5. TypeScript 코드로 각 전략의 구현 예시 제공
```

---

## 11. 체크리스트

### CI/CD 기본

- [ ] GitHub Actions 워크플로우에 `concurrency` 설정
- [ ] OIDC 기반 AWS 인증 (장기 시크릿 제거)
- [ ] 빌드 아티팩트 캐시 전략 수립
- [ ] 보안 스캔 (SAST/SCA) 파이프라인 통합
- [ ] DORA 메트릭 수집 자동화

### 멀티 베타 환경

- [ ] N개 환경 동시 배포 매트릭스 구성
- [ ] PR별 Preview 자동 생성/정리 파이프라인
- [ ] 모노레포 affected 감지 + 선별 빌드
- [ ] 멀티 CDN 동시 배포 (CloudFront + Cloudflare + Fastly)
- [ ] 환경별 런타임 설정 주입 (config.js)
- [ ] 동적 매트릭스 생성 (환경 수 조절 가능)
- [ ] 배포 후 AI 헬스체크 자동 실행

### AI CI 최적화

- [ ] AI 테스트 선별 실행 (Predictive Test Selection)
- [ ] AI 빌드 캐시 최적화
- [ ] AI 플레이키 테스트 자동 탐지
- [ ] AI 보안 취약점 스캔 + 자동 수정 제안
- [ ] AI 워크플로우 생성 및 최적화

---

*본 문서는 범용 CI/CD 파이프라인 가이드이며, 조직의 규모와 인프라에 맞게 조정하여 사용할 수 있다.*
