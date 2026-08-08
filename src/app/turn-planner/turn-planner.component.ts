import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { take } from 'rxjs';

import {
  CharacterProfile,
  CombatContext,
  RuleEvaluation,
  TurnCatalog,
  TurnDecision,
  TurnState,
} from '../models/turn-planner.models';
import { TurnPlannerStorageService } from '../services/turn-planner-storage.service';
import { TurnPlannerStore } from '../services/turn-planner-store.service';
import { TurnRuleCatalogService } from '../services/turn-rule-catalog.service';
import { totalLevel } from '../utils/turn-engine/turn-profile';
import { CombatContextComponent } from './combat-context.component';
import { RuleDetailsComponent } from './rule-details.component';
import { TurnActionBoardComponent } from './turn-action-board.component';
import { TurnResourceBarComponent } from './turn-resource-bar.component';
import { TurnTimelineComponent } from './turn-timeline.component';

const unknownFacts = (): Record<string, 'unknown'> => ({
  'attack-advantage': 'unknown',
  'attack-disadvantage': 'unknown',
  'sneak-weapon-eligible': 'unknown',
  'ally-adjacent-target': 'unknown',
  'strength-attack': 'unknown',
  'used-mastery-weapon': 'unknown',
  'light-attack-eligible': 'unknown',
  'target-below-max-hp': 'unknown',
  'secondary-target-nearby': 'unknown',
  'target-large-or-smaller': 'unknown',
  'attacker-visible': 'unknown',
  'damage-received': 'unknown',
  'target-left-reach': 'unknown',
  'target-disengaged': 'unknown',
});

export const describeRemainingTurnEconomy = (
  state: TurnState,
  evaluations: RuleEvaluation[]
): string[] => {
  if (state.phase !== 'own-turn') return [];
  const reasons: string[] = [];
  if (state.actionTokens.length) reasons.push(`${state.actionTokens.length} ação(ões) disponível(is)`);
  const hasBonusOption = evaluations.some(
    (evaluation) => evaluation.rule.category === 'bonus' && evaluation.status !== 'blocked'
  );
  if (state.bonusActionAvailable && hasBonusOption) reasons.push('Ação Bônus disponível');
  if (state.movementRemaining > 0) reasons.push(`${state.movementRemaining} m de movimento restante`);
  if (state.awaitingAttackOutcome) reasons.push('resultado de ataque pendente');
  else if (state.currentTrigger) reasons.push('gatilhos do ataque pendentes');
  else if (state.attacksRemaining > 0) reasons.push(`${state.attacksRemaining} ataque(s) adicional(is) disponível(is)`);
  return reasons;
};

