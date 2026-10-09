import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { ConfigMapTpl } from '../../model/v1/configmaptpl';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { buildListParams } from './list-params';

@Injectable()
export class ConfigMapTplService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listPage(pageState: PageState, appId?: number, cId?: string): Observable<any> {
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = 0;
    }
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
        ['cId', cId === undefined ? '' : cId.toString()],
      ],
    });

    return this.http
      .get(`/api/v1/apps/${appId}/configmaps/tpls`, {params: params});
  }

  create(configMapTpl: ConfigMapTpl, appId: number): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${appId}/configmaps/tpls`, configMapTpl, this.options);
  }

  update(configMapTpl: ConfigMapTpl, appId: number): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/configmaps/tpls/${configMapTpl.id}`, configMapTpl, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }
    return this.http
      .delete(`/api/v1/apps/${appId}/configmaps/tpls/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/configmaps/tpls/${id}`);
  }
}
