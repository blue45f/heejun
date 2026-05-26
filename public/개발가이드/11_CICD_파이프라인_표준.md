# 11. CI/CD 파이프라인 표준 (2026 Edition)

| 분류 | 인프라 & 배포 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [07. 테스팅](./07_테스팅_가이드.md), [10. 인프라](./10_인프라_IaC_가이드.md), [12. CDN 캐시](./12_CDN_캐시_전략.md), [14. 배포](./14_배포_프로세스_체크리스트.md) | **도구 원칙** | 벤더 중립 |
| **핵심 테마** | 재현 가능한 빌드, 품질 게이트, 보안 검사, artifact, approval, 배포 자동화 | **Update** | 2026.05 |

---

> CI/CD 표준은 특정 자동화 플랫폼의 YAML이 아니라 **변경이 안전하게 통합되고, 검증된 artifact만 승격되며, 배포와 릴리즈가 통제되는 흐름**입니다.

---

## 문서 책임 범위

| 이 문서가 결정하는 것 | 단일 출처로 따르는 문서 |
| :--- | :--- |
| install/lint/type/test/build/security/artifact 품질 게이트 | [07. 테스팅](./07_테스팅_가이드.md), [06. 보안](./06_웹_보안_심화_가이드.md) |
| artifact provenance, SBOM, checksum, environment approval | [10. 인프라](./10_인프라_IaC_가이드.md), [14. 배포](./14_배포_프로세스_체크리스트.md) |
| cache, CDN, preview deploy와 release 증적 | [12. CDN 캐시](./12_CDN_캐시_전략.md), [09. 관측성](./09_장애_대응_및_관측성_표준.md) |
| CI 예외와 flaky gate의 리뷰/승인 기준 | [16. 코드리뷰](./16_AI_협업_코드리뷰_가이드.md), [15. RFC](./15_RFC_의사결정_프로세스.md) |

---

## 0. 모든 프론트엔드 그룹 공통 Baseline

| 단계 | 최소 기준 | 실패 시 |
| :--- | :--- | :--- |
| **Install** | lockfile 기반 frozen install, 런타임 버전 고정 | 즉시 실패 |
| **Static check** | format, lint, type check, import boundary | merge 차단 |
| **Test** | unit, integration, contract, 핵심 E2E smoke | merge 또는 deploy 차단 |
| **Build** | production build, sourcemap 정책, bundle budget | deploy 차단 |
| **Security** | secret scan, dependency audit, license policy, SBOM/attestation | severity 기준 차단 |
| **Artifact** | immutable artifact 생성, checksum, 보관 기간 명시 | deploy 차단 |
| **Deploy** | 환경별 승인, canary/preview, rollback path | 자동 중단 |
| **Evidence** | 테스트 결과, trace, coverage, accessibility/performance report 보관 | 감사 불가 시 실패 |

### 0.1 교차 검증 매트릭스

| 권고 | 1차 출처 | 실행 증거 | 운영 증거 | 철회 조건 |
| :--- | :--- | :--- | :--- | :--- |
| Artifact provenance | SLSA specification | SBOM/provenance 생성, checksum 검증 | 배포 artifact 추적성 | provenance 없는 artifact는 production 승격 금지 |
| Frozen install | package manager 공식 lockfile 정책 | frozen install CI | dependency drift incident | emergency patch는 lockfile PR 필수 |
| Quality gate | 각 도구 공식 CLI와 팀 위험 모델 | lint/type/test/build report | escaped defect, rollback rate | flaky gate는 owner/expiry로 격리 |

### 0.2 운영 게이트

| Gate | Evidence | Owner | Rollback |
| :--- | :--- | :--- | :--- |
| 품질 검증 | lint, type, test, build, security report | CI owner | merge/deploy 차단 |
| Artifact provenance | checksum, SBOM, provenance, source revision | Release owner | artifact 폐기와 재빌드 |
| 환경 승격 | approval record, environment policy | Release manager | promotion 중단 또는 이전 환경으로 회귀 |
| Flaky gate 관리 | retry log, quarantine issue, 만료일 | QA owner | owner 없는 quarantine 해제와 gate 복구 |

---

### 0.3 공급망 증적 계약

