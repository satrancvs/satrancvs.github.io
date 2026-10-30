// Tek sayfalık görsel: node social/render-page.mjs <html> <png> <genişlik> <yükseklik>
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [html, png, w, h] = process.argv.slice(2);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto('file://' + path.resolve(html), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: png });
await browser.close();
