# 12. CDN 캐시 전략

## 0. 먼저 알고 가기 (30초 요약)

- 정적 자산은 한 번 캐싱되면 재사용되므로, 버전 정책이 성능을 좌우합니다.
- 캐시 TTL을 길게 두되, 배포 변경 시 무효화 경로를 분명히 만드세요.
- 캐시 미스/히트가 사용자 체감 속도에 미치는 영향을 별도로 모니터링하세요.

## 초심자용 한눈에 보기

정적 자산은 "처음 빠르게, 오래 안정적으로" 전달되도록 캐시 전략을 세웁니다.

> 일상 비유: 동네 편의점에 자주 사는 물건을 옮겨 두면 사용자가 본사 창고(origin)까지 가지 않아도 됩니다. 단, 라벨이 바뀐 신상품(새 배포의 HTML)은 편의점이 빨리 교체해야 합니다.

### 핵심 용어 빠르게 정리

| 용어             | 쉬운 뜻                                                    |
| ---------------- | ---------------------------------------------------------- |
| `CDN`            | 전세계에 복제해 빠르게 전달하는 정적 저장 네트워크         |
| `캐시 정책`      | 얼마나 오래 저장할지 정한 규칙                             |
| `TTL`            | 캐시 유지 시간                                             |
| `무효화`         | 캐시된 내용을 갱신/삭제하는 동작                           |
| `불변성`         | URL 버전이 바뀌면 새 파일로 간주해 캐시 충돌을 줄이는 방식 |
| `entry document` | SPA에서 가장 먼저 받는 HTML 진입점                         |
| `purge`          | 캐시 항목을 명시적으로 삭제하는 명령                       |

### TTL 계층 한눈에 보기

> 왜 중요한가: 모든 파일에 같은 TTL을 적용하면 진입점(HTML)이 늦게 갱신되거나, 해시 자산이 불필요하게 자주 origin을 호출합니다.

```mermaid
flowchart LR
  H["짧음(0~수초)\nindex.html / manifest / sw.js"] --> M["중간(수 분~시간)\nAPI cache, 개인화 응답"]
  M --> L["길음(1년 + immutable)\nhash가 붙은 JS/CSS/이미지/폰트"]
```

| 분류            | 성능 & 배포                                                                                                                                                              | 상태          | Stable    |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------ | :-------- |
| **연관 가이드** | [08. 성능](./08_성능_최적화_가이드.md), [10. 인프라](./10_인프라_IaC_가이드.md), [11. CI/CD](./11_CICD_파이프라인_표준.md), [14. 배포](./14_배포_프로세스_체크리스트.md) | **도구 원칙** | 벤더 중립 |
| **핵심 테마**   | HTTP caching, immutable assets, cache key, invalidation, compression, security headers, edge routing                                                                     | **Update**    | 최신 기준 |

---

> CDN 캐시 표준은 특정 CDN 제품의 기능 목록이 아니라 **정적 자산을 오래 캐시하고, 엔트리 문서는 즉시 갱신하며, 캐시 키와 무효화를 통제하는 배포 계약**입니다.

---

## 추천 항목 (실무 우선순위)

- **시작 추천**: 정적 자산은 immutable 정책과 적정 TTL을 먼저 정하고 캐시 헤더를 통일하세요.
- **안정 추천**: HTML은 짧은 TTL + 적절한 리비전 전략으로 즉시 반영성 확보를 설정합니다.
- **운영 추천**: 무효화 실패 케이스를 배포 체크리스트에 넣고 배포 후 캐시 히트율을 점검하세요.

## 추천 항목 고도화 체크

- `첫 적용` — cache-control, invalidation, fallback route 중 하나를 실제 PR이나 운영 이슈에 붙이고, 변경 전 기준을 먼저 적는다.
- `증거 정리` — response header, invalidation log, cache hit ratio를 같은 작업 기록에 남긴다.
- `재점검` — hit ratio, stale asset incident, invalidation 비용가 나아졌는지 30일 안에 확인하고 기준을 유지, 수정, 폐기 중 하나로 판정한다.

