import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Namespace } from '../../model/v1/namespace';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { buildListParams } from './list-params';

@Injectable()
export class NamespaceService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listNamespace(pageState: PageState, deleted?: string): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['deleted', deleted],
      ],
    });
    return this.http
      .get('/api/v1/namespaces', {params: params});
  }

  getNames(): Observable<any> {
    return this.http
      .get('/api/v1/namespaces/names');
  }

  createNamespace(ns: Namespace): Observable<any> {
    return this.http
      .post(`/api/v1/namespaces`, ns, this.options);
  }

  updateNamespace(ns: Namespace): Observable<any> {
    return this.http
      .put(`/api/v1/namespaces/${ns.id}`, ns, this.options);
  }

  deleteNamespace(nsId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }
    return this.http
      .delete(`/api/v1/namespaces/${nsId}`, options);
  }

  getNamespace(nsId: number): Observable<any> {
    return this.http
      .get(`/api/v1/namespaces/${nsId}`);
  }

  initDefault(): Observable<any> {
    return this.http.get(`/api/v1/namespaces/init`);
  }


  getHistory(namespaceId: number, appName?: string): Observable<any> {
    let params = new HttpParams();
    if (appName) {
      params = params.set('app', appName);
    }
    return this.http
      .get(`/api/v1/namespaces/${namespaceId}/history`, {params: params});
  }

  migrateNamespace(sourceId: number, targetId: number) {
    return this.http
      .post(`/api/v1/namespaces/migration`, {
        sourceId,
        targetId
      });
  }
}
