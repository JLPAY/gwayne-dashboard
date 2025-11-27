import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PodLoggingComponent } from './pod-logging/pod-logging.component';

const routes: Routes = [
  {
    path: 'portal/logging/namespace/:nid/app/:id/:resourceType/:resourceName/pod/:podName/:cluster/:namespace',
    component: PodLoggingComponent
  },
  {
    path: 'portal/logging/namespace/:nid/app/:id/:resourceType/:resourceName/pod/:podName/container/:container/:cluster/:namespace',
    component: PodLoggingComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortalRoutingModule {
}
