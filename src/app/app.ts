import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar class="topbar">
      <span class="title">One D&amp;D Guide</span>
      <nav class="nav">
        <a mat-button routerLink="/guia" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          Guia
        </a>
        <a mat-button routerLink="/magias" routerLinkActive="active">Magias</a>
      </nav>
      <span class="spacer"></span>
    </mat-toolbar>
    <main class="content">
      <router-outlet />
    </main>
    <footer class="donation">
      Curtiu o guia? Apoie o dev via Pix: <span class="pix-key">01e1e222-c9ce-46af-89b3-92754ecc9187</span>
    </footer>
  `,
  styles: `
    .topbar {
      position: sticky;
      top: 0;
      z-index: 3;
      background: linear-gradient(120deg, #5f4a3f, #8a6d5b);
      color: #fff3e3;
    }

    .title {
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .nav {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 6px;
    }

    .spacer {
      width: 56px;
    }

    .nav a {
      color: #fff7ea;
      font-weight: 600;
    }

    .nav a.active {
      background: rgba(255, 240, 210, 0.28);
      color: #2c2012;
    }

    .content {
      display: block;
    }

    .donation {
      margin: 24px auto 0;
      padding: 10px 16px 28px;
      text-align: center;
      color: #6b5140;
      font-size: 0.9rem;
      max-width: 980px;
    }

    .pix-key {
      font-weight: 600;
      color: #4b3626;
    }
  `,
})
export class App {}
