/**
 * 本机环境补丁：让 Angular 12+ 的 esbuild 探测走「原生」而不是「WASM」
 * ------------------------------------------------------------------
 * 背景（本机实测，非项目问题）：
 *   本环境的 `child_process.spawnSync` **对任何可执行文件都返回 EBUSY**
 *   （托管 Node 22.22.2 与系统 Node 24.14.0 表现一致；异步 `child_process.spawn` 正常）。
 *   Angular 12 起，生产构建的 JS 优化由 `@angular-devkit/build-angular` 的
 *   `JavaScriptOptimizerPlugin` + piscina 工作线程池完成，其入口会调用
 *   `EsbuildExecutor.hasNativeSupport()` —— 该方法**用 spawnSync 拉起 esbuild-check.js**，
 *   于是本机恒判定「原生不可用」，被迫回退 `esbuild-wasm`。
 *   而 esbuild-wasm 的临时文件处理在本机也不通：
 *      Optimization error [main.js]: Error: remove <TEMP>\esbuild-<hash>: No such file or directory
 *   → 生产构建无法完成。
 *
 * 已排除的假设（都做过对照实验）：
 *   - 不是 NODE_OPTIONS 里那个 shim：加/不加 shim，spawnSync 同样 EBUSY，WASM 同样报错。
 *   - 不是原生 esbuild 装坏了：直接 require('esbuild') 后 transform/formatMessages 均正常。
 *   - 不能靠 --require 预加载脚本修：NODE_OPTIONS 的 --require **不作用于 worker 线程**，
 *     而 piscina 的工作线程会各自再探测一次，补主进程无效。
 *
 * 本补丁做的事：只把 `hasNativeSupport()` 的**方法体**换成直接 require 探测。
 *   语义等价（`esbuild-check.js` 本身也只是 `require('esbuild')`），且**不触及任何业务代码**。
 *
 * 实现说明（v13 起改为稳健定位）：
 *   上游 v12 的写法是裸 `child_process_1.spawnSync(...)`，v13 变成
 *   `try { (0, child_process_1.spawnSync)(...) } catch { return false; }` ——
 *   缩进与调用形态都变了，按字符串精确匹配会在每次大版本跳时失效（实测 v13 就匹配失败）。
 *   故改为：定位 `static hasNativeSupport()` 后**做花括号配对**取出方法体，整段替换。
 *   替换前会校验方法体里确实含 `spawnSync`，否则拒绝写入（避免配错位置）。
 *
 * 注意：node_modules 不入库，**每次 `npm install` 后需要重新执行本脚本**。
 *   —— 但 v14.2.x 起上游已自行把探测改成 `require('esbuild')`，本脚本会检测到并
 *      优雅跳过（exit 0）。因此它现在等价于一个「环境自检 + 历史版本兜底」的工具。
 * 用法：
 *   node tools/patch-esbuild-native-check.js            # 应用补丁（幂等；上游已修则跳过）
 *   node tools/patch-esbuild-native-check.js --revert   # 还原（依赖 .unpatched 备份）
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 不同版本可能挪窝，按顺序找第一个存在的。
const CANDIDATES = [
  'node_modules/@angular-devkit/build-angular/src/webpack/plugins/esbuild-executor.js',
];

const MARKER = '[local patch: spawn-sync-ebusy]';
// 注意签名形态随版本变过：v12/v13 是 `static hasNativeSupport()`，
// v14 起加了 `async`（`static async hasNativeSupport()`）。故用正则，别用确切字符串。
const SIGNATURE = 'static [async] hasNativeSupport()';
const SIGNATURE_RE = /\bstatic\s+(?:async\s+)?hasNativeSupport\s*\(\s*\)/;

function resolveTarget() {
  for (const rel of CANDIDATES) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) {
      return abs;
    }
  }
  return null;
}

/**
 * 在 src 中定位 `static [async] hasNativeSupport()` 的方法体，返回 { open, close, indent }。
 * open/close 分别是 `{` 与配对 `}` 的下标。
 */
