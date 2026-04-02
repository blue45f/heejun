# RFC 및 표준화 문서 종합 가이드 (2026 Edition)

> **최종 갱신**: 2026-04-01
> **핵심 키워드**: AI 기반 표준 수립/검증, Biome 2.0, 멀티 베타 인프라 표준, 프론트엔드 특화 컨벤션

---

## 1. RFC 프로세스 개요

### 1.1 RFC 라이프사이클

```
Draft → Review → AI 검증 → 투표 → Accepted/Rejected → Implementation → Deprecated
```

| 단계 | 소요 기간 | 필수 참여자 | AI 역할 |
|------|-----------|-------------|---------|
| Draft | 1-3일 | 작성자 | 초안 생성 보조, 유사 RFC 탐색 |
| Review | 3-5일 | 팀 전원 | 영향 범위 분석, 호환성 검증 |
| AI 검증 | 자동 | CI | 표준 충돌 감지, 보안 스캔 |
| 투표 | 2일 | 팀 전원 | 의견 요약, 쟁점 정리 |
| Implementation | 스프린트 내 | 담당자 | 코드 생성, 표준 준수 검증 |

### 1.2 RFC 문서 템플릿

```markdown
# RFC-{번호}: {제목}

## 메타데이터
- **작성자**:
- **상태**: Draft | Review | Accepted | Rejected | Deprecated
- **생성일**:
- **AI 검증 결과**: Pass | Fail | Pending

## 요약
1-2문장으로 핵심 제안을 기술한다.

## 동기
왜 이 변경이 필요한가?

## 상세 설계
구체적인 구현 방안을 기술한다.

## AI 영향도 분석
- AI 코드 생성에 미치는 영향
- 기존 프롬프트 라이브러리 수정 필요 여부

## 대안
검토했으나 채택하지 않은 대안과 그 이유.

## 마이그레이션 전략
기존 코드의 점진적 전환 계획.
```

---

## 2. AI 활용 표준

### 2.1 AI 코드 생성 품질 기준

#### Hallucination 탐지

AI가 생성한 코드에서 존재하지 않는 API, 잘못된 타입, 가상의 라이브러리를 탐지한다.

```typescript
// hallucination-detector.ts
interface HallucinationCheckResult {
  file: string;
  line: number;
  type: 'phantom-api' | 'invalid-type' | 'nonexistent-package' | 'deprecated-usage';
  description: string;
  confidence: number;
  suggestion: string;
}

interface HallucinationDetectorConfig {
  packageRegistry: string;
  typeDefinitionPaths: string[];
  apiInventoryPath: string;
  confidenceThreshold: number;
}

async function detectHallucinations(
  generatedCode: string,
  config: HallucinationDetectorConfig,
): Promise<HallucinationCheckResult[]> {
  const results: HallucinationCheckResult[] = [];

  // 1. import된 패키지가 실제 레지스트리에 존재하는지 확인
  const imports = parseImports(generatedCode);
  for (const imp of imports) {
    const exists = await checkPackageExists(imp.packageName, config.packageRegistry);
    if (!exists) {
      results.push({
        file: imp.file,
        line: imp.line,
        type: 'nonexistent-package',
        description: `패키지 "${imp.packageName}"이 레지스트리에 존재하지 않음`,
        confidence: 0.95,
        suggestion: `유사 패키지 확인: ${await findSimilarPackages(imp.packageName)}`,
      });
    }
  }

  // 2. 호출된 API가 해당 패키지에 실제로 존재하는지 확인
  const apiCalls = parseApiCalls(generatedCode);
  for (const call of apiCalls) {
    const valid = await validateApiExists(call, config.apiInventoryPath);
    if (!valid) {
      results.push({
        file: call.file,
        line: call.line,
        type: 'phantom-api',
        description: `"${call.fullName}"은 해당 모듈에 존재하지 않는 API`,
        confidence: 0.9,
        suggestion: `사용 가능한 API: ${await listAvailableApis(call.module)}`,
      });
    }
  }

  // 3. deprecated API 사용 탐지
  const deprecatedUsages = await checkDeprecatedUsage(generatedCode, config.typeDefinitionPaths);
  results.push(...deprecatedUsages);

  return results.filter((r) => r.confidence >= config.confidenceThreshold);
}
```

#### 라이선스 검증

```typescript
// license-validator.ts
interface LicensePolicy {
  allowed: string[];
  restricted: string[];
  requireApproval: string[];
  maxTransitiveDependencyDepth: number;
}

interface LicenseViolation {
  package: string;
  version: string;
  license: string;
  violationType: 'restricted' | 'approval-required' | 'unknown' | 'copyleft-contamination';
  dependencyChain: string[];
}

const DEFAULT_POLICY: LicensePolicy = {
  allowed: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'BlueOak-1.0.0'],
  restricted: ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'SSPL-1.0', 'BUSL-1.1'],
  requireApproval: ['MPL-2.0', 'LGPL-2.1', 'LGPL-3.0', 'CPAL-1.0'],
  maxTransitiveDependencyDepth: 5,
};

async function validateLicenses(
  lockfilePath: string,
  policy: LicensePolicy = DEFAULT_POLICY,
): Promise<LicenseViolation[]> {
  const dependencies = await parseLockfile(lockfilePath);
  const violations: LicenseViolation[] = [];

  for (const dep of dependencies) {
    const license = await resolveLicense(dep);

    if (policy.restricted.includes(license)) {
      violations.push({
        package: dep.name,
        version: dep.version,
        license,
        violationType: 'restricted',
        dependencyChain: dep.chain,
      });
    } else if (policy.requireApproval.includes(license)) {
      violations.push({
        package: dep.name,
        version: dep.version,
        license,
        violationType: 'approval-required',
        dependencyChain: dep.chain,
      });
    } else if (!policy.allowed.includes(license)) {
      violations.push({
        package: dep.name,
        version: dep.version,
        license,
        violationType: 'unknown',
        dependencyChain: dep.chain,
      });
    }
  }

  return violations;
}
```

