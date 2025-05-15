# CI/CD 파이프라인 구축 가이드 (2025-2026)

## 목차
1. [CI/CD 개요](#cicd-개요)
2. [GitHub Actions로 CI/CD 구축](#github-actions로-cicd-구축)
3. [GitHub Actions 최신 기능 (2025-2026)](#github-actions-최신-기능-2025-2026)
4. [빌드 & 배포](#빌드--배포)
5. [컨테이너 기반 CI/CD](#컨테이너-기반-cicd)
6. [고급 워크플로우](#고급-워크플로우)
7. [E2E 테스트 통합](#e2e-테스트-통합)
8. [시맨틱 버저닝 & 릴리즈](#시맨틱-버저닝--릴리즈)
9. [모노레포 CI/CD](#모노레포-cicd)
10. [캐싱 전략](#캐싱-전략)
11. [보안 스캔 (SAST & 의존성 감사)](#보안-스캔-sast--의존성-감사)
12. [배포 승인 프로세스](#배포-승인-프로세스)
13. [현대적 배포 전략](#현대적-배포-전략)
14. [성능 모니터링](#성능-모니터링)
15. [Best Practices](#best-practices)
16. [체크리스트](#체크리스트)

---

## CI/CD 개요

### CI (Continuous Integration)
코드 변경사항을 자동으로 빌드하고 테스트하는 프로세스

### CD (Continuous Deployment/Delivery)
검증된 코드를 자동으로 프로덕션에 배포하는 프로세스

### CI/CD 파이프라인 흐름도

```
Code Push -> Lint/Type Check -> Unit Test -> Build -> Security Scan
    |                                                       |
    v                                                       v
Integration Test -> E2E Test -> Staging Deploy -> Approval -> Production Deploy
                                                                    |
                                                              Canary / Blue-Green
                                                                    |
                                                              Monitor & Verify
```

---

## GitHub Actions로 CI/CD 구축

### 기본 워크플로우

**.github/workflows/ci.yml**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm run test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/coverage-final.json
```

---

## GitHub Actions 최신 기능 (2025-2026)

### 1. 재사용 가능한 워크플로우 (Reusable Workflows) - 고급 패턴

조직 전체에서 공유하는 표준화된 워크플로우를 정의하고 호출할 수 있다.

**.github/workflows/reusable-ci.yml**
```yaml
name: Reusable CI Pipeline

on:
  workflow_call:
    inputs:
      node-version:
        description: 'Node.js version'
        required: false
        type: string
        default: '22'
      working-directory:
        description: 'Working directory for the project'
        required: false
        type: string
        default: '.'
      run-e2e:
        description: 'Whether to run E2E tests'
        required: false
        type: boolean
        default: false
    secrets:
      CODECOV_TOKEN:
        required: false
      NPM_TOKEN:
        required: false
    outputs:
      build-artifact-id:
        description: 'The ID of the uploaded build artifact'
        value: ${{ jobs.build.outputs.artifact-id }}

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v4
        if: inputs.working-directory == '.'
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build:
    runs-on: ubuntu-latest
    needs: test
    outputs:
      artifact-id: ${{ steps.upload.outputs.artifact-id }}
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Upload build artifact
        id: upload
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: ${{ inputs.working-directory }}/dist
```

**호출하는 워크플로우**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    uses: ./.github/workflows/reusable-ci.yml
    with:
      node-version: '22'
      run-e2e: ${{ github.event_name == 'push' }}
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

  # 재사용 워크플로우 출력값 활용
  deploy:
    needs: ci
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: build-output
      - name: Deploy
        run: echo "Deploying artifact..."
```

### 2. Composite Actions (커스텀 액션)

반복되는 스텝 묶음을 하나의 커스텀 액션으로 추출하여 재사용한다.

**.github/actions/setup-project/action.yml**
```yaml
name: 'Setup Project'
description: 'Node.js 설정, 의존성 설치, 캐시 복원을 수행한다'

inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '22'

runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'

    - name: Install dependencies
      shell: bash
      run: npm ci

    - name: Restore build cache
      uses: actions/cache@v4
      with:
        path: |
          .next/cache
          node_modules/.cache
        key: ${{ runner.os }}-build-${{ hashFiles('**/*.ts', '**/*.tsx') }}
        restore-keys: |
          ${{ runner.os }}-build-
```

**사용**
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup-project
    with:
      node-version: '22'
  - run: npm run build
```

### 3. 워크플로우 동시성 제어 (Concurrency)

동일 브랜치에서 중복 실행을 방지하여 리소스를 절약한다.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # 이전 실행이 아직 진행 중이면 자동으로 취소된다
```

### 4. 대형 러너 및 GPU 러너

성능이 중요한 작업에 대형 러너를 활용할 수 있다.

```yaml
jobs:
  heavy-build:
    # GitHub-hosted larger runners (Team/Enterprise 플랜)
    runs-on: ubuntu-latest-16-cores
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      # 대형 러너로 빌드 시간을 크게 단축

  # ARM 러너도 지원
  arm-build:
    runs-on: ubuntu-24.04-arm
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
```

### 5. 환경(Environments)과 배포 보호 규칙

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - run: echo "Deploying to staging..."

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    # production 환경에 설정된 보호 규칙이 자동 적용된다:
    # - 필수 리뷰어 승인
    # - 대기 타이머 (예: 15분)
    # - 특정 브랜치만 배포 허용
    steps:
      - run: echo "Deploying to production..."
```

---

## 빌드 & 배포

### Vercel 자동 배포

**.github/workflows/deploy.yml**
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      
      - name: Install Vercel CLI
        run: npm install -g vercel
      
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### AWS S3 + CloudFront 배포

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.API_URL }}
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2
      
      - name: Deploy to S3
        run: aws s3 sync ./dist s3://${{ secrets.S3_BUCKET }} --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

---

## 컨테이너 기반 CI/CD

### 1. Docker 레이어 캐싱을 활용한 CI

Docker 멀티스테이지 빌드와 레이어 캐싱으로 빌드 시간을 대폭 단축한다.

**Dockerfile (멀티스테이지 빌드)**
```dockerfile
# Stage 1: Dependencies (캐시 레이어)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**.github/workflows/docker-ci.yml**
```yaml
name: Container CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix=
            type=semver,pattern={{version}}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64
```

### 2. Service Container를 활용한 통합 테스트

CI에서 데이터베이스 등 외부 의존성을 서비스 컨테이너로 구동한다.

```yaml
jobs:
  integration-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
```

### 3. Docker Compose 기반 로컬-CI 일관성

```yaml
# docker-compose.ci.yml
services:
  app:
    build:
      context: .
      target: builder
    command: npm run test
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgresql://testuser:testpass@db:5432/testdb
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: testdb
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U testuser']
      interval: 5s
      timeout: 5s
      retries: 5
```

```yaml
# CI 워크플로우에서 사용
- name: Run tests with Docker Compose
  run: docker compose -f docker-compose.ci.yml up --abort-on-container-exit --exit-code-from app
```

---

## 고급 워크플로우

### 1. 멀티 환경 배포

```yaml
name: Multi-Environment Deploy

on:
  push:
    branches:
      - main        # Production
      - develop     # Staging
      - 'feature/*' # Preview

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Determine environment
        id: env
        run: |
          if [[ $GITHUB_REF == 'refs/heads/main' ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          elif [[ $GITHUB_REF == 'refs/heads/develop' ]]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
          else
            echo "environment=preview" >> $GITHUB_OUTPUT
          fi
      
      - name: Deploy to ${{ steps.env.outputs.environment }}
        run: |
          echo "Deploying to ${{ steps.env.outputs.environment }}"
          # 환경별 배포 로직
```

### 2. Docker 빌드 & 배포

```yaml
name: Docker Build & Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          # GitHub Actions 캐시를 활용한 Docker 레이어 캐싱
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USERNAME }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            docker stop myapp || true
            docker rm myapp || true
            docker run -d --name myapp -p 3000:3000 ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

### 3. Lighthouse CI

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

---

## E2E 테스트 통합

### Playwright CI

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## 시맨틱 버저닝 & 릴리즈

### Semantic Release

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      
      - name: Install dependencies
        run: npm ci
      
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

**package.json 설정**
```json
{
  "scripts": {
    "semantic-release": "semantic-release"
  },
  "devDependencies": {
    "@semantic-release/changelog": "^6.0.3",
    "@semantic-release/git": "^10.0.1",
    "semantic-release": "^21.0.0"
  },
  "release": {
    "branches": ["main"],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/changelog",
      "@semantic-release/npm",
      "@semantic-release/github",
      "@semantic-release/git"
    ]
  }
}
```

---

## 모노레포 CI/CD

### Turborepo + GitHub Actions

```yaml
name: Monorepo CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npx turbo run build
      
      - name: Test
        run: npx turbo run test
      
      - name: Lint
        run: npx turbo run lint
```

**변경된 패키지만 빌드**
```yaml
- name: Build changed packages
  run: |
    npx turbo run build --filter=...[origin/main]
```

---

## 캐싱 전략

### 의존성 캐싱

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: 'npm' # 자동 캐싱

- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### 빌드 캐싱

```yaml
- name: Cache build output
  uses: actions/cache@v4
  with:
    path: |
      .next/cache
      dist
    key: ${{ runner.os }}-build-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-build-
```

---

## 보안 스캔 (SAST & 의존성 감사)

CI 파이프라인에 보안 스캔을 통합하여 취약점을 조기에 발견한다.

### 1. 통합 보안 파이프라인

```yaml
name: Security Pipeline

on:
  schedule:
    - cron: '0 0 * * 1' # 매주 월요일 정기 스캔
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  # 의존성 취약점 검사
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: npm audit
        run: npm audit --audit-level=high

      - name: Run Snyk (의존성 취약점)
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --sarif-file-output=snyk.sarif

      - name: Upload Snyk SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: snyk.sarif

  # SAST (정적 애플리케이션 보안 테스트)
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-extended

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: '/language:javascript-typescript'

  # 시크릿 유출 탐지
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect secrets with Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # 컨테이너 이미지 취약점 스캔
  container-scan:
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Build image for scanning
        run: docker build -t app:scan .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'app:scan'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

  # 라이선스 호환성 검사
  license-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - name: Check licenses
        run: |
          npx license-checker --failOn "GPL-2.0;GPL-3.0;AGPL-1.0;AGPL-3.0" --summary
```

### 2. PR에 보안 리포트 자동 코멘트

```yaml
  security-report:
    needs: [dependency-audit, sast, secret-scan]
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Post security summary
        uses: actions/github-script@v7
        with:
          script: |
            const { data: checks } = await github.rest.checks.listForRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.payload.pull_request.head.sha,
            });

            const securityChecks = checks.check_runs.filter(c =>
              ['dependency-audit', 'sast', 'secret-scan'].some(name =>
                c.name.includes(name)
              )
            );

            const summary = securityChecks.map(c =>
              `| ${c.name} | ${c.conclusion === 'success' ? 'PASS' : 'FAIL'} |`
            ).join('\n');

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: `## Security Scan Results\n\n| Check | Status |\n|-------|--------|\n${summary}`
            });
```

### 3. Dependabot 설정

**.github/dependabot.yml**
```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    reviewers:
      - 'team-security'
    labels:
      - 'dependencies'
      - 'security'
    groups:
      dev-dependencies:
        dependency-type: 'development'
      production-dependencies:
        dependency-type: 'production'

  - package-ecosystem: 'docker'
    directory: '/'
    schedule:
      interval: 'weekly'

  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
```

---

## 배포 승인 프로세스

### Manual Approval

```yaml
name: Deploy with Approval

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist

  approval:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - name: Wait for approval
        run: echo "Deployment approved"

  deploy:
    needs: approval
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: build
      - name: Deploy
        run: echo "Deploying to production"
```

---

## 현대적 배포 전략

### 1. Canary 배포

전체 트래픽의 일부(예: 10%)에만 새 버전을 배포하고, 안정성을 확인한 후 점진적으로 확대한다.

```yaml
name: Canary Deployment

on:
  push:
    branches: [main]

jobs:
  canary-deploy:
    runs-on: ubuntu-latest
    environment:
      name: production-canary

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/setup-kubectl@v4

      - name: Deploy canary (10% traffic)
        run: |
          # Canary Deployment 생성
          kubectl apply -f - <<EOF
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: myapp-canary
            labels:
              app: myapp
              track: canary
          spec:
            replicas: 1
            selector:
              matchLabels:
                app: myapp
                track: canary
            template:
              metadata:
                labels:
                  app: myapp
                  track: canary
              spec:
                containers:
                - name: myapp
                  image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          EOF

      - name: Monitor canary metrics
        run: |
          # 5분간 에러율 모니터링
          for i in $(seq 1 10); do
            ERROR_RATE=$(kubectl exec deploy/prometheus -- \
              promtool query instant 'rate(http_requests_total{status=~"5.."}[1m]) / rate(http_requests_total[1m])')
            echo "Check $i/10: Error rate = $ERROR_RATE"
            if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
              echo "::error::High error rate detected: $ERROR_RATE"
              exit 1
            fi
            sleep 30
          done

      - name: Promote to full rollout
        if: success()
        run: |
          kubectl set image deployment/myapp myapp=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          kubectl rollout status deployment/myapp --timeout=300s
          kubectl delete deployment myapp-canary

      - name: Rollback canary
        if: failure()
        run: |
          kubectl delete deployment myapp-canary
          echo "::warning::Canary deployment rolled back due to high error rate"

  notify:
    needs: canary-deploy
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        uses: actions/github-script@v7
        with:
          script: |
            const status = '${{ needs.canary-deploy.result }}';
            const emoji = status === 'success' ? 'SUCCESS' : 'FAILED';
            console.log(`Canary deployment ${emoji}`);
```

### 2. Blue-Green 배포

두 개의 동일한 환경(Blue/Green)을 운영하며 트래픽을 한 번에 전환한다.

```yaml
name: Blue-Green Deployment

on:
  push:
    branches: [main]

jobs:
  blue-green-deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com

    steps:
      - uses: actions/checkout@v4

      - name: Determine active environment
        id: env
        run: |
          # 현재 활성 환경 확인 (blue 또는 green)
          ACTIVE=$(kubectl get service myapp-active -o jsonpath='{.spec.selector.slot}')
          if [ "$ACTIVE" = "blue" ]; then
            echo "target=green" >> $GITHUB_OUTPUT
            echo "current=blue" >> $GITHUB_OUTPUT
          else
            echo "target=blue" >> $GITHUB_OUTPUT
            echo "current=green" >> $GITHUB_OUTPUT
          fi

      - name: Deploy to inactive slot (${{ steps.env.outputs.target }})
        run: |
          kubectl set image deployment/myapp-${{ steps.env.outputs.target }} \
            myapp=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          kubectl rollout status deployment/myapp-${{ steps.env.outputs.target }} --timeout=300s

      - name: Run smoke tests on inactive slot
        run: |
          TARGET_URL=$(kubectl get service myapp-${{ steps.env.outputs.target }} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
          curl -f "$TARGET_URL/health" || exit 1

      - name: Switch traffic to ${{ steps.env.outputs.target }}
        run: |
          # 트래픽을 새 환경으로 전환
          kubectl patch service myapp-active -p \
            '{"spec":{"selector":{"slot":"${{ steps.env.outputs.target }}"}}}'

      - name: Verify and keep old version for rollback
        run: |
          echo "Previous version (${{ steps.env.outputs.current }}) is kept for instant rollback"
          echo "To rollback: kubectl patch service myapp-active -p '{\"spec\":{\"selector\":{\"slot\":\"${{ steps.env.outputs.current }}\"}}}''"
```

### 3. Feature Flags를 활용한 점진적 릴리즈

배포와 릴리즈를 분리하여 코드는 배포하되 기능 활성화는 Feature Flag로 제어한다.

```typescript
// feature-flags.ts - Feature Flag 클라이언트 구현
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  allowedUsers?: string[];
  metadata?: Record<string, unknown>;
}

class FeatureFlagClient {
  private flags: Map<string, FeatureFlag> = new Map();

  async initialize(): Promise<void> {
    // 환경변수 또는 원격 설정에서 플래그 로드
    const response = await fetch(
      process.env.FEATURE_FLAG_URL ?? '/api/feature-flags'
    );
    const flags: FeatureFlag[] = await response.json();
    flags.forEach(flag => this.flags.set(flag.name, flag));
  }

  isEnabled(flagName: string, userId?: string): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // 특정 사용자 허용 목록
    if (userId && flag.allowedUsers?.includes(userId)) {
      return true;
    }

    // 비율 기반 롤아웃
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(userId ?? 'anonymous');
      return (hash % 100) < flag.rolloutPercentage;
    }

    return true;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

export const featureFlags = new FeatureFlagClient();
```

```typescript
// 사용 예시 - React 컴포넌트
import { featureFlags } from './feature-flags';

function Dashboard({ userId }: { userId: string }) {
  const showNewDashboard = featureFlags.isEnabled('new-dashboard-v2', userId);

  if (showNewDashboard) {
    return <NewDashboardV2 />;
  }
  return <LegacyDashboard />;
}
```

**CI/CD에서 Feature Flag 연동**
```yaml
name: Deploy with Feature Flags

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy application
        run: |
          # 코드를 배포하되 새 기능은 Feature Flag로 비활성화 상태
          npm run build
          npm run deploy

      - name: Enable feature for internal users
        run: |
          # 내부 테스터에게만 새 기능 활성화
          curl -X PATCH "$FEATURE_FLAG_API/flags/new-dashboard-v2" \
            -H "Authorization: Bearer ${{ secrets.FF_API_TOKEN }}" \
            -d '{"enabled": true, "rolloutPercentage": 0, "allowedUsers": ["internal-tester-1", "internal-tester-2"]}'

      - name: Gradual rollout (10%)
        run: |
          # 검증 후 10% 사용자에게 확대
          curl -X PATCH "$FEATURE_FLAG_API/flags/new-dashboard-v2" \
            -H "Authorization: Bearer ${{ secrets.FF_API_TOKEN }}" \
            -d '{"rolloutPercentage": 10}'

  full-rollout:
    needs: deploy
    runs-on: ubuntu-latest
    environment:
      name: feature-rollout
    steps:
      - name: Full rollout (100%)
        run: |
          # 수동 승인 후 전체 사용자에게 활성화
          curl -X PATCH "$FEATURE_FLAG_API/flags/new-dashboard-v2" \
            -H "Authorization: Bearer ${{ secrets.FF_API_TOKEN }}" \
            -d '{"rolloutPercentage": 100}'
```

### 배포 전략 비교

| 전략 | 다운타임 | 롤백 속도 | 리소스 비용 | 적합한 경우 |
|------|---------|----------|-----------|------------|
| Rolling Update | 없음 | 보통 (분) | 낮음 | 일반적인 배포 |
| Canary | 없음 | 빠름 (초) | 중간 | 위험도 높은 변경 |
| Blue-Green | 없음 | 즉시 | 높음 (2배) | 무중단 필수 서비스 |
| Feature Flag | 없음 | 즉시 | 낮음 | 기능 단위 릴리즈 |

---

## 성능 모니터링

### Bundle Size Check

```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main]

jobs:
  size-check:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Check bundle size
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          skip_step: install
```

**size-limit 설정**
```json
{
  "size-limit": [
    {
      "path": "dist/**/*.js",
      "limit": "500 KB"
    }
  ]
}
```

---

## Best Practices

### 1. 환경 변수 관리

```yaml
# ✅ Good: Secrets 사용
- name: Build
  env:
    API_URL: ${{ secrets.API_URL }}
    API_KEY: ${{ secrets.API_KEY }}
  run: npm run build

# ❌ Bad: 하드코딩
- name: Build
  env:
    API_URL: https://api.example.com
  run: npm run build
```

### 2. 조건부 실행

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: npm run deploy
```

### 3. 파이프라인 실행 시간 최적화

```yaml
jobs:
  # 병렬 실행으로 전체 파이프라인 시간 단축
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
      - run: npm run test -- --coverage

  # 모든 검증이 통과한 후에만 빌드
  build:
    needs: [lint, typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
      - run: npm run build
```

### 4. 실패 알림 및 모니터링

```yaml
  notify-failure:
    needs: [lint, typecheck, test, build]
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Notify via Slack
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "CI Pipeline Failed: ${{ github.repository }} (${{ github.ref_name }})\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}\nRun: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
```

### 5. 변경된 파일에 따른 조건부 실행

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.changes.outputs.frontend }}
      backend: ${{ steps.changes.outputs.backend }}
      docs: ${{ steps.changes.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            frontend:
              - 'src/frontend/**'
              - 'package.json'
            backend:
              - 'src/backend/**'
              - 'api/**'
            docs:
              - 'docs/**'

  frontend-ci:
    needs: detect-changes
    if: needs.detect-changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run test:frontend

  backend-ci:
    needs: detect-changes
    if: needs.detect-changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run test:backend
```

---

## 체크리스트

### CI 필수 항목
- [ ] Linting (ESLint)
- [ ] Type checking (TypeScript)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] 코드 커버리지
- [ ] 동시성 제어 (중복 실행 방지)
- [ ] 변경 파일 기반 조건부 실행

### CD 필수 항목
- [ ] 자동 빌드
- [ ] 환경별 배포 (dev, staging, production)
- [ ] 배포 승인 프로세스 (Environment protection rules)
- [ ] 롤백 전략 (Blue-Green / Canary)
- [ ] 모니터링 & 알림
- [ ] Feature Flag 기반 점진적 릴리즈
- [ ] 배포 후 Smoke Test 자동화

### 보안
- [ ] Secrets 관리 (GitHub Environments)
- [ ] 의존성 취약점 검사 (npm audit, Snyk)
- [ ] SAST 정적 코드 분석 (CodeQL)
- [ ] 시크릿 유출 탐지 (Gitleaks)
- [ ] 컨테이너 이미지 스캔 (Trivy)
- [ ] 라이선스 호환성 검사
- [ ] Dependabot 자동 업데이트
- [ ] 접근 권한 관리 (최소 권한 원칙)

### 컨테이너 & 인프라
- [ ] Docker 멀티스테이지 빌드
- [ ] Docker 레이어 캐싱 (GHA Cache)
- [ ] 멀티 아키텍처 빌드 (amd64, arm64)
- [ ] 재사용 가능한 워크플로우 (Reusable Workflows)
- [ ] Composite Actions로 중복 제거

---

## 참고 자료

- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [GitHub Actions - Reusable Workflows](https://docs.github.com/en/actions/sharing-automations/reusing-workflows)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [CodeQL Analysis](https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/codeql-code-scanning-for-compiled-languages)
- [Trivy Container Scanner](https://aquasecurity.github.io/trivy/)
- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [CircleCI](https://circleci.com/docs/)
