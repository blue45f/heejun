# RFC 프로세스 가이드 -- GitHub Discussions 기반 비동기 + AI 의사결정 지원

> GitHub Discussions 기반 비동기 RFC 프로세스, AI 의사결정 지원 프롬프트, RFC 제안을 Preview 환경에서 자동 검증하는 PoC 파이프라인, AI 기반 영향도 자동 분석과 투표/점수화를 통합한 2026년형 RFC 운영 가이드.

---

## 목차

1. [GitHub Discussions 기반 비동기 RFC 프로세스](#1-github-discussions-기반-비동기-rfc-프로세스)
2. [RFC 라이프사이클: 이슈 -> Discussion -> ADR](#2-rfc-라이프사이클-이슈---discussion---adr)
3. [AI 기반 RFC 영향도 자동 분석](#3-ai-기반-rfc-영향도-자동-분석)
4. [RFC 승인 전 PoC 환경 자동 생성](#4-rfc-승인-전-poc-환경-자동-생성)
5. [AI 투표/점수화 거버넌스](#5-ai-투표점수화-거버넌스)
6. [의사결정 지원 기반 AI 프롬프트](#6-의사결정-지원-기반-ai-프롬프트)
7. [RFC 작성 템플릿](#7-rfc-작성-템플릿)
8. [RACI 거버넌스 + AI 역할](#8-raci-거버넌스--ai-역할)
9. [실전 RFC 예시](#9-실전-rfc-예시)

---

## 1. GitHub Discussions 기반 비동기 RFC 프로세스

RFC 전체 라이프사이클을 GitHub Discussions에서 운영한다. 이슈로 문제를 식별하고, Discussion에서 RFC를 논의하며, 승인된 RFC는 ADR(Architecture Decision Record)로 변환한다.

### 1.1 GitHub Discussions 카테고리 구성

| 카테고리 | 용도 | Discussion 형식 |
|---------|------|----------------|
| **RFC-Draft** | 초안 작성 중인 RFC | Open-ended |
| **RFC-Review** | 공식 리뷰 중인 RFC | Open-ended |
| **RFC-Voting** | 투표 진행 중인 RFC | Poll |
| **ADR** | 승인되어 확정된 아키텍처 결정 | Announcement |
| **RFC-Archive** | 기각/철회/대체된 RFC | Announcement |

### 1.2 Discussion 자동 생성 워크플로우

```typescript
// scripts/create-rfc-discussion.ts
import { Octokit } from "@octokit/rest";

interface RfcInput {
  title: string;
  body: string;
  author: string;
  size: "small" | "medium" | "large";
  relatedIssues: number[];
}

interface DiscussionResult {
  discussionNumber: number;
  url: string;
  labels: string[];
}

async function createRfcDiscussion(
  owner: string,
  repo: string,
  input: RfcInput,
): Promise<DiscussionResult> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // RFC 번호 채번 (기존 RFC Discussion 수 + 1)
  const existingRfcs = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    labels: "rfc",
    state: "all",
  });
  const rfcNumber = existingRfcs.data.length + 1;
  const rfcId = `RFC-${String(rfcNumber).padStart(4, "0")}`;

  // Discussion 본문 구성
  const discussionBody = [
    `# ${rfcId}: ${input.title}`,
    "",
    "## Meta",
    "",
    `| Item | Value |`,
    `|------|-------|`,
    `| Author | @${input.author} |`,
    `| Created | ${new Date().toISOString().split("T")[0]} |`,
    `| Status | Draft |`,
    `| Size | ${input.size} |`,
    `| Related Issues | ${input.relatedIssues.map((i) => `#${i}`).join(", ") || "None"} |`,
    "",
    "---",
    "",
    input.body,
    "",
    "---",
    "",
    "## Review Checklist",
    "",
    "- [ ] Problem statement is clear and data-backed",
    "- [ ] At least 3 alternatives compared",
    "- [ ] Decision matrix weights are justified",
    "- [ ] Rollback strategy included",
    "- [ ] Success metrics are measurable",
    "- [ ] AI impact analysis completed",
    "- [ ] PoC environment validated (if applicable)",
  ].join("\n");

  // GitHub Issue로 생성 (Discussion API는 GraphQL 필요)
  const issue = await octokit.rest.issues.create({
    owner,
    repo,
    title: `[RFC] ${rfcId}: ${input.title}`,
    body: discussionBody,
    labels: ["rfc", `rfc-${input.size}`, "rfc-draft"],
  });

  // 관련 이슈 링크
  for (const relatedIssue of input.relatedIssues) {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: relatedIssue,
      body: `Related RFC: ${issue.data.html_url}`,
    });
  }

  return {
    discussionNumber: issue.data.number,
    url: issue.data.html_url,
    labels: ["rfc", `rfc-${input.size}`, "rfc-draft"],
  };
}

export { createRfcDiscussion };
```

### 1.3 Discussion -> ADR 자동 변환

```typescript
// scripts/convert-rfc-to-adr.ts
import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import * as path from "path";

interface AdrContent {
  rfcNumber: string;
  title: string;
  status: "accepted" | "rejected" | "superseded";
  context: string;
  decision: string;
  consequences: string;
  alternatives: string;
  votingResult: string;
}

async function convertToAdr(
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<void> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // RFC Discussion 내용 조회
  const issue = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  // 댓글 (논의 이력) 조회
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const rfcBody = issue.data.body ?? "";
  const rfcTitle = issue.data.title.replace(/^\[RFC\]\s*/, "");

  // ADR 마크다운 생성
  const adrContent = [
    `# ${rfcTitle}`,
    "",
    "## Status",
    "",
    "Accepted",
    "",
    `## Date`,
    "",
    new Date().toISOString().split("T")[0],
    "",
    "## Context",
    "",
    extractSection(rfcBody, "동기", "제안") ||
      extractSection(rfcBody, "Motivation", "Proposal") ||
      "See original RFC discussion.",
    "",
    "## Decision",
    "",
    extractSection(rfcBody, "제안", "대안") ||
      extractSection(rfcBody, "Proposal", "Alternatives") ||
      "See original RFC discussion.",
    "",
    "## Consequences",
    "",
    extractSection(rfcBody, "영향도", "성공 지표") ||
      extractSection(rfcBody, "Impact", "Success") ||
      "See original RFC discussion.",
    "",
    "## Alternatives Considered",
    "",
    extractSection(rfcBody, "대안", "영향도") ||
      extractSection(rfcBody, "Alternatives", "Impact") ||
      "See original RFC discussion.",
    "",
    "## Discussion Summary",
    "",
    `Total comments: ${comments.data.length}`,
    "",
    ...comments.data.slice(-5).map(
      (c) =>
        `- @${c.user?.login} (${c.created_at?.split("T")[0]}): ${c.body?.split("\n")[0]?.slice(0, 100)}`,
    ),
    "",
    `## Original RFC`,
    "",
    `${issue.data.html_url}`,
  ].join("\n");

  // ADR 파일 저장
  const adrDir = path.join(process.cwd(), "docs", "adr");
  if (!fs.existsSync(adrDir)) {
    fs.mkdirSync(adrDir, { recursive: true });
  }

  const adrNumber = String(issueNumber).padStart(4, "0");
  const adrPath = path.join(adrDir, `${adrNumber}-${slugify(rfcTitle)}.md`);
  fs.writeFileSync(adrPath, adrContent);

  // RFC Issue에 ADR 링크 코멘트
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: `ADR generated: \`${path.basename(adrPath)}\`\n\nThis RFC has been accepted and converted to an Architecture Decision Record.`,
  });

  // 라벨 변경
  await octokit.rest.issues.removeLabel({
    owner,
    repo,
    issue_number: issueNumber,
    name: "rfc-review",
  });
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: ["adr", "rfc-accepted"],
  });

  console.log(`ADR created: ${adrPath}`);
}

function extractSection(
  body: string,
  startHeading: string,
  endHeading: string,
): string {
  const regex = new RegExp(
    `##\\s*\\d*\\.?\\s*${startHeading}[\\s\\S]*?(?=##\\s*\\d*\\.?\\s*${endHeading}|$)`,
    "i",
  );
  const match = body.match(regex);
  if (!match) return "";
  return match[0]
    .replace(/^##\s*\d*\.?\s*\S+/m, "")
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");
}

export { convertToAdr };
```

---

## 2. RFC 라이프사이클: 이슈 -> Discussion -> ADR

### 2.1 전체 흐름

```
Issue (문제 식별)
  │
  ├── 이슈에서 문제/필요성 기록
  ├── 라벨: needs-rfc
  │
  ▼
Discussion: RFC-Draft (초안)
  │
  ├── AI로 RFC 초안 자동 생성
  ├── AI 영향도 자동 분석 실행
  ├── 챔피언(Champion) 지정
  ├── (선택) PoC 환경 자동 생성
  │
  ▼
Discussion: RFC-Review (리뷰)
  │
  ├── 비동기 코멘트 수집 (최소 3-10영업일)
  ├── AI 리뷰 + 점수화 결과 공유
  ├── PoC 환경 검증 결과 공유
  ├── 쟁점 발생 시 동기 회의 (30분 타임박싱)
  │
  ▼
Discussion: RFC-Voting (투표)
  │
  ├── AI 점수 + 사람 투표 통합 평가
  ├── 의사결정 매트릭스 최종 확정
  │
  ▼
ADR (아키텍처 결정 기록)
  │
  ├── Discussion -> ADR 마크다운 자동 변환
  ├── Git 저장소에 ADR 커밋
  ├── 구현 추적 이슈 자동 생성
  │
  ▼
Implemented (구현 완료)
  │
  ├── 성공 지표 측정 및 기록
  └── 회고 Discussion 생성
```

### 2.2 상태별 라벨 체계

| 라벨 | 색상 | 의미 |
|------|------|------|
| `rfc` | 파란색 | RFC 이슈/Discussion 식별자 |
| `rfc-draft` | 회색 | 초안 작성 중 |
| `rfc-review` | 노란색 | 공식 리뷰 진행 중 |
| `rfc-voting` | 주황색 | 투표 진행 중 |
| `rfc-accepted` | 초록색 | 승인됨 |
| `rfc-rejected` | 빨간색 | 기각됨 |
| `rfc-withdrawn` | 회색 | 작성자 철회 |
| `rfc-small` | 연파란색 | 소규모 변경 |
| `rfc-medium` | 연노란색 | 중규모 변경 |
| `rfc-large` | 연빨간색 | 대규모 변경 |
| `adr` | 보라색 | ADR로 확정됨 |
| `needs-poc` | 청록색 | PoC 환경 검증 필요 |

### 2.3 타임라인 가이드

| 규모 | 리뷰 기간 | 최소 리뷰어 | AI 분석 | PoC 필수 |
|------|----------|------------|---------|---------|
| Small | 3영업일 | 2명 | 영향도 분석만 | 아니오 |
| Medium | 5영업일 | 3명 | 영향도 + 리스크 | 권장 |
| Large | 10영업일 | 5명 + 아키텍트 | 전체 분석 + 투표 | 필수 |

---

## 3. AI 기반 RFC 영향도 자동 분석

RFC가 Draft 상태로 전환되면 AI가 코드베이스를 스캔하여 변경 범위를 자동 예측한다.

### 3.1 영향도 분석 GitHub Actions

```yaml
# .github/workflows/rfc-impact-analysis.yml
name: RFC Impact Analysis
on:
  issues:
    types: [labeled]

permissions:
  issues: write
  contents: read

jobs:
  analyze-impact:
    if: github.event.label.name == 'rfc-draft' || github.event.label.name == 'rfc-review'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - run: npm ci

      - name: Run AI Impact Analysis
        id: analysis
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npx ts-node scripts/rfc-impact-analyzer.ts ${{ github.event.issue.number }}

      - name: Post analysis result
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('impact-report.md', 'utf-8');
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: report,
            });
