# 15. RFC 의사결정 프로세스 (2026 Edition)

| 분류 | 핵심 기술 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [16. AI 코드리뷰](./16_AI_협업_코드리뷰_가이드.md), [17. 온보딩](./17_신규_입사자_온보딩_가이드.md) | **AI 도구** | GitHub Discussions, Claude Code, MADR 4.0, Linear/Height |
| **핵심 테마** | RFC 라이프사이클, AI 영향도 분석, PoC 자동 생성, ADR(MADR 4.0) | **Update** | 2026.05 |

> GitHub Discussions 기반 비동기 RFC 프로세스, AI 의사결정 지원 프롬프트, RFC 제안을 Preview 환경에서 자동 검증하는 PoC 파이프라인, AI 기반 영향도 자동 분석과 투표/점수화, MADR 4.0 템플릿, Linear/Height의 AI-Native RFC 워크플로우를 통합한 2026년형 RFC 운영 가이드.

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
10. [RFC 프로세스 체크리스트](#10-rfc-프로세스-체크리스트)
11. [2026 운영 사례 및 도구 통합](#11-2026-운영-사례-및-도구-통합)

---

## 1. GitHub Discussions 기반 비동기 RFC 프로세스

RFC 전체 라이프사이클을 GitHub Discussions에서 운영한다. 이슈로 문제를 식별하고, Discussion에서 RFC를 논의하며, 승인된 RFC는 ADR(Architecture Decision Record)로 변환한다.

### 1.1 GitHub Discussions 카테고리 구성

| 카테고리 | 용도 | Discussion 형식 |
|---------|------|----------------|
| **RFC-Draft** | 초안 작성 중인 RFC | Open-ended |
| **RFC-Review** | 공식 리뷰 중인 RFC | Open-ended |
| **RFC-Voting** | 투표 진행 중인 RFC | Poll |
| **ADR** | 승인되어 확정된 아키텍처 결정 (MADR 4.0 포맷) | Announcement |
| **RFC-Archive** | 기각/철회/대체된 RFC | Announcement |

> **2026년 RFC 도구 환경의 흐름:** Linear, Height(Cognition 인수), Notion Developer Platform이 RFC를 단순 문서가 아닌 "Workspace + AI 에이전트가 함께 다루는 워크플로우"로 통합하고 있다. Linear는 RFC를 프로젝트/이슈와 직접 연결하고, Height는 AI가 자동으로 서브태스크/블로커를 추정하며, Notion은 External Agents API(alpha)로 Claude·Codex를 Notion 내부에서 호출할 수 있게 한다. GitHub Discussions는 여전히 코드 근접성과 자동화 친화성에서 가장 보수적이며 안전한 선택이고, RFC 본문은 외부 도구와 동기화하더라도 ADR의 단일 진실 공급원(Single Source of Truth)은 Git 저장소(`docs/adr`)에 두는 것을 권장한다.

### 1.2 Discussion 자동 생성 워크플로우

```typescript
// scripts/create-rfc-discussion.ts
// GitHub Discussions에 RFC를 자동 생성하는 스크립트
// RFC 번호를 자동 채번하고, 메타 정보 테이블과 리뷰 체크리스트를 포함한 본문을 구성한다.
import { Octokit } from "@octokit/rest";

// RFC 생성 시 필요한 입력 데이터 타입
interface RfcInput {
  title: string; // RFC 제목
  body: string; // RFC 본문 (마크다운)
  author: string; // 작성자 GitHub 아이디
  size: "small" | "medium" | "large"; // RFC 규모 (리뷰 기간, 승인 요건에 영향)
  relatedIssues: number[]; // 관련 이슈 번호 목록
}

// Discussion 생성 결과 반환 타입
interface DiscussionResult {
  discussionNumber: number; // 생성된 Discussion/Issue 번호
  url: string; // Discussion URL
  labels: string[]; // 부여된 라벨 목록
}

async function createRfcDiscussion(
  owner: string,
  repo: string,
  input: RfcInput,
): Promise<DiscussionResult> {
  // GitHub API 클라이언트 초기화 (환경 변수에서 토큰 읽기)
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // RFC 번호 채번: 기존 RFC 라벨이 붙은 이슈 수 + 1로 순차 번호 생성
  const existingRfcs = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    labels: "rfc",
    state: "all", // 닫힌 RFC도 포함하여 번호 중복 방지
  });
  const rfcNumber = existingRfcs.data.length + 1;
  // RFC-0001 형태의 4자리 패딩 ID 생성
  const rfcId = `RFC-${String(rfcNumber).padStart(4, "0")}`;

  // Discussion 본문을 마크다운으로 구성
  // 메타 정보 테이블, 본문, 리뷰 체크리스트를 포함
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

  // GitHub Issue로 생성 (Discussion API는 GraphQL이 필요하므로 REST API의 Issue를 활용)
  const issue = await octokit.rest.issues.create({
    owner,
    repo,
    title: `[RFC] ${rfcId}: ${input.title}`,
    body: discussionBody,
    labels: ["rfc", `rfc-${input.size}`, "rfc-draft"],
  });

  // 관련 이슈에 RFC 링크를 코멘트로 추가하여 양방향 추적 보장
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

**실전 사용 예시 -- CLI에서 RFC 생성:**

```bash
# RFC 생성 스크립트 실행 예시
# 환경 변수로 GitHub 토큰을 전달하고, ts-node로 직접 실행한다.
GITHUB_TOKEN=ghp_xxxx npx ts-node scripts/create-rfc-discussion.ts \
  --title "상태관리 라이브러리를 Zustand에서 Jotai로 마이그레이션" \
  --size medium \
  --issues 123,145
```

### 1.3 Discussion -> ADR 자동 변환

```typescript
// scripts/convert-rfc-to-adr.ts
// 승인된 RFC Discussion을 ADR(Architecture Decision Record) 마크다운으로 자동 변환하는 스크립트
// RFC 본문에서 각 섹션을 추출하고, 논의 이력 요약을 포함한 ADR 파일을 생성한다.
import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import * as path from "path";

// ADR에 포함될 내용 구조
interface AdrContent {
  rfcNumber: string; // RFC 번호 (예: RFC-0012)
  title: string; // RFC 제목
  status: "accepted" | "rejected" | "superseded"; // 최종 상태
  context: string; // 배경/맥락 섹션
  decision: string; // 결정 사항 섹션
  consequences: string; // 결과/영향 섹션
  alternatives: string; // 검토된 대안 섹션
  votingResult: string; // 투표 결과 요약
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

  // 댓글 (논의 이력) 조회 -- ADR에 논의 요약을 포함하기 위함
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const rfcBody = issue.data.body ?? "";
  // 제목에서 "[RFC] " 접두사 제거
  const rfcTitle = issue.data.title.replace(/^\[RFC\]\s*/, "");

  // ADR 마크다운 본문 구성
  // MADR 4.0 형식(Decision Maker(s), Status, Context, Decision Drivers, Considered Options,
  // Decision Outcome + Confirmation)을 따른다. 4.0에서 "Deciders" -> "Decision Maker(s)",
  // "Validation" -> "Confirmation"으로 변경되었으며, Confirmation은 Decision Outcome의 하위 요소이다.
  // 참고: https://adr.github.io/madr/ (2024.09 릴리스, 2026년 현재 표준)
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
    "## Decision Maker(s)",
    "",
    `@${issue.data.user?.login ?? "unknown"} (Author), Tech Lead, Architect`,
    "",
    "## Context",
    "",
    // RFC 본문에서 "동기" 또는 "Motivation" 섹션을 추출
    extractSection(rfcBody, "동기", "제안") ||
      extractSection(rfcBody, "Motivation", "Proposal") ||
      "See original RFC discussion.",
    "",
    "## Decision",
    "",
    // RFC 본문에서 "제안" 또는 "Proposal" 섹션을 추출
    extractSection(rfcBody, "제안", "대안") ||
      extractSection(rfcBody, "Proposal", "Alternatives") ||
      "See original RFC discussion.",
    "",
    "## Decision Outcome",
    "",
    "### Consequences",
    "",
    // RFC 본문에서 "영향도" 또는 "Impact" 섹션을 추출
    extractSection(rfcBody, "영향도", "성공 지표") ||
      extractSection(rfcBody, "Impact", "Success") ||
      "See original RFC discussion.",
    "",
    "### Confirmation (검증 방법)",
    "",
    // MADR 4.0의 Confirmation은 결정 후 어떻게 결과를 검증할지 정의한다.
    // 성공 지표 섹션 또는 PoC 검증 결과에서 추출한다.
    extractSection(rfcBody, "성공 지표", "AI 점수") ||
      extractSection(rfcBody, "Success Metrics", "AI Score") ||
      "검증 방법: 성공 지표 측정 + 회고 Discussion 진행",
    "",
    "## Alternatives Considered",
    "",
    // RFC 본문에서 "대안" 또는 "Alternatives" 섹션을 추출
    extractSection(rfcBody, "대안", "영향도") ||
      extractSection(rfcBody, "Alternatives", "Impact") ||
      "See original RFC discussion.",
    "",
    "## Discussion Summary",
    "",
    // 전체 코멘트 수와 최근 5개 코멘트 요약을 포함
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

  // ADR 파일을 docs/adr 디렉토리에 저장
  const adrDir = path.join(process.cwd(), "docs", "adr");
  if (!fs.existsSync(adrDir)) {
    fs.mkdirSync(adrDir, { recursive: true });
  }

  // 파일명: 이슈 번호를 4자리로 패딩 + 슬러그화된 제목
  const adrNumber = String(issueNumber).padStart(4, "0");
  const adrPath = path.join(adrDir, `${adrNumber}-${slugify(rfcTitle)}.md`);
  fs.writeFileSync(adrPath, adrContent);

  // RFC Issue에 ADR 생성 완료 코멘트 게시
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: `ADR generated: \`${path.basename(adrPath)}\`\n\nThis RFC has been accepted and converted to an Architecture Decision Record.`,
  });

  // 라벨 변경: rfc-review 제거 -> adr, rfc-accepted 추가
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

/**
 * 마크다운 본문에서 특정 섹션을 추출하는 유틸리티 함수
 * startHeading과 endHeading 사이의 텍스트를 반환한다.
 * 한글/영문 헤딩 모두 지원하며, 숫자 접두사(## 2.1 동기)도 처리한다.
 */
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
  // 헤딩 라인 자체를 제거하고 본문만 반환
  return match[0]
    .replace(/^##\s*\d*\.?\s*\S+/m, "")
    .trim();
}

/**
 * 텍스트를 URL-safe 슬러그로 변환하는 유틸리티
 * 한글, 영문 소문자, 숫자만 남기고 나머지는 하이픈으로 치환한다.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");
}

export { convertToAdr };
```

**실전 사용 예시 -- 승인된 RFC를 ADR로 변환:**

```bash
# RFC #42가 투표를 통해 승인된 후 ADR로 변환
GITHUB_TOKEN=ghp_xxxx npx ts-node scripts/convert-rfc-to-adr.ts 42

# 생성 결과 확인
# docs/adr/0042-상태관리-zustand-에서-jotai-마이그레이션.md 파일이 생성됨
```

---

## 2. RFC 라이프사이클: 이슈 -> Discussion -> ADR

### 2.1 전체 흐름

```
Issue (문제 식별)
  |
  +-- 이슈에서 문제/필요성 기록
  +-- 라벨: needs-rfc
  |
  v
Discussion: RFC-Draft (초안)
  |
  +-- AI로 RFC 초안 자동 생성
  +-- AI 영향도 자동 분석 실행
  +-- 챔피언(Champion) 지정
  +-- (선택) PoC 환경 자동 생성
  |
  v
Discussion: RFC-Review (리뷰)
  |
  +-- 비동기 코멘트 수집 (최소 3-10영업일)
  +-- AI 리뷰 + 점수화 결과 공유
  +-- PoC 환경 검증 결과 공유
  +-- 쟁점 발생 시 동기 회의 (30분 타임박싱)
  |
  v
Discussion: RFC-Voting (투표)
  |
  +-- AI 점수 + 사람 투표 통합 평가
  +-- 의사결정 매트릭스 최종 확정
  |
  v
ADR (아키텍처 결정 기록)
  |
  +-- Discussion -> ADR 마크다운 자동 변환
  +-- Git 저장소에 ADR 커밋
  +-- 구현 추적 이슈 자동 생성
  |
  v
Implemented (구현 완료)
  |
  +-- 성공 지표 측정 및 기록
  +-- 회고 Discussion 생성
```

### 2.2 상태별 라벨 체계

| 라벨 | 색상 | 의미 | 적용 시점 |
|------|------|------|----------|
| `rfc` | 파란색 | RFC 이슈/Discussion 식별자 | RFC 생성 시 자동 부여 |
| `rfc-draft` | 회색 | 초안 작성 중 | RFC 생성 시 자동 부여 |
| `rfc-review` | 노란색 | 공식 리뷰 진행 중 | 작성자가 리뷰 요청 시 변경 |
| `rfc-voting` | 주황색 | 투표 진행 중 | 리뷰 기간 종료 후 챔피언이 변경 |
| `rfc-accepted` | 초록색 | 승인됨 | 투표 결과 승인 시 자동 변경 |
| `rfc-rejected` | 빨간색 | 기각됨 | 투표 결과 기각 시 자동 변경 |
| `rfc-withdrawn` | 회색 | 작성자 철회 | 작성자 요청 시 수동 변경 |
| `rfc-small` | 연파란색 | 소규모 변경 | RFC 생성 시 규모에 따라 부여 |
| `rfc-medium` | 연노란색 | 중규모 변경 | RFC 생성 시 규모에 따라 부여 |
| `rfc-large` | 연빨간색 | 대규모 변경 | RFC 생성 시 규모에 따라 부여 |
| `adr` | 보라색 | ADR로 확정됨 | ADR 변환 시 자동 부여 |
| `needs-poc` | 청록색 | PoC 환경 검증 필요 | 리뷰 중 PoC 필요 판단 시 수동 부여 |

### 2.3 타임라인 가이드

| 규모 | 리뷰 기간 | 최소 리뷰어 | AI 분석 | PoC 필수 |
|------|----------|------------|---------|---------|
| Small | 3영업일 | 2명 | 영향도 분석만 | 아니오 |
| Medium | 5영업일 | 3명 | 영향도 + 리스크 | 권장 |
| Large | 10영업일 | 5명 + 아키텍트 | 전체 분석 + 멀티 에이전트 점수화 | 필수 |

> **2026년 AI-Native 도구 선택지:** Linear는 RFC를 프로젝트/이슈와 직접 묶을 수 있고, Height(Cognition 인수)는 AI가 자동으로 서브태스크와 블로커를 식별한다. Notion Developer Platform(2026.05)은 Workers와 webhooks로 RFC 워크플로우를 코드화할 수 있고, External Agents API(alpha)로 Claude/Codex 등을 Notion 내부에서 호출할 수 있다. 외부 도구 도입 시 반드시 다음 두 가지 원칙을 지킨다: (1) ADR의 Single Source of Truth는 Git 저장소 유지, (2) 외부 도구 URL은 RFC 메타 정보 표에 명시.

**규모 판단 기준:**

| 규모 | 변경 범위 | 예시 |
|------|----------|------|
| Small | 단일 모듈, 기존 패턴 내 변경 | 유틸 함수 교체, 린트 규칙 추가, 소규모 리팩토링 |
| Medium | 복수 모듈, 새 라이브러리 도입 | 상태관리 라이브러리 교체, API 클라이언트 변경, 테스트 전략 변경 |
| Large | 아키텍처 수준, 전체 워크플로우 변경 | 마이크로 프론트엔드 도입, 모노레포 전환, 배포 파이프라인 재설계 |

### 2.4 RFC 상태 전환 규칙

RFC 상태 전환은 다음 조건을 만족해야 진행할 수 있다.

| 전환 | 조건 | 실행자 |
|------|------|--------|
| Draft -> Review | 체크리스트 항목 70% 이상 완료, 챔피언 지정 | 작성자 |
| Review -> Voting | 리뷰 기간 경과, 미해결 블로커 없음, AI 분석 완료 | 챔피언 |
| Voting -> Accepted | 승인 요건 충족 (규모별 기준 참고) | 승인권자 |
| Voting -> Rejected | 과반 반대 또는 재논의 후 기각 합의 | 승인권자 |
| 모든 상태 -> Withdrawn | 작성자 철회 의사 표명 | 작성자 |

---

## 3. AI 기반 RFC 영향도 자동 분석

RFC가 Draft 상태로 전환되면 AI가 코드베이스를 스캔하여 변경 범위를 자동 예측한다. 이 결과는 리뷰어가 RFC의 실질적 영향 범위를 파악하는 데 활용된다.

### 3.1 영향도 분석 GitHub Actions

```yaml
# .github/workflows/rfc-impact-analysis.yml
# RFC 이슈에 rfc-draft 또는 rfc-review 라벨이 붙으면
# AI가 코드베이스를 분석하여 영향도 보고서를 자동 생성하고 코멘트로 게시한다.
name: RFC Impact Analysis
on:
  issues:
    types: [labeled]

permissions:
  issues: write
  contents: read

jobs:
  analyze-impact:
    # rfc-draft 또는 rfc-review 라벨이 부여될 때만 실행
    if: github.event.label.name == 'rfc-draft' || github.event.label.name == 'rfc-review'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # 전체 히스토리 필요 (변경 빈도 분석용)

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - run: npm ci

      # AI 영향도 분석 스크립트 실행
      - name: Run AI Impact Analysis
        id: analysis
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npx ts-node scripts/rfc-impact-analyzer.ts ${{ github.event.issue.number }}

      # 분석 결과를 RFC Discussion 코멘트로 게시
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
// RFC 내용을 AI에게 전달하여 코드베이스 영향도를 자동 분석하는 엔진
// 프로젝트 구조, 의존성, 설정 파일을 수집하여 AI가 구체적인 파일 단위로 영향 범위를 예측한다.
import { Octokit } from "@octokit/rest";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// 코드베이스 영향 영역 타입
interface ImpactArea {
  area: string; // 영향 영역 이름 (예: "상태관리 레이어", "API 통신 모듈")
  severity: "high" | "medium" | "low"; // 영향 심각도
  files: string[]; // 영향받는 파일 경로 목록
  description: string; // 영향 설명
}

// 의존성 영향 타입
interface DependencyImpact {
  package: string; // 패키지 이름
  currentVersion: string; // 현재 버전
  affectedModules: string[]; // 영향받는 모듈 목록
  breakingChanges: boolean; // 호환성 깨짐 여부
}

// 전체 영향도 보고서 타입
interface ImpactReport {
  summary: string; // 1-2문장 요약
  codebaseImpact: ImpactArea[]; // 코드베이스 영향 영역 목록
  dependencyImpact: DependencyImpact[]; // 의존성 영향 목록
  estimatedLinesChanged: number; // 예상 변경 라인 수
  affectedTests: string[]; // 영향받는 테스트 파일 목록
  riskScore: number; // 전체 리스크 점수 (1-10)
  recommendations: string[]; // 실행 가능한 권고사항 목록
}

async function analyzeRfcImpact(issueNumber: number): Promise<void> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const anthropic = new Anthropic();

  // 환경 변수에서 리포지토리 정보 추출
  const owner = process.env.GITHUB_REPOSITORY?.split("/")[0] ?? "";
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";

  // RFC 이슈 내용 조회
  const issue = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const rfcContent = issue.data.body ?? "";

  // 프로젝트의 TypeScript/TSX 파일 구조를 수집 (최대 200개)
  // AI가 구체적 파일 경로를 식별할 수 있도록 한다.
  const projectStructure = execSync(
    'find src -type f -name "*.ts" -o -name "*.tsx" | head -200',
    { encoding: "utf-8" },
  );

  // package.json에서 의존성 정보 수집
  const packageJson = fs.readFileSync("package.json", "utf-8");

  // TypeScript 컴파일러 설정 수집
  const tsconfig = fs.existsSync("tsconfig.json")
    ? fs.readFileSync("tsconfig.json", "utf-8")
    : "{}";

  // AI에게 영향도 분석 요청
  // 프로젝트 구조와 RFC 내용을 함께 전달하여 구체적 영향 범위를 예측한다.
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-7-20260301",
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

  // AI 응답에서 텍스트 추출
  const analysisText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // JSON 블록 추출 (AI 응답에 마크다운 래퍼가 있을 수 있으므로 정규식으로 추출)
  const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const report: ImpactReport = JSON.parse(jsonMatch[0]);

  // 마크다운 리포트 파일 생성 (GitHub Actions 후속 스텝에서 코멘트로 게시)
  const markdown = generateImpactMarkdown(report);
  fs.writeFileSync("impact-report.md", markdown);

  console.log(`Impact analysis complete. Risk score: ${report.riskScore}/10`);
}

/**
 * ImpactReport 객체를 GitHub 코멘트용 마크다운으로 변환하는 함수
 * 리스크 점수에 따라 HIGH/MEDIUM/LOW 표시를 추가한다.
 */
function generateImpactMarkdown(report: ImpactReport): string {
  // 리스크 수준 텍스트 결정 (7점 이상 HIGH, 4점 이상 MEDIUM, 그 외 LOW)
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

// CLI 진입점: 첫 번째 인자로 이슈 번호를 받아 분석 실행
const issueNumber = parseInt(process.argv[2], 10);
if (!isNaN(issueNumber)) {
  analyzeRfcImpact(issueNumber);
}
```

### 3.3 영향도 보고서 해석 가이드

AI가 생성한 영향도 보고서를 올바르게 해석하고 활용하는 방법:

| 리스크 점수 | 해석 | 권장 행동 |
|------------|------|----------|
| 1-3 (LOW) | 변경 범위가 제한적이고 기존 패턴 내에서 처리 가능 | 일반 리뷰 프로세스 진행 |
| 4-6 (MEDIUM) | 복수 모듈에 영향, 테스트 업데이트 필요 | AI 권고사항 반영 여부 확인, PoC 권장 |
| 7-10 (HIGH) | 아키텍처 수준 변경, 장애 가능성 있음 | PoC 필수, 단계적 마이그레이션 계획 수립, 롤백 전략 상세화 |

> 관련: [04. 아키텍처 설계 패턴](./04_아키텍처_설계_패턴.md)에서 모듈 간 의존 관계를, [09. 장애 대응 및 Sentry 표준](./09_장애_대응_및_Sentry_표준.md)에서 롤백 전략 패턴을 참고할 수 있다.

---

## 4. RFC 승인 전 PoC 환경 자동 생성

Large 규모 RFC에서 제안한 변경을 승인 전에 Preview 환경에서 자동 검증한다. RFC에 PoC 브랜치를 연결하면 자동으로 인프라를 프로비저닝하고 검증 결과를 RFC Discussion에 게시한다.

### 4.1 PoC 환경 생성 워크플로우

```yaml
# .github/workflows/rfc-poc-environment.yml
# RFC Discussion에서 /poc 명령어를 코멘트로 입력하면
# 지정된 브랜치를 빌드하여 AWS에 Preview 환경을 자동 배포한다.
# 테스트와 벤치마크를 선택적으로 실행하고, 결과를 RFC Discussion에 게시한다.
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
    # RFC 라벨이 있는 이슈에서 /poc 명령어가 입력된 경우에만 실행
    if: |
      contains(github.event.issue.labels.*.name, 'rfc') &&
      startsWith(github.event.comment.body, '/poc')
    runs-on: ubuntu-latest
    steps:
      # /poc 명령어 파싱: 브랜치명과 옵션 플래그 추출
      - name: Parse PoC command
        id: parse
        uses: actions/github-script@v7
        with:
          script: |
            const body = context.payload.comment.body;
            // 사용법: /poc <브랜치명> [--run-tests] [--benchmark]
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

      # PoC 모드 환경 변수를 설정하여 빌드
      - name: Build PoC
        run: npm run build
        env:
          VITE_POC_MODE: "true"
          VITE_RFC_NUMBER: ${{ github.event.issue.number }}

      # AWS 자격증명 설정 (OIDC 기반 역할 전환)
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PREVIEW_ROLE_ARN }}
          aws-region: us-east-1

      # CDK로 PoC 전용 인프라 스택 배포 (S3 + CloudFront + OAC + Route53)
      - name: Deploy PoC CDK Stack
        id: deploy
        run: |
          npx cdk deploy "PocStack-RFC-${{ github.event.issue.number }}" \
            --context rfcNumber=${{ github.event.issue.number }} \
            --context branch=${{ steps.parse.outputs.branch }} \
            --require-approval never \
            --outputs-file cdk-outputs.json

          # CDK 출력에서 Preview URL 추출
          POC_URL=$(jq -r '.[].PreviewUrl' cdk-outputs.json)
          echo "poc_url=$POC_URL" >> "$GITHUB_OUTPUT"

      # 빌드 산출물을 S3에 동기화
      - name: Sync build to S3
        run: |
          BUCKET=$(jq -r '.[].BucketName' cdk-outputs.json)
          aws s3 sync dist/ "s3://${BUCKET}/" --delete

      # 테스트 실행 (--run-tests 플래그가 있을 때만)
      - name: Run tests (if requested)
        if: steps.parse.outputs.run_tests == 'true'
        id: tests
        run: |
          npm test -- --reporter=json > test-results.json 2>&1 || true
          echo "test_passed=$(jq '.success' test-results.json)" >> "$GITHUB_OUTPUT"

      # Lighthouse 벤치마크 실행 (--benchmark 플래그가 있을 때만)
      - name: Run benchmark (if requested)
        if: steps.parse.outputs.benchmark == 'true'
        id: benchmark
        run: |
          npx lighthouse "${{ steps.deploy.outputs.poc_url }}" \
            --output=json \
            --output-path=lighthouse.json \
            --chrome-flags="--headless --no-sandbox"
          echo "lh_performance=$(jq '.categories.performance.score' lighthouse.json)" >> "$GITHUB_OUTPUT"

      # PoC 배포 결과를 RFC Discussion 코멘트로 게시
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

            // PoC 환경은 7일 후 자동 만료
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

  # PoC 환경 수동 제거 작업
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

      # CDK 스택 강제 삭제로 모든 리소스 정리
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

