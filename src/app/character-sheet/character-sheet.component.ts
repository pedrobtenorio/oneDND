import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { CharacterProfile, TurnCatalog } from '../models/turn-planner.models';
import { Spell } from '../models/spell.models';
import { TurnPlannerStorageService } from '../services/turn-planner-storage.service';
import { TurnRuleCatalogService } from '../services/turn-rule-catalog.service';
import { SpellService } from '../services/spell.service';
import { buildCharacterExamples } from '../character-builder/character-examples';
import { ABILITIES, automaticSpells } from '../utils/character-choices';
import { ABILITY_NAMES, CLASS_NAMES, acquiredFeatures } from '../utils/character-reference';
import { buildInitialResources, proficiencyBonus, totalLevel } from '../utils/turn-engine/turn-profile';
import { profileArt } from '../utils/class-visuals';
import { UiMotionDirective } from '../shared/ui-motion.directive';
import { FormattedTextComponent } from '../shared/formatted-text.component';
import { skillRows, validateSkills } from '../utils/character-skills';

@Component({
  selector: 'app-character-sheet', standalone: true, imports: [RouterLink, UiMotionDirective, FormattedTextComponent],
  templateUrl: './character-sheet.component.html', styleUrl: './character-sheet.component.css',
})
export class CharacterSheetComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private storage = inject(TurnPlannerStorageService);
  private catalogService = inject(TurnRuleCatalogService);
  private spellService = inject(SpellService);
  private destroyRef = inject(DestroyRef);
  profile?: CharacterProfile;
  catalog?: TurnCatalog;
  spells: Spell[] = [];
  loaded = false;
  error = '';
  example = false;
  readonly abilities = ABILITIES;
  readonly abilityNames = ABILITY_NAMES;
  readonly classNames = CLASS_NAMES;
  readonly art = profileArt;
  readonly level = totalLevel;
  readonly proficiency = proficiencyBonus;
  modifier(score: number): string { const n = Math.floor((score - 10) / 2); return n >= 0 ? `+${n}` : `${n}`; }
  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.storage.profiles$, this.catalogService.getCatalog(), this.spellService.getSpells()])
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ([params, profiles, catalog, spells]) => {
          this.catalog = catalog; this.spells = spells;
          const id = params.get('id');
          const example = buildCharacterExamples(catalog, spells).find(e => e.profile.id === id);
          this.profile = profiles.find(p => p.id === id) ?? example?.profile;
          this.example = !!example && !profiles.some(p => p.id === id);
          this.loaded = true;
        },
        error: () => { this.error = 'Não foi possível carregar a ficha. Tente atualizar a página.'; this.loaded = true; },
      });
  }
  optionName(id?: string): string { return this.catalog?.options.find(o => o.id === id)?.name ?? id ?? 'Não registrado'; }
  get background() { return this.catalog?.options.find(o => o.id === this.profile?.backgroundId); }
  get skills() { return this.profile && this.catalog ? skillRows(this.profile,this.catalog) : []; }
  get skillReview(): boolean { return !!(this.profile && this.catalog && validateSkills(this.profile,this.catalog).length); }
  get skillTools(): string[] { return [...new Set(Object.values(this.profile?.skillSelections??{}).flat().filter(id=>id.startsWith('tool:')).map(id=>id.slice(5)))]; }
  signed(value:number):string { return value>=0?`+${value}`:`${value}`; }
  get features() { return this.profile && this.catalog ? acquiredFeatures(this.profile, this.catalog) : []; }
  get resources() { return this.profile ? Object.entries(buildInitialResources(this.profile)).map(([id, pool]) => ({id, ...pool})) : []; }
  get selectedOptions() {
    const p = this.profile;
    if (!p) return [];
    const ids = new Set([...p.featIds, ...p.fightingStyleIds, ...p.maneuverIds, ...Object.values(p.choices ?? {}).flat(), ...(this.background?.grantedFeatId ? [this.background.grantedFeatId] : [])]);
    return [...ids].map(id => ({ id, name: this.optionName(id), option: this.catalog?.options.find(o => o.id === id) }));
  }
  get spellGroups() {
    const p = this.profile;
    if (!p || !this.catalog) return [];
    const automatic = automaticSpells(p, this.catalog);
    const playable = new Set([...(p.preparedSpellIds ?? []), ...(p.cantripIds ?? []), ...(p.magicInitiateSpellIds ?? []), ...(p.freeSpellIds ?? []), ...automatic]);
    const book = Object.entries(p.spellSelections ?? {}).filter(([key]) => key.startsWith('book.')).flatMap(([,ids]) => ids);
    const group = (name: string, ids: string[]) => ({name, entries: [...new Set(ids)].map(id => ({id, spell: this.spells.find(s => s.id === id), sources: Object.entries(p.spellSelections ?? {}).filter(([,list]) => list.includes(id)).map(([key]) => this.spellSource(key)), automatic: automatic.includes(id), free: p.freeSpellIds?.includes(id) ?? false }))});
    return [group('Truques', [...playable].filter(id => this.spells.find(s => s.id === id)?.level === 0)), group('Magias disponíveis', [...playable].filter(id => this.spells.find(s => s.id === id)?.level !== 0)), group('Grimório · outras magias registradas', book.filter(id => !playable.has(id)))].filter(g => g.entries.length);
  }
  spellSource(source: string): string {
    const [type, id, level] = source.split('.');
    if (type === 'class' || type === 'cantrips') return (CLASS_NAMES[id as keyof typeof CLASS_NAMES] ?? this.optionName(id)) + (level ? ` · nível ${level}` : '');
    if (type === 'species') return `${this.optionName(id)} · característica da espécie`;
    if (type === 'book') return `Grimório · ${id === 'savant' ? 'Versado' : this.classNames[id as keyof typeof CLASS_NAMES] ?? id} · nível ${level}`;
    return this.optionName(source.replace(/^feat\./, ''));
  }
}
