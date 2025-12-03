export class AIBackend {
  id: number;
  name: string;
  provider: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  temperature: number;
  enabled: boolean;
  isDefault: boolean;
  description?: string;
  config?: string;
  createTime?: Date;
  updateTime?: Date;
  user?: string;
  deleted: boolean;
  checked: boolean;

  constructor(name?: string, checked?: boolean) {
    if (name) {
      this.name = name;
    }
    if (checked) {
      this.checked = checked;
    }
    this.temperature = 0.7;
    this.enabled = true;
    this.isDefault = false;
    this.deleted = false;
  }
}

export class DiagnosisRequest {
  clusterName: string;
  namespace?: string;
  filters?: string[];
  backendID?: number;
}

export class DiagnosisResult {
  kind: string;
  name: string;
  error: DiagnosisFailure[];
  details: string;
  parentObject: string;
}

export class DiagnosisFailure {
  text: string;
  kubernetesDoc: string;
  sensitive: DiagnosisSensitive[];
}

export class DiagnosisSensitive {
  unmasked: string;
  masked: string;
}

export class AnalyzerInfo {
  core: string[];
  additional: string[];
  integration: string[];
}

