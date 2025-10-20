import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { AceEditorComponent } from '../../../shared/ace-editor/ace-editor.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { KubeResourceDeployment } from '../../../shared/shared.const';
import { KubernetesNamespacedResource } from '../../../shared/base/kubernetes-namespaced/kubernetes-namespaced-resource';
import { DeletionDialogComponent } from '../../../shared/deletion-dialog/deletion-dialog.component';
import { MigrationComponent } from './migration/migration.component';
import { ListDeploymentComponent } from './list-deployment/list-deployment.component';
import { ScaleDialogComponent } from './scale-dialog/scale-dialog.component';

const showState = {
  'name': {hidden: false},
  'namespace': {hidden: false},
  'label': {hidden: false},
  'containers': {hidden: false},
  'status': {hidden: false},
  'age': {hidden: false},
};

@Component({
  selector: 'wayne-kube-deployment',
  templateUrl: './kube-deployment.component.html'
})

export class KubeDeploymentComponent extends KubernetesNamespacedResource implements OnInit, OnDestroy {
  @ViewChild(ListDeploymentComponent, { static: false })
  listResourceComponent: ListDeploymentComponent;

  @ViewChild(AceEditorComponent, { static: false })
  aceEditorModal: AceEditorComponent;

  @ViewChild(DeletionDialogComponent, { static: false })
  deletionDialogComponent: DeletionDialogComponent;

  @ViewChild(MigrationComponent, { static: false })
  migrationComponent: MigrationComponent;

  @ViewChild(ScaleDialogComponent, { static: false })
  scaleDialogComponent: ScaleDialogComponent;

  constructor(public kubernetesClient: KubernetesClient,
              public route: ActivatedRoute,
              public router: Router,
              public clusterService: ClusterService,
              public authService: AuthService,
              public messageHandlerService: MessageHandlerService) {
    super(kubernetesClient, route, router, clusterService, authService, messageHandlerService);
    super.registResourceType('deployment');
    super.registKubeResource(KubeResourceDeployment);
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
    this.router.navigate(['../replicaset'], {relativeTo: this.route, queryParams: { uid: obj.metadata.uid }});
  }

  restart(obj: any) {
    const msg = `是否确认重启 Deployment ${obj.metadata.name}？`;
    const title = `重启确认`;
    this.deletionDialogComponent.open(title, msg, {obj: obj, action: 'restart'});
  }

  scale(obj: any) {
    this.scaleDialogComponent.obj = obj;
    this.scaleDialogComponent.cluster = this.cluster;
    this.scaleDialogComponent.open();
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

  onScaleConfirmed(event: any) {
    // 创建完整的 Kubernetes 资源对象
    const updateData = {
      apiVersion: event.obj.apiVersion,
      kind: event.obj.kind,
      metadata: {
        name: event.obj.metadata.name,
        namespace: event.obj.metadata.namespace,
        resourceVersion: event.obj.metadata.resourceVersion,
        uid: event.obj.metadata.uid
      },
      spec: {
        ...event.obj.spec,
        replicas: event.replicas
      }
    };

    this.kubernetesClient
      .update(updateData, this.cluster, this.kubeResource, event.obj.metadata.name, event.obj.metadata.namespace)
      .subscribe(
        response => {
          this.retrieveResource();
          this.messageHandlerService.showSuccess('副本数量调整成功！');
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

}