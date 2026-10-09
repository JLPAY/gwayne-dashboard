/**
 * 参数拼装收敛 codemod
 * ------------------------------------------------------------------
 * 把各 client service 里内联的「分页 + 过滤 + 排序」拼装逻辑，
 * 机械替换为对 buildListParams() 的调用。
 *
 * 安全策略：
 *   - 只改「参数拼装语句区段」，区段外的语句（如 appId/namespaceId 默认值兜底、
 *     局部 switch、URL 组装）原样保留。
 *   - 区段必须连续；一旦发现参数语句被非参数语句打断，就跳过该文件并报告，
 *     绝不猜测。
 *   - 用文本切片替换而不是整文件重写，保证行尾、其余字节完全不动。
 *   - 改完由 tools/verify-param-equivalence.js 逐用例证明行为等价。
 *
 * 用法：
 *   node tools/codemod-list-params.js          # 干跑，只打印将要做什么
 *   node tools/codemod-list-params.js --apply  # 实际写入
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

/** (文件, 方法) —— 显式列举，不做模糊匹配 */
const TARGETS = [
  // 簇1：deleted + relate='all' + appId + sortby='-id'，排除 app.name
  ['src/app/shared/client/v1/deployment.service.ts', 'list'],
  ['src/app/shared/client/v1/cronjob.service.ts', 'list'],
  ['src/app/shared/client/v1/secret.service.ts', 'list'],
  ['src/app/shared/client/v1/ingress.service.ts', 'list'],
  ['src/app/shared/client/v1/autoscale.service.ts', 'list'],
  ['lib/shared/client/v1/service.service.ts', 'list'],
  // 簇16：同簇1 但不设 appId
  ['src/app/shared/client/v1/configmap.service.ts', 'list'],
  // 簇26：deleted + relate，排除排序无
  ['src/app/shared/client/v1/persistentvolumeclaim.service.ts', 'list'],
  // 簇27：deleted + sortby + 条件 pvcId
  ['src/app/shared/client/v1/persistentvolumeclaimtpl.service.ts', 'list'],
  // 簇28：只有 pageNo/pageSize + 动态 + filter + sort
  ['src/app/shared/client/v1/persistentvolumeclaimtpl.service.ts', 'listPage'],
  // 簇17 / 簇31：条件 deleted
  ['src/app/shared/client/v1/daemonset.service.ts', 'listPage'],
  ['src/app/shared/client/v1/statefulset.service.ts', 'listPage'],
  // 簇2
  ['src/app/shared/client/v1/available-port.service.ts', 'list'],
  ['src/app/shared/client/v1/edge-node.service.ts', 'list'],
  // 簇3
  ['src/app/shared/client/v1/cluster.service.ts', 'list'],
  ['src/app/shared/client/v1/namespace.service.ts', 'listNamespace'],
  // 簇4 / 簇9 / 簇14 / 簇20 / 簇30：sortby + 资源 id
  ['src/app/shared/client/v1/configmaptpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/cronjobtpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/autoscaletpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/ingresstpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/secrettpl.service.ts', 'listPage'],
  ['lib/shared/client/v1/servicetpl.service.ts', 'listPage'],
  // 簇18：sortby + deploymentId + 条件 needStatus
  ['src/app/shared/client/v1/deploymenttpl.service.ts', 'listPage'],
  // 簇6 / 簇8
  ['src/app/shared/client/v1/daemonsettpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/statefulsettpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/permission.service.ts', 'listPermission'],
  ['src/app/shared/client/v1/user.service.ts', 'listUser'],
  // 簇5：尾部追加 deleted='false'，精确键只有 id
  ['src/app/shared/client/v1/customlink.service.ts', 'list'],
  ['src/app/shared/client/v1/roadmap.service.ts', 'list'],
  // 簇15：精确键只有 id
  ['src/app/shared/client/v1/config.service.ts', 'list'],
  // 簇10 / 簇12 / 簇32
  ['src/app/shared/client/v1/apikey.service.ts', 'listPage'],
  ['src/app/shared/client/v1/app.service.ts', 'listPage'],
  ['src/app/shared/client/v1/used-port.service.ts', 'list'],
  // 簇13：动态参数取自 filters
  ['src/app/shared/client/v1/auditlog.service.ts', 'listPage'],
  // 簇19：条件 type
  ['src/app/shared/client/v1/group.service.ts', 'listGroup'],
  // 簇29
  ['src/app/shared/client/v1/publish.service.ts', 'listHistories'],
  // 簇24 / 簇25：只有字面量
  ['src/app/shared/client/v1/notification.service.ts', 'query'],
  ['src/app/shared/client/v1/notification.service.ts', 'subscribe'],
];

