import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, map, shareReplay, startWith } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { MonsterCardComponent } from '../monster-card/monster-card.component';
import {
  MonsterAbilityKey,
  MonsterEntryType,
  MonsterSectionKey,
  MonsterSheet,
} from '../models/monster.models';
import { GuideService } from '../services/guide.service';
import { MonsterFormService } from '../services/monster-form.service';
import { MonsterStorageService } from '../services/monster-storage.service';
import { SpellService } from '../services/spell.service';
import { monsterToMarkdown } from '../utils/monster-markdown';
import {
  ABILITY_LABELS,
  ABILITY_NAMES,
  ABILITY_SELECT_OPTIONS,
  cloneMonster,
  COMMON_LANGUAGE_OPTIONS,
  createEmptyMonster,
  createEntryByType,
  createId,
  createSpellGroup,
  MONSTER_CREATURE_TYPE_OPTIONS,
  MONSTER_ENTRY_TYPE_LABELS,
  MONSTER_SECTION_LABELS,
  RARE_LANGUAGE_OPTIONS,
  SPELL_RECHARGE_TYPE_OPTIONS,
} from '../utils/monster-builder';

const LINKABLE_GUIDE_CATEGORY_IDS = new Set(['condicoes', 'invocacoes-familiares', 'glossario']);

@Component({
  selector: 'app-monster-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MonsterCardComponent,
  ],
  templateUrl: './monster-builder.component.html',
  styleUrl: './monster-builder.component.css',
})
export class MonsterBuilderComponent {
  private readonly monsterFormService = inject(MonsterFormService);
  private readonly guideService = inject(GuideService);
  private readonly spellService = inject(SpellService);
  private readonly monsterStorage = inject(MonsterStorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abilityKeys: MonsterAbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  readonly sectionKeys: MonsterSectionKey[] = ['traits', 'actions', 'bonusActions', 'reactions'];
  readonly abilityLabels = ABILITY_LABELS;
  readonly abilityNames = ABILITY_NAMES;
  readonly sectionLabels = MONSTER_SECTION_LABELS;
  readonly entryTypeLabels = MONSTER_ENTRY_TYPE_LABELS;
  readonly abilityOptions = ABILITY_SELECT_OPTIONS;
  readonly creatureTypeOptions = MONSTER_CREATURE_TYPE_OPTIONS;
  readonly commonLanguageOptions = COMMON_LANGUAGE_OPTIONS;
  readonly rareLanguageOptions = RARE_LANGUAGE_OPTIONS;
  readonly spellRechargeTypeOptions = SPELL_RECHARGE_TYPE_OPTIONS;
  importStatus = '';

  readonly monsterForm = this.monsterFormService.createMonsterForm(createEmptyMonster());
  readonly savedMonsters$ = this.monsterStorage.getMonsters();
  readonly spells$ = this.spellService
    .getSpells()
    .pipe(
      map((spells) => [...spells].sort((left, right) => left.name.localeCompare(right.name))),
      shareReplay(1)
    );
  readonly guideItems$ = this.guideService
    .getGuide()
    .pipe(
      map((categories) =>
        categories
          .filter((category) => LINKABLE_GUIDE_CATEGORY_IDS.has(category.id))
          .flatMap((category) => category.items)
      ),
      shareReplay(1)
    );
  readonly preview$ = combineLatest([
    this.guideItems$,
    this.spells$,
    this.monsterForm.valueChanges.pipe(startWith(this.monsterForm.getRawValue())),
  ]).pipe(
    map(([guideItems, spells]) => ({
      monster: this.toMonsterSheet(),
      guideItems,
      spells,
    }))
  );

  constructor() {
    const savedDraft = this.monsterStorage.loadDraft();
    if (savedDraft) {
      this.loadMonster(savedDraft);
    }

    this.monsterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.monsterStorage.saveDraft(this.toMonsterSheet()));
  }

  sectionArray(section: MonsterSectionKey): FormArray {
    return this.monsterForm.get(section) as FormArray;
  }

