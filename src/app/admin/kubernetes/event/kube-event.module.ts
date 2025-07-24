import { NgModule } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { KubeEventComponent } from './kube-event.component';
import { KubernetesClient } from '../../../shared/client/v1/kubernetes/kubernetes';
import { DeletionDialogModule } from '../../../shared/deletion-dialog/deletion-dialog.module';
import { ListEventComponent } from './list-event/list-event.component';

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
    KubeEventComponent,
    ListEventComponent
  ]
})

export class KubeEventModule {
} 