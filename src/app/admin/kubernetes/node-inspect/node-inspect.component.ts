import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { NodeClient } from '../../../shared/client/v1/kubernetes/node';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { AuthService } from '../../../shared/auth/auth.service';

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
export class NodeInspectComponent implements OnInit {
  cluster: string;
  clusters: Array<any>;
  results: InspectResult[] = [];
  loading = false;
  inspected = false;

  isAdmin = false;

  // 可配置巡检项
  registry: ItemMeta[] = [];
  items: ItemConfig[] = [];
  scheduleEnabled = false;
  scheduleInterval = 60;
  retentionDays = 90;

  // 结果表动态列（启用的节点级巡检项）
  columns: string[] = [];

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
              private authService: AuthService) {
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
      },
      error => {
        this.loading = false;
        this.messageHandlerService.handleError(error);
      }
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
    if (this.scheduleInterval <= 0 || this.retentionDays <= 0) {
      this.messageHandlerService.showWarning('调度间隔与历史保留天数必须大于 0');
      return;
    }
    this.nodeClient.updateNodeInspectConfig({
      items: this.items,
      scheduleEnabled: this.scheduleEnabled,
      scheduleInterval: this.scheduleInterval,
      retentionDays: this.retentionDays
    }).subscribe(
      resp => this.messageHandlerService.showSuccess('节点巡检配置已保存'),
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
}
