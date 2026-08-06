export type TurnClassId =
  | 'barbaro'
  | 'bardo'
  | 'bruxo'
  | 'clerigo'
  | 'druida'
  | 'feiticeiro'
  | 'guardiao'
  | 'guerreiro'
  | 'ladino'
  | 'mago'
  | 'monge'
  | 'paladino';

export type AbilityId = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export type ContextFact = boolean | 'unknown';

export type TurnPhase = 'own-turn' | 'reaction-window' | 'complete';

export type RuleActivation = 'action' | 'bonus-action' | 'reaction' | 'free' | 'trigger';

export type RuleTrigger =
  | 'attack-hit'
  | 'attack-miss'
  | 'damage-received'
  | 'target-leaves-reach'
  | 'save-failed'
  | 'save-succeeded';

export type RuleSupport = 'structured' | 'prompt' | 'informational';

export type OptionKind =
  | 'species'
  | 'species-choice'
  | 'subclass'
  | 'subclass-choice'
  | 'feat-origin'
  | 'feat-general'
  | 'fighting-style'
  | 'maneuver';

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface CharacterClassLevel {
  classId: TurnClassId;
  level: number;
  order: number;
}

export interface CharacterProfile {
  id: string;
  name: string;
  speciesId: string;
  speciesChoiceId?: string;
  classes: CharacterClassLevel[];
  abilities: AbilityScores;
  subclassIds: string[];
  featIds: string[];
  fightingStyleIds: string[];
  maneuverIds: string[];
  preparedSpellIds: string[];
  cantripIds?: string[];
  magicInitiateSpellIds?: string[];
  freeSpellIds?: string[];
  weaponIds: string[];
  masteryWeaponIds: string[];
  masteryIds: string[];
  armor: 'none' | 'light' | 'medium' | 'heavy';
  hasShield: boolean;
  speed: number;
  updatedAt: string;
}

export interface CombatContext {
  facts: Record<string, ContextFact>;
  conditions: string[];
  activeConcentrationSpellId?: string;
  targetName: string;
  secondaryTargetName?: string;
}

export interface RuleSource {
  book: string;
  revision: string;
  page: number;
}

export interface OptionRequirement {
  minTotalLevel?: number;
  classId?: TurnClassId;
  minClassLevel?: number;
  ability?: AbilityId;
  abilityMin?: number;
  anyAbility?: AbilityId[];
  feature?:
    | 'spellcasting'
    | 'martial-weapon-training'
    | 'light-armor-training'
    | 'medium-armor-training'
    | 'heavy-armor-training'
    | 'shield-training';
}

export interface CharacterOption {
  id: string;
  name: string;
  kind: OptionKind;
  parentId?: string;
  summary: string;
  requirements?: OptionRequirement[];
  source: RuleSource;
}

export type RuleCondition =
  | { type: 'class-level'; classId: TurnClassId; min: number }
  | { type: 'subclass'; id: string }
  | { type: 'species'; id: string }
  | { type: 'species-choice'; id: string }
  | { type: 'feat'; id: string }
  | { type: 'maneuver'; id: string }
  | { type: 'mastery'; id: string }
  | { type: 'spell-prepared'; id: string }
  | { type: 'fact'; id: string; equals: boolean; label: string }
  | { type: 'any-fact'; ids: string[]; equals: boolean; label: string }
  | { type: 'phase'; value: TurnPhase }
  | { type: 'resource'; id: string; atLeast: number; label: string }
  | { type: 'marker'; id: string; equals: boolean; label: string }
  | { type: 'bonus-action-available' }
  | { type: 'reaction-available' }
  | { type: 'action-available'; allowMagic?: boolean }
  | { type: 'attacks-remaining' }
  | { type: 'has-not-moved' }
  | { type: 'trigger'; value: RuleTrigger }
  | { type: 'not-concentrating' }
  | { type: 'not-raging' }
  | { type: 'spell-slot-unused' }
  | { type: 'spell-slot-available'; minLevel: number }
  | { type: 'armor-not-heavy' };

