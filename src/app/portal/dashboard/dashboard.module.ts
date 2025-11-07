import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { DashboardComponent } from './dashboard.component';
import { DashboardSidenavComponent } from './dashboard-sidenav/dashboard-sidenav.component';

@NgModule({
  imports: [
    SharedModule,
  ],
  providers: [],
  exports: [
    DashboardComponent,
    DashboardSidenavComponent
  ],
  declarations: [
    DashboardComponent,
    DashboardSidenavComponent
  ]
})

export class DashboardModule {
}

