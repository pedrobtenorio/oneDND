import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map, startWith } from 'rxjs';
import { RouterModule } from '@angular/router';

import { SpellService } from '../services/spell.service';
import { GuideService } from '../services/guide.service';
import { GuideCategory, GuideItem } from '../models/guide.models';
import { Spell } from '../models/spell.models';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

type DescriptionPart = {
  text: string;
  linkItem?: GuideItem;
};

type SpellView = Spell & {
  descriptionParts: DescriptionPart[];
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
  ],
  templateUrl: './magias.component.html',
  styleUrl: './magias.component.css',
})
export class MagiasComponent {
  private readonly spellService = inject(SpellService);
  private readonly guideService = inject(GuideService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly classControl = new FormControl<string[]>([], { nonNullable: true });
  readonly castingTimeControl = new FormControl<string[]>([], { nonNullable: true });
  readonly levelControl = new FormControl<number[]>([], { nonNullable: true });

  private readonly spellViews$ = combineLatest([
    this.spellService.getSpells(),
    this.guideService.getGuide(),
  ]).pipe(
    map(([spells, guide]) => {
      const linkItems = this.getLinkableItems(guide);
      return spells.map((spell): SpellView => ({
        ...spell,
        descriptionParts: this.buildDescriptionParts(spell.description, linkItems),
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

  private buildDescriptionParts(description: string, items: GuideItem[]): DescriptionPart[] {
    if (!items.length) {
      return [{ text: description }];
    }

    const itemMap = new Map<string, GuideItem>();
    const itemNames: string[] = [];

    items.forEach((item) => {
      const aliases = this.buildItemAliases(item.name);
      aliases.forEach((alias) => {
        const normalized = this.normalizeKey(alias);
        itemMap.set(normalized, item);
        itemNames.push(alias);
      });
    });

    const pattern = new RegExp(`\\b(${itemNames.map(this.escapeRegex).join('|')})\\b`, 'gi');
    const parts: DescriptionPart[] = [];
    let lastIndex = 0;
    let match = pattern.exec(description);

    while (match) {
      if (match.index > lastIndex) {
        parts.push({ text: description.slice(lastIndex, match.index) });
      }

      const matchedText = match[0];
      const normalized = this.normalizeKey(matchedText);
      parts.push({ text: matchedText, linkItem: itemMap.get(normalized) });

      lastIndex = match.index + matchedText.length;
      match = pattern.exec(description);
    }

    if (lastIndex < description.length) {
      parts.push({ text: description.slice(lastIndex) });
    }

    return parts;
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
        const haystack = this.normalizeSearchValue(
          [spell.name, spell.description, spell.school, spell.classes.join(' ')].join(' ')
        );
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

  private normalizeKey(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private buildItemAliases(name: string): string[] {
    const aliases = new Set<string>([name]);
    const words = name.split(' ');

    const addWordVariants = (input: string): string[] => {
      if (input.endsWith('o')) {
        const root = input.slice(0, -1);
        return [input, `${root}a`, `${root}os`, `${root}as`];
      }
      if (input.endsWith('a')) {
        const root = input.slice(0, -1);
        return [input, `${root}o`, `${root}as`, `${root}os`];
      }
      if (input.endsWith('os')) {
        const root = input.slice(0, -2);
        return [input, `${root}o`];
      }
      if (input.endsWith('as')) {
        const root = input.slice(0, -2);
        return [input, `${root}a`];
      }
      return [input];
    };

    if (words.length === 1) {
      addWordVariants(words[0]).forEach((variant) => aliases.add(variant));
      return Array.from(aliases);
    }

    const firstVariants = addWordVariants(words[0]);
    const lastVariants = addWordVariants(words[words.length - 1]);
    const middle = words.slice(1, -1).join(' ');

    firstVariants.forEach((first) => {
      lastVariants.forEach((last) => {
        const combined = [first, middle, last].filter(Boolean).join(' ');
        aliases.add(combined);
      });
    });

    return Array.from(aliases);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
