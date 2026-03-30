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
import { SummonService } from '../services/summon.service';
import { GuideCategory, GuideItem } from '../models/guide.models';
import { Summon } from '../models/summon.models';
import { SummonCardComponent } from '../summon-card/summon-card.component';
import { buildDescriptionParts, LinkPart } from '../utils/linkify';

type GuideItemView = GuideItem & {
  effects: string[];
  effectParts: LinkPart<GuideItem>[][];
};

type GuideItemGroupView = {
  id: string;
  title: string;
  items: GuideItemView[];
};

type GuideCategoryView = Omit<GuideCategory, 'items'> & {
  items: GuideItemView[];
  itemGroups: GuideItemGroupView[];
  summons: Summon[];
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
    SummonCardComponent,
  ],
  templateUrl: './quick-guide.component.html',
  styleUrl: './quick-guide.component.css',
})
export class QuickGuideComponent implements AfterViewInit {
  @ViewChildren(MatExpansionPanel) private readonly panels!: QueryList<MatExpansionPanel>;

  private readonly guideService = inject(GuideService);
  private readonly summonService = inject(SummonService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly summons$ = this.summonService.getSummons();
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categories$ = this.guideService.getGuide();

  readonly filteredCategories$ = combineLatest([
    this.categories$,
    this.summons$,
    this.searchControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([categories, summons, search]) => this.filterCategories(categories, summons, search))
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
          category.items.some((item) => item.id === fragment) ||
          category.summons.some((s) => s.id === fragment)
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

  private filterCategories(categories: GuideCategory[], allSummons: Summon[], search: string): GuideCategoryView[] {
    const query = this.normalizeSearchValue(search);
    const linkableItems = this.getLinkableItems(categories);

    const toItemView = (category: GuideCategory) => (item: GuideItem): GuideItemView => {
      const effects = this.buildEffects(category.id, item.description);
      return { ...item, effects, effectParts: effects.map((e) => buildDescriptionParts(e, linkableItems)) };
    };

    return categories.flatMap((category): GuideCategoryView[] => {
      if (category.id === 'invocacoes-familiares') {
        const filteredSummons = query
          ? allSummons.filter((s) => this.normalizeSearchValue(s.name + ' ' + s.type).includes(query))
          : allSummons;
        return filteredSummons.length > 0
          ? [{ ...category, items: [], itemGroups: [], summons: filteredSummons }]
          : [];
      }

      const categoryMatches = !query || this.normalizeSearchValue(category.title).includes(query);
      const items = categoryMatches
        ? category.items
        : category.items.filter((item) => this.normalizeSearchValue(this.getSearchText(item)).includes(query));
      const sortedItems = this.sortCategoryItems(category.id, items);

      return sortedItems.length > 0
        ? [{
            ...category,
            items: sortedItems.map(toItemView(category)),
            itemGroups: this.buildItemGroups(category.id, sortedItems, toItemView(category)),
            summons: [],
          }]
        : [];
    });
  }

  private buildItemGroups(
    categoryId: string,
    items: GuideItem[],
    toItemView: (item: GuideItem) => GuideItemView
  ): GuideItemGroupView[] {
    if (categoryId !== 'pericias') {
      return [];
    }

    const labels = new Map([
      ['DES', 'Destreza'],
      ['SAB', 'Sabedoria'],
      ['FOR', 'Forca'],
      ['INT', 'Inteligencia'],
      ['CAR', 'Carisma'],
      ['CON', 'Constituicao'],
    ]);

    const groups = new Map<string, GuideItem[]>();
    for (const item of items) {
      const ability = this.getSkillAbility(item.name);
      const key = ability || 'OUTROS';
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return [...groups.entries()].map(([ability, groupedItems]) => ({
      id: ability.toLowerCase(),
      title: labels.get(ability) ?? ability,
      items: groupedItems.map(toItemView),
    }));
  }

  private sortCategoryItems(categoryId: string, items: GuideItem[]): GuideItem[] {
    if (categoryId !== 'pericias') {
      return items;
    }

    const abilityOrder = new Map([
      ['DES', 0],
      ['SAB', 1],
      ['FOR', 2],
    ]);

    return [...items].sort((left, right) => {
      const leftAbility = this.getSkillAbility(left.name);
      const rightAbility = this.getSkillAbility(right.name);
      const leftRank = abilityOrder.get(leftAbility) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = abilityOrder.get(rightAbility) ?? Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      if (leftAbility !== rightAbility) {
        return leftAbility.localeCompare(rightAbility);
      }

      return left.name.localeCompare(right.name);
    });
  }

  private getSkillAbility(name: string): string {
    const match = name.match(/\(([^)]+)\)\s*$/);
    return match?.[1]?.toUpperCase() ?? '';
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

  trackCategory(index: number, category: GuideCategory): string {
    return category.id || `${index}`;
  }

  trackItem(index: number, item: { id: string }): string {
    return item.id || `${index}`;
  }
}
