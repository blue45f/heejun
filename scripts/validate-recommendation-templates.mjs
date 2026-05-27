#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const GUIDE_DIR = path.join(ROOT, 'public', '개발가이드');

const args = new Set(process.argv.slice(2));
const getArgValue = (prefix) => {
  const argv = process.argv.slice(2);
  const index = argv.findIndex((arg) => arg === prefix || arg.startsWith(`${prefix}=`));
  if (index === -1) return null;
  const arg = argv[index];
  if (arg === prefix) {
    return argv[index + 1] ?? null;
  }
  return arg.slice(prefix.length + 1);
};

const jsonReportPath = getArgValue('--json-report');
const mdReportPath = getArgValue('--md-report');

const REQUIREMENTS = [
  '## 추천 항목 ',
  '## 추천 항목 고도화 체크',
  '## 추천 항목 실행 기록 템플릿',
  '## 추천 항목 실행 우선순위 매핑',
  '## 추천 항목 실행 체크리스트',
];

const CHECKLIST_REQUIRED_ITEMS = [
  '1단계(7일)',
  '2단계(30일)',
  '3단계(60일)',
  '문제 대응',
];

function sectionOrderValid(text) {
  const lines = text.split('\n');
  const positions = REQUIREMENTS.map((req) => {
    return lines.findIndex((line) => line.startsWith(req));
  });
  return positions.every((value) => value !== -1) &&
    positions.every((value, index, all) => index === 0 || all[index - 1] < value);
}

function hasRequiredChecklistItems(text) {
  const start = text.indexOf('## 추천 항목 실행 체크리스트');
  if (start === -1) return false;

  const body = text.slice(start).split('\n').slice(1);
  return CHECKLIST_REQUIRED_ITEMS.every((item) =>
    body.some((line) => line.includes(item)),
  );
}

function normalizeBoolean(value) {
  return value ? 'PASS' : 'FAIL';
}

async function main() {
  const dirEntries = await fs.readdir(GUIDE_DIR, { withFileTypes: true });
  const files = dirEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(GUIDE_DIR, entry.name));

  const errors = [];
  const summary = [];

  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');

    if (!text.includes('## 추천 항목 ')) continue;

    const orderValid = sectionOrderValid(text);
    const checklistOk = hasRequiredChecklistItems(text);
    const detail = {
      file: path.relative(ROOT, file),
      sectionOrder: orderValid,
      checklist: checklistOk,
      ok: orderValid && checklistOk,
    };

    summary.push(detail);

    if (!detail.ok) {
      const missing = [];
      if (!orderValid) {
        missing.push('추천 항목 섹션 순서/존재 오류');
      }
      if (!checklistOk) {
        missing.push('실행 체크리스트 항목 누락');
      }
      errors.push({
        file: detail.file,
        missing,
      });
    }
  }

  const passCount = summary.filter((item) => item.ok).length;
  const totalCount = summary.length;
  const jsonResult = {
    total: totalCount,
    pass: passCount,
    fail: totalCount - passCount,
    files: summary,
  };

  if (jsonReportPath) {
    await fs.writeFile(jsonReportPath, JSON.stringify(jsonResult, null, 2), 'utf8');
  }

  if (mdReportPath) {
    const rows = [];
    rows.push('| 파일 | 섹션 순서 | 체크리스트 |');
    rows.push('| --- | --- | --- |');
    for (const row of summary) {
      rows.push(`| ${row.file} | ${normalizeBoolean(row.sectionOrder)} | ${normalizeBoolean(row.checklist)} |`);
    }
    await fs.writeFile(
      mdReportPath,
      ['# 추천 항목 템플릿 검증 요약', '', `전체 ${totalCount}개, 통과 ${passCount}개`, '', ...rows].join('\n') + '\n',
      'utf8',
    );
  }

  if (errors.length === 0) {
    console.log('✅ 추천 항목 문서 템플릿이 정책 기준을 모두 통과했습니다.');
    console.log(`요약: 전체 ${totalCount}개 중 통과 ${passCount}개`);
    process.exit(0);
  }

  console.log('⚠️ 추천 항목 템플릿 검증 실패');
  console.log(`요약: 전체 ${totalCount}개 중 통과 ${passCount}개`);
  for (const item of errors) {
    console.log(`- ${item.file}: ${item.missing.join(', ')}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error('추천 항목 템플릿 검증 중 오류', error);
  process.exit(1);
});
