import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import process from 'node:process';

function parseJsonReportPath(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--json-report') {
      return argv[i + 1] ?? '';
    }

    if (arg.startsWith('--json-report=')) {
      return arg.slice('--json-report='.length);
    }
  }

  return '';
}

const ROOT = process.cwd();
const GUIDE_DIR = path.join(ROOT, 'public', '개발가이드');
const README = path.join(ROOT, 'README.md');
const INDEX_HTML = path.join(ROOT, 'index.html');

const REQUIRED_DOC_MARKERS = [
  '문서 책임 범위',
  '0.1 교차 검증 매트릭스',
  '0.2 운영 게이트',
  '실무 적용 가이드',
  '언제 이 문서를 펼칠까',
  '적용 순서',
  '함께 두는 파일',
  '흔한 실수',
  'PR 완료 기준',
];

const FORBIDDEN_COMPANY_PATTERN =
  /배민|배달의민족|우아한|우아한형제들|Baemin|Woowa|토스(?!트)|카카오|쿠팡|당근|무신사|오늘의집|Carrefour|Auchan|Leclerc|현자비스|자비스앤빌런즈/;

const FORBIDDEN_QUALITY_PATTERN =
  /완벽|최강|무조건|국내 최초|혁명|사실상|업계 표준|AI 프롬프트|프롬프트 형식|Prompt [0-9]|붙여넣기|복사해서/;

const LEGACY_YEAR = `${20}${26}`;
const LEGACY_EDITION = `Edi${'tion'}`;
const FORBIDDEN_LEGACY_GUIDE_PATTERN = new RegExp(
  [
    LEGACY_YEAR,
    `2025-${LEGACY_YEAR} ${LEGACY_EDITION}`,
    `${20}${25} ${LEGACY_EDITION}`,
    `${20}${24} ${LEGACY_EDITION}`,
    `${20}${23} ${LEGACY_EDITION}`,
    `Tr${'end'} Ops`,
    `Roll${'forward'}`,
    `트${'렌드'} ${'운영'}`,
    `트${'렌드'} ${'실행'}`,
    `도메인별 ${'고도화'}`,
    `문서 최종 ${'업데이트'}`,
    `Last ${'updated'}`,
    `Verified ${'Snapshot'}`,
  ].join('|'),
);

const FORBIDDEN_ARTIFACT_PATTERN = /^\s*NaN\s*$/m;

const COPY_RISK_CONFIG = {
  headingWarningMinFiles: 4,
  copyLineMinLength: 45,
  copyLineMinFiles: 2,
  copyParagraphMinLength: 100,
  copyParagraphMinFiles: 2,
};

const ALLOWED_SHARED_COPY_PATTERNS = [
  /추천 항목/,
  /적용 결과를 PR 본문이나 회고 노트/,
  /재작업률\/리뷰 충돌\/배포 이슈/,
  /적용 항목/,
  /예상 효과/,
  /실행 증거/,
  /담당자/,
  /적용일/,
  /측정 지표/,
  /보류 사유/,
  /항목 적용 주체/,
  /실제 반영된 날짜/,
  /리뷰 충돌\/재작업\/버그 재발/,
  /적용을 못한 경우 이유/,
  /P1\(7일 내\)/,
  /P2\(30일 내\)/,
  /P3\(90일 내\)/,
  /완료 기준/,
  /각 항목별 산출물/,
  /1단계\(7일\)/,
  /2단계\(30일\)/,
  /3단계\(60일\)/,
  /문제 대응/,
  /전환 결과를 팀 산출물/,
  /정적 지표 1개 이상으로 효과/,
  /미달성 시 보류 사유/,
  /실행 게이트/,
  /승인 체계/,
  /재개 조건/,
  /정지 조건/,
  /리스크 점수/,
  /리더 승인자/,
  /승인 역할/,
  /재평가 주기/,
  /위험, 비용, 기대 효과/,
  /사전 승인자/,
  /실패 신호가 기준치/,
  /회귀 지표 악화/,
  /현재 위험도를 기록/,
  /최종 승인 책임자/,
  /승인자, 실행자, 모니터링/,
  /최소 2주 단위/,
];

function isAllowedSharedCopy(text) {
  return ALLOWED_SHARED_COPY_PATTERNS.some((pattern) => pattern.test(text));
}

