# 11. CI/CD 파이프라인 표준 (2025-2026 Edition)

| 분류 | 인프라 & CI/CD | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [10. 인프라](./10_인프라_및_AWS_CDK_가이드.md), [12. CloudFront 캐시](./12_CloudFront_캐시_전략.md), [14. 배포 체크리스트](./14_배포_프로세스_체크리스트.md), [22. 모노레포](./22_모노레포_운영_가이드.md) | **AI 도구** | GitHub Actions, Claude Code |
| **핵심 테마** | Environment Gating, Canary Deployment, CI Optimization, Secret Management | **Update** | 2025.04 |

---

> **"지속적 통합(CI)은 개발 속도를 높이고, 지속적 배포(CD)는 안정성을 확보한다. 자동화되지 않은 과정은 모두 기술 부채다."**
> 본 가이드는 GitHub Actions를 활용하여 고성능 프론트엔드 배포 파이프라인을 구축하는 표준 모델을 제시합니다.

---

## 1. 파이프라인 아키텍처: 병렬화와 캐싱

배포 시간을 단축하기 위해 각 단계를 병렬화하고 종속성을 캐싱합니다. 아래는 `lint → test → build → deploy` 4단계 파이프라인의 완전한 예시입니다.

### 1.1 완전한 멀티잡 워크플로우

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

# 동시에 같은 브랜치에서 여러 워크플로우가 돌지 않도록 제어
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  BUN_VERSION: '1.1'

jobs:
  # ──────────────────────────────────────────────
  # 1단계: 린트 (코드 스타일 및 정적 분석)
  # ──────────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}

      # 의존성 캐싱 — bun.lockb 해시 기반
      - name: 의존성 캐시 복원
        uses: actions/cache@v4
        id: bun-cache
        with:
          path: |
            node_modules
            ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lockb') }}
          restore-keys: |
            bun-${{ runner.os }}-

      - name: 의존성 설치
        if: steps.bun-cache.outputs.cache-hit != 'true'
        run: bun install --frozen-lockfile

      - name: ESLint 검사
        run: bun run lint

      - name: TypeScript 타입 체크
        run: bun run type-check

  # ──────────────────────────────────────────────
  # 2단계: 테스트 (유닛 + 통합 테스트, 매트릭스 전략)
  # ──────────────────────────────────────────────
  test:
    name: Test (${{ matrix.shard }})
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [lint]  # 린트 통과 후 실행
    strategy:
      fail-fast: false
      matrix:
        # 테스트를 4개 샤드로 분할하여 병렬 실행
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: 의존성 캐시 복원
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lockb') }}

      - name: 의존성 설치
        if: steps.bun-cache.outputs.cache-hit != 'true'
        run: bun install --frozen-lockfile

      - name: 테스트 실행 (샤드 ${{ matrix.shard }}/4)
        run: |
          bun run test -- \
            --shard=${{ matrix.shard }}/4 \
            --coverage \
            --reporter=junit \
            --outputFile=test-results/junit-${{ matrix.shard }}.xml

      # 테스트 결과를 아티팩트로 업로드
      - name: 테스트 결과 업로드
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-shard-${{ matrix.shard }}
          path: test-results/
          retention-days: 7

  # ──────────────────────────────────────────────
  # 3단계: 빌드 (환경별 매트릭스)
  # ──────────────────────────────────────────────
  build:
    name: Build (${{ matrix.environment }})
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: [test]  # 테스트 통과 후 실행
    strategy:
      matrix:
        environment: [staging, production]
        exclude:
          # PR에서는 production 빌드를 건너뜀
          - environment: ${{ github.event_name == 'pull_request' && 'production' || 'none' }}
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: 의존성 캐시 복원
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lockb') }}

      # Next.js 빌드 캐시 — 증분 빌드 속도 향상
      - name: Next.js 빌드 캐시 복원
        uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ runner.os }}-${{ matrix.environment }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
          restore-keys: |
            nextjs-${{ runner.os }}-${{ matrix.environment }}-

      - name: 의존성 설치
        run: bun install --frozen-lockfile

      - name: 환경별 빌드
        run: bun run build
        env:
          NODE_ENV: production
          NEXT_PUBLIC_ENV: ${{ matrix.environment }}
          # 환경별 변수는 GitHub Environments에서 주입
          NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}

      # 빌드 결과물을 다음 잡으로 전달
      - name: 빌드 아티팩트 업로드
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.environment }}
          path: |
            .next/standalone/
            .next/static/
            public/
          retention-days: 3

  # ──────────────────────────────────────────────
  # 4단계: 배포
  # ──────────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - name: 빌드 아티팩트 다운로드
        uses: actions/download-artifact@v4
        with:
          name: build-staging
          path: ./deploy

      - name: S3에 업로드 및 CloudFront 캐시 무효화
        run: |
          aws s3 sync ./deploy s3://${{ vars.S3_BUCKET }} --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CF_DISTRIBUTION_ID }} \
            --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ap-northeast-2

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    environment:
      name: production
      url: https://www.example.com
    steps:
      - name: 빌드 아티팩트 다운로드
        uses: actions/download-artifact@v4
        with:
          name: build-production
          path: ./deploy

      - name: S3에 업로드 (카나리 배포)
        run: |
          # 카나리 버전으로 먼저 배포
          aws s3 sync ./deploy s3://${{ vars.S3_BUCKET_CANARY }} --delete
          echo "카나리 배포 완료 — 모니터링 시작"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ap-northeast-2
