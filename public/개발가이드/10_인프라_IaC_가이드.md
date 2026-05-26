# 10. 인프라 및 IaC 가이드 (2026 Edition)

| 분류 | 인프라 & CI/CD | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [08. 성능](./08_성능_최적화_가이드.md), [11. CI/CD](./11_CICD_파이프라인_표준.md), [12. CDN 캐시](./12_CDN_캐시_전략.md), [14. 배포](./14_배포_프로세스_체크리스트.md) | **도구 원칙** | 벤더 중립 |
| **핵심 테마** | IaC, preview 환경, workload identity, 환경 분리, 비용 통제, drift detection, policy-as-code | **Update** | 2026.05 |

---

> 프론트엔드 인프라 표준은 특정 클라우드 템플릿이 아니라 **재현 가능성, 최소 권한, 비용 가시성, 빠른 검증 환경, 안전한 변경 절차**를 보장하는 운영 규칙입니다.

---

## 문서 책임 범위

| 이 문서가 결정하는 것 | 단일 출처로 따르는 문서 |
| :--- | :--- |
| IaC, 환경 분리, preview TTL, drift detection, 비용 태그 | [11. CI/CD](./11_CICD_파이프라인_표준.md), [14. 배포](./14_배포_프로세스_체크리스트.md) |
| workload identity, secret, 최소 권한 배포 권한 | [06. 보안](./06_웹_보안_심화_가이드.md), [11. CI/CD](./11_CICD_파이프라인_표준.md) |
| CDN, edge, static hosting 인프라 계약 | [12. CDN 캐시](./12_CDN_캐시_전략.md) |
| 인프라 변경의 RFC/ADR와 rollback 기준 | [15. RFC](./15_RFC_의사결정_프로세스.md), [09. 관측성](./09_장애_대응_및_관측성_표준.md) |

---

## 0. 모든 프론트엔드 그룹 공통 Baseline

| 영역 | 공통 기준 | 검증 방법 |
| :--- | :--- | :--- |
| **IaC 우선** | 배포 대상, CDN, 저장소, 라우팅, 인증서, 권한, 알림은 코드로 선언 | 수동 생성 리소스 금지 정책 |
| **환경 분리** | production, staging, preview, local의 권한·도메인·데이터를 분리 | 환경별 계정/프로젝트/namespace 점검 |
| **임시 자격 증명** | 장기 access key 대신 OIDC, workload identity, short-lived token 사용 | secret scan, token 만료 정책 |
| **Preview 환경** | PR/branch별 검증 URL을 만들고 TTL과 자동 삭제를 둠 | orphan resource report |
| **정책 검증** | IaC plan/synth 단계에서 보안, 태그, 공개 접근, 암호화 정책을 차단 | policy-as-code CI gate |
| **Drift 감지** | 콘솔 수동 변경과 실제 상태 차이를 주기적으로 탐지 | drift report, reconciliation |
| **비용 통제** | 리소스 owner, environment, ttl, service 태그를 강제 | budget alert, cost dashboard |

### 0.1 교차 검증 매트릭스

| 권고 | 1차 출처 | 실행 증거 | 운영 증거 | 철회 조건 |
| :--- | :--- | :--- | :--- | :--- |
| IaC 우선 | IaC 도구 공식 plan/apply 모델 | plan diff, policy-as-code gate | drift count, manual change count | 긴급 hotfix는 24시간 내 IaC 반영 |
| Workload identity | OIDC/workload identity 공식 보안 모델 | secret scan, token lifetime test | leaked secret incident, key inventory | 장기 키는 예외 ADR과 만료일 필요 |
| Preview TTL | 비용/보안 운영 기준 | orphan resource check | preview cost, idle resource count | TTL 없는 preview는 생성 차단 |

### 0.2 운영 게이트

| Gate | Evidence | Owner | Rollback |
| :--- | :--- | :--- | :--- |
| IaC plan | plan diff, policy-as-code report | Infra owner | apply 차단 또는 이전 plan으로 복구 |
| Workload identity | token claim, secret scan, 만료 정책 확인 | Platform owner | 장기 키 폐기, 임시 토큰 회수 |
| Preview TTL | orphan resource report, cost dashboard | Environment owner | preview 자동 삭제 또는 외부 접근 차단 |
| Drift 관리 | drift report, reconciliation PR | Infra owner | 수동 변경 revert 또는 긴급 ADR 작성 |

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

