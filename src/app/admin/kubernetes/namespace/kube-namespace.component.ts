import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { AceEditorComponent } from '../../../shared/ace-editor/ace-editor.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { KubeResourceNamespace } from '../../../shared/shared.const';
import { DeletionDialogComponent } from '../../../shared/deletion-dialog/deletion-dialog.component';
import { KubernetesUnNamespacedResource } from '../../../shared/base/kubernetes-namespaced/kubernetes-unnamespaced-resource';
import { ListNamespaceComponent } from './list-namespace/list-namespace.component';
import { CreateNamespaceFormComponent } from './create-namespace-form/create-namespace-form.component';

const showState = {
  'name': {hidden: false},
  'label': {hidden: false},
  'status': {hidden: false},
  'age': {hidden: false},
};

@Component({
  selector: 'wayne-kube-namespace',
  templateUrl: './kube-namespace.component.html'
})

export class KubeNamespaceComponent extends KubernetesUnNamespacedResource implements OnInit, OnDestroy {
  @ViewChild(ListNamespaceComponent)
  listResourceComponent: ListNamespaceComponent;

  @ViewChild(AceEditorComponent)
  aceEditorModal: AceEditorComponent;

  @ViewChild(DeletionDialogComponent)
  deletionDialogComponent: DeletionDialogComponent;

  @ViewChild(CreateNamespaceFormComponent)
  createNamespaceForm: CreateNamespaceFormComponent;

  constructor(public kubernetesClient: KubernetesClient,
              public route: ActivatedRoute,
              public router: Router,
              public clusterService: ClusterService,
              public authService: AuthService,
              public messageHandlerService: MessageHandlerService) {
    super(kubernetesClient, route, router, clusterService, authService, messageHandlerService);
    super.registResourceType('namespace');
    super.registKubeResource(KubeResourceNamespace);
    super.registShowSate(showState);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  /** 创建走「表单 / YAML」双模式弹窗；编辑也走双模式弹窗（表单编辑标签/注解，YAML 编辑完整对象） */
  createResource() {
    this.createNamespaceForm.open();
  }

  /** 编辑：先取完整对象再打开双模式弹窗，保存走基类 onSaveResourceEvent（PUT） */
  onEditResourceEvent(obj: any) {
    this.kubernetesClient.get(this.cluster, this.kubeResource, obj.metadata.name, obj.metadata.namespace)
      .subscribe(
        response => {
          this.createNamespaceForm.openEdit(response.data);
        },
        error => this.messageHandlerService.handleError(error)
      );
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
  }

}
