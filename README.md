# AI-First Frontend Development Guide (2026)

> https://heejun.store

프론트엔드 엔지니어링을 언어, 프레임워크, 아키텍처, 품질, 인프라, 협업, 접근성, 디자인 시스템, 운영까지 한 흐름으로 묶은 2026년 기준 개발 가이드입니다.

## Overview

이 저장소는 `public/개발가이드` 아래의 27개 문서(00-26)로 구성됩니다. 문서는 단순 튜토리얼이 아니라 팀 표준으로 바로 사용할 수 있도록 다음 기준을 따릅니다.

- **공식 출처 우선**: React, TypeScript, Vite, W3C, OWASP, Search Central 등 1차 문서를 기준으로 버전과 표준 상태를 관리합니다.
- **벤더 중립 기준**: 특정 회사, 클라우드, 협업 도구에 묶인 절차는 표준에서 제외하고, 동일한 품질 속성을 만족하는 교체 가능한 원칙만 남깁니다.
- **운영 가능한 예제**: 설정 파일, CI/CD, 테스트, 배포, 장애 대응 예제는 팀 상황에 맞게 조정할 수 있는 형태로 작성합니다.
- **AI 협업 내장**: 각 주제마다 설계, 리뷰, 테스트, 마이그레이션, 사고 예방에 사용할 수 있는 AI 보조 시나리오와 검증 기준을 포함합니다.
- **품질 게이트 중심**: 타입, 테스트, 성능, 접근성, 보안, 배포 승인 기준을 체크리스트와 자동화 관점에서 정리합니다.

## Document Architecture

문서 간 유사성을 기준으로 구조를 다시 나눴습니다. 동일한 원칙을 여러 문서에 반복하지 않고, 공통 운영 원칙은 상위 허브에 두며 개별 문서는 해당 도메인의 실행 기준과 예외 기준만 담당합니다.

| Layer | Documents | Responsibility | Avoid Duplicating |
|-------|-----------|----------------|-------------------|
| **System Map** | 00 | 전체 로드맵, 권고 등급, 교차 검증, 단일 출처 | 개별 기술 튜토리얼 |
| **Core Engineering** | 01-06 | 언어, 프레임워크, 상태, 아키텍처, API, 보안의 구현 표준 | 배포 절차, 사고 대응 runbook |
| **Quality Gates** | 07, 08, 13, 19 | 테스트, 성능, 호환성, 접근성의 측정 기준 | CI/CD 도구별 상세 설정 |
| **Delivery & Operations** | 09-12, 14, 22 | 관측성, 인프라, CI/CD, CDN, 배포, 모노레포 운영 | 제품별 UI 구현 가이드 |
| **Governance & AI** | 15-18 | RFC/ADR, 리뷰, 온보딩, AI 사용 정책과 검증 책임 | 특정 AI 제품 사용법 |
| **Product Architecture & Experience** | 20, 21, 23-26 | 디자인 시스템, MFE, 국제화, 검색, 모션, 오프라인 경험 | 공통 운영 정책 재정의 |

## Single Source Of Truth

반복이 많은 주제는 아래 문서를 기준으로 관리합니다. 다른 문서는 해당 기준을 링크하고, 도메인별 추가 조건만 설명합니다.

| Shared Topic | Owner Document | Used By |
|--------------|----------------|---------|
| 교차 검증 프로토콜, 권고 등급 | [00. 종합 가이드 목차](public/개발가이드/00_종합_가이드_목차.md) | 전체 문서 |
| AI 사용 정책, 입력 구조, 검증 책임 | [18. AI 개발 워크플로우 종합](public/개발가이드/18_AI_개발_워크플로우_종합.md) | 16, 17, 19, 21, 24, 25, 26 |
| CI 품질 게이트와 공급망 증적 | [11. CI/CD 파이프라인 표준](public/개발가이드/11_CICD_파이프라인_표준.md) | 06, 07, 08, 13, 19, 22 |
| 배포 승인, 점진 노출, 롤백 기준 | [14. 배포 프로세스 체크리스트](public/개발가이드/14_배포_프로세스_체크리스트.md) | 09, 10, 11, 12, 21, 26 |
| 장애 대응, 알림, postmortem | [09. 장애 대응 및 관측성 표준](public/개발가이드/09_장애_대응_및_관측성_표준.md) | 08, 11, 12, 14, 24, 26 |
| 브라우저 지원, Baseline, polyfill | [13. 브라우저 호환성 가이드](public/개발가이드/13_브라우저_호환성_가이드.md) | 02, 08, 19, 20, 25, 26 |
| 접근성 release gate | [19. 웹 접근성 가이드](public/개발가이드/19_웹_접근성_가이드.md) | 07, 14, 20, 23, 24, 25 |

