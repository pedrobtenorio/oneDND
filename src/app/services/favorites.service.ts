import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly subjects = new Map<string, BehaviorSubject<Set<string>>>();

  getFavorites(storageKey: string): Observable<Set<string>> {
    return this.getSubject(storageKey).asObservable();
  }

  has(storageKey: string, id: string): boolean {
    return this.getSubject(storageKey).value.has(id);
  }

  getSnapshot(storageKey: string): Set<string> {
    return new Set(this.getSubject(storageKey).value);
  }

  toggle(storageKey: string, id: string): void {
    const subject = this.getSubject(storageKey);
    const next = new Set(subject.value);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    this.persist(storageKey, next);
    subject.next(next);
  }

  private getSubject(storageKey: string): BehaviorSubject<Set<string>> {
    const existing = this.subjects.get(storageKey);
    if (existing) {
      return existing;
    }

    const subject = new BehaviorSubject<Set<string>>(this.load(storageKey));
    this.subjects.set(storageKey, subject);
    return subject;
  }

  private load(storageKey: string): Set<string> {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return new Set();
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? new Set(parsed.filter((item): item is string => typeof item === 'string'))
        : new Set();
    } catch {
      return new Set();
    }
  }

  private persist(storageKey: string, favoriteIds: Set<string>): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(favoriteIds)));
    } catch {
      return;
    }
  }
}
