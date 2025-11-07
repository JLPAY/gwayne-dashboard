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
  selector: 'wayne-portal-nodes',
  providers: [Inventory],
  templateUrl: './nodes.component.html',
  styleUrls: ['./nodes.component.scss']
})

export class PortalNodesComponent implements OnInit, OnDestroy {
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

  constructor(private nodeClient: NodeClient,
              private route: ActivatedRoute,
              private inventory: Inventory,
              private router: Router,
              private clusterService: ClusterService,
              public authService: AuthService,
              private messageHandlerService: MessageHandlerService,
              private deletionDialogService: ConfirmationDialogService) {
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

  viewNode(node: Node) {
    this.nodeClient.getByName(node.name, this.cluster).subscribe(
      resp => {
        const data = resp.data;
        // 第三个参数设置为 false，表示只读模式
        this.editNodeModal.openModal(data, '查看节点', false);
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

  jumpToHref(cluster: string) {
    this.setCluster(cluster);
    this.retrieve();
  }

}

