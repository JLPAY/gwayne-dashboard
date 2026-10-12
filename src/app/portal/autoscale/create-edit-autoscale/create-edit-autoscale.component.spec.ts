import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CreateEditAutoscaleComponent } from './create-edit-autoscale.component';

describe('CreateEditAutoscaleComponent', () => {
  const component: CreateEditAutoscaleComponent;
  const fixture: ComponentFixture<CreateEditAutoscaleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateEditAutoscaleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateEditAutoscaleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
