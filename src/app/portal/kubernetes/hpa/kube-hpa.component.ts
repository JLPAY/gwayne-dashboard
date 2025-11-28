import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AuthService } from '../../../shared/auth/auth.service';
import { AceEditorComponent } from '../../../shared/ace-editor/ace-editor.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { KubeResourceHorizontalPodAutoscaler } from '../../../shared/shared.const';
import { KubernetesNamespacedResource } from '../../../shared/base/kubernetes-namespaced/kubernetes-namespaced-resource';
import { DeletionDialogComponent } from '../../../shared/deletion-dialog/deletion-dialog.component';
import { ListHpaComponent } from './list-hpa/list-hpa.component';
import { PageState } from '../../../shared/page/page-state';
import { AceEditorService } from '../../../shared/ace-editor/ace-editor.service';
import { AceEditorMsg } from '../../../shared/ace-editor/ace-editor';

const showState = {
  'name': {hidden: false},
  'namespace': {hidden: false},
  'label': {hidden: false},
  'reference': {hidden: false},
  'targets': {hidden: false},
  'minpods': {hidden: false},
  'maxpods': {hidden: false},
  'replicas': {hidden: false},
  'age': {hidden: false},
};

@Component({
  selector: 'wayne-kube-hpa',
  templateUrl: './kube-hpa.component.html'
})

export class KubeHpaComponent extends KubernetesNamespacedResource implements OnInit, OnDestroy {
  @ViewChild(ListHpaComponent, { static: false })
  listResourceComponent: ListHpaComponent;

  @ViewChild(AceEditorComponent, { static: false })
  aceEditorModal: AceEditorComponent;

  @ViewChild(DeletionDialogComponent, { static: false })
  deletionDialogComponent: DeletionDialogComponent;

  viewModalOpened = false;
  viewTitle = '查看 HPA';

  constructor(public kubernetesClient: KubernetesClient,
              public route: ActivatedRoute,
              public router: Router,
              public clusterService: ClusterService,
              public authService: AuthService,
              public messageHandlerService: MessageHandlerService,
              public aceEditorService: AceEditorService) {
    super(kubernetesClient, route, router, clusterService, authService, messageHandlerService);
    super.registResourceType('horizontalpodautoscaler');
    super.registKubeResource(KubeResourceHorizontalPodAutoscaler);
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

