/**
 * 头部右侧下拉布局探针（pod 日志页 / pod 终端页共用头部结构）
 *
 * 用途：量测 `.header-actions` 内各下拉触发器的几何与 clr-icon(shape="caret down") 的计算样式，
 *       用于验证「箭头紧跟文字、垂直居中」（Clarity 13/16 会把该 icon 绝对定位到按钮右缘，
 *       而按钮 padding-right 为 1.8rem，表现为箭头飘开 + 偏低）。
 * 前置：dev server 跑在 127.0.0.1:4200（`npm start`）。
 * 运行：NODE_PATH=<workspace>/node_modules node tools/probe-header-layout.js
 * 输出：stdout 打印布局 JSON；截图落在系统临时目录（不污染仓库）。
 */
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const json = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  await page.route('**/currentuser*', r => r.fulfill(json({ data: { id: 1, name: 'admin', admin: true, namespaces: [{ id: 1, name: 'probe-ns' }] } })));
  await page.route('**/api/v1/configs/base*', r => r.fulfill(json({ data: { SYSTEM_NAME: 'Wayne' } })));
  await page.route('**/api/v1/clusters/UAT*', r => r.fulfill(json({ data: { name: 'UAT', metaData: '{"logSource":"uat"}' } })));
  await page.route('**/api/v1/kubernetes/apps/1/pods/**', r => r.fulfill(json({
    data: { list: [{ metadata: { name: 'probe-pod-name' }, spec: { containers: [{ name: 'main' }] } }] }
  })));
  await page.route('**/api/v1/kubernetes/apps/1/podlogs/**', r => r.fulfill(json({ data: 'log line' })));
  await page.route('**/api/**', r => r.fulfill(json({ data: {} })));

  await page.goto('http://127.0.0.1:4200/portal/logging/namespace/1/app/1/deployments/probe/pod/probe-pod-name/container/main/UAT/probe-ns', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const out = [];
    const actions = document.querySelector('.header .header-actions') || document.querySelector('.header-actions');
    if (!actions) return 'no header-actions';
    out.push({ actionsClass: actions.className, actionsStyle: getComputedStyle(actions).display + ' / ' + getComputedStyle(actions).justifyContent + ' / gap=' + getComputedStyle(actions).gap });
    for (const child of actions.children) {
      const cs = getComputedStyle(child);
      const r = child.getBoundingClientRect();
      const item = {
        tag: child.tagName.toLowerCase(), cls: (child.className || '').toString().slice(0, 40),
        text: (child.textContent || '').trim().slice(0, 40),
        display: cs.display, position: cs.position, width: Math.round(r.width), height: Math.round(r.height),
        padding: cs.padding, justifyContent: cs.justifyContent,
      };
      const icon = child.matches('clr-dropdown') ? child.querySelector('.dropdown-toggle clr-icon, .dropdown-toggle cds-icon') : child.querySelector('clr-icon,cds-icon');
      if (icon) {
        const ics = getComputedStyle(icon);
        const ir = icon.getBoundingClientRect();
        const tr = (child.querySelector('.nav-text, .dropdown-toggle') || child).getBoundingClientRect();
        item.icon = {
          shape: icon.getAttribute('shape'), tag: icon.tagName.toLowerCase(),
          display: ics.display, position: ics.position, w: Math.round(ir.width), h: Math.round(ir.height),
          margin: ics.margin, verticalAlign: ics.verticalAlign,
          rightEdgeToButton: Math.round(tr.right - ir.right),
        };
      }
      out.push(item);
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  const shot = path.join(os.tmpdir(), 'probe-header.png');
  await page.screenshot({ path: shot, clip: { x: 900, y: 0, width: 540, height: 48 } });
  console.log('screenshot:', shot);
  await browser.close();
})();
