import { CharacterProfile, TurnClassId } from '../models/turn-planner.models';

/** PHB 2024, pp. 44–45 and the individual class progression tables. */
export const MAX_CHARACTER_LEVEL = 8;
export const FULL_SLOTS = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2]];
export const HALF_SLOTS = [[], [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3]];
export const THIRD_SLOTS = [[], [], [], [2], [3], [3], [3], [4, 2], [4, 2]];
export const FULL_CASTERS: TurnClassId[] = ['bardo', 'clerigo', 'druida', 'feiticeiro', 'mago'];
export const HALF_CASTERS: TurnClassId[] = ['guardiao', 'paladino'];
export const SPELL_CLASS_NAMES: Partial<Record<TurnClassId, string>> = {
  bardo: 'Bardo', bruxo: 'Bruxo', clerigo: 'Clérigo', druida: 'Druida', feiticeiro: 'Feiticeiro',
  guardiao: 'Guardião', mago: 'Mago', paladino: 'Paladino', guerreiro: 'Mago', ladino: 'Mago',
};
export const levelOf = (p: CharacterProfile, id: TurnClassId): number => p.classes.find(c => c.classId === id)?.level ?? 0;
export const isThirdCaster = (p: CharacterProfile, id: TurnClassId): boolean =>
  (id === 'guerreiro' && p.subclassIds.includes('cavaleiro-mistico')) ||
  (id === 'ladino' && p.subclassIds.includes('trapaceiro-arcano'));
export function preparedLimit(id: TurnClassId, level: number, third = false): number {
  if (third) return [0, 0, 0, 3, 4, 4, 4, 5, 6][level] ?? 0;
  if (HALF_CASTERS.includes(id)) return [0, 2, 3, 4, 5, 6, 6, 7, 7][level] ?? 0;
  if (id === 'bruxo') return [0, 2, 3, 4, 5, 6, 7, 8, 9][level] ?? 0;
  if (id === 'feiticeiro') return [0, 2, 4, 6, 7, 9, 10, 11, 12][level] ?? 0;
  return FULL_CASTERS.includes(id) ? [0, 4, 5, 6, 7, 9, 10, 11, 12][level] ?? 0 : 0;
}
export function cantripLimit(id: TurnClassId, level: number, third = false): number {
  if (!level) return 0;
  if (third) return 2; // Arcane Trickster also receives Mage Hand automatically.
  if (id === 'feiticeiro') return level >= 4 ? 5 : 4;
  if (id === 'mago' || id === 'clerigo') return level >= 4 ? 4 : 3;
  if (['bardo', 'bruxo', 'druida'].includes(id)) return level >= 4 ? 3 : 2;
  return 0;
}
export function maxSpellCircle(id: TurnClassId, level: number, third = false): number {
  if (third) return THIRD_SLOTS[level]?.length ?? 0;
  if (HALF_CASTERS.includes(id)) return HALF_SLOTS[level]?.length ?? 0;
  return FULL_CASTERS.includes(id) || id === 'bruxo' ? Math.ceil(level / 2) : 0;
}
export function spellSlots(p: CharacterProfile): number[] {
  const casters = p.classes.filter(c => FULL_CASTERS.includes(c.classId) || HALF_CASTERS.includes(c.classId) || isThirdCaster(p, c.classId));
  if (casters.length === 1) {
    const c = casters[0];
    return (isThirdCaster(p, c.classId) ? THIRD_SLOTS : HALF_CASTERS.includes(c.classId) ? HALF_SLOTS : FULL_SLOTS)[c.level] ?? [];
  }
  const level = casters.reduce((n, c) => n + (HALF_CASTERS.includes(c.classId) ? Math.ceil(c.level / 2) : isThirdCaster(p, c.classId) ? Math.floor(c.level / 3) : c.level), 0);
  return FULL_SLOTS[level] ?? [];
}
export const featLevels = (id: TurnClassId, level: number): number[] =>
  (id === 'guerreiro' ? [4, 6, 8] : [4, 8]).filter(n => n <= level);
export const invocationLimit = (level: number): number => [0, 1, 3, 3, 3, 5, 5, 6, 6][level] ?? 0;

export function movementSpeed(p: CharacterProfile, base: number): number {
  let speed = base;
  if (p.speciesChoiceId === 'elfo-silvestre') speed += 1.5;
  if (p.armor !== 'heavy' && levelOf(p, 'barbaro') >= 5) speed += 3;
  if (p.armor !== 'heavy' && levelOf(p, 'guardiao') >= 6) speed += 3;
  if (p.armor === 'none' && !p.hasShield && levelOf(p, 'monge') >= 2) speed += levelOf(p, 'monge') >= 6 ? 4.5 : 3;
  if (p.featIds.includes('veloz')) speed += 3;
  if (p.subclassIds.includes('juramento-da-gloria') && levelOf(p, 'paladino') >= 7) speed += 3;
  return speed;
}
