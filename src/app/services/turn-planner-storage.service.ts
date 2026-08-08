import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  CharacterProfile,
  TurnDraft,
  TurnDraftExportV1,
} from '../models/turn-planner.models';

const PROFILE_KEY = 'dnd.turn-planner.profiles.v1';
const DRAFT_KEY = 'dnd.turn-planner.drafts.v1';

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
  private readonly profilesSubject = new BehaviorSubject<CharacterProfile[]>(this.read(PROFILE_KEY));
  private readonly draftsSubject = new BehaviorSubject<TurnDraft[]>(this.read(DRAFT_KEY));
  private readonly storageWarningSubject = new BehaviorSubject<string | null>(null);

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
    const value: TurnDraftExportV1 = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      profiles: this.profiles,
      drafts: this.drafts,
    };
    return JSON.stringify(value, null, 2);
  }

  importLibrary(raw: string): { profiles: number; drafts: number } {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed['schemaVersion'] !== 1) {
      throw new Error('Arquivo incompatível: schemaVersion 1 era esperado.');
    }
    if (!Array.isArray(parsed['profiles']) || !Array.isArray(parsed['drafts'])) {
      throw new Error('Arquivo inválido: perfis e rascunhos são obrigatórios.');
    }

    const importedProfiles = parsed['profiles'].map((value) => this.assertProfile(value));
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

  private read<T>(key: string): T[] {
    try {
      const raw = globalThis.localStorage?.getItem(key);
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

  private assertProfile(value: unknown): CharacterProfile {
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
        entry['level'] <= 6 &&
        isFiniteNumber(entry['order']) &&
        Number.isInteger(entry['order'])
      ) ||
      !abilities ||
      !['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
        .every((ability) => isFiniteNumber(abilities[ability])) ||
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
    return value as unknown as CharacterProfile;
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
