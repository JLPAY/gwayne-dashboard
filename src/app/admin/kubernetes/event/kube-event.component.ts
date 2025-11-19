import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { AceEditorComponent } from '../../../shared/ace-editor/ace-editor.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { KubeResourceEvent } from '../../../shared/shared.const';
import { KubernetesNamespacedResource } from '../../../shared/base/kubernetes-namespaced/kubernetes-namespaced-resource';
import { DeletionDialogComponent } from '../../../shared/deletion-dialog/deletion-dialog.component';
import { ListEventComponent } from './list-event/list-event.component';
import { K8sGPTService } from '../../../shared/client/v1/k8sgpt.service';
import { DiagnoseRequest, DiagnoseResponse } from '../../../shared/model/v1/k8sgpt';

const showState = {
  'name': {hidden: false},
  'namespace': {hidden: false},
  'label': {hidden: true},
  'type': {hidden: false},
  'reason': {hidden: false},
  'source': {hidden: false},
  'message': {hidden: true},
  'age': {hidden: false},
};

@Component({
  selector: 'wayne-kube-event',
  templateUrl: './kube-event.component.html'
})

export class KubeEventComponent extends KubernetesNamespacedResource implements OnInit, OnDestroy {
  @ViewChild(ListEventComponent, { static: false })
  listResourceComponent: ListEventComponent;

  @ViewChild(AceEditorComponent, { static: false })
  aceEditorModal: AceEditorComponent;

  @ViewChild(DeletionDialogComponent, { static: false })
  deletionDialogComponent: DeletionDialogComponent;

  diagnoseResponse: DiagnoseResponse;
  diagnoseModalOpened: boolean = false;
  diagnosing: boolean = false;
  currentDiagnoseEvent: any;

  constructor(public kubernetesClient: KubernetesClient,
              public route: ActivatedRoute,
              public router: Router,
              public clusterService: ClusterService,
              public authService: AuthService,
              public messageHandlerService: MessageHandlerService,
              private k8sgptService: K8sGPTService) {
    super(kubernetesClient, route, router, clusterService, authService, messageHandlerService);
    super.registResourceType('event');
    super.registKubeResource(KubeResourceEvent);
    super.registShowSate(showState);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  // 诊断事件
  diagnoseEvent(event: any) {
    // 检查集群信息
    if (!this.cluster) {
      this.messageHandlerService.showError('请先选择集群');
      return;
    }

    // 从事件对象中获取命名空间
    const eventNamespace = event && event.metadata && event.metadata.namespace 
      ? event.metadata.namespace 
      : (this.namespace || 'default');

    if (!eventNamespace) {
      this.messageHandlerService.showError('无法获取事件命名空间信息');
      return;
    }

    this.currentDiagnoseEvent = event;
    this.diagnoseModalOpened = true;
    this.diagnosing = true;
    this.diagnoseResponse = null;

    console.log('开始诊断事件:', { 
      cluster: this.cluster, 
      namespace: eventNamespace,
      eventName: event.metadata.name,
      eventType: event.type
    });

    // 使用通用诊断接口，诊断指定命名空间的事件
    const diagnoseRequest: DiagnoseRequest = {
      cluster: this.cluster,
      namespace: eventNamespace,
      resourceType: 'Event',
      resourceName: event.metadata.name, // 传递 Event 名称
      filters: ['Event'],
      explain: true,
      language: '中文'
    };

    this.k8sgptService.diagnose(diagnoseRequest).subscribe(
      response => {
        console.log('诊断响应:', response);
        // 兼容不同的响应格式
        if (response && response.data) {
          this.diagnoseResponse = response.data;
        } else if (response) {
          this.diagnoseResponse = response;
        } else {
          this.diagnoseResponse = null;
          this.messageHandlerService.showError('诊断响应格式错误');
        }
        this.diagnosing = false;
      },
      error => {
        console.error('诊断事件失败:', error);
        console.error('错误详情:', {
          status: error && error.status,
          statusText: error && error.statusText,
          error: error && error.error,
          message: error && error.message,
          cluster: this.cluster,
          namespace: this.namespace
        });
        
        // 解析错误信息
        let errorMessage = '诊断失败';
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

        // 针对特定的后端配置错误提供友好提示
        const lowerErrorMessage = errorMessage.toLowerCase();
        if (lowerErrorMessage.includes('no configuration has been provided') || 
            lowerErrorMessage.includes('kubernetes_master') ||
            lowerErrorMessage.includes('invalid configuration')) {
          errorMessage = `K8sGPT 服务未正确配置 Kubernetes 客户端。\n` +
                        `集群: ${this.cluster}\n` +
                        `请检查后端 K8sGPT 服务是否正确配置了集群 "${this.cluster}" 的 Kubernetes 连接信息。`;
        } else if (lowerErrorMessage.includes('failed to create analysis') || 
                   lowerErrorMessage.includes('initialising kubernetes client') ||
                   lowerErrorMessage.includes('failed to build k8sgpt client')) {
          errorMessage = `无法初始化 Kubernetes 客户端。\n` +
                        `集群: ${this.cluster}\n` +
                        `请检查后端 K8sGPT 配置，确保集群 "${this.cluster}" 的 Kubernetes 配置正确。`;
        } else if (error && error.status === 500) {
          const eventNamespace = this.currentDiagnoseEvent && this.currentDiagnoseEvent.metadata && this.currentDiagnoseEvent.metadata.namespace
            ? this.currentDiagnoseEvent.metadata.namespace
            : (this.namespace || '未知');
          errorMessage = `服务器内部错误 (500)。\n` +
                        `集群: ${this.cluster}\n` +
                        `命名空间: ${eventNamespace}\n` +
                        `错误: ${errorMessage}`;
        }

        this.messageHandlerService.showError(errorMessage);
        this.diagnoseResponse = null;
        this.diagnosing = false;
      }
    );
  }

  closeDiagnoseModal() {
    this.diagnoseModalOpened = false;
    this.diagnoseResponse = null;
    this.currentDiagnoseEvent = null;
  }
} 