/**
 * Node ESM 解析钩子：把「目录导入」补全成 `/index.js`
 * ------------------------------------------------------------------
 * 为什么需要它（Angular 13 起）：
 *   Angular 13 **移除了 UMD 包**，`@angular/*` 的 package.json 里
 *   `main` 字段消失、`exports` 全量指向 `fesm2015/*.mjs`（纯 ESM），
 *   **没有任何 CJS 入口**。
 *   而 Node 22 支持 `require(ESM)`，于是 CJS 侧一句
 *     const { HttpParams } = require('@angular/common/http');
 *   会真的去加载 ESM 链：http.mjs → @angular/core/fesm2015/core.mjs，
 *   而 core.mjs 里有 `import { ... } from 'rxjs/operators'`。
 *   rxjs 6.x 是 CJS 包、没有 `exports` 映射，ESM 解析器遇到
 *   `rxjs/operators` 这种**目录**导入会直接抛：
 *     ERR_UNSUPPORTED_DIR_IMPORT: Directory import '.../node_modules/rxjs/operators'
 *     is not supported resolving ES modules imported from .../core.mjs
 *   （ESM 规定必须写全文件名，不做目录 → index.js 的补全）
 *
 * 本钩子做的事：只在 `ERR_UNSUPPORTED_DIR_IMPORT` 时重试一次，
 * 把 specifier 补成 `<spec>/index.js`。不改变其他任何解析行为。
 *
 * 用法（供 tools/verify-param-equivalence.js 内部 register，不需要命令行调用）：
 *   const { register } = require('node:module');
 *   register(pathToFileURL('tools/esm-dir-import-loader.mjs').href);
 */

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err && err.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      const retry = specifier.replace(/\/+$/, '') + '/index.js';
      return nextResolve(retry, context);
    }
    throw err;
  }
}
