import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { Service } from '../../model/service';
import { PageState } from '../../../../src/app/shared/page/page-state';
import { isNotEmpty } from '../../../../src/app/shared/utils';
import { OrderItem } from '../../../../src/app/shared/model/v1/order';
import { buildListParams } from '../../../../src/app/shared/client/v1/list-params';

@Injectable()
export class ServiceService {
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
      .get(`/api/v1/apps/${appId}/services/names`, {params: params});
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
      .get(`/api/v1/apps/${appId}/services`, {params: params});
  }

  create(service: Service): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${service.appId}/services`, service, this.options);
  }

  update(service: Service): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${service.appId}/services/${service.id}`, service, this.options);
  }

  updateOrder(appId: number, orderList: Array<OrderItem>): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/services/updateorders`, orderList, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/services/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/services/${id}`);
  }
}
