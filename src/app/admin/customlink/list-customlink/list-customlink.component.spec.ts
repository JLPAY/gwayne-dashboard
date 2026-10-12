import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListCustomlinkComponent } from './list-customlink.component';

describe('ListCustomlinkComponent', () => {
  let component: ListCustomlinkComponent;
  let fixture: ComponentFixture<ListCustomlinkComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListCustomlinkComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListCustomlinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
