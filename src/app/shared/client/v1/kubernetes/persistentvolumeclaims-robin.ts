import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { HttpClient } from '@angular/common/http';
export const robinBaseUrl = `/api/v1/kubernetes/apps/`;

@Injectable()
export class PersistentVolumeClaimRobinClient {
  constructor(private http: HttpClient) {
  }

  getStatus(appId: number, cluster: string, namespace: string, name: string): Observable<any> {
    return this.http
      .get(robinBaseUrl + `${appId}/persistentvolumeclaims/robin/${name}/status/namespaces/${namespace}/clusters/${cluster}`);
  }

  activeRbdImage(appId: number, cluster: string, namespace: string, name: string): Observable<any> {
    return this.http
      .post(robinBaseUrl + `${appId}/persistentvolumeclaims/robin/${name}/rbd/namespaces/${namespace}/clusters/${cluster}`, null);
  }

  inActiveRbdImage(appId: number, cluster: string, namespace: string, name: string): Observable<any> {
    return this.http
      .delete(robinBaseUrl + `${appId}/persistentvolumeclaims/robin/${name}/rbd/namespaces/${namespace}/clusters/${cluster}`);
  }

  offlineRbdImageUser(appId: number, cluster: string, namespace: string, name: string): Observable<any> {
    return this.http
      .delete(robinBaseUrl + `${appId}/persistentvolumeclaims/robin/${name}/user/namespaces/${namespace}/clusters/${cluster}`);
  }

  loginInfo(appId: number, cluster: string, namespace: string, name: string): Observable<any> {
    return this.http
      .get(robinBaseUrl + `${appId}/persistentvolumeclaims/robin/${name}/user/namespaces/${namespace}/clusters/${cluster}`);
  }

  verify(appId: number, cluster: string, namespace: string, name: string): Observable<any> {
    return this.http
      .get(robinBaseUrl + `${appId}/persistentvolumeclaims/robin/${name}/verify/namespaces/${namespace}/clusters/${cluster}`);
  }

  listSnapshot(appId: number, cluster: string, namespace: string, name: string): Observable<any> {
    return this.http
      .get(robinBaseUrl + `${appId}/persistentvolumeclaims/robin/${name}/snapshot/namespaces/${namespace}/clusters/${cluster}`);
  }

  createSnapshot(appId: number, cluster: string, namespace: string, name: string, version: string): Observable<any> {
    return this.http
      .post(
        robinBaseUrl +
        `${appId}/persistentvolumeclaims/robin/${name}/snapshot/${version}/namespaces/${namespace}/clusters/${cluster}`, null);
  }

  deleteSnapshot(appId: number, cluster: string, namespace: string, name: string, version: string): Observable<any> {
    return this.http
      .delete(robinBaseUrl +
        `${appId}/persistentvolumeclaims/robin/${name}/snapshot/${version}/namespaces/${namespace}/clusters/${cluster}`);
  }

  deleteAllSnapshot(appId: number, cluster: string, namespace: string, name: string): Observable<any> {
    return this.http
      .delete(robinBaseUrl +
        `${appId}/persistentvolumeclaims/robin/${name}/snapshot/namespaces/${namespace}/clusters/${cluster}`);
  }

  rollBackSnapshot(appId: number, cluster: string, namespace: string, name: string, version: string): Observable<any> {
    return this.http
      .put(robinBaseUrl +
        `${appId}/persistentvolumeclaims/robin/${name}/snapshot/${version}/namespaces/${namespace}/clusters/${cluster}`, null);
  }

}
