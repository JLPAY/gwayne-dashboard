import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Config } from '../../model/v1/config';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { buildListParams } from './list-params';

@Injectable()
export class ConfigService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listSystemConfig() {
    return this.http
      .get('/api/v1/configs/system');
  }

  list(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState, {
      exactFilterKeys: ['id'],
    });
    return this.http
      .get('/api/v1/configs', {params: params});
  }

  create(config: Config): Observable<any> {
    return this.http
      .post(`/api/v1/configs`, config, this.options);
  }

  update(config: Config): Observable<any> {
    return this.http
      .put(`/api/v1/configs/${config.id}`, config, this.options);
  }

  deleteById(id: number): Observable<any> {
    const options: any = {};

    return this.http
      .delete(`/api/v1/configs/${id}`, options);
  }

  getById(id: number): Observable<any> {
    return this.http
      .get(`/api/v1/configs/${id}`);
  }

}
