import { ABILITIES, automaticSpells as grantedSpells, eligibleChoice, finalAbilities, spellFitsGrant, spellSelectionGrants, SpellSelectionGrant, validateBonuses } from '../utils/character-choices';
import { AbilityId, AbilityScores, FeatSelection, CharacterChoiceGroup } from '../models/turn-planner.models';
import { preparedLimit, cantripLimit, maxSpellCircle, featLevels, movementSpeed } from '../utils/character-progression';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, take } from 'rxjs';

import {
  CharacterOption,
  CharacterProfile,
  OptionRequirement,
  TurnCatalog,
  TurnClassId,
} from '../models/turn-planner.models';
import { Spell } from '../models/spell.models';
import { WeaponEntry, WeaponsData } from '../models/weapons.models';
import { SpellService } from '../services/spell.service';
import { TurnPlannerStorageService } from '../services/turn-planner-storage.service';
import { TurnRuleCatalogService } from '../services/turn-rule-catalog.service';
import { WeaponsService } from '../services/weapons.service';
import { classLevel, hasSpellcasting, totalLevel, validateProfile } from '../utils/turn-engine/turn-profile';
import { normalizeKey } from '../utils/linkify';
import { CheckboxChoiceGroupComponent, CheckboxChoiceItem } from './checkbox-choice-group.component';
import { buildCharacterExamples, CharacterExample } from './character-examples';

const createId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const MAGIC_INITIATE_LISTS = {
  'iniciado-em-magia-clerigo': 'Clérigo',
  'iniciado-em-magia-druida': 'Druida',
  'iniciado-em-magia-mago': 'Mago',
} as const;

type MagicInitiateId = keyof typeof MAGIC_INITIATE_LISTS;

type SubclassControlName =
  | 'barbaroSubclassId' | 'bardoSubclassId' | 'bruxoSubclassId' | 'clerigoSubclassId'
  | 'druidaSubclassId' | 'feiticeiroSubclassId' | 'guardiaoSubclassId' | 'guerreiroSubclassId'
  | 'ladinoSubclassId' | 'magoSubclassId' | 'mongeSubclassId' | 'paladinoSubclassId';

const SUBCLASS_CONTROL_BY_CLASS: Record<TurnClassId, SubclassControlName> = {
  barbaro: 'barbaroSubclassId', bardo: 'bardoSubclassId', bruxo: 'bruxoSubclassId',
  clerigo: 'clerigoSubclassId', druida: 'druidaSubclassId', feiticeiro: 'feiticeiroSubclassId',
  guardiao: 'guardiaoSubclassId', guerreiro: 'guerreiroSubclassId', ladino: 'ladinoSubclassId',
  mago: 'magoSubclassId', monge: 'mongeSubclassId', paladino: 'paladinoSubclassId',
};

const SPELL_CLASS_BY_ID: Partial<Record<TurnClassId, string>> = {
  bardo: 'Bardo', bruxo: 'Bruxo', clerigo: 'Clérigo', druida: 'Druida',
  feiticeiro: 'Feiticeiro', guardiao: 'Guardião', mago: 'Mago', paladino: 'Paladino',
};

type ArrayControlName =
  | 'fightingStyleIds'
  | 'maneuverIds'
  | 'preparedSpellIds'
  | 'cantripIds'
  | 'magicInitiateSpellIds'
  | 'freeSpellIds'
  | 'weaponIds'
  | 'masteryWeaponIds';