CI/CD의 공급망 보안은 “취약점 스캔을 실행했다”가 아니라, 소스에서 artifact까지 이어지는 증거 체인을 남기는 것입니다. SLSA v1.2는 provenance와 artifact 검증을, NIST SSDF는 secure SDLC 활동을 구조화하는 기준으로 사용합니다.

| 증적 | 필수 필드 | 생성 시점 | 검증 시점 |
| :--- | :--- | :--- | :--- |
| Source revision | commit SHA, branch/tag, author/reviewer, protected status | merge | build 시작 전 |
| Dependency evidence | lockfile hash, package manager version, audit/signature result | install | PR과 release |
| SBOM | package name/version/license, transitive dependency, artifact id | build 직후 | release 승인, incident triage |
| Provenance/attestation | source repository, workflow id, runner/builder, subject digest | artifact 생성 직후 | deploy 승격 전 |
| Checksum | artifact digest, signing/attestation reference | artifact 업로드 | rollback/download 전 |
| Deployment evidence | environment, approver, release id, rollback artifact | promotion | incident/postmortem |

| 통제 | 기준 | 실패 시 |
| :--- | :--- | :--- |
| 최소 권한 token | job별 `contents: read`, 필요한 경우에만 `id-token: write`, `attestations: write` | workflow permission 축소 전 merge 보류 |
| OIDC | 장기 cloud key 대신 job 단위 short-lived token | secret 기반 배포는 만료일 있는 예외로만 허용 |
| Action/재사용 workflow 고정 | mutable ref 대신 SHA pin 또는 검증된 immutable release 정책 | high-risk workflow는 실행 차단 |
| Artifact 검증 | deploy job이 checksum/provenance를 검증한 artifact만 사용 | artifact 폐기와 재빌드 |

---


### 2026 트렌드 고도화 체크포인트

- **AI 보안 격리**: 민감정보·시크릿이 개입되는 영역은 AI 산출물 자동 반영 전에 보안 게이트를 통과해야 합니다.
- **운영 지표 연동**: 성능(RUM p75), 장애율, 접근성/SEO 신호 중 최소 1개 이상의 지표와 조합해 채택·철회 여부를 판단합니다.
- **브라우저/디바이스 지속성**: Baseline/feature detection 기반으로 기능을 출시하고, 미지원군에 대한 fallback 및 감시 항목을 문서화합니다.
- **공급망 신뢰성**: lockfile 일치성, 의존성 감사, SBOM/attestation, secret scan 조건을 문서 체크리스트에 반영합니다.
- **회복탄력성 설계**: 실험 기능은 rollback, fallback, canary 또는 flag 기반으로 실패 조건을 명시합니다.
- **국제/접근성 동시 고려**: i18n, RTL, 다국어 텍스트 길이, 키보드/스크린리더, reduced-motion은 기능 도입 전 체크합니다.
- **재검토 주기**: 월 1회 운영 증적을 기준으로 고도화/축소/중단 결정을 갱신합니다.

### 2026 Trend Rollforward Triggers

- **Stable 항목**은 공식 보안/호환성 고지 시 즉시 재평가 대상이 됩니다.
- **Experimental Watch** 항목은 90일 내 지표 미달, major 회귀, 도입비용 과다 시 자동 철회 조건을 둡니다.
- 문서와 릴리즈 노트 불일치가 발생하면 `00`과 각 도메인 문서를 5영업일 내 동기화합니다.

## 1. 파이프라인 구조

권장 순서는 빠른 실패에서 느린 검증으로 이동합니다.

```text
change
  -> install
  -> lint / type / unit
  -> integration / contract
  -> build artifact
  -> security / license / SBOM
  -> preview deploy
  -> E2E / accessibility / performance smoke
  -> staging or canary
  -> production release
```

`build once, deploy many`를 원칙으로 합니다. 환경별로 다시 빌드하면 "검증한 코드"와 "배포한 코드"가 달라질 수 있습니다.

---

## 2. 재현성 기준

| 항목 | 기준 |
| :--- | :--- |
| 런타임 | Node/Bun/pnpm 등 실행 버전을 파일로 고정 |
| 의존성 | lockfile 변경은 리뷰 대상, install은 frozen 모드 |
| 환경 변수 | build-time과 runtime 변수를 분리 |
| 캐시 | lockfile, OS, 런타임 버전을 cache key에 포함 |
| 산출물 | checksum, build metadata, source revision 포함 |
| 시간 의존성 | 테스트에서 현재 시간, locale, timezone 고정 |

