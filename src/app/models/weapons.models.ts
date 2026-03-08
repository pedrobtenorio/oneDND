export type WeaponProperty = {
  name: string;
  description: string;
};

export type WeaponEntry = {
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
