import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationDialogService } from '../../../shared/confirmation-dialog/confirmation-dialog.service';
import { ConfirmationMessage } from '../../../shared/confirmation-dialog/confirmation-message';
import { ConfirmationButtons, ConfirmationState, ConfirmationTargets } from '../../../shared/shared.const';
import { Subscription } from 'rxjs/Subscription';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { ListNodesComponent } from './list-nodes/list-nodes.component';
import { CreateEditDrainComponent } from './create-edit-drain/create-edit-drain.component';
import { Node } from '../../../shared/model/v1/kubernetes/node-list';
import { NodeClient } from '../../../shared/client/v1/kubernetes/node';
import { Inventory } from './list-nodes/inventory';
import { KubeNode, NodeSummary } from '../../../shared/model/v1/kubernetes/node';
import { AceEditorComponent } from '../../../shared/ace-editor/ace-editor.component';
import { K8sGPTService } from '../../../shared/client/v1/k8sgpt.service';
import { DiagnoseRequest, DiagnoseResponse } from '../../../shared/model/v1/k8sgpt';
const showState = {
  'name': {hidden: false},
  'label': {hidden: false},
  'taints': {hidden: true},
  'ready': {hidden: false},
  'schedulable': {hidden: false},
  'cpu': {hidden: false},
  'memory': {hidden: false},
  'kubeletVersion': {hidden: false},
  'age': {hidden: false},
  'kubeProxyVersion': {hidden: true},
  'osImage': {hidden: true},
  'kernelVersion': {hidden: true},
  'containerRuntimeVersion': {hidden: false}
};

@Component({
  selector: 'wayne-nodes',
  providers: [Inventory],
  templateUrl: './nodes.component.html',
  styleUrls: ['./nodes.component.scss']
})

export class NodesComponent implements OnInit, OnDestroy {
  @ViewChild(ListNodesComponent, { static: false })
  list: ListNodesComponent;

  @ViewChild(AceEditorComponent, { static: false })
  editNodeModal: AceEditorComponent;

  @ViewChild(CreateEditDrainComponent, { static: false })
  drainModal: CreateEditDrainComponent;


  showState: object = showState;

  cluster: string;
  clusters: Array<any>;
  nodes: Node[];
  showList: any[] = Array();
  resourceData: NodeSummary;

  subscription: Subscription;

  diagnoseResponse: DiagnoseResponse;
  diagnoseModalOpened: boolean = false;
  diagnosing: boolean = false;

  constructor(private nodeClient: NodeClient,
              private route: ActivatedRoute,
              private inventory: Inventory,
              private router: Router,
              private clusterService: ClusterService,
              private authService: AuthService,
              private messageHandlerService: MessageHandlerService,
              private deletionDialogService: ConfirmationDialogService,
              private k8sgptService: K8sGPTService) {
    this.subscription = deletionDialogService.confirmationConfirm$.subscribe(message => {
      if (message &&
        message.state === ConfirmationState.CONFIRMED &&
        message.source === ConfirmationTargets.NODE) {
        const data = message.data;
        
        // 根据数据中的 action 字段判断操作类型
        if (data && data.action === 'isolate') {
          this.nodeClient
            .cordonByName(data.name, this.cluster)
            .subscribe(
              response => {
                this.messageHandlerService.showSuccess('节点隔离成功！');
                this.retrieve();
              },
              error => {
                this.messageHandlerService.handleError(error);
              }
            );
        } else if (data && data.action === 'unisolate') {
          this.nodeClient
            .uncordonByName(data.name, this.cluster)
            .subscribe(
              response => {
                this.messageHandlerService.showSuccess('节点解除隔离成功！');
                this.retrieve();
              },
              error => {
                this.messageHandlerService.handleError(error);
              }
            );
        } else {
          // 默认删除操作
          const name = data;
          this.nodeClient
            .deleteByName(name, this.cluster)
            .subscribe(
              response => {
                this.messageHandlerService.showSuccess('节点删除成功！');
                this.retrieve();
              },
              error => {
                this.messageHandlerService.handleError(error);
              }
            );
        }
      }
    });
  }

  confirmEvent() {
    Object.keys(this.showState).forEach(key => {
      if (this.showList.indexOf(key) > -1) {
        this.showState[key] = {hidden: false};
      } else {
        this.showState[key] = {hidden: true};
      }
    });
  }

  cancelEvent() {
    this.initShow();
  }

