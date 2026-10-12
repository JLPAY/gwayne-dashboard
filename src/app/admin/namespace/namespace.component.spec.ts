import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NamespaceComponent } from './namespace.component';

describe('NamespaceComponent', () => {
  const component: NamespaceComponent;
  const fixture: ComponentFixture<NamespaceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [NamespaceComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NamespaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
