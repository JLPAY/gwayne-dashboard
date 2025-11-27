import { Component, Input } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';

@Component({
  selector: 'wayne-list-event',
  templateUrl: './list-event.component.html',
  styleUrls: ['./list-event.component.scss']
})

export class ListEventComponent extends KubernetesListResource {
  @Input() resources: any[];
  @Input() showState: object;
  @Input() pageState: any;

  constructor(public tplDetailService: TplDetailService) {
    super(tplDetailService);
  }
} 