function findMethodBody(src) {
  const m = SIGNATURE_RE.exec(src);
  if (!m) {
    return null;
  }
  const at = m.index;
  const open = src.indexOf('{', at);
  if (open < 0) {
    return null;
  }
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        // 取该方法签名所在行的缩进 + 4 作为方法体缩进
        const lineStart = src.lastIndexOf('\n', at) + 1;
        const lineIndent = src.slice(lineStart, at).match(/^[ \t]*/)[0];
        return { open, close: i, indent: lineIndent + '    ' };
      }
    }
  }
  return null;
}

const target = resolveTarget();
if (!target) {
  console.error('找不到目标文件（是否还没 npm install？）。已尝试:');
  CANDIDATES.forEach((c) => console.error('  ' + c));
  process.exit(2);
}
const rel = path.relative(ROOT, target);
const backup = target + '.unpatched';

const revert = process.argv.includes('--revert');
const src = fs.readFileSync(target, 'utf8');
const patched = src.includes(MARKER);
const eol = src.includes('\r\n') ? '\r\n' : '\n';

if (revert) {
  if (!src.includes(MARKER)) {
    console.log('未发现补丁标记，无需还原: ' + rel);
    process.exit(0);
  }
  if (!fs.existsSync(backup)) {
    console.error('发现补丁标记但没有 .unpatched 备份，无法精确还原。');
    console.error('请重新 npm install 覆盖该文件，或手工恢复 hasNativeSupport() 方法体。');
    process.exit(3);
  }
  fs.writeFileSync(target, fs.readFileSync(backup, 'utf8'));
  fs.unlinkSync(backup);
  console.log('已从备份还原: ' + rel);
  process.exit(0);
}

if (patched) {
  console.log('补丁已存在，跳过（幂等）: ' + rel);
  process.exit(0);
}

const body = findMethodBody(src);
if (!body) {
  console.error('未能在 ' + rel + ' 中定位 ' + SIGNATURE + '() 的方法体，拒绝写入（上游结构可能已变）。');
  process.exit(3);
}

const originalBody = src.slice(body.open + 1, body.close);

// v14.2.x 起上游自行修掉了这个坑：hasNativeSupport() 不再 spawnSync，
// 而是直接 `require('esbuild')` + formatMessages 探测（与本补丁语义完全相同）。
// 此时无需（也不应）打补丁 —— 优雅跳过，避免每跳流程硬失败。
if (!originalBody.includes('spawnSync')) {
  if (/require\(\s*['"]esbuild['"]\s*\)/.test(originalBody)) {
    console.log('上游已自行改为 require(\'esbuild\') 探测，本补丁不再需要: ' + rel);
    console.log('（v14.2.x 起 hasNativeSupport() 已不含 spawnSync，跳过即正确行为）');
    process.exit(0);
  }
  console.error('定位到的方法体里既没有 spawnSync 也没有 require(\'esbuild\')，位置可疑，拒绝写入。方法体片段:\n' + originalBody.slice(0, 400));
  process.exit(3);
}

const newBody = [
  '',
  body.indent + '// ' + MARKER + ' 本机 spawnSync 全量 EBUSY，改为直接 require 探测原生 esbuild。',
  body.indent + "require('esbuild');",
  body.indent + 'return true;',
  body.indent.slice(0, -4),
].join(eol);

const out = src.slice(0, body.open + 1) + newBody + src.slice(body.close);
if (!out.includes(MARKER)) {
  console.error('替换后未包含补丁标记，拒绝写入。');
  process.exit(3);
}

// 首次打补丁时留一份原文备份，供 --revert 使用
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, src);
}

fs.writeFileSync(target, out);
console.log('已应用补丁: ' + rel);
console.log("  hasNativeSupport() 方法体改为直接 require('esbuild') 探测（跳过 spawnSync）。");
console.log('  原文已备份为: ' + path.relative(ROOT, backup) + '（供 --revert 使用）');
