import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map, of, startWith, take } from 'rxjs';
import { RouterModule } from '@angular/router';

import { SpellService } from '../services/spell.service';
import { GuideService } from '../services/guide.service';
import { SummonService } from '../services/summon.service';
import { GuideCategory, GuideItem } from '../models/guide.models';
import { Spell, SpellTable } from '../models/spell.models';
import { Summon } from '../models/summon.models';
import { FavoritesService } from '../services/favorites.service';
import { SummonCardComponent } from '../summon-card/summon-card.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { buildDescriptionParts, LinkPart } from '../utils/linkify';
import {
  filterSpells,
  normalizeCastingTimeFilter,
  SPELL_COMPONENT_FILTER_OPTIONS,
} from '../utils/spell-filters';

type DescriptionPart = LinkPart<GuideItem>;
type TextContentPart = { type: 'text'; parts: DescriptionPart[] };
type TableContentPart = { type: 'table'; table: SpellTable };
type SummonContentPart = { type: 'summon'; summon: Summon };
type ContentPart = TextContentPart | TableContentPart | SummonContentPart;

type SpellView = Spell & {
  contentParts: ContentPart[];
};

@Component({
  selector: 'app-magias',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    RouterModule,
    SummonCardComponent,
  ],
  templateUrl: './magias.component.html',
  styleUrl: './magias.component.css',
})
export class MagiasComponent {
  private readonly spellService = inject(SpellService);
  private readonly guideService = inject(GuideService);
  private readonly summonService = inject(SummonService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly favoritesStorageKey = 'favorite-spells';

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly classControl = new FormControl<string[]>([], { nonNullable: true });
  readonly castingTimeControl = new FormControl<string[]>([], { nonNullable: true });
  readonly levelControl = new FormControl<number[]>([], { nonNullable: true });
  readonly schoolControl = new FormControl<string[]>([], { nonNullable: true });
  readonly componentControl = new FormControl<string[]>([], { nonNullable: true });
  readonly durationControl = new FormControl<string[]>([], { nonNullable: true });
  readonly rangeControl = new FormControl('', { nonNullable: true });
  readonly effectControl = new FormControl('', { nonNullable: true });
  readonly concentrationOnlyControl = new FormControl(false, { nonNullable: true });
  readonly favoritesOnlyControl = new FormControl(false, { nonNullable: true });

  private readonly spellViews$ = combineLatest([
    this.spellService.getSpells(),
    this.guideService.getGuide(),
    this.summonService.getSummons(),
  ]).pipe(
    map(([spells, guide, summons]) => {
      const linkItems = this.getLinkableItems(guide);
      const summonsMap = new Map(summons.map(s => [s.id, s]));
      return spells.map((spell): SpellView => ({
        ...spell,
        contentParts: this.buildContentParts(spell, linkItems, summonsMap),
      }));
    })
  );

  readonly classes$ = this.spellViews$.pipe(map((spells) => this.uniqueSorted(spells.flatMap((spell) => spell.classes))));
  readonly castingTimes$ = this.spellViews$.pipe(
    map((spells) => this.uniqueSorted(spells.map((spell) => normalizeCastingTimeFilter(spell.castingTime))))
  );
  readonly levels$ = this.spellViews$.pipe(
    map((spells) => this.uniqueSorted(spells.map((spell) => spell.level)))
  );
  readonly schools$ = this.spellViews$.pipe(
    map((spells) => this.uniqueSorted(spells.map((spell) => spell.school)))
  );
  readonly components$ = of(SPELL_COMPONENT_FILTER_OPTIONS);
  readonly durations$ = this.spellViews$.pipe(
    map((spells) => this.uniqueSorted(spells.map((spell) => spell.duration)))
  );
  readonly favoriteCount$ = this.favoritesService
    .getFavorites(this.favoritesStorageKey)
    .pipe(map((favorites) => favorites.size));

  readonly spells$ = combineLatest([
    this.spellViews$,
    this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
    this.classControl.valueChanges.pipe(startWith(this.classControl.value)),
    this.castingTimeControl.valueChanges.pipe(startWith(this.castingTimeControl.value)),
    this.levelControl.valueChanges.pipe(startWith(this.levelControl.value)),
    this.schoolControl.valueChanges.pipe(startWith(this.schoolControl.value)),
    this.componentControl.valueChanges.pipe(startWith(this.componentControl.value)),
    this.durationControl.valueChanges.pipe(startWith(this.durationControl.value)),
    this.rangeControl.valueChanges.pipe(startWith(this.rangeControl.value)),
    this.effectControl.valueChanges.pipe(startWith(this.effectControl.value)),
    this.concentrationOnlyControl.valueChanges.pipe(startWith(this.concentrationOnlyControl.value)),
    this.favoritesOnlyControl.valueChanges.pipe(startWith(this.favoritesOnlyControl.value)),
    this.favoritesService.getFavorites(this.favoritesStorageKey),
  ]).pipe(
    map(([
      spells,
      search,
      classes,
      castingTimes,
      levels,
      schools,
      components,
      durations,
      range,
      effect,
      concentrationOnly,
      favoritesOnly,
      favoriteIds,
    ]) =>
      filterSpells(spells, {
        search,
        classes,
        castingTimes,
        levels,
        schools,
        components,
        durations,
        range,
        effect,
        concentrationOnly,
        favoritesOnly,
        favoriteIds,
      })
    )
  );

  private getLinkableItems(guide: GuideCategory[]): GuideItem[] {
    const linkableCategories = new Set(['condicoes', 'invocacoes-familiares', 'glossario']);
    return guide
      .filter((category) => linkableCategories.has(category.id))
      .flatMap((category) => category.items);
  }

  private buildContentParts(spell: Spell, linkItems: GuideItem[], summonsMap: Map<string, Summon>): ContentPart[] {
    const markerRegex = /\[\[(TABLE|SUMMON)_(\d+)]]/g;
    const parts: ContentPart[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = markerRegex.exec(spell.description)) !== null) {
      if (match.index > lastIndex) {
        const textSegment = spell.description.slice(lastIndex, match.index).trim();
        if (textSegment) {
          this.pushTextParagraphs(textSegment, linkItems, parts);
        }
      }
      const markerType = match[1];
      const markerIndex = parseInt(match[2], 10);
      if (markerType === 'TABLE' && spell.tables?.[markerIndex]) {
        parts.push({ type: 'table', table: spell.tables[markerIndex] });
      } else if (markerType === 'SUMMON' && spell.summonIds?.[markerIndex]) {
        const summon = summonsMap.get(spell.summonIds[markerIndex]);
        if (summon) {
          parts.push({ type: 'summon', summon });
        }
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < spell.description.length) {
      const textSegment = spell.description.slice(lastIndex).trim();
      if (textSegment) {
        this.pushTextParagraphs(textSegment, linkItems, parts);
      }
    }

    return parts;
  }

  private pushTextParagraphs(text: string, linkItems: GuideItem[], parts: ContentPart[]): void {
    text.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        parts.push({ type: 'text', parts: buildDescriptionParts(trimmed, linkItems) });
      }
    });
  }

  asTextPart(part: ContentPart): TextContentPart | null {
    return part.type === 'text' ? part : null;
  }

  asTablePart(part: ContentPart): TableContentPart | null {
    return part.type === 'table' ? part : null;
  }

  asSummonPart(part: ContentPart): SummonContentPart | null {
    return part.type === 'summon' ? part : null;
  }

  formatTooltip(description: string): string {
    return description.replace(/[;.]\s*/g, (match) => `${match}\n`);
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.classControl.setValue([]);
    this.castingTimeControl.setValue([]);
    this.levelControl.setValue([]);
    this.schoolControl.setValue([]);
    this.componentControl.setValue([]);
    this.durationControl.setValue([]);
    this.rangeControl.setValue('');
    this.effectControl.setValue('');
    this.concentrationOnlyControl.setValue(false);
  }

  toggleFavoritesOnly(): void {
    this.favoritesOnlyControl.setValue(!this.favoritesOnlyControl.value);
  }

  isFavorite(spellId: string): boolean {
    return this.favoritesService.has(this.favoritesStorageKey, spellId);
  }

  toggleFavorite(spellId: string): void {
    this.favoritesService.toggle(this.favoritesStorageKey, spellId);
  }

  exportFavoriteSpells(): void {
    const favoriteIds = this.favoritesService.getSnapshot(this.favoritesStorageKey);
    if (!favoriteIds.size) {
      return;
    }

    this.spellViews$
      .pipe(
        map((spells) =>
          spells
            .filter((spell) => favoriteIds.has(spell.id))
            .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
        ),
        take(1)
      )
      .subscribe((spells) => {
        if (!spells.length) {
          return;
        }

        const markdown = this.buildFavoriteSpellsMarkdown(spells);
        this.downloadTextFile('magias-preparadas.md', markdown, 'text/markdown;charset=utf-8');
      });
  }

  private uniqueSorted<T extends string | number>(values: T[]): T[] {
    return Array.from(new Set(values)).sort((a, b) => (a > b ? 1 : -1));
  }

  private buildFavoriteSpellsMarkdown(spells: Spell[]): string {
    const lines = ['# Magias preparadas', ''];

    spells.forEach((spell) => {
      const level = spell.level === 0 ? 'Truque' : `${spell.level}º círculo`;
      lines.push(`## ${spell.name}`);
      lines.push('');
      lines.push(`- **Nível:** ${level}`);
      lines.push(`- **Escola:** ${spell.school}`);
      lines.push(`- **Classes:** ${spell.classes.join(', ')}`);
      lines.push(`- **Tempo de conjuração:** ${spell.castingTime}`);
      lines.push(`- **Alcance:** ${spell.range}`);
      lines.push(`- **Componentes:** ${spell.components.join(', ')}`);
      lines.push(`- **Duração:** ${spell.duration}`);
      lines.push('');
      lines.push(spell.description.replace(/\[\[(TABLE|SUMMON)_\d+]]/g, '').trim());
      lines.push('');
    });

    return `${lines.join('\n').trim()}\n`;
  }

  private downloadTextFile(filename: string, content: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
