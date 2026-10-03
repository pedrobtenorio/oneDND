import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, forkJoin, map, shareReplay, switchMap } from 'rxjs';

import {
  CharacterFeature,
  RuleCondition,
  RuleCost,
  RuleDefinition,
  RuleEffect,
  CharacterOption,
  TurnCatalog,
  TurnRuleFile,
} from '../models/turn-planner.models';
import { Spell } from '../models/spell.models';
import { validateTurnRuleFile, validateTurnRuleManifest } from '../utils/data-validation';
import { SpellService } from './spell.service';

@Injectable({ providedIn: 'root' })
export class TurnRuleCatalogService {
  private readonly http = inject(HttpClient);
  private readonly spellService = inject(SpellService);
  private readonly baseUrl = '/data/turn-rules';

  private readonly staticCatalog$ = this.http.get<unknown>(`${this.baseUrl}/manifest.json`).pipe(
    map(validateTurnRuleManifest),
    switchMap((manifest) =>
      forkJoin(
        manifest.files.map((file) =>
          this.http.get<unknown>(`${this.baseUrl}/${file}`).pipe(map(validateTurnRuleFile))
        )
      ).pipe(map((files) => ({ manifest, files })))
    )
  );

  private readonly catalog$ = combineLatest([this.staticCatalog$, this.spellService.getSpells()]).pipe(
    map(([catalog, spells]): TurnCatalog => {
      const files = catalog.files as TurnRuleFile[];
      const options = files.flatMap((file) => file.options ?? []);
      if (new Set(options.map((option) => option.id)).size !== options.length) {
        throw new Error('duplicate turn option id');
      }
      const features = files.flatMap(file => file.features ?? []);
      const choiceGroups = files.flatMap(file => file.choiceGroups ?? []);
      const staticRules = files.flatMap((file) => file.rules ?? []);
      const rules = [
        ...staticRules,
        ...features.filter(feature => !staticRules.some(rule => rule.id === feature.id)).map(feature => this.featureRule(feature)),
        ...this.choiceReferenceRules(options),
        ...this.maneuverRules(options, staticRules),
        ...spells.flatMap((spell) => [this.spellRule(spell), this.spellRule(spell, true), ...(spell.castingTime === 'Ação' ? [this.spellRule(spell, false, true)] : [])]),
        ...this.metamagicRules(options),
      ];
      const ids = new Set<string>();
      for (const rule of rules) {
        if (ids.has(rule.id)) throw new Error(`duplicate turn rule id: ${rule.id}`);
        ids.add(rule.id);
      }
      this.validateReferences(options, rules, spells);
      return {
        features, choiceGroups, spellGrants: files.flatMap(file => file.spellGrants ?? []),
        manifest: catalog.manifest,
        options,
        rules,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  getCatalog(): Observable<TurnCatalog> {
    return this.catalog$;
  }

  private featureRule(feature: CharacterFeature): RuleDefinition {
    const conditions: RuleCondition[] = [];
    if (feature.classId) conditions.push({ type: 'class-level', classId: feature.classId, min: feature.minLevel });
    if (feature.subclassId) conditions.push({ type: 'subclass', id: feature.subclassId });
    if (feature.speciesId) conditions.push({ type: 'species', id: feature.speciesId });
    return { id: feature.id, name: feature.name, summary: feature.description,
      origin: feature.subclassId ? 'subclass' : feature.speciesId ? 'species' : 'class',
      originId: feature.subclassId ?? feature.speciesId ?? feature.classId!, activation: 'free', category: 'informational',
      conditions, costs: [], effects: [], support: 'informational', source: feature.source };
  }

  private choiceReferenceRules(options: CharacterOption[]): RuleDefinition[] {
    return options.filter(o => ['invocation', 'metamagic', 'class-choice'].includes(o.kind)).map(o => ({
      id: `reference.${o.id}`, name: o.name, summary: o.description ?? o.summary,
      origin: 'class', originId: o.requirements?.find(r => r.classId)?.classId ?? 'bruxo',
      activation: 'free', category: 'informational', conditions: [{ type: 'choice', id: o.id }],
      costs: [], effects: [], support: 'informational', source: o.source,
    }));
  }

  private metamagicRules(options: CharacterOption[]): RuleDefinition[] {
    return options.filter(o => o.kind === 'metamagic' && o.id !== 'metamagic.magia-acelerada').map(o => {
      const amount = o.id === 'metamagic.magia-agravada' ? 2 : 1;
      return { id:`use.${o.id}`,name:o.name,summary:o.description ?? o.summary,origin:'class',originId:'feiticeiro',activation:'free',category:'modifier',
        conditions:[{type:'choice',id:o.id},{type:'resource',id:'sorcery-point',atLeast:amount,label:'Pontos de Feitiçaria'}, {type:'fact',id:`${o.id}.eligible`,equals:true,label:`a magia atende a ${o.name} e o limite de Metamagia por conjuração foi respeitado`}],
        costs:[{type:'resource',id:'sorcery-point',amount}],effects:[],support:'prompt',source:o.source };
    });
  }

  private spellRule(spell: Spell, freeCast = false, quickened = false): RuleDefinition {
    const isReaction = spell.castingTime.includes('Reação');
    const isBonus = quickened || spell.castingTime.includes('Ação Bônus');
    const activation = isReaction ? 'reaction' : isBonus ? 'bonus-action' : 'action';
    const conditions: RuleCondition[] = [
      { type: 'not-raging' },
    ];
    if (!['Ação', 'Ação Bônus'].includes(spell.castingTime) && !isReaction) conditions.push({type:'fact',id:`spell-long-cast-${spell.id}`,equals:true,label:`o tempo de conjuração completo (${spell.castingTime}) e a concentração necessária foram cumpridos`});
    if (!freeCast) conditions.unshift({ type: 'spell-prepared', id: spell.id });
    const costs: RuleCost[] = [];
    const effects: RuleEffect[] = [];

    if (activation === 'action') {
      conditions.push({ type: 'phase', value: 'own-turn' }, { type: 'action-available', allowMagic: true });
      costs.push({ type: 'action', allowMagic: true });
    } else if (activation === 'bonus-action') {
      conditions.push({ type: 'phase', value: 'own-turn' }, { type: 'bonus-action-available' });
      costs.push({ type: 'bonus-action' });
    } else {
      conditions.push(
        { type: 'phase', value: 'reaction-window' },
        { type: 'reaction-available' },
        { type: 'fact', id: `spell-trigger-${spell.id}`, equals: true, label: `o gatilho de ${spell.name} ocorreu` }
      );
      costs.push({ type: 'reaction' });
    }

    if (quickened) {
      conditions.push({type:'choice',id:'metamagic.magia-acelerada'}, {type:'resource',id:'sorcery-point',atLeast:2,label:'Pontos de Feitiçaria'}, {type:'marker',id:'leveled-spell-cast',equals:false,label:'Magia Acelerada não pode seguir uma magia de 1º círculo ou superior.'});
      costs.push({type:'resource',id:'sorcery-point',amount:2});
      effects.push({type:'marker',id:'quickened-spell-used',value:true});
    }
    if (spell.level > 0) {
      conditions.push({type:'marker',id:'quickened-spell-used',equals:false,label:'Magia Acelerada impede outra magia de 1º círculo ou superior neste turno.'});
      effects.push({type:'marker',id:'leveled-spell-cast',value:true});
    }
    if (freeCast) {
      conditions.push({ type: 'resource', id: `free-spell-${spell.id}`, atLeast: 1, label: `Uso gratuito de ${spell.name}` });
      costs.push({ type: 'resource', id: `free-spell-${spell.id}`, amount: 1 });
    } else if (spell.level > 0) {
      conditions.push(
        { type: 'spell-slot-unused' },
        { type: 'spell-slot-available', minLevel: spell.level }
      );
      costs.push({ type: 'spell-slot', level: spell.level });
    }
    if (spell.duration.toLocaleLowerCase('pt-BR').includes('concentração')) {
      conditions.push({ type: 'not-concentrating' });
      effects.push({ type: 'start-concentration', spellId: spell.id });
    }

    return {
      id: `spell.${spell.id}${quickened ? '.quickened' : freeCast ? '.free' : ''}`,
      name: `${spell.name}${quickened ? ' (Magia Acelerada)' : freeCast ? ' (uso gratuito)' : ''}`,
      summary: `${spell.castingTime}; ${spell.range}; ${spell.duration}. Resolva o efeito descrito na magia.`,
      origin: 'spell',
      originId: spell.id,
      activation,
      category: isReaction ? 'reaction' : isBonus ? 'bonus' : 'action',
      conditions,
      costs,
      effects,
      support: 'prompt',
      source: { book: 'Livro do Jogador', revision: '2024 - Erratas de Agosto', page: spell.sourcePage ?? 239 },
      tags: ['magia', spell.level === 0 ? 'truque' : `${spell.level}-circulo`, ...(freeCast ? ['free-cast'] : [])],
      referenceText: [
        spell.level === 0 ? 'Truque' : `${spell.level}º círculo`,
        spell.castingTime,
        spell.range,
        spell.duration,
        spell.description.replace(/\[\[(TABLE|SUMMON)_\d+]]/g, '').trim(),
      ].join('\n'),
      referenceFragment: spell.id,
    };
  }

  private maneuverRules(options: CharacterOption[], existingRules: RuleDefinition[]): RuleDefinition[] {
    const existingIds = new Set(existingRules.map((rule) => rule.id));
    const onHit = new Set([
      'ataque-ameacador',
      'ataque-de-varredura',
      'ataque-para-distrair',
      'ataque-provocante',
      'desarme',
      'encontrao',
      'manobrar',
    ]);
    const bonus = new Set(['gato-por-lebre', 'golpe-do-comandante', 'movimentacao-evasiva']);

    return options
      .filter((option) => option.kind === 'maneuver' && !existingIds.has(`maneuver.${option.id}`))
      .map((option): RuleDefinition => {
        const hit = onHit.has(option.id);
        const usesBonus = bonus.has(option.id);
        const conditions: RuleCondition[] = [
          { type: 'maneuver', id: option.id },
          { type: 'resource', id: 'superiority-die', atLeast: 1, label: 'Dado de Superioridade' },
        ];
        const costs: RuleCost[] = [{ type: 'resource', id: 'superiority-die', amount: 1 }];
        const effects: RuleEffect[] = [];

        if (hit) {
          conditions.push(
            { type: 'trigger', value: 'attack-hit' },
            { type: 'marker', id: 'maneuver-used-this-attack', equals: false, label: 'Uma manobra já foi aplicada a este ataque.' }
          );
          effects.push({ type: 'marker', id: 'maneuver-used-this-attack', value: true });
        } else if (usesBonus) {
          conditions.push({ type: 'phase', value: 'own-turn' }, { type: 'bonus-action-available' });
          costs.unshift({ type: 'bonus-action' });
          if (option.id === 'golpe-do-comandante') {
            conditions.push({ type: 'attacks-remaining' });
            effects.push({ type: 'consume-attack', amount: 1 });
          }
        } else {
          conditions.push({
            type: 'fact',
            id: `maneuver-trigger-${option.id}`,
            equals: true,
            label: `o momento descrito por ${option.name} ocorreu`,
          });
        }

        return {
          id: `maneuver.${option.id}`,
          name: option.name,
          summary: option.summary,
          origin: 'subclass',
          originId: 'mestre-da-batalha',
          activation: hit ? 'trigger' : usesBonus ? 'bonus-action' : 'free',
          trigger: hit ? 'attack-hit' : undefined,
          category: usesBonus ? 'bonus' : 'modifier',
          conditions,
          costs,
          effects,
          support: 'prompt',
          source: option.source,
        };
      });
  }

  private validateReferences(options: CharacterOption[], rules: RuleDefinition[], spells: Spell[]): void {
    const optionIds = new Set(options.map((option) => option.id));
    const spellIds = new Set(spells.map((spell) => spell.id));
    const masteryIds = new Set([
      'mastery-afligir', 'mastery-agil', 'mastery-derrubar', 'mastery-drenar',
      'mastery-empurrar', 'mastery-garantido', 'mastery-lentidao', 'mastery-trespassar',
    ]);
    for (const rule of rules) {
      for (const condition of rule.conditions) {
        if (
          (condition.type === 'subclass' ||
            condition.type === 'species' ||
            condition.type === 'species-choice' ||
            condition.type === 'feat' ||
            condition.type === 'maneuver') &&
          !optionIds.has(condition.id)
        ) {
          throw new Error(`broken turn option reference: ${condition.id}`);
        }
        if (condition.type === 'mastery' && !masteryIds.has(condition.id)) {
          throw new Error(`broken mastery reference: ${condition.id}`);
        }
        if (condition.type === 'spell-prepared' && !spellIds.has(condition.id)) {
          throw new Error(`broken spell reference: ${condition.id}`);
        }
      }
    }
  }
}
