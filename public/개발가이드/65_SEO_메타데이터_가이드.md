# SEO 및 메타데이터 가이드 (2026)

## 목차

1. [AI 기반 SEO 워크플로우](#1-ai-기반-seo-워크플로우)
2. [멀티 베타 환경 SEO 격리](#2-멀티-베타-환경-seo-격리)
3. [Next.js 15 SEO 기본 설정](#3-nextjs-15-seo-기본-설정)
4. [구조화 데이터 (JSON-LD)](#4-구조화-데이터-json-ld)
5. [동적 OG 이미지 (@vercel/og)](#5-동적-og-이미지-vercelgo)
6. [사이트맵 및 robots.txt](#6-사이트맵-및-robotstxt)
7. [SSR / SSG / ISR SEO 전략 비교](#7-ssr--ssg--isr-seo-전략-비교)
8. [Core Web Vitals와 SEO](#8-core-web-vitals와-seo)
9. [체크리스트](#9-체크리스트)

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
3) 제품 페이지 → Product + Offer + AggregateRating
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
2) 페이지 유형별 템플릿 (블로그, 제품, 기본)
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

---

## 4. 구조화 데이터 (JSON-LD)

### 4.1 JSON-LD 컴포넌트

```typescript
// components/JsonLd.tsx

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

### 4.2 스키마 빌더

```typescript
// lib/seo/schema.ts

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
```

### 4.3 JSON-LD 사용 예시

```typescript
// app/blog/[slug]/page.tsx (JSON-LD 적용 부분)

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

---

## 5. 동적 OG 이미지 (@vercel/og)

### 5.1 기본 OG 이미지 생성기

> 환경별 OG 이미지 차별화는 [2.5 환경별 OG 이미지 차별화](#25-환경별-og-이미지-차별화) 참고.

### 5.2 페이지 유형별 템플릿

```typescript
// lib/seo/og-templates.ts

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

---

## 6. 사이트맵 및 robots.txt

### 6.1 정적 + 동적 사이트맵

```typescript
// app/sitemap.ts

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

### 6.2 robots.txt

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

---

## 8. Core Web Vitals와 SEO

### 8.1 Web Vitals 수집 및 리포팅

```typescript
// lib/seo/web-vitals.ts

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

---

## 9. 체크리스트

### 기본 SEO

- [ ] 모든 페이지에 고유한 title (50-60자)과 description (150-160자)이 있는가
- [ ] h1 태그가 각 페이지에 정확히 1개 있는가
- [ ] 모든 이미지에 의미 있는 alt 텍스트가 있는가
- [ ] canonical URL이 올바르게 설정되어 있는가
- [ ] sitemap.xml이 생성되고 최신 상태인가
- [ ] robots.txt가 올바르게 설정되어 있는가

### 구조화 데이터

- [ ] 주요 페이지에 JSON-LD가 포함되어 있는가
- [ ] Schema.org Validator로 유효성이 확인되었는가
- [ ] Google Rich Results Test를 통과하는가
- [ ] BreadcrumbList가 네비게이션 계층과 일치하는가

### OG / Social

- [ ] 모든 페이지에 OG 태그 (title, description, image, url)가 있는가
- [ ] OG 이미지 크기가 1200x630인가
- [ ] Twitter Card가 설정되어 있는가
- [ ] OG 이미지에 한글이 정상 렌더링되는가

### 멀티 베타 환경

- [ ] Preview 환경에서 noindex, nofollow가 자동 적용되는가
- [ ] Preview robots.txt가 전체 크롤링을 차단하는가
- [ ] Preview 페이지의 canonical이 Production URL을 가리키는가
- [ ] Preview OG 이미지에 PREVIEW 워터마크가 표시되는가
- [ ] 사이트맵에 Preview URL이 포함되지 않는가

### 성능 / CWV

- [ ] LCP < 2.5s인가
- [ ] INP < 200ms인가
- [ ] CLS < 0.1인가
- [ ] 이미지에 width/height 또는 aspect-ratio가 설정되어 있는가
- [ ] 폰트에 font-display: swap이 적용되어 있는가
