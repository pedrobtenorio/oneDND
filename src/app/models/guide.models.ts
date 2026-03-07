export interface GuideItem {
  id: string;
  name: string;
  description: string;
  subtitle?: string;
  armorClass?: string;
  hitPoints?: string;
  speed?: string;
  stats?: Array<{
    label: string;
    score: number;
    mod: string;
    save: string;
  }>;
  immunities?: string;
  senses?: string;
  languages?: string;
  challenge?: string;
  traits?: string;
  actions?: string;
  acoes?: Array<{
    nome: string;
    tipo_ataque?: string;
    bonus_acerto?: number | string;
    alcance?: {
      normal_m?: number;
      maximo_m?: number;
    };
    alcance_m?: number;
    dano?: {
      medio?: number;
      formula?: string;
      tipo?: string;
    };
  }>;
}

export interface GuideCategory {
  id: string;
  title: string;
  items: GuideItem[];
}
