import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TrashAutoscaletplComponent } from './trash-autoscaletpl.component';

describe('TrashAutoscaletplComponent', () => {
  let component: TrashAutoscaletplComponent;
  let fixture: ComponentFixture<TrashAutoscaletplComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ TrashAutoscaletplComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TrashAutoscaletplComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
