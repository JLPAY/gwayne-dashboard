import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServiceTpl } from '../../model/servicetpl';
import { isNotEmpty } from '../../../../src/app/shared/utils';
import { PageState } from '../../../../src/app/shared/page/page-state';
import { buildListParams } from '../../../../src/app/shared/client/v1/list-params';

@Injectable()
export class ServiceTplService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listPage(pageState: PageState, appId?: number, serviceId?: string): Observable<any> {
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = 0;
    }
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
        ['serviceId', serviceId === undefined ? '' : serviceId.toString()],
      ],
    });

    return this.http
      .get(`/api/v1/apps/${appId}/services/tpls`, {params: params});
  }

  create(serviceTpl: ServiceTpl, appId: number): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${appId}/services/tpls`, serviceTpl, this.options);
  }

  update(serviceTpl: ServiceTpl, appId: number): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/services/tpls/${serviceTpl.id}`, serviceTpl, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/services/tpls/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/services/tpls/${id}`);
  }
}