```

### 1.2 캐싱 전략 요약

| 캐시 대상 | 캐시 키 | 복원 키 | 효과 |
| :--- | :--- | :--- | :--- |
| `node_modules` | `bun-{os}-{lockfile_hash}` | `bun-{os}-` | 의존성 설치 시간 ~90% 단축 |
| `.next/cache` | `nextjs-{os}-{env}-{source_hash}` | `nextjs-{os}-{env}-` | 증분 빌드로 빌드 시간 ~60% 단축 |
| `~/.bun/install/cache` | 위와 동일 키 공유 | - | 글로벌 패키지 캐시 재활용 |
| Turborepo 원격 캐시 | 자동 (content hash) | - | 변경되지 않은 패키지 빌드 완전 스킵 |

### 1.3 아티팩트 전달 패턴

```
lint ──→ test (4 shards) ──→ build (staging/prod) ──→ deploy
                │                     │
                ▼                     ▼
         test-results/*        build-staging/
         (JUnit XML)           build-production/
```

- **`actions/upload-artifact@v4`** / **`actions/download-artifact@v4`** 를 사용하여 잡 간 파일 전달
- `retention-days`를 짧게 설정하여 스토리지 비용 절감
- 빌드 아티팩트와 테스트 리포트를 분리하여 관리

---

## 2. 환경 관리 및 승인 절차 (Environment Gating)

스테이징(Staging) 환경에서 검증된 빌드 결과물을 그대로 프로덕션(Production)으로 승격시키는 것이 가장 안전합니다.

### 2.1 GitHub Environments 설정

GitHub 리포지토리의 **Settings > Environments** 에서 아래와 같이 구성합니다.

| 환경 | 보호 규칙 | 배포 브랜치 | 시크릿 |
| :--- | :--- | :--- | :--- |
| `development` | 없음 | 모든 브랜치 | DEV용 AWS 키, API URL |
| `staging` | 없음 (자동 배포) | `main`, `develop` | STG용 AWS 키, API URL |
| `production` | 필수 리뷰어 2명 + 대기 타이머 | `main` 만 | PROD용 AWS 키, API URL |

### 2.2 환경 보호 규칙 YAML

```yaml
# 프로덕션 배포 잡 — 환경 보호 규칙이 자동으로 적용됨
deploy-production:
  runs-on: ubuntu-latest
  needs: [deploy-staging]
  # GitHub Environment 보호 규칙:
  #   - Required reviewers: tech-lead, devops-lead (2명 중 1명 이상 승인)
  #   - Wait timer: 10분 (스테이징 검증 시간 확보)
  #   - Deployment branches: main 브랜치만 허용
  environment:
    name: production
    url: https://www.example.com
  steps:
    - name: 승인 완료 확인
      run: echo "프로덕션 배포가 승인되었습니다. 배포를 시작합니다."
    # ... 이하 배포 스텝
```

### 2.3 배포 승인 워크플로우

```
1. main 브랜치에 머지
       ↓
2. staging 자동 배포 → QA 검증 (10분 대기 타이머)
       ↓
3. GitHub에서 "Review deployments" 알림 발송
       ↓
4. tech-lead 또는 devops-lead가 승인 (최소 1명)
       ↓
5. production 배포 자동 실행
       ↓
6. 카나리 배포 시작 (다음 섹션 참조)
```

> **Tip**: Slack 연동으로 승인 요청 알림을 받을 수 있습니다. GitHub App 또는 Slack Workflow Builder를 활용하세요.

---

## 3. 리스크 최소화: 카나리(Canary) 배포

새로운 버전을 전체 사용자에게 한꺼번에 노출하지 않고, 점진적으로 늘려나갑니다.

### 3.1 CloudFront + Route 53 가중치 라우팅

두 개의 CloudFront 배포(현재 버전, 카나리 버전)를 Route 53 가중치 레코드로 연결합니다.

```
                    Route 53 (Weighted Routing)
                    ┌──────────────────────┐
                    │  app.example.com     │
                    │                      │
                    │  Weight 90 ──→ CF-v1 │ (현재 안정 버전)
                    │  Weight 10 ──→ CF-v2 │ (카나리 신규 버전)
                    └──────────────────────┘
                           │          │
                    S3-stable/    S3-canary/
```

### 3.2 AWS CDK 인프라 코드

```typescript
import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

// 카나리 배포용 Route 53 가중치 레코드
export function createCanaryRouting(
  stack: cdk.Stack,
  zone: route53.IHostedZone,
  stableDistribution: cloudfront.IDistribution,
  canaryDistribution: cloudfront.IDistribution,
  canaryWeight: number = 10, // 기본 카나리 가중치 10%
) {
  // 안정 버전 레코드 (가중치: 100 - canaryWeight)
  new route53.ARecord(stack, 'StableRecord', {
    zone,
    recordName: 'app',
    target: route53.RecordTarget.fromAlias(
      new targets.CloudFrontTarget(stableDistribution),
    ),
    weight: 100 - canaryWeight,
    setIdentifier: 'stable',
  });

  // 카나리 버전 레코드 (가중치: canaryWeight)
  new route53.ARecord(stack, 'CanaryRecord', {
    zone,
    recordName: 'app',
    target: route53.RecordTarget.fromAlias(
      new targets.CloudFrontTarget(canaryDistribution),
    ),
    weight: canaryWeight,
    setIdentifier: 'canary',
  });
}
```

### 3.3 카나리 점진적 승격 스크립트

```bash
#!/bin/bash
# scripts/canary-promote.sh
# 카나리 가중치를 점진적으로 올리는 자동화 스크립트

set -euo pipefail

HOSTED_ZONE_ID="${HOSTED_ZONE_ID}"
RECORD_NAME="app.example.com"
HEALTH_CHECK_URL="https://canary.example.com/api/health"
ERROR_THRESHOLD=5  # 에러율 임계값 (%)

# 카나리 가중치 단계: 10% → 30% → 50% → 100%
WEIGHTS=(10 30 50 100)

update_weight() {
  local canary_weight=$1
  local stable_weight=$((100 - canary_weight))

  echo "카나리 가중치 변경: ${canary_weight}%"

  aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch "{
      \"Changes\": [
        {
          \"Action\": \"UPSERT\",
          \"ResourceRecordSet\": {
            \"Name\": \"${RECORD_NAME}\",
            \"Type\": \"A\",
            \"SetIdentifier\": \"stable\",
            \"Weight\": ${stable_weight},
            \"AliasTarget\": {
              \"HostedZoneId\": \"Z2FDTNDATAQYW2\",
              \"DNSName\": \"${STABLE_CF_DOMAIN}\",
              \"EvaluateTargetHealth\": true
            }
          }
        },
        {
          \"Action\": \"UPSERT\",
          \"ResourceRecordSet\": {
            \"Name\": \"${RECORD_NAME}\",
            \"Type\": \"A\",
            \"SetIdentifier\": \"canary\",
            \"Weight\": ${canary_weight},
            \"AliasTarget\": {
              \"HostedZoneId\": \"Z2FDTNDATAQYW2\",
              \"DNSName\": \"${CANARY_CF_DOMAIN}\",
              \"EvaluateTargetHealth\": true
            }
          }
        }
      ]
    }"
}

# 헬스 체크: HTTP 상태 + 에러율 확인
check_health() {
  local status_code
  status_code=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL")

  if [ "$status_code" != "200" ]; then
    echo "헬스 체크 실패: HTTP ${status_code}"
    return 1
  fi

  # CloudWatch에서 에러율 조회 (최근 5분)
  local error_rate
  error_rate=$(aws cloudwatch get-metric-statistics \
    --namespace "AWS/CloudFront" \
    --metric-name "5xxErrorRate" \
    --dimensions Name=DistributionId,Value="${CANARY_CF_DIST_ID}" \
    --start-time "$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S)" \
    --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
    --period 300 \
    --statistics Average \
    --query 'Datapoints[0].Average' \
    --output text)

  if (( $(echo "$error_rate > $ERROR_THRESHOLD" | bc -l) )); then
    echo "에러율 초과: ${error_rate}% > ${ERROR_THRESHOLD}%"
    return 1
  fi

  echo "헬스 체크 통과: HTTP ${status_code}, 에러율 ${error_rate}%"
  return 0
}

# 자동 롤백
rollback() {
  echo "카나리 롤백 실행! 가중치를 0%로 되돌립니다."
  update_weight 0
  echo "롤백 완료. 모든 트래픽이 안정 버전으로 돌아갔습니다."
  exit 1
}

# 메인 승격 루프
for weight in "${WEIGHTS[@]}"; do
  update_weight "$weight"

  echo "가중치 ${weight}%로 변경 완료. 5분간 모니터링..."
  sleep 300

  if ! check_health; then
    rollback
  fi

  echo "모니터링 통과. 다음 단계로 진행합니다."
done

echo "카나리 배포 완료! 100% 트래픽이 새 버전으로 전환되었습니다."
```

### 3.4 메트릭 기반 자동 승격 (GitHub Actions)

```yaml
# .github/workflows/canary-promote.yml
name: Canary Auto-Promote

on:
  workflow_dispatch:
    inputs:
      canary_version:
        description: '카나리 배포 버전'
        required: true

jobs:
  promote:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: AWS 자격 증명 설정
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ap-northeast-2

      - name: 카나리 점진적 승격
        run: |
          chmod +x scripts/canary-promote.sh
          ./scripts/canary-promote.sh
        env:
          HOSTED_ZONE_ID: ${{ vars.HOSTED_ZONE_ID }}
          STABLE_CF_DOMAIN: ${{ vars.STABLE_CF_DOMAIN }}
          CANARY_CF_DOMAIN: ${{ vars.CANARY_CF_DOMAIN }}
          CANARY_CF_DIST_ID: ${{ vars.CANARY_CF_DIST_ID }}

      - name: 슬랙 알림 (성공)
        if: success()
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "카나리 배포 완료: v${{ inputs.canary_version }} → 100% 트래픽 전환"
            }

      - name: 슬랙 알림 (롤백)
        if: failure()
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "카나리 롤백 발생: v${{ inputs.canary_version }} 배포 중단됨"
            }
```

---

## 4. 보안 및 품질 가드레일

배포 파이프라인에는 아래의 검증 단계가 반드시 포함되어야 합니다.

### 4.1 보안 스캔 (Snyk)

```yaml
# CI 파이프라인에 추가하는 보안 스캔 잡
security-scan:
  name: Security Scan
  runs-on: ubuntu-latest
  needs: [lint]
  steps:
    - uses: actions/checkout@v4

    - name: Snyk 의존성 보안 검사
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: >
          --severity-threshold=high
          --fail-on=upgradable
        # high 이상 취약점이 있고 업그레이드 가능하면 실패

    - name: Snyk 코드 보안 검사 (SAST)
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        command: code test
        args: --severity-threshold=high

    - name: Snyk 결과를 GitHub Security 탭에 연동
      uses: github/codeql-action/upload-sarif@v3
      if: always()
      with:
        sarif_file: snyk.sarif
```

### 4.2 번들 크기 검사 (size-limit)

```yaml
bundle-size:
  name: Bundle Size Check
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4

    - uses: oven-sh/setup-bun@v2

    - name: 의존성 설치
      run: bun install --frozen-lockfile

    - name: 빌드 아티팩트 다운로드
      uses: actions/download-artifact@v4
      with:
        name: build-staging
        path: .next/

    # size-limit으로 번들 크기 제한 검사
    - name: 번들 크기 체크
      uses: andresz1/size-limit-action@v1
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        # PR에 번들 크기 변화를 코멘트로 표시
        skip_step: build
```

**`package.json`에 size-limit 설정 추가:**

```json
{
  "size-limit": [
    {
      "path": ".next/static/chunks/**/*.js",
      "limit": "300 kB",
      "gzip": true,
      "name": "전체 JS 번들"
    },
    {
      "path": ".next/static/chunks/pages/index-*.js",
      "limit": "80 kB",
      "gzip": true,
      "name": "메인 페이지 JS"
    },
    {
      "path": ".next/static/css/**/*.css",
      "limit": "50 kB",
      "gzip": true,
      "name": "전체 CSS 번들"
    }
  ]
}
```

### 4.3 Lighthouse CI 설정

```yaml
lighthouse:
  name: Lighthouse CI
  runs-on: ubuntu-latest
  needs: [deploy-staging]
  steps:
    - uses: actions/checkout@v4

    - name: Lighthouse CI 실행
      uses: treosh/lighthouse-ci-action@v12
      with:
        urls: |
          https://staging.example.com/
          https://staging.example.com/products
          https://staging.example.com/search
        configPath: ./lighthouserc.json
        uploadArtifacts: true
        temporaryPublicStorage: true