## 1. 인프라 설계 원칙

1. **코드가 단일 진실 공급원**이어야 합니다. 운영 콘솔에서 만든 리소스는 재현할 수 없고 리뷰도 어렵습니다.
2. **변경 전 plan, 변경 후 drift check**를 둡니다. 인프라 변경은 코드 변경과 같은 리뷰 과정을 거칩니다.
3. **권한은 배포 단위로 최소화**합니다. CI가 production 전체 권한을 갖지 않도록 환경별 역할을 분리합니다.
4. **preview는 자동 소멸**해야 합니다. 검증 환경은 오래 남을수록 비용과 보안 리스크가 됩니다.
5. **런타임 설정과 빌드 산출물을 분리**합니다. 동일한 artifact를 환경별 설정으로 승격할 수 있어야 합니다.

---

## 2. 환경 모델

| 환경 | 목적 | 데이터 | 접근 | 수명 |
| :--- | :--- | :--- | :--- | :--- |
| **local** | 개발자 단위 개발 | fixture/mock | 개인 | 수동 |
| **preview** | PR/branch 검증 | 익명화/샘플 | PR 참여자 | TTL 자동 삭제 |
| **staging** | release candidate 검증 | production 유사, 민감정보 제거 | 팀 제한 | 상시 |
| **production** | 실제 사용자 서비스 | 실제 데이터 | 승인된 운영자 | 상시 |

preview 환경은 production 데이터를 복제하지 않는 것이 기본입니다. 불가피한 경우 익명화, 최소 범위, 시간 제한, 접근 감사가 필요합니다.

---

## 3. Workload Identity

CI/CD는 장기 비밀키를 저장하지 않는 구조가 기본입니다.

| 방식 | 기준 |
| :--- | :--- |
| **OIDC federation** | CI 실행 주체, branch, environment, repository claim을 검증해 임시 권한 발급 |
| **short-lived token** | 만료 시간이 짧고 scope가 좁은 토큰 사용 |
| **environment approval** | production 권한은 승인된 배포 단계에서만 발급 |
| **secret inventory** | 남아 있는 장기 secret은 owner, rotation 주기, 만료일을 기록 |

권한 정책은 "누가 어느 환경에서 어떤 artifact를 어디에 배포할 수 있는지"를 문장으로 먼저 정의한 뒤 코드로 옮깁니다.

---

## 4. Preview 환경 표준

Preview 환경은 프론트엔드 팀의 품질 속도를 크게 높이지만, 자동 정리가 없으면 비용과 보안 부채가 됩니다.

| 항목 | 기준 |
| :--- | :--- |
| URL | PR/branch 식별자가 포함된 고유 URL |
| 배포 artifact | CI에서 생성한 immutable build artifact |
| 데이터 | mock, fixture, 익명화된 샘플 우선 |
| TTL | 기본 24~72시간, PR 종료 시 즉시 삭제 |
| 접근 제어 | 외부 공개가 필요 없으면 인증 또는 IP/rule 제한 |
| 관측성 | preview environment 태그로 로그/오류 분리 |
| 비용 | owner, ttl, repository 태그 필수 |

---

## 5. IaC 리뷰 체크리스트

- [ ] public 접근이 필요한 리소스와 그렇지 않은 리소스가 분리되어 있는가
- [ ] 저장소, 캐시, 로그, 백업에 암호화가 적용되어 있는가
- [ ] secret이 코드, state 파일, build log에 노출되지 않는가
- [ ] production 권한이 preview/staging 배포 경로에 섞이지 않는가
- [ ] deletion protection, retention, lifecycle rule이 환경별로 다른가
- [ ] 비용 태그와 TTL 태그가 모든 임시 리소스에 강제되는가
- [ ] plan 결과가 PR에 첨부되고 reviewer가 변경 범위를 볼 수 있는가
- [ ] drift 감지 결과가 운영 채널과 backlog에 연결되는가

---

## 6. Policy-as-Code Gate

인프라 정책은 문서에만 있으면 지켜지지 않습니다. CI에서 자동 차단해야 합니다.