#### AI 생성 코드 보안 검토

```typescript
// ai-security-review.ts
interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  location: { file: string; startLine: number; endLine: number };
  cweId?: string;
  remediation: string;
}

const AI_SPECIFIC_SECURITY_RULES = [
  {
    id: 'AI-SEC-001',
    name: 'Prompt Injection via User Input',
    pattern: /(?:prompt|message|instruction)\s*[+=]\s*(?:req\.|params\.|query\.|body\.)/,
    severity: 'critical' as const,
    cweId: 'CWE-77',
    remediation: '사용자 입력을 AI 프롬프트에 직접 삽입하지 말 것. 반드시 새니타이징 후 사용.',
  },
  {
    id: 'AI-SEC-002',
    name: 'Hardcoded API Key',
    pattern: /(?:api[_-]?key|secret|token)\s*[:=]\s*['"`][A-Za-z0-9_\-]{20,}['"`]/i,
    severity: 'critical' as const,
    cweId: 'CWE-798',
    remediation: '환경 변수 또는 시크릿 매니저를 사용할 것.',
  },
  {
    id: 'AI-SEC-003',
    name: 'Unvalidated Dynamic Import',
    pattern: /import\(\s*(?:req\.|params\.|query\.|body\.)/,
    severity: 'high' as const,
    cweId: 'CWE-94',
    remediation: '동적 import 경로에 사용자 입력을 직접 사용하지 말 것.',
  },
  {
    id: 'AI-SEC-004',
    name: 'AI Output Direct Rendering',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*(?:aiResponse|generated|completion)/,
    severity: 'high' as const,
    cweId: 'CWE-79',
    remediation: 'AI 응답을 HTML로 직접 렌더링하지 말 것. DOMPurify 등으로 새니타이징.',
  },
];

async function reviewAiGeneratedCode(
  code: string,
  filePath: string,
): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];
  const lines = code.split('\n');

  for (const rule of AI_SPECIFIC_SECURITY_RULES) {
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) {
        findings.push({
          severity: rule.severity,
          category: rule.name,
          description: `[${rule.id}] ${rule.name} 탐지`,
          location: { file: filePath, startLine: index + 1, endLine: index + 1 },
          cweId: rule.cweId,
          remediation: rule.remediation,
        });
      }
    });
  }

  return findings;
}
```

### 2.2 AI 리뷰 정책

```typescript
// ai-review-policy.ts
interface AiReviewPolicy {
  autoApproveThreshold: number;
  humanReviewThreshold: number;
  maxAutoApprovedFiles: number;
  excludePatterns: string[];
  requireHumanForCategories: string[];
}

const DEFAULT_AI_REVIEW_POLICY: AiReviewPolicy = {
  autoApproveThreshold: 95,
  humanReviewThreshold: 70,
  maxAutoApprovedFiles: 10,
  excludePatterns: [
    '**/*.lock',
    '**/migrations/**',
    '**/*.generated.*',
  ],
  requireHumanForCategories: [
    'security',
    'authentication',
    'payment',
    'data-deletion',
    'cryptography',
    'infrastructure',
  ],
};

interface AiReviewResult {
  score: number;
  category: string;
  findings: Array<{
    type: 'suggestion' | 'warning' | 'error';
    message: string;
    line?: number;
  }>;
  requiresHumanReview: boolean;
  reasoning: string;
}

function evaluateReviewResult(
  result: AiReviewResult,
  policy: AiReviewPolicy,
  changedFiles: string[],
): { approved: boolean; reason: string } {
  if (policy.requireHumanForCategories.includes(result.category)) {
    return {
      approved: false,
      reason: `"${result.category}" 카테고리는 반드시 사람 리뷰가 필요합니다.`,
    };
  }

  if (changedFiles.length > policy.maxAutoApprovedFiles) {
    return {
      approved: false,
      reason: `변경 파일 ${changedFiles.length}개가 자동 승인 한도(${policy.maxAutoApprovedFiles})를 초과합니다.`,
    };
  }

  if (result.score >= policy.autoApproveThreshold) {
    return { approved: true, reason: `AI 점수 ${result.score}점으로 자동 승인.` };
  }

  if (result.score < policy.humanReviewThreshold) {
    return {
      approved: false,
      reason: `AI 점수 ${result.score}점으로 사람 리뷰가 필요합니다.`,
    };
  }

  return {
    approved: false,
    reason: `AI 점수 ${result.score}점 (${policy.humanReviewThreshold}-${policy.autoApproveThreshold} 구간). 사람 확인 권장.`,
  };
}
```

### 2.3 프롬프트 라이브러리 관리

```typescript
// prompt-library.ts
interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  category: 'standard-creation' | 'standard-validation' | 'code-generation' | 'review' | 'refactor';
  template: string;
  variables: Array<{ name: string; description: string; required: boolean }>;
  expectedOutputFormat: string;
  qualityScore: number;
  lastValidated: string;
}

