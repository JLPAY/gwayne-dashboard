import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PaginateComponent } from './paginate.component';

describe('PaginateComponent', () => {
  const component: PaginateComponent;
  const fixture: ComponentFixture<PaginateComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PaginateComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PaginateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
