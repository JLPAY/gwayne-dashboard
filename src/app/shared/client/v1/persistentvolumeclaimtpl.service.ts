import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { PersistentVolumeClaimTpl } from '../../model/v1/persistentvolumeclaimtpl';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { buildListParams, ListParamPair } from './list-params';

@Injectable()
export class PersistentVolumeClaimTplService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  private isOnlineController = new Subject<boolean>();

  constructor(private http: HttpClient) {
  }

  isOnlineObservable$ = this.isOnlineController.asObservable();

  public isOnlineChange(isOnline: boolean) {
    this.isOnlineController.next(isOnline);
  }




  list(pageState: PageState, appId?: number, deleted?: string, pvcId?: string): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['deleted', deleted],
        ['sortby', '-id'],
        ...((pvcId) ? [['pvcId', pvcId]] as ListParamPair[] : []),
      ],
    });
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = 0;
    }

    return this.http
      .get(`/api/v1/apps/${appId}/persistentvolumeclaims/tpls`, {params: params});
  }

  listPage(pageState: PageState, appId: number): Observable<any> {
    const params = buildListParams(pageState);
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = 0;
    }

    return this.http
      .get(`/api/v1/apps/${appId}/persistentvolumeclaims/tpls`, {params: params});
  }

  create(pvcTpl: PersistentVolumeClaimTpl, appId: number): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${appId}/persistentvolumeclaims/tpls`, pvcTpl, this.options);
  }

  update(pvcTpl: PersistentVolumeClaimTpl, appId: number): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/persistentvolumeclaims/tpls/${pvcTpl.id}`, pvcTpl, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/persistentvolumeclaims/tpls/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/persistentvolumeclaims/tpls/${id}`);
  }
}
