import { GuideCategory, GuideItem } from '../models/guide.models';
import { Spell } from '../models/spell.models';
import { Summon, SummonAttribute } from '../models/summon.models';
import { WeaponEntry, WeaponProperty, WeaponsData } from '../models/weapons.models';
import { TurnRuleFile, TurnRuleManifest } from '../models/turn-planner.models';

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
  isRecord(value) && hasStringFields(value, ['id', 'name', 'description']);

const isWeaponEntry = (value: unknown): value is WeaponEntry =>
  isRecord(value) && hasStringFields(value, ['id', 'name', 'damage', 'properties', 'mastery', 'weight', 'cost']);

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

  const data = {
    properties: assertArray(value['properties'], 'weapon properties', isWeaponProperty),
    masteryProperties: assertArray(value['masteryProperties'], 'weapon mastery properties', isWeaponProperty),
    categories: assertArray(value['categories'], 'weapon categories', (category): category is WeaponsData['categories'][number] =>
      isRecord(category) &&
      isString(category['name']) &&
      Array.isArray(category['weapons']) &&
      category['weapons'].every(isWeaponEntry)
    ),
  };
  const ids = [
    ...data.properties.map((item) => item.id),
    ...data.masteryProperties.map((item) => item.id),
    ...data.categories.flatMap((category) => category.weapons.map((item) => item.id)),
  ];
  if (new Set(ids).size !== ids.length) throw new Error('weapon ids must be unique.');
  return data;
};

const conditionTypes = new Set([
  'class-level', 'subclass', 'species', 'species-choice', 'feat', 'maneuver', 'mastery',
  'spell-prepared', 'fact', 'any-fact', 'phase', 'resource', 'marker',
  'bonus-action-available', 'reaction-available', 'action-available', 'attacks-remaining',
  'has-not-moved', 'trigger', 'not-concentrating', 'not-raging', 'spell-slot-unused',
  'spell-slot-available', 'armor-not-heavy',
]);
const costTypes = new Set(['action', 'bonus-action', 'reaction', 'resource', 'spell-slot', 'sneak-die']);
const effectTypes = new Set([
  'marker', 'movement-zero', 'movement-gain', 'grant-action', 'begin-attack-action',
  'grant-attack', 'consume-attack', 'perform-attack', 'start-concentration', 'end-concentration',
  'set-phase', 'resource',
]);
const optionKinds = new Set([
  'species', 'species-choice', 'subclass', 'subclass-choice', 'feat-origin', 'feat-general', 'fighting-style', 'maneuver',
]);

const isRuleSource = (value: unknown): boolean =>
  isRecord(value) &&
  hasStringFields(value, ['book', 'revision']) &&
  isNumber(value['page']);

const isTurnRule = (value: unknown): boolean =>
  isRecord(value) &&
  hasStringFields(value, ['id', 'name', 'summary', 'origin', 'originId', 'activation', 'category', 'support']) &&
  ['core', 'class', 'subclass', 'species', 'feat', 'spell', 'weapon'].includes(value['origin'] as string) &&
  ['action', 'bonus-action', 'reaction', 'free', 'trigger'].includes(value['activation'] as string) &&
  ['action', 'bonus', 'reaction', 'movement', 'modifier', 'informational'].includes(value['category'] as string) &&
  ['structured', 'prompt', 'informational'].includes(value['support'] as string) &&
  Array.isArray(value['conditions']) && value['conditions'].every((item) => isRecord(item) && conditionTypes.has(item['type'] as string)) &&
  Array.isArray(value['costs']) && value['costs'].every((item) => isRecord(item) && costTypes.has(item['type'] as string)) &&
  Array.isArray(value['effects']) && value['effects'].every((item) => isRecord(item) && effectTypes.has(item['type'] as string)) &&
  isRuleSource(value['source']);

const isTurnOption = (value: unknown): boolean =>
  isRecord(value) &&
  hasStringFields(value, ['id', 'name', 'kind', 'summary']) &&
  optionKinds.has(value['kind'] as string) &&
  isRuleSource(value['source']);

export const validateTurnRuleManifest = (value: unknown): TurnRuleManifest => {
  if (
    !isRecord(value) ||
    value['schemaVersion'] !== 1 ||
    !hasStringFields(value, ['edition', 'revision']) ||
    !isStringArray(value['files'])
  ) {
    throw new Error('turn rule manifest is invalid.');
  }
  return value as unknown as TurnRuleManifest;
};

export const validateTurnRuleFile = (value: unknown): TurnRuleFile => {
  if (!isRecord(value)) {
    throw new Error('turn rule file must be an object.');
  }
  const options = value['options'] ?? [];
  const rules = value['rules'] ?? [];
  if (!Array.isArray(options) || !options.every(isTurnOption) || !Array.isArray(rules) || !rules.every(isTurnRule)) {
    throw new Error('turn rule file has invalid options or rules.');
  }
  return { options, rules } as TurnRuleFile;
};
