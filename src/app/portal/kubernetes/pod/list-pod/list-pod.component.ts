import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { KubernetesListResource } from '../../../../shared/base/kubernetes-namespaced/kubernetes-list-resource';
import { TplDetailService } from '../../../../shared/tpl-detail/tpl-detail.service';
import { KubePod } from '../../../../shared/model/v1/kubernetes/kubepod';
import { KubePodUtil } from '../../../../shared/utils';
import { KubeResourcePod } from '../../../../shared/shared.const';
import { AuthService } from '../../../../shared/auth/auth.service';


@Component({
  selector: 'wayne-portal-list-pod',
  templateUrl: './list-pod.component.html'
})

export class ListPodComponent extends KubernetesListResource implements OnChanges {
  @Input() resources: any[];
  @Input() showState: object;
  @Input() cluster: string;
  @Output() view = new EventEmitter<any>();

  // Processed resources with flattened statusPhase field for sorting/filtering
  processedResources: any[] = [];

  constructor(public tplDetailService: TplDetailService,
              public authService: AuthService) {
    super(tplDetailService);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resources'] && this.resources) {
      // Add statusPhase field to each pod for sorting and filtering
      this.processedResources = this.resources.map(pod => {
        return {
          ...pod,
          statusPhase: this.getPodStatus(pod)
        };
      });
    }
  }

  enterContainer(pod: KubePod): void {
    const url = `portal/namespace/0/app/0/${KubeResourcePod}` +
      `/${pod.metadata.name}/pod/${pod.metadata.name}/terminal/${this.cluster}/${pod.metadata.namespace}`;
    window.open(url, '_blank');
  }

  podLog(pod: KubePod): void {
    const url = `portal/logging/namespace/0/app/0/${KubeResourcePod}/${pod.metadata.name}` +
      `/pod/${pod.metadata.name}/${this.cluster}/${pod.metadata.namespace}`;
    window.open(url, '_blank');
  }

  // getPodStatus returns the pod state
  getPodStatus(pod: KubePod): string {
    return KubePodUtil.getPodStatus(pod);
  }

  onViewEvent(obj: any) {
    this.view.emit(obj);
  }

}