```

**`lighthouserc.json` 설정 파일:**

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.90 }],
        "categories:best-practices": ["warn", { "minScore": 0.90 }],
        "categories:seo": ["warn", { "minScore": 0.90 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 300 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

> 성능 예산은 [08. 성능 최적화 가이드](./08_성능_최적화_가이드.md)와 일치시키세요.

---

## 5. 모노레포 CI 최적화

모노레포 환경에서는 변경된 패키지만 빌드/테스트하여 CI 시간을 최소화합니다. 자세한 모노레포 운영 방법은 [22. 모노레포 운영 가이드](./22_모노레포_운영_가이드.md)를 참조하세요.

### 5.1 변경된 패키지 감지

```yaml
# 변경된 패키지를 감지하여 후속 잡에 전달
detect-changes:
  name: Detect Changed Packages
  runs-on: ubuntu-latest
  outputs:
    # 각 패키지의 변경 여부를 출력
    web-changed: ${{ steps.changes.outputs.web }}
    admin-changed: ${{ steps.changes.outputs.admin }}
    shared-changed: ${{ steps.changes.outputs.shared }}
    affected: ${{ steps.affected.outputs.packages }}
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0  # 전체 히스토리 필요 (diff 비교용)

    # 경로 기반 변경 감지
    - uses: dorny/paths-filter@v3
      id: changes
      with:
        filters: |
          web:
            - 'apps/web/**'
            - 'packages/shared/**'
          admin:
            - 'apps/admin/**'
            - 'packages/shared/**'
          shared:
            - 'packages/shared/**'

    # Turborepo의 --filter 활용한 정밀 감지
    - name: 영향받는 패키지 목록 추출
      id: affected
      run: |
        AFFECTED=$(bunx turbo run build --filter='...[origin/main]' --dry-run=json \
          | jq -r '.packages | join(",")')
        echo "packages=${AFFECTED}" >> "$GITHUB_OUTPUT"
        echo "영향받는 패키지: ${AFFECTED}"
