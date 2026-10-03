import { AbilityId, CharacterFeature, CharacterOption, CharacterProfile, TurnCatalog, TurnClassId } from '../models/turn-planner.models';
import { classLevel, totalLevel } from './turn-engine/turn-profile';

export const CLASS_NAMES: Record<TurnClassId, string> = {
  barbaro: 'Bárbaro', bardo: 'Bardo', bruxo: 'Bruxo', clerigo: 'Clérigo', druida: 'Druida',
  feiticeiro: 'Feiticeiro', guardiao: 'Guardião', guerreiro: 'Guerreiro', ladino: 'Ladino',
  mago: 'Mago', monge: 'Monge', paladino: 'Paladino',
};
export const ABILITY_NAMES: Record<AbilityId, string> = {
  strength: 'Força', dexterity: 'Destreza', constitution: 'Constituição', intelligence: 'Inteligência', wisdom: 'Sabedoria', charisma: 'Carisma',
};
export function acquiredFeatures(profile: CharacterProfile, catalog: TurnCatalog): CharacterFeature[] {
  return (catalog.features ?? []).filter(f =>
    (!f.classId || classLevel(profile, f.classId) >= f.minLevel) &&
    (!f.subclassId || profile.subclassIds.includes(f.subclassId)) &&
    (!f.speciesId || (profile.speciesId === f.speciesId && totalLevel(profile) >= f.minLevel))
  );
}
export function requirementLabels(option: CharacterOption): string[] {
  const training = { spellcasting: 'Conjuração ou Magia de Pacto', 'martial-weapon-training': 'Treinamento com armas marciais', 'light-armor-training': 'Treinamento com armadura leve', 'medium-armor-training': 'Treinamento com armadura média', 'heavy-armor-training': 'Treinamento com armadura pesada', 'shield-training': 'Treinamento com escudo' };
  return (option.requirements ?? []).flatMap(r => [
    ...(r.minTotalLevel ? [`Nível total ${r.minTotalLevel}`] : []),
    ...(r.classId ? [`${CLASS_NAMES[r.classId]} · nível ${r.minClassLevel ?? 1}`] : []),
    ...(r.ability ? [`${ABILITY_NAMES[r.ability]} ${r.abilityMin ?? 13}`] : []),
    ...(r.anyAbility ? [`${r.anyAbility.map(id => ABILITY_NAMES[id]).join(' ou ')} ${r.abilityMin ?? 13}`] : []),
    ...(r.feature ? [training[r.feature]] : []),
  ]);
}
export function backgroundSkills(option?: CharacterOption): string[] {
  const text = option?.description || option?.summary || '';
  const match = text.match(/Proficiências? em Perícias:\s*(.*?)\s*Proficiência com Ferramentas:/);
  return match ? match[1].split(',').map(s => s.trim()).filter(Boolean) : [];
}
