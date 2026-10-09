import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PageState } from '../../../page/page-state';
import { BaseClient } from './base-client';

@Injectable()
export class PodClient {
  constructor(private http: HttpClient) {
  }

  listPageByResouce(pageState: PageState, cluster: string, namespace: string, resouceType: string,
                    name: string, appId?: number): Observable<any> {
    let params = BaseClient.buildParam(pageState);
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = 0;
    }
    params = params.set('type', resouceType);
    params = params.set('name', name);
    return this.http
      .get(`/api/v1/kubernetes/apps/${appId}/pods/namespaces/${namespace}/clusters/${cluster}`, {params: params});
  }

  getStatistics(): Observable<any> {
    return this.http
      .get(`/api/v1/kubernetes/pods/statistics`);
  }

  createTerminal(appId: number, cluster: string, namespace: string, pod: string, container: string, cmd?: string): Observable<any> {
    let params = new HttpParams();
    params = params.set('container', container);
    params = params.set('cmd', cmd);
    return this.http
      .post(`/api/v1/kubernetes/apps/${appId}/pods/${pod}/terminal/namespaces/${namespace}/clusters/${cluster}`, null, {params: params});
  }

}
