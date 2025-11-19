import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { throwError } from 'rxjs';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AIProvider, DiagnoseRequest, DiagnoseResponse, AIBackend, ExplainRequest, ExplainResult } from '../../model/v1/k8sgpt';

@Injectable()
export class K8sGPTService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  // ========== AI 引擎管理 ==========

  /**
   * 获取所有 AI 提供者
   */
  listAIProviders(): Observable<any> {
    return this.http
      .get('/api/v1/k8sgpt/ai/providers')
      .catch(error => throwError(error));
  }

  /**
   * 添加 AI 提供者
   */
  createAIProvider(provider: AIProvider): Observable<any> {
    return this.http
      .post('/api/v1/k8sgpt/ai/providers', provider, this.options)
      .catch(error => throwError(error));
  }

  /**
   * 删除 AI 提供者
   */
  deleteAIProvider(name: string): Observable<any> {
    return this.http
      .delete(`/api/v1/k8sgpt/ai/providers/${name}`)
      .catch(error => throwError(error));
  }

  /**
   * 设置默认 AI 提供者
   */
  setDefaultAIProvider(name: string): Observable<any> {
    return this.http
      .put(`/api/v1/k8sgpt/ai/providers/${name}/default`, {}, this.options)
      .catch(error => throwError(error));
  }

  /**
   * 获取可用的 AI 后端列表
   */
  listAIBackends(): Observable<any> {
    return this.http
      .get('/api/v1/k8sgpt/ai/backends')
      .catch(error => throwError(error));
  }

  // ========== 诊断接口 ==========

  /**
   * 通用诊断接口
   */
  diagnose(request: DiagnoseRequest): Observable<any> {
    return this.http
      .post('/api/v1/k8sgpt/diagnose', request, this.options)
      .catch(error => throwError(error));
  }

  /**
   * 诊断节点
   */
  diagnoseNode(cluster: string, name: string, explain: boolean = true, backend?: string): Observable<any> {
    let params = new HttpParams();
    params = params.set('explain', explain.toString());
    if (backend) {
      params = params.set('backend', backend);
    }
    return this.http
      .get(`/api/v1/k8sgpt/diagnose/node/${cluster}/${name}`, {params: params})
      .catch(error => throwError(error));
  }

  /**
   * 诊断 Pod
   */
  diagnosePod(cluster: string, namespace: string, name: string, explain: boolean = true, backend?: string): Observable<any> {
    let params = new HttpParams();
    params = params.set('explain', explain.toString());
    if (backend) {
      params = params.set('backend', backend);
    }
    return this.http
      .get(`/api/v1/k8sgpt/diagnose/pod/${cluster}/${namespace}/${name}`, {params: params})
      .catch(error => throwError(error));
  }

  /**
   * 诊断事件
   */
  diagnoseEvent(cluster: string, namespace: string, explain: boolean = true, backend?: string): Observable<any> {
    let params = new HttpParams();
    params = params.set('explain', explain.toString());
    if (backend) {
      params = params.set('backend', backend);
    }
    return this.http
      .get(`/api/v1/k8sgpt/diagnose/event/${cluster}/${namespace}`, {params: params})
      .catch(error => throwError(error));
  }

  // ========== 资源页面诊断接口 ==========

  /**
   * Node 页面诊断
   */
  diagnoseNodeFromResource(cluster: string, name: string, explain: boolean = true): Observable<any> {
    let params = new HttpParams();
    params = params.set('explain', explain.toString());
    return this.http
      .get(`/api/v1/kubernetes/nodes/${name}/clusters/${cluster}/diagnose`, {params: params})
      .catch(error => throwError(error));
  }

  /**
   * Pod 页面诊断
   */
  diagnosePodFromResource(cluster: string, namespace: string, appid: string, name: string, explain: boolean = true): Observable<any> {
    let params = new HttpParams();
    params = params.set('name', name);
    params = params.set('explain', explain.toString());
    return this.http
      .get(`/api/v1/kubernetes/apps/${appid}/pods/namespaces/${namespace}/clusters/${cluster}/diagnose`, {params: params})
      .catch(error => throwError(error));
  }

  /**
   * Event 页面诊断
   */
  diagnoseEventFromResource(cluster: string, namespace: string, explain: boolean = true): Observable<any> {
    let params = new HttpParams();
    params = params.set('explain', explain.toString());
    return this.http
      .get(`/api/v1/kubernetes/events/namespaces/${namespace}/clusters/${cluster}/diagnose`, {params: params})
      .catch(error => throwError(error));
  }

  // ========== AI 解释接口 ==========

  /**
   * AI 解释诊断结果
   */
  explain(request: ExplainRequest): Observable<any> {
    return this.http
      .post('/api/v1/k8sgpt/explain', request, this.options)
      .catch(error => throwError(error));
  }
}