**PoC 명령어 사용 예시:**

```
# RFC Discussion 코멘트에서 사용하는 명령어 예시

# 기본 PoC 배포 (빌드 + 배포만)
/poc feature/rfc-0012-preview-poc

# 테스트 포함 PoC 배포
/poc feature/rfc-0012-preview-poc --run-tests

# 테스트 + Lighthouse 벤치마크 포함 PoC 배포
/poc feature/rfc-0012-preview-poc --run-tests --benchmark

# PoC 환경 수동 삭제
/poc-destroy
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

> 관련: PoC 환경의 인프라 구성은 [10. 인프라 및 AWS CDK 가이드](./10_인프라_및_AWS_CDK_가이드.md)를, 성능 벤치마크 기준은 [08. 성능 최적화 가이드](./08_성능_최적화_가이드.md)를 참고한다. CI/CD 파이프라인 통합은 [11. CI/CD 파이프라인 표준](./11_CICD_파이프라인_표준.md)을 참고한다.

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
// RFC를 5개 차원으로 AI가 자동 평가하고, 결과를 RFC Discussion 코멘트로 게시하는 스크립트
// AI 점수는 참고 지표로만 활용하며, 최종 결정은 사람이 내린다.
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "@octokit/rest";
import * as fs from "fs";

// 개별 평가 차원의 점수와 근거를 담는 타입
interface ScoringDimension {
  name: string; // 차원 이름 (예: "기술 적합성")
  weight: number; // 가중치 (0.0 ~ 1.0)
  score: number; // 점수 (1-10)
  rationale: string; // 점수 부여 근거
  concerns: string[]; // 해당 차원에서의 우려사항 목록
}

// AI 투표 결과 전체를 담는 타입
interface AiVote {
  overallScore: number; // 가중 평균 점수 (1-10)
  recommendation: "approve" | "revise" | "reject"; // AI 권고 의견
  dimensions: ScoringDimension[]; // 5개 차원별 상세 점수
  keyStrengths: string[]; // 핵심 강점 3가지
  keyWeaknesses: string[]; // 핵심 약점 3가지
  questionsForAuthors: string[]; // 작성자에게 던지는 질문 목록
}

async function scoreRfc(issueNumber: number): Promise<void> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const anthropic = new Anthropic();

  const owner = process.env.GITHUB_REPOSITORY?.split("/")[0] ?? "";
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";

  // RFC 본문과 전체 코멘트(논의 이력) 수집
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
  // 각 코멘트를 "작성자: 내용(500자 제한)" 형식으로 요약
  const discussionSummary = comments.data
    .map(
      (c) =>
        `@${c.user?.login}: ${c.body?.slice(0, 500)}`,
    )
    .join("\n\n");

  // AI에게 5개 차원으로 RFC 점수화 요청
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-7-20260301",
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

  // AI 응답에서 JSON 추출
  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI scoring response");

  const vote: AiVote = JSON.parse(jsonMatch[0]);

  // 마크다운 형식으로 변환하여 RFC Discussion에 게시
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

  // Discussion에 점수 보고서 게시
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

// CLI 진입점
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

### 5.4 AI 점수와 사람 투표 불일치 처리

AI 점수와 사람 투표 결과가 크게 다른 경우, 반드시 아래 절차를 따른다.

| 불일치 유형 | 처리 절차 | 기록 요구사항 |
|------------|----------|-------------|
| AI 8+ / 사람 반대 | AI가 간과한 맥락(팀 문화, 정치적 요인 등)을 ADR에 기록 | "AI 불일치 사유" 섹션 필수 |
| AI 3- / 사람 찬성 | AI 우려사항 각각에 대한 해소 근거를 ADR에 기록 | 각 우려사항별 해소 근거 명시 |
| AI revise / 사람 즉시 승인 | AI가 제기한 수정 요청 사항의 수용/기각 근거 기록 | 수정 요청별 판단 근거 명시 |

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

**사용 예시 -- Zustand vs Jotai 비교:**

```text
아래 두 기술 중 우리 상황에 더 적합한 것을 분석해줘.

