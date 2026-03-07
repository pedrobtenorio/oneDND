import { Routes } from '@angular/router';

import { QuickGuideComponent } from './quick-guide/quick-guide.component';
import { MagiasComponent } from './magias/magias.component';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'guia' },
  { path: 'guia', component: QuickGuideComponent },
  { path: 'magias', component: MagiasComponent },
];
