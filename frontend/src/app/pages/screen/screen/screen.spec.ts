import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Screen } from './screen';

describe('Screen', () => {
  let component: Screen;
  let fixture: ComponentFixture<Screen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Screen],
    }).compileComponents();

    fixture = TestBed.createComponent(Screen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
