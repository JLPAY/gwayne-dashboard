import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { KubeNode } from '../../../model/v1/kubernetes/node';
import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
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

  // 巡检节点（cluster 为空则巡检全部集群；巡检项与阈值取后端配置）
  inspect(cluster: string): Observable<any> {
    return this.http.get(`/api/v1/kubernetes/nodes/inspect?cluster=${cluster || ''}`);
  }

  // 读取节点巡检配置（含可配置项注册表）
  getNodeInspectConfig(): Observable<any> {
    return this.http.get(`/api/v1/configs/node-inspect`);
  }

  // 更新节点巡检配置（仅管理员）：items / scheduleEnabled / scheduleInterval / retentionDays
  updateNodeInspectConfig(payload: any): Observable<any> {
    return this.http.put(`/api/v1/configs/node-inspect`, payload);
  }

  // 巡检历史：历次运行汇总
  getInspectRuns(cluster: string, limit?: number): Observable<any> {
    let params = new HttpParams().set('cluster', cluster || '');
    if (limit) {
      params = params.set('limit', String(limit));
    }
    return this.http.get(`/api/v1/kubernetes/nodes/inspect/history/runs`, {params});
  }

  // 巡检历史：明细（可按节点/巡检项/时间过滤）
  getInspectHistory(params: {
    cluster?: string, node?: string, checkType?: string, from?: string, to?: string, limit?: number
  }): Observable<any> {
    let hp = new HttpParams();
    Object.keys(params).forEach(k => {
      const v = (params as any)[k];
      if (v !== undefined && v !== null && v !== '') {
        hp = hp.set(k, String(v));
      }
    });
    return this.http.get(`/api/v1/kubernetes/nodes/inspect/history`, {params: hp});
  }
}
