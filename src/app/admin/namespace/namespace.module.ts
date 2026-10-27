import { NgModule } from '@angular/core';
import { NamespaceComponent } from './namespace.component';
import { CreateEditNamespaceComponent } from './create-edit-namespace/create-edit-namespace.component';
import { ListNamespaceComponent } from './list-namespace/list-namespace.component';
import { TrashNamespaceComponent } from './trash-namespace/trash-namespace.component';
import { SharedModule } from '../../shared/shared.module';
import { NamespaceService } from '../../shared/client/v1/namespace.service';
import { NamespaceClient } from '../../shared/client/v1/kubernetes/namespace';
import { MigrateNamespaceComponent } from './migrate-namespace/migrate-namespace.component';

@NgModule({
  imports: [
    SharedModule
  ],
  providers: [
    NamespaceService,
    NamespaceClient
  ],
  exports: [
    NamespaceComponent,
    ListNamespaceComponent
  ],
  declarations: [
    NamespaceComponent,
    TrashNamespaceComponent,
    ListNamespaceComponent,
    CreateEditNamespaceComponent,
    MigrateNamespaceComponent
  ]
})

export class NamespaceModule {
}
