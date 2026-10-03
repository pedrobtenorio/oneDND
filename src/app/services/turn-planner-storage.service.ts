import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  CharacterProfile,
  TurnDraft,
  TurnDraftExportV2,
} from '../models/turn-planner.models';

const PROFILE_KEY = 'dnd.turn-planner.profiles.v2';
const DRAFT_KEY = 'dnd.turn-planner.drafts.v2';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const classIds = new Set([
  'barbaro', 'bardo', 'bruxo', 'clerigo', 'druida', 'feiticeiro',
  'guardiao', 'guerreiro', 'ladino', 'mago', 'monge', 'paladino',
]);
const armors = new Set(['none', 'light', 'medium', 'heavy']);
const abilityIds = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
const decisionTypes = new Set([
  'apply-rule',
  'move',
  'set-resource',
  'set-concentration',
  'attack-result',
  'clear-trigger',
  'end-turn',
  'start-next-turn',
]);

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`;

@Injectable({ providedIn: 'root' })
export class TurnPlannerStorageService {
  private readonly storageWarningSubject = new BehaviorSubject<string | null>(null);
  private readonly migration = this.migrateLibrary();
  private readonly profilesSubject = new BehaviorSubject<CharacterProfile[]>(this.read(PROFILE_KEY));
  private readonly draftsSubject = new BehaviorSubject<TurnDraft[]>(this.read(DRAFT_KEY));

  readonly profiles$ = this.profilesSubject.asObservable();
  readonly drafts$ = this.draftsSubject.asObservable();
  readonly storageWarning$ = this.storageWarningSubject.asObservable();

  get profiles(): CharacterProfile[] {
    return this.profilesSubject.value;
  }

  get drafts(): TurnDraft[] {
    return this.draftsSubject.value;
  }

  upsertProfile(profile: CharacterProfile): void {
    const profiles = this.profiles.filter((item) => item.id !== profile.id);
    profiles.push({ ...profile, updatedAt: new Date().toISOString() });
    this.persist(PROFILE_KEY, profiles, this.profilesSubject);
  }

  deleteProfile(profileId: string): void {
    this.persist(PROFILE_KEY, this.profiles.filter((item) => item.id !== profileId), this.profilesSubject);
    this.persist(DRAFT_KEY, this.drafts.filter((item) => item.profileId !== profileId), this.draftsSubject);
  }

  saveDraft(draft: TurnDraft): void {
    const drafts = this.drafts.filter((item) => item.profileId !== draft.profileId);
    drafts.push({ ...draft, updatedAt: new Date().toISOString() });
    this.persist(DRAFT_KEY, drafts, this.draftsSubject);
  }

  getDraft(profileId: string): TurnDraft | undefined {
    return this.drafts.find((item) => item.profileId === profileId);
  }

  exportLibrary(): string {
    const value: TurnDraftExportV2 = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      profiles: this.profiles,
      drafts: this.drafts,
    };
    return JSON.stringify(value, null, 2);
  }

  importLibrary(raw: string): { profiles: number; drafts: number } {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || ![1, 2].includes(parsed['schemaVersion'] as number)) {
      throw new Error('Arquivo incompatível: schemaVersion 1 ou 2 era esperado.');
    }
    if (!Array.isArray(parsed['profiles']) || !Array.isArray(parsed['drafts'])) {
      throw new Error('Arquivo inválido: perfis e rascunhos são obrigatórios.');
    }

    const importedProfiles = parsed['profiles'].map((value) => this.assertProfile(value, parsed['schemaVersion'] === 1));
    const importedDrafts = parsed['drafts'].map((value) => this.assertDraft(value));
    const usedIds = new Set(this.profiles.map((item) => item.id));
    const idMap = new Map<string, string>();
    const profiles = importedProfiles.map((profile) => {
      const original = profile.id;
      const id = usedIds.has(original) ? newId() : original;
      usedIds.add(id);
      idMap.set(original, id);
      return { ...profile, id, name: id === original ? profile.name : `${profile.name} (importado)` };
    });
    const importedProfileIds = new Set(importedProfiles.map((item) => item.id));
    const drafts = importedDrafts
      .filter((draft) => importedProfileIds.has(draft.profileId))
      .map((draft) => ({ ...draft, profileId: idMap.get(draft.profileId) ?? draft.profileId }));

    this.persist(PROFILE_KEY, [...this.profiles, ...profiles], this.profilesSubject);
    this.persist(DRAFT_KEY, [...this.drafts, ...drafts], this.draftsSubject);
    return { profiles: profiles.length, drafts: drafts.length };
  }

  private migrateLibrary(): void {
    try {
      const store = globalThis.localStorage;
      if (!store || store.getItem(PROFILE_KEY) !== null) return;
      const profiles = store.getItem('dnd.turn-planner.profiles.v1');
      const drafts = store.getItem('dnd.turn-planner.drafts.v1');
      if (!profiles && !drafts) return;
      const backupKey = 'dnd.turn-planner.backup.v1';
      if (store.getItem(backupKey) === null) store.setItem(backupKey, JSON.stringify({ profiles, drafts }));
      const oldProfiles: unknown = JSON.parse(profiles ?? '[]');
      if (!Array.isArray(oldProfiles)) throw new Error('Biblioteca antiga inválida');
      const migrated = oldProfiles.map(value => ({ ...value, abilityMode: 'legacy-final', needsReview: true }));
      store.setItem(DRAFT_KEY, drafts ?? '[]');
      store.setItem(PROFILE_KEY, JSON.stringify(migrated));
    } catch {
      this.storageWarningSubject.next('Não foi possível migrar a biblioteca. O original foi preservado; exporte um backup antes de continuar.');
    }
  }

  private read<T>(key: string): T[] {
    try {
      const raw = globalThis.localStorage?.getItem(key) ?? globalThis.localStorage?.getItem(key.replace('.v2', '.v1'));
      const value: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? (value as T[]) : [];
    } catch {
      return [];
    }
  }

  private persist<T>(key: string, value: T[], subject: BehaviorSubject<T[]>): void {
    subject.next(value);
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
      this.storageWarningSubject.next(null);
    } catch {
      this.storageWarningSubject.next('O armazenamento local falhou. Esta sessão continua, mas pode não ser salva.');
    }
  }

  private assertProfile(value: unknown, legacy = false): CharacterProfile {
    const abilities = isRecord(value) && isRecord(value['abilities']) ? value['abilities'] : null;
    const classes = isRecord(value) && Array.isArray(value['classes']) ? value['classes'] : null;
    if (
      !isRecord(value) ||
      typeof value['id'] !== 'string' ||
      typeof value['name'] !== 'string' ||
      typeof value['speciesId'] !== 'string' ||
      !classes ||
      !classes.every((entry) =>
        isRecord(entry) &&
        typeof entry['classId'] === 'string' &&
        classIds.has(entry['classId']) &&
        isFiniteNumber(entry['level']) &&
        Number.isInteger(entry['level']) &&
        entry['level'] >= 1 &&
        entry['level'] <= 8 &&
        isFiniteNumber(entry['order']) &&
        Number.isInteger(entry['order'])
      ) ||
      !abilities ||
      !abilityIds.every((ability) => isFiniteNumber(abilities[ability]) && Number.isInteger(abilities[ability]) && abilities[ability] >= 1 && abilities[ability] <= 20) ||
      !isStringArray(value['subclassIds']) ||
      !isStringArray(value['featIds']) ||
      !isStringArray(value['fightingStyleIds']) ||
      !isStringArray(value['maneuverIds']) ||
      !isStringArray(value['preparedSpellIds']) ||
      (value['cantripIds'] !== undefined && !isStringArray(value['cantripIds'])) ||
      (value['magicInitiateSpellIds'] !== undefined && !isStringArray(value['magicInitiateSpellIds'])) ||
      (value['freeSpellIds'] !== undefined && !isStringArray(value['freeSpellIds'])) ||
      !isStringArray(value['weaponIds']) ||
      !isStringArray(value['masteryWeaponIds']) ||
      !isStringArray(value['masteryIds']) ||
      typeof value['armor'] !== 'string' ||
      !armors.has(value['armor']) ||
      typeof value['hasShield'] !== 'boolean' ||
      !isFiniteNumber(value['speed']) ||
      typeof value['updatedAt'] !== 'string'
    ) {
      throw new Error('Arquivo inválido: perfil malformado.');
    }
    const profile = value as unknown as CharacterProfile;
    const total = profile.classes.reduce((n, c) => n + c.level, 0);
    if (total < 1 || total > 8 || new Set(profile.classes.map(c => c.classId)).size !== profile.classes.length) throw new Error('Nível total inválido: esperado entre 1 e 8, sem classes repetidas.');
    if (legacy || !profile.abilityMode) return { ...profile, abilityMode: 'legacy-final', needsReview: true };
    if (!['base', 'legacy-final'].includes(profile.abilityMode)) throw new Error('Modo de atributos inválido.');
    for (const choices of [profile.choices, profile.spellSelections]) {
      if (choices !== undefined && (!isRecord(choices) || !Object.values(choices).every(isStringArray))) throw new Error('Escolhas malformadas.');
    }
    if (profile.baseAbilities && !abilityIds.every(id => Number.isInteger(profile.baseAbilities?.[id]) && profile.baseAbilities![id] >= 1 && profile.baseAbilities![id] <= 20)) throw new Error('Atributos base inválidos.');
    if (profile.backgroundBonuses && !Object.values(profile.backgroundBonuses).every(n => Number.isInteger(n) && n >= 0 && n <= 2)) throw new Error('Bônus de antecedente inválidos.');
    if (profile.featSelections && (!Array.isArray(profile.featSelections) || !profile.featSelections.every(f => isRecord(f) && typeof f['source'] === 'string' && typeof f['optionId'] === 'string' && isRecord(f['bonuses']) && Object.values(f['bonuses']).every(n => isFiniteNumber(n) && Number.isInteger(n) && n >= 0 && n <= 2)))) throw new Error('Talentos malformados.');
    if (profile.abilityMode === 'base') {
      if (!profile.baseAbilities || typeof profile.backgroundId !== 'string' || !profile.backgroundId || !profile.backgroundBonuses || !profile.featSelections) throw new Error('Perfil v2 incompleto: origem, atributos base e talentos são obrigatórios.');
      if (Object.values(profile.backgroundBonuses).reduce((sum, value) => sum + (value ?? 0), 0) !== 3) throw new Error('Bônus de antecedente inválidos: três pontos eram esperados.');
      for (const id of abilityIds) {
        const featBonus = profile.featSelections.reduce((sum, feat) => sum + (feat.bonuses[id] ?? 0), 0);
        if (profile.abilities[id] !== profile.baseAbilities[id] + (profile.backgroundBonuses[id] ?? 0) + featBonus) throw new Error('Atributos finais não correspondem às escolhas de origem e talentos.');
      }
    }
    return profile;
  }

  private assertDraft(value: unknown): TurnDraft {
    const context = isRecord(value) && isRecord(value['context']) ? value['context'] : null;
    const facts = context && isRecord(context['facts']) ? context['facts'] : null;
    if (
      !isRecord(value) ||
      typeof value['profileId'] !== 'string' ||
      !context ||
      !facts ||
      !Object.values(facts).every((fact) => fact === true || fact === false || fact === 'unknown') ||
      !isStringArray(context['conditions']) ||
      typeof context['targetName'] !== 'string' ||
      (context['secondaryTargetName'] !== undefined && typeof context['secondaryTargetName'] !== 'string') ||
      (context['activeConcentrationSpellId'] !== undefined && typeof context['activeConcentrationSpellId'] !== 'string') ||
      !Array.isArray(value['decisions']) ||
      !value['decisions'].every((decision) =>
        isRecord(decision) && typeof decision['type'] === 'string' && decisionTypes.has(decision['type'])
      ) ||
      (value['combatEnded'] !== undefined && typeof value['combatEnded'] !== 'boolean') ||
      typeof value['updatedAt'] !== 'string'
    ) {
      throw new Error('Arquivo inválido: rascunho malformado.');
    }
    return value as unknown as TurnDraft;
  }
}
