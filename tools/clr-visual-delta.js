/**
 * clr-visual-delta.js —— 量化两版 Clarity（@clr/ui）之间的「视觉变更面」
 * -------------------------------------------------------------------------------------------------
 * 用途：每次跳 Clarity 之前，先量出「从 A 版到 B 版，样式到底变了多少、变在哪」，
 *       而不是凭印象或按文档猜工作面（本项目已多次被证伪）。
 *
 * 做法：把两份 CSS 各自解析成
 *   (a) 自定义属性表 token -> 最后一次定义的值
 *   (b) 选择器 -> 属性 -> 值的表（只保留「外观」属性，与 gen-clarity16-compat.js 同一口径）
 * 然后报：
 *   - 规则/选择器总数，token 定义总数
 *   - token 定义：新增 / 删除 / 改值（各给样例）
 *   - 同名选择器 + 同名外观属性但解析值不同 → 「需要兼容层覆盖的声明」数（各给样例）
 *
 * 用法：node tools/clr-visual-delta.js <A.css> <B.css> [--json]
 * 注意：包自带的 clr-ui.css 是用「它构建时的 @cds/core」编译的，跨大版本对照会有
 *       @cds/core 版本漂移混入。做「是否要写兼容层」的决策时，应当用
 *       gen-clarity16-compat.js 的方式（同一份 styles.scss 对两版 clr/ui 源码各编一次），
 *       本脚本用于快速摸清变更规模与分布。
 */
'use strict';

const fs = require('fs');

// 与 gen-clarity16-compat.js 保持同一「外观属性」口径（刻意不含布局属性）
const VISUAL_PROPS = new Set([
  'color', 'background-color', 'background-image', 'background-position', 'background-repeat',
  'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'box-shadow', 'text-shadow', 'opacity', 'outline', 'outline-color',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'text-transform', 'text-decoration', 'fill', 'stroke', 'visibility',
]);

function stripComments(css) {
  // 必须剥注释：Clarity 源里有「注释紧跟规则」的写法，不剥会把注释尾巴并进选择器
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** 解析 CSS 为 { tokens:Map, rules:Map<selector, Map<prop,value>> } */
function parse(css) {
  css = stripComments(css);
  const tokens = new Map();
  const rules = new Map();

  // 先把所有声明块抽出（含 @media 内部的，扁平化处理即可——我们只关心「同名选择器同名属性」）
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const selRaw = m[1].trim();
    const body = m[2];
    // 跳过 at-rule 的头部（如 @media screen and (...) 也会被上面的正则的 [^{}]+ 捕获）
    if (selRaw.startsWith('@')) {
      // 形如 "@media (...) " 后面紧跟的 {} 里其实是嵌套规则，这里已被扁平化处理，
      // 真正的媒体查询体不在此捕获（因为 [^{}]* 不允许嵌套花括号）
      continue;
    }
    const decls = body.split(';');
    for (const d of decls) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const prop = d.slice(0, i).trim().toLowerCase();
      const val = d.slice(i + 1).trim().replace(/\s+/g, ' ');
      if (!prop) continue;
      if (prop.startsWith('--')) {
        tokens.set(prop, val); // 后定义覆盖前定义（与浏览器层叠一致，粗略等价）
        continue;
      }
      if (!VISUAL_PROPS.has(prop)) continue;
      // 选择器按顶层逗号拆成单条（v17 常把 v16 的单选择器并进列表，不拆会整片漏）
      for (const one of splitTopLevelComma(selRaw)) {
        if (!rules.has(one)) rules.set(one, new Map());
        rules.get(one).set(prop, val);
      }
    }
  }
  return { tokens, rules };
}

