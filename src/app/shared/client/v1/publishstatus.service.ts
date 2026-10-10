import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable()
export class PublishStatusService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listStatus(type?: number, resourceId?: number): Observable<any> {
    let params = new HttpParams();
    params = params.set('type', type + '');
    params = params.set('resourceId', resourceId + '');
    return this.http
      .get('/api/v1/publishstatus', {params: params});
  }

  deleteById(id: number): Observable<any> {
    return this.http
      .delete(`/api/v1/publishstatus/${id}`);
  }

}