const STANDARD_PROMPTS: PromptTemplate[] = [
  {
    id: 'std-001',
    name: '프로젝트 맞춤 코딩 컨벤션 생성',
    version: '2.0.0',
    category: 'standard-creation',
    template: `당신은 시니어 소프트웨어 아키텍트입니다.
다음 프로젝트 정보를 기반으로 코딩 컨벤션을 생성해주세요.

## 프로젝트 정보
- 프레임워크: {{framework}}
- 언어: {{language}}
- 팀 규모: {{teamSize}}명
- 기존 코드 스타일 샘플:
\`\`\`
{{codeSample}}
\`\`\`

## 요구사항
1. 네이밍 규칙 (변수, 함수, 컴포넌트, 파일)
2. 디렉토리 구조 표준
3. import 순서 규칙
4. 에러 핸들링 패턴
5. 주석 작성 기준
6. Biome 2.0 설정으로 변환 가능한 규칙 목록

출력은 Markdown 형식으로, 각 규칙에 올바른 예시와 잘못된 예시를 포함해주세요.`,
    variables: [
      { name: 'framework', description: '사용 프레임워크', required: true },
      { name: 'language', description: '프로그래밍 언어', required: true },
      { name: 'teamSize', description: '팀 인원 수', required: true },
      { name: 'codeSample', description: '기존 코드 스타일 샘플', required: false },
    ],
    expectedOutputFormat: 'markdown',
    qualityScore: 92,
    lastValidated: '2026-03-15',
  },
  {
    id: 'std-002',
    name: '표준 위반 검사',
    version: '2.0.0',
    category: 'standard-validation',
    template: `다음 코드가 우리 프로젝트의 코딩 표준을 위반하는지 검사해주세요.

## 프로젝트 표준
{{standards}}

## 검사 대상 코드
\`\`\`{{language}}
{{code}}
\`\`\`

## 출력 형식
각 위반에 대해 다음 형식으로 보고해주세요:
- **위반 규칙**: 규칙 ID와 이름
- **위치**: 라인 번호
- **심각도**: error | warning | info
- **설명**: 왜 위반인지
- **수정 예시**: 올바른 코드

위반이 없으면 "모든 표준을 준수합니다."라고 응답해주세요.`,
    variables: [
      { name: 'standards', description: '프로젝트 코딩 표준 문서', required: true },
      { name: 'language', description: '코드 언어', required: true },
      { name: 'code', description: '검사 대상 코드', required: true },
    ],
    expectedOutputFormat: 'structured-list',
    qualityScore: 88,
    lastValidated: '2026-03-20',
  },
  {
    id: 'std-003',
    name: 'RFC 영향도 분석',
    version: '1.0.0',
    category: 'standard-creation',
    template: `다음 RFC 제안이 기존 코드베이스에 미치는 영향을 분석해주세요.

## RFC 내용
{{rfcContent}}

## 현재 코드베이스 통계
- 총 파일 수: {{totalFiles}}
- 주요 패턴: {{patterns}}
- 의존성 그래프: {{dependencyGraph}}

## 분석 항목
1. 영향 받는 파일 수 추정
2. 마이그레이션 난이도 (1-10)
3. 예상 소요 시간
4. 위험 요소
5. 단계별 마이그레이션 전략

JSON 형식으로 출력해주세요.`,
    variables: [
      { name: 'rfcContent', description: 'RFC 문서 내용', required: true },
      { name: 'totalFiles', description: '코드베이스 파일 수', required: true },
      { name: 'patterns', description: '주요 코드 패턴', required: false },
      { name: 'dependencyGraph', description: '의존성 그래프 요약', required: false },
    ],
    expectedOutputFormat: 'json',
    qualityScore: 85,
    lastValidated: '2026-03-10',
  },
];

function renderPrompt(template: PromptTemplate, variables: Record<string, string>): string {
  let rendered = template.template;

  for (const v of template.variables) {
    const value = variables[v.name];
    if (v.required && !value) {
      throw new Error(`필수 변수 "${v.name}"이 누락되었습니다.`);
    }
    rendered = rendered.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), value ?? '');
  }

  return rendered;
}

function getPromptsByCategory(category: PromptTemplate['category']): PromptTemplate[] {
  return STANDARD_PROMPTS
    .filter((p) => p.category === category)
    .sort((a, b) => b.qualityScore - a.qualityScore);
}
```

---

## 3. Biome 2.0 기반 포맷팅/린팅 표준

### 3.1 Biome 2.0 설정

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": {
    "enabled": true,
    "groups": [
      ["builtin"],
      ["external"],
      ["internal"],
      ["parent", "sibling", "index"],
      ["type"]
    ]
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "error",
          "options": { "maxAllowedComplexity": 15 }
        },
        "noVoid": "error",
        "useLiteralKeys": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "warn",
        "noUndeclaredVariables": "error"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error",
        "useShorthandArrayType": "error",
        "useTemplate": "error",
        "useImportType": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noConsoleLog": "warn",
        "noDebugger": "error"
      },
      "security": {
        "noDangerouslySetInnerHtml": "error"
      },
      "nursery": {
        "useSortedClasses": "warn",
        "noBarrelFile": "warn"
      },
      "performance": {
        "noAccumulatingSpread": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  },
  "css": {
    "formatter": {
      "enabled": true,
      "indentStyle": "space",
      "indentWidth": 2
    },
    "linter": {
      "enabled": true
    }
  },
  "json": {
    "formatter": {
      "enabled": true,
      "trailingCommas": "none"
    }
  },
  "overrides": [
    {
      "include": ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"
          }
        }
      }
    },
    {
      "include": ["**/scripts/**"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsoleLog": "off"
          }
        }
      }
    }
  ]
}
```

### 3.2 ESLint에서 Biome 2.0으로의 마이그레이션

