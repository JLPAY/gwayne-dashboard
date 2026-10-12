import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AutoscaletplComponent } from './autoscaletpl.component';

describe('AutoscaletplComponent', () => {
  let component: AutoscaletplComponent;
  let fixture: ComponentFixture<AutoscaletplComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AutoscaletplComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AutoscaletplComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
