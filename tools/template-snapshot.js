/**
 * UI 模板契约快照工具
 * ------------------------------------------------------------------
 * contract-snapshot.js 覆盖的是「对外接口」（路由 / HTTP / selector），
 * 但 Angular + Clarity 大版本迁移最贵的是 UI：Clarity 每一代都会重命名
 * CSS 类、删除或改名组件、调整指令 API，而这些都不会体现在路由或 HTTP 调用上。
 *
 * 所以 UI 必须有自己的契约层。本工具静态抽取每个组件的模板契约：
 *   tags      —— 模板里出现的元素名（含 clr-* 组件与原生 HTML）
 *   attrs     —— 归一化后的属性名（含 *ngIf / [x] / (y) / #ref / [(ngModel)]）
 *   pipes     —— 模板里用到的管道名
 *   inputs    —— @Input() 属性名（组件的对外 API）
 *   outputs   —— @Output() 属性名
 *
 * 迁移前跑一次存基线，迁移后跑一次 diff。模板契约不变，才能声称
 * 「UI 结构未因框架升级而漂移」。
 *
 * 只做静态解析，不编译、不运行、不依赖浏览器环境。
 *
 * 用法：
 *   node tools/template-snapshot.js [输出文件] [扫描根目录]
 *   默认输出 contract/template-snapshot.json，默认扫描根为项目根。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] || path.join(PROJECT_ROOT, 'contract', 'template-snapshot.json');
const ROOT = process.argv[3] ? path.resolve(process.argv[3]) : PROJECT_ROOT;

const SCAN_DIRS = ['src', 'lib'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.workbuddy', 'contract', 'tools']);

// ---------------------------------------------------------------- 文件遍历

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

/** 相对扫描根的 POSIX 风格路径，作为快照里的稳定 key */
function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function readText(p) {
  let t = fs.readFileSync(p, 'utf8');
  if (t.charCodeAt(0) === 0xFEFF) { t = t.slice(1); }
  return t;
}

function parse(file) {
  return ts.createSourceFile(file, readText(file), ts.ScriptTarget.ES2018, true);
}

// ---------------------------------------------------------------- 模板扫描

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
// 开标签：<tag 属性区>   （闭合标签 </ 开头的不会命中，因为 < 后要求字母）
const OPEN_TAG_RE = /<([a-zA-Z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
// 管道：排除逻辑或 ||
const PIPE_RE = /(?<!\|)\|(?!\|)\s*([A-Za-z_$][\w$]*)/g;

/**
 * 从模板文本里抽 tags / attrs / pipes。
 * 属性名归一化策略：先把属性「值」抹掉，再按空白切分 —— 这样
 * [ngModel]="x" / (click)="f()" / *ngIf="cond" / #ref 都能稳定还原成名字。
 */
function scanTemplate(html) {
  const src = html.replace(HTML_COMMENT_RE, ' ');

  const tags = new Set();
  const attrs = new Set();

  OPEN_TAG_RE.lastIndex = 0;
  let m;
  while ((m = OPEN_TAG_RE.exec(src))) {
    tags.add(m[1].toLowerCase());
    const stripped = m[2]
      .replace(/=\s*"[^"]*"/g, '=')
      .replace(/=\s*'[^']*'/g, '=')
      .replace(/=\s*[^\s"'>]+/g, '=');
    for (const raw of stripped.split(/\s+/)) {
      if (!raw) { continue; }
      const name = raw.replace(/=+$/, '');
      if (!name || name === '/') { continue; }
      attrs.add(name);
    }
  }

  const pipes = new Set();
  PIPE_RE.lastIndex = 0;
  while ((m = PIPE_RE.exec(src))) { pipes.add(m[1]); }

  return { tags, attrs, pipes };
}

// ---------------------------------------------------------------- AST 工具

/**
 * 兼容读取节点上的装饰器。
 * TS 4.8 起 `Node.decorators` 属性已被移除（改用 ts.canHaveDecorators()/ts.getDecorators()），
 * 继续读旧属性会恒得 undefined —— 曾使本工具静默输出 0 个组件（假绿）。
 */
function decoratorsOf(node) {
  if (typeof ts.getDecorators === 'function') {
    return ts.getDecorators(node) || [];
  }
  return node.decorators || [];
}

function decoratorCall(node, name) {
  for (const d of decoratorsOf(node)) {
    const e = d.expression;
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === name) {
      return e;
    }
  }
  return null;
}

function nameOf(nameNode) {
  if (!nameNode) { return null; }
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode)) { return nameNode.text; }
  return null;
}

function stringLiteralOf(node) {
  if (!node) { return null; }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) { return node.text; }
  return null;
}

function objectOf(call) {
  const a = call.arguments && call.arguments[0];
  return a && ts.isObjectLiteralExpression(a) ? a : null;
}

