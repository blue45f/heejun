# 12. CDN 캐시 전략 (2026 Edition)

| 분류 | 성능 & 배포 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [08. 성능](./08_성능_최적화_가이드.md), [10. 인프라](./10_인프라_IaC_가이드.md), [11. CI/CD](./11_CICD_파이프라인_표준.md), [14. 배포](./14_배포_프로세스_체크리스트.md) | **도구 원칙** | 벤더 중립 |
| **핵심 테마** | HTTP caching, immutable assets, cache key, invalidation, compression, security headers, edge routing | **Update** | 2026.05 |

---

> CDN 캐시 표준은 특정 CDN 제품의 기능 목록이 아니라 **정적 자산을 오래 캐시하고, 엔트리 문서는 즉시 갱신하며, 캐시 키와 무효화를 통제하는 배포 계약**입니다.

---

## 문서 책임 범위

| 이 문서가 결정하는 것 | 단일 출처로 따르는 문서 |
| :--- | :--- |
| HTTP cache header, immutable asset, entry freshness, invalidation 계약 | [14. 배포](./14_배포_프로세스_체크리스트.md), [11. CI/CD](./11_CICD_파이프라인_표준.md) |
| cache key, compression, security headers, edge routing 기준 | [06. 보안](./06_웹_보안_심화_가이드.md), [10. 인프라](./10_인프라_IaC_가이드.md) |
| 캐시가 Core Web Vitals와 RUM에 미치는 영향 | [08. 성능](./08_성능_최적화_가이드.md), [09. 관측성](./09_장애_대응_및_관측성_표준.md) |
| Service Worker/PWA cache와 CDN cache의 책임 분리 | [26. PWA](./26_PWA_오프라인_전략_가이드.md) |

---

## 0. 모든 프론트엔드 그룹 공통 Baseline

| 영역 | 공통 기준 | 검증 방법 |
| :--- | :--- | :--- |
| **Immutable assets** | 파일명에 content hash가 있는 JS/CSS/image/font는 장기 캐시 + immutable | response header 검사 |
| **Entry document** | `index.html`, app shell, manifest 중 배포 전환에 민감한 파일은 no-cache 또는 짧은 TTL | smoke test |
| **Cache key 최소화** | 캐시에 필요한 header, cookie, query만 포함 | cache hit ratio |
| **무효화 최소화** | 전체 purge 대신 entry document와 변경 경로만 무효화 | deploy log |
| **압축** | Brotli/gzip 전송 또는 사전 압축을 적용 | `content-encoding` 검사 |
| **보안 헤더** | HSTS, CSP, X-Content-Type-Options, Referrer-Policy 등 공통 헤더 적용 | header audit |
| **관측성** | hit/miss, origin latency, 4xx/5xx, regional anomaly 추적 | CDN dashboard/RUM |

### 0.1 교차 검증 매트릭스

| 권고 | 1차 출처 | 실행 증거 | 운영 증거 | 철회 조건 |
| :--- | :--- | :--- | :--- | :--- |
| HTTP cache contract | HTTP caching 표준과 브라우저 동작 | header smoke, asset hash check | cache hit ratio, stale asset incident | HTML/asset mismatch 발생 시 TTL 재설계 |
| 최소 cache key | CDN/HTTP 캐시 원리 | key diff review, hit ratio test | origin request rate | 개인화 오류 발생 시 key 확장 |
| 보안 헤더 | OWASP/W3C 보안 권고 | header audit, CSP report-only | CSP violation, mixed content | 위반 폭증 시 report-only로 회귀 |

### 0.2 운영 게이트

| Gate | Evidence | Owner | Rollback |
| :--- | :--- | :--- | :--- |
| Cache contract | response header smoke, hash asset 검사 | Platform owner | TTL 축소 또는 entry 문서 rollback |
| Cache key 변경 | key diff, hit ratio, origin request 변화 | CDN owner | key 확장/축소 rollback |
| Invalidation | purge log, route list, release id | Release owner | targeted purge 또는 이전 entry 복구 |
| Security headers | header audit, CSP report-only 결과 | Security owner | report-only 전환 또는 policy rollback |

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

## 1. Cache-Control 표준

