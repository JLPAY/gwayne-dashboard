import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';

@Component({
  selector: 'wayne-list-networkpolicy',
  templateUrl: './list-networkpolicy.component.html',
  styleUrls: ['./list-networkpolicy.component.scss']
})

export class ListNetworkPolicyComponent extends KubernetesListResource {
  @Input() resources: any[];
  @Input() showState: object;

  constructor(public tplDetailService: TplDetailService) {
    super(tplDetailService);
  }

  /** 是否配置了 podSelector（matchLabels 或 matchExpressions 任一存在） */
  hasPodSelector(obj: any): boolean {
    return this.podSelectorEntries(obj).length > 0;
  }

  /**
   * 把 spec.podSelector 格式化为可读条目：
   * matchLabels → key=value；matchExpressions → key in (a,b) / notin / exists 等
   */
  podSelectorEntries(obj: any): string[] {
    const result: string[] = [];
    const selector = obj && obj.spec && obj.spec.podSelector;
    if (!selector) {
      return result;
    }
    if (selector.matchLabels) {
      Object.getOwnPropertyNames(selector.matchLabels).forEach(key => {
        result.push(`${key}=${selector.matchLabels[key]}`);
      });
    }
    if (Array.isArray(selector.matchExpressions)) {
      for (const expr of selector.matchExpressions) {
        if (!expr || !expr.key) {
          continue;
        }
        const values = Array.isArray(expr.values) ? expr.values.join(', ') : '';
        switch (expr.operator) {
          case 'In':
            result.push(`${expr.key} in (${values})`);
            break;
          case 'NotIn':
            result.push(`${expr.key} notin (${values})`);
            break;
          case 'Exists':
            result.push(`${expr.key} exists`);
            break;
          case 'DoesNotExist':
            result.push(`${expr.key} not exists`);
            break;
          case 'Gt':
            result.push(`${expr.key} > ${values}`);
            break;
          case 'Lt':
            result.push(`${expr.key} < ${values}`);
            break;
          default:
            result.push(`${expr.key} ${expr.operator}${values ? ' (' + values + ')' : ''}`);
        }
      }
    }
    return result;
  }
}
