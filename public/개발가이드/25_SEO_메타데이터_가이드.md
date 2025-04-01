# SEO 및 메타데이터 가이드 2026

## 목차

1. [AI 기반 SEO 혁신](#ai-기반-seo-혁신)
2. [Next.js 15 SEO 기본 설정](#nextjs-15-seo-기본-설정)
3. [구조화 데이터](#구조화-데이터)
4. [Core Web Vitals와 SEO](#core-web-vitals와-seo)
5. [OG/Twitter Card 최적화](#ogtwitter-card-최적화)
6. [동적 OG 이미지 생성](#동적-og-이미지-생성)
7. [SSR/SSG SEO 전략 비교](#ssrssg-seo-전략-비교)

---

## AI 기반 SEO 혁신

SEO는 더 이상 수동 태그 작성의 영역이 아니다. AI를 활용하면 메타 태그 생성, 구조화 데이터 작성, SEO 회귀 테스트를 자동화할 수 있다.

### Claude로 SEO 분석 프롬프트

#### 프롬프트 1: 페이지별 SEO 감사

```bash
claude "이 프로젝트의 모든 페이지 컴포넌트를 분석해서 SEO 감사를 해줘.
       각 페이지에 대해:
       1) title, description 메타 태그 존재 여부
       2) OG 태그 완성도 (og:title, og:description, og:image)
       3) 구조화 데이터(JSON-LD) 존재 여부와 적절성
       4) heading 태그 계층 구조 (h1 → h2 → h3 순서)
       5) 이미지 alt 텍스트 누락 여부
       6) canonical URL 설정 여부
       결과를 심각도(critical/warning/info)별로 정리해줘."
```

#### 프롬프트 2: 경쟁사 대비 SEO 개선점 도출

```bash
claude "다음 URL들의 SEO 요소를 분석하고 우리 사이트와 비교해줘.
       비교 대상: [경쟁사 URL 목록]
       분석 항목:
       1) 메타 태그 품질 (제목 길이, 설명 매력도)
       2) 구조화 데이터 종류와 풍부함
       3) Core Web Vitals 예상 점수
       4) 내부 링크 구조
       5) 개선 우선순위와 예상 영향도를 매트릭스로 정리"
```

#### 프롬프트 3: 콘텐츠 기반 SEO 키워드 추출

```bash
claude "src/app 디렉토리의 모든 페이지 콘텐츠를 분석해서
       1) 각 페이지의 핵심 키워드 3~5개 추출
       2) 키워드별 검색 의도(정보형/탐색형/거래형) 분류
       3) 현재 메타 태그에 키워드 반영 여부
       4) 개선된 title과 description 제안 (문자 수 제한 준수)
       5) 내부 링크로 연결할 관련 페이지 추천"
```

### AI 기반 메타 태그 자동 생성

```typescript
// lib/seo/ai-meta-generator.ts
interface PageContent {
  path: string;
  title?: string;
  headings: string[];
  bodyText: string;
  images: { src: string; alt?: string }[];
  category?: string;
}

interface GeneratedMeta {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
}

async function generateMetaTags(page: PageContent): Promise<GeneratedMeta> {
  const prompt = `
    다음 페이지 콘텐츠를 분석하여 SEO 최적화된 메타 태그를 생성해줘.

    페이지 경로: ${page.path}
    제목: ${page.title ?? '없음'}
    헤딩: ${page.headings.join(', ')}
    본문 (첫 500자): ${page.bodyText.slice(0, 500)}

    생성 규칙:
    - title: 50~60자, 핵심 키워드 포함, 브랜드명은 뒤에
    - description: 120~155자, 행동 유도 문구 포함, 핵심 가치 전달
    - og:title: 40~60자, 소셜 공유 시 클릭 유도
    - og:description: 80~120자, 호기심 유발
    - keywords: 핵심 3~5개, 롱테일 키워드 포함

    JSON 형식으로 출력해줘.
  `;

  const response = await callClaudeAPI(prompt);
  return JSON.parse(response) as GeneratedMeta;
}

// 빌드 타임에 모든 페이지의 메타 태그 사전 생성
async function generateAllMeta(pages: PageContent[]): Promise<Map<string, GeneratedMeta>> {
  const results = new Map<string, GeneratedMeta>();

  // 병렬 처리 (5개씩 배치)
  const batchSize = 5;
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    const metas = await Promise.all(batch.map(generateMetaTags));
    batch.forEach((page, idx) => {
      results.set(page.path, metas[idx]!);
    });
  }

  return results;
}

export { generateMetaTags, generateAllMeta };
```

### AI로 구조화 데이터(JSON-LD) 자동 생성

```typescript
// lib/seo/ai-jsonld-generator.ts
interface ContentAnalysis {
  pageType: 'product' | 'article' | 'faq' | 'howto' | 'organization' | 'breadcrumb';
  extractedData: Record<string, unknown>;
}

async function analyzeAndGenerateJsonLd(
  pageContent: string,
  pageUrl: string,
): Promise<string> {
  const prompt = `
    다음 페이지 콘텐츠를 분석하여 적절한 JSON-LD 구조화 데이터를 생성해줘.

    URL: ${pageUrl}
    콘텐츠:
    ${pageContent.slice(0, 2000)}

    규칙:
    1) 콘텐츠 유형을 자동 판별 (Product, Article, FAQ, HowTo 등)
    2) schema.org 최신 스펙 준수
    3) Google Rich Results Test 통과 가능한 수준
    4) 가능하면 여러 유형을 중첩 (@graph 사용)
    5) 유효한 JSON-LD만 출력 (설명 없이)
  `;

  const response = await callClaudeAPI(prompt);
  return response;
}

// 페이지 컴포넌트에서 자동으로 JSON-LD 주입
async function injectJsonLd(pageUrl: string, content: string): Promise<React.ReactNode> {
  const jsonLd = await analyzeAndGenerateJsonLd(content, pageUrl);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}

export { analyzeAndGenerateJsonLd, injectJsonLd };
```

### AI 기반 SEO 회귀 테스트

```typescript
// tests/seo-regression.test.ts
import { describe, it, expect } from 'vitest';

interface SeoSnapshot {
  path: string;
  title: string;
  description: string;
  h1Count: number;
  jsonLdTypes: string[];
  canonicalUrl: string;
  ogImage: string;
}

// 배포 전 SEO 요소 변경 감지
describe('SEO 회귀 테스트', () => {
  const pages = [
    '/', '/products', '/about', '/blog',
    '/products/featured', '/pricing',
  ];

  for (const path of pages) {
    it(`${path} - 필수 메타 태그가 존재한다`, async () => {
      const html = await renderPage(path);
      const meta = parseSeoElements(html);

      expect(meta.title).toBeTruthy();
      expect(meta.title.length).toBeGreaterThanOrEqual(30);
      expect(meta.title.length).toBeLessThanOrEqual(65);

      expect(meta.description).toBeTruthy();
      expect(meta.description.length).toBeGreaterThanOrEqual(80);
      expect(meta.description.length).toBeLessThanOrEqual(160);
    });

    it(`${path} - h1 태그가 정확히 1개이다`, async () => {
      const html = await renderPage(path);
      const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
      expect(h1Count).toBe(1);
    });

    it(`${path} - OG 태그가 완전하다`, async () => {
      const html = await renderPage(path);
      expect(html).toContain('og:title');
      expect(html).toContain('og:description');
      expect(html).toContain('og:image');
      expect(html).toContain('og:url');
      expect(html).toContain('og:type');
    });

    it(`${path} - 구조화 데이터가 유효하다`, async () => {
      const html = await renderPage(path);
      const jsonLdScripts = extractJsonLd(html);

      expect(jsonLdScripts.length).toBeGreaterThan(0);

      for (const script of jsonLdScripts) {
        // JSON 파싱 가능 여부
        const parsed = JSON.parse(script);
        expect(parsed['@context']).toBe('https://schema.org');
        expect(parsed['@type']).toBeTruthy();
      }
    });

    it(`${path} - canonical URL이 절대 경로이다`, async () => {
      const html = await renderPage(path);
      const canonical = extractCanonical(html);
      expect(canonical).toMatch(/^https?:\/\//);
    });
  }
});

// AI를 활용한 SEO 품질 점수 산출
async function calculateSeoScore(path: string): Promise<number> {
  const html = await renderPage(path);

  const prompt = `
    다음 HTML의 SEO 품질을 0~100점으로 평가해줘.
    평가 기준:
    - 메타 태그 완성도 (20점)
    - 구조화 데이터 품질 (20점)
    - 헤딩 구조 (15점)
    - 이미지 최적화 (15점)
    - 내부 링크 (10점)
    - 접근성 (10점)
    - 모바일 친화성 (10점)
    숫자만 출력해줘.

    HTML:
    ${html.slice(0, 5000)}
  `;

  const score = await callClaudeAPI(prompt);
  return parseInt(score, 10);
}

// 유틸리티 함수
async function renderPage(path: string): Promise<string> {
  const response = await fetch(`http://localhost:3000${path}`);
  return response.text();
}

function parseSeoElements(html: string): SeoSnapshot {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
  const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;

  return {
    path: '',
    title: titleMatch?.[1] ?? '',
    description: descMatch?.[1] ?? '',
    h1Count,
    jsonLdTypes: extractJsonLd(html).map(s => JSON.parse(s)['@type']),
    canonicalUrl: canonicalMatch?.[1] ?? '',
    ogImage: ogImageMatch?.[1] ?? '',
  };
}

function extractJsonLd(html: string): string[] {
  const pattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    results.push(match[1]!);
  }
  return results;
}

