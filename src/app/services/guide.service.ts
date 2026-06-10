import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { GuideCategory } from '../models/guide.models';
import { validateGuideData } from '../utils/data-validation';

@Injectable({
  providedIn: 'root',
})
export class GuideService {
  private readonly http = inject(HttpClient);
  private readonly guideUrl = '/data/guide.json';
  private readonly guide$ = this.http
    .get<unknown>(this.guideUrl)
    .pipe(map(validateGuideData))
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  // Data-driven load to keep the UI decoupled from rule content.
  getGuide(): Observable<GuideCategory[]> {
    return this.guide$;
  }
}
