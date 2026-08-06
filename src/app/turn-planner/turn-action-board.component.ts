import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RuleEvaluation } from '../models/turn-planner.models';

@Component({
  selector: 'app-turn-action-board',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    <section aria-labelledby="options-title">
      <div class="board-heading">
        <h2 id="options-title">O que posso fazer agora?</h2>
        <span>{{ evaluations.length }} opções relevantes</span>
      </div>
      @for (group of groups; track group.id) {
        @if (group.items.length) {
          <section class="group" [attr.aria-labelledby]="'group-' + group.id">
            <h3 [id]="'group-' + group.id">{{ group.label }}</h3>
            <div class="cards">
              @for (evaluation of group.items; track evaluation.rule.id) {
                <button
                  type="button"
                  class="rule-card"
                  [class.available]="evaluation.status === 'available'"
                  [class.conditional]="evaluation.status === 'conditional'"
                  [class.blocked]="evaluation.status === 'blocked'"
                  (click)="inspect.emit(evaluation)"
                  [matTooltip]="evaluation.rule.referenceText || ''"
                  [matTooltipDisabled]="!evaluation.rule.referenceText"
                  matTooltipClass="condition-tooltip"
                  [attr.aria-label]="evaluation.rule.name + ': ' + statusLabel(evaluation.status)"
                >
                  <span class="status">{{ statusLabel(evaluation.status) }}</span>
                  <strong>{{ evaluation.rule.name }}</strong>
                  @if (didactic || evaluation.status !== 'available') {
                    <small>{{ evaluation.reasons[0]?.message || evaluation.rule.summary }}</small>
                  }
                </button>
              }
            </div>
          </section>
        }
      }
    </section>
  `,
  styles: `
    .board-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    h2, h3 { margin: 0; font-family: 'Cinzel', Georgia, serif; color: #4c1915; }
    h2 { font-size: 1.2rem; }
    h3 { margin-top: 16px; font-size: .92rem; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 9px; margin-top: 8px; }
    .rule-card { min-height: 92px; display: grid; align-content: start; gap: 7px; padding: 12px; text-align: left; border: 1px solid #c9aa70; border-left: 5px solid #338252; border-radius: 11px; background: #fffaf0; color: #2a211a; cursor: pointer; }
    .rule-card:hover, .rule-card:focus-visible { outline: 2px solid #8a481f; outline-offset: 2px; }
    .rule-card.conditional { border-left-color: #b57908; background: #fff6d8; }
    .rule-card.blocked { border-left-color: #9a9086; background: #ebe7de; color: #5d5650; }
    .status { width: fit-content; padding: 2px 7px; border-radius: 999px; background: rgba(30, 90, 52, .12); font-size: .68rem; font-weight: 800; text-transform: uppercase; }
    .conditional .status { background: rgba(181, 121, 8, .15); }
    .blocked .status { background: rgba(80, 75, 70, .12); }
    small { line-height: 1.35; }
  `,
})
export class TurnActionBoardComponent {
  @Input() evaluations: RuleEvaluation[] = [];
  @Input() didactic = true;
  @Output() readonly inspect = new EventEmitter<RuleEvaluation>();

  get groups(): Array<{ id: string; label: string; items: RuleEvaluation[] }> {
    const definitions = [
      ['action', 'Ações'],
      ['bonus', 'Ações Bônus'],
      ['movement', 'Movimento'],
      ['modifier', 'Gatilhos e modificadores'],
      ['reaction', 'Reações'],
      ['informational', 'Informações'],
    ];
    return definitions.map(([id, label]) => ({
      id,
      label,
      items: this.evaluations.filter((item) => item.rule.category === id),
    }));
  }

  statusLabel(status: RuleEvaluation['status']): string {
    return status === 'available' ? 'Disponível' : status === 'conditional' ? 'Confirmar' : 'Bloqueada';
  }
}
