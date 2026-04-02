# CloudFront 캐시 운영 표준 -- 트러블슈팅 중심 AI 활용 + 2026 최신 전략

> 장애 시나리오 기반 AI 프롬프트, CloudFront Continuous Deployment, KeyValueStore Feature Flag, CDK L3 Construct Preview 인프라 원클릭, Brotli vs Zstd 압축, S3 Express One Zone 성능 비교를 통합한 2026년형 CDN 운영 가이드.

---

## 목차

1. [Continuous Deployment 기반 안전한 배포](#1-continuous-deployment-기반-안전한-배포)
2. [KeyValueStore Feature Flag 라우팅](#2-keyvaluestore-feature-flag-라우팅)
3. [CDK L3 Construct: Preview 인프라 원클릭 생성](#3-cdk-l3-construct-preview-인프라-원클릭-생성)
4. [PR 닫힘 시 자동 정리 + 비용 리포트](#4-pr-닫힘-시-자동-정리--비용-리포트)
5. [S3 Express One Zone 성능 비교](#5-s3-express-one-zone-성능-비교)
6. [Brotli vs Zstd 압축 전략](#6-brotli-vs-zstd-압축-전략)
7. [장애/트러블슈팅 시나리오 기반 AI 프롬프트](#7-장애트러블슈팅-시나리오-기반-ai-프롬프트)
8. [실시간 로그 분석 + 이상 탐지](#8-실시간-로그-분석--이상-탐지)
9. [운영 체크리스트](#9-운영-체크리스트)
10. [참고 자료](#10-참고-자료)

---

## 1. Continuous Deployment 기반 안전한 배포

CloudFront Continuous Deployment를 활용하면 스테이징 Distribution에 트래픽 일부를 라우팅하여 프로덕션 배포 전 실환경 검증이 가능하다.

### 1.1 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────┐
│                   Route 53 (example.com)                     │
│                          │                                    │
│              ┌───────────┴───────────┐                        │
│              │  Primary Distribution  │                        │
│              │  (Production Config)   │                        │
│              └───────────┬───────────┘                        │
│                          │                                    │
│         Continuous Deployment Policy                          │
│         ┌────────────────┼────────────────┐                   │
│         │ 95% traffic    │                │ 5% traffic        │
│         ▼                │                ▼                   │
│  ┌──────────────┐        │        ┌──────────────┐            │
│  │  Production   │        │        │   Staging     │            │
│  │  S3 Origin    │        │        │   S3 Origin   │            │
│  └──────────────┘        │        └──────────────┘            │
│                          │                                    │
│              KeyValueStore                                    │
│              (Feature Flags + Routing Rules)                  │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Continuous Deployment CDK 구성

```typescript
// infra/lib/continuous-deployment-stack.ts
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

interface ContinuousDeploymentStackProps extends cdk.StackProps {
  productionBucketName: string;
  stagingBucketName: string;
  domainName: string;
  trafficPercentage: number; // 스테이징으로 보낼 트래픽 비율 (0-15)
}

export class ContinuousDeploymentStack extends cdk.Stack {
  public readonly primaryDistribution: cloudfront.Distribution;
  public readonly stagingDistribution: cloudfront.CfnDistribution;

  constructor(
    scope: Construct,
    id: string,
    props: ContinuousDeploymentStackProps,
  ) {
    super(scope, id, props);

    const productionBucket = s3.Bucket.fromBucketName(
      this,
      "ProdBucket",
      props.productionBucketName,
    );

    const stagingBucket = s3.Bucket.fromBucketName(
      this,
      "StagingBucket",
      props.stagingBucketName,
    );

    // Primary Distribution
    this.primaryDistribution = new cloudfront.Distribution(this, "PrimaryDist", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(productionBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      domainNames: [props.domainName],
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Staging Distribution (Continuous Deployment 대상)
    this.stagingDistribution = new cloudfront.CfnDistribution(
      this,
      "StagingDist",
      {
        distributionConfig: {
          enabled: true,
          staging: true,
          defaultCacheBehavior: {
            targetOriginId: "staging-origin",
            viewerProtocolPolicy: "redirect-to-https",
            forwardedValues: { queryString: false },
            compress: true,
          },
          origins: [
            {
              id: "staging-origin",
              domainName: stagingBucket.bucketRegionalDomainName,
              s3OriginConfig: { originAccessIdentity: "" },
              originAccessControlId: this.primaryDistribution.node.id,
            },
          ],
          httpVersion: "http2and3",
        },
      },
    );

    // Continuous Deployment Policy
    new cloudfront.CfnContinuousDeploymentPolicy(this, "CDPolicy", {
      continuousDeploymentPolicyConfig: {
        enabled: true,
        stagingDistributionDnsNames: [
          this.stagingDistribution.attrDomainName,
        ],
        trafficConfig: {
          type: "SingleWeight",
          singleWeightConfig: {
            weight: props.trafficPercentage / 100,
          },
        },
      },
    });

    new cdk.CfnOutput(this, "StagingUrl", {
      value: `https://${this.stagingDistribution.attrDomainName}`,
    });
  }
}
```

### 1.3 단계적 트래픽 전환 전략

| 단계 | 트래픽 비율 | 관찰 시간 | 검증 항목 |
|------|-----------|----------|----------|
| Canary | 1% | 30분 | 4xx/5xx 에러율, 응답 시간 p99 |
| Low | 5% | 2시간 | Core Web Vitals, 캐시 히트율 |
| Medium | 15% | 4시간 | 전체 비즈니스 지표, 전환율 |
| Promote | 100% | - | Staging -> Primary 프로모션 |

---

## 2. KeyValueStore Feature Flag 라우팅

CloudFront KeyValueStore를 활용하면 엣지에서 밀리초 단위 지연으로 Feature Flag 기반 라우팅이 가능하다. Lambda@Edge나 외부 API 호출 없이 CloudFront Functions 내에서 직접 KV 조회가 이루어진다.

### 2.1 KeyValueStore 구성

```typescript
// infra/lib/kvs-feature-flag-stack.ts
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import type { Construct } from "constructs";

interface FeatureFlag {
  key: string;
  targetPath: string;
  enabledPercentage: number;
  allowedUsers: string[];
}

interface KvsFeatureFlagStackProps extends cdk.StackProps {
  distributionId: string;
  flags: FeatureFlag[];
}

export class KvsFeatureFlagStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: KvsFeatureFlagStackProps,
  ) {
    super(scope, id, props);

    // KeyValueStore 생성
    const kvStore = new cloudfront.CfnKeyValueStore(this, "FeatureFlagKVS", {
      name: "feature-flags",
      comment: "Feature flag routing rules for multi-beta",
      importSource: {
        sourceArn: "",
        sourceType: "S3",
      },
    });

    // CloudFront Function (KVS 연동)
    const routingFunction = new cloudfront.Function(this, "RoutingFn", {
      code: cloudfront.FunctionCode.fromInline(`
        import cf from 'cloudfront';

        const kvsHandle = cf.kvs();

        async function handler(event) {
          const request = event.request;
          const uri = request.uri;
          const headers = request.headers;

          try {
            // Feature Flag 조회
            const flagsJson = await kvsHandle.get('active-flags');
            const flags = JSON.parse(flagsJson);

            // 사용자 식별 (쿠키 또는 헤더)
            const userId = headers['x-user-id']
              ? headers['x-user-id'].value
              : '';

            for (const flag of flags) {
              if (!uri.startsWith(flag.targetPath)) continue;

              // 허용 사용자 목록 우선 체크
              if (flag.allowedUsers.includes(userId)) {
                request.uri = '/beta/' + flag.key + uri;
                request.headers['x-feature-flag'] = { value: flag.key };
                return request;
              }

              // 퍼센티지 기반 라우팅
              const hash = simpleHash(userId || request.headers['x-forwarded-for']?.value || '');
              if (hash % 100 < flag.enabledPercentage) {
                request.uri = '/beta/' + flag.key + uri;
                request.headers['x-feature-flag'] = { value: flag.key };
                return request;
              }
            }
          } catch (e) {
            // KVS 조회 실패 시 기본 경로
          }

          return request;
        }

        function simpleHash(str) {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
          }
          return Math.abs(hash);
        }
      `),
      functionName: "feature-flag-router",
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      keyValueStore: cloudfront.KeyValueStore.fromKeyValueStoreArn(
        this,
        "KVSRef",
        kvStore.attrArn,
      ),
    });

    new cdk.CfnOutput(this, "KvsArn", {
      value: kvStore.attrArn,
    });
  }
}
```

### 2.2 KVS 데이터 관리 자동화

```typescript
// scripts/update-feature-flags.ts
import {
  CloudFrontKeyValueStoreClient,
  DescribeKeyValueStoreCommand,
  PutKeyCommand,
} from "@aws-sdk/client-cloudfront-keyvaluestore";

interface FeatureFlagConfig {
  key: string;
  targetPath: string;
  enabledPercentage: number;
  allowedUsers: string[];
  expiresAt?: string;
}

async function updateFeatureFlags(
  kvsArn: string,
  flags: FeatureFlagConfig[],
): Promise<void> {
  const client = new CloudFrontKeyValueStoreClient({});

  // 현재 ETag 조회
  const describeResp = await client.send(
    new DescribeKeyValueStoreCommand({ KvsARN: kvsArn }),
  );
  const etag = describeResp.ETag!;

  // 만료된 플래그 제거
  const now = new Date().toISOString();
  const activeFlags = flags.filter(
    (f) => !f.expiresAt || f.expiresAt > now,
  );

  await client.send(
    new PutKeyCommand({
      KvsARN: kvsArn,
      Key: "active-flags",
      Value: JSON.stringify(activeFlags),
      IfMatch: etag,
    }),
  );

  console.log(`Updated ${activeFlags.length} active feature flags`);
}

// CLI 실행
const kvsArn = process.argv[2];
const flagsFile = process.argv[3];
if (kvsArn && flagsFile) {
  const flags: FeatureFlagConfig[] = JSON.parse(
    require("fs").readFileSync(flagsFile, "utf-8"),
  );
  updateFeatureFlags(kvsArn, flags);
}
```

### 2.3 Feature Flag 운영 규칙

| 규칙 | 설명 |
|------|------|
| **만료일 필수** | 모든 플래그에 `expiresAt`을 설정하여 좀비 플래그 방지 |
| **최대 동시 플래그 수** | 10개 이내 유지 (KVS 조회 성능 보장) |
| **네이밍 규칙** | `{팀}-{기능}-{YYYYMMDD}` 형식 (예: `checkout-newui-20260401`) |
| **롤백** | KVS 값을 빈 배열로 업데이트하면 즉시 전체 플래그 비활성화 |
| **감사 로그** | 모든 KVS 변경을 CloudTrail로 추적 |

---

## 3. CDK L3 Construct: Preview 인프라 원클릭 생성

S3 + CloudFront + OAC + Route53을 통합한 고수준 Construct로 PR별 Preview 인프라를 원클릭 생성한다.

### 3.1 L3 Construct 정의

```typescript
// infra/lib/constructs/preview-environment.ts
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

export interface PreviewEnvironmentProps {
  /** PR 번호 */
  prNumber: number;
  /** PR 작성자 */
  prAuthor: string;
  /** 기본 도메인 (예: beta.example.com) */
  baseDomain: string;
  /** Route53 호스팅 영역 ID */
  hostedZoneId: string;
  /** ACM 인증서 ARN (*.beta.example.com) */
  certificateArn: string;
  /** 자동 삭제까지 일수 */
  ttlDays?: number;
  /** S3 Express One Zone 사용 여부 */
  useExpressOneZone?: boolean;
  /** 압축 방식 */
  compressionMode?: "brotli" | "zstd" | "gzip";
}

export class PreviewEnvironment extends Construct {
  public readonly bucket: s3.IBucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly url: string;

  constructor(scope: Construct, id: string, props: PreviewEnvironmentProps) {
    super(scope, id);

    const ttlDays = props.ttlDays ?? 7;
    const subdomain = `pr-${props.prNumber}.${props.baseDomain}`;

    // S3 버킷 (Express One Zone 또는 Standard)
    const bucket = new s3.Bucket(this, "Bucket", {
      bucketName: `preview-pr-${props.prNumber}-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(ttlDays),
          id: "auto-expire",
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });
    this.bucket = bucket;

    // OAC 기반 오리진
    const origin = origins.S3BucketOrigin.withOriginAccessControl(bucket);

    // 응답 헤더 정책
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "ResponseHeaders",
      {
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.days(365),
            includeSubdomains: true,
            override: true,
          },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: "X-Preview-PR",
              value: String(props.prNumber),
              override: true,
            },
            {
              header: "X-Preview-Author",
              value: props.prAuthor,
              override: true,
            },
            {
              header: "X-Preview-Expires",
              value: new Date(
                Date.now() + ttlDays * 86400000,
              ).toISOString(),
              override: true,
            },
          ],
        },
      },
    );

    // 캐시 정책 (Preview용 짧은 TTL)
    const cachePolicy = new cloudfront.CachePolicy(this, "CachePolicy", {
      cachePolicyName: `preview-pr-${props.prNumber}`,
      defaultTtl: cdk.Duration.minutes(5),
      maxTtl: cdk.Duration.hours(1),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    // CloudFront Distribution
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Cert",
      props.certificateArn,
    );

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy,
        responseHeadersPolicy,
        compress: true,
      },
      defaultRootObject: "index.html",
      domainNames: [subdomain],
      certificate,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // Route53 레코드
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "Zone",
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.baseDomain,
      },
    );

    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      recordName: subdomain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(this.distribution),
      ),
    });

    this.url = `https://${subdomain}`;

    // 태그 (비용 추적 + 자동 정리용)
    cdk.Tags.of(this).add("Environment", "preview");
    cdk.Tags.of(this).add("PRNumber", String(props.prNumber));
    cdk.Tags.of(this).add("Author", props.prAuthor);
    cdk.Tags.of(this).add(
      "ExpiresAt",
      new Date(Date.now() + ttlDays * 86400000).toISOString(),
    );
    cdk.Tags.of(this).add("ManagedBy", "cdk-preview-construct");

    new cdk.CfnOutput(this, "PreviewUrl", { value: this.url });
    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
    });
    new cdk.CfnOutput(this, "BucketName", { value: bucket.bucketName });
  }
}
```

### 3.2 GitHub Actions: PR 생성 시 Preview 자동 배포

```yaml
# .github/workflows/preview-deploy.yml
name: Preview Environment Deploy
on:
  pull_request:
    types: [opened, synchronize, reopened]

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_PREVIEW_MODE: "true"
          VITE_PR_NUMBER: ${{ github.event.pull_request.number }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PREVIEW_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy CDK Preview Stack
        id: deploy
        run: |
          npx cdk deploy "PreviewStack-PR-${{ github.event.pull_request.number }}" \
            --context prNumber=${{ github.event.pull_request.number }} \
            --context prAuthor=${{ github.event.pull_request.user.login }} \
            --require-approval never \
            --outputs-file cdk-outputs.json

          PREVIEW_URL=$(jq -r '.[].PreviewUrl' cdk-outputs.json)
          echo "preview_url=$PREVIEW_URL" >> "$GITHUB_OUTPUT"

      - name: Sync build artifacts to S3
        run: |
          BUCKET=$(jq -r '.[].BucketName' cdk-outputs.json)
          aws s3 sync dist/ "s3://${BUCKET}/" \
            --delete \
            --cache-control "public, max-age=300"

      - name: Invalidate CloudFront cache
        run: |
          DIST_ID=$(jq -r '.[].DistributionId' cdk-outputs.json)
          aws cloudfront create-invalidation \
            --distribution-id "$DIST_ID" \
            --paths "/*"

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.deploy.outputs.preview_url }}';
            const body = [
              '## Preview Environment',
              '',
              `URL: ${url}`,
              '',
              `Commit: \`${context.sha.slice(0, 8)}\``,
              `Expires: ${new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}`,
              '',
              '---',
              '_Powered by CDK L3 Preview Construct_',
            ].join('\n');

            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const existing = comments.data.find(
              (c) => c.body?.includes('## Preview Environment')
            );

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
                issue_number: context.issue.number,
                body,
              });
            }
