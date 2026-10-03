import { CHARACTER_PORTRAITS, PORTRAIT_CLASS_LABELS } from './portrait-catalog';
import { TurnClassId } from '../models/turn-planner.models';
import { PortraitPickerComponent } from '../character-builder/portrait-picker.component';

describe('character portrait gallery', () => {
  it('offers masculine and feminine artwork for every class style', () => {
    for (const style of Object.keys(PORTRAIT_CLASS_LABELS) as TurnClassId[]) {
      for (const appearance of ['masculina','feminina']) {
        expect(CHARACTER_PORTRAITS.some(p => p.styles.includes(style) && p.appearance === appearance)).withContext(`${style}: ${appearance}`).toBeTrue();
      }
    }
    expect(new Set(CHARACTER_PORTRAITS.map(p => p.id)).size).toBe(CHARACTER_PORTRAITS.length);
  });

  it('combines class, origin and appearance filters without changing the chosen portrait', () => {
    const picker = new PortraitPickerComponent();
    picker.selectedId = 'humans-mage';
    picker.styleFilter = 'ladino'; picker.originFilter = 'elfo'; picker.appearanceFilter = 'feminina';
    expect(picker.filteredPortraits.some(p => p.id === 'elves-ranger+female')).toBeTrue();
    expect(picker.filteredPortraits.every(p => p.styles.includes('ladino') && p.origin === 'elfo' && p.appearance === 'feminina')).toBeTrue();
    expect(picker.selectedId).toBe('humans-mage');
    picker.clearFilters();
    expect(picker.filteredPortraits.length).toBe(CHARACTER_PORTRAITS.length);
  });

  it('finds PrintableHeroes goliaths by collection, origin and appearance', () => {
    const picker = new PortraitPickerComponent();
    picker.collectionFilter = 'printableheroes';
    picker.originFilter = 'golias';
    for (const appearance of ['masculina', 'feminina']) {
      picker.appearanceFilter = appearance;
      expect(picker.filteredPortraits.length).withContext(appearance).toBeGreaterThan(0);
      expect(picker.filteredPortraits.every(p => p.id.startsWith('printableheroes-') && p.origin === 'golias' && p.appearance === appearance)).toBeTrue();
    }
    picker.clearFilters();
    expect(picker.filteredPortraits.length).toBe(CHARACTER_PORTRAITS.length);
  });
});
