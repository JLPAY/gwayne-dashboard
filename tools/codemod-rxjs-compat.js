/**
 * codemod-rxjs-compat.js —— 清除 rxjs-compat 深路径导入（Angular 9→10 准备）
 *
 * 处理三类 rxjs-compat 遗留：
 *   1. 副作用导入 `import 'rxjs/add/operator/x'` / `import 'rxjs/add/observable/x'` —— 删除；
 *   2. 深路径命名导入 `rxjs/Observable|Subscription|Subject|...` —— 模块名归一到 'rxjs' 并合并重复导入；
 *   3. 打在 Observable.prototype 上的补丁操作符调用 `.map(fn).catch(fn)` —— 改写成 `.pipe(map(fn), catchError(fn))`。
 *
 * 关键点：**必须用类型检查器判定接收者是不是 Observable**。
 *   裸正则会把 `Array.prototype.map` 和 `Promise.prototype.catch` 一起改写（本仓库实测
 *   .map( 有 104 处、.catch( 有 9 处，其中混着数组与 Promise），改写后会编译报错或行为改变。
 *
 * 判定方式：`checker.getPropertyOfType(getTypeAtLocation(call), 'subscribe')` 存在即视为 Observable 系。
 *   Array/Promise 类型没有 subscribe；EventEmitter（继承 Subject）有，且改写成 pipe 同样语义正确。
 *
 * 冲突处理：若某个操作符链的接收者表达式内部还有一个待改写的链（如 `wrap(obs.map(f)).debounceTime(1)`），
 *   两个改动范围会重叠。此时跳过外层改动，交由下一轮（重新解析已改写的文件）处理——因此本工具**多轮执行**，
 *   直到「本轮改动数 = 0」。
 *
 * 用法：
 *   node tools/codemod-rxjs-compat.js            # 实际改写
 *   node tools/codemod-rxjs-compat.js --dry-run  # 只报告不改写
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_PASSES = 6;

// 需要从 'rxjs/operators' 导入的操作符；键=旧补丁名，值=rxjs 6 的 pipeable 名
const PIPEABLE = {
  map: 'map',
  catch: 'catchError',
  debounceTime: 'debounceTime',
  distinctUntilChanged: 'distinctUntilChanged',
  tap: 'tap',
  filter: 'filter',
  switchMap: 'switchMap',
  mergeMap: 'mergeMap',
  concatMap: 'concatMap',
  take: 'take',
  takeUntil: 'takeUntil',
  finalize: 'finalize',
  retry: 'retry',
  share: 'share',
  startWith: 'startWith',
  delay: 'delay',
  do: 'tap',
  finally: 'finalize',
  throttleTime: 'throttleTime',
  sampleTime: 'sampleTime',
};

// 旧静态方法 → rxjs 6 顶层函数
const STATIC_MAP = {
  throw: 'throwError',
  of: 'of',
  from: 'from',
  fromPromise: 'from',
  fromEvent: 'fromEvent',
  combineLatest: 'combineLatest',
  forkJoin: 'forkJoin',
  merge: 'merge',
  concat: 'concat',
  zip: 'zip',
  race: 'race',
  timer: 'timer',
  interval: 'interval',
  defer: 'defer',
  empty: 'EMPTY',
  never: 'NEVER',
  range: 'range',
  bindCallback: 'bindCallback',
  bindNodeCallback: 'bindNodeCallback',
  onErrorResumeNext: 'onErrorResumeNext',
};

// 深路径 → 'rxjs'（这些在 rxjs 6 顶层都有同名导出）
const DEEP_TO_ROOT = new Set([
  'rxjs/Observable',
  'rxjs/Subscription',
  'rxjs/Subject',
  'rxjs/BehaviorSubject',
  'rxjs/ReplaySubject',
  'rxjs/AsyncSubject',
  'rxjs/Observer',
  'rxjs/Subscriber',
  'rxjs/Notification',
  'rxjs/ConnectableObservable',
  'rxjs/observable/ConnectableObservable',
]);

function loadSourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name.startsWith('.tmp')) continue;
        walk(p);
      } else if (ent.name.endsWith('.ts') && !ent.name.endsWith('.d.ts')) {
        out.push(p);
      }
    }
  };
  // 注意：项目有两棵源码树 —— src/ 与 lib/（lib 也会被编译，实测遗漏它会导致构建报错）
  walk(path.join(ROOT, 'src'));
  walk(path.join(ROOT, 'lib'));
  return out;
}

function createProgram(fileNames) {
  const configPath = path.join(ROOT, 'tsconfig.json');
  const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, ROOT);
  return ts.createProgram(fileNames, Object.assign({}, parsed.options, { noEmit: true }));
}

/** 该表达式是否为 Observable 系（含 Subject/EventEmitter） */
function isObservableLike(checker, node) {
  const t = checker.getTypeAtLocation(node);
  return !!checker.getPropertyOfType(t, 'subscribe');
}

