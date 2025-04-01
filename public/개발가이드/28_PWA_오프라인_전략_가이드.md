# PWA & 오프라인 전략 가이드 2026 - AI-First Edition

## 목차

1. [AI 기반 PWA 개발 자동화](#1-ai-기반-pwa-개발-자동화)
   - [1.1 Claude Code Service Worker 생성 프롬프트](#11-claude-code-service-worker-생성-프롬프트)
   - [1.2 AI 캐싱 전략 자동 설계](#12-ai-캐싱-전략-자동-설계)
   - [1.3 AI 기반 오프라인 UX 패턴 제안](#13-ai-기반-오프라인-ux-패턴-제안)
   - [1.4 AI 매니페스트 & 설치 최적화](#14-ai-매니페스트--설치-최적화)
   - [1.5 AI 오프라인 테스트 시나리오 생성](#15-ai-오프라인-테스트-시나리오-생성)
2. [Service Worker 라이프사이클](#2-service-worker-라이프사이클)
3. [Workbox 6 설정 (Vite PWA 플러그인)](#3-workbox-6-설정-vite-pwa-플러그인)
4. [캐싱 전략](#4-캐싱-전략)
5. [오프라인 UX 패턴](#5-오프라인-ux-패턴)
6. [Web Push Notifications](#6-web-push-notifications)
7. [App Manifest & 설치 프롬프트](#7-app-manifest--설치-프롬프트)
8. [Background Sync & Periodic Sync](#8-background-sync--periodic-sync)

---

## 1. AI 기반 PWA 개발 자동화

AI를 PWA 개발의 보조가 아닌 **설계 및 구현 엔진**으로 활용한다. Service Worker 코드 생성, 캐싱 전략 설계, 오프라인 UX 패턴 제안까지 전 과정을 AI가 수행하고 사람은 비즈니스 요구사항 정의와 최종 검증만 담당한다.

### 1.1 Claude Code Service Worker 생성 프롬프트

#### 프롬프트 1: Workbox 기반 Service Worker 생성

```
이 Vite + React 프로젝트에 Workbox 기반 Service Worker를 설정해줘.

요구사항:
- vite-plugin-pwa 설정 (injectManifest 모드)
- 캐싱 전략:
  (1) 앱 셸 (HTML, JS, CSS): Cache First, 빌드마다 갱신
  (2) API 응답 (/api/*): Network First, 5분 TTL
  (3) 이미지 (/images/*): Cache First, 30일 TTL, 최대 100개
  (4) 폰트: Cache First, 1년 TTL
  (5) CDN 리소스: Stale While Revalidate
- 오프라인 폴백 페이지 (/offline.html) 등록
- 네비게이션 프리로드 활성화
- skipWaiting + clientsClaim으로 즉시 활성화
- 캐시 용량 제한 (expiration 플러그인)
- TypeScript 타입 안전
```

#### 프롬프트 2: 오프라인 데이터 동기화 Service Worker

```
IndexedDB + Background Sync를 사용한 오프라인 데이터 동기화 Service Worker를 작성해줘.

요구사항:
- 오프라인 상태에서 사용자 액션을 IndexedDB 큐에 저장
- 온라인 복귀 시 Background Sync로 자동 전송
- 동기화 큐 구조:
  (1) id: 고유 식별자 (UUID)
  (2) url: 대상 API 엔드포인트
  (3) method: HTTP 메서드
  (4) body: 요청 본문
  (5) timestamp: 생성 시각
  (6) retryCount: 재시도 횟수 (최대 3회)
- 충돌 해결: Last Write Wins + 타임스탬프 비교
- 동기화 진행률을 클라이언트에 postMessage로 알림
- 실패한 요청의 재시도 로직 (지수 백오프)
- idb 라이브러리로 IndexedDB 타입 안전 래핑
```

#### 프롬프트 3: Push Notification Service Worker

```
Web Push Notification을 처리하는 Service Worker 코드를 작성해줘.

요구사항:
- VAPID 키 기반 구독 관리
- push 이벤트 핸들링:
  (1) 알림 제목, 본문, 아이콘, 배지 표시
  (2) 액션 버튼 2개 (확인, 무시)
  (3) 알림 클릭 시 해당 페이지로 포커스/이동
  (4) 알림 태그로 중복 방지
- notificationclick 이벤트에서 clients.openWindow 처리
- 구독 갱신 (pushsubscriptionchange) 처리
- 권한 요청 UX: 사용자 액션 이후 자연스럽게 요청
- 알림 설정 페이지 (카테고리별 on/off)
- TypeScript 타입으로 페이로드 구조 정의
```

### 1.2 AI 캐싱 전략 자동 설계

AI가 프로젝트의 API 엔드포인트와 리소스를 분석하여 최적 캐싱 전략을 자동 설계한다.

```typescript
// AI 프롬프트: "이 프로젝트의 네트워크 요청을 분석하고 최적 캐싱 전략을 설계해줘"

// AI가 분석하는 요소:
// 1. API 엔드포인트 목록 및 갱신 빈도
// 2. 정적 리소스 크기 및 변경 빈도
// 3. 사용자 행동 패턴 (페이지 재방문 빈도)
// 4. 데이터 신선도 요구사항

interface CachingStrategy {
  route: string;
  strategy: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly';
  maxAge: number; // 초 단위
  maxEntries?: number;
  rationale: string; // AI가 설명하는 선택 근거
}

// AI가 생성한 캐싱 전략 예시
const aiGeneratedStrategies: CachingStrategy[] = [
  {
    route: '/api/products',
    strategy: 'StaleWhileRevalidate',
    maxAge: 300, // 5분
    maxEntries: 50,
    rationale: '상품 목록은 자주 조회되지만 실시간성이 덜 중요. 캐시 우선 제공 후 백그라운드 갱신.',
  },
  {
    route: '/api/cart',
    strategy: 'NetworkFirst',
    maxAge: 60,
    rationale: '장바구니는 실시간 정확성이 중요. 네트워크 우선, 오프라인 시 캐시 폴백.',
  },
  {
    route: '/api/user/profile',
    strategy: 'CacheFirst',
    maxAge: 3600, // 1시간
    rationale: '프로필 정보는 거의 변경되지 않음. 캐시 우선으로 로딩 속도 최적화.',
  },
  {
    route: '/api/payments',
    strategy: 'NetworkOnly',
    maxAge: 0,
    rationale: '결제 관련 요청은 캐싱하면 안 됨. 항상 최신 데이터 필요.',
  },
  {
    route: '/static/images/*',
    strategy: 'CacheFirst',
    maxAge: 2592000, // 30일
    maxEntries: 100,
    rationale: '정적 이미지는 변경 빈도가 극히 낮음. 장기 캐싱으로 대역폭 절약.',
  },
];

// AI 캐싱 전략을 Workbox 설정으로 변환
function convertToWorkboxConfig(strategies: CachingStrategy[]): string {
  return strategies
    .map((s) => {
      const plugins = [];

      if (s.maxAge > 0) {
        plugins.push(`new ExpirationPlugin({ maxAgeSeconds: ${s.maxAge}${s.maxEntries ? `, maxEntries: ${s.maxEntries}` : ''} })`);
      }

      return `
registerRoute(
  new RegExp('${s.route}'),
  new ${s.strategy}({
    cacheName: '${s.route.replace(/[^a-zA-Z]/g, '-').replace(/^-+|-+$/g, '')}',
    plugins: [${plugins.join(', ')}],
  })
);`;
    })
    .join('\n');
}
```

### 1.3 AI 기반 오프라인 UX 패턴 제안

```typescript
// AI 프롬프트: "이 앱의 기능별로 오프라인 UX 전략을 제안해줘"

interface OfflineUXPattern {
  feature: string;
  pattern: 'read-only-cache' | 'optimistic-update' | 'queue-and-sync' | 'graceful-degrade' | 'block-with-message';
  userFeedback: string;
  implementation: string;
}

// AI가 기능별로 생성한 오프라인 UX 전략
const offlinePatterns: OfflineUXPattern[] = [
  {
    feature: '상품 목록 조회',
    pattern: 'read-only-cache',
    userFeedback: '마지막 동기화 시간 표시 + "오프라인 모드" 배너',
    implementation: '캐시된 상품 목록 표시. 가격/재고는 "확인 필요" 표시.',
  },
  {
    feature: '장바구니 추가',
    pattern: 'optimistic-update',
    userFeedback: '즉시 UI 반영 + "온라인 시 동기화됩니다" 토스트',
    implementation: 'IndexedDB에 저장, UI 즉시 반영, 온라인 복귀 시 서버 동기화.',
  },
  {
    feature: '주문 생성',
    pattern: 'queue-and-sync',
    userFeedback: '"주문이 대기 중입니다. 인터넷 연결 시 자동 처리됩니다." 상태 표시',
    implementation: 'Background Sync 큐에 등록, 온라인 복귀 시 자동 전송.',
  },
  {
    feature: '결제 처리',
    pattern: 'block-with-message',
    userFeedback: '"결제는 인터넷 연결이 필요합니다" 모달 + 오프라인 저장 제안',
    implementation: '결제 버튼 비활성화, 네트워크 상태 모니터링으로 자동 활성화.',
  },
  {
    feature: '검색',
    pattern: 'graceful-degrade',
    userFeedback: '"오프라인 검색: 캐시된 항목만 검색됩니다"',
    implementation: '캐시된 데이터에서 클라이언트 사이드 검색 수행.',
  },
];

// 오프라인 상태 감지 훅
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // 온라인 복귀 시 동기화 트리거
        triggerSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

async function triggerSync(): Promise<void> {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-pending-actions');
  }
}
```

### 1.4 AI 매니페스트 & 설치 최적화

```typescript
// AI 프롬프트: "이 웹앱의 manifest.json을 최적화하고 설치 프롬프트 UX를 설계해줘"

// AI가 분석하여 최적화한 매니페스트
const optimizedManifest = {
  name: 'My App - 생산성 도구',
  short_name: 'MyApp',
  description: '업무 효율을 높이는 올인원 도구',
  start_url: '/?source=pwa',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#3b82f6',
  orientation: 'any',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  screenshots: [
    { src: '/screenshots/desktop.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
    { src: '/screenshots/mobile.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
  ],
  shortcuts: [
    { name: '새 작업 만들기', url: '/tasks/new', icons: [{ src: '/icons/new-task.png', sizes: '96x96' }] },
    { name: '대시보드', url: '/dashboard', icons: [{ src: '/icons/dashboard.png', sizes: '96x96' }] },
  ],
  categories: ['productivity', 'utilities'],
  prefer_related_applications: false,
};
```

### 1.5 AI 오프라인 테스트 시나리오 생성

```typescript
// AI 프롬프트: "이 PWA의 오프라인 시나리오 테스트 케이스를 생성해줘"

// AI가 생성한 오프라인 테스트 시나리오
const offlineTestScenarios = [
  {
    name: '초기 로딩 후 오프라인 전환',
    steps: [
      '앱 최초 로딩 (온라인)',
      '네트워크 차단 (DevTools → Offline)',
      '페이지 새로고침',
      '앱 셸이 캐시에서 로딩되는지 확인',
      'API 데이터가 캐시에서 표시되는지 확인',
      '오프라인 배너가 표시되는지 확인',
    ],
  },
  {
    name: '오프라인 폼 제출',
    steps: [
      '온라인에서 폼 페이지 접속',
      '네트워크 차단',
      '폼 작성 후 제출',
      '대기 큐 UI가 표시되는지 확인',
      '네트워크 복원',
      'Background Sync로 자동 전송되는지 확인',
      '성공 알림이 표시되는지 확인',
    ],
  },
  {
    name: 'Lie-Fi (극도로 느린 네트워크)',
    steps: [
      'DevTools → Slow 3G 설정',
      'API 요청 시 타임아웃 처리 확인',
      '캐시 폴백이 적절히 동작하는지 확인',
      '로딩 스피너가 타임아웃 후 오프라인 UI로 전환되는지 확인',
    ],
  },
];
```

---

## 2. Service Worker 라이프사이클

```typescript
// Service Worker 라이프사이클 이해
// install → waiting → activate → fetch 이벤트 처리

// src/sw.ts (Service Worker 파일)
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'app-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
];

// 1. Install: 필수 리소스 프리캐싱
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 프리캐싱 시작');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // 대기 중인 SW 즉시 활성화
  self.skipWaiting();
});

// 2. Activate: 이전 캐시 정리
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] 이전 캐시 삭제: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
  // 모든 클라이언트 즉시 제어
  self.clients.claim();
});

// 3. Fetch: 요청 가로채기
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;

  // 네비게이션 요청 → 오프라인 폴백
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline.html') as Promise<Response>;
      })
    );
    return;
  }

  // 정적 리소스 → Cache First
  if (request.destination === 'image' || request.destination === 'font' || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }
});

// 4. 업데이트 감지 및 클라이언트 알림
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 클라이언트 측: SW 업데이트 감지
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js').then((registration) => {
    // 업데이트 감지
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 새 버전 사용 가능 → 사용자에게 알림
          showUpdateAvailableUI(() => {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          });
        }
      });
    });
  });

  // 컨트롤러 변경 시 페이지 새로고침
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

function showUpdateAvailableUI(onUpdate: () => void): void {
  // 업데이트 알림 UI 표시
  const confirmed = window.confirm('새 버전이 있습니다. 업데이트하시겠습니까?');
  if (confirmed) {
    onUpdate();
  }
}
```

---

## 3. Workbox 6 설정 (Vite PWA 플러그인)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest 모드: 커스텀 SW 사용
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      // 자동 업데이트
      registerType: 'prompt', // 'autoUpdate' | 'prompt'

      // 매니페스트 설정
      manifest: {
        name: 'My App',
        short_name: 'MyApp',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // 개발 환경에서도 SW 활성화
      devOptions: {
        enabled: true,
        type: 'module',
      },

      // injectManifest 옵션
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
});

// src/sw.ts (Workbox 기반 커스텀 Service Worker)
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// 프리캐시 (Vite PWA가 자동 주입)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 네비게이션 → 오프라인 폴백
const navigationHandler = new NetworkFirst({
  cacheName: 'pages',
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
  ],
});

registerRoute(new NavigationRoute(navigationHandler, {
  // SPA: 모든 네비게이션을 index.html로
}));

// API 응답: Network First (5분 TTL)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 300, // 5분
        maxEntries: 100,
      }),
    ],
  })
);

// 이미지: Cache First (30일)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
        maxEntries: 100,
      }),
    ],
  })
);

