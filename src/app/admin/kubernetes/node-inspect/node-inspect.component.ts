import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { NodeClient } from '../../../shared/client/v1/kubernetes/node';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { ConfirmationDialogService } from '../../../shared/confirmation-dialog/confirmation-dialog.service';
import { ConfirmationMessage } from '../../../shared/confirmation-dialog/confirmation-message';
import { ConfirmationButtons, ConfirmationState, ConfirmationTargets } from '../../../shared/shared.const';
import { downloadText, escapeHtml, printHtmlReport, timestampForFile } from '../../../shared/util/export';
import { Subscription } from 'rxjs';

export interface CheckResult {
  type: string;
  name: string;
  status: string;
  percent?: number;
  value: string;
  detail?: string;
}

export interface InspectItem {
  name: string;
  ready: boolean;
  checks: CheckResult[];
  status: string;
  messages?: string[];
  error?: string;
}

export interface InspectResult {
  cluster: string;
  total: number;
  warning: number;
  critical: number;
  items: InspectItem[];
  clusterChecks?: CheckResult[];
  error?: string;
}

// 后端 ItemMeta（Go 导出字段无 json tag，键为首字母大写）
export interface ItemMeta {
  Type: string;
  Name: string;
  Unit: string;
  DefaultWarning: number;
  DefaultCritical: number;
  EnabledByDefault: boolean;
  Source: string;
  ClusterScoped: boolean;
  Invert: boolean;
}

export interface ItemConfig {
  type: string;
  enabled: boolean;
  warning: number;
  critical: number;
}

@Component({
  selector: 'wayne-node-inspect',
  templateUrl: './node-inspect.component.html',
  styleUrls: ['./node-inspect.component.scss']
})
export class NodeInspectComponent implements OnInit, OnDestroy {
  cluster: string;
  clusters: Array<any>;
  results: InspectResult[] = [];
  loading = false;
  inspected = false;

  isAdmin = false;

  // 推送确认弹窗订阅
  pushSubscription: Subscription;

  // 可配置巡检项
  registry: ItemMeta[] = [];
  items: ItemConfig[] = [];
  scheduleEnabled = false;
  // 后端兜底间隔（分钟），仅当 Crontab 为空时由调度器使用；界面不展示、原样透传
  scheduleInterval = 60;
  retentionDays = 90;
  // 定时巡检 crontab 表达式（5 段标准格式），如 "0 */6 * * *"
  scheduleCron = '';
  // 定时巡检集群范围：空数组 = 全部集群
  scheduleClusters: string[] = [];

  // 企业微信机器人推送
  webhookEnabled = false;
  webhookUrl = '';
  webhookOnlyWarning = false;

  // Prometheus 数据源（为空时后端回退服务端配置文件）
  prometheusUrl = '';
  prometheusToken = '';

  // 结果表动态列（启用的节点级巡检项）
  columns: string[] = [];

  // 配置面板展开状态（默认收起，展开一次后本页会话内记住）
  showConfig = false;

  toggleConfig() {
    this.showConfig = !this.showConfig;
  }

  // 收起状态下的配置摘要
  configBrief(): string {
    const parts: string[] = [];
    if (this.scheduleEnabled) {
      parts.push(this.scheduleCron ? `定时 ${this.scheduleCron}` : '定时已启用');
    } else {
      parts.push('未启用定时');
    }
    if (this.scheduleClusters.length) {
      parts.push(`${this.scheduleClusters.length} 个集群`);
    } else {
      parts.push('全部集群');
    }
    const enabled = this.items.filter(it => it.enabled).length;
    parts.push(`${enabled} 个巡检项`);
    if (this.webhookEnabled) {
      parts.push('企微推送');
    }
    return parts.join(' · ');
  }

  itemLabels: { [key: string]: string } = {
    ready: '节点就绪',
    memory: '内存使用率',
    disk: '磁盘使用率',
    cpu: 'CPU 使用率',
    load: '系统负载',
    pressure: '压力状态',
    fd: '文件描述符',
    pod: 'Pod 数量',
    cert_apiserver: 'API Server 证书'
  };

