import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PageState } from '../../page/page-state';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Notification } from '../../model/v1/notification';
import { buildListParams } from './list-params';

@Injectable()
export class NotificationService {

  constructor(private http: HttpClient) {
  }

  query(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState, {
      trailingLiterals: [
        ['sortby', '-id'],
      ],
      omitDynamicParams: true,
      omitFilters: true,
      omitSortOverride: true,
    });
    return this.http
      .get(`/api/v1/notifications`, {params: params});
  }

  publish(id): Observable<any> {
    return this.http
      .put(`/api/v1/notifications?id=` + id, {});
  }

  subscribe(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState, {
      trailingLiterals: [
        ['sortby', '-id'],
      ],
      omitDynamicParams: true,
      omitFilters: true,
      omitSortOverride: true,
    });
    // params = params.set('is_readed', pageState.params['is_readed'])
    return this.http
      .get(`/api/v1/notifications/subscribe`, {params: params});
  }

  read(id): Observable<any> {
    return this.http
      .put(`/api/v1/notifications/subscribe?id=` + id, {});
  }

  create(notify: Notification): Observable<any> {
    return this.http
      .post(`/api/v1/notifications`, notify);
  }

}
