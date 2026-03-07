import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map, startWith } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';

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
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule,
  ],
  templateUrl: './quick-guide.component.html',
  styleUrl: './quick-guide.component.css',
})
export class QuickGuideComponent {
  private readonly guideService = inject(GuideService);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categories$ = this.guideService.getGuide();

  readonly filteredCategories$ = combineLatest([
    this.categories$,
    this.searchControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([categories, search]) => this.filterCategories(categories, search))
  );

  private filterCategories(categories: GuideCategory[], search: string): GuideCategoryView[] {
    const query = this.normalizeSearchValue(search);
    const filtered = categories
      .map((category) => {
        const categoryMatches = this.normalizeSearchValue(category.title).includes(query);
        if (categoryMatches) {
          return category;
        }

        const filteredItems = category.items.filter((item) => {
          const name = this.normalizeSearchValue(item.name);
          const description = this.normalizeSearchValue(item.description);
          return (
            name.includes(query) ||
            description.includes(query)
          );
        });

        return { ...category, items: filteredItems };
      })
      .filter((category) => category.items.length > 0);

    const toView = (category: GuideCategory): GuideCategoryView => ({
      ...category,
      items: category.items.map((item) => {
        const effects = this.splitEffects(item.description);
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
