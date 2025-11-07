import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PortalComponent } from './portal.component';
import { IndexComponent } from './index/index.component';
import { AppComponent } from './app/app.component';
import { BaseComponent } from './base/base.component';
import { DetailAppComponent } from './app/detail-app/detail-app.component';
import { DeploymentComponent } from './deployment/deployment.component';
import { CreateEditDeploymentTplComponent } from './deployment/create-edit-deploymenttpl/create-edit-deploymenttpl.component';
import { AuthCheckGuard } from '../shared/auth/auth-check-guard.service';
import { ConfigMapComponent } from './configmap/configmap.component';
import { CreateEditConfigMapTplComponent } from './configmap/create-edit-configmaptpl/create-edit-configmaptpl.component';
import { SecretComponent } from './secret/secret.component';
import { CreateEditSecretTplComponent } from './secret/create-edit-secrettpl/create-edit-secrettpl.component';
import { AppUserComponent } from './app-user/app-user.component';
import { NamespaceUserComponent } from './namespace-user/namespace-user.component';
import { PersistentVolumeClaimComponent } from './persistentvolumeclaim/persistentvolumeclaim.component';
import {
  CreateEditPersistentVolumeClaimTplComponent
} from './persistentvolumeclaim/create-edit-persistentvolumeclaimtpl/create-edit-persistentvolumeclaimtpl.component';
import {
  ListPersistentVolumeClaimComponent
} from './persistentvolumeclaim/list-persistentvolumeclaim/list-persistentvolumeclaim.component';
import { CronjobComponent } from './cronjob/cronjob.component';
import { CreateEditCronjobTplComponent } from './cronjob/create-edit-cronjobtpl/create-edit-cronjobtpl.component';
import { NamespaceApiKeyComponent } from './namespace-apikey/apikey.component';
import { AppApiKeyComponent } from './app-apikey/apikey.component';
import { AppWebHookComponent } from './app-webhook/app-webhook.component';
import { NamespaceWebHookComponent } from './namespace-webhook/namespace-webhook.component';
import { StatefulsetComponent } from './statefulset/statefulset.component';
import { CreateEditStatefulsettplComponent } from './statefulset/create-edit-statefulsettpl/create-edit-statefulsettpl.component';
import { DaemonSetComponent } from './daemonset/daemonset.component';
import { CreateEditDaemonSetTplComponent } from './daemonset/create-edit-daemonsettpl/create-edit-daemonsettpl.component';
import { PodLoggingComponent } from './pod-logging/pod-logging.component';
import { NamespaceReportComponent } from './namespace-report/namespace-report.component';
import { IngressComponent } from './ingress/ingress.component';
import { CreateEditIngressTplComponent } from './ingress/create-edit-ingresstpl/create-edit-ingresstpl.component';
import { PORTALROUTES } from '../../../lib/portal/library-routing-portal';
import { AutoscaleComponent } from './autoscale/autoscale.component';
import { CreateEditAutoscaletplComponent } from './autoscale/create-edit-autoscaletpl/create-edit-autoscaletpl.component';
import { PortalKubePodComponent } from './kubernetes/pod/kube-pod.component';
import { PortalKubeDeploymentComponent } from './kubernetes/deployment/kube-deployment.component';
import { PortalKubeIngressComponent } from './kubernetes/ingress/kube-ingress.component';
import { PortalKubeConfigmapComponent } from './kubernetes/configmap/kube-configmap.component';
import { PortalKubeJobComponent } from './kubernetes/job/kube-job.component';
import { PortalKubeCronjobComponent } from './kubernetes/cronjob/kube-cronjob.component';
import { PortalKubeServiceComponent } from './kubernetes/service/kube-service.component';
import { PortalKubeHpaComponent } from './kubernetes/hpa/kube-hpa.component';
import { PortalKubeSecretComponent } from './kubernetes/secret/kube-secret.component';
import { PortalKubeStatefulsetComponent } from './kubernetes/statefulset/kube-statefulset.component';
import { PortalKubeDaemonsetComponent } from './kubernetes/daemonset/kube-daemonset.component';
import { PortalKubeNamespaceComponent } from './kubernetes/namespace/kube-namespace.component';
import { PortalNodesComponent } from './kubernetes/node/nodes.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  {
    path: 'portal/namespace/:nid',
    canActivateChild: [AuthCheckGuard],
    component: PortalComponent,
    children: [
      {path: 'index', component: IndexComponent},
      {path: 'app', component: AppComponent},
      {path: 'apikey', component: NamespaceApiKeyComponent},
      {path: 'users', component: NamespaceUserComponent},
      {path: 'webhook', component: NamespaceWebHookComponent},
      {path: 'overview', component: NamespaceReportComponent},
      {
        path: 'app/:id', component: BaseComponent,
        children: [
          {path: 'apikey', component: AppApiKeyComponent},
          {path: 'user', component: AppUserComponent},
          {path: 'detail', component: DetailAppComponent},
          {path: 'deployment', component: DeploymentComponent},
          {path: 'deployment/:deploymentId', component: DeploymentComponent},
          {path: 'deployment/:deploymentId/tpl', component: CreateEditDeploymentTplComponent},
          {path: 'deployment/:deploymentId/tpl/:tplId', component: CreateEditDeploymentTplComponent},
          {path: 'configmap', component: ConfigMapComponent},
          {path: 'configmap/:configMapId', component: ConfigMapComponent},
          {path: 'configmap/:configMapId/tpl', component: CreateEditConfigMapTplComponent},
          {path: 'configmap/:configMapId/tpl/:tplId', component: CreateEditConfigMapTplComponent},
          {path: 'cronjob', component: CronjobComponent},
          {path: 'cronjob/:cronjobId', component: CronjobComponent},
          {path: 'cronjob/:cronjobId/tpl', component: CreateEditCronjobTplComponent},
          {path: 'cronjob/:cronjobId/tpl/:tplId', component: CreateEditCronjobTplComponent},
          {path: 'secret', component: SecretComponent},
          {path: 'secret/:secretId', component: SecretComponent},
          {path: 'secret/:secretId/tpl', component: CreateEditSecretTplComponent},
          {path: 'secret/:secretId/tpl/:tplId', component: CreateEditSecretTplComponent},
          {path: 'persistentvolumeclaim', component: PersistentVolumeClaimComponent},
          {
            path: 'persistentvolumeclaim/:pvcId', component: PersistentVolumeClaimComponent,
            children: [
              {path: 'list', component: ListPersistentVolumeClaimComponent},
            ],
          },
          {path: 'persistentvolumeclaim/:pvcId/tpl', component: CreateEditPersistentVolumeClaimTplComponent},
          {path: 'persistentvolumeclaim/:pvcId/tpl/:tplId', component: CreateEditPersistentVolumeClaimTplComponent},
          {path: 'webhook', component: AppWebHookComponent},
          {path: 'statefulset', component: StatefulsetComponent},
          {path: 'statefulset/:statefulsetId', component: StatefulsetComponent},
          {path: 'statefulset/:statefulsetId/tpl', component: CreateEditStatefulsettplComponent},
          {path: 'statefulset/:statefulsetId/tpl/:tplId', component: CreateEditStatefulsettplComponent},
          {path: 'daemonset', component: DaemonSetComponent},
          {path: 'daemonset/:daemonSetId', component: DaemonSetComponent},
          {path: 'daemonset/:daemonSetId/tpl', component: CreateEditDaemonSetTplComponent},
          {path: 'daemonset/:daemonSetId/tpl/:tplId', component: CreateEditDaemonSetTplComponent},
          {path: 'ingress', component: IngressComponent},
          {path: 'ingress/:resourceId', component: IngressComponent},
          {path: 'ingress/:resourceId/tpl', component: CreateEditIngressTplComponent},
          {path: 'ingress/:resourceId/tpl/:tplId', component: CreateEditIngressTplComponent},
          {path: 'autoscale', component: AutoscaleComponent},
          {path: 'autoscale/:resourceId', component: AutoscaleComponent},
          {path: 'autoscale/:resourceId/tpl', component: CreateEditAutoscaletplComponent},
          {path: 'autoscale/:resourceId/tpl/:tplId', component: CreateEditAutoscaletplComponent},
          ...PORTALROUTES
        ]
      },
    ]
  },
  {
    path: 'portal/logging/namespace/:nid/app/:id/:resourceType/:resourceName/pod/:podName/:cluster/:namespace',
    component: PodLoggingComponent
  },
  {
    path: 'portal/logging/namespace/:nid/app/:id/:resourceType/:resourceName/pod/:podName/container/:container/:cluster/:namespace',
    component: PodLoggingComponent
  },
  {
    path: 'portal/dashboard',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: DashboardComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/pod',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubePodComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/pod/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubePodComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/deployment',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeDeploymentComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/deployment/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeDeploymentComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/ingress',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeIngressComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/ingress/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeIngressComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/configmap',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeConfigmapComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/configmap/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeConfigmapComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/job',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeJobComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/job/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeJobComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/cronjob',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeCronjobComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/cronjob/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeCronjobComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/service',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeServiceComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/service/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeServiceComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/hpa',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeHpaComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/hpa/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeHpaComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/secret',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeSecretComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/secret/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeSecretComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/statefulset',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeStatefulsetComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/statefulset/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeStatefulsetComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/daemonset',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeDaemonsetComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/daemonset/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeDaemonsetComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/namespace',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeNamespaceComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/namespace/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalKubeNamespaceComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/node',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalNodesComponent
      }
    ]
  },
  {
    path: 'portal/kubernetes/node/:cluster',
    component: PortalComponent,
    children: [
      {
        path: '',
        component: PortalNodesComponent
      }
    ]
  },
  {
    path: 'portal',
    redirectTo: 'portal/dashboard',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortalRoutingModule {
}