```

### 3.2 영향도 분석 엔진

```typescript
// scripts/rfc-impact-analyzer.ts
import { Octokit } from "@octokit/rest";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface ImpactArea {
  area: string;
  severity: "high" | "medium" | "low";
  files: string[];
  description: string;
}

interface DependencyImpact {
  package: string;
  currentVersion: string;
  affectedModules: string[];
  breakingChanges: boolean;
}

interface ImpactReport {
  summary: string;
  codebaseImpact: ImpactArea[];
  dependencyImpact: DependencyImpact[];
  estimatedLinesChanged: number;
  affectedTests: string[];
  riskScore: number; // 1-10
  recommendations: string[];
}

async function analyzeRfcImpact(issueNumber: number): Promise<void> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const anthropic = new Anthropic();

  // RFC 내용 조회
  const owner = process.env.GITHUB_REPOSITORY?.split("/")[0] ?? "";
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";

  const issue = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const rfcContent = issue.data.body ?? "";

  // 코드베이스 구조 수집
  const projectStructure = execSync(
    'find src -type f -name "*.ts" -o -name "*.tsx" | head -200',
    { encoding: "utf-8" },
  );

  // package.json 의존성 수집
  const packageJson = fs.readFileSync("package.json", "utf-8");

  // tsconfig 수집
  const tsconfig = fs.existsSync("tsconfig.json")
    ? fs.readFileSync("tsconfig.json", "utf-8")
    : "{}";

  // AI 영향도 분석 실행
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Analyze the impact of this RFC on the codebase. Respond in valid JSON matching the ImpactReport interface.

