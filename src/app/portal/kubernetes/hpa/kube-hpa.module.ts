import { NgModule } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { KubeHpaComponent } from './kube-hpa.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { DeletionDialogModule } from '../../../shared/deletion-dialog/deletion-dialog.module';
import { ListHpaComponent } from './list-hpa/list-hpa.component';

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
    KubeHpaComponent,
    ListHpaComponent
  ],
  declarations: [
    KubeHpaComponent,
    ListHpaComponent
  ]
})

export class KubeHpaModule {
}

