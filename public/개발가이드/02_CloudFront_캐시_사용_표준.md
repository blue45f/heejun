# CloudFront 캐시 사용 표준 -- AI 활용 극대화 + 멀티 베타 환경

## 목차

1. [멀티 베타 환경 CDN 아키텍처](#1-멀티-베타-환경-cdn-아키텍처)
2. [환경별 독립 캐시: 동적 S3 오리진 + CloudFront Behavior 자동 생성 (CDK)](#2-환경별-독립-캐시-동적-s3-오리진--cloudfront-behavior-자동-생성-cdk)
3. [PR별 Preview 환경 CDN 자동 프로비저닝/정리 (GitHub Actions + CDK)](#3-pr별-preview-환경-cdn-자동-프로비저닝정리-github-actions--cdk)
4. [환경별 캐시 키 네임스페이스 분리 패턴](#4-환경별-캐시-키-네임스페이스-분리-패턴)
5. [AI 프롬프트 5선](#5-ai-프롬프트-5선)
6. [CloudFront Functions: 멀티 베타 라우팅](#6-cloudfront-functions-멀티-베타-라우팅)
7. [Origin Shield + 멀티 베타 최적화](#7-origin-shield--멀티-베타-최적화)
8. [실시간 로그 분석 파이프라인](#8-실시간-로그-분석-파이프라인)
9. [체크리스트](#9-체크리스트)
10. [참고 자료](#10-참고-자료)

---

## 1. 멀티 베타 환경 CDN 아키텍처

N개의 베타 환경과 PR별 Preview 환경이 공존하는 구조에서, 각 환경이 독립된 캐시 공간을 가지면서도 인프라 비용을 최소화하는 것이 핵심이다.

### 1.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│                   CloudFront Distribution            │
│                                                     │
│  Behavior: /beta-1/*  → S3: app-beta-1/             │
│  Behavior: /beta-2/*  → S3: app-beta-2/             │
│  Behavior: /beta-N/*  → S3: app-beta-N/             │
│  Behavior: /pr-123/*  → S3: app-preview/pr-123/     │
│  Behavior: /pr-456/*  → S3: app-preview/pr-456/     │
│  Behavior: /*         → S3: app-production/         │
│                                                     │
│  Cache Policy: 환경별 네임스페이스 분리               │
│  CloudFront Function: 환경 라우팅 + 캐시 키 주입     │
└─────────────────────────────────────────────────────┘
```

### 1.2 환경 구분 전략

| 환경 유형 | 경로 패턴 | S3 버킷/접두사 | 캐시 TTL | 생명주기 |
|-----------|----------|---------------|---------|---------|
| Production | `/*` | `app-production/` | 1년 (immutable assets) | 영구 |
| Beta N | `/beta-{n}/*` | `app-beta-{n}/` | 1시간 | 반영구 |
| PR Preview | `/pr-{number}/*` | `app-preview/pr-{number}/` | 5분 | PR 머지/종료 시 자동 삭제 |

---

## 2. 환경별 독립 캐시: 동적 S3 오리진 + CloudFront Behavior 자동 생성 (CDK)

### 2.1 멀티 베타 CDK 스택

```typescript
// infra/lib/multi-beta-cdn-stack.ts
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

interface BetaEnvironment {
  name: string;
  bucketName: string;
  cacheTtlSeconds: number;
}

interface MultiBetaCdnStackProps extends cdk.StackProps {
  productionBucketName: string;
  previewBucketName: string;
  betaEnvironments: BetaEnvironment[];
  domainName: string;
}

export class MultiBetaCdnStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: MultiBetaCdnStackProps) {
    super(scope, id, props);

    // Production 오리진
    const productionBucket = s3.Bucket.fromBucketName(
      this, "ProductionBucket", props.productionBucketName,
    );
    const productionOrigin = origins.S3BucketOrigin.withOriginAccessControl(productionBucket);

    // Preview 오리진 (PR별 접두사로 분리)
    const previewBucket = s3.Bucket.fromBucketName(
      this, "PreviewBucket", props.previewBucketName,
    );
    const previewOrigin = origins.S3BucketOrigin.withOriginAccessControl(previewBucket);

    // 캐시 정책: 환경별
    const betaCachePolicy = new cloudfront.CachePolicy(this, "BetaCachePolicy", {
      cachePolicyName: "MultiBeta-CachePolicy",
      defaultTtl: cdk.Duration.hours(1),
      maxTtl: cdk.Duration.hours(24),
      minTtl: cdk.Duration.minutes(1),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        "X-Beta-Environment",
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const previewCachePolicy = new cloudfront.CachePolicy(this, "PreviewCachePolicy", {
      cachePolicyName: "Preview-CachePolicy",
      defaultTtl: cdk.Duration.minutes(5),
      maxTtl: cdk.Duration.minutes(30),
      minTtl: cdk.Duration.seconds(0),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const immutableCachePolicy = new cloudfront.CachePolicy(this, "ImmutableCachePolicy", {
      cachePolicyName: "Immutable-CachePolicy",
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // 환경 라우팅 CloudFront Function
    const routingFunction = new cloudfront.Function(this, "BetaRoutingFunction", {
      code: cloudfront.FunctionCode.fromInline(buildRoutingFunctionCode()),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: "멀티 베타 환경 라우팅 + 캐시 키 네임스페이스 주입",
    });

    // Distribution 기본 behavior (Production)
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: productionOrigin,
        cachePolicy: immutableCachePolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [{
          function: routingFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      domainNames: [props.domainName],
      httpVersion: cloudfront.HttpVersion.HTTP3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Beta 환경별 Behavior 동적 생성
    for (const beta of props.betaEnvironments) {
      const betaBucket = s3.Bucket.fromBucketName(
        this, `BetaBucket-${beta.name}`, beta.bucketName,
      );

      this.distribution.addBehavior(`/beta-${beta.name}/*`,
        origins.S3BucketOrigin.withOriginAccessControl(betaBucket), {
          cachePolicy: betaCachePolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [{
            function: routingFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }],
        },
      );
    }

    // Preview 환경 Behavior (와일드카드)
    this.distribution.addBehavior("/pr-*/*", previewOrigin, {
      cachePolicy: previewCachePolicy,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: [{
        function: routingFunction,
        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
      }],
    });

    // Outputs
    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
    });
    new cdk.CfnOutput(this, "DistributionDomain", {
      value: this.distribution.distributionDomainName,
    });
  }
}

function buildRoutingFunctionCode(): string {
  return `
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // 환경 식별: /beta-{name}/... 또는 /pr-{number}/...
  var envMatch = uri.match(/^\\/(beta-[a-z0-9-]+|pr-[0-9]+)\\//);
  if (envMatch) {
    var envName = envMatch[1];
    // 캐시 키 네임스페이스 헤더 주입
    request.headers['x-beta-environment'] = { value: envName };
    // 오리진 경로에서 환경 접두사 제거
    request.uri = uri.substring(envMatch[0].length - 1);
  }

  // SPA fallback: 확장자가 없으면 index.html
  if (!uri.includes('.')) {
    request.uri = '/index.html';
  }

  return request;
}`;
}
```

### 2.2 CDK 앱 엔트리포인트

```typescript
// infra/bin/app.ts
import * as cdk from "aws-cdk-lib";
import { MultiBetaCdnStack } from "../lib/multi-beta-cdn-stack";

const app = new cdk.App();

const betaEnvCount = parseInt(app.node.tryGetContext("betaEnvCount") ?? "3", 10);

const betaEnvironments = Array.from({ length: betaEnvCount }, (_, i) => ({
  name: `${i + 1}`,
  bucketName: `my-app-beta-${i + 1}`,
  cacheTtlSeconds: 3600,
}));

new MultiBetaCdnStack(app, "MultiBetaCdnStack", {
  productionBucketName: "my-app-production",
  previewBucketName: "my-app-preview",
  betaEnvironments,
  domainName: "app.example.com",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
```

---

## 3. PR별 Preview 환경 CDN 자동 프로비저닝/정리 (GitHub Actions + CDK)

### 3.1 PR Open/Update 시 Preview 배포

```yaml
# .github/workflows/preview-deploy.yml
name: Preview Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  id-token: write
  contents: read
  pull-requests: write

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build with preview base path
        run: pnpm build
        env:
          VITE_BASE_PATH: /pr-${{ github.event.pull_request.number }}/
          VITE_ENV_LABEL: "PR #${{ github.event.pull_request.number }}"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ap-northeast-2

      - name: Deploy to S3 preview prefix
        run: |
          aws s3 sync dist/ \
            s3://${{ vars.PREVIEW_BUCKET }}/pr-${{ github.event.pull_request.number }}/ \
            --delete \
            --cache-control "public, max-age=300"

      - name: Invalidate CloudFront preview path
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CF_DISTRIBUTION_ID }} \
            --paths "/pr-${{ github.event.pull_request.number }}/*"

      - name: Comment preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request.number;
            const previewUrl = `https://${{ vars.CDN_DOMAIN }}/pr-${prNumber}/`;
            const body = `## Preview 환경\n\n| 항목 | 값 |\n|------|----|\n| URL | ${previewUrl} |\n| PR | #${prNumber} |\n| Commit | \`${context.sha.slice(0, 8)}\` |\n\n이 환경은 PR이 머지/종료되면 자동으로 정리됩니다.`;

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber,
            });
            const existing = comments.find(c => c.body?.includes('## Preview 환경'));
            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body,
              });
            }
