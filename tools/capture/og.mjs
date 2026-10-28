// Tạo ảnh chia sẻ (Open Graph) 1200×630 từ chính trang portfolio.
// Cần một server tĩnh đang chạy, mặc định http://localhost:5173
//   npm run og
//   PORTFOLIO_URL=http://localhost:3000 npm run og

import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.env.PORTFOLIO_URL || 'http://localhost:5173/';
const OUT = path.resolve(import.meta.dirname, '../../assets/og.jpg');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
// Bỏ qua màn hình loader để chụp ngay hero
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('visited', '1');
  localStorage.setItem('theme', 'light');
});
await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3500));

const buf = await page.screenshot({ type: 'png' });
await sharp(buf).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toFile(OUT);
await browser.close();
console.log(`✓ ${path.relative(process.cwd(), OUT)}`);
