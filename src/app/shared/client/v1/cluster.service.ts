import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { Cluster } from '../../model/v1/cluster';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TaintMetaData } from 'app/shared/model/v1/kubernetes/node-list';
import { buildListParams } from './list-params';

@Injectable()
export class ClusterService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};
  cluster: string;

  constructor(private http: HttpClient) {
  }

  getNames(): Observable<any> {
    return this.http
      .get('/api/v1/clusters/names');
  }

  list(pageState: PageState, deleted?: string): Observable<any> {
    const params = buildListParams(pageState, {
      literals: [
        ['deleted', deleted],
      ],
    });
    return this.http
      .get('/api/v1/clusters', {params: params});
  }

  create(cluster: Cluster): Observable<any> {
    return this.http
      .post(`/api/v1/clusters`, cluster, this.options);
  }

  update(cluster: Cluster): Observable<any> {
    return this.http
      .put(`/api/v1/clusters/${cluster.name}`, cluster, this.options);
  }

  deleteByName(name: string, logical?: boolean): Observable<any> {
    const options: any = {};
    if (logical != null) {
      let params = new HttpParams();
      params = params.set('logical', logical + '');
      options.params = params;
    }

    return this.http
      .delete(`/api/v1/clusters/${name}`, options);
  }

  getByName(name: string): Observable<any> {
    return this.http
      .get(`/api/v1/clusters/${name}`);
  }

  addLabels(name: string, cluster: string, label: Object) {
    return this.http
      .post(`/api/v1/kubernetes/nodes/${name}/clusters/${cluster}/labels`, label, this.options);
  }

  deleteLabels(name: string, cluster: string, label: Object) {
    return this.http.request('delete', `/api/v1/kubernetes/nodes/${name}/clusters/${cluster}/labels`, {
      body: label
    });
  }

  addTaint(name: string, cluster: string, taint: TaintMetaData) {
    return this.http
      .post(`/api/v1/kubernetes/nodes/${name}/clusters/${cluster}/taint`, taint);
  }

  deleteTaint(name: string, cluster: string, taint: TaintMetaData) {
    return this.http
      .request('delete', `/api/v1/kubernetes/nodes/${name}/clusters/${cluster}/taint`, {
        body: taint
      });
  }

  drainNode(name: string, cluster: string, options: any) {
    return this.http
      .post(`/api/v1/kubernetes/nodes/${name}/clusters/${cluster}/drain`, options, this.options);
  }

}