@Component({
  selector: 'app-turn-planner',
  standalone: true,
  providers: [TurnPlannerStore],
  imports: [
    CommonModule,
    RouterLink,
    CombatContextComponent,
    RuleDetailsComponent,
    TurnActionBoardComponent,
    TurnResourceBarComponent,
    TurnTimelineComponent,
  ],
  templateUrl: './turn-planner.component.html',
  styleUrl: './turn-planner.component.css',
})
export class TurnPlannerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(TurnRuleCatalogService);
  readonly storage = inject(TurnPlannerStorageService);
  readonly store = inject(TurnPlannerStore);

  catalog: TurnCatalog | null = null;
  profiles: CharacterProfile[] = [];
  selectedProfileId = '';
  activeProfile: CharacterProfile | null = null;
  context: CombatContext = { facts: unknownFacts(), conditions: [], targetName: 'Alvo principal' };
  state: TurnState | null = null;
  evaluations: RuleEvaluation[] = [];
  selectedEvaluation: RuleEvaluation | null = null;
  decisions: TurnDecision[] = [];
  loadError = '';
  notice = '';
  didactic = true;
  sessionStarted = false;
  combatEnded = false;
  endConfirmationOpen = false;
  finishCombatConfirmationOpen = false;

  ngOnInit(): void {
    this.catalogService.getCatalog()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalog) => (this.catalog = catalog),
        error: (error: unknown) => {
          this.loadError = error instanceof Error ? error.message : 'Não foi possível carregar o catálogo.';
        },
      });

    const requestedProfile = this.route.snapshot.queryParamMap.get('personagem');
    this.storage.profiles$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((profiles) => {
      this.profiles = profiles;
      if (requestedProfile && profiles.some((profile) => profile.id === requestedProfile)) {
        this.selectedProfileId = requestedProfile;
      } else if (!profiles.some((profile) => profile.id === this.selectedProfileId)) {
        this.selectedProfileId = profiles[0]?.id ?? '';
      }
    });
    this.storage.storageWarning$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((warning) => {
      if (warning) this.notice = warning;
    });
    this.store.state$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((state) => {
      this.state = state;
      if (state?.phase !== 'own-turn') this.endConfirmationOpen = false;
    });
    this.store.context$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((context) => {
      if (context) this.context = context;
    });
    this.store.evaluations$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((evaluations) => {
      this.evaluations = evaluations;
      if (this.selectedEvaluation) {
        this.selectedEvaluation = evaluations.find((item) => item.rule.id === this.selectedEvaluation?.rule.id) ?? null;
      }
    });
    this.store.decisions$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((decisions) => {
      this.decisions = decisions;
      if (this.sessionStarted && this.activeProfile) {
        this.storage.saveDraft({
          profileId: this.activeProfile.id,
          context: this.context,
          decisions,
          combatEnded: this.combatEnded,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  get selectedProfile(): CharacterProfile | undefined {
    return this.profiles.find((profile) => profile.id === this.selectedProfileId);
  }

  profileLevel(profile: CharacterProfile): number {
    return totalLevel(profile);
  }

  get ownTurnEvaluations(): RuleEvaluation[] {
    return this.evaluations.filter((item) => item.rule.category !== 'reaction' && item.rule.id !== 'core.perform-attack');
  }

  get reactionEvaluations(): RuleEvaluation[] {
    return this.evaluations.filter((item) => item.rule.category === 'reaction');
  }

  get canPerformNextAttack(): boolean {
    const evaluation = this.evaluations.find((item) => item.rule.id === 'core.perform-attack');
    return !!this.state && !this.state.currentTrigger && evaluation?.status === 'available';
  }

  get remainingEconomy(): string[] {
    return this.state ? describeRemainingTurnEconomy(this.state, this.ownTurnEvaluations) : [];
  }

  selectProfile(profileId: string): void {
    this.selectedProfileId = profileId;
  }

  startSession(): void {
    const profile = this.selectedProfile;
    if (!profile || !this.catalog) {
      this.notice = 'Escolha um personagem salvo antes de iniciar.';
      return;
    }
    this.activeProfile = profile;
    const draft = this.storage.getDraft(profile.id);
    this.context = draft?.context ?? { facts: unknownFacts(), conditions: [], targetName: 'Alvo principal' };
    this.combatEnded = draft?.combatEnded ?? false;
    this.store.load(profile, this.catalog, this.context, draft?.decisions ?? []);
    this.sessionStarted = true;
    this.endConfirmationOpen = false;
    this.finishCombatConfirmationOpen = false;
    this.selectedEvaluation = null;
    this.notice = draft
      ? this.combatEnded
        ? `Recursos de “${profile.name}” restaurados entre combates.`
        : `Turno de “${profile.name}” restaurado.`
      : `Turno de “${profile.name}” iniciado.`;
  }

  inspect(evaluation: RuleEvaluation): void {
    this.selectedEvaluation = evaluation;
  }

  confirmSelected(): void {
    if (this.selectedEvaluation) this.store.applyRule(this.selectedEvaluation.rule.id, true);
  }

  factChanged(change: { id: string; value: boolean | 'unknown' }): void {
    this.store.setFact(change.id, change.value);
  }

  performNextAttack(): void {
    if (this.canPerformNextAttack) this.store.applyRule('core.perform-attack');
  }

  requestEndTurn(): void {
    if (this.remainingEconomy.length) {
      this.endConfirmationOpen = true;
      setTimeout(() => document.querySelector<HTMLElement>('#end-turn-confirmation-title')?.focus());
      return;
    }
    this.store.endTurn();
  }

  cancelEndTurn(): void {
    this.endConfirmationOpen = false;
    setTimeout(() => document.querySelector<HTMLElement>('#end-turn-button')?.focus());
  }

  confirmEndTurn(): void {
    this.endConfirmationOpen = false;
    this.store.endTurn();
  }

  requestFinishCombat(): void {
    this.finishCombatConfirmationOpen = true;
    setTimeout(() => document.querySelector<HTMLElement>('#finish-combat-confirmation-title')?.focus());
  }

  cancelFinishCombat(): void {
    this.finishCombatConfirmationOpen = false;
    setTimeout(() => document.querySelector<HTMLElement>('#finish-combat-button')?.focus());
  }

  confirmFinishCombat(): void {
    this.finishCombatConfirmationOpen = false;
    this.combatEnded = true;
    this.selectedEvaluation = null;
    this.context = { facts: unknownFacts(), conditions: [], targetName: 'Alvo principal' };
    this.store.setContext(this.context);
    this.store.clearHistoryPreservingResources();
    this.notice = 'Combate terminado. O histórico de ações foi apagado e os recursos gastos foram preservados.';
  }

  takeRest(rest: 'short' | 'long'): void {
    const recovered = this.store.takeRest(rest);
    const name = rest === 'short' ? 'Descanso Curto' : 'Descanso Longo';
    this.notice = recovered.length
      ? `${name} concluído. Recuperado: ${recovered.join(', ')}.`
      : `${name} concluído. Nenhum recurso automático precisava ser recuperado.`;
  }

  startNewCombat(): void {
    this.combatEnded = false;
    this.context = { facts: unknownFacts(), conditions: [], targetName: 'Alvo principal' };
    this.store.setContext(this.context);
    this.store.clearHistoryPreservingResources();
    this.notice = `Novo combate iniciado para “${this.activeProfile?.name ?? 'personagem'}”.`;
  }
}
