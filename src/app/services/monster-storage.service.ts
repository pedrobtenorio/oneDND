import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { MonsterSheet } from '../models/monster.models';
import { cloneMonster } from '../utils/monster-builder';

@Injectable({
  providedIn: 'root',
})
export class MonsterStorageService {
  private readonly monstersKey = 'monster-builder-library';
  private readonly draftKey = 'monster-builder-draft';
  private readonly monstersSubject = new BehaviorSubject<MonsterSheet[]>(this.readMonsters());

  getMonsters(): Observable<MonsterSheet[]> {
    return this.monstersSubject.asObservable();
  }

  loadDraft(): MonsterSheet | null {
    try {
      const raw = localStorage.getItem(this.draftKey);
      return raw ? (JSON.parse(raw) as MonsterSheet) : null;
    } catch {
      return null;
    }
  }

  saveDraft(monster: MonsterSheet): void {
    try {
      localStorage.setItem(this.draftKey, JSON.stringify(monster));
    } catch {
      return;
    }
  }

  clearDraft(): void {
    try {
      localStorage.removeItem(this.draftKey);
    } catch {
      return;
    }
  }

  saveMonster(monster: MonsterSheet): void {
    const current = [...this.monstersSubject.value];
    const index = current.findIndex((item) => item.id === monster.id);
    const nextMonster = cloneMonster(monster);

    if (index >= 0) {
      current[index] = nextMonster;
    } else {
      current.unshift(nextMonster);
    }

    this.persistMonsters(current);
  }

  deleteMonster(monsterId: string): void {
    this.persistMonsters(this.monstersSubject.value.filter((monster) => monster.id !== monsterId));
  }

  exportMonsters(): MonsterSheet[] {
    return this.monstersSubject.value.map((monster) => cloneMonster(monster));
  }

  importMonsters(monsters: MonsterSheet[]): number {
    const validMonsters = monsters.filter((monster) => this.isMonsterSheet(monster)).map((monster) => cloneMonster(monster));
    const nextById = new Map(this.monstersSubject.value.map((monster) => [monster.id, cloneMonster(monster)]));

    for (const monster of validMonsters) {
      nextById.set(monster.id, monster);
    }

    this.persistMonsters(Array.from(nextById.values()));
    return validMonsters.length;
  }

  parseMonsterBackup(raw: string): MonsterSheet[] {
    const parsed = JSON.parse(raw);
    const candidate = Array.isArray(parsed) ? parsed : parsed?.monsters;

    if (!Array.isArray(candidate)) {
      throw new Error('Arquivo de backup inválido.');
    }

    const monsters = candidate.filter((monster) => this.isMonsterSheet(monster));
    if (monsters.length === 0 && candidate.length > 0) {
      throw new Error('Nenhuma ficha válida encontrada no backup.');
    }

    return monsters.map((monster) => cloneMonster(monster));
  }

  private readMonsters(): MonsterSheet[] {
    try {
      const raw = localStorage.getItem(this.monstersKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((monster) => this.isMonsterSheet(monster)).map((monster) => cloneMonster(monster))
        : [];
    } catch {
      return [];
    }
  }

  private persistMonsters(monsters: MonsterSheet[]): void {
    try {
      localStorage.setItem(this.monstersKey, JSON.stringify(monsters));
    } catch {
      return;
    }

    this.monstersSubject.next(monsters.map((monster) => cloneMonster(monster)));
  }

  private isMonsterSheet(value: unknown): value is MonsterSheet {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const monster = value as Partial<MonsterSheet>;
    const stringFields: Array<keyof MonsterSheet> = [
      'id',
      'name',
      'size',
      'creatureType',
      'alignment',
      'initiative',
      'ac',
      'hp',
      'speed',
      'skills',
      'resistances',
      'immunities',
      'conditionImmunities',
      'senses',
      'languages',
      'cr',
      'xp',
      'proficiencyBonus',
    ];

    return (
      stringFields.every((field) => typeof monster[field] === 'string') &&
      !!monster.abilities &&
      typeof monster.abilities === 'object' &&
      Array.isArray(monster.traits) &&
      Array.isArray(monster.actions) &&
      Array.isArray(monster.bonusActions) &&
      Array.isArray(monster.reactions)
    );
  }
}
