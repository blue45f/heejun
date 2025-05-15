# CloudFront 캐시 사용 표준

## 목차
1. [개요](#1-개요)
2. [캐시 전략 기본 원칙](#2-캐시-전략-기본-원칙)
3. [프론트엔드 개발자를 위한 캐시 정책](#3-프론트엔드-개발자를-위한-캐시-정책)
4. [모니터링 및 성능 최적화](#4-모니터링-및-성능-최적화)
5. [체크리스트](#5-체크리스트)

---

## 1. 개요

### 1.1 문서 목적

배포 시스템의 설정으로 대부분의 내용들이 자동으로 설정 되어있습니다만, 현재 배포시 Invalidate을 강제 하고 있는 배포 시스템의 환경에서는 대응하기 어려운 것이 현실입니다.

이 문서는 프론트엔드 개발자들이 **배포 시스템과 AWS CloudFront를 연동**하여 최적의 사용자 경험을 제공하기 위한 표준 가이드라인입니다.

### 1.2 CloudFront 캐시 계층 도면

```
[사용자] → [Edge Location (PoP)] → [Regional Edge Cache] → [Origin Shield] → [S3/Origin]
           ↓
        L1 Cache           →           L2 Cache          →     L3 Cache    →   Origin
```

### 1.3 핵심 용어 정의

| 용어 | 설명 |
|------|------|
| **캐시 키** | 동일한 콘텐츠인지 판단하는 고유 식별자 |
| **TTL (Time-to-Live)** | 캐시된 객체의 유효 기간 |
| **Origin Shield** | 원본 서버 보호를 위한 중앙 집중식 캐시 계층, 원본 서버에 접근하는것을 최소화 하기위한 마지막 계층 |
| **PoP (Point of Presence)** | 엣지 로케이션을 의미합니다. 일반적으로 사용자에게 지리적으로 가장 가까운 CDN으로 라우팅 됩니다 |

---

## 2. 캐시 전략 기본 원칙

### 2.1 불변성 원칙 (Immutability Principle)

**핵심 개념**: 파일 내용이 변경되면 파일명도 변경되어야 합니다. 이를 통해 영구 캐싱과 즉시 업데이트를 동시에 달성할 수 있습니다.

```javascript
// ✅ 올바른 방식: 해시 기반 파일명
main.a1b2c3d4.js;
styles.e5f6g7h8.css;
logo.i9j0k1l2.png;

// ❌ 잘못된 방식: 고정 파일명
main.js;
styles.css;
logo.png;

// 예외: index.html 캐시TTL이 0이기 때문
```

### 2.2 이중 캐시 전략 (Dual Cache Strategy)

1. **정적 자산**: 장기 캐싱 (1년)
2. **HTML 엔트리포인트**: 단기 캐싱 또는 무캐싱

이 전략을 통해 새로운 배포 시 사용자가 즉시 최신 버전을 받을 수 있으면서도, 정적 자산은 효율적으로 캐싱됩니다.

### 2.3 최소 특정성 원칙 (Principle of Least Specificity)

캐시 키는 콘텐츠의 정확성을 보장하는 데 **필요한 최소한의 요소**만 포함해야 합니다.

```javascript
// ✅ 좋은 예: 필수 요소만 포함
캐시 키: URL 경로(해시값) + Accept-Encoding

// ❌ 나쁜 예: 불필요한 요소 포함
캐시 키: URL + 모든 헤더 + 쿠키 + User-Agent
```

### 2.4 캐시 오염 방지 전략

#### 1. 다중 오리진 서비스인 경우 CFF 대신 Lambda@Edge 사용

**기본적으로 다중 오리진 서비스를 지양 해야합니다.**

- CloudFront 함수(CFF)는 요청 URL을 바꾸면, 바뀐 URL을 캐시 키로 사용합니다.
- 이 때문에 서로 다른 Origin에서 온 콘텐츠가 같은 캐시 키(예: `/index.html`)를 공유하면서 캐시가 오염될 수 있습니다.
- 결과적으로 사용자는 엉뚱한 페이지를 보게 될 수 있습니다.

**문제 상황 비유 (택배함 예시)**

```
CloudFront: 아파트 택배 시스템
Origin 1 (기본 S3): 우리 집 (기본 배송지)
Origin 2 (다른 S3): 아파트 내 헬스장 (특별 배송지)

1. 첫 번째 방문: 헬스장으로 가는 택배
   - /A/운동기구 요청 → CFF가 /index.html로 변경
   - 헬스장에서 index.html 받아옴
   - 캐시 키: index.html로 저장

2. 두 번째 방문: 우리 집으로 와야 할 택배
   - /B/내물건 요청 → 404 발생 → /index.html로 리다이렉트
   - "어? 아까 index.html로 보관해 둔 게 있네?"
   - 헬스장 콘텐츠가 잘못 제공됨!
```

**해결 방안**: Lambda@Edge를 사용하여 배송지(Origin) 자체를 동적으로 변경

```javascript
// Lambda@Edge (Origin Request)
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  // URI별로 다른 오리진 동적 선택 가능
  if (uri.startsWith("/A/")) {
    request.origin = {
      custom: {
        domainName: "origin2.example.com",
        // ... 오리진2 설정
      },
    };
    // 원본 URI 유지하면서 오리진만 변경
  }

  return request;
};
```

#### 2. Custom Error Page 대신 Origin Request 처리

**기존 방식 (문제 있는 설정)**

```yaml
custom_error_response {
  error_code         = 403
  response_code      = 200
  response_page_path = "/index.html"  # ⚠️ 모든 403이 동일한 캐시 키
}
custom_error_response {
  error_code         = 404
  response_code      = 200
  response_page_path = "/index.html"  # ⚠️ 모든 404가 동일한 캐시 키
}
```

**핵심 문제**: 모든 SPA 라우팅 요청이 `/index.html` 캐시 키를 공유하여 다중 오리진 환경에서 캐시 오염 발생

**안전한 패턴**

```javascript
// CloudFront Function (Viewer Request)
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // 캐시 키 보존을 위해 쿼리 파라미터로 원본 경로 유지
  if (!uri.includes(".") && uri !== "/") {
    request.querystring = {
      "original-path": { value: encodeURIComponent(uri) },
    };
    request.uri = "/index.html";
  }

  return request;
}
```

---

## 3. 프론트엔드 개발자를 위한 캐시 정책

### 3.1 브라우저 캐시 정책

캐시를 삭제하기 위해 invalidate을 사용하는 경우가 있으나, 이는 추천하지 않습니다.

invalidate하는 것은 최소 5분 이상 서빙되지 않더라도 문제가 없는 경우에 해당됩니다.

**즉각적인 적용과 서빙을 위해 해시/UUID 사용 등 고유 URL을 만들어서 추가하는 방향을 권장합니다.**

- `index.html` / API 등 캐시를 가지고 가면 안되는 리소스의 경우 TTL을 0으로 잡습니다.
- JS/CSS/이미지 등 해시 값이 들어가는 리소스 또는 폰트와 같은 완전 정적 에셋의 경우 1년의 캐시값을 두어 원활한 서빙이 될 수 있게 합니다.

#### 상황별 캐시 적용 방법 가이드

| 상황 | 추천 방법 | 이유 |
|------|----------|------|
| **S3의 정적 파일들**에 대해 긴 캐시를 적용하고 싶을 때 | 응답 헤더 정책 | 파일마다 메타데이터를 수정할 필요 없이 CloudFront에서 일괄 적용이 가능해 편리합니다. |
| **API 응답**처럼 동적으로 캐시 정책이 바뀌어야 할 때 | 캐시 정책 | 원본 서버(API 서버)에서 보낸 Cache-Control 헤더를 존중하도록 설정하는 것이 유연합니다. |
| 특정 파일(예: index.html)은 **캐시하지 않아야 할 때** | 응답 헤더 정책 | Cache-Control 헤더에 no-cache, no-store 값을 설정한 정책을 만들어 해당 파일 경로의 동작(Behavior)에만 적용할 수 있습니다. |

#### 파일 타입별 헤더 적용 가이드

| 콘텐츠 유형 | TTL | Cache-Control | 캐시 키 구성 | 비고 |
|------------|-----|---------------|-------------|------|
| **JS/CSS/이미지 (해시명)** | 1년 | `max-age=31,536,000` `s-maxage=31,536,000` | URL + 쿼리 | 가장 일반적 해시 기반 캐시 버스팅 |
| **아이콘, 로고** | 1개월 | `max-age=2592000` `s-maxage=31,536,000` | URL 경로만 | WebP 포맷 우선 |
| **index.html** | 무캐시 | `max-age=0`, `s-maxage=604800`, `no-cache/no-store`, `must-revalidate` | URL 경로만 | 엔트리포인트 |
| **API 엔드포인트** | 무캐시 | `max-age=0`, `s-maxage=604800`, `no-cache/no-store`, `must-revalidate` | URL + 헤더 + 쿼리 | 동적 콘텐츠 |
| **폰트 파일** | 1년 | `max-age=31,536,000` `s-maxage=31,536,000` | URL 경로만 | CORS 설정 필요 |
| **이미지 (해시 미사용시)** | 필요에 따라 | - | URL 경로만 | 단발성 마케팅 영역 |

#### 각 헤더 항목들에 대한 설명

| 헤더 | 설명 |
|------|------|
| **max-age** | 웹 브라우저(클라이언트)에게 해당 콘텐츠의 캐시 유효 기간을 알려줍니다. |
| **s-maxage** | 공유 캐시(CDN, 프록시 서버 등)에만 적용됩니다. max-age를 덮어쓰며, 해당 기간 동안 CDN은 서버에 다시 요청하지 않고 캐시된 콘텐츠를 사용자에게 바로 제공할 수 있습니다. |
| **no-cache** | 캐시된 복사본을 저장할 수 있지만, 사용할 때마다 서버에 재확인(revalidation)을 요청해야 합니다. |
| **no-store** | 응답이 어떤 캐시에도 저장되어서는 안 됩니다. 매우 민감한 데이터를 다룰 때 사용됩니다. |
| **must-revalidate** | 캐시된 콘텐츠가 만료되었을 때 반드시 서버에 재확인을 요청해야 합니다. |
| **ETag** | 리소스의 버전을 식별하는 값입니다. 파일 내용의 해시 값이나 최종 수정 시간을 기반으로 생성됩니다. |

#### no-cache vs no-store 비교

| 구분 | no-cache | no-store |
|------|----------|----------|
| **캐시 저장** | 허용됨 | **허용되지 않음** |
| **재검증** | 매번 사용 전 필요 | 해당 없음 (캐시 없음) |
| **목적** | 신선도 보장 | 개인 정보/보안 보장 |
| **효율성** | 전체 다운로드보다 빠름 (304 Not Modified 사용) | 항상 전체 다운로드가 필요함 |
| **사용 사례** | 프로필 페이지, 자주 업데이트되는 콘텐츠 | 민감한 데이터 (의료, 금융, 로그인 등) |

### 3.2 L2 ~ L3 CloudFront 캐시 정책

#### L2: CDN Edge 캐시 계층 (CloudFront)
- **목적**: 지역별 빠른 응답, Origin 서버 부하 분산

#### L3: Regional Cache 계층 (Origin Shield)
- **목적**: 대용량 트래픽 흡수, Origin 보호

**정적 자산 캐시 정책**
```yaml
CachePolicyId: "정적자산-초장기"
Parameters:
  TTL:
    DefaultTTL: 31536000 # 1년
    MaxTTL: 31536000
  CacheKeyBehavior:
    - URL 경로만
```

**메뉴 이미지 캐시 정책**
```yaml
CachePolicyId: "메뉴이미지-장기"
Parameters:
  TTL:
    DefaultTTL: 604800 # 1주
    MaxTTL: 2592000 # 1개월
  CacheKeyBehavior:
    - URL 경로
    - Accept-Encoding
    - Accept (WebP 지원 권고)
```

**Origin Shield 설정 (Seoul Region)**
```javascript
const originShieldConfig = {
  enabled: true,
  region: "ap-northeast-2", // 서울 리전

  // 서비스 특화 캐시 정책
  cachePolicies: {
    // 러시아워 대응 - 트래픽 급증 시 캐시 확장
    rushHour: {
      timeSlots: ["11:30-13:30", "18:00-20:30"],
      ttlMultiplier: 2.0, // TTL 2배 연장
      maxCacheSize: "500GB",
    },

    // 이벤트 대응 - 예측 기반 캐시 워밍
    eventMode: {
      triggers: ["신규서비스_오픈", "프로모션_런칭"],
      preWarmPaths: [
        "/api/items/near/*",
        "/api/products/popular/*",
        "/static/images/brands/*",
      ],
    },
  },
};
```

### 3.3 Webpack/Vite 빌드 해시 설정

#### Webpack 설정

```javascript
// webpack.config.js
module.exports = {
  output: {
    filename: "[name].[contenthash].js",
    chunkFilename: "[name].[contenthash].js",
    assetModuleFilename: "assets/[name].[contenthash][ext]",
  },
  optimization: {
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },
      },
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
      filename: "index.html",
      inject: true,
    }),
  ],
};
```

#### Vite 설정

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `[name].[hash].js`,
        chunkFileNames: `[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
  },
});
```

### 3.4 코드 스플리팅 정책

**코드 스플리팅**은 애플리케이션의 코드를 여러 개의 작은 번들 파일로 나누는 기술입니다. 이를 해싱과 결합하면 효율을 극대화할 수 있습니다.

- **변경 최소화**: 하나의 큰 `bundle.js` 파일에 모든 코드가 포함되어 있다면, 작은 수정이라도 파일 전체의 해시 값을 변경시켜 브라우저가 전체 번들을 다시 다운로드해야 합니다.
- **부분적 변경**: 코드 스플리팅을 사용하면 자주 변경되는 코드(예: 기능별 모듈)와 자주 변경되지 않는 코드(예: 라이브러리)를 별도의 번들로 분리할 수 있습니다. 이렇게 하면 특정 모듈의 코드만 변경될 때, 해당 번들의 해시 값만 바뀌고 나머지 번들은 그대로 유지됩니다.

### 3.5 멀티 오리진 캐시 오염 주의

1. **CloudFront Function 사용 시 주의사항**:
   - URI rewrite가 캐시 키에 미치는 영향 사전 검토
   - 다중 오리진 환경에서는 Lambda@Edge 우선 고려
   - 배포 시 캐시 키 충돌 가능성 검증

2. **테스트 시나리오**:

```bash
# 캐시 오염 테스트 스크립트
#!/bin/bash

# 첫 번째 경로 요청 (특정 오리진)
curl -H "X-Test-Origin: A" "https://example.com/A/test"

# 두 번째 경로 요청 (다른 오리진이어야 함)
curl -H "X-Test-Origin: B" "https://example.com/B/test"

# 응답 헤더에서 실제 오리진 확인
curl -I "https://example.com/B/test" | grep -E "(X-Cache|X-Amz-Cf-)"
```

---

## 4. 모니터링 및 성능 최적화

### 4.1 프론트엔드 성능 지표 (KPI)

**프론트엔드 월간 회의**에서 다음과 같은 지표들을 정기적으로 모니터링할 수 있도록 합니다.

| 지표 | 목표값 | 측정 방법 | 개선 액션 |
|------|--------|----------|-----------|
| **캐시 히트율** | 95% 이상 | CloudWatch | 캐시 키 최적화 |
| **4xx/5xx 에러율** | 1% 미만 | CloudWatch | 전반적인 CF 설정에 대한 점검 |
| **Time to First Byte** | 200ms 미만 | RUM/Synthetic | 캐시 정책 최적화 및 개정 |

### 4.2 CloudWatch 대시보드 설정

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/CloudFront", "CacheHitRate", "DistributionId", "E1234567890"],
          [".", "OriginLatency", ".", "."],
          [".", "Requests", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "CloudFront 성능 지표"
      }
    }
  ]
}
```

### 4.3 알림 설정

```yaml
# CloudWatch 알람 설정 (Terraform)
resource "aws_cloudwatch_metric_alarm" "cache_hit_rate_low" {
  alarm_name          = "cloudfront-cache-hit-rate-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CacheHitRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "캐시 히트율이 90% 미만입니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
  }
}
```

### 4.4 CloudFront 응답 헤더 분석

```bash
#!/bin/bash
# CloudFront 헤더 분석 스크립트

URL="$1"
echo "🔍 CloudFront 응답 분석: $URL"
echo

# 헤더 정보 수집
HEADERS=$(curl -s -I "$URL")

echo "📊 캐시 관련 헤더:"
echo "$HEADERS" | grep -E "(X-Cache|X-Amz-Cf-|Cache-Control|ETag|Last-Modified|Expires)"

echo
echo "🌍 엣지 로케이션:"
echo "$HEADERS" | grep "X-Amz-Cf-Pop"

echo
echo "🔄 캐시 상태:"
CACHE_STATUS=$(echo "$HEADERS" | grep "X-Cache" | cut -d' ' -f2-)
case "$CACHE_STATUS" in
  *"Hit"*) echo "✅ 캐시 히트 - 최적 상태" ;;
  *"Miss"*) echo "⚠️ 캐시 미스 - 첫 요청이거나 TTL 만료" ;;
  *"RefreshHit"*) echo "🔄 리프레시 히트 - 재검증 후 캐시 사용" ;;
  *"Error"*) echo "❌ 오류 - 원본 서버 문제 확인 필요" ;;
