import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

import { RuleEvaluation } from '../models/turn-planner.models';

@Component({
  selector: 'app-rule-details',
  standalone: true,
  imports: [RouterModule],
  template: `
    @if (evaluation) {
      <aside class="details" aria-labelledby="rule-title">
        <span class="eyebrow">{{ statusLabel }}</span>
        <h2 id="rule-title">{{ evaluation.rule.name }}</h2>
        <p>{{ evaluation.rule.summary }}</p>
        @if (evaluation.rule.referenceFragment) {
          <a class="spell-reference" [routerLink]="['/magias']" [fragment]="evaluation.rule.referenceFragment">Abrir texto completo da magia</a>
        }
        <dl>
          <div><dt>Ativação</dt><dd>{{ evaluation.rule.activation }}</dd></div>
          <div><dt>Suporte</dt><dd>{{ evaluation.rule.support }}</dd></div>
          <div><dt>Consome</dt><dd>{{ costs || 'Nenhum custo de economia' }}</dd></div>
          <div><dt>Fonte</dt><dd>{{ evaluation.rule.source.book }}, p. {{ evaluation.rule.source.page }}</dd></div>
        </dl>
        @if (evaluation.reasons.length) {
          <h3>Por quê?</h3>
          <ul>
            @for (reason of evaluation.reasons; track reason.code + reason.message) { <li>{{ reason.message }}</li> }
          </ul>
        }
        @if (evaluation.missingFacts.length) {
          <div class="fact-prompts">
            <strong>Confirmação necessária</strong>
            @for (factId of evaluation.missingFacts; track factId) {
              <div><span>{{ factLabel(factId) }}</span><button type="button" (click)="factAnswer.emit({ id: factId, value: true })">Sim</button><button type="button" (click)="factAnswer.emit({ id: factId, value: false })">Não</button></div>
            }
          </div>
        }
        @if (evaluation.rule.support !== 'structured') {
          <p class="manual">O motor controla custo e gatilho; jogadas, dano e efeitos de mesa são confirmados manualmente.</p>
        }
        <button class="primary-button" type="button" (click)="confirm.emit()" [disabled]="!canConfirm">
          Confirmar opção
        </button>
      </aside>
    }
  `,
  styles: `
    .details { position: sticky; top: 88px; display: grid; gap: 10px; padding: 18px; border: 1px solid rgba(111, 66, 28, .28); border-radius: 15px; background: linear-gradient(145deg, #fff9e8, #efe1bd); box-shadow: 0 12px 30px rgba(55, 30, 10, .12); }
    h2, h3, p, dl, ul { margin: 0; }
    h2 { color: #541d18; font-family: 'Cinzel', Georgia, serif; }
    h3 { font-size: .9rem; }
    .eyebrow { color: #7c4a1d; font-size: .72rem; font-weight: 800; text-transform: uppercase; }
    dl { display: grid; gap: 6px; }
    dl div { display: grid; grid-template-columns: 78px 1fr; gap: 8px; }
    dt { font-weight: 800; }
    dd { margin: 0; }
    ul { padding-left: 20px; }
    .manual { padding: 9px; border-radius: 8px; background: rgba(132, 82, 21, .09); font-size: .85rem; }
    .spell-reference { width: fit-content; color: #6f241e; font-size: .82rem; font-weight: 800; text-decoration-thickness: 1px; text-underline-offset: 3px; }
    .fact-prompts { display: grid; gap: 7px; padding: 9px; border-radius: 8px; background: #fff2c5; }
    .fact-prompts div { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 5px; }
    .fact-prompts button { min-height: 30px; border: 1px solid #8b5e28; border-radius: 6px; background: #fffaf0; }
    .primary-button { min-height: 40px; border: 0; border-radius: 8px; background: #74251e; color: #fff4d7; font-weight: 800; cursor: pointer; }
    .primary-button:disabled { opacity: .46; cursor: not-allowed; }
  `,
})
export class RuleDetailsComponent {
  @Input() evaluation: RuleEvaluation | null = null;
  @Output() readonly confirm = new EventEmitter<void>();
  @Output() readonly factAnswer = new EventEmitter<{ id: string; value: boolean }>();

  get canConfirm(): boolean {
    return !!this.evaluation && this.evaluation.status !== 'blocked' && !this.evaluation.missingFacts.length;
  }

  get statusLabel(): string {
    if (!this.evaluation) return '';
    return this.evaluation.status === 'available' ? 'Disponível agora' : this.evaluation.status === 'conditional' ? 'Requer confirmação' : 'Bloqueada';
  }

  get costs(): string {
    return (this.evaluation?.rule.costs ?? [])
      .map((cost) => cost.type === 'resource' ? `${cost.amount} × ${cost.id}` : cost.type === 'spell-slot' ? `espaço de ${cost.level}º círculo` : cost.type)
      .join(', ');
  }

  factLabel(factId: string): string {
    return this.evaluation?.reasons.find((reason) => reason.factId === factId)?.message ?? factId;
  }
}
