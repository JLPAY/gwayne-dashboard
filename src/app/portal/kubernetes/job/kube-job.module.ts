import { NgModule } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { PortalKubeJobComponent } from './kube-job.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { DeletionDialogModule } from '../../../shared/deletion-dialog/deletion-dialog.module';
import { ListJobComponent } from './list-job/list-job.component';

@NgModule({
  imports: [
    SharedModule,
    ReactiveFormsModule,
    DeletionDialogModule
  ],
  providers: [
    KubernetesClient
  ],
  exports: [],
  declarations: [
    PortalKubeJobComponent,
    ListJobComponent
  ]
})

export class PortalKubeJobModule {
}

