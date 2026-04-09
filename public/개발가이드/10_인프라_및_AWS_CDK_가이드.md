# 10. 인프라 및 AWS CDK 가이드 (2025-2026 Edition)

| 분류 | 인프라 & CI/CD | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [11. CI/CD](./11_CICD_파이프라인_표준.md), [08. 성능](./08_성능_최적화_가이드.md), [12. CloudFront 캐시](./12_CloudFront_캐시_전략.md), [14. 배포 체크리스트](./14_배포_프로세스_체크리스트.md) | **AI 도구** | AWS CDK, Claude Code |
| **핵심 테마** | PR별 Preview 환경, CloudFront OAC, GitHub OIDC, FinOps, WAF, 도메인 관리 | **Update** | 2025.04 |

---

> **"인프라는 더 이상 고정된 자산이 아니라, 코드를 통해 유동적으로 생성되고 소멸되는 소프트웨어의 일부다."**
> 본 가이드는 AWS CDK v2를 활용하여 프론트엔드 배포를 자동화하고, PR별 독립적인 Preview 환경을 구축하는 방법을 다룹니다.

---

## 1. 현대적 배포 아키텍처: PR별 Preview

2026년 프론트엔드 팀의 필수 인프라는 **"모든 PR(Pull Request)이 각자 독립적인 URL을 갖는 것"**입니다. 이를 통해 배포 전 실제 환경에서 검증할 수 있습니다.

### 1.1 핵심 흐름

1. **PR 생성**: GitHub Actions 워크플로우가 트리거됩니다.
2. **CDK Deploy**: 해당 PR 번호를 이름으로 갖는 독립적인 S3 버킷과 CloudFront 환경이 생성됩니다.
3. **PR 주석**: 생성된 고유 URL(예: `pr-123.preview.example.com`)이 PR의 댓글로 자동 등록됩니다.
4. **PR 머지/닫힘**: 사용이 끝난 인프라가 자동으로 삭제(CDK Destroy)되어 비용을 절감합니다.

### 1.2 Preview 환경 CDK 스택 전체 코드

```typescript
// lib/preview-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface PreviewStackProps extends cdk.StackProps {
  /** PR 번호 (예: 123) */
  prNumber: string;
  /** 빌드 산출물 경로 */
  buildOutputPath: string;
}

export class PreviewStack extends cdk.Stack {
  /** 외부에서 참조할 수 있도록 CloudFront URL을 노출 */
  public readonly distributionUrl: string;

  constructor(scope: Construct, id: string, props: PreviewStackProps) {
    super(scope, id, props);

    const { prNumber, buildOutputPath } = props;

    // --- S3 버킷: PR별 독립 버킷 ---
    const bucket = new s3.Bucket(this, 'PreviewBucket', {
      bucketName: `preview-pr-${prNumber}-${cdk.Aws.ACCOUNT_ID}`,
      // Preview 리소스는 스택 삭제 시 함께 제거
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // OAC 사용 시 퍼블릭 액세스 차단 필수
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // 암호화 설정
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // --- CloudFront OAC (Origin Access Control) ---
    const oac = new cloudfront.CfnOriginAccessControl(this, 'PreviewOAC', {
      originAccessControlConfig: {
        name: `preview-oac-pr-${prNumber}`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    // --- CloudFront Distribution ---
    // S3BucketOrigin.withOriginAccessControl()을 사용하여 OAC를 자동 적용
    // CDK v2.130.0+ 에서 지원
    const distribution = new cloudfront.Distribution(this, 'PreviewDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // SPA를 위한 캐시 정책
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      // SPA 라우팅: 404를 index.html로 리다이렉트
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      defaultRootObject: 'index.html',
      comment: `Preview 환경 - PR #${prNumber}`,
    });

    // --- 빌드 결과물을 S3에 배포 ---
    new s3deploy.BucketDeployment(this, 'DeployPreview', {
      sources: [s3deploy.Source.asset(buildOutputPath)],
      destinationBucket: bucket,
      distribution,
      // 배포 시 CloudFront 캐시 무효화
      distributionPaths: ['/*'],
    });

    // --- 출력값: PR 댓글에 사용할 URL ---
    this.distributionUrl = `https://${distribution.distributionDomainName}`;

    new cdk.CfnOutput(this, 'PreviewUrl', {
      value: this.distributionUrl,
      description: `PR #${prNumber} Preview URL`,
    });

    // --- 태그: FinOps를 위한 비용 추적 ---
    cdk.Tags.of(this).add('Environment', 'preview');
    cdk.Tags.of(this).add('PRNumber', prNumber);
    cdk.Tags.of(this).add('ManagedBy', 'cdk');
    cdk.Tags.of(this).add('AutoCleanup', 'true');
  }
}
```

### 1.3 CDK App 엔트리포인트

```typescript
// bin/preview-app.ts
import * as cdk from 'aws-cdk-lib';
import { PreviewStack } from '../lib/preview-stack';

const app = new cdk.App();

