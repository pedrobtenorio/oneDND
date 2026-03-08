import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { combineLatest, map, startWith } from 'rxjs';
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
    RouterModule,
  ],
  templateUrl: './armas.component.html',
  styleUrl: './armas.component.css',
})
export class ArmasComponent {
  private readonly weaponsService = inject(WeaponsService);
  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly weaponsSource$ = this.weaponsService
    .getWeapons()
    .pipe(map((data) => this.toView(data)));

  readonly weapons$ = combineLatest([
    this.weaponsSource$,
    this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
  ]).pipe(
    map(([data, search]) => this.filterWeapons(data, search))
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
      })),
    }));

    return { ...data, categories, propertyMap, masteryMap };
  }

  private filterWeapons(data: WeaponsView, search: string): WeaponsView {
    const query = normalizeKey(search);
    if (!query) {
      return data;
    }

    const categories: WeaponCategoryView[] = data.categories
      .map((category) => {
        const weapons = category.weapons.filter((weapon) => {
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
}
