/**
 * diag-rxjs-operators.js —— 诊断：列出所有 `.map/.catch/.debounceTime/...` 调用的接收者类型，
 * 判定哪些是 rxjs-compat 打补丁的 Observable 操作符（需要改 pipe）、哪些是数组/Promise 原生方法。
 * 用类型检查器取真值，不靠正则猜测。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const NAMES = new Set(['map', 'catch', 'debounceTime', 'distinctUntilChanged', 'toPromise', 'finally', 'do', 'switchMap', 'mergeMap']);

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.tmp')) walk(p); }
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) files.push(p);
  }
})(path.join(ROOT, 'src'));
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.tmp')) walk(p); }
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) files.push(p);
  }
})(path.join(ROOT, 'lib'));

const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), ts.sys.readFile).config, ts.sys, ROOT);
const program = ts.createProgram(files, Object.assign({}, cfg.options, { noEmit: true }));
const checker = program.getTypeChecker();

const buckets = new Map();
const observableSites = [];
const anySites = [];
for (const f of files) {
  const sf = program.getSourceFile(f);
  if (!sf) continue;
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && NAMES.has(node.expression.name.text)) {
      const name = node.expression.name.text;
      const recv = node.expression.expression;
      const rt = checker.typeToString(checker.getTypeAtLocation(recv));
      const obs = !!checker.getPropertyOfType(checker.getTypeAtLocation(node), 'subscribe');
      const key = `${name} => ${rt}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
      if (obs) observableSites.push(`${path.relative(ROOT, f)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}  .${name}()  recv=${rt}`);
      if (rt === 'any') anySites.push(`${path.relative(ROOT, f)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}  .${name}()  recv=\`${recv.getText()}\``);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
console.log('=== 接收者类型分布 ===');
for (const [k, v] of Array.from(buckets).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k);
console.log('\n=== Observable 系调用点（需改 pipe）===');
console.log(observableSites.join('\n') || '(无)');
console.log('\n总计 Observable 操作符调用点:', observableSites.length);
console.log('\n=== 接收者类型为 any 的调用点（需人工确认是否数组）===');
console.log(anySites.join('\n') || '(无)');
