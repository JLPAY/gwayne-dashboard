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

  /**
   * 判断某条 Event 是否「无标签」。
   *
   * 原模板里直接写了 `Object.keys(obj.metadata.labels).length === 0`。
   * Angular 9 起的模板类型检查不允许模板引用全局 `Object`（TS2339 报编译失败），
   * 故把该表达式原样移入组件方法，语义与原先逐字一致（含短路顺序）。
   */
  hasNoLabels(obj: any): boolean {
    return !obj.metadata.labels || Object.keys(obj.metadata.labels).length === 0;
  }
} 