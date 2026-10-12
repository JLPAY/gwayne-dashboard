import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SecretComponent } from './secret.component';

describe('SecretComponent', () => {
  const component: SecretComponent;
  const fixture: ComponentFixture<SecretComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SecretComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SecretComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
