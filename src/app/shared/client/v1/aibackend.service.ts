import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';
import { AIBackend } from '../../model/v1/aibackend';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { throwError } from 'rxjs';

@Injectable()
export class AIBackendService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  list(): Observable<any> {
    return this.http
      .get('/api/v1/k8sgpt/ai-backends')
      .catch(error => throwError(error));
  }

  getById(id: number): Observable<any> {
    return this.http
      .get(`/api/v1/k8sgpt/ai-backends/${id}`)
      .catch(error => throwError(error));
  }

  create(backend: AIBackend): Observable<any> {
    return this.http
      .post('/api/v1/k8sgpt/ai-backends', backend, this.options)
      .catch(error => throwError(error));
  }

  update(backend: AIBackend): Observable<any> {
    return this.http
      .put(`/api/v1/k8sgpt/ai-backends/${backend.id}`, backend, this.options)
      .catch(error => throwError(error));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(`/api/v1/k8sgpt/ai-backends/${id}`)
      .catch(error => throwError(error));
  }

  setDefault(id: number): Observable<any> {
    return this.http
      .put(`/api/v1/k8sgpt/ai-backends/${id}/default`, {}, this.options)
      .catch(error => throwError(error));
  }
}