```typescript
// migrate-to-biome.ts
interface MigrationReport {
  migratedRules: Array<{ eslintRule: string; biomeRule: string }>;
  unsupportedRules: Array<{ eslintRule: string; reason: string; alternative: string }>;
  manualReviewRequired: Array<{ eslintRule: string; note: string }>;
  estimatedEffort: string;
}

async function analyzeMigration(eslintConfigPath: string): Promise<MigrationReport> {
  const eslintConfig = await loadEslintConfig(eslintConfigPath);
  const report: MigrationReport = {
    migratedRules: [],
    unsupportedRules: [],
    manualReviewRequired: [],
    estimatedEffort: '',
  };

  const ruleMapping: Record<string, string> = {
    'no-unused-vars': 'correctness/noUnusedVariables',
    'no-console': 'suspicious/noConsoleLog',
    'no-debugger': 'suspicious/noDebugger',
    'prefer-const': 'style/useConst',
    'prefer-template': 'style/useTemplate',
    'no-var': 'style/noVar',
    '@typescript-eslint/no-explicit-any': 'suspicious/noExplicitAny',
    '@typescript-eslint/no-unused-vars': 'correctness/noUnusedVariables',
    'react/no-danger': 'security/noDangerouslySetInnerHtml',
    'import/order': 'organizeImports (built-in)',
    'import/no-duplicates': 'correctness/noDuplicateImports',
  };

  for (const [rule, _config] of Object.entries(eslintConfig.rules ?? {})) {
    if (ruleMapping[rule]) {
      report.migratedRules.push({
        eslintRule: rule,
        biomeRule: ruleMapping[rule],
      });
    } else {
      report.unsupportedRules.push({
        eslintRule: rule,
        reason: 'Biome 2.0에 대응 규칙 없음',
        alternative: 'custom plugin 또는 AI 검증으로 대체',
      });
    }
  }

  const total = Object.keys(eslintConfig.rules ?? {}).length;
  const migrated = report.migratedRules.length;
  report.estimatedEffort =
    migrated / total > 0.8
      ? '낮음 (80% 이상 자동 전환 가능)'
      : migrated / total > 0.5
        ? '중간 (일부 커스텀 규칙 수동 전환 필요)'
        : '높음 (상당수 규칙 수동 대응 필요)';

  return report;
}
```

### 3.3 CI에서 Biome 실행

```yaml
# .github/workflows/biome-check.yml
name: Biome Check
on: [pull_request]

jobs:
  biome:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: biomejs/setup-biome@v2
        with:
          version: "2.0"
      - name: Biome CI check
        run: biome ci --reporter=github .
      - name: Biome format check
        run: biome format --check .
```

---

## 4. 멀티 베타 인프라 표준

### 4.1 환경 네이밍 컨벤션

```typescript
// environment-naming.ts
interface EnvironmentConfig {
  name: string;
  tier: 'preview' | 'staging' | 'production';
  branchPattern: string;
  url: string;
  autoExpiry: string;
  costLimitUsd: number;
  owner: string;
}

function generateEnvironmentName(
  tier: EnvironmentConfig['tier'],
  branchName: string,
  prNumber?: number,
): string {
  const sanitized = branchName
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30)
    .toLowerCase();

  switch (tier) {
    case 'preview':
      return prNumber ? `preview-pr-${prNumber}` : `preview-${sanitized}`;
    case 'staging':
      return `staging-${sanitized}`;
    case 'production':
      return 'production';
  }
}

const ENVIRONMENT_DEFAULTS: Record<EnvironmentConfig['tier'], Partial<EnvironmentConfig>> = {
  preview: {
    autoExpiry: 'P3D',      // 3일 후 자동 만료
    costLimitUsd: 5,        // 일 $5 한도
  },
  staging: {
    autoExpiry: 'P14D',     // 14일 후 자동 만료
    costLimitUsd: 20,       // 일 $20 한도
  },
  production: {
    autoExpiry: '',          // 만료 없음
    costLimitUsd: 0,         // 별도 관리
  },
};
```

### 4.2 Preview 환경 자동 만료 및 비용 관리

```typescript
// environment-lifecycle.ts
interface EnvironmentStatus {
  name: string;
  createdAt: string;
  expiresAt: string;
  currentCostUsd: number;
  costLimitUsd: number;
  status: 'active' | 'warning' | 'expired' | 'cost-exceeded';
}

async function checkEnvironmentHealth(
  envs: EnvironmentStatus[],
): Promise<Array<{ env: string; action: 'keep' | 'warn' | 'destroy'; reason: string }>> {
  const now = new Date();
  const actions: Array<{ env: string; action: 'keep' | 'warn' | 'destroy'; reason: string }> = [];

  for (const env of envs) {
    const expiresAt = new Date(env.expiresAt);
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (env.costLimitUsd > 0 && env.currentCostUsd >= env.costLimitUsd) {
      actions.push({
        env: env.name,
        action: 'destroy',
        reason: `비용 한도 초과 ($${env.currentCostUsd}/$${env.costLimitUsd})`,
      });
      continue;
    }

    if (hoursUntilExpiry <= 0) {
      actions.push({
        env: env.name,
        action: 'destroy',
        reason: `만료 시간 경과 (${env.expiresAt})`,
      });
      continue;
    }

    if (hoursUntilExpiry <= 6) {
      actions.push({
        env: env.name,
        action: 'warn',
        reason: `${Math.round(hoursUntilExpiry)}시간 후 만료 예정`,
      });
      continue;
    }

    if (env.costLimitUsd > 0 && env.currentCostUsd >= env.costLimitUsd * 0.8) {
      actions.push({
        env: env.name,
        action: 'warn',
        reason: `비용 ${Math.round((env.currentCostUsd / env.costLimitUsd) * 100)}% 도달`,
      });
      continue;
    }

    actions.push({ env: env.name, action: 'keep', reason: '정상' });
  }

  return actions;
}
```

### 4.3 Preview 환경 표준 준수 자동 검증 CI

