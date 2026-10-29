// Chụp ảnh các dự án cho portfolio.
//   npm run capture              -> chụp tất cả
//   npm run capture -- amor luna -> chỉ chụp những slug được liệt kê
//
// Mỗi dự án tạo 3 ảnh trong assets/shots/:
//   <slug>-desktop.webp  màn hình đầu tiên, 1440×900
//   <slug>-long.webp     ghép nhiều khung khi cuộn, dùng cho hiệu ứng rê chuột cuộn trang
//   <slug>-mobile.webp   màn hình đầu tiên trên điện thoại, 390×844 @2x

import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.resolve(import.meta.dirname, '../../assets/shots');

const SITES = [
  { slug: 'turnwood', url: 'https://turnwood.vercel.app/', delay: 7000 },
  { slug: 'an-retreat', url: 'https://an-retreat.vercel.app/' },
  { slug: 'biahoidatmo', url: 'https://biahoidatmo.vercel.app/' },
  { slug: 'muoi-nail', url: 'https://muoi-nail.vercel.app/' },
  { slug: 'flow', url: 'https://flow-dun-five.vercel.app/' },
  { slug: 'luna', url: 'https://luna-lights.vercel.app/' },
  { slug: 'amor', url: 'https://amor-florist.shop/' },
];

const DESKTOP = { width: 1440, height: 900 };
const LONG_FRAMES = 6; // tối đa 6 khung = 5400px
const LONG_WIDTH = 1200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(page, site) {
  // Chrome chạy ngầm lấy theme theo hệ điều hành; trang nào đổi giao diện theo thiết bị sẽ bị chụp nền tối
  // nếu máy đang để chế độ tối, nên luôn ép chế độ sáng.
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(site.url, { waitUntil: 'load', timeout: 60_000 });
      break;
    } catch (err) {
      if (attempt >= 3) throw err;
      await sleep(2000 * attempt);
    }
  }
  // Trang có video hoặc kết nối liên tục sẽ không bao giờ "rảnh mạng", nên chỉ chờ có giới hạn.
  await page.waitForNetworkIdle({ idleTime: 800, timeout: 15_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready);
  await sleep(site.delay ?? 3500);
}

// Cuộn bằng bánh xe chuột để các thư viện như Lenis / ScrollTrigger phản ứng như người dùng thật.
async function scrollTo(page, target) {
  await page.mouse.move(DESKTOP.width / 2, DESKTOP.height / 2);
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y >= target - 2) break;
    await page.mouse.wheel({ deltaY: Math.min(300, target - y) });
    await sleep(120);
  }
  await sleep(400);
  const y = await page.evaluate(() => window.scrollY);
  if (Math.abs(y - target) > 40) {
    await page.evaluate((t) => window.scrollTo(0, t), target);
    await sleep(400);
  }
}

// Ẩn header / nút nổi dạng fixed hoặc sticky để chúng không lặp lại ở mỗi khung ghép:
// phần tử nhỏ, header sticky cao nhưng đã cuộn khuất phía trên, và widget fixed như cột nút mạng xã hội.
// Nội dung sticky nằm giữa trang (cột ảnh, section đang được ghim) được giữ lại. Ẩn bằng opacity chứ không
// bằng visibility, vì phần tử con tự đặt `visibility: visible` (hay gặp ở menu thả xuống) vẫn sẽ hiện.
async function hideFloating(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      const onScreen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (onScreen <= 0) continue;
      const partial = onScreen < window.innerHeight * 0.45;
      const small = r.height < 220;
      const scrolledHeader = r.top <= 0 && partial;
      const floatingWidget = cs.position === 'fixed' && partial;
      if (small || scrolledHeader || floatingWidget) el.style.setProperty('opacity', '0', 'important');
    }
  });
}

async function captureDesktop(browser, site) {
  const page = await browser.newPage();
  await page.setViewport({ ...DESKTOP, deviceScaleFactor: 1 });
  await open(page, site);

  const first = await page.screenshot({ type: 'png' });
  await sharp(first).webp({ quality: 82 }).toFile(path.join(OUT, `${site.slug}-desktop.webp`));

  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const height = Math.min(total, DESKTOP.height * LONG_FRAMES);
  const frames = [{ top: 0, buf: first }];
  for (let target = DESKTOP.height; target < height; target += DESKTOP.height) {
    await scrollTo(page, Math.min(target, total - DESKTOP.height));
    await sleep(1100);
    await hideFloating(page);
    const top = await page.evaluate(() => window.scrollY);
    if (top <= frames.at(-1).top) break;
    frames.push({ top, buf: await page.screenshot({ type: 'png' }) });
  }

  const longHeight = Math.min(height, frames.at(-1).top + DESKTOP.height);
  await sharp({
    create: { width: DESKTOP.width, height: longHeight, channels: 3, background: '#ffffff' },
  })
    .composite(frames.map((f) => ({ input: f.buf, top: f.top, left: 0 })))
    .png()
    .toBuffer()
    .then((buf) =>
      sharp(buf)
        .resize({ width: LONG_WIDTH })
        .webp({ quality: 74 })
        .toFile(path.join(OUT, `${site.slug}-long.webp`)),
    );

  await page.close();
  return frames.length;
}

async function captureMobile(browser, site) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  );
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await open(page, site);
  const buf = await page.screenshot({ type: 'png' });
  await sharp(buf).webp({ quality: 80 }).toFile(path.join(OUT, `${site.slug}-mobile.webp`));
  await page.close();
}

const only = process.argv.slice(2);
const targets = only.length ? SITES.filter((s) => only.includes(s.slug)) : SITES;

await fs.mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--lang=vi-VN', '--force-color-profile=srgb'],
});

for (const site of targets) {
  const t = Date.now();
  try {
    const frames = await captureDesktop(browser, site);
    await captureMobile(browser, site);
    console.log(`✓ ${site.slug} (${frames} khung, ${((Date.now() - t) / 1000).toFixed(1)}s)`);
  } catch (err) {
    console.error(`✗ ${site.slug}: ${err.message}`);
  }
}

await browser.close();
