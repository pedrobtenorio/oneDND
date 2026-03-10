import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Summon } from '../models/summon.models';

@Injectable({
  providedIn: 'root',
})
export class SummonService {
  private readonly summonsUrl = '/data/summons.json';

  constructor(private readonly http: HttpClient) {}

  getSummons(): Observable<Summon[]> {
    return this.http.get<Summon[]>(this.summonsUrl);
  }
}
