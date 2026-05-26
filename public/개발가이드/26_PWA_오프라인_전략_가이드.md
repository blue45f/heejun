# 26. PWA & 오프라인 전략 가이드 (2026 Edition)

| 분류 | 핵심 기술 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [08. 성능](./08_성능_최적화_가이드.md), [12. CDN](./12_CDN_캐시_전략.md) | **도구 원칙** | 벤더 중립 |
| **핵심 테마** | Service Worker, 오프라인 전략, 캐싱 패턴, Background Sync, Web Push, OPFS | **Update** | 2026.05 |

---

> **"PWA의 핵심은 설치 배지가 아니라, 네트워크가 불안정해도 사용자의 작업을 잃지 않는 신뢰성이다."**
> 본 가이드는 특정 PWA 플러그인이나 래퍼가 아니라 **Service Worker 라이프사이클, 캐시 책임 분리, 오프라인 UX, 동기화, 저장소 quota, 배포 안전성**을 기준으로 PWA를 설계하는 방법을 다룹니다. Workbox, Serwist, 프레임워크 플러그인은 구현 후보입니다.
>
> **2026년 5월 핵심 변화 요약**
> - **Service Worker cache governance**: framework/server cache, CDN cache, browser HTTP cache, Service Worker cache의 책임을 분리해야 장애를 줄일 수 있습니다.
> - **Web Push/설치 UX**: 모바일 브라우저별 설치/권한/알림 지원 차이가 크므로 기능 감지와 fallback UX가 필수입니다.
> - **OPFS/Storage Buckets**: 대용량 오프라인 데이터는 IndexedDB만으로 처리하지 않고 파일성 데이터와 구조화 데이터를 분리합니다.
> - **Background sync**: 브라우저 지원 편차가 있으므로 온라인 복귀 감지와 앱 내부 queue flush를 기본 fallback으로 둡니다.
> - **Tooling conditional**: Workbox/Serwist/프레임워크 플러그인은 공식 latest, peer dependency, framework cache와의 충돌 여부를 확인한 뒤 채택합니다.

---

## 문서 책임 범위

| 이 문서가 결정하는 것 | 단일 출처로 따르는 문서 |
| :--- | :--- |
| Service Worker 수명주기, 앱 오프라인 UX, 캐시 책임 분리 | [12. CDN 캐시](./12_CDN_캐시_전략.md), [08. 성능](./08_성능_최적화_가이드.md) |
| 배포 중 Service Worker 업데이트와 rollback 안전성 | [14. 배포](./14_배포_프로세스_체크리스트.md), [09. 관측성](./09_장애_대응_및_관측성_표준.md) |
| 브라우저별 Push/install/background sync fallback | [13. 브라우저 호환성](./13_브라우저_호환성_가이드.md) |
| AI가 만든 Service Worker/캐시 전략 초안 검증 | [18. AI 개발 워크플로우](./18_AI_개발_워크플로우_종합.md) |

---

## 0. 모든 프론트엔드 그룹 공통 Baseline

| 기준 | 최소 적용 |
| :--- | :--- |
| **캐시 책임 분리** | HTTP/CDN cache, framework cache, Service Worker cache의 소유권과 무효화 기준을 문서화합니다. |
| **오프라인 UX** | 읽기/쓰기 가능 기능, 저장 대기열, 충돌 해결, 복구 메시지를 정의합니다. |
| **업데이트 안전성** | Service Worker skipWaiting/clientsClaim 사용 여부와 rollback 경로를 검증합니다. |
| **저장소 관리** | Cache Storage, IndexedDB, OPFS, quota/eviction 정책을 고려합니다. |
| **지원 편차 대응** | Push, install prompt, Background Sync, file API는 feature detection과 fallback을 둡니다. |

### 0.1 교차 검증 매트릭스

