export interface SummonAttribute {
  value: number;
  mod: string;
  save?: string;
}

export interface SummonEntry {
  name: string;
  description: string;
}

export interface Summon {
  id: string;
  name: string;
  type: string;
  ac: string;
  hp: string;
  speed: string;
  str: SummonAttribute;
  dex: SummonAttribute;
  con: SummonAttribute;
  int: SummonAttribute;
  wis: SummonAttribute;
  cha: SummonAttribute;
  resistances?: string[];
  immunities?: string[];
  conditionImmunities?: string[];
  senses: string;
  languages: string;
  cr: string;
  traits?: SummonEntry[];
  actions?: SummonEntry[];
  bonusActions?: SummonEntry[];
  reactions?: SummonEntry[];
}
