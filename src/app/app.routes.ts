import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'guia' },
  {
    path: 'guia',
    loadComponent: () =>
      import('./quick-guide/quick-guide.component').then((m) => m.QuickGuideComponent),
  },
  {
    path: 'magias',
    loadComponent: () => import('./magias/magias.component').then((m) => m.MagiasComponent),
  },
  {
    path: 'armas',
    loadComponent: () => import('./armas/armas.component').then((m) => m.ArmasComponent),
  },
  {
    path: 'busca',
    loadComponent: () =>
      import('./global-search/global-search.component').then((m) => m.GlobalSearchComponent),
  },
  {
    path: 'monstros',
    loadComponent: () =>
      import('./monster-builder/monster-builder.component').then((m) => m.MonsterBuilderComponent),
  },
];