// 폰트: Cache First (1년)
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1년
      }),
    ],
  })
);

// CDN 리소스: Stale While Revalidate
registerRoute(
  ({ url }) => url.origin !== self.location.origin,
  new StaleWhileRevalidate({
    cacheName: 'cdn-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7일
        maxEntries: 50,
      }),
    ],
  })
);
```

---

## 4. 캐싱 전략

```typescript
// 4가지 핵심 캐싱 전략 비교 및 구현

// ┌─────────────────────┬──────────────────┬──────────────────┬─────────────────┐
// │ 전략                │ 응답 속도        │ 데이터 신선도     │ 적합 대상       │
// ├─────────────────────┼──────────────────┼──────────────────┼─────────────────┤
// │ Cache First         │ 빠름 (캐시)      │ 캐시 만료까지 유지│ 정적 리소스     │
// │ Network First       │ 느림 (네트워크)  │ 항상 최신        │ API, 동적 데이터│
// │ Stale While Revali- │ 빠름 (캐시)      │ 다음 요청 시 갱신│ 준정적 콘텐츠   │
// │ date                │                  │                  │                 │
// │ Network Only        │ 느림 (네트워크)  │ 항상 최신        │ 인증, 결제      │
// └─────────────────────┴──────────────────┴──────────────────┴─────────────────┘

