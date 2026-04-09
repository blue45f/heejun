# 24. SEO 및 메타데이터 가이드 (2025-2026 Edition)

| 분류 | 핵심 기술 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [23. 국제화](./23_국제화_가이드.md), [08. 성능](./08_성능_최적화_가이드.md), [19. 접근성](./19_웹_접근성_가이드.md) | **AI 도구** | Next.js Metadata, @vercel/og |
| **핵심 테마** | 구조화 데이터, 동적 OG 이미지, 사이트맵, Core Web Vitals | **Update** | 2026.04 |

---

> **"SEO는 마케팅이 아니라 엔지니어링이다. 2026년의 SEO는 메타데이터 자동화, 구조화 데이터 타입 안전성, 환경별 격리까지 코드로 보장한다."**
> 본 가이드는 Next.js 15 App Router 기반의 SEO 전략과 멀티 베타 환경에서의 검색 엔진 격리를 다룹니다.

---

## 목차

1. [AI 기반 SEO 워크플로우](#1-ai-기반-seo-워크플로우)
2. [멀티 베타 환경 SEO 격리](#2-멀티-베타-환경-seo-격리)
3. [Next.js 15 SEO 기본 설정](#3-nextjs-15-seo-기본-설정)
4. [구조화 데이터 (JSON-LD)](#4-구조화-데이터-json-ld)
5. [동적 OG 이미지 (@vercel/og)](#5-동적-og-이미지-vercelgo)
6. [사이트맵 및 robots.txt](#6-사이트맵-및-robotstxt)
7. [SSR / SSG / ISR SEO 전략 비교](#7-ssr--ssg--isr-seo-전략-비교)
8. [Core Web Vitals와 SEO](#8-core-web-vitals와-seo)
9. [국제화 SEO (hreflang)](#9-국제화-seo-hreflang)
10. [SEO 모니터링 및 자동화 테스트](#10-seo-모니터링-및-자동화-테스트)
11. [체크리스트](#11-체크리스트)

---

## 1. AI 기반 SEO 워크플로우

> AI를 활용하면 메타 태그 생성, 구조화 데이터 작성, SEO 회귀 테스트를 자동화할 수 있다. 수동 SEO 관리 대비 누락률 90% 감소, 검색 노출 일관성 확보가 목표다.

### 프롬프트 1: SEO 종합 분석

```bash
claude "이 프로젝트의 모든 페이지 컴포넌트를 분석해서 SEO 감사를 해줘.

각 페이지에 대해 검사:
1) title, description 메타 태그 존재 여부 및 길이 적절성
2) OG 태그 완성도 (og:title, og:description, og:image, og:url)
3) 구조화 데이터(JSON-LD) 존재 여부와 Schema.org 적합성
4) heading 태그 계층 구조 (h1이 정확히 1개인지, h1→h2→h3 순서)
5) 이미지 alt 텍스트 누락 여부
6) canonical URL 설정 여부
7) 환경별(Preview/Production) noindex 설정 여부

결과를 심각도별(Critical/Warning/Info)로 분류하고
수정 코드도 함께 제시해줘."
```

### 프롬프트 2: 메타 태그 자동 생성

```bash
claude "이 프로젝트의 각 페이지에 대해 최적의 메타 태그를 생성해줘.

요구사항:
1) Next.js 15 generateMetadata 함수 형식
2) title: 50-60자, 핵심 키워드 포함
3) description: 150-160자, 행동 유도 문구
4) OG 태그: title, description, image, url, type, site_name
5) Twitter Card: summary_large_image 형식
6) 동적 페이지는 params 기반 동적 생성
7) 환경별 분기: Preview에서는 noindex 자동 추가

generateMetadata 코드로 직접 작성해줘."
```

### 프롬프트 3: JSON-LD 자동 생성

```bash
claude "이 프로젝트의 페이지 유형별로 JSON-LD 구조화 데이터를 생성해줘.

페이지 유형별 스키마:
1) 메인 페이지 → Organization + WebSite + SearchAction
2) 블로그 글 → Article + BreadcrumbList
3) 비즈니스 객체(Entity) 페이지 → Entity + Offer + AggregateRating
4) FAQ 페이지 → FAQPage
5) 프로필 페이지 → Person + ProfilePage

모두 Schema.org 유효성 검사 통과하도록 작성하고
Google Rich Results Test 호환 확인해줘."
```

### 프롬프트 4: SEO 회귀 테스트

```bash
claude "이 프로젝트에 SEO 회귀 테스트를 추가해줘.

테스트 항목:
1) 모든 페이지에 title과 description이 존재하는지
2) OG 태그가 빠짐없이 설정되어 있는지
3) JSON-LD가 유효한 JSON이고 Schema.org에 적합한지
4) canonical URL이 올바르게 설정되어 있는지
5) Preview 환경에서 noindex가 설정되는지
6) Production 환경에서 noindex가 없는지
7) h1 태그가 각 페이지에 정확히 1개인지

Playwright 또는 Vitest 기반으로 작성해줘."
```

### 프롬프트 5: 사이트맵 최적화

```bash
claude "이 프로젝트의 사이트맵을 최적화해줘.

요구사항:
1) Next.js 15 sitemap.ts 형식
2) 동적 페이지 자동 포함 (DB/CMS에서 URL 조회)
3) lastmod, changefreq, priority 자동 계산
4) Preview 환경 URL 제외
5) 이미지 사이트맵 (image:image) 포함
6) 50,000 URL 초과 시 사이트맵 인덱스 자동 분할
7) 빌드 시점 자동 생성 + ISR 연동"
```

### 프롬프트 6: OG 이미지 생성

```bash
claude "이 프로젝트에 동적 OG 이미지 생성 시스템을 구축해줘.

요구사항:
1) @vercel/og (ImageResponse) 기반
2) 페이지 유형별 템플릿 (블로그, 비즈니스 객체(Entity), 기본)
3) 제목, 설명, 로고, 배경 동적 렌더링
4) 환경별 분기: Preview에서는 'PREVIEW' 워터마크 표시
5) 한글 폰트 지원 (Pretendard 등)
6) 1200x630 크기 + 캐싱 전략
7) Edge Runtime 호환"
```

### 프롬프트 7: 콘텐츠 SEO 분석

```bash
claude "이 프로젝트의 콘텐츠를 SEO 관점에서 분석해줘.

분석 항목:
1) 키워드 밀도 및 배치 적절성
2) 내부 링크 구조 (고립된 페이지 식별)
3) 콘텐츠 길이 및 가독성 점수
4) 중복 콘텐츠 탐지
5) 이미지 최적화 (WebP/AVIF, 크기, lazy loading)
6) 모바일 친화성 (뷰포트, 터치 타겟 크기)
7) 페이지 로딩 속도가 SEO에 미치는 영향 추정

개선 우선순위와 예상 효과를 함께 제시해줘."
```

---

## 2. 멀티 베타 환경 SEO 격리

> Preview 환경이 검색 엔진에 인덱싱되면 중복 콘텐츠 문제가 발생한다. 환경별 SEO 격리는 멀티 베타 운영의 필수 요소다.

### 2.1 환경 감지 유틸리티

```typescript
// lib/seo/environment.ts
// SEO 관련 환경 감지 — Production만 인덱싱 허용

type DeploymentEnv = 'production' | 'preview' | 'development';

interface SeoEnvironment {
  env: DeploymentEnv;
  baseUrl: string;
  isIndexable: boolean;
  robotsDirective: string;
}

export function getSeoEnvironment(): SeoEnvironment {
  const vercelEnv = (process.env.VERCEL_ENV ?? 'development') as DeploymentEnv;

  const isProduction = vercelEnv === 'production';

  const baseUrl = isProduction
    ? process.env.NEXT_PUBLIC_SITE_URL!
    : vercelEnv === 'preview'
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

  return {
    env: vercelEnv,
    baseUrl,
    isIndexable: isProduction,
    robotsDirective: isProduction ? 'index, follow' : 'noindex, nofollow',
  };
}
```

### 2.2 Preview 환경 noindex 자동 설정

```typescript
// lib/seo/metadata.ts
// 환경별 메타데이터 빌더 — Preview 자동 noindex 처리

import { Metadata } from 'next';
import { getSeoEnvironment } from './environment';

interface PageSeoInput {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  keywords?: string[];
}

export function buildMetadata(input: PageSeoInput): Metadata {
  const { baseUrl, isIndexable, robotsDirective, env } = getSeoEnvironment();
  const url = `${baseUrl}${input.path}`;

  const ogImageUrl = input.ogImage
    ?? `${baseUrl}/api/og?title=${encodeURIComponent(input.title)}&env=${env}`;

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,

    // Preview 환경 자동 noindex
    robots: {
      index: isIndexable,
      follow: isIndexable,
      googleBot: {
        index: isIndexable,
        follow: isIndexable,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // canonical은 항상 Production URL
    alternates: {
      canonical: isIndexable
        ? url
        : `${process.env.NEXT_PUBLIC_SITE_URL}${input.path}`,
    },

    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: process.env.NEXT_PUBLIC_SITE_NAME,
      type: input.type ?? 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: input.title,
        },
      ],
      ...(input.type === 'article' && {
        publishedTime: input.publishedTime,
        modifiedTime: input.modifiedTime,
        authors: input.authors,
      }),
    },

    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [ogImageUrl],
    },

    other: {
      'robots': robotsDirective,
    },
  };
}
```

### 2.3 환경별 robots.txt 동적 생성

```typescript
// app/robots.ts
// 환경별 robots.txt — Preview/Development는 전체 크롤링 차단

import type { MetadataRoute } from 'next';
import { getSeoEnvironment } from '@/lib/seo/environment';

export default function robots(): MetadataRoute.Robots {
  const { isIndexable, baseUrl } = getSeoEnvironment();

  if (!isIndexable) {
    // Preview/Development: 전체 크롤링 차단
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  // Production: 선택적 허용
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/auth/'],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/', // AI 크롤러 차단 (선택)
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

### 2.4 Preview URL SEO 영향 차단 (canonical 관리)

```typescript
// lib/seo/canonical.ts
// canonical URL은 항상 Production 도메인을 가리킨다

import { getSeoEnvironment } from './environment';

/**
 * canonical URL은 항상 Production 도메인을 가리킨다.
 * Preview 환경의 URL이 검색 엔진에 유입되더라도
 * canonical을 통해 Production으로 통합된다.
 */
export function getCanonicalUrl(path: string): string {
  const productionUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // 쿼리 파라미터 제거 (tracking 등)
  const cleanPath = normalizedPath.split('?')[0];

  // 후행 슬래시 정규화
  const canonicalPath = cleanPath === '/' ? '' : cleanPath.replace(/\/$/, '');

  return `${productionUrl}${canonicalPath}`;
}

/** 페이지네이션 canonical 처리 */
export function getPaginatedCanonical(
  path: string,
  page: number,
): { canonical: string; prev?: string; next?: string } {
  const base = getCanonicalUrl(path);

  return {
    canonical: page === 1 ? base : `${base}?page=${page}`,
    prev: page > 1 ? (page === 2 ? base : `${base}?page=${page - 1}`) : undefined,
    next: `${base}?page=${page + 1}`,
  };
}
```

### 2.5 환경별 OG 이미지 차별화

```typescript
// app/api/og/route.tsx
// 동적 OG 이미지 — Preview 환경 워터마크 자동 표시

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') ?? 'Default Title';
  const env = searchParams.get('env') ?? 'production';
  const description = searchParams.get('desc') ?? '';

  const isPreview = env === 'preview';

  // 한글 폰트 로드
  const fontData = await fetch(
    new URL('/fonts/Pretendard-Bold.otf', request.url),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '60px 80px',
          backgroundColor: isPreview ? '#1a1a2e' : '#ffffff',
          color: isPreview ? '#e0e0e0' : '#1a1a1a',
          fontFamily: 'Pretendard',
        }}
      >
        {/* Preview 워터마크 */}
        {isPreview && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '30px',
              padding: '8px 16px',
              backgroundColor: '#ff6b35',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            PREVIEW
          </div>
        )}

        {/* 사이트 로고 */}
        <div
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '24px',
            color: isPreview ? '#888888' : '#666666',
            display: 'flex',
          }}
        >
          {process.env.NEXT_PUBLIC_SITE_NAME ?? 'My Site'}
        </div>

        {/* 제목 */}
        <div
          style={{
            fontSize: title.length > 30 ? '42px' : '56px',
            fontWeight: 'bold',
            lineHeight: 1.3,
            maxWidth: '900px',
            display: 'flex',
          }}
        >
          {title}
        </div>

        {/* 설명 */}
        {description && (
          <div
            style={{
              fontSize: '24px',
              marginTop: '20px',
              color: isPreview ? '#aaaaaa' : '#555555',
              maxWidth: '800px',
              lineHeight: 1.5,
              display: 'flex',
            }}
          >
            {description}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Pretendard',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
      headers: {
        'Cache-Control': isPreview
          ? 'no-cache'
          : 'public, max-age=86400, s-maxage=604800',
      },
    },
  );
}
```

---

## 3. Next.js 15 SEO 기본 설정

### 3.1 루트 레이아웃 메타데이터

```typescript
// app/layout.tsx
// 전역 메타데이터 설정 — 모든 페이지의 기본값

import type { Metadata, Viewport } from 'next';
import { getSeoEnvironment } from '@/lib/seo/environment';

const { baseUrl, isIndexable } = getSeoEnvironment();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    template: '%s | 사이트명',
    default: '사이트명 - 핵심 가치 설명',
  },
  description: '150-160자 이내의 사이트 설명. 핵심 키워드와 행동 유도 문구 포함.',
  robots: {
    index: isIndexable,
    follow: isIndexable,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '사이트명',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@twitter_handle',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    other: {
      'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_VERIFICATION ?? '',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};
```

### 3.2 동적 페이지 generateMetadata

```typescript
// app/blog/[slug]/page.tsx
// 동적 메타데이터 생성 — 게시글별 SEO 최적화

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo/metadata';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  // DB/CMS에서 게시글 조회
  const res = await fetch(`${process.env.API_URL}/posts/${slug}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return {};

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    authors: [post.author.name],
    keywords: post.tags,
  });
}

export async function generateStaticParams() {
  const res = await fetch(`${process.env.API_URL}/posts?fields=slug`);
  const posts: { slug: string }[] = await res.json();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

### 3.3 Not Found 페이지 SEO 처리

검색 엔진이 404 페이지를 올바르게 인식하도록 처리한다. 잘못된 404 처리는 "소프트 404" 경고를 유발하여 검색 품질에 악영향을 준다.

```typescript
// app/not-found.tsx
// 404 페이지 — 검색 엔진이 올바르게 인식하도록 noindex 설정

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
  description: '요청하신 페이지가 존재하지 않습니다.',
  robots: {
    index: false,    // 404 페이지는 인덱싱하지 않음
    follow: true,    // 내부 링크는 따라감
  },
};

export default function NotFound() {
  return (
    <main>
      <h1>404 - 페이지를 찾을 수 없습니다</h1>
      <p>요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <a href="/">홈으로 돌아가기</a>
    </main>
  );
}
```

### 3.4 레이아웃 그룹별 메타데이터 상속

Next.js 15의 메타데이터 병합(merge) 전략을 활용하면 레이아웃 그룹별로 기본 메타데이터를 설정하고 하위 페이지에서 오버라이드할 수 있다.

```typescript
// app/(marketing)/layout.tsx
// 마케팅 페이지 그룹의 기본 메타데이터

import type { Metadata } from 'next';

export const metadata: Metadata = {
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '사이트명',
  },
  // 마케팅 페이지 공통 키워드
  keywords: ['서비스명', '핵심기능', '사용사례'],
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

```typescript
// app/(dashboard)/layout.tsx
// 대시보드는 SEO 불필요 — noindex 일괄 설정

import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,    // 대시보드 전체 noindex
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

---

## 4. 구조화 데이터 (JSON-LD)

### 4.1 JSON-LD 컴포넌트

```typescript
// components/JsonLd.tsx
// 타입 안전한 JSON-LD 컴포넌트 — XSS 방지 포함

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  // JSON 문자열 내 </script> 삽입 방지 (XSS 대응)
  const safeJson = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}
```

### 4.2 스키마 빌더

```typescript
// lib/seo/schema.ts
// Schema.org 기반 구조화 데이터 빌더 모음

import { getSeoEnvironment } from './environment';

interface OrganizationInput {
  name: string;
  url: string;
  logo: string;
  sameAs?: string[];
}

interface ArticleInput {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  publishedTime: string;
  modifiedTime: string;
  authorName: string;
  authorUrl?: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface ProductInput {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  ratingValue?: number;
  reviewCount?: number;
}

interface FaqItem {
  question: string;
  answer: string;
}

/** Organization 스키마 — 회사/서비스 정보 */
export function buildOrganizationSchema(input: OrganizationInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
    logo: input.logo,
    sameAs: input.sameAs ?? [],
  };
}

/** WebSite 스키마 — Sitelinks Search Box 활성화 */
export function buildWebSiteSchema() {
  const { baseUrl } = getSeoEnvironment();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: baseUrl,
    name: process.env.NEXT_PUBLIC_SITE_NAME,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Article 스키마 — 블로그 글, 뉴스 기사 */
export function buildArticleSchema(input: ArticleInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: input.url,
    image: input.imageUrl,
    datePublished: input.publishedTime,
    dateModified: input.modifiedTime,
    author: {
      '@type': 'Person',
      name: input.authorName,
      ...(input.authorUrl && { url: input.authorUrl }),
    },
    publisher: {
      '@type': 'Organization',
      name: process.env.NEXT_PUBLIC_SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${getSeoEnvironment().baseUrl}/logo.png`,
      },
    },
  };
}

/** BreadcrumbList 스키마 — 네비게이션 경로 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Product 스키마 — 상품/서비스 페이지 */
export function buildProductSchema(input: ProductInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.imageUrl,
    offers: {
      '@type': 'Offer',
      price: input.price,
      priceCurrency: input.currency,
      availability: `https://schema.org/${input.availability}`,
    },
    ...(input.ratingValue && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: input.ratingValue,
        reviewCount: input.reviewCount,
      },
    }),
  };
}

/** FAQPage 스키마 — FAQ 페이지 */
export function buildFaqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/** HowTo 스키마 — 가이드/튜토리얼 페이지 */
export function buildHowToSchema(input: {
  name: string;
  description: string;
  steps: { name: string; text: string; imageUrl?: string }[];
  totalTime?: string; // ISO 8601 duration (예: "PT30M")
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    ...(input.totalTime && { totalTime: input.totalTime }),
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.imageUrl && { image: step.imageUrl }),
    })),
  };
}
```

### 4.3 JSON-LD 사용 예시

```typescript
// app/blog/[slug]/page.tsx (JSON-LD 적용 부분)
// 블로그 글에 Article + Breadcrumb 구조화 데이터 삽입

