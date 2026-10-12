import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DeploymentComponent } from './deployment.component';

describe('KubeDeploymentComponent', () => {
  const component: DeploymentComponent;
  const fixture: ComponentFixture<DeploymentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DeploymentComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeploymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