// 1. Cache First: 캐시 우선, 없으면 네트워크
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const networkResponse = await fetch(request);
  // 유효한 응답만 캐싱
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// 2. Network First: 네트워크 우선, 실패 시 캐시 폴백
async function networkFirst(
  request: Request,
  cacheName: string,
  timeoutMs = 5000
): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const networkResponse = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw new Error('네트워크 및 캐시 모두 실패');
  }
}

// 3. Stale While Revalidate: 캐시 즉시 반환 + 백그라운드 갱신
async function staleWhileRevalidate(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // 백그라운드에서 네트워크 요청 (캐시 갱신)
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => undefined);

  // 캐시가 있으면 즉시 반환, 없으면 네트워크 대기
  if (cached) {
    return cached;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  throw new Error('응답을 가져올 수 없습니다');
}

// 4. 런타임 캐싱 전략 선택기
type StrategyType = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only';

function selectStrategy(request: Request): StrategyType {
  const url = new URL(request.url);

  // 인증/결제 API → 캐싱 금지
  if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/payments')) {
    return 'network-only';
  }

  // 일반 API → 네트워크 우선
  if (url.pathname.startsWith('/api/')) {
    return 'network-first';
  }

  // 정적 리소스 → 캐시 우선
  if (/\.(js|css|png|jpg|gif|svg|woff2?)$/.test(url.pathname)) {
    return 'cache-first';
  }

  // 기타 → Stale While Revalidate
  return 'stale-while-revalidate';
}
```

---

## 5. 오프라인 UX 패턴

### 5.1 오프라인 큐잉 시스템

```typescript
// IndexedDB 기반 오프라인 액션 큐
import { openDB, type IDBPDatabase } from 'idb';

