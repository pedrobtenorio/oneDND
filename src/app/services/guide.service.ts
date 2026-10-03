import { TurnRuleCatalogService } from './turn-rule-catalog.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, map, shareReplay } from 'rxjs';

import { GuideCategory } from '../models/guide.models';
import { validateGuideData } from '../utils/data-validation';

@Injectable({
  providedIn: 'root',
})
export class GuideService {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(TurnRuleCatalogService);
  private readonly guideUrl = '/data/guide.json';
  private readonly guide$ = this.http
    .get<unknown>(this.guideUrl)
    .pipe(map(validateGuideData))
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  // Data-driven load to keep the UI decoupled from rule content.
  getGuide(): Observable<GuideCategory[]> {
    return combineLatest([this.guide$, this.catalog.getCatalog()]).pipe(map(([guide,catalog]) => {
      const classIds = [...new Set((catalog.features ?? []).map(f => f.classId).filter(Boolean))];
      const labelsByClass: Record<string,string> = { barbaro:'Bárbaro',bardo:'Bardo',bruxo:'Bruxo',clerigo:'Clérigo',druida:'Druida',feiticeiro:'Feiticeiro',guardiao:'Guardião',guerreiro:'Guerreiro',ladino:'Ladino',mago:'Mago',monge:'Monge',paladino:'Paladino' };
      const classes: GuideCategory[] = classIds.map(id => ({ id:`class-${id}`,title:`${labelsByClass[id!]} · níveis 1–8`,items:(catalog.features ?? []).filter(f => f.classId === id).map(f => ({ id:f.id,name:f.name,description:`${f.subclassId ? catalog.options.find(o => o.id === f.subclassId)?.name + '. ' : ''}Nível ${f.minLevel}. ${f.description} Fonte: Livro do Jogador, p. ${f.source.page}.` })) }));
      const kinds = ['background','species','species-choice','invocation','metamagic','class-choice','feat-origin','feat-general','fighting-style','maneuver'] as const;
      const labels = ['Antecedentes','Espécies','Linhagens e ancestralidades','Invocações Místicas','Metamagia','Escolhas de classe','Talentos de Origem','Talentos Gerais','Estilos de Luta','Manobras'];
      const options: GuideCategory[] = kinds.map((kind,index) => ({id:`catalog-${kind}`,title:labels[index],items:catalog.options.filter(o => o.kind === kind).map(o => ({id:`option.${o.id}`,name:o.name,description:`${o.description ?? o.summary} Fonte: Livro do Jogador, p. ${o.source.page}.`}))}));
      return [...guide, ...classes, ...options];
    }));
  }
}