[기술 A]
- 이름: Zustand v5
- 주요 특징: 단순한 API, 미들웨어 지원, Redux DevTools 호환, 번들 크기 2KB

[기술 B]
- 이름: Jotai v2
- 주요 특징: 원자적 상태 관리, React Suspense 네이티브 지원, 파생 상태 자동 추적, 번들 크기 3KB

[우리 상황]
- 팀 규모: 6명 (주니어 2, 미드 3, 시니어 1)
- 기존 기술 스택: React 19, TypeScript, Vite, TanStack Query
- 서비스 특성: B2B SaaS, 복잡한 폼 + 대시보드, 동시접속 500명
- 주요 제약: 3개월 내 마이그레이션 완료, 기존 Zustand 스토어 35개
- 우선순위: 유지보수성 > 개발 속도 > 성능

[분석 요청]
1~5번 모두 수행
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
   - 2026년 새로 등장한 기술/접근법이 빠져있는가
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

### 프롬프트 6: RFC 초안 자동 생성

```text
아래 문제에 대한 RFC 초안을 작성해줘. 이 문서의 RFC 작성 템플릿(섹션 7) 형식을 따라줘.

[문제 상황]
{현재 겪고 있는 문제를 2-3문장으로 설명}

[기존 시도]
{이미 시도했거나 검토한 접근법이 있으면 기술}

[제약 조건]
- 팀 규모: {N명}
- 일정: {가용 기간}
- 기술 스택: {현재 사용 중인 기술}
- 예산: {인프라/라이선스 예산 제약}

[출력 요청]
- RFC 작성 템플릿의 모든 섹션을 채워줘
- 대안은 최소 3개를 비교하고, 의사결정 매트릭스를 포함해줘
- 각 대안의 PoC 검증 범위도 제안해줘
- 성공 지표는 정량적으로 측정 가능하게 작성해줘
```