// PR 번호는 환경변수로 전달
const prNumber = process.env.PR_NUMBER;
if (!prNumber) {
  throw new Error('PR_NUMBER 환경변수가 필요합니다.');
}

new PreviewStack(app, `PreviewStack-PR-${prNumber}`, {
  prNumber,
  buildOutputPath: './dist',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1', // CloudFront는 us-east-1 권장
  },
});
```

### 1.4 GitHub Actions 워크플로우: Preview 생성 및 삭제

```yaml
# .github/workflows/preview.yml
name: PR Preview 환경 관리

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  id-token: write    # OIDC 인증용
  contents: read
  pull-requests: write # PR 댓글 작성용

env:
  AWS_REGION: us-east-1
  NODE_VERSION: '20'

jobs:
  # --- Preview 환경 배포 (PR 열림/업데이트 시) ---
  deploy-preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: 코드 체크아웃
        uses: actions/checkout@v4

      - name: Node.js 설정
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 의존성 설치
        run: npm ci

      - name: 프로젝트 빌드
        run: npm run build
        env:
          # Preview 환경 전용 환경변수
          VITE_API_BASE_URL: https://api-preview.example.com
          VITE_ENV: preview

      - name: AWS OIDC 인증
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: ${{ env.AWS_REGION }}

      - name: CDK 배포
        id: cdk-deploy
        run: |
          npx cdk deploy PreviewStack-PR-${{ github.event.pull_request.number }} \
            --require-approval never \
            --outputs-file cdk-outputs.json
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}

      - name: Preview URL 추출
        id: preview-url
        run: |
          # CDK 출력에서 Preview URL 추출
          PREVIEW_URL=$(cat cdk-outputs.json | jq -r '.[].PreviewUrl')
          echo "url=$PREVIEW_URL" >> $GITHUB_OUTPUT

      - name: PR에 Preview URL 댓글 작성
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request.number;
            const previewUrl = '${{ steps.preview-url.outputs.url }}';

            // 기존 봇 댓글이 있으면 업데이트, 없으면 새로 생성
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber,
            });

            const botComment = comments.data.find(
              (c) => c.user.type === 'Bot' && c.body.includes('Preview 환경')
            );

            const body = [
              '## 🚀 Preview 환경이 준비되었습니다!',
              '',
              `**URL**: ${previewUrl}`,
              '',
              `> PR #${prNumber} | 최종 업데이트: ${new Date().toISOString()}`,
              '',
              '---',
              '_이 댓글은 PR이 업데이트될 때마다 자동으로 갱신됩니다._',
            ].join('\n');

            if (botComment) {
              // 기존 댓글 업데이트
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body,
              });
            } else {
              // 새 댓글 생성
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body,
              });
            }

  # --- Preview 환경 삭제 (PR 닫힘 시) ---
  destroy-preview:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: 코드 체크아웃
        uses: actions/checkout@v4

      - name: Node.js 설정
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 의존성 설치
        run: npm ci

      - name: AWS OIDC 인증
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: ${{ env.AWS_REGION }}

      - name: CDK 스택 삭제
        run: |
          npx cdk destroy PreviewStack-PR-${{ github.event.pull_request.number }} \
            --force
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}

      - name: PR에 삭제 완료 댓글
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: '🧹 Preview 환경이 정상적으로 삭제되었습니다.',
            });
```

---

## 2. 보안 표준: CloudFront OAC

### 2.1 OAI vs OAC 차이점

| 항목 | OAI (레거시) | OAC (권장) |
| :--- | :--- | :--- |
| **AWS 권장 여부** | 비권장 (레거시) | 권장 (2022년 8월~) |
| **서명 프로토콜** | CloudFront 전용 서명 | SigV4 표준 서명 |
| **S3 SSE-KMS 지원** | 불가 | 가능 |
| **S3 POST/PUT 요청** | 불가 (GET/HEAD만) | 모든 HTTP 메서드 지원 |
| **리전별 S3 지원** | 일부 제한 | 모든 리전 지원 |
| **CDK L2 지원** | `S3Origin` (자동 OAI) | `S3BucketOrigin.withOriginAccessControl()` |

> **핵심**: `origins.S3Origin(bucket)`을 사용하면 CDK가 자동으로 **OAI**를 생성합니다. OAC를 사용하려면 반드시 `S3BucketOrigin.withOriginAccessControl()`을 사용하거나, L1 escape hatch로 직접 설정해야 합니다.

### 2.2 CDK v2 OAC 설정 (L2 Construct 방식 - 권장)

CDK v2.130.0 이상에서는 `S3BucketOrigin.withOriginAccessControl()`이 L2로 지원됩니다.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

// S3 버킷 생성 (퍼블릭 액세스 완전 차단)
const bucket = new s3.Bucket(this, 'WebBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
});

// S3BucketOrigin.withOriginAccessControl()은 OAC를 자동 생성하고
// S3 버킷 정책도 자동으로 추가해줍니다
const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  defaultRootObject: 'index.html',
});
```

### 2.3 CDK OAC 설정 (L1 Escape Hatch 방식)

