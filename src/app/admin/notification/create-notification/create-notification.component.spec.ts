import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CreateNotificationComponent } from './create-notification.component';

describe('CreateNotificationComponent', () => {
  const component: CreateNotificationComponent;
  const fixture: ComponentFixture<CreateNotificationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CreateNotificationComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
