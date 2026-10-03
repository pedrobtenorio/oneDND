import { CharacterProfile, TurnClassId } from '../models/turn-planner.models';
import { findPortrait, portraitPath } from './portrait-catalog';

/** Illustrative class artwork; it does not define a character's species or appearance. */
export const CLASS_VISUALS: Record<TurnClassId, { image: string; role: string; color: string }> = {
  barbaro: { image: 'humans-bandit', role: 'Fúria · força · resistência', color: '#854735' },
  bardo: { image: 'humans-fencer', role: 'Inspiração · magia · expressão', color: '#725582' },
  bruxo: { image: 'humans-dark-adept', role: 'Pacto · invocações · mistério', color: '#556a76' },
  clerigo: { image: 'humans-mage-white+female', role: 'Fé · cura · poder divino', color: '#aa8650' },
  druida: { image: 'elves-druid', role: 'Natureza · transformação · magia', color: '#547a55' },
  feiticeiro: { image: 'elves-sorceress', role: 'Magia inata · metamagia', color: '#925769' },
  guardiao: { image: 'humans-huntsman', role: 'Exploração · caça · natureza', color: '#637445' },
  guerreiro: { image: 'humans-swordsman', role: 'Armas · técnica · versatilidade', color: '#687585' },
  ladino: { image: 'humans-thief+female', role: 'Precisão · furtividade · perícia', color: '#7e6364' },
  mago: { image: 'humans-mage', role: 'Estudo · grimório · magia', color: '#516a93' },
  monge: { image: 'humans-footpad', role: 'Disciplina · agilidade · foco', color: '#93764a' },
  paladino: { image: 'humans-paladin', role: 'Juramento · proteção · combate', color: '#9c874e' },
};

export const classArt = (id: TurnClassId): string => `/assets/art/${CLASS_VISUALS[id].image}.webp`;
export const profileArt = (profile: CharacterProfile): string => {
  const portrait = findPortrait(profile.portraitId);
  return portrait ? portraitPath(portrait.id) : classArt([...profile.classes].sort((a, b) => a.order - b.order)[0]?.classId ?? 'guerreiro');
};
