import { Component, Input, OnInit } from '@angular/core';
import { DiagnoseResponse, DiagnoseResult, ExplainRequest, ExplainResult } from '../model/v1/k8sgpt';
import { K8sGPTService } from '../client/v1/k8sgpt.service';
import { MessageHandlerService } from '../message-handler/message-handler.service';

@Component({
  selector: 'wayne-k8sgpt-diagnose-result',
  templateUrl: './k8sgpt-diagnose-result.component.html',
  styleUrls: ['./k8sgpt-diagnose-result.component.scss']
})
export class K8sGPTDiagnoseResultComponent implements OnInit {
  @Input() diagnoseResponse: DiagnoseResponse;
  @Input() loading: boolean = false;
  @Input() cluster: string = '';

  explainingResultIndex: number = -1;
  explainResults: { [key: number]: ExplainResult } = {};

  constructor(
    private k8sgptService: K8sGPTService,
    private messageHandlerService: MessageHandlerService
  ) { }

  ngOnInit() {
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ProblemDetected':
        return 'status-error';
      case 'NoProblem':
        return 'status-success';
      case 'Error':
        return 'status-error';
      default:
        return 'status-warning';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'ProblemDetected':
        return '检测到问题';
      case 'NoProblem':
        return '未发现问题';
      case 'Error':
        return '诊断错误';
      default:
        return '未知状态';
    }
  }

  explainResult(result: DiagnoseResult, index: number) {
    if (!this.cluster) {
      this.messageHandlerService.showError('缺少集群信息');
      return;
    }

    if (!result.errors || result.errors.length === 0) {
      this.messageHandlerService.showError('没有错误信息需要解释');
      return;
    }

    this.explainingResultIndex = index;
    const explainRequest: ExplainRequest = {
      cluster: this.cluster,
      kind: result.kind,
      name: result.name,
      errors: result.errors,
      language: '中文'
    };

    this.k8sgptService.explain(explainRequest).subscribe(
      response => {
        if (response && response.data) {
          this.explainResults[index] = response.data;
        } else if (response) {
          this.explainResults[index] = response;
        } else {
          this.messageHandlerService.showError('AI 解释响应格式错误');
        }
        this.explainingResultIndex = -1;
      },
      error => {
        console.error('AI 解释失败:', error);
        let errorMessage = 'AI 解释失败';
        if (error && error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          }
        } else if (error && error.message) {
          errorMessage = error.message;
        }

        // 针对特定错误提供友好提示
        const lowerErrorMessage = errorMessage.toLowerCase();
        if (lowerErrorMessage.includes('does not exist') || 
            lowerErrorMessage.includes('not have access') ||
            lowerErrorMessage.includes('模型') ||
            lowerErrorMessage.includes('不存在')) {
          errorMessage = `AI 模型配置错误：${errorMessage}\n请检查 AI 引擎管理中的模型名称是否正确。`;
        } else if (lowerErrorMessage.includes('401') || 
                   lowerErrorMessage.includes('unauthorized') ||
                   lowerErrorMessage.includes('认证')) {
          errorMessage = `AI 服务认证失败：${errorMessage}\n请检查 AI 引擎管理中的 API Key 是否正确。`;
        } else if (error && error.status === 400) {
          errorMessage = `配置错误：${errorMessage}\n请检查 AI 引擎配置。`;
        }

        this.messageHandlerService.showError(errorMessage);
        this.explainingResultIndex = -1;
      }
    );
  }

  isExplaining(index: number): boolean {
    return this.explainingResultIndex === index;
  }

  hasExplanation(index: number): boolean {
    return this.explainResults[index] !== undefined;
  }

  getExplanation(index: number): string {
    const result = this.explainResults[index];
    return result ? result.explanation : '';
  }
}

