# CloudFront 캐시 사용 표준 (2026) -- AI 중심

## 목차

1. [AI 기반 캐시 적중률 분석 및 TTL 최적화](#1-ai-기반-캐시-적중률-분석-및-ttl-최적화)
2. [AI 기반 캐시 무효화 영향 범위 분석](#2-ai-기반-캐시-무효화-영향-범위-분석)
3. [Multi-CDN 캐시 전략](#3-multi-cdn-캐시-전략)
4. [캐시 키 설계 패턴](#4-캐시-키-설계-패턴)
5. [CloudFront Functions vs Lambda@Edge 비교](#5-cloudfront-functions-vs-lambdaedge-비교)
6. [Origin Shield 전략](#6-origin-shield-전략)
7. [HTTP/3 & Security Headers](#7-http3--security-headers)
8. [실시간 로그 분석 파이프라인](#8-실시간-로그-분석-파이프라인)
9. [체크리스트](#9-체크리스트)

---

## 1. AI 기반 캐시 적중률 분석 및 TTL 최적화

CloudFront 액세스 로그를 AI에 전달하여 캐시 적중률(Cache Hit Ratio) 저하 원인을 자동으로 진단하고, 경로별 최적 TTL을 도출한다.

### 1.1 캐시 적중률 데이터 수집

```typescript
// scripts/cache-hit-analysis.ts
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

interface CacheAnalysis {
  totalRequests: number;
  hitRatio: number;
  byPath: Record<string, { hits: number; misses: number; ratio: number }>;
  byContentType: Record<string, { hits: number; misses: number; ratio: number }>;
  topMissedPaths: Array<{ path: string; missCount: number; ratio: number }>;
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

function analyzeCachePerformance(entries: AccessLogEntry[]): CacheAnalysis {
  const total = entries.length;
  const hits = entries.filter((e) => e.cacheResult === "Hit" || e.cacheResult === "RefreshHit").length;

  // 경로별 분석
  const pathMap = new Map<string, { hits: number; misses: number }>();
  for (const entry of entries) {
    const pathKey = normalizePath(entry.uri);
    const current = pathMap.get(pathKey) ?? { hits: 0, misses: 0 };
    if (entry.cacheResult === "Hit" || entry.cacheResult === "RefreshHit") {
      current.hits++;
    } else {
      current.misses++;
    }
    pathMap.set(pathKey, current);
  }

  const byPath: CacheAnalysis["byPath"] = {};
  for (const [path, stats] of pathMap) {
    byPath[path] = {
      ...stats,
      ratio: stats.hits / (stats.hits + stats.misses),
    };
  }

  // Content-Type별 분석
  const typeMap = new Map<string, { hits: number; misses: number }>();
  for (const entry of entries) {
    const current = typeMap.get(entry.contentType) ?? { hits: 0, misses: 0 };
    if (entry.cacheResult === "Hit" || entry.cacheResult === "RefreshHit") {
      current.hits++;
    } else {
      current.misses++;
    }
    typeMap.set(entry.contentType, current);
  }

  const byContentType: CacheAnalysis["byContentType"] = {};
  for (const [type, stats] of typeMap) {
    byContentType[type] = {
      ...stats,
      ratio: stats.hits / (stats.hits + stats.misses),
    };
  }

  // Miss가 많은 경로 Top 20
  const topMissedPaths = Object.entries(byPath)
    .filter(([, stats]) => stats.misses > 10)
    .sort((a, b) => b[1].misses - a[1].misses)
    .slice(0, 20)
    .map(([path, stats]) => ({ path, missCount: stats.misses, ratio: stats.ratio }));

  return {
    totalRequests: total,
    hitRatio: hits / total,
    byPath,
    byContentType,
    topMissedPaths,
  };
}

function normalizePath(uri: string): string {
  // 해시 기반 파일명 정규화: /assets/main.a1b2c3.js -> /assets/main.[hash].js
  return uri.replace(/\.[a-f0-9]{6,16}\.(js|css|woff2?|png|jpg|svg)$/i, ".[hash].$1");
}

export { parseAccessLog, analyzeCachePerformance };
export type { AccessLogEntry, CacheAnalysis };
```

### 1.2 AI 프롬프트 예시 -- 캐시 적중률 분석

> **프롬프트 1: 캐시 적중률 저하 원인 진단**
>
> ```
> 다음은 CloudFront 액세스 로그에서 추출한 캐시 적중률 분석 결과이다.
> (1) 적중률이 낮은 경로 패턴의 원인을 추정하고,
> (2) 각 경로 패턴에 대한 최적 TTL을 권장하고,
> (3) 캐시 키에서 제거해야 할 불필요한 요소를 제안해줘.
>
> --- 분석 결과 ---
> 전체 적중률: 72.3%
> 경로별 Miss Top 10:
> {여기에 topMissedPaths 데이터 붙여넣기}
>
> Content-Type별 적중률:
> {여기에 byContentType 데이터 붙여넣기}
>
> 현재 캐시 정책:
> - /assets/*: max-age=31536000, immutable
> - /api/*: no-cache
> - /: max-age=0, s-maxage=60
> ```

> **프롬프트 2: TTL 최적화 CDK 코드 생성**
>
> ```
> 아래 경로별 트래픽 패턴과 콘텐츠 변경 주기를 분석하여,
> AWS CDK(TypeScript)로 CloudFront CachePolicy를 정의하는 코드를 생성해줘.
> 각 정책에 대해 TTL 결정 근거를 주석으로 설명해줘.
>
> --- 트래픽 패턴 ---
> /assets/*: 일 50만 요청, 콘텐츠 해시 기반 파일명, 변경 시 새 해시 생성
> /api/products: 일 10만 요청, 5분 간격 갱신
> /api/user/*: 일 8만 요청, 사용자별 개인화
> /index.html: 일 20만 요청, 배포 시마다 변경
> /images/*: 일 30만 요청, 거의 변경 없음
> ```

### 1.3 AI 분석 결과 기반 TTL 자동 적용

```typescript
// scripts/apply-ttl-optimization.ts
interface TtlRecommendation {
  pathPattern: string;
  currentTtl: number;
  recommendedTtl: number;
  reason: string;
  estimatedHitRatioGain: number;
}

interface CacheConfig {
  pathPattern: string;
  ttl: number;
  sMaxAge: number;
  staleWhileRevalidate: number;
  immutable: boolean;
}

function generateCacheHeaders(recommendations: TtlRecommendation[]): CacheConfig[] {
  return recommendations.map((rec) => {
    const isImmutable = rec.pathPattern.includes("[hash]") || rec.recommendedTtl >= 86400 * 365;

    return {
      pathPattern: rec.pathPattern,
      ttl: rec.recommendedTtl,
      sMaxAge: rec.recommendedTtl,
      staleWhileRevalidate: Math.min(rec.recommendedTtl, 3600),
      immutable: isImmutable,
    };
  });
}

function buildCacheControlHeader(config: CacheConfig): string {
  const directives: string[] = [];

  if (config.ttl === 0) {
    return "no-cache, no-store, must-revalidate";
  }

  directives.push(`max-age=${config.ttl}`);

  if (config.sMaxAge !== config.ttl) {
    directives.push(`s-maxage=${config.sMaxAge}`);
  }

  if (config.staleWhileRevalidate > 0) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  if (config.immutable) {
    directives.push("immutable");
  } else {
    directives.push("public");
  }

  return directives.join(", ");
}

export { generateCacheHeaders, buildCacheControlHeader };
export type { TtlRecommendation, CacheConfig };
```

---

## 2. AI 기반 캐시 무효화 영향 범위 분석

배포 시 캐시 무효화(Invalidation)의 영향 범위를 AI가 분석하여, 과도한 무효화를 방지하고 최소 범위 무효화를 자동 산출한다.

### 2.1 무효화 영향 분석 도구

```typescript
// scripts/invalidation-analyzer.ts
import { execSync } from "node:child_process";

interface InvalidationScope {
  paths: string[];
  estimatedCostUsd: number;
  affectedEdgeLocations: number;
  estimatedOriginLoadIncrease: number;
  recommendation: "proceed" | "narrow-scope" | "delay";
}

interface DeployDiff {
  added: string[];
  modified: string[];
  deleted: string[];
}

function getDeployDiff(fromCommit: string, toCommit: string): DeployDiff {
  const diffOutput = execSync(
    `git diff --name-status ${fromCommit}..${toCommit} -- dist/`,
    { encoding: "utf-8" },
  );

  const result: DeployDiff = { added: [], modified: [], deleted: [] };

  for (const line of diffOutput.split("\n").filter(Boolean)) {
    const [status, filePath] = line.split("\t");
    const cdnPath = "/" + filePath.replace("dist/", "");

    switch (status) {
      case "A":
        result.added.push(cdnPath);
        break;
      case "M":
        result.modified.push(cdnPath);
        break;
      case "D":
        result.deleted.push(cdnPath);
        break;
    }
  }

  return result;
}

function calculateInvalidationScope(
  diff: DeployDiff,
  dailyRequestMap: Record<string, number>,
): InvalidationScope {
  // 해시 기반 파일은 무효화 불필요 (새 URL 생성)
  const hashPattern = /\.[a-f0-9]{6,16}\.(js|css|woff2?|png|jpg|svg)$/i;
  const needsInvalidation = diff.modified
    .filter((path) => !hashPattern.test(path));

  // 삭제된 파일도 무효화 필요
  const allPaths = [...needsInvalidation, ...diff.deleted];

  // 와일드카드 최적화: 같은 디렉토리에 3개 이상이면 디렉토리 단위로 묶기
  const optimizedPaths = optimizeInvalidationPaths(allPaths);

  // CloudFront 무효화 비용: 처음 1,000 경로/월 무료, 이후 경로당 $0.005
  const estimatedCost = Math.max(0, optimizedPaths.length - 1000) * 0.005;

  // 영향 받는 요청 수 추정
  const affectedRequests = allPaths.reduce(
    (sum, path) => sum + (dailyRequestMap[path] ?? 0),
    0,
  );

  let recommendation: InvalidationScope["recommendation"] = "proceed";
  if (optimizedPaths.length > 100) {
    recommendation = "narrow-scope";
  } else if (affectedRequests > 1_000_000) {
    recommendation = "delay"; // 트래픽 적은 시간대로 지연
  }

  return {
    paths: optimizedPaths,
    estimatedCostUsd: estimatedCost,
    affectedEdgeLocations: 400, // CloudFront 글로벌 PoP 수
    estimatedOriginLoadIncrease: affectedRequests * 0.3, // Miss 시 오리진 요청 추정
    recommendation,
  };
}

function optimizeInvalidationPaths(paths: string[]): string[] {
  const dirCount = new Map<string, string[]>();

  for (const path of paths) {
    const dir = path.substring(0, path.lastIndexOf("/"));
    const existing = dirCount.get(dir) ?? [];
    existing.push(path);
    dirCount.set(dir, existing);
  }

  const optimized: string[] = [];
  for (const [dir, files] of dirCount) {
    if (files.length >= 3) {
      optimized.push(`${dir}/*`);
    } else {
      optimized.push(...files);
    }
  }

  return optimized;
}

function generateInvalidationPrompt(
  scope: InvalidationScope,
  diff: DeployDiff,
): string {
  return `다음 배포의 캐시 무효화 범위를 검토해줘.
과도한 무효화가 없는지 확인하고, 최적화 방안을 제시해줘.

--- 배포 변경사항 ---
추가: ${diff.added.length}건
수정: ${diff.modified.length}건
삭제: ${diff.deleted.length}건

--- 무효화 대상 ---
경로 수: ${scope.paths.length}
예상 비용: $${scope.estimatedCostUsd.toFixed(2)}
예상 오리진 부하 증가: ${scope.estimatedOriginLoadIncrease.toLocaleString()} 요청

--- 무효화 경로 ---
${scope.paths.join("\n")}

현재 추천: ${scope.recommendation}`;
}

export { getDeployDiff, calculateInvalidationScope, generateInvalidationPrompt };
export type { InvalidationScope, DeployDiff };
```

---

## 3. Multi-CDN 캐시 전략

### 3.1 Multi-CDN 아키텍처

단일 CloudFront에 의존하지 않고, 장애 대응 및 비용 최적화를 위해 Multi-CDN 전략을 구성한다.

```
사용자 요청
  │
  ▼
Route 53 (가중치/지연 시간 기반 라우팅)
  ├── 80% → CloudFront (Primary)
  │         ├── /assets/* → S3 (immutable)
  │         ├── /api/* → ALB
  │         └── / → S3 (SPA)
  └── 20% → Cloudflare (Secondary)
            └── 동일 S3 오리진 참조
```

### 3.2 CDK Multi-Origin 설정

```typescript
// cdk/multi-origin-distribution.ts
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class MultiOriginStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const assetBucket = s3.Bucket.fromBucketName(
      this, "AssetBucket", "frontend-assets-prod",
    );

    // 정적 에셋: 1년 캐시, immutable
    const immutableCachePolicy = new cloudfront.CachePolicy(
      this, "ImmutableCachePolicy", {
        cachePolicyName: "immutable-assets-1y",
        defaultTtl: cdk.Duration.days(365),
        maxTtl: cdk.Duration.days(365),
        minTtl: cdk.Duration.days(365),
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
      },
    );

    // HTML: 캐시 없음 (항상 최신)
    const noCachePolicy = new cloudfront.CachePolicy(
      this, "NoCachePolicy", {
        cachePolicyName: "no-cache-html",
        defaultTtl: cdk.Duration.seconds(0),
        maxTtl: cdk.Duration.seconds(0),
        minTtl: cdk.Duration.seconds(0),
      },
    );

    // API: SWR 패턴 (60초 캐시 + stale-while-revalidate)
    const swrCachePolicy = new cloudfront.CachePolicy(
      this, "SWRCachePolicy", {
        cachePolicyName: "swr-api-cache",
        defaultTtl: cdk.Duration.seconds(60),
        maxTtl: cdk.Duration.hours(1),
        minTtl: cdk.Duration.seconds(0),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Authorization"),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
      },
    );

    const distribution = new cloudfront.Distribution(
      this, "Distribution", {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(assetBucket),
          cachePolicy: noCachePolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        additionalBehaviors: {
          "/assets/*": {
            origin: origins.S3BucketOrigin.withOriginAccessControl(assetBucket),
            cachePolicy: immutableCachePolicy,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          },
          "/api/*": {
            origin: new origins.HttpOrigin("api.example.com"),
            cachePolicy: swrCachePolicy,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          },
        },
        enableLogging: true,
        httpVersion: cloudfront.HttpVersion.HTTP3,
      },
    );

    new cdk.CfnOutput(this, "DistributionDomain", {
      value: distribution.distributionDomainName,
    });
  }
}
```

### 3.3 CDN Failover 헬스체크

```typescript
// scripts/cdn-healthcheck.ts
interface CdnEndpoint {
  name: string;
  url: string;
  weight: number;
}

interface HealthCheckResult {
  endpoint: CdnEndpoint;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  cacheHit: boolean;
  headers: Record<string, string>;
}

async function checkCdnHealth(endpoint: CdnEndpoint): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    const response = await fetch(endpoint.url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });

    const latencyMs = performance.now() - start;
    const cacheStatus = response.headers.get("x-cache") ?? "";

    return {
      endpoint,
      status: response.ok ? "healthy" : "degraded",
      latencyMs,
      cacheHit: cacheStatus.includes("Hit"),
      headers: Object.fromEntries(response.headers),
    };
  } catch {
    return {
      endpoint,
      status: "down",
      latencyMs: performance.now() - start,
      cacheHit: false,
      headers: {},
    };
  }
}

async function runMultiCdnHealthCheck(
  endpoints: CdnEndpoint[],
): Promise<HealthCheckResult[]> {
  return Promise.all(endpoints.map(checkCdnHealth));
}

export { checkCdnHealth, runMultiCdnHealthCheck };
export type { CdnEndpoint, HealthCheckResult };
```

---

## 4. 캐시 키 설계 패턴

### 4.1 캐시 키 최소화 원칙

캐시 적중률을 높이려면 캐시 키에 포함되는 요소를 최소화해야 한다. 불필요한 Query String, Header, Cookie는 캐시 키에서 제외한다.

```typescript
// cdk/cache-key-policies.ts
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { Construct } from "constructs";

export function createCacheKeyPolicies(scope: Construct) {
  // 정적 에셋: 캐시 키 = URI만 (Query String, Header, Cookie 모두 무시)
  const staticAssetPolicy = new cloudfront.CachePolicy(
    scope, "StaticAssetCacheKey", {
      cachePolicyName: "static-asset-minimal-key",
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    },
  );

  // API: 캐시 키 = URI + 특정 Query String + Accept-Language
  const apiCachePolicy = new cloudfront.CachePolicy(
    scope, "ApiCacheKey", {
      cachePolicyName: "api-selective-key",
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        "Accept-Language",
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList(
        "page", "limit", "sort", "filter",
      ),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    },
  );

  // 개인화 콘텐츠: 캐시 키 = URI + Authorization (사용자별 캐시)
  const personalizedPolicy = new cloudfront.CachePolicy(
    scope, "PersonalizedCacheKey", {
      cachePolicyName: "personalized-user-key",
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Authorization"),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    },
  );

  return { staticAssetPolicy, apiCachePolicy, personalizedPolicy };
}
```

### 4.2 캐시 키 Anti-Pattern

| Anti-Pattern | 문제 | 해결 방안 |
|---|---|---|
| 모든 Query String 포함 | 캐시 적중률 급감 | 필요한 파라미터만 allowList |
| `Cookie` 전체 포함 | 사용자별 캐시 분리 | 필요한 쿠키만 allowList 또는 제외 |
| `User-Agent` 포함 | 수천 가지 변형 | CloudFront 디바이스 감지 헤더 사용 |
| 타임스탬프 Query String | `?t=1234` 등 | Cache-Busting은 파일명 해시로 대체 |
| `Authorization` 불필요 포함 | 공개 콘텐츠의 캐시 분리 | 공개/비공개 경로 분리 |

---

## 5. CloudFront Functions vs Lambda@Edge 비교

### 5.1 비교 매트릭스

| 항목 | CloudFront Functions | Lambda@Edge |
|------|---------------------|-------------|
| 실행 위치 | 450+ PoP (Edge) | 13개 리전 (Regional Edge Cache) |
| 실행 시간 제한 | 1ms | 5초 (Viewer) / 30초 (Origin) |
| 메모리 | 2MB | 128MB~10GB |
| 런타임 | JavaScript (ES 5.1) | Node.js, Python |
| 네트워크 접근 | 불가 | 가능 |
| 비용 | $0.10 / 100만 요청 | $0.60 / 100만 요청 + 실행 시간 |
| 적합 용도 | 헤더 조작, URL rewrite, 간단 인증 | 이미지 최적화, A/B 테스트, SSR |

### 5.2 CloudFront Function 예시: Security Headers + URL Rewrite

```typescript
// cloudfront-functions/security-headers.ts
// CloudFront Functions는 ES 5.1 문법을 사용해야 하지만,
// 여기서는 TypeScript 타입으로 구조를 정의한다.

interface CfEvent {
  request: {
    uri: string;
    headers: Record<string, { value: string }>;
    querystring: Record<string, { value: string }>;
  };
  response?: {
    headers: Record<string, { value: string }>;
    statusCode: number;
  };
}

// Viewer Response: Security Headers 삽입
function viewerResponse(event: CfEvent): CfEvent["response"] {
  const response = event.response!;
  const headers = response.headers;

  headers["strict-transport-security"] = {
    value: "max-age=63072000; includeSubDomains; preload",
  };
  headers["x-content-type-options"] = { value: "nosniff" };
  headers["x-frame-options"] = { value: "DENY" };
  headers["x-xss-protection"] = { value: "1; mode=block" };
  headers["referrer-policy"] = { value: "strict-origin-when-cross-origin" };
  headers["permissions-policy"] = {
    value: "camera=(), microphone=(), geolocation=(self)",
  };
  headers["content-security-policy"] = {
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
  };

  return response;
}

// Viewer Request: SPA URL Rewrite
function viewerRequest(event: CfEvent): CfEvent["request"] {
  const request = event.request;
  const uri = request.uri;

  // 확장자가 없으면 SPA의 index.html로 라우팅
  if (!uri.includes(".") && !uri.startsWith("/api/")) {
    request.uri = "/index.html";
  }

  return request;
}

export { viewerResponse, viewerRequest };
```

### 5.3 Lambda@Edge 예시: 이미지 최적화

```typescript
// lambda-edge/image-optimizer.ts
import { CloudFrontRequestEvent, CloudFrontResponseResult } from "aws-lambda";

interface ImageParams {
  width: number;
  quality: number;
  format: "webp" | "avif" | "jpeg" | "png";
}

function parseImageParams(querystring: string): ImageParams {
  const params = new URLSearchParams(querystring);
  return {
    width: Math.min(parseInt(params.get("w") ?? "0", 10) || 1920, 3840),
    quality: Math.min(parseInt(params.get("q") ?? "80", 10), 100),
    format: (params.get("f") as ImageParams["format"]) ?? "webp",
  };
}

function buildCacheKey(uri: string, params: ImageParams): string {
  return `${uri}?w=${params.width}&q=${params.quality}&f=${params.format}`;
}

// Origin Request에서 이미지 변환 요청 라우팅
async function handler(
  event: CloudFrontRequestEvent,
): Promise<CloudFrontResponseResult> {
  const request = event.Records[0].cf.request;
  const imageParams = parseImageParams(request.querystring);

  // 이미지 최적화 오리진으로 리다이렉트
  request.uri = buildCacheKey(request.uri, imageParams);
  request.headers["x-image-width"] = [{ key: "X-Image-Width", value: String(imageParams.width) }];
  request.headers["x-image-quality"] = [{ key: "X-Image-Quality", value: String(imageParams.quality) }];
  request.headers["x-image-format"] = [{ key: "X-Image-Format", value: imageParams.format }];

  return request;
}

export { handler, parseImageParams };
```

---

## 6. Origin Shield 전략

### 6.1 Origin Shield 개념

Origin Shield는 CloudFront와 오리진 사이에 추가 캐시 레이어를 두어 오리진 요청을 최소화하는 기능이다.

```
사용자 → Edge PoP → Regional Edge Cache → Origin Shield → 오리진
                                            (추가 캐시 레이어)
```

### 6.2 CDK Origin Shield 설정

```typescript
// cdk/origin-shield.ts
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class OriginShieldStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(
      this, "AssetBucket", "frontend-assets-prod",
    );

    // Origin Shield 활성화: 오리진에 가장 가까운 리전 선택
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(bucket, {
      originShieldRegion: "ap-northeast-2", // 서울 리전
      originShieldEnabled: true,
    });

    new cloudfront.Distribution(this, "ShieldedDistribution", {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      httpVersion: cloudfront.HttpVersion.HTTP3,
    });
  }
}
```

### 6.3 Origin Shield 적용 기준

| 시나리오 | Origin Shield 권장 | 이유 |
|---------|-------------------|------|
| 글로벌 사용자, S3 오리진 | 강력 권장 | 오리진 요청 최대 90% 감소 |
| 단일 리전 사용자 | 선택적 | 이미 Regional Edge Cache로 충분 |
| 실시간 API (TTL=0) | 비권장 | Shield 통과 지연만 추가 |
| 대용량 미디어 | 권장 | 오리진 대역폭 비용 절감 |

---

## 7. HTTP/3 & Security Headers

### 7.1 HTTP/3 (QUIC) 활성화

CloudFront는 HTTP/3를 네이티브로 지원하며, 별도 설정만으로 활성화된다.

```typescript
// HTTP/3 지원 확인 유틸
async function checkHttp3Support(url: string): Promise<boolean> {
  const response = await fetch(url, { method: "HEAD" });
  const altSvc = response.headers.get("alt-svc");
  return altSvc?.includes("h3") ?? false;
}

// HTTP/3 성능 비교 측정
interface ProtocolMetrics {
  protocol: string;
  ttfb: number;
  downloadTime: number;
  totalTime: number;
}

async function measureProtocolPerformance(url: string): Promise<ProtocolMetrics> {
  const start = performance.now();
  const response = await fetch(url);
  const ttfb = performance.now() - start;

  const body = await response.arrayBuffer();
  const totalTime = performance.now() - start;

  return {
    protocol: response.headers.get("x-protocol") ?? "unknown",
    ttfb,
    downloadTime: totalTime - ttfb,
    totalTime,
  };
}

export { checkHttp3Support, measureProtocolPerformance };
```

### 7.2 Security Headers 표준

```typescript
// config/security-headers.ts
interface SecurityHeaderConfig {
  strictTransportSecurity: string;
  contentSecurityPolicy: string;
  xContentTypeOptions: string;
  xFrameOptions: string;
  referrerPolicy: string;
  permissionsPolicy: string;
}

const PRODUCTION_HEADERS: SecurityHeaderConfig = {
  strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.example.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  xContentTypeOptions: "nosniff",
  xFrameOptions: "DENY",
  referrerPolicy: "strict-origin-when-cross-origin",
  permissionsPolicy: "camera=(), microphone=(), geolocation=(self), payment=(self)",
};

function generateHeaderMap(
  config: SecurityHeaderConfig,
): Record<string, { value: string }> {
  return {
    "strict-transport-security": { value: config.strictTransportSecurity },
    "content-security-policy": { value: config.contentSecurityPolicy },
    "x-content-type-options": { value: config.xContentTypeOptions },
    "x-frame-options": { value: config.xFrameOptions },
    "referrer-policy": { value: config.referrerPolicy },
    "permissions-policy": { value: config.permissionsPolicy },
  };
}

export { PRODUCTION_HEADERS, generateHeaderMap };
export type { SecurityHeaderConfig };
```

---

## 8. 실시간 로그 분석 파이프라인

### 8.1 아키텍처

```
CloudFront Real-time Logs
  → Kinesis Data Stream
  → Kinesis Data Firehose
  → S3 (Parquet) + Lambda (실시간 알림)
  → Athena (Ad-hoc 분석) / Grafana (대시보드)
```

### 8.2 실시간 로그 처리 Lambda

```typescript
// lambda/realtime-log-processor.ts
import { KinesisStreamEvent } from "aws-lambda";

interface CloudFrontLogRecord {
  timestamp: number;
  edgeLocation: string;
  responseBytes: number;
  clientIp: string;
  httpMethod: string;
  uri: string;
  statusCode: number;
  cacheResult: string;
  timeTaken: number;
  tlsVersion: string;
  httpVersion: string;
}

interface AlertThresholds {
  errorRatePercent: number;
  cacheMissRatePercent: number;
  p99LatencyMs: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  errorRatePercent: 5,
  cacheMissRatePercent: 40,
  p99LatencyMs: 3000,
};

function parseLogRecord(data: string): CloudFrontLogRecord {
  const fields = data.split("\t");
  return {
    timestamp: parseInt(fields[0], 10),
    edgeLocation: fields[2],
    responseBytes: parseInt(fields[3], 10),
    clientIp: fields[4],
    httpMethod: fields[5],
    uri: fields[6],
    statusCode: parseInt(fields[7], 10),
    cacheResult: fields[12],
    timeTaken: parseFloat(fields[17]),
    tlsVersion: fields[26] ?? "",
    httpVersion: fields[30] ?? "",
  };
}

interface WindowMetrics {
  totalRequests: number;
  errorCount: number;
  cacheMisses: number;
  latencies: number[];
}

function computeMetrics(records: CloudFrontLogRecord[]): WindowMetrics {
  const latencies = records.map((r) => r.timeTaken).sort((a, b) => a - b);
  return {
    totalRequests: records.length,
    errorCount: records.filter((r) => r.statusCode >= 500).length,
    cacheMisses: records.filter((r) => r.cacheResult === "Miss").length,
    latencies,
  };
}

function checkThresholds(
  metrics: WindowMetrics,
  thresholds: AlertThresholds,
): string[] {
  const alerts: string[] = [];
  const errorRate = (metrics.errorCount / metrics.totalRequests) * 100;
  const cacheMissRate = (metrics.cacheMisses / metrics.totalRequests) * 100;
  const p99Index = Math.floor(metrics.latencies.length * 0.99);
  const p99Latency = metrics.latencies[p99Index] ?? 0;

  if (errorRate > thresholds.errorRatePercent) {
    alerts.push(
      `[ERROR RATE] ${errorRate.toFixed(1)}% > ${thresholds.errorRatePercent}% 임계값 초과`,
    );
  }

  if (cacheMissRate > thresholds.cacheMissRatePercent) {
    alerts.push(
      `[CACHE MISS] ${cacheMissRate.toFixed(1)}% > ${thresholds.cacheMissRatePercent}% 임계값 초과`,
    );
  }

  if (p99Latency > thresholds.p99LatencyMs) {
    alerts.push(
      `[LATENCY P99] ${p99Latency.toFixed(0)}ms > ${thresholds.p99LatencyMs}ms 임계값 초과`,
    );
  }

  return alerts;
}

async function handler(event: KinesisStreamEvent): Promise<void> {
  const records = event.Records.map((record) => {
    const payload = Buffer.from(record.kinesis.data, "base64").toString("utf-8");
    return parseLogRecord(payload);
  });

  const metrics = computeMetrics(records);
  const alerts = checkThresholds(metrics, DEFAULT_THRESHOLDS);

  if (alerts.length > 0) {
    console.warn("[CloudFront Alert]", JSON.stringify({ alerts, metrics }));
    // SNS 또는 Slack 알림 전송
  }

  console.info("[CloudFront Metrics]", JSON.stringify({
    requests: metrics.totalRequests,
    errorRate: ((metrics.errorCount / metrics.totalRequests) * 100).toFixed(1),
    cacheMissRate: ((metrics.cacheMisses / metrics.totalRequests) * 100).toFixed(1),
  }));
}

export { handler, parseLogRecord, computeMetrics, checkThresholds };
export type { CloudFrontLogRecord, AlertThresholds, WindowMetrics };
```

### 8.3 Athena 쿼리 예시

```sql
-- 시간대별 캐시 적중률 추이
SELECT
  date_trunc('hour', from_unixtime(timestamp)) AS hour,
  COUNT(*) AS total_requests,
  COUNT_IF(cache_result IN ('Hit', 'RefreshHit')) AS cache_hits,
  ROUND(COUNT_IF(cache_result IN ('Hit', 'RefreshHit')) * 100.0 / COUNT(*), 2) AS hit_ratio
FROM cloudfront_logs
WHERE dt >= current_date - INTERVAL '7' DAY
GROUP BY 1
ORDER BY 1;

-- 캐시 Miss가 많은 경로 Top 20
SELECT
  uri,
  COUNT(*) AS miss_count,
  ROUND(AVG(time_taken) * 1000, 0) AS avg_latency_ms,
  SUM(response_bytes) / 1024 / 1024 AS total_mb
FROM cloudfront_logs
WHERE cache_result = 'Miss'
  AND dt >= current_date - INTERVAL '1' DAY
GROUP BY uri
ORDER BY miss_count DESC
LIMIT 20;
```

---

## 9. 체크리스트

### 캐시 설계

- [ ] 경로별 캐시 정책 정의 (immutable / SWR / no-cache)
- [ ] 캐시 키 최소화 (불필요한 Query String, Header, Cookie 제거)
- [ ] `Cache-Control` 헤더에 `stale-while-revalidate` 적용
- [ ] Origin Shield 활성화 여부 검토

### AI 활용

- [ ] **AI로 캐시 적중률 분석** 프롬프트 템플릿 팀 공유
- [ ] **AI로 무효화 영향 범위 분석** 스크립트 CI 연동
- [ ] AI 기반 TTL 최적화 결과 정기 리뷰 (월 1회)

### 보안 & 성능

- [ ] Security Headers (HSTS, CSP, X-Frame-Options) CloudFront Function 적용
- [ ] HTTP/3 활성화
- [ ] TLS 1.3 최소 버전 설정

### 모니터링

- [ ] 실시간 로그 → Kinesis → Lambda 파이프라인 구축
- [ ] 캐시 적중률 알림 임계값 설정 (40% 미만 시 알림)
- [ ] 5xx 에러율 알림 임계값 설정 (5% 초과 시 알림)
- [ ] Athena 쿼리로 주간 캐시 성능 보고서 생성
