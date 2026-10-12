import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListAutoscaleComponent } from './list-autoscale.component';

describe('ListAutoscaleComponent', () => {
  const component: ListAutoscaleComponent;
  const fixture: ComponentFixture<ListAutoscaleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListAutoscaleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListAutoscaleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
