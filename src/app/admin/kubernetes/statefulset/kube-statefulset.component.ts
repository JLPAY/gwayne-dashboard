import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { AceEditorComponent } from '../../../shared/ace-editor/ace-editor.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { KubeResourceStatefulSet } from '../../../shared/shared.const';
import { KubernetesNamespacedResource } from '../../../shared/base/kubernetes-namespaced/kubernetes-namespaced-resource';
import { DeletionDialogComponent } from '../../../shared/deletion-dialog/deletion-dialog.component';
import { MigrationComponent } from './migration/migration.component';
import { ListStatefulsetComponent } from './list-statefulset/list-statefulset.component';
import { K8sGPTService } from '../../../shared/client/v1/k8sgpt.service';
import { DiagnoseRequest, DiagnoseResponse } from '../../../shared/model/v1/k8sgpt';

const showState = {
  'name': {hidden: false},
  'namespace': {hidden: false},
  'label': {hidden: false},
  'containers': {hidden: false},
  'status': {hidden: false},
  'age': {hidden: false},
};

@Component({
  selector: 'wayne-kube-statefulset',
  templateUrl: './kube-statefulset.component.html',
  styleUrls: ['./kube-statefulset.component.scss']
})

export class KubeStatefulsetComponent extends KubernetesNamespacedResource implements OnInit, OnDestroy {
  @ViewChild(ListStatefulsetComponent, { static: false })
  listResourceComponent: ListStatefulsetComponent;

  @ViewChild(AceEditorComponent, { static: false })
  aceEditorModal: AceEditorComponent;

  @ViewChild(DeletionDialogComponent, { static: false })
  deletionDialogComponent: DeletionDialogComponent;

  @ViewChild(MigrationComponent, { static: false })
  migrationComponent: MigrationComponent;

  diagnoseResponse: DiagnoseResponse;
  diagnoseModalOpened: boolean = false;
  diagnosing: boolean = false;

  constructor(public kubernetesClient: KubernetesClient,
              public route: ActivatedRoute,
              public router: Router,
              public clusterService: ClusterService,
              public authService: AuthService,
              public messageHandlerService: MessageHandlerService,
              private k8sgptService: K8sGPTService) {
    super(kubernetesClient, route, router, clusterService, authService, messageHandlerService);
    super.registResourceType('statefulset');
    super.registKubeResource(KubeResourceStatefulSet);
    super.registShowSate(showState);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
  }


  migration(obj: any) {
    this.migrationComponent.openModal(this.cluster, obj);
  }

  jump(obj: any) {
    this.router.navigate(['../pod'], {relativeTo: this.route, queryParams: { uid: obj.metadata.uid }});
  }

  restart(obj: any) {
    const msg = `是否确认重启 StatefulSet ${obj.metadata.name}？`;
    const title = `重启确认`;
    this.deletionDialogComponent.open(title, msg, {obj: obj, action: 'restart'});
  }

  confirmRestartEvent(event: any) {
    this.kubernetesClient
      .restart(this.cluster, this.kubeResource, event.obj.metadata.name, event.obj.metadata.namespace)
      .subscribe(
        response => {
          this.retrieveResource();
          this.messageHandlerService.showSuccess('重启成功！');
        },
        error => {
          this.messageHandlerService.handleError(error);
        }
      );
  }

  confirmDeleteEvent(event: any) {
    if (event.action === 'restart') {
      this.confirmRestartEvent(event);
    } else {
      this.kubernetesClient
        .delete(this.cluster, this.kubeResource, event.force, event.obj.metadata.name, event.obj.metadata.namespace)
        .subscribe(
          response => {
            this.retrieveResource();
            this.messageHandlerService.showSuccess('ADMIN.KUBERNETES.MESSAGE.DELETE');
          },
          error => {
            this.messageHandlerService.handleError(error);
          }
        );
    }
  }

  // 诊断所有 StatefulSet
  diagnoseAllStatefulSets() {
    // 检查集群信息
    if (!this.cluster) {
      this.messageHandlerService.showError('请先选择集群');
      return;
    }

    this.diagnoseModalOpened = true;
    this.diagnosing = true;
    this.diagnoseResponse = null;

    // 如果命名空间为空或未选择，则不传递 namespace 参数，诊断所有命名空间的 StatefulSet
    const namespace = this.namespace && this.namespace.trim() !== '' ? this.namespace : undefined;

    console.log('开始诊断所有 StatefulSet:', { 
      cluster: this.cluster, 
      namespace: namespace || '所有命名空间'
    });

    // 使用通用诊断接口，诊断 StatefulSet
    // 如果指定了命名空间，则诊断该命名空间的 StatefulSet；否则诊断所有命名空间的 StatefulSet
    const diagnoseRequest: DiagnoseRequest = {
      cluster: this.cluster,
      namespace: namespace,
      resourceType: 'StatefulSet',
      filters: ['StatefulSet'],
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
        console.error('诊断 StatefulSet 失败:', error);
        console.error('错误详情:', {
          status: error && error.status,
          statusText: error && error.statusText,
          error: error && error.error,
          message: error && error.message,
          cluster: this.cluster,
          namespace: namespace
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
        const namespaceDisplay = namespace || '所有命名空间';
        const lowerErrorMessage = errorMessage.toLowerCase();
        if (lowerErrorMessage.includes('no configuration has been provided') || 
            lowerErrorMessage.includes('kubernetes_master') ||
            lowerErrorMessage.includes('invalid configuration')) {
          errorMessage = `K8sGPT 服务未正确配置 Kubernetes 客户端。\n` +
                        `集群: ${this.cluster}\n` +
                        `命名空间: ${namespaceDisplay}\n` +
                        `请检查后端 K8sGPT 服务是否正确配置了集群 "${this.cluster}" 的 Kubernetes 连接信息。`;
        } else if (lowerErrorMessage.includes('failed to create analysis') || 
                   lowerErrorMessage.includes('initialising kubernetes client') ||
                   lowerErrorMessage.includes('failed to build k8sgpt client')) {
          errorMessage = `无法初始化 Kubernetes 客户端。\n` +
                        `集群: ${this.cluster}\n` +
                        `命名空间: ${namespaceDisplay}\n` +
                        `请检查后端 K8sGPT 配置，确保集群 "${this.cluster}" 的 Kubernetes 配置正确。`;
        } else if (error && error.status === 500) {
          errorMessage = `服务器内部错误 (500)。\n` +
                        `集群: ${this.cluster}\n` +
                        `命名空间: ${namespaceDisplay}\n` +
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
  }
}
