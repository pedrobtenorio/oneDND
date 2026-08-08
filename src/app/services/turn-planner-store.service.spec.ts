import { TurnCatalog } from '../models/turn-planner.models';
import { TurnPlannerStore } from './turn-planner-store.service';

import { CharacterProfile } from '../models/turn-planner.models';

const character: CharacterProfile = {
  id: 'profile-1',
  name: 'Artemis',
  speciesId: 'humano',
  classes: [{ classId: 'ladino', level: 4, order: 0 }],
  abilities: { strength: 10, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 12, charisma: 10 },
  subclassIds: ['ladrao'],
  featIds: ['sortudo'],
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
};

const catalog: TurnCatalog = {
  manifest: { schemaVersion: 1, edition: '2024', revision: 'teste', files: [] },
  options: [],
  rules: [],
};

describe('TurnPlannerStore combat lifecycle', () => {
  it('clears action history without restoring spent resources', () => {
    const store = new TurnPlannerStore();
    store.load(character, catalog, { facts: {}, conditions: [], targetName: 'Alvo' });
    store.setResource('luck-point', 0);
    store.move(3);
    expect(store.currentState?.timeline.length).toBe(1);

    store.clearHistoryPreservingResources();

    expect(store.currentState?.timeline).toEqual([]);
    expect(store.currentState?.resources['luck-point'].current).toBe(0);
    expect(store.currentState?.movementRemaining).toBe(9);
  });

  it('recovers Long Rest resources after the combat history is cleared', () => {
    const store = new TurnPlannerStore();
    store.load(character, catalog, { facts: {}, conditions: [], targetName: 'Alvo' });
    store.setResource('luck-point', 0);
    store.clearHistoryPreservingResources();

    expect(store.takeRest('short')).toEqual([]);
    expect(store.currentState?.resources['luck-point'].current).toBe(0);
    expect(store.takeRest('long')).toEqual(['Pontos de Sorte']);
    expect(store.currentState?.resources['luck-point'].current).toBe(2);
  });
});
