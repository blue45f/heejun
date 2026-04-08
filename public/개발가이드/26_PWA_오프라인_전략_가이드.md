# PWA & 오프라인 전략 가이드 2026 - AI-First + 멀티 베타 Edition

## 목차

1. [AI 기반 PWA 개발 자동화](#1-ai-기반-pwa-개발-자동화)
   - [1.1 AI 프롬프트 7종](#11-ai-프롬프트-7종)
   - [1.2 Copilot/Cursor Service Worker 자동 생성 패턴](#12-copilotcursor-service-worker-자동-생성-패턴)
   - [1.3 AI 캐싱 전략 자동 설계](#13-ai-캐싱-전략-자동-설계)
   - [1.4 AI 오프라인 UX 시나리오 자동 생성](#14-ai-오프라인-ux-시나리오-자동-생성)
2. [멀티 베타 환경 PWA 전략](#2-멀티-베타-환경-pwa-전략)
   - [2.1 환경별 Service Worker 분리](#21-환경별-service-worker-분리)
   - [2.2 환경별 매니페스트 동적 생성](#22-환경별-매니페스트-동적-생성)
   - [2.3 Preview 환경 PWA 설치 차단](#23-preview-환경-pwa-설치-차단)
   - [2.4 환경별 Push Notification 채널 분리](#24-환경별-push-notification-채널-분리)
   - [2.5 Feature Flag 오프라인 기능 점진적 롤아웃](#25-feature-flag-오프라인-기능-점진적-롤아웃)
   - [2.6 Service Worker 버전 충돌 방지](#26-service-worker-버전-충돌-방지)
3. [Service Worker 라이프사이클](#3-service-worker-라이프사이클)
4. [Workbox 6 + Vite PWA 설정](#4-workbox-6--vite-pwa-설정)
5. [캐싱 전략 4종 비교](#5-캐싱-전략-4종-비교)
6. [오프라인 UX 패턴](#6-오프라인-ux-패턴)
7. [Web Push Notifications](#7-web-push-notifications)
8. [App Manifest & 설치 프롬프트](#8-app-manifest--설치-프롬프트)
9. [Background Sync & Periodic Sync](#9-background-sync--periodic-sync)

---

## 1. AI 기반 PWA 개발 자동화

AI를 PWA 개발의 보조가 아닌 **설계 및 구현 엔진**으로 활용한다. Service Worker 코드 생성, 캐싱 전략 설계, 오프라인 UX 패턴 제안, Push Notification 구현, 매니페스트 최적화, 테스트 시나리오 도출까지 전 과정을 AI가 수행하고 사람은 비즈니스 요구사항 정의와 최종 검증만 담당한다.

### 1.1 AI 프롬프트 7종

#### 프롬프트 1: Service Worker 생성

```
이 Vite + React + TypeScript 프로젝트에 Workbox 기반 Service Worker를 설정해줘.

요구사항:
- vite-plugin-pwa의 injectManifest 모드 사용
- 캐싱 전략:
  (1) 앱 셸 (HTML, JS, CSS): Cache First, 빌드마다 revision 갱신
  (2) API 응답 (/api/*): Network First, 5분 TTL
  (3) 이미지 (/images/*): Cache First, 30일 TTL, 최대 100개
  (4) 폰트: Cache First, 1년 TTL
  (5) CDN 리소스: Stale While Revalidate
- 오프라인 폴백 페이지 (/offline.html) 등록
- 네비게이션 프리로드 활성화
- skipWaiting + clientsClaim으로 즉시 활성화
- ExpirationPlugin으로 캐시 용량 제한
- TypeScript strict 모드 호환
```

#### 프롬프트 2: 캐싱 전략 설계

```
우리 서비스의 페이지 유형별 최적 캐싱 전략을 설계해줘.

페이지 유형:
- 랜딩 페이지: 정적, 변경 빈도 월 1회
- 대시보드: 실시간 데이터, API 호출 다수
- 설정 페이지: 거의 변경 없음, 폼 중심
- 콘텐츠 상세: 텍스트 + 이미지 혼합, CDN 이미지
- 검색 결과: 동적, 페이지네이션

각 유형에 대해 다음을 제시해줘:
(1) 추천 Workbox 전략 (CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly)
(2) TTL, maxEntries 설정값
(3) 오프라인 폴백 동작
(4) Workbox 라우팅 코드 (TypeScript)
(5) 이유와 트레이드오프
```

#### 프롬프트 3: 오프라인 UX 패턴

```
오프라인 상태에서의 UX 패턴을 설계해줘.

요구사항:
- 네트워크 상태 감지 컴포넌트 (온라인/오프라인 배너)
- 오프라인에서 작성한 데이터를 IndexedDB 큐에 저장하는 커스텀 훅
- 온라인 복귀 시 자동 동기화 + 진행률 표시
- 충돌 발생 시 3-way merge UI
- 오프라인 사용 가능/불가능 기능을 구분하는 UI 가이드
- 모든 코드 React + TypeScript
```

#### 프롬프트 4: Push Notification

```
Web Push Notification 전체 파이프라인을 구현해줘.

요구사항:
- VAPID 키 생성 스크립트 (Node.js)
- 클라이언트 구독 관리 (subscribe/unsubscribe)
- Service Worker push 이벤트 핸들링:
  (1) 알림 제목, 본문, 아이콘, 배지
  (2) 액션 버튼 2개 (확인, 무시)
  (3) 알림 클릭 시 해당 URL로 포커스/이동
  (4) 태그 기반 중복 방지
- notificationclick에서 clients.openWindow 처리
- 서버 발송 API (Node.js + web-push 라이브러리)
- TypeScript 전체
```

#### 프롬프트 5: Background Sync

```
IndexedDB + Background Sync 오프라인 동기화를 구현해줘.

요구사항:
- 오프라인 상태에서 사용자 액션을 IndexedDB 큐에 저장
- 큐 구조: { id: UUID, url, method, body, timestamp, retryCount, status }
- 온라인 복귀 시 Background Sync API로 자동 전송
- 최대 재시도 3회, 지수 백오프
- 동기화 진행률을 클라이언트에 postMessage
- 실패 건 별도 에러 큐 관리
- idb 라이브러리로 IndexedDB 타입 안전 래핑
- Periodic Background Sync (뉴스피드 프리페치) 포함
```

#### 프롬프트 6: 매니페스트 최적화

```
PWA 매니페스트를 최적화해줘.

요구사항:
- display: standalone, orientation: portrait
- 아이콘: 48/72/96/128/144/192/512px + maskable 별도
- shortcuts: 최소 3개 (빠른 작성, 검색, 알림 확인)
- screenshots: wide + narrow 각 2장 메타데이터
- categories, description, lang, dir 설정
- share_target: 텍스트/URL/파일 수신 액션
- related_applications로 네이티브 앱 연동
- display_override: ["window-controls-overlay", "standalone", "browser"]
- Lighthouse PWA 점수 100 기준 검증 체크리스트
```

#### 프롬프트 7: 오프라인 테스트 시나리오

```
PWA 오프라인 기능 테스트 시나리오를 생성해줘.

요구사항:
- Playwright + @playwright/test 기반
- 네트워크 에뮬레이션 (오프라인, Slow 3G, Fast 3G)
- Service Worker 등록/갱신 테스트
- 캐시 적중률 측정 테스트
- 오프라인 폴백 페이지 노출 검증
- Background Sync 큐잉/전송 검증
- Push Notification 수신 테스트 (mock)
- 캐시 스토리지 용량 초과 시 LRU 제거 검증
- 각 시나리오별 assert 포함
- CI 파이프라인 통합 (GitHub Actions)
```

### 1.2 Copilot/Cursor Service Worker 자동 생성 패턴

Copilot 또는 Cursor에서 Service Worker를 효율적으로 생성하기 위한 패턴이다.

#### .cursorrules / .github/copilot-instructions.md 설정

```markdown
# PWA Service Worker 코드 생성 규칙

## 필수 준수 사항
- 모든 Service Worker 코드는 TypeScript로 작성
- Workbox 6 라이브러리 사용 (workbox-* 패키지)
- self.__WB_MANIFEST 프리캐시 매니페스트 반드시 포함
- 캐시 이름에 반드시 버전 프리픽스 포함: `v${APP_VERSION}-`
- 환경 변수로 캐싱 전략 분기 (import.meta.env.MODE)
- 에러 핸들링: 모든 fetch 핸들러에 try-catch + 폴백

## 금지 사항
- Cache Storage API 직접 호출 금지 (Workbox 추상화 사용)
- 하드코딩된 캐시 이름 금지
- importScripts() 사용 금지 (ES Module 사용)
- any 타입 사용 금지
```

#### 인라인 프롬프트 패턴

```typescript
// sw.ts - Copilot/Cursor 인라인 프롬프트 예시

// @ai: Workbox precacheAndRoute로 빌드 산출물 프리캐시
// @ai: /api/* 경로는 NetworkFirst, maxAgeSeconds: 300
// @ai: /images/* 경로는 CacheFirst, maxEntries: 100, maxAgeSeconds: 30일
// @ai: 네비게이션 요청 실패 시 /offline.html 폴백
// @ai: 환경별 분기 - preview면 캐시 전부 비활성화

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute, setDefaultHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

const ENV = new URL(location.href).searchParams.get('env') ?? 'production';

cleanupOutdatedCaches();

if (ENV !== 'preview') {
  precacheAndRoute(self.__WB_MANIFEST);
}
```

### 1.3 AI 캐싱 전략 자동 설계

AI에게 서비스의 라우트 목록과 데이터 특성을 입력하면 최적의 캐싱 전략을 자동 설계하도록 한다.

```typescript
// ai-cache-strategy-designer.ts
// AI가 라우트 정보를 분석하여 Workbox 전략을 추천하는 구조

interface RouteProfile {
  path: string;
  type: 'static' | 'dynamic' | 'realtime' | 'media';
  changeFrequency: 'never' | 'daily' | 'hourly' | 'realtime';
  avgResponseSize: number;       // bytes
  criticalForOffline: boolean;
  hasUserSpecificData: boolean;
}

interface CacheRecommendation {
  path: string;
  strategy: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly';
  maxAgeSeconds: number;
  maxEntries: number;
  cacheName: string;
  rationale: string;
}

// AI 프롬프트에 포함할 라우트 프로파일 생성
function buildRouteProfiles(routes: RouteProfile[]): string {
  return routes.map(r => [
    `경로: ${r.path}`,
    `  유형: ${r.type}`,
    `  변경 빈도: ${r.changeFrequency}`,
    `  평균 응답 크기: ${(r.avgResponseSize / 1024).toFixed(1)}KB`,
    `  오프라인 필수: ${r.criticalForOffline}`,
    `  사용자별 데이터: ${r.hasUserSpecificData}`,
  ].join('\n')).join('\n\n');
}

// AI 추천 결과를 Workbox 설정으로 변환
function applyRecommendations(recommendations: CacheRecommendation[]): void {
  for (const rec of recommendations) {
    const plugins = [
      new ExpirationPlugin({
        maxEntries: rec.maxEntries,
        maxAgeSeconds: rec.maxAgeSeconds,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ];

    const StrategyClass = {
      CacheFirst,
      NetworkFirst,
      StaleWhileRevalidate,
      NetworkOnly,
    }[rec.strategy];

    registerRoute(
      new RegExp(rec.path),
      new StrategyClass({ cacheName: rec.cacheName, plugins }),
    );
  }
}
```

### 1.4 AI 오프라인 UX 시나리오 자동 생성

AI에게 앱의 주요 사용자 플로우를 입력하면 오프라인 시나리오와 UX 대응 패턴을 자동 생성한다.

```typescript
// ai-offline-ux-generator.ts

interface UserFlow {
  name: string;
  steps: string[];
  requiresNetwork: boolean[];      // 각 단계별 네트워크 필요 여부
  dataWriteSteps: number[];        // 데이터 쓰기가 발생하는 단계 인덱스
}

interface OfflineScenario {
  flow: string;
  disconnectionPoint: number;      // 오프라인 전환 단계
  impact: 'blocking' | 'degraded' | 'none';
  uxResponse: string;
  fallbackComponent: string;
  dataHandling: 'queue' | 'cache' | 'reject';
}

// AI에게 제공할 플로우 분석 프롬프트 생성
function generateOfflineAnalysisPrompt(flows: UserFlow[]): string {
  return `다음 사용자 플로우에 대해 오프라인 시나리오를 분석해줘.

각 플로우의 모든 단계에서 오프라인 전환이 발생했을 때:
1. 사용자에게 미치는 영향도 (blocking/degraded/none)
2. 권장 UX 대응 (배너, 토스트, 모달, 자동 저장 등)
3. 데이터 처리 방식 (큐잉/캐시 사용/거부)
4. React 폴백 컴포넌트 코드

플로우 목록:
${flows.map(f => `
[${f.name}]
단계: ${f.steps.map((s, i) => `  ${i + 1}. ${s} (네트워크: ${f.requiresNetwork[i] ? '필요' : '불필요'})`).join('\n')}
데이터 쓰기 단계: ${f.dataWriteSteps.join(', ')}
`).join('\n')}`;
}

// AI 생성 결과를 React 컴포넌트로 변환
function generateOfflineFallbackComponent(scenario: OfflineScenario): string {
  return `
import React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const ${scenario.flow}OfflineFallback: React.FC = () => {
  const { isOnline, lastOnlineAt } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div role="alert" className="offline-banner offline-banner--${scenario.impact}">
      <p>${scenario.uxResponse}</p>
      {lastOnlineAt && (
        <p className="offline-banner__timestamp">
          마지막 연결: {new Date(lastOnlineAt).toLocaleTimeString('ko-KR')}
        </p>
      )}
    </div>
  );
};`;
}
```

---

## 2. 멀티 베타 환경 PWA 전략

멀티 베타(Preview, Staging, Canary, Production) 환경에서 PWA가 일관되게 동작하면서도 환경별 특성에 맞게 분리 운영하기 위한 전략이다.

### 2.1 환경별 Service Worker 분리

Preview 환경에서는 캐시를 비활성화하여 항상 최신 코드를 반영하고, Production에서는 전체 캐시를 활성화한다.

```typescript
// src/sw.ts - 환경 인식 Service Worker

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { setCatchHandler } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

// 빌드 시점에 주입되는 환경 변수
const APP_ENV = '__APP_ENV__' as 'production' | 'staging' | 'canary' | 'preview';
const APP_VERSION = '__APP_VERSION__';
const CACHE_PREFIX = `app-${APP_ENV}-v${APP_VERSION}`;

interface EnvCacheConfig {
  enablePrecache: boolean;
  enableRuntimeCache: boolean;
  apiStrategy: 'NetworkFirst' | 'NetworkOnly';
  staticStrategy: 'CacheFirst' | 'NetworkOnly';
  maxApiCacheAge: number;
}

const ENV_CONFIGS: Record<string, EnvCacheConfig> = {
  production: {
    enablePrecache: true,
    enableRuntimeCache: true,
    apiStrategy: 'NetworkFirst',
    staticStrategy: 'CacheFirst',
    maxApiCacheAge: 300,
  },
  staging: {
    enablePrecache: true,
    enableRuntimeCache: true,
    apiStrategy: 'NetworkFirst',
    staticStrategy: 'CacheFirst',
    maxApiCacheAge: 60,
  },
  canary: {
    enablePrecache: false,
    enableRuntimeCache: true,
    apiStrategy: 'NetworkFirst',
    staticStrategy: 'StaleWhileRevalidate' as 'CacheFirst',
    maxApiCacheAge: 30,
  },
  preview: {
    enablePrecache: false,
    enableRuntimeCache: false,
    apiStrategy: 'NetworkOnly',
    staticStrategy: 'NetworkOnly',
    maxApiCacheAge: 0,
  },
};

const config = ENV_CONFIGS[APP_ENV] ?? ENV_CONFIGS.preview;

// --- Precache ---
cleanupOutdatedCaches();

if (config.enablePrecache) {
  precacheAndRoute(self.__WB_MANIFEST);
}

// --- Runtime Cache ---
if (config.enableRuntimeCache) {
  // API 캐싱
  const apiStrategyInstance = config.apiStrategy === 'NetworkFirst'
    ? new NetworkFirst({
        cacheName: `${CACHE_PREFIX}-api`,
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({ maxAgeSeconds: config.maxApiCacheAge, maxEntries: 200 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      })
    : new NetworkOnly();

  registerRoute(({ url }) => url.pathname.startsWith('/api/'), apiStrategyInstance);

  // 정적 리소스 캐싱
  const staticStrategyInstance = config.staticStrategy === 'CacheFirst'
    ? new CacheFirst({
        cacheName: `${CACHE_PREFIX}-static`,
        plugins: [
          new ExpirationPlugin({ maxAgeSeconds: 86400 * 30, maxEntries: 100 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      })
    : new NetworkOnly();

  registerRoute(
    ({ request }) => ['image', 'font', 'style', 'script'].includes(request.destination),
    staticStrategyInstance,
  );
}

// --- 오프라인 폴백 ---
setCatchHandler(async ({ event }) => {
  if ((event as FetchEvent).request.destination === 'document') {
    return caches.match('/offline.html') ?? Response.error();
  }
  return Response.error();
});

// --- 활성화 시 이전 환경 캐시 정리 ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_PREFIX))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

#### Vite 빌드 시 환경 변수 주입

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // 빌드 시점에 환경 변수를 SW 소스에 주입
        injectionPoint: undefined,
        rollupFormat: 'es',
      },
      // preview 환경에서는 SW 등록 자체를 건너뛸 수 있음
      disabled: mode === 'preview-no-sw',
    }),
  ],
  define: {
    '__APP_ENV__': JSON.stringify(mode),
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
  },
}));
```

### 2.2 환경별 매니페스트 동적 생성

앱 이름에 환경 태그를 포함하여 설치된 앱을 시각적으로 구분한다.

```typescript
// scripts/generate-manifest.ts
import { writeFileSync } from 'fs';
import { resolve } from 'path';

type AppEnv = 'production' | 'staging' | 'canary' | 'preview';

interface ManifestConfig {
  nameSuffix: string;
  themeColor: string;
  backgroundColor: string;
  startUrl: string;
  display: 'standalone' | 'minimal-ui' | 'browser';
  installable: boolean;
}

const ENV_MANIFEST: Record<AppEnv, ManifestConfig> = {
  production: {
    nameSuffix: '',
    themeColor: '#1a73e8',
    backgroundColor: '#ffffff',
    startUrl: '/',
    display: 'standalone',
    installable: true,
  },
  staging: {
    nameSuffix: ' [STG]',
    themeColor: '#f57c00',
    backgroundColor: '#fff3e0',
    startUrl: '/?env=staging',
    display: 'standalone',
    installable: true,
  },
  canary: {
    nameSuffix: ' [CANARY]',
    themeColor: '#7b1fa2',
    backgroundColor: '#f3e5f5',
    startUrl: '/?env=canary',
    display: 'standalone',
    installable: true,
  },
  preview: {
    nameSuffix: ' [PREVIEW]',
    themeColor: '#d32f2f',
    backgroundColor: '#ffebee',
    startUrl: '/?env=preview',
    display: 'minimal-ui',
    installable: false,
  },
};

function generateManifest(appName: string, env: AppEnv): void {
  const config = ENV_MANIFEST[env];
  const icons = [48, 72, 96, 128, 144, 192, 512].map((size) => ({
    src: `/icons/icon-${size}x${size}${env !== 'production' ? `-${env}` : ''}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: 'any',
  }));

  icons.push({
    src: `/icons/icon-maskable-512x512${env !== 'production' ? `-${env}` : ''}.png`,
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  });

  const manifest = {
    name: `${appName}${config.nameSuffix}`,
    short_name: `${appName.substring(0, 8)}${config.nameSuffix}`,
    description: env === 'production'
      ? '서비스 설명'
      : `${env.toUpperCase()} 테스트 환경`,
    start_url: config.startUrl,
    scope: '/',
    display: config.display,
    display_override: env === 'production'
      ? ['window-controls-overlay', 'standalone', 'browser']
      : [config.display, 'browser'],
    orientation: 'portrait',
    theme_color: config.themeColor,
    background_color: config.backgroundColor,
    lang: 'ko',
    dir: 'ltr',
    categories: ['productivity', 'utilities'],
    icons,
    screenshots: env === 'production' ? [
      { src: '/screenshots/wide-1.png', sizes: '1920x1080', type: 'image/png', form_factor: 'wide' },
      { src: '/screenshots/wide-2.png', sizes: '1920x1080', type: 'image/png', form_factor: 'wide' },
      { src: '/screenshots/narrow-1.png', sizes: '750x1334', type: 'image/png', form_factor: 'narrow' },
      { src: '/screenshots/narrow-2.png', sizes: '750x1334', type: 'image/png', form_factor: 'narrow' },
    ] : [],
    shortcuts: [
      { name: '빠른 작성', url: '/new?source=shortcut', icons: [{ src: '/icons/shortcut-new.png', sizes: '96x96' }] },
      { name: '검색', url: '/search?source=shortcut', icons: [{ src: '/icons/shortcut-search.png', sizes: '96x96' }] },
      { name: '알림 확인', url: '/notifications?source=shortcut', icons: [{ src: '/icons/shortcut-bell.png', sizes: '96x96' }] },
    ],
    share_target: {
      action: '/share-receive',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
        files: [{ name: 'media', accept: ['image/*', 'video/*'] }],
      },
    },
    related_applications: env === 'production' ? [
      { platform: 'play', url: 'https://play.google.com/store/apps/details?id=com.example.app' },
    ] : [],
    prefer_related_applications: false,
  };

  const outDir = resolve(process.cwd(), 'public');
  writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

// 실행
const env = (process.env.APP_ENV ?? 'production') as AppEnv;
generateManifest('MyApp', env);
```

### 2.3 Preview 환경 PWA 설치 차단

Preview 환경에서는 `beforeinstallprompt` 이벤트를 억제하여 사용자가 불완전한 빌드를 설치하는 것을 방지한다.

```typescript
// src/hooks/usePWAInstall.ts
import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  install: () => Promise<'accepted' | 'dismissed' | 'blocked'>;
  dismiss: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const currentEnv = import.meta.env.MODE;
  const isInstallBlocked = currentEnv === 'preview' || currentEnv === 'canary';

  useEffect(() => {
    // 이미 설치된 상태 감지
    const mql = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mql.addEventListener('change', handler);

    const onBeforeInstall = (e: Event) => {
      // Preview/Canary 환경에서는 설치 프롬프트 차단
      if (isInstallBlocked) {
        e.preventDefault();
        console.info(`[PWA] 설치 차단됨: ${currentEnv} 환경`);
        return;
      }
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      mql.removeEventListener('change', handler);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, [isInstallBlocked, currentEnv]);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'blocked'> => {
    if (isInstallBlocked) return 'blocked';
    if (!deferredPrompt) return 'dismissed';

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt, isInstallBlocked]);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
  }, []);

  return {
    canInstall: !isInstallBlocked && deferredPrompt !== null && !isInstalled,
    isInstalled,
    install,
    dismiss,
  };
}
```

#### 설치 차단 배너 컴포넌트

```typescript
// src/components/PWAInstallBanner.tsx
import React from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { canInstall, isInstalled, install, dismiss } = usePWAInstall();

  if (isInstalled || !canInstall) return null;

  return (
    <div role="banner" className="pwa-install-banner">
      <div className="pwa-install-banner__content">
        <strong>앱으로 설치하면 더 빠릅니다</strong>
        <p>홈 화면에 추가하여 네이티브 앱처럼 사용하세요.</p>
      </div>
      <div className="pwa-install-banner__actions">
        <button onClick={() => install()} className="btn btn--primary">설치</button>
        <button onClick={dismiss} className="btn btn--ghost">나중에</button>
      </div>
    </div>
  );
};
```

### 2.4 환경별 Push Notification 채널 분리

환경별로 Push Notification 토픽을 분리하여 테스트 알림이 프로덕션 사용자에게 전달되지 않도록 한다.

```typescript
// src/services/push-notification.ts
import { openDB } from 'idb';

interface PushConfig {
  vapidPublicKey: string;
  subscriptionEndpoint: string;
  topicPrefix: string;
  enabled: boolean;
}

const PUSH_CONFIGS: Record<string, PushConfig> = {
  production: {
    vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY_PROD,
    subscriptionEndpoint: 'https://api.example.com/push/subscribe',
    topicPrefix: 'prod',
    enabled: true,
  },
  staging: {
    vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY_STG,
    subscriptionEndpoint: 'https://api-stg.example.com/push/subscribe',
    topicPrefix: 'stg',
    enabled: true,
  },
  canary: {
    vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY_CANARY,
    subscriptionEndpoint: 'https://api-canary.example.com/push/subscribe',
    topicPrefix: 'canary',
    enabled: true,
  },
  preview: {
    vapidPublicKey: '',
    subscriptionEndpoint: '',
    topicPrefix: 'preview',
    enabled: false,   // Preview에서는 Push 비활성화
  },
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export class PushNotificationService {
  private config: PushConfig;
  private env: string;

  constructor(env: string = import.meta.env.MODE) {
    this.env = env;
    this.config = PUSH_CONFIGS[env] ?? PUSH_CONFIGS.preview;
  }

  async subscribe(topics: string[]): Promise<PushSubscription | null> {
    if (!this.config.enabled) {
      console.info(`[Push] ${this.env} 환경에서 Push 비활성화`);
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) return existingSub;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(this.config.vapidPublicKey),
    });

    // 서버에 구독 정보 + 환경 태그 전송
    const prefixedTopics = topics.map((t) => `${this.config.topicPrefix}:${t}`);

    await fetch(this.config.subscriptionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        topics: prefixedTopics,
        env: this.env,
        userAgent: navigator.userAgent,
      }),
    });

    return subscription;
  }

  async unsubscribe(): Promise<boolean> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    await fetch(this.config.subscriptionEndpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint, env: this.env }),
    });

    return subscription.unsubscribe();
  }

  getTopicName(topic: string): string {
    return `${this.config.topicPrefix}:${topic}`;
  }
}
```

### 2.5 Feature Flag 오프라인 기능 점진적 롤아웃

Feature Flag를 사용하여 오프라인 기능을 환경별, 사용자별로 점진적으로 활성화한다.

```typescript
// src/services/offline-feature-flags.ts

interface OfflineFeatureFlags {
  enableOfflineMode: boolean;         // 오프라인 모드 전체 활성화
  enableBackgroundSync: boolean;      // Background Sync 활성화
  enablePushNotification: boolean;    // Push Notification 활성화
  enablePeriodicSync: boolean;        // Periodic Background Sync
  enableOfflineAnalytics: boolean;    // 오프라인 분석 이벤트 큐잉
  offlineCacheQuotaMB: number;        // 캐시 최대 용량 (MB)
  syncRetryLimit: number;             // 동기화 재시도 횟수
}

const DEFAULT_FLAGS: Record<string, OfflineFeatureFlags> = {
  production: {
    enableOfflineMode: true,
    enableBackgroundSync: true,
    enablePushNotification: true,
    enablePeriodicSync: false,        // Periodic Sync는 점진적 롤아웃
    enableOfflineAnalytics: true,
    offlineCacheQuotaMB: 200,
    syncRetryLimit: 3,
  },
  staging: {
    enableOfflineMode: true,
    enableBackgroundSync: true,
    enablePushNotification: true,
    enablePeriodicSync: true,         // Staging에서 먼저 테스트
    enableOfflineAnalytics: true,
    offlineCacheQuotaMB: 100,
    syncRetryLimit: 5,
  },
  canary: {
    enableOfflineMode: true,
    enableBackgroundSync: true,
    enablePushNotification: false,
    enablePeriodicSync: true,
    enableOfflineAnalytics: false,
    offlineCacheQuotaMB: 50,
    syncRetryLimit: 3,
  },
  preview: {
    enableOfflineMode: false,
    enableBackgroundSync: false,
    enablePushNotification: false,
    enablePeriodicSync: false,
    enableOfflineAnalytics: false,
    offlineCacheQuotaMB: 0,
    syncRetryLimit: 0,
  },
};

export class OfflineFeatureFlagService {
  private flags: OfflineFeatureFlags;
  private remoteOverrides: Partial<OfflineFeatureFlags> = {};

  constructor(env: string = import.meta.env.MODE) {
    this.flags = DEFAULT_FLAGS[env] ?? DEFAULT_FLAGS.preview;
  }

  // 원격 Feature Flag 서비스에서 오버라이드 가져오기
  async fetchRemoteOverrides(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/feature-flags?user=${userId}&scope=offline`);
      if (response.ok) {
        this.remoteOverrides = await response.json();
      }
    } catch {
      // 오프라인이면 로컬 기본값 사용
    }
  }

  get(key: keyof OfflineFeatureFlags): boolean | number {
    return this.remoteOverrides[key] ?? this.flags[key];
  }

  isEnabled(key: keyof OfflineFeatureFlags): boolean {
    const value = this.get(key);
    return typeof value === 'boolean' ? value : value > 0;
  }

  // Service Worker에 현재 플래그 상태 전달
  async syncToServiceWorker(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: 'FEATURE_FLAGS_UPDATE',
      flags: { ...this.flags, ...this.remoteOverrides },
    });
  }
}

// React 훅
import { useState, useEffect, useContext, createContext } from 'react';

const FeatureFlagContext = createContext<OfflineFeatureFlagService | null>(null);

export function useOfflineFeatureFlag(key: keyof OfflineFeatureFlags): boolean {
  const service = useContext(FeatureFlagContext);
  if (!service) throw new Error('FeatureFlagProvider가 필요합니다');
  return service.isEnabled(key);
}
```

### 2.6 Service Worker 버전 충돌 방지

멀티 베타 환경에서 여러 버전의 Service Worker가 동시에 존재할 때 발생하는 충돌을 방지한다.

```typescript
// src/services/sw-version-manager.ts

interface SWVersionInfo {
  version: string;
  env: string;
  buildHash: string;
  registeredAt: number;
  scope: string;
}

export class ServiceWorkerVersionManager {
  private readonly STORAGE_KEY = 'sw-version-info';

  // 현재 등록된 SW 버전 정보 조회
  getCurrentVersion(): SWVersionInfo | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  // 새 SW 등록 전 버전 충돌 검사
  async checkConflict(
    newVersion: string,
    newEnv: string,
    newBuildHash: string,
  ): Promise<'clean' | 'upgrade' | 'env-switch' | 'conflict'> {
    const current = this.getCurrentVersion();

    if (!current) return 'clean';
    if (current.env !== newEnv) return 'env-switch';    // 환경 전환
    if (current.buildHash === newBuildHash) return 'clean'; // 동일 빌드
    if (current.version < newVersion) return 'upgrade';  // 정상 업그레이드

    return 'conflict'; // 동일 환경에서 버전 역행 등
  }

  // 충돌 해결: 기존 캐시 전체 삭제 후 재등록
  async resolveConflict(action: 'clean' | 'upgrade' | 'env-switch' | 'conflict'): Promise<void> {
    if (action === 'clean') return;

    // 기존 Service Worker 해제
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));

    // 캐시 전체 삭제 (환경 전환 또는 충돌 시)
    if (action === 'env-switch' || action === 'conflict') {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  }

  // 새 SW 등록 완료 후 버전 정보 저장
  saveVersion(version: string, env: string, buildHash: string): void {
    const info: SWVersionInfo = {
      version,
      env,
      buildHash,
      registeredAt: Date.now(),
      scope: '/',
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(info));
  }
}

// 앱 초기화 시 SW 등록 플로우
export async function registerServiceWorkerSafely(
  swUrl: string,
  version: string,
  env: string,
  buildHash: string,
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  const manager = new ServiceWorkerVersionManager();
  const action = await manager.checkConflict(version, env, buildHash);

  console.info(`[SW] 버전 상태: ${action} (v${version}, ${env}, ${buildHash.slice(0, 8)})`);

  await manager.resolveConflict(action);

  const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });

  // 업데이트 감지
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;

    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        // 새 SW가 대기 중 - 사용자에게 업데이트 알림
        dispatchEvent(new CustomEvent('sw-update-available', {
          detail: { version, env },
        }));
      }
    });
  });

  manager.saveVersion(version, env, buildHash);
  return registration;
}
```

---

## 3. Service Worker 라이프사이클

install, activate, fetch 전체 이벤트를 구현한다.

```typescript
// src/sw-lifecycle.ts
declare let self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/app.css',
  '/assets/app.js',
];

// ---- install ----
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  // 대기 없이 즉시 활성화
  self.skipWaiting();
});

// ---- activate ----
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // 이전 버전 캐시 삭제
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key)),
      );
      // 현재 열린 모든 탭에 즉시 적용
      await self.clients.claim();
      // 네비게이션 프리로드 활성화
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
    })(),
  );
});

// ---- fetch ----
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // 네비게이션 요청: 프리로드 응답 우선, 실패 시 캐시, 최종 폴백
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  // 정적 리소스: Cache First
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function handleNavigation(event: FetchEvent): Promise<Response> {
  try {
    // 네비게이션 프리로드 응답 우선
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) return preloadResponse;

    return await fetch(event.request);
  } catch {
    const cached = await caches.match('/offline.html');
    return cached ?? new Response('<h1>오프라인</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
```

---

## 4. Workbox 6 + Vite PWA 설정

injectManifest 모드로 Workbox를 설정하여 Service Worker를 완전히 제어한다.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',       // 사용자에게 업데이트 확인 요청
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'robots.txt',
        'offline.html',
      ],
      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2}',
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,  // 3MB
        rollupFormat: 'es',
      },
      manifest: false,  // 외부에서 동적 생성 (2.2절 참조)
      devOptions: {
        enabled: mode !== 'preview',
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
}));
```

#### SW 등록 및 업데이트 관리

```typescript
// src/sw-register.ts
import { registerSW } from 'virtual:pwa-register';

