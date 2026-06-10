import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { Spell } from '../models/spell.models';
import { validateSpellData } from '../utils/data-validation';

@Injectable({
  providedIn: 'root',
})
export class SpellService {
  private readonly http = inject(HttpClient);
  private readonly spellsUrl = '/data/spells.json';
  private readonly spells$ = this.http
    .get<unknown>(this.spellsUrl)
    .pipe(map(validateSpellData))
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getSpells(): Observable<Spell[]> {
    return this.spells$;
  }
}
