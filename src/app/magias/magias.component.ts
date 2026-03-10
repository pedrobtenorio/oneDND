import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map, startWith } from 'rxjs';
import { RouterModule } from '@angular/router';

import { SpellService } from '../services/spell.service';
import { GuideService } from '../services/guide.service';
import { SummonService } from '../services/summon.service';
import { GuideCategory, GuideItem } from '../models/guide.models';
import { Spell, SpellTable } from '../models/spell.models';
import { Summon } from '../models/summon.models';
import { SummonCardComponent } from '../summon-card/summon-card.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { buildDescriptionParts, LinkPart } from '../utils/linkify';

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

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly classControl = new FormControl<string[]>([], { nonNullable: true });
  readonly castingTimeControl = new FormControl<string[]>([], { nonNullable: true });
  readonly levelControl = new FormControl<number[]>([], { nonNullable: true });

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
    map((spells) => this.uniqueSorted(spells.map((spell) => spell.castingTime)))
  );
  readonly levels$ = this.spellViews$.pipe(
    map((spells) => this.uniqueSorted(spells.map((spell) => spell.level)))
  );

  readonly spells$ = combineLatest([
    this.spellViews$,
    this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
    this.classControl.valueChanges.pipe(startWith(this.classControl.value)),
    this.castingTimeControl.valueChanges.pipe(startWith(this.castingTimeControl.value)),
    this.levelControl.valueChanges.pipe(startWith(this.levelControl.value)),
  ]).pipe(
    map(([spells, search, classes, castingTimes, levels]) =>
      this.filterSpells(spells, search, classes, castingTimes, levels)
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
  }

  private filterSpells(
    spells: SpellView[],
    search: string,
    classes: string[],
    castingTimes: string[],
    levels: number[]
  ): SpellView[] {
    const query = this.normalizeSearchValue(search);
    const hasSearch = query.length > 0;
    const hasClassFilter = classes.length > 0;
    const hasCastingTimeFilter = castingTimes.length > 0;
    const hasLevelFilter = levels.length > 0;

    return spells.filter((spell) => {
      if (hasSearch) {
        const haystack = this.normalizeSearchValue(spell.name);
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (hasClassFilter && !classes.some((item) => spell.classes.includes(item))) {
        return false;
      }

      if (hasCastingTimeFilter && !castingTimes.includes(spell.castingTime)) {
        return false;
      }

      return !(hasLevelFilter && !levels.includes(spell.level));


    });
  }

  private uniqueSorted<T extends string | number>(values: T[]): T[] {
    return Array.from(new Set(values)).sort((a, b) => (a > b ? 1 : -1));
  }

  private normalizeSearchValue(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
