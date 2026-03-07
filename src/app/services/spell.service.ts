import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Spell } from '../models/spell.models';

@Injectable({
  providedIn: 'root',
})
export class SpellService {
  private readonly spellsUrl = '/data/spells.json';

  constructor(private readonly http: HttpClient) {}

  getSpells(): Observable<Spell[]> {
    return this.http.get<Spell[]>(this.spellsUrl);
  }
}