---

## 3. 품질 게이트

| 게이트 | 최소 요구사항 |
| :--- | :--- |
| Type | `tsc --noEmit` 또는 동등한 type check 통과 |
| Lint | React Hooks/Compiler, 접근성, import boundary 규칙 포함 |
| Unit | 핵심 유틸, hooks, reducers, domain logic |
| Integration | API mocking, form validation, error handling |
| Contract | OpenAPI/GraphQL/schema breaking change 검출 |
| E2E | 로그인, 탐색, 주요 전환, 결제/저장 등 핵심 flow |
| Accessibility | 자동 검사 + 핵심 flow keyboard smoke |
| Performance | bundle budget, Core Web Vitals smoke, Lighthouse/trace budget |

게이트는 "권장"이 아니라 merge/deploy 조건이어야 합니다. 예외는 owner, 만료일, 보완 계획이 있는 RFC로만 허용합니다.

---

## 4. 보안과 공급망

| 영역 | 기준 |
| :--- | :--- |
| Secret | commit, build log, artifact, client bundle에 secret 노출 금지 |
| Dependency | 심각도와 exploitability 기준으로 차단 정책 운영 |
| SBOM | production artifact와 함께 생성 및 보관 |
| Provenance | artifact가 어떤 commit과 workflow에서 나왔는지 증명 |
| Permission | CI token은 job별 최소 권한 |
| OIDC | 장기 cloud key 대신 임시 workload identity 사용 |

보안 검사는 가장 늦은 production 직전에 처음 돌리면 비용이 큽니다. PR 단계에서 빠른 secret/dependency scan을 먼저 실행합니다.

### 4.1 provenance 검증 예시

아래 예시는 특정 플랫폼 문법을 표준으로 강제하기 위한 것이 아니라, 어떤 CI에서도 필요한 permission과 검증 흐름을 보여주기 위한 참고입니다.

```yaml
permissions:
  contents: read
  id-token: write
  attestations: write

steps:
  - run: build-command
  - run: sha256sum dist/app.tar.gz > dist/app.sha256
  - name: Generate artifact attestation
    uses: actions/attest@v4
    with:
      subject-path: dist/app.tar.gz
  - name: Verify artifact attestation before deploy
    run: gh attestation verify dist/app.tar.gz -R ORG/REPO
```

배포 job은 build job에서 생성한 artifact를 다운로드하고, checksum과 provenance를 확인한 뒤에만 환경 승격을 수행합니다. 환경별 재빌드는 금지합니다.

---

## 5. Branch와 Release 전략

| 전략 | 기준 |
| :--- | :--- |
| Trunk-based | 작은 PR, feature flag, 빠른 통합 |
| Release branch | 규제/검증 기간이 긴 제품에서만 제한적으로 사용 |
| Feature flag | deploy와 release 분리, kill switch 필수 |
| Canary | 일부 사용자/트래픽/환경에서 지표 확인 후 확대 |
| Rollback | artifact rollback과 flag off를 모두 준비 |

긴 수명 feature branch는 merge conflict와 테스트 공백을 만들기 쉽습니다. 큰 기능은 작은 PR과 feature flag로 나눕니다.

---

## 6. Artifact 보관

| 산출물 | 보관 기준 |
| :--- | :--- |
| Build output | release와 rollback 기간 동안 보관 |
| Test report | 실패 원인 분석 가능한 기간 동안 보관 |
| E2E trace/video | 실패 시 항상 보관 |
| Coverage | 추세 분석 목적의 요약 보관 |
| SBOM/provenance | 감사 요구 기간에 맞춰 보관 |
| Source map | 접근 제한, 업로드 후 public 노출 금지 |

artifact 보관 기간은 비용과 감사 요구의 균형으로 정하되, rollback 가능한 기간보다 짧아서는 안 됩니다.

---

## 7. 배포 승인

production 배포는 자동화되어야 하지만 자동 승인까지 요구하지는 않습니다.

| 조건 | 승인 정책 |
| :--- | :--- |
| 낮은 위험 | 모든 게이트 통과 시 자동 승격 |
| 중간 위험 | reviewer 또는 release owner 승인 |
| 높은 위험 | RFC/ADR, rollback drill, 변경 창 필요 |
| 긴급 hotfix | 사후 리뷰와 postmortem 필수 |

