import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Input, NgZone, OnChanges, OnDestroy, inject } from '@angular/core';
import { animate } from 'motion/mini';

/** Visual feedback only: never delays navigation or changes game state. */
@Directive({ selector: '[appMotion]', standalone: true })
export class UiMotionDirective implements AfterViewInit, OnChanges, OnDestroy {
  @Input() appMotion: unknown = '';
  @Input() motionKind: 'enter' | 'select' | 'pulse' = 'enter';
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly zone = inject(NgZone);
  private ready = false;
  private frame?: number;
  private animation?: ReturnType<typeof animate>;
  private removePreferenceListener?: () => void;

  ngAfterViewInit(): void {
    this.ready = true;
    // Counters only animate actual changes, never their initial values.
    if (this.motionKind !== 'pulse') this.schedule();
  }

  ngOnChanges(): void {
    if (this.ready) this.schedule();
  }

  ngOnDestroy(): void { this.cancel(); }

  private cancel(): void {
    if (this.frame !== undefined) this.window?.cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.animation?.cancel();
    this.animation = undefined;
    this.removePreferenceListener?.();
    this.removePreferenceListener = undefined;
  }

  private schedule(): void {
    this.cancel();
    const window = this.window;
    if (!window || !this.element.animate || (this.motionKind === 'select' && !this.appMotion)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;
    this.zone.runOutsideAngular(() => {
      this.frame = window.requestAnimationFrame(() => {
        this.frame = undefined;
        if (preference.matches || !this.element.isConnected) return;
        const animation = animate(this.element, this.motionKind === 'enter'
          ? { opacity: [0.65, 1], transform: ['translateY(6px)', 'translateY(0px)'] }
          : this.motionKind === 'select'
            ? { opacity: [0.75, 1], transform: ['scale(0.985)', 'scale(1)'] }
            : { opacity: [0.55, 1] },
          { duration: this.motionKind === 'pulse' ? 0.16 : 0.2, ease: 'easeOut' });
        this.animation = animation;
        const onPreferenceChange = () => { if (preference.matches) this.cancel(); };
        preference.addEventListener('change', onPreferenceChange);
        this.removePreferenceListener = () => preference.removeEventListener('change', onPreferenceChange);
        animation.then(() => { if (this.animation === animation) this.cancel(); });
      });
    });
  }
}
