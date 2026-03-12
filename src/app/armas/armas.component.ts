import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BehaviorSubject, combineLatest, map, startWith } from 'rxjs';
import { RouterModule } from '@angular/router';

import { WeaponsService } from '../services/weapons.service';
import { WeaponEntry, WeaponProperty, WeaponsData } from '../models/weapons.models';
import { normalizeKey } from '../utils/linkify';

type WeaponToken = {
  text: string;
  key?: string;
};

type WeaponEntryView = WeaponEntry & {
  propertyTokens: WeaponToken[];
  masteryTokens: WeaponToken[];
  favoriteId: string;
};

type WeaponCategoryView = {
  name: string;
  weapons: WeaponEntryView[];
};

type WeaponsView = {
  properties: WeaponProperty[];
  masteryProperties: WeaponProperty[];
  categories: WeaponCategoryView[];
  propertyMap: Map<string, WeaponProperty>;
  masteryMap: Map<string, WeaponProperty>;
};

@Component({
  selector: 'app-armas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
  ],
  templateUrl: './armas.component.html',
  styleUrl: './armas.component.css',
})
export class ArmasComponent {
  private readonly weaponsService = inject(WeaponsService);
  private readonly favoritesStorageKey = 'favorite-weapons';
  private readonly favoriteIdsSubject = new BehaviorSubject<Set<string>>(this.loadFavoriteIds());
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly favoritesOnlyControl = new FormControl(false, { nonNullable: true });

  private readonly weaponsSource$ = this.weaponsService
    .getWeapons()
    .pipe(map((data) => this.toView(data)));

  readonly weapons$ = combineLatest([
    this.weaponsSource$,
    this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
    this.favoritesOnlyControl.valueChanges.pipe(startWith(this.favoritesOnlyControl.value)),
    this.favoriteIdsSubject.asObservable(),
  ]).pipe(
    map(([data, search, favoritesOnly, favoriteIds]) => this.filterWeapons(data, search, favoritesOnly, favoriteIds))
  );

  formatTooltip(description: string): string {
    return description.replace(/[;.]\s*/g, (match) => `${match}\n`);
  }

  propertyId(name: string): string {
    return `prop-${this.slugify(name)}`;
  }

  masteryId(name: string): string {
    return `mastery-${this.slugify(name)}`;
  }

  lookupProperty(map: Map<string, WeaponProperty>, token: WeaponToken): WeaponProperty | undefined {
    if (!token.key) {
      return undefined;
    }
    return map.get(token.key);
  }

  private toView(data: WeaponsData): WeaponsView {
    const propertyMap = this.buildPropertyMap(data.properties);
    const masteryMap = this.buildPropertyMap(data.masteryProperties);
    const categories: WeaponCategoryView[] = data.categories.map((category) => ({
      ...category,
      weapons: category.weapons.map((weapon) => ({
        ...weapon,
        propertyTokens: this.tokenize(weapon.properties, propertyMap),
        masteryTokens: this.tokenize(weapon.mastery, masteryMap),
        favoriteId: normalizeKey(weapon.name),
      })),
    }));

    return { ...data, categories, propertyMap, masteryMap };
  }

  toggleFavoritesOnly(): void {
    this.favoritesOnlyControl.setValue(!this.favoritesOnlyControl.value);
  }

  isFavorite(favoriteId: string): boolean {
    return this.favoriteIdsSubject.value.has(favoriteId);
  }

  toggleFavorite(favoriteId: string): void {
    const next = new Set(this.favoriteIdsSubject.value);
    if (next.has(favoriteId)) {
      next.delete(favoriteId);
    } else {
      next.add(favoriteId);
    }
    this.favoriteIdsSubject.next(next);
    this.persistFavoriteIds(next);
  }

  private filterWeapons(
    data: WeaponsView,
    search: string,
    favoritesOnly: boolean,
    favoriteIds: Set<string>
  ): WeaponsView {
    const query = normalizeKey(search);
    if (!query) {
      if (!favoritesOnly) {
        return data;
      }
    }

    const categories: WeaponCategoryView[] = data.categories
      .map((category) => {
        const weapons = category.weapons.filter((weapon) => {
          if (favoritesOnly && !favoriteIds.has(weapon.favoriteId)) {
            return false;
          }
          if (!query) {
            return true;
          }
          const haystack = normalizeKey(
            [
              weapon.name,
              weapon.damage,
              weapon.properties,
              weapon.mastery,
              weapon.weight,
              weapon.cost,
            ].join(' ')
          );
          return haystack.includes(query);
        });
        return { ...category, weapons };
      })
      .filter((category) => category.weapons.length > 0);

    return { ...data, categories };
  }

  private buildPropertyMap(items: WeaponProperty[]): Map<string, WeaponProperty> {
    return new Map(items.map((item) => [normalizeKey(item.name), item]));
  }

  private tokenize(value: string, map: Map<string, WeaponProperty>): WeaponToken[] {
    if (!value || value.trim() === '—') {
      return [{ text: '—' }];
    }

    return value
      .split(',')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const base = chunk.split('(')[0].trim();
        const key = normalizeKey(base);
        return map.has(key) ? { text: chunk, key } : { text: chunk };
      });
  }

  private slugify(value: string): string {
    return normalizeKey(value).replace(/\s+/g, '-');
  }

  private loadFavoriteIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.favoritesStorageKey);
      if (!raw) {
        return new Set();
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((item) => typeof item === 'string'));
      }
    } catch {
      return new Set();
    }
    return new Set();
  }

  private persistFavoriteIds(favoriteIds: Set<string>): void {
    try {
      const payload = JSON.stringify(Array.from(favoriteIds));
      localStorage.setItem(this.favoritesStorageKey, payload);
    } catch {
      return;
    }
  }
}
