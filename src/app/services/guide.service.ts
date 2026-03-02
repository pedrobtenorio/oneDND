import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { GuideCategory } from '../models/guide.models';

@Injectable({
  providedIn: 'root',
})
export class GuideService {
  private readonly guideUrl = '/data/guide.json';

  constructor(private readonly http: HttpClient) {}

  // Data-driven load to keep the UI decoupled from rule content.
  getGuide(): Observable<GuideCategory[]> {
    return this.http.get<GuideCategory[]>(this.guideUrl);
  }
}
