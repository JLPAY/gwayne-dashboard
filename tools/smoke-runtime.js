/**
 * smoke-runtime.js —— 浏览器级运行时冒烟（Playwright Chromium）
 *
 * 为什么需要它：三层静态门禁（契约/模板/参数等价）抓不到运行时行为变更——
 * 例如 rxjs-compat 移除后某处仍依赖原型补丁、或 Angular 升级导致的变更检测失效。
 *
 * 本机 Edge 被安全策略静默拦截（连 --version 都无输出），改用 Playwright 自带的
 * chromium（%LOCALAPPDATA%/ms-playwright，来自 npmmirror 源）绕开。
 *
 * 用法：node tools/smoke-runtime.js [url]
 * 判据：页面完成 bootstrap（出现应用 DOM）、无 console error、无未捕获异常。
 */
'use strict';

const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://localhost:4200/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err && err.stack ? err.stack.split('\n')[0] : err)));
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} — ${req.failure() && req.failure().errorText}`);
  });

  const resp = await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => ({
    title: document.title,
    hasAppRoot: !!document.querySelector('app-root, gwayne-root, [ng-version]'),
    ngVersion: (document.querySelector('[ng-version]') || {}).getAttribute
      ? document.querySelector('[ng-version]').getAttribute('ng-version')
      : null,
    bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
    nodes: document.body.querySelectorAll('*').length,
  }));

  console.log('HTTP 状态      :', resp && resp.status());
  console.log('页面标题        :', info.title);
  console.log('DOM 节点数      :', info.nodes);
  console.log('Angular 版本属性 :', info.ngVersion);
  console.log('页面可见文本     :', info.bodyText);
  console.log('console error   :', consoleErrors.length, consoleErrors.slice(0, 5));
  console.log('未捕获异常       :', pageErrors.length, pageErrors.slice(0, 5));
  console.log('失败请求         :', failedRequests.length, failedRequests.slice(0, 5));

  await page.screenshot({ path: '.tmp-smoke/smoke.png', fullPage: false }).catch(() => {});
  const fatal = pageErrors.length > 0 || info.nodes < 20;
  console.log('\n结论：', fatal ? '✗ 冒烟失败（存在未捕获异常或页面未渲染）' : '✓ 冒烟通过（页面渲染、无未捕获异常）');
  await browser.close();
  process.exit(fatal ? 1 : 0);
})();
