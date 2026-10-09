import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { ApiKey } from '../../model/v1/apikey';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { buildListParams } from './list-params';

@Injectable()
export class ApiKeyService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listPage(pageState: PageState, namespaceId?: number, appId?: number): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
      ],
    });

    return this.http
      .get(this.buildAPIKeyUrl(namespaceId, appId), {params: params});
  }

  buildAPIKeyUrl(namespaceId?: number, appId?: number): string {
    let url = '';
    if (isNotEmpty(namespaceId)) {
      url = `/api/v1/namespaces/${namespaceId}/apikeys`;
    }
    if (isNotEmpty(appId)) {
      url = `/api/v1/apps/${appId}/apikeys`;
    }
    return url;
  }

  create(apiKey: ApiKey, namespaceId?: number, appId?: number): Observable<any> {
    return this.http
      .post(this.buildAPIKeyUrl(namespaceId, appId), apiKey, this.options);
  }

  update(apiKey: ApiKey, namespaceId?: number, appId?: number): Observable<any> {
    return this.http
      .put(`${this.buildAPIKeyUrl(namespaceId, appId)}/${apiKey.id}`, apiKey, this.options);
  }

  deleteById(id: number, logical?: boolean, namespaceId?: number, appId?: number): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`${this.buildAPIKeyUrl(namespaceId, appId)}/${id}`, options);
  }

  getById(id: number, namespaceId?: number, appId?: number): Observable<any> {
    return this.http.get(`${this.buildAPIKeyUrl(namespaceId, appId)}/${id}`);
  }
}