| 권고 | 1차 출처 | 실행 증거 | 운영 증거 | 철회 조건 |
| :--- | :--- | :--- | :--- | :--- |
| Service Worker는 라우트별 캐시 전략과 eviction 정책을 함께 둔다 | MDN/web.dev Service Worker/PWA 문서 | offline E2E, cache quota test | cache hit ratio, stale response incident | 앱이 완전 온라인 전용이고 offline UX 가치가 낮을 때 |
| 쓰기 작업은 offline queue와 idempotency key를 사용한다 | Background Sync/IndexedDB 문서, API idempotency 정책 | offline mutation replay test | duplicate write, sync failure rate | 서버가 idempotent write를 지원하지 않을 때 |
| Push/installation은 feature detection과 사용자 맥락 기반 요청으로 처리한다 | Web Push/Web App Manifest 문서 | permission flow E2E | opt-in rate, notification complaint | 알림이 제품 가치보다 방해가 클 때 |
| PWA tooling은 framework cache와 충돌 검증 후 도입한다 | 도구 공식 release/compat 문서 | navigation preload, cache invalidation test | update failure, stale shell incident | 수동 Service Worker가 더 작고 명확할 때 |

### 0.2 운영 게이트

| Gate | Evidence | Owner | Rollback |
| :--- | :--- | :--- | :--- |
| Service Worker release gate | install/update/offline E2E, cache manifest diff | Release owner | SW unregister guide, cache purge, previous asset manifest |
| Cache policy gate | route TTL matrix, quota test, stale response test | Platform owner | runtime cache disable flag |
| Offline write gate | idempotency test, replay trace, conflict UI evidence | Feature owner | offline write flag off, queue drain runbook |
| Push/Install gate | permission UX test, opt-out path, browser support matrix | Product owner | prompt disabled, subscription cleanup |

---

## 목차