```typescript
// preview-standards-ci.ts
interface StandardsCheckResult {
  environment: string;
  prNumber: number;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    details: string;
    duration: number;
  }>;
  overallStatus: 'pass' | 'fail';
  reportUrl: string;
}

async function runStandardsCheck(
  prNumber: number,
  previewUrl: string,
): Promise<StandardsCheckResult> {
  const environment = `preview-pr-${prNumber}`;
  const checks: StandardsCheckResult['checks'] = [];

  // 1. Biome 린팅/포맷 검사
  const biomeResult = await runBiomeCheck();
  checks.push({
    name: 'Biome 2.0 린팅/포맷',
    status: biomeResult.errors === 0 ? 'pass' : 'fail',
    details: `오류 ${biomeResult.errors}건, 경고 ${biomeResult.warnings}건`,
    duration: biomeResult.duration,
  });

  // 2. TypeScript 타입 검사
  const tscResult = await runTypeCheck();
  checks.push({
    name: 'TypeScript 타입 검사',
    status: tscResult.errors === 0 ? 'pass' : 'fail',
    details: `타입 오류 ${tscResult.errors}건`,
    duration: tscResult.duration,
  });

  // 3. AI 기반 표준 준수 분석
  const aiAnalysis = await runAiStandardsAnalysis(prNumber);
  checks.push({
    name: 'AI 표준 준수 분석',
    status: aiAnalysis.violations === 0 ? 'pass' : aiAnalysis.violations <= 3 ? 'warn' : 'fail',
    details: `위반 ${aiAnalysis.violations}건 탐지. ${aiAnalysis.summary}`,
    duration: aiAnalysis.duration,
  });

  // 4. 번들 크기 검사
  const bundleResult = await checkBundleSize(previewUrl);
  checks.push({
    name: '번들 크기 기준 검사',
    status: bundleResult.withinBudget ? 'pass' : 'warn',
    details: `JS: ${bundleResult.jsSize}KB (한도: ${bundleResult.jsBudget}KB)`,
    duration: bundleResult.duration,
  });

  // 5. 접근성 자동 검사
  const a11yResult = await runAccessibilityAudit(previewUrl);
  checks.push({
    name: '접근성 (WCAG 2.2 AA)',
    status: a11yResult.violations === 0 ? 'pass' : 'fail',
    details: `위반 ${a11yResult.violations}건, 경고 ${a11yResult.warnings}건`,
    duration: a11yResult.duration,
  });

  // 6. Lighthouse 성능 검사
  const perfResult = await runLighthouseCheck(previewUrl);
  checks.push({
    name: 'Lighthouse 성능 점수',
    status: perfResult.score >= 90 ? 'pass' : perfResult.score >= 70 ? 'warn' : 'fail',
    details: `성능: ${perfResult.score}, LCP: ${perfResult.lcp}ms, CLS: ${perfResult.cls}`,
    duration: perfResult.duration,
  });

  const overallStatus = checks.some((c) => c.status === 'fail') ? 'fail' : 'pass';

  return {
    environment,
    prNumber,
    checks,
    overallStatus,
    reportUrl: `${previewUrl}/__standards-report`,
  };
}
```

### 4.4 GitHub Actions: 멀티 베타 표준 검증 워크플로우

```yaml
# .github/workflows/preview-standards.yml
name: Preview Standards Verification
on:
  pull_request:
    types: [opened, synchronize]

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    outputs:
      preview-url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy preview
        id: deploy
        run: |
          ENV_NAME="preview-pr-${{ github.event.pull_request.number }}"
          echo "url=https://${ENV_NAME}.preview.example.com" >> $GITHUB_OUTPUT

  standards-check:
    needs: deploy-preview
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci

      - name: Biome 2.0 check
        run: npx biome ci --reporter=github .

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: AI standards analysis
        env:
          AI_API_KEY: ${{ secrets.AI_API_KEY }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: npx tsx scripts/ai-standards-check.ts

      - name: Accessibility audit
        run: |
          npx @axe-core/cli ${{ needs.deploy-preview.outputs.preview-url }} \
            --exit --tags wcag2aa

      - name: Bundle size check
        run: npx bundlewatch

      - name: Post results to PR
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const body = `## Standards Verification Report
            | Check | Status |
            |-------|--------|
            | Biome 2.0 | ${{ steps.biome.outcome == 'success' && 'Pass' || 'Fail' }} |
            | TypeScript | ${{ steps.tsc.outcome == 'success' && 'Pass' || 'Fail' }} |
            | AI Analysis | ${{ steps.ai.outcome == 'success' && 'Pass' || 'Fail' }} |
            | Accessibility | ${{ steps.a11y.outcome == 'success' && 'Pass' || 'Fail' }} |

            Preview: ${{ needs.deploy-preview.outputs.preview-url }}`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            });

  auto-expire:
    runs-on: ubuntu-latest
    if: github.event.action == 'closed'
    steps:
      - name: Destroy preview environment
        run: |
          ENV_NAME="preview-pr-${{ github.event.pull_request.number }}"
          echo "Destroying environment: ${ENV_NAME}"
```

---

## 5. 프론트엔드 특화 표준 사례

### 5.1 개발환경 표준

```typescript
// standards/dev-environment.ts
interface DevEnvironmentStandard {
  nodeVersion: string;
  packageManager: { name: 'pnpm'; version: string };
  typescript: { version: string; strict: true };
  formatter: { tool: 'biome'; version: string };
  linter: { tool: 'biome'; version: string };
  testRunner: { tool: 'vitest'; version: string };
  bundler: { tool: 'vite' | 'turbopack'; version: string };
}

const DEV_ENVIRONMENT_2026: DevEnvironmentStandard = {
  nodeVersion: '22.x',
  packageManager: { name: 'pnpm', version: '10.x' },
  typescript: { version: '5.7.x', strict: true },
  formatter: { tool: 'biome', version: '2.0.x' },
  linter: { tool: 'biome', version: '2.0.x' },
  testRunner: { tool: 'vitest', version: '3.x' },
  bundler: { tool: 'vite', version: '6.x' },
};

function validateDevEnvironment(
  actual: Partial<DevEnvironmentStandard>,
  expected: DevEnvironmentStandard,
): string[] {
  const violations: string[] = [];

  if (actual.nodeVersion && !actual.nodeVersion.startsWith(expected.nodeVersion.replace('.x', ''))) {
    violations.push(`Node.js 버전 불일치: ${actual.nodeVersion} (기준: ${expected.nodeVersion})`);
  }

  if (actual.packageManager?.name !== expected.packageManager.name) {
    violations.push(`패키지 매니저: ${actual.packageManager?.name} (기준: ${expected.packageManager.name})`);
  }

  return violations;
}
```

### 5.2 네이밍 표준