## 추천 항목 실행 기록 템플릿

- `작업` : cache-control, invalidation, fallback route 적용 범위를 어느 화면, 패키지, 문서에 둘지 적는다.
- `증거` : response header, invalidation log, cache hit ratio 중 실제로 남긴 항목만 링크한다.
- `판정` : 유지/수정/폐기 중 하나와 이유를 한 문장으로 남긴다.
- `다음 점검` : hit ratio, stale asset incident, invalidation 비용를 다시 볼 날짜와 담당자를 지정한다.

## 문서 책임 범위

| 이 문서가 결정하는 것                                                  | 단일 출처로 따르는 문서                                                                 |
| :--------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| HTTP cache header, immutable asset, entry freshness, invalidation 계약 | [14. 배포](./14_배포_프로세스_체크리스트.md), [11. CI/CD](./11_CICD_파이프라인_표준.md) |
| cache key, compression, security headers, edge routing 기준            | [06. 보안](./06_웹_보안_심화_가이드.md), [10. 인프라](./10_인프라_IaC_가이드.md)        |
| 캐시가 Core Web Vitals와 RUM에 미치는 영향                             | [08. 성능](./08_성능_최적화_가이드.md), [09. 관측성](./09_장애_대응_및_관측성_표준.md)  |
| Service Worker/PWA cache와 CDN cache의 책임 분리                       | [26. PWA](./26_PWA_오프라인_전략_가이드.md)                                             |

---

## 0. 모든 프론트엔드 그룹 공통 Baseline

| 영역                 | 공통 기준                                                                             | 검증 방법               |
| :------------------- | :------------------------------------------------------------------------------------ | :---------------------- |
| **Immutable assets** | 파일명에 content hash가 있는 JS/CSS/image/font는 장기 캐시 + immutable                | response header 검사    |
| **Entry document**   | `index.html`, app shell, manifest 중 배포 전환에 민감한 파일은 no-cache 또는 짧은 TTL | smoke test              |
| **Cache key 최소화** | 캐시에 필요한 header, cookie, query만 포함                                            | cache hit ratio         |
| **무효화 최소화**    | 전체 purge 대신 entry document와 변경 경로만 무효화                                   | deploy log              |
| **압축**             | Brotli/gzip 전송 또는 사전 압축을 적용                                                | `content-encoding` 검사 |
| **보안 헤더**        | HSTS, CSP, X-Content-Type-Options, Referrer-Policy 등 공통 헤더 적용                  | header audit            |
| **관측성**           | hit/miss, origin latency, 4xx/5xx, regional anomaly 추적                              | CDN dashboard/RUM       |

### 0.0 캐시 요청/무효화 흐름

> 왜 중요한가: hit/miss 흐름을 한 화면에서 이해해야 어디서 stale asset 사고가 나는지 빠르게 진단할 수 있습니다.

```mermaid
flowchart TD
  A[빌드 산출물 생성] --> B{자산 유형}
  B -->|hash된 정적 자산| C[장기 캐시 + immutable]
  B -->|진입점 HTML/manifest| D[짧은 TTL]
  C --> E[CDN 업로드]
  D --> E
  E --> F[브라우저 요청]
  F --> G{캐시 히트}
  G -->|HIT| H[즉시 응답]
  G -->|MISS| I[Origin 응답 후 헤더 기반 갱신]
  I --> E
  J[배포 이벤트] --> K[entry 전환 + 대상 purge]
  K --> H
```

### 0.0.1 cache hit/miss 시퀀스

> 비유: 동네 편의점(엣지)에 물건이 있으면 즉시 건네주고, 없으면 본사 창고(origin)에 주문해 받아 두었다가 다음 손님부터 빠르게 줍니다.

