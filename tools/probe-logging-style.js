/**
 * pod 日志页样式探针（黑底 / 正文文字色 / 头部下拉）
 *
 * 用途：绕过登录 guard（打桩 /currentuser 等接口），直接打开 pod 日志页，量测
 *       `.card-block` / `.card-text` 的计算背景色与文字色，并截图留证。
 *       用于验证「黑底 + 柔和浅灰正文」（Clarity 16 起 .card-text 自带灰色 color，
 *       会盖掉 card-block 内联的白色继承）。
 * 前置：dev server 跑在 127.0.0.1:4200（`npm start`）。
 * 运行：NODE_PATH=<workspace>/node_modules node tools/probe-logging-style.js
 * 输出：stdout 打印计算样式 JSON；截图落在系统临时目录（不污染仓库）。
 */
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  // ---- 打桩所有后端 API ----
  const json = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  await page.route('**/currentuser*', r => r.fulfill(json({ data: { id: 1, name: 'admin', admin: true, namespaces: [{ id: 1, name: 'probe-ns' }] } })));
  await page.route('**/api/v1/configs/base*', r => r.fulfill(json({ data: { SYSTEM_NAME: 'Wayne' } })));
  await page.route('**/api/v1/clusters/UAT*', r => r.fulfill(json({ data: { name: 'UAT', metaData: JSON.stringify({ logSource: 'uat-source' }) } })));
  await page.route('**/api/v1/kubernetes/apps/1/pods/**', r => r.fulfill(json({
    data: { list: [{ metadata: { name: 'probe-pod' }, spec: { containers: [{ name: 'main' }] } }] }
  })));
  await page.route('**/api/v1/kubernetes/apps/1/podlogs/**', r => r.fulfill(json({
    data: '[2026-10-14 18:00:18.650][]http-nio-8080-exec-7[][INFO][c.c.l.s.l.DynamicLogLevelWriter][29][write] => some log line 1\n[2026-10-14 18:00:18.651][]http-nio-8080-exec-7[][INFO] => some log line 2'
  })));
  // 其余 API 一律返回空成功
  await page.route('**/api/**', r => r.fulfill(json({ data: {} })));

  const url = 'http://127.0.0.1:4200/portal/logging/namespace/1/app/1/deployments/probe/pod/probe-pod/container/main/UAT/probe-ns';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => errors.push('goto: ' + e.message));
  await page.waitForTimeout(4000);

  console.log('FINAL URL:', page.url());
  const result = await page.evaluate(() => {
    const pick = el => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        cls: (el.className || '').toString().slice(0, 50),
        inline: el.getAttribute('style'),
        bg: cs.backgroundColor, color: cs.color,
        rect: (({ width, height }) => ({ width: Math.round(width), height: Math.round(height) }))(el.getBoundingClientRect()),
      };
    };
    const cb = document.querySelector('.card-block');
    // 注入模拟日志正文，验证文字颜色
    const ct = document.querySelector('.card-text');
    if (ct) {
      ct.innerHTML = Array.from({ length: 12 }, (_, i) =>
        `[2026-10-14 18:00:1${i}.650][]http-nio-8080-exec-7[][INFO][c.c.l.s.l.DynamicLogLevelWriter][29][write] => 接收到POST请求[/acc/vcc-query/record-config/query], 查询参数... 第${i + 1}行`).join('<br>');
    }
    return {
      cardBlock: pick(cb),
      cardText: pick(document.querySelector('.card-text')),
      mainContainer: pick(document.querySelector('clr-main-container')),
      text: cb ? cb.innerText.slice(0, 120) : '(no card-block)',
    };
  });
  console.log(JSON.stringify(result, null, 2));
  const shot = path.join(os.tmpdir(), 'probe-logging.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log('screenshot:', shot);
  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})();
