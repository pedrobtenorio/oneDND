import { Spell } from '../models/spell.models';
import {
  AbilityScores,
  CharacterProfile,
  FeatSelection,
  TurnCatalog,
  TurnClassId,
} from '../models/turn-planner.models';
import { automaticSpells, finalAbilities, spellFitsGrant, spellSelectionGrants } from '../utils/character-choices';
import { movementSpeed } from '../utils/character-progression';

export interface CharacterExample {
  profile: CharacterProfile;
  role: string;
  description: string;
}

interface ExampleDefinition {
  id: string;
  name: string;
  portraitId: string;
  role: string;
  description: string;
  speciesId: string;
  speciesChoiceId?: string;
  classId: TurnClassId;
  subclassId: string;
  backgroundId: string;
  baseAbilities: AbilityScores;
  backgroundBonuses: Partial<AbilityScores>;
  featSelections: FeatSelection[];
  extraFeatIds?: string[];
  choices?: Record<string, string[]>;
  fightingStyleIds?: string[];
  weapons: string[];
  masteries?: string[];
  armor: CharacterProfile['armor'];
  hasShield: boolean;
  baseSpeed?: number;
  preferredSpells?: string[];
}

const DEFINITIONS: ExampleDefinition[] = [
  {
    id: 'example-rodrigo', name: 'Rodrigo', role: 'Defensor e comandante de linha de frente',
    portraitId: 'printableheroes-mini-1159-0-0-standee-1-image-1',
    description: 'Guerreiro Campeão disciplinado, protege aliados com escudo e controla o campo de batalha.',
    speciesId: 'humano', classId: 'guerreiro', subclassId: 'campeao', backgroundId: 'background.guarda',
    baseAbilities: scores(15, 12, 14, 8, 13, 10), backgroundBonuses: { strength: 2, intelligence: 1 },
    featSelections: [feat('species.humano', 'vigoroso'), feat('class.guerreiro.4', 'mestre-de-escudo', 'strength'), feat('class.guerreiro.6', 'sentinela', 'strength'), feat('class.guerreiro.8', 'resiliente', 'constitution')],
    fightingStyleIds: ['estilo-defesa', 'estilo-protecao'],
    weapons: ['weapon-espada-longa', 'weapon-martelo-de-guerra', 'weapon-azagaia', 'weapon-besta-leve'],
    masteries: ['weapon-espada-longa', 'weapon-martelo-de-guerra', 'weapon-azagaia', 'weapon-besta-leve'],
    armor: 'heavy', hasShield: true,
  },
  {
    id: 'example-lia', name: 'Lia', role: 'Batedora, infiltradora e especialista',
    portraitId: 'printableheroes-mini-974-0-0-standee-2-image-2',
    description: 'Ladina Ladrã ágil, combina reconhecimento, precisão à distância e perícias de exploração.',
    speciesId: 'halfling', classId: 'ladino', subclassId: 'ladrao', backgroundId: 'background.escriba',
    baseAbilities: scores(8, 15, 14, 13, 12, 10), backgroundBonuses: { dexterity: 2, wisdom: 1 },
    featSelections: [feat('class.ladino.4', 'atleta', 'dexterity'), feat('class.ladino.8', 'especialista-em-pericia', 'dexterity')],
    choices: { 'rogue-expertise': ['rogue-expertise.furtividade', 'rogue-expertise.percepcao', 'rogue-expertise.investigacao', 'rogue-expertise.prestidigitacao'] },
    weapons: ['weapon-arco-curto', 'weapon-adaga', 'weapon-espada-curta'], masteries: ['weapon-arco-curto', 'weapon-adaga'],
    armor: 'light', hasShield: false,
  },
  {
    id: 'example-ines', name: 'Inês', role: 'Curandeira e sustentação do grupo',
    portraitId: 'printableheroes-mini-160-0-0-standee-1-image-1',
    description: 'Clériga da Vida resistente, mantém o grupo de pé e ocupa a linha de frente quando necessário.',
    speciesId: 'anao', classId: 'clerigo', subclassId: 'dominio-da-vida', backgroundId: 'background.eremita',
    baseAbilities: scores(8, 14, 13, 10, 15, 12), backgroundBonuses: { wisdom: 2, constitution: 1 },
    featSelections: [feat('class.clerigo.4', 'conjurador-de-guerra', 'wisdom'), feat('class.clerigo.8', 'resiliente', 'constitution')],
    choices: { 'cleric-order': ['cleric.taumaturgo'], 'blessed-strikes': ['cleric.conjuracao-poderosa'] },
    weapons: ['weapon-maca', 'weapon-besta-leve'], armor: 'medium', hasShield: true,
    preferredSpells: ['orientacao', 'chama-sagrada', 'palavra-curativa', 'santuario', 'auxilio', 'arma-espiritual', 'revivificar', 'guardioes-espirituais', 'banimento'],
  },
  {
    id: 'example-nuno', name: 'Nuno', role: 'Arcanista de campo e especialista em evocação',
    portraitId: 'printableheroes-mini-127-0-0-gnome-alchemist-0101',
    description: 'Mago Evocador estudioso, usa controle e dano em área sem perder o foco na investigação.',
    speciesId: 'gnomo', speciesChoiceId: 'gnomo-das-rochas', classId: 'mago', subclassId: 'evocador', backgroundId: 'background.escriba',
    baseAbilities: scores(8, 13, 14, 15, 12, 10), backgroundBonuses: { intelligence: 2, dexterity: 1 },
    featSelections: [feat('class.mago.4', 'mente-afiada', 'intelligence'), feat('class.mago.8', 'conjurador-de-guerra', 'intelligence')],
    choices: { 'wizard-scholar': ['wizard-scholar.arcanismo'] }, weapons: ['weapon-cajado', 'weapon-adaga'], armor: 'none', hasShield: false,
    preferredSpells: ['raio-de-fogo', 'luz', 'escudo-arcano', 'misil-magico', 'onda-trovejante', 'teia', 'passo-nebuloso', 'bola-de-fogo', 'contramagica', 'muralha-de-fogo'],
  },
  {
    id: 'example-dinis', name: 'Dinis', role: 'Porta-voz, apoio e conhecedor versátil',
    portraitId: 'printableheroes-mini-204-0-0-swashbuckler-101',
    description: 'Bardo do Conhecimento carismático, abre caminhos sociais e oferece soluções para quase qualquer desafio.',
    speciesId: 'humano', classId: 'bardo', subclassId: 'colegio-do-conhecimento', backgroundId: 'background.charlatao',
    baseAbilities: scores(8, 14, 13, 10, 12, 15), backgroundBonuses: { charisma: 2, constitution: 1 },
    featSelections: [feat('species.humano', 'alerta'), feat('class.bardo.4', 'lider-inspirador', 'charisma'), feat('class.bardo.8', 'ator', 'charisma')],
    choices: {
      'lore-skills': ['lore-skills.arcanismo', 'lore-skills.historia', 'lore-skills.persuasao'],
      'bard-expertise': ['bard-expertise.enganacao', 'bard-expertise.persuasao'],
    },
    weapons: ['weapon-rapieira', 'weapon-adaga', 'weapon-besta-leve'], armor: 'light', hasShield: false,
    preferredSpells: ['zombaria-viciosa', 'luzes-dancantes', 'palavra-curativa', 'sussurros-dissonantes', 'fogo-das-fadas', 'invisibilidade', 'padrao-hipnotico', 'polimorfia'],
  },
  {
    id: 'example-raul', name: 'Raul', role: 'Resgate, choque e resistência',
    portraitId: 'printableheroes-mini-6-0-0-goliath_barbarian_0101',
    description: 'Bárbaro Berserker de ancestralidade pétrea, abre passagem e absorve a pressão sobre os aliados.',
    speciesId: 'golias', speciesChoiceId: 'golias-pedra', classId: 'barbaro', subclassId: 'berserker', backgroundId: 'background.fazendeiro',
    baseAbilities: scores(15, 14, 13, 8, 12, 10), backgroundBonuses: { strength: 2, constitution: 1 },
    featSelections: [feat('class.barbaro.4', 'mestre-em-armas-grandes', 'strength'), feat('class.barbaro.8', 'duravel', 'constitution')],
    choices: { 'barbarian-knowledge': ['barbarian-knowledge.sobrevivencia'] },
    weapons: ['weapon-malho', 'weapon-machadinha', 'weapon-azagaia'], masteries: ['weapon-malho', 'weapon-machadinha', 'weapon-azagaia'],
    armor: 'medium', hasShield: false, baseSpeed: 10.5,
  },
  {
    id: 'example-altair', name: 'Altair', role: 'Capitão protetor e rastreador tático',
    portraitId: 'printableheroes-mini-587-0-0-01',
    description: 'Guardião Caçador e capitão dos Sentinelas, protege sua patrulha e persegue ameaças com precisão.',
    speciesId: 'humano', classId: 'guardiao', subclassId: 'cacador', backgroundId: 'background.guarda',
    baseAbilities: scores(12, 15, 14, 8, 14, 13), backgroundBonuses: { strength: 1, wisdom: 2 },
    featSelections: [feat('species.humano', 'vigoroso'), feat('class.guardiao.4', 'mestre-de-escudo', 'dexterity'), feat('class.guardiao.8', 'lider-inspirador', 'charisma')],
    extraFeatIds: ['cacador-assassino-de-colossos'],
    choices: { 'ranger-expertise': ['ranger-expertise.percepcao'], 'hunter-defense': ['hunter.multiattack'] },
    fightingStyleIds: ['estilo-defesa'], weapons: ['weapon-rapieira', 'weapon-arco-longo', 'weapon-azagaia'],
    masteries: ['weapon-rapieira', 'weapon-arco-longo'], armor: 'medium', hasShield: true,
    preferredSpells: ['marca-do-predador', 'curar-ferimentos', 'bom-fruto', 'passos-sem-pegadas', 'silencio', 'conjurar-animais'],
  },
];