```typescript
// standards/naming-convention.ts
const NAMING_RULES = {
  // 컴포넌트: PascalCase
  component: {
    pattern: /^[A-Z][a-zA-Z0-9]*$/,
    example: { correct: 'UserProfile', incorrect: 'userProfile' },
    filePattern: /^[A-Z][a-zA-Z0-9]*\.tsx$/,
  },

  // 훅: camelCase, use 접두사
  hook: {
    pattern: /^use[A-Z][a-zA-Z0-9]*$/,
    example: { correct: 'useAuthStatus', incorrect: 'authStatusHook' },
    filePattern: /^use[A-Z][a-zA-Z0-9]*\.ts$/,
  },

  // 유틸리티 함수: camelCase
  utility: {
    pattern: /^[a-z][a-zA-Z0-9]*$/,
    example: { correct: 'formatCurrency', incorrect: 'FormatCurrency' },
    filePattern: /^[a-z][a-zA-Z0-9]*\.ts$/,
  },

  // 상수: SCREAMING_SNAKE_CASE
  constant: {
    pattern: /^[A-Z][A-Z0-9_]*$/,
    example: { correct: 'MAX_RETRY_COUNT', incorrect: 'maxRetryCount' },
  },

  // 타입/인터페이스: PascalCase, I 접두사 금지
  type: {
    pattern: /^[A-Z][a-zA-Z0-9]*$/,
    example: { correct: 'UserProfile', incorrect: 'IUserProfile' },
  },

  // Enum: PascalCase (키, 값 모두)
  enum: {
    pattern: /^[A-Z][a-zA-Z0-9]*$/,
    example: { correct: 'UserRole.Admin', incorrect: 'USER_ROLE.ADMIN' },
  },

  // 이벤트 핸들러: handle + 동사 (내부) / on + 동사 (prop)
  eventHandler: {
    internalPattern: /^handle[A-Z][a-zA-Z0-9]*$/,
    propPattern: /^on[A-Z][a-zA-Z0-9]*$/,
    example: {
      correct: 'handleClick (내부) / onClick (prop)',
      incorrect: 'clickHandler / click',
    },
  },

  // 디렉토리: kebab-case
  directory: {
    pattern: /^[a-z][a-z0-9-]*$/,
    example: { correct: 'user-profile', incorrect: 'UserProfile' },
  },
} as const;
```

### 5.3 테스트 표준

```typescript
// standards/testing-convention.ts
interface TestingStandard {
  unitTest: {
    framework: string;
    coverageThreshold: { statements: number; branches: number; functions: number; lines: number };
    filePattern: string;
    namingConvention: string;
  };
  integrationTest: {
    framework: string;
    filePattern: string;
  };
  e2eTest: {
    framework: string;
    filePattern: string;
  };
}

const TESTING_STANDARD: TestingStandard = {
  unitTest: {
    framework: 'vitest',
    coverageThreshold: { statements: 80, branches: 75, functions: 80, lines: 80 },
    filePattern: '**/*.test.{ts,tsx}',
    namingConvention: 'describe("컴포넌트/함수명") > it("should 동작")',
  },
  integrationTest: {
    framework: 'vitest + testing-library',
    filePattern: '**/*.integration.test.{ts,tsx}',
  },
  e2eTest: {
    framework: 'playwright',
    filePattern: 'e2e/**/*.spec.ts',
  },
};

// 테스트 작성 패턴: Arrange-Act-Assert 필수
//
// describe('UserProfile', () => {
//   it('should render user name', () => { ... });
//   it('should show loading skeleton when data is pending', () => { ... });
//   it('should handle error state gracefully', () => { ... });
// });
//
// it('should format currency with locale', () => {
//   // Arrange
//   const amount = 1234.56;
//   const locale = 'ko-KR';
//
//   // Act
//   const result = formatCurrency(amount, locale);
//
//   // Assert
//   expect(result).toBe('₩1,235');
// });
```

### 5.4 컴포넌트 API 표준

```typescript
// standards/component-api.ts

// 컴포넌트 API 설계 원칙:
// 1. Props는 인터페이스로 정의 (type alias 사용 금지)
// 2. children 대신 render prop 또는 slot 패턴은 명확한 이유가 있을 때만
// 3. boolean prop은 긍정형 (isVisible O, isNotHidden X)
// 4. 콜백 prop은 on 접두사
// 5. 컴포넌트 내부 상태는 최소화, 가능하면 제어 컴포넌트

// 올바른 예시
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

// Polymorphic component 패턴
interface PolymorphicProps<T extends React.ElementType> {
  as?: T;
  children: React.ReactNode;
}

type ComponentPropsWithAs<T extends React.ElementType, P = object> =
  PolymorphicProps<T> & P & Omit<React.ComponentPropsWithoutRef<T>, keyof (PolymorphicProps<T> & P)>;

// Compound component 패턴
//
// <Select value={value} onChange={setValue}>
//   <Select.Trigger>{selectedLabel}</Select.Trigger>
//   <Select.Content>
//     <Select.Item value="a">Option A</Select.Item>
//     <Select.Item value="b">Option B</Select.Item>
//   </Select.Content>
// </Select>
```

### 5.5 에러 핸들링 표준