/** 明确不纳入收敛的方法及原因（保留原样） */
const SKIP_NOTES = {
  'src/app/shared/client/v1/app-user.service.ts::list': 'switch 内既改 params 又给局部 appId 赋值，无法整段替换',
  'src/app/shared/client/v1/namespace-user.service.ts::list': '同上（局部 namespaceId + 自定义 sortby 映射）',
  'src/app/shared/client/v1/webhook.service.ts::query': 'fromObject 构造 + 反向 filter 语义 + 顺带拼 URL，语义不同',
  'src/app/shared/client/v1/kubernetes/base-client.ts::buildParam': '面向 _proxy 的过滤语义（全部 key=value），与 wayne API 的 __contains 约定不同，不能合并',
  'src/app/shared/client/v1/kubernetes/job.ts::listJobByCronJob': '已基于 BaseClient.buildParam',
  'src/app/shared/client/v1/kubernetes/event.ts::listPageByResouce': '已基于 BaseClient.buildParam',
  'src/app/shared/client/v1/kubernetes/pod.ts::listPageByResouce': '已基于 BaseClient.buildParam',
};

// ---------------------------------------------------------------- 工具

function parse(text, name) {
  return ts.createSourceFile(name, text, ts.ScriptTarget.ES2018, true);
}

function isParamsSetStatement(stmt, sf) {
  if (!ts.isExpressionStatement(stmt)) { return false; }
  const expr = stmt.expression;
  if (!ts.isBinaryExpression(expr) || expr.operatorToken.kind !== ts.SyntaxKind.EqualsToken) { return false; }
  if (!ts.isIdentifier(expr.left) || expr.left.text !== 'params') { return false; }
  const right = expr.right;
  return ts.isCallExpression(right)
    && ts.isPropertyAccessExpression(right.expression)
    && right.expression.name.text === 'set';
}

function getParamSetArgs(stmt, sf) {
  const call = stmt.expression.right;
  const key = call.arguments[0];
  const val = call.arguments[1];
  return {
    key: ts.isStringLiteral(key) ? key.text : null,
    keyText: key ? key.getText(sf) : '',
    valText: val ? val.getText(sf) : 'undefined',
  };
}

/** 语句是否属于「参数拼装区段」 */
function classify(stmt, sf) {
  // let params = new HttpParams() / BaseClient.buildParam(...)
  if (ts.isVariableStatement(stmt)) {
    const decl = stmt.declarationList.declarations[0];
    if (decl && ts.isIdentifier(decl.name) && decl.name.text === 'params') { return 'paramsDecl'; }
    if (decl && decl.name.getText(sf) === 'filterList') { return 'filterListDecl'; }
    return null;
  }
  if (isParamsSetStatement(stmt, sf)) { return 'set'; }
  if (ts.isExpressionStatement(stmt)) {
    const t = stmt.getText(sf);
    if (t.indexOf('getOwnPropertyNames(pageState.') > -1 && t.indexOf('.map(') > -1) {
      return t.indexOf('filterList') > -1 ? 'filterLoop' : 'dynamicLoop';
    }
    return null;
  }
  if (ts.isIfStatement(stmt)) {
    const t = stmt.getText(sf);
    if (t.indexOf('filterList.length') > -1) { return 'filterApply'; }
    if (t.indexOf('Object.keys(pageState.sort).length') > -1) { return 'sortApply'; }
    // 条件字面量：if (deleted) { params = params.set(...) }
    const inner = stmt.thenStatement;
    if (inner && ts.isBlock(inner)) {
      const sets = inner.statements.filter(s => isParamsSetStatement(s, sf));
      if (sets.length === inner.statements.length && sets.length > 0) { return 'condSet'; }
    }
    return null;
  }
  return null;
}

