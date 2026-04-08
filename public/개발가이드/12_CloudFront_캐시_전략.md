# 42. CloudFront 캐시 전략 (2025-2026 Edition)

| 분류 | 인프라 & CI/CD | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [40. 인프라](./40_인프라_및_AWS_CDK_가이드.md), [31. 성능 최적화](./31_성능_최적화_가이드.md) | **AI 도구** | CloudFront, Brotli |
| **핵심 테마** | Edge Computing, Cache Policy, Invalidation, Compression | **Update** | 2025.04 |

---

> **"사용자에게 가장 가까운 곳에서 데이터를 전달하라. 캐싱은 최고의 성능 최적화 도구다."**
> 본 가이드는 AWS CloudFront를 활용하여 정적 자산(Static Assets)의 전송 속도를 극대화하고 비용을 효율화하는 전략을 다룹니다.

## 1. 캐시 정책(Cache Policy) 설계

파일의 성격에 따라 각기 다른 캐시 정책을 적용해야 합니다.

### 1.1 정적 자산 (Immutable Assets)
빌드 시 해시가 포함된 파일(`main.[hash].js`, `style.[hash].css`)은 영구적으로 캐싱할 수 있습니다.
*   **TTL**: `Max TTL` (1년 이상)
*   **전략**: 브라우저와 CDN 모두에서 영구 캐시. 새로운 배포 시 파일 이름이 바뀌므로 무효화가 필요 없습니다.

### 1.2 엔트리 파일 (Entry File)
`index.html`과 같이 파일 이름이 고정된 파일은 절대 캐싱해서는 안 됩니다.
*   **TTL**: `0` (no-cache)
*   **전략**: 항상 원본 서버(S3)에서 최신 파일을 가져오도록 설정하여 배포 즉시 반영되게 합니다.

---

## 2. Edge Computing: CloudFront Functions (JS 2.0)

Edge 지역(PoP)에서 실행되는 초경량 JavaScript 함수로 요청을 가공합니다.

*   **URL Rewrite**: SPA 라우팅을 위해 확장자가 없는 요청을 `/index.html`로 연결합니다.
*   **Header Manipulation**: 보안 헤더(HSTS, CSP 등)를 응답에 동적으로 추가합니다.
*   **Redirect**: 특정 국가나 브라우저를 대상으로 다른 경로로 리다이렉트합니다.

---

## 3. 압축 알고리즘: Brotli & Gzip

압축은 전송 시간을 획기적으로 줄여줍니다.

*   **Brotli (br)**: Gzip보다 압축률이 15~20% 높으며, 현대 브라우저에서 표준으로 지원합니다.
*   **CloudFront 설정**: CloudFront에서 자동으로 파일을 압축하도록 설정하거나, 빌드 타임에 미리 압축하여 S3에 업로드(Pre-compression)합니다.

---

## 4. 캐시 무효화(Invalidation)와 비용

모든 파일을 무효화(`/*`)하는 것은 비용이 발생하며 CDN 성능을 저하시킵니다.

*   **지정 무효화**: 변경된 파일(`index.html`)만 명시적으로 무효화합니다.
*   **패턴 무효화**: 특정 버전 폴더(`/v1/*`)만 무효화합니다.
*   **버저닝 활용**: 파일 이름에 해시를 포함하는 버저닝을 최우선으로 고려하여 무효화 요청 자체를 최소화하세요.

---

## 💡 AI와 함께하는 CDN 튜닝 워크플로우

AI(Claude Code)에게 캐시 효율 분석을 요청하세요.

> **Prompt**: "우리 서비스의 CloudFront 캐시 적중률(Cache Hit Ratio)이 낮아. index.html과 JS/CSS 파일들의 캐시 정책을 어떻게 분리해야 최적인지 가이드라인을 작성해줘. 특히 빌드 결과물에 해시가 포함되어 있다면 이를 활용한 무한 캐싱 전략도 포함해줘."

## ✅ 체크리스트
- [ ] `index.html`에 대해 `no-cache` 정책이 적용되었나요?
- [ ] 해시가 포함된 정적 자산들의 TTL이 1년(31536000초) 이상인가요?
- [ ] **Brotli** 압축이 활성화되어 데이터 전송량이 최적화되었나요?
- [ ] SPA 라우팅을 위한 URL 리라이트가 Edge Function에서 처리되나요?
- [ ] 보안 헤더가 CloudFront 응답 헤더 정책(Response Headers Policy)에 포함되어 있나요?
