import { Component, inject } from '@angular/core';
import { SeoService } from './seo/seo.service';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiMotionDirective } from './shared/ui-motion.directive';

@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, UiMotionDirective],
  template: `
    <a class="skip-link" href="#main-content">Pular para o conteúdo</a>
    <header class="mobile-header"><a routerLink="/guia" class="brand">One D&amp;D <small>Compêndio de aventura</small></a>
      <button type="button" (click)="menuOpen = !menuOpen" [attr.aria-expanded]="menuOpen" aria-controls="main-navigation">{{ menuOpen ? 'Fechar menu' : 'Menu' }}</button>
    </header>
    <aside class="sidebar" [appMotion]="menuOpen" motionKind="select" [class.open]="menuOpen" (keydown.escape)="menuOpen = false">
      <a routerLink="/guia" class="brand" (click)="menuOpen = false"><span class="brand-mark" aria-hidden="true">✧</span>One D&amp;D<small>Compêndio de aventura</small></a>
      <p class="nav-label">Sua mesa, organizada</p>
      <nav id="main-navigation" aria-label="Navegação principal">
        @for (link of links; track link.path) {
          <a [routerLink]="link.path" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="menuOpen = false"><span aria-hidden="true">{{ link.icon }}</span>{{ link.label }}</a>
        }
      </nav>
      <footer>Livro do Jogador · 2024<br><span>Personagens do nível 1 ao 8</span><br><a href="/assets/art/credits.html" target="_blank" rel="noopener">Créditos das ilustrações ↗</a></footer>
    </aside>
    <main id="main-content" class="content" tabindex="-1"><router-outlet /></main>
  `,
  styles: `
    :host { display:block; min-height:100vh; }
    .sidebar { position:fixed; inset:0 auto 0 0; width:224px; display:flex; flex-direction:column; padding:32px 18px 24px; background:#20272b; color:var(--parchment-light); border-right:1px solid var(--gold); z-index:30; }
    .brand { display:block; color:var(--parchment-light); text-decoration:none; font:700 1.45rem Georgia,serif; padding:0 10px; }
    .brand-mark { display:grid; place-items:center; width:64px; height:64px; border:1px solid var(--gold); transform:rotate(45deg); color:var(--gold-bright); font-size:2.8rem; margin:8px 0 28px 10px; }
    .brand small { display:block; margin-top:8px; color:#e2cdb6; font:400 .76rem system-ui,sans-serif; letter-spacing:.04em; }
    .nav-label { margin:44px 12px 12px; font-size:.66rem; text-transform:uppercase; letter-spacing:.12em; color:#ddc7b7; }
    nav { display:grid; gap:6px; }
    nav a { display:flex; align-items:center; gap:12px; min-height:46px; padding:10px 12px; border-radius:6px; color:#f1e7dc; text-decoration:none; font-size:.87rem; }
    nav a span { width:22px; color:var(--gold-bright); text-align:center; }
    nav a:hover { background:#ffffff12; }
    nav a.active { background:#343b3c; color:#f5dfac; font-weight:650; box-shadow:inset 3px 0 var(--gold-bright); }
    nav a.active span { color:var(--gold-bright); }
    footer { margin-top:auto; padding:28px 12px 0; font-size:.72rem; line-height:1.9; color:#dfcabc; }
    footer span { color:#c7b6aa; }
    footer a { color:var(--gold-bright); }
    .content { margin-left:224px; min-width:0; min-height:100vh; }
    .mobile-header { display:none; }
    .skip-link { position:fixed; top:-80px; left:16px; z-index:1001; padding:12px; background:var(--parchment-light); }
    .skip-link:focus { top:12px; }
    @media(max-width:1000px) {
      .mobile-header { position:sticky; top:0; display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--wine-dark); padding:12px 16px; z-index:40; }
      .mobile-header .brand { font-size:1.1rem; padding:0; }
      .mobile-header small { margin-top:3px; }
      .mobile-header button { background:transparent; color:var(--parchment-light); border:1px solid var(--gold); border-radius:6px; padding:10px 14px; }
      .sidebar { display:none; top:73px; width:min(300px,100%); box-shadow:var(--shadow); }
      .sidebar.open { display:flex; }
      .sidebar>.brand,.nav-label { display:none; }
      .content { margin-left:0; }
    }
  `,
})
export class App {
  private readonly seo = inject(SeoService);
  menuOpen = false;
  readonly links = [
    { path:'/personagens', label:'Personagens', icon:'♙' },
    { path:'/turno', label:'Auxiliar de turnos', icon:'⚔' },
    { path:'/guia', label:'Guia de regras', icon:'▤' },
    { path:'/classes', label:'Classes', icon:'♧' },
    { path:'/magias', label:'Magias', icon:'✧' },
    { path:'/armas', label:'Armas', icon:'◇' },
    { path:'/busca', label:'Buscar no compêndio', icon:'⌕' },
    { path:'/monstros', label:'Monstros', icon:'♜' },
  ];
}
