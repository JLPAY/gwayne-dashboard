import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Group } from '../../model/v1/group';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { buildListParams, ListParamPair } from './list-params';

@Injectable()
export class GroupService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listGroup(pageState: PageState, type?: number): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ...((typeof (type) !== 'undefined') ? [['type', type + '']] as ListParamPair[] : []),
      ],
    });

    return this.http
      .get('/api/v1/groups', {params: params});
  }

  createGroup(group: Group): Observable<any> {
    return this.http
      .post(`/api/v1/groups`, group, this.options);
  }

  updateGroup(group: Group): Observable<any> {
    return this.http
      .put(`/api/v1/groups/${group.id}`, group, this.options);
  }

  deleteGroup(groupId: number): Observable<any> {
    const options: any = {};
    return this.http
      .delete(`/api/v1/groups/${groupId}`, options);
  }

  getGroup(groupId: number): Observable<any> {
    return this.http
      .get(`/api/v1/groups/${groupId}`);
  }

  initGroup(): Observable<any> {
    return this.http.get(`/api/v1/groups/init`);
  }
}
