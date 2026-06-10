import { MonsterStorageService } from './monster-storage.service';
import { createEmptyMonster } from '../utils/monster-builder';

describe('MonsterStorageService', () => {
  let service: MonsterStorageService;

  beforeEach(() => {
    localStorage.clear();
    service = new MonsterStorageService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('exports saved monsters as cloned data', () => {
    const monster = { ...createEmptyMonster(), id: 'monster-a', name: 'Sentinela' };

    service.saveMonster(monster);
    const exported = service.exportMonsters();
    exported[0].name = 'Alterado';

    expect(service.exportMonsters()[0].name).toBe('Sentinela');
  });

  it('parses backups from array or wrapped payload', () => {
    const monster = { ...createEmptyMonster(), id: 'monster-a' };

    expect(service.parseMonsterBackup(JSON.stringify([monster]))).toEqual([monster]);
    expect(service.parseMonsterBackup(JSON.stringify({ monsters: [monster] }))).toEqual([monster]);
  });

  it('imports monsters by merging on id', () => {
    const original = { ...createEmptyMonster(), id: 'monster-a', name: 'Original' };
    const updated = { ...createEmptyMonster(), id: 'monster-a', name: 'Atualizado' };
    const next = { ...createEmptyMonster(), id: 'monster-b', name: 'Novo' };

    service.saveMonster(original);
    const importedCount = service.importMonsters([updated, next]);
    const exported = service.exportMonsters();

    expect(importedCount).toBe(2);
    expect(exported.map((monster) => monster.name).sort()).toEqual(['Atualizado', 'Novo']);
  });

  it('rejects invalid backup payloads', () => {
    expect(() => service.parseMonsterBackup(JSON.stringify({ bad: true }))).toThrowError(
      'Arquivo de backup inválido.'
    );
  });
});
