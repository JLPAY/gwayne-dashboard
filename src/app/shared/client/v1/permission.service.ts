import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { Permission } from '../../model/v1/permission';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { buildListParams } from './list-params';

@Injectable()
export class PermissionService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listPermission(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState);
    return this.http
      .get('/api/v1/permissions', {params: params});
  }

  createPermission(permission: Permission): Observable<any> {
    return this.http
      .post(`/api/v1/permissions`, permission, this.options);
  }

  updatePermission(permission: Permission): Observable<any> {
    return this.http
      .put(`/api/v1/permissions/${permission.id}`, permission, this.options);
  }

  deletePermission(permissionId: number): Observable<any> {
    const options: any = {};
    return this.http
      .delete(`/api/v1/permissions/${permissionId}`, options);
  }

  getPermission(permissionId: number): Observable<any> {
    return this.http
      .get(`/api/v1/permissions/${permissionId}`);
  }

  initDict(): Observable<any> {
    return this.http
      .get(`/api/v1/permissions/init`);
  }
}
