import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { AceEditorComponent } from '../../../shared/ace-editor/ace-editor.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { KubeResourceDaemonSet } from '../../../shared/shared.const';
import { KubernetesNamespacedResource } from '../../../shared/base/kubernetes-namespaced/kubernetes-namespaced-resource';
import { DeletionDialogComponent } from '../../../shared/deletion-dialog/deletion-dialog.component';
import { MigrationComponent } from './migration/migration.component';
import { ListDaemonsetComponent } from './list-daemonset/list-daemonset.component';

const showState = {
  'name': {hidden: false},
  'namespace': {hidden: false},
  'label': {hidden: false},
  'containers': {hidden: false},
  'status': {hidden: false},
  'age': {hidden: false},
};

@Component({
  selector: 'wayne-kube-daemonset',
  templateUrl: './kube-daemonset.component.html'
})

export class KubeDaemonsetComponent extends KubernetesNamespacedResource implements OnInit, OnDestroy {
  @ViewChild(ListDaemonsetComponent, { static: false })
  listResourceComponent: ListDaemonsetComponent;

  @ViewChild(AceEditorComponent, { static: false })
  aceEditorModal: AceEditorComponent;

  @ViewChild(DeletionDialogComponent, { static: false })
  deletionDialogComponent: DeletionDialogComponent;

  @ViewChild(MigrationComponent, { static: false })
  migrationComponent: MigrationComponent;

  constructor(public kubernetesClient: KubernetesClient,
              public route: ActivatedRoute,
              public router: Router,
              public clusterService: ClusterService,
              public authService: AuthService,
              public messageHandlerService: MessageHandlerService) {
    super(kubernetesClient, route, router, clusterService, authService, messageHandlerService);
    super.registResourceType('daemonset');
    super.registKubeResource(KubeResourceDaemonSet);
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
    const msg = `是否确认重启 DaemonSet ${obj.metadata.name}？`;
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
}
