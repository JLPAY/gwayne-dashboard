import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppStarred } from '../../model/v1/app-starred';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable()
export class AppStarredService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  create(app: AppStarred): Observable<any> {
    return this.http
      .post(`/api/v1/apps/stars`, app, this.options);
  }

  deleteByAppId(appId: number): Observable<any> {
    return this.http
      .delete(`/api/v1/apps/stars/${appId}`);
  }

}