## Verified Snapshot

2026-05-27 기준으로 문서 전반의 핵심 기준은 다음과 같습니다.

| Area | Baseline |
|------|----------|
| React | React 19.2 라인, React Compiler 1.0 stable, RSC 사용 시 `react-server-dom-*` 19.2.4 이상 패치 기준 |
| TypeScript | TypeScript 5.9, `import defer`, `--module node20`, `--erasableSyntaxOnly` 포함 |
| Framework | Next.js 16 App Router, Cache Components, Partial Prerendering(PPR) 운영 패턴 |
| Build | Vite 8, Rolldown/Oxc 기반 툴체인, Tailwind CSS v4 |
| Testing | Vitest 4 Browser Mode, Playwright 1.60 라인과 Test Agents, Storybook 9 |
| Security | OWASP Top 10:2025, OAuth 2.1, CSP3, Trusted Types, supply-chain attestation |
| Performance | 공식 Core Web Vitals 기준 LCP 2.5s / INP 200ms / CLS 0.1, 내부 권장 예산은 LCP 2.0s |
| Accessibility | WCAG 2.2 AA, ISO/IEC 40500:2025, WAI-ARIA 1.2 stable + ARIA 1.3 draft watch |

## Cross-Validation Contract

이 문서의 권고는 다음 네 가지 증거 중 최소 두 가지 이상으로 검증합니다. 보안, 배포, 접근성, 개인정보, 장애 대응처럼 사용자 영향이 큰 항목은 네 가지를 모두 요구합니다.

| Evidence | 질문 | 예시 |
|----------|------|------|
| **Primary Source** | 공식 릴리스, 표준, 보안 권고가 있는가 | React/TypeScript/W3C/OWASP/web.dev 문서 |
| **Executable Proof** | 로컬 또는 CI에서 실행 가능한 검증이 있는가 | `tsc`, unit/E2E, Lighthouse, axe, policy-as-code |
| **Operational Signal** | 실제 사용자/운영 지표로 회귀를 볼 수 있는가 | RUM p75, error rate, release health, cache hit ratio |
| **Reversibility** | 실패 시 되돌리거나 끌 수 있는가 | rollback, feature flag off, cache purge, ADR supersede |

### 2026 Trend Lens

최근 트렌드는 도구 이름이 아니라 다음 방향으로 반영합니다.

| Trend | 문서 반영 방식 |
|-------|----------------|
| **AI-assisted SDLC** | AI 산출물은 초안으로 취급하고, 검증 명령·민감정보 정책·사람 승인 기준을 필수화 |
| **Supply-chain provenance** | lockfile, SBOM, artifact attestation, secret scan, 최소 권한 CI를 공통 게이트로 적용 |
| **Server/edge rendering maturity** | Server/Client 경계, cache contract, RSC 보안 패치, CDN entry/asset 캐시 분리 명문화 |
| **Field-data performance** | lab 점수보다 RUM p75와 Core Web Vitals 회귀 차단을 우선 |
| **Accessibility as release gate** | WCAG 2.2 AA, 키보드/스크린 리더 검증, 증적 보관을 배포 조건에 연결 |
| **Browser Baseline adoption** | 기능 채택은 Baseline, feature detection, fallback, cross-browser smoke로 결정 |
| **Operational excellence** | deploy/release 분리, incident runbook, postmortem action item을 테스트/알림/문서로 닫음 |

## Documents

### System Map

