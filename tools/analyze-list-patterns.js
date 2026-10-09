/**
 * 参数拼装逻辑聚类分析
 * ------------------------------------------------------------------
 * 扫描所有 client service，抽出「构造 HttpParams」的方法体，
 * 归一化后聚类，回答一个关键问题：
 *   这些重复实现到底有几种真实变体？能不能安全收敛成一个 helper？
 *
 * 归一化规则（只抹掉"无害差异"，保留所有会体现在请求上的差异）：
 *   - 去掉结尾的 `return this.http...`（URL 与资源名差异不参与比较）
 *   - 统一引号与空白
 *   - 变量名统一（appId / aid 之类）
 * 任何体现在 .set 调用、条件分支、取值逻辑上的差异都会被保留 -> 分成不同簇。
 *
 * 用法：node tools/analyze-list-patterns.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['src/app/shared/client', 'lib/shared/client'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

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

function normalize(bodyText) {
  let t = bodyText;
  // 砍掉结尾的 http 调用（URL/资源名属于 endpoint 契约，已在 contract-snapshot 里比对）
  t = t.replace(/return\s+this\.http[\s\S]*$/m, '');
  t = t.replace(/\r/g, '');
  t = t.replace(/"/g, "'");
  t = t.replace(/\s+/g, ' ');
  // 变量名归一：appId / aid / app 等
  t = t.replace(/\b(aid|appID|applicationId)\b/g, 'appId');
  t = t.replace(/typeof\s*\(\s*/g, 'typeof(');
  t = t.replace(/\s*\)\s*===\s*undefined/g, ') === undefined');
  return t.trim();
}

const clusters = new Map();
const files = [];
for (const d of SCAN_DIRS) { walk(path.join(ROOT, d), files); }
files.sort();

let scannedMethods = 0;

for (const f of files) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.ES2018, true);
  const relFile = rel(f);
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.body) {
      const name = node.name && node.name.getText(sf);
      const bodyText = node.body.getText(sf);
      const usesParams = /params\s*=\s*params\.set\(/.test(bodyText) || /new HttpParams\(\)/.test(bodyText);
      const usesPageState = /pageState/.test(bodyText);
      if (usesParams && usesPageState) {
        scannedMethods++;
        const sig = normalize(bodyText);
        if (!clusters.has(sig)) { clusters.set(sig, []); }
        clusters.get(sig).push(`${relFile}::${name}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

const sorted = [...clusters.entries()].sort((a, b) => b[1].length - a[1].length);

console.log(`扫描到「构造 HttpParams 且使用 pageState」的方法：${scannedMethods} 个`);
console.log(`归一化后聚类数：${sorted.length} 簇\n`);
console.log('='.repeat(78));

sorted.forEach(([sig, members], idx) => {
  console.log(`\n### 簇 ${idx + 1} —— ${members.length} 个方法`);
  console.log('成员:');
  members.slice(0, 12).forEach(m => console.log('   - ' + m));
  if (members.length > 12) { console.log(`   ... 另有 ${members.length - 12} 个`); }
  console.log('归一化实现:');
  console.log('   ' + sig.slice(0, 1200));
  console.log('-'.repeat(78));
});