### 프롬프트 7: AI 회의록을 RFC Draft로 변환 (2026 추가)

> Tactiq, Granola, Fathom 등 AI 회의록 도구의 transcript와 액션 아이템을 RFC 초안으로 자동 변환할 때 사용한다. 2026년 다수 팀이 "RFC 회의 -> 트랜스크립트 -> AI가 RFC Draft 생성" 파이프라인을 운영한다.

```text
아래 회의 트랜스크립트와 액션 아이템을 분석해 RFC 초안 섹션을 생성해줘.

[회의 메타]
- 일시: {YYYY-MM-DD HH:MM}
- 참석자: {이름과 역할}
- 회의 목적: {기술 의사결정 / 아키텍처 리뷰 / 문제 정의 등}

[트랜스크립트 요약]
{AI 회의록 도구가 생성한 트랜스크립트 또는 요약 붙여넣기}

[액션 아이템]
{회의록 도구가 추출한 액션 아이템 목록}

[변환 요청]
1. "동기(Motivation)" 섹션
   - 트랜스크립트에서 언급된 문제점을 정량/정성 근거로 분류
   - "현재 상황 -> 문제점 -> 목표" 구조로 정리

2. "제안(Proposal)" 섹션
   - 회의에서 합의된 방향을 핵심 제안으로 정리
   - 불확실하거나 추가 논의가 필요한 부분은 [확인 필요] 태그 부착

3. "대안(Alternatives)" 섹션
   - 회의에서 거론된 다른 옵션을 표 형태로 정리
   - 회의에서 다루지 않은 명백한 대안이 있으면 추가 제안

4. "리스크" 섹션
   - 참석자가 제기한 우려사항을 가능성/영향도로 분류

5. "후속 액션 아이템"
   - 회의에서 도출된 액션을 RFC 챔피언/리뷰어 후보와 함께 정리

발화자 이름은 @{GitHub ID} 형태로 변환하고, 결정되지 않은 사항은 "TODO"로 명시해줘.
```

