import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { DaemonSet } from '../../model/v1/daemonset';
import { OrderItem } from '../../model/v1/order';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { buildListParams, ListParamPair } from './list-params';

@Injectable()
export class DaemonSetService {
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
      .get(`/api/v1/apps/${appId}/daemonsets/names`, {params: params});
  }

  listPage(pageState: PageState, appId?: number, deleted?: string): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
        ...((deleted) ? [['deleted', deleted]] as ListParamPair[] : []),
      ],
      excludeSortby: ['app.name'],
    });

    return this.http
      .get(`/api/v1/apps/${appId}/daemonsets`, {params: params});
  }

  create(obj: DaemonSet): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${obj.appId}/daemonsets`, obj);
  }

  update(obj: DaemonSet): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${obj.appId}/daemonsets/${obj.id}`, obj, this.options);
  }

  updateOrder(appId: number, orderList: Array<OrderItem>): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/daemonsets/updateorders`, orderList, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/daemonsets/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/daemonsets/${id}`);
  }
}
