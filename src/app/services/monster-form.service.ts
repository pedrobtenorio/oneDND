import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import {
  MonsterAbility,
  MonsterEntry,
  MonsterEntryType,
  MonsterSheet,
  MonsterSpellGroup,
} from '../models/monster.models';
import {
  buildLanguagesText,
  createId,
  parseLanguagesText,
  parseSpellGroupLabel,
} from '../utils/monster-builder';

@Injectable({
  providedIn: 'root',
})
export class MonsterFormService {
  private readonly fb = inject(FormBuilder);

  createMonsterForm(monster: MonsterSheet): FormGroup {
    const languages = parseLanguagesText(monster.languages);

    return this.fb.group({
      id: [monster.id],
      name: [monster.name],
      size: [monster.size],
      creatureType: [monster.creatureType],
      alignment: [monster.alignment],
      initiative: [monster.initiative],
      ac: [monster.ac],
      hp: [monster.hp],
      speed: [monster.speed],
      skills: [monster.skills],
      resistances: [monster.resistances],
      immunities: [monster.immunities],
      conditionImmunities: [monster.conditionImmunities],
      senses: [monster.senses],
      selectedLanguages: [languages.selected],
      extraLanguages: [languages.extra],
      cr: [monster.cr],
      xp: [monster.xp],
      proficiencyBonus: [monster.proficiencyBonus],
      abilities: this.fb.group({
        str: this.createAbilityGroup(monster.abilities.str),
        dex: this.createAbilityGroup(monster.abilities.dex),
        con: this.createAbilityGroup(monster.abilities.con),
        int: this.createAbilityGroup(monster.abilities.int),
        wis: this.createAbilityGroup(monster.abilities.wis),
        cha: this.createAbilityGroup(monster.abilities.cha),
      }),
      traits: this.fb.array(monster.traits.map((entry) => this.createEntryGroup(entry))),
      actions: this.fb.array(monster.actions.map((entry) => this.createEntryGroup(entry))),
      bonusActions: this.fb.array(monster.bonusActions.map((entry) => this.createEntryGroup(entry))),
      reactions: this.fb.array(monster.reactions.map((entry) => this.createEntryGroup(entry))),
    });
  }

  createEntryGroup(entry: MonsterEntry): FormGroup {
    return this.fb.group({
      id: [entry.id],
      type: [entry.type],
      name: [entry.name],
      description: [entry.type === 'text' ? entry.description : ''],
      routine: [entry.type === 'multiattack' ? entry.routine : ''],
      attackType: [entry.type === 'attack' ? entry.attackType : 'Rolagem de Ataque Corpo a Corpo'],
      attackBonus: [entry.type === 'attack' ? entry.attackBonus : '+0'],
      reach: [entry.type === 'attack' ? entry.reach : 'alcance 1,5 m'],
      target: [
        entry.type === 'attack' || entry.type === 'save'
          ? entry.target
          : 'um alvo',
      ],
      hitAverage: [entry.type === 'attack' ? entry.hitAverage : ''],
      hitFormula: [entry.type === 'attack' ? entry.hitFormula : ''],
      damageType: [entry.type === 'attack' ? entry.damageType : ''],
      extraDamage: [entry.type === 'attack' ? entry.extraDamage : ''],
      effect: [entry.type === 'attack' ? entry.effect : ''],
      saveAbility: [entry.type === 'save' ? entry.saveAbility : 'Sabedoria'],
      dc: [entry.type === 'save' ? entry.dc : '10'],
      range: [entry.type === 'save' ? entry.range : 'até 9 m'],
      failure: [entry.type === 'save' ? entry.failure : ''],
      success: [entry.type === 'save' ? entry.success : ''],
      ability: [entry.type === 'spellcasting' ? entry.ability : 'Sabedoria'],
      saveDc: [entry.type === 'spellcasting' ? entry.saveDc : '10'],
      spellAttackBonus: [entry.type === 'spellcasting' ? entry.spellAttackBonus : ''],
      intro: [entry.type === 'spellcasting' ? entry.intro : ''],
      spellGroups: this.fb.array(
        (entry.type === 'spellcasting' ? entry.spellGroups : []).map((group) => this.createSpellGroupForm(group))
      ),
    });
  }

  createSpellGroupForm(group: MonsterSpellGroup): FormGroup {
    const parsedGroup = parseSpellGroupLabel((group as MonsterSpellGroup & { label?: string }).label ?? '');

    return this.fb.group({
      id: [group.id],
      rechargeType: [group.rechargeType ?? parsedGroup.rechargeType],
      uses: [group.uses ?? parsedGroup.uses ?? ''],
      spellIds: [group.spellIds],
    });
  }

  loadMonster(form: FormGroup, monster: MonsterSheet): void {
    const languages = parseLanguagesText(monster.languages);

    form.patchValue(
      {
        id: monster.id,
        name: monster.name,
        size: monster.size,
        creatureType: monster.creatureType,
        alignment: monster.alignment,
        initiative: monster.initiative,
        ac: monster.ac,
        hp: monster.hp,
        speed: monster.speed,
        skills: monster.skills,
        resistances: monster.resistances,
        immunities: monster.immunities,
        conditionImmunities: monster.conditionImmunities,
        senses: monster.senses,
        selectedLanguages: languages.selected,
        extraLanguages: languages.extra,
        cr: monster.cr,
        xp: monster.xp,
        proficiencyBonus: monster.proficiencyBonus,
        abilities: {
          str: monster.abilities.str,
          dex: monster.abilities.dex,
          con: monster.abilities.con,
          int: monster.abilities.int,
          wis: monster.abilities.wis,
          cha: monster.abilities.cha,
        },
      },
      { emitEvent: false }
    );

    form.setControl('traits', this.fb.array(monster.traits.map((entry) => this.createEntryGroup(entry))));
    form.setControl('actions', this.fb.array(monster.actions.map((entry) => this.createEntryGroup(entry))));
    form.setControl(
      'bonusActions',
      this.fb.array(monster.bonusActions.map((entry) => this.createEntryGroup(entry)))
    );
    form.setControl('reactions', this.fb.array(monster.reactions.map((entry) => this.createEntryGroup(entry))));
    form.updateValueAndValidity({ emitEvent: true });
  }

