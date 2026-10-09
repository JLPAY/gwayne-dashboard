import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { PersistentVolumeClaim } from '../../model/v1/persistentvolumeclaim';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { OrderItem } from '../../model/v1/order';
import { buildListParams } from './list-params';

@Injectable()
export class PersistentVolumeClaimService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};
  diffSub = new Subject<any>();
  diffOb = this.diffSub.asObservable();
  diff() {
    this.diffSub.next();
  }
  constructor(private http: HttpClient) {
  }

  getNames(appId?: number): Observable<any> {
    const params = new HttpParams();
    if (typeof (appId) === 'undefined') {
      appId = 0;
    }
    return this.http
      .get(`/api/v1/apps/${appId}/persistentvolumeclaims/names`, {params: params});
  }

  list(pageState: PageState, deleted?: string, appId?: string): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['deleted', deleted],
        ['relate', 'all'],
        ['sortby', '-id'],
      ],
    });
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = '0';
    }
    return this.http
      .get(`/api/v1/apps/${appId}/persistentvolumeclaims`, {params: params});
  }

  create(pvc: PersistentVolumeClaim): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${pvc.appId}/persistentvolumeclaims`, pvc, this.options);
  }

  update(pvc: PersistentVolumeClaim): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${pvc.appId}/persistentvolumeclaims/${pvc.id}`, pvc, this.options);
  }

  updateOrder(appId: number, orderList: Array<OrderItem>): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/persistentvolumeclaims/updateorders`, orderList, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/persistentvolumeclaims/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/persistentvolumeclaims/${id}`);
  }
}