@Component({
  selector: 'app-character-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CheckboxChoiceGroupComponent],
  templateUrl: './character-builder.component.html',
  styleUrl: './character-builder.component.css',
})
export class CharacterBuilderComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly catalogService = inject(TurnRuleCatalogService);
  private readonly spellService = inject(SpellService);
  private readonly weaponsService = inject(WeaponsService);
  readonly storage = inject(TurnPlannerStorageService);

  readonly steps = [
    { title: 'Identidade e origem', short: 'Origem' },
    { title: 'Classes e progressão', short: 'Classes' },
    { title: 'Atributos e talentos', short: 'Atributos' },
    { title: 'Características e escolhas', short: 'Escolhas' },
    { title: 'Equipamento e revisão', short: 'Equipamento' },
  ];
  readonly classes: Array<{ id: TurnClassId; name: string }> = [
    { id: 'barbaro', name: 'Bárbaro' },
    { id: 'bardo', name: 'Bardo' },
    { id: 'bruxo', name: 'Bruxo' },
    { id: 'clerigo', name: 'Clérigo' },
    { id: 'druida', name: 'Druida' },
    { id: 'feiticeiro', name: 'Feiticeiro' },
    { id: 'guardiao', name: 'Guardião' },
    { id: 'guerreiro', name: 'Guerreiro' },
    { id: 'ladino', name: 'Ladino' },
    { id: 'mago', name: 'Mago' },
    { id: 'monge', name: 'Monge' },
    { id: 'paladino', name: 'Paladino' },
  ];

  catalog: TurnCatalog | null = null;
  spells: Spell[] = [];
  weapons: WeaponsData | null = null;
  profiles: CharacterProfile[] = [];
  examples: CharacterExample[] = [];
  currentStep = 0;
  furthestStep = 0;
  errors: string[] = [];
  notice = '';
  loadError = '';

  readonly abilityIds = ABILITIES;
  abilityMode: 'base' | 'legacy-final' = 'base';
  backgroundId = '';
  backgroundBonuses: Partial<AbilityScores> = {};
  featSelections: FeatSelection[] = [];
  choices: Record<string, string[]> = {};
  spellSelections: Record<string, string[]> = {};

  get backgrounds(): CharacterOption[] { return this.optionsByKind('background'); }
  get background(): CharacterOption | undefined { return this.backgrounds.find(o => o.id === this.backgroundId); }
  get finalAbilityValues(): AbilityScores {
    const raw = this.profileForm.getRawValue();
    const base = Object.fromEntries(ABILITIES.map(id => [id, raw[id]])) as unknown as AbilityScores;
    return this.abilityMode === 'base' ? finalAbilities(base, [this.backgroundBonuses, ...this.featSelections.map(f => f.bonuses)]) : base;
  }
  get featSlots(): Array<{ id: string; name: string; origin: boolean }> {
    const slots = this.classes.flatMap(c => featLevels(c.id, this.profileForm.controls[c.id].value).map(level => ({ id: `class.${c.id}.${level}`, name: `${c.name} · nível ${level}`, origin: false })));
    if (this.profileForm.controls.speciesId.value === 'humano') slots.unshift({ id: 'species.humano', name: 'Humano · Versátil', origin: true });
    if (Object.values(this.choices).flat().includes('invocation.licoes-dos-grandes-antigos')) slots.push({ id: 'invocation.lessons', name: 'Lições dos Grandes Antigos', origin: true });
    return slots;
  }
  featFor(source: string): FeatSelection | undefined { return this.featSelections.find(f => f.source === source); }
  featOption(source: string): CharacterOption | undefined { return this.catalog?.options.find(o => o.id === this.featFor(source)?.optionId); }
  featOptions(origin: boolean): CharacterOption[] {
    return [...(origin ? this.originFeats : this.generalFeats)]
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }
  setFeat(source: string, event: Event): void {
    const optionId = (event.target as HTMLSelectElement).value;
    this.featSelections = [...this.featSelections.filter(f => f.source !== source), ...(optionId ? [{ source, optionId, bonuses: {} }] : [])];
    this.syncFeats();
    this.refreshErrors();
  }
  setBonus(ability: AbilityId, event: Event, source?: string): void {
    const input = event.target as HTMLInputElement;
    const requested = Number(input.value);
    if (source) {
      const feat = this.featFor(source), option = this.featOption(source);
      if (feat && option) {
        const spentElsewhere = Object.entries(feat.bonuses).reduce((sum, [id, value]) => id === ability ? sum : sum + (value ?? 0), 0);
        const available = Math.max(0, (option.abilityPoints ?? 0) - spentElsewhere);
        const value = Math.max(0, Math.min(2, available, Number.isFinite(requested) ? requested : 0));
        feat.bonuses = { ...feat.bonuses, [ability]: value };
        input.value = String(value);
      }
    } else {
      const spentElsewhere = Object.entries(this.backgroundBonuses).reduce((sum, [id, value]) => id === ability ? sum : sum + (value ?? 0), 0);
      const value = Math.max(0, Math.min(2, 3 - spentElsewhere, Number.isFinite(requested) ? requested : 0));
      this.backgroundBonuses = { ...this.backgroundBonuses, [ability]: value };
      input.value = String(value);
    }
    this.refreshErrors();
  }
  changeBackground(event: Event): void {
    this.backgroundId = (event.target as HTMLSelectElement).value;
    this.backgroundBonuses = {};
    this.syncFeats();
    this.refreshErrors();
  }
  private syncFeats(): void {
    if (this.abilityMode === 'base') this.profileForm.controls.featIds.setValue([...new Set([...(this.background?.grantedFeatId ? [this.background.grantedFeatId] : []), ...this.featSelections.map(f => f.optionId)])]);
  }
  reviewLegacy(): void {
    this.abilityMode = 'base';
    this.notice = 'Revise os atributos base: os números exibidos eram os valores finais antigos. Informe os valores anteriores aos bônus e distribua os bônus abaixo. As magias e escolhas antigas permanecem até sua revisão.';
    this.syncFeats();
  }
  private selectionProfile(): CharacterProfile {
    const v = this.profileForm.getRawValue();
    return { id:v.id, name:v.name, speciesId:v.speciesId, speciesChoiceId:v.speciesChoiceId,
      classes:this.classes.filter(c => v[c.id] > 0).map((c, order) => ({classId:c.id,level:v[c.id],order})),
      subclassIds:this.classes.filter(c => v[c.id] >= 3).map(c => this.selectedSubclass(c.id)).filter(Boolean),
      abilities:this.finalAbilityValues, featIds:v.featIds, fightingStyleIds:v.fightingStyleIds,
      choices:this.choices, maneuverIds:v.maneuverIds, preparedSpellIds:[], weaponIds:v.weaponIds,
      masteryIds:[], masteryWeaponIds:v.masteryWeaponIds, armor:v.armor, hasShield:v.hasShield, speed:v.speed, updatedAt:'' };
  }
  get choiceGroups(): CharacterChoiceGroup[] {
    const p = this.selectionProfile();
    return (this.catalog?.choiceGroups ?? []).filter(g => classLevel(p, g.classId) >= g.minLevel && (!g.subclassId || p.subclassIds.includes(g.subclassId)));
  }
  choiceLimit(group: CharacterChoiceGroup): number { return group.limits[this.profileForm.controls[group.classId].value] ?? 0; }
  choiceItems(group: CharacterChoiceGroup): CheckboxChoiceItem[] {
    return (this.catalog?.options ?? []).filter(o => o.group === group.id).map(o => ({id:o.id,label:o.name,description:o.summary,disabled:!eligibleChoice(o,this.selectionProfile()),disabledReason:eligibleChoice(o,this.selectionProfile()) ? undefined : 'Confira o nível e as escolhas exigidas.'}));
  }
  setChoice(group: string, ids: string[]): void { this.choices = { ...this.choices, [group]: ids }; this.syncFeats(); this.refreshErrors(); }
  get spellGrants(): SpellSelectionGrant[] { return spellSelectionGrants(this.selectionProfile()); }
  spellGrantItems(grant: SpellSelectionGrant): CheckboxChoiceItem[] {
    const profile = this.selectionProfile();
    const classId = grant.id.startsWith('book.')
      ? 'mago'
      : /^(?:class|cantrips)\.([^.]+)/.exec(grant.id)?.[1];
    const automatic = new Set(classId && this.catalog
      ? (this.catalog.spellGrants ?? [])
          .filter(item => item.classId === classId && classLevel(profile, item.classId) >= item.minLevel
            && (!item.subclassId || profile.subclassIds.includes(item.subclassId))
            && (!item.choiceId || Object.values(profile.choices ?? {}).flat().includes(item.choiceId)))
          .flatMap(item => item.spellIds)
      : []);
    const book = new Set(Object.entries(this.spellSelections).filter(([id]) => id.startsWith('book.')).flatMap(([,ids]) => ids));
    const otherBook = new Set(Object.entries(this.spellSelections).filter(([id]) => id.startsWith('book.') && id !== grant.id).flatMap(([,ids]) => ids));
    return this.spells.filter(spell => spellFitsGrant(spell,grant) && !automatic.has(spell.id) && (grant.id !== 'class.mago' || book.has(spell.id)) && (!grant.purpose || !otherBook.has(spell.id)) && !(grant.id === 'cantrips.ladino' && spell.id === 'maos-magicas')).map(spell => this.spellChoiceItem(spell));
  }
  setSpellGrant(id: string, values: string[]): void { this.spellSelections = { ...this.spellSelections, [id]: values }; this.refreshErrors(); }
  choicesFor(id: string): string[] { return this.choices[id] ?? []; }
  spellsFor(id: string): string[] { return this.spellSelections[id] ?? []; }
  get hasSpellSources(): boolean { return Object.keys(this.spellSelections).length > 0; }
  featSlotExists(id: string): boolean { return this.featSlots.some(s => s.id === id); }
  removeOldFeat(id: string): void { this.featSelections = this.featSelections.filter(f => f.source !== id); this.syncFeats(); }
  get removedChoiceKeys(): string[] { return Object.keys(this.choices).filter(id => this.choices[id].length && !this.choiceGroups.some(g => g.id === id)); }
  get removedSpellKeys(): string[] { return Object.keys(this.spellSelections).filter(id => this.spellSelections[id].length && !this.spellGrants.some(g => g.id === id)); }
  get acquiredFeatures() {
    const p = this.selectionProfile();
    return (this.catalog?.features ?? []).filter(f => (!f.classId || classLevel(p,f.classId) >= f.minLevel) && (!f.subclassId || p.subclassIds.includes(f.subclassId)) && (!f.speciesId || p.speciesId === f.speciesId));
  }

  readonly profileForm = this.fb.nonNullable.group({
    id: createId(),
    name: 'Novo personagem',
    speciesId: 'humano',
    speciesChoiceId: '',
    hunterPreyId: 'cacador-assassino-de-colossos',
    primaryClass: 'ladino' as TurnClassId,
    barbaro: 0,
    bardo: 0,
    bruxo: 0,
    clerigo: 0,
    druida: 0,
    feiticeiro: 0,
    guardiao: 0,
    guerreiro: 0,
    ladino: 0,
    mago: 0,
    monge: 0,
    paladino: 0,
    barbaroSubclassId: '',
    bardoSubclassId: '',
    bruxoSubclassId: '',
    clerigoSubclassId: '',
    druidaSubclassId: '',
    feiticeiroSubclassId: '',
    guardiaoSubclassId: '',
    guerreiroSubclassId: '',
    ladinoSubclassId: '',
    magoSubclassId: '',
    mongeSubclassId: '',
    paladinoSubclassId: '',
    strength: 10,
    dexterity: 16,
    constitution: 14,
    intelligence: 10,
    wisdom: 12,
    charisma: 10,
    featIds: [[]] as string[][],
    fightingStyleIds: [[]] as string[][],
    maneuverIds: [[]] as string[][],
    preparedSpellIds: [[]] as string[][],
    cantripIds: [[]] as string[][],
    magicInitiateSpellIds: [[]] as string[][],
    freeSpellIds: [[]] as string[][],
    weaponIds: [['weapon-rapieira', 'weapon-arco-curto']] as string[][],
    masteryWeaponIds: [['weapon-rapieira', 'weapon-arco-curto']] as string[][],
    armor: 'light' as CharacterProfile['armor'],
    hasShield: false,
    speed: 9,
  });

  ngOnInit(): void {
    this.profileForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshErrors());
    combineLatest([
      this.catalogService.getCatalog(),
      this.spellService.getSpells(),
      this.weaponsService.getWeapons(),
    ])
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([catalog, spells, weapons]) => {
          this.catalog = catalog;
          this.spells = spells;
          this.weapons = weapons;
          this.examples = buildCharacterExamples(catalog, spells);
        },
        error: (error: unknown) => {
          this.loadError = error instanceof Error ? error.message : 'Não foi possível carregar os dados do personagem.';
        },
      });
    this.storage.profiles$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((profiles) => (this.profiles = profiles));
    this.storage.storageWarning$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((warning) => {
      if (warning) this.notice = warning;
    });
  }

  get species(): CharacterOption[] {
    return this.optionsByKind('species');
  }

  get speciesChoices(): CharacterOption[] {
    return this.optionsByKind('species-choice').filter((item) => item.parentId === this.profileForm.controls.speciesId.value);
  }

  get hunterPreyOptions(): CharacterOption[] {
    return this.optionsByKind('subclass-choice').filter((item) => item.parentId === 'cacador');
  }

  subclassesFor(classId: TurnClassId): CharacterOption[] {
    return this.optionsByKind('subclass').filter((item) => item.parentId === classId);
  }

  subclassControlName(classId: TurnClassId): SubclassControlName {
    return SUBCLASS_CONTROL_BY_CLASS[classId];
  }

  selectedSubclass(classId: TurnClassId): string {
    return this.profileForm.controls[SUBCLASS_CONTROL_BY_CLASS[classId]].value;
  }

  get originFeats(): CharacterOption[] {
    return this.optionsByKind('feat-origin');
  }

  get generalFeats(): CharacterOption[] {
    return this.optionsByKind('feat-general');
  }

  get fightingStyles(): CharacterOption[] {
    return this.optionsByKind('fighting-style');
  }

  get maneuvers(): CharacterOption[] {
    return this.optionsByKind('maneuver');
  }

  get allWeapons(): WeaponEntry[] {
    return this.weapons?.categories.flatMap((category) => category.weapons) ?? [];
  }

  get totalConfiguredLevel(): number {
    return this.classes.reduce((sum, entry) => sum + this.profileForm.controls[entry.id].value, 0);
  }

  profileLevel(profile: CharacterProfile): number {
    return totalLevel(profile);
  }

  profileClassSummary(profile: CharacterProfile): string {
    return [...profile.classes]
      .sort((left, right) => left.order - right.order)
      .map(entry => `${this.classes.find(item => item.id === entry.classId)?.name ?? entry.classId} ${entry.level}`)
      .join(' / ');
  }

  get originFeatLimit(): number {
    return this.profileForm.controls.speciesId.value === 'humano' ? 2 : 1;
  }

  get generalFeatLimit(): number {
    return this.classes.reduce((n, entry) => n + featLevels(entry.id, this.profileForm.controls[entry.id].value).length, 0);
  }

  get fightingStyleLimit(): number {
    return (this.profileForm.controls.guerreiro.value >= 1 ? 1 : 0) +
      (this.profileForm.controls.guardiao.value >= 2 ? 1 : 0) +
      (this.profileForm.controls.paladino.value >= 2 ? 1 : 0) + (this.selectedSubclass('guerreiro') === 'campeao' && this.profileForm.controls.guerreiro.value >= 7 ? 1 : 0);
  }

  get maneuverLimit(): number {
    return this.selectedSubclass('guerreiro') === 'mestre-da-batalha' ? (this.profileForm.controls.guerreiro.value >= 7 ? 5 : 3) : 0;
  }

  get classSpellLimit(): number {
    return this.classes.reduce((sum, entry) => sum + preparedLimit(entry.id, this.profileForm.controls[entry.id].value, ['cavaleiro-mistico', 'trapaceiro-arcano'].includes(this.selectedSubclass(entry.id))), 0);
  }

  get freeSpellLimit(): number {
    return [...this.originSelected.slice(0, this.originFeatLimit), ...this.generalSelected.slice(0, this.generalFeatLimit)].filter((id) =>
      ['tocado-pelas-fadas', 'tocado-pela-sombra'].includes(id)
    ).length;
  }

  get selectedMagicInitiateIds(): MagicInitiateId[] {
    return this.originSelected.filter((id): id is MagicInitiateId => id in MAGIC_INITIATE_LISTS);
  }

  get cantripGrantLists(): string[] {
    return [
      ...this.selectedMagicInitiateIds.map((id) => MAGIC_INITIATE_LISTS[id]),
      ...(this.profileForm.controls.fightingStyleIds.value.includes('combatente-druidico') ? ['Druida'] : []),
      ...(this.profileForm.controls.fightingStyleIds.value.includes('combatente-abencoado') ? ['Clérigo'] : []),
    ];
  }

  get cantripLimit(): number {
    return this.cantripGrantLists.length * 2 + this.classes.reduce((sum, entry) => sum + cantripLimit(entry.id, this.profileForm.controls[entry.id].value, ['cavaleiro-mistico', 'trapaceiro-arcano'].includes(this.selectedSubclass(entry.id))), 0);
  }

  get magicInitiateSpellLimit(): number {
    return this.selectedMagicInitiateIds.length;
  }

  get masteryLimit(): number {
    const barbarian = this.profileForm.controls.barbaro.value;
    const fighter = this.profileForm.controls.guerreiro.value;
    const ranger = this.profileForm.controls.guardiao.value;
    const rogue = this.profileForm.controls.ladino.value;
    const paladin = this.profileForm.controls.paladino.value;
    const classMasteries = Math.max(
      barbarian >= 4 ? 3 : barbarian >= 1 ? 2 : 0,
      fighter >= 4 ? 4 : fighter >= 1 ? 3 : 0,
      ranger >= 1 ? 2 : 0,
      rogue >= 1 ? 2 : 0,
      paladin >= 1 ? 2 : 0,
    );
    return classMasteries + (this.profileForm.controls.featIds.value.includes('mestre-em-armas') ? 1 : 0);
  }

  get originSelected(): string[] {
    return this.selectedFrom(this.originFeats);
  }

  get generalSelected(): string[] {
    return this.selectedFrom(this.generalFeats);
  }

  get originFeatItems(): CheckboxChoiceItem[] {
    return this.optionItems(this.originFeats);
  }

  get generalFeatItems(): CheckboxChoiceItem[] {
    const profile = this.buildProfile();
    return this.generalFeats.map((option) => {
      const reasons = this.optionErrors(option, profile);
      return {
        id: option.id,
        label: option.name,
        description: option.summary,
        disabled: reasons.length > 0,
        disabledReason: reasons.join(' '),
      };
    });
  }

  get fightingStyleItems(): CheckboxChoiceItem[] {
    const profile = this.buildProfile();
    return this.fightingStyles.map((option) => {
      const reasons = this.optionErrors(option, profile);
      return {
        id: option.id,
        label: option.name,
        description: option.summary,
        disabled: reasons.length > 0,
        disabledReason: reasons.join(' '),
      };
    });
  }

  get maneuverItems(): CheckboxChoiceItem[] {
    return this.optionItems(this.maneuvers);
  }

  get classSpellItems(): CheckboxChoiceItem[] {
    const lists = this.activeSpellLists();
    return this.spells
      .filter((spell) => spell.level >= 1 && spell.id !== 'marca-do-predador' && lists.some((entry) => spell.classes.includes(entry.name) && spell.level <= entry.maxLevel))
      .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name))
      .map((spell) => this.spellChoiceItem(spell));
  }

  get cantripItems(): CheckboxChoiceItem[] {
    const lists = new Set<string>([
      ...this.cantripGrantLists,
      ...this.activeSpellLists().filter((entry) => !['Guardião', 'Paladino'].includes(entry.name)).map((entry) => entry.name),
    ]);
    return this.spells
      .filter((spell) => spell.level === 0 && spell.classes.some((className) => lists.has(className)))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((spell) => this.spellChoiceItem(spell));
  }

  get magicInitiateSpellItems(): CheckboxChoiceItem[] {
    const lists = new Set<string>(this.selectedMagicInitiateIds.map((id) => MAGIC_INITIATE_LISTS[id]));
    return this.spells
      .filter((spell) => spell.level === 1 && spell.classes.some((className) => lists.has(className)))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((spell) => this.spellChoiceItem(spell));
  }

  get freeSpellItems(): CheckboxChoiceItem[] {
    const selectedFeats = new Set([...this.originSelected, ...this.generalSelected]);
    return this.spells
      .filter((spell) => spell.level === 1 && (
        (selectedFeats.has('tocado-pelas-fadas') && ['Adivinhação', 'Encantamento'].includes(spell.school)) ||
        (selectedFeats.has('tocado-pela-sombra') && ['Ilusão', 'Necromancia'].includes(spell.school))
      ))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((spell) => this.spellChoiceItem(spell));
  }

  get weaponItems(): CheckboxChoiceItem[] {
    return this.allWeapons.map((weapon) => ({
      id: weapon.id,
      label: weapon.name,
      description: `${weapon.damage} · ${weapon.mastery}`,
    }));
  }

  speciesChanged(): void {
    this.profileForm.controls.speciesChoiceId.setValue('');
    if (this.abilityMode === 'base') this.profileForm.controls.speed.setValue(this.profileForm.controls.speciesId.value === 'golias' ? 10.5 : 9);
  }

  classLevelChanged(classId: TurnClassId): void {
    const activeClasses = this.classes.filter((entry) => this.profileForm.controls[entry.id].value > 0);
    const currentPrimary = this.profileForm.controls.primaryClass.value;
    if (
      (this.profileForm.controls[classId].value > 0 && activeClasses.length === 1) ||
      this.profileForm.controls[currentPrimary].value === 0
    ) {
      this.profileForm.controls.primaryClass.setValue(activeClasses[0]?.id ?? classId);
    }
  }

  setFeatGroup(group: 'origin' | 'general', selected: string[]): void {
    const groupIds = new Set((group === 'origin' ? this.originFeats : this.generalFeats).map((item) => item.id));
    const preserved = this.profileForm.controls.featIds.value.filter((id) => !groupIds.has(id));
    this.profileForm.controls.featIds.setValue([...preserved, ...selected]);
    this.pruneSpellChoices();
    this.refreshErrors();
  }

  setArraySelection(control: ArrayControlName, selected: string[]): void {
    this.profileForm.controls[control].setValue(selected);
    if (control === 'fightingStyleIds') this.pruneSpellChoices();
    this.refreshErrors();
  }

  private pruneSpellChoices(): void {
    // Keep invalid selections visible until the user explicitly revises them.
  }

  nextStep(): void {
    this.errors = this.validateStep(this.currentStep);
    if (this.errors.length) { this.focusInvalidField(); return; }
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep += 1;
      this.furthestStep = Math.max(this.furthestStep, this.currentStep);
      this.focusStep();
    }
  }

  submitWizard(): void {
    if (this.currentStep < this.steps.length - 1) this.nextStep();
    else this.saveProfile();
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep -= 1;
      this.errors = [];
      this.focusStep();
    }
  }

  openStep(index: number): void {
    if (index <= this.furthestStep) {
      if (index > this.currentStep) {
        for (let step = this.currentStep; step < index; step += 1) {
          const errors = this.validateStep(step);
          if (errors.length) {
            this.currentStep = step;
            this.errors = errors;
            this.focusInvalidField();
            return;
          }
        }
      }
      this.currentStep = index;
      this.errors = [];
      this.focusStep();
    }
  }

  saveProfile(openTurn = false): void {
    const profile = this.buildProfile();
    this.errors = this.validateConfiguredProfile(profile);
    if (this.errors.length) { this.focusInvalidField(); return; }
    this.storage.upsertProfile(profile);
    this.notice = `Personagem “${profile.name}” salvo.`;
    if (openTurn) void this.router.navigate(['/turno'], { queryParams: { personagem: profile.id } });
  }

  loadProfile(profile: CharacterProfile): void {
    this.abilityMode = profile.abilityMode ?? 'legacy-final';
    this.backgroundId = profile.backgroundId ?? '';
    this.backgroundBonuses = { ...(profile.backgroundBonuses ?? {}) };
    this.featSelections = (profile.featSelections ?? []).map(f => ({ ...f, bonuses: { ...f.bonuses } }));
    this.choices = structuredClone(profile.choices ?? {});
    this.spellSelections = structuredClone(profile.spellSelections ?? {});
    const levels = Object.fromEntries(this.classes.map((item) => [item.id, classLevel(profile, item.id)])) as Record<TurnClassId, number>;
    const featIds = this.normalizeMagicInitiateFeatIds(profile);
    const automatic = this.speciesSpellGrants(profile.speciesChoiceId ?? '', totalLevel(profile));
    if (featIds.includes('tocado-pelas-fadas')) automatic.free.push('passo-nebuloso');
    if (featIds.includes('tocado-pela-sombra')) automatic.free.push('invisibilidade');
    if (classLevel(profile, 'paladino') >= 2) automatic.free.push('destruicao-divina');
    if (classLevel(profile, 'paladino') >= 5) automatic.free.push('convocar-montaria');
    const automaticIds = new Set([...automatic.prepared, ...automatic.free, 'marca-do-predador']);
    const magicInitiateSpellIds = profile.magicInitiateSpellIds ?? this.inferLegacyMagicInitiateSpells(profile, featIds);
    const cantripIds = profile.cantripIds ?? [];
    const grantedIds = new Set([...(profile.freeSpellIds ?? []), ...magicInitiateSpellIds, ...cantripIds]);
    this.profileForm.setValue({
      id: profile.id,
      name: profile.name,
      speciesId: profile.speciesId,
      speciesChoiceId: profile.speciesChoiceId ?? '',
      hunterPreyId: profile.featIds.find((id) => id.startsWith('cacador-')) ?? 'cacador-assassino-de-colossos',
      primaryClass: [...profile.classes].sort((a, b) => a.order - b.order)[0]?.classId ?? 'ladino',
      barbaro: levels.barbaro,
      bardo: levels.bardo,
      bruxo: levels.bruxo,
      clerigo: levels.clerigo,
      druida: levels.druida,
      feiticeiro: levels.feiticeiro,
      guardiao: levels.guardiao,
      guerreiro: levels.guerreiro,
      ladino: levels.ladino,
      mago: levels.mago,
      monge: levels.monge,
      paladino: levels.paladino,
      barbaroSubclassId: profile.subclassIds.find((id) => this.subclassesFor('barbaro').some((item) => item.id === id)) ?? '',
      bardoSubclassId: profile.subclassIds.find((id) => this.subclassesFor('bardo').some((item) => item.id === id)) ?? '',
      bruxoSubclassId: profile.subclassIds.find((id) => this.subclassesFor('bruxo').some((item) => item.id === id)) ?? '',
      clerigoSubclassId: profile.subclassIds.find((id) => this.subclassesFor('clerigo').some((item) => item.id === id)) ?? '',
      druidaSubclassId: profile.subclassIds.find((id) => this.subclassesFor('druida').some((item) => item.id === id)) ?? '',
      feiticeiroSubclassId: profile.subclassIds.find((id) => this.subclassesFor('feiticeiro').some((item) => item.id === id)) ?? '',
      guardiaoSubclassId: profile.subclassIds.find((id) => this.subclassesFor('guardiao').some((item) => item.id === id)) ?? '',
      guerreiroSubclassId: profile.subclassIds.find((id) => this.subclassesFor('guerreiro').some((item) => item.id === id)) ?? '',
      ladinoSubclassId: profile.subclassIds.find((id) => this.subclassesFor('ladino').some((item) => item.id === id)) ?? '',
      magoSubclassId: profile.subclassIds.find((id) => this.subclassesFor('mago').some((item) => item.id === id)) ?? '',
      mongeSubclassId: profile.subclassIds.find((id) => this.subclassesFor('monge').some((item) => item.id === id)) ?? '',
      paladinoSubclassId: profile.subclassIds.find((id) => this.subclassesFor('paladino').some((item) => item.id === id)) ?? '',
      strength: (profile.baseAbilities ?? profile.abilities).strength,
      dexterity: (profile.baseAbilities ?? profile.abilities).dexterity,
      constitution: (profile.baseAbilities ?? profile.abilities).constitution,
      intelligence: (profile.baseAbilities ?? profile.abilities).intelligence,
      wisdom: (profile.baseAbilities ?? profile.abilities).wisdom,
      charisma: (profile.baseAbilities ?? profile.abilities).charisma,
      featIds: featIds.filter((id) => !id.startsWith('cacador-')),
      fightingStyleIds: profile.fightingStyleIds,
      maneuverIds: profile.maneuverIds,
      preparedSpellIds: profile.preparedSpellIds.filter((id) => !automaticIds.has(id) && !grantedIds.has(id)),
      cantripIds,
      magicInitiateSpellIds,
      freeSpellIds: (profile.freeSpellIds ?? []).filter((id) => !automatic.free.includes(id) && !magicInitiateSpellIds.includes(id)),
      weaponIds: profile.weaponIds,
      masteryWeaponIds: profile.masteryWeaponIds,
      armor: profile.armor,
      hasShield: profile.hasShield,
      speed: profile.baseSpeed ?? profile.speed,
    });
    this.currentStep = 0;
    this.furthestStep = this.steps.length - 1;
    this.errors = [];
    this.notice = `Editando “${profile.name}”.`;
  }

  useExample(example: CharacterExample): void {
    const profile = structuredClone(example.profile);
    profile.id = createId();
    profile.updatedAt = new Date().toISOString();
    this.loadProfile(profile);
    this.notice = `Modelo “${profile.name}” carregado. Revise as escolhas e salve para adicioná-lo à sua biblioteca.`;
  }

  newProfile(): void {
    this.abilityMode = 'base'; this.backgroundId = ''; this.backgroundBonuses = {}; this.featSelections = []; this.choices = {}; this.spellSelections = {};
    this.profileForm.reset({
      id: createId(), name: 'Novo personagem', speciesId: 'humano', speciesChoiceId: '',
      hunterPreyId: 'cacador-assassino-de-colossos', primaryClass: 'ladino',
      barbaro: 0, bardo: 0, bruxo: 0, clerigo: 0, druida: 0, feiticeiro: 0,
      guardiao: 0, guerreiro: 0, ladino: 0, mago: 0, monge: 0, paladino: 0,
      barbaroSubclassId: '', bardoSubclassId: '', bruxoSubclassId: '', clerigoSubclassId: '',
      druidaSubclassId: '', feiticeiroSubclassId: '', guardiaoSubclassId: '', guerreiroSubclassId: '',
      ladinoSubclassId: '', magoSubclassId: '', mongeSubclassId: '', paladinoSubclassId: '',
      strength: 10, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 12, charisma: 10,
      featIds: [], fightingStyleIds: [], maneuverIds: [], preparedSpellIds: [],
      cantripIds: [], magicInitiateSpellIds: [], freeSpellIds: [],
      weaponIds: ['weapon-rapieira', 'weapon-arco-curto'], masteryWeaponIds: ['weapon-rapieira', 'weapon-arco-curto'],
      armor: 'light', hasShield: false, speed: 9,
    });
    this.currentStep = 0;
    this.furthestStep = 0;
    this.errors = [];
    this.notice = 'Novo personagem iniciado.';
  }

  deleteProfile(profile: CharacterProfile): void {
    this.storage.deleteProfile(profile.id);
    if (this.profileForm.controls.id.value === profile.id) this.newProfile();
  }

  exportLibrary(): void {
    const blob = new Blob([this.storage.exportLibrary()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'personagens-dnd-backup.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async importLibrary(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = this.storage.importLibrary(await file.text());
      this.notice = `${result.profiles} personagem(ns) e ${result.drafts} turno(s) importado(s).`;
    } catch (error) {
      this.notice = error instanceof Error ? error.message : 'Falha ao importar.';
    } finally {
      input.value = '';
    }
  }

  optionEligible(option: CharacterOption): boolean {
    return this.optionErrors(option, this.buildProfile()).length === 0;
  }

  buildProfile(): CharacterProfile {
    const value = this.profileForm.getRawValue();
    const selectedFeatIds = value.featIds;
    const order = [value.primaryClass, ...this.classes.map((item) => item.id).filter((id) => id !== value.primaryClass)];
    const classes = this.classes
      .map((item) => ({ classId: item.id, level: value[item.id], order: order.indexOf(item.id) }))
      .filter((item) => item.level > 0);
    const subclassIds = this.classes
      .filter((entry) => value[entry.id] >= 3)
      .map((entry) => value[SUBCLASS_CONTROL_BY_CLASS[entry.id]])
      .filter((id): id is string => !!id);
    const weaponById = new Map(this.allWeapons.map((weapon) => [weapon.id, weapon]));
    const masteryWeaponIds = value.masteryWeaponIds;
    const masteryIds = masteryWeaponIds
      .map((id) => weaponById.get(id))
      .filter((weapon): weapon is WeaponEntry => !!weapon)
      .map((weapon) => `mastery-${normalizeKey(weapon.mastery)}`);
    const automaticSpells = this.speciesSpellGrants(value.speciesChoiceId, classes.reduce((sum, item) => sum + item.level, 0));
    if (selectedFeatIds.includes('tocado-pelas-fadas')) automaticSpells.free.push('passo-nebuloso');
    if (selectedFeatIds.includes('tocado-pela-sombra')) automaticSpells.free.push('invisibilidade');
    if (selectedFeatIds.includes('telepata')) automaticSpells.free.push('detectar-pensamentos');
    if (value.paladino >= 2) automaticSpells.free.push('destruicao-divina');
    if (value.paladino >= 5) automaticSpells.free.push('convocar-montaria');
    const freeSpellChoiceLimit = selectedFeatIds.filter((id) =>
      ['tocado-pelas-fadas', 'tocado-pela-sombra'].includes(id)
    ).length;
    const cantripIds = [...value.cantripIds];
    if (selectedFeatIds.includes('telecinetico')) cantripIds.push('maos-magicas');
    const magicInitiateCount = selectedFeatIds.filter((id) => id in MAGIC_INITIATE_LISTS).length;
    const magicInitiateSpellIds = magicInitiateCount
      ? value.magicInitiateSpellIds.slice(0, magicInitiateCount)
      : [];
    const freeSpellIds = [...new Set([
      ...(freeSpellChoiceLimit ? value.freeSpellIds.slice(0, freeSpellChoiceLimit) : []),
      ...magicInitiateSpellIds,
      ...automaticSpells.free,
    ])];
    const preparedSpellIds = [...new Set([
      ...value.preparedSpellIds,
      ...automaticSpells.prepared,
      ...cantripIds,
      ...freeSpellIds,
      ...(value.guardiao >= 1 ? ['marca-do-predador'] : []),
      ...(value.paladino >= 2 ? ['destruicao-divina'] : []),
      ...(value.paladino >= 5 ? ['convocar-montaria'] : []),
    ])];
    const allocated = Object.entries(this.spellSelections).filter(([id]) => !id.startsWith('book.')).flatMap(([,ids]) => ids);
    const granted = this.catalog ? grantedSpells(this.selectionProfile(), this.catalog) : [];
    const sourceAware = Object.keys(this.spellSelections).length > 0 || this.abilityMode === 'base';
    const sourceCantrips = allocated.filter(id => this.spells.find(s => s.id === id)?.level === 0);
    const sourceFree = Object.entries(this.spellSelections).filter(([id]) => id.startsWith('feat.') && id !== 'feat.conjurador-ritualista').flatMap(([, ids]) => ids);
    if (selectedFeatIds.includes('telecinetico')) sourceCantrips.push('maos-magicas');
    if (selectedFeatIds.includes('telepata')) sourceFree.push('detectar-pensamentos');
    if (subclassIds.includes('patrono-arquifada')) sourceFree.push('passo-nebuloso');
    if (subclassIds.includes('circulo-das-estrelas')) sourceFree.push('raio-guia');
    if (value.speciesId === 'aasimar') granted.push('luz');
    if (value.speciesId === 'tiefling') granted.push('taumaturgia');
    if (subclassIds.includes('trapaceiro-arcano')) granted.push('maos-magicas');
    return {
      abilityMode: this.abilityMode,
      ...(this.abilityMode === 'base' ? { baseAbilities: Object.fromEntries(ABILITIES.map(a => [a, value[a]])) as unknown as AbilityScores } : {}),
      backgroundId: this.backgroundId || undefined,
      backgroundBonuses: { ...this.backgroundBonuses },
      featSelections: this.featSelections.map(f => ({ ...f, bonuses:{...f.bonuses} })),
      choices: structuredClone(this.choices), spellSelections: structuredClone(this.spellSelections), needsReview: this.abilityMode === 'legacy-final',
      id: value.id,
      name: value.name.trim() || 'Personagem sem nome',
      speciesId: value.speciesId,
      speciesChoiceId: value.speciesChoiceId || undefined,
      classes,
      abilities: this.finalAbilityValues,
      subclassIds,
      featIds: [...selectedFeatIds, ...(this.selectedSubclass('guardiao') === 'cacador' ? [value.hunterPreyId] : [])],
      fightingStyleIds: value.fightingStyleIds,
      maneuverIds: value.maneuverIds,
      preparedSpellIds: sourceAware ? [...new Set([...allocated, ...granted, ...automaticSpells.prepared, ...automaticSpells.free, ...sourceFree, ...(value.guardiao ? ['marca-do-predador'] : [])])] : preparedSpellIds,
      cantripIds: sourceAware ? sourceCantrips : cantripIds,
      magicInitiateSpellIds: sourceAware ? Object.entries(this.spellSelections).filter(([id]) => id.startsWith('feat.iniciado')).flatMap(([, ids]) => ids) : magicInitiateSpellIds,
      freeSpellIds: sourceAware ? [...new Set([...sourceFree, ...automaticSpells.free])] : freeSpellIds,
      weaponIds: value.weaponIds,
      masteryWeaponIds,
      masteryIds: [...new Set(masteryIds)],
      armor: value.armor,
      hasShield: value.hasShield,
      baseSpeed: this.abilityMode === 'base' ? value.speed : undefined,
      speed: this.abilityMode === 'base' ? movementSpeed(this.selectionProfile(),value.speed) : value.speed,
      updatedAt: new Date().toISOString(),
    };
  }

  private validateStep(step: number): string[] {
    if (step === 0) {
      const errors: string[] = [];
      if (!this.profileForm.controls.name.value.trim()) errors.push('Informe o nome do personagem.');
      if (!this.profileForm.controls.speciesId.value) errors.push('Selecione uma espécie.');
      if (this.speciesChoices.length && !this.profileForm.controls.speciesChoiceId.value) errors.push('Selecione a escolha interna da espécie.');
      if (this.abilityMode === 'base' && !this.background) errors.push('Selecione um antecedente.');
      return errors;
    }
    if (step === 1) {
      const errors: string[] = [];
      if (this.totalConfiguredLevel < 1 || this.totalConfiguredLevel > 8) errors.push('O nível total deve estar entre 1 e 8.');
      for (const entry of this.classes.filter((item) => this.profileForm.controls[item.id].value >= 3)) {
        if (!this.subclassesFor(entry.id).some(o => o.id === this.selectedSubclass(entry.id))) errors.push(`Selecione uma subclasse de ${entry.name}.`);
      }
      for (const entry of this.classes) if (this.profileForm.controls[entry.id].value < 3 && this.selectedSubclass(entry.id)) errors.push(`Remova a subclasse de ${entry.name}: exige nível 3.`);
      return errors;
    }
    if (step === 2) return [...validateProfile(this.buildProfile()), ...this.validateOrigin()];
    if (step === 3) return this.validateChoices(false);
    if (step === 4) return this.validateChoices(true);
    return ['Etapa desconhecida.'];
  }

  private validateConfiguredProfile(profile: CharacterProfile): string[] {
    return [...new Set([...validateProfile(profile), ...this.validateStep(0), ...this.validateStep(1), ...this.validateOrigin(), ...this.validateChoices(true)])];
  }

  inlineError(...fragments: string[]): string {
    const normalized = fragments.map((fragment) => normalizeKey(fragment));
    return this.errors.find((error) => normalized.some((fragment) => normalizeKey(error).includes(fragment))) ?? '';
  }

  inlineOptionError(optionIds: string[]): string {
    const names = (this.catalog?.options ?? []).filter((option) => optionIds.includes(option.id)).map((option) => option.name);
    return names.length ? this.inlineError(...names) : '';
  }

  private refreshErrors(): void {
    if (this.errors.length) this.errors = this.validateStep(this.currentStep);
  }

  private validateOrigin(): string[] {
    if (this.abilityMode === 'legacy-final') return [];
    const errors: string[] = [];
    if (!this.background) errors.push('Selecione um antecedente.');
    else errors.push(...validateBonuses(this.backgroundBonuses, this.background.abilityOptions ?? [], 3));
    const sources = new Set(this.featSlots.map(slot => slot.id));
    for (const slot of this.featSlots) {
      const feat = this.featFor(slot.id), option = this.featOption(slot.id);
      const expectedKind = slot.origin ? 'feat-origin' : 'feat-general';
      if (!feat || !option || option.kind !== expectedKind) { errors.push(`${slot.name}: selecione um talento ${slot.origin ? 'de Origem' : 'Geral'} válido.`); continue; }
      errors.push(...validateBonuses(feat.bonuses,option.abilityOptions ?? [],option.abilityPoints ?? 0).map(e => `${option.name}: ${e}`));
      const prior = this.featSlots.slice(0,this.featSlots.indexOf(slot)).map(s => this.featFor(s.id)?.bonuses ?? {});
      const raw = this.profileForm.getRawValue();
      const before = finalAbilities(Object.fromEntries(ABILITIES.map(a => [a,raw[a]])) as unknown as AbilityScores,[this.backgroundBonuses,...prior]);
      errors.push(...this.optionErrors(option,{...this.selectionProfile(),abilities:before}).map(error => `${option.name}: ${error}`));
      if (!option.repeatable && this.featSelections.filter(f => f.optionId === option.id).length + (this.background?.grantedFeatId === option.id ? 1 : 0) > 1) errors.push(`${option.name} não pode ser escolhido novamente.`);
    }
    if (this.featSelections.some(f => !sources.has(f.source))) errors.push('Há talentos de níveis ou origens removidos. Revise as escolhas antigas.');
    return errors;
  }

  private validateChoices(includeEquipment: boolean): string[] {
    const errors: string[] = [];
    const p = this.selectionProfile();
    if (this.abilityMode === 'base' || Object.keys(this.spellSelections).length) {
      for (const grant of this.spellGrants) {
        const selected = this.spellSelections[grant.id] ?? [];
        const eligible = new Set(this.spellGrantItems(grant).map(s => s.id));
        if (selected.length !== grant.limit || new Set(selected).size !== selected.length || selected.some(id => !eligible.has(id))) errors.push(`${grant.name}: selecione ${grant.limit} magia(s) válidas para esta origem.`);
      }
      for (const [id, selected] of Object.entries(this.spellSelections)) if (selected.length && !this.spellGrants.some(g => g.id === id)) errors.push(`Revise as magias da origem removida: ${id}.`);
      for (const group of this.choiceGroups) {
        const selected = this.choices[group.id] ?? [];
        if (selected.length !== this.choiceLimit(group) || selected.some(id => !this.catalog?.options.some(o => o.id === id && o.group === group.id && eligibleChoice(o,p)))) errors.push(`${group.name}: revise as ${this.choiceLimit(group)} escolha(s).`);
      }
      for (const [id, values] of Object.entries(this.choices)) if (values.length && !this.choiceGroups.some(g => g.id === id)) errors.push(`Revise a escolha que não está mais disponível: ${id}.`);
      if (this.profileForm.controls.fightingStyleIds.value.length !== this.fightingStyleLimit) errors.push(`Selecione ${this.fightingStyleLimit} estilo(s) de luta.`);
      if (this.profileForm.controls.maneuverIds.value.length !== this.maneuverLimit) errors.push(`Selecione ${this.maneuverLimit} manobra(s).`);
      if (includeEquipment && this.profileForm.controls.masteryWeaponIds.value.length !== this.masteryLimit) errors.push(`Selecione ${this.masteryLimit} maestria(s).`);
      for (const option of this.catalog?.options.filter(o => p.fightingStyleIds.includes(o.id)) ?? []) errors.push(...this.optionErrors(option,p).map(error => `${option.name}: ${error}`));
      return errors;
    }
    if (this.originSelected.length !== this.originFeatLimit) errors.push(`Selecione ${this.originFeatLimit} talento(s) de Origem.`);
    if (this.generalSelected.length !== this.generalFeatLimit) errors.push(`Talentos Gerais: selecione ${this.generalFeatLimit}.`);
    if (this.profileForm.controls.fightingStyleIds.value.length !== this.fightingStyleLimit) errors.push(`Estilos de Luta: selecione ${this.fightingStyleLimit}.`);
    if (this.profileForm.controls.maneuverIds.value.length !== this.maneuverLimit) errors.push(`Manobras: selecione ${this.maneuverLimit}.`);
    if (this.profileForm.controls.preparedSpellIds.value.length !== this.classSpellLimit) errors.push(`Magias de classe: selecione ${this.classSpellLimit}.`);
    const classSpellIds = new Set(this.classSpellItems.map((item) => item.id));
    if (this.profileForm.controls.preparedSpellIds.value.some((id) => !classSpellIds.has(id))) errors.push('Há uma magia preparada que não pertence às listas ou círculos disponíveis.');
    if (this.profileForm.controls.cantripIds.value.length !== this.cantripLimit) errors.push(`Truques concedidos: selecione ${this.cantripLimit}.`);
    if (this.profileForm.controls.magicInitiateSpellIds.value.length !== this.magicInitiateSpellLimit) errors.push(`Magias de Iniciado em Magia: selecione ${this.magicInitiateSpellLimit}.`);
    const cantripIds = new Set(this.cantripItems.map((item) => item.id));
    if (this.profileForm.controls.cantripIds.value.some((id) => !cantripIds.has(id))) errors.push('Há um truque que não pertence a uma lista disponível para o personagem.');
    if (!this.canAllocateSpells(this.profileForm.controls.magicInitiateSpellIds.value, this.selectedMagicInitiateIds.map((id) => MAGIC_INITIATE_LISTS[id]), 1)) errors.push('Cada variante de Iniciado em Magia deve receber uma magia de 1º círculo da sua própria lista.');
    if (this.profileForm.controls.freeSpellIds.value.length !== this.freeSpellLimit) errors.push(`Magias de talentos: selecione ${this.freeSpellLimit}.`);
    if (includeEquipment && this.profileForm.controls.masteryWeaponIds.value.length !== this.masteryLimit) errors.push(`Maestrias em Arma: selecione ${this.masteryLimit}.`);
    const profile = this.buildProfile();
    const selectedOptions = this.catalog?.options.filter((item) => [...profile.featIds, ...profile.fightingStyleIds].includes(item.id)) ?? [];
    for (const option of selectedOptions) errors.push(...this.optionErrors(option, profile).map(error => `${option.name}: ${error}`));
    return errors.filter((error) => !error.endsWith('selecione 0.'));
  }

  private optionErrors(option: CharacterOption, profile: CharacterProfile): string[] {
    const errors: string[] = [];
    for (const requirement of option.requirements ?? []) {
      if (requirement.minTotalLevel && totalLevel(profile) < requirement.minTotalLevel) errors.push(`Exige nível total ${requirement.minTotalLevel}.`);
      if (requirement.classId && classLevel(profile, requirement.classId) < (requirement.minClassLevel ?? 1)) errors.push(`Exige ${this.className(requirement.classId)} ${requirement.minClassLevel ?? 1}.`);
      if (requirement.ability && profile.abilities[requirement.ability] < (requirement.abilityMin ?? 13)) errors.push(`Exige ${this.abilityName(requirement.ability)} ${requirement.abilityMin ?? 13}.`);
      if (requirement.anyAbility && !requirement.anyAbility.some((ability) => profile.abilities[ability] >= (requirement.abilityMin ?? 13))) {
        errors.push(`Exige ${requirement.anyAbility.map((ability) => this.abilityName(ability)).join(' ou ')} ${requirement.abilityMin ?? 13}.`);
      }
      if (requirement.feature && !this.hasTrainingFeature(requirement.feature, profile)) errors.push(`Exige ${this.featureName(requirement.feature)}.`);
    }
    return errors;
  }

  private hasTrainingFeature(feature: NonNullable<OptionRequirement['feature']>, profile: CharacterProfile): boolean {
    if (feature === 'spellcasting') return hasSpellcasting(profile);
    const classes = new Set(profile.classes.map((entry) => entry.classId));
    const feats = new Set(profile.featIds);
    if (feature === 'martial-weapon-training') return feats.has('treinamento-armas-marciais') || ['barbaro', 'guardiao', 'guerreiro', 'paladino'].some((id) => classes.has(id as TurnClassId));
    if (feature === 'light-armor-training') return feats.has('especialista-armaduras-leves') || ['barbaro', 'bardo', 'bruxo', 'clerigo', 'druida', 'guardiao', 'guerreiro', 'ladino', 'paladino'].some((id) => classes.has(id as TurnClassId));
    if (feature === 'medium-armor-training') return feats.has('especialista-armaduras-medias') || ['barbaro', 'clerigo', 'guardiao', 'guerreiro', 'paladino'].some((id) => classes.has(id as TurnClassId));
    if (feature === 'heavy-armor-training') return feats.has('especialista-armaduras-pesadas') || ['guerreiro', 'paladino'].some((id) => classes.has(id as TurnClassId));
    return feats.has('especialista-armaduras-leves') || ['barbaro', 'clerigo', 'druida', 'guardiao', 'guerreiro', 'paladino'].some((id) => classes.has(id as TurnClassId));
  }

  abilityName(ability: keyof CharacterProfile['abilities']): string {
    return ({ strength: 'Força', dexterity: 'Destreza', constitution: 'Constituição', intelligence: 'Inteligência', wisdom: 'Sabedoria', charisma: 'Carisma' })[ability];
  }

  private className(classId: TurnClassId): string {
    return this.classes.find((entry) => entry.id === classId)?.name ?? classId;
  }

  private featureName(feature: NonNullable<OptionRequirement['feature']>): string {
    return ({
      spellcasting: 'Conjuração ou Magia de Pacto',
      'martial-weapon-training': 'treinamento com Armas Marciais',
      'light-armor-training': 'treinamento com Armadura Leve',
      'medium-armor-training': 'treinamento com Armadura Média',
      'heavy-armor-training': 'treinamento com Armadura Pesada',
      'shield-training': 'treinamento com Escudo',
    })[feature];
  }

  private optionsByKind(kind: CharacterOption['kind']): CharacterOption[] {
    return this.catalog?.options.filter((item) => item.kind === kind) ?? [];
  }

  private selectedFrom(options: CharacterOption[]): string[] {
    const ids = new Set(options.map((item) => item.id));
    return this.profileForm.controls.featIds.value.filter((id) => ids.has(id));
  }

  private optionItems(options: CharacterOption[]): CheckboxChoiceItem[] {
    return options.map((option) => ({ id: option.id, label: option.name, description: option.summary }));
  }

  private spellChoiceItem(spell: Spell): CheckboxChoiceItem {
    const level = spell.level === 0 ? 'Truque' : `${spell.level}º círculo`;
    const description = `${level} · ${spell.school} · ${spell.classes.join(', ')}`;
    const tooltip = [
      spell.name,
      description,
      `Conjuração: ${spell.castingTime}`,
      `Alcance: ${spell.range}`,
      `Duração: ${spell.duration}`,
      spell.description.replace(/\[\[(TABLE|SUMMON)_\d+]]/g, '').trim(),
    ].join('\n');
    return { id: spell.id, label: spell.name, description, referenceId: spell.id, tooltip };
  }

  private activeSpellLists(): Array<{ name: string; maxLevel: number }> {
    const lists: Array<{ name: string; maxLevel: number }> = [];
    for (const entry of this.classes) {
      const level = this.profileForm.controls[entry.id].value;
      const name = SPELL_CLASS_BY_ID[entry.id];
      if (!level || !name) continue;
      const maxLevel = ['Guardião', 'Paladino'].includes(name) ? (level >= 5 ? 2 : 1) : Math.ceil(level / 2);
      lists.push({ name, maxLevel });
    }
    if (this.selectedSubclass('guerreiro') === 'cavaleiro-mistico' || this.selectedSubclass('ladino') === 'trapaceiro-arcano') {
      const level = Math.max(this.selectedSubclass('guerreiro') === 'cavaleiro-mistico' ? this.profileForm.controls.guerreiro.value : 0, this.selectedSubclass('ladino') === 'trapaceiro-arcano' ? this.profileForm.controls.ladino.value : 0);
      lists.push({ name: 'Mago', maxLevel: level >= 7 ? 2 : 1 });
    }
    return lists;
  }

  private canAllocateSpells(spellIds: string[], lists: string[], capacityPerList: number): boolean {
    if (!lists.length) return spellIds.length === 0;
    if (spellIds.length !== lists.length * capacityPerList) return false;
    const spells = spellIds.map((id) => this.spells.find((spell) => spell.id === id));
    if (spells.some((spell) => !spell)) return false;
    const capacities = lists.map(() => capacityPerList);
    const allocate = (index: number): boolean => {
      if (index === spells.length) return capacities.every((capacity) => capacity === 0);
      const spell = spells[index];
      if (!spell) return false;
      for (let listIndex = 0; listIndex < lists.length; listIndex += 1) {
        if (capacities[listIndex] === 0 || !spell.classes.includes(lists[listIndex])) continue;
        capacities[listIndex] -= 1;
        if (allocate(index + 1)) return true;
        capacities[listIndex] += 1;
      }
      return false;
    };
    return allocate(0);
  }

  private normalizeMagicInitiateFeatIds(profile: CharacterProfile): string[] {
    if (!profile.featIds.includes('iniciado-em-magia')) return profile.featIds;
    const candidate = (profile.freeSpellIds ?? [])
      .map((id) => this.spells.find((spell) => spell.id === id))
      .find((spell): spell is Spell => !!spell && spell.level === 1);
    const inferred = (Object.entries(MAGIC_INITIATE_LISTS) as Array<[MagicInitiateId, string]>)
      .find(([, className]) => candidate?.classes.includes(className))?.[0] ?? 'iniciado-em-magia-druida';
    return profile.featIds.map((id) => id === 'iniciado-em-magia' ? inferred : id);
  }

  private inferLegacyMagicInitiateSpells(profile: CharacterProfile, featIds: string[]): string[] {
    const lists: string[] = featIds
      .filter((id): id is MagicInitiateId => id in MAGIC_INITIATE_LISTS)
      .map((id) => MAGIC_INITIATE_LISTS[id]);
    return (profile.freeSpellIds ?? [])
      .filter((id) => {
        const spell = this.spells.find((entry) => entry.id === id);
        return spell?.level === 1 && spell.classes.some((className) => lists.includes(className));
      })
      .slice(0, lists.length);
  }

  private focusStep(): void {
    setTimeout(() => document.querySelector<HTMLElement>('#character-step-title')?.focus());
  }

  private focusInvalidField(): void {
    setTimeout(() => document.querySelector<HTMLElement>(
      '.wizard-card [aria-invalid="true"] input, .wizard-card [aria-invalid="true"] select, .wizard-card input[aria-invalid="true"], .wizard-card select[aria-invalid="true"]',
    )?.focus());
  }

  private speciesSpellGrants(choiceId: string, level: number): { prepared: string[]; free: string[] } {
    const prepared: string[] = [];
    const free: string[] = [];
    const add = (id: string, isFree = false): void => {
      prepared.push(id);
      if (isFree) free.push(id);
    };
    const lineage: Record<string, [string, string?, string?]> = {
      'elfo-drow': ['luzes-dancantes', 'fogo-das-fadas', 'escuridao'],
      'elfo-alto': ['prestidigitacao-arcana', 'detectar-magia', 'passo-nebuloso'],
      'elfo-silvestre': ['arte-druidica', 'passos-largos', 'passo-sem-rastro'],
      'tiefling-abissal': ['rajada-de-veneno', 'raio-nauseante', 'paralisar-pessoa'],
      'tiefling-ctonico': ['toque-necrotico', 'vitalidade-vazia', 'raio-do-enfraquecimento'],
      'tiefling-infernal': ['raio-de-fogo', 'repreensao-diabolica', 'escuridao'],
    };
    const spells = lineage[choiceId];
    if (spells) {
      if (choiceId !== 'elfo-alto' || this.abilityMode === 'legacy-final') add(spells[0]);
      if (level >= 3 && spells[1]) add(spells[1], true);
      if (level >= 5 && spells[2]) add(spells[2], true);
    }
    if (choiceId === 'gnomo-florestal') {
      add('ilusao-menor');
      add('falar-com-animais', true);
    }
    if (choiceId === 'gnomo-das-rochas') { add('consertar'); add('prestidigitacao-arcana'); }
    return { prepared, free };
  }
}