승인은 "누가 버튼을 눌렀는가"보다 "어떤 증적을 보고 승인했는가"가 중요합니다.

---

## 8. 체크리스트

- [ ] lockfile 기반 frozen install을 강제하는가
- [ ] lint/type/unit이 PR마다 빠르게 실행되는가
- [ ] 핵심 flow E2E와 preview smoke가 있는가
- [ ] secret scan과 dependency audit이 merge 전에 실행되는가
- [ ] build artifact가 immutable이고 재사용되는가
- [ ] deploy job이 checksum과 provenance/attestation을 검증하는가
- [ ] 장기 cloud key 대신 OIDC 기반 short-lived credential을 사용하는가
- [ ] sourcemap이 public artifact에 노출되지 않는가
- [ ] production 배포에는 승인 조건과 rollback 경로가 있는가
- [ ] 실패 trace, test report, SBOM, provenance가 보관되는가

---

## 9. 제외한 벤더 종속 항목

공통 개발 가이드에는 특정 CI 플랫폼의 action 이름, 특정 패키지 매니저만을 전제로 한 캐시 설정, 특정 알림 도구, 특정 secret manager, 특정 클라우드 배포 명령을 표준으로 포함하지 않습니다. 이 문서는 어떤 자동화 플랫폼에서도 구현 가능한 파이프라인 단계, 게이트, 증적, 승인 기준만 남깁니다.

---

문서 최종 업데이트: 2026-05-27

### 2026 도메인별 고도화 포인트

- **재현성 우선 설계**: lockfile 고정/캐시 키 정책/아티팩트 보존을 표준으로 두고, 실패 재현 레시피를 CI 로그에 남깁니다.
- **공급망 증적 자동화**: provenance/attestation 결과를 배포 게이트 조건으로 연결하고 신뢰도 지표를 주기 점검합니다.
- **리스크 기반 릴리즈**: 변경 규모가 클수록 점진 릴리즈·자동 롤백을 기본값으로 전환합니다.
- **보안-품질 동시 게이트**: secret scan, dependency audit, 접근성·성능 smoke를 병렬 실행해 병목 항목만 차단합니다.


### 2026 트렌드 운영 계약(Trend Ops Contract)

- **Trend Owner**: 도메인 문서 오너 + 00 가이드 운영 오너가 공동 승인합니다.
- **Review Cadence**: 월 1회 운영 점검, 90일 단위 회귀 리뷰, 공식 변경 고지 발생 시 5영업일 내 재평가합니다.
- **Release Gate Conditions**: 성능·보안·접근성·관측성·배포 안정성 지표 임계치 초과 시 배포 권고를 중단하고 롤백/재계획합니다.
- **Evidence Contract**: 변경 PR, CI 산출물, 운영 지표 스냅샷, rollback 기록을 `문서 최종 업데이트` 근거로 링크/보관합니다.


### 2026 트렌드 실행 지표표

| KPI | 측정 대상 | 기준선/임계값 | 점검 주기 | 증빙 |
| :--- | :--- | :--- | :--- | :--- |
| 성능 회귀율 | RUM/CI 성능 지표 | 기준 대비 악화율 10% 초과 시 실험 중단 검토 | 주간 | 성능 리포트 링크 |
| 안정성 지표 | 에러율·SLO 위반 | 에러율 +1.5x 또는 SLO error budget 고갈률 2배 | 일간/릴리즈 후 즉시 | 관측성 대시보드 |
| 보안·공급망 경고 | secret scan / dependency audit / 취약점 스캔 | 신규 critical/high 경고 1건 이상 | 배포 전/월간 | 감사 보고서/로그 |
| 접근성·운영성 체크 | 키보드/스크린리더/배포 게이트 실패 | 릴리즈 게이트 실패율 0.5% 초과 | 릴리즈 전/월간 | 릴리즈 증적 |

### 2026 트렌드 상세 재구성(도메인별)