CDK 버전이 낮거나 세밀한 제어가 필요한 경우 L1 리소스를 직접 조작합니다.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';

// S3 버킷 (퍼블릭 액세스 차단 필수)
const bucket = new s3.Bucket(this, 'WebBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});

// OAC L1 리소스 직접 생성
const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
  originAccessControlConfig: {
    name: 'web-oac',
    originAccessControlOriginType: 's3',
    signingBehavior: 'always',
    signingProtocol: 'sigv4',
  },
});

// CloudFront Distribution (origin 없이 L1으로 직접 구성)
const distribution = new cloudfront.CfnDistribution(this, 'WebDist', {
  distributionConfig: {
    enabled: true,
    defaultRootObject: 'index.html',
    origins: [
      {
        id: 's3Origin',
        domainName: bucket.bucketRegionalDomainName,
        originAccessControlId: oac.attrId,
        s3OriginConfig: {
          // OAC 사용 시 빈 문자열로 설정 (OAI 비활성화)
          originAccessIdentity: '',
        },
      },
    ],
    defaultCacheBehavior: {
      targetOriginId: 's3Origin',
      viewerProtocolPolicy: 'redirect-to-https',
      allowedMethods: ['GET', 'HEAD'],
      cachedMethods: ['GET', 'HEAD'],
      forwardedValues: {
        queryString: false,
      },
    },
  },
});

// S3 버킷 정책: CloudFront OAC만 접근 허용
bucket.addToResourcePolicy(
  new iam.PolicyStatement({
    sid: 'AllowCloudFrontOAC',
    effect: iam.Effect.ALLOW,
    principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
    actions: ['s3:GetObject'],
    resources: [bucket.arnForObjects('*')],
    conditions: {
      StringEquals: {
        // CloudFront Distribution ARN으로 제한
        'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${distribution.attrId}`,
      },
    },
  })
);
```

---

## 3. GitHub Actions 연동: OIDC 보안

더 이상 IAM 사용자의 `AWS_ACCESS_KEY_ID`를 GitHub Secrets에 저장하지 마세요. **OIDC(OpenID Connect)**를 통해 임시 자격 증명을 사용하는 것이 보안 표준입니다.

### 3.1 OIDC가 더 안전한 이유

| 항목 | IAM Access Key | OIDC |
| :--- | :--- | :--- |
| **자격 증명 유형** | 영구 키 (장기 노출 위험) | 임시 토큰 (15분~1시간) |
| **유출 시 영향** | 키 교체 전까지 무제한 접근 | 토큰 만료 후 자동 무효화 |
| **관리 부담** | 주기적 키 교체 필요 | 관리 불필요 |
| **최소 권한** | Secrets에 저장된 키 하나로 모든 곳 접근 | 리포지토리/브랜치 단위 제한 가능 |

### 3.2 OIDC IAM 역할 CDK 코드

```typescript
// lib/github-oidc-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GithubOidcStackProps extends cdk.StackProps {
  /** GitHub 조직 이름 */
  githubOrg: string;
  /** GitHub 리포지토리 이름 */
  githubRepo: string;
}

export class GithubOidcStack extends cdk.Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GithubOidcStackProps) {
    super(scope, id, props);

    const { githubOrg, githubRepo } = props;

    // 1단계: GitHub OIDC Provider 등록 (계정당 한 번만 생성)
    const oidcProvider = new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      // GitHub의 OIDC 인증서 썸프린트
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // 2단계: GitHub Actions가 Assume할 IAM 역할 생성
    this.deployRole = new iam.Role(this, 'GitHubActionsDeployRole', {
      roleName: 'GitHubActionsDeployRole',
      // 최대 세션 시간 (CDK 배포가 오래 걸릴 수 있음)
      maxSessionDuration: cdk.Duration.hours(1),
      // Trust Policy: GitHub OIDC Provider를 신뢰
      assumedBy: new iam.WebIdentityPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            // 대상 서비스 제한
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            // 특정 리포지토리의 모든 브랜치에서만 사용 가능
            // 더 엄격하게 하려면: `repo:${githubOrg}/${githubRepo}:ref:refs/heads/main`
            'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:*`,
          },
        }
      ),
    });

    // 3단계: 역할에 필요한 권한 부여
    // CDK 배포를 위한 CloudFormation 권한
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CDKDeployPermissions',
        effect: iam.Effect.ALLOW,
        actions: [
          // CloudFormation
          'cloudformation:*',
          // S3 (CDK 에셋 및 Preview 버킷)
          's3:*',
          // CloudFront
          'cloudfront:*',
          // IAM (CDK가 역할 생성 시 필요)
          'iam:*',
          // Lambda (BucketDeployment 커스텀 리소스용)
          'lambda:*',
          // SSM (CDK 부트스트랩 버전 확인)
          'ssm:GetParameter',
          // STS (CDK 내부에서 사용)
          'sts:AssumeRole',
        ],
        resources: ['*'],
      })
    );

    // 출력: GitHub Actions에서 사용할 Role ARN
    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: this.deployRole.roleArn,
      description: 'GitHub Actions에서 role-to-assume에 설정할 ARN',
    });
  }
}
```

### 3.3 GitHub Actions OIDC 설정

```yaml
# .github/workflows/deploy.yml
permissions:
  id-token: write   # OIDC 토큰 발급을 위해 필수
  contents: read

