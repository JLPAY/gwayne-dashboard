import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';
import { AuthService } from '../../../../shared/auth/auth.service';
import { AceEditorService } from '../../../../shared/ace-editor/ace-editor.service';
import { AceEditorMsg } from '../../../../shared/ace-editor/ace-editor';

@Component({
  selector: 'wayne-list-secret',
  templateUrl: './list-secret.component.html'
})

export class ListSecretComponent extends KubernetesListResource {
  @Input() resources: any[];
  @Input() showState: object;
  @Input() cluster: string;

  constructor(public tplDetailService: TplDetailService,
              public authService: AuthService,
              public aceEditorService: AceEditorService) {
    super(tplDetailService);
  }

  onViewEvent(obj: any) {
    this.aceEditorService.announceMessage(AceEditorMsg.Instance(obj, false, '查看 Secret'));
  }

}

