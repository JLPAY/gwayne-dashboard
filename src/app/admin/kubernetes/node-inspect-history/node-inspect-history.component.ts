import { Component, OnInit } from '@angular/core';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { NodeClient } from '../../../shared/client/v1/kubernetes/node';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';

export interface RunSummary {
  cluster: string;
  runAt: string;
  total: number;
  warning: number;
  critical: number;
}

export interface HistoryRow {
  id: number;
  cluster: string;
  node: string;
  checkType: string;
  status: string;
  percent: number;
  value: string;
  detail?: string;
  runAt: string;
}

@Component({
  selector: 'wayne-node-inspect-history',
  templateUrl: './node-inspect-history.component.html',
  styleUrls: ['./node-inspect-history.component.scss']
})
export class NodeInspectHistoryComponent implements OnInit {
  cluster: string;
  clusters: Array<any>;
  loading = false;

  runs: RunSummary[] = [];
  // 当前展开的运行（cluster + runAt）
  selectedRun: RunSummary;
  runRows: HistoryRow[] = [];
  runColumns: string[] = [];

  // 趋势
  trendNode: string;
  trendType: string;
  trendRows: HistoryRow[] = [];

  itemLabels: { [key: string]: string } = {
    ready: '节点就绪',
    memory: '内存使用率',
    disk: '磁盘使用率',
    cpu: 'CPU 使用率',
    load: '系统负载',
    pressure: '压力状态',
    fd: '文件描述符',
    pod: 'Pod 数量',
    cert_kubelet: 'kubelet 证书',
    cert_apiserver: 'API Server 证书'
  };

  constructor(private nodeClient: NodeClient,
              private clusterService: ClusterService,
              private messageHandlerService: MessageHandlerService) {
  }

  ngOnInit() {
    this.clusterService.getNames().subscribe(
      resp => {
        this.clusters = resp.data.map(item => item.name);
        this.cluster = this.clusters.length ? this.clusters[0] : '';
        this.loadRuns();
      },
      error => this.messageHandlerService.handleError(error)
    );
  }

  loadRuns() {
    this.loading = true;
    this.nodeClient.getInspectRuns(this.cluster, 50).subscribe(
      resp => {
        this.runs = resp.data || [];
        this.loading = false;
      },
      error => {
        this.loading = false;
        this.messageHandlerService.handleError(error);
      }
    );
  }

  // 查看某次运行的明细
  viewRun(run: RunSummary) {
    this.selectedRun = run;
    this.loading = true;
    this.nodeClient.getInspectHistory({
      cluster: run.cluster,
      from: run.runAt,
      to: run.runAt,
      limit: 20000
    }).subscribe(
      resp => {
        this.runRows = resp.data || [];
        // 列 = 该运行中出现过的巡检项（保持固定顺序）
        const order = ['ready', 'memory', 'disk', 'cpu', 'load', 'pressure', 'fd', 'pod', 'cert_kubelet', 'cert_apiserver'];
        const seen: { [key: string]: boolean } = {};
        this.runRows.forEach(r => seen[r.checkType] = true);
        this.runColumns = order.filter(t => seen[t]);
        this.loading = false;
      },
      error => {
        this.loading = false;
        this.messageHandlerService.handleError(error);
      }
    );
  }

  // 某节点某巡检项在该运行中的结果
  runCell(node: string, type: string): HistoryRow {
    return this.runRows.find(r => r.node === node && r.checkType === type);
  }

  runNodes(): string[] {
    const nodes: string[] = [];
    this.runRows.forEach(r => {
      if (r.node && nodes.indexOf(r.node) < 0) {
        nodes.push(r.node);
      }
    });
    return nodes.sort();
  }

  // 加载趋势数据
  loadTrend() {
    if (!this.cluster || !this.trendNode || !this.trendType) {
      return;
    }
    this.loading = true;
    this.nodeClient.getInspectHistory({
      cluster: this.cluster,
      node: this.trendNode,
      checkType: this.trendType,
      limit: 500
    }).subscribe(
      resp => {
        this.trendRows = (resp.data || []).sort((a, b) =>
          new Date(a.runAt).getTime() - new Date(b.runAt).getTime());
        this.loading = false;
      },
      error => {
        this.loading = false;
        this.messageHandlerService.handleError(error);
      }
    );
  }

  labelOf(type: string): string {
    return this.itemLabels[type] || type;
  }

  statusText(status: string): string {
    switch (status) {
      case 'critical': return '严重';
      case 'warning': return '告警';
      default: return '正常';
    }
  }

  // 趋势图 SVG 点位（归一化到 0-100 视口）
  trendPoints(): string {
    if (!this.trendRows.length) {
      return '';
    }
    const w = 640;
    const h = 180;
    const pad = 24;
    const n = this.trendRows.length;
    const vals = this.trendRows.map(r => r.percent || 0);
    const max = Math.max(100, Math.ceil(Math.max(...vals)));
    return vals.map((v, i) => {
      const x = pad + (n === 1 ? (w - 2 * pad) / 2 : i * (w - 2 * pad) / (n - 1));
      const y = h - pad - (v / max) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  trendMax(): number {
    if (!this.trendRows.length) {
      return 100;
    }
    const vals = this.trendRows.map(r => r.percent || 0);
    return Math.max(100, Math.ceil(Math.max(...vals)));
  }

  fmtTime(t: string): string {
    if (!t) {
      return '';
    }
    const d = new Date(t);
    const p = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
}
