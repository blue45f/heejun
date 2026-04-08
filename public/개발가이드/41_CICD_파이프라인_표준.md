# 41. CI/CD 파이프라인 표준 (2025-2026 Edition)

| 분류 | 인프라 & CI/CD | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [40. 인프라](./40_인프라_및_AWS_CDK_가이드.md), [43. 배포 체크리스트](./43_배포_프로세스_체크리스트.md) | **AI 도구** | GitHub Actions, Claude Code |
| **핵심 테마** | Environment Gating, Canary Deployment, CI Optimization | **Update** | 2025.04 |

---

> **"지속적 통합(CI)은 개발 속도를 높이고, 지속적 배포(CD)는 안정성을 확보한다. 자동화되지 않은 과정은 모두 기술 부채다."**
> 본 가이드는 GitHub Actions를 활용하여 고성능 프론트엔드 배포 파이프라인을 구축하는 표준 모델을 제시합니다.

## 1. 파이프라인 아키텍처: 병렬화와 캐싱

배포 시간을 단축하기 위해 각 단계를 병렬화하고 종속성을 캐싱합니다.

### 1.1 최적화된 CI 구성 (GitHub Actions)
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1 # Node보다 빠른 Bun 기반의 캐싱
      - run: bun install --frozen-lockfile
      - run: bun test # 병렬 테스트 실행

  build:
    needs: test # 테스트 통과 후에만 실행
    runs-on: ubuntu-latest
    steps:
      - run: bun build
      - uses: actions/upload-artifact@v4
        with:
          name: build-assets
          path: dist/
```

---

## 2. 환경 관리 및 승인 절차 (Environment Gating)

스테이징(Staging) 환경에서 검증된 빌드 결과물을 그대로 프로덕션(Production)으로 승격시키는 것이 가장 안전합니다.

1.  **Stage 환경 배포**: 모든 머지된 코드는 Stage 환경에 자동 배포됩니다.
2.  **Manual Approval**: 관리자의 승인이 있어야 프로덕션 배포가 트리거됩니다.
3.  **Environment Protection**: 프로덕션 배포 역할은 특정 브랜치(main)에서만 접근 가능하도록 제한합니다.

---

## 3. 리스크 최소화: 카나리(Canary) 배포

새로운 버전을 전체 사용자에게 한꺼번에 노출하지 않고, 점진적으로 늘려나갑니다.

*   **Route 53 가중치**: CloudFront 엔드포인트를 두 개(v1, v2) 운영하며, DNS 가중치를 90:10에서 점진적으로 0:100으로 변경합니다.
*   **Cookie-based Routing**: 특정 사용자(예: 직원)에게만 쿠키 값을 기준으로 새로운 버전을 우선 노출합니다.

---

## 4. 보안 및 품질 가드레일

배포 파이프라인에는 아래의 검증 단계가 반드시 포함되어야 합니다.

*   **Security Scan (Snyk/SonarQube)**: 코드 내 보안 취약점 및 라이브러리 보안 점검.
*   **Bundle Analysis**: 빌드 결과물의 크기가 기준치를 넘어서면 배포를 차단합니다.
*   **Lighthouse CI**: 성능 점수가 이전 버전보다 일정 수준 이하로 떨어지면 경고를 보냅니다.

---

## 💡 AI와 함께하는 파이프라인 개선

AI(Claude Code)에게 워크플로우 최적화를 요청하세요.

> **Prompt**: "우리 프로젝트의 GitHub Actions 워크플로우 파일이 너무 느려. 빌드 아티팩트를 재사용하고, 캐시 적중률을 높이며, 병렬로 실행할 수 있는 단계를 분리하여 전체 배포 시간을 30% 이상 단축하는 최적화된 YAML 파일을 작성해줘."

## ✅ 체크리스트
- [ ] 테스트와 빌드 과정이 병렬로 실행되고 있나요?
- [ ] 프로덕션 배포 시 **관리자의 수동 승인** 절차가 포함되어 있나요?
- [ ] 환경 변수가 GitHub Environments를 통해 안전하게 관리되고 있나요?
- [ ] 배포 실패 시 즉시 이전 버전으로 **자동 롤백**할 수 있는 체계가 있나요?
- [ ] 빌드 결과물에 대한 보안 스캔 단계가 포함되어 있나요?
