import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
@Injectable()
export class SecretClient {
  constructor(private http: HttpClient) {
  }

  deploy(appId: number, cluster: string, resourceId: number, tplId: number, template: any): Observable<any> {
    return this.http
      .post(`/api/v1/kubernetes/apps/${appId}/secrets/${resourceId}/tpls/${tplId}/clusters/${cluster}`, template);
  }

}