```

### 5.2 선택적 빌드/테스트

```yaml
# 변경된 패키지만 빌드
build-web:
  name: Build Web App
  runs-on: ubuntu-latest
  needs: [detect-changes, lint]
  if: needs.detect-changes.outputs.web-changed == 'true'
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install --frozen-lockfile

    # Turborepo 원격 캐시 활용 — 변경되지 않은 의존성은 캐시에서 복원
    - name: Turborepo로 선택적 빌드
      run: bunx turbo run build --filter=web...
      env:
        TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
        TURBO_TEAM: ${{ vars.TURBO_TEAM }}

build-admin:
  name: Build Admin App
  runs-on: ubuntu-latest
  needs: [detect-changes, lint]
  if: needs.detect-changes.outputs.admin-changed == 'true'
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install --frozen-lockfile
    - name: Turborepo로 선택적 빌드
      run: bunx turbo run build --filter=admin...
      env:
        TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
        TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

### 5.3 Turborepo CI 설정

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    }
  }
}
```

---

## 6. 자동 롤백 전략

배포 후 문제가 발생하면 즉시 이전 버전으로 되돌릴 수 있어야 합니다.

### 6.1 헬스 체크 기반 자동 롤백

```yaml
# 배포 후 헬스 체크 → 실패 시 자동 롤백
post-deploy-check:
  name: Post-Deploy Health Check
  runs-on: ubuntu-latest
  needs: [deploy-production]
  steps:
    - name: 헬스 체크 실행 (최대 5분 대기)
      id: health
      run: |
        MAX_RETRIES=10
        RETRY_INTERVAL=30
        TARGET_URL="${{ vars.PRODUCTION_URL }}/api/health"

        for i in $(seq 1 $MAX_RETRIES); do
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL" || echo "000")
          echo "시도 ${i}/${MAX_RETRIES}: HTTP ${STATUS}"

          if [ "$STATUS" = "200" ]; then
            echo "헬스 체크 통과!"
            echo "healthy=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          sleep $RETRY_INTERVAL
        done

        echo "헬스 체크 실패: ${MAX_RETRIES}회 시도 후 타임아웃"
        echo "healthy=false" >> "$GITHUB_OUTPUT"
        exit 1

    - name: 자동 롤백 트리거
      if: failure()
      uses: actions/github-script@v7
      with:
        script: |
          // 롤백 워크플로우를 자동 트리거
          await github.rest.actions.createWorkflowDispatch({
            owner: context.repo.owner,
            repo: context.repo.repo,
            workflow_id: 'rollback.yml',
            ref: 'main',
            inputs: {
              reason: '헬스 체크 실패에 의한 자동 롤백',
              failed_run_id: '${{ github.run_id }}'
            }
          });
