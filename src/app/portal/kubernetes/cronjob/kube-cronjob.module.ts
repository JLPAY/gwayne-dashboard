import { NgModule } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { PortalKubeCronjobComponent } from './kube-cronjob.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { DeletionDialogModule } from '../../../shared/deletion-dialog/deletion-dialog.module';
import { MigrationComponent } from './migration/migration.component';
import { ListCronjobComponent } from './list-cronjob/list-cronjob.component';

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
    PortalKubeCronjobComponent,
    ListCronjobComponent,
    MigrationComponent
  ]
})

export class PortalKubeCronjobModule {
}