function metadataProp(meta, key) {
  for (const p of meta.properties) {
    if (!ts.isPropertyAssignment(p)) { continue; }
    if (nameOf(p.name) === key) { return p.initializer; }
  }
  return null;
}

/** 取 @Component({ inputs: [...] }) 这类「字符串数组」元数据 */
function stringArrayFrom(meta, key) {
  const init = metadataProp(meta, key);
  if (!init || !ts.isArrayLiteralExpression(init)) { return []; }
  const out = [];
  for (const el of init.elements) {
    const s = stringLiteralOf(el);
    if (s) { out.push(s); }
  }
  return out;
}

/** @Input() / @Output() 装饰的成员名 */
function collectMemberIo(classDecl) {
  const inputs = new Set();
  const outputs = new Set();
  for (const member of classDecl.members) {
    const memberDecorators = decoratorsOf(member);
    if (!memberDecorators.length) { continue; }
    const name = nameOf(member.name);
    if (!name) { continue; }
    for (const d of memberDecorators) {
      const e = d.expression;
      if (!ts.isCallExpression(e) || !ts.isIdentifier(e.expression)) { continue; }
      if (e.expression.text === 'Input') { inputs.add(name); }
      if (e.expression.text === 'Output') { outputs.add(name); }
    }
  }
  return { inputs, outputs };
}

// ---------------------------------------------------------------- 主流程

const sorted = set => [...set].sort();

function main() {
  const files = [];
  for (const d of SCAN_DIRS) {
    walk(path.join(ROOT, d), files);
  }

  const components = [];
  const skipped = [];

  for (const file of files) {
    let sf;
    try {
      sf = parse(file);
    } catch (e) {
      skipped.push({ file: rel(file), reason: `解析失败: ${e.message}` });
      continue;
    }

    const classes = [];
    (function visit(node) {
      if (ts.isClassDeclaration(node)) { classes.push(node); }
      ts.forEachChild(node, visit);
    })(sf);

    for (const cls of classes) {
      const call = decoratorCall(cls, 'Component');
      if (!call) { continue; }

      const meta = objectOf(call);
      if (!meta) { continue; }

      const selector = stringLiteralOf(metadataProp(meta, 'selector')) || `<${nameOf(cls.name) || '?'}>`;

      // 模板来源：templateUrl 优先，其次内联 template
      let html = null;
      let templateFile = null;

      const templateUrl = stringLiteralOf(metadataProp(meta, 'templateUrl'));
      if (templateUrl) {
        const abs = path.resolve(path.dirname(file), templateUrl);
        if (fs.existsSync(abs)) {
          html = readText(abs);
          templateFile = rel(abs);
        } else {
          skipped.push({ file: rel(file), reason: `templateUrl 不存在: ${templateUrl}` });
        }
      } else {
        const inline = stringLiteralOf(metadataProp(meta, 'template'));
        if (inline !== null) { html = inline; }
      }

      const io = collectMemberIo(cls);
      // 元数据里声明的 inputs/outputs 也要算进对外 API
      for (const s of stringArrayFrom(meta, 'inputs')) { io.inputs.add(s.split(':')[0].trim()); }
      for (const s of stringArrayFrom(meta, 'outputs')) { io.outputs.add(s.split(':')[0].trim()); }

      const scan = html === null
        ? { tags: new Set(), attrs: new Set(), pipes: new Set() }
        : scanTemplate(html);

      components.push({
        file: rel(file),
        selector,
        templateFile,
        hasTemplate: html !== null,
        tags: sorted(scan.tags),
        attrs: sorted(scan.attrs),
        pipes: sorted(scan.pipes),
        inputs: sorted(io.inputs),
        outputs: sorted(io.outputs),
      });
    }
  }

  components.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

  const union = key => sorted(new Set(components.reduce((acc, c) => acc.concat(c[key]), [])));

  const summary = {
    componentCount: components.length,
    withTemplateCount: components.filter(c => c.hasTemplate).length,
    distinctTags: union('tags').length,
    distinctAttrs: union('attrs').length,
    distinctPipes: union('pipes').length,
    distinctInputs: union('inputs').length,
    distinctOutputs: union('outputs').length,
    skippedCount: skipped.length,
  };

  const payload = {
    summary,
    allTags: union('tags'),
    allAttrs: union('attrs'),
    allPipes: union('pipes'),
    components,
    skipped,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2).replace(/\r\n/g, '\n'), 'utf8');

  console.log('模板契约快照已生成:', rel(OUT));
  console.log(JSON.stringify(summary, null, 2));
  if (skipped.length) {
    console.log(`\n有 ${skipped.length} 处未能取到模板：`);
    skipped.slice(0, 10).forEach(s => console.log(`  - ${s.file}: ${s.reason}`));
  }
}

main();