| 파일 유형 | 권장 정책 | 이유 |
| :--- | :--- | :--- |
| `assets/*.[hash].js` | `public, max-age=31536000, immutable` | 파일명이 바뀌면 새 버전이므로 장기 캐시 가능 |
| `assets/*.[hash].css` | `public, max-age=31536000, immutable` | JS와 동일 |
| image/font with hash | `public, max-age=31536000, immutable` | 사용자 재방문 성능 개선 |
| `index.html` | `no-cache` 또는 `max-age=0, must-revalidate` | 새 배포 진입점 즉시 반영 |
| `manifest.json` | 짧은 TTL 또는 `no-cache` | 앱 이름/아이콘/시작 URL 변경 가능 |
| `service-worker.js` | `no-cache` | 업데이트 감지를 늦추면 오프라인 캐시가 꼬임 |
| API response | 데이터 특성별 `private`, `no-store`, `s-maxage`, `stale-while-revalidate` | 개인화와 freshness 요구가 다름 |

`no-store`는 브라우저와 CDN 모두 저장하지 말아야 하는 민감 응답에 사용합니다. 단순히 새 버전 확인이 필요한 엔트리 문서에는 `no-cache`가 더 적합한 경우가 많습니다.

---

## 2. Cache Key 설계

캐시 키는 작을수록 hit ratio가 좋아집니다. 필요한 값만 포함합니다.

| 요소 | 기본 기준 | 포함해야 하는 경우 |
| :--- | :--- | :--- |
| Query string | 제외 | 이미지 변환, 검색 결과, pagination처럼 응답이 실제로 달라질 때 |
| Cookie | 제외 | 로그인 상태별 HTML, A/B bucket처럼 응답이 달라질 때 |
| Header | 제외 | `Accept-Language`, device class, image format 협상 등 |
| Path | 포함 | 기본 캐시 식별자 |
| Host | 멀티 도메인일 때 포함 | tenant/domain별 콘텐츠가 다를 때 |

무의식적으로 모든 query, cookie, header를 cache key에 넣으면 CDN cache hit ratio가 크게 떨어집니다.

---

## 3. SPA/MPA 배포 계약

프론트엔드 배포에서 가장 흔한 장애는 "HTML은 새 버전, JS는 이전 버전" 또는 그 반대입니다.

| 계약 | 기준 |
| :--- | :--- |
| Artifact | 한 번 만든 build artifact는 수정하지 않고 승격 |
| Asset hash | 모든 JS/CSS chunk는 content hash 포함 |
| Entry freshness | entry HTML은 항상 최신 확인 |
| Backward compatibility | 새 HTML이 참조하는 asset이 CDN에 업로드된 뒤 HTML을 전환 |
| Rollback | 이전 HTML과 이전 asset이 보존되어야 함 |
| Service Worker | SW 캐시 정책과 CDN TTL을 별도 문서로 맞춤 |

배포 순서는 일반적으로 `assets 업로드 -> assets 검증 -> entry 문서 전환 -> entry 무효화 -> smoke test`입니다.

---

## 4. Invalidation 원칙

| 상황 | 권장 무효화 |
| :--- | :--- |
| 일반 SPA 배포 | entry HTML, manifest, service worker |
| 해시 자산 변경 | 무효화 불필요 |
| 잘못된 정적 파일 배포 | 해당 경로만 purge |
| 보안/개인정보 노출 | 즉시 purge + 원본 삭제 + postmortem |
| API 캐시 오염 | affected key만 purge, 원인 수정 전 전체 purge 반복 금지 |

`/*` 전체 무효화는 비용, 지연, cache warm-up 손실을 만들기 때문에 긴급 상황이 아니라면 피합니다.

---

## 5. 보안 헤더

CDN 또는 origin 중 한 곳에서 일관되게 보안 헤더를 적용합니다.

