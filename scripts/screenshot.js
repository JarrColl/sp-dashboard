import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { createServer } from 'vite';

(async () => {
  const server = await createServer({
    configFile: path.resolve('vite.config.js'),
    server: { port: 0 },
  });
  await server.listen();
  const { port } = server.config.server;
  const url = `http://localhost:${port}/index.html`;
  console.log('Opening', url);

  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle0' });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const outDir = path.resolve('assets');
    await fs.promises.mkdir(outDir, { recursive: true });

    const dashPath = path.join(outDir, 'dashboard.png');
    await page.screenshot({ path: dashPath, fullPage: true });
    console.log('Dashboard screenshot saved to', dashPath);

    await page.click('#tab-btn-details');
    await new Promise(resolve => setTimeout(resolve, 500));
    const listPath = path.join(outDir, 'detailed_list.png');
    await page.screenshot({ path: listPath, fullPage: true });
    console.log('Detailed list screenshot saved to', listPath);
  } finally {
    await browser.close();
    await server.close();
  }
})();