const REQUIRED_SOURCE_URLS = [
  'https://frontend-fundamentals.com/code-quality/code/examples/submit-button.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/login-start-page.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/use-page-state-readability.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/condition-name.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/magic-number-readability.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/user-policy.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/ternary-operator.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/comparison-order.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/http.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/use-user.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/hidden-logic.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/code-directory.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/magic-number-cohesion.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/form-fields.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/use-page-state-coupling.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/use-bottom-sheet.html',
  'https://frontend-fundamentals.com/code-quality/code/examples/item-edit-modal.html',
  'https://docs.coderabbit.ai/getting-started/yaml-configuration',
  'https://docs.coderabbit.ai/configuration/path-instructions',
  'https://docs.coderabbit.ai/tools',
  'https://github.com/secretlint/secretlint',
  'https://mswjs.io/docs/integrations/node',
  'https://commitlint.js.org/guides/getting-started.html',
  'https://commitlint.js.org/reference/configuration.html',
  'https://typicode.github.io/husky/get-started.html',
  'https://eslint.org/docs/latest/rules/no-warning-comments',
  'https://eslint.org/docs/latest/rules/no-inline-comments',
  'https://react.dev/blog/2025/10/01/react-19-2',
  'https://react.dev/blog/2025/10/07/react-compiler-1',
  'https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components',
  'https://react.dev/reference/react/ViewTransition',
  'https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/',
  'https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/',
  'https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/',
  'https://zod.dev/v4',
  'https://standardschema.dev/',
  'https://nextjs.org/blog/next-16',
  'https://vite.dev/blog/announcing-vite8',
  'https://tailwindcss.com/blog/tailwindcss-v4',
  'https://vitest.dev/blog/vitest-4',
  'https://playwright.dev/docs/release-notes',
  'https://playwright.dev/docs/test-agents',
  'https://storybook.js.org/blog/storybook-9/',
  'https://developers.google.com/search/docs/appearance/core-web-vitals',
  'https://web.dev/inp/',
  'https://web.dev/articles/find-slow-interactions-in-the-field',
  'https://owasp.org/Top10/2025/0x00_2025-Introduction/',
  'https://www.rfc-editor.org/rfc/rfc9700',
  'https://csrc.nist.gov/pubs/sp/800/218/final',
  'https://www.w3.org/press-releases/2025/wcag22-iso-pas/',
  'https://www.w3.org/TR/wai-aria-1.3/',
  'https://www.ada.gov/resources/2024-03-08-web-rule/',
  'https://web.dev/baseline',
  'https://opentelemetry.io/docs/languages/js/',
  'https://slsa.dev/spec/',
  'https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations',
  'https://docs.github.com/en/actions/concepts/security/openid-connect',
  'https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html',
  'https://docs.aws.amazon.com/amplify/latest/userguide/pattern-based-feature-branch-deployments.html',
  'https://docs.aws.amazon.com/amplify/latest/userguide/manual-deploys.html',
  'https://docs.aws.amazon.com/cli/latest/reference/amplify/start-deployment.html',
  'https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html',
  'https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html',
  'https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html',
  'https://nextjs.org/docs/14/app/building-your-application/deploying/static-exports',
  'https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments',
  'https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws',
  'https://github.com/aws-actions/configure-aws-credentials',
  'https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html',
  'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html',
  'https://docs.aws.amazon.com/whitepapers/latest/build-static-websites-aws/controlling-how-long-amazon-s3-content-is-cached-by-amazon-cloudfront.html',
  'https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html',
  'https://aws.amazon.com/blogs/aws/simplify-and-enhance-amazon-s3-static-website-hosting-with-aws-amplify/',
];

