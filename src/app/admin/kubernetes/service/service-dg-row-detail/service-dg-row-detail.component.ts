import { Component, Input, OnInit } from '@angular/core';
import { KubernetesClient } from '../../../../shared/client/v1/kubernetes/kubernetes';
import { KubeResourceEndpoint } from '../../../../shared/shared.const';

@Component({
  selector: 'service-detail',
  templateUrl: './service-dg-row-detail.component.html',
  styleUrls: ['./service-dg-row-detail.component.scss']
})


export class DgRowDetailComponent implements OnInit {
  @Input() obj: any;

  @Input() cluster: string;


  endpoint: any;

  loaded = false;

  constructor(private kubernetesClient: KubernetesClient) {

  }

  ngOnInit() {
    this.kubernetesClient.get(this.cluster, KubeResourceEndpoint, this.obj.metadata.name, this.obj.metadata.namespace).subscribe(
      resp => {
        this.endpoint = resp.data;
        this.loaded = true;
      },
      error => {
        // this.messageHandlerService.handleError(error);
        this.loaded = true;
      }
    );
    // Make the server call

  }

  /** 是否存在任何（就绪或未就绪）地址，用于区分「无 subsets」与「无可用 Endpoint」 */
  get hasAddresses(): boolean {
    const subsets = this.endpoint && this.endpoint.subsets;
    return !!subsets && subsets.some((s: any) =>
      (s.addresses && s.addresses.length > 0) ||
      (s.notReadyAddresses && s.notReadyAddresses.length > 0));
  }
}
