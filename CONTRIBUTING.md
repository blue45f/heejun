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

## 품질 기준

| 명령 | 목적 |
| --- | --- |
| `node --check scripts/validate-dev-guides.mjs` | 개발 가이드 검증기 문법 확인 |
| `node scripts/validate-dev-guides.mjs` | 개발 가이드 구조 검증 |
| `node --check scripts/validate-recommendation-templates.mjs` | 추천 템플릿 검증기 문법 확인 |
| `node scripts/validate-recommendation-templates.mjs` | 추천 템플릿 구조 검증 |