const EXAMPLE_SKILLS: Record<string, Record<string,string[]>> = {
  'example-rodrigo': {'class.guerreiro':['intimidacao','intuicao'],'species.humano':['persuasao']},
  'example-lia': {'class.ladino':['furtividade','prestidigitacao','acrobacia','atletismo'],'feat.background':['intuicao','enganacao','historia'],'feat.class.ladino.8.proficiency':['persuasao'],'feat.class.ladino.8.expertise':['acrobacia']},
  'example-ines': {'class.clerigo':['intuicao','persuasao']},
  'example-nuno': {'class.mago':['arcanismo','historia'],'feat.background':['natureza','religiao','medicina'],'feat.class.mago.4':['natureza']},
  'example-dinis': {'class.bardo':['atuacao','intuicao','percepcao'],'species.humano':['investigacao'],'feat.background':['furtividade','medicina','natureza']},
  'example-raul': {'class.barbaro':['atletismo','intimidacao']},
  'example-altair': {'class.guardiao':['furtividade','intuicao','sobrevivencia'],'species.humano':['persuasao']},
};

const MASTERY_BY_WEAPON: Record<string, string> = {
  'weapon-adaga': 'mastery-agil',
  'weapon-arco-curto': 'mastery-afligir',
  'weapon-arco-longo': 'mastery-lentidao',
  'weapon-azagaia': 'mastery-lentidao',
  'weapon-besta-leve': 'mastery-lentidao',
  'weapon-espada-longa': 'mastery-drenar',
  'weapon-machadinha': 'mastery-afligir',
  'weapon-malho': 'mastery-derrubar',
  'weapon-martelo-de-guerra': 'mastery-empurrar',
  'weapon-rapieira': 'mastery-afligir',
};

