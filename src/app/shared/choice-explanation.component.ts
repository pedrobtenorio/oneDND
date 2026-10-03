import { Component, Input, OnChanges } from '@angular/core';
import { CharacterFeature, CharacterOption, TurnClassId } from '../models/turn-planner.models';
import { CLASS_PLAYSTYLES } from '../utils/class-playstyles';
import { ABILITY_NAMES, requirementLabels } from '../utils/character-reference';
import { FormattedTextComponent } from './formatted-text.component';

@Component({
  selector: 'app-choice-explanation', standalone: true, imports: [FormattedTextComponent],
  template: `
    <details class="explanation" [open]="mode === 'class'">
      <summary>{{ title }} · entender e comparar</summary>
      <p>Consulte o que cada opção acrescenta antes de decidir. Comparar não altera suas escolhas.</p>
      <div class="comparison">
        @for (side of [0, 1]; track side) {
          <article>
            <label>{{ side === 0 ? 'Consultar opção' : 'Comparar com' }}
              <select [value]="ids[side]" (change)="choose(side, $event)">
                <option value="">Selecione uma opção</option>
                @for (option of options; track option.id) { <option [value]="option.id" [selected]="option.id === ids[side]">{{ option.name }}</option> }
              </select>
            </label>
            @if (find(ids[side]); as option) {
              <h3>{{ option.name }}</h3>
              @if (playstyle(option); as style) {
                <h4>Jogue se você gosta de…</h4><p>{{ style.enjoy }}</p>
                <h4>Em que se destaca</h4><p>{{ style.strengths }}</p>
                <h4>Como costuma jogar</h4><p>{{ style.play }}</p>
                <h4>Pode não agradar</h4><p>{{ style.tradeoff }}</p>
              } @else {
                <h4>O que acrescenta</h4><p><app-formatted-text [text]="option.summary" /></p>
              }
              @if (option.abilityPoints) { <p><strong>+{{ option.abilityPoints }} em atributos:</strong> {{ abilityList(option) }}. Máximo final: 20.</p> }
              <h4>Pré-requisitos</h4>
              <ul>@for (label of requirements(option); track label) { <li>{{ label }}</li> }</ul>
              @if (!requirements(option).length) { <p>{{ mode === 'class' ? 'Primeiro nível da classe. Multiclasse exige revisão dos requisitos do livro.' : 'Sem pré-requisitos adicionais no catálogo.' }}</p> }
              @if (unmet(option).length) { <p class="unmet">Ainda falta: {{ unmet(option).join(' ') }}</p> }
              @if (option.requiresOptionIds?.length) { <p>Escolhas exigidas: {{ dependencyNames(option) }}</p> }
              @if (mode === 'subclass') { <p>Escolha disponível a partir do nível 3 da classe.</p> }
              @for (feature of benefits(option); track feature.id) {
                <details class="feature"><summary>Nível {{ feature.minLevel }} · {{ feature.name }}</summary><p><app-formatted-text [text]="feature.description" /></p><small>Livro do Jogador · p. {{ feature.source.page }}</small></details>
              }
              @if (option.description && option.description !== option.summary) { <details class="feature"><summary>Descrição completa</summary><p><app-formatted-text [text]="option.description" /></p></details> }
              @if (option.source.page) { <small>Livro do Jogador · p. {{ option.source.page }}</small> }
            }
          </article>
        }
      </div>
    </details>
  `,
  styles: [`
    :host{display:block;margin:1rem 0} .explanation{border:1px solid var(--border-color,#cbbd9d);border-radius:12px;padding:1rem;background:var(--surface,#fffaf0)} summary{cursor:pointer;font-weight:700} .comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem} article{min-width:0;padding:.8rem;border:1px solid #ded3bb;border-radius:8px} label{display:grid;gap:.5rem;font-weight:600} select{width:100%;padding:.7rem;background:#fffdf8;color:#30291f;border:1px solid #b8a98b;border-radius:8px} p{line-height:1.6;white-space:pre-line;overflow-wrap:anywhere} h4{margin-bottom:.4rem;color:#794133} small{color:#736755} .feature{margin:.8rem 0} .unmet{color:#9d312e} summary:focus-visible,select:focus-visible{outline:3px solid #ac8341;outline-offset:3px}@media(max-width:600px){.comparison{grid-template-columns:1fr}}
  `],
})
export class ChoiceExplanationComponent implements OnChanges {
  @Input() title = 'Escolhas';
  @Input() mode: 'class' | 'subclass' | 'feat' = 'feat';
  @Input() options: CharacterOption[] = [];
  @Input() features: CharacterFeature[] = [];
  @Input() selectedId = '';
  @Input() level = 1;
  @Input() classLevels: Record<string, number> = {};
  @Input() unmet: (option: CharacterOption) => string[] = () => [];
  ids = ['', ''];
  ngOnChanges(changes: import('@angular/core').SimpleChanges): void {
    if (changes['selectedId']) this.ids[0] = this.selectedId;
  }
  choose(side: number, event: Event): void { this.ids[side] = (event.target as HTMLSelectElement).value; }
  find(id: string): CharacterOption | undefined { return this.options.find(o => o.id === id); }
  playstyle(option: CharacterOption) { return this.mode === 'class' ? CLASS_PLAYSTYLES[option.id as TurnClassId] : undefined; }
  requirements = requirementLabels;
  consultedLevel(option: CharacterOption): number { return this.mode === 'class' ? this.classLevels[option.id] ?? 0 : this.level; }
  abilityList(option: CharacterOption): string { return (option.abilityOptions ?? []).map(id => ABILITY_NAMES[id]).join(', '); }
  dependencyNames(option: CharacterOption): string { return (option.requiresOptionIds ?? []).map(id => this.find(id)?.name ?? id).join(', '); }
  benefits(option: CharacterOption): CharacterFeature[] {
    return this.features.filter(f => f.minLevel <= 8 && (this.mode === 'class' ? f.classId === option.id && !f.subclassId : this.mode === 'subclass' && f.subclassId === option.id)).sort((a,b) => a.minLevel - b.minLevel);
  }
}