```

---

## 4. PR 닫힘 시 자동 정리 + 비용 리포트

### 4.1 자동 정리 워크플로우

```yaml
# .github/workflows/preview-cleanup.yml
name: Preview Environment Cleanup
on:
  pull_request:
    types: [closed]
  schedule:
    - cron: "0 3 * * *" # 매일 03:00 UTC에 고아 환경 탐지

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  cleanup-pr:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PREVIEW_ROLE_ARN }}
          aws-region: us-east-1

      - name: Destroy CDK Preview Stack
        run: |
          npx cdk destroy "PreviewStack-PR-${{ github.event.pull_request.number }}" \
            --force

      - name: Generate cost report
        id: cost
        run: npx ts-node scripts/preview-cost-report.ts ${{ github.event.pull_request.number }}

      - name: Comment cost report on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('cost-report.md', 'utf-8');
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: report,
            });

  sweep-orphans:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PREVIEW_ROLE_ARN }}
          aws-region: us-east-1

      - name: Find and destroy orphan stacks
        run: npx ts-node scripts/sweep-orphan-previews.ts
```

### 4.2 비용 리포트 생성 스크립트

```typescript
// scripts/preview-cost-report.ts
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import * as fs from "fs";

interface CostBreakdown {
  service: string;
  amount: number;
  unit: string;
}