RFC Content:
${rfcContent}

Project Structure:
${projectStructure}

Package.json:
${packageJson}

TSConfig:
${tsconfig}

Analyze and return JSON with these fields:
- summary: 1-2 sentence impact summary
- codebaseImpact: array of { area, severity (high/medium/low), files (affected file paths), description }
- dependencyImpact: array of { package, currentVersion, affectedModules, breakingChanges }
- estimatedLinesChanged: estimated total lines that need changing
- affectedTests: list of test files that need updating
- riskScore: 1-10 overall risk score
- recommendations: list of actionable recommendations

Focus on practical, specific impacts. Identify exact file paths where possible.`,
      },
    ],
  });

  const analysisText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // JSON 추출
  const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const report: ImpactReport = JSON.parse(jsonMatch[0]);

  // 마크다운 리포트 생성
  const markdown = generateImpactMarkdown(report);
  fs.writeFileSync("impact-report.md", markdown);

  console.log(`Impact analysis complete. Risk score: ${report.riskScore}/10`);
}

function generateImpactMarkdown(report: ImpactReport): string {
  const riskEmoji =
    report.riskScore >= 7
      ? "HIGH"
      : report.riskScore >= 4
        ? "MEDIUM"
        : "LOW";

  return [
    "## AI Impact Analysis Report",
    "",
    `**Risk Score: ${report.riskScore}/10 (${riskEmoji})**`,
    "",
    `> ${report.summary}`,
    "",
    "### Codebase Impact",
    "",
    "| Area | Severity | Files Affected | Description |",
    "|------|----------|---------------|-------------|",
    ...report.codebaseImpact.map(
      (i) =>
        `| ${i.area} | ${i.severity} | ${i.files.length} files | ${i.description} |`,
    ),
    "",
    "### Dependency Impact",
    "",
    "| Package | Current | Affected Modules | Breaking |",
    "|---------|---------|-----------------|----------|",
    ...report.dependencyImpact.map(
      (d) =>
        `| ${d.package} | ${d.currentVersion} | ${d.affectedModules.join(", ")} | ${d.breakingChanges ? "Yes" : "No"} |`,
    ),
    "",
    `### Estimated Changes: ~${report.estimatedLinesChanged} lines`,
    "",
    "### Affected Tests",
    "",
    ...report.affectedTests.map((t) => `- \`${t}\``),
    "",
    "### Recommendations",
    "",
    ...report.recommendations.map((r, i) => `${i + 1}. ${r}`),
    "",
    "---",
    "_Auto-generated by AI Impact Analyzer_",
  ].join("\n");
}

