import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface CheckboxChoiceItem {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
  referenceId?: string;
  tooltip?: string;
}

@Component({
  selector: 'app-checkbox-choice-group',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTooltipModule],
  template: `
    <fieldset class="choice-group">
      <legend>
        <span>{{ title }}</span>
        <strong class="choice-count" [attr.aria-label]="selected.length + ' de ' + limit + ' selecionados'">
          {{ selected.length }}/{{ limit }}
        </strong>
      </legend>
      @if (hint) { <p class="hint">{{ hint }}</p> }
      <div class="choice-grid">
        @for (item of items; track item.id) {
          <label class="choice-box" [class.selected]="isSelected(item.id)" [class.disabled]="isDisabled(item)" [attr.title]="item.disabledReason || null">
            <input
              type="checkbox"
              [checked]="isSelected(item.id)"
              [disabled]="isDisabled(item)"
              (change)="toggle(item.id)"
            />
            <span class="choice-copy">
              <span class="choice-title">
                <strong>{{ item.label }}</strong>
                @if (item.referenceId) {
                  <a
                    class="reference-link"
                    [routerLink]="['/magias']"
                    [fragment]="item.referenceId"
                    [matTooltip]="item.tooltip || ''"
                    matTooltipClass="condition-tooltip"
                    (click)="$event.stopPropagation()"
                    [attr.aria-label]="'Consultar ' + item.label"
                  >?</a>
                }
              </span>
              @if (item.description) { <small>{{ item.description }}</small> }
              @if (item.disabledReason) { <small class="disabled-reason">Indisponível: {{ item.disabledReason }}</small> }
            </span>
          </label>
        }
      </div>
      @if (!items.length) { <p class="empty">Nenhuma opção disponível para esta configuração.</p> }
    </fieldset>
  `,
  styles: `
    .choice-group { min-width: 0; margin: 0; padding: 0; border: 0; }
    legend { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; color: #522019; font-size: .86rem; font-weight: 900; }
    .choice-count { min-width: 52px; padding: 4px 9px; border-radius: 999px; color: #fff6dc; background: #6f241e; text-align: center; font-size: .78rem; }
    .hint, .empty { margin: 0 0 9px; color: #6d6054; font-size: .78rem; line-height: 1.4; }
    .choice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; max-height: 290px; padding: 2px; overflow: auto; }
    .choice-box { display: flex; align-items: flex-start; gap: 9px; min-width: 0; padding: 10px; border: 1px solid #b39a72; border-radius: 10px; background: #fffdf5; color: #35251b; cursor: pointer; transition: border-color 120ms ease, background 120ms ease, transform 120ms ease; }
    .choice-box:hover { transform: translateY(-1px); border-color: #7e3b25; }
    .choice-box.selected { border-color: #7b2921; background: #f6dfb5; box-shadow: inset 0 0 0 1px rgba(123, 41, 33, .18); }
    .choice-box.disabled { opacity: .52; cursor: not-allowed; transform: none; }
    input { width: 17px; height: 17px; margin: 1px 0 0; accent-color: #7b2921; flex: 0 0 auto; }
    .choice-copy { display: grid; gap: 3px; min-width: 0; }
    .choice-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .choice-copy strong { font-size: .82rem; line-height: 1.25; }
    .choice-copy small { color: #746658; font-size: .72rem; line-height: 1.35; }
    .choice-copy .disabled-reason { color: #8b201c; font-weight: 800; }
    .reference-link { display: inline-grid; place-items: center; flex: 0 0 auto; width: 20px; height: 20px; border: 1px solid #8a5b2d; border-radius: 50%; color: #6f241e; background: #fff9e8; font-size: .72rem; font-weight: 900; text-decoration: none; }
    .reference-link:hover, .reference-link:focus-visible { outline: 2px solid #8a481f; outline-offset: 1px; }
    @media (max-width: 520px) { .choice-grid { grid-template-columns: 1fr; max-height: none; } }
    @media (prefers-reduced-motion: reduce) { .choice-box { transition: none; } }
  `,
})
export class CheckboxChoiceGroupComponent {
  @Input({ required: true }) title = '';
  @Input() hint = '';
  @Input() items: CheckboxChoiceItem[] = [];
  @Input() selected: string[] = [];
  @Input() limit = 0;
  @Output() readonly selectionChange = new EventEmitter<string[]>();

  isSelected(id: string): boolean {
    return this.selected.includes(id);
  }

  isDisabled(item: CheckboxChoiceItem): boolean {
    return (!!item.disabled || this.selected.length >= this.limit) && !this.isSelected(item.id);
  }

  toggle(id: string): void {
    if (this.isSelected(id)) {
      this.selectionChange.emit(this.selected.filter((item) => item !== id));
      return;
    }
    if (this.selected.length < this.limit) {
      this.selectionChange.emit([...this.selected, id]);
    }
  }
}
