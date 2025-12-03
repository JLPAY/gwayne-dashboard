import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';
import { DiagnosisRequest, AnalyzerInfo } from '../../model/v1/aibackend';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { throwError } from 'rxjs';

@Injectable()
export class K8sGPTDiagnosisService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  analyze(request: DiagnosisRequest): Observable<any> {
    return this.http
      .post('/api/v1/k8sgpt/diagnosis/analyze', request, this.options)
      .catch(error => throwError(error));
  }

  analyzeByCluster(clusterName: string, namespace?: string, filters?: string[], backendID?: number): Observable<any> {
    let params = new HttpParams();
    if (namespace) {
      params = params.set('namespace', namespace);
    }
    if (backendID) {
      params = params.set('backendID', backendID.toString());
    }
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        params = params.append('filters', filter);
      });
    }

    return this.http
      .get(`/api/v1/k8sgpt/diagnosis/clusters/${clusterName}`, {params: params})
      .catch(error => throwError(error));
  }

  listAnalyzers(): Observable<any> {
    return this.http
      .get('/api/v1/k8sgpt/diagnosis/analyzers')
      .catch(error => throwError(error));
  }
}

