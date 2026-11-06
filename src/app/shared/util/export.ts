// 通用前端导出工具：无需第三方依赖。
// 当前提供 CSV 导出（带 UTF-8 BOM，Excel/Numbers/文本编辑器均可正确识别中文）。

/**
 * 转义单个 CSV 单元格。
 * 当内容包含分隔符、双引号、换行时，按 RFC 4180 用双引号包裹并将内部双引号转义为两个双引号。
 */
export function escapeCsvCell(cell: any, separator: string): string {
  let s = (cell === null || cell === undefined) ? '' : String(cell);
  if (s.indexOf('"') > -1 || s.indexOf('\n') > -1 || s.indexOf('\r') > -1 || s.indexOf(separator) > -1) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * 将二维数组拼成 CSV 文本。
 * @param rows 每一行是一组单元格（字符串或数字）。可包含「整行单一字符串」作为分节标题。
 * @param separator 列分隔符，默认英文逗号。
 */
export function buildCsv(rows: Array<Array<string | number>>, separator = ','): string {
  const lines = rows.map(row =>
    row.map(cell => escapeCsvCell(cell, separator)).join(separator)
  );
  return lines.join('\r\n');
}

/**
 * 触发浏览器下载。兼容多数现代浏览器（含创建临时 <a> + Blob 方式）。
 */
function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 延迟释放，避免部分浏览器在 click 尚未处理完就 revoke
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 导出 CSV 文件。自动加 UTF-8 BOM，保证中文在 Excel 中不乱码。
 * @param filename 文件名（含或不包含 .csv 均可，缺失时自动补）
 * @param rows 二维数据
 * @param separator 列分隔符，默认逗号
 */
export function downloadCsv(filename: string, rows: Array<Array<string | number>>, separator = ','): void {
  const csv = buildCsv(rows, separator);
  // \uFEFF = UTF-8 BOM
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const name = filename.toLowerCase().endsWith('.csv') ? filename : filename + '.csv';
  triggerDownload(name, blob);
}

/**
 * 生成时间戳字符串，用于文件名，形如 20261104_143015。
 */
export function timestampForFile(d = new Date()): string {
  const p = (n: number) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * 下载纯文本文件（如 Markdown 报告）。
 */
export function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  triggerDownload(filename, blob);
}

/**
 * HTML 转义（用于生成打印报告的 HTML 片段，防内容破坏结构）。
 */
export function escapeHtml(s: any): string {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 打开打印窗口展示 HTML 报告并自动唤起打印（用户可在打印对话框中「另存为 PDF」）。
 * 无第三方依赖，原生支持中文。
 * @returns 是否成功打开窗口（false = 被浏览器弹窗拦截）
 */
export function printHtmlReport(title: string, bodyHtml: string): boolean {
  const win = window.open('', '_blank', 'width=1000,height=760');
  if (!win) {
    return false;
  }
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #222; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
  h2 { font-size: 16px; border-bottom: 2px solid #1a6fb5; padding-bottom: 4px; margin: 20px 0 8px; }
  h3 { font-size: 14px; margin: 14px 0 6px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 12px; }
  th, td { border: 1px solid #bbb; padding: 5px 8px; text-align: left; word-break: break-all; }
  th { background: #eef3f8; }
  .summary { font-size: 12px; margin: 4px 0 10px; color: #444; }
  .st-critical { color: #c92100; font-weight: bold; }
  .st-warning { color: #b8860b; font-weight: bold; }
  .st-ok { color: #2a7a3b; }
  .err { color: #c92100; }
  @media print { body { margin: 10mm; } }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
  // 等待渲染完成后唤起打印
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      // 打印失败时保留窗口，用户可手动 Ctrl+P
    }
  }, 400);
  return true;
}
