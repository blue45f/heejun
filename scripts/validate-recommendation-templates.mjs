#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const GUIDE_DIR = path.join(ROOT, 'public', '개발가이드');

const argv = process.argv.slice(2);

const hasFlag = (name) => argv.includes(name);
const getArgValue = (prefix) => {
  const index = argv.findIndex((arg) => arg === prefix || arg.startsWith(`${prefix}=`));
  if (index === -1) {
    return null;
  }

  const arg = argv[index];
  if (arg === prefix) {
    return argv[index + 1] ?? null;
  }

  return arg.slice(prefix.length + 1);
};

const jsonReportPath = getArgValue('--json-report');
const mdReportPath = getArgValue('--md-report');
const shouldFix = hasFlag('--fix');
const EMPTY_VALUE_TOKEN = '[작성 필요]';

const TEMPLATE_SECTIONS = [
  {
    heading: '## 추천 항목 고도화 체크',
    body: [
      '- `즉시 적용` — 추천 항목 1개를 이번 주 내에 실제 작업 1건에 반영한다.',
      '- `1주 내 정리` — 적용 결과를 PR 본문이나 회고 노트에 간단히 기록한다.',
      '- `1개월 내 점검` — 재작업률/리뷰 충돌/배포 이슈 중 적어도 한 항목이 개선되었는지 확인한다.',
    ],
  },
  {
    heading: '## 추천 항목 실행 기록 템플릿',
    body: [
      '- `담당자` : 항목 적용 주체(문서 오너/팀원)를 명시',
      '- `적용일` : 실제 반영된 날짜 및 작업 ID를 남김',
      '- `측정 지표` : 리뷰 충돌/재작업/버그 재발 중 1개 이상 수치로 기록',
      '- `보류 사유` : 적용을 못한 경우 이유를 1줄 기록하고 다음 액션을 지정',
    ],
  },
  {
    heading: '## 추천 항목 실행 우선순위 매핑',
    body: [
      '- `P1(7일 내)` — 추천 항목 1개를 우선 적용하고 1회 사용자 관측 신호(에러율/실패율/지연)와 연결한다.',
      '- `P2(30일 내)` — 추천 항목 1개를 팀 내 표준/템플릿에 반영해 재사용성을 확보한다.',
      '- `P3(90일 내)` — 추천 항목 1개를 다른 관련 문서에 역링크로 연동해 중복 작업을 줄인다.',
      '- `완료 기준` — 각 항목별 산출물(예: PR 링크/체크리스트/회고 노트)을 1개 이상 남긴다.',
    ],
  },
  {
    heading: '## 추천 항목 실행 체크리스트',
    body: [
      '- [ ] `1단계(7일)` : 추천 항목 1개를 실제 작업으로 전환',
      '- [ ] `2단계(30일)` : 전환 결과를 팀 산출물(ADR/PR/체크리스트)에 반영',
      '- [ ] `3단계(60일)` : 정적 지표 1개 이상으로 효과 검증',
      '- [ ] `문제 대응` : 미달성 시 보류 사유와 다음 실행 액션을 문서화',
    ],
  },
  {
    heading: '## 추천 항목 실행 운영 규칙',
    body: [
      '- `실행 게이트` : 위험, 비용, 기대 효과가 1회 이상 정량화되어야 적용한다.',
      '- `승인 체계` : 적용 전 사전 승인자(팀 리드/보안/운영)와 rollback 담당자를 확인한다.',
      '- `리스크 점수` : 1~5 등급으로 현재 위험도를 기록하고 정량 기준을 남긴다.',
      '- `리더 승인자` : 최종 승인 책임자(예: 팀 리드/PO/보안리더)를 명시한다.',
      '- `승인 역할` : 승인자, 실행자, 모니터링 주체 역할을 분리해 적는다.',
      '- `재개 조건` : 실패 신호가 기준치 이내로 돌아오면 다음 단계로 확장한다.',
      '- `정지 조건` : 회귀 지표 악화가 1개 이상이면 즉시 중단하고 보류 사유를 갱신한다.',
      '- `재평가 주기` : 최소 2주 단위로 상태를 리뷰하고 조정한다.',
    ],
  },
];

const CHECKLIST_REQUIRED_ITEMS = [
  '1단계(7일)',
  '2단계(30일)',
  '3단계(60일)',
  '문제 대응',
];

const OPERATING_RULE_REQUIRED_ITEMS = [
  '실행 게이트',
  '승인 체계',
  '재개 조건',
  '정지 조건',
  '리스크 점수',
  '리더 승인자',
  '승인 역할',
  '재평가 주기',
];