let updateAvailable = false;

const updateSW = registerSW({
  onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
    if (!registration) return;

    // 주기적 업데이트 확인 (1시간마다)
    setInterval(async () => {
      if (registration.installing || !navigator.onLine) return;
      const response = await fetch(swUrl, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
      });
      if (response.ok) {
        await registration.update();
      }
    }, 60 * 60 * 1000);
  },

  onNeedRefresh() {
    updateAvailable = true;
    // UI에 업데이트 알림 표시
    dispatchEvent(new CustomEvent('pwa-update-available'));
  },

  onOfflineReady() {
    console.info('[PWA] 오프라인 준비 완료');
  },

  onRegisterError(error: Error) {
    console.error('[PWA] SW 등록 실패:', error);
  },
});

// 사용자가 업데이트 수락 시 호출
export function acceptUpdate(): void {
  if (updateAvailable) {
    updateSW(true);
  }
}
```

---

## 5. 캐싱 전략 4종 비교

### 비교표

| 전략 | 네트워크 | 캐시 | 속도 | 신선도 | 적합 대상 |
|------|---------|------|------|--------|-----------|
| Cache First | 폴백 | 우선 | 빠름 | 낮음 | 폰트, 이미지, 정적 JS/CSS |
| Network First | 우선 | 폴백 | 보통 | 높음 | API, 사용자 데이터 |
| Stale While Revalidate | 백그라운드 갱신 | 즉시 반환 | 빠름 | 중간 | CDN, 자주 바뀌는 정적 리소스 |
| Network Only | 필수 | 미사용 | 느림 | 최신 | 인증, 결제, 실시간 데이터 |

### 전략별 구현

```typescript
// src/sw-strategies.ts
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

