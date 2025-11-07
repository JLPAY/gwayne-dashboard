import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';
import { AuthService } from '../../../../shared/auth/auth.service';

@Component({
  selector: 'wayne-portal-list-hpa',
  templateUrl: './list-hpa.component.html'
})

export class ListHpaComponent extends KubernetesListResource {
  @Input() resources: any[];
  @Input() showState: object;

  @Output() migration = new EventEmitter<any>();
  @Output() view = new EventEmitter<any>();

  constructor(public tplDetailService: TplDetailService,
              public authService: AuthService) {
    super(tplDetailService);
  }

  migrationResource(obj: any) {
    this.migration.emit(obj);
  }

  onViewEvent(obj: any) {
    this.view.emit(obj);
  }
}