export function buildCharacterExamples(catalog: TurnCatalog, spells: Spell[]): CharacterExample[] {
  return DEFINITIONS.map(definition => {
    const grantedFeat = catalog.options.find(option => option.id === definition.backgroundId)?.grantedFeatId;
    const featIds = [...new Set([...(grantedFeat ? [grantedFeat] : []), ...definition.featSelections.map(item => item.optionId), ...(definition.extraFeatIds ?? [])])];
    const speed = definition.baseSpeed ?? 9;
    const profile: CharacterProfile = {
      id: definition.id,
      name: definition.name,
      portraitId: definition.portraitId,
      abilityMode: 'base',
      baseAbilities: { ...definition.baseAbilities },
      backgroundId: definition.backgroundId,
      backgroundBonuses: { ...definition.backgroundBonuses },
      featSelections: definition.featSelections.map(item => ({ ...item, bonuses: { ...item.bonuses } })),
      choices: structuredClone(definition.choices ?? {}),
      skillSelections: structuredClone(EXAMPLE_SKILLS[definition.id] ?? {}),
      spellSelections: {},
      speciesId: definition.speciesId,
      speciesChoiceId: definition.speciesChoiceId,
      classes: [{ classId: definition.classId, level: 8, order: 0 }],
      abilities: finalAbilities(definition.baseAbilities, [definition.backgroundBonuses, ...definition.featSelections.map(item => item.bonuses)]),
      subclassIds: [definition.subclassId],
      featIds,
      fightingStyleIds: [...(definition.fightingStyleIds ?? [])],
      maneuverIds: [],
      preparedSpellIds: [],
      cantripIds: [],
      magicInitiateSpellIds: [],
      freeSpellIds: [],
      weaponIds: [...definition.weapons],
      masteryWeaponIds: [...(definition.masteries ?? [])],
      masteryIds: [...new Set((definition.masteries ?? []).map(id => MASTERY_BY_WEAPON[id]).filter(Boolean))],
      armor: definition.armor,
      hasShield: definition.hasShield,
      baseSpeed: speed,
      speed,
      updatedAt: '2026-09-30T00:00:00.000Z',
    };
    profile.spellSelections = selectSpells(profile, catalog, spells, definition.preferredSpells ?? []);
    const allocated = Object.entries(profile.spellSelections).filter(([id]) => !id.startsWith('book.')).flatMap(([, ids]) => ids);
    const granted = automaticSpells(profile, catalog);
    const speciesSpells = speciesSpellIds(profile);
    profile.cantripIds = [...new Set([...allocated, ...granted, ...speciesSpells].filter(id => spells.find(spell => spell.id === id)?.level === 0))];
    profile.preparedSpellIds = [...new Set([...allocated, ...granted, ...speciesSpells,
      ...(definition.classId === 'paladino' ? ['destruicao-divina', 'convocar-montaria'] : [])])];
    profile.speed = movementSpeed(profile, speed);
    return { profile, role: definition.role, description: definition.description };
  });
}

