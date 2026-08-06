import {
  CharacterProfile,
  RuleDefinition,
  TimelineEntry,
  TurnDecision,
  TurnState,
} from '../../models/turn-planner.models';
import { attackCount, createInitialTurnState } from './turn-profile';

const timelineEntry = (
  state: TurnState,
  title: string,
  detail: string,
  kind: TimelineEntry['kind']
): TimelineEntry => ({
  id: `event-${state.timeline.length + 1}`,
  title,
  detail,
  kind,
});

const clone = (state: TurnState): TurnState => ({
  ...state,
  actionTokens: state.actionTokens.map((token) => ({ ...token })),
  resources: Object.fromEntries(Object.entries(state.resources).map(([id, value]) => [id, { ...value }])),
  markers: { ...state.markers },
  timeline: [...state.timeline],
});

export const applyRule = (
  current: TurnState,
  rule: RuleDefinition,
  profile: CharacterProfile
): TurnState => {
  const state = clone(current);
  for (const cost of rule.costs) {
    if (cost.type === 'action') {
      const index = state.actionTokens.findIndex((token) => cost.allowMagic !== true || token.allowsMagic);
      if (index >= 0) state.actionTokens.splice(index, 1);
    } else if (cost.type === 'bonus-action') {
      state.bonusActionAvailable = false;
    } else if (cost.type === 'reaction') {
      state.reactionAvailable = false;
    } else if (cost.type === 'resource') {
      const resource = state.resources[cost.id];
      if (resource) resource.current = Math.max(0, resource.current - cost.amount);
    } else if (cost.type === 'spell-slot') {
      const slotId = Object.keys(state.resources)
        .map((id) => ({ id, level: Number(/^spell-slot-(\d+)$/.exec(id)?.[1] ?? 0) }))
        .filter((slot) => slot.level >= cost.level && state.resources[slot.id].current > 0)
        .sort((left, right) => left.level - right.level)[0]?.id;
      const resource = slotId ? state.resources[slotId] : undefined;
      if (resource) resource.current = Math.max(0, resource.current - 1);
      state.spellSlotUsedThisTurn = true;
    }
  }

  for (const effect of rule.effects) {
    if (effect.type === 'marker') state.markers[effect.id] = effect.value;
    if (effect.type === 'movement-zero') state.movementRemaining = 0;
    if (effect.type === 'movement-gain') {
      state.movementRemaining +=
        effect.amount === 'speed'
          ? profile.speed
          : effect.amount === 'half-speed'
            ? profile.speed / 2
            : effect.amount;
    }
    if (effect.type === 'grant-action') {
      state.actionTokens.push({ id: effect.id, label: effect.label, allowsMagic: effect.allowsMagic });
    }
    if (effect.type === 'begin-attack-action') state.attacksRemaining = attackCount(profile);
    if (effect.type === 'grant-attack') state.attacksRemaining += effect.amount;
    if (effect.type === 'consume-attack') {
      state.attacksRemaining = Math.max(0, state.attacksRemaining - effect.amount);
    }
    if (effect.type === 'perform-attack') {
      state.attacksRemaining = Math.max(0, state.attacksRemaining - 1);
      state.awaitingAttackOutcome = true;
      state.currentTrigger = undefined;
      state.markers['maneuver-used-this-attack'] = false;
      state.markers['first-attack-made'] = true;
      state.markers['current-attack-advantage'] =
        !!state.markers['next-attack-advantage'] || !!state.markers['reckless-attack-declared'];
      if (state.markers['next-attack-advantage']) state.markers['next-attack-advantage'] = false;
    }
    if (effect.type === 'start-concentration') state.concentrationSpellId = effect.spellId;
    if (effect.type === 'end-concentration') state.concentrationSpellId = undefined;
    if (effect.type === 'set-phase') state.phase = effect.phase;
    if (effect.type === 'resource') {
      const resource = state.resources[effect.id];
      if (resource) resource.current = Math.min(resource.max, resource.current + effect.amount);
    }
  }

  state.timeline.push(
    timelineEntry(
      state,
      rule.name,
      rule.support === 'structured' ? rule.summary : `${rule.summary} Resultado confirmado manualmente.`,
      'decision'
    )
  );
  return state;
};

export const reduceDecision = (
  current: TurnState,
  decision: TurnDecision,
  profile: CharacterProfile,
  rulesById: Map<string, RuleDefinition>
): TurnState => {
  if (decision.type === 'apply-rule') {
    const rule = rulesById.get(decision.ruleId);
    return rule ? applyRule(current, rule, profile) : current;
  }

  const state = clone(current);
  if (decision.type === 'move') {
    const distance = Math.max(0, Math.min(decision.distance, state.movementRemaining));
    state.movementRemaining -= distance;
    state.hasMoved ||= distance > 0;
    state.timeline.push(timelineEntry(state, 'Movimento', `${distance} m utilizados.`, 'movement'));
  }
  if (decision.type === 'set-resource') {
    const resource = state.resources[decision.resourceId];
    if (resource) resource.current = Math.max(0, Math.min(resource.max, decision.current));
  }
  if (decision.type === 'set-concentration') {
    state.concentrationSpellId = decision.spellId;
  }
  if (decision.type === 'attack-result') {
    state.awaitingAttackOutcome = false;
    state.currentTrigger = decision.result === 'hit' ? 'attack-hit' : 'attack-miss';
    state.timeline.push(
      timelineEntry(
        state,
        decision.result === 'hit' ? 'Ataque acertou' : 'Ataque errou',
        'Gatilhos recalculados.',
        'result'
      )
    );
  }
  if (decision.type === 'clear-trigger') state.currentTrigger = undefined;
  if (decision.type === 'end-turn') {
    state.phase = 'reaction-window';
    state.actionTokens = [];
    state.bonusActionAvailable = false;
    state.attacksRemaining = 0;
    state.awaitingAttackOutcome = false;
    state.currentTrigger = undefined;
    state.timeline.push(timelineEntry(state, 'Fim do turno', 'A janela de Reação permanece aberta.', 'phase'));
  }
  if (decision.type === 'start-next-turn') {
    const next = createInitialTurnState(profile);
    next.concentrationSpellId = state.concentrationSpellId;
    next.resources = state.resources;
    next.markers['rage-active'] = !!state.markers['rage-active'];
    next.timeline = [
      ...state.timeline,
      timelineEntry(state, 'Novo turno', 'Economia do turno restaurada.', 'phase'),
    ];
    return next;
  }
  return state;
};

export const replayDecisions = (
  profile: CharacterProfile,
  decisions: TurnDecision[],
  rules: RuleDefinition[]
): TurnState => {
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  return decisions.reduce((state, decision) => reduceDecision(state, decision, profile, byId), createInitialTurnState(profile));
};
