import { monsterToMarkdown } from './monster-markdown';
import { createEmptyMonster, createEntryByType } from './monster-builder';
import { MonsterEntry } from '../models/monster.models';

describe('monster markdown export', () => {
  it('exports core monster fields and sections', () => {
    const attack = {
      ...createEntryByType('attack'),
      name: 'Garra',
      attackBonus: '+5',
      hitAverage: '8',
      hitFormula: '1d8 + 4',
      damageType: 'cortante',
    } as Extract<MonsterEntry, { type: 'attack' }>;
    const monster = {
      ...createEmptyMonster(),
      name: 'Guardião Solar',
      actions: [attack],
    };

    const markdown = monsterToMarkdown(monster);

    expect(markdown).toContain('# Guardião Solar');
    expect(markdown).toContain('| For | 10 | +0 | +0 |');
    expect(markdown).toContain('## Ações');
    expect(markdown).toContain('### Garra');
    expect(markdown).toContain('Acerto: 8 (1d8 + 4) de dano cortante.');
  });
});