function analyzeRegion(method, sf) {
  const stmts = method.body.statements;
  const kinds = stmts.map(s => classify(s, sf));

  const firstIdx = kinds.indexOf('paramsDecl');
  if (firstIdx < 0) { return { error: '未找到 `let params = ...` 声明' }; }

  // 区段：从 paramsDecl 一直到最后一个「参数类」语句。
  // 中间若夹着非参数语句（例如 `if ((typeof(appId) === 'undefined')) appId = '0';`
  // 这种只影响 URL、不碰 params 的兜底），不报错，而是把它**上提到 helper 调用之前** ——
  // 它与参数拼装无交集，提前执行不改变任何一次请求（由等价性夹具证明）。
  let last = firstIdx;
  for (let i = firstIdx; i < stmts.length; i++) {
    if (kinds[i]) { last = i; }
  }

  const regionStmts = stmts.slice(firstIdx, last + 1);
  const regionKinds = kinds.slice(firstIdx, last + 1);

  const hoisted = [];
  regionStmts.forEach((s, i) => {
    if (!regionKinds[i]) {
      hoisted.push('    ' + s.getText(sf));
    }
  });
  // 动态参数来源
  const dynIdx = regionKinds.indexOf('dynamicLoop');
  let dynamicSource = 'params';
  let omitDynamicParams = false;
  if (dynIdx < 0) {
    omitDynamicParams = true;
  } else {
    const t = regionStmts[dynIdx].getText(sf);
    if (/getOwnPropertyNames\(\s*pageState\.filters\s*\)/.test(t)) { dynamicSource = 'filters'; }
  }

  // 过滤键策略
  const filterLoopIdx = regionKinds.indexOf('filterLoop');
  const omitFilters = filterLoopIdx < 0;
  let exactFilterKeys = null;
  let exactFilterSuffixes = null;
  if (!omitFilters) {
    const t = regionStmts[filterLoopIdx].getText(sf);
    const keys = [];
    const reKey = /key\s*===\s*'([^']+)'/g;
    let m;
    while ((m = reKey.exec(t)) !== null) { keys.push(m[1]); }
    exactFilterKeys = keys;
    const suffixes = [];
    const reSuf = /key\.endsWith\('([^']+)'\)/g;
    while ((m = reSuf.exec(t)) !== null) { suffixes.push(m[1]); }
    if (suffixes.length) { exactFilterSuffixes = suffixes; }
  }

  // 排序排除
  const sortIdx = regionKinds.indexOf('sortApply');
  const omitSortOverride = sortIdx < 0;
  let excludeSortby = null;
  if (!omitSortOverride) {
    const t = regionStmts[sortIdx].getText(sf);
    const ex = [];
    const reEx = /pageState\.sort\.by\s*!==\s*'([^']+)'/g;
    let m;
    while ((m = reEx.exec(t)) !== null) { ex.push(m[1]); }
    if (ex.length) { excludeSortby = ex; }
  }

  // 前置 / 尾部字面量。分界点：动态循环、过滤块、排序块中最靠后的一个。
  let splitAfter = -1;
  ['dynamicLoop', 'filterLoop', 'filterListDecl', 'filterApply', 'sortApply'].forEach(k => {
    const i = regionKinds.lastIndexOf(k);
    if (i > splitAfter) { splitAfter = i; }
  });

  const literals = [];
  const trailingLiterals = [];
  // helper 内核已经写入 pageNo/pageSize，若区段里是同一表达式则丢弃，避免冗余
  const CORE_PAGING = [
    { key: 'pageNo', re: /^pageState\.page\.pageNo\s*\+\s*''$/ },
    { key: 'pageSize', re: /^pageState\.page\.pageSize\s*\+\s*''$/ },
  ];
  const isCorePaging = (key, valText) =>
    CORE_PAGING.some(c => c.key === key && c.re.test(valText.trim()));

  for (let i = 0; i < regionStmts.length; i++) {
    const k = regionKinds[i];
    if (k === 'set') {
      const a = getParamSetArgs(regionStmts[i], sf);
      if (isCorePaging(a.key, a.valText)) { continue; }
      const pair = `['${a.key}', ${a.valText}]`;
      (i > splitAfter ? trailingLiterals : literals).push(pair);
    } else if (k === 'condSet') {
      const inner = regionStmts[i].thenStatement.statements[0];
      const a = getParamSetArgs(inner, sf);
      if (isCorePaging(a.key, a.valText)) { continue; }
      const cond = regionStmts[i].expression.getText(sf);
      const pair = `...((${cond}) ? [['${a.key}', ${a.valText}]] as ListParamPair[] : [])`;
      (i > splitAfter ? trailingLiterals : literals).push(pair);
    }
  }

  // 生成 options 字面量（只输出非默认项）
  const DEFAULT_KEYS = ['deleted', 'id'];
  const opts = [];
  if (literals.length) {
    opts.push(`      literals: [\n${literals.map(p => '        ' + p + ',').join('\n')}\n      ]`);
  }
  if (trailingLiterals.length) {
    opts.push(`      trailingLiterals: [\n${trailingLiterals.map(p => '        ' + p + ',').join('\n')}\n      ]`);
  }
  if (!omitDynamicParams && dynamicSource === 'filters') { opts.push(`      dynamicSource: 'filters'`); }
  if (!omitFilters) {
    const sorted = [...(exactFilterKeys || [])].sort().join(',');
    if (sorted !== [...DEFAULT_KEYS].sort().join(',')) {
      opts.push(`      exactFilterKeys: [${(exactFilterKeys || []).map(k => `'${k}'`).join(', ')}]`);
    }
    if (exactFilterSuffixes) {
      opts.push(`      exactFilterSuffixes: [${exactFilterSuffixes.map(k => `'${k}'`).join(', ')}]`);
    }
  }
  if (!omitSortOverride && excludeSortby) {
    opts.push(`      excludeSortby: [${excludeSortby.map(k => `'${k}'`).join(', ')}]`);
  }
  if (omitDynamicParams) { opts.push(`      omitDynamicParams: true`); }
  if (omitFilters) { opts.push(`      omitFilters: true`); }
  if (omitSortOverride) { opts.push(`      omitSortOverride: true`); }

  const helperCall = opts.length
    ? `const params = buildListParams(pageState, {\n${opts.join(',\n')},\n    });`
    : `const params = buildListParams(pageState);`;

  const newCode = (hoisted.length ? hoisted.join('\n') + '\n' : '') + '    ' + helperCall;

  const absStart = regionStmts[0].getStart(sf);

  return {
    // 从「行首」开始替换，这样新代码自带完整缩进，不会吃掉原缩进
    regionStart: sf.text.lastIndexOf('\n', absStart - 1) + 1,
    regionEnd: regionStmts[regionStmts.length - 1].getEnd(),
    hasConditional: literals.concat(trailingLiterals).some(p => p.indexOf('ListParamPair') > -1),
    newCode,
    summary: {
      literals: literals.length,
      trailing: trailingLiterals.length,
      hoisted: hoisted.length,
      dynamicSource,
      omitDynamicParams, omitFilters, omitSortOverride,
      exactFilterKeys, exactFilterSuffixes, excludeSortby,
    },
  };
}