/** 若是「补丁操作符调用」返回描述对象，否则 null */
function asOperatorCall(checker, node) {
  if (!ts.isCallExpression(node)) return null;
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee)) return null;
  const oldName = callee.name.text;
  if (!PIPEABLE[oldName]) return null;
  if (!isObservableLike(checker, node)) return null;
  return {
    node,
    oldName,
    newName: PIPEABLE[oldName],
    recv: callee.expression,
    argsText: node.arguments.map((a) => a.getText()).join(', '),
  };
}

/** 跳过括号，取真正的父节点 */
function skipParens(node) {
  let cur = node.parent;
  while (cur && ts.isParenthesizedExpression(cur)) cur = cur.parent;
  return cur;
}

/** 该操作符调用是否位于链顶（其父不是同链的另一个操作符调用） */
function isChainTop(checker, node) {
  const parent = skipParens(node);
  if (parent && ts.isPropertyAccessExpression(parent)) {
    const grand = parent.parent;
    if (grand && ts.isCallExpression(grand) && grand.expression === parent) {
      if (asOperatorCall(checker, grand)) return false;
    }
  }
  return true;
}

function collectFileEdits(checker, sf, stats) {
  const edits = [];
  const conflicts = [];

  const overlaps = (a) =>
    edits.some((e) => !(a.end <= e.start || a.start >= e.end));

  const push = (start, end, text, meta) => {
    const a = { start, end, text };
    if (overlaps(a)) {
      conflicts.push(Object.assign({ file: sf.fileName, start, end }, meta));
      return false;
    }
    edits.push(a);
    return true;
  };

  // ---------- 1) 操作符链 → pipe ----------
  const visit = (node) => {
    const op = asOperatorCall(checker, node);
    if (op && isChainTop(checker, node)) {
      // 沿链下探，收集全部补丁操作符（顺带解掉 `(expr)` 括号）
      const ops = [];
      let cur = op;
      let base = op.recv;
      for (;;) {
        ops.unshift(cur);
        let unwrapped = base;
        while (ts.isParenthesizedExpression(unwrapped)) unwrapped = unwrapped.expression;
        const inner = ts.isCallExpression(unwrapped) ? asOperatorCall(checker, unwrapped) : null;
        if (inner) {
          cur = inner;
          base = inner.recv;
          continue;
        }
        base = unwrapped;
        break;
      }
      const opsText = ops.map((o) => `${o.newName}(${o.argsText})`).join(', ');

      const baseIsPipe =
        ts.isCallExpression(base) &&
        ts.isPropertyAccessExpression(base.expression) &&
        base.expression.name.text === 'pipe' &&
        isObservableLike(checker, base);

      if (baseIsPipe) {
        // obs.pipe(a) -> obs.pipe(a, <newOps>)
        const pos = base.getEnd() - 1; // 指向 pipe( 的右括号
        if (sf.text[pos] !== ')') {
          conflicts.push({ file: sf.fileName, start: pos, end: pos, why: 'pipe 右括号定位失败' });
        } else if (push(pos, node.getEnd(), `, ${opsText})`, { why: 'pipe 追加' })) {
          stats.pipeAppend += ops.length;
        }
      } else {
        let baseText = base.getText();
        const wrap =
          ts.isBinaryExpression(base) ||
          ts.isConditionalExpression(base) ||
          ts.isArrowFunction(base) ||
          ts.isAwaitExpression(base) ||
          ts.isYieldExpression(base);
        if (wrap) baseText = `(${baseText})`;
        const newText = `${baseText}.pipe(${opsText})`;
        if (push(base.getStart(), node.getEnd(), newText, { why: '链改写' })) {
          stats.chainRewrites += ops.length;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // ---------- 2) Observable.<static> → 顶层函数 ----------
  const visitStatic = (node) => {
    if (ts.isPropertyAccessExpression(node)) {
      const obj = node.expression;
      const name = node.name.text;
      if (ts.isIdentifier(obj) && obj.text === 'Observable' && STATIC_MAP[name]) {
        // 确认这个 Observable 就是 rxjs 的
        const sym = checker.getSymbolAtLocation(obj);
        const decl = sym && sym.declarations && sym.declarations[0];
        const fromRxjs = decl && /node_modules[\\/]rxjs[\\/]/.test(decl.getSourceFile().fileName);
        if (fromRxjs) {
          if (push(node.getStart(), node.getEnd(), STATIC_MAP[name], { why: `Observable.${name}` })) {
            stats.staticRewrites += 1;
            stats.staticNames.add(STATIC_MAP[name]);
          }
        }
      }
    }
    ts.forEachChild(node, visitStatic);
  };
  visitStatic(sf);

  // ---------- 3) 导入语句 ----------
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const deletedStmts = new Set();
  const addImports = imports.filter((s) => (s.moduleSpecifier.text || '').startsWith('rxjs/add/'));
  for (const s of addImports) {
    let end = s.getEnd();
    if (sf.text[end] === '\r') end += 1;
    if (sf.text[end] === '\n') end += 1;
    push(s.getStart(), end, '', { why: '删除 rxjs/add 副作用导入' });
    deletedStmts.add(s);
  }
  stats.addImportsRemoved += addImports.length;

  // 深路径 → 'rxjs'：先确定「保留哪条、删除哪几条」，被删的语句不再单独改名（否则与删除范围重叠）
  const rootImports = imports.filter((s) => DEEP_TO_ROOT.has(s.moduleSpecifier.text) || s.moduleSpecifier.text === 'rxjs');
  const keepRoot = rootImports[0];
  const dropRoots = rootImports.slice(1);
  const dropped = new Set(dropRoots);
  for (const s of rootImports) {
    if (!dropped.has(s) && DEEP_TO_ROOT.has(s.moduleSpecifier.text)) {
      push(s.moduleSpecifier.getStart(), s.moduleSpecifier.getEnd(), `'rxjs'`, { why: s.moduleSpecifier.text });
      stats.deepPathRenamed += 1;
    }
  }

  // 合并重复的 'rxjs' 导入（把被删语句的名字并进保留语句）
  if (rootImports.length > 1) {
    const names = [];
    for (const s of rootImports) {
      if (s.importClause && s.importClause.namedBindings && ts.isNamedImports(s.importClause.namedBindings)) {
        for (const el of s.importClause.namedBindings.elements) {
          names.push(el.propertyName ? `${el.propertyName.text} as ${el.name.text}` : el.name.text);
        }
      }
      if (s.importClause && s.importClause.name) names.push(s.importClause.name.text);
    }
    // 按本地名去重（别名形式优先保留）
    const byLocal = new Map();
    for (const n of names) {
      const local = n.indexOf(' as ') >= 0 ? n.slice(n.indexOf(' as ') + 4) : n;
      if (!byLocal.has(local) || n.indexOf(' as ') >= 0) byLocal.set(local, n);
    }
    const uniq = Array.from(byLocal.values());
    if (keepRoot.importClause && keepRoot.importClause.namedBindings) {
      push(
        keepRoot.importClause.namedBindings.getStart(),
        keepRoot.importClause.namedBindings.getEnd(),
        `{ ${uniq.join(', ')} }`,
        { why: '合并 rxjs 导入' }
      );
      for (const s of dropRoots) {
        let end = s.getEnd();
        if (sf.text[end] === '\r') end += 1;
        if (sf.text[end] === '\n') end += 1;
        push(s.getStart(), end, '', { why: '删除重复 rxjs 导入' });
        deletedStmts.add(s);
      }
      stats.importsMerged += dropRoots.length;
    }
  }

  // 补齐 'rxjs/operators' 导入：从本轮改写文本中回收用到的操作符名
  const usedOps = new Set();
  for (const e of edits) {
    if (e.text && e.text.indexOf('.pipe(') >= 0) {
      const inner = e.text.slice(e.text.indexOf('.pipe(') + 6);
      for (const mm of inner.matchAll(/(\w+)\(/g)) {
        if (Object.values(PIPEABLE).includes(mm[1])) usedOps.add(mm[1]);
      }
    }
  }
  for (const n of stats.staticNames) {
    if (n !== 'EMPTY' && n !== 'NEVER') usedOps.add(n);
  }
  if (usedOps.size > 0) {
    const opImport = imports.find((s) => s.moduleSpecifier.text === 'rxjs/operators');
    if (opImport && opImport.importClause && opImport.importClause.namedBindings && ts.isNamedImports(opImport.importClause.namedBindings)) {
      const have = opImport.importClause.namedBindings.elements.map((e) => e.name.text);
      const all = Array.from(new Set(have.concat(Array.from(usedOps))));
      if (all.length !== have.length) {
        push(opImport.importClause.namedBindings.getStart(), opImport.importClause.namedBindings.getEnd(), `{ ${all.join(', ')} }`, { why: '合并 operators 导入' });
      }
    } else if (!opImport) {
      // 插入点选「最后一条不会被删除的导入语句」，否则会与删除范围重叠
      const surviving = imports.filter((s) => !deletedStmts.has(s));
      const lastImport = surviving[surviving.length - 1];
      if (lastImport) {
        push(lastImport.getEnd(), lastImport.getEnd(), `\nimport { ${Array.from(usedOps).join(', ')} } from 'rxjs/operators';`, { why: '新增 operators 导入' });
        stats.operatorImportsAdded += 1;
      }
    }
  }

  return { edits, conflicts };
}

function applyEdits(text, edits) {
  const sorted = edits.slice().sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

function main() {
  const files = loadSourceFiles();
  let changedTotal = 0;
  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const program = createProgram(files);
    const checker = program.getTypeChecker();
    let passChanged = 0;
    let passConflicts = 0;
    const stats = {
      chainRewrites: 0,
      pipeAppend: 0,
      staticRewrites: 0,
      addImportsRemoved: 0,
      deepPathRenamed: 0,
      importsMerged: 0,
      operatorImportsAdded: 0,
      parseFailures: 0,
      staticNames: new Set(),
    };
    const touched = [];
    const allConflicts = [];

    for (const f of files) {
      const raw = fs.readFileSync(f);
      const crlf = raw.includes(Buffer.from('\r\n'));
      // 关键：必须用**原始文本**（CRLF 原样）参与计算——TypeScript 的 SourceFile 偏移量基于原始字节，
      // 若先把 CRLF 折成 LF 再套用偏移量，每跨一行就会前移一个字符，编辑会落到别的代码上（实测把 import 吃坏过）。
      const text = raw.toString('utf8');
      const sf = program.getSourceFile(f);
      if (!sf) continue;
      const { edits, conflicts } = collectFileEdits(checker, sf, stats);
      passConflicts += conflicts.length;
      for (const c of conflicts) {
        allConflicts.push(`${path.relative(ROOT, c.file)}:${sf.getLineAndCharacterOfPosition(c.start).line + 1} ${c.why || ''}`);
      }
      if (edits.length === 0) continue;
      let next = applyEdits(text, edits);
      if (next === text) continue;
      // 写盘前语法自检：产出必须仍能被解析，否则拒绝写入
      const check = ts.createSourceFile(f, next, ts.ScriptTarget.Latest, true);
      if (check.parseDiagnostics && check.parseDiagnostics.length > 0) {
        const d = check.parseDiagnostics[0];
        const pos = d.start != null ? d.start : 0;
        const line = ts.getLineAndCharacterOfPosition(check, pos).line + 1;
        console.error(`  ✗ 语法自检失败，跳过：${path.relative(ROOT, f)}:${line} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
        stats.parseFailures += 1;
        continue;
      }
      if (crlf) next = next.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
      touched.push({ file: f, text: next });
      passChanged += edits.length;
    }

    console.log(
      `[pass ${pass}] 文件 ${touched.length} / 改动 ${passChanged} 处：` +
        `链改写 ${stats.chainRewrites}、pipe 追加 ${stats.pipeAppend}、` +
        `静态改写 ${stats.staticRewrites}、删 add 导入 ${stats.addImportsRemoved}、` +
        `深路径归一 ${stats.deepPathRenamed}、合并 rxjs 导入 ${stats.importsMerged}、` +
        `新增 operators 导入 ${stats.operatorImportsAdded}、冲突 ${passConflicts}` +
        (stats.parseFailures ? `、语法自检失败 ${stats.parseFailures}` : '')
    );

    if (!DRY_RUN) {
      for (const t of touched) {
        fs.writeFileSync(t.file, Buffer.from(t.text, 'utf8'));
      }
    }
    if (allConflicts.length && pass === 1) {
      console.log('  冲突明细（跳过、留待下一轮）：');
      for (const c of allConflicts.slice(0, 20)) console.log('    -', c);
    }
    changedTotal += passChanged;
    if (passChanged === 0) break;
  }
  console.log(`完成，共处理 ${changedTotal} 处改动${DRY_RUN ? '（dry-run，未写盘）' : ''}`);
}

main();
