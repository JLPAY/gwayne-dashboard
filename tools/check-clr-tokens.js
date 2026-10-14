/**
 * check-clr-tokens.js —— Clarity CSS 自定义属性的「计算值」断言
 * ------------------------------------------------------------------
 * 为什么需要它：
 *   Clarity 从 v16 起引入 token 迁移（shim 把 `--clr-*` 映射到 `--cds-*`），
 *   而本项目在 `src/styles.scss` 的 `:root` 里**依赖「在 Clarity 导入之后重设」**
 *   来覆盖一批变量（表头底色、表格边框等）——见 styles.scss 末尾的注释块。
 *   静态产物只能证明「声明顺序正确」，不能证明浏览器里最后生效的就是我们想要的值：
 *   一旦 Clarity 换了选择器特异性、或引入 shim 改了映射，覆盖就会静默失效，
 *   表现为表格重新长回边框/表头变色（静态门禁与 smoke 都抓不到）。
 *   故用真实浏览器读 computed value 断言。
 *
 * 用法：node tools/check-clr-tokens.js [url]
 * 依赖：Playwright Chromium（同 smoke-runtime.js）
 * 判据：所有断言命中 → exit 0；任一不符 → exit 1 并打印实际值。
 */
'use strict';

const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://localhost:4200/';

// 期望值来自 src/styles.scss 末尾的 :root 覆盖块（改了那里就要同步这里）
const EXPECTED_VARS = {
  '--clr-thead-bgcolor': '#e8edf6',
  '--clr-table-border-color': 'transparent',
  '--clr-table-header-border-bottom-color': 'transparent',
  '--clr-table-footer-border-top-color': 'transparent',
  '--clr-tablerow-bordercolor': 'transparent',
};

// Clarity 自身的变量链仍完整（用于区分「我们覆盖成功」与「整条链都断了」）
const SANITY_VARS = ['--clr-color-neutral-50', '--clr-global-font-size'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  const actual = await page.evaluate((names) => {
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    for (const n of names) { out[n] = (cs.getPropertyValue(n) || '').trim(); }
    out.__bodyTheme = document.body.getAttribute('cds-theme');
    return out;
  }, [...Object.keys(EXPECTED_VARS), ...SANITY_VARS]);

  let failed = 0;
  console.log('== 项目覆盖的变量（期望命中） ==');
  for (const [name, want] of Object.entries(EXPECTED_VARS)) {
    const got = actual[name];
    // 浏览器可能把 hex 规整为 rgb()，故做宽松比较
    const ok = got === want || got === want.replace('#e8edf6', 'rgb(232, 237, 246)');
    if (!ok) { failed++; }
    console.log(`  ${ok ? '[OK  ]' : '[FAIL]'} ${name} = ${got}${ok ? '' : `  (期望 ${want})`}`);
  }

  console.log('== Clarity 变量链完整性（信息性） ==');
  for (const name of SANITY_VARS) {
    console.log(`  ${actual[name] ? '[OK  ]' : '[WARN]'} ${name} = ${actual[name] || '(空)'}`);
  }

  console.log('== body 主题属性（Clarity v16 要求 cds-theme） ==');
  console.log(`  ${actual.__bodyTheme ? '[OK  ]' : '[WARN]'} body[cds-theme] = ${actual.__bodyTheme || '(缺失)'}`);

  await browser.close();
  console.log(`\n结论：${failed === 0 ? '✓ 覆盖全部生效' : `✗ ${failed} 项覆盖失效`}`);
  process.exit(failed === 0 ? 0 : 1);
})();