interface PendingAction {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: string;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

class OfflineQueue {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB('offline-queue', 1, {
      upgrade(db) {
        const store = db.createObjectStore('actions', { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('timestamp', 'timestamp');
      },
    });
  }

  async enqueue(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const db = await this.dbPromise;
    const id = crypto.randomUUID();
    const pendingAction: PendingAction = {
      ...action,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries ?? 3,
      status: 'pending',
    };
    await db.put('actions', pendingAction);

    // Background Sync 등록
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-pending-actions');
    }

    return id;
  }

  async getPending(): Promise<PendingAction[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('actions', 'status', 'pending');
  }

  async processQueue(): Promise<void> {
    const pending = await this.getPending();

    for (const action of pending) {
      await this.processAction(action);
    }
  }

  private async processAction(action: PendingAction): Promise<void> {
    const db = await this.dbPromise;

    try {
      action.status = 'syncing';
      await db.put('actions', action);

      const response = await fetch(action.url, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
          ...action.headers,
        },
        body: action.body,
      });

      if (response.ok) {
        action.status = 'completed';
        await db.put('actions', action);
      } else if (action.retryCount < action.maxRetries) {
        action.status = 'pending';
        action.retryCount++;
        await db.put('actions', action);
      } else {
        action.status = 'failed';
        await db.put('actions', action);
      }
    } catch {
      if (action.retryCount < action.maxRetries) {
        action.status = 'pending';
        action.retryCount++;
        await db.put('actions', action);
      } else {
        action.status = 'failed';
        await db.put('actions', action);
      }
    }
  }

  async getQueueStatus(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    completed: number;
  }> {
    const db = await this.dbPromise;
    const all = await db.getAll('actions');

    return {
      pending: all.filter((a) => a.status === 'pending').length,
      syncing: all.filter((a) => a.status === 'syncing').length,
      failed: all.filter((a) => a.status === 'failed').length,
      completed: all.filter((a) => a.status === 'completed').length,
    };
  }
}

