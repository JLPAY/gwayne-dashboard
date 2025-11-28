import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PodLoggingComponent } from './pod-logging/pod-logging.component';
import { PortalComponent } from './portal.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NodesComponent } from './kubernetes/node/nodes.component';
import { KubeNamespaceComponent } from './kubernetes/namespace/kube-namespace.component';
import { KubeDeploymentComponent } from './kubernetes/deployment/kube-deployment.component';
import { KubeStatefulsetComponent } from './kubernetes/statefulset/kube-statefulset.component';
import { KubeDaemonsetComponent } from './kubernetes/daemonset/kube-daemonset.component';
import { KubeJobComponent } from './kubernetes/job/kube-job.component';
import { KubePodComponent } from './kubernetes/pod/kube-pod.component';
import { KubeCronjobComponent } from './kubernetes/cronjob/kube-cronjob.component';
import { KubeConfigmapComponent } from './kubernetes/configmap/kube-configmap.component';

const routes: Routes = [
  {
    path: 'portal',
    component: PortalComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'kubernetes/node',
        component: NodesComponent
      },
      {
        path: 'kubernetes/node/:cluster',
        component: NodesComponent
      },
      {
        path: 'kubernetes/namespace',
        component: KubeNamespaceComponent
      },
      {
        path: 'kubernetes/namespace/:cluster',
        component: KubeNamespaceComponent
      },
      {
        path: 'kubernetes/deployment',
        component: KubeDeploymentComponent
      },
      {
        path: 'kubernetes/deployment/:cluster',
        component: KubeDeploymentComponent
      },
      {
        path: 'kubernetes/statefulset',
        component: KubeStatefulsetComponent
      },
      {
        path: 'kubernetes/statefulset/:cluster',
        component: KubeStatefulsetComponent
      },
      {
        path: 'kubernetes/daemonset',
        component: KubeDaemonsetComponent
      },
      {
        path: 'kubernetes/daemonset/:cluster',
        component: KubeDaemonsetComponent
      },
      {
        path: 'kubernetes/job',
        component: KubeJobComponent
      },
      {
        path: 'kubernetes/job/:cluster',
        component: KubeJobComponent
      },
      {
        path: 'kubernetes/pod',
        component: KubePodComponent
      },
      {
        path: 'kubernetes/pod/:cluster',
        component: KubePodComponent
      },
      {
        path: 'kubernetes/cronjob',
        component: KubeCronjobComponent
      },
      {
        path: 'kubernetes/cronjob/:cluster',
        component: KubeCronjobComponent
      },
      {
        path: 'kubernetes/configmap',
        component: KubeConfigmapComponent
      },
      {
        path: 'kubernetes/configmap/:cluster',
        component: KubeConfigmapComponent
      }
    ]
  },
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
