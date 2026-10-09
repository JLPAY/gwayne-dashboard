import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { LinkType } from '../../model/v1/link-type';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { buildListParams } from './list-params';

@Injectable()
export class RoadmapService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listSystemConfig() {
    return this.http
      .get('/api/v1/linktypes/system');
  }

  list(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState, {
      trailingLiterals: [
        ['deleted', 'false'],
      ],
      exactFilterKeys: ['id'],
    });
    return this.http
      .get('/api/v1/linktypes', {params: params});
  }

  create(config: LinkType): Observable<any> {
    return this.http
      .post(`/api/v1/linktypes`, config, this.options);
  }

  update(config: LinkType): Observable<any> {
    return this.http
      .put(`/api/v1/linktypes/${config.id}`, config, this.options);
  }

  deleteById(id: number): Observable<any> {
    const options: any = {};

    return this.http
      .delete(`/api/v1/linktypes/${id}`, options);
  }

  getById(id: number): Observable<any> {
    return this.http
      .get(`/api/v1/linktypes/${id}`);
  }

}