const issueNumber = parseInt(process.argv[2], 10);
if (!isNaN(issueNumber)) {
  analyzeRfcImpact(issueNumber);
}
```

---

## 4. RFC 승인 전 PoC 환경 자동 생성

Large 규모 RFC에서 제안한 변경을 승인 전에 Preview 환경에서 자동 검증한다. RFC에 PoC 브랜치를 연결하면 자동으로 인프라를 프로비저닝하고 검증 결과를 RFC Discussion에 게시한다.

### 4.1 PoC 환경 생성 워크플로우

```yaml
# .github/workflows/rfc-poc-environment.yml
name: RFC PoC Environment
on:
  issue_comment:
    types: [created]

permissions:
  id-token: write
  contents: read
  issues: write

jobs:
  create-poc:
    if: |
      contains(github.event.issue.labels.*.name, 'rfc') &&
      startsWith(github.event.comment.body, '/poc')
    runs-on: ubuntu-latest
    steps:
      - name: Parse PoC command
        id: parse
        uses: actions/github-script@v7
        with:
          script: |
            const body = context.payload.comment.body;
            // /poc branch-name [--run-tests] [--benchmark]
            const match = body.match(/\/poc\s+(\S+)(\s+.*)?/);
            if (!match) {
              core.setFailed('Usage: /poc <branch-name> [--run-tests] [--benchmark]');
              return;
            }
            const branch = match[1];
            const flags = match[2] || '';
            core.setOutput('branch', branch);
            core.setOutput('run_tests', flags.includes('--run-tests'));
            core.setOutput('benchmark', flags.includes('--benchmark'));

      - uses: actions/checkout@v4
        with:
          ref: ${{ steps.parse.outputs.branch }}

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - run: npm ci

      - name: Build PoC
        run: npm run build
        env:
          VITE_POC_MODE: "true"
          VITE_RFC_NUMBER: ${{ github.event.issue.number }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PREVIEW_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy PoC CDK Stack
        id: deploy
        run: |
          npx cdk deploy "PocStack-RFC-${{ github.event.issue.number }}" \
            --context rfcNumber=${{ github.event.issue.number }} \
            --context branch=${{ steps.parse.outputs.branch }} \
            --require-approval never \
            --outputs-file cdk-outputs.json

          POC_URL=$(jq -r '.[].PreviewUrl' cdk-outputs.json)
          echo "poc_url=$POC_URL" >> "$GITHUB_OUTPUT"

      - name: Sync build to S3
        run: |
          BUCKET=$(jq -r '.[].BucketName' cdk-outputs.json)
          aws s3 sync dist/ "s3://${BUCKET}/" --delete

      - name: Run tests (if requested)
        if: steps.parse.outputs.run_tests == 'true'
        id: tests
        run: |
          npm test -- --reporter=json > test-results.json 2>&1 || true
          echo "test_passed=$(jq '.success' test-results.json)" >> "$GITHUB_OUTPUT"

      - name: Run benchmark (if requested)
        if: steps.parse.outputs.benchmark == 'true'
        id: benchmark
        run: |
          npx lighthouse "${{ steps.deploy.outputs.poc_url }}" \
            --output=json \
            --output-path=lighthouse.json \
            --chrome-flags="--headless --no-sandbox"
          echo "lh_performance=$(jq '.categories.performance.score' lighthouse.json)" >> "$GITHUB_OUTPUT"

      - name: Post PoC result to RFC
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.deploy.outputs.poc_url }}';
            const branch = '${{ steps.parse.outputs.branch }}';
            const testsPassed = '${{ steps.tests.outputs.test_passed }}';
            const lhScore = '${{ steps.benchmark.outputs.lh_performance }}';

            const lines = [
              '## PoC Environment Deployed',
              '',
              `| Item | Value |`,
              `|------|-------|`,
              `| URL | ${url} |`,
              `| Branch | \`${branch}\` |`,
              `| RFC | #${context.issue.number} |`,
            ];

            if (testsPassed) {
              lines.push(`| Tests | ${testsPassed === 'true' ? 'Passed' : 'Failed'} |`);
            }
            if (lhScore) {
              lines.push(`| Lighthouse Score | ${(parseFloat(lhScore) * 100).toFixed(0)} |`);
            }

            lines.push(
              '',
              `Expires: ${new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}`,
              '',
              'Use `/poc-destroy` to manually remove this environment.',
            );

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: lines.join('\n'),
            });

  destroy-poc:
    if: |
      contains(github.event.issue.labels.*.name, 'rfc') &&
      github.event.comment.body == '/poc-destroy'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PREVIEW_ROLE_ARN }}
          aws-region: us-east-1

      - name: Destroy PoC Stack
        run: |
          npx cdk destroy "PocStack-RFC-${{ github.event.issue.number }}" --force

      - name: Comment destruction
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: 'PoC environment for this RFC has been destroyed.',
            });