```typescript
// standards/error-handling.ts

enum ErrorCategory {
  Network = 'NETWORK',
  Validation = 'VALIDATION',
  Authentication = 'AUTHENTICATION',
  Authorization = 'AUTHORIZATION',
  NotFound = 'NOT_FOUND',
  RateLimit = 'RATE_LIMIT',
  ServerError = 'SERVER_ERROR',
  Unknown = 'UNKNOWN',
}

class AppError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly statusCode: number,
    public readonly isRetryable: boolean,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toUserMessage(): string {
    const messages: Record<ErrorCategory, string> = {
      [ErrorCategory.Network]: '네트워크 연결을 확인해주세요.',
      [ErrorCategory.Validation]: '입력 정보를 다시 확인해주세요.',
      [ErrorCategory.Authentication]: '다시 로그인해주세요.',
      [ErrorCategory.Authorization]: '접근 권한이 없습니다.',
      [ErrorCategory.NotFound]: '요청하신 정보를 찾을 수 없습니다.',
      [ErrorCategory.RateLimit]: '잠시 후 다시 시도해주세요.',
      [ErrorCategory.ServerError]: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      [ErrorCategory.Unknown]: '알 수 없는 오류가 발생했습니다.',
    };
    return messages[this.category];
  }
}

// React Error Boundary 표준 사용법:
//
// <ErrorBoundary
//   fallback={({ error, reset }) => (
//     <ErrorFallback error={error} onRetry={reset} />
//   )}
//   onError={(error, info) => {
//     reportError(error, { componentStack: info.componentStack });
//   }}
// >
//   <App />
// </ErrorBoundary>

function classifyHttpError(status: number, body?: unknown): AppError {
  if (status === 401) {
    return new AppError('Unauthorized', ErrorCategory.Authentication, 401, false);
  }
  if (status === 403) {
    return new AppError('Forbidden', ErrorCategory.Authorization, 403, false);
  }
  if (status === 404) {
    return new AppError('Not Found', ErrorCategory.NotFound, 404, false);
  }
  if (status === 429) {
    return new AppError('Rate Limited', ErrorCategory.RateLimit, 429, true);
  }
  if (status >= 500) {
    return new AppError('Server Error', ErrorCategory.ServerError, status, true);
  }
  return new AppError('Unknown Error', ErrorCategory.Unknown, status, false, { body });
}
```

### 5.6 i18n 표준

```typescript
// standards/i18n-convention.ts

// i18n 표준:
// 1. 모든 사용자 노출 문자열은 번역 키로 관리
// 2. 네임스페이스: 기능/페이지 단위로 분리
// 3. 키 네이밍: snake_case, 계층 구조는 dot notation
// 4. 복수형, 날짜/시간, 숫자 포맷은 ICU MessageFormat 사용
// 5. 하드코딩 문자열 금지 (Biome custom rule로 탐지)

interface I18nNamespace {
  name: string;
  keys: Record<string, string | { one: string; other: string }>;
}

function validateI18nKey(key: string): { valid: boolean; reason?: string } {
  const pattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,4}$/;

  if (!pattern.test(key)) {
    return {
      valid: false,
      reason: `키 "${key}"가 형식에 맞지 않습니다. 형식: namespace.section.key_name (snake_case)`,
    };
  }

  return { valid: true };
}

async function findMissingTranslations(
  defaultLocale: string,
  targetLocales: string[],
  translationsDir: string,
): Promise<Array<{ locale: string; missingKeys: string[] }>> {
  const defaultKeys = await loadTranslationKeys(translationsDir, defaultLocale);
  const results: Array<{ locale: string; missingKeys: string[] }> = [];

  for (const locale of targetLocales) {
    const targetKeys = await loadTranslationKeys(translationsDir, locale);
    const missing = defaultKeys.filter((key) => !targetKeys.includes(key));

    if (missing.length > 0) {
      results.push({ locale, missingKeys: missing });
    }
  }

  return results;
}

// 사용 예시:
//
// messages/ko.json
// {
//   "common.button.submit": "제출",
//   "common.button.cancel": "취소",
//   "user.profile.greeting": "{name}님, 안녕하세요!",
//   "user.profile.item_count": "{count, plural, one {# 아이템} other {# 아이템}}"
// }
//
// 컴포넌트에서:
// const { t } = useTranslation('user');
// <p>{t('profile.greeting', { name: user.name })}</p>
```

### 5.7 접근성 표준

```typescript
// standards/accessibility.ts

// 접근성 표준 (WCAG 2.2 AA 준수):
// 1. 모든 이미지에 대체 텍스트 (alt) 필수
// 2. 폼 요소에 label 연결 필수
// 3. 키보드 탐색 가능 (tabIndex 관리)
// 4. 색상 대비 4.5:1 이상
// 5. 동적 콘텐츠 변경 시 aria-live 사용
// 6. 모달/다이얼로그는 포커스 트래핑 필수

interface AccessibilityChecklist {
  category: string;
  rules: Array<{
    id: string;
    description: string;
    wcagCriteria: string;
    automatable: boolean;
    biomeRule?: string;
  }>;
}

const A11Y_CHECKLIST: AccessibilityChecklist[] = [
  {
    category: '이미지 및 미디어',
    rules: [
      {
        id: 'A11Y-IMG-001',
        description: '모든 <img>에 의미 있는 alt 텍스트 제공',
        wcagCriteria: '1.1.1',
        automatable: true,
        biomeRule: 'a11y/useAltText',
      },
      {
        id: 'A11Y-IMG-002',
        description: '장식용 이미지는 alt="" 또는 role="presentation"',
        wcagCriteria: '1.1.1',
        automatable: true,
      },
    ],
  },
  {
    category: '키보드 접근성',
    rules: [
      {
        id: 'A11Y-KB-001',
        description: '모든 인터랙티브 요소 키보드 접근 가능',
        wcagCriteria: '2.1.1',
        automatable: false,
      },
      {
        id: 'A11Y-KB-002',
        description: 'tabIndex는 0 또는 -1만 사용 (양수 금지)',
        wcagCriteria: '2.4.3',
        automatable: true,
        biomeRule: 'a11y/noPositiveTabindex',
      },
      {
        id: 'A11Y-KB-003',
        description: '포커스 표시자 항상 표시 (outline: none 금지)',
        wcagCriteria: '2.4.7',
        automatable: true,
      },
    ],
  },
  {
    category: '폼',
    rules: [
      {
        id: 'A11Y-FORM-001',
        description: '모든 입력에 <label> 연결 (htmlFor + id)',
        wcagCriteria: '1.3.1',
        automatable: true,
        biomeRule: 'a11y/useValidFormLabels',
      },
      {
        id: 'A11Y-FORM-002',
        description: '에러 메시지는 aria-describedby로 연결',
        wcagCriteria: '3.3.1',
        automatable: false,
      },
    ],
  },
  {
    category: '동적 콘텐츠',
    rules: [
      {
        id: 'A11Y-DYN-001',
        description: '비동기 업데이트 영역에 aria-live 사용',
        wcagCriteria: '4.1.3',
        automatable: false,
      },
      {
        id: 'A11Y-DYN-002',
        description: '모달 열릴 때 포커스 이동, 닫힐 때 원래 위치 복원',
        wcagCriteria: '2.4.3',
        automatable: false,
      },
    ],
  },
];

interface A11yAuditConfig {
  tool: 'axe-core';
  version: string;
  runAt: 'ci' | 'preview' | 'both';
  standards: ('wcag2a' | 'wcag2aa' | 'wcag22aa')[];
  failOnViolation: boolean;
  ignoreRules: string[];
}

const A11Y_AUDIT_CONFIG: A11yAuditConfig = {
  tool: 'axe-core',
  version: '4.x',
  runAt: 'both',
  standards: ['wcag22aa'],
  failOnViolation: true,
  ignoreRules: [],
};
```