// React 훅으로 래핑
const offlineQueue = new OfflineQueue();

function useOfflineQueue() {
  const { isOnline } = useNetworkStatus();

  const enqueue = useCallback(
    async (url: string, method: PendingAction['method'], body?: unknown) => {
      if (isOnline) {
        // 온라인이면 직접 요청
        return fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
      }

      // 오프라인이면 큐에 추가
      const id = await offlineQueue.enqueue({
        url,
        method,
        body: body ? JSON.stringify(body) : undefined,
        maxRetries: 3,
      });

      return { queued: true, id };
    },
    [isOnline]
  );

  return { enqueue, isOnline };
}

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return { isOnline };
}
```

### 5.2 충돌 해결

```typescript
// 오프라인 동기화 시 충돌 해결 전략

interface SyncableRecord {
  id: string;
  data: Record<string, unknown>;
  updatedAt: number;
  version: number;
  clientId: string;
}

type ConflictResolution = 'server-wins' | 'client-wins' | 'last-write-wins' | 'manual';

function resolveConflict(
  serverRecord: SyncableRecord,
  clientRecord: SyncableRecord,
  strategy: ConflictResolution
): SyncableRecord {
  switch (strategy) {
    case 'server-wins':
      return serverRecord;

    case 'client-wins':
      return clientRecord;

    case 'last-write-wins':
      return serverRecord.updatedAt > clientRecord.updatedAt
        ? serverRecord
        : clientRecord;

    case 'manual':
      // 사용자에게 선택하도록 UI 표시
      throw new ConflictError(serverRecord, clientRecord);
  }
}

class ConflictError extends Error {
  constructor(
    public serverRecord: SyncableRecord,
    public clientRecord: SyncableRecord
  ) {
    super('동기화 충돌이 발생했습니다.');
    this.name = 'ConflictError';
  }
}