```mermaid
sequenceDiagram
  participant U as 사용자
  participant Edge as CDN Edge
  participant Origin as Origin
  U->>Edge: GET /assets/app.abc123.js
  alt HIT (fresh)
    Edge-->>U: 즉시 응답 (cache-control: immutable)
  else MISS
    Edge->>Origin: 요청 forward
    Origin-->>Edge: 200 + Cache-Control
    Edge->>Edge: 응답 저장 (TTL 만료까지)
    Edge-->>U: 응답 반환
  else STALE
    Edge-->>U: stale 응답 (stale-while-revalidate)
    Edge->>Origin: 백그라운드 재검증
    Origin-->>Edge: 200 + 새 응답으로 교체
  end
```

### 0.0.2 invalidation 시퀀스 (배포 직후)

> 왜 중요한가: 잘못된 무효화 순서는 "HTML은 새 버전, JS는 이전 버전" 같은 화면 깨짐을 만듭니다.

```mermaid
sequenceDiagram
  participant CI as 배포 워크플로
  participant Bucket as 정적 저장소
  participant CDN as CDN
  participant U as 사용자
  CI->>Bucket: 1. 새 hash asset 업로드
  CI->>CDN: 2. asset 경로 캐시 워밍 (선택)
  CI->>Bucket: 3. entry HTML 전환
  CI->>CDN: 4. entry HTML/manifest purge (대상 한정)
  U->>CDN: 새 HTML 요청
  CDN-->>U: 새 HTML
  U->>CDN: 새 HTML이 참조하는 hash asset 요청
  CDN-->>U: 새 asset (이미 캐시 또는 origin)
```

### 0.1 교차 검증 매트릭스

| 권고                | 1차 출처                          | 실행 증거                       | 운영 증거                             | 철회 조건                              |
| :------------------ | :-------------------------------- | :------------------------------ | :------------------------------------ | :------------------------------------- |
| HTTP cache contract | HTTP caching 표준과 브라우저 동작 | header smoke, asset hash check  | cache hit ratio, stale asset incident | HTML/asset mismatch 발생 시 TTL 재설계 |
| 최소 cache key      | CDN/HTTP 캐시 원리                | key diff review, hit ratio test | origin request rate                   | 개인화 오류 발생 시 key 확장           |
| 보안 헤더           | OWASP/W3C 보안 권고               | header audit, CSP report-only   | CSP violation, mixed content          | 위반 폭증 시 report-only로 회귀        |

### 0.2 운영 게이트

| Gate             | Evidence                                 | Owner          | Rollback                              |
| :--------------- | :--------------------------------------- | :------------- | :------------------------------------ |
| Cache contract   | response header smoke, hash asset 검사   | Platform owner | TTL 축소 또는 entry 문서 rollback     |
| Cache key 변경   | key diff, hit ratio, origin request 변화 | CDN owner      | key 확장/축소 rollback                |
| Invalidation     | purge log, route list, release id        | Release owner  | targeted purge 또는 이전 entry 복구   |
| Security headers | header audit, CSP report-only 결과       | Security owner | report-only 전환 또는 policy rollback |

---

## 1. Cache-Control 표준

| 파일 유형             | 권장 정책                                                                 | 이유                                         |
| :-------------------- | :------------------------------------------------------------------------ | :------------------------------------------- |
| `assets/*.[hash].js`  | `public, max-age=31536000, immutable`                                     | 파일명이 바뀌면 새 버전이므로 장기 캐시 가능 |
| `assets/*.[hash].css` | `public, max-age=31536000, immutable`                                     | JS와 동일                                    |
| image/font with hash  | `public, max-age=31536000, immutable`                                     | 사용자 재방문 성능 개선                      |
| `index.html`          | `no-cache` 또는 `max-age=0, must-revalidate`                              | 새 배포 진입점 즉시 반영                     |
| `manifest.json`       | 짧은 TTL 또는 `no-cache`                                                  | 앱 이름/아이콘/시작 URL 변경 가능            |
| `service-worker.js`   | `no-cache`                                                                | 업데이트 감지를 늦추면 오프라인 캐시가 꼬임  |
| API response          | 데이터 특성별 `private`, `no-store`, `s-maxage`, `stale-while-revalidate` | 개인화와 freshness 요구가 다름               |

