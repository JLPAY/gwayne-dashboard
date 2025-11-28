import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';
import { KubeService } from '../../../../../../lib/shared/model/kubernetes/service';
import { AuthService } from '../../../../shared/auth/auth.service';
import { AceEditorService } from '../../../../shared/ace-editor/ace-editor.service';
import { AceEditorMsg } from '../../../../shared/ace-editor/ace-editor';

@Component({
  selector: 'wayne-list-service',
  templateUrl: './list-service.component.html'
})

export class ListServiceComponent extends KubernetesListResource {
  @Input() resources: any[];
  @Input() showState: object;
  @Input() cluster: string;

  @Output() migration = new EventEmitter<any>();

  constructor(public tplDetailService: TplDetailService,
              public authService: AuthService,
              public aceEditorService: AceEditorService) {
    super(tplDetailService);
  }

  migrationResource(obj: any) {
    this.migration.emit(obj);
  }

  getPort(obj: KubeService) {
    const result = Array<string>();
    for (const port of obj.spec.ports) {
      if (port.nodePort) {
        result.push(`${port.targetPort}:${port.port}:${port.nodePort}/${port.protocol}`);
      } else {
        result.push(`${port.targetPort}:${port.port}/${port.protocol}`);
      }
    }
    return result.join(', ');
  }

  onViewEvent(obj: any) {
    this.aceEditorService.announceMessage(AceEditorMsg.Instance(obj, false, '查看 Service'));
  }
}

