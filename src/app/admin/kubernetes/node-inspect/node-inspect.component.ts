import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { NodeClient } from '../../../shared/client/v1/kubernetes/node';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { AuthService } from '../../../shared/auth/auth.service';

export interface DiskItem {
  mountpoint: string;
  device: string;
  fstype: string;
  capacityBytes: number;
  usedBytes: number;
  availBytes: number;
  usedPercent: number;
}

export interface InspectItem {
  name: string;
  ready: boolean;
  memoryCapacityBytes: number;
  memoryUsedBytes: number;
  memoryUsedPercent: number;
  diskCapacityBytes: number;
  diskUsedBytes: number;
  diskUsedPercent: number;
  diskAvailableBytes: number;
  disks?: DiskItem[];
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
  error?: string;
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

  warning = 80;
  critical = 90;
  isAdmin = false;

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

    // 拉取已持久化的阈值配置
    this.nodeClient.getNodeInspectConfig().subscribe(
      resp => {
        if (resp.data) {
          this.warning = resp.data.warning;
          this.critical = resp.data.critical;
        }
      },
      error => this.messageHandlerService.handleError(error)
    );

    // 当前用户是否管理员（用于控制阈值编辑）
    this.isAdmin = !!(this.authService.currentUser && this.authService.currentUser.admin);
  }

  // 开始巡检（单集群）
  doInspect() {
    if (!this.cluster) {
      this.messageHandlerService.showWarning('请先选择集群');
      return;
    }
    this.loading = true;
    this.inspected = true;
    this.nodeClient.inspect(this.cluster, this.warning, this.critical).subscribe(
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
    this.nodeClient.inspect('', this.warning, this.critical).subscribe(
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

  // 保存阈值配置（管理员）
  saveConfig() {
    if (this.warning <= 0 || this.warning >= 100 || this.critical <= this.warning || this.critical > 100) {
      this.messageHandlerService.showWarning('阈值非法：需满足 0 < 告警 < 严重 <= 100');
      return;
    }
    this.nodeClient.updateNodeInspectConfig(this.warning, this.critical).subscribe(
      resp => {
        this.warning = resp.data.warning;
        this.critical = resp.data.critical;
        this.messageHandlerService.showSuccess('节点巡检阈值已保存');
      },
      error => this.messageHandlerService.handleError(error)
    );
  }

  // 当前选中集群的结果（单集群巡检时取第一个）
  statusText(status: string): string {
    switch (status) {
      case 'critical': return '严重';
      case 'warning': return '告警';
      default: return '正常';
    }
  }

  // 根据使用率返回进度条色标（依赖当前告警/严重阈值）
  usageClass(pct: number): string {
    if (pct >= this.critical) {
      return 'fill-critical';
    }
    if (pct >= this.warning) {
      return 'fill-warning';
    }
    return 'fill-ok';
  }

  bytesToGB(bytes: number): string {
    if (!bytes) {
      return '0';
    }
    return (bytes / 1024 / 1024 / 1024).toFixed(1);
  }
}
