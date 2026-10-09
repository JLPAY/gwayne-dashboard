/**
 * 行尾归一化
 * ------------------------------------------------------------------
 * 本仓库统一使用 CRLF。用脚本（fs.writeFileSync）改写文件时，
 * 拼接进去的字符串默认是 LF，会和原有 CRLF 混在一起 —— 于是 git diff 被行尾噪声淹没，
 * 真正的内容改动反而看不见。
 *
 * 这个脚本把「本次改动过的文件」统一回 CRLF。
 * 文件清单由外部传入（因为 Windows 下 Node spawn git 会抛 EBUSY，
 * 不能自己调 git；清单从 Bash 侧生成）。
 *
 * 用法：
 *   node tools/normalize-eol.js contract/changed-files.txt
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const listFile = process.argv[2];
if (!listFile || !fs.existsSync(listFile)) {
  console.error('用法: node tools/normalize-eol.js <变更文件清单>');
  process.exit(2);
}

// 只处理源码、工具脚本与文档；生成的 contract/ 与锁文件不动
const INCLUDE = /^(src|lib|tools|e2e|docs)\//;
const EXCLUDE = /^(contract\/|package-lock\.json|pnpm-lock\.yaml)/;
const EXT = /\.(ts|js|json|html|scss|css|md)$/;

const targets = fs.readFileSync(listFile, 'utf8')
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean)
  .filter(p => INCLUDE.test(p) && !EXCLUDE.test(p) && EXT.test(p));

let fixed = 0;
let alreadyOk = 0;
const missing = [];

for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { missing.push(rel); continue; }
  const buf = fs.readFileSync(abs);
  let cr = 0;
  let lf = 0;
  for (const b of buf) { if (b === 13) { cr++; } if (b === 10) { lf++; } }
  if (cr === lf && cr > 0) { alreadyOk++; continue; }

  // 先把所有行尾折叠成 LF，再统一升为 CRLF，避免出现 CR+CRLF
  const text = buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const out = Buffer.from(text.replace(/\n/g, '\r\n'), 'utf8');
  fs.writeFileSync(abs, out);
  fixed++;
}

console.log(`待处理文件: ${targets.length}`);
console.log(`已是纯 CRLF: ${alreadyOk}`);
console.log(`已归一化为 CRLF: ${fixed}`);
if (missing.length) {
  console.log(`跳过（文件不存在，可能是删除的文件）: ${missing.length}`);
  missing.slice(0, 10).forEach(m => console.log('  - ' + m));
}