  toMonsterSheet(form: FormGroup): MonsterSheet {
    const raw = form.getRawValue();
    return {
      id: raw.id || createId('monster'),
      name: raw.name?.trim() || 'Novo Monstro',
      size: raw.size?.trim() || '',
      creatureType: raw.creatureType?.trim() || '',
      alignment: raw.alignment?.trim() || '',
      initiative: raw.initiative?.trim() || '',
      ac: raw.ac?.trim() || '',
      hp: raw.hp?.trim() || '',
      speed: raw.speed?.trim() || '',
      skills: raw.skills?.trim() || '',
      resistances: raw.resistances?.trim() || '',
      immunities: raw.immunities?.trim() || '',
      conditionImmunities: raw.conditionImmunities?.trim() || '',
      senses: raw.senses?.trim() || '',
      languages: buildLanguagesText(raw.selectedLanguages ?? [], raw.extraLanguages ?? ''),
      cr: raw.cr?.trim() || '',
      xp: raw.xp?.trim() || '',
      proficiencyBonus: raw.proficiencyBonus?.trim() || '',
      abilities: {
        str: this.readAbility(raw.abilities?.str),
        dex: this.readAbility(raw.abilities?.dex),
        con: this.readAbility(raw.abilities?.con),
        int: this.readAbility(raw.abilities?.int),
        wis: this.readAbility(raw.abilities?.wis),
        cha: this.readAbility(raw.abilities?.cha),
      },
      traits: this.readEntries(raw.traits),
      actions: this.readEntries(raw.actions),
      bonusActions: this.readEntries(raw.bonusActions),
      reactions: this.readEntries(raw.reactions),
    };
  }

  private createAbilityGroup(ability: MonsterAbility): FormGroup {
    return this.fb.group({
      score: [ability.score],
      save: [ability.save],
    });
  }

  private readAbility(rawAbility: Partial<MonsterAbility> | null | undefined): MonsterAbility {
    return {
      score: Number(rawAbility?.score) || 10,
      save: rawAbility?.save?.toString().trim() || '',
    };
  }

  private readEntries(rawEntries: any[] | null | undefined): MonsterEntry[] {
    return (rawEntries ?? []).map((rawEntry) => {
      const type = rawEntry?.type as MonsterEntryType;
      const id = rawEntry?.id || createId(type || 'entry');
      const name = rawEntry?.name?.toString().trim() || 'Nova Entrada';

      switch (type) {
        case 'multiattack':
          return {
            id,
            type,
            name,
            routine: rawEntry?.routine?.toString().trim() || '',
          };
        case 'attack':
          return {
            id,
            type,
            name,
            attackType: rawEntry?.attackType?.toString().trim() || 'Rolagem de Ataque Corpo a Corpo',
            attackBonus: rawEntry?.attackBonus?.toString().trim() || '',
            reach: rawEntry?.reach?.toString().trim() || '',
            target: rawEntry?.target?.toString().trim() || '',
            hitAverage: rawEntry?.hitAverage?.toString().trim() || '',
            hitFormula: rawEntry?.hitFormula?.toString().trim() || '',
            damageType: rawEntry?.damageType?.toString().trim() || '',
            extraDamage: rawEntry?.extraDamage?.toString().trim() || '',
            effect: rawEntry?.effect?.toString().trim() || '',
          };
        case 'save':
          return {
            id,
            type,
            name,
            saveAbility: rawEntry?.saveAbility?.toString().trim() || 'Sabedoria',
            dc: rawEntry?.dc?.toString().trim() || '',
            target: rawEntry?.target?.toString().trim() || '',
            range: rawEntry?.range?.toString().trim() || '',
            failure: rawEntry?.failure?.toString().trim() || '',
            success: rawEntry?.success?.toString().trim() || '',
          };
        case 'spellcasting':
          return {
            id,
            type,
            name,
            ability: rawEntry?.ability?.toString().trim() || 'Sabedoria',
            saveDc: rawEntry?.saveDc?.toString().trim() || '',
            spellAttackBonus: rawEntry?.spellAttackBonus?.toString().trim() || '',
            intro: rawEntry?.intro?.toString().trim() || '',
            spellGroups: this.readSpellGroups(rawEntry?.spellGroups),
          };
        case 'text':
        default:
          return {
            id,
            type: 'text',
            name,
            description: rawEntry?.description?.toString().trim() || '',
          };
      }
    });
  }

  private readSpellGroups(rawGroups: any[] | null | undefined): MonsterSpellGroup[] {
    return (rawGroups ?? []).map((rawGroup) => ({
      id: rawGroup?.id || createId('spell-group'),
      rechargeType: rawGroup?.rechargeType || parseSpellGroupLabel(rawGroup?.label?.toString().trim() || '').rechargeType,
      uses: rawGroup?.uses?.toString().trim() || parseSpellGroupLabel(rawGroup?.label?.toString().trim() || '').uses || '',
      spellIds: Array.isArray(rawGroup?.spellIds)
        ? rawGroup.spellIds.filter((spellId: unknown): spellId is string => typeof spellId === 'string')
        : [],
    }));
  }
}