async function generateCostReport(prNumber: number): Promise<void> {
  const ceClient = new CostExplorerClient({});
  const cfnClient = new CloudFormationClient({});

  // 스택 생성 시점 조회
  const stackName = `PreviewStack-PR-${prNumber}`;
  const stackResp = await cfnClient.send(
    new DescribeStacksCommand({ StackName: stackName }),
  );
  const createdAt = stackResp.Stacks?.[0]?.CreationTime ?? new Date();
  const now = new Date();

  // Cost Explorer 조회
  const costResp = await ceClient.send(
    new GetCostAndUsageCommand({
      TimePeriod: {
        Start: createdAt.toISOString().split("T")[0],
        End: now.toISOString().split("T")[0],
      },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
      Filter: {
        Tags: {
          Key: "PRNumber",
          Values: [String(prNumber)],
          MatchOptions: ["EQUALS"],
        },
      },
      GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
    }),
  );

  const breakdown: CostBreakdown[] = [];
  let totalCost = 0;

  for (const result of costResp.ResultsByTime ?? []) {
    for (const group of result.Groups ?? []) {
      const service = group.Keys?.[0] ?? "Unknown";
      const amount = parseFloat(
        group.Metrics?.UnblendedCost?.Amount ?? "0",
      );
      totalCost += amount;

      const existing = breakdown.find((b) => b.service === service);
      if (existing) {
        existing.amount += amount;
      } else {
        breakdown.push({ service, amount, unit: "USD" });
      }
    }
  }

  const durationDays = Math.ceil(
    (now.getTime() - createdAt.getTime()) / 86400000,
  );

  const report = [
    `## Preview Environment Cost Report -- PR #${prNumber}`,
    "",
    `| Item | Value |`,
    `|------|-------|`,
    `| Duration | ${durationDays} days |`,
    `| Total Cost | $${totalCost.toFixed(4)} |`,
    `| Daily Average | $${(totalCost / Math.max(durationDays, 1)).toFixed(4)} |`,
    "",
    "### Cost by Service",
    "",
    "| Service | Cost |",
    "|---------|------|",
    ...breakdown
      .sort((a, b) => b.amount - a.amount)
      .map((b) => `| ${b.service} | $${b.amount.toFixed(4)} |`),
    "",
    "---",
    "_Auto-generated on stack cleanup_",
  ].join("\n");

  fs.writeFileSync("cost-report.md", report);
  console.log(`Cost report generated: $${totalCost.toFixed(4)} total`);
}

