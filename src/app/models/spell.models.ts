export interface SpellTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface Spell {
  sourcePage?: number;
  id: string;
  name: string;
  level: number;
  school: string;
  classes: string[];
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
  tables?: SpellTable[];
  summonIds?: string[];
}