const OPERATING_RULE_DEFAULT_VALUES = {
  '리스크 점수': '3(중간, 1~5 중 3)',
  '리더 승인자': '도메인 리드 또는 운영 리드',
  '승인 역할': '승인자, 실행자, 모니터링 담당자 명시',
  '재평가 주기': '2주 단위',
};

const RECOMMENDATION_SECTION_HEADINGS = TEMPLATE_SECTIONS.map((section) => section.heading);

function getSectionText(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) {
    return null;
  }

  const nextSectionStart = TEMPLATE_SECTIONS
    .map((section) => text.indexOf(section.heading, start + heading.length))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b)[0];

  return {
    start,
    end: nextSectionStart ?? text.length,
    content: text.slice(start, nextSectionStart ?? text.length),
  };
}

function isOperatingRuleLine(line, requiredOps) {
  const match = line.match(/^-\s*`([^`]+)`\s*:\s*(.*)$/);
  if (!match) {
    return false;
  }

  const key = match[1].trim();
  return requiredOps.includes(key);
}

function isSectionHeading(line) {
  return /^##\s+/.test(line.trim());
}

function isChecklistItemLine(line) {
  const trimmed = line.trim();
  return /^-\s*\[[ xX]\]\s*`([^`]+)`\s*:\s*.+$/.test(trimmed);
}

function findNextSectionStart(lines, fromIndex) {
  for (let i = fromIndex + 1; i < lines.length; i += 1) {
    if (isSectionHeading(lines[i])) {
      return i;
    }
  }
  return lines.length;
}

function removeDuplicateSectionHeadings(text, headings) {
  const lines = text.split('\n');
  const headingSet = new Set(headings);
  const seen = new Set();
  const duplicates = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!headingSet.has(lines[i])) {
      continue;
    }

    if (seen.has(lines[i])) {
      const sectionEnd = findNextSectionStart(lines, i);
      duplicates.push([i, sectionEnd]);
      continue;
    }

    seen.add(lines[i]);
  }

  if (duplicates.length === 0) {
    return text;
  }

  for (let i = duplicates.length - 1; i >= 0; i -= 1) {
    const [start, end] = duplicates[i];
    lines.splice(start, end - start);
  }

  return lines.join('\n');
}

function parseOperatingRuleValues(sectionText) {
  const lines = sectionText.split('\n');
  const itemPattern = /^-\s*`([^`]+)`\s*:\s*(.*)$/;
  const values = {};

  for (const line of lines) {
    const match = line.match(itemPattern);
    if (!match) {
      continue;
    }
    values[match[1].trim()] = (match[2] ?? '').trim();
  }

  return values;
}

function normalizeValue(value) {
  return (value ?? '').trim();
}

function isMissingValue(value) {
  const normalized = normalizeValue(value);
  return normalized.length === 0 || normalized === EMPTY_VALUE_TOKEN;
}

function getDefaultOperatingRuleValue(key, fileName) {
  if (!OPERATING_RULE_DEFAULT_VALUES[key]) {
    return EMPTY_VALUE_TOKEN;
  }

  if (key !== '리스크 점수') {
    return OPERATING_RULE_DEFAULT_VALUES[key];
  }

  if (/(보안|IaC|배포|관측성|접근성|성능|인프라)/.test(fileName)) {
    return '4(높음, 1~5 중 4)';
  }

  return OPERATING_RULE_DEFAULT_VALUES[key];
}

function countMissingOperatingValues(values) {
  return OPERATING_RULE_REQUIRED_ITEMS.filter((item) => isMissingValue(values[item])).length;
}

function normalizeSectionValues(values, fileName) {
  const normalized = {};
  for (const key of OPERATING_RULE_REQUIRED_ITEMS) {
    const value = values[key];
    normalized[key] = isMissingValue(value) ? getDefaultOperatingRuleValue(key, fileName) : value;
  }

  return normalized;
}

function buildOperatingRuleSection(values, fileName) {
  const normalized = normalizeSectionValues(values, fileName);
  const lines = ['## 추천 항목 실행 운영 규칙', ''];

  for (const key of OPERATING_RULE_REQUIRED_ITEMS) {
    lines.push(`- \`${key}\` : ${normalized[key]}`);
  }

  return `${lines.join('\n')}\n`;
}

