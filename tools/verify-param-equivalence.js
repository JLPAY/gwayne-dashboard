/**
 * 参数拼装「行为等价」验证夹具
 * ------------------------------------------------------------------
 * 目的：证明把 N 份重复的参数拼装逻辑收敛成统一 helper 之后，
 *       产生的 query string 与重构前**逐字节一致**。
 *
 * 做法（不靠人眼比对、不靠转录）：
 *   1. 从 git 指定的 ref（默认 HEAD）机械提取每个方法的原始方法体，
 *      把结尾的 `return this.http...` 替换为 `return params;`，
 *      用 new Function 还原成可执行函数 —— 零转录误差。
 *   2. 从工作区提取重构后的同名方法体（它内部调用 buildListParams），
 *      同样还原，并把新 helper 注入其作用域。
 *   3. 用同一批 PageState 组合分别求值，比较 HttpParams.toString()。
 *
 * 任何一例不一致都会以文件名 + 入参 + 两侧结果打印出来，并以非零码退出。
 *
 * 用法：
 *   node tools/verify-param-equivalence.js [gitRef]
 *   默认 gitRef = HEAD（即重构前的原始实现）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Angular 13 起 @angular/* 只发 ESM（UMD 被移除，exports 全指向 fesm2015/*.mjs），
// 而 Node 22 的 require(ESM) 会真的把 ESM 链拉起来，途中 @angular/core 的
// `import ... from 'rxjs/operators'` 是目录导入 → ESM 解析器报 ERR_UNSUPPORTED_DIR_IMPORT。
// 注册一个只做「目录补 index.js」的解析钩子即可，不影响其它解析行为。
const { register } = require('node:module');
const { pathToFileURL } = require('node:url');
register(pathToFileURL(path.join(__dirname, 'esm-dir-import-loader.mjs')).href);

// Angular 12 起发布的包是「部分编译（partial compilation）」格式，运行时遇到
// ɵɵngDeclareFactory 会去 global.ng.ɵcompilerFacade 找 JIT 编译器；
// 该 facade 由 @angular/compiler 在加载时注册（compiler.mjs 末尾 ng.ɵcompilerFacade = ...）。
// 故必须先加载它，否则 require('@angular/common/http') 当场抛
// "needs to be compiled using the JIT compiler, but '@angular/compiler' is not available"。
// 这一步只影响 DI 元数据的生成方式，不改变 HttpParams.toString() 的行为（比对对象不受影响）。
require('@angular/compiler');

const { HttpParams } = require('@angular/common/http');

const ROOT = path.resolve(__dirname, '..');
// 重构前源码快照目录。用 `git archive HEAD src lib | tar -x -C contract/legacy` 生成。
// 不用 execFileSync('git') 是刻意的：Windows 下 Node spawn git 会抛 EBUSY。
const LEGACY_DIR = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'contract/legacy');

// ---------------------------------------------------------------- 小工具

function readLegacy(relPath) {
  const p = path.join(LEGACY_DIR, relPath);
  return fs.readFileSync(p, 'utf8');
}

/** 极简 TS 加载器：够用即止，只支持相对导入 + 指定桩模块 */
const moduleCache = new Map();
function loadTs(absFile, stubs) {
  if (moduleCache.has(absFile)) { return moduleCache.get(absFile); }
  const src = fs.readFileSync(absFile, 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
      experimentalDecorators: true,
    },
  }).outputText;
  const mod = { exports: {} };
  moduleCache.set(absFile, mod.exports); // 先占位，容忍循环依赖
  const requireShim = spec => {
    const base = path.basename(spec);
    if (stubs && Object.prototype.hasOwnProperty.call(stubs, base)) { return stubs[base]; }
    if (spec === '@angular/common/http') { return { HttpParams }; }
    if (spec.startsWith('.')) {
      const resolved = resolveTs(path.resolve(path.dirname(absFile), spec));
      return loadTs(resolved, stubs);
    }
    throw new Error(`不支持的导入: ${spec} (来自 ${absFile})`);
  };
  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', js);
  fn(mod.exports, requireShim, mod, absFile, path.dirname(absFile));
  moduleCache.set(absFile, mod.exports);
  return mod.exports;
}

