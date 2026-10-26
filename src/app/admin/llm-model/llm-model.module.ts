import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { LLMModelComponent } from './llm-model.component';

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [
    LLMModelComponent
  ]
})
export class LLMModelModule {
}
