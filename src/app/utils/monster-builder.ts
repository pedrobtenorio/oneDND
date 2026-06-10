import {
  MonsterAbilityKey,
  MonsterEntry,
  MonsterEntryType,
  MonsterSectionKey,
  MonsterSheet,
  MonsterSpellGroup,
  MonsterSpellRechargeType,
} from '../models/monster.models';

type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

export const MONSTER_SECTION_LABELS: Record<MonsterSectionKey, string> = {
  traits: 'Traços',
  actions: 'Ações',
  bonusActions: 'Ações Bônus',
  reactions: 'Reações',
};

export const MONSTER_ENTRY_TYPE_LABELS: Record<MonsterEntryType, string> = {
  text: 'Texto livre',
  multiattack: 'Multiataque',
  attack: 'Ataque',
  save: 'Ação de salvaguarda',
  spellcasting: 'Conjuração',
};

export const ABILITY_LABELS: Record<MonsterAbilityKey, string> = {
  str: 'For',
  dex: 'Des',
  con: 'Con',
  int: 'Int',
  wis: 'Sab',
  cha: 'Car',
};

export const ABILITY_NAMES: Record<MonsterAbilityKey, string> = {
  str: 'Força',
  dex: 'Destreza',
  con: 'Constituição',
  int: 'Inteligência',
  wis: 'Sabedoria',
  cha: 'Carisma',
};

export const ABILITY_SELECT_OPTIONS = (Object.entries(ABILITY_NAMES) as Array<[MonsterAbilityKey, string]>).map(
  ([value, label]) => ({ value, label })
);

export const MONSTER_CREATURE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Humanoide', label: 'Humanoide' },
  { value: 'Aberração', label: 'Aberração' },
  { value: 'Besta', label: 'Besta' },
  { value: 'Celestial', label: 'Celestial' },
  { value: 'Construto', label: 'Construto' },
  { value: 'Dragão', label: 'Dragão' },
  { value: 'Elemental', label: 'Elemental' },
  { value: 'Feérico', label: 'Feérico' },
  { value: 'Infernal', label: 'Infernal' },
  { value: 'Gigante', label: 'Gigante' },
  { value: 'Monstruosidade', label: 'Monstruosidade' },
  { value: 'Gosma', label: 'Gosma' },
  { value: 'Planta', label: 'Planta' },
  { value: 'Morto-vivo', label: 'Morto-vivo' },
];

export const COMMON_LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'Comum', label: 'Comum' },
  { value: 'Língua de Sinais Comum', label: 'Língua de Sinais Comum' },
  { value: 'Dracônico', label: 'Dracônico' },
  { value: 'Anão', label: 'Anão' },
  { value: 'Élfico', label: 'Élfico' },
  { value: 'Gigante', label: 'Gigante' },
  { value: 'Gnômico', label: 'Gnômico' },
  { value: 'Goblin', label: 'Goblin' },
  { value: 'Pequenino', label: 'Pequenino' },
  { value: 'Orc', label: 'Orc' },
];

export const RARE_LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'Abissal', label: 'Abissal' },
  { value: 'Celestial', label: 'Celestial' },
  { value: 'Dialeto Obscuro', label: 'Dialeto Obscuro' },
  { value: 'Druídico', label: 'Druídico' },
  { value: 'Gíria dos Ladrões', label: 'Gíria dos Ladrões' },
  { value: 'Infernal', label: 'Infernal' },
  { value: 'Primordial', label: 'Primordial' },
  { value: 'Silvestre', label: 'Silvestre' },
  { value: 'Subcomum', label: 'Subcomum' },
];

export const SPELL_RECHARGE_TYPE_OPTIONS: SelectOption<MonsterSpellRechargeType>[] = [
  { value: 'at-will', label: 'À vontade' },
  { value: 'per-day', label: 'Por dia' },
  { value: 'per-turn', label: 'Por turno' },
  { value: 'per-round', label: 'Por rodada' },
];

export const createId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const createSpellGroup = (): MonsterSpellGroup => ({
  id: createId('spell-group'),
  rechargeType: 'at-will',
  uses: '',
  spellIds: [],
});