```

### 4.2 PoC 검증 결과 통합

| 검증 항목 | 자동화 수준 | 결과 게시 위치 |
|----------|------------|-------------|
| 빌드 성공 여부 | 완전 자동 | RFC Discussion 코멘트 |
| 단위/통합 테스트 | 완전 자동 | RFC Discussion 코멘트 |
| Lighthouse 성능 점수 | 완전 자동 | RFC Discussion 코멘트 |
| E2E 테스트 | 반자동 (수동 트리거) | RFC Discussion 코멘트 |
| UX 리뷰 | 수동 | PoC URL 공유 후 코멘트 |
| 접근성 검사 | 완전 자동 | RFC Discussion 코멘트 |

---

## 5. AI 투표/점수화 거버넌스

RFC 평가에 AI 점수를 참고 지표로 활용한다. AI 점수는 의사결정의 보조 수단이며 최종 결정은 사람이 내린다.

### 5.1 AI 점수화 차원

| 차원 | 가중치 | AI 평가 항목 |
|------|--------|-------------|
| **기술 적합성** | 25% | 아키텍처 일관성, 기술 부채 영향, 확장성 |
| **실현 가능성** | 25% | 구현 복잡도, 일정 현실성, 팀 역량 |
| **리스크** | 20% | 장애 가능성, 보안 취약점, 롤백 난이도 |
| **비용 효율성** | 15% | 인프라 비용, 운영 비용, 라이선스 비용 |
| **개발자 경험** | 15% | 학습 곡선, 생산성 영향, 디버깅 용이성 |

### 5.2 AI 투표 자동화

```typescript
// scripts/rfc-ai-scoring.ts
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "@octokit/rest";
import * as fs from "fs";

interface ScoringDimension {
  name: string;
  weight: number;
  score: number; // 1-10
  rationale: string;
  concerns: string[];
}

interface AiVote {
  overallScore: number;
  recommendation: "approve" | "revise" | "reject";
  dimensions: ScoringDimension[];
  keyStrengths: string[];
  keyWeaknesses: string[];
  questionsForAuthors: string[];
}

async function scoreRfc(issueNumber: number): Promise<void> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const anthropic = new Anthropic();

  const owner = process.env.GITHUB_REPOSITORY?.split("/")[0] ?? "";
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";

  // RFC 내용 + 전체 코멘트 수집
  const issue = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const rfcContent = issue.data.body ?? "";
  const discussionSummary = comments.data
    .map(
      (c) =>
        `@${c.user?.login}: ${c.body?.slice(0, 500)}`,
    )
    .join("\n\n");

  // AI 점수화 실행
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Score this RFC on 5 dimensions. Return valid JSON matching the AiVote interface.

Scoring Dimensions (score each 1-10):
1. Technical Fitness (25%): Architecture consistency, tech debt impact, scalability
2. Feasibility (25%): Implementation complexity, timeline realism, team capability
3. Risk (20%): Failure probability, security vulnerabilities, rollback difficulty (higher score = lower risk)
4. Cost Efficiency (15%): Infrastructure cost, operational cost, license cost
5. Developer Experience (15%): Learning curve, productivity impact, debuggability

RFC Content:
${rfcContent}

Discussion so far:
${discussionSummary}

Return JSON with:
- overallScore: weighted average (1-10)
- recommendation: "approve" | "revise" | "reject"
- dimensions: array of { name, weight, score, rationale, concerns[] }
- keyStrengths: top 3 strengths
- keyWeaknesses: top 3 weaknesses
- questionsForAuthors: questions that should be answered before approval`,
      },
    ],
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI scoring response");

  const vote: AiVote = JSON.parse(jsonMatch[0]);

  // 결과를 마크다운으로 변환
  const markdown = [
    "## AI Scoring Report",
    "",
    `**Overall Score: ${vote.overallScore.toFixed(1)}/10**`,
    `**Recommendation: ${vote.recommendation.toUpperCase()}**`,
    "",
    "### Dimension Scores",
    "",
    "| Dimension | Weight | Score | Rationale |",
    "|-----------|--------|-------|-----------|",
    ...vote.dimensions.map(
      (d) =>
        `| ${d.name} | ${(d.weight * 100).toFixed(0)}% | ${d.score}/10 | ${d.rationale} |`,
    ),
    "",
    "### Key Strengths",
    "",
    ...vote.keyStrengths.map((s) => `- ${s}`),
    "",
    "### Key Weaknesses",
    "",
    ...vote.keyWeaknesses.map((w) => `- ${w}`),
    "",
    "### Questions for Authors",
    "",
    ...vote.questionsForAuthors.map((q, i) => `${i + 1}. ${q}`),
    "",
    "### Dimension Details",
    "",
    ...vote.dimensions.flatMap((d) => [
      `#### ${d.name}`,
      "",
      `Score: ${d.score}/10`,
      "",
      d.rationale,
      "",
      ...(d.concerns.length > 0
        ? ["Concerns:", "", ...d.concerns.map((c) => `- ${c}`), ""]
        : []),
    ]),
    "",
    "---",
    "",
    "> AI scoring is advisory only. Final decisions are made by human reviewers.",
    "",
    "_Auto-generated by AI RFC Scorer_",
  ].join("\n");

  // Discussion에 게시
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: markdown,
  });

  console.log(
    `RFC #${issueNumber} scored: ${vote.overallScore.toFixed(1)}/10 (${vote.recommendation})`,
  );
}

const issueNumber = parseInt(process.argv[2], 10);
if (!isNaN(issueNumber)) {
  scoreRfc(issueNumber);
}
```

### 5.3 최종 의사결정 통합 기준

| 항목 | AI 점수 7+ | AI 점수 4-6 | AI 점수 1-3 |
|------|-----------|------------|------------|
| **사람 투표 과반 찬성** | 즉시 승인 | 챔피언 최종 판단 | 재논의 필수 (AI 우려사항 해소 후) |
| **사람 투표 과반 반대** | 재논의 (AI 긍정 근거 검토) | 기각 | 즉시 기각 |
| **사람 투표 동점** | 승인 (AI 긍정 기준) | 챔피언 결정권 | 기각 |

> 원칙: AI 점수는 참고 지표다. AI가 높은 점수를 주더라도 사람 과반이 반대하면 반드시 재논의하며, AI 점수가 낮더라도 팀이 합의하면 승인할 수 있다. 단, AI 우려사항에 대한 해소 근거를 반드시 기록한다.

---

## 6. 의사결정 지원 기반 AI 프롬프트

### 프롬프트 1: 두 기술 비교 분석

```text
아래 두 기술 중 우리 상황에 더 적합한 것을 분석해줘.

