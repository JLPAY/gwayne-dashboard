import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { AutoscaleTpl } from '../../model/v1/autoscaletpl';
import { isNotEmpty } from '../../utils';
import { PageState } from '../../page/page-state';
import { buildListParams } from './list-params';

@Injectable()
export class AutoscaleTplService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listPage(pageState: PageState, appId?: number, resourceId?: string): Observable<any> {
    if ((typeof(appId) === 'undefined') || (!appId)) {
      appId = 0;
    }
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
        ['hpaId', resourceId === undefined ? '' : resourceId.toString()],
      ],
    });

    return this.http
      .get(`/api/v1/apps/${appId}/hpas/tpls`, {params: params});
  }

  create(autoscaletpl: AutoscaleTpl, appId: number): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${appId}/hpas/tpls`, autoscaletpl, this.options);
  }

  update(autoscaletpl: AutoscaleTpl, appId: number): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/hpas/tpls/${autoscaletpl.id}`, autoscaletpl, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/hpas/tpls/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/hpas/tpls/${id}`);
  }
}
