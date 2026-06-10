import {
  buildLanguagesText,
  calculateAbilityModifier,
  createEntryByType,
  formatModifier,
  formatSpellGroupLabel,
  parseLanguagesText,
  parseSpellGroupLabel,
} from './monster-builder';

describe('monster builder utilities', () => {
  it('calculates and formats ability modifiers', () => {
    expect(calculateAbilityModifier(8)).toBe(-1);
    expect(calculateAbilityModifier(10)).toBe(0);
    expect(calculateAbilityModifier(18)).toBe(4);
    expect(formatModifier(3)).toBe('+3');
    expect(formatModifier(-2)).toBe('-2');
  });

  it('formats and parses spell group labels', () => {
    expect(formatSpellGroupLabel({ rechargeType: 'at-will', uses: '' })).toBe('À vontade');
    expect(formatSpellGroupLabel({ rechargeType: 'per-day', uses: '3' })).toBe('3/dia');
    expect(parseSpellGroupLabel('2/rodada')).toEqual({ rechargeType: 'per-round', uses: '2' });
    expect(parseSpellGroupLabel('Por turno')).toEqual({ rechargeType: 'per-turn', uses: '' });
  });

  it('round-trips known and extra languages', () => {
    const text = buildLanguagesText(['Comum', 'Élfico'], 'telepatia 18 m');
    expect(text).toBe('Comum, Élfico; telepatia 18 m');
    expect(parseLanguagesText(text)).toEqual({
      selected: ['Comum', 'Élfico'],
      extra: 'telepatia 18 m',
    });
  });

  it('creates typed entries with localized defaults', () => {
    const saveEntry = createEntryByType('save');
    const spellcastingEntry = createEntryByType('spellcasting');

    expect(saveEntry.name).toBe('Nova Ação de Salvaguarda');
    expect(saveEntry.type === 'save' ? saveEntry.range : '').toBe('até 9 m');
    expect(spellcastingEntry.name).toBe('Conjuração');
  });
});
