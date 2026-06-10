import { buildDescriptionParts, normalizeKey } from './linkify';

describe('linkify utilities', () => {
  it('normalizes accents and casing for search keys', () => {
    expect(normalizeKey('  Ação Bônus  ')).toBe('acao bonus');
    expect(normalizeKey('CÍRCULO Mágico')).toBe('circulo magico');
  });

  it('links known terms while preserving markdown formatting', () => {
    const condition = { id: 'caido', name: 'Caído', description: 'Condição' };
    const parts = buildDescriptionParts('O alvo fica **caído**.', [condition]);

    expect(parts).toEqual([
      { text: 'O alvo fica ', bold: false, italic: false },
      { text: 'caído', linkItem: condition, bold: true, italic: false },
      { text: '.', bold: false, italic: false },
    ]);
  });

  it('matches simple gender and plural aliases', () => {
    const condition = { id: 'agarrado', name: 'Agarrado', description: 'Condição' };
    const parts = buildDescriptionParts('Criaturas agarradas têm deslocamento 0.', [condition]);

    expect(parts.some((part) => part.text === 'agarradas' && part.linkItem === condition)).toBeTrue();
  });
});
