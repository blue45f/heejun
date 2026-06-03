# heejun Development Guide

## 개요

이 프로젝트는 아키텍처 문서 정합성, 코드 변경 범위, CI 게이트를 함께 관리합니다.

## 필수 검증 흐름

- 아키텍처 문서 점검을 선행합니다.
- 문서 검증기(가이드·추천 템플릿) 게이트를 통과합니다.
- PR 병합 전 증적을 남깁니다.

> 이 저장소는 **정적 HTML을 빌드 없이 그대로 서빙**합니다(번들러/엔트리 없음).
> `index.html`을 직접 열어 미리보기하고, 검증은 아래 검증기 게이트로만 수행합니다.

## 최소 실행 커맨드

- `pnpm run verify`
- `pnpm run ci`

## 아키텍처 변경 규칙

1. 도메인 경계와 공유 타입 계약 변경은 `docs/ARCHITECTURE.md`에서 먼저 반영합니다.
2. 계약 변경이 API/스키마에 영향을 주면 문서와 테스트 계획을 함께 갱신합니다.
3. `pnpm run verify`는 `validate:architecture`가 선행된 상태여야 합니다.

## 배포 & 보안 헤더

- 배포 전체 흐름(정적 → Netlify, 시크릿, DNS, 프리뷰 vs 프로덕션)은 `docs/DEPLOYMENT.md`를 따릅니다.
- 보안 헤더와 **Content-Security-Policy**는 `netlify.toml`의 `[[headers]]`에 정의됩니다.
  CSP는 `index.html`이 실제로 쓰는 출처만 허용합니다(스크립트: cdnjs·unpkg, 스타일·폰트: jsdelivr).
- **새 외부 자원(CDN/폰트/스크립트)을 `index.html`에 추가하면 `netlify.toml`의 CSP directive를 반드시 함께 갱신**합니다. 누락 시 브라우저가 해당 자원을 차단합니다.
- 배포 후 헤더 검증: `curl -sI https://heejun.store | grep -i content-security-policy`

## PR 체크리스트

- 변경 범위 요약
- 영향 받는 도메인
- 실행한 검증 명령어 및 결과
- 회귀 확인 항목