function selectSpells(profile: CharacterProfile, catalog: TurnCatalog, spells: Spell[], preferred: string[]): Record<string, string[]> {
  const selections: Record<string, string[]> = {};
  const automatic = new Set(automaticSpells(profile, catalog));
  const grants = spellSelectionGrants(profile);
  const ordered = [
    ...grants.filter(grant => grant.purpose === 'spellbook' && grant.schools?.length),
    ...grants.filter(grant => grant.purpose === 'spellbook' && !grant.schools?.length),
    ...grants.filter(grant => grant.purpose !== 'spellbook'),
  ];
  for (const grant of ordered) {
    const book = new Set(Object.entries(selections).filter(([id]) => id.startsWith('book.')).flatMap(([, ids]) => ids));
    const otherBook = grant.purpose ? book : new Set<string>();
    const candidates = spells
      .filter(spell => spellFitsGrant(spell, grant))
      .filter(spell => !automatic.has(spell.id))
      .filter(spell => grant.id !== 'class.mago' || book.has(spell.id))
      .filter(spell => !grant.purpose || !otherBook.has(spell.id))
      .filter(spell => !(grant.id === 'cantrips.ladino' && spell.id === 'maos-magicas'))
      .sort((left, right) => preferredRank(left.id, preferred) - preferredRank(right.id, preferred) || left.level - right.level || left.name.localeCompare(right.name, 'pt-BR'));
    selections[grant.id] = candidates.slice(0, grant.limit).map(spell => spell.id);
  }
  return selections;
}

function speciesSpellIds(profile: CharacterProfile): string[] {
  if (profile.speciesChoiceId === 'gnomo-das-rochas') return ['consertar', 'prestidigitacao-arcana'];
  return [];
}

function preferredRank(id: string, preferred: string[]): number {
  const index = preferred.indexOf(id);
  return index < 0 ? preferred.length + 1 : index;
}

function feat(source: string, optionId: string, ability?: keyof AbilityScores): FeatSelection {
  return { source, optionId, bonuses: ability ? { [ability]: 1 } : {} };
}

function scores(strength: number, dexterity: number, constitution: number, intelligence: number, wisdom: number, charisma: number): AbilityScores {
  return { strength, dexterity, constitution, intelligence, wisdom, charisma };
}
