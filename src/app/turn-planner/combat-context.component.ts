import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CombatContext, ContextFact } from '../models/turn-planner.models';

@Component({
  selector: 'app-combat-context',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section aria-labelledby="context-title">
      <h2 id="context-title">Contexto informado</h2>
      <p>“Não sei” mantém a opção condicional em vez de bloqueá-la silenciosamente.</p>
      <div class="facts">
        @for (fact of facts; track fact.id) {
          <label>
            <span>{{ fact.label }}</span>
            <select [ngModel]="context?.facts?.[fact.id] ?? 'unknown'" (ngModelChange)="emitFact(fact.id, $event)">
              <option value="unknown">Não sei</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </label>
        }
      </div>
    </section>
  `,
  styles: `
    h2, p { margin: 0; }
    h2 { color: #4c1915; font: 700 1.05rem 'Cinzel', Georgia, serif; }
    p { margin-top: 4px; color: #67584d; font-size: .84rem; }
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 9px; margin-top: 12px; }
    label { display: grid; gap: 5px; font-size: .82rem; font-weight: 700; }
    select { min-height: 38px; padding: 6px 9px; border: 1px solid #b89c6e; border-radius: 8px; background: #fffaf0; color: #2b2119; }
  `,
})
export class CombatContextComponent {
  @Input() context: CombatContext | null = null;
  @Output() readonly factChange = new EventEmitter<{ id: string; value: ContextFact }>();

  readonly facts = [
    { id: 'attack-advantage', label: 'Ataque com Vantagem?' },
    { id: 'attack-disadvantage', label: 'Ataque com Desvantagem?' },
    { id: 'sneak-weapon-eligible', label: 'Arma de Acuidade/à Distância?' },
    { id: 'ally-adjacent-target', label: 'Aliado válido junto ao alvo?' },
    { id: 'strength-attack', label: 'Ataque usa Força?' },
    { id: 'used-mastery-weapon', label: 'Usou arma com Maestria?' },
    { id: 'light-attack-eligible', label: 'Outro ataque de arma Leve elegível?' },
    { id: 'target-below-max-hp', label: 'Alvo abaixo dos PV máximos?' },
    { id: 'secondary-target-nearby', label: 'Há um segundo alvo próximo?' },
    { id: 'target-large-or-smaller', label: 'Alvo é Grande ou menor?' },
    { id: 'attacker-visible', label: 'Atacante está visível?' },
    { id: 'damage-received', label: 'Você recebeu dano?' },
    { id: 'target-left-reach', label: 'Alvo saiu do seu alcance?' },
    { id: 'target-disengaged', label: 'Alvo usou Desengajar?' },
  ];

  emitFact(id: string, raw: string): void {
    const value: ContextFact = raw === 'true' ? true : raw === 'false' ? false : 'unknown';
    this.factChange.emit({ id, value });
  }
}
