import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { DaemonSetTemplate } from '../../model/v1/daemonsettpl';
import { buildListParams } from './list-params';

@Injectable()
export class DaemonSetTplService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listPage(pageState: PageState, appId?: number): Observable<any> {
    const params = buildListParams(pageState);

    return this.http
      .get(`/api/v1/apps/${appId}/daemonsets/tpls`, {params: params});
  }

  create(tpl: DaemonSetTemplate, appId: number): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${appId}/daemonsets/tpls`, tpl);
  }

  update(tpl: DaemonSetTemplate, appId: number): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/daemonsets/tpls/${tpl.id}`, tpl, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/daemonsets/tpls/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/daemonsets/tpls/${id}`);
  }

}
