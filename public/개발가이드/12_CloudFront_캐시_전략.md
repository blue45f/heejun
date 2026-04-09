# 12. CloudFront 캐시 전략 (2025-2026 Edition)

| 분류 | 인프라 & CI/CD | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [10. 인프라](./10_인프라_및_AWS_CDK_가이드.md), [08. 성능 최적화](./08_성능_최적화_가이드.md), [11. CI/CD](./11_CICD_파이프라인_표준.md), [14. 배포 프로세스](./14_배포_프로세스_체크리스트.md) | **AI 도구** | CloudFront, Brotli |
| **핵심 테마** | Edge Computing, Cache Policy, Invalidation, Compression, Multi-Origin | **Update** | 2025.04 |

---

> **"사용자에게 가장 가까운 곳에서 데이터를 전달하라. 캐싱은 최고의 성능 최적화 도구다."**
> 본 가이드는 AWS CloudFront를 활용하여 정적 자산(Static Assets)의 전송 속도를 극대화하고 비용을 효율화하는 전략을 다룹니다.

---

## 1. 캐시 정책(Cache Policy) 설계

파일의 성격에 따라 각기 다른 캐시 정책을 적용해야 합니다.

### 1.1 정적 자산 (Immutable Assets)

빌드 시 해시가 포함된 파일(`main.[hash].js`, `style.[hash].css`)은 영구적으로 캐싱할 수 있습니다.

*   **TTL**: `Max TTL` (1년 이상)
*   **전략**: 브라우저와 CDN 모두에서 영구 캐시. 새로운 배포 시 파일 이름이 바뀌므로 무효화가 필요 없습니다.

#### CDK CachePolicy 코드 (Immutable Assets)

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Duration } from 'aws-cdk-lib';

// 해시가 포함된 정적 자산용 캐시 정책 (1년 캐시)
const immutableCachePolicy = new cloudfront.CachePolicy(this, 'ImmutableAssetsCachePolicy', {
  cachePolicyName: 'ImmutableAssets-1Year',
  comment: '해시 기반 정적 자산 (JS, CSS, 이미지) - 영구 캐시',
  defaultTtl: Duration.days(365),
  minTtl: Duration.days(365),
  maxTtl: Duration.days(365),
  // 쿼리 스트링, 헤더, 쿠키는 캐시 키에 포함하지 않음
  cookieBehavior: cloudfront.CacheCookieBehavior.none(),
  headerBehavior: cloudfront.CacheHeaderBehavior.none(),
  queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
  // Brotli/Gzip 압축 지원
  enableAcceptEncodingBrotli: true,
  enableAcceptEncodingGzip: true,
});
```

### 1.2 엔트리 파일 (Entry File)

`index.html`과 같이 파일 이름이 고정된 파일은 절대 캐싱해서는 안 됩니다.

*   **TTL**: `0` (no-cache)
*   **전략**: 항상 원본 서버(S3)에서 최신 파일을 가져오도록 설정하여 배포 즉시 반영되게 합니다.

#### CDK CachePolicy 코드 (No-Cache Entry Files)

```typescript
// index.html 등 엔트리 파일용 캐시 정책 (캐시 안 함)
const noCachePolicy = new cloudfront.CachePolicy(this, 'NoCacheCachePolicy', {
  cachePolicyName: 'NoCache-EntryFiles',
  comment: 'index.html 등 엔트리 파일 - 항상 원본에서 가져오기',
  defaultTtl: Duration.seconds(0),
  minTtl: Duration.seconds(0),
  maxTtl: Duration.seconds(0),
  cookieBehavior: cloudfront.CacheCookieBehavior.none(),
  headerBehavior: cloudfront.CacheHeaderBehavior.none(),
  queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
});
```

### 1.3 S3 업로드 시 Cache-Control 헤더 설정

S3에 업로드할 때 파일 유형별로 적절한 `Cache-Control` 헤더를 지정합니다.

```bash
#!/bin/bash
# deploy-to-s3.sh - 파일 유형별 Cache-Control 헤더를 설정하며 S3에 업로드

S3_BUCKET="s3://my-frontend-bucket"
BUILD_DIR="./dist"

# 1) 해시 포함 정적 자산 - 1년 캐시, immutable 플래그
aws s3 sync "$BUILD_DIR/assets" "$S3_BUCKET/assets" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

