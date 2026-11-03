import { NgModule } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { NodeInspectHistoryComponent } from './node-inspect-history.component';
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
    NodeInspectHistoryComponent
  ],
  exports: [
    NodeInspectHistoryComponent
  ]
})
export class NodeInspectHistoryModule {
}