```

### 6.2 에러율 기반 롤백

```yaml
# .github/workflows/error-rate-monitor.yml
name: Error Rate Monitor

on:
  # 프로덕션 배포 후 30분간 모니터링
  workflow_run:
    workflows: ["CI/CD Pipeline"]
    types: [completed]

jobs:
  monitor:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4

      - name: AWS 자격 증명 설정
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ap-northeast-2

      - name: 에러율 모니터링 (30분)
        run: |
          THRESHOLD=2  # 에러율 2% 초과 시 롤백
          CHECK_INTERVAL=180  # 3분마다 확인
          TOTAL_CHECKS=10     # 총 10회 = 30분

          for i in $(seq 1 $TOTAL_CHECKS); do
            ERROR_RATE=$(aws cloudwatch get-metric-statistics \
              --namespace "AWS/CloudFront" \
              --metric-name "5xxErrorRate" \
              --dimensions Name=DistributionId,Value="${{ vars.CF_DISTRIBUTION_ID }}" \
              --start-time "$(date -u -d '3 minutes ago' +%Y-%m-%dT%H:%M:%S)" \
              --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
              --period 180 \
              --statistics Average \
              --query 'Datapoints[0].Average // `0`' \
              --output text)

            echo "체크 ${i}/${TOTAL_CHECKS}: 에러율 ${ERROR_RATE}%"

            if (( $(echo "$ERROR_RATE > $THRESHOLD" | bc -l) )); then
              echo "에러율 임계값 초과! 롤백을 실행합니다."
              echo "ROLLBACK=true" >> "$GITHUB_ENV"
              break
            fi

            sleep $CHECK_INTERVAL
          done

      - name: 롤백 실행
        if: env.ROLLBACK == 'true'
        run: |
          echo "이전 버전으로 롤백합니다..."
          # S3에서 이전 버전 복원 (버전관리 활성화 필요)
          aws s3api list-object-versions \
            --bucket "${{ vars.S3_BUCKET }}" \
            --prefix "index.html" \
            --max-items 2 \
            --query 'Versions[1].VersionId' \
            --output text | xargs -I {} \
            aws s3api copy-object \
              --bucket "${{ vars.S3_BUCKET }}" \
              --copy-source "${{ vars.S3_BUCKET }}/index.html?versionId={}" \
              --key "index.html"

          # CloudFront 캐시 무효화
          aws cloudfront create-invalidation \
            --distribution-id "${{ vars.CF_DISTRIBUTION_ID }}" \
            --paths "/*"
