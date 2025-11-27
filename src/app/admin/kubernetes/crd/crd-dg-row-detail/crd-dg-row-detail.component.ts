import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CustomCRDClient } from '../../../../shared/client/v1/kubernetes/crd';
import { PageState } from '../../../../shared/page/page-state';
import { ClrDatagridStateInterface } from '@clr/angular';
import { MessageHandlerService } from '../../../../shared/message-handler/message-handler.service';
import { AceEditorComponent } from '../../../../shared/ace-editor/ace-editor.component';
import { KubeResourceNamespace } from '../../../../shared/shared.const';
import { KubernetesClient } from '../../../../shared/client/v1/kubernetes/kubernetes';
import { DeleteEvent } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { DeletionDialogComponent } from '../../../../shared/deletion-dialog/deletion-dialog.component';

@Component({
  selector: 'crd-detail',
  templateUrl: './crd-dg-row-detail.component.html'
})


export class CRDDgRowDetailComponent implements OnInit {
  @Input() obj: any;

  @Input() cluster: string;
  @ViewChild(AceEditorComponent, { static: false })
  aceEditorModal: AceEditorComponent;

  resources: any[];
  showState: object;
  pageState: PageState = new PageState();
  state: ClrDatagridStateInterface;
  currentPage = 1;

  namespaces = Array<string>();
  namespace = '';

  @ViewChild(DeletionDialogComponent, { static: false })
  deletionDialogComponent: DeletionDialogComponent;

  constructor(private customCRDClient: CustomCRDClient,
              public kubernetesClient: KubernetesClient,
              public messageHandlerService: MessageHandlerService) {

  }

  ngOnInit() {
    this.kubernetesClient.getNames(this.cluster, KubeResourceNamespace).subscribe(
      resp => {
        this.namespace = '';
        this.namespaces = Array<string>();
        resp.data.map(ns => {
          this.namespaces.push(ns.name);
        });
        this.refresh();
      },
      error => this.messageHandlerService.handleError(error)
    );

  }

  // 获取CRD的存储版本
  private getStorageVersion(): string {
    if (this.obj && this.obj.spec && this.obj.spec.versions) {
      const storageVersion = this.obj.spec.versions.find(version => version.storage === true);
      if (storageVersion) {
        return storageVersion.name;
      }
      // 如果没有找到storage版本，返回第一个版本
      if (this.obj.spec.versions.length > 0) {
        return this.obj.spec.versions[0].name;
      }
    }
    // 兼容旧版本CRD（使用spec.version）
    if (this.obj && this.obj.spec && this.obj.spec.version) {
      return this.obj.spec.version;
    }
    return 'v1'; // 默认版本
  }

  pageSizeChange(pageSize: number) {
    this.state.page.to = pageSize - 1;
    this.state.page.size = pageSize;
    this.currentPage = 1;
  }

  refresh(state?: ClrDatagridStateInterface): void {
    this.state = state;
    if (state) {
      this.pageState = PageState.fromState(state, {
        totalPage: this.pageState.page.totalPage, totalCount: this.pageState.page.totalCount
      });
    }
    if (this.cluster) {
      // 获取存储版本（storage: true的版本）
      const storageVersion = this.getStorageVersion();
      this.customCRDClient.listPage(this.pageState,
        this.cluster, this.obj.spec.group, storageVersion, this.obj.spec.names.plural, this.namespace).subscribe(
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

  onEditEvent(obj: any) {
    const storageVersion = this.getStorageVersion();
    this.customCRDClient.get(this.cluster, this.obj.spec.group, storageVersion, this.obj.spec.names.plural,
      obj.metadata.namespace, obj.metadata.name)
      .subscribe(
        response => {
          const data = response.data;
          this.aceEditorModal.openModal(data, 'ADMIN.KUBERNETES.ACTION.EDIT', true);
        },
        error => this.messageHandlerService.handleError(error)
      );
  }

  createResource() {
    this.aceEditorModal.openModal({}, `创建 ${this.obj.spec.names.plural}`, true, true);
  }

  onCreateEvent(obj: any) {
    if (obj && obj.metadata) {
      const storageVersion = this.getStorageVersion();
      this.customCRDClient.create(obj, this.cluster, this.obj.spec.group, storageVersion, this.obj.spec.names.plural,
        obj.metadata.namespace).subscribe(
        resp2 => {
          this.messageHandlerService.showSuccess('ADMIN.KUBERNETES.MESSAGE.CREATE');
          this.refresh();
        },
        error => {
          this.messageHandlerService.handleError(error);
        }
      );
    } else {
      this.messageHandlerService.showError('格式校验错误');
    }
  }

  onSaveEvent(obj: any) {
    const storageVersion = this.getStorageVersion();
    this.customCRDClient.update(obj, this.cluster, this.obj.spec.group, storageVersion, this.obj.spec.names.plural,
      obj.metadata.namespace, obj.metadata.name).subscribe(
      resp2 => {
        this.messageHandlerService.showSuccess('ADMIN.KUBERNETES.MESSAGE.UPDATE');
        this.refresh();
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );

  }

  onDeleteEvent(obj: any) {
    const msg = `是否确认删除对象 ${obj.metadata.name}`;
    const title = `删除确认`;
    this.deletionDialogComponent.open(title, msg, {obj: obj});
  }

  confirmDeleteEvent(event: DeleteEvent) {
    const storageVersion = this.getStorageVersion();
    this.customCRDClient
      .delete(this.cluster, this.obj.spec.group, storageVersion, this.obj.spec.names.plural,
        event.obj.metadata.namespace, event.obj.metadata.name)
      .subscribe(
        response => {
          this.refresh();
          this.messageHandlerService.showSuccess('ADMIN.KUBERNETES.MESSAGE.DELETE');
        },
        error => {
          this.messageHandlerService.handleError(error);
        }
      );
  }
  versionDetail(content: string) {
    this.messageHandlerService.showInfo(content);
  }
}
