import { TestBed } from '@angular/core/testing';

import { CharacterProfile, TurnDraftExportV1 } from '../models/turn-planner.models';
import { TurnPlannerStorageService } from './turn-planner-storage.service';

const profile = (id = 'profile-1'): CharacterProfile => ({
  id,
  name: 'Artemis',
  speciesId: 'humano',
  classes: [{ classId: 'ladino', level: 3, order: 0 }],
  abilities: { strength: 10, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 12, charisma: 10 },
  subclassIds: ['ladrao'],
  featIds: ['alerta', 'sortudo'],
  fightingStyleIds: [],
  maneuverIds: [],
  preparedSpellIds: [],
  weaponIds: ['weapon-rapieira'],
  masteryWeaponIds: ['weapon-rapieira'],
  masteryIds: ['mastery-afligir'],
  armor: 'light',
  hasShield: false,
  speed: 9,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('TurnPlannerStorageService', () => {
  beforeEach(() => {
    localStorage.removeItem('dnd.turn-planner.profiles.v1');
    localStorage.removeItem('dnd.turn-planner.drafts.v1');
    TestBed.configureTestingModule({ providers: [TurnPlannerStorageService] });
  });

  it('persists profiles and event-log drafts', () => {
    const service = TestBed.inject(TurnPlannerStorageService);
    service.upsertProfile(profile());
    service.saveDraft({
      profileId: 'profile-1',
      context: { facts: {}, conditions: [], targetName: 'Alvo' },
      decisions: [{ type: 'move', distance: 3 }],
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const reloaded = new TurnPlannerStorageService();
    expect(reloaded.profiles[0].id).toBe('profile-1');
    expect(reloaded.getDraft('profile-1')?.decisions).toEqual([{ type: 'move', distance: 3 }]);
  });

  it('imports collisions as copies without overwriting local data', () => {
    const service = TestBed.inject(TurnPlannerStorageService);
    service.upsertProfile(profile());
    const payload: TurnDraftExportV1 = {
      schemaVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      profiles: [profile()],
      drafts: [],
    };

    service.importLibrary(JSON.stringify(payload));
    expect(service.profiles.length).toBe(2);
    expect(new Set(service.profiles.map((item) => item.id)).size).toBe(2);
    expect(service.profiles.some((item) => item.name.includes('importado'))).toBeTrue();
  });

  it('validates a complete import before persisting it', () => {
    const service = TestBed.inject(TurnPlannerStorageService);
    service.upsertProfile(profile());
    expect(() => service.importLibrary('{"schemaVersion":1,"profiles":[{}],"drafts":[]}')).toThrow();
    const malformed = profile('malformed');
    (malformed.abilities as unknown as Record<string, unknown>)['dexterity'] = 'dezesseis';
    expect(() => service.importLibrary(JSON.stringify({
      schemaVersion: 1,
      profiles: [malformed],
      drafts: [],
    }))).toThrow();
    expect(service.profiles.map((item) => item.id)).toEqual(['profile-1']);
  });
});
