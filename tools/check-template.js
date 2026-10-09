/**
 * UI 模板契约门禁
 * ------------------------------------------------------------------
 * 比对两份模板契约快照（迁移前基线 vs 当前），任何差异都意味着
 * 「UI 结构变了」——在 Angular / Clarity 升级过程中，这通常代表
 * Clarity 组件被改名、CSS 类被重命名、或指令 API 变了。
 *
 * 与 check-contract.js 互补：
 *   check-contract.js 管「对外接口」（路由 / HTTP / selector）
 *   check-template.js 管「UI 结构」（元素 / 属性 / 管道 / 组件 IO）
 *
 * 用法：
 *   node tools/check-template.js [基线快照] [当前快照]
 *   默认 contract/template-baseline.json 与 contract/template-snapshot.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.argv[2] || path.join(ROOT, 'contract/template-baseline.json');
const CURR = process.argv[3] || path.join(ROOT, 'contract/template-snapshot.json');

function load(p) {
  if (!fs.existsSync(p)) {
    console.error(`找不到快照文件: ${p}`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const base = load(BASE);
const curr = load(CURR);

let failed = false;

const diffSets = (a, b) => {
  const sa = new Set(a);
  const sb = new Set(b);
  return {
    removed: [...sa].filter(x => !sb.has(x)),
    added: [...sb].filter(x => !sa.has(x)),
  };
};

function report(label, name, d, limit) {
  if (!d.removed.length && !d.added.length) {
    console.log(`[一致] ${label} 完全一致`);
    return;
  }
  failed = true;
  console.log(`[差异] ${label}: 消失 ${d.removed.length} 项，新增 ${d.added.length} 项`);
  d.removed.slice(0, limit).forEach(k => console.log(`   - 消失: ${k}`));
  d.added.slice(0, limit).forEach(k => console.log(`   + 新增: ${k}`));
  if (d.removed.length > limit || d.added.length > limit) {
    console.log(`   …（${name} 差异过多，仅显示前 ${limit} 项）`);
  }
}

console.log(`基线: ${path.relative(ROOT, BASE)}`);
console.log(`现状: ${path.relative(ROOT, CURR)}\n`);

console.log('规模对比:');
console.log(`  组件          ${base.summary.componentCount} → ${curr.summary.componentCount}`);
console.log(`  有模板的组件  ${base.summary.withTemplateCount} → ${curr.summary.withTemplateCount}`);
console.log(`  不同元素名    ${base.summary.distinctTags} → ${curr.summary.distinctTags}`);
console.log(`  不同属性名    ${base.summary.distinctAttrs} → ${curr.summary.distinctAttrs}`);
console.log(`  不同管道      ${base.summary.distinctPipes} → ${curr.summary.distinctPipes}`);
console.log(`  不同 @Input   ${base.summary.distinctInputs} → ${curr.summary.distinctInputs}`);
console.log(`  不同 @Output  ${base.summary.distinctOutputs} → ${curr.summary.distinctOutputs}\n`);

report('全局元素名', 'allTags', diffSets(base.allTags, curr.allTags), 30);
report('全局属性名', 'allAttrs', diffSets(base.allAttrs, curr.allAttrs), 30);
report('全局管道', 'allPipes', diffSets(base.allPipes, curr.allPipes), 30);

// 逐组件比对：定位到具体文件，避免只有全局清单、无从下手
const byFile = list => new Map(list.map(c => [c.file, c]));
const bMap = byFile(base.components);
const cMap = byFile(curr.components);

const removedComps = [...bMap.keys()].filter(f => !cMap.has(f));
const addedComps = [...cMap.keys()].filter(f => !bMap.has(f));

if (removedComps.length || addedComps.length) {
  failed = true;
  console.log(`[差异] 组件集合变化: 消失 ${removedComps.length} 个，新增 ${addedComps.length} 个`);
  removedComps.slice(0, 20).forEach(f => console.log(`   - 消失: ${f}`));
  addedComps.slice(0, 20).forEach(f => console.log(`   + 新增: ${f}`));
} else {
  console.log(`[一致] 组件集合完全一致（${base.components.length} 个）`);
}

const perComponent = [];
for (const [file, b] of bMap) {
  const c = cMap.get(file);
  if (!c) { continue; }
  for (const key of ['tags', 'attrs', 'pipes', 'inputs', 'outputs']) {
    const d = diffSets(b[key], c[key]);
    if (d.removed.length || d.added.length) {
      perComponent.push({ file, key, d });
    }
  }
}

if (perComponent.length) {
  failed = true;
  console.log(`\n[差异] 有 ${perComponent.length} 处逐组件模板契约变化:`);
  for (const item of perComponent.slice(0, 25)) {
    console.log(`   - ${item.file} :: ${item.key}`);
    if (item.d.removed.length) { console.log(`       消失: ${item.d.removed.join(', ')}`); }
    if (item.d.added.length) { console.log(`       新增: ${item.d.added.join(', ')}`); }
  }
  if (perComponent.length > 25) {
    console.log(`   …（共 ${perComponent.length} 处，仅显示前 25 处）`);
  }
} else {
  console.log(`[一致] 所有组件的模板契约完全一致`);
}

console.log('\n' + '='.repeat(78));
if (failed) {
  console.log('结论：UI 模板契约发生变化 ✗（若为有意变更，请说明并更新基线）');
  process.exit(1);
}
console.log('结论：UI 模板契约完全兼容 ✓');
