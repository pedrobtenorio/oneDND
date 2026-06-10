import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { WeaponsData } from '../models/weapons.models';
import { validateWeaponsData } from '../utils/data-validation';

@Injectable({
  providedIn: 'root',
})
export class WeaponsService {
  private readonly http = inject(HttpClient);
  private readonly weaponsUrl = '/data/weapons.json';
  private readonly weapons$ = this.http
    .get<unknown>(this.weaponsUrl)
    .pipe(map(validateWeaponsData))
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getWeapons(): Observable<WeaponsData> {
    return this.weapons$;
  }
}
