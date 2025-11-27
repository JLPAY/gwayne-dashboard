import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { DashboardComponent } from './dashboard.component';

@NgModule({
  imports: [
    SharedModule,
  ],
  providers: [],
  exports: [DashboardComponent],
  declarations: [DashboardComponent]
})
export class DashboardModule {
}