# 2) index.html - 캐시 금지, 항상 최신 파일 제공
aws s3 cp "$BUILD_DIR/index.html" "$S3_BUCKET/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

# 3) favicon, manifest 등 루트 파일 - 짧은 TTL (5분)
aws s3 cp "$BUILD_DIR/favicon.ico" "$S3_BUCKET/favicon.ico" \
  --cache-control "public, max-age=300"

aws s3 cp "$BUILD_DIR/manifest.json" "$S3_BUCKET/manifest.json" \
  --cache-control "public, max-age=300"

echo "S3 업로드 완료: 파일 유형별 Cache-Control 적용됨"
```

### 1.4 CDK ResponseHeadersPolicy (보안 헤더)

CloudFront 응답에 보안 헤더를 자동으로 추가합니다.

```typescript
// 보안 헤더 응답 정책
const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
  responseHeadersPolicyName: 'SecurityHeaders-Production',
  comment: '프로덕션 보안 헤더 정책',
  securityHeadersBehavior: {
    // HTTPS 강제 (2년)
    strictTransportSecurity: {
      accessControlMaxAge: Duration.days(730),
      includeSubdomains: true,
      preload: true,
      override: true,
    },
    // Content-Type 스니핑 방지
    contentTypeOptions: {
      override: true,
    },
    // 클릭재킹 방지
    frameOptions: {
      frameOption: cloudfront.HeadersFrameOption.DENY,
      override: true,
    },
    // XSS 필터 활성화
    xssProtection: {
      protection: true,
      modeBlock: true,
      override: true,
    },
    // Referrer 정책
    referrerPolicy: {
      referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
      override: true,
    },
    // CSP (Content Security Policy)
    contentSecurityPolicy: {
      contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
      override: true,
    },
  },
});
```

---

## 2. Edge Computing: CloudFront Functions (JS 2.0)

Edge 지역(PoP)에서 실행되는 초경량 JavaScript 함수로 요청을 가공합니다.

### 2.1 URL Rewrite (SPA 라우팅)

확장자가 없는 요청을 `/index.html`로 연결하여 SPA 클라이언트 라우팅을 지원합니다.

```javascript
// cloudfront-functions/url-rewrite.js
// SPA 라우팅: 파일 확장자가 없는 요청을 index.html로 리라이트
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // 파일 확장자가 있는 요청은 그대로 통과 (정적 자산)
  if (uri.match(/\.\w+$/)) {
    return request;
  }

  // /api 경로는 리라이트하지 않음 (API 오리진으로 전달)
  if (uri.startsWith('/api')) {
    return request;
  }

  // 그 외 모든 경로를 /index.html로 리라이트
  request.uri = '/index.html';
  return request;
}
```

#### CDK에서 CloudFront Function 연결

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as fs from 'fs';

// CloudFront Function 생성
const urlRewriteFunction = new cloudfront.Function(this, 'UrlRewriteFunction', {
  functionName: 'spa-url-rewrite',
  comment: 'SPA 라우팅을 위한 URL 리라이트',
  code: cloudfront.FunctionCode.fromFile({
    filePath: 'cloudfront-functions/url-rewrite.js',
  }),
  runtime: cloudfront.FunctionRuntime.JS_2_0,
});
```

### 2.2 보안 헤더 주입 (Viewer Response)

응답에 보안 헤더를 동적으로 추가합니다. ResponseHeadersPolicy와 병행하여 커스텀 헤더를 넣을 때 유용합니다.

```javascript
// cloudfront-functions/security-headers.js
// 응답에 보안 헤더를 동적으로 추가하는 함수
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  // Permissions-Policy (카메라, 마이크, 위치 정보 제한)
  headers['permissions-policy'] = {
    value: 'camera=(), microphone=(), geolocation=(self)',
  };

  // 캐시 상태를 디버깅용 커스텀 헤더로 추가
  headers['x-served-by'] = { value: 'CloudFront-Edge' };

  // Cross-Origin 정책
  headers['cross-origin-opener-policy'] = { value: 'same-origin' };
  headers['cross-origin-embedder-policy'] = { value: 'require-corp' };

  return response;
}
```

### 2.3 리다이렉트 함수