const responsePlugin = new CacheableResponsePlugin({ statuses: [0, 200] });

// 1. Cache First - 폰트, 이미지
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      responsePlugin,
      new ExpirationPlugin({ maxAgeSeconds: 86400 * 365, maxEntries: 30 }),
    ],
  }),
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      responsePlugin,
      new ExpirationPlugin({ maxAgeSeconds: 86400 * 30, maxEntries: 100 }),
    ],
  }),
);

// 2. Network First - API
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      responsePlugin,
      new ExpirationPlugin({ maxAgeSeconds: 300, maxEntries: 200 }),
    ],
  }),
);

// 3. Stale While Revalidate - CDN 리소스
registerRoute(
  ({ url }) => url.origin !== self.location.origin,
  new StaleWhileRevalidate({
    cacheName: 'cdn-cache',
    plugins: [
      responsePlugin,
      new ExpirationPlugin({ maxAgeSeconds: 86400 * 7, maxEntries: 50 }),
    ],
  }),
);

// 4. Network Only - 인증 관련
registerRoute(
  ({ url }) => url.pathname.startsWith('/auth/'),
  new NetworkOnly({
    plugins: [
      new BackgroundSyncPlugin('auth-retry-queue', {
        maxRetentionTime: 60,  // 1시간
      }),
    ],
  }),
);
```

---

## 6. 오프라인 UX 패턴

### 6.1 네트워크 상태 감지 훅

```typescript
// src/hooks/useNetworkStatus.ts
import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  lastOnlineAt: number | null;
  connectionType: string | null;
  effectiveType: string | null;   // 'slow-2g' | '2g' | '3g' | '4g'
  downlink: number | null;        // Mbps
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: navigator.onLine,
    lastOnlineAt: navigator.onLine ? Date.now() : null,
    connectionType: null,
    effectiveType: null,
    downlink: null,
  }));

  const updateConnectionInfo = useCallback(() => {
    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    setStatus((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
      lastOnlineAt: navigator.onLine ? Date.now() : prev.lastOnlineAt,
      connectionType: conn?.type ?? null,
      effectiveType: conn?.effectiveType ?? null,
      downlink: conn?.downlink ?? null,
    }));
  }, []);

  useEffect(() => {
    const onOnline = () => updateConnectionInfo();
    const onOffline = () => updateConnectionInfo();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    conn?.addEventListener('change', updateConnectionInfo);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      conn?.removeEventListener('change', updateConnectionInfo);
    };
  }, [updateConnectionInfo]);

  return status;
}