const REQUIRED_GUIDE_SECTIONS = new Map([
  [
    '00_종합_가이드_목차.md',
    ['Frontend Fundamentals 코드 품질 매트릭스', 'CodeRabbit', 'secretlint', 'commitlint', 'Props Drilling'],
  ],
  [
    '01_TypeScript_심화_가이드.md',
    ['0.3 TypeScript 6/7 전환 계약', 'TypeScript 7.0 Beta', 'Standard Schema', '복잡한 조건', '매직 넘버', '반환 타입'],
  ],
  [
    '02_React19_실무_가이드.md',
    ['0.3 React 기능 안정성 계약', 'RSC 보안 패치', '<ViewTransition>', '같이 실행되지 않는 코드', '구현 상세', 'Props Drilling'],
  ],
  [
    '03_상태관리_패턴_가이드.md',
    ['usePageState', '쿼리 파라미터별', '반환 계약'],
  ],
  [
    '04_아키텍처_설계_패턴.md',
    [
      '기능 중심 co-location',
      '변경 단위 기반 폴더 구조',
      'Frontend Fundamentals 아키텍처 매핑',
      '제품/도메인 중심 폴더 구조',
      'route shell',
      '_shared 승격 조건',
      'remotes/',
      'FSD는 참조 패턴',
      'feature/domain 폴더',
      'MSW 목업 테스트',
      'CodeRabbit',
      '주석 룰',
    ],
  ],
  [
    '05_API_통신_및_모킹_가이드.md',
    ['MSW Node.js', 'setupServer', '목업 테스트', '숨은 동작', '반환 계약'],
  ],
  [
    '06_웹_보안_심화_가이드.md',
    ['secretlint', '.secretlintrc', '.secretlintignore'],
  ],
  [
    '07_테스팅_가이드.md',
    ['목업 테스트 신뢰도', 'MSW lifecycle', 'fixture 전략'],
  ],
  [
    '08_성능_최적화_가이드.md',
    ['0.3 Field 성능 증거 계약', 'web-vitals/attribution'],
  ],
  [
    '13_브라우저_호환성_가이드.md',
    ['0.3 Baseline 단계별 채택 기준', 'Limited availability', 'Widely available'],
  ],
  [
    '06_웹_보안_심화_가이드.md',
    ['0.4 인증·공급망 공식 표준 해석', 'RFC 9700 OAuth 2.0 Security BCP'],
  ],
  [
    '11_CICD_파이프라인_표준.md',
    ['0.3 공급망 증적 계약', '0.4 PR 리뷰 게이트 계약', '0.5 GitHub Actions 운영 표준', 'CodeRabbit review gate', 'branch-protection.yml', 'timeout-minutes', 'dependabot/fetch-metadata@v3', 'provenance/attestation', 'OIDC', 'Husky', 'commitlint', 'secretlint'],
  ],
  [
    '16_AI_협업_코드리뷰_가이드.md',
    ['CodeRabbit', '.coderabbit.yaml', 'path_instructions', '주석 룰', 'CodeRabbit 리뷰 게이트', 'branch-protection.yml', 'required_approving_review_count'],
  ],
  [
    '17_신규_입사자_온보딩_가이드.md',
    ['로컬 품질 도구', 'husky init', 'commitlint', 'secretlint', 'MSW handler'],
  ],
  [
    '20_디자인_시스템_가이드.md',
    ['폼의 응집도', 'Props Drilling', 'Context API', '중복 허용'],
  ],
  [
    '22_모노레포_운영_가이드.md',
    ['함께 수정되는 기능 코드', 'package owner', 'boundary lint', 'affected test/build'],
  ],
  [
    '27_다중_개발_서버_구축_가이드.md',
    [
      'Multi-Environment',
      'PR preview',
      'Amplify Hosting',
      'S3 artifact',
      'GitHub Actions',
      'OIDC',
      'cleanup',
      'static export',
      'AWS 서비스별 책임 매핑',
      'AWS 구축 순서',
      'AWS 공식 제약 체크리스트',
      'CloudFront OAC',
      'preview deploy role 최소 정책',
      'cleanup workflow와 dry-run',
    ],
  ],
  [
    '28_Sentry_모니터링_활용_가이드.md',
    [
      'Sentry SDK',
      'source map',
      'release health',
      'browserTracingIntegration',
      'tracesSampler',
      'Session Replay',
      'Trace Explorer',
      'sentryWebpackPlugin',
      'ownership rule',
      'Uptime Monitoring',
      'Cron Monitoring',
    ],
  ],
]);

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

