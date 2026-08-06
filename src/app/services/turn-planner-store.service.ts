import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  CharacterProfile,
  CombatContext,
  RuleEvaluation,
  TurnCatalog,
  TurnDecision,
  TurnState,
} from '../models/turn-planner.models';
import { evaluateRules, isRuleRelevant } from '../utils/turn-engine/turn-evaluator';
import { replayDecisions } from '../utils/turn-engine/turn-reducer';

@Injectable()
export class TurnPlannerStore {
  private profile?: CharacterProfile;
  private catalog?: TurnCatalog;
  private context?: CombatContext;
  private decisions: TurnDecision[] = [];
  private cursor = 0;

  private readonly stateSubject = new BehaviorSubject<TurnState | null>(null);
  private readonly evaluationsSubject = new BehaviorSubject<RuleEvaluation[]>([]);
  private readonly decisionsSubject = new BehaviorSubject<TurnDecision[]>([]);
  private readonly contextSubject = new BehaviorSubject<CombatContext | null>(null);

  readonly state$ = this.stateSubject.asObservable();
  readonly evaluations$ = this.evaluationsSubject.asObservable();
  readonly decisions$ = this.decisionsSubject.asObservable();
  readonly context$ = this.contextSubject.asObservable();

  get currentState(): TurnState | null {
    return this.stateSubject.value;
  }

  get currentContext(): CombatContext | null {
    return this.contextSubject.value;
  }

  get activeDecisions(): TurnDecision[] {
    return this.decisions.slice(0, this.cursor);
  }

  get canUndo(): boolean {
    return this.cursor > 0;
  }

  get canRedo(): boolean {
    return this.cursor < this.decisions.length;
  }

  load(profile: CharacterProfile, catalog: TurnCatalog, context: CombatContext, decisions: TurnDecision[] = []): void {
    this.profile = profile;
    this.catalog = catalog;
    this.context = { ...context, facts: { ...context.facts }, conditions: [...context.conditions] };
    this.decisions = [...decisions];
    if (context.activeConcentrationSpellId && !this.decisions.some((item) => item.type === 'set-concentration')) {
      this.decisions.unshift({ type: 'set-concentration', spellId: context.activeConcentrationSpellId });
    }
    this.cursor = this.decisions.length;
    this.recompute();
  }

  updateProfile(profile: CharacterProfile): void {
    this.profile = profile;
    this.recompute();
  }

  setFact(id: string, value: boolean | 'unknown'): void {
    if (!this.context) return;
    this.context = { ...this.context, facts: { ...this.context.facts, [id]: value } };
    this.contextSubject.next(this.context);
    this.recompute();
  }

  setContext(context: CombatContext): void {
    this.context = { ...context, facts: { ...context.facts }, conditions: [...context.conditions] };
    this.contextSubject.next(this.context);
    this.recompute();
  }

  applyRule(ruleId: string, forceConditional = false): RuleEvaluation | undefined {
    const evaluation = this.evaluationsSubject.value.find((item) => item.rule.id === ruleId);
    if (!evaluation || evaluation.status === 'blocked' || (evaluation.status === 'conditional' && !forceConditional)) {
      return evaluation;
    }
    this.append({ type: 'apply-rule', ruleId });
    return evaluation;
  }

  move(distance: number): void {
    if (distance > 0 && (this.currentState?.movementRemaining ?? 0) > 0) this.append({ type: 'move', distance });
  }

  setResource(resourceId: string, current: number): void {
    this.append({ type: 'set-resource', resourceId, current });
  }

  attackResult(result: 'hit' | 'miss'): void {
    if (this.currentState?.awaitingAttackOutcome) this.append({ type: 'attack-result', result });
  }

  clearTrigger(): void {
    this.append({ type: 'clear-trigger' });
  }

  endTurn(): void {
    if (this.currentState?.phase === 'own-turn') this.append({ type: 'end-turn' });
  }

  startNextTurn(): void {
    if (this.currentState?.phase === 'reaction-window') this.append({ type: 'start-next-turn' });
  }

  undo(): void {
    if (this.cursor > 0) {
      this.cursor -= 1;
      this.recompute();
    }
  }

  redo(): void {
    if (this.cursor < this.decisions.length) {
      this.cursor += 1;
      this.recompute();
    }
  }

  private append(decision: TurnDecision): void {
    this.decisions = [...this.decisions.slice(0, this.cursor), decision];
    this.cursor = this.decisions.length;
    this.recompute();
  }

  private recompute(): void {
    if (!this.profile || !this.catalog || !this.context) return;
    const active = this.activeDecisions;
    const state = replayDecisions(this.profile, active, this.catalog.rules);
    const relevantRules = this.catalog.rules.filter((rule) => isRuleRelevant(rule, this.profile!));
    this.stateSubject.next(state);
    this.decisionsSubject.next(active);
    this.contextSubject.next(this.context);
    this.evaluationsSubject.next(evaluateRules(relevantRules, this.profile, this.context, state));
  }
}
