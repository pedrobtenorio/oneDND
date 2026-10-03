import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiMotionDirective } from './ui-motion.directive';

@Component({ standalone: true, imports: [UiMotionDirective], template: '<div [appMotion]="value" [motionKind]="kind">Conteúdo</div>' })
class MotionHost {
  value: unknown = 1;
  kind: 'enter' | 'select' | 'pulse' = 'enter';
}

describe('UI motion accessibility and lifecycle', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [MotionHost] }));

  it('does not schedule animations when reduced motion is requested', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const frame = spyOn(window, 'requestAnimationFrame');
    const fixture = TestBed.createComponent(MotionHost);
    fixture.detectChanges();
    fixture.componentInstance.value = 2;
    fixture.detectChanges();
    expect(frame).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Conteúdo');
    fixture.destroy();
  });

  it('only animates resource counters after their value changes', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    const frame = spyOn(window, 'requestAnimationFrame').and.returnValue(42);
    const cancel = spyOn(window, 'cancelAnimationFrame');
    const fixture = TestBed.createComponent(MotionHost);
    fixture.componentInstance.kind = 'pulse';
    fixture.detectChanges();
    expect(frame).not.toHaveBeenCalled();
    fixture.componentInstance.value = 0;
    fixture.detectChanges();
    expect(frame).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(cancel).toHaveBeenCalledWith(42);
  });

  it('cancels pending selection feedback when quickly deselected', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    const frame = spyOn(window, 'requestAnimationFrame').and.returnValue(24);
    const cancel = spyOn(window, 'cancelAnimationFrame');
    const fixture = TestBed.createComponent(MotionHost);
    fixture.componentInstance.kind = 'select';
    fixture.componentInstance.value = true;
    fixture.detectChanges();
    fixture.componentInstance.value = false;
    fixture.detectChanges();
    expect(cancel).toHaveBeenCalledWith(24);
    expect(frame).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });
});