| No | Document | Focus |
|----|----------|-------|
| 00 | [종합 가이드 목차](public/개발가이드/00_종합_가이드_목차.md) | 전체 로드맵, 검증 기준, 학습 경로 |

### Core Engineering

| No | Document | Focus |
|----|----------|-------|
| 01 | [TypeScript 심화 가이드](public/개발가이드/01_TypeScript_심화_가이드.md) | TypeScript 5.9, Zod 4, Standard Schema, branded types |
| 02 | [React 19 실무 가이드](public/개발가이드/02_React19_실무_가이드.md) | React 19.2, Actions, Compiler, RSC 보안 기준 |
| 03 | [상태관리 패턴 가이드](public/개발가이드/03_상태관리_패턴_가이드.md) | TanStack Query, Zustand, URL state, Signals 동향 |
| 04 | [아키텍처 설계 패턴](public/개발가이드/04_아키텍처_설계_패턴.md) | FSD, Clean Architecture, RSC 경계 설계 |
| 05 | [API 통신 및 모킹 가이드](public/개발가이드/05_API_통신_및_모킹_가이드.md) | OpenAPI 3.1, codegen, MSW 2.x, Result 패턴 |
| 06 | [웹 보안 심화 가이드](public/개발가이드/06_웹_보안_심화_가이드.md) | OWASP 2025, CSP, Trusted Types, OAuth, supply chain |

### Quality Gates

| No | Document | Focus |
|----|----------|-------|
| 07 | [테스팅 가이드](public/개발가이드/07_테스팅_가이드.md) | Vitest, Playwright, 시각 회귀, 뮤테이션 테스트 |
| 08 | [성능 최적화 가이드](public/개발가이드/08_성능_최적화_가이드.md) | Core Web Vitals, Vite 8, React Compiler, RUM |
| 13 | [브라우저 호환성 가이드](public/개발가이드/13_브라우저_호환성_가이드.md) | Baseline, Interop, polyfill, Playwright matrix |
| 19 | [웹 접근성 가이드](public/개발가이드/19_웹_접근성_가이드.md) | WCAG 2.2, EAA, ADA, ARIA, axe, 증적 관리 |

### Delivery And Operations

| No | Document | Focus |
|----|----------|-------|
| 09 | [장애 대응 및 관측성 표준](public/개발가이드/09_장애_대응_및_관측성_표준.md) | error tracking, tracing, alerting, incident response, postmortem |
| 10 | [인프라 및 IaC 가이드](public/개발가이드/10_인프라_IaC_가이드.md) | IaC, preview environment, workload identity, cost control, drift detection |
| 11 | [CI/CD 파이프라인 표준](public/개발가이드/11_CICD_파이프라인_표준.md) | deterministic install, trunk-based delivery, attestation, approval gate |
| 12 | [CDN 캐시 전략](public/개발가이드/12_CDN_캐시_전략.md) | cache policy, immutable assets, invalidation, security headers, edge routing |
| 14 | [배포 프로세스 체크리스트](public/개발가이드/14_배포_프로세스_체크리스트.md) | Canary, feature flag, release train, rollback |
| 22 | [모노레포 운영 가이드](public/개발가이드/22_모노레포_운영_가이드.md) | pnpm catalog, Turborepo, Nx, cache, ownership |

### Governance And AI

| No | Document | Focus |
|----|----------|-------|
| 15 | [RFC 의사결정 프로세스](public/개발가이드/15_RFC_의사결정_프로세스.md) | RFC, ADR, PoC, RACI, AI 영향도 분석 |
| 16 | [AI 협업 코드리뷰 가이드](public/개발가이드/16_AI_협업_코드리뷰_가이드.md) | AI review pipeline, stacked PR, review metrics |
| 17 | [신규 입사자 온보딩 가이드](public/개발가이드/17_신규_입사자_온보딩_가이드.md) | AI mentoring, 30/60/90, devcontainer, 코드베이스 RAG |
| 18 | [AI 개발 워크플로우 종합](public/개발가이드/18_AI_개발_워크플로우_종합.md) | AI coding assistant governance, context policy, review workflow, MCP |

### Product Architecture And Experience