esac
```

---

## 5. 체크리스트

### 빌드 설정
- [ ] 정적 자산에 contenthash 적용됨
- [ ] index.html은 해시 없는 고정 파일명 사용
- [ ] 청크 분할 설정 (vendor, runtime 분리)
- [ ] Tree shaking 활성화

### CloudFront 설정
- [ ] 정적 자산용 Long-term 캐시 정책 적용
- [ ] HTML용 No-cache 정책 적용
- [ ] 보안 헤더 정책 적용
- [ ] 응답 헤더 정책 적용 (max-age, no-cache 등)

### 모니터링 설정
- [ ] CloudWatch 대시보드 확인
- [ ] 캐시 히트율 알람 설정
- [ ] 오류율 알람 설정
- [ ] 비용 알림 설정

### 배포 전 점검
- [ ] 빌드 결과물에 해시가 포함된 파일명 확인
- [ ] 스테이징 환경에서 캐시 동작 테스트
- [ ] 크로스 브라우저 테스트 완료
- [ ] 성능 지표 측정 (Lighthouse 등)
- [ ] 보안 스캔 실행

### 배포 후 검증
- [ ] index.html이 캐시되지 않음 확인 (`X-Cache: Miss` 또는 `RefreshHit`)
- [ ] 정적 자산이 캐시됨 확인 (`X-Cache: Hit`)
- [ ] 신규 자산이 정상 로드됨 확인
- [ ] 404 에러 없음 확인
- [ ] 캐시 히트율 90% 이상 확인 (배포 1시간 후)
- [ ] 사용자 리포트된 이슈 없음 확인

---
