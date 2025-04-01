# Frontend Development Guide (2026)

AI 시대의 프론트엔드 개발 종합 가이드 -- 실무 경험 기반, 2026 최신 트렌드 반영

## Overview

20개의 개발 가이드 문서로 구성된 프론트엔드 개발 종합 참고 자료입니다.
React 19, TypeScript 5.8+, Next.js 15 등 최신 기술 스택과 AI 활용 전략을 다룹니다.

## Documents

### Core Technology
| Document | Description |
|----------|-------------|
| [Testing Guide](public/개발가이드/01_프론트엔드_테스팅_가이드.md) | AI 테스팅, Vitest 3.x, Playwright, Contract Testing |
| [Performance Optimization](public/개발가이드/02_성능_최적화_가이드.md) | Core Web Vitals 2026, PPR, Edge Computing, RUM |
| [TypeScript Advanced](public/개발가이드/03_TypeScript_심화_가이드.md) | Type-level Programming, Full-Stack Type Safety |
| [React 19](public/개발가이드/04_React19_최신기능_가이드.md) | Compiler, Server Components, Actions, use() Hook |
| [State Management](public/개발가이드/05_상태관리_가이드.md) | TanStack Query v5, Zustand v5, Jotai v2, Signals |

### Architecture & Infrastructure
| Document | Description |
|----------|-------------|
| [CloudFront Cache](public/개발가이드/02_CloudFront_캐시_사용_표준.md) | Multi-CDN, Cache Key Design, Origin Shield |
| [Sentry Management](public/개발가이드/04_Sentry_관리_표준.md) | AI Issue Grouping, Dynamic Sampling, Session Replay |
| [Browser Compatibility](public/개발가이드/11_브라우저_호환성_가이드.md) | Baseline 2026, Polyfill v4, Container Queries |
| [CI/CD Pipeline](public/개발가이드/12_CICD_파이프라인_가이드.md) | Multi-deploy CI/CD, Preview Deployments, SBOM |
| [Infrastructure & Deploy](public/개발가이드/13_인프라_배포시스템.md) | Multi-CDN, Multi-region, Feature Flag Deploy |

### Process & Standards
| Document | Description |
|----------|-------------|
| [Incident Response](public/개발가이드/01_장애대응표준.md) | AIOps, SLO/SLI, Chaos Engineering, Game Day |
| [RFC Process](public/개발가이드/03_RFC_프로세스.md) | AI RFC Drafting, Async Decision Making |
| [RFC & Standards](public/개발가이드/05_RFC_및_표준화_문서_종합.md) | AI Standards, Naming Convention, Dev Environment |
| [Code Review](public/개발가이드/06_코드리뷰_가이드.md) | AI Code Review, Stacked PRs, Review Metrics |
| [Deploy Checklist](public/개발가이드/07_배포_체크리스트_프로세스.md) | AI Risk Analysis, GitOps, Canary/Blue-Green |
| [Onboarding](public/개발가이드/09_온보딩_가이드.md) | AI Onboarding, devcontainer, 30/60/90 Day Review |

### Templates
| Document | Description |
|----------|-------------|
| [Meeting Notes](public/개발가이드/10_회의록_템플릿_모음.md) | AI Meeting Notes, KPT/4Ls Retrospective |
| [ADR Template](public/개발가이드/15_ADR_템플릿_가이드.md) | AI ADR Generation, MADR Format |
| [Practical Templates](public/개발가이드/16_실무_템플릿_모음집.md) | Performance Report, Release Notes, Postmortem |

## Key Features

- **AI-First Approach** -- 모든 문서에 AI 활용 전략 포함 (Copilot, Claude, CodeRabbit)
- **Multi-Deploy Strategy** -- Multi-CDN, 모노레포 선별 배포, Feature Flag, Preview Deployments
- **2026 Tech Stack** -- React 19.x, TypeScript 5.8+, Vitest 3.x, Playwright 1.52+
- **Production-Ready** -- 실무 검증된 코드 예제와 설정 파일

## Tech Stack

```
Framework    : React 19.x, Next.js 15 (App Router, PPR)
Language     : TypeScript 5.8+
State        : TanStack Query v5, Zustand v5, Jotai v2
Testing      : Vitest 3.x, Playwright 1.52+, MSW 2.x
Bundler      : Vite 6, Rolldown, Turbopack
Linting      : ESLint flat config, Biome 2.0
CI/CD        : GitHub Actions, Turborepo, ArgoCD
Monitoring   : Sentry, OpenTelemetry, Grafana
CDN          : CloudFront, Cloudflare, Fastly
IaC          : AWS CDK v2, Pulumi
```

## Getting Started

```bash
# 종합 목차에서 시작
open public/개발가이드/00_종합_가이드_목차.md
```

**추천 학습 경로:**

1. **신규 프로젝트** -- Testing → Architecture → CI/CD → Multi-deploy
2. **기존 프로젝트 개선** -- Performance → Monitoring → AI 도입
3. **팀 온보딩** -- Onboarding Guide → Code Review → RFC Process

## License

This project is for personal portfolio and reference purposes.

---

Last updated: April 2026
