import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UnauthorizedComponent } from './shared/unauthorized/unauthorized.component';
import { PageNotFoundComponent } from './shared/not-found/not-found.component';

const routes: Routes = [
  {path: '', redirectTo: 'admin/reportform/overview', pathMatch: 'full'},
  {path: 'unauthorized', component: UnauthorizedComponent},
  {path: '**', component: PageNotFoundComponent},
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class RoutingModule {

}
