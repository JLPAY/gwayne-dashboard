import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { RouterModule } from '@angular/router';
import { FooterModule } from '../../shared/footer/footer.module';
import { SidenavModule } from '../sidenav/sidenav.module';
import { BaseComponent } from './base.component';
import { TplDetailModule } from '../../shared/tpl-detail/tpl-detail.module';

@NgModule({
  imports: [
    SharedModule,
    RouterModule,
    FooterModule,
    SidenavModule,
    TplDetailModule,
  ],
  providers: [],
  exports: [BaseComponent],
  declarations: [BaseComponent
  ]
})

export class BaseAppModule {
}
