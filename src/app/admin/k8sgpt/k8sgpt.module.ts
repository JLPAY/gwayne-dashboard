import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { K8sGPTComponent } from './k8sgpt.component';
import { ListK8sGPTComponent } from './list-k8sgpt/list-k8sgpt.component';
import { CreateEditK8sGPTComponent } from './create-edit-k8sgpt/create-edit-k8sgpt.component';

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [
    K8sGPTComponent,
    ListK8sGPTComponent,
    CreateEditK8sGPTComponent
  ],
  exports: [
    K8sGPTComponent
  ]
})
export class K8sGPTModule {
}

