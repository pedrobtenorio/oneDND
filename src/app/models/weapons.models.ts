export type WeaponProperty = {
  id: string;
  name: string;
  description: string;
};

export type WeaponEntry = {
  id: string;
  name: string;
  damage: string;
  properties: string;
  mastery: string;
  weight: string;
  cost: string;
};

export type WeaponCategory = {
  name: string;
  weapons: WeaponEntry[];
};

export type WeaponsData = {
  properties: WeaponProperty[];
  masteryProperties: WeaponProperty[];
  categories: WeaponCategory[];
};