- 재현성 우선 게이트: lockfile·캐시 키·아티팩트 메타를 기록하고 불일치 시 재현 절차를 즉시 실행합니다.
- 공급망 증적 자동화: 감사와 provenance을 배포 승인 필수 조건으로 묶고 미흡 항목은 블록합니다.
- 보안·성능 동시 gate: 보안 경고와 성능 회귀를 한 파이프라인에서 병렬 수집해 우선순위를 동일하게 처리합니다.
- 리스크 기반 배포: 변경 규모별 canary 비율을 조정하고 자동 rollback 시간을 단축합니다.
- 알림 라우팅: 경고는 오너십 기반 채널로 자동 라우팅해 해결 책임을 즉시 연결합니다.

- 파이프라인 단계는 변경량·위험도·서비스 중요도별로 분기해 병렬 실행과 수동 승인 구간을 분리합니다.
- Attestation, SLSA, OIDC 토큰 정책이 실제 릴리즈에서 사용되는지 릴리즈 로그로 정기 증빙합니다.
- 배포 실패 패턴은 원인별로 분류해 다음 배포 템플릿에서 동일 실수를 자동 회피하도록 템플릿화합니다.
- 파이프라인 신뢰도는 테스트 재실행 비율과 롤백 시간으로 측정해 단계별로 분리된 게이트 기준을 갱신합니다.
- 중요한 단계는 사람 검토가 누락되지 않도록 승인 로그와 증빙 경로를 강제 바인딩합니다.
- 파이프라인 단계의 실패 패턴을 리포트로 남겨, 반복 장애가 발생하면 해당 단계의 병렬도를 조정합니다.
- 릴리즈 안전성은 변경량, 테스트 범위, 롤백 복잡도 점수로 조합해 게이트 통과 조건을 구동합니다.
- 승인 단계는 변경 규모/영향도별로 동적으로 분기해 소규모 변경 속도와 대규모 변경 안전성을 양립합니다.
- 릴리즈 후보군은 관측 지표 이상 징후가 없어야 다음 단계로 넘어가도록 게이트를 고정합니다.

### 2026 트렌드 실행 규칙(Measure-Action-Owner)
- **측정 신호**: 도입 전후 성능/안정성/보안/운영성 지표를 단일 스냅샷으로 비교하고 회귀 방향을 즉시 판별합니다.
- **임계치 트리거**: 임계치 초과 시 `Rollback Condition`으로 자동 분류되어 다음 릴리즈 단계로 진행하지 않습니다.
- **운영 승인**: 문서 오너와 00 가이드 오너의 2인 승인 후에만 기본 채택 상태로 변경합니다.
- **실행 보증**: 변경된 항목은 최소 1회 E2E 또는 관측성 재현 경로로 증빙하고 증거 링크를 남깁니다.
- **롤백 경로**: 실패 징후가 누적되면 24시간 이내 feature flag off 또는 배포 속도 축소로 기본 경로를 복구합니다.
- **학습 반영**: 실패 케이스와 재현 절차를 다음 분기 지표 스펙에 반영해 자동화 대상 후보로 우선 등록합니다.
- **승인 체인 통제**: 파이프라인 단계를 통과하지 못하면 artifact 배포를 자동 차단합니다.
- **검증 속도 균형**: 고비용 테스트는 위험도가 높은 변경에서만 동시 실행하도록 조정합니다.

### 2026 트렌드 실행 체크리스트(자동화 트리거)
- [ ] **Owner 지정**: 문서별 `Trend Owner`와 `Backup Owner`를 지정하고 월간 점검표와 연결한다.
- [ ] **SLA 정의**: 임계치 초과 대응을 `24시간 / 72시간 / 1주일` 단계로 나누어 운영한다.
- [ ] **Rollback Drill**: 실패 전개 조건에서 롤백 경로를 최소 한 번 시뮬레이션하고 날짜를 기록한다.
- [ ] **증빙 링크**: 변경/실험/이슈에 대한 증거 링크를 PR 템플릿과 연동한다.
- [ ] **자동 경고**: 지표 임계치 초과 시 자동 알람 라우팅이 제대로 작동하는지 확인한다.
- [ ] **재학습 루프**: 실패 케이스를 다음 스프린트 우선순위 큐로 이관한다.
- [ ] **검증 주기**: 월간 점검 스냅샷과 분기 회고 항목을 분리해 관리한다.
- [ ] **결과 공유**: 주요 의사결정은 00의 운영 채널과 README Snapshot에 되돌린다.