  spellGroupArray(entryControl: AbstractControl): FormArray {
    return entryControl.get('spellGroups') as FormArray;
  }

  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  entryTypeLabel(entryControl: AbstractControl): string {
    const type = entryControl.get('type')?.value as MonsterEntryType;
    return this.entryTypeLabels[type] ?? 'Entrada';
  }

  addEntry(section: MonsterSectionKey, type: MonsterEntryType): void {
    this.sectionArray(section).push(this.monsterFormService.createEntryGroup(createEntryByType(type)));
  }

  removeEntry(section: MonsterSectionKey, index: number): void {
    this.sectionArray(section).removeAt(index);
  }

  moveEntry(section: MonsterSectionKey, index: number, direction: -1 | 1): void {
    const array = this.sectionArray(section);
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= array.length) {
      return;
    }

    const current = array.at(index);
    array.removeAt(index);
    array.insert(targetIndex, current);
  }

  addSpellGroup(entryControl: AbstractControl): void {
    this.spellGroupArray(entryControl).push(this.monsterFormService.createSpellGroupForm(createSpellGroup()));
  }

  removeSpellGroup(entryControl: AbstractControl, index: number): void {
    this.spellGroupArray(entryControl).removeAt(index);
  }

  newMonster(): void {
    const nextMonster = createEmptyMonster();
    this.loadMonster(nextMonster);
    this.monsterStorage.saveDraft(nextMonster);
  }

  saveMonster(): void {
    const monster = this.toMonsterSheet();
    this.monsterStorage.saveMonster(monster);
    this.monsterStorage.saveDraft(monster);
    this.importStatus = 'Ficha salva na biblioteca local.';
  }

  duplicateMonster(): void {
    const duplicated = cloneMonster(this.toMonsterSheet());
    duplicated.id = createId('monster');
    duplicated.name = duplicated.name.trim() ? `${duplicated.name} Cópia` : 'Monstro Cópia';
    this.loadMonster(duplicated);
    this.monsterStorage.saveDraft(duplicated);
  }

  loadSavedMonster(monster: MonsterSheet): void {
    const cloned = cloneMonster(monster);
    this.loadMonster(cloned);
    this.monsterStorage.saveDraft(cloned);
  }

  deleteMonster(monsterId: string): void {
    this.monsterStorage.deleteMonster(monsterId);
    if (this.monsterForm.get('id')?.value === monsterId) {
      this.newMonster();
    }
  }

  exportLibrary(): void {
    const payload = {
      exportedAt: new Date().toISOString(),
      monsters: this.monsterStorage.exportMonsters(),
    };

    this.downloadTextFile(
      `biblioteca-monstros-${this.formatDateForFile(new Date())}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
    this.importStatus = 'Biblioteca exportada em JSON.';
  }

  importLibraryFromFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const monsters = this.monsterStorage.parseMonsterBackup(String(reader.result ?? ''));
        const importedCount = this.monsterStorage.importMonsters(monsters);
        this.importStatus = `${importedCount} ficha(s) importada(s) para a biblioteca.`;
      } catch (error) {
        this.importStatus = error instanceof Error ? error.message : 'Não foi possível importar o backup.';
      }
    };
    reader.onerror = () => {
      this.importStatus = 'Não foi possível ler o arquivo selecionado.';
    };
    reader.readAsText(file);
  }

  exportCurrentMarkdown(): void {
    const monster = this.toMonsterSheet();
    this.downloadTextFile(
      `${this.slugifyFileName(monster.name)}.md`,
      monsterToMarkdown(monster),
      'text/markdown'
    );
    this.importStatus = 'Ficha atual exportada em Markdown.';
  }

  isCurrentMonster(monsterId: string): boolean {
    return this.monsterForm.get('id')?.value === monsterId;
  }

  private loadMonster(monster: MonsterSheet): void {
    this.monsterFormService.loadMonster(this.monsterForm, monster);
  }

  private toMonsterSheet(): MonsterSheet {
    return this.monsterFormService.toMonsterSheet(this.monsterForm);
  }

  private downloadTextFile(fileName: string, content: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private slugifyFileName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'monstro';
  }

  private formatDateForFile(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
