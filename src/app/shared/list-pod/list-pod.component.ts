import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ClrDatagridStateInterface } from '@clr/angular';
import { MessageHandlerService } from '../message-handler/message-handler.service';
import { PublicService } from '../client/v1/public.service';
import { CacheService } from '../auth/cache.service';
import { ConfirmationButtons, ConfirmationState, ConfirmationTargets, KubeResourcePod, KubeResourcesName } from '../shared.const';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationMessage } from '../confirmation-dialog/confirmation-message';
import { ConfirmationDialogService } from '../confirmation-dialog/confirmation-dialog.service';
import { Subscription } from 'rxjs';
import { ClusterService } from '../client/v1/cluster.service';
import { Cluster } from '../model/v1/cluster';
import { CopyService } from '../client/v1/copy.service';
import { AuthService } from '../auth/auth.service';
import { PageState } from '../page/page-state';
import { KubePod } from '../model/v1/kubernetes/kubepod';
import { KubePodUtil } from '../utils';
import { KubernetesClient } from '../client/v1/kubernetes/kubernetes';
import { PodClient } from '../client/v1/kubernetes/pod';
import { LLMModelService } from '../client/v1/llm-model.service';
import { PodDiagnosisService } from '../client/v1/pod-diagnosis.service';
import { PodDiagnosisReportComponent } from '../pod-diagnosis-report/pod-diagnosis-report.component';

@Component({
  selector: 'list-pod',
  templateUrl: 'list-pod.component.html',
  styleUrls: ['list-pod.scss']
})

export class ListPodComponent implements OnDestroy, OnInit {
  resourceType: KubeResourcesName;
  checkOnGoing = false;
  isSubmitOnGoing = false;
  modalOpened: boolean;
  pods: KubePod[];
  cluster: string;
  @ViewChild(PodDiagnosisReportComponent) podReport: PodDiagnosisReportComponent;
  resourceName: string;
  logSource: string;
  timer: any;
  whetherHotReflash = true;
  isCopied = false;

  // aiAvailable 标记是否存在可用的 LLM 模型，决定是否展示「AI 排查」入口
  aiAvailable = false;
  // 排查报告数（按 Pod 名称），决定是否展示「报告」入口
  reportsByPod: {[pod: string]: number} = {};
  submittingPod = '';
  private reportPollTimer: any = null;

  pageState: PageState = new PageState();
  currentPage = 1;
  state: ClrDatagridStateInterface;

  subscription: Subscription;

  get appId(): number {
    return parseInt(this.route.parent.snapshot.params['id'], 10);
  }

  pageSizeChange(pageSize: number) {
    this.state.page.to = pageSize - 1;
    this.state.page.size = pageSize;
    this.currentPage = 1;
    this.refresh(this.state);
  }

  constructor(private router: Router,
              private deletionDialogService: ConfirmationDialogService,
              private route: ActivatedRoute,
              private podClient: PodClient,
              @Inject(DOCUMENT) private document: any,
              public cacheService: CacheService,
              private publicService: PublicService,
              private clusterService: ClusterService,
              private messageHandlerService: MessageHandlerService,
              private kubernetesClient: KubernetesClient,
              private copyService: CopyService,
              public authService: AuthService,
              private modelService: LLMModelService,
              private diagnosisService: PodDiagnosisService) {
    this.subscription = deletionDialogService.confirmationConfirm$.subscribe(message => {
      if (message &&
        message.state === ConfirmationState.CONFIRMED &&
        message.source === ConfirmationTargets.POD) {
        const pod: KubePod = message.data;
        this.kubernetesClient
          .delete(this.cluster, KubeResourcePod, false, pod.metadata.name, pod.metadata.namespace, this.appId.toString())
          .subscribe(
            response => {
              this.refresh();
              this.messageHandlerService.showSuccess('实例删除成功！');
            },
            error => {
              this.messageHandlerService.handleError(error);
            }
          );
      }
    });
  }

  ngOnInit(): void {
    this.checkAIAvailable();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    clearInterval(this.timer);
    if (this.reportPollTimer) {
      clearTimeout(this.reportPollTimer);
      this.reportPollTimer = null;
    }
  }

  // checkAIAvailable 查询后端是否存在可用的 LLM 模型，用于动态隐藏「AI 排查」入口
  checkAIAvailable() {
    this.modelService.diagnosisAvailable().subscribe(
      response => {
        this.aiAvailable = !!(response.data && response.data.available);
      },
      () => {
        this.aiAvailable = false;
      }
    );
  }

  // refreshReports 刷新当前集群的排查报告映射；存在进行中任务时 10s 轮询
  refreshReports() {
    if (this.reportPollTimer) {
      clearTimeout(this.reportPollTimer);
      this.reportPollTimer = null;
    }
    this.diagnosisService.listReports({cluster: this.cluster, limit: 100}).subscribe(
      response => {
        const items = (response.data && response.data.items) || [];
        const map: {[pod: string]: number} = {};
        for (const it of items) {
          map[it.pod] = (map[it.pod] || 0) + 1;
        }
        this.reportsByPod = map;
        if (response.data && response.data.running) {
          this.reportPollTimer = setTimeout(() => this.refreshReports(), 10000);
        }
      },
      () => {}
    );
  }

