#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const GUIDE_DIR = path.join(ROOT, 'public', '개발가이드');

const REQUIRED_HEADINGS = [
  /^## 추천 항목 /m,
  /^## 추천 항목 고도화 체크/m,
  /^## 추천 항목 실행 기록 템플릿/m,
  /^## 추천 항목 실행 우선순위 매핑/m,
];

const REQUIRED_LABELS = [
  '추천 항목',
  '추천 항목 고도화 체크',
  '추천 항목 실행 기록 템플릿',
  '추천 항목 실행 우선순위 매핑',
];

async function main() {
  const files = await fs.readdir(GUIDE_DIR, { withFileTypes: true });
  const mdFiles = files
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(GUIDE_DIR, entry.name));

  const missing = [];
  for (const file of mdFiles) {
    const text = await fs.readFile(file, 'utf8');
    if (!/^## 추천 항목 /m.test(text)) {
      continue;
    }

    const notFound = REQUIRED_HEADINGS.filter((pattern) => !pattern.test(text));
    if (notFound.length > 0) {
      const missingLabels = notFound.map((pat, idx) => {
        const match = REQUIRED_LABELS.find((label) => {
          const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`##\\s+${escaped}`, 'm').test(text);
        });
        return match ? null : REQUIRED_LABELS[idx];
      });
      missing.push({
        file: path.relative(ROOT, file),
        missing: missingLabels.filter(Boolean),
      });
    }
  }

  if (missing.length === 0) {
    console.log('✅ 모든 추천 항목 문서에 고도화 템플릿이 적용되어 있습니다.');
    process.exit(0);
  }

  console.log('⚠️ 누락된 추천 항목 고도화 템플릿:');
  for (const item of missing) {
    console.log(`- ${item.file}: ${item.missing.join(', ')}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error('검증 중 오류가 발생했습니다.', error);
  process.exit(1);
});