function removeOrphanRuleLinesBeforeSection(text, checklistHeading, ruleHeading, requiredOps) {
  const lines = text.split('\n');

  const checklistStart = lines.indexOf(checklistHeading);
  if (checklistStart === -1) {
    return text;
  }

  let cursor = checklistStart + 1;
  while (cursor < lines.length) {
    const line = lines[cursor];
    if (!line.trim()) {
      cursor += 1;
      continue;
    }

    if (isChecklistItemLine(line)) {
      cursor += 1;
      continue;
    }

    break;
  }

  const ruleStart = lines.indexOf(ruleHeading, cursor);
  if (ruleStart === -1) {
    return text;
  }

  const orphanLines = lines.slice(cursor, ruleStart);
  const allOrphanAsRules = orphanLines.every((line) => {
    const trimmed = line.trim();
    return trimmed.length === 0 || isOperatingRuleLine(line, requiredOps);
  });

  if (!allOrphanAsRules) {
    return text;
  }

  const normalized = [...lines];
  normalized.splice(cursor, ruleStart - cursor);
  return normalized.join('\n');
}

function sectionOrderValid(text) {
  const lines = text.split('\n');
  const positions = TEMPLATE_SECTIONS.map((section) =>
    lines.findIndex((line) => line.startsWith(section.heading)),
  );

  const allFound = positions.every((pos) => pos !== -1);
  if (!allFound) {
    return false;
  }

  return positions.every((position, idx, all) => idx === 0 || all[idx - 1] < position);
}

function hasRequiredChecklistItems(text) {
  const start = text.indexOf('## 추천 항목 실행 체크리스트');
  if (start === -1) {
    return false;
  }

  const body = text.slice(start).split('\n').slice(1);
  return CHECKLIST_REQUIRED_ITEMS.every((item) =>
    body.some((line) => line.includes(item)),
  );
}

function hasRequiredOperatingRules(text) {
  const section = getSectionText(text, '## 추천 항목 실행 운영 규칙');
  if (!section) {
    return false;
  }

  const values = parseOperatingRuleValues(section.content);
  return OPERATING_RULE_REQUIRED_ITEMS.every(
    (item) => values[item] && !isMissingValue(values[item]),
  );
}

function ensureSectionText(sectionName, text, requiredItems) {
  const sectionPos = text.indexOf(sectionName);
  if (sectionPos < 0) {
    return text;
  }

  const nextSectionPos = TEMPLATE_SECTIONS
    .map((section) => text.indexOf(section.heading, sectionPos + sectionName.length))
    .filter((pos) => pos >= 0)
    .sort((a, b) => a - b)[0] ?? text.length;

  const sectionStart = sectionPos;
  const sectionEnd = nextSectionPos;
  const sectionBody = text.slice(sectionStart, sectionEnd);
  const missing = requiredItems.filter((item) => !sectionBody.includes(item));
  if (missing.length === 0) {
    return text;
  }

  const insertion = missing
    .map((item) => '- `' + item + '` : ')
    .join('\n');
  const fixedSection = `${sectionBody.trimEnd()}\n${insertion}\n\n`;

  return `${text.slice(0, sectionStart)}${fixedSection}${text.slice(sectionEnd)}`;
}

function makeSectionText(heading, body) {
  return [`${heading}`, '', ...body, ''].join('\n');
}

async function fixFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  let updated = text;

  const requiredOps = [
    '실행 게이트',
    '승인 체계',
    '리스크 점수',
    '리더 승인자',
    '승인 역할',
    '재개 조건',
    '정지 조건',
    '재평가 주기',
  ];

  updated = removeDuplicateSectionHeadings(updated, RECOMMENDATION_SECTION_HEADINGS);

  updated = removeOrphanRuleLinesBeforeSection(
    updated,
    '## 추천 항목 실행 체크리스트',
    '## 추천 항목 실행 운영 규칙',
    requiredOps,
  );

  const ruleSection = getSectionText(updated, '## 추천 항목 실행 운영 규칙');
  if (ruleSection) {
    const ruleValues = parseOperatingRuleValues(ruleSection.content);
    const rebuiltSection = buildOperatingRuleSection(ruleValues, path.basename(filePath));
    updated = `${updated.slice(0, ruleSection.start)}${rebuiltSection}${updated.slice(ruleSection.end)}`;
  }

  const missingSections = TEMPLATE_SECTIONS.filter(
    (section) => !text.includes(section.heading),
  );

  if (missingSections.length === 0) {
    if (updated !== text) {
      await fs.writeFile(filePath, updated, 'utf8');
      return true;
    }

    return false;
  }

  updated = `${updated}\n`;
  missingSections.forEach((section) => {
    updated += `\n${makeSectionText(section.heading, section.body)}`;
  });

  await fs.writeFile(filePath, updated, 'utf8');
  return true;
}

function normalizeBoolean(value) {
  return value ? 'PASS' : 'FAIL';
}