/** 按顶层逗号拆选择器（不动括号内的逗号，如 :is(a,b) / [x=","]） */
function splitTopLevelComma(sel) {
  const out = [];
  let depth = 0, quote = null, cur = '';
  for (const ch of sel) {
    if (quote) { if (ch === quote) quote = null; cur += ch; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function diff(av, bv, label) {
  const added = [], removed = [], changed = [];
  for (const [k, v] of bv) {
    if (!av.has(k)) added.push([k, v]);
    else if (av.get(k) !== v) changed.push([k, av.get(k), v]);
  }
  for (const [k, v] of av) if (!bv.has(k)) removed.push([k, v]);
  return { label, added, removed, changed };
}

function main() {
  const [aPath, bPath] = process.argv.slice(2);
  if (!aPath || !bPath) {
    console.error('用法: node tools/clr-visual-delta.js <A.css> <B.css> [--json]');
    process.exit(2);
  }
  const asJson = process.argv.includes('--json');
  const A = parse(fs.readFileSync(aPath, 'utf8'));
  const B = parse(fs.readFileSync(bPath, 'utf8'));

  const tok = diff(A.tokens, B.tokens);
  const SAMPLE = 8;

  // 规则层：同名选择器 + 同名外观属性，值不同
  const ruleChanges = [];
  let commonSelectors = 0;
  for (const [sel, bProps] of B.rules) {
    const aProps = A.rules.get(sel);
    if (!aProps) continue;
    commonSelectors++;
    for (const [prop, bVal] of bProps) {
      const aVal = aProps.get(prop);
      if (aVal !== undefined && aVal !== bVal) ruleChanges.push([sel, prop, aVal, bVal]);
    }
  }

  // 拆出「等价改写」（只是括号/空白重排，如 calc(-0.5 * (1rem / X)) → calc(-0.5 * 1rem / X)）
  // 与「真实改值」。v17→v18 有一批纯属这种噪音，不拆会把变更面估大。
  const norm = s => s.replace(/\s+/g, '').replace(/[()]/g, '');
  const equivalent = ruleChanges.filter(([, , a, b]) => norm(a) === norm(b));
  const realChanges = ruleChanges.filter(([, , a, b]) => norm(a) !== norm(b));

  const summary = {
    fileA: aPath, fileB: bPath,
    tokens: {
      totalA: A.tokens.size, totalB: B.tokens.size,
      added: tok.added.length, removed: tok.removed.length, changed: tok.changed.length,
    },
    selectors: { totalA: A.rules.size, totalB: B.rules.size, common: commonSelectors },
    visualDeclChanges: ruleChanges.length,
    visualDeclRealChanges: realChanges.length,
    visualDeclEquivalentRewrites: equivalent.length,
    samples: {
      tokenAdded: tok.added.slice(0, SAMPLE),
      tokenRemoved: tok.removed.slice(0, SAMPLE),
      tokenChanged: tok.changed.slice(0, SAMPLE),
      declChanged: realChanges.slice(0, SAMPLE),
    },
  };

  if (asJson) { console.log(JSON.stringify(summary, null, 2)); return; }
  console.log(`A = ${aPath}`);
  console.log(`B = ${bPath}`);
  console.log(`\n[自定义属性 token]  A ${A.tokens.size}  B ${B.tokens.size}`);
  console.log(`  新增 ${tok.added.length} / 删除 ${tok.removed.length} / 改值 ${tok.changed.length}`);
  console.log(`[选择器]           A ${A.rules.size}  B ${B.rules.size}（共有 ${commonSelectors}）`);
  console.log(`[同名选择器+同名外观属性但值不同] ${ruleChanges.length} 条  ← 兼容层要覆盖的规模`);
  console.log(`  其中「等价改写」(仅括号/空白重排) ${equivalent.length} 条，真实改值 ${realChanges.length} 条`);
  const dump = (name, arr) => {
    if (!arr.length) return;
    console.log(`\n-- ${name}（前 ${SAMPLE}）--`);
    for (const x of arr.slice(0, SAMPLE)) console.log('   ' + JSON.stringify(x));
  };
  dump('token 新增', tok.added);
  dump('token 删除', tok.removed);
  dump('token 改值', tok.changed);
  dump('规则声明真实改值', realChanges);
}

main();
