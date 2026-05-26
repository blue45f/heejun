import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const GUIDE_DIR = path.join(ROOT, 'public', '개발가이드');
const README = path.join(ROOT, 'README.md');
const INDEX_HTML = path.join(ROOT, 'index.html');

const REQUIRED_DOC_MARKERS = [
  '문서 책임 범위',
  '0.1 교차 검증 매트릭스',
  '0.2 운영 게이트',
  '문서 최종 업데이트',
];

const FORBIDDEN_COMPANY_PATTERN =
  /배민|배달의민족|우아한|우아한형제들|Baemin|Woowa|토스(?!트)|카카오|쿠팡|당근|무신사|오늘의집|Carrefour|Auchan|Leclerc|현자비스|자비스앤빌런즈/;

const FORBIDDEN_QUALITY_PATTERN =
  /완벽|최강|무조건|국내 최초|혁명|사실상|업계 표준|AI 프롬프트|프롬프트 형식|Prompt [0-9]|붙여넣기|복사해서/;

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
  const expectedPrefixes = Array.from({ length: 27 }, (_, index) =>
    String(index).padStart(2, '0'),
  );

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

  if (guideFiles.length !== 27) {
    errors.push(`expected 27 guide docs, found ${guideFiles.length}`);
  }

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
          // Keep the original href for the filesystem check below.
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

    if (companyMatch) {
      errors.push(`${path.relative(ROOT, file)} forbidden company-specific text: ${companyMatch[0]}`);
    }

    if (qualityMatch) {
      errors.push(`${path.relative(ROOT, file)} forbidden quality/prompt text: ${qualityMatch[0]}`);
    }
  }

  return errors;
}

const files = markdownFiles();
const guideFiles = files.filter((file) => path.dirname(file) === GUIDE_DIR);
const failures = [
  ...validateGuideSequence(guideFiles),
  ...validateStructure(guideFiles),
  ...validateDuplicateNumberedHeadings(guideFiles),
  ...validateLinks(files),
  ...validateGuideIndexReferences(guideFiles),
  ...validateForbiddenText(files),
];

if (failures.length > 0) {
  console.error(`dev guide validation failed (${failures.length})`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`dev guide validation passed: ${guideFiles.length} guides, ${files.length} markdown files`);
