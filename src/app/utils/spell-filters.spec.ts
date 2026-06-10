import { Spell } from '../models/spell.models';
import {
  filterSpells,
  normalizeCastingTimeFilter,
  normalizeComponentFilter,
  SpellFilterCriteria,
} from './spell-filters';

const spells: Spell[] = [
  {
    id: 'teia',
    name: 'Teia',
    level: 2,
    school: 'Conjuração',
    classes: ['Mago'],
    castingTime: 'Ação',
    range: '18 m',
    components: ['V', 'S', 'M'],
    duration: 'Concentração, até 1 hora',
    description: 'Cria teias que deixam criaturas Contidas.',
  },
  {
    id: 'bola-de-fogo',
    name: 'Bola de Fogo',
    level: 3,
    school: 'Evocação',
    classes: ['Feiticeiro', 'Mago'],
    castingTime: 'Ação',
    range: '45 m',
    components: ['V', 'S', 'M'],
    duration: 'Instantânea',
    description: 'Cada alvo sofre dano de fogo.',
  },
  {
    id: 'curar-ferimentos',
    name: 'Curar Ferimentos',
    level: 1,
    school: 'Evocação',
    classes: ['Clérigo', 'Druida'],
    castingTime: 'Ação',
    range: 'Toque',
    components: ['V', 'S'],
    duration: 'Instantânea',
    description: 'Uma criatura recupera pontos de vida.',
  },
  {
    id: 'golpe-constritor',
    name: 'Golpe Constritor',
    level: 1,
    school: 'Conjuração',
    classes: ['Guardião'],
    castingTime: 'Ação Bônus, que você realiza imediatamente após atingir uma criatura com uma arma',
    range: 'Pessoal',
    components: ['V', 'M (uma arma Corpo a Corpo que vale 1 ou mais PP)'],
    duration: 'Concentração, até 1 minuto',
    description: 'O alvo sofre dano extra.',
  },
];

const criteria = (overrides: Partial<SpellFilterCriteria> = {}): SpellFilterCriteria => ({
  search: '',
  classes: [],
  castingTimes: [],
  levels: [],
  schools: [],
  components: [],
  durations: [],
  range: '',
  effect: '',
  concentrationOnly: false,
  favoritesOnly: false,
  favoriteIds: new Set<string>(),
  ...overrides,
});

describe('spell filter utilities', () => {
  it('normalizes long casting time labels for filter options', () => {
    expect(
      normalizeCastingTimeFilter(
        'Ação Bônus, que você realiza imediatamente após atingir uma criatura com uma arma'
      )
    ).toBe('Ação Bônus');
    expect(normalizeCastingTimeFilter('Reação, que você executa quando vê uma criatura')).toBe('Reação');
  });

  it('normalizes material components for filter options', () => {
    expect(normalizeComponentFilter('M (um sino e um fio de prata)')).toBe('M');
    expect(normalizeComponentFilter('V')).toBe('V');
    expect(normalizeComponentFilter('S')).toBe('S');
  });

  it('searches across metadata with accent-insensitive matching', () => {
    const result = filterSpells(spells, criteria({ search: 'evocacao clerigo' }));

    expect(result.map((spell) => spell.id)).toEqual(['curar-ferimentos']);
  });

  it('filters by advanced spell metadata', () => {
    const result = filterSpells(
      spells,
      criteria({
        classes: ['Mago'],
        schools: ['Conjuração'],
        components: ['V', 'S', 'M'],
        levels: [2],
        castingTimes: ['Ação'],
        range: '18',
      })
    );

    expect(result.map((spell) => spell.id)).toEqual(['teia']);
  });

  it('matches normalized casting time and component filters', () => {
    const result = filterSpells(
      spells,
      criteria({
        castingTimes: ['Ação Bônus'],
        components: ['M'],
      })
    );

    expect(result.map((spell) => spell.id)).toEqual(['golpe-constritor']);
  });

  it('filters by effect text and concentration', () => {
    const result = filterSpells(spells, criteria({ effect: 'contida', concentrationOnly: true }));

    expect(result.map((spell) => spell.id)).toEqual(['teia']);
  });

  it('keeps only favorites when requested', () => {
    const result = filterSpells(
      spells,
      criteria({
        favoritesOnly: true,
        favoriteIds: new Set(['bola-de-fogo']),
      })
    );

    expect(result.map((spell) => spell.id)).toEqual(['bola-de-fogo']);
  });
});