1. [AI 기반 PWA 개발 자동화](#1-ai-기반-pwa-개발-자동화)
2. [환경별 PWA 운영 전략](#2-환경별-pwa-운영-전략)
   - [2.1 환경별 Service Worker 분리](#21-환경별-service-worker-분리)
   - [2.2 환경별 매니페스트 동적 생성](#22-환경별-매니페스트-동적-생성)
   - [2.3 Preview 환경 PWA 설치 차단](#23-preview-환경-pwa-설치-차단)
   - [2.4 환경별 Push Notification 채널 분리](#24-환경별-push-notification-채널-분리)
   - [2.5 Feature Flag 오프라인 기능 점진적 롤아웃](#25-feature-flag-오프라인-기능-점진적-롤아웃)
   - [2.6 Service Worker 버전 충돌 방지](#26-service-worker-버전-충돌-방지)
3. [Service Worker 라이프사이클](#3-service-worker-라이프사이클)
4. [Workbox 7.x + Vite PWA 설정](#4-workbox-7x--vite-pwa-설정)
5. [캐싱 전략 4종 비교](#5-캐싱-전략-4종-비교)
6. [오프라인 UX 패턴](#6-오프라인-ux-패턴)
7. [Web Push Notifications](#7-web-push-notifications)
8. [App Manifest & 설치 프롬프트](#8-app-manifest--설치-프롬프트)
8.5 [File System Access / OPFS / Storage Buckets API (2026)](#85-file-system-access--opfs--storage-buckets-api-2026)
9. [Background Sync & Periodic Sync](#9-background-sync--periodic-sync)
10. [Serwist (Next.js PWA 대안)](#10-serwist-nextjs-pwa-대안)
11. [PWA 디버깅 & 트러블슈팅](#11-pwa-디버깅--트러블슈팅)
12. [체크리스트](#12-체크리스트)

---

## 1. AI 기반 PWA 개발 자동화

이 섹션의 AI 입력 구조, 민감정보 제거, 검증 책임은 [18. AI 개발 워크플로우](./18_AI_개발_워크플로우_종합.md)를 단일 출처로 따릅니다. 여기서는 Service Worker, 캐시, 오프라인 UX 검증에 필요한 도메인별 질문만 다룹니다.

AI는 Service Worker 초안, 캐싱 전략 후보, 오프라인 UX 시나리오, 테스트 케이스를 빠르게 만들 수 있다. 최종 적용은 브라우저 호환성, 캐시 무효화 위험, 배포 롤백 가능성을 검증한 뒤 사람이 승인한다.

| 시나리오 | 입력 | AI 산출물 | 필수 검증 | 승인 조건 |
| :--- | :--- | :--- | :--- | :--- |
| Service Worker 초안 | route map, build assets, framework cache 정책 | precache/runtime route 후보 | offline E2E, update flow, rollback test | stale HTML/API 응답 위험이 통제됨 |
| 캐싱 전략 설계 | 리소스 유형, TTL, 개인화 여부 | route별 전략, cache name, eviction rule | cache hit ratio, quota test | CDN/HTTP/SW cache 책임이 분리됨 |
| 오프라인 UX | 읽기/쓰기 flow, conflict model | offline banner, queue, retry, conflict UI | network emulation E2E | 사용자 작업 유실 없음 |
| Push 알림 | 권한 UX, payload, topic, unsubscribe | subscription flow, SW event handler 초안 | permission UX, click/open test | 사용자 제스처와 opt-out 보장 |
| Background Sync | queue schema, retry policy, idempotency key | sync queue, backoff, dead-letter 후보 | offline/online transition test | 중복 제출과 순서 뒤섞임 방지 |
| Manifest | app identity, icons, screenshots, shortcuts | manifest 초안과 asset checklist | installability audit, icon mask test | 설치 실패 시 명확한 fallback |
| PWA 회귀 테스트 | 핵심 route, SW state, cache state | Playwright 시나리오 후보 | CI trace, browser matrix | 배포 전 update/install/offline 흐름 검증 |

AI 보조 도구로 Service Worker를 만들 때는 다음 제약을 prompt에 포함합니다.

- TypeScript strict 기준과 Service Worker 전용 타입 사용
- cache name/version, TTL, maxEntries, eviction 정책 명시
- 인증/결제/개인화 API는 기본적으로 장기 캐시 금지
- `skipWaiting`/`clientsClaim` 사용 여부와 rollback 경로 명시
- offline fallback, stale response 감지, cache purge runbook 포함

## 2. 환경별 PWA 운영 전략

Preview, staging, canary, production 환경에서 PWA가 일관되게 동작하면서도 환경별 특성에 맞게 분리 운영하기 위한 전략이다.

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
    related_applications: env === 'production'
      ? JSON.parse(process.env.RELATED_NATIVE_APPS_JSON ?? '[]')
      : [],
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

환경별 릴리스에서 여러 버전의 Service Worker가 동시에 존재할 때 발생하는 충돌을 방지한다.

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

## 4. Workbox 7.x + Vite PWA 설정

> **Workbox 운영 기준 (2026-05)**
> - 공식 릴리스 확인 시 7.4.x 라인이 최신으로 확인됩니다. patch 버전은 lockfile로 고정하고, major 업그레이드는 공식 release note와 별도 검증 PR을 거칩니다.
> - `generateSW`는 단순 앱 셸 캐싱에 적합하고, `injectManifest`는 Push/Background Sync/커스텀 라우팅이 필요한 제품에 적합합니다.
> - Vite에서는 `vite-plugin-pwa`가 Workbox 설정을 감싸므로, 플러그인 버전과 Workbox peer dependency를 함께 고정합니다.
> - Next.js에서는 공식 PWA 가이드, 직접 Service Worker, Serwist, Workbox 후보를 비교하고 App Router 캐시와 Service Worker 캐시의 책임을 분리합니다.

Push, Background Sync, 커스텀 라우팅처럼 Service Worker를 직접 제어해야 하는 제품은 `injectManifest` 모드를 후보로 둡니다. 단순 앱 셸 캐싱만 필요하면 `generateSW`가 더 낮은 운영 비용일 수 있습니다.

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

> **Workbox 6/7 운영 핵심 포인트**
> - 패키지: `workbox-precaching`, `workbox-routing` 등 패키지 이름은 동일합니다. 메이저 업그레이드는 공식 릴리스 노트를 확인한 뒤 별도 PR로 진행합니다.
> - `precacheAndRoute(self.__WB_MANIFEST)` 시그니처는 유지.
> - `registerRoute()`의 매처는 함수 또는 RegExp로 명확히 분리하고, 인증/결제/개인화 API는 기본적으로 `NetworkOnly` 또는 짧은 TTL의 `NetworkFirst`를 사용합니다.
> - 특정 분석 서비스 전용 오프라인 플러그인에 신규 의존하지 않습니다. 분석 이벤트는 온라인 상태에서 직접 전송하거나 서버 이벤트 수집으로 분리합니다.

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

> **2026년 모바일 브라우저 Web Push 핵심 제약**
> - 일부 모바일 브라우저는 **홈 화면에 설치된 PWA (`display: standalone`)** 에서만 Push API가 동작한다. 일반 브라우저 탭에서는 권한 요청 자체가 거부될 수 있다.
> - 권한 요청은 **사용자 제스처(클릭/탭) 직후에만** 호출 가능. `useEffect`나 페이지 로드 시 자동 호출 금지.
> - manifest의 `display`가 `standalone` 또는 `fullscreen`이어야 한다. `minimal-ui`/`browser`로 폴백되면 Push 비활성화.
> - 지역/플랫폼 정책에 따라 standalone 기능이 제한될 수 있으므로, 이를 감지하여 알림 권한 UI 자체를 숨기는 폴백이 필요하다.
> - VAPID 키는 서버/클라이언트 동일하게 관리(P-256 ECDSA). 키 교체 시 모든 구독을 무효화한다.
>
> **모바일 PWA Push 활성화 사전 체크**
> ```ts
> function canRequestPushOnMobilePwa(): { eligible: boolean; reason?: string } {
>   const ua = navigator.userAgent;
>   const requiresStandalone = /Mobile|Tablet/.test(ua);
>   if (!requiresStandalone) return { eligible: true };
>
>   // 홈 화면 설치 확인 (standalone)
>   const isStandalone =
>     window.matchMedia('(display-mode: standalone)').matches ||
>     // 일부 모바일 브라우저의 비표준 standalone 속성
>     // eslint-disable-next-line @typescript-eslint/no-explicit-any
>     ((window.navigator as any).standalone === true);
>   if (!isStandalone) return { eligible: false, reason: 'home-screen-required' };
>
>   if (!('Notification' in window) || !('PushManager' in window)) {
>     return { eligible: false, reason: 'unsupported' };
>   }
>   return { eligible: true };
> }
> ```

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

## 8.5 File System Access / OPFS / Storage Buckets API (2026)

2026년 PWA의 오프라인 저장 옵션은 IndexedDB만이 아니다. 대용량/구조적 데이터를 더 빠르고 안전하게 저장할 수 있는 API들이 Baseline에 합류했다.

| API | 지원 (2026.05) | 용도 | 영속성 |
|---|---|---|---|
| **IndexedDB** | 모든 브라우저 | 구조적 JSON/Blob | 쿼터 내 영속 |
| **Cache Storage** | 모든 브라우저 | Request/Response 캐싱 | 쿼터 내 영속 |
| **Origin Private File System (OPFS)** | 주요 엔진 전반 지원 | 대용량 파일 IO (수GB), 동기 read/write 핸들 | 영속 (`navigator.storage.persist`) |
| **File System Access API (user-visible)** | 엔진별 지원 편차 큼 | 사용자가 선택한 폴더에 R/W | 권한 부여 시 영속 |
| **Storage Buckets API** | 일부 엔진 안정, 일부 진행 중 | 도메인 데이터를 여러 버킷으로 분리, 버킷 단위 영속/만료 | 버킷별 정책 |
| **Web Locks API** | 모든 브라우저 | 탭/SW 간 동시성 제어 | - |

### 8.5.1 OPFS로 대용량 오프라인 파일 저장

```typescript
// src/services/opfs-storage.ts
// OPFS는 사용자에게 보이지 않는 origin 전용 파일 시스템 -- 가장 빠른 IO 성능

export async function writeBlobToOpfs(path: string, blob: Blob): Promise<void> {
  const root = await navigator.storage.getDirectory();
  // 경로 분할 -- 'video/2026/clip.mp4' 같은 중첩 경로 지원
  const segments = path.split('/').filter(Boolean);
  const fileName = segments.pop()!;

  let dir = root;
  for (const segment of segments) {
    dir = await dir.getDirectoryHandle(segment, { create: true });
  }

  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  // 워커에서는 createSyncAccessHandle()로 동기 IO 가능 (성능 우수)
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function readBlobFromOpfs(path: string): Promise<Blob | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const segments = path.split('/').filter(Boolean);
    const fileName = segments.pop()!;
    let dir = root;
    for (const segment of segments) {
      dir = await dir.getDirectoryHandle(segment);
    }
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null;
  }
}
```

### 8.5.2 Storage Buckets로 오프라인 데이터 격리

```typescript
// src/services/storage-buckets.ts
// 사용자 워크스페이스/프로젝트마다 버킷을 분리해 만료 정책을 다르게 적용
// 2026년 기준 엔진별 지원 편차가 있으므로 progressive enhancement로 처리

interface StorageBucketOptions {
  durability?: 'strict' | 'relaxed';
  persisted?: boolean;
  quota?: number;
  expires?: number; // epoch ms
}

interface BrowserStorageManager extends StorageManager {
  getBucket?: (name: string) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openOrCreate?: (name: string, options?: StorageBucketOptions) => Promise<any>;
}

export async function getProjectBucket(projectId: string) {
  const manager = navigator.storage as BrowserStorageManager;
  if (!manager.openOrCreate) {
    // 미지원 브라우저 -- 글로벌 IndexedDB로 폴백
    return null;
  }
  // 30일 만료, 쿼터 200MB
  return manager.openOrCreate(`project-${projectId}`, {
    durability: 'strict',
    persisted: true,
    expires: Date.now() + 30 * 86_400_000,
  });
}
```

### 8.5.3 영속성 확보 (Storage Persistence)

```ts
// 사용자에게 보이지 않게 영속성 요청 (브라우저는 사용자 참여도/북마크 등으로 자동 부여하기도 함)
async function ensurePersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persist();
  }
  return false;
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

---

## 10. Serwist (Next.js PWA 대안)

Next.js 프로젝트에서는 `next-pwa`가 유지보수 중단 상태이므로, 포크인 **Serwist**를 사용한다. Serwist는 Workbox 위에 Next.js App Router / Server Actions 호환 레이어를 제공한다.

### 10.1 설치 및 기본 설정

```bash
# Serwist 설치
pnpm add @serwist/next
pnpm add -D serwist
```

```typescript
// next.config.ts
import withSerwist from '@serwist/next';

const nextConfig = {
  // ... 기존 Next.js 설정
};

export default withSerwist({
  swSrc: 'src/sw.ts',        // Service Worker 소스 경로
  swDest: 'public/sw.js',    // 빌드 결과물 경로
  cacheOnNavigation: true,   // 네비게이션 요청 캐싱 활성화
  reloadOnOnline: true,      // 온라인 복귀 시 자동 새로고침
  disable: process.env.NODE_ENV === 'development', // 개발 환경 비활성화
})(nextConfig);
```

### 10.2 Serwist Service Worker 작성

```typescript
// src/sw.ts - Serwist 기반 Service Worker
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // Serwist가 빌드 시점에 프리캐시 매니페스트를 주입
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,  // 오래된 캐시 자동 정리
    concurrency: 10,              // 프리캐시 병렬 다운로드 수
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // 기본 런타임 캐시 규칙 (Next.js 정적/동적 자원)
  runtimeCaching: defaultCache,
  // 오프라인 폴백 설정
  fallbacks: {
    entries: [
      {
        url: '/offline',            // App Router 오프라인 페이지
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
```

### 10.3 Serwist vs Workbox 직접 사용 비교

| 항목 | Serwist (Next.js) | Workbox + vite-plugin-pwa |
|------|-------------------|--------------------------|
| **프레임워크** | Next.js 전용 | Vite / 프레임워크 무관 |
| **App Router 호환** | 네이티브 지원 | 수동 설정 필요 |
| **프리캐시 매니페스트** | `self.__SW_MANIFEST` 자동 주입 | `self.__WB_MANIFEST` 자동 주입 |
| **런타임 캐시 기본값** | `defaultCache` 제공 | 직접 설정 필수 |
| **오프라인 폴백** | `fallbacks` 옵션 내장 | `setCatchHandler` 수동 설정 |
| **업데이트 감지** | `@serwist/next` 자동 | `virtual:pwa-register` 사용 |
| **번들 크기** | Workbox 하위 호환 (동일) | 동일 |

---

## 11. PWA 디버깅 & 트러블슈팅

### 11.1 Chrome DevTools 활용

```typescript
// 개발 시 Service Worker 상태를 콘솔에서 확인하는 유틸리티
// src/utils/sw-debug.ts

export async function debugServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW Debug] Service Worker 미지원 브라우저');
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  console.group('[SW Debug] Service Worker 상태');

  for (const reg of registrations) {
    console.log('스코프:', reg.scope);
    console.log('활성 SW:', reg.active?.state ?? '없음');
    console.log('대기 SW:', reg.waiting?.state ?? '없음');
    console.log('설치 중 SW:', reg.installing?.state ?? '없음');
  }

  // 캐시 스토리지 현황
  const cacheNames = await caches.keys();
  console.log('캐시 목록:', cacheNames);

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    console.log(`  ${name}: ${keys.length}개 항목`);
  }

  // 스토리지 사용량 확인
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usedMB = ((estimate.usage ?? 0) / (1024 * 1024)).toFixed(2);
    const quotaMB = ((estimate.quota ?? 0) / (1024 * 1024)).toFixed(2);
    console.log(`스토리지: ${usedMB}MB / ${quotaMB}MB 사용`);
  }

  console.groupEnd();
}

// 캐시 강제 초기화 (트러블슈팅용)
export async function purgeAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));

  console.info('[SW Debug] 모든 캐시 및 SW 등록 해제 완료. 새로고침하세요.');
}
```

### 11.2 자주 발생하는 문제와 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| SW 업데이트가 반영되지 않음 | `skipWaiting` 미호출, 탭이 열린 상태 | `skipWaiting()` + `clients.claim()` 확인, 또는 사용자에게 새로고침 유도 |
| 캐시가 계속 커짐 | `ExpirationPlugin` 미설정 | `maxEntries`, `maxAgeSeconds` 반드시 설정 |
| CORS 리소스 캐시 실패 | `CacheableResponsePlugin`에 `statuses: [0]` 누락 | opaque 응답(status 0) 허용 추가 |
| 오프라인 폴백이 작동하지 않음 | `/offline.html`이 프리캐시에 미포함 | `includeAssets`에 `offline.html` 추가 |
| 일부 모바일 브라우저에서 PWA 동작 이상 | 모바일 OS/브라우저의 Service Worker 수명 제한 | 중요 데이터는 IndexedDB에 저장, SW 재활성화 대비 |
| `navigator.serviceWorker`가 `undefined` | HTTP 환경 또는 iframe 내부 | HTTPS 확인, `localhost` 예외 활용, `isSecureContext` 체크 |

### 11.3 Playwright를 활용한 PWA E2E 테스트

```typescript
// tests/pwa.spec.ts
import { test, expect } from '@playwright/test';

test.describe('PWA 오프라인 기능', () => {
  test('오프라인 폴백 페이지가 정상적으로 표시된다', async ({ page, context }) => {
    // 먼저 온라인 상태에서 페이지 방문하여 SW 등록 & 캐시
    await page.goto('/');
    await page.waitForFunction(() =>
      navigator.serviceWorker.ready.then(() => true),
    );

    // 오프라인 전환
    await context.setOffline(true);

    // 캐시되지 않은 페이지로 이동 시 오프라인 폴백 노출
    await page.goto('/non-cached-page');
    await expect(page.locator('text=오프라인')).toBeVisible();

    // 온라인 복귀
    await context.setOffline(false);
  });

  test('Service Worker가 정상 등록된다', async ({ page }) => {
    await page.goto('/');

    const swRegistered = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });

    expect(swRegistered).toBe(true);
  });

  test('캐시된 정적 리소스가 오프라인에서 로드된다', async ({ page, context }) => {
    // 온라인에서 페이지 로드 (캐시 워밍)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 오프라인 전환 후 같은 페이지 새로고침
    await context.setOffline(true);
    await page.reload();

    // 앱 셸이 정상 렌더링되는지 확인
    await expect(page.locator('#root')).toBeVisible();
  });

  test('오프라인에서 작성한 데이터가 온라인 복귀 시 동기화된다', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(() =>
      navigator.serviceWorker.ready.then(() => true),
    );

    // 오프라인 전환
    await context.setOffline(true);

    // 오프라인 상태에서 데이터 작성 (IndexedDB 큐에 저장됨)
    await page.fill('[data-testid="input-field"]', '오프라인 테스트 데이터');
    await page.click('[data-testid="submit-button"]');

    // 온라인 복귀
    await context.setOffline(false);

    // 동기화 완료 대기
    await page.waitForSelector('[data-testid="sync-complete"]', {
      timeout: 10000,
    });
  });
});
```

---

## 12. 체크리스트

### 12.1 Service Worker 기본

- [ ] Service Worker가 HTTPS(또는 localhost)에서 등록된다
- [ ] `skipWaiting()` + `clientsClaim()`으로 즉시 활성화 설정
- [ ] `cleanupOutdatedCaches()`로 이전 버전 캐시 자동 정리
- [ ] SW 파일에 `self.__WB_MANIFEST` (또는 `self.__SW_MANIFEST`) 프리캐시 매니페스트 포함
- [ ] Navigation Preload 활성화 (`self.registration.navigationPreload.enable()`)
- [ ] SW 업데이트 감지 및 사용자 알림 UI 구현
- [ ] 에러 핸들링: 모든 fetch 핸들러에 try-catch + 폴백 응답

### 12.2 캐싱 전략

- [ ] 페이지 유형별 캐싱 전략 매핑 완료 (Cache First / Network First / SWR / Network Only)
- [ ] 모든 런타임 캐시에 `ExpirationPlugin` 설정 (`maxEntries`, `maxAgeSeconds`)
- [ ] `CacheableResponsePlugin`으로 유효한 응답만 캐시 (`statuses: [0, 200]`)
- [ ] 캐시 이름에 버전 프리픽스 포함 (`v${VERSION}-cache-name`)
- [ ] API 응답 캐시의 TTL이 비즈니스 요구사항에 맞게 설정됨
- [ ] CDN 리소스에 Stale While Revalidate 적용
- [ ] 인증/결제 경로는 Network Only 처리

### 12.3 오프라인 UX

- [ ] 오프라인 폴백 페이지(`/offline.html` 또는 `/offline`)가 프리캐시에 포함
- [ ] 네트워크 상태 감지 훅(`useNetworkStatus`) 구현 및 UI 배너 표시
- [ ] 오프라인에서 작성한 데이터가 IndexedDB 큐에 저장됨
- [ ] 온라인 복귀 시 자동 동기화 + 진행률 표시
- [ ] 오프라인 사용 가능/불가능 기능을 UI에서 시각적으로 구분
- [ ] 충돌 발생 시 3-way merge UI 또는 서버 우선 전략 적용
- [ ] `Connection` 타입에 따른 적응형 로딩 (Slow 3G 시 이미지 축소 등)

### 12.4 Web Push Notification

- [ ] VAPID 키 생성 및 `.env`에 안전하게 보관
- [ ] 클라이언트 구독(subscribe) / 해제(unsubscribe) 플로우 구현
- [ ] SW `push` 이벤트에서 알림 표시 (제목, 본문, 아이콘, 배지)
- [ ] `notificationclick`에서 해당 URL로 포커스 또는 새 창 열기
- [ ] 태그(`tag`) 기반 중복 알림 방지
- [ ] 환경별 Push 토픽 분리 (프로덕션 알림이 테스트 사용자에게 전달되지 않도록)
- [ ] 모바일 브라우저 호환성: 홈 화면 설치(`standalone`) 상태에서만 권한 요청이 가능한 경우를 감지
- [ ] 권한 요청이 사용자 제스처 직후에만 발생하도록 가드 구현
- [ ] EU 지역 사용자(DMA 적용)에 대한 Push 미지원 폴백 UI 제공
- [ ] VAPID 키 교체(rotation) 절차 문서화 -- 교체 시 구독 무효화

### 12.5 Background Sync

- [ ] `sync` 이벤트 핸들러에서 오프라인 큐 처리
- [ ] 지수 백오프(exponential backoff) 재시도 로직 구현
- [ ] 최대 재시도 횟수 초과 시 에러 큐로 분리
- [ ] 동기화 결과를 `postMessage`로 클라이언트에 알림
- [ ] Periodic Background Sync 등록 시 브라우저 지원 여부 확인

### 12.6 2026 신규 저장 API (Storage)

- [ ] 대용량 파일 저장에 OPFS(`navigator.storage.getDirectory()`) 활용 검토
- [ ] 사용자 폴더 R/W 필요 시 File System Access API + Persistent Permissions(Chrome 122+)
- [ ] 워크스페이스/프로젝트별로 Storage Buckets API로 데이터 격리(Chromium 지원)
- [ ] `navigator.storage.persist()`로 영속성 확보, 미지원 환경 폴백 처리
- [ ] Web Locks API로 SW ↔ 탭 간 동시 쓰기 충돌 방지

### 12.7 App Manifest

- [ ] `manifest.json`에 `name`, `short_name`, `start_url`, `display`, `theme_color` 포함
- [ ] 아이콘: 192x192 + 512x512 필수, maskable 아이콘 별도 포함
- [ ] `display_override`로 Window Controls Overlay 지원 (선택)
- [ ] `screenshots` 포함 (wide + narrow 각 최소 1장)
- [ ] `shortcuts` 3개 이상 등록 (빈번한 사용자 액션)
- [ ] `share_target` 설정으로 Web Share Target 지원 (선택)
- [ ] `<meta name="theme-color">` 태그가 HTML `<head>`에 존재

### 12.8 멀티 환경 & 배포

- [ ] 환경별(Production/Staging/Canary/Preview) Service Worker 캐시 전략 분리
- [ ] Preview 환경에서 `beforeinstallprompt` 차단
- [ ] 환경별 매니페스트 동적 생성 (앱 이름에 환경 태그 포함)
- [ ] SW 버전 충돌 감지 및 자동 해결 (캐시 전체 삭제 + 재등록)
- [ ] Feature Flag로 오프라인 기능 점진적 롤아웃
- [ ] Lighthouse CI에서 PWA 점수 90+ 유지 ([08. 성능 최적화 가이드](./08_성능_최적화_가이드.md) 참조)
- [ ] [12. CDN 캐시 전략](./12_CDN_캐시_전략.md)과 SW 캐시 간 TTL 정합성 확인

### 12.9 테스트

- [ ] Playwright로 오프라인 폴백 E2E 테스트 작성
- [ ] SW 등록/갱신 테스트 자동화
- [ ] 네트워크 에뮬레이션(오프라인, Slow 3G, Fast 3G) 시나리오 포함
- [ ] Background Sync 큐잉/전송 검증 테스트
- [ ] 캐시 스토리지 용량 초과 시 LRU 제거 검증
- [ ] CI 파이프라인(CI)에 PWA 테스트 통합 ([11. CI/CD 파이프라인 표준](./11_CICD_파이프라인_표준.md) 참조)

---

> **다음 단계**: PWA 캐싱 전략은 CDN 캐싱과 밀접하게 연관됩니다. [12. CDN 캐시 전략](./12_CDN_캐시_전략.md)에서 CDN 레벨의 캐시 무효화 및 TTL 설정을 함께 확인하세요. 성능 지표 모니터링은 [08. 성능 최적화 가이드](./08_성능_최적화_가이드.md)를 참조하세요.

문서 최종 업데이트: 2026-05-27