[기술 A]
- 이름: {기술 A 이름}
- 주요 특징: {특징 나열}

[기술 B]
- 이름: {기술 B 이름}
- 주요 특징: {특징 나열}

[우리 상황]
- 팀 규모: {N명}
- 기존 기술 스택: {React/Vue/Angular, Node/Python 등}
- 서비스 특성: {트래픽 규모, 실시간성, 데이터 양}
- 주요 제약: {일정, 인력, 기존 시스템 호환성}
- 우선순위: {성능 > 개발 속도 > 유지보수성 등 우선순위 명시}

[분석 요청]
1. 우리 상황의 5가지 핵심 판단 기준을 도출하고 각 기준의 가중치를 제안해줘
2. 각 기술을 기준별로 1-10점으로 평가하고 근거를 제시해줘
3. 가중 총점과 함께 민감도 분석 (가중치를 +-10% 변경했을 때 결론이 뒤집히는지)
4. 각 기술 선택 시의 1년 후 예상 시나리오 (최선/최악/현실적)
5. 최종 추천과 그 근거 (1-2문장)
```

### 프롬프트 2: RFC 리스크 평가

```text
아래 RFC의 리스크를 다각도로 평가해줘.

[RFC 내용]
{RFC 전문 또는 요약 붙여넣기}

[평가 요청]
1. 기술 리스크
   - 신기술 도입에 따른 학습 곡선과 초기 생산성 저하
   - 기존 시스템과의 호환성 문제
   - 스케일링 한계점
   - 숨겨진 기술 부채

2. 운영 리스크
   - 장애 발생 시 MTTR(평균 복구 시간) 예상
   - 모니터링/알림 사각지대
   - 롤백 복잡도

3. 조직 리스크
   - Key Person 의존도
   - 팀 간 조율 필요성
   - 지식 이전 비용

4. 비용 리스크
   - 예상 비용의 불확실성 범위
   - 숨겨진 비용 (마이그레이션, 교육, 라이선스)

5. 일정 리스크
   - 예상 일정의 현실성 (업계 유사 사례 대비)
   - 의존성 지연 가능성

[출력 형식]
- 리스크별 가능성(높/중/낮) x 영향도(높/중/낮) 매트릭스
- 각 리스크의 대응 전략 (회피/완화/전가/수용)
- 전체 리스크 점수 (1-10)와 Go/No-Go 추천
```

### 프롬프트 3: RFC 대안 공정성 검증

```text
아래 RFC의 대안 분석이 공정하게 이루어졌는지 검증해줘.

[RFC 대안 분석 섹션]
{대안 분석 내용 붙여넣기}

[검증 요청]
1. 확증 편향(confirmation bias) 탐지
   - 선호 대안에 유리한 기준만 선택하지 않았는가
   - 각 대안의 장점이 동등하게 조사되었는가

2. 누락 대안 식별
   - 2025-2026년 새로 등장한 기술/접근법이 빠져있는가
   - "아무것도 하지 않는" 대안이 고려되었는가

3. 의사결정 매트릭스 검증
   - 가중치의 근거가 명시되어 있는가
   - 점수의 출처(벤치마크, 사례, 전문가 의견)가 있는가
   - 가중치를 +-10% 변경해도 결론이 유지되는가 (민감도 분석)

4. 숨겨진 가정(Hidden Assumptions) 탐지
   - "당연히 X일 것이다"라는 가정이 검증 없이 사용되었는가
   - 외부 환경 변화(시장, 기술 트렌드)에 대한 고려가 있는가

[출력]
- 공정성 점수 (1-10)
- 발견된 편향 목록과 보완 방법
- 추가해야 할 대안이 있으면 의사결정 매트릭스에 포함하여 재구성
```

### 프롬프트 4: 의사결정 교착 상태 해소

```text
RFC 논의가 교착 상태에 빠졌어. 양측 의견을 분석하고 해소 방안을 제시해줘.

[찬성 측 의견]
{찬성 주장 요약}

[반대 측 의견]
{반대 주장 요약}

[분석 요청]
1. 양측이 실제로 동의하는 부분 (공통 기반) 식별
2. 핵심 쟁점 1-3개로 압축
3. 각 쟁점별로:
   - 양측 주장의 타당성 평가
   - 데이터로 검증 가능한 부분 vs 가치 판단 영역 구분
   - 절충안(compromise) 제시
4. 교착 상태 해소를 위한 구체적 다음 행동 제안
   - 추가 데이터 수집이 필요한 경우 수집 방법
   - PoC로 검증 가능한 경우 PoC 범위 제안
   - 타임박싱이 필요한 경우 기한 제안
```

### 프롬프트 5: RFC 영향도 코드베이스 사전 분석

```text
아래 RFC가 승인되면 코드베이스에 어떤 변경이 필요한지 사전 분석해줘.

[RFC 제안 요약]
{RFC 핵심 제안 1-2문단}

[현재 코드베이스 구조]
{프로젝트 디렉토리 구조 트리}

[주요 의존성]
{package.json의 dependencies 목록}