function extractCanonical(html: string): string {
  const match = html.match(/<link rel="canonical" href="([^"]+)"/);
  return match?.[1] ?? '';
}
```

---

## Next.js 15 SEO 기본 설정

### generateMetadata

```typescript
// app/products/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(
  { params }: ProductPageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  const previousImages = (await parent).openGraph?.images ?? [];

  return {
    title: `${product.name} | 내 쇼핑몰`,
    description: product.description.slice(0, 155),
    keywords: product.tags,
    alternates: {
      canonical: `https://example.com/products/${slug}`,
      languages: {
        'ko-KR': `https://example.com/ko/products/${slug}`,
        'en-US': `https://example.com/en/products/${slug}`,
      },
    },
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      type: 'website',
      url: `https://example.com/products/${slug}`,
      images: [
        {
          url: product.ogImage,
          width: 1200,
          height: 630,
          alt: product.name,
        },
        ...previousImages,
      ],
      siteName: '내 쇼핑몰',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.shortDescription,
      images: [product.ogImage],
      creator: '@myshop',
    },
    robots: {
      index: product.isPublished,
      follow: true,
      googleBot: {
        index: product.isPublished,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

async function getProduct(slug: string) {
  // 실제 구현에서는 DB/CMS 조회
  return {
    name: '',
    description: '',
    shortDescription: '',
    tags: [] as string[],
    ogImage: '',
    isPublished: true,
  };
}
```

### sitemap.ts

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://example.com';

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
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // 동적 페이지 (제품)
  const products = await getAllProducts();
  const productPages: MetadataRoute.Sitemap = products.map(product => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // 동적 페이지 (블로그)
  const posts = await getAllBlogPosts();
  const blogPages: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...blogPages];
}

// 다국어 sitemap
// app/[locale]/sitemap.ts
export async function generateSitemaps() {
  const locales = ['ko', 'en', 'ja'];
  return locales.map(locale => ({ id: locale }));
}

async function getAllProducts() {
  return [] as { slug: string; updatedAt: string }[];
}

async function getAllBlogPosts() {
  return [] as { slug: string; updatedAt: string }[];
}
```

### robots.ts

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://example.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '/checkout/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
```

---

## 구조화 데이터

### Product

```typescript
// components/seo/ProductJsonLd.tsx
interface ProductJsonLdProps {
  name: string;
  description: string;
  image: string[];
  sku: string;
  brand: string;
  price: number;
  currency: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  ratingValue?: number;
  reviewCount?: number;
  url: string;
}

export function ProductJsonLd(props: ProductJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: props.name,
    description: props.description,
    image: props.image,
    sku: props.sku,
    brand: {
      '@type': 'Brand',
      name: props.brand,
    },
    offers: {
      '@type': 'Offer',
      url: props.url,
      priceCurrency: props.currency,
      price: props.price,
      availability: `https://schema.org/${props.availability}`,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    ...(props.ratingValue && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: props.ratingValue,
        reviewCount: props.reviewCount,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### Article

```typescript
// components/seo/ArticleJsonLd.tsx
interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  image: string[];
  datePublished: string;
  dateModified: string;
  authorName: string;
  authorUrl?: string;
  publisherName: string;
  publisherLogo: string;
}

export function ArticleJsonLd(props: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.title,
    description: props.description,
    url: props.url,
    image: props.image,
    datePublished: props.datePublished,
    dateModified: props.dateModified,
    author: {
      '@type': 'Person',
      name: props.authorName,
      ...(props.authorUrl && { url: props.authorUrl }),
    },
    publisher: {
      '@type': 'Organization',
      name: props.publisherName,
      logo: {
        '@type': 'ImageObject',
        url: props.publisherLogo,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': props.url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### FAQ

```typescript
// components/seo/FaqJsonLd.tsx
interface FaqItem {
  question: string;
  answer: string;
}

interface FaqJsonLdProps {
  items: FaqItem[];
}

export function FaqJsonLd({ items }: FaqJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### BreadcrumbList

```typescript
// components/seo/BreadcrumbJsonLd.tsx
interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.href,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// 사용 예시
function ProductPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: '홈', href: 'https://example.com' },
          { name: '전자제품', href: 'https://example.com/category/electronics' },
          { name: '스마트폰', href: 'https://example.com/category/electronics/smartphones' },
          { name: 'Galaxy S25', href: 'https://example.com/products/galaxy-s25' },
        ]}
      />
      {/* 페이지 콘텐츠 */}
    </>
  );
}
```

---

## Core Web Vitals와 SEO

### CWV 측정 및 모니터링

```typescript
// lib/seo/web-vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

interface VitalThreshold {
  good: number;
  needsImprovement: number;
}

const THRESHOLDS: Record<string, VitalThreshold> = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  LCP: { good: 2500, needsImprovement: 4000 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'poor';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function reportVital(metric: Metric) {
  const rating = getRating(metric.name, metric.value);

  // Analytics로 전송
  const body = {
    name: metric.name,
    value: metric.value,
    rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now(),
  };

  // Navigator.sendBeacon으로 비동기 전송 (페이지 언로드 시에도 안전)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', JSON.stringify(body));
  } else {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body: JSON.stringify(body),
      keepalive: true,
    });
  }
}

export function initWebVitals() {
  onCLS(reportVital);
  onINP(reportVital);
  onLCP(reportVital);
  onFCP(reportVital);
  onTTFB(reportVital);
}
```

### CWV 최적화 체크리스트

| 지표 | 목표 | 최적화 전략 |
|------|------|-------------|
| **LCP** | < 2.5s | 이미지 `priority` 속성, `<link rel="preload">`, 서버 응답 시간 최적화 |
| **INP** | < 200ms | 이벤트 핸들러 최적화, `useTransition`, Web Worker 활용 |
| **CLS** | < 0.1 | 이미지 `width/height` 명시, 폰트 `font-display: swap`, 동적 콘텐츠 예약 공간 |
| **FCP** | < 1.8s | 크리티컬 CSS 인라인, 렌더 블로킹 리소스 제거 |
| **TTFB** | < 800ms | CDN, 캐싱, 서버 리전 최적화 |

### LCP 최적화 컴포넌트

```typescript
// components/OptimizedHeroImage.tsx
import Image from 'next/image';

interface HeroImageProps {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
}

export function OptimizedHeroImage({ src, alt, title, subtitle }: HeroImageProps) {
  return (
    <section className="relative h-[60vh] w-full">
      {/* LCP 최적화: priority + sizes + fetchPriority */}
      <Image
        src={src}
        alt={alt}
        fill
        priority // preload 자동 추가
        sizes="100vw"
        className="object-cover"
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJ..." // 인라인 blur
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
        <h1 className="text-4xl font-bold text-white">{title}</h1>
        <p className="mt-4 text-lg text-white/90">{subtitle}</p>
      </div>
    </section>
  );
}
```

---

## OG/Twitter Card 최적화

### 통합 OG 설정 컴포넌트

```typescript
// lib/seo/og-config.ts
import type { Metadata } from 'next';

interface OgConfig {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://example.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;
const SITE_NAME = '내 서비스';

export function generateOgMetadata(config: OgConfig): Metadata {
  const url = `${BASE_URL}${config.path}`;
  const image = config.image ?? DEFAULT_OG_IMAGE;

  return {
    title: config.title,
    description: config.description,
    openGraph: {
      title: config.title,
      description: config.description,
      url,
      siteName: SITE_NAME,
      type: config.type ?? 'website',
      locale: 'ko_KR',
      alternateLocale: ['en_US', 'ja_JP'],
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: config.title,
          type: 'image/png',
        },
      ],
      ...(config.type === 'article' && {
        publishedTime: config.publishedTime,
        modifiedTime: config.modifiedTime,
        authors: config.authors,
        tags: config.tags,
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
      images: [image],
      creator: '@myservice',
      site: '@myservice',
    },
  };
}
```

### OG 이미지 검증 유틸리티

```typescript
// scripts/validate-og-images.ts
import { readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

interface OgImageIssue {
  path: string;
  issue: string;
  severity: 'error' | 'warning';
}

async function validateOgImages(publicDir: string): Promise<OgImageIssue[]> {
  const issues: OgImageIssue[] = [];

  // og 이미지 파일들 검사
  const ogImages = await findOgImages(publicDir);

  for (const imgPath of ogImages) {
    const buffer = await readFile(join(publicDir, imgPath));
    const metadata = await sharp(buffer).metadata();

    // 크기 검증 (1200x630 권장)
    if (metadata.width !== 1200 || metadata.height !== 630) {
      issues.push({
        path: imgPath,
        issue: `OG 이미지 크기가 ${metadata.width}x${metadata.height}입니다. 1200x630을 권장합니다.`,
        severity: 'warning',
      });
    }

    // 파일 크기 검증 (300KB 이하 권장)
    const fileSizeKB = buffer.length / 1024;
    if (fileSizeKB > 300) {
      issues.push({
        path: imgPath,
        issue: `OG 이미지 파일 크기가 ${fileSizeKB.toFixed(0)}KB입니다. 300KB 이하를 권장합니다.`,
        severity: 'warning',
      });
    }

    // 포맷 검증 (PNG 또는 JPEG 권장)
    if (metadata.format && !['png', 'jpeg'].includes(metadata.format)) {
      issues.push({
        path: imgPath,
        issue: `OG 이미지 포맷이 ${metadata.format}입니다. PNG 또는 JPEG를 권장합니다.`,
        severity: 'error',
      });
    }
  }

  return issues;
}

async function findOgImages(dir: string): Promise<string[]> {
  // 실제 구현에서는 glob 패턴으로 og-*.png, og-*.jpg 등 탐색
  return [];
}

export { validateOgImages };
```

---

## 동적 OG 이미지 생성

### @vercel/og를 활용한 동적 이미지

```typescript
// app/api/og/route.tsx
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get('title') ?? '내 서비스';
  const description = searchParams.get('description') ?? '';
  const category = searchParams.get('category') ?? '';
  const author = searchParams.get('author') ?? '';

  // 커스텀 폰트 로드
  const fontData = await fetch(
    new URL('../../assets/fonts/PretendardBold.otf', import.meta.url),
  ).then(res => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#0f172a',
          padding: '60px 80px',
          fontFamily: 'Pretendard',
        }}
      >
        {/* 상단: 카테고리 태그 */}
        {category && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              borderRadius: '20px',
              fontSize: '18px',
              color: '#ffffff',
            }}
          >
            {category}
          </div>
        )}

        {/* 중앙: 타이틀 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: title.length > 30 ? '48px' : '64px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: '24px',
                color: '#94a3b8',
                maxWidth: '800px',
                lineHeight: 1.4,
              }}
            >
              {description.slice(0, 100)}
            </div>
          )}
        </div>

        {/* 하단: 브랜드 + 저자 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '24px', color: '#64748b' }}>
            example.com
          </div>
          {author && (
            <div style={{ fontSize: '20px', color: '#64748b' }}>
              by {author}
            </div>
          )}
        </div>
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
    },
  );
}
```

### 페이지에서 동적 OG 이미지 연결

```typescript
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  // 동적 OG 이미지 URL 생성
  const ogImageUrl = new URL('/api/og', process.env.NEXT_PUBLIC_BASE_URL);
  ogImageUrl.searchParams.set('title', post.title);
  ogImageUrl.searchParams.set('description', post.excerpt);
  ogImageUrl.searchParams.set('category', post.category);
  ogImageUrl.searchParams.set('author', post.author);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      images: [
        {
          url: ogImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
  };
}

async function getBlogPost(slug: string) {
  return { title: '', excerpt: '', category: '', author: '' };
}
```

---

## SSR/SSG SEO 전략 비교

### 렌더링 방식별 SEO 특성

| 기준 | SSR (Dynamic) | SSG (Static) | ISR (Incremental) | Streaming SSR |
|------|---------------|--------------|---------------------|---------------|
| **크롤러 접근성** | 완전 | 완전 | 완전 | 부분 (Suspense 경계) |
| **TTFB** | 느림 (서버 렌더 시간) | 빠름 (CDN) | 빠름 (캐시 히트) | 빠름 (shell 즉시) |
| **콘텐츠 신선도** | 실시간 | 빌드 시점 | revalidate 주기 | 실시간 |
| **메타 태그** | 동적 | 정적 | 동적 (revalidate) | 동적 |
| **적합 페이지** | 개인화, 실시간 데이터 | 랜딩, 블로그 | 제품 목록, CMS | 대시보드 |

### 전략 선택 가이드

```typescript
// app/layout.tsx - 글로벌 SEO 기본 설정
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    template: '%s | 내 서비스',
    default: '내 서비스 - 최고의 솔루션',
  },
  description: '내 서비스는 최고의 솔루션을 제공합니다.',
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
    other: {
      'naver-site-verification': ['naver-verification-code'],
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};
```

### 페이지 유형별 렌더링 전략

```typescript
// 1. 정적 페이지 (SSG) - 랜딩, About
// app/about/page.tsx
export default function AboutPage() {
  return <main>{/* 정적 콘텐츠 */}</main>;
}
// generateStaticParams 없음 → 빌드 타임 생성

// 2. ISR 페이지 - 블로그, 제품
// app/blog/[slug]/page.tsx
export const revalidate = 3600; // 1시간마다 재생성

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  return <article>{post.title}</article>;
}

// 3. 동적 SSR 페이지 - 검색 결과, 개인화
// app/search/page.tsx
export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q } = await searchParams;
  const results = await search(typeof q === 'string' ? q : '');
  return <div>{/* 검색 결과 */}</div>;
}

// 4. Streaming SSR - 크리티컬 메타 태그 + 비크리티컬 콘텐츠
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <main>
      {/* 메타 태그는 즉시 렌더 (SEO 영향 없는 페이지이므로 noindex) */}
      <h1>대시보드</h1>
      <Suspense fallback={<div>로딩 중...</div>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  return <div />;
}

async function search(q: string) {
  return [];
}
```