const prNumber = parseInt(process.argv[2], 10);
if (!isNaN(prNumber)) {
  generateCostReport(prNumber);
}
```

### 4.3 고아 환경 탐지/정리

```typescript
// scripts/sweep-orphan-previews.ts
import {
  CloudFormationClient,
  ListStacksCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

async function sweepOrphanPreviews(): Promise<void> {
  const client = new CloudFormationClient({});
  const now = new Date();

  const resp = await client.send(
    new ListStacksCommand({
      StackStatusFilter: [
        "CREATE_COMPLETE",
        "UPDATE_COMPLETE",
        "UPDATE_ROLLBACK_COMPLETE",
      ],
    }),
  );

  const previewStacks = (resp.StackSummaries ?? []).filter((s) =>
    s.StackName?.startsWith("PreviewStack-PR-"),
  );

  console.log(`Found ${previewStacks.length} preview stacks`);

  for (const stack of previewStacks) {
    const detail = await client.send(
      new DescribeStacksCommand({ StackName: stack.StackName }),
    );

    const tags = detail.Stacks?.[0]?.Tags ?? [];
    const expiresAt = tags.find((t) => t.Key === "ExpiresAt")?.Value;

    if (expiresAt && new Date(expiresAt) < now) {
      console.log(`Destroying expired stack: ${stack.StackName}`);
      await client.send(
        new DeleteStackCommand({ StackName: stack.StackName }),
      );
    }
  }
}

sweepOrphanPreviews();
```

---

## 5. S3 Express One Zone 성능 비교

S3 Express One Zone은 단일 가용 영역에서 일관된 한 자릿수 밀리초 지연 시간을 제공한다. CloudFront 오리진으로 사용 시 TTFB(Time to First Byte)가 크게 개선된다.

### 5.1 성능 비교 벤치마크

| 지표 | S3 Standard | S3 Express One Zone | 차이 |
|------|-------------|--------------------|----|
| **TTFB (오리진 직접)** | 50-100ms | 3-8ms | 약 10배 개선 |
| **소형 파일 GET (< 1KB)** | 20-40ms | 2-5ms | 약 8배 개선 |
| **대형 파일 GET (> 10MB)** | 80-150ms | 10-30ms | 약 5배 개선 |
| **PUT 지연** | 20-60ms | 3-10ms | 약 6배 개선 |
| **비용 (GB/월)** | $0.023 | $0.16 | 약 7배 비쌈 |
| **요청 비용 (GET 1만건)** | $0.0004 | $0.002 | 약 5배 비쌈 |

### 5.2 도입 판단 기준

| 시나리오 | 권장 | 이유 |
|---------|------|------|
| **프로덕션 정적 자산** | S3 Standard | CloudFront 캐시로 오리진 접근 빈도가 낮아 비용 대비 효과 미미 |
| **Preview 환경 (짧은 TTL)** | S3 Express One Zone | 캐시 미스가 빈번하여 오리진 지연이 UX에 직접 영향 |
| **빌드 아티팩트 중간 저장** | S3 Express One Zone | CI/CD 파이프라인에서 빈번한 읽기/쓰기 발생 |
| **대용량 미디어 파일** | S3 Standard | 용량 비용이 지배적, CloudFront Origin Shield로 보완 |

### 5.3 CDK에서 Express One Zone 오리진 구성

```typescript
// Express One Zone 디렉터리 버킷은 일반 S3 버킷과 다른 ARN 형식을 사용한다
// 현재 CDK L2에서 직접 지원하지 않으므로 CfnBucket 사용
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";

function createExpressOneZoneBucket(
  scope: Construct,
  id: string,
  azId: string, // 예: "use1-az4"
): s3.CfnBucket {
  return new s3.CfnBucket(scope, id, {
    bucketName: `preview-express--${azId}--x-s3`,
    bucketEncryption: {
      serverSideEncryptionConfiguration: [
        {
          bucketKeyEnabled: true,
          serverSideEncryptionByDefault: {
            sseAlgorithm: "aws:kms:dsse",
          },
        },
      ],
    },
  });
}
```

---

## 6. Brotli vs Zstd 압축 전략

2026년 기준 Zstd의 브라우저 지원이 확대되면서 압축 전략에 변화가 필요하다.

### 6.1 압축 알고리즘 비교

| 지표 | Gzip | Brotli | Zstd |
|------|------|--------|------|
| **압축률 (JS 번들)** | 65% | 75% | 73% |
| **압축률 (HTML)** | 70% | 82% | 79% |
| **압축 속도** | 빠름 | 느림 (정적 사전 프리빌드 필요) | 매우 빠름 |
| **해제 속도** | 보통 | 보통 | 매우 빠름 |
| **CloudFront 지원** | O | O | 제한적 (커스텀 오리진) |
| **브라우저 지원** | 전체 | 전체 | Chrome 123+, Firefox 126+, Safari 18+ |
| **CDN 엣지 실시간 압축** | O | O | X (사전 압축 필요) |

### 6.2 하이브리드 압축 전략

```typescript
// scripts/compress-assets.ts
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { execSync } from "child_process";

interface CompressionResult {
  file: string;
  original: number;
  gzip: number;
  brotli: number;
  zstd: number;
  bestFormat: string;
}

function compressFile(filePath: string): CompressionResult {
  const content = fs.readFileSync(filePath);
  const original = content.length;

  // Gzip
  const gzipped = zlib.gzipSync(content, { level: 9 });
  fs.writeFileSync(`${filePath}.gz`, gzipped);

  // Brotli
  const brotlied = zlib.brotliCompressSync(content, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: original,
    },
  });
  fs.writeFileSync(`${filePath}.br`, brotlied);

  // Zstd (외부 CLI 사용)
  execSync(`zstd -19 --force "${filePath}" -o "${filePath}.zst"`, {
    stdio: "pipe",
  });
  const zstdSize = fs.statSync(`${filePath}.zst`).size;

  const sizes = { gzip: gzipped.length, brotli: brotlied.length, zstd: zstdSize };
  const bestFormat = Object.entries(sizes).sort(
    ([, a], [, b]) => a - b,
  )[0][0];

  return {
    file: path.basename(filePath),
    original,
    gzip: gzipped.length,
    brotli: brotlied.length,
    zstd: zstdSize,
    bestFormat,
  };
}

