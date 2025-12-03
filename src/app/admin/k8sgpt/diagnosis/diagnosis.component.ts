import { Component, OnInit } from '@angular/core';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { K8sGPTDiagnosisService } from '../../../shared/client/v1/k8sgpt-diagnosis.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AIBackendService } from '../../../shared/client/v1/aibackend.service';
import { DiagnosisRequest, DiagnosisResult, AnalyzerInfo, AIBackend } from '../../../shared/model/v1/aibackend';
import { Cluster } from '../../../shared/model/v1/cluster';

@Component({
  selector: 'wayne-diagnosis',
  templateUrl: './diagnosis.component.html',
  styleUrls: ['./diagnosis.component.scss']
})
export class DiagnosisComponent implements OnInit {
  clusters: Cluster[] = [];
  backends: AIBackend[] = [];
  analyzers: AnalyzerInfo = { core: [], additional: [], integration: [] };
  
  selectedCluster: string = '';
  selectedNamespace: string = '';
  selectedBackend: number;
  selectedFilters: string[] = [];
  filterStates: { [key: string]: boolean } = {}; // 用于跟踪每个分析器的选中状态
  
  isAnalyzing = false;
  results: DiagnosisResult[] = [];
  showResults = false;

  constructor(
    private diagnosisService: K8sGPTDiagnosisService,
    private clusterService: ClusterService,
    private aibackendService: AIBackendService,
    private messageHandlerService: MessageHandlerService
  ) {}

  ngOnInit() {
    this.loadClusters();
    this.loadBackends();
    this.loadAnalyzers();
  }

  loadClusters() {
    this.clusterService.getNames().subscribe(
      response => {
        this.clusters = response.data || [];
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  loadBackends() {
    this.aibackendService.list().subscribe(
      response => {
        this.backends = response.data || [];
        // 设置默认后端
        const defaultBackend = this.backends.find(b => b.isDefault && b.enabled);
        if (defaultBackend) {
          this.selectedBackend = defaultBackend.id;
        }
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  loadAnalyzers() {
    this.diagnosisService.listAnalyzers().subscribe(
      response => {
        console.log('Analyzers API response:', response);
        if (response && response.code === 200 && response.data) {
          this.analyzers = {
            core: Array.isArray(response.data.core) ? response.data.core : [],
            additional: Array.isArray(response.data.additional) ? response.data.additional : [],
            integration: Array.isArray(response.data.integration) ? response.data.integration : []
          };
          // 初始化所有分析器的状态为未选中
          this.analyzers.core.forEach(a => {
            if (a) this.filterStates[a] = false;
          });
          this.analyzers.additional.forEach(a => {
            if (a) this.filterStates[a] = false;
          });
          this.analyzers.integration.forEach(a => {
            if (a) this.filterStates[a] = false;
          });
          console.log('Loaded analyzers - core:', this.analyzers.core.length, 
                     'additional:', this.analyzers.additional.length,
                     'integration:', this.analyzers.integration.length);
        } else {
          console.warn('Invalid response format:', response);
          this.analyzers = { core: [], additional: [], integration: [] };
          this.messageHandlerService.showError('获取分析器列表失败，请检查后端服务');
        }
      },
      error => {
        console.error('Failed to load analyzers:', error);
        this.messageHandlerService.handleError(error);
        this.analyzers = { core: [], additional: [], integration: [] };
      }
    );
  }

  onFilterChange(filter: string, event: any) {
    const checked = event && event.target ? event.target.checked : false;
    console.log('Filter change:', filter, checked, event);
    this.filterStates[filter] = checked;
    
    if (checked) {
      if (!this.selectedFilters.includes(filter)) {
        this.selectedFilters.push(filter);
      }
    } else {
      const index = this.selectedFilters.indexOf(filter);
      if (index > -1) {
        this.selectedFilters.splice(index, 1);
      }
    }
    console.log('Selected filters:', this.selectedFilters);
  }
  
  toggleFilter(filter: string) {
    const currentState = this.filterStates[filter] || false;
    this.filterStates[filter] = !currentState;
    
    if (!currentState) {
      if (!this.selectedFilters.includes(filter)) {
        this.selectedFilters.push(filter);
      }
    } else {
      const index = this.selectedFilters.indexOf(filter);
      if (index > -1) {
        this.selectedFilters.splice(index, 1);
      }
    }
  }

  isFilterSelected(filter: string): boolean {
    return this.filterStates[filter] || false;
  }

  analyze() {
    if (!this.selectedCluster) {
      this.messageHandlerService.showError('请选择集群');
      return;
    }

    this.isAnalyzing = true;
    this.showResults = false;
    this.results = [];

    const request: DiagnosisRequest = {
      clusterName: this.selectedCluster,
      namespace: this.selectedNamespace || undefined,
      filters: this.selectedFilters.length > 0 ? this.selectedFilters : undefined,
      backendID: this.selectedBackend || undefined
    };

    this.diagnosisService.analyze(request).subscribe(
      response => {
        this.isAnalyzing = false;
        this.results = response.data.results || [];
        this.showResults = true;
        if (this.results.length === 0) {
          this.messageHandlerService.showSuccess('诊断完成，未发现任何问题');
        } else {
          this.messageHandlerService.showSuccess(`诊断完成，发现 ${this.results.length} 个问题`);
        }
      },
      error => {
        this.isAnalyzing = false;
        this.messageHandlerService.handleError(error);
      }
    );
  }

  getErrorText(result: DiagnosisResult): string {
    let text = '';
    
    // 优先使用 Details 字段（AI生成的详细说明）
    if (result.details && result.details.trim()) {
      text = result.details.trim();
    } else {
      // 如果没有 Details，从 error 数组中提取文本
      const errorTexts: string[] = [];
      if (result.error && Array.isArray(result.error) && result.error.length > 0) {
        result.error.forEach(failure => {
          if (failure && failure.text && failure.text.trim()) {
            errorTexts.push(failure.text);
          }
        });
      }
      
      // 如果 error 数组有内容，返回错误文本
      if (errorTexts.length > 0) {
        text = errorTexts.join('; ');
      } else {
        // 如果都没有，返回默认文本
        return '未提供问题描述';
      }
    }
    
    // 清理文本：移除提示词前缀
    text = this.cleanResponseText(text);
    
    return text || '未提供问题描述';
  }

  private cleanResponseText(text: string): string {
    if (!text) {
      return text;
    }

    let cleaned = text.trim();

    // 移除常见的提示词前缀
    const prefixes = [
      'I am a noop response to the prompt ',
      '请用中文详细解释以下Kubernetes资源问题：',
      '请用中文详细解释以下Kubernetes资源问题:',
      '以下是对Kubernetes资源问题的详细解释：',
      '以下是对Kubernetes资源问题的详细解释:',
    ];

    for (const prefix of prefixes) {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    }

    // 移除可能的资源信息前缀（如 "Pod/namespace/name: "）
    const resourcePattern = /^[A-Za-z]+\/[^:]+:\s*/;
    if (resourcePattern.test(cleaned)) {
      cleaned = cleaned.replace(resourcePattern, '').trim();
    }

    return cleaned || text; // 如果清理后为空，返回原始文本
  }
}

