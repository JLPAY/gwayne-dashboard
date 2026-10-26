import { Component, EventEmitter, Output } from '@angular/core';
import { PodDiagnosisService, PodDiagnosisReport } from '../../shared/client/v1/pod-diagnosis.service';
import { MessageHandlerService } from '../message-handler/message-handler.service';

/**
 * Pod AI 排查报告组件。
 * 排查任务在后台异步执行（提交后立即返回，不阻塞页面），
 * 本组件用于查看某个 Pod 的历史排查报告；报告完成后自动轮询刷新。
 * 用法：<app-pod-diagnosis-report #podReport (submitted)="refreshReports()"></app-pod-diagnosis-report>
 * 并调用 podReport.open(cluster, namespace, podName)。
 */
@Component({
  selector: 'app-pod-diagnosis-report',
  templateUrl: './pod-diagnosis-report.component.html',
  styleUrls: ['./pod-diagnosis-report.component.scss']
})
export class PodDiagnosisReportComponent {
  opened = false;
  loading = false;
  submitting = false;
  cluster: string;
  namespace: string;
  podName: string;
  reports: PodDiagnosisReport[] = [];
  // 当前查看的报告
  selected: PodDiagnosisReport | null = null;
  hasRunning = false;
  private pollTimer: any = null;

  @Output() submitted = new EventEmitter<void>();

  constructor(private diagnosisService: PodDiagnosisService,
              private messageHandlerService: MessageHandlerService) {
  }

  open(cluster: string, namespace: string, podName: string) {
    this.cluster = cluster;
    this.namespace = namespace;
    this.podName = podName;
    this.selected = null;
    this.opened = true;
    this.load();
  }

  close() {
    this.opened = false;
    this.stopPoll();
  }

  // load 加载该 Pod 的报告列表；存在 running 报告时自动轮询
  load() {
    this.stopPoll();
    this.loading = true;
    this.diagnosisService.listReports({
      cluster: this.cluster,
      namespace: this.namespace,
      pod: this.podName,
      limit: 20
    }).subscribe(
      response => {
        this.reports = (response.data && response.data.items) || [];
        this.hasRunning = !!(response.data && response.data.running);
        this.loading = false;
        // 若当前选中的报告仍在列表中，刷新其内容
        if (this.selected) {
          const fresh = this.reports.find(r => r.id === this.selected.id);
          this.selected = fresh || null;
        }
        if (this.hasRunning) {
          this.pollTimer = setTimeout(() => this.load(), 5000);
        }
      },
      error => {
        this.messageHandlerService.handleError(error);
        this.loading = false;
      }
    );
  }

  private stopPoll() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  select(report: PodDiagnosisReport) {
    this.selected = report;
  }

  // restart 在弹窗内再次发起后台排查
  restart() {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    this.diagnosisService.startDiagnosis(this.cluster, this.namespace, this.podName).subscribe(
      response => {
        this.messageHandlerService.showSuccess(
          `已提交后台 AI 排查（报告 #${response.data && response.data.id}），完成后可在 Pod 列表查看`);
        this.submitting = false;
        this.submitted.emit();
        this.load();
      },
      error => {
        this.messageHandlerService.handleError(error);
        this.submitting = false;
      }
    );
  }

  remove(report: PodDiagnosisReport) {
    if (!report.id) {
      return;
    }
    this.diagnosisService.deleteReport(report.id).subscribe(
      () => {
        if (this.selected && this.selected.id === report.id) {
          this.selected = null;
        }
        this.load();
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'running':
        return '排查中';
      case 'success':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  }
}