function githubSlugBase(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[\\`*_[\]{}()#+.!?:;,"'<>|]/g, '')
    .replace(/&/g, '')
    .replace(/\//g, '')
    .replace(/\s/g, '-')
    .replace(/^-|-$/g, '');
}

function anchorsFor(file) {
  const text = stripCode(readText(file));
  const counts = new Map();
  const anchors = new Set();

  for (const match of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = githubSlugBase(match[1]);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

function markdownFiles() {
  const guideFiles = fs
    .readdirSync(GUIDE_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => path.join(GUIDE_DIR, file));

  return [README, ...guideFiles];
}

function guideBasenames(guideFiles) {
  return guideFiles.map((file) => path.basename(file)).sort();
}

function validateGuideSequence(guideFiles) {
  const errors = [];
  const names = guideBasenames(guideFiles);
  const expectedPrefixes = Array.from({ length: 31 }, (_, index) =>
    String(index).padStart(2, '0'),
  );

  if (guideFiles.length !== 31) {
    errors.push(`expected 31 guide docs, found ${guideFiles.length}`);
  }

  for (const name of names) {
    if (!/^[0-9]{2}_.+\.md$/.test(name)) {
      errors.push(`guide filename does not match NN_name.md: ${name}`);
    }
  }

  for (const prefix of expectedPrefixes) {
    const matches = names.filter((name) => name.startsWith(`${prefix}_`));

    if (matches.length === 0) {
      errors.push(`missing guide prefix: ${prefix}`);
    }

    if (matches.length > 1) {
      errors.push(`duplicate guide prefix ${prefix}: ${matches.join(', ')}`);
    }
  }

  return errors;
}

function validateStructure(guideFiles) {
  const errors = [];

  for (const file of guideFiles) {
    const text = readText(file);
    const missing = REQUIRED_DOC_MARKERS.filter((marker) => !text.includes(marker));

    if (missing.length > 0) {
      errors.push(`${path.relative(ROOT, file)} missing markers: ${missing.join(', ')}`);
    }
  }

  return errors;
}

function validateDuplicateNumberedHeadings(guideFiles) {
  const errors = [];

  for (const file of guideFiles) {
    const text = readText(file);
    const numbers = [...text.matchAll(/^#{2,6}\s+([0-9]+(?:\.[0-9]+)+)\b/gm)].map(
      (match) => match[1],
    );
    const seen = new Map();
    const duplicates = [];

    for (const number of numbers) {
      const count = seen.get(number) ?? 0;
      seen.set(number, count + 1);

      if (count === 1) {
        duplicates.push(number);
      }
    }

    if (duplicates.length > 0) {
      errors.push(`${path.relative(ROOT, file)} duplicate numbered headings: ${duplicates.join(', ')}`);
    }
  }

  return errors;
}

function validateLinks(files) {
  const errors = [];
  const anchorCache = new Map(files.map((file) => [path.resolve(file), anchorsFor(file)]));

  for (const file of files) {
    const text = stripCode(readText(file));
    const linkPattern = /\[[^\]\n]+\]\(([^)\n]+)\)/g;
    let match;

    while ((match = linkPattern.exec(text))) {
      let href = match[1].trim().replace(/^<|>$/g, '');

      if (!href || /^(https?:|mailto:|tel:)/.test(href)) {
        continue;
      }

      const hashIndex = href.indexOf('#');
      const filePart = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
      const hash = hashIndex >= 0 ? href.slice(hashIndex + 1) : '';
      let targetPath = filePart;

      if (!targetPath) {
        targetPath = file;
      } else {
        try {
          targetPath = decodeURI(targetPath);
        } catch {
          // Keep original href for filesystem check.
        }

        targetPath = path.resolve(path.dirname(file), targetPath);
      }

      if (!fs.existsSync(targetPath)) {
        errors.push(`${path.relative(ROOT, file)} -> ${href} missing file`);
        continue;
      }

      if (!hash) {
        continue;
      }

      const anchors = anchorCache.get(path.resolve(targetPath)) ?? anchorsFor(targetPath);
      anchorCache.set(path.resolve(targetPath), anchors);

      if (!anchors.has(decodeURIComponent(hash).toLowerCase())) {
        errors.push(`${path.relative(ROOT, file)} -> ${href} missing anchor`);
      }
    }
  }

  return errors;
}

function validateGuideIndexReferences(guideFiles) {
  const errors = [];
  const expected = new Set(guideBasenames(guideFiles));
  const readmeGuideLinks = new Set();
  const siteGuideLinks = new Set();
  const readmeText = readText(README);
  const siteText = readText(INDEX_HTML);

  for (const match of readmeText.matchAll(/\]\(public\/개발가이드\/([^)#]+\.md)(?:#[^)]+)?\)/g)) {
    readmeGuideLinks.add(match[1]);
  }

  for (const match of siteText.matchAll(/github\.com\/blue45f\/heejun\/blob\/main\/public\/개발가이드\/([^"]+\.md)/g)) {
    try {
      siteGuideLinks.add(decodeURI(match[1]));
    } catch {
      siteGuideLinks.add(match[1]);
    }
  }

  for (const [label, links] of [
    ['README guide index', readmeGuideLinks],
    ['index.html guide links', siteGuideLinks],
  ]) {
    for (const name of expected) {
      if (!links.has(name)) {
        errors.push(`${label} missing guide: ${name}`);
      }
    }

    for (const name of links) {
      if (!expected.has(name)) {
        errors.push(`${label} references unknown guide: ${name}`);
      }
    }
  }

  return errors;
}

function validateForbiddenText(files) {
  const errors = [];

  for (const file of files) {
    const text = readText(file);
    const companyMatch = text.match(FORBIDDEN_COMPANY_PATTERN);
    const qualityMatch = text.match(FORBIDDEN_QUALITY_PATTERN);
    const artifactMatch = text.match(FORBIDDEN_ARTIFACT_PATTERN);

    if (companyMatch) {
      errors.push(`${path.relative(ROOT, file)} forbidden company-specific text: ${companyMatch[0]}`);
    }

    if (qualityMatch) {
      errors.push(`${path.relative(ROOT, file)} forbidden quality/prompt text: ${qualityMatch[0]}`);
    }

    if (artifactMatch) {
      errors.push(`${path.relative(ROOT, file)} forbidden artifact text: ${artifactMatch[0]}`);
    }
  }

  return errors;
}

function validateNoLegacyGuideText(files) {
  const errors = [];

  for (const file of files) {
    const text = readText(file);
    const match = text.match(FORBIDDEN_LEGACY_GUIDE_PATTERN);

    if (match) {
      errors.push(`${path.relative(ROOT, file)} legacy year/trend text remains: ${match[0]}`);
    }
  }

  const siteText = readText(INDEX_HTML);
  const staleSiteHeading = `개발 가이드 (${LEGACY_YEAR} ${LEGACY_EDITION})`;
  if (siteText.includes(staleSiteHeading)) {
    errors.push(`index.html still labels development guides with legacy year label`);
  }

  return errors;
}

function validateSourceRegistry(files) {
  const errors = [];

  for (const file of files) {
    const text = readText(file);

    for (const url of REQUIRED_SOURCE_URLS) {
      if (!text.includes(url)) {
        errors.push(`${path.relative(ROOT, file)} missing required source URL: ${url}`);
      }
    }
  }

  return errors;
}

function validateRequiredGuideSections(guideFiles) {
  const errors = [];

  for (const file of guideFiles) {
    const required = REQUIRED_GUIDE_SECTIONS.get(path.basename(file));

    if (!required) {
      continue;
    }

    const text = readText(file);
    const missing = required.filter((section) => !text.includes(section));

    if (missing.length > 0) {
      errors.push(`${path.relative(ROOT, file)} missing required section text: ${missing.join(', ')}`);
    }
  }

  return errors;
}

function extractSectionBlock(text, heading) {
  const marker = `### ${heading}`;
  const start = text.lastIndexOf(marker);

  if (start < 0) {
    return '';
  }

  const sectionStart = start + marker.length;
  const rest = text.slice(sectionStart);
  const nextHeading = rest.search(/\n#{1,3}\s/m);

  return nextHeading < 0 ? rest : rest.slice(0, nextHeading);
}

function validatePracticalSections(guideFiles) {
  const errors = [];

  for (const file of guideFiles) {
    const text = readText(file);
    const when = extractSectionBlock(text, '언제 이 문서를 펼칠까');
    const steps = extractSectionBlock(text, '적용 순서');
    const colocate = extractSectionBlock(text, '함께 두는 파일');
    const mistakes = extractSectionBlock(text, '흔한 실수');
    const done = extractSectionBlock(text, 'PR 완료 기준');

    const checks = [
      ['언제 이 문서를 펼칠까', when, /^- /gm, 3],
      ['적용 순서', steps, /^[0-9]+\. /gm, 5],
      ['함께 두는 파일', colocate, /^- /gm, 3],
      ['흔한 실수', mistakes, /^- /gm, 4],
      ['PR 완료 기준', done, /^- \[ \] /gm, 4],
    ];

    for (const [label, block, pattern, min] of checks) {
      const count = (block.match(pattern) || []).length;

      if (count < min) {
        errors.push(
          `${path.relative(ROOT, file)} practical section '${label}' should have >=${min} items (found ${count})`,
        );
      }
    }
  }

  return errors;
}

function normalizeLine(line) {
  return line
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\u2000-\u200B\uFEFF]/g, '');
}

