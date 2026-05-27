#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const GUIDE_DIR = path.join(ROOT, 'public', '개발가이드');

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
  let positions = REQUIREMENTS.map((req) => {
    const idx = lines.findIndex((line) => line.startsWith(req));
    return idx;
  });
  return positions.every((v) => v !== -1) &&
    positions.every((v, i, arr) => i === 0 || arr[i - 1] < v);
}

function hasRequiredChecklistItems(text) {
  const start = text.indexOf('## 추천 항목 실행 체크리스트');
  if (start === -1) return false;

  const body = text.slice(start).split('\n').slice(1);
  return CHECKLIST_REQUIRED_ITEMS.every((item) =>
    body.some((line) => line.includes(item)),
  );
}

async function main() {
  const dirEntries = await fs.readdir(GUIDE_DIR, { withFileTypes: true });
  const files = dirEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(GUIDE_DIR, entry.name));

  const errors = [];

  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');
    if (!text.includes('## 추천 항목 ')) continue;

    const missing = [];
    if (!sectionOrderValid(text)) {
      missing.push('추천 항목 섹션 순서/존재 오류');
    }
    if (!hasRequiredChecklistItems(text)) {
      missing.push('실행 체크리스트 항목 누락');
    }

    if (missing.length > 0) {
      errors.push({
        file: path.relative(ROOT, file),
        missing,
      });
    }
  }

  if (errors.length === 0) {
    console.log('✅ 추천 항목 문서 템플릿이 정책 기준을 모두 통과했습니다.');
    process.exit(0);
  }

  console.log('⚠️ 추천 항목 템플릿 검증 실패');
  for (const item of errors) {
    console.log(`- ${item.file}: ${item.missing.join(', ')}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error('추천 항목 템플릿 검증 중 오류', error);
  process.exit(1);
});