  constructor(private nodeClient: NodeClient,
              private clusterService: ClusterService,
              private route: ActivatedRoute,
              private messageHandlerService: MessageHandlerService,
              private authService: AuthService,
              private confirmationDialogService: ConfirmationDialogService) {
    // 推送确认：弹窗点「确定」后推送当前结果
    this.pushSubscription = confirmationDialogService.confirmationConfirm$.subscribe(message => {
      if (message &&
        message.state === ConfirmationState.CONFIRMED &&
        message.source === ConfirmationTargets.INSPECT_PUSH) {
        this.doPush(message.data);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.pushSubscription) {
      this.pushSubscription.unsubscribe();
    }
  }

  ngOnInit() {
    this.clusterService.getNames().subscribe(
      resp => {
        this.clusters = resp.data.map(item => item.name);
        const paramCluster = this.route.snapshot.params['cluster'];
        this.cluster = (paramCluster && this.clusters.indexOf(paramCluster) > -1)
          ? paramCluster
          : (this.clusters.length ? this.clusters[0] : '');
        localStorage.setItem('cluster', this.cluster);
      },
      error => this.messageHandlerService.handleError(error)
    );

    this.loadConfig();
    this.isAdmin = !!(this.authService.currentUser && this.authService.currentUser.admin);
  }

  loadConfig() {
    this.nodeClient.getNodeInspectConfig().subscribe(
      resp => {
        if (resp.registry) {
          this.registry = resp.registry;
        }
        if (resp.items) {
          this.items = resp.items;
        }
        if (resp.data) {
          this.scheduleEnabled = !!resp.data.scheduleEnabled;
          this.scheduleInterval = resp.data.scheduleInterval || 60;
          this.retentionDays = resp.data.retentionDays || 90;
          this.webhookEnabled = !!resp.data.webhookEnabled;
          this.webhookUrl = resp.data.webhookUrl || '';
          this.webhookOnlyWarning = !!resp.data.webhookOnlyWarning;
          this.scheduleCron = resp.data.scheduleCron || '';
          this.prometheusUrl = resp.data.prometheusUrl || '';
          this.prometheusToken = resp.data.prometheusToken || '';
          const sc = (resp.data.scheduleClusters || '').trim();
          this.scheduleClusters = sc ? sc.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
        }
        this.rebuildColumns();
      },
      error => this.messageHandlerService.handleError(error)
    );
  }

  rebuildColumns() {
    // 列 = 启用且非集群级的巡检项（按注册表顺序）
    const enabledMap: { [key: string]: boolean } = {};
    this.items.forEach(it => enabledMap[it.type] = it.enabled);
    this.columns = this.registry
      .filter(m => !m.ClusterScoped && enabledMap[m.Type])
      .map(m => m.Type);
  }

  // 勾选/取消「全部集群」：勾选即清空范围（后端空 = 全部）
  toggleAllClusters(ev: any) {
    this.scheduleClusters = ev.target.checked ? [] : this.clusters.slice();
  }

  // 勾选/取消单个集群
  toggleCluster(name: string, ev: any) {
    const i = this.scheduleClusters.indexOf(name);
    if (ev.target.checked && i < 0) {
      this.scheduleClusters.push(name);
    } else if (!ev.target.checked && i > -1) {
      this.scheduleClusters.splice(i, 1);
    }
    // 取消到空列表 = 全部集群
    if (this.scheduleClusters.length === this.clusters.length) {
      this.scheduleClusters = [];
    }
  }

  // 巡检项是否为布尔型（无阈值）
  isBooleanItem(type: string): boolean {
    const meta = this.registry.find(m => m.Type === type);
    return !!meta && meta.Unit === '';
  }

  // 巡检项是否证书型（阈值语义反转：critical < warning）
  isInvertItem(type: string): boolean {
    const meta = this.registry.find(m => m.Type === type);
    return !!meta && meta.Invert;
  }

  labelOf(type: string): string {
    return this.itemLabels[type] || type;
  }

  // 开始巡检（单集群）
  doInspect() {
    if (!this.cluster) {
      this.messageHandlerService.showWarning('请先选择集群');
      return;
    }
    this.loading = true;
    this.inspected = true;
    this.nodeClient.inspect(this.cluster).subscribe(
      resp => {
        this.results = resp.data || [];
        this.loading = false;
        this.maybeAskPush();
      },
      error => {
        this.loading = false;
        this.messageHandlerService.handleError(error);
      }
    );
  }

  // 巡检全部集群
  doInspectAll() {
    this.loading = true;
    this.inspected = true;
    this.nodeClient.inspect('').subscribe(
      resp => {
        this.results = resp.data || [];
        this.loading = false;
        this.maybeAskPush();
      },
      error => {
        this.loading = false;
        this.messageHandlerService.handleError(error);
      }
    );
  }

  // 巡检成功后：若已启用企微推送则弹窗询问是否推送（推送前置确认）
  private maybeAskPush() {
    if (!this.results.length || !this.webhookEnabled || !this.webhookUrl) {
      return;
    }
    const message = new ConfirmationMessage(
      '推送企微确认',
      '是否将本次巡检结果推送到企业微信群？',
      this.results,
      ConfirmationTargets.INSPECT_PUSH,
      ConfirmationButtons.CONFIRM_CANCEL
    );
    this.confirmationDialogService.openComfirmDialog(message);
  }

  // 执行推送
  private doPush(results: InspectResult[]) {
    this.nodeClient.pushInspectReport(results).subscribe(
      resp => this.messageHandlerService.showSuccess('巡检报告已推送到企业微信群'),
      error => this.messageHandlerService.handleError(error)
    );
  }

  // 保存巡检配置（管理员）
  saveConfig() {
    for (const it of this.items) {
      if (this.isBooleanItem(it.type)) {
        continue;
      }
      if (this.isInvertItem(it.type)) {
        if (it.critical <= 0 || it.critical >= it.warning) {
          this.messageHandlerService.showWarning(`${this.labelOf(it.type)} 为证书剩余天数，需满足 严重(天数) < 告警(天数)`);
          return;
        }
      } else if (it.warning <= 0 || it.warning >= it.critical || it.critical > 100) {
        this.messageHandlerService.showWarning(`${this.labelOf(it.type)} 阈值非法：需满足 0 < 告警 < 严重 <= 100`);
        return;
      }
    }
    if (this.retentionDays <= 0) {
      this.messageHandlerService.showWarning('历史保留天数必须大于 0');
      return;
    }
    const url = (this.webhookUrl || '').trim();
    if (this.webhookEnabled && !url) {
      this.messageHandlerService.showWarning('已启用企微机器人推送，请填写 Webhook 地址');
      return;
    }
    this.nodeClient.updateNodeInspectConfig({
      items: this.items,
      scheduleEnabled: this.scheduleEnabled,
      scheduleInterval: this.scheduleInterval,
      scheduleCron: (this.scheduleCron || '').trim(),
      scheduleClusters: this.scheduleClusters.join(','),
      retentionDays: this.retentionDays,
      webhookEnabled: this.webhookEnabled,
      webhookUrl: url,
      webhookOnlyWarning: this.webhookOnlyWarning,
      prometheusUrl: (this.prometheusUrl || '').trim(),
      prometheusToken: (this.prometheusToken || '').trim()
    }).subscribe(
      resp => this.messageHandlerService.showSuccess('节点巡检配置已保存'),
      error => this.messageHandlerService.handleError(error)
    );
  }

  // 发送企微机器人测试消息（用输入框中当前地址，未保存也可测试）
  testWebhook() {
    const url = (this.webhookUrl || '').trim();
    if (!url) {
      this.messageHandlerService.showWarning('请先填写 Webhook 地址');
      return;
    }
    this.nodeClient.testInspectWebhook(url).subscribe(
      resp => this.messageHandlerService.showSuccess('测试消息已发送，请在企业微信群中确认'),
      error => this.messageHandlerService.handleError(error)
    );
  }

  // 取某节点的某个巡检项结果
  findCheck(item: InspectItem, type: string): CheckResult {
    return (item.checks || []).find(c => c.type === type);
  }

  statusText(status: string): string {
    switch (status) {
      case 'critical': return '严重';
      case 'warning': return '告警';
      default: return '正常';
    }
  }

  cellClass(item: InspectItem, type: string): string {
    const c = this.findCheck(item, type);
    if (!c) {
      return '';
    }
    return 'cell-' + c.status;
  }

  // 生成报告时间字符串，如 2026-11-04 09:10:00
  private reportTime(): string {
    const d = new Date();
    const p = (n: number) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  // 导出巡检报告为 Markdown
  exportMarkdown() {
    if (!this.results.length) {
      this.messageHandlerService.showWarning('暂无可导出的巡检结果，请先执行巡检');
      return;
    }
    downloadText(`巡检报告_${timestampForFile()}.md`, this.buildMarkdown(), 'text/markdown;charset=utf-8');
    this.messageHandlerService.showSuccess('巡检报告已导出为 Markdown');
  }

  // 导出巡检报告为 PDF（打印窗口 -> 另存为 PDF）
  exportPdf() {
    if (!this.results.length) {
      this.messageHandlerService.showWarning('暂无可导出的巡检结果，请先执行巡检');
      return;
    }
    const opened = printHtmlReport(`节点巡检报告 ${this.reportTime()}`, this.buildReportHtml());
    if (!opened) {
      this.messageHandlerService.showWarning('打印窗口被浏览器拦截，请允许本站弹窗后重试');
    }
  }

  // Markdown 单元格：转义竖线与换行
  private mdCell(s: any): string {
    return String(s === null || s === undefined ? '' : s)
      .replace(/\|/g, '\\|')
      .replace(/\r?\n/g, ' ');
  }

  private buildMarkdown(): string {
    const lines: string[] = [];
    lines.push('# 节点巡检报告');
    lines.push('');
    lines.push(`生成时间：${this.reportTime()}`);
    lines.push('');
    for (const r of this.results) {
      lines.push(`## ${this.mdCell(r.cluster)}`);
      lines.push('');
      if (r.error) {
        lines.push(`> 巡检失败：${this.mdCell(r.error)}`);
        lines.push('');
        continue;
      }
      lines.push(`共 ${r.total} 个节点，告警 ${r.warning}，严重 ${r.critical}`);
      lines.push('');
      if (r.clusterChecks && r.clusterChecks.length) {
        lines.push('### 集群级巡检项');
        lines.push('');
        lines.push('| 巡检项 | 结果 | 说明 |');
        lines.push('|---|---|---|');
        for (const cc of r.clusterChecks) {
          lines.push(`| ${this.mdCell(this.labelOf(cc.type))} | ${this.mdCell(cc.value)} | ${this.mdCell(cc.detail || '')} |`);
        }
        lines.push('');
      }
      lines.push('### 节点明细');
      lines.push('');
      lines.push(`| 节点名称 | ${this.columns.map(c => this.labelOf(c)).join(' | ')} | 状态 |`);
      lines.push(`|---|${this.columns.map(() => '---').join('|')}|---|`);
      for (const item of r.items) {
        const vals = this.columns.map(col => {
          const c = this.findCheck(item, col);
          return c ? c.value : '-';
        });
        lines.push(`| ${this.mdCell(item.name)} | ${vals.map(v => this.mdCell(v)).join(' | ')} | ${this.statusText(item.status)} |`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  // 报告状态样式类（打印 HTML 用）
  private stClass(status: string): string {
    return status === 'critical' ? 'st-critical' : (status === 'warning' ? 'st-warning' : 'st-ok');
  }

  private buildReportHtml(): string {
    const parts: string[] = [];
    parts.push(`<h1>节点巡检报告</h1>`);
    parts.push(`<div class="meta">生成时间：${escapeHtml(this.reportTime())}</div>`);
    for (const r of this.results) {
      parts.push(`<h2>${escapeHtml(r.cluster)}</h2>`);
      if (r.error) {
        parts.push(`<p class="err">巡检失败：${escapeHtml(r.error)}</p>`);
        continue;
      }
      parts.push(`<p class="summary">共 ${r.total} 个节点，告警 ${r.warning}，严重 ${r.critical}</p>`);
      if (r.clusterChecks && r.clusterChecks.length) {
        parts.push('<h3>集群级巡检项</h3>');
        parts.push('<table><tr><th>巡检项</th><th>结果</th><th>说明</th></tr>');
        for (const cc of r.clusterChecks) {
          parts.push(`<tr><td>${escapeHtml(this.labelOf(cc.type))}</td>`
            + `<td class="${this.stClass(cc.status)}">${escapeHtml(cc.value)}</td>`
            + `<td>${escapeHtml(cc.detail || '')}</td></tr>`);
        }
        parts.push('</table>');
      }
      parts.push('<h3>节点明细</h3>');
      parts.push(`<table><tr><th>节点名称</th>`
        + this.columns.map(c => `<th>${escapeHtml(this.labelOf(c))}</th>`).join('')
        + '<th>状态</th></tr>');
      for (const item of r.items) {
        const vals = this.columns.map(col => {
          const c = this.findCheck(item, col);
          return `<td>${c ? escapeHtml(c.value) : '-'}</td>`;
        }).join('');
        parts.push(`<tr><td>${escapeHtml(item.name)}</td>${vals}`
          + `<td class="${this.stClass(item.status)}">${this.statusText(item.status)}</td></tr>`);
      }
      parts.push('</table>');
    }
    return parts.join('\n');
  }
}