  // startDiagnosis 提交后台 AI 排查任务，不阻塞页面；完成后报告在「报告」入口查看
  startDiagnosis(pod: KubePod) {
    if (this.submittingPod) {
      return;
    }
    this.submittingPod = pod.metadata.name;
    this.diagnosisService.startDiagnosis(this.cluster, pod.metadata.namespace, pod.metadata.name).subscribe(
      response => {
        this.messageHandlerService.showInfo(
          `已提交后台 AI 排查（报告 #${response.data && response.data.id}），完成后可点「报告」查看`);
        this.submittingPod = '';
        this.refreshReports();
      },
      error => {
        this.messageHandlerService.handleError(error);
        this.submittingPod = '';
      }
    );
  }

  // reportCount 获取某 Pod 的排查报告数
  reportCount(pod: KubePod): number {
    return this.reportsByPod[pod.metadata.name] || 0;
  }

  // openReports 打开该 Pod 的排查报告弹窗
  openReports(pod: KubePod) {
    this.podReport.open(this.cluster, pod.metadata.namespace, pod.metadata.name);
  }

  // getPodStatus returns the pod state
  getPodStatus(pod: KubePod): string {
    return KubePodUtil.getPodStatus(pod);
  }

  // isPodAbnormal 判断 Pod 是否异常，用于决定是否展示「AI 排查」入口
  isPodAbnormal(pod: KubePod): boolean {
    return KubePodUtil.isPodAbnormal(pod);
  }

  openModal(cluster: string, resourceName: string, resourceType: KubeResourcesName) {
    this.cluster = cluster;
    this.resourceType = resourceType;
    this.resourceName = resourceName;
    this.pods = null;
    this.refreshReports();
    this.currentPage = 1;
    this.logSource = null;
    this.modalOpened = true;
    this.whetherHotReflash = true;
    this.clusterService.getByName(this.cluster).subscribe(
      response => {
        const data: Cluster = response.data;
        if (data.metaData) {
          const metaData = JSON.parse(data.metaData);
          if (metaData.logSource) {
            this.logSource = metaData.logSource;
          }
        }
        this.keepUpdate();
        this.refresh();
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  closeModal() {
    this.modalOpened = false;
    clearInterval(this.timer);
  }

  keepUpdate() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      if (!this.modalOpened) {
        clearInterval(this.timer);
      }
      if (this.whetherHotReflash) {
        this.refresh();
      }
    }, 5000);
  }

  refresh(state?: ClrDatagridStateInterface) {
    if (state) {
      this.state = state;
      this.pageState = PageState.fromState(state, {totalPage: this.pageState.page.totalPage, totalCount: this.pageState.page.totalCount});
    }
    if (this.cluster) {
      this.podClient.listPageByResouce(this.pageState, this.cluster, this.cacheService.kubeNamespace, this.resourceType,
        this.resourceName, this.appId)
        .subscribe(
          response => {
            const data = response.data;
            this.pods = data.list;
            this.pageState.page.totalPage = data.totalPage;
            this.pageState.page.totalCount = data.totalCount;
          },
          error => {
            this.pods = null;
            this.messageHandlerService.handleError(error);
          }
        );
    }

  }

  deletePod(pod: KubePod) {
    const deletionMessage = new ConfirmationMessage(
      '删除实例确认',
      `是否确认删除实例 ${pod.metadata.name}`,
      pod,
      ConfirmationTargets.POD,
      ConfirmationButtons.DELETE_CANCEL
    );
    this.deletionDialogService.openComfirmDialog(deletionMessage);
  }


  enterContainer(pod: KubePod): void {
    const appId = this.route.parent.snapshot.params['id'];
    const url = `portal/namespace/${this.cacheService.namespaceId}/app/${appId}/${this.resourceType}` +
      `/${this.resourceName}/pod/${pod.metadata.name}/terminal/${this.cluster}/${this.cacheService.kubeNamespace}`;
    window.open(url, '_blank');
  }

  switchCopyButton() {
    this.isCopied = true;
    setTimeout(() => {
      this.isCopied = false;
    }, 3000);
  }

  copyLogCommand(pod: KubePod): void {
    if (this.logSource === undefined) {
      this.messageHandlerService.showInfo('缺少机房信息，请联系管理员');
    }
    const kubeToolCmd = `kubetool log --source ${this.logSource === undefined ? '' : this.logSource} ` +
      ` --${this.resourceType === 'deployments' ? 'deployment' : this.resourceType} ${this.resourceName}` +
      ` --pod=${pod.metadata.name} --layout=log`;
    this.copyService.copy(kubeToolCmd);
    this.switchCopyButton();
  }


  podLog(pod: KubePod): void {
    const appId = this.route.parent.snapshot.params['id'];
    const url = `portal/logging/namespace/${this.cacheService.namespaceId}/app/${appId}/${this.resourceType}/${this.resourceName}` +
      `/pod/${pod.metadata.name}/${this.cluster}/${this.cacheService.kubeNamespace}`;
    window.open(url, '_blank');
  }
}