| 헤더 | 기준 |
| :--- | :--- |
| `Strict-Transport-Security` | HTTPS 강제, preload는 도메인 소유권과 서브도메인 영향 검토 후 적용 |
| `Content-Security-Policy` | `default-src 'self'`에서 시작해 필요한 출처만 allowlist |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` 이상 |
| `Permissions-Policy` | 사용하지 않는 브라우저 기능 비활성화 |
| `Cross-Origin-Opener-Policy` | 격리가 필요한 앱에서 적용 |

보안 헤더는 모든 환경에서 동일한 정책을 쓰기보다, report-only에서 위반 로그를 확인한 뒤 enforce로 전환합니다.

---

## 6. Compression과 이미지 전송

| 대상 | 기준 |
| :--- | :--- |
| Text assets | Brotli 우선, gzip fallback |
| Large JS/CSS | 사전 압축 또는 CDN 압축 중 하나를 명확히 선택 |
| Images | AVIF/WebP 지원, 원본 보관, width/quality 제한 |
| Fonts | subset, preload 최소화, `font-display` 적용 |

압축은 성능 최적화지만 CPU 비용과 빌드 시간을 늘릴 수 있습니다. 큰 트래픽 서비스는 사전 압축과 CDN 자동 압축의 비용/효과를 측정합니다.

---

## 7. Edge Logic 사용 기준

Edge function/worker는 강력하지만 남용하면 디버깅이 어려워집니다.

| 적합 | 부적합 |
| :--- | :--- |
| SPA fallback rewrite | 복잡한 비즈니스 로직 |
| 단순 redirect | 대규모 DB 조회 |
| 언어/지역 기반 routing | 개인정보 처리 |
| A/B bucket header 부여 | 긴 실행 시간 작업 |
| 보안 헤더 보정 | 상태ful workflow |

Edge logic은 테스트, 로그, 롤백 경로가 있는 경우에만 production에 적용합니다.

---

## 8. 관측 지표

| 지표 | 의미 | 개선 방향 |
| :--- | :--- | :--- |
| Cache hit ratio | CDN이 origin 요청을 얼마나 줄이는지 | cache key 축소, TTL 조정 |
| Origin latency | 캐시 미스 시 사용자 영향 | origin 성능, shield/cache layer |
| 4xx/5xx by path | 잘못된 라우팅/배포 탐지 | rewrite rule, asset 업로드 검증 |
| Bytes transferred | 비용과 성능 | 압축, 이미지 최적화 |
| Purge count | 배포 안정성 | immutable asset, entry-only invalidation |
| Regional anomaly | 특정 지역 장애 | routing, provider status, fallback |

성능 가이드는 Core Web Vitals를 사용자 관점에서 보고, CDN 가이드는 전송 계층의 원인을 분리해 봅니다.

---

## 9. 체크리스트

- [ ] 모든 JS/CSS chunk 파일명에 content hash가 포함되는가
- [ ] `index.html`과 `service-worker.js`가 장기 캐시되지 않는가
- [ ] cache key에 불필요한 cookie/header/query가 포함되지 않는가
- [ ] 배포 시 전체 purge가 아니라 entry 중심 무효화를 하는가
- [ ] rollback할 이전 HTML과 asset이 보존되는가
- [ ] CSP/HSTS/Referrer-Policy 등 보안 헤더가 적용되는가
- [ ] hit ratio, origin latency, 4xx/5xx, purge count를 추적하는가
- [ ] SW 캐시와 CDN TTL의 충돌을 테스트했는가

---

## 10. 제외한 벤더 종속 항목

공통 개발 가이드에는 특정 CDN 제품의 함수 런타임, 전용 key-value store, 전용 continuous deployment 기능, 전용 WAF managed rule, 전용 CLI 명령, 특정 DNS/인증서 서비스 절차를 표준으로 포함하지 않습니다. 이 문서에는 어떤 CDN을 쓰더라도 유지되어야 하는 HTTP 캐시, cache key, 무효화, 보안 헤더, 압축, 관측성 기준만 남깁니다.

---

문서 최종 업데이트: 2026-05-27

### 2026 도메인별 고도화 포인트

- **캐시 계층 분리 문서화**: 브라우저 캐시, CDN 캐시, SW 캐시의 TTL·무효화 책임을 분리하고 충돌 시 우선순위를 고정합니다.
- **Cache busting 표준화**: 해시 자산, 동적 콘텐츠, API 응답에 대해 cache-key/쿼리 전략을 팀 공통 규약으로 정리합니다.
- **캐시 보안 연동**: 보안 헤더, 압축 설정, CORS 정책을 릴리즈 전 점검항목으로 포함합니다.
- **무효화 효과 분석**: purge 이벤트 후 hit-ratio와 오류율 추이를 수집해 캐시 무효화 정책을 조정합니다.


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

- 캐시 계층 분리 운영: 브라우저, CDN, SW 캐시 책임을 분리해 purge 충돌 가능성을 최소화합니다.
- 무효화 비용 모델링: purge 횟수와 hit-ratio 변화를 수집해 정책을 릴리즈 주기마다 조정합니다.
- 보안 헤더 캐싱 일관성: CSP/HSTS/CORS 캐시가 일치하는지 배포 전 점검하고 오탐/누락을 보정합니다.
- 미들웨어 경계 규칙: 동적 콘텐츠 캐시 키를 URL 정규화 기준으로 정렬해 예기치 않은 분기를 줄입니다.
- 에지 비용 최적화: 지역별 miss ratio에 따라 TTL 정책을 자동 추천하고 이탈 구간은 긴급 리뷰합니다.

- 캐시 정책은 TTL만으로 판단하지 않고 무효화 비용, 오리진 부하, 지연 분포를 함께 봐 캐시 설계를 조정합니다.
- 동적 개인화 영역은 캐시 분리를 강화해 오염된 응답이 공통 캐시로 유입되지 않도록 검증합니다.
- PoP/엣지 장애 시 폴백 경로와 모니터링 알림의 동기화를 문서화해 사용자 체감 장애 시간을 낮춥니다.
- 캐시 미스율 상승 구간은 사용자 전환 손실과 연동해 캐시 정책 변경의 우선순위를 계산합니다.
- 민감 데이터 응답은 캐시 계층 분리와 태그 제거 규칙을 문서에서 검증 가능한 형태로 고정합니다.
- 무효화 정책 변경은 콘텐츠 중요도와 재요청 비용을 함께 분석해 무의미한 purge를 줄입니다.
- 캐시 정책 변경은 오리진 부하와 사용자 체감 지연을 함께 보고해 비용·성능 균형을 맞춥니다.
- 캐시 정책은 트래픽 급증 구간에서의 경합 완화 성능을 기준으로 추가 규칙을 조정합니다.
- 무효화 정책 변경은 사용자 경로별 영향 분석과 연동해 과도한 캐시 삭제를 억제합니다.

### 2026 트렌드 실행 규칙(Measure-Action-Owner)
- **측정 신호**: 도입 전후 성능/안정성/보안/운영성 지표를 단일 스냅샷으로 비교하고 회귀 방향을 즉시 판별합니다.
- **임계치 트리거**: 임계치 초과 시 `Rollback Condition`으로 자동 분류되어 다음 릴리즈 단계로 진행하지 않습니다.
- **운영 승인**: 문서 오너와 00 가이드 오너의 2인 승인 후에만 기본 채택 상태로 변경합니다.
- **실행 보증**: 변경된 항목은 최소 1회 E2E 또는 관측성 재현 경로로 증빙하고 증거 링크를 남깁니다.
- **롤백 경로**: 실패 징후가 누적되면 24시간 이내 feature flag off 또는 배포 속도 축소로 기본 경로를 복구합니다.
- **학습 반영**: 실패 케이스와 재현 절차를 다음 분기 지표 스펙에 반영해 자동화 대상 후보로 우선 등록합니다.
- **캐시 신뢰성 룰**: 오리진 오동작 구간은 캐시 강등 모드로 진입해 영향면을 축소합니다.
- **무효화 비용 관리**: purge 비용 상승은 사전 공지 후 점진적으로 배포 범위를 축소합니다.

### 2026 트렌드 실행 체크리스트(자동화 트리거)
- [ ] **Owner 지정**: 문서별 `Trend Owner`와 `Backup Owner`를 지정하고 월간 점검표와 연결한다.
- [ ] **SLA 정의**: 임계치 초과 대응을 `24시간 / 72시간 / 1주일` 단계로 나누어 운영한다.
- [ ] **Rollback Drill**: 실패 전개 조건에서 롤백 경로를 최소 한 번 시뮬레이션하고 날짜를 기록한다.
- [ ] **증빙 링크**: 변경/실험/이슈에 대한 증거 링크를 PR 템플릿과 연동한다.
- [ ] **자동 경고**: 지표 임계치 초과 시 자동 알람 라우팅이 제대로 작동하는지 확인한다.
- [ ] **재학습 루프**: 실패 케이스를 다음 스프린트 우선순위 큐로 이관한다.
- [ ] **검증 주기**: 월간 점검 스냅샷과 분기 회고 항목을 분리해 관리한다.
- [ ] **결과 공유**: 주요 의사결정은 00의 운영 채널과 README Snapshot에 되돌린다.
- [ ] **캐시 회수성 검증**: purge/재배포 정책이 사용자 노출 지표에 부정적 영향이 없는지 확인한다.
- [ ] **예산 자동화 연계**: 캐시 비용 증가 시 자동 경고와 조정 룰을 실행한다.