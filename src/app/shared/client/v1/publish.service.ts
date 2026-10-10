import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { buildListParams } from './list-params';

@Injectable()
export class PublishService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listHistories(pageState: PageState, type?: number, resourceId?: number): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['type', type + ''],
        ['resourceId', resourceId + ''],
        ['sortby', '-id'],
      ],
    });

    return this.http
      .get('/api/v1/publish/histories', {params: params});
  }

  listStatus(type?: number, resourceId?: number): Observable<any> {
    let params = new HttpParams();
    params = params.set('type', type + '');
    params = params.set('resourceId', resourceId + '');
    return this.http
      .get('/api/v1/publishstatus', {params: params});
  }

  getDeployStatistics(startTime: string, endTime: string): Observable<any> {
    let params = new HttpParams();
    params = params.set('start_time', startTime);
    params = params.set('end_time', endTime);
    return this.http
      .get('/api/v1/publish/statistics', {params: params});
  }

}