steps:
  - name: AWS OIDC 인증
    uses: aws-actions/configure-aws-credentials@v4
    with:
      # 주의: role-to-assume (role-to-arn이 아님!)
      # 형식: arn:aws:iam::<계정ID>:role/<역할이름>
      role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
      aws-region: us-east-1
      # (선택) 세션 이름으로 어떤 워크플로우가 사용했는지 추적
      role-session-name: github-actions-${{ github.run_id }}
```

### 3.4 OIDC 설정 단계별 가이드

1. **CDK 부트스트랩**: 대상 AWS 계정에서 `npx cdk bootstrap` 실행
2. **OIDC 스택 배포**: `GithubOidcStack`을 먼저 배포하여 OIDC Provider와 IAM Role 생성
3. **Role ARN 복사**: CDK 출력에서 `DeployRoleArn` 값을 확인
4. **GitHub 워크플로우 설정**: `role-to-assume`에 복사한 ARN 입력
5. **권한 검증**: 워크플로우에 `permissions.id-token: write` 확인
6. **테스트**: 간단한 `aws sts get-caller-identity`로 인증 확인

> **흔한 실수**: `role-to-arn`으로 오타 내는 경우가 많습니다. 정확히 `role-to-assume`입니다. 또한 계정 ID에서 하이픈(-) 없이 12자리 숫자만 입력해야 합니다.

---

## 4. FinOps: 비용 가드레일 (Cost Guardrail)

Preview 환경은 기하급수적으로 늘어날 수 있습니다. 자동 삭제 로직은 필수입니다.

### 4.1 핵심 원칙

- **CDK Removal Policy**: 모든 Preview 리소스는 `RemovalPolicy.DESTROY`를 적용합니다.
- **GitHub Webhook**: PR이 닫히거나 머지될 때 `cdk destroy`가 실행되도록 워크플로우를 구성합니다.
- **스케줄링 정리**: 가끔 삭제되지 않고 남은 리소스를 위해 매일 새벽 3시에 유휴 리소스를 일괄 삭제하는 Lambda 함수를 운영합니다.

### 4.2 태깅 전략 (Cost Allocation Tags)

모든 Preview 리소스에 일관된 태그를 적용하여 비용을 추적합니다.

```typescript
// 스택 레벨에서 태그 일괄 적용
cdk.Tags.of(this).add('Project', 'frontend-preview');
cdk.Tags.of(this).add('Environment', 'preview');
cdk.Tags.of(this).add('PRNumber', prNumber);
cdk.Tags.of(this).add('Team', 'frontend');
cdk.Tags.of(this).add('ManagedBy', 'cdk');
cdk.Tags.of(this).add('AutoCleanup', 'true');
// 생성 시점 기록 (비용 분석 및 정리 기준)
cdk.Tags.of(this).add('CreatedAt', new Date().toISOString().split('T')[0]);
```

> **AWS Cost Explorer 팁**: AWS 콘솔 > Billing > Cost Allocation Tags에서 위 태그들을 활성화해야 비용 리포트에 반영됩니다.

### 4.3 Lambda 기반 유휴 리소스 정리 함수

```typescript
// lib/cleanup-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CleanupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 정리 Lambda 함수
    const cleanupFn = new lambda.Function(this, 'PreviewCleanupFn', {
      functionName: 'preview-environment-cleanup',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      code: lambda.Code.fromInline(`
const { CloudFormationClient, ListStacksCommand, DeleteStackCommand } = require('@aws-sdk/client-cloudformation');

exports.handler = async () => {
  const cf = new CloudFormationClient({});

  // PreviewStack-PR- 접두사를 가진 스택 목록 조회
  const result = await cf.send(new ListStacksCommand({
    StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE'],
  }));

  const previewStacks = (result.StackSummaries || [])
    .filter(s => s.StackName.startsWith('PreviewStack-PR-'));

  const now = new Date();
  let deletedCount = 0;

  for (const stack of previewStacks) {
    const createdAt = new Date(stack.CreationTime);
    const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);

    // 3일 이상 된 Preview 스택 자동 삭제
    if (ageInDays > 3) {
      console.log('삭제 대상:', stack.StackName, '생성일:', createdAt.toISOString());
      await cf.send(new DeleteStackCommand({ StackName: stack.StackName }));
      deletedCount++;
    }
  }

  console.log('총 삭제된 스택:', deletedCount);
  return { deletedCount };
};
      `),
    });

    // Lambda에 CloudFormation 스택 삭제 권한 부여
    cleanupFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cloudformation:ListStacks',
          'cloudformation:DeleteStack',
          'cloudformation:DescribeStacks',
          // 스택 삭제 시 하위 리소스 정리에 필요한 권한
          's3:*',
          'cloudfront:*',
          'lambda:*',
          'iam:*',
        ],
        resources: ['*'],
      })
    );

    // 매일 새벽 3시(KST, UTC 18시)에 실행
    new events.Rule(this, 'CleanupSchedule', {
      ruleName: 'preview-cleanup-schedule',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '18', // UTC 18:00 = KST 03:00
        weekDay: '*',
      }),
      targets: [new targets.LambdaFunction(cleanupFn)],
    });
  }
}
```

### 4.4 CloudWatch 비용 알람 설정

```typescript
// lib/cost-alarm-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

