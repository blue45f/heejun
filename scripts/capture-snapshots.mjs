import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';

const TARGETS = [
  { slug: 'multi-beta-guide', url: 'https://multi-beta-guide.vercel.app/' },
  { slug: 'toonspectrum', url: 'https://www.toonstudio.cloud/studio' },
  { slug: 'termsdesk', url: 'https://desk-platform.vercel.app/termsdesk/' },
  { slug: 'remote-devtools', url: 'https://remote-devtools.vercel.app/' },
  { slug: 'spa-seo-gateway', url: 'https://spa-seo-gateway.vercel.app' },
  { slug: 'deskcloud', url: 'https://desk-platform.vercel.app' },
  { slug: 'heejun', url: 'https://heejun.cloud/' }
];

async function capture() {
  const outputDir = path.join(process.cwd(), 'public', 'project-snapshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
  const targets = only ? TARGETS.filter((t) => t.slug === only) : TARGETS;
  console.log(`🚀 Starting snapshot capture${only ? ` (only: ${only})` : ''}...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

  for (const target of targets) {
    const outputPath = path.join(outputDir, `${target.slug}.jpg`);
    console.log(`\n📸 Capturing ${target.slug} from ${target.url}...`);

    try {
      // 45초 타임아웃 설정
      await page.goto(target.url, { waitUntil: 'load', timeout: 45000 });
      
      // 추가 대기 시간 (애니메이션, 스피너 등이 지나고 완전 렌더링되기를 대기)
      await new Promise((resolve) => setTimeout(resolve, 5000));
      
      await page.screenshot({
        path: outputPath,
        type: 'jpeg',
        quality: 90
      });
      console.log(`✅ Saved: ${target.slug}.jpg`);
    } catch (err) {
      console.error(`❌ Failed to capture ${target.slug}:`, err.message);
    }
  }

  await browser.close();
  console.log('\n🏁 Snapshot capture finished.');
}

capture().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
