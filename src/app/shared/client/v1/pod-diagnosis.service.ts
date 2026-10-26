import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PodDiagnosisReport {
  id?: number;
  cluster?: string;
  namespace?: string;
  pod?: string;
  status?: 'running' | 'success' | 'failed';
  model?: string;
  modelName?: string;
  content?: string;
  error?: string;
  durationMs?: number;
  collectMs?: number;
  llmMs?: number;
  createTime?: string;
  updateTime?: string;
  user?: string;
}

@Injectable({ providedIn: 'root' })
export class PodDiagnosisService {
  headers = new HttpHeaders({ 'Content-type': 'application/json' });
  options = { 'headers': this.headers };

  constructor(private http: HttpClient) {
  }

  // startDiagnosis 提交后台 AI 排查任务，立即返回报告 ID（不阻塞页面）
  startDiagnosis(cluster: string, namespace: string, pod: string): Observable<any> {
    return this.http.post('/api/v1/diagnosis/pod',
      {cluster: cluster, namespace: namespace, pod: pod}, this.options);
  }

  // listReports 查询排查报告（支持 cluster/namespace/pod/status 过滤）
  listReports(filter: {cluster?: string, namespace?: string, pod?: string, status?: string, limit?: number}): Observable<any> {
    let params = new HttpParams();
    if (filter.cluster) {
      params = params.set('cluster', filter.cluster);
    }
    if (filter.namespace) {
      params = params.set('namespace', filter.namespace);
    }
    if (filter.pod) {
      params = params.set('pod', filter.pod);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.limit) {
      params = params.set('limit', String(filter.limit));
    }
    return this.http.get('/api/v1/diagnosis/reports', {headers: this.headers, params: params});
  }

  getReport(id: number): Observable<any> {
    return this.http.get(`/api/v1/diagnosis/reports/${id}`, this.options);
  }

  deleteReport(id: number): Observable<any> {
    return this.http.delete(`/api/v1/diagnosis/reports/${id}`, this.options);
  }
}