export class CostAlarmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 비용 알림을 받을 SNS 토픽
    const costAlertTopic = new sns.Topic(this, 'CostAlertTopic', {
      topicName: 'preview-cost-alert',
      displayName: 'Preview 환경 비용 알림',
    });

    // 이메일 구독 (실제 이메일로 교체)
    costAlertTopic.addSubscription(
      new subscriptions.EmailSubscription('team@example.com')
    );

    // 예상 비용이 임계값을 초과하면 알람 발생
    // 주의: EstimatedCharges 메트릭은 us-east-1 리전에서만 사용 가능
    const costAlarm = new cloudwatch.Alarm(this, 'PreviewCostAlarm', {
      alarmName: 'preview-environment-cost-alarm',
      alarmDescription: 'Preview 환경 예상 비용이 $50을 초과했습니다',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Billing',
        metricName: 'EstimatedCharges',
        dimensionsMap: {
          Currency: 'USD',
        },
        statistic: 'Maximum',
        period: cdk.Duration.hours(6),
      }),
      // 예상 비용이 $50 초과 시 알람
      threshold: 50,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    costAlarm.addAlarmAction(new actions.SnsAction(costAlertTopic));

    // Preview 스택 개수 모니터링 (CloudFormation 스택 수 기반)
    // 커스텀 메트릭으로 별도 Lambda에서 퍼블리시하는 것을 권장
  }
}
```

---

## 5. CDK 프로젝트 구조와 베스트 프랙티스

### 5.1 권장 프로젝트 구조

```
infra/
├── bin/
│   └── app.ts                  # CDK App 엔트리포인트
├── lib/
│   ├── constructs/             # 재사용 가능한 L3 Construct
│   │   ├── secure-bucket.ts    # OAC 설정이 포함된 S3 버킷
│   │   ├── spa-distribution.ts # SPA용 CloudFront 배포
│   │   └── tagged-stack.ts     # 태그 자동 적용 기본 스택
│   ├── preview-stack.ts        # Preview 환경 스택
│   ├── cleanup-stack.ts        # 리소스 정리 스택
│   ├── github-oidc-stack.ts    # OIDC 인증 스택
│   └── cost-alarm-stack.ts     # 비용 알람 스택
├── test/
│   ├── preview-stack.test.ts   # 스택 스냅샷/유닛 테스트
│   └── constructs/
│       └── secure-bucket.test.ts
├── cdk.json
├── package.json
└── tsconfig.json
```

### 5.2 재사용 가능한 Construct 패턴

```typescript
// lib/constructs/secure-bucket.ts
// 보안 설정이 사전 적용된 S3 버킷 Construct
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface SecureBucketProps {
  /** 버킷 이름 접두사 */
  bucketPrefix: string;
  /** Preview 환경 여부 (true면 DESTROY 정책 적용) */
  isPreview?: boolean;
}

export class SecureBucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: SecureBucketProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${props.bucketPrefix}-${cdk.Aws.ACCOUNT_ID}`,
      // 퍼블릭 액세스 완전 차단
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // 암호화 필수
      encryption: s3.BucketEncryption.S3_MANAGED,
      // SSL 강제
      enforceSSL: true,
      // Preview 환경이면 자동 삭제, 프로덕션이면 유지
      removalPolicy: props.isPreview
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.isPreview ?? false,
      // 버전 관리 (프로덕션 권장)
      versioned: !props.isPreview,
    });
  }
}
```

### 5.3 CDK 스택 테스트

```typescript
// test/preview-stack.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { PreviewStack } from '../lib/preview-stack';

describe('PreviewStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new PreviewStack(app, 'TestPreviewStack', {
      prNumber: '42',
      buildOutputPath: './test-fixtures/dist',
    });
    template = Template.fromStack(stack);
  });

  test('S3 버킷이 퍼블릭 액세스 차단 설정과 함께 생성된다', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('CloudFront OAC가 생성된다', () => {
    template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
      OriginAccessControlConfig: {
        OriginAccessControlOriginType: 's3',
        SigningBehavior: 'always',
        SigningProtocol: 'sigv4',
      },
    });
  });

  test('모든 리소스에 Environment 태그가 있다', () => {
    // 스택 전체에 태그가 적용되었는지 확인
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'Environment', Value: 'preview' }),
      ]),
    });
  });

  test('RemovalPolicy가 DESTROY로 설정된다', () => {
    // DeletionPolicy가 Delete로 설정되어 있는지 확인
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Delete',
    });
  });

  test('스냅샷 테스트', () => {
    // 인프라 변경 사항을 스냅샷으로 감지
    expect(template.toJSON()).toMatchSnapshot();
  });
});
```

