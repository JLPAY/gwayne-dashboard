import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';
import { AuthService } from '../../../../shared/auth/auth.service';

@Component({
  selector: 'wayne-list-deployment',
  templateUrl: './list-deployment.component.html'
})

export class ListDeploymentComponent extends KubernetesListResource {
  @Input() resources: any[];
  @Input() showState: object;

  @Output() migration = new EventEmitter<any>();
  @Output() jump = new EventEmitter<any>();
  @Output() restart = new EventEmitter<any>();
  @Output() scale = new EventEmitter<any>();

  constructor(public tplDetailService: TplDetailService,
              public authService: AuthService) {
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

  onScaleEvent(obj: any) {
    this.scale.emit(obj);
  }
}

