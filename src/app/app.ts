import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="topbar">
      <span class="title">One D&amp;D Guide</span>
      <nav class="nav">
        <a href="/guia" [class.active]="router.url === '/guia'" (click)="navigate('/guia', $event)">
          Guia
        </a>
        <a href="/magias" [class.active]="router.url.startsWith('/magias')" (click)="navigate('/magias', $event)">Magias</a>
        <a href="/armas" [class.active]="router.url.startsWith('/armas')" (click)="navigate('/armas', $event)">Armas</a>
        <a href="/personagens" [class.active]="router.url.startsWith('/personagens')" (click)="navigate('/personagens', $event)">Personagens</a>
        <a href="/turno" [class.active]="router.url.startsWith('/turno')" (click)="navigate('/turno', $event)">Auxiliar de turnos</a>
        <a href="/busca" [class.active]="router.url.startsWith('/busca')" (click)="navigate('/busca', $event)">Busca</a>
        <a href="/monstros" [class.active]="router.url.startsWith('/monstros')" (click)="navigate('/monstros', $event)">Monstros</a>
      </nav>
      <span class="spacer"></span>
    </header>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      min-height: 72px;
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 10px clamp(14px, 3vw, 34px);
      box-sizing: border-box;
      background:
        linear-gradient(180deg, rgba(255, 230, 160, 0.09), transparent 42%),
        linear-gradient(120deg, #2b0c0b, #4b1210 45%, #1a1110);
      color: var(--parchment-light);
      border-bottom: 1px solid rgba(224, 185, 104, 0.38);
      box-shadow: 0 16px 34px rgba(0, 0, 0, 0.32);
    }

    .title {
      position: relative;
      font-family: 'Cinzel', Georgia, serif;
      font-size: clamp(1rem, 2vw, 1.35rem);
      font-weight: 700;
      white-space: nowrap;
      color: #ffe7ad;
      text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
    }

    .title::before {
      content: '';
      display: inline-block;
      width: 10px;
      height: 10px;
      margin-right: 10px;
      transform: rotate(45deg);
      background: linear-gradient(135deg, #e0b968, #7a4a14);
      box-shadow: 0 0 0 2px rgba(255, 236, 182, 0.14);
    }

    .nav {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .spacer {
      width: 28px;
    }

    .nav a {
      min-height: 38px;
      display: inline-flex;
      align-items: center;
      padding: 0 14px;
      border: 1px solid rgba(224, 185, 104, 0.24);
      border-radius: 999px;
      color: #f7e2b9;
      font-weight: 600;
      text-decoration: none;
      background: rgba(15, 9, 7, 0.22);
      transition:
        background 140ms ease,
        border-color 140ms ease,
        transform 140ms ease;
    }

    .nav a:hover {
      transform: translateY(-1px);
      border-color: rgba(224, 185, 104, 0.64);
      background: rgba(224, 185, 104, 0.12);
    }

    .nav a.active {
      background: linear-gradient(180deg, #d0a250, #9b6422);
      color: #211008;
      border-color: #ffe0a0;
      box-shadow: inset 0 1px 0 rgba(255, 245, 207, 0.45), 0 8px 18px rgba(0, 0, 0, 0.22);
    }

    .content {
      display: block;
      min-height: calc(100vh - 72px);
      padding-bottom: 28px;
    }

    @media (max-width: 760px) {
      .topbar {
        align-items: flex-start;
        flex-direction: column;
      }

      .nav {
        width: 100%;
        justify-content: flex-start;
      }

      .spacer {
        display: none;
      }
    }
  `,
})
export class App {
  readonly router = inject(Router);

  navigate(path: string, event: MouseEvent): void {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      void this.router.navigateByUrl(path);
    }
  }
}
