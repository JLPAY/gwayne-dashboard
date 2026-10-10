import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../model/v1/user';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { buildListParams } from './list-params';

@Injectable()
export class UserService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listUser(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState);
    return this.http
      .get('/api/v1/users', {params: params});
  }

  createUser(user: User): Observable<any> {
    return this.http
      .post(`/api/v1/users`, user, this.options);
  }

  getNames(): Observable<any> {
    return this.http.get('/api/v1/users/names');
  }

  updateUser(user: User): Observable<any> {
    return this.http
      .put(`/api/v1/users/${user.id}`, user, this.options);
  }

  updateUserAdmin(user: User): Observable<any> {
    return this.http
      .put(`/api/v1/users/${user.id}/admin`, user, this.options);
  }

  resetPassword(user: User): Observable<any> {
    return this.http
      .put(`/api/v1/users/${user.id}/resetpassword`, user, this.options);
  }

  deleteUser(userId: number): Observable<any> {
    const options: any = {};
    return this.http
      .delete(`/api/v1/users/${userId}`, options);
  }

  getUser(userId: number): Observable<any> {
    return this.http
      .get(`/api/v1/users/${userId}`);
  }

  getStatistics(): Observable<any> {
    return this.http
      .get('/api/v1/users/statistics');
  }

}