### 5.4 CDK 베스트 프랙티스 요약

| 원칙 | 설명 |
| :--- | :--- |
| **환경별 스택 분리** | `preview`, `staging`, `production` 스택을 분리하여 blast radius 최소화 |
| **L3 Construct 재사용** | 공통 패턴(SecureBucket, SPADistribution)을 Construct로 추출 |
| **스냅샷 테스트 필수** | 인프라 변경이 의도한 것인지 스냅샷으로 검증 |
| **cdk diff 먼저** | `cdk deploy` 전에 항상 `cdk diff`로 변경 사항 확인 |
| **태그 일괄 적용** | `cdk.Tags.of(this).add()`로 스택 레벨에서 태그 관리 |
| **환경변수로 설정 주입** | 하드코딩 대신 `process.env`나 `cdk.json`의 context 활용 |

---

## 6. WAF 설정으로 Preview 환경 보호

Preview 환경은 외부에 노출되면 안 됩니다. WAF(Web Application Firewall)와 Lambda@Edge를 통해 접근을 제한합니다.

### 6.1 IP 기반 접근 제한 (WAF)

```typescript
// lib/waf-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export class PreviewWafStack extends cdk.Stack {
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 회사 IP 대역 허용 목록
    const allowedIpSet = new wafv2.CfnIPSet(this, 'AllowedIPs', {
      name: 'preview-allowed-ips',
      scope: 'CLOUDFRONT', // CloudFront용 WAF는 반드시 CLOUDFRONT 스코프
      ipAddressVersion: 'IPV4',
      addresses: [
        '203.0.113.0/24',   // 회사 사무실 IP 대역 (예시)
        '198.51.100.0/24',  // VPN IP 대역 (예시)
      ],
    });

    // WAF Web ACL: 허용된 IP만 접근 가능
    const webAcl = new wafv2.CfnWebACL(this, 'PreviewWebAcl', {
      name: 'preview-environment-waf',
      scope: 'CLOUDFRONT',
      defaultAction: { block: {} }, // 기본적으로 모든 요청 차단
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'previewWafMetric',
      },
      rules: [
        {
          name: 'AllowOfficeIP',
          priority: 0,
          action: { allow: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'allowOfficeIpMetric',
          },
          statement: {
            ipSetReferenceStatement: {
              arn: allowedIpSet.attrArn,
            },
          },
        },
      ],
    });

    this.webAclArn = webAcl.attrArn;

    new cdk.CfnOutput(this, 'WebAclArn', {
      value: webAcl.attrArn,
      description: 'CloudFront Distribution에 연결할 WAF Web ACL ARN',
    });
  }
}
```

### 6.2 CloudFront Distribution에 WAF 연결

```typescript
// Preview 스택에서 WAF 연결
const distribution = new cloudfront.Distribution(this, 'PreviewDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  // WAF Web ACL 연결
  webAclId: wafWebAclArn, // WAF 스택에서 전달받은 ARN
  defaultRootObject: 'index.html',
});
```

### 6.3 Lambda@Edge를 활용한 Basic Auth

IP 제한 외에 Basic Authentication을 추가로 적용할 수 있습니다.

```typescript
// lib/basic-auth-edge.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export class BasicAuthEdge extends Construct {
  public readonly functionVersion: lambda.Version;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Lambda@Edge 함수 (us-east-1에 배포 필수)
    const authFn = new lambda.Function(this, 'BasicAuthFn', {
      functionName: 'preview-basic-auth',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  // 환경변수 대신 하드코딩 (Lambda@Edge는 환경변수 미지원)
  // 실제 운영에서는 SSM Parameter Store에서 조회하거나
  // 빌드 시점에 주입하는 것을 권장
  const VALID_USER = 'preview';
  const VALID_PASS = 'your-secure-password-here';

  const authHeader = headers.authorization;

  if (!authHeader || !authHeader[0]) {
    return {
      status: '401',
      statusDescription: 'Unauthorized',
      headers: {
        'www-authenticate': [{ key: 'WWW-Authenticate', value: 'Basic realm="Preview Environment"' }],
      },
      body: 'Authentication Required',
    };
  }

  const encoded = authHeader[0].value.split(' ')[1];
  const decoded = Buffer.from(encoded, 'base64').toString();
  const [user, pass] = decoded.split(':');

  if (user === VALID_USER && pass === VALID_PASS) {
    return request; // 인증 성공 시 원래 요청 전달
  }

  return {
    status: '403',
    statusDescription: 'Forbidden',
    body: 'Invalid credentials',
  };
};
      `),
    });

    // Lambda@Edge는 버전을 지정해야 함
    this.functionVersion = authFn.currentVersion;
  }
}
```

```typescript
// CloudFront Distribution에 Basic Auth Lambda@Edge 연결
const basicAuth = new BasicAuthEdge(this, 'BasicAuth');