export type RuleCost =
  | { type: 'action'; allowMagic?: boolean }
  | { type: 'bonus-action' }
  | { type: 'reaction' }
  | { type: 'resource'; id: string; amount: number }
  | { type: 'spell-slot'; level: number }
  | { type: 'sneak-die'; amount: number };

export type RuleEffect =
  | { type: 'marker'; id: string; value: boolean }
  | { type: 'movement-zero' }
  | { type: 'movement-gain'; amount: number | 'speed' | 'half-speed' }
  | { type: 'grant-action'; id: string; allowsMagic: boolean; label: string }
  | { type: 'begin-attack-action' }
  | { type: 'grant-attack'; amount: number }
  | { type: 'consume-attack'; amount: number }
  | { type: 'perform-attack' }
  | { type: 'start-concentration'; spellId: string }
  | { type: 'end-concentration' }
  | { type: 'set-phase'; phase: TurnPhase }
  | { type: 'resource'; id: string; amount: number };

export interface RuleDefinition {
  id: string;
  name: string;
  summary: string;
  origin: 'core' | 'class' | 'subclass' | 'species' | 'feat' | 'spell' | 'weapon';
  originId: string;
  activation: RuleActivation;
  trigger?: RuleTrigger;
  category: 'action' | 'bonus' | 'reaction' | 'movement' | 'modifier' | 'informational';
  conditions: RuleCondition[];
  costs: RuleCost[];
  effects: RuleEffect[];
  support: RuleSupport;
  source: RuleSource;
  tags?: string[];
  referenceText?: string;
  referenceFragment?: string;
}

export interface TurnRuleManifest {
  schemaVersion: 1;
  edition: string;
  revision: string;
  files: string[];
}

export interface TurnRuleFile {
  options?: CharacterOption[];
  rules?: RuleDefinition[];
}

export interface TurnCatalog {
  manifest: TurnRuleManifest;
  options: CharacterOption[];
  rules: RuleDefinition[];
}

export interface ActionToken {
  id: string;
  label: string;
  allowsMagic: boolean;
}

export interface ResourcePool {
  current: number;
  max: number;
  label: string;
}

export interface TimelineEntry {
  id: string;
  title: string;
  detail: string;
  kind: 'decision' | 'result' | 'movement' | 'phase';
}

export interface TurnState {
  phase: TurnPhase;
  actionTokens: ActionToken[];
  bonusActionAvailable: boolean;
  reactionAvailable: boolean;
  movementMax: number;
  movementRemaining: number;
  hasMoved: boolean;
  freeInteractionAvailable: boolean;
  spellSlotUsedThisTurn: boolean;
  concentrationSpellId?: string;
  attacksRemaining: number;
  awaitingAttackOutcome: boolean;
  currentTrigger?: RuleTrigger;
  resources: Record<string, ResourcePool>;
  markers: Record<string, boolean>;
  timeline: TimelineEntry[];
}

export interface EvaluationReason {
  code: string;
  message: string;
  factId?: string;
}

export interface RuleEvaluation {
  rule: RuleDefinition;
  status: 'available' | 'conditional' | 'blocked';
  reasons: EvaluationReason[];
  missingFacts: string[];
}

export type TurnDecision =
  | { type: 'apply-rule'; ruleId: string }
  | { type: 'move'; distance: number }
  | { type: 'set-resource'; resourceId: string; current: number }
  | { type: 'set-concentration'; spellId?: string }
  | { type: 'attack-result'; result: 'hit' | 'miss' }
  | { type: 'clear-trigger' }
  | { type: 'end-turn' }
  | { type: 'start-next-turn' };

export interface TurnDraft {
  profileId: string;
  context: CombatContext;
  decisions: TurnDecision[];
  updatedAt: string;
}

export interface TurnDraftExportV1 {
  schemaVersion: 1;
  exportedAt: string;
  profiles: CharacterProfile[];
  drafts: TurnDraft[];
}