특정 조건(국가, 경로 패턴)에 따라 다른 URL로 리다이렉트합니다.

```javascript
// cloudfront-functions/redirect.js
// www 서브도메인을 apex 도메인으로 리다이렉트
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;

  // www → apex 도메인 리다이렉트
  if (host.startsWith('www.')) {
    var newHost = host.replace('www.', '');
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://' + newHost + request.uri },
      },
    };
  }

  // 레거시 경로 리다이렉트 (/old-path → /new-path)
  var redirectMap = {
    '/old-dashboard': '/dashboard',
    '/legacy-api': '/api/v2',
    '/about-us': '/about',
  };

  if (redirectMap[request.uri]) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://' + host + redirectMap[request.uri] },
      },
    };
  }

  return request;
}
```

---

## 3. 압축 알고리즘: Brotli & Gzip

압축은 전송 시간을 획기적으로 줄여줍니다.

*   **Brotli (br)**: Gzip보다 압축률이 15~20% 높으며, 현대 브라우저에서 표준으로 지원합니다.
*   **CloudFront 설정**: CloudFront에서 자동으로 파일을 압축하도록 설정하거나, 빌드 타임에 미리 압축하여 S3에 업로드(Pre-compression)합니다.

### 3.1 Vite 빌드 시 사전 압축 (Pre-compression)

`vite-plugin-compression`을 사용하여 빌드 타임에 Brotli, Gzip 파일을 생성합니다.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    // Gzip 압축 (.gz 파일 생성)
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // 1KB 이상 파일만 압축
      deleteOriginFile: false, // 원본 파일 유지
    }),
    // Brotli 압축 (.br 파일 생성)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],
  build: {
    // 청크 사이즈 경고 임계값
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // 해시 기반 파일명으로 캐시 버스팅
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
});
```

### 3.2 사전 압축 파일 S3 업로드 스크립트

사전 압축된 파일을 `Content-Encoding` 헤더와 함께 S3에 업로드합니다.

```bash
#!/bin/bash
# upload-compressed.sh - 사전 압축된 파일을 Content-Encoding 헤더와 함께 업로드

S3_BUCKET="s3://my-frontend-bucket"
BUILD_DIR="./dist"

# Brotli 압축 파일 업로드 (.br → 원본 확장자로 업로드, Content-Encoding: br 설정)
find "$BUILD_DIR" -name "*.js.br" | while read br_file; do
  # .br 확장자를 제거한 원본 경로 계산
  original="${br_file%.br}"
  s3_key="${original#$BUILD_DIR/}"

  aws s3 cp "$br_file" "$S3_BUCKET/$s3_key" \
    --content-encoding "br" \
    --content-type "application/javascript" \
    --cache-control "public, max-age=31536000, immutable"
done

find "$BUILD_DIR" -name "*.css.br" | while read br_file; do
  original="${br_file%.br}"
  s3_key="${original#$BUILD_DIR/}"

  aws s3 cp "$br_file" "$S3_BUCKET/$s3_key" \
    --content-encoding "br" \
    --content-type "text/css" \
    --cache-control "public, max-age=31536000, immutable"
done

