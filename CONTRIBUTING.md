# Contributing

## 개발 환경

별도 패키지 설치 없이 Node.js로 검증 스크립트를 실행합니다.

```bash
node scripts/validate-dev-guides.mjs
node scripts/validate-recommendation-templates.mjs
```

## 작업 흐름

1. 문서는 `public/<category>/` 아래에 추가합니다.
2. 링크 구조나 파일 규칙이 바뀌면 `scripts/` 검증기를 함께 갱신합니다.
3. `index.html`에 노출되는 항목은 실제 public 문서와 일치해야 합니다.
4. PR 전에는 두 검증 스크립트를 모두 실행합니다.
5. PR 본문에는 `작업 요약`, `증빙`, `리스크/롤백 경로`를 남겨야 합니다.

## PR 규칙

1. 본 PR의 체크리스트는 `.github/PULL_REQUEST_TEMPLATE.md`를 기준으로 완성합니다.
2. PR 본문에 아래 항목을 기록해야 합니다.
   - 핵심 변경 내용 및 영향 범위
   - `pnpm run verify` 또는 프로젝트별 필수 게이트 실행 로그/요약
   - 실패/회귀 재현 명령 또는 `skipped` 처리 사유
   - rollback 포인트(필요 시)
3. PR 템플릿의 체크리스트 항목은 병합 전 모두 충족되어야 하며, `CodeRabbit review gate`는 최신 commit 기준 `APPROVED` 상태가 필요합니다.
4. 동일 PR에서 문서·설정 변경이 동시에 있을 때는 문서 변경 본문/링크 정합성 점검을 함께 기록합니다.

## 품질 기준

| 명령 | 목적 |
| --- | --- |
| `node --check scripts/validate-dev-guides.mjs` | 개발 가이드 검증기 문법 확인 |
| `node scripts/validate-dev-guides.mjs` | 개발 가이드 구조 검증 |
| `node --check scripts/validate-recommendation-templates.mjs` | 추천 템플릿 검증기 문법 확인 |
| `node scripts/validate-recommendation-templates.mjs` | 추천 템플릿 구조 검증 |