function compressDirectory(dir: string): void {
  const extensions = [".js", ".css", ".html", ".json", ".svg", ".xml"];
  const results: CompressionResult[] = [];

  function walk(directory: string): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(compressFile(fullPath));
      }
    }
  }

  walk(dir);

  // 결과 요약
  console.log("\n=== Compression Summary ===\n");
  console.log(
    "File".padEnd(40),
    "Original".padEnd(12),
    "Gzip".padEnd(12),
    "Brotli".padEnd(12),
    "Zstd".padEnd(12),
    "Best",
  );
  console.log("-".repeat(100));

  for (const r of results) {
    console.log(
      r.file.padEnd(40),
      `${(r.original / 1024).toFixed(1)}KB`.padEnd(12),
      `${(r.gzip / 1024).toFixed(1)}KB`.padEnd(12),
      `${(r.brotli / 1024).toFixed(1)}KB`.padEnd(12),
      `${(r.zstd / 1024).toFixed(1)}KB`.padEnd(12),
      r.bestFormat,
    );
  }
}

const targetDir = process.argv[2] || "dist";
compressDirectory(targetDir);
```

### 6.3 S3 업로드 시 Content-Encoding 분기

```typescript
// scripts/upload-compressed.ts
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import * as mime from "mime-types";

const s3 = new S3Client({});