// 필드 수준 3-way 머지 (더 정교한 충돌 해결)
function threeWayMerge(
  base: Record<string, unknown>,      // 원본 (마지막 동기화 시점)
  server: Record<string, unknown>,    // 서버 현재 상태
  client: Record<string, unknown>     // 클라이언트 현재 상태
): { merged: Record<string, unknown>; conflicts: string[] } {
  const merged: Record<string, unknown> = { ...base };
  const conflicts: string[] = [];

  const allKeys = new Set([...Object.keys(server), ...Object.keys(client)]);

  for (const key of allKeys) {
    const baseVal = JSON.stringify(base[key]);
    const serverVal = JSON.stringify(server[key]);
    const clientVal = JSON.stringify(client[key]);

    if (serverVal === clientVal) {
      // 양쪽 동일 → 어느 쪽이든 사용
      merged[key] = server[key];
    } else if (baseVal === serverVal) {
      // 서버 미변경, 클라이언트만 변경 → 클라이언트 값 사용
      merged[key] = client[key];
    } else if (baseVal === clientVal) {
      // 클라이언트 미변경, 서버만 변경 → 서버 값 사용
      merged[key] = server[key];
    } else {
      // 양쪽 모두 변경 → 충돌
      conflicts.push(key);
      merged[key] = server[key]; // 기본적으로 서버 우선
    }
  }

  return { merged, conflicts };
}
```

---

## 6. Web Push Notifications

```typescript
// Web Push Notification 구현

// 클라이언트: 구독 관리
async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push 알림이 지원되지 않는 브라우저입니다.');
    return null;
  }

  // 권한 요청
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('알림 권한이 거부되었습니다.');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  // VAPID 공개 키 (Base64 URL 인코딩)
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey,
  });

  // 서버에 구독 정보 전송
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Service Worker: Push 이벤트 핸들링
// (sw.ts에 추가)
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
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/badge-72.png',
      tag: payload.tag || 'default',
      data: { url: payload.url || '/' },
      actions: payload.actions || [
        { action: 'open', title: '열기' },
        { action: 'dismiss', title: '닫기' },
      ],
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

// 알림 클릭 핸들링
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 이미 열린 탭이 있으면 포커스
      const existingClient = clients.find(
        (client) => new URL(client.url).pathname === targetUrl
      );

      if (existingClient) {
        return existingClient.focus();
      }

      // 없으면 새 탭 열기
      return self.clients.openWindow(targetUrl);
    })
  );
});

// 구독 갱신 처리
self.addEventListener('pushsubscriptionchange', (event: Event) => {
  const pushEvent = event as ExtendableEvent & {
    oldSubscription?: PushSubscription;
    newSubscription?: PushSubscription;
  };

  pushEvent.waitUntil(
    (async () => {
      const newSubscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: pushEvent.oldSubscription?.options.applicationServerKey ?? undefined,
      });

      await fetch('/api/push/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old: pushEvent.oldSubscription,
          new: newSubscription,
        }),
      });
    })()
  );
});

// React 훅: 알림 권한 관리
function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const subscribe = useCallback(async () => {
    const sub = await subscribeToPush();
    setSubscription(sub);
    if (sub) setPermission('granted');
  }, []);

  const unsubscribe = useCallback(async () => {
    if (subscription) {
      await subscription.unsubscribe();
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      setSubscription(null);
    }
  }, [subscription]);

  return { permission, subscription, subscribe, unsubscribe };
}
```

---

## 7. App Manifest & 설치 프롬프트

```typescript
// 설치 프롬프트 UX 최적화

// 커스텀 설치 프롬프트 훅
function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 이미 설치되었는지 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;

    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);
    return result.outcome === 'accepted';
  }, [installPrompt]);

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    install,
  };
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// 설치 배너 컴포넌트
function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,
      }}
    >
      <img src="/icons/icon-48.png" alt="App Icon" width={48} height={48} />
      <div style={{ flex: 1 }}>
        <strong>앱으로 설치하기</strong>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          홈 화면에 추가하여 더 빠르게 접근하세요
        </p>
      </div>
      <button onClick={install}>설치</button>
      <button onClick={() => setDismissed(true)} aria-label="닫기">
        X
      </button>
    </div>
  );
}
```

---

## 8. Background Sync & Periodic Sync

```typescript
// Background Sync: 오프라인 액션을 온라인 복귀 시 자동 전송

