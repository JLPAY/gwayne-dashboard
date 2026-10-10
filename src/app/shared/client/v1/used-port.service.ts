import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { buildListParams } from './list-params';

@Injectable()
export class UsedPortService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  list(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
      ],
      excludeSortby: ['service.name'],
    });
    return this.http
      .get('/api/v1/services/usedports', {params: params});
  }

  deleteById(id: number, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/services/usedports/${id}`, options);
  }

  deleteByServiceId(serviceId: number): Observable<any> {
    const options: any = {};
    let params = new HttpParams();
    params = params.set('serviceId', serviceId + '');
    options.params = params;
    return this.http
      .delete(`/api/v1/services/usedports`, options);
  }

  getById(id: number): Observable<any> {
    return this.http
      .get(`/api/v1/services/usedports/${id}`);
  }

}