interface UploadConfig {
  bucket: string;
  distDir: string;
  preferZstd: boolean;
}

async function uploadCompressedAssets(config: UploadConfig): Promise<void> {
  const files = getAllFiles(config.distDir);

  for (const file of files) {
    // 원본 파일만 처리 (.gz, .br, .zst 는 건너뜀)
    if (/\.(gz|br|zst)$/.test(file)) continue;

    const key = path.relative(config.distDir, file);
    const contentType = mime.lookup(file) || "application/octet-stream";

    // 압축 버전 우선순위 결정
    const candidates = config.preferZstd
      ? [`${file}.zst`, `${file}.br`, `${file}.gz`]
      : [`${file}.br`, `${file}.zst`, `${file}.gz`];

    const encodingMap: Record<string, string> = {
      ".zst": "zstd",
      ".br": "br",
      ".gz": "gzip",
    };

    let uploaded = false;
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        const ext = path.extname(candidate);
        await s3.send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: fs.readFileSync(candidate),
            ContentType: contentType,
            ContentEncoding: encodingMap[ext],
            CacheControl: key.includes("assets/")
              ? "public, max-age=31536000, immutable"
              : "public, max-age=300",
          }),
        );
        uploaded = true;
        break;
      }
    }

    // 압축 버전이 없으면 원본 업로드
    if (!uploaded) {
      await s3.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: fs.readFileSync(file),
          ContentType: contentType,
          CacheControl: "public, max-age=300",
        }),
      );
    }
  }
}

function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}
```

---

## 7. 장애/트러블슈팅 시나리오 기반 AI 프롬프트

### 프롬프트 1: 캐시 무효화가 동작하지 않을 때

```text
CloudFront 캐시 무효화(invalidation)를 생성했는데 이전 콘텐츠가 계속 서빙되고 있어.

