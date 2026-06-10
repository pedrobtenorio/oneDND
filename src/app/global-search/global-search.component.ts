import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { map, startWith, switchMap } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { GlobalSearchKind, GlobalSearchResult } from '../models/global-search.models';
import { GlobalSearchService } from '../services/global-search.service';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.css',
})
export class GlobalSearchComponent {
  private readonly globalSearch = inject(GlobalSearchService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly results$ = this.searchControl.valueChanges.pipe(
    startWith(this.searchControl.value),
    switchMap((query) =>
      this.globalSearch.search(query).pipe(
        map((results) => ({
          query: query.trim(),
          results,
        }))
      )
    )
  );

  kindLabel(kind: GlobalSearchKind): string {
    switch (kind) {
      case 'spell':
        return 'Magia';
      case 'condition':
        return 'Condição';
      case 'glossary':
        return 'Glossário';
      case 'summon':
        return 'Invocação';
      case 'weapon':
        return 'Arma';
      case 'weapon-property':
        return 'Propriedade';
      case 'weapon-mastery':
        return 'Maestria';
      case 'guide':
      default:
        return 'Guia';
    }
  }

  trackResult(index: number, result: GlobalSearchResult): string {
    return result.id || `${index}`;
  }
}
