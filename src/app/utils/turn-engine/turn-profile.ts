import {
  CharacterProfile,
  ResourcePool,
  TurnClassId,
  TurnState,
} from '../../models/turn-planner.models';

export const classLevel = (profile: CharacterProfile, classId: TurnClassId): number =>
  profile.classes.find((entry) => entry.classId === classId)?.level ?? 0;

export const totalLevel = (profile: CharacterProfile): number =>
  profile.classes.reduce((sum, entry) => sum + entry.level, 0);

export const proficiencyBonus = (profile: CharacterProfile): number =>
  totalLevel(profile) >= 5 ? 3 : 2;

export const hasSpellcasting = (profile: CharacterProfile): boolean =>
  (['bardo', 'bruxo', 'clerigo', 'druida', 'feiticeiro', 'guardiao', 'mago', 'paladino'] as TurnClassId[])
    .some((classId) => classLevel(profile, classId) >= 1) ||
  profile.subclassIds.some((id) => ['cavaleiro-mistico', 'trapaceiro-arcano'].includes(id)) ||
  profile.fightingStyleIds.includes('combatente-druidico') ||
  profile.featIds.some((id) =>
    id.startsWith('iniciado-em-magia') ||
    ['conjurador-ritualista', 'tocado-pelas-fadas', 'tocado-pela-sombra'].includes(id)
  );

export const attackCount = (profile: CharacterProfile): number =>
  profile.classes.some((entry) => entry.level >= 5 && ['barbaro', 'guardiao', 'guerreiro', 'monge', 'paladino'].includes(entry.classId)) ? 2 : 1;

const pool = (label: string, max: number): ResourcePool => ({ current: max, max, label });

export const buildInitialResources = (profile: CharacterProfile): Record<string, ResourcePool> => {
  const resources: Record<string, ResourcePool> = {};
  const barbarian = classLevel(profile, 'barbaro');
  const ranger = classLevel(profile, 'guardiao');
  const fighter = classLevel(profile, 'guerreiro');
  const bard = classLevel(profile, 'bardo');
  const warlock = classLevel(profile, 'bruxo');
  const cleric = classLevel(profile, 'clerigo');
  const druid = classLevel(profile, 'druida');
  const sorcerer = classLevel(profile, 'feiticeiro');
  const monk = classLevel(profile, 'monge');
  const paladin = classLevel(profile, 'paladino');

  if (barbarian > 0) {
    const uses = barbarian >= 6 ? 4 : barbarian >= 3 ? 3 : 2;
    resources['rage'] = pool('Fúria', uses);
  }
  if (fighter >= 1) {
    resources['second-wind'] = pool('Recuperar Fôlego', fighter >= 4 ? 3 : 2);
  }
  if (fighter >= 2) {
    resources['action-surge'] = pool('Surto de Ação', 1);
  }
  if (profile.subclassIds.includes('mestre-da-batalha')) {
    resources['superiority-die'] = pool('Dados de Superioridade', 4);
  }
  if (ranger >= 1) resources['favored-enemy'] = pool('Inimigo Favorito', ranger >= 5 ? 3 : 2);
  if (bard >= 1) resources['bardic-inspiration'] = pool('Inspiração de Bardo', Math.max(1, Math.floor((profile.abilities.charisma - 10) / 2)));
  if (warlock >= 2) resources['magical-cunning'] = pool('Astúcia Mágica', 1);
  if (cleric >= 2) resources['channel-divinity'] = pool('Canalizar Divindade', 2);
  if (druid >= 2) resources['wild-shape'] = pool('Forma Selvagem', 2);
  if (sorcerer >= 1) resources['innate-sorcery'] = pool('Feitiçaria Inata', 2);
  if (sorcerer >= 2) resources['sorcery-point'] = pool('Pontos de Feitiçaria', sorcerer);
  if (monk >= 2) resources['focus-point'] = pool('Pontos de Foco', monk);
  if (monk >= 2) resources['uncanny-metabolism'] = pool('Metabolismo Incomum', 1);
  if (paladin >= 1) resources['lay-on-hands'] = pool('Mãos Consagradas', paladin * 5);
  if (paladin >= 3) resources['channel-divinity'] = pool('Canalizar Divindade', 2);

  const fullCasterLevel = bard + cleric + druid + sorcerer + classLevel(profile, 'mago');
  const sharedCasterLevel = fullCasterLevel + Math.ceil(ranger / 2) + Math.ceil(paladin / 2) +
    (profile.subclassIds.includes('cavaleiro-mistico') ? Math.floor(fighter / 3) : 0) +
    (profile.subclassIds.includes('trapaceiro-arcano') ? Math.floor(classLevel(profile, 'ladino') / 3) : 0);
  const slotTable = [
    [], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3],
  ];
  const slots = slotTable[Math.min(6, sharedCasterLevel)] ?? [];
  slots.forEach((amount, index) => {
    resources[`spell-slot-${index + 1}`] = pool(`Espaços de ${index + 1}º círculo`, amount);
  });
  if (warlock >= 1) {
    const circle = warlock >= 5 ? 3 : warlock >= 3 ? 2 : 1;
    const amount = warlock >= 2 ? 2 : 1;
    const id = `spell-slot-${circle}`;
    const existing = resources[id]?.max ?? 0;
    resources[id] = pool(`Espaços de ${circle}º círculo`, existing + amount);
  }

  if (profile.subclassIds.some((id) => ['guerreiro-psi', 'lamina-alma'].includes(id))) {
    resources['psionic-energy-die'] = pool('Dados de Energia Psiônica', proficiencyBonus(profile) * 2);
  }
  if (profile.subclassIds.includes('patrono-celestial')) resources['healing-light'] = pool('Luz Medicinal', warlock + 1);

  const proficiency = proficiencyBonus(profile);
  if (profile.speciesId === 'aasimar') {
    resources['healing-hands'] = pool('Mãos Curativas', 1);
    if (totalLevel(profile) >= 3) resources['celestial-revelation'] = pool('Revelação Celestial', 1);
  }
  if (profile.speciesId === 'anao') resources['stonecunning'] = pool('Astúcia da Pedra', proficiency);
  if (profile.speciesId === 'draconato') {
    resources['breath-weapon'] = pool('Sopro Dracônico', proficiency);
    if (totalLevel(profile) >= 5) resources['draconic-flight'] = pool('Voo Dracônico', 1);
  }
  if (profile.speciesId === 'golias') {
    resources['giant-ancestry'] = pool('Ancestralidade Gigante', proficiency);
    if (totalLevel(profile) >= 5) resources['large-form'] = pool('Forma Grande', 1);
  }
  if (profile.speciesId === 'orc') {
    resources['adrenaline-rush'] = pool('Ímpeto de Adrenalina', proficiency);
    resources['relentless-endurance'] = pool('Resistência Implacável', 1);
  }
  if (profile.featIds.includes('sortudo')) resources['luck-point'] = pool('Pontos de Sorte', proficiency);
  for (const spellId of profile.freeSpellIds ?? []) {
    resources[`free-spell-${spellId}`] = pool(`Uso gratuito: ${spellId}`, 1);
  }

  return resources;
};

