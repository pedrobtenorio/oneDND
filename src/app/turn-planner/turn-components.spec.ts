import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { CharacterProfile, RuleEvaluation, TurnCatalog, TurnState } from '../models/turn-planner.models';
import { Spell } from '../models/spell.models';
import { CharacterBuilderComponent } from '../character-builder/character-builder.component';
import { CheckboxChoiceGroupComponent } from '../character-builder/checkbox-choice-group.component';
import { TurnActionBoardComponent } from './turn-action-board.component';
import { describeRemainingTurnEconomy } from './turn-planner.component';
import { TurnResourceBarComponent } from './turn-resource-bar.component';

describe('turn planner components', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TurnActionBoardComponent, TurnResourceBarComponent] });
  });

  it('exposes action cards as keyboard-native buttons with complete labels', () => {
    const fixture: ComponentFixture<TurnActionBoardComponent> = TestBed.createComponent(TurnActionBoardComponent);
    const evaluation: RuleEvaluation = {
      rule: {
        id: 'steady-aim',
        name: 'Mira Firme',
        summary: 'Concede Vantagem.',
        origin: 'class',
        originId: 'ladino',
        activation: 'bonus-action',
        category: 'bonus',
        conditions: [],
        costs: [],
        effects: [],
        support: 'structured',
        source: { book: 'Livro do Jogador', revision: '2024', page: 131 },
      },
      status: 'available',
      reasons: [],
      missingFacts: [],
    };
    fixture.componentInstance.evaluations = [evaluation];
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button.rule-card'));
    expect(button.nativeElement.getAttribute('aria-label')).toBe('Mira Firme: Disponível');
    expect(button.nativeElement.tabIndex).toBe(0);
  });

  it('announces resource changes through a polite live region', () => {
    const fixture: ComponentFixture<TurnResourceBarComponent> = TestBed.createComponent(TurnResourceBarComponent);
    fixture.componentInstance.state = {
      phase: 'own-turn',
      actionTokens: [{ id: 'standard', label: 'Ação', allowsMagic: true }],
      bonusActionAvailable: true,
      reactionAvailable: true,
      movementMax: 9,
      movementRemaining: 9,
      hasMoved: false,
      freeInteractionAvailable: true,
      spellSlotUsedThisTurn: false,
      attacksRemaining: 0,
      awaitingAttackOutcome: false,
      resources: { rage: { label: 'Fúria', current: 2, max: 2 } },
      markers: {},
      timeline: [],
    } satisfies TurnState;
    fixture.detectChanges();

    const region = fixture.debugElement.query(By.css('[aria-live="polite"]'));
    expect(region).toBeTruthy();
    expect(region.nativeElement.textContent).toContain('Fúria');
  });

  it('describes unused action, bonus action and movement before ending a turn', () => {
    const state: TurnState = {
      phase: 'own-turn',
      actionTokens: [{ id: 'standard', label: 'Ação', allowsMagic: true }],
      bonusActionAvailable: true,
      reactionAvailable: true,
      movementMax: 9,
      movementRemaining: 6,
      hasMoved: true,
      freeInteractionAvailable: true,
      spellSlotUsedThisTurn: false,
      attacksRemaining: 0,
      awaitingAttackOutcome: false,
      resources: {},
      markers: {},
      timeline: [],
    };
    const bonus = {
      rule: {
        id: 'bonus', name: 'Ação Bônus', summary: '', origin: 'core', originId: 'core',
        activation: 'bonus-action', category: 'bonus', conditions: [], costs: [], effects: [], support: 'structured',
        source: { book: 'Livro do Jogador', revision: '2024', page: 1 },
      },
      status: 'available', reasons: [], missingFacts: [],
    } satisfies RuleEvaluation;

    expect(describeRemainingTurnEconomy(state, [bonus])).toEqual([
      '1 ação(ões) disponível(is)',
      'Ação Bônus disponível',
      '6 m de movimento restante',
    ]);
  });
});

