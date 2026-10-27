import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ActionType } from '../../../shared/shared.const';
import { ClusterMeta, Namespace, NamespaceMetaData } from '../../../shared/model/v1/namespace';
import { NamespaceService } from '../../../shared/client/v1/namespace.service';
import { Cluster } from '../../../shared/model/v1/cluster';
import { NamespaceClient } from '../../../shared/client/v1/kubernetes/namespace';
import { AceEditorBoxComponent } from '../../../shared/ace-editor/ace-editor-box/ace-editor-box.component';
import { AceEditorService } from '../../../shared/ace-editor/ace-editor.service';
import { AceEditorMsg } from '../../../shared/ace-editor/ace-editor';

class Annotation {
  key: string;
  value: string;
}
@Component({
  selector: 'create-edit-namespace',
  templateUrl: 'create-edit-namespace.component.html',
  styleUrls: ['create-edit-namespace.scss']
})
export class CreateEditNamespaceComponent {
  @Output() create = new EventEmitter<boolean>();
  opened: boolean;
  showACE: boolean;
  defaultMetaData = `{
  "imagePullSecrets": [],
  "env":[],
  "clusterMeta": {
  },
  "ingressAnnotations": {
  },
  "namespace": ""
}`;
  @ViewChild(AceEditorBoxComponent)
  aceBox: any;

  namespaceForm: NgForm;
  @ViewChild('namespaceForm', { static: true })
  currentForm: NgForm;
  ns: Namespace = new Namespace();
  checkOnGoing = false;
  isSubmitOnGoing = false;
  isNameValid = true;
  autoCreate = false;
  nsTitle: string;
  actionType: ActionType;

  clusters: Cluster[];
  clusterMetas: {};

  ingressAnnotations: Annotation[] = [];
  ingressMetas: {};

  serviceAnnotations: Annotation[] = [];
  serviceMetas: {};

  constructor(
    private namespaceClient: NamespaceClient,
    private namespaceService: NamespaceService,
    private messageHandlerService: MessageHandlerService,
    private aceEditorService: AceEditorService) {
  }

  newOrEditNamespace(clusters: Cluster[], id?: number) {
    this.opened = true;

    // 每次打开都重置交互状态，避免上一次残留（尤其是停留在元数据模式 / 提交中）影响本次操作
    this.showACE = false;
    this.isSubmitOnGoing = false;
    this.autoCreate = false;
    this.clusterMetas = {};
    this.ingressAnnotations = [];
    this.serviceAnnotations = [];
    this.clusters = clusters;
    if (this.clusters && this.clusters.length > 0) {
      for (const clu of this.clusters) {
        this.clusterMetas[clu.name] = {'checked': false, 'cpu': null, 'memory': null};
      }
    }

    if (id) {
      this.actionType = ActionType.EDIT;
      this.nsTitle = '编辑命名空间';
      this.namespaceService.getNamespace(id).subscribe(
        status => {
          this.ns = status.data;
          if (this.ns.metaData !== '') {
            this.ns.metaDataObj = Namespace.ParseNamespaceMetaData(this.ns.metaData);
          }
          this.normalizeMetaData();
          this.setClusterMetas();
          this.setIngressMetas();
          this.setServiceMetas();
          this.initJsonEditor();
        },
        error => {
          this.messageHandlerService.handleError(error);

        });
    } else {
      this.actionType = ActionType.ADD_NEW;
      this.nsTitle = '创建命名空间';
      this.ns = new Namespace();
      this.ns.metaDataObj = JSON.parse(this.defaultMetaData);
      this.normalizeMetaData();
      this.initJsonEditor();
    }
  }

  /**
   * 补齐元数据缺失的字段。
   * 元数据可能来自历史数据或用户手写的 JSON，缺 key 会让模板与方法调用直接报错，
   * 统一在这里兜住，后续代码就不用到处判空。
   */
  private normalizeMetaData(): void {
    const defaults = new NamespaceMetaData();
    const raw = this.ns.metaDataObj || ({} as NamespaceMetaData);
    this.ns.metaDataObj = Object.assign(defaults, raw);
    const meta = this.ns.metaDataObj;
    if (!meta.clusterMeta) {
      meta.clusterMeta = {};
    }
    if (!meta.env) {
      meta.env = [];
    }
    if (!meta.imagePullSecrets) {
      meta.imagePullSecrets = [];
    }
    if (!meta.ingressAnnotations) {
      meta.ingressAnnotations = {};
    }
    if (!meta.serviceAnnotations) {
      meta.serviceAnnotations = {};
    }
  }

