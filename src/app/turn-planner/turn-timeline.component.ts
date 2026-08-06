import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TurnState } from '../models/turn-planner.models';

@Component({
  selector: 'app-turn-timeline',
  standalone: true,
  imports: [],
  template: `
    <section aria-labelledby="timeline-title">
      <div class="heading">
        <h2 id="timeline-title">Sequência</h2>
        <span><button type="button" (click)="undo.emit()" [disabled]="!canUndo">Desfazer</button><button type="button" (click)="redo.emit()" [disabled]="!canRedo">Refazer</button></span>
      </div>
      @if (!state?.timeline?.length) { <p class="empty">As escolhas confirmadas aparecerão aqui.</p> }
      <ol>
        @for (entry of state?.timeline ?? []; track entry.id) {
          <li><strong>{{ entry.title }}</strong><span>{{ entry.detail }}</span></li>
        }
      </ol>
    </section>
  `,
  styles: `
    .heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    h2 { margin: 0; color: #4c1915; font: 700 1.1rem 'Cinzel', Georgia, serif; }
    ol { position: relative; display: grid; gap: 12px; margin: 14px 0 0; padding: 0 0 0 24px; list-style: none; }
    ol::before { content: ''; position: absolute; left: 7px; top: 4px; bottom: 4px; width: 2px; background: #c39d5b; }
    li { position: relative; display: grid; gap: 2px; }
    li::before { content: ''; position: absolute; left: -21px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background: #7c2820; }
    li span, .empty { color: #66584d; font-size: .86rem; }
  `,
})
export class TurnTimelineComponent {
  @Input() state: TurnState | null = null;
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Output() readonly undo = new EventEmitter<void>();
  @Output() readonly redo = new EventEmitter<void>();
}