import { JsonLd } from '@/components/JsonLd';
import { buildArticleSchema, buildBreadcrumbSchema } from '@/lib/seo/schema';
import { getSeoEnvironment } from '@/lib/seo/environment';

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { baseUrl } = getSeoEnvironment();

  const articleSchema = buildArticleSchema({
    title: post.title,
    description: post.excerpt,
    url: `${baseUrl}/blog/${slug}`,
    imageUrl: post.coverImage,
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    authorName: post.author.name,
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: '홈', url: baseUrl },
    { name: '블로그', url: `${baseUrl}/blog` },
    { name: post.title, url: `${baseUrl}/blog/${slug}` },
  ]);

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <article>
        <h1>{post.title}</h1>
        <div>{post.content}</div>
      </article>
    </>
  );
}
```

### 4.4 JSON-LD 유효성 검증 유틸리티

개발 환경에서 구조화 데이터를 자동 검증하여 배포 전 오류를 방지한다.

```typescript
// lib/seo/schema-validator.ts
// 개발 환경 전용 JSON-LD 유효성 검증기

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  Article: ['headline', 'datePublished', 'author', 'image'],
  Product: ['name', 'offers'],
  FAQPage: ['mainEntity'],
  BreadcrumbList: ['itemListElement'],
  Organization: ['name', 'url'],
  WebSite: ['url', 'name'],
  HowTo: ['name', 'step'],
};

