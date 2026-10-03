import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TurnClassId } from '../models/turn-planner.models';
import { UiMotionDirective } from '../shared/ui-motion.directive';
import { CHARACTER_PORTRAITS, findPortrait, portraitPath, portraitCollection, PORTRAIT_CLASS_LABELS, PORTRAIT_ORIGIN_LABELS } from '../utils/portrait-catalog';

@Component({
  selector: 'app-portrait-picker',
  standalone: true,
  imports: [UiMotionDirective],
  styleUrl: './portrait-picker.component.css',
  template: `
    <section class="portrait-picker" aria-label="Retrato do personagem">
      <div class="portrait-preview">
        <img [src]="previewImage" [appMotion]="selectedId" motionKind="pulse" alt="Prévia do retrato escolhido" width="92" height="108" />
        <div><h3>Retrato do personagem</h3><strong>{{ selected?.name ?? (selectedId ? 'Retrato indisponível' : 'Retrato padrão') }}</strong>
          <p>Escolha uma ilustração para sua ficha. A imagem não altera as regras do personagem.</p>
          @if (selectedId && !selected) { <p role="status">O retrato anterior foi preservado, mas não está nesta galeria. Você pode escolher outro.</p> }
          <button type="button" class="secondary-button" [attr.aria-expanded]="expanded" (click)="expanded = !expanded">{{ expanded ? 'Fechar galeria' : 'Escolher retrato' }}</button>
        </div>
      </div>
      @if (expanded) {
        <div class="portrait-filters" appMotion>
          <label class="field"><span>Coleção</span><select [value]="collectionFilter" (change)="collectionFilter = valueOf($event)"><option value="">Todas as coleções</option><option value="printableheroes">PrintableHeroes</option><option value="papermage">Paper Mage</option><option value="wesnoth">Wesnoth</option></select></label>
          <label class="field"><span>Estilo de classe</span><select [value]="styleFilter" (change)="styleFilter = valueOf($event)"><option value="">Todas as classes</option>@for (style of styles; track style.id) { <option [value]="style.id">{{ style.name }}</option> }</select></label>
          <label class="field"><span>Origem da ilustração</span><select [value]="originFilter" (change)="originFilter = valueOf($event)"><option value="">Todas as origens</option>@for (origin of origins; track origin.id) { <option [value]="origin.id">{{ origin.name }}</option> }</select></label>
          <label class="field"><span>Aparência</span><select [value]="appearanceFilter" (change)="appearanceFilter = valueOf($event)"><option value="">Todas</option><option value="masculina">Masculina</option><option value="feminina">Feminina</option></select></label>
        </div>
        <div class="portrait-gallery-heading"><small aria-live="polite">{{ filteredPortraits.length }} ilustrações encontradas</small><button type="button" class="text-button" (click)="clearFilters()">Limpar filtros</button></div>
        <div class="portrait-gallery" [appMotion]="collectionFilter + ':' + styleFilter + ':' + originFilter + ':' + appearanceFilter" role="radiogroup" aria-label="Ilustrações disponíveis">
          <label class="portrait-option automatic" [class.selected]="!selectedId"><input type="radio" name="character-portrait" [checked]="!selectedId" (change)="portraitChange.emit('')" /><img [src]="defaultPortrait" alt="" width="140" height="150" /><strong>Retrato padrão</strong></label>
          @for (portrait of filteredPortraits; track portrait.id) {
            <label class="portrait-option" [appMotion]="selectedId === portrait.id" motionKind="select" [class.selected]="selectedId === portrait.id">
              <input type="radio" name="character-portrait" [checked]="selectedId === portrait.id" (change)="portraitChange.emit(portrait.id)" />
              <img [src]="portraitPath(portrait.id)" alt="" loading="lazy" width="140" height="150" />
              <strong>{{ portrait.name }}</strong><small>{{ portrait.appearance === 'masculina' ? 'Masculina' : 'Feminina' }} · {{ originLabels[portrait.origin] }}</small>
            </label>
          }
        </div>
        @if (!filteredPortraits.length) { <p role="status">Não há retratos para essa combinação. Experimente outra origem ou limpe os filtros.</p> }
        <p class="portrait-note">As classes são sugestões visuais. Qualquer retrato pode ser usado com qualquer espécie ou classe da ficha. <a href="/assets/art/credits.html" target="_blank" rel="noopener">Créditos das ilustrações ↗</a></p>
        <button type="button" class="secondary-button" (click)="expanded = false">Concluir escolha</button>
      }
    </section>
  `,
})
export class PortraitPickerComponent {
  @Input() selectedId = '';
  @Output() readonly portraitChange = new EventEmitter<string>();
  expanded = false;
  styleFilter = '';
  originFilter = '';
  appearanceFilter = '';
  collectionFilter = '';
  readonly defaultPortrait = portraitPath('humans-thief+female');
  readonly portraitPath = portraitPath;
  readonly originLabels = PORTRAIT_ORIGIN_LABELS;
  readonly styles = Object.entries(PORTRAIT_CLASS_LABELS).map(([id,name]) => ({id,name})).sort((a,b) => a.name.localeCompare(b.name,'pt-BR'));
  readonly origins = Object.entries(PORTRAIT_ORIGIN_LABELS).filter(([id]) => CHARACTER_PORTRAITS.some(p => p.origin === id)).map(([id,name]) => ({id,name})).sort((a,b) => a.name.localeCompare(b.name,'pt-BR'));
  get selected() { return findPortrait(this.selectedId); }
  get previewImage(): string { return this.selected ? portraitPath(this.selected.id) : this.defaultPortrait; }
  get filteredPortraits() {
    return CHARACTER_PORTRAITS.filter(p => (!this.collectionFilter || portraitCollection(p.id) === this.collectionFilter) && (!this.styleFilter || p.styles.includes(this.styleFilter as TurnClassId)) && (!this.originFilter || p.origin === this.originFilter) && (!this.appearanceFilter || p.appearance === this.appearanceFilter));
  }
  valueOf(event: Event): string { return (event.target as HTMLSelectElement).value; }
  clearFilters(): void { this.collectionFilter = ''; this.styleFilter = ''; this.originFilter = ''; this.appearanceFilter = ''; }
}
