import { TestBed } from '@angular/core/testing';

import { CharacterProfile, TurnDraftExportV1 } from '../models/turn-planner.models';
import { TurnPlannerStorageService } from './turn-planner-storage.service';
import { profileArt } from '../utils/class-visuals';

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
  it('preserves a portrait through storage reload and library export/import', () => {
    const service = TestBed.inject(TurnPlannerStorageService);
    service.upsertProfile({ ...profile(), portraitId:'elves-ranger+female' });
    const reloaded = new TurnPlannerStorageService();
    expect(reloaded.profiles[0].portraitId).toBe('elves-ranger+female');
    reloaded.importLibrary(reloaded.exportLibrary());
    expect(reloaded.profiles.every(p => p.portraitId === 'elves-ranger+female')).toBeTrue();
    expect(profileArt(reloaded.profiles[0])).toBe('/assets/art/elves-ranger+female.webp');
  });

  it('preserves missing portrait IDs with a safe class fallback and rejects URLs on import', () => {
    const service = TestBed.inject(TurnPlannerStorageService);
    const original = { ...profile(), portraitId:'removed-portrait' };
    service.importLibrary(JSON.stringify({schemaVersion:1, profiles:[original], drafts:[]}));
    expect(service.profiles[0].portraitId).toBe('removed-portrait');
    expect(profileArt(service.profiles[0])).toBe('/assets/art/humans-thief+female.webp');
    expect(() => service.importLibrary(JSON.stringify({schemaVersion:1, profiles:[{...original, portraitId:'https://example.com/a.png'}], drafts:[]}))).toThrow();
    expect(service.profiles.length).toBe(1);
  });
  beforeEach(() => {
    for (const key of ['profiles.v1','profiles.v2','drafts.v1','drafts.v2','backup.v1']) localStorage.removeItem(`dnd.turn-planner.${key}`);
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
      combatEnded: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const reloaded = new TurnPlannerStorageService();
    expect(reloaded.profiles[0].id).toBe('profile-1');
    expect(reloaded.getDraft('profile-1')?.decisions).toEqual([{ type: 'move', distance: 3 }]);
    expect(reloaded.getDraft('profile-1')?.combatEnded).toBeTrue();
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
  it('backs up v1 and migrates without applying any ability bonuses', () => {
    const old = profile();
    localStorage.setItem('dnd.turn-planner.profiles.v1', JSON.stringify([old]));
    localStorage.setItem('dnd.turn-planner.drafts.v1', '[]');
    const service = TestBed.inject(TurnPlannerStorageService);
    expect(service.profiles[0].abilities).toEqual(old.abilities);
    expect(service.profiles[0].abilityMode).toBe('legacy-final');
    expect(service.profiles[0].needsReview).toBeTrue();
    expect(service.profiles[0].id).toBe(old.id);
    expect(localStorage.getItem('dnd.turn-planner.backup.v1')).not.toBeNull();
    expect(localStorage.getItem('dnd.turn-planner.profiles.v1')).toBe(JSON.stringify([old]));
    expect(JSON.parse(service.exportLibrary()).schemaVersion).toBe(2);
  });

  it('round-trips level 8 v2 profiles with source selections and base abilities', () => {
    const service = TestBed.inject(TurnPlannerStorageService);
    const p = profile(); p.classes[0].level=8;
    p.abilityMode='base'; p.baseAbilities={...p.abilities,dexterity:12,intelligence:9}; p.backgroundId='background.criminoso';
    p.backgroundBonuses={dexterity:2,intelligence:1};
    p.choices={invocations:['invocation.pacto-da-lamina']};
    p.spellSelections={'class.mago':['luz']};
    p.featSelections=[{source:'class.ladino.4',optionId:'aumento-no-valor-de-atributo',bonuses:{dexterity:2}}];
    service.importLibrary(JSON.stringify({schemaVersion:2,profiles:[p],drafts:[]}));
    const saved = new TurnPlannerStorageService().profiles[0];
    expect(saved).toEqual(p);
    expect(JSON.parse(service.exportLibrary()).profiles[0]).toEqual(p);
  });

  it('rejects malformed v2 source allocations before changing the library', () => {
    const service = TestBed.inject(TurnPlannerStorageService);
    const p = {...profile(),abilityMode:'base',baseAbilities:profile().abilities,spellSelections:{mago:'invalid'}};
    expect(() => service.importLibrary(JSON.stringify({schemaVersion:2,profiles:[p],drafts:[]}))).toThrow();
    expect(service.profiles).toEqual([]);
  });

  it('rejects v2 profiles whose final abilities would apply bonuses twice', () => {
    const service = TestBed.inject(TurnPlannerStorageService);
    const p = profile();
    p.abilityMode='base'; p.baseAbilities={...p.abilities}; p.backgroundId='background.criminoso';
    p.backgroundBonuses={dexterity:2,intelligence:1}; p.featSelections=[];
    expect(() => service.importLibrary(JSON.stringify({schemaVersion:2,profiles:[p],drafts:[]}))).toThrowError(/Atributos finais/);
    expect(service.profiles).toEqual([]);
  });

  it('keeps the original library accessible when backup storage fails', () => {
    const old = profile();
    localStorage.setItem('dnd.turn-planner.profiles.v1',JSON.stringify([old]));
    spyOn(localStorage,'setItem').and.throwError('quota');
    const service = TestBed.inject(TurnPlannerStorageService);
    expect(service.profiles[0].id).toBe(old.id);
    expect(service.profiles[0].abilities).toEqual(old.abilities);
    expect(localStorage.getItem('dnd.turn-planner.profiles.v2')).toBeNull();
  });

});
