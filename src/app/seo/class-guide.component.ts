import {Component,inject} from '@angular/core';
import {AsyncPipe} from '@angular/common';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {map} from 'rxjs';
import {CLASS_NAMES} from '../utils/character-reference';
import {CLASS_PLAYSTYLES} from '../utils/class-playstyles';
import {classArt} from '../utils/class-visuals';
import {TurnClassId,CharacterFeature} from '../models/turn-planner.models';
import {TurnRuleCatalogService} from '../services/turn-rule-catalog.service';
import {FormattedTextComponent} from '../shared/formatted-text.component';

@Component({selector:'app-class-guide',standalone:true,imports:[AsyncPipe,RouterLink,FormattedTextComponent],template:`
  <div class="class-guide">
    @if (classId; as id) {
      <nav aria-label="Caminho da página"><a routerLink="/classes">Classes de D&D 2024</a> / {{ names[id] }}</nav>
      <header><img [src]="art(id)" alt="" width="150" height="170" /><div><p>D&D 2024 · níveis 1–8</p><h1>{{ names[id] }} em D&D 2024</h1><p>Entenda o papel no grupo, o estilo de jogo e a progressão desta classe.</p></div></header>
      <section><h2>Jogue se você gosta de…</h2><p>{{ styles[id].enjoy }}</p><h2>Em que se destaca</h2><p>{{ styles[id].strengths }}</p><h2>Como costuma jogar</h2><p>{{ styles[id].play }}</p><h2>Pode não agradar</h2><p>{{ styles[id].tradeoff }}</p></section>
      @if (catalog$ | async; as catalog) {
        <section><h2>Características de {{ names[id] }} até o nível 8</h2>
          @for (feature of catalog.features; track feature.id) {
            @if (feature.classId===id && !feature.subclassId && feature.minLevel<=8) { <article><h3>Nível {{ feature.minLevel }} · {{ feature.name }}</h3><p><app-formatted-text [text]="feature.description" /></p><small>Livro do Jogador · p. {{ feature.source.page }}</small></article> }
          }
        </section>
        <section><h2>Subclasses de {{ names[id] }}</h2>@for (option of catalog.options; track option.id) {
          @if (option.kind==='subclass' && option.parentId===id) { <article><h3>{{ option.name }}</h3><p>{{ option.summary }}</p><a [routerLink]="['/guia']" [fragment]="subclassFragment(option.id,catalog.features)">Consultar regras de {{ option.name }}</a></article> }
        }</section>
      }
      <p class="actions"><a routerLink="/personagens">Criar um personagem</a><a routerLink="/classes">Comparar com outras classes</a><a routerLink="/magias">Consultar magias</a></p>
    } @else {
      <h1>Classes de D&D 2024: qual escolher?</h1><p>Escolha uma classe pelo papel que você quer ter na aventura. Conheça os pontos fortes, o estilo de jogo e as características até o nível 8.</p>
      <div class="class-links">@for (id of ids; track id) { <a [routerLink]="['/classes',id]"><img [src]="art(id)" alt="" width="110" height="130" loading="lazy" /><h2>{{ names[id] }}</h2><p>{{ styles[id].enjoy }}</p><span>Conhecer {{ names[id] }} →</span></a> }</div>
    }
  </div>
`,styles:[`:host{display:block}.class-guide{max-width:1000px;margin:auto;padding:clamp(20px,4vw,40px);color:#302a21}header{display:flex;align-items:center;gap:1.5rem;margin:1.5rem 0}header img{object-fit:contain;background:#404a47;border-radius:8px}h1{font-size:clamp(1.8rem,4vw,2.5rem)}h2{font-size:1.3rem}p{line-height:1.7}section{padding:1.5rem;margin:1rem 0;background:#fffaf0;border:1px solid #cbbd9d;border-radius:10px}article{padding:.8rem 0;border-bottom:1px solid #e0d6c1}small{color:#706451}.class-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1rem}.class-links a{padding:1.5rem;border:1px solid #cbbd9d;border-radius:10px;background:#fffaf0;text-decoration:none;color:inherit}.class-links img{object-fit:contain}.class-links span,a{color:#793e39}.actions{display:flex;flex-wrap:wrap;gap:1rem}a:focus-visible{outline:3px solid #ac8341;outline-offset:4px}@media(max-width:600px){header{flex-wrap:wrap}}`],})
export class ClassGuideComponent {
  readonly classId=inject(ActivatedRoute).snapshot.data['classId'] as TurnClassId|undefined;
  readonly names=CLASS_NAMES;readonly styles=CLASS_PLAYSTYLES;readonly art=classArt;
  readonly ids=(Object.keys(CLASS_NAMES) as TurnClassId[]).sort((a,b)=>CLASS_NAMES[a].localeCompare(CLASS_NAMES[b],'pt-BR'));
  readonly catalog$=inject(TurnRuleCatalogService).getCatalog().pipe(map(c=>({...c,features:[...(c.features??[])].sort((a,b)=>a.minLevel-b.minLevel)})));
  subclassFragment(id:string,features:CharacterFeature[]):string|undefined { return features.find(f=>f.subclassId===id)?.id; }
}
