import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, shareReplay } from 'rxjs';

import { GlobalSearchResult } from '../models/global-search.models';
import { GuideCategory, GuideItem } from '../models/guide.models';
import { Spell } from '../models/spell.models';
import { Summon } from '../models/summon.models';
import { WeaponsData } from '../models/weapons.models';
import { GuideService } from './guide.service';
import { SpellService } from './spell.service';
import { SummonService } from './summon.service';
import { WeaponsService } from './weapons.service';
import { normalizeKey } from '../utils/linkify';

@Injectable({
  providedIn: 'root',
})
export class GlobalSearchService {
  private readonly guideService = inject(GuideService);
  private readonly spellService = inject(SpellService);
  private readonly summonService = inject(SummonService);
  private readonly weaponsService = inject(WeaponsService);

  private readonly index$ = combineLatest([
    this.guideService.getGuide(),
    this.spellService.getSpells(),
    this.summonService.getSummons(),
    this.weaponsService.getWeapons(),
  ]).pipe(
    map(([guide, spells, summons, weapons]) => this.buildIndex(guide, spells, summons, weapons)),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  search(query: string): Observable<GlobalSearchResult[]> {
    return this.index$.pipe(map((index) => this.filterResults(index, query)));
  }

  private filterResults(index: GlobalSearchResult[], query: string): GlobalSearchResult[] {
    const tokens = normalizeKey(query)
      .split(/\s+/)
      .filter(Boolean);

    if (!tokens.length) {
      return index.slice(0, 24);
    }

    return index
      .map((result) => ({
        result,
        score: this.scoreResult(result, tokens),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || left.result.title.localeCompare(right.result.title))
      .slice(0, 50)
      .map(({ result }) => result);
  }

  private scoreResult(result: GlobalSearchResult, tokens: string[]): number {
    const title = normalizeKey(result.title);
    const subtitle = normalizeKey(result.subtitle);
    const haystack = result.searchText;

    if (!tokens.every((token) => haystack.includes(token))) {
      return 0;
    }

    return tokens.reduce((score, token) => {
      if (title === token) {
        return score + 10;
      }
      if (title.includes(token)) {
        return score + 6;
      }
      if (subtitle.includes(token)) {
        return score + 3;
      }
      return score + 1;
    }, 0);
  }

  private buildIndex(
    guide: GuideCategory[],
    spells: Spell[],
    summons: Summon[],
    weapons: WeaponsData
  ): GlobalSearchResult[] {
    return [
      ...guide.flatMap((category) => category.items.map((item) => this.guideResult(category, item))),
      ...spells.map((spell) => this.spellResult(spell)),
      ...summons.map((summon) => this.summonResult(summon)),
      ...weapons.categories.flatMap((category) =>
        category.weapons.map((weapon) => ({
          id: `weapon-${normalizeKey(weapon.name)}`,
          kind: 'weapon' as const,
          title: weapon.name,
          subtitle: category.name,
          description: [weapon.damage, weapon.properties, weapon.mastery, weapon.weight, weapon.cost]
            .filter(Boolean)
            .join(' | '),
          route: '/armas',
          searchText: this.searchText([
            weapon.name,
            category.name,
            weapon.damage,
            weapon.properties,
            weapon.mastery,
            weapon.weight,
            weapon.cost,
          ]),
        }))
      ),
      ...weapons.properties.map((property) => ({
        id: `weapon-property-${normalizeKey(property.name)}`,
        kind: 'weapon-property' as const,
        title: property.name,
        subtitle: 'Propriedade de arma',
        description: property.description,
        route: '/armas',
        searchText: this.searchText([property.name, property.description, 'propriedade arma']),
      })),
      ...weapons.masteryProperties.map((property) => ({
        id: `weapon-mastery-${normalizeKey(property.name)}`,
        kind: 'weapon-mastery' as const,
        title: property.name,
        subtitle: 'Maestria de arma',
        description: property.description,
        route: '/armas',
        searchText: this.searchText([property.name, property.description, 'maestria arma']),
      })),
    ];
  }

  private guideResult(category: GuideCategory, item: GuideItem): GlobalSearchResult {
    const kind =
      category.id === 'condicoes'
        ? 'condition'
        : category.id === 'glossario'
          ? 'glossary'
          : 'guide';

    return {
      id: `guide-${item.id}`,
      kind,
      title: item.name,
      subtitle: category.title,
      description: item.description,
      route: '/guia',
      fragment: item.id,
      searchText: this.searchText([category.title, item.name, item.description, item.subtitle ?? '']),
    };
  }

  private spellResult(spell: Spell): GlobalSearchResult {
    return {
      id: `spell-${spell.id}`,
      kind: 'spell',
      title: spell.name,
      subtitle: `${spell.level === 0 ? 'Truque' : `${spell.level}º círculo`} | ${spell.school}`,
      description: [spell.classes.join(', '), spell.castingTime, spell.range, spell.duration].join(' | '),
      route: '/magias',
      fragment: spell.id,
      searchText: this.searchText([
        spell.name,
        spell.school,
        spell.classes.join(' '),
        spell.castingTime,
        spell.range,
        spell.components.join(' '),
        spell.duration,
        spell.description,
      ]),
    };
  }

  private summonResult(summon: Summon): GlobalSearchResult {
    return {
      id: `summon-${summon.id}`,
      kind: 'summon',
      title: summon.name,
      subtitle: summon.type,
      description: [`CA ${summon.ac}`, `PV ${summon.hp}`, summon.speed, summon.cr].join(' | '),
      route: '/guia',
      fragment: summon.id,
      searchText: this.searchText([
        summon.name,
        summon.type,
        summon.ac,
        summon.hp,
        summon.speed,
        summon.senses,
        summon.languages,
        summon.cr,
      ]),
    };
  }

  private searchText(values: string[]): string {
    return normalizeKey(values.filter(Boolean).join(' '));
  }
}
