import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { Summon } from '../models/summon.models';
import { validateSummonData } from '../utils/data-validation';

@Injectable({
  providedIn: 'root',
})
export class SummonService {
  private readonly http = inject(HttpClient);
  private readonly summonsUrl = '/data/summons.json';
  private readonly summons$ = this.http
    .get<unknown>(this.summonsUrl)
    .pipe(map(validateSummonData))
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getSummons(): Observable<Summon[]> {
    return this.summons$;
  }
}
