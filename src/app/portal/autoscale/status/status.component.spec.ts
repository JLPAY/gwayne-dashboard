import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { StatusComponent } from './status.component';

describe('StatusComponent', () => {
  const component: StatusComponent;
  const fixture: ComponentFixture<StatusComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StatusComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