function resolveTs(p) {
  const candidates = [p, p + '.ts', path.join(p, 'index.ts')];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) { return c; }
  }
  throw new Error('无法解析模块: ' + p);
}

function parse(text, name) {
  return ts.createSourceFile(name, text, ts.ScriptTarget.ES2018, true);
}

/** 找到指定类里的指定方法，返回 { bodyText, paramNames } */
function findMethod(sf, methodName) {
  let found = null;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name && node.name.getText(sf) === methodName && node.body) {
      found = {
        bodyText: node.body.getText(sf),
        paramNames: node.parameters.map(p => p.name.getText(sf)),
      };
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return found;
}

/**
 * 把方法体还原成可执行函数。
 * 关键处理：
 *   1. 结尾的 `return this.http...` 换成 `return params;`
 *      —— 这样函数返回的就是纯粹的 HttpParams，即要比较的对象。
 *   2. 方法体是 TypeScript（含 `Array<string>` 等标注），必须先向 JS 转译。
 */
function makeRunnable(bodyText, paramNames, extraScope) {
  let inner = bodyText.replace(/^\s*\{/, '').replace(/\}\s*$/, '');
  const cut = inner.lastIndexOf('return this.http');
  if (cut >= 0) {
    inner = inner.slice(0, cut) + '\nreturn params;';
  }
  const scopeNames = Object.keys(extraScope);
  const allParams = scopeNames.concat(paramNames);
  const tsSrc = `(function(${allParams.join(', ')}) {${inner}})`;
  const js = ts.transpileModule(tsSrc, {
    compilerOptions: { target: ts.ScriptTarget.ES2018, module: ts.ModuleKind.None },
    reportDiagnostics: false,
  }).outputText;
  const fn = new Function(`return ${js.trim()};`)();
  return (argValues) => fn(...scopeNames.map(k => extraScope[k]), ...paramNames.map(n => argValues[n]));
}

// ---------------------------------------------------------------- 测试数据

/** 按参数名给值的候选池；覆盖各个分支边界（undefined / '' / 正常值） */
const PARAM_POOLS = {
  deleted: [undefined, 'false', 'true'],
  appId: [undefined, '', '0', '7'],
  namespaceId: [undefined, '', '0', '3'],
  resourceId: [undefined, '', '0', '5'],
  serviceId: [undefined, 0, 5],
  cId: [undefined, 0, 4],
  listType: ['app', 'user'],
  resouceType: ['deployment'],
  name: ['pod-a'],
  id: [undefined, 0, 9],
};
const DEFAULT_POOL = ['x'];

const PAGE_POOL = [
  { pageNo: 1, pageSize: 10 },
  { pageNo: 3, pageSize: 20 },
];
const SORT_POOL = [
  {},
  { by: 'name', reverse: false },
  { by: 'name', reverse: true },
  { by: 'id', reverse: false },
  { by: 'app.name', reverse: true },
  { by: 'user.name', reverse: true },
  { by: 'created_at', reverse: true },
];
const FILTERS_POOL = [
  {},
  { name: 'web' },
  { id: '12' },
  { deleted: 'false' },
  { name: 'x', id: '3', deleted: 'true' },
  { 'name__exact': 'exactval' },
];
const PARAMS_POOL = [
  {},
  { deleted: false },
  { isOnline: true },
  { relate: 'all' },
  { name: 'a', empty: '' },
];

