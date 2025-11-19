// K8sGPT AI 提供者模型
export class AIProvider {
  name: string = '';
  model?: string;
  password?: string;
  baseurl?: string;
  temperature?: number;
  providerregion?: string;
  isDefault?: boolean;
  enabled?: boolean;
}

// AI 提供者列表响应
export interface AIProviderListResponse {
  data?: {
    providers?: AIProvider[];
    defaultprovider?: string;
    defaultProvider?: string;
  } | AIProvider[];
  providers?: AIProvider[];
  defaultprovider?: string;
  defaultProvider?: string;
}

// K8sGPT 诊断请求
export class DiagnoseRequest {
  cluster: string;
  namespace?: string;
  resourceType?: string;
  resourceName?: string;
  filters?: string[];
  explain?: boolean;
  backend?: string;
  language?: string;
}

// K8sGPT 诊断结果
export class DiagnoseResult {
  kind: string;
  name: string;
  errors: string[];
  details?: string;
}

// K8sGPT 诊断响应
export class DiagnoseResponse {
  status: string;
  problems: number;
  provider?: string;
  results: DiagnoseResult[];
}

// AI 后端信息
export interface AIBackend {
  name: string;
  displayName: string;
  description?: string;
}

// AI 后端列表响应
export interface AIBackendListResponse {
  data?: AIBackend[] | { [key: string]: AIBackend };
  [key: string]: any;
}

// AI 解释请求
export class ExplainRequest {
  cluster: string;
  kind: string;
  name: string;
  errors: string[];
  backend?: string;
  language?: string;
}

// AI 解释结果
export class ExplainResult {
  explanation: string;
  provider?: string;
}

