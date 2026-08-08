import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TurnState } from '../models/turn-planner.models';

@Component({
  selector: 'app-turn-resource-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (state) {
      <section class="resource-bar" aria-label="Economia do turno" aria-live="polite">
        <div class="token"><strong>Ações</strong><span>{{ state.actionTokens.length }}</span></div>
        <div class="token"><strong>Ação Bônus</strong><span>{{ state.bonusActionAvailable ? 'Livre' : 'Usada' }}</span></div>
        <div class="token"><strong>Reação</strong><span>{{ state.reactionAvailable ? 'Livre' : 'Usada' }}</span></div>
        <div class="token"><strong>Movimento</strong><span>{{ state.movementRemaining | number: '1.0-1' }} m</span></div>
        <div class="token"><strong>Concentração</strong><span>{{ state.concentrationSpellId || 'Nenhuma' }}</span></div>
        @for (resource of resources; track resource.id) {
          <div class="token resource">
            <strong>{{ resource.label }}</strong>
            <span>{{ resource.current }}/{{ resource.max }}</span>
            <span class="resource-controls">
              <button type="button" (click)="change(resource.id, resource.current - 1)" [disabled]="resource.current <= 0" [attr.aria-label]="'Reduzir ' + resource.label">−</button>
              <button type="button" (click)="change(resource.id, resource.current + 1)" [disabled]="resource.current >= resource.max" [attr.aria-label]="'Aumentar ' + resource.label">+</button>
            </span>
          </div>
        }
      </section>
    }
  `,
  styles: `
    .resource-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; }
    .token { display: grid; gap: 3px; min-height: 62px; padding: 10px 12px; border: 1px solid rgba(115, 74, 28, .25); border-radius: 12px; background: rgba(255, 248, 222, .72); }
    .token strong { color: #5b1d18; font-size: .78rem; letter-spacing: .04em; text-transform: uppercase; }
    .token span { font-weight: 700; }
    .resource-controls { display: flex; gap: 3px; }
    .resource-controls button { min-width: 34px; padding: 0; line-height: 28px; }
  `,
})
export class TurnResourceBarComponent {
  @Input({ required: true }) state: TurnState | null = null;
  @Output() readonly resourceChange = new EventEmitter<{ id: string; current: number }>();

  get resources(): Array<{ id: string; current: number; max: number; label: string }> {
    return Object.entries(this.state?.resources ?? {}).map(([id, value]) => ({ id, ...value }));
  }

  change(id: string, current: number): void {
    this.resourceChange.emit({ id, current });
  }
}