`no-store`는 브라우저와 CDN 모두 저장하지 말아야 하는 민감 응답에 사용합니다. 단순히 새 버전 확인이 필요한 엔트리 문서에는 `no-cache`가 더 적합한 경우가 많습니다.

---

## 2. Cache Key 설계

> 비유: 도서관 분류번호와 같습니다. 너무 세분화하면 같은 책도 여러 번 들여놓아야 하고(낮은 hit), 너무 묶어 두면 다른 책을 잘못 꺼내옵니다(개인화 누출).

캐시 키는 작을수록 hit ratio가 좋아집니다. 필요한 값만 포함합니다.

| 요소         | 기본 기준             | 포함해야 하는 경우                                             |
| :----------- | :-------------------- | :------------------------------------------------------------- |
| Query string | 제외                  | 이미지 변환, 검색 결과, pagination처럼 응답이 실제로 달라질 때 |
| Cookie       | 제외                  | 로그인 상태별 HTML, A/B bucket처럼 응답이 달라질 때            |
| Header       | 제외                  | `Accept-Language`, device class, image format 협상 등          |
| Path         | 포함                  | 기본 캐시 식별자                                               |
| Host         | 멀티 도메인일 때 포함 | tenant/domain별 콘텐츠가 다를 때                               |

무의식적으로 모든 query, cookie, header를 cache key에 넣으면 CDN cache hit ratio가 크게 떨어집니다.

```mermaid
flowchart TD
  Req[들어온 요청] --> Q1{응답이 query에 따라 달라지는가}
  Q1 -->|아니오| Skip1[query 제외]
  Q1 -->|예| Add1[필요한 query만 포함]
  Skip1 --> Q2{로그인 상태별 응답이 다른가}
  Add1 --> Q2
  Q2 -->|아니오| Skip2[cookie 제외]
  Q2 -->|예| Add2[필요한 cookie만 포함]
  Skip2 --> Q3{언어/기기/포맷 협상 필요}
  Add2 --> Q3
  Q3 -->|아니오| Skip3[header 제외]
  Q3 -->|예| Add3[Accept-* 일부만 포함]
  Skip3 --> Key[최종 cache key]
  Add3 --> Key
```

---

## 3. SPA/MPA 배포 계약

> 일상 비유: 신메뉴 안내판(HTML)을 바꾸기 전에 재료(JS/CSS)를 먼저 준비해 두지 않으면, 손님이 시키는 메뉴가 주방에 없는 사태가 생깁니다.

프론트엔드 배포에서 가장 흔한 장애는 "HTML은 새 버전, JS는 이전 버전" 또는 그 반대입니다.

| 계약                   | 기준                                                     |
| :--------------------- | :------------------------------------------------------- |
| Artifact               | 한 번 만든 build artifact는 수정하지 않고 승격           |
| Asset hash             | 모든 JS/CSS chunk는 content hash 포함                    |
| Entry freshness        | entry HTML은 항상 최신 확인                              |
| Backward compatibility | 새 HTML이 참조하는 asset이 CDN에 업로드된 뒤 HTML을 전환 |
| Rollback               | 이전 HTML과 이전 asset이 보존되어야 함                   |
| Service Worker         | SW 캐시 정책과 CDN TTL을 별도 문서로 맞춤                |

배포 순서는 일반적으로 `assets 업로드 -> assets 검증 -> entry 문서 전환 -> entry 무효화 -> smoke test`입니다.

```mermaid
flowchart LR
  Up["1. 새 hash asset 업로드"] --> Vf["2. asset URL HEAD 검증"]
  Vf --> Sw["3. entry HTML 전환"]
  Sw --> Pg["4. entry/manifest/sw.js purge"]
  Pg --> Sm["5. smoke (HTML/asset/stale)"]
  Sm --> Mn["6. RUM/hit ratio 관측"]
```

---

## 4. Invalidation 원칙

> 왜 중요한가: 전체 purge는 사용자에게 갑작스러운 latency 폭증을 안겨줍니다. 변경 범위만 정확히 끊는 능력이 캐시 운영 수준을 가릅니다.

