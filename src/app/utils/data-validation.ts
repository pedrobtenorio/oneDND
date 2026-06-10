import { GuideCategory, GuideItem } from '../models/guide.models';
import { Spell } from '../models/spell.models';
import { Summon, SummonAttribute } from '../models/summon.models';
import { WeaponEntry, WeaponProperty, WeaponsData } from '../models/weapons.models';

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isNumber = (value: unknown): value is number => typeof value === 'number';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const hasStringFields = (value: RecordValue, fields: string[]): boolean =>
  fields.every((field) => isString(value[field]));

const assertArray = <T>(
  value: unknown,
  dataName: string,
  itemGuard: (item: unknown) => item is T
): T[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${dataName} must be an array.`);
  }

  const invalidIndex = value.findIndex((item) => !itemGuard(item));
  if (invalidIndex >= 0) {
    throw new Error(`${dataName} has an invalid item at index ${invalidIndex}.`);
  }

  return value;
};

const isGuideItem = (value: unknown): value is GuideItem =>
  isRecord(value) && hasStringFields(value, ['id', 'name', 'description']);

const isGuideCategory = (value: unknown): value is GuideCategory =>
  isRecord(value) &&
  hasStringFields(value, ['id', 'title']) &&
  Array.isArray(value['items']) &&
  value['items'].every(isGuideItem);

const isSpell = (value: unknown): value is Spell =>
  isRecord(value) &&
  hasStringFields(value, ['id', 'name', 'school', 'castingTime', 'range', 'duration', 'description']) &&
  isNumber(value['level']) &&
  isStringArray(value['classes']) &&
  isStringArray(value['components']);

const isSummonAttribute = (value: unknown): value is SummonAttribute =>
  isRecord(value) && isNumber(value['value']) && isString(value['mod']);

const isSummon = (value: unknown): value is Summon =>
  isRecord(value) &&
  hasStringFields(value, ['id', 'name', 'type', 'ac', 'hp', 'speed', 'senses', 'languages', 'cr']) &&
  isSummonAttribute(value['str']) &&
  isSummonAttribute(value['dex']) &&
  isSummonAttribute(value['con']) &&
  isSummonAttribute(value['int']) &&
  isSummonAttribute(value['wis']) &&
  isSummonAttribute(value['cha']);

const isWeaponProperty = (value: unknown): value is WeaponProperty =>
  isRecord(value) && hasStringFields(value, ['name', 'description']);

const isWeaponEntry = (value: unknown): value is WeaponEntry =>
  isRecord(value) && hasStringFields(value, ['name', 'damage', 'properties', 'mastery', 'weight', 'cost']);

export const validateGuideData = (value: unknown): GuideCategory[] =>
  assertArray(value, 'guide data', isGuideCategory);

export const validateSpellData = (value: unknown): Spell[] =>
  assertArray(value, 'spell data', isSpell);

export const validateSummonData = (value: unknown): Summon[] =>
  assertArray(value, 'summon data', isSummon);

export const validateWeaponsData = (value: unknown): WeaponsData => {
  if (!isRecord(value)) {
    throw new Error('weapons data must be an object.');
  }

  return {
    properties: assertArray(value['properties'], 'weapon properties', isWeaponProperty),
    masteryProperties: assertArray(value['masteryProperties'], 'weapon mastery properties', isWeaponProperty),
    categories: assertArray(value['categories'], 'weapon categories', (category): category is WeaponsData['categories'][number] =>
      isRecord(category) &&
      isString(category['name']) &&
      Array.isArray(category['weapons']) &&
      category['weapons'].every(isWeaponEntry)
    ),
  };
};
