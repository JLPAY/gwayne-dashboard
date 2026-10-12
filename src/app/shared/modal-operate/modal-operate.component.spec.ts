import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ModalOperateComponent } from './modal-operate.component';

describe('ModalOperateComponent', () => {
  const component: ModalOperateComponent;
  const fixture: ComponentFixture<ModalOperateComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ModalOperateComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalOperateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