[분석 요청]
1. 변경이 필요한 파일/모듈 목록 (우선순위순)
2. 각 파일의 예상 변경 유형 (수정/삭제/신규/리팩토링)
3. 변경 간 의존 관계 (어떤 순서로 변경해야 하는지)
4. 영향받는 테스트 파일 목록
5. 마이그레이션 스크립트가 필요한 경우 개요
6. 예상 총 변경 라인 수와 소요 시간 (인원수별)
```

---

## 7. RFC 작성 템플릿

```markdown
# RFC-[번호]: [간결하고 명확한 제목]

## 메타 정보

| 항목 | 내용 |
|------|------|
| 작성자 | @author |
| 챔피언 | @champion |
| 작성일 | YYYY-MM-DD |
| 상태 | Draft / Review / Voting / Accepted / Rejected |
| 규모 | Small / Medium / Large |
| 관련 이슈 | #이슈번호 |
| PoC 브랜치 | (있는 경우) feature/rfc-XXX-poc |
| AI 보조 | 사용 도구명 및 활용 범위 |

---

## 1. 요약 (Summary)

> 1-2문장으로 이 RFC가 무엇을 제안하는지 요약한다.

---

## 2. 동기 (Motivation)

### 2.1 현재 상황
{현재 기술/프로세스의 상태를 구체적 데이터와 함께 설명}

### 2.2 문제점
- 정량적 근거: {수치, 에러율, 성능 지표 등}
- 정성적 근거: {개발자 경험, 유지보수성 등}

### 2.3 목표
- 목표 1: {구체적이고 측정 가능한 목표}

### 2.4 비목표 (Non-goals)
- {이 RFC에서 다루지 않는 것}

---

## 3. 제안 (Proposal)

### 3.1 핵심 제안
{제안하는 해결책을 상세히 기술}

### 3.2 기술 설계
{아키텍처, 데이터 흐름, API 설계 등}

### 3.3 구현 계획

| Phase | 기간 | 내용 | 산출물 |
|-------|------|------|--------|
| Phase 1 | N주 | {내용} | {산출물} |

---

## 4. 대안 분석 (Alternatives)

### 4.1 의사결정 매트릭스

| 기준 | 가중치 | 제안 | 대안 A | 대안 B |
|------|--------|------|--------|--------|
| 기준1 | N% | ? | ? | ? |
| **가중 총점** | **100%** | **?** | **?** | **?** |

### 4.2 민감도 분석
{가중치 변경 시 결론 변화 여부}

---

## 5. 영향도 분석 (Impact Analysis)

### 5.1 AI 자동 분석 결과
{AI Impact Analyzer 결과 첨부 또는 요약}

### 5.2 추가 영향 범위
- 팀/인원: {영향받는 팀과 인원}
- 코드베이스: {영향받는 프로젝트/모듈}
- 프로세스: {변경되는 워크플로우}

### 5.3 리스크

| 리스크 | 가능성 | 영향도 | 대응 전략 |
|--------|--------|--------|----------|
| {리스크 1} | 높/중/낮 | 높/중/낮 | 회피/완화/전가/수용 |

### 5.4 롤백 계획
{문제 발생 시 이전 상태로 복원하는 방법}

---

## 6. PoC 검증 결과 (해당 시)

| 항목 | 결과 |
|------|------|
| PoC URL | {URL} |
| 빌드 성공 | 예/아니오 |
| 테스트 통과 | N/M 통과 |
| 성능 점수 | {Lighthouse 점수 등} |
| 주요 발견 사항 | {PoC에서 발견된 이슈/인사이트} |

---

## 7. 성공 지표 (Success Metrics)

| 지표 | 현재 값 | 목표 값 | 측정 방법 | 측정 시점 |
|------|---------|---------|----------|----------|
| {지표 1} | {현재} | {목표} | {방법} | 구현 후 N주 |

---

## 8. AI 점수 및 리뷰 (자동 생성)

{AI Scoring Report가 자동으로 코멘트에 게시됨 -- 여기에 요약 기록}

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| YYYY-MM-DD | 초안 작성 (AI 보조) | @author |
```

---

## 8. RACI 거버넌스 + AI 역할

### 8.1 역할 정의

| 활동 | 작성자 | 챔피언 | 리뷰어 | 승인권자 | AI |
|------|:---:|:---:|:---:|:---:|:---:|
| RFC 초안 작성 | **R** | I | - | - | 보조(초안 생성) |
| 영향도 분석 | R | I | - | - | **자동 실행** |
| AI 점수화 | I | I | I | I | **자동 실행** |
| PoC 환경 생성 | R | A | - | - | 자동(CI/CD) |
| 비동기 코멘트 | R | C | **R** | I | - |
| 쟁점 중재 | I | **R** | C | I | 보조(분석) |
| 투표 | I | I | **R** | I | 참고 점수 |
| 최종 승인/기각 | I | C | C | **R** | - |
| ADR 변환 | I | A | - | - | **자동 실행** |
| 구현 추적 | **R** | A | I | I | - |
| 성과 지표 검증 | R | **A** | I | I | - |

> R: Responsible / A: Accountable / C: Consulted / I: Informed

### 8.2 승인 기준

| RFC 규모 | 승인 요건 | 승인권자 | AI 점수 조건 |
|---------|----------|---------|------------|
| Small | 리뷰어 2명 승인 | 챔피언 | 참고만 |
| Medium | 리뷰어 3명 승인 + 시니어 1명 | 테크 리드 | 4점 미만 시 재논의 |
| Large | 리뷰어 5명 승인 + 아키텍처 리뷰 + PoC 검증 | 아키텍트 / CTO | 4점 미만 시 반드시 AI 우려사항 해소 기록 |

### 8.3 분쟁 해결

1. **1단계**: 작성자-리뷰어 간 Discussion 스레드 논의
2. **2단계**: AI에게 교착 상태 해소 분석 요청 (프롬프트 4 활용)
3. **3단계**: 챔피언 중재 (동기 회의, 30분 제한)
4. **4단계**: 테크 리드 최종 결정 (결정 사유 기록 필수)

---

## 9. 실전 RFC 예시

```markdown
# RFC-0012: PR별 멀티 베타 Preview 환경 도입

