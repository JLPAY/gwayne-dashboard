import { NgModule } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { ListAIBackendComponent } from './list-aibackend/list-aibackend.component';
import { AIBackendComponent } from './aibackend.component';
import { CreateEditAIBackendComponent } from './create-edit-aibackend/create-edit-aibackend.component';
import { AIBackendService } from '../../../shared/client/v1/aibackend.service';

@NgModule({
  imports: [
    SharedModule,
  ],
  providers: [
    AIBackendService
  ],
  exports: [AIBackendComponent,
    ListAIBackendComponent],
  declarations: [AIBackendComponent,
    ListAIBackendComponent, CreateEditAIBackendComponent]
})

export class AIBackendModule {
}

