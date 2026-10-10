import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { StatefulsetTemplate } from '../../model/v1/statefulsettpl';
import { buildListParams } from './list-params';

@Injectable()
export class StatefulsetTplService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listPage(pageState: PageState, appId?: number): Observable<any> {
    const params = buildListParams(pageState);

    return this.http
      .get(`/api/v1/apps/${appId}/statefulsets/tpls`, {params: params});
  }

  create(tpl: StatefulsetTemplate, appId: number): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${appId}/statefulsets/tpls`, tpl);
  }

  update(tpl: StatefulsetTemplate, appId: number): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/statefulsets/tpls/${tpl.id}`, tpl, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/statefulsets/tpls/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/statefulsets/tpls/${id}`);
  }

}