interface NetworkInformation extends EventTarget {
  type: string;
  effectiveType: string;
  downlink: number;
}
```

### 6.2 IndexedDB 오프라인 큐

```typescript
// src/services/offline-queue.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineAction {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  errorMessage?: string;
}

interface OfflineQueueDB extends DBSchema {
  actions: {
    key: string;
    value: OfflineAction;
    indexes: {
      'by-status': string;
      'by-timestamp': number;
    };
  };
}

export class OfflineQueue {
  private dbPromise: Promise<IDBPDatabase<OfflineQueueDB>>;

  constructor(dbName = 'offline-queue') {
    this.dbPromise = openDB<OfflineQueueDB>(dbName, 1, {
      upgrade(db) {
        const store = db.createObjectStore('actions', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }

  async enqueue(
    url: string,
    method: OfflineAction['method'],
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<string> {
    const db = await this.dbPromise;
    const id = crypto.randomUUID();
    const action: OfflineAction = {
      id,
      url,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : null,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
    };
    await db.put('actions', action);
    return id;
  }

  async getPending(): Promise<OfflineAction[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('actions', 'by-status', 'pending');
  }

  async getFailed(): Promise<OfflineAction[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('actions', 'by-status', 'failed');
  }

  async markSyncing(id: string): Promise<void> {
    const db = await this.dbPromise;
    const action = await db.get('actions', id);
    if (action) {
      action.status = 'syncing';
      await db.put('actions', action);
    }
  }

  async markCompleted(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('actions', id);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const db = await this.dbPromise;
    const action = await db.get('actions', id);
    if (action) {
      action.retryCount += 1;
      action.errorMessage = error;
      action.status = action.retryCount >= action.maxRetries ? 'failed' : 'pending';
      await db.put('actions', action);
    }
  }

  async getQueueSize(): Promise<number> {
    const db = await this.dbPromise;
    return db.countFromIndex('actions', 'by-status', 'pending');
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('actions');
  }
}
```

### 6.3 Background Sync 동기화 엔진

```typescript
// src/services/sync-engine.ts
import { OfflineQueue } from './offline-queue';

interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current: string | null;
}

type SyncProgressCallback = (progress: SyncProgress) => void;

export class SyncEngine {
  private queue: OfflineQueue;
  private isSyncing = false;

  constructor(queue: OfflineQueue) {
    this.queue = queue;
  }

  async syncAll(onProgress?: SyncProgressCallback): Promise<SyncProgress> {
    if (this.isSyncing) throw new Error('동기화 진행 중');
    this.isSyncing = true;

    const pending = await this.queue.getPending();
    const progress: SyncProgress = {
      total: pending.length,
      completed: 0,
      failed: 0,
      current: null,
    };

    for (const action of pending) {
      progress.current = action.id;
      onProgress?.(progress);

      await this.queue.markSyncing(action.id);

      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        await this.queue.markCompleted(action.id);
        progress.completed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await this.queue.markFailed(action.id, message);
        progress.failed += 1;
      }

      onProgress?.(progress);

      // 지수 백오프 간격
      if (progress.failed > 0) {
        await this.delay(Math.min(1000 * 2 ** progress.failed, 30000));
      }
    }

    progress.current = null;
    this.isSyncing = false;
    onProgress?.(progress);
    return progress;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 6.4 충돌 해결 (3-way Merge)

```typescript
// src/services/conflict-resolver.ts

interface VersionedRecord {
  id: string;
  data: Record<string, unknown>;
  version: number;
  updatedAt: number;
  updatedBy: string;
}

interface ConflictInfo {
  field: string;
  baseValue: unknown;
  localValue: unknown;
  serverValue: unknown;
}

interface MergeResult {
  resolved: Record<string, unknown>;
  conflicts: ConflictInfo[];      // 자동 병합 실패한 필드
  strategy: 'auto-merged' | 'manual-required';
}

export class ConflictResolver {
  /**
   * 3-way merge: base(공통 조상), local(클라이언트), server(서버)를 비교하여
   * 자동 병합이 가능한 필드는 병합하고, 충돌하는 필드는 목록으로 반환한다.
   */
  threeWayMerge(
    base: VersionedRecord,
    local: VersionedRecord,
    server: VersionedRecord,
  ): MergeResult {
    const allFields = new Set([
      ...Object.keys(base.data),
      ...Object.keys(local.data),
      ...Object.keys(server.data),
    ]);

    const resolved: Record<string, unknown> = {};
    const conflicts: ConflictInfo[] = [];

    for (const field of allFields) {
      const baseVal = base.data[field];
      const localVal = local.data[field];
      const serverVal = server.data[field];

      const localChanged = !this.deepEqual(baseVal, localVal);
      const serverChanged = !this.deepEqual(baseVal, serverVal);

      if (!localChanged && !serverChanged) {
        // 양쪽 모두 변경 없음
        resolved[field] = baseVal;
      } else if (localChanged && !serverChanged) {
        // 로컬만 변경
        resolved[field] = localVal;
      } else if (!localChanged && serverChanged) {
        // 서버만 변경
        resolved[field] = serverVal;
      } else if (this.deepEqual(localVal, serverVal)) {
        // 양쪽 동일하게 변경
        resolved[field] = localVal;
      } else {
        // 충돌: 양쪽 다르게 변경
        conflicts.push({ field, baseValue: baseVal, localValue: localVal, serverValue: serverVal });
        resolved[field] = serverVal; // 기본값은 서버 우선
      }
    }

    return {
      resolved,
      conflicts,
      strategy: conflicts.length === 0 ? 'auto-merged' : 'manual-required',
    };
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
```

#### 충돌 해결 UI 컴포넌트

```typescript
// src/components/ConflictResolutionDialog.tsx
import React, { useState } from 'react';
import { ConflictInfo } from '@/services/conflict-resolver';

interface Props {
  conflicts: ConflictInfo[];
  onResolve: (resolutions: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const ConflictResolutionDialog: React.FC<Props> = ({
  conflicts,
  onResolve,
  onCancel,
}) => {
  const [selections, setSelections] = useState<Record<string, 'local' | 'server'>>(() =>
    Object.fromEntries(conflicts.map((c) => [c.field, 'server'])),
  );

  const handleResolve = () => {
    const resolved: Record<string, unknown> = {};
    for (const conflict of conflicts) {
      resolved[conflict.field] = selections[conflict.field] === 'local'
        ? conflict.localValue
        : conflict.serverValue;
    }
    onResolve(resolved);
  };

  return (
    <dialog open className="conflict-dialog">
      <h2>데이터 충돌 해결</h2>
      <p>오프라인에서 수정한 내용과 서버 내용이 다릅니다. 각 항목에 대해 유지할 버전을 선택하세요.</p>

      <table className="conflict-table">
        <thead>
          <tr>
            <th>필드</th>
            <th>내 변경 (로컬)</th>
            <th>서버 변경</th>
            <th>선택</th>
          </tr>
        </thead>
        <tbody>
          {conflicts.map((conflict) => (
            <tr key={conflict.field}>
              <td><strong>{conflict.field}</strong></td>
              <td className={selections[conflict.field] === 'local' ? 'selected' : ''}>
                <code>{JSON.stringify(conflict.localValue)}</code>
              </td>
              <td className={selections[conflict.field] === 'server' ? 'selected' : ''}>
                <code>{JSON.stringify(conflict.serverValue)}</code>
              </td>
              <td>
                <select
                  value={selections[conflict.field]}
                  onChange={(e) =>
                    setSelections((prev) => ({ ...prev, [conflict.field]: e.target.value as 'local' | 'server' }))
                  }
                >
                  <option value="local">내 변경</option>
                  <option value="server">서버 변경</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="conflict-dialog__actions">
        <button onClick={handleResolve} className="btn btn--primary">적용</button>
        <button onClick={onCancel} className="btn btn--ghost">취소</button>
      </div>
    </dialog>
  );
};
```

---

## 7. Web Push Notifications

### 7.1 VAPID 키 생성

```typescript
// scripts/generate-vapid-keys.ts
import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();
console.log('VAPID Public Key:', vapidKeys.publicKey);
console.log('VAPID Private Key:', vapidKeys.privateKey);
// .env에 저장:
// VITE_VAPID_PUBLIC_KEY=<publicKey>
// VAPID_PRIVATE_KEY=<privateKey>
```

### 7.2 Service Worker Push 핸들러

```typescript
// src/sw-push.ts (sw.ts에서 import)
declare let self: ServiceWorkerGlobalScope;

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  const payload: PushPayload = event.data.json();

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icons/icon-192x192.png',
      badge: payload.badge ?? '/icons/badge-72x72.png',
      tag: payload.tag ?? `notification-${Date.now()}`,
      data: { url: payload.url ?? '/' },
      actions: payload.actions ?? [
        { action: 'confirm', title: '확인' },
        { action: 'dismiss', title: '무시' },
      ],
      requireInteraction: false,
      silent: false,
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data as { url: string })?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clients) {
        if (new URL(client.url).pathname === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // 없으면 새 창 열기
      return self.clients.openWindow(targetUrl);
    }),
  );
});

// 알림 닫힘 추적 (분석용)
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  const tag = event.notification.tag;
  // 분석 이벤트 전송 (오프라인이면 큐잉)
  fetch('/api/analytics/notification-dismissed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag, timestamp: Date.now() }),
  }).catch(() => { /* 오프라인이면 무시 */ });
});
```

### 7.3 클라이언트 구독 관리 훅

```typescript
// src/hooks/usePushNotification.ts
import { useState, useEffect, useCallback } from 'react';

interface PushState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotification(vapidPublicKey: string): PushState {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(sub !== null);
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const padding = '='.repeat((4 - (vapidPublicKey.length % 4)) % 4);
    const base64 = (vapidPublicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const key = Uint8Array.from(rawData, (c) => c.charCodeAt(0));

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    setIsSubscribed(true);
  }, [isSupported, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    }
    setIsSubscribed(false);
  }, []);

  return { isSupported, permission, isSubscribed, subscribe, unsubscribe };
}
```

### 7.4 서버 발송 API

```typescript
// server/push-sender.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface PushMessage {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

export async function sendPushNotification(
  targets: PushTarget[],
  message: PushMessage,
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    targets.map((target) =>
      webpush.sendNotification(
        { endpoint: target.endpoint, keys: target.keys },
        JSON.stringify(message),
        { TTL: 86400, urgency: 'normal' },
      ),
    ),
  );

  return {
    success: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}
```

---

## 8. App Manifest & 설치 프롬프트

매니페스트 동적 생성은 [2.2절](#22-환경별-매니페스트-동적-생성)을 참조한다. 설치 프롬프트 관리는 [2.3절](#23-preview-환경-pwa-설치-차단)의 `usePWAInstall` 훅을 참조한다.

### Lighthouse PWA 점수 100 체크리스트

```typescript
// scripts/pwa-audit-checklist.ts
// Lighthouse PWA 감사 항목 자동 점검 스크립트

interface AuditItem {
  id: string;
  description: string;
  check: () => Promise<boolean>;
}

const PWA_CHECKLIST: AuditItem[] = [
  {
    id: 'manifest-exists',
    description: 'manifest.json 존재',
    check: async () => {
      const res = await fetch('/manifest.json');
      return res.ok;
    },
  },
  {
    id: 'sw-registered',
    description: 'Service Worker 등록됨',
    check: async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.length > 0;
    },
  },
  {
    id: 'https',
    description: 'HTTPS 사용',
    check: async () => location.protocol === 'https:',
  },
  {
    id: 'offline-fallback',
    description: '오프라인 폴백 페이지 존재',
    check: async () => {
      const cache = await caches.open('static-v2');
      const match = await cache.match('/offline.html');
      return match !== undefined;
    },
  },
  {
    id: 'icons-192',
    description: '192x192 아이콘 존재',
    check: async () => {
      const res = await fetch('/icons/icon-192x192.png');
      return res.ok;
    },
  },
  {
    id: 'icons-512',
    description: '512x512 아이콘 존재',
    check: async () => {
      const res = await fetch('/icons/icon-512x512.png');
      return res.ok;
    },
  },
  {
    id: 'maskable-icon',
    description: 'Maskable 아이콘 존재',
    check: async () => {
      const res = await fetch('/manifest.json');
      const manifest = await res.json();
      return manifest.icons?.some((i: { purpose?: string }) => i.purpose?.includes('maskable'));
    },
  },
  {
    id: 'theme-color',
    description: 'theme-color 메타태그 존재',
    check: async () => {
      const meta = document.querySelector('meta[name="theme-color"]');
      return meta !== null;
    },
  },
  {
    id: 'viewport',
    description: 'viewport 메타태그 존재',
    check: async () => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta !== null && meta.getAttribute('content')?.includes('width=device-width') === true;
    },
  },
  {
    id: 'start-url',
    description: 'start_url이 캐시에 존재',
    check: async () => {
      const res = await fetch('/manifest.json');
      const manifest = await res.json();
      const startUrl = manifest.start_url ?? '/';
      const cached = await caches.match(startUrl);
      return cached !== undefined;
    },
  },
];

export async function runPWAAudit(): Promise<void> {
  console.group('PWA Audit Checklist');
  for (const item of PWA_CHECKLIST) {
    try {
      const passed = await item.check();
      console.log(`${passed ? 'PASS' : 'FAIL'} ${item.description}`);
    } catch {
      console.log(`FAIL ${item.description} (에러 발생)`);
    }
  }
  console.groupEnd();
}
```

---

## 9. Background Sync & Periodic Sync

### 9.1 Background Sync

```typescript
// Service Worker 내 Background Sync 핸들러
// src/sw-sync.ts

declare let self: ServiceWorkerGlobalScope;

import { openDB } from 'idb';

const SYNC_TAG = 'offline-actions-sync';
const DB_NAME = 'offline-queue';

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue(): Promise<void> {
  const db = await openDB(DB_NAME, 1);
  const tx = db.transaction('actions', 'readwrite');
  const store = tx.objectStore('actions');
  const index = store.index('by-status');
  const pending = await index.getAll('pending');

  let completed = 0;
  let failed = 0;

  for (const action of pending) {
    try {
      action.status = 'syncing';
      await store.put(action);

      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await store.delete(action.id);
      completed += 1;
    } catch (error) {
      action.retryCount += 1;
      action.status = action.retryCount >= action.maxRetries ? 'failed' : 'pending';
      action.errorMessage = error instanceof Error ? error.message : 'Unknown';
      await store.put(action);
      failed += 1;
    }
  }

  await tx.done;

  // 클라이언트에 동기화 결과 알림
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      payload: { total: pending.length, completed, failed },
    });
  }
}

// 클라이언트에서 Background Sync 등록
export async function requestBackgroundSync(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register(SYNC_TAG);
}
```

### 9.2 Periodic Background Sync

```typescript
// src/services/periodic-sync.ts

const PERIODIC_SYNC_TAG = 'content-prefetch';
const MIN_INTERVAL = 12 * 60 * 60 * 1000; // 12시간

export async function registerPeriodicSync(): Promise<boolean> {
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.info('[PeriodicSync] 지원하지 않는 브라우저');
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const status = await navigator.permissions.query({
    name: 'periodic-background-sync' as PermissionName,
  });

  if (status.state !== 'granted') {
    console.info('[PeriodicSync] 권한 없음');
    return false;
  }

  await registration.periodicSync.register(PERIODIC_SYNC_TAG, {
    minInterval: MIN_INTERVAL,
  });

  return true;
}

// Service Worker 내 Periodic Sync 핸들러
// sw-periodic-sync.ts
declare let self: ServiceWorkerGlobalScope;

self.addEventListener('periodicsync', (event: PeriodicSyncEvent) => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(prefetchContent());
  }
});

async function prefetchContent(): Promise<void> {
  const urls = [
    '/api/feed/latest',
    '/api/notifications/unread-count',
  ];

  const cache = await caches.open('prefetch-cache');

  await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    }),
  );
}

// PeriodicSyncEvent 타입 선언
interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

interface SyncEvent extends ExtendableEvent {
  tag: string;
  lastChance: boolean;
}

declare global {
  interface ServiceWorkerRegistration {
    periodicSync: {
      register(tag: string, options?: { minInterval?: number }): Promise<void>;
      unregister(tag: string): Promise<void>;
      getTags(): Promise<string[]>;
    };
    sync: {
      register(tag: string): Promise<void>;
      getTags(): Promise<string[]>;
    };
  }
}
```

### 9.3 React 동기화 상태 훅

```typescript
// src/hooks/useSyncStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { OfflineQueue } from '@/services/offline-queue';
import { SyncEngine } from '@/services/sync-engine';

interface SyncStatus {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: { completed: number; failed: number } | null;
  syncNow: () => Promise<void>;
}

export function useSyncStatus(): SyncStatus {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ completed: number; failed: number } | null>(null);

  const queue = new OfflineQueue();
  const engine = new SyncEngine(queue);

  // Service Worker로부터 동기화 완료 메시지 수신
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        const { completed, failed } = event.data.payload;
        setLastSyncResult({ completed, failed });
        setIsSyncing(false);
        queue.getQueueSize().then(setPendingCount);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [queue]);

  // 초기 큐 크기 로드
  useEffect(() => {
    queue.getQueueSize().then(setPendingCount);
  }, [queue]);

  const syncNow = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);

    const result = await engine.syncAll((progress) => {
      setPendingCount(progress.total - progress.completed - progress.failed);
    });

    setLastSyncResult({ completed: result.completed, failed: result.failed });
    setIsSyncing(false);
    setPendingCount(await queue.getQueueSize());
  }, [isSyncing, engine, queue]);

  return { pendingCount, isSyncing, lastSyncResult, syncNow };
}
```