export const createEntryByType = (type: MonsterEntryType): MonsterEntry => {
  const id = createId(type);

  switch (type) {
    case 'multiattack':
      return {
        id,
        type,
        name: 'Multiataque',
        routine: 'A criatura faz dois ataques.',
      };
    case 'attack':
      return {
        id,
        type,
        name: 'Novo Ataque',
        attackType: 'Rolagem de Ataque Corpo a Corpo',
        attackBonus: '+0',
        reach: 'alcance 1,5 m',
        target: 'um alvo',
        hitAverage: '',
        hitFormula: '',
        damageType: '',
        extraDamage: '',
        effect: '',
      };
    case 'save':
      return {
        id,
        type,
        name: 'Nova Ação de Salvaguarda',
        saveAbility: 'Sabedoria',
        dc: '10',
        target: 'uma criatura que o monstro possa ver',
        range: 'até 9 m',
        failure: '',
        success: '',
      };
    case 'spellcasting':
      return {
        id,
        type,
        name: 'Conjuração',
        ability: 'Sabedoria',
        saveDc: '10',
        spellAttackBonus: '',
        intro: '',
        spellGroups: [createSpellGroup()],
      };
    case 'text':
    default:
      return {
        id,
        type: 'text',
        name: 'Nova Entrada',
        description: '',
      };
  }
};

export const createEmptyMonster = (): MonsterSheet => ({
  id: createId('monster'),
  name: 'Novo Monstro',
  size: 'Medio',
  creatureType: 'Humanoide',
  alignment: 'Sem alinhamento',
  initiative: '',
  ac: '10',
  hp: '11 (2d8 + 2)',
  speed: '9 m',
  skills: '',
  resistances: '',
  immunities: '',
  conditionImmunities: '',
  senses: 'Percepcao Passiva 10',
  languages: 'Comum',
  cr: '1',
  xp: '200',
  proficiencyBonus: '+2',
  abilities: {
    str: { score: 10, save: '' },
    dex: { score: 10, save: '' },
    con: { score: 10, save: '' },
    int: { score: 10, save: '' },
    wis: { score: 10, save: '' },
    cha: { score: 10, save: '' },
  },
  traits: [],
  actions: [createEntryByType('attack')],
  bonusActions: [],
  reactions: [],
});

export const calculateAbilityModifier = (score: number): number => Math.floor((score - 10) / 2);

export const formatModifier = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);

export const cloneMonster = (monster: MonsterSheet): MonsterSheet =>
  JSON.parse(JSON.stringify(monster)) as MonsterSheet;

export const getMonsterSubtitle = (monster: MonsterSheet): string => {
  const typeBits = [monster.size.trim(), monster.creatureType.trim()].filter(Boolean).join(' ');
  return monster.alignment.trim() ? `${typeBits}, ${monster.alignment.trim()}` : typeBits;
};

export const getMonsterChallenge = (monster: MonsterSheet): string => {
  const base = monster.cr.trim() || '-';
  const extras: string[] = [];

  if (monster.xp.trim()) {
    extras.push(`XP ${monster.xp.trim()}`);
  }
  if (monster.proficiencyBonus.trim()) {
    extras.push(`PB ${monster.proficiencyBonus.trim()}`);
  }

  return extras.length ? `${base} (${extras.join('; ')})` : base;
};

export const formatSpellGroupLabel = (group: Pick<MonsterSpellGroup, 'rechargeType' | 'uses'>): string => {
  const uses = group.uses?.trim() || '';

  switch (group.rechargeType) {
    case 'per-day':
      return uses ? `${uses}/dia` : 'Por dia';
    case 'per-turn':
      return uses ? `${uses}/turno` : 'Por turno';
    case 'per-round':
      return uses ? `${uses}/rodada` : 'Por rodada';
    case 'at-will':
    default:
      return 'À vontade';
  }
};

export const parseSpellGroupLabel = (
  label: string
): Pick<MonsterSpellGroup, 'rechargeType' | 'uses'> => {
  const normalized = label.trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s*\/\s*(dia|turno|rodada)$/);

  if (match) {
    const period = match[2];
    return {
      rechargeType:
        period === 'dia' ? 'per-day' : period === 'turno' ? 'per-turn' : 'per-round',
      uses: match[1],
    };
  }

  if (normalized.includes('turno')) {
    return { rechargeType: 'per-turn', uses: '' };
  }
  if (normalized.includes('rodada')) {
    return { rechargeType: 'per-round', uses: '' };
  }
  if (normalized.includes('dia')) {
    return { rechargeType: 'per-day', uses: '' };
  }

  return { rechargeType: 'at-will', uses: '' };
};

export const buildLanguagesText = (selected: string[], extra: string): string => {
  const base = selected.filter(Boolean).join(', ');
  const tail = extra.trim();

  if (base && tail) {
    return `${base}; ${tail}`;
  }

  return base || tail;
};

export const parseLanguagesText = (value: string): { selected: string[]; extra: string } => {
  const allKnown = new Set([...COMMON_LANGUAGE_OPTIONS, ...RARE_LANGUAGE_OPTIONS].map((item) => item.value));
  const selected: string[] = [];
  const extra: string[] = [];

  value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      if (allKnown.has(item)) {
        selected.push(item);
      } else {
        extra.push(item);
      }
    });

  return { selected, extra: extra.join('; ') };
};
