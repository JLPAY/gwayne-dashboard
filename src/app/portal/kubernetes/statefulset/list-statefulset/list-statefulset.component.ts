import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';
import { AuthService } from '../../../../shared/auth/auth.service';
import { AceEditorService } from '../../../../shared/ace-editor/ace-editor.service';
import { AceEditorMsg } from '../../../../shared/ace-editor/ace-editor';

@Component({
  selector: 'wayne-list-statefulset',
  templateUrl: './list-statefulset.component.html'
})

export class ListStatefulsetComponent extends KubernetesListResource {
  @Input() resources: any[];
  @Input() showState: object;

  @Output() migration = new EventEmitter<any>();
  @Output() jump = new EventEmitter<any>();
  @Output() restart = new EventEmitter<any>();

  constructor(public tplDetailService: TplDetailService,
              public authService: AuthService,
              public aceEditorService: AceEditorService) {
    super(tplDetailService);
  }

  migrationResource(obj: any) {
    this.migration.emit(obj);
  }

  jumpResource(obj: any) {
    this.jump.emit(obj);
  }

  restartResource(obj: any) {
    this.restart.emit(obj);
  }

  onViewEvent(obj: any) {
    this.aceEditorService.announceMessage(AceEditorMsg.Instance(obj, false, '查看 StatefulSet'));
  }
}

