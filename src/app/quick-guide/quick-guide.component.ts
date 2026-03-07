import { AfterViewInit, Component, DestroyRef, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';

import { GuideService } from '../services/guide.service';
import { GuideCategory, GuideItem } from '../models/guide.models';

type GuideItemView = GuideItem & {
  effects: string[];
};

type GuideCategoryView = Omit<GuideCategory, 'items'> & {
  items: GuideItemView[];
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
        return { ...item, effects };
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

  trackCategory(index: number, category: GuideCategory): string {
    return category.id || `${index}`;
  }

  trackItem(index: number, item: { id: string }): string {
    return item.id || `${index}`;
  }
}
