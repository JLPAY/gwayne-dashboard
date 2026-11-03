import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { KubeNode } from '../../../model/v1/kubernetes/node';
import { HttpClient } from '@angular/common/http';
@Injectable()
export class NodeClient {
  constructor(private http: HttpClient) {
  }

  getStatistics(): Observable<any> {
    return this.http
      .get(`/api/v1/kubernetes/nodes/statistics`);
  }

  list(cluster: string): Observable<any> {
    return this.http
      .get(`/api/v1/kubernetes/nodes/clusters/${cluster}`);
  }

  update(node: KubeNode, cluster: string): Observable<any> {
    return this.http
      .put(`/api/v1/kubernetes/nodes/${node.metadata.name}/clusters/${cluster}`, node);
  }

  deleteByName(name: string, cluster: string): Observable<any> {
    return this.http
      .delete(`/api/v1/kubernetes/nodes/${name}/clusters/${cluster}`);
  }

  cordonByName(name: string, cluster: string): Observable<any> {
    return this.http
      .put(`/api/v1/kubernetes/nodes/${name}/clusters/${cluster}/cordon`, {});
  }

  uncordonByName(name: string, cluster: string): Observable<any> {
    return this.http
      .put(`/api/v1/kubernetes/nodes/${name}/clusters/${cluster}/uncordon`, {});
  }

  getByName(name: string, cluster: string): Observable<any> {
    return this.http.get(`/api/v1/kubernetes/nodes/${name}/clusters/${cluster}`);
  }

  // 巡检节点内存与磁盘使用率（cluster 为空则巡检全部集群）
  inspect(cluster: string, warning?: number, critical?: number): Observable<any> {
    let url = `/api/v1/kubernetes/nodes/inspect?cluster=${cluster}`;
    if (warning != null) {
      url += `&warning=${warning}`;
    }
    if (critical != null) {
      url += `&critical=${critical}`;
    }
    return this.http.get(url);
  }

  // 读取节点巡检阈值配置
  getNodeInspectConfig(): Observable<any> {
    return this.http.get(`/api/v1/configs/node-inspect`);
  }

  // 更新节点巡检阈值配置（仅管理员）
  updateNodeInspectConfig(warning: number, critical: number): Observable<any> {
    return this.http.put(`/api/v1/configs/node-inspect`, {warning, critical});
  }
}
