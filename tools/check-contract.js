/**
 * 接口契约门禁
 * ------------------------------------------------------------------
 * 比对两份契约快照（重构前基线 vs 当前），任何差异即视为「破坏了对外接口」。
 * 适合接进 CI：改完代码跑一次，绿灯才允许合并。
 *
 * 检查三类契约：
 *   routes    路由 path → component
 *   endpoints 方法 + URL 模板 + 查询参数键集合
 *   selectors 组件 selector
 *
 * 用法：
 *   node tools/check-contract.js [基线快照] [当前快照]
 *   默认 contract/baseline.json 与 contract/snapshot.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.argv[2] || path.join(ROOT, 'contract/baseline.json');
const CURR = process.argv[3] || path.join(ROOT, 'contract/snapshot.json');

function load(p) {
  if (!fs.existsSync(p)) {
    console.error(`找不到快照文件: ${p}`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const base = load(BASE);
const curr = load(CURR);

const keyOf = {
  routes: r => `${r.file}|${r.path}|${r.component}|${r.redirectTo || ''}|${r.guards || ''}`,
  selectors: s => `${s.file}|${s.type}|${s.selector}`,
  endpoints: e => `${e.file}|${e.scope}|${e.httpMethod}|${e.url}`,
};

function diffList(name) {
  const kb = new Set(base[name].map(keyOf[name]));
  const kc = new Set(curr[name].map(keyOf[name]));
  const removed = [...kb].filter(k => !kc.has(k));
  const added = [...kc].filter(k => !kb.has(k));
  return { removed, added };
}

/** 端点除了"有没有"之外，还要比对参数键集合 */
function diffEndpointParams() {
  const map = new Map(base.endpoints.map(e => [keyOf.endpoints(e), e]));
  const bad = [];
  for (const e of curr.endpoints) {
    const o = map.get(keyOf.endpoints(e));
    if (!o) { continue; }
    if (JSON.stringify(o.paramKeys) !== JSON.stringify(e.paramKeys)) {
      bad.push({ key: keyOf.endpoints(e), before: o.paramKeys, after: e.paramKeys });
    }
  }
  return bad;
}

let failed = false;

console.log(`基线: ${path.relative(ROOT, BASE)}`);
console.log(`现状: ${path.relative(ROOT, CURR)}\n`);

console.log('规模对比:');
console.log(`  路由      ${base.summary.routeCount} → ${curr.summary.routeCount}`);
console.log(`  端点      ${base.summary.endpointCount} → ${curr.summary.endpointCount}`);
console.log(`  唯一 URL  ${base.summary.uniqueUrls} → ${curr.summary.uniqueUrls}`);
console.log(`  selector  ${base.summary.selectorCount} → ${curr.summary.selectorCount}\n`);

for (const name of ['routes', 'selectors', 'endpoints']) {
  const { removed, added } = diffList(name);
  if (removed.length || added.length) {
    failed = true;
    console.log(`[差异] ${name}: 消失 ${removed.length} 项，新增 ${added.length} 项`);
    removed.slice(0, 20).forEach(k => console.log(`   - 消失: ${k}`));
    added.slice(0, 20).forEach(k => console.log(`   + 新增: ${k}`));
    if (removed.length > 20 || added.length > 20) { console.log('   …（差异过多，仅显示前 20 项）'); }
  } else {
    console.log(`[一致] ${name} 完全一致（${base[name].length} 项）`);
  }
}

const paramBad = diffEndpointParams();
if (paramBad.length) {
  failed = true;
  console.log(`\n[差异] 有 ${paramBad.length} 个端点的查询参数键集合发生变化:`);
  paramBad.slice(0, 20).forEach(d => {
    console.log(`   - ${d.key}`);
    console.log(`     旧: ${JSON.stringify(d.before)}`);
    console.log(`     新: ${JSON.stringify(d.after)}`);
  });
} else {
  console.log(`[一致] 所有可对齐端点的查询参数键集合完全一致`);
}

console.log('\n' + '='.repeat(78));
if (failed) {
  console.log('结论：对外接口契约发生变化 ✗（若为有意变更，请说明并更新基线）');
  process.exit(1);
}
console.log('结论：对外接口契约完全兼容 ✓');
