/**
 * 接口契约快照工具
 * ------------------------------------------------------------------
 * 用 TypeScript Compiler API 静态抽取项目的「对外契约」，输出稳定的 JSON：
 *   1. routes     —— 路由 path → component/redirectTo
 *   2. endpoints  —— 每个 HTTP 调用点：方法 + URL 模板 + 查询参数字面量
 *   3. selectors  —— 组件 @Component({selector})
 *
 * 重构前后各跑一次，diff 必须为空，才能声称「完全兼容原有功能和接口」。
 * 只做静态解析，不编译、不运行、不依赖浏览器环境。
 *
 * 用法：
 *   node tools/contract-snapshot.js [输出文件] [扫描根目录]
 *   默认输出 contract/snapshot.json，默认扫描根为项目根。
 *   传入旧的源码树根（如 contract/legacy）即可用同一版工具生成可比对的基线。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] || path.join(PROJECT_ROOT, 'contract', 'snapshot.json');
// 扫描根：默认项目根；可指向旧源码树，使新旧两侧用同一版抽取器
const ROOT = process.argv[3] ? path.resolve(process.argv[3]) : PROJECT_ROOT;

// 扫描范围：业务源码。lib/ 是插件式独立目录，同样要纳入。
const SCAN_DIRS = ['src', 'lib'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.workbuddy', 'contract', 'tools']);
const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'request']);

function walk(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return acc;
  }
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

/** 相对项目根的 POSIX 风格路径，作为快照里的稳定 key */
function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function parse(file) {
  const text = fs.readFileSync(file, 'utf8');
  return ts.createSourceFile(file, text, ts.ScriptTarget.ES2018, /* setParentNodes */ true);
}

// ---------------------------------------------------------------- 工具函数

/**
 * 把表达式归一化成「URL 模板」字符串。
 * 模板插值、字符串拼接中的动态部分一律折叠成 {}，只保留静态骨架，
 * 这样变量的重命名不会造成契约漂移，而去掉/改动一段 URL 一定会被检出。
 */
function normalizeUrl(node) {
  if (!node) { return '<dynamic>'; }
  if (ts.isStringLiteral(node)) { return node.text; }
  if (ts.isNoSubstitutionTemplateLiteral(node)) { return node.text; }
  if (ts.isTemplateExpression(node)) {
    let out = node.head.text;
    for (const span of node.templateSpans) {
      out += '{}' + span.literal.text;
    }
    return out;
  }
  if (ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return normalizeUrl(node.left) + normalizeUrl(node.right);
  }
  if (ts.isIdentifier(node)) { return '{}'; }
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) { return '{}'; }
  if (ts.isConditionalExpression(node)) {
    return `<cond:${normalizeUrl(node.whenTrue)}|${normalizeUrl(node.whenFalse)}>`;
  }
  if (ts.isParenthesizedExpression(node)) { return normalizeUrl(node.expression); }
  if (ts.isCallExpression(node)) { return '<call>'; }
  return '{}';
}

/** 取表达式的「字面量摘要」，用于记录查询参数的固定取值 */
function literalOf(node) {
  if (!node) { return null; }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) { return node.text; }
  if (ts.isNumericLiteral(node)) { return node.text; }
  if (node.kind === ts.SyntaxKind.TrueKeyword) { return 'true'; }
  if (node.kind === ts.SyntaxKind.FalseKeyword) { return 'false'; }
  if (node.kind === ts.SyntaxKind.NullKeyword) { return 'null'; }
  if (ts.isTemplateExpression(node)) { return normalizeUrl(node); }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return normalizeUrl(node);
  }
  if (ts.isParenthesizedExpression(node)) { return literalOf(node.expression); }
  return null;
}

function propName(node) {
  if (!node) { return null; }
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) { return node.text; }
  return null;
}

/** 找到节点最近的祖先方法/函数名，作为调用点的作用域标识 */
function enclosingName(node) {
  let cur = node;
  while (cur) {
    if (ts.isMethodDeclaration(cur) || ts.isFunctionDeclaration(cur) || ts.isGetAccessor(cur)) {
      return propName(cur.name) || '<anonymous>';
    }
    if (ts.isPropertyAssignment(cur) || ts.isVariableDeclaration(cur)) {
      const n = propName(cur.name);
      if (n) { return n; }
    }
    if (ts.isConstructorDeclaration(cur)) { return 'constructor'; }
    cur = cur.parent;
  }
  return '<top>';
}

