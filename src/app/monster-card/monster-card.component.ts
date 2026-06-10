import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GuideItem } from '../models/guide.models';
import { Spell } from '../models/spell.models';
import {
  MonsterAbilityKey,
  MonsterEntry,
  MonsterSectionKey,
  MonsterSheet,
  MonsterSpellcastingEntry,
} from '../models/monster.models';
import { LinkPart, buildDescriptionParts } from '../utils/linkify';
import {
  ABILITY_LABELS,
  calculateAbilityModifier,
  formatSpellGroupLabel,
  formatModifier,
  getMonsterChallenge,
  getMonsterSubtitle,
  MONSTER_SECTION_LABELS,
} from '../utils/monster-builder';

type MonsterTextEntryView = {
  kind: 'text';
  id: string;
  name: string;
  lines: LinkPart<GuideItem>[][];
};

type MonsterSpellcastingEntryView = {
  kind: 'spellcasting';
  id: string;
  name: string;
  intro: LinkPart<GuideItem>[][];
  groups: Array<{
    id: string;
    label: string;
    spells: Spell[];
  }>;
};

type MonsterEntryView = MonsterTextEntryView | MonsterSpellcastingEntryView;

@Component({
  selector: 'app-monster-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTooltipModule],
  templateUrl: './monster-card.component.html',
  styleUrl: './monster-card.component.css',
})
export class MonsterCardComponent {
  @Input({ required: true }) monster!: MonsterSheet;
  @Input() guideItems: GuideItem[] = [];
  @Input() spells: Spell[] = [];

  readonly abilityOrder: MonsterAbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  readonly sectionOrder: MonsterSectionKey[] = ['traits', 'actions', 'bonusActions', 'reactions'];
  readonly sectionLabels = MONSTER_SECTION_LABELS;

  get subtitle(): string {
    return getMonsterSubtitle(this.monster);
  }

  get challengeText(): string {
    return getMonsterChallenge(this.monster);
  }

  get initiativeText(): string {
    return this.monster.initiative.trim() || formatModifier(calculateAbilityModifier(this.monster.abilities.dex.score));
  }

  get hasAnySections(): boolean {
    return this.sectionOrder.some((section) => this.getSectionEntries(section).length > 0);
  }

  get abilityRows(): MonsterAbilityKey[][] {
    return [
      ['str', 'dex', 'con'],
      ['int', 'wis', 'cha'],
    ];
  }

  getSectionEntries(section: MonsterSectionKey): MonsterEntryView[] {
    const spellsById = new Map(this.spells.map((spell) => [spell.id, spell]));
    return this.monster[section].map((entry) => this.toEntryView(entry, spellsById));
  }

  abilityLabel(key: MonsterAbilityKey): string {
    return ABILITY_LABELS[key];
  }

  abilityModifier(key: MonsterAbilityKey): string {
    return formatModifier(calculateAbilityModifier(this.monster.abilities[key].score));
  }

  abilitySave(key: MonsterAbilityKey): string {
    return this.monster.abilities[key].save.trim() || this.abilityModifier(key);
  }

  formatTooltip(description?: string): string {
    return (description ?? '').replace(/[;.]\s*/g, (match) => `${match}\n`);
  }

  private toEntryView(entry: MonsterEntry, spellsById: Map<string, Spell>): MonsterEntryView {
    if (entry.type === 'spellcasting') {
      return this.toSpellcastingEntryView(entry, spellsById);
    }

    return {
      kind: 'text',
      id: entry.id,
      name: entry.name,
      lines: this.buildLines(this.describeEntry(entry)),
    };
  }

  private toSpellcastingEntryView(
    entry: MonsterSpellcastingEntry,
    spellsById: Map<string, Spell>
  ): MonsterSpellcastingEntryView {
    return {
      kind: 'spellcasting',
      id: entry.id,
      name: entry.name,
      intro: this.buildLines(this.describeSpellcastingIntro(entry)),
      groups: entry.spellGroups
        .map((group) => ({
          id: group.id,
          label: formatSpellGroupLabel(group),
          spells: group.spellIds
            .map((spellId) => spellsById.get(spellId))
            .filter((spell): spell is Spell => !!spell),
        }))
        .filter((group) => group.label.trim() || group.spells.length > 0),
    };
  }

  private describeEntry(entry: MonsterEntry): string {
    switch (entry.type) {
      case 'multiattack':
        return entry.routine;
      case 'attack':
        return this.describeAttack(entry);
      case 'save':
        return this.describeSave(entry);
      case 'text':
        return entry.description;
      default:
        return '';
    }
  }

  private describeAttack(entry: Extract<MonsterEntry, { type: 'attack' }>): string {
    const attackHeader = [entry.attackBonus, entry.reach, entry.target].filter((value) => value.trim()).join(', ');
    const hitBits: string[] = [];
    let baseDamage = '';

    if (entry.hitAverage.trim() && entry.hitFormula.trim()) {
      baseDamage = `${entry.hitAverage.trim()} (${entry.hitFormula.trim()})`;
    } else if (entry.hitAverage.trim()) {
      baseDamage = entry.hitAverage.trim();
    } else if (entry.hitFormula.trim()) {
      baseDamage = `(${entry.hitFormula.trim()})`;
    }

    if (entry.damageType.trim()) {
      baseDamage = baseDamage
        ? `${baseDamage} de dano ${entry.damageType.trim()}`
        : `dano ${entry.damageType.trim()}`;
    }

    if (baseDamage) {
      hitBits.push(baseDamage);
    }

    if (entry.extraDamage.trim()) {
      hitBits.push(entry.extraDamage.trim());
    }

    let result = entry.attackType.trim() || 'Ataque';
    if (attackHeader) {
      result += `: ${attackHeader}.`;
    }
    if (hitBits.length) {
      result += ` Acerto: ${hitBits.join(' ')}.`;
    }
    if (entry.effect.trim()) {
      result += `${hitBits.length ? ' ' : '. '}${entry.effect.trim()}`;
    }
    return result.trim();
  }

  private describeSave(entry: Extract<MonsterEntry, { type: 'save' }>): string {
    const saveHeader = [
      entry.dc.trim() ? `CD ${entry.dc.trim()}` : '',
      entry.target.trim(),
      entry.range.trim(),
    ]
      .filter(Boolean)
      .join(', ');
    const parts = [`Salvaguarda de ${entry.saveAbility.trim() || 'Atributo'}`];

    if (saveHeader) {
      parts[0] += `: ${saveHeader}.`;
    }
    if (entry.failure.trim()) {
      parts.push(`Falha: ${entry.failure.trim()}.`);
    }
    if (entry.success.trim()) {
      parts.push(`Sucesso: ${entry.success.trim()}.`);
    }

    return parts.join(' ').trim();
  }

  private describeSpellcastingIntro(entry: MonsterSpellcastingEntry): string {
    if (entry.intro.trim()) {
      return entry.intro.trim();
    }

    const ability = entry.ability.trim() || 'Sabedoria';
    const detailBits = [];

    if (entry.saveDc.trim()) {
      detailBits.push(`CD ${entry.saveDc.trim()} para a salvaguarda`);
    }
    if (entry.spellAttackBonus.trim()) {
      detailBits.push(`${entry.spellAttackBonus.trim()} nas jogadas de ataque mágico`);
    }

    return `A criatura lança uma das magias a seguir, usando ${ability} como atributo de conjuração${
      detailBits.length ? ` (${detailBits.join(', ')})` : ''
    }:`;
  }

  private buildLines(text: string): LinkPart<GuideItem>[][] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => buildDescriptionParts(line, this.guideItems));
  }
}
