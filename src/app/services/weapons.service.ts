import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { WeaponsData } from '../models/weapons.models';

@Injectable({
  providedIn: 'root',
})
export class WeaponsService {
  private readonly weaponsUrl = '/data/weapons.json';

  constructor(private readonly http: HttpClient) {}

  getWeapons(): Observable<WeaponsData> {
    return this.http.get<WeaponsData>(this.weaponsUrl);
  }
}