| 정책 | 차단 예시 |
| :--- | :--- |
| 공개 접근 | 정적 자산 외 객체 저장소 공개, 관리자 콘솔 공개 |
| 권한 과다 | wildcard action/resource, production 전체 권한 |
| 암호화 누락 | 저장소, 로그, secret store 암호화 미설정 |
| 태그 누락 | owner, environment, service, ttl 없음 |
| 네트워크 | 관리 포트 공개, 허용 목록 없는 admin endpoint |
| 수명 관리 | preview 리소스 TTL 없음 |

정책 예외는 만료일과 owner가 있는 RFC/ADR로 관리합니다.

---

## 7. 비용 운영

프론트엔드 인프라 비용은 대부분 CDN 전송량, build minutes, preview 환경, 로그/trace 저장량에서 증가합니다.

| 비용 항목 | 통제 기준 |
| :--- | :--- |
| CDN egress | 이미지 최적화, 압축, cache hit ratio, 지역별 트래픽 추적 |
| Build/CI | dependency cache, test sharding, 변경 영향 기반 실행 |
| Preview | TTL, idle cleanup, branch 종료 webhook |
| Observability | sampling, retention, environment별 수집량 제한 |
| Storage | lifecycle rule, source map 접근 제한, 오래된 artifact 삭제 |

비용 알림은 단순 월말 예산 초과가 아니라 "일일 증가율", "preview orphan", "로그 수집량 급증"처럼 조기 탐지 가능한 지표로 둡니다.

---

## 8. Drift와 변경 관리

| 이벤트 | 필수 조치 |
| :--- | :--- |
| 콘솔 수동 수정 감지 | 원인 확인 후 IaC에 반영하거나 원복 |
| 정책 위반 drift | 즉시 보안 review, 자동 remediation 여부 판단 |
| production hotfix | 24시간 안에 IaC와 runbook 업데이트 |
| 반복 drift | 권한 모델 또는 자동화 누락으로 보고 개선 |

수동 수정 자체를 탓하기보다, 왜 코드 경로보다 수동 경로가 쉬웠는지 개선해야 합니다.

---

## 9. AI 활용 기준

AI는 IaC 초안 작성, 정책 누락 점검, 비용 최적화 후보 도출에 유용하지만 다음 제약을 둡니다.

- production credential, 계정 ID, 내부 도메인, state 파일 원문을 AI에 전달하지 않습니다.
- AI가 만든 IaC는 plan, policy-as-code, 최소 권한 리뷰를 통과해야 합니다.
- "최신 권장 설정"은 클라우드별 공식 문서로 재확인한 뒤 적용합니다.
- 인프라 변경 설명에는 blast radius, rollback, drift 가능성을 포함합니다.

---

## 10. 제외한 벤더 종속 항목

공통 개발 가이드에는 특정 클라우드의 리소스 이름, 전용 IaC construct, 특정 CDN 원본 접근 제어 방식, 특정 DNS/인증서 콘솔 절차, 특정 비용 콘솔 사용법을 표준으로 포함하지 않습니다. 이 문서는 어떤 클라우드와 IaC 도구를 쓰더라도 유지되어야 하는 재현성, 권한, 환경 분리, 비용, drift, 정책 검증 기준만 남깁니다.

---

문서 최종 업데이트: 2026-05-27

### 2026 도메인별 고도화 포인트

- **환경 계층 분리 강화**: 운영/스테이징/미리보기 자원의 IAM/비밀관리 분리를 정책으로 고정하고, drift를 정기 스캔합니다.
- **비용·성능 동시 관리**: auto-scaling, 비용 태깅, 리전 분산 정책을 운영 지표와 연동해 과금 급증을 조기 감지합니다.
- **프리뷰 환경 신뢰성**: PR 당 환경 생명주기(생성/회수/보안점검)를 자동화해 배포 충돌을 줄입니다.
- **IaC 품질 게이트**: plan diff review, 정책 위반 탐지, 승인권한 분리를 리뷰 프로세스에 넣습니다.


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

- IAM·비밀 정책 코드화: 권한과 비밀 정책을 코드로 고정하고 예외는 기간 제한 승인을 둡니다.
- 환경 자동 소거: preview env 생성/삭제를 만료 정책과 비용 KPI로 자동 운영합니다.
- drift 감시 강제: 상태 불일치 발생 시 자동 이슈화와 회복 SLA를 적용합니다.
- 비용·가용성 동시 게이트: 자동 확장 정책을 비용 임계치와 SLO를 함께 보는 이중 기준으로 운영합니다.
- 레이어 모듈 분리: 런타임/네트워크/보안 설정의 변경 영향도를 독립 모듈 단위로 계산합니다.

