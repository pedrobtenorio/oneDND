export type MonsterAbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type MonsterSectionKey = 'traits' | 'actions' | 'bonusActions' | 'reactions';

export type MonsterEntryType = 'text' | 'multiattack' | 'attack' | 'save' | 'spellcasting';
export type MonsterSpellRechargeType = 'at-will' | 'per-day' | 'per-turn' | 'per-round';

export interface MonsterAbility {
  score: number;
  save: string;
}

export interface MonsterSpellGroup {
  id: string;
  rechargeType: MonsterSpellRechargeType;
  uses?: string;
  spellIds: string[];
}

interface MonsterEntryBase {
  id: string;
  type: MonsterEntryType;
  name: string;
}

export interface MonsterTextEntry extends MonsterEntryBase {
  type: 'text';
  description: string;
}

export interface MonsterMultiattackEntry extends MonsterEntryBase {
  type: 'multiattack';
  routine: string;
}

export interface MonsterAttackEntry extends MonsterEntryBase {
  type: 'attack';
  attackType: string;
  attackBonus: string;
  reach: string;
  target: string;
  hitAverage: string;
  hitFormula: string;
  damageType: string;
  extraDamage: string;
  effect: string;
}

export interface MonsterSaveEntry extends MonsterEntryBase {
  type: 'save';
  saveAbility: string;
  dc: string;
  target: string;
  range: string;
  failure: string;
  success: string;
}

export interface MonsterSpellcastingEntry extends MonsterEntryBase {
  type: 'spellcasting';
  ability: string;
  saveDc: string;
  spellAttackBonus: string;
  intro: string;
  spellGroups: MonsterSpellGroup[];
}

export type MonsterEntry =
  | MonsterTextEntry
  | MonsterMultiattackEntry
  | MonsterAttackEntry
  | MonsterSaveEntry
  | MonsterSpellcastingEntry;

export interface MonsterSheet {
  id: string;
  name: string;
  size: string;
  creatureType: string;
  alignment: string;
  initiative: string;
  ac: string;
  hp: string;
  speed: string;
  skills: string;
  resistances: string;
  immunities: string;
  conditionImmunities: string;
  senses: string;
  languages: string;
  cr: string;
  xp: string;
  proficiencyBonus: string;
  abilities: Record<MonsterAbilityKey, MonsterAbility>;
  traits: MonsterEntry[];
  actions: MonsterEntry[];
  bonusActions: MonsterEntry[];
  reactions: MonsterEntry[];
}
