import { NgModule } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { NodeInspectComponent } from './node-inspect.component';
import { NodeClient } from '../../../shared/client/v1/kubernetes/node';

@NgModule({
  imports: [
    SharedModule,
    ReactiveFormsModule,
  ],
  providers: [
    NodeClient
  ],
  declarations: [
    NodeInspectComponent
  ],
  exports: [
    NodeInspectComponent
  ]
})
export class NodeInspectModule {
}