- 인프라 변경은 보안 그룹/권한 경계와 동일한 PR 템플릿에서 검증하고, Drift 상태를 문서 증거로 남겨 예측 불가 환경 변화를 줄입니다.
- `terraform`/`pulumi` 계획 값은 리뷰 전에 시뮬레이션 샘플과 리스크 점수와 함께 공유해 과도한 변경 확산을 막습니다.
- 자동 확장 정책은 비용과 성능 지표를 함께 보며 운영 규칙이 수렴하는 구간에서만 확대해 과잉 스케일링을 억제합니다.
- DR 연습(재해 복구 시뮬레이션)은 IaC 승인 플로우에 통합해 복구 시간을 추적 가능한 실험값으로 남깁니다.
- 비용 효율성 규칙은 단일 차원의 예산이 아니라 가용성·지연 지표와 결합해 위험도가 높은 영역은 점진 축소합니다.
- 인프라 변경 전후 응답시간/비용/KPI를 스냅샷 비교해 계획-실행-복구의 연속 책임을 문서화합니다.
- 중요 인프라 변경은 승인 전 2중 검토(보안, 운영) 체크를 거쳐 회귀 가능 구간을 줄입니다.
- 운영 정책 drift가 감지되면 즉시 승인 워크플로우로 되돌려 변경 확산을 방지합니다.
- 인프라 변경은 서비스 단위별 회귀 시뮬레이션 결과를 남겨 계획-실행 간 갭을 줄입니다.

### 2026 트렌드 실행 규칙(Measure-Action-Owner)
- **측정 신호**: 도입 전후 성능/안정성/보안/운영성 지표를 단일 스냅샷으로 비교하고 회귀 방향을 즉시 판별합니다.
- **임계치 트리거**: 임계치 초과 시 `Rollback Condition`으로 자동 분류되어 다음 릴리즈 단계로 진행하지 않습니다.
- **운영 승인**: 문서 오너와 00 가이드 오너의 2인 승인 후에만 기본 채택 상태로 변경합니다.
- **실행 보증**: 변경된 항목은 최소 1회 E2E 또는 관측성 재현 경로로 증빙하고 증거 링크를 남깁니다.
- **롤백 경로**: 실패 징후가 누적되면 24시간 이내 feature flag off 또는 배포 속도 축소로 기본 경로를 복구합니다.
- **학습 반영**: 실패 케이스와 재현 절차를 다음 분기 지표 스펙에 반영해 자동화 대상 후보로 우선 등록합니다.
- **인프라 변경 동결 구간**: 고위험 릴리즈는 사전 점검 완료 전까지 자동 변경 동결 규칙을 적용합니다.
- **성능-비용 동조 규칙**: 자원 증가가 응답 개선에 미치지 못하면 즉시 축소 계획으로 전환합니다.

### 2026 트렌드 실행 체크리스트(자동화 트리거)
- [ ] **Owner 지정**: 문서별 `Trend Owner`와 `Backup Owner`를 지정하고 월간 점검표와 연결한다.
- [ ] **SLA 정의**: 임계치 초과 대응을 `24시간 / 72시간 / 1주일` 단계로 나누어 운영한다.
- [ ] **Rollback Drill**: 실패 전개 조건에서 롤백 경로를 최소 한 번 시뮬레이션하고 날짜를 기록한다.
- [ ] **증빙 링크**: 변경/실험/이슈에 대한 증거 링크를 PR 템플릿과 연동한다.
- [ ] **자동 경고**: 지표 임계치 초과 시 자동 알람 라우팅이 제대로 작동하는지 확인한다.
- [ ] **재학습 루프**: 실패 케이스를 다음 스프린트 우선순위 큐로 이관한다.
- [ ] **검증 주기**: 월간 점검 스냅샷과 분기 회고 항목을 분리해 관리한다.
- [ ] **결과 공유**: 주요 의사결정은 00의 운영 채널과 README Snapshot에 되돌린다.
- [ ] **Plan Drift 확인**: 변경 전후 plan diff가 승인 기준과 일치하는지 점검한다.
- [ ] **DR drill 연동**: 복구 연습 시나리오 결과를 릴리즈 의사결정에 반영한다.