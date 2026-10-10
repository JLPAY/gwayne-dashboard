import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { OrderItem } from '../../model/v1/order';
import { Ingress } from '../../model/v1/ingress';
import { buildListParams } from './list-params';

@Injectable()
export class IngressService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  getNames(appId?: number): Observable<any> {
    const params = new HttpParams();
    if (typeof(appId) === 'undefined') {
      appId = 0;
    }
    return this.http
      .get(`/api/v1/apps/${appId}/ingresses/names`, {params: params});
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
    if ((typeof(appId) === 'undefined') || (!appId)) {
      appId = '0';
    }
    return this.http
      .get(`/api/v1/apps/${appId}/ingresses`, {params: params});
  }

  create(ingress: Ingress): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${ingress.appId}/ingresses`, ingress, this.options);
  }

  update(ingress: Ingress): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${ingress.appId}/ingresses/${ingress.id}`, ingress, this.options);
  }

  updateOrder(appId: number, orderList: Array<OrderItem>): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/ingresses/updateorders`, orderList, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/ingresses/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/ingresses/${id}`);
  }
}