```

### 3.2 PR 종료 시 Preview 자동 정리

```yaml
# .github/workflows/preview-cleanup.yml
name: Preview Cleanup

on:
  pull_request:
    types: [closed]

permissions:
  id-token: write
  contents: read

jobs:
  cleanup-preview:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ap-northeast-2

      - name: Remove preview assets from S3
        run: |
          aws s3 rm \
            s3://${{ vars.PREVIEW_BUCKET }}/pr-${{ github.event.pull_request.number }}/ \
            --recursive

      - name: Invalidate CloudFront to purge cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CF_DISTRIBUTION_ID }} \
            --paths "/pr-${{ github.event.pull_request.number }}/*"

      - name: Log cleanup
        run: |
          echo "Preview environment for PR #${{ github.event.pull_request.number }} cleaned up."
```

### 3.3 Preview 환경 만료 자동 정리 (스케줄 기반)

```typescript
// scripts/cleanup-stale-previews.ts
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

interface PreviewEnvironment {
  prNumber: number;
  prefix: string;
  lastModified: Date;
  objectCount: number;
}

interface CleanupConfig {
  previewBucket: string;
  distributionId: string;
  maxAgeDays: number;
  region: string;
}

async function listPreviewEnvironments(
  s3: S3Client,
  bucket: string,
): Promise<PreviewEnvironment[]> {
  const environments = new Map<number, PreviewEnvironment>();

  let continuationToken: string | undefined;
  do {
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "pr-",
      Delimiter: "/",
      ContinuationToken: continuationToken,
    }));

    for (const prefix of response.CommonPrefixes ?? []) {
      const match = prefix.Prefix?.match(/^pr-(\d+)\/$/);
      if (!match) continue;

      const prNumber = parseInt(match[1], 10);
      const objects = await s3.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix.Prefix,
        MaxKeys: 1,
      }));

      const lastModified = objects.Contents?.[0]?.LastModified ?? new Date(0);
      environments.set(prNumber, {
        prNumber,
        prefix: prefix.Prefix!,
        lastModified,
        objectCount: objects.KeyCount ?? 0,
      });
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return [...environments.values()];
}