function md5(value) {
  return createHash('md5').update(value).digest('hex');
}

function validateCopyRisk(guideFiles) {
  const copiedLines = new Map();
  const copiedParagraphs = new Map();
  const repeatedHeadings = new Map();
  const allowedRepeatedHeadings = new Set([
    '## 문서 책임 범위',
    '## 0. 먼저 알고 가기 (30초 요약)',
    '## 실무 적용 가이드',
    '## 초심자용 한눈에 보기',
    '## 체크리스트',
    '## 0. 모든 프론트엔드 그룹 공통 Baseline',
    '## 0.0 문서 네비게이션 맵',
    '## 0.1 교차 검증 매트릭스',
    '## 0.2 운영 게이트',
    '## 0.3 가이드 학습 플로우 도식',
    '## 2.0 구현 예시',
    '## 3.0 마무리',
    '## 9. 주의사항 및 흔한 실수',
    '## 9. 체크리스트',
    '## 10. 제외한 벤더 종속 항목',
    '## 쉬운 말로 보는 용어 정리 (이 문서 중심)',
    '## 추천 항목 (실무 우선순위)',
    '## 추천 항목 고도화 체크',
    '## 추천 항목 실행 기록 템플릿',
    '## 추천 항목 실행 우선순위 매핑',
    '## 추천 항목 실행 체크리스트',
    '## 추천 항목 실행 운영 규칙',
  ]);

  const failures = [];
  const warnings = [];

  for (const file of guideFiles) {
    const rawText = readText(file);
    const text = stripCode(rawText);

    for (const line of text.split('\n')) {
      const normalized = normalizeLine(line);
      if (!normalized) continue;

      if (normalized.startsWith('## ')) {
        const set = repeatedHeadings.get(normalized) || new Set();
        set.add(path.basename(file));
        repeatedHeadings.set(normalized, set);
      }

      if (normalized.length < COPY_RISK_CONFIG.copyLineMinLength) {
        continue;
      }

      if (/^\|/.test(normalized) || /^>/.test(normalized) || /^#/.test(normalized)) {
        continue;
      }

      if (isAllowedSharedCopy(normalized)) {
        continue;
      }

      const set = copiedLines.get(normalized) || new Set();
      set.add(path.basename(file));
      copiedLines.set(normalized, set);
    }

    for (const block of text.split(/\n\s*\n+/)) {
      const paragraph = normalizeLine(block.replace(/\n/g, ' '));

      if (paragraph.length < 100 || paragraph.startsWith('|') || paragraph.startsWith('>') || paragraph.startsWith('#')) {
        continue;
      }

      if (isAllowedSharedCopy(paragraph)) {
        continue;
      }

      const key = md5(paragraph.toLowerCase());
      const set = copiedParagraphs.get(key) || new Set();
      set.add(path.basename(file));
      copiedParagraphs.set(key, set);
    }
  }

  const crossLineDupes = [];
  for (const [line, files] of copiedLines.entries()) {
    if (files.size >= COPY_RISK_CONFIG.copyLineMinFiles) {
      crossLineDupes.push([line, files]);
    }
  }

  const crossParagraphDupes = [];
  for (const [digest, files] of copiedParagraphs.entries()) {
    if (files.size >= COPY_RISK_CONFIG.copyParagraphMinFiles) {
      crossParagraphDupes.push([digest, files]);
    }
  }

  for (const [heading, files] of repeatedHeadings.entries()) {
    if (files.size >= COPY_RISK_CONFIG.headingWarningMinFiles && !allowedRepeatedHeadings.has(heading)) {
      warnings.push(`copy-risk warning: non-standard heading "${heading}" appears in ${files.size} docs`);
    }
  }

  if (crossLineDupes.length > 0) {
    failures.push(
      `cross-file duplicate lines detected (${crossLineDupes.length}). ` +
      `Sample: ${crossLineDupes
        .slice(0, 3)
        .map(([, files]) => files.size)
        .join(', ')}`,
    );
  }

  if (crossParagraphDupes.length > 0) {
    failures.push(
      `cross-file duplicate paragraph blocks detected (${crossParagraphDupes.length}). ` +
      'Review whether content is intentionally shared template.',
    );
  }

  return { failures, warnings, metrics: { crossLineDupes: crossLineDupes.length, crossParagraphDupes: crossParagraphDupes.length } };
}