```

### 6.3 수동 롤백 워크플로우

```yaml
# .github/workflows/rollback.yml
name: Manual Rollback

on:
  workflow_dispatch:
    inputs:
      reason:
        description: '롤백 사유'
        required: true
      target_version:
        description: '롤백 대상 커밋 SHA (비우면 직전 버전)'
        required: false

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.target_version || 'HEAD~1' }}

      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
        env:
          NODE_ENV: production
          NEXT_PUBLIC_ENV: production

      - name: 롤백 배포
        run: |
          aws s3 sync .next/ s3://${{ vars.S3_BUCKET }} --delete
          aws cloudfront create-invalidation \
            --distribution-id "${{ vars.CF_DISTRIBUTION_ID }}" \
            --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ap-northeast-2

      - name: 롤백 완료 알림
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "프로덕션 롤백 완료\n사유: ${{ inputs.reason }}\n실행자: ${{ github.actor }}"
            }
```

---

## 7. 시크릿 및 환경 변수 관리

민감한 정보는 코드에 절대 포함하지 않으며, GitHub의 시크릿 관리 기능을 활용합니다. 보안 관련 상세 가이드는 [06. 웹 보안 심화 가이드](./06_웹_보안_심화_가이드.md)를 참조하세요.

### 7.1 GitHub Secrets 계층 구조

```
Organization Secrets (조직 전체 공유)
├── SNYK_TOKEN
├── SLACK_WEBHOOK_URL
└── TURBO_TOKEN

Repository Secrets (리포지토리 전용)
├── AWS_DEPLOY_ROLE_ARN
└── SENTRY_AUTH_TOKEN

Environment Secrets (환경별 분리)
├── staging
│   ├── AWS_ACCESS_KEY_ID (staging용)
│   ├── AWS_SECRET_ACCESS_KEY (staging용)
│   └── DATABASE_URL (staging DB)
└── production
    ├── AWS_ACCESS_KEY_ID (production용)
    ├── AWS_SECRET_ACCESS_KEY (production용)
    └── DATABASE_URL (production DB)
```

### 7.2 환경별 변수 관리 (vars vs secrets)

| 구분 | `vars.*` (Variables) | `secrets.*` (Secrets) |
| :--- | :--- | :--- |
| 용도 | 공개 가능한 설정값 | 민감한 인증 정보 |
| 로그 노출 | 그대로 출력됨 | `***`로 마스킹 |
| 예시 | `API_URL`, `S3_BUCKET`, `CF_DIST_ID` | `AWS_SECRET_KEY`, `DB_PASSWORD` |
| 워크플로우에서 | `${{ vars.API_URL }}` | `${{ secrets.AWS_KEY }}` |

```yaml
# 올바른 환경 변수 사용 예시
steps:
  - name: 빌드
    run: bun run build
    env:
      # vars: 공개 가능한 설정 (Environment Variables에서 관리)
      NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}
      NEXT_PUBLIC_CDN_URL: ${{ vars.CDN_URL }}
      # secrets: 민감 정보 (Environment Secrets에서 관리)
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

### 7.3 시크릿 로테이션 자동화

```yaml
# .github/workflows/secret-rotation-reminder.yml
name: Secret Rotation Reminder

on:
  schedule:
    # 매월 1일 09:00 KST에 실행
    - cron: '0 0 1 * *'

jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - name: 시크릿 로테이션 알림
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "월간 시크릿 로테이션 알림\n\n점검 대상:\n- AWS IAM 키 (90일 초과 여부)\n- Snyk 토큰\n- Sentry Auth 토큰\n- Slack Webhook URL\n\n담당: DevOps 팀"
            }

      - name: AWS IAM 키 만료 확인
        run: |
          # IAM 키 생성일 확인 (90일 초과 시 경고)
          KEY_AGE=$(aws iam list-access-keys \
            --query 'AccessKeyMetadata[0].CreateDate' \
            --output text)
          echo "현재 IAM 키 생성일: ${KEY_AGE}"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

> **Best Practice**: AWS IAM 키 대신 **OIDC (OpenID Connect)** 를 사용하면 장기 자격 증명 없이 배포할 수 있습니다. `aws-actions/configure-aws-credentials@v4`의 `role-to-assume` 파라미터를 활용하세요.

---

## 8. CI 성능 최적화

CI 파이프라인 실행 시간이 길어지면 개발 생산성이 떨어집니다. 아래 전략으로 최적화하세요.

### 8.1 병렬 잡 전략

```
              ┌─ lint ──────────┐