describe('CharacterBuilderComponent profile resolution', () => {
  it('uses the first class whose level is increased as the primary class', () => {
    TestBed.configureTestingModule({
      imports: [CharacterBuilderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const component = TestBed.createComponent(CharacterBuilderComponent).componentInstance;

    component.profileForm.controls.bruxo.setValue(5);
    component.classLevelChanged('bruxo');
    component.profileForm.controls.ladino.setValue(1);
    component.classLevelChanged('ladino');

    expect(component.profileForm.controls.primaryClass.value).toBe('bruxo');
    expect(component.buildProfile().classes.find((entry) => entry.classId === 'bruxo')?.order).toBe(0);

    component.profileForm.controls.bruxo.setValue(0);
    component.classLevelChanged('bruxo');
    expect(component.profileForm.controls.primaryClass.value).toBe('ladino');
  });

  it('discards hidden maneuver selections when the profile has no Battle Master', () => {
    TestBed.configureTestingModule({
      imports: [CharacterBuilderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(CharacterBuilderComponent);
    const component = fixture.componentInstance;
    component.profileForm.controls.maneuverIds.setValue(['prostrar', 'ataque-preciso', 'aparar']);
    component.profileForm.patchValue({ guerreiro: 0, ladino: 5 });

    const profile: CharacterProfile = component.buildProfile();

    expect(component.profileForm.controls.maneuverIds.value.length).toBe(3);
    expect(profile.maneuverIds).toEqual([]);
  });

  it('derives Guardian spell and Fighter mastery limits from class level', () => {
    TestBed.configureTestingModule({
      imports: [CharacterBuilderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const component = TestBed.createComponent(CharacterBuilderComponent).componentInstance;

    component.profileForm.patchValue({ ladino: 0, guardiao: 5, guerreiro: 0 });
    expect(component.classSpellLimit).toBe(6);
    expect(component.masteryLimit).toBe(2);

    component.profileForm.patchValue({ guardiao: 0, guerreiro: 4 });
    expect(component.masteryLimit).toBe(4);
  });

  it('resolves Magic Initiate by spell list and makes its cantrips usable', () => {
    TestBed.configureTestingModule({
      imports: [CharacterBuilderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const component = TestBed.createComponent(CharacterBuilderComponent).componentInstance;
    const spell = (id: string, name: string, level: number, classes: string[]): Spell => ({
      id, name, level, classes, school: 'Evocação', castingTime: 'Ação', range: '18 metros',
      components: ['V'], duration: 'Instantânea', description: `${name} faz algo mágico.`,
    });
    component.catalog = {
      manifest: { schemaVersion: 1, edition: '2024', revision: 'teste', files: [] },
      options: [{
        id: 'iniciado-em-magia-druida', name: 'Iniciado em Magia: Druida', kind: 'feat-origin',
        summary: 'Concede magias de Druida.', source: { book: 'Livro do Jogador', revision: '2024', page: 201 },
      }, {
        id: 'combatente-druidico', name: 'Combatente Druídico', kind: 'fighting-style',
        summary: 'Concede truques de Druida.', requirements: [{ classId: 'guardiao', minClassLevel: 2 }],
        source: { book: 'Livro do Jogador', revision: '2024', page: 118 },
      }],
      rules: [],
    } satisfies TurnCatalog;
    component.spells = [
      spell('arte-druidica', 'Arte Druídica', 0, ['Druida']),
      spell('producao-de-chamas', 'Produção de Chamas', 0, ['Druida']),
      spell('falar-com-animais', 'Falar com Animais', 1, ['Druida']),
      spell('luz', 'Luz', 0, ['Clérigo', 'Mago']),
    ];
    component.profileForm.controls.featIds.setValue(['iniciado-em-magia-druida']);
    component.profileForm.controls.cantripIds.setValue(['arte-druidica', 'producao-de-chamas']);
    component.profileForm.controls.magicInitiateSpellIds.setValue(['falar-com-animais']);

    expect(component.cantripLimit).toBe(2);
    expect(component.cantripItems.map((item) => item.id)).not.toContain('luz');
    const profile = component.buildProfile();
    expect(profile.preparedSpellIds).toContain('arte-druidica');
    expect(profile.preparedSpellIds).toContain('producao-de-chamas');
    expect(profile.freeSpellIds).toContain('falar-com-animais');

    component.profileForm.patchValue({ guardiao: 2, ladino: 0, featIds: [], fightingStyleIds: ['combatente-druidico'] });
    expect(component.cantripLimit).toBe(2);
    expect(component.cantripItems.map((item) => item.id)).toContain('arte-druidica');
  });

  it('keeps every general feat visible and explains unmet prerequisites', () => {
    TestBed.configureTestingModule({
      imports: [CharacterBuilderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const component = TestBed.createComponent(CharacterBuilderComponent).componentInstance;
    component.catalog = {
      manifest: { schemaVersion: 1, edition: '2024', revision: 'teste', files: [] },
      options: [{
        id: 'matador-de-magos', name: 'Exterminador de Conjuradores', kind: 'feat-general', summary: 'Combate conjuradores.',
        requirements: [{ minTotalLevel: 4 }], source: { book: 'Livro do Jogador', revision: '2024', page: 205 },
      }, {
        id: 'ator', name: 'Ator', kind: 'feat-general', summary: 'Aprimora personificação.',
        requirements: [{ minTotalLevel: 4 }, { ability: 'charisma', abilityMin: 13 }], source: { book: 'Livro do Jogador', revision: '2024', page: 203 },
      }, {
        id: 'mestre-de-escudo', name: 'Mestre em Escudos', kind: 'feat-general', summary: 'Aprimora escudos.',
        requirements: [{ minTotalLevel: 4 }, { feature: 'shield-training' }], source: { book: 'Livro do Jogador', revision: '2024', page: 206 },
      }],
      rules: [],
    } satisfies TurnCatalog;
    component.profileForm.patchValue({ ladino: 4, charisma: 10 });

    const exterminador = component.generalFeatItems.find((item) => item.id === 'matador-de-magos');
    const ator = component.generalFeatItems.find((item) => item.id === 'ator');
    const mestreEscudo = component.generalFeatItems.find((item) => item.id === 'mestre-de-escudo');

    expect(exterminador?.disabled).toBeFalse();
    expect(ator?.disabledReason).toContain('Exige Carisma 13.');
    expect(mestreEscudo?.disabledReason).toContain('Exige treinamento com Escudo.');
  });
});

describe('CheckboxChoiceGroupComponent', () => {
  it('shows selected/limit and prevents a selection beyond the limit', () => {
    TestBed.configureTestingModule({ imports: [CheckboxChoiceGroupComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CheckboxChoiceGroupComponent);
    fixture.componentInstance.title = 'Magias';
    fixture.componentInstance.items = [
      { id: 'a', label: 'Magia A' },
      { id: 'b', label: 'Magia B' },
      { id: 'c', label: 'Magia C' },
    ];
    fixture.componentInstance.selected = ['a', 'b'];
    fixture.componentInstance.limit = 2;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2/2');
    const inputs = fixture.debugElement.queryAll(By.css('input[type="checkbox"]'));
    expect(inputs[2].nativeElement.disabled).toBeTrue();
  });

  it('renders a keyboard-accessible spell reference with tooltip text', () => {
    TestBed.configureTestingModule({ imports: [CheckboxChoiceGroupComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CheckboxChoiceGroupComponent);
    fixture.componentInstance.title = 'Truques';
    fixture.componentInstance.items = [{
      id: 'orientacao', label: 'Orientação', referenceId: 'orientacao', tooltip: 'Texto completo da magia.',
    }];
    fixture.componentInstance.limit = 1;
    fixture.detectChanges();

    const reference = fixture.debugElement.query(By.css('.reference-link'));
    expect(reference.attributes['href']).toContain('/magias#orientacao');
    expect(reference.attributes['aria-label']).toBe('Consultar Orientação');
  });

  it('shows the reason why an option cannot be selected', () => {
    TestBed.configureTestingModule({ imports: [CheckboxChoiceGroupComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CheckboxChoiceGroupComponent);
    fixture.componentInstance.title = 'Talentos';
    fixture.componentInstance.items = [{
      id: 'ator', label: 'Ator', disabled: true, disabledReason: 'Exige Carisma 13.',
    }];
    fixture.componentInstance.limit = 1;
    fixture.detectChanges();

    const label = fixture.debugElement.query(By.css('.choice-box'));
    expect(label.attributes['title']).toBe('Exige Carisma 13.');
    expect(fixture.nativeElement.textContent).toContain('Indisponível: Exige Carisma 13.');
  });
});