/** JSON-LD 스키마의 필수 필드 존재 여부 검증 */
export function validateJsonLd(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // @context 검증
  if (data['@context'] !== 'https://schema.org') {
    errors.push('@context가 "https://schema.org"이어야 합니다.');
  }

  // @type 검증
  const type = data['@type'] as string;
  if (!type) {
    errors.push('@type이 누락되었습니다.');
    return { valid: false, errors, warnings };
  }

  // 필수 필드 검증
  const requiredFields = REQUIRED_FIELDS[type];
  if (requiredFields) {
    for (const field of requiredFields) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        errors.push(`${type}에 필수 필드 "${field}"가 누락되었습니다.`);
      }
    }
  } else {
    warnings.push(`알 수 없는 스키마 타입: ${type} (검증 규칙 없음)`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

---

## 5. 동적 OG 이미지 (@vercel/og)

### 5.1 기본 OG 이미지 생성기

> 환경별 OG 이미지 차별화는 [2.5 환경별 OG 이미지 차별화](#25-환경별-og-이미지-차별화) 참고.

### 5.2 페이지 유형별 템플릿

```typescript
// lib/seo/og-templates.ts
// OG 이미지 URL 빌더 — 페이지 유형별 파라미터 자동 설정

interface OgTemplateProps {
  title: string;
  description?: string;
  type: 'default' | 'blog' | 'product';
  category?: string;
  date?: string;
  price?: string;
}

/** OG 이미지 URL 빌더 */
export function buildOgImageUrl(props: OgTemplateProps): string {
  const params = new URLSearchParams({
    title: props.title,
    type: props.type,
    ...(props.description && { desc: props.description }),
    ...(props.category && { category: props.category }),
    ...(props.date && { date: props.date }),
    ...(props.price && { price: props.price }),
    env: process.env.VERCEL_ENV ?? 'development',
  });

  return `/api/og?${params}`;
}
```

### 5.3 메타데이터에 OG 이미지 통합

```typescript
// 사용 예시: generateMetadata에서 OG 이미지 연동

import { buildOgImageUrl } from '@/lib/seo/og-templates';
import { buildMetadata } from '@/lib/seo/metadata';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const ogImage = buildOgImageUrl({
    title: post.title,
    type: 'blog',
    category: post.category,
    date: post.publishedAt,
  });

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    ogImage,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
  });
}
```

### 5.4 OG 이미지 디버깅 도구

소셜 미디어 공유 시 OG 이미지가 올바르게 표시되는지 확인하는 도구 목록과 디버깅 방법이다.

```typescript
// scripts/validate-og-images.ts
// OG 이미지 일괄 검증 스크립트 — CI에서 실행 가능

import { JSDOM } from 'jsdom';

interface OgValidationResult {
  url: string;
  status: 'pass' | 'fail';
  issues: string[];
}

const OG_REQUIRED_TAGS = ['og:title', 'og:description', 'og:image', 'og:url'];

/** 주어진 URL의 OG 태그 완성도를 검증 */
async function validateOgTags(url: string): Promise<OgValidationResult> {
  const issues: string[] = [];

  try {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // 필수 OG 태그 검증
    for (const tag of OG_REQUIRED_TAGS) {
      const meta = doc.querySelector(`meta[property="${tag}"]`);
      if (!meta) {
        issues.push(`${tag} 태그 누락`);
      } else if (!meta.getAttribute('content')?.trim()) {
        issues.push(`${tag} 태그 내용 비어있음`);
      }
    }

    // OG 이미지 크기 검증 (1200x630 권장)
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const imageWidth = doc.querySelector('meta[property="og:image:width"]');
      const imageHeight = doc.querySelector('meta[property="og:image:height"]');
      if (!imageWidth || !imageHeight) {
        issues.push('og:image:width 또는 og:image:height 누락 (1200x630 권장)');
      }
    }

    // Twitter Card 검증
    const twitterCard = doc.querySelector('meta[name="twitter:card"]');
    if (!twitterCard) {
      issues.push('twitter:card 태그 누락');
    }
  } catch (error) {
    issues.push(`페이지 접근 실패: ${error}`);
  }

  return {
    url,
    status: issues.length === 0 ? 'pass' : 'fail',
    issues,
  };
}

// 디버깅 도구 URL 참고:
// - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
// - Twitter Card Validator: https://cards-dev.twitter.com/validator
// - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
// - Open Graph Preview: https://www.opengraph.xyz/
```

---

## 6. 사이트맵 및 robots.txt

### 6.1 정적 + 동적 사이트맵

```typescript
// app/sitemap.ts
// 정적 + 동적 사이트맵 생성 — Preview 환경 자동 제외

import type { MetadataRoute } from 'next';
import { getSeoEnvironment } from '@/lib/seo/environment';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { baseUrl, isIndexable } = getSeoEnvironment();

  // Preview 환경에서는 빈 사이트맵
  if (!isIndexable) return [];

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // 동적 페이지 (DB/CMS에서 조회)
  const postsResponse = await fetch(
    `${process.env.API_URL}/posts?fields=slug,updatedAt`,
    { next: { revalidate: 3600 } },
  );
  const posts: { slug: string; updatedAt: string }[] = await postsResponse.json();

  const dynamicPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...dynamicPages];
}
```

### 6.2 대규모 사이트맵 인덱스 분할

50,000 URL을 초과하는 대규모 사이트에서는 사이트맵 인덱스를 사용하여 분할한다.

```typescript
// app/sitemap/[id]/route.ts
// 사이트맵 인덱스 분할 — 50,000 URL 초과 시 자동 분할

import { NextRequest, NextResponse } from 'next/server';
import { getSeoEnvironment } from '@/lib/seo/environment';

const URLS_PER_SITEMAP = 50000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sitemapIndex = parseInt(id, 10);
  const { baseUrl, isIndexable } = getSeoEnvironment();

  if (!isIndexable) {
    return new NextResponse('', { status: 404 });
  }

  // 전체 URL 수 조회
  const countResponse = await fetch(`${process.env.API_URL}/posts/count`);
  const { total } = await countResponse.json();

  // 페이지네이션으로 해당 범위의 URL 조회
  const offset = sitemapIndex * URLS_PER_SITEMAP;
  const postsResponse = await fetch(
    `${process.env.API_URL}/posts?offset=${offset}&limit=${URLS_PER_SITEMAP}&fields=slug,updatedAt`,
  );
  const posts: { slug: string; updatedAt: string }[] = await postsResponse.json();

  // XML 사이트맵 생성
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${posts.map((post) => `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
```

### 6.3 robots.txt

> 환경별 robots.txt 동적 생성은 [2.3 환경별 robots.txt 동적 생성](#23-환경별-robotstxt-동적-생성) 참고.

---

## 7. SSR / SSG / ISR SEO 전략 비교

| 전략 | 크롤링 대응 | 초기 로딩 | 데이터 최신성 | 적합한 페이지 |
|---|---|---|---|---|
| **SSG** | 최적 (HTML 즉시 제공) | 가장 빠름 | 빌드 시점 고정 | 블로그, 문서, about |
| **ISR** | 최적 (캐시된 HTML) | 빠름 | revalidate 주기 | 제품 목록, 카테고리 |
| **SSR** | 양호 (실시간 HTML) | 보통 | 항상 최신 | 검색 결과, 개인화 |
| **CSR** | 불리 (JS 실행 필요) | 느림 | 항상 최신 | 대시보드 (SEO 불필요) |

### 7.1 전략별 구현 패턴

```typescript
// SSG - 빌드 시 생성
// app/docs/[slug]/page.tsx
export async function generateStaticParams() {
  const docs = await getAllDocs();
  return docs.map((doc) => ({ slug: doc.slug }));
}

// ISR - 주기적 재생성
// app/products/[id]/page.tsx
async function getProduct(id: string) {
  return fetch(`${process.env.API_URL}/products/${id}`, {
    next: { revalidate: 3600 }, // 1시간마다 재검증
  }).then((res) => res.json());
}

// SSR - 매 요청마다 생성
// app/search/page.tsx
export const dynamic = 'force-dynamic';

async function getSearchResults(query: string) {
  return fetch(`${process.env.API_URL}/search?q=${query}`, {
    cache: 'no-store',
  }).then((res) => res.json());
}
```

### 7.2 ISR + On-Demand Revalidation

```typescript
// app/api/revalidate/route.ts
// CMS 웹훅에서 호출 — 콘텐츠 변경 시 즉시 재생성

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path, tag } = await request.json();

  if (tag) {
    revalidateTag(tag);
  } else if (path) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

### 7.3 Streaming SSR과 SEO

Next.js 15의 Streaming SSR은 사용자 경험을 개선하면서도 검색 엔진 호환성을 유지한다. `<Suspense>`로 감싼 영역은 서버에서 완전히 렌더링된 후 HTML로 전송되므로 크롤러가 콘텐츠를 정상적으로 인식한다.

```typescript
// app/products/[id]/page.tsx
// Streaming SSR — SEO 핵심 콘텐츠는 Suspense 밖에 배치

import { Suspense } from 'react';

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  return (
    <article>
      {/* SEO 핵심 콘텐츠는 Suspense 밖 — 크롤러가 즉시 인식 */}
      <h1>{product.name}</h1>
      <p>{product.description}</p>

      {/* 부가 정보는 Streaming으로 지연 로딩 */}
      <Suspense fallback={<div>리뷰 로딩 중...</div>}>
        <ProductReviews productId={id} />
      </Suspense>

      <Suspense fallback={<div>추천 상품 로딩 중...</div>}>
        <RelatedProducts productId={id} />
      </Suspense>
    </article>
  );
}
```

---

## 8. Core Web Vitals와 SEO

### 8.1 Web Vitals 수집 및 리포팅

```typescript
// lib/seo/web-vitals.ts
// Core Web Vitals 자동 수집 — Beacon API로 비동기 전송

import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

interface VitalsReport {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  path: string;
}

function sendToAnalytics(metric: Metric): void {
  const report: VitalsReport = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    path: window.location.pathname,
  };

  // Beacon API로 비동기 전송
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', JSON.stringify(report));
  }
}

export function initWebVitals(): void {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

### 8.2 SEO 영향 임계값

| 지표 | Good | Needs Improvement | Poor | SEO 영향 |
|---|---|---|---|---|
| LCP | < 2.5s | 2.5s - 4.0s | > 4.0s | 직접 순위 요소 |
| INP | < 200ms | 200ms - 500ms | > 500ms | 직접 순위 요소 |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 | 직접 순위 요소 |
| FCP | < 1.8s | 1.8s - 3.0s | > 3.0s | 간접 영향 |
| TTFB | < 800ms | 800ms - 1.8s | > 1.8s | 간접 영향 |

### 8.3 CWV 개선을 위한 SEO 친화적 이미지 최적화

이미지는 LCP와 CLS에 직접적인 영향을 미친다. Next.js의 `<Image>` 컴포넌트를 올바르게 사용하면 자동으로 최적화된다.

```typescript
// components/SeoImage.tsx
// SEO 친화적 이미지 — LCP 최적화 + CLS 방지 + alt 필수

import Image from 'next/image';

interface SeoImageProps {
  src: string;
  alt: string;          // alt 텍스트 필수 (빈 문자열 불가)
  width: number;
  height: number;
  priority?: boolean;   // LCP 후보 이미지는 true
  className?: string;
}

export function SeoImage({ src, alt, width, height, priority, className }: SeoImageProps) {
  if (!alt || alt.trim() === '') {
    // 개발 환경에서 alt 누락 경고
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SEO] 이미지 alt 텍스트가 비어있습니다: ${src}`);
    }
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}       // LCP 이미지는 preload
      loading={priority ? 'eager' : 'lazy'}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className={className}
      // width/height 명시로 CLS 방지
    />
  );
}
```

> **참고**: 성능 최적화 상세 내용은 [08. 성능 최적화 가이드](./08_성능_최적화_가이드.md) 참조.

---

## 9. 국제화 SEO (hreflang)

다국어 사이트에서는 `hreflang` 태그를 통해 검색 엔진에 언어/지역별 대체 페이지를 알려줘야 한다. 누락 시 중복 콘텐츠 패널티를 받을 수 있다.

### 9.1 hreflang 메타데이터 설정

```typescript
// lib/seo/i18n-seo.ts
// hreflang 메타데이터 빌더 — 다국어 SEO 지원

import { Metadata } from 'next';
import { getSeoEnvironment } from './environment';

// 지원 언어 목록
const SUPPORTED_LOCALES = ['ko', 'en', 'ja'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];

interface I18nSeoInput {
  path: string;
  currentLocale: SupportedLocale;
}

/** 다국어 페이지의 alternates (hreflang) 메타데이터 생성 */
export function buildI18nAlternates(input: I18nSeoInput): Metadata['alternates'] {
  const { baseUrl } = getSeoEnvironment();

  // 언어별 대체 URL 매핑
  const languages: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    languages[locale] = `${baseUrl}/${locale}${input.path}`;
  }

  return {
    canonical: `${baseUrl}/${input.currentLocale}${input.path}`,
    languages: {
      ...languages,
      'x-default': `${baseUrl}/ko${input.path}`, // 기본 언어
    },
  };
}
```

### 9.2 다국어 사이트맵

```typescript
// app/sitemap.ts (다국어 확장)
// 다국어 사이트맵 — 각 언어별 URL을 alternates로 연결

import type { MetadataRoute } from 'next';
import { getSeoEnvironment } from '@/lib/seo/environment';

const LOCALES = ['ko', 'en', 'ja'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { baseUrl, isIndexable } = getSeoEnvironment();
  if (!isIndexable) return [];

  const pages = ['', '/about', '/pricing'];

  // 각 언어별 정적 페이지 생성
  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: locale === 'ko' ? 1.0 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, `${baseUrl}/${l}${page}`]),
          ),
        },
      });
    }
  }

  return entries;
}
```

> **참고**: 국제화 상세 구현은 [23. 국제화 가이드](./23_국제화_가이드.md) 참조.

---

## 10. SEO 모니터링 및 자동화 테스트

### 10.1 Playwright SEO 회귀 테스트

CI 파이프라인에 SEO 회귀 테스트를 포함하여 배포 전 자동 검증한다.

```typescript
// e2e/seo.spec.ts
// SEO 회귀 테스트 — Playwright 기반 자동 검증

import { test, expect } from '@playwright/test';

const PAGES_TO_TEST = ['/', '/about', '/blog', '/pricing'];

for (const path of PAGES_TO_TEST) {
  test.describe(`SEO 검증: ${path}`, () => {
    test('필수 메타 태그가 존재해야 한다', async ({ page }) => {
      await page.goto(path);

      // title 존재 및 길이 검증
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThanOrEqual(10);
      expect(title.length).toBeLessThanOrEqual(70);

      // description 메타 태그 검증
      const description = await page.getAttribute(
        'meta[name="description"]',
        'content',
      );
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThanOrEqual(50);
      expect(description!.length).toBeLessThanOrEqual(170);
    });

    test('OG 태그가 완전해야 한다', async ({ page }) => {
      await page.goto(path);

      const ogTags = ['og:title', 'og:description', 'og:image', 'og:url'];
      for (const tag of ogTags) {
        const content = await page.getAttribute(
          `meta[property="${tag}"]`,
          'content',
        );
        expect(content, `${tag} 태그 누락`).toBeTruthy();
      }
    });

    test('h1 태그가 정확히 1개여야 한다', async ({ page }) => {
      await page.goto(path);

      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });

    test('canonical URL이 설정되어야 한다', async ({ page }) => {
      await page.goto(path);

      const canonical = await page.getAttribute(
        'link[rel="canonical"]',
        'href',
      );
      expect(canonical).toBeTruthy();
      // canonical은 항상 Production URL이어야 함
      expect(canonical).not.toContain('preview');
      expect(canonical).not.toContain('localhost');
    });

    test('이미지에 alt 텍스트가 있어야 한다', async ({ page }) => {
      await page.goto(path);

      // 장식용 이미지(role="presentation")를 제외한 모든 이미지 검증
      const images = page.locator('img:not([role="presentation"])');
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute('alt');
        const src = await images.nth(i).getAttribute('src');
        expect(alt, `alt 누락: ${src}`).toBeTruthy();
      }
    });
  });
}

test('robots.txt가 올바르게 생성되어야 한다', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);

  const text = await response.text();
  expect(text).toContain('User-agent');
});

test('sitemap.xml이 유효한 XML이어야 한다', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);

  const contentType = response.headers()['content-type'];
  expect(contentType).toContain('xml');
});

test('JSON-LD가 유효한 JSON이어야 한다', async ({ page }) => {
  await page.goto('/');

  const jsonLdScripts = page.locator('script[type="application/ld+json"]');
  const count = await jsonLdScripts.count();

  for (let i = 0; i < count; i++) {
    const content = await jsonLdScripts.nth(i).textContent();
    expect(() => JSON.parse(content!)).not.toThrow();

    const data = JSON.parse(content!);
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBeTruthy();
  }
});
```

### 10.2 Lighthouse CI SEO 점수 게이트

CI에서 Lighthouse SEO 점수가 기준 이하면 배포를 차단한다.

```yaml
# .github/workflows/lighthouse-seo.yml
# Lighthouse CI — SEO 점수 90점 미만 시 배포 차단

name: Lighthouse SEO Gate
on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: 의존성 설치 및 빌드
        run: |
          npm ci
          npm run build

      - name: 프로덕션 서버 시작
        run: npm start &

      - name: Lighthouse CI 실행
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/about
            http://localhost:3000/blog
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true

      - name: SEO 점수 검증
        run: |
          # SEO 카테고리 90점 미만이면 실패
          SCORE=$(cat .lighthouseci/lhr-*.json | jq '.categories.seo.score * 100' | head -1)
          echo "SEO Score: $SCORE"
          if [ "$SCORE" -lt 90 ]; then
            echo "SEO 점수가 90점 미만입니다. 배포를 차단합니다."
            exit 1
          fi
```

> **참고**: CI/CD 파이프라인 상세 설정은 [11. CI/CD 파이프라인 표준](./11_CICD_파이프라인_표준.md) 참조.

---

## 11. 체크리스트

### 기본 SEO

- [ ] 모든 페이지에 고유한 title (50-60자)과 description (150-160자)이 있는가
- [ ] h1 태그가 각 페이지에 정확히 1개 있는가
- [ ] heading 계층 구조가 올바른가 (h1 > h2 > h3, 건너뛰기 없음)
- [ ] 모든 이미지에 의미 있는 alt 텍스트가 있는가
- [ ] canonical URL이 올바르게 설정되어 있는가
- [ ] sitemap.xml이 생성되고 최신 상태인가
- [ ] robots.txt가 올바르게 설정되어 있는가
- [ ] 404 페이지가 올바른 HTTP 상태 코드를 반환하는가
- [ ] URL 구조가 사람이 읽을 수 있는 형태인가 (slug 기반)

### 구조화 데이터

- [ ] 주요 페이지에 JSON-LD가 포함되어 있는가
- [ ] Schema.org Validator로 유효성이 확인되었는가
- [ ] Google Rich Results Test를 통과하는가
- [ ] BreadcrumbList가 네비게이션 계층과 일치하는가
- [ ] JSON-LD 내 `</script>` 삽입이 방지되는가 (XSS 대응)
- [ ] Article, Product, FAQ 등 페이지 유형별 적절한 스키마가 적용되었는가

### OG / Social

- [ ] 모든 페이지에 OG 태그 (title, description, image, url)가 있는가
- [ ] OG 이미지 크기가 1200x630인가
- [ ] Twitter Card가 설정되어 있는가
- [ ] OG 이미지에 한글이 정상 렌더링되는가
- [ ] Facebook Sharing Debugger에서 미리보기가 정상인가
- [ ] 페이지 유형별 OG 이미지 템플릿이 구분되어 있는가

### 멀티 베타 환경

- [ ] Preview 환경에서 noindex, nofollow가 자동 적용되는가
- [ ] Preview robots.txt가 전체 크롤링을 차단하는가
- [ ] Preview 페이지의 canonical이 Production URL을 가리키는가
- [ ] Preview OG 이미지에 PREVIEW 워터마크가 표시되는가
- [ ] 사이트맵에 Preview URL이 포함되지 않는가
- [ ] Development 환경에서도 동일한 격리가 적용되는가

### 국제화 SEO

- [ ] hreflang 태그가 모든 다국어 페이지에 설정되어 있는가
- [ ] x-default hreflang이 기본 언어를 가리키는가
- [ ] 다국어 사이트맵에 alternates가 포함되어 있는가
- [ ] 각 언어 페이지의 canonical이 해당 언어 URL을 가리키는가

### 성능 / CWV

- [ ] LCP < 2.5s인가
- [ ] INP < 200ms인가
- [ ] CLS < 0.1인가
- [ ] 이미지에 width/height 또는 aspect-ratio가 설정되어 있는가
- [ ] 폰트에 font-display: swap이 적용되어 있는가
- [ ] LCP 후보 이미지에 priority (preload)가 적용되어 있는가
- [ ] 불필요한 JavaScript가 페이지 로딩을 지연시키지 않는가

### CI/CD 자동화

- [ ] SEO 회귀 테스트가 CI 파이프라인에 포함되어 있는가
- [ ] Lighthouse CI SEO 점수 게이트가 설정되어 있는가 (최소 90점)
- [ ] OG 태그 완성도 검증이 자동화되어 있는가
- [ ] JSON-LD 유효성 검증이 자동화되어 있는가
- [ ] 배포 후 사이트맵 갱신이 자동화되어 있는가

---

> **연관 가이드**: [08. 성능 최적화](./08_성능_최적화_가이드.md) | [11. CI/CD 파이프라인](./11_CICD_파이프라인_표준.md) | [12. CloudFront 캐시](./12_CloudFront_캐시_전략.md) | [19. 웹 접근성](./19_웹_접근성_가이드.md) | [23. 국제화](./23_국제화_가이드.md)