[현재 상황]
- Distribution ID: {DIST_ID}
- 무효화 경로: {예: /assets/*, /index.html}
- 무효화 생성 시간: {시간}
- 현재까지 경과 시간: {분}

[확인한 것]
- S3 오리진에는 새 파일이 정상 업로드됨
- curl -I 결과 X-Cache: Hit from cloudfront

[분석 요청]
1. 무효화가 반영되지 않는 가능한 원인 목록 (우선순위순)
2. 각 원인별 확인 명령어 (AWS CLI)
3. Cache-Control 헤더와 CloudFront 캐시 정책 간 우선순위 설명
4. 브라우저 캐시 vs CDN 캐시 구분 방법
5. 즉시 해결 방안과 재발 방지 대책
```

### 프롬프트 2: CloudFront 로그에서 4xx 에러 패턴 분석

```text
CloudFront 실시간 로그에서 4xx 에러가 급증하고 있어. 아래 로그 샘플을 분석해줘.

[로그 샘플]
{CloudFront 표준 로그 또는 실시간 로그 10-20줄 붙여넣기}

[분석 요청]
1. 에러 유형별 분류 (403 vs 404 vs 405 등)
2. 에러가 집중되는 URI 패턴
3. 특정 엣지 로케이션이나 클라이언트에서 집중되는지
4. OAC(Origin Access Control) 설정 문제 가능성
5. S3 버킷 정책과 CloudFront 오리진 설정 간 불일치 점검 항목
6. 해결을 위한 단계별 조치 계획
```

### 프롬프트 3: 최적의 캐시 TTL 추천

```text
아래 서비스 특성에 맞는 CloudFront 캐시 TTL 전략을 추천해줘.

[서비스 특성]
- 타입: {SPA / SSR / 정적 사이트 / API 프록시}
- 배포 빈도: {일 N회 / 주 N회}
- 트래픽 규모: {일 평균 요청 수}
- 파일 유형: {HTML, JS/CSS 번들, 이미지, API 응답 등}
- 파일 해싱: {webpack contenthash 사용 여부}

[요구사항]
1. 파일 유형별 Cache-Control 헤더 권장값
2. CloudFront 캐시 정책 설정 (DefaultTTL, MinTTL, MaxTTL)
3. 해시 기반 immutable 자산 vs 동적 자산 분리 전략
4. Origin Shield 사용 권장 여부와 지역 선택
5. 캐시 히트율 목표치와 모니터링 방법
6. stale-while-revalidate 패턴 적용 가능 여부
```

### 프롬프트 4: Continuous Deployment 롤백 판단

```text
CloudFront Continuous Deployment로 스테이징 Distribution에 5% 트래픽을 보내고 있는데 이상 징후가 감지됐어.

[스테이징 메트릭]
- 에러율: {Primary: 0.1%, Staging: 2.3%}
- p99 응답 시간: {Primary: 120ms, Staging: 450ms}
- 캐시 히트율: {Primary: 92%, Staging: 45%}
- Core Web Vitals LCP: {Primary: 1.8s, Staging: 3.2s}

[판단 요청]
1. 이 메트릭 차이가 정상 범위인지 (새로운 배포의 콜드 캐시 영향 포함)
2. 롤백해야 하는 임계값 기준 제안
3. 콜드 캐시 워밍 전략 (스테이징의 낮은 캐시 히트율 원인 분석)
4. 트래픽 비율을 올리기 전 추가로 확인해야 할 항목
5. 프로모션 vs 롤백 최종 추천과 근거
```

### 프롬프트 5: Preview 환경 비용 최적화

```text
현재 멀티 베타 Preview 환경을 운영 중인데 비용이 예상보다 높아.

[현재 상태]
- 동시 활성 Preview 환경 수: {평균 N개}
- 환경당 월 비용: {$X}
- 주요 비용 항목: {CloudFront Distribution, S3 스토리지, Route53 레코드 등}

[분석 요청]
1. 비용 최적화를 위한 아키텍처 대안 비교
   - 개별 Distribution vs 단일 Distribution + Behavior 분리
   - 개별 S3 버킷 vs 단일 버킷 + 접두사 분리
2. 각 대안의 장단점 (격리 수준, 비용, 관리 복잡도)
3. TTL 기반 자동 정리 전략 최적화
4. CloudFront Functions vs Lambda@Edge 비용 비교
5. 월간 예상 비용 시뮬레이션 (환경 수별)
```

---

## 8. 실시간 로그 분석 + 이상 탐지

### 8.1 CloudFront 실시간 로그 파이프라인

```typescript
// infra/lib/log-analysis-stack.ts
import * as cdk from "aws-cdk-lib";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import type { Construct } from "constructs";

interface LogAnalysisStackProps extends cdk.StackProps {
  alertEmail: string;
  errorRateThreshold: number; // 예: 5 (%)
  latencyThresholdMs: number; // 예: 500
}

export class LogAnalysisStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: LogAnalysisStackProps,
  ) {
    super(scope, id, props);

    // Kinesis Data Stream (실시간 로그 수신)
    const logStream = new kinesis.Stream(this, "CfLogStream", {
      streamName: "cloudfront-realtime-logs",
      shardCount: 2,
      retentionPeriod: cdk.Duration.hours(24),
      streamMode: kinesis.StreamMode.ON_DEMAND,
    });

    // 알림 토픽
    const alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: "cloudfront-anomaly-alerts",
    });
    alertTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(props.alertEmail),
    );

    // 로그 분석 Lambda
    const analyzerFn = new lambdaNode.NodejsFunction(this, "LogAnalyzer", {
      entry: "lambda/log-analyzer/index.ts",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(1),
      memorySize: 512,
      environment: {
        ALERT_TOPIC_ARN: alertTopic.topicArn,
        ERROR_RATE_THRESHOLD: String(props.errorRateThreshold),
        LATENCY_THRESHOLD_MS: String(props.latencyThresholdMs),
      },
    });

    alertTopic.grantPublish(analyzerFn);

    // Kinesis -> Lambda 이벤트 소스
    analyzerFn.addEventSourceMapping("LogStreamMapping", {
      eventSourceArn: logStream.streamArn,
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      maxBatchingWindow: cdk.Duration.seconds(10),
    });

    logStream.grantRead(analyzerFn);

    // CloudWatch 대시보드
    const dashboard = new cloudwatch.Dashboard(this, "CfDashboard", {
      dashboardName: "CloudFront-Operations",
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Error Rate by Distribution",
        width: 12,
        left: [
          new cloudwatch.Metric({
            namespace: "CloudFront/Custom",
            metricName: "4xxRate",
            statistic: "Average",
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: "CloudFront/Custom",
            metricName: "5xxRate",
            statistic: "Average",
            period: cdk.Duration.minutes(5),
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: "Cache Hit Rate",
        width: 12,
        left: [
          new cloudwatch.Metric({
            namespace: "CloudFront/Custom",
            metricName: "CacheHitRate",
            statistic: "Average",
            period: cdk.Duration.minutes(5),
          }),
        ],
      }),
    );
  }
}
```

### 8.2 로그 분석 Lambda 구현

```typescript
// lambda/log-analyzer/index.ts
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import type { KinesisStreamEvent, KinesisStreamRecord } from "aws-lambda";

interface CloudFrontLogEntry {
  timestamp: number;
  distributionId: string;
  status: number;
  timeTaken: number;
  uri: string;
  cacheResult: string;
  edgeLocation: string;
}

const sns = new SNSClient({});
const cw = new CloudWatchClient({});
const ALERT_TOPIC_ARN = process.env.ALERT_TOPIC_ARN!;
const ERROR_RATE_THRESHOLD = parseFloat(
  process.env.ERROR_RATE_THRESHOLD ?? "5",
);
const LATENCY_THRESHOLD_MS = parseFloat(
  process.env.LATENCY_THRESHOLD_MS ?? "500",
);

export async function handler(event: KinesisStreamEvent): Promise<void> {
  const entries: CloudFrontLogEntry[] = event.Records.flatMap(
    (record: KinesisStreamRecord) => {
      const payload = Buffer.from(record.kinesis.data, "base64").toString();
      return payload
        .split("\n")
        .filter(Boolean)
        .map(parseCfLogLine);
    },
  );

  if (entries.length === 0) return;

  // 에러율 계산
  const totalRequests = entries.length;
  const errorRequests = entries.filter((e) => e.status >= 400).length;
  const errorRate = (errorRequests / totalRequests) * 100;

  // 지연 시간 p99 계산
  const sortedLatencies = entries
    .map((e) => e.timeTaken)
    .sort((a, b) => a - b);
  const p99Index = Math.floor(sortedLatencies.length * 0.99);
  const p99Latency = sortedLatencies[p99Index] ?? 0;

  // 캐시 히트율 계산
  const cacheHits = entries.filter(
    (e) => e.cacheResult === "Hit" || e.cacheResult === "RefreshHit",
  ).length;
  const cacheHitRate = (cacheHits / totalRequests) * 100;

  // CloudWatch 커스텀 메트릭 발행
  await cw.send(
    new PutMetricDataCommand({
      Namespace: "CloudFront/Custom",
      MetricData: [
        {
          MetricName: "4xxRate",
          Value: (entries.filter((e) => e.status >= 400 && e.status < 500).length / totalRequests) * 100,
          Unit: "Percent",
        },
        {
          MetricName: "5xxRate",
          Value: (entries.filter((e) => e.status >= 500).length / totalRequests) * 100,
          Unit: "Percent",
        },
        {
          MetricName: "CacheHitRate",
          Value: cacheHitRate,
          Unit: "Percent",
        },
        {
          MetricName: "P99Latency",
          Value: p99Latency,
          Unit: "Milliseconds",
        },
      ],
    }),
  );

  // 이상 탐지 알림
  const anomalies: string[] = [];
  if (errorRate > ERROR_RATE_THRESHOLD) {
    anomalies.push(
      `Error rate ${errorRate.toFixed(1)}% exceeds threshold ${ERROR_RATE_THRESHOLD}%`,
    );
  }
  if (p99Latency > LATENCY_THRESHOLD_MS) {
    anomalies.push(
      `P99 latency ${p99Latency.toFixed(0)}ms exceeds threshold ${LATENCY_THRESHOLD_MS}ms`,
    );
  }

  if (anomalies.length > 0) {
    // 에러 집중 URI 패턴 추출
    const errorUris = entries
      .filter((e) => e.status >= 400)
      .reduce<Record<string, number>>((acc, e) => {
        acc[e.uri] = (acc[e.uri] ?? 0) + 1;
        return acc;
      }, {});

    const topErrorUris = Object.entries(errorUris)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([uri, count]) => `  ${uri}: ${count} errors`)
      .join("\n");

    await sns.send(
      new PublishCommand({
        TopicArn: ALERT_TOPIC_ARN,
        Subject: `CloudFront Anomaly Detected`,
        Message: [
          "CloudFront anomaly detected:",
          "",
          ...anomalies.map((a) => `- ${a}`),
          "",
          `Total requests analyzed: ${totalRequests}`,
          `Cache hit rate: ${cacheHitRate.toFixed(1)}%`,
          "",
          "Top error URIs:",
          topErrorUris,
        ].join("\n"),
      }),
    );
  }
}

function parseCfLogLine(line: string): CloudFrontLogEntry {
  const fields = line.split("\t");
  return {
    timestamp: parseInt(fields[0], 10),
    distributionId: fields[2] ?? "",
    status: parseInt(fields[8], 10) || 0,
    timeTaken: parseFloat(fields[18]) * 1000 || 0,
    uri: fields[7] ?? "",
    cacheResult: fields[13] ?? "",
    edgeLocation: fields[4] ?? "",
  };
}
```

---

## 9. 운영 체크리스트

### 9.1 Continuous Deployment

- [ ] 스테이징 Distribution이 프로덕션과 동일한 캐시 정책을 사용하는가
- [ ] 트래픽 비율 전환 시 콜드 캐시 워밍을 고려하는가
- [ ] 프로모션/롤백 자동화 스크립트가 검증되었는가
- [ ] 스테이징 메트릭 모니터링 대시보드가 구성되었는가

### 9.2 KeyValueStore Feature Flag

- [ ] 모든 플래그에 만료일이 설정되었는가
- [ ] KVS 변경에 대한 CloudTrail 감사 로그가 활성화되었는가
- [ ] 플래그 비활성화 시 즉시 롤백 절차가 문서화되었는가
- [ ] 동시 활성 플래그 수가 10개 이하인가

### 9.3 Preview 환경

- [ ] CDK L3 Construct에 자동 만료 태그가 포함되는가
- [ ] PR 닫힘 시 자동 정리 워크플로우가 동작하는가
- [ ] 고아 환경 탐지 스케줄이 설정되었는가
- [ ] 비용 리포트가 PR 코멘트로 자동 게시되는가
- [ ] OAC가 올바르게 구성되어 S3 직접 접근이 차단되는가

### 9.4 압축 전략

- [ ] 빌드 파이프라인에 Brotli 사전 압축이 포함되는가
- [ ] Content-Encoding 헤더가 올바르게 설정되는가
- [ ] 압축되지 않아야 할 파일(이미지, 동영상)이 제외되는가
- [ ] 브라우저별 Accept-Encoding 폴백이 동작하는가

### 9.5 로그 및 모니터링

- [ ] 실시간 로그 → Kinesis → Lambda 파이프라인이 동작하는가
- [ ] 에러율/지연 시간 임계값 알림이 설정되었는가
- [ ] CloudWatch 대시보드에 핵심 메트릭이 포함되는가
- [ ] 캐시 히트율이 90% 이상을 유지하는가

---

## 10. 참고 자료

| 주제 | 링크 |
|------|------|
| CloudFront Continuous Deployment | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/continuous-deployment.html |
| CloudFront KeyValueStore | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions.html |
| CloudFront Functions JS 2.0 런타임 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-features.html |
| S3 Express One Zone | https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-one-zone.html |
| Zstd Content-Encoding | https://www.rfc-editor.org/rfc/rfc8878 |
| AWS CDK Constructs Library | https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html |
| CloudFront 실시간 로그 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html |

---

*본 문서는 범용 CloudFront 캐시 운영 가이드이며, 조직의 규모와 요구사항에 맞게 조정하여 사용할 수 있다.*