const distribution = new cloudfront.Distribution(this, 'PreviewDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    // Viewer Request 단계에서 인증 처리
    edgeLambdas: [
      {
        functionVersion: basicAuth.functionVersion,
        eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
      },
    ],
  },
});
```

---

## 7. 도메인 및 SSL 인증서 관리

### 7.1 Route 53 호스팅 영역과 ACM 인증서

```typescript
// lib/domain-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export interface DomainStackProps extends cdk.StackProps {
  /** 루트 도메인 (예: example.com) */
  domainName: string;
}

export class DomainStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: DomainStackProps) {
    super(scope, id, props);

    const { domainName } = props;

    // 기존 호스팅 영역 조회 (이미 Route 53에 등록되어 있다고 가정)
    this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });

    // ACM 인증서 생성 (CloudFront용은 반드시 us-east-1)
    // 와일드카드 인증서로 모든 Preview 서브도메인 커버
    this.certificate = new acm.Certificate(this, 'WildcardCert', {
      domainName: `*.preview.${domainName}`,
      // 루트 도메인도 SAN으로 추가
      subjectAlternativeNames: [`preview.${domainName}`],
      // DNS 검증 (자동 레코드 생성)
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'CloudFront에 연결할 ACM 인증서 ARN',
    });
  }
}
```

### 7.2 Preview 환경에 커스텀 도메인 연결

```typescript
// Preview 스택에서 커스텀 도메인 설정
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

// 와일드카드 인증서와 호스팅 영역은 DomainStack에서 가져옴
const previewDomain = `pr-${prNumber}.preview.example.com`;

const distribution = new cloudfront.Distribution(this, 'PreviewDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  // 커스텀 도메인 설정
  domainNames: [previewDomain],
  certificate: certificate, // ACM 와일드카드 인증서
  defaultRootObject: 'index.html',
});

// Route 53 A 레코드 (CloudFront Alias)
new route53.ARecord(this, 'PreviewAliasRecord', {
  zone: hostedZone,
  recordName: previewDomain,
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution)
  ),
  // Preview 리소스이므로 짧은 TTL
  ttl: cdk.Duration.minutes(5),
});
```

### 7.3 도메인 관리 주의사항

| 항목 | 설명 |
| :--- | :--- |
| **ACM 리전** | CloudFront에 연결할 인증서는 반드시 **us-east-1**에 생성 |
| **DNS 검증** | 수동 이메일 검증 대신 DNS 검증 사용 (자동화 가능) |
| **와일드카드** | `*.preview.example.com` 하나로 모든 PR 커버 |
| **TTL** | Preview 도메인은 짧은 TTL(5분) 권장 (빠른 생성/삭제 반영) |
| **정리** | 스택 삭제 시 Route 53 레코드도 함께 삭제되도록 `removalPolicy` 확인 |

---

## 8. 주의사항 및 흔한 실수

### 8.1 RemovalPolicy 누락

가장 흔하고 치명적인 실수입니다. Preview 스택을 삭제해도 S3 버킷이 남아 비용이 계속 발생합니다.

```typescript
// 잘못된 예: RemovalPolicy 미설정 (기본값은 RETAIN)
const bucket = new s3.Bucket(this, 'Bucket');

// 올바른 예: Preview 리소스는 반드시 DESTROY
const bucket = new s3.Bucket(this, 'Bucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true, // 버킷 내 객체도 함께 삭제
});
```

> **주의**: `autoDeleteObjects: true`를 설정하면 CDK가 Lambda 기반 커스텀 리소스를 생성합니다. 이 Lambda도 `RemovalPolicy.DESTROY`가 필요하지만 CDK가 자동으로 처리합니다.

### 8.2 S3Origin과 OAC 혼동

```typescript
// 잘못된 예: S3Origin은 OAI를 자동 생성 (레거시)
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
const origin = new S3Origin(bucket);

// 올바른 예: S3BucketOrigin.withOriginAccessControl()로 OAC 사용
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
const origin = S3BucketOrigin.withOriginAccessControl(bucket);
```

### 8.3 CloudFront + ACM 리전 불일치

```typescript
// 잘못된 예: 서울 리전에 인증서 생성
const cert = new acm.Certificate(this, 'Cert', { /* ... */ });
// -> CloudFront에 연결하면 "certificate not in us-east-1" 에러

// 올바른 예: 스택 자체를 us-east-1에 배포하거나 cross-region 참조 사용
// 방법 1: 스택을 us-east-1에 배포
new DomainStack(app, 'DomainStack', {
  env: { region: 'us-east-1' },
  domainName: 'example.com',
});

// 방법 2: DnsValidatedCertificate로 cross-region 생성 (deprecated 주의)
```

### 8.4 Stack Drift 감지

CDK 외부에서 리소스를 수동 변경하면 "Stack Drift"가 발생합니다.

```bash
# 드리프트 감지 명령
aws cloudformation detect-stack-drift --stack-name PreviewStack-PR-123
aws cloudformation describe-stack-drift-detection-status --stack-drift-detection-id <id>

