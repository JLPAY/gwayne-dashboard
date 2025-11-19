import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Output() diagnose = new EventEmitter<any>();

  constructor(public tplDetailService: TplDetailService) {
    super(tplDetailService);
  }

  // 判断事件级别是否为 Warning 或以上
  isWarningOrAbove(event: any): boolean {
    return event && event.type && event.type !== 'Normal';
  }

  // 诊断事件
  diagnoseEvent(event: any) {
    this.diagnose.emit(event);
  }
} 