| 상황                  | 권장 무효화                                             |
| :-------------------- | :------------------------------------------------------ |
| 일반 SPA 배포         | entry HTML, manifest, service worker                    |
| 해시 자산 변경        | 무효화 불필요                                           |
| 잘못된 정적 파일 배포 | 해당 경로만 purge                                       |
| 보안/개인정보 노출    | 즉시 purge + 원본 삭제 + postmortem                     |
| API 캐시 오염         | affected key만 purge, 원인 수정 전 전체 purge 반복 금지 |

`/*` 전체 무효화는 비용, 지연, cache warm-up 손실을 만들기 때문에 긴급 상황이 아니라면 피합니다.

```mermaid
flowchart TD
  Trig{무효화 트리거}
  Trig -->|일반 배포| Entry[entry HTML/manifest/sw.js만]
  Trig -->|hash asset 변경| None[무효화 불필요]
  Trig -->|잘못된 정적 파일| Path[해당 경로만]
  Trig -->|보안/PII 노출| Sec[즉시 purge + 원본 삭제 + incident]
  Trig -->|API 캐시 오염| Key[affected key 한정]
  Entry --> Log[purge log + release id]
  Path --> Log
  Sec --> Log
  Key --> Log
  Log --> Verify[배포 후 smoke 재검증]
```

---

## 5. 보안 헤더

> 일상 비유: 보안 헤더는 건물 입구의 안내문/잠금 장치와 같습니다. 한 군데에서만 적용하면 다른 입구로 들어온 사용자에게는 적용되지 않습니다.

CDN 또는 origin 중 한 곳에서 일관되게 보안 헤더를 적용합니다.

| 헤더                         | 기준                                                               |
| :--------------------------- | :----------------------------------------------------------------- |
| `Strict-Transport-Security`  | HTTPS 강제, preload는 도메인 소유권과 서브도메인 영향 검토 후 적용 |
| `Content-Security-Policy`    | `default-src 'self'`에서 시작해 필요한 출처만 allowlist            |
| `X-Content-Type-Options`     | `nosniff`                                                          |
| `Referrer-Policy`            | `strict-origin-when-cross-origin` 이상                             |
| `Permissions-Policy`         | 사용하지 않는 브라우저 기능 비활성화                               |
| `Cross-Origin-Opener-Policy` | 격리가 필요한 앱에서 적용                                          |

보안 헤더는 모든 환경에서 동일한 정책을 쓰기보다, report-only에서 위반 로그를 확인한 뒤 enforce로 전환합니다.

---

## 6. Compression과 이미지 전송

| 대상         | 기준                                          |
| :----------- | :-------------------------------------------- |
| Text assets  | Brotli 우선, gzip fallback                    |
| Large JS/CSS | 사전 압축 또는 CDN 압축 중 하나를 명확히 선택 |
| Images       | AVIF/WebP 지원, 원본 보관, width/quality 제한 |
| Fonts        | subset, preload 최소화, `font-display` 적용   |

압축은 성능 최적화지만 CPU 비용과 빌드 시간을 늘릴 수 있습니다. 큰 트래픽 서비스는 사전 압축과 CDN 자동 압축의 비용/효과를 측정합니다.

---

## 7. Edge Logic 사용 기준

Edge function/worker는 강력하지만 남용하면 디버깅이 어려워집니다.

| 적합                   | 부적합               |
| :--------------------- | :------------------- |
| SPA fallback rewrite   | 복잡한 비즈니스 로직 |
| 단순 redirect          | 대규모 DB 조회       |
| 언어/지역 기반 routing | 개인정보 처리        |
| A/B bucket header 부여 | 긴 실행 시간 작업    |
| 보안 헤더 보정         | 상태ful workflow     |

Edge logic은 테스트, 로그, 롤백 경로가 있는 경우에만 production에 적용합니다.

---

## 8. 관측 지표