---

## 6. AI 프롬프트 시나리오 모음

### 6.1 표준 수립 시나리오

```
[시나리오] "우리 프로젝트에 맞는 코딩 컨벤션 생성해줘"

프롬프트:
"우리 프로젝트는 React 19 + TypeScript 5.7 + Vite 6 기반이며,
팀원 6명이 협업합니다. Biome 2.0으로 린팅합니다.
다음 기존 코드를 참고하여 프로젝트에 맞는 코딩 컨벤션을 작성해주세요:
[코드 샘플 붙여넣기]

포함 항목: 네이밍, 디렉토리 구조, import 순서, 에러 핸들링, 테스트, 주석.
각 규칙에 올바른/잘못된 예시를 달아주세요.
Biome 2.0 설정으로 자동화 가능한 규칙은 biome.json 설정도 함께 제시해주세요."
```

### 6.2 표준 검증 시나리오

```
[시나리오] "이 코드가 우리 표준을 위반하는지 검사해줘"

프롬프트:
"다음은 우리 프로젝트의 코딩 표준입니다:
[표준 문서 붙여넣기]

아래 코드가 이 표준을 위반하는 부분을 모두 찾아주세요.
각 위반에 대해: 규칙 ID, 라인 번호, 심각도, 설명, 수정 코드를 제시해주세요.
[검사 대상 코드 붙여넣기]"
```

### 6.3 RFC 작성 지원 시나리오

```
[시나리오] "새로운 상태 관리 도입 RFC를 작성해줘"

프롬프트:
"우리 프로젝트에서 Redux를 Zustand로 전환하려 합니다.
현재 Redux를 사용하는 파일이 약 45개이며, 전체 코드베이스는 300개 파일입니다.
이 전환에 대한 RFC를 작성해주세요.

포함 항목:
1. 동기 및 현재 문제점
2. Zustand 선택 근거 (vs Jotai, vs signals)
3. 마이그레이션 전략 (단계별)
4. 리스크 분석
5. 예상 일정
6. 롤백 계획

RFC 템플릿 형식을 따라주세요."
```

### 6.4 AI 활용 표준 검증 시나리오

```
[시나리오] "AI가 생성한 코드의 품질을 검증해줘"

프롬프트:
"다음은 AI(Claude)가 생성한 코드입니다.
아래 관점에서 검증해주세요:

1. Hallucination 검사: 존재하지 않는 API나 패키지를 사용하고 있는지
2. 타입 안전성: any 사용, 타입 단언 남용이 있는지
3. 보안: 프롬프트 인젝션, 하드코딩된 시크릿, XSS 가능성
4. 라이선스: 사용된 패키지의 라이선스 호환성
5. 우리 코딩 표준 준수 여부

[AI 생성 코드 붙여넣기]"
```

---

## 7. 표준 거버넌스

### 7.1 표준 변경 프로세스

| 단계 | 설명 | 결정권자 |
|------|------|----------|
| 제안 | RFC 형식으로 표준 변경 제안 | 누구나 |
| 검토 | 팀 리뷰 + AI 영향도 분석 | 팀 전원 |
| 승인 | 과반 동의 + 테크리드 승인 | 테크리드 |
| 구현 | Biome/CI 규칙 반영, 문서 갱신 | 담당자 |
| 검증 | 기존 코드베이스 영향 확인 | CI 자동 |
| 배포 | 점진적 적용 (warn -> error) | 담당자 |

### 7.2 표준 버전 관리

```typescript
// standards/versioning.ts
interface StandardVersion {
  version: string;
  effectiveDate: string;
  deprecatesVersion?: string;
  migrationGuide?: string;
  changelog: string[];
}

// 표준 버전은 SemVer를 따른다
// Major: 호환성 깨지는 변경 (기존 코드 수정 필요)
// Minor: 새로운 규칙 추가 (기존 코드 영향 없음)
// Patch: 규칙 설명 수정, 예시 보강

const CURRENT_STANDARD: StandardVersion = {
  version: '3.0.0',
  effectiveDate: '2026-04-01',
  deprecatesVersion: '2.x',
  migrationGuide: '/docs/migration/v2-to-v3.md',
  changelog: [
    'Biome 2.0 기반으로 전면 전환 (ESLint/Prettier 제거)',
    'AI 코드 생성 품질 기준 신설',
    '멀티 베타 인프라 표준 추가',
    '접근성 표준 WCAG 2.2 AA로 상향',
    '프롬프트 라이브러리 관리 체계 도입',
  ],
};
```

---

## 8. 참고 자료

| 항목 | 링크 |
|------|------|
| Biome 2.0 공식 문서 | https://biomejs.dev |
| WCAG 2.2 | https://www.w3.org/TR/WCAG22/ |
| RFC 2119 (표준 문서 용어) | https://datatracker.ietf.org/doc/html/rfc2119 |
| ICU MessageFormat | https://unicode-org.github.io/icu/userguide/format_parse/messages/ |
| axe-core 접근성 규칙 | https://github.com/dequelabs/axe-core |