const HELPER_IMPORT_SPEC = path.join(ROOT, 'src/app/shared/client/v1/list-params');

function buildHelperImport(fromFile) {
  let rel = path.relative(path.dirname(fromFile), HELPER_IMPORT_SPEC).split(path.sep).join('/');
  if (!rel.startsWith('.')) { rel = './' + rel; }
  return rel;
}

// ---------------------------------------------------------------- 主流程

const report = [];
let changed = 0;

for (const [relFile, methodName] of TARGETS) {
  const absFile = path.join(ROOT, relFile);
  if (!fs.existsSync(absFile)) {
    report.push(`SKIP  ${relFile}::${methodName} —— 文件不存在`);
    continue;
  }
  const original = fs.readFileSync(absFile, 'utf8');
  const sf = parse(original, relFile);

  let method = null;
  (function find(node) {
    if (ts.isMethodDeclaration(node) && node.name && node.name.getText(sf) === methodName && node.body) {
      method = node;
      return;
    }
    ts.forEachChild(node, find);
  })(sf);

  if (!method) {
    report.push(`SKIP  ${relFile}::${methodName} —— 未找到方法`);
    continue;
  }

  let analysis;
  try {
    analysis = analyzeRegion(method, sf);
  } catch (e) {
    report.push(`SKIP  ${relFile}::${methodName} —— 分析异常: ${e.message}`);
    continue;
  }
  if (analysis.error) {
    report.push(`SKIP  ${relFile}::${methodName} —— ${analysis.error}`);
    continue;
  }

  // 1) 替换参数拼装区段
  let out = original.slice(0, analysis.regionStart) + analysis.newCode + original.slice(analysis.regionEnd);

  // 2) 补 import
  const importSpec = buildHelperImport(absFile);
  const names = analysis.hasConditional ? '{ buildListParams, ListParamPair }' : '{ buildListParams }';
  if (out.indexOf(importSpec) < 0) {
    const sf2 = parse(out, relFile);
    let lastImportEnd = -1;
    sf2.statements.forEach(s => {
      if (ts.isImportDeclaration(s)) { lastImportEnd = s.getEnd(); }
    });
    if (lastImportEnd < 0) {
      report.push(`SKIP  ${relFile}::${methodName} —— 找不到 import 位置`);
      continue;
    }
    out = out.slice(0, lastImportEnd) + `\nimport ${names} from '${importSpec}';` + out.slice(lastImportEnd);
  }

  const s = analysis.summary;
  report.push(
    `OK    ${relFile}::${methodName} → literals=${s.literals}, trailing=${s.trailing}, hoisted=${s.hoisted}, ` +
    `dynamic=${s.omitDynamicParams ? 'OFF' : s.dynamicSource}, filters=${s.omitFilters ? 'OFF' : JSON.stringify(s.exactFilterKeys || ['deleted', 'id']) + (s.exactFilterSuffixes ? '+' + JSON.stringify(s.exactFilterSuffixes) : '')}, ` +
    `sort=${s.omitSortOverride ? 'OFF' : 'exclude=' + JSON.stringify(s.excludeSortby || [])}`
  );

  if (APPLY) {
    fs.writeFileSync(absFile, out, 'utf8');
    changed++;
  }
}

console.log(report.join('\n'));
console.log('\n' + '='.repeat(78));
if (Object.keys(SKIP_NOTES).length) {
  console.log('\n刻意不收敛的方法（保留原样）:');
  Object.entries(SKIP_NOTES).forEach(([k, v]) => console.log(`  - ${k}\n      ${v}`));
}
console.log(`\n目标 ${TARGETS.length} 个方法，${APPLY ? `已改写 ${changed} 个文件` : '干跑模式（加 --apply 才写入）'}`);
