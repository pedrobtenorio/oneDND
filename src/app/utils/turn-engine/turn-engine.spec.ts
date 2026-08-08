import {
  CharacterProfile,
  CombatContext,
  RuleDefinition,
} from '../../models/turn-planner.models';
import { evaluateRule } from './turn-evaluator';
import { applyRule, reduceDecision, replayDecisions } from './turn-reducer';
import { attackCount, buildInitialResources, createInitialTurnState, hasSpellcasting, recoverResources, validateProfile } from './turn-profile';

const source = { book: 'Livro do Jogador', revision: '2024 - Erratas de Agosto', page: 1 };

const profile = (overrides: Partial<CharacterProfile> = {}): CharacterProfile => ({
  id: 'profile-1',
  name: 'Teste',
  speciesId: 'humano',
  classes: [
    { classId: 'ladino', level: 3, order: 0 },
    { classId: 'guerreiro', level: 3, order: 1 },
  ],
  abilities: { strength: 13, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 13, charisma: 10 },
  subclassIds: ['ladrao', 'mestre-da-batalha'],
  featIds: ['alerta', 'sortudo'],
  fightingStyleIds: [],
  maneuverIds: ['prostrar'],
  preparedSpellIds: [],
  weaponIds: ['weapon-rapieira'],
  masteryWeaponIds: ['weapon-rapieira'],
  masteryIds: ['mastery-afligir'],
  armor: 'light',
  hasShield: false,
  speed: 9,
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const context = (facts: CombatContext['facts'] = {}): CombatContext => ({
  facts,
  conditions: [],
  targetName: 'Alvo',
});

const rule = (overrides: Partial<RuleDefinition>): RuleDefinition => ({
  id: 'rule',
  name: 'Regra',
  summary: 'Resumo.',
  origin: 'core',
  originId: 'core',
  activation: 'free',
  category: 'modifier',
  conditions: [],
  costs: [],
  effects: [],
  support: 'structured',
  source,
  ...overrides,
});

describe('turn engine', () => {
  it('validates total level and every multiclass prerequisite', () => {
    expect(validateProfile(profile())).toEqual([]);
    expect(validateProfile(profile({ abilities: { strength: 10, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 } })).length).toBeGreaterThan(0);
    expect(validateProfile(profile({ classes: [{ classId: 'ladino', level: 7, order: 0 }] }))).toContain('O nível total deve estar entre 1 e 6.');
  });

  it('does not stack Extra Attack from multiple classes', () => {
    expect(attackCount(profile({ classes: [{ classId: 'barbaro', level: 5, order: 0 }, { classId: 'guerreiro', level: 5, order: 1 }] }))).toBe(2);
  });

  it('does not grant Extra Attack to full casters at level 5', () => {
    expect(attackCount(profile({ classes: [{ classId: 'mago', level: 5, order: 0 }] }))).toBe(1);
    expect(attackCount(profile({ classes: [{ classId: 'monge', level: 5, order: 0 }] }))).toBe(2);
  });

  it('builds spell and class resources for the expanded classes', () => {
    const character = profile({
      classes: [{ classId: 'feiticeiro', level: 3, order: 0 }, { classId: 'paladino', level: 2, order: 1 }],
      subclassIds: ['feiticaria-draconica'],
      abilities: { strength: 13, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 16 },
    });
    const resources = buildInitialResources(character);
    expect(hasSpellcasting(character)).toBeTrue();
    expect(resources['innate-sorcery'].max).toBe(2);
    expect(resources['sorcery-point'].max).toBe(3);
    expect(resources['lay-on-hands'].max).toBe(10);
    expect(resources['spell-slot-2'].max).toBe(3);
  });

  it('starts the first attack immediately when the Attack action is chosen', () => {
    const fighter = profile({
      classes: [{ classId: 'guerreiro', level: 5, order: 0 }],
      subclassIds: ['mestre-da-batalha'],
    });
    const attack = rule({
      id: 'core.attack-action',
      name: 'Atacar',
      costs: [{ type: 'action' }],
      effects: [{ type: 'begin-attack-action' }, { type: 'perform-attack' }],
    });

    const attacked = applyRule(createInitialTurnState(fighter), attack, fighter);

    expect(attacked.awaitingAttackOutcome).toBeTrue();
    expect(attacked.attacksRemaining).toBe(1);
    expect(attacked.timeline.map((entry) => entry.title)).toEqual(['Atacar']);
  });

  it('applies Mira Firme only before moving and consumes movement and bonus action', () => {
    const steadyAim = rule({
      id: 'steady-aim',
      conditions: [{ type: 'bonus-action-available' }, { type: 'has-not-moved' }],
      costs: [{ type: 'bonus-action' }],
      effects: [{ type: 'movement-zero' }, { type: 'marker', id: 'next-attack-advantage', value: true }],
    });
    const initial = createInitialTurnState(profile());
    expect(evaluateRule(steadyAim, profile(), context(), initial).status).toBe('available');
    const used = applyRule(initial, steadyAim, profile());
    expect(used.bonusActionAvailable).toBeFalse();
    expect(used.movementRemaining).toBe(0);
    expect(used.markers['next-attack-advantage']).toBeTrue();
    const moved = reduceDecision(initial, { type: 'move', distance: 1.5 }, profile(), new Map());
    expect(evaluateRule(steadyAim, profile(), context(), moved).status).toBe('blocked');
  });

  it('keeps unknown Sneak Attack facts conditional and accepts advantage supplied by Mira Firme', () => {
    const sneak = rule({
      id: 'sneak',
      conditions: [
        { type: 'trigger', value: 'attack-hit' },
        { type: 'marker', id: 'sneak-attack-used', equals: false, label: 'Já usado.' },
        { type: 'fact', id: 'sneak-weapon-eligible', equals: true, label: 'arma elegível' },
        { type: 'fact', id: 'attack-disadvantage', equals: false, label: 'sem Desvantagem' },
        { type: 'any-fact', ids: ['attack-advantage', 'ally-adjacent-target'], equals: true, label: 'Vantagem ou aliado' },
      ],
      effects: [{ type: 'marker', id: 'sneak-attack-used', value: true }],
    });
    const unknown = { ...createInitialTurnState(profile()), currentTrigger: 'attack-hit' as const };
    expect(evaluateRule(sneak, profile(), context(), unknown).status).toBe('conditional');

    const advantaged = {
      ...unknown,
      markers: { ...unknown.markers, 'current-attack-advantage': true },
    };
    const known = context({ 'sneak-weapon-eligible': true, 'attack-disadvantage': false });
    expect(evaluateRule(sneak, profile(), known, advantaged).status).toBe('available');
    const used = applyRule(advantaged, sneak, profile());
    expect(evaluateRule(sneak, profile(), known, used).status).toBe('blocked');
  });

  it('makes the Action Surge token reject Use Magic', () => {
    const surge = rule({
      id: 'surge',
      effects: [{ type: 'grant-action', id: 'surge', allowsMagic: false, label: 'Ação de Surto' }],
    });
    const attack = rule({ id: 'attack', costs: [{ type: 'action' }] });
    const magic = rule({
      id: 'magic',
      activation: 'action',
      conditions: [{ type: 'action-available', allowMagic: true }],
      costs: [{ type: 'action', allowMagic: true }],
    });
    const surged = applyRule(createInitialTurnState(profile()), surge, profile());
    const afterAttack = applyRule(surged, attack, profile());
    expect(afterAttack.actionTokens).toEqual([jasmine.objectContaining({ allowsMagic: false })]);
    expect(evaluateRule(magic, profile(), context(), afterAttack).status).toBe('blocked');
  });

  it('allows only one spell-slot expenditure in the modeled turn', () => {
    const guardian = profile({ classes: [{ classId: 'guardiao', level: 5, order: 0 }], subclassIds: ['cacador'] });
    const spell = rule({
      id: 'spell',
      conditions: [{ type: 'spell-slot-unused' }, { type: 'resource', id: 'spell-slot-1', atLeast: 1, label: 'Espaço' }],
      costs: [{ type: 'spell-slot', level: 1 }],
    });
    const used = applyRule(createInitialTurnState(guardian), spell, guardian);
    expect(used.resources['spell-slot-1'].current).toBe(3);
    expect(evaluateRule(spell, guardian, context(), used).status).toBe('blocked');
  });

  it('uses a higher Pact Magic slot for a lower-circle Warlock spell', () => {
    const warlock = profile({ classes: [{ classId: 'bruxo', level: 5, order: 0 }], subclassIds: ['patrono-infero'] });
    const spell = rule({
      id: 'warlock-spell',
      conditions: [{ type: 'spell-slot-unused' }, { type: 'spell-slot-available', minLevel: 1 }],
      costs: [{ type: 'spell-slot', level: 1 }],
    });
    const initial = createInitialTurnState(warlock);
    expect(initial.resources['spell-slot-1']).toBeUndefined();
    expect(initial.resources['pact-slot-3'].max).toBe(2);
    expect(evaluateRule(spell, warlock, context(), initial).status).toBe('available');
    const used = applyRule(initial, spell, warlock);
    expect(used.resources['pact-slot-3'].current).toBe(1);
  });

  it('recovers only the resources allowed by a Short Rest', () => {
    const character = profile({
      classes: [{ classId: 'bruxo', level: 2, order: 0 }, { classId: 'mago', level: 3, order: 1 }],
      subclassIds: ['patrono-infero', 'abjurador'],
    });
    const resources = buildInitialResources(character);
    resources['pact-slot-1'].current = 0;
    resources['spell-slot-2'].current = 0;
    resources['magical-cunning'].current = 0;

    const rested = recoverResources(resources, 'short');

    expect(rested.resources['pact-slot-1'].current).toBe(2);
    expect(rested.resources['spell-slot-2'].current).toBe(0);
    expect(rested.resources['magical-cunning'].current).toBe(0);
    expect(rested.recovered).toEqual(['Espaços de Pacto de 1º círculo']);
  });

  it('applies partial Short Rest recovery and restores everything on a Long Rest', () => {
    const character = profile({
      classes: [{ classId: 'barbaro', level: 3, order: 0 }, { classId: 'guerreiro', level: 2, order: 1 }],
      subclassIds: ['berserker'],
    });
    const resources = buildInitialResources(character);
    resources['rage'].current = 0;
    resources['second-wind'].current = 0;
    resources['action-surge'].current = 0;

    const short = recoverResources(resources, 'short');
    expect(short.resources['rage'].current).toBe(1);
    expect(short.resources['second-wind'].current).toBe(1);
    expect(short.resources['action-surge'].current).toBe(1);

    const long = recoverResources(short.resources, 'long');
    expect(long.resources['rage'].current).toBe(long.resources['rage'].max);
    expect(long.resources['second-wind'].current).toBe(long.resources['second-wind'].max);
  });

  it('uses Sorcerous Restoration at most once between Long Rests', () => {
    const sorcerer = profile({ classes: [{ classId: 'feiticeiro', level: 5, order: 0 }] });
    const resources = buildInitialResources(sorcerer);
    resources['sorcery-point'].current = 0;

    const first = recoverResources(resources, 'short');
    expect(first.resources['sorcery-point'].current).toBe(2);
    expect(first.resources['sorcerous-restoration'].current).toBe(0);
    const second = recoverResources(first.resources, 'short');
    expect(second.resources['sorcery-point'].current).toBe(2);
    const long = recoverResources(second.resources, 'long');
    expect(long.resources['sorcery-point'].current).toBe(5);
    expect(long.resources['sorcerous-restoration'].current).toBe(1);
  });

  it('replays deterministically and restores the Reaction only on the next turn', () => {
    const reaction = rule({ id: 'reaction', costs: [{ type: 'reaction' }] });
    const rules = [reaction];
    const decisions = [
      { type: 'apply-rule', ruleId: 'reaction' } as const,
      { type: 'end-turn' } as const,
      { type: 'start-next-turn' } as const,
    ];
    const first = replayDecisions(profile(), decisions, rules);
    const second = replayDecisions(profile(), decisions, rules);
    expect(first).toEqual(second);
    expect(first.reactionAvailable).toBeTrue();
    expect(first.timeline.map((entry) => entry.id)).toEqual(['event-1', 'event-2', 'event-3']);
  });
});
