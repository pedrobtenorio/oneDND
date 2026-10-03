import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, debounceTime, distinctUntilChanged, map, shareReplay, startWith } from 'rxjs';
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
  searchText: string;
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
  searchText: string;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickGuideComponent implements AfterViewInit {
  @ViewChildren(MatExpansionPanel) private readonly panels!: QueryList<MatExpansionPanel>;

  private readonly guideService = inject(GuideService);
  private readonly summonService = inject(SummonService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly summons$ = this.summonService.getSummons();
  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly preparedCategories$ = combineLatest([
    this.guideService.getGuide(),
    this.summons$,
  ]).pipe(
    map(([categories, summons]) => this.prepareCategories(categories, summons)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly filteredCategories$ = combineLatest([
    this.preparedCategories$,
    this.searchControl.valueChanges.pipe(debounceTime(120), startWith(''), distinctUntilChanged()),
  ]).pipe(
    map(([categories, search]) => this.filterCategories(categories, search)),
    shareReplay({ bufferSize: 1, refCount: true }),
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
        }, 225);
      });
  }

  private prepareCategories(categories: GuideCategory[], allSummons: Summon[]): GuideCategoryView[] {
    const linkableItems = this.getLinkableItems(categories);
    const toItemView = (category: GuideCategory) => (item: GuideItem): GuideItemView => {
      const effects = this.buildEffects(category.id, item.description);
      return {
        ...item,
        effects,
        effectParts: effects.map((effect) => buildDescriptionParts(effect, linkableItems)),
        searchText: this.normalizeSearchValue(this.getSearchText(item)),
      };
    };
    return categories.map((category): GuideCategoryView => {
      if (category.id === 'invocacoes-familiares') {
        return { ...category, items: [], itemGroups: [], summons: allSummons, searchText: this.normalizeSearchValue(category.title) };
      }
      const items = this.sortCategoryItems(category.id, category.items).map(toItemView(category));
      return { ...category, items, itemGroups: this.buildItemGroups(category.id, items), summons: [], searchText: this.normalizeSearchValue(category.title) };
    });
  }

  private filterCategories(categories: GuideCategoryView[], search: string): GuideCategoryView[] {
    const query = this.normalizeSearchValue(search);
    return categories.flatMap((category): GuideCategoryView[] => {
      if (category.id === 'invocacoes-familiares') {
        const summons = query ? category.summons.filter((summon) => this.normalizeSearchValue(`${summon.name} ${summon.type}`).includes(query)) : category.summons;
        return !query || category.searchText.includes(query) || summons.length ? [{ ...category, summons }] : [];
      }
      const items = !query || category.searchText.includes(query) ? category.items : category.items.filter((item) => item.searchText.includes(query));
      return items.length ? [{ ...category, items, itemGroups: this.buildItemGroups(category.id, items) }] : [];
    });
  }

  private buildItemGroups(
    categoryId: string,
    items: GuideItemView[],
  ): GuideItemGroupView[] {
    if (categoryId !== 'pericias') {
      return [];
    }

    const labels = new Map([
      ['DES', 'Destreza'],
      ['SAB', 'Sabedoria'],
      ['FOR', 'Força'],
      ['INT', 'Inteligência'],
      ['CAR', 'Carisma'],
      ['CON', 'Constituição'],
    ]);

    const groups = new Map<string, GuideItemView[]>();
    for (const item of items) {
      const ability = this.getSkillAbility(item.name);
      const key = ability || 'OUTROS';
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return [...groups.entries()].map(([ability, groupedItems]) => ({
      id: ability.toLowerCase(),
      title: labels.get(ability) ?? ability,
      items: groupedItems,
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