| No | Document | Focus |
|----|----------|-------|
| 20 | [디자인 시스템 가이드](public/개발가이드/20_디자인_시스템_가이드.md) | Tailwind v4, design tokens, Radix, shadcn/ui |
| 21 | [마이크로 프론트엔드 가이드](public/개발가이드/21_마이크로_프론트엔드_가이드.md) | Module Federation, runtime API, 독립 배포 |
| 23 | [국제화 가이드](public/개발가이드/23_국제화_가이드.md) | i18n, ICU MessageFormat, AI 번역, RTL, pseudo-localization |
| 24 | [SEO 및 메타데이터 가이드](public/개발가이드/24_SEO_메타데이터_가이드.md) | Metadata API, 생성형 검색 대응, structured data, 색인 알림 |
| 25 | [웹 애니메이션 모션 가이드](public/개발가이드/25_웹_애니메이션_모션_가이드.md) | Motion, View Transitions, scroll animation, reduced motion |
| 26 | [PWA 오프라인 전략 가이드](public/개발가이드/26_PWA_오프라인_전략_가이드.md) | Service Worker, Workbox, offline UX, Background Sync, Push |

## Recommended Paths

| Goal | Reading Order |
|------|---------------|
| 신규 프로젝트 표준 수립 | 00 -> 01 -> 02 -> 04 -> 05 -> 07 -> 11 -> 14 |
| 기존 서비스 품질 개선 | 07 -> 08 -> 09 -> 13 -> 19 -> 20 |
| 배포/운영 체계 강화 | 10 -> 11 -> 12 -> 14 -> 15 -> 16 |
| AI 협업 프로세스 도입 | 16 -> 18 -> 07 -> 15 -> 17 |
| 글로벌 제품 준비 | 19 -> 20 -> 23 -> 24 -> 26 |

## Source Policy

문서의 버전, 표준, 보안 권고는 공식 출처를 우선합니다. 대표 기준 문서는 다음과 같습니다.

- [React 19.2 release](https://react.dev/blog/2025/10/01/react-19-2)
- [React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1)
- [React Server Components security advisory](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components)
- [TypeScript 5.9 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)
- [Next.js 16 release](https://nextjs.org/blog/next-16)
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8)
- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4)
- [Vitest 4.0 release](https://vitest.dev/blog/vitest-4)
- [Playwright release notes](https://playwright.dev/docs/release-notes)
- [Playwright Test Agents](https://playwright.dev/docs/test-agents)
- [Storybook 9](https://storybook.js.org/blog/storybook-9/)
- [Core Web Vitals thresholds](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/)
- [WCAG 2.2 ISO/IEC 40500:2025](https://www.w3.org/press-releases/2025/wcag22-iso-pas/)
- [WAI-ARIA 1.3 Working Draft](https://www.w3.org/TR/wai-aria-1.3/)
- [ADA Title II web accessibility rule](https://www.ada.gov/resources/2024-03-08-web-rule/)
- [Web Platform Baseline](https://web.dev/baseline)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [SLSA specification](https://slsa.dev/spec/)

## Maintenance

- 기준일은 문서 상단의 `Update` 필드와 README의 `Verified Snapshot`에 명시합니다.
- 문서 구조, 00-26 파일 연속성, README/사이트 문서 인덱스, 공식 출처 레지스트리, 로컬 링크, 내부 앵커, 중복 번호, 회사 종속 표현, 과장 표현, stale edition 표기는 `node scripts/validate-dev-guides.mjs`로 검증하고, 동일한 검증을 GitHub Actions에서 PR/push 게이트로 실행합니다.
- 보안 권고, 브라우저 정책, Core Web Vitals, 프레임워크 메이저 릴리스는 월 1회 검토합니다.
- 실무 예제는 CI에서 실행 가능한 형태를 우선하고, 실행 불가능한 예제는 의사코드임을 명시합니다.
- AI가 생성한 내용은 공식 문서, 실제 코드, 테스트 결과 중 최소 하나로 검증한 뒤 반영합니다.

## License

This project is for personal portfolio and reference purposes.

---

Last updated: 2026-05-27