// ---------------------------------------------------------------- 抽取器

const result = { routes: [], endpoints: [], selectors: [] };

function extractRoutes(sf, file) {
  const relFile = rel(file);
  if (!/routing/i.test(relFile)) { return; }
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const props = {};
      for (const p of node.properties) {
        if (!ts.isPropertyAssignment(p)) { continue; }
        const name = propName(p.name);
        if (!name) { continue; }
        if (name === 'path' || name === 'redirectTo') {
          const v = literalOf(p.initializer);
          if (v !== null) { props[name] = v; }
        } else if (name === 'component' || name === 'loadChildren' || name === 'canActivate') {
          props[name] = p.initializer.getText(sf).replace(/\s+/g, ' ');
        }
      }
      if (props.path !== undefined && (props.component || props.redirectTo || props.loadChildren)) {
        result.routes.push({
          file: relFile,
          path: props.path,
          component: props.component || (props.loadChildren ? '<lazy>' : '<redirect>'),
          redirectTo: props.redirectTo || undefined,
          guards: props.canActivate || undefined,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

function extractSelectors(sf, file) {
  const relFile = rel(file);
  function visit(node) {
    if (ts.isDecorator(node)) {
      const expr = node.expression;
      if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)
          && (expr.expression.text === 'Component' || expr.expression.text === 'Directive')) {
        const arg = expr.arguments[0];
        if (arg && ts.isObjectLiteralExpression(arg)) {
          for (const p of arg.properties) {
            if (ts.isPropertyAssignment(p) && propName(p.name) === 'selector') {
              const sel = literalOf(p.initializer);
              if (sel) {
                result.selectors.push({ file: relFile, type: expr.expression.text, selector: sel });
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

/**
 * 抽取一个函数体内所有 HttpParams 的写入（.set/.append）与 options 里的字面量参数。
 * 按源码出现顺序记录，保证快照稳定可比。
 */
function collectParamWrites(bodyNode, sf) {
  const writes = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const m = node.expression.name.text;
      if ((m === 'set' || m === 'append') && node.arguments.length >= 1) {
        const key = literalOf(node.arguments[0]);
        const val = node.arguments.length >= 2 ? literalOf(node.arguments[1]) : null;
        if (key !== null) {
          writes.push({ key, value: val });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  if (bodyNode) { visit(bodyNode); }
  return writes;
}

/**
 * 展开 buildListParams(pageState, {...}) 的语义，得到「这条请求最终可能带上哪些查询参数」。
 *
 * 为什么需要：参数拼装收敛到 helper 之后，`.set` 调用不再出现在 service 方法体内，
 * 纯静态扫描会读不到参数，导致契约快照出现"假差异"。
 * 展开规则刻意与原始内联实现保持一致：
 *   分页键 → literals 的键 → filter（未省略时）→ sortby（未省略时）→ trailingLiterals 的键。
 * 动态透传循环（params.set(key, value)，key 非字面量）在原始实现里同样抽不出字面量键，
 * 因此这里也跳过，保证两侧口径一致。
 */
function expandBuildListParams(callNode) {
  // 无 options 的调用：等价于默认全量行为
  if (callNode.arguments.length < 2) {
    return ['pageNo', 'pageSize', 'filter', 'sortby'];
  }
  const opts = callNode.arguments[1];
  if (!ts.isObjectLiteralExpression(opts)) { return null; }

  const arrayKeys = (wantName) => {
    for (const p of opts.properties) {
      if (!ts.isPropertyAssignment(p) || propName(p.name) !== wantName || !ts.isArrayLiteralExpression(p.initializer)) { continue; }
      const keys = [];
      for (const el of p.initializer.elements) {
        // literals 元素形如 ['key', value]；条件展开形如 ...(cond ? [['k', v]] : [])
        if (ts.isArrayLiteralExpression(el) && el.elements.length >= 1) {
          const k = literalOf(el.elements[0]);
          if (k !== null) { keys.push(k); }
        } else if (ts.isSpreadElement(el)) {
          // 条件展开可能带 `as ListParamPair[]` 断言，需要剥掉再递归
          const collect = (n) => {
            if (!n) { return; }
            if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) {
              collect(ts.isAsExpression(n) ? n.expression : n.expression);
            } else if (ts.isArrayLiteralExpression(n)) {
              n.elements.forEach(e => {
                if (ts.isArrayLiteralExpression(e) && e.elements.length >= 1) {
                  const k = literalOf(e.elements[0]);
                  if (k !== null) { keys.push(k); }
                }
              });
            } else if (ts.isConditionalExpression(n)) {
              collect(n.whenTrue);
              collect(n.whenFalse);
            }
          };
          collect(el.expression);
        }
      }
      return keys;
    }
    return [];
  };

  const flagTrue = (wantName) => opts.properties.some(
    p => ts.isPropertyAssignment(p) && propName(p.name) === wantName
      && p.initializer.kind === ts.SyntaxKind.TrueKeyword);

  const keys = ['pageNo', 'pageSize'];
  arrayKeys('literals').forEach(k => keys.push(k));
  if (!flagTrue('omitFilters')) { keys.push('filter'); }
  if (!flagTrue('omitSortOverride')) { keys.push('sortby'); }
  arrayKeys('trailingLiterals').forEach(k => keys.push(k));
  return [...new Set(keys)];
}

function extractEndpoints(sf, file) {
  const relFile = rel(file);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const recv = node.expression.expression;
      const isHttp = (ts.isPropertyAccessExpression(recv) && recv.name.text === 'http')
        || (ts.isIdentifier(recv) && recv.text === 'http')
        || (ts.isPropertyAccessExpression(recv) && ts.isPropertyAccessExpression(recv.expression)
            && recv.expression.name.text === 'this' && recv.name.text === 'http');
      if (isHttp && HTTP_METHODS.has(method) && node.arguments.length >= 1) {
        const url = normalizeUrl(node.arguments[0]);
        const scope = enclosingName(node.parent);
        // 参数写入：优先看同一方法体内的 .set 调用
        let bodyNode = null;
        let cur = node.parent;
        while (cur) {
          if (ts.isMethodDeclaration(cur) || ts.isFunctionDeclaration(cur)
              || ts.isGetAccessor(cur) || ts.isConstructorDeclaration(cur)) {
            bodyNode = cur.body;
            break;
          }
          cur = cur.parent;
        }
        let paramKeys = [...new Set(collectParamWrites(bodyNode, sf).map(w => w.key))];
        // 若参数由统一 helper 构造，则展开其语义，保证与内联实现的抽取口径一致
        (function findHelper(n) {
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)
              && n.expression.text === 'buildListParams') {
            const expanded = expandBuildListParams(n);
            if (expanded) { paramKeys = expanded; }
          }
          ts.forEachChild(n, findHelper);
        })(bodyNode);
        result.endpoints.push({
          file: relFile,
          scope,
          httpMethod: method.toUpperCase(),
          url,
          paramKeys,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

// ---------------------------------------------------------------- 主流程

const files = [];
for (const d of SCAN_DIRS) { walk(path.join(ROOT, d), files); }
files.sort();

for (const f of files) {
  let sf;
  try {
    sf = parse(f);
  } catch (e) {
    console.error('解析失败:', rel(f), e.message);
    continue;
  }
  extractRoutes(sf, f);
  extractSelectors(sf, f);
  extractEndpoints(sf, f);
}

// 稳定排序，保证 diff 可读
const byStr = (a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1;
result.routes.sort(byStr);
result.selectors.sort(byStr);
result.endpoints.sort(byStr);

const summary = {
  scannedFiles: files.length,
  routeCount: result.routes.length,
  endpointCount: result.endpoints.length,
  selectorCount: result.selectors.length,
  // 去重后的唯一 URL 模板数量 —— 最能反映「后端接口面」有没有变
  uniqueUrls: [...new Set(result.endpoints.map(e => `${e.httpMethod} ${e.url}`))].length,
};

const payload = { summary, routes: result.routes, selectors: result.selectors, endpoints: result.endpoints };

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log('契约快照已生成:', path.relative(PROJECT_ROOT, OUT).split(path.sep).join('/'));
console.log(JSON.stringify(summary, null, 2));