function writeGithubSummary(summary) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  if (!summaryPath) {
    return;
  }

  const lines = [
    '# Dev Guide Validation',
    '',
    `- 총 문서 수: ${summary.guides}`,
    `- 정적 텍스트 파일 수: ${summary.publicTextFiles}`,
    '',
    `- 중복 라인 블록: ${summary.copyRisk.metrics.crossLineDupes}`,
    `- 중복 문단 블록: ${summary.copyRisk.metrics.crossParagraphDupes}`,
    '',
    `- 경고: ${summary.warnings.length}`,
    `- 실패: ${summary.failures.length}`,
  ];

  if (summary.warnings.length > 0) {
    lines.push('');
    lines.push('## 경고');
    for (const item of summary.warnings) {
      lines.push(`- ${item}`);
    }
  }

  if (summary.failures.length > 0) {
    lines.push('');
    lines.push('## 실패');
    for (const item of summary.failures) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push('');
    lines.push('## 결과');
    lines.push('문서 검증 통과');
  }

  fs.writeFileSync(summaryPath, `${lines.join('\n')}\n`);
}

function writeJsonReport(summary, reportPath) {
  if (!reportPath) {
    return;
  }

  const payload = {
    ...summary,
    generatedAt: new Date().toISOString(),
    exitCode: summary.failures.length > 0 ? 1 : 0,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`);
}

const files = markdownFiles();
const guideFiles = files.filter((file) => path.dirname(file) === GUIDE_DIR);
const publicTextFiles = [INDEX_HTML, ...files];
const sourceRegistryFiles = [README, path.join(GUIDE_DIR, '00_종합_가이드_목차.md')];
const guideAndReadmeAndValidator = [README, ...guideFiles, path.join(ROOT, 'scripts', 'validate-dev-guides.mjs')];

const copyRisk = validateCopyRisk(guideFiles);
const jsonReportPath = parseJsonReportPath(process.argv.slice(2));

const failures = [
  ...validateGuideSequence(guideFiles),
  ...validateStructure(guideFiles),
  ...validateDuplicateNumberedHeadings(guideFiles),
  ...validateLinks(files),
  ...validateGuideIndexReferences(guideFiles),
  ...validateForbiddenText(files),
  ...validateNoLegacyGuideText(guideAndReadmeAndValidator),
  ...validateSourceRegistry(sourceRegistryFiles),
  ...validateRequiredGuideSections(guideFiles),
  ...validatePracticalSections(guideFiles),
  ...copyRisk.failures,
];

const summary = {
  guides: guideFiles.length,
  publicTextFiles: publicTextFiles.length,
  failures,
  warnings: copyRisk.warnings,
  copyRisk: {
    metrics: copyRisk.metrics,
    failed: copyRisk.failures.length,
    warned: copyRisk.warnings.length,
  },
};

if (failures.length > 0) {
  writeGithubSummary(summary);
  writeJsonReport(summary, jsonReportPath);
  console.error(`dev guide validation failed (${failures.length})`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (copyRisk.warnings.length > 0) {
  console.log('dev guide copy-risk warnings:');
  for (const warning of copyRisk.warnings) {
    console.log(`- ${warning}`);
  }
}

if (copyRisk.metrics.crossLineDupes > 0 || copyRisk.metrics.crossParagraphDupes > 0) {
  console.log(
    `copy-risk metrics: repeated line blocks=${copyRisk.metrics.crossLineDupes}, ` +
      `repeated paragraph blocks=${copyRisk.metrics.crossParagraphDupes}`,
  );
}

writeJsonReport(summary, jsonReportPath);
writeGithubSummary(summary);
console.log(`dev guide validation passed: ${guideFiles.length} guides, ${publicTextFiles.length} public text files`);
