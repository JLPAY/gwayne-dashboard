import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SecretTpl } from '../../model/v1/secrettpl';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { buildListParams } from './list-params';

@Injectable()
export class SecretTplService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  getNames(appId?: number): Observable<any> {
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = 0;
    }
    return this.http
      .get(`/api/v1/apps/${appId}/secrets/tpls/names`);
  }

  listPage(pageState: PageState, appId?: number, secretId?: string, needStatus?: string): Observable<any> {
    if ((typeof (appId) === 'undefined') || (!appId)) {
      appId = 0;
    }
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
        ['secretId', secretId === undefined ? '' : secretId.toString()],
      ],
    });

    return this.http
      .get(`/api/v1/apps/${appId}/secrets/tpls`, {params: params});
  }

  create(secretTpl: SecretTpl, appId: number): Observable<any> {
    return this.http
      .post(`/api/v1/apps/${appId}/secrets/tpls`, secretTpl, this.options);
  }

  update(secretTpl: SecretTpl, appId: number): Observable<any> {
    return this.http
      .put(`/api/v1/apps/${appId}/secrets/tpls/${secretTpl.id}`, secretTpl, this.options);
  }

  deleteById(id: number, appId: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/apps/${appId}/secrets/tpls/${id}`, options);
  }

  getById(id: number, appId: number): Observable<any> {
    return this.http
      .get(`/api/v1/apps/${appId}/secrets/tpls/${id}`);
  }
}