  /** 把编辑器里的 JSON 读回表单模型；解析失败时提示并返回 false，调用方据此中止切换/提交 */
  private applyMetaDataFromEditor(): boolean {
    if (!this.aceBox) {
      return true;
    }
    const text = this.aceBox.getValue();
    if (!text || !text.trim()) {
      return true;
    }
    try {
      this.ns.metaDataObj = JSON.parse(text);
    } catch (e) {
      const detail = e && e.message ? e.message : e;
      this.messageHandlerService.showError(`元数据不是合法的 JSON，已保留当前内容，请修正后再操作：${detail}`);
      return false;
    }
    this.normalizeMetaData();
    return true;
  }

  initJsonEditor(): void {
    this.aceEditorService.announceMessage(AceEditorMsg.Instance(this.ns.metaDataObj));
  }

  onEditMetadata() {
    if (!this.showACE) {
      // 表单 → 元数据：先把当前表单状态同步进 JSON，再交给编辑器
      this.buildMetaDataObj();
      this.initJsonEditor();
      this.showACE = true;
      return;
    }
    // 元数据 → 表单：JSON 解析失败就停在编辑模式，避免把脏数据带到表单里
    if (!this.applyMetaDataFromEditor()) {
      return;
    }
    this.setClusterMetas();
    this.setIngressMetas();
    this.setServiceMetas();
    this.showACE = false;
  }

  /** 已勾选机房数量，用于分区标题旁的计数徽标 */
  checkedClusterCount(): number {
    if (!this.clusterMetas) {
      return 0;
    }
    return Object.getOwnPropertyNames(this.clusterMetas)
      .filter(name => this.clusterMetas[name] && this.clusterMetas[name].checked).length;
  }

  onAddEnv() {
    if (!this.ns.metaDataObj.env) {
      this.ns.metaDataObj.env = [];
    }
    this.ns.metaDataObj.env.push({'name': '', 'value': ''});
  }

  onDeleteEnv(i: number) {
    this.ns.metaDataObj.env.splice(i, 1);
  }

  onAddIngressAnnotations() {
    if (!this.ns.metaDataObj.ingressAnnotations) {
      this.ns.metaDataObj.ingressAnnotations = {};
    }
    this.ingressAnnotations.push({'key': '', 'value': ''});
  }

  onDeleteIngressAnnotations(i: number) {
    this.ingressAnnotations.splice(i, 1);
  }

  onAddServiceAnnotations() {
    if (!this.ns.metaDataObj.serviceAnnotations) {
      this.ns.metaDataObj.serviceAnnotations = {};
    }
    this.serviceAnnotations.push({'key': '', 'value': ''});
  }

  onDeleteServiceAnnotations(i: number) {
    this.serviceAnnotations.splice(i, 1);
  }

  onAddSecret() {
    if (!this.ns.metaDataObj.imagePullSecrets) {
      this.ns.metaDataObj.imagePullSecrets = [];
    }
    this.ns.metaDataObj.imagePullSecrets.push({'name': ''});
  }

  onDeleteSecret(i: number) {
    this.ns.metaDataObj.imagePullSecrets.splice(i, 1);
  }


  setClusterMetas() {
    if (this.ns && this.ns.metaDataObj && this.ns.metaDataObj.clusterMeta) {
      Object.getOwnPropertyNames(this.ns.metaDataObj.clusterMeta).map(cluster => {
        const clusterMeta = this.clusterMetas[cluster];
        const clusterMetaData = this.ns.metaDataObj.clusterMeta[cluster];
        if (clusterMeta) {
          clusterMeta.checked = true;
          const limit = clusterMetaData && clusterMetaData.resourcesLimit;
          clusterMeta.cpu = limit ? limit.cpu : null;
          clusterMeta.memory = limit ? limit.memory : null;
        }
        this.clusterMetas[cluster] = clusterMeta;
      });
    }
  }

  setIngressMetas() {
    if (this.ns && this.ns.metaDataObj && this.ns.metaDataObj.ingressAnnotations) {
      this.ingressAnnotations = [];
      Object.getOwnPropertyNames(this.ns.metaDataObj.ingressAnnotations).map(key => {
          this.ingressAnnotations.push({'key': key, 'value': this.ns.metaDataObj.ingressAnnotations[key]});
      });
    }
  }

  setServiceMetas() {
    if (this.ns && this.ns.metaDataObj && this.ns.metaDataObj.serviceAnnotations) {
      this.serviceAnnotations = [];
      Object.getOwnPropertyNames(this.ns.metaDataObj.serviceAnnotations).map(key => {
        this.serviceAnnotations.push({'key': key, 'value': this.ns.metaDataObj.serviceAnnotations[key]});
      });
    }
  }

