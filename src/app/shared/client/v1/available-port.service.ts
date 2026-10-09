import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { AvailablePort } from '../../model/v1/available-port';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { buildListParams } from './list-params';

@Injectable()
export class AvailablePortService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  getLvs(): Observable<any> {
    return this.http
      .get(`/api/v1/services/availableports/lvs`);
  }

  list(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
      ],
    });
    return this.http
      .get('/api/v1/services/availableports', {params: params});
  }

  create(availablePort: AvailablePort): Observable<any> {
    return this.http
      .post(`/api/v1/services/availableports`, availablePort, this.options);
  }

  update(availablePort: AvailablePort): Observable<any> {
    return this.http
      .put(`/api/v1/services/availableports/${availablePort.id}`, availablePort, this.options);
  }

  deleteById(id: number): Observable<any> {
    return this.http
      .delete(`/api/v1/services/availableports/${id}`);
  }

  getById(id: number): Observable<any> {
    return this.http
      .get(`/api/v1/services/availableports/${id}`);
  }

  getByPort(port: number): Observable<any> {
    return this.http
      .get(`/api/v1/services/availableports/port/${port}`);
  }

}
