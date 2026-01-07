import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import { throwError } from 'rxjs';

export interface TerminalCommandRule {
  id?: number;
  role: string;
  cluster?: string; // 集群名称，空字符串表示所有集群
  ruleType: number; // 0-黑名单，1-白名单
  command: string;
  description?: string;
  enabled: boolean;
  createTime?: string;
  updateTime?: string;
}

@Injectable()
export class TerminalCommandRuleService {
  headers = new HttpHeaders({'Content-type': 'application/json'});
  options = {'headers': this.headers};

  constructor(private http: HttpClient) {
  }

  listRules(): Observable<any> {
    return this.http
      .get('/api/v1/terminal/command-rules', this.options)
      .catch(error => throwError(error));
  }

  getRule(id: number): Observable<any> {
    return this.http
      .get(`/api/v1/terminal/command-rules/${id}`, this.options)
      .catch(error => throwError(error));
  }

  createRule(rule: TerminalCommandRule): Observable<any> {
    return this.http
      .post('/api/v1/terminal/command-rules', rule, this.options)
      .catch(error => throwError(error));
  }

  updateRule(rule: TerminalCommandRule): Observable<any> {
    return this.http
      .put(`/api/v1/terminal/command-rules/${rule.id}`, rule, this.options)
      .catch(error => throwError(error));
  }

  deleteRule(id: number): Observable<any> {
    return this.http
      .delete(`/api/v1/terminal/command-rules/${id}`, this.options)
      .catch(error => throwError(error));
  }

  getRulesByRole(role: string): Observable<any> {
    return this.http
      .get(`/api/v1/terminal/command-rules/role/${role}`, this.options)
      .catch(error => throwError(error));
  }
}