function* cartesian(pools) {
  const idx = new Array(pools.length).fill(0);
  const total = pools.reduce((a, p) => a * p.length, 1);
  for (let n = 0; n < total; n++) {
    let rest = n;
    const combo = [];
    for (let i = pools.length - 1; i >= 0; i--) {
      combo[i] = pools[i][rest % pools[i].length];
      rest = Math.floor(rest / pools[i].length);
    }
    yield combo;
  }
}

/** 构造 PageState 字面量对象（避免依赖 ClrDatagridStateInterface） */
function makePageState(page, sort, filters, params) {
  return { page: { pageNo: page.pageNo, pageSize: page.pageSize }, sort: {...sort}, filters: {...filters}, params: {...params} };
}

function scenarioIterator(poolParamNames) {
  const pools = poolParamNames.map(n => (PARAM_POOLS[n] !== undefined ? PARAM_POOLS[n] : DEFAULT_POOL));
  const baseGrid = cartesian([PAGE_POOL, SORT_POOL, FILTERS_POOL, PARAMS_POOL]);
  const baseList = [...baseGrid];
  // 方法自带参数组合（pageState 已在调用方剥离，不参与取值）
  const argCombos = [...cartesian(pools.length ? pools : [['<none>']])];
  const out = [];
  for (const combo of argCombos) {
    const argVals = {};
    poolParamNames.forEach((n, i) => { argVals[n] = combo[i]; });
    for (const [page, sort, filters, params] of baseList) {
      out.push({ argVals, pageState: makePageState(page, sort, filters, params) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- 目标清单

/** 待验证的 (文件, 方法) 清单 —— 与重构范围一致 */
const TARGETS = [
  ['src/app/shared/client/v1/deployment.service.ts', 'list'],
  ['src/app/shared/client/v1/configmap.service.ts', 'list'],
  ['src/app/shared/client/v1/cronjob.service.ts', 'list'],
  ['src/app/shared/client/v1/secret.service.ts', 'list'],
  ['src/app/shared/client/v1/ingress.service.ts', 'list'],
  ['src/app/shared/client/v1/autoscale.service.ts', 'list'],
  ['lib/shared/client/v1/service.service.ts', 'list'],
  ['src/app/shared/client/v1/available-port.service.ts', 'list'],
  ['src/app/shared/client/v1/edge-node.service.ts', 'list'],
  ['src/app/shared/client/v1/cluster.service.ts', 'list'],
  ['src/app/shared/client/v1/namespace.service.ts', 'listNamespace'],
  ['src/app/shared/client/v1/configmaptpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/cronjobtpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/daemonsettpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/statefulsettpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/customlink.service.ts', 'list'],
  ['src/app/shared/client/v1/roadmap.service.ts', 'list'],
  ['src/app/shared/client/v1/permission.service.ts', 'listPermission'],
  ['src/app/shared/client/v1/user.service.ts', 'listUser'],
  ['src/app/shared/client/v1/app.service.ts', 'listPage'],
  ['src/app/shared/client/v1/auditlog.service.ts', 'listPage'],
  ['src/app/shared/client/v1/autoscaletpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/config.service.ts', 'list'],
  ['src/app/shared/client/v1/apikey.service.ts', 'listPage'],
  ['src/app/shared/client/v1/app-user.service.ts', 'list'],
  ['lib/shared/client/v1/servicetpl.service.ts', 'listPage'],
  ['src/app/shared/client/v1/persistentvolumeclaim.service.ts', 'list'],
  ['src/app/shared/client/v1/daemonset.service.ts', 'listPage'],
  ['src/app/shared/client/v1/statefulset.service.ts', 'listPage'],
];

// ---------------------------------------------------------------- 主流程

/** 桩模块：utils 会 import 这些，但本夹具只用到 isNotEmpty */
const UTILS_STUBS = {
  'shared.const': {},
  'kubepod': {},
};

function loadProjectHelper() {
  const helperPath = path.join(ROOT, 'src/app/shared/client/v1/list-params.ts');
  if (!fs.existsSync(helperPath)) { return null; }
  const mod = loadTs(helperPath, UTILS_STUBS);
  return mod;
}

const helperMod = loadProjectHelper();
const helperFn = helperMod ? (helperMod.buildListParams || helperMod.default) : null;

if (!helperFn) {
  console.error('未找到 buildListParams —— 请先完成 helper 抽取（src/app/shared/client/v1/list-params.ts）');
  process.exit(2);
}

const utilsMod = loadTs(path.join(ROOT, 'src/app/shared/utils.ts'), UTILS_STUBS);
const isNotEmpty = utilsMod.isNotEmpty;

// isNotEmpty / isEmpty 也要注入两侧作用域，保持对称
const COMMON_SCOPE = () => ({ HttpParams, isNotEmpty, buildListParams: helperFn });

let cases = 0;
let mismatches = 0;
const failures = [];

for (const [relFile, methodName] of TARGETS) {
  const absFile = path.join(ROOT, relFile);
  if (!fs.existsSync(absFile)) {
    console.log(`跳过（不存在）: ${relFile}`);
    continue;
  }
  let legacyText;
  try {
    legacyText = readLegacy(relFile);
  } catch (e) {
    failures.push(`${relFile} —— 未找到重构前快照（${path.join(LEGACY_DIR, relFile)}）`);
    mismatches++;
    continue;
  }
  const legacyMethod = findMethod(parse(legacyText, relFile), methodName);
  const newMethod = findMethod(parse(fs.readFileSync(absFile, 'utf8'), relFile), methodName);

  if (!legacyMethod || !newMethod) {
    failures.push(`${relFile}::${methodName} —— 未能同时取到新旧方法体（legacy=${!!legacyMethod}, new=${!!newMethod}）`);
    mismatches++;
    continue;
  }

  const paramNames = legacyMethod.paramNames;
  // pageState 由夹具统一构造并注入，不参与参数取值池
  const poolParamNames = paramNames.filter(n => n !== 'pageState');
  const legacyRun = makeRunnable(legacyMethod.bodyText, paramNames, COMMON_SCOPE());
  const newRun = makeRunnable(newMethod.bodyText, paramNames, COMMON_SCOPE());

  let fileCases = 0;
  let fileMismatch = 0;

  for (const sc of scenarioIterator(poolParamNames)) {
    // 把 pageState 合并进调用实参
    const call = { ...sc.argVals, pageState: sc.pageState };
    let legacyOut, newOut, legacyErr, newErr;
    try {
      legacyOut = legacyRun(call).toString();
    } catch (e) { legacyErr = e.message; }
    try {
      newOut = newRun(call).toString();
    } catch (e) { newErr = e.message; }

    fileCases++;
    cases++;

    if (legacyErr || newErr || legacyOut !== newOut) {
      fileMismatch++;
      mismatches++;
      if (failures.length < 60) {
        failures.push(
          `${relFile}::${methodName}\n` +
          `    入参: ${JSON.stringify(sc.argVals)}\n` +
          `    pageState: ${JSON.stringify(sc.pageState)}\n` +
          `    旧: ${legacyErr ? 'THROW ' + legacyErr : legacyOut}\n` +
          `    新: ${newErr ? 'THROW ' + newErr : newOut}`
        );
      }
    }
  }

  const status = fileMismatch === 0 ? 'OK  ' : 'DIFF';
  console.log(`[${status}] ${relFile}::${methodName}  (${fileCases} 例, ${fileMismatch} 处不一致)`);
}

console.log('\n' + '='.repeat(78));
console.log(`对比基准目录: ${LEGACY_DIR}`);
console.log(`总用例: ${cases}，不一致: ${mismatches}`);

if (mismatches > 0) {
  console.log('\n不一致明细（最多展示 60 条）:\n');
  failures.forEach((f, i) => console.log(`${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log('全部一致：参数拼装行为与重构前逐字节相同。');