// Service Worker에서 sync 이벤트 처리
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }

  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncPendingActions(): Promise<void> {
  const db = await openDB('offline-queue', 1);
  const pending = await db.getAllFromIndex('actions', 'status', 'pending');

  for (const action of pending) {
    try {
      action.status = 'syncing';
      await db.put('actions', action);

      const response = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json', ...action.headers },
        body: action.body,
      });

      if (response.ok) {
        action.status = 'completed';
      } else {
        action.status = action.retryCount < action.maxRetries ? 'pending' : 'failed';
        action.retryCount++;
      }

      await db.put('actions', action);

      // 클라이언트에 진행 상황 알림
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'SYNC_PROGRESS',
          actionId: action.id,
          status: action.status,
        });
      });
    } catch {
      action.status = action.retryCount < action.maxRetries ? 'pending' : 'failed';
      action.retryCount++;
      await db.put('actions', action);
    }
  }
}

async function syncAnalytics(): Promise<void> {
  const db = await openDB('analytics-queue', 1);
  const events = await db.getAll('events');

  if (events.length === 0) return;

  try {
    await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });

    // 전송 성공 시 로컬 큐 비우기
    const tx = db.transaction('events', 'readwrite');
    await tx.store.clear();
    await tx.done;
  } catch {
    // 다음 sync 이벤트에서 재시도
    console.log('[SW] Analytics 동기화 실패, 다음 시도에서 재시도');
  }
}

// Periodic Background Sync: 주기적 백그라운드 작업
// 브라우저가 적절한 시점에 실행 (배터리, 네트워크 상태 고려)

async function registerPeriodicSync(): Promise<void> {
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.log('Periodic Sync가 지원되지 않습니다.');
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  // 권한 확인
  const status = await navigator.permissions.query({
    name: 'periodic-background-sync' as PermissionName,
  });

  if (status.state !== 'granted') {
    console.log('Periodic Sync 권한이 없습니다.');
    return;
  }

  // 최소 간격: 12시간 (브라우저가 실제 실행 시점 결정)
  await registration.periodicSync.register('update-content', {
    minInterval: 12 * 60 * 60 * 1000, // 12시간
  });
}

// Service Worker: periodicsync 이벤트 핸들링
self.addEventListener('periodicsync', (event: PeriodicSyncEvent) => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateCachedContent());
  }
});

async function updateCachedContent(): Promise<void> {
  const cache = await caches.open('api-cache');
  const criticalEndpoints = [
    '/api/products?featured=true',
    '/api/notifications/count',
    '/api/user/preferences',
  ];

  await Promise.allSettled(
    criticalEndpoints.map(async (url) => {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    })
  );
}

// 클라이언트: sync 진행 상황 수신
function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_PROGRESS') {
        setSyncStatus((prev) => ({
          ...prev,
          [event.data.actionId]: event.data.status,
        }));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  return syncStatus;
}

// 타입 확장
interface SyncEvent extends ExtendableEvent {
  tag: string;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

interface ServiceWorkerRegistration {
  periodicSync: {
    register(tag: string, options?: { minInterval: number }): Promise<void>;
    unregister(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  };
  sync: {
    register(tag: string): Promise<void>;
  };
}
```

---

## 체크리스트

- [ ] AI로 Service Worker 코드를 생성하고 캐싱 전략을 자동 설계했는가
- [ ] Service Worker 라이프사이클 (install/activate/fetch)을 올바르게 구현했는가
- [ ] Workbox 6 + Vite PWA 플러그인을 적절히 설정했는가
- [ ] 리소스 유형별 최적 캐싱 전략을 적용했는가
- [ ] 오프라인 큐잉 + Background Sync로 데이터 동기화를 보장했는가
- [ ] 충돌 해결 전략 (Last Write Wins, 3-way merge)을 구현했는가
- [ ] Web Push Notifications을 VAPID 기반으로 설정했는가
- [ ] App Manifest에 아이콘, 스크린샷, 단축키를 모두 설정했는가
- [ ] 커스텀 설치 프롬프트를 적절한 타이밍에 표시하는가
- [ ] Periodic Background Sync로 오프라인 데이터를 사전 갱신하는가
