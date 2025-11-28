import { NgModule } from '@angular/core';
import { PortalRoutingModule } from './portal-routing.module';
import { PortalComponent } from './portal.component';
import { SharedModule } from '../shared/shared.module';
import { NavComponent } from './nav/nav.component';
import { IndexModule } from './index/index.module';
import { DeploymentModule } from './deployment/deployment.module';
import { AuthCheckGuard } from '../shared/auth/auth-check-guard.service';
import { AuthService } from '../shared/auth/auth.service';
import { ConfigMapModule } from './configmap/configmap.module';
import { CronjobModule } from './cronjob/cronjob.module';
import { SecretModule } from './secret/secret.module';
import { CacheService } from '../shared/auth/cache.service';
import { TplDetailService } from '../shared/tpl-detail/tpl-detail.service';
import { PersistentVolumeClaimModule } from './persistentvolumeclaim/persistentvolumeclaim.module';
import { AppApiKeyModule } from './app-apikey/apikey.module';
import { AppWebHookModule } from './app-webhook/app-webhook.module';
import { StatefulsetModule } from './statefulset/statefulset.module';
import { DaemonSetModule } from './daemonset/daemonset.module';
import { IngressModule } from './ingress/ingress.module';
import { PodLoggingComponent } from './pod-logging/pod-logging.component';
import { BaseAppModule } from './base/base-app.module';
import { TplDetailModule } from '../shared/tpl-detail/tpl-detail.module';
import { MarkdownModule } from 'ngx-markdown';
import { LibraryPortalModule } from '../../../lib/portal/library-portal.module';
import { AutoscaleModule } from './autoscale/autoscale.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SidenavModule } from './sidenav/sidenav.module';
import { NodesModule } from './kubernetes/node/nodes.module';
import { KubeNamespaceModule } from './kubernetes/namespace/kube-namespace.module';
import { KubeDeploymentModule } from './kubernetes/deployment/kube-deployment.module';
import { KubeStatefulsetModule } from './kubernetes/statefulset/kube-statefulset.module';
import { KubeDaemonsetModule } from './kubernetes/daemonset/kube-daemonset.module';
import { KubeJobModule } from './kubernetes/job/kube-job.module';
import { KubePodModule } from './kubernetes/pod/kube-pod.module';
import { KubeCronjobModule } from './kubernetes/cronjob/kube-cronjob.module';
import { KubeConfigmapModule } from './kubernetes/configmap/kube-configmap.module';
import { KubeSecretModule } from './kubernetes/secret/kube-secret.module';
import { KubeServiceModule } from './kubernetes/service/kube-service.module';
import { KubeIngressModule } from './kubernetes/ingress/kube-ingress.module';

@NgModule({
  imports: [
    PortalRoutingModule,
    SharedModule,
    IndexModule,
    DeploymentModule,
    ConfigMapModule,
    CronjobModule,
    SecretModule,
    PersistentVolumeClaimModule,
    AppWebHookModule,
    AppApiKeyModule,
    StatefulsetModule,
    DaemonSetModule,
    BaseAppModule,
    TplDetailModule,
    LibraryPortalModule,
    IngressModule,
    AutoscaleModule,
    DashboardModule,
    SidenavModule,
    NodesModule,
    KubeNamespaceModule,
    KubeDeploymentModule,
    KubeStatefulsetModule,
    KubeDaemonsetModule,
    KubeJobModule,
    KubePodModule,
    KubeCronjobModule,
    KubeConfigmapModule,
    KubeSecretModule,
    KubeServiceModule,
    KubeIngressModule,
    MarkdownModule.forRoot(),
  ],
  providers: [
    AuthCheckGuard,
    AuthService,
    CacheService,
    TplDetailService
  ],
  declarations: [
    NavComponent,
    PortalComponent,
    PodLoggingComponent,
  ]
})
export class PortalModule {
}