  initShow() {
    this.showList = [];
    Object.keys(this.showState).forEach(key => {
      if (!this.showState[key].hidden) {
        this.showList.push(key);
      }
    });
  }

  ngOnInit() {
    this.initShow();
    this.clusterService.getNames().subscribe(
      resp => {
        this.clusters = resp.data.map(item => item.name);
        const initCluster = this.getCluster();
        this.setCluster(initCluster);
        this.jumpToHref(initCluster);
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  setCluster(cluster?: string) {
    this.cluster = cluster;
    this.clusterService.cluster = cluster;
    localStorage.setItem('cluster', cluster);
  }

  getCluster() {
    const localStorageCluster = localStorage.getItem('cluster');
    if (localStorageCluster && this.clusters.indexOf(localStorageCluster.toString()) > -1) {
      return localStorageCluster.toString();
    }
    return this.clusters[0];
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  refresh(refresh: boolean) {
    if (refresh) {
      this.retrieve();
    }
  }

  retrieve(): void {
    if (!this.cluster) {
      return;
    }

    this.nodeClient.list(this.cluster).subscribe(
      response => {
        this.resourceData = response.data;
        const nodes = response.data.nodes;
        this.inventory.size = nodes.length;
        this.inventory.reset(nodes);
        this.nodes = this.inventory.all;
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }


  editNode(node: Node) {
    this.nodeClient.getByName(node.name, this.cluster).subscribe(
      resp => {
        const data = resp.data;
        this.editNodeModal.openModal(data, '编辑节点', true);
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  saveNode(editedNode: KubeNode) {
    this.nodeClient.getByName(editedNode.metadata.name, this.cluster).subscribe(
      resp => {
        const node: KubeNode = resp.data;
        node.spec = editedNode.spec;
        node.metadata.labels = editedNode.metadata.labels;
        node.metadata.annotations = editedNode.metadata.annotations;
        this.nodeClient.update(node, this.cluster).subscribe(
          resp2 => {
            this.messageHandlerService.showSuccess('节点更新成功！');
            this.retrieve();
          },
          error => {
            this.messageHandlerService.handleError(error);
          }
        );
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );

  }

  deleteNode(node: Node) {
    const deletionMessage = new ConfirmationMessage(
      '删除节点确认',
      '你确认删除节点 ' + node.name + ' ？',
      node.name,
      ConfirmationTargets.NODE,
      ConfirmationButtons.DELETE_CANCEL
    );
    this.deletionDialogService.openComfirmDialog(deletionMessage);
  }

  isolateNode(node: Node) {
    const isolationMessage = new ConfirmationMessage(
      '节点隔离确认',
      '你确认隔离节点 ' + node.name + ' ？隔离后该节点将不再接收新的 Pod。',
      { name: node.name, action: 'isolate' },
      ConfirmationTargets.NODE,
      ConfirmationButtons.CONFIRM_CANCEL
    );
    this.deletionDialogService.openComfirmDialog(isolationMessage);
  }

  unisolateNode(node: Node) {
    const unisolationMessage = new ConfirmationMessage(
      '解除隔离确认',
      '你确认解除节点 ' + node.name + ' 的隔离状态？解除后该节点将重新接收新的 Pod。',
      { name: node.name, action: 'unisolate' },
      ConfirmationTargets.NODE,
      ConfirmationButtons.CONFIRM_CANCEL
    );
    this.deletionDialogService.openComfirmDialog(unisolationMessage);
  }

  drainNode(node: Node) {
    this.drainModal.openModal(node, this.cluster);
  }

  diagnoseAllNodes() {
    // 检查集群信息
    if (!this.cluster) {
      this.messageHandlerService.showError('请先选择集群');
      return;
    }

    this.diagnoseModalOpened = true;
    this.diagnosing = true;
    this.diagnoseResponse = null;

    console.log('开始诊断所有节点:', { cluster: this.cluster });

    // 使用通用诊断接口，诊断所有节点（不指定节点名称）
    const diagnoseRequest: DiagnoseRequest = {
      cluster: this.cluster,
      resourceType: 'Node',
      filters: ['Node'],
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
        console.error('诊断节点失败:', error);
        console.error('错误详情:', {
          status: error && error.status,
          statusText: error && error.statusText,
          error: error && error.error,
          message: error && error.message,
          cluster: this.cluster
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
          errorMessage = `服务器内部错误 (500)。\n` +
                        `集群: ${this.cluster}\n` +
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

  jumpToHref(cluster: string) {
    this.setCluster(cluster);
    this.retrieve();
  }

}