| 지표              | 의미                                | 개선 방향                                |
| :---------------- | :---------------------------------- | :--------------------------------------- |
| Cache hit ratio   | CDN이 origin 요청을 얼마나 줄이는지 | cache key 축소, TTL 조정                 |
| Origin latency    | 캐시 미스 시 사용자 영향            | origin 성능, shield/cache layer          |
| 4xx/5xx by path   | 잘못된 라우팅/배포 탐지             | rewrite rule, asset 업로드 검증          |
| Bytes transferred | 비용과 성능                         | 압축, 이미지 최적화                      |
| Purge count       | 배포 안정성                         | immutable asset, entry-only invalidation |
| Regional anomaly  | 특정 지역 장애                      | routing, provider status, fallback       |

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

## 실무 적용 가이드

### 언제 이 문서를 펼칠까

- 배포 후 사용자가 오래된 JS/CSS를 받거나 blank screen이 생길 때
- 캐시 hit ratio는 높은데 개인화/보안 문제가 의심될 때
- cache purge와 rollback 순서가 정해져 있지 않을 때

### 적용 순서

1. HTML/entry는 짧게, 해시 자산은 immutable로 캐시한다.
2. cache key에서 cookie/header/query를 최소화한다.
3. 개인화 응답과 public asset 경계를 분리한다.
4. 배포 후 header scan과 stale asset synthetic check를 돌린다.
5. purge, rollback, 이전 asset 보관 기간을 문서화한다.

### 함께 두는 파일

- route별 cache policy와 배포 설정을 같은 service/config 폴더에 둔다.
- CDN header test는 배포 pipeline 가까이에 둔다.
- PWA cache와 CDN cache 정책은 서로 링크하되 책임을 분리한다.

### 흔한 실수

- HTML에 immutable cache를 준다.
- 사용자별 응답을 public cache에 섞는다.
- cache key에 모든 cookie를 포함해 hit ratio를 망친다.
- purge만 믿고 rollback asset을 보관하지 않는다.

### PR 완료 기준

- [ ] cache-control 정책표가 있다.
- [ ] header scan이 통과한다.
- [ ] stale asset/rollback 테스트가 있다.
- [ ] 개인화 응답 캐시 위험이 검토되었다.

## 추천 항목 실행 우선순위 매핑

- `P1(7일 내)` — cache-control, invalidation, fallback route 중 하나를 작은 변경 1건에 적용하고 증거(response header)를 남긴다.
- `P2(30일 내)` — CDN 캐시 기준을 팀 템플릿, 체크리스트, CI 중 한 곳에 고정한다.
- `P3(90일 내)` — hit ratio, stale asset incident, invalidation 비용 추이를 보고 기준을 유지할지 조정할지 결정한다.
- `완료 기준` — 캐시 오너가 증거와 철회 조건을 확인했다는 기록을 남긴다.

## 추천 항목 실행 체크리스트

- [ ] `1단계(7일)` : cache-control, invalidation, fallback route 적용 대상을 1개로 좁힌다.
- [ ] `2단계(30일)` : 증거(response header, invalidation log, cache hit ratio)를 PR, ADR, 회고 중 한 곳에 연결한다.
- [ ] `3단계(60일)` : hit ratio, stale asset incident, invalidation 비용가 기준 안에 들어왔는지 확인한다.
- [ ] `문제 대응` : 미달성 사유와 다음 조치, 중단 여부를 같은 기록에 남긴다.

## 추천 항목 실행 운영 규칙

- `실행 게이트` : HTML, asset, runtime config의 TTL을 서로 다르게 둔다.
- `승인 체계` : 캐시 오너가 영향 범위와 rollback 담당자를 적용 전에 확인한다.
- `재개 조건` : 새 TTL이 staging header와 smoke test에서 확인되면 production에 반영한다.
- `정지 조건` : entry HTML이 immutable로 배포되거나 runtime config가 stale이면 rollback한다.
- `리스크 점수` : TTL 길이, invalidation 범위, 사용자 영향 URL 수로 산정한다.
- `리더 승인자` : 배포/인프라 리드가 최종 승인 책임을 맡는다.
- `승인 역할` : CDN 캐시 작성자, 검토자, 운영 확인자를 분리해 기록한다.
- `재평가 주기` : 릴리스 후 cache hit와 stale report를 확인한다.
