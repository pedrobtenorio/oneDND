import { TestBed } from '@angular/core/testing';

import { MonsterFormService } from './monster-form.service';
import { createEmptyMonster, createEntryByType } from '../utils/monster-builder';

describe('MonsterFormService', () => {
  let service: MonsterFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MonsterFormService);
  });

  it('creates a form and reads it back as a monster sheet', () => {
    const monster = createEmptyMonster();
    const form = service.createMonsterForm(monster);

    form.patchValue({
      name: 'Sentinela Arcano',
      selectedLanguages: ['Comum'],
      extraLanguages: 'telepatia 18 m',
      abilities: {
        str: { score: 18, save: '+6' },
      },
    });

    const sheet = service.toMonsterSheet(form);

    expect(sheet.name).toBe('Sentinela Arcano');
    expect(sheet.languages).toBe('Comum; telepatia 18 m');
    expect(sheet.abilities.str).toEqual({ score: 18, save: '+6' });
  });

  it('loads another monster into the same form', () => {
    const form = service.createMonsterForm(createEmptyMonster());
    const nextMonster = {
      ...createEmptyMonster(),
      name: 'Guardião Solar',
      actions: [createEntryByType('save')],
    };

    service.loadMonster(form, nextMonster);
    const sheet = service.toMonsterSheet(form);

    expect(sheet.name).toBe('Guardião Solar');
    expect(sheet.actions.length).toBe(1);
    expect(sheet.actions[0].type).toBe('save');
  });

  it('creates spell group controls from defaults', () => {
    const entryGroup = service.createEntryGroup(createEntryByType('spellcasting'));
    const spellGroups = entryGroup.get('spellGroups');

    expect(spellGroups?.value).toEqual([
      jasmine.objectContaining({ rechargeType: 'at-will', uses: '', spellIds: [] }),
    ]);
  });
});
