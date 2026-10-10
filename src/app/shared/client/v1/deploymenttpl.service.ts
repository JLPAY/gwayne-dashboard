import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { DeploymentTpl } from '../../model/v1/deploymenttpl';
import { buildListParams, ListParamPair } from './list-params';

@Injectable()
export class DeploymentTplService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listPage(pageState: PageState, appId?: number, deploymentId?: string, needStatus?: string): Observable<any> {
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = 0;
    }
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
        ['deploymentId', deploymentId === undefined ? '' : deploymentId + ''],
        ...((needStatus) ? [['needStatus', needStatus]] as ListParamPair[] : []),
      ],
    });
    return this.http
      .get(`/api/v1/apps/${appId}/deployments/tpls`, {params: params});
  }

  create(tpl: DeploymentTpl, appId: number): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${appId}/deployments/tpls`, tpl);
  }

  update(tpl: DeploymentTpl, appId: number): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/deployments/tpls/${tpl.id}`, tpl, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/deployments/tpls/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/deployments/tpls/${id}`);
  }

}