async function cleanupStaleEnvironments(config: CleanupConfig): Promise<void> {
  const s3 = new S3Client({ region: config.region });
  const cf = new CloudFrontClient({ region: config.region });
  const cutoff = new Date(Date.now() - config.maxAgeDays * 86400_000);

  const environments = await listPreviewEnvironments(s3, config.previewBucket);
  const stale = environments.filter((env) => env.lastModified < cutoff);

  console.log(`발견: ${environments.length}개 preview, 만료: ${stale.length}개`);

  for (const env of stale) {
    // S3 오브젝트 삭제
    let continuationToken: string | undefined;
    do {
      const list = await s3.send(new ListObjectsV2Command({
        Bucket: config.previewBucket,
        Prefix: env.prefix,
        ContinuationToken: continuationToken,
      }));

      if (list.Contents?.length) {
        await s3.send(new DeleteObjectsCommand({
          Bucket: config.previewBucket,
          Delete: {
            Objects: list.Contents.map((obj) => ({ Key: obj.Key })),
          },
        }));
      }
      continuationToken = list.NextContinuationToken;
    } while (continuationToken);

    // CloudFront 무효화
    await cf.send(new CreateInvalidationCommand({
      DistributionId: config.distributionId,
      InvalidationBatch: {
        CallerReference: `cleanup-pr-${env.prNumber}-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: [`/pr-${env.prNumber}/*`],
        },
      },
    }));

    console.log(`정리 완료: PR #${env.prNumber} (${env.objectCount} objects)`);
  }
}

// 실행
cleanupStaleEnvironments({
  previewBucket: process.env.PREVIEW_BUCKET!,
  distributionId: process.env.CF_DISTRIBUTION_ID!,
  maxAgeDays: 7,
  region: "ap-northeast-2",
});
```

---

## 4. 환경별 캐시 키 네임스페이스 분리 패턴

### 4.1 캐시 키 구조

각 환경의 캐시가 절대 충돌하지 않도록 네임스페이스를 분리한다.

```
캐시 키 = Distribution ID + Behavior Path + Cache Policy Headers + URI

예시:
  Production:  DIST123 + /* + /assets/main.a1b2c3.js
  Beta 1:      DIST123 + /beta-1/* + X-Beta-Environment:beta-1 + /assets/main.d4e5f6.js
  PR #42:      DIST123 + /pr-42/* + /assets/main.g7h8i9.js
```

### 4.2 CloudFront Function: 캐시 키 네임스페이스 주입

```typescript
// infra/lib/functions/cache-namespace.ts
// CloudFront Function (JS 2.0) -- 빌드 시 인라인됨

export const cacheNamespaceFunction = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var headers = request.headers;

  // 환경 식별
  var envMatch = uri.match(/^\\/(beta-[a-z0-9-]+|pr-[0-9]+)\\//);
  var envName = envMatch ? envMatch[1] : 'production';

  // 캐시 키 네임스페이스 헤더
  headers['x-cache-namespace'] = { value: envName };

  // 버전 태그 (배포 시점 식별)
  var versionMatch = uri.match(/\\.([a-f0-9]{8,16})\\.(js|css|woff2?|png|jpg|webp|avif|svg)$/);
  if (versionMatch) {
    headers['x-asset-version'] = { value: versionMatch[1] };
  }

  // 환경 접두사 제거 후 오리진 전달
  if (envMatch) {
    request.uri = uri.substring(envMatch[0].length - 1);
  }

  // SPA fallback
  if (!request.uri.includes('.')) {
    request.uri = '/index.html';
  }

  return request;
}`;
```

### 4.3 환경별 Cache-Control 헤더 전략

```typescript
// scripts/generate-cache-headers.ts
interface EnvironmentCacheConfig {
  env: "production" | "beta" | "preview";
  pathPattern: string;
  cacheControl: string;
  cdnTtl: number;
  browserTtl: number;
  staleWhileRevalidate: number;
}

const CACHE_CONFIGS: EnvironmentCacheConfig[] = [
  // Production: 해시된 에셋은 불변
  {
    env: "production",
    pathPattern: "/assets/*.[hash].*",
    cacheControl: "public, max-age=31536000, immutable",
    cdnTtl: 31536000,
    browserTtl: 31536000,
    staleWhileRevalidate: 0,
  },
  {
    env: "production",
    pathPattern: "/index.html",
    cacheControl: "public, max-age=0, s-maxage=60, stale-while-revalidate=30",
    cdnTtl: 60,
    browserTtl: 0,
    staleWhileRevalidate: 30,
  },
  // Beta: 적극적 캐싱이되 빠른 무효화 가능
  {
    env: "beta",
    pathPattern: "/beta-*/assets/*.[hash].*",
    cacheControl: "public, max-age=86400, immutable",
    cdnTtl: 86400,
    browserTtl: 86400,
    staleWhileRevalidate: 0,
  },
  {
    env: "beta",
    pathPattern: "/beta-*/index.html",
    cacheControl: "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
    cdnTtl: 300,
    browserTtl: 0,
    staleWhileRevalidate: 60,
  },
  // Preview: 최소 캐싱 (빠른 피드백 루프 우선)
  {
    env: "preview",
    pathPattern: "/pr-*/assets/*",
    cacheControl: "public, max-age=300, stale-while-revalidate=60",
    cdnTtl: 300,
    browserTtl: 300,
    staleWhileRevalidate: 60,
  },
  {
    env: "preview",
    pathPattern: "/pr-*/index.html",
    cacheControl: "no-cache, s-maxage=60",
    cdnTtl: 60,
    browserTtl: 0,
    staleWhileRevalidate: 0,
  },
];

function getCacheConfigForPath(
  path: string,
  env: EnvironmentCacheConfig["env"],
): EnvironmentCacheConfig | undefined {
  return CACHE_CONFIGS.find(
    (config) => config.env === env && matchPattern(path, config.pathPattern),
  );
}

function matchPattern(path: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" + pattern
      .replace(/\./g, "\\.")
      .replace(/\[hash\]/g, "[a-f0-9]{6,16}")
      .replace(/\*/g, ".*") + "$",
  );
  return regex.test(path);
}

export { CACHE_CONFIGS, getCacheConfigForPath };
export type { EnvironmentCacheConfig };
```

---

## 5. AI 프롬프트 5선

### 프롬프트 1: 캐시 적중률 분석

> ```
> 다음은 멀티 베타 환경의 CloudFront 액세스 로그에서 추출한 캐시 적중률 분석 결과이다.
> 환경별(production, beta-1, beta-2, pr-123)로 분리하여:
> (1) 적중률이 낮은 경로 패턴의 원인을 추정하고,
> (2) 환경 간 캐시 오염(cross-env cache pollution)이 발생했는지 확인하고,
> (3) 각 환경에 적합한 최적 TTL을 권장해줘.
>
> --- 분석 결과 ---
> {여기에 환경별 캐시 적중률 데이터 붙여넣기}
>
> --- 현재 캐시 정책 ---
> {여기에 환경별 Cache-Control 헤더 붙여넣기}
> ```

### 프롬프트 2: TTL 최적화

> ```
> 아래 멀티 베타 환경의 경로별 트래픽 패턴과 콘텐츠 변경 주기를 분석하여,
> AWS CDK(TypeScript)로 환경별 CloudFront CachePolicy를 정의하는 코드를 생성해줘.
> 각 정책에 대해 TTL 결정 근거를 주석으로 설명해줘.
>
> --- 환경 구성 ---
> - Production: 일 50만 요청, 주 1회 배포
> - Beta 1~3: 일 5만 요청, 일 3~5회 배포
> - PR Preview: 일 500 요청, 커밋마다 배포
>
> --- 경로별 트래픽 ---
> {여기에 경로별 트래픽 데이터 붙여넣기}
> ```

### 프롬프트 3: 무효화 영향 분석

> ```
> CloudFront 캐시 무효화를 실행하려고 한다.
> 다음 무효화 패턴에 대해:
> (1) 영향받는 환경(production/beta/preview)을 식별하고,
> (2) 예상되는 오리진 부하 증가량을 추정하고,
> (3) 무효화 비용(요청 수 기준)을 계산하고,
> (4) 단계적 무효화 전략을 제안해줘.
>
> --- 무효화 대상 ---
> /beta-1/assets/*
> /pr-*/index.html
>
> --- 현재 트래픽 ---
> {여기에 분당 요청 수 데이터 붙여넣기}
> ```

### 프롬프트 4: 캐시 정책 설계

> ```
> 새로운 베타 환경(beta-4)을 추가하려고 한다.
> 기존 멀티 베타 인프라 구성을 참고하여:
> (1) CDK로 새 S3 버킷 + CloudFront Behavior를 추가하는 코드를 생성하고,
> (2) 캐시 키 네임스페이스가 기존 환경과 충돌하지 않는지 검증하고,
> (3) Origin Shield 설정 포함 여부를 비용 대비 판단하고,
> (4) GitHub Actions 배포 워크플로우도 함께 생성해줘.
>
> --- 기존 인프라 ---
> {여기에 CDK 스택 코드 또는 CloudFormation 출력 붙여넣기}
> ```

### 프롬프트 5: 비용 분석

> ```
> 멀티 베타 환경의 CloudFront 비용을 분석해줘.
> (1) 환경별(production, beta-1~3, preview) 요청 수와 데이터 전송량을 분리하고,
> (2) Preview 환경의 수명 주기별 비용 패턴을 분석하고,
> (3) 비용 절감을 위한 캐시 정책 최적화 방안을 제시하고,
> (4) 월간 예상 비용을 환경별로 산출해줘.
>
> --- CloudFront 사용량 ---
> {여기에 AWS Cost Explorer 또는 CloudFront 보고서 데이터 붙여넣기}
>
> --- 현재 환경 수 ---
> Beta: 3개 (상시), Preview: 평균 12개 (동시)
> ```

---

## 6. CloudFront Functions: 멀티 베타 라우팅

### 6.1 A/B 테스트 라우팅

```typescript
// infra/lib/functions/ab-routing.ts
export const abRoutingFunction = `
function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var cookies = request.cookies;

  // 기존 A/B 쿠키 확인
  var abGroup = cookies['x-ab-group'] ? cookies['x-ab-group'].value : null;

  if (!abGroup) {
    // 새 방문자: 가중치 기반 배정
    var rand = Math.random();
    if (rand < 0.8) {
      abGroup = 'production';
    } else if (rand < 0.9) {
      abGroup = 'beta-1';
    } else {
      abGroup = 'beta-2';
    }
  }

  // 캐시 키에 A/B 그룹 포함
  headers['x-ab-group'] = { value: abGroup };

  // Beta 환경으로 라우팅
  if (abGroup.startsWith('beta-')) {
    request.uri = '/' + abGroup + request.uri;
  }

  return request;
}`;
```

### 6.2 응답 헤더 함수

```typescript
// infra/lib/functions/response-headers.ts
export const responseHeadersFunction = `
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  // 보안 헤더
  headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubDomains; preload' };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  headers['permissions-policy'] = { value: 'camera=(), microphone=(), geolocation=()' };

  // 환경 식별 헤더 (디버깅용)
  var cacheStatus = response.headers['x-cache'] ? response.headers['x-cache'].value : 'unknown';
  headers['x-served-by'] = { value: 'cloudfront-multi-beta' };
  headers['x-cache-status'] = { value: cacheStatus };

  return response;
}`;
```

---

## 7. Origin Shield + 멀티 베타 최적화

### 7.1 멀티 베타 환경에서 Origin Shield 전략

```typescript
// infra/lib/origin-shield-config.ts
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

interface OriginShieldDecision {
  environment: string;
  enableShield: boolean;
  region: string;
  reason: string;
}

function decideOriginShield(
  envType: "production" | "beta" | "preview",
  dailyRequests: number,
  originRegion: string,
): OriginShieldDecision {
  // Origin Shield 비용: 요청당 $0.0075/10,000건
  // 오리진 보호 이점 vs 추가 비용 판단
  const shieldRegionMap: Record<string, string> = {
    "ap-northeast-2": "ap-northeast-2", // 서울 -> 서울
    "us-east-1": "us-east-1",
    "eu-west-1": "eu-west-1",
  };

  if (envType === "preview") {
    return {
      environment: envType,
      enableShield: false,
      region: originRegion,
      reason: "Preview 환경은 트래픽이 적어 Origin Shield 비용 대비 이점 없음",
    };
  }

  if (envType === "beta" && dailyRequests < 10000) {
    return {
      environment: envType,
      enableShield: false,
      region: originRegion,
      reason: "일 1만 미만 트래픽의 베타 환경은 Shield 불필요",
    };
  }

  return {
    environment: envType,
    enableShield: true,
    region: shieldRegionMap[originRegion] ?? originRegion,
    reason: "높은 트래픽으로 오리진 부하 분산 필요",
  };
}

export { decideOriginShield };
export type { OriginShieldDecision };
```

---

## 8. 실시간 로그 분석 파이프라인

### 8.1 멀티 베타 환경별 로그 수집 및 분석

```typescript
// scripts/multi-beta-log-analysis.ts
import { readFileSync } from "node:fs";

interface AccessLogEntry {
  timestamp: string;
  edgeLocation: string;
  statusCode: number;
  uri: string;
  cacheResult: "Hit" | "Miss" | "RefreshHit" | "Error" | "LimitExceeded";
  timeTaken: number;
  queryString: string;
  contentType: string;
  bytesOut: number;
}

interface EnvironmentMetrics {
  environment: string;
  totalRequests: number;
  hitRatio: number;
  avgLatency: number;
  p99Latency: number;
  totalBytesOut: number;
  topMissedPaths: Array<{ path: string; missCount: number }>;
}

function parseAccessLog(logContent: string): AccessLogEntry[] {
  return logContent
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const fields = line.split("\t");
      return {
        timestamp: fields[0],
        edgeLocation: fields[2],
        statusCode: parseInt(fields[7], 10),
        uri: fields[6],
        cacheResult: fields[12] as AccessLogEntry["cacheResult"],
        timeTaken: parseFloat(fields[17]),
        queryString: fields[10],
        contentType: fields[28] ?? "unknown",
        bytesOut: parseInt(fields[3], 10),
      };
    });
}

function identifyEnvironment(uri: string): string {
  const match = uri.match(/^\/(beta-[a-z0-9-]+|pr-[0-9]+)\//);
  return match ? match[1] : "production";
}

function analyzeByEnvironment(entries: AccessLogEntry[]): EnvironmentMetrics[] {
  const envMap = new Map<string, AccessLogEntry[]>();

  for (const entry of entries) {
    const env = identifyEnvironment(entry.uri);
    const list = envMap.get(env) ?? [];
    list.push(entry);
    envMap.set(env, list);
  }

  return [...envMap.entries()].map(([env, envEntries]) => {
    const hits = envEntries.filter(
      (e) => e.cacheResult === "Hit" || e.cacheResult === "RefreshHit",
    ).length;

    const latencies = envEntries.map((e) => e.timeTaken).sort((a, b) => a - b);
    const p99Index = Math.floor(latencies.length * 0.99);

    const missedPaths = new Map<string, number>();
    for (const entry of envEntries.filter((e) => e.cacheResult === "Miss")) {
      const normalized = normalizePath(entry.uri);
      missedPaths.set(normalized, (missedPaths.get(normalized) ?? 0) + 1);
    }

    return {
      environment: env,
      totalRequests: envEntries.length,
      hitRatio: hits / envEntries.length,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p99Latency: latencies[p99Index] ?? 0,
      totalBytesOut: envEntries.reduce((sum, e) => sum + e.bytesOut, 0),
      topMissedPaths: [...missedPaths.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, missCount]) => ({ path, missCount })),
    };
  });
}