push ────────►│                 ├──► build ──► deploy
              ├─ security-scan ─┤
              └─ test (4 shards)┘
```

- **독립적인 잡은 병렬 실행**: lint, security-scan, test를 동시에 실행
- **테스트 샤딩**: 테스트를 N개 샤드로 분할하여 병렬 실행 (위 1.1 참조)
- **`needs` 키워드**: 의존성이 있는 잡만 순차 실행

### 8.2 캐싱 전략 심화

```yaml
# 1. 의존성 캐시 — lockfile 해시 기반
- uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.bun/install/cache
    key: deps-${{ runner.os }}-${{ hashFiles('bun.lockb') }}
    restore-keys: deps-${{ runner.os }}-

# 2. 빌드 캐시 — 소스 코드 해시 기반
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: build-${{ runner.os }}-${{ hashFiles('src/**') }}
    restore-keys: build-${{ runner.os }}-

# 3. ESLint 캐시 — 개별 파일 변경 감지
- name: ESLint (캐시 활용)
  run: bun run lint --cache --cache-location .eslintcache

# 4. Playwright 브라우저 캐시
- uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('bun.lockb') }}
```

### 8.3 Self-Hosted Runner 활용

GitHub-hosted runner보다 빠른 빌드가 필요하거나 특수한 환경이 필요할 때 사용합니다.

```yaml
# self-hosted runner 사용 예시
jobs:
  build:
    # ARM64 macOS runner 또는 고성능 Linux runner
    runs-on: [self-hosted, linux, x64, high-memory]
    steps:
      - uses: actions/checkout@v4
      - run: bun install --frozen-lockfile
      - run: bun run build
```

| 비교 항목 | GitHub-hosted | Self-hosted |
| :--- | :--- | :--- |
| 시작 시간 | ~20초 (큐 대기 포함) | ~3초 (상시 대기) |
| CPU/메모리 | 4 vCPU / 16GB | 커스텀 가능 |
| 네트워크 | 공유 대역폭 | 전용 대역폭 |
| 비용 | 분당 과금 | EC2 인스턴스 비용 |
| 보안 | 격리된 VM | 직접 관리 필요 |

> **주의**: Self-hosted runner는 보안 관리 책임이 팀에 있습니다. 퍼블릭 리포지토리에서는 사용하지 마세요.

---

## 9. 주의사항 및 흔한 실수

### 9.1 시크릿 로그 노출

```yaml
# 절대 하지 마세요
- run: echo "Key is ${{ secrets.AWS_SECRET_ACCESS_KEY }}"

# 올바른 방법: 마스킹 확인
- run: |
    # GitHub Actions는 secrets.*을 자동 마스킹하지만,
    # 간접적으로 노출될 수 있으므로 주의
    echo "배포 대상: ${{ vars.S3_BUCKET }}"  # vars는 괜찮음
    # secrets는 env로만 전달하고 직접 출력하지 않기
  env:
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

**흔한 실수 패턴:**
- `curl` 명령의 `-v` 옵션으로 인증 헤더가 로그에 노출
- `printenv` 또는 `env` 명령으로 전체 환경 변수 출력
- 빌드 도구가 환경 변수를 번들에 포함 (`NEXT_PUBLIC_` 접두사 주의)

### 9.2 Flaky CI (불안정한 CI)

```yaml
# 불안정한 테스트 대응 전략

# 1. 자동 재시도 (최후의 수단)
test:
  runs-on: ubuntu-latest
  steps:
    - name: 테스트 실행 (최대 2회 재시도)
      uses: nick-fields/retry@v3
      with:
        timeout_minutes: 10
        max_attempts: 2
        command: bun run test
        # 재시도 시 이전 결과 정리
        on_retry_command: rm -rf test-results/

# 2. 타임아웃 설정으로 무한 대기 방지
jobs:
  test:
    timeout-minutes: 15  # 잡 레벨 타임아웃

# 3. Flaky 테스트 격리
# jest.config.ts에서 flaky 테스트를 별도 그룹으로 분리
# --testPathIgnorePatterns 으로 메인 CI에서 제외 후 별도 잡으로 실행
```

### 9.3 캐시 무효화 누락

