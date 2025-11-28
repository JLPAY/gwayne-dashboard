import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';
import { KubeCronJob } from '../../../../shared/model/v1/kubernetes/cronjob';
import { AuthService } from '../../../../shared/auth/auth.service';
import { AceEditorService } from '../../../../shared/ace-editor/ace-editor.service';
import { AceEditorMsg } from '../../../../shared/ace-editor/ace-editor';

@Component({
  selector: 'wayne-list-cronjob',
  templateUrl: './list-cronjob.component.html'
})

export class ListCronjobComponent extends KubernetesListResource {
  @Input() resources: any[];
  @Input() showState: object;
  @Input() cluster: string;

  @Output() migration = new EventEmitter<any>();

  constructor(public tplDetailService: TplDetailService,
              public authService: AuthService,
              public aceEditorService: AceEditorService) {
    super(tplDetailService);
  }

  getActiveJobs(obj: KubeCronJob): number {
    return obj.status.active ? obj.status.active.length : 0;
  }

  migrationResource(obj: any) {
    this.migration.emit(obj);
  }

  onViewEvent(obj: any) {
    this.aceEditorService.announceMessage(AceEditorMsg.Instance(obj, false, '查看 CronJob'));
  }
}