# 드리프트가 발견되면 CDK로 재배포하여 상태 동기화
npx cdk deploy PreviewStack-PR-123 --force
```

**예방 원칙**: AWS 콘솔에서 CDK 관리 리소스를 절대 수동으로 수정하지 마세요.

### 8.5 비용 폭탄 방지 체크리스트

| 위험 요인 | 예방 방법 |
| :--- | :--- |
| Preview 스택 미삭제 | 정리 Lambda + CloudWatch 알람 |
| CloudFront 무효화 남용 | `distributionPaths: ['/*']` 대신 변경된 경로만 지정 |
| Lambda@Edge 배포 잔존 | Lambda@Edge는 CloudFront 복제본 삭제까지 기다려야 함 (수 시간 소요) |
| S3 버전 관리 활성화 | Preview 환경에서는 버전 관리 비활성화 |
| 불필요한 WAF 규칙 | WAF는 요청 수 기반 과금이므로 Preview에는 최소한의 규칙만 |

### 8.6 CDK Bootstrap 누락

CDK를 처음 사용하는 AWS 계정/리전에서는 반드시 bootstrap을 먼저 실행해야 합니다.

```bash
# CDK Bootstrap (계정/리전당 한 번만 실행)
npx cdk bootstrap aws://123456789012/us-east-1

# 여러 계정에 배포하는 경우 각각 bootstrap 필요
npx cdk bootstrap aws://123456789012/us-east-1 aws://123456789012/ap-northeast-2
```

---

## 9. AI 기반 인프라 설계 워크플로우

AI(Claude Code)에게 인프라 코드를 요청할 때 다음과 같은 맥락을 제공하세요.

> **Prompt 예시**: "React 19 앱을 위한 AWS CDK v2 코드를 작성해줘. S3와 CloudFront를 사용하고, 보안을 위해 OAC를 적용해야 해. 특히 PR 번호를 받아서 동적으로 버킷 이름을 생성하고, PR이 닫힐 때 리소스가 완전히 삭제되도록 RemovalPolicy를 설정해줘."

### 효과적인 AI 프롬프트 팁

| 제공할 정보 | 예시 |
| :--- | :--- |
| **CDK 버전** | "CDK v2.170.0 사용 중" |
| **보안 요구사항** | "OAC 필수, OAI 사용 금지" |
| **비용 제약** | "Preview 환경이라 RemovalPolicy.DESTROY 필수" |
| **네이밍 규칙** | "스택 이름은 `PreviewStack-PR-{번호}` 형식" |
| **기존 인프라** | "Route 53에 example.com 호스팅 영역이 이미 있음" |

---

## ✅ 체크리스트

### 보안
- [ ] IAM Access Key 대신 **OIDC 역할**을 사용 중인가요?
- [ ] `role-to-assume` 형식이 `arn:aws:iam::<12자리계정ID>:role/<역할이름>` 인가요?
- [ ] CloudFront에 OAI 대신 **OAC**를 적용했나요?
- [ ] `S3Origin` 대신 `S3BucketOrigin.withOriginAccessControl()`을 사용했나요?
- [ ] S3 버킷에 `blockPublicAccess: BLOCK_ALL`이 설정되었나요?
- [ ] Preview 환경에 WAF IP 제한 또는 Basic Auth가 적용되어 있나요?
- [ ] ACM 인증서가 us-east-1 리전에 생성되었나요?

### 비용 관리 (FinOps)
- [ ] 모든 Preview 리소스에 `removalPolicy: cdk.RemovalPolicy.DESTROY`가 설정되었나요?
- [ ] `autoDeleteObjects: true`가 S3 버킷에 설정되었나요?
- [ ] PR 닫힘 시 자동 `cdk destroy`가 워크플로우에 구성되었나요?
- [ ] 유휴 리소스 정리 Lambda가 스케줄링되어 있나요?
- [ ] CloudWatch 비용 알람이 설정되었나요?
- [ ] 모든 리소스에 비용 추적용 태그가 적용되었나요?

### 운영
- [ ] PR URL이 자동으로 댓글에 남겨지도록 구성되었나요?
- [ ] CDK 스냅샷 테스트가 작성되었나요?
- [ ] `cdk diff`를 배포 전에 확인하는 프로세스가 있나요?
- [ ] CDK Bootstrap이 대상 계정/리전에 완료되었나요?
- [ ] Stack Drift를 주기적으로 점검하고 있나요?
- [ ] Lambda@Edge 함수 삭제 시 복제본 정리 대기 프로세스가 있나요?

### 참고 가이드
- [11. CI/CD 파이프라인 표준](./11_CICD_파이프라인_표준.md) - 배포 파이프라인 설정
- [12. CloudFront 캐시 전략](./12_CloudFront_캐시_전략.md) - 캐시 무효화 및 최적화
- [08. 성능 최적화 가이드](./08_성능_최적화_가이드.md) - 프론트엔드 성능 측정
- [14. 배포 프로세스 체크리스트](./14_배포_프로세스_체크리스트.md) - 배포 전 점검 사항
- [06. 웹 보안 심화 가이드](./06_웹_보안_심화_가이드.md) - 보안 정책 전반
