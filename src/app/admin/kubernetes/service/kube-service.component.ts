import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { AceEditorComponent } from '../../../shared/ace-editor/ace-editor.component';
import { ListServiceComponent } from './list-service/list-service.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { KubeResourceService } from '../../../shared/shared.const';
import { KubernetesNamespacedResource } from '../../../shared/base/kubernetes-namespaced/kubernetes-namespaced-resource';
import { DeletionDialogComponent } from '../../../shared/deletion-dialog/deletion-dialog.component';
import { MigrationComponent } from './migration/migration.component';
import { CreateServiceFormComponent } from './create-service-form/create-service-form.component';

const showState = {
  'name': {hidden: false},
  'namespace': {hidden: false},
  'type': {hidden: false},
  'label': {hidden: false},
  'clusterIP': {hidden: false},
  'port': {hidden: false},
  'externalIP': {hidden: false},
  'age': {hidden: false},
};

@Component({
  selector: 'wayne-kube-service',
  templateUrl: './kube-service.component.html'
})

export class KubeServiceComponent extends KubernetesNamespacedResource implements OnInit, OnDestroy {
  @ViewChild(ListServiceComponent)
  listResourceComponent: ListServiceComponent;

  @ViewChild(AceEditorComponent)
  aceEditorModal: AceEditorComponent;

  @ViewChild(DeletionDialogComponent)
  deletionDialogComponent: DeletionDialogComponent;

  @ViewChild(MigrationComponent)
  migrationComponent: MigrationComponent;

  @ViewChild(CreateServiceFormComponent)
  createServiceForm: CreateServiceFormComponent;

  constructor(public kubernetesClient: KubernetesClient,
              public route: ActivatedRoute,
              public router: Router,
              public clusterService: ClusterService,
              public authService: AuthService,
              public messageHandlerService: MessageHandlerService) {
    super(kubernetesClient, route, router, clusterService, authService, messageHandlerService);
    super.registResourceType('service');
    super.registKubeResource(KubeResourceService);
    super.registShowSate(showState);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  /** 创建走「表单 / YAML」双模式弹窗；编辑也走双模式弹窗（表单编辑类型/端口/标签等，YAML 编辑完整对象） */
  createResource() {
    this.createServiceForm.open(this.cluster, this.namespaces, this.namespace);
  }

  /** 编辑：先取完整对象再打开双模式弹窗，保存走基类 onSaveResourceEvent（PUT） */
  onEditResourceEvent(obj: any) {
    this.kubernetesClient.get(this.cluster, this.kubeResource, obj.metadata.name, obj.metadata.namespace)
      .subscribe(
        response => {
          this.createServiceForm.openEdit(response.data);
        },
        error => this.messageHandlerService.handleError(error)
      );
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
  }


  migration(obj: any) {
    this.migrationComponent.openModal(this.cluster, obj);
  }

}
