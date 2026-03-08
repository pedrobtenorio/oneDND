import { AfterViewInit, Component, DestroyRef, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GuideService } from '../services/guide.service';
import { GuideCategory, GuideItem } from '../models/guide.models';

type GuideItemView = GuideItem & {
  effects: string[];
  effectParts: DescriptionPart[][];
};

type GuideCategoryView = Omit<GuideCategory, 'items'> & {
  items: GuideItemView[];
};

type DescriptionPart = {
  text: string;
  linkItem?: GuideItem;
};

@Component({
  selector: 'app-quick-guide',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './quick-guide.component.html',
  styleUrl: './quick-guide.component.css',
})
export class QuickGuideComponent implements AfterViewInit {
  @ViewChildren(MatExpansionPanel) private readonly panels!: QueryList<MatExpansionPanel>;

  private readonly guideService = inject(GuideService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categories$ = this.guideService.getGuide();

  readonly filteredCategories$ = combineLatest([
    this.categories$,
    this.searchControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([categories, search]) => this.filterCategories(categories, search))
  );

  ngAfterViewInit(): void {
    combineLatest([
      this.filteredCategories$,
      this.route.fragment.pipe(startWith(null)),
      this.panels.changes.pipe(startWith(this.panels)),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([categories, fragment]) => {
        if (!fragment) {
          return;
        }

        const categoryIndex = categories.findIndex((category) =>
          category.items.some((item) => item.id === fragment)
        );

        if (categoryIndex < 0) {
          return;
        }

        const panel = this.panels.get(categoryIndex);
        if (panel && !panel.expanded) {
          panel.open();
        }

        setTimeout(() => {
          const element = document.getElementById(fragment);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 0);
      });
  }

  private filterCategories(categories: GuideCategory[], search: string): GuideCategoryView[] {
    const query = this.normalizeSearchValue(search);
    const linkableItems = this.getLinkableItems(categories);
    const filtered = categories
      .map((category) => {
        const categoryMatches = this.normalizeSearchValue(category.title).includes(query);
        if (categoryMatches) {
          return category;
        }

        const filteredItems = category.items.filter((item) => {
          const searchable = this.normalizeSearchValue(this.getSearchText(item));
          return searchable.includes(query);
        });

        return { ...category, items: filteredItems };
      })
      .filter((category) => category.items.length > 0);

    const toView = (category: GuideCategory): GuideCategoryView => ({
      ...category,
      items: category.items.map((item) => {
        const effects = this.buildEffects(category.id, item.description);
        const effectParts = effects.map((effect) => this.buildDescriptionParts(effect, linkableItems));
        return { ...item, effects, effectParts };
      }),
    });

    return query ? filtered.map(toView) : categories.map(toView);
  }

  private splitEffects(description: string): string[] {
    return description
      .replace(/\s+/g, ' ')
      .split(/\. +/g)
      .map((sentence) => sentence.replace(/\.$/, '').trim())
      .filter(Boolean);
  }

  private buildEffects(categoryId: string, description: string): string[] {
    if (this.isInvocationCategory(categoryId) || !description) {
      return [];
    }
    return this.splitEffects(description);
  }

  isInvocationCategory(categoryId: string): boolean {
    return categoryId === 'invocacoes-familiares';
  }

  private getLinkableItems(categories: GuideCategory[]): GuideItem[] {
    const linkableCategories = new Set(['condicoes', 'invocacoes-familiares', 'glossario']);
    return categories
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

  private getSearchText(item: GuideItem): string {
    const stats = item.stats
      ? item.stats.map((stat) => `${stat.label} ${stat.score} ${stat.mod} ${stat.save}`).join(' ')
      : '';
    return [
      item.name,
      item.description,
      item.subtitle,
      item.armorClass,
      item.hitPoints,
      item.speed,
      stats,
      item.immunities,
      item.senses,
      item.languages,
      item.challenge,
      item.traits,
      item.actions,
      item.acoes
        ? item.acoes
            .map((acao) => {
              const alcance =
                acao.alcance?.normal_m || acao.alcance?.maximo_m
                  ? `${acao.alcance?.normal_m || ''} ${acao.alcance?.maximo_m || ''}`
                  : acao.alcance_m || '';
              return [
                acao.nome,
                acao.tipo_ataque,
                acao.bonus_acerto,
                alcance,
                acao.dano?.medio,
                acao.dano?.formula,
                acao.dano?.tipo,
              ]
                .filter(Boolean)
                .join(' ');
            })
            .join(' ')
        : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private normalizeSearchValue(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  formatTooltip(description: string): string {
    return description.replace(/[;.]\s*/g, (match) => `${match}\n`);
  }

  private normalizeKey(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  trackCategory(index: number, category: GuideCategory): string {
    return category.id || `${index}`;
  }

  trackItem(index: number, item: { id: string }): string {
    return item.id || `${index}`;
  }
}
