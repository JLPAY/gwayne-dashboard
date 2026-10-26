import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';
import { KubePod } from '../../../../shared/model/v1/kubernetes/kubepod';
import { KubePodUtil } from '../../../../shared/utils';
import { KubeResourcePod } from '../../../../shared/shared.const';
import { LLMModelService } from '../../../../shared/client/v1/llm-model.service';
import { PodDiagnosisService } from '../../../../shared/client/v1/pod-diagnosis.service';
import { PodDiagnosisReportComponent } from '../../../../shared/pod-diagnosis-report/pod-diagnosis-report.component';
import { MessageHandlerService } from '../../../../shared/message-handler/message-handler.service';


@Component({
  selector: 'wayne-list-pod',
  templateUrl: './list-pod.component.html'
})

export class ListPodComponent extends KubernetesListResource implements OnInit {
  @Input() resources: any[];
  @Input() showState: object;
  @Input() cluster: string;
  @ViewChild(PodDiagnosisReportComponent) podReport: PodDiagnosisReportComponent;

  // aiAvailable 标记是否存在可用的 LLM 模型，决定是否展示「AI 排查」入口
  aiAvailable = false;
  // 排查报告数（按 Pod 名称），决定是否展示「报告」入口
  reportsByPod: {[pod: string]: number} = {};
  submittingPod = '';
  private reportPollTimer: any = null;

  constructor(public tplDetailService: TplDetailService,
              private modelService: LLMModelService,
              private diagnosisService: PodDiagnosisService,
              private messageHandlerService: MessageHandlerService) {
    super(tplDetailService);
  }

  ngOnInit() {
    this.checkAIAvailable();
    this.refreshReports();
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

  enterContainer(pod: KubePod): void {
    const url = `portal/namespace/0/app/0/${KubeResourcePod}` +
      `/${pod.metadata.name}/pod/${pod.metadata.name}/terminal/${this.cluster}/${pod.metadata.namespace}`;
    window.open(url, '_blank');
  }

  podLog(pod: KubePod): void {
    const url = `portal/logging/namespace/0/app/0/${KubeResourcePod}/${pod.metadata.name}` +
      `/pod/${pod.metadata.name}/${this.cluster}/${pod.metadata.namespace}`;
    window.open(url, '_blank');
  }

  // getPodStatus returns the pod state
  getPodStatus(pod: KubePod): string {
    return KubePodUtil.getPodStatus(pod);
  }

  // isPodAbnormal 判断 Pod 是否异常，用于决定是否展示「AI 排查」入口
  isPodAbnormal(pod: KubePod): boolean {
    return KubePodUtil.isPodAbnormal(pod);
  }

}
