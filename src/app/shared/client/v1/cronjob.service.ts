import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Cronjob } from '../../model/v1/cronjob';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { OrderItem } from '../../model/v1/order';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { buildListParams } from './list-params';

@Injectable()
export class CronjobService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  getNames(appId?: number): Observable<any> {
    const params = new HttpParams();
    if (typeof (appId) === 'undefined') {
      appId = 0;
    }
    return this.http
      .get(`/api/v1/apps/${appId}/cronjobs/names`, {params: params});
  }

  list(pageState: PageState, deleted?: string, appId?: string): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['deleted', deleted],
        ['relate', 'all'],
        ['appId', appId + ''],
        ['sortby', '-id'],
      ],
      excludeSortby: ['app.name'],
    });
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = '0';
    }
    return this.http
      .get(`/api/v1/apps/${appId}/cronjobs`, {params: params});
  }

  create(cronjob: Cronjob): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${cronjob.appId}/cronjobs`, cronjob, this.options);
  }

  update(cronjob: Cronjob): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${cronjob.appId}/cronjobs/${cronjob.id}`, cronjob, this.options);
  }

  updateOrder(appId: number, orderList: Array<OrderItem>): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/cronjobs/updateorders`, orderList, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/cronjobs/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/cronjobs/${id}`);
  }
}
