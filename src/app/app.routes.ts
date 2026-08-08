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
    path: 'personagens',
    loadComponent: () =>
      import('./character-builder/character-builder.component').then((m) => m.CharacterBuilderComponent),
  },
  {
    path: 'turno',
    loadComponent: () =>
      import('./turn-planner/turn-planner.component').then((m) => m.TurnPlannerComponent),
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