```yaml
# 문제: 빌드는 성공했지만 사용자에게 이전 버전이 보임
# 원인: CloudFront 캐시 무효화를 빠뜨림

# 반드시 S3 업로드 후 캐시 무효화를 실행하세요
- name: 배포 및 캐시 무효화
  run: |
    # 1. S3에 새 파일 업로드
    aws s3 sync ./dist s3://${{ vars.S3_BUCKET }} --delete

    # 2. CloudFront 캐시 무효화 (필수!)
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
      --distribution-id "${{ vars.CF_DISTRIBUTION_ID }}" \
      --paths "/*" \
      --query 'Invalidation.Id' \
      --output text)

    # 3. 무효화 완료 대기 (선택, 최대 5분)
    aws cloudfront wait invalidation-completed \
      --distribution-id "${{ vars.CF_DISTRIBUTION_ID }}" \
      --id "$INVALIDATION_ID"

    echo "캐시 무효화 완료: ${INVALIDATION_ID}"
```

> 캐시 전략에 대한 자세한 내용은 [12. CloudFront 캐시 전략](./12_CloudFront_캐시_전략.md)을 참조하세요.

### 9.4 기타 흔한 실수

| 실수 | 영향 | 해결 |
| :--- | :--- | :--- |
| `bun install` 시 `--frozen-lockfile` 누락 | lockfile과 다른 버전 설치 | 항상 `--frozen-lockfile` 사용 |
| `fetch-depth: 0` 누락 | 변경 감지, git diff 실패 | 모노레포나 diff 필요 시 설정 |
| 아티팩트 `retention-days` 미설정 | 스토리지 비용 증가 | 빌드: 3일, 테스트: 7일 권장 |
| 환경별 시크릿 미분리 | staging에서 production DB 접근 | Environment Secrets 활용 |
| `concurrency` 그룹 미설정 | 동일 브랜치에서 중복 배포 | 워크플로우 상단에 설정 |

---

## 10. AI와 함께하는 파이프라인 개선

AI(Claude Code)에게 워크플로우 최적화를 요청하세요.

> **Prompt**: "우리 프로젝트의 GitHub Actions 워크플로우 파일이 너무 느려. 빌드 아티팩트를 재사용하고, 캐시 적중률을 높이며, 병렬로 실행할 수 있는 단계를 분리하여 전체 배포 시간을 30% 이상 단축하는 최적화된 YAML 파일을 작성해줘."

> **Prompt**: "현재 CI 파이프라인에 카나리 배포를 추가하고 싶어. Route 53 가중치 라우팅과 CloudWatch 에러율 기반 자동 롤백을 포함한 완전한 워크플로우를 작성해줘."

---

## ✅ 체크리스트

### CI 파이프라인 기본
- [ ] lint → test → build → deploy 단계가 올바른 순서로 실행되고 있나요?
- [ ] 테스트와 빌드 과정이 병렬로 실행되고 있나요?
- [ ] `bun.lockb` 해시 기반으로 `node_modules` 캐싱이 설정되어 있나요?
- [ ] `.next/cache` 빌드 캐시가 활성화되어 있나요?
- [ ] 테스트 샤딩으로 실행 시간을 분산하고 있나요?
- [ ] `concurrency` 그룹으로 중복 실행을 방지하고 있나요?
- [ ] 잡과 스텝에 적절한 `timeout-minutes`가 설정되어 있나요?

### 환경 관리 및 배포
- [ ] 프로덕션 배포 시 **관리자의 수동 승인** 절차가 포함되어 있나요?
- [ ] GitHub Environments로 환경별 시크릿이 분리되어 있나요?
- [ ] 프로덕션 Environment에 배포 브랜치 제한(main only)이 걸려 있나요?
- [ ] 카나리 배포로 점진적 트래픽 전환이 가능한가요?

### 보안 및 품질
- [ ] Snyk 등 보안 스캔 단계가 포함되어 있나요?
- [ ] 번들 크기 제한(size-limit)이 설정되어 있나요?
- [ ] Lighthouse CI로 성능 예산을 검증하고 있나요?
- [ ] 시크릿이 로그에 노출되지 않도록 검증했나요?
- [ ] AWS IAM 키 대신 OIDC 인증을 사용하고 있나요?

### 안정성
- [ ] 배포 실패 시 즉시 이전 버전으로 **자동 롤백**할 수 있는 체계가 있나요?
- [ ] 에러율 기반 모니터링이 배포 후 자동으로 실행되나요?
- [ ] 수동 롤백 워크플로우가 준비되어 있나요?
- [ ] CloudFront 캐시 무효화가 배포 스텝에 포함되어 있나요?
- [ ] Flaky 테스트가 식별되고 격리되어 있나요?

### 모노레포 (해당 시)
- [ ] 변경된 패키지만 빌드/테스트하고 있나요?
- [ ] Turborepo 원격 캐시가 활성화되어 있나요?
- [ ] 공유 패키지 변경 시 의존하는 앱도 함께 빌드되나요?