> 관련: AI 프롬프트 활용에 대한 추가 가이드는 [18. AI 개발 워크플로우 종합](./18_AI_개발_워크플로우_종합.md)을 참고한다.

---

## 7. RFC 작성 템플릿

> **2026년 RFC/ADR 템플릿 표준:** 본 가이드의 ADR 변환 스크립트는 [MADR 4.0](https://adr.github.io/madr/) (2024-09 릴리스)을 기본 포맷으로 사용한다. MADR 4.0의 주요 변경점은 "Deciders" -> "Decision Maker(s)" 명칭 변경과 "Validation" -> "Confirmation"의 Decision Outcome 하위 요소화이다. 외부 도구(Linear/Height/Notion)와 연동 시에도 ADR의 Single Source of Truth는 Git 저장소(`docs/adr/`)에 유지한다.

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
| 외부 도구 링크 | (있는 경우) Linear 프로젝트 / Height 워크스트림 / Notion 페이지 URL |
| PoC 브랜치 | (있는 경우) feature/rfc-XXX-poc |
| AI 보조 | 사용 도구명 및 활용 범위 (예: Claude Sonnet 4.7, Cursor Composer 2.5) |

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

### 8.2 역할별 상세 책임

| 역할 | 누가 맡는가 | 핵심 책임 |
|------|------------|----------|
| **작성자 (Author)** | RFC를 제안하는 엔지니어 | RFC 초안 작성, 리뷰 피드백 반영, PoC 구현, 구현 추적 |
| **챔피언 (Champion)** | 작성자가 지정한 시니어 엔지니어 | RFC 품질 보증, 리뷰 프로세스 진행, 쟁점 중재, 일정 관리 |
| **리뷰어 (Reviewer)** | 팀원 (규모별 최소 인원 충족) | 비동기 코멘트, 기술적 검증, 투표 참여 |
| **승인권자 (Approver)** | 규모별 상이 (챔피언/테크리드/CTO) | 최종 승인/기각 결정, ADR 확정 |
| **AI** | Claude Code, GitHub Actions | 자동 분석, 점수화, ADR 변환, PoC 환경 관리 |

### 8.3 승인 기준

| RFC 규모 | 승인 요건 | 승인권자 | AI 점수 조건 |
|---------|----------|---------|------------|
| Small | 리뷰어 2명 승인 | 챔피언 | 참고만 |
| Medium | 리뷰어 3명 승인 + 시니어 1명 | 테크 리드 | 4점 미만 시 재논의 |
| Large | 리뷰어 5명 승인 + 아키텍처 리뷰 + PoC 검증 | 아키텍트 / CTO | 4점 미만 시 반드시 AI 우려사항 해소 기록 |

### 8.4 분쟁 해결

1. **1단계**: 작성자-리뷰어 간 Discussion 스레드 논의
2. **2단계**: AI에게 교착 상태 해소 분석 요청 (프롬프트 4 활용)
3. **3단계**: 챔피언 중재 (동기 회의, 30분 제한)
4. **4단계**: 테크 리드 최종 결정 (결정 사유 기록 필수)

> 관련: 코드 리뷰 과정에서의 분쟁 해결은 [16. AI 협업 코드리뷰 가이드](./16_AI_협업_코드리뷰_가이드.md)를, 신규 입사자의 RFC 프로세스 온보딩은 [17. 신규 입사자 온보딩 가이드](./17_신규_입사자_온보딩_가이드.md)를 참고한다.

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

## 10. RFC 프로세스 체크리스트

### 10.1 RFC 작성자 체크리스트

**RFC 제출 전 (Draft):**

- [ ] 문제 상황을 정량적 데이터와 함께 기술했는가
- [ ] 최소 3개 이상의 대안을 비교했는가 ("아무것도 하지 않는" 옵션 포함)
- [ ] 의사결정 매트릭스의 가중치 근거를 명시했는가
- [ ] 민감도 분석을 수행했는가 (가중치 +-10% 변경 시 결론 변화 여부)
- [ ] 롤백 계획을 구체적으로 기술했는가
- [ ] 성공 지표가 정량적이고 측정 가능한가
- [ ] 비목표(Non-goals)를 명시하여 범위를 한정했는가
- [ ] RFC 규모(Small/Medium/Large)를 적절히 판단했는가
- [ ] 챔피언을 지정했는가

**리뷰 단계 (Review):**

- [ ] AI 영향도 분석 결과를 검토하고 보완했는가
- [ ] 리뷰어 코멘트에 모두 응답했는가
- [ ] 미해결 블로커가 없는가
- [ ] PoC 검증이 필요한 경우 PoC를 수행했는가
- [ ] AI 점수 보고서의 우려사항에 대한 해소 근거를 기록했는가

**승인 후 (Accepted):**

- [ ] ADR이 자동 생성되었는가 (또는 수동으로 작성했는가)
- [ ] 구현 추적 이슈가 생성되었는가
- [ ] 구현 일정이 프로젝트 보드에 반영되었는가

### 10.2 챔피언 체크리스트

- [ ] RFC 초안의 품질이 리뷰에 충분한 수준인가
- [ ] 적절한 리뷰어가 지정되었는가 (규모별 최소 인원 충족)
- [ ] 리뷰 기간이 규모에 맞게 설정되었는가 (Small 3일, Medium 5일, Large 10일)
- [ ] AI 분석 결과가 Discussion에 게시되었는가
- [ ] 쟁점이 있는 경우 동기 회의를 30분 이내로 타임박싱했는가
- [ ] 투표 결과와 AI 점수를 통합하여 의사결정 기준에 따라 처리했는가
- [ ] 불일치 사유(AI vs 사람)가 있는 경우 ADR에 기록했는가

### 10.3 리뷰어 체크리스트

- [ ] RFC의 문제 정의가 명확하고 데이터 기반인가
- [ ] 제안된 해결책이 문제를 실제로 해결하는가
- [ ] 대안 분석이 공정하게 이루어졌는가 (확증 편향 없는가)
- [ ] 영향 범위가 정확히 파악되었는가
- [ ] 리스크와 대응 전략이 현실적인가
- [ ] 구현 일정이 현실적인가
- [ ] 성공 지표가 적절한가

### 10.4 프로세스 건강성 지표

팀 RFC 프로세스의 건강성을 주기적으로 점검하는 지표:

| 지표 | 건강한 범위 | 경고 신호 |
|------|-----------|----------|
| RFC 평균 리뷰 기간 | 규모별 가이드라인 +-2일 | 가이드라인 2배 초과 |
| RFC 승인률 | 50-80% | 90% 초과 (기준 너무 낮음) 또는 30% 미만 (기준 너무 높음) |
| 리뷰어 참여율 | 지정된 리뷰어 80% 이상 참여 | 50% 미만 참여 |
| ADR 변환 완료율 | 승인 후 3영업일 이내 100% | 1주 이상 미변환 ADR 존재 |
| RFC 대비 구현 완료율 | 승인된 RFC 80% 이상 구현 | 6개월 이상 미구현 RFC 존재 |
| AI 분석 실행률 | 100% (자동) | CI 오류로 분석 누락 |

### 10.5 AI 회의록 -> RFC 자동화 체크리스트 (2026 추가)

AI 회의록 도구(Tactiq, Granola, Fathom 등)를 RFC 프로세스에 통합할 때 점검할 항목:

- [ ] 회의록 도구가 봇리스(botless) 모드를 지원하는가 (Granola, Tactiq personal은 봇 참여 없이 캡처 가능)
- [ ] 트랜스크립트와 액션 아이템을 외부 API/Webhook으로 노출할 수 있는가
- [ ] 회의록의 외부 LLM 전송이 회사 데이터 정책에 부합하는가 (민감 회의는 botless 또는 온프렘 옵션 필수)
- [ ] 자동 생성된 RFC Draft에 "AI 보조" 메타 필드가 명시되는가 (생성 도구 + 사람 검토자 포함)
- [ ] 발화자 식별이 GitHub ID로 자동 매핑되는가 (HR 시스템 연동 또는 수동 매핑 테이블)
- [ ] RFC Draft 생성 후 작성자/챔피언이 24시간 이내 사람의 눈으로 검토하는 절차가 있는가
- [ ] 회의록 원본은 RFC Discussion의 첨부 또는 외부 링크로 참조 가능한가 (감사 추적용)

---

## 11. 2026 운영 사례 및 도구 통합

### 11.1 외부 도구 통합 매트릭스

2026년 시점의 RFC/ADR 관련 도구 통합 옵션을 정리한다. 단일 도구로 전체를 운영하기보다, GitHub Discussions를 SSoT로 두고 워크스트림 도구를 보완재로 사용하는 패턴이 권장된다.

| 도구 | 2026.05 시점 위치 | RFC 워크플로우 활용 | 주의 사항 |
|------|------------------|--------------------|----------|
| **Linear** | AI 트리아지(Triage Intelligence)로 라벨/담당자/프로젝트 자동 추천. Cursor, Devin 등 외부 에이전트와 Linear MCP로 연동. | RFC 이슈를 Linear Project로 묶고 구현 추적용 서브이슈를 AI가 자동 생성. | Linear는 본문 SSoT가 아니며, RFC 본문은 GitHub Discussions/ADR에 유지. |
| **Notion Developer Platform 3.5** | 2026.05.13 공식 출시. Workers(2026.08.11부터 Notion credits 기반), Database Sync, External Agents API 제공. Claude Code, Codex, Cursor, Decagon이 출시 시점 지원 에이전트. | RFC 본문을 Notion DB로 노출 + ADR 변환을 Notion Worker로 자동화 + External Agent로 검토자 호출. | External Agents API는 워크스페이스 참여자로 등록되므로 권한/감사 범위 설계 필요. |
| **Tactiq / Granola / Fathom** | 2026년 모두 botless 캡처 지원(개인 정책 회피). Granola는 Notion/Obsidian/Linear/Jira/Slack 통합. | RFC 회의 트랜스크립트를 RFC Draft로 자동 변환 (프롬프트 7 활용). | 민감 회의는 botless로 캡처하더라도 외부 LLM 호출이 발생하므로 정책 확인 필요. |
| **Atlassian Confluence + Jira** | 기존 RFC를 Confluence에 유지하는 조직 다수. | Jira 이슈와 RFC 양방향 링크 자동 생성. | Confluence는 코드 근접성이 낮아 PoC/CI 자동화는 GitHub Actions 병행 필요. |
| **MADR 4.0** | 2024.09 릴리스. 2026.05 시점 가장 널리 쓰이는 ADR 템플릿. | Discussion -> ADR 변환 스크립트의 기본 포맷. | MADR 3.0 -> 4.0 마이그레이션 시 "Deciders" -> "Decision Maker(s)", "Validation" -> "Confirmation"(Decision Outcome 하위) 변경 반영 필요. |

### 11.2 운영 사례 박스

> **사례 1 -- Notion Developer Platform 3.5 출시 (2026.05.13)**
> Notion이 워크스페이스를 AI 에이전트 허브로 전환하는 Developer Platform 3.5를 공식 출시했다. Workers(코드 런타임), Database Sync(Salesforce/Zendesk/Postgres 등 외부 DB 동기화), External Agents API(Claude Code, Codex, Cursor, Decagon 등 외부 에이전트를 워크스페이스 참여자로 등록) 3종 세트가 동시 공개되었다. 2026.08.11부터 Workers는 Notion credits 기반 과금으로 전환된다. 출시 직후 다수 SaaS 팀이 "Notion DB의 RFC를 External Agent가 검토 -> 코멘트로 영향도 분석 -> 사람 승인 후 Worker가 Git ADR로 동기화"하는 파이프라인을 구축하고 있다는 보고가 이어지고 있다. 본 가이드의 GitHub Discussions 기반 워크플로우와 직접 충돌하지 않으며, "ADR SSoT는 Git 저장소" 원칙을 유지하면 보완재로 활용 가능하다.

> **사례 2 -- Linear MCP 기반 AI 에이전트 통합**
> Linear는 2026년 Triage Intelligence로 RFC 관련 이슈의 라벨/담당자/프로젝트를 팀 히스토리 기반으로 자동 추천한다. 또한 Linear Mission Control Plane(MCP)을 통해 Cursor, Devin 같은 외부 코딩 에이전트를 Linear 이슈에서 직접 할당할 수 있다. 다수 팀이 "RFC 승인 -> Linear 프로젝트 자동 생성 -> 서브이슈를 AI가 생성 -> Cursor/Devin이 구현 -> PR이 RFC Issue에 자동 링크"되는 흐름을 구성하고 있다. RFC의 본문 SSoT는 GitHub Discussions/ADR이고, Linear는 구현 추적용 워크스트림으로 사용하는 분리 패턴이 권장된다.

> **사례 3 -- 안티 패턴: ADR 폐기 비율**
> 2026년 다수 사후 분석에서 "거의 모든 팀이 ADR을 시도했지만 2년 뒤에도 유지하는 팀은 거의 없다"는 지적이 반복되고 있다. 실패 원인은 ADR 도구가 아니라 운영 관행(어디에 둘 것인가, 언제 작성할 것인가, 누가 리뷰할 것인가, 현실이 바뀌었을 때 어떻게 업데이트할 것인가)이다. 본 가이드의 `Discussion -> ADR 자동 변환 + 라벨 자동 전환 + 구현 추적 이슈 자동 생성` 조합이 이 위험을 완화하기 위한 설계이다.

### 11.3 회의록 -> RFC Draft 자동 변환 워크플로우

AI 회의록 도구의 Webhook(예: Granola export, Tactiq webhook, Fathom API)을 받아 RFC Draft 이슈를 생성하는 GitHub Actions 예제이다.

```yaml
# .github/workflows/meeting-to-rfc.yml
# 용도: AI 회의록 도구(Tactiq/Granola/Fathom) Webhook -> RFC Draft 자동 생성
# 트리거: repository_dispatch 이벤트 (회의록 도구가 Webhook으로 호출)
name: Meeting Notes to RFC Draft

on:
  repository_dispatch:
    types: [meeting-notes-published]

permissions:
  issues: write
  contents: read

jobs:
  create-rfc-draft:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - run: npm ci

      # 회의록 도구가 보낸 payload 구조 예시:
      # {
      #   "meeting_id": "tactiq-xxxx",
      #   "title": "Q2 상태관리 라이브러리 의사결정 회의",
      #   "started_at": "2026-05-20T10:00:00Z",
      #   "participants": [{"name": "...", "github_id": "..."}],
      #   "transcript_url": "https://...",
      #   "summary": "...",
      #   "action_items": [...]
      # }
      - name: Generate RFC Draft via AI
        id: draft
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          # client_payload는 repository_dispatch 트리거가 제공하는 임의 JSON
          MEETING_PAYLOAD: ${{ toJSON(github.event.client_payload) }}
        run: npx ts-node scripts/meeting-to-rfc-draft.ts

      # AI가 생성한 RFC Draft를 GitHub Issue로 등록
      # rfc-draft, ai-generated, needs-review 라벨을 함께 부여하여
      # "사람 검토 대기" 상태임을 명확히 한다.
      - name: Create RFC Draft issue
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const draft = JSON.parse(fs.readFileSync('rfc-draft.json', 'utf-8'));

            // 회의록 원본 URL을 메타에 포함하여 감사 추적성을 보장한다.
            const meetingUrl = ${{ toJSON(github.event.client_payload.transcript_url) }};
            const meetingTitle = ${{ toJSON(github.event.client_payload.title) }};

            const body = [
              `> AI가 회의록을 기반으로 자동 생성한 RFC Draft입니다.`,
              `> 24시간 이내에 작성자/챔피언이 사람의 눈으로 검토해 주세요.`,
              ``,
              `## Source Meeting`,
              `- Title: ${meetingTitle}`,
              `- Transcript: ${meetingUrl}`,
              `- Generated at: ${new Date().toISOString()}`,
              ``,
              `---`,
              ``,
              draft.body,
            ].join('\n');

            const issue = await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[RFC Draft - AI] ${draft.title}`,
              body,
              // ai-generated 라벨은 코드 리뷰/감사 시 AI 보조 여부를 식별하는 용도
              labels: ['rfc', 'rfc-draft', 'ai-generated', 'needs-review'],
              assignees: draft.suggestedChampion ? [draft.suggestedChampion] : [],
            });

            core.setOutput('issue_number', issue.data.number);
            core.setOutput('issue_url', issue.data.html_url);
```

> **운영 권장 사항:** AI 생성 RFC Draft는 반드시 `needs-review` 라벨로 시작하고, 작성자/챔피언이 24시간 이내 검토 후 `needs-review`를 제거하도록 운영한다. 검토 없이 곧바로 `rfc-review` 단계로 진입하면, AI 환각(hallucination)이 의사결정 매트릭스에 그대로 반영되는 위험이 있다.

---

*본 문서는 범용 RFC 프로세스 가이드이며, 조직의 규모와 문화에 맞게 조정하여 사용할 수 있다. 관련 가이드: [00. 종합 가이드 목차](./00_종합_가이드_목차.md) | [04. 아키텍처 설계 패턴](./04_아키텍처_설계_패턴.md) | [14. 배포 프로세스 체크리스트](./14_배포_프로세스_체크리스트.md) | [16. AI 협업 코드리뷰 가이드](./16_AI_협업_코드리뷰_가이드.md)*