echo "Brotli 사전 압축 파일 업로드 완료"
```

### 3.3 Brotli vs Gzip 압축 비교

| 파일 유형 | 원본 크기 | Gzip 크기 | Brotli 크기 | Brotli 절감률 |
| :--- | :--- | :--- | :--- | :--- |
| React 번들 (JS) | 350 KB | 105 KB (70%) | 89 KB (75%) | **15% 추가 절감** |
| CSS 번들 | 80 KB | 18 KB (78%) | 15 KB (81%) | **17% 추가 절감** |
| HTML (index) | 12 KB | 4.2 KB (65%) | 3.5 KB (71%) | **17% 추가 절감** |
| JSON 응답 | 45 KB | 12 KB (73%) | 10 KB (78%) | **17% 추가 절감** |

> **핵심**: Brotli는 Gzip 대비 평균 15~20% 더 작은 파일을 생성합니다. 특히 텍스트 기반 자산(JS, CSS, HTML)에서 효과가 극대화됩니다.

---

## 4. 캐시 무효화(Invalidation)와 비용

모든 파일을 무효화(`/*`)하는 것은 비용이 발생하며 CDN 성능을 저하시킵니다.

*   **지정 무효화**: 변경된 파일(`index.html`)만 명시적으로 무효화합니다.
*   **패턴 무효화**: 특정 버전 폴더(`/v1/*`)만 무효화합니다.
*   **버저닝 활용**: 파일 이름에 해시를 포함하는 버저닝을 최우선으로 고려하여 무효화 요청 자체를 최소화하세요.

### 4.1 AWS CLI 무효화 명령

```bash
# 특정 파일만 무효화 (비용 효율적)
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/index.html" "/manifest.json"

# 특정 디렉토리 패턴 무효화
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/api/config/*"

# 전체 무효화 (비용 주의! 월 1,000건 이후 건당 $0.005)
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"

# 무효화 상태 확인
aws cloudfront get-invalidation \
  --distribution-id E1234567890ABC \
  --id I1234567890ABC
```

### 4.2 CDK 배포 파이프라인에서 자동 무효화

```typescript
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

// S3 배포 + CloudFront 자동 무효화
new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
  sources: [s3deploy.Source.asset('./dist')],
  destinationBucket: siteBucket,
  distribution: cloudfrontDistribution,
  // index.html만 무효화 (해시 파일은 이름이 바뀌므로 불필요)
  distributionPaths: ['/index.html', '/manifest.json'],
  // 메모리 제한 설정 (큰 빌드 결과물 대응)
  memoryLimit: 512,
});
```

### 4.3 비용 가이드

| 항목 | 무료 범위 | 초과 비용 |
| :--- | :--- | :--- |
| 무효화 경로 | 월 1,000건 무료 | 건당 $0.005 |
| `/*` 와일드카드 | **1건으로 카운트** | 하지만 캐시 전체 리셋으로 성능 저하 |
| 권장 전략 | `index.html`만 무효화 | 해시 기반 자산은 무효화 불필요 |

> **비용 최적화 팁**: 해시 기반 파일명을 사용하면 무효화 요청을 `index.html` 1건으로 줄일 수 있어 사실상 무료입니다.

---

## 5. CDK로 완성하는 캐시 정책 전체 코드

모든 설정을 하나의 CDK Stack으로 통합한 완성 코드입니다.

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Duration } from 'aws-cdk-lib';

export class CloudFrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ──────────────────────────────────────────────
    // 1. S3 버킷 (정적 자산 저장소)
    // ──────────────────────────────────────────────
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: 'my-frontend-production',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // 퍼블릭 접근 차단
      removalPolicy: cdk.RemovalPolicy.RETAIN, // 스택 삭제 시 버킷 유지
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ──────────────────────────────────────────────
    // 2. 캐시 정책 정의
    // ──────────────────────────────────────────────

    // 정적 자산용 (해시 파일명, 1년 캐시)
    const immutableCachePolicy = new cloudfront.CachePolicy(this, 'ImmutableCachePolicy', {
      cachePolicyName: `${id}-ImmutableAssets`,
      comment: '해시 기반 정적 자산 - 1년 영구 캐시',
      defaultTtl: Duration.days(365),
      minTtl: Duration.days(365),
      maxTtl: Duration.days(365),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    // 엔트리 파일용 (index.html, 캐시 안 함)
    const noCachePolicy = new cloudfront.CachePolicy(this, 'NoCachePolicy', {
      cachePolicyName: `${id}-NoCache`,
      comment: 'index.html 등 엔트리 파일 - 캐시 안 함',
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(0),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    });

    // ──────────────────────────────────────────────
    // 3. 보안 응답 헤더 정책
    // ──────────────────────────────────────────────
    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      responseHeadersPolicyName: `${id}-SecurityHeaders`,
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(730),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        xssProtection: { protection: true, modeBlock: true, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
      },
    });

    // ──────────────────────────────────────────────
    // 4. CloudFront Functions
    // ──────────────────────────────────────────────
    const urlRewriteFunction = new cloudfront.Function(this, 'UrlRewrite', {
      functionName: `${id}-spa-url-rewrite`,
      comment: 'SPA 라우팅을 위한 URL 리라이트',
      code: cloudfront.FunctionCode.fromFile({
        filePath: 'cloudfront-functions/url-rewrite.js',
      }),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // ──────────────────────────────────────────────
    // 5. OAC (Origin Access Control)
    // ──────────────────────────────────────────────
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      signing: cloudfront.Signing.SIGV4_ALWAYS,
    });

    // ──────────────────────────────────────────────
    // 6. CloudFront Distribution
    // ──────────────────────────────────────────────
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(siteBucket, {
      originAccessControl: oac,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: '프론트엔드 프로덕션 배포',
      defaultRootObject: 'index.html',

      // 기본 동작 (index.html 등 엔트리 파일)
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: noCachePolicy,
        responseHeadersPolicy: securityHeaders,
        compress: true,
        functionAssociations: [
          {
            function: urlRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },

      // 추가 동작: 정적 자산 (해시 파일명)
      additionalBehaviors: {
        'assets/*': {
          origin: s3Origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: immutableCachePolicy,
          responseHeadersPolicy: securityHeaders,
          compress: true,
        },
      },

      // 커스텀 에러 응답 (SPA 404 → index.html)
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
      ],

      // 가격 등급 (아시아 포함)
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,

      // HTTP/2, HTTP/3 활성화
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,

      // 최소 SSL 프로토콜 버전
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // ──────────────────────────────────────────────
    // 7. S3 배포 + 자동 무효화
    // ──────────────────────────────────────────────
    new s3deploy.BucketDeployment(this, 'DeployAssets', {
      sources: [s3deploy.Source.asset('./dist')],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/index.html', '/manifest.json'],
      memoryLimit: 512,
    });

    // ──────────────────────────────────────────────
    // 8. 출력값
    // ──────────────────────────────────────────────
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront 배포 도메인',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront 배포 ID (무효화 시 사용)',
    });
  }
}
```

---

## 6. 멀티 오리진 설정

S3(정적 자산)와 ALB(API)를 하나의 CloudFront Distribution에서 제공하는 구성입니다.

### 6.1 아키텍처

```
사용자 요청
  │
  ├── /assets/*      → S3 Origin (정적 자산, 1년 캐시)
  ├── /api/*         → ALB Origin (API 서버, 캐시 안 함)
  ├── /static/*      → S3 Origin (공용 파일, 1시간 캐시)
  └── /* (기본)      → S3 Origin (index.html, 캐시 안 함)
```

### 6.2 CDK 멀티 오리진 코드

```typescript
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

// ALB 오리진 (API 서버)
const apiOrigin = new origins.HttpOrigin('api.example.com', {
  protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
  customHeaders: {
    'X-Custom-Header': 'cloudfront-api-origin', // 오리진 식별용
  },
  connectionTimeout: Duration.seconds(5),
  readTimeout: Duration.seconds(30),
});

// API 전용 캐시 정책 (캐시 안 함, 모든 헤더/쿠키 전달)
const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
  cachePolicyName: `${id}-ApiNoCache`,
  comment: 'API 요청 - 캐시 안 함, 모든 헤더/쿠키 전달',
  defaultTtl: Duration.seconds(0),
  minTtl: Duration.seconds(0),
  maxTtl: Duration.seconds(0),
  cookieBehavior: cloudfront.CacheCookieBehavior.all(),
  headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
    'Authorization',
    'Content-Type',
    'Accept',
  ),
  queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
});

// API 오리진 요청 정책 (모든 헤더 전달)
const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ApiOriginRequestPolicy', {
  originRequestPolicyName: `${id}-ApiOriginRequest`,
  cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
  headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
    'Authorization',
    'Content-Type',
    'Accept',
    'X-Request-Id',
  ),
  queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
});

// Distribution에 API 동작 추가
const distribution = new cloudfront.Distribution(this, 'MultiOriginDist', {
  defaultBehavior: {
    origin: s3Origin,
    cachePolicy: noCachePolicy,
    // ... (위 섹션 5와 동일)
  },
  additionalBehaviors: {
    // 정적 자산 (1년 캐시)
    'assets/*': {
      origin: s3Origin,
      cachePolicy: immutableCachePolicy,
      compress: true,
    },
    // API 요청 (캐시 안 함, ALB로 전달)
    'api/*': {
      origin: apiOrigin,
      cachePolicy: apiCachePolicy,
      originRequestPolicy: apiOriginRequestPolicy,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL, // GET, POST, PUT, DELETE 등
    },
  },
});
```

---

## 7. 캐시 디버깅 및 모니터링

### 7.1 x-cache 헤더로 캐시 적중 확인

```bash
# CloudFront 응답 헤더에서 캐시 적중 여부 확인
curl -I https://cdn.example.com/assets/main.abc123.js

# 주요 확인 헤더:
# x-cache: Hit from cloudfront     → 캐시 적중 (엣지에서 바로 제공)
# x-cache: Miss from cloudfront    → 캐시 미스 (오리진에서 가져옴)
# x-cache: RefreshHit from cloudfront → 만료 후 재검증 성공

# 여러 엣지 로케이션에서 테스트 (--resolve로 특정 PoP 지정)
curl -sI https://cdn.example.com/index.html | grep -E "(x-cache|age|cache-control|x-amz-cf-pop)"
```

### 7.2 CloudWatch 메트릭 모니터링

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

// 캐시 적중률 모니터링 대시보드
const dashboard = new cloudwatch.Dashboard(this, 'CacheDashboard', {
  dashboardName: 'CloudFront-Cache-Monitoring',
});

// 캐시 적중률 위젯
dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: '캐시 적중률 (Cache Hit Rate)',
    left: [
      new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: 'CacheHitRate',
        dimensionsMap: {
          DistributionId: distribution.distributionId,
          Region: 'Global',
        },
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
    ],
    width: 12,
  }),

  // 요청 수 위젯
  new cloudwatch.GraphWidget({
    title: '총 요청 수',
    left: [
      new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: 'Requests',
        dimensionsMap: {
          DistributionId: distribution.distributionId,
          Region: 'Global',
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
    ],
    width: 12,
  }),
);

// 캐시 적중률이 80% 이하로 떨어지면 알림
const cacheHitAlarm = new cloudwatch.Alarm(this, 'LowCacheHitRate', {
  alarmName: 'CloudFront-LowCacheHitRate',
  alarmDescription: '캐시 적중률이 80% 이하로 떨어졌습니다. 캐시 정책을 점검하세요.',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/CloudFront',
    metricName: 'CacheHitRate',
    dimensionsMap: {
      DistributionId: distribution.distributionId,
      Region: 'Global',
    },
    statistic: 'Average',
    period: Duration.minutes(15),
  }),
  threshold: 80,
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
  evaluationPeriods: 3,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
```

### 7.3 캐시 적중률 분석 스크립트

```bash
#!/bin/bash
# check-cache-ratio.sh - 최근 24시간 캐시 적중률 조회

DISTRIBUTION_ID="E1234567890ABC"
START_TIME=$(date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ")
END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "=== CloudFront 캐시 적중률 리포트 ==="
echo "기간: $START_TIME ~ $END_TIME"
echo ""

# 캐시 적중률 조회
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=$DISTRIBUTION_ID Name=Region,Value=Global \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --period 3600 \
  --statistics Average \
  --output table

echo ""
echo "목표: 90% 이상 유지"
echo "80% 이하 시: index.html 캐시 정책 및 쿼리 스트링 설정 점검 필요"
```

---

## 8. 배포 시 캐시 전략

올바른 헤더와 함께 업로드한 후, 최소한의 무효화만 수행하는 배포 스크립트입니다.

### 8.1 완전한 배포 스크립트

```bash
#!/bin/bash
# deploy.sh - 프로덕션 배포: 파일 유형별 Cache-Control + 최소 무효화
set -euo pipefail

S3_BUCKET="my-frontend-production"
DISTRIBUTION_ID="E1234567890ABC"
BUILD_DIR="./dist"

echo "========================================="
echo "  프론트엔드 프로덕션 배포 시작"
echo "========================================="

# 1단계: 빌드
echo "[1/5] 빌드 실행..."
npm run build

# 2단계: 해시 포함 정적 자산 업로드 (1년 캐시, immutable)
echo "[2/5] 정적 자산 업로드 (assets/)..."
aws s3 sync "$BUILD_DIR/assets" "s3://$S3_BUCKET/assets" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete \
  --size-only  # 변경된 파일만 업로드 (해시가 다르면 파일명이 다르므로 새 파일로 인식)

# 3단계: index.html 업로드 (캐시 안 함)
echo "[3/5] index.html 업로드..."
aws s3 cp "$BUILD_DIR/index.html" "s3://$S3_BUCKET/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8"

# 4단계: 기타 루트 파일 업로드 (짧은 TTL)
echo "[4/5] 기타 루트 파일 업로드..."
for file in favicon.ico manifest.json robots.txt; do
  if [ -f "$BUILD_DIR/$file" ]; then
    aws s3 cp "$BUILD_DIR/$file" "s3://$S3_BUCKET/$file" \
      --cache-control "public, max-age=300"
  fi
done

# 5단계: index.html만 무효화 (해시 자산은 이름이 바뀌므로 무효화 불필요)
echo "[5/5] CloudFront 무효화 (index.html만)..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/index.html" "/manifest.json" \
  --query 'Invalidation.Id' \
  --output text)

echo ""
echo "========================================="
echo "  배포 완료!"
echo "  무효화 ID: $INVALIDATION_ID"
echo "========================================="

# 무효화 완료 대기 (선택)
echo "무효화 완료 대기 중..."
aws cloudfront wait invalidation-completed \
  --distribution-id "$DISTRIBUTION_ID" \
  --id "$INVALIDATION_ID"

echo "무효화 완료. 배포가 전 세계에 반영되었습니다."
```

### 8.2 CI/CD 파이프라인 연동 (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to CloudFront
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # OIDC 토큰 발급
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      # AWS 자격 증명 (OIDC 기반, 키 없이 안전하게)
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-2

      # 정적 자산 업로드 (1년 캐시)
      - name: Upload static assets
        run: |
          aws s3 sync dist/assets s3://${{ secrets.S3_BUCKET }}/assets \
            --cache-control "public, max-age=31536000, immutable" \
            --delete

      # index.html 업로드 (캐시 안 함)
      - name: Upload index.html
        run: |
          aws s3 cp dist/index.html s3://${{ secrets.S3_BUCKET }}/index.html \
            --cache-control "no-cache, no-store, must-revalidate" \
            --content-type "text/html; charset=utf-8"

      # CloudFront 무효화 (index.html만)
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
            --paths "/index.html" "/manifest.json"
```

---

## 9. 주의사항 및 흔한 실수

### 9.1 index.html 캐싱 사고

**문제**: `index.html`에 장기 캐시를 설정하면 새 배포가 반영되지 않습니다.

```
잘못된 설정:
  index.html → Cache-Control: public, max-age=31536000   ← 절대 금지!

올바른 설정:
  index.html   → Cache-Control: no-cache, no-store, must-revalidate
  main.abc.js  → Cache-Control: public, max-age=31536000, immutable
```

> **원리**: `index.html`이 캐싱되면 새 해시 파일명(`main.xyz.js`)을 참조하는 최신 HTML을 가져올 수 없어, 사용자에게 구버전이 계속 제공됩니다.

### 9.2 Content-Encoding 헤더 누락

**문제**: 사전 압축(Pre-compressed) 파일을 S3에 올리면서 `Content-Encoding` 헤더를 빠뜨리면 브라우저가 압축 파일을 그대로 렌더링하려고 시도합니다.

```bash
# 잘못된 예: Content-Encoding 누락
aws s3 cp main.abc.js.br s3://bucket/assets/main.abc.js  # Brotli 바이너리가 그대로 노출!

# 올바른 예: Content-Encoding 명시
aws s3 cp main.abc.js.br s3://bucket/assets/main.abc.js \
  --content-encoding "br" \
  --content-type "application/javascript"
```

### 9.3 와일드카드 무효화 남용

**문제**: `/*` 무효화는 전체 캐시를 날려 일시적으로 오리진에 트래픽이 집중됩니다.

| 무효화 방식 | 영향 범위 | 비용 | 성능 영향 |
| :--- | :--- | :--- | :--- |
| `/index.html` | 1개 파일 | 무료 (월 1,000건 이내) | 없음 |
| `/assets/*` | 수백 개 파일 | 1건으로 카운트 | 캐시 리셋 → 일시 부하 |
| `/*` | 전체 파일 | 1건으로 카운트 | **전체 캐시 리셋 → 오리진 부하 급증** |

> **권장**: 해시 기반 자산은 무효화할 필요 없으므로 `/index.html`만 무효화하세요.

### 9.4 CloudFront 자동 압축 vs 사전 압축

| 방식 | 장점 | 단점 |
| :--- | :--- | :--- |
| **CloudFront 자동 압축** | 설정이 간편, 별도 빌드 불필요 | 압축 수준이 고정(Brotli q4), 최대 압축이 아님 |
| **사전 압축 (Pre-compression)** | 최대 압축률(Brotli q11), 더 작은 파일 | 빌드 시간 증가, 업로드 스크립트 필요 |

> **권장**: 트래픽이 많은 프로덕션에서는 사전 압축(Brotli q11)을 사용하고, 개발/스테이징에서는 CloudFront 자동 압축을 활용하세요.

### 9.5 쿼리 스트링 캐시 키 혼란

```
문제: 쿼리 스트링이 캐시 키에 포함되면 같은 파일인데 캐시가 분리됩니다.

  /assets/main.abc.js?v=1  → 캐시 A
  /assets/main.abc.js?v=2  → 캐시 B  (같은 파일인데 캐시 미스!)

해결: 해시 파일명을 사용하면 쿼리 스트링이 필요 없으므로,
      캐시 정책에서 쿼리 스트링을 캐시 키에서 제외하세요.
```

---

## 💡 AI와 함께하는 CDN 튜닝 워크플로우

AI(Claude Code)에게 캐시 효율 분석을 요청하세요.

> **Prompt**: "우리 서비스의 CloudFront 캐시 적중률(Cache Hit Ratio)이 낮아. index.html과 JS/CSS 파일들의 캐시 정책을 어떻게 분리해야 최적인지 가이드라인을 작성해줘. 특히 빌드 결과물에 해시가 포함되어 있다면 이를 활용한 무한 캐싱 전략도 포함해줘."

---

## ✅ 체크리스트

### 캐시 정책

- [ ] `index.html`에 `no-cache, no-store, must-revalidate` 정책이 적용되었나요?
- [ ] 해시가 포함된 정적 자산의 TTL이 1년(31536000초) 이상이며 `immutable` 플래그가 설정되었나요?
- [ ] CachePolicy에서 `enableAcceptEncodingBrotli`와 `enableAcceptEncodingGzip`이 활성화되었나요?
- [ ] 쿼리 스트링이 캐시 키에서 제외되었나요? (해시 파일명 사용 시)

### Edge Computing

- [ ] SPA 라우팅을 위한 URL 리라이트가 CloudFront Function에서 처리되나요?
- [ ] CloudFront Function 런타임이 JS 2.0으로 설정되었나요?
- [ ] www → apex 리다이렉트 등 필요한 리다이렉트 규칙이 적용되었나요?

### 보안 헤더

- [ ] HSTS, X-Content-Type-Options, X-Frame-Options 헤더가 ResponseHeadersPolicy에 포함되어 있나요?
- [ ] Content-Security-Policy가 서비스 요구사항에 맞게 설정되었나요?
- [ ] Permissions-Policy로 불필요한 브라우저 API 접근이 차단되었나요?

### 압축

- [ ] **Brotli** 압축이 활성화되어 데이터 전송량이 최적화되었나요?
- [ ] 사전 압축 파일 업로드 시 `Content-Encoding` 헤더가 올바르게 설정되었나요?
- [ ] 1KB 미만의 작은 파일은 압축에서 제외되었나요? (오버헤드 방지)

### 배포 및 무효화

- [ ] 배포 스크립트가 파일 유형별로 다른 `Cache-Control` 헤더를 설정하나요?
- [ ] 무효화 대상이 `index.html`로 최소화되어 있나요?
- [ ] `/*` 와일드카드 무효화를 사용하지 않나요?

### 모니터링

- [ ] CloudWatch에서 캐시 적중률(CacheHitRate) 메트릭을 모니터링하고 있나요?
- [ ] 캐시 적중률이 80% 이하로 떨어질 때 알림이 설정되었나요?
- [ ] 배포 후 `curl -I`로 응답 헤더를 확인하는 절차가 있나요?

### 멀티 오리진

- [ ] API 요청(`/api/*`)은 캐시 없이 ALB로 전달되나요?
- [ ] API 오리진에 Authorization 등 필요한 헤더가 전달되나요?
- [ ] 각 오리진별 동작(Behavior)이 올바르게 분리되어 있나요?