  buildMetaDataObj() {
    if (!this.ns.metaDataObj) {
      this.ns.metaDataObj = new NamespaceMetaData();
    }
    if (!this.ns.metaDataObj.clusterMeta) {
      this.ns.metaDataObj.clusterMeta = {};
    }
    if (this.clusterMetas) {
      Object.getOwnPropertyNames(this.clusterMetas).map(cluster => {
        const clusterMeta = this.clusterMetas[cluster];
        if (clusterMeta && clusterMeta.checked) {
          const clusterMetaData = new ClusterMeta();
          clusterMetaData.resourcesLimit.cpu = clusterMeta.cpu;
          clusterMetaData.resourcesLimit.memory = clusterMeta.memory;
          this.ns.metaDataObj.clusterMeta[cluster] = clusterMetaData;
        } else {
          this.ns.metaDataObj.clusterMeta[cluster] = undefined;
        }
      });
    }
    if (this.ingressAnnotations) {
      this.ns.metaDataObj.ingressAnnotations = {};
      for (const a of this.ingressAnnotations) {
        if (a.key !== '') {
          this.ns.metaDataObj.ingressAnnotations[a.key] = a.value;
        }
      }
    }
    if (this.serviceAnnotations) {
      this.ns.metaDataObj.serviceAnnotations = {};
      for (const a of this.serviceAnnotations) {
        if (a.key !== '') {
          this.ns.metaDataObj.serviceAnnotations[a.key] = a.value;
        }
      }
    }
  }

  onCancel() {
    this.opened = false;
    this.showACE = false;
    this.currentForm.reset();
  }

  onSubmit() {
    if (this.isSubmitOnGoing) {
      return;
    }
    // 元数据模式下先确认 JSON 可用，避免提交时才抛异常导致按钮一直转
    if (this.showACE && !this.applyMetaDataFromEditor()) {
      return;
    }
    this.isSubmitOnGoing = true;
    this.buildMetaDataObj();
    this.ns.metaData = JSON.stringify(this.ns.metaDataObj);
    switch (this.actionType) {
      case ActionType.ADD_NEW:
        this.namespaceService.createNamespace(this.ns).subscribe(
          status => {
            this.isSubmitOnGoing = false;
            this.create.emit(true);
            this.opened = false;
            this.messageHandlerService.showSuccess('创建命名空间成功！');
            if (this.autoCreate && this.clusterMetas) {
              Object.getOwnPropertyNames(this.clusterMetas).map(cluster => {
                const clusterMeta = this.clusterMetas[cluster];
                if (clusterMeta && clusterMeta.checked) {
                  this.namespaceClient.create(this.ns.kubeNamespace, cluster).subscribe(
                    next => {
                      if (next.data == null) {
                        this.messageHandlerService.showSuccess(`集群 ${cluster} 已存在对应的 kubernetes namespace！`);
                      } else {
                        this.messageHandlerService.showSuccess(`集群 ${cluster} 创建 kubernetes namespace 成功！`);
                      }
                    },
                    error => {
                      this.messageHandlerService.handleError(error);
                    }
                  );
                }
              });
            }
          },
          error => {
            this.isSubmitOnGoing = false;
            this.opened = false;
            this.messageHandlerService.handleError(error);
          }
        );
        break;
      case ActionType.EDIT:
        this.namespaceService.updateNamespace(this.ns).subscribe(
          status => {
            this.isSubmitOnGoing = false;
            this.create.emit(true);
            this.opened = false;
            this.messageHandlerService.showSuccess('更新命名空间成功！');
            if (this.autoCreate && this.clusterMetas) {
              Object.getOwnPropertyNames(this.clusterMetas).map(cluster => {
                const clusterMeta = this.clusterMetas[cluster];
                if (clusterMeta && clusterMeta.checked) {
                  this.namespaceClient.create(this.ns.kubeNamespace, cluster).subscribe(
                    next => {
                      if (next.data == null) {
                        this.messageHandlerService.showSuccess(`集群 ${cluster} 已存在对应的 kubernetes namespace！`);
                      } else {
                          this.messageHandlerService.showSuccess(`集群 ${cluster} 创建 kubernetes namespace 成功！`);
                      }
                    },
                    error => {
                      this.messageHandlerService.handleError(error);
                    }
                  );
                }
              });
            }
          },
          error => {
            this.isSubmitOnGoing = false;
            this.opened = false;
            this.messageHandlerService.handleError(error);
          }
        );
        break;
    }
  }

  public get isValid(): boolean {
    return this.currentForm &&
      this.currentForm.valid &&
      !this.isSubmitOnGoing &&
      this.isNameValid &&
      !this.checkOnGoing;
  }

  // Handle the form validation
  handleValidation(): void {
    const cont = this.currentForm.controls['ns_name'];
    if (cont) {
      this.isNameValid = cont.valid;
    }
  }
}

