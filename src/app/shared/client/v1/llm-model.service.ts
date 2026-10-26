import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LLMModel {
  id?: number;
  name: string;
  provider: string;      // deepseek, openai, moonshot, zhipu, ollama, azure, custom
  apiKey?: string;
  baseURL?: string;
  model: string;
  temperature?: number;
  enabled: boolean;
  isDefault?: boolean;
  description?: string;
  config?: string;
  apiKeySet?: boolean;
  createTime?: string;
  updateTime?: string;
  user?: string;
}

export interface LLMModelTestResult {
  success: boolean;
  reply?: string;
  error?: string;
  durationMs: number;
  model: string;
}

@Injectable({ providedIn: 'root' })
export class LLMModelService {
  headers = new HttpHeaders({ 'Content-type': 'application/json' });
  options = { 'headers': this.headers };

  constructor(private http: HttpClient) {
  }

  listModels(): Observable<any> {
    return this.http.get('/api/v1/llm-models', this.options);
  }

  getModel(id: number): Observable<any> {
    return this.http.get(`/api/v1/llm-models/${id}`, this.options);
  }

  createModel(model: LLMModel): Observable<any> {
    return this.http.post('/api/v1/llm-models', model, this.options);
  }

  updateModel(model: LLMModel): Observable<any> {
    return this.http.put(`/api/v1/llm-models/${model.id}`, model, this.options);
  }

  deleteModel(id: number): Observable<any> {
    return this.http.delete(`/api/v1/llm-models/${id}`, this.options);
  }

  setDefaultModel(id: number): Observable<any> {
    return this.http.put(`/api/v1/llm-models/${id}/default`, {}, this.options);
  }

  testModel(id: number): Observable<any> {
    return this.http.post(`/api/v1/llm-models/${id}/test`, {}, this.options);
  }

  // testModelConfig 保存前连通性测试：直接使用表单当前配置，
  // 编辑时 apiKey 留空/为掩码则由后端自动回退使用原密钥。
  testModelConfig(config: Partial<LLMModel>): Observable<any> {
    return this.http.post('/api/v1/llm-models/test', config, this.options);
  }

  // diagnosisAvailable 查询是否存在可用的 LLM 模型（默认或启用中），
  // 用于前端决定是否展示「Pod AI 排查」入口，避免在无模型时暴露不可用功能。
  diagnosisAvailable(): Observable<any> {
    return this.http.get('/api/v1/diagnosis/available', this.options);
  }
}
