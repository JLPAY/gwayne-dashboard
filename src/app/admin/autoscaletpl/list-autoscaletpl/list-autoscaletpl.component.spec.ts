import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListAutoscaletplComponent } from './list-autoscaletpl.component';

describe('ListAutoscaletplComponent', () => {
  let component: ListAutoscaletplComponent;
  let fixture: ComponentFixture<ListAutoscaletplComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListAutoscaletplComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListAutoscaletplComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
