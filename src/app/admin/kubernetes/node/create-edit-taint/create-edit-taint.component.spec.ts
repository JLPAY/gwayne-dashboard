import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CreateEditTaintComponent } from './create-edit-taint.component';

describe('CreateEditTaintComponent', () => {
  let component: CreateEditTaintComponent;
  let fixture: ComponentFixture<CreateEditTaintComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateEditTaintComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateEditTaintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
