import {
  validateGuideData,
  validateSpellData,
  validateSummonData,
  validateTurnRuleFile,
  validateWeaponsData,
} from './data-validation';

describe('data validation utilities', () => {
  it('accepts minimally valid spell data', () => {
    expect(
      validateSpellData([
        {
          id: 'luz',
          name: 'Luz',
          level: 0,
          school: 'Evocação',
          classes: ['Mago'],
          castingTime: 'Ação',
          range: 'Toque',
          components: ['V', 'M'],
          duration: '1 hora',
          description: 'Cria luz.',
        },
      ])
    ).toEqual(jasmine.any(Array));
  });

  it('rejects malformed guide data with a useful error', () => {
    expect(() => validateGuideData([{ id: 'combate', items: [] }])).toThrowError(
      'guide data has an invalid item at index 0.'
    );
  });

  it('accepts minimally valid summon data', () => {
    const ability = { value: 10, mod: '+0' };

    expect(
      validateSummonData([
        {
          id: 'espirito',
          name: 'Espírito',
          type: 'Celestial Médio',
          ac: '11',
          hp: '10',
          speed: '9 m',
          str: ability,
          dex: ability,
          con: ability,
          int: ability,
          wis: ability,
          cha: ability,
          senses: 'Percepção Passiva 10',
          languages: 'Comum',
          cr: '1',
        },
      ])
    ).toEqual(jasmine.any(Array));
  });

  it('rejects malformed weapons data', () => {
    expect(() => validateWeaponsData({ properties: [], masteryProperties: [], categories: [{}] }))
      .toThrowError('weapon categories has an invalid item at index 0.');
  });

  it('rejects unknown turn-rule operators', () => {
    expect(() =>
      validateTurnRuleFile({
        rules: [
          {
            id: 'bad-rule',
            name: 'Inválida',
            summary: 'Operador desconhecido.',
            origin: 'core',
            originId: 'test',
            activation: 'free',
            category: 'modifier',
            conditions: [{ type: 'eval-javascript' }],
            costs: [],
            effects: [],
            support: 'structured',
            source: { book: 'Livro do Jogador', revision: '2024', page: 1 },
          },
        ],
      })
    ).toThrowError('turn rule file has invalid options or rules.');
  });
});
