import { NgModule } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { KubeNetworkPolicyComponent } from './kube-networkpolicy.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { DeletionDialogModule } from '../../../shared/deletion-dialog/deletion-dialog.module';
import { ListNetworkPolicyComponent } from './list-networkpolicy/list-networkpolicy.component';

@NgModule({
  imports: [
    SharedModule,
    ReactiveFormsModule,
    DeletionDialogModule
  ],
  providers: [
    KubernetesClient
  ],
  exports: [
    KubeNetworkPolicyComponent,
    ListNetworkPolicyComponent
  ],
  declarations: [
    KubeNetworkPolicyComponent,
    ListNetworkPolicyComponent
  ]
})

export class KubeNetworkPolicyModule {
}
