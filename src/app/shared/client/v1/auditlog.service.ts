import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { HttpClient, HttpParams } from '@angular/common/http';
import { buildListParams } from './list-params';

@Injectable()
export class AuditLogService {
  constructor(private http: HttpClient) {
  }

  listPage(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState, {
      dynamicSource: 'filters',
    });

    return this.http
      .get('/api/v1/auditlogs', {params: params});
  }
}
