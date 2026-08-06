import {
  CharacterProfile,
  CombatContext,
  EvaluationReason,
  RuleCondition,
  RuleDefinition,
  RuleEvaluation,
  TurnClassId,
  TurnState,
} from '../../models/turn-planner.models';
import { classLevel } from './turn-profile';

type ConditionResult = { status: 'pass' | 'unknown' | 'fail'; reason?: EvaluationReason };

const conditionResult = (
  condition: RuleCondition,
  profile: CharacterProfile,
  context: CombatContext,
  state: TurnState
): ConditionResult => {
  switch (condition.type) {
    case 'class-level':
      return classLevel(profile, condition.classId) >= condition.min
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'class-level', message: `Requer ${condition.classId} ${condition.min}.` } };
    case 'subclass':
      return profile.subclassIds.includes(condition.id)
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'subclass', message: 'Subclasse não selecionada.' } };
    case 'species':
      return profile.speciesId === condition.id
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'species', message: 'Espécie diferente.' } };
    case 'species-choice':
      return profile.speciesChoiceId === condition.id
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'species-choice', message: 'Escolha de espécie diferente.' } };
    case 'feat':
      return profile.featIds.includes(condition.id) || profile.fightingStyleIds.includes(condition.id)
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'feat', message: 'Talento não selecionado.' } };
    case 'maneuver':
      return profile.maneuverIds.includes(condition.id)
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'maneuver', message: 'Manobra não conhecida.' } };
    case 'mastery':
      return profile.masteryIds.includes(condition.id)
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'mastery', message: 'Maestria não selecionada.' } };
    case 'spell-prepared':
      return profile.preparedSpellIds.includes(condition.id)
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'spell', message: 'Magia não preparada.' } };
    case 'fact': {
      const value = context.facts[condition.id] ?? 'unknown';
      if (value === 'unknown') {
        return {
          status: 'unknown',
          reason: { code: 'missing-fact', factId: condition.id, message: `Confirme: ${condition.label}.` },
        };
      }
      return value === condition.equals
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'fact', factId: condition.id, message: `Bloqueado: ${condition.label}.` } };
    }
    case 'any-fact': {
      const values = condition.ids.map((id) => {
        if (id === 'attack-advantage' && state.markers['current-attack-advantage']) return true;
        return context.facts[id] ?? 'unknown';
      });
      if (values.some((value) => value === condition.equals)) return { status: 'pass' };
      if (values.some((value) => value === 'unknown')) {
        const missingIndex = values.findIndex((value) => value === 'unknown');
        return {
          status: 'unknown',
          reason: { code: 'missing-fact', factId: condition.ids[missingIndex], message: `Confirme: ${condition.label}.` },
        };
      }
      return { status: 'fail', reason: { code: 'fact', message: `Bloqueado: ${condition.label}.` } };
    }
    case 'phase':
      return state.phase === condition.value
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'phase', message: 'Não está disponível nesta fase.' } };
    case 'resource': {
      const current = state.resources[condition.id]?.current ?? 0;
      return current >= condition.atLeast
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'resource', message: `${condition.label} esgotado.` } };
    }
    case 'marker':
      return (state.markers[condition.id] ?? false) === condition.equals
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'marker', message: condition.label } };
    case 'bonus-action-available':
      return state.bonusActionAvailable
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'bonus-action', message: 'A Ação Bônus já foi usada.' } };
    case 'reaction-available':
      return state.reactionAvailable
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'reaction', message: 'A Reação já foi usada.' } };
    case 'action-available': {
      const token = state.actionTokens.find((item) => condition.allowMagic !== true || item.allowsMagic);
      return token
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'action', message: 'Não há uma ação compatível disponível.' } };
    }
    case 'attacks-remaining':
      return state.attacksRemaining > 0 && !state.awaitingAttackOutcome
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'attacks', message: 'Não há ataque pendente nesta ação.' } };
    case 'has-not-moved':
      return !state.hasMoved
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'movement', message: 'Você já se moveu neste turno.' } };
    case 'trigger':
      return state.currentTrigger === condition.value
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'trigger', message: 'O gatilho ainda não ocorreu.' } };
    case 'not-concentrating':
      return !state.concentrationSpellId
        ? { status: 'pass' }
        : { status: 'unknown', reason: { code: 'concentration', message: 'Conjurar encerrará a concentração atual.' } };
    case 'not-raging':
      return !state.markers['rage-active']
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'rage', message: 'Fúria impede conjurar magias.' } };
    case 'spell-slot-unused':
      return !state.spellSlotUsedThisTurn
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'spell-slot-turn', message: 'Um espaço de magia já foi usado neste turno.' } };
    case 'spell-slot-available': {
      const available = Object.entries(state.resources).some(([id, resource]) => {
        const match = /^spell-slot-(\d+)$/.exec(id);
        return !!match && Number(match[1]) >= condition.minLevel && resource.current > 0;
      });
      return available
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'resource', message: `Nenhum espaço de ${condition.minLevel}º círculo ou superior disponível.` } };
    }
    case 'armor-not-heavy':
      return profile.armor !== 'heavy'
        ? { status: 'pass' }
        : { status: 'fail', reason: { code: 'armor', message: 'Armadura Pesada impede esta característica.' } };
  }
};

export const evaluateRule = (
  rule: RuleDefinition,
  profile: CharacterProfile,
  context: CombatContext,
  state: TurnState
): RuleEvaluation => {
  const results = rule.conditions.map((condition) => conditionResult(condition, profile, context, state));
  const failures = results.filter((result) => result.status === 'fail');
  const unknowns = results.filter((result) => result.status === 'unknown');
  const reasons = [...failures, ...unknowns]
    .map((result) => result.reason)
    .filter((reason): reason is EvaluationReason => !!reason);

  return {
    rule,
    status: failures.length ? 'blocked' : unknowns.length ? 'conditional' : 'available',
    reasons,
    missingFacts: unknowns.map((result) => result.reason?.factId).filter((id): id is string => !!id),
  };
};

export const evaluateRules = (
  rules: RuleDefinition[],
  profile: CharacterProfile,
  context: CombatContext,
  state: TurnState
): RuleEvaluation[] => rules.map((rule) => evaluateRule(rule, profile, context, state));

export const isRuleRelevant = (rule: RuleDefinition, profile: CharacterProfile): boolean => {
  const maneuver = rule.conditions.find((condition) => condition.type === 'maneuver');
  if (maneuver?.type === 'maneuver' && !profile.maneuverIds.includes(maneuver.id)) return false;
  const acquiredChoice = rule.conditions.find(
    (condition) => condition.type === 'feat' && condition.id.startsWith('cacador-')
  );
  if (acquiredChoice?.type === 'feat' && !profile.featIds.includes(acquiredChoice.id)) return false;
  if (rule.origin === 'core') return true;
  if (rule.origin === 'class') return classLevel(profile, rule.originId as TurnClassId) > 0;
  if (rule.origin === 'subclass') return profile.subclassIds.includes(rule.originId);
  if (rule.origin === 'species') {
    return profile.speciesId === rule.originId || profile.speciesChoiceId === rule.originId;
  }
  if (rule.origin === 'feat') {
    return profile.featIds.includes(rule.originId) || profile.fightingStyleIds.includes(rule.originId);
  }
  if (rule.origin === 'spell') {
    return rule.tags?.includes('free-cast')
      ? (profile.freeSpellIds ?? []).includes(rule.originId)
      : profile.preparedSpellIds.includes(rule.originId);
  }
  if (rule.origin === 'weapon') {
    return rule.originId.startsWith('property-') || profile.masteryIds.includes(rule.originId);
  }
  return true;
};
