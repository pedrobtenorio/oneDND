import { AbilityId, AbilityScores, CharacterOption, CharacterProfile, TurnCatalog } from '../models/turn-planner.models';
import { Spell } from '../models/spell.models';
import { cantripLimit, isThirdCaster, levelOf, maxSpellCircle, preparedLimit, SPELL_CLASS_NAMES } from './character-progression';

export const ABILITIES: AbilityId[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
export function finalAbilities(base: AbilityScores, bonuses: Partial<AbilityScores>[]): AbilityScores {
  return Object.fromEntries(ABILITIES.map(id => [id, base[id] + bonuses.reduce((sum, b) => sum + (b[id] ?? 0), 0)])) as unknown as AbilityScores;
}
export function validateBonuses(bonus: Partial<AbilityScores>, allowed: AbilityId[], points: number): string[] {
  const values = Object.entries(bonus);
  return values.some(([key, n]) => !ABILITIES.includes(key as AbilityId) || !Number.isInteger(n) || n! < 0 || n! > 2 || (n! > 0 && !allowed.includes(key as AbilityId))) || values.reduce((n, [, v]) => n + (v ?? 0), 0) !== points
    ? [`Distribua ${points} ponto(s) entre os atributos permitidos, no máximo 2 em cada um.`] : [];
}
export interface SpellSelectionGrant {
  id: string; name: string; limit: number; lists: string[]; minCircle: number; maxCircle: number;
  ritualOnly?: boolean; schools?: string[];
  purpose?: 'spellbook';
}
export function spellSelectionGrants(p: CharacterProfile): SpellSelectionGrant[] {
  const grants: SpellSelectionGrant[] = [];
  const add = (id: string, name: string, limit: number, lists: string[], minCircle: number, maxCircle: number, extra: Partial<SpellSelectionGrant> = {}) => {
    if (limit) grants.push({ id, name, limit, lists, minCircle, maxCircle, ...extra });
  };
  const wizard = levelOf(p,'mago');
  for (let level=1;level<=wizard;level++) add(`book.mago.${level}`, `Livro de magias · nível ${level}`,level === 1 ? 6 : 2,['Mago'],1,Math.ceil(level/2),{purpose:'spellbook'});
  const school = p.subclassIds.includes('abjurador') ? 'Abjuração' : p.subclassIds.includes('adivinhador') ? 'Adivinhação' : p.subclassIds.includes('evocador') ? 'Evocação' : p.subclassIds.includes('ilusionista') ? 'Ilusão' : undefined;
  if (school) for (const level of [3,5,7].filter(n => n <= wizard)) add(`book.savant.${level}`,`Versado em ${school} · nível ${level}`,level === 3 ? 2 : 1,['Mago'],1,Math.ceil(level/2),{purpose:'spellbook',schools:[school]});
  for (const c of p.classes) {
    const third = isThirdCaster(p, c.classId), list = SPELL_CLASS_NAMES[c.classId];
    if (!list || (['guerreiro', 'ladino'].includes(c.classId) && !third)) continue;
    add(`class.${c.classId}`, `${list} · magias (${c.classId})`, preparedLimit(c.classId, c.level, third), [list], 1, maxSpellCircle(c.classId, c.level, third));
    add(`cantrips.${c.classId}`, `${list} · truques (${c.classId})`, cantripLimit(c.classId, c.level, third), [list], 0, 0);
  }
  for (const [id, list] of Object.entries({ 'iniciado-em-magia-clerigo': 'Clérigo', 'iniciado-em-magia-druida': 'Druida', 'iniciado-em-magia-mago': 'Mago', 'combatente-druidico': 'Druida', 'combatente-abencoado': 'Clérigo' })) {
    if (![...p.featIds, ...p.fightingStyleIds].includes(id)) continue;
    add(`cantrips.${id}`, `${id.startsWith('iniciado') ? 'Iniciado em Magia' : 'Estilo de luta'} · ${list} · truques`, 2, [list], 0, 0);
    if (id.startsWith('iniciado')) add(`feat.${id}`, `Iniciado em Magia · ${list}`, 1, [list], 1, 1);
  }
  if (p.featIds.includes('tocado-pelas-fadas')) add('feat.tocado-pelas-fadas', 'Tocado pelas Fadas', 1, [], 1, 1, { schools: ['Adivinhação', 'Encantamento'] });
  if (p.featIds.includes('tocado-pela-sombra')) add('feat.tocado-pela-sombra', 'Tocado pela Sombra', 1, [], 1, 1, { schools: ['Ilusão', 'Necromancia'] });
  if (p.featIds.includes('conjurador-ritualista')) add('feat.conjurador-ritualista', 'Conjurador Ritualista', p.classes.reduce((n, c) => n + c.level, 0) >= 5 ? 3 : 2, [], 1, 1, { ritualOnly: true });
  if (p.subclassIds.includes('colegio-do-conhecimento') && levelOf(p, 'bardo') >= 6) add('subclass.descobertas-magicas', 'Descobertas Mágicas', 2, ['Clérigo', 'Druida', 'Mago'], 0, maxSpellCircle('bardo', levelOf(p, 'bardo')));
  const choices = Object.values(p.choices ?? {}).flat();
  if (choices.includes('invocation.pacto-do-tomo')) {
    add('invocation.tome-cantrips', 'Pacto do Tomo · truques', 3, [], 0, 0);
    add('invocation.tome-rituals', 'Pacto do Tomo · rituais', 2, [], 1, 1, { ritualOnly: true });
  }
  if (choices.includes('cleric.taumaturgo')) add('choice.taumaturgo', 'Taumaturgo · truque adicional', 1, ['Clérigo'], 0, 0);
  if (choices.includes('druid.magista')) add('choice.magista', 'Magista · truque adicional', 1, ['Druida'], 0, 0);
  if (p.speciesChoiceId === 'elfo-alto') add('species.high-elf', 'Alto Elfo · truque', 1, ['Mago'], 0, 0);
  return grants;
}
export function spellFitsGrant(spell: Spell, grant: SpellSelectionGrant): boolean {
  return spell.level >= grant.minCircle && spell.level <= grant.maxCircle &&
    (!grant.lists.length || grant.lists.some(list => spell.classes.includes(list))) &&
    (!grant.schools || grant.schools.includes(spell.school)) &&
    (!grant.ritualOnly || /ritual/i.test(spell.castingTime));
}
export function automaticSpells(p: CharacterProfile, catalog: TurnCatalog): string[] {
  const choices = Object.values(p.choices ?? {}).flat();
  return [...new Set((catalog.spellGrants ?? []).filter(g => levelOf(p, g.classId) >= g.minLevel && (!g.subclassId || p.subclassIds.includes(g.subclassId)) && (!g.choiceId || choices.includes(g.choiceId))).flatMap(g => g.spellIds))];
}
export function eligibleChoice(option: CharacterOption, p: CharacterProfile): boolean {
  const choices = Object.values(p.choices ?? {}).flat();
  if (option.beastCr !== undefined) {
    const level = levelOf(p,'druida');
    const max = p.subclassIds.includes('circulo-da-lua') && level >= 3 ? Math.floor(level/3) : level >= 8 ? 1 : level >= 4 ? .5 : .25;
    if (option.beastCr > max || (option.flies && level < 8)) return false;
  }
  return (option.requiresOptionIds ?? []).every(id => choices.includes(id)) &&
    (option.requirements ?? []).every(r => !r.classId || levelOf(p, r.classId) >= (r.minClassLevel ?? 1));
}