function normalizePath(uri: string): string {
  return uri
    .replace(/\.[a-f0-9]{6,16}\.(js|css|woff2?|png|jpg|svg)$/i, ".[hash].$1")
    .replace(/\/pr-\d+\//, "/pr-*/");
}

function generateEnvComparisonPrompt(metrics: EnvironmentMetrics[]): string {
  const summary = metrics
    .map((m) =>
      `[${m.environment}] 요청: ${m.totalRequests}, 적중률: ${(m.hitRatio * 100).toFixed(1)}%, ` +
      `평균 지연: ${m.avgLatency.toFixed(1)}ms, P99: ${m.p99Latency.toFixed(1)}ms`,
    )
    .join("\n");

  return `멀티 베타 환경별 CloudFront 성능을 비교 분석해줘.
환경 간 캐시 적중률 차이의 원인을 추정하고, 개선 방안을 제시해줘.

--- 환경별 메트릭 ---
${summary}`;
}

// 실행
const logContent = readFileSync("cloudfront-logs/combined.log", "utf-8");
const entries = parseAccessLog(logContent);
const metrics = analyzeByEnvironment(entries);
console.log(generateEnvComparisonPrompt(metrics));

export { parseAccessLog, analyzeByEnvironment, generateEnvComparisonPrompt };
export type { AccessLogEntry, EnvironmentMetrics };
```

---

## 9. 체크리스트

### 인프라 구성

- [ ] CDK 스택에 멀티 베타 S3 버킷 + CloudFront Behavior 정의
- [ ] Preview 전용 S3 버킷 생성 (접두사 기반 분리)
- [ ] CloudFront Function으로 환경 라우팅 + 캐시 키 네임스페이스 주입
- [ ] 환경별 CachePolicy 분리 (Production / Beta / Preview)
- [ ] Origin Shield 환경별 활성화 여부 결정

### CI/CD

- [ ] PR Open 시 Preview 환경 자동 배포 워크플로우
- [ ] PR Close 시 Preview 환경 자동 정리 워크플로우
- [ ] 스케줄 기반 만료 Preview 정리 스크립트 (cron)
- [ ] Preview URL을 PR 코멘트에 자동 게시

### 캐시 전략

- [ ] 해시 기반 에셋 파일명 적용 (Vite content hash)
- [ ] 환경별 Cache-Control 헤더 정책 문서화
- [ ] 캐시 키 충돌 테스트 (환경 간 오염 방지 검증)
- [ ] 무효화 비용 모니터링 알림 설정

### AI 활용

- [ ] 캐시 적중률 분석 프롬프트 팀 공유
- [ ] TTL 최적화 주기적 검토 (분기 1회)
- [ ] 환경별 비용 분석 대시보드 구축

---

## 10. 참고 자료

- [AWS CDK CloudFront Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront-readme.html)
- [CloudFront Functions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html)
- [CloudFront Cache Policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html)
- [Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html)
- [S3 Origin Access Control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
