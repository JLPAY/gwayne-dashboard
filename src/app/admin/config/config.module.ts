import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ConfigComponent } from './config.component';
import { ListConfigComponent } from './list-config/list-config.component';
import { CreateEditConfigComponent } from './create-edit-config/create-edit-config.component';
import { ConfigService } from '../../shared/client/v1/config.service';
import { ConfigSystemComponent } from './list-config-system/config-system.component';
import { RsaKeyManagerComponent } from './rsa-key-manager/rsa-key-manager.component';

@NgModule({
  imports: [
    SharedModule,
  ],
  providers: [
    ConfigService
  ],
  exports: [ConfigComponent,
    ListConfigComponent],
  declarations: [ConfigComponent,
    ListConfigComponent, CreateEditConfigComponent, ConfigSystemComponent, RsaKeyManagerComponent]
})

export class ConfigModule {
}
