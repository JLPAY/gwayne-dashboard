import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EdgeNode } from '../../model/v1/edge-node';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { buildListParams } from './list-params';

@Injectable()
export class EdgeNodeService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  getByCluster(cluster: string): Observable<any> {
    return this.http
      .get(`/api/v1/services/edgenodes/cluster/${cluster}`);
  }

  list(pageState: PageState): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['sortby', '-id'],
      ],
    });
    return this.http
      .get('/api/v1/services/edgenodes', {params: params});
  }

  create(edgeNode: EdgeNode): Observable<any> {
    return this.http
      .post(`/api/v1/services/edgenodes`, edgeNode, this.options);
  }

  update(edgeNode: EdgeNode): Observable<any> {
    return this.http
      .put(`/api/v1/services/edgenodes/${edgeNode.id}`, edgeNode, this.options);
  }

  deleteById(id: number): Observable<any> {
    return this.http
      .delete(`/api/v1/services/edgenodes/${id}`);
  }

  getById(id: number): Observable<any> {
    return this.http
      .get(`/api/v1/services/edgenodes/${id}`);
  }

}
