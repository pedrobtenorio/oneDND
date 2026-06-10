import { Spell } from '../models/spell.models';
import { normalizeKey } from './linkify';

export const SPELL_COMPONENT_FILTER_OPTIONS = ['V', 'S', 'M'];

export type SpellFilterCriteria = {
  search: string;
  classes: string[];
  castingTimes: string[];
  levels: number[];
  schools: string[];
  components: string[];
  durations: string[];
  range: string;
  effect: string;
  concentrationOnly: boolean;
  favoritesOnly: boolean;
  favoriteIds: Set<string>;
};

const includesNormalized = (value: string, query: string): boolean => normalizeKey(value).includes(query);

const hasConcentration = (spell: Pick<Spell, 'duration'>): boolean =>
  includesNormalized(spell.duration, 'concentracao');

export const normalizeCastingTimeFilter = (castingTime: string): string => {
  const normalized = normalizeKey(castingTime);
  if (normalized.startsWith('acao bonus')) {
    return 'Ação Bônus';
  }
  if (normalized.startsWith('reacao')) {
    return 'Reação';
  }
  return castingTime;
};

export const normalizeComponentFilter = (component: string): string => {
  const normalized = normalizeKey(component);
  if (normalized.startsWith('m')) {
    return 'M';
  }
  if (normalized === 'v') {
    return 'V';
  }
  if (normalized === 's') {
    return 'S';
  }
  return component;
};

const getComponentFilters = (spell: Pick<Spell, 'components'>): string[] =>
  Array.from(new Set(spell.components.map(normalizeComponentFilter)));

const buildSearchHaystack = (spell: Spell): string =>
  [
    spell.name,
    spell.school,
    spell.classes.join(' '),
    spell.castingTime,
    spell.range,
    spell.components.join(' '),
    spell.duration,
    spell.description,
  ].join(' ');

export const filterSpells = <T extends Spell>(spells: T[], criteria: SpellFilterCriteria): T[] => {
  const searchQuery = normalizeKey(criteria.search);
  const rangeQuery = normalizeKey(criteria.range);
  const effectQuery = normalizeKey(criteria.effect);

  return spells.filter((spell) => {
    if (criteria.favoritesOnly && !criteria.favoriteIds.has(spell.id)) {
      return false;
    }

    if (searchQuery && !includesNormalized(buildSearchHaystack(spell), searchQuery)) {
      return false;
    }

    if (criteria.classes.length && !criteria.classes.some((item) => spell.classes.includes(item))) {
      return false;
    }

    if (
      criteria.castingTimes.length &&
      !criteria.castingTimes.includes(normalizeCastingTimeFilter(spell.castingTime))
    ) {
      return false;
    }

    if (criteria.levels.length && !criteria.levels.includes(spell.level)) {
      return false;
    }

    if (criteria.schools.length && !criteria.schools.includes(spell.school)) {
      return false;
    }

    if (
      criteria.components.length &&
      !criteria.components.every((component) => getComponentFilters(spell).includes(component))
    ) {
      return false;
    }

    if (criteria.durations.length && !criteria.durations.includes(spell.duration)) {
      return false;
    }

    if (rangeQuery && !includesNormalized(spell.range, rangeQuery)) {
      return false;
    }

    if (effectQuery && !includesNormalized(spell.description, effectQuery)) {
      return false;
    }

    return !criteria.concentrationOnly || hasConcentration(spell);
  });
};
