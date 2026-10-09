/**
 * 移除「空转 catch」codemod
 * ------------------------------------------------------------------
 * 形如 `.catch(error => throwError(error))` 的写法，语义上等价于什么都不做：
 * 它把错误原样重新抛出，既不转换、不降级、也不记录。
 * 在 rxjs 6 + rxjs-compat 下，这类 catch 对消费者完全不可观测，属于纯噪声
 * —— 而且它会让人误以为这里有错误处理。
 *
 * 严格限定：只删除「箭头函数参数被原样传给 throwError」这一种形态。
 * 任何其他 catch（记日志、转成默认值、Promise 的 .catch、this.handleError 等）
 * 一律保留并在报告里列出。
 *
 * 另外：删除后若文件内不再出现 throwError，顺带移除其 import。
 *
 * 用法：
 *   node tools/codemod-remove-noop-catch.js          # 干跑
 *   node tools/codemod-remove-noop-catch.js --apply  # 写入
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const SCAN_DIRS = ['src', 'lib'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'contract', 'tools', '.workbuddy']);

function walk(dir, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) { continue; }
      walk(full, acc);
    } else if (ent.isFile() && ent.name.endsWith('.ts') && !ent.name.endsWith('.spec.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

const rel = p => path.relative(ROOT, p).split(path.sep).join('/');

/** 判断是否「箭头参数原样 rethrow」 */
function isNoopCatch(call, sf) {
  if (!ts.isPropertyAccessExpression(call.expression)) { return null; }
  if (call.expression.name.text !== 'catch') { return null; }
  if (call.arguments.length !== 1) { return null; }
  const fn = call.arguments[0];
  if (!ts.isArrowFunction(fn) || fn.parameters.length !== 1) { return null; }
  const p = fn.parameters[0].name;
  if (!ts.isIdentifier(p)) { return null; }

  // 取箭头函数体里唯一的 return 表达式（简洁体或 block 体均可）
  let retExpr = null;
  if (ts.isCallExpression(fn.body)) {
    retExpr = fn.body;
  } else if (ts.isBlock(fn.body)) {
    const stmts = fn.body.statements.filter(s => !ts.isEmptyStatement(s));
    if (stmts.length !== 1 || !ts.isReturnStatement(stmts[0]) || !stmts[0].expression) { return null; }
    retExpr = stmts[0].expression;
  } else {
    return null;
  }
  if (!ts.isCallExpression(retExpr)) { return null; }
  // 允许 throwError(x) 与 Observable.throw(x) / ns.throwError(x)
  const callee = retExpr.expression;
  const name = ts.isIdentifier(callee) ? callee.text
    : (ts.isPropertyAccessExpression(callee) ? callee.name.text : null);
  if (name !== 'throwError' && name !== 'throw') { return null; }
  if (retExpr.arguments.length !== 1) { return null; }
  const arg = retExpr.arguments[0];
  if (!ts.isIdentifier(arg) || arg.text !== p.text) { return null; }
  // 参数若有类型标注为 Promise/void 之类不影响，但箭头返回类型不得声明
  if (fn.type) { return null; }

  return {
    // 从被调用对象的末尾删到整条调用的末尾，避免留下孤立的空白行
    start: call.expression.expression.getEnd(),
    end: call.getEnd(),
    param: p.text,
  };
}

let totalFiles = 0;
let totalRemoved = 0;
let importsRemoved = 0;
const skippedFiles = [];
const files = [];
for (const d of SCAN_DIRS) { walk(path.join(ROOT, d), files); }
files.sort();

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.indexOf('.catch(') < 0) { continue; }
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2018, true);

  const hits = [];
  (function visit(node) {
    if (ts.isCallExpression(node)) {
      const hit = isNoopCatch(node, sf);
      if (hit) { hits.push(hit); }
    }
    ts.forEachChild(node, visit);
  })(sf);

  if (!hits.length) {
    const otherCatches = (src.match(/\.catch\(/g) || []).length;
    if (otherCatches) { skippedFiles.push(`${rel(file)} —— ${otherCatches} 处 .catch 非空转形态，保留`); }
    continue;
  }

  // 从后往前删，位置不失效
  hits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const h of hits) { out = out.slice(0, h.start) + out.slice(h.end); }

  // 顺带清掉不再使用的 throwError import。
  // 注意：判断"是否还在用"必须先把 import 行本身排除掉，
  // 否则 import 行里的 throwError 会让判空永远为假（自己骗自己）。
  const withoutImports = out.replace(/^import[^\n]*$/gm, '');
  if (!/\bthrowError\b/.test(withoutImports)) {
    const before = out;
    out = out.replace(/^import\s*\{[^}]*\bthrowError\b[^}]*\}\s*from\s*'rxjs[^']*';\s*\r?\n/m, m => {
      // 若同一行还导入了别的符号，则只摘掉 throwError 这一项
      const named = m.match(/\{([^}]*)\}/)[1];
      const rest = named.split(',').map(s => s.trim()).filter(s => s && s !== 'throwError');
      if (!rest.length) { return ''; }
      return `import { ${rest.join(', ')} } from 'rxjs';\n`;
    });
    if (out !== before) { importsRemoved++; }
  }

  totalFiles++;
  totalRemoved += hits.length;

  if (APPLY) { fs.writeFileSync(file, out, 'utf8'); }
}

console.log(`扫描文件: ${files.length}`);
console.log(`命中空转 catch: ${totalRemoved} 处，分布在 ${totalFiles} 个文件`);
console.log(`顺带移除无用的 throwError import: ${importsRemoved} 处`);
if (skippedFiles.length) {
  console.log(`\n保留的非空转 catch（${skippedFiles.length} 个文件）:`);
  skippedFiles.slice(0, 30).forEach(s => console.log('  - ' + s));
  if (skippedFiles.length > 30) { console.log(`  …另有 ${skippedFiles.length - 30} 个`); }
}
console.log(`\n${APPLY ? '已写入' : '干跑模式（加 --apply 才写入）'}`);
