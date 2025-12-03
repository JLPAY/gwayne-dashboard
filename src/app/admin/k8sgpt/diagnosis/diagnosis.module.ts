import { NgModule } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { DiagnosisComponent } from './diagnosis.component';
import { K8sGPTDiagnosisService } from '../../../shared/client/v1/k8sgpt-diagnosis.service';
import { ClusterService } from '../../../shared/client/v1/cluster.service';
import { AIBackendService } from '../../../shared/client/v1/aibackend.service';

@NgModule({
  imports: [
    SharedModule,
  ],
  providers: [
    K8sGPTDiagnosisService,
    ClusterService,
    AIBackendService
  ],
  exports: [DiagnosisComponent],
  declarations: [DiagnosisComponent]
})

export class DiagnosisModule {
}

