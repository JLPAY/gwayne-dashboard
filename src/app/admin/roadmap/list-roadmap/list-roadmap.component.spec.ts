import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListRoadmapComponent } from './list-roadmap.component';

describe('ListRoadmapComponent', () => {
  let component: ListRoadmapComponent;
  let fixture: ComponentFixture<ListRoadmapComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListRoadmapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListRoadmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
