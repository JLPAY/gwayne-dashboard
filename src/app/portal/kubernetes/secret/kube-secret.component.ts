import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { AceEditorComponent } from '../../../shared/ace-editor/ace-editor.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { KubeResourceSecret } from '../../../shared/shared.const';
import { KubernetesNamespacedResource } from '../../../shared/base/kubernetes-namespaced/kubernetes-namespaced-resource';
import { DeletionDialogComponent } from '../../../shared/deletion-dialog/deletion-dialog.component';
import { ListSecretComponent } from './list-secret/list-secret.component';
import { PageState } from '../../../shared/page/page-state';
import { AceEditorService } from '../../../shared/ace-editor/ace-editor.service';
import { AceEditorMsg } from '../../../shared/ace-editor/ace-editor';

const showState = {
  'name': {hidden: false},
  'namespace': {hidden: false},
  'type': {hidden: false},
  'label': {hidden: false},
  'age': {hidden: false},
};

@Component({
  selector: 'wayne-kube-secret',
  templateUrl: './kube-secret.component.html'
})

export class KubeSecretComponent extends KubernetesNamespacedResource implements OnInit, OnDestroy {
  @ViewChild(ListSecretComponent, { static: false })
  listResourceComponent: ListSecretComponent;

  @ViewChild(AceEditorComponent, { static: false })
  aceEditorModal: AceEditorComponent;

  @ViewChild(DeletionDialogComponent, { static: false })
  deletionDialogComponent: DeletionDialogComponent;

  viewModalOpened = false;
  viewTitle = '查看 Secret';

  constructor(public kubernetesClient: KubernetesClient,
              public route: ActivatedRoute,
              public router: Router,
              public clusterService: ClusterService,
              public authService: AuthService,
              public messageHandlerService: MessageHandlerService,
              public aceEditorService: AceEditorService) {
    super(kubernetesClient, route, router, clusterService, authService, messageHandlerService);
    super.registResourceType('secret');
    super.registKubeResource(KubeResourceSecret);
    super.registShowSate(showState);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  retrieveResource(state?: any): void {
    if (state) {
      this.pageState = PageState.fromState(state, {totalPage: this.pageState.page.totalPage, totalCount: this.pageState.page.totalCount});
    }
    if (this.cluster) {
      if (this.filter) {
        this.pageState.filters = this.filter;
      }
      // 使用空字符串作为 namespace，表示查询所有 namespace
      this.kubernetesClient.listPage(this.pageState, this.cluster, this.kubeResource, '')
        .subscribe(
          response => {
            const data = response.data;
            this.resources = data.list;
            this.pageState.page.totalPage = data.totalPage;
            this.pageState.page.totalCount = data.totalCount;
          },
          error => this.messageHandlerService.handleError(error)
        );
    }
  }

  onViewModalChange(info: any) {
    if (info && info.modalOpened) {
      this.viewModalOpened = true;
      if (info.title) {
        this.viewTitle = info.title;
      }
    }
  }

}