async function main() {
  const dirEntries = await fs.readdir(GUIDE_DIR, { withFileTypes: true });
  const files = dirEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(GUIDE_DIR, entry.name));

  const summary = [];
  const errors = [];
  const fixed = [];

  for (const file of files) {
    let text = await fs.readFile(file, 'utf8');

    if (!text.includes('## 추천 항목 ')) {
      continue;
    }

    const missingSections = TEMPLATE_SECTIONS.filter(
      (section) => !text.includes(section.heading),
    ).map((section) => section.heading);

    const sectionOrderBefore = sectionOrderValid(text);
    const checklistBefore = hasRequiredChecklistItems(text);
    const operatingRulesBefore = hasRequiredOperatingRules(text);

    if (shouldFix) {
      const changed = await fixFile(file);
      if (changed) {
        fixed.push(path.relative(ROOT, file));
        text = await fs.readFile(file, 'utf8');
      }
    }

    const sectionOrder = sectionOrderValid(text);
    const checklist = hasRequiredChecklistItems(text);
    const operatingRules = hasRequiredOperatingRules(text);
    const operatingRuleValues = parseOperatingRuleValues(
      getSectionText(text, '## 추천 항목 실행 운영 규칙')?.content ?? '',
    );
    const operatingRuleMissingCount = countMissingOperatingValues(operatingRuleValues);

    const row = {
      file: path.relative(ROOT, file),
      sectionOrder,
      checklist,
      operatingRules,
      operatingRuleMissingCount,
      missingSections,
      ok: sectionOrder && checklist && operatingRules,
    };
    summary.push(row);

    if (!row.ok) {
      const missing = [];
      if (!sectionOrder) {
        missing.push('추천 항목 섹션 순서/존재 오류');
      }
      if (!checklist) {
        missing.push('실행 체크리스트 항목 누락');
      }
      if (!operatingRules) {
        missing.push('실행 운영 규칙 항목 누락 또는 값 미기재');
      }
      if (operatingRuleMissingCount > 0) {
        missing.push(`운영 규칙 값 미기재: ${operatingRuleMissingCount}개`);
      }
      errors.push({
        file: row.file,
        missing,
      });
    }
  }

  const passCount = summary.filter((item) => item.ok).length;
  const totalCount = summary.length;
  const result = {
    total: totalCount,
    pass: passCount,
    fail: totalCount - passCount,
    fixed: fixed.length,
    files: summary,
  };

  if (jsonReportPath) {
    await fs.writeFile(jsonReportPath, JSON.stringify(result, null, 2), 'utf8');
  }

  if (mdReportPath) {
    const rows = [];
    rows.push('| 파일 | 섹션 순서 | 체크리스트 | 운영 규칙 | 운영 규칙 미기재 |');
    rows.push('| --- | --- | --- | --- | --- |');

    for (const row of summary) {
      rows.push(
        `| ${row.file} | ${normalizeBoolean(row.sectionOrder)} | ${normalizeBoolean(row.checklist)} | ${normalizeBoolean(row.operatingRules)} | ${row.operatingRuleMissingCount} |`,
      );
    }

    rows.push('');
    rows.push(`- 고정된 파일: ${fixed.length}개`);

    await fs.writeFile(
      mdReportPath,
      ['# 추천 항목 템플릿 검증 요약', '', `전체 ${totalCount}개, 통과 ${passCount}개`, '', ...rows].join('\n') + '\n',
      'utf8',
    );
  }

  if (errors.length === 0) {
    console.log('✅ 추천 항목 문서 템플릿이 정책 기준을 모두 통과했습니다.');
    console.log(`요약: 전체 ${totalCount}개 중 통과 ${passCount}개`);
    if (fixed.length > 0) {
      console.log(`자동 보강: ${fixed.join(', ')}`);
    }
    process.exit(0);
  }

  console.log('⚠️ 추천 항목 템플릿 검증 실패');
  console.log(`요약: 전체 ${totalCount}개 중 통과 ${passCount}개`);
  if (fixed.length > 0) {
    console.log(`자동 보강: ${fixed.join(', ')}`);
  }
  for (const item of errors) {
    console.log(`- ${item.file}: ${item.missing.join(', ')}`);
    if (item.missing.includes('추천 항목 섹션 순서/존재 오류')) {
      console.log(`  - 누락 섹션: ${[...new Set(summary.find((x) => x.file === item.file).missingSections)].join(', ')}`);
    }
  }

  process.exit(1);
}

main().catch((error) => {
  console.error('추천 항목 템플릿 검증 중 오류', error);
  process.exit(1);
});