export const createInitialTurnState = (profile: CharacterProfile): TurnState => ({
  phase: 'own-turn',
  actionTokens: [{ id: 'standard', label: 'Ação', allowsMagic: true }],
  bonusActionAvailable: true,
  reactionAvailable: true,
  movementMax: profile.speed,
  movementRemaining: profile.speed,
  hasMoved: false,
  freeInteractionAvailable: true,
  spellSlotUsedThisTurn: false,
  concentrationSpellId: undefined,
  attacksRemaining: 0,
  awaitingAttackOutcome: false,
  currentTrigger: undefined,
  resources: buildInitialResources(profile),
  markers: {
    'sneak-attack-used': false,
    'maneuver-used-this-attack': false,
    'reckless-attack-declared': false,
    'rage-active': false,
    'next-attack-advantage': false,
    'current-attack-advantage': false,
    'light-attack-unlocked': false,
    'first-attack-made': false,
  },
  timeline: [],
});

export const validateProfile = (profile: CharacterProfile): string[] => {
  const errors: string[] = [];
  const total = totalLevel(profile);
  if (total < 1 || total > 6) {
    errors.push('O nível total deve estar entre 1 e 6.');
  }

  for (const entry of profile.classes.filter((item) => item.level > 0)) {
    const abilities = profile.abilities;
    const valid =
      (entry.classId === 'barbaro' && abilities.strength >= 13) ||
      (entry.classId === 'bardo' && abilities.charisma >= 13) ||
      (entry.classId === 'bruxo' && abilities.charisma >= 13) ||
      (entry.classId === 'clerigo' && abilities.wisdom >= 13) ||
      (entry.classId === 'druida' && abilities.wisdom >= 13) ||
      (entry.classId === 'feiticeiro' && abilities.charisma >= 13) ||
      (entry.classId === 'guardiao' && abilities.dexterity >= 13 && abilities.wisdom >= 13) ||
      (entry.classId === 'guerreiro' && (abilities.strength >= 13 || abilities.dexterity >= 13)) ||
      (entry.classId === 'ladino' && abilities.dexterity >= 13) ||
      (entry.classId === 'mago' && abilities.intelligence >= 13) ||
      (entry.classId === 'monge' && abilities.dexterity >= 13 && abilities.wisdom >= 13) ||
      (entry.classId === 'paladino' && abilities.strength >= 13 && abilities.charisma >= 13);
    if (profile.classes.filter((item) => item.level > 0).length > 1 && !valid) {
      errors.push(`Os atributos não atendem ao pré-requisito de multiclasse para ${entry.classId}.`);
    }
  }

  return errors;
};