## 메타 정보

| 항목 | 내용 |
|------|------|
| 작성자 | @infra-engineer |
| 챔피언 | @tech-lead |
| 작성일 | 2026-03-15 |
| 상태 | Accepted |
| 규모 | Large |
| 관련 이슈 | #234, #267 |
| PoC 브랜치 | feature/rfc-0012-preview-poc |
| AI 보조 | Claude (초안 생성, 영향도 분석, AI 점수화, CDK 코드 생성) |

## 1. 요약

PR이 생성될 때마다 CDK L3 Construct로 독립된 S3 + CloudFront + OAC + Route53 인프라를
자동 프로비저닝하고, PR이 닫힐 때 자동으로 정리하면서 비용 리포트를 생성하는
멀티 베타 Preview 환경을 도입한다.

## 2. 동기

### 2.1 현재 상황
- 스테이징 환경 1개를 전체 팀(8명)이 공유
- 배포 순서 충돌로 평균 대기 시간 4시간
- QA 팀이 여러 기능을 동시에 검증할 수 없음

### 2.2 문제점
- 정량적: 스테이징 배포 대기 시간 4시간, 주간 배포 충돌 평균 6회
- 정성적: 개발자 배포 대기 스트레스, QA 병목으로 릴리스 주기 지연

### 2.3 목표
- PR별 독립 Preview 환경 자동 생성 (프로비저닝 10분 이내)
- 배포 대기 시간 0으로 감소
- 동시 N개 기능의 병렬 QA 가능
- 환경당 월 비용 $5 이내

### 2.4 비목표
- 백엔드 API 멀티 베타 (프론트엔드 정적 배포만 대상)
- 데이터베이스 격리 (공유 스테이징 API 사용)

## 3. 제안

CDK L3 Construct (PreviewEnvironment)로 S3 + CloudFront + OAC + Route53을
통합하고, GitHub Actions로 PR 라이프사이클과 연동한다.

### 3.1 구현 계획

| Phase | 기간 | 내용 | 산출물 |
|-------|------|------|--------|
| Phase 1 | 2주 | CDK L3 Construct 개발 + 단일 PR 테스트 | Construct 코드, GitHub Actions |
| Phase 2 | 1주 | 자동 정리 + 비용 리포트 | Cleanup workflow, Cost report |
| Phase 3 | 2주 | 전체 팀 적용 + 고아 환경 탐지 | 운영 가이드, 모니터링 |

## 4. 대안 분석 (AI 자동 생성 + 사람 보완)

| 기준 | 가중치 | CDK L3 Construct | Terraform Module | Vercel Preview |
|------|--------|-----------------|-----------------|----------------|
| 환경 격리 수준 | 30% | 10 | 9 | 8 |
| 프로비저닝 속도 | 25% | 7 | 6 | 10 |
| 비용 효율성 | 20% | 8 | 7 | 5 |
| 팀 친화성 | 15% | 9 | 6 | 8 |
| 확장성 | 10% | 9 | 8 | 6 |
| **가중 총점** | | **8.55** | **7.35** | **7.60** |

## 5. AI 점수 및 리뷰

| 차원 | 점수 | 요약 |
|------|------|------|
| 기술 적합성 | 9/10 | CDK + TypeScript가 팀 스택과 일치 |
| 실현 가능성 | 8/10 | CDK 경험 있는 인프라 엔지니어 존재 |
| 리스크 | 7/10 | 고아 리소스 리스크를 자동 정리로 완화 |
| 비용 효율성 | 8/10 | 환경당 월 $3-5 예상 |
| 개발자 경험 | 9/10 | PR 코멘트에 URL 자동 게시로 UX 우수 |
| **Overall** | **8.3/10** | **Approve** |

## 6. PoC 검증 결과

| 항목 | 결과 |
|------|------|
| PoC URL | https://pr-99.beta.example.com |
| CDK Deploy 시간 | 8분 32초 |
| S3 Sync 시간 | 45초 |
| 빌드 + 배포 전체 | 12분 17초 |
| Lighthouse Performance | 94 |
| CDK Destroy 시간 | 3분 15초 |

## 7. 성공 지표

| 지표 | 현재 | 목표 | 측정 시점 |
|------|------|------|----------|
| 배포 대기 시간 | 4시간 | 0분 | Phase 1 완료 후 |
| 프로비저닝 시간 | N/A | 15분 이내 | Phase 1 완료 후 |
| 주간 배포 충돌 | 6회 | 0회 | Phase 3 완료 후 |
| 환경당 월 비용 | N/A | $5 이내 | Phase 3 완료 후 |
```

---

*본 문서는 범용 RFC 프로세스 가이드이며, 조직의 규모와 문화에 맞게 조정하여 사용할 수 있다.*
