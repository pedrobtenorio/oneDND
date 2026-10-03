import { TurnClassId } from '../models/turn-planner.models';
import { PAPERMAGE_PORTRAITS } from './papermage-portraits';
import { PRINTABLEHEROES_PORTRAITS } from './printableheroes-portraits';

export type PortraitAppearance = 'masculina' | 'feminina';
export interface CharacterPortrait {
  id: string;
  name: string;
  file?: string;
  origin: 'humano' | 'elfo' | 'anao' | 'orc' | 'gnomo' | 'draconato' | 'tiefling' | 'aasimar' | 'halfling' | 'golias';
  appearance: PortraitAppearance;
  styles: TurnClassId[];
}

export const PORTRAIT_CLASS_LABELS: Record<TurnClassId, string> = {
  barbaro: 'Bárbaro', bardo: 'Bardo', bruxo: 'Bruxo', clerigo: 'Clérigo', druida: 'Druida',
  feiticeiro: 'Feiticeiro', guardiao: 'Guardião', guerreiro: 'Guerreiro', ladino: 'Ladino',
  mago: 'Mago', monge: 'Monge', paladino: 'Paladino',
};
export const PORTRAIT_ORIGIN_LABELS = { humano: 'Humano', elfo: 'Elfo', anao: 'Anão', orc: 'Orc', gnomo:'Gnomo', draconato:'Draconato', tiefling:'Tiferino', aasimar:'Aasimar', halfling:'Pequenino', golias:'Golias' };

// Styles are visual suggestions, not restrictions on character rules or species.
// Source files and licenses: /assets/art/copyrights.csv and /assets/art/credits.html.
export const CHARACTER_PORTRAITS: CharacterPortrait[] = [
  ...PAPERMAGE_PORTRAITS,
  ...PRINTABLEHEROES_PORTRAITS,
  { id:'humans-bandit', name:'Combatente humano', origin:'humano', appearance:'masculina', styles:['barbaro','guerreiro'] },
  { id:'humans-fencer', name:'Espadachim humano', origin:'humano', appearance:'masculina', styles:['bardo','guerreiro','ladino'] },
  { id:'humans-dark-adept', name:'Ocultista humano', origin:'humano', appearance:'masculina', styles:['bruxo','feiticeiro','mago'] },
  { id:'humans-dark-adept+female', name:'Ocultista humana', origin:'humano', appearance:'feminina', styles:['bruxo','feiticeiro','mago'] },
  { id:'humans-mage-white', name:'Devoto humano', origin:'humano', appearance:'masculina', styles:['clerigo','paladino'] },
  { id:'humans-mage-white+female', name:'Devota humana', origin:'humano', appearance:'feminina', styles:['clerigo','paladino'] },
  { id:'elves-druid', name:'Druida elfa', origin:'elfo', appearance:'feminina', styles:['druida','clerigo'] },
  { id:'elves-sorceress', name:'Feiticeira elfa', origin:'elfo', appearance:'feminina', styles:['feiticeiro','bruxo','mago'] },
  { id:'humans-huntsman', name:'Caçador humano', origin:'humano', appearance:'masculina', styles:['guardiao','ladino'] },
  { id:'humans-swordsman', name:'Guerreiro humano', origin:'humano', appearance:'masculina', styles:['guerreiro','paladino'] },
  { id:'humans-thief', name:'Ladino humano', origin:'humano', appearance:'masculina', styles:['ladino','bardo'] },
  { id:'humans-thief+female', name:'Ladina humana', origin:'humano', appearance:'feminina', styles:['ladino','bardo'] },
  { id:'humans-mage', name:'Mago humano', origin:'humano', appearance:'masculina', styles:['mago','feiticeiro'] },
  { id:'humans-mage+female', name:'Maga humana', origin:'humano', appearance:'feminina', styles:['mago','feiticeiro'] },
  { id:'humans-mage-red', name:'Arcanista humano', origin:'humano', appearance:'masculina', styles:['mago','feiticeiro','bruxo'] },
  { id:'humans-mage-red+female', name:'Arcanista humana', origin:'humano', appearance:'feminina', styles:['mago','feiticeiro','bruxo'] },
  { id:'humans-footpad', name:'Andarilho humano', origin:'humano', appearance:'masculina', styles:['monge','ladino','guardiao'] },
  { id:'humans-footpad+female', name:'Andarilha humana', origin:'humano', appearance:'feminina', styles:['monge','ladino','guardiao'] },
  { id:'humans-paladin', name:'Cavaleiro humano', origin:'humano', appearance:'masculina', styles:['paladino','guerreiro'] },
  { id:'humans-assassin', name:'Assassino humano', origin:'humano', appearance:'masculina', styles:['ladino','guardiao'] },
  { id:'humans-assassin+female', name:'Assassina humana', origin:'humano', appearance:'feminina', styles:['ladino','guardiao'] },
  { id:'humans-outlaw+female', name:'Aventureira humana', origin:'humano', appearance:'feminina', styles:['barbaro','monge','guerreiro','ladino'] },
  { id:'elves-ranger', name:'Batedor elfo', origin:'elfo', appearance:'masculina', styles:['guardiao','ladino'] },
  { id:'elves-ranger+female', name:'Batedora elfa', origin:'elfo', appearance:'feminina', styles:['guardiao','ladino'] },
  { id:'elves-archer+female', name:'Arqueira elfa', origin:'elfo', appearance:'feminina', styles:['guardiao','guerreiro'] },
  { id:'elves-lord', name:'Nobre elfo', origin:'elfo', appearance:'masculina', styles:['bardo','feiticeiro','guerreiro'] },
  { id:'elves-lady', name:'Nobre elfa', origin:'elfo', appearance:'feminina', styles:['bardo','druida','feiticeiro'] },
  { id:'elves-fighter', name:'Guerreiro elfo', origin:'elfo', appearance:'masculina', styles:['guerreiro','paladino'] },
  { id:'dwarves-fighter', name:'Guerreiro anão', origin:'anao', appearance:'masculina', styles:['guerreiro','paladino'] },
  { id:'dwarves-ulfserker', name:'Berserker anão', origin:'anao', appearance:'masculina', styles:['barbaro','monge'] },
  { id:'dwarves-runemaster', name:'Mestre de runas anão', origin:'anao', appearance:'masculina', styles:['mago','clerigo','bruxo'] },
  { id:'orcs-grunt', name:'Combatente orc', origin:'orc', appearance:'masculina', styles:['barbaro','guerreiro'] },
  { id:'dunefolk-herbalist', name:'Herbalista humano', origin:'humano', appearance:'masculina', styles:['druida','clerigo','monge'] },
  { id:'Heir_To_The_Throne-lisar', name:'Cavaleira humana', origin:'humano', appearance:'feminina', styles:['guerreiro','paladino'] },
  { id:'Liberty-relana', name:'Combatente veterana', origin:'humano', appearance:'feminina', styles:['barbaro','guerreiro','guardiao'] },
].sort((a,b) => a.name.localeCompare(b.name,'pt-BR')) as CharacterPortrait[];

export const findPortrait = (id?: string): CharacterPortrait | undefined => CHARACTER_PORTRAITS.find(p => p.id === id);
export const portraitCollection = (id: string): string => id.startsWith('printableheroes-') ? 'printableheroes' : id.startsWith('papermage-') ? 'papermage' : 'wesnoth';
export const portraitPath = (id: string): string => `/assets/art/${findPortrait(id)?.file ?? id + '.webp'}`